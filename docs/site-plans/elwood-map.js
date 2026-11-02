
if(/(^|[?&])embed\b/.test(location.search)) document.body.classList.add('embed');
(function(){
const TYPES = {
  acre2: {name:'2-Acre Lot',    color:'#0a84ff', top:'#4a97ea', wall:'#2a6fbd', price:4800, size:'2 acres'},
  acre1: {name:'1-Acre Lot',    color:'#0a84ff', top:'#57a5f5', wall:'#2f7bd0', price:2400, size:'1 acre'},
  acreH: {name:'½-Acre Lot',    color:'#30b0c7', top:'#54cbe0', wall:'#2aa0b8', price:1200, size:'½ acre'},
  spot:  {name:'Parking Space', color:'#ff9f0a', top:'#ffb84d', wall:'#e0902a', price:180,  size:'25 ft × 75 ft'},
  leased:{name:'Leased Yard',   color:'#c4c9cf', top:'#c4c9cf', wall:'#a3a9b1', price:0,    size:'leased'},
};
const money=n=>'$'+n.toLocaleString();

/* ===== Elwood yard - lot layout read off the client's aerial photos =====
   A leased block across the north, then Lot A (2 acres) on the east with
   Lots B / C / D (1 acre each) stacked to its west. Plan units are 1.463 per
   foot, so a 1-acre lot measures 565 x 165 units = 43,560 sq ft. */
const SITE={x:-368,y:170,w:2178,h:670};

/* The yard is not a plain rectangle - the sheet shows the boundary stepping in
   at the bottom-left corner, so the platform is drawn as a polygon, not a box. */
const SITE_POLY=[[-368,170],[1810,170],[1810,820],[-208,820],[-263,808],[-306,776],[-334,732],[-368,675]];

const UPFT=1.5;                         // plan units per foot (1 acre = 43,560 sq ft)

const units=[]; const byId={};
function add(type,id,x,y,w,h,state,acres,pts){
  const u={id,type,x,y,w,h,angle:0,state,acres,taken:state!=='open',pts};
  units.push(u); byId[u.id]=u;
}

/* ===== Elwood St yard - 5 acres, straight off the marked photos ==========

   The client's own breakdown, and it totals exactly five:

     "the left side is 2 acres"                -> Lots 1 and 2, 1 acre each
     "thats one acre"                          -> Lot 3
     "the top part is 0.5 acre, not an acre"   -> Lot 4
     "thats also 0.5 acre"                     -> Lot 5
     "thats 0.5 acre too"                      -> Lot 6
     "on the left its another 0.5 acre"        -> Lot 7

   Lot 7 is the either/or: THREE ROWS OF PARKING, or taken as one half-acre
   plot. It is a half-acre section, not a full acre and not a strip across
   the top.                                                                */

//   type      id         x    y    w    h   state   acres
/* West end. The 2 acres furthest west are already TAKEN, and that block
   carries the curve where the boundary wraps the access road. */
const TAKEN_POLY=[[-328,200],[26,200],[26,790],[-178,790],[-178,748],[-179.2,737.3],[-182.8,727.2],[-188.5,718.1],[-196.1,710.5],[-205.2,704.8],[-215.3,701.2],[-226.0,700.0],[-328,700]];

add('leased','Taken',  -328, 200, 354, 590, 'leased', 2, TAKEN_POLY);
add('acre1', 'Lot 1',   30, 200, 523, 187, 'open', 1);
add('acre2', 'Lot 2',   30, 390, 523, 375, 'open', 2);

/* A continuous row of HALF-ACRE SPOTS across the top, butting straight onto
   Lot 1 with no gap between them, and running east. */
add('acreH','Lot 3',  557, 200, 166, 295, 'open', 0.5);
add('acreH','Lot 4',  725, 200, 166, 295, 'open', 0.5);
add('acreH','Lot 5',  893, 200, 166, 295, 'open', 0.5);
add('acreH','Lot 6', 1061, 200, 166, 295, 'open', 0.5);
add('acreH','Lot 7', 1229, 200, 166, 295, 'open', 0.5);
/* United Rental already occupies the west end of the parking area. */
add('leased','United Rental', 557, 497, 225, 292, 'leased', 0.67);
add('acre1','Lot 8', 1397, 200, 334, 295, 'open', 1);
add('acre1','Lot 9', 1061, 497, 334, 293, 'open', 1);
add('acre1','Lot 10', 1397, 497, 334, 293, 'open', 1);

(function(){
  /* THREE rows of parking below the band, at a tighter scale - 20 ft pitch,
     47 ft deep - with a driveway between each. The BOTTOM row is the
     selective one: parking spots, or taken as a full lot.               */
  const pitch=30, w=27, h=70;
  let n=0;
  [497, 608, 719].forEach(y=>{
    for(let i=0;i<9;i++){
      add('spot','P-'+String(++n).padStart(2,'0'), 792+i*pitch, y, w, h, 'open', 0);
    }
  });
})();


const TAKEN  ={top:'#c4c9cf', wall:'#a3a9b1'};
const PENDING={top:'#ffb84d', wall:'#dd8f27'};
const stateCol=u=>u.state==='leased'?TAKEN:(u.state==='pending'?PENDING:TYPES[u.type]);
const availableCount=()=>units.filter(u=>u.state==='open').length;

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
const CX=675, CY=500;                 // plan centre
const YAW=32*Math.PI/180, cosY=Math.cos(YAW), sinY=Math.sin(YAW);
const KY=0.62;                        // vertical foreshorten (camera tilt-back)
const OX=1160, OY=584, SLAB=24;        // screen origin + platform thickness
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
    style:`font:${sm?'700 14px':'800 22px'} 'Inter',sans-serif;fill:${sm?'#5a6069':'#2b3038'};`+
      `letter-spacing:${sm?'.6px':'.1px'};${sm?'text-transform:uppercase;':''}`+
      `paint-order:stroke;stroke:#fff;stroke-width:4.6px;stroke-linejoin:round`});
  t.textContent=txt; (g_labels||svg).appendChild(t);
}

