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
  readonly certificates: CertificateOfInsurance[] = certificates;
  readonly notifications: OpsNotification[] = notifications;
  readonly propertyMetrics = propertyMetrics;
}
