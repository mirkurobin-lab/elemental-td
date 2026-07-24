/* ==================================================================
 * ARENA CARDS — Karten-Progression (Lv 1–100), Raritäten & Booster-Packs
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Implementiert exakt die Zahlen aus
 * arena_patches/DESIGN_PROGRESSION.md. Persistenz: localStorage
 * "arenaCards" (im Node-Selbsttest: In-Memory-Fallback).
 *
 * Raritäts-Leiter nach dem Vorbild "Arcane Arena" (Panteon/MWM):
 *   Gewöhnlich · Selten · Episch · Legendär · Relikt · Suprem
 * Die Farben (Grau/Grün/Blau/Lila/Orange/Rot) bleiben die UI-Sprache,
 * die Rarität ist der Name der Stufe. Siehe Design-Doku §"Verifizierte
 * AA-Referenz".
 *
 * WIRING:
 *   1. arena_pan.html — metaMul ERSETZEN:
 *        // alt:  const metaMul = Math.pow(1.12, (hub.coll[id].lvl||1) - 1);
 *        const cs = ArenaCards.get().cards[id];
 *        const metaMul = ArenaCards.statMul(cs ? cs.lvl : 1);
 *      (Bei Fusionen/Triples weiterhin das Durchschnitts-Level der
 *       Basis-Türme (mlvl) in statMul() geben — Fusionen haben keine
 *       eigenen Sammelkarten, siehe Design-Doku §B.)
 *   2. arena_profile.js — Pack-Vergabe umhängen:
 *        if (res.packAwarded) {
 *          const drops = ArenaCards.openPack('bronze', POOL_IDS, HERO_IDS);
 *          // drops = [{cardId, quality, copies}, …] → Pack-Screen zeigt sie
 *          // einzeln, pro Flip: ArenaCards.addCopies(d.cardId, d.copies);
 *        }
 *      shardsBank / PACK_SHARDS / LOSS_SHARDS / applyShardsToHub()
 *      STILLLEGEN — Packs droppen ab jetzt Karten-Kopien, keine Splitter.
 *   3. deck.html — Collection-Grid liest pro Karte:
 *        const t = ArenaCards.tierOf(c.lvl);      // {name,color,index}
 *        const p = ArenaCards.progress(id);       // {copies,needed,pct}
 *        const n = ArenaCards.toNextTier(id);     // "noch N Kopien bis EPISCH"
 *   4. Migration (EINMALIG, siehe Design-Doku §E):
 *        ArenaCards.migrateFromHub(JSON.parse(localStorage.arenaHub||'{}'));
 *      → newLvl = min(100, round(oldLvl * 5)).
 *
 * GOLD: wird NICHT von diesem Modul verwaltet. levelUp() zieht nur
 * Kopien ab; den Gold-Abzug macht der Aufrufer (Hub-Wallet), weil das
 * Gold-System hub-seitig in arenaHub liegt. goldFor(lvl) liefert den
 * Preis, canLevelUp(id, gold) prüft ihn mit.
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaCards";
  var MAX_LEVEL = 100;

  /* ---------- Raritäts-Stufen (Level-Bänder derselben Karte) ---------- */
  // copies/goldPer gelten für den Level-Up, der VON einem Level dieses
  // Bandes ausgeht (Lv19→20 kostet noch Gewöhnlich-Preis, Lv20→21 Selten).
  var TIERS = [
    { key: "common",    name: "Gewöhnlich", colorName: "Grau",   color: "#9aa3ad", min: 1,   max: 19,  copies: 2,  goldPer: 30,  index: 0 },
    { key: "rare",      name: "Selten",     colorName: "Grün",   color: "#58c26a", min: 20,  max: 39,  copies: 4,  goldPer: 45,  index: 1 },
    { key: "epic",      name: "Episch",     colorName: "Blau",   color: "#3d9df2", min: 40,  max: 59,  copies: 8,  goldPer: 60,  index: 2 },
    { key: "legendary", name: "Legendär",   colorName: "Lila",   color: "#a45ef2", min: 60,  max: 79,  copies: 15, goldPer: 80,  index: 3 },
    { key: "relic",     name: "Relikt",     colorName: "Orange", color: "#f2a13d", min: 80,  max: 99,  copies: 25, goldPer: 100, index: 4 },
    { key: "supreme",   name: "Suprem",     colorName: "Rot",    color: "#ff5e7e", min: 100, max: 100, copies: 50, goldFlat: 15000, index: 5 },
  ];
  // Lv100 ist Endstation; die 50 Kopien + 15000 Gold + 1 Arkan-Kern der
  // Suprem-Zeile sind die ASZENSION (finaler Freischalt-Schritt auf Lv100).
  var ASCENSION = { copies: 50, gold: 15000, cores: 1, coreName: "Arkan-Kern", mul: 1.15 };

  /* ---------- Stat-Kurve (ersetzt metaMul = 1.12^(lvl-1)) ---------- */
  var STAT_BASE = 1.018;   // pro Level
  var TIER_STEP = 1.10;    // pro Raritätsstufe

  /* ---------- Drop-Qualität = Bündelgröße eines Pack-Slots ---------- */
  var DROP_QUALITY = [
    { key: "common",    name: "Gewöhnlich", colorName: "Grau",   color: "#9aa3ad", copies: 1,   index: 0 },
    { key: "rare",      name: "Selten",     colorName: "Grün",   color: "#58c26a", copies: 3,   index: 1 },
    { key: "epic",      name: "Episch",     colorName: "Blau",   color: "#3d9df2", copies: 10,  index: 2 },
    { key: "legendary", name: "Legendär",   colorName: "Lila",   color: "#a45ef2", copies: 30,  index: 3 },
    { key: "relic",     name: "Relikt",     colorName: "Orange", color: "#f2a13d", copies: 100, index: 4 },
  ];

  /* ---------- Pack-Definitionen ---------- */
  // weights: [Gewöhnlich, Selten, Episch, Legendär, Relikt] in % (Summe 100)
  // guarantee: Mindest-Qualitätsindex, den mindestens EIN Slot erreicht
  var PACKS = {
    bronze: { key: "bronze", name: "Bronze-Pack", source: "Jeder 3. Sieg (arena_profile packAwarded)",
              slots: 6,  weights: [70, 24, 5, 0.9, 0.1], guarantee: 1 },
    silver: { key: "silver", name: "Silber-Pack", source: "1. Sieg des Tages + Daily-Quests",
              slots: 8,  weights: [50, 33, 14, 2.6, 0.4], guarantee: 2 },
    gold:   { key: "gold",   name: "Gold-Pack",   source: "Trophy-Road-Knoten, Rang-Aufstieg",
              slots: 10, weights: [30, 40, 22, 7, 1], guarantee: 3 },
    arcane: { key: "arcane", name: "Arkan-Pack",  source: "Season-Pass-Premium, Events",
              slots: 12, weights: [15, 35, 30, 16, 4], guarantee: 4 },
  };
  var PACK_ALIAS = { silber: "silver", arkan: "arcane", arcan: "arcane" };

  // Pity-Zähler. Feldnamen bleiben pityEpic/pityLegendary (State-Schema),
  // sie zielen aber auf die FARBEN Lila (=Legendär) und Orange (=Relikt).
  var PITY_EPIC = 20;        // Packs ohne Legendär+ → nächster Pack erzwingt Legendär
  var PITY_LEGENDARY = 60;   // Packs ohne Relikt → erzwingt Relikt
  var HERO_WEIGHT = 0.2;     // Helden-Kopien droppen 5× seltener
  var HERO_UNLOCK_COPIES = 10; // erste 10 Kopien eines neuen Helden = Unlock
  var DUST_PER_COPY = 1;     // Overflow: 1 überzählige Kopie = 1 Arkan-Staub
  var DUST_SHOP_COST = 150;  // 150 Staub = 1 beliebige Kopie im Shop

  /* ================= Level-Mathematik ================= */

  function clampLvl(l) {
    l = Math.floor(Number(l) || 1);
    if (l < 1) l = 1;
    if (l > MAX_LEVEL) l = MAX_LEVEL;
    return l;
  }

  function tierOf(lvl) {
    lvl = clampLvl(lvl);
    for (var i = 0; i < TIERS.length; i++) {
      if (lvl >= TIERS[i].min && lvl <= TIERS[i].max) {
        return { key: TIERS[i].key, name: TIERS[i].name, colorName: TIERS[i].colorName,
                 color: TIERS[i].color, index: TIERS[i].index };
      }
    }
    return { key: "common", name: "Gewöhnlich", colorName: "Grau", color: "#9aa3ad", index: 0 };
  }

  function tierDef(lvl) { return TIERS[tierOf(lvl).index]; }

  // statMul(lvl) = 1.018^(lvl-1) * 1.10^tierIndex   [* 1.15 bei Suprem-Aszension]
  // Lv1=1.00 · Lv20≈1.54 · Lv40≈2.43 · Lv60≈3.81 · Lv80≈5.99 · Lv100≈10.83
  function statMul(lvl, ascended) {
    lvl = clampLvl(lvl);
    var t = tierOf(lvl);
    var m = Math.pow(STAT_BASE, lvl - 1) * Math.pow(TIER_STEP, t.index);
    if (ascended === undefined) ascended = (lvl >= MAX_LEVEL);
    if (ascended && lvl >= MAX_LEVEL) m *= ASCENSION.mul;
    return m;
  }

  // Kopien für den Level-Up VON lvl. copiesFor(100) = Aszensions-Kosten.
  function copiesFor(lvl) { return tierDef(lvl).copies; }

  // Gold für den Level-Up VON lvl. goldFor(100) = 15000 (Aszension).
  function goldFor(lvl) {
    var t = tierDef(lvl);
    return t.goldFlat !== undefined ? t.goldFlat : t.goldPer * clampLvl(lvl);
  }

  // Kopien von Lv1 bis lvl (ohne Aszension). totalCopiesTo(100) = 1078.
  function totalCopiesTo(lvl) {
    lvl = clampLvl(lvl);
    var s = 0;
    for (var l = 1; l < lvl; l++) s += copiesFor(l);
    return s;
  }
  function totalGoldTo(lvl) {
    lvl = clampLvl(lvl);
    var s = 0;
    for (var l = 1; l < lvl; l++) s += goldFor(l);
    return s;
  }

  /* ================= Perk-Registry ================= */
  /* 8 Karten × 4 Raritäts-Aufstiege (Selten/Episch/Legendär/Relikt) × 2
   * Optionen = 64 Slots. Selten + Episch sind ausformuliert (32),
   * Legendär/Relikt bleiben leer = TBD nach Playtest. mod = maschinenlesbar:
   * {stat, mul} (multiplikativ) oder {stat, add} (additiv, auch negativ). */
  var PERKS = {
    fire: { // EMBER
      rare: [
        { id: "fire_rare_burnlen", txt: "+15% Burn-Dauer",   mod: { stat: "burnDuration", mul: 1.15 } },
        { id: "fire_rare_splash",  txt: "+8% Splash-Radius", mod: { stat: "splashRadius", mul: 1.08 } },
      ],
      epic: [
        { id: "fire_epic_stack",   txt: "Burn stapelt bis 3× statt 2×",       mod: { stat: "burnStacksMax", add: 1 } },
        { id: "fire_epic_exec",    txt: "+12% Schaden gegen brennende Ziele", mod: { stat: "dmgVsBurning", mul: 1.12 } },
      ],
      legendary: [], relic: [],
    },
    water: { // FROST
      rare: [
        { id: "water_rare_freeze", txt: "Freeze braucht 3 statt 4 Stacks", mod: { stat: "freezeStacksNeeded", add: -1 } },
        { id: "water_rare_slow",   txt: "+10% Slow",                       mod: { stat: "slowPct", mul: 1.10 } },
      ],
      epic: [
        { id: "water_epic_linger", txt: "Slow wirkt 1.5s länger nach",              mod: { stat: "slowDuration", add: 1.5 } },
        { id: "water_epic_shatter",txt: "Eingefrorene Ziele erleiden +20% Schaden", mod: { stat: "dmgVsFrozen", mul: 1.20 } },
      ],
      legendary: [], relic: [],
    },
    nature: { // STONE (Namens-Mapping aus dem Briefing — vor Einbau prüfen)
      rare: [
        { id: "nature_rare_tick",  txt: "Gift tickt 0.2s schneller", mod: { stat: "poisonTick", add: -0.2 } },
        { id: "nature_rare_range", txt: "+12% Reichweite",           mod: { stat: "range", mul: 1.12 } },
      ],
      epic: [
        { id: "nature_epic_root",  txt: "Wurzeln halten 0.5s länger",                mod: { stat: "rootDuration", add: 0.5 } },
        { id: "nature_epic_spread",txt: "Gift springt auf 1 zusätzliches Ziel über", mod: { stat: "poisonSpread", add: 1 } },
      ],
      legendary: [], relic: [],
    },
    earth: { // THORN (Namens-Mapping aus dem Briefing — vor Einbau prüfen)
      rare: [
        { id: "earth_rare_armor", txt: "-10% gegnerische Rüstung im Radius", mod: { stat: "armorShred", mul: 1.10 } },
        { id: "earth_rare_rate",  txt: "+8% Angriffstempo",                  mod: { stat: "attackSpeed", mul: 1.08 } },
      ],
      epic: [
        { id: "earth_epic_stun",  txt: "Jeder 6. statt 7. Treffer betäubt 0.4s", mod: { stat: "stunEvery", add: -1 } },
        { id: "earth_epic_heavy", txt: "+18% Schaden gegen Bosse",               mod: { stat: "dmgVsBoss", mul: 1.18 } },
      ],
      legendary: [], relic: [],
    },
    light: { // DAWN
      rare: [
        { id: "light_rare_crit",  txt: "+6% Kritchance",               mod: { stat: "critChance", add: 0.06 } },
        { id: "light_rare_aura",  txt: "+5% Schaden für Nachbartürme", mod: { stat: "auraDamage", mul: 1.05 } },
      ],
      epic: [
        { id: "light_epic_pierce",txt: "Strahl trifft 1 Ziel mehr",    mod: { stat: "pierceTargets", add: 1 } },
        { id: "light_epic_ult",   txt: "+12% Ult-Ladung pro Kill",     mod: { stat: "ultChargeGain", mul: 1.12 } },
      ],
      legendary: [], relic: [],
    },
    darkness: { // HOLLOW
      rare: [
        { id: "dark_rare_curse",  txt: "Fluch hält 1s länger",         mod: { stat: "curseDuration", add: 1 } },
        { id: "dark_rare_drain",  txt: "+10% Lebensraub auf die Burg", mod: { stat: "lifesteal", mul: 1.10 } },
      ],
      epic: [
        { id: "dark_epic_exec",   txt: "Hinrichtung unter 12% statt 8% HP",        mod: { stat: "executeThreshold", add: 0.04 } },
        { id: "dark_epic_chain",  txt: "Fluch springt beim Tod auf ein Ziel über", mod: { stat: "curseChain", add: 1 } },
      ],
      legendary: [], relic: [],
    },
    solara: { // Held
      rare: [
        { id: "solara_rare_ult",  txt: "-8% Ult-Abklingzeit",           mod: { stat: "ultCooldown", mul: 0.92 } },
        { id: "solara_rare_heal", txt: "+3% Burgheilung bei Boss-Kill", mod: { stat: "bossHeal", add: 0.03 } },
      ],
      epic: [
        { id: "solara_epic_beam", txt: "Sonnenstrahl +15% Breite",         mod: { stat: "beamWidth", mul: 1.15 } },
        { id: "solara_epic_aura", txt: "+7% Schaden für alle Licht-Türme", mod: { stat: "lightAura", mul: 1.07 } },
      ],
      legendary: [], relic: [],
    },
    magmor: { // Held
      rare: [
        { id: "magmor_rare_dmg",  txt: "+10% Ult-Schaden",                mod: { stat: "ultDamage", mul: 1.10 } },
        { id: "magmor_rare_burn", txt: "Ult zündet Burn auf allen Zielen", mod: { stat: "ultApplyBurn", add: 1 } },
      ],
      epic: [
        { id: "magmor_epic_wide", txt: "Lavafeld +20% Radius",       mod: { stat: "lavaRadius", mul: 1.20 } },
        { id: "magmor_epic_fast", txt: "+12% Ult-Ladung pro Welle",  mod: { stat: "ultChargePerWave", mul: 1.12 } },
      ],
      legendary: [], relic: [],
    },
  };
  // Raritäts-Aufstiege mit Perk-Wahl (ab Selten), Index = tierIndex-1
  var PERK_TIER_KEYS = ["rare", "epic", "legendary", "relic"];

  function perkChoices(cardId, tierKey) {
    var c = PERKS[cardId];
    if (!c || !c[tierKey]) return [];
    return c[tierKey].slice();
  }

  /* ================= Persistenz ================= */

  var memStore = null; // Node-Fallback

  function lsGet() {
    try {
      if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(KEY);
    } catch (e) {}
    return memStore;
  }
  function lsSet(v) {
    try {
      if (typeof localStorage !== "undefined" && localStorage) { localStorage.setItem(KEY, v); return; }
    } catch (e) {}
    memStore = v;
  }

  function fresh() {
    return { cards: {}, dust: 0, pityEpic: 0, pityLegendary: 0, packsOpened: 0, cores: 0, v: 1 };
  }
  function get() {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    if (!s.cards || typeof s.cards !== "object") s.cards = {};
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function cardIn(st, id) {
    if (!st.cards[id]) st.cards[id] = { lvl: 1, copies: 0, perks: [] };
    var c = st.cards[id];
    if (!Array.isArray(c.perks)) c.perks = [];
    c.lvl = clampLvl(c.lvl);
    c.copies = Math.max(0, c.copies | 0);
    return c;
  }
  function cardOf(id) { return get().cards[id] || { lvl: 1, copies: 0, perks: [], _empty: true }; }

  /* ================= Sammel-API ================= */

  // addCopies(id, n) → {copies, toDust, dust, lvl}
  // Overflow: auf Lv100 wird nur noch die Aszensions-Reserve (50) gehalten,
  // alles darüber (und alles nach der Aszension) wird zu Arkan-Staub.
  function addCopies(id, n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    var st = get(), c = cardIn(st, id), toDust = 0;
    if (c.lvl >= MAX_LEVEL) {
      var cap = c.asc ? 0 : ASCENSION.copies;
      var room = Math.max(0, cap - c.copies);
      var used = Math.min(room, n);
      c.copies += used;
      toDust = (n - used) * DUST_PER_COPY;
      st.dust += toDust;
    } else {
      c.copies += n;
    }
    save(st);
    return { copies: c.copies, toDust: toDust, dust: st.dust, lvl: c.lvl };
  }

  // Held freigeschaltet? (erste 10 Kopien = Unlock)
  function isUnlocked(id, isHero) {
    var c = cardOf(id);
    if (!isHero) return !c._empty;
    return (c.lvl > 1) || (c.copies >= HERO_UNLOCK_COPIES);
  }

  // needed = Kopien für den nächsten Level-Up (auf Lv100: Aszension)
  function progress(id) {
    var c = cardOf(id);
    var needed = copiesFor(c.lvl);
    var pct = needed > 0 ? Math.min(1, c.copies / needed) : 1;
    return { copies: c.copies, needed: needed, pct: pct, lvl: c.lvl };
  }

  // "noch N Kopien bis EPISCH" — Kopien+Level bis zum nächsten Raritätssprung
  function toNextTier(id) {
    var c = cardOf(id);
    var ti = tierOf(c.lvl).index;
    if (ti >= TIERS.length - 1) return null;
    var next = TIERS[ti + 1];
    var need = 0;
    for (var l = c.lvl; l < next.min; l++) need += copiesFor(l);
    need -= c.copies;
    return { tier: { key: next.key, name: next.name, colorName: next.colorName,
                     color: next.color, index: next.index },
             levels: next.min - c.lvl, copies: Math.max(0, need) };
  }

  // canLevelUp(id, goldAvailable) → {ok, reason, needCopies, needGold, lvl}
  // goldAvailable weglassen ⇒ Gold wird nicht geprüft.
  function canLevelUp(id, goldAvailable) {
    var c = cardOf(id);
    var out = { ok: false, reason: "", lvl: c.lvl, needCopies: copiesFor(c.lvl), needGold: goldFor(c.lvl) };
    if (c.lvl >= MAX_LEVEL) { out.reason = "max"; return out; }
    if (c.copies < out.needCopies) { out.reason = "copies"; return out; }
    if (goldAvailable !== undefined && goldAvailable !== null && goldAvailable < out.needGold) {
      out.reason = "gold"; return out;
    }
    out.ok = true;
    return out;
  }

  // levelUp(id) → {newLvl, tierUp, perkChoiceDue, goldSpent, perkTier} | null
  // Zieht NUR Kopien ab. Gold-Abzug macht der Aufrufer (Hub-Wallet)!
  function levelUp(id) {
    var st = get(), c = cardIn(st, id);
    if (c.lvl >= MAX_LEVEL) return null;
    var need = copiesFor(c.lvl);
    if (c.copies < need) return null;
    var gold = goldFor(c.lvl);
    var before = tierOf(c.lvl).index;
    c.copies -= need;
    c.lvl += 1;
    // Auf Lv100 bleibt nur die Aszensions-Reserve stehen, Rest → Staub
    var toDust = 0;
    if (c.lvl >= MAX_LEVEL && c.copies > ASCENSION.copies) {
      toDust = (c.copies - ASCENSION.copies) * DUST_PER_COPY;
      c.copies = ASCENSION.copies;
      st.dust += toDust;
    }
    var after = tierOf(c.lvl);
    var tierUp = after.index > before;
    // Perk-Wahl ab Selten bei jedem Raritäts-Aufstieg
    var perkTier = tierUp && after.index >= 1 ? PERK_TIER_KEYS[after.index - 1] : null;
    var due = !!(perkTier && perkChoices(id, perkTier).length > 0);
    if (due && c.perks.length >= after.index) due = false; // schon gewählt
    save(st);
    return { newLvl: c.lvl, tierUp: tierUp, tier: after, perkChoiceDue: due,
             perkTier: perkTier, choices: perkTier ? perkChoices(id, perkTier) : [],
             goldSpent: gold, toDust: toDust };
  }

  // Suprem-Aszension: 50 Kopien + 15000 Gold + 1 Arkan-Kern → statMul ×1.15
  function canAscend(id, goldAvailable, coresAvailable) {
    var st = get(), c = cardIn(st, id);
    if (c.lvl < MAX_LEVEL || c.asc) return { ok: false, reason: c.asc ? "done" : "level" };
    if (c.copies < ASCENSION.copies) return { ok: false, reason: "copies" };
    if (goldAvailable !== undefined && goldAvailable < ASCENSION.gold) return { ok: false, reason: "gold" };
    if (coresAvailable !== undefined && coresAvailable < ASCENSION.cores) return { ok: false, reason: "core" };
    return { ok: true, reason: "", needCopies: ASCENSION.copies, needGold: ASCENSION.gold, needCores: ASCENSION.cores };
  }
  function ascend(id) {
    var st = get(), c = cardIn(st, id);
    if (c.lvl < MAX_LEVEL || c.asc || c.copies < ASCENSION.copies) return null;
    c.copies -= ASCENSION.copies;
    c.asc = 1;
    save(st);
    return { ascended: true, goldSpent: ASCENSION.gold, coresSpent: ASCENSION.cores, statMul: statMul(MAX_LEVEL, true) };
  }

  // choosePerk(id, perkId) → true, wenn gespeichert
  function choosePerk(id, perkId) {
    var reg = PERKS[id];
    if (!reg) return false;
    var found = null;
    for (var t = 0; t < PERK_TIER_KEYS.length; t++) {
      var arr = reg[PERK_TIER_KEYS[t]] || [];
      for (var i = 0; i < arr.length; i++) if (arr[i].id === perkId) found = arr[i];
    }
    if (!found) return false;
    var st = get(), c = cardIn(st, id);
    if (c.perks.indexOf(perkId) >= 0) return false;
    c.perks.push(perkId);
    save(st);
    return true;
  }
  function clearPerks(id) { // Respec (Gold-Kosten hub-seitig)
    var st = get(), c = cardIn(st, id);
    c.perks = [];
    save(st);
    return true;
  }
  // Aktive Mods einer Karte, gebündelt für die Match-Engine
  function modsOf(id) {
    var c = cardOf(id), reg = PERKS[id] || {}, out = {};
    for (var t = 0; t < PERK_TIER_KEYS.length; t++) {
      var arr = reg[PERK_TIER_KEYS[t]] || [];
      for (var i = 0; i < arr.length; i++) {
        if (c.perks.indexOf(arr[i].id) < 0) continue;
        var m = arr[i].mod;
        if (!m) continue;
        if (!out[m.stat]) out[m.stat] = { mul: 1, add: 0 };
        if (m.mul !== undefined) out[m.stat].mul *= m.mul;
        if (m.add !== undefined) out[m.stat].add += m.add;
      }
    }
    return out;
  }

  /* ================= Packs ================= */

  function normType(type) {
    var t = String(type || "bronze").toLowerCase();
    return PACKS[t] ? t : (PACK_ALIAS[t] || "bronze");
  }

  function rollQuality(weights, rng) {
    var sum = 0, i;
    for (i = 0; i < weights.length; i++) sum += weights[i];
    var r = rng() * sum, acc = 0;
    for (i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r < acc) return i;
    }
    return 0;
  }

  // Karte je Slot: uniform aus dem Pool, Helden mit Gewicht 1/5
  function rollCard(poolIds, heroIds, rng) {
    var heroes = heroIds || [], w = [], total = 0, i;
    for (i = 0; i < poolIds.length; i++) {
      var wt = heroes.indexOf(poolIds[i]) >= 0 ? HERO_WEIGHT : 1;
      w.push(wt); total += wt;
    }
    var r = rng() * total, acc = 0;
    for (i = 0; i < poolIds.length; i++) {
      acc += w[i];
      if (r < acc) return poolIds[i];
    }
    return poolIds[poolIds.length - 1];
  }

  /* openPack(type, poolIds, heroIds, rng) → [{cardId, quality, copies}]
   * Fügt die Kopien NICHT automatisch hinzu — die Pack-Zeremonie ruft pro
   * Flip addCopies(). Pity-Zähler und packsOpened werden hier persistiert. */
  function openPack(type, poolIds, heroIds, rng) {
    rng = rng || Math.random;
    var def = PACKS[normType(type)];
    poolIds = (poolIds && poolIds.length) ? poolIds : Object.keys(PERKS);
    var st = get(), i;

    var slots = [];
    for (i = 0; i < def.slots; i++) slots.push(rollQuality(def.weights, rng));

    function best() { var b = 0; for (var j = 0; j < slots.length; j++) if (slots[j] > b) b = slots[j]; return b; }
    function force(minIdx) {
      if (best() >= minIdx) return;
      slots[Math.floor(rng() * slots.length)] = minIdx;
    }
    // 1) Pity (Relikt vor Legendär — der stärkere Zwang deckt den schwächeren mit ab)
    var pityHit = null;
    if (st.pityLegendary >= PITY_LEGENDARY && best() < 4) { force(4); pityHit = "relic"; }
    if (st.pityEpic >= PITY_EPIC && best() < 3) { force(3); pityHit = pityHit || "legendary"; }
    // 2) Pack-Garantie
    force(def.guarantee);

    var b = best();
    st.pityEpic = b >= 3 ? 0 : st.pityEpic + 1;
    st.pityLegendary = b >= 4 ? 0 : st.pityLegendary + 1;
    st.packsOpened += 1;
    save(st);

    var out = [];
    for (i = 0; i < slots.length; i++) {
      var q = DROP_QUALITY[slots[i]];
      out.push({ cardId: rollCard(poolIds, heroIds, rng), quality: q.key, qualityName: q.name,
                 qualityIndex: q.index, color: q.color, copies: q.copies });
    }
    out.pity = pityHit;
    out.packType = def.key;
    return out;
  }

  /* Staub-Shop: 150 Staub = 1 Kopie einer beliebigen Karte */
  function spendDust(id, copies) {
    copies = Math.max(1, Math.floor(copies || 1));
    var st = get();
    var cost = copies * DUST_SHOP_COST;
    if (st.dust < cost) return null;
    st.dust -= cost;
    save(st);
    addCopies(id, copies);
    return { spent: cost, dust: get().dust, copies: copies };
  }

  /* ================= Migration ================= */
  // Alte arenaHub.coll[id].lvl (1..~20, Kurve 1.12^(lvl-1)) → neue Leiter.
  function migrateFromHub(hub) {
    var st = get();
    if (st.migrated) return { skipped: true, cards: 0 };
    var coll = (hub && hub.coll) || {}, n = 0;
    for (var id in coll) {
      if (!Object.prototype.hasOwnProperty.call(coll, id)) continue;
      var old = Math.max(1, Number((coll[id] || {}).lvl) || 1);
      var c = cardIn(st, id);
      c.lvl = clampLvl(Math.round(old * 5));
      c.copies = 0;
      n++;
    }
    st.migrated = 1;
    save(st);
    return { skipped: false, cards: n };
  }

  /* ================= Export ================= */
  var API = {
    // Konstanten
    TIERS: TIERS, DROP_QUALITY: DROP_QUALITY, PACKS: PACKS, PERKS: PERKS,
    ASCENSION: ASCENSION, MAX_LEVEL: MAX_LEVEL,
    PITY_EPIC: PITY_EPIC, PITY_LEGENDARY: PITY_LEGENDARY,
    HERO_WEIGHT: HERO_WEIGHT, HERO_UNLOCK_COPIES: HERO_UNLOCK_COPIES,
    DUST_SHOP_COST: DUST_SHOP_COST,
    // Mathe
    statMul: statMul, tierOf: tierOf, copiesFor: copiesFor, goldFor: goldFor,
    totalCopiesTo: totalCopiesTo, totalGoldTo: totalGoldTo,
    // Bank
    get: get, addCopies: addCopies, progress: progress, toNextTier: toNextTier,
    canLevelUp: canLevelUp, levelUp: levelUp, canAscend: canAscend, ascend: ascend,
    choosePerk: choosePerk, clearPerks: clearPerks, modsOf: modsOf,
    perkChoices: perkChoices, isUnlocked: isUnlocked, spendDust: spendDust,
    // Packs / Migration
    openPack: openPack, migrateFromHub: migrateFromHub,
    _key: KEY, _reset: function () { save(fresh()); },
  };

  if (typeof window !== "undefined") window.ArenaCards = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ================= Selbsttest (node arena_patches/arena_cards.js) ========= */
  if (typeof window === "undefined") {
    var fail = 0;
    var check = function (label, cond, info) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (info !== undefined ? "  " + info : ""));
      if (!cond) fail++;
    };
    var mulberry32 = function (a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    var r2 = function (x) { return Math.round(x * 100) / 100; };
    var pad = function (s, n) { s = String(s); while (s.length < n) s += " "; return s; };
    var padL = function (s, n) { s = String(s); while (s.length < n) s = " " + s; return s; };

    console.log("\n=== ARENA CARDS — Selbsttest ===\n");
    console.log("Level-Kurve (statMul):");
    [1, 20, 40, 60, 80, 100].forEach(function (l) {
      console.log("  Lv" + padL(l, 3) + "  " + r2(statMul(l)) + "x   [" + tierOf(l).name + " / " + tierOf(l).colorName + "]");
    });
    check("statMul(1) == 1", Math.abs(statMul(1) - 1) < 1e-9, r2(statMul(1)));
    check("statMul(100) in [9,12]", statMul(100) > 9 && statMul(100) < 12, r2(statMul(100)));
    check("statMul monoton steigend", (function () {
      for (var l = 2; l <= 100; l++) if (statMul(l) <= statMul(l - 1)) return false;
      return true;
    })());

    var tc = totalCopiesTo(100);
    console.log("\nKosten bis Lv100: " + tc + " Kopien (+" + ASCENSION.copies + " Aszension = " +
      (tc + ASCENSION.copies) + "), " + totalGoldTo(100) +
      " Gold (+" + ASCENSION.gold + " = " + (totalGoldTo(100) + ASCENSION.gold) + ")");
    check("totalCopiesTo(100) in [1000,1300]", tc >= 1000 && tc <= 1300, tc);
    check("Kopien-Bänder 38/80/160/300/500", (function () {
      var b = [0, 0, 0, 0, 0];
      for (var l = 1; l < 100; l++) b[tierOf(l).index] += copiesFor(l);
      console.log("       Bänder: " + b.join(" / "));
      return b[0] === 38 && b[1] === 80 && b[2] === 160 && b[3] === 300 && b[4] === 500;
    })());
    check("Pack-Gewichte summieren auf 100", Object.keys(PACKS).every(function (k) {
      return Math.abs(PACKS[k].weights.reduce(function (a, b) { return a + b; }, 0) - 100) < 1e-9;
    }));
    check("64 Perk-Slots (8 Karten × 4 Stufen × 2)", Object.keys(PERKS).length * 4 * 2 === 64,
      Object.keys(PERKS).length * 4 * 2);
    check("≥16 Perks ausformuliert", (function () {
      var n = 0;
      for (var id in PERKS) PERK_TIER_KEYS.forEach(function (t) { n += (PERKS[id][t] || []).length; });
      console.log("       ausformuliert: " + n + " / 64");
      return n >= 16;
    })());

    // --- 10.000 Bronze-Packs ---
    API._reset();
    var rng = mulberry32(20260724);
    var POOL = ["fire", "water", "nature", "earth", "light", "darkness", "solara", "magmor"];
    var HEROES = ["solara", "magmor"];
    var N = 10000, qc = [0, 0, 0, 0, 0], slotsTotal = 0, copiesTotal = 0, heroSlots = 0;
    var pityEpicHits = 0, pityLegHits = 0, streakNoEpic = 0, maxStreakNoEpic = 0;
    var streakNoLeg = 0, maxStreakNoLeg = 0, packsWithRarePlus = 0;
    for (var p = 0; p < N; p++) {
      var drops = openPack("bronze", POOL, HEROES, rng);
      if (drops.pity === "legendary") pityEpicHits++;
      if (drops.pity === "relic") pityLegHits++;
      var b2 = -1, hasRare = false;
      for (var s = 0; s < drops.length; s++) {
        qc[drops[s].qualityIndex]++; slotsTotal++; copiesTotal += drops[s].copies;
        if (HEROES.indexOf(drops[s].cardId) >= 0) heroSlots++;
        if (drops[s].qualityIndex > b2) b2 = drops[s].qualityIndex;
        if (drops[s].qualityIndex >= 1) hasRare = true;
      }
      if (hasRare) packsWithRarePlus++;
      streakNoEpic = b2 >= 3 ? 0 : streakNoEpic + 1;
      maxStreakNoEpic = Math.max(maxStreakNoEpic, streakNoEpic);
      streakNoLeg = b2 >= 4 ? 0 : streakNoLeg + 1;
      maxStreakNoLeg = Math.max(maxStreakNoLeg, streakNoLeg);
    }
    console.log("\n10.000 Bronze-Packs (" + slotsTotal + " Slots):");
    var expect = [68.0, 25.96, 5.0, 0.9, 0.1]; // inkl. Selten-Garantie, ohne Pity
    DROP_QUALITY.forEach(function (q, i) {
      console.log("  " + pad(q.name + " (" + q.colorName + ")", 20) +
        padL((qc[i] / slotsTotal * 100).toFixed(3), 7) +
        " %   (erwartet ~" + expect[i] + " %)   " + qc[i] + " Slots");
    });
    console.log("  Ø Kopien/Pack: " + r2(copiesTotal / N) + "   Helden-Slots: " +
      (heroSlots / slotsTotal * 100).toFixed(2) + " % (Soll 6.25 %)");
    console.log("  Pity ausgelöst: Legendär " + pityEpicHits + "×, Relikt " + pityLegHits + "×");
    console.log("  längste Durststrecke: " + maxStreakNoEpic + " Packs ohne Legendär+, " +
      maxStreakNoLeg + " ohne Relikt");
    check("Selten-Garantie: jedes Pack hat ≥1 Selten+", packsWithRarePlus === N, packsWithRarePlus + "/" + N);
    check("Gewöhnlich-Quote ~68 % (±2 pp)", Math.abs(qc[0] / slotsTotal * 100 - 68.0) < 2);
    check("Episch-Quote ~5 % (±1 pp)", Math.abs(qc[2] / slotsTotal * 100 - 5.0) < 1);
    check("Helden-Quote ~6.25 % (±1 pp)", Math.abs(heroSlots / slotsTotal * 100 - 6.25) < 1);
    check("Pity Legendär greift: nie >" + PITY_EPIC + " Packs ohne Legendär+", maxStreakNoEpic <= PITY_EPIC, maxStreakNoEpic);
    check("Pity Relikt greift: nie >" + PITY_LEGENDARY + " Packs ohne Relikt", maxStreakNoLeg <= PITY_LEGENDARY, maxStreakNoLeg);

    // --- Bank-Mechanik ---
    API._reset();
    addCopies("fire", 2);
    var lu = levelUp("fire");
    check("levelUp Lv1→2 kostet 2 Kopien", !!lu && lu.newLvl === 2 && progress("fire").copies === 0);
    check("kein Level-Up ohne Kopien", levelUp("fire") === null);
    check("canLevelUp meldet Kopien-Mangel", canLevelUp("fire", 0).reason === "copies");
    API._reset();
    addCopies("fire", 5000);
    var perkDue = 0;
    for (var i2 = 0; i2 < 99; i2++) {
      var r = levelUp("fire");
      if (r && r.perkChoiceDue) perkDue++;
    }
    check("Lv100 erreicht", cardOf("fire").lvl === 100, cardOf("fire").lvl);
    check("Perk-Wahl bei jedem Raritäts-Aufstieg (Selten/Episch ausformuliert)", perkDue === 2, perkDue);
    check("choosePerk speichert", choosePerk("fire", "fire_rare_burnlen") === true);
    check("choosePerk lehnt Unbekanntes ab", choosePerk("fire", "nope_x") === false);
    check("modsOf liefert burnDuration ×1.15", r2((modsOf("fire").burnDuration || {}).mul) === 1.15);
    var d0 = get().dust;
    addCopies("fire", 200);
    var st2 = get();
    check("Overflow→Staub (Reserve 50 bleibt)", st2.cards.fire.copies === 50 && st2.dust - d0 === 200,
      "copies=" + st2.cards.fire.copies + " dust+=" + (st2.dust - d0));
    check("Aszension möglich", canAscend("fire").ok === true);
    ascend("fire");
    addCopies("fire", 10);
    check("nach Aszension geht alles in Staub", get().cards.fire.copies === 0);
    check("statMul(100,false) < statMul(100,true)", statMul(100, false) < statMul(100, true),
      r2(statMul(100, false)) + " < " + r2(statMul(100, true)));
    API._reset();
    var mig = migrateFromHub({ coll: { fire: { lvl: 8 }, water: { lvl: 1 }, light: { lvl: 25 } } });
    check("Migration ×5 mit Cap 100", get().cards.fire.lvl === 40 && get().cards.water.lvl === 5 &&
      get().cards.light.lvl === 100, "migriert=" + mig.cards + " fire=" + get().cards.fire.lvl +
      " water=" + get().cards.water.lvl + " light=" + get().cards.light.lvl);
    check("Migration läuft nur einmal", migrateFromHub({ coll: { fire: { lvl: 2 } } }).skipped === true);

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
