"use client";

import { cn } from "@/lib/utils";

/** Instant page shell — no blur/filters (those tank switch performance). */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-y-auto overscroll-none pb-6 [&>*]:min-h-min [&>*]:shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("stagger-fast", className)}>{children}</div>;
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("stagger-item", className)}>{children}</div>;
}
