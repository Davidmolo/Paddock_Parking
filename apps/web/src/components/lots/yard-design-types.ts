export type CompassFacing = "n" | "e" | "s" | "w";

export type YardMarkCategory = "roads" | "gates" | "acres" | "trees" | "labels";

export type RoadShape =
  | "road_h"
  | "road_v"
  | "road_ne"
  | "road_nw"
  | "road_se"
  | "road_sw"
  | "road_t"
  | "road_tn"
  | "road_te"
  | "road_ts"
  | "road_tw"
  | "road_cross";

export type GateShape = "gate" | "gate_n" | "gate_e" | "gate_s" | "gate_w";

export type TreeShape = "tree_single" | "tree_row";

export type AcreShape = "0.25" | "0.5" | "1" | "2" | "3" | "4" | "5";

export type LabelShape = "entrance";

export type YardMarkShape = RoadShape | GateShape | TreeShape | AcreShape | LabelShape;

export type YardMark = {
  id: string;
  category: YardMarkCategory;
  shape: YardMarkShape;
  x: number;
  y: number;
  length: number;
  width: number;
  facing?: CompassFacing;
  rotation?: number;
  text?: string;
};

export type DrawStamp = {
  category: YardMarkCategory;
  shape: YardMarkShape;
  facing?: CompassFacing;
  text?: string;
};