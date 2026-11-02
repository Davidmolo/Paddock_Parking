
if(/(^|[?&])embed\b/.test(location.search)) document.body.classList.add('embed');
(function(){
const TYPES = {
  half:    {name:'½-Acre Storage',  color:'#0a84ff', top:'#57a5f5', wall:'#2f7bd0', price:1200, size:'≈ 0.5 acre'},
  quarter: {name:'¼-Acre Storage',  color:'#30b0c7', top:'#54cbe0', wall:'#2aa0b8', price:650,  size:'≈ 0.25 acre'},
  park50:  {name:"50 ft Pull-Through",color:'#ff9f0a', top:'#ffb84d', wall:'#e0902a', price:180,  size:"50 ft × 20 ft"},
  park20:  {name:"20 ft Parking Bay", color:'#ffd60a', top:'#ffdb52', wall:'#e0b400', price:90,   size:"20 ft × 10 ft"},
};
const money=n=>'$'+n.toLocaleString();

/* ===== geometry traced 1:1 off the engineering site plan (viewBox 1100 × 1060) =====
   The parcel is the near-square inside the boundary: x 30–1070, y 26–1026.
   Every feature is converted from its measured position on the plan into this space. */
const SITE={x:30,y:26,w:1040,h:1000};

/* Main drive centreline, digitised point-by-point off the plan: enters at the
   bottom boundary (Main Entrance, x≈640), runs almost straight with a slight
   NE lean, then curves hard right to exit at the top-right corner (fire gate). */
const ROAD=[[26,1030],[38,999],[65,948],[97,904],[136,865],[195,826],[254,794],
            [313,767],[392,739],[471,719],[550,703],[628,688],[707,676],
            [786,664],[865,656],[945,648],[1026,640]];
function roadCX(y){
  if(y<=ROAD[0][0])return ROAD[0][1];
  for(let i=1;i<ROAD.length;i++){const a=ROAD[i-1],b=ROAD[i];
    if(y<=b[0]){const t=(y-a[0])/(b[0]-a[0]);return a[1]+t*(b[1]-a[1]);}}
  return ROAD[ROAD.length-1][1];
}
const RH=46;                       // graded corridor half-width
const roadW=y=>roadCX(y)-RH;       // west edge of the drive — storage stops here
const roadE=y=>roadCX(y)+RH;       // east edge — 20' parking starts here
const L=61;                        // west fence inset, as drawn on the plan
const SETBACK=1010;                // 50' setback line along the east boundary
const PANG=30;                     // stall lean, matching the plan hatching

/* exact rotated-corner tests — no stall corner may ever touch the drive,
   even where it curves */
function rotCorners(x,y,w,h,ang){
  const cx=x+w/2,cy=y+h/2,r=ang*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  const ux=c*w/2,uy=s*w/2,vx=-s*h/2,vy=c*h/2;
  return [[cx+ux+vx,cy+uy+vy],[cx+ux-vx,cy+uy-vy],[cx-ux+vx,cy-uy+vy],[cx-ux-vx,cy-uy-vy]];
}
const clearW=(x,y,w,h,ang,m)=>rotCorners(x,y,w,h,ang).every(p=>p[0]<=roadW(p[1])-m);
const clearE=(x,y,w,h,ang,m)=>rotCorners(x,y,w,h,ang).every(p=>p[0]>=roadE(p[1])+m);

const units=[]; const byId={}; let uid=0; const gates=[];
function add(type,x,y,w,h,angle,pts){ const u={id:'P-'+String(++uid).padStart(3,'0'),type,x,y,w,h,angle:angle||0,pts}; units.push(u); byId[u.id]=u; }

/* WEST — the four storage bands, top→bottom exactly as labelled on the plan:
   ¼ / ½ / ½ / ¼ acre. Each band is two rows of lots served by a central gate
   aisle (the plan's tick marks are the lot gates on that aisle). The last lot
   of every row is a trapezoid whose east edge follows the drive. */
/* Band extents + lot counts measured off the plan by pixel scanline:
   parcel spans plan y 322–588 → map y 26–1026 (3.759 map units per plan px).
   ½-acre bands are ~1.43× taller AND ~1.4× wider per lot than ¼-acre,
   which makes each ½ lot exactly ~2× the area of a ¼ lot, as drawn. */
const BANDS=[
  {type:'quarter', y0:56,  y1:206, n:9},   // plan y 330–370, 9 lots
  {type:'half',    y0:233, y1:447, n:6},   // plan y 377–434, 6 lots
  {type:'half',    y0:473, y1:691, n:6},   // plan y 441–499, 6 lots
  {type:'quarter', y0:718, y1:868, n:7},   // plan y 506–546, 7 lots
];
const AISLE=24, GAP=3, M=10;
BANDS.forEach(b=>{
  b.aisle=(b.y0+b.y1)/2;
  const rd=(b.y1-b.y0-AISLE)/2;
  [[b.y0,b.y0+rd,'front'],[b.y1-rd,b.y1,'back']].forEach(r=>{
    const t=r[0], bt=r[1], row=r[2];
    const rT=roadW(t)-M, rB=roadW(bt)-M, rMin=Math.min(rT,rB);
    const w=(rMin-L-(b.n-1)*GAP)/b.n;
    for(let i=0;i<b.n-1;i++){
      const x=L+i*(w+GAP);
      add(b.type,x,t,w,bt-t,0);
      gates.push([x+w/2,row==='front'?bt:t]);
    }
    const x=L+(b.n-1)*(w+GAP);            // end lot runs to the road edge
    add(b.type,x,t,rMin-x,bt-t,0,[[x,t],[rT,t],[rB,bt],[x,bt]]);
    gates.push([(x+rMin)/2,row==='front'?bt:t]);
  });
});

/* SOUTH-WEST — 50' pull-through truck parking, laid out like a real lot:
   two rows of angled stalls mirrored around a central drive aisle (classic
   herringbone). Stall ≈ 12'×50' at ~0.8 u/ft, angled 60° off the aisle with
   a clear gap between spaces. Corners are tested against the drive. */
(function(){
  const w=17, len=42, pitch=24;              // pitch>span → clean gap, no overlap
  [[905,-30],[975,30]].forEach(([yc,ang])=>{   // plan hatching spans map y 883–1014
    const yTop=yc-len/2;
    for(let x=48; x<640; x+=pitch){
      if(!clearW(x,yTop,w,len,ang,7)) break;
      add('park50', x, yTop, w, len, ang);
    }
  });
})();

/* EAST — angled 20' stalls in clean rows between the drive and the 50'
   setback. Each row walks east until every corner clears the drive, so the
   rows hug the curve; the row beside the restroom starts east of it. Pitch
   leaves a clear gap between stalls so each reads as a separate space. */
/* h=24 (was 34): a 20' bay was being drawn nearly as long as a 50' pull-through
   (34 vs 42), so the 50' strip read as the smaller product. At 24 vs 42 the
   50' spaces are visibly ~1.8x longer, which is what they actually are. */
(function(){ const w=11,h=24,pitch=17.5;
  // plan shows the 20' hatching starting BELOW the restroom / road fork
  // (map y ≈ 510) — nothing north of it, so the rows start there
  for(let y=510;y<=946;y+=60){
    let x=roadE(y+h/2)-2;
    while(!clearE(x,y,w,h,PANG,7)&&x<SETBACK)x+=2;
    while(x+17<=SETBACK-6){ add('park20',x,y,w,h,PANG); x+=pitch; }
  } })();

/* ===== occupancy — greyed-out spaces that are already leased =====
   The whole 50' pull-through row is taken, plus a handful of storage lots so
   the map shows at a glance what "occupied" looks like. */
const TAKEN_LOTS=new Set([4,11,19,26,34,41,49,55]);   // 1-based, among storage lots only
(function(){ let n=0;
  units.forEach(u=>{
    if(u.type==='park50'){ u.taken=true; return; }
    if(u.type==='half'||u.type==='quarter'){ n++; if(TAKEN_LOTS.has(n)) u.taken=true; }
  });
})();
const TAKEN={top:'#c4c9cf', wall:'#a3a9b1'};
const availableCount=()=>units.filter(u=>!u.taken).length;

/* ===== render ===== */
const NS='http://www.w3.org/2000/svg';
const svgRoot=document.getElementById('yard');
let svg=svgRoot;          // scene draws here; swapped to the pan/zoom layer in drawScene
let VP=null;              // the pannable / zoomable group
const view={k:1,tx:0,ty:0,panning:false,dragged:false};
const el=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
const tip=document.getElementById('tip');
const selected=new Map();

/* ================= isometric 3D projection ================= */
const CX=550, CY=526;                 // plan centre
const YAW=32*Math.PI/180, cosY=Math.cos(YAW), sinY=Math.sin(YAW);
const KY=0.62;                        // vertical foreshorten (camera tilt-back)
const OX=730, OY=548, SLAB=24;        // screen origin + platform thickness
let g_labels, g_scale=null;
function iso(px,py,h){h=h||0;const dx=px-CX,dy=py-CY;
  return [OX+(dx*cosY-dy*sinY), OY+(dx*sinY+dy*cosY)*KY-h];}
const depthOf=(px,py)=>(px-CX)*sinY+(py-CY)*cosY;   // painter's depth (larger = nearer)
const P=pt=>pt[0].toFixed(1)+' '+pt[1].toFixed(1);
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(Math.min(255,r*f));g=Math.round(Math.min(255,g*f));b=Math.round(Math.min(255,b*f));
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
function polyCentroid(p){let x=0,y=0;p.forEach(q=>{x+=q[0];y+=q[1]});return [x/p.length,y/p.length];}
function unitCorners(u){
  if(u.pts) return u.pts;
  const cx=u.x+u.w/2,cy=u.y+u.h/2,r=u.angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  const ux=c*u.w/2,uy=s*u.w/2,vx=-s*u.h/2,vy=c*u.h/2;
  return [[cx+ux+vx,cy+uy+vy],[cx+ux-vx,cy+uy-vy],[cx-ux-vx,cy-uy-vy],[cx-ux+vx,cy-uy+vy]];}
function rectCorners(cx,cy,w,d,ang){const r=(ang||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  const ux=c*w/2,uy=s*w/2,vx=-s*d/2,vy=c*d/2;
  return [[cx+ux+vx,cy+uy+vy],[cx+ux-vx,cy+uy-vy],[cx-ux-vx,cy-uy-vy],[cx-ux+vx,cy-uy+vy]];}

/* extruded prism: soft shadow + front-facing walls + top face */
function prism(corners,H,topCol,wallCol){
  const g=el('g',{}); const cen=polyCentroid(corners), cd=depthOf(cen[0],cen[1]);
  const gr=corners.map(p=>iso(p[0],p[1],0)), tp=corners.map(p=>iso(p[0],p[1],H));
  if(H>=10){const sh=corners.map(p=>{const q=iso(p[0],p[1],0);return [q[0]+6,q[1]+9];});
    g.appendChild(el('polygon',{points:sh.map(P).join(' '),fill:'rgba(22,32,44,.10)'}));}
  for(let i=0;i<corners.length;i++){const j=(i+1)%corners.length;
    const mx=(corners[i][0]+corners[j][0])/2,my=(corners[i][1]+corners[j][1])/2;
    if(depthOf(mx,my)>cd+0.3)
      g.appendChild(el('path',{d:`M ${P(gr[i])} L ${P(gr[j])} L ${P(tp[j])} L ${P(tp[i])} Z`,
        fill:wallCol,stroke:wallCol,'stroke-width':.5,'stroke-linejoin':'round'}));}
  g.appendChild(el('polygon',{class:'top',points:tp.map(P).join(' '),
    fill:topCol,stroke:shade(topCol,.86),'stroke-width':.8,'stroke-linejoin':'round'}));
  return g;}

/* upright screen-space label at an already-projected point */
function lbl(x,y,txt,o){ o=o||{}; const sm=o.sm, anchor=o.anchor||'middle';
  const t=el('text',{x,y,'text-anchor':anchor,'dominant-baseline':'central',
    class:'lbl'+(sm?' sm':''),
    style:`font:${sm?'650 11px':'750 14.5px'} 'Inter',sans-serif;fill:${sm?'#5a6069':'#2b3038'};`+
      `letter-spacing:${sm?'.6px':'.1px'};${sm?'text-transform:uppercase;':''}`+
      `paint-order:stroke;stroke:#fff;stroke-width:3.6px;stroke-linejoin:round`});
  t.textContent=txt; (g_labels||svg).appendChild(t);
}

function drawRoad(){
  const ys=[]; for(let y=24;y<=1032;y+=6) ys.push(y);
  const clW=y=>Math.max(SITE.x+1,roadW(y)), clE=y=>Math.min(SITE.x+SITE.w-1,roadE(y));
  const west=ys.map(y=>iso(clW(y),y,0));
  const east=ys.map(y=>iso(clE(y),y,0)).reverse();
  svg.appendChild(el('polygon',{points:west.concat(east).map(P).join(' '),
    fill:'#ffffff',stroke:'#e2e4e8','stroke-width':1.3,'stroke-linejoin':'round'}));
  let d=''; ys.forEach((y,i)=>{const p=iso(roadCX(y),y,0);d+=(i?' L ':'M ')+P(p);});
  svg.appendChild(el('path',{d,fill:'none',stroke:'#dcdee3','stroke-width':1.4,'stroke-dasharray':'7 12'}));
}
function drawAisles(){
  const fill='#e9ebef';
  BANDS.forEach(b=>{const q=[[L-6,b.aisle-AISLE/2],[roadW(b.aisle)-M,b.aisle-AISLE/2],
      [roadW(b.aisle)-M,b.aisle+AISLE/2],[L-6,b.aisle+AISLE/2]].map(p=>iso(p[0],p[1],0));
    svg.appendChild(el('polygon',{points:q.map(P).join(' '),fill}));});
  const q=[[44,928],[roadW(940)-8,928],[roadW(940)-8,952],[44,952]].map(p=>iso(p[0],p[1],0));
  svg.appendChild(el('polygon',{points:q.map(P).join(' '),fill}));
}
function tree(px,py,s){s=s||1;const g=el('g',{});const b=iso(px,py,-SLAB);
  g.appendChild(el('ellipse',{cx:b[0]+5,cy:b[1]+4,rx:15*s,ry:5.5*s,fill:'rgba(20,32,20,.13)'}));
  g.appendChild(el('rect',{x:b[0]-2.6*s,y:b[1]-24*s,width:5.2*s,height:25*s,rx:2,fill:'#8a6a45'}));
  const fol=(cy,r,c)=>g.appendChild(el('circle',{cx:b[0],cy:b[1]-cy*s,r:r*s,fill:c}));
  fol(26,19,'#57a052');fol(38,15.5,'#69ba61');fol(49,11,'#7fca74');return g;}
function vehicle(cx,cy,ang,w,d,col){const g=el('g',{});const H=9;
  const c=rectCorners(cx,cy,w,d,ang);
  const gr=c.map(p=>iso(p[0],p[1],0)),tp=c.map(p=>iso(p[0],p[1],H));
  g.appendChild(el('polygon',{points:c.map(p=>{const q=iso(p[0],p[1],0);return [q[0]+4,q[1]+5];}).map(P).join(' '),fill:'rgba(20,30,40,.12)'}));
  const cen=polyCentroid(c),cd=depthOf(cen[0],cen[1]);
  for(let i=0;i<4;i++){const j=(i+1)%4;const mx=(c[i][0]+c[j][0])/2,my=(c[i][1]+c[j][1])/2;
    if(depthOf(mx,my)>cd)g.appendChild(el('path',{d:`M ${P(gr[i])} L ${P(gr[j])} L ${P(tp[j])} L ${P(tp[i])} Z`,fill:shade(col,.78)}));}
  g.appendChild(el('polygon',{points:tp.map(P).join(' '),fill:col,stroke:shade(col,.85),'stroke-width':.5}));return g;}
function attach(g,u){g.setAttribute('class','unit'+(u.taken?' taken':''));g.setAttribute('data-id',u.id);
  g.addEventListener('mousemove',e=>showTip(e,u));
  g.addEventListener('mouseleave',()=>tip.classList.remove('show'));
  if(!u.taken) g.addEventListener('click',()=>{if(!view.dragged)toggle(u);});}  // a pan must not select

function drawScene(){
  // backdrop stays on the root so panning never exposes a bare edge
  // full-bleed green ground — the whole canvas is grass, so there's no shape
  // edge to read as an artifact at any zoom or pan position
  svgRoot.appendChild(el('rect',{x:-4000,y:-4000,width:9500,height:9100,fill:'#dde7d0'}));
  VP=el('g',{}); svgRoot.appendChild(VP); svg=VP;   // everything below pans & zooms
  // (the ground is the full-bleed rect above — no separate grass shape, so
  //  nothing can read as a rotated square)
  // raised platform slab (walls down from h=0 to h=-SLAB, then pad top)
  const sc=[[SITE.x,SITE.y],[SITE.x+SITE.w,SITE.y],[SITE.x+SITE.w,SITE.y+SITE.h],[SITE.x,SITE.y+SITE.h]];
  const scTop=sc.map(p=>iso(p[0],p[1],0)),scBot=sc.map(p=>iso(p[0],p[1],-SLAB));
  const cs=polyCentroid(sc),csd=depthOf(cs[0],cs[1]);
  for(let i=0;i<4;i++){const j=(i+1)%4;const mx=(sc[i][0]+sc[j][0])/2,my=(sc[i][1]+sc[j][1])/2;
    if(depthOf(mx,my)>csd)svg.appendChild(el('polygon',{points:[scTop[i],scTop[j],scBot[j],scBot[i]].map(P).join(' '),fill:'#c9cdd3'}));}
  svg.appendChild(el('polygon',{points:scTop.map(P).join(' '),fill:'#eaecf0',stroke:'#e0e2e7','stroke-width':1}));
  drawRoad(); drawAisles();
  // depth-sorted scene: units + features + props
  const items=[];
  units.forEach(u=>{const c=unitCorners(u),ce=polyCentroid(c),t=TYPES[u.type];
    const H=(u.type==='half'||u.type==='quarter')?18:0;   // storage extruded, parking flat
    const col=u.taken?TAKEN:t;
    items.push({d:depthOf(ce[0],ce[1]),mk:()=>{const g=prism(c,H,col.top,col.wall);attach(g,u);u._g=g;return g;}});});
  const feat=(cx,cy,mk)=>items.push({d:depthOf(cx,cy),mk});
  // buildings
  feat(815,427,()=>prism([[792,414],[838,414],[838,440],[792,440]],34,'#ffffff','#e0e2e6'));
  feat(1036,442,()=>prism([[1016,436],[1056,436],[1056,449],[1016,449]],13,'#ffffff','#e2e4e8'));
  feat(1025,461,()=>prism([[1016,456],[1034,456],[1034,467],[1016,467]],11,'#ffffff','#e2e4e8'));
  const mc=roadCX(1016);
  feat(mc-RH-26,1015,()=>prism(rectCorners(mc-RH-26,1015,52,12,0),26,'#ffffff','#d9dbe0'));
  feat(mc+RH+26,1015,()=>prism(rectCorners(mc+RH+26,1015,52,12,0),26,'#ffffff','#d9dbe0'));
  // fire-access gate bars (flat, red) + top gate at the road exit
  feat(492,1025,()=>el('polygon',{points:[[464,1020],[520,1020],[520,1030],[464,1030]].map(p=>iso(p[0],p[1],1)).map(P).join(' '),fill:'#ff453a'}));
  const gx=roadCX(38),gc=rectCorners(gx,40,104,9,64.6);
  feat(gx,40,()=>el('polygon',{points:gc.map(p=>iso(p[0],p[1],1)).map(P).join(' '),fill:'#ff453a'}));
  // power poles on the west verge
  [150,240,330,420,510,600,690,780,870,960].forEach(y=>{const px=roadW(y)-6;
    feat(px,y,()=>{const g=el('g',{});const b=iso(px,y,0),t2=iso(px,y,26);
      g.appendChild(el('line',{x1:b[0],y1:b[1],x2:t2[0],y2:t2[1],stroke:'#a7adb4','stroke-width':1.3}));
      g.appendChild(el('circle',{cx:t2[0],cy:t2[1],r:2,fill:'#868c93'}));return g;});});
  // trees on the grass, ringing the parcel
  [[-45,120,1.1],[-58,360,1.25],[-48,600,1.0],[-62,840,1.2],[-32,1010,1.0],
   [150,1130,1.15],[430,1150,1.0],[730,1160,1.2],[1010,1140,1.05],
   [1150,880,1.15],[1160,520,1.0],[1140,240,1.2],[985,-80,1.1],[600,-95,1.0],[250,-85,1.15]]
   .forEach(s=>items.push({d:depthOf(s[0],s[1]),mk:()=>tree(s[0],s[1],s[2])}));
  // (parked-vehicle props removed — they cluttered the parking bays and aren't
  //  on the plan; the vehicle() helper above is kept if we ever want them back)
  items.sort((a,b)=>a.d-b.d);
  items.forEach(it=>svg.appendChild(it.mk()));
  // labels ride along with the scene; the HUD stays fixed on the root
  g_labels=el('g',{}); svg.appendChild(g_labels);
  drawLabels();
  svg=svgRoot;
  drawUI(); initPanZoom();
}

/* ---- pan & zoom: wheel to zoom at the cursor, drag to pan, pinch on touch ---- */
function initPanZoom(){
  const MIN=1,MAX=7,stage=document.getElementById('stage'),hint=document.getElementById('zhint');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const apply=()=>{VP.setAttribute('transform',
    `translate(${view.tx.toFixed(2)} ${view.ty.toFixed(2)}) scale(${view.k.toFixed(4)})`);
    updateScale();};
  const toUser=(cx,cy)=>{const p=svgRoot.createSVGPoint();p.x=cx;p.y=cy;
    return p.matrixTransform(svgRoot.getScreenCTM().inverse());};
  // never let the drawing be dragged fully out of sight
  const W=1460,H=1060,M=320;
  function clampPan(){
    view.tx=clamp(view.tx,-(W*view.k-M),M);
    view.ty=clamp(view.ty,-(H*view.k-M),M);
  }
  function zoomAt(k2,px,py){
    k2=clamp(k2,MIN,MAX); if(k2===view.k)return;
    view.tx=px-(k2/view.k)*(px-view.tx);
    view.ty=py-(k2/view.k)*(py-view.ty);
    view.k=k2; clampPan(); apply(); fade();
  }
  let hid=false;
  const fade=()=>{if(!hid){hid=true;hint.style.opacity='0';}};
  if(matchMedia('(hover:none)').matches) hint.textContent='Pinch to zoom · drag to pan';

  svgRoot.addEventListener('wheel',e=>{
    e.preventDefault();
    const p=toUser(e.clientX,e.clientY);
    zoomAt(view.k*Math.exp(-e.deltaY*0.0016),p.x,p.y);
  },{passive:false});

  let last=null,moved=0;
  svgRoot.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    e.preventDefault();
    view.panning=true;view.dragged=false;moved=0;
    last={x:e.clientX,y:e.clientY};
    stage.classList.add('dragging');
    tip.classList.remove('show');
  });
  window.addEventListener('mousemove',e=>{
    if(!view.panning)return;
    const m=svgRoot.getScreenCTM();
    const dx=e.clientX-last.x,dy=e.clientY-last.y;
    moved+=Math.abs(dx)+Math.abs(dy);
    if(moved>4){view.dragged=true;fade();}
    view.tx+=dx/m.a; view.ty+=dy/m.d;
    last={x:e.clientX,y:e.clientY};
    clampPan(); apply();
  });
  window.addEventListener('mouseup',()=>{
    if(!view.panning)return;
    view.panning=false; stage.classList.remove('dragging');
    setTimeout(()=>{view.dragged=false;},0);   // let the click handler read it first
  });

  // touch: one finger pans, two fingers pinch-zoom
  const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  let pinch=null;
  svgRoot.addEventListener('touchstart',e=>{
    if(e.touches.length===1){view.panning=true;last={x:e.touches[0].clientX,y:e.touches[0].clientY};}
    else if(e.touches.length===2){view.panning=false;pinch={d:dist(e.touches[0],e.touches[1]),k:view.k};}
  },{passive:false});
  svgRoot.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&view.panning){
      const m=svgRoot.getScreenCTM();
      view.tx+=(e.touches[0].clientX-last.x)/m.a;
      view.ty+=(e.touches[0].clientY-last.y)/m.d;
      last={x:e.touches[0].clientX,y:e.touches[0].clientY};
      clampPan(); apply(); fade();
    }else if(e.touches.length===2&&pinch){
      const mx=(e.touches[0].clientX+e.touches[1].clientX)/2,
            my=(e.touches[0].clientY+e.touches[1].clientY)/2;
      const p=toUser(mx,my);
      zoomAt(pinch.k*dist(e.touches[0],e.touches[1])/pinch.d,p.x,p.y);
    }
  },{passive:false});
  svgRoot.addEventListener('touchend',e=>{if(!e.touches.length){view.panning=false;pinch=null;}});

  svgRoot.addEventListener('dblclick',()=>resetView());
  window.zoomBy=f=>zoomAt(view.k*f,W/2,H/2);
  window.resetView=()=>{view.k=1;view.tx=0;view.ty=0;apply();};
  apply();
}
function drawUI(){
  const cp=el('g',{transform:'translate(1394 74)'});
  cp.appendChild(el('circle',{cx:0,cy:0,r:16,fill:'#fff','fill-opacity':.92,stroke:'#d5d8dd','stroke-width':1}));
  cp.appendChild(el('path',{d:'M 0 -10 L 5 6 L 0 3 L -5 6 Z',fill:'#48484a'}));
  const ct=el('text',{x:0,y:25,'text-anchor':'middle',style:"font:700 11px 'Inter',sans-serif;fill:#86868b"});
  ct.textContent='N';cp.appendChild(ct);svg.appendChild(cp);
  const sb=el('g',{transform:'translate(58 1018)'});
  const bar=el('line',{x1:0,y1:0,x2:150,y2:0,stroke:'#aeb2b8','stroke-width':1.4});
  const cap=el('line',{x1:150,y1:-4,x2:150,y2:4,stroke:'#aeb2b8','stroke-width':1.4});
  sb.appendChild(bar);
  sb.appendChild(el('line',{x1:0,y1:-4,x2:0,y2:4,stroke:'#aeb2b8','stroke-width':1.4}));
  sb.appendChild(cap);
  const st=el('text',{x:158,y:0,'dominant-baseline':'central',style:"font:600 11px 'Inter',sans-serif;fill:#86868b"});
  st.textContent='200 ft';sb.appendChild(st);svg.appendChild(sb);
  g_scale={bar,cap,text:st};
}

