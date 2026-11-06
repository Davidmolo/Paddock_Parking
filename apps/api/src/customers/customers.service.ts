import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sendPortalInviteEmail } from '../mail/send-portal-invite.js';
import { DataStoreService } from '../data/data-store.service.js';
import type { CertificateOfInsurance, CustomerDocument } from '../data/seed.js';
import { LOT_TYPE_LABELS } from '../data/seed.js';
import {
  daysUntil,
  evaluateCoi,
  isRenewalNoticeDue,
  renewalUrgency,
} from '../leases/lease-helpers.js';
import type { UpsertCoiDto } from './dto/upsert-coi.dto.js';
import type { UploadDocumentDto } from './dto/upload-document.dto.js';

@Injectable()
export class CustomersService {
  constructor(private readonly store: DataStoreService) {}

  findAll(propertyId?: string, q?: string) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let list = this.store.customers;
    if (filterId) {
      list = list.filter((c) => c.propertyId === filterId);
    }
    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.contactName.toLowerCase().includes(needle) ||
          c.email.toLowerCase().includes(needle) ||
          c.phone.includes(needle),
      );
    }
    // Greta: newest customers first (added date)
    list = [...list].sort((a, b) =>
      (b.createdAt || b.leaseStart || '').localeCompare(
        a.createdAt || a.leaseStart || '',
      ),
    );
    return list.map((c) => this.summary(c));
  }

  findOne(id: string) {
    const customer = this.store.customers.find((c) => c.id === id);
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return this.detail(customer);
  }

  /** Tenant portal — set password from invite email/token */
  portalSetPassword(body: {
    email: string;
    password: string;
    inviteToken?: string;
  }) {
    const email = body.email.trim().toLowerCase();
    const customer = this.store.customers.find(
      (c) => c.email.toLowerCase() === email,
    );
    if (!customer) {
      throw new NotFoundException('No customer found for that email.');
    }
    if (!customer.portalInviteToken && !customer.portalPassword) {
      throw new BadRequestException(
        'Ask staff to send a portal invitation first.',
      );
    }
    if (
      body.inviteToken &&
      customer.portalInviteToken &&
      body.inviteToken !== customer.portalInviteToken
    ) {
      throw new BadRequestException('Invite link is invalid or expired.');
    }
    if (
      customer.portalInviteExpiresAt &&
      Date.parse(customer.portalInviteExpiresAt) < Date.now()
    ) {
      throw new BadRequestException(
        'Invite link is expired. Ask staff to send a new one.',
      );
    }
    if (!body.password || body.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }
    customer.portalPassword = body.password;
    customer.portalInviteToken = undefined;
    customer.portalInviteExpiresAt = undefined;
    const booking = this.store.bookings.find((b) => b.customerId === customer.id);
    if (booking) booking.portalStatus = 'active';
    return {
      ok: true,
      message: 'Password set. You can sign in to the customer portal.',
      gateCode: customer.gateCode,
    };
  }

  portalLogin(body: { email: string; password: string }) {
    const email = body.email.trim().toLowerCase();
    const customer = this.store.customers.find(
      (c) => c.email.toLowerCase() === email,
    );
    if (!customer?.portalPassword || customer.portalPassword !== body.password) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    customer.portalLastLogin = new Date().toISOString();
    const booking = this.store.bookings.find((b) => b.customerId === customer.id);
    if (booking) booking.portalStatus = 'active';
    return {
      ok: true,
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      gateCode: customer.gateCode,
      propertyId: customer.propertyId,
    };
  }

  portalHome(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      throw new BadRequestException('Email is required.');
    }
    const customer = this.store.customers.find(
      (c) => c.email.toLowerCase() === normalized,
    );
    if (!customer) {
      throw new NotFoundException('No customer found for that email.');
    }
    const property = this.store.properties.find(
      (p) => p.id === customer.propertyId,
    );
    const lots = this.store.lots.filter((lot) =>
      customer.lotIds.includes(lot.id),
    );
    const lease = this.store.leases.find(
      (item) =>
        item.direction === 'tenant' && item.customerId === customer.id,
    );
    const booking =
      this.store.bookings.find((item) => item.customerId === customer.id) ??
      this.store.bookings.find(
        (item) => item.email.toLowerCase() === normalized,
      );
    const bookingLot = booking?.lotId
      ? this.store.lots.find((lot) => lot.id === booking.lotId)
      : undefined;
    const spaceLots = bookingLot
      ? [...lots, bookingLot].filter(
          (lot, index, all) => all.findIndex((item) => item.id === lot.id) === index,
        )
      : lots;
    const monthlyRate =
      lease?.monthlyRent ??
      booking?.monthlyRate ??
      (spaceLots.length
        ? spaceLots.reduce((sum, lot) => sum + lot.monthlyRate, 0)
        : null);

    return {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      gateCode: customer.gateCode,
      yardName: property?.name ?? '',
      yardAddress: property
        ? `${property.address}, ${property.city}`
        : '',
      monthlyRate,
      spaces: spaceLots.map((lot) => lot.number),
      leaseStart: lease?.startDate ?? customer.leaseStart ?? booking?.leaseStart ?? '',
      booking: booking
        ? {
            reference: booking.id,
            companyName: booking.customerName,
            bookedOn: booking.createdAt,
            spaceType: LOT_TYPE_LABELS[booking.lotType],
            spotCount: booking.spotCount ?? null,
            acreSize: booking.acreSize ?? null,
            storing: booking.storageDescription ?? '',
            leaseStart: booking.leaseStart ?? '',
            monthlyRate: booking.monthlyRate ?? null,
            paymentMethod: booking.paymentMethod ?? '',
            decision: booking.decision ?? 'pending',
            vehicles: booking.vehicles ?? [],
          }
        : null,
    };
  }

  async portalResetPassword(body: { email: string }) {
    const email = body.email.trim().toLowerCase();
    const quiet = {
      ok: true,
      message: 'If that email is on file, a reset link was sent.',
    };
    const customer = this.store.customers.find(
      (c) => c.email.toLowerCase() === email,
    );
    if (!customer) return quiet;

    const previousToken = customer.portalInviteToken;
    const previousExpires = customer.portalInviteExpiresAt;
    const previousPassword = customer.portalPassword;
    const token = randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    customer.portalInviteToken = token;
    customer.portalInviteExpiresAt = expires.toISOString();
    customer.portalPassword = undefined;

    const appUrl = (
      process.env.APP_URL || 'https://pms.paddockparking.com'
    ).replace(/\/$/, '');
    try {
      await sendPortalInviteEmail({
        to: customer.email,
        name: customer.contactName || customer.name,
        inviteUrl: `${appUrl}/portal?token=${encodeURIComponent(token)}&email=${encodeURIComponent(customer.email)}`,
        expiresAt: expires,
      });
      const booking = this.store.bookings.find((b) => b.customerId === customer.id);
      if (booking) booking.portalStatus = 'invited';
    } catch (err) {
      customer.portalInviteToken = previousToken;
      customer.portalInviteExpiresAt = previousExpires;
      customer.portalPassword = previousPassword;
      console.error('[mail] portal reset failed', err);
    }
    return quiet;
  }

  upsertCertificate(customerId: string, dto: UpsertCoiDto) {
    const customer = this.store.customers.find((c) => c.id === customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    let coi = this.store.certificates.find((c) => c.customerId === customerId);
    if (!coi) {
      coi = {
        id: `coi${Date.now()}`,
        customerId,
        propertyId: customer.propertyId,
        carrier: dto.carrier,
        policyNumber: dto.policyNumber,
        effectiveDate: dto.effectiveDate,
        expirationDate: dto.expirationDate,
        additionalInsuredName: dto.additionalInsuredName,
        notes: dto.notes,
        documentId: dto.documentId,
      };
      this.store.certificates.unshift(coi);
    } else {
      coi.carrier = dto.carrier;
      coi.policyNumber = dto.policyNumber;
      coi.effectiveDate = dto.effectiveDate;
      coi.expirationDate = dto.expirationDate;
      coi.additionalInsuredName = dto.additionalInsuredName;
      if (dto.notes !== undefined) coi.notes = dto.notes;
      if (dto.documentId !== undefined) coi.documentId = dto.documentId;
      coi.propertyId = customer.propertyId;
    }

    return this.detail(customer).certificate;
  }

  uploadDocument(customerId: string, dto: UploadDocumentDto) {
    const customer = this.store.customers.find((c) => c.id === customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const raw = dto.contentBase64.includes(',')
      ? dto.contentBase64.split(',')[1]!
      : dto.contentBase64;
    const buffer = Buffer.from(raw, 'base64');
    const safeName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const id = `d${Date.now()}`;
    const storageName = `${customerId}_${id}_${safeName}`;
    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });
    writeFileSync(join(uploadsDir, storageName), buffer);

    const doc: CustomerDocument = {
      id,
      name: dto.fileName,
      kind: dto.kind,
      uploadedAt: new Date().toISOString().slice(0, 10),
      sizeKb: Math.max(1, Math.round(buffer.length / 1024)),
      storagePath: storageName,
    };
    customer.documents.unshift(doc);

    if (dto.kind === 'insurance') {
      const coi = this.store.certificates.find(
        (c) => c.customerId === customerId,
      );
      if (coi) coi.documentId = doc.id;
    }
    if (dto.kind === 'lease') {
      const lease = this.store.leases.find(
        (l) => l.direction === 'tenant' && l.customerId === customerId,
      );
      if (lease) lease.signedDocId = doc.id;
    }

    return doc;
  }

  private detail(customer: (typeof this.store.customers)[number]) {
    const property = this.store.properties.find(
      (p) => p.id === customer.propertyId,
    );
    const lots = this.store.lots
      .filter((l) => customer.lotIds.includes(l.id))
      .map((l) => ({
        ...l,
        lotTypeLabel: LOT_TYPE_LABELS[l.lotType],
        customerName: customer.name,
      }));
    const invoices = this.store.invoices.filter(
      (i) => i.customerId === customer.id,
    );
    const payments = this.store.payments.filter(
      (p) => p.customerId === customer.id,
    );
    const lease = this.store.leases.find(
      (l) => l.direction === 'tenant' && l.customerId === customer.id,
    );
    const coi = this.store.certificates.find(
      (c) => c.customerId === customer.id,
    );
    const coiEval = evaluateCoi(coi, property);
    customer.insuranceOk = coiEval.status === 'valid';
    const { portalPassword: _pw, portalInviteToken: _tok, ...safe } = customer;

    return {
      ...safe,
      insuranceOk: customer.insuranceOk,
      property,
      lots,
      invoices,
      payments,
      lease: lease
        ? {
            ...lease,
            daysToRenewal: lease.renewalDate
              ? daysUntil(lease.renewalDate)
              : null,
            noticeDue: isRenewalNoticeDue(lease),
            urgency: renewalUrgency(lease),
            notifyByDate:
              lease.renewalDate && lease.notificationLeadDays != null
                ? shiftDate(lease.renewalDate, -lease.notificationLeadDays)
                : undefined,
          }
        : undefined,
      certificate: this.enrichCertificate(coi, coiEval),
    };
  }

  private enrichCertificate(
    coi: CertificateOfInsurance | undefined,
    coiEval: ReturnType<typeof evaluateCoi>,
  ) {
    if (!coi) {
      return {
        status: coiEval.status,
        matchesEntity: false,
        requiredAdditionalInsured: coiEval.requiredAdditionalInsured,
        daysToExpiry: null,
      };
    }
    return { ...coi, ...coiEval };
  }

  private summary(c: (typeof this.store.customers)[number]) {
    const lots = this.store.lots.filter((l) => c.lotIds.includes(l.id));
    const property = this.store.properties.find((p) => p.id === c.propertyId);
    const coi = this.store.certificates.find((x) => x.customerId === c.id);
    const coiEval = evaluateCoi(coi, property);
    c.insuranceOk = coiEval.status === 'valid';

    const { portalPassword: _pw, portalInviteToken: _tok, ...safe } = c;
    return {
      ...safe,
      /** Greta “Added” — fall back to lease start when seed has no createdAt */
      createdAt: c.createdAt ?? c.leaseStart,
      insuranceOk: c.insuranceOk,
      coiStatus: coiEval.status,
      lotNumbers: lots.map((l) => l.number),
      hasAssignedLot: lots.length > 0,
    };
  }
}

function shiftDate(iso: string, deltaDays: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
