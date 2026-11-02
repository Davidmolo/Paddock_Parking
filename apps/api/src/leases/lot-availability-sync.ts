import type { Customer, Lease, Lot } from '../data/seed.js';
import { isRenewalNoticeDue } from './lease-helpers.js';

type StoreSlice = {
  lots: Lot[];
  leases: Lease[];
  customers: Customer[];
};

/**
 * David: when a tenant lease enters its notice window (e.g. 60 days before
 * renewal), auto-flip that customer's occupied lots → available_soon and set
 * availableOn to the renewal / end date.
 *
 * - Does not touch reserved / maintenance / available
 * - Skips leases marked renewed (they stay occupied)
 * - If stage is exiting and still occupied, also marks available_soon
 */
export function syncLotsFromLeaseNoticeWindows(
  store: StoreSlice,
  today = new Date(),
): { flipped: number; restored: number } {
  let flipped = 0;
  let restored = 0;

  for (const lease of store.leases) {
    if (lease.direction !== 'tenant' || !lease.customerId) continue;
    if (lease.status !== 'active') continue;

    const lots = lotsForCustomer(store, lease.customerId);
    if (lots.length === 0) continue;

    // Staying — put map back to occupied if we had marked available soon
    if (lease.stage === 'renewed') {
      for (const lot of lots) {
        if (lot.status === 'available_soon') {
          lot.status = 'occupied';
          delete lot.availableOn;
          restored += 1;
        }
      }
      continue;
    }

    const inNotice =
      isRenewalNoticeDue(lease, today) || lease.stage === 'exiting';
    if (!inNotice) continue;

    const freeOn = lease.renewalDate ?? lease.endDate;
    for (const lot of lots) {
      if (lot.status === 'occupied') {
        lot.status = 'available_soon';
        if (freeOn) lot.availableOn = freeOn;
        flipped += 1;
      } else if (lot.status === 'available_soon' && freeOn) {
        // Keep free-on date aligned with lease renewal / end
        lot.availableOn = freeOn;
      }
    }
  }

  return { flipped, restored };
}

function lotsForCustomer(store: StoreSlice, customerId: string): Lot[] {
  const customer = store.customers.find((c) => c.id === customerId);
  const ids = new Set<string>([
    ...(customer?.lotIds ?? []),
    ...store.lots
      .filter((l) => l.customerId === customerId)
      .map((l) => l.id),
  ]);
  return store.lots.filter((l) => ids.has(l.id));
}
