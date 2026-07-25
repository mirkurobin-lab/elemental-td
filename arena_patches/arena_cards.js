/* ==================================================================
 * ARENA CARDS v2.1 — Merge-Raritäten + Material-SORTEN (AA-verifiziert)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Modell nach der per Video-Analyse
 * verifizierten Mechanik von "Arcane Arena TD", siehe
 * arena_patches/AA_UI_REFERENZ.md §2 / §4 / §5 / §7.1 / §12.3.
 *
 * ZWEI GETRENNTE ACHSEN pro Karte:
 *   A) RARITÄT via MERGE  — 3 IDENTISCHE Karten gleicher Stufe → 1 Karte
 *      der nächsten Stufe. Der Merge hebt das LEVEL-CAP und schaltet
 *      einen permanenten, kartenspezifischen BONUS frei.
 *   B) LEVEL via MATERIAL — Level-Ups kosten Upgrade-Material in DREI
 *      SORTEN (3-8 Stück je nach Stufe) + Gold (Plateau-Kurve).
 *      Kartenkopien werden für Level-Ups NICHT verbraucht.
 *
 * ⚠ ERSETZT das v1-Modell (Kopien+Gold pro Level, Rarität = Level-Band).
 *   Das war eine Fehlannahme vor der Videoanalyse; siehe DESIGN_PROGRESSION.md.
 *
 * ⚠ STATE v3 (2026-07-25, Video-6-Befunde §12.3 / §7.1):
 *   Upgrade-Material ist in AA NICHT generisch, sondern ≥8 Sorten mit
 *   Kategorie-Labels ("speed", "special"). Für unseren 8-Karten-Pool
 *   passend dimensioniert: DREI Sorten (MATERIALS), je Karte über
 *   materialTypeOf(cardId) fest zugeordnet. `state.material` (eine Zahl)
 *   wird zu `state.materials = {attack, speed, special}`; die Migration
 *   v2→v3 verteilt den Altbestand gleichmäßig.
 *   Ebenfalls neu: getPityStatus() — AA zeigt den Pity-Counter OFFEN auf
 *   der Truhe an ("Get Legendary in ~50 opens", §8.2), wir machen unseren
 *   deshalb auch sichtbar.
 *
 * WIRING:
 *   1. arena_pan.html — metaMul ERSETZEN:
 *        // alt:  const metaMul = Math.pow(1.12, (hub.coll[id].lvl||1) - 1);
 *        const cs = ArenaCards.get().cards[id];
 *        const metaMul = cs ? ArenaCards.statMul(cs.lvl, cs.mergeBoni) : 1;
 *      (Fusionen/Triples: weiterhin das Durchschnitts-Level der Basis-
 *       Türme (mlvl) in statMul() geben — sie haben keine eigenen Karten.)
 *   2. arena_profile.js — Pack-Vergabe umhängen:
 *        if (res.packAwarded) {
 *          const p = ArenaCards.openPack('bronze', POOL_IDS, HERO_IDS);
 *          // p.cards = [{cardId, tier, …}] → Pack-Screen flippt einzeln,
 *          // pro Flip: ArenaCards.addDrop(d.cardId, d.tier, 1);
 *          // p.materialSlots = [{type, amount, name, sym}] → pro Flip:
 *          //   ArenaCards.addMaterial(slot.amount, slot.type);
 *          // danach: hubGold += p.gold;
 *        }
 *      shardsBank / PACK_SHARDS / LOSS_SHARDS / applyShardsToHub()
 *      STILLLEGEN — Packs droppen Karten, Material und Gold.
 *   3. deck.html / ui_prototype.html — Collection-Grid liest pro Karte:
 *        const c = ArenaCards.get().cards[id];
 *        const t = ArenaCards.tierOf(c.tier);        // {name,color,cap,index}
 *        const m = ArenaCards.progressToNextMerge(id);// {have,need,ready}
 *        const up = ArenaCards.canLevelUp(id, gold); // {ok,reason,needMaterial,
 *                                                    //  materialType,haveMaterial,needGold}
 *        const mt = ArenaCards.materialTypeOf(id);   // 'attack'|'speed'|'special'
 *        const bank = ArenaCards.getMaterials();     // {attack,speed,special,total}
 *      Pack-Screen zeigt zusätzlich den OFFENEN Pity-Stand (AA-Muster §8.2):
 *        const p = ArenaCards.getPityStatus();       // {epicIn, legendaryIn}
 *   4. Migration (EINMALIG, beim Hub-Start):
 *        ArenaCards.migrateV1();   // v1 → v2 → v3, in einem Durchlauf
 *
 * GOLD wird NICHT von diesem Modul verwaltet (state.gold bleibt bewusst
 * null). Das Gold-Konto liegt hub-seitig in arenaHub; goldFor(lvl) liefert
 * den Preis, canLevelUp(id, gold) prüft ihn mit, levelUp() zieht nur
 * Material ab und meldet den fälligen Gold-Betrag zurück.
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaCards";
  var STATE_VERSION = 3;
  var MAX_LEVEL = 100;
  var MERGE_COST = 3; // 3 identische Karten gleicher Stufe → 1 der nächsten

  /* ---------- Raritätsleiter (6 Stufen, Cap-Schrittweite 15) ----------
   * AA belegt: Good → Cap 20, Rare → Cap 30 (Schrittweite 10 bei 5 Stufen).
   * Wir haben 6 Stufen und die Vorgabe "bis Lv 100" → Schrittweite 15,
   * Start bei 25. Begründung siehe DESIGN_PROGRESSION.md §B. */
  var TIERS = [
    { key: "common",    name: "Gewöhnlich", colorName: "Grau",   color: "#9aa3ad", cap: 25,  index: 0 },
    { key: "good",      name: "Gut",        colorName: "Grün",   color: "#58c26a", cap: 40,  index: 1 },
    { key: "rare",      name: "Selten",     colorName: "Blau",   color: "#3d9df2", cap: 55,  index: 2 },
    { key: "epic",      name: "Episch",     colorName: "Lila",   color: "#a45ef2", cap: 70,  index: 3 },
    { key: "legendary", name: "Legendär",   colorName: "Orange", color: "#f2a13d", cap: 85,  index: 4 },
    { key: "supreme",   name: "Suprem",     colorName: "Rot",    color: "#ff5e7e", cap: 100, index: 5 },
  ];
  var TIER_KEYS = TIERS.map(function (t) { return t.key; });
  var TIER_BY_KEY = {};
  TIERS.forEach(function (t) { TIER_BY_KEY[t.key] = t; });

  /* ---------- Material-SORTEN (AA-Befund §7.1 / §12.3) ----------
   * Video 6 zeigt im RESOURCES-Raster ≥8 unabhängige Materialsorten mit
   * Kategorie-Labels ("speed", "special") — Upgrade-Material ist NICHT
   * generisch. Für unseren Pool von 8 Karten wären 8 Sorten Overkill
   * (jede Sorte hätte genau einen Abnehmer und der Vorrat wäre nie eine
   * Entscheidung). DREI Sorten mit je 2-4 Abnehmern erzeugen dagegen
   * echte Konkurrenz: "reicht meine Tempo-Essenz für FROST oder DAWN?".
   * Skaliert mit dem Pool-Wachstum — bei 20+ Karten kommen Sorten dazu. */
  var MATERIALS = [
    { key: "attack",  name: "Angriffs-Essenz", sym: "⚔️", color: "#ff8a5c" },
    { key: "speed",   name: "Tempo-Essenz",    sym: "⚡",  color: "#63d0ee" },
    { key: "special", name: "Spezial-Essenz",  sym: "✨",  color: "#c39bff" },
  ];
  var MATERIAL_KEYS = MATERIALS.map(function (m) { return m.key; });
  var MATERIAL_BY_KEY = {};
  MATERIALS.forEach(function (m) { MATERIAL_BY_KEY[m.key] = m; });

  /* Karte → Sorte. Zuordnung nach Element-Rolle, nicht nach Farbe:
   *   fire/earth  → attack  (die beiden reinen Schadensbringer)
   *   water/light → speed   (Slow/Support, beide über Tempo skaliert)
   *   nature/darkness → special (Gift/Fluch = Status-Effekt-Türme)
   *   Helden (solara/magmor) → special (Ults sind Spezialeffekte)
   * Unbekannte IDs (Skills, Items, Trick-Karten später) → 'special'. */
  var CARD_MATERIAL = {
    fire: "attack", earth: "attack",
    water: "speed", light: "speed",
    nature: "special", darkness: "special",
    solara: "special", magmor: "special",
  };
  function materialTypeOf(cardId) {
    var k = CARD_MATERIAL[cardId];
    return MATERIAL_BY_KEY[k] ? k : "special";
  }
  // materialInfoOf(cardId) → {key, name, sym, color}
  function materialInfoOf(cardId) {
    var d = MATERIAL_BY_KEY[materialTypeOf(cardId)];
    return { key: d.key, name: d.name, sym: d.sym, color: d.color };
  }

  /* ---------- Stat-Kurve ----------
   * statMul(lvl) = 1.022^(lvl-1), Lv100 ≈ 8.62×.
   * Merge-Boni multiplizieren kartenspezifisch dazu (Feld `pw` je Bonus). */
  var STAT_BASE = 1.022;

  /* ---------- Gold-Plateaus (Kosten des Level-Ups AB diesem Level) ----------
   * AA-Beleg: 8000 Gold bei Lv15/16 (Good/Rare). Wir liegen bei Lv15 mit 600
   * bewusst darunter und erreichen 8000 erst bei Lv31-35 — kalibrierbar,
   * sobald echte Telemetrie vorliegt (siehe DESIGN_PROGRESSION.md §B). */
  var GOLD_BANDS = [
    { to: 5,   gold: 100 },    { to: 10,  gold: 250 },    { to: 15,  gold: 600 },
    { to: 20,  gold: 1500 },   { to: 25,  gold: 3000 },   { to: 30,  gold: 5000 },
    { to: 35,  gold: 8000 },   { to: 40,  gold: 12000 },  { to: 50,  gold: 18000 },
    { to: 60,  gold: 26000 },  { to: 70,  gold: 38000 },  { to: 80,  gold: 55000 },
    { to: 90,  gold: 80000 },  { to: 100, gold: 120000 },
  ];

  /* ---------- Pack-Definitionen ----------
   * weights: [Gewöhnlich, Gut, Selten, Episch, Legendär] in % (Summe 100).
   * SUPREM droppt NIE — nur über Merge erreichbar.
   * guarantee: Mindest-Stufenindex, den mindestens EIN Kartenslot erreicht.
   * Kommunikation im UI über Raritätsspannen ("Enthält mindestens eine Gute
   * Karte oder besser"), nicht über Prozente — AA-Muster, siehe §8.2. */
  var PACKS = {
    bronze: { key: "bronze", name: "Bronze-Pack", color: "#c98a52",
              source: "Jeder 3. Sieg (arena_profile packAwarded)",
              cardSlots: 5,  materialSlots: 2, gold: [400, 800],
              weights: [82, 15, 2.6, 0.36, 0.04], guarantee: 1,
              promise: "Enthält mindestens eine Gute Karte oder besser" },
    silver: { key: "silver", name: "Silber-Pack", color: "#c9d2da",
              source: "1. Sieg des Tages + Daily-Quests",
              cardSlots: 7,  materialSlots: 3, gold: [1200, 2500],
              weights: [62, 28, 8.4, 1.4, 0.2], guarantee: 2,
              promise: "Enthält mindestens eine Seltene Karte oder besser" },
    gold:   { key: "gold",   name: "Gold-Pack",   color: "#f2c53d",
              source: "Trophy-Road-Knoten, Rang-Aufstieg",
              cardSlots: 9,  materialSlots: 4, gold: [4000, 8000],
              weights: [38, 38, 18.4, 4.6, 1], guarantee: 3,
              promise: "Enthält mindestens eine Epische Karte oder besser" },
    arcane: { key: "arcane", name: "Arkan-Pack",  color: "#a45ef2",
              source: "Season-Pass-Premium, Events",
              cardSlots: 11, materialSlots: 6, gold: [12000, 25000],
              weights: [18, 34, 29, 15, 4], guarantee: 4,
              promise: "Enthält mindestens eine Legendäre Karte" },
  };
  var PACK_ALIAS = { silber: "silver", arkan: "arcane", arcan: "arcane", bronce: "bronze" };

  var MATERIAL_PER_SLOT = [2, 5];  // pro Material-Slot 2-5 Stück
  var PITY_EPIC = 25;              // Packs ohne Episch+ → nächster erzwingt Episch
  var PITY_LEGENDARY = 75;         // Packs ohne Legendär → erzwingt Legendär
  var HERO_WEIGHT = 0.2;           // Helden-Karten droppen 5× seltener
  var MATERIAL_NAME = "Arkan-Essenz"; // Sammelbegriff für alle Sorten (UI-Überschrift)

  /* ================= Level-Mathematik ================= */

  function clampLvl(l) {
    l = Math.floor(Number(l) || 1);
    if (l < 1) l = 1;
    if (l > MAX_LEVEL) l = MAX_LEVEL;
    return l;
  }

  // tierOf akzeptiert Key ODER Index und liefert immer eine Kopie der Definition.
  function tierOf(t) {
    var d = null;
    if (typeof t === "number") d = TIERS[Math.max(0, Math.min(TIERS.length - 1, t | 0))];
    else d = TIER_BY_KEY[String(t || "common")];
    if (!d) d = TIERS[0];
    return { key: d.key, name: d.name, colorName: d.colorName, color: d.color,
             cap: d.cap, index: d.index };
  }
  function capOf(tierKey) { return tierOf(tierKey).cap; }
  function nextTierKey(tierKey) {
    var i = tierOf(tierKey).index;
    return i >= TIERS.length - 1 ? null : TIERS[i + 1].key;
  }

  // Material für den Level-Up AB lvl. Bedarf hängt an der Stufe (3 … 8),
  // nicht am Level — AA zeigt Bedarfe von 3 und 5 bei Lv15/16.
  function materialFor(lvl, tierIdx) {
    if (typeof tierIdx === "string") tierIdx = tierOf(tierIdx).index;
    tierIdx = Math.max(0, Math.min(TIERS.length - 1, tierIdx | 0));
    return 3 + tierIdx;
  }

  // Gold für den Level-Up AB lvl (Plateau-Kurve in 5er-/10er-Bändern).
  function goldFor(lvl) {
    lvl = clampLvl(lvl);
    for (var i = 0; i < GOLD_BANDS.length; i++) if (lvl <= GOLD_BANDS[i].to) return GOLD_BANDS[i].gold;
    return GOLD_BANDS[GOLD_BANDS.length - 1].gold;
  }
  function totalGoldTo(lvl) {
    lvl = clampLvl(lvl);
    var s = 0;
    for (var l = 1; l < lvl; l++) s += goldFor(l);
    return s;
  }
  function totalMaterialTo(lvl, tierIdx) {
    lvl = clampLvl(lvl);
    var s = 0;
    for (var l = 1; l < lvl; l++) s += materialFor(l, tierIdx);
    return s;
  }

  // statMul(lvl, mergeBoni) — mergeBoni = Array von Bonus-IDs (optional).
  function statMul(lvl, mergeBoni) {
    var m = Math.pow(STAT_BASE, clampLvl(lvl) - 1);
    if (mergeBoni && mergeBoni.length) {
      for (var i = 0; i < mergeBoni.length; i++) {
        var p = perkById(mergeBoni[i]);
        if (p && p.pw) m *= p.pw;
      }
    }
    return m;
  }

  /* ================= Merge-Bonus-Registry =================
   * PERKS[cardId][mergeTierKey] = [BonusA, BonusB] — der Spieler wählt beim
   * Merge auf diese Stufe EINEN der beiden.
   *
   * ⚠ BEWUSSTE ABWEICHUNG von AA: dort ist der Merge-Bonus FIX ("Merge 3
   *   identical Ice Blaster cards to unlock: Ranged Damage +22% and Attack
   *   Rate -7%"). Wir machen daraus eine Wahl aus zwei Optionen → Build-
   *   Identität statt Statistik. Siehe DESIGN_PROGRESSION.md.
   *
   * mod = maschinenlesbar: {stat, mul} (multiplikativ) oder {stat, add}
   *       (additiv, auch negativ). pct = Anzeigewert in Prozent; bei
   *       attackRate NEGATIV (−5 % = schneller, AA-Muster §4.2).
   * pw  = Beitrag zum Power-/Stat-Multiplikator in statMul(). */
  var PERKS = {
    fire: { // EMBER
      good: [
        { id: "fire_good_burnlen", txt: "+15 % Burn-Dauer",   pct: 15, pw: 1.05, mod: { stat: "burnDuration", mul: 1.15 } },
        { id: "fire_good_rate",    txt: "Angriffstempo −6 %", pct: -6, pw: 1.06, mod: { stat: "attackRate",  mul: 0.94 } },
      ],
      rare: [
        { id: "fire_rare_stack",   txt: "Burn stapelt bis 3× statt 2×",       pw: 1.08, mod: { stat: "burnStacksMax", add: 1 } },
        { id: "fire_rare_exec",    txt: "+12 % Schaden gegen brennende Ziele", pct: 12, pw: 1.07, mod: { stat: "dmgVsBurning", mul: 1.12 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    water: { // FROST
      good: [
        { id: "water_good_freeze", txt: "Freeze braucht 3 statt 4 Stacks", pw: 1.06, mod: { stat: "freezeStacksNeeded", add: -1 } },
        { id: "water_good_slow",   txt: "+10 % Slow",                      pct: 10, pw: 1.04, mod: { stat: "slowPct", mul: 1.10 } },
      ],
      rare: [
        { id: "water_rare_linger", txt: "Slow wirkt 1.5 s länger nach",              pw: 1.05, mod: { stat: "slowDuration", add: 1.5 } },
        { id: "water_rare_shatter",txt: "Eingefrorene Ziele erleiden +20 % Schaden", pct: 20, pw: 1.09, mod: { stat: "dmgVsFrozen", mul: 1.20 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    nature: { // THORN
      good: [
        { id: "nature_good_tick",  txt: "Gift tickt 0.2 s schneller", pw: 1.06, mod: { stat: "poisonTick", add: -0.2 } },
        { id: "nature_good_range", txt: "+12 % Reichweite",           pct: 12, pw: 1.04, mod: { stat: "range", mul: 1.12 } },
      ],
      rare: [
        { id: "nature_rare_root",  txt: "Wurzeln halten 0.5 s länger",                pw: 1.05, mod: { stat: "rootDuration", add: 0.5 } },
        { id: "nature_rare_spread",txt: "Gift springt auf 1 zusätzliches Ziel über",  pw: 1.09, mod: { stat: "poisonSpread", add: 1 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    earth: { // STONE
      good: [
        { id: "earth_good_armor", txt: "−10 % gegnerische Rüstung im Radius", pct: -10, pw: 1.06, mod: { stat: "armorShred", mul: 1.10 } },
        { id: "earth_good_rate",  txt: "Angriffstempo −8 %",                  pct: -8,  pw: 1.07, mod: { stat: "attackRate", mul: 0.92 } },
      ],
      rare: [
        { id: "earth_rare_stun",  txt: "Jeder 6. statt 7. Treffer betäubt 0.4 s", pw: 1.06, mod: { stat: "stunEvery", add: -1 } },
        { id: "earth_rare_heavy", txt: "+18 % Schaden gegen Bosse",               pct: 18, pw: 1.08, mod: { stat: "dmgVsBoss", mul: 1.18 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    light: { // DAWN
      good: [
        { id: "light_good_crit",  txt: "+6 % Kritchance",               pct: 6, pw: 1.05, mod: { stat: "critChance", add: 0.06 } },
        { id: "light_good_aura",  txt: "+5 % Schaden für Nachbartürme", pct: 5, pw: 1.04, mod: { stat: "auraDamage", mul: 1.05 } },
      ],
      rare: [
        { id: "light_rare_pierce",txt: "Strahl trifft 1 Ziel mehr", pw: 1.09, mod: { stat: "pierceTargets", add: 1 } },
        { id: "light_rare_rate",  txt: "Angriffstempo −7 %", pct: -7, pw: 1.07, mod: { stat: "attackRate", mul: 0.93 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    darkness: { // HOLLOW
      good: [
        { id: "dark_good_curse",  txt: "Fluch hält 1 s länger",          pw: 1.05, mod: { stat: "curseDuration", add: 1 } },
        { id: "dark_good_drain",  txt: "+10 % Lebensraub auf die Burg",  pct: 10, pw: 1.04, mod: { stat: "lifesteal", mul: 1.10 } },
      ],
      rare: [
        { id: "dark_rare_exec",   txt: "Hinrichtung unter 12 % statt 8 % HP",        pw: 1.08, mod: { stat: "executeThreshold", add: 0.04 } },
        { id: "dark_rare_chain",  txt: "Fluch springt beim Tod auf ein Ziel über",   pw: 1.07, mod: { stat: "curseChain", add: 1 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    solara: { // Held
      good: [
        { id: "solara_good_ult",  txt: "−8 % Ult-Abklingzeit",           pct: -8, pw: 1.06, mod: { stat: "ultCooldown", mul: 0.92 } },
        { id: "solara_good_heal", txt: "+3 % Burgheilung bei Boss-Kill", pct: 3,  pw: 1.03, mod: { stat: "bossHeal", add: 0.03 } },
      ],
      rare: [
        { id: "solara_rare_beam", txt: "Sonnenstrahl +15 % Breite",         pct: 15, pw: 1.07, mod: { stat: "beamWidth", mul: 1.15 } },
        { id: "solara_rare_aura", txt: "+7 % Schaden für alle Licht-Türme", pct: 7,  pw: 1.06, mod: { stat: "lightAura", mul: 1.07 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    magmor: { // Held
      good: [
        { id: "magmor_good_dmg",  txt: "+10 % Ult-Schaden",                pct: 10, pw: 1.06, mod: { stat: "ultDamage", mul: 1.10 } },
        { id: "magmor_good_burn", txt: "Ult zündet Burn auf allen Zielen",  pw: 1.05, mod: { stat: "ultApplyBurn", add: 1 } },
      ],
      rare: [
        { id: "magmor_rare_wide", txt: "Lavafeld +20 % Radius",       pct: 20, pw: 1.08, mod: { stat: "lavaRadius", mul: 1.20 } },
        { id: "magmor_rare_fast", txt: "+12 % Ult-Ladung pro Welle",  pct: 12, pw: 1.06, mod: { stat: "ultChargePerWave", mul: 1.12 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
  };
  // Stufen, auf die gemerged werden kann (common ist die Startstufe).
  var MERGE_TIER_KEYS = ["good", "rare", "epic", "legendary", "supreme"];

  var PERK_INDEX = {};
  (function buildIndex() {
    for (var id in PERKS) {
      if (!Object.prototype.hasOwnProperty.call(PERKS, id)) continue;
      for (var t = 0; t < MERGE_TIER_KEYS.length; t++) {
        var arr = PERKS[id][MERGE_TIER_KEYS[t]] || [];
        for (var i = 0; i < arr.length; i++) {
          PERK_INDEX[arr[i].id] = { perk: arr[i], cardId: id, tier: MERGE_TIER_KEYS[t] };
        }
      }
    }
  })();
  function perkById(pid) { var e = PERK_INDEX[pid]; return e ? e.perk : null; }
  function perkEntry(pid) { return PERK_INDEX[pid] || null; }

  // Bonus-Optionen für den Merge AUF tierKey
  function mergeBonusChoices(cardId, tierKey) {
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

  function emptyCopies() {
    var o = {};
    for (var i = 0; i < TIER_KEYS.length; i++) o[TIER_KEYS[i]] = 0;
    return o;
  }
  function emptyMaterials() {
    var o = {};
    for (var i = 0; i < MATERIAL_KEYS.length; i++) o[MATERIAL_KEYS[i]] = 0;
    return o;
  }
  // Fremde/fehlende Sorten aussortieren, negative Bestände abfangen.
  function normMaterials(m) {
    var o = emptyMaterials();
    if (m && typeof m === "object") {
      for (var i = 0; i < MATERIAL_KEYS.length; i++) {
        o[MATERIAL_KEYS[i]] = Math.max(0, m[MATERIAL_KEYS[i]] | 0);
      }
    }
    return o;
  }
  function materialsTotal(m) {
    var n = 0;
    for (var i = 0; i < MATERIAL_KEYS.length; i++) n += m[MATERIAL_KEYS[i]] | 0;
    return n;
  }
  function fresh() {
    return {
      v: STATE_VERSION,
      cards: {},          // {id: {tier, lvl, copies:{tier:n}, mergeBoni:[], pendingBoni:[]}}
      materials: emptyMaterials(), // Upgrade-Material JE SORTE (v3)
      matRR: 0,           // Round-Robin-Zeiger für addMaterial() ohne Sorte
      gold: null,         // BEWUSST null — Gold verwaltet der Hub (arenaHub)
      pityEpic: 0, pityLegendary: 0, packsOpened: 0,
    };
  }
  function get() {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    if (s.v !== STATE_VERSION && (s.cards || s.material !== undefined)) s = migrateState(s);
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    if (!s.cards || typeof s.cards !== "object") s.cards = {};
    s.materials = normMaterials(s.materials);
    s.matRR = ((s.matRR | 0) % MATERIAL_KEYS.length + MATERIAL_KEYS.length) % MATERIAL_KEYS.length;
    s.gold = null;
    delete s.material;   // v2-Feld — existiert in v3 nicht mehr
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function cardIn(st, id) {
    if (!st.cards[id]) st.cards[id] = { tier: "common", lvl: 1, copies: emptyCopies(), mergeBoni: [], pendingBoni: [] };
    var c = st.cards[id];
    if (!c.copies || typeof c.copies !== "object") c.copies = emptyCopies();
    for (var i = 0; i < TIER_KEYS.length; i++) c.copies[TIER_KEYS[i]] = Math.max(0, c.copies[TIER_KEYS[i]] | 0);
    if (!Array.isArray(c.mergeBoni)) c.mergeBoni = [];
    if (!Array.isArray(c.pendingBoni)) c.pendingBoni = [];
    if (!TIER_BY_KEY[c.tier]) c.tier = "common";
    c.lvl = clampLvl(c.lvl);
    if (c.lvl > capOf(c.tier)) c.lvl = capOf(c.tier);
    return c;
  }
  function cardOf(id) {
    var c = get().cards[id];
    if (c) return c;
    return { tier: "common", lvl: 1, copies: emptyCopies(), mergeBoni: [], pendingBoni: [], _empty: true };
  }
  function owned(id) {
    var c = cardOf(id);
    if (c._empty) return false;
    for (var i = 0; i < TIER_KEYS.length; i++) if (c.copies[TIER_KEYS[i]] > 0) return true;
    return false;
  }
  function copiesTotal(c) {
    var n = 0;
    for (var i = 0; i < TIER_KEYS.length; i++) n += c.copies[TIER_KEYS[i]] | 0;
    return n;
  }
  // Aktive Stufe = höchste Stufe, von der mindestens eine Kopie im Besitz ist.
  // (Die aktive Karte IST eine der Kopien — deshalb kostet ein Merge auf der
  //  aktiven Stufe die aktive Karte mit, exakt wie im Vorbild.)
  function recomputeTier(c) {
    for (var i = TIER_KEYS.length - 1; i >= 0; i--) {
      if (c.copies[TIER_KEYS[i]] > 0) {
        if (tierOf(TIER_KEYS[i]).index > tierOf(c.tier).index) c.tier = TIER_KEYS[i];
        return c.tier;
      }
    }
    return c.tier;
  }

  /* ================= Sammel-API ================= */

  // addDrop(id, tierKey, n) → {tier, copies, total}
  function addDrop(id, tierKey, n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (!TIER_BY_KEY[tierKey]) tierKey = "common";
    var st = get(), c = cardIn(st, id);
    c.copies[tierKey] += n;
    recomputeTier(c);
    save(st);
    return { tier: c.tier, copies: c.copies[tierKey], total: copiesTotal(c) };
  }

  /* addMaterial(n, typeKey) → {attack, speed, special, total}
   * MIT typeKey: bucht genau auf diese Sorte.
   * OHNE typeKey (rückwärtskompatibel zur v2-Signatur): verteilt n
   * ROUND-ROBIN gleichmäßig über alle Sorten. Der Rest-Zeiger `matRR`
   * wandert mit, damit zehn Aufrufe à 1 Stück nicht alle auf 'attack'
   * landen. Negative n ziehen ab (Bestand bleibt ≥ 0). */
  function addMaterial(n, typeKey) {
    n = Math.floor(Number(n) || 0);
    var st = get(), i;
    if (typeKey && MATERIAL_BY_KEY[typeKey]) {
      st.materials[typeKey] = Math.max(0, st.materials[typeKey] + n);
    } else if (n) {
      var sign = n < 0 ? -1 : 1, mag = Math.abs(n), L = MATERIAL_KEYS.length;
      var per = Math.floor(mag / L), rest = mag % L, cur = st.matRR | 0;
      for (i = 0; i < L; i++) {
        var add = per + (i < rest ? 1 : 0);
        if (!add) continue;
        var key = MATERIAL_KEYS[(cur + i) % L];
        st.materials[key] = Math.max(0, st.materials[key] + sign * add);
      }
      st.matRR = (cur + rest) % L;
    }
    save(st);
    return getMaterialsFrom(st);
  }

  function getMaterialsFrom(st) {
    var o = { total: materialsTotal(st.materials) };
    for (var i = 0; i < MATERIAL_KEYS.length; i++) o[MATERIAL_KEYS[i]] = st.materials[MATERIAL_KEYS[i]];
    return o;
  }
  // getMaterials() → {attack, speed, special, total}
  function getMaterials() { return getMaterialsFrom(get()); }

  /* ================= Merge ================= */

  function canMerge(id, tierKey) {
    var c = cardOf(id);
    if (!TIER_BY_KEY[tierKey]) return false;
    if (!nextTierKey(tierKey)) return false;          // Suprem ist Endstufe
    return (c.copies[tierKey] | 0) >= MERGE_COST;
  }

  // progressToNextMerge(id) → {tier, have, need, ready, nextTier}
  // Bezieht sich auf die AKTIVE Stufe (das ist die Zeile im Collection-Grid).
  function progressToNextMerge(id) {
    var c = cardOf(id), t = c.tier;
    var nk = nextTierKey(t);
    return { tier: t, have: Math.min(MERGE_COST, c.copies[t] | 0), raw: c.copies[t] | 0,
             need: MERGE_COST, ready: !!nk && (c.copies[t] | 0) >= MERGE_COST,
             nextTier: nk, maxed: !nk };
  }

  /* merge(id, tierKey) → {ok, from, newTier, tierUp, bonusChoices, bonusTier}
   * Verbraucht 3 Kopien der Stufe tierKey und erzeugt 1 Kopie der nächsten.
   * Steigt die AKTIVE Stufe der Karte dadurch, wird der kartenspezifische
   * Bonus dieser Stufe zur Wahl gestellt (chooseMergeBonus). */
  function merge(id, tierKey) {
    var st = get(), c = cardIn(st, id);
    if (!TIER_BY_KEY[tierKey]) return null;
    var nk = nextTierKey(tierKey);
    if (!nk || c.copies[tierKey] < MERGE_COST) return null;
    var beforeIdx = tierOf(c.tier).index;
    c.copies[tierKey] -= MERGE_COST;
    c.copies[nk] += 1;
    recomputeTier(c);
    var tierUp = tierOf(c.tier).index > beforeIdx;
    var choices = [];
    if (tierUp) {
      choices = mergeBonusChoices(id, c.tier);
      var already = c.mergeBoni.some(function (pid) {
        var e = perkEntry(pid); return e && e.tier === c.tier;
      });
      if (choices.length && !already && c.pendingBoni.indexOf(c.tier) < 0) c.pendingBoni.push(c.tier);
    }
    save(st);
    return { ok: true, from: tierKey, newTier: c.tier, tierUp: tierUp,
             cap: capOf(c.tier), bonusTier: tierUp ? c.tier : null,
             bonusChoices: choices, pending: c.pendingBoni.slice() };
  }

  /* mergeAll(id) → {merges, byTier, newTier, pending}
   * AA-Feature "Merge All": kaskadiert von unten nach oben, so dass aus
   * 243 Gewöhnlich-Kopien genau 1 Suprem-Karte wird (3^5). */
  function mergeAll(id) {
    var byTier = {}, total = 0, last = null;
    for (var i = 0; i < TIER_KEYS.length - 1; i++) {
      var tk = TIER_KEYS[i];
      var guard = 0;
      while (canMerge(id, tk) && guard++ < 100000) {
        var r = merge(id, tk);
        if (!r) break;
        byTier[tk] = (byTier[tk] || 0) + 1;
        total++; last = r;
      }
    }
    var c = cardOf(id);
    return { merges: total, byTier: byTier, newTier: c.tier, cap: capOf(c.tier),
             pending: c.pendingBoni.slice(), last: last };
  }

  // chooseMergeBonus(id, perkId) → {ok, tier, perk} | null
  function chooseMergeBonus(id, perkId) {
    var e = perkEntry(perkId);
    if (!e || e.cardId !== id) return null;
    var st = get(), c = cardIn(st, id);
    var p = c.pendingBoni.indexOf(e.tier);
    if (p < 0) return null;
    if (c.mergeBoni.indexOf(perkId) >= 0) return null;
    c.pendingBoni.splice(p, 1);
    c.mergeBoni.push(perkId);
    save(st);
    return { ok: true, tier: e.tier, perk: e.perk, mergeBoni: c.mergeBoni.slice() };
  }

  // Offene Bonus-Wahlen (z. B. nach mergeAll) → [{tier, choices}]
  function pendingBonusChoices(id) {
    var c = cardOf(id), out = [];
    for (var i = 0; i < c.pendingBoni.length; i++) {
      out.push({ tier: c.pendingBoni[i], choices: mergeBonusChoices(id, c.pendingBoni[i]) });
    }
    return out;
  }

  // Gebündelte Mods einer Karte für die Match-Engine → {stat: {mul, add}}
  function modsOf(id) {
    var c = cardOf(id), out = {};
    for (var i = 0; i < c.mergeBoni.length; i++) {
      var p = perkById(c.mergeBoni[i]);
      if (!p || !p.mod) continue;
      var m = p.mod;
      if (!out[m.stat]) out[m.stat] = { mul: 1, add: 0 };
      if (m.mul !== undefined) out[m.stat].mul *= m.mul;
      if (m.add !== undefined) out[m.stat].add += m.add;
    }
    return out;
  }

  /* ================= Level ================= */

  /* canLevelUp(id, goldAvailable)
   *   → {ok, reason, lvl, cap, needMaterial, needGold, haveMaterial,
   *      materialType, materialName, materialSym}
   * Geprüft (und später verbraucht) wird ausschließlich die SORTE der
   * Karte (materialTypeOf) — ein Berg Tempo-Essenz hilft EMBER nicht. */
  function canLevelUp(id, goldAvailable) {
    var st = get(), c = st.cards[id] || cardOf(id);
    var ti = tierOf(c.tier).index, cap = capOf(c.tier);
    var mi = materialInfoOf(id);
    var out = { ok: false, reason: "", lvl: c.lvl, cap: cap, tier: c.tier,
                needMaterial: materialFor(c.lvl, ti), needGold: goldFor(c.lvl),
                materialType: mi.key, materialName: mi.name, materialSym: mi.sym,
                haveMaterial: st.materials[mi.key] };
    if (!owned(id)) { out.reason = "unowned"; return out; }
    if (c.lvl >= MAX_LEVEL) { out.reason = "max"; return out; }
    if (c.lvl >= cap) { out.reason = "cap"; return out; }   // Merge nötig!
    if (out.haveMaterial < out.needMaterial) { out.reason = "material"; return out; }
    if (goldAvailable !== undefined && goldAvailable !== null && goldAvailable < out.needGold) {
      out.reason = "gold"; return out;
    }
    out.ok = true;
    return out;
  }

  /* levelUp(id) → {newLvl, materialSpent, materialType, goldCost, atCap} | null
   * Zieht NUR Material der Karten-Sorte ab. Den Gold-Abzug macht der
   * Aufrufer (Hub-Wallet). */
  function levelUp(id) {
    var st = get(), c = cardIn(st, id);
    var cap = capOf(c.tier), ti = tierOf(c.tier).index;
    if (!owned(id) || c.lvl >= cap || c.lvl >= MAX_LEVEL) return null;
    var mi = materialInfoOf(id);
    var need = materialFor(c.lvl, ti);
    if (st.materials[mi.key] < need) return null;
    var gold = goldFor(c.lvl);
    st.materials[mi.key] -= need;
    c.lvl += 1;
    save(st);
    return { newLvl: c.lvl, materialSpent: need, goldCost: gold, cap: cap,
             materialType: mi.key, materialName: mi.name, materialSym: mi.sym,
             atCap: c.lvl >= cap, materials: getMaterialsFrom(st),
             material: st.materials[mi.key] };
  }

  // Kompakte Karten-Sicht fürs UI
  function view(id) {
    var st = get(), c = st.cards[id] || cardOf(id);
    var t = tierOf(c.tier);
    var ti = t.index;
    var mi = materialInfoOf(id);
    return {
      id: id, tier: c.tier, tierName: t.name, color: t.color, tierIndex: ti,
      lvl: c.lvl, cap: t.cap, atCap: c.lvl >= t.cap,
      copies: c.copies, owned: owned(id),
      mergeBoni: c.mergeBoni.slice(), pendingBoni: c.pendingBoni.slice(),
      statMul: statMul(c.lvl, c.mergeBoni),
      nextStatMul: statMul(Math.min(t.cap, c.lvl + 1), c.mergeBoni),
      needMaterial: materialFor(c.lvl, ti), needGold: goldFor(c.lvl),
      materialType: mi.key, materialName: mi.name, materialSym: mi.sym,
      materialColor: mi.color, haveMaterial: st.materials[mi.key],
      materials: getMaterialsFrom(st),
      mergeProgress: progressToNextMerge(id),
    };
  }

  /* ================= Packs ================= */

  function normType(type) {
    var t = String(type || "bronze").toLowerCase();
    return PACKS[t] ? t : (PACK_ALIAS[t] || "bronze");
  }
  function rollWeighted(weights, rng) {
    var sum = 0, i;
    for (i = 0; i < weights.length; i++) sum += weights[i];
    var r = rng() * sum, acc = 0;
    for (i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r < acc) return i;
    }
    return 0;
  }
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
  function randInt(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }

  /* getPityStatus() → {epicIn, legendaryIn, pityEpic, pityLegendary, …}
   * AA zeigt den Pity-Stand OFFEN auf der Truhe an ("Get <Legendary> in N
   * opens", §8.2) statt Prozent-Drop-Raten. Wir machen unseren deshalb
   * sichtbar — Lesart: "spätestens in ≤ epicIn Packs kommt ein Episches".
   *
   * ⚠ Zum +1: Der Zähler wird NACH dem Pack erhöht, geprüft wird davor
   * (`pityEpic >= PITY_EPIC` → dieses Pack erzwingt). Bei pityEpic = 25
   * greift also das NÄCHSTE Pack → epicIn = 1. Bei frischem Zähler (0)
   * sind es 26 — deckungsgleich mit der gemessenen längsten Durststrecke
   * von 25 Packs ohne Episch im Selbsttest. Ein reines PITY_EPIC−Zähler
   * wäre um eins zu optimistisch. */
  function getPityStatus() {
    var st = get();
    return {
      epicIn: Math.max(1, PITY_EPIC - (st.pityEpic | 0) + 1),
      legendaryIn: Math.max(1, PITY_LEGENDARY - (st.pityLegendary | 0) + 1),
      pityEpic: st.pityEpic | 0, pityLegendary: st.pityLegendary | 0,
      epicThreshold: PITY_EPIC, legendaryThreshold: PITY_LEGENDARY,
      packsOpened: st.packsOpened | 0,
    };
  }

  /* openPack(type, poolIds, heroIds, rng)
   *   → {packType, name, promise, cards:[{cardId, tier, …}],
   *      materialSlots:[{type, amount, name, sym}], materialByType, material,
   *      gold, pity, guarantee}
   * Wendet die Drops NICHT an — die Pack-Zeremonie ruft pro Flip addDrop()
   * bzw. addMaterial(amount, type); das Gold bucht der Hub. Pity-Zähler und
   * packsOpened werden hier sofort persistiert.
   * Material-Slots droppen eine ZUFÄLLIGE Sorte (gleichverteilt) — genau
   * das erzeugt die AA-typische Situation, dass man für eine bestimmte
   * Karte auf die passende Sorte wartet (§7.1 "TO BE FOUND"). */
  function openPack(type, poolIds, heroIds, rng) {
    rng = rng || Math.random;
    var def = PACKS[normType(type)];
    poolIds = (poolIds && poolIds.length) ? poolIds : Object.keys(PERKS);
    var st = get(), i;

    var slots = [];
    for (i = 0; i < def.cardSlots; i++) slots.push(rollWeighted(def.weights, rng));

    function best() { var b = 0; for (var j = 0; j < slots.length; j++) if (slots[j] > b) b = slots[j]; return b; }
    function force(minIdx) {
      if (best() >= minIdx) return;
      slots[Math.floor(rng() * slots.length)] = minIdx;
    }
    // 1) Pity (Legendär vor Episch — der stärkere Zwang deckt den schwächeren ab)
    var pityHit = null;
    if (st.pityLegendary >= PITY_LEGENDARY && best() < 4) { force(4); pityHit = "legendary"; }
    if (st.pityEpic >= PITY_EPIC && best() < 3) { force(3); pityHit = pityHit || "epic"; }
    // 2) Pack-Garantie
    force(def.guarantee);

    var b = best();
    st.pityEpic = b >= 3 ? 0 : st.pityEpic + 1;
    st.pityLegendary = b >= 4 ? 0 : st.pityLegendary + 1;
    st.packsOpened += 1;
    save(st);

    var cards = [];
    for (i = 0; i < slots.length; i++) {
      var t = tierOf(slots[i]);
      cards.push({ cardId: rollCard(poolIds, heroIds, rng), tier: t.key, tierName: t.name,
                   tierIndex: t.index, color: t.color, count: 1 });
    }
    var matSlots = [], mat = 0, byType = emptyMaterials();
    for (i = 0; i < def.materialSlots; i++) {
      var amount = randInt(rng, MATERIAL_PER_SLOT[0], MATERIAL_PER_SLOT[1]);
      var md = MATERIALS[Math.min(MATERIALS.length - 1, Math.floor(rng() * MATERIALS.length))];
      matSlots.push({ type: md.key, amount: amount, name: md.name, sym: md.sym, color: md.color });
      byType[md.key] += amount;
      mat += amount;
    }
    return { packType: def.key, name: def.name, promise: def.promise, color: def.color,
             cards: cards, materialSlots: matSlots, materialByType: byType, material: mat,
             gold: randInt(rng, def.gold[0], def.gold[1]),
             pity: pityHit, guarantee: def.guarantee, packsOpened: st.packsOpened,
             pityStatus: getPityStatus() };
  }

  /* ================= Migration v1 → v2 → v3 =================
   * migrateState() ist der Dispatcher: ein v1-Stand läuft BEIDE Stufen
   * durch (v1→v2→v3), ein v2-Stand nur die zweite.
   *
   * v1-Modell: Rarität war ein LEVEL-BAND derselben Karte (Lv1-19 Gewöhnlich,
   * 20-39 Selten/grün, 40-59 Episch/blau, 60-79 Legendär/lila, 80-99
   * Relikt/orange, 100 Suprem) und `copies` war ein einzelner Zähler als
   * Level-Up-Treibstoff.
   * Überführung:
   *   - Bandindex → gleiche Stufe der neuen Leiter (grün=Gut, blau=Selten,
   *     lila=Episch, orange=Legendär) — die Farbe bleibt also erhalten.
   *   - Level → auf das neue Cap der Stufe gekappt (niemand verliert Stufe).
   *   - 1 Kopie der eigenen Stufe wird gutgeschrieben (die Karte selbst).
   *   - alte `copies` + `dust/10` → Upgrade-Material (Kopien sind für Level
   *     nicht mehr zuständig, verfallen aber nicht).
   *   - alte `perks` → `mergeBoni` (die Perk-IDs sind stabil geblieben,
   *     nur ihre Stufen-Zuordnung hat sich verschoben). */
  var V1_BANDS = [[1, 19], [20, 39], [40, 59], [60, 79], [80, 99], [100, 100]];
  function v1TierIndex(lvl) {
    for (var i = 0; i < V1_BANDS.length; i++) if (lvl >= V1_BANDS[i][0] && lvl <= V1_BANDS[i][1]) return i;
    return 0;
  }
  function migrateState(old) {
    var s = old;
    if ((s.v | 0) < 2) s = migrateV1toV2(s);
    if ((s.v | 0) < 3) s = migrateV2toV3(s);
    return s;
  }

  function migrateV1toV2(old) {
    var out = { v: 2, cards: {}, material: 0, gold: null,
                pityEpic: old.pityEpic | 0, pityLegendary: old.pityLegendary | 0,
                packsOpened: old.packsOpened | 0 };
    out.material = Math.max(0, old.material | 0);
    var extraMaterial = Math.floor((old.dust | 0) / 10);
    for (var id in (old.cards || {})) {
      if (!Object.prototype.hasOwnProperty.call(old.cards, id)) continue;
      var o = old.cards[id] || {};
      var lvl = clampLvl(o.lvl);
      var ti = v1TierIndex(lvl);
      var t = TIERS[ti];
      var c = { tier: t.key, lvl: Math.min(lvl, t.cap), copies: emptyCopies(),
                mergeBoni: [], pendingBoni: [] };
      c.copies[t.key] = 1;
      if (Array.isArray(o.perks)) {
        for (var i = 0; i < o.perks.length; i++) if (perkById(o.perks[i])) c.mergeBoni.push(o.perks[i]);
      }
      extraMaterial += Math.max(0, o.copies | 0);
      out.cards[id] = c;
    }
    out.material += extraMaterial;
    out._migratedFrom = old.v || 1;
    return out;
  }

  /* v2 → v3: aus EINEM generischen Materialbestand werden DREI Sorten.
   * Der Altbestand wird GLEICHMÄSSIG gedrittelt, der Rest (0-2 Stück)
   * geht auf 'attack'. Begründung: Niemand verliert Material, und die
   * Sorten starten ausbalanciert — welche Sorte der Spieler in v2
   * "gemeint" hat, ist nicht rekonstruierbar, also ist jede Ungleich-
   * verteilung willkürlich. Karten, Level, Kopien und Boni bleiben
   * unangetastet; nur die Ressource wird aufgefächert. */
  function migrateV2toV3(old) {
    var out = { v: 3, cards: old.cards || {}, materials: emptyMaterials(), matRR: 0,
                gold: null, pityEpic: old.pityEpic | 0,
                pityLegendary: old.pityLegendary | 0, packsOpened: old.packsOpened | 0 };
    if (old._migratedFrom !== undefined) out._migratedFrom = old._migratedFrom;
    else out._migratedFrom = old.v || 2;
    var total = Math.max(0, old.material | 0);
    var L = MATERIAL_KEYS.length;
    var per = Math.floor(total / L), rest = total - per * L;
    for (var i = 0; i < L; i++) out.materials[MATERIAL_KEYS[i]] = per;
    out.materials.attack += rest;
    // Falls ein Stand (Testfixture, Teil-Migration) schon Sorten mitbringt: addieren.
    if (old.materials && typeof old.materials === "object") {
      var pre = normMaterials(old.materials);
      for (var j = 0; j < L; j++) out.materials[MATERIAL_KEYS[j]] += pre[MATERIAL_KEYS[j]];
    }
    return out;
  }

  // Explizit anstoßbar (get() migriert ohnehin lazy, speichert aber erst beim
  // nächsten Schreibzugriff — migrateV1() persistiert sofort).
  // Heißt weiterhin migrateV1(), weil es der EINE Migrations-Einstiegspunkt
  // für den Hub-Start ist; intern läuft v1→v2→v3 durch.
  function migrateV1() {
    var raw;
    try { raw = JSON.parse(lsGet() || "{}"); } catch (e) { raw = {}; }
    if (!raw || raw.v === STATE_VERSION) return { skipped: true, cards: 0 };
    var st = get();
    save(st);
    return { skipped: false, cards: Object.keys(st.cards).length,
             from: st._migratedFrom || null, materials: getMaterialsFrom(st) };
  }

  /* ================= Export ================= */
  var API = {
    // Konstanten
    TIERS: TIERS, TIER_KEYS: TIER_KEYS, PACKS: PACKS, PERKS: PERKS,
    MERGE_TIER_KEYS: MERGE_TIER_KEYS, MERGE_COST: MERGE_COST, MAX_LEVEL: MAX_LEVEL,
    GOLD_BANDS: GOLD_BANDS, MATERIAL_NAME: MATERIAL_NAME,
    MATERIALS: MATERIALS, MATERIAL_KEYS: MATERIAL_KEYS, CARD_MATERIAL: CARD_MATERIAL,
    PITY_EPIC: PITY_EPIC, PITY_LEGENDARY: PITY_LEGENDARY, HERO_WEIGHT: HERO_WEIGHT,
    STATE_VERSION: STATE_VERSION,
    // Mathe
    statMul: statMul, goldFor: goldFor, materialFor: materialFor, tierOf: tierOf,
    capOf: capOf, nextTierKey: nextTierKey, totalGoldTo: totalGoldTo,
    totalMaterialTo: totalMaterialTo,
    // Material-Sorten
    materialTypeOf: materialTypeOf, materialInfoOf: materialInfoOf,
    getMaterials: getMaterials, getPityStatus: getPityStatus,
    // Bank
    get: get, addDrop: addDrop, addMaterial: addMaterial, owned: owned, view: view,
    canMerge: canMerge, merge: merge, mergeAll: mergeAll,
    chooseMergeBonus: chooseMergeBonus, mergeBonusChoices: mergeBonusChoices,
    pendingBonusChoices: pendingBonusChoices, progressToNextMerge: progressToNextMerge,
    canLevelUp: canLevelUp, levelUp: levelUp, modsOf: modsOf, perkById: perkById,
    // Packs / Migration
    openPack: openPack, migrateV1: migrateV1,
    _key: KEY, _reset: function () { save(fresh()); },
    _write: function (s) { save(s); },
  };

  if (typeof window !== "undefined") window.ArenaCards = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ================= Selbsttest (node arena_patches/arena_cards.js) ========= */
  if (typeof window === "undefined" && typeof process !== "undefined") {
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
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };

    console.log("\n=== ARENA CARDS v2.1 (State v3, Material-Sorten) — Selbsttest ===\n");

    /* --- 0. Material-Sorten (Video-6-Befund §12.3) --- */
    console.log("Material-Sorten:");
    MATERIALS.forEach(function (m) {
      var abn = Object.keys(CARD_MATERIAL).filter(function (k) { return CARD_MATERIAL[k] === m.key; });
      console.log("  " + m.sym + " " + pad(m.name, 18) + pad(m.key, 9) +
        "Abnehmer: " + abn.join(", "));
    });
    check("3 Sorten definiert", MATERIALS.length === 3, MATERIAL_KEYS.join("/"));
    check("jede Sorte hat ≥2 Abnehmer", MATERIAL_KEYS.every(function (k) {
      return Object.keys(CARD_MATERIAL).filter(function (c) { return CARD_MATERIAL[c] === k; }).length >= 2;
    }));
    check("materialTypeOf: fire/earth→attack", materialTypeOf("fire") === "attack" &&
      materialTypeOf("earth") === "attack");
    check("materialTypeOf: water/light→speed", materialTypeOf("water") === "speed" &&
      materialTypeOf("light") === "speed");
    check("materialTypeOf: nature/darkness→special", materialTypeOf("nature") === "special" &&
      materialTypeOf("darkness") === "special");
    check("materialTypeOf: Helden→special", materialTypeOf("solara") === "special" &&
      materialTypeOf("magmor") === "special");
    check("materialTypeOf: unbekannte ID → special", materialTypeOf("gibtsnicht") === "special" &&
      materialTypeOf(undefined) === "special");
    check("materialInfoOf liefert Name + Symbol", materialInfoOf("water").name === "Tempo-Essenz" &&
      materialInfoOf("water").sym === "⚡");

    /* --- 1. Raritätsleiter & Kurven --- */
    console.log("\nRaritätsleiter:");
    TIERS.forEach(function (t) {
      console.log("  " + pad(t.name, 12) + pad(t.colorName, 8) + t.color +
        "   Cap " + padL(t.cap, 3) + "   Material/Level-Up " + materialFor(1, t.index));
    });
    console.log("\nLevel-Kurve (statMul, ohne Merge-Boni):");
    [1, 25, 40, 55, 70, 85, 100].forEach(function (l) {
      console.log("  Lv" + padL(l, 3) + "  " + r2(statMul(l)) + "x");
    });
    check("statMul(1) == 1", Math.abs(statMul(1) - 1) < 1e-9, r2(statMul(1)));
    check("statMul(100) in [8, 9.5]", statMul(100) > 8 && statMul(100) < 9.5, r2(statMul(100)) + "x");
    check("statMul monoton steigend", (function () {
      for (var l = 2; l <= 100; l++) if (statMul(l) <= statMul(l - 1)) return false;
      return true;
    })());
    check("Merge-Boni erhöhen statMul", statMul(50, ["fire_good_rate", "fire_rare_exec"]) > statMul(50),
      r2(statMul(50)) + " → " + r2(statMul(50, ["fire_good_rate", "fire_rare_exec"])));
    check("Caps 25/40/55/70/85/100", TIERS.map(function (t) { return t.cap; }).join("/") === "25/40/55/70/85/100");
    check("materialFor 3…8", materialFor(1, 0) === 3 && materialFor(99, 5) === 8);

    var gSum = totalGoldTo(100);
    console.log("\nGold kumulativ bis Lv100: " + fmt(gSum) + " Gold");
    console.log("  Bänder: " + GOLD_BANDS.map(function (b) { return "≤" + b.to + ":" + b.gold; }).join(" · "));
    console.log("  Beispiele: goldFor(15)=" + goldFor(15) + "  goldFor(16)=" + goldFor(16) +
      "  goldFor(33)=" + fmt(goldFor(33)) + "  goldFor(99)=" + fmt(goldFor(99)));
    check("goldFor monoton (nicht fallend)", (function () {
      for (var l = 2; l <= 100; l++) if (goldFor(l) < goldFor(l - 1)) return false;
      return true;
    })());
    check("Gold-Summe bis Lv100 in [3.0M, 3.8M]", gSum > 3.0e6 && gSum < 3.8e6, fmt(gSum));
    check("Pack-Gewichte summieren auf 100", Object.keys(PACKS).every(function (k) {
      return Math.abs(PACKS[k].weights.reduce(function (a, b) { return a + b; }, 0) - 100) < 1e-9;
    }));
    check("Suprem droppt nie (5 Gewichte für 6 Stufen)", Object.keys(PACKS).every(function (k) {
      return PACKS[k].weights.length === TIERS.length - 1;
    }));
    var perkCount = 0;
    for (var pid in PERKS) MERGE_TIER_KEYS.forEach(function (t) { perkCount += (PERKS[pid][t] || []).length; });
    console.log("\nMerge-Boni ausformuliert: " + perkCount + " (8 Karten × Gut/Selten × 2), " +
      "Episch/Legendär/Suprem = TBD nach Playtest");
    check("32 Merge-Boni ausformuliert", perkCount === 32, perkCount);
    check("Attack-Rate-Boni sind NEGATIVE Prozente (AA-Muster)", (function () {
      var n = 0, ok = true;
      for (var k in PERK_INDEX) {
        var p = PERK_INDEX[k].perk;
        if (p.mod && p.mod.stat === "attackRate") { n++; if (!(p.pct < 0) || !(p.mod.mul < 1)) ok = false; }
      }
      return ok && n >= 3;
    })());

    /* --- 2. 10.000 Bronze-Packs --- */
    API._reset();
    var rng = mulberry32(20260724);
    var POOL = ["fire", "water", "nature", "earth", "light", "darkness", "solara", "magmor"];
    var HEROES = ["solara", "magmor"];
    var N = 10000, tc = [0, 0, 0, 0, 0, 0], slotsTotal = 0, heroSlots = 0;
    var matTotal = 0, goldTotal = 0, pityEpicHits = 0, pityLegHits = 0;
    var streakNoEpic = 0, maxStreakNoEpic = 0, streakNoLeg = 0, maxStreakNoLeg = 0;
    var packsWithGoodPlus = 0;
    var matBySort = { attack: 0, speed: 0, special: 0 }, matSlotsBySort = { attack: 0, speed: 0, special: 0 };
    var matSlotsTotal = 0, matShapeOk = true;
    for (var p = 0; p < N; p++) {
      var res = openPack("bronze", POOL, HEROES, rng);
      if (res.pity === "epic") pityEpicHits++;
      if (res.pity === "legendary") pityLegHits++;
      matTotal += res.material; goldTotal += res.gold;
      var sumSlots = 0;
      for (var ms = 0; ms < res.materialSlots.length; ms++) {
        var slot = res.materialSlots[ms];
        if (!slot || typeof slot !== "object" || !MATERIAL_BY_KEY[slot.type] ||
            !(slot.amount >= MATERIAL_PER_SLOT[0] && slot.amount <= MATERIAL_PER_SLOT[1])) matShapeOk = false;
        matBySort[slot.type] += slot.amount;
        matSlotsBySort[slot.type]++;
        matSlotsTotal++; sumSlots += slot.amount;
      }
      if (sumSlots !== res.material) matShapeOk = false;
      var bi = -1, hasGood = false;
      for (var s = 0; s < res.cards.length; s++) {
        tc[res.cards[s].tierIndex]++; slotsTotal++;
        if (HEROES.indexOf(res.cards[s].cardId) >= 0) heroSlots++;
        if (res.cards[s].tierIndex > bi) bi = res.cards[s].tierIndex;
        if (res.cards[s].tierIndex >= 1) hasGood = true;
      }
      if (hasGood) packsWithGoodPlus++;
      streakNoEpic = bi >= 3 ? 0 : streakNoEpic + 1;
      maxStreakNoEpic = Math.max(maxStreakNoEpic, streakNoEpic);
      streakNoLeg = bi >= 4 ? 0 : streakNoLeg + 1;
      maxStreakNoLeg = Math.max(maxStreakNoLeg, streakNoLeg);
    }
    console.log("\n10.000 Bronze-Packs (" + slotsTotal + " Kartenslots):");
    var raw = PACKS.bronze.weights;
    for (var i3 = 0; i3 < 5; i3++) {
      console.log("  " + pad(TIERS[i3].name + " (" + TIERS[i3].colorName + ")", 20) +
        padL((tc[i3] / slotsTotal * 100).toFixed(3), 8) + " %   (Rohgewicht " + raw[i3] +
        " %)   " + fmt(tc[i3]) + " Slots");
    }
    console.log("  Suprem: " + tc[5] + " Slots (muss 0 sein)");
    console.log("  Ø Material/Pack: " + r2(matTotal / N) + "   Ø Gold/Pack: " + r2(goldTotal / N));
    console.log("  Material-Sorten-Verteilung (" + fmt(matSlotsTotal) + " Slots, Soll je 33.33 %):");
    MATERIAL_KEYS.forEach(function (k) {
      console.log("    " + MATERIAL_BY_KEY[k].sym + " " + pad(MATERIAL_BY_KEY[k].name, 18) +
        padL((matSlotsBySort[k] / matSlotsTotal * 100).toFixed(2), 6) + " % der Slots   " +
        padL(fmt(matBySort[k]), 8) + " Stück (" +
        (matBySort[k] / matTotal * 100).toFixed(2) + " %)");
    });
    console.log("  Helden-Slots: " + (heroSlots / slotsTotal * 100).toFixed(2) + " % (Soll 6.25 %)");
    console.log("  Pity ausgelöst: Episch " + pityEpicHits + "×, Legendär " + pityLegHits + "×");
    console.log("  längste Durststrecke: " + maxStreakNoEpic + " Packs ohne Episch+, " +
      maxStreakNoLeg + " ohne Legendär");
    check("Garantie: jedes Bronze-Pack hat ≥1 Gut+", packsWithGoodPlus === N, packsWithGoodPlus + "/" + N);
    check("Suprem droppt nie", tc[5] === 0, tc[5]);
    check("Gewöhnlich-Quote 70-80 %", tc[0] / slotsTotal * 100 > 70 && tc[0] / slotsTotal * 100 < 80,
      (tc[0] / slotsTotal * 100).toFixed(2) + " %");
    check("Gut-Quote 18-28 %", tc[1] / slotsTotal * 100 > 18 && tc[1] / slotsTotal * 100 < 28,
      (tc[1] / slotsTotal * 100).toFixed(2) + " %");
    check("Helden-Quote ~6.25 % (±1 pp)", Math.abs(heroSlots / slotsTotal * 100 - 6.25) < 1,
      (heroSlots / slotsTotal * 100).toFixed(2) + " %");
    check("Ø Material/Pack ≈ 7 (2 Slots à 2-5)", matTotal / N > 6 && matTotal / N < 8, r2(matTotal / N));
    check("Material-Slot-Form {type, amount} korrekt, Summe == material", matShapeOk);
    check("Sorten gleichverteilt (je 33.3 % ±1.5 pp)", MATERIAL_KEYS.every(function (k) {
      return Math.abs(matSlotsBySort[k] / matSlotsTotal * 100 - 100 / 3) < 1.5;
    }), MATERIAL_KEYS.map(function (k) {
      return (matSlotsBySort[k] / matSlotsTotal * 100).toFixed(2) + " %";
    }).join(" / "));
    check("jede Sorte droppt überhaupt", MATERIAL_KEYS.every(function (k) { return matBySort[k] > 0; }));
    check("Ø Gold/Pack ≈ 600", goldTotal / N > 550 && goldTotal / N < 650, r2(goldTotal / N));
    check("Pity Episch greift: nie >" + PITY_EPIC + " Packs ohne Episch+", maxStreakNoEpic <= PITY_EPIC, maxStreakNoEpic);
    check("Pity Legendär greift: nie >" + PITY_LEGENDARY + " Packs ohne Legendär", maxStreakNoLeg <= PITY_LEGENDARY, maxStreakNoLeg);
    check("Pity wurde in 10k Packs tatsächlich ausgelöst", pityEpicHits > 0 && pityLegHits > 0,
      pityEpicHits + " / " + pityLegHits);

    // Garantien der übrigen Pack-Typen
    ["silver", "gold", "arcane"].forEach(function (pt) {
      API._reset();
      var r = mulberry32(4242), okAll = true, n2 = 2000;
      for (var q = 0; q < n2; q++) {
        var pr = openPack(pt, POOL, HEROES, r), b2 = 0;
        for (var s2 = 0; s2 < pr.cards.length; s2++) b2 = Math.max(b2, pr.cards[s2].tierIndex);
        if (b2 < PACKS[pt].guarantee) okAll = false;
      }
      check("Garantie " + PACKS[pt].name + ": " + PACKS[pt].promise, okAll);
    });

    /* --- 3. Merge-Pyramide 3^5 --- */
    API._reset();
    addDrop("fire", "common", 243);
    var ma = mergeAll("fire");
    var fc = get().cards.fire;
    console.log("\nMerge-Pyramide: 243 Gewöhnlich-Kopien → mergeAll");
    console.log("  Merges gesamt: " + ma.merges + "   " +
      TIER_KEYS.map(function (k) { return k + ":" + fc.copies[k]; }).join(" "));
    console.log("  Endstufe: " + tierOf(fc.tier).name + " (Cap " + capOf(fc.tier) + ")");
    check("243 common → 1 Suprem", fc.tier === "supreme" && fc.copies.supreme === 1, fc.tier);
    check("Pyramide exakt aufgebraucht (81+27+9+3+1 = 121 Merges)", ma.merges === 121, ma.merges);
    check("keine Restkopien unterhalb Suprem", TIER_KEYS.slice(0, 5).every(function (k) { return fc.copies[k] === 0; }));
    check("Cap durch Merges auf 100", capOf(fc.tier) === 100);
    check("Bonus-Wahlen offen (Gut + Selten ausformuliert)", fc.pendingBoni.length === 2,
      fc.pendingBoni.join(","));
    var pc = pendingBonusChoices("fire");
    check("pendingBonusChoices liefert je 2 Optionen", pc.length === 2 && pc[0].choices.length === 2);
    check("chooseMergeBonus speichert", !!chooseMergeBonus("fire", "fire_good_rate"));
    check("chooseMergeBonus lehnt Fremdkarte ab", chooseMergeBonus("water", "fire_rare_exec") === null);
    check("chooseMergeBonus lehnt doppelte Wahl ab", chooseMergeBonus("fire", "fire_good_burnlen") === null);
    check("modsOf liefert attackRate ×0.94", r2((modsOf("fire").attackRate || {}).mul) === 0.94);

    /* --- 4. Merge-Mechanik im Detail --- */
    API._reset();
    addDrop("water", "common", 2);
    check("canMerge false bei 2 Kopien", canMerge("water", "common") === false);
    check("progressToNextMerge 2/3", progressToNextMerge("water").have === 2 &&
      progressToNextMerge("water").need === 3);
    addDrop("water", "common", 1);
    check("canMerge true bei 3 Kopien", canMerge("water", "common") === true);
    var mr = merge("water", "common");
    check("Merge hebt aktive Stufe auf Gut", mr && mr.newTier === "good" && mr.tierUp === true, mr && mr.newTier);
    check("Merge stellt 2 Bonus-Optionen zur Wahl", mr.bonusChoices.length === 2,
      mr.bonusChoices.map(function (x) { return x.txt; }).join(" | "));
    check("Merge verbraucht genau 3 Kopien", get().cards.water.copies.common === 0 &&
      get().cards.water.copies.good === 1);
    // Merge einer NIEDRIGEREN Stufe erzeugt nur Kopien, hebt die Stufe nicht
    addDrop("water", "common", 3);
    var mr2 = merge("water", "common");
    check("Merge unterhalb der aktiven Stufe erzeugt nur eine Kopie", mr2.tierUp === false &&
      get().cards.water.copies.good === 2 && get().cards.water.tier === "good");
    check("Merge auf Suprem nicht möglich (Endstufe)", canMerge("water", "supreme") === false);

    /* --- 4b. Material-Sorten: Buchung & Verbrauch --- */
    API._reset();
    var mm = addMaterial(30, "speed");
    check("addMaterial(30,'speed') bucht nur auf 'speed'", mm.speed === 30 && mm.attack === 0 &&
      mm.special === 0 && mm.total === 30, JSON.stringify(mm));
    API._reset();
    addMaterial(9);
    check("addMaterial(9) ohne Sorte verteilt 3/3/3", (function () {
      var g = getMaterials(); return g.attack === 3 && g.speed === 3 && g.special === 3;
    })(), JSON.stringify(getMaterials()));
    API._reset();
    for (var rr = 0; rr < 3; rr++) addMaterial(1);
    check("Round-Robin: 3× addMaterial(1) landet auf 3 verschiedenen Sorten", (function () {
      var g = getMaterials(); return g.attack === 1 && g.speed === 1 && g.special === 1;
    })(), JSON.stringify(getMaterials()));
    API._reset();
    addMaterial(10);
    check("addMaterial(10) ohne Sorte: Rest wandert (4/3/3, Summe 10)", (function () {
      var g = getMaterials();
      return g.total === 10 && [g.attack, g.speed, g.special].sort().join(",") === "3,3,4";
    })(), JSON.stringify(getMaterials()));
    check("getMaterials().total == Summe der Sorten", getMaterials().total ===
      getMaterials().attack + getMaterials().speed + getMaterials().special);
    check("unbekannte Sorte wird wie 'ohne Sorte' verteilt", (function () {
      API._reset(); addMaterial(3, "quatsch");
      var g = getMaterials(); return g.attack === 1 && g.speed === 1 && g.special === 1;
    })());

    // levelUp verbraucht NUR die Sorte der Karte
    API._reset();
    addDrop("fire", "common", 1);          // fire → attack
    addMaterial(50, "speed");
    addMaterial(50, "special");
    check("Level-Up scheitert bei falscher Sorte im Vorrat",
      canLevelUp("fire").reason === "material", canLevelUp("fire").reason +
      " (habe " + canLevelUp("fire").haveMaterial + " " + canLevelUp("fire").materialName + ")");
    addMaterial(10, "attack");
    var luS = levelUp("fire");
    var gS = getMaterials();
    console.log("\nSorten-Verbrauch: EMBER (" + materialInfoOf("fire").name + ") Lv1→Lv" +
      (luS && luS.newLvl) + "  " + JSON.stringify(gS));
    check("levelUp zieht genau 3 von 'attack' ab", luS && luS.materialSpent === 3 &&
      gS.attack === 7, gS.attack);
    check("levelUp lässt 'speed'/'special' unberührt", gS.speed === 50 && gS.special === 50);
    check("levelUp meldet die Sorte mit", luS && luS.materialType === "attack" &&
      luS.materialName === "Angriffs-Essenz");
    check("view() nennt Sorte + Bestand dieser Sorte", (function () {
      var v = view("water");
      return v.materialType === "speed" && v.materialName === "Tempo-Essenz" &&
             v.haveMaterial === 50;
    })());

    /* --- 5. Level & Cap-Gating --- */
    API._reset();
    addDrop("earth", "common", 1);
    addMaterial(5000);
    check("Level-Up braucht Besitz", canLevelUp("light").reason === "unowned");
    var steps = 0, guard = 0;
    while (levelUp("earth") && guard++ < 200) steps++;
    var ec = get().cards.earth;
    console.log("\nCap-Gating: Gewöhnlich → " + steps + " Level-Ups → Lv" + ec.lvl);
    check("Level stoppt bei Cap 25", ec.lvl === 25 && steps === 24, "Lv" + ec.lvl + " nach " + steps);
    check("canLevelUp meldet 'cap'", canLevelUp("earth").reason === "cap");
    check("levelUp über Cap schlägt fehl", levelUp("earth") === null);
    addDrop("earth", "common", 3);
    merge("earth", "common");
    check("nach Merge: Stufe Gut, Cap 40, Level bleibt 25", get().cards.earth.tier === "good" &&
      capOf(get().cards.earth.tier) === 40 && get().cards.earth.lvl === 25);
    check("canLevelUp wieder ok", canLevelUp("earth").ok === true);
    var lu = levelUp("earth");
    check("Level-Up kostet 4 Material auf Stufe Gut", lu && lu.materialSpent === 4 && lu.newLvl === 26,
      lu && ("Lv" + lu.newLvl + " / " + lu.materialSpent + " " + lu.materialName + " / " +
             lu.goldCost + " Gold"));
    check("Gold-Kosten werden nur gemeldet, nicht abgezogen", get().gold === null);
    API._reset();
    addDrop("light", "common", 1); addMaterial(2, "speed");
    check("canLevelUp meldet Material-Mangel", canLevelUp("light").reason === "material");
    addMaterial(10, "speed");
    check("canLevelUp meldet Gold-Mangel", canLevelUp("light", 50).reason === "gold");

    /* --- 6. Material-/Gold-Gesamtbedarf einer Karte Lv1→100 --- */
    (function () {
      var mat = 0, gold = 0, tIdx = 0;
      for (var l = 1; l < 100; l++) {
        while (tIdx < TIERS.length - 1 && l > TIERS[tIdx].cap) tIdx++;
        mat += materialFor(l, tIdx);
        gold += goldFor(l);
      }
      console.log("\nEine Karte von Lv1 auf Lv100: " + mat + " Material + " + fmt(gold) +
        " Gold + 243 Gewöhnlich-Kopien (Merge-Pyramide)");
      check("Material-Gesamtbedarf 400-700", mat > 400 && mat < 700, mat);
    })();

    /* --- 6b. Sichtbarer Pity-Counter (AA-Muster §8.2) --- */
    API._reset();
    var ps0 = getPityStatus();
    console.log("\nPity-Status (offen angezeigt, AA-Muster §8.2):");
    console.log("  frischer Zähler:  Episch in ≤" + ps0.epicIn + " Packs, Legendär in ≤" +
      ps0.legendaryIn + "   (Schwellen " + ps0.epicThreshold + "/" + ps0.legendaryThreshold + ")");
    check("frischer Pity-Status: 26 / 76", ps0.epicIn === PITY_EPIC + 1 &&
      ps0.legendaryIn === PITY_LEGENDARY + 1, ps0.epicIn + " / " + ps0.legendaryIn);
    (function () {
      // Zähler auf 24 setzen und den Countdown gegen die Realität prüfen.
      var st = get(); st.pityEpic = 24; st.pityLegendary = 60; save(st);
      var ps = getPityStatus();
      console.log("  Zähler 24/60:     Episch in ≤" + ps.epicIn + " Packs, Legendär in ≤" + ps.legendaryIn);
      check("Countdown zählt runter (24 → Episch in ≤2)", ps.epicIn === 2 && ps.legendaryIn === 16,
        ps.epicIn + " / " + ps.legendaryIn);
      // Genau epicIn Packs öffnen → spätestens im letzten MUSS Episch+ drin sein.
      var r3 = mulberry32(777), sawEpic = false, need = ps.epicIn;
      for (var q = 0; q < need; q++) {
        var pr3 = openPack("bronze", POOL, HEROES, r3);
        for (var s3 = 0; s3 < pr3.cards.length; s3++) if (pr3.cards[s3].tierIndex >= 3) sawEpic = true;
      }
      check("Zusage hält: nach " + need + " Packs war ein Episches dabei", sawEpic);
      check("Pity-Status nach dem Treffer zurückgesetzt", getPityStatus().epicIn === PITY_EPIC + 1,
        getPityStatus().epicIn);
      check("openPack liefert pityStatus mit", typeof openPack("bronze", POOL, HEROES, r3)
        .pityStatus.epicIn === "number");
    })();

    /* --- 7. Migration v1 → v2 → v3 --- */
    API._reset();
    var v1 = {
      v: 1, dust: 300, material: 0, pityEpic: 3, pityLegendary: 9, packsOpened: 44,
      cards: {
        fire:  { lvl: 45, copies: 12, perks: ["fire_good_burnlen"] },   // v1 Episch/blau
        water: { lvl: 8,  copies: 5,  perks: [] },                      // v1 Gewöhnlich
        light: { lvl: 100, copies: 50, perks: [] },                     // v1 Suprem
      },
    };
    API._write(v1);
    var mg = migrateV1();
    var ms = get();
    var mgMat = getMaterials();
    console.log("\nMigration v1→v3 (zwei Stufen in einem Durchlauf): " + mg.cards +
      " Karten, Material " + JSON.stringify(mgMat));
    Object.keys(ms.cards).forEach(function (k) {
      var c = ms.cards[k];
      console.log("  " + pad(k, 8) + tierOf(c.tier).name + " Lv" + c.lvl +
        "  Kopien " + c.copies[c.tier] + "  Boni [" + c.mergeBoni.join(",") + "]");
    });
    check("v1 Lv45 (blau) → Selten, Level gekappt auf 55", ms.cards.fire.tier === "rare" &&
      ms.cards.fire.lvl === 45);
    check("v1 Lv8 → Gewöhnlich Lv8", ms.cards.water.tier === "common" && ms.cards.water.lvl === 8);
    check("v1 Lv100 → Suprem Lv100", ms.cards.light.tier === "supreme" && ms.cards.light.lvl === 100);
    check("jede migrierte Karte besitzt 1 Kopie ihrer Stufe", Object.keys(ms.cards).every(function (k) {
      return ms.cards[k].copies[ms.cards[k].tier] === 1;
    }));
    check("alte Kopien + Staub → Material (12+5+50 + 300/10 = 97)", mgMat.total === 97, mgMat.total);
    check("v1-Material auf 3 Sorten verteilt (33/32/32)", mgMat.attack === 33 &&
      mgMat.speed === 32 && mgMat.special === 32, JSON.stringify(mgMat));
    check("altes Zahlenfeld `material` ist weg", get().material === undefined);
    check("alte Perks überleben als mergeBoni", ms.cards.fire.mergeBoni.length === 1);
    check("Migration läuft nur einmal", migrateV1().skipped === true);
    check("State-Version ist 3", get().v === 3, get().v);
    check("Pity-Zähler überleben die Migration", get().pityEpic === 3 && get().pityLegendary === 9);

    /* --- 7b. Migration v2 → v3 (Material-Sorten) --- */
    API._reset();
    var v2 = {
      v: 2, material: 100, gold: null, pityEpic: 7, pityLegendary: 31, packsOpened: 88,
      cards: {
        fire:  { tier: "good", lvl: 30, copies: { common: 2, good: 1, rare: 0, epic: 0, legendary: 0, supreme: 0 },
                 mergeBoni: ["fire_good_rate"], pendingBoni: [] },
        water: { tier: "common", lvl: 11, copies: { common: 4, good: 0, rare: 0, epic: 0, legendary: 0, supreme: 0 },
                 mergeBoni: [], pendingBoni: [] },
      },
    };
    API._write(v2);
    var mg2 = migrateV1();
    var m2 = getMaterials(), s2 = get();
    console.log("\nMigration v2→v3: 100 generisches Material → " + JSON.stringify(m2));
    check("v2→v3 lief (nicht übersprungen)", mg2.skipped === false);
    check("100 Material → 34/33/33, Summe unverändert", m2.attack === 34 && m2.speed === 33 &&
      m2.special === 33 && m2.total === 100, JSON.stringify(m2));
    check("Karten/Level/Kopien/Boni bleiben unangetastet", s2.cards.fire.tier === "good" &&
      s2.cards.fire.lvl === 30 && s2.cards.fire.copies.common === 2 &&
      s2.cards.fire.mergeBoni[0] === "fire_good_rate" && s2.cards.water.copies.common === 4);
    check("Pity/packsOpened bleiben erhalten", s2.pityEpic === 7 && s2.pityLegendary === 31 &&
      s2.packsOpened === 88);
    check("State-Version nach v2→v3 ist 3", s2.v === 3, s2.v);
    check("zweiter Aufruf ist ein No-Op", migrateV1().skipped === true);
    check("EMBER kann nach der Migration sofort leveln (34 Angriffs-Essenz)",
      canLevelUp("fire", 1e9).ok === true, canLevelUp("fire", 1e9).reason || "ok");

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
