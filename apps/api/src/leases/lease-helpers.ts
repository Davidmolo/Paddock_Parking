import type {
  CertificateOfInsurance,
  CoiStatus,
  Lease,
  Property,
} from '../data/seed.js';

export function daysUntil(isoDate: string, today = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / 86_400_000);
}

/** True when we are inside the contract's required notice window before renewal */
export function isRenewalNoticeDue(lease: Lease, today = new Date()): boolean {
  if (!lease.renewalDate || lease.status !== 'active') return false;
  const days = daysUntil(lease.renewalDate, today);
  return days <= lease.notificationLeadDays;
}

export function renewalUrgency(
  lease: Lease,
  today = new Date(),
): 'overdue' | 'due' | 'upcoming' | 'ok' {
  if (!lease.renewalDate || lease.status !== 'active') return 'ok';
  const days = daysUntil(lease.renewalDate, today);
  if (days < 0) return 'overdue';
  if (days <= lease.notificationLeadDays) return 'due';
  if (days <= lease.notificationLeadDays + 30) return 'upcoming';
  return 'ok';
}

export function evaluateCoi(
  coi: CertificateOfInsurance | undefined,
  property: Property | undefined,
  today = new Date(),
): {
  status: CoiStatus;
  matchesEntity: boolean;
  requiredAdditionalInsured: string;
  daysToExpiry: number | null;
} {
  const required = property?.legalEntityName ?? '';
  if (!coi) {
    return {
      status: 'missing',
      matchesEntity: false,
      requiredAdditionalInsured: required,
      daysToExpiry: null,
    };
  }

  const matchesEntity =
    normalizeEntity(coi.additionalInsuredName) === normalizeEntity(required);
  const daysToExpiry = daysUntil(coi.expirationDate, today);

  if (daysToExpiry < 0) {
    return {
      status: 'expired',
      matchesEntity,
      requiredAdditionalInsured: required,
      daysToExpiry,
    };
  }
  if (!matchesEntity) {
    return {
      status: 'mismatch',
      matchesEntity,
      requiredAdditionalInsured: required,
      daysToExpiry,
    };
  }
  if (daysToExpiry <= 30) {
    return {
      status: 'expiring',
      matchesEntity,
      requiredAdditionalInsured: required,
      daysToExpiry,
    };
  }
  return {
    status: 'valid',
    matchesEntity,
    requiredAdditionalInsured: required,
    daysToExpiry,
  };
}

function normalizeEntity(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
