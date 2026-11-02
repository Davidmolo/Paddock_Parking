"""Re-inject a stronger YardPilot ops bridge into all yard map HTML files."""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")

OPS_BRIDGE = r"""
/* ===== YardPilot ops bridge ===== */
(function(){
  if(!/(^|[?&])ops\b/.test(location.search)) return;
  if(typeof units==='undefined') return;

  const toUnit = {available:'open',occupied:'leased',reserved:'pending',maintenance:'leased'};
  let tipMeta = {};

  function unitColor(u){
    if(typeof stateCol==='function') return stateCol(u);
    if(u.taken) return (typeof TAKEN!=='undefined'?TAKEN:{top:'#c4c9cf',wall:'#a3a9b1'});
    const t = (typeof TYPES!=='undefined' && TYPES[u.type]) ? TYPES[u.type] : {top:'#57a5f5',color:'#0a84ff'};
    return {top:t.top||t.color||'#57a5f5', wall:t.wall||'#2f7bd0'};
  }

  if(typeof showTip==='function'){
    const origShowTip = showTip;
    showTip = function(e,u){
      const meta = tipMeta[u.id];
      if(!meta){ return origShowTip(e,u); }
      const col = unitColor(u);
      tip.innerHTML = '<div class="t-name"><span class="d" style="background:'+col.top+'"></span>'+u.id+'</div>'
        +'<div class="t-row"><span>Status</span><b>'+(meta.statusLabel||'—')+'</b></div>'
        +(meta.tenant ? '<div class="t-row"><span>Tenant</span><b>'+meta.tenant+'</b></div>' : '')
        +(meta.rate != null ? '<div class="t-row"><span>Rate</span><b>$'+Number(meta.rate).toLocaleString()+'/mo</b></div>' : '')
        +(meta.detail ? '<div class="t-cta">'+meta.detail+'</div>' : '<div class="t-cta">Click to edit in Inventory</div>');
      tip.classList.add('show');
      let x=e.clientX+14,y=e.clientY+14;
      if(x+220>innerWidth)x=e.clientX-220; if(y+140>innerHeight)y=e.clientY-140;
      tip.style.left=x+'px'; tip.style.top=y+'px';
    };
  }

  toggle = function(u){
    selected.forEach(function(x){ if(x._g) x._g.classList.remove('sel'); });
    selected.clear();
    selected.set(u.id,u);
    if(u._g) u._g.classList.add('sel');
    if(typeof renderPanel==='function') try{ renderPanel(); }catch(_){}
    try{ parent.postMessage({type:'yp:select', id:u.id}, '*'); }catch(_){}
  };

  function enableOpsClicks(){
    units.forEach(function(u){
      if(!u._g) return;
      u._g.style.pointerEvents = 'auto';
      u._g.style.cursor = 'pointer';
      u._g.onclick = function(ev){
        if(typeof view!=='undefined' && view.dragged) return;
        ev.stopPropagation();
        toggle(u);
      };
    });
  }

  window.addEventListener('message', function(ev){
    const d = ev.data;
    if(!d || d.type!=='yp:statuses') return;
    tipMeta = d.meta || {};
    const map = d.map || {};
    units.forEach(function(u){
      const st = map[u.id];
      if(!st) return;
      u.state = toUnit[st] || 'open';
      u.taken = u.state!=='open';
    });
    if(typeof drawScene==='function') drawScene();
    enableOpsClicks();
    const avail = document.getElementById('avail-n');
    if(avail && typeof availableCount==='function') avail.textContent = availableCount();
  });

  enableOpsClicks();
  try{ parent.postMessage({type:'yp:ready', ids: units.map(function(u){return u.id;})}, '*'); }catch(_){}
})();
"""


def patch(path: pathlib.Path) -> None:
    html = path.read_text(encoding="utf-8")
    # Remove previous bridge
    html = re.sub(
        r"\n/\* ===== YardPilot ops bridge ===== \*/\n\(function\(\)\{[\s\S]*?\n\}\)\(\);\n",
        "\n",
        html,
        count=1,
    )
    if "drawScene(); renderPanel();" in html:
        html = html.replace(
            "drawScene(); renderPanel();",
            "drawScene(); renderPanel();\n" + OPS_BRIDGE,
            1,
        )
    else:
        html = re.sub(
            r"(drawScene\(\);\s*)",
            r"\1\n" + OPS_BRIDGE + "\n",
            html,
            count=1,
        )
    path.write_text(html, encoding="utf-8")
    print("patched", path.name)


def main() -> None:
    for p in sorted(ROOT.glob("*.html")):
        patch(p)


if __name__ == "__main__":
    main()
