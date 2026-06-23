const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

// Element palette — byte-identical to game.js ELEMENT
const ELEMENT = {
  fire:     { name: 'Fire',     col: '#ff6b3d', glow: '#ff3d00', sym: '🔥' },
  light:    { name: 'Light',    col: '#ffe36b', glow: '#fff7d6', sym: '✨' },
  nature:   { name: 'Nature',   col: '#46c46a', glow: '#11a34a', sym: '🌿' },
  darkness: { name: 'Darkness', col: '#9b6bff', glow: '#5e2bd6', sym: '🌑' },
  water:    { name: 'Water',    col: '#3dc8ff', glow: '#0090ff', sym: '💧' },
  earth:    { name: 'Earth',    col: '#e0a43c', glow: '#b97417', sym: '⛰️' },
};
const ELS = ['fire', 'light', 'nature', 'darkness', 'water', 'earth'];
const ARCH = ['normal', 'fast', 'swarm', 'armored', 'eliteboss', 'bigboss'];
const NAMES = {
  fire:     ['Ember Imp', 'Cinder Sprite', 'Spark Swarm', 'Magma Golem', 'Hellhound', 'Infernal Dragon'],
  light:    ['Lumen Acolyte', 'Glimmer Wisp', 'Mote Swarm', 'Sun Sentinel', 'Seraph Knight', 'Radiant Archon'],
  nature:   ['Sprout Goblin', 'Vine Stalker', 'Spore Swarm', 'Bark Treant', 'Thorn Beast', 'Ancient Worldtree'],
  darkness: ['Shade Crawler', 'Wraith', 'Bat Swarm', 'Bone Knight', 'Void Reaper', 'Void Titan'],
  water:    ['Tide Spawn', 'Frost Whelp', 'Slush Swarm', 'Frost Bulwark', 'Leviathan Guard', 'Glacier Kraken'],
  earth:    ['Pebble Grunt', 'Dust Runner', 'Gravel Swarm', 'Boulder Golem', 'Stone Warden', 'Mountain Colossus'],
};

function hex(c, a) { // hex -> rgba
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

// ---- body shape helper ----
function bodyPath(ctx, x, y, r, shape) {
  ctx.beginPath();
  if (shape === 'round') { ctx.arc(x, y, r, 0, Math.PI*2); }
  else if (shape === 'tall') { rr(ctx, x-r*0.72, y-r*1.1, r*1.44, r*2.1, r*0.5); }
  else if (shape === 'squat') { rr(ctx, x-r*1.1, y-r*0.7, r*2.2, r*1.5, r*0.55); }
  else if (shape === 'hex') { for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); }
  else if (shape === 'spiky') { for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const rr2=r*(i%2?0.72:1.05);const px=x+Math.cos(a)*rr2,py=y+Math.sin(a)*rr2;i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.closePath(); }
  else { ctx.arc(x, y, r, 0, Math.PI*2); }
}
function rr(ctx,x,y,w,h,r){ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

// ---- element surface FX drawn behind/around body ----
function elementAura(ctx, x, y, r, el, intensity) {
  const E = ELEMENT[el];
  ctx.save();
  ctx.shadowColor = E.glow; ctx.shadowBlur = 18*intensity;
  ctx.strokeStyle = hex(E.glow, 0.0); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  // radial glow puff
  const g = ctx.createRadialGradient(x,y,r*0.4,x,y,r*1.9);
  g.addColorStop(0, hex(E.glow, 0.28*intensity)); g.addColorStop(1, hex(E.glow, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,r*1.9,0,Math.PI*2); ctx.fill();
}

function eyes(ctx, x, y, r, n, glow, col) {
  ctx.fillStyle = glow ? '#fff' : '#10151c';
  const es = r*0.16, ey = y - r*0.12;
  const put = px => { ctx.beginPath(); ctx.arc(px, ey, es, 0, Math.PI*2); ctx.fill();
    if (glow) { ctx.save(); ctx.shadowColor=col; ctx.shadowBlur=10; ctx.fillStyle=col; ctx.beginPath(); ctx.arc(px,ey,es*0.6,0,Math.PI*2); ctx.fill(); ctx.restore(); ctx.fillStyle='#fff'; } };
  if (n===1) put(x);
  else if (n===2) { put(x-r*0.34); put(x+r*0.34); }
  else { put(x-r*0.42); put(x); put(x+r*0.42); }
}

function horns(ctx, x, y, r, pairs, col) {
  ctx.fillStyle = '#1c2128';
  for (let p=0;p<pairs;p++){
    const sp = r*(0.42+p*0.18);
    for (const s of [-1,1]) {
      ctx.beginPath();
      ctx.moveTo(x+s*sp-3, y-r*0.78);
      ctx.lineTo(x+s*(sp+r*0.12), y-r*(1.15+p*0.18));
      ctx.lineTo(x+s*sp+3, y-r*0.78);
      ctx.closePath(); ctx.fill();
    }
  }
}

// ---- main creature draw: element x archetype x rank(1..3) ----
function drawCreature(ctx, cx, cy, el, arch, rank) {
  const E = ELEMENT[el];
  const inten = 0.6 + rank*0.22;          // aura intensity grows with rank
  const grow = 1 + (rank-1)*0.13;          // size grows with rank
  let r = 28 * grow;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.translate(-cx, -cy);

  // archetype geometry
  let shape='round', count=1, scale=1, lean=0, plated=false, crown=false, big=false, wings=false, ring=false;
  if (arch==='normal')      { shape='round'; }
  else if (arch==='fast')   { shape='tall'; scale=0.8; lean=1; }
  else if (arch==='swarm')  { shape='round'; count=5; scale=0.42; }
  else if (arch==='armored'){ shape='squat'; scale=1.25; plated=true; }
  else if (arch==='eliteboss'){ shape='spiky'; scale=1.2; crown=true; }
  else if (arch==='bigboss'){ shape='hex'; scale=1.55; big=true; crown=true; wings=true; ring=true; }
  r *= scale;

  const positions = [];
  if (count>1){ // swarm cluster
    positions.push([cx-r*1.4, cy-r*0.6],[cx+r*1.3,cy-r*0.4],[cx-r*0.3,cy+r*0.9],[cx+r*1.1,cy+r*1.0],[cx,cy-r*0.1]);
  } else positions.push([cx,cy]);

  // bigboss rotating-style aura ring
  if (ring){
    ctx.save(); ctx.strokeStyle=hex(E.glow,0.6); ctx.lineWidth=3; ctx.setLineDash([7,9]);
    ctx.beginPath(); ctx.arc(cx,cy,r+16,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  // wings hint
  if (wings){
    ctx.fillStyle = hex(E.col,0.32);
    for (const s of [-1,1]){ ctx.beginPath();
      ctx.moveTo(cx+s*r*0.4, cy-r*0.2);
      ctx.quadraticCurveTo(cx+s*r*2.2, cy-r*1.3, cx+s*r*2.0, cy+r*0.4);
      ctx.quadraticCurveTo(cx+s*r*1.2, cy+r*0.2, cx+s*r*0.4, cy+r*0.5);
      ctx.closePath(); ctx.fill(); }
  }

  for (let pi=0; pi<positions.length; pi++){
    let [x,y] = positions[pi];
    const rr2 = count>1 ? r : r;
    if (lean){ x += r*0.25; } // shift to suggest motion
    elementAura(ctx, x, y, rr2, el, inten);

    // body gradient
    const top = el==='darkness'? '#3a2f55' : el==='earth'? '#7a5a2e' : '#2a3038';
    const g = ctx.createRadialGradient(x-rr2*0.3,y-rr2*0.4,rr2*0.2,x,y,rr2);
    g.addColorStop(0, mix(E.col, '#ffffff', 0.35)); g.addColorStop(0.55, E.col); g.addColorStop(1, darken(E.col, 0.45));
    ctx.fillStyle = g; bodyPath(ctx,x,y,rr2,shape); ctx.fill();
    ctx.lineWidth = big?4:3; ctx.strokeStyle = darken(E.col,0.55); bodyPath(ctx,x,y,rr2,shape); ctx.stroke();

    // plated armor segments
    if (plated){ ctx.strokeStyle=hex('#1c2128',0.7); ctx.lineWidth=3;
      for (const fy of [-0.35,0.05,0.45]){ ctx.beginPath(); ctx.moveTo(x-rr2*0.9,y+rr2*fy); ctx.quadraticCurveTo(x,y+rr2*fy+8,x+rr2*0.9,y+rr2*fy); ctx.stroke(); } }

    // element surface motif
    surfaceMotif(ctx, x, y, rr2, el, rank);

    // horns / crown
    if (crown){ ctx.fillStyle=E.col;
      for (const dx of [-rr2*0.5,0,rr2*0.5]){ ctx.beginPath(); ctx.moveTo(x+dx-5,y-rr2*0.85); ctx.lineTo(x+dx,y-rr2*(dx===0?1.5:1.25)); ctx.lineTo(x+dx+5,y-rr2*0.85); ctx.closePath(); ctx.fill(); }
    } else if (count===1){ horns(ctx,x,y,rr2, rank, E.col); }

    // eyes — glow from rank II+
    eyes(ctx, x, y, rr2, big?3:(arch==='swarm'?1:2), rank>=2, E.glow);
  }
  ctx.restore();
}

function surfaceMotif(ctx,x,y,r,el,rank){
  ctx.save();
  if (el==='fire'){ // ember cracks
    ctx.strokeStyle=hex('#ffd24a',0.8); ctx.lineWidth=1.5;
    for (const a of [0.4,2.0,3.6,5.0]){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(a)*r*0.8,y+Math.sin(a)*r*0.8); ctx.stroke(); }
    for(let i=0;i<rank*3;i++){const a=Math.random()*6.28,d=r*(1.1+Math.random()*0.5);ctx.fillStyle=hex('#ffae42',0.9);ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,1.6,0,6.28);ctx.fill();}
  } else if (el==='water'){ ctx.fillStyle=hex('#eaffff',0.5); ctx.beginPath(); ctx.ellipse(x-r*0.3,y-r*0.35,r*0.22,r*0.12,-0.5,0,6.28); ctx.fill();
    ctx.fillStyle=hex('#cdefff',0.7); for(const dx of [-0.3,0.4]){ctx.beginPath();ctx.moveTo(x+dx*r,y+r*0.8);ctx.lineTo(x+dx*r+3,y+r*1.15);ctx.lineTo(x+dx*r-3,y+r*1.15);ctx.closePath();ctx.fill();}
  } else if (el==='nature'){ ctx.fillStyle='#2f7d3a'; for(const dx of [-0.4,0.1,0.5]){ctx.save();ctx.translate(x+dx*r,y-r*0.85);ctx.rotate(dx);ctx.beginPath();ctx.ellipse(0,0,4,9,0,0,6.28);ctx.fill();ctx.restore();}
    ctx.fillStyle=hex('#7be08a',0.6); for(let i=0;i<rank*2;i++){ctx.beginPath();ctx.arc(x+(Math.random()-0.5)*r,y+(Math.random()-0.2)*r,2,0,6.28);ctx.fill();}
  } else if (el==='earth'){ ctx.strokeStyle=hex('#5a3d14',0.7);ctx.lineWidth=2; ctx.beginPath();ctx.moveTo(x-r*0.6,y-r*0.2);ctx.lineTo(x-r*0.1,y);ctx.lineTo(x-r*0.4,y+r*0.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+r*0.5,y-r*0.4);ctx.lineTo(x+r*0.2,y+r*0.1);ctx.stroke();
  } else if (el==='light'){ ctx.strokeStyle=hex('#fffbe0',0.85);ctx.lineWidth=2; for(let i=0;i<8;i++){const a=i/8*6.28;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*1.05,y+Math.sin(a)*r*1.05);ctx.lineTo(x+Math.cos(a)*r*(1.3+rank*0.06),y+Math.sin(a)*r*(1.3+rank*0.06));ctx.stroke();}
  } else if (el==='darkness'){ ctx.fillStyle=hex('#1a1030',0.55); for(let i=0;i<rank*3;i++){const a=Math.random()*6.28,d=r*(0.9+Math.random()*0.6);ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,r*0.18,0,6.28);ctx.fill();}
  }
  ctx.restore();
}

