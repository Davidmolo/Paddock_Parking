"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { text } from "@/constants/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/select-menu";
import { blankLease, filledLease, leaseKeys, leaseNotes, type AddedYard, type YardFormKind, type YardGround, type YardLease, type YardShot, type YardSpace, type YardSpaceStatus, type YardSpaceUse } from "./types";

const STORE = "yp-added-yards";
const UPFT = 1.5;
const YAW = (32 * Math.PI) / 180;
const COS = Math.cos(YAW);
const SIN = Math.sin(YAW);
const KY = 0.62;
const CX = 675;
const CY = 500;
const OX = 1160;
const OY = 584;

type Pt = [number, number];

export function loadYards(): AddedYard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveYards(yards: AddedYard[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(yards));
  } catch {
    localStorage.setItem(STORE, JSON.stringify(yards.map(({ leaseFile: _file, ...yard }) => yard)));
  }
}

function iso(px: number, py: number, h = 0): Pt {
  const dx = px - CX;
  const dy = py - CY;
  return [OX + (dx * COS - dy * SIN), OY + (dx * SIN + dy * COS) * KY - h];
}

function uniso(sx: number, sy: number, h = 0): Pt {
  const u = sx - OX;
  const v = (sy - OY + h) / KY;
  return [CX + u * COS + v * SIN, CY - u * SIN + v * COS];
}

function depth(px: number, py: number) {
  return (px - CX) * SIN + (py - CY) * COS;
}

function chain(points: Pt[]) {
  return points.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}

function footprint(yard: AddedYard): Pt[] {
  if (yard.kind === "radius") {
    const r = yard.radius * UPFT;
    return Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2;
      return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
    });
  }
  if (yard.kind === "picture" && yard.outline.length > 2) {
    let max = 0;
    for (const [x, y] of yard.outline) max = Math.max(max, Math.hypot(x, y));
    const reach = yard.span > 0 ? yard.span : max;
    const scale = (reach * UPFT) / (max || 1);
    return yard.outline.map(([x, y]) => [CX + x * scale, CY + y * scale]);
  }
  const w = yard.length * UPFT;
  const d = yard.width * UPFT;
  return [
    [CX - w / 2, CY - d / 2],
    [CX + w / 2, CY - d / 2],
    [CX + w / 2, CY + d / 2],
    [CX - w / 2, CY + d / 2],
  ];
}

function outset(corners: Pt[], margin: number): Pt[] {
  const cx = corners.reduce((s, p) => s + p[0], 0) / corners.length;
  const cy = corners.reduce((s, p) => s + p[1], 0) / corners.length;
  return corners.map(([x, y]) => {
    const len = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / len) * margin, y + ((y - cy) / len) * margin];
  });
}

function walls(corners: Pt[], from: number, to: number, fill: string) {
  const cx = corners.reduce((s, p) => s + p[0], 0) / corners.length;
  const cy = corners.reduce((s, p) => s + p[1], 0) / corners.length;
  const cd = depth(cx, cy);
  const lower = corners.map((p) => iso(p[0], p[1], from));
  const upper = corners.map((p) => iso(p[0], p[1], to));
  const faces = [];
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    const mx = (corners[i][0] + corners[j][0]) / 2;
    const my = (corners[i][1] + corners[j][1]) / 2;
    if (depth(mx, my) <= cd + 0.3) continue;
    faces.push(
      <path
        key={`${from}-${i}`}
        d={`M ${chain([lower[i]])} L ${chain([lower[j]])} L ${chain([upper[j]])} L ${chain([upper[i]])} Z`}
        fill={fill}
      />,
    );
  }
  return faces;
}

const SPACE_FILL: Record<YardSpaceUse, string> = { parking: "#e7f0fb", storage: "#f8e7b0", other: "#e3f0e4" };
const SPACE_COLORS = ["#e7f0fb", "#f8e7b0", "#e3f0e4", "#f8d7d3", "#e6dff6", "#d7eef2"];

