import { describe, expect, it } from 'vitest';
import { lots } from '../data/seed.js';
import { layoutPaddock } from './paddock-layout.js';

function box(space: { x?: number; y?: number; length: number; width: number }) {
  return { x: space.x ?? 0, y: space.y ?? 0, length: space.length, width: space.width };
}

function hits(
  a: { x: number; y: number; length: number; width: number },
  b: { x: number; y: number; length: number; width: number },
) {
  return a.x < b.x + b.length - 0.05 && a.x + a.length - 0.05 > b.x && a.y < b.y + b.width - 0.05 && a.y + a.width - 0.05 > b.y;
}

describe('paddock layout', () => {
  it('keeps the site-plan grid, with a drive and a gate on the land', () => {
    for (const id of ['prop-16', 'prop-325', 'prop-6060'] as const) {
      const mine = lots.filter((lot) => lot.propertyId === id);
      const yard = layoutPaddock(id, mine, []);
      const spaces = (yard.spaces ?? []).map(box);
      const road = yard.marks?.find((mark) => mark.category === 'roads');
      const gate = yard.marks?.find((mark) => mark.category === 'gates');

      expect(spaces).toHaveLength(mine.length);
      expect(road).toBeTruthy();
      expect(gate).toBeTruthy();
      for (const space of spaces) {
        expect(space.x).toBeGreaterThanOrEqual(-0.01);
        expect(space.y).toBeGreaterThanOrEqual(-0.01);
        expect(space.x + space.length).toBeLessThanOrEqual(yard.length + 0.01);
        expect(space.y + space.width).toBeLessThanOrEqual(yard.width + 0.01);
      }
      expect(gate!.x).toBeGreaterThanOrEqual(-0.01);
      expect(gate!.y).toBeGreaterThanOrEqual(-0.01);
      expect(gate!.x + gate!.length).toBeLessThanOrEqual(yard.length + 0.01);
      expect(gate!.y + gate!.width).toBeLessThanOrEqual(yard.width + 0.01);
    }

    const sixteen = layoutPaddock('prop-16', lots.filter((lot) => lot.propertyId === 'prop-16'), []);
    const one = sixteen.spaces?.find((space) => space.label === 'Lot 8');
    const half = sixteen.spaces?.find((space) => space.label === 'Lot 3');
    const two = sixteen.spaces?.find((space) => space.label === 'Lot 2');
    expect(one).toMatchObject({ length: 334 / 1.5, width: 295 / 1.5 });
    expect(half).toMatchObject({ length: 166 / 1.5, width: 295 / 1.5 });
    expect(two).toMatchObject({ length: 523 / 1.5, width: 375 / 1.5 });
    const placed = (sixteen.spaces ?? []).map(box);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) expect(hits(placed[i], placed[j])).toBe(false);
    }

    const row = layoutPaddock('prop-325', lots.filter((lot) => lot.propertyId === 'prop-325'), []);
    const lot1 = row.spaces?.find((space) => space.label === 'Lot 1');
    const lot2 = row.spaces?.find((space) => space.label === 'Lot 2');
    expect(lot2?.x).toBeCloseTo((lot1?.x ?? 0) + (lot1?.length ?? 0), 5);
    expect(lot2?.y).toBeCloseTo(lot1?.y ?? 0, 5);
  });
});
