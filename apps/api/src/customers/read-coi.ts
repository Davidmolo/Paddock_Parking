import { extractText, getDocumentProxy } from 'unpdf';

export type ReadCoi = {
  carrier?: string;
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  additionalInsuredName?: string;
};

const dateLine = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function iso(mdy: string) {
  const match = mdy.match(dateLine);
  if (!match) return;
  return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

function policyBefore(lines: string[], index: number) {
  for (let i = index - 1; i >= Math.max(0, index - 3); i--) {
    const line = lines[i] ?? '';
    if (dateLine.test(line) || /physical damage/i.test(line)) continue;
    if (/^\d[\d,]*$/.test(line)) continue;
    if (/\d/.test(line) && /[A-Za-z]/.test(line) && line.length <= 40) return line;
  }
}

export function parseCoiText(text: string): ReadCoi {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const found: ReadCoi = {};
  let physical: ReadCoi | undefined;

  for (let i = 0; i < lines.length - 1; i++) {
    const effective = iso(lines[i] ?? '');
    const expires = iso(lines[i + 1] ?? '');
    if (!effective || !expires) continue;
    const policyNumber = policyBefore(lines, i);
    if (!policyNumber) continue;
    const near = lines.slice(Math.max(0, i - 4), i).join(' ');
    const row = { policyNumber, effectiveDate: effective, expirationDate: expires };
    if (/physical damage/i.test(near)) {
      physical ??= row;
      continue;
    }
    Object.assign(found, row);
    break;
  }
  if (!found.policyNumber && physical) Object.assign(found, physical);

  const carrier = lines.find(
    (line) =>
      /insurance/i.test(line) &&
      !/certificate|affording|agency|acord|policy/i.test(line) &&
      line.length < 80,
  );
  if (carrier) found.carrier = carrier;

  const holder = lines
    .filter(
      (line) =>
        /\b(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Corp\.?)\b/i.test(line) &&
        !/insurance agency/i.test(line) &&
        line.length < 80,
    )
    .at(-1);
  if (holder && holder !== found.carrier) found.additionalInsuredName = holder;
  const compact = parseCompact(text);
  if (compact.policyNumber) {
    found.policyNumber = compact.policyNumber;
    found.effectiveDate = compact.effectiveDate;
    found.expirationDate = compact.expirationDate;
  }
  found.carrier ??= compact.carrier;
  found.additionalInsuredName ??= compact.additionalInsuredName;
  return found;
}

function parseCompact(text: string): ReadCoi {
  const flat = text.replace(/\s*\n\s*/g, ' ');
  const found: ReadCoi = {};
  for (const match of flat.matchAll(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}\/\d{2}\/\d{4})/g)) {
    const index = match.index ?? 0;
    const before = flat.slice(Math.max(0, index - 80), index).trimEnd();
    const marked = before.match(/\d[A-Z]([A-Z]{2,6})\s+([A-Z0-9]+-\d{2})$/);
    const plain = before.match(/(?:^|[^A-Z])([A-Z]{2,})\s+([A-Z0-9]+-\d{2})$/);
    const packed = before.match(/([A-Z][A-Z0-9]{6,})$/);
    const policy = marked
      ? `${marked[1]} ${marked[2]}`
      : plain
        ? `${plain[1]} ${plain[2]}`
        : packed?.[1];
    const effective = iso(match[1] ?? '');
    const expires = iso(match[2] ?? '');
    if (!policy || !effective || !expires) continue;
    if (/physical damage/i.test(before) && found.policyNumber) continue;
    found.policyNumber = policy;
    found.effectiveDate = effective;
    found.expirationDate = expires;
    if (!/physical damage/i.test(before)) break;
  }
  const carrier = flat.match(/([A-Za-z][A-Za-z .,&']{2,40}?Insurance)(?=\d{5})/)?.[1];
  if (carrier) found.carrier = carrier.trim();
  const companies = [...flat.matchAll(/[A-Z0-9][A-Za-z0-9 .,&'-]{2,60}?(?:LLC|Ltd\.?|Inc\.?|Corp\.?)(?=[^A-Za-z]|$)/g)]
    .map((item) => item[0])
    .filter((name) => !/insurance agency/i.test(name));
  const holder = companies.at(-1);
  if (holder && holder !== found.carrier) found.additionalInsuredName = holder;
  return found;
}

export async function readCoiPdf(bytes: Buffer): Promise<ReadCoi> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  const body = Array.isArray(text) ? text.join('\n') : text;
  return parseCoiText(body);
}
