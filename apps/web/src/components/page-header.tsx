"use client";

import { useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { useSetScreenTitle } from "@/components/screen-title";

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
  const setScreenTitle = useSetScreenTitle();

  useLayoutEffect(() => {
    setScreenTitle(title);
  }, [setScreenTitle, title]);

  if (!subtitle && !action) return null;

  return (
    <div
      className={cn(
        "mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {subtitle ? (
        <p className="min-w-0 flex-1 text-[13px] leading-5 text-[var(--muted)]">
          {subtitle}
        </p>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
      {action ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:max-w-[min(100%,28rem)] lg:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}
