import Link from "next/link";
import { text } from "@/constants/text";
import type { BookingRowProps, BookingTone } from "./types";
import { BookingTile } from "./booking-tile";

export function bookingTone(decision: string): BookingTone {
  if (decision === "approved" || decision === "conditional") return "success";
  if (decision === "denied") return "danger";
  if (decision === "pending") return "warning";
  return "neutral";
}

export function BookingRow({ items, viewAllHref }: BookingRowProps) {
  if (items.length === 0) return null;
  const shown = items.slice(0, 2);
  const rest = items.length - shown.length;
  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--ink)]">{text.admin.bookings}</h2>
        <Link href={viewAllHref} className="text-sm font-semibold text-[var(--accent-ink)]">
          {text.admin.viewAll}{rest > 0 ? ` · ${rest}` : ""}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {shown.map((item) => (
          <BookingTile key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export { BookingTile } from "./booking-tile";