function shade(hex: string, amount = 0.72) {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (part: number) => Math.max(0, Math.round(part * amount)).toString(16).padStart(2, "0");
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

export function spaceTone(space: YardSpace) {
  if (space.status === "occupied") return { fill: "#d8dbe2", wall: "#9aa0a8" };
  const fill = space.color || SPACE_FILL[space.use];
  return { fill, wall: shade(fill) };
}

function lotBox(yard: AddedYard) {
  const lot = footprint(yard);
  const xs = lot.map((p) => p[0]);
  const ys = lot.map((p) => p[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, wide: (Math.max(...xs) - left) / UPFT, tall: (Math.max(...ys) - top) / UPFT };
}

function cornersAt(box: { left: number; top: number }, x: number, y: number, length: number, width: number): Pt[] {
  const px = box.left + x * UPFT;
  const py = box.top + y * UPFT;
  const w = length * UPFT;
  const d = width * UPFT;
  return [
    [px, py],
    [px + w, py],
    [px + w, py + d],
    [px, py + d],
  ];
}

export function clampSpace(yard: AddedYard, length: number, width: number, x: number, y: number) {
  const box = lotBox(yard);
  return {
    x: Math.min(Math.max(0, x), Math.max(0, box.wide - length)),
    y: Math.min(Math.max(0, y), Math.max(0, box.tall - width)),
  };
}

function laidSpaces(yard: AddedYard) {
  const box = lotBox(yard);
  const gap = 2;
  const loose = (yard.spaces ?? []).filter((space) => space.x == null || space.y == null);
  const parked = new Map<string, { x: number; y: number }>();
  let x = gap;
  let y = gap;
  let rowH = 0;
  for (const space of loose) {
    if (x > gap && x + space.length > box.wide - gap) {
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
    if (x + space.length > box.wide || y + space.width > box.tall) break;
    parked.set(space.id, { x, y });
    x += space.length + gap;
    rowH = Math.max(rowH, space.width);
  }
  return (yard.spaces ?? []).flatMap((space) => {
    const at = space.x == null || space.y == null ? parked.get(space.id) : { x: space.x, y: space.y };
    if (!at) return [];
    return [{ space, corners: cornersAt(box, at.x, at.y, space.length, space.width) }];
  });
}

function layoutSpaces(yard: AddedYard, made: YardSpace[]) {
  const box = lotBox(yard);
  const gap = 2;
  const rows: YardSpace[][] = [[]];
  for (const space of made) {
    const row = rows[rows.length - 1];
    const used = row.reduce((sum, item) => sum + item.length, 0) + gap * Math.max(0, row.length - 1);
    if (row.length && used + gap + space.length > box.wide) rows.push([space]);
    else row.push(space);
  }
  if (rows.some((row) => row.reduce((sum, item) => sum + item.length, 0) + gap * Math.max(0, row.length - 1) > box.wide + 0.5)) return null;
  const height = rows.reduce((sum, row) => sum + Math.max(...row.map((item) => item.width)), 0) + gap * (rows.length - 1);
  if (height > box.tall + 0.5) return null;
  let y = Math.max(0, (box.tall - height) / 2);
  const placed: YardSpace[] = [];
  for (const row of rows) {
    const wide = row.reduce((sum, item) => sum + item.length, 0) + gap * Math.max(0, row.length - 1);
    let x = Math.max(0, (box.wide - wide) / 2);
    for (const space of row) {
      placed.push({ ...space, x, y });
      x += space.length + gap;
    }
    y += Math.max(...row.map((item) => item.width)) + gap;
  }
  return placed;
}

function placeBatch(yard: AddedYard, made: YardSpace[]) {
  return (
    layoutSpaces(yard, made) ??
    layoutSpaces(
      yard,
      made.map((space) => ({ ...space, length: space.width, width: space.length })),
    )
  );
}

function overlaps(a: YardSpace, b: YardSpace) {
  const gap = 2;
  return (a.x ?? 0) < (b.x ?? 0) + b.length + gap && (a.x ?? 0) + a.length + gap > (b.x ?? 0) && (a.y ?? 0) < (b.y ?? 0) + b.width + gap && (a.y ?? 0) + a.width + gap > (b.y ?? 0);
}

function settleSpace(yard: AddedYard, id: string, x: number, y: number) {
  const self = yard.spaces?.find((space) => space.id === id);
  if (!self) return { x, y };
  const box = lotBox(yard);
  const others = laidSpaces(yard)
    .filter((item) => item.space.id !== id)
    .map(({ space, corners }) => ({
      ...space,
      x: space.x ?? (corners[0][0] - box.left) / UPFT,
      y: space.y ?? (corners[0][1] - box.top) / UPFT,
    }));
  const open = (px: number, py: number) => {
    const at = clampSpace(yard, self.length, self.width, px, py);
    return others.some((item) => overlaps({ ...self, ...at }, item)) ? null : at;
  };
  if (!others.length) return open(x, y) ?? { x, y };
  const gap = 2;
  const pitchX = self.length + gap;
  const pitchY = self.width + gap;
  const snap = (value: number, anchors: number[], pitch: number) => {
    let line = value;
    let bestD = Infinity;
    for (const anchor of anchors) {
      const next = anchor + Math.round((value - anchor) / pitch) * pitch;
      const d = Math.abs(next - value);
      if (d < bestD) {
        bestD = d;
        line = next;
      }
    }
    return line;
  };
  const gx = snap(x, others.map((item) => item.x ?? 0), pitchX);
  const gy = snap(y, others.map((item) => item.y ?? 0), pitchY);
  const onGrid = open(gx, gy);
  if (onGrid) return onGrid;
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let r = 1; r <= 8 && !best; r += 1) {
    for (let i = -r; i <= r; i += 1) {
      for (const at of [open(gx + i * pitchX, gy - r * pitchY), open(gx + i * pitchX, gy + r * pitchY), open(gx - r * pitchX, gy + i * pitchY), open(gx + r * pitchX, gy + i * pitchY)]) {
        if (!at) continue;
        const d = Math.hypot(at.x - x, at.y - y);
        if (d < bestD) {
          best = at;
          bestD = d;
        }
      }
    }
  }
  return best ?? { x, y };
}

function placeAfter(yard: AddedYard, made: YardSpace[]) {
  const box = lotBox(yard);
  const taken = laidSpaces(yard).map(({ space, corners }) => ({
    ...space,
    x: space.x ?? (corners[0][0] - box.left) / UPFT,
    y: space.y ?? (corners[0][1] - box.top) / UPFT,
  }));
  if (!taken.length) return placeBatch(yard, made);
  const gap = 2;
  for (const batch of [made, made.map((space) => ({ ...space, length: space.width, width: space.length }))]) {
    const rows: YardSpace[][] = [[]];
    let tooWide = false;
    for (const space of batch) {
      if (space.length > box.wide + 0.5) {
        tooWide = true;
        break;
      }
      const row = rows[rows.length - 1];
      const used = row.reduce((sum, item) => sum + item.length, 0) + gap * Math.max(0, row.length - 1);
      if (row.length && used + gap + space.length > box.wide) rows.push([space]);
      else row.push(space);
    }
    if (tooWide) continue;
    const blockW = Math.max(...rows.map((row) => row.reduce((sum, item) => sum + item.length, 0) + gap * Math.max(0, row.length - 1)));
    const blockH = rows.reduce((sum, row) => sum + Math.max(...row.map((item) => item.width)), 0) + gap * (rows.length - 1);
    for (let y = 0; y + blockH <= box.tall + 0.5; y += gap) {
      for (let x = 0; x + blockW <= box.wide + 0.5; x += gap) {
        const placed: YardSpace[] = [];
        let yy = y;
        let clear = true;
        for (const row of rows) {
          let xx = x;
          for (const space of row) {
            const spot = { ...space, x: xx, y: yy };
            if (taken.some((item) => overlaps(spot, item))) clear = false;
            placed.push(spot);
            xx += space.length + gap;
          }
          yy += Math.max(...row.map((item) => item.width)) + gap;
          if (!clear) break;
        }
        if (clear) return placed;
      }
    }
  }
  return null;
}

function smallSpace(space: YardSpace) {
  return space.length < 40 || space.width < 40;
}

function areaMarks(items: { space: YardSpace; corners: Pt[] }[]) {
  const boxes = items.map((item) => {
    const xs = item.corners.map((p) => p[0]);
    const ys = item.corners.map((p) => p[1]);
    return { item, l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
  });
  const groups: (typeof boxes)[] = [];
  const seen = new Set<string>();
  for (const seed of boxes) {
    if (seen.has(seed.item.space.id)) continue;
    const group = [seed];
    seen.add(seed.item.space.id);
    for (let i = 0; i < group.length; i++) {
      for (const other of boxes) {
        if (seen.has(other.item.space.id) || other.item.space.use !== seed.item.space.use) continue;
        const pad = 12;
        const a = group[i];
        if (a.l > other.r + pad || other.l > a.r + pad || a.t > other.b + pad || other.t > a.b + pad) continue;
        seen.add(other.item.space.id);
        group.push(other);
      }
    }
    groups.push(group);
  }
  return (
    <g key="areas" data-area="" pointerEvents="none">
      {groups.map((group) => {
        const tops = group.flatMap((item) => item.item.corners.map((p) => iso(p[0], p[1], 38)));
        const at: Pt = [tops.reduce((s, p) => s + p[0], 0) / tops.length, Math.min(...tops.map((p) => p[1])) - 8];
        const use = group[0].item.space.use;
        const word = use === "parking" ? text.blankYard.parking : use === "storage" ? text.blankYard.storage : text.blankYard.other;
        return (
          <text
            key={`area-${group[0].item.space.id}`}
            x={at[0]}
            y={at[1]}
            textAnchor="middle"
            pointerEvents="none"
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
            {word}
          </text>
        );
      })}
    </g>
  );
}

function drawYard(yard: AddedYard, names: boolean) {
  const lot = footprint(yard);
  const pad = outset(lot, 70);
  const cenX = lot.reduce((s, p) => s + p[0], 0) / lot.length;
  const cenY = lot.reduce((s, p) => s + p[1], 0) / lot.length;
  const xs = pad.map((p) => p[0]);
  const ys = pad.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const step = Math.max(180, (maxX - minX) / 6);
  const spots: Array<[number, number, number]> = [];
  for (let x = minX; x <= maxX; x += step) {
    spots.push([x, minY - 50, 1], [x, maxY + 50, 1.05]);
  }
  const trees = spots
    .map((spot, i) => ({ i, d: depth(spot[0], spot[1]), spot }))
    .sort((a, b) => a.d - b.d)
    .map(({ i, spot }) => <Tree key={i} x={spot[0]} y={spot[1]} s={spot[2]} />);
  const projected = [...pad, ...lot].flatMap((p) => [iso(p[0], p[1], 50), iso(p[0], p[1], -24)]);
  const left = Math.min(...projected.map((p) => p[0])) - 80;
  const top = Math.min(...projected.map((p) => p[1])) - 80;
  const right = Math.max(...projected.map((p) => p[0])) + 80;
  const bottom = Math.max(...projected.map((p) => p[1])) + 80;
  return {
    viewBox: `${left} ${top} ${right - left} ${bottom - top}`,
    grass: { x: left - 4000, y: top - 4000, w: right - left + 8000, h: bottom - top + 8000 },
    padWalls: walls(pad, -24, 0, "#c9cdd3"),
    padTop: chain(pad.map((p) => iso(p[0], p[1], 0))),
    lotWalls: walls(lot, 0, 20, "#2f7bd0"),
    lotTop: chain(lot.map((p) => iso(p[0], p[1], 20))),
    spaces: (() => {
      const laid = laidSpaces(yard);
      const nodes = laid
      .map(({ space, corners }) => {
        const cx = corners.reduce((s, p) => s + p[0], 0) / corners.length;
        const cy = corners.reduce((s, p) => s + p[1], 0) / corners.length;
        const tone = spaceTone(space);
        const ground = 20;
        const top = ground + 18;
        const at = iso(cx, cy, top + 2);
        const shadow = corners.map((p) => {
          const q = iso(p[0], p[1], ground);
          return [q[0] + 6, q[1] + 9] as Pt;
        });
        return {
          depth: depth(cx, cy),
          node: (
            <g key={space.id} data-space={space.id} className="cursor-grab">
              <polygon points={chain(shadow)} fill="rgba(22,32,44,0.10)" />
              {walls(corners, ground, top, shade(tone.fill, 0.78))}
              <polygon
                points={chain(corners.map((p) => iso(p[0], p[1], top)))}
                fill={tone.fill}
                stroke={shade(tone.fill, 0.86)}
                strokeWidth={0.8}
                strokeLinejoin="round"
              />
              {names || !smallSpace(space) ? (
                <text x={at[0]} y={at[1]} textAnchor="middle" style={{ font: "700 11px Inter, sans-serif", fill: "#2b3038" }}>
                  {space.label}
                </text>
              ) : null}
            </g>
          ),
        };
      })
      .sort((a, b) => a.depth - b.depth)
      .map((item) => item.node);
      if (names) return nodes;
      const marks = areaMarks(laid.filter(({ space }) => smallSpace(space)));
      return marks ? [...nodes, marks] : nodes;
    })(),
    trees,
    label: iso(cenX, cenY, 36),
  };
}

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  const [bx, by] = iso(x, y, -24);
  return (
    <g>
      <ellipse cx={bx + 5} cy={by + 4} rx={15 * s} ry={5.5 * s} fill="rgba(20,32,20,.13)" />
      <rect x={bx - 2.6 * s} y={by - 24 * s} width={5.2 * s} height={25 * s} rx={2} fill="#8a6a45" />
      <circle cx={bx} cy={by - 26 * s} r={19 * s} fill="#57a052" />
      <circle cx={bx} cy={by - 38 * s} r={15.5 * s} fill="#69ba61" />
      <circle cx={bx} cy={by - 49 * s} r={11 * s} fill="#7fca74" />
    </g>
  );
}


function shoelace(pts: number[][]) {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(sum) / 2;
}

function feetArea(yard: AddedYard) {
  if (yard.kind === "radius") return Math.PI * yard.radius ** 2;
  if (yard.kind === "picture" && yard.outline.length > 2) return shoelace(yard.outline);
  return yard.length * yard.width;
}

function parseMeasure(raw: string) {
  const text = raw.replace(/[²*]/g, "2");
  let m2 = 0;
  let acres = 0;
  const ft: number[] = [];
  const ft2: number[] = [];
  for (const match of text.matchAll(/([\d,]+\.?\d*)\s*(m2|ft2|sq\.?\s*ft|ft|acres)/gi)) {
    const n = Number(match[1].replace(/,/g, ""));
    const unit = match[2].toLowerCase().replace(/\s/g, "");
    if (!n) continue;
    if (unit.startsWith("m")) m2 = n;
    else if (unit.startsWith("acre")) acres = n;
    else if (unit.includes("2") || unit.includes("sq")) ft2.push(n);
    else ft.push(n);
  }
  let area = ft2[0] || (m2 ? m2 * 10.76391041671 : 0) || (acres ? acres * 43560 : 0);
  if (area < 200 || area > 5_000_000) area = 0;
  const peri = (text.split(/perimeter/i)[1] ?? "").match(/([\d,]+\.?\d*)\s*ft/i);
  let perimeter = peri ? Number(peri[1].replace(/,/g, "")) : 0;
  if (!perimeter && area) perimeter = ft.filter((n) => n < area).sort((a, b) => b - a)[0] ?? 0;
  if (perimeter < 40 || perimeter > 20_000) perimeter = 0;
  const areaM = text.match(/total area[^0-9]{0,16}([\d,]+\.?\d*)\s*m/i);
  if (areaM) {
    const sqft = Number(areaM[1].replace(/,/g, "")) * 10.76391041671;
    if (sqft > 200 && sqft < 5_000_000) area = sqft;
  }
  const dist = text.match(/total distance[^0-9]{0,16}([\d,]+\.?\d*)\s*m(?:[^0-9]{0,12}([\d,]+\.?\d*)\s*ft)?/i);
  if (dist) {
    const feet = dist[2] ? Number(dist[2].replace(/,/g, "")) : Number(dist[1].replace(/,/g, "")) * 3.280839895;
    if (feet > 40 && feet < 20_000) perimeter = feet;
  }
  for (const match of text.matchAll(/([\d,]+\.\d+)\s*m[^\d]{0,8}([\d,]+\.\d+)/gi)) {
    const meters = Number(match[1].replace(/,/g, ""));
    const next = Number(match[2].replace(/,/g, ""));
    if (!(meters > 0) || !(next > 0)) continue;
    const ratio = next / meters;
    if (ratio > 8 && ratio < 14 && next > 200 && next < 5_000_000) area = next;
    else if (ratio > 2.8 && ratio < 3.8 && next > 40 && next < 20_000) perimeter = next;
  }
  return { area, perimeter };
}

function spokenDiameter(raw: string) {
  const text = raw.replace(/²/g, "2");
  const diameter = text.match(/diameter[\s\S]{0,24}?([\d,]+\.?\d*)\s*ft/i);
  if (diameter) return Number(diameter[1].replace(/,/g, ""));
  const radius = text.match(/radius[\s\S]{0,24}?([\d,]+\.?\d*)\s*ft/i);
  return radius ? Number(radius[1].replace(/,/g, "")) * 2 : 0;
}

function circleDiameter(area: number, perimeter: number) {
  if (!(area > 0) || !(perimeter > 0)) return 0;
  const diameter = 2 * Math.sqrt(area / Math.PI);
  const around = Math.PI * diameter;
  return Math.abs(perimeter - around) / around < 0.12 ? diameter : 0;
}

function meanDiameter(pts: number[][]) {
  if (pts.length < 8) return 0;
  const radii = pts.map((pt) => Math.hypot(pt[0], pt[1]));
  const mean = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
  if (mean < 1) return 0;
  const dev = Math.sqrt(radii.reduce((sum, radius) => sum + (radius - mean) ** 2, 0) / radii.length) / mean;
  return dev < 0.08 ? mean * 2 : 0;
}

function rectangle(area: number, perimeter: number): [number, number] | null {
  if (!(area > 0) || !(perimeter > 0)) return null;
  const half = perimeter / 2;
  const disc = half * half - 4 * area;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const length = (half + root) / 2;
  const width = (half - root) / 2;
  return length > 1 && width > 1 ? [length, width] : null;
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image"));
      img.src = url;
    });
    const w = Math.min(1200, img.width);
    const h = Math.max(1, Math.round((img.height * w) / img.width));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { canvas, data: new Uint8ClampedArray(), w: 1, h: 1 };
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, data: ctx.getImageData(0, 0, w, h).data, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function outlineFrom(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  on: (r: number, g: number, b: number, a: number) => boolean,
) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  const hit = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return on(data[i], data[i + 1], data[i + 2], data[i + 3]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!hit(x, y)) continue;
      sx += x;
      sy += y;
      n += 1;
    }
  }
  if (n < 30) return [];
  const cx = sx / n;
  const cy = sy / n;
  const buckets = 48;
  const far = Array.from({ length: buckets }, () => ({ x: 0, y: 0, d: 0 }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!hit(x, y)) continue;
      const ang = Math.atan2(y - cy, x - cx);
      const bi = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * buckets) % buckets;
      const d = Math.hypot(x - cx, y - cy);
      if (d > far[bi].d) far[bi] = { x: x - cx, y: y - cy, d };
    }
  }
  const pts = far.filter((p) => p.d > 1).map((p) => [p.x, p.y]);
  if (pts.length < 3) return [];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  if (Math.max(...xs) - Math.min(...xs) < w * 0.12) return [];
  if (Math.max(...ys) - Math.min(...ys) < h * 0.08) return [];
  return pts;
}

