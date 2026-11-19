import type { Lot, LotStatus, LotType } from '../data/seed.js';

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
};

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

/** Drop this yard's lots and write the current spaces in their place. */
export function writeYard(store: YardStore, yard: StoredYard) {
  const spaces = yard.spaces ?? [];
  const row = { ...yard, spaces };
  const at = store.yards.findIndex((item) => item.id === yard.id);
  if (at === -1) store.yards.push(row);
  else store.yards[at] = row;

  const gone = new Set(
    store.lots.filter((lot) => lot.propertyId === yard.id).map((lot) => lot.id),
  );
  for (const space of spaces) gone.delete(space.id);
  if (gone.size) {
    for (const customer of store.customers) {
      customer.lotIds = customer.lotIds.filter((id) => !gone.has(id));
    }
  }

  const kept = store.lots.filter((lot) => lot.propertyId !== yard.id);
  store.lots.splice(0, store.lots.length, ...kept, ...spaces.map((space) => lotFromSpace(yard.id, space)));
}

export function removeYard(store: YardStore, id: string) {
  const at = store.yards.findIndex((item) => item.id === id);
  if (at !== -1) store.yards.splice(at, 1);
  const gone = new Set(store.lots.filter((lot) => lot.propertyId === id).map((lot) => lot.id));
  for (const customer of store.customers) {
    customer.lotIds = customer.lotIds.filter((lotId) => !gone.has(lotId));
  }
  const kept = store.lots.filter((lot) => lot.propertyId !== id);
  store.lots.splice(0, store.lots.length, ...kept);
}

export function mirrorLot(store: YardStore, lot: Lot) {
  if (!lot.propertyId.startsWith('yard-')) return;
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
