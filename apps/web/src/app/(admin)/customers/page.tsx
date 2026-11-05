"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  endpoints,
  type CoiStatus,
  type CustomerSummary,
} from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const ISSUE_COI: CoiStatus[] = [
  "missing",
  "expired",
  "expiring",
  "mismatch",
];

const PAYMENT_STATUS: Record<
  CustomerSummary["paymentStatus"],
  { label: string; dot: string; text: string }
> = {
  current: {
    label: "Current",
    dot: "bg-emerald-600",
    text: "text-emerald-800",
  },
  past_due: {
    label: "Past due",
    dot: "bg-rose-600",
    text: "text-rose-700",
  },
  notice: {
    label: "Notice",
    dot: "bg-amber-500",
    text: "text-amber-800",
  },
};

type PaymentFilter = "all" | CustomerSummary["paymentStatus"];
type GapFilter = "all" | "has_gaps" | "coi" | "plates" | "lease" | "clear";
type ActiveFilter = "all" | "active" | "inactive";
type LotFilter = "all" | "assigned" | "unassigned";
type StartFilter = "all" | "30d" | "90d" | "6m" | "1y" | "older";
type AddedFilter = "all" | "30d" | "90d" | "6m" | "older";

type GapKind = "coi" | "plates" | "lease";

function ageMs(iso?: string) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Date.now() - t;
}

function formatGapLabel(label: string) {
  if (label.startsWith("COI ")) {
    return `COI ${label.slice(4).replace(/_/g, " ")}`;
  }
  return label;
}

function gapTextClass(label: string) {
  if (label.startsWith("COI")) return "text-rose-700";
  if (label.includes("plate") || label.includes("Lease")) return "text-amber-800";
  return "text-[var(--ink)]";
}

function GapsCell({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) {
    return <span className="text-sm text-[var(--muted)]">Clear</span>;
  }
  return (
    <p className="text-sm leading-snug">
      {gaps.map((g, i) => (
        <span key={g}>
          {i > 0 ? <span className="text-[var(--muted)]"> · </span> : null}
          <span className={gapTextClass(g)}>{formatGapLabel(g)}</span>
        </span>
      ))}
    </p>
  );
}

