
if(/(^|[?&])embed\b/.test(location.search)) document.body.classList.add('embed');
(function(){
const TYPES = {
  acre1:  {name:'Open Lot',      color:'#0a84ff', top:'#57a5f5', wall:'#2f7bd0', price:2400, size:'1.55 acres'},
  truck:  {name:'Truck Spot',    color:'#ff9f0a', top:'#ffb84d', wall:'#e0902a', price:180,  size:'12 ft × 75 ft'},
  bobtail:{name:'Bobtail Spot',  color:'#30b0c7', top:'#54cbe0', wall:'#2aa0b8', price:150,  size:'bobtail'},
  car:    {name:'A-Series Spot', color:'#8e8e93', top:'#aeaeb2', wall:'#7c7c80', price:90,   size:'11 ft × 26 ft'},
  office: {name:'Mobile Office',  color:'#5e5ce6', top:'#8b89f0', wall:'#4a48c7', price:0, size:'mobile office'},
  general:{name:'General Space',  color:'#2f9e5f', top:'#57bd80', wall:'#25804c', price:0, size:'general space'},
  leased: {name:'Leased',        color:'#c4c9cf', top:'#c4c9cf', wall:'#a3a9b1', price:0,    size:'leased'},
};
const money=n=>'$'+n.toLocaleString();

/* ===== 6060 W Washington St - built from the CAD striping plan =====
   A leased block across the north, then Lot A (2 acres) on the east with
   Lots B / C / D (1 acre each) stacked to its west. Plan units are 1.463 per
   foot, so a 1-acre lot measures 565 x 165 units = 43,560 sq ft. */
const SITE={x:-30,y:10,w:590,h:1006};
const SITE_POLY=[[-30,10],[560,10],[560,1016],[-30,1016]];
const UPFT=1.3;                        // plan units per foot

const units=[]; const byId={};
function add(type,id,x,y,w,h,state,acres,pts){
  const u={id,type,x,y,w,h,angle:0,state,acres,taken:state!=='open',pts};
  units.push(u); byId[u.id]=u;
}

/* ===== 6060 W Washington St - from the CAD striping plan =================

     Lot A     the open ground above, 1.55 acres (67,794 sq ft measured)
     1-57      three rows of truck spots, 12 ft x 75 ft
                 row 1  57 down to 37   (21)
                 row 2  19 up to 36     (18)
                 row 3  18 down to 1    (18)
     A1-A23    11 ft x 26 ft - twenty along the bottom either side of the
                 entrance, A21-A23 on the right
     B1-B9     bobtail parking, nose-in to the east fence, top right                              */

add('acre1','Lot A', 40, 60, 468, 244, 'open', 1.55);
add('truck','57',   40,  356,  14,  98, 'open', 0);
add('truck','56',   56,  356,  14,  98, 'open', 0);
add('truck','55',   72,  356,  14,  98, 'open', 0);
add('truck','54',   88,  356,  14,  98, 'open', 0);
add('truck','53',  104,  356,  14,  98, 'open', 0);
add('truck','52',  120,  356,  14,  98, 'open', 0);
add('truck','51',  136,  356,  14,  98, 'open', 0);
add('truck','50',  152,  356,  14,  98, 'open', 0);
add('truck','49',  168,  356,  14,  98, 'open', 0);
add('truck','48',  184,  356,  14,  98, 'open', 0);
add('truck','47',  200,  356,  14,  98, 'open', 0);
add('truck','46',  216,  356,  14,  98, 'open', 0);
add('truck','45',  232,  356,  14,  98, 'open', 0);
add('truck','44',  248,  356,  14,  98, 'open', 0);
add('truck','43',  264,  356,  14,  98, 'open', 0);
add('truck','42',  280,  356,  14,  98, 'open', 0);
add('truck','41',  296,  356,  14,  98, 'open', 0);
add('truck','40',  312,  356,  14,  98, 'open', 0);
add('truck','39',  328,  356,  14,  98, 'open', 0);
add('truck','38',  344,  356,  14,  98, 'open', 0);
add('truck','37',  360,  356,  14,  98, 'open', 0);
add('truck','19',   40,  552,  14,  98, 'open', 0);
add('truck','20',   56,  552,  14,  98, 'open', 0);
add('truck','21',   72,  552,  14,  98, 'open', 0);
add('truck','22',   88,  552,  14,  98, 'open', 0);
add('truck','23',  104,  552,  14,  98, 'open', 0);
add('truck','24',  120,  552,  14,  98, 'open', 0);
add('truck','25',  136,  552,  14,  98, 'open', 0);
add('truck','26',  152,  552,  14,  98, 'open', 0);
add('truck','27',  168,  552,  14,  98, 'open', 0);
add('truck','28',  184,  552,  14,  98, 'open', 0);
add('truck','29',  200,  552,  14,  98, 'open', 0);
add('truck','30',  216,  552,  14,  98, 'open', 0);
add('truck','31',  232,  552,  14,  98, 'open', 0);
add('truck','32',  248,  552,  14,  98, 'open', 0);
add('truck','33',  264,  552,  14,  98, 'open', 0);
add('truck','34',  280,  552,  14,  98, 'open', 0);
add('truck','35',  296,  552,  14,  98, 'open', 0);
add('truck','36',  312,  552,  14,  98, 'open', 0);
add('truck','18',   40,  654,  14,  98, 'open', 0);
add('truck','17',   56,  654,  14,  98, 'open', 0);
add('truck','16',   72,  654,  14,  98, 'open', 0);
add('truck','15',   88,  654,  14,  98, 'open', 0);
add('truck','14',  104,  654,  14,  98, 'open', 0);
add('truck','13',  120,  654,  14,  98, 'open', 0);
add('truck','12',  136,  654,  14,  98, 'open', 0);
add('truck','11',  152,  654,  14,  98, 'open', 0);
add('truck','10',  168,  654,  14,  98, 'open', 0);
add('truck','9',  184,  654,  14,  98, 'open', 0);
add('truck','8',  200,  654,  14,  98, 'open', 0);
add('truck','7',  216,  654,  14,  98, 'open', 0);
add('truck','6',  232,  654,  14,  98, 'open', 0);
add('truck','5',  248,  654,  14,  98, 'open', 0);
add('truck','4',  264,  654,  14,  98, 'open', 0);
add('truck','3',  280,  654,  14,  98, 'open', 0);
add('truck','2',  296,  654,  14,  98, 'open', 0);
add('truck','1',  312,  654,  14,  98, 'open', 0);
add('car','A20',   -15,  976,  12,  34, 'open', 0);
add('car','A19',   -1,  976,  12,  34, 'open', 0);
add('car','A18',   13,  976,  12,  34, 'open', 0);
add('car','A17',   27,  976,  12,  34, 'open', 0);
add('car','A16',   41,  976,  12,  34, 'open', 0);
add('car','A15',  55,  976,  12,  34, 'open', 0);
add('car','A14',  69,  976,  12,  34, 'open', 0);
add('car','A13',  83,  976,  12,  34, 'open', 0);
add('car','A12',  149, 976,  12,  34, 'open', 0);
add('car','A11',  163, 976,  12,  34, 'open', 0);
add('car','A10',  177, 976,  12,  34, 'open', 0);
add('car','A9',  191, 976,  12,  34, 'open', 0);
add('car','A8',  205, 976,  12,  34, 'open', 0);
add('car','A7',  219, 976,  12,  34, 'open', 0);
add('car','A6',  233, 976,  12,  34, 'open', 0);
add('car','A5',  247, 976,  12,  34, 'open', 0);
add('car','A4',  261, 976,  12,  34, 'open', 0);
add('car','A3',  275, 976,  12,  34, 'open', 0);
add('car','A2',  289, 976,  12,  34, 'open', 0);
add('car','A1',  303, 976,  12,  34, 'open', 0);
/* BOBTAILS - nine stalls nose-in to the east fence, top right of the
   plan, where the client marked the lines.                            */
add('bobtail','B1', 440, 364,  50,  16, 'open', 0);
add('bobtail','B2', 440, 382,  50,  16, 'open', 0);
add('bobtail','B3', 440, 400,  50,  16, 'open', 0);
add('bobtail','B4', 440, 418,  50,  16, 'open', 0);
add('bobtail','B5', 440, 436,  50,  16, 'open', 0);
add('bobtail','B6', 440, 454,  50,  16, 'open', 0);
add('bobtail','B7', 440, 472,  50,  16, 'open', 0);
add('bobtail','B8', 440, 490,  50,  16, 'open', 0);
add('bobtail','B9', 440, 508,  50,  16, 'open', 0);

/* the green boxes either side of the entrance */

/* GENERAL SPACE - the big green box on the right of the plan, mid-height */
add('general','General Space',  433,  582,  80,  140, 'open', 0);

/* the mobile office, the green box lower right */
add('office','Mobile Office',  433,  790,  67,   85, 'open', 0);
add('car','A21',  438,  900,  57,  32, 'open', 0);
add('car','A22',  438,  934,  57,  32, 'open', 0);
add('car','A23',  438,  968,  57,  32, 'open', 0);

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
const CX=245, CY=495;                 // plan centre
const YAW=32*Math.PI/180, cosY=Math.cos(YAW), sinY=Math.sin(YAW);
const KY=0.62;                        // vertical foreshorten (camera tilt-back)
const OX=550, OY=405, SLAB=24;        // screen origin + platform thickness
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
  rect(40,454,336,98);    // drive, row 1 | row 2
  rect(40,752,336,113);    // drive, row 3 | A row
  rect(40,650,336,4);        // rows 2 and 3 are back to back
  rect(95,930,54,86);        // the entrance driveway, out through the A row
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
  // gate posts either side of the entrance gap, on the south boundary
  feat(122,1006,()=>{const g=el('g',{});
    [[96,996],[138,996]].forEach(p=>g.appendChild(prism(
      [[p[0],p[1]],[p[0]+10,p[1]],[p[0]+10,p[1]+16],[p[0],p[1]+16]],30,'#2b3038','#171a1f')));
    return g;});
  // trees around the parcel
  [[-70,210,1.1],[-70,610,1.05],[-70,960,1.15],[560,210,1.0],[560,610,1.1],[560,960,1.15]]
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
  at(274,164,20,'Lot A');
  at(274,200,20,'1.55 acres',{sm:true});
  at(200,327,1,'Truck spots 1—57 · three rows',{sm:true});
  at(230,1040,1,'A1—A20',{sm:true});
  at(482,1006,1,'A21—A23',{sm:true});
  at(468,348,1,'Bobtails B1—B9',{sm:true});
  at(122,952,1,'ENTRANCE',{sm:true});
  at(330,1086,1,'W Washington St',{sm:true});
  at(473,566,1,'General Space',{sm:true});
  at(482,774,1,'Mobile Office',{sm:true});

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
    if(u.type!=='acre1'){
      const ft2=areaOf(u)/(UPFT*UPFT);
      // 22.7 ft x 74.7 ft of painted stall on a 25 ft pitch and a 75 ft bay.
      return;   // stall sizes come off the CAD plan
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
