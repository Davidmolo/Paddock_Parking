import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type { Booking, LotType } from '../data/seed.js';
import { LOT_TYPE_LABELS } from '../data/seed.js';

@Injectable()
export class BookingsService {
  constructor(private readonly store: DataStoreService) {}

  findAll(propertyId?: string) {
    let list = this.store.bookings;
    if (propertyId && propertyId !== 'all') {
      list = list.filter((b) => b.propertyId === propertyId);
    }
    return list.map((b) => this.enrich(b));
  }

  create(input: {
    propertyId: string;
    lotType: LotType;
    customerName: string;
    email: string;
    phone: string;
    monthlyRate?: number;
    notes?: string;
  }) {
    const booking: Booking = {
      id: `bk${Date.now()}`,
      propertyId: input.propertyId,
      lotType: input.lotType,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      monthlyRate: input.monthlyRate,
      notes: input.notes ?? 'From Book Now',
      status: 'new',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.store.bookings.unshift(booking);
    return this.enrich(booking);
  }

  convert(id: string, lotId: string) {
    const booking = this.store.bookings.find((b) => b.id === id);
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    const lot = this.store.lots.find((l) => l.id === lotId);
    if (!lot) throw new NotFoundException(`Lot ${lotId} not found`);

    const customerId = `c${Date.now()}`;
    this.store.customers.unshift({
      id: customerId,
      name: booking.customerName,
      contactName: booking.customerName,
      email: booking.email,
      phone: booking.phone,
      propertyId: booking.propertyId,
      contractType: 'month_to_month',
      paymentStatus: 'current',
      balanceDue: 0,
      securityDeposit: booking.monthlyRate ?? lot.monthlyRate,
      leaseStatus: 'Pending setup',
      insuranceOk: false,
      achEnabled: false,
      gateCode: String(Math.floor(1000 + Math.random() * 9000)),
      isActive: true,
      lotIds: [lot.id],
      leaseStart: new Date().toISOString().slice(0, 10),
      documents: [],
      notes: 'Converted from Book Now reservation',
    });

    lot.status = 'occupied';
    lot.customerId = customerId;
    if (booking.monthlyRate) lot.monthlyRate = booking.monthlyRate;

    const start = new Date().toISOString().slice(0, 10);
    const renewal = new Date();
    renewal.setFullYear(renewal.getFullYear() + 1);
    this.store.leases.unshift({
      id: `ls${Date.now()}`,
      direction: 'tenant',
      customerId,
      propertyId: booking.propertyId,
      lotNumbers: [lot.number],
      startDate: start,
      renewalDate: renewal.toISOString().slice(0, 10),
      notificationLeadDays: 30,
      monthlyRent: booking.monthlyRate ?? lot.monthlyRate,
      status: 'pending',
      achEnabled: false,
      notes: 'Created from Book Now — awaiting COI with correct additional insured',
    });

    booking.status = 'converted';
    booking.lotId = lot.id;
    booking.customerId = customerId;

    return { booking: this.enrich(booking), customerId, lotId: lot.id };
  }

  private enrich(b: Booking) {
    const property = this.store.properties.find((p) => p.id === b.propertyId);
    return {
      ...b,
      lotTypeLabel: LOT_TYPE_LABELS[b.lotType],
      propertyName: property?.name,
    };
  }
}
