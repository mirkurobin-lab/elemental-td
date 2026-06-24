// Elemental TD — deterministic, fixed-timestep canvas tower defense.
// Art: 3 generated images (bg + cards) + procedural towers/creeps/fx that embed the STYLE FORMULA.
import { STR } from "./strings.js";

/* ------------------------------------------------------------------ *
 *  CONSTANTS / WORLD
 * ------------------------------------------------------------------ */
const COLS = 9, ROWS = 12, CELL = 64;
const WORLD_W = COLS * CELL, WORLD_H = ROWS * CELL;
const STEP = 1000 / 60;

// ── Campaign MAPS: a DIFFERENT fixed path per level (1..10) for variety. ──
// Creeps walk the dirt lane from a top-edge entrance to the base; you build towers in the
// grass beside it. Each map is a "turtle walk" (start cell + [direction, steps] segments),
// which guarantees the path is one continuous chain of adjacent cells. Grid is COLS×ROWS (9×12).
const _walk = (sc, sr, segs) => {
  const cells = [{ c: sc, r: sr }]; let c = sc, r = sr;
  for (const [dc, dr, n] of segs) for (let i = 0; i < n; i++) { c += dc; r += dr; cells.push({ c, r }); }
  return cells;
};
const _R = [1, 0], _L = [-1, 0], _D = [0, 1], _U = [0, -1];
const sg = (dir, n) => [dir[0], dir[1], n];
const MAPS = [
  /* 1 horizontal serpentine */ () => _walk(0, 0, [sg(_R,8),sg(_D,2),sg(_L,8),sg(_D,2),sg(_R,8),sg(_D,2),sg(_L,8),sg(_D,2),sg(_R,8),sg(_D,2),sg(_L,4)]),
  /* 2 vertical serpentine   */ () => _walk(0, 0, [sg(_D,11),sg(_R,2),sg(_U,11),sg(_R,2),sg(_D,11),sg(_R,2),sg(_U,11),sg(_R,2),sg(_D,6)]),
  /* 3 inward spiral         */ () => _walk(0, 0, [sg(_R,8),sg(_D,10),sg(_L,8),sg(_U,8),sg(_R,6),sg(_D,6),sg(_L,4),sg(_U,4),sg(_R,2),sg(_D,3)]),
  /* 4 counter spiral        */ () => _walk(8, 0, [sg(_L,8),sg(_D,10),sg(_R,8),sg(_U,8),sg(_L,6),sg(_D,6),sg(_R,4),sg(_U,4),sg(_L,2),sg(_D,3)]),
  /* 5 diagonal staircase    */ () => _walk(0, 0, [sg(_R,2),sg(_D,2),sg(_R,2),sg(_D,2),sg(_R,2),sg(_D,2),sg(_R,2),sg(_D,2),sg(_L,8),sg(_D,2),sg(_R,8)]),
  /* 6 wide switchback       */ () => _walk(0, 0, [sg(_R,6),sg(_D,3),sg(_L,6),sg(_D,3),sg(_R,6),sg(_D,3),sg(_L,6),sg(_D,2),sg(_R,8)]),
  /* 7 vertical combs        */ () => _walk(1, 0, [sg(_D,9),sg(_R,3),sg(_U,9),sg(_R,3),sg(_D,11)]),
  /* 8 perimeter ring + dive */ () => _walk(0, 0, [sg(_R,8),sg(_D,11),sg(_L,8),sg(_U,9),sg(_R,4),sg(_D,6)]),
  /* 9 offset brick          */ () => _walk(0, 0, [sg(_R,8),sg(_D,2),sg(_L,6),sg(_D,2),sg(_R,6),sg(_D,2),sg(_L,6),sg(_D,2),sg(_R,6),sg(_D,2),sg(_L,8)]),
  /* 10 center-spine fan     */ () => _walk(4, 0, [sg(_D,2),sg(_L,4),sg(_D,2),sg(_R,8),sg(_D,2),sg(_L,8),sg(_D,2),sg(_R,8),sg(_D,2),sg(_L,4)]),
];
function buildPathData(cells) {
  const cc = (c, r) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
  const set = new Set(cells.map((p) => p.c + "," + p.r));
  const pts = cells.map((p) => cc(p.c, p.r));
  const e = cells[0]; pts.unshift({ x: cc(e.c, e.r).x, y: -CELL * 0.6 }); // walk in from above the top entrance
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { cells, set, entrance: cells[0], exit: cells[cells.length - 1], pts, cum, len: cum[cum.length - 1] };
}
// Which map each level uses. Ordered so SHORTER (harder) paths sit on EARLY low-HP levels and
// LONGER (more forgiving) paths sit on LATE high-HP levels, keeping difficulty smooth & all 10 winnable.
// Lengths by map index: [55,59,60,60,35,44,36,47,51,43]. Level→map: 1:55 2:35 3:36 4:44 5:43 6:47 7:51 8:60 9:59 10:60.
const LEVEL_ORDER = [0, 4, 6, 5, 9, 7, 8, 2, 1, 3];
// these are reassigned per level by setLevelMap(); kept as the same names everything already uses
let PATH_CELLS, PATH_SET, ENTRANCE, EXIT, PATH_PTS, PATH_CUM, PATH_LEN;
function setLevelMap(L) {
  const idx = LEVEL_ORDER[(((L - 1) % LEVEL_ORDER.length) + LEVEL_ORDER.length) % LEVEL_ORDER.length];
  const d = buildPathData(MAPS[idx]());
  PATH_CELLS = d.cells; PATH_SET = d.set; ENTRANCE = d.entrance; EXIT = d.exit;
  PATH_PTS = d.pts; PATH_CUM = d.cum; PATH_LEN = d.len;
}
setLevelMap(1); // default until a level is started
const onPath = (c, r) => PATH_SET.has(c + "," + r);
function posAt(d) { // position at distance d along the polyline
  if (d <= 0) return { x: PATH_PTS[0].x, y: PATH_PTS[0].y };
  if (d >= PATH_LEN) { const p = PATH_PTS[PATH_PTS.length - 1]; return { x: p.x, y: p.y }; }
  let i = 1; while (i < PATH_CUM.length && PATH_CUM[i] < d) i++;
  const segLen = PATH_CUM[i] - PATH_CUM[i - 1];
  const t = segLen ? (d - PATH_CUM[i - 1]) / segLen : 0;
  const a = PATH_PTS[i - 1], b = PATH_PTS[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Element identity — palette derived byte-for-byte from the approved STYLE FORMULA.
const EL = ["fire", "water", "nature", "earth", "light", "darkness"];
const ELI = { fire: 0, water: 1, nature: 2, earth: 3, light: 4, darkness: 5 };
const ELEMENT = {
  fire:     { name: "Fire",     col: "#ff6b3d", glow: "#ff3d00", sym: "🔥" },
  water:    { name: "Water",    col: "#3dc8ff", glow: "#0090ff", sym: "💧" },
  nature:   { name: "Nature",   col: "#46c46a", glow: "#11a34a", sym: "🌿" },
  earth:    { name: "Earth",    col: "#e0a43c", glow: "#b97417", sym: "⛰️" },
  light:    { name: "Light",    col: "#ffe36b", glow: "#fff7d6", sym: "✨" },
  darkness: { name: "Darkness", col: "#9b6bff", glow: "#5e2bd6", sym: "🌑" },
};
// Element TD's single counter-cycle: each element is STRONG vs the next.
// Light › Darkness › Water › Fire › Nature › Earth › Light.
// A creep takes bonus damage from the element BEFORE it and is near-immune to the one AFTER it.
const STRONG = { light: "darkness", darkness: "water", water: "fire",
                 fire: "nature", nature: "earth", earth: "light" };

// Base pure-tower stats (tier 1). effects carried in fields; tiers scale them.
// Each element has a DISTINCT signature attack.
const PURE = {
  fire:     { dmg: 16, range: 2.0, rate: 1.2, cost: 50, splash: 0.55, dot: 6, dotDur: 1.5 }, // explosive burn (small splash + burn)
  water:    { dmg: 7,  range: 2.4, rate: 1.0, cost: 50, slow: 0.55, slowDur: 1.4 },           // slow / chill
  nature:   { dmg: 4,  range: 2.0, rate: 1.0, cost: 50, dot: 11, dotDur: 3.2 },               // poison over time
  earth:    { dmg: 26, range: 2.2, rate: 0.55, cost: 60, splash: 1.05 },                      // heavy quake, big splash
  light:    { dmg: 5,  range: 3.0, rate: 2.8, cost: 55, gold: 1 },                            // rapid, longest range, +gold
  darkness: { dmg: 30, range: 2.7, rate: 0.7, cost: 65, amp: 0.28, ampDur: 3 },               // long range, curse (amplify)
};
// Two BASE towers you build with gold (Element TD style): Arrow = single target, Artillery = splash.
// Either can be INFUSED with any element; an Artillery base grants splash to whatever element it becomes.
const NEUTRAL = {
  arrow:     { base: "arrow",     name: "Arrow Tower",     sym: "🏹", dmg: 8,  range: 2.1, rate: 1.2, cost: 40, col: "#b6c0cc", glow: "#7c8794" },
  artillery: { base: "artillery", name: "Artillery Tower", sym: "💣", dmg: 14, range: 1.9, rate: 0.6, cost: 55, splash: 0.85, col: "#b6c0cc", glow: "#7c8794" },
};
const ARTILLERY_SPLASH = 0.85; // splash radius (cells) an Artillery base gives any element it's infused with
// Unique name for each element's tower (dual/triple towers have their own names below).
const PURE_NAMES = { fire: "Pyre", water: "Torrent", nature: "Bramble", earth: "Boulder", light: "Prism", darkness: "Hex" };
const COMBO_NAMES = {
  "0+1": "Steam", "0+2": "Wildfire", "0+3": "Magma", "0+4": "Solar", "0+5": "Hellfire",
  "1+2": "Frost", "1+3": "Mud", "1+4": "Holy Tide", "1+5": "Abyss",
  "2+3": "Gaia", "2+4": "Bloom", "2+5": "Plague",
  "3+4": "Crystal", "3+5": "Obsidian", "4+5": "Eclipse",
};
function comboKey(a, b) { const i = ELI[a], j = ELI[b]; return i < j ? `${i}+${j}` : `${j}+${i}`; }
// Build a combo tower's tier-1 stats by blending its two parents' effects.
function comboStats(a, b) {
  const A = PURE[a], B = PURE[b];
  const s = {
    dmg: Math.round((A.dmg + B.dmg) * 1.5),
    range: Math.max(A.range, B.range) + 0.1,
    rate: ((A.rate + B.rate) / 2) * 1.05,
    cost: 130,
  };
  if (A.slow || B.slow) { s.slow = Math.max(A.slow || 0, B.slow || 0); s.slowDur = Math.max(A.slowDur || 0, B.slowDur || 0); }
  if (A.dot || B.dot)   { s.dot = Math.max(A.dot || 0, B.dot || 0); s.dotDur = Math.max(A.dotDur || 0, B.dotDur || 0); }
  if (A.splash || B.splash) s.splash = Math.max(A.splash || 0, B.splash || 0);
  if (A.gold || B.gold) s.gold = 2;
  if (A.amp || B.amp)   { s.amp = Math.max(A.amp || 0, B.amp || 0); s.ampDur = Math.max(A.ampDur || 0, B.ampDur || 0); }
  return s;
}
// 20 triple-element towers (6 choose 3) — Element TD's deepest tier.
const TRIPLE_NAMES = {
  "0+1+2": "Tempest", "0+1+3": "Volcano", "0+1+4": "Aurora", "0+1+5": "Maelstrom",
  "0+2+3": "Wildgrove", "0+2+4": "Sunflare", "0+2+5": "Blight", "0+3+4": "Forge",
  "0+3+5": "Cinder", "0+4+5": "Supernova", "1+2+3": "Marsh", "1+2+4": "Oasis",
  "1+2+5": "Swamp", "1+3+4": "Glacier", "1+3+5": "Permafrost", "1+4+5": "Mirage",
  "2+3+4": "Genesis", "2+3+5": "Decay", "2+4+5": "Wisp", "3+4+5": "Cataclysm",
};
function tripleKey(a, b, c) { return [ELI[a], ELI[b], ELI[c]].sort((x, y) => x - y).join("+"); }
// blend three parents into a powerful triple tower
function tripleStats(a, b, c) {
  const P = [PURE[a], PURE[b], PURE[c]], mx = (k) => Math.max(...P.map((p) => p[k] || 0));
  const s = {
    dmg: Math.round((P[0].dmg + P[1].dmg + P[2].dmg) * 1.6),
    range: Math.max(P[0].range, P[1].range, P[2].range) + 0.25,
    rate: (P.reduce((x, p) => x + p.rate, 0) / 3) * 1.12,
    cost: 280,
  };
  if (mx("slow")) { s.slow = mx("slow"); s.slowDur = mx("slowDur"); }
  if (mx("dot")) { s.dot = mx("dot"); s.dotDur = mx("dotDur"); }
  if (mx("splash")) s.splash = mx("splash");
  if (P.some((p) => p.gold)) s.gold = 3;
  if (mx("amp")) { s.amp = mx("amp"); s.ampDur = mx("ampDur"); }
  return s;
}
// Tier scaling: index 0..(maxTier-1). Pure = 3 tiers, combo = 2 tiers.
function tierScale(stats, tier, isCombo) {
  const dm = [1, 1.9, 3.4][tier] ?? 1;
  const rm = [1, 1.12, 1.25][tier] ?? 1;
  const rt = [1, 1.15, 1.3][tier] ?? 1;
  const out = Object.assign({}, stats);
  out.dmg = Math.round(stats.dmg * dm);
  out.range = stats.range * rm;
  out.rate = stats.rate * rt;
  if (stats.dot) out.dot = stats.dot * dm;
  return out;
}
function upgradeCost(baseCost, nextTier) { return Math.round(baseCost * (nextTier === 1 ? 1.2 : 2.0)); }

/* ------------------------------------------------------------------ *
 *  RNG (seeded, deterministic)
 * ------------------------------------------------------------------ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 *  WAVES
 * ------------------------------------------------------------------ */
const WAVE_ELEMENTS = ["fire", "light", "nature", "darkness", "water", "earth"];
// Creep HP curve toward the real Element TD (~17.5%/wave, steepening to ~23% from wave 42).
// Steep on purpose: a full board of maxed towers should be tested, not coast. Compounds globally.
function baseHpAt(i) {
  // Gentler exponential so a well-upgraded, element-matched board can actually clear all 50 waves.
  // (Old 1.16/1.21 grew ~1400x across a level — far past any tower scaling, making late waves unwinnable.)
  let hp = 16;
  for (let k = 1; k < i; k++) hp *= (k >= 40 ? 1.135 : 1.105);
  return hp;
}
function makeWave(i) { // i = wave within the level, 1..50
  const w = i;
  const L = (G && G.campaignLevel) || 1;
  const isBigBoss = (w === 25 || w === 50);       // single UNIQUE big boss
  const isEliteBoss = (w % 10 === 0) && !isBigBoss; // 10,20,30,40: pack of stronger, distinct-looking elites
  const isBoss = isBigBoss || isEliteBoss;
  const isLevelBoss = (w === 50);                 // the level's grand boss
  const el = WAVE_ELEMENTS[(i - 1 + (L - 1) * 2) % WAVE_ELEMENTS.length]; // element order shifts per level
  const baseHp = baseHpAt(i) * levelMult(L);      // each campaign level is tougher
  let kind;
  if (isBigBoss) kind = "bigboss";
  else if (isEliteBoss) kind = "eliteboss";
  else if (i % 4 === 3) kind = "swarm";
  else if (i % 4 === 2) kind = "fast";
  else if (i % 4 === 0) kind = "armored";
  else kind = "normal";
  const cfg = {
    normal:    { count: 8 + ((i * 0.8) | 0),  hpm: 1.0,  spd: 1.8,  lk: 1, spawn: 0.55 },
    fast:      { count: 8 + ((i * 0.8) | 0),  hpm: 0.6,  spd: 3.2,  lk: 1, spawn: 0.4 },
    swarm:     { count: 16 + ((i * 1.4) | 0), hpm: 0.42, spd: 2.0,  lk: 1, spawn: 0.26 },
    armored:   { count: 6 + ((i / 2) | 0),    hpm: 2.4,  spd: 1.15, lk: 2, spawn: 0.75 },
    eliteboss: { count: 7,                    hpm: 2.9,  spd: 1.3,  lk: 3, spawn: 0.7 },
    bigboss:   { count: 1, hpm: isLevelBoss ? 10 : 7, spd: isLevelBoss ? 0.82 : 0.92, lk: isLevelBoss ? 18 : 12, spawn: 1.0 },
  }[kind];
  const hp = Math.round(baseHp * cfg.hpm);
  // Real Element TD economy: gold per kill is a FLAT, slowly-growing amount (~+10%/wave),
  // NOT a % of HP — so HP outgrows your income and you must spend wisely. Tankier kinds pay more.
  const goldBase = 2 * Math.pow(1.09, i - 1);
  return {
    n: i, kind, element: el, isBoss, isBigBoss, isEliteBoss, isLevelBoss,
    count: cfg.count,
    hp,
    speed: cfg.spd,
    leak: cfg.lk,
    spawnGap: cfg.spawn,
    bounty: Math.max(2, Math.round(goldBase * Math.min(8, cfg.hpm))),
    clearBonus: Math.round(8 + i * 1.5 + (isBigBoss ? goldBase * 6 : isEliteBoss ? goldBase * 3 : 0)),
  };
}

/* ------------------------------------------------------------------ *
 *  AUDIO (procedural WebAudio — no asset files)
 * ------------------------------------------------------------------ */
let actx = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
let MASTER_VOL = 0.4;   // overall SFX loudness (turned down — gameplay can stack a lot of blips)
let MUTED = false;
function blip(freq, dur, type = "sine", vol = 0.12, slideTo = null) {
  if (MUTED || MASTER_VOL <= 0) return;
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.value = vol * MASTER_VOL; g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
const SFX = {
  shoot: (el) => blip({ fire: 320, water: 440, nature: 380, earth: 180, light: 700, darkness: 220 }[el] || 400, 0.08, "triangle", 0.05),
  place: () => { blip(440, 0.09, "sine", 0.14); setTimeout(() => blip(660, 0.1, "sine", 0.14), 70); },
  upgrade: () => { blip(523, 0.1, "sine", 0.15); setTimeout(() => blip(784, 0.12, "sine", 0.15), 90); },
  sell: () => blip(330, 0.12, "sine", 0.12, 180),
  leak: () => blip(140, 0.25, "sawtooth", 0.18, 80),
  levelup: () => { [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => blip(f, 0.12, "triangle", 0.13), k * 70)); },
  start: () => blip(294, 0.18, "sawtooth", 0.12, 440),
  win: () => { [523, 659, 784, 1046, 1318].forEach((f, k) => setTimeout(() => blip(f, 0.22, "triangle", 0.16), k * 130)); },
  lose: () => { [330, 262, 196, 130].forEach((f, k) => setTimeout(() => blip(f, 0.3, "sawtooth", 0.16), k * 160)); },
  deny: () => blip(160, 0.12, "square", 0.1),
};

/* ------------------------------------------------------------------ *
 *  GAME STATE
 * ------------------------------------------------------------------ */
let G;
function newGame(campaignLevel = 1) {
  setLevelMap(campaignLevel); // pick this level's map layout (different path per level)
  const u = (typeof META !== "undefined" && META.upg) ? META.upg : { gold: 0, life: 0, soul: 0 };
  G = {
    gold: 180 + (u.gold || 0) * 40, lives: 20 + (u.life || 0), souls: (u.soul || 0), wave: 0, campaignLevel,
    elementLvl: { fire: 0, water: 0, nature: 0, earth: 0, light: 0, darkness: 0 },
    towers: [], creeps: [], shots: [], fx: [],
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), // tower ref or null
    phase: "idle", // idle (pre-start) | between (countdown) | wave | won | lost
    started: false, betweenTimer: 0,
    spawnQueue: 0, spawnTimer: 0, curWave: null,
    rng: mulberry32(0x1234abcd ^ (campaignLevel * 2654435761)),
    selected: null, time: 0, speed: 1, fusing: null, buildCell: null,
  };
}
const FUSION_FEE = 25;       // gold to fuse two element towers into their combo
const MAX_TRIPLES = 3;       // cap on TRIPLE-element towers in play (adds difficulty; a future talent tree will let you raise tower power to compensate)
const tripleCount = () => G.towers.reduce((n, t) => n + (t.elems && t.elems.length === 3 ? 1 : 0), 0);
const WAVES_PER_LEVEL = 50;  // each campaign level is 50 waves
const CAMPAIGN_LEVELS = 10;  // level 1..10
const BETWEEN_TIME = 5;      // seconds between waves before the next auto-starts
const FIRST_PREP = 12;       // extra build time before the very first wave
const SOUL_EVERY = 5;        // earn 1 element soul every 5 waves cleared
const levelMult = (L) => Math.pow(1.06, L - 1); // each level a touch tougher (×1.65 HP by L10) — gentle, because every level starts you from scratch with no carry-over power, so 1.18 (×4.4 by L10) was unwinnable past L5
// ---- campaign progress (saved locally) ----
function loadCampaign() {
  try { return Object.assign({ unlocked: 1, completed: [], points: 0 }, JSON.parse(localStorage.getItem("eltd_campaign") || "{}")); }
  catch (e) { return { unlocked: 1, completed: [], points: 0 }; }
}
function saveCampaign(c) { try { localStorage.setItem("eltd_campaign", JSON.stringify(c)); } catch (e) {} }
let CAMPAIGN = (typeof localStorage !== "undefined") ? loadCampaign() : { unlocked: 1, completed: [], points: 0 };

/* ------------------------------------------------------------------ *
 *  GRID HELPERS (fixed-path map — no maze pathfinding)
 * ------------------------------------------------------------------ */
const inb = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
const cellCenter = (c, r) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
// A cell is buildable if in bounds, not on the creep path, and empty.
function buildable(c, r) { return inb(c, r) && !onPath(c, r) && !G.grid[r][c]; }

/* ------------------------------------------------------------------ *
 *  TOWERS
 * ------------------------------------------------------------------ */
// base (tier-1) stats for a tower, by element count: 1=pure, 2=dual, 3=triple
function baseStats(t) {
  if (t.elems.length === 3) return tripleStats(t.elems[0], t.elems[1], t.elems[2]);
  if (t.elems.length === 2) return comboStats(t.elems[0], t.elems[1]);
  return PURE[t.elems[0]];
}
function towerDef(t) { // returns scaled stats for current tier
  const def = tierScale(t.neutral ? NEUTRAL[t.base] : baseStats(t), t.tier, !t.neutral && t.elems.length > 1);
  if (t.base === "artillery") def.splash = Math.max(def.splash || 0, ARTILLERY_SPLASH); // artillery base = splash
  const m = dmgMult(); // permanent "Arcane Might" upgrade — applies in all modes
  if (m !== 1) { def.dmg = Math.round(def.dmg * m); if (def.dot) def.dot *= m; }
  return def;
}
const maxTier = () => 2; // every tower (base or infused) has levels 1..3 (tier index 0..2)
function canUpgrade(t) {
  if (t.tier >= 2) return false;
  if (t.neutral) return true; // base towers upgrade with gold only
  return t.elems.every((e) => G.elementLvl[e] >= t.tier + 1); // infused: ALL component elements at next level
}
function towerName(t) {
  if (t.neutral) return (NEUTRAL[t.base] && NEUTRAL[t.base].name) || STR.neutralName;
  if (t.elems.length === 3) return TRIPLE_NAMES[tripleKey(t.elems[0], t.elems[1], t.elems[2])];
  if (t.elems.length === 2) return COMBO_NAMES[comboKey(t.elems[0], t.elems[1])];
  return PURE_NAMES[t.elems[0]];
}
// infuse a neutral tower with an unlocked element -> becomes that element's tier-1 tower
const INFUSE_COST = (elem) => PURE[elem].cost; // infusing costs the element tower's price
function infuseTower(t, elem) {
  if (!t.neutral) return false;
  if (G.elementLvl[elem] < 1) { toast(STR.locked); SFX.deny(); return false; }
  const cost = INFUSE_COST(elem);
  if (G.gold < cost) { toast(STR.cantAfford); SFX.deny(); return false; }
  G.gold -= cost; t.invested += cost;
  t.neutral = false; t.combo = false; t.triple = false; t.elems = [elem];
  t.tier = Math.min(t.tier, G.elementLvl[elem] - 1); // keep base upgrades, capped by element level
  t.cd = 0; t.target = null;
  SFX.upgrade(); pulse(t.x, t.y, ELEMENT[elem].col); ring(t.x, t.y, CELL, ELEMENT[elem].col);
  return true;
}
function buildTower(c, r, def) {
  const cost = def.cost;
  if (onPath(c, r)) { toast(STR.cantBuildPath); SFX.deny(); return false; }
  if (G.grid[r][c]) { SFX.deny(); return false; }
  if (G.gold < cost) { toast(STR.cantAfford); SFX.deny(); return false; }
  const cen = cellCenter(c, r);
  const t = {
    c, r, x: cen.x, y: cen.y, combo: def.combo, elems: def.elems,
    tier: 0, invested: cost, cd: 0, target: null,
  };
  G.grid[r][c] = t; G.towers.push(t); G.gold -= cost;
  SFX.place();
  pulse(cen.x, cen.y, ELEMENT[def.elems[0]].col);
  return true;
}
// generic placement: spec = { neutral, base, elems, cost }
function placeTower(c, r, spec) {
  if (G.ltw) return ltPlaceTower(c, r, spec); // LTW lane: free maze build with anti-block check
  if (onPath(c, r)) { toast(STR.cantBuildPath); SFX.deny(); return false; }
  if (G.grid[r][c]) { SFX.deny(); return false; }
  if (G.gold < spec.cost) { toast(STR.cantAfford); SFX.deny(); return false; }
  const cen = cellCenter(c, r), elems = spec.elems || [];
  const t = {
    c, r, x: cen.x, y: cen.y, neutral: !!spec.neutral, base: spec.base || "arrow",
    combo: elems.length >= 2, triple: elems.length === 3, elems,
    tier: 0, invested: spec.cost, cd: 0, target: null,
  };
  G.grid[r][c] = t; G.towers.push(t); G.gold -= spec.cost;
  SFX.place(); pulse(cen.x, cen.y, t.neutral ? NEUTRAL[t.base].col : ELEMENT[elems[0]].col);
  return true;
}
function buildNeutral(c, r, base = "arrow") {
  return placeTower(c, r, { neutral: true, base, cost: NEUTRAL[base].cost });
}
function sellTower(t) {
  const refund = Math.round(t.invested * 0.7);
  G.gold += refund;
  G.grid[t.r][t.c] = null;
  G.towers.splice(G.towers.indexOf(t), 1);
  if (G.ltw) G.field = ltField();   // path opens back up when a maze piece is sold
  SFX.sell(); G.selected = null;
  toast("+" + refund + " " + STR.gold);
}
function upgradeTower(t) {
  if (!canUpgrade(t)) { toast(t.tier >= 2 ? STR.maxed : STR.needLvlAll + " " + (t.tier + 1)); SFX.deny(); return; }
  const cost = upgradeCost(t.neutral ? NEUTRAL[t.base].cost : baseStats(t).cost, t.tier + 1);
  if (G.gold < cost) { toast(STR.cantAfford); SFX.deny(); return; }
  G.gold -= cost; t.invested += cost; t.tier++; SFX.upgrade();
  pulse(t.x, t.y, "#ffe36b");
}
// --- fusion: pure+pure -> dual, dual+pure (3rd element) -> triple ---
function fuseElems(t1, t2) { // combined element list if a legal fuse, else null
  if (!t1 || !t2 || t1.neutral || t2.neutral) return null;
  if (t1.elems.length + t2.elems.length > 3) return null;       // no quads
  const set = new Set([...t1.elems, ...t2.elems]);
  if (set.size !== t1.elems.length + t2.elems.length) return null; // overlapping element
  return [...set]; // length 2 (dual) or 3 (triple)
}
function fusePartners(t) {
  if (!t || t.neutral || t.elems.length >= 3) return [];
  const capped = tripleCount() >= MAX_TRIPLES;
  return G.towers.filter((o) => {
    if (o === t) return false;
    const e = fuseElems(t, o);
    if (!e) return false;
    if (e.length === 3 && capped) return false; // can't make a 4th triple
    return true;
  });
}
function fuseTowers(a, b) {
  const elems = fuseElems(a, b);
  if (!elems) { SFX.deny(); return false; }
  if (elems.length === 3 && tripleCount() >= MAX_TRIPLES) { toast(`Max ${MAX_TRIPLES} triple towers`); SFX.deny(); return false; }
  if (G.gold < FUSION_FEE) { toast(STR.cantAfford); SFX.deny(); return false; }
  G.gold -= FUSION_FEE;
  a.elems = elems; a.combo = elems.length >= 2; a.triple = elems.length === 3;
  if (a.base === "artillery" || b.base === "artillery") a.base = "artillery"; // splash carries into the fusion
  a.neutral = false; a.tier = 0; a.cd = 0; a.target = null;
  a.invested = a.invested + b.invested + FUSION_FEE;
  G.grid[b.r][b.c] = null;
  G.towers.splice(G.towers.indexOf(b), 1);
  SFX.levelup(); pulse(a.x, a.y, "#ffe36b"); ring(a.x, a.y, CELL, ELEMENT[elems[elems.length - 1]].col);
  return true;
}

/* ------------------------------------------------------------------ *
 *  ELEMENT EFFECTIVENESS
 * ------------------------------------------------------------------ */
function effOf(elem, creepEl) {
  if (STRONG[elem] === creepEl) return 1.75;    // counter element — bonus damage
  if (STRONG[creepEl] === elem) return 0.3;     // creep is near-immune to this element
  return 1;
}
function towerEff(t, creepEl) {
  if (t.neutral) return 1; // neutral has no element affinity
  return Math.max(...t.elems.map((e) => effOf(e, creepEl))); // best of its 1-3 elements
}

/* ------------------------------------------------------------------ *
 *  UPDATE
 * ------------------------------------------------------------------ */
function update(dt) {
  if (G.phase === "lost" || G.phase === "won") return;
  const s = dt / 1000;
  G.time += s;

  // auto-start the next wave when the breather runs out
  if (G.phase === "between") {
    G.betweenTimer -= s;
    if (G.betweenTimer <= 0) startWave();
  }

  // spawning
  if (G.phase === "wave" && G.spawnQueue > 0) {
    G.spawnTimer -= s;
    if (G.spawnTimer <= 0) { spawnCreep(); G.spawnQueue--; G.spawnTimer = G.curWave.spawnGap; }
  }

  // creeps
  for (const cr of G.creeps) moveCreep(cr, s);

  // towers
  for (const t of G.towers) tickTower(t, s);

  // shots (homing magic projectiles with motion trails)
  for (const sh of G.shots) {
    if (!sh.target || sh.target.dead || sh.target.hp <= 0) { sh.dead = true; continue; }
    sh.trail.push({ x: sh.x, y: sh.y }); if (sh.trail.length > 6) sh.trail.shift();
    const dx = sh.target.x - sh.x, dy = sh.target.y - sh.y, d = Math.hypot(dx, dy);
    const step = (sh.elem === "light" ? 880 : sh.big ? 600 : 700) * s; // light zips, fusion orbs lumber
    if (d <= step) { sh.dead = true; hit(sh); }
    else { sh.x += (dx / d) * step; sh.y += (dy / d) * step; }
  }
  G.shots = G.shots.filter((x) => !x.dead);

  // fx
  for (const f of G.fx) f.t += s;
  G.fx = G.fx.filter((f) => f.t < f.dur);

  // cull dead creeps & award
  for (const cr of G.creeps) {
    if (cr.hp <= 0 && !cr.dead) {
      cr.dead = true;
      G.gold += cr.bounty + (cr.goldBonus || 0);
      burst(cr.x, cr.y, ELEMENT[cr.element].col);
    }
  }
  G.creeps = G.creeps.filter((cr) => !cr.dead && !cr.leaked);

  // wave end?
  if (G.phase === "wave" && G.spawnQueue === 0 && G.creeps.length === 0) endWave();
}

// deterministic per-wave monster appearance, so each wave looks like a distinct species
function waveLook(seed) {
  const rnd = mulberry32((Math.imul(seed, 2654435761) ^ 0x9e3779b9) >>> 0);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return {
    shape: pick(["round", "hex", "spiky", "tall", "squat"]),
    eyes: pick([1, 2, 2, 3]),
    horns: pick([0, 0, 1, 2]),       // 0 none, 1 top pair, 2 side
    spots: rnd() < 0.5,
    mouth: pick(["none", "grin", "fangs", "none"]),
  };
}
function spawnCreep() {
  const w = G.curWave;
  const start = PATH_PTS[0];
  const RAD = { normal: 13, fast: 13, swarm: 10, armored: 17, eliteboss: 19, bigboss: w.isLevelBoss ? 36 : 29 };
  const cr = {
    x: start.x, y: start.y, dist: 0, hp: w.hp, maxHp: w.hp, element: w.element,
    baseSpeed: w.speed * CELL, leak: w.leak, bounty: w.bounty,
    boss: w.isBoss, elite: w.isEliteBoss, bigboss: w.isBigBoss, levelBoss: w.isLevelBoss,
    kind: w.kind, slowT: 0, slowF: 1, ampT: 0, ampF: 1,
    dots: [], goldBonus: 0, dead: false, leaked: false, spin: 0,
    r: RAD[w.kind] || 13, look: waveLook(w.n),
  };
  G.creeps.push(cr);
}

function moveCreep(cr, s) {
  // status effects
  if (cr.slowT > 0) { cr.slowT -= s; if (cr.slowT <= 0) cr.slowF = 1; }
  if (cr.ampT > 0) { cr.ampT -= s; if (cr.ampT <= 0) cr.ampF = 1; }
  for (const d of cr.dots) { d.t -= s; cr.hp -= d.dps * s; }
  cr.dots = cr.dots.filter((d) => d.t > 0);

  // advance along the fixed serpentine path
  cr.dist += cr.baseSpeed * cr.slowF * s;
  const p = posAt(cr.dist); cr.x = p.x; cr.y = p.y;
  if (cr.dist >= PATH_LEN) { // reached the base
    cr.leaked = true; G.lives -= cr.leak; SFX.leak(); flashDanger();
    if (G.lives <= 0) { G.lives = 0; loseGame(); }
  }
}

function tickTower(t, s) {
  if (t.wall) return;          // maze walls don't attack
  t.cd -= s;
  const def = towerDef(t);
  const rangePx = def.range * CELL;
  // retarget: nearest creep in range
  let best = null, bestD = Infinity;
  for (const cr of G.creeps) {
    if (cr.dead || cr.leaked || cr.hp <= 0) continue;
    const d = Math.hypot(cr.x - t.x, cr.y - t.y);
    if (d <= rangePx && d < bestD) { bestD = d; best = cr; }
  }
  t.target = best;
  if (best && t.cd <= 0) {
    t.cd = 1 / def.rate;
    const cols = t.neutral ? [NEUTRAL[t.base].col] : t.elems.map((e) => ELEMENT[e].col);
    const glow = t.neutral ? NEUTRAL[t.base].glow : ELEMENT[t.elems[0]].glow;
    const n = t.neutral ? 0 : t.elems.length;
    const fy = t.y - 17; // fire from the crystal
    const arty = t.base === "artillery";
    G.shots.push({
      x: t.x, y: fy, target: best, def, tower: t, cols, glow,
      elem: t.neutral ? null : t.elems[0], big: n > 1 || arty, triple: n === 3, arty,
      r: arty ? 6 : t.neutral ? 3 : n === 3 ? 6 : n === 2 ? 5 : 4, trail: [],
    });
    G.fx.push({ type: "muzzle", x: t.x, y: fy, col: cols[0], t: 0, dur: 0.13 }); // muzzle flash
    SFX.shoot(t.neutral ? "earth" : t.elems[0]);
  }
}

function applyDamage(cr, raw, def, tower) {
  const eff = towerEff(tower, cr.element);
  let dmg = raw * eff * (cr.ampF || 1);
  cr.hp -= dmg;
  if (def.slow) { cr.slowF = Math.min(cr.slowF, 1 - def.slow); cr.slowT = Math.max(cr.slowT, def.slowDur); }
  if (def.dot) cr.dots.push({ dps: def.dot, t: def.dotDur });
  if (def.amp) { cr.ampF = Math.max(cr.ampF, 1 + def.amp); cr.ampT = Math.max(cr.ampT, def.ampDur); }
  if (def.gold && cr.hp <= 0) cr.goldBonus = (cr.goldBonus || 0) + def.gold;
}

function hit(sh) {
  const def = sh.def, t = sh.tower, col = sh.cols[0];
  spark(sh.x, sh.y, col);
  if (sh.big) { burst(sh.x, sh.y, col); if (sh.cols[1]) burst(sh.x, sh.y, sh.cols[1]); } // richer fusion impact
  if (def.splash) {
    const rad = def.splash * CELL;
    ring(sh.x, sh.y, rad, col);
    for (const cr of G.creeps) {
      if (cr.dead || cr.leaked) continue;
      if (Math.hypot(cr.x - sh.x, cr.y - sh.y) <= rad) applyDamage(cr, def.dmg, def, t);
    }
  } else if (sh.target && !sh.target.dead) {
    applyDamage(sh.target, def.dmg, def, t);
  }
}

/* ------------------------------------------------------------------ *
 *  WAVE FLOW / WIN-LOSE
 * ------------------------------------------------------------------ */
function beginGame() { // called when the player presses Play — starts the auto-wave clock
  if (G.started) return;
  G.started = true; G.phase = "between"; G.betweenTimer = FIRST_PREP;
  if (G.souls > 0) $("el-btn").classList.add("soul-ready"); // Soul Attunement head-start
  syncHUD();
}
function startWave() {
  if (G.phase === "wave" || G.phase === "won" || !G.started || G.phase === "lost") return;
  if (G.wave >= WAVES_PER_LEVEL) return; // level already done
  G.wave++;
  G.curWave = makeWave(G.wave);
  G.spawnQueue = G.curWave.count;
  G.spawnTimer = 0.2;
  G.phase = "wave";
  SFX.start();
  syncHUD();
}
function endWave() {
  const bonus = G.curWave.clearBonus;
  const interest = Math.min(400, Math.floor(G.gold * 0.02)); // small + capped: no snowballing gold mountain
  G.gold += bonus + interest;
  const gotSoul = (G.wave % SOUL_EVERY === 0); // every 5th wave grants 1 element soul, immediately
  if (gotSoul) { G.souls += 1; SFX.levelup(); $("el-btn").classList.add("soul-ready"); }
  // level cleared?
  if (G.curWave.isLevelBoss || G.wave >= WAVES_PER_LEVEL) { levelComplete(); return; }
  if (gotSoul) toast("✦ " + STR.soulEarned + "  ·  +" + bonus + " gold");
  else toast("+" + bonus + " clear  ·  +" + interest + " interest");
  G.phase = "between"; G.betweenTimer = BETWEEN_TIME; // auto-start next wave
  syncHUD();
}
function levelComplete() {
  if (G.phase === "won" || G.phase === "lost") return;   // idempotent: never fire twice
  G.phase = "won"; SFX.win();
  const L = G.campaignLevel, fullPts = 100 + L * 50;
  const firstClear = !CAMPAIGN.completed.includes(L);
  const award = firstClear ? fullPts : Math.round(fullPts * 0.25); // replays still pay 25% → grind upgrades
  if (firstClear) CAMPAIGN.completed.push(L);
  CAMPAIGN.points += award;
  CAMPAIGN.unlocked = Math.max(CAMPAIGN.unlocked, Math.min(CAMPAIGN_LEVELS, L + 1));
  saveCampaign(CAMPAIGN);
  // tie progression together: a first clear pays the meta economy (gold + a little aether)
  let reward = null;
  if (firstClear) {
    reward = { gold: 200 + L * 120, aether: 4 + L * 2 };
    metaAccrue(); META.gold += reward.gold; META.aether += reward.aether; saveMeta(); updateCurBars();
  }
  showLevelComplete(L, award, reward, firstClear);
}
function loseGame() {
  if (G.phase === "lost" || G.phase === "won") return;   // idempotent
  G.phase = "lost"; SFX.lose(); showOverlay("lost");
}

/* ------------------------------------------------------------------ *
 *  FX helpers
 * ------------------------------------------------------------------ */
function spark(x, y, col) { G.fx.push({ type: "spark", x, y, col, t: 0, dur: 0.25 }); }
function ring(x, y, rad, col) { G.fx.push({ type: "ring", x, y, rad, col, t: 0, dur: 0.3 }); }
function burst(x, y, col) { G.fx.push({ type: "burst", x, y, col, t: 0, dur: 0.4 }); }
function pulse(x, y, col) { G.fx.push({ type: "pulse", x, y, col, t: 0, dur: 0.4 }); }
let dangerFlash = 0;
function flashDanger() { dangerFlash = 1; }

/* ------------------------------------------------------------------ *
 *  RENDER
 * ------------------------------------------------------------------ */
const canvas = document.getElementById("c"), ctx = canvas.getContext("2d");
const bgImg = new Image(); let bgReady = false;
bgImg.onload = () => { bgReady = true; }; bgImg.src = "./assets/bg.png";
let view = { scale: 1, ox: 0, oy: 0 };

function resize() {
  // pin app height to the real viewport (Samsung Internet / older Android mishandle 100dvh)
  const app = document.getElementById("app");
  if (app) app.style.height = window.innerHeight + "px";
  const wrap = document.getElementById("stage");
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  const ww = curWorldW(), hh = curWorldH();
  const scale = Math.min(W / ww, H / hh);
  view.scale = scale;
  view.ox = (W - ww * scale) / 2;
  view.oy = (H - hh * scale) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
// current world size depends on the active mode (campaign spiral vs LTW lane)
function curWorldW() { return (typeof G !== "undefined" && G && G.ltw) ? LCOLS * CELL : WORLD_W; }
function curWorldH() { return (typeof G !== "undefined" && G && G.ltw) ? LROWS * CELL : WORLD_H; }
addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 120));

