import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import type { CollectionAccount } from '../data/seed.js';
import type { PatchCollectionDto } from './dto/patch-collection.dto.js';

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

    const totals = {
      atRisk: accounts
        .filter((a) => a.balance >= 1000)
        .reduce((s, a) => s + a.balance, 0),
      accounts: accounts.length,
      emails: accounts.filter((a) => a.queue === 'need_email').length,
    };

    return { yards, totals, accounts };
  }

  update(id: string, dto: PatchCollectionDto) {
    const account = this.store.collections.find((a) => a.id === id);
    if (!account) {
      throw new NotFoundException(`Collection account ${id} not found`);
    }
    if (dto.queue !== undefined) {
      account.queue = dto.queue;
    }
    if (dto.nextAction !== undefined) {
      account.nextAction = dto.nextAction;
    }
    if (dto.logCall) {
      account.calls += 1;
      if (!dto.nextAction) {
        account.nextAction = 'Follow up after call';
      }
    }
    if (dto.logEmail) {
      account.emails += 1;
      if (!dto.queue && account.queue === 'need_email') {
        account.queue = 'need_text';
      }
      if (!dto.nextAction) {
        account.nextAction = 'Await reply / send text';
      }
    }
    return account;
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
      account.nextAction = 'Await reply / send text';
      touched.push(account);
    }
    return { sent: touched.length, accounts: touched };
  }
}
