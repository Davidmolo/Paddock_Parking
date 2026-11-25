"use client";

import { useEffect, useRef, useState } from "react";
import type { AddedYard } from "./types";
import type { DrawStamp, YardMarkCategory } from "./yard-design-types";
import { InventoryDrawPalette } from "./inventory-draw-palette";
import { YardSolid, liveSpaces } from "./blank-yard";
import { applyDrawStampPlacement, type StampPlacement } from "./inventory-draw-actions";

type LayoutProps = {
  yard: AddedYard;
  actions?: React.ReactNode;
  moving?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  onRemove?: (id: string) => void;
  onYardChange: (yard: AddedYard) => void;
};

const SAVE_MS = 650;

export function InventoryDrawLayout({ yard, actions, moving, onMove, onRemove, onYardChange }: LayoutProps) {
  const [category, setCategory] = useState<YardMarkCategory>("roads");
  const [stamp, setStamp] = useState<DrawStamp | null>(null);
  const [draft, setDraft] = useState(yard);
  const latest = useRef(yard);
  const saveAt = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = yard;
    setDraft(yard);
  }, [yard.id]);

  useEffect(
    () => () => {
      if (saveAt.current) clearTimeout(saveAt.current);
    },
    [],
  );

  function queueSave(next: AddedYard) {
    latest.current = next;
    setDraft(next);
    if (saveAt.current) clearTimeout(saveAt.current);
    saveAt.current = setTimeout(() => onYardChange(latest.current), SAVE_MS);
  }

  function placeAt(picked: DrawStamp, placement: StampPlacement) {
    const next = applyDrawStampPlacement(latest.current, picked, placement);
    if (next === latest.current) return;
    queueSave(next);
  }

  return (
    <div className="flex h-[min(78vh,720px)] min-h-[420px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[#dde7d0]">
      <div className="min-w-0 flex-1">
        <YardSolid
          yard={{ ...draft, spaces: liveSpaces(draft) }}
          layoutDraw
          moving={moving}
          stamp={moving ? null : stamp}
          onStampPick={setStamp}
          onStampAt={(picked, placement) => {
            setStamp(picked);
            placeAt(picked, placement);
          }}
          onMove={(id, x, y) => {
            const spaces = (latest.current.spaces ?? []).map((item) =>
              item.id === id ? { ...item, x, y } : item,
            );
            queueSave({ ...latest.current, spaces });
            onMove?.(id, x, y);
          }}
          onRemove={(id) => {
            const spaces = (latest.current.spaces ?? []).map((item) =>
              item.id === id ? { ...item, archived: true } : item,
            );
            const next = { ...latest.current, spaces };
            latest.current = next;
            setDraft(next);
            if (saveAt.current) clearTimeout(saveAt.current);
            onYardChange(next);
            onRemove?.(id);
          }}
          onMarkMove={(id, x, y) => {
            const marks = (latest.current.marks ?? []).map((item) =>
              item.id === id ? { ...item, x, y } : item,
            );
            queueSave({ ...latest.current, marks });
          }}
          onMarkRemove={(id) => {
            const marks = (latest.current.marks ?? []).filter((item) => item.id !== id);
            const next = { ...latest.current, marks };
            latest.current = next;
            setDraft(next);
            if (saveAt.current) clearTimeout(saveAt.current);
            onYardChange(next);
          }}
          actions={actions}
        />
      </div>
      <InventoryDrawPalette
        category={category}
        onCategory={setCategory}
        stamp={stamp}
        onStamp={setStamp}
      />
    </div>
  );
}