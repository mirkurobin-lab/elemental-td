/* ==================================================================
 * ARENA REWARDS — das Belohnungs-Fenster (LOGIN · TÄGLICH · WÖCHENTLICH
 * · LEBENSZEIT)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Gebaut wie arena_friends.js und
 * arena_daily.js; wer eines davon kennt, findet sich hier sofort zurecht.
 *
 * WOFÜR: AA legt vier Reiter in EIN Modal (Screenshots IMG_3338–3341).
 * Dieses Modul liefert die Daten für alle vier Reiter in einer einzigen,
 * gleichförmigen Form — das UI rechnet nichts, es zeichnet nur.
 *
 * ------------------------------------------------------------------
 * DIE VIER REITER
 * ------------------------------------------------------------------
 *   LOGIN         7-Tage-Zyklus (gehört ArenaDaily, siehe unten) plus
 *                 eine MEILENSTEIN-SCHIENE über die Lebenszeit-Logintage.
 *                 Alle zwei Tage eine Truhe; gezeigt wird immer das
 *                 Fenster aus fünf Marken um den aktuellen Tag.
 *   TÄGLICH       acht Aufgaben, jede zahlt MARKEN. Die Marken füllen
 *                 eine Schiene mit fünf Truhen (20/40/60/80/100).
 *                 Reset 00:00 UTC.
 *   WÖCHENTLICH   identischer Aufbau, andere Aufgaben, Reset Montag
 *                 00:00 UTC.
 *   LEBENSZEIT    Erfolge. Keine Schiene, keine Frist, keine Marken —
 *                 jede Zeile zahlt direkt Gems.
 *
 * ------------------------------------------------------------------
 * DREI BEWUSSTE ENTSCHEIDUNGEN (Abweichungen von AA)
 * ------------------------------------------------------------------
 * A) DER LOGIN-KALENDER GEHÖRT WEITER arena_daily.js. Dieses Modul
 *    LIEST ihn (loginCalendar) und DELEGIERT das Abholen
 *    (claimLogin) — es hält keine zweite Kopie der sieben Tage.
 *    Grund: das Login-Popup beim Start und der LOGIN-Reiter im
 *    Belohnungs-Fenster sind zwei Oberflächen auf demselben Zustand.
 *    Zwei Quellen hätten sich am ersten Tag auseinandergelebt, an dem
 *    jemand nur eine der beiden anfasst. Fehlt arena_daily.js, fällt
 *    dieses Modul auf einen eigenen, gleich geformten Zustand zurück
 *    (`login.fallback`) — sonst wäre es im Node-Test nicht prüfbar.
 *
 * B) KEIN „SCHLÜSSEL". AAs Tag 7 zeigt Gems · Essenz · Gold · Schlüssel.
 *    Eine Schlüssel-Währung gibt es in Arcane Prism TD nicht (gesucht in
 *    allen arena_*.js und in ui_assets.json: kein Treffer). Erfunden
 *    wird sie nicht. Der vierte Platz trägt stattdessen ein BOOSTER-PACK
 *    — die Belohnungsart, die bei uns an dieser Stelle steht (User-
 *    Vorgabe zum Login-Kalender: „mit boosterpacks", arena_daily.js §4).
 *    Die Kachelzahl bleibt damit vier wie bei AA.
 *
 * C) MARKEN SIND KEINE WÄHRUNG. Sie werden nirgends gebucht, nicht
 *    getauscht und nicht angezeigt außer auf ihrer Schiene. Sie sind der
 *    Fortschrittszähler der Woche/des Tages und werden beim Reset auf 0
 *    gesetzt. Wer sie zur Währung macht, baut einen zweiten Shop.
 *
 * ------------------------------------------------------------------
 * WÄHRUNGS-ZUSTÄNDIGKEIT (identisch zum Rest des Projekts)
 * ------------------------------------------------------------------
 * Dieses Modul bucht NUR Essenz (über ArenaCards.addMaterial, dieselbe
 * Naht wie arena_daily.js). Gold, Gems und Packs werden GEMELDET — die
 * Wallet liegt im Hub. Jede claim*-Funktion liefert dieselbe Form:
 *   { rewards: [ {kind, amount, ico, emoji, label, text}, … ], … }
 * Das UI bucht daraus Gold/Gems und tostet den Rest.
 *
 * ------------------------------------------------------------------
 * WIRING
 * ------------------------------------------------------------------
 *   1. <script src="arena_rewards.js"></script> NACH arena_daily.js.
 *   2. Ereignisse: ArenaRewards.reportEvent(type, amount) — DIESELBE
 *      Signatur wie ArenaClan/ArenaPass/ArenaDaily. Jede Stelle, die
 *      heute ArenaDaily.reportEvent ruft, ruft eine Zeile darunter
 *      dieses hier.
 *   3. Rote Punkte an den Reitern: ArenaRewards.badges().
 *   4. Kennzahlen für die Lebenszeit-Erfolge, die dieses Modul nicht
 *      selbst zählen kann (Spielerstufe, Türme, Festungsstufe), liest
 *      es über EINE Stelle: `readers` in §4. Wer eine echte Quelle
 *      anschließt, ändert dort — sonst nirgends.
 *
 * Selbsttest: `node arena_patches/arena_rewards.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaRewards";
  var STATE_VERSION = 1;

  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000, WEEK = 7 * DAY;

  /* ==================================================================
   * §1 DATEN
   * ================================================================== */

  /* ---------- Belohnungsarten ----------
   * Nur was es im Spiel schon gibt: Gems, Gold, Essenz, Karten, Packs.
   * `ico` ist ein Schlüssel aus dem ASSETS-Objekt von ui_prototype.html,
   * `emoji` die Rückfallebene (Design-System §6). Das UI reicht beides
   * unverändert an ico(key, emoji) weiter und baut NIE ein rohes <img>. */
  var KIND = {
    gems:    { ico: "cur_gem",      emoji: "💚", label: "Gems" },
    gold:    { ico: "cur_gold",     emoji: "🪙", label: "Gold" },
    essence: { ico: "cur_material", emoji: "⚗",  label: "Essenz" },
    cards:   { ico: "card_back",    emoji: "🃏", label: "Karten" },
    bronze:  { ico: "pack_bronze",  emoji: "🎁", label: "Bronze-Pack" },
    silver:  { ico: "pack_silver",  emoji: "🎁", label: "Silber-Pack" },
    goldpack:{ ico: "pack_gold",    emoji: "🎁", label: "Gold-Pack" },
    arcane:  { ico: "pack_arcane",  emoji: "🎁", label: "Arkan-Pack" },
  };
  var PACK_KIND = { bronze: "bronze", silver: "silver", gold: "goldpack", arcane: "arcane" };

  /* rw(kind, amount) → ein fertiger Anzeige-Datensatz.
   * `text` ist die Beschriftung, die AA unter/neben das Icon setzt
   * („×50"). Sie kommt fertig aus dem Modul, damit das UI nicht an
   * zwei Stellen dasselbe Format erfindet. */
  function rw(kind, amount) {
    var k = KIND[kind] || KIND.gold;
    var n = Math.max(1, Math.round(n0(amount) || 1));
    return {
      kind: kind, amount: n,
      ico: k.ico, emoji: k.emoji, label: k.label,
      text: "×" + n,
      /* Packs zählt man nicht in Zahlen, sondern nennt sie. Das UI darf
       * `long` als Klartext benutzen (Toast, Vorlesen). */
      long: (kind === "bronze" || kind === "silver" || kind === "goldpack" || kind === "arcane")
        ? (n > 1 ? n + "× " + k.label : k.label)
        : (n + " " + k.label),
    };
  }

  /* ---------- LOGIN: Meilenstein-Schiene ----------
   * Gemessen an IMG_3338: der Wimpel liest „23 Day", die Truhen stehen
   * auf 22/24/26/28/30, und der Balken ist genau zur Hälfte zwischen 22
   * und 24 gefüllt. Daraus folgt die Regel eindeutig:
   *   · alle ZWEI Logintage eine Truhe
   *   · gezeigt wird das Fenster ab der zuletzt erreichten Marke
   *     (= abgerundet auf eine gerade Zahl), dann +2 +4 +6 +8
   *   · der Balken beginnt bei Marke[0] − 2 und endet bei Marke[4]
   * Für Tag 23: 22/24/26/28/30, Füllung (23−20)/(30−20) = 30 %.
   * Die Truhe auf 22 liegt bei 20 % — der Balken steht also mittig
   * zwischen 22 und 24, genau wie im Bild. */
  var MILE_STEP = 2;
  var MILE_SHOWN = 5;

  /* Belohnung einer Marke. Stabil pro Markenwert (nicht pro Position),
   * sonst änderte sich die Belohnung, während man auf sie zuläuft.
   * Jede zehnte Marke ist die Prunktruhe (Gold-Pack). */
  function milestoneReward(mark) {
    if (mark % 10 === 0) return rw("goldpack", 1);
    var k = Math.floor(mark / MILE_STEP) % 4;
    if (k === 0) return rw("silver", 1);
    if (k === 1) return rw("essence", 60);
    if (k === 2) return rw("gold", 2500);
    return rw("gems", 40);
  }

  /* ---------- Marken-Schiene für TÄGLICH und WÖCHENTLICH ----------
   * Gemessen an IMG_3339/3340: Medaillen-Chip links (Gesamtzahl), fünf
   * Truhen auf 20/40/60/80/100, die letzte golden. */
  var MARK_MARKS = [20, 40, 60, 80, 100];
  var CHEST_DAILY = {
    20:  rw("essence", 20),
    40:  rw("gold", 1200),
    60:  rw("gems", 20),
    80:  rw("bronze", 1),
    100: rw("goldpack", 1),
  };
  var CHEST_WEEKLY = {
    20:  rw("essence", 60),
    40:  rw("gold", 4000),
    60:  rw("gems", 60),
    80:  rw("silver", 1),
    100: rw("arcane", 1),
  };

  /* ---------- Aufgaben ----------
   * `ev` ist der Ereignisname aus reportEvent(). Die sechs Namen, die
   * das Spiel heute schon meldet (win/loss/pack/donate/merge/warAttack/
   * trophy), sind bewusst wortgleich zu arena_daily.js — dieselbe
   * Meldung füttert beide Module, ohne dass ein Aufrufer raten muss.
   * `go` ist das Ziel des LOS-Knopfes: eine View-ID aus show().
   * `pts` sind Marken. Tagessumme 110, Wochensumme 140 — bei beiden
   * liegt die volle Schiene (100) also drin, ohne dass JEDE Aufgabe
   * erledigt sein muss. Eine Liste, die keinen Ausfall verzeiht, ist
   * keine Tagesliste. */
  var DAILY_QUESTS = [
    { key: "dwin",     ev: "win",       goal: 3,   pts: 10, go: "navHome",
      title: "Gewinne 3 Matches" },
    { key: "dpack",    ev: "pack",      goal: 2,   pts: 10, go: "navPack",
      title: "Öffne 2 Booster-Packs" },
    { key: "ddonate",  ev: "donate",    goal: 20,  pts: 10, go: "navClan",
      title: "Spende 20 Karten im Clan" },
    { key: "dmerge",   ev: "merge",     goal: 1,   pts: 20, go: "navForge",
      title: "Verschmelze eine Karte" },
    { key: "dtrophy",  ev: "trophy",    goal: 60,  pts: 20, go: "navHome",
      title: "Verdiene 60 Trophäen" },
    { key: "dupgrade", ev: "upgrade",   goal: 3,   pts: 10, go: "navCollection",
      title: "Verbessere 3 Karten" },
    { key: "demote",   ev: "emote",     goal: 5,   pts: 10, go: "navHome",
      title: "Benutze 5 Emotes im Match" },
    { key: "dfree",    ev: "freepack",  goal: 1,   pts: 20, go: "navHome",
      title: "Hole das Gratis-Pack ab" },
  ];
  var WEEKLY_QUESTS = [
    { key: "wwin",     ev: "win",       goal: 15,  pts: 20, go: "navHome",
      title: "Gewinne 15 Matches" },
    { key: "wdonate",  ev: "donate",    goal: 100, pts: 10, go: "navClan",
      title: "Spende 100 Karten im Clan" },
    { key: "wrequest", ev: "request",   goal: 5,   pts: 10, go: "navClan",
      title: "Fordere 5-mal Karten an" },
    { key: "wmerge",   ev: "merge",     goal: 5,   pts: 20, go: "navForge",
      title: "Verschmelze 5 Karten" },
    { key: "wwar",     ev: "warAttack", goal: 6,   pts: 20, go: "navClan",
      title: "Führe 6 Kriegs-Angriffe aus" },
    { key: "wupgrade", ev: "upgrade",   goal: 25,  pts: 20, go: "navCollection",
      title: "Verbessere 25 Karten" },
    { key: "wpack",    ev: "pack",      goal: 10,  pts: 10, go: "navPack",
      title: "Öffne 10 Booster-Packs" },
    { key: "wfort",    ev: "fortress",  goal: 1,   pts: 30, go: "navFortress",
      title: "Baue die Festung eine Stufe aus" },
  ];

  /* ---------- Lebenszeit-Erfolge ----------
   * AAs Liste (IMG_3341) auf unser Spiel übersetzt. Zwei Sorten:
   *   · `src` liest eine Kennzahl von außen (Spielerstufe, Türme,
   *     Festungsstufe) — Fortschritt ist dann IMMER der aktuelle Stand,
   *     auch wenn das Modul beim Aufstieg gar nicht lief.
   *   · ohne `src` zählt reportEvent() mit.
   * `age` ist der Sonderfall Zeit: er kommt aus dem Erstkontakt und
   * läuft damit echt, ohne dass irgendetwas gemeldet werden muss. */
  var LIFETIME = [
    { key: "level15",   goal: 15,   pts: 0, gems: 25,  src: "level",    go: "navHome",
      title: "Erreiche Spielerstufe 15" },
    { key: "month6",    goal: 6,    pts: 0, gems: 500, age: "months",   go: "navHome",
      title: "Feiere Monat 6 mit Arcane Prism" },
    { key: "year1",     goal: 1,    pts: 0, gems: 999, age: "years",    go: "navHome",
      title: "Feiere Jahr 1 mit Arcane Prism" },
    { key: "towers15",  goal: 15,   pts: 0, gems: 10,  src: "towers",   go: "navTower",
      title: "Schalte 15 Türme frei" },
    { key: "fort15",    goal: 15,   pts: 0, gems: 20,  src: "fortress", go: "navFortress",
      title: "Erreiche Festungsstufe 15" },
    { key: "spend2500", goal: 2500, pts: 0, gems: 10,  ev: "gemSpend",  go: "navShop",
      title: "Gib 2500 Gems aus" },
    { key: "epicTower", goal: 3,    pts: 0, gems: 10,  src: "epicTower", go: "navCollection",
      title: "Besitze 3 epische Türme" },
    { key: "epicSkill", goal: 4,    pts: 0, gems: 10,  src: "epicSkill", go: "navForge",
      title: "Besitze 4 epische+ Fähigkeiten" },
  ];

  var Q_BY_KEY = {};
  DAILY_QUESTS.forEach(function (q) { Q_BY_KEY["daily/" + q.key] = q; });
  WEEKLY_QUESTS.forEach(function (q) { Q_BY_KEY["weekly/" + q.key] = q; });
  var LIFE_BY_KEY = {};
  LIFETIME.forEach(function (a) { LIFE_BY_KEY[a.key] = a; });

  /* Ereignis-Aliase — wortgleiche Liste wie arena_daily.js, damit ein
   * Aufrufer beide Module mit derselben Zeichenkette bedienen kann. */
  var EVENT_ALIAS = {
    win: "win", wins: "win", sieg: "win",
    loss: "loss", lose: "loss", defeat: "loss", niederlage: "loss",
    pack: "pack", packs: "pack",
    donate: "donate", donation: "donate", spende: "donate",
    merge: "merge", fusion: "merge", merges: "merge",
    waratt: "warAttack", warattack: "warAttack", warangriff: "warAttack",
    trophy: "trophy", trophies: "trophy", trophaeen: "trophy",
    upgrade: "upgrade", upgrades: "upgrade", verbessern: "upgrade",
    emote: "emote", emotes: "emote",
    request: "request", requests: "request", anfrage: "request",
    freepack: "freepack", gratispack: "freepack",
    fortress: "fortress", festung: "fortress",
    gemspend: "gemSpend", gemsspent: "gemSpend", gemausgabe: "gemSpend",
  };

  /* ==================================================================
   * §2 ZEIT
   * ================================================================== */

  function n0(v) { return (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0; }
  function ts0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* CLOCK ist der Test-Hook (_clock). Direktes Date.now() steht im
   * ganzen Modul nur an dieser einen Stelle. */
  var CLOCK = null;
  function nowMs(o) {
    if (typeof o === "number" && isFinite(o)) return o;
    return CLOCK ? CLOCK() : Date.now();
  }

  /* Tagesgrenze 00:00 UTC — dieselbe Begründung wie bei Clan und Daily:
   * eine Grenze für alle, unabhängig von der Zeitzone des Geräts. */
  function dayStart(now) { now = nowMs(now); return Math.floor(now / DAY) * DAY; }
  function dayKey(now) {
    var d = new Date(dayStart(now));
    return d.getUTCFullYear() + "-" +
      ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" +
      ("0" + d.getUTCDate()).slice(-2);
  }
  /* Wochengrenze MONTAG 00:00 UTC. 1970-01-01 war ein Donnerstag, also
   * liegt der erste Montag bei +4 Tagen — daher der Versatz. */
  function weekStart(now) {
    now = nowMs(now);
    return Math.floor((now - 4 * DAY) / WEEK) * WEEK + 4 * DAY;
  }
  function weekKey(now) {
    var w = weekStart(now);
    return "W" + Math.round((w - 4 * DAY) / WEEK);
  }

  /* dhm(ms) → AAs Timer-Format, deutsch.
   * Ab einem Tag zwei Stufen („1d 8h"), darunter „8h 40m", unter einer
   * Stunde nur Minuten. Genau die drei Formen aus den Screenshots. */
  function dhm(ms) {
    if (!(ms > 0)) return "0m";
    var m = Math.floor(ms / MINUTE), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return d + "d " + (h % 24) + "h";
    if (h > 0) return h + "h " + (m % 60) + "m";
    return Math.max(1, m) + "m";
  }

  /* ==================================================================
   * §3 PERSISTENZ
   * ================================================================== */

  var memStore = null;                 // Node-Rückfall

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

  function freshScope() {
    return { key: "", prog: {}, taken: {}, pts: 0, chests: {} };
  }
  function fresh() {
    return {
      v: STATE_VERSION,
      created: 0,                      // Erstkontakt — Basis der Zeit-Erfolge
      login: { total: 0, lastDay: "", marks: {}, fallbackStep: 0, fallbackDay: "" },
      daily: freshScope(),
      weekly: freshScope(),
      life: { prog: {}, taken: {} },
    };
  }

  function healMap(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    var out = {};
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) out[k] = v[k];
    return out;
  }
  function healNumMap(v) {
    var m = healMap(v), out = {};
    for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) out[k] = Math.max(0, n0(m[k]));
    return out;
  }
  function healFlagMap(v) {
    var m = healMap(v), out = {};
    for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) if (m[k]) out[k] = 1;
    return out;
  }
  function healScope(v) {
    var s = (v && typeof v === "object") ? v : {};
    return {
      key: typeof s.key === "string" ? s.key : "",
      prog: healNumMap(s.prog),
      taken: healFlagMap(s.taken),
      pts: Math.max(0, n0(s.pts)),
      chests: healFlagMap(s.chests),
    };
  }

  /* get(now) — IMMER über diese Funktion lesen. Sie heilt kaputte
   * Zustände, setzt den Erstkontakt und rollt Tag und Woche weiter. */
  function get(now) {
    now = nowMs(now);
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object" || Array.isArray(s)) s = {};
    if (s.v !== STATE_VERSION) {
      /* Unbekannte Version: frisch anfangen, aber den Erstkontakt
       * retten — an ihm hängen die Zeit-Erfolge, und ein Reset dort
       * würde einem Spieler Monate wegnehmen. */
      var keep = ts0(s.created);
      s = fresh();
      s.created = keep;
    }
    /* Der Erstkontakt wird SOFORT festgeschrieben. Täte er das erst beim
     * nächsten save(), stünde er bei jedem Lesen wieder auf „jetzt" — und
     * die beiden Zeit-Erfolge (Monat 6, Jahr 1) kämen nie vom Fleck. */
    var born = ts0(s.created);
    s.created = born || now;
    var L = (s.login && typeof s.login === "object") ? s.login : {};
    s.login = {
      total: Math.max(0, n0(L.total)),
      lastDay: typeof L.lastDay === "string" ? L.lastDay : "",
      marks: healFlagMap(L.marks),
      fallbackStep: clamp(n0(L.fallbackStep), 0, 6),
      fallbackDay: typeof L.fallbackDay === "string" ? L.fallbackDay : "",
    };
    s.daily = healScope(s.daily);
    s.weekly = healScope(s.weekly);
    var LF = (s.life && typeof s.life === "object") ? s.life : {};
    s.life = { prog: healNumMap(LF.prog), taken: healFlagMap(LF.taken) };

    /* Rollover. Marken, Fortschritt und Truhen der abgelaufenen Periode
     * verfallen — das ist der Punkt einer Frist. */
    var dk = dayKey(now), wk = weekKey(now);
    if (s.daily.key !== dk) { s.daily = freshScope(); s.daily.key = dk; }
    if (s.weekly.key !== wk) { s.weekly = freshScope(); s.weekly.key = wk; }
    if (!born) save(s);
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  /* ==================================================================
   * §4 FORTSCHRITT
   * ================================================================== */

  function hostObj() {
    if (typeof window !== "undefined" && window) return window;
    if (typeof globalThis !== "undefined" && globalThis) return globalThis;
    return null;
  }
  function daily() {
    var h = hostObj();
    return (h && h.ArenaDaily) || null;
  }
  function bank() {
    var h = hostObj();
    var b = h && h.ArenaCards;
    return (b && typeof b.addMaterial === "function") ? b : null;
  }
  function bankEssence(n) {
    var b = bank();
    if (b && n > 0) b.addMaterial(n);          // ohne Sorte → Round-Robin
  }

  /* readers — DIE EINE STELLE, an der Lebenszeit-Kennzahlen von außen
   * kommen. Jede Funktion liefert eine Zahl oder null; null heißt „keine
   * Quelle", dann zählt der interne Zähler aus reportEvent().
   * Wer echte Quellen anschließt, ändert hier — sonst nirgends. */
  var readers = {
    level: function (h) {
      try {
        var p = h && h.ArenaProfile;
        if (p && typeof p.get === "function") {
          var v = (p.get() || {}).level;
          if (typeof v === "number" && isFinite(v)) return Math.max(0, Math.floor(v));
        }
      } catch (e) {}
      return null;
    },
    fortress: function (h) {
      try {
        var f = h && h.ArenaFortress;
        if (f && typeof f.get === "function") {
          var st = f.get() || {};
          var v = st.level != null ? st.level : st.stufe;
          if (typeof v === "number" && isFinite(v)) return Math.max(0, Math.floor(v));
        }
      } catch (e) {}
      return null;
    },
    towers: function (h) {
      try {
        var c = h && h.ArenaCards;
        if (c && typeof c.unlockedCount === "function") return Math.max(0, n0(c.unlockedCount()));
        if (c && typeof c.owned === "function") {
          var o = c.owned();
          if (o && typeof o.length === "number") return o.length;
        }
      } catch (e) {}
      return null;
    },
    epicTower: function () { return null; },
    epicSkill: function () { return null; },
  };

  /* Fortschritt eines Lebenszeit-Erfolges. Drei Quellen in fester
   * Reihenfolge: Alter → externer Leser → interner Zähler. */
  function lifeProgress(a, s, now) {
    if (a.age) {
      var span = Math.max(0, nowMs(now) - ts0(s.created));
      if (a.age === "months") return Math.floor(span / (30 * DAY));
      return Math.floor(span / (365 * DAY));
    }
    if (a.src && readers[a.src]) {
      var v = readers[a.src](hostObj());
      if (typeof v === "number") return Math.max(0, v);
    }
    return Math.max(0, n0(s.life.prog[a.key]));
  }

  /* reportEvent(type, amount) — dieselbe Signatur wie ArenaClan,
   * ArenaPass und ArenaDaily. Zählt in Tag, Woche UND Lebenszeit, denn
   * ein Sieg ist ein Sieg, egal welche Liste gerade hinsieht. */
  function reportEvent(type, amount, now) {
    now = nowMs(now);
    var ev = EVENT_ALIAS[String(type == null ? "" : type).toLowerCase()] ||
             EVENT_ALIAS[String(type == null ? "" : type)] || null;
    if (!ev) return get(now);
    var n = Math.max(0, n0(amount == null ? 1 : amount));
    if (n === 0) return get(now);
    var s = get(now);
    DAILY_QUESTS.forEach(function (q) {
      if (q.ev === ev) s.daily.prog[q.key] = Math.min(q.goal, Math.max(0, n0(s.daily.prog[q.key])) + n);
    });
    WEEKLY_QUESTS.forEach(function (q) {
      if (q.ev === ev) s.weekly.prog[q.key] = Math.min(q.goal, Math.max(0, n0(s.weekly.prog[q.key])) + n);
    });
    LIFETIME.forEach(function (a) {
      if (a.ev === ev) s.life.prog[a.key] = Math.max(0, n0(s.life.prog[a.key])) + n;
    });
    save(s);
    return s;
  }

  /* ==================================================================
   * §5 SCHIENE
   * ================================================================== */

  /* rail(value, marks, rewardOf) → das Datenmodell der waagerechten
   * Schiene, in EINER Funktion für beide Bauformen (LOGIN-Meilensteine
   * und Marken).
   *
   * Der Nullpunkt der Schiene liegt NICHT bei 0, sondern eine
   * Schrittweite VOR der ersten Marke — an der Stelle, an der bei AA der
   * Wimpel bzw. der Medaillen-Chip sitzt. Nur so liegt die erste Truhe
   * bei 20 % und der Balken bei Tag 23 mittig zwischen 22 und 24, wie
   * gemessen. */
  function rail(value, marks, rewardOf, takenMap) {
    var step = marks[1] - marks[0];
    var base = marks[0] - step;
    var span = marks[marks.length - 1] - base;
    var v = clamp(value, base, marks[marks.length - 1]);
    return {
      value: value, base: base, max: marks[marks.length - 1],
      fillPct: Math.round(((v - base) / span) * 1000) / 10,
      marks: marks.map(function (m) {
        var taken = !!(takenMap && takenMap[m]);
        var reached = value >= m;
        return {
          at: m,
          pct: Math.round(((m - base) / span) * 1000) / 10,
          reward: rewardOf(m),
          taken: taken,
          reached: reached,
          claimable: reached && !taken,
          locked: !reached,
          /* Die letzte Marke ist AAs goldene Prunktruhe. */
          grand: m === marks[marks.length - 1],
        };
      }),
    };
  }

  /* ==================================================================
   * §6 API — LOGIN
   * ================================================================== */

  /* Der 7-Tage-Zyklus gehört arena_daily.js (siehe Kopf, Entscheidung A).
   * Diese Funktion übersetzt ihn in die einheitliche Form dieses Moduls
   * und ergänzt den Rückfall für den Fall, dass das Modul fehlt. */
  function cycle(now) {
    now = nowMs(now);
    var D = daily();
    if (D && typeof D.loginCalendar === "function") {
      try {
        var c = D.loginCalendar(now);
        return {
          source: "daily",
          step: c.step | 0,
          canClaim: !!c.canClaim,
          days: c.days.map(function (d, i) { return mapDay(d, i, c.step | 0, !!c.canClaim); }),
          nextIn: c.nextIn,
        };
      } catch (e) {}
    }
    var s = get(now);
    var can = s.login.fallbackDay !== dayKey(now);
    var step = clamp(s.login.fallbackStep, 0, FALLBACK_DAYS.length - 1);
    return {
      source: "fallback",
      step: step, canClaim: can,
      days: FALLBACK_DAYS.map(function (d, i) { return mapDay(d, i, step, can); }),
      nextIn: dayStart(now) + DAY - now,
    };
  }
  /* Rückfall-Tabelle. Bewusst wertgleich zu arena_daily.js LOGIN_REWARDS
   * — sie ist nur die Notversorgung, wenn das Modul fehlt (Node-Test),
   * und darf deshalb keine anderen Zahlen zeigen als das Original. */
  var FALLBACK_DAYS = [
    { day: 1, gold: 1200, material: 0,  gems: 0,  pack: null },
    { day: 2, gold: 0,    material: 12, gems: 0,  pack: null },
    { day: 3, gold: 0,    material: 0,  gems: 0,  pack: "bronze" },
    { day: 4, gold: 2500, material: 0,  gems: 0,  pack: null },
    { day: 5, gold: 0,    material: 0,  gems: 0,  pack: "silver" },
    { day: 6, gold: 0,    material: 0,  gems: 60, pack: null },
    { day: 7, gold: 5000, material: 100, gems: 50, pack: "gold", finale: true },
  ];

  /* Eine Kalenderkachel in Anzeigeform. `rewards` ist die Liste der
   * Plätze — AAs Tag 7 zeigt vier davon nebeneinander, alle anderen
   * Tage genau einen. */
  function mapDay(d, i, step, can) {
    var out = [];
    if (d.gems > 0) out.push(rw("gems", d.gems));
    if (d.material > 0) out.push(rw("essence", d.material));
    if (d.gold > 0) out.push(rw("gold", d.gold));
    if (d.pack && PACK_KIND[d.pack]) out.push(rw(PACK_KIND[d.pack], 1));
    if (!out.length) out.push(rw("gold", 1));
    return {
      day: d.day || (i + 1),
      rewards: out,
      wide: !!d.finale || (i === 6),          // Tag 7 liegt über die volle Breite
      done: i < step,
      current: i === step,
      claimable: i === step && can,
      locked: i > step,
      state: i < step ? "done" : (i === step ? (can ? "open" : "waiting") : "locked"),
    };
  }

  /* login(now) → alles, was der LOGIN-Reiter braucht. */
  function login(now) {
    now = nowMs(now);
    var s = get(now), c = cycle(now);
    var total = s.login.total;
    /* Fenster der fünf Marken: ab der zuletzt erreichten geraden Zahl.
     * Bei 0 Logintagen beginnt es bei der ERSTEN Marke (2), sonst stünde
     * eine Truhe auf 0. */
    var first = Math.max(MILE_STEP, Math.floor(total / MILE_STEP) * MILE_STEP);
    var marks = [];
    for (var i = 0; i < MILE_SHOWN; i++) marks.push(first + i * MILE_STEP);
    var r = rail(total, marks, milestoneReward, s.login.marks);
    return {
      dayTotal: total,
      dayText: total + " Tag" + (total === 1 ? "" : "e"),
      rail: r,
      nextIn: c.nextIn,
      nextText: dhm(c.nextIn),
      days: c.days,
      canClaim: c.canClaim,
      step: c.step,
      source: c.source,
    };
  }

  /* claimLoginDay(now) → die Kachel des heutigen Tages abholen.
   * Delegiert an ArenaDaily, wenn vorhanden; erhöht danach den
   * Lebenszeit-Zähler, an dem die Meilenstein-Schiene hängt. */
  function claimLoginDay(now) {
    now = nowMs(now);
    var s = get(now), dk = dayKey(now);
    if (s.login.lastDay === dk) {
      throw new Error("Die Login-Belohnung von heute ist schon abgeholt. " +
        "Die nächste öffnet in " + dhm(dayStart(now) + DAY - now) + ".");
    }
    var D = daily(), res = null, dayNo = 0, rewards = [];
    if (D && typeof D.claimLogin === "function") {
      res = D.claimLogin(now);              // wirft, wenn dort schon geholt
      dayNo = res.day | 0;
      rewards = mapDay({
        day: dayNo, gold: n0(res.gold), material: n0(res.material),
        gems: n0(res.gems), pack: res.pack, finale: dayNo === 7,
      }, dayNo - 1, dayNo - 1, false).rewards;
    } else {
      var idx = clamp(s.login.fallbackStep, 0, FALLBACK_DAYS.length - 1);
      var d = FALLBACK_DAYS[idx];
      dayNo = d.day;
      rewards = mapDay(d, idx, idx, false).rewards;
      if (d.material > 0) bankEssence(d.material);
      s.login.fallbackStep = (idx + 1) % FALLBACK_DAYS.length;
      s.login.fallbackDay = dk;
    }
    s.login.lastDay = dk;
    s.login.total = s.login.total + 1;
    save(s);
    return { day: dayNo, rewards: rewards, dayTotal: s.login.total };
  }

  /* claimLoginMilestone(mark, now) → eine Truhe der Meilenstein-Schiene. */
  function claimLoginMilestone(mark, now) {
    now = nowMs(now);
    var m = n0(mark);
    var s = get(now);
    if (m <= 0 || m % MILE_STEP !== 0) throw new Error("Diesen Meilenstein gibt es nicht.");
    if (s.login.total < m) {
      throw new Error("Noch " + (m - s.login.total) + " Logintag(e) bis zu dieser Truhe.");
    }
    if (s.login.marks[m]) throw new Error("Diese Truhe ist schon abgeholt.");
    var reward = milestoneReward(m);
    if (reward.kind === "essence") bankEssence(reward.amount);
    s.login.marks[m] = 1;
    save(s);
    return { mark: m, rewards: [reward] };
  }

  /* ==================================================================
   * §6b API — TÄGLICH / WÖCHENTLICH
   * ================================================================== */

  function scopeDef(scope) {
    if (scope === "daily") return { list: DAILY_QUESTS, chest: CHEST_DAILY };
    if (scope === "weekly") return { list: WEEKLY_QUESTS, chest: CHEST_WEEKLY };
    throw new Error("Unbekannter Bereich: " + scope);
  }
  function resetIn(scope, now) {
    now = nowMs(now);
    return scope === "daily" ? (dayStart(now) + DAY - now) : (weekStart(now) + WEEK - now);
  }

  /* tasks(scope, now) → Schiene + Aufgabenzeilen.
   * Drei Zustände je Zeile, wortgleich zu AA:
   *   claimable → grüner „Abholen"-Knopf
   *   open      → goldener „LOS"-Knopf, springt auf `go`
   *   taken     → grüner Haken, kein Knopf */
  function tasks(scope, now) {
    now = nowMs(now);
    var def = scopeDef(scope), s = get(now), sc = s[scope];
    var rows = def.list.map(function (q) {
      var have = clamp(n0(sc.prog[q.key]), 0, q.goal);
      var taken = !!sc.taken[q.key];
      var full = have >= q.goal;
      return {
        key: q.key, title: q.title, goal: q.goal, have: have, pts: q.pts, go: q.go,
        pct: Math.round((have / q.goal) * 1000) / 10,
        label: have + "/" + q.goal,
        taken: taken,
        claimable: full && !taken,
        open: !full,
        state: taken ? "taken" : (full ? "claimable" : "open"),
      };
    });
    var ms = resetIn(scope, now);
    return {
      scope: scope,
      points: sc.pts,
      rail: rail(sc.pts, MARK_MARKS, function (m) { return def.chest[m]; }, sc.chests),
      resetIn: ms,
      resetText: dhm(ms),
      quests: rows,
      done: rows.filter(function (r) { return r.taken; }).length,
      total: rows.length,
    };
  }

  /* claimQuest(scope, key, now) → Marken gutschreiben. Die Aufgabe zahlt
   * NUR Marken; die Ware liegt in den Truhen der Schiene. Das ist AAs
   * Aufbau und der Grund, warum die Schiene überhaupt ein Ziel ist. */
  function claimQuest(scope, key, now) {
    now = nowMs(now);
    var def = scopeDef(scope), s = get(now), sc = s[scope];
    var q = Q_BY_KEY[scope + "/" + key];
    if (!q) throw new Error("Unbekannte Aufgabe: " + key);
    if (sc.taken[q.key]) throw new Error("Diese Aufgabe ist schon abgeholt.");
    var have = clamp(n0(sc.prog[q.key]), 0, q.goal);
    if (have < q.goal) {
      throw new Error("Noch nicht fertig — " + have + "/" + q.goal + ".");
    }
    sc.taken[q.key] = 1;
    sc.pts = sc.pts + q.pts;
    save(s);
    return { key: q.key, pts: q.pts, points: sc.pts, rewards: [] };
  }

  /* claimChest(scope, mark, now) → eine Truhe der Marken-Schiene. */
  function claimChest(scope, mark, now) {
    now = nowMs(now);
    var def = scopeDef(scope), s = get(now), sc = s[scope];
    var m = n0(mark);
    var reward = def.chest[m];
    if (!reward) throw new Error("Diese Truhe gibt es nicht.");
    if (sc.pts < m) throw new Error("Noch " + (m - sc.pts) + " Marken bis zu dieser Truhe.");
    if (sc.chests[m]) throw new Error("Diese Truhe ist schon abgeholt.");
    if (reward.kind === "essence") bankEssence(reward.amount);
    sc.chests[m] = 1;
    save(s);
    return { mark: m, rewards: [reward] };
  }

  /* ==================================================================
   * §6c API — LEBENSZEIT
   * ================================================================== */

  function lifetime(now) {
    now = nowMs(now);
    var s = get(now);
    var rows = LIFETIME.map(function (a) {
      var have = clamp(lifeProgress(a, s, now), 0, a.goal);
      var taken = !!s.life.taken[a.key];
      var full = have >= a.goal;
      return {
        key: a.key, title: a.title, goal: a.goal, have: have, go: a.go,
        reward: rw("gems", a.gems),
        pct: Math.round((have / a.goal) * 1000) / 10,
        label: have + "/" + a.goal,
        taken: taken,
        claimable: full && !taken,
        open: !full,
        state: taken ? "taken" : (full ? "claimable" : "open"),
      };
    });
    return {
      scope: "lifetime",
      rows: rows,
      done: rows.filter(function (r) { return r.taken; }).length,
      total: rows.length,
    };
  }

  function claimLifetime(key, now) {
    now = nowMs(now);
    var s = get(now), a = LIFE_BY_KEY[key];
    if (!a) throw new Error("Unbekannter Erfolg: " + key);
    if (s.life.taken[a.key]) throw new Error("Dieser Erfolg ist schon abgeholt.");
    var have = lifeProgress(a, s, now);
    if (have < a.goal) throw new Error("Noch nicht geschafft — " + have + "/" + a.goal + ".");
    s.life.taken[a.key] = 1;
    save(s);
    return { key: a.key, rewards: [rw("gems", a.gems)] };
  }

  /* ==================================================================
   * §6d API — Badges und Zusammenfassung
   * ================================================================== */

  /* badges(now) → die roten Punkte an den vier Reitern.
   * Wird NICHT gespeichert: „es liegt etwas bereit" ist eine Ableitung
   * aus dem Zustand, kein eigener Zustand. Ein gespeicherter Punkt läuft
   * unweigerlich aus dem Takt. */
  function badges(now) {
    now = nowMs(now);
    var lg = login(now), d = tasks("daily", now), w = tasks("weekly", now), lf = lifetime(now);
    function railReady(r) {
      return r.marks.filter(function (m) { return m.claimable; }).length;
    }
    function questReady(t) {
      return t.quests.filter(function (q) { return q.claimable; }).length + railReady(t.rail);
    }
    var out = {
      login: (lg.canClaim ? 1 : 0) + railReady(lg.rail),
      daily: questReady(d),
      weekly: questReady(w),
      lifetime: lf.rows.filter(function (r) { return r.claimable; }).length,
    };
    out.total = out.login + out.daily + out.weekly + out.lifetime;
    return out;
  }

  function summary(now) {
    now = nowMs(now);
    var b = badges(now), d = tasks("daily", now), w = tasks("weekly", now);
    return {
      badges: b,
      dayTotal: get(now).login.total,
      dailyPoints: d.points, weeklyPoints: w.points,
      dailyResetText: d.resetText, weeklyResetText: w.resetText,
    };
  }

  function reset() { save(fresh()); return get(); }

  /* ================= Export ================= */
  var API = {
    // Konstanten
    STATE_VERSION: STATE_VERSION,
    MILE_STEP: MILE_STEP, MILE_SHOWN: MILE_SHOWN, MARK_MARKS: MARK_MARKS,
    DAILY_QUESTS: DAILY_QUESTS, WEEKLY_QUESTS: WEEKLY_QUESTS, LIFETIME: LIFETIME,
    CHEST_DAILY: CHEST_DAILY, CHEST_WEEKLY: CHEST_WEEKLY, KIND: KIND,
    TABS: ["login", "daily", "weekly", "lifetime"],
    TAB_TITEL: { login: "LOGIN", daily: "TÄGLICH", weekly: "WÖCHENTLICH", lifetime: "LEBENSZEIT" },
    // Lesen
    get: get, summary: summary, badges: badges,
    login: login, tasks: tasks, lifetime: lifetime,
    milestoneReward: milestoneReward, rail: rail, rw: rw,
    // Schreiben
    reportEvent: reportEvent,
    claimLoginDay: claimLoginDay, claimLoginMilestone: claimLoginMilestone,
    claimQuest: claimQuest, claimChest: claimChest, claimLifetime: claimLifetime,
    reset: reset,
    // Zeit
    dayKey: dayKey, weekKey: weekKey, dayStart: dayStart, weekStart: weekStart,
    resetIn: resetIn, dhm: dhm,
    // intern (Tests, Server-/Spiel-Naht)
    _key: KEY, _readers: readers, _write: function (s) { save(s); },
    _clock: function (fn) { CLOCK = fn || null; },
  };

  if (typeof window !== "undefined") window.ArenaRewards = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_rewards.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, i) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (i !== undefined ? "  " + i : ""));
      if (!cond) fail++;
    };
    var throws = function (fn, part) {
      try { fn(); return { ok: false, msg: "(kein Fehler)" }; }
      catch (e) { return { ok: part ? e.message.indexOf(part) >= 0 : true, msg: e.message }; }
    };

    /* Nachbarmodule laden, OHNE deren Selbsttest auszulösen: sie
     * überspringen ihn, wenn `window` existiert, setzen module.exports
     * aber trotzdem. Danach `window` wieder weg, damit DIESER Test
     * läuft. Dasselbe Vorgehen wie in arena_friends.js. */
    var path = require("path");
    function loadSibling(file) {
      try {
        globalThis.window = {};
        var m = require(path.join(__dirname, file));
        delete globalThis.window;
        return m;
      } catch (e) {
        try { delete globalThis.window; } catch (e2) {}
        console.log("  !! " + file + " nicht ladbar: " + e.message);
        return null;
      }
    }
    var AC = loadSibling("arena_cards.js");
    if (AC) globalThis.ArenaCards = AC;
    var DY = loadSibling("arena_daily.js");
    if (DY) globalThis.ArenaDaily = DY;

    // Kontrollierte Uhr: Montag 2026-07-20 09:00 UTC.
    var MON = Date.UTC(2026, 6, 20, 9, 0, 0);
    var T = MON;
    var setT = function (t) { T = t; };
    API._clock(function () { return T; });
    if (DY) DY._clock(function () { return T; });

    console.log("\n=== ARENA REWARDS — Selbsttest (State v" + STATE_VERSION + ") ===\n");

    /* ================= 1. Werkzeug und Zeit ================= */
    console.log("Werkzeug und Zeit:");
    check("n0()/ts0() werfen Müll weg",
      n0("x") === 0 && n0(3.7) === 3 && ts0(-1) === 0 && ts0(1784538000000) === 1784538000000);
    check("nowMs() liest die Testuhr, nicht Date.now()", nowMs() === MON);
    check("dayStart() rastet auf 00:00 UTC",
      dayStart(MON) === Date.UTC(2026, 6, 20, 0, 0, 0), new Date(dayStart(MON)).toISOString());
    check("weekStart() rastet auf MONTAG 00:00 UTC",
      new Date(weekStart(MON)).getUTCDay() === 1 &&
      weekStart(MON) === Date.UTC(2026, 6, 20, 0, 0, 0),
      new Date(weekStart(MON)).toISOString());
    check("Sonntag gehört noch zur Vorwoche",
      weekStart(Date.UTC(2026, 6, 26, 23, 0, 0)) === weekStart(MON),
      weekKey(Date.UTC(2026, 6, 26, 23, 0, 0)));
    check("Montag darauf ist eine neue Woche",
      weekKey(Date.UTC(2026, 6, 27, 0, 0, 1)) !== weekKey(MON));
    check("dhm() liefert AAs drei Formen",
      dhm(8 * HOUR + 40 * MINUTE) === "8h 40m" &&
      dhm(DAY + 8 * HOUR) === "1d 8h" &&
      dhm(12 * MINUTE) === "12m" && dhm(0) === "0m",
      dhm(8 * HOUR + 40 * MINUTE) + " / " + dhm(DAY + 8 * HOUR));

    /* ================= 2. Die Schiene (aus dem Bild gemessen) ================= */
    console.log("\nSchiene — nachgerechnet an IMG_3338/3339/3340:");
    var r23 = rail(23, [22, 24, 26, 28, 30], milestoneReward, {});
    check("LOGIN Tag 23: Nullpunkt der Schiene ist 20, nicht 0",
      r23.base === 20 && r23.max === 30, r23.base + ".." + r23.max);
    check("Truhe 22 liegt bei 20 %, Truhe 30 bei 100 %",
      r23.marks[0].pct === 20 && r23.marks[4].pct === 100,
      r23.marks.map(function (m) { return m.pct; }).join("/"));
    check("Füllung bei Tag 23 = 30 % (mittig zwischen 22 und 24, wie im Bild)",
      r23.fillPct === 30, r23.fillPct);
    check("Truhe 22 ist offen/abholbar, 24 gesperrt",
      r23.marks[0].claimable && r23.marks[1].locked);
    check("letzte Marke ist die Prunktruhe", r23.marks[4].grand && !r23.marks[3].grand);
    var r90 = rail(90, MARK_MARKS, function (m) { return CHEST_DAILY[m]; }, {});
    check("TÄGLICH 90 Marken: Füllung 90 %, Truhen bei 20/40/60/80/100 %",
      r90.fillPct === 90 && r90.marks.map(function (m) { return m.pct; }).join(",") === "20,40,60,80,100",
      r90.fillPct);
    var r30 = rail(30, MARK_MARKS, function (m) { return CHEST_WEEKLY[m]; }, {});
    check("WÖCHENTLICH 30 Marken: Füllung 30 % (mittig zwischen 20 und 40, wie im Bild)",
      r30.fillPct === 30, r30.fillPct);
    check("Marken-Belohnung ist stabil pro Wert, nicht pro Position",
      milestoneReward(22).kind === milestoneReward(22).kind &&
      milestoneReward(30).kind === "goldpack" && milestoneReward(20).kind === "goldpack" &&
      milestoneReward(24).kind === "silver",
      milestoneReward(22).kind + "/" + milestoneReward(24).kind + "/" + milestoneReward(26).kind);

    /* ================= 3. LOGIN ================= */
    console.log("\nLOGIN:");
    reset(); setT(MON);
    if (DY) DY.reset();
    var lg = login();
    check("frischer Stand: 0 Logintage, Fenster beginnt bei 2",
      lg.dayTotal === 0 && lg.rail.marks[0].at === 2 && lg.rail.marks[4].at === 10,
      lg.rail.marks.map(function (m) { return m.at; }).join("/"));
    check("sieben Kacheln, Tag 7 über die volle Breite",
      lg.days.length === 7 && lg.days[6].wide === true && lg.days[0].wide === false);
    check("Tag 1 ist heute abholbar, Tag 2 gesperrt",
      lg.days[0].claimable && lg.days[1].locked && lg.canClaim);
    check("Timer läuft echt (Rest bis 00:00 UTC)",
      lg.nextIn === 15 * HOUR && lg.nextText === "15h 0m", lg.nextText);
    check("Quelle ist arena_daily.js, nicht der Rückfall",
      DY ? lg.source === "daily" : lg.source === "fallback", lg.source);
    check("Tag 7 zeigt VIER Belohnungsplätze (AA: Gems·Essenz·Gold·Schlüssel — " +
      "bei uns Gems·Essenz·Gold·Pack, Entscheidung B)",
      lg.days[6].rewards.length === 4,
      lg.days[6].rewards.map(function (x) { return x.kind + x.text; }).join(" "));
    check("jede andere Kachel zeigt genau EINEN Platz",
      lg.days.slice(0, 6).every(function (d) { return d.rewards.length === 1; }));
    var cl = claimLoginDay();
    check("abholen erhöht den Lebenszeit-Zähler auf 1",
      cl.dayTotal === 1 && login().dayTotal === 1, cl.dayTotal);
    check("zweimal am selben Tag geht nicht",
      throws(function () { claimLoginDay(); }, "schon abgeholt").ok);
    check("nach dem Abholen rückt der Zyklus vor",
      login().days[0].done === true && login().days[1].current === true);
    /* 21 weitere Tage abholen → Tag 22 */
    for (var i = 1; i < 22; i++) { setT(MON + i * DAY); claimLoginDay(); }
    setT(MON + 22 * DAY);                         // = Tag 23 der Sitzung
    claimLoginDay();
    var lg23 = login();
    check("nach 23 Logintagen steht der Wimpel auf 23",
      lg23.dayTotal === 23 && lg23.dayText === "23 Tage", lg23.dayText);
    check("das Fenster zeigt 22/24/26/28/30 — genau AAs Bild",
      lg23.rail.marks.map(function (m) { return m.at; }).join("/") === "22/24/26/28/30",
      lg23.rail.marks.map(function (m) { return m.at; }).join("/"));
    check("Füllung 30 %, Truhe 22 abholbar", lg23.rail.fillPct === 30 && lg23.rail.marks[0].claimable);
    var mi = claimLoginMilestone(22);
    check("Meilenstein 22 zahlt und ist danach abgehakt",
      mi.rewards.length === 1 && login().rail.marks[0].taken === true, mi.rewards[0].long);
    check("Meilenstein 22 lässt sich nicht zweimal holen",
      throws(function () { claimLoginMilestone(22); }, "schon abgeholt").ok);
    check("Meilenstein 24 ist noch nicht erreicht",
      throws(function () { claimLoginMilestone(24); }, "Logintag").ok);
    check("krumme Meilensteine gibt es nicht",
      throws(function () { claimLoginMilestone(23); }, "gibt es nicht").ok);
    check("Zyklus rollt nach Tag 7 um (23 Tage = Zyklus 4, Kachel 2)",
      login().step === 23 % 7, login().step);

    /* ================= 4. TÄGLICH ================= */
    console.log("\nTÄGLICH:");
    reset(); setT(MON);
    var d0 = tasks("daily");
    check("acht Aufgaben, 0 Marken, Schiene leer",
      d0.quests.length === 8 && d0.points === 0 && d0.rail.fillPct === 0);
    check("Aufgabensumme 110 Marken — die volle Schiene (100) verzeiht einen Ausfall",
      DAILY_QUESTS.reduce(function (a, q) { return a + q.pts; }, 0) === 110);
    check("Reset-Timer 15h 0m bis 00:00 UTC", d0.resetText === "15h 0m", d0.resetText);
    check("alle Zeilen starten im Zustand 'open' (goldener LOS-Knopf)",
      d0.quests.every(function (q) { return q.state === "open"; }));
    reportEvent("win", 3);
    var d1 = tasks("daily");
    check("reportEvent('win',3) füllt die Sieg-Aufgabe auf 3/3 → 'claimable'",
      d1.quests[0].label === "3/3" && d1.quests[0].state === "claimable" && d1.quests[0].pct === 100,
      d1.quests[0].label);
    check("Fortschritt wird bei goal gedeckelt", (function () {
      reportEvent("win", 99);
      return tasks("daily").quests[0].have === 3;
    })());
    check("unbekanntes Ereignis ändert nichts", (function () {
      var before = JSON.stringify(tasks("daily").quests);
      reportEvent("kaeserad", 5);
      return JSON.stringify(tasks("daily").quests) === before;
    })());
    check("Alias 'sieg' zählt wie 'win'", (function () {
      reset(); reportEvent("sieg", 1);
      return tasks("daily").quests[0].have === 1;
    })());
    reset();
    reportEvent("win", 3);
    var q1 = claimQuest("daily", "dwin");
    check("Aufgabe abholen zahlt NUR Marken (Entscheidung C)",
      q1.pts === 10 && q1.points === 10 && q1.rewards.length === 0);
    check("Zeile steht danach auf 'taken' (grüner Haken, kein Knopf)",
      tasks("daily").quests[0].state === "taken");
    check("zweimal abholen geht nicht",
      throws(function () { claimQuest("daily", "dwin"); }, "schon abgeholt").ok);
    check("unfertige Aufgabe lässt sich nicht abholen",
      throws(function () { claimQuest("daily", "dpack"); }, "Noch nicht fertig").ok);
    check("unbekannte Aufgabe wirft",
      throws(function () { claimQuest("daily", "gibtsnicht"); }, "Unbekannte Aufgabe").ok);
    check("Truhe 20 braucht 20 Marken — bei 10 noch nicht",
      throws(function () { claimChest("daily", 20); }, "Noch 10 Marken").ok);
    reportEvent("pack", 2); claimQuest("daily", "dpack");
    var ch = claimChest("daily", 20);
    check("Truhe 20 zahlt Essenz und ist danach abgehakt",
      ch.rewards[0].kind === "essence" && tasks("daily").rail.marks[0].taken === true,
      ch.rewards[0].long);
    check("Truhe 40 ist noch gesperrt",
      throws(function () { claimChest("daily", 40); }, "Noch 20 Marken").ok);
    check("Truhe 100 ist die Prunktruhe (Gold-Pack)",
      CHEST_DAILY[100].kind === "goldpack" && CHEST_WEEKLY[100].kind === "arcane");

    /* ================= 5. WÖCHENTLICH ================= */
    console.log("\nWÖCHENTLICH:");
    reset(); setT(MON);
    var w0 = tasks("weekly");
    check("acht Aufgaben, Summe 140 Marken",
      w0.quests.length === 8 &&
      WEEKLY_QUESTS.reduce(function (a, q) { return a + q.pts; }, 0) === 140);
    check("Reset-Timer zeigt Tage: '6d 15h' bis Montag",
      w0.resetText === "6d 15h", w0.resetText);
    check("dieselbe Meldung füllt Tag UND Woche", (function () {
      reportEvent("win", 3);
      return tasks("daily").quests[0].have === 3 && tasks("weekly").quests[0].have === 3;
    })());
    check("unbekannter Bereich wirft",
      throws(function () { tasks("monatlich"); }, "Unbekannter Bereich").ok);

    /* ================= 6. Fristen und Rollover ================= */
    console.log("\nFristen:");
    reset(); setT(MON);
    reportEvent("win", 3); claimQuest("daily", "dwin");
    check("vor Mitternacht: 10 Marken", tasks("daily").points === 10);
    setT(MON + 15 * HOUR + MINUTE);               // 00:01 UTC am Dienstag
    var dN = tasks("daily");
    check("nach 00:00 UTC ist der Tag neu — Marken, Fortschritt, Truhen weg",
      dN.points === 0 && dN.quests[0].have === 0 && dN.quests[0].state === "open",
      dN.points);
    check("die Woche läuft weiter (Montag+1 ist dieselbe Woche)",
      tasks("weekly").quests[0].have === 3, tasks("weekly").quests[0].have);
    setT(MON + 7 * DAY);                          // nächster Montag
    check("nach Montag 00:00 UTC ist auch die Woche neu",
      tasks("weekly").quests[0].have === 0);
    check("der Login-Zähler überlebt beide Grenzen — er ist Lebenszeit",
      get().login.total === 0 && (function () {
        setT(MON); reset(); claimLoginDay();
        setT(MON + 40 * DAY);
        return get().login.total === 1;
      })());

    /* ================= 7. LEBENSZEIT ================= */
    console.log("\nLEBENSZEIT:");
    setT(MON); reset();
    var lf = lifetime();
    check("acht Erfolge, alle offen",
      lf.rows.length === 8 && lf.rows.every(function (r) { return r.state === "open"; }));
    check("jede Zeile zahlt Gems, keine Marken",
      lf.rows.every(function (r) { return r.reward.kind === "gems"; }) &&
      lf.rows[0].reward.text === "×25" && lf.rows[2].reward.text === "×999",
      lf.rows.map(function (r) { return r.reward.text; }).join(" "));
    check("Zeit-Erfolge zählen ohne jede Meldung mit", (function () {
      setT(MON + 200 * DAY);
      var r = lifetime().rows;
      return r[1].have === 6 && r[1].state === "claimable" && r[2].have === 0;
    })(), lifetime().rows[1].label);
    check("nach einem Jahr ist auch 'Jahr 1' fällig", (function () {
      setT(MON + 370 * DAY);
      return lifetime().rows[2].state === "claimable";
    })());
    var cg = claimLifetime("year1");
    check("Erfolg abholen liefert 999 Gems und hakt ab",
      cg.rewards[0].amount === 999 && lifetime().rows[2].state === "taken", cg.rewards[0].long);
    check("zweimal abholen geht nicht",
      throws(function () { claimLifetime("year1"); }, "schon abgeholt").ok);
    check("unerreichter Erfolg wirft",
      throws(function () { claimLifetime("level15"); }, "Noch nicht geschafft").ok);
    check("unbekannter Erfolg wirft",
      throws(function () { claimLifetime("weltfrieden"); }, "Unbekannter Erfolg").ok);
    check("externer Leser schlägt den internen Zähler", (function () {
      globalThis.ArenaProfile = { get: function () { return { level: 15 }; } };
      var ok = lifetime().rows[0].state === "claimable";
      delete globalThis.ArenaProfile;
      return ok;
    })());
    check("ohne Quelle zählt reportEvent() mit", (function () {
      setT(MON); reset();
      reportEvent("gemSpend", 2500);
      return lifetime().rows[5].state === "claimable";
    })(), lifetime().rows[5].label);
    check("readers ist als EINE Naht exportiert",
      API._readers === readers &&
      ["level", "fortress", "towers", "epicTower", "epicSkill"].every(function (k) {
        return typeof readers[k] === "function";
      }));

    /* ================= 8. Badges ================= */
    console.log("\nBadges (die roten Punkte an den Reitern):");
    setT(MON); reset();
    if (DY) DY.reset();
    var b = badges();
    check("frisch: nur LOGIN hat einen Punkt (die Kachel von heute)",
      b.login === 1 && b.daily === 0 && b.weekly === 0 && b.lifetime === 0,
      JSON.stringify(b));
    reportEvent("win", 3);
    check("fertige Aufgabe setzt den TÄGLICH-Punkt", badges().daily === 1, badges().daily);
    /* Bewusst KEIN Punkt bei WÖCHENTLICH: dieselben drei Siege sind für
     * den Tag (Ziel 3) fertig und für die Woche (Ziel 15) erst ein
     * Fünftel. Ein Punkt, der auf halbem Weg leuchtet, wäre gelogen. */
    check("WÖCHENTLICH bleibt punktlos — dort ist das Ziel 15, nicht 3",
      badges().weekly === 0 && tasks("weekly").quests[0].label === "3/15",
      tasks("weekly").quests[0].label);
    claimQuest("daily", "dwin");
    check("abgeholte Aufgabe nimmt den Punkt wieder weg",
      badges().daily === 0, badges().daily);
    check("eine bereitstehende Truhe setzt den Punkt", (function () {
      reportEvent("pack", 2); claimQuest("daily", "dpack");
      return badges().daily === 1;                      // Truhe 20 wartet
    })());
    check("badges().total summiert alle vier Reiter", (function () {
      var x = badges();
      return x.total === x.login + x.daily + x.weekly + x.lifetime;
    })());
    check("Badges werden NICHT gespeichert (kein Feld im Zustand)",
      JSON.stringify(get()).indexOf("badge") < 0);

    /* ================= 9. Persistenz und Robustheit ================= */
    console.log("\nRobustheit:");
    check("Zustand überlebt einen Reload (nur localStorage)", (function () {
      setT(MON); reset(); reportEvent("win", 2);
      var raw = lsGet();
      memStore = raw;                                  // „Reload"
      return tasks("daily").quests[0].have === 2;
    })());
    check("kaputter Speicherinhalt → frischer Zustand", (function () {
      lsSet("{kein json");
      var s = get();
      return s.v === STATE_VERSION && s.daily.pts === 0 && s.login.total === 0;
    })());
    check("Müll in den Feldern wird geheilt", (function () {
      setT(MON);
      lsSet(JSON.stringify({
        v: STATE_VERSION, created: "gestern",
        login: { total: -5, lastDay: 7, marks: "nein", fallbackStep: 99 },
        daily: "kaputt",
        /* mit GÜLTIGEM Wochenschlüssel — sonst wirft der Rollover die
         * Woche ohnehin weg und die Heilung wäre nicht beobachtbar. */
        weekly: { key: weekKey(MON), pts: -3, prog: { wwin: "viel" }, taken: 5, chests: [1, 2] },
        life: null,
      }));
      var s = get();
      return s.login.total === 0 && s.login.marks && !Array.isArray(s.login.marks) &&
        s.login.fallbackStep === 6 && s.login.lastDay === "" && s.daily.pts === 0 &&
        s.weekly.pts === 0 && s.weekly.prog.wwin === 0 &&
        Object.keys(s.weekly.taken).length === 0 && Object.keys(s.weekly.chests).length === 0 &&
        s.life && s.life.prog && s.life.taken && s.created > 0;
    })());
    check("unbekannte Version wird migriert, der Erstkontakt bleibt", (function () {
      var born = MON - 300 * DAY;
      lsSet(JSON.stringify({ v: 99, created: born, login: { total: 77 } }));
      var s = get();
      return s.v === STATE_VERSION && s.created === born && s.login.total === 0;
    })());
    check("fehlendes ArenaDaily → Rückfall, LOGIN läuft weiter", (function () {
      var keep = globalThis.ArenaDaily;
      delete globalThis.ArenaDaily;
      setT(MON); reset();
      var l = login();
      var ok = l.source === "fallback" && l.days.length === 7 && l.days[6].rewards.length === 4;
      var c = claimLoginDay();
      ok = ok && c.day === 1 && get().login.total === 1;
      setT(MON + DAY);
      ok = ok && login().days[1].claimable === true;
      globalThis.ArenaDaily = keep;
      return ok;
    })());
    check("fehlendes ArenaCards → Essenz wird nicht gebucht, nichts stürzt ab", (function () {
      var keep = globalThis.ArenaCards;
      delete globalThis.ArenaCards;
      setT(MON); reset();
      reportEvent("win", 3); claimQuest("daily", "dwin");
      reportEvent("pack", 2); claimQuest("daily", "dpack");
      var r = claimChest("daily", 20);
      globalThis.ArenaCards = keep;
      return r.rewards[0].kind === "essence";
    })());
    check("reset() nullt alles außer der Struktur", (function () {
      var s = reset();
      return s.login.total === 0 && s.daily.pts === 0 && s.weekly.pts === 0 &&
        Object.keys(s.life.taken).length === 0;
    })());

    /* ================= 10. Hausregeln des Design-Systems ================= */
    console.log("\nHausregeln:");
    check("jede Belohnung nennt Asset-Schlüssel UND Emoji-Rückfall (§6)", (function () {
      var all = [];
      setT(MON); reset();
      login().days.forEach(function (d) { all = all.concat(d.rewards); });
      login().rail.marks.forEach(function (m) { all.push(m.reward); });
      tasks("daily").rail.marks.forEach(function (m) { all.push(m.reward); });
      tasks("weekly").rail.marks.forEach(function (m) { all.push(m.reward); });
      lifetime().rows.forEach(function (r) { all.push(r.reward); });
      return all.length > 0 && all.every(function (x) {
        return x && typeof x.ico === "string" && x.ico && typeof x.emoji === "string" && x.emoji;
      });
    })());
    check("keine erfundene Währung — nur Gems/Gold/Essenz/Karten/Packs (Entscheidung B)",
      Object.keys(KIND).join(",") === "gems,gold,essence,cards,bronze,silver,goldpack,arcane",
      Object.keys(KIND).join(","));
    check("Beschriftung kommt fertig aus dem Modul ('×50'), das UI formatiert nichts",
      rw("gems", 50).text === "×50" && rw("goldpack", 1).long === "Gold-Pack",
      rw("gems", 50).text);
    check("deutsche Reiter-Titel: LOGIN · TÄGLICH · WÖCHENTLICH · LEBENSZEIT",
      API.TABS.map(function (t) { return API.TAB_TITEL[t]; }).join(" · ") ===
      "LOGIN · TÄGLICH · WÖCHENTLICH · LEBENSZEIT");
    check("jede Aufgabe kennt ihr LOS-Ziel (View-ID für show())",
      DAILY_QUESTS.concat(WEEKLY_QUESTS).every(function (q) { return /^nav[A-Z]/.test(q.go); }) &&
      LIFETIME.every(function (a) { return /^nav[A-Z]/.test(a.go); }));

    /* ================= 11. Vollständigkeit der API ================= */
    var NEED = ["get", "summary", "badges", "login", "tasks", "lifetime",
      "reportEvent", "claimLoginDay", "claimLoginMilestone", "claimQuest",
      "claimChest", "claimLifetime", "reset", "rail", "rw", "milestoneReward",
      "dayKey", "weekKey", "dayStart", "weekStart", "resetIn", "dhm"];
    check("API vollständig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");
    check("window.ArenaRewards UND module.exports werden gesetzt",
      typeof module !== "undefined" && module.exports === API);
    check("reportEvent() hat dieselbe Signatur wie ArenaDaily.reportEvent",
      typeof API.reportEvent === "function" && API.reportEvent.length >= 2);

    API._clock(null);
    if (DY) DY._clock(null);
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
