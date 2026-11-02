import type { Lot } from "@/lib/api";

/**
 * One site box sized to fit ALL lots (acres + stalls) together.
 * Box grows/shrinks with inventory — not a fixed 50×38.
 */

/** World-area units per acre (pads stay proportional to each other). */
export const AREA_PER_ACRE = 5.0;

const PAD = 1.8;
const DRIVE_W = 2.8;
const GATE_DEPTH = 2.4;
const ACRE_GAP = 0.42;
const STALL_GAP = 0.22;

export type LotFootprint = {
  lotId: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  acres: number;
  kind: "stall" | "acre";
};

export type YardFeature = {
  id: string;
  kind: "asphalt" | "drive" | "fence" | "gate";
  x: number;
  z: number;
  w: number;
  d: number;
  h?: number;
  label?: string;
};

export type YardPlan = {
  footprints: LotFootprint[];
  features: YardFeature[];
  bounds: {
    width: number;
    depth: number;
    centerX: number;
    centerZ: number;
  };
  /** Sum of acre parcels in this plan */
  totalAcres: number;
};

export function effectiveAcres(lot: Lot): number {
  if (lot.acres != null && lot.acres > 0) return lot.acres;
  if (lot.lotType === "acre") {
    const m = lot.size.match(/([\d.]+)\s*acre/i);
    if (m) return Number(m[1]);
    return 1;
  }
  return 0;
}

export function isAcreParcel(lot: Lot): boolean {
  return lot.lotType === "acre" || (lot.acres != null && lot.acres >= 0.25);
}

function stallFeet(lot: Lot): { wFt: number; dFt: number } {
  const m = lot.size.match(/([\d.]+)\s*'\s*x\s*([\d.]+)\s*'/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return a >= b ? { wFt: b, dFt: a } : { wFt: a, dFt: b };
  }
  switch (lot.lotType) {
    case "truck_trailer":
      return { wFt: 12, dFt: 75 };
    case "bobtail":
      return { wFt: 12, dFt: 35 };
    case "general_storage":
      return { wFt: 25, dFt: 50 };
    case "drop_yard":
      return { wFt: 14, dFt: 55 };
    default:
      return { wFt: 12, dFt: 40 };
  }
}

const FT = 0.045;

function stallSize(lot: Lot) {
  const { wFt, dFt } = stallFeet(lot);
  return {
    w: Math.max(0.5, wFt * FT),
    d: Math.max(1.0, dFt * FT),
    h: 0.26,
  };
}

function acreSize(acres: number) {
  const a = Math.max(0.25, acres);
  const area = a * AREA_PER_ACRE;
  const aspect = 1.25;
  const w = Math.sqrt(area * aspect);
  const d = area / w;
  return {
    w,
    d,
    h: 0.3 + Math.sqrt(a) * 0.18,
  };
}

export function footprintSize(acres: number) {
  if (acres < 0.2) return { w: 0.65, d: 2.0, h: 0.26 };
  return acreSize(acres);
}

type PackItem = {
  id: string;
  w: number;
  d: number;
  h: number;
  acres: number;
  kind: "stall" | "acre";
};

/**
 * Shelf-pack items into rows of `rowWidth`.
 * Returns footprints in local coords (origin top-left) + used size.
 */
function shelfPack(
  items: PackItem[],
  rowWidth: number,
  gap: number,
): { footprints: LotFootprint[]; width: number; depth: number } {
  let x = 0;
  let z = 0;
  let rowH = 0;
  let usedW = 0;
  let usedD = 0;
  const footprints: LotFootprint[] = [];

  for (const item of items) {
    if (x > 0 && x + item.w > rowWidth + 0.01) {
      x = 0;
      z += rowH + gap;
      rowH = 0;
    }
    footprints.push({
      lotId: item.id,
      x: x + item.w / 2,
      z: z + item.d / 2,
      w: item.w,
      d: item.d,
      h: item.h,
      acres: item.acres,
      kind: item.kind,
    });
    usedW = Math.max(usedW, x + item.w);
    usedD = Math.max(usedD, z + item.d);
    x += item.w + gap;
    rowH = Math.max(rowH, item.d);
  }

  return {
    footprints,
    width: Math.max(usedW, items[0]?.w ?? 0),
    depth: Math.max(usedD, items[0]?.d ?? 0),
  };
}

/** Row width wide enough that every acre pad fits without clipping. */
function acreRowWidth(items: PackItem[]): number {
  if (items.length === 0) return 8;
  const widest = Math.max(...items.map((i) => i.w));
  const totalArea = items.reduce((s, i) => s + i.w * i.d, 0);
  /* ~square field with packing slack */
  const fromArea = Math.sqrt(totalArea * 1.35);
  /* Prefer fitting all large (≥2ac) pads on one rear row when possible */
  const large = items.filter((i) => i.acres >= 2);
  const largeRow =
    large.length > 0
      ? large.reduce((s, i) => s + i.w, 0) + ACRE_GAP * Math.max(0, large.length - 1)
      : 0;
  const allOneRow =
    items.reduce((s, i) => s + i.w, 0) + ACRE_GAP * Math.max(0, items.length - 1);

  /* If everything fits in one row under a reasonable span, use that */
  if (allOneRow <= fromArea * 1.8) {
    return Math.max(widest, allOneRow, fromArea);
  }
  return Math.max(widest, fromArea, largeRow * 0.55);
}

function stallRowWidth(items: PackItem[]): number {
  if (items.length === 0) return 4;
  const widest = Math.max(...items.map((i) => i.w));
  const totalArea = items.reduce((s, i) => s + i.w * i.d, 0);
  return Math.max(widest, Math.sqrt(totalArea * 1.5), 4);
}

/**
 * Build ONE box big enough for every lot in `lots`.
 * Acres + stalls share the same fenced site.
 */
/** Rough site aspect from real yards — prefer PROPERTY_SITE_PLAN maps when available. */
const PROPERTY_ASPECT: Record<string, { w: number; d: number }> = {
  "prop-16": { w: 1.55, d: 1 }, // Paddock 16 (Elwood)
  "prop-325": { w: 1.15, d: 1 },
  "prop-6060": { w: 1.35, d: 1 },
};

export function layoutYardPlan(lots: Lot[]): YardPlan {
  const acreLots = lots.filter(isAcreParcel);
  const stallLots = lots.filter((l) => !isAcreParcel(l));
  const totalAcres = acreLots.reduce((s, l) => s + effectiveAcres(l), 0);
  const aspect = PROPERTY_ASPECT[lots[0]?.propertyId ?? ""] ?? { w: 1.2, d: 1 };

  const acreItems: PackItem[] = acreLots.map((lot) => {
    const a = effectiveAcres(lot);
    const s = acreSize(a);
    return { id: lot.id, w: s.w, d: s.d, h: s.h, acres: a, kind: "acre" };
  });

  /* Large pads first along the back feel, then smaller — still one field */
  acreItems.sort((a, b) => b.acres - a.acres || a.id.localeCompare(b.id));

  const leftStalls: PackItem[] = [];
  const rightStalls: PackItem[] = [];
  stallLots.forEach((lot, i) => {
    const s = stallSize(lot);
    const item: PackItem = {
      id: lot.id,
      w: s.w,
      d: s.d,
      h: s.h,
      acres: 0.08,
      kind: "stall",
    };
    (i % 2 === 0 ? leftStalls : rightStalls).push(item);
  });

  const acreW = acreRowWidth(acreItems);
  const acrePack = shelfPack(acreItems, acreW, ACRE_GAP);

  const leftW = stallRowWidth(leftStalls);
  const rightW = stallRowWidth(rightStalls);
  const leftPack = shelfPack(leftStalls, leftW, STALL_GAP);
  const rightPack = shelfPack(rightStalls, rightW, STALL_GAP);

  const stallBandD = Math.max(leftPack.depth, rightPack.depth, stallLots.length ? 3 : 0);
  const stallBandW =
    stallLots.length > 0
      ? leftPack.width + DRIVE_W + rightPack.width + 0.8
      : 0;

  /* Site box = tight fit around content + gate + padding, then stretch to property aspect */
  const contentW = Math.max(acrePack.width, stallBandW, 12);
  let yardW = contentW + PAD * 2;
  let yardD =
    PAD +
    GATE_DEPTH +
    (stallLots.length ? stallBandD + 1.0 : 0.4) +
    (acreLots.length ? acrePack.depth + 0.8 : 0.4) +
    PAD;
  const targetRatio = aspect.w / aspect.d;
  const currentRatio = yardW / Math.max(yardD, 0.01);
  if (currentRatio < targetRatio) {
    yardW = yardD * targetRatio;
  } else {
    yardD = yardW / targetRatio;
  }

  const ox = 0;
  const oz = 0;
  const innerLeft = ox + PAD;
  const stallTop = oz + PAD + GATE_DEPTH + 0.2;
  const acreTop =
    oz +
    PAD +
    GATE_DEPTH +
    (stallLots.length ? stallBandD + 1.0 : 0.4) +
    0.2;

  const footprints: LotFootprint[] = [];

  const shift = (
    fps: LotFootprint[],
    originX: number,
    originZ: number,
  ) => {
    for (const fp of fps) {
      footprints.push({
        ...fp,
        x: originX + fp.x,
        z: originZ + fp.z,
      });
    }
  };

  if (stallLots.length) {
    const leftOriginX = innerLeft;
    const rightOriginX = ox + yardW - PAD - rightPack.width;
    shift(leftPack.footprints, leftOriginX, stallTop);
    shift(rightPack.footprints, rightOriginX, stallTop);
  }

  if (acreLots.length) {
    /* Center acre field in the box so leftover margin is even */
    const acreOriginX = ox + (yardW - acrePack.width) / 2;
    shift(acrePack.footprints, acreOriginX, acreTop);
  }

  const driveStartZ = oz + PAD + GATE_DEPTH * 0.5;
  const driveEndZ = acreLots.length
    ? acreTop + acrePack.depth * 0.15
    : oz + yardD - PAD;
  const features: YardFeature[] = [
    {
      id: "site-pad",
      kind: "asphalt",
      x: ox + yardW / 2,
      z: oz + yardD / 2,
      w: yardW,
      d: yardD,
      h: 0.04,
    },
    {
      id: "site-gate",
      kind: "gate",
      x: ox + yardW / 2,
      z: oz + PAD + GATE_DEPTH * 0.35,
      w: Math.min(4, yardW * 0.12),
      d: 0.35,
      h: 0.55,
      label: "Main gate",
    },
    {
      id: "site-drive",
      kind: "drive",
      x: ox + yardW / 2,
      z: (driveStartZ + driveEndZ) / 2,
      w: DRIVE_W,
      d: Math.max(2.5, driveEndZ - driveStartZ),
      h: 0.05,
    },
  ];

  const fenceH = 0.5;
  const t = 0.14;
  features.push(
    {
      id: "fn",
      kind: "fence",
      x: ox + yardW / 2,
      z: oz + t / 2,
      w: yardW,
      d: t,
      h: fenceH,
    },
    {
      id: "fs",
      kind: "fence",
      x: ox + yardW / 2,
      z: oz + yardD - t / 2,
      w: yardW,
      d: t,
      h: fenceH,
    },
    {
      id: "fw",
      kind: "fence",
      x: ox + t / 2,
      z: oz + yardD / 2,
      w: t,
      d: yardD,
      h: fenceH,
    },
    {
      id: "fe",
      kind: "fence",
      x: ox + yardW - t / 2,
      z: oz + yardD / 2,
      w: t,
      d: yardD,
      h: fenceH,
    },
  );

  return {
    footprints,
    features,
    totalAcres,
    bounds: {
      width: yardW,
      depth: yardD,
      centerX: ox + yardW / 2,
      centerZ: oz + yardD / 2,
    },
  };
}

export function layoutLots(lots: Lot[]): LotFootprint[] {
  return layoutYardPlan(lots).footprints;
}

export function yardBounds(layout: LotFootprint[]) {
  if (layout.length === 0) {
    return { width: 20, depth: 16, centerX: 10, centerZ: 8 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of layout) {
    minX = Math.min(minX, p.x - p.w / 2);
    maxX = Math.max(maxX, p.x + p.w / 2);
    minZ = Math.min(minZ, p.z - p.d / 2);
    maxZ = Math.max(maxZ, p.z + p.d / 2);
  }
  return {
    width: Math.max(12, maxX - minX + 4),
    depth: Math.max(10, maxZ - minZ + 4),
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

export const ACRE_COLORS: Record<string, string> = {
  "0.08": "#94a3b8",
  "0.25": "#7c3aed",
  "0.5": "#0d9488",
  "1": "#2563eb",
  "2": "#0284c7",
  "3": "#16a34a",
  "4": "#ca8a04",
  "5": "#ea580c",
};

export function colorForAcres(acres: number): string {
  const keys = Object.keys(ACRE_COLORS)
    .map(Number)
    .sort((a, b) => a - b);
  let best = keys[0]!;
  for (const k of keys) {
    if (Math.abs(k - acres) < Math.abs(best - acres)) best = k;
  }
  return ACRE_COLORS[String(best)] ?? "#64748b";
}

export const STATUS_COLORS: Record<string, string> = {
  available: "#0ea5e9",
  available_soon: "#8b5cf6",
  occupied: "#22c55e",
  reserved: "#f59e0b",
  maintenance: "#f43f5e",
};
