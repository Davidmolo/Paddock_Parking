import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCoiText, readCoiPdf } from './read-coi.js';

const sample = `
National Interstate Insurance
MVP 8300039-00
10/15/2026
10/15/2027
Physical Damage
B1525PFAP26134377
07/01/2026
07/01/2027
Canary Yellow Logistics Ltd.
`;

describe('parseCoiText', () => {
  it('reads the liability policy and leaves physical damage', () => {
    expect(parseCoiText(sample)).toMatchObject({
      carrier: 'National Interstate Insurance',
      policyNumber: 'MVP 8300039-00',
      effectiveDate: '2026-10-15',
      expirationDate: '2027-10-15',
      additionalInsuredName: 'Canary Yellow Logistics Ltd.',
    });
  });

  it('reads the sample certificate file', async () => {
    const path = 'C:/Users/123/Downloads/Certificate.pdf';
    if (!existsSync(path)) return;
    const bytes = readFileSync(path);
    const read = await readCoiPdf(bytes);
    expect(read.policyNumber).toBe('MVP 8300039-00');
    expect(read.effectiveDate).toBe('2026-10-15');
    expect(read.expirationDate).toBe('2027-10-15');
    expect(read.carrier).toContain('National Interstate');
    expect(read.additionalInsuredName).toContain('Canary Yellow');
  });
});
