"""Inject YardPilot ops bridge into downloaded yard map HTML files."""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")

OPS_CSS = """
/* YardPilot ops embed */
body.ops>header,body.ops>footer,body.ops .head-row,body.ops .geo,body.ops .side,
body.ops #overlay,body.ops .chips,body.ops .filter-row{display:none!important}
body.ops main{padding:0!important;max-width:none!important}
body.ops .shell{display:block!important;grid-template-columns:1fr!important;gap:0!important}
body.ops .map-wrap,body.ops .stage,body.ops #yard{width:100%!important;height:min(70vh,640px)!important;min-height:480px!important}
body.ops{background:#e8edf2}
"""

OPS_BOOT = r"""
if(/(^|[?&])(?:embed|ops)\b/.test(location.search)) document.body.classList.add('embed');
if(/(^|[?&])ops\b/.test(location.search)) document.body.classList.add('ops');
"""

OPS_BRIDGE = r"""
/* ===== YardPilot ops bridge ===== */
(function(){
  if(!/(^|[?&])ops\b/.test(location.search)) return;
  if(typeof units==='undefined') return;

  const toUnit = {available:'open',occupied:'leased',reserved:'pending',maintenance:'leased'};
  let tipMeta = {};

  const origShowTip = showTip;
  showTip = function(e,u){
    const meta = tipMeta[u.id];
    if(!meta){ return origShowTip(e,u); }
    const col = stateCol(u);
    const status = meta.statusLabel || (u.state==='leased'?'Occupied':u.state==='pending'?'Reserved':'Available');
    tip.innerHTML = '<div class="t-name"><span class="d" style="background:'+col.top+'"></span>'+u.id+'</div>'
      +'<div class="t-row"><span>Status</span><b>'+status+'</b></div>'
      +(meta.tenant ? '<div class="t-row"><span>Tenant</span><b>'+meta.tenant+'</b></div>' : '')
      +(meta.rate != null ? '<div class="t-row"><span>Rate</span><b>$'+Number(meta.rate).toLocaleString()+'/mo</b></div>' : '')
      +(meta.detail ? '<div class="t-cta">'+meta.detail+'</div>' : '<div class="t-cta">Click to edit in Inventory</div>');
    tip.classList.add('show');
    let x=e.clientX+14,y=e.clientY+14;
    if(x+220>innerWidth)x=e.clientX-220; if(y+140>innerHeight)y=e.clientY-140;
    tip.style.left=x+'px'; tip.style.top=y+'px';
  };

  toggle = function(u){
    selected.forEach(function(x){ if(x._g) x._g.classList.remove('sel'); });
    selected.clear();
    selected.set(u.id,u);
    if(u._g) u._g.classList.add('sel');
    if(typeof renderPanel==='function') try{ renderPanel(); }catch(_){}
    try{ parent.postMessage({type:'yp:select', id:u.id}, '*'); }catch(_){}
  };

  window.addEventListener('message', function(ev){
    const d = ev.data;
    if(!d || d.type!=='yp:statuses') return;
    tipMeta = d.meta || {};
    const map = d.map || {};
    units.forEach(function(u){
      const st = map[u.id];
      if(!st) return;
      u.state = toUnit[st] || u.state;
      u.taken = u.state!=='open';
    });
    if(typeof drawScene==='function') drawScene();
    const avail = document.getElementById('avail-n');
    if(avail && typeof availableCount==='function') avail.textContent = availableCount();
  });

  try{ parent.postMessage({type:'yp:ready', ids: units.map(function(u){return u.id;})}, '*'); }catch(_){}
})();
"""


def patch_file(path: pathlib.Path) -> None:
    html = path.read_text(encoding="utf-8", errors="replace")

    # Ensure ops CSS once
    if "YardPilot ops embed" not in html:
        html = html.replace("</style>", OPS_CSS + "\n</style>", 1)

    # Expand embed boot to also set ops
    html = re.sub(
        r"if\(/\(\^\|\[\?&\]\)embed\\b/.*?document\.body\.classList\.add\('embed'\);",
        OPS_BOOT.strip(),
        html,
        count=1,
        flags=re.S,
    )

    # Inject bridge just before final drawScene(); renderPanel();
    if "YardPilot ops bridge" not in html:
        if "drawScene(); renderPanel();" in html:
            html = html.replace(
                "drawScene(); renderPanel();",
                "drawScene(); renderPanel();\n" + OPS_BRIDGE,
                1,
            )
        else:
            # Rio Vista may differ slightly
            m = re.search(r"drawScene\(\);\s*", html)
            if m:
                idx = m.end()
                html = html[:idx] + "\n" + OPS_BRIDGE + html[idx:]

    path.write_text(html, encoding="utf-8")
    print(f"patched {path.name}")


def main() -> None:
    for path in sorted(ROOT.glob("*.html")):
        patch_file(path)


if __name__ == "__main__":
    main()
