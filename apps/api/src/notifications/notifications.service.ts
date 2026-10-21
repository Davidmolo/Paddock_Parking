import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type {
  NotificationChannel,
  OpsNotification,
} from '../data/seed.js';
import {
  evaluateCoi,
  isRenewalNoticeDue,
} from '../leases/lease-helpers.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly store: DataStoreService) {}

  findAll(
    status?: OpsNotification['status'],
    propertyId?: string,
  ) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let list = [...this.store.notifications];
    if (status) list = list.filter((n) => n.status === status);
    if (filterId) list = list.filter((n) => n.propertyId === filterId);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  summary(propertyId?: string) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    const all = filterId
      ? this.store.notifications.filter((n) => n.propertyId === filterId)
      : this.store.notifications;
    return {
      pending: all.filter((n) => n.status === 'pending').length,
      sent: all.filter((n) => n.status === 'sent').length,
      failed: all.filter((n) => n.status === 'failed').length,
    };
  }

  /** Build pending notices from renewals-due + COI issues (skips existing fingerprints) */
  generate(propertyId?: string) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    const created: OpsNotification[] = [];
    const now = new Date().toISOString();
    const existing = new Set(
      this.store.notifications
        .filter((n) => n.status !== 'failed')
        .map((n) => n.dedupeKey),
    );

    for (const lease of this.store.leases) {
      if (filterId && lease.propertyId !== filterId) continue;
      if (!isRenewalNoticeDue(lease)) continue;

      const property = this.store.properties.find(
        (p) => p.id === lease.propertyId,
      );
      if (lease.direction === 'landlord') {
        const dedupeKey = `lease_renewal:${lease.id}:email`;
        if (existing.has(dedupeKey)) continue;
        const n = this.push({
          dedupeKey,
          kind: 'lease_renewal',
          channel: 'email',
          propertyId: lease.propertyId,
          leaseId: lease.id,
          toName: lease.landlordName ?? 'Landlord',
          toAddress: lease.landlordEmail || 'landlord@example.com',
          subject: `Lease renewal notice — ${property?.name ?? 'yard'}`,
          body: [
            `Hello ${lease.landlordContact ?? lease.landlordName ?? ''},`,
            '',
            `This is a required notice regarding the ground lease at ${property?.name}.`,
            `Renewal date: ${lease.renewalDate}`,
            `Contract requires notice ${lease.notificationLeadDays} days before renewal.`,
            '',
            'Please confirm renewal terms with Paddock Parking.',
            '',
            '— Paddock Parking ops',
          ].join('\n'),
          createdAt: now,
        });
        existing.add(dedupeKey);
        created.push(n);
      } else if (lease.customerId) {
        const customer = this.store.customers.find(
          (c) => c.id === lease.customerId,
        );
        if (!customer) continue;
        for (const channel of ['email', 'sms'] as NotificationChannel[]) {
          const addr = channel === 'email' ? customer.email : customer.phone;
          if (!addr) continue;
          const dedupeKey = `lease_renewal:${lease.id}:${channel}`;
          if (existing.has(dedupeKey)) continue;
          const n = this.push({
            dedupeKey,
            kind: 'lease_renewal',
            channel,
            propertyId: lease.propertyId,
            leaseId: lease.id,
            customerId: customer.id,
            toName: customer.name,
            toAddress: addr,
            subject: `Lease renewal — ${property?.name ?? 'your yard'}`,
            body:
              channel === 'email'
                ? [
                    `Hello ${customer.contactName},`,
                    '',
                    `Your lease at ${property?.name} is approaching renewal (${lease.renewalDate}).`,
                    `Per your agreement we are notifying you ${lease.notificationLeadDays} days in advance.`,
                    '',
                    'Reply to confirm renewal or discuss changes.',
                    '',
                    '— Paddock Parking',
                  ].join('\n')
                : `Paddock Parking: lease renewal notice for ${property?.name}. Renewal ${lease.renewalDate}. Reply to confirm.`,
            createdAt: now,
          });
          existing.add(dedupeKey);
          created.push(n);
        }
      }
    }

    for (const customer of this.store.customers) {
      if (!customer.isActive) continue;
      if (filterId && customer.propertyId !== filterId) continue;
      const property = this.store.properties.find(
        (p) => p.id === customer.propertyId,
      );
      const coi = this.store.certificates.find(
        (c) => c.customerId === customer.id,
      );
      const evald = evaluateCoi(coi, property);
      if (evald.status === 'valid') continue;

      const reason =
        evald.status === 'missing'
          ? 'We do not have a current Certificate of Insurance on file.'
          : evald.status === 'expired'
            ? 'Your Certificate of Insurance has expired.'
            : evald.status === 'expiring'
              ? 'Your Certificate of Insurance expires soon.'
              : `Your COI additional insured must list "${evald.requiredAdditionalInsured}" (currently mismatched).`;

      for (const channel of ['email', 'sms'] as NotificationChannel[]) {
        const addr = channel === 'email' ? customer.email : customer.phone;
        if (!addr) continue;
        const dedupeKey = `coi_issue:${customer.id}:${evald.status}:${channel}`;
        if (existing.has(dedupeKey)) continue;
        const n = this.push({
          dedupeKey,
          kind: 'coi_issue',
          channel,
          propertyId: customer.propertyId,
          customerId: customer.id,
          toName: customer.name,
          toAddress: addr,
          subject: `COI required — ${property?.name ?? 'Paddock Parking'}`,
          body:
            channel === 'email'
              ? [
                  `Hello ${customer.contactName},`,
                  '',
                  reason,
                  '',
                  `Please send an updated Certificate of Insurance listing ${evald.requiredAdditionalInsured} as additional insured.`,
                  '',
                  '— Paddock Parking',
                ].join('\n')
              : `Paddock Parking: ${reason} COI must list ${evald.requiredAdditionalInsured}.`,
          createdAt: now,
        });
        existing.add(dedupeKey);
        created.push(n);
      }
    }

    return { created: created.length, items: created };
  }

  send(id: string) {
    const note = this.store.notifications.find((n) => n.id === id);
    if (!note) throw new NotFoundException(`Notification ${id} not found`);

    // Demo provider — log + mark sent. Swap for SendGrid / Twilio later.
    note.status = 'sent';
    note.sentAt = new Date().toISOString();
    delete note.error;
    console.log(
      `[notify:${note.channel}] to=${note.toAddress} subject=${note.subject}`,
    );
    return note;
  }

  sendAllPending() {
    const pending = this.store.notifications.filter(
      (n) => n.status === 'pending',
    );
    return pending.map((n) => this.send(n.id));
  }

  private push(
    input: Omit<OpsNotification, 'id' | 'status'> & { dedupeKey: string },
  ) {
    const note: OpsNotification = {
      id: `nt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'pending',
      ...input,
    };
    this.store.notifications.unshift(note);
    return note;
  }
}