function findCards(data: Uint8ClampedArray, w: number, h: number) {
  const seen = new Uint8Array(w * h);
  const qx = new Int16Array(w * h);
  const qy = new Int16Array(w * h);
  const boxes: number[][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (seen[start]) continue;
      const i = start * 4;
      if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) continue;
      let head = 0;
      let tail = 1;
      qx[0] = x;
      qy[0] = y;
      seen[start] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head];
        head += 1;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const push = (nx: number, ny: number) => {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          const p = ny * w + nx;
          if (seen[p]) return;
          const j = p * 4;
          if (data[j] < 235 || data[j + 1] < 235 || data[j + 2] < 235) return;
          seen[p] = 1;
          qx[tail] = nx;
          qy[tail] = ny;
          tail += 1;
        };
        push(cx + 1, cy);
        push(cx - 1, cy);
        push(cx, cy + 1);
        push(cx, cy - 1);
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if (bw > w * 0.12 && bh > 36 && bw < w * 0.75 && bh < h * 0.5) boxes.push([minX, minY, maxX, maxY]);
    }
  }
  return boxes;
}

function cropCard(canvas: HTMLCanvasElement, box: number[], ink: boolean) {
  const [x0, y0, x1, y1] = box;
  const pad = 6;
  const cw = x1 - x0 + pad * 2;
  const ch = y1 - y0 + pad * 2;
  const out = document.createElement("canvas");
  out.width = cw * 3;
  out.height = ch * 3;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, x0 - pad, y0 - pad, cw, ch, 0, 0, out.width, out.height);
  if (!ink) {
    const pix = ctx.getImageData(0, 0, out.width, out.height);
    for (let i = 0; i < pix.data.length; i += 4) {
      pix.data[i] = 255 - pix.data[i];
      pix.data[i + 1] = 255 - pix.data[i + 1];
      pix.data[i + 2] = 255 - pix.data[i + 2];
    }
    ctx.putImageData(pix, 0, 0);
  }
  return out;
}

function mapPin(raw: string) {
  const text = raw.replace(/\u2212/g, "-");
  const match = text.match(/(-?\d{2}\.\d{4,})\s*,\s*(-?\d{2,3}\.\d{4,})/);
  const stuckLat = text.match(/(\d{7,9})\s*,\s*(-?\d{2,3}\.\d{4,})/);
  const stuckLng = text.match(/(-?\d{2}\.\d{4,})\s*,\s*-?(\d{8,11})/);
  let lat = 0;
  let lng = 0;
  if (match) {
    lat = Number(match[1]);
    lng = Number(match[2]);
  } else if (stuckLat) {
    lat = Number(`${stuckLat[1].slice(0, 2)}.${stuckLat[1].slice(2)}`);
    lng = Number(stuckLat[2]);
  } else if (stuckLng) {
    lat = Number(stuckLng[1]);
    const digits = stuckLng[2];
    lng = Number(`${digits.slice(0, 3)}.${digits.slice(3)}`);
  } else return "";
  if (lng > 0 && lat > 20 && lat < 55 && lng > 90 && lng < 130) lng = -lng;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || !(Math.abs(lat) > 10)) return "";
  return `${lat}, ${lng}`;
}

