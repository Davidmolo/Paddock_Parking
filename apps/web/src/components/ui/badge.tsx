"use client";

import { cn } from "@/lib/utils";

const tones = {
  success: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20",
  warning: "bg-amber-500/12 text-amber-800 ring-amber-500/20",
  danger: "bg-rose-500/12 text-rose-700 ring-rose-500/20",
  info: "bg-sky-500/12 text-sky-700 ring-sky-500/20",
  neutral: "bg-slate-500/10 text-slate-700 ring-slate-500/15",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-ink)] ring-[var(--accent)]/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