/* the scale bar is fixed HUD, so it must be re-measured whenever we zoom,
   otherwise it lies. 150 units = 200 ft at 1×, i.e. 0.75 units per foot. */
function updateScale(){
  if(!g_scale)return;
  const perFt=0.75*view.k;
  const nice=[10,20,25,50,75,100,150,200,300,500,750,1000,1500];
  let D=nice[0];
  nice.forEach(n=>{if(n*perFt<=190)D=n;});
  const L=+(D*perFt).toFixed(1);
  g_scale.bar.setAttribute('x2',L);
  g_scale.cap.setAttribute('x1',L); g_scale.cap.setAttribute('x2',L);
  g_scale.text.setAttribute('x',L+8);
  g_scale.text.textContent=D+' ft';
}

function drawLabels(){
  const at=(px,py,h,txt,o)=>{const s=iso(px,py,h);lbl(s[0],s[1],txt,o);};
  at(430,131,18,'¼ Acre Storage');
  at(400,340,18,'½ Acre Storage');
  at(368,582,18,'½ Acre Storage');
  at(340,793,18,'¼ Acre Storage');
  at(300,940,2,"50 ft Parking");
  at(880,760,2,"20 ft Parking");
  at(815,392,34,'Restroom',{sm:true});
  at(645,1046,0,'Main Entrance',{sm:true});
  at(486,1044,1,'Fire Access',{sm:true});
  at(roadCX(38),18,1,'Fire Access',{sm:true});
}

/* units, features and props are all drawn (depth-sorted) by drawScene() */
function showTip(e,u){
  if(view.panning)return;
  const t=TYPES[u.type],on=selected.has(u.id);
  tip.innerHTML=`<div class="t-name"><span class="d" style="background:${u.taken?TAKEN.top:t.color}"></span>${t.name}</div>
    <div class="t-row"><span>Space</span><b>${u.id}</b></div>
    <div class="t-row"><span>Size</span><b>${t.size}</b></div>
    ${u.taken?'<div class="t-row"><span>Status</span><b>Occupied</b></div>'
             :`<div class="t-row"><span>Price</span><b>${money(t.price)}/mo</b></div>`}
    <div class="t-cta">${u.taken?'Currently leased — not available'
      :(on?'Selected — click to remove':'Click to add to reservation')}</div>`;
  tip.classList.add('show');
  let x=e.clientX+14,y=e.clientY+14;
  if(x+200>innerWidth)x=e.clientX-200; if(y+128>innerHeight)y=e.clientY-128;
  tip.style.left=x+'px';tip.style.top=y+'px';
}
function toggle(u){
  if(selected.has(u.id)){selected.delete(u.id);u._g.classList.remove('sel');}
  else{selected.set(u.id,u);u._g.classList.add('sel');}
  renderPanel();
}
function removeSel(id){const u=byId[id];if(u){selected.delete(id);u._g.classList.remove('sel');renderPanel();}}
function clearSel(){selected.forEach(u=>u._g.classList.remove('sel'));selected.clear();renderPanel();}

function renderPanel(){
  const panel=document.getElementById('panel'), arr=[...selected.values()], badge=document.getElementById('sel-n');
  badge.style.display=arr.length?'inline-block':'none'; badge.textContent=arr.length;
  document.getElementById('hdr-reserve').disabled=arr.length===0;
  if(!arr.length){
    panel.innerHTML=`<div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="#86868b" stroke-width="1.6"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
      <b>No spaces selected</b>
      <p>Click any lot or bay on the map to add it. Select several and the monthly total adds up here.</p></div>`;
    return;
  }
  const total=arr.reduce((s,u)=>s+TYPES[u.type].price,0);
  const rows=arr.map(u=>{const t=TYPES[u.type];return `<div class="sel-item">
      <span class="d" style="background:${t.color}"></span>
      <div class="info"><div class="id">${u.id}</div><div class="ty">${t.name}</div></div>
      <div class="pr">${money(t.price)}</div>
      <span class="rm" title="Remove" onclick="removeSel('${u.id}')">×</span></div>`;}).join('');
  panel.innerHTML=`<div class="sel-list">${rows}</div>
    <div class="totals">
      <div class="row"><span class="lab">Monthly total · ${arr.length} space${arr.length>1?'s':''}</span>
        <span class="amt">${money(total)}<small>/mo</small></span></div>
      <button class="btn btn-gold" onclick="openReserve()">Reserve ${arr.length} space${arr.length>1?'s':''}</button>
      <div class="actions"><button class="btn-quiet" onclick="clearSel()">Clear all</button></div>
    </div>`;
}
function setFilter(key){
  document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.key===key));
  units.forEach(u=>u._g.classList.toggle('dim',!(key==='all'||u.type===key)));
}