export function yardTitle(raw: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  const number = text.match(/\b(\d{2,6})\b/)?.[1] ?? "";
  const city = text.match(/,\s*([A-Za-z][A-Za-z .'-]{2,}?)\s*,\s*[A-Za-z]{2}\b/)?.[1]?.trim().split(/\s+/).pop() ?? "";
  if (!number || city.length < 3) return text;
  return `${city[0].toUpperCase()}${city.slice(1).toLowerCase()} ${number}`;
}

function addressName(raw: string) {
  const match = raw
    .replace(/\s+/g, " ")
    .match(
      /\d{1,6}\s+(?:(?:N|S|E|W|North|South|East|West)\.?\s+)?[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Ln|Lane|Way|Ct|Court|Pl|Place)\b/i,
    );
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

async function readShot(file: File, span: number, needName = false): Promise<YardShot | null> {
  const image = await loadImage(file);
  const cards = findCards(image.data, image.w, image.h);
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, { logger: () => undefined });
  let title = "";
  let pin = "";
  const notice = (text: string) => {
    const plain = text.replace(/\+/g, " ");
    if (!title) title = addressName(plain);
    if (!pin) pin = mapPin(plain);
  };
  if (needName) {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const band = Math.max(28, Math.floor(image.h * 0.2));
    const top = await worker.recognize(cropCard(image.canvas, [0, 0, image.w - 1, band], true));
    notice(top.data.text);
  }
  const stamp = (row: YardShot): YardShot => ({
    ...row,
    ...(title ? { name: title } : {}),
    ...(pin ? { pin } : {}),
  });
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    tessedit_char_whitelist: "0123456789.,()mftMFT- ",
  });
  let raw = "";
  const ranked = [...cards].sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const box of ranked) {
    const { data } = await worker.recognize(cropCard(image.canvas, box, true));
    raw += `\n${data.text}`;
  }
  notice(raw);
  let parsed = parseMeasure(raw);
  if (!(parsed.area > 0) && !pin) {
    const bottom = await worker.recognize(
      cropCard(
        image.canvas,
        [Math.floor(image.w * 0.12), Math.floor(image.h * 0.5), Math.floor(image.w * 0.9), Math.floor(image.h * 0.94)],
        true,
      ),
    );
    raw += `\n${bottom.data.text}`;
    notice(bottom.data.text);
    parsed = parseMeasure(raw);
  }
  const { area, perimeter } = parsed;
  const spoken = spokenDiameter(raw) || circleDiameter(area, perimeter);
  const frame = whiteFrame(image.data, image.w, image.h);
  const fitted = fitLot(area, perimeter, frame?.aspect ?? 0);
  if (fitted) {
    await worker.terminate();
    return stamp({ outline: [], length: fitted[0], width: fitted[1], diameter: 0 });
  }
  const fromBar = frame ? await feetFromScale(worker, image, frame) : null;
  await worker.terminate();
  if (fromBar) return stamp({ outline: [], length: fromBar[0], width: fromBar[1], diameter: 0, scaled: true });
  if (spoken > 0) return stamp({ outline: [], length: 0, width: 0, diameter: spoken });
  if (frame) return stamp({ outline: [], length: 0, width: 0, diameter: 0, bare: true });
  let light = 0;
  let n = 0;
  for (let i = 0; i < image.data.length; i += 16) {
    n += 1;
    if (image.data[i] + image.data[i + 1] + image.data[i + 2] > 680) light += 1;
  }
  const blue = (r: number, g: number, b: number, a: number) =>
    a > 40 && b > 150 && b > r + 50 && b > g + 30 && r < 180;
  const dark = (r: number, g: number, b: number, a: number) => a > 40 && r + g + b < 720;
  const pixels = outlineFrom(image.data, image.w, image.h, light / n > 0.55 ? dark : blue);
  const pxArea = shoelace(pixels);
  const scaled =
    pixels.length > 2 && area > 0 && pxArea > 0
      ? pixels.map(([x, y]) => [x * Math.sqrt(area / pxArea), y * Math.sqrt(area / pxArea)])
      : [];
  const round = meanDiameter(scaled);
  if (spoken > 0 || round > 0) return stamp({ outline: [], length: 0, width: 0, diameter: spoken || round });
  if (scaled.length > 2) {
    const sides = rectangle(area, perimeter);
    if (sides && aspectClose(pixels, sides)) return stamp({ outline: [], length: sides[0], width: sides[1], diameter: 0 });
    return stamp({ outline: scaled, length: 0, width: 0, diameter: 0 });
  }
  if (pixels.length > 2 && span > 0) {
    let max = 0;
    for (const a of pixels) for (const b of pixels) max = Math.max(max, Math.hypot(a[0] - b[0], a[1] - b[1]));
    if (max > 0) {
      const outline = pixels.map(([x, y]) => [(x * span) / max, (y * span) / max]);
      const diameter = meanDiameter(outline);
      return diameter > 0
        ? stamp({ outline: [], length: 0, width: 0, diameter })
        : stamp({ outline, length: 0, width: 0, diameter: 0 });
    }
  }
  const sides = rectangle(area, perimeter);
  if (sides) return stamp({ outline: [], length: sides[0], width: sides[1], diameter: 0 });
  return stamp({ outline: [], length: 0, width: 0, diameter: 0, bare: true });
}

function whiteFrame(data: Uint8ClampedArray, w: number, h: number) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let n = 0;
  const y0 = Math.floor(h * 0.16);
  const y1 = Math.floor(h * 0.86);
  const x0 = Math.floor(w * 0.04);
  const x1 = Math.floor(w * 0.96);
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r < 200 || g < 200 || b < 185) continue;
      const ax = Math.min(w - 1, x + 8);
      const ay = Math.min(h - 1, y + 8);
      const right = data[(y * w + ax) * 4] + data[(y * w + ax) * 4 + 1] + data[(y * w + ax) * 4 + 2];
      const down = data[(ay * w + x) * 4] + data[(ay * w + x) * 4 + 1] + data[(ay * w + x) * 4 + 2];
      if (right > 520 && down > 520) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      n += 1;
    }
  }
  const wide = maxX - minX;
  const tall = maxY - minY;
  if (n < 40 || wide < w * 0.25 || tall < h * 0.08) return null;
  const long = Math.max(wide, tall);
  const short = Math.max(1, Math.min(wide, tall));
  return { aspect: long / short, wide: long, tall: short };
}

function scaleBar(data: Uint8ClampedArray, w: number, h: number) {
  const y0 = Math.floor(h * 0.7);
  const y1 = Math.floor(h * 0.94);
  const x0 = Math.floor(w * 0.68);
  let best = 0;
  let by = 0;
  for (let y = y1 - 1; y >= y0; y--) {
    let run = 0;
    for (let x = x0; x <= w; x++) {
      const i = (y * w + Math.min(x, w - 1)) * 4;
      const sum = data[i] + data[i + 1] + data[i + 2];
      if (x < w && (sum > 680 || sum < 160)) run += 1;
      else {
        if (run >= 28 && run <= 180 && run > best) {
          best = run;
          by = y;
        }
        run = 0;
      }
    }
  }
  return best ? { px: best, y: by } : null;
}

function scaleLabel(raw: string) {
  let feet = 0;
  for (const match of raw.matchAll(/(\d{1,4})\s*m/gi)) {
    const n = Number(match[1]);
    if (n >= 5 && n <= 500) feet = n * 3.280839895;
  }
  if (feet) return feet;
  for (const match of raw.matchAll(/(\d{1,4})\s*ft/gi)) {
    const n = Number(match[1]);
    if (n >= 10 && n <= 2000) feet = n;
  }
  return feet;
}

async function feetFromScale(
  worker: { recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }> },
  image: { canvas: HTMLCanvasElement; data: Uint8ClampedArray; w: number; h: number },
  frame: { wide: number; tall: number },
) {
  const bar = scaleBar(image.data, image.w, image.h);
  if (!bar) return null;
  const x = Math.floor(image.w * 0.55);
  const y = Math.max(0, bar.y - 40);
  const { data } = await worker.recognize(cropCard(image.canvas, [x, y, image.w - 8, bar.y + 6], false));
  const label = scaleLabel(data.text);
  if (!(label > 0)) return null;
  const perPx = label / bar.px;
  const length = frame.wide * perPx;
  const width = frame.tall * perPx;
  return length > 20 && width > 10 && length < 5000 ? ([length, width] as [number, number]) : null;
}

function fitLot(area: number, perimeter: number, aspect: number): [number, number] | null {
  const card = rectangle(area, perimeter);
  if (card) return card;
  if (area > 0 && aspect > 1.05) {
    const width = Math.sqrt(area / aspect);
    return [width * aspect, width];
  }
  if (perimeter > 0 && aspect > 1.05) {
    const width = perimeter / (2 * (aspect + 1));
    return [width * aspect, width];
  }
  return null;
}

function aspectClose(pts: number[][], sides: [number, number]) {
  const xs = pts.map((pt) => pt[0]);
  const ys = pts.map((pt) => pt[1]);
  const wide = Math.max(...xs) - Math.min(...xs);
  const tall = Math.max(...ys) - Math.min(...ys);
  const drawn = Math.max(wide, tall) / Math.max(1, Math.min(wide, tall));
  const named = Math.max(sides[0], sides[1]) / Math.min(sides[0], sides[1]);
  return drawn / named > 0.75 && drawn / named < 1.33;
}

function fromOutline(name: string, outline: number[][], id: string): AddedYard {
  const span = outline.reduce((max, pt) => Math.max(max, Math.hypot(pt[0], pt[1])), 0);
  return { id, name, kind: "picture", length: 0, width: 0, radius: 0, span, outline };
}

