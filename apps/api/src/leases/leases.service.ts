import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type { LeaseDirection } from '../data/seed.js';
import type { PatchLeaseDto } from './dto/patch-lease.dto.js';
import {
  daysUntil,
  isRenewalNoticeDue,
  renewalUrgency,
} from './lease-helpers.js';

@Injectable()
export class LeasesService {
  constructor(private readonly store: DataStoreService) {}

  findAll(propertyId?: string, direction?: LeaseDirection) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let list = this.store.leases;
    if (filterId) list = list.filter((l) => l.propertyId === filterId);
    if (direction) list = list.filter((l) => l.direction === direction);
    return list.map((l) => this.enrich(l));
  }

  findOne(id: string) {
    const lease = this.store.leases.find((l) => l.id === id);
    if (!lease) throw new NotFoundException(`Lease ${id} not found`);
    return this.enrich(lease);
  }

  update(id: string, dto: PatchLeaseDto) {
    const lease = this.store.leases.find((l) => l.id === id);
    if (!lease) throw new NotFoundException(`Lease ${id} not found`);

    if (dto.startDate !== undefined) lease.startDate = dto.startDate;
    if (dto.endDate !== undefined) {
      if (dto.endDate === '') delete lease.endDate;
      else lease.endDate = dto.endDate;
    }
    if (dto.renewalDate !== undefined) {
      if (dto.renewalDate === '') delete lease.renewalDate;
      else lease.renewalDate = dto.renewalDate;
    }
    if (dto.notificationLeadDays !== undefined) {
      lease.notificationLeadDays = dto.notificationLeadDays;
    }
    if (dto.termMonths !== undefined) lease.termMonths = dto.termMonths;
    if (dto.monthlyRent !== undefined) lease.monthlyRent = dto.monthlyRent;
    if (dto.status !== undefined) lease.status = dto.status;
    if (dto.landlordName !== undefined) lease.landlordName = dto.landlordName;
    if (dto.landlordContact !== undefined) {
      lease.landlordContact = dto.landlordContact;
    }
    if (dto.landlordEmail !== undefined) lease.landlordEmail = dto.landlordEmail;
    if (dto.notes !== undefined) lease.notes = dto.notes;

    return this.enrich(lease);
  }

  findRenewalsDue(propertyId?: string) {
    const all = this.findAll(propertyId);
    return all
      .filter((l) => isRenewalNoticeDue(l))
      .sort((a, b) => {
        const da = a.renewalDate ? daysUntil(a.renewalDate) : 9999;
        const db = b.renewalDate ? daysUntil(b.renewalDate) : 9999;
        return da - db;
      });
  }

  summary(propertyId?: string) {
    const leases = this.findAll(propertyId);
    const renewalsDue = leases.filter((l) => isRenewalNoticeDue(l));
    return {
      total: leases.length,
      tenant: leases.filter((l) => l.direction === 'tenant').length,
      landlord: leases.filter((l) => l.direction === 'landlord').length,
      renewalsDue: renewalsDue.length,
      renewalsOverdue: renewalsDue.filter((l) => l.urgency === 'overdue')
        .length,
    };
  }

  private enrich(lease: (typeof this.store.leases)[number]) {
    const property = this.store.properties.find(
      (p) => p.id === lease.propertyId,
    );
    const customer = lease.customerId
      ? this.store.customers.find((c) => c.id === lease.customerId)
      : undefined;
    const daysToRenewal = lease.renewalDate
      ? daysUntil(lease.renewalDate)
      : null;
    const noticeDue = isRenewalNoticeDue(lease);
    const urgency = renewalUrgency(lease);

    return {
      ...lease,
      propertyName: property?.name,
      legalEntityName: property?.legalEntityName,
      partyName:
        lease.direction === 'landlord'
          ? lease.landlordName
          : (customer?.name ?? '—'),
      customerName: customer?.name,
      daysToRenewal,
      noticeDue,
      urgency,
      notifyByDate:
        lease.renewalDate && lease.notificationLeadDays != null
          ? shiftDate(lease.renewalDate, -lease.notificationLeadDays)
          : undefined,
    };
  }
}

function shiftDate(iso: string, deltaDays: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
