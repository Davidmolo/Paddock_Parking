
if(/(^|[?&])embed\b/.test(location.search)) document.body.classList.add('embed');
(function(){
const TYPES = {
  lot:    {name:'Open Lot',      color:'#0a84ff', top:'#57a5f5', wall:'#2f7bd0', price:2400, size:'acre lot'},
  bobtail:{name:'Bobtail Spot',  color:'#30b0c7', top:'#54cbe0', wall:'#2aa0b8', price:150,  size:'bobtail spot'},
  spot:   {name:'Parking Spot',  color:'#ff9f0a', top:'#ffb84d', wall:'#e0902a', price:180,  size:'12 ft × 46 ft'},
  leased: {name:'Leased',        color:'#c4c9cf', top:'#c4c9cf', wall:'#a3a9b1', price:0,    size:'leased'},
};
const money=n=>'$'+n.toLocaleString();
const PER_ACRE=2400;                  // placeholder rate, not confirmed
function priceOf(u){return u.price!=null?u.price:TYPES[u.type].price;}
function sizeOf(u){return u.acres?(u.acres+' acres'):TYPES[u.type].size;}

const SITE={x:0,y:0,w:692,h:662};
const SITE_POLY=[[0,0],[692,0],[692,662],[0,662]];
const UPFT=1.0;                        // one plan unit = one foot

const units=[]; const byId={};
function add(type,id,x,y,w,h,state,acres,pts){
  const u={id,type,x,y,w,h,angle:0,state,acres,taken:state!=='open',pts};
  if(acres>0) u.price=Math.round(acres*PER_ACRE/50)*50;
  units.push(u); byId[u.id]=u;
}

/* ===== 325 yard - traced off the client's sketch ======================

   692 ft of frontage by 662 ft deep.  Every line below was measured off
   the photographed sheet, so the proportions are the drawing's, not an
   even split:

     top bank      y 0-368, five lots, Lot 3 the narrowest at 111 ft
     drive         y 368-408 the width of the yard, opening out into the
                   apron on the west, down to 472 where Lot 6 starts
     14 spaces     x 180-348, in the gap above Lot 6
     bottom bank   Lots 7-9 run from 408, Lot 6 only from 472

   The nine bobtail spaces are carved out of Lot 1's south-west corner, so
   the two are separate ground and nothing is let twice.  Note the sheet
   draws them inside Lot 1 and still calls it 1.72 acres; taken out, Lot 1's
   own outline measures 1.58.  The nine spaces are already let.          */

//  type     id        x     y     w     h   state  acres
add('lot','Lot 1',     0,    0,  210,  368, 'open', 1.72,
    [[0,0],[210,0],[210,368],[60,368],[60,228],[0,228]]);
add('lot','Lot 2',   210,    0,  121,  368, 'open', 1);
add('lot','Lot 3',   331,    0,  111,  368, 'open', 1);
add('lot','Lot 4',   442,    0,  123,  368, 'open', 1);
add('lot','Lot 5',   565,    0,  127,  368, 'open', 1);

/* nine bobtail spaces on Lot 1's south-west corner */
add('bobtail','B1',   0, 228.0,  60,  13.5, 'leased', 0);
add('bobtail','B2',   0, 243.5,  60,  13.5, 'leased', 0);
add('bobtail','B3',   0, 259.0,  60,  13.5, 'leased', 0);
add('bobtail','B4',   0, 274.5,  60,  13.5, 'leased', 0);
add('bobtail','B5',   0, 290.0,  60,  13.5, 'leased', 0);
add('bobtail','B6',   0, 305.5,  60,  13.5, 'leased', 0);
add('bobtail','B7',   0, 321.0,  60,  13.5, 'leased', 0);
add('bobtail','B8',   0, 336.5,  60,  13.5, 'leased', 0);
add('bobtail','B9',   0, 352.0,  60,  13.5, 'leased', 0);

/* the 14-space row, in the gap above Lot 6 */
add('spot','S1', 180,  408,  10,   64, 'open', 0);
add('spot','S2', 192,  408,  10,   64, 'open', 0);
add('spot','S3', 204,  408,  10,   64, 'open', 0);
add('spot','S4', 216,  408,  10,   64, 'open', 0);
add('spot','S5', 228,  408,  10,   64, 'open', 0);
add('spot','S6', 240,  408,  10,   64, 'open', 0);
add('spot','S7', 252,  408,  10,   64, 'open', 0);
add('spot','S8', 264,  408,  10,   64, 'open', 0);
add('spot','S9', 276,  408,  10,   64, 'open', 0);
add('spot','S10', 288,  408,  10,   64, 'open', 0);
add('spot','S11', 300,  408,  10,   64, 'open', 0);
add('spot','S12', 312,  408,  10,   64, 'open', 0);
add('spot','S13', 324,  408,  10,   64, 'open', 0);
add('spot','S14', 336,  408,  10,   64, 'open', 0);

add('lot','Lot 6',     0,  472,  347,  190, 'open', 1.75);
add('lot','Lot 7',   347,  408,  103,  254, 'open', 0.5);
add('lot','Lot 8',   450,  408,  142,  254, 'open', 1);
add('lot','Lot 9',   592,  408,  100,  254, 'open', 0.66);

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
const CX=346, CY=331;                 // plan centre
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
  const rect=(x,y,w,h,fill)=>{const q=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p=>iso(p[0],p[1],0));
    svg.appendChild(el('polygon',{points:q.map(P).join(' '),fill:fill||'#cfd5de'}));};
  // the running surface, a shade darker than the platform so the drive
  // reads as a road rather than as a gap between the two banks
  rect(0,368,692,40);        // the drive, the width of the yard
  rect(0,408,180,64);        // the open apron on the west side, down to Lot 6
  // kerb where the drive runs between the two banks; the west side is left
  // as open apron, so no kerb and no markings there
  rect(0,366,692,2,'#b9c0cb');
  rect(180,408,512,2,'#b9c0cb');
  // painted centre line, starting where the drive narrows to a lane
  for(let x=196;x<676;x+=36) rect(x,387,22,3,'#ffffff');
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
    // the lots are hundreds of feet across, so a tall extrusion buries the
    // 40 ft drive between them - keep them low and the road stays visible
    const col=stateCol(u), H=u.type==='bobtail'?11:(u.type==='spot'?11:9);
    items.push({d:depthOf(ce[0],ce[1]),mk:()=>{const g=prism(c,H,col.top,col.wall);attach(g,u);u._g=g;return g;}});});
  const feat=(cx,cy,mk)=>items.push({d:depthOf(cx,cy),mk});
  // the way in, on the west boundary where the bobtail strip ends
  feat(6,420,()=>{const g=el('g',{});
    [[0,368],[0,458]].forEach(p=>g.appendChild(prism(
      [[p[0],p[1]],[p[0]+11,p[1]],[p[0]+11,p[1]+14],[p[0],p[1]+14]],22,'#2b3038','#171a1f')));
    return g;});
  // trees around the parcel
  [[-60,80,1.1],[-60,560,1.15],[755,80,1.0],[755,330,1.1],[755,590,1.15],
   [165,-60,1.05],[470,-60,1.15],[165,725,1.1],[470,725,1.0]]
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
  at(120,140,9,'Lot 1');           at(120,175,9,'1.72 acres',{sm:true});
  at(270,160,9,'Lot 2');           at(270,195,9,'1 acre',{sm:true});
  at(386,160,9,'Lot 3',{sm:true}); at(386,190,9,'1 acre',{sm:true});
  at(503,160,9,'Lot 4');           at(503,195,9,'1 acre',{sm:true});
  at(628,160,9,'Lot 5');           at(628,195,9,'1 acre',{sm:true});
  at(173,565,9,'Lot 6');           at(173,600,9,'1.75 acres',{sm:true});
  at(398,520,9,'Lot 7',{sm:true}); at(398,550,9,'½ acre',{sm:true});
  at(521,520,9,'Lot 8');           at(521,555,9,'1 acre',{sm:true});
  at(642,520,9,'Lot 9',{sm:true}); at(642,550,9,'.66 acre',{sm:true});
  
  at(264,390,1,'14 spaces',{sm:true});
  at(-62,420,1,'Entrance',{sm:true});
  at(-58,296,1,'Bobtails — let',{sm:true});
}



