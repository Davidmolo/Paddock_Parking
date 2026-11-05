import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Injectable } from '@nestjs/common';
import {
  bookings,
  certificates,
  collections,
  customers,
  DEMO_USER,
  invoices,
  leases,
  lots,
  notifications,
  payments,
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

const SEED_BOOKING_IDS = new Set(bookings.map((booking) => booking.id));

function runtimeBookingsFile() {
  return (
    process.env.PADDOCK_BOOKINGS_FILE ??
    join(process.cwd(), 'data', 'runtime-bookings.json')
  );
}

function readRuntimeBookings(): Booking[] {
  try {
    const parsed = JSON.parse(readFileSync(runtimeBookingsFile(), 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (booking): booking is Booking =>
        Boolean(booking) &&
        typeof booking.id === 'string' &&
        !SEED_BOOKING_IDS.has(booking.id),
    );
  } catch {
    return [];
  }
}

@Injectable()
export class DataStoreService {
  readonly user: DemoUser = { ...DEMO_USER };
  readonly properties: Property[] = properties;
  readonly lots: Lot[] = lots;
  readonly customers: Customer[] = customers;
  readonly invoices: Invoice[] = invoices;
  readonly payments: Payment[] = payments;
  readonly collections: CollectionAccount[] = collections;
  readonly leases: Lease[] = leases;
  readonly bookings: Booking[] = bookings;

  constructor() {
    const saved = readRuntimeBookings();
    if (saved.length) this.bookings.unshift(...saved);
  }

  persistBookings() {
    const runtime = this.bookings.filter(
      (booking) => !SEED_BOOKING_IDS.has(booking.id),
    );
    const file = runtimeBookingsFile();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(runtime));
  }
  readonly certificates: CertificateOfInsurance[] = certificates;
  readonly notifications: OpsNotification[] = notifications;
  readonly propertyMetrics = propertyMetrics;
}
