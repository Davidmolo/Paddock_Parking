import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
    return list.map((c) => this.summary(c));
  }

  findOne(id: string) {
    const customer = this.store.customers.find((c) => c.id === id);
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return this.detail(customer);
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

    return {
      ...customer,
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

    return {
      ...c,
      insuranceOk: c.insuranceOk,
      coiStatus: coiEval.status,
      lotNumbers: lots.map((l) => l.number),
      hasAssignedLot: lots.length > 0,
    };
  }
}
