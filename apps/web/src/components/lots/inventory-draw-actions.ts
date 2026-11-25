import type { AddedYard, YardSpace } from "./types";
import type { CompassFacing, DrawStamp, YardMark, YardMarkShape } from "./yard-design-types";
import { markHits, markParts, snapSpaceTopLeft } from "./draw-snap";
import { acreBox, gateFacingAt } from "./yard-plan-math";
import { spaceOnLand, spaceRectsForPlacement, yardFeetBox } from "./blank-yard";

export type StampPlacement = {
  x: number;
  y: number;
  length: number;
  width: number;
  valid: boolean;
};

function placedRects(yard: AddedYard) {
  return [
    ...spaceRectsForPlacement(yard),
    ...(yard.marks ?? []).flatMap((mark) =>
      markParts(mark).map((part) => ({ x: mark.x + part.dx, y: mark.y + part.dy, length: part.length, width: part.width, kind: mark.category })),
    ),
  ];
}

function orientedSize(stamp: DrawStamp) {
  const size = stampSize(stamp.shape);
  if (stamp.shape === "gate" && (stamp.facing === "e" || stamp.facing === "w")) {
    return { ...size, length: size.width, width: size.length };
  }
  return size;
}

function resolveStampFeet(yard: AddedYard, stamp: DrawStamp, clickX: number, clickY: number) {
  const box = yardFeetBox(yard);
  const peers = placedRects(yard);
  if (stamp.category === "acres") {
    const span = acreBox(Number(stamp.shape));
    const at = snapSpaceTopLeft(clickX, clickY, span.length, span.width, box, peers);
    return { x: at.x, y: at.y, length: span.length, width: span.width };
  }
  const size = orientedSize(stamp);
  const parts = markParts({ ...stamp, length: size.length, width: size.width });
  const at = snapSpaceTopLeft(clickX, clickY, size.length, size.width, box, peers, parts);
  return { x: at.x, y: at.y, length: size.length, width: size.width };
}

export function placementForStamp(yard: AddedYard, stamp: DrawStamp, clickX: number, clickY: number): StampPlacement {
  const box = yardFeetBox(yard);
  const size = orientedSize(stamp);
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
  const parts = markParts({ ...stamp, length: rect.length, width: rect.width });
  const blocked =
    stamp.category === "labels"
      ? false
      : parts.some((part) =>
          placedRects(yard).some((item) => markHits({ x: rect.x + part.dx, y: rect.y + part.dy, length: part.length, width: part.width }, item)),
        );
  return { ...rect, valid: !blocked };
}

export function stampSize(shape: YardMarkShape): { length: number; width: number; category: YardMark["category"] } {
  if (shape.startsWith("road_")) {
    if (shape === "road_h") return { category: "roads", length: 96, width: 18 };
    if (shape === "road_v") return { category: "roads", length: 18, width: 96 };
    if (shape === "road_t" || shape.startsWith("road_t") || shape === "road_cross") {
      return { category: "roads", length: 72, width: 72 };
    }
    return { category: "roads", length: 64, width: 64 };
  }
  if (shape === "gate" || shape.startsWith("gate_")) return { category: "gates", length: 40, width: 14 };
  if (shape === "tree_row") return { category: "trees", length: 48, width: 20 };
  if (shape === "tree_single") return { category: "trees", length: 16, width: 16 };
  if (shape === "entrance") return { category: "labels", length: 72, width: 16 };
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
  const size = { length: placement.length, width: placement.width, category: stamp.category };

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

  const picked = stamp.facing ?? gateFromShape(stamp.shape);
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
    text: stamp.category === "labels" ? stamp.text ?? "" : undefined,
  };

  return { ...yard, marks: [...(yard.marks ?? []), mark] };
}