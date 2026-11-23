import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BookingTileProps } from "./types";

export function BookingTile({ item }: BookingTileProps) {
  return (
    <Link
      href={item.href}
      className="block min-w-[17rem] flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-[var(--ink)]">{item.title}</p>
        <Badge tone={item.tone}>{item.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">{item.meta}</p>
    </Link>
  );
}
