"""Emit TypeScript lot seed snippets from Darya map unit definitions."""
from __future__ import annotations

import pathlib
import re

OUT = pathlib.Path(r"D:\azfs\yardpilot\docs\site-plans\generated-lots.ts")
MAPS = pathlib.Path(r"D:\azfs\yardpilot\docs\site-plans")

TYPE_TO_LOT = {
    "acre2": ("acre", None),
    "acre1": ("acre", None),
    "acreH": ("acre", None),
    "lot": ("acre", None),
    "spot": ("truck_trailer", "12' x 75'"),
    "truck": ("truck_trailer", "12' x 75'"),
    "sq": ("general_storage", "25' x 50'"),
    "bobtail": ("bobtail", "35' x 12'"),
    "park50": ("truck_trailer", "12' x 50'"),
    "park20": ("bobtail", "12' x 20'"),
    "quarter": ("acre", None),
    "half": ("acre", None),
    "leased": ("acre", None),
}


def parse_elwood_style(js: str, property_id: str, id_prefix: str) -> list[dict]:
    lots = []
    # add('type','id', x, y, w, h, 'state', acres [, pts])
    for m in re.finditer(
        r"add\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*'([^']+)'\s*,\s*([0-9.]+)",
        js,
    ):
        typ, uid, _x, _y, _w, _h, state, acres = m.groups()
        if typ == "leased" and uid in ("Taken",):
            continue  # skip non-rentable taken block or include as occupied?
        lot_type, size = TYPE_TO_LOT.get(typ, ("general_storage", "custom"))
        acres_f = float(acres)
        if lot_type == "acre":
            size = f"{acres_f:g} acre" if acres_f != 1 else "1 acre"
            if acres_f == 0:
                continue
        status = "available" if state == "open" else "occupied"
        rate = {
            "acre2": 4800,
            "acre1": 2400,
            "acreH": 1200,
            "lot": int(2400 * max(acres_f, 0.25)),
            "spot": 180,
            "truck": 180,
            "sq": 450,
            "bobtail": 180,
            "leased": 0,
        }.get(typ, 500)
        lots.append(
            {
                "id": f"{id_prefix}-{uid.replace(' ', '').replace('/', '-')}",
                "propertyId": property_id,
                "number": uid,
                "size": size or "—",
                "lotType": lot_type,
                "monthlyRate": rate,
                "status": status,
                "acres": acres_f if lot_type == "acre" else None,
            }
        )

    # loop spots: add('spot','P-'+..., ...)
    if "pitch=30" in js or "THREE rows of parking" in js:
        for i in range(1, 28):
            uid = f"P-{i:02d}"
            lots.append(
                {
                    "id": f"{id_prefix}-{uid}",
                    "propertyId": property_id,
                    "number": uid,
                    "size": "25 ft × 75 ft",
                    "lotType": "truck_trailer",
                    "monthlyRate": 180,
                    "status": "available",
                    "acres": None,
                }
            )

    # 51 Ave loops
    if "Sq'+(i+1)" in js or "Sq\"+(i+1)" in js:
        for i in range(1, 18):
            uid = f"Sq{i}"
            lots.append(
                {
                    "id": f"{id_prefix}-{uid}",
                    "propertyId": property_id,
                    "number": uid,
                    "size": "25' x 50'",
                    "lotType": "general_storage",
                    "monthlyRate": 450,
                    "status": "available",
                    "acres": None,
                }
            )
    if "Math.round(i*19.00)" in js:
        # truck row counts vary — inspect approx 84 from meta
        for i in range(1, 85):
            uid = str(i)
            if any(l["number"] == uid for l in lots):
                continue
            lots.append(
                {
                    "id": f"{id_prefix}-T{uid}",
                    "propertyId": property_id,
                    "number": uid,
                    "size": "12' x 75'",
                    "lotType": "truck_trailer",
                    "monthlyRate": 180,
                    "status": "available",
                    "acres": None,
                }
            )

    return lots


def emit_ts(lots: list[dict]) -> str:
    lines = ["export const generatedLots = ["]
    for l in lots:
        acres = f", acres: {l['acres']}" if l["acres"] is not None else ""
        lines.append(
            "  {"
            f" id: \"{l['id']}\", propertyId: \"{l['propertyId']}\", number: \"{l['number']}\","
            f" size: \"{l['size']}\", lotType: \"{l['lotType']}\", monthlyRate: {l['monthlyRate']},"
            f" status: \"{l['status']}\"{acres} "
            "},"
        )
    lines.append("];")
    return "\n".join(lines)


def main() -> None:
    all_lots: list[dict] = []
    mapping = [
        ("elwood-map.js", "prop-16", "elw"),
        ("51-map.js", "prop-51", "p51"),
        ("325-map.js", "prop-325", "p325"),
        ("6060-map.js", "prop-6060", "p6060"),
    ]
    for fname, prop, prefix in mapping:
        path = MAPS / fname
        if not path.exists():
            print("missing", path)
            continue
        js = path.read_text(encoding="utf-8", errors="replace")
        lots = parse_elwood_style(js, prop, prefix)
        print(fname, "lots", len(lots))
        all_lots.extend(lots)

    OUT.write_text(emit_ts(all_lots), encoding="utf-8")
    print("wrote", OUT, "total", len(all_lots))


if __name__ == "__main__":
    main()
