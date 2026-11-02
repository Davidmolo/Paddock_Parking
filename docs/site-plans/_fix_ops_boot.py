from pathlib import Path

root = Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")
for p in root.glob("*.html"):
    t = p.read_text(encoding="utf-8")
    t2 = t.replace("ops)\x08/", r"ops)\b/").replace("ops\x08/", r"ops\b/")
    p.write_text(t2, encoding="utf-8")
    for i, line in enumerate(t2.splitlines(), 1):
        if "classList.add('ops')" in line or "(?:embed|ops)" in line:
            print(p.name, i, repr(line[:110]))
