"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lot } from "@/lib/api";
import { lotHoverDetail } from "@/lib/lot-availability";
import { layoutYardPlan, ACRE_COLORS, effectiveAcres } from "@/lib/lot-layout";
import { cn } from "@/lib/utils";

type TenantInfo = {
  id: string;
  name: string;
  monthlyRate: number;
  leaseStart?: string;
};

type Props = {
  lots: Lot[];
  tenantsByLotId: Record<string, TenantInfo | undefined>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  colorMode: "acres" | "status";
};

const STATUS_FILL: Record<Lot["status"], string> = {
  occupied: "#34d399",
  available: "#7dd3fc",
  available_soon: "#a78bfa",
  reserved: "#fbbf24",
  maintenance: "#fb7185",
};

export function YardMap2D({
  lots,
  tenantsByLotId,
  selectedId,
  onSelect,
  colorMode,
}: Props) {
  const plan = useMemo(() => layoutYardPlan(lots), [lots]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { width, depth } = plan.bounds;
  const pad = 1.2;
  const viewW = width + pad * 2;
  const viewH = depth + pad * 2;
  const lotById = useMemo(() => new Map(lots.map((l) => [l.id, l])), [lots]);

  const hoverLot = hoverId ? lotById.get(hoverId) : null;
  const hoverTenant = hoverId ? tenantsByLotId[hoverId] : undefined;
  const hoverFp = hoverId
    ? plan.footprints.find((f) => f.lotId === hoverId)
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#e8edf2]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-white/80 px-4 py-2.5 text-xs text-[var(--muted)]">
        <span className="font-medium text-[var(--ink)]">
          Site plan (blueprint)
        </span>
        <span>Hover a pad · click for details · open tenant</span>
      </div>

      <div className="relative p-3 sm:p-4">
        <svg
          viewBox={`${-pad} ${-pad} ${viewW} ${viewH}`}
          className="mx-auto h-[min(62vh,560px)] w-full min-h-[420px]"
          role="img"
          aria-label="Yard site plan"
        >
          {/* Asphalt / yard outline — long rectangular site feel */}
          <rect
            x={0}
            y={0}
            width={width}
            height={depth}
            rx={0.15}
            fill="#c5ced8"
            stroke="#0a1628"
            strokeWidth={0.08}
          />
          {/* Light blueprint grid */}
          {Array.from({ length: Math.ceil(width) + 1 }).map((_, i) => (
            <line
              key={`vx-${i}`}
              x1={i}
              y1={0}
              x2={i}
              y2={depth}
              stroke="#0a1628"
              strokeOpacity={0.06}
              strokeWidth={0.03}
            />
          ))}
          {Array.from({ length: Math.ceil(depth) + 1 }).map((_, i) => (
            <line
              key={`hz-${i}`}
              x1={0}
              y1={i}
              x2={width}
              y2={i}
              stroke="#0a1628"
              strokeOpacity={0.06}
              strokeWidth={0.03}
            />
          ))}

          {plan.features
            .filter((f) => f.kind === "drive" || f.kind === "gate")
            .map((f) => (
              <rect
                key={f.id}
                x={f.x - f.w / 2}
                y={f.z - f.d / 2}
                width={f.w}
                height={f.d}
                fill={f.kind === "gate" ? "#94a3b8" : "#a8b4c0"}
                stroke="#64748b"
                strokeWidth={0.04}
              />
            ))}

          {plan.footprints.map((fp) => {
            const lot = lotById.get(fp.lotId);
            if (!lot) return null;
            const acres = effectiveAcres(lot);
            const fill =
              colorMode === "status"
                ? STATUS_FILL[lot.status]
                : ACRE_COLORS[String(acres)] ??
                  (fp.kind === "stall" ? "#94a3b8" : "#60a5fa");
            const selected = selectedId === fp.lotId;
            const hovered = hoverId === fp.lotId;
            return (
              <g key={fp.lotId}>
                <rect
                  x={fp.x - fp.w / 2}
                  y={fp.z - fp.d / 2}
                  width={fp.w}
                  height={fp.d}
                  rx={0.08}
                  fill={fill}
                  fillOpacity={hovered || selected ? 0.95 : 0.82}
                  stroke={selected ? "#0a1628" : "#0f172a"}
                  strokeWidth={selected ? 0.12 : hovered ? 0.1 : 0.05}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverId(fp.lotId)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() =>
                    onSelect(selectedId === fp.lotId ? null : fp.lotId)
                  }
                />
                <text
                  x={fp.x}
                  y={fp.z}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(0.35, fp.w * 0.22)}
                  fill="#0a1628"
                  fontWeight={600}
                  className="pointer-events-none select-none"
                >
                  {lot.number}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverLot && hoverFp && (
          <div
            className={cn(
              "pointer-events-none absolute z-20 max-w-xs rounded-xl border border-[var(--border)] bg-white p-3 shadow-lg",
              "left-1/2 top-16 -translate-x-1/2 sm:left-auto sm:right-6 sm:top-16 sm:translate-x-0",
            )}
          >
            <p className="text-sm font-semibold text-[var(--ink)]">
              Lot {hoverLot.number}
              {hoverLot.lotTypeLabel ? ` · ${hoverLot.lotTypeLabel}` : ""}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {lotHoverDetail(hoverLot, {
                tenantName: hoverTenant?.name,
                rate: hoverTenant?.monthlyRate ?? hoverLot.monthlyRate,
              })}
            </p>
            {hoverTenant ? (
              <Link
                href={`/customers/${hoverTenant.id}`}
                className="pointer-events-auto mt-2 inline-flex text-xs font-semibold text-[var(--accent-ink)] underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open customer →
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
