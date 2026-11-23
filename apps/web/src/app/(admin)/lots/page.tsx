"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3X3, Map, Trash2, X } from "lucide-react";
import {
  endpoints,
  type Lot,
  type LotStatus,
} from "@/lib/api";
import { propertyParam, queryKeys } from "@/lib/prefetch";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { PageTransition, Stagger, StaggerItem, usePresence } from "@/components/ui/motion";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/segmented";
import { formatCurrency, cn } from "@/lib/utils";
import { ACRE_COLORS, effectiveAcres } from "@/lib/lot-layout";
import { AddSpaces, AddYardForm, liveSpaces, loadYards, saveYards, spaceTone, yardTitle, YardSolid } from "@/components/lots/blank-yard";
import { InventoryDrawLayout } from "@/components/lots/inventory-draw-layout";
import type { AddedYard, YardSpace } from "@/components/lots/types";
import { YardSitePlanEmbed } from "@/components/lots/yard-site-plan-embed";
import { text } from "@/constants/text";
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

/** Paddock site plans. The same Add spaces, Move, and Redraw layout tools open the editable plan. */
const PADDOCK_EDITOR = new Set(["prop-16", "prop-325", "prop-6060"]);

function lotVisible(lot: Lot, filter: LotStatus | "all", acreFilter: string) {
  if (filter !== "all" && lot.status !== filter) return false;
  if (acreFilter === "all") return true;
  if (acreFilter === "stall") {
    return !(lot.lotType === "acre" || (lot.acres != null && lot.acres >= 0.25));
  }
  return Math.abs(effectiveAcres(lot) - Number(acreFilter)) < 0.01;
}

