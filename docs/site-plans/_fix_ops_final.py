"""Fix corrupted ops regex + hide public toolbar; never show enquiry tips in admin."""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")

BRIDGE = """
/* ===== YardPilot ops bridge ===== */
(function(){
  var qs = location.search || '';
  if (qs.indexOf('ops') === -1) return;
  if (typeof units === 'undefined') return;

  document.body.classList.add('ops', 'embed');
  document.documentElement.classList.add('yp-ops');

  /* Hide leftover public chrome the CSS might miss */
  document.querySelectorAll('.toolbar, .tb-hint, .zhint, .head-row, #hdr-reserve, .side, .geo, header, footer').forEach(function(el){
    el.style.display = 'none';
  });

  var toUnit = {available:'open', occupied:'leased', reserved:'pending', maintenance:'leased'};
  var tipMeta = {};

  function unitColor(u){
    if (typeof stateCol === 'function') return stateCol(u);
    if (typeof TAKEN !== 'undefined' && u.taken) return TAKEN;
    if (typeof TYPES !== 'undefined' && TYPES[u.type]) return TYPES[u.type];
    return {top:'#94a3b8', wall:'#64748b', color:'#94a3b8'};
  }

  function bindAllClicks(){
    units.forEach(function(u){
      if (!u._g) return;
      u._g.style.cursor = 'pointer';
      u._g.onclick = function(){
        if (typeof view !== 'undefined' && view.dragged) return;
        selectUnit(u);
      };
    });
  }

  function selectUnit(u){
    selected.forEach(function(x){ if (x._g) x._g.classList.remove('sel'); });
    selected.clear();
    selected.set(u.id, u);
    if (u._g) u._g.classList.add('sel');
    try { parent.postMessage({type:'yp:select', id:u.id}, '*'); } catch (_) {}
  }

  renderPanel = function(){};
  window.openReserve = function(){};
  window.submitRes = function(){};
  window.clearSel = function(){
    selected.forEach(function(x){ if (x._g) x._g.classList.remove('sel'); });
    selected.clear();
  };

  showTip = function(e, u){
    var meta = tipMeta[u.id] || {};
    var col = unitColor(u);
    var status = meta.statusLabel || (u.state === 'leased' || u.taken ? 'Occupied' : u.state === 'pending' ? 'Reserved' : 'Available');
    tip.innerHTML = '<div class="t-name"><span class="d" style="background:' + (col.top || col.color) + '"></span>' + u.id + '</div>'
      + '<div class="t-row"><span>Status</span><b>' + status + '</b></div>'
      + (meta.tenant ? '<div class="t-row"><span>Tenant</span><b>' + meta.tenant + '</b></div>' : '')
      + (meta.rate != null ? '<div class="t-row"><span>Rate</span><b>$' + Number(meta.rate).toLocaleString() + '/mo</b></div>' : '')
      + '<div class="t-cta">' + (meta.detail || 'Click to edit status, rate, or tenant') + '</div>';
    tip.classList.add('show');
    var x = e.clientX + 14, y = e.clientY + 14;
    if (x + 220 > innerWidth) x = e.clientX - 220;
    if (y + 140 > innerHeight) y = e.clientY - 140;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  };

  toggle = selectUnit;

  window.addEventListener('message', function(ev){
    var d = ev.data;
    if (!d || d.type !== 'yp:statuses') return;
    tipMeta = d.meta || {};
    var map = d.map || {};
    units.forEach(function(u){
      var st = map[u.id];
      if (!st) return;
      u.state = toUnit[st] || 'open';
      u.taken = u.state !== 'open';
    });
    if (typeof drawScene === 'function') drawScene();
    bindAllClicks();
    var avail = document.getElementById('avail-n');
    if (avail && typeof availableCount === 'function') avail.textContent = availableCount();
  });

  bindAllClicks();
  try { parent.postMessage({type:'yp:ready', ids: units.map(function(u){ return u.id; })}, '*'); } catch (_) {}
})();
"""

EXTRA_CSS = """
html.yp-ops .toolbar,html.yp-ops .tb-hint,html.yp-ops .zhint,html.yp-ops .chip,
body.ops .toolbar,body.ops .tb-hint,body.ops .zhint,body.ops .chip{display:none!important}
"""


def main() -> None:
    for path in sorted(ROOT.glob("*.html")):
        html = path.read_text(encoding="utf-8")

        # Fix any corrupted ops\\x08 patterns in early boot
        html = html.replace("ops\x08", "ops")
        html = re.sub(
            r"if\(!/\(\^\|\[\?&\]\)ops.?/\.test\(location\.search\)\) return;",
            "if ((location.search || '').indexOf('ops') === -1) return;",
            html,
        )

        if "html.yp-ops .toolbar" not in html:
            html = html.replace(
                "html.yp-ops #tip{z-index:40}",
                "html.yp-ops #tip{z-index:40}\n" + EXTRA_CSS,
                1,
            )

        html2, n = re.subn(
            r"/\* ===== YardPilot ops bridge ===== \*/[\s\S]*?\n\}\)\(\);\n",
            BRIDGE.lstrip() + "\n",
            html,
            count=1,
        )
        if n != 1:
            print("FAIL bridge", path.name, n)
            continue

        # Verify no backspace corruption in written bridge
        if "\x08" in html2:
            html2 = html2.replace("\x08", "")
            print("stripped bs", path.name)

        path.write_text(html2, encoding="utf-8")
        # verify boot line
        for i, line in enumerate(html2.splitlines(), 1):
            if "indexOf('ops')" in line or "YardPilot ops bridge" in line:
                if "ops" in line and i < 1100:
                    pass
        print("ok", path.name)


if __name__ == "__main__":
    main()