function mix(a,b,t){const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16);const r=Math.round(((A>>16&255)*(1-t)+(B>>16&255)*t)),g=Math.round(((A>>8&255)*(1-t)+(B>>8&255)*t)),bl=Math.round(((A&255)*(1-t)+(B&255)*t));return `rgb(${r},${g},${bl})`;}
function darken(a,t){return mix(a,'#000000',t);}

// =================== SHEET 1: full 6x6 roster ===================
function roster(){
  const TS=170, padX=24, padTop=70, labelH=34;
  const W = padX*2 + ARCH.length*TS;
  const H = padTop + ELS.length*(TS+labelH);
  const c = createCanvas(W,H); const ctx=c.getContext('2d');
  // bg
  const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#0e1218'); bg.addColorStop(1,'#141a22'); ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.font='bold 26px sans-serif'; ctx.fillStyle='#e8eef6'; ctx.textAlign='left';
  ctx.fillText('ELEMENTAL TD — Enemy Roster  (element × archetype, shown at Rank II)', padX, 40);
  // archetype headers
  ctx.font='bold 14px sans-serif'; ctx.fillStyle='#9fb0c4'; ctx.textAlign='center';
  ARCH.forEach((a,ci)=>ctx.fillText(a.toUpperCase(), padX+ci*TS+TS/2, padTop-8));
  ELS.forEach((el,ri)=>{
    const E=ELEMENT[el];
    const y0=padTop+ri*(TS+labelH);
    ARCH.forEach((arch,ci)=>{
      const x0=padX+ci*TS;
      // tile bg
      ctx.fillStyle=hex(E.glow,0.05); ctx.fillRect(x0+4,y0+4,TS-8,TS-8);
      ctx.strokeStyle=hex(E.col,0.25); ctx.lineWidth=1; ctx.strokeRect(x0+4,y0+4,TS-8,TS-8);
      drawCreature(ctx, x0+TS/2, y0+TS/2-6, el, arch, 2);
      // name
      ctx.font='12px sans-serif'; ctx.fillStyle='#cdd7e3'; ctx.textAlign='center';
      ctx.fillText(NAMES[el][ci], x0+TS/2, y0+TS+18);
    });
    // element label on left of row (overlaid at first tile top)
    ctx.font='bold 13px sans-serif'; ctx.fillStyle=E.col; ctx.textAlign='left';
    ctx.fillText(E.name.toUpperCase(), padX+8, y0+20);
  });
  fs.writeFileSync('roster.png', c.toBuffer('image/png'));
  console.log('roster.png', W+'x'+H);
}