export default function LotsPage() {
  const { propertyId, properties, refreshProperties } = useApp();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"map" | "grid">("map");
  const [filter, setFilter] = useState<LotStatus | "all">("all");
  const [acreFilter, setAcreFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Yard chosen for the site-plan map (independent when header is “All yards”). */
  const [mapYardId, setMapYardId] = useState<string>(
    SITE_PLAN_OPTIONS[0].propertyId,
  );
  const [customId, setCustomId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spacing, setSpacing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [redraw, setRedraw] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [dropSpace, setDropSpace] = useState<YardSpace | null>(null);

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
  const lotHold = useRef(selected);
  if (selected) lotHold.current = selected;
  const lotOn = usePresence(Boolean(selected), 180);
  const lot = selected ?? lotHold.current;

  const activePlan = useMemo(() => {
    const fromTab = SITE_PLAN_OPTIONS.find((o) => o.propertyId === mapYardId);
    if (fromTab) return fromTab;
    return resolveSitePlan(propertyId, mapYardId);
  }, [mapYardId, propertyId]);

  useEffect(() => {
    if (propertyId === "all") return;
    if (propertyId.startsWith("yard-")) {
      setCustomId(propertyId);
      setAdding(false);
      setEditingId(null);
      setSpacing(false);
      setMoving(false);
      setRedraw(false);
      return;
    }
    const hit = SITE_PLAN_OPTIONS.find((o) => o.propertyId === propertyId);
    if (hit) {
      setMapYardId(hit.propertyId);
      setCustomId(null);
      setAdding(false);
      setEditingId(null);
      setSpacing(false);
      setMoving(false);
      setRedraw(false);
    }
  }, [propertyId]);

  const { data: yardRows } = useQuery({
    queryKey: queryKeys.yards(),
    queryFn: () => endpoints.yards(),
  });
  const yards = yardRows ?? [];
  const moved = useRef(false);

  useEffect(() => {
    if (!yardRows || moved.current) return;
    const local = loadYards();
    const missing = local.filter((yard) => !yardRows.some((row) => row.id === yard.id));
    if (!missing.length) {
      moved.current = true;
      if (local.length) saveYards([]);
      return;
    }
    moved.current = true;
    void (async () => {
      for (const yard of missing) await endpoints.saveYard(yard);
      saveYards([]);
      await refreshProperties();
      void queryClient.invalidateQueries({ queryKey: queryKeys.yards() });
      void queryClient.invalidateQueries({ queryKey: ["lots"] });
    })();
  }, [yardRows, queryClient, refreshProperties]);

  const customYard = yards.find((yard) => yard.id === customId) ?? null;
  const editing = yards.find((yard) => yard.id === editingId) ?? null;
  const people = (customers ?? []).map((item) => ({ id: item.id, name: item.name }));
  const spaceOpen = Boolean(customYard && spacing);
  const spaceOn = usePresence(spaceOpen, 180);
  const openSpace = customYard?.spaces?.find((item) => item.id === spaceId) ?? null;

  useEffect(() => {
    if (!spacing && !redraw) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (spacing) setSpacing(false);
      else if (redraw) setRedraw(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spacing, redraw]);

  useEffect(() => {
    if (!spaceOn.mounted) setSpaceId(null);
  }, [spaceOn.mounted]);

  function yardActions(inRedraw = false) {
    const paddockId =
      !customId && !adding && !editing && PADDOCK_EDITOR.has(activePlan.propertyId)
        ? activePlan.propertyId
        : null;
    if ((!customYard && !paddockId) || adding || editing) return null;
    const open = (mode: "add" | "move" | "draw") => {
      setSpaceId(null);
      if (paddockId) {
        if (!yards.some((yard) => yard.id === paddockId)) return;
        setView("map");
        setEditingId(null);
        setCustomId(paddockId);
        setSpacing(mode === "add");
        setMoving(mode === "move");
        setRedraw(mode === "draw");
        return;
      }
      if (mode === "add") {
        setMoving(false);
        setRedraw(false);
        setSpacing(true);
      } else if (mode === "move") {
        setSpacing(false);
        setMoving((on) => !on);
      } else {
        setSpacing(false);
        setMoving(false);
        setRedraw((on) => !on);
      }
    };
    return (
      <span className="inline-flex h-8 items-center rounded-full border border-[var(--border)] bg-white p-0.5 shadow-sm">
        <button
          type="button"
          className="h-7 rounded-full px-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--accent-soft)]"
          onClick={() => open("add")}
        >
          {text.blankYard.spaceTitle}
        </button>
        <button
          type="button"
          className={cn(
            "h-7 rounded-full px-3 text-xs font-semibold",
            moving ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
          )}
          onClick={() => open("move")}
        >
          {text.blankYard.move}
        </button>
        <button
          type="button"
          className={cn(
            "h-7 rounded-full px-3 text-xs font-semibold",
            inRedraw ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
          )}
          onClick={() => open("draw")}
        >
          {inRedraw ? text.blankYard.redrawDone : text.blankYard.redraw}
        </button>
      </span>
    );
  }

  function remember(next: AddedYard[]) {
    queryClient.setQueryData(queryKeys.yards(), next);
  }

  async function persistYard(yard: AddedYard, next: AddedYard[]) {
    await queryClient.cancelQueries({ queryKey: queryKeys.yards() });
    remember(next);
    await endpoints.saveYard(yard);
    await refreshProperties();
    void queryClient.invalidateQueries({ queryKey: ["lots"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.yards() });
  }

  function saveSpaces(spaces: YardSpace[]) {
    if (!customYard) return;
    const yard = { ...customYard, spaces };
    void persistYard(
      yard,
      yards.map((item) => (item.id === yard.id ? yard : item)),
    );
  }

  function removeSpace(id: string) {
    if (!customYard) return;
    const spaces = (customYard.spaces ?? []).map((item) =>
      item.id === id ? { ...item, archived: true } : item,
    );
    const yard = { ...customYard, spaces };
    void endpoints.archiveYardSpace(customYard.id, id).then(() =>
      persistYard(
        yard,
        yards.map((item) => (item.id === yard.id ? yard : item)),
      ),
    );
  }

  const planScoped = !customId && propertyId !== "all" && propertyId !== activePlan.propertyId;
  const { data: planRows } = useQuery({
    queryKey: queryKeys.lots(activePlan.propertyId),
    queryFn: () => endpoints.lots(activePlan.propertyId),
    enabled: planScoped,
  });
  const mapLots = useMemo(() => {
    const source = planScoped ? (planRows ?? []) : lots;
    return source.filter((lot) => lot.propertyId === activePlan.propertyId);
  }, [lots, planRows, planScoped, activePlan.propertyId]);

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
    const statuses = mapLots.map((lot) => lot.status);
    const total = statuses.length;
    const rented = statuses.filter(
      (status) => status === "occupied" || status === "available_soon" || status === "reserved",
    ).length;
    const available = statuses.filter((status) => status === "available").length;
    const soon = statuses.filter((status) => status === "available_soon").length;
    const rate = total ? Math.round((rented / total) * 100) : 0;
    return { total, rented, available, soon, rate };
  }, [mapLots]);

  const customOpen = useMemo(() => {
    const spaces = customYard ? liveSpaces(customYard) : [];
    const rented = spaces.filter((space) => {
      const status = space.status ?? "available";
      return status === "occupied" || status === "available_soon" || status === "reserved";
    }).length;
    const available = spaces.filter((space) => (space.status ?? "available") === "available").length;
    const soon = spaces.filter((space) => space.status === "available_soon").length;
    const rate = spaces.length ? Math.round((rented / spaces.length) * 100) : 0;
    return { total: spaces.length, available, soon, rate };
  }, [customYard]);

  const visible = lots.filter((l) => lotVisible(l, filter, acreFilter));

  const dimmedSpaces = useMemo(() => {
    const dim: Record<string, true> = {};
    if (filter === "all" && acreFilter === "all") return dim;
    for (const lot of mapLots) {
      if (!lotVisible(lot, filter, acreFilter)) dim[lot.number] = true;
    }
    return dim;
  }, [mapLots, filter, acreFilter]);

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
          <>
            <div className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                onClick={() => {
                  setView("map");
                  setCustomId(null);
                  setEditingId(null);
                  setSpacing(false);
                  setAdding(true);
                }}
              >
                {text.blankYard.add}
              </button>
              {customYard && !adding ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-medium",
                    editing ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]",
                  )}
                  onClick={() => {
                    setSpacing(false);
                    setEditingId(editing ? null : customYard.id);
                  }}
                >
                  {text.blankYard.edit}
                </button>
              ) : !customId && !adding && PADDOCK_EDITOR.has(activePlan.propertyId) ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => {
                    const id = activePlan.propertyId;
                    if (!yards.some((yard) => yard.id === id)) return;
                    setView("map");
                    setSpacing(false);
                    setMoving(false);
                    setRedraw(false);
                    setEditingId(null);
                    setCustomId(id);
                  }}
                >
                  {text.blankYard.edit}
                </button>
              ) : null}
            </div>
            <Segmented
              ariaLabel="Inventory view"
              thumb="elevated"
              value={view}
              onChange={setView}
              options={[
                { value: "map", label: "Site plan", icon: <Map className="h-4 w-4" aria-hidden /> },
                { value: "grid", label: "Grid", icon: <Grid3X3 className="h-4 w-4" aria-hidden /> },
              ]}
            />
          </>
        }
      />

      {!isPending && (
        <div className="mb-4 shrink-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition",
                  filter === s && "ring-2 ring-inset ring-[var(--accent)]",
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
        <>
          <div className={cn("flex min-h-[520px] flex-1 flex-col gap-3", view !== "map" && !(adding || editing) && "hidden")}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {SITE_PLAN_OPTIONS.map((opt) => (
                  <button
                    key={opt.propertyId}
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setEditingId(null);
                      setSpacing(false);
                      setMoving(false);
                      setRedraw(false);
                      setMapYardId(opt.propertyId);
                      setCustomId(null);
                    }}
                    className={cn(
                      "h-9 rounded-xl border px-3 text-xs font-semibold transition",
                      (customId === opt.propertyId ||
                        (!customId && !adding && activePlan.propertyId === opt.propertyId))
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                {yards.filter((yard) => yard.id.startsWith("yard-")).map((yard) => (
                  <span key={yard.id} className="inline-flex">
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(null);
                        setSpacing(false);
                        setMoving(false);
                        setRedraw(false);
                        setCustomId(yard.id);
                      }}
                      title={yard.name}
                      className={cn(
                        "h-9 rounded-xl border px-3 text-xs font-semibold transition",
                        customId === yard.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]",
                      )}
                    >
                      {yardTitle(yard.name)}
                    </button>
                  </span>
                ))}
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm">
                {customId || adding ? (
                  customOpen.total ? (
                    <>
                      <span className="font-semibold tabular-nums">{customOpen.rate}%</span>{" "}
                      <span className="text-[var(--muted)]">occupied</span>
                      <span className="mx-2 text-[var(--border)]">·</span>
                      <span className="text-[var(--muted)]">
                        {customOpen.available} open
                        {customOpen.soon > 0 ? ` · ${customOpen.soon} soon` : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--muted)]">{text.blankYard.empty}</span>
                  )
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col">
            {adding || editing ? (
              <AddYardForm
                key={editing?.id ?? "new"}
                yard={editing ?? undefined}
                onClose={() => {
                  setAdding(false);
                  setEditingId(null);
                }}
                onCreate={(yard) => {
                  const next = editing
                    ? yards.map((item) => (item.id === yard.id ? yard : item))
                    : [...yards, yard];
                  void persistYard(yard, next);
                  setAdding(false);
                  setEditingId(null);
                  setCustomId(yard.id);
                }}
                onRemove={
                  editing && editing.id.startsWith("yard-")
                    ? () => {
                        const next = yards.filter((item) => item.id !== editing.id);
                        remember(next);
                        void endpoints.archiveYard(editing.id).then(() => refreshProperties());
                        void queryClient.invalidateQueries({ queryKey: ["lots"] });
                        setEditingId(null);
                        setCustomId(null);
                        setSpacing(false);
                      }
                    : undefined
                }
              />
            ) : customYard ? (
              redraw ? (
                <InventoryDrawLayout
                  yard={customYard}
                  moving={moving}
                  onMove={(id, x, y) =>
                    saveSpaces(
                      (customYard.spaces ?? []).map((item) => (item.id === id ? { ...item, x, y } : item)),
                    )
                  }
                  onRemove={(id) => {
                    if (!customYard) return;
                    void endpoints.archiveYardSpace(customYard.id, id);
                  }}
                  actions={yardActions(true)}
                  onYardChange={(next) => {
                    const rolled = yards.map((item) => (item.id === next.id ? next : item));
                    remember(rolled);
                    void persistYard(next, rolled);
                  }}
                />
              ) : (
                <YardSolid
                  yard={{ ...customYard, spaces: liveSpaces(customYard) }}
                  moving={moving}
                  actions={yardActions(false)}
                  onOpen={(id) => {
                    setMoving(false);
                    setSpaceId(id);
                    setSpacing(true);
                  }}
                  onMove={(id, x, y) =>
                    saveSpaces(
                      (customYard.spaces ?? []).map((item) => (item.id === id ? { ...item, x, y } : item)),
                    )
                  }
                  onRemove={removeSpace}
                />
              )
            ) : (
            <YardSitePlanEmbed
              slug={activePlan.slug}
              actions={yardActions(false)}
              lots={mapLots}
              dimmedSpaces={dimmedSpaces}
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
            )}
            </div>
          </div>
          <div className={cn((view !== "grid" || adding || editing) && "hidden")}>
          {customYard && !adding && !editing ? (
            <div className="mb-3 flex justify-end">{yardActions(false)}</div>
          ) : null}
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {customYard
              ? liveSpaces(customYard).map((space) => (
                  <StaggerItem key={space.id}>
                    <Card>
                      <CardBody className="space-y-2 !p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 font-semibold"
                            onClick={() => {
                              setSpacing(true);
                              setSpaceId(space.id);
                            }}
                          >
                            <i className="h-2.5 w-2.5 rounded-full" style={{ background: spaceTone(space).fill }} />
                            {space.label}
                          </button>
                          <button
                            type="button"
                            aria-label={text.blankYard.spaceRemove}
                            className="grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setDropSpace(space)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          {text.blankYard[space.use]} · {text.blankYard.spaceStatus[space.status ?? "available"]}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {space.length} × {space.width} {text.blankYard.ft}
                        </p>
                        <p className="text-sm font-medium">
                          {formatCurrency(space.monthlyRate ?? 0)}
                          <span className="text-[var(--muted)]">/mo</span>
                        </p>
                        <p className="truncate text-[11px] text-[var(--muted)]">
                          {space.customerName || text.blankYard.spaceUnassigned}
                        </p>
                      </CardBody>
                    </Card>
                  </StaggerItem>
                ))
              : visible.map((lot) => {
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
          </div>
        </>
      ) : null}

      {spaceOn.mounted && customYard ? (
        <div
          className={cn(
            "fixed inset-0 z-50 flex justify-end bg-black/30",
            spaceOn.leaving ? "fade-out" : "fade-in",
          )}
          role="presentation"
          onClick={() => setSpacing(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openSpace ? `${text.blankYard.manageLot} ${openSpace.label}` : text.blankYard.spaceTitle}
            className={cn(
              "flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl",
              spaceOn.leaving ? "drawer-out pointer-events-none" : "drawer-in",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{text.blankYard.manageLot}</p>
                <h2 className="text-xl font-semibold">{openSpace?.label ?? text.blankYard.spaceTitle}</h2>
                {openSpace ? (
                  <p className="text-sm text-[var(--muted)]">
                    {text.blankYard[openSpace.use]} · {openSpace.length} × {openSpace.width} {text.blankYard.ft}
                  </p>
                ) : null}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSpacing(false)} aria-label={text.blankYard.spaceDone}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AddSpaces
              yard={customYard}
              space={openSpace}
              customers={people}
              onSave={(spaces) => {
                saveSpaces(spaces);
                setSpacing(false);
              }}
              onClear={() => setSpaceId(null)}
            />
          </div>
        </div>
      ) : null}

      {lotOn.mounted && lot && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex justify-end bg-black/30",
            lotOn.leaving ? "fade-out" : "fade-in",
          )}
          role="presentation"
          onClick={() => setSelectedId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Manage lot ${lot.number}`}
            className={cn(
              "flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl",
              lotOn.leaving ? "drawer-out pointer-events-none" : "drawer-in",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Manage lot
                </p>
                <h2 className="text-xl font-semibold">#{lot.number}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {lot.lotTypeLabel} · {lot.size}
                  {lot.acres != null ? ` · ${lot.acres} ac` : ""}
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
                <SelectMenu
                  ariaLabel="Status"
                  value={draftStatus}
                  onChange={(next) => setDraftStatus(next as LotStatus)}
                  options={(
                    [
                      "available",
                      "available_soon",
                      "occupied",
                      "reserved",
                      "maintenance",
                    ] as LotStatus[]
                  ).map((status) => ({
                    value: status,
                    label: statusLabel(status),
                  }))}
                />
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
                lot.customerName && (
                  <p className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm">
                    <span className="text-[var(--muted)]">
                      {draftStatus === "available_soon"
                        ? "Vacating"
                        : "Tenant"}
                      :{" "}
                    </span>
                    <span className="font-medium">{lot.customerName}</span>
                  </p>
                )}

              {draftStatus === "available" && lot.lastTenantName && (
                <p className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm">
                  <span className="text-[var(--muted)]">Last tenant: </span>
                  <span className="font-medium">{lot.lastTenantName}</span>
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
                <SelectMenu
                  ariaLabel="Assigned customer"
                  value={draftCustomer}
                  placeholder="Unassigned"
                  onChange={setDraftCustomer}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...assignableCustomers
                      .filter(
                        (customer) =>
                          !lot.propertyId ||
                          customer.propertyId === lot.propertyId,
                      )
                      .map((customer) => ({
                        value: customer.id,
                        label: customer.name,
                      })),
                  ]}
                />
              </label>

              {lot.qbItemName && (
                <p className="text-xs text-[var(--muted)]">
                  QuickBooks item: {lot.qbItemName}
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
      {dropSpace ? (
        <ConfirmDialog
          title={text.blankYard.spaceRemoveAsk}
          name={dropSpace.label}
          body={text.blankYard.spaceRemoveBody}
          confirm={text.blankYard.spaceRemoveYes}
          onCancel={() => setDropSpace(null)}
          onConfirm={() => {
            if (!customYard) return;
            const spaces = (customYard.spaces ?? []).map((item) =>
              item.id === dropSpace.id ? { ...item, archived: true } : item,
            );
            const yard = { ...customYard, spaces };
            void endpoints.archiveYardSpace(customYard.id, dropSpace.id).then(() =>
              persistYard(
                yard,
                yards.map((item) => (item.id === yard.id ? yard : item)),
              ),
            );
            if (spaceId === dropSpace.id) setSpacing(false);
            setDropSpace(null);
          }}
        />
      ) : null}
    </PageTransition>
  );
}