function worldFromEvent(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left - view.ox) / view.scale;
  const y = (clientY - rect.top - view.oy) / view.scale;
  return { x, y };
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function render() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  // backdrop fill
  ctx.fillStyle = "#10171b"; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(view.ox, view.oy); ctx.scale(view.scale, view.scale);

  // ground
  if (bgReady) { ctx.globalAlpha = 1; ctx.drawImage(bgImg, 0, 0, WORLD_W, WORLD_H); }
  else { ctx.fillStyle = "#2e5d3b"; ctx.fillRect(0, 0, WORLD_W, WORLD_H); }

  // grid
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.07)";
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, WORLD_H); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(WORLD_W, r * CELL); ctx.stroke(); }

  // the fixed serpentine path lane
  drawPath();

  // entrance / exit
  markCell(ENTRANCE, "#cf5b5b", "RIFT");
  markCell(EXIT, "#4fd1a6", "BASE");

  // build-cell highlight (hover on desktop)
  if (hoverCell && G.phase !== "lost" && !G.buildCell) {
    const ok = !onPath(hoverCell.c, hoverCell.r) && !G.grid[hoverCell.r][hoverCell.c];
    ctx.fillStyle = ok ? "rgba(255,255,255,0.14)" : "rgba(255,80,80,0.14)";
    ctx.fillRect(hoverCell.c * CELL, hoverCell.r * CELL, CELL, CELL);
  }
  // selected build cell (strong pulsing outline) while the build bar is open
  if (G.buildCell) {
    const bx = G.buildCell.c * CELL, by = G.buildCell.r * CELL;
    ctx.fillStyle = "rgba(122,79,214,0.22)"; ctx.fillRect(bx, by, CELL, CELL);
    ctx.lineWidth = 3; ctx.strokeStyle = "#b89cff"; ctx.setLineDash([6, 5]);
    ctx.strokeRect(bx + 2, by + 2, CELL - 4, CELL - 4); ctx.setLineDash([]);
  }

  // selected range
  if (G.selected) {
    const def = towerDef(G.selected);
    ctx.beginPath(); ctx.arc(G.selected.x, G.selected.y, def.range * CELL, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2; ctx.stroke();
  }

  for (const t of G.towers) drawTower(t);
  for (const cr of G.creeps) drawCreep(cr);
  for (const sh of G.shots) drawShot(sh);
  for (const f of G.fx) drawFx(f);

  // fusion mode: ring the source + dashed-ring every eligible partner
  if (G.fusing) {
    ctx.save();
    ctx.strokeStyle = "#ffe36b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(G.fusing.x, G.fusing.y, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([7, 7]); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.5;
    for (const o of fusePartners(G.fusing)) { ctx.beginPath(); ctx.arc(o.x, o.y, 29, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();

  if (dangerFlash > 0) {
    ctx.fillStyle = `rgba(220,40,40,${0.35 * dangerFlash})`;
    ctx.fillRect(0, 0, W, H);
    dangerFlash = Math.max(0, dangerFlash - 0.05);
  }
}

function strokePath() {
  ctx.beginPath();
  PATH_PTS.forEach((p, i) => { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
  ctx.stroke();
}
function drawPath() {
  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(35,26,15,0.45)"; ctx.lineWidth = CELL * 0.84; strokePath(); // soft shadow
  ctx.strokeStyle = "#c2a062"; ctx.lineWidth = CELL * 0.66; strokePath();             // dirt lane
  ctx.strokeStyle = "#d9bd83"; ctx.lineWidth = CELL * 0.40; strokePath();             // lighter center
  // dashed direction line
  ctx.setLineDash([10, 14]); ctx.strokeStyle = "rgba(80,55,25,0.35)"; ctx.lineWidth = 3; strokePath();
  ctx.setLineDash([]);
  ctx.restore();
}
function markCell(cell, col, label) {
  const x = cell.c * CELL, y = cell.r * CELL;
  ctx.fillStyle = col + "55"; ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, x + CELL / 2, y + CELL / 2);
}

function gemGradient(x, y, rad, c1, c2) {
  const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, c1);
  g.addColorStop(1, c2 || c1);
  return g;
}
// a chunky stacked-stone maze block
function drawWall(x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath(); ctx.ellipse(x + 2, y + 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  const w = 26, h = 30, lx = x - w / 2, ty = y - 16;
  const g = ctx.createLinearGradient(lx, 0, lx + w, 0);
  g.addColorStop(0, "#9a9082"); g.addColorStop(0.5, "#7d7264"); g.addColorStop(1, "#574e44");
  ctx.fillStyle = g; ctx.strokeStyle = "#3b352d"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(lx, ty, w, h); ctx.fill(); ctx.stroke();
  // brick seams
  ctx.strokeStyle = "rgba(40,36,30,0.65)"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(lx, ty + h / 3); ctx.lineTo(lx + w, ty + h / 3);
  ctx.moveTo(lx, ty + 2 * h / 3); ctx.lineTo(lx + w, ty + 2 * h / 3);
  ctx.moveTo(x, ty); ctx.lineTo(x, ty + h / 3);
  ctx.moveTo(lx + w / 4, ty + h / 3); ctx.lineTo(lx + w / 4, ty + 2 * h / 3);
  ctx.moveTo(lx + 3 * w / 4, ty + h / 3); ctx.lineTo(lx + 3 * w / 4, ty + 2 * h / 3);
  ctx.moveTo(x, ty + 2 * h / 3); ctx.lineTo(x, ty + h);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(lx, ty, w, 3); // top highlight
  ctx.restore();
}
function drawTower(t) {
  const x = t.x, y = t.y;
  if (t.wall) { drawWall(x, y); return; }
  // grounding shadow (pseudo-3D depth)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath(); ctx.ellipse(x + 3, y + 23, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // shared stone turret base — grander per upgrade level
  const tier = t.tier;
  drawTurret(x, y, tier);
  if (t.neutral) { // grey base towers: Arrow (bow) or Artillery (cannon) — design changes per level
    if (t.base === "artillery") drawCannonTop(x, y, tier); else drawArcherTop(x, y, tier);
  } else {
    if (t.base === "artillery") drawCannonBarrel(x, y - 4, 0.7 + tier * 0.06); // splash indicator under the crystal
    drawCrystalTop(x, y - 17, t.elems.map((k) => ELEMENT[k]), tier);
  }
  // tier pips
  const pips = t.tier + 1;
  for (let i = 0; i < pips; i++) {
    ctx.fillStyle = "#fff7d6";
    ctx.beginPath(); ctx.arc(x - 8 + i * 8, y + 27, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}
// a stone turret with cylindrical shading + crenellated top; grows + gains metal trim per tier
function drawTurret(x, y, tier = 0) {
  const bw = 19 + tier, tw = 16 + tier, top = y - 2 - tier * 2, bot = y + 23;
  const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
  g.addColorStop(0, "#9aa3af"); g.addColorStop(0.45, "#737c88"); g.addColorStop(1, "#4d545e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - bw, bot); ctx.lineTo(x - tw, top); ctx.lineTo(x + tw, top); ctx.lineTo(x + bw, bot);
  ctx.closePath(); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = "#2b313a"; ctx.stroke();
  // stone courses
  ctx.strokeStyle = "rgba(40,46,54,0.45)"; ctx.lineWidth = 1.3;
  for (const ry of [y + 13, y + 5]) {
    const f = (ry - top) / (bot - top), w = tw + (bw - tw) * f;
    ctx.beginPath(); ctx.moveTo(x - w, ry); ctx.lineTo(x + w, ry); ctx.stroke();
  }
  // battlements (merlons) — bronze at Lv2, gold at Lv3
  const merlonCol = tier >= 2 ? "#e0b94a" : tier >= 1 ? "#b08a4a" : "#838d99";
  for (const mx of [-tw, -3, tw - 6]) {
    ctx.fillStyle = merlonCol; ctx.fillRect(x + mx, top - 7, 6, 9);
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#2b313a"; ctx.strokeRect(x + mx, top - 7, 6, 9);
  }
}
// archer atop the turret — bigger bow, more fanned arrows and golden gear per level
function drawArcherTop(x, y, tier = 0) {
  const s = 1 + tier * 0.2, ax = x - 2, ay = y - 12 - tier * 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.fillStyle = tier >= 2 ? "#6a5424" : "#3a4250";              // armored at Lv3
  ctx.beginPath(); ctx.arc(ax - 9 * s, ay, 4.2 * s, 0, Math.PI * 2); ctx.fill();        // head
  ctx.beginPath(); ctx.ellipse(ax - 9 * s, ay + 8 * s, 6 * s, 5 * s, 0, Math.PI, 0); ctx.fill(); // shoulders
  ctx.strokeStyle = tier >= 2 ? "#e0b94a" : tier >= 1 ? "#9a7a3a" : "#7a5326"; ctx.lineWidth = 3 * s; // bow
  ctx.beginPath(); ctx.arc(ax, ay, 11 * s, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
  const a0 = -Math.PI / 2.2, a1 = Math.PI / 2.2;
  ctx.strokeStyle = "#e3dccd"; ctx.lineWidth = 1.2;               // string
  ctx.beginPath(); ctx.moveTo(ax + 11 * s * Math.cos(a0), ay + 11 * s * Math.sin(a0)); ctx.lineTo(ax + 11 * s * Math.cos(a1), ay + 11 * s * Math.sin(a1)); ctx.stroke();
  const arrows = 1 + tier;                                        // 1 / 2 / 3 fanned arrows
  for (let k = 0; k < arrows; k++) {
    const oy = (k - (arrows - 1) / 2) * 4.5 * s;
    ctx.strokeStyle = "#d3dbe3"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(ax - 4, ay + oy); ctx.lineTo(ax + 15 * s, ay + oy); ctx.stroke();
    ctx.fillStyle = "#f3f7fb";
    ctx.beginPath(); ctx.moveTo(ax + 19 * s, ay + oy); ctx.lineTo(ax + 13 * s, ay + oy - 4); ctx.lineTo(ax + 13 * s, ay + oy + 4); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// a stubby cannon/mortar barrel angled up-right (the Artillery splash signature)
function drawCannonBarrel(x, y, s) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-Math.PI / 5); ctx.scale(s, s);
  ctx.fillStyle = "#3a4250";
  roundRect(-5, -16, 10, 20, 4); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = "#20262e"; ctx.stroke();
  ctx.fillStyle = "#20262e"; ctx.beginPath(); ctx.ellipse(0, -15, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill(); // muzzle
  ctx.restore();
}
// cannon atop the turret — bigger, banded, and double-barrelled at Lv3
function drawCannonTop(x, y, tier = 0) {
  const s = 1 + tier * 0.18, yy = y - 8 - tier * 2;
  ctx.fillStyle = tier >= 2 ? "#4a3d22" : "#2b313a"; ctx.beginPath(); ctx.arc(x, yy + 2, (7 + tier) , 0, Math.PI * 2); ctx.fill(); // mount
  if (tier >= 2) { drawCannonBarrel(x - 5, yy, s); drawCannonBarrel(x + 5, yy, s); } // twin barrels at Lv3
  else drawCannonBarrel(x, yy, s);
  ctx.fillStyle = "#1b1f25"; ctx.beginPath(); ctx.arc(x - 6, yy + 3, 3.5 + tier * 0.6, 0, Math.PI * 2); ctx.fill(); // loaded ball
}
// glowing elemental crystal striped by its 1-3 elements; bigger + orbited by shards per level
function drawCrystalTop(x, y, els, tier = 0) {
  const rad = 13 + tier * 2.5, n = els.length;
  ctx.save();
  ctx.shadowColor = els[0].glow; ctx.shadowBlur = 14 + tier * 5;
  ctx.save();
  roundRect(x - rad, y - rad, rad * 2, rad * 2, 7); ctx.clip();
  const sw = (rad * 2) / n;
  for (let i = 0; i < n; i++) {
    const x0 = x - rad + i * sw;
    ctx.fillStyle = gemGradient(x0 + sw / 2, y, rad, els[i].col, els[i].glow);
    ctx.fillRect(x0, y - rad, sw + 0.6, rad * 2);
  }
  ctx.restore();
  ctx.lineWidth = 2.5; ctx.strokeStyle = tier >= 2 ? "#e0b94a" : "#1b1f25"; roundRect(x - rad, y - rad, rad * 2, rad * 2, 7); ctx.stroke();
  // orbiting shards (1 at Lv2, 2 at Lv3)
  for (let k = 0; k < tier; k++) {
    const a = G.time * 2.2 + (k * Math.PI * 2) / Math.max(1, tier), px = x + Math.cos(a) * (rad + 7), py = y + Math.sin(a) * (rad + 7);
    ctx.fillStyle = els[k % n].col;
    ctx.beginPath(); ctx.moveTo(px, py - 3.5); ctx.lineTo(px + 2.6, py); ctx.lineTo(px, py + 3.5); ctx.lineTo(px - 2.6, py); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// body silhouette per wave-look shape
function creepBody(x, y, rad, shape) {
  ctx.beginPath();
  if (shape === "hex") {
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else if (shape === "spiky") {
    const n = 9; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? rad * 0.74 : rad, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else if (shape === "tall") {
    ctx.ellipse(x, y, rad * 0.82, rad * 1.12, 0, 0, Math.PI * 2);
  } else if (shape === "squat") {
    ctx.ellipse(x, y, rad * 1.15, rad * 0.8, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(x, y, rad, 0, Math.PI * 2);
  }
}
function drawCreep(cr) {
  const x = cr.x, y = cr.y, rad = cr.r;
  const e = ELEMENT[cr.element];
  ctx.save();
  // rotating elemental aura ring around big bosses
  if (cr.bigboss) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(G.time * 1.1);
    ctx.globalAlpha = 0.55; ctx.strokeStyle = e.glow; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(0, 0, rad + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (cr.boss) { ctx.shadowColor = e.glow; ctx.shadowBlur = cr.bigboss ? 26 : 18; }
  // spikes for elites + bosses (distinct, menacing silhouette)
  if (cr.elite || cr.bigboss) {
    const spikes = cr.bigboss ? 12 : 8, r0 = rad * 0.9, r1 = rad * (cr.bigboss ? 1.35 : 1.28), wsp = 0.17;
    ctx.fillStyle = cr.bigboss ? "#2a2f37" : "#3a4250";
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - wsp) * r0, y + Math.sin(a - wsp) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.lineTo(x + Math.cos(a + wsp) * r0, y + Math.sin(a + wsp) * r0);
      ctx.closePath(); ctx.fill();
    }
  }
  // body — shape varies per wave; darker the tougher it is
  const L = cr.look || { shape: "round", eyes: 2, horns: 0, spots: false, mouth: "none" };
  const top = cr.bigboss ? "#7a818c" : cr.elite ? "#9aa0aa" : "#b8c0cc";
  const bot = cr.bigboss ? "#31353c" : cr.elite ? "#525a66" : "#6b7480";
  const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.4, rad * 0.2, x, y, rad);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; creepBody(x, y, rad, L.shape); ctx.fill();
  ctx.lineWidth = cr.boss ? 4.5 : 3.5; ctx.strokeStyle = e.col; creepBody(x, y, rad, L.shape); ctx.stroke();
  // small horns (per-wave variety, non-boss)
  if (!cr.bigboss && L.horns) {
    ctx.fillStyle = "#2b313a";
    if (L.horns === 1) { // top pair
      for (const dx of [-rad * 0.45, rad * 0.45]) { ctx.beginPath();
        ctx.moveTo(x + dx - 3, y - rad * 0.8); ctx.lineTo(x + dx, y - rad * 1.25); ctx.lineTo(x + dx + 3, y - rad * 0.8); ctx.closePath(); ctx.fill(); }
    } else { // side
      for (const s of [-1, 1]) { ctx.beginPath();
        ctx.moveTo(x + s * rad * 0.85, y - rad * 0.15); ctx.lineTo(x + s * rad * 1.3, y); ctx.lineTo(x + s * rad * 0.85, y + rad * 0.22); ctx.closePath(); ctx.fill(); }
    }
  }
  // crown of element-colored horns for big bosses
  if (cr.bigboss) {
    ctx.fillStyle = e.col; const cy = y - rad * 0.92;
    for (const dx of [-rad * 0.55, 0, rad * 0.55]) { ctx.beginPath();
      ctx.moveTo(x + dx - 5, cy + 4); ctx.lineTo(x + dx, cy - (dx === 0 ? rad * 0.5 : rad * 0.32)); ctx.lineTo(x + dx + 5, cy + 4); ctx.closePath(); ctx.fill(); }
  }
  // spots
  if (L.spots) {
    ctx.fillStyle = "rgba(40,46,54,0.5)";
    for (const sp of [[-0.4, 0.25], [0.35, 0.35], [0.05, -0.35]]) { ctx.beginPath(); ctx.arc(x + sp[0] * rad, y + sp[1] * rad, rad * 0.14, 0, Math.PI * 2); ctx.fill(); }
  }
  // eyes (glowing red for bosses; count per wave-look, always 3 for big boss)
  ctx.fillStyle = cr.boss ? "#ff3b3b" : "#20262e";
  const eyeN = cr.bigboss ? 3 : L.eyes, es = rad * (eyeN === 3 ? 0.13 : 0.16), ey = y - rad * 0.08;
  if (eyeN === 1) { ctx.beginPath(); ctx.arc(x, ey, es, 0, Math.PI * 2); ctx.fill(); }
  else if (eyeN === 2) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * rad * 0.32, ey, es, 0, Math.PI * 2); ctx.fill(); } }
  else { ctx.beginPath(); ctx.arc(x - rad * 0.35, ey, es, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(x + rad * 0.35, ey, es, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(x, ey - rad * 0.3, es, 0, Math.PI * 2); ctx.fill(); }
  // mouth
  if (L.mouth === "grin") { ctx.strokeStyle = "#20262e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + rad * 0.22, rad * 0.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  else if (L.mouth === "fangs") { ctx.fillStyle = "#eef2f6"; for (const s of [-1, 0, 1]) { const mx = x + s * rad * 0.25; ctx.beginPath(); ctx.moveTo(mx - 2, y + rad * 0.33); ctx.lineTo(mx, y + rad * 0.58); ctx.lineTo(mx + 2, y + rad * 0.33); ctx.closePath(); ctx.fill(); } }
  ctx.restore();
  // status tints
  if (cr.slowF < 1) { ctx.fillStyle = "rgba(80,200,255,0.28)"; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
  if (cr.dots.length) { ctx.fillStyle = "rgba(70,196,106,0.22)"; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
  // hp bar
  const w = Math.max(rad * 2, 22), pct = Math.max(0, cr.hp / cr.maxHp), barY = y - rad - (cr.bigboss ? 17 : 9), bh = cr.bigboss ? 6 : 5;
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - w / 2, barY, w, bh);
  ctx.fillStyle = pct > 0.5 ? "#5fd36a" : pct > 0.25 ? "#ffc83d" : "#ff5b5b";
  ctx.fillRect(x - w / 2, barY, w * pct, bh);
  // label
  ctx.textAlign = "center";
  if (cr.bigboss) { ctx.fillStyle = e.col; ctx.font = "bold 11px system-ui"; ctx.fillText(cr.levelBoss ? "★ BOSS ★" : "BOSS", x, barY - 6); }
  else if (cr.elite) { ctx.fillStyle = "#ffd2d2"; ctx.font = "bold 8px system-ui"; ctx.fillText("ELITE", x, barY - 5); }
}
function drawShot(sh) {
  ctx.save();
  ctx.lineCap = "round";
  // fading motion trail, cycling through the tower's element colours
  for (let i = 1; i < sh.trail.length; i++) {
    const a = sh.trail[i - 1], b = sh.trail[i], f = i / sh.trail.length;
    ctx.globalAlpha = f * 0.55; ctx.strokeStyle = sh.cols[i % sh.cols.length];
    ctx.lineWidth = sh.r * 1.5 * f; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // glowing head
  ctx.shadowColor = sh.glow; ctx.shadowBlur = sh.big ? 18 : 11;
  if (sh.big) { // fusion: concentric element rings + bright core (+ orbiting sparks for triples)
    for (let i = sh.cols.length - 1; i >= 0; i--) {
      ctx.fillStyle = sh.cols[i];
      ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r + i * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    if (sh.triple) {
      ctx.fillStyle = "#fff";
      for (let k = 0; k < 4; k++) { const a = G.time * 9 + k * Math.PI / 2;
        ctx.beginPath(); ctx.arc(sh.x + Math.cos(a) * (sh.r + 3), sh.y + Math.sin(a) * (sh.r + 3), 1.7, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r * 0.5, 0, Math.PI * 2); ctx.fill();
  } else { // single element: colored orb + white core
    ctx.fillStyle = sh.cols[0]; ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawFx(f) {
  const k = f.t / f.dur;
  ctx.save();
  if (f.type === "spark") {
    ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; ctx.shadowColor = f.col; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(f.x, f.y, 6 + k * 8, 0, Math.PI * 2); ctx.fill();
  } else if (f.type === "ring") {
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.rad * k, 0, Math.PI * 2); ctx.stroke();
  } else if (f.type === "burst") {
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * k * 22, f.y + Math.sin(a) * k * 22, 3 * (1 - k), 0, Math.PI * 2); ctx.fill(); }
  } else if (f.type === "pulse") {
    ctx.globalAlpha = 0.6 * (1 - k); ctx.strokeStyle = f.col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y, 20 + k * 30, 0, Math.PI * 2); ctx.stroke();
  } else if (f.type === "muzzle") {
    ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; ctx.shadowColor = f.col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(f.x, f.y, 3 + k * 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 *  DOM UI
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
function syncHUD() {
  $("hud-lives").textContent = G.lives;
  $("hud-gold").textContent = G.gold;
  const shownWave = G.phase === "wave" ? G.wave : Math.min(WAVES_PER_LEVEL, G.wave + 1);
  $("hud-wave").textContent = "L" + G.campaignLevel + "·" + shownWave + "/" + WAVES_PER_LEVEL;
  $("hud-points").textContent = G.souls;
  $("speed-btn").textContent = (G.speed || 1) + "×";
  updateStartBtn();
  updateForecast();
}
// strip of the next several waves with their element (so the player can plan counters)
function updateForecast() {
  const fc = $("forecast");
  if (!G.started || G.phase === "lost" || G.phase === "won") { fc.style.display = "none"; return; }
  fc.style.display = "flex";
  const start = G.phase === "wave" ? G.wave : G.wave + 1;
  let html = "";
  for (let k = 0; k < 6; k++) {
    const i = start + k; if (i > WAVES_PER_LEVEL) break; // don't forecast past the level
    const w = makeWave(i), e = ELEMENT[w.element];
    const cls = "fw" + (k === 0 ? " next" : "") + (w.isBoss ? " boss" : "");
    const label = w.isBigBoss ? "BOSS" : w.isEliteBoss ? "ELITE" : ("w" + i);
    html += `<div class="${cls}"><span class="fn">${label}</span><span class="fe" style="filter:drop-shadow(0 0 3px ${e.glow})">${e.sym}</span></div>`;
  }
  fc.innerHTML = html;
}
function updateStartBtn() {
  const btn = $("start-btn");
  if (!G.started) { btn.disabled = true; btn.textContent = STR.play; return; }
  if (G.phase === "wave") { btn.disabled = true; btn.innerHTML = STR.waveIn + " " + G.wave + "…"; return; }
  if (G.phase === "lost" || G.phase === "won") { btn.disabled = true; btn.textContent = "—"; return; }
  // between: show next wave element + countdown, tap to start now
  const nw = makeWave(G.wave + 1);
  const secs = Math.max(0, Math.ceil(G.betweenTimer));
  btn.disabled = false;
  btn.innerHTML = `${STR.startNow} <span class="wel" style="color:${ELEMENT[nw.element].col}">${ELEMENT[nw.element].sym}${nw.isBoss ? "★" : ""} · ${secs}s</span>`;
}
let toastT = null;
function toast(msg) {
  const el = $("toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 1800);
}

// ---- bottom build bar: tap a cell, then pick a tower from the strip ----
function buildOptions() {
  const opts = [];
  if (G.ltw) // cheap, non-attacking maze block — the LTW way to shape the path fast & sell back later
    opts.push({ sym: "🧱", name: "Stone Wall", col: "#b7a98f", cost: 8, fx: "maze · no attack", spec: { wall: true, base: "wall", cost: 8 } });
  opts.push(
    { sym: NEUTRAL.arrow.sym, name: NEUTRAL.arrow.name, col: NEUTRAL.arrow.col, cost: NEUTRAL.arrow.cost, fx: STR.singleDesc, spec: { neutral: true, base: "arrow", cost: NEUTRAL.arrow.cost } },
    { sym: NEUTRAL.artillery.sym, name: NEUTRAL.artillery.name, col: NEUTRAL.artillery.col, cost: NEUTRAL.artillery.cost, fx: STR.splashDesc, spec: { neutral: true, base: "artillery", cost: NEUTRAL.artillery.cost } },
  );
  for (const e of EL) if (G.elementLvl[e] >= 1) { // element towers appear once you've unlocked the element
    opts.push({ sym: ELEMENT[e].sym, name: PURE_NAMES[e], col: ELEMENT[e].col, cost: PURE[e].cost, fx: pureFx(e), spec: { base: "arrow", elems: [e], cost: PURE[e].cost } });
  }
  return opts;
}
function pureFx(e) {
  const p = PURE[e], b = [];
  if (p.splash) b.push("splash"); if (p.slow) b.push("slow"); if (p.dot) b.push("burn"); if (p.gold) b.push("+gold"); if (p.amp) b.push("curse");
  return b.join(" ") || "single";
}
function selectBuildCell(c, r) {
  G.buildCell = { c, r };
  const bar = $("build-bar"); bar.innerHTML = "";
  for (const o of buildOptions()) {
    const card = document.createElement("button");
    card.className = "tcard" + (G.gold < o.cost ? " poor" : "");
    card.innerHTML = `<span class="ic">${o.sym}</span><span class="nm" style="border-color:${o.col}">${o.name}</span>` +
      `<span class="fxn">${o.fx}</span><span class="ct">🪙 ${o.cost}</span>`;
    card.onclick = () => { if (placeTower(G.buildCell.c, G.buildCell.r, o.spec)) { closeBuildBar(); syncHUD(); } };
    bar.appendChild(card);
  }
  bar.classList.add("show");
}
function closeBuildBar() { G.buildCell = null; const b = $("build-bar"); if (b) b.classList.remove("show"); }
function pureDesc(e) {
  const p = PURE[e];
  const bits = [];
  if (p.slow) bits.push("slows");
  if (p.dot) bits.push("poison");
  if (p.splash) bits.push("splash");
  if (p.gold) bits.push("+gold");
  if (p.amp) bits.push("curse");
  if (e === "fire") bits.push("high dps");
  if (e === "darkness") bits.push("heavy hit");
  if (e === "light") bits.push("rapid");
  return `${ELEMENT[e].name} · ${bits.join(", ")} · ${STR.strongVs} ${ELEMENT[STRONG[e]].name}`;
}
function comboDesc(a, b) {
  const cs = comboStats(a, b); const bits = [];
  if (cs.slow) bits.push("slows"); if (cs.dot) bits.push("poison"); if (cs.splash) bits.push("splash");
  if (cs.gold) bits.push("+gold"); if (cs.amp) bits.push("curse");
  return `${ELEMENT[a].name}+${ELEMENT[b].name} · ${bits.join(", ") || "power"}`;
}
function addSection(parent, label) { const h = document.createElement("div"); h.className = "sec"; h.textContent = label; parent.appendChild(h); }
function addBuildCard(parent, o) {
  const card = document.createElement("button");
  card.className = "card" + (o.locked ? " locked" : "") + (G.gold < o.cost && !o.locked ? " poor" : "");
  const swatch = o.col2
    ? `<span class="sw" style="background:linear-gradient(135deg,${o.col} 50%,${o.col2} 50%)"></span>`
    : `<span class="sw" style="background:${o.col}"></span>`;
  card.innerHTML = `${swatch}<span class="cbody"><b>${o.name}</b><small>${o.desc}</small></span>` +
    `<span class="cost">${o.locked ? "🔒" : "🪙 " + o.cost}</span>`;
  card.onclick = () => { if (o.locked) { toast(o.lockMsg || STR.locked); SFX.deny(); return; } o.onPick(); };
  parent.appendChild(card);
}

// ---- tower panel (tap existing tower) ----
function openTower(t) {
  G.selected = t;
  if (t.wall) { // maze wall: just a sell action
    $("tw-title").innerHTML = `🧱 Stone Wall <small>maze block · no attack</small>`;
    $("tw-stats").innerHTML = `<span>A cheap block to shape your maze. Sell it back anytime.</span>`;
    $("tw-infuse").innerHTML = ""; $("tw-fuseinto").style.display = "none";
    $("tw-fuse").style.display = "none"; $("tw-up").style.display = "none";
    $("tw-sell").innerHTML = `${STR.sell} · 🪙 ${Math.round(t.invested * 0.7)}`;
    $("tw-sell").onclick = () => { sellTower(t); closePopups(); syncHUD(); };
    showPopup("tower-popup");
    return;
  }
  const def = towerDef(t);
  const up = $("tw-up"), fuse = $("tw-fuse"), inf = $("tw-infuse");
  // common stat line
  const statLine = `<span>${STR.dmg}: <b>${def.dmg}</b></span><span>${STR.range}: <b>${def.range.toFixed(1)}</b></span><span>${STR.rate}: <b>${def.rate.toFixed(1)}</b></span>`;

  if (t.neutral) {
    const nb = NEUTRAL[t.base];
    $("tw-title").innerHTML = `${nb.sym} ${nb.name} <small>${STR.lvl} ${t.tier + 1}/3 · ${t.base === "artillery" ? STR.splashDesc : STR.singleDesc}</small>`;
    $("tw-stats").innerHTML = statLine + (t.base === "artillery" ? `<span>FX: <b>splash</b></span>` : "");
    fuse.style.display = "none"; inf.style.display = ""; $("tw-fuseinto").style.display = "none";
    up.style.display = ""; // base towers upgrade with gold (no element needed)
    if (t.tier >= 2) { up.disabled = true; up.textContent = STR.maxed; }
    else { const uc = upgradeCost(nb.cost, t.tier + 1); up.disabled = false; up.innerHTML = `${STR.upgrade} · 🪙 ${uc}`; up.onclick = () => { upgradeTower(t); openTower(t); syncHUD(); }; }
    inf.innerHTML = "";
    const owned = EL.filter((e) => G.elementLvl[e] >= 1);
    const lbl = document.createElement("div"); lbl.className = "sec"; lbl.textContent = STR.orInfuse; inf.appendChild(lbl);
    if (!owned.length) {
      const h = document.createElement("div"); h.className = "hint"; h.textContent = STR.noElements; inf.appendChild(h);
    } else {
      const grid = document.createElement("div"); grid.className = "infuse-grid";
      for (const e of owned) {
        const b = document.createElement("button"); b.className = "infbtn"; b.style.borderColor = ELEMENT[e].col;
        b.innerHTML = `<span class="sw" style="background:${ELEMENT[e].col}"></span>${ELEMENT[e].sym} ${PURE_NAMES[e]}${t.base === "artillery" ? " 💥" : ""} <small>🪙${PURE[e].cost}</small>`;
        b.onclick = () => { if (infuseTower(t, e)) { closePopups(); syncHUD(); } };
        grid.appendChild(b);
      }
      inf.appendChild(grid);
    }
  } else {
    inf.style.display = "none"; up.style.display = "";
    const syms = t.elems.map((e) => ELEMENT[e].sym).join("");
    const tierLabel = `${STR.lvl} ${t.tier + 1}/3`;
    $("tw-title").innerHTML = `${syms} ${towerName(t)} <small>${tierLabel}</small>`;
    const fx = [];
    if (def.slow) fx.push("slow"); if (def.dot) fx.push("poison " + Math.round(def.dot) + "/s");
    if (def.splash) fx.push("splash"); if (def.gold) fx.push("+gold"); if (def.amp) fx.push("curse");
    $("tw-stats").innerHTML = statLine + (fx.length ? `<span>FX: <b>${fx.join(", ")}</b></span>` : "");
    if (t.tier >= 2) { up.disabled = true; up.textContent = STR.maxed; }
    else if (!canUpgrade(t)) { up.disabled = true; up.textContent = `${STR.needLvlAll} ${t.tier + 1}`; }
    else {
      const cost = upgradeCost(baseStats(t).cost, t.tier + 1);
      up.disabled = false; up.innerHTML = `${STR.upgrade} · 🪙 ${cost}`;
      up.onclick = () => { upgradeTower(t); openTower(t); syncHUD(); };
    }
    // fusion: pure -> dual, dual -> triple (max 3 elements)
    const fi = $("tw-fuseinto");
    if (t.elems.length >= 3) { fuse.style.display = "none"; fi.style.display = "none"; }
    else {
      fuse.style.display = "";
      const partners = fusePartners(t);
      const label = t.elems.length === 1 ? STR.fuse : STR.fuseTriple;
      const triplesCapped = t.elems.length === 2 && tripleCount() >= MAX_TRIPLES;
      if (triplesCapped) { fuse.disabled = true; fuse.textContent = `⚠ Max ${MAX_TRIPLES} triple towers`; }
      else if (!partners.length) { fuse.disabled = true; fuse.textContent = STR.fuseNone; }
      else { fuse.disabled = false; fuse.innerHTML = `${label} · 🪙 ${FUSION_FEE}`; fuse.onclick = () => startFusion(t); }
      // toolbar: what this tower can fuse INTO (✓ = you have a partner tower to do it now)
      fi.style.display = ""; fi.innerHTML = "";
      const lbl = document.createElement("div"); lbl.className = "sec";
      lbl.textContent = STR.fusesInto + (t.elems.length === 2 ? ` · ${tripleCount()}/${MAX_TRIPLES} triples` : "");
      fi.appendChild(lbl);
      const chips = document.createElement("div"); chips.className = "fuse-chips";
      for (const e of EL) {
        if (t.elems.includes(e)) continue;
        const result = [...t.elems, e];
        const name = result.length === 2 ? COMBO_NAMES[comboKey(result[0], result[1])] : TRIPLE_NAMES[tripleKey(result[0], result[1], result[2])];
        const ready = G.towers.some((o) => o !== t && !o.neutral && o.elems.length === 1 && o.elems[0] === e);
        const chip = document.createElement("div"); chip.className = "fchip" + (ready ? " ready" : "");
        chip.innerHTML = `<span>${result.map((x) => ELEMENT[x].sym).join("")}</span><b>${name}</b>`;
        chip.title = ready ? STR.fuseReadyTip : STR.fuseNeedTip + " " + PURE_NAMES[e];
        chips.appendChild(chip);
      }
      fi.appendChild(chips);
    }
  }
  $("tw-sell").innerHTML = `${STR.sell} · 🪙 ${Math.round(t.invested * 0.7)}`;
  $("tw-sell").onclick = () => { sellTower(t); closePopups(); syncHUD(); };
  showPopup("tower-popup");
}
function startFusion(t) { G.fusing = t; closePopups(); $("fuse-bar").classList.add("show"); toast(STR.fuseHint); }
function cancelFusion() { G.fusing = null; $("fuse-bar").classList.remove("show"); }
function handleFuseTap(cell) {
  const src = G.fusing, t2 = cell && G.grid[cell.r][cell.c];
  if (t2 && t2 !== src && fuseElems(src, t2)) {
    if (fuseTowers(src, t2)) toast(STR.fused + " " + towerName(src));
  } else if (t2 && t2 !== src) {
    toast(STR.fuseBad); SFX.deny();
  }
  cancelFusion(); syncHUD();
}

// ---- element panel ----
function openElements() {
  const list = $("el-list"); list.innerHTML = "";
  for (const e of EL) {
    const lvl = G.elementLvl[e];
    const row = document.createElement("div"); row.className = "elrow";
    row.innerHTML =
      `<span class="sw" style="background:${ELEMENT[e].col}"></span>` +
      `<span class="elname"><b>${ELEMENT[e].sym} ${ELEMENT[e].name}</b><small>${STR.strongVs} ${ELEMENT[STRONG[e]].name}</small></span>` +
      `<span class="ellvl">${"●".repeat(lvl)}${"○".repeat(3 - lvl)}</span>`;
    const btn = document.createElement("button");
    btn.className = "elup"; btn.textContent = lvl >= 3 ? STR.maxed : "✦ " + (lvl === 0 ? STR.unlock : STR.levelUp);
    btn.disabled = lvl >= 3;
    btn.onclick = () => {
      if (G.souls <= 0) { toast(STR.noSouls); SFX.deny(); return; }
      if (G.elementLvl[e] >= 3) return;
      G.souls--; G.elementLvl[e]++; SFX.levelup(); openElements(); syncHUD();
    };
    row.appendChild(btn); list.appendChild(row);
  }
  $("el-points").textContent = G.souls;
  showPopup("element-popup");
}

function showPopup(id) { closeBuildBar(); closePopups(); $(id).classList.add("show"); $("scrim").classList.add("show"); }
function closePopups() { document.querySelectorAll(".popup").forEach((p) => p.classList.remove("show")); $("scrim").classList.remove("show"); G.selected = null; }
function showOverlay() { // lose
  $("ov-title").textContent = STR.lose;
  $("ov-msg").textContent = STR.loseMsg + ` (Level ${G.campaignLevel}, wave ${G.wave})`;
  $("ov-endless").style.display = "none";
  $("ov-retry").textContent = STR.retry;
  $("ov-retry").onclick = () => { hideOverlay(); newGame(G.campaignLevel); beginGame(); syncHUD(); };
  $("overlay").classList.add("show");
}
function hideOverlay() { $("overlay").classList.remove("show"); }
// ---- level complete ----
function showLevelComplete(L, pts, reward, firstClear) {
  $("ov-title").textContent = STR.levelDone + " " + L + " ✓";
  const hasNext = L < CAMPAIGN_LEVELS;
  $("ov-msg").innerHTML = `+${pts} ✦ ${STR.points}${firstClear === false ? " (replay)" : ""} &nbsp;·&nbsp; ${STR.totalPoints}: ${CAMPAIGN.points}` +
    `<br><span style="opacity:.85;font-size:13px">Spend ✦ in <b>Powers</b> for permanent upgrades</span>` +
    (reward ? `<br><span style="color:var(--gold)">⛏ Earned 💰 ${reward.gold} + 🔮 ${reward.aether}</span> for your base` : "") +
    (hasNext ? `<br>${STR.nextUnlocked}` : `<br>${STR.campaignDone}`);
  const nx = $("ov-endless");
  nx.style.display = hasNext ? "" : "none";
  nx.textContent = STR.nextLevel + " " + (L + 1);
  nx.onclick = () => { hideOverlay(); newGame(L + 1); beginGame(); syncHUD(); };
  $("ov-retry").textContent = STR.levelSelect;
  $("ov-retry").onclick = () => { hideOverlay(); openLevelSelect(); };
  $("overlay").classList.add("show");
}
// ---- level select ----
function openLevelSelect() {
  CAMPAIGN = loadCampaign();
  const grid = $("ls-grid"); grid.innerHTML = "";
  for (let L = 1; L <= CAMPAIGN_LEVELS; L++) {
    const unlocked = L <= CAMPAIGN.unlocked, done = CAMPAIGN.completed.includes(L);
    const b = document.createElement("button");
    b.className = "lvl" + (unlocked ? "" : " locked") + (done ? " done" : "");
    b.innerHTML = `<span class="ln">${L}</span><span class="ls">${done ? "★" : unlocked ? "▶" : "🔒"}</span>`;
    if (unlocked) b.onclick = () => { $("level-select").classList.remove("show"); $("menu").classList.remove("show"); newGame(L); beginGame(); audio() && actx.resume && actx.resume(); syncHUD(); };
    grid.appendChild(b);
  }
  $("ls-points").textContent = CAMPAIGN.points;
  $("level-select").classList.add("show");
}

/* ------------------------------------------------------------------ *
 *  INPUT
 * ------------------------------------------------------------------ */
let hoverCell = null;
function pointerToCell(clientX, clientY) {
  const w = worldFromEvent(clientX, clientY);
  if (w.x < 0 || w.y < 0 || w.x >= curWorldW() || w.y >= curWorldH()) return null;
  return { c: Math.floor(w.x / CELL), r: Math.floor(w.y / CELL) };
}
canvas.addEventListener("pointermove", (e) => { hoverCell = pointerToCell(e.clientX, e.clientY); });
canvas.addEventListener("pointerleave", () => { hoverCell = null; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // kill Samsung long-press callout
canvas.addEventListener("pointerdown", (e) => {
  if (e.cancelable) e.preventDefault(); // Samsung: register the tap immediately (no hold-to-disambiguate)
  audio() && actx.resume && actx.resume();
  const cell = pointerToCell(e.clientX, e.clientY);
  if (G.fusing) { cell ? handleFuseTap(cell) : cancelFusion(); return; }
  if (!cell) { closeBuildBar(); return; }
  if (G.phase === "lost" || G.phase === "won") return;
  const t = G.grid[cell.r][cell.c];
  if (t) { closeBuildBar(); openTower(t); return; }
  if (G.ltw) { if (ltInArea(cell.c, cell.r)) selectBuildCell(cell.c, cell.r); else closeBuildBar(); return; }
  if (onPath(cell.c, cell.r)) { closeBuildBar(); return; }
  selectBuildCell(cell.c, cell.r);
});

$("start-btn").onclick = () => { audio() && actx.resume && actx.resume(); startWave(); };
$("el-btn").onclick = () => { $("el-btn").classList.remove("soul-ready"); openElements(); };
$("speed-btn").onclick = () => { G.speed = G.speed >= 3 ? 1 : G.speed + 1; $("speed-btn").textContent = G.speed + "×"; };
$("pause-btn").onclick = togglePause;
$("pause-resume").onclick = () => setPaused(false);
$("fuse-cancel").onclick = () => cancelFusion();
$("scrim").onclick = () => closePopups();
document.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => closePopups());
// ov-retry / ov-endless onclicks are set dynamically by showOverlay / showLevelComplete
$("help-btn").onclick = () => $("tutorial").classList.add("show");
$("tut-close").onclick = () => $("tutorial").classList.remove("show");
function openHome() {
  CAMPAIGN = loadCampaign();
  $("home-points").textContent = CAMPAIGN.points;
  metaAccrue(); saveMeta(); updateCurBars();
  $("level-select").classList.remove("show"); $("pvp").classList.remove("show");
  $("resources").classList.remove("show"); $("troops").classList.remove("show"); $("upgrades").classList.remove("show");
  $("menu").classList.add("show");
}
$("hub-campaign").onclick = () => { audio() && actx.resume && actx.resume(); $("menu").classList.remove("show"); openLevelSelect(); };
$("hub-pvp").onclick = () => { $("menu").classList.remove("show"); $("pvp").classList.add("show"); };
$("hub-res").onclick = () => { audio() && actx.resume && actx.resume(); openResources(); };
$("hub-army").onclick = () => { audio() && actx.resume && actx.resume(); openTroops(); };
$("hub-upg").onclick = () => { audio() && actx.resume && actx.resume(); openUpgrades(); };
document.querySelectorAll(".bldg.locked[data-soon]").forEach((b) => (b.onclick = () => { toast(b.dataset.soon + " — coming soon"); SFX.deny(); }));
$("menu-help").onclick = () => $("tutorial").classList.add("show");
$("menu-settings").onclick = () => { audio() && actx.resume && actx.resume(); openSettings(); };
$("ls-back").onclick = openHome;
$("pvp-back").onclick = openHome;
$("res-back").onclick = openHome;
$("troops-back").onclick = openHome;
$("upg-back").onclick = openHome;
// settings: volume slider + mute (persisted in META.settings)
$("set-vol").oninput = (e) => {
  const v = Math.max(0, Math.min(100, +e.target.value)) / 100;
  META.settings.vol = v; MASTER_VOL = v; saveMeta(); renderSettings();
};
$("set-vol").onchange = () => SFX.place(); // little preview blip on release
$("set-mute").onclick = () => {
  META.settings.muted = !META.settings.muted; MUTED = META.settings.muted; saveMeta(); renderSettings();
  if (!MUTED) SFX.place();
};

/* ================================================================== *
 *  LINE TOWER WARS  —  PvP lane (faithful WC3 LTW), playable solo vs AI
 *  ----------------------------------------------------------------
 *  Rectangular lane. You freely MAZE our towers across the field to make
 *  creeps walk a long winding route to your base. The "builder must walk":
 *  a build is REJECTED if it would fully wall off the path (BFS check) —
 *  there is always a route from the spawn to your base. Creeps PATHFIND
 *  through your maze (flow field). 20 lives; a creep reaching your base
 *  costs a life. INCOME economy: gold ticks in over time; SENDING creeps
 *  at the enemy permanently boosts your income and chips their lives.
 *  Reduce the enemy to 0 lives to win. (Real-time 1v1 networking — the
 *  enemy swapped for a live opponent — is the final step.)
 * ================================================================== */
const LCOLS = 9, LROWS = 15;            // lane grid — taller gives real room to maze
const SC = { c: 4, r: 0 };              // single SPAWN gap (top centre)
const EX = { c: 4, r: LROWS - 1 };      // single EXIT gap (bottom centre) — creeps must reach THIS cell.
                                        //   funnelling to one exit is what makes mazing actually matter.
const WALL = { wall: true, perm: true };// permanent frame-wall marker placed in the grid
const LT_INCOME_TICK = 5;               // seconds between income payouts
const LT_BASE_INCOME = 10;              // baseline gold per tick
const LT_OUT_TRAVEL = 4;                // seconds a sent creep takes to reach the enemy base
const LT_START_GOLD = 320;              // enough to lay a starting maze immediately (was 80 — far too little)
// the army you can SEND is your RECRUITED monsters (Army screen). cost/income/power derived per monster.
function ltSendList() {
  const owned = MONSTERS.filter((m) => META.mons[m.key]);
  return owned.map((m) => {
    const power = m.hp + m.def + m.dmg * 2;                 // imp≈3 … void≈25
    return {
      key: m.key, name: m.name, sym: m.sym, art: m.art, el: m.el,
      count: m.spd >= 6 ? 3 : m.spd >= 5 ? 2 : 1, dmg: m.dmg,
      send: Math.round(14 + power * 4),                     // gold to send (imp≈26 … void≈114)
      income: Math.round(2 + power * 0.8),                  // permanent income boost (imp≈4 … void≈22)
    };
  });
}

function newGameLTW() {
  G = {
    ltw: true, cols: LCOLS, rows: LROWS,
    gold: LT_START_GOLD, lives: 20, time: 0, speed: 1,
    towers: [], creeps: [], shots: [], fx: [],
    grid: Array.from({ length: LROWS }, () => new Array(LCOLS).fill(null)),
    elementLvl: { fire: 3, water: 3, nature: 3, earth: 3, light: 3, darkness: 3 }, // all elements available in PvP
    souls: 0, phase: "wave", started: true,
    buildCell: null, selected: null, fusing: null,
    // LTW economy / opponent
    field: null, income: 0, incomeT: 4,
    aiLives: 20, aiWave: 0, aiSendT: 11, pending: [], outgoing: [],
    sendCost: {}, kills: 0,
  };
  // frame the lane: the spawn row and exit row are solid wall except their single centre gap
  for (let c = 0; c < LCOLS; c++) {
    if (c !== SC.c) G.grid[0][c] = WALL;
    if (c !== EX.c) G.grid[LROWS - 1][c] = WALL;
  }
  for (const m of ltSendList()) G.sendCost[m.key] = m.send;
  G.field = ltField();
  setMode("ltw");
  resize();
  ltSyncHUD();
  toast("Build a winding MAZE down to the exit ⬇ — then ⚔ send monsters at the enemy");
}

// show/hide campaign chrome vs LTW chrome
function setMode(m) {
  const ltw = m === "ltw";
  const hdr = document.querySelector("header"), ftr = document.querySelector("footer");
  if (hdr) hdr.style.display = ltw ? "none" : "";
  if (ftr) ftr.style.display = ltw ? "none" : "";
  if (ltw) $("forecast").style.display = "none"; // campaign mode lets updateForecast manage it
  $("ltw-hud").style.display = ltw ? "flex" : "none";
  $("ltw-foot").style.display = ltw ? "flex" : "none";
}

// you may build anywhere in the lane except the two gap cells (spawn & exit). frame walls are in the grid.
const ltInArea = (c, r) => c >= 0 && c < LCOLS && r >= 0 && r < LROWS && !(c === SC.c && r === SC.r) && !(c === EX.c && r === EX.r);
const ltCellOf = (cr) => ({ c: Math.max(0, Math.min(LCOLS - 1, Math.floor(cr.x / CELL))), r: Math.max(0, Math.min(LROWS - 1, Math.floor(cr.y / CELL))) });

// BFS distance field toward the SINGLE exit cell. Towers & frame walls are obstacles.
function ltField() {
  const dist = Array.from({ length: LROWS }, () => new Array(LCOLS).fill(Infinity));
  const q = [];
  dist[EX.r][EX.c] = 0; q.push([EX.c, EX.r]);
  let head = 0;
  while (head < q.length) {
    const [cc, rr] = q[head++], d = dist[rr][cc];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dc, dr] of nb) {
      const nc = cc + dc, nr = rr + dr;
      if (nc < 0 || nc >= LCOLS || nr < 0 || nr >= LROWS) continue;
      if (G.grid[nr][nc]) continue;            // tower blocks
      if (dist[nr][nc] > d + 1) { dist[nr][nc] = d + 1; q.push([nc, nr]); }
    }
  }
  return dist;
}

// place a tower/wall in the lane. The ONLY restriction (the "builder must walk" anti-cheat) is that
// the spawn must still reach the exit — you can freely build around/onto cells creeps stand on; they repath.
function ltPlaceTower(c, r, spec) {
  if (!ltInArea(c, r)) { toast("Build inside the lane"); SFX.deny(); return false; }
  if (G.grid[r][c]) { SFX.deny(); return false; }                 // occupied (tower or frame wall)
  if (G.gold < spec.cost) { toast(STR.cantAfford); SFX.deny(); return false; }
  // anti-block: temp-place and confirm the spawn can still path to the exit (leave a gap!)
  G.grid[r][c] = true;
  const ok = isFinite(ltField()[SC.r][SC.c]);
  G.grid[r][c] = null;
  if (!ok) { toast("⛔ That seals the lane — leave a gap!"); SFX.deny(); flashDanger(); return false; }
  const cen = cellCenter(c, r);
  if (spec.wall) { // cheap non-attacking maze block (LTW "spam basic buildings, sell later")
    const w = { c, r, x: cen.x, y: cen.y, wall: true, base: "wall", elems: [], tier: 0, invested: spec.cost };
    G.grid[r][c] = w; G.towers.push(w); G.gold -= spec.cost;
    SFX.place(); pulse(cen.x, cen.y, "#b7a98f"); G.field = ltField(); return true;
  }
  const elems = spec.elems || [];
  const t = {
    c, r, x: cen.x, y: cen.y, neutral: !!spec.neutral, base: spec.base || "arrow",
    combo: elems.length >= 2, triple: elems.length === 3, elems,
    tier: 0, invested: spec.cost, cd: 0, target: null,
  };
  G.grid[r][c] = t; G.towers.push(t); G.gold -= spec.cost;
  SFX.place(); pulse(cen.x, cen.y, t.neutral ? NEUTRAL[t.base].col : ELEMENT[elems[0]].col);
  G.field = ltField();
  return true;
}

function ltSpawn(opts) {
  const cc = cellCenter(SC.c, SC.r);
  G.creeps.push({
    x: cc.x, y: cc.y, hp: opts.hp, maxHp: opts.hp, element: opts.element,
    baseSpeed: opts.speed * CELL, leak: opts.leak || 1, bounty: opts.bounty || 2,
    boss: false, elite: !!opts.elite, bigboss: false, levelBoss: false, kind: opts.kind || "normal",
    slowT: 0, slowF: 1, ampT: 0, ampF: 1, dots: [], goldBonus: 0, dead: false, leaked: false, spin: 0,
    r: opts.r || 13, look: waveLook(opts.seed || 1),
  });
}

// the enemy (AI for now) sends an escalating pack at you
function ltAiSend() {
  G.aiWave++;
  const idx = G.aiWave;
  const hp = 14 * Math.pow(1.135, idx - 1);
  const count = Math.min(14, 4 + Math.floor(idx / 2));
  const el = EL[(idx + 2) % 6];
  const speed = 0.85 + Math.min(0.5, idx * 0.012);
  const elite = idx % 6 === 0;
  for (let k = 0; k < count; k++) {
    G.pending.push({ t: 0.15 + k * 0.45, opts: { hp: elite ? hp * 2.4 : hp, element: el, speed, leak: 1, bounty: 2 + Math.floor(idx / 3), elite, r: elite ? 17 : 13, kind: elite ? "armored" : "normal", seed: idx * 17 + k } });
  }
}

function ltMoveCreep(cr, s) {
  if (cr.slowT > 0) { cr.slowT -= s; if (cr.slowT <= 0) cr.slowF = 1; }
  if (cr.ampT > 0) { cr.ampT -= s; if (cr.ampT <= 0) cr.ampF = 1; }
  for (const d of cr.dots) { d.t -= s; cr.hp -= d.dps * s; }
  cr.dots = cr.dots.filter((d) => d.t > 0);
  const cell = ltCellOf(cr);
  if (cell.c === EX.c && cell.r === EX.r) { // reached the exit gap
    cr.leaked = true; G.lives -= cr.leak; SFX.leak(); flashDanger();
    if (G.lives <= 0) { G.lives = 0; ltOver(false); }
    return;
  }
  const f = G.field;
  const nbs = [[0, 1], [1, 0], [-1, 0], [0, -1]];
  let best = null, bestD = f[cell.r][cell.c];
  for (const [dc, dr] of nbs) {
    const nc = cell.c + dc, nr = cell.r + dr;
    if (nc < 0 || nc >= LCOLS || nr < 0 || nr >= LROWS) continue;
    if (G.grid[nr][nc]) continue;
    if (f[nr][nc] < bestD) { bestD = f[nr][nc]; best = { c: nc, r: nr }; }
  }
  // boxed in (no descending neighbour)? take the lowest-distance OPEN neighbour anyway, so it never freezes
  if (!best) {
    let lo = Infinity;
    for (const [dc, dr] of nbs) {
      const nc = cell.c + dc, nr = cell.r + dr;
      if (nc < 0 || nc >= LCOLS || nr < 0 || nr >= LROWS) continue;
      if (G.grid[nr][nc]) continue;
      if (f[nr][nc] < lo) { lo = f[nr][nc]; best = { c: nc, r: nr }; }
    }
  }
  let tx = cr.x, ty = cr.y + CELL;
  if (best) { const bc = cellCenter(best.c, best.r); tx = bc.x; ty = bc.y; }
  const dx = tx - cr.x, dy = ty - cr.y, dd = Math.hypot(dx, dy) || 1;
  const step = cr.baseSpeed * cr.slowF * s;
  if (step >= dd) { cr.x = tx; cr.y = ty; } else { cr.x += (dx / dd) * step; cr.y += (dy / dd) * step; }
}

function ltSend(type) {
  const st = ltSendList().find((t) => t.key === type); if (!st) return;
  const cost = Math.round(G.sendCost[type] != null ? G.sendCost[type] : st.send);
  if (G.gold < cost) { toast(STR.cantAfford); SFX.deny(); return; }
  G.gold -= cost;
  G.income += st.income;                          // permanent income boost — the LTW core
  G.sendCost[type] = cost * 1.12;                 // each send of a type gets pricier
  for (let k = 0; k < st.count; k++) G.outgoing.push({ t: LT_OUT_TRAVEL, dmg: st.dmg, sym: st.sym });
  SFX.start(); toast(`${st.sym} ×${st.count} sent — income +${st.income}/tick`);
  ltSyncHUD(); ltRenderSend();
}

function ltUpdate(dt) {
  if (G.phase === "lost" || G.phase === "won") return;
  const s = dt / 1000; G.time += s;

  // income payout
  G.incomeT -= s;
  if (G.incomeT <= 0) { G.incomeT = LT_INCOME_TICK; const inc = LT_BASE_INCOME + G.income; G.gold += inc; pulse(WORLD_W / 2, (LROWS - 0.5) * CELL, "#ffe36b"); }

  // enemy sends escalating packs at you
  G.aiSendT -= s;
  if (G.aiSendT <= 0) { ltAiSend(); G.aiSendT = Math.max(2.4, 6.5 - G.time * 0.02); }

  // pending spawns (staggered)
  for (const p of G.pending) { p.t -= s; if (p.t <= 0) { ltSpawn(p.opts); p.done = true; } }
  G.pending = G.pending.filter((p) => !p.done);

  // your outgoing sends reach the enemy base after travel time
  for (const o of G.outgoing) { o.t -= s; if (o.t <= 0) { o.done = true; G.aiLives -= o.dmg; burst(WORLD_W / 2, 30, "#cf5b5b"); } }
  G.outgoing = G.outgoing.filter((o) => !o.done);
  if (G.aiLives <= 0 && G.phase !== "won") { G.aiLives = 0; ltOver(true); return; }

  // refresh flow field (cheap) so creeps repath as towers change
  G.field = ltField();
  for (const cr of G.creeps) ltMoveCreep(cr, s);
  for (const t of G.towers) tickTower(t, s);

  // shots (same homing-projectile logic as the campaign)
  for (const sh of G.shots) {
    if (!sh.target || sh.target.dead || sh.target.hp <= 0) { sh.dead = true; continue; }
    sh.trail.push({ x: sh.x, y: sh.y }); if (sh.trail.length > 6) sh.trail.shift();
    const dx = sh.target.x - sh.x, dy = sh.target.y - sh.y, d = Math.hypot(dx, dy);
    const step = (sh.elem === "light" ? 880 : sh.big ? 600 : 700) * s;
    if (d <= step) { sh.dead = true; hit(sh); } else { sh.x += (dx / d) * step; sh.y += (dy / d) * step; }
  }
  G.shots = G.shots.filter((x) => !x.dead);

  for (const f of G.fx) f.t += s;
  G.fx = G.fx.filter((f) => f.t < f.dur);

  for (const cr of G.creeps) {
    if (cr.hp <= 0 && !cr.dead) { cr.dead = true; G.gold += cr.bounty; G.kills++; burst(cr.x, cr.y, ELEMENT[cr.element].col); }
  }
  G.creeps = G.creeps.filter((cr) => !cr.dead && !cr.leaked);
}

function ltOver(win) {
  if (G.phase === "won" || G.phase === "lost") return;   // idempotent
  G.phase = win ? "won" : "lost";
  win ? SFX.win() : SFX.lose();
  $("ov-title").textContent = win ? "⚔️ Lane won!" : "Your base fell";
  $("ov-msg").innerHTML = win
    ? `You crushed the enemy lane.<br>Creeps slain: <b>${G.kills}</b> · Income reached: <b>+${LT_BASE_INCOME + G.income}/tick</b>`
    : `The enemy overran your maze.<br>Creeps slain: <b>${G.kills}</b> · Enemy lives left: <b>${G.aiLives}</b>`;
  $("ov-endless").style.display = "";
  $("ov-endless").textContent = "Play again";
  $("ov-endless").onclick = () => { hideOverlay(); newGameLTW(); };
  $("ov-retry").textContent = "Home";
  $("ov-retry").onclick = () => { hideOverlay(); ltExit(); };
  $("overlay").classList.add("show");
}
function ltExit() { setMode("campaign"); newGame(); resize(); openHome(); }

// trace the route the "builder" / creeps walk from spawn to base (visualises the maze)
function ltTrace() {
  const f = G.field, pts = [cellCenter(SC.c, SC.r)];
  let cur = { c: SC.c, r: SC.r }, guard = 0;
  while (cur.r < LROWS - 1 && guard++ < LCOLS * LROWS) {
    let nx = null, nd = f[cur.r][cur.c];
    for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const nc = cur.c + dc, nr = cur.r + dr;
      if (nc < 0 || nc >= LCOLS || nr < 0 || nr >= LROWS) continue;
      if (G.grid[nr][nc]) continue;
      if (f[nr][nc] < nd) { nd = f[nr][nc]; nx = { c: nc, r: nr }; }
    }
    if (!nx) break;
    pts.push(cellCenter(nx.c, nx.r)); cur = nx;
  }
  return pts;
}

function ltRender() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0e1418"; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(view.ox, view.oy); ctx.scale(view.scale, view.scale);
  const ww = LCOLS * CELL, hh = LROWS * CELL;
  // ground
  ctx.fillStyle = "#244b30"; ctx.fillRect(0, 0, ww, hh);
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(0, 0, ww, hh);
  // spawn gap (top) glow + exit gap (bottom) glow
  ctx.fillStyle = "rgba(207,91,91,0.22)"; ctx.fillRect(SC.c * CELL, 0, CELL, CELL);
  ctx.fillStyle = "rgba(79,209,166,0.22)"; ctx.fillRect(EX.c * CELL, (LROWS - 1) * CELL, CELL, CELL);
  // grid
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.06)";
  for (let c = 0; c <= LCOLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, hh); ctx.stroke(); }
  for (let r = 0; r <= LROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(ww, r * CELL); ctx.stroke(); }
  // the walker's route through the maze (dashed) — shows the path can never be fully sealed
  const route = ltTrace();
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,232,107,0.32)"; ctx.lineWidth = 7; ctx.setLineDash([3, 12]);
  ctx.beginPath(); route.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
  // frame walls (drawn as stone blocks)
  for (let r = 0; r < LROWS; r++) for (let c = 0; c < LCOLS; c++) if (G.grid[r][c] === WALL) drawWall(c * CELL + CELL / 2, r * CELL + CELL / 2);
  // markers: spawn + exit
  markCell(SC, "#cf5b5b", "IN");
  markCell(EX, "#4fd1a6", "EXIT");
  // build hover / selection
  if (hoverCell && !G.buildCell && ltInArea(hoverCell.c, hoverCell.r)) {
    const ok = !G.grid[hoverCell.r][hoverCell.c];
    ctx.fillStyle = ok ? "rgba(255,255,255,0.14)" : "rgba(255,80,80,0.14)";
    ctx.fillRect(hoverCell.c * CELL, hoverCell.r * CELL, CELL, CELL);
  }
  if (G.buildCell) {
    const bx = G.buildCell.c * CELL, by = G.buildCell.r * CELL;
    ctx.fillStyle = "rgba(122,79,214,0.22)"; ctx.fillRect(bx, by, CELL, CELL);
    ctx.lineWidth = 3; ctx.strokeStyle = "#b89cff"; ctx.setLineDash([6, 5]);
    ctx.strokeRect(bx + 2, by + 2, CELL - 4, CELL - 4); ctx.setLineDash([]);
  }
  if (G.selected) {
    const def = towerDef(G.selected);
    ctx.beginPath(); ctx.arc(G.selected.x, G.selected.y, def.range * CELL, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2; ctx.stroke();
  }
  for (const t of G.towers) drawTower(t);
  for (const cr of G.creeps) drawCreep(cr);
  for (const sh of G.shots) drawShot(sh);
  for (const f of G.fx) drawFx(f);
  if (G.fusing) {
    ctx.save(); ctx.strokeStyle = "#ffe36b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(G.fusing.x, G.fusing.y, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([7, 7]); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.5;
    for (const o of fusePartners(G.fusing)) { ctx.beginPath(); ctx.arc(o.x, o.y, 29, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
  }
  ctx.restore();
  if (dangerFlash > 0) { ctx.fillStyle = `rgba(220,40,40,${0.35 * dangerFlash})`; ctx.fillRect(0, 0, W, H); dangerFlash = Math.max(0, dangerFlash - 0.05); }
}

function ltSyncHUD() {
  $("lt-lives").textContent = G.lives;
  $("lt-gold").textContent = G.gold;
  $("lt-income").textContent = "+" + (LT_BASE_INCOME + G.income);
  $("lt-ai").textContent = G.aiLives;
}
// build the send-panel rows
function ltRenderSend() {
  const box = $("ltw-send-list"); if (!box) return;
  box.innerHTML = "";
  const list = ltSendList();
  for (const st of list) {
    if (G.sendCost[st.key] == null) G.sendCost[st.key] = st.send;
    const cost = Math.round(G.sendCost[st.key]);
    const elc = ELEMENT[st.el];
    const b = document.createElement("button");
    b.className = "scard" + (G.gold < cost ? " poor" : "");
    const ic = st.art ? `<span class="ic" style="background-image:url(./assets/mon_${st.key}.png)"></span>` : `<span class="ic">${st.sym}</span>`;
    b.innerHTML = ic +
      `<span class="nm" style="color:${elc.col}">${st.name}${st.count > 1 ? " ×" + st.count : ""}</span>` +
      `<span class="fxn">income +${st.income}/tick · ${st.dmg} dmg</span><span class="ct">🪙 ${cost}</span>`;
    b.onclick = () => ltSend(st.key);
    box.appendChild(b);
  }
  // nudge the player toward recruiting a bigger army
  const more = document.createElement("button");
  more.className = "scard";
  more.style.opacity = ".85";
  more.innerHTML = `<span class="ic">➕</span><span class="nm">Recruit more</span>` +
    `<span class="fxn">Unlock stronger monsters in the Army (home screen)</span>`;
  more.onclick = () => { closePopups(); ltExit(); openTroops(); };
  box.appendChild(more);
}
function openSendPanel() { ltRenderSend(); showPopup("ltw-send"); }

// launch from the PvP card
function startLTW() { closePopups(); $("menu").classList.remove("show"); $("pvp").classList.remove("show"); audio() && actx.resume && actx.resume(); newGameLTW(); }
$("pvp-play").onclick = startLTW;
$("lt-back").onclick = ltExit;
$("lt-send").onclick = openSendPanel;
$("lt-speed").onclick = () => { G.speed = G.speed >= 3 ? 1 : G.speed + 1; $("lt-speed").textContent = G.speed + "×"; };
$("lt-help").onclick = () => $("tutorial").classList.add("show");

/* ================================================================== *
 *  META LAYER — idle resource economy + monster roster (home screen)
 *  ----------------------------------------------------------------
 *  Kingdom-Guard-style passive income: each building mines a resource
 *  over time (online AND offline, capped at 8h of storage). Collect it,
 *  spend it to upgrade buildings (faster mining) and to recruit the
 *  monsters you'll send at rivals in PvP. All persisted in localStorage.
 * ================================================================== */
const META_KEY = "eltd_meta";
const OFFLINE_CAP_MIN = 480;            // bank up to 8h of offline production
const CUR_SYM = { gold: "💰", aether: "🔮", crystal: "💎" };

// resource-producing buildings. rate = per minute; cap = storage before it stops.
const BUILDINGS = [
  { key: "goldmine", name: "Gold Mine",    cur: "gold",    sym: "💰",
    rate: 14, ratePer: 11, cap: 300, capPer: 240, baseUp: 150, upGrow: 1.55, unlock: 0,
    desc: "Digs raw gold around the clock — your core income." },
  { key: "aether",   name: "Aether Well",  cur: "aether",  sym: "🔮",
    rate: 2.4, ratePer: 1.8, cap: 60, capPer: 50, baseUp: 520, upGrow: 1.6, unlock: 2500,
    desc: "Channels arcane Aether to summon elite monsters." },
  { key: "crystal",  name: "Crystal Drill", cur: "crystal", sym: "💎",
    rate: 1.0, ratePer: 0.8, cap: 30, capPer: 26, baseUp: 1200, upGrow: 1.65, unlock: 9000,
    desc: "Bores for rare Crystal — fuels your strongest troops." },
];
const BLD = {}; BUILDINGS.forEach((b) => (BLD[b.key] = b));
const bRate = (b, lvl) => +(b.rate + b.ratePer * (lvl - 1)).toFixed(2);   // per minute at level
const bCap  = (b, lvl) => Math.round(b.cap + b.capPer * (lvl - 1));        // storage cap at level
const bUp   = (b, lvl) => Math.round(b.baseUp * Math.pow(b.upGrow, lvl - 1)); // gold to reach lvl+1

// monster roster — the troops you SEND in PvP. stats: hp, def(armor), spd, dmg(lives on leak).
const MONSTERS = [
  { key: "imp",    name: "Fire Imp",     el: "fire",     sym: "👺", art: 1, hp: 1,  def: 0, spd: 5, dmg: 1, cost: { gold: 0 },                desc: "Free starter — fast and cheap." },
  { key: "sludge", name: "Toxic Sludge", el: "nature",   sym: "🟢", art: 1, hp: 3,  def: 1, spd: 2, dmg: 1, cost: { gold: 600 },             desc: "Slow but tanky; soaks tower fire." },
  { key: "frost",  name: "Frost Whelp",  el: "water",    sym: "🐉", art: 1, hp: 2,  def: 1, spd: 4, dmg: 1, cost: { gold: 1200 },            desc: "Chills the lane — slippery and quick." },
  { key: "wisp",   name: "Light Wisp",   el: "light",    sym: "✨", hp: 1,  def: 0, spd: 6, dmg: 1, cost: { gold: 1800 },            desc: "Swarms in fast little packs." },
  { key: "shade",  name: "Night Shade",  el: "darkness", sym: "👻", hp: 2,  def: 2, spd: 4, dmg: 1, cost: { gold: 2600 },            desc: "Evasive shadow that dodges hits." },
  { key: "golem",  name: "Rock Golem",   el: "earth",    sym: "🗿", art: 1, hp: 6,  def: 3, spd: 1, dmg: 2, cost: { gold: 3800 },            desc: "A walking wall of stone — heavy armor." },
  { key: "boar",   name: "Boar Brute",   el: "earth",    sym: "🐗", hp: 5,  def: 3, spd: 3, dmg: 1, cost: { gold: 5200 },            desc: "Armored charger that shrugs off splash." },
  { key: "drake",  name: "Spark Drake",  el: "fire",     sym: "🐲", art: 1, hp: 7,  def: 2, spd: 4, dmg: 2, cost: { gold: 6000, aether: 25 }, desc: "Elite drake of fire & lightning.", elite: true },
  { key: "beast",  name: "Crystal Beast", el: "water",   sym: "💠", hp: 9,  def: 4, spd: 3, dmg: 2, cost: { aether: 80, crystal: 18 }, desc: "Crystalline tank — punishing to clear.", elite: true },
  { key: "void",   name: "Void Titan",   el: "darkness", sym: "🌌", art: 1, hp: 14, def: 5, spd: 2, dmg: 3, cost: { aether: 160, crystal: 50 }, desc: "Boss-tier titan. Costs the enemy dearly.", elite: true },
];
const MON = {}; MONSTERS.forEach((m) => (MON[m.key] = m));

// permanent ACCOUNT upgrades — bought with ✦ points (CAMPAIGN.points); apply across every run.
// This closes the loop: campaign clears earn points → points buy power → campaign gets easier.
const UPGRADES = [
  { key: "dmg",  name: "Arcane Might",    sym: "⚔️", max: 10, base: 60,  unit: "+6% tower damage", desc: "Every tower hits harder — in the campaign AND Tower Wars." },
  { key: "gold", name: "War Chest",       sym: "💰", max: 10, base: 55,  unit: "+40 starting gold", desc: "Begin each campaign level with more gold to spend." },
  { key: "life", name: "Fortified Rift",  sym: "❤️", max: 5,  base: 130, unit: "+1 starting life", desc: "Take more leaks before the rift falls." },
  { key: "soul", name: "Soul Attunement", sym: "✦",  max: 5,  base: 160, unit: "+1 starting soul", desc: "Start each level already holding element souls to spend." },
];
const UPG = {}; UPGRADES.forEach((u) => (UPG[u.key] = u));
const upgCost = (u, lvl) => Math.round(u.base * Math.pow(1.55, lvl)); // escalates per level owned
const dmgMult = () => 1 + (META.upg ? (META.upg.dmg || 0) : 0) * 0.06;
function metaBuyUpgrade(key) {
  const u = UPG[key], lvl = META.upg[key] || 0;
  if (lvl >= u.max) return false;
  const cost = upgCost(u, lvl);
  CAMPAIGN = loadCampaign();
  if (CAMPAIGN.points < cost) return false;
  CAMPAIGN.points -= cost; saveCampaign(CAMPAIGN);
  META.upg[key] = lvl + 1; saveMeta();
  return true;
}

function defaultMeta() {
  return { gold: 0, aether: 0, crystal: 0,
    bld: { goldmine: { lvl: 1, pend: 0 }, aether: { lvl: 0, pend: 0 }, crystal: { lvl: 0, pend: 0 } },
    mons: { imp: 1 },
    upg: { dmg: 0, gold: 0, life: 0, soul: 0 },     // permanent account upgrades (bought with ✦ points)
    settings: { vol: 0.4, muted: false },
    ts: Date.now() };
}
function loadMeta() {
  try {
    const m = Object.assign(defaultMeta(), JSON.parse(localStorage.getItem(META_KEY) || "{}"));
    const d = defaultMeta();
    m.bld = Object.assign(d.bld, m.bld || {});
    for (const k in d.bld) m.bld[k] = Object.assign(d.bld[k], m.bld[k] || {});
    m.mons = Object.assign({ imp: 1 }, m.mons || {});
    m.upg = Object.assign(d.upg, m.upg || {});
    m.settings = Object.assign(d.settings, m.settings || {});
    return m;
  } catch (e) { return defaultMeta(); }
}
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) {} }
let META = (typeof localStorage !== "undefined") ? loadMeta() : defaultMeta();

// accrue idle production into each building's pending store (online ticks + offline catch-up)
function metaAccrue() {
  const now = Date.now();
  let elapsedMin = (now - (META.ts || now)) / 60000;
  if (elapsedMin < 0) elapsedMin = 0;
  if (elapsedMin > OFFLINE_CAP_MIN) elapsedMin = OFFLINE_CAP_MIN;
  for (const b of BUILDINGS) {
    const st = META.bld[b.key]; if (!st || st.lvl < 1) continue;
    st.pend = Math.min(bCap(b, st.lvl), (st.pend || 0) + bRate(b, st.lvl) * elapsedMin);
  }
  META.ts = now;
}
function metaCollect(key) {
  metaAccrue();
  const b = BLD[key], st = META.bld[key];
  const amt = Math.floor(st.pend || 0);
  if (amt <= 0) return 0;
  META[b.cur] += amt; st.pend -= amt; saveMeta();
  return amt;
}
function metaUpgrade(key) {
  metaAccrue();
  const b = BLD[key], st = META.bld[key];
  if (st.lvl < 1) { if (META.gold < b.unlock) return false; META.gold -= b.unlock; st.lvl = 1; st.pend = 0; }
  else { const cost = bUp(b, st.lvl); if (META.gold < cost) return false; META.gold -= cost; st.lvl += 1; }
  saveMeta(); return true;
}
function metaCanAfford(cost) {
  return (META.gold >= (cost.gold || 0)) && (META.aether >= (cost.aether || 0)) && (META.crystal >= (cost.crystal || 0));
}
function metaBuyMonster(key) {
  metaAccrue();
  const m = MON[key]; if (META.mons[key]) return false;
  if (!metaCanAfford(m.cost)) return false;
  META.gold -= m.cost.gold || 0; META.aether -= m.cost.aether || 0; META.crystal -= m.cost.crystal || 0;
  META.mons[key] = 1; saveMeta(); return true;
}
function metaFmt(n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "k";
  return "" + n;
}
function updateCurBars() {
  document.querySelectorAll('[data-cur="gold"]').forEach((e) => (e.textContent = metaFmt(META.gold)));
  document.querySelectorAll('[data-cur="aether"]').forEach((e) => (e.textContent = metaFmt(META.aether)));
  document.querySelectorAll('[data-cur="crystal"]').forEach((e) => (e.textContent = metaFmt(META.crystal)));
}

// ---- Mines screen (idle buildings) ----
function renderResources() {
  metaAccrue(); updateCurBars();
  const list = $("res-list"); if (!list) return; list.innerHTML = "";
  for (const b of BUILDINGS) {
    const st = META.bld[b.key], built = st.lvl >= 1;
    const rate = bRate(b, built ? st.lvl : 1), cap = bCap(b, built ? st.lvl : 1);
    const pend = Math.floor(st.pend || 0), pct = built ? Math.min(100, (st.pend / cap) * 100) : 0;
    const thumb = `<div class="bimg" style="background-image:url(./assets/bld_${b.key}.png)"></div>`;
    const el = document.createElement("div"); el.className = "bld" + (built ? "" : " locked");
    if (!built) {
      const canBuild = META.gold >= b.unlock;
      el.innerHTML = thumb +
        `<div class="bbody"><div class="bname">${b.name} <span class="blv">LOCKED</span></div>` +
        `<div class="brate">+${rate}/min ${b.sym} · holds ${cap}</div>` +
        `<div class="bdesc">${b.desc}</div></div>` +
        `<div class="bact"><button class="bbuild" data-build="${b.key}"${canBuild ? "" : " disabled"}>Build<br>💰 ${metaFmt(b.unlock)}</button></div>`;
    } else {
      const can = META.gold >= bUp(b, st.lvl);
      el.innerHTML = thumb +
        `<div class="bbody"><div class="bname">${b.name} <span class="blv">LV ${st.lvl}</span></div>` +
        `<div class="brate">+${rate}/min ${b.sym}</div>` +
        `<div class="bfill"><i data-fill="${b.key}" style="width:${pct}%"></i></div>` +
        `<div class="bstore"><span data-pend="${b.key}">${pend}</span> / ${cap} stored</div></div>` +
        `<div class="bact">` +
          `<button class="bcollect" data-collect="${b.key}"${pend <= 0 ? " disabled" : ""}>Collect<br>+${metaFmt(pend)}</button>` +
          `<button class="bup" data-up="${b.key}"${can ? "" : " disabled"}>LV ${st.lvl + 1}<br>💰 ${metaFmt(bUp(b, st.lvl))}</button>` +
        `</div>`;
    }
    list.appendChild(el);
  }
  list.querySelectorAll("[data-collect]").forEach((btn) => (btn.onclick = () => {
    const a = metaCollect(btn.dataset.collect);
    if (a > 0) { SFX.upgrade(); toast(`+${metaFmt(a)} ${BLD[btn.dataset.collect].sym} collected`); }
    renderResources();
  }));
  list.querySelectorAll("[data-up]").forEach((btn) => (btn.onclick = () => {
    if (metaUpgrade(btn.dataset.up)) { SFX.levelup(); } else { toast("Not enough gold"); SFX.deny(); }
    renderResources();
  }));
  list.querySelectorAll("[data-build]").forEach((btn) => (btn.onclick = () => {
    if (metaUpgrade(btn.dataset.build)) { SFX.levelup(); toast(BLD[btn.dataset.build].name + " built!"); }
    else { toast("Not enough gold — mine more first"); SFX.deny(); }
    renderResources();
  }));
}

// ---- Army screen (monster roster) ----
function renderTroops() {
  metaAccrue(); updateCurBars();
  const grid = $("troops-grid"); if (!grid) return; grid.innerHTML = "";
  for (const m of MONSTERS) {
    const owned = !!META.mons[m.key], elc = ELEMENT[m.el];
    const free = (m.cost.gold === 0 && !m.cost.aether && !m.cost.crystal);
    const costStr = free ? "Claim free"
      : Object.keys(m.cost).filter((k) => m.cost[k] > 0).map((k) => CUR_SYM[k] + " " + metaFmt(m.cost[k])).join("  ");
    const can = owned || metaCanAfford(m.cost);
    const card = document.createElement("div"); card.className = "mon" + (owned ? " owned" : " locked");
    card.innerHTML =
      `<div class="mtier" style="color:${elc.col}">${m.elite ? "ELITE" : elc.sym}</div>` +
      (m.art ? `<div class="mimg" style="background-image:url(./assets/mon_${m.key}.png)"></div>`
             : `<div class="mimg">${m.sym}</div>`) +
      `<div class="mname" style="color:${elc.col}">${m.name}</div>` +
      `<div class="mstats"><span>❤<b>${m.hp}</b></span><span>🛡<b>${m.def}</b></span><span>⚡<b>${m.spd}</b></span><span>💥<b>${m.dmg}</b></span></div>` +
      `<div class="mstats desc">${m.desc}</div>` +
      (owned ? `<div class="mowned">✓ Owned</div>`
             : `<button class="mbuy${free ? " free" : ""}" data-buy="${m.key}"${can ? "" : " disabled"}>${costStr}</button>`);
    grid.appendChild(card);
  }
  grid.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => {
    if (metaBuyMonster(b.dataset.buy)) { SFX.levelup(); toast(MON[b.dataset.buy].name + " recruited!"); }
    else { toast("Not enough resources"); SFX.deny(); }
    renderTroops();
  }));
}

// live idle tick — keeps fills & currency counters moving while you watch
function metaTickUI() {
  metaAccrue();
  if ($("resources").classList.contains("show")) {
    for (const b of BUILDINGS) {
      const st = META.bld[b.key]; if (st.lvl < 1) continue;
      const cap = bCap(b, st.lvl);
      const fill = document.querySelector(`[data-fill="${b.key}"]`);
      if (fill) fill.style.width = Math.min(100, (st.pend / cap) * 100) + "%";
      const pe = document.querySelector(`[data-pend="${b.key}"]`);
      if (pe) pe.textContent = Math.floor(st.pend || 0);
    }
  }
  if (document.querySelector(".full.show")) updateCurBars();
}
function openResources() { metaAccrue(); saveMeta(); $("menu").classList.remove("show"); $("resources").classList.add("show"); renderResources(); }
function openTroops() { metaAccrue(); saveMeta(); $("menu").classList.remove("show"); $("troops").classList.add("show"); renderTroops(); }

// ---- Powers screen (permanent upgrades, bought with ✦ points) ----
function renderUpgrades() {
  CAMPAIGN = loadCampaign();
  const ptsEl = $("upg-points"); if (ptsEl) ptsEl.textContent = CAMPAIGN.points;
  const list = $("upg-list"); if (!list) return; list.innerHTML = "";
  for (const u of UPGRADES) {
    const lvl = META.upg[u.key] || 0, maxed = lvl >= u.max, cost = upgCost(u, lvl);
    const can = !maxed && CAMPAIGN.points >= cost;
    const pct = Math.round((lvl / u.max) * 100);
    const el = document.createElement("div"); el.className = "upg" + (maxed ? " maxed" : "");
    el.innerHTML =
      `<div class="usym">${u.sym}</div>` +
      `<div class="ubody">` +
        `<div class="uname">${u.name} <span class="ulvl">Lv ${lvl}/${u.max}</span></div>` +
        `<div class="ueff">${u.unit}</div>` +
        `<div class="uprog"><i style="width:${pct}%"></i></div>` +
        `<div class="udesc">${u.desc}</div>` +
      `</div>` +
      (maxed ? `<div class="umax">★<br>MAX</div>`
             : `<button class="ubuy" data-upg="${u.key}"${can ? "" : " disabled"}><span class="ubl">UPGRADE</span><span class="ubc">✦ ${cost}</span></button>`);
    list.appendChild(el);
  }
  list.querySelectorAll("[data-upg]").forEach((b) => (b.onclick = () => {
    if (metaBuyUpgrade(b.dataset.upg)) { SFX.levelup(); toast(UPG[b.dataset.upg].name + " upgraded!"); }
    else { toast("Not enough ✦ points — clear campaign levels"); SFX.deny(); }
    renderUpgrades();
  }));
}
function openUpgrades() { $("menu").classList.remove("show"); $("upgrades").classList.add("show"); renderUpgrades(); }

// ---- Settings (volume / mute) ----
function applySettings() {
  const s = META.settings || { vol: 0.4, muted: false };
  MASTER_VOL = (s.vol == null ? 0.4 : s.vol);
  MUTED = !!s.muted;
}
function renderSettings() {
  const s = META.settings;
  const sl = $("set-vol"); if (sl) sl.value = Math.round((s.vol == null ? 0.4 : s.vol) * 100);
  const vp = $("set-vol-pct"); if (vp) vp.textContent = Math.round((s.vol == null ? 0.4 : s.vol) * 100) + "%";
  const mb = $("set-mute"); if (mb) { mb.textContent = s.muted ? "🔇 Muted" : "🔊 Sound on"; mb.classList.toggle("off", !!s.muted); }
}
function openSettings() { renderSettings(); showPopup("settings"); }

// ---- Offline-earnings popup (Kingdom-Guard "while you were away") ----
function maybeShowOffline(offlineMin) {
  if (offlineMin < 3) return false;                 // only after a real break
  metaAccrue();
  const totals = { gold: 0, aether: 0, crystal: 0 };
  let any = 0;
  for (const b of BUILDINGS) { const st = META.bld[b.key]; if (st.lvl < 1) continue; const a = Math.floor(st.pend || 0); if (a > 0) { totals[b.cur] += a; any += a; } }
  if (any <= 0) return false;
  const h = Math.floor(offlineMin / 60), m = Math.floor(offlineMin % 60);
  const away = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const parts = [];
  if (totals.gold) parts.push(`💰 ${metaFmt(totals.gold)}`);
  if (totals.aether) parts.push(`🔮 ${metaFmt(totals.aether)}`);
  if (totals.crystal) parts.push(`💎 ${metaFmt(totals.crystal)}`);
  $("off-away").textContent = away;
  $("off-amounts").innerHTML = parts.map((p) => `<span class="offamt">${p}</span>`).join("");
  $("offline").classList.add("show");
  $("off-collect").onclick = () => {
    for (const b of BUILDINGS) metaCollect(b.key);
    updateCurBars(); SFX.levelup();
    $("offline").classList.remove("show");
  };
  return true;
}

/* ------------------------------------------------------------------ *
 *  MAIN LOOP (fixed timestep, pause on blur)
 * ------------------------------------------------------------------ */
let acc = 0, last = performance.now(), paused = false, userPaused = false;
addEventListener("blur", () => { paused = true; });
addEventListener("focus", () => { paused = false; last = performance.now(); });
function setPaused(p) {
  userPaused = p; last = performance.now();
  $("pause-overlay").classList.toggle("show", p);
  $("pause-btn").textContent = p ? "▶" : "⏸";
  if (!p) { $("pause-main").style.display = ""; $("pause-confirm").style.display = "none"; } // reset confirm view
}
function togglePause() {
  // LTW is always "started"; campaign must be mid-game (not on a result screen)
  if (G.ltw || (G.started && G.phase !== "lost" && G.phase !== "won")) setPaused(!userPaused);
}
function exitToMenu() {
  setPaused(false);
  closePopups();
  if (G.ltw) { ltExit(); }
  else { setMode("campaign"); newGame(); resize(); openHome(); }
}
$("pause-exit").onclick = () => { $("pause-main").style.display = "none"; $("pause-confirm").style.display = ""; };
$("pc-no").onclick = () => { $("pause-main").style.display = ""; $("pause-confirm").style.display = "none"; };
$("pc-yes").onclick = exitToMenu;
const devOn = new URLSearchParams(location.search).has("dev");
if (devOn) $("dev").style.display = "block";
let frames = 0, fpsAt = last, fps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!paused && !userPaused) {
    acc += (now - last) * (G.speed || 1);
    if (acc > 500) acc = 500;
    while (acc >= STEP) { G.ltw ? ltUpdate(STEP) : update(STEP); acc -= STEP; }
  }
  last = now;
  G.ltw ? ltRender() : render();
  syncHUDLight();
  if (devOn) { frames++; if (now - fpsAt >= 500) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; $("dev").textContent = fps + " fps · creeps " + G.creeps.length + " · tw " + G.towers.length; } }
}
// debug hook: lets a non-visible/throttled tab drive the sim & paint manually (harmless in prod)
window.__dbg = {
  step(n = 1) { for (let i = 0; i < n; i++) { G.ltw ? ltUpdate(STEP) : update(STEP); } },
  paint() { G.ltw ? ltRender() : render(); syncHUDLight(); },
  run(n = 1) { this.step(n); this.paint(); },
  state() { return { ltw: !!G.ltw, phase: G.phase, gold: G.gold, lives: G.lives, ai: G.aiLives, income: G.income, creeps: G.creeps.length, towers: G.towers.length, kills: G.kills, time: Math.round(G.time) }; },
  build(c, r, el) { return placeTower(c, r, el ? { base: "arrow", elems: [el], cost: PURE[el].cost } : { neutral: true, base: "arrow", cost: NEUTRAL.arrow.cost }); },
  send(type) { const before = G.aiLives; ltSend(type); return { income: G.income, gold: G.gold, outgoing: G.outgoing.length }; },
  routeLen() { return G.ltw ? ltTrace().length : -1; },
  creepRows() { return G.creeps.map((cr) => +(cr.y / CELL).toFixed(1)); },
  setGold(n) { G.gold = n; },
  winLevel() { if (!G.ltw) levelComplete(); },               // test hook
  startLevel(L) { setMode("campaign"); newGame(L); beginGame(); resize(); },
  mute(on = true) { MUTED = !!on; },
  tw(c, r) { return (G.grid && G.grid[r]) ? G.grid[r][c] : null; },
  infuse(c, r, el) { const t = G.grid[r][c]; return t ? infuseTower(t, el) : "no-tower"; },
  upTw(c, r) { const t = G.grid[r][c]; if (!t) return "no-tower"; const b = t.tier; upgradeTower(t); return { from: b, to: t.tier, elems: t.elems }; },
  sellTw(c, r) { const t = G.grid[r][c]; if (!t) return "no-tower"; sellTower(t); return G.grid[r][c] === null; },
  fuse(c1, r1, c2, r2) { const a = G.grid[r1][c1], b = G.grid[r2][c2]; if (!a || !b) return "missing"; return fuseTowers(a, b); },
  addSoul(n = 1) { G.souls = (G.souls || 0) + n; return G.souls; },
  levelEl(el) { if (G.souls > 0 && G.elementLvl[el] < 3) { G.souls--; G.elementLvl[el]++; } return { lvl: G.elementLvl[el], souls: G.souls }; },
  souls() { return G.souls; },
  mapInfo() { return { cells: PATH_CELLS, entrance: ENTRANCE, exit: EXIT, len: Math.round(PATH_LEN) }; },
  maxElements() { for (const e of EL) G.elementLvl[e] = 3; }, // simulate fully-souled player
  upgradeAll() { for (const t of G.towers) { while (canUpgrade(t)) { const before = t.tier; G.gold = 1e9; upgradeTower(t); if (t.tier === before) break; } } },
  towerStats() { return G.towers.map((t) => ({ el: t.neutral ? "arrow" : t.elems.join("+"), tier: t.tier, dmg: towerDef(t).dmg })); },
};
let hudClock = 0;
function syncHUDLight() { // cheap per-frame HUD refresh (gold/lives + the between-wave countdown)
  hudClock++;
  if (hudClock % 6 === 0) {
    if (G.ltw) { ltSyncHUD(); return; }
    $("hud-gold").textContent = G.gold; $("hud-lives").textContent = G.lives;
    if (G.phase === "between") updateStartBtn();
  }
}

/* ------------------------------------------------------------------ *
 *  BOOT
 * ------------------------------------------------------------------ */
applySettings();                                 // restore saved volume / mute first
const bootOfflineMin = (Date.now() - (META.ts || Date.now())) / 60000; // how long since last visit
newGame();
resize();
syncHUD();
$("home-points").textContent = CAMPAIGN.points; // show meta currency on the hub
metaAccrue(); saveMeta(); updateCurBars();       // bank offline idle income + show resource totals
maybeShowOffline(bootOfflineMin);                // "while you were away…" popup
setInterval(metaTickUI, 1000);                   // live idle tick (fills + counters)
// build tutorial text
$("tut-body").innerHTML = STR.tut.map((t, i) => `<p><b>${i + 1}.</b> ${t}</p>`).join("");
requestAnimationFrame(frame);
