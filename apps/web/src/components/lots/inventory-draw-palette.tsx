"use client";

import type { DragEvent } from "react";
import { text } from "@/constants/text";
import { cn } from "@/lib/utils";
import type { DrawStamp, YardMarkCategory, YardMarkShape } from "./yard-design-types";
import { drawCategoryLabel, drawShapeLabel } from "./inventory-draw-labels";

const BLANK_DRAG =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const CATEGORIES: YardMarkCategory[] = ["roads", "gates", "acres", "trees", "labels"];

const SHAPES: Record<YardMarkCategory, YardMarkShape[]> = {
  roads: ["road_h", "road_v", "road_ne", "road_nw", "road_se", "road_sw", "road_tn", "road_te", "road_ts", "road_tw", "road_cross"],
  gates: ["gate"],
  acres: ["0.25", "0.5", "1", "2", "3", "4", "5"],
  trees: ["tree_single", "tree_row"],
  labels: ["entrance"],
};

type PaletteProps = {
  category: YardMarkCategory;
  onCategory: (cat: YardMarkCategory) => void;
  stamp: DrawStamp | null;
  onStamp: (stamp: DrawStamp | null) => void;
  labelText: string;
  onLabelText: (value: string) => void;
  onLabelTarget: (id: string | null) => void;
};

