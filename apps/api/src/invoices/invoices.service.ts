import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type { Invoice } from '../data/seed.js';

@Injectable()
export class InvoicesService {
  constructor(private readonly store: DataStoreService) {}

  findAll(propertyId?: string, status?: Invoice['status']) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let list = this.store.invoices;
    if (filterId) {
      list = list.filter((i) => i.propertyId === filterId);
    }
    if (status) {
      list = list.filter((i) => i.status === status);
    }
    return list;
  }
}
