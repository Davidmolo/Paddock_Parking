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
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

export default function DashboardPage() {
  const { propertyId } = useApp();
  const { data, isPending } = useQuery({
    queryKey: queryKeys.dashboard(propertyId),
    queryFn: () => endpoints.dashboard(propertyParam(propertyId)),
  });

  const alerts = data
    ? [
        data.renewalsDue > 0 && {
          href: "/leases",
          icon: ScrollText,
          label: `${data.renewalsDue} lease renewal${data.renewalsDue === 1 ? "" : "s"}`,
        },
        data.coiIssues > 0 && {
          href: "/customers/compliance",
          icon: ShieldAlert,
          label: `${data.coiIssues} COI issue${data.coiIssues === 1 ? "" : "s"}`,
        },
        data.newBookings > 0 && {
          href: "/bookings",
          icon: CalendarPlus,
          label: `${data.newBookings} new booking${data.newBookings === 1 ? "" : "s"}`,
        },
      ].filter(Boolean)
    : [];

  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        subtitle="Per yard: 30-day revenue, projected monthly, projected gross margin (rev − mortgage), and overdue."
        action={
          <Link href="/collections" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              Open collections
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {alerts.length > 0 && (
        <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.map((a) => {
            if (!a) return null;
            const Icon = a.icon;
            return (
              <Link key={a.href + a.label} href={a.href} className="min-w-0">
                <Button
                  variant="secondary"
                  className="h-11 w-full justify-start px-3.5"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--accent-ink)]" />
                  <span className="truncate">{a.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      )}

      {isPending && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                label="Projected gross margin"
                value={formatCurrency(data.totals.projectedGrossMargin)}
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
                <Card glow interactive={false}>
                  <CardHeader className="items-start">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">
                        {p.name}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        {p.address}
                      </p>
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
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <Money
                        label="30-day revenue"
                        value={formatCurrency(p.money.revenue30d)}
                      />
                      <Money
                        label="Projected monthly"
                        value={formatCurrency(p.money.projectedMonthly)}
                      />
                      <Money
                        label="Gross margin"
                        value={formatCurrency(p.money.projectedGrossMargin)}
                        hint={`− mortgage ${formatCurrency(p.money.monthlyMortgage)}`}
                      />
                      <Money
                        label="Overdue"
                        value={formatCurrency(p.money.overdue)}
                        hint={`${p.money.overdueInvoices} invoices`}
                        danger
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Inventory — {p.inventory.occupied} occupied /{" "}
                        {p.inventory.available} available
                      </p>
                      <div className="flex min-h-[2rem] flex-wrap gap-1.5">
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

                    <div className="grid grid-cols-3 gap-3">
                      <Metric
                        label="Active tenants"
                        value={String(p.tenantHealth.totalActive)}
                      />
                      <Metric
                        label="Good standing"
                        value={formatPercent(p.tenantHealth.goodStandingPct)}
                      />
                      <Metric
                        label="Past due / notice"
                        value={`${p.tenantHealth.pastDue} / ${p.tenantHealth.notice}`}
                      />
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
    <Card interactive={false} className="flex h-full min-h-[7.25rem] flex-col p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-auto pt-3 text-2xl font-semibold tracking-tight tabular-nums",
          danger && "text-[var(--danger)]",
        )}
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
    <div className="flex min-h-[5.25rem] flex-col rounded-xl bg-[var(--surface-muted)] px-3 py-2.5">
      <p className="line-clamp-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm font-semibold tabular-nums",
          danger && "text-[var(--danger)]",
        )}
      >
        {value}
      </p>
      <p className="mt-auto pt-1 text-[11px] leading-snug text-[var(--muted)]">
        {hint ? hint : "\u00a0"}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[4.5rem] flex-col rounded-xl bg-[var(--surface-muted)] px-3 py-2">
      <p className="line-clamp-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-auto pt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
