"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { BookChrome, BOOK_SHELL } from "@/components/book/book-chrome";
import { endpoints, type Lot, type Property } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { LIVE_PROPERTY_ORDER, isLivePropertyId } from "@/lib/yards";

const LOCATION_META: Record<string, { tags: string[] }> = {
  "prop-16": {
    tags: ["Near I-10 & I-17", "Fenced & Secured", "Flexible Spaces"],
  },
  "prop-325": {
    tags: ["Central Location", "Gated Access", "Lighting"],
  },
  "prop-6060": {
    tags: ["8 min to I-10", "Heavy Industrial Zoning", "Video Surveillance"],
  },
};

/**
 * Public inventory buckets (David): counts only — no yard layout.
 * e.g. “2 one-acre parcels · 1 half-acre · 5 parking spots”
 */
function inventoryBuckets(lots: Lot[]) {
  const open = lots.filter((l) => l.status === "available");
  let oneAcre = 0;
  let halfAcre = 0;
  let otherAcre = 0;
  let parking = 0;
  let storagePads = 0;
  let fromRate: number | null = null;

  for (const lot of open) {
    fromRate =
      fromRate == null
        ? lot.monthlyRate
        : Math.min(fromRate, lot.monthlyRate);
    if (lot.lotType === "acre" || lot.acres != null) {
      const acres = lot.acres ?? parseAcres(lot.size);
      if (acres != null && Math.abs(acres - 1) < 0.05) oneAcre += 1;
      else if (acres != null && Math.abs(acres - 0.5) < 0.05) halfAcre += 1;
      else otherAcre += 1;
    } else if (
      lot.lotType === "truck_trailer" ||
      lot.lotType === "bobtail" ||
      lot.lotType === "drop_yard"
    ) {
      parking += 1;
    } else {
      storagePads += 1;
    }
  }

  const lines: { label: string; count: number }[] = [];
  if (oneAcre > 0) lines.push({ label: "1-acre parcels", count: oneAcre });
  if (halfAcre > 0) lines.push({ label: "½-acre parcels", count: halfAcre });
  if (otherAcre > 0) lines.push({ label: "Other acre lots", count: otherAcre });
  if (parking > 0) lines.push({ label: "Parking spots", count: parking });
  if (storagePads > 0)
    lines.push({ label: "Storage pads", count: storagePads });

  return {
    lines,
    openTotal: open.length,
    fromRate,
    summary: formatInventorySummary({
      oneAcre,
      halfAcre,
      otherAcre,
      parking,
      storagePads,
    }),
  };
}

function parseAcres(size?: string): number | null {
  if (!size) return null;
  const m = size.match(/([\d.]+)\s*acre/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function formatInventorySummary(counts: {
  oneAcre: number;
  halfAcre: number;
  otherAcre: number;
  parking: number;
  storagePads: number;
}) {
  const parts: string[] = [];
  if (counts.oneAcre > 0) {
    parts.push(
      `${counts.oneAcre} one-acre parcel${counts.oneAcre === 1 ? "" : "s"}`,
    );
  }
  if (counts.halfAcre > 0) {
    parts.push(
      `${counts.halfAcre} half-acre parcel${counts.halfAcre === 1 ? "" : "s"}`,
    );
  }
  if (counts.otherAcre > 0) {
    parts.push(
      `${counts.otherAcre} other acre lot${counts.otherAcre === 1 ? "" : "s"}`,
    );
  }
  if (counts.parking > 0) {
    parts.push(
      `${counts.parking} parking spot${counts.parking === 1 ? "" : "s"}`,
    );
  }
  if (counts.storagePads > 0) {
    parts.push(
      `${counts.storagePads} storage pad${counts.storagePads === 1 ? "" : "s"}`,
    );
  }
  if (parts.length === 0) return "No spaces open right now";
  if (parts.length === 1) return `${parts[0]} available`;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]} available`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]} available`;
}

function statusBadge(openTotal: number) {
  if (openTotal === 0) {
    return { label: "Full", tone: "full" as const };
  }
  if (openTotal === 1) {
    return { label: "1 available", tone: "open" as const };
  }
  if (openTotal <= 3) {
    return { label: "Limited", tone: "limited" as const };
  }
  return { label: `${openTotal} available`, tone: "open" as const };
}

const BADGE_TONE = {
  limited: "bg-[#f3e0c4] text-[#8a5a1e]",
  open: "bg-[#c8edc8] text-[#1f6b3a]",
  full: "bg-[#f0c4c4] text-[#8b2e2e]",
} as const;

function LocationCard({
  property,
  lots,
}: {
  property: Property;
  lots: Lot[];
}) {
  const meta = LOCATION_META[property.id] ?? { tags: [] };
  const inventory = inventoryBuckets(lots);
  const waitlist = inventory.openTotal === 0;
  const badge = statusBadge(inventory.openTotal);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.address} ${property.city}`)}`;

  return (
    <article className="flex min-h-[360px] flex-col rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_18px_48px_rgba(10,22,40,0.12)] sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[1.35rem] font-bold leading-snug text-[#0a1628]">
            {property.name}
          </h2>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-[#6b7280]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {property.address}
              <br />
              {property.city}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold",
            BADGE_TONE[badge.tone],
          )}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {meta.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#e8eef5] px-3 py-1.5 text-xs font-medium text-[#4b5c72]"
          >
            {tag}
          </span>
        ))}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-[#e8eef5] px-3 py-1.5 text-xs font-semibold text-[#0a1628]"
        >
          Directions <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-5 flex-1 border-t border-[#ebeff3] pt-5">
        {waitlist ? (
          <p className="text-sm leading-relaxed text-[#6b7280]">
            This location is currently at full capacity.
            <br />
            Contact us to join the waitlist.
          </p>
        ) : (
          <>
            <p className="text-[15px] font-medium leading-relaxed text-[#0a1628]">
              {inventory.summary}
            </p>
            {inventory.fromRate != null && (
              <p className="mt-1.5 text-sm text-[#9aa3af]">
                From {formatCurrency(inventory.fromRate)} / month
              </p>
            )}
            <ul className="mt-4 space-y-2">
              {inventory.lines.map((line) => (
                <li
                  key={line.label}
                  className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50/80 px-3 py-2"
                >
                  <span className="text-sm font-medium text-[#0a1628]">
                    {line.label}
                  </span>
                  <span className="shrink-0 rounded-md bg-[#c8edc8] px-2.5 py-1 text-xs font-semibold text-[#1f6b3a]">
                    {line.count === 1 ? "1 open" : `${line.count} open`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-6">
        {waitlist ? (
          <a
            href="tel:6029223737"
            className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-[#0a1628] px-4 py-3.5 text-[15px] font-bold !text-white"
            style={{ color: "#ffffff" }}
          >
            Join Waitlist
          </a>
        ) : (
          <Link
            href={`/book/${property.id}`}
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#f5b301] px-4 py-3.5 text-[15px] font-bold !text-[#0a1628]"
          >
            Book Now
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
      </div>
    </article>
  );
}

export default function BookLandingPage() {
  const {
    data: properties,
    isPending: propsLoading,
    isError: propsError,
  } = useQuery({
    queryKey: ["public-properties"],
    queryFn: () => endpoints.properties(),
  });
  const {
    data: lots,
    isPending: lotsLoading,
    isError: lotsError,
  } = useQuery({
    queryKey: ["public-lots"],
    queryFn: () => endpoints.lots(),
  });

  const byProp = useMemo(() => {
    const map = new Map<string, Lot[]>();
    for (const lot of lots ?? []) {
      if (!isLivePropertyId(lot.propertyId)) continue;
      const list = map.get(lot.propertyId) ?? [];
      list.push(lot);
      map.set(lot.propertyId, list);
    }
    return map;
  }, [lots]);

  const ordered = useMemo(() => {
    const list = (properties ?? []).filter((p) => isLivePropertyId(p.id));
    return [...list].sort((a, b) => {
      const ai = LIVE_PROPERTY_ORDER.indexOf(a.id as (typeof LIVE_PROPERTY_ORDER)[number]);
      const bi = LIVE_PROPERTY_ORDER.indexOf(b.id as (typeof LIVE_PROPERTY_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [properties]);

  const loading = propsLoading || lotsLoading;
  const loadError = propsError || lotsError;

  return (
    <BookChrome>
      <section className="relative overflow-hidden bg-[#0a1628] pb-28 pt-12 text-white sm:pb-32 sm:pt-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='28' height='28' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 7v14M7 14h14' stroke='%23ffffff' stroke-width='1.25' stroke-linecap='round'/%3E%3C/svg%3E\")",
            backgroundSize: "28px 28px",
          }}
        />
        <div className={`relative ${BOOK_SHELL} text-center`}>
          <h1 className="font-[family-name:var(--font-sora)] text-[2.5rem] font-semibold tracking-tight sm:text-5xl">
            Find Your <span className="text-[#f5b301]">Spot</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/75 sm:text-base">
            Live availability at Paddock 16, Paddock 325, and Paddock 6060 —
            inventory counts only (no yard maps). Book online in minutes.
          </p>
        </div>
      </section>

      <section
        id="locations"
        className={`relative z-10 ${BOOK_SHELL} -mt-16 pb-16 sm:-mt-[4.5rem] sm:pb-20`}
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[380px] animate-pulse rounded-2xl bg-white shadow"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-rose-800">
              Live inventory unavailable
            </p>
            <p className="mt-2 text-sm text-rose-700">
              Could not load yards from the API. Start the backend on port 4001
              and refresh.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
            {ordered.map((p) => (
              <LocationCard
                key={p.id}
                property={p}
                lots={byProp.get(p.id) ?? []}
              />
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-black/5 bg-white px-6 py-9 text-center shadow-sm sm:px-8">
          <p className="text-lg font-semibold text-[#0a1628] sm:text-xl">
            Need a custom solution or have questions?
          </p>
          <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/book/contact"
              className="inline-flex items-center justify-center rounded-xl bg-[#f5b301] px-6 py-3 text-sm font-bold text-[#0a1628]"
            >
              Get a Personalized Quote
            </Link>
            <a
              href="tel:6029223737"
              className="inline-flex items-center justify-center rounded-xl border border-[#0a1628]/15 px-6 py-3 text-sm font-bold text-[#0a1628]"
            >
              Call 602-922-3737
            </a>
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-xl border border-[#0a1628]/15 px-6 py-3 text-sm font-bold text-[#0a1628]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </BookChrome>
  );
}
