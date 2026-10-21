"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-[var(--surface-muted)] via-[var(--surface)] to-[var(--surface-muted)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
