import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { blankLease, filledLease, type YardLease } from "@/components/lots/types";

export const runtime = "nodejs";

function grab(text: string, re: RegExp) {
  return text.match(re)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function parseLease(raw: string): YardLease & { yard: string } {
  const text = raw.replace(/[“”]/g, '"').replace(/\s+/g, " ");
  const schedule = [...text.matchAll(/Months\s+\d{2}-\d{2}:\s*(?:Rent Abated|\$[\d,]+\.\d{2}\/Month Gross\*)/g)]
    .map((match) => match[0])
    .join("\n");
  const parsed = {
    ...blankLease(),
    landlord: grab(text, /between\s+(.+?)\s+\(\s*"Lessor"\s*\)/i),
    lessee: grab(text, /\(\s*"Lessor"\s*\)\s+and\s+(.+?)\s+\(\s*"Lessee"\s*\)/i),
    referenceDate: grab(text, /dated for reference purposes only\s+([A-Za-z]+ \d{1,2}, \d{4})/i),
    yard: grab(text, /zip\)\s*:\s*(.+?)\s+\(\s*"Premises"\s*\)/i),
    county: grab(text, /County of\s+([A-Za-z]+)/i),
    acres: grab(text, /Project\)\s*:\s*(.+?)\s*\.\s*\(See also/i),
    term: grab(text, /Term:\s*(.+?)\s*\(\s*"Original Term"\s*\)/i),
    start: grab(text, /commencing\s+([A-Za-z]+ \d{1,2}, \d{4})\s+\(\s*"Commencement/i),
    end: grab(text, /ending\s+([A-Za-z]+ \d{1,2}, \d{4})\s+\(\s*"Expiration/i),
    baseRent: grab(text, /Base Rent:\s*(\$[\d,]+\.\d{2}\s+per\s+month)/i),
    rentDue: grab(text, /payable on the\s+(\d{1,2}(?:st|nd|rd|th))\s+day/i),
    rentStarts: grab(text, /each month commencing\s+([A-Za-z]+ \d{1,2},\s*\d{4})/i),
    prepaidRent: grab(text, /Base Rent:\s*(\$[\d,]+\.\d{2}\s+for the period\s+[A-Za-z]+ \d{1,2}-[A-Za-z]+ \d{1,2}, \d{4})/i),
    deposit: grab(text, /Security Deposit:\s*(\$[\d,]+\.\d{2})/i),
    increaseDate: grab(text, /increas(?:e|es).{0,80}?([A-Za-z]+ \d{1,2}, \d{4})/i),
    increaseAmount: grab(text, /increas(?:e|es|ed) by\s+(\$[\d,]+\.\d{2}|\d+(?:\.\d+)?\s*%)/i),
    extensions: grab(text, /(\d+)\s+(?:options? to extend|extensions?)/i),
    notice: (["30", "90", "180"] as const).find((days) => new RegExp(`\\b${days}\\s+days?\\s+(?:prior|before|written notice)`, "i").test(text)) ?? "",
    rentalTax: grab(text, /Other:\s*(\$[\d,]+\.\d{2})\s+for Rental Tax/i),
    dueAtSigning: grab(text, /Total Due Upon Execution of this Lease:\s*(\$[\d,]+\.\d{2})/i),
    use: grab(text, /Agreed Use:\s*(.+?)\s*\.\s*\(See also Paragraph 6\)/i),
    broker: grab(text, /([A-Za-z][A-Za-z& ]+\([A-Za-z ]+\))\s+represents Lessor exclusively/i),
    schedule: schedule + (/\*\s*Plus applicable Rental Tax/i.test(text) ? "\nPlus applicable rental tax" : ""),
    option: grab(text, /(One option to extend.+?market rates\.)/i),
    saleMatch: grab(text, /(If Lessor sells the Premises.+?match the offer\.)/i),
    nonsolicit: grab(text, /(Lessor will not solicit.+?lease ends\.)/i),
    sublease: grab(text, /(Lessee shall be allowed to license or sublease.+?assignment\.)/i),
  };
  const { yard, ...lease } = parsed;
  return { ...filledLease(lease), yard };
}

function unpdf() {
  const roots = [path.resolve(process.cwd(), "../api"), path.resolve(process.cwd(), "apps/api")];
  const root = roots.find((dir) => existsSync(path.join(dir, "node_modules/unpdf"))) ?? roots[0];
  return createRequire(path.join(root, "package.json"))("unpdf") as {
    getDocumentProxy: (data: Uint8Array) => Promise<unknown>;
    extractText: (pdf: unknown, options: { mergePages: boolean }) => Promise<{ text: string | string[] }>;
  };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json(blankLease(), { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { getDocumentProxy, extractText } = unpdf();
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  const body = Array.isArray(text) ? text.join("\n") : text;
  return NextResponse.json(parseLease(body));
}