function StatusCell({
  status,
}: {
  status: CustomerSummary["paymentStatus"];
}) {
  const meta = PAYMENT_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium",
        meta.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export default function CustomersPage() {
  const { propertyId, properties } = useApp();
  const [q, setQ] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [gapFilter, setGapFilter] = useState<GapFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [lotFilter, setLotFilter] = useState<LotFilter>("all");
  const [startFilter, setStartFilter] = useState<StartFilter>("all");
  const [addedFilter, setAddedFilter] = useState<AddedFilter>("all");

  const { data, isPending } = useQuery({
    queryKey: queryKeys.customers(propertyId, q),
    queryFn: () =>
      endpoints.customers({
        propertyId: propertyParam(propertyId),
        q: q || undefined,
      }),
  });

  const { data: plateQueue } = useQuery({
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

  const withGaps = useMemo(() => {
    return (data ?? []).map((customer) => {
      const gaps: string[] = [];
      const kinds: GapKind[] = [];
      const coi = (customer.coiStatus ?? "missing") as CoiStatus;
      if (ISSUE_COI.includes(coi)) {
        gaps.push(`COI ${coi}`);
        kinds.push("coi");
      }
      const plateCount = platesByEmail.get(customer.email.toLowerCase()) ?? 0;
      if (plateCount > 0) {
        gaps.push(`${plateCount} plate${plateCount === 1 ? "" : "s"}`);
        kinds.push("plates");
      }
      if (renewalCustomerIds.has(customer.id)) {
        gaps.push("Lease renewal");
        kinds.push("lease");
      }
      return { customer, gaps, kinds };
    });
  }, [data, platesByEmail, renewalCustomerIds]);

  const filtered = useMemo(() => {
    const day = 86400000;
    return withGaps.filter(({ customer, gaps, kinds }) => {
      if (
        paymentFilter !== "all" &&
        customer.paymentStatus !== paymentFilter
      ) {
        return false;
      }
      if (gapFilter === "has_gaps" && gaps.length === 0) return false;
      if (gapFilter === "clear" && gaps.length > 0) return false;
      if (gapFilter === "coi" && !kinds.includes("coi")) return false;
      if (gapFilter === "plates" && !kinds.includes("plates")) return false;
      if (gapFilter === "lease" && !kinds.includes("lease")) return false;
      if (activeFilter === "active" && !customer.isActive) return false;
      if (activeFilter === "inactive" && customer.isActive) return false;
      if (lotFilter === "assigned" && !customer.hasAssignedLot) return false;
      if (lotFilter === "unassigned" && customer.hasAssignedLot) return false;
      if (startFilter !== "all") {
        const age = ageMs(customer.leaseStart);
        if (age == null) return false;
        if (startFilter === "30d" && age > 30 * day) return false;
        if (startFilter === "90d" && age > 90 * day) return false;
        if (startFilter === "6m" && age > 182 * day) return false;
        if (startFilter === "1y" && age > 365 * day) return false;
        if (startFilter === "older" && age <= 365 * day) return false;
      }
      if (addedFilter !== "all") {
        const age = ageMs(customer.createdAt ?? customer.leaseStart);
        if (age == null) return false;
        if (addedFilter === "30d" && age > 30 * day) return false;
        if (addedFilter === "90d" && age > 90 * day) return false;
        if (addedFilter === "6m" && age > 182 * day) return false;
        if (addedFilter === "older" && age <= 182 * day) return false;
      }
      return true;
    });
  }, [
    withGaps,
    paymentFilter,
    gapFilter,
    activeFilter,
    lotFilter,
    startFilter,
    addedFilter,
  ]);

  return (
    <PageTransition>
      <PageHeader
        title="Customers"
        subtitle="Newest first. Gaps replace COI — see COI, plates, and lease missing in one column."
      />

      <div className="mb-3 grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            className="pl-10"
            placeholder="Search company, contact, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <FilterSelect
          label="Payment"
          value={paymentFilter}
          onChange={(v) => setPaymentFilter(v as PaymentFilter)}
          options={[
            { value: "all", label: "All payment status" },
            { value: "current", label: "Current" },
            { value: "past_due", label: "Past due" },
            { value: "notice", label: "Notice" },
          ]}
        />

        <FilterSelect
          label="Gaps"
          value={gapFilter}
          onChange={(v) => setGapFilter(v as GapFilter)}
          options={[
            { value: "all", label: "All gaps / clear" },
            { value: "has_gaps", label: "Has gaps" },
            { value: "coi", label: "COI gaps" },
            { value: "plates", label: "Plates gaps" },
            { value: "lease", label: "Lease gaps" },
            { value: "clear", label: "Complete (no gaps)" },
          ]}
        />

        <FilterSelect
          label="Added"
          value={addedFilter}
          onChange={(v) => setAddedFilter(v as AddedFilter)}
          options={[
            { value: "all", label: "Any added date (newest first)" },
            { value: "30d", label: "Added last 30 days" },
            { value: "90d", label: "Added last 90 days" },
            { value: "6m", label: "Added last 6 months" },
            { value: "older", label: "Added over 6 months ago" },
          ]}
        />

        <FilterSelect
          label="Active"
          value={activeFilter}
          onChange={(v) => setActiveFilter(v as ActiveFilter)}
          options={[
            { value: "all", label: "All customers" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />

        <FilterSelect
          label="Lots"
          value={lotFilter}
          onChange={(v) => setLotFilter(v as LotFilter)}
          options={[
            { value: "all", label: "All lot assignment" },
            { value: "assigned", label: "Has assigned lot" },
            { value: "unassigned", label: "Unassigned" },
          ]}
        />

        <FilterSelect
          label="Contract start"
          value={startFilter}
          onChange={(v) => setStartFilter(v as StartFilter)}
          options={[
            { value: "all", label: "Any start date" },
            { value: "30d", label: "Started last 30 days" },
            { value: "90d", label: "Started last 90 days" },
            { value: "6m", label: "Started last 6 months" },
            { value: "1y", label: "Started last 12 months" },
            { value: "older", label: "Started over 1 year ago" },
          ]}
        />
      </div>

      {isPending && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card interactive={false} className="p-10 text-center">
          <p className="text-[var(--muted)]">No customers match your filters.</p>
        </Card>
      ) : (
        <>
          <p className="mb-2 shrink-0 text-[13px] text-[var(--muted)]">
            Showing {filtered.length}
            {data && filtered.length !== data.length
              ? ` of ${data.length}`
              : ""}{" "}
            customers
          </p>

          <div className="min-w-0">
          <Stagger className="grid gap-3 md:hidden">
            {filtered.map(({ customer, gaps }) => {
              const yard = properties.find((p) => p.id === customer.propertyId);
              return (
                <StaggerItem key={customer.id}>
                  <Link href={`/customers/${customer.id}`}>
                    <Card>
                      <CardBody className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{customer.name}</p>
                            <p className="text-sm text-[var(--muted)]">
                              {customer.contactName}
                            </p>
                          </div>
                          <StatusCell status={customer.paymentStatus} />
                        </div>
                        <GapsCell gaps={gaps} />
                        <div className="grid grid-cols-1 gap-2 text-sm min-[480px]:grid-cols-3">
                          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Yard
                            </p>
                            <p className="mt-0.5 font-medium">
                              {yard?.name ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Balance
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 font-medium",
                                customer.balanceDue > 0 && "text-rose-600",
                              )}
                            >
                              {formatCurrency(customer.balanceDue)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                              Deposit
                            </p>
                            <p className="mt-0.5 font-medium">
                              {formatCurrency(customer.securityDeposit)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          Lots: {customer.lotNumbers.join(", ") || "Unassigned"}
                          {" · "}
                          Added {customer.createdAt || customer.leaseStart || "—"}
                        </p>
                      </CardBody>
                    </Card>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="hidden md:block">
            <table className="w-full min-w-[860px] border-collapse rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Customer</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Yard / lots</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Added</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Balance</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Deposit</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Status</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Gaps</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ customer, gaps }) => {
                  const yard = properties.find(
                    (p) => p.id === customer.propertyId,
                  );
                  const added =
                    customer.createdAt || customer.leaseStart || "—";
                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-[var(--border)] transition-colors duration-150 last:border-b-0 hover:bg-[var(--accent-soft)]"
                    >
                      <td className="max-w-[16rem] px-3 py-2 align-middle">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="block"
                        >
                          <p className="truncate font-medium text-[var(--ink)]">
                            {customer.name}
                          </p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {customer.contactName} · {customer.email}
                          </p>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <p>{yard?.name ?? "—"}</p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          Lots: {customer.lotNumbers.join(", ") || "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle tabular-nums">
                        {added}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-3 py-2 align-middle font-semibold tabular-nums",
                          customer.balanceDue > 0 && "text-rose-600",
                        )}
                      >
                        {formatCurrency(customer.balanceDue)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle font-medium tabular-nums">
                        {formatCurrency(customer.securityDeposit)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <StatusCell status={customer.paymentStatus} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <GapsCell gaps={gaps} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}
    </PageTransition>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <SelectMenu
      ariaLabel={label}
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
