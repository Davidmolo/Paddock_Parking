"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lot } from "@/lib/api";
import {
  SITE_PLAN_OPTIONS,
  sitePlanUrl,
  type SitePlanSlug,
} from "@/lib/site-plans";
import { lotHoverDetail } from "@/lib/lot-availability";
import { cn } from "@/lib/utils";

type TenantInfo = {
  id: string;
  name: string;
  monthlyRate: number;
  leaseStart?: string;
};

type Props = {
  slug: SitePlanSlug;
  lots: Lot[];
  tenantsByLotId: Record<string, TenantInfo | undefined>;
  selectedId: string | null;
  onSelectByNumber: (spaceNumber: string) => void;
};

/** Preloaded Inventory site plans. Click opens the edit drawer only (no public booking). */
export function YardSitePlanEmbed({
  slug,
  lots,
  tenantsByLotId,
  selectedId,
  onSelectByNumber,
}: Props) {
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const readyRef = useRef<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const byNumber = useMemo(() => {
    const m = new Map<string, Lot>();
    for (const lot of lots) m.set(lot.number, lot);
    return m;
  }, [lots]);

  const selectedNumber = useMemo(() => {
    if (!selectedId) return null;
    return lots.find((l) => l.id === selectedId)?.number ?? null;
  }, [lots, selectedId]);

  function pushStatuses(targetSlug: SitePlanSlug) {
    const win = iframeRefs.current[targetSlug]?.contentWindow;
    if (!win || !readyRef.current[targetSlug]) return;

    const map: Record<string, Lot["status"]> = {};
    const meta: Record<
      string,
      {
        statusLabel: string;
        tenant?: string;
        rate?: number;
        detail?: string;
      }
    > = {};

    for (const [number, lot] of byNumber) {
      map[number] = lot.status;
      const tenant = tenantsByLotId[lot.id];
      const statusLabel =
        lot.status === "available"
          ? "Available"
          : lot.status === "available_soon"
            ? "Available soon"
            : lot.status === "occupied"
              ? "Occupied"
              : lot.status === "reserved"
                ? "Reserved"
                : "Maintenance";

      const detail = lotHoverDetail(lot, {
        tenantName: tenant?.name,
        rate: tenant?.monthlyRate ?? lot.monthlyRate,
      });

      meta[number] = {
        statusLabel,
        tenant: tenant?.name,
        rate: tenant?.monthlyRate ?? lot.monthlyRate,
        detail,
      };
    }

    win.postMessage({ type: "yp:statuses", map, meta }, "*");
  }

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "yp:ready") {
        const match = SITE_PLAN_OPTIONS.find((o) => {
          const frame = iframeRefs.current[o.slug];
          return frame?.contentWindow === ev.source;
        });
        if (match) {
          readyRef.current[match.slug] = true;
          setLoaded((prev) => ({ ...prev, [match.slug]: true }));
          if (match.slug === slug) pushStatuses(match.slug);
        }
        return;
      }
      if (data.type === "yp:select" && typeof data.id === "string") {
        const match = SITE_PLAN_OPTIONS.find((o) => {
          const frame = iframeRefs.current[o.slug];
          return frame?.contentWindow === ev.source;
        });
        if (match && match.slug === slug) onSelectByNumber(data.id);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectByNumber, byNumber, tenantsByLotId, slug]);

  useEffect(() => {
    pushStatuses(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, tenantsByLotId, selectedNumber, slug]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[#dde7d0]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-white/90 px-4 py-2.5 text-xs text-[var(--muted)]">
        <span className="font-medium text-[var(--ink)]">Site plan</span>
        <span>Hover for details · click to edit space</span>
      </div>
      <div className="relative h-[min(72vh,680px)] min-h-[520px] w-full bg-[#dde7d0]">
        {!loaded[slug] && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#dde7d0] text-sm text-[var(--muted)]">
            Loading site plan…
          </div>
        )}
        {SITE_PLAN_OPTIONS.map((opt) => (
          <iframe
            key={opt.slug}
            ref={(el) => {
              iframeRefs.current[opt.slug] = el;
            }}
            title={`Yard site plan ${opt.label}`}
            src={sitePlanUrl(opt.slug)}
            className={cn(
              "absolute inset-0 h-full w-full border-0 bg-[#dde7d0] transition-opacity duration-200",
              opt.slug === slug
                ? "z-[1] opacity-100"
                : "pointer-events-none z-0 opacity-0",
            )}
            onLoad={() => {
              window.setTimeout(() => {
                readyRef.current[opt.slug] = true;
                setLoaded((prev) => ({ ...prev, [opt.slug]: true }));
                if (opt.slug === slug) pushStatuses(opt.slug);
              }, 200);
            }}
          />
        ))}
      </div>
    </div>
  );
}
