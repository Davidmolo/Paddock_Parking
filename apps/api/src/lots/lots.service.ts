import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type { PatchLotDto } from './dto/patch-lot.dto.js';
import { LOT_TYPE_LABELS } from '../data/seed.js';
import { syncLotsFromLeaseNoticeWindows } from '../leases/lot-availability-sync.js';

@Injectable()
export class LotsService implements OnModuleInit {
  private readonly logger = new Logger(LotsService.name);

  constructor(private readonly store: DataStoreService) {}

  onModuleInit() {
    this.applyLeaseNoticeRule('startup');
  }

  /** David: occupied → available soon when lease notice window opens */
  applyLeaseNoticeRule(reason = 'sync') {
    const result = syncLotsFromLeaseNoticeWindows(this.store);
    if (result.flipped || result.restored) {
      this.logger.log(
        `Lease notice → lot status (${reason}): flipped ${result.flipped}, restored ${result.restored}`,
      );
    }
    return result;
  }

  findAll(propertyId?: string) {
    this.applyLeaseNoticeRule('list');
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let list = this.store.lots.filter((l) => Boolean(l?.id));
    if (filterId) {
      list = list.filter((l) => l.propertyId === filterId);
    }
    return list.map((lot) => this.enrich(lot));
  }

  findOne(id: string) {
    this.applyLeaseNoticeRule('one');
    const lot = this.store.lots.find((l) => l.id === id);
    if (!lot) throw new NotFoundException(`Lot ${id} not found`);
    return this.enrich(lot);
  }

  update(id: string, dto: PatchLotDto) {
    const lot = this.store.lots.find((l) => l.id === id);
    if (!lot) throw new NotFoundException(`Lot ${id} not found`);

    if (dto.status !== undefined) lot.status = dto.status;
    if (dto.monthlyRate !== undefined) lot.monthlyRate = dto.monthlyRate;
    if (dto.qbItemName !== undefined) lot.qbItemName = dto.qbItemName;
    if (dto.availableOn !== undefined) {
      if (dto.availableOn === null || dto.availableOn === '') {
        delete lot.availableOn;
      } else {
        lot.availableOn = dto.availableOn;
      }
    }
    if (dto.vacantSince !== undefined) {
      if (dto.vacantSince === null || dto.vacantSince === '') {
        delete lot.vacantSince;
      } else {
        lot.vacantSince = dto.vacantSince;
      }
    }

    if (dto.customerId !== undefined) {
      // Clear previous assignment links
      if (lot.customerId) {
        const prev = this.store.customers.find((c) => c.id === lot.customerId);
        if (prev) prev.lotIds = prev.lotIds.filter((lid) => lid !== lot.id);
      }
      if (dto.customerId === null || dto.customerId === '') {
        if (lot.customerId) {
          const prev = this.store.customers.find((c) => c.id === lot.customerId);
          if (prev?.name) lot.lastTenantName = prev.name;
        }
        delete lot.customerId;
        if (lot.status === 'occupied' || lot.status === 'available_soon') {
          lot.status = 'available';
        }
        if (lot.status === 'available' && !lot.vacantSince) {
          lot.vacantSince = new Date().toISOString().slice(0, 10);
        }
        delete lot.availableOn;
      } else {
        lot.customerId = dto.customerId;
        lot.status = dto.status ?? 'occupied';
        delete lot.lastTenantName;
        const customer = this.store.customers.find((c) => c.id === dto.customerId);
        if (customer && !customer.lotIds.includes(lot.id)) {
          customer.lotIds.push(lot.id);
        }
      }
    } else if (dto.status === 'available' || dto.status === 'maintenance') {
      if (lot.customerId) {
        const prev = this.store.customers.find((c) => c.id === lot.customerId);
        if (prev) {
          prev.lotIds = prev.lotIds.filter((lid) => lid !== lot.id);
          if (prev.name) lot.lastTenantName = prev.name;
        }
      }
      delete lot.customerId;
      delete lot.availableOn;
      if (dto.status === 'available' && !lot.vacantSince) {
        lot.vacantSince = new Date().toISOString().slice(0, 10);
      }
    } else if (dto.status === 'available_soon' && !lot.availableOn) {
      // Default: 30 days out if staff didn't set a date yet
      const d = new Date();
      d.setDate(d.getDate() + 30);
      lot.availableOn = d.toISOString().slice(0, 10);
    }

    return this.enrich(lot);
  }

  private enrich(lot: (typeof this.store.lots)[number]) {
    const customer = lot.customerId
      ? this.store.customers.find((c) => c.id === lot.customerId)
      : undefined;
    return {
      ...lot,
      lotTypeLabel: LOT_TYPE_LABELS[lot.lotType],
      customerName: customer?.name,
    };
  }
}