export function AddYardForm({
  yard,
  onCreate,
  onRemove,
  onClose,
}: {
  yard?: AddedYard;
  onCreate: (yard: AddedYard) => void;
  onRemove?: () => void;
  onClose?: () => void;
}) {
  const traced = yard?.kind === "picture" && yard.outline.length > 2 ? yard.outline : [];
  const tracedWide = traced.length ? Math.max(...traced.map((pt) => pt[0])) - Math.min(...traced.map((pt) => pt[0])) : 0;
  const tracedTall = traced.length ? Math.max(...traced.map((pt) => pt[1])) - Math.min(...traced.map((pt) => pt[1])) : 0;
  const startLength = traced.length
    ? String(Math.round(Math.max(tracedWide, tracedTall) * 10) / 10)
    : yard && yard.length > 0
      ? String(yard.length)
      : "";
  const startWidth = traced.length
    ? String(Math.round(Math.min(tracedWide, tracedTall) * 10) / 10)
    : yard && yard.width > 0
      ? String(yard.width)
      : "";
  const startRadius = yard && yard.radius > 0 ? String(yard.radius) : "";
  const [name, setName] = useState(yard?.name ?? "");
  const [lease, setLease] = useState<YardLease>(() => filledLease({ ...blankLease(), ...yard?.lease }));
  const [leaseName, setLeaseName] = useState(yard?.leaseName ?? "");
  const [leaseFile, setLeaseFile] = useState(yard?.leaseFile ?? "");
  const [kind, setKind] = useState<YardFormKind>(yard?.kind === "radius" ? "radius" : yard?.kind === "picture" ? "map" : "square");
  const [length, setLength] = useState(startLength);
  const [width, setWidth] = useState(startWidth);
  const [radius, setRadius] = useState(startRadius);
  const [diameter, setDiameter] = useState("");
  const [links, setLinks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [outline, setOutline] = useState<number[][]>(traced);
  const [auto, setAuto] = useState({ length: startLength, width: startWidth, diameter: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const wait = useRef("");
  const reading = useRef(false);
  const seenLink = useRef("");

  function sizedOutline(outline: number[][]) {
    const xs = outline.map((pt) => pt[0]);
    const ys = outline.map((pt) => pt[1]);
    const wide = Math.max(...xs) - Math.min(...xs);
    const tall = Math.max(...ys) - Math.min(...ys);
    return {
      outline,
      length: Math.max(wide, tall),
      width: Math.min(wide, tall),
      diameter: 0,
      note: `${Math.round(shoelace(outline)).toLocaleString("en-US")} ${text.blankYard.sqft}. ${text.blankYard.found}`,
    };
  }

  function fillRead(next: { outline: number[][]; length: number; width: number; diameter: number }, hint: string) {
    const lengthText = next.length > 0 ? String(Math.round(next.length * 10) / 10) : "";
    const widthText = next.width > 0 ? String(Math.round(next.width * 10) / 10) : "";
    const diameterText = next.diameter > 0 ? String(Math.round(next.diameter * 10) / 10) : "";
    setLength(lengthText);
    setWidth(widthText);
    setDiameter(diameterText);
    setOutline(next.outline);
    setAuto({ length: lengthText, width: widthText, diameter: diameterText });
    setNote(hint);
  }

  async function readMeasurement() {
    if (reading.current) return;
    if (!links.trim() && !file) {
      setError(text.blankYard.needMap);
      return;
    }
    reading.current = true;
    seenLink.current = links.trim();
    wait.current = "lot";
    setBusy(true);
    setError("");
    setNote("");
    try {
      const ground = links.trim() ? await readLinks(links) : null;
      const shot = file ? await readShot(file, ground?.span ?? 0, !ground?.name) : null;
      const drawn = Boolean(
        shot && ((shot.length > 0 && shot.width > 0 && !shot.scaled) || shot.outline.length > 2 || (shot.diameter > 0 && !shot.pin)),
      );
      const pictured =
        shot && !drawn && !ground?.outline.length && (shot.pin || shot.name) ? await lotFromPicture(shot) : null;
      const located = pictured?.outline.length ? pictured : ground;
      const foundName = located?.name || shot?.name || "";
      if (foundName && !name.trim()) setName(foundName);
      if (shot?.bare && !located?.outline.length) {
        setNote(text.blankYard.shapeOnly);
        return;
      }
      if (shot?.diameter && drawn) {
        fillRead(shot, text.blankYard.fix);
        return;
      }
      if (shot && drawn && shot.length > 0 && shot.width > 0) {
        fillRead(shot, shot.scaled ? text.blankYard.scaled : text.blankYard.fix);
        return;
      }
      if (shot && drawn && shot.outline.length > 2) {
        const sized = sizedOutline(shot.outline);
        fillRead(sized, sized.note);
        return;
      }
      if (located && located.outline.length > 2) {
        const diameter = meanDiameter(located.outline);
        if (diameter > 0) {
          setRadius(String(Math.round((diameter / 2) * 10) / 10));
          setNote(text.blankYard.circleRead);
          return;
        }
        const sized = sizedOutline(located.outline);
        fillRead(sized, sized.note);
        return;
      }
      if (located && located.span > 0) {
        setNote(text.blankYard.lineNeed);
        return;
      }
      if (shot && shot.length > 0 && shot.width > 0) {
        fillRead(shot, shot.scaled ? text.blankYard.scaled : text.blankYard.fix);
        return;
      }
      if (located?.points === 1) setError(text.blankYard.pinOnly);
      else setError(text.blankYard.measureFail);
    } catch {
      setError(text.blankYard.measureFail);
    } finally {
      reading.current = false;
      wait.current = "";
      setBusy(false);
    }
  }

  function create() {
    const title = name.trim();
    if (!title) {
      setError(text.blankYard.needName);
      return;
    }
    const edited =
      length !== auto.length || width !== auto.width || diameter !== auto.diameter;
    const long = Number(length);
    const wide = Number(width);
    const id = yard?.id ?? `yard-${Date.now()}`;
    const pack = (row: AddedYard): AddedYard => ({
      ...row,
      name: title,
      lease,
      leaseName,
      leaseFile,
      spaces: yard && !edited ? (yard.spaces ?? []) : [],
    });
    if (kind === "map" && long > 0 && wide > 0 && (edited || outline.length < 3)) {
      onCreate(pack({ id, name: title, kind: "square", length: long, width: wide, radius: 0, span: 0, outline: [] }));
      return;
    }
    if (kind === "map" && outline.length > 2) {
      onCreate(pack(fromOutline(title, outline, id)));
      return;
    }
    const next: AddedYard = {
      id,
      name: title,
      kind: kind === "map" ? "square" : kind,
      length: long,
      width: wide,
      radius: Number(radius),
      span: 0,
      outline: [],
    };
    if (kind === "square" && !(next.length > 0 && next.width > 0)) {
      setError(text.blankYard.needSize);
      return;
    }
    if (kind === "radius" && !(next.radius > 0)) {
      setError(text.blankYard.needSize);
      return;
    }
    if (kind === "map") {
      setError(text.blankYard.needSize);
      return;
    }
    onCreate(pack(next));
  }

  async function onLease(file: File | null) {
    setLeaseName(file?.name ?? "");
    setLeaseFile("");
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLeaseFile(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
    wait.current = "lease";
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/yard-lease", { method: "POST", body });
      if (!res.ok) throw new Error("lease");
      const found = (await res.json()) as YardLease & { yard?: string };
      const { yard: premises, ...fields } = found;
      setLease(filledLease({ ...blankLease(), ...fields }));
      if (premises) setName(premises);
      setNote(text.blankYard.leaseRead);
    } catch {
      setError(text.blankYard.leaseFail);
    } finally {
      wait.current = "";
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[#dde7d0]">
      {busy && wait.current === "lease" ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <p className="text-sm font-medium text-[var(--ink)]">{text.blankYard.readingLease}</p>
          </div>
        </div>
      ) : null}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-white/90 px-4 py-2.5 text-xs text-[var(--muted)]">
        <span className="font-medium text-[var(--ink)]">{text.blankYard.sitePlan}</span>
        {onClose ? (
          <button type="button" aria-label={text.blankYard.spaceDone} className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-auto bg-white/95 p-5">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">{text.blankYard.measureSection}</h2>
        <div className="flex flex-wrap gap-2">
          {(["square", "radius", "map"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setKind(item);
                setError("");
              }}
              className={cn(
                "h-9 rounded-xl border px-3 text-xs font-semibold",
                kind === item
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
              )}
            >
              {text.blankYard[item]}
            </button>
          ))}
        </div>
        {kind === "square" ? (
          <div className="flex flex-wrap gap-3">
            <SizeField label={text.blankYard.length} value={length} onChange={setLength} />
            <SizeField label={text.blankYard.width} value={width} onChange={setWidth} />
          </div>
        ) : null}
        {kind === "radius" ? (
          <div className="flex max-w-sm flex-col gap-2">
            <SizeField label={text.blankYard.radiusFt} value={radius} onChange={setRadius} />
            <p className="text-sm text-[var(--muted)]">{text.blankYard.radiusHint}</p>
          </div>
        ) : null}
        {kind === "map" ? (
          <div className="flex max-w-lg flex-col gap-3">
            <p className="text-sm text-[var(--muted)]">{text.blankYard.mapHint}</p>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {text.blankYard.links}
              </span>
              <textarea
                value={links}
                aria-label={text.blankYard.links}
                placeholder={text.blankYard.linksHint}
                onChange={(e) => setLinks(e.target.value)}
                onBlur={() => {
                  if (links.trim() && links.trim() !== seenLink.current) void readMeasurement();
                }}
                className="h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] placeholder:text-[var(--muted)]"
              />
            </label>
            <FileDrop
              label={text.blankYard.dropShot}
              hint={text.blankYard.dropShotHint}
              accept="image/*"
              chosen={file?.name ?? ""}
              onPick={setFile}
            />
            <div className="flex flex-wrap gap-3">
              <SizeField label={text.blankYard.length} value={length} onChange={setLength} />
              <SizeField label={text.blankYard.width} value={width} onChange={setWidth} />
            </div>
            <Button type="button" variant="secondary" onClick={() => void readMeasurement()} disabled={busy} className="w-fit">
              {busy ? text.blankYard.measuring : text.blankYard.read}
            </Button>
          </div>
        ) : null}
        </section>
        <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">{text.blankYard.leaseSection}</h2>
          <p className="text-sm text-[var(--muted)]">{text.blankYard.leaseHint}</p>
          <FileDrop
            label={text.blankYard.dropLease}
            hint={text.blankYard.dropLeaseHint}
            accept="application/pdf,.pdf"
            chosen={leaseName}
            onPick={(picked) => void onLease(picked)}
          />
          {leaseName ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink)]">
              <span>{leaseName}</span>
              {leaseFile ? (
                <a href={leaseFile} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent-ink)] underline-offset-2 hover:underline">
                  {text.blankYard.openLease}
                </a>
              ) : null}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={text.blankYard.name} value={name} onChange={setName} />
            {leaseKeys.map((key) =>
              key === "notice" ? (
                <label key={key} className="block min-w-40 flex-1 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.leaseField.notice}</span>
                  <SelectMenu
                    ariaLabel={text.blankYard.leaseField.notice}
                    value={lease.notice}
                    placeholder={text.blankYard.leaseField.noticeUnset}
                    onChange={(value) => setLease((current) => ({ ...current, notice: value }))}
                    options={(["30", "90", "180"] as const).map((days) => ({
                      value: days,
                      label: text.blankYard.leaseField.noticeChoice[days],
                    }))}
                  />
                </label>
              ) : (leaseNotes as readonly string[]).includes(key) ? (
                <NoteField
                  key={key}
                  label={text.blankYard.leaseField[key]}
                  value={lease[key]}
                  onChange={(value) => setLease((current) => ({ ...current, [key]: value }))}
                />
              ) : (
                <TextField
                  key={key}
                  label={text.blankYard.leaseField[key]}
                  value={lease[key]}
                  onChange={(value) => setLease((current) => ({ ...current, [key]: value }))}
                />
              ),
            )}
          </div>
        </section>
        {note ? <p className="max-w-lg text-sm text-[var(--muted)]">{note}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={create} disabled={busy} className="w-fit">
            {yard ? text.blankYard.save : text.blankYard.create}
          </Button>
          {yard && onRemove ? (
            <Button type="button" variant="danger" onClick={() => setAsk(true)} disabled={busy} className="w-fit">
              {text.blankYard.remove}
            </Button>
          ) : null}
        </div>
      </div>
      {ask ? (
        <ConfirmDialog
          title={text.blankYard.deleteAsk}
          name={yard ? yardTitle(yard.name) : undefined}
          body={text.blankYard.deleteBody}
          confirm={text.blankYard.deleteYes}
          onCancel={() => setAsk(false)}
          onConfirm={() => onRemove?.()}
        />
      ) : null}
    </div>
  );
}

async function lotFromPicture(shot: YardShot) {
  if (shot.name) {
    const hit = await readLinks(`https://www.google.com/maps/search/${encodeURIComponent(shot.name)}`);
    if (hit.outline.length > 2) return hit;
  }
  if (shot.pin) return readLinks(shot.pin);
  return null;
}

async function readLinks(links: string): Promise<YardGround> {
  const res = await fetch("/api/yard-measure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ links }),
  });
  if (!res.ok) throw new Error("measure");
  const data = (await res.json()) as Partial<YardGround>;
  return { outline: data.outline ?? [], span: data.span ?? 0, points: data.points ?? 0, name: data.name ?? "" };
}

function FileDrop({
  label,
  hint,
  accept,
  chosen,
  onPick,
}: {
  label: string;
  hint: string;
  accept: string;
  chosen: string;
  onPick: (file: File | null) => void;
}) {
  return (
    <label
      className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onPick(e.dataTransfer.files?.[0] ?? null);
      }}
    >
      <Upload className="h-5 w-5 text-[var(--muted)]" aria-hidden />
      <span className="text-sm font-semibold text-[var(--ink)]">{chosen || label}</span>
      <span className="text-xs text-[var(--muted)]">{hint}</span>
      <input type="file" accept={accept} aria-label={label} className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}

