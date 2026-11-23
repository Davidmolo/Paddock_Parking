import type { Lot } from '../data/seed.js';
import type { StoredMark, StoredSpace, StoredYard } from './yard-store.js';

/** Live yards edited the same way as a drawn yard. */
export const PADDOCK_EDITOR_IDS = ['prop-16', 'prop-325', 'prop-6060'] as const;

const NAMES: Record<(typeof PADDOCK_EDITOR_IDS)[number], string> = {
  'prop-16': 'Paddock 16',
  'prop-325': 'Paddock 325',
  'prop-6060': 'Paddock 6060',
};

const ACRE = '#57a5f5';
const HALF = '#54cbe0';
const STALL = '#ffb84d';
const LEASED = '#c4c9cf';

type Person = { id: string; name: string };
type Box = { number: string; x: number; y: number; w: number; h: number; use: string; color: string };
type Plan = { unit: number; ox: number; oy: number; wide: number; tall: number; lots: Box[]; lanes: Box[]; gate: Box };

/** Plan units from the site-plan drawings. Feet are units ÷ unit scale, origin at the pad corner. */
const PLANS: Record<(typeof PADDOCK_EDITOR_IDS)[number], Plan> = {
  'prop-16': {
    unit: 1.5,
    ox: -368,
    oy: 170,
    wide: 2178,
    tall: 670,
    lots: [
      { number: 'Lot 1', x: 30, y: 200, w: 523, h: 187, use: 'other', color: ACRE },
      { number: 'Lot 2', x: 30, y: 390, w: 523, h: 375, use: 'other', color: ACRE },
      { number: 'Lot 3', x: 557, y: 200, w: 166, h: 295, use: 'other', color: HALF },
      { number: 'Lot 4', x: 725, y: 200, w: 166, h: 295, use: 'other', color: HALF },
      { number: 'Lot 5', x: 893, y: 200, w: 166, h: 295, use: 'other', color: HALF },
      { number: 'Lot 6', x: 1061, y: 200, w: 166, h: 295, use: 'other', color: HALF },
      { number: 'Lot 7', x: 1229, y: 200, w: 166, h: 295, use: 'other', color: HALF },
      { number: 'United Rental', x: 557, y: 497, w: 225, h: 292, use: 'other', color: LEASED },
      { number: 'Lot 8', x: 1397, y: 200, w: 334, h: 295, use: 'other', color: ACRE },
      { number: 'Lot 9', x: 1061, y: 497, w: 334, h: 293, use: 'other', color: ACRE },
      { number: 'Lot 10', x: 1397, y: 497, w: 334, h: 293, use: 'other', color: ACRE },
      ...[497, 608, 719].flatMap((y, row) =>
        Array.from({ length: 9 }, (_, i) => ({
          number: `P-${String(row * 9 + i + 1).padStart(2, '0')}`,
          x: 792 + i * 30,
          y,
          w: 27,
          h: 70,
          use: 'parking',
          color: STALL,
        })),
      ),
    ],
    lanes: [
      { number: 'north', x: -368, y: 170, w: 2178, h: 26, use: 'other', color: '' },
      { number: 'west', x: 22, y: 200, w: 4, h: 590, use: 'other', color: '' },
      { number: 'mid', x: 553, y: 200, w: 4, h: 590, use: 'other', color: '' },
      { number: 'split', x: 30, y: 387, w: 523, h: 3, use: 'other', color: '' },
      { number: 'aisle-a', x: 788, y: 567, w: 271, h: 41, use: 'other', color: '' },
      { number: 'aisle-b', x: 788, y: 678, w: 271, h: 41, use: 'other', color: '' },
    ],
    gate: { number: 'gate', x: -368, y: 373, w: 46, h: 36, use: 'other', color: '' },
  },
  'prop-325': {
    unit: 1,
    ox: 0,
    oy: 0,
    wide: 692,
    tall: 662,
    lots: [
      { number: 'Lot 1', x: 0, y: 0, w: 210, h: 368, use: 'other', color: ACRE },
      { number: 'Lot 2', x: 210, y: 0, w: 121, h: 368, use: 'other', color: ACRE },
      { number: 'Lot 3', x: 331, y: 0, w: 111, h: 368, use: 'other', color: ACRE },
      { number: 'Lot 4', x: 442, y: 0, w: 123, h: 368, use: 'other', color: ACRE },
      { number: 'Lot 5', x: 565, y: 0, w: 127, h: 368, use: 'other', color: ACRE },
      ...Array.from({ length: 9 }, (_, i) => ({
        number: `B${i + 1}`,
        x: 0,
        y: 228 + i * 13.5,
        w: 60,
        h: 13.5,
        use: 'parking',
        color: HALF,
      })),
      ...Array.from({ length: 14 }, (_, i) => ({
        number: `S${i + 1}`,
        x: 180 + i * 12,
        y: 408,
        w: 10,
        h: 64,
        use: 'parking',
        color: STALL,
      })),
      { number: 'Lot 6', x: 0, y: 472, w: 347, h: 190, use: 'other', color: ACRE },
      { number: 'Lot 7', x: 347, y: 408, w: 103, h: 254, use: 'other', color: ACRE },
      { number: 'Lot 8', x: 450, y: 408, w: 142, h: 254, use: 'other', color: ACRE },
      { number: 'Lot 9', x: 592, y: 408, w: 100, h: 254, use: 'other', color: ACRE },
    ],
    lanes: [
      { number: 'drive', x: 0, y: 368, w: 692, h: 40, use: 'other', color: '' },
      { number: 'apron', x: 0, y: 408, w: 180, h: 64, use: 'other', color: '' },
    ],
    gate: { number: 'gate', x: 0, y: 368, w: 11, h: 14, use: 'other', color: '' },
  },
  'prop-6060': {
    unit: 1.3,
    ox: -30,
    oy: 10,
    wide: 590,
    tall: 1006,
    lots: [
      { number: 'Lot A', x: 40, y: 60, w: 468, h: 244, use: 'other', color: ACRE },
      ...Array.from({ length: 21 }, (_, i) => ({ number: String(57 - i), x: 40 + i * 16, y: 356, w: 14, h: 98, use: 'parking', color: STALL })),
      ...Array.from({ length: 18 }, (_, i) => ({ number: String(19 + i), x: 40 + i * 16, y: 552, w: 14, h: 98, use: 'parking', color: STALL })),
      ...Array.from({ length: 18 }, (_, i) => ({ number: String(18 - i), x: 40 + i * 16, y: 654, w: 14, h: 98, use: 'parking', color: STALL })),
      ...Array.from({ length: 8 }, (_, i) => ({ number: `A${20 - i}`, x: -15 + i * 14, y: 976, w: 12, h: 34, use: 'storage', color: HALF })),
      ...Array.from({ length: 12 }, (_, i) => ({ number: `A${12 - i}`, x: 149 + i * 14, y: 976, w: 12, h: 34, use: 'storage', color: HALF })),
      ...Array.from({ length: 9 }, (_, i) => ({ number: `B${i + 1}`, x: 440, y: 364 + i * 18, w: 50, h: 16, use: 'parking', color: HALF })),
      { number: 'General Space', x: 433, y: 582, w: 80, h: 140, use: 'storage', color: ACRE },
      { number: 'Mobile Office', x: 433, y: 790, w: 67, h: 85, use: 'storage', color: LEASED },
      { number: 'A21', x: 438, y: 900, w: 57, h: 32, use: 'storage', color: HALF },
      { number: 'A22', x: 438, y: 934, w: 57, h: 32, use: 'storage', color: HALF },
      { number: 'A23', x: 438, y: 968, w: 57, h: 32, use: 'storage', color: HALF },
    ],
    lanes: [
      { number: 'row', x: 40, y: 454, w: 336, h: 98, use: 'other', color: '' },
      { number: 'south', x: 40, y: 752, w: 336, h: 113, use: 'other', color: '' },
      { number: 'seam', x: 40, y: 650, w: 336, h: 4, use: 'other', color: '' },
      { number: 'entry', x: 95, y: 930, w: 54, h: 86, use: 'other', color: '' },
    ],
    gate: { number: 'gate', x: 96, y: 996, w: 52, h: 16, use: 'other', color: '' },
  },
};

