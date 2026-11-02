"""Extract layout scripts from parkingpaddock.com map pages saved in TEMP."""
from __future__ import annotations

import os
import pathlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

tmpdir = pathlib.Path(os.environ["TEMP"])
out_dir = pathlib.Path(__file__).resolve().parent
out_dir.mkdir(parents=True, exist_ok=True)

files = {
    "elwood": "elwood.html",
    "riovista": "riovista.html",
    "51": "51.html",
    "6060": "6060.html",
    "325": "325.html",
}

for key, fname in files.items():
    path = tmpdir / fname
    if not path.exists():
        print(f"MISSING {path}")
        continue
    html = path.read_text(encoding="utf-8", errors="replace")
    scripts = re.findall(r"<script(?![^>]*src)[^>]*>(.*?)</script>", html, re.S)
    main = max(scripts, key=len) if scripts else ""
    (out_dir / f"{key}-map.js").write_text(main, encoding="utf-8")
    print(f"==== {key} script={len(main)} ====")
    adds = re.findall(r"add\(([^;]+)\)", main)
    print(f"add() calls: {len(adds)}")
    for a in adds[:60]:
        print("  add(", a[:160].replace("\n", " "), ")")
    # also catch loop-generated spots
    if "pitch" in main and "spot" in main:
        print("  (also has loop-generated parking spots)")
    print()
