"use client";

import { Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { text } from "@/constants/text";

export function ConfirmDialog({
  title,
  name,
  body,
  confirm,
  onCancel,
  onConfirm,
  tone = "danger",
}: {
  title: string;
  name?: string;
  body: string;
  confirm: string;
  onCancel: () => void;
  onConfirm: () => void;
  tone?: "danger" | "neutral";
}) {
  const Icon = tone === "neutral" ? Mail : Trash2;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${tone === "neutral" ? "bg-[var(--accent)]/15 text-[var(--ink)]" : "bg-rose-50 text-rose-600"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 id="confirm-title" className="mt-4 text-lg font-semibold text-[var(--ink)]">{title}</h2>
        {name ? <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{name}</p> : null}
        <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            {text.blankYard.deleteCancel}
          </Button>
          <Button type="button" variant={tone === "neutral" ? "primary" : "danger"} className="flex-1" onClick={onConfirm}>
            {confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
