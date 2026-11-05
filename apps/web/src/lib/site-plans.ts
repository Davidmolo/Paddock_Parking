/**
 * Inventory site-plan maps (apps/web/public/yard-maps) — admin ops only.
 * Live yards (David): Paddock 16 / 325 / 6060. No Anthem or 51 yet.
 */

import { LIVE_PROPERTY_ORDER, type LivePropertyId } from "@/lib/yards";

export type SitePlanSlug = "elwood" | "325" | "6060";

export type SitePlanOption = {
  propertyId: LivePropertyId;
  slug: SitePlanSlug;
  label: string;
};

export const SITE_PLAN_OPTIONS: SitePlanOption[] = [
  { propertyId: "prop-16", slug: "elwood", label: "Paddock 16" },
  { propertyId: "prop-325", slug: "325", label: "Paddock 325" },
  { propertyId: "prop-6060", slug: "6060", label: "Paddock 6060" },
];

export const PROPERTY_SITE_PLAN: Record<LivePropertyId, SitePlanSlug> =
  Object.fromEntries(
    SITE_PLAN_OPTIONS.map((o) => [o.propertyId, o.slug]),
  ) as Record<LivePropertyId, SitePlanSlug>;

export function sitePlanUrl(slug: SitePlanSlug): string {
  return `/yard-maps/${slug}.html?ops=1&v=10`;
}

export function sitePlanForProperty(
  propertyId: string | "all",
): SitePlanSlug | null {
  if (propertyId === "all") return null;
  return PROPERTY_SITE_PLAN[propertyId as LivePropertyId] ?? null;
}

/** Resolve which yard map to show — prefers header filter, else first plan. */
export function resolveSitePlan(
  propertyId: string | "all",
  preferredPropertyId?: string | null,
): SitePlanOption {
  if (propertyId !== "all") {
    const hit = SITE_PLAN_OPTIONS.find((o) => o.propertyId === propertyId);
    if (hit) return hit;
  }
  if (preferredPropertyId) {
    const hit = SITE_PLAN_OPTIONS.find(
      (o) => o.propertyId === preferredPropertyId,
    );
    if (hit) return hit;
  }
  const first =
    SITE_PLAN_OPTIONS.find((o) => o.propertyId === LIVE_PROPERTY_ORDER[0]) ??
    SITE_PLAN_OPTIONS[0];
  return first;
}
