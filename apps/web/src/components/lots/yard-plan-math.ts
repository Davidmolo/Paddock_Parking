/** Shared plan coordinates for the isometric yard map (matches blank-yard). */
export const UPFT = 1.5;
const YAW = (32 * Math.PI) / 180;
const COS = Math.cos(YAW);
const SIN = Math.sin(YAW);
const KY = 0.62;
const CX = 675;
const CY = 500;
const OX = 1160;
const OY = 584;

export type Pt = [number, number];

export function iso(px: number, py: number, h = 0): Pt {
  const dx = px - CX;
  const dy = py - CY;
  return [OX + (dx * COS - dy * SIN), OY + (dx * SIN + dy * COS) * KY - h];
}

export function uniso(sx: number, sy: number, h = 0): Pt {
  const u = sx - OX;
  const v = (sy - OY + h) / KY;
  return [CX + u * COS + v * SIN, CY - u * SIN + v * COS];
}

export function lotBoxFromYard(yard: {
  kind: string;
  length: number;
  width: number;
  radius: number;
  outline: number[][];
  span: number;
}) {
  const UP = UPFT;
  let left = 0;
  let top = 0;
  let wide = yard.length;
  let tall = yard.width;
  if (yard.kind === "radius") {
    wide = yard.radius * 2;
    tall = yard.radius * 2;
    left = CX - yard.radius * UP;
    top = CY - yard.radius * UP;
    return { left, top, wide, tall };
  }
  if (yard.kind === "picture" && yard.outline.length > 2) {
    const xs = yard.outline.map((p) => p[0]);
    const ys = yard.outline.map((p) => p[1]);
    const max = Math.max(...xs.map((x, i) => Math.hypot(x, ys[i]!)));
    const reach = yard.span > 0 ? yard.span : max;
    const scale = (reach * UP) / (max || 1);
    const pts = yard.outline.map(([x, y]) => [CX + x * scale, CY + y * scale] as Pt);
    const pxs = pts.map((p) => p[0]);
    const pys = pts.map((p) => p[1]);
    left = Math.min(...pxs);
    top = Math.min(...pys);
    wide = (Math.max(...pxs) - left) / UP;
    tall = (Math.max(...pys) - top) / UP;
    return { left, top, wide, tall };
  }
  const w = yard.length * UP;
  const d = yard.width * UP;
  left = CX - w / 2;
  top = CY - d / 2;
  return { left, top, wide: yard.length, tall: yard.width };
}

export function clampInBox(
  box: { wide: number; tall: number },
  length: number,
  width: number,
  x: number,
  y: number,
) {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, box.wide - length)),
    y: Math.min(Math.max(0, y), Math.max(0, box.tall - width)),
  };
}

export function gateFacingAt(
  x: number,
  y: number,
  length: number,
  width: number,
  box: { wide: number; tall: number },
) {
  const cx = x + length / 2;
  const cy = y + width / 2;
  const dN = cy;
  const dS = box.tall - cy;
  const dW = cx;
  const dE = box.wide - cx;
  const min = Math.min(dN, dS, dW, dE);
  if (min === dN) return "n" as const;
  if (min === dE) return "e" as const;
  if (min === dS) return "s" as const;
  return "w" as const;
}

/** Paddock 16 strip, in plan units. Two strips are a half acre, four are an acre, and they share the long edge. */
const STRIP = 83;
const DEPTH = 295;

/** Width and depth in feet. Each step up adds one strip along the long edge. */
export function acreBox(acres: number) {
  const strips = Math.max(1, Math.round(acres * 4));
  return { length: (STRIP * strips) / 1.5, width: DEPTH / 1.5 };
}

export function acreFeet(acres: number) {
  return acreBox(acres).length;
}