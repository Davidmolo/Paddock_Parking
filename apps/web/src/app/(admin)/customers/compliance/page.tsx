"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { endpoints, type CoiStatus, type CustomerSummary } from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/segmented";

const ISSUE_COI: CoiStatus[] = [
  "missing",
  "expired",
  "expiring",
  "mismatch",
];

type GapFilter = "all" | "coi" | "plates" | "lease";

type ComplianceRow = {
  customer: CustomerSummary;
  yardName: string;
  gaps: string[];
  kinds: ("coi" | "plates" | "lease")[];
};

/**
 * David: one compliance worklist — COI + plates + lease gaps per customer
 * (under Customers). Avoids calling the same tenant twice from separate lists.
 */
export default function CustomersCompliancePage() {
  const { propertyId, properties } = useApp();
  const [filter, setFilter] = useState<GapFilter>("all");

  const { data: customers, isPending: custPending } = useQuery({
    queryKey: queryKeys.customers(propertyId),
    queryFn: () =>
      endpoints.customers({ propertyId: propertyParam(propertyId) }),
  });

  const { data: plateQueue, isPending: platePending } = useQuery({
    queryKey: ["compliance-queue"],
    queryFn: () => endpoints.complianceQueue(),
  });

  const { data: renewals } = useQuery({
    queryKey: ["lease-renewals", propertyId],
    queryFn: () => endpoints.leaseRenewalsDue(propertyParam(propertyId)),
  });

  const platesByEmail = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of plateQueue ?? []) {
      if (item.kind !== "vehicle_plate") continue;
      const key = item.email.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [plateQueue]);

  const renewalCustomerIds = useMemo(() => {
    const set = new Set<string>();
    for (const l of renewals ?? []) {
      if (l.customerId) set.add(l.customerId);
    }
    return set;
  }, [renewals]);

  const rows = useMemo(() => {
    const list: ComplianceRow[] = [];
    for (const c of customers ?? []) {
      const gaps: string[] = [];
      const kinds: ComplianceRow["kinds"] = [];
      const coi = (c.coiStatus ?? "missing") as CoiStatus;
      if (ISSUE_COI.includes(coi)) {
        gaps.push(`COI ${coi}`);
        kinds.push("coi");
      }
      const plateCount = platesByEmail.get(c.email.toLowerCase()) ?? 0;
      if (plateCount > 0) {
        gaps.push(
          `${plateCount} plate${plateCount === 1 ? "" : "s"} owed`,
        );
        kinds.push("plates");
      }
      if (renewalCustomerIds.has(c.id)) {
        gaps.push("Lease renewal");
        kinds.push("lease");
      }
      if (gaps.length === 0) continue;
      const yard = properties.find((p) => p.id === c.propertyId);
      list.push({
        customer: c,
        yardName: yard?.name ?? "—",
        gaps,
        kinds,
      });
    }
    return list
      .filter((r) => filter === "all" || r.kinds.includes(filter))
      .sort((a, b) => b.gaps.length - a.gaps.length || a.customer.name.localeCompare(b.customer.name));
  }, [
    customers,
    platesByEmail,
    renewalCustomerIds,
    properties,
    filter,
  ]);

  const summary = useMemo(() => {
    let coi = 0;
    let plates = 0;
    let lease = 0;
    for (const r of rows) {
      if (r.kinds.includes("coi")) coi += 1;
      if (r.kinds.includes("plates")) plates += 1;
      if (r.kinds.includes("lease")) lease += 1;
    }
    return { open: rows.length, coi, plates, lease };
  }, [rows]);

  const loading = custPending || platePending;

  return (
    <PageTransition>
      <PageHeader
        title="Compliance"
        subtitle="One list of what’s missing per customer — COI, plates, and lease — so you call once."
        action={
          <Link href="/customers">
            <Button variant="secondary">All customers</Button>
          </Link>
        }
      />

      {loading && !customers ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <Stat label="Open files" value={String(summary.open)} />
            <Stat label="COI gaps" value={String(summary.coi)} />
            <Stat label="Plates owed" value={String(summary.plates)} />
            <Stat label="Lease renewals" value={String(summary.lease)} />
          </div>

          <Segmented
            className="mb-4"
            ariaLabel="Compliance gaps"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All gaps" },
              { value: "coi", label: "COI" },
              { value: "plates", label: "Plates" },
              { value: "lease", label: "Lease" },
            ]}
          />

          {rows.length === 0 ? (
            <Card interactive={false} className="p-10 text-center">
              <p className="text-[var(--muted)]">
                No compliance gaps for this filter.
              </p>
            </Card>
          ) : (
            <Stagger className="grid gap-3">
              {rows.map((row) => (
                <StaggerItem key={row.customer.id}>
                  <Card>
                    <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold">{row.customer.name}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {row.yardName} · {row.customer.email} ·{" "}
                          {row.customer.phone}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.gaps.map((g) => (
                            <Badge
                              key={g}
                              tone={
                                g.startsWith("COI")
                                  ? "danger"
                                  : g.includes("plate")
                                    ? "warning"
                                    : "info"
                              }
                            >
                              {g}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Link href={`/customers/${row.customer.id}`}>
                        <Button size="sm" variant="secondary">
                          Open file
                        </Button>
                      </Link>
                    </CardBody>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </>
      )}
    </PageTransition>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card interactive={false}>
      <CardBody className="space-y-1 !py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardBody>
    </Card>
  );
}