// =================== SHEET 2: escalation (Fire normal + a few) ===================
function escalation(){
  const TS=180, padX=24, padTop=70, rows=[['fire','normal'],['fire','eliteboss'],['darkness','fast'],['nature','armored']];
  const cols=3; const labelH=30;
  const W=padX*2+cols*TS+160; const H=padTop+rows.length*(TS+labelH);
  const c=createCanvas(W,H); const ctx=c.getContext('2d');
  const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#0e1218'); bg.addColorStop(1,'#141a22'); ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.font='bold 26px sans-serif'; ctx.fillStyle='#e8eef6'; ctx.textAlign='left';
  ctx.fillText('Rank escalation within a level  (I → II → III)', padX, 40);
  ctx.font='bold 14px sans-serif'; ctx.fillStyle='#9fb0c4'; ctx.textAlign='center';
  ['Rank I — Lesser (w1-16)','Rank II — Greater (w17-33)','Rank III — Dread (w34-50)'].forEach((t,ci)=>ctx.fillText(t,padX+160+ci*TS+TS/2,padTop-8));
  rows.forEach(([el,arch],ri)=>{
    const E=ELEMENT[el]; const y0=padTop+ri*(TS+labelH);
    ctx.font='bold 14px sans-serif'; ctx.fillStyle=E.col; ctx.textAlign='right';
    ctx.fillText(`${E.name} ${arch}`, padX+150, y0+TS/2);
    for(let rank=1;rank<=3;rank++){
      const x0=padX+160+(rank-1)*TS;
      ctx.fillStyle=hex(E.glow,0.05); ctx.fillRect(x0+4,y0+4,TS-8,TS-8);
      ctx.strokeStyle=hex(E.col,0.25); ctx.strokeRect(x0+4,y0+4,TS-8,TS-8);
      drawCreature(ctx,x0+TS/2,y0+TS/2,el,arch,rank);
    }
  });
  fs.writeFileSync('escalation.png', c.toBuffer('image/png'));
  console.log('escalation.png', W+'x'+H);
}

roster();
escalation();
