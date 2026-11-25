import type { YardMarkCategory, YardMarkShape } from "./yard-design-types";

/** Labels for the draw palette (kept here so the panel never depends on optional text keys). */
export const DRAW_CATEGORY_LABELS: Record<YardMarkCategory, string> = {
  roads: "Roads",
  gates: "Gates",
  acres: "Acres",
  trees: "Trees",
};

export const DRAW_SHAPE_LABELS: Record<YardMarkShape, string> = {
  road_h: "Straight · horizontal",
  road_v: "Straight · vertical",
  road_ne: "Corner · north-east",
  road_nw: "Corner · north-west",
  road_se: "Corner · south-east",
  road_sw: "Corner · south-west",
  road_t: "T · stem south",
  road_tn: "T · stem north",
  road_te: "T · stem east",
  road_ts: "T · stem south",
  road_tw: "T · stem west",
  road_cross: "Cross",
  gate: "Gate",
  gate_n: "Gate · North",
  gate_e: "Gate · East",
  gate_s: "Gate · South",
  gate_w: "Gate · West",
  tree_single: "Single tree",
  tree_row: "Tree row",
  "0.25": "0.25 ac",
  "0.5": "0.5 ac",
  "1": "1 ac",
  "2": "2 ac",
  "3": "3 ac",
  "4": "4 ac",
  "5": "5 ac",
};

export function drawCategoryLabel(category: YardMarkCategory) {
  return DRAW_CATEGORY_LABELS[category];
}

export function drawShapeLabel(shape: YardMarkShape) {
  return DRAW_SHAPE_LABELS[shape] ?? shape;
}