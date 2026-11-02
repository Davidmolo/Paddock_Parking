from pathlib import Path

t = Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps\elwood.html").read_text(
    encoding="utf-8"
)
print("bs", t.count(chr(8)))
print("indexOf", "indexOf('ops')" in t)
print("toolbar", "html.yp-ops .toolbar" in t)
print("enquiry in bridge tip?", "add to your enquiry" in t[t.find("YardPilot ops bridge") :])
i = t.find("if ((location.search")
print(repr(t[i : i + 90]) if i >= 0 else "missing gate")
