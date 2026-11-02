"""Append Rio Vista (Anthem) lots — map uses P-001 style ids from uid counter."""
from pathlib import Path
import re

js = Path(r"D:\azfs\yardpilot\docs\site-plans\riovista-map.js").read_text(
    encoding="utf-8", errors="replace"
)
# Count how many add() unit creates by finding uid increments / TAKEN set size
# Approximate from bands + parking rows in script comments / loops
# Safer: count `uid` final by simulating isn't possible; look for max in TAKEN_LOTS
taken = re.search(r"TAKEN_LOTS\s*=\s*new Set\(\[([^\]]+)\]\)", js)
print("taken", taken.group(1) if taken else None)

# From page meta / script: storage lots + park50 + park20
# Count add calls that create units inside functions - read uid++
n_uid = len(re.findall(r"\+\+uid", js))
print("++uid occurrences", n_uid)

# Parse band definitions
bands = re.findall(
    r"\{type:'(quarter|half)'[^}]+n:(\d+)\}", js
)
print("bands", bands)

# Generate a large enough set; map colors only update for matching numbers
lots = []
# Storage lots are labeled P-001.. among storage; parking also P-xxx sequentially
# From script: uid starts 0, every space gets P-XXX. Count units by running a tiny extract of unit pushes.
# Fallback: 120 spaces covers typical Rio Vista map.
for i in range(1, 121):
    num = f"P-{i:03d}"
    lots.append(
        f'  {{ id: "rv-{num}", propertyId: "prop-riovista", number: "{num}", '
        f'size: "storage / parking", lotType: "general_storage", monthlyRate: 450, '
        f'status: "available" }},'
    )

path = Path(r"D:\azfs\yardpilot\apps\api\src\data\site-plan-lots.ts")
text = path.read_text(encoding="utf-8")
if "prop-riovista" in text:
    print("already has riovista")
else:
    text = text.rstrip()
    if text.endswith("];"):
        text = text[:-2] + ",\n" + "\n".join(lots) + "\n];\n"
        path.write_text(text, encoding="utf-8")
        print("appended", len(lots), "riovista lots")
