"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api";
import { queryKeys } from "@/lib/prefetch";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { MiniTrend } from "@/components/mini-trend";

export default function PropertiesPage() {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.dashboard("all"),
    queryFn: () => endpoints.dashboard(),
  });

  return (
    <PageTransition>
      <PageHeader
        title="Properties"
        subtitle="Each yard’s occupancy, money, and available inventory."
      />
      {isPending && !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <Stagger className="grid gap-5 md:grid-cols-2">
          {(data?.properties ?? []).map((property) => (
            <StaggerItem key={property.id}>
              <Card glow>
                <CardHeader>
                  <div>
                    <h2 className="text-lg font-semibold">{property.name}</h2>
                    <p className="text-sm text-[var(--muted)]">
                      {property.address}
                    </p>
                    {property.legalEntityName && (
                      <p className="mt-1 text-xs font-medium text-[var(--accent-ink)]">
                        COI additional insured: {property.legalEntityName}
                      </p>
                    )}
                  </div>
                  <Badge
                    tone={
                      property.occupancy >= 90
                        ? "success"
                        : property.occupancy >= 60
                          ? "accent"
                          : "warning"
                    }
                  >
                    {formatPercent(property.occupancy)} occupied
                  </Badge>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">Inventory</span>
                      <span className="font-medium">
                        {property.inventory.occupied} /{" "}
                        {property.inventory.total} lots
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                        style={{
                          width: `${Math.min(property.occupancy, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Stat
                      label="30-day"
                      value={formatCurrency(property.money.revenue30d)}
                    />
                    <Stat
                      label="Projected"
                      value={formatCurrency(property.money.projectedMonthly)}
                    />
                    <Stat
                      label="Outstanding"
                      value={formatCurrency(property.money.outstandingDue)}
                    />
                    <Stat
                      label="Overdue"
                      value={formatCurrency(property.money.overdue)}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Open spots ({property.inventory.available})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {property.inventory.availableSpots.length === 0 ? (
                        <span className="text-sm text-[var(--muted)]">
                          Full
                        </span>
                      ) : (
                        property.inventory.availableSpots
                          .slice(0, 10)
                          .map((s) => (
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

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Revenue trend
                    </p>
                    <MiniTrend data={property.revenueTrend} />
                  </div>
                </CardBody>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
