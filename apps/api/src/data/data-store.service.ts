import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { Injectable } from '@nestjs/common';
import {
  bookings as seedBookings,
  certificates as seedCertificates,
  collections as seedCollections,
  customers as seedCustomers,
  DEMO_USER,
  invoices as seedInvoices,
  leases as seedLeases,
  lots as seedLots,
  notifications as seedNotifications,
  payments as seedPayments,
  properties,
  propertyMetrics,
} from './seed.js';
import type {
  Booking,
  CertificateOfInsurance,
  CollectionAccount,
  Customer,
  DemoUser,
  Invoice,
  Lease,
  Lot,
  OpsNotification,
  Payment,
  Property,
} from './seed.js';

type RuntimeState = {
  version: 1;
  user: DemoUser;
  customers: Customer[];
  lots: Lot[];
  invoices: Invoice[];
  payments: Payment[];
  collections: CollectionAccount[];
  leases: Lease[];
  bookings: Booking[];
  certificates: CertificateOfInsurance[];
  notifications: OpsNotification[];
};

function runtimeFile() {
  return (
    process.env.PADDOCK_STATE_FILE ??
    join(process.cwd(), 'data', 'runtime-state.json')
  );
}

function legacyBookingsFile() {
  return (
    process.env.PADDOCK_BOOKINGS_FILE ??
    join(process.cwd(), 'data', 'runtime-bookings.json')
  );
}

function track<T>(value: T, save: () => void, seen: WeakMap<object, unknown>): T {
  if (!value || typeof value !== 'object') return value;
  const cached = seen.get(value);
  if (cached) return cached as T;
  const proxy = new Proxy(value, {
    get(target, prop, receiver) {
      if (prop === 'toJSON') return () => target;
      if (prop === Symbol.iterator && Array.isArray(target)) {
        const rows = target as unknown[];
        return function* () {
          for (let i = 0; i < rows.length; i++) yield track(rows[i], save, seen);
        };
      }
      const current = Reflect.get(target, prop, receiver);
      if (typeof current === 'function') return current;
      return track(current, save, seen);
    },
    set(target, prop, next) {
      const prev = Reflect.get(target, prop);
      const ok = Reflect.set(target, prop, next);
      if (ok && !Object.is(prev, next)) save();
      return ok;
    },
    deleteProperty(target, prop) {
      if (!Reflect.has(target, prop)) return true;
      const ok = Reflect.deleteProperty(target, prop);
      if (ok) save();
      return ok;
    },
  });
  seen.set(value, proxy);
  return proxy as T;
}

function asRows<T extends { id: string }>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is T =>
      Boolean(row) && typeof row === 'object' && typeof (row as T).id === 'string',
  );
}

/** Seed rows stay available for new code, live edits and new records win. */
function mergeById<T extends { id: string }>(
  seedRows: readonly T[],
  savedRows: unknown,
): T[] {
  const saved = asRows<T>(savedRows);
  const seedIds = new Set(seedRows.map((row) => row.id));
  const savedById = new Map(saved.map((row) => [row.id, row]));
  const created = saved.filter((row) => !seedIds.has(row.id));
  const base = seedRows.map(
    (row) => savedById.get(row.id) ?? structuredClone(row),
  );
  return [...created, ...base];
}

function mergeUser(saved: unknown): DemoUser {
  const base = structuredClone(DEMO_USER);
  if (!saved || typeof saved !== 'object') return base;
  const merged = { ...base, ...(saved as Partial<DemoUser>) };
  merged.id = base.id;
  merged.username = base.username;
  if (typeof merged.password !== 'string' || merged.password.length === 0) {
    merged.password = base.password;
  }
  return merged;
}

function readLegacyBookings(): Booking[] {
  try {
    return asRows<Booking>(JSON.parse(readFileSync(legacyBookingsFile(), 'utf8')));
  } catch {
    return [];
  }
}

function readState(): { state: RuntimeState; write: boolean } {
  const file = runtimeFile();
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      throw new Error(
        `Runtime data file is unreadable (${file}). Refusing to start so live data is not replaced.`,
      );
    }
    const legacy = readLegacyBookings();
    return {
      write: true,
      state: {
        version: 1,
        user: structuredClone(DEMO_USER),
        customers: mergeById(seedCustomers, []),
        lots: mergeById(seedLots, []),
        invoices: mergeById(seedInvoices, []),
        payments: mergeById(seedPayments, []),
        collections: mergeById(seedCollections, []),
        leases: mergeById(seedLeases, []),
        bookings: mergeById(seedBookings, legacy),
        certificates: mergeById(seedCertificates, []),
        notifications: mergeById(seedNotifications, []),
      },
    };
  }

  if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1) {
    throw new Error(
      `Runtime data file is not a valid state file (${file}). Refusing to start so live data is not replaced.`,
    );
  }
  const saved = parsed as Partial<RuntimeState>;
  return {
    write: false,
    state: {
      version: 1,
      user: mergeUser(saved.user),
      customers: mergeById(seedCustomers, saved.customers),
      lots: mergeById(seedLots, saved.lots),
      invoices: mergeById(seedInvoices, saved.invoices),
      payments: mergeById(seedPayments, saved.payments),
      collections: mergeById(seedCollections, saved.collections),
      leases: mergeById(seedLeases, saved.leases),
      bookings: mergeById(seedBookings, saved.bookings),
      certificates: mergeById(seedCertificates, saved.certificates),
      notifications: mergeById(seedNotifications, saved.notifications),
    },
  };
}

function atomicWrite(file: string, json: string) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, json);
  try {
    renameSync(tmp, file);
  } catch {
    unlinkSync(file);
    renameSync(tmp, file);
  }
}

@Injectable()
export class DataStoreService {
  readonly properties: Property[] = properties;
  readonly propertyMetrics = propertyMetrics;

  user!: DemoUser;
  customers!: Customer[];
  lots!: Lot[];
  invoices!: Invoice[];
  payments!: Payment[];
  collections!: CollectionAccount[];
  leases!: Lease[];
  bookings!: Booking[];
  certificates!: CertificateOfInsurance[];
  notifications!: OpsNotification[];

  private readonly state: RuntimeState;
  private hydrating = true;
  private writing = false;

  constructor() {
    const loaded = readState();
    this.state = loaded.state;
    const seen = new WeakMap<object, unknown>();
    const save = () => this.flush();
    this.user = track(this.state.user, save, seen);
    this.customers = track(this.state.customers, save, seen);
    this.lots = track(this.state.lots, save, seen);
    this.invoices = track(this.state.invoices, save, seen);
    this.payments = track(this.state.payments, save, seen);
    this.collections = track(this.state.collections, save, seen);
    this.leases = track(this.state.leases, save, seen);
    this.bookings = track(this.state.bookings, save, seen);
    this.certificates = track(this.state.certificates, save, seen);
    this.notifications = track(this.state.notifications, save, seen);
    this.hydrating = false;
    if (loaded.write) this.flush();
    process.once('SIGTERM', () => this.flush());
    process.once('SIGINT', () => this.flush());
  }

  private flush() {
    if (this.hydrating || this.writing) return;
    this.writing = true;
    try {
      const file = runtimeFile();
      mkdirSync(dirname(file), { recursive: true });
      atomicWrite(file, JSON.stringify(this.state));
    } finally {
      this.writing = false;
    }
  }
}