export function InventoryDrawPalette({ category, onCategory, stamp, onStamp, labelText, onLabelText, onLabelTarget }: PaletteProps) {
  const shapes = SHAPES[category] ?? SHAPES.roads;

  function pickGate(event: DragEvent, facing: "s" | "e") {
    const picked = { category: "gates" as const, shape: "gate" as const, facing };
    event.dataTransfer.setData("application/x-yard-stamp", JSON.stringify(picked));
    event.dataTransfer.effectAllowed = "move";
    const ghost = new Image();
    ghost.src = BLANK_DRAG;
    event.dataTransfer.setDragImage(ghost, 0, 0);
    onStamp(picked);
  }

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
        {category === "gates" ? (
          <ul className="grid grid-cols-2 gap-2">
            <GateFace
              label={text.blankYard.gateFaceY}
              alongX={false}
              active={stamp?.shape === "gate" && stamp.facing !== "e" && stamp.facing !== "w"}
              onPick={(event) => pickGate(event, "s")}
              onClick={() => onStamp(stamp?.shape === "gate" && stamp.facing !== "e" && stamp.facing !== "w" ? null : { category: "gates", shape: "gate", facing: "s" })}
            />
            <GateFace
              label={text.blankYard.gateFaceX}
              alongX
              active={stamp?.shape === "gate" && (stamp.facing === "e" || stamp.facing === "w")}
              onPick={(event) => pickGate(event, "e")}
              onClick={() => onStamp(stamp?.shape === "gate" && (stamp.facing === "e" || stamp.facing === "w") ? null : { category: "gates", shape: "gate", facing: "e" })}
            />
          </ul>
        ) : null}
        {category === "labels" ? (
          <label className="mb-3 block text-xs font-semibold text-[var(--ink)]">
            {text.blankYard.labelWords}
            <input
              value={labelText}
              onChange={(event) => onLabelText(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm font-medium"
            />
            <span className="mt-1 block font-normal leading-5 text-[var(--muted)]">{text.blankYard.labelHint}</span>
          </label>
        ) : null}
        {category === "gates" ? null : (
        <ul className="grid grid-cols-2 gap-2">
          {shapes.map((shape) => {
            const active = stamp?.category === category && stamp.shape === shape;
            return (
              <li key={shape}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    const picked = { category, shape, text: category === "labels" ? labelText : undefined };
                    e.dataTransfer.setData("application/x-yard-stamp", JSON.stringify(picked));
                    e.dataTransfer.effectAllowed = "move";
                    const ghost = new Image();
                    ghost.src = BLANK_DRAG;
                    e.dataTransfer.setDragImage(ghost, 0, 0);
                    onLabelTarget(null);
                    onStamp(picked);
                  }}
                  onClick={() => {
                    onLabelTarget(null);
                    onStamp(active ? null : { category, shape, text: category === "labels" ? labelText : undefined });
                  }}
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
        )}
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

function GateFace({
  label,
  alongX,
  active,
  onPick,
  onClick,
}: {
  label: string;
  alongX: boolean;
  active: boolean;
  onPick: (event: DragEvent) => void;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={onPick}
        onClick={onClick}
        className={cn(
          "flex h-16 w-full flex-col items-center justify-center rounded-xl border px-2 text-center text-xs font-semibold",
          active
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
            : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink)] hover:border-[var(--accent)]",
        )}
      >
        <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden>
          {alongX ? (
            <>
              <rect x="8" y="2" width="24" height="5" fill="#2b3038" />
              <rect x="8" y="17" width="24" height="5" fill="#2b3038" />
            </>
          ) : (
            <>
              <rect x="6" y="4" width="6" height="16" fill="#2b3038" />
              <rect x="28" y="4" width="6" height="16" fill="#2b3038" />
            </>
          )}
        </svg>
        <span className="mt-1 leading-tight">{label}</span>
      </button>
    </li>
  );
}

function ShapeIcon({ category, shape }: { category: YardMarkCategory; shape: YardMarkShape }) {
  if (category === "roads") {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-10 text-[var(--muted)]" aria-hidden>
        {shape === "road_v" || shape === "road_te" || shape === "road_tw" || shape === "road_cross" ? (
          <rect x="17" y="2" width="6" height="20" fill="currentColor" />
        ) : null}
        {shape === "road_h" || shape === "road_tn" || shape === "road_ts" || shape === "road_t" || shape === "road_cross" ? (
          <rect x="2" y="9" width="36" height="6" fill="currentColor" />
        ) : null}
        {shape === "road_ne" ? (
          <>
            <rect x="4" y="4" width="32" height="6" fill="currentColor" />
            <rect x="30" y="4" width="6" height="16" fill="currentColor" />
          </>
        ) : null}
        {shape === "road_nw" ? (
          <>
            <rect x="4" y="4" width="32" height="6" fill="currentColor" />
            <rect x="4" y="4" width="6" height="16" fill="currentColor" />
          </>
        ) : null}
        {shape === "road_se" ? (
          <>
            <rect x="4" y="14" width="32" height="6" fill="currentColor" />
            <rect x="30" y="4" width="6" height="16" fill="currentColor" />
          </>
        ) : null}
        {shape === "road_sw" ? (
          <>
            <rect x="4" y="14" width="32" height="6" fill="currentColor" />
            <rect x="4" y="4" width="6" height="16" fill="currentColor" />
          </>
        ) : null}
        {shape === "road_tn" ? <rect x="17" y="2" width="6" height="10" fill="currentColor" /> : null}
        {shape === "road_ts" || shape === "road_t" ? <rect x="17" y="12" width="6" height="10" fill="currentColor" /> : null}
        {shape === "road_te" ? <rect x="20" y="9" width="16" height="6" fill="currentColor" /> : null}
        {shape === "road_tw" ? <rect x="4" y="9" width="16" height="6" fill="currentColor" /> : null}
      </svg>
    );
  }
  if (category === "gates") {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden>
        <rect x="6" y="6" width="6" height="12" fill="#2b3038" />
        <rect x="28" y="6" width="6" height="12" fill="#2b3038" />
      </svg>
    );
  }
  if (category === "acres") {
    return <span className="text-sm font-bold tabular-nums">{shape} ac</span>;
  }
  if (category === "labels") return null;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600" aria-hidden>
      <circle cx="12" cy="8" r="6" fill="currentColor" />
      <rect x="10.5" y="12" width="3" height="8" fill="#8a6a45" />
    </svg>
  );
}