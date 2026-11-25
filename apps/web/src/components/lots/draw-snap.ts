import type { YardMark, YardMarkShape } from "./yard-design-types";

const GRID = 2;
const ROAD_GAP = 0;
const MAGNET = 28;

type SpaceRect = { x: number; y: number; length: number; width: number };

export function snapFeet(value: number) {
  return Math.round(value / GRID) * GRID;
}

type RoadSeg = { x1: number; y1: number; x2: number; y2: number; axis: "h" | "v" };

function roadSegments(mark: YardMark): RoadSeg[] {
  const { x, y, length, width, shape } = mark;
  const cx = x + length / 2;
  const cy = y + width / 2;
  if (shape === "road_h") return [{ x1: x, y1: cy, x2: x + length, y2: cy, axis: "h" }];
  if (shape === "road_v") return [{ x1: cx, y1: y, x2: cx, y2: y + width, axis: "v" }];
  if (shape === "road_t" || shape === "road_cross") {
    return [
      { x1: x, y1: cy, x2: x + length, y2: cy, axis: "h" },
      { x1: cx, y1: y, x2: cx, y2: y + width, axis: "v" },
    ];
  }
  return [];
}

function near(a: number, b: number, limit = MAGNET) {
  return Math.abs(a - b) <= limit;
}

/** Snap stamp top-left so roads line up on a 2 ft grid and join end-to-end. */
export function snapStampTopLeft(
  shape: YardMarkShape,
  length: number,
  width: number,
  clickX: number,
  clickY: number,
  marks: YardMark[],
): { x: number; y: number } {
  let x = snapFeet(clickX - length / 2);
  let y = snapFeet(clickY - width / 2);
  if (!shape.startsWith("road_")) return { x, y };

  const segs = (marks ?? []).filter((m) => m.category === "roads").flatMap(roadSegments);

  const roadMarks = (marks ?? []).filter((m) => m.category === "roads");
  for (const m of roadMarks) {
    const laneY = m.y + m.width / 2;
    const laneX = m.x + m.length / 2;
    if (shape === "road_h" && near(clickY, laneY)) y = snapFeet(laneY - width / 2);
    if (shape === "road_v" && near(clickX, laneX)) x = snapFeet(laneX - length / 2);
    if (near(clickX, m.x + m.length)) x = snapFeet(m.x + m.length + ROAD_GAP);
    if (near(clickX, m.x)) x = snapFeet(m.x - length - ROAD_GAP);
    if (near(clickY, m.y + m.width)) y = snapFeet(m.y + m.width + ROAD_GAP);
    if (near(clickY, m.y)) y = snapFeet(m.y - width - ROAD_GAP);
  }

  if (shape === "road_h") {
    let lane = clickY;
    for (const s of segs) {
      if (s.axis !== "h") continue;
      if (near(clickY, s.y1)) lane = s.y1;
    }
    y = snapFeet(lane - width / 2);
    for (const s of segs) {
      if (s.axis !== "h" || !near(y + width / 2, s.y1, 3)) continue;
      if (near(clickX, s.x2)) x = snapFeet(s.x2 + ROAD_GAP);
      if (near(clickX, s.x1)) x = snapFeet(s.x1 - length - ROAD_GAP);
    }
    x = snapFeet(x);
  }

  if (shape === "road_v") {
    let lane = clickX;
    for (const s of segs) {
      if (s.axis !== "v") continue;
      if (near(clickX, s.x1)) lane = s.x1;
    }
    x = snapFeet(lane - length / 2);
    for (const s of segs) {
      if (s.axis !== "v" || !near(x + length / 2, s.x1, 3)) continue;
      if (near(clickY, s.y2)) y = snapFeet(s.y2 + ROAD_GAP);
      if (near(clickY, s.y1)) y = snapFeet(s.y1 - width - ROAD_GAP);
    }
    y = snapFeet(y);
  }

  if (shape === "road_ne" || shape === "road_nw") {
    x = snapFeet(clickX - length / 2);
    y = snapFeet(clickY - width / 2);
    for (const s of segs) {
      if (near(clickX, s.x1)) x = snapFeet(s.x1);
      if (near(clickX, s.x2)) x = snapFeet(s.x2 - length);
      if (near(clickY, s.y1)) y = snapFeet(s.y1);
      if (near(clickY, s.y2)) y = snapFeet(s.y2 - width);
    }
  }

  if (shape === "road_t" || shape === "road_cross") {
    x = snapFeet(clickX - length / 2);
    y = snapFeet(clickY - width / 2);
    for (const s of segs) {
      if (s.axis === "h" && near(clickY, s.y1)) y = snapFeet(s.y1 - width / 2);
      if (s.axis === "v" && near(clickX, s.x1)) x = snapFeet(s.x1 - length / 2);
    }
  }

  return { x, y };
}

/** True only when lots share interior area (edge-to-edge touch is OK). */
export function acreInteriorOverlap(a: SpaceRect, b: SpaceRect, pad = 0.35) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.length, b.x + b.length);
  const bottom = Math.min(a.y + a.width, b.y + b.width);
  return right - left > pad && bottom - top > pad;
}

function lotOverlaps(rect: SpaceRect, others: SpaceRect[]) {
  return others.some((other) => acreInteriorOverlap(rect, other));
}

function fitsBox(box: { wide: number; tall: number }, rect: SpaceRect) {
  return (
    rect.x >= -0.01 &&
    rect.y >= -0.01 &&
    rect.x + rect.length <= box.wide + 0.01 &&
    rect.y + rect.width <= box.tall + 0.01
  );
}

