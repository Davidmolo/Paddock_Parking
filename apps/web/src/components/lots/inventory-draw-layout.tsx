"use client";

import { useEffect, useRef, useState } from "react";
import { text } from "@/constants/text";
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
  const [labelText, setLabelText] = useState(text.blankYard.entrance);
  const [labelId, setLabelId] = useState<string | null>(null);
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

  function setWords(value: string) {
    setLabelText(value);
    setStamp((current) => (current?.category === "labels" ? { ...current, text: value } : current));
    if (!labelId) return;
    const marks = latest.current.marks ?? [];
    if (marks.some((item) => item.id === labelId)) {
      queueSave({ ...latest.current, marks: marks.map((item) => (item.id === labelId ? { ...item, text: value } : item)) });
      return;
    }
    queueSave({
      ...latest.current,
      spaces: (latest.current.spaces ?? []).map((item) => (item.id === labelId ? { ...item, text: value } : item)),
    });
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
            if (labelId === id) setLabelId(null);
            const marks = (latest.current.marks ?? []).filter((item) => item.id !== id);
            const next = { ...latest.current, marks };
            latest.current = next;
            setDraft(next);
            if (saveAt.current) clearTimeout(saveAt.current);
            onYardChange(next);
          }}
          onLabel={(id) => {
            const mark = latest.current.marks?.find((item) => item.id === id);
            const space = latest.current.spaces?.find((item) => item.id === id);
            if (!mark && !space) return;
            setCategory("labels");
            setLabelId(id);
            setLabelText(mark ? mark.text ?? "" : space?.text ?? "");
            setStamp(null);
          }}
          actions={actions}
        />
      </div>
      <InventoryDrawPalette
        category={category}
        onCategory={(next) => {
          setCategory(next);
          if (next === "labels") setStamp(null);
        }}
        stamp={stamp}
        onStamp={setStamp}
        labelText={labelText}
        onLabelText={setWords}
        onLabelTarget={setLabelId}
      />
    </div>
  );
}