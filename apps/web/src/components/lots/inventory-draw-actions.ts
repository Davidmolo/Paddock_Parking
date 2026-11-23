import type { AddedYard, YardSpace } from "./types";
import type { CompassFacing, DrawStamp, YardMark, YardMarkShape } from "./yard-design-types";
import { acreInteriorOverlap, snapSpaceTopLeft, snapStampTopLeft } from "./draw-snap";
import { acreBox, clampInBox, gateFacingAt } from "./yard-plan-math";
import { spaceOnLand, spaceRectsForPlacement, yardFeetBox } from "./blank-yard";

const GAP = 2;

export type StampPlacement = {
  x: number;
  y: number;
  length: number;
  width: number;
  valid: boolean;
};

function rectsOverlap(
  a: { x: number; y: number; length: number; width: number },
  b: { x: number; y: number; length: number; width: number },
  gap = GAP,
) {
  return (
    a.x < b.x + b.length + gap &&
    a.x + a.length + gap > b.x &&
    a.y < b.y + b.width + gap &&
    a.y + a.width + gap > b.y
  );
}

function resolveStampFeet(yard: AddedYard, stamp: DrawStamp, clickX: number, clickY: number) {
  const box = yardFeetBox(yard);
  const spaces = spaceRectsForPlacement(yard);
  const size = stampSize(stamp.shape);
  const snapped = snapStampTopLeft(stamp.shape, size.length, size.width, clickX, clickY, yard.marks ?? []);

  if (stamp.category === "acres") {
    const span = acreBox(Number(stamp.shape));
    const at = snapSpaceTopLeft(clickX, clickY, span.length, span.width, box, spaces);
    return { x: at.x, y: at.y, length: span.length, width: span.width };
  }

  const at = clampInBox(box, size.length, size.width, snapped.x, snapped.y);
  return { x: at.x, y: at.y, length: size.length, width: size.width };
}

export function placementForStamp(yard: AddedYard, stamp: DrawStamp, clickX: number, clickY: number): StampPlacement {
  const box = yardFeetBox(yard);
  const size = stampSize(stamp.shape);
  if (size.length > box.wide + 0.5 || size.width > box.tall + 0.5) {
    return { x: 0, y: 0, length: size.length, width: size.width, valid: false };
  }
  const rect = resolveStampFeet(yard, stamp, clickX, clickY);
  const inBox =
    rect.x >= -0.01 &&
    rect.y >= -0.01 &&
    rect.x + rect.length <= box.wide + 0.01 &&
    rect.y + rect.width <= box.tall + 0.01;
  if (!inBox || !spaceOnLand(yard, rect.length, rect.width, rect.x, rect.y)) return { ...rect, valid: false };
  const hitSpace =
    stamp.category === "acres"
      ? spaceRectsForPlacement(yard).some((space) => acreInteriorOverlap(rect, space))
      : spaceRectsForPlacement(yard).some((space) => rectsOverlap(rect, space, GAP));
  if (hitSpace) return { ...rect, valid: false };
  const markGap = stamp.category === "roads" ? 0 : GAP;
  const hitMark = (yard.marks ?? []).some((mark) =>
    rectsOverlap(rect, { x: mark.x, y: mark.y, length: mark.length, width: mark.width }, markGap),
  );
  return { ...rect, valid: !hitMark };
}

export function stampSize(shape: YardMarkShape): { length: number; width: number; category: YardMark["category"] } {
  if (shape.startsWith("road_")) {
    if (shape === "road_h") return { category: "roads", length: 96, width: 18 };
    if (shape === "road_v") return { category: "roads", length: 18, width: 96 };
    if (shape === "road_ne" || shape === "road_nw") return { category: "roads", length: 72, width: 72 };
    if (shape === "road_t" || shape === "road_cross") return { category: "roads", length: 80, width: 80 };
    return { category: "roads", length: 80, width: 18 };
  }
  if (shape.startsWith("gate_")) return { category: "gates", length: 32, width: 12 };
  if (shape === "tree_row") return { category: "trees", length: 48, width: 20 };
  if (shape === "tree_single") return { category: "trees", length: 16, width: 16 };
  const span = acreBox(Number(shape));
  return { category: "acres", length: span.length, width: span.width };
}

function gateFromShape(shape: YardMarkShape): CompassFacing | undefined {
  if (shape === "gate_n") return "n";
  if (shape === "gate_e") return "e";
  if (shape === "gate_s") return "s";
  if (shape === "gate_w") return "w";
  return undefined;
}

export function applyDrawStamp(yard: AddedYard, stamp: DrawStamp, x: number, y: number): AddedYard {
  return applyDrawStampPlacement(yard, stamp, placementForStamp(yard, stamp, x, y));
}

export function applyDrawStampPlacement(yard: AddedYard, stamp: DrawStamp, placement: StampPlacement): AddedYard {
  if (!placement.valid) return yard;

  const at = { x: placement.x, y: placement.y };
  const box = yardFeetBox(yard);
  const size = stampSize(stamp.shape);

  if (stamp.category === "acres") {
    const acres = Number(stamp.shape);
    const span = acreBox(acres);
    const made: YardSpace = {
      id: `sp-${Date.now()}`,
      use: "other",
      label: `AC${acres}`,
      length: span.length,
      width: span.width,
      status: "available",
      monthlyRate: 0,
      x: at.x,
      y: at.y,
    };
    return { ...yard, spaces: [...(yard.spaces ?? []), made] };
  }

  const picked = gateFromShape(stamp.shape);
  const facing =
    picked ??
    (stamp.category === "gates"
      ? gateFacingAt(at.x, at.y, size.length, size.width, box)
      : undefined);

  const mark: YardMark = {
    id: `mk-${Date.now()}`,
    category: size.category,
    shape: stamp.shape,
    x: at.x,
    y: at.y,
    length: size.length,
    width: size.width,
    facing,
  };

  return { ...yard, marks: [...(yard.marks ?? []), mark] };
}