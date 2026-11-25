import type { YardMark } from "./yard-design-types";

export type YardKind = "square" | "radius" | "picture";

export type YardFormKind = "square" | "radius" | "map";

export type YardShot = {
  outline: number[][];
  length: number;
  width: number;
  diameter: number;
  bare?: boolean;
  scaled?: boolean;
  name?: string;
  pin?: string;
};

export type YardGround = { outline: number[][]; span: number; points: number; name: string };

export type YardLease = {
  landlord: string;
  contact: string;
  email: string;
  phone: string;
  lessee: string;
  referenceDate: string;
  county: string;
  acres: string;
  term: string;
  start: string;
  end: string;
  baseRent: string;
  rentDue: string;
  rentStarts: string;
  prepaidRent: string;
  deposit: string;
  increaseDate: string;
  increaseAmount: string;
  extensions: string;
  notice: string;
  rentalTax: string;
  dueAtSigning: string;
  use: string;
  broker: string;
  schedule: string;
  option: string;
  saleMatch: string;
  nonsolicit: string;
  sublease: string;
};

export const leaseKeys = [
  "landlord",
  "lessee",
  "referenceDate",
  "county",
  "acres",
  "term",
  "start",
  "end",
  "baseRent",
  "rentDue",
  "rentStarts",
  "prepaidRent",
  "deposit",
  "increaseDate",
  "increaseAmount",
  "extensions",
  "notice",
  "rentalTax",
  "dueAtSigning",
  "broker",
  "use",
  "schedule",
  "option",
  "saleMatch",
  "nonsolicit",
  "sublease",
] as const satisfies readonly (keyof YardLease)[];

export const leaseNotes = ["use", "schedule", "option", "saleMatch", "nonsolicit", "sublease"] as const;

const COUNT_WORDS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5" };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function dollars(value: string) {
  const n = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function leaseDate(text: string, addMonths: number) {
  const match = text.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!match) return "";
  const month = MONTHS.indexOf(match[1].toLowerCase());
  if (month < 0) return "";
  return new Date(Number(match[3]), month + addMonths, Number(match[2])).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function nextIncrease(lease: YardLease) {
  const rows = [...lease.schedule.matchAll(/Months\s+(\d+)\s*-\s*\d+:\s*(Rent Abated|\$[\d,]+\.\d{2})/gi)];
  let paid = "";
  for (const row of rows) {
    if (/abated/i.test(row[2])) continue;
    if (!paid) {
      paid = row[2];
      continue;
    }
    if (row[2] === paid) continue;
    const rise = dollars(row[2]) - dollars(paid);
    return { date: leaseDate(lease.start, Number(row[1]) - 1), amount: rise > 0 ? money(rise) : row[2] };
  }
  return null;
}

/** Fills the increase, extension, and notice lines from the schedule and option when those boxes are still empty. */
export function filledLease(lease: YardLease): YardLease {
  const bump = nextIncrease(lease);
  const word = lease.option.match(/\b(one|two|three|four|five|\d+)\s+options?\b/i)?.[1] ?? "";
  return {
    ...lease,
    notice: lease.notice || lease.option.match(/\b(30|90|180)\s+days?\b/i)?.[1] || "",
    extensions: lease.extensions || (word ? (COUNT_WORDS[word.toLowerCase()] ?? word) : ""),
    increaseDate: lease.increaseDate || bump?.date || "",
    increaseAmount: lease.increaseAmount || bump?.amount || "",
  };
}

export function blankLease(): YardLease {
  return {
    landlord: "",
    contact: "",
    email: "",
    phone: "",
    lessee: "",
    referenceDate: "",
    county: "",
    acres: "",
    term: "",
    start: "",
    end: "",
    baseRent: "",
    rentDue: "",
    rentStarts: "",
    prepaidRent: "",
    deposit: "",
    increaseDate: "",
    increaseAmount: "",
    extensions: "",
    notice: "",
    rentalTax: "",
    dueAtSigning: "",
    use: "",
    broker: "",
    schedule: "",
    option: "",
    saleMatch: "",
    nonsolicit: "",
    sublease: "",
  };
}

export type YardSpaceUse = "parking" | "storage" | "other";

export type YardSpaceStatus = "available" | "available_soon" | "occupied" | "reserved" | "maintenance";

export type YardSpace = {
  id: string;
  use: YardSpaceUse;
  label: string;
  length: number;
  width: number;
  /** Feet from the left and top of the land. Missing on older spaces. */
  x?: number;
  y?: number;
  status?: YardSpaceStatus;
  color?: string;
  monthlyRate?: number;
  availableOn?: string;
  vacantSince?: string;
  customerId?: string;
  customerName?: string;
  archived?: boolean;
  text?: string;
};

export type AddedYard = {
  id: string;
  name: string;
  kind: YardKind;
  length: number;
  width: number;
  radius: number;
  span: number;
  outline: number[][];
  lease?: YardLease;
  leaseName?: string;
  leaseFile?: string;
  spaces?: YardSpace[];
  marks?: YardMark[];
  archived?: boolean;
};
