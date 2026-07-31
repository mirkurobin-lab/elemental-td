/* ==================================================================
 * ARENA CLAN — Clan-System Stufe 1: Quests, Spenden, Ghost-Clankrieg,
 *              Leaderboard
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Vollständige Spezifikation samt
 * Begründung aller Zahlen: arena_patches/DESIGN_CLAN.md
 *
 * DIE BINDENDE USER-VORGABE ZUR SENDEMECHANIK (DESIGN_CLAN.md §0),
 * hier als harte Validierung implementiert.
 *
 * ---- GÜLTIGE FASSUNG, 30.07.2026 — wörtlich vom Auftraggeber: ----
 *   „man darf 30 Karten anfordern. Jeder Spieler darf aber nur maximal
 *    10 Karten dazu steuern. Es kann auch nur eine gesendet werden nicht
 *    direkt 10. man darf aber nur alle 5 Stunden Karten anfordern."
 * In Konstanten:
 *   · REQUEST_SIZE            = 30   Karten je Anfrage
 *   · DONATE_MAX_PER_REQUEST  = 10   was EIN Spieler zu EINER Anfrage gibt
 *   · DONATE_PER_TAP          = 1    Karte je Sendevorgang
 *   · REQUEST_COOLDOWN_MS     = 5 h  zwischen zwei eigenen Anfragen
 * Unverändert weiter gültig (die drei anderen bindenden Vorgaben):
 *   · Es dürfen NUR Tower-Karten versendet werden (keine Helden, kein
 *     Material, kein Gold).
 *   · NUR Basis-Kopien (Tier "common"/grau) — KEINE grünen/blauen/
 *     höheren Raritäten. Fusionen (3 gleiche → nächste Stufe) muss
 *     jeder Spieler selbst machen und selbst herausfinden.
 *   · Die eigene Anfrage kann man nicht selbst bespenden.
 *
 * ---- ABGELÖSTE FASSUNG, 26.07.2026 (steht hier, damit nachvollziehbar
 *      bleibt, was sich wann geändert hat): ----
 *   „Limit 10 Stück pro 3 Stunden" — ein GLOBALES rollierendes Fenster
 *   über ALLE Anfragen hinweg (SEND_MAX / SEND_WINDOW_MS / s.sendLog).
 *   WARUM ES ERSATZLOS ENTFÄLLT und nicht neben der neuen Regel steht:
 *   beide tragen dieselbe Zahl 10. Nebeneinander hätten sie geheißen —
 *   wer einem Clankollegen mit 10 Karten hilft, kann drei Stunden lang
 *   KEINEM ZWEITEN mehr helfen. Das Zeitfenster hätte genau das
 *   Verhalten bestraft, für das es Clans überhaupt gibt. Verbindlich
 *   ist deshalb allein die Grenze JE ANFRAGE.
 *   GEMESSENE FOLGE (dem Auftraggeber gemeldet): der Tagesdeckel steigt
 *   von 80 auf 120 Karten — 4 Bot-Anfrage-Buckets à 6 h × 3 gleichzeitig
 *   offene Anfragen × 10 eigene Karten —, der Gold-Zufluss aus Spenden
 *   damit von 2 000 auf 3 000 🪙/Tag (DONATE_GOLD = 25).
 *
 * Jeder Verstoß wirft einen Error mit deutscher Klartextmeldung, die
 * direkt als Toast taugt. Die Signatur donateCards(requestId, count)
 * nimmt bewusst KEINEN Tier-Parameter — eine höhere Rarität ist über
 * die API nicht adressierbar, die Prüfung ist nur die zweite
 * Verteidigungslinie.
 *
 * ARCHITEKTUR — die Server-Naht (DESIGN_CLAN.md §7):
 *   ClanState = persistiert (localStorage "arenaClan"): alles, was dem
 *               SPIELER gehört — Clan-Stammdaten, eigene Rolle, eigener
 *               Quest-Beitrag, eigene Anfrage, sendLog, eigene
 *               Kriegspunkte, eigene Notizen.
 *   ClanSim   = berechnet, persistiert NICHTS: die 29 Mitspieler, deren
 *               Anfragen und Quest-Beiträge, der Gegnerclan mit 30
 *               Ghost-Builds, beide Kriegsverläufe, die
 *               Leaderboard-Population, der Bot-Feed.
 * Alles in ClanSim ist eine reine Funktion aus (clan.seed, weekKey,
 * now). Ein echter Server ersetzt genau diese Funktionen 1:1; weil kein
 * Bot-Zustand gespeichert wird, gibt es dabei KEINE Datenmigration.
 *
 * WÄHRUNGS-ZUSTÄNDIGKEIT (identisch zu arena_cards.js / arena_fortress.js):
 *   · Kartenkopien und Upgrade-Material bucht dieses Modul selbst über
 *     ArenaCards (dessen Domäne).
 *   · GOLD wird NUR GEMELDET, nie gebucht — das Gold-Konto liegt
 *     hub-seitig (arenaHub / "arenaHubGold"). Jede Belohnung liefert
 *     `reward.gold`; der Aufrufer zahlt aus.
 *
 * WIRING:
 *   1. <script src="arena_clan.js"></script> nach arena_cards.js.
 *   2. arena_pan.html — in resolveEnd(), nachdem res feststeht:
 *        ArenaClan.reportEvent("win", res.win ? 1 : 0);
 *        if (res.delta > 0) ArenaClan.reportEvent("trophy", res.delta);
 *      Beim Pack-Öffnen:  ArenaClan.reportEvent("pack", 1);
 *   3. Kriegs-Angriff:
 *        var lo = ArenaClan.startWarAttack(targetId);   // Loadout
 *        ... Match spielen ...
 *        ArenaClan.resolveWarAttack(targetId, {win, stars, hpFrac});
 *   4. Hub — Clan-View und Rangliste rendern generisch aus
 *      info() / members() / quests() / requests() / warBoard() /
 *      leaderboard(view). Siehe ui_prototype.html.
 *
 * Selbsttest: `node arena_patches/arena_clan.js` → endet mit "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaClan";
  /* v3 seit 30.07.2026: `sendLog` (das globale 3-h-Fenster) ist ersatzlos
     entfallen. Ein Feld, das niemand mehr liest, aber weiter geschrieben
     wird, ist die teuerste Art von Altlast — es sieht wie eine Regel aus.
     Die Grenze steckt jetzt vollständig in `donated` ({anfrageId: n}),
     das es ohnehin schon gab. */
  var STATE_VERSION = 3;

  /* ================= Konstanten (DESIGN_CLAN.md §9) ================= */

  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;

  /* ---- Sendemechanik (Vorgabe 30.07.2026, Kopfkommentar + §0) ----
     SEND_MAX/SEND_WINDOW_MS sind BEWUSST GELÖSCHT und nicht als Alias
     stehengeblieben: ein Aufrufer, der sie noch benutzt, soll laut
     scheitern statt still mit einer plausiblen falschen Zahl zu rechnen. */
  var REQUEST_SIZE = 30;             // Bedarf einer Anfrage
  var DONATE_MAX_PER_REQUEST = 10;   // was EIN Spieler zu EINER Anfrage beitragen darf
  var DONATE_PER_TAP = 1;            // Karten je Sendevorgang — „nicht direkt 10"
  var REQUEST_COOLDOWN_MS = 5 * HOUR;
  var DONATED_KEEP = 40;             // max. Einträge in s.donated (Begründung in get())
  var DONATE_GOLD = 25;              // Gold je gespendeter Karte (nur gemeldet)
  var DONATE_MATERIAL = 1;           // Material je gespendeter Karte (gebucht)

  /* ---- Clan ---- */
  var MAX_MEMBERS = 30;              // Spieler + 29 Bots
  var BOT_COUNT = MAX_MEMBERS - 1;
  var MAX_ELDERS = 5;
  var EMOTE_COOLDOWN_MS = 60000;
  var INACTIVE_MS = 7 * DAY;         // ab hier im UI abgedunkelt
  var NAME_MIN = 3, NAME_MAX = 20, DESC_MAX = 120;
  var NOTES_MAX = 40;

  /* ---- Tower-Karten: die EINZIGE versendbare Ressource ----
   * Erweiterbar über registerTower(). Helden (solara/magmor) stehen
   * absichtlich NICHT hier und dürfen es auch nie — sie sind Identität,
   * keine Ware (DESIGN_CLAN.md §0.1). */
  var TOWER_IDS = ["fire", "water", "nature", "earth", "light", "darkness"];
  /* Anzeigenamen. Duplizieren bewusst die Präsentationsschicht des UI —
   * sie stecken nur hier, damit die FEHLERMELDUNGEN lesbar sind
   * ("… EMBER-Kopien" statt "… fire-Kopien"). Gehört später in die
   * Turm-Definitionen des Spiels. */
  var CARD_NAME = {
    fire: "EMBER", water: "FROST", nature: "THORN", earth: "STONE",
    light: "DAWN", darkness: "HOLLOW", solara: "SOLARA", magmor: "MAGMOR",
  };
  var TIER_LABEL = {
    common: 'grau (Gewöhnlich)', good: '„Gut“ (Grün)', rare: '„Selten“ (Blau)',
    epic: '„Episch“ (Lila)', legendary: '„Legendär“ (Orange)', supreme: '„Suprem“ (Rot)',
  };

  /* ---- Quests (Wochenziele + Bot-Erwartung je Bot) ---- */
  var QUEST_DEFS = [
    { key: "wins", ev: "win", goal: 360, base: 11, sym: "⚔",
      title: "Gewinnt zusammen 360 Matches",
      desc: "Jeder Sieg eines Mitglieds zählt auf denselben Balken." },
    { key: "packs", ev: "pack", goal: 120, base: 3.7, sym: "🎁",
      title: "Öffnet zusammen 120 Packs",
      desc: "Booster-Packs aus Siegen, Truhen und dem Shop." },
    { key: "trophies", ev: "trophy", goal: 5400, base: 168, sym: "🏆",
      title: "Verdient zusammen 5 400 Trophäen",
      desc: "Nur Gewinne zählen — Niederlagen ziehen nichts ab." },
  ];
  /* Streuung des Bot-Beitrags: rate ∈ [0.7, 1.3], Mittel 1.0.
   * Die Spanne ist bewusst ENG. Mit [0.5, 1.5] liegt die Streuung der
   * Summe über 29 Bots bei ±5 %, und dann reißt ein Quest in manchen
   * Wochen die 100 % ohne den Spieler — die Quest wäre in dieser Woche
   * Deko. Bei [0.7, 1.3] beträgt σ der Summe nur base·0.93 (Siege ±10
   * von 319), die Bots landen also verlässlich bei 87–92 %. */
  var QUEST_RATE_MIN = 0.7, QUEST_RATE_SPAN = 0.6;
  var QUEST_KEYS = QUEST_DEFS.map(function (q) { return q.key; });
  var QUEST_BY_KEY = {}, QUEST_BY_EVENT = {};
  QUEST_DEFS.forEach(function (q) { QUEST_BY_KEY[q.key] = q; QUEST_BY_EVENT[q.ev] = q; });
  // Event-Aliase, damit Aufrufer im Spiel nicht raten müssen.
  var EVENT_ALIAS = { win: "win", wins: "win", sieg: "win",
                      pack: "pack", packs: "pack",
                      trophy: "trophy", trophies: "trophy", trophaeen: "trophy" };

  /* ---- Wochen-Truhe (Staffel nach Gesamtfortschritt) ---- */
  var CHEST_STEPS = [
    { tier: "bronze", at: 0.50, name: "Bronze-Hort", sym: "🥉",
      pack: "bronze", gold: 1500, material: 20 },
    { tier: "silver", at: 0.80, name: "Silber-Hort", sym: "🥈",
      pack: "silver", gold: 4000, material: 45 },
    { tier: "gold", at: 1.00, name: "Gold-Hort", sym: "🥇",
      pack: "gold", gold: 9000, material: 90 },
  ];

  /* ---- Ghost-Clankrieg ---- */
  var WAR_ATTACKS_PER_DAY = 3;       // → 6 über das Wochenende
  var WAR_MAX_PER_TARGET = 1;
  var WAR_WIN_BASE = 100, WAR_WIN_STAR = 15, WAR_WIN_HP = 15;
  var WAR_LOSS_BASE = 20, WAR_LOSS_STAR = 5;
  var WAR_ENEMY_MIN = 900, WAR_ENEMY_SPAN = 700;   // Gegner-Endstand 900..1599
  var WAR_GAP_MIN = 250, WAR_GAP_SPAN = 200;       // Lücke 250..449 → der Spieler entscheidet
  var WAR_CHEST_WIN = { name: "Kriegstruhe", sym: "🏆", pack: "gold", gold: 15000, material: 140 };
  var WAR_CHEST_LOSS = { name: "Trosttruhe", sym: "🎁", pack: "bronze", gold: 3000, material: 25 };
  // Banner-Rahmen nach SIEGESSERIE. Einmal erreicht = für immer (§5.5).
  var WAR_BADGE_STEPS = [
    { key: "bronze", at: 1, name: "Bronze-Rahmen", sym: "🥉", color: "#c98a52" },
    { key: "silver", at: 3, name: "Silber-Rahmen", sym: "🥈", color: "#c9d2da" },
    { key: "gold", at: 6, name: "Gold-Rahmen", sym: "🥇", color: "#f2c53d" },
    { key: "prisma", at: 10, name: "Prisma-Rahmen", sym: "💠", color: "#a45ef2" },
  ];

  /* ---- Leaderboard ---- */
  var LB_POPULATION = 300;
  var LB_TOP = 9800, LB_BOTTOM = 150, LB_EXP = 3.2;
  var LB_GLOBAL = 100, LB_AROUND = 25;

  /* ================= Presets ================= */

  var BADGE_COLORS = [
    { key: "crimson", name: "Blutrot", c1: "#ff5e7e", c2: "#8d1c3a" },
    { key: "gold", name: "Goldglanz", c1: "#f4e3a6", c2: "#a8842a" },
    { key: "azure", name: "Azurblau", c1: "#63b1ee", c2: "#1c4e7a" },
    { key: "emerald", name: "Smaragd", c1: "#58c26a", c2: "#1c5a2c" },
    { key: "violet", name: "Amethyst", c1: "#a45ef2", c2: "#4b1c8d" },
    { key: "amber", name: "Bernstein", c1: "#f2a13d", c2: "#8a4a10" },
    { key: "frost", name: "Frostweiß", c1: "#dff2ff", c2: "#6f8fa8" },
    { key: "obsidian", name: "Obsidian", c1: "#4a5f78", c2: "#101820" },
  ];
  var BADGE_SYMBOLS = [
    { key: "prism", name: "Prisma", sym: "◈" },
    { key: "flame", name: "Flamme", sym: "🔥" },
    { key: "frostrune", name: "Frost", sym: "❄" },
    { key: "vine", name: "Ranke", sym: "🌿" },
    { key: "rock", name: "Fels", sym: "🪨" },
    { key: "sun", name: "Sonne", sym: "☀" },
    { key: "void", name: "Leere", sym: "🌑" },
    { key: "crown", name: "Krone", sym: "♛" },
  ];
  var COLOR_BY_KEY = {}, SYM_BY_KEY = {};
  BADGE_COLORS.forEach(function (c) { COLOR_BY_KEY[c.key] = c; });
  BADGE_SYMBOLS.forEach(function (s) { SYM_BY_KEY[s.key] = s; });

  var ROLES = {
    leader: { key: "leader", name: "Anführer", rank: 3, sym: "★" },
    elder: { key: "elder", name: "Ältester", rank: 2, sym: "✦" },
    member: { key: "member", name: "Mitglied", rank: 1, sym: "·" },
  };

  /* Emotes statt Freitext-Chat (DESIGN_CLAN.md §8). */
  var EMOTES = [
    { key: "gl", text: "Viel Glück da draußen!", emoji: "🍀" },
    { key: "thx", text: "Danke für die Spende!", emoji: "🙏" },
    { key: "need", text: "Brauche Karten — schaut in die Anfragen!", emoji: "📥" },
    { key: "war", text: "Alle Mann an die Angriffe!", emoji: "⚔" },
    { key: "nice", text: "Starker Kampf!", emoji: "🔥" },
    { key: "hi", text: "Willkommen im Clan!", emoji: "👋" },
  ];
  var EMOTE_BY_KEY = {};
  EMOTES.forEach(function (e) { EMOTE_BY_KEY[e.key] = e; });

  /* Namensbausteine im Stil von arena_rivals.js (deutsch, zweiteilig:
   * Vorname + sprechender Beiname). 24 × 20 = 480 Kombinationen. */
  var FIRST = ["Grubb", "Pim", "Nessa", "Orlo", "Lyra", "Kael", "Brann", "Sylketh",
    "Vex", "Morra", "Auren", "Thraxus", "Hadwin", "Ilva", "Rok", "Selune",
    "Baldrik", "Nyx", "Ferrin", "Ondra", "Tarn", "Veska", "Gorm", "Aluna"];
  var EPITHET = ["Steinherz", "Glutfaust", "Nebelgang", "Sternhauch", "Dornenschritt",
    "Tiefenruf", "Frostmähne", "Aschenblick", "Wolkenbrecher", "Hohlklang",
    "Lichtträger", "Rankenbinder", "Grabhüter", "Funkenschmied", "Erzsucher",
    "Windschneide", "Schattenlot", "Kristallsinn", "Flammenhüter", "Silberzahn"];
  var CLAN_ADJ = ["Eiserne", "Blutrote", "Stille", "Goldene", "Ewige", "Verlorene",
    "Erste", "Wilde", "Kalte", "Letzte"];
  var CLAN_NOUN = ["Klingen", "Wächter", "Kronen", "Legion", "Bruderschaft", "Zirkel",
    "Fäuste", "Schwingen", "Orden", "Bastion"];
  var ELEMENTS = ["fire", "water", "nature", "earth", "light", "darkness"];
  var EL_NAME = { fire: "Feuer", water: "Wasser", nature: "Natur",
                  earth: "Erde", light: "Licht", darkness: "Finsternis" };

  /* ================= Determinismus-Werkzeug ================= */

  /* FNV-1a über die verketteten Argumente, mit murmur3-Finalisierung.
   * Reine Funktion, keine Zustandsvariable — dieselben Argumente ergeben
   * immer dieselbe Zahl, auf jeder Plattform. Genau das macht die
   * Bot-Schicht ohne Speicher reproduzierbar.
   *
   * ⚠ DIE FINALISIERUNG IST NICHT KOSMETIK. Reines FNV-1a mischt die
   * ZULETZT eingespeisten Bytes kaum — und genau die variieren bei uns
   * (…|k mit k = 0…28). Ohne fmix32 sind h01(…, 0) … h01(…, 28)
   * korreliert, und 29 „Zufallswerte" summieren sich systematisch zu
   * viel oder zu wenig. Das hat die Quest-Kalibrierung (§3.2) beim
   * ersten Testlauf um bis zu 45 % verfehlt. */
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
  function h01() { return hash.apply(null, arguments) / 4294967296; }
  function hpick(arr) {
    var a = Array.prototype.slice.call(arguments, 1);
    return arr[hash.apply(null, a) % arr.length];
  }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  /* ts0(v) — Zeitstempel normalisieren. NIEMALS `v | 0` benutzen:
   * Millisekunden-Zeitstempel sind > 2³¹ und werden von einer 32-Bit-
   * Bit-Operation zerstört (1 784 538 000 000 | 0 = −1 246 083 072).
   * Genau dieser Fehler hat den 8-h-Anfrage-Cooldown ausgehebelt. */
  function ts0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }

  /* ================= Zeit / Kalenderwoche (alles UTC) =================
   * Wochengrenze = Montag 00:00 UTC. Begründung DESIGN_CLAN.md §3.4:
   * ein Clan hat Mitglieder in mehreren Zeitzonen, ein gemeinsamer
   * Balken darf nicht für jeden zu einer anderen Zeit zurückspringen. */

  var CLOCK = null;                  // Test-Hook, siehe _clock()
  function nowMs(override) {
    if (typeof override === "number" && isFinite(override)) return override;
    return CLOCK ? CLOCK() : Date.now();
  }
  function weekStart(ts) {
    var d = new Date(ts);
    var iso = (d.getUTCDay() + 6) % 7;                  // 0 = Montag
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - iso * DAY;
  }
  function weekKeyOf(ts) {
    var thu = new Date(weekStart(ts) + 3 * DAY);         // ISO: der Donnerstag entscheidet das Jahr
    var y = thu.getUTCFullYear();
    var doy = (thu.getTime() - Date.UTC(y, 0, 1)) / DAY + 1;
    var wk = Math.ceil(doy / 7);
    return y + "-W" + (wk < 10 ? "0" : "") + wk;
  }
  var COLLECT_MS = 5 * DAY;          // Mo 00:00 – Fr 24:00
  var WAR_MS = 2 * DAY;              // Sa 00:00 – So 24:00

  /* warPhase(now) → {phase, weekKey, weekStart, day, warDay, msLeft, until, frac}
   *   phase   "collect" (Mo–Fr) | "war" (Sa–So)
   *   day     0 = Montag … 6 = Sonntag
   *   warDay  0 = Samstag, 1 = Sonntag, -1 außerhalb der Kriegsphase
   *   frac    Fortschritt 0..1 INNERHALB der aktuellen Phase
   *   msLeft  bis zum Phasenwechsel  ·  until  Zeitstempel dazu       */
  function warPhase(now) {
    now = nowMs(now);
    var ws = weekStart(now), el = now - ws;
    var isWar = el >= COLLECT_MS;
    var until = ws + (isWar ? COLLECT_MS + WAR_MS : COLLECT_MS);
    return {
      phase: isWar ? "war" : "collect",
      weekKey: weekKeyOf(now), weekStart: ws,
      day: Math.floor(el / DAY),
      warDay: isWar ? Math.floor((el - COLLECT_MS) / DAY) : -1,
      msLeft: until - now, until: until,
      frac: clamp(isWar ? (el - COLLECT_MS) / WAR_MS : el / COLLECT_MS, 0, 1),
    };
  }
  // Fortschritt der SAMMELPHASE (für den Bot-Quest-Beitrag). Am
  // Wochenende ist er 1 — der Balken friert ein, statt zurückzufallen.
  function collectFrac(now) {
    now = nowMs(now);
    return clamp((now - weekStart(now)) / COLLECT_MS, 0, 1);
  }

  /* ================= Persistenz ================= */

  var memStore = null;               // Node-Fallback

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

  function freshQuests(wk) {
    return { week: wk, progress: { wins: 0, packs: 0, trophies: 0 }, claimed: false };
  }
  function freshWar(wk) {
    return { week: wk, points: 0, attacks: {}, byDay: {}, log: [], resolved: false, won: null };
  }
  function fresh() {
    return {
      v: STATE_VERSION,
      joined: false,
      clan: null,
      me: { id: "me", name: "Du", role: "member", joinedTs: 0, lastActive: 0,
            lastRequestTs: 0, lastEmoteTs: 0 },
      quests: freshQuests(""),
      requests: [],                  // enthält NUR die eigene Anfrage
      /* {anfrageId: n} — eigene Spenden je Anfrage. Seit 30.07.2026 ist das
         nicht mehr nur ein Anzeige-Overlay, sondern die TRAGENDE Struktur
         der Sendegrenze: n ≤ DONATE_MAX_PER_REQUEST. */
      donated: {},
      notes: [],
      war: freshWar(""),
      lastWar: null,
      stats: { donatedTotal: 0, receivedTotal: 0, warPointsTotal: 0 },
    };
  }

  /* ---- Migration v1 → v2 -------------------------------------------
   * v1 hielt `quests` flach (quests.wins statt quests.progress.wins) und
   * das Sendelimit als Cooldown-Zähler (`sent` + `sentSince`).
   * Die Zähler-Umrechnung, die hier bis zum 30.07.2026 stand, ist
   * ENTFALLEN: v3 kennt kein globales Sendelimit mehr, in das sie
   * münden könnte (siehe migrateV2toV3). Übrig bleibt die Quest-Form.
   * ------------------------------------------------------------------ */
  function migrateV1toV2(old) {
    var s = fresh();
    s.joined = !!old.joined;
    s.clan = old.clan || null;
    if (old.me && typeof old.me === "object") {
      for (var k in s.me) if (old.me[k] !== undefined) s.me[k] = old.me[k];
    }
    var oq = old.quests || {};
    s.quests = freshQuests(oq.week || "");
    s.quests.progress.wins = Math.max(0, oq.wins | 0);
    s.quests.progress.packs = Math.max(0, oq.packs | 0);
    s.quests.progress.trophies = Math.max(0, oq.trophies | 0);
    s.quests.claimed = !!oq.claimed;
    s.requests = Array.isArray(old.requests) ? old.requests : [];
    s.donated = (old.donated && typeof old.donated === "object") ? old.donated : {};
    s.notes = Array.isArray(old.notes) ? old.notes : [];
    s.war = old.war && typeof old.war === "object" ? old.war : freshWar("");
    s.lastWar = old.lastWar || null;
    if (old.stats && typeof old.stats === "object") {
      for (var sk in s.stats) if (old.stats[sk] !== undefined) s.stats[sk] = old.stats[sk] | 0;
    }
    s.v = 2;                           // ehrliche Zwischenstufe für den Dispatcher
    return s;
  }

  /* ---- Migration v2 → v3 (30.07.2026) -------------------------------
   * v2 speicherte das GLOBALE Sendelimit als `sendLog` — ein Feld voller
   * Zeitstempel, das in v3 niemand mehr liest. Es wird GELÖSCHT statt
   * mitgeschleppt: ein persistiertes Feld, das wie eine Regel aussieht,
   * aber keine mehr ist, ist die teuerste Sorte Altlast (und run_v6
   * misst den State auf < 6 000 Byte).
   * Ein Rest-Kontingent umzurechnen wäre sinnlos — es gibt kein Fenster
   * mehr, in das es passen könnte. Wer beim Update mitten im alten
   * Fenster stand, hat danach volle Anfrage-Kontingente. Das ist die
   * spielerfreundliche Richtung und NICHT missbrauchbar: die neue
   * Grenze steckt in `donated`, und das wird 1:1 übernommen — wer einer
   * Anfrage schon 10 Karten gegeben hat, gibt ihr auch nach dem Update
   * keine elfte. ------------------------------------------------------ */
  function migrateV2toV3(old) {
    var s = old;
    delete s.sendLog;
    delete s.sent;                     // v1-Reste, falls sie je durchrutschten
    delete s.sentSince;
    s.v = 3;
    return s;
  }
  /* Dispatcher: ein v1-Stand läuft BEIDE Stufen (Muster wie
     arena_cards.js). Kein v-Feld = Vor-Versionierung, wie v1 behandelt. */
  function migrateState(old) {
    var s = old || {};
    if ((s.v | 0) < 2) s = migrateV1toV2(s);
    if ((s.v | 0) < 3) s = migrateV2toV3(s);
    return s;
  }

  /* normClan(c) — Stammdaten heilen. Fremde Presetkeys, zu lange Namen
   * und kaputte Zahlen fallen hier und nicht erst im UI auf. */
  function normClan(c) {
    if (!c || typeof c !== "object") return null;
    var color = COLOR_BY_KEY[c.badge && c.badge.color] ? c.badge.color : BADGE_COLORS[0].key;
    var sym = SYM_BY_KEY[c.badge && c.badge.sym] ? c.badge.sym : BADGE_SYMBOLS[0].key;
    var name = String(c.name || "Namenloser Clan").slice(0, NAME_MAX);
    var streak = Math.max(0, c.warStreak | 0);
    return {
      id: String(c.id || "clan_local"),
      name: name,
      badge: { color: color, sym: sym },
      desc: String(c.desc || "").slice(0, DESC_MAX),
      joinMode: c.joinMode === "request" ? "request" : "open",
      minTrophies: Math.max(0, c.minTrophies | 0),
      created: ts0(c.created),
      seed: (c.seed | 0) || hash("clan", name) % 1000000,
      anchor: Math.max(100, c.anchor | 0 || 800),
      warWins: Math.max(0, c.warWins | 0),
      warStreak: streak,
      warBadge: badgeForStreak(Math.max(streak, c.bestStreak | 0)) ,
      bestStreak: Math.max(streak, c.bestStreak | 0),
    };
  }
  function badgeForStreak(streak) {
    var out = null;
    for (var i = 0; i < WAR_BADGE_STEPS.length; i++) {
      if (streak >= WAR_BADGE_STEPS[i].at) out = WAR_BADGE_STEPS[i].key;
    }
    return out;
  }

  /* get(now) — normalisiert, migriert und macht den LAZY ROLLOVER.
   * Kein setInterval, kein Hintergrund-Job: der Wochenwechsel passiert
   * beim ersten Lesen in der neuen Woche. */
  function get(now) {
    now = nowMs(now);
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    /* `sendLog`/`sent` gibt es in v3 nicht mehr — sie bleiben hier
       trotzdem stehen: sie sind der ERKENNUNGSMERKMAL eines alten
       Standes, der migriert werden muss. */
    var known = s.clan !== undefined || s.sendLog !== undefined ||
                s.sent !== undefined || s.donated !== undefined;
    if (s.v !== STATE_VERSION && known) s = migrateState(s);
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    s.v = STATE_VERSION;
    s.clan = normClan(s.clan);
    s.joined = !!(s.joined && s.clan);
    if (!s.me || typeof s.me !== "object") s.me = f.me;
    for (var mk in f.me) if (s.me[mk] === undefined) s.me[mk] = f.me[mk];
    s.me.id = "me";
    if (!ROLES[s.me.role]) s.me.role = "member";
    s.me.joinedTs = ts0(s.me.joinedTs);
    s.me.lastActive = ts0(s.me.lastActive);
    s.me.lastRequestTs = ts0(s.me.lastRequestTs);
    s.me.lastEmoteTs = ts0(s.me.lastEmoteTs);
    if (!s.quests || typeof s.quests !== "object") s.quests = f.quests;
    if (!s.quests.progress || typeof s.quests.progress !== "object") s.quests.progress = { wins: 0, packs: 0, trophies: 0 };
    QUEST_KEYS.forEach(function (q) { s.quests.progress[q] = Math.max(0, s.quests.progress[q] | 0); });
    if (!Array.isArray(s.requests)) s.requests = [];
    /* `donated` HEILEN — es trägt seit 30.07.2026 die Sendegrenze, also
       muss hier stehen, was dort früher für `sendLog` stand:
       · jeder Wert ist eine ganze Zahl in [0, DONATE_MAX_PER_REQUEST].
         Ein manipulierter Eintrag kann die Grenze damit nur SENKEN,
         nicht heben, und eine „11" aus einem alten Stand wird zu 10.
       · der Deckel auf ANZAHL der Schlüssel: Bot-Anfragen rotieren alle
         6 h (SIM_REQ_BUCKET), ihre IDs sind also unbegrenzt viele. Ohne
         Deckel wüchse der State ewig — run_v6 misst ihn auf < 6 000 Byte.
         DONATED_KEEP = 40 ≙ gut drei Tage Anfragen (4 Buckets × 3), die
         ältesten fallen zuerst weg. Ihre Anfragen gibt es dann längst
         nicht mehr, die Grenze kann also niemand damit umgehen. */
    if (!s.donated || typeof s.donated !== "object") s.donated = {};
    var dkeys = Object.keys(s.donated);
    for (var di = 0; di < dkeys.length; di++) {
      var dv = Math.max(0, Math.min(DONATE_MAX_PER_REQUEST, s.donated[dkeys[di]] | 0));
      if (dv > 0) s.donated[dkeys[di]] = dv; else delete s.donated[dkeys[di]];
    }
    dkeys = Object.keys(s.donated);
    for (var dj = 0; dj < dkeys.length - DONATED_KEEP; dj++) delete s.donated[dkeys[dj]];
    if (!Array.isArray(s.notes)) s.notes = [];
    if (!s.war || typeof s.war === "string") s.war = f.war;
    if (!s.war.attacks || typeof s.war.attacks !== "object") s.war.attacks = {};
    if (!s.war.byDay || typeof s.war.byDay !== "object") s.war.byDay = {};
    if (!Array.isArray(s.war.log)) s.war.log = [];
    s.war.points = Math.max(0, s.war.points | 0);
    if (!s.stats || typeof s.stats !== "object") s.stats = f.stats;

    /* ---- Lazy Rollover ---- */
    var wk = weekKeyOf(now);
    if (s.joined) {
      if (s.quests.week !== wk) s.quests = freshQuests(wk);
      if (s.war.week !== wk) {
        // Der Krieg der ALTEN Woche wird ausgewertet, bevor er wegfällt.
        if (s.war.week && !s.war.resolved) applyWarResult(s, s.war.week, now);
        s.war = freshWar(wk);
      }
    }
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function note(s, kind, text, ts) {
    s.notes.unshift({ ts: ts || nowMs(), kind: kind, text: text });
    s.notes = s.notes.slice(0, NOTES_MAX);
  }

  /* ================= Brücke zur Kartenbank (arena_cards.js) =================
   * Bewusst defensiv: fehlt ArenaCards (Standalone-Test, Teil-Einbau),
   * liefern die Leser 0 und die Schreiber werfen eine klare Meldung —
   * statt an einer undefined-Property zu sterben. */

  function bank() {
    var h = hostObj();
    return (h && h.ArenaCards) || null;
  }
  function bankOrThrow() {
    var b = bank();
    if (!b) throw new Error("Kartenbank nicht verfügbar — arena_cards.js fehlt.");
    return b;
  }
  // Bestand grauer Basis-Kopien einer Karte.
  function commonCopies(cardId) {
    var b = bank();
    if (!b) return 0;
    var c = b.get().cards[cardId];
    return (c && c.copies) ? Math.max(0, c.copies.common | 0) : 0;
  }
  /* Kopien beim Spender ABZIEHEN. arena_cards.js hat (noch) keine
   * Entnahme-API — addDrop() klemmt negative Mengen ab. Deshalb der
   * Weg über get() → mutieren → _write(). Siehe DESIGN_CLAN.md §10.2. */
  function bankTake(cardId, n) {
    var b = bankOrThrow();
    var st = b.get(), c = st.cards[cardId];
    var have = (c && c.copies) ? (c.copies.common | 0) : 0;
    if (have < n) {
      throw new Error("Du hast nur " + have + " graue " + cardLabel(cardId) + "-Kopien.");
    }
    c.copies.common = have - n;
    b._write(st);
    return c.copies.common;
  }
  function bankGive(cardId, n) {
    var b = bank();
    if (b && n > 0) b.addDrop(cardId, "common", n);
  }
  // Material in der SORTE der gespendeten Karte (fire/earth → attack …).
  function bankMaterial(cardId, n) {
    var b = bank();
    if (!b || n <= 0) return null;
    var type = b.materialTypeOf ? b.materialTypeOf(cardId) : null;
    b.addMaterial(n, type);
    return type;
  }
  function cardLabel(id) { return CARD_NAME[id] || String(id).toUpperCase(); }

  // Trophäen aus ArenaProfile (defensiv wie in arena_fortress.js).
  function profile() {
    try {
      var h = hostObj(), p = h && h.ArenaProfile;
      if (p && typeof p.get === "function") return p.get() || {};
    } catch (e) {}
    return {};
  }
  function trophiesNow(override) {
    if (typeof override === "number" && isFinite(override)) return Math.max(0, Math.floor(override));
    var t = profile().trophies;
    return (typeof t === "number" && isFinite(t)) ? Math.max(0, Math.floor(t)) : 0;
  }
  // PEAK-Trophäen — die Schwelle für den Clan-Beitritt (DESIGN_CLAN.md §2.3).
  function peakTrophies(override) {
    if (typeof override === "number" && isFinite(override)) return Math.max(0, Math.floor(override));
    var p = profile();
    var b = Math.max(p.best | 0, p.trophies | 0);
    return Math.max(0, b);
  }

  /* ==================================================================
   * ClanSim — DIE BOT-SCHICHT
   * ------------------------------------------------------------------
   * Persistiert NICHTS. Jede Funktion ist rein aus (clan.seed, weekKey,
   * now) berechnet. Ein Server ersetzt genau diese acht Funktionen 1:1
   * (Tabelle in DESIGN_CLAN.md §7) — die öffentliche API dieses Moduls
   * bleibt dabei unverändert.
   * ================================================================== */
  var Sim = {};

  /* Eindeutige Namen aus FIRST × EPITHET, kollisionsfrei per Fortzählen. */
  Sim.names = function (seed, prefix, count) {
    var out = [], used = {};
    for (var i = 0; i < count; i++) {
      var fi = hash(seed, prefix, "f", i) % FIRST.length;
      var ei = hash(seed, prefix, "e", i) % EPITHET.length;
      var guard = 0, nm;
      do {
        nm = FIRST[fi] + " " + EPITHET[ei];
        if (!used[nm]) break;
        ei = (ei + 1) % EPITHET.length;
        if (++guard % EPITHET.length === 0) fi = (fi + 1) % FIRST.length;
      } while (guard < FIRST.length * EPITHET.length);
      used[nm] = 1;
      out.push(nm);
    }
    return out;
  };

  /* Sim.members(clan, now) → 29 Bot-Mitglieder.
   * Trophäen streuen um clan.anchor (0.45× … 1.55×) — der Anker liegt im
   * State und ist damit stabil, auch wenn der Spieler auf- oder absteigt.
   * Rollen: 1 Anführer ist der Spieler; MAX_ELDERS-1 Bots sind Älteste. */
  Sim.members = function (clan, now) {
    now = nowMs(now);
    var seed = clan.seed, names = Sim.names(seed, "member", BOT_COUNT);
    var wk = weekKeyOf(now), frac = collectFrac(now);
    var elderCut = MAX_ELDERS - 1;
    // Älteste deterministisch, aber nicht einfach "die ersten N".
    var order = [];
    for (var i = 0; i < BOT_COUNT; i++) order.push(i);
    order.sort(function (a, b) { return h01(seed, "elder", a) - h01(seed, "elder", b); });
    var isElder = {};
    for (var e = 0; e < elderCut; e++) isElder[order[e]] = true;

    var dayBucket = Math.floor(now / (6 * HOUR));   // Aktivität wandert alle 6 h
    var out = [];
    for (var k = 0; k < BOT_COUNT; k++) {
      var id = "b" + k;
      var tro = Math.max(60, Math.round(clan.anchor * (0.45 + 1.1 * h01(seed, "tro", k))));
      var idle = Math.round(h01(seed, "act", k, dayBucket) * 4.2 * DAY);
      out.push({
        id: id, name: names[k], bot: true,
        role: isElder[k] ? "elder" : "member",
        roleName: ROLES[isElder[k] ? "elder" : "member"].name,
        trophies: tro,
        el: ELEMENTS[hash(seed, "el", k) % ELEMENTS.length],
        lastActive: now - idle, idleMs: idle,
        inactive: idle > INACTIVE_MS,
        donated: Math.round(h01(seed, "don", k, wk) * 34 * frac),
        warPoints: 0,                              // füllt warBoard()
        joinedTs: now - Math.round((30 + h01(seed, "join", k) * 300) * DAY),
      });
    }
    return out;
  };

  /* Sim.questContribution(clan, questKey, now) → Bot-Summe.
   * rate ist pro (Woche, Quest, Bot) fix → der Balken wächst monoton
   * und springt niemals zurück. Formel DESIGN_CLAN.md §3.5. */
  Sim.questContribution = function (clan, questKey, now) {
    var q = QUEST_BY_KEY[questKey];
    if (!q) return 0;
    var wk = weekKeyOf(nowMs(now)), frac = collectFrac(now), seed = clan.seed;
    var sum = 0;
    for (var k = 0; k < BOT_COUNT; k++) {
      var rate = QUEST_RATE_MIN + QUEST_RATE_SPAN * h01(seed, "q", wk, questKey, k);
      sum += Math.round(q.base * rate * frac);
    }
    return sum;
  };

  /* Sim.requests(clan, now) → 3 offene Bot-Anfragen, die alle 6 h
   * rotieren. Der Fortschritt `got` wächst innerhalb des Buckets; die
   * eigenen Spenden liegen als Overlay im State (s.donated). */
  var SIM_REQ_COUNT = 3, SIM_REQ_BUCKET = 6 * HOUR;
  Sim.requests = function (clan, now) {
    now = nowMs(now);
    var ws = weekStart(now), wk = weekKeyOf(now), seed = clan.seed;
    var bucket = Math.floor((now - ws) / SIM_REQ_BUCKET);
    var bStart = ws + bucket * SIM_REQ_BUCKET;
    var frac = clamp((now - bStart) / SIM_REQ_BUCKET, 0, 1);
    var members = Sim.members(clan, now);
    var out = [];
    for (var i = 0; i < SIM_REQ_COUNT; i++) {
      var mi = hash(seed, "req", wk, bucket, i) % BOT_COUNT;
      var m = members[mi];
      var cardId = TOWER_IDS[hash(seed, "reqc", wk, bucket, i) % TOWER_IDS.length];
      var rate = 0.3 + 0.6 * h01(seed, "reqr", wk, bucket, i);
      out.push({
        id: "r:" + wk + ":" + bucket + ":" + i,
        ownerId: m.id, ownerName: m.name, mine: false,
        cardId: cardId, cardName: cardLabel(cardId),
        need: REQUEST_SIZE,
        simGot: Math.min(REQUEST_SIZE - 1, Math.floor(REQUEST_SIZE * rate * frac)),
        ts: bStart + Math.round(h01(seed, "reqt", wk, bucket, i) * SIM_REQ_BUCKET * 0.3),
      });
    }
    return out;
  };

  /* Sim.enemyClan(clan, weekKey) → Geister-Gegnerclan.
   * Stärke ≈ eigener Trophäen-Schnitt ± 8 % → kein Sandbagging, kein
   * hoffnungsloses Matchup. */
  Sim.enemyClan = function (clan, wk) {
    var seed = hash(clan.seed, "enemy", wk);
    var name = hpick(CLAN_ADJ, seed, "adj") + " " + hpick(CLAN_NOUN, seed, "noun");
    return {
      id: "ghost_" + (seed % 100000),
      name: name,
      badge: { color: hpick(BADGE_COLORS, seed, "col").key,
               sym: hpick(BADGE_SYMBOLS, seed, "sym").key },
      anchor: Math.round(clan.anchor * (0.92 + 0.16 * h01(seed, "pow"))),
      seed: seed, ghost: true,
    };
  };

  /* Sim.ghostBuilds(enemy, now) → 30 Ghost-Loadouts im Format von
   * arena_rivals.js. Ein Ghost ist eine Momentaufnahme, kein Live-Gegner
   * — deshalb muss niemand gleichzeitig online sein. */
  Sim.ghostBuilds = function (enemy) {
    var names = Sim.names(enemy.seed, "ghost", MAX_MEMBERS);
    var out = [];
    for (var k = 0; k < MAX_MEMBERS; k++) {
      var el = ELEMENTS[hash(enemy.seed, "gel", k) % ELEMENTS.length];
      var tro = Math.max(60, Math.round(enemy.anchor * (0.45 + 1.1 * h01(enemy.seed, "gtro", k))));
      var deck = [el, el];
      for (var d = 0; d < 4; d++) deck.push(ELEMENTS[hash(enemy.seed, "gd", k, d) % ELEMENTS.length]);
      out.push({
        id: "g" + k, name: names[k],
        title: EL_NAME[el] + "-Ghost",
        el: el, elName: EL_NAME[el],
        hero: h01(enemy.seed, "gh", k) < 0.5 ? "magmor" : "solara",
        deck: deck,
        aggro: Math.round(h01(enemy.seed, "ga", k) * 100) / 100,
        trophies: tro,
        // 1..3 = grobe Schwierigkeit; das UI färbt danach ein.
        tier: tro < enemy.anchor * 0.8 ? 1 : (tro < enemy.anchor * 1.2 ? 2 : 3),
        ghost: true,
      });
    }
    return out.sort(function (a, b) { return b.trophies - a.trophies; });
  };

  /* Sim.warTotals(clan, weekKey, frac) → {enemy, ourBots, gap}
   * Kern des Designs (DESIGN_CLAN.md §5.4): Ohne den Spieler verliert
   * der eigene Clan um `gap` (250…449). Der Spieler hat 6 Angriffe à
   * 20…160 Punkte in der Hand — er entscheidet, immer. */
  Sim.warTotals = function (clan, wk, frac) {
    var seed = hash(clan.seed, "war", wk);
    var end = WAR_ENEMY_MIN + (seed % WAR_ENEMY_SPAN);
    var gap = WAR_GAP_MIN + (hash(seed, "gap") % WAR_GAP_SPAN);
    var ease = Math.pow(clamp(frac, 0, 1), 0.85);
    return {
      enemy: Math.floor(end * ease),
      ourBots: Math.floor(Math.max(0, end - gap) * ease),
      enemyEnd: end, gap: gap,
    };
  };

  /* Sim.feed(clan, now) → deterministische Bot-Ereignisse der letzten
   * 24 h (Beitritte, Spenden, Siege, Emotes). Zeit-Buckets à 90 min. */
  var FEED_BUCKET = 90 * MINUTE, FEED_BUCKETS = 16;
  Sim.feed = function (clan, now) {
    now = nowMs(now);
    var members = Sim.members(clan, now), out = [];
    for (var i = 0; i < FEED_BUCKETS; i++) {
      var b = Math.floor(now / FEED_BUCKET) - i;
      if (h01(clan.seed, "feed", b) < 0.45) continue;      // nicht jeder Bucket trägt
      var m = members[hash(clan.seed, "fm", b) % BOT_COUNT];
      var kind = ["donate", "win", "emote", "join"][hash(clan.seed, "fk", b) % 4];
      var ts = b * FEED_BUCKET + Math.round(h01(clan.seed, "ft", b) * FEED_BUCKET);
      if (ts > now) ts = now - 1000;
      var text;
      if (kind === "donate") {
        var cid = TOWER_IDS[hash(clan.seed, "fc", b) % TOWER_IDS.length];
        text = m.name + " hat " + (1 + hash(clan.seed, "fn", b) % 6) + " × " +
               cardLabel(cid) + " gespendet.";
      } else if (kind === "win") {
        text = m.name + " hat " + (1 + hash(clan.seed, "fw", b) % 4) + " Matches gewonnen.";
      } else if (kind === "emote") {
        var em = EMOTES[hash(clan.seed, "fe", b) % EMOTES.length];
        text = m.name + ": " + em.emoji + " " + em.text;
      } else {
        text = m.name + " ist dem Clan beigetreten.";
      }
      out.push({ ts: ts, kind: kind, text: text, bot: true });
    }
    return out;
  };

  /* Sim.population(clan, now) → LB_POPULATION Leaderboard-Zeilen.
   * Die 12 benannten Rivalen aus arena_rivals.js werden ÜBERNOMMEN
   * (Name, Titel, Element) und an ihrer BANDPOSITION einsortiert —
   * keine Doppelpflege. 12 Einträge sind aber kein Top-100-Board, also
   * füllt ein Generator im gleichen Namensstil auf 300 auf.
   * Kurve: t(r) = 150 + 9650 · (1 − (r−1)/299)^3.2   (DESIGN_CLAN.md §6.1) */
  Sim.rivalRoster = function () {
    try {
      var h = hostObj(), r = h && h.ArenaRivals;
      if (r && Array.isArray(r.roster)) return r.roster;
    } catch (e) {}
    return [];
  };
  function lbTrophyAt(rank) {
    var x = 1 - (rank - 1) / (LB_POPULATION - 1);
    return Math.round(LB_BOTTOM + (LB_TOP - LB_BOTTOM) * Math.pow(clamp(x, 0, 1), LB_EXP));
  }
  // Trophäen-Band eines Rivalen (arena_rivals.bandOf: <250 / <700 / 700+).
  function rivalBandTrophies(idx, seed) {
    var lo, hi;
    if (idx < 4) { lo = 80; hi = 245; }
    else if (idx < 8) { lo = 260; hi = 690; }
    else { lo = 760; hi = 1500; }
    return Math.round(lo + (hi - lo) * h01(seed, "rival", idx));
  }
  Sim.population = function (clan, now) {
    var seed = clan ? clan.seed : 1;
    var rows = [], usedNames = {};
    var roster = Sim.rivalRoster();
    roster.forEach(function (r, i) {
      rows.push({ id: "rival_" + r.id, name: r.name, title: r.title || "",
                  trophies: rivalBandTrophies(i, seed), el: r.el, rival: true,
                  badge: { color: BADGE_COLORS[hash(seed, "rc", r.id) % BADGE_COLORS.length].key,
                           sym: BADGE_SYMBOLS[hash(seed, "rs", r.id) % BADGE_SYMBOLS.length].key } });
      usedNames[r.name] = 1;
    });
    var fill = LB_POPULATION - rows.length;
    var names = Sim.names(seed, "lb", fill + 20);
    var ni = 0;
    for (var r2 = 1; r2 <= fill; r2++) {
      var nm;
      do { nm = names[ni++] || ("Wanderer " + r2); } while (usedNames[nm] && ni < names.length);
      usedNames[nm] = 1;
      // Jitter, damit die Kurve nicht wie ein Lineal aussieht.
      var t = Math.round(lbTrophyAt(r2) * (0.97 + 0.06 * h01(seed, "lbj", r2)));
      rows.push({ id: "lb" + r2, name: nm, title: "", trophies: Math.max(60, t),
                  el: ELEMENTS[hash(seed, "lbe", r2) % ELEMENTS.length],
                  badge: { color: BADGE_COLORS[hash(seed, "lbc", r2) % BADGE_COLORS.length].key,
                           sym: BADGE_SYMBOLS[hash(seed, "lbs", r2) % BADGE_SYMBOLS.length].key } });
    }
    return rows;
  };

  /* ==================================================================
   * Öffentliche API — Clan-Grundgerüst
   * ================================================================== */

  function DEFAULT_CLAN_NAME() { return "Prisma-Orden"; }

  /* createClan(opts) → info()
   * opts: {name, color, sym, desc, joinMode, minTrophies}
   * Wirft bei ungültigem Namen oder unbekanntem Preset. */
  function createClan(opts, now) {
    opts = opts || {};
    now = nowMs(now);
    var name = String(opts.name == null ? DEFAULT_CLAN_NAME() : opts.name).trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      throw new Error("Clan-Name muss " + NAME_MIN + "–" + NAME_MAX + " Zeichen haben.");
    }
    var color = opts.color || BADGE_COLORS[0].key, sym = opts.sym || BADGE_SYMBOLS[0].key;
    if (!COLOR_BY_KEY[color]) throw new Error("Unbekannte Banner-Farbe: " + color);
    if (!SYM_BY_KEY[sym]) throw new Error("Unbekanntes Banner-Symbol: " + sym);
    var s = get(now);
    s.clan = normClan({
      id: "clan_" + (hash(name, now) % 1000000),
      name: name, badge: { color: color, sym: sym },
      desc: opts.desc || "", joinMode: opts.joinMode,
      minTrophies: opts.minTrophies | 0,
      created: now, seed: hash(name, "seed", opts.seed == null ? now : opts.seed) % 1000000,
      anchor: Math.max(300, peakTrophies(opts.trophies)),
      warWins: 0, warStreak: 0, bestStreak: 0,
    });
    s.joined = true;
    s.me.role = opts.role && ROLES[opts.role] ? opts.role : "leader";
    s.me.joinedTs = now;
    s.me.lastActive = now;
    s.quests = freshQuests(weekKeyOf(now));
    s.war = freshWar(weekKeyOf(now));
    note(s, "clan", "Clan „" + name + "“ gegründet.", now);
    save(s);
    return info(now);
  }
  /* joinClan(opts) — Stufe 1 ohne Server: legt denselben Clan an, aber
   * mit der Rolle "member". Der echte Beitritts-Workflow (Bewerbung,
   * Annehmen) braucht Stufe 2 (DESIGN_CLAN.md §10.3). */
  function joinClan(opts, now) {
    opts = opts || {};
    if (opts.role === undefined) opts.role = "member";
    return createClan(opts, now);
  }
  function leaveClan(now) {
    var s = get(now);
    var was = s.clan ? s.clan.name : null;
    var f = fresh();
    f.notes = s.notes;
    note(f, "clan", was ? "Clan „" + was + "“ verlassen." : "Clan verlassen.", nowMs(now));
    save(f);
    return { left: !!was, name: was };
  }
  /* seedDemoClan() — NUR für den Prototyp: legt einen plausiblen Clan
   * mit Historie an, damit die Views ohne Beitritts-Flow etwas zeigen. */
  function seedDemoClan(now) {
    now = nowMs(now);
    var r = createClan({ name: DEFAULT_CLAN_NAME(), color: "violet", sym: "prism",
      desc: "Wir spielen jeden Tag, spenden fleißig und greifen am Wochenende alle an. Grau rein, Fusionen selbst!",
      joinMode: "request", minTrophies: 800, seed: 4242, trophies: 1136 }, now);
    var s = get(now);
    s.clan.warWins = 4; s.clan.warStreak = 2; s.clan.bestStreak = 3;
    s.clan = normClan(s.clan);
    save(s);
    return r;
  }

  /* info(now) → Kopfdaten für den Clan-Header. */
  function info(now) {
    now = nowMs(now);
    var s = get(now);
    if (!s.joined) return { joined: false, phase: warPhase(now) };
    var c = s.clan, ms = members(now);
    var sum = 0;
    ms.forEach(function (m) { sum += m.trophies; });
    var col = COLOR_BY_KEY[c.badge.color], sy = SYM_BY_KEY[c.badge.sym];
    var badgeStep = null;
    WAR_BADGE_STEPS.forEach(function (b) { if (b.key === c.warBadge) badgeStep = b; });
    return {
      joined: true, id: c.id, name: c.name, desc: c.desc,
      joinMode: c.joinMode,
      joinModeName: c.joinMode === "open" ? "Offen" : "Auf Anfrage",
      minTrophies: c.minTrophies,
      badge: { color: c.badge.color, sym: c.badge.sym,
               c1: col.c1, c2: col.c2, symChar: sy.sym, colorName: col.name, symName: sy.name },
      warBadge: c.warBadge, warBadgeName: badgeStep ? badgeStep.name : "kein Rahmen",
      warBadgeSym: badgeStep ? badgeStep.sym : "", warBadgeColor: badgeStep ? badgeStep.color : null,
      warWins: c.warWins, warStreak: c.warStreak, bestStreak: c.bestStreak,
      nextBadge: nextBadgeStep(c.bestStreak),
      members: ms.length, maxMembers: MAX_MEMBERS,
      avgTrophies: Math.round(sum / ms.length),
      myRole: s.me.role, myRoleName: ROLES[s.me.role].name,
      created: c.created, phase: warPhase(now),
    };
  }
  function nextBadgeStep(streak) {
    for (var i = 0; i < WAR_BADGE_STEPS.length; i++) {
      if (streak < WAR_BADGE_STEPS[i].at) {
        return { key: WAR_BADGE_STEPS[i].key, name: WAR_BADGE_STEPS[i].name,
                 sym: WAR_BADGE_STEPS[i].sym, at: WAR_BADGE_STEPS[i].at,
                 missing: WAR_BADGE_STEPS[i].at - streak };
      }
    }
    return null;
  }

  /* members(now) → 30 Einträge (Spieler + 29 Bots), sortiert nach
   * Rolle, dann Trophäen. */
  function members(now) {
    now = nowMs(now);
    var s = get(now);
    if (!s.joined) return [];
    var q = s.quests.progress;
    var out = Sim.members(s.clan, now);
    out.unshift({
      id: "me", name: s.me.name || "Du", bot: false, me: true,
      role: s.me.role, roleName: ROLES[s.me.role].name,
      trophies: trophiesNow(), el: null,
      lastActive: now, idleMs: 0, inactive: false,
      donated: s.stats.donatedTotal | 0,
      warPoints: s.war.points | 0,
      joinedTs: s.me.joinedTs,
      mine: { wins: q.wins, packs: q.packs, trophies: q.trophies },
    });
    return out.sort(function (a, b) {
      var ra = ROLES[a.role].rank, rb = ROLES[b.role].rank;
      if (ra !== rb) return rb - ra;
      return b.trophies - a.trophies;
    });
  }

  /* ==================================================================
   * Clan-Quests
   * ================================================================== */

  /* reportEvent(type, amount) — DIE Schnittstelle vom Spiel in die
   * Quests. Absichtlich dumm (Typ + Menge), damit ein Server sie 1:1
   * validieren kann. Zählt NUR in der Sammelphase Mo–Fr; am Wochenende
   * gehört die Aufmerksamkeit dem Krieg (DESIGN_CLAN.md §3.4).
   * → {counted, key, value, total} oder {counted:false, reason} */
  function reportEvent(type, amount, now) {
    now = nowMs(now);
    var ev = EVENT_ALIAS[String(type || "").toLowerCase()];
    if (!ev) return { counted: false, reason: "unknown" };
    var n = Math.floor(Number(amount == null ? 1 : amount) || 0);
    if (n <= 0) return { counted: false, reason: "amount" };
    var s = get(now);
    if (!s.joined) return { counted: false, reason: "noclan" };
    var ph = warPhase(now);
    if (ph.phase !== "collect") return { counted: false, reason: "warphase", phase: ph.phase };
    var q = QUEST_BY_EVENT[ev];
    s.quests.progress[q.key] += n;
    save(s);
    return { counted: true, key: q.key, value: n, total: s.quests.progress[q.key] };
  }

  /* quests(now) → 3 Quests mit Koop-Fortschritt. */
  function quests(now) {
    now = nowMs(now);
    var s = get(now);
    if (!s.joined) return [];
    return QUEST_DEFS.map(function (q) {
      var mine = s.quests.progress[q.key] | 0;
      var bots = Sim.questContribution(s.clan, q.key, now);
      var total = mine + bots;
      return {
        key: q.key, title: q.title, desc: q.desc, sym: q.sym, goal: q.goal,
        mine: mine, bots: bots, total: total,
        pct: Math.min(1, total / q.goal),
        pctText: Math.round(Math.min(1, total / q.goal) * 100) + " %",
        done: total >= q.goal,
        missing: Math.max(0, q.goal - total),
      };
    });
  }

  /* chestTier(now) → {pct, tier, step, next, claimable, claimed}
   * Gesamtfortschritt = Mittel der drei bei 100 % GEKAPPTEN Füllgrade —
   * ein übererfüllter Quest kompensiert keinen vernachlässigten. */
  function chestTier(now) {
    now = nowMs(now);
    var s = get(now), qs = quests(now);
    if (!qs.length) return { pct: 0, tier: null, step: null, next: CHEST_STEPS[0], claimable: false, claimed: false };
    var sum = 0;
    qs.forEach(function (q) { sum += q.pct; });
    var pct = sum / qs.length;
    var step = null, next = null;
    for (var i = 0; i < CHEST_STEPS.length; i++) {
      if (pct >= CHEST_STEPS[i].at - 1e-9) step = CHEST_STEPS[i];
      else if (!next) next = CHEST_STEPS[i];
    }
    var ph = warPhase(now);
    return {
      pct: pct, pctText: Math.round(pct * 100) + " %",
      tier: step ? step.tier : null, step: step, next: next,
      steps: CHEST_STEPS,
      claimed: !!s.quests.claimed,
      // Ab Samstag 00:00 UTC ist die Sammelphase vorbei → abholbar.
      claimable: ph.phase === "war" && !!step && !s.quests.claimed,
      opensIn: ph.phase === "collect" ? ph.msLeft : 0,
    };
  }

  /* claimWeekChest(now) → Belohnung. Material + Packs werden gebucht
   * bzw. gemeldet, GOLD wird nur gemeldet (Hub-Wallet). */
  function claimWeekChest(now) {
    now = nowMs(now);
    var c = chestTier(now);
    if (!c.claimable) {
      throw new Error(c.claimed ? "Der Clan-Hort dieser Woche ist schon abgeholt."
        : !c.step ? "Der Clan hat noch keine Hort-Stufe erreicht (mindestens 50 %)."
        : "Der Clan-Hort öffnet erst am Samstag.");
    }
    var s = get(now), st = c.step;
    s.quests.claimed = true;
    bankMaterial(TOWER_IDS[0], st.material);
    note(s, "chest", st.sym + " " + st.name + " abgeholt: " + st.pack.toUpperCase() +
      "-Pack, " + st.gold + " Gold, " + st.material + " Material.", now);
    save(s);
    return { tier: st.tier, name: st.name, sym: st.sym, pack: st.pack,
             gold: st.gold, material: st.material, pct: c.pct };
  }

  /* ==================================================================
   * Sendemechanik — Karten-Spenden
   * DIE HARTE VALIDIERUNG (DESIGN_CLAN.md §0)
   * ================================================================== */

  function isTower(cardId) { return TOWER_IDS.indexOf(String(cardId)) >= 0; }
  // Erweiterbarkeit: neue Turmkarten werden hier angemeldet, nicht im Code verstreut.
  function registerTower(cardId) {
    cardId = String(cardId || "");
    if (cardId && TOWER_IDS.indexOf(cardId) < 0) TOWER_IDS.push(cardId);
    return TOWER_IDS.slice();
  }

  /* assertSendable(cardId, tierKey) — der EINE kanonische Validator.
   * Wird von requestCards() und donateCards() benutzt und ist auch
   * direkt aufrufbar (das UI graut damit Karten aus, statt Fehler zu
   * provozieren). Wirft mit deutscher Klartextmeldung. */
  function assertSendable(cardId, tierKey) {
    var id = String(cardId || "");
    if (!id) throw new Error("Keine Karte gewählt.");
    if (!isTower(id)) {
      throw new Error("Nur Turmkarten dürfen gespendet werden — " + cardLabel(id) +
        " ist keine.");
    }
    if (tierKey !== undefined && tierKey !== null && tierKey !== "common" && tierKey !== 0) {
      var lbl = TIER_LABEL[tierKey] || ('Stufe "' + tierKey + '"');
      throw new Error("Nur graue Basis-Kopien dürfen gespendet werden — " + lbl +
        " ist gesperrt. Fusionen macht jeder selbst.");
    }
    return true;
  }
  // Nicht-werfende Variante für Filter/Anzeige.
  function canSend(cardId, tierKey) {
    try { assertSendable(cardId, tierKey); return true; } catch (e) { return false; }
  }

  /* sendQuota(anfrageId [, now]) → {requestId, used, max, left, perTap, full}
   * ------------------------------------------------------------------
   * SEIT 30.07.2026 IST DAS KONTINGENT ANFRAGEBEZOGEN, NICHT ZEITBEZOGEN.
   * Es beantwortet genau eine Frage: „wie viele Karten habe ICH zu DIESER
   * Anfrage schon beigesteuert, und wie viele darf ich noch?" Es gibt
   * keinen Reset und keine Restzeit mehr — die alten Felder resetAt/
   * resetIn/resetText/windowMs sind deshalb WEG statt auf 0 gesetzt: ein
   * Feld, das immer 0 sagt, liest sich wie „gleich frei" und lügt.
   *
   * DIE SIGNATUR HAT SICH GEDREHT (Anfrage-ID zuerst, `now` wie überall
   * sonst im Modul zuletzt). Ein Altaufruf sendQuota(now) übergäbe eine
   * ZAHL — das fangen wir ab und werfen, statt eine plausible falsche
   * Zahl zurückzugeben. Eine stille 0/10 wäre der schlimmste Ausgang:
   * das UI hätte weiter etwas gezeichnet und niemand hätte es gemerkt. */
  function sendQuota(requestId, now) {
    if (typeof requestId !== "string" || !requestId) {
      throw new Error("sendQuota() braucht seit 30.07.2026 die Anfrage-ID: " +
        "sendQuota(anfrageId, now). Das Sendekontingent gilt JE ANFRAGE " +
        "(höchstens " + DONATE_MAX_PER_REQUEST + " Karten von dir), nicht mehr " +
        "global pro Zeitfenster.");
    }
    now = nowMs(now);
    var s = get(now);
    var used = Math.max(0, Math.min(DONATE_MAX_PER_REQUEST, s.donated[requestId] | 0));
    var left = Math.max(0, DONATE_MAX_PER_REQUEST - used);
    return {
      requestId: requestId,
      used: used, max: DONATE_MAX_PER_REQUEST, left: left,
      perTap: DONATE_PER_TAP,
      full: left <= 0,
    };
  }
  function hhmm(ms) {
    if (!ms || ms <= 0) return "0:00";
    var m = Math.ceil(ms / MINUTE), h = Math.floor(m / 60);
    m = m % 60;
    return h + ":" + (m < 10 ? "0" : "") + m;
  }

  /* requestCards(cardId) → Anfrage über REQUEST_SIZE (30) Karten.
   * Max 1 aktive, Abklingzeit REQUEST_COOLDOWN_MS (5 h). */
  function requestCards(cardId, now) {
    now = nowMs(now);
    assertSendable(cardId, "common");
    var s = get(now);
    if (!s.joined) throw new Error("Du bist in keinem Clan.");
    var open = myRequestRaw(s);
    if (open) {
      throw new Error("Du hast schon eine offene Anfrage (" + cardLabel(open.cardId) +
        ", " + open.got + "/" + open.need + ").");
    }
    var since = now - ts0(s.me.lastRequestTs);
    if (s.me.lastRequestTs && since < REQUEST_COOLDOWN_MS) {
      throw new Error("Neue Anfrage erst in " + hhmm(REQUEST_COOLDOWN_MS - since) +
        " möglich (eine alle " + Math.round(REQUEST_COOLDOWN_MS / HOUR) + " Stunden).");
    }
    var req = {
      id: "me:" + now, ownerId: "me", cardId: String(cardId),
      need: REQUEST_SIZE, got: 0, credited: 0, ts: now, closed: false, donors: {},
    };
    s.requests = [req];
    s.me.lastRequestTs = now;
    note(s, "request", "Anfrage gestellt: " + REQUEST_SIZE + " × " + cardLabel(cardId) + ".", now);
    save(s);
    return viewRequest(req, s, now);
  }
  // OFFENE eigene Anfrage (Gating: max 1 aktiv, Nachfüllen durch Bots).
  function myRequestRaw(s) {
    for (var i = 0; i < s.requests.length; i++) {
      if (s.requests[i] && !s.requests[i].closed) return s.requests[i];
    }
    return null;
  }
  /* Die eigene Anfrage für die ANZEIGE — auch wenn sie erfüllt ist.
   * Sonst verschwindet sie im Moment des Erfolgs aus der Liste, und der
   * Spieler sieht nie, dass es geklappt hat. */
  function myRequestAny(s) {
    var last = null;
    for (var i = 0; i < s.requests.length; i++) if (s.requests[i]) last = s.requests[i];
    return myRequestRaw(s) || last;
  }
  function cancelRequest(now) {
    now = nowMs(now);
    var s = get(now), r = myRequestRaw(s);
    if (!r) throw new Error("Du hast keine offene Anfrage.");
    r.closed = true;
    save(s);
    return { cancelled: true, cardId: r.cardId };
  }

  /* Die eigene Anfrage wird über die Zeit von den Bots befüllt. Die
   * Karten werden dabei LAZY BEIM LESEN gutgeschrieben — dasselbe
   * Muster wie der Wochen-Rollover, kein Timer nötig. */
  function syncMyRequest(s, now) {
    var r = myRequestRaw(s);
    if (!r) return null;
    var rate = 0.6 + 0.8 * h01(s.clan ? s.clan.seed : 0, "fill", r.ts);
    var got = Math.min(r.need, Math.floor(r.need * ((now - r.ts) / (4 * HOUR)) * rate));
    if (got > r.got) r.got = got;
    if (r.got > r.credited) {
      var delta = r.got - r.credited;
      bankGive(r.cardId, delta);
      r.credited = r.got;
      s.stats.receivedTotal = (s.stats.receivedTotal | 0) + delta;
      if (r.got >= r.need) {
        r.closed = true;
        note(s, "filled", "Deine Anfrage ist erfüllt: " + r.need + " × " +
          cardLabel(r.cardId) + " angekommen.", now);
      }
    }
    return r;
  }

  /* requests(now) → alle sichtbaren Anfragen (eigene zuerst).
   * Bot-Anfragen bekommen die eigenen Spenden als Overlay aufgerechnet. */
  function requests(now) {
    now = nowMs(now);
    var s = get(now);
    if (!s.joined) return [];
    syncMyRequest(s, now);
    save(s);
    var out = [];
    var mine = myRequestAny(s);
    if (mine) out.push(viewRequest(mine, s, now));
    Sim.requests(s.clan, now).forEach(function (r) {
      var extra = Math.min(DONATE_MAX_PER_REQUEST, s.donated[r.id] | 0);
      var got = Math.min(r.need, r.simGot + extra);
      out.push({
        id: r.id, ownerId: r.ownerId, ownerName: r.ownerName, mine: false,
        cardId: r.cardId, cardName: r.cardName,
        need: r.need, got: got, left: Math.max(0, r.need - got),
        pct: got / r.need, ts: r.ts, ageMs: now - r.ts,
        closed: got >= r.need,
        /* myDonation/myMax/myLeft = das Kontingent JE ANFRAGE, direkt an
           der Anfrage. Das UI zeichnet daraus die zehn Punkte auf der
           Karte und muss dafür nicht je Karte sendQuota() rufen. */
        myDonation: extra, myMax: DONATE_MAX_PER_REQUEST,
        myLeft: Math.max(0, DONATE_MAX_PER_REQUEST - extra),
      });
    });
    return out;
  }
  function viewRequest(r, s, now) {
    return {
      id: r.id, ownerId: "me", ownerName: s.me.name || "Du", mine: true,
      cardId: r.cardId, cardName: cardLabel(r.cardId),
      need: r.need, got: r.got, left: Math.max(0, r.need - r.got),
      pct: r.got / r.need, ts: r.ts, ageMs: now - r.ts,
      // Die eigene Anfrage ist nicht selbst bespendbar → myLeft ist 0,
      // nicht 10. Der Knopf darf daraus gar nicht erst entstehen.
      closed: !!r.closed, myDonation: 0, myMax: DONATE_MAX_PER_REQUEST, myLeft: 0,
    };
  }

  /* donateCards(requestId [, count] [, tierKey] [, now])
   * ------------------------------------------------------------------
   * EIN SENDEVORGANG = GENAU EINE KARTE (Vorgabe 30.07.2026: „Es kann
   * auch nur eine gesendet werden nicht direkt 10"). `count` bleibt in
   * der Signatur, weil zwei Aufrufer es übergeben (ArenaFriends.giftCards,
   * das UI) — es darf aber nur noch DONATE_PER_TAP sein, alles andere
   * wirft. Der Parameter ist damit kein Mengenregler mehr, sondern eine
   * Sicherung: ein Aufrufer, der noch 10 auf einen Griff schicken will,
   * merkt es sofort statt still zehnmal zu buchen.
   * Der Tier-Parameter existiert AUSSCHLIESSLICH, um ihn abzulehnen: Es
   * gibt keinen Aufrufpfad, über den eine höhere Rarität adressierbar
   * wäre. Default ist "common"; alles andere wirft.
   * → {ok, count, cardId, request, quota, reward:{gold, material, materialType}} */
  function donateCards(requestId, count, tierKey, now) {
    now = nowMs(now);
    var s = get(now);
    if (!s.joined) throw new Error("Du bist in keinem Clan.");
    var n = Math.floor(Number(count == null ? DONATE_PER_TAP : count) || 0);
    if (n <= 0) throw new Error("Spende mindestens eine Karte.");
    if (n > DONATE_PER_TAP) {
      throw new Error("Es geht genau " + (DONATE_PER_TAP === 1 ? "eine Karte" :
        DONATE_PER_TAP + " Karten") + " je Sendevorgang — tippe mehrfach, " +
        "wenn du mehr geben willst.");
    }

    // --- Anfrage auflösen ---
    var all = requests(now), req = null;
    for (var i = 0; i < all.length; i++) if (all[i].id === requestId) { req = all[i]; break; }
    if (!req) throw new Error("Anfrage nicht gefunden.");
    if (req.mine) throw new Error("Du kannst deine eigene Anfrage nicht bespenden.");
    if (req.closed || req.left <= 0) throw new Error("Diese Anfrage ist bereits erfüllt.");

    // --- Vorgabe 1 + 3: nur Tower, nur graue Basis-Kopien ---
    assertSendable(req.cardId, tierKey === undefined ? "common" : tierKey);

    /* --- Vorgabe 2: höchstens 10 Karten von EINEM Spieler je Anfrage ---
       Die Meldung sagt ausdrücklich, dass die Anfrage weiterläuft. Sonst
       liest sich die Sperre wie „hier ist nichts mehr zu holen", dabei
       ist das Gegenteil gemeint: der Rest gehört den anderen 29. */
    var q = sendQuota(req.id, now);
    if (q.full) {
      throw new Error("Du hast dieser Anfrage schon " + q.max + " Karten gegeben — mehr " +
        "darf ein einzelner Spieler nicht beisteuern. Den Rest holen die anderen im Clan.");
    }
    if (n > q.left) {
      throw new Error("Du kannst dieser Anfrage nur noch " + q.left + " Karte" +
        (q.left === 1 ? "" : "n") + " geben (höchstens " + q.max + " je Anfrage).");
    }
    if (n > req.left) {
      throw new Error("Die Anfrage braucht nur noch " + req.left + " Karte" +
        (req.left === 1 ? "" : "n") + ".");
    }

    // --- Bestand prüfen und abziehen (wirft mit Bestandsangabe) ---
    bankTake(req.cardId, n);
    // --- Beim Empfänger gutschreiben. In Stufe 1 ist der Empfänger ein
    //     Bot; sein "Konto" ist der Overlay-Zähler. Ein Server bucht hier
    //     auf die echte Kartenbank des Mitglieds. ---
    s.donated[req.id] = (s.donated[req.id] | 0) + n;
    s.stats.donatedTotal = (s.stats.donatedTotal | 0) + n;

    // --- Spender-Belohnung: Material gebucht, Gold nur gemeldet ---
    var gold = DONATE_GOLD * n, mat = DONATE_MATERIAL * n;
    var matType = bankMaterial(req.cardId, mat);

    var got = req.got + n, closed = got >= req.need;
    if (closed) {
      note(s, "help", "Deine Spende hat " + req.ownerName + " geholfen — " + n + " × " +
        cardLabel(req.cardId) + " angekommen.", now);
    } else {
      note(s, "donate", "Du hast " + n + " × " + cardLabel(req.cardId) + " an " +
        req.ownerName + " gespendet.", now);
    }
    save(s);
    /* sendQuota() erst NACH save() — es liest den State frisch. Der
       Aufrufer bekommt damit den Stand, den auch das nächste Rendern
       sieht (Fortschritt 4/30, eigenes Kontingent 1/10). */
    return {
      ok: true, count: n, cardId: req.cardId, cardName: cardLabel(req.cardId),
      request: { id: req.id, ownerName: req.ownerName, got: got, need: req.need,
                 closed: closed, myDonation: s.donated[req.id] | 0 },
      quota: sendQuota(req.id, now),
      reward: { gold: gold, material: mat, materialType: matType },
    };
  }

  /* donatableCards(now) → für die Karten-Wahl im UI: nur Tower, nur
   * graue Kopien, mit Bestand. Grundlage der Ausgrau-Logik. */
  function donatableCards() {
    return TOWER_IDS.map(function (id) {
      var have = commonCopies(id);
      return { cardId: id, cardName: cardLabel(id), copies: have, sendable: have > 0 };
    });
  }

  /* ==================================================================
   * Ghost-Clankrieg
   * ================================================================== */

  /* warBoard(now) → vollständiger Kriegsstand.
   * In der Sammelphase enthält es den Countdown, in der Kriegsphase das
   * Board mit beiden Clans, dem Punktestand und der Ziel-Liste. */
  function warBoard(now) {
    now = nowMs(now);
    var s = get(now);
    var ph = warPhase(now);
    if (!s.joined) return { joined: false, phase: ph };
    var enemy = Sim.enemyClan(s.clan, ph.weekKey);
    var totals = Sim.warTotals(s.clan, ph.weekKey, ph.phase === "war" ? ph.frac : 0);
    var mine = s.war.points | 0;
    var ours = totals.ourBots + mine;
    var builds = Sim.ghostBuilds(enemy);
    var dayKey = String(ph.warDay);
    var usedToday = ph.warDay >= 0 ? (s.war.byDay[dayKey] | 0) : 0;
    var enemyCol = COLOR_BY_KEY[enemy.badge.color], enemySym = SYM_BY_KEY[enemy.badge.sym];
    var myCol = COLOR_BY_KEY[s.clan.badge.color], mySym = SYM_BY_KEY[s.clan.badge.sym];
    var inf = info(now);

    var targets = builds.map(function (g) {
      var pts = s.war.attacks[g.id];
      return {
        id: g.id, name: g.name, title: g.title, el: g.el, elName: g.elName,
        trophies: g.trophies, tier: g.tier,
        attacked: pts !== undefined, points: pts === undefined ? null : pts,
      };
    });
    return {
      joined: true, phase: ph,
      weekKey: ph.weekKey,
      us: { name: s.clan.name, badge: { c1: myCol.c1, c2: myCol.c2, symChar: mySym.sym },
            avgTrophies: inf.avgTrophies,
            points: ours, myPoints: mine, botPoints: totals.ourBots },
      them: { name: enemy.name, badge: { c1: enemyCol.c1, c2: enemyCol.c2, symChar: enemySym.sym },
              avgTrophies: enemy.anchor, points: totals.enemy },
      lead: ours - totals.enemy,
      leading: ours > totals.enemy,
      targets: targets,
      attacksPerDay: WAR_ATTACKS_PER_DAY,
      attacksUsedToday: usedToday,
      attacksLeftToday: ph.warDay >= 0 ? Math.max(0, WAR_ATTACKS_PER_DAY - usedToday) : 0,
      attacksTotalLeft: Math.max(0, WAR_ATTACKS_PER_DAY * 2 - Object.keys(s.war.attacks).length),
      resolved: !!s.war.resolved, won: s.war.won,
      log: s.war.log.slice(0, 12),
      lastWar: s.lastWar,
      countdownText: hhmm(ph.msLeft),
    };
  }

  /* startWarAttack(targetId) → Ghost-Loadout (Format arena_rivals.js).
   * Das echte Match läuft im Spiel; dieses Modul verbucht nur. */
  function startWarAttack(targetId, now) {
    now = nowMs(now);
    var s = get(now), ph = warPhase(now);
    if (!s.joined) throw new Error("Du bist in keinem Clan.");
    if (ph.phase !== "war") {
      throw new Error("Die Kriegsphase startet erst am Samstag (in " + hhmm(ph.msLeft) + ").");
    }
    var enemy = Sim.enemyClan(s.clan, ph.weekKey);
    var builds = Sim.ghostBuilds(enemy), target = null;
    for (var i = 0; i < builds.length; i++) if (builds[i].id === targetId) { target = builds[i]; break; }
    if (!target) throw new Error("Ghost-Gegner nicht gefunden.");
    if (s.war.attacks[targetId] !== undefined) {
      throw new Error(target.name + " wurde diesen Krieg schon angegriffen.");
    }
    var used = s.war.byDay[String(ph.warDay)] | 0;
    if (used >= WAR_ATTACKS_PER_DAY) {
      throw new Error("Keine Angriffe mehr heute (" + WAR_ATTACKS_PER_DAY +
        " pro Kriegstag). Morgen gibt es " + WAR_ATTACKS_PER_DAY + " neue.");
    }
    return {
      targetId: target.id, name: target.name, title: target.title,
      el: target.el, elName: target.elName, hero: target.hero,
      deck: target.deck.slice(), aggro: target.aggro,
      trophies: target.trophies, tier: target.tier,
      clanName: enemy.name, ghost: true,
      attacksLeftToday: WAR_ATTACKS_PER_DAY - used,
    };
  }

  /* resolveWarAttack(targetId, result) — result: {win, stars, hpFrac}
   *   Sieg        = 100 + 15·stars + round(15·hpFrac)   → 100 … 160
   *   Niederlage  =  20 +  5·stars                      →  20 …  35
   * Auch Niederlagen zahlen ein (Frust-Schutz, DESIGN_CLAN.md §5.3). */
  function warPointsFor(result) {
    var r = result || {};
    var stars = clamp(Math.round(Number(r.stars) || 0), 0, 3);
    if (r.win) {
      var hp = clamp(Number(r.hpFrac) || 0, 0, 1);
      return WAR_WIN_BASE + WAR_WIN_STAR * stars + Math.round(WAR_WIN_HP * hp);
    }
    return WAR_LOSS_BASE + WAR_LOSS_STAR * stars;
  }
  function resolveWarAttack(targetId, result, now) {
    now = nowMs(now);
    var lo = startWarAttack(targetId, now);      // prüft Phase, Ziel, Kontingent
    var s = get(now), ph = warPhase(now);
    var pts = warPointsFor(result);
    s.war.attacks[targetId] = pts;
    s.war.byDay[String(ph.warDay)] = (s.war.byDay[String(ph.warDay)] | 0) + 1;
    s.war.points = (s.war.points | 0) + pts;
    s.stats.warPointsTotal = (s.stats.warPointsTotal | 0) + pts;
    s.war.log.unshift({ ts: now, targetId: targetId, name: lo.name,
                        win: !!(result && result.win), points: pts });
    s.war.log = s.war.log.slice(0, 24);
    note(s, "war", (result && result.win ? "Sieg" : "Niederlage") + " gegen " + lo.name +
      " — +" + pts + " Kriegspunkte.", now);
    save(s);
    return {
      ok: true, points: pts, win: !!(result && result.win), target: lo.name,
      myTotal: s.war.points,
      attacksLeftToday: Math.max(0, WAR_ATTACKS_PER_DAY - (s.war.byDay[String(ph.warDay)] | 0)),
    };
  }

  /* applyWarResult(s, weekKey, now) — Auswertung So Nacht.
   * Wird beim Rollover automatisch aufgerufen und ist über
   * resolveWar(now) auch manuell auslösbar (UI-Demo, Tests). */
  function applyWarResult(s, wk, now) {
    if (!s.clan || s.war.resolved) return null;
    var totals = Sim.warTotals(s.clan, wk, 1);
    var ours = totals.ourBots + (s.war.points | 0);
    var won = ours > totals.enemy;
    var chest = won ? WAR_CHEST_WIN : WAR_CHEST_LOSS;

    if (won) {
      s.clan.warWins = (s.clan.warWins | 0) + 1;
      s.clan.warStreak = (s.clan.warStreak | 0) + 1;
      s.clan.bestStreak = Math.max(s.clan.bestStreak | 0, s.clan.warStreak);
    } else {
      s.clan.warStreak = 0;                 // Serie fällt …
    }
    // … der RAHMEN bleibt. Kosmetik wird nie zurückgenommen (§5.5).
    s.clan.warBadge = badgeForStreak(s.clan.bestStreak);
    s.war.resolved = true;
    s.war.won = won;
    bankMaterial(TOWER_IDS[0], chest.material);
    var res = {
      week: wk, won: won, ourTotal: ours, theirTotal: totals.enemy,
      myPoints: s.war.points | 0, botPoints: totals.ourBots, gap: totals.gap,
      chest: { name: chest.name, sym: chest.sym, pack: chest.pack,
               gold: chest.gold, material: chest.material },
      warWins: s.clan.warWins, warStreak: s.clan.warStreak,
      badge: s.clan.warBadge, badgeName: (function () {
        var n = "kein Rahmen";
        WAR_BADGE_STEPS.forEach(function (b) { if (b.key === s.clan.warBadge) n = b.name; });
        return n;
      })(),
    };
    s.lastWar = res;
    note(s, "warend", (won ? "SIEG" : "Niederlage") + " im Clankrieg: " + ours + " : " +
      totals.enemy + " — " + chest.sym + " " + chest.name + ".", now);
    return res;
  }
  function resolveWar(now) {
    now = nowMs(now);
    var s = get(now);
    if (!s.joined) throw new Error("Du bist in keinem Clan.");
    if (s.war.resolved) return s.lastWar;
    var res = applyWarResult(s, s.war.week || weekKeyOf(now), now);
    save(s);
    return res;
  }
  function lastWar(now) { return get(now).lastWar; }

  /* ==================================================================
   * Leaderboard — drei Ansichten über EINER Population
   * ================================================================== */

  /* leaderboard(view, now) → {view, rows, myRank, myIndex, total}
   * view: "global" (Top 100) | "clan" (30) | "around" (±25) */
  function leaderboard(view, now) {
    now = nowMs(now);
    var s = get(now);
    view = view === "clan" ? "clan" : (view === "around" ? "around" : "global");
    var myT = trophiesNow();

    if (view === "clan") {
      if (!s.joined) return { view: view, rows: [], myRank: 0, myIndex: -1, total: 0 };
      var col = COLOR_BY_KEY[s.clan.badge.color], sy = SYM_BY_KEY[s.clan.badge.sym];
      var ms = members(now).slice().sort(function (a, b) { return b.trophies - a.trophies; });
      var rows = ms.map(function (m, i) {
        return { rank: i + 1, id: m.id, name: m.name, trophies: m.trophies,
                 me: !!m.me, role: m.role, roleName: m.roleName,
                 badge: { c1: col.c1, c2: col.c2, symChar: sy.sym }, clanName: s.clan.name };
      });
      var mi = rows.findIndex ? rows.findIndex(function (r) { return r.me; }) : -1;
      if (mi < 0) for (var z = 0; z < rows.length; z++) if (rows[z].me) { mi = z; break; }
      return { view: view, rows: rows, myRank: mi + 1, myIndex: mi, total: rows.length };
    }

    // Eine Population trägt "global" UND "around".
    var pop = Sim.population(s.clan || { seed: 1 }, now).slice();
    var myBadge = s.joined
      ? { c1: COLOR_BY_KEY[s.clan.badge.color].c1, c2: COLOR_BY_KEY[s.clan.badge.color].c2,
          symChar: SYM_BY_KEY[s.clan.badge.sym].sym }
      : { c1: "#4a5f78", c2: "#101820", symChar: "·" };
    pop.push({ id: "me", name: s.me.name || "Du", trophies: myT, me: true,
               badge: myBadge, clanName: s.joined ? s.clan.name : "" });
    pop.sort(function (a, b) {
      if (b.trophies !== a.trophies) return b.trophies - a.trophies;
      return String(a.id).localeCompare(String(b.id));
    });
    var myIdx = 0;
    for (var i = 0; i < pop.length; i++) if (pop[i].me) { myIdx = i; break; }
    // Population liefert Preset-KEYS; das UI braucht fertige Farben.
    var mk = function (e, idx) {
      var raw = e.badge || {};
      var b = raw.symChar ? raw : {
        c1: (COLOR_BY_KEY[raw.color] || BADGE_COLORS[7]).c1,
        c2: (COLOR_BY_KEY[raw.color] || BADGE_COLORS[7]).c2,
        symChar: (SYM_BY_KEY[raw.sym] || BADGE_SYMBOLS[0]).sym,
      };
      return { rank: idx + 1, id: e.id, name: e.name, title: e.title || "",
               trophies: e.trophies, me: !!e.me, rival: !!e.rival,
               badge: b, clanName: e.clanName || "" };
    };
    if (view === "global") {
      var top = pop.slice(0, LB_GLOBAL).map(mk);
      // Der Spieler fehlt nie: liegt er außerhalb, wird seine Zeile angehängt.
      if (myIdx >= LB_GLOBAL) top.push(mk(pop[myIdx], myIdx));
      return { view: view, rows: top, myRank: myIdx + 1,
               myIndex: myIdx < LB_GLOBAL ? myIdx : top.length - 1,
               inTop: myIdx < LB_GLOBAL, total: pop.length };
    }
    var from = Math.max(0, myIdx - LB_AROUND);
    var to = Math.min(pop.length, myIdx + LB_AROUND + 1);
    var win = [];
    for (var j = from; j < to; j++) win.push(mk(pop[j], j));
    return { view: view, rows: win, myRank: myIdx + 1, myIndex: myIdx - from,
             total: pop.length, from: from + 1, to: to };
  }

  /* ==================================================================
   * Feed, Emotes, Benachrichtigungen
   * ================================================================== */

  function sendEmote(key, now) {
    now = nowMs(now);
    var e = EMOTE_BY_KEY[key];
    if (!e) throw new Error("Unbekanntes Emote.");
    var s = get(now);
    if (!s.joined) throw new Error("Du bist in keinem Clan.");
    var since = now - ts0(s.me.lastEmoteTs);
    if (s.me.lastEmoteTs && since < EMOTE_COOLDOWN_MS) {
      throw new Error("Kurz warten — ein Spruch pro Minute.");
    }
    s.me.lastEmoteTs = now;
    note(s, "emote", (s.me.name || "Du") + ": " + e.emoji + " " + e.text, now);
    save(s);
    return { ok: true, key: e.key, text: e.text, emoji: e.emoji };
  }

  /* feed(now, limit) → Aktivitäts-Feed: Bot-Ereignisse + eigene Notizen,
   * absteigend nach Zeit. */
  function feed(now, limit) {
    now = nowMs(now);
    var s = get(now);
    if (!s.joined) return [];
    var out = Sim.feed(s.clan, now).concat(s.notes.map(function (n) {
      return { ts: n.ts, kind: n.kind, text: n.text, bot: false };
    }));
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out.slice(0, limit || 20).map(function (e) {
      return { ts: e.ts, kind: e.kind, text: e.text, bot: !!e.bot, agoText: ago(now - e.ts) };
    });
  }
  // Nur die Benachrichtigungen (Spende hat geholfen / Anfrage erfüllt / Truhe).
  function notifications(now) {
    now = nowMs(now);
    return get(now).notes.filter(function (n) {
      return n.kind === "help" || n.kind === "filled" || n.kind === "chest" || n.kind === "warend";
    }).map(function (n) {
      return { ts: n.ts, kind: n.kind, text: n.text, agoText: ago(now - n.ts) };
    });
  }
  function ago(ms) {
    if (ms < MINUTE) return "gerade eben";
    if (ms < HOUR) return "vor " + Math.floor(ms / MINUTE) + " min";
    if (ms < DAY) return "vor " + Math.floor(ms / HOUR) + " h";
    return "vor " + Math.floor(ms / DAY) + " Tag" + (Math.floor(ms / DAY) === 1 ? "" : "en");
  }

  function reset() { save(fresh()); return get(); }

  /* ================= Export ================= */
  var API = {
    // Konstanten
    STATE_VERSION: STATE_VERSION,
    TOWER_IDS: TOWER_IDS, CARD_NAME: CARD_NAME,
    /* SEND_MAX/SEND_WINDOW_MS sind am 30.07.2026 ERSATZLOS entfallen —
       kein Alias, keine 0. Wer sie noch liest, bekommt `undefined` und
       damit sofort ein sichtbares Problem statt einer falschen Zahl. */
    REQUEST_SIZE: REQUEST_SIZE,
    DONATE_MAX_PER_REQUEST: DONATE_MAX_PER_REQUEST,
    DONATE_PER_TAP: DONATE_PER_TAP,
    REQUEST_COOLDOWN_MS: REQUEST_COOLDOWN_MS,
    DONATE_GOLD: DONATE_GOLD, DONATE_MATERIAL: DONATE_MATERIAL,
    MAX_MEMBERS: MAX_MEMBERS, MAX_ELDERS: MAX_ELDERS, ROLES: ROLES,
    BADGE_COLORS: BADGE_COLORS, BADGE_SYMBOLS: BADGE_SYMBOLS, EMOTES: EMOTES,
    QUEST_DEFS: QUEST_DEFS, CHEST_STEPS: CHEST_STEPS,
    WAR_ATTACKS_PER_DAY: WAR_ATTACKS_PER_DAY, WAR_BADGE_STEPS: WAR_BADGE_STEPS,
    WAR_CHEST_WIN: WAR_CHEST_WIN, WAR_CHEST_LOSS: WAR_CHEST_LOSS,
    LB_POPULATION: LB_POPULATION, LB_GLOBAL: LB_GLOBAL, LB_AROUND: LB_AROUND,
    // Clan
    get: get, info: info, members: members,
    createClan: createClan, joinClan: joinClan, leaveClan: leaveClan,
    seedDemoClan: seedDemoClan,
    // Quests
    reportEvent: reportEvent, quests: quests, chestTier: chestTier,
    claimWeekChest: claimWeekChest,
    // Sendemechanik
    requestCards: requestCards, cancelRequest: cancelRequest, requests: requests,
    donateCards: donateCards, sendQuota: sendQuota, donatableCards: donatableCards,
    assertSendable: assertSendable, canSend: canSend, isTower: isTower,
    registerTower: registerTower,
    // Krieg
    warPhase: warPhase, warBoard: warBoard, startWarAttack: startWarAttack,
    resolveWarAttack: resolveWarAttack, resolveWar: resolveWar, lastWar: lastWar,
    warPointsFor: warPointsFor,
    // Leaderboard / Social
    leaderboard: leaderboard, feed: feed, notifications: notifications,
    sendEmote: sendEmote,
    // Zeit
    weekKeyOf: weekKeyOf, weekStart: weekStart, hhmm: hhmm, ago: ago,
    reset: reset,
    // intern (Tests, Server-Naht)
    _key: KEY, _sim: Sim, _write: function (s) { save(s); },
    _clock: function (fn) { CLOCK = fn || null; },
    _hash: hash, _lbTrophyAt: lbTrophyAt,
  };

  if (typeof window !== "undefined") window.ArenaClan = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_clan.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, i) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (i !== undefined ? "  " + i : ""));
      if (!cond) fail++;
    };
    var pad = function (s, n) { s = String(s); while (s.length < n) s += " "; return s; };
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
    // throws(fn, teilstring) — prüft Fehler UND die deutsche Meldung.
    var throws = function (fn, part) {
      try { fn(); return { ok: false, msg: "(kein Fehler)" }; }
      catch (e) {
        return { ok: part ? e.message.indexOf(part) >= 0 : true, msg: e.message };
      }
    };

    /* --- Echte Kartenbank laden, OHNE deren Selbsttest auszulösen.
     *     arena_cards.js überspringt seinen Test, wenn `window` existiert;
     *     module.exports wird trotzdem gesetzt. Danach window wieder weg,
     *     damit dieser Test hier weiterläuft. --- */
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
    // ArenaRivals-Stub im echten Roster-Format (12 Rivalen, 3 Bänder).
    globalThis.ArenaRivals = { roster: (function () {
      var ids = ["grubb", "pim", "nessa", "orlo", "lyra", "kael", "brann", "sylketh",
                 "vex", "morra", "auren", "thraxus"];
      return ids.map(function (id, i) {
        return { id: id, name: id.charAt(0).toUpperCase() + id.slice(1) + " Testrival",
                 title: "Band " + (i < 4 ? 1 : i < 8 ? 2 : 3),
                 el: ELEMENTS[i % 6], hero: "magmor", deck: [], aggro: 0.5, style: "" };
      });
    })() };
    var TROPH = 1136;
    globalThis.ArenaProfile = { get: function () { return { trophies: TROPH, best: 1400 }; } };

    // Kontrollierte Uhr: Montag 2026-07-20 09:00 UTC (Sammelphase).
    var MON = Date.UTC(2026, 6, 20, 9, 0, 0);
    var T = MON;
    API._clock(function () { return T; });
    var setT = function (t) { T = t; };

    console.log("\n=== ARENA CLAN — Selbsttest (Clan-System Stufe 1, State v" +
      STATE_VERSION + ") ===\n");

    /* ================= 1. Zeit / Kalenderwoche ================= */
    console.log("Zeitachse (alles UTC, Wochengrenze Montag 00:00):");
    var wsMon = weekStart(MON);
    check("weekStart() liefert Montag 00:00 UTC",
      new Date(wsMon).getUTCDay() === 1 && new Date(wsMon).getUTCHours() === 0,
      new Date(wsMon).toISOString());
    check("Sonntag 23:00 gehört noch zur VORwoche",
      weekStart(wsMon - HOUR) === wsMon - 7 * DAY,
      new Date(wsMon - HOUR).toISOString());
    check("weekKeyOf() ist stabil über die ganze Woche",
      weekKeyOf(wsMon) === weekKeyOf(wsMon + 6.99 * DAY) &&
      weekKeyOf(wsMon) !== weekKeyOf(wsMon + 7 * DAY), weekKeyOf(wsMon));
    var phases = [];
    for (var d = 0; d < 7; d++) phases.push(warPhase(wsMon + d * DAY + 12 * HOUR).phase);
    console.log("  Mo–So: " + phases.join(" · "));
    check("Mo–Fr Sammelphase, Sa–So Kriegsphase",
      phases.join(",") === "collect,collect,collect,collect,collect,war,war");
    check("warDay 0 = Samstag, 1 = Sonntag",
      warPhase(wsMon + 5 * DAY + HOUR).warDay === 0 &&
      warPhase(wsMon + 6 * DAY + HOUR).warDay === 1 &&
      warPhase(wsMon + 2 * DAY).warDay === -1);
    check("Countdown zur Kriegsphase korrekt (Fr 12:00 → 12 h)",
      warPhase(wsMon + 4 * DAY + 12 * HOUR).msLeft === 12 * HOUR,
      hhmm(warPhase(wsMon + 4 * DAY + 12 * HOUR).msLeft));

    /* ================= 2. Clan-Grundgerüst ================= */
    reset();
    setT(MON);
    var inf0 = info();
    check("ohne Clan: joined === false", inf0.joined === false);
    var inf = seedDemoClan();
    console.log("\nClan: " + inf.name + " " + inf.badge.symChar + " (" + inf.badge.colorName +
      ") · " + inf.members + "/" + inf.maxMembers + " · Ø " + fmt(inf.avgTrophies) + " 🏆");
    check("Clan angelegt, 30 Mitglieder", inf.joined === true && inf.members === MAX_MEMBERS,
      inf.members);
    check("Spieler ist Anführer", inf.myRole === "leader" && inf.myRoleName === "Anführer");
    check("Beitrittsart + Mindest-Trophäen gesetzt",
      inf.joinMode === "request" && inf.minTrophies === 800, inf.joinModeName);
    check("Abzeichen aus Presets (Farbe + Symbol)",
      inf.badge.color === "violet" && inf.badge.sym === "prism" && !!inf.badge.c1);
    var ms = members();
    var roles = {};
    ms.forEach(function (m) { roles[m.role] = (roles[m.role] | 0) + 1; });
    console.log("  Rollen: " + JSON.stringify(roles));
    check("genau 1 Anführer, ≤5 Älteste, Rest Mitglieder",
      roles.leader === 1 && roles.elder === MAX_ELDERS - 1 &&
      roles.leader + roles.elder + roles.member === MAX_MEMBERS, JSON.stringify(roles));
    check("Mitgliederliste ist nach Rolle, dann Trophäen sortiert", (function () {
      for (var i = 1; i < ms.length; i++) {
        var a = ms[i - 1], b = ms[i];
        if (ROLES[a.role].rank < ROLES[b.role].rank) return false;
        if (ROLES[a.role].rank === ROLES[b.role].rank && a.trophies < b.trophies) return false;
      }
      return true;
    })());
    check("Mitglieder-IDs sind eindeutig", (function () {
      var seen = {};
      return ms.every(function (m) { if (seen[m.id]) return false; seen[m.id] = 1; return true; });
    })());
    check("Mitglieder-Namen sind eindeutig (Stil arena_rivals.js)", (function () {
      var seen = {};
      return ms.every(function (m) { if (seen[m.name]) return false; seen[m.name] = 1; return true; });
    })());
    check("jedes Mitglied hat Aktivitätszeitstempel",
      ms.every(function (m) { return m.lastActive > 0 && m.idleMs >= 0; }));
    check("Trophäen-Schnitt plausibel (Anker 1136, Streuung 0.45–1.55 ×)",
      inf.avgTrophies > 800 && inf.avgTrophies < 1600, inf.avgTrophies);
    // Determinismus der Bot-Schicht
    var msB = members();
    check("ClanSim ist deterministisch (zwei Aufrufe = identisch)",
      JSON.stringify(ms.map(function (m) { return m.id + m.name + m.trophies; })) ===
      JSON.stringify(msB.map(function (m) { return m.id + m.name + m.trophies; })));
    check("ClanSim persistiert NICHTS (State kennt keine Bots)",
      JSON.stringify(get()).indexOf(ms[5].name) < 0, "State-Größe " +
      JSON.stringify(get()).length + " B");

    /* ================= 3. Clan-Quests ================= */
    console.log("\nWochen-Quests (Mo 09:00, Sammelphase " +
      Math.round(collectFrac() * 100) + " % durch):");
    var qs = quests();
    qs.forEach(function (q) {
      console.log("  " + q.sym + " " + pad(q.title, 42) + pad(q.total + "/" + q.goal, 12) +
        pad(q.pctText, 6) + " (ich " + q.mine + ", Bots " + q.bots + ")");
    });
    check("3 parallele Quests", qs.length === 3, qs.map(function (q) { return q.key; }).join("/"));
    check("Ziele 360 / 120 / 5400",
      qs[0].goal === 360 && qs[1].goal === 120 && qs[2].goal === 5400);
    check("Mitte der Woche tragen alle drei Quests Bot-Fortschritt", (function () {
      var mid = quests(wsMon + 2.5 * DAY);
      return mid.every(function (q) { return q.bots > 0; });
    })(), quests(wsMon + 2.5 * DAY).map(function (q) { return q.bots; }).join(" / "));
    check("eigener Beitrag startet bei 0", qs.every(function (q) { return q.mine === 0; }));
    // reportEvent
    var r1 = reportEvent("win", 1);
    reportEvent("win", 4);
    reportEvent("pack", 2);
    reportEvent("trophy", 96);
    var qs2 = quests();
    check("reportEvent('win') zählt", r1.counted === true && qs2[0].mine === 5, qs2[0].mine);
    check("reportEvent('pack'/'trophy') zählen",
      qs2[1].mine === 2 && qs2[2].mine === 96);
    check("Aliase funktionieren ('wins', 'trophies')", (function () {
      reportEvent("wins", 1); reportEvent("trophies", 4);
      return quests()[0].mine === 6 && quests()[2].mine === 100;
    })());
    check("unbekannter Typ wird ignoriert, kein Crash",
      reportEvent("bananen", 5).counted === false &&
      reportEvent("win", 0).counted === false);
    // Monotonie + Determinismus des Bot-Beitrags
    check("Bot-Beitrag wächst MONOTON über die Woche", (function () {
      var last = -1;
      for (var h = 0; h <= 5 * 24; h += 6) {
        var v = Sim.questContribution(get().clan, "wins", wsMon + h * HOUR);
        if (v < last) return false;
        last = v;
      }
      return true;
    })());
    check("Bot-Beitrag ist reproduzierbar (gleicher Zeitpunkt = gleicher Wert)",
      Sim.questContribution(get().clan, "wins", wsMon + 40 * HOUR) ===
      Sim.questContribution(get().clan, "wins", wsMon + 40 * HOUR));
    check("Bot-Beitrag friert am Wochenende ein (kein Rückfall)",
      Sim.questContribution(get().clan, "wins", wsMon + 5 * DAY) ===
      Sim.questContribution(get().clan, "wins", wsMon + 6.9 * DAY));
    // Kalibrierung: Bots allein sollen ~90 % erreichen
    setT(wsMon + 5 * DAY - MINUTE);
    var qEnd = quests();
    console.log("  Freitag 23:59 (nur Bots): " +
      qEnd.map(function (q) { return q.key + " " + q.bots + "/" + q.goal; }).join(" · "));
    check("Bots allein landen bei 84–96 % (der Spieler entscheidet die Stufe)",
      qEnd.every(function (q) { return q.bots / q.goal > 0.84 && q.bots / q.goal < 0.96; }),
      qEnd.map(function (q) { return Math.round(q.bots / q.goal * 100) + " %"; }).join(" / "));

    /* --- Truhen-Staffel --- */
    setT(MON);
    var c0 = chestTier();
    console.log("\nTruhen-Staffel: " + CHEST_STEPS.map(function (s2) {
      return s2.sym + " " + s2.name + " ab " + Math.round(s2.at * 100) + " %";
    }).join(" · "));
    check("früh in der Woche: noch keine Stufe / nicht abholbar",
      c0.tier === null && c0.claimable === false, c0.pctText);
    check("Sammelphase: opensIn > 0 (Countdown bis Samstag)", c0.opensIn > 0,
      hhmm(c0.opensIn));
    check("ohne erreichte Stufe: Meldung nennt die 50-%-Schwelle",
      throws(function () { claimWeekChest(); }, "mindestens 50 %").ok);
    check("Freitag mit Stufe, aber noch Sammelphase → 'öffnet erst am Samstag'", (function () {
      setT(wsMon + 4 * DAY + 20 * HOUR);
      var c = chestTier();
      var t = throws(function () { claimWeekChest(); }, "erst am Samstag");
      setT(MON);
      return c.tier !== null && c.claimable === false && t.ok;
    })());
    // Samstag: Bots haben ~90 % → Silber; mit Spieler-Push → Gold
    setT(wsMon + 5 * DAY + 2 * HOUR);
    var cSat = chestTier();
    console.log("  Samstag ohne Spieler-Beitrag: " + cSat.pctText + " → " +
      (cSat.step ? cSat.step.name : "keine Truhe"));
    check("Samstag: Stufe erreicht und abholbar", cSat.tier !== null && cSat.claimable === true,
      cSat.tier);
    check("Kriegsphase: reportEvent zählt NICHT mehr",
      reportEvent("win", 5).counted === false &&
      reportEvent("win", 5).reason === "warphase");
    var claim = claimWeekChest();
    console.log("  Abgeholt: " + claim.sym + " " + claim.name + " — " + claim.pack +
      "-Pack, " + fmt(claim.gold) + " Gold, " + claim.material + " Material");
    check("claimWeekChest() liefert Pack + Gold + Material",
      claim.pack && claim.gold > 0 && claim.material > 0);
    check("zweites Abholen wird verweigert",
      throws(function () { claimWeekChest(); }, "schon abgeholt").ok);
    check("Material wurde in der Kartenbank gebucht",
      !AC || AC.getMaterials().total >= claim.material,
      AC ? AC.getMaterials().total : "n/a");

    /* --- Gold-Stufe erreichbar? --- */
    (function () {
      reset(); setT(MON); seedDemoClan();
      reportEvent("win", 60); reportEvent("pack", 30); reportEvent("trophy", 1200);
      setT(wsMon + 5 * DAY + HOUR);
      var cg = chestTier();
      check("mit starkem Spieler-Beitrag ist GOLD erreichbar",
        cg.tier === "gold" && Math.abs(cg.pct - 1) < 1e-9, cg.pctText);
    })();

    /* ================= 4. Wochen-Rollover ================= */
    (function () {
      reset(); setT(MON); seedDemoClan();
      reportEvent("win", 7);
      check("Fortschritt liegt vor dem Rollover an", quests()[0].mine === 7);
      var wkA = get().quests.week;
      setT(MON + 7 * DAY);                       // eine Woche später
      var st = get();
      check("Rollover: Quest-Woche wechselt", st.quests.week !== wkA, wkA + " → " + st.quests.week);
      check("Rollover: eigener Fortschritt genullt", quests()[0].mine === 0);
      check("Rollover: Truhe wieder unabgeholt", st.quests.claimed === false);
      check("Rollover: neuer Kriegsblock", st.war.week === st.quests.week && st.war.points === 0);
      check("Rollover braucht kein setInterval (passiert beim Lesen)",
        weekKeyOf(nowMs()) === st.quests.week);
    })();

    /* ================= 5. SENDEMECHANIK — die harte Validierung ======= */
    console.log("\n" + "=".repeat(66));
    console.log("SENDEMECHANIK — User-Vorgabe als Code (DESIGN_CLAN.md §0)");
    console.log("=".repeat(66));
    reset(); setT(MON); seedDemoClan();
    if (AC) AC._reset();

    check("TOWER_IDS = die 6 Element-Türme",
      TOWER_IDS.join(",") === "fire,water,nature,earth,light,darkness", TOWER_IDS.length + " IDs");
    check("Helden sind KEINE Tower", !isTower("solara") && !isTower("magmor"));
    check("registerTower() macht die Liste erweiterbar", (function () {
      var before = TOWER_IDS.length;
      registerTower("aether");
      var ok = isTower("aether") && TOWER_IDS.length === before + 1;
      TOWER_IDS.pop();                            // Testzustand zurückräumen
      return ok && !isTower("aether");
    })());

    /* --- Vorgabe 1: NUR Tower-Karten --- */
    console.log("\nVorgabe 1 — nur Tower-Karten:");
    [["solara", "Held"], ["magmor", "Held"], ["gold", "Währung"],
     ["material", "Material"], ["skill_meteor", "Skill"]].forEach(function (p) {
      var t = throws(function () { assertSendable(p[0], "common"); }, "Nur Turmkarten");
      console.log("  " + pad(p[1] + " „" + p[0] + "“", 26) + (t.ok ? "abgelehnt" : "DURCH!") +
        "  → " + t.msg);
      check("Nicht-Tower abgelehnt: " + p[0], t.ok);
    });
    check("alle 6 Türme sind erlaubt",
      TOWER_IDS.every(function (id) { return canSend(id, "common"); }));

    /* --- Vorgabe 3: NUR graue Basis-Kopien --- */
    console.log("\nVorgabe 3 — nur graue Basis-Kopien (Progressions-Schutz):");
    ["good", "rare", "epic", "legendary", "supreme"].forEach(function (tk) {
      var t = throws(function () { assertSendable("fire", tk); }, "Nur graue Basis-Kopien");
      console.log("  " + pad(tk, 12) + (t.ok ? "abgelehnt" : "DURCH!") + "  → " + t.msg);
      check("Rarität gesperrt: " + tk, t.ok);
    });
    check("Meldung nennt die Regel „Fusionen macht jeder selbst“",
      throws(function () { assertSendable("fire", "good"); }).msg.indexOf("Fusionen macht jeder selbst") > 0);
    check("common / Tier-Index 0 sind erlaubt",
      canSend("fire", "common") && canSend("fire", 0) && canSend("fire"));

    /* --- Anfragen --- */
    console.log("\nAnfragen:");
    var req = requestCards("water");
    console.log("  Anfrage gestellt: " + req.need + " × " + req.cardName);
    /* UMGESCHRIEBEN 30.07.2026: hieß „(10 Kopien)" und prüfte gegen die
       KONSTANTE — der Name log also, die Prüfung war schon richtig.
       Jetzt steht die Zusage im Namen UND wird gegen die Konstante
       geprüft, plus die Zahl selbst an EINER Stelle (30 ist die
       Vorgabe, nicht nur „was REQUEST_SIZE gerade sagt"). */
    check("requestCards() legt eine Anfrage über 30 Karten an",
      req.mine === true && req.need === REQUEST_SIZE && REQUEST_SIZE === 30 &&
      req.got === 0, req.need + " Karten");
    check("max 1 aktive Anfrage",
      throws(function () { requestCards("fire"); }, "schon eine offene Anfrage").ok);
    check("Anfrage für einen Helden ist unmöglich", (function () {
      cancelRequest();
      var t = throws(function () { requestCards("solara"); }, "Nur Turmkarten");
      return t.ok;
    })());
    /* UMGESCHRIEBEN 30.07.2026: die Abklingzeit ist von 8 h auf 5 h
       gesetzt worden. Die Schritte prüfen deshalb ZWEISEITIG und gegen
       REQUEST_COOLDOWN_MS statt gegen eine eingetippte Zahl — kurz
       davor abgelehnt, kurz danach erlaubt. Eine einseitige Prüfung
       („wirft") wäre auch bei 8 h grün geblieben und hätte die alte
       Zahl still konserviert. */
    check("Anfrage-Abklingzeit greift (5 h, gegen die Konstante geprüft)",
      REQUEST_COOLDOWN_MS === 5 * HOUR &&
      throws(function () { requestCards("fire"); }, "Neue Anfrage erst in").ok);
    check("kurz VOR Ablauf der 5 h weiter abgelehnt", (function () {
      setT(MON + REQUEST_COOLDOWN_MS - MINUTE);
      var t = throws(function () { requestCards("fire"); }, "Neue Anfrage erst in");
      return t.ok && /alle 5 Stunden/.test(t.msg);
    })(), throws(function () { requestCards("fire"); }).msg);
    check("nach 5 h wieder möglich", (function () {
      setT(MON + REQUEST_COOLDOWN_MS + MINUTE);
      var r = requestCards("fire");
      return r.need === REQUEST_SIZE;
    })());
    // Bots füllen die eigene Anfrage über die Zeit → Karten kommen an
    check("Bots füllen die eigene Anfrage über die Zeit", (function () {
      var have0 = commonCopies("fire");
      /* ZEITPUNKT RELATIV ZUR ANFRAGE, nicht absolut (30.07.2026): der
         Aufsetzer davor wartet REQUEST_COOLDOWN_MS ab, und die Anfrage
         füllt sich in 4 h. Ein fester Wert („MON + 10 h") war an die
         alte 8-h-Abklingzeit gebunden und hätte bei 5 h eine BEREITS
         VOLLE Anfrage gemessen — der Schritt wäre rot geworden, ohne
         dass am Produkt etwas falsch ist. */
      setT(MON + REQUEST_COOLDOWN_MS + 2 * HOUR);   // ~2 h nach der Anfrage
      var mineR = requests()[0];
      return mineR.mine === true && mineR.got > 0 && mineR.got < mineR.need &&
             (!AC || commonCopies("fire") > have0);
    })(), "got " + requests()[0].got + "/" + REQUEST_SIZE + ", Bestand " + commonCopies("fire"));
    check("erfüllte eigene Anfrage bleibt sichtbar (verschwindet nicht im Erfolg)", (function () {
      setT(MON + REQUEST_COOLDOWN_MS + 12 * HOUR);   // dreifache Füllzeit
      var mineR = requests()[0];
      return mineR.mine === true && mineR.closed === true && mineR.got === mineR.need;
    })());
    check("erfüllte Anfrage erzeugt eine Benachrichtigung", (function () {
      setT(MON + 20 * HOUR);
      requests();
      return notifications().some(function (n) { return n.kind === "filled"; });
    })());

    /* --- Spenden + Kontingent JE ANFRAGE (Vorgabe 30.07.2026) ---
       KOMPLETT UMGESCHRIEBEN. Vorher stand hier das globale rollierende
       3-h-Fenster: „10 Karten, dann drei Stunden Pause". Das Fenster
       gibt es nicht mehr (Begründung im Kopfkommentar), und die Schritte
       sind auf die NEUE Zusage umgeschrieben statt gelöscht:
         alt „genau 10 Karten gehen durch"      → 10 je ANFRAGE
         alt „die 11. Karte in 3 h abgelehnt"   → die 11. an DIESELBE Anfrage
         alt „nach 3 h ist das Fenster frei"    → die NÄCHSTE Anfrage
                                                  hat sofort volle 10
         alt „Kontingent zählt jede Karte"      → ein Tippen = eine Karte
       Geprüft wird durchweg gegen die KONSTANTEN. */
    console.log("\nSpenden + Sendekontingent (10 je Anfrage, 1 je Sendevorgang):");
    reset(); setT(MON); seedDemoClan();
    if (AC) { AC._reset(); TOWER_IDS.forEach(function (id) { AC.addDrop(id, "common", 200); }); }
    var botReqs = requests().filter(function (r) { return !r.mine; });
    check("Bot-Anfragen sind sichtbar (3 offene)", botReqs.length === 3,
      botReqs.map(function (r) { return r.cardName + " " + r.got + "/" + r.need; }).join(" · "));
    check("jede Anfrage geht über 30 Karten",
      botReqs.every(function (r) { return r.need === REQUEST_SIZE; }) && REQUEST_SIZE === 30,
      botReqs.map(function (r) { return r.need; }).join("/"));
    var target = botReqs.filter(function (r) { return r.left >= DONATE_MAX_PER_REQUEST + 1; })[0] ||
                 botReqs[0];
    var q0 = sendQuota(target.id);
    check("Kontingent startet bei 0/10 — und zwar JE ANFRAGE",
      q0.used === 0 && q0.left === DONATE_MAX_PER_REQUEST &&
      q0.max === DONATE_MAX_PER_REQUEST && q0.requestId === target.id,
      q0.used + "/" + q0.max + " für " + q0.requestId);
    /* GEGENPROBE zur Signatur: der alte Aufruf sendQuota(now) übergibt
       eine ZAHL. Er MUSS werfen — eine stille 0/10 wäre die gefährlichste
       Antwort, weil das UI damit weitergezeichnet hätte. */
    check("alte Signatur sendQuota(now) wirft statt zu raten",
      throws(function () { sendQuota(nowMs()); }, "braucht seit 30.07.2026 die Anfrage-ID").ok &&
      throws(function () { sendQuota(); }, "Anfrage-ID").ok);

    /* --- EIN SENDEVORGANG = GENAU EINE KARTE --- */
    var haveBefore = commonCopies(target.cardId);
    var gotBefore = target.got;
    var don = donateCards(target.id);
    console.log("  " + don.count + " × " + don.cardName + " an " + don.request.ownerName +
      " → +" + don.reward.gold + " Gold, +" + don.reward.material + " " +
      don.reward.materialType + "-Material");
    check("ein Sendevorgang bucht GENAU eine Karte",
      don.count === DONATE_PER_TAP && DONATE_PER_TAP === 1 &&
      commonCopies(target.cardId) === haveBefore - 1 &&
      don.request.got === gotBefore + 1,
      "Bestand " + haveBefore + " → " + commonCopies(target.cardId) +
      ", Anfrage " + gotBefore + " → " + don.request.got + "/" + don.request.need);
    /* GEGENPROBE: „nicht direkt 10". Der Mengen-Parameter existiert nur
       noch, um Mengen ABZULEHNEN. */
    check("10 auf einen Griff werden abgelehnt (deutscher Klartext)", (function () {
      var t = throws(function () { donateCards(target.id, DONATE_MAX_PER_REQUEST); },
        "je Sendevorgang");
      return t.ok && /genau eine Karte/.test(t.msg) && /tippe mehrfach/.test(t.msg);
    })(), throws(function () { donateCards(target.id, 10); }).msg);
    check("Spende schreibt beim Empfänger gut",
      requests().filter(function (r) { return r.id === target.id; })[0].got >= don.request.got);
    check("Spender-Belohnung: 25 Gold + 1 Material je Karte",
      don.reward.gold === DONATE_GOLD && don.reward.material === DONATE_MATERIAL);
    check("Material kommt in der SORTE der Karte",
      !AC || don.reward.materialType === AC.materialTypeOf(target.cardId),
      don.reward.materialType);
    check("Kontingent der Anfrage steht danach auf 1/10",
      sendQuota(target.id).used === 1 && sendQuota(target.id).left === DONATE_MAX_PER_REQUEST - 1,
      sendQuota(target.id).used + "/" + sendQuota(target.id).max);
    /* GEGENPROBE zur alten Fenstersperre: ZWEI Sendevorgänge direkt
       hintereinander, ohne jeden Zeitsprung. Unter dem alten Modell war
       das erlaubt, solange das Fenster Platz hatte — der Schritt prüft
       hier aber, dass die Uhr GAR KEINE Rolle mehr spielt. */
    check("zwei Sendevorgänge direkt hintereinander sind erlaubt", (function () {
      var vorher = sendQuota(target.id).used;
      donateCards(target.id);                    // KEIN setT dazwischen
      donateCards(target.id);
      return sendQuota(target.id).used === vorher + 2;
    })(), sendQuota(target.id).used + "/" + DONATE_MAX_PER_REQUEST + " nach 3 Tippen");

    /* --- DIE 11. KARTE AN DIESELBE ANFRAGE --- */
    console.log("\n  Grenze je Anfrage: 10 gehen durch, die 11. muss scheitern");
    reset(); setT(MON); seedDemoClan();
    if (AC) { AC._reset(); TOWER_IDS.forEach(function (id) { AC.addDrop(id, "common", 200); }); }
    var gross = requests().filter(function (r) {
      return !r.mine && r.left >= DONATE_MAX_PER_REQUEST + 1;
    })[0];
    check("Anfrage mit Platz für mehr als 10 Karten vorhanden", !!gross,
      gross ? gross.cardName + " " + gross.got + "/" + gross.need : "keine");
    var sent = 0, guard = 0;
    while (guard++ < 40) {
      try { donateCards(gross.id); sent++; } catch (e) { break; }
    }
    console.log("    " + sent + " Karten an dieselbe Anfrage, Kontingent " +
      sendQuota(gross.id).used + "/" + DONATE_MAX_PER_REQUEST);
    check("genau 10 Karten gehen an EINE Anfrage durch",
      sent === DONATE_MAX_PER_REQUEST && sendQuota(gross.id).full === true, sent);
    var t11 = throws(function () { donateCards(gross.id); }, "schon " + DONATE_MAX_PER_REQUEST);
    console.log("    11. Karte → " + t11.msg);
    check("die 11. Karte an DIESELBE Anfrage wird ABGELEHNT", t11.ok, t11.msg);
    check("Meldung nennt die Grenze und dass der Rest den anderen gehört",
      /schon 10 Karten gegeben/.test(t11.msg) && /anderen im Clan/.test(t11.msg));
    check("die Anfrage bleibt dabei OFFEN (10 < 30)", (function () {
      var g2 = requests().filter(function (r) { return r.id === gross.id; })[0];
      return g2 && !g2.closed && g2.left > 0;
    })(), (function () {
      var g2 = requests().filter(function (r) { return r.id === gross.id; })[0];
      return g2 ? g2.got + "/" + g2.need : "weg";
    })());
    /* DIE ENTSCHEIDENDE GEGENPROBE ZUM WEGFALL DES ZEITFENSTERS:
       ausgereizte Anfrage, KEIN Zeitsprung — eine ANDERE Anfrage muss
       trotzdem sofort volle 10 annehmen. Unter dem alten Modell wäre
       hier drei Stunden lang gar nichts mehr gegangen. */
    check("andere Anfrage nimmt SOFORT wieder 10 — ohne Zeitsprung", (function () {
      var andere = requests().filter(function (r) {
        return !r.mine && r.id !== gross.id && r.left >= DONATE_MAX_PER_REQUEST;
      })[0];
      if (!andere) return false;
      if (sendQuota(andere.id).left !== DONATE_MAX_PER_REQUEST) return false;
      var n2 = 0;
      for (var z = 0; z < DONATE_MAX_PER_REQUEST; z++) { donateCards(andere.id); n2++; }
      return n2 === DONATE_MAX_PER_REQUEST &&
             sendQuota(andere.id).used === DONATE_MAX_PER_REQUEST &&
             sendQuota(gross.id).used === DONATE_MAX_PER_REQUEST;
    })(), "20 Karten in derselben Minute, auf zwei Anfragen verteilt");

    /* --- Bestands- und Zustandsprüfungen --- */
    console.log("\n  Weitere Sperren:");
    reset(); setT(MON); seedDemoClan();
    if (AC) { AC._reset(); AC.addDrop("light", "common", 2); AC.addDrop("light", "good", 9); }
    var lightReq = null;
    // Anfrage mit gezielter Karte über mehrere Buckets suchen
    for (var bkt = 0; bkt < 24 && !lightReq; bkt++) {
      setT(MON + bkt * 6 * HOUR);
      requests().forEach(function (r) {
        if (!r.mine && r.cardId === "light" && r.left >= 3 && !lightReq) lightReq = r;
      });
    }
    if (lightReq) {
      /* UMGESCHRIEBEN 30.07.2026: hier stand `donateCards(id, 3)` bei
         zwei Kopien Bestand. Mit „eine Karte je Sendevorgang" ist die
         Menge 3 gar nicht mehr adressierbar — der Schritt hätte an der
         Mengensperre gehalten und die BESTANDSSPERRE nie erreicht.
         Jetzt werden die zwei Kopien einzeln verschenkt, und erst der
         dritte Sendevorgang läuft in den Bestandsfehler. */
      donateCards(lightReq.id); donateCards(lightReq.id);
      var tb = throws(function () { donateCards(lightReq.id); }, "Du hast nur 0 graue");
      console.log("    Bestand leer, eine weitere Karte gefordert → " + tb.msg);
      check("zu wenig graue Kopien → Fehler mit Bestandsangabe", tb.ok, tb.msg);
      check("grüne Kopien werden NICHT angetastet",
        !AC || AC.get().cards.light.copies.good === 9);
      var tg = throws(function () { donateCards(lightReq.id, 1, "good"); }, "Nur graue Basis-Kopien");
      console.log("    Spende explizit als „good“ → " + tg.msg);
      check("explizite Rarität ≠ common wird abgelehnt", tg.ok, tg.msg);
    } else {
      check("Anfrage für 'light' in 24 Buckets gefunden", false, "keine gefunden");
    }
    setT(MON);
    check("unbekannte Anfrage → Fehler",
      throws(function () { donateCards("gibtsnicht", 1); }, "nicht gefunden").ok);
    check("eigene Anfrage nicht bespendbar", (function () {
      var mr = requestCards("nature");
      return throws(function () { donateCards(mr.id, 1); }, "eigene Anfrage").ok;
    })());
    check("count ≤ 0 → Fehler", (function () {
      var rr = requests().filter(function (r) { return !r.mine; })[0];
      return throws(function () { donateCards(rr.id, 0); }, "mindestens eine Karte").ok;
    })());
    /* UMGESCHRIEBEN 30.07.2026: vorher wurde die Anfrage mit EINER
       Spende über das Restkontingent gefüllt. Beides geht nicht mehr —
       eine Anfrage braucht 30 Karten, ein Spieler darf 10 geben, und
       ein Sendevorgang bucht eine. Gesucht wird deshalb eine Anfrage,
       die die Bots schon so weit gefüllt haben, dass die eigenen
       Karten sie SCHLIESSEN können (left ≤ 10). Findet sich in den
       ersten Buckets keine, ist das ein Mangel des AUFBAUS und muss als
       Fehlschlag dastehen, nicht als bestandener Test. */
    check("erfüllte Anfrage nimmt nichts mehr an", (function () {
      reset(); setT(MON); seedDemoClan();
      if (AC) { AC._reset(); TOWER_IDS.forEach(function (id) { AC.addDrop(id, "common", 200); }); }
      var rr = null;
      /* GEMESSEN: Bots füllen eine Anfrage in ihrem 6-h-Bucket auf
         höchstens floor(30 · 0,9 · frac). `left` sinkt also erst GEGEN
         ENDE eines Buckets unter 10 — im Messlauf frühestens bei
         frac ≈ 0,93. Deshalb wird in HALBSTUNDENSCHRITTEN gesucht und
         nicht im Bucket-Raster: MON ist 09:00, die Buckets hängen aber
         an der Wochengrenze (00:00). Jedes von MON aus gerechnete
         Bucket-Raster trifft immer dieselbe Stelle im Bucket
         (frac ≈ 0,48) und findet NIE eine fast volle Anfrage — genau
         daran ist die erste Fassung dieses Schritts gescheitert. */
      for (var bk2 = 0; bk2 < 144 && !rr; bk2++) {
        setT(MON + bk2 * 30 * MINUTE);
        requests().forEach(function (r) {
          if (!r.mine && !r.closed && r.left > 0 && r.left <= DONATE_MAX_PER_REQUEST && !rr) rr = r;
        });
      }
      if (!rr) return false;                     // Aufbau untauglich → rot
      for (var f = 0; f < rr.left; f++) donateCards(rr.id);
      var again = requests().filter(function (r) { return r.id === rr.id; })[0];
      if (!again.closed) return false;
      return throws(function () { donateCards(rr.id); }, "bereits erfüllt").ok;
    })());
    check("Benachrichtigung „Deine Spende hat … geholfen“", (function () {
      return get().notes.some(function (n) { return n.kind === "help"; }) ||
             get().notes.some(function (n) { return n.kind === "donate"; });
    })());

    /* ================= 6. Ghost-Clankrieg ================= */
    console.log("\n" + "=".repeat(66));
    console.log("GHOST-CLANKRIEG");
    console.log("=".repeat(66));
    reset(); setT(MON); seedDemoClan();
    var wbCollect = warBoard();
    console.log("Sammelphase: Krieg startet in " + wbCollect.countdownText +
      " · Gegner: " + wbCollect.them.name);
    check("Sammelphase: Countdown + Gegner schon bekannt",
      wbCollect.phase.phase === "collect" && wbCollect.phase.msLeft > 0 && !!wbCollect.them.name);
    check("Angriff in der Sammelphase abgelehnt",
      throws(function () { startWarAttack("g0"); }, "Kriegsphase startet erst am Samstag").ok);

    setT(wsMon + 5 * DAY + 3 * HOUR);            // Samstag 03:00
    var wb = warBoard();
    console.log("Kriegsphase Tag " + (wb.phase.warDay + 1) + ": " + wb.us.name + " " +
      wb.us.points + " : " + wb.them.points + " " + wb.them.name);
    console.log("  Ghost-Ziele: " + wb.targets.length + " · Angriffe heute " +
      wb.attacksLeftToday + "/" + wb.attacksPerDay);
    check("Kriegsboard: 2 Clans, 30 Ghost-Ziele",
      wb.targets.length === MAX_MEMBERS && !!wb.us.name && !!wb.them.name);
    check("Gegnerstärke ≈ eigener Schnitt ± 8 %", (function () {
      var q2 = wb.them.avgTrophies / wb.us.avgTrophies;
      return q2 > 0.90 && q2 < 1.10;
    })(), (wb.them.avgTrophies / wb.us.avgTrophies).toFixed(3) + "×");
    check("3 Angriffe pro Kriegstag", wb.attacksLeftToday === WAR_ATTACKS_PER_DAY &&
      wb.attacksPerDay === 3);
    check("Ghost-Builds haben Loadout-Format wie arena_rivals.js", (function () {
      var lo = startWarAttack(wb.targets[0].id);
      return lo.deck.length === 6 && !!lo.el && !!lo.hero && lo.trophies > 0 &&
             typeof lo.aggro === "number" && lo.ghost === true;
    })());
    // Punkteformel
    console.log("  Punkteformel:");
    [[true, 3, 1], [true, 0, 0], [false, 3, 0], [false, 0, 0]].forEach(function (p) {
      console.log("    " + pad(p[0] ? "Sieg" : "Niederlage", 12) + pad(p[1] + "★", 4) +
        "hp " + p[2] + "  →  " + warPointsFor({ win: p[0], stars: p[1], hpFrac: p[2] }) + " Punkte");
    });
    check("Sieg 100…160, Niederlage 20…35",
      warPointsFor({ win: true, stars: 3, hpFrac: 1 }) === 160 &&
      warPointsFor({ win: true, stars: 0, hpFrac: 0 }) === 100 &&
      warPointsFor({ win: false, stars: 3 }) === 35 &&
      warPointsFor({ win: false, stars: 0 }) === 20);
    check("Niederlage zahlt ein (Frust-Schutz)", warPointsFor({ win: false }) > 0);
    // Verbuchung
    var a1 = resolveWarAttack(wb.targets[0].id, { win: true, stars: 2, hpFrac: 0.6 });
    console.log("  Angriff 1: " + a1.target + " → +" + a1.points + " (Summe " + a1.myTotal + ")");
    check("resolveWarAttack verbucht Punkte", a1.points === 100 + 30 + 9 && a1.myTotal === a1.points,
      a1.points);
    check("Angriffe-übrig sinkt", a1.attacksLeftToday === WAR_ATTACKS_PER_DAY - 1);
    check("dasselbe Ziel nur EINMAL pro Krieg",
      throws(function () { startWarAttack(wb.targets[0].id); }, "schon angegriffen").ok);
    resolveWarAttack(wb.targets[1].id, { win: false, stars: 1 });
    resolveWarAttack(wb.targets[2].id, { win: true, stars: 3, hpFrac: 1 });
    check("nach 3 Angriffen ist der Tag verbraucht",
      throws(function () { startWarAttack(wb.targets[3].id); }, "Keine Angriffe mehr heute").ok);
    check("Punktesumme korrekt", warBoard().us.myPoints === 139 + 25 + 160,
      warBoard().us.myPoints);
    // Sonntag: 3 neue Angriffe
    setT(wsMon + 6 * DAY + 3 * HOUR);
    check("Sonntag gibt 3 NEUE Angriffe", warBoard().attacksLeftToday === WAR_ATTACKS_PER_DAY,
      warBoard().attacksLeftToday);
    check("bereits angegriffene Ziele bleiben gesperrt",
      throws(function () { startWarAttack(wb.targets[0].id); }, "schon angegriffen").ok);
    // Bot-Punkteverläufe
    check("beide Seiten haben deterministische Verläufe", (function () {
      var a = Sim.warTotals(get().clan, weekKeyOf(nowMs()), 0.5);
      var b = Sim.warTotals(get().clan, weekKeyOf(nowMs()), 0.5);
      return a.enemy === b.enemy && a.ourBots === b.ourBots && a.enemy > 0;
    })());
    check("Verläufe wachsen monoton über die Kriegsphase", (function () {
      var last = -1;
      for (var f = 0; f <= 1.0001; f += 0.05) {
        var v = Sim.warTotals(get().clan, weekKeyOf(nowMs()), f);
        if (v.enemy < last) return false;
        last = v.enemy;
      }
      return true;
    })());
    var tt = Sim.warTotals(get().clan, weekKeyOf(nowMs()), 1);
    console.log("  Endstände ohne Spieler: eigene Bots " + tt.ourBots + " : " + tt.enemy +
      " Gegner (Lücke " + tt.gap + ")");
    check("Lücke 250…449 — der Spieler entscheidet",
      tt.gap >= WAR_GAP_MIN && tt.gap < WAR_GAP_MIN + WAR_GAP_SPAN &&
      tt.ourBots + tt.gap === tt.enemy, tt.gap);
    check("6 Angriffe können die Lücke schließen (max 960)",
      6 * warPointsFor({ win: true, stars: 3, hpFrac: 1 }) > tt.gap);
    check("ohne Spieler-Punkte wäre es eine Niederlage", tt.ourBots < tt.enemy);

    /* --- Kriegsende: Truhe + Banner-Rahmen --- */
    (function () {
      reset(); setT(MON); seedDemoClan();
      var st0 = get();
      st0.clan.warWins = 0; st0.clan.warStreak = 0; st0.clan.bestStreak = 0;
      st0.clan = normClan(st0.clan); save(st0);
      // Wochenende: 6 Siege → Lücke sicher geschlossen
      var days = [wsMon + 5 * DAY + 3 * HOUR, wsMon + 6 * DAY + 3 * HOUR];
      days.forEach(function (t) {
        setT(t);
        var b = warBoard();
        var n2 = 0;
        b.targets.forEach(function (g) {
          if (n2 < WAR_ATTACKS_PER_DAY && !g.attacked) {
            try { resolveWarAttack(g.id, { win: true, stars: 3, hpFrac: 1 }); n2++; } catch (e) {}
          }
        });
      });
      var wbEnd = warBoard();
      console.log("\nKriegsende (6 Siege): " + wbEnd.us.points + " : " + wbEnd.them.points);
      var res = resolveWar();
      console.log("  " + (res.won ? "SIEG" : "Niederlage") + " · " + res.chest.sym + " " +
        res.chest.name + ": " + res.chest.pack + "-Pack, " + fmt(res.chest.gold) + " Gold, " +
        res.chest.material + " Material · Serie " + res.warStreak + " → " + res.badgeName);
      check("6 Siege gewinnen den Krieg", res.won === true, res.ourTotal + " : " + res.theirTotal);
      check("Kriegs-Truhe ist GRÖSSER als die Wochen-Truhe",
        res.chest.gold > CHEST_STEPS[2].gold && res.chest.material > CHEST_STEPS[2].material,
        fmt(res.chest.gold) + " vs " + fmt(CHEST_STEPS[2].gold));
      check("Siegesserie + Bronze-Rahmen nach dem 1. Sieg",
        res.warStreak === 1 && res.badge === "bronze", res.badge);
      check("zweiter resolveWar() ist idempotent", resolveWar().won === true);
      // Serie hochzählen: Rahmen wandert Bronze → Silber → Gold → Prisma
      var stW = get();
      [[3, "silver"], [6, "gold"], [10, "prisma"]].forEach(function (p) {
        stW = get();
        stW.clan.warStreak = p[0]; stW.clan.bestStreak = p[0];
        stW.clan = normClan(stW.clan); save(stW);
        check("Serie " + p[0] + " → " + p[1] + "-Rahmen", info().warBadge === p[1], info().warBadge);
      });
      check("nextBadge nennt die Lücke zur nächsten Stufe", (function () {
        stW = get(); stW.clan.warStreak = 4; stW.clan.bestStreak = 4;
        stW.clan = normClan(stW.clan); save(stW);
        var nb = info().nextBadge;
        return nb && nb.key === "gold" && nb.missing === 2;
      })());
      // Niederlage: Serie fällt, Rahmen BLEIBT
      check("Niederlage nullt die Serie, behält aber den Rahmen", (function () {
        stW = get();
        stW.clan.warStreak = 6; stW.clan.bestStreak = 6;
        stW.clan = normClan(stW.clan);
        stW.war = freshWar(weekKeyOf(nowMs()));
        save(stW);
        var r2 = resolveWar();                    // 0 eigene Punkte → Niederlage
        return r2.won === false && get().clan.warStreak === 0 && info().warBadge === "gold";
      })(), "Serie 0, Rahmen " + info().warBadge);
      check("Niederlage liefert eine Trosttruhe",
        get().lastWar.chest.pack === WAR_CHEST_LOSS.pack && get().lastWar.chest.gold > 0);
      check("Rollover wertet einen offenen Krieg automatisch aus", (function () {
        reset(); setT(MON); seedDemoClan();
        setT(wsMon + 5 * DAY + 2 * HOUR);
        var b = warBoard();
        resolveWarAttack(b.targets[0].id, { win: true, stars: 3, hpFrac: 1 });
        setT(MON + 7 * DAY + HOUR);               // neue Woche
        var s3 = get();
        return !!s3.lastWar && s3.lastWar.resolved !== false && s3.war.points === 0;
      })());
    })();

    /* ================= 7. Leaderboard ================= */
    console.log("\n" + "=".repeat(66));
    console.log("LEADERBOARD");
    console.log("=".repeat(66));
    reset(); setT(MON); seedDemoClan();
    TROPH = 1136;
    var lbG = leaderboard("global");
    console.log("Global (Top " + LB_GLOBAL + " von " + lbG.total + "):");
    [0, 1, 2, 49, 99].forEach(function (i) {
      var r = lbG.rows[i];
      if (r) console.log("  #" + pad(r.rank, 5) + pad(r.name, 26) + fmt(r.trophies) + " 🏆");
    });
    console.log("  eigener Rang: #" + lbG.myRank + (lbG.inTop ? " (im Top 100)" : " (angehängt)"));
    check("Global liefert 100 Zeilen (+ eigene, falls außerhalb)",
      lbG.rows.length === LB_GLOBAL + (lbG.inTop ? 0 : 1), lbG.rows.length);
    check("Population = 300 + Spieler", lbG.total === LB_POPULATION + 1, lbG.total);
    check("Ränge lückenlos absteigend nach Trophäen", (function () {
      for (var i = 1; i < LB_GLOBAL; i++) {
        if (lbG.rows[i].rank !== i + 1) return false;
        if (lbG.rows[i].trophies > lbG.rows[i - 1].trophies) return false;
      }
      return true;
    })());
    check("Spitze bei ~9 800 🏆 (Prisma-Gipfel)",
      Math.abs(lbG.rows[0].trophies - LB_TOP) < LB_TOP * 0.05, fmt(lbG.rows[0].trophies));
    check("Spieler ist einsortiert und markiert",
      lbG.rows.some(function (r) { return r.me && r.trophies === 1136; }));
    check("jede Zeile hat Rang, Name, Banner-Mini, Trophäen",
      lbG.rows.every(function (r) {
        return r.rank > 0 && r.name && r.badge && r.badge.symChar && r.trophies >= 0;
      }));
    // arena_rivals.js-Einbindung
    var rivalRows = lbG.rows.concat(leaderboard("around").rows)
      .filter(function (r) { return r.rival; });
    var popRivals = Sim.population(get().clan).filter(function (r) { return r.rival; });
    check("die 12 Rivalen aus arena_rivals.js sind in der Population",
      popRivals.length === 12, popRivals.length + " Rivalen");
    check("Rivalen behalten Namen aus dem Roster (keine Doppelpflege)",
      popRivals.every(function (r) { return /Testrival/.test(r.name); }));
    check("Rivalen liegen in ihrem eigenen Trophäen-Band", (function () {
      var b1 = popRivals.slice(0, 4), b3 = popRivals.slice(8);
      return b1.every(function (r) { return r.trophies < 250; }) &&
             b3.every(function (r) { return r.trophies >= 700; });
    })());
    // Clan-Ansicht
    var lbC = leaderboard("clan");
    console.log("\nClan-intern (" + lbC.rows.length + " Mitglieder), eigener Rang #" + lbC.myRank);
    check("Clan-Ansicht: genau 30 Zeilen", lbC.rows.length === MAX_MEMBERS, lbC.rows.length);
    check("Clan-Ansicht nach Trophäen sortiert", (function () {
      for (var i = 1; i < lbC.rows.length; i++) {
        if (lbC.rows[i].trophies > lbC.rows[i - 1].trophies) return false;
      }
      return true;
    })());
    check("eigene Zeile markiert und findbar",
      lbC.myIndex >= 0 && lbC.rows[lbC.myIndex].me === true, "#" + lbC.myRank);
    // Umgebung
    var lbA = leaderboard("around");
    console.log("Umgebung: Ränge " + lbA.from + "–" + lbA.to + " (" + lbA.rows.length +
      " Zeilen), eigener Rang #" + lbA.myRank);
    check("Umgebung: ±25 Ränge, max 51 Zeilen",
      lbA.rows.length <= 2 * LB_AROUND + 1 && lbA.rows.length > LB_AROUND, lbA.rows.length);
    check("eigene Zeile liegt mittig im Fenster",
      lbA.rows[lbA.myIndex] && lbA.rows[lbA.myIndex].me === true);
    check("Umgebung nutzt DIESELBE Population wie Global",
      lbA.total === lbG.total, lbA.total + " == " + lbG.total);
    check("Trophäen-Änderung verschiebt den Rang", (function () {
      TROPH = 5000;
      var hi = leaderboard("around").myRank;
      TROPH = 200;
      var lo = leaderboard("around").myRank;
      TROPH = 1136;
      return hi < lo;
    })(), "5000 🏆 → besser als 200 🏆");
    check("unbekannte Ansicht fällt auf 'global' zurück",
      leaderboard("quatsch").view === "global");

    /* ================= 8. Emotes + Feed ================= */
    console.log("\nEmotes + Aktivitäts-Feed:");
    check("6 Preset-Sprüche, kein Freitext", EMOTES.length === 6 &&
      EMOTES.every(function (e) { return e.text && e.emoji; }));
    var em = sendEmote("war");
    check("sendEmote() schreibt in den Feed",
      em.ok === true && feed().some(function (f) { return /Alle Mann/.test(f.text); }));
    check("Emote-Cooldown 60 s", throws(function () { sendEmote("gl"); }, "Kurz warten").ok);
    check("nach 60 s wieder möglich", (function () {
      setT(nowMs() + EMOTE_COOLDOWN_MS + 1000);
      return sendEmote("gl").ok === true;
    })());
    check("unbekanntes Emote → Fehler", throws(function () { sendEmote("nope"); }, "Unbekanntes").ok);
    var fd = feed();
    console.log("  " + fd.length + " Feed-Einträge, davon " +
      fd.filter(function (f) { return f.bot; }).length + " von Bots");
    check("Feed mischt Bot-Ereignisse und eigene Notizen",
      fd.some(function (f) { return f.bot; }) && fd.some(function (f) { return !f.bot; }));
    check("Feed ist absteigend nach Zeit sortiert", (function () {
      for (var i = 1; i < fd.length; i++) if (fd[i].ts > fd[i - 1].ts) return false;
      return true;
    })());
    check("Feed-Einträge haben lesbare Zeitangabe",
      fd.every(function (f) { return typeof f.agoText === "string" && f.agoText.length > 2; }),
      fd[0].agoText);
    check("Feed-Einträge liegen nie in der Zukunft",
      fd.every(function (f) { return f.ts <= nowMs(); }));

    /* ================= 9. Migration v1/v2 → v3 =================
       UMGESCHRIEBEN 30.07.2026. Der Block prüfte, dass der v1-Zähler
       `sent: 7` als 7 Einträge im rollierenden Log ankommt und dass das
       Kontingent danach auf 7/10 steht. Beides ist keine Zusage mehr:
       das globale Sendelimit ist ersatzlos entfallen. Gelöscht wird der
       Block deshalb NICHT — er prüft jetzt die neue Zusage, und die ist
       schärfer: der alte Zähler darf NICHT als Rest-Sperre überleben,
       das tragende Feld `donated` dagegen MUSS unverändert durchkommen. */
    console.log("\n" + "=".repeat(66));
    console.log("MIGRATION v1/v2 → v3 (globales Sendelimit fällt weg)");
    console.log("=".repeat(66));
    (function () {
      setT(MON);
      // v1-State, wie ihn eine frühere Fassung geschrieben hätte
      var v1 = {
        v: 1, joined: true,
        clan: { id: "clan_alt", name: "Alter Bund", badge: { color: "gold", sym: "crown" },
                desc: "aus v1", joinMode: "open", minTrophies: 500, created: MON - 30 * DAY,
                seed: 777, anchor: 900, warWins: 3, warStreak: 3 },
        me: { id: "me", role: "elder", joinedTs: MON - 20 * DAY, lastRequestTs: MON - 9 * HOUR },
        quests: { week: weekKeyOf(MON), wins: 14, packs: 3, trophies: 220, claimed: false },
        sent: 7, sentSince: MON - HOUR,          // ← das alte Cooldown-Modell
        donated: { "r:alt:0:0": 6 },             // ← die neue, tragende Grenze
        notes: [{ ts: MON - HOUR, kind: "donate", text: "alte Notiz" }],
        stats: { donatedTotal: 41, receivedTotal: 12, warPointsTotal: 830 },
      };
      lsSet(JSON.stringify(v1));
      var s = get();
      console.log("  v1 { sent: 7, sentSince: t−1h }  →  v3 " +
        (s.sendLog === undefined ? "ohne sendLog" : "MIT sendLog?!"));
      check("State-Version auf 3 gehoben", s.v === 3);
      check("Clan-Stammdaten übernommen",
        s.clan.name === "Alter Bund" && s.clan.badge.sym === "crown" && s.clan.seed === 777);
      check("eigene Rolle übernommen", s.me.role === "elder");
      check("flache Quest-Zähler → quests.progress",
        s.quests.progress.wins === 14 && s.quests.progress.packs === 3 &&
        s.quests.progress.trophies === 220);
      check("alter Sendezähler ist WEG (sent/sentSince/sendLog)",
        s.sendLog === undefined && s.sent === undefined && s.sentSince === undefined,
        JSON.stringify({ sendLog: s.sendLog, sent: s.sent }));
      check("die tragende Grenze `donated` kommt UNVERÄNDERT durch",
        s.donated["r:alt:0:0"] === 6 && sendQuota("r:alt:0:0").used === 6 &&
        sendQuota("r:alt:0:0").left === DONATE_MAX_PER_REQUEST - 6,
        sendQuota("r:alt:0:0").used + "/" + DONATE_MAX_PER_REQUEST);
      check("eine unbeschriebene Anfrage startet nach der Migration bei 0/10",
        sendQuota("r:neu:0:0").used === 0 &&
        sendQuota("r:neu:0:0").left === DONATE_MAX_PER_REQUEST);
      check("Kriegs-Serie 3 → Silber-Rahmen (aus v1 abgeleitet)",
        s.clan.warBadge === "silver", s.clan.warBadge);
      check("alte Notizen bleiben erhalten",
        s.notes.some(function (n) { return n.text === "alte Notiz"; }));
      check("Statistik übernommen", s.stats.donatedTotal === 41 && s.stats.warPointsTotal === 830);
      check("Migration ist idempotent (zweites get() ändert nichts)", (function () {
        save(get());
        var s2 = get();
        return s2.v === 3 && s2.sendLog === undefined && s2.quests.progress.wins === 14 &&
               s2.donated["r:alt:0:0"] === 6;
      })());
      // State ohne v-Feld (Vor-Versionierung)
      lsSet(JSON.stringify({ joined: true, clan: { name: "Uralt", seed: 5 }, sent: 2, sentSince: MON }));
      var s3 = get();
      check("State OHNE v-Feld wird wie v1 behandelt",
        s3.v === 3 && s3.clan.name === "Uralt" && s3.sendLog === undefined);
      // Reiner v2-Stand: nur der Sprung 2 → 3
      lsSet(JSON.stringify({ v: 2, joined: true, clan: { name: "Zwoter", seed: 9 },
        sendLog: [MON - MINUTE, MON - 2 * MINUTE], donated: { "r:x:0:1": 10 } }));
      var s4 = get();
      check("reiner v2-Stand: sendLog fällt, donated bleibt",
        s4.v === 3 && s4.sendLog === undefined && s4.donated["r:x:0:1"] === 10 &&
        sendQuota("r:x:0:1").full === true,
        "10/10 bleibt gesperrt");
    })();

    /* ================= 10. Robustheit ================= */
    console.log("\nRobustheit:");
    check("Müll im Speicher → frischer State, kein Crash", (function () {
      lsSet("{kaputt,,,");
      var s = get();
      return s.v === STATE_VERSION && s.joined === false &&
             s.donated && typeof s.donated === "object";
    })());
    check("kaputter State wird geheilt", (function () {
      lsSet(JSON.stringify({
        v: 2, joined: true,
        clan: { name: "X".repeat(80), badge: { color: "neonpink", sym: "ufo" },
                minTrophies: -50, warStreak: -3, seed: 11, anchor: 0 },
        me: { role: "gottkaiser" },
        quests: { week: "x", progress: { wins: -5, packs: "viele" } },
        sendLog: ["quatsch", 0, -1, 5, nowMs()],
        requests: "keinArray", donated: null, notes: 42, war: "kaputt",
      }));
      var s = get();
      return s.clan.name.length === NAME_MAX && s.clan.badge.color === BADGE_COLORS[0].key &&
             s.clan.badge.sym === BADGE_SYMBOLS[0].key && s.clan.minTrophies === 0 &&
             s.clan.warStreak === 0 && s.clan.anchor >= 100 &&
             s.me.role === "member" && s.quests.progress.wins === 0 &&
             s.quests.progress.packs === 0 && s.sendLog === undefined &&
             Array.isArray(s.requests) && Array.isArray(s.notes) &&
             typeof s.donated === "object" && typeof s.war === "object";
    })(), JSON.stringify(get().clan.badge));
    /* ERSETZT den alten Schritt „Zukunfts-Zeitstempel im sendLog werden
       verworfen" (30.07.2026). Es gibt keine Zeitstempel mehr zu heilen —
       zu heilen ist jetzt `donated`, und zwar in der Richtung, die zählt:
       ein manipulierter Eintrag darf die Grenze nur SENKEN, nie heben. */
    check("manipuliertes `donated` wird auf 0…10 geklemmt", (function () {
      reset(); setT(MON); seedDemoClan();
      var s = get();
      s.donated = { "r:a:0:0": 99, "r:b:0:0": -4, "r:c:0:0": 3.7 };
      save(s);
      var g = get();
      return sendQuota("r:a:0:0").used === DONATE_MAX_PER_REQUEST &&   // 99 → 10, gesperrt
             g.donated["r:b:0:0"] === undefined &&                     // −4 → weg
             sendQuota("r:c:0:0").used === 3;                          // 3,7 → 3
    })(), "99 → 10, −4 → weg, 3,7 → 3");
    check("`donated` wächst nicht endlos (Deckel " + DONATED_KEEP + " Einträge)", (function () {
      reset(); setT(MON); seedDemoClan();
      var s = get();
      for (var i = 0; i < DONATED_KEEP + 25; i++) s.donated["r:alt:" + i + ":0"] = 2;
      save(s);
      var n = Object.keys(get().donated).length;
      // Die JÜNGSTEN bleiben — die ältesten Anfragen gibt es längst nicht mehr.
      return n === DONATED_KEEP &&
             get().donated["r:alt:" + (DONATED_KEEP + 24) + ":0"] === 2 &&
             get().donated["r:alt:0:0"] === undefined;
    })(), Object.keys(get().donated).length + " Einträge");
    check("Aktionen ohne Clan werfen klare Meldungen", (function () {
      reset();
      return throws(function () { requestCards("fire"); }, "in keinem Clan").ok &&
             throws(function () { sendEmote("gl"); }, "in keinem Clan").ok &&
             throws(function () { startWarAttack("g0"); }, "in keinem Clan").ok &&
             reportEvent("win", 1).reason === "noclan" &&
             members().length === 0 && quests().length === 0 && requests().length === 0;
    })());
    check("Leaderboard funktioniert auch ohne Clan",
      leaderboard("global").rows.length > 0 && leaderboard("clan").rows.length === 0);
    check("fehlendes ArenaCards → klare Meldung, kein Crash", (function () {
      reset(); setT(MON); seedDemoClan();
      var keep = globalThis.ArenaCards;
      delete globalThis.ArenaCards;
      var rr = requests().filter(function (r) { return !r.mine && r.left > 0; })[0];
      var okQuota = sendQuota(rr.id).used === 0;
      var okList = donatableCards().every(function (c) { return c.copies === 0 && !c.sendable; });
      var t = throws(function () { donateCards(rr.id, 1); });
      globalThis.ArenaCards = keep;
      return okQuota && okList && t.ok;
    })());
    check("fehlendes ArenaProfile → 0 Trophäen", (function () {
      var keep = globalThis.ArenaProfile;
      delete globalThis.ArenaProfile;
      var ok = trophiesNow() === 0 && peakTrophies() === 0 && leaderboard("global").rows.length > 0;
      globalThis.ArenaProfile = keep;
      return ok;
    })());
    check("fehlendes ArenaRivals → Population trotzdem voll", (function () {
      var keep = globalThis.ArenaRivals;
      delete globalThis.ArenaRivals;
      var n = Sim.population(get().clan).length;
      globalThis.ArenaRivals = keep;
      return n === LB_POPULATION;
    })(), LB_POPULATION + " Zeilen");
    check("createClan prüft Name und Presets",
      throws(function () { createClan({ name: "ab" }); }, "3–20 Zeichen").ok &&
      throws(function () { createClan({ name: "Testclan", color: "neon" }); }, "Banner-Farbe").ok &&
      throws(function () { createClan({ name: "Testclan", sym: "ufo" }); }, "Banner-Symbol").ok);
    check("leaveClan() räumt auf, Notizen bleiben", (function () {
      reset(); setT(MON); seedDemoClan();
      var r = leaveClan();
      var s = get();
      return r.left === true && s.joined === false && s.clan === null && s.notes.length > 0;
    })());
    check("reset() nullt alles", (function () {
      var s = reset();
      return s.joined === false && Object.keys(s.donated).length === 0 &&
             s.notes.length === 0 && s.quests.progress.wins === 0;
    })());

    /* ================= 11. Vollständigkeit der API ================= */
    var NEED = ["get", "info", "members", "createClan", "joinClan", "leaveClan",
      "reportEvent", "quests", "chestTier", "claimWeekChest",
      "requestCards", "cancelRequest", "requests", "donateCards", "sendQuota",
      "donatableCards", "assertSendable", "canSend", "isTower", "registerTower",
      "warPhase", "warBoard", "startWarAttack", "resolveWarAttack", "resolveWar",
      "leaderboard", "feed", "notifications", "sendEmote", "reset"];
    check("API vollständig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");
    check("ClanSim ist als Server-Naht exportiert",
      ["members", "requests", "questContribution", "enemyClan", "ghostBuilds",
       "warTotals", "feed", "population"].every(function (k) {
        return typeof Sim[k] === "function";
      }));

    API._clock(null);
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
