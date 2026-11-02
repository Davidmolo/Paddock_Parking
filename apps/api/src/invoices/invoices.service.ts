import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type {
  Invoice,
  InvoiceCollectionMethod,
} from '../data/seed.js';

export type InvoiceRow = Invoice & {
  customerName: string;
  achEnabled: boolean;
  collectionMethod: InvoiceCollectionMethod;
  /** Staff-facing label for the collection path */
  collectionLabel: string;
};

@Injectable()
export class InvoicesService {
  constructor(private readonly store: DataStoreService) {}

  findAll(
    propertyId?: string,
    status?: Invoice['status'],
    collectionMethod?: InvoiceCollectionMethod,
  ) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let list = this.store.invoices;
    if (filterId) {
      list = list.filter((i) => i.propertyId === filterId);
    }
    if (status) {
      list = list.filter((i) => i.status === status);
    }
    const rows = list.map((invoice) => this.enrich(invoice));
    if (collectionMethod) {
      return rows.filter((r) => r.collectionMethod === collectionMethod);
    }
    return rows;
  }

  private enrich(invoice: Invoice): InvoiceRow {
    const customer = this.store.customers.find(
      (c) => c.id === invoice.customerId,
    );
    const achEnabled = customer?.achEnabled ?? false;
    const collectionMethod: InvoiceCollectionMethod =
      invoice.collectionMethod ??
      (achEnabled ? 'ach_debit' : 'send_invoice');

    return {
      ...invoice,
      customerName: customer?.name ?? 'Unknown customer',
      achEnabled,
      collectionMethod,
      collectionLabel:
        collectionMethod === 'ach_debit'
          ? 'ACH debit (auto-pull)'
          : 'Send invoice',
    };
  }
}