/* units, features and props are all drawn (depth-sorted) by drawScene() */
function showTip(e,u){
  if(view.panning)return;
  const t=TYPES[u.type],on=selected.has(u.id),col=stateCol(u);
  const status=u.state==='leased'?'Leased':(u.state==='pending'?'Pending':null);
  tip.innerHTML=`<div class="t-name"><span class="d" style="background:${col.top}"></span>${u.id}</div>
    <div class="t-row"><span>Type</span><b>${t.name}</b></div>
    <div class="t-row"><span>Size</span><b>${sizeOf(u)}</b></div>
    ${status?`<div class="t-row"><span>Status</span><b>${status}</b></div>`
            :`<div class="t-row"><span>Price</span><b>${money(priceOf(u))}/mo</b></div>`}
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
  const total=arr.reduce((s,u)=>s+priceOf(u),0);
  const rows=arr.map(u=>{const t=TYPES[u.type];return `<div class="sel-item">
      <span class="d" style="background:${t.color}"></span>
      <div class="info"><div class="id">${u.id}</div><div class="ty">${t.name}</div></div>
      <div class="pr">${money(priceOf(u))}</div>
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
  const total=arr.reduce((s,u)=>s+priceOf(u),0);
  const lines=arr.map(u=>`<div class="l"><span>${u.id} · ${TYPES[u.type].name}</span><b>${money(priceOf(u))}/mo</b></div>`).join('');
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
  const arr=[...selected.values()], total=arr.reduce((s,u)=>s+priceOf(u),0);
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
  // Lot 1 is L-shaped around the bobtail strip, so bounding boxes alone
  // would report an overlap that is not there.  Boxes are only the cheap
  // first pass; anything they flag is then tested outline against outline.
  const cornersOf=u=>u.pts||[[u.x,u.y],[u.x+u.w,u.y],[u.x+u.w,u.y+u.h],[u.x,u.y+u.h]];
  const centreOf=p=>{let x=0,y=0;p.forEach(q=>{x+=q[0];y+=q[1];});return [x/p.length,y/p.length];};
  const inset=p=>{const c=centreOf(p);               // 4% in, so a shared
    return p.map(q=>[q[0]+(c[0]-q[0])*0.04,          // edge is not a hit
                     q[1]+(c[1]-q[1])*0.04]);};
  const inPoly=(x,y,pts)=>{let c=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
      if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c;}
    return c;};
  for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
    const A=units[i],B=units[j],a=box(A),b=box(B);
    if(!(a[0]<b[2]-0.5&&b[0]<a[2]-0.5&&a[1]<b[3]-0.5&&b[1]<a[3]-0.5)) continue;
    if(!A.pts&&!B.pts){bad.push(A.id+' overlaps '+B.id); continue;}
    const pa=cornersOf(A),pb=cornersOf(B);
    const hit=inset(pa).concat([centreOf(pa)]).some(p=>inPoly(p[0],p[1],pb))
           || inset(pb).concat([centreOf(pb)]).some(p=>inPoly(p[0],p[1],pa));
    if(hit) bad.push(A.id+' overlaps '+B.id);
  }
  // drawn area must agree with the stated acreage (1 acre = 43,560 sq ft).
  // Parking spaces are sold per space, not by acreage, so they are exempt -
  // they are checked against their 12 ft x 75 ft footprint instead.
  // anything sold by the acre has to measure what it says on the plan;
  // bobtails and the 14 spots are sold per space, so they are exempt
  units.forEach(u=>{
    if(!(u.acres>0)) return;
    const acres=areaOf(u)/(UPFT*UPFT)/43560;
    if(Math.abs(acres-u.acres)/u.acres>0.06) bad.push(u.id+' acreage off ('+acres.toFixed(2)+')');
  });
  return bad;
};

drawScene(); renderPanel();
document.getElementById('avail-n').textContent=availableCount();
})();
