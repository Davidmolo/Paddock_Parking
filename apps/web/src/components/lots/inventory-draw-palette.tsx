"use client";

import { text } from "@/constants/text";
import { cn } from "@/lib/utils";
import type { DrawStamp, YardMarkCategory, YardMarkShape } from "./yard-design-types";
import { drawCategoryLabel, drawShapeLabel } from "./inventory-draw-labels";

const CATEGORIES: YardMarkCategory[] = ["roads", "gates", "acres", "trees"];

const SHAPES: Record<YardMarkCategory, YardMarkShape[]> = {
  roads: ["road_h", "road_v", "road_ne", "road_nw", "road_t", "road_cross"],
  gates: ["gate_n", "gate_e", "gate_s", "gate_w"],
  acres: ["0.25", "0.5", "1", "2", "3", "4", "5"],
  trees: ["tree_single", "tree_row"],
};

type PaletteProps = {
  category: YardMarkCategory;
  onCategory: (cat: YardMarkCategory) => void;
  stamp: DrawStamp | null;
  onStamp: (stamp: DrawStamp | null) => void;
};

export function InventoryDrawPalette({ category, onCategory, stamp, onStamp }: PaletteProps) {
  const shapes = SHAPES[category] ?? SHAPES.roads;

  return (
    <aside className="flex w-[min(100%,320px)] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--ink)]">
          {text.blankYard.drawTitle ?? "Inventory draw"}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          {text.blankYard.drawHint ??
            "Drag a shape onto the yard, or select one and drag on the map."}
        </p>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)] p-2">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onCategory(item)}
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-semibold",
              category === item
                ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-muted)]",
            )}
          >
            {drawCategoryLabel(item)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ul className="grid grid-cols-2 gap-2">
          {shapes.map((shape) => {
            const active = stamp?.category === category && stamp.shape === shape;
            return (
              <li key={shape}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    const picked = { category, shape };
                    e.dataTransfer.setData("application/x-yard-stamp", JSON.stringify(picked));
                    e.dataTransfer.effectAllowed = "copy";
                    onStamp(picked);
                  }}
                  onClick={() => onStamp(active ? null : { category, shape })}
                  className={cn(
                    "flex h-16 w-full flex-col items-center justify-center rounded-xl border px-2 text-center text-xs font-semibold",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink)] hover:border-[var(--accent)]",
                  )}
                >
                  <ShapeIcon category={category} shape={shape} />
                  <span className="mt-1 leading-tight">{drawShapeLabel(shape)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {stamp ? (
        <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
          {text.blankYard.drawDragPlace ?? "Drag onto the yard. Green preview = OK · red = blocked."}
        </p>
      ) : (
        <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
          {text.blankYard.drawPick ?? "Drag a shape from the list onto the yard."}
        </p>
      )}
    </aside>
  );
}

function ShapeIcon({ category, shape }: { category: YardMarkCategory; shape: YardMarkShape }) {
  if (category === "roads") {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-10 text-[var(--muted)]" aria-hidden>
        {shape === "road_v" ? <rect x="17" y="2" width="6" height="20" fill="currentColor" /> : null}
        {shape === "road_h" ? <rect x="2" y="9" width="36" height="6" fill="currentColor" /> : null}
        {shape === "road_ne" ? <polygon points="4,20 36,4 30,10 10,20" fill="currentColor" /> : null}
        {shape === "road_nw" ? <polygon points="4,4 36,20 30,14 10,4" fill="currentColor" /> : null}
        {shape === "road_t" || shape === "road_cross" ? (
          <>
            <rect x="17" y="2" width="6" height="20" fill="currentColor" />
            <rect x="2" y="9" width="36" height="6" fill="currentColor" />
          </>
        ) : null}
      </svg>
    );
  }
  if (category === "gates") {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden>
        <rect x="4" y="4" width="16" height="14" fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.4" />
        <rect x="20" y="9" width="16" height="4" fill="#1d1d1f" />
      </svg>
    );
  }
  if (category === "acres") {
    return <span className="text-sm font-bold tabular-nums">{shape} ac</span>;
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600" aria-hidden>
      <circle cx="12" cy="8" r="6" fill="currentColor" />
      <rect x="10.5" y="12" width="3" height="8" fill="#8a6a45" />
    </svg>
  );
}