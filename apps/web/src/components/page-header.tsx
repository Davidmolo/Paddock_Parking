"use client";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-ink)]">
          Paddock Parking
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
