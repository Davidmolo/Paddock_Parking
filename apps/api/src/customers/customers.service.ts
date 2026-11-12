import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sendManualInvoiceEmail, sendPortalInviteEmail } from '../mail/send-portal-invite.js';
import { DataStoreService } from '../data/data-store.service.js';
import type { CertificateOfInsurance, Customer, CustomerDocument } from '../data/seed.js';
import { LOT_TYPE_LABELS } from '../data/seed.js';
import {
  daysUntil,
  evaluateCoi,
  isRenewalNoticeDue,
  renewalUrgency,
} from '../leases/lease-helpers.js';
import type { UpsertCoiDto } from './dto/upsert-coi.dto.js';
import type { UploadDocumentDto } from './dto/upload-document.dto.js';
import { readCoiPdf, type ReadCoi } from './read-coi.js';

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

  /** Tenant portal — set password from the invite link, then the portal can open. */
  portalSetPassword(body: {
    email: string;
    password: string;
    inviteToken: string;
  }) {
    const email = body.email.trim().toLowerCase();
    const customer = this.store.customers.find(
      (c) => c.email.toLowerCase() === email,
    );
    if (!customer) {
      throw new NotFoundException('No customer found for that email.');
    }
    const expired =
      !!customer.portalInviteExpiresAt &&
      Date.parse(customer.portalInviteExpiresAt) < Date.now();
    if (
      !body.inviteToken ||
      !customer.portalInviteToken ||
      body.inviteToken !== customer.portalInviteToken ||
      expired
    ) {
      throw new BadRequestException('Invite link is invalid or expired.');
    }
    if (!body.password || body.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }
    customer.portalPassword = body.password;
    customer.portalInviteToken = undefined;
    customer.portalInviteExpiresAt = undefined;
    customer.portalLastLogin = new Date().toISOString();
    const booking = this.store.bookings.find((b) => b.customerId === customer.id);
    if (booking) booking.portalStatus = 'active';
    return {
      ok: true,
      message: 'Password set. You can sign in to the customer portal.',
      name: customer.name,
      email: customer.email,
      gateCode: customer.gateCode ?? '',
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
    const lots = this.store.lots.filter(
      (lot) =>
        lot.customerId === customer.id || customer.lotIds.includes(lot.id),
    );
    const lease = this.store.leases.find(
      (item) =>
        item.direction === 'tenant' && item.customerId === customer.id,
    );
    const booking = this.portalBooking(customer);
    const bill = this.billing(customer);
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
      daysHere: startedDays(lease?.startDate ?? customer.leaseStart ?? booking?.leaseStart),
      daysLeft: remainingDays(lease?.endDate ?? lease?.renewalDate),
      contactName: customer.contactName,
      balanceDue: this.store.invoices.some((invoice) => invoice.customerId === customer.id)
        ? this.store.invoices
            .filter((invoice) => invoice.customerId === customer.id)
            .reduce((sum, invoice) => sum + invoice.balance, 0)
        : customer.balanceDue,
      paymentStatus: this.store.invoices.some(
        (invoice) => invoice.customerId === customer.id && invoice.status === 'overdue',
      )
        ? 'past_due'
        : customer.paymentStatus,
      securityDeposit: customer.securityDeposit,
      achEnabled: customer.achEnabled,
      autoPull: bill.autoPull,
      payMethod: bill.payMethod,
      contractType:
        lease?.endDate || lease?.termMonths
          ? 'fixed'
          : lease
            ? 'month_to_month'
            : customer.contractType,
      renewalDate:
        lease?.endDate ?? lease?.renewalDate ?? customer.leaseEnd ?? '',
      termMonths: lease?.termMonths ?? null,
      legalEntityName: property?.legalEntityName ?? '',
      insuranceStatus: evaluateCoi(
        this.store.certificates.find((item) => item.customerId === customer.id),
        property,
      ).status,
      plots: spaceLots.map((lot) => ({ number: lot.number, size: lot.size })),
      documents: customer.documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        kind: doc.kind,
        uploadedAt: doc.uploadedAt,
        storagePath: doc.storagePath ?? '',
      })),
      payments: this.store.payments
        .filter((payment) => payment.customerId === customer.id)
        .map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          paidAt: payment.paidAt,
          reference: payment.reference ?? '',
        })),
      owedPlates: (booking?.vehicles ?? []).flatMap((vehicle, index) =>
        vehicle.submitLater || !vehicle.licensePlate.trim()
          ? [{ index, truckNumber: vehicle.truckNumber, make: vehicle.make }]
          : [],
      ),
      docsOwed:
        Boolean(booking?.docsSubmitLater) ||
        !customer.documents.some((doc) => doc.kind === 'insurance'),
      invoices: this.store.invoices
        .filter((invoice) => invoice.customerId === customer.id)
        .map((invoice) => ({
          id: invoice.id,
          amount: invoice.amount,
          balance: invoice.balance,
          status: invoice.status,
          dueDate: invoice.dueDate,
          issuedAt: invoice.issuedAt,
          collectionMethod: bill.autoPull ? 'ach_debit' : 'send_invoice',
        })),
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
      signedLease:
        booking?.lesseeSignature
          ? {
              lesseeName: booking.lesseeName ?? '',
              lesseeSignature: booking.lesseeSignature,
              guarantorName: booking.guarantorName ?? '',
              guarantorSignature: booking.guarantorSignature ?? '',
              signatureDate: booking.signatureDate ?? '',
            }
          : null,
    };
  }

  portalSavePlates(body: {
    email: string;
    plates: { index: number; licensePlate: string }[];
  }) {
    const customer = this.portalCustomer(body.email);
    const booking = this.portalBooking(customer);
    const vehicles = booking?.vehicles ?? [];
    const owed = vehicles.flatMap((vehicle, index) =>
      vehicle.submitLater || !vehicle.licensePlate.trim() ? [index] : [],
    );
    if (!booking || owed.length === 0) {
      throw new BadRequestException('No plates are waiting.');
    }
    const byIndex = new Map(
      body.plates.map((plate) => [plate.index, plate.licensePlate.trim()]),
    );
    if (byIndex.size !== owed.length || owed.some((index) => !byIndex.get(index))) {
      throw new BadRequestException('Enter the plate for every truck.');
    }
    for (const index of owed) {
      const vehicle = vehicles[index];
      if (!vehicle) throw new NotFoundException('That vehicle is not on this account.');
      vehicle.licensePlate = byIndex.get(index)!;
      vehicle.submitLater = false;
    }
    return this.portalHome(customer.email);
  }

  portalPay(body: {
    email: string;
    invoiceId: string;
    amount: number;
    method: 'card' | 'ach';
    last4: string;
  }) {
    const customer = this.portalCustomer(body.email);
    if (this.billing(customer).autoPull) {
      throw new BadRequestException('Autopull is on. Pay is not available.');
    }
    if (!/^\d{4}$/.test(body.last4)) {
      throw new BadRequestException('Enter the card or account number.');
    }
    const invoice = this.store.invoices.find(
      (item) => item.id === body.invoiceId && item.customerId === customer.id,
    );
    if (!invoice) throw new NotFoundException('That invoice is not on this account.');
    const amount = Math.round(body.amount * 100);
    const balance = Math.round(invoice.balance * 100);
    if (amount <= 0 || amount > balance) {
      throw new BadRequestException('Enter an amount up to the balance.');
    }
    const today = new Date().toISOString().slice(0, 10);
    const declined = body.last4 === '9995';
    this.store.payments.unshift({
      id: `pay${Date.now()}`,
      customerId: customer.id,
      amount: amount / 100,
      method: body.method,
      status: declined ? 'failed' : 'cleared',
      paidAt: today,
      reference: invoice.id,
    });
    if (!declined) {
      invoice.balance = (balance - amount) / 100;
      invoice.status = invoice.balance === 0
        ? 'paid'
        : invoice.dueDate < today
          ? 'overdue'
          : 'partial';
    }
    const rows = this.store.invoices.filter((item) => item.customerId === customer.id);
    customer.balanceDue = rows.reduce((sum, item) => sum + item.balance, 0);
    customer.paymentStatus = rows.some((item) => item.status === 'overdue' && item.balance > 0)
      ? 'past_due'
      : 'current';
    return {
      result: declined ? 'declined' as const : invoice.balance === 0 ? 'paid' as const : 'partial' as const,
      paid: declined ? 0 : amount / 100,
      stillDue: invoice.balance,
      home: this.portalHome(customer.email),
    };
  }

  portalUploadDocument(body: {
    email: string;
    fileName: string;
    kind: 'lease' | 'insurance' | 'other';
    contentBase64: string;
  }) {
    const customer = this.portalCustomer(body.email);
    this.uploadDocument(customer.id, body);
    if (body.kind === 'insurance') {
      for (const booking of this.store.bookings) {
        const same =
          booking.customerId === customer.id ||
          booking.email.toLowerCase() === customer.email.toLowerCase();
        if (same) booking.docsSubmitLater = false;
      }
    }
    return this.portalHome(customer.email);
  }

  setBilling(id: string, body: { autoPull?: boolean; payMethod?: 'card' | 'ach' }) {
    const customer = this.store.customers.find((item) => item.id === id);
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    const booking = this.store.bookings.find((item) => item.customerId === customer.id);
    if (body.payMethod) {
      customer.payMethod = body.payMethod;
      customer.achEnabled = body.payMethod === 'ach';
      if (booking) booking.paymentMethod = body.payMethod;
    }
    if (body.autoPull != null) {
      customer.autoPull = body.autoPull;
      if (booking) booking.autoPullWaived = !body.autoPull;
      this.markInvoices(customer, body.autoPull ? 'ach_debit' : 'send_invoice');
    }
    return this.detail(customer);
  }

  async sendInvoices(id: string) {
    const customer = this.store.customers.find((item) => item.id === id);
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    if (this.billing(customer).autoPull) {
      throw new BadRequestException('Turn autopull off before sending an invoice.');
    }
    const open = this.store.invoices.filter(
      (invoice) => invoice.customerId === customer.id && invoice.balance > 0,
    );
    if (open.length === 0) {
      throw new BadRequestException('Nothing is due on this account.');
    }
    this.markInvoices(customer, 'send_invoice');
    const portalUrl = `${process.env.APP_URL || 'http://localhost:3000'}/portal`;
    await sendManualInvoiceEmail({
      to: customer.email,
      name: customer.name,
      portalUrl,
      lines: open.map((invoice) => `${invoice.id} due ${invoice.dueDate}: $${invoice.balance.toFixed(2)}`),
    });
    return this.detail(customer);
  }

  private billing(customer: Customer) {
    const booking = this.store.bookings.find((item) => item.customerId === customer.id);
    const payMethod =
      customer.payMethod ??
      (booking?.paymentMethod === 'card' || booking?.paymentMethod === 'ach'
        ? booking.paymentMethod
        : customer.achEnabled
          ? 'ach'
          : 'card');
    const autoPull =
      customer.autoPull ??
      (booking ? !booking.autoPullWaived && booking.autoPullAgreed !== false : customer.achEnabled);
    return { payMethod, autoPull };
  }

  private markInvoices(customer: Customer, method: 'ach_debit' | 'send_invoice') {
    for (const invoice of this.store.invoices) {
      if (invoice.customerId === customer.id && invoice.balance > 0) {
        invoice.collectionMethod = method;
      }
    }
  }

  private portalCustomer(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      throw new BadRequestException('Email is required.');
    }
    const customer = this.store.customers.find(
      (item) => item.email.toLowerCase() === normalized,
    );
    if (!customer) throw new NotFoundException('No customer found for that email.');
    return customer;
  }

  private portalBooking(customer: { id: string; email: string }) {
    const email = customer.email.toLowerCase();
    return (
      this.store.bookings.find((item) => item.customerId === customer.id) ??
      this.store.bookings.find((item) => item.email.toLowerCase() === email)
    );
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
      process.env.APP_URL || 'https://www.phoenixstorageyards.com'
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
      if (buffer.subarray(0, 5).toString() === '%PDF-') {
        try {
          this.mergeCoi(customer, doc.id, await readCoiPdf(buffer));
        } catch {
          // The file is saved. Staff type whatever the PDF did not yield.
        }
      }
    }
    if (dto.kind === 'lease') {
      const lease = this.store.leases.find(
        (l) => l.direction === 'tenant' && l.customerId === customerId,
      );
      if (lease) lease.signedDocId = doc.id;
    }

    return doc;
  }

  private mergeCoi(customer: Customer, documentId: string, read: ReadCoi) {
    const fields = Object.entries(read).filter((entry) => entry[1]);
    if (fields.length === 0) return;
    let coi = this.store.certificates.find((item) => item.customerId === customer.id);
    if (!coi) {
      coi = {
        id: `coi${Date.now()}`,
        customerId: customer.id,
        propertyId: customer.propertyId,
        carrier: '',
        policyNumber: '',
        effectiveDate: '',
        expirationDate: '',
        additionalInsuredName: '',
        documentId,
      };
      this.store.certificates.unshift(coi);
    }
    if (read.carrier) coi.carrier = read.carrier;
    if (read.policyNumber) coi.policyNumber = read.policyNumber;
    if (read.effectiveDate) coi.effectiveDate = read.effectiveDate;
    if (read.expirationDate) coi.expirationDate = read.expirationDate;
    if (read.additionalInsuredName) coi.additionalInsuredName = read.additionalInsuredName;
    coi.documentId = documentId;
    coi.propertyId = customer.propertyId;
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
    const bill = this.billing(customer);

    return {
      ...safe,
      autoPull: bill.autoPull,
      payMethod: bill.payMethod,
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

function startedDays(start: string | undefined) {
  if (!start) return null;
  const until = daysUntil(start);
  return until > 0 ? 0 : -until;
}

function remainingDays(end: string | undefined) {
  if (!end) return null;
  return daysUntil(end);
}
