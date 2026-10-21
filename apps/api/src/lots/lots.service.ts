import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type { PatchLotDto } from './dto/patch-lot.dto.js';
import { LOT_TYPE_LABELS } from '../data/seed.js';

@Injectable()
export class LotsService {
  constructor(private readonly store: DataStoreService) {}

  findAll(propertyId?: string) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let list = this.store.lots;
    if (filterId) {
      list = list.filter((l) => l.propertyId === filterId);
    }
    return list.map((lot) => this.enrich(lot));
  }

  findOne(id: string) {
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

    if (dto.customerId !== undefined) {
      // Clear previous assignment links
      if (lot.customerId) {
        const prev = this.store.customers.find((c) => c.id === lot.customerId);
        if (prev) prev.lotIds = prev.lotIds.filter((lid) => lid !== lot.id);
      }
      if (dto.customerId === null || dto.customerId === '') {
        delete lot.customerId;
        if (lot.status === 'occupied') lot.status = 'available';
      } else {
        lot.customerId = dto.customerId;
        lot.status = dto.status ?? 'occupied';
        const customer = this.store.customers.find((c) => c.id === dto.customerId);
        if (customer && !customer.lotIds.includes(lot.id)) {
          customer.lotIds.push(lot.id);
        }
      }
    } else if (
      dto.status === 'available' ||
      dto.status === 'maintenance'
    ) {
      if (lot.customerId) {
        const prev = this.store.customers.find((c) => c.id === lot.customerId);
        if (prev) prev.lotIds = prev.lotIds.filter((lid) => lid !== lot.id);
      }
      delete lot.customerId;
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
