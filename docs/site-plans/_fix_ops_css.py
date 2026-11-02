"""Fix ops CSS so map-stage gets a real height (class is map-stage, not map-wrap)."""
from pathlib import Path

ROOT = Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")

OLD = """body.ops>header,body.ops>footer,body.ops .head-row,body.ops .geo,body.ops .side,
body.ops #overlay,body.ops .chips,body.ops .filter-row{display:none!important}
body.ops main{padding:0!important;max-width:none!important}
body.ops .shell{display:block!important;grid-template-columns:1fr!important;gap:0!important}
body.ops .map-wrap,body.ops .stage,body.ops #yard{width:100%!important;height:min(70vh,640px)!important;min-height:480px!important}
body.ops{background:#e8edf2}"""

NEW = """body.ops>header,body.ops>footer,body.ops .head-row,body.ops .geo,body.ops .side,
body.ops #overlay,body.ops .chips,body.ops .filter-row,body.ops .zoomctl{display:none!important}
body.ops main{padding:0!important;max-width:none!important;min-height:0!important}
body.ops .shell{display:block!important;grid-template-columns:1fr!important;gap:0!important;min-height:0!important}
body.ops .card.map,body.ops .shell>.card{border:0!important;box-shadow:none!important;border-radius:0!important;background:transparent!important;padding:0!important;margin:0!important}
body.ops .map-stage,body.ops #stage,body.ops #yard{
  display:block!important;width:100%!important;height:min(72vh,680px)!important;min-height:520px!important;
  flex:none!important;background:#dde7d0!important
}
body.ops{background:#e8edf2;margin:0!important;overflow:hidden!important}
body.ops #tip{z-index:40}"""

for path in sorted(ROOT.glob("*.html")):
    html = path.read_text(encoding="utf-8")
    if "body.ops .map-stage" in html:
        print("already", path.name)
        continue
    if OLD not in html:
        # try looser replace of the ops block
        import re

        html2, n = re.subn(
            r"/\* YardPilot ops embed \*/[\s\S]*?body\.ops\{background:#e8edf2\}",
            "/* YardPilot ops embed */\n" + NEW,
            html,
            count=1,
        )
        if n != 1:
            print("FAIL", path.name)
            continue
        path.write_text(html2, encoding="utf-8")
        print("patched-loose", path.name)
        continue
    path.write_text(html.replace(OLD, NEW), encoding="utf-8")
    print("patched", path.name)
