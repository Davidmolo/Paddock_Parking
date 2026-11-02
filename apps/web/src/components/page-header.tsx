"use client";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-ink)]">
          Paddock Parking
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {action ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:max-w-[min(100%,28rem)] lg:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}
