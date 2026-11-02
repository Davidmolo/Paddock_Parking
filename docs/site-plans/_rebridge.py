"""Replace YardPilot ops bridge in all yard map HTML files."""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")

BRIDGE = r"""
/* ===== YardPilot ops bridge ===== */
(function(){
  if(!/(^|[?&])ops\b/.test(location.search)) return;
  if(typeof units==='undefined') return;

  const toUnit = {available:'open',occupied:'leased',reserved:'pending',maintenance:'leased'};
  let tipMeta = {};

  function unitColor(u){
    if(typeof stateCol==='function') return stateCol(u);
    if(typeof TAKEN!=='undefined' && u.taken) return TAKEN;
    if(typeof TYPES!=='undefined' && TYPES[u.type]) return TYPES[u.type];
    return {top:'#94a3b8', wall:'#64748b', color:'#94a3b8'};
  }

  function bindAllClicks(){
    units.forEach(function(u){
      if(!u._g) return;
      u._g.style.cursor = 'pointer';
      u._g.onclick = function(){
        if(typeof view!=='undefined' && view.dragged) return;
        toggle(u);
      };
    });
  }

  const origShowTip = showTip;
  showTip = function(e,u){
    const meta = tipMeta[u.id];
    if(!meta){ return origShowTip(e,u); }
    const col = unitColor(u);
    const status = meta.statusLabel || 'Space';
    tip.innerHTML = '<div class="t-name"><span class="d" style="background:'+(col.top||col.color)+'"></span>'+u.id+'</div>'
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
      u.state = toUnit[st] || 'open';
      u.taken = u.state!=='open';
    });
    if(typeof drawScene==='function') drawScene();
    bindAllClicks();
    const avail = document.getElementById('avail-n');
    if(avail && typeof availableCount==='function') avail.textContent = availableCount();
  });

  bindAllClicks();
  try{ parent.postMessage({type:'yp:ready', ids: units.map(function(u){return u.id;})}, '*'); }catch(_){}
})();
"""


def main() -> None:
    for path in sorted(ROOT.glob("*.html")):
        html = path.read_text(encoding="utf-8")
        html2, n = re.subn(
            r"/\* ===== YardPilot ops bridge ===== \*/[\s\S]*?\n\}\)\(\);\n",
            BRIDGE.lstrip() + "\n",
            html,
            count=1,
        )
        if n != 1:
            print("FAIL", path.name, n)
            continue
        path.write_text(html2, encoding="utf-8")
        print("ok", path.name)


if __name__ == "__main__":
    main()
