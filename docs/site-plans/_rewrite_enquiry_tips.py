from pathlib import Path

root = Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")
repls = [
    ("Click to add to your enquiry", "Click to edit status, rate, or tenant"),
    ("Selected — click to remove", "Selected"),
    ("Currently leased — not available", "Occupied — click to edit"),
    ("Under offer — ask us about a backup slot", "Reserved — click to edit"),
]
for p in root.glob("*.html"):
    t = p.read_text(encoding="utf-8")
    t2 = t
    for a, b in repls:
        t2 = t2.replace(a, b)
    if t2 != t:
        p.write_text(t2, encoding="utf-8")
        print("rewrote", p.name)
    else:
        print("clean", p.name)
