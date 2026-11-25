import type { YardMark } from "./yard-design-types";
import { iso } from "./yard-plan-math";

const ROAD = "#5c5f66";
const ROAD_EDGE = "#3d4046";
const LANE = "#cfd5de";
const LANE_EDGE = "#b9c0cb";

function caption(mark: YardMark, x: number, y: number, events: "auto" | "none") {
  const words = mark.text?.trim();
  if (!words) return null;
  const [lx, ly] = iso(x, y, SURFACE + 8);
  return (
    <text
      x={lx}
      y={ly}
      textAnchor="middle"
      dominantBaseline="central"
      pointerEvents={events}
      style={{
        font: "700 14px Inter, sans-serif",
        fill: "#5a6069",
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        paintOrder: "stroke",
        stroke: "#fff",
        strokeWidth: 4.6,
        strokeLinejoin: "round",
      }}
    >
      {words}
    </text>
  );
}

function chain(points: [number, number][], h: number) {
  return points.map(([x, y]) => iso(x, y, h)).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}

const SURFACE = 20;

function roadPoly(corners: [number, number][], fill = ROAD, edge = ROAD_EDGE, events: "auto" | "none" = "auto") {
  return <polygon points={chain(corners, SURFACE)} fill={fill} stroke={edge} strokeWidth={0.6} strokeLinejoin="round" pointerEvents={events} />;
}

