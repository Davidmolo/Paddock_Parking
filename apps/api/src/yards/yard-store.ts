import type { Lot, LotStatus, LotType } from '../data/seed.js';
import { isPaddockEditor } from './paddock-layout.js';

export type StoredSpace = {
  id: string;
  use: string;
  label: string;
  length: number;
  width: number;
  x?: number;
  y?: number;
  status?: LotStatus;
  color?: string;
  monthlyRate?: number;
  availableOn?: string;
  vacantSince?: string;
  customerId?: string;
  customerName?: string;
  archived?: boolean;
};

export type StoredMark = {
  id: string;
  category: string;
  shape: string;
  x: number;
  y: number;
  length: number;
  width: number;
  facing?: string;
  rotation?: number;
};

export type StoredYard = {
  id: string;
  name: string;
  kind: string;
  length: number;
  width: number;
  radius: number;
  span: number;
  outline: number[][];
  lease?: Record<string, string>;
  leaseName?: string;
  leaseFile?: string;
  spaces?: StoredSpace[];
  marks?: StoredMark[];
  archived?: boolean;
};

function liveSpaces(yard: StoredYard) {
  return (yard.spaces ?? []).filter((space) => !space.archived);
}

type YardStore = {
  yards: StoredYard[];
  lots: Lot[];
  customers: { id: string; name: string; lotIds: string[] }[];
};

function lotType(use: string): LotType {
  return use === 'parking' ? 'truck_trailer' : 'general_storage';
}

function lotFromSpace(propertyId: string, space: StoredSpace): Lot {
  const lot: Lot = {
    id: space.id,
    propertyId,
    number: space.label,
    size: `${space.length} × ${space.width} ft`,
    lotType: lotType(space.use),
    monthlyRate: space.monthlyRate ?? 0,
    status: space.status ?? 'available',
  };
  if (space.customerId) lot.customerId = space.customerId;
  if (space.availableOn) lot.availableOn = space.availableOn;
  if (space.vacantSince) lot.vacantSince = space.vacantSince;
  return lot;
}

function dropLot(store: YardStore, id: string) {
  const at = store.lots.findIndex((lot) => lot.id === id);
  if (at === -1) return;
  store.lots.splice(at, 1);
  for (const customer of store.customers) {
    customer.lotIds = customer.lotIds.filter((lotId) => lotId !== id);
  }
}

function applySpace(store: YardStore, lot: Lot, space: StoredSpace) {
  const next = space.customerId || undefined;
  const prev = lot.customerId;
  if (prev && prev !== next) {
    const person = store.customers.find((customer) => customer.id === prev);
    if (person) person.lotIds = person.lotIds.filter((lotId) => lotId !== lot.id);
    if (!next && person?.name) lot.lastTenantName = person.name;
  }
  if (next) {
    lot.customerId = next;
    delete lot.lastTenantName;
    const person = store.customers.find((customer) => customer.id === next);
    if (person && !person.lotIds.includes(lot.id)) person.lotIds.push(lot.id);
  } else {
    delete lot.customerId;
  }
  if (space.label) lot.number = space.label;
  if (space.status) lot.status = space.status;
  if (space.monthlyRate != null) lot.monthlyRate = space.monthlyRate;
  if (space.availableOn) lot.availableOn = space.availableOn;
  else delete lot.availableOn;
  if (space.vacantSince) lot.vacantSince = space.vacantSince;
  else if (lot.status !== 'available') delete lot.vacantSince;
}

/** Paddock 16 and 325 keep the existing stall record. Only an archived space leaves the live list. */
function writePaddock(store: YardStore, yard: StoredYard) {
  const previous = store.yards.find((item) => item.id === yard.id);
  const incoming = yard.spaces ?? [];
  const seen = new Set(incoming.map((space) => space.id));
  const spaces = [
    ...incoming,
    ...(previous?.spaces ?? []).filter((space) => !seen.has(space.id)),
  ];
  const row = { ...yard, marks: yard.marks ?? previous?.marks, spaces, archived: false };
  const at = store.yards.findIndex((item) => item.id === yard.id);
  if (at === -1) store.yards.push(row);
  else store.yards[at] = row;

  for (const space of spaces) {
    if (space.archived) {
      dropLot(store, space.id);
      continue;
    }
    const lot = store.lots.find((item) => item.id === space.id);
    if (!lot) {
      const created = lotFromSpace(yard.id, space);
      store.lots.push(created);
      applySpace(store, created, space);
      continue;
    }
    applySpace(store, lot, space);
  }
}

/** Drop this yard's lots and write the current spaces in their place. */
export function writeYard(store: YardStore, yard: StoredYard) {
  if (isPaddockEditor(yard.id)) {
    writePaddock(store, yard);
    return;
  }
  const spaces = yard.spaces ?? [];
  const row = { ...yard, spaces, archived: yard.archived ?? false };
  const at = store.yards.findIndex((item) => item.id === yard.id);
  if (at === -1) store.yards.push(row);
  else store.yards[at] = row;

  const gone = new Set(
    store.lots.filter((lot) => lot.propertyId === yard.id).map((lot) => lot.id),
  );
  for (const space of liveSpaces(row)) gone.delete(space.id);
  if (gone.size) {
    for (const customer of store.customers) {
      customer.lotIds = customer.lotIds.filter((id) => !gone.has(id));
    }
  }

  const sync = yard.archived ? [] : liveSpaces(row);
  const kept = store.lots.filter((lot) => lot.propertyId !== yard.id);
  store.lots.splice(0, store.lots.length, ...kept, ...sync.map((space) => lotFromSpace(yard.id, space)));
}

export function archiveYard(store: YardStore, id: string) {
  const yard = store.yards.find((item) => item.id === id);
  if (!yard) return;
  yard.archived = true;
  writeYard(store, yard);
}

export function archiveSpace(store: YardStore, yardId: string, spaceId: string) {
  const yard = store.yards.find((item) => item.id === yardId);
  if (!yard) return;
  const space = yard.spaces?.find((item) => item.id === spaceId);
  if (!space) return;
  space.archived = true;
  writeYard(store, yard);
}

export function mirrorLot(store: YardStore, lot: Lot) {
  if (!lot.propertyId.startsWith('yard-') && !isPaddockEditor(lot.propertyId)) return;
  const space = store.yards
    .find((yard) => yard.id === lot.propertyId)
    ?.spaces?.find((item) => item.id === lot.id);
  if (!space) return;
  space.status = lot.status;
  space.monthlyRate = lot.monthlyRate;
  space.customerId = lot.customerId ?? '';
  space.customerName = lot.customerId
    ? (store.customers.find((customer) => customer.id === lot.customerId)?.name ?? '')
    : '';
  space.availableOn = lot.availableOn ?? '';
  space.vacantSince = lot.vacantSince ?? '';
}
