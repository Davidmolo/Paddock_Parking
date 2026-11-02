"""
Turn parkingpaddock public map pages into admin Inventory assets:
- hide all public / booking chrome in ops mode
- replace enquiry tip copy with Inventory edit copy
- reliable ops bridge (no regex word-boundary bugs)
"""
from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(r"D:\azfs\yardpilot\apps\web\public\yard-maps")

OPS_CSS = """
/* ===== Paddock Inventory (ops) — hide public booking chrome ===== */
html.yp-ops body > header,
html.yp-ops body > footer,
html.yp-ops .head-row,
html.yp-ops .geo,
html.yp-ops .side,
html.yp-ops #overlay,
html.yp-ops .toolbar,
html.yp-ops .chip,
html.yp-ops .tb-hint,
html.yp-ops .zhint,
html.yp-ops .zoomctl,
html.yp-ops .gallery,
html.yp-ops section.gallery,
html.yp-ops .benefits,
html.yp-ops .features,
html.yp-ops .who,
html.yp-ops .premium,
html.yp-ops #hdr-reserve,
body.ops > header,
body.ops > footer,
body.ops .head-row,
body.ops .geo,
body.ops .side,
body.ops #overlay,
body.ops .toolbar,
body.ops .chip,
body.ops .tb-hint,
body.ops .zhint,
body.ops .zoomctl,
body.ops .gallery,
body.ops #hdr-reserve {
  display: none !important;
}
html.yp-ops body,
body.ops {
  background: #dde7d0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
html.yp-ops main,
body.ops main {
  padding: 0 !important;
  max-width: none !important;
  min-height: 0 !important;
}
html.yp-ops .shell,
body.ops .shell {
  display: block !important;
  grid-template-columns: 1fr !important;
  gap: 0 !important;
  min-height: 0 !important;
}
html.yp-ops .card.map-card,
html.yp-ops .card.map,
html.yp-ops .shell > .card,
body.ops .card.map-card,
body.ops .card.map,
body.ops .shell > .card {
  border: 0 !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
}
html.yp-ops .map-stage,
html.yp-ops #stage,
html.yp-ops #yard,
body.ops .map-stage,
body.ops #stage,
body.ops #yard {
  display: block !important;
  width: 100% !important;
  height: min(72vh, 680px) !important;
  min-height: 520px !important;
  flex: none !important;
  background: #dde7d0 !important;
}
html.yp-ops #tip,
body.ops #tip {
  z-index: 40;
}
"""

HEAD_BOOT = """
<script>
(function () {
  if ((location.search || "").indexOf("ops") !== -1) {
    document.documentElement.classList.add("yp-ops");
  }
})();
</script>
<style>
""" + OPS_CSS + """
</style>
"""

BRIDGE = """
/* ===== Paddock Inventory ops bridge ===== */
(function () {
  if ((location.search || "").indexOf("ops") === -1) return;
  if (typeof units === "undefined") return;

  document.body.classList.add("ops", "embed");
  document.documentElement.classList.add("yp-ops");
  document.title = "Inventory · Site plan";

  document.querySelectorAll(
    "header, footer, .head-row, .geo, .side, .toolbar, .tb-hint, .zhint, .zoomctl, .gallery, #overlay, #hdr-reserve, .chip"
  ).forEach(function (el) {
    el.style.setProperty("display", "none", "important");
  });

  var toUnit = {
    available: "open",
    occupied: "leased",
    reserved: "pending",
    maintenance: "leased",
  };
  var tipMeta = {};

  function unitColor(u) {
    if (typeof stateCol === "function") return stateCol(u);
    if (typeof TAKEN !== "undefined" && u.taken) return TAKEN;
    if (typeof TYPES !== "undefined" && TYPES[u.type]) return TYPES[u.type];
    return { top: "#94a3b8", wall: "#64748b", color: "#94a3b8" };
  }

  function selectUnit(u) {
    selected.forEach(function (x) {
      if (x._g) x._g.classList.remove("sel");
    });
    selected.clear();
    selected.set(u.id, u);
    if (u._g) u._g.classList.add("sel");
    try {
      parent.postMessage({ type: "yp:select", id: u.id }, "*");
    } catch (_) {}
  }

  function bindAllClicks() {
    units.forEach(function (u) {
      if (!u._g) return;
      u._g.style.cursor = "pointer";
      u._g.onclick = function () {
        if (typeof view !== "undefined" && view.dragged) return;
        selectUnit(u);
      };
    });
  }

  renderPanel = function () {};
  window.openReserve = function () {};
  window.submitRes = function () {};
  window.clearSel = function () {
    selected.forEach(function (x) {
      if (x._g) x._g.classList.remove("sel");
    });
    selected.clear();
  };
  window.setFilter = function () {};

  showTip = function (e, u) {
    var meta = tipMeta[u.id] || {};
    var col = unitColor(u);
    var status =
      meta.statusLabel ||
      (u.state === "leased" || u.taken
        ? "Occupied"
        : u.state === "pending"
          ? "Reserved"
          : "Available");
    tip.innerHTML =
      '<div class="t-name"><span class="d" style="background:' +
      (col.top || col.color) +
      '"></span>' +
      u.id +
      "</div>" +
      '<div class="t-row"><span>Status</span><b>' +
      status +
      "</b></div>" +
      (meta.tenant
        ? '<div class="t-row"><span>Tenant</span><b>' + meta.tenant + "</b></div>"
        : "") +
      (meta.rate != null
        ? '<div class="t-row"><span>Rate</span><b>$' +
          Number(meta.rate).toLocaleString() +
          "/mo</b></div>"
        : "") +
      '<div class="t-cta">' +
      (meta.detail || "Click to edit status, rate, or tenant") +
      "</div>";
    tip.classList.add("show");
    var x = e.clientX + 14,
      y = e.clientY + 14;
    if (x + 220 > innerWidth) x = e.clientX - 220;
    if (y + 140 > innerHeight) y = e.clientY - 140;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  };

  toggle = selectUnit;

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.type !== "yp:statuses") return;
    tipMeta = d.meta || {};
    var map = d.map || {};
    units.forEach(function (u) {
      var st = map[u.id];
      if (!st) return;
      u.state = toUnit[st] || "open";
      u.taken = u.state !== "open";
    });
    if (typeof drawScene === "function") drawScene();
    bindAllClicks();
  });

  bindAllClicks();
  try {
    parent.postMessage(
      { type: "yp:ready", ids: units.map(function (u) { return u.id; }) },
      "*"
    );
  } catch (_) {}
})();
"""

