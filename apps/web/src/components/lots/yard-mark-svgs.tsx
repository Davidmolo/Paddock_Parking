import type { YardMark, CompassFacing } from "./yard-design-types";
import { iso } from "./yard-plan-math";

const ROAD = "#5c5f66";
const ROAD_EDGE = "#3d4046";
const LANE = "#cfd5de";
const LANE_EDGE = "#b9c0cb";

function chain(points: [number, number][], h: number) {
  return points.map(([x, y]) => iso(x, y, h)).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}

function roadPoly(corners: [number, number][], fill = ROAD, edge = ROAD_EDGE) {
  return <polygon points={chain(corners, 21)} fill={fill} stroke={edge} strokeWidth={0.6} strokeLinejoin="round" />;
}

function gateHouse(corners: [number, number][], facing: CompassFacing) {
  const [a, , c] = corners;
  const x0 = Math.min(a[0], c[0]);
  const y0 = Math.min(a[1], c[1]);
  const x1 = Math.max(a[0], c[0]);
  const y1 = Math.max(a[1], c[1]);
  const arm = 3;
  const bar: [number, number][] =
    facing === "s"
      ? [[x0, y1 - arm], [x1, y1 - arm], [x1, y1], [x0, y1]]
      : facing === "e"
        ? [[x1 - arm, y0], [x1, y0], [x1, y1], [x1 - arm, y1]]
        : facing === "w"
          ? [[x0, y0], [x0 + arm, y0], [x0 + arm, y1], [x0, y1]]
          : [[x0, y0], [x1, y0], [x1, y0 + arm], [x0, y0 + arm]];
  return (
    <g>
      <polygon points={chain(corners, 46)} fill="#ffffff" stroke="#e0e2e6" strokeWidth={0.8} strokeLinejoin="round" />
      <polygon points={chain(bar, 24)} fill="#1d1d1f" />
    </g>
  );
}

export function YardMarkGraphic({
  mark,
  boxLeft,
  boxTop,
  upft,
}: {
  mark: YardMark;
  boxLeft: number;
  boxTop: number;
  upft: number;
}) {
  const px = boxLeft + mark.x * upft;
  const py = boxTop + mark.y * upft;
  const w = mark.length * upft;
  const h = mark.width * upft;
  const cx = px + w / 2;
  const cy = py + h / 2;
  const key = mark.id;

  if (mark.category === "roads") {
    const corners: [number, number][] = [
      [px, py],
      [px + w, py],
      [px + w, py + h],
      [px, py + h],
    ];
    if (mark.shape === "road_ne" || mark.shape === "road_nw") {
      const diag = mark.shape === "road_ne";
      return (
        <g key={key} data-mark={mark.id} pointerEvents="none">
          {roadPoly(
            diag
              ? [
                  [px, py + h],
                  [px + w, py],
                  [px + w, py + h * 0.35],
                  [px + w * 0.35, py + h],
                ]
              : [
                  [px, py],
                  [px + w, py + h],
                  [px + w * 0.65, py + h],
                  [px, py + h * 0.35],
                ],
          )}
        </g>
      );
    }
    if (mark.shape === "road_cross") {
      const arm = Math.min(w, h) * 0.22;
      return (
        <g key={key} data-mark={mark.id} pointerEvents="none">
          {roadPoly([
            [cx - arm / 2, py],
            [cx + arm / 2, py],
            [cx + arm / 2, py + h],
            [cx - arm / 2, py + h],
          ])}
          {roadPoly([
            [px, cy - arm / 2],
            [px + w, cy - arm / 2],
            [px + w, cy + arm / 2],
            [px, cy + arm / 2],
          ])}
        </g>
      );
    }
    if (mark.shape === "road_t") {
      const arm = Math.min(w, h) * 0.22;
      return (
        <g key={key} data-mark={mark.id} pointerEvents="none">
          {roadPoly([
            [px, cy - arm / 2],
            [px + w, cy - arm / 2],
            [px + w, cy + arm / 2],
            [px, cy + arm / 2],
          ])}
          {roadPoly([
            [cx - arm / 2, cy],
            [cx + arm / 2, cy],
            [cx + arm / 2, py + h],
            [cx - arm / 2, py + h],
          ])}
        </g>
      );
    }
    const lane = mark.id.includes("-lane");
    return (
      <g key={key} data-mark={mark.id} pointerEvents="none">
        {roadPoly(corners, lane ? LANE : ROAD, lane ? LANE_EDGE : ROAD_EDGE)}
      </g>
    );
  }

  if (mark.category === "gates") {
    const facing: CompassFacing = mark.facing ?? "n";
    const corners: [number, number][] = [
      [px, py],
      [px + w, py],
      [px + w, py + h],
      [px, py + h],
    ];
    return (
      <g key={key} data-mark={mark.id} pointerEvents="none">
        {gateHouse(corners, facing)}
      </g>
    );
  }

  if (mark.category === "trees") {
    const scale = mark.shape === "tree_row" ? 0.85 : 1;
    const trees = mark.shape === "tree_row" ? 3 : 1;
    return (
      <g key={key} data-mark={mark.id} pointerEvents="none">
        {Array.from({ length: trees }, (_, i) => {
          const tx = cx + (i - (trees - 1) / 2) * 28;
          const [bx, by] = iso(tx, cy, 20);
          return (
            <g key={i}>
              <circle cx={bx} cy={by - 18 * scale} r={14 * scale} fill="#57a052" />
              <rect x={bx - 2} y={by - 8} width={4} height={14} fill="#8a6a45" />
            </g>
          );
        })}
      </g>
    );
  }

  return null;
}