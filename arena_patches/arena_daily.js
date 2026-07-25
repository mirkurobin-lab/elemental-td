/* ==================================================================
 * ARENA DAILY — der tägliche Loop (Punkt 4)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Drei Bausteine, die zusammen den Grund
 * liefern, JEDEN Tag einmal reinzuschauen:
 *
 *   1. DREI TAGESQUESTS aus einem rotierenden Pool (Reset 00:00 UTC).
 *      Belohnung je Quest Gold + Material, bei 3/3 zusätzlich eine
 *      Bonus-Truhe. Der Pool rotiert TÄGLICH und deterministisch —
 *      dieselben drei Quests für jeden Spieler an demselben Tag.
 *   2. SIEGESSERIEN-BONUS: aufeinanderfolgende Siege heben den
 *      Gold-Multiplikator (1.00 → 1.50), eine Niederlage setzt ihn zurück.
 *   3. GRATIS-PACK-TIMER: alle 4 h ein Bronze-Pack, maximal 2 gestapelt.
 *      Der Stapel ist der eigentliche Trick — er verzeiht einen
 *      verpassten Blick, ohne zum Dauer-Vorrat zu werden.
 *
 * WARUM DIESE DREI ZUSAMMEN: Quests geben ein TAGESZIEL, die Serie einen
 * Grund WEITERZUSPIELEN, wenn es läuft, und der Pack-Timer einen Grund
 * ZURÜCKZUKOMMEN, wenn man aufgehört hat. Alle drei greifen an
 * unterschiedlichen Stellen der Sitzung an; einzeln trägt keiner.
 *
 * SCHNITTSTELLE — identisch zu ArenaClan und ArenaPass:
 *       ArenaDaily.reportEvent(type, amount)
 *   type: "win" | "loss" | "pack" | "donate" | "merge" | "warAttack" | "trophy"
 * "loss" ist bewusst dabei: nur so kann die Siegesserie zurückgesetzt
 * werden, ohne dass dieses Modul das Match kennt.
 *
 * WÄHRUNGS-ZUSTÄNDIGKEIT wie überall im Projekt: Material bucht das
 * Modul über ArenaCards, GOLD wird nur GEMELDET — die Wallet liegt im Hub.
 *
 * Selbsttest: `node arena_patches/arena_daily.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaDaily";
  var STATE_VERSION = 2;

  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;

  /* ---------- Quest-Pool ----------
   * Sechs Quests, drei davon pro Tag. Die Ziele sind so gesetzt, dass eine
   * einzige gute Sitzung (20-30 min) alle drei schafft — ein Tagesziel,
   * das zwei Sitzungen braucht, ist kein Tagesziel mehr.
   * Das Gold ist bewusst UNTER dem Wert eines Level-Ups im mittleren
   * Bereich (GOLD_BANDS: Lv 30 = 14 000): der tägliche Loop beschleunigt,
   * er ersetzt das Spielen nicht. */
  var QUEST_POOL = [
    { key: "wins", ev: "win", goal: 3, sym: "⚔", gold: 1200, material: 6,
      title: "Gewinne 3 Matches",
      desc: "Zählt in jedem Modus — Arena, Event oder Clankrieg." },
    { key: "donate", ev: "donate", goal: 5, sym: "📦", gold: 900, material: 8,
      title: "Spende 5 Karten an den Clan",
      desc: "Graue Basis-Kopien aus dem Überschuss reichen." },
    { key: "packs", ev: "pack", goal: 2, sym: "🎁", gold: 800, material: 5,
      title: "Öffne 2 Booster-Packs",
      desc: "Das Gratis-Pack alle 4 Stunden zählt mit." },
    { key: "merge", ev: "merge", goal: 1, sym: "⚒", gold: 1500, material: 10,
      title: "Verschmelze eine Karte",
      desc: "Drei identische Karten derselben Stufe in der Schmiede." },
    { key: "war", ev: "warAttack", goal: 3, sym: "🏰", gold: 1400, material: 9,
      title: "Führe 3 Kriegs-Angriffe aus",
      desc: "Am Wochenende in der Kriegsphase des Clans." },
    { key: "trophies", ev: "trophy", goal: 60, sym: "🏆", gold: 1000, material: 7,
      title: "Verdiene 60 Trophäen",
      desc: "Nur Gewinne zählen — Niederlagen ziehen nichts ab." },
  ];
  var QUESTS_PER_DAY = 3;
  var POOL_BY_KEY = {}, POOL_BY_EVENT = {};
  QUEST_POOL.forEach(function (q) { POOL_BY_KEY[q.key] = q; POOL_BY_EVENT[q.ev] = q; });

  // Event-Aliase, damit Aufrufer im Spiel nicht raten müssen.
  var EVENT_ALIAS = {
    win: "win", wins: "win", sieg: "win",
    loss: "loss", lose: "loss", defeat: "loss", niederlage: "loss",
    pack: "pack", packs: "pack",
    donate: "donate", donation: "donate", spende: "donate",
    merge: "merge", fusion: "merge", merges: "merge",
    waratt: "warAttack", warattack: "warAttack", warangriff: "warAttack",
    trophy: "trophy", trophies: "trophy", trophaeen: "trophy",
  };

  /* ---------- Bonus-Truhe bei 3/3 ----------
   * Deutlich größer als eine Einzelquest: Der Sprung von 2/3 auf 3/3 muss
   * sich lohnen, sonst hört man bei zwei Quests auf. */
  var BONUS_CHEST = { name: "Tagestruhe", sym: "🥈", pack: "silver",
                      gold: 3000, material: 20 };

  /* ---------- Siegesserie ----------
   * Index = laufende Siege (bei 6 gedeckelt). Erst ab dem ZWEITEN Sieg
   * gibt es etwas — sonst wäre der Bonus ein Grundeinkommen und kein Bonus. */
  var STREAK_MUL = [1.00, 1.00, 1.10, 1.20, 1.30, 1.40, 1.50];
  var STREAK_CAP = STREAK_MUL.length - 1;

  /* ---------- Gratis-Pack-Timer ---------- */
  var PACK_MS = 4 * HOUR;     // ein Pack alle 4 Stunden
  var PACK_MAX = 2;           // maximal zwei gestapelt
  var PACK_TYPE = "bronze";

  /* ================= Zeit ================= */

  var CLOCK = null;                          // Test-Hook
  function nowMs(o) {
    if (typeof o === "number" && isFinite(o)) return o;
    return CLOCK ? CLOCK() : Date.now();
  }
  // Tagesgrenze 00:00 UTC — dieselbe Begründung wie beim Clan (§3.4):
  // ein gemeinsamer Reset für alle Zeitzonen, serverkompatibel.
  function dayStart(ts) {
    var d = new Date(ts);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  function dayKey(ts) {
    var d = new Date(dayStart(ts));
    return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) +
      "-" + ("0" + d.getUTCDate()).slice(-2);
  }
  function dayIndex(ts) { return Math.floor(dayStart(ts) / DAY); }
  function hhmm(ms) {
    if (!ms || ms <= 0) return "0:00";
    var m = Math.ceil(ms / MINUTE), h = Math.floor(m / 60);
    return h + ":" + ("0" + (m % 60)).slice(-2);
  }
  function ts0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // FNV-1a mit murmur3-Finalisierung (gleiche Begründung wie arena_clan.js:
  // ohne Finalisierung sind aufeinanderfolgende Tagesindizes korreliert und
  // die Quest-Auswahl rotiert nicht wirklich).
  function hash() {
    var s = Array.prototype.join.call(arguments, "|");
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  /* ================= Persistenz ================= */

  var memStore = null;
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

  function emptyProgress() {
    var o = {};
    QUEST_POOL.forEach(function (q) { o[q.key] = 0; });
    return o;
  }
  function fresh(now) {
    return {
      v: STATE_VERSION,
      day: dayKey(now),
      progress: emptyProgress(),
      claimed: [],                 // Quest-Keys, deren Belohnung abgeholt ist
      bonusClaimed: false,
      streak: 0, bestStreak: 0,
      packBase: now,               // Anker der Pack-Ansammlung (v2)
      packsTaken: 0,
      stats: { daysCompleted: 0, questsClaimed: 0, packsTaken: 0 },
    };
  }

  /* ---- Migration v1 → v2 -------------------------------------------
   * v1 speicherte den Gratis-Pack-Stand als ZÄHLER plus Zeitstempel
   * ({packStack, packLast}). Das war anfällig: Wer die Seite lange offen
   * ließ, sammelte weiter, weil niemand den Zähler deckelte.
   * v2 nutzt stattdessen einen ANSAMMLUNGS-ANKER (`packBase`): verfügbar
   * ist floor((now − packBase) / 4 h), gedeckelt bei PACK_MAX. Der Deckel
   * ist damit eine EIGENSCHAFT DER FORMEL und keine Prüfung, die man
   * vergessen kann.
   * Die Migration rechnet den alten Stapel in einen Anker zurück, sodass
   * niemand seine bereits angesammelten Packs verliert.
   * v1 hielt außerdem die Quest-Zähler flach (state.wins statt
   * state.progress.wins). ---------------------------------------------- */
  function migrateV1toV2(old, now) {
    var s = fresh(now);
    s.day = old.day || dayKey(now);
    var op = (old.progress && typeof old.progress === "object") ? old.progress : old;
    QUEST_POOL.forEach(function (q) {
      s.progress[q.key] = Math.max(0, op[q.key] | 0);
    });
    s.claimed = Array.isArray(old.claimed) ? old.claimed.slice() : [];
    s.bonusClaimed = !!old.bonusClaimed;
    s.streak = Math.max(0, old.streak | 0);
    s.bestStreak = Math.max(s.streak, old.bestStreak | 0);
    // Stapel → Anker zurückrechnen
    var stack = clamp(old.packStack | 0, 0, PACK_MAX);
    var last = ts0(old.packLast) || now;
    s.packBase = last - stack * PACK_MS;
    s.packsTaken = Math.max(0, old.packsTaken | 0);
    if (old.stats && typeof old.stats === "object") {
      for (var k in s.stats) if (old.stats[k] !== undefined) s.stats[k] = old.stats[k] | 0;
    }
    return s;
  }
  function migrateState(old, now) { return migrateV1toV2(old || {}, now); }

  /* get(now) — normalisiert, migriert und macht den LAZY TAGES-ROLLOVER. */
  function get(now) {
    now = nowMs(now);
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var known = s.day !== undefined || s.progress !== undefined || s.packStack !== undefined;
    if (s.v !== STATE_VERSION && known) s = migrateState(s, now);
    var f = fresh(now);
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    s.v = STATE_VERSION;
    if (!s.progress || typeof s.progress !== "object") s.progress = emptyProgress();
    QUEST_POOL.forEach(function (q) { s.progress[q.key] = Math.max(0, s.progress[q.key] | 0); });
    if (!Array.isArray(s.claimed)) s.claimed = [];
    s.claimed = s.claimed.filter(function (k2) { return !!POOL_BY_KEY[k2]; });
    s.bonusClaimed = !!s.bonusClaimed;
    s.streak = Math.max(0, s.streak | 0);
    s.bestStreak = Math.max(s.streak, s.bestStreak | 0);
    if (!s.stats || typeof s.stats !== "object") s.stats = f.stats;

    /* Pack-Anker normalisieren. DAS ist der Deckel: Alles, was weiter als
     * PACK_MAX × 4 h zurückliegt, wird nach vorne gezogen — angesammelt
     * werden nie mehr als zwei Packs, egal wie lange man weg war. */
    s.packBase = ts0(s.packBase) || now;
    if (s.packBase > now) s.packBase = now;                 // Uhr zurückgestellt
    if (now - s.packBase > PACK_MAX * PACK_MS) s.packBase = now - PACK_MAX * PACK_MS;

    /* Tages-Rollover: lazy beim Lesen, kein Timer.
     * ⚠ Die SIEGESSERIE überlebt den Tageswechsel bewusst — sie hängt an
     * Matches, nicht am Kalender. Wer abends fünf Siege hat, soll morgens
     * nicht bei null anfangen. */
    if (s.day !== dayKey(now)) {
      var streak = s.streak, best = s.bestStreak, packBase = s.packBase;
      var stats = s.stats, taken = s.packsTaken;
      s = fresh(now);
      s.streak = streak; s.bestStreak = best; s.packBase = packBase;
      s.stats = stats; s.packsTaken = taken;
    }
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function telemetry() {
    try {
      var h = hostObj(), t = h && h.ArenaTelemetry;
      return (t && typeof t.track === "function") ? t : null;
    } catch (e) { return null; }
  }
  function bank() {
    var h = hostObj();
    return (h && h.ArenaCards) || null;
  }
  function bankMaterial(n) {
    var b = bank();
    if (b && n > 0) b.addMaterial(n);          // ohne Sorte → Round-Robin
  }

  /* ================= Tagesquests ================= */

  /* todayKeys(now) → die drei Quest-Keys des Tages.
   * Deterministische Auswahl ohne Wiederholung: Fisher-Yates mit einem
   * Hash-Strom über den Tagesindex. Gleicher Tag = gleiche Quests, für
   * jeden Spieler, ohne Server. */
  function todayKeys(now) {
    var di = dayIndex(nowMs(now));
    var pool = QUEST_POOL.map(function (q) { return q.key; });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = hash("daily", di, i) % (i + 1);
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, QUESTS_PER_DAY);
  }

  /* quests(now) → drei Quests mit Fortschritt und Belohnung. */
  function quests(now) {
    now = nowMs(now);
    var s = get(now);
    return todayKeys(now).map(function (k) {
      var q = POOL_BY_KEY[k];
      var have = s.progress[k] | 0;
      var done = have >= q.goal;
      return {
        key: k, title: q.title, desc: q.desc, sym: q.sym, goal: q.goal,
        have: Math.min(have, q.goal), raw: have, done: done,
        claimed: s.claimed.indexOf(k) >= 0,
        claimable: done && s.claimed.indexOf(k) < 0,
        pct: Math.min(1, have / q.goal),
        gold: q.gold, material: q.material,
      };
    });
  }

  /* reportEvent(type, amount) — DIE Schnittstelle vom Spiel.
   * "loss" berührt keine Quest, sondern nur die Siegesserie. */
  function reportEvent(type, amount, now) {
    now = nowMs(now);
    var ev = EVENT_ALIAS[String(type || "").toLowerCase()];
    if (!ev) return { counted: false, reason: "unknown" };
    var n = Math.floor(Number(amount == null ? 1 : amount) || 0);
    if (n <= 0) return { counted: false, reason: "amount" };
    var s = get(now);

    if (ev === "loss") {
      var had = s.streak;
      s.streak = 0;
      save(s);
      return { counted: true, key: null, streak: 0, streakBroken: had > 0, mul: STREAK_MUL[0] };
    }
    if (ev === "win") {
      s.streak = Math.min(999, s.streak + n);
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    }
    var q = POOL_BY_EVENT[ev];
    var active = todayKeys(now).indexOf(q.key) >= 0;
    // Fortschritt wird IMMER mitgeschrieben, auch wenn die Quest heute
    // nicht aktiv ist — sonst wäre ein Rollover mitten in der Sitzung ein
    // stiller Datenverlust.
    s.progress[q.key] = (s.progress[q.key] | 0) + n;
    save(s);
    return {
      counted: true, key: q.key, active: active, value: n,
      total: s.progress[q.key],
      streak: s.streak, mul: goldMultiplierFrom(s.streak),
    };
  }

  /* claim(key) → {gold, material}. Material wird gebucht, Gold gemeldet. */
  function claim(key, now) {
    now = nowMs(now);
    var s = get(now), q = POOL_BY_KEY[key];
    if (!q) throw new Error("Unbekannte Tagesquest.");
    if (todayKeys(now).indexOf(key) < 0) throw new Error("Diese Quest ist heute nicht aktiv.");
    if (s.claimed.indexOf(key) >= 0) throw new Error("Diese Belohnung ist schon abgeholt.");
    if ((s.progress[key] | 0) < q.goal) {
      throw new Error("Noch nicht geschafft — " + (s.progress[key] | 0) + "/" + q.goal + ".");
    }
    s.claimed.push(key);
    s.stats.questsClaimed = (s.stats.questsClaimed | 0) + 1;
    var all = todayKeys(now).every(function (k) { return s.claimed.indexOf(k) >= 0; });
    if (all) {
      s.stats.daysCompleted = (s.stats.daysCompleted | 0) + 1;
      var t = telemetry();
      if (t) t.track("daily_complete", { day: dayKey(now), streak: s.streak });
    }
    save(s);
    bankMaterial(q.material);
    return { key: key, gold: q.gold, material: q.material, allDone: all };
  }

  /* bonus(now) → Zustand der Bonus-Truhe (3/3). */
  function bonus(now) {
    now = nowMs(now);
    var s = get(now), ks = todayKeys(now);
    var done = ks.filter(function (k) { return s.claimed.indexOf(k) >= 0; }).length;
    return {
      done: done, need: ks.length,
      ready: done >= ks.length && !s.bonusClaimed,
      claimed: !!s.bonusClaimed,
      chest: BONUS_CHEST,
    };
  }
  function claimBonus(now) {
    now = nowMs(now);
    var b = bonus(now);
    if (b.claimed) throw new Error("Die Tagestruhe ist schon abgeholt.");
    if (!b.ready) throw new Error("Erst alle drei Tagesquests abholen (" + b.done + "/" + b.need + ").");
    var s = get(now);
    s.bonusClaimed = true;
    save(s);
    bankMaterial(BONUS_CHEST.material);
    return { name: BONUS_CHEST.name, sym: BONUS_CHEST.sym, pack: BONUS_CHEST.pack,
             gold: BONUS_CHEST.gold, material: BONUS_CHEST.material };
  }

  /* ================= Siegesserie ================= */

  function goldMultiplierFrom(streak) { return STREAK_MUL[clamp(streak | 0, 0, STREAK_CAP)]; }
  function goldMultiplier(now) { return goldMultiplierFrom(get(now).streak); }
  /* streakInfo(now) → alles, was die Home-Anzeige braucht. */
  function streakInfo(now) {
    now = nowMs(now);
    var s = get(now), st = s.streak;
    var next = st < STREAK_CAP ? STREAK_MUL[st + 1] : null;
    return {
      streak: st, best: s.bestStreak,
      mul: goldMultiplierFrom(st),
      pct: Math.round((goldMultiplierFrom(st) - 1) * 100),
      nextMul: next, nextAt: next ? st + 1 : null,
      atCap: st >= STREAK_CAP, cap: STREAK_CAP, capMul: STREAK_MUL[STREAK_CAP],
    };
  }
  /* applyStreak(baseGold) — der Aufrufer bekommt den fertigen Betrag. */
  function applyStreak(baseGold, now) {
    var g = Math.max(0, Math.round(Number(baseGold) || 0));
    var mul = goldMultiplier(now);
    return { base: g, mul: mul, total: Math.round(g * mul), bonus: Math.round(g * mul) - g };
  }

  /* ================= Gratis-Pack-Timer ================= */

  /* packTimer(now) → {ready, max, msLeft, nextAt, full, type}
   * Die Ansammlung ist eine reine Funktion aus (packBase, now) — es gibt
   * keinen Zähler, der auseinanderlaufen könnte. */
  function packTimer(now) {
    now = nowMs(now);
    var s = get(now);
    var elapsed = now - s.packBase;
    var ready = clamp(Math.floor(elapsed / PACK_MS), 0, PACK_MAX);
    var full = ready >= PACK_MAX;
    var msLeft = full ? 0 : PACK_MS - (elapsed % PACK_MS);
    return {
      ready: ready, max: PACK_MAX, type: PACK_TYPE,
      msLeft: msLeft, nextAt: full ? 0 : now + msLeft,
      text: full ? "voll" : hhmm(msLeft), full: full,
      everyMs: PACK_MS, everyText: (PACK_MS / HOUR) + " h",
    };
  }
  /* claimPack() → {type, left}. Verschiebt den Anker um GENAU ein
   * Intervall — angefangener Fortschritt bleibt damit erhalten. */
  function claimPack(now) {
    now = nowMs(now);
    var t = packTimer(now);
    if (t.ready <= 0) {
      throw new Error("Das nächste Gratis-Pack ist in " + hhmm(t.msLeft) + " bereit.");
    }
    var s = get(now);
    s.packBase = s.packBase + PACK_MS;
    s.packsTaken = (s.packsTaken | 0) + 1;
    s.stats.packsTaken = (s.stats.packsTaken | 0) + 1;
    save(s);
    return { type: PACK_TYPE, left: packTimer(now).ready, taken: s.packsTaken };
  }

  /* ================= Gesamtzustand fürs UI ================= */

  function state(now) {
    now = nowMs(now);
    var s = get(now), qs = quests(now), b = bonus(now), t = packTimer(now);
    var claimable = qs.filter(function (q) { return q.claimable; }).length;
    return {
      day: s.day, dayKey: dayKey(now),
      resetIn: dayStart(now) + DAY - now, resetText: hhmm(dayStart(now) + DAY - now),
      quests: qs, bonus: b, pack: t, streak: streakInfo(now),
      done: b.done, need: b.need,
      // EINE Zahl für den roten Punkt: offene Abholungen + fertige Packs.
      badge: claimable + (b.ready ? 1 : 0) + t.ready,
      stats: s.stats,
    };
  }
  function reset() { save(fresh(nowMs())); return get(); }

  var API = {
    QUEST_POOL: QUEST_POOL, QUESTS_PER_DAY: QUESTS_PER_DAY, BONUS_CHEST: BONUS_CHEST,
    STREAK_MUL: STREAK_MUL, STREAK_CAP: STREAK_CAP,
    PACK_MS: PACK_MS, PACK_MAX: PACK_MAX, PACK_TYPE: PACK_TYPE,
    STATE_VERSION: STATE_VERSION,
    get: get, state: state, quests: quests, todayKeys: todayKeys,
    reportEvent: reportEvent, claim: claim, bonus: bonus, claimBonus: claimBonus,
    goldMultiplier: goldMultiplier, streakInfo: streakInfo, applyStreak: applyStreak,
    packTimer: packTimer, claimPack: claimPack,
    dayKey: dayKey, dayStart: dayStart, hhmm: hhmm, reset: reset,
    _key: KEY, _write: function (s) { save(s); },
    _clock: function (fn) { CLOCK = fn || null; },
  };

  if (typeof window !== "undefined") window.ArenaDaily = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_daily.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, i) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (i !== undefined ? "  " + i : ""));
      if (!cond) fail++;
    };
    var pad = function (x, n) { x = String(x); while (x.length < n) x += " "; return x; };
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
    var throws = function (fn, part) {
      try { fn(); return { ok: false, msg: "(kein Fehler)" }; }
      catch (e) { return { ok: part ? e.message.indexOf(part) >= 0 : true, msg: e.message }; }
    };

    // Kartenbank laden, ohne deren Selbsttest auszulösen (window setzen).
    var AC = null;
    try {
      globalThis.window = {};
      AC = require(require("path").join(__dirname, "arena_cards.js"));
      delete globalThis.window;
      globalThis.ArenaCards = AC;
    } catch (e) {
      try { delete globalThis.window; } catch (e2) {}
      console.log("  !! arena_cards.js nicht ladbar: " + e.message);
    }
    // Telemetrie-Stub (zählt daily_complete mit)
    var TRACKED = [];
    globalThis.ArenaTelemetry = { track: function (e, p) { TRACKED.push({ e: e, p: p }); } };

    var D0 = Date.UTC(2026, 6, 27, 9, 0, 0);      // Montag 09:00 UTC
    var T = D0;
    API._clock(function () { return T; });
    var setT = function (t) { T = t; };

    console.log("\n=== ARENA DAILY — Selbsttest (täglicher Loop, State v" +
      STATE_VERSION + ") ===\n");

    /* ================= 1. Tagesgrenze ================= */
    check("dayStart() liefert 00:00 UTC",
      new Date(dayStart(D0)).getUTCHours() === 0 &&
      new Date(dayStart(D0)).getUTCMinutes() === 0, new Date(dayStart(D0)).toISOString());
    check("dayKey ist über den ganzen Tag stabil",
      dayKey(dayStart(D0)) === dayKey(dayStart(D0) + DAY - 1) &&
      dayKey(dayStart(D0)) !== dayKey(dayStart(D0) + DAY), dayKey(D0));
    check("23:59 UTC gehört noch zum selben Tag",
      dayKey(dayStart(D0) + 23 * HOUR + 59 * MINUTE) === dayKey(D0));

    /* ================= 2. Quest-Rotation ================= */
    setT(D0); reset();
    var ks = todayKeys();
    console.log("\nQuest-Pool (" + QUEST_POOL.length + "), davon " + QUESTS_PER_DAY + " pro Tag:");
    QUEST_POOL.forEach(function (q) {
      console.log("  " + q.sym + " " + pad(q.title, 34) + pad("Ziel " + q.goal, 10) +
        fmt(q.gold) + " Gold · " + q.material + " Material");
    });
    console.log("  heute (" + dayKey(D0) + "): " + ks.join(", "));
    check("genau 3 Quests pro Tag", ks.length === 3, ks.join(","));
    check("keine Quest doppelt", new Set(ks).size === 3);
    check("alle aus dem Pool", ks.every(function (k) { return !!POOL_BY_KEY[k]; }));
    check("gleicher Tag → gleiche Auswahl (deterministisch)",
      todayKeys(D0).join(",") === todayKeys(D0 + 5 * HOUR).join(","));
    // Rotation über 14 Tage
    var seen = {}, sets = [];
    for (var d = 0; d < 14; d++) {
      var kk = todayKeys(D0 + d * DAY);
      sets.push(kk.join(","));
      kk.forEach(function (k) { seen[k] = (seen[k] | 0) + 1; });
    }
    console.log("  14 Tage: " + Object.keys(seen).length + " verschiedene Quests im Einsatz, " +
      new Set(sets).size + " verschiedene Kombinationen");
    check("über 14 Tage kommt JEDE Pool-Quest dran",
      Object.keys(seen).length === QUEST_POOL.length,
      Object.keys(seen).map(function (k) { return k + ":" + seen[k]; }).join(" "));
    check("die Auswahl wechselt wirklich (>5 Kombinationen in 14 Tagen)",
      new Set(sets).size > 5, new Set(sets).size);

    /* ================= 3. Fortschritt & Abholen ================= */
    setT(D0); reset();
    var first = POOL_BY_KEY[ks[0]];
    check("Fortschritt startet bei 0", quests().every(function (q) { return q.have === 0; }));
    var r1 = reportEvent(first.ev, 1);
    check("reportEvent zählt auf die richtige Quest",
      r1.counted === true && r1.key === first.key && r1.total === 1, r1.key);
    check("Aliase funktionieren",
      reportEvent("packs", 0).counted === false &&
      EVENT_ALIAS.wins === "win" && EVENT_ALIAS.fusion === "merge");
    check("unbekannter Typ wird ignoriert", reportEvent("bananen", 3).counted === false);
    check("Quest ist noch nicht abholbar", (function () {
      var q = quests().filter(function (x) { return x.key === first.key; })[0];
      return q.have === 1 && q.claimable === false;
    })());
    check("zu früh abholen → Fehler mit Stand",
      throws(function () { claim(first.key); }, "Noch nicht geschafft").ok);
    reportEvent(first.ev, first.goal);          // sicher über das Ziel
    var q1 = quests().filter(function (x) { return x.key === first.key; })[0];
    check("Ziel erreicht → claimable", q1.done && q1.claimable, q1.have + "/" + q1.goal);
    check("Anzeige kappt bei goal, roh zählt weiter",
      q1.have === first.goal && q1.raw > first.goal, q1.raw);
    var c1 = claim(first.key);
    console.log("\nAbgeholt: " + first.title + " → " + fmt(c1.gold) + " Gold, " +
      c1.material + " Material");
    check("claim() liefert Gold + Material", c1.gold === first.gold && c1.material === first.material);
    check("Material wurde in der Kartenbank gebucht",
      !AC || AC.getMaterials().total >= first.material, AC ? AC.getMaterials().total : "n/a");
    check("zweites Abholen wird verweigert",
      throws(function () { claim(first.key); }, "schon abgeholt").ok);
    check("Quest nicht im heutigen Set → Fehler", (function () {
      var other = QUEST_POOL.filter(function (q) { return ks.indexOf(q.key) < 0; })[0];
      return throws(function () { claim(other.key); }, "heute nicht aktiv").ok;
    })());
    check("unbekannte Quest → Fehler", throws(function () { claim("quatsch"); }, "Unbekannte").ok);

    /* ================= 4. Bonus-Truhe bei 3/3 ================= */
    check("Truhe bei 1/3 noch gesperrt", (function () {
      var b = bonus();
      return b.done === 1 && b.ready === false &&
             throws(function () { claimBonus(); }, "Erst alle drei").ok;
    })());
    TRACKED.length = 0;
    ks.slice(1).forEach(function (k) {
      var q = POOL_BY_KEY[k];
      reportEvent(q.ev, q.goal);
      claim(k);
    });
    var b3 = bonus();
    check("3/3 → Truhe bereit", b3.done === 3 && b3.ready === true);
    check("daily_complete an die Telemetrie gemeldet",
      TRACKED.some(function (t) { return t.e === "daily_complete"; }),
      JSON.stringify(TRACKED.map(function (t) { return t.e; })));
    var cb = claimBonus();
    console.log("Tagestruhe: " + cb.sym + " " + cb.name + " — " + cb.pack + "-Pack, " +
      fmt(cb.gold) + " Gold, " + cb.material + " Material");
    check("Tagestruhe ist größer als jede Einzelquest",
      cb.gold > Math.max.apply(null, QUEST_POOL.map(function (q) { return q.gold; })) &&
      cb.material > Math.max.apply(null, QUEST_POOL.map(function (q) { return q.material; })));
    check("Truhe nur einmal", throws(function () { claimBonus(); }, "schon abgeholt").ok);
    check("Tagesstatistik mitgeführt",
      get().stats.daysCompleted === 1 && get().stats.questsClaimed === 3,
      JSON.stringify(get().stats));

    /* ================= 5. Tages-Rollover ================= */
    check("Rollover nullt Fortschritt und Abholungen", (function () {
      setT(D0 + DAY);
      var s = get();
      return s.day === dayKey(D0 + DAY) && s.claimed.length === 0 &&
             s.bonusClaimed === false &&
             quests().every(function (q) { return q.have === 0; });
    })(), dayKey(D0) + " → " + get().day);
    check("Rollover braucht keinen Timer (passiert beim Lesen)",
      get().day === dayKey(nowMs()));
    check("Statistik überlebt den Rollover",
      get().stats.daysCompleted === 1, JSON.stringify(get().stats));

    /* ================= 6. Siegesserie ================= */
    setT(D0); reset();
    console.log("\nSiegesserien-Bonus:");
    var row = [];
    for (var st2 = 0; st2 <= STREAK_CAP + 2; st2++) {
      row.push(st2 + ":" + goldMultiplierFrom(st2).toFixed(2) + "x");
    }
    console.log("  " + row.join("  "));
    check("erst ab dem 2. Sieg gibt es etwas",
      goldMultiplierFrom(0) === 1 && goldMultiplierFrom(1) === 1 && goldMultiplierFrom(2) > 1);
    check("Multiplikator steigt monoton bis zum Deckel", (function () {
      for (var i = 1; i <= STREAK_CAP; i++) if (STREAK_MUL[i] < STREAK_MUL[i - 1]) return false;
      return true;
    })());
    check("Deckel bei " + STREAK_CAP + " Siegen (1.50x)",
      goldMultiplierFrom(STREAK_CAP) === 1.5 && goldMultiplierFrom(50) === 1.5);
    reportEvent("win", 1); reportEvent("win", 1); reportEvent("win", 1);
    var si = streakInfo();
    console.log("  nach 3 Siegen: Serie " + si.streak + ", Multiplikator " + si.mul + "x (+" +
      si.pct + " %), nächste Stufe " + si.nextMul + "x");
    check("drei Siege → 1.20x", si.streak === 3 && si.mul === 1.2 && si.pct === 20);
    check("applyStreak rechnet den Betrag aus", (function () {
      var a = applyStreak(1000);
      return a.base === 1000 && a.mul === 1.2 && a.total === 1200 && a.bonus === 200;
    })(), JSON.stringify(applyStreak(1000)));
    var lr = reportEvent("loss", 1);
    check("Niederlage setzt die Serie zurück",
      lr.counted === true && lr.streakBroken === true && streakInfo().streak === 0 &&
      goldMultiplier() === 1);
    check("Bestserie bleibt gespeichert", streakInfo().best === 3, streakInfo().best);
    check("Niederlage berührt KEINE Quest", (function () {
      var before = JSON.stringify(get().progress);
      reportEvent("loss", 1);
      return JSON.stringify(get().progress) === before;
    })());
    check("Siegesserie überlebt den Tageswechsel", (function () {
      setT(D0); reset();
      reportEvent("win", 4);
      setT(D0 + DAY);
      return streakInfo().streak === 4 && goldMultiplier() === 1.3;
    })(), "Serie " + streakInfo().streak);

    /* ================= 7. Gratis-Pack-Timer ================= */
    setT(D0); reset();
    var p0 = packTimer();
    console.log("\nGratis-Pack: alle " + (PACK_MS / HOUR) + " h, maximal " + PACK_MAX + " gestapelt");
    check("frisch: noch kein Pack, Countdown läuft",
      p0.ready === 0 && p0.msLeft === PACK_MS && p0.full === false, p0.text);
    check("zu früh abholen → Fehler mit Restzeit",
      throws(function () { claimPack(); }, "in 4:00 bereit").ok,
      throws(function () { claimPack(); }).msg);
    setT(D0 + PACK_MS);
    check("nach 4 h ist eines da", packTimer().ready === 1 && packTimer().msLeft === PACK_MS);
    setT(D0 + PACK_MS + 90 * MINUTE);
    check("Countdown zählt für das nächste weiter",
      packTimer().ready === 1 && Math.abs(packTimer().msLeft - (PACK_MS - 90 * MINUTE)) < 1000,
      packTimer().text);
    setT(D0 + 2 * PACK_MS);
    check("nach 8 h sind zwei gestapelt",
      packTimer().ready === 2 && packTimer().full === true && packTimer().text === "voll");
    setT(D0 + 20 * PACK_MS);
    check("DECKEL: auch nach 80 h sind es nur zwei",
      packTimer().ready === PACK_MAX, packTimer().ready + " statt " + 20);
    var pc = claimPack();
    check("Abholen nimmt genau eines vom Stapel",
      pc.type === "bronze" && pc.left === 1, pc.left + " übrig");
    check("nach dem Abholen läuft der Countdown korrekt weiter", (function () {
      var t = packTimer();
      return t.ready === 1 && t.msLeft > 0 && t.msLeft <= PACK_MS;
    })(), packTimer().text);
    claimPack();
    check("Stapel leer → Countdown auf volle 4 h", (function () {
      var t = packTimer();
      return t.ready === 0 && Math.abs(t.msLeft - PACK_MS) < 1000;
    })(), packTimer().text);
    check("angefangener Fortschritt geht beim Abholen NICHT verloren", (function () {
      setT(D0); reset();
      setT(D0 + PACK_MS + 3 * HOUR);          // 1 Pack + 3 h Vorlauf
      claimPack();
      var t = packTimer();
      return t.ready === 0 && Math.abs(t.msLeft - HOUR) < 1000;   // nur noch 1 h
    })(), packTimer().text);
    check("Uhr zurückgestellt → keine Gratis-Packs", (function () {
      setT(D0 + 10 * PACK_MS); reset();
      var s = get(); s.packBase = D0 + 99 * PACK_MS; save(s);   // Anker in der Zukunft
      setT(D0 + 10 * PACK_MS);
      return packTimer().ready === 0;
    })());
    check("Pack-Timer überlebt den Tageswechsel", (function () {
      setT(D0); reset();
      setT(D0 + PACK_MS);
      var had = packTimer().ready;
      setT(D0 + DAY + PACK_MS);
      return had === 1 && packTimer().ready === PACK_MAX;
    })());

    /* ================= 8. Gesamtzustand ================= */
    setT(D0 + 6 * HOUR); reset();
    var stt = state();
    console.log("\nstate(): Tag " + stt.day + ", Reset in " + stt.resetText +
      ", Badge " + stt.badge);
    check("state() liefert Quests, Truhe, Pack und Serie",
      stt.quests.length === 3 && !!stt.bonus && !!stt.pack && !!stt.streak);
    check("Reset-Countdown stimmt (15:00 UTC → noch 9:00 h)",
      stt.resetText === "9:00" &&
      stt.resetText === hhmm(dayStart(nowMs()) + DAY - nowMs()), stt.resetText);
    check("Badge zählt offene Abholungen und fertige Packs", (function () {
      setT(D0); reset();
      setT(D0 + 2 * PACK_MS);              // zwei Packs angesammelt
      var k0 = todayKeys()[0], q0 = POOL_BY_KEY[k0];
      reportEvent(q0.ev, q0.goal);         // eine Quest abholbar
      return state().badge === 3 && state().pack.ready === 2;
    })(), state().badge + " (Packs " + state().pack.ready + ")");

    /* ================= 9. Migration v1 → v2 ================= */
    console.log("\n" + "=".repeat(64));
    console.log("MIGRATION v1 → v2 (Pack-Zähler → Ansammlungs-Anker)");
    console.log("=".repeat(64));
    (function () {
      setT(D0 + 12 * HOUR);
      var v1 = {
        v: 1, day: dayKey(D0 + 12 * HOUR),
        wins: 2, packs: 1, donate: 4, merge: 0, war: 1, trophies: 35,
        claimed: ["packs", "quatsch"], bonusClaimed: false,
        streak: 5, bestStreak: 7,
        packStack: 2, packLast: D0 + 12 * HOUR,
        stats: { daysCompleted: 9, questsClaimed: 22, packsTaken: 14 },
      };
      lsSet(JSON.stringify(v1));
      var s = get();
      console.log("  v1 { packStack: 2, packLast: t } → v2 packBase = t − 2 × 4 h");
      check("State-Version auf 2 gehoben", s.v === 2);
      check("flache Quest-Zähler → progress{}",
        s.progress.wins === 2 && s.progress.donate === 4 && s.progress.trophies === 35);
      check("fremde Quest-Keys fallen aus claimed heraus",
        s.claimed.length === 1 && s.claimed[0] === "packs", JSON.stringify(s.claimed));
      check("Serie und Bestserie übernommen", s.streak === 5 && s.bestStreak === 7);
      check("Pack-Stapel bleibt erhalten (2 Packs verfügbar)",
        packTimer().ready === 2, packTimer().ready + " Packs");
      check("Anker liegt korrekt 8 h zurück",
        s.packBase === (D0 + 12 * HOUR) - 2 * PACK_MS, new Date(s.packBase).toISOString());
      check("Statistik übernommen",
        s.stats.daysCompleted === 9 && s.stats.packsTaken === 14, JSON.stringify(s.stats));
      check("Migration ist idempotent", (function () {
        save(get());
        var s2 = get();
        return s2.v === 2 && s2.progress.wins === 2 && packTimer().ready === 2;
      })());
      // State ohne v-Feld
      lsSet(JSON.stringify({ day: dayKey(D0 + 12 * HOUR), wins: 1, packStack: 1,
                             packLast: D0 + 12 * HOUR }));
      var s3 = get();
      check("State OHNE v-Feld wird wie v1 behandelt",
        s3.v === 2 && s3.progress.wins === 1 && packTimer().ready === 1);
      check("v1-Stapel über dem Deckel wird gekappt", (function () {
        lsSet(JSON.stringify({ v: 1, day: dayKey(nowMs()), packStack: 99,
                               packLast: nowMs() }));
        return packTimer().ready === PACK_MAX;
      })(), packTimer().ready);
    })();

    /* ================= 10. Robustheit ================= */
    console.log("\nRobustheit:");
    check("Müll im Speicher → frischer Tag, kein Crash", (function () {
      lsSet("{kaputt,,,");
      var s = get();
      return s.v === 2 && s.day === dayKey(nowMs()) && s.claimed.length === 0;
    })());
    check("kaputter State wird geheilt", (function () {
      lsSet(JSON.stringify({
        v: 2, day: 42, progress: { wins: -5, packs: "viele", quatsch: 3 },
        claimed: "keinArray", streak: -3, bestStreak: -9,
        packBase: "gestern", stats: 7,
      }));
      var s = get();
      return s.progress.wins === 0 && s.progress.packs === 0 &&
             s.progress.quatsch === undefined && Array.isArray(s.claimed) &&
             s.streak === 0 && s.bestStreak === 0 && s.packBase > 0 &&
             typeof s.stats === "object";
    })(), JSON.stringify(get().progress));
    check("fehlendes ArenaCards → kein Crash beim Abholen", (function () {
      setT(D0); reset();
      var keep = globalThis.ArenaCards;
      delete globalThis.ArenaCards;
      var k0 = todayKeys()[0], q0 = POOL_BY_KEY[k0];
      reportEvent(q0.ev, q0.goal);
      var ok = claim(k0).gold > 0;
      globalThis.ArenaCards = keep;
      return ok;
    })());
    check("fehlende Telemetrie → kein Crash bei 3/3", (function () {
      setT(D0); reset();
      var keep = globalThis.ArenaTelemetry;
      delete globalThis.ArenaTelemetry;
      todayKeys().forEach(function (k) {
        var q = POOL_BY_KEY[k];
        reportEvent(q.ev, q.goal);
        claim(k);
      });
      var ok = bonus().ready === true;
      globalThis.ArenaTelemetry = keep;
      return ok;
    })());
    check("reset() nullt alles", (function () {
      var s = reset();
      return s.claimed.length === 0 && s.streak === 0 &&
             quests().every(function (q) { return q.have === 0; });
    })());
    var NEED = ["get", "state", "quests", "todayKeys", "reportEvent", "claim", "bonus",
      "claimBonus", "goldMultiplier", "streakInfo", "applyStreak", "packTimer",
      "claimPack", "reset"];
    check("API vollständig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");

    API._clock(null);
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
