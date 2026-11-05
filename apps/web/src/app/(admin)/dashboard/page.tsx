"use client";

import { useMemo, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  ScrollText,
  ShieldAlert,
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
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

  const trend = useMemo(() => {
    if (!data?.properties.length) return [0, 0, 0, 0, 0, 0];
    const out = [0, 0, 0, 0, 0, 0];
    for (const p of data.properties) {
      p.revenueTrend.forEach((v, i) => {
        out[i] += v;
      });
    }
    return out;
  }, [data]);

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
                  <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span className="truncate">{a.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      )}

      {isPending && !data ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-56" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="rounded-2xl bg-[var(--ink)] p-5 text-white shadow-[var(--shadow-card)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Revenue trend
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    Last 6 months
                  </h2>
                </div>
                <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <MiniTrend data={trend} dark />
            </div>

            <Stagger className="grid gap-3 sm:grid-cols-2">
              <StaggerItem>
                <Stat
                  label="30-day revenue"
                  value={formatCurrency(data.totals.revenue30d)}
                  icon={Wallet}
                />
              </StaggerItem>
              <StaggerItem>
                <Stat
                  label="Projected monthly"
                  value={formatCurrency(data.totals.projectedMonthly)}
                  icon={TrendingUp}
                />
              </StaggerItem>
              <StaggerItem>
                <Stat
                  label="Gross margin"
                  value={formatCurrency(data.totals.projectedGrossMargin)}
                  icon={Users}
                />
              </StaggerItem>
              <StaggerItem>
                <Stat
                  label="Overdue"
                  value={formatCurrency(data.totals.overdue)}
                  icon={AlertTriangle}
                  danger
                />
              </StaggerItem>
            </Stagger>
          </div>

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
                              className="rounded-lg bg-[var(--ink)] px-2 py-1 text-xs font-medium text-[var(--accent)]"
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

                    <div className="rounded-xl bg-[var(--ink)] p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
                        6-month revenue trend
                      </p>
                      <MiniTrend data={p.revenueTrend} dark />
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
  icon: Icon,
}: {
  label: string;
  value: string;
  danger?: boolean;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-[var(--ink)] px-3.5 py-3 text-white shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[12px] font-medium text-white/70">
          {label}
        </p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            danger ? "text-[var(--danger)]" : "text-[var(--accent)]",
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tracking-tight tabular-nums",
          danger ? "text-[var(--danger)]" : "text-[var(--accent)]",
        )}
      >
        {value}
      </p>
    </div>
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
    <div className="flex min-w-0 flex-col rounded-lg bg-[var(--ink)] px-2.5 py-2 text-white">
      <p className="truncate text-[11px] font-medium text-white/70">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm font-semibold tabular-nums",
          danger ? "text-[var(--danger)]" : "text-[var(--accent)]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-white/50">
        {hint ? hint : "\u00a0"}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}
