/* ==================================================================
 * ARENA FORTRESS — Festungs-Upgrades (die DRITTE Progressions-Achse)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Nachbau des in Video 6 entdeckten
 * AA-Systems, siehe arena_patches/AA_UI_REFERENZ.md §9.9 / §12.6.
 *
 * DER BELEG (§9.9): AA hat ein eigenes Bottom-Nav-Tab "Upgrade" mit einer
 * vertikalen Liste von Upgrade-Karten, die die FESTUNG des Spielers
 * dauerhaft aufwerten — völlig getrennt von den Turmkarten. Tracks:
 * "DPS" (Increases fortress attack power, +17 % → +16 %), "Attack Speed"
 * (+1 %) und "Max Health". Beobachtete Goldkosten: 6 000 · 7 000 · 8 000
 * · 9 000 · … · 17 000, also grob +1 000 pro Stufe. Stufen sind per
 * Account-Level gegated (Button zeigt dann "Level Too Low"), und der
 * Prozentwert SINKT mit steigender Stufe → abnehmender Grenznutzen bei
 * steigenden Kosten. Jede Stufe gibt zusätzlich "Power +170".
 *
 * DREI ACHSEN, so hängt es zusammen:
 *   Karten-Level    ← Upgrade-Material (3 Sorten) + Gold   [arena_cards.js]
 *   Karten-Rarität  ← 3 identische Karten mergen           [arena_cards.js]
 *   FESTUNG         ← Gold + Trophäen-Gate                 [DIESES MODUL]
 *
 * UNSER NACHBAU — was gleich ist und was nicht:
 *   ✓ ein gemeinsamer Kostenzähler über ALLE Tracks (6000 + 1000 × Stufen).
 *     Das ist der interessanteste Teil des Vorbilds: Weil die nächste Stufe
 *     unabhängig vom Track teurer wird, ist die REIHENFOLGE eine echte
 *     Entscheidung — wer zuerst Burg-HP kauft, zahlt für Prisma-Schaden mehr.
 *   ✓ abnehmender Grenznutzen (Bonus × 0.93 pro Stufe).
 *   ✓ Gates, ab denen höhere Stufen erst freigeschaltet werden.
 *   ✗ KEIN Account-Level — wir haben keins. Gegated wird über TROPHÄEN,
 *     und zwar an den in Video 6 belegten Arena-Schwellen (600 / 1200 /
 *     1500, §9.5). Damit ist das Gate gleichzeitig ein Grund, die Trophy
 *     Road zu klettern.
 *   ✗ Statt "DPS / Attack Speed / Max Health" die drei Stellschrauben, die
 *     unser Spiel tatsächlich hat: Burg-HP, Prisma-Schaden, Prisma-Tempo.
 *
 * WARUM DAS WICHTIG IST: DESIGN_PROGRESSION.md dokumentiert, dass Gold der
 * Endgame-Bottleneck ist (eine Karte Lv1→100 kostet 3.4 Mio Gold ≈ 600
 * Tage). Ein Festungsbaum ist die ZWEITE sinnvolle Gold-Senke — planbar,
 * abgeschlossen (46,65 Mio Gold für alle 300 Stufen) und für JEDES Match
 * wirksam, nicht nur für eine Karte. Er nimmt der Karten-Goldkurve den
 * Druck, ohne die Sammlung zu entwerten.
 *
 * WIRING:
 *   1. arena_pan.html — Match-Start, die drei Multiplikatoren anlegen:
 *        const fm = ArenaFortress.totalMultipliers();
 *        // Burg-HP (Doku: 15000)
 *        const CASTLE_MAX = Math.round(15000 * fm.hpMul);
 *        castleHP = CASTLE_MAX;
 *        // Prisma-Laser
 *        const PRISM_DMG_EFF = PRISM_DMG * fm.prismDmgMul;
 *        const PRISM_CD_EFF  = PRISM_CD  / fm.prismRateMul;   // Tempo → CD kürzer!
 *      ⚠ Überall, wo bisher die Konstante 15000 hart stand (auch in
 *        arena_surrender.js: `Math.min(15000, …)`), muss CASTLE_MAX rein —
 *        sonst heilt die Comeback-Mechanik auf den alten Deckel.
 *   2. Hub / deck.html — neues Tab "Festung" neben Sammlung/Schmiede/Packs:
 *        ArenaFortress.TRACKS.forEach(tr => {
 *          const i = ArenaFortress.trackInfo(tr.key);
 *          // i.locked → Button-Text "Ab {i.lockAt} 🏆" statt Preis
 *          //            (AAs "Level Too Low"-Äquivalent)
 *          // sonst    → "🪙 {i.nextCost}"  +  "{i.stat} +{i.nextPct} %"
 *          //            und "Power +{ArenaFortress.POWER_PER_STEP}"
 *        });
 *        // Kauf: Gold prüft und zieht der HUB (wie bei arena_cards.levelUp):
 *        const r = ArenaFortress.buy('hp', hubGold);
 *        if (r.ok) setHubGold(hubGold - r.cost);
 *   3. Red-Dot-Ökonomie: ArenaFortress.anyAffordable(hubGold) === true
 *      → Punkt auf dem Festungs-Tab.
 *
 * GOLD wird — exakt wie in arena_cards.js — NICHT von diesem Modul
 * verwaltet. buy(key, goldAvailable) prüft den Betrag nur mit und MELDET
 * die Kosten zurück; den Abzug macht die Hub-Wallet. Das Modul persistiert
 * ausschließlich die Stufen (localStorage "arenaFortress").
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaFortress";
  var STATE_VERSION = 1;

  /* ==================================================================
   * KALIBRIERT NACH VIDEO 9 (Burg-Upgrades im Detail, §16)
   * ------------------------------------------------------------------
   * Video 9 zeigt AAs Festungs-Screen über ~40 Karten hinweg. Belegt:
   *   · EXAKT DREI Tracks: Max Health · DPS · Attack Speed
   *   · die Kostenreihe 6 000 + 1 000 × Stufe hält über den ganzen
   *     Bereich: Stufe 12 = 17 000 (Video 6) und die hohen Karten liegen
   *     im Bereich 20-60 K — beides passt auf dieselbe Gerade.
   *   · "Power +N" WÄCHST mit der Stufe: gelesen +418 … +840. AAs
   *     konstantes "+170" aus Video 6 war der Wert einer FRÜHEN Stufe.
   *   · Attack Speed bleibt bei +1 % pro Stufe (gerundete Anzeige),
   *     DPS sinkt 17 % → 11 % → 10 % → 8 % ⇒ Decay ≈ 0.975-0.977.
   *   · Gesperrte Stufen zeigen "Level Too Low" — AA gatet über das
   *     ACCOUNT-LEVEL, nicht über Trophäen (siehe §16.4).
   * Wir bleiben bei Trophäen-Gates (der Prototyp hat kein Account-Level)
   * und verteilen sie über die volle Leiter aus Video 8.
   * ================================================================== */
  var LEVELS_PER_TRACK = 100;  // Stufen je Track (war 12 — auf Lv 100 erweitert)
  var TOTAL_CAP = 300;         // 3 Tracks × 100 — gemeinsamer Kostenzähler-Deckel
  var COST_BASE = 6000;        // AA-Beleg: erste Stufe 6 000 Gold (§9.9)
  var COST_STEP = 1000;        // AA-Beleg: +1 000 pro Stufe, über den ganzen Bereich
  var DECAY = 0.977;           // AA-Beleg §16.3: DPS 17 % → 8 % über ~30 Stufen
  var POWER_PER_STEP = 170;    // Basiswert; growPower() staffelt ihn (§16.3)

  /* ---------- Tracks ----------
   * base = Bonus der ERSTEN Stufe. Stufe n gibt base × 0.93^(n-1).
   * Bei 100 Stufen landet die letzte auf 0.977^99 = 9.9 % des Startwerts:
   *   hp        6.00 %  →  0.59 %   (Summe +235 %)
   *   prismDmg  8.00 %  →  0.79 %   (Summe +314 %)
   *   prismRate 5.00 %  →  0.49 %   (Summe +196 %)
   * Die Design-Vorgabe lautete "abnehmend bis etwa die Hälfte" (3 / 4 /
   * 2.5 %); maßgeblich ist der Decay-Faktor, weil er die KURVE definiert —
   * die Endpunkte sind sein Ergebnis, nicht umgekehrt. */
  var TRACKS = [
    { key: "hp",        mulKey: "hpMul",        base: 0.06, sym: "🛡",
      name: "Burg-Stabilität", stat: "Burg-HP",
      desc: "Erhöht die Lebenspunkte deiner Burg" },
    { key: "prismDmg",  mulKey: "prismDmgMul",  base: 0.08, sym: "🔺",
      name: "Prisma-Fokus", stat: "Prisma-Schaden",
      desc: "Erhöht den Schaden des Prisma-Lasers" },
    { key: "prismRate", mulKey: "prismRateMul", base: 0.05, sym: "⚡",
      name: "Prisma-Taktung", stat: "Prisma-Tempo",
      desc: "Verkürzt die Abklingzeit des Prisma-Lasers" },
  ];
  var TRACK_KEYS = TRACKS.map(function (t) { return t.key; });
  var TRACK_BY_KEY = {};
  TRACKS.forEach(function (t) { TRACK_BY_KEY[t.key] = t; });

  /* ---------- Trophäen-Gates ----------
   * `upTo` = bis zu dieser GESAMT-Stufennummer (über alle Tracks) gilt die
   * Schwelle. Die Werte sind AAs belegte Arena-Aufstiege (§9.5):
   * Arena 3 = 600, Arena 5 = 1200, Arena 6 ≈ 1500. Stufen 1-6 sind frei,
   * damit die Festung schon im Tutorial-Umfeld anfassbar ist. */
  /* Trophäen-Gates über die VOLLE Leiter aus Video 8 (§15.2) verteilt:
     je 20 gekaufte Gesamtstufen ein neues Tor, die Schwellen sind exakt
     die belegten Arena- bzw. Liga-Tor-Werte. Die ersten 20 Stufen sind
     frei, damit die Festung schon im Tutorial anfassbar ist. */
  var GATES = [
    { upTo: 20,  trophies: 0,    label: "frei" },
    { upTo: 40,  trophies: 300,  label: "Arena 2" },
    { upTo: 60,  trophies: 600,  label: "Arena 3" },
    { upTo: 80,  trophies: 900,  label: "Arena 4" },
    { upTo: 100, trophies: 1200, label: "Arena 5" },
    { upTo: 120, trophies: 1500, label: "Arena 6" },
    { upTo: 140, trophies: 2000, label: "Arena 7" },
    { upTo: 160, trophies: 2500, label: "Arena 8" },
    { upTo: 180, trophies: 2900, label: "Liga-Tor 1" },
    { upTo: 200, trophies: 3500, label: "Liga-Tor 2" },
    { upTo: 220, trophies: 4500, label: "Liga-Tor 4" },
    { upTo: 240, trophies: 5000, label: "Liga-Tor 5" },
    { upTo: 260, trophies: 6000, label: "Liga-Tor 6" },
    { upTo: 280, trophies: 7000, label: "Liga-Tor 7" },
    { upTo: 300, trophies: 9000, label: "Liga-Tor 9" },
  ];

  /* ---------- Power-Zuwachs (AA-Beleg §16.3) ----------
   * Video 6 zeigte "Power +170" auf einer FRÜHEN Stufe, Video 9 auf
   * höheren Karten +418 … +840. Der Zuwachs wächst also linear mit der
   * Gesamtstufe. powerAt(n) = 170 + 6 × (n−1):
   *   Stufe 1 = 170 · Stufe 42 = 416 · Stufe 100 = 764 · Stufe 300 = 1 964
   * Damit liegen AAs gelesene Werte genau im Band der mittleren Stufen. */
  var POWER_GROW = 6;
  function powerAt(stepNo) {
    stepNo = Math.max(1, stepNo | 0);
    return POWER_PER_STEP + POWER_GROW * (stepNo - 1);
  }
  // Summe der Power über die ersten n Gesamtstufen.
  function powerSum(n) {
    n = Math.max(0, n | 0);
    return n * POWER_PER_STEP + POWER_GROW * (n * (n - 1) / 2);
  }

  /* ================= Persistenz ================= */

  var memStore = null; // Node-Fallback

  function hostObj() {
    if (typeof window !== "undefined" && window) return window;
    if (typeof globalThis !== "undefined" && globalThis) return globalThis;
    return null;
  }
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
    var s = { v: STATE_VERSION, lvl: {}, steps: 0, goldSpent: 0 };
    for (var i = 0; i < TRACK_KEYS.length; i++) s.lvl[TRACK_KEYS[i]] = 0;
    return s;
  }
  function get() {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    var raw = (s.lvl && typeof s.lvl === "object") ? s.lvl : {};
    var steps = 0;
    s.lvl = {};                         // neu aufgebaut → fremde Keys fallen weg
    for (var i = 0; i < TRACK_KEYS.length; i++) {
      var key = TRACK_KEYS[i];
      var l = Math.max(0, Math.min(LEVELS_PER_TRACK, raw[key] | 0));
      s.lvl[key] = l;
      steps += l;
    }
    s.steps = steps;                    // immer aus lvl abgeleitet, nie blind vertraut
    s.goldSpent = Math.max(0, s.goldSpent | 0);
    s.v = STATE_VERSION;
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  /* ================= Trophäen (defensiv) ================= */

  /* Liest ArenaProfile.get().trophies, wenn das Modul geladen ist. Fehlt es
   * (Standalone-Prototyp, Node-Test), gilt 0 — dann sind genau die ersten
   * 6 freien Stufen kaufbar und niemand läuft in einen Fehler. */
  function trophiesNow(override) {
    if (typeof override === "number" && isFinite(override)) return Math.max(0, Math.floor(override));
    try {
      var h = hostObj();
      var p = h && h.ArenaProfile;
      if (p && typeof p.get === "function") {
        var t = p.get().trophies;
        if (typeof t === "number" && isFinite(t)) return Math.max(0, Math.floor(t));
      }
    } catch (e) {}
    return 0;
  }

  /* ================= Kosten, Boni, Gates ================= */

  // Preis der NÄCHSTEN Stufe bei `steps` bereits gekauften Stufen (alle Tracks).
  function costAt(steps) {
    steps = Math.max(0, Math.min(TOTAL_CAP - 1, steps | 0));
    return COST_BASE + COST_STEP * steps;
  }
  // Gesamtkosten aller 36 Stufen — die Größe der Gold-Senke.
  function totalCost() {
    var s = 0;
    for (var i = 0; i < TOTAL_CAP; i++) s += costAt(i);
    return s;
  }
  // Trophäen-Schwelle für die Gesamt-Stufennummer stepNo (1-basiert).
  function gateFor(stepNo) {
    for (var i = 0; i < GATES.length; i++) if (stepNo <= GATES[i].upTo) return GATES[i];
    return GATES[GATES.length - 1];
  }
  // Bonus der n-ten Stufe eines Tracks (1-basiert), als Dezimalanteil.
  function bonusAt(trackKey, n) {
    var tr = TRACK_BY_KEY[trackKey];
    if (!tr || n < 1 || n > LEVELS_PER_TRACK) return 0;
    return tr.base * Math.pow(DECAY, n - 1);
  }
  // Summe der Boni bis einschließlich Stufe lvl → Multiplikator = 1 + Summe.
  function bonusTotal(trackKey, lvl) {
    var s = 0;
    lvl = Math.max(0, Math.min(LEVELS_PER_TRACK, lvl | 0));
    for (var n = 1; n <= lvl; n++) s += bonusAt(trackKey, n);
    return s;
  }

  /* ================= API ================= */

  /* trackInfo(key, trophiesOverride)
   *   → {key, name, stat, sym, desc, lvl, maxLvl, maxed, stepNo,
   *      nextCost, nextBonus, nextPct, totalBonus, totalPct, mul,
   *      locked, lockAt, lockLabel, trophies, power, capReached} */
  function trackInfo(key, trophiesOverride) {
    var tr = TRACK_BY_KEY[key];
    if (!tr) return null;
    var st = get();
    var lvl = st.lvl[key] | 0;
    var maxed = lvl >= LEVELS_PER_TRACK;
    var capReached = st.steps >= TOTAL_CAP;
    var stepNo = st.steps + 1;                 // die nächste GESAMT-Stufennummer
    var gate = gateFor(stepNo);
    var troph = trophiesNow(trophiesOverride);
    var locked = !maxed && !capReached && troph < gate.trophies;
    var nb = maxed ? 0 : bonusAt(key, lvl + 1);
    var tb = bonusTotal(key, lvl);
    return {
      key: key, name: tr.name, stat: tr.stat, sym: tr.sym, desc: tr.desc,
      lvl: lvl, maxLvl: LEVELS_PER_TRACK, maxed: maxed, capReached: capReached,
      stepNo: maxed || capReached ? null : stepNo,
      nextCost: maxed || capReached ? null : costAt(st.steps),
      nextBonus: nb, nextPct: Math.round(nb * 1000) / 10,
      totalBonus: tb, totalPct: Math.round(tb * 1000) / 10,
      mul: 1 + tb,
      locked: locked, lockAt: locked ? gate.trophies : null,
      lockLabel: locked ? gate.label : null,
      trophies: troph, power: lvl * POWER_PER_STEP,
      nextPower: maxed || capReached ? null : powerAt(stepNo),
    };
  }

  // Alle drei Tracks auf einmal (für das Tab-Rendering).
  function allTracks(trophiesOverride) {
    return TRACK_KEYS.map(function (k) { return trackInfo(k, trophiesOverride); });
  }

  /* buy(key, goldAvailable, trophiesOverride)
   *   → {ok, reason, cost, lvl, bonus, pct, mul, power, steps}
   * reason: "" | "unknown" | "maxed" | "cap" | "locked" | "gold"
   * Zieht KEIN Gold ab (siehe Kopfkommentar) — nur die Stufe wird gebucht. */
  function buy(key, goldAvailable, trophiesOverride) {
    var tr = TRACK_BY_KEY[key];
    if (!tr) return { ok: false, reason: "unknown", cost: null };
    var st = get();
    var lvl = st.lvl[key] | 0;
    var out = { ok: false, reason: "", cost: costAt(st.steps), lvl: lvl,
                steps: st.steps, lockAt: null };
    if (lvl >= LEVELS_PER_TRACK) { out.reason = "maxed"; out.cost = null; return out; }
    if (st.steps >= TOTAL_CAP) { out.reason = "cap"; out.cost = null; return out; }
    var gate = gateFor(st.steps + 1);
    var troph = trophiesNow(trophiesOverride);
    if (troph < gate.trophies) {
      out.reason = "locked"; out.lockAt = gate.trophies; out.trophies = troph; return out;
    }
    if (goldAvailable !== undefined && goldAvailable !== null && goldAvailable < out.cost) {
      out.reason = "gold"; return out;
    }
    var bonus = bonusAt(key, lvl + 1);
    st.lvl[key] = lvl + 1;
    st.steps += 1;
    st.goldSpent += out.cost;
    save(st);
    out.ok = true;
    out.lvl = lvl + 1;
    out.steps = st.steps;
    out.bonus = bonus;
    out.pct = Math.round(bonus * 1000) / 10;
    out.mul = 1 + bonusTotal(key, lvl + 1);
    out.power = powerAt(st.steps);
    out.totalPower = powerSum(st.steps);
    return out;
  }

  /* totalMultipliers() → {hpMul, prismDmgMul, prismRateMul, steps, power}
   * Das ist die EINE Funktion, die das Match braucht. */
  function totalMultipliers() {
    var st = get();
    var out = { steps: st.steps, power: powerSum(st.steps), goldSpent: st.goldSpent };
    for (var i = 0; i < TRACKS.length; i++) {
      out[TRACKS[i].mulKey] = 1 + bonusTotal(TRACKS[i].key, st.lvl[TRACKS[i].key]);
    }
    return out;
  }

  // Ist irgendeine Stufe JETZT kaufbar? (Red-Dot-Ökonomie)
  function anyAffordable(goldAvailable, trophiesOverride) {
    for (var i = 0; i < TRACK_KEYS.length; i++) {
      var inf = trackInfo(TRACK_KEYS[i], trophiesOverride);
      if (!inf.maxed && !inf.capReached && !inf.locked &&
          (goldAvailable === undefined || goldAvailable === null || goldAvailable >= inf.nextCost)) return true;
    }
    return false;
  }

  // Nächste Trophäen-Schwelle, die neue Stufen öffnet (oder null).
  function nextGate(trophiesOverride) {
    var st = get(), troph = trophiesNow(trophiesOverride);
    if (st.steps >= TOTAL_CAP) return null;
    var g = gateFor(st.steps + 1);
    return troph < g.trophies ? { trophies: g.trophies, label: g.label, missing: g.trophies - troph } : null;
  }

  function reset() { save(fresh()); return get(); }

  var API = {
    TRACKS: TRACKS, TRACK_KEYS: TRACK_KEYS, GATES: GATES,
    LEVELS_PER_TRACK: LEVELS_PER_TRACK, TOTAL_CAP: TOTAL_CAP,
    COST_BASE: COST_BASE, COST_STEP: COST_STEP, DECAY: DECAY,
    POWER_PER_STEP: POWER_PER_STEP, POWER_GROW: POWER_GROW,
    powerAt: powerAt, powerSum: powerSum,
    get: get, trackInfo: trackInfo, allTracks: allTracks, buy: buy,
    totalMultipliers: totalMultipliers, anyAffordable: anyAffordable,
    nextGate: nextGate, costAt: costAt, totalCost: totalCost,
    bonusAt: bonusAt, bonusTotal: bonusTotal, gateFor: gateFor,
    reset: reset,
    _key: KEY, _write: function (s) { save(s); },
  };

  if (typeof window !== "undefined") window.ArenaFortress = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_fortress.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, info) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (info !== undefined ? "  " + info : ""));
      if (!cond) fail++;
    };
    var pad = function (s, n) { s = String(s); while (s.length < n) s += " "; return s; };
    var padL = function (s, n) { s = String(s); while (s.length < n) s = " " + s; return s; };
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
    var r1 = function (x) { return Math.round(x * 10) / 10; };
    // Trophäen-Quelle für den Test simulieren (ArenaProfile-Stub).
    var TROPH = 0;
    globalThis.ArenaProfile = { get: function () { return { trophies: TROPH }; } };

    console.log("\n=== ARENA FORTRESS — Selbsttest (3. Progressions-Achse) ===\n");

    /* --- 1. Tracks & Bonus-Kurve --- */
    console.log("Tracks (Bonus je Stufe, Decay " + DECAY + "):");
    TRACKS.forEach(function (tr) {
      var row = [];
      for (var n = 1; n <= LEVELS_PER_TRACK; n++) row.push(r1(bonusAt(tr.key, n) * 100));
      console.log("  " + tr.sym + " " + pad(tr.name, 18) + pad(tr.stat, 16) +
        "+" + row.join(" / ") + " %");
      console.log("       Summe nach 12 Stufen: +" + r1(bonusTotal(tr.key, LEVELS_PER_TRACK) * 100) +
        " %  → Multiplikator " + (1 + bonusTotal(tr.key, LEVELS_PER_TRACK)).toFixed(3) + "×");
    });
    check("3 Tracks", TRACKS.length === 3, TRACK_KEYS.join("/"));
    check("Startboni 6 / 8 / 5 %", r1(bonusAt("hp", 1) * 100) === 6 &&
      r1(bonusAt("prismDmg", 1) * 100) === 8 && r1(bonusAt("prismRate", 1) * 100) === 5);
    check("Diminishing: Bonus fällt streng monoton", TRACK_KEYS.every(function (k) {
      for (var n = 2; n <= LEVELS_PER_TRACK; n++) if (!(bonusAt(k, n) < bonusAt(k, n - 1))) return false;
      return true;
    }));
    check("Decay-Faktor exakt 0.93 pro Stufe", TRACK_KEYS.every(function (k) {
      for (var n = 2; n <= LEVELS_PER_TRACK; n++) {
        if (Math.abs(bonusAt(k, n) / bonusAt(k, n - 1) - DECAY) > 1e-12) return false;
      }
      return true;
    }));
    // AA-kalibriert (§16.3): Decay 0.977 — Stufe 100 liegt bei 0.977^99 ≈ 9.9 %
    // des Startbonus. AAs DPS lief 17 % → 8 % über ~30 Stufen, das ist genau
    // diese Kurve. Die Anzeige rundet auf 0,1 %; Attack Speed steht deshalb
    // in AA lange auf "+1 %".
    check("letzte Stufe ≈ 9.9 % des Startbonus (0.977^99)",
      Math.abs(bonusAt("hp", LEVELS_PER_TRACK) / bonusAt("hp", 1) -
               Math.pow(DECAY, LEVELS_PER_TRACK - 1)) < 1e-12 &&
      Math.abs(bonusAt("hp", LEVELS_PER_TRACK) / bonusAt("hp", 1) - 0.099) < 0.005,
      r1(bonusAt("hp", LEVELS_PER_TRACK) * 100) + " % / " +
      r1(bonusAt("prismDmg", LEVELS_PER_TRACK) * 100) + " % / " +
      r1(bonusAt("prismRate", LEVELS_PER_TRACK) * 100) + " %");
    check("AA-Anker: DPS Stufe 1 ≈ 8 %, Stufe 30 ≈ 4 % (Video 9)",
      Math.round(bonusAt("prismDmg", 1) * 100) === 8 &&
      Math.abs(bonusAt("prismDmg", 30) * 100 - 4.0) < 0.4,
      r1(bonusAt("prismDmg", 1) * 100) + " % → " + r1(bonusAt("prismDmg", 30) * 100) + " %");
    check("Bonus jenseits des Track-Caps ist 0",
      bonusAt("hp", LEVELS_PER_TRACK + 1) === 0 && bonusAt("hp", 0) === 0);
    check("unbekannter Track → kein Bonus, kein Crash", bonusAt("quatsch", 1) === 0 &&
      trackInfo("quatsch") === null);

    /* --- 2. Kostenreihe (der gemeinsame Zähler) --- */
    var series = [];
    for (var i = 0; i < TOTAL_CAP; i++) series.push(costAt(i));
    console.log("\nKostenreihe (gemeinsam über ALLE Tracks, +" + COST_STEP + " je Stufe):");
    console.log("  " + series.slice(0, 12).map(fmt).join(" · "));
    console.log("  " + series.slice(12, 24).map(fmt).join(" · "));
    console.log("  " + series.slice(24).map(fmt).join(" · "));
    console.log("  Gesamt für alle " + TOTAL_CAP + " Stufen: " + fmt(totalCost()) + " Gold");
    check("Reihe beginnt 6000 · 7000 · 8000 · 9000 (AA-Beleg §9.9)",
      series.slice(0, 4).join(",") === "6000,7000,8000,9000", series.slice(0, 4).join(" · "));
    check("AAs beobachtete 17 000 liegen auf der Reihe", series.indexOf(17000) === 11,
      "Stufe " + (series.indexOf(17000) + 1));
    check("Reihe streng steigend, letzte Stufe 305 000",
      series.every(function (c, j) { return j === 0 || c > series[j - 1]; }) &&
      series[TOTAL_CAP - 1] === 305000, fmt(series[TOTAL_CAP - 1]));
    // Video 9 zeigt auf hohen Karten Kosten im Bereich 20-60 K — die
    // Gerade 6000 + 1000 × Stufe trifft das (Stufe 20 = 25 K, Stufe 55 = 60 K).
    check("AA-Anker: Stufe 20 = 25 000, Stufe 55 = 60 000",
      series[19] === 25000 && series[54] === 60000, series[19] + " / " + series[54]);
    check("Gesamtkosten 46,65 Mio Gold (Endgame-Gold-Senke)",
      totalCost() === 46650000, fmt(totalCost()));

    /* --- 3. Gemeinsamer Zähler: Reihenfolge ist eine Entscheidung --- */
    reset();
    TROPH = 9999;
    var b1 = buy("hp", 1e9);
    var b2 = buy("prismDmg", 1e9);
    var b3 = buy("hp", 1e9);
    console.log("\nGemeinsamer Kostenzähler: hp(6000) → prismDmg(" + fmt(b2.cost) +
      ") → hp(" + fmt(b3.cost) + ")");
    check("2. Kauf kostet 7000, obwohl anderer Track", b2.ok && b2.cost === 7000, b2.cost);
    check("3. Kauf kostet 8000", b3.ok && b3.cost === 8000, b3.cost);
    check("Stufen korrekt gebucht (hp 2, prismDmg 1)", get().lvl.hp === 2 &&
      get().lvl.prismDmg === 1 && get().steps === 3);
    check("goldSpent mitgeführt (6000+7000+8000)", get().goldSpent === 21000, get().goldSpent);
    check("trackInfo.nextCost == costAt(steps)", trackInfo("prismRate").nextCost === 9000,
      trackInfo("prismRate").nextCost);
    // AA §16.3: der Power-Zuwachs WÄCHST mit der Stufe (+170 früh, +418…+840 später).
    check("Power wächst mit der Stufe (powerSum(3) = 528)",
      totalMultipliers().power === powerSum(3) && powerSum(3) === 528,
      totalMultipliers().power);
    check("AA-Anker: powerAt(42) ≈ 416, powerAt(100) = 764",
      powerAt(42) === 416 && powerAt(100) === 764, powerAt(42) + " / " + powerAt(100));

    /* --- 4. Gold-Schranke (Abzug macht der Hub) --- */
    reset();
    check("zu wenig Gold → reason 'gold', keine Stufe", buy("hp", 5999).reason === "gold" &&
      get().lvl.hp === 0);
    check("genau der Preis reicht", buy("hp", 6000).ok === true);
    check("ohne Gold-Argument wird nicht geprüft (Aufrufer-Verantwortung)",
      buy("hp").ok === true, "lvl " + get().lvl.hp);
    check("Modul zieht kein Gold ab (kennt keine Wallet)", get().goldSpent === 13000 &&
      totalMultipliers().goldSpent === 13000, get().goldSpent);

    /* --- 5. Trophäen-Gate (AA: "Level Too Low") --- */
    reset();
    TROPH = 0;
    var bought = 0, guard = 0;
    while (guard++ < 60) {
      var done = false;
      for (var t = 0; t < TRACK_KEYS.length; t++) {
        if (buy(TRACK_KEYS[t], 1e9).ok) { bought++; done = true; break; }
      }
      if (!done) break;
    }
    console.log("\nGate-Sperre bei 0 Trophäen: " + bought + " Stufen kaufbar, dann blockiert");
    check("bei 0 🏆 sind genau 20 Stufen kaufbar", bought === 20, bought);
    var lockInfo = trackInfo("hp");
    console.log("  trackInfo.locked = " + lockInfo.locked + ", lockAt = " + lockInfo.lockAt +
      " 🏆 (" + lockInfo.lockLabel + ")");
    check("21. Stufe gesperrt, lockAt 300 (Arena-2-Schwelle)", lockInfo.locked === true &&
      lockInfo.lockAt === 300, lockInfo.lockAt);
    check("buy() verweigert mit reason 'locked'", buy("hp", 1e9).reason === "locked");
    check("nextGate() nennt die Lücke", (function () {
      var g = nextGate(); return g && g.trophies === 300 && g.missing === 300;
    })(), JSON.stringify(nextGate()));
    check("anyAffordable false bei Gate-Sperre", anyAffordable(1e9) === false);
    TROPH = 300;
    check("ab 300 🏆 wieder kaufbar", trackInfo("hp").locked === false && buy("hp", 1e9).ok === true);
    check("anyAffordable true nach dem Gate", anyAffordable(1e9) === true);
    // Bis Stufe 40 durchkaufen, dann muss das 600er-Tor greifen
    TROPH = 300; guard = 0;
    while (get().steps < 40 && guard++ < 200) {
      for (var t2 = 0; t2 < TRACK_KEYS.length; t2++) if (buy(TRACK_KEYS[t2], 1e9).ok) break;
    }
    check("Stufe 41 verlangt 600 🏆 (Arena 3)", get().steps === 40 &&
      trackInfo("prismRate").lockAt === 600, get().steps + " Stufen, lockAt " +
      trackInfo("prismRate").lockAt);
    TROPH = 600;
    check("ab 600 🏆 geht es weiter", buy("prismRate", 1e9).ok === true);
    // Gates liegen auf der vollen Video-8-Leiter (§15.2).
    check("Gate-Stufen 281-300 verlangen 9000 🏆 (Liga-Tor 9)",
      gateFor(281).trophies === 9000 && gateFor(300).trophies === 9000);
    check("Gates decken alle 300 Stufen ab", GATES[GATES.length - 1].upTo === TOTAL_CAP);
    check("Gate-Schwellen sind echte Leiter-Werte (Video 8)", GATES.every(function (g) {
      return [0, 300, 600, 900, 1200, 1500, 2000, 2500, 2900, 3500, 4000, 4500,
              5000, 6000, 7000, 8000, 9000].indexOf(g.trophies) >= 0;
    }));

    /* --- 6. Caps: 12 je Track, 36 gesamt --- */
    reset();
    TROPH = 99999;
    var n1 = 0;
    while (buy("hp", 1e9).ok && n1++ < 400) {}
    console.log("\nTrack-Cap: " + n1 + " Käufe auf 'hp', dann reason '" + buy("hp", 1e9).reason + "'");
    check("Track-Cap 100", get().lvl.hp === 100 && n1 === 100, get().lvl.hp);
    check("über dem Track-Cap: reason 'maxed', nextCost null", buy("hp", 1e9).reason === "maxed" &&
      trackInfo("hp").nextCost === null && trackInfo("hp").maxed === true);
    check("gemaxter Track blockiert die anderen NICHT", buy("prismDmg", 1e9).ok === true);
    // alles vollkaufen
    guard = 0;
    while (guard++ < 200) {
      var any = false;
      for (var t3 = 0; t3 < TRACK_KEYS.length; t3++) if (buy(TRACK_KEYS[t3], 1e9).ok) any = true;
      if (!any) break;
    }
    var st9 = get(), tm = totalMultipliers();
    console.log("Voll ausgebaut: " + st9.steps + " Stufen, " + fmt(st9.goldSpent) + " Gold, Power " +
      tm.power);
    console.log("  hpMul " + tm.hpMul.toFixed(3) + "×   prismDmgMul " + tm.prismDmgMul.toFixed(3) +
      "×   prismRateMul " + tm.prismRateMul.toFixed(3) + "×");
    console.log("  Wirkung: Burg 15 000 → " + fmt(Math.round(15000 * tm.hpMul)) +
      " HP · Prisma-CD ×" + (1 / tm.prismRateMul).toFixed(3));
    check("Gesamt-Cap 36 erreicht", st9.steps === TOTAL_CAP, st9.steps);
    check("alle Tracks auf 100", TRACK_KEYS.every(function (k) { return st9.lvl[k] === 100; }));
    check("Gold-Summe == totalCost()", st9.goldSpent === totalCost(), fmt(st9.goldSpent));
    check("hpMul ≈ 3.354 (+235 % Burg-HP bei Lv 100)",
      Math.abs(tm.hpMul - 3.354) < 0.01, tm.hpMul.toFixed(4));
    check("prismDmgMul ≈ 4.139", Math.abs(tm.prismDmgMul - 4.139) < 0.01, tm.prismDmgMul.toFixed(4));
    check("prismRateMul ≈ 2.962", Math.abs(tm.prismRateMul - 2.962) < 0.01, tm.prismRateMul.toFixed(4));
    check("Voll-Power = powerSum(300) = 320 100", tm.power === 320100 && tm.power === powerSum(300),
      fmt(tm.power));
    check("anyAffordable false am Cap", anyAffordable(1e9) === false);
    check("nextGate null am Cap", nextGate() === null);

    /* --- 7. Persistenz & Robustheit --- */
    check("reset() nullt alles", (function () {
      reset();
      var s = get(), tm2 = totalMultipliers();
      return s.steps === 0 && tm2.hpMul === 1 && tm2.prismDmgMul === 1 && tm2.prismRateMul === 1;
    })());
    check("Multiplikatoren sind ohne Käufe exakt 1.0 (kein Balance-Eingriff)",
      totalMultipliers().hpMul === 1);
    check("kaputter State wird geheilt", (function () {
      API._write({ v: 1, lvl: { hp: 999, prismDmg: -5, quatsch: 7 }, steps: 4242, goldSpent: -9 });
      var s = get();
      return s.lvl.hp === 100 && s.lvl.prismDmg === 0 && s.lvl.prismRate === 0 &&
             s.steps === 100 && s.goldSpent === 0 && s.lvl.quatsch === undefined;
    })(), JSON.stringify(get().lvl));
    check("fehlendes ArenaProfile → 0 Trophäen, keine Exception", (function () {
      reset();
      var keep = globalThis.ArenaProfile;
      delete globalThis.ArenaProfile;
      var ok = trackInfo("hp").trophies === 0 && buy("hp", 1e9).ok === true;
      globalThis.ArenaProfile = keep;
      return ok;
    })());
    check("trophiesOverride hat Vorrang vor ArenaProfile", (function () {
      reset(); TROPH = 0;
      var a = trackInfo("hp", 5000);
      for (var q = 0; q < 20; q++) buy("hp", 1e9, 5000);
      return a.trophies === 5000 && buy("prismDmg", 1e9, 5000).ok === true &&
             buy("prismDmg", 1e9, 0).reason === "locked";
    })());

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