export function isPaddockEditor(id: string) {
  return (PADDOCK_EDITOR_IDS as readonly string[]).includes(id);
}

function feet(plan: Plan, box: Box) {
  return {
    x: (box.x - plan.ox) / plan.unit,
    y: (box.y - plan.oy) / plan.unit,
    length: box.w / plan.unit,
    width: box.h / plan.unit,
  };
}

function spaceUse(lot: Lot, traced: Box) {
  if (lot.lotType === 'truck_trailer' || lot.lotType === 'bobtail') return 'parking';
  if (lot.lotType === 'general_storage') return 'storage';
  return traced.use;
}

export function layoutPaddock(id: (typeof PADDOCK_EDITOR_IDS)[number], lots: Lot[], people: Person[]): StoredYard {
  const plan = PLANS[id];
  const byNumber = new Map(plan.lots.map((box) => [box.number, box]));
  let spare = 0;
  const spaces: StoredSpace[] = lots.map((lot) => {
    const traced = byNumber.get(lot.number);
    const at = traced
      ? feet(plan, traced)
      : { x: 8, y: 180 + spare++ * 78, length: 25, width: 75 };
    const person = lot.customerId ? people.find((item) => item.id === lot.customerId) : undefined;
    return {
      id: lot.id,
      use: traced ? spaceUse(lot, traced) : 'other',
      label: lot.number,
      ...at,
      color: traced?.color,
      status: lot.status,
      monthlyRate: lot.monthlyRate,
      availableOn: lot.availableOn,
      vacantSince: lot.vacantSince,
      customerId: lot.customerId,
      customerName: person?.name,
    };
  });
  const lanes: StoredMark[] = plan.lanes.map((lane) => ({
    id: `${id}-lane-${lane.number}`,
    category: 'roads',
    shape: 'road_h',
    ...feet(plan, lane),
  }));
  const gateAt = feet(plan, plan.gate);
  return {
    id,
    name: NAMES[id],
    kind: 'square',
    length: plan.wide / plan.unit,
    width: plan.tall / plan.unit,
    radius: 0,
    span: 0,
    outline: [],
    spaces,
    marks: [
      ...lanes,
      {
        id: `${id}-gate`,
        category: 'gates',
        shape: 'gate_w',
        ...gateAt,
        facing: 'w',
      },
    ],
  };
}