TIP_REPLACEMENTS = [
    ("Click to add to your enquiry", "Click to edit status, rate, or tenant"),
    ("Selected — click to remove", "Selected"),
    ("Currently leased — not available", "Occupied — click to edit"),
    ("Under offer — ask us about a backup slot", "Reserved — click to edit"),
    (
        "Click an available lot to build an enquiry — your selection and monthly total update on the right.",
        "Select a space to view occupancy and edit assignment.",
    ),
    ("Your selection", "Space details"),
]


def main() -> None:
    for path in sorted(ROOT.glob("*.html")):
        html = path.read_text(encoding="utf-8")
        html = html.replace("\x08", "")

        for old, new in TIP_REPLACEMENTS:
            html = html.replace(old, new)

        # Remove prior yp-ops head inject / old ops CSS blocks we added
        html = re.sub(
            r"<script>\s*\(function\(\)\{\s*if\(\(location\.search[\s\S]*?</script>\s*<style>\s*/\* ===== Paddock Inventory[\s\S]*?</style>\s*",
            "",
            html,
            count=1,
        )
        html = re.sub(
            r"<script>\s*\(function\(\)\{\s*if\(\(/\(?:\^\|\[\?&\]\)ops[\s\S]*?</script>\s*<style>[\s\S]*?html\.yp-ops #tip\{z-index:40\}[\s\S]*?</style>\s*",
            "",
            html,
            count=1,
        )
        # simpler: if yp-ops boot exists, strip from that script through next </style>
        if "document.documentElement.classList.add('yp-ops')" in html or 'classList.add("yp-ops")' in html:
            html = re.sub(
                r"<script>\s*\(function\s*\(\)\s*\{[\s\S]*?yp-ops[\s\S]*?</script>\s*<style>[\s\S]*?</style>\s*",
                "",
                html,
                count=1,
            )

        if "</head>" not in html:
            print("no head", path.name)
            continue
        html = html.replace("</head>", HEAD_BOOT + "</head>", 1)

        # Replace any existing ops bridge
        html2, n = re.subn(
            r"/\* ===== (?:YardPilot|Paddock Inventory) ops bridge ===== \*/[\s\S]*?\n\}\)\(\);\n",
            BRIDGE.lstrip() + "\n",
            html,
            count=1,
        )
        if n != 1:
            # try insert before final avail-n line
            if "drawScene(); renderPanel();" in html:
                html2 = html.replace(
                    "drawScene(); renderPanel();",
                    "drawScene(); renderPanel();\n" + BRIDGE,
                    1,
                )
                n = 1
            else:
                print("FAIL bridge", path.name)
                continue

        if "\x08" in html2:
            html2 = html2.replace("\x08", "")

        path.write_text(html2, encoding="utf-8")
        print("ok", path.name, "enquiry_left", "enquiry" in html2.lower())


if __name__ == "__main__":
    main()
