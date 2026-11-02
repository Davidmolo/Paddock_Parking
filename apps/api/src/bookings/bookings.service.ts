import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type {
  Booking,
  BookingProductType,
  BookingVehicle,
  BookingWizardStep,
  LotType,
} from '../data/seed.js';
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

  /** Items still owed from “submit later” on Book Now */
  complianceQueue() {
    const items: Array<{
      bookingId: string;
      customerName: string;
      email: string;
      propertyId: string;
      propertyName?: string;
      kind: 'vehicle_plate' | 'documents';
      detail: string;
      wizardStep?: BookingWizardStep;
    }> = [];

    for (const b of this.store.bookings) {
      if (b.status === 'converted' || b.status === 'cancelled') continue;
      const property = this.store.properties.find((p) => p.id === b.propertyId);
      for (const v of b.vehicles ?? []) {
        if (v.submitLater || !v.licensePlate.trim()) {
          items.push({
            bookingId: b.id,
            customerName: b.customerName,
            email: b.email,
            propertyId: b.propertyId,
            propertyName: property?.name,
            kind: 'vehicle_plate',
            detail: `${v.make || 'Vehicle'} ${v.truckNumber || ''} — plate pending`,
            wizardStep: b.wizardStep,
          });
        }
      }
      if (b.docsSubmitLater) {
        items.push({
          bookingId: b.id,
          customerName: b.customerName,
          email: b.email,
          propertyId: b.propertyId,
          propertyName: property?.name,
          kind: 'documents',
          detail: 'ID / insurance docs marked submit later',
          wizardStep: b.wizardStep,
        });
      }
    }
    return items;
  }

  create(input: {
    propertyId: string;
    lotType: LotType;
    customerName: string;
    email: string;
    phone: string;
    monthlyRate?: number;
    notes?: string;
    productType?: BookingProductType;
    spotCount?: number;
    acreSize?: number;
    storageDescription?: string;
    leaseStart?: string;
    vehicles?: BookingVehicle[];
    docsSubmitLater?: boolean;
    wizardStep?: BookingWizardStep;
    paymentMethod?: 'card' | 'ach' | 'pending';
    autoPullAgreed?: boolean;
    lotId?: string;
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
      status: input.paymentMethod && input.paymentMethod !== 'pending'
        ? 'reserved'
        : 'new',
      createdAt: new Date().toISOString().slice(0, 10),
      productType: input.productType,
      spotCount: input.spotCount,
      acreSize: input.acreSize,
      storageDescription: input.storageDescription,
      leaseStart: input.leaseStart,
      vehicles: input.vehicles,
      docsSubmitLater: input.docsSubmitLater,
      wizardStep: input.wizardStep ?? 4,
      paymentMethod: input.paymentMethod ?? 'pending',
      autoPullAgreed: input.autoPullAgreed ?? false,
      autoPullWaived: false,
      lotId: input.lotId,
    };
    this.store.bookings.unshift(booking);
    return this.enrich(booking);
  }

  patch(
    id: string,
    body: { autoPullWaived?: boolean },
  ) {
    const booking = this.store.bookings.find((b) => b.id === id);
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (body.autoPullWaived != null) {
      booking.autoPullWaived = body.autoPullWaived;
    }
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
      achEnabled:
        booking.autoPullWaived
          ? false
          : Boolean(booking.autoPullAgreed) ||
            booking.paymentMethod === 'ach',
      gateCode: String(Math.floor(1000 + Math.random() * 9000)),
      isActive: true,
      lotIds: [lot.id],
      leaseStart: booking.leaseStart ?? new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
      documents: [],
      notes: booking.autoPullWaived
        ? 'Converted from Book Now — auto-pull waived by staff'
        : 'Converted from Book Now reservation',
    });

    lot.status = 'occupied';
    lot.customerId = customerId;
    if (booking.monthlyRate) lot.monthlyRate = booking.monthlyRate;

    const start =
      booking.leaseStart ?? new Date().toISOString().slice(0, 10);
    const renewal = new Date(start);
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
      stage: 'not_contacted',
      achEnabled:
        booking.autoPullWaived
          ? false
          : Boolean(booking.autoPullAgreed) ||
            booking.paymentMethod === 'ach',
      notes: 'Created from Book Now — awaiting COI with correct additional insured',
    });

    booking.status = 'converted';
    booking.lotId = lot.id;
    booking.customerId = customerId;
    booking.wizardStep = 4;

    return { booking: this.enrich(booking), customerId, lotId: lot.id };
  }

  private enrich(b: Booking) {
    const property = this.store.properties.find((p) => p.id === b.propertyId);
    const missingPlates = (b.vehicles ?? []).filter(
      (v) => v.submitLater || !v.licensePlate.trim(),
    ).length;
    return {
      ...b,
      lotTypeLabel: LOT_TYPE_LABELS[b.lotType],
      propertyName: property?.name,
      missingPlates,
      compliancePending: missingPlates > 0 || !!b.docsSubmitLater,
    };
  }
}
