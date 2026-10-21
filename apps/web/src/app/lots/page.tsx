"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  endpoints,
  type Lot,
  type LotStatus,
} from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";

const statusMeta: Record<
  LotStatus,
  { tone: "success" | "info" | "warning" | "danger"; surface: string }
> = {
  occupied: {
    tone: "success",
    surface: "bg-emerald-500/8 border-emerald-500/25",
  },
  available: {
    tone: "info",
    surface: "bg-sky-500/8 border-sky-500/25",
  },
  reserved: {
    tone: "warning",
    surface: "bg-amber-500/10 border-amber-500/30",
  },
  maintenance: {
    tone: "danger",
    surface: "bg-rose-500/8 border-rose-500/25",
  },
};

const STATUS_FILTERS: Array<LotStatus | "all"> = [
  "all",
  "occupied",
  "available",
  "reserved",
  "maintenance",
];

export default function LotsPage() {
  const { propertyId, properties } = useApp();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<LotStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: queryKeys.lots(propertyId),
    queryFn: () => endpoints.lots(propertyParam(propertyId)),
  });

  const { data: customers } = useQuery({
    queryKey: queryKeys.customers(propertyId),
    queryFn: () =>
      endpoints.customers({ propertyId: propertyParam(propertyId) }),
  });

  const selected = data?.find((l) => l.id === selectedId) ?? null;

  const [draftStatus, setDraftStatus] = useState<LotStatus>("available");
  const [draftRate, setDraftRate] = useState("");
  const [draftCustomer, setDraftCustomer] = useState<string>("");

  function openLot(lot: Lot) {
    setSelectedId(lot.id);
    setDraftStatus(lot.status);
    setDraftRate(String(lot.monthlyRate));
    setDraftCustomer(lot.customerId ?? "");
  }

  const save = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No lot");
      return endpoints.patchLot(selected.id, {
        status: draftStatus,
        monthlyRate: Number(draftRate),
        customerId: draftCustomer === "" ? null : draftCustomer,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lots"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedId(null);
    },
  });

  const counts = useMemo(() => {
    const base = {
      occupied: 0,
      available: 0,
      reserved: 0,
      maintenance: 0,
    };
    for (const l of data ?? []) base[l.status] += 1;
    return base;
  }, [data]);

  const visible = (data ?? []).filter(
    (l) => filter === "all" || l.status === filter,
  );

  const assignableCustomers = (customers ?? []).filter(
    (c) =>
      !propertyId ||
      propertyId === "all" ||
      c.propertyId === (selected?.propertyId ?? propertyId),
  );

  return (
    <PageTransition>
      <PageHeader
        title="Lots"
        subtitle="Change status, monthly rate, and tenant assignment — spots and acres."
      />

      {!isPending && data && (
        <div className="mb-5 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition",
                filter === s && "ring-2 ring-[var(--accent)] ring-offset-1",
                s === "all"
                  ? "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                  : statusMeta[s].surface,
              )}
            >
              {s === "all" ? "Total" : s}
              <span className="rounded-full bg-[var(--surface)]/80 px-1.5 py-0.5 text-[10px] text-[var(--ink)]">
                {s === "all" ? data.length : counts[s]}
              </span>
            </button>
          ))}
        </div>
      )}

      {isPending && !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : data ? (
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {visible.map((lot) => {
            const yard = properties.find((p) => p.id === lot.propertyId);
            const meta = statusMeta[lot.status];
            return (
              <StaggerItem key={lot.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => openLot(lot)}
                >
                  <Card
                    className={cn(
                      "border",
                      meta.surface,
                      selectedId === lot.id &&
                        "ring-2 ring-[var(--accent)] ring-offset-2",
                    )}
                  >
                    <CardBody className="space-y-2 !p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">#{lot.number}</p>
                        <Badge tone={meta.tone}>{lot.status}</Badge>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {lot.lotTypeLabel}
                        {lot.acres != null ? ` · ${lot.acres} ac` : ""}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{lot.size}</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(lot.monthlyRate)}
                        <span className="text-[var(--muted)]">/mo</span>
                      </p>
                      <p className="truncate text-[11px] text-[var(--muted)]">
                        {lot.customerName ?? "Unassigned"} · {yard?.name}
                      </p>
                    </CardBody>
                  </Card>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>
      ) : null}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Manage lot
                </p>
                <h2 className="text-xl font-semibold">#{selected.number}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {selected.lotTypeLabel} · {selected.size}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Status
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm"
                  value={draftStatus}
                  onChange={(e) =>
                    setDraftStatus(e.target.value as LotStatus)
                  }
                >
                  {(
                    [
                      "available",
                      "occupied",
                      "reserved",
                      "maintenance",
                    ] as LotStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Monthly rate
                </span>
                <Input
                  type="number"
                  value={draftRate}
                  onChange={(e) => setDraftRate(e.target.value)}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Assigned customer
                </span>
                <select
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm"
                  value={draftCustomer}
                  onChange={(e) => setDraftCustomer(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {assignableCustomers
                    .filter(
                      (c) =>
                        !selected.propertyId ||
                        c.propertyId === selected.propertyId,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>

              {selected.qbItemName && (
                <p className="text-xs text-[var(--muted)]">
                  QuickBooks item: {selected.qbItemName}
                </p>
              )}
            </div>

            <div className="border-t border-[var(--border)] p-5">
              <Button
                className="w-full"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
              {save.isError && (
                <p className="mt-2 text-sm text-rose-600">
                  Could not save. Try again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
