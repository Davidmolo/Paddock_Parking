import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCoiText, readCoi } from './read-coi.js';

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

const ocrSample = `
X GL 100200-01 03/01/2026 | 03/01/2027 |
Phoenix Storage Yards, LLC ACCORDANCE WITH THE POLICY PROVISIONS.
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

  it('reads OCR text with a pipe between the dates', () => {
    expect(parseCoiText(ocrSample)).toMatchObject({
      policyNumber: 'GL 100200-01',
      effectiveDate: '2026-03-01',
      expirationDate: '2027-03-01',
      additionalInsuredName: 'Phoenix Storage Yards, LLC',
    });
  });

  it('reads the sample certificate PDF', async () => {
    const path = resolve(process.cwd(), '../../docs/coi-sample-upload.pdf');
    if (!existsSync(path)) return;
    const read = await readCoi(readFileSync(path));
    expect(read.policyNumber).toBe('GL 100200-01');
    expect(read.effectiveDate).toBe('2026-03-01');
    expect(read.expirationDate).toBe('2027-03-01');
    expect(read.additionalInsuredName).toBe('Phoenix Storage Yards, LLC');
  });

  it('reads the sample certificate photo', async () => {
    const path = resolve(process.cwd(), '../../docs/coi-test-photo.png');
    if (!existsSync(path)) return;
    const read = await readCoi(readFileSync(path));
    expect(read.policyNumber).toBe('GL 100200-01');
    expect(read.effectiveDate).toBe('2026-03-01');
    expect(read.expirationDate).toBe('2027-03-01');
    expect(read.additionalInsuredName).toBe('Phoenix Storage Yards, LLC');
  }, 60_000);
});
