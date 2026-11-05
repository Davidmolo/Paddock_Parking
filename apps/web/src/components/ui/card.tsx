"use client";

import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  glow?: boolean;
  interactive?: boolean;
};

export function Card({
  className,
  glow,
  interactive = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]",
        interactive &&
          "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)]",
        glow &&
          "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.12),transparent_45%)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3.5 py-2.5 sm:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-3.5 sm:p-4", className)}>{children}</div>;
}