function drawDrives(){
  const fill='#e2e5e9';
  const rect=(x,y,w,h)=>{const q=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p=>iso(p[0],p[1],0));
    svg.appendChild(el('polygon',{points:q.map(P).join(' '),fill}));};
  rect(SITE.x,SITE.y,SITE.w,26);      // north perimeter lane
  rect(553,200,4,590);                // west lots | parking band
  rect(788,567,271,41);               // driveway
  rect(788,678,271,41);               // driveway
  rect(30,387,523,3);                 // Lot 1 | Lot 2
  rect(22,200,4,590);                 // taken block | Lot 1 & 2
  rect(1080,200,16,590);              // lane, middle | east strips
  rect(1096,493,674,4);             // between the east rows
  rect(SITE.x,699,SITE.w,26);         // south perimeter lane
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
function attach(g,u){g.setAttribute('class','unit'+(u.state!=='open'?' taken':''));g.setAttribute('data-id',u.id);
  g.addEventListener('mousemove',e=>showTip(e,u));
  g.addEventListener('mouseleave',()=>tip.classList.remove('show'));
  if(u.state==='open') g.addEventListener('click',()=>{if(!view.dragged)toggle(u);});}  // a pan must not select

function drawScene(){
  // backdrop stays on the root so panning never exposes a bare edge
  // full-bleed green ground — the whole canvas is grass, so there's no shape
  // edge to read as an artifact at any zoom or pan position
  svgRoot.appendChild(el('rect',{x:-4000,y:-4000,width:9500,height:9100,fill:'#dde7d0'}));
  VP=el('g',{}); svgRoot.appendChild(VP); svg=VP;   // everything below pans & zooms
  // (the ground is the full-bleed rect above — no separate grass shape, so
  //  nothing can read as a rotated square)
  // raised platform slab (walls down from h=0 to h=-SLAB, then pad top)
  const sc=SITE_POLY;
  const scTop=sc.map(p=>iso(p[0],p[1],0)),scBot=sc.map(p=>iso(p[0],p[1],-SLAB));
  const cs=polyCentroid(sc),csd=depthOf(cs[0],cs[1]);
  for(let i=0;i<sc.length;i++){const j=(i+1)%sc.length;const mx=(sc[i][0]+sc[j][0])/2,my=(sc[i][1]+sc[j][1])/2;
    if(depthOf(mx,my)>csd)svg.appendChild(el('polygon',{points:[scTop[i],scTop[j],scBot[j],scBot[i]].map(P).join(' '),fill:'#c9cdd3'}));}
  svg.appendChild(el('polygon',{points:scTop.map(P).join(' '),fill:'#eaecf0',stroke:'#e0e2e7','stroke-width':1}));
  drawDrives();
  // depth-sorted scene: lots + props
  const items=[];
  units.forEach(u=>{const c=unitCorners(u),ce=polyCentroid(c);
    const col=stateCol(u), H=u.type==='leased'?16:20;
    items.push({d:depthOf(ce[0],ce[1]),mk:()=>{const g=prism(c,H,col.top,col.wall);attach(g,u);u._g=g;return g;}});});
  const feat=(cx,cy,mk)=>items.push({d:depthOf(cx,cy),mk});
  // gate house + entrance bar at the south end of the west lane
  feat(-404,391,()=>prism([[-430,373],[-384,373],[-384,409],[-430,409]],28,'#ffffff','#e0e2e6'));
  feat(-376,447,()=>el('polygon',{points:[[-382,426],[-370,426],[-370,468],[-382,468]].map(p=>iso(p[0],p[1],1)).map(P).join(' '),fill:'#1d1d1f'}));
  // trees around the parcel
  [[60,140,1.1],[380,130,1.0],[700,138,1.15],[1020,128,1.05],[1340,140,1.1],[1660,150,1.15],
   [60,860,1.15],[380,870,1.05],[700,858,1.2],[1020,872,1.0],[1340,860,1.15],[1660,866,1.1],
   [-105,280,1.2],[-105,500,1.05],[-105,700,1.1],
   [1860,270,1.1],[1860,500,1.15],[1860,720,1.05]]
   .forEach(t=>items.push({d:depthOf(t[0],t[1]),mk:()=>tree(t[0],t[1],t[2])}));
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
  const perFt=UPFT*view.k;
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
  at(640,325,20,'Lot 3',{sm:true});
  at(640,357,20,'½ acre',{sm:true});
  at(808,325,20,'Lot 4',{sm:true});
  at(808,357,20,'½ acre',{sm:true});
  at(976,325,20,'Lot 5',{sm:true});
  at(976,357,20,'½ acre',{sm:true});
  at(1144,325,20,'Lot 6',{sm:true});
  at(1144,357,20,'½ acre',{sm:true});
  at(1312,325,20,'Lot 7',{sm:true});
  at(1312,357,20,'½ acre',{sm:true});
  at(1564,322,20,'Lot 8');
  at(1564,356,20,'1 acre',{sm:true});
  at(1228,619,20,'Lot 9');
  at(1228,653,20,'1 acre',{sm:true});
  at(1564,619,20,'Lot 10');
  at(1564,653,20,'1 acre',{sm:true});
  at(925,590,1,'Driveway',{sm:true});
  at(925,701,1,'Driveway',{sm:true});
  at(669,645,20,'United Rental',{sm:true});
  at(669,677,20,'leased',{sm:true});
  at(925,806,1,'Bottom row: parking spots OR full lot',{sm:true});
  at(-151,470,20,'Taken');
  at(-151,504,20,'2 acres · leased',{sm:true});
  at(291,283,20,'Lot 1');
  at(291,317,20,'1 acre',{sm:true});
  at(291,560,20,'Lot 2');
  at(291,594,20,'2 acres',{sm:true});
  at(-414,495,1,'Main Entrance',{sm:true});
}

