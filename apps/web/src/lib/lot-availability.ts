import type { Lot } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export function formatShortDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Days since vacantSince (for available spots). */
export function vacantDays(lot: Lot): number | null {
  if (lot.status !== "available" || !lot.vacantSince) return null;
  const start = new Date(`${lot.vacantSince}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const ms = Date.now() - start.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/**
 * Hover / map detail line.
 * - available_soon → date + who is vacating (current tenant)
 * - available → vacant N days + last tenant if we still know them
 */
export function lotHoverDetail(
  lot: Lot,
  opts?: { tenantName?: string; rate?: number },
): string {
  const rate = formatCurrency(opts?.rate ?? lot.monthlyRate);
  const current =
    opts?.tenantName?.trim() || lot.customerName?.trim() || undefined;
  const last = lot.lastTenantName?.trim() || undefined;

  if (lot.status === "available_soon") {
    const when = formatShortDate(lot.availableOn) ?? "date TBD";
    const vacating = current
      ? ` · Vacating: ${current}`
      : last
        ? ` · Was: ${last}`
        : "";
    return `Available on ${when}${vacating} · ${rate}/mo`;
  }

  if (lot.status === "available") {
    const days = vacantDays(lot);
    const since = formatShortDate(lot.vacantSince);
    const who = last
      ? ` · Last tenant: ${last}`
      : current
        ? ` · Was: ${current}`
        : "";
    if (days != null && since) {
      return `Vacant ${days} day${days === 1 ? "" : "s"} (since ${since})${who} · ${rate}/mo`;
    }
    if (days != null) {
      return `Vacant ${days} day${days === 1 ? "" : "s"}${who} · ${rate}/mo`;
    }
    return `Available${who} · ${rate}/mo`;
  }

  if (current) {
    return `${current} · ${rate}/mo`;
  }
  return `${rate}/mo · click to edit`;
}
