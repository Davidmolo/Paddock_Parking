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
        "mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 max-w-3xl text-[13px] leading-5 text-[var(--muted)]">
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