function clampLot(box: { wide: number; tall: number }, length: number, width: number, x: number, y: number) {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, box.wide - length)),
    y: Math.min(Math.max(0, y), Math.max(0, box.tall - width)),
  };
}

function along(a0: number, a1: number, b0: number, b1: number, slack: number) {
  return a0 < b1 + slack && a1 + slack > b0;
}

export function markParts(mark: {
  category?: string;
  shape: string;
  facing?: string;
  length: number;
  width: number;
}): { dx: number; dy: number; length: number; width: number }[] {
  const length = mark.length;
  const width = mark.width;
  const arm = Math.min(18, Math.min(length, width) * 0.5);
  const alongX = mark.facing === "e" || mark.facing === "w" || mark.shape === "gate_e" || mark.shape === "gate_w";
  if ((mark.category === "gates" || mark.shape === "gate" || mark.shape.startsWith("gate_")) && alongX === (length >= width)) {
    return [{ dx: length / 2 - width / 2, dy: width / 2 - length / 2, length: width, width: length }];
  }
  if (mark.shape === "road_ne") {
    return [
      { dx: 0, dy: 0, length, width: arm },
      { dx: length - arm, dy: 0, length: arm, width },
    ];
  }
  if (mark.shape === "road_nw") {
    return [
      { dx: 0, dy: 0, length, width: arm },
      { dx: 0, dy: 0, length: arm, width },
    ];
  }
  if (mark.shape === "road_se") {
    return [
      { dx: 0, dy: width - arm, length, width: arm },
      { dx: length - arm, dy: 0, length: arm, width },
    ];
  }
  if (mark.shape === "road_sw") {
    return [
      { dx: 0, dy: width - arm, length, width: arm },
      { dx: 0, dy: 0, length: arm, width },
    ];
  }
  const midX = length / 2 - arm / 2;
  const midY = width / 2 - arm / 2;
  if (mark.shape === "road_t" || mark.shape === "road_ts") {
    return [
      { dx: 0, dy: midY, length, width: arm },
      { dx: midX, dy: width / 2, length: arm, width: width / 2 },
    ];
  }
  if (mark.shape === "road_tn") {
    return [
      { dx: 0, dy: midY, length, width: arm },
      { dx: midX, dy: 0, length: arm, width: width / 2 },
    ];
  }
  if (mark.shape === "road_te") {
    return [
      { dx: midX, dy: 0, length: arm, width },
      { dx: length / 2, dy: midY, length: length / 2, width: arm },
    ];
  }
  if (mark.shape === "road_tw") {
    return [
      { dx: midX, dy: 0, length: arm, width },
      { dx: 0, dy: midY, length: length / 2, width: arm },
    ];
  }
  if (mark.shape === "road_cross") {
    return [
      { dx: midX, dy: 0, length: arm, width },
      { dx: 0, dy: midY, length, width: arm },
    ];
  }
  return [{ dx: 0, dy: 0, length, width }];
}

function nearestEdge(origin: number, edges: number[], pull: number) {
  let best = origin;
  let bestD = pull + 1;
  for (const edge of edges) {
    const d = Math.abs(edge - origin);
    if (d <= 0.05 || d > pull || d >= bestD) continue;
    best = edge;
    bestD = d;
  }
  return best;
}

/** Drop where the cursor is. If an edge is close, sit flush on it. No gap. */
export function snapSpaceTopLeft(
  clickX: number,
  clickY: number,
  length: number,
  width: number,
  box: { wide: number; tall: number },
  spaces: SpaceRect[],
  parts?: { dx: number; dy: number; length: number; width: number }[],
): { x: number; y: number } {
  const origin = clampLot(box, length, width, clickX - length / 2, clickY - width / 2);
  const pull = 12;
  const pieces = parts?.length ? parts : [{ dx: 0, dy: 0, length, width }];
  const xs: number[] = [];
  const ys: number[] = [];
  for (const piece of pieces) {
    xs.push(-piece.dx, box.wide - piece.length - piece.dx);
    ys.push(-piece.dy, box.tall - piece.width - piece.dy);
    for (const s of spaces) {
      const px = origin.x + piece.dx;
      const py = origin.y + piece.dy;
      if (along(py, py + piece.width, s.y, s.y + s.width, pull)) {
        xs.push(s.x + s.length - piece.dx, s.x - piece.length - piece.dx, s.x - piece.dx, s.x + s.length - piece.length - piece.dx);
      }
      if (along(px, px + piece.length, s.x, s.x + s.length, pull)) {
        ys.push(s.y + s.width - piece.dy, s.y - piece.width - piece.dy, s.y - piece.dy, s.y + s.width - piece.width - piece.dy);
      }
    }
  }
  const x = nearestEdge(origin.x, xs, pull);
  const y = nearestEdge(origin.y, ys, pull);
  const seats = (at: { x: number; y: number }) =>
    pieces.map((piece) => ({ x: at.x + piece.dx, y: at.y + piece.dy, length: piece.length, width: piece.width }));
  const fits = (at: { x: number; y: number }) => seats(at).every((rect) => fitsBox(box, rect) && !lotOverlaps(rect, spaces));
  if (fits({ x, y })) return { x, y };
  if (fits({ x, y: origin.y })) return { x, y: origin.y };
  if (fits({ x: origin.x, y })) return { x: origin.x, y };
  return origin;
}

export function snapAcreTopLeft(
  clickX: number,
  clickY: number,
  feet: number,
  box: { wide: number; tall: number },
  spaces: SpaceRect[],
) {
  return snapSpaceTopLeft(clickX, clickY, feet, feet, box, spaces);
}