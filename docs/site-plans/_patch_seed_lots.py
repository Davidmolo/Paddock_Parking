from pathlib import Path
import re

seed = Path(r"D:\azfs\yardpilot\apps\api\src\data\seed.ts")
text = seed.read_text(encoding="utf-8")

# Ensure import
if "site-plan-lots" not in text:
    text = text.replace(
        '/** Paddock Parking domain — aligned to David’s ops needs (not Jazzmin clutter). */\n',
        '/** Paddock Parking domain — aligned to David’s ops needs (not Jazzmin clutter). */\n\n'
        'import { sitePlanLots } from "./site-plan-lots";\n',
        1,
    )

# Replace lots array with site-plan lots + a few occupied assignments
new_lots = '''
export const lots: Lot[] = sitePlanLots.map((lot) => {
  const occupied: Record<string, { status: LotStatus; customerId: string; monthlyRate?: number }> = {
    "elw-Lot1": { status: "occupied", customerId: "c1", monthlyRate: 2400 },
    "elw-Lot2": { status: "occupied", customerId: "c1", monthlyRate: 4800 },
    "elw-P-01": { status: "occupied", customerId: "c8", monthlyRate: 225 },
    "elw-P-02": { status: "occupied", customerId: "c2", monthlyRate: 225 },
    "elw-UnitedRental": { status: "occupied", customerId: "c6", monthlyRate: 1600 },
    "p325-B1": { status: "occupied", customerId: "c3" },
    "p325-B2": { status: "occupied", customerId: "c3" },
    "p325-Lot2": { status: "occupied", customerId: "c4", monthlyRate: 2400 },
    "p51-A1": { status: "occupied", customerId: "c5", monthlyRate: 2400 },
    "p51-A3": { status: "reserved", customerId: "c7", monthlyRate: 2400 },
    "p6060-1": { status: "occupied", customerId: "c5", monthlyRate: 180 },
    "p6060-2": { status: "occupied", customerId: "c5", monthlyRate: 180 },
    "p6060-LotA": { status: "occupied", customerId: "c7", monthlyRate: 3600 },
  };
  const patch = occupied[lot.id];
  if (!patch) return lot as Lot;
  return {
    ...(lot as Lot),
    status: patch.status,
    customerId: patch.customerId,
    monthlyRate: patch.monthlyRate ?? (lot as Lot).monthlyRate,
  };
});
'''

text2, n = re.subn(
    r"export const lots: Lot\[\] = \[[\s\S]*?\n\];",
    new_lots.strip(),
    text,
    count=1,
)
if n != 1:
    raise SystemExit(f"lots replace failed n={n}")

# Remap customer lotIds to new space ids
replacements = {
    'lotIds: ["l1", "l2"]': 'lotIds: ["elw-Lot1", "elw-Lot2"]',
    'lotIds: ["l4"]': 'lotIds: ["elw-P-02"]',
    'lotIds: ["l7", "l8"]': 'lotIds: ["p325-B1", "p325-B2"]',
    'lotIds: ["l9"]': 'lotIds: ["p325-Lot2"]',
    'lotIds: ["l13", "l14"]': 'lotIds: ["p6060-1", "p6060-2"]',
    'lotIds: ["l6"]': 'lotIds: ["elw-UnitedRental"]',
    'lotIds: ["l16"]': 'lotIds: ["p6060-LotA"]',
    'lotIds: ["l17"]': 'lotIds: ["elw-P-01"]',
    'lotId: "l10"': 'lotId: "p325-Lot5"',
}
for a, b in replacements.items():
    text2 = text2.replace(a, b)

seed.write_text(text2, encoding="utf-8")
print("patched seed.ts")