const overlay=document.getElementById('overlay'),modal=document.getElementById('modal');
function openReserve(){
  const arr=[...selected.values()]; if(!arr.length)return;
  const total=arr.reduce((s,u)=>s+TYPES[u.type].price,0);
  const lines=arr.map(u=>`<div class="l"><span>${u.id} · ${TYPES[u.type].name}</span><b>${money(TYPES[u.type].price)}/mo</b></div>`).join('');
  modal.innerHTML=`<span class="x" onclick="closeModal()">×</span>
    <h3>Reserve ${arr.length} space${arr.length>1?'s':''}</h3>
    <div class="msub">Confirm your details and our team will hold these spaces.</div>
    <div class="m-summary">${lines}<div class="tot"><span>Monthly total</span><span>${money(total)}/mo</span></div></div>
    <div class="field"><label>Full name</label><input placeholder="Jane Contractor"></div>
    <div class="field"><label>Email</label><input placeholder="you@company.com"></div>
    <div class="field"><label>Phone</label><input placeholder="(602) 555-0123"></div>
    <button class="btn btn-gold" onclick="submitRes()">Request reservation</button>`;
  overlay.classList.add('show');
}
function submitRes(){
  const arr=[...selected.values()], total=arr.reduce((s,u)=>s+TYPES[u.type].price,0);
  modal.innerHTML=`<div class="success">
    <div class="ck"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
    <h3>Reservation requested</h3>
    <p class="msub" style="margin:8px 0 18px">We've held ${arr.length} space${arr.length>1?'s':''} (${money(total)}/mo). Our team confirms within one business day.</p>
    <button class="btn btn-gold" onclick="closeModal()">Done</button></div>`;
}
function closeModal(){overlay.classList.remove('show');}
overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

