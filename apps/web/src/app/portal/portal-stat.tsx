import { cn } from "@/lib/utils";
import type { PortalStatProps } from "./types";

export function PortalStat({ label, value, icon: Icon }: PortalStatProps) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-[var(--ink)] px-3.5 py-3 text-white shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[12px] font-medium text-white/70">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
      </div>
      <p className={cn("mt-2 line-clamp-2 text-base font-semibold leading-snug tracking-tight")}>
        {value}
      </p>
    </div>
  );
}
