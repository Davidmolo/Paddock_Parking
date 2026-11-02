"""Early ops class (no flash) + disable enquiry/reserve in ops bridge."""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")

HEAD_INJECT = """
<script>
(function(){
  if(/(?:^|[?&])ops(?:[=&]|$)/.test(location.search||'')){
    document.documentElement.classList.add('yp-ops');
  }
})();
</script>
<style>
html.yp-ops body>header,html.yp-ops body>footer,html.yp-ops .head-row,html.yp-ops .geo,html.yp-ops .side,
html.yp-ops #overlay,html.yp-ops .chips,html.yp-ops .filter-row,html.yp-ops .zoomctl{display:none!important}
html.yp-ops body main{padding:0!important;max-width:none!important;min-height:0!important}
html.yp-ops .shell{display:block!important;grid-template-columns:1fr!important;gap:0!important;min-height:0!important}
html.yp-ops .card.map,html.yp-ops .shell>.card{border:0!important;box-shadow:none!important;border-radius:0!important;background:transparent!important;padding:0!important;margin:0!important}
html.yp-ops .map-stage,html.yp-ops #stage,html.yp-ops #yard{
  display:block!important;width:100%!important;height:min(72vh,680px)!important;min-height:520px!important;
  flex:none!important;background:#dde7d0!important
}
html.yp-ops body{background:#dde7d0!important;margin:0!important;overflow:hidden!important}
html.yp-ops #tip{z-index:40}
</style>
"""

BRIDGE = r"""
/* ===== YardPilot ops bridge ===== */
(function(){
  if(!/(^|[?&])ops\b/.test(location.search)) return;
  if(typeof units==='undefined') return;

  document.body.classList.add('ops','embed');
  document.documentElement.classList.add('yp-ops');

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
        selectUnit(u);
      };
    });
  }

  function selectUnit(u){
    selected.forEach(function(x){ if(x._g) x._g.classList.remove('sel'); });
    selected.clear();
    selected.set(u.id,u);
    if(u._g) u._g.classList.add('sel');
    try{ parent.postMessage({type:'yp:select', id:u.id}, '*'); }catch(_){}
  }

  if(typeof renderPanel==='function'){
    renderPanel = function(){
      var panel=document.getElementById('panel');
      if(panel) panel.innerHTML='';
      var badge=document.getElementById('sel-n');
      if(badge) badge.style.display='none';
      var btn=document.getElementById('hdr-reserve');
      if(btn){ btn.disabled=true; btn.style.display='none'; }
    };
  }
  window.openReserve = function(){};
  window.submitRes = function(){};
  window.clearSel = function(){
    selected.forEach(function(x){ if(x._g) x._g.classList.remove('sel'); });
    selected.clear();
  };

  showTip = function(e,u){
    const meta = tipMeta[u.id] || {};
    const col = unitColor(u);
    const status = meta.statusLabel || (u.state==='leased'||u.taken?'Occupied':u.state==='pending'?'Reserved':'Available');
    tip.innerHTML = '<div class="t-name"><span class="d" style="background:'+(col.top||col.color)+'"></span>'+u.id+'</div>'
      +'<div class="t-row"><span>Status</span><b>'+status+'</b></div>'
      +(meta.tenant ? '<div class="t-row"><span>Tenant</span><b>'+meta.tenant+'</b></div>' : '')
      +(meta.rate != null ? '<div class="t-row"><span>Rate</span><b>$'+Number(meta.rate).toLocaleString()+'/mo</b></div>' : '')
      +'<div class="t-cta">'+(meta.detail || 'Click to edit status, rate, or tenant')+'</div>';
    tip.classList.add('show');
    let x=e.clientX+14,y=e.clientY+14;
    if(x+220>innerWidth)x=e.clientX-220; if(y+140>innerHeight)y=e.clientY-140;
    tip.style.left=x+'px'; tip.style.top=y+'px';
  };

  toggle = selectUnit;

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

        if "yp-ops" not in html.split("</head>")[0]:
            if "</head>" not in html:
                print("no head", path.name)
                continue
            html = html.replace("</head>", HEAD_INJECT + "</head>", 1)

        html2, n = re.subn(
            r"/\* ===== YardPilot ops bridge ===== \*/[\s\S]*?\n\}\)\(\);\n",
            BRIDGE.lstrip() + "\n",
            html,
            count=1,
        )
        if n != 1:
            print("bridge FAIL", path.name, n)
            continue
        path.write_text(html2, encoding="utf-8")
        print("ok", path.name)


if __name__ == "__main__":
    main()