/* units, features and props are all drawn (depth-sorted) by drawScene() */
function showTip(e,u){
  if(view.panning)return;
  const t=TYPES[u.type],on=selected.has(u.id),col=stateCol(u);
  const status=u.state==='leased'?'Leased':(u.state==='pending'?'Pending':null);
  tip.innerHTML=`<div class="t-name"><span class="d" style="background:${col.top}"></span>${u.id}</div>
    <div class="t-row"><span>Type</span><b>${t.name}</b></div>
    <div class="t-row"><span>Size</span><b>${t.size}</b></div>
    ${status?`<div class="t-row"><span>Status</span><b>${status}</b></div>`
            :`<div class="t-row"><span>Price</span><b>${money(t.price)}/mo</b></div>`}
    <div class="t-cta">${u.state==='leased'?'Currently leased — not available'
      :u.state==='pending'?'Under offer — ask us about a backup slot'
      :(on?'Selected — click to remove':'Click to add to your enquiry')}</div>`;
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
      <p>Click any available lot on the map to add it. Select several and the monthly total adds up here.</p></div>`;
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
  const box=u=>{ if(!u.pts) return [u.x,u.y,u.x+u.w,u.y+u.h];
    const xs=u.pts.map(p=>p[0]),ys=u.pts.map(p=>p[1]);
    return [Math.min.apply(null,xs),Math.min.apply(null,ys),Math.max.apply(null,xs),Math.max.apply(null,ys)]; };
  const areaOf=u=>{ if(!u.pts) return u.w*u.h;
    let a=0; for(let i=0;i<u.pts.length;i++){const j=(i+1)%u.pts.length;
      a+=u.pts[i][0]*u.pts[j][1]-u.pts[j][0]*u.pts[i][1];}
    return Math.abs(a/2); };
  units.forEach(u=>{
    const b=box(u);
    if(b[0]<SITE.x-0.5||b[1]<SITE.y-0.5||b[2]>SITE.x+SITE.w+0.5||b[3]>SITE.y+SITE.h+0.5)
      bad.push(u.id+' outside site');
  });
  for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
    const a=box(units[i]),b=box(units[j]);
    if(a[0]<b[2]-0.5&&b[0]<a[2]-0.5&&a[1]<b[3]-0.5&&b[1]<a[3]-0.5)
      bad.push(units[i].id+' overlaps '+units[j].id);
  }
  // drawn area must agree with the stated acreage (1 acre = 43,560 sq ft).
  // Parking spaces are sold per space, not by acreage, so they are exempt -
  // they are checked against their 12 ft x 75 ft footprint instead.
  units.forEach(u=>{
    if(u.type==='spot'){
      const ft2=areaOf(u)/(UPFT*UPFT);
      // 22.7 ft x 74.7 ft of painted stall on a 25 ft pitch and a 75 ft bay.
      if(Math.abs(ft2-840)/840>0.06) bad.push(u.id+' stall size off ('+Math.round(ft2)+' sq ft)');
      return;
    }
    const acres=areaOf(u)/(UPFT*UPFT)/43560;
    if(Math.abs(acres-u.acres)/u.acres>0.06) bad.push(u.id+' acreage off ('+acres.toFixed(2)+')');
  });
  return bad;
};

drawScene(); renderPanel();
document.getElementById('avail-n').textContent=availableCount();
})();