function postPrism(x: number, y: number, w: number, h: number, events: "auto" | "none") {
  const base: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  const lift = SURFACE + 30;
  return (
    <g>
      {base.map((point, index) => {
        const next = base[(index + 1) % base.length];
        const low = [iso(point[0], point[1], SURFACE), iso(next[0], next[1], SURFACE)];
        const high = [iso(next[0], next[1], lift), iso(point[0], point[1], lift)];
        return (
          <polygon
            key={index}
            points={[...low, ...high].map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")}
            fill="#171a1f"
            pointerEvents={events}
          />
        );
      })}
      <polygon points={chain(base, lift)} fill="#2b3038" stroke="#171a1f" strokeWidth={0.7} strokeLinejoin="round" pointerEvents={events} />
    </g>
  );
}

function gatePosts(corners: [number, number][], events: "auto" | "none") {
  const [a, , c] = corners;
  const x0 = Math.min(a[0], c[0]);
  const y0 = Math.min(a[1], c[1]);
  const x1 = Math.max(a[0], c[0]);
  const y1 = Math.max(a[1], c[1]);
  const wide = x1 - x0;
  const tall = y1 - y0;
  const across = wide >= tall;
  const thick = Math.max(8, Math.min(across ? tall : wide, (across ? wide : tall) * 0.34));
  const posts: [number, number, number, number][] = across
    ? [
        [x0, y0, thick, tall],
        [x1 - thick, y0, thick, tall],
      ]
    : [
        [x0, y0, wide, thick],
        [x0, y1 - thick, wide, thick],
      ];
  return (
    <g>
      {posts.map(([x, y, w, h], index) => (
        <g key={index}>{postPrism(x, y, w, h, events)}</g>
      ))}
    </g>
  );
}

function opensAlongX(mark: YardMark) {
  return mark.facing === "e" || mark.facing === "w" || mark.shape === "gate_e" || mark.shape === "gate_w";
}

function roadOutline(
  shape: string,
  px: number,
  py: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  arm: number,
): [number, number][] | null {
  const right = px + w;
  const bottom = py + h;
  const half = arm / 2;
  if (shape === "road_ne") return [[px, py], [right, py], [right, bottom], [right - arm, bottom], [right - arm, py + arm], [px, py + arm]];
  if (shape === "road_nw") return [[px, py], [right, py], [right, py + arm], [px + arm, py + arm], [px + arm, bottom], [px, bottom]];
  if (shape === "road_se") return [[right - arm, py], [right, py], [right, bottom], [px, bottom], [px, bottom - arm], [right - arm, bottom - arm]];
  if (shape === "road_sw") return [[px, py], [px + arm, py], [px + arm, bottom - arm], [right, bottom - arm], [right, bottom], [px, bottom]];
  if (shape === "road_t" || shape === "road_ts") {
    return [
      [px, cy - half],
      [right, cy - half],
      [right, cy + half],
      [cx + half, cy + half],
      [cx + half, bottom],
      [cx - half, bottom],
      [cx - half, cy + half],
      [px, cy + half],
    ];
  }
  if (shape === "road_tn") {
    return [
      [px, cy - half],
      [cx - half, cy - half],
      [cx - half, py],
      [cx + half, py],
      [cx + half, cy - half],
      [right, cy - half],
      [right, cy + half],
      [px, cy + half],
    ];
  }
  if (shape === "road_te") {
    return [
      [cx - half, py],
      [cx + half, py],
      [cx + half, cy - half],
      [right, cy - half],
      [right, cy + half],
      [cx + half, cy + half],
      [cx + half, bottom],
      [cx - half, bottom],
    ];
  }
  if (shape === "road_tw") {
    return [
      [cx - half, py],
      [cx + half, py],
      [cx + half, bottom],
      [cx - half, bottom],
      [cx - half, cy + half],
      [px, cy + half],
      [px, cy - half],
      [cx - half, cy - half],
    ];
  }
  if (shape === "road_cross") {
    return [
      [cx - half, py],
      [cx + half, py],
      [cx + half, cy - half],
      [right, cy - half],
      [right, cy + half],
      [cx + half, cy + half],
      [cx + half, bottom],
      [cx - half, bottom],
      [cx - half, cy + half],
      [px, cy + half],
      [px, cy - half],
      [cx - half, cy - half],
    ];
  }
  return null;
}

export function YardMarkGraphic({
  mark,
  boxLeft,
  boxTop,
  upft,
  interactive,
}: {
  mark: YardMark;
  boxLeft: number;
  boxTop: number;
  upft: number;
  interactive?: boolean;
}) {
  const px = boxLeft + mark.x * upft;
  const py = boxTop + mark.y * upft;
  const w = mark.length * upft;
  const h = mark.width * upft;
  const cx = px + w / 2;
  const cy = py + h / 2;
  const key = mark.id;
  const hit = interactive ? "auto" : "none";

  if (mark.category === "roads") {
    const corners: [number, number][] = [
      [px, py],
      [px + w, py],
      [px + w, py + h],
      [px, py + h],
    ];
    const arm = Math.min(18 * upft, Math.min(w, h) * 0.5);
    const outline = roadOutline(mark.shape, px, py, w, h, cx, cy, arm);
    if (outline) {
      return (
        <g key={key} data-mark={mark.id} pointerEvents={hit}>
          {hit === "auto" ? <polygon points={chain(outline, SURFACE)} fill="transparent" /> : null}
          {roadPoly(outline, ROAD, ROAD_EDGE, hit)}
          {caption(mark, cx, cy, "none")}
        </g>
      );
    }
    const lane = mark.id.includes("-lane");
    return (
      <g key={key} data-mark={mark.id} pointerEvents={hit}>
        {hit === "auto" ? <polygon points={chain(corners, SURFACE)} fill="transparent" /> : null}
        {roadPoly(corners, lane ? LANE : ROAD, lane ? LANE_EDGE : ROAD_EDGE, hit)}
        {caption(mark, cx, cy, "none")}
      </g>
    );
  }

  if (mark.category === "gates") {
    const alongX = opensAlongX(mark);
    const wide = w >= h;
    let gx = px;
    let gy = py;
    let gw = w;
    let gh = h;
    if (alongX === wide) {
      gw = h;
      gh = w;
      gx = cx - gw / 2;
      gy = cy - gh / 2;
    }
    const corners: [number, number][] = [
      [gx, gy],
      [gx + gw, gy],
      [gx + gw, gy + gh],
      [gx, gy + gh],
    ];
    return (
      <g key={key} data-mark={mark.id} pointerEvents={hit}>
        {hit === "auto" ? <polygon points={chain(corners, SURFACE)} fill="transparent" /> : null}
        {gatePosts(corners, hit)}
        {caption(mark, cx, cy, "none")}
      </g>
    );
  }

  if (mark.category === "trees") {
    const scale = mark.shape === "tree_row" ? 0.85 : 1;
    const trees = mark.shape === "tree_row" ? 3 : 1;
    return (
      <g key={key} data-mark={mark.id} pointerEvents={hit}>
        {hit === "auto" ? (
          <polygon points={chain([[px, py], [px + w, py], [px + w, py + h], [px, py + h]], 1)} fill="transparent" />
        ) : null}
        {Array.from({ length: trees }, (_, i) => {
          const tx = cx + (i - (trees - 1) / 2) * 28;
          const [bx, by] = iso(tx, cy, 20);
          return (
            <g key={i}>
              <circle cx={bx} cy={by - 18 * scale} r={14 * scale} fill="#57a052" pointerEvents={hit} />
              <rect x={bx - 2} y={by - 8} width={4} height={14} fill="#8a6a45" pointerEvents={hit} />
            </g>
          );
        })}
        {caption(mark, cx, cy, "none")}
      </g>
    );
  }

  if (mark.category === "labels") {
    const box: [number, number][] = [
      [px, py],
      [px + w, py],
      [px + w, py + h],
      [px, py + h],
    ];
    return (
      <g key={key} data-mark={mark.id} pointerEvents={hit}>
        {hit === "auto" ? <polygon points={chain(box, SURFACE)} fill="transparent" /> : null}
        {caption(mark, cx, cy, hit)}
      </g>
    );
  }

  return null;
}