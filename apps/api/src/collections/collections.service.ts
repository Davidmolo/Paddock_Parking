import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type {
  CollectionAccount,
  CollectionStage,
} from '../data/seed.js';
import type { PatchCollectionDto } from './dto/patch-collection.dto.js';

export type AgingBucketKey =
  | 'current'
  | '1_15'
  | '16_30'
  | '31_60'
  | '60_plus';

export const AGING_BUCKETS: {
  key: AgingBucketKey;
  label: string;
  totalLabel: string;
}[] = [
  { key: 'current', label: 'Current', totalLabel: 'Total Current' },
  { key: '1_15', label: '1 - 15', totalLabel: 'Total 1 - 15' },
  { key: '16_30', label: '16 - 30', totalLabel: 'Total 16 - 30' },
  { key: '31_60', label: '31 - 60', totalLabel: 'Total 31 - 60' },
  { key: '60_plus', label: '> 60', totalLabel: 'Total > 60' },
];

export function agingBucket(daysOverdue: number): AgingBucketKey {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 15) return '1_15';
  if (daysOverdue <= 30) return '16_30';
  if (daysOverdue <= 60) return '31_60';
  return '60_plus';
}

@Injectable()
export class CollectionsService {
  constructor(private readonly store: DataStoreService) {}

  findAll(propertyId?: string, queue?: CollectionAccount['queue']) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    let accounts = [...this.store.collections];
    if (filterId) {
      accounts = accounts.filter((a) => a.propertyId === filterId);
    }
    if (queue) {
      accounts = accounts.filter((a) => a.queue === queue);
    }

    accounts.sort((a, b) => {
      const bucketDiff =
        bucketOrder(agingBucket(a.daysOverdue)) -
        bucketOrder(agingBucket(b.daysOverdue));
      if (bucketDiff !== 0) return bucketDiff;
      return a.customerName.localeCompare(b.customerName);
    });

    const yardSource = filterId
      ? this.store.properties.filter((p) => p.id === filterId)
      : this.store.properties;

    const yards = yardSource.map((property) => {
      const yardAccounts = this.store.collections.filter(
        (a) => a.propertyId === property.id,
      );
      return {
        propertyId: property.id,
        name: property.name,
        address: property.address,
        balance: yardAccounts.reduce((s, a) => s + a.balance, 0),
        invoiceCount: yardAccounts.reduce((s, a) => s + a.invoiceCount, 0),
      };
    });

    const sections = AGING_BUCKETS.map((bucket) => {
      const rows = accounts.filter(
        (a) => agingBucket(a.daysOverdue) === bucket.key,
      );
      return {
        key: bucket.key,
        label: bucket.label,
        totalLabel: bucket.totalLabel,
        balance: rows.reduce((s, a) => s + a.balance, 0),
        accounts: rows.map((a) => this.enrich(a)),
      };
    });

    const openBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const totals = {
      openBalance,
      accounts: accounts.length,
      atRisk: accounts
        .filter((a) => a.daysOverdue > 60)
        .reduce((s, a) => s + a.balance, 0),
      emails: accounts.filter((a) => a.queue === 'need_email').length,
    };

    return {
      yards,
      totals,
      sections,
      accounts: accounts.map((a) => this.enrich(a)),
      asOf: new Date().toISOString().slice(0, 10),
      intervalLabel: '15 / 30 days',
      throughLabel: '60+ days',
    };
  }

  update(id: string, dto: PatchCollectionDto) {
    const account = this.store.collections.find((a) => a.id === id);
    if (!account) {
      throw new NotFoundException(`Collection account ${id} not found`);
    }
    if (dto.queue !== undefined) {
      account.queue = dto.queue;
    }
    if (dto.stage !== undefined) {
      account.stage = dto.stage;
      if (dto.stage === 'payment_made' && account.balance > 0) {
        // Stage only — balance stays until invoice sync; note for ops
        if (!dto.nextAction) {
          account.nextAction = 'Marked payment made — confirm in invoices';
        }
      }
    }
    if (dto.nextAction !== undefined) {
      account.nextAction = dto.nextAction;
    }
    if (dto.logCall) {
      account.calls += 1;
      if (!dto.nextAction) {
        account.nextAction = 'Follow up after call';
      }
      if (!dto.stage && account.stage === 'waiting') {
        account.stage = 'communicated';
      }
    }
    if (dto.logEmail) {
      account.emails += 1;
      if (!dto.queue && account.queue === 'need_email') {
        account.queue = 'need_text';
      }
      if (!dto.stage) {
        account.stage = 'communicated';
      }
      if (!dto.nextAction) {
        account.nextAction = 'Await reply / send text';
      }
    }
    return this.enrich(account);
  }

  /** Demo: log outreach email on every account still in need_email */
  sendEmailsDue(propertyId?: string) {
    const filterId =
      propertyId && propertyId !== 'all' ? propertyId : undefined;
    const touched: CollectionAccount[] = [];
    for (const account of this.store.collections) {
      if (filterId && account.propertyId !== filterId) continue;
      if (account.queue !== 'need_email') continue;
      account.emails += 1;
      account.queue = 'need_text';
      account.stage = 'communicated';
      account.nextAction = 'Await reply / send text';
      touched.push(account);
    }
    return { sent: touched.length, accounts: touched.map((a) => this.enrich(a)) };
  }

  private enrich(account: CollectionAccount) {
    const property = this.store.properties.find(
      (p) => p.id === account.propertyId,
    );
    return {
      ...account,
      propertyName: property?.name ?? account.propertyId,
      agingBucket: agingBucket(account.daysOverdue),
      stageLabel: stageLabel(account.stage),
    };
  }
}

function bucketOrder(key: AgingBucketKey): number {
  return AGING_BUCKETS.findIndex((b) => b.key === key);
}

function stageLabel(stage: CollectionStage): string {
  switch (stage) {
    case 'communicated':
      return 'Communicated';
    case 'waiting':
      return 'Waiting';
    case 'waiting_payment':
      return 'Waiting for payment';
    case 'payment_made':
      return 'Payment made';
    default:
      return stage;
  }
}