function generated(yard: StoredYard) {
  const marks = yard.marks ?? [];
  if (!marks.length) return false;
  if (marks.every((mark) => mark.id === `${yard.id}-road` || mark.id === `${yard.id}-gate`)) return true;
  return (yard.spaces ?? []).some((space) => space.length === 20 && space.width === 40 && !space.x && !space.y);
}

/** Add the editable plan once. A hand-edited plan is left alone. The old packed grid is replaced. */
export function ensurePaddockLayouts(state: { yards: StoredYard[]; lots: Lot[]; customers: Person[] }) {
  let added = false;
  for (const id of PADDOCK_EDITOR_IDS) {
    const plan = layoutPaddock(id, state.lots.filter((lot) => lot.propertyId === id), state.customers);
    const at = state.yards.findIndex((yard) => yard.id === id);
    if (at === -1) {
      state.yards.push(plan);
      added = true;
      continue;
    }
    if (!generated(state.yards[at])) continue;
    const kept = state.yards[at];
    state.yards[at] = { ...plan, lease: kept.lease, leaseName: kept.leaseName, leaseFile: kept.leaseFile };
    added = true;
  }
  return added;
}

/** Occupancy stays on the lot. The plan keeps size and position. */
export function paintPaddockYard(yard: StoredYard, lots: Lot[], people: Person[]): StoredYard {
  if (!isPaddockEditor(yard.id)) return yard;
  const byId = new Map(lots.filter((lot) => lot.propertyId === yard.id).map((lot) => [lot.id, lot]));
  return {
    ...yard,
    spaces: (yard.spaces ?? []).map((space) => {
      const lot = byId.get(space.id);
      if (!lot || space.archived) return space;
      const person = lot.customerId ? people.find((item) => item.id === lot.customerId) : undefined;
      return {
        ...space,
        status: lot.status,
        monthlyRate: lot.monthlyRate,
        customerId: lot.customerId ?? '',
        customerName: person?.name ?? '',
        availableOn: lot.availableOn ?? '',
        vacantSince: lot.vacantSince ?? '',
      };
    }),
  };
}
