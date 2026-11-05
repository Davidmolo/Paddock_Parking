"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Segmented } from "@/components/ui/segmented";
import { formatCurrency, cn } from "@/lib/utils";
import { ACRE_COLORS, effectiveAcres } from "@/lib/lot-layout";
import { YardSitePlanEmbed } from "@/components/lots/yard-site-plan-embed";
import {
  resolveSitePlan,
  SITE_PLAN_OPTIONS,
} from "@/lib/site-plans";

const statusMeta: Record<
  LotStatus,
  { tone: "success" | "info" | "warning" | "danger" | "accent"; surface: string }
> = {
  occupied: {
    tone: "success",
    surface: "bg-emerald-500/8 border-emerald-500/25",
  },
  available: {
    tone: "info",
    surface: "bg-sky-500/8 border-sky-500/25",
  },
  available_soon: {
    tone: "accent",
    surface: "bg-violet-500/10 border-violet-500/30",
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
  "available_soon",
  "reserved",
  "maintenance",
];

function statusLabel(s: LotStatus | "all") {
  if (s === "all") return "Total";
  if (s === "available_soon") return "Available soon";
  return s;
}

const ACRE_FILTERS = ["all", "0.25", "0.5", "1", "2", "3", "4", "5", "stall"] as const;

export default function LotsPage() {
  const { propertyId, properties } = useApp();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"map" | "grid">("map");
  const [filter, setFilter] = useState<LotStatus | "all">("all");
  const [acreFilter, setAcreFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Yard chosen for the site-plan map (independent when header is “All yards”). */
  const [mapYardId, setMapYardId] = useState<string>(
    SITE_PLAN_OPTIONS[0].propertyId,
  );

  const { data, isPending } = useQuery({
    queryKey: queryKeys.lots(propertyId),
    queryFn: () => endpoints.lots(propertyParam(propertyId)),
  });

  const { data: customers } = useQuery({
    queryKey: queryKeys.customers(propertyId),
    queryFn: () =>
      endpoints.customers({ propertyId: propertyParam(propertyId) }),
  });

  const lots = useMemo(
    () => (data ?? []).filter((l): l is Lot => Boolean(l?.id)),
    [data],
  );
  const selected = lots.find((l) => l.id === selectedId) ?? null;

  const activePlan = useMemo(() => {
    const fromTab = SITE_PLAN_OPTIONS.find((o) => o.propertyId === mapYardId);
    if (fromTab) return fromTab;
    return resolveSitePlan(propertyId, mapYardId);
  }, [mapYardId, propertyId]);

  useEffect(() => {
    if (propertyId === "all") return;
    const hit = SITE_PLAN_OPTIONS.find((o) => o.propertyId === propertyId);
    if (hit) setMapYardId(hit.propertyId);
  }, [propertyId]);

  const mapLots = useMemo(
    () => lots.filter((l) => l.propertyId === activePlan.propertyId),
    [lots, activePlan.propertyId],
  );

  const [draftStatus, setDraftStatus] = useState<LotStatus>("available");
  const [draftRate, setDraftRate] = useState("");
  const [draftCustomer, setDraftCustomer] = useState<string>("");
  const [draftAvailableOn, setDraftAvailableOn] = useState("");
  const [draftVacantSince, setDraftVacantSince] = useState("");

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function openLot(lot: Lot) {
    setSelectedId(lot.id);
    setDraftStatus(lot.status);
    setDraftRate(String(lot.monthlyRate));
    setDraftCustomer(lot.customerId ?? "");
    setDraftAvailableOn(lot.availableOn ?? "");
    setDraftVacantSince(lot.vacantSince ?? "");
  }

  const save = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No lot");
      return endpoints.patchLot(selected.id, {
        status: draftStatus,
        monthlyRate: Number(draftRate),
        customerId: draftCustomer === "" ? null : draftCustomer,
        availableOn:
          draftStatus === "available_soon"
            ? draftAvailableOn || null
            : null,
        vacantSince:
          draftStatus === "available" ? draftVacantSince || null : null,
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
    const base: Record<LotStatus, number> = {
      occupied: 0,
      available: 0,
      available_soon: 0,
      reserved: 0,
      maintenance: 0,
    };
    for (const l of lots) base[l.status] += 1;
    return base;
  }, [lots]);

  const mapOccupancy = useMemo(() => {
    const total = mapLots.length;
    const rented = mapLots.filter(
      (l) =>
        l.status === "occupied" ||
        l.status === "available_soon" ||
        l.status === "reserved",
    ).length;
    const available = mapLots.filter((l) => l.status === "available").length;
    const soon = mapLots.filter((l) => l.status === "available_soon").length;
    const rate = total ? Math.round((rented / total) * 100) : 0;
    return { total, rented, available, soon, rate };
  }, [mapLots]);

  const visible = lots.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (acreFilter === "all") return true;
    if (acreFilter === "stall") {
      return !(l.lotType === "acre" || (l.acres != null && l.acres >= 0.25));
    }
    return Math.abs(effectiveAcres(l) - Number(acreFilter)) < 0.01;
  });

  const assignableCustomers = (customers ?? []).filter(
    (c) =>
      !propertyId ||
      propertyId === "all" ||
      c.propertyId === (selected?.propertyId ?? propertyId),
  );

  const tenantsByLotId = useMemo(() => {
    const map: Record<
      string,
      | { id: string; name: string; monthlyRate: number; leaseStart?: string }
      | undefined
    > = {};
    for (const lot of lots) {
      if (!lot.customerId) continue;
      const cust = (customers ?? []).find((c) => c.id === lot.customerId);
      map[lot.id] = {
        id: lot.customerId,
        name: lot.customerName ?? cust?.name ?? "Tenant",
        monthlyRate: lot.monthlyRate,
        leaseStart: cust?.leaseStart,
      };
    }
    return map;
  }, [lots, customers]);

  return (
    <PageTransition>
      <PageHeader
        title="Inventory"
        subtitle="Yard site plans with live occupancy — hover for details, click a space to update status, rate, or tenant."
        action={
          <Segmented
            ariaLabel="Inventory view"
            value={view}
            onChange={setView}
            options={[
              { value: "map", label: "Site plan" },
              { value: "grid", label: "Grid" },
            ]}
          />
        }
      />

      {!isPending && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
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
                {statusLabel(s)}
                <span className="rounded-full bg-[var(--surface)]/80 px-1.5 py-0.5 text-[10px] text-[var(--ink)]">
                  {s === "all" ? lots.length : counts[s]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
              Acres
            </span>
            {ACRE_FILTERS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAcreFilter(a)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  acreFilter === a
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
                )}
              >
                {a !== "all" && a !== "stall" && (
                  <i
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ background: ACRE_COLORS[a] }}
                  />
                )}
                {a === "all" ? "All sizes" : a === "stall" ? "Stalls" : `${a} ac`}
              </button>
            ))}

          </div>
        </div>
      )}

      {isPending && !data ? (
        <Skeleton className="h-[min(62vh,560px)] min-h-[420px] w-full rounded-2xl" />
      ) : data ? (
        view === "map" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {SITE_PLAN_OPTIONS.map((opt) => (
                  <button
                    key={opt.propertyId}
                    type="button"
                    onClick={() => setMapYardId(opt.propertyId)}
                    className={cn(
                      "h-9 rounded-xl border px-3 text-xs font-semibold transition",
                      activePlan.propertyId === opt.propertyId
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm">
                <span className="font-semibold tabular-nums">
                  {mapOccupancy.rate}%
                </span>{" "}
                <span className="text-[var(--muted)]">occupied</span>
                <span className="mx-2 text-[var(--border)]">·</span>
                <span className="text-[var(--muted)]">
                  {mapOccupancy.available} open
                  {mapOccupancy.soon > 0
                    ? ` · ${mapOccupancy.soon} soon`
                    : ""}
                </span>
              </div>
            </div>
            <YardSitePlanEmbed
              slug={activePlan.slug}
              lots={mapLots}
              tenantsByLotId={tenantsByLotId}
              selectedId={selectedId}
              onSelectByNumber={(spaceNumber) => {
                const key = spaceNumber.trim();
                const lot =
                  mapLots.find((l) => l.number === key) ||
                  mapLots.find((l) => l.id === key) ||
                  mapLots.find(
                    (l) =>
                      l.number.replace(/\s+/g, "").toLowerCase() ===
                      key.replace(/\s+/g, "").toLowerCase(),
                  );
                if (lot) openLot(lot);
              }}
            />
          </div>
        ) : (
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
        )
      ) : null}

      {view === "map" && data && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Staff view only — click a space to manage occupancy, pricing, and
          tenant assignment.
        </p>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          role="presentation"
          onClick={() => setSelectedId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Manage lot ${selected.number}`}
            className="flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Manage lot
                </p>
                <h2 className="text-xl font-semibold">#{selected.number}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {selected.lotTypeLabel} · {selected.size}
                  {selected.acres != null ? ` · ${selected.acres} ac` : ""}
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
                      "available_soon",
                      "occupied",
                      "reserved",
                      "maintenance",
                    ] as LotStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
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

              {draftStatus === "available_soon" && (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Available on
                  </span>
                  <Input
                    type="date"
                    value={draftAvailableOn}
                    onChange={(e) => setDraftAvailableOn(e.target.value)}
                  />
                  <p className="text-xs text-[var(--muted)]">
                    Date this space frees up. Hover shows date + who is
                    vacating (assigned customer).
                  </p>
                </label>
              )}

              {(draftStatus === "available_soon" ||
                draftStatus === "occupied" ||
                draftStatus === "reserved") &&
                selected.customerName && (
                  <p className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm">
                    <span className="text-[var(--muted)]">
                      {draftStatus === "available_soon"
                        ? "Vacating"
                        : "Tenant"}
                      :{" "}
                    </span>
                    <span className="font-medium">{selected.customerName}</span>
                  </p>
                )}

              {draftStatus === "available" && selected.lastTenantName && (
                <p className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm">
                  <span className="text-[var(--muted)]">Last tenant: </span>
                  <span className="font-medium">{selected.lastTenantName}</span>
                </p>
              )}

              {draftStatus === "available" && (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Vacant since
                  </span>
                  <Input
                    type="date"
                    value={draftVacantSince}
                    onChange={(e) => setDraftVacantSince(e.target.value)}
                  />
                  <p className="text-xs text-[var(--muted)]">
                    How long it has been empty — hover shows “Vacant N days”.
                  </p>
                </label>
              )}

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
