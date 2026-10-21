"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, CalendarPlus, ScrollText, ShieldAlert } from "lucide-react";
import { endpoints } from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniTrend } from "@/components/mini-trend";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const { propertyId } = useApp();
  const { data, isPending } = useQuery({
    queryKey: queryKeys.dashboard(propertyId),
    queryFn: () => endpoints.dashboard(propertyParam(propertyId)),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        subtitle="Each yard’s money, occupancy, and open spots — the rundown David wants at login."
        action={
          <div className="flex flex-wrap gap-2">
            {data && data.renewalsDue > 0 && (
              <Link href="/leases">
                <Button variant="secondary">
                  <ScrollText className="h-4 w-4" />
                  {data.renewalsDue} lease renewals
                </Button>
              </Link>
            )}
            {data && data.coiIssues > 0 && (
              <Link href="/customers">
                <Button variant="secondary">
                  <ShieldAlert className="h-4 w-4" />
                  {data.coiIssues} COI issues
                </Button>
              </Link>
            )}
            {data && data.newBookings > 0 && (
              <Link href="/bookings">
                <Button variant="secondary">
                  <CalendarPlus className="h-4 w-4" />
                  {data.newBookings} new bookings
                </Button>
              </Link>
            )}
            <Link href="/collections">
              <Button>
                Open collections
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      {isPending && !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : data ? (
        <>
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <Stat
                label="30-day revenue"
                value={formatCurrency(data.totals.revenue30d)}
              />
            </StaggerItem>
            <StaggerItem>
              <Stat
                label="Projected monthly"
                value={formatCurrency(data.totals.projectedMonthly)}
              />
            </StaggerItem>
            <StaggerItem>
              <Stat
                label="Outstanding due"
                value={formatCurrency(data.totals.outstandingDue)}
              />
            </StaggerItem>
            <StaggerItem>
              <Stat
                label="Overdue"
                value={formatCurrency(data.totals.overdue)}
                danger
              />
            </StaggerItem>
          </Stagger>

          <Stagger className="mt-6 grid gap-5 xl:grid-cols-2">
            {data.properties.map((p) => (
              <StaggerItem key={p.id}>
                <Card glow>
                  <CardHeader>
                    <div>
                      <h2 className="text-lg font-semibold">{p.name}</h2>
                      <p className="text-xs text-[var(--muted)]">{p.address}</p>
                    </div>
                    <Badge
                      tone={
                        p.occupancy >= 90
                          ? "success"
                          : p.occupancy >= 60
                            ? "accent"
                            : "warning"
                      }
                    >
                      {formatPercent(p.occupancy)} occupied
                    </Badge>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Money
                        label="30-day revenue"
                        value={formatCurrency(p.money.revenue30d)}
                      />
                      <Money
                        label="Projected monthly"
                        value={formatCurrency(p.money.projectedMonthly)}
                      />
                      <Money
                        label="Outstanding due"
                        value={formatCurrency(p.money.outstandingDue)}
                      />
                      <Money
                        label="Overdue"
                        value={`${formatCurrency(p.money.overdue)}`}
                        hint={`${p.money.overdueInvoices} invoices`}
                        danger
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Inventory — {p.inventory.occupied} occupied /{" "}
                        {p.inventory.available} available
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.inventory.availableSpots.length === 0 ? (
                          <span className="text-sm text-[var(--muted)]">
                            No open spots
                          </span>
                        ) : (
                          p.inventory.availableSpots.slice(0, 12).map((s) => (
                            <span
                              key={s}
                              className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-xs font-medium text-[var(--accent-ink)]"
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          Active tenants
                        </p>
                        <p className="mt-1 font-semibold">
                          {p.tenantHealth.totalActive}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          Good standing
                        </p>
                        <p className="mt-1 font-semibold">
                          {formatPercent(p.tenantHealth.goodStandingPct)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          Past due / notice
                        </p>
                        <p className="mt-1 font-semibold">
                          {p.tenantHealth.pastDue} / {p.tenantHealth.notice}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        6-month revenue trend
                      </p>
                      <MiniTrend data={p.revenueTrend} />
                    </div>
                  </CardBody>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      ) : null}
    </PageTransition>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-3 text-2xl font-semibold tracking-tight ${
          danger ? "text-rose-600" : ""
        }`}
      >
        {value}
      </p>
    </Card>
  );
}

function Money({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${danger ? "text-rose-600" : ""}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