function NoteField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5 sm:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      <textarea
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-16 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-40 flex-1 space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      <Input value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SizeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block w-36 space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      <span className="relative block">
        <Input
          inputMode="decimal"
          aria-label={label}
          className="pr-8"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
          {text.blankYard.ft}
        </span>
      </span>
    </label>
  );
}

const ACRE_CHOICES = [0.25, 0.5, 1, 2, 3, 4, 5] as const;

function acreFeet(acres: number) {
  return String(Math.round(Math.sqrt(acres * 43560)));
}

function spaceLabel(spaces: YardSpace[], use: YardSpaceUse, index: number) {
  const n = spaces.filter((space) => space.use === use).length + index + 1;
  if (use === "parking") return `P-${n}`;
  if (use === "storage") return `S-${n}`;
  return `AC-${n}`;
}

function namedLabels(raw: string, n: number, spaces: YardSpace[], use: YardSpaceUse) {
  const base = raw.trim();
  const match = base.match(/^(.*?)(\d+)$/);
  if (!base) return Array.from({ length: n }, (_, i) => spaceLabel(spaces, use, i));
  if (!match) return [base, ...Array.from({ length: n - 1 }, (_, i) => spaceLabel(spaces, use, i + 1))];
  const prefix = match[1];
  let num = Number(match[2]);
  return Array.from({ length: n }, () => `${prefix}${num++}`);
}

const SPACE_STATUSES: YardSpaceStatus[] = ["available", "available_soon", "occupied", "reserved", "maintenance"];

function LotFields({
  status,
  rate,
  availableOn,
  vacantSince,
  customerId,
  customers,
  onChange,
}: {
  status: YardSpaceStatus;
  rate: string;
  availableOn: string;
  vacantSince: string;
  customerId: string;
  customers: { id: string; name: string }[];
  onChange: (patch: Partial<{ status: YardSpaceStatus; rate: string; availableOn: string; vacantSince: string; customerId: string }>) => void;
}) {
  return (
    <>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.spaceStatusLabel}</span>
        <SelectMenu
          ariaLabel={text.blankYard.spaceStatusLabel}
          value={status}
          onChange={(next) => onChange({ status: next as YardSpaceStatus })}
          options={SPACE_STATUSES.map((item) => ({ value: item, label: text.blankYard.spaceStatus[item] }))}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.spaceRate}</span>
        <Input type="number" aria-label={text.blankYard.spaceRate} value={rate} onChange={(e) => onChange({ rate: e.target.value })} />
      </label>
      {status === "available_soon" ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.spaceAvailable}</span>
          <Input type="date" aria-label={text.blankYard.spaceAvailable} value={availableOn} onChange={(e) => onChange({ availableOn: e.target.value })} />
        </label>
      ) : null}
      {status === "available" ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.spaceVacant}</span>
          <Input type="date" aria-label={text.blankYard.spaceVacant} value={vacantSince} onChange={(e) => onChange({ vacantSince: e.target.value })} />
        </label>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.spaceTenant}</span>
        <SelectMenu
          ariaLabel={text.blankYard.spaceTenant}
          value={customerId}
          placeholder={text.blankYard.spaceUnassigned}
          onChange={(next) => onChange({ customerId: next })}
          options={[{ value: "", label: text.blankYard.spaceUnassigned }, ...customers.map((item) => ({ value: item.id, label: item.name }))]}
        />
      </label>
    </>
  );
}

