import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type {
  Booking,
  BookingCondition,
  BookingDecision,
  BookingProductType,
  BookingVehicle,
  BookingWizardStep,
  LotType,
} from '../data/seed.js';
import { LOT_TYPE_LABELS } from '../data/seed.js';
import { sendPortalInviteEmail } from '../mail/send-portal-invite.js';

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
    referredBy?: string;
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
      status:
        input.paymentMethod && input.paymentMethod !== 'pending'
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
      referredBy: input.referredBy,
      /** FMS: lands as Pending for staff review */
      decision: 'pending',
      portalStatus: 'not_invited',
    };
    this.store.bookings.unshift(booking);
    this.store.persistBookings();
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
    this.store.persistBookings();
    return this.enrich(booking);
  }

  /**
   * FMS Onboarding Profiles: staff decide once —
   * approve | conditional | deny.
   */
  decide(
    id: string,
    body: {
      decision: 'approve' | 'conditional' | 'deny';
      lotId?: string;
      conditions?: BookingCondition[];
      notes?: string;
    },
  ) {
    const booking = this.store.bookings.find((b) => b.id === id);
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    const current = booking.decision ?? this.inferDecision(booking);
    if (current !== 'pending') {
      throw new BadRequestException(
        'A decision was already made on this application.',
      );
    }

    if (body.decision === 'deny') {
      booking.decision = 'denied';
      booking.status = 'cancelled';
      booking.decidedAt = new Date().toISOString().slice(0, 10);
      booking.decisionNotes =
        body.notes ?? 'Denied by staff — customer emailed (demo).';
      booking.portalStatus = 'not_invited';
      this.store.persistBookings();
      return {
        booking: this.enrich(booking),
        customerId: undefined as string | undefined,
        lotId: undefined as string | undefined,
      };
    }

    if (!body.lotId) {
      throw new BadRequestException(
        'Pick a yard space (lot) before approving.',
      );
    }

    const lot = this.store.lots.find((l) => l.id === body.lotId);
    if (!lot) {
      throw new BadRequestException(`Lot ${body.lotId} not found.`);
    }
    if (lot.propertyId !== booking.propertyId) {
      throw new BadRequestException(
        'That space is on a different yard than this application.',
      );
    }
    if (lot.status !== 'available' && lot.status !== 'available_soon') {
      throw new BadRequestException(
        `Space #${lot.number} is ${lot.status.replace('_', ' ')} — pick an available lot.`,
      );
    }

    let conditions = body.conditions ?? [];
    if (body.decision === 'conditional' && conditions.length === 0) {
      // FMS: if none picked, record all three — we use parking-relevant defaults
      conditions = ['prepaid', 'coi_pending', 'deposit_hold'];
    }

    const converted = this.convert(id, body.lotId);
    const updated = this.store.bookings.find((b) => b.id === id)!;
    updated.decision =
      body.decision === 'conditional' ? 'conditional' : 'approved';
    updated.conditions = conditions;
    updated.decidedAt = new Date().toISOString().slice(0, 10);
    updated.decisionNotes =
      body.notes ??
      (body.decision === 'conditional'
        ? `Conditionally approved: ${conditions.join(', ')}`
        : 'Approved — customer created. Portal invite still Not invited.');
    updated.portalStatus = 'not_invited';

    const customer = this.store.customers.find(
      (c) => c.id === converted.customerId,
    );
    if (customer && conditions.length) {
      customer.notes = [
        customer.notes,
        `Onboarding conditions: ${conditions.join(', ')}`,
      ]
        .filter(Boolean)
        .join(' · ');
      if (conditions.includes('coi_pending')) {
        customer.insuranceOk = false;
      }
    }

    this.store.persistBookings();
    return {
      booking: this.enrich(updated),
      customerId: converted.customerId,
      lotId: converted.lotId,
    };
  }

  /** Email a set-password link, same idea as the Phoenix portal invite. */
  async invitePortal(id: string) {
    const booking = this.store.bookings.find((b) => b.id === id);
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (!booking.customerId) {
      throw new BadRequestException(
        'Approve the application before sending a portal invite.',
      );
    }
    if (booking.portalStatus === 'active') {
      return this.enrich(booking);
    }
    const customer = this.store.customers.find(
      (c) => c.id === booking.customerId,
    );
    if (!customer?.email?.includes('@')) {
      throw new BadRequestException(
        'This customer needs an email address before a portal invite can be sent.',
      );
    }

    const resent = booking.portalStatus === 'invited';
    const token = randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const previousToken = customer.portalInviteToken;
    const previousExpires = customer.portalInviteExpiresAt;
    customer.portalInviteToken = token;
    customer.portalInviteExpiresAt = expires.toISOString();

    const appUrl = (
      process.env.APP_URL || 'https://pms.paddockparking.com'
    ).replace(/\/$/, '');
    const inviteUrl = `${appUrl}/portal?token=${encodeURIComponent(token)}&email=${encodeURIComponent(customer.email)}`;

    try {
      await sendPortalInviteEmail({
        to: customer.email,
        name: customer.contactName || customer.name,
        inviteUrl,
        expiresAt: expires,
      });
    } catch (err) {
      customer.portalInviteToken = previousToken;
      customer.portalInviteExpiresAt = previousExpires;
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Could not send the invite email.',
      );
    }

    booking.portalStatus = 'invited';
    booking.decisionNotes = [
      booking.decisionNotes,
      resent
        ? `Portal invitation re-sent to ${customer.email}.`
        : `Portal invitation emailed to ${customer.email}.`,
    ]
      .filter(Boolean)
      .join(' · ');
    this.store.persistBookings();
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
        ? 'Approved from onboarding — auto-pull waived by staff'
        : 'Approved from onboarding application',
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
      notes:
        'Created from onboarding — awaiting COI with correct additional insured',
    });

    booking.status = 'converted';
    booking.lotId = lot.id;
    booking.customerId = customerId;
    booking.wizardStep = booking.wizardStep ?? 5;
    if (!booking.decision || booking.decision === 'pending') {
      booking.decision = 'approved';
      booking.decidedAt = new Date().toISOString().slice(0, 10);
    }
    if (!booking.portalStatus) booking.portalStatus = 'not_invited';

    this.store.persistBookings();
    return { booking: this.enrich(booking), customerId, lotId: lot.id };
  }

  private inferDecision(b: Booking): BookingDecision {
    if (b.decision) return b.decision;
    if (b.status === 'converted') return 'approved';
    if (b.status === 'cancelled') return 'denied';
    return 'pending';
  }

  private enrich(b: Booking) {
    const property = this.store.properties.find((p) => p.id === b.propertyId);
    const customer = b.customerId
      ? this.store.customers.find((c) => c.id === b.customerId)
      : undefined;
    const missingPlates = (b.vehicles ?? []).filter(
      (v) => v.submitLater || !v.licensePlate.trim(),
    ).length;
    const decision = this.inferDecision(b);
    const step = b.wizardStep ?? 1;
    return {
      ...b,
      decision,
      portalStatus: b.portalStatus ?? 'not_invited',
      gateCode: customer?.gateCode,
      lotTypeLabel: LOT_TYPE_LABELS[b.lotType],
      propertyName: property?.name,
      missingPlates,
      compliancePending: missingPlates > 0 || !!b.docsSubmitLater,
      /** FMS-style labels for UI */
      decisionLabel:
        decision === 'pending'
          ? 'Pending'
          : decision === 'approved'
            ? 'Approved'
            : decision === 'conditional'
              ? 'Conditionally approved'
              : 'Denied',
      stepLabel: stepLabel(step),
      stepsComplete: Math.min(step, 4),
    };
  }
}

function stepLabel(step: BookingWizardStep): string {
  switch (step) {
    case 1:
      return '1 · Get started';
    case 2:
      return '2 · Business / lease';
    case 3:
      return '3 · Verify & pay';
    case 4:
      return '4 · Review & sign';
    case 5:
      return 'Submitted';
    default:
      return `Step ${step}`;
  }
}