window.setFilter=setFilter; window.removeSel=removeSel; window.clearSel=clearSel;
window.openReserve=openReserve; window.closeModal=closeModal; window.submitRes=submitRes;

/* geometry self-audit: returns every unit that violates the plan's clearances
   (drive corridor, setback, fences, restroom). Must return [] — used in testing. */
window.__audit=function(){
  const bad=[];
  units.forEach(u=>{
    const cs=rotCorners(u.x,u.y,u.w,u.h,u.angle);
    if(u.type==='park20'){
      cs.forEach(p=>{
        if(p[0]<roadE(p[1])+3)bad.push(u.id+' touches drive');
        if(p[0]>SETBACK-3)bad.push(u.id+' crosses setback');
      });
      if(u.x<852&&u.y<446&&u.y+u.h>408)bad.push(u.id+' hits restroom');
    }else if(u.type==='park50'){
      cs.forEach(p=>{
        if(p[0]>roadW(p[1])-3)bad.push(u.id+' touches drive');
        if(p[0]<SITE.x+3)bad.push(u.id+' west fence');
        if(p[1]>SITE.y+SITE.h-3)bad.push(u.id+' south fence');
      });
    }else{
      (u.pts||cs).forEach(p=>{ if(p[0]>roadW(p[1])-3)bad.push(u.id+' touches drive'); });
      if(u.x<L-0.5)bad.push(u.id+' west fence');
    }
    cs.forEach(p=>{
      if(p[0]<SITE.x-0.5||p[0]>SITE.x+SITE.w+0.5||p[1]<SITE.y-0.5||p[1]>SITE.y+SITE.h+0.5)
        bad.push(u.id+' outside site');
    });
  });
  return bad;
};

drawScene(); renderPanel();
document.getElementById('avail-n').textContent=availableCount();
})();