export function AddSpaces({
  yard,
  space,
  customers,
  onSave,
  onClear,
}: {
  yard: AddedYard;
  space?: YardSpace | null;
  customers: { id: string; name: string }[];
  onSave: (spaces: YardSpace[]) => void;
  onClear: () => void;
}) {
  const [use, setUse] = useState<YardSpaceUse>(space?.use ?? "parking");
  const [label, setLabel] = useState(space?.label ?? "");
  const [count, setCount] = useState("1");
  const [length, setLength] = useState(space ? String(space.length) : "");
  const [width, setWidth] = useState(space ? String(space.width) : "");
  const [status, setStatus] = useState<YardSpaceStatus>(space?.status ?? "available");
  const [rate, setRate] = useState(space?.monthlyRate ? String(space.monthlyRate) : "");
  const [availableOn, setAvailableOn] = useState(space?.availableOn ?? "");
  const [vacantSince, setVacantSince] = useState(space?.vacantSince ?? "");
  const [customerId, setCustomerId] = useState(space?.customerId ?? "");
  const [color, setColor] = useState(space?.color || SPACE_FILL[space?.use ?? "parking"]);
  const [error, setError] = useState("");

  useEffect(() => {
    setUse(space?.use ?? "parking");
    setLabel(space?.label ?? "");
    setCount("1");
    setLength(space ? String(space.length) : "");
    setWidth(space ? String(space.width) : "");
    setStatus(space?.status ?? "available");
    setRate(space?.monthlyRate ? String(space.monthlyRate) : "");
    setAvailableOn(space?.availableOn ?? "");
    setVacantSince(space?.vacantSince ?? "");
    setCustomerId(space?.customerId ?? "");
    setColor(space?.color || SPACE_FILL[space?.use ?? "parking"]);
    setError("");
  }, [space?.id]);

  function details() {
    return {
      status,
      monthlyRate: Number(rate) || 0,
      availableOn: status === "available_soon" ? availableOn : "",
      vacantSince: status === "available" ? vacantSince : "",
      customerId,
      customerName: customers.find((item) => item.id === customerId)?.name ?? "",
      color,
    };
  }

  function add() {
    const n = Math.floor(Number(count));
    const long = Number(length);
    const wide = Number(width);
    if (!(n > 0) || !(long > 0) || !(wide > 0)) {
      setError(text.blankYard.spaceNeed);
      return;
    }
    const labels = namedLabels(label, n, yard.spaces ?? [], use);
    const made = Array.from({ length: n }, (_, i) => ({
      id: `sp-${Date.now()}-${i}`,
      use,
      label: labels[i],
      length: long,
      width: wide,
      ...details(),
    }));
    const placed = placeAfter(yard, made);
    if (!placed) {
      setError(text.blankYard.spaceFit);
      return;
    }
    onSave([...(yard.spaces ?? []), ...placed]);
    setError("");
  }

  function saveOne() {
    if (!space) return;
    const long = Number(length);
    const wide = Number(width);
    if (!(long > 0) || !(wide > 0)) {
      setError(text.blankYard.spaceNeed);
      return;
    }
    const box = lotBox(yard);
    if (space.x != null && space.y != null && (space.x + long > box.wide + 0.5 || space.y + wide > box.tall + 0.5)) {
      setError(text.blankYard.spaceFit);
      return;
    }
    onSave((yard.spaces ?? []).map((item) => (item.id === space.id ? { ...space, use, label: label.trim() || space.label, length: long, width: wide, ...details(), x: space.x, y: space.y } : item)));
    setError("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-muted)] p-1">
        {(["parking", "storage", "other"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setUse(item)}
            className={cn(
              "h-8 rounded-lg text-xs font-semibold",
              use === item ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]",
            )}
          >
            {text.blankYard[item]}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--border)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] px-3.5 py-3">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{text.blankYard.spaceEnter}</span>
          <Input
            aria-label={text.blankYard.spaceName}
            placeholder={text.blankYard.spaceNameHint}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-12 text-base font-semibold tracking-wide"
          />
          <span className="block text-xs leading-5 text-[var(--muted)]">{text.blankYard.spaceEnterHint}</span>
        </label>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
        <span className="h-9 w-1 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{text.blankYard.spaceYard}</span>
          <span className="mt-0.5 block text-base font-semibold text-[var(--ink)]">{yardTitle(yard.name)}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ACRE_CHOICES.map((acres) => {
          const feet = acreFeet(acres);
          const on = length === feet && width === feet;
          return (
            <button
              key={acres}
              type="button"
              onClick={() => {
                setUse("other");
                setLength(feet);
                setWidth(feet);
              }}
              className={cn(
                "h-8 rounded-lg border px-2.5 text-xs font-semibold",
                on ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
              )}
            >
              {acres} {text.blankYard.acre}
            </button>
          );
        })}
      </div>
      {space ? null : (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.spaceCount}</span>
          <Input inputMode="numeric" aria-label={text.blankYard.spaceCount} value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
      )}
      <div className="grid grid-cols-2 gap-3 [&>label]:w-full">
        <SizeField label={text.blankYard.length} value={length} onChange={setLength} />
        <SizeField label={text.blankYard.width} value={width} onChange={setWidth} />
      </div>
      {status === "occupied" ? (
        <p className="text-sm text-[var(--muted)]">{text.blankYard.spaceOccupied}</p>
      ) : (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{text.blankYard.spaceColor}</span>
          <div className="flex gap-3">
            {SPACE_COLORS.map((swatch) => (
              <div key={swatch} className="flex flex-col gap-2">
                {[swatch, shade(swatch, 0.42)].map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    aria-label={text.blankYard.spaceColor}
                    className={cn("h-7 w-7 rounded-full border border-white", color === tone && "ring-2 ring-[var(--ink)] ring-offset-2")}
                    style={{ background: tone }}
                    onClick={() => setColor(tone)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <LotFields
        status={status}
        rate={rate}
        availableOn={availableOn}
        vacantSince={vacantSince}
        customerId={customerId}
        customers={customers}
        onChange={(patch) => {
          if (patch.status) setStatus(patch.status);
          if (patch.rate != null) setRate(patch.rate);
          if (patch.availableOn != null) setAvailableOn(patch.availableOn);
          if (patch.vacantSince != null) setVacantSince(patch.vacantSince);
          if (patch.customerId != null) setCustomerId(patch.customerId);
        }}
      />
      </div>
      <div className="border-t border-[var(--border)] p-5">
        {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
        <Button type="button" className="w-full" onClick={space ? saveOne : add}>
          {space ? text.blankYard.spaceSave : text.blankYard.spaceAdd}
        </Button>
        {space ? (
          <button type="button" className="mt-3 w-full text-center text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]" onClick={onClear}>
            {text.blankYard.spaceAnother}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function YardSolid({
  yard,
  moving,
  onMove,
  onOpen,
  actions,
}: {
  yard: AddedYard;
  moving?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  onOpen?: (id: string) => void;
  actions?: React.ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const view = useRef({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; id: string; moved: boolean } | null>(null);
  const hold = useRef<{
    id: string;
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
    at: { x: number; y: number };
    node: Element | null;
    inv: DOMMatrix | null;
    point: DOMPoint | null;
    maxX: number;
    maxY: number;
    boxLeft: number;
    boxTop: number;
    fromX: number;
    fromY: number;
    planX: number;
    planY: number;
  } | null>(null);
  const dragPaint = useRef<{ id: string; x: number; y: number; dx: number; dy: number } | null>(null);
  const raf = useRef(0);
  const drop = useRef(0);
  const gliding = useRef(false);
  const pointing = useRef(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const spot = useRef({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const scene = useMemo(() => drawYard(yard, Boolean(moving)), [yard, moving]);

  useLayoutEffect(() => {
    if (hold.current || gliding.current) return;
    const paint = dragPaint.current;
    const svg = svgRef.current;
    if (!svg || !paint) return;
    const space = yard.spaces?.find((item) => item.id === paint.id);
    const node = svg.querySelector(`[data-space="${paint.id}"]`);
    if (!space || !node) return;
    if (Math.abs((space.x ?? NaN) - paint.x) < 0.05 && Math.abs((space.y ?? NaN) - paint.y) < 0.05) {
      dragPaint.current = null;
      node.removeAttribute("transform");
      return;
    }
    const box = lotBox(yard);
    const from = iso(box.left + (space.x ?? 0) * UPFT, box.top + (space.y ?? 0) * UPFT, 0);
    const to = iso(box.left + paint.x * UPFT, box.top + paint.y * UPFT, 0);
    node.setAttribute("transform", `translate(${to[0] - from[0]} ${to[1] - from[1]})`);
  });

  useEffect(() => {
    view.current = { k: 1, x: 0, y: 0 };
    setTick((n) => n + 1);
  }, [yard.id]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const m = el.getScreenCTM();
      if (!m) return;
      const point = el.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const p = point.matrixTransform(m.inverse());
      const v = view.current;
      if (pointing.current) return;
      const k2 = Math.min(8, Math.max(0.35, v.k * Math.exp(-e.deltaY * 0.0016)));
      v.x = p.x - (k2 / v.k) * (p.x - v.x);
      v.y = p.y - (k2 / v.k) * (p.y - v.y);
      v.k = k2;
      setTick((n) => n + 1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [yard.id]);

  function toPlan(clientX: number, clientY: number) {
    const el = svgRef.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const point = el.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const spot = point.matrixTransform(m.inverse());
    return uniso((spot.x - view.current.x) / view.current.k, (spot.y - view.current.y) / view.current.k, 0);
  }

  function paintHold() {
    const held = hold.current;
    if (!held?.moved) return;
    const to = iso(held.boxLeft + held.at.x * UPFT, held.boxTop + held.at.y * UPFT, 0);
    const dx = to[0] - held.fromX;
    const dy = to[1] - held.fromY;
    dragPaint.current = { id: held.id, x: held.at.x, y: held.at.y, dx, dy };
    held.node?.setAttribute("transform", `translate(${dx} ${dy})`);
  }

  function commitHold(id: string, at: { x: number; y: number }, dx: number, dy: number) {
    dragPaint.current = { id, x: at.x, y: at.y, dx, dy };
    onMove?.(id, at.x, at.y);
  }

  function placeTip() {
    const tip = tipRef.current;
    const host = svgRef.current?.parentElement;
    if (!tip || !host) return;
    const box = host.getBoundingClientRect();
    tip.style.left = `${Math.min(spot.current.x - box.left + 14, box.width - 220)}px`;
    tip.style.top = `${Math.min(spot.current.y - box.top + 14, box.height - 168)}px`;
  }

  useLayoutEffect(() => {
    if (hoverId) placeTip();
  });

  function scheduleFrame() {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (hold.current?.moved) paintHold();
      else if (drag.current) setTick((n) => n + 1);
    });
  }

  function track(clientX: number, clientY: number) {
    const held = hold.current;
    const point = held?.point;
    if (!held || !point || !held.inv) return;
    point.x = clientX;
    point.y = clientY;
    const spot = point.matrixTransform(held.inv);
    const now = uniso((spot.x - view.current.x) / view.current.k, (spot.y - view.current.y) / view.current.k, 0);
    held.at = {
      x: Math.min(held.maxX, Math.max(0, held.ox + (now[0] - held.planX) / UPFT)),
      y: Math.min(held.maxY, Math.max(0, held.oy + (now[1] - held.planY) / UPFT)),
    };
  }

  function endHold(e?: { clientX: number; clientY: number }) {
    if (e) track(e.clientX, e.clientY);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    const held = hold.current;
    const pan = drag.current;
    hold.current = null;
    drag.current = null;
    if (held && moving && held.moved) {
      const at = settleSpace(yard, held.id, held.at.x, held.at.y);
      const end = iso(held.boxLeft + at.x * UPFT, held.boxTop + at.y * UPFT, 0);
      const dx = end[0] - held.fromX;
      const dy = end[1] - held.fromY;
      held.node?.setAttribute("transform", `translate(${dx} ${dy})`);
      commitHold(held.id, at, dx, dy);
      return;
    }
    dragPaint.current = null;
    svgRef.current?.querySelectorAll("[data-space]").forEach((node) => node.removeAttribute("transform"));
    if (pan?.id && !pan.moved && !moving) onOpen?.(pan.id);
  }

  const v = view.current;
  const sqft = feetArea(yard);
  const hover = moving ? null : yard.spaces?.find((space) => space.id === hoverId) ?? null;
  const hoverTone = hover ? spaceTone(hover) : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[#dde7d0]">
      <div className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-white/90 px-4 py-2 text-xs text-[var(--muted)]">
        <span className="font-medium text-[var(--ink)]">{text.blankYard.sitePlan}</span>
        {sqft > 0 ? (
          <span className="shrink-0 font-medium tabular-nums text-[var(--ink)]">
            {Math.round(sqft).toLocaleString("en-US")} {text.blankYard.sqft}
          </span>
        ) : null}
        <span className="hidden min-w-0 flex-1 truncate md:inline">
          {moving ? text.blankYard.spaceMove : yard.spaces?.length ? text.blankYard.spaceClick : text.blankYard.zoom}
        </span>
        {actions ? <span className="ml-auto shrink-0">{actions}</span> : null}
      </div>
      <div className="relative min-h-0 flex-1 bg-[#dde7d0]">
        <svg
          ref={svgRef}
          viewBox={scene.viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing touch-none select-none"
          role="img"
          aria-label={yard.name}
          onPointerLeave={() => setHoverId(null)}
          onPointerDown={(e) => {
            pointing.current = true;
            drop.current += 1;
            gliding.current = false;
            if (raf.current) cancelAnimationFrame(raf.current);
            raf.current = 0;
            setHoverId(null);
            const id = (e.target as Element).closest?.("[data-space]")?.getAttribute("data-space") ?? "";
            if (id && moving) {
              const pad = laidSpaces(yard).find((item) => item.space.id === id);
              const box = lotBox(yard);
              const ox = pad ? (pad.corners[0][0] - box.left) / UPFT : 0;
              const oy = pad ? (pad.corners[0][1] - box.top) / UPFT : 0;
              const from = iso(box.left + ox * UPFT, box.top + oy * UPFT, 0);
              const inv = e.currentTarget.getScreenCTM()?.inverse() ?? null;
              const point = e.currentTarget.createSVGPoint();
              let planX = 0;
              let planY = 0;
              if (inv) {
                point.x = e.clientX;
                point.y = e.clientY;
                const spot = point.matrixTransform(inv);
                const plan = uniso((spot.x - view.current.x) / view.current.k, (spot.y - view.current.y) / view.current.k, 0);
                planX = plan[0];
                planY = plan[1];
              }
              drag.current = null;
              hold.current = {
                id,
                x: e.clientX,
                y: e.clientY,
                ox,
                oy,
                moved: false,
                at: { x: ox, y: oy },
                node: e.currentTarget.querySelector(`[data-space="${id}"]`),
                inv,
                point,
                maxX: Math.max(0, box.wide - (pad?.space.length ?? 1)),
                maxY: Math.max(0, box.tall - (pad?.space.width ?? 1)),
                boxLeft: box.left,
                boxTop: box.top,
                fromX: from[0],
                fromY: from[1],
                planX,
                planY,
              };
            } else {
              hold.current = null;
              drag.current = { x: e.clientX, y: e.clientY, id, moved: false };
            }
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const held = hold.current;
            if (held && moving) {
              if (Math.hypot(e.clientX - held.x, e.clientY - held.y) > 3) held.moved = true;
              track(e.clientX, e.clientY);
              paintHold();
              return;
            }
            const start = drag.current;
            const m = svgRef.current?.getScreenCTM();
            if (start && m && !moving) {
              if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 3) start.moved = true;
              view.current.x += (e.clientX - start.x) / m.a;
              view.current.y += (e.clientY - start.y) / m.d;
              start.x = e.clientX;
              start.y = e.clientY;
              scheduleFrame();
              return;
            }
            if (moving || held || start) return;
            const id = (e.target as Element).closest?.("[data-space]")?.getAttribute("data-space") ?? "";
            spot.current = { x: e.clientX, y: e.clientY };
            if ((id || null) !== hoverId) setHoverId(id || null);
            placeTip();
          }}
          onPointerUp={(e) => {
            pointing.current = false;
            endHold(e);
          }}
          onPointerCancel={(e) => {
            pointing.current = false;
            endHold(e);
          }}
        >
          <rect x={scene.grass.x} y={scene.grass.y} width={scene.grass.w} height={scene.grass.h} fill="#dde7d0" />
          <g transform={`translate(${v.x} ${v.y}) scale(${v.k})`}>
            {scene.padWalls}
            <polygon points={scene.padTop} fill="#eaecf0" stroke="#e0e2e7" strokeWidth={1} />
            {scene.trees}
            {scene.lotWalls}
            <polygon points={scene.lotTop} fill="#57a5f5" stroke="#4a97ea" strokeWidth={0.8} />
            {scene.spaces}
            {yard.spaces?.length ? null : (
              <text
                x={scene.label[0]}
                y={scene.label[1]}
                textAnchor="middle"
                style={{
                  font: "700 14px Inter, sans-serif",
                  fill: "#2b3038",
                  stroke: "#fff",
                  strokeWidth: 4.6,
                  paintOrder: "stroke",
                }}
              >
                {yardTitle(yard.name)}
              </text>
            )}
          </g>
        </svg>
        {hover && hoverTone ? (
          <div
            ref={tipRef}
            className="pointer-events-none absolute z-20 w-52 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-xs shadow-[0_8px_24px_rgba(22,32,44,0.12)]"
          >
            <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--ink)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: hoverTone.fill }} />
              {hover.label}
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[var(--muted)]">
              <span>{text.blankYard.type}</span>
              <b className="text-right font-medium text-[var(--ink)]">
                {hover.use === "parking" ? text.blankYard.parking : hover.use === "storage" ? text.blankYard.storage : text.blankYard.other}
              </b>
              <span>{text.blankYard.size}</span>
              <b className="text-right font-medium text-[var(--ink)]">
                {hover.length} × {hover.width} {text.blankYard.ft}
              </b>
              <span>{text.blankYard.spaceStatusLabel}</span>
              <b className="text-right font-medium text-[var(--ink)]">{text.blankYard.spaceStatus[hover.status ?? "available"]}</b>
              <span>{text.blankYard.spaceRate}</span>
              <b className="text-right font-medium text-[var(--ink)]">{formatCurrency(hover.monthlyRate ?? 0)}</b>
              <span>{text.blankYard.spaceTenant}</span>
              <b className="text-right font-medium text-[var(--ink)]">{hover.customerName || text.blankYard.spaceUnassigned}</b>
            </div>
          </div>
        ) : null}
        <span className="sr-only">{tick}</span>
      </div>
    </div>
  );
}
