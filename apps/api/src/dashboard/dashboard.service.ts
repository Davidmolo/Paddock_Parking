import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';
import {
  evaluateCoi,
  isRenewalNoticeDue,
} from '../leases/lease-helpers.js';

@Injectable()
export class DashboardService {
  constructor(private readonly store: DataStoreService) {}

  getSummary(propertyId?: string) {
    const props = propertyId
      ? this.store.properties.filter((p) => p.id === propertyId)
      : this.store.properties;

    const properties = props.map((p) => {
      const yardLots = this.store.lots.filter((l) => l.propertyId === p.id);
      const occupied = yardLots.filter((l) => l.status === 'occupied').length;
      const available = yardLots.filter((l) => l.status === 'available').length;
      const reserved = yardLots.filter((l) => l.status === 'reserved').length;
      const metrics = this.store.propertyMetrics[p.id] ?? {
        revenue30d: 0,
        projectedMonthly: 0,
        outstandingDue: 0,
        overdue: 0,
        overdueInvoices: 0,
        revenueTrend: [0, 0, 0, 0, 0, 0],
      };
      const tenants = this.store.customers.filter(
        (c) => c.propertyId === p.id && c.isActive,
      );
      const goodStanding = tenants.filter(
        (c) => c.paymentStatus === 'current',
      ).length;

      return {
        id: p.id,
        name: p.name,
        address: `${p.address}, ${p.city}`,
        legalEntityName: p.legalEntityName,
        occupancy:
          yardLots.length > 0
            ? Math.round((occupied / yardLots.length) * 1000) / 10
            : 0,
        inventory: {
          occupied,
          available,
          reserved,
          total: yardLots.length,
          availableSpots: yardLots
            .filter((l) => l.status === 'available')
            .map((l) => `#${l.number}`),
        },
        money: {
          revenue30d: metrics.revenue30d,
          projectedMonthly: metrics.projectedMonthly,
          outstandingDue: metrics.outstandingDue,
          overdue: metrics.overdue,
          overdueInvoices: metrics.overdueInvoices,
        },
        tenantHealth: {
          totalActive: tenants.length,
          goodStandingPct:
            tenants.length > 0
              ? Math.round((goodStanding / tenants.length) * 1000) / 10
              : 0,
          pastDue: tenants.filter((c) => c.paymentStatus === 'past_due')
            .length,
          notice: tenants.filter((c) => c.paymentStatus === 'notice').length,
        },
        revenueTrend: metrics.revenueTrend,
      };
    });

    const totals = properties.reduce(
      (acc, p) => {
        acc.revenue30d += p.money.revenue30d;
        acc.projectedMonthly += p.money.projectedMonthly;
        acc.outstandingDue += p.money.outstandingDue;
        acc.overdue += p.money.overdue;
        acc.occupied += p.inventory.occupied;
        acc.available += p.inventory.available;
        acc.totalLots += p.inventory.total;
        acc.tenants += p.tenantHealth.totalActive;
        return acc;
      },
      {
        revenue30d: 0,
        projectedMonthly: 0,
        outstandingDue: 0,
        overdue: 0,
        occupied: 0,
        available: 0,
        totalLots: 0,
        tenants: 0,
      },
    );

    const renewalsDue = this.store.leases.filter((l) =>
      isRenewalNoticeDue(l),
    ).length;
    const coiIssues = this.store.customers.filter((c) => {
      if (!c.isActive) return false;
      const property = this.store.properties.find((p) => p.id === c.propertyId);
      const coi = this.store.certificates.find((x) => x.customerId === c.id);
      const status = evaluateCoi(coi, property).status;
      return status !== 'valid';
    }).length;

    return {
      totals,
      properties,
      newBookings: this.store.bookings.filter((b) => b.status === 'new').length,
      renewalsDue,
      coiIssues,
    };
  }
}
