/* ==================================================================
 * ARENA FRIENDS — Freundesliste, Freundschaftsanfragen, Freundes-Duell
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Gebaut wie arena_clan.js und
 * arena_daily.js; wer eines von beiden kennt, findet sich hier sofort
 * zurecht.
 *
 * WOFÜR: In AA sitzt oben rechts vor dem Hamburger-Menü ein
 * Personen-Icon — die Freundesliste. Dieses Modul liefert die Logik
 * dahinter. Das UI (Knopf, View, Badge) hängt sich generisch an die
 * API; es kennt keine der hier benutzten Datenstrukturen im Detail.
 *
 * ------------------------------------------------------------------
 * DIE DREI SCHICHTEN — und was man wo ändert
 * ------------------------------------------------------------------
 *   1. DATEN (§1)   Konstanten und die Demo-Bevölkerung.
 *                   · Limits, Fristen, Formate  → hier ändern.
 *                   · DEMO_FRIENDS / DEMO_STRANGERS: die PLATZHALTER.
 *                     Sie tragen alle `demo:true` und fliegen raus,
 *                     sobald ein Server echte Spieler liefert. Neue
 *                     Platzhalter NUR hier eintragen.
 *   2. LOGIK (§2)   Persistenz (FriendState) + Simulation (Sim).
 *                   · FriendState  = persistiert unter "arenaFriends":
 *                     alles, was dem SPIELER gehört — eigener Code,
 *                     seine Freundschaften, seine gesendeten Anfragen,
 *                     seine Antworten auf eingehende Anfragen, sein
 *                     Duell-Log, seine Notizen.
 *                   · Sim = berechnet, persistiert NICHTS: Online-Status,
 *                     Trophäen-Drift und Antwortverhalten der
 *                     Demo-Spieler. Reine Funktion aus (id, now).
 *                     Ein echter Server ersetzt genau diese Funktionen
 *                     1:1 — weil kein Bot-Zustand gespeichert wird,
 *                     gibt es dabei KEINE Datenmigration.
 *                   · Neue Regel/Frist/Prüfung → hier ändern.
 *   3. API (§3)     Was das UI sieht. Jede Funktion liefert fertige
 *                   Anzeigefelder (agoText, arenaName, …), damit das UI
 *                   nicht rechnet. Neue View-Felder → hier ergänzen,
 *                   nicht im UI zusammenbauen.
 *
 * ------------------------------------------------------------------
 * ZWEI BEWUSSTE ENTSCHEIDUNGEN (Abweichungen von AA)
 * ------------------------------------------------------------------
 * A) DAS FREUNDES-DUELL KOSTET UND GIBT KEINE TROPHÄEN (DUEL_TROPHIES
 *    = 0), und es meldet auch KEIN Ereignis an ArenaDaily/ArenaClan.
 *    Grund: Ein Duell, das man frei gegen einen selbst gewählten Gegner
 *    startet, ist absprechbar. Mit Trophäen daran wird die Rangliste
 *    über abgesprochene Duelle manipulierbar (zwei Accounts schieben
 *    sich gegenseitig hoch); mit Quest-Fortschritt daran wird der
 *    tägliche Loop farmbar. Das Duell zahlt deshalb ausschließlich auf
 *    eine private BILANZ ein (duelRecord) — Angeberei, keine Währung.
 *    Falls AA das anders hält: bewusste Abweichung, siehe oben.
 *
 * B) KARTENSPENDE NUR UNTER CLAN-MITGLIEDERN. Karten wandern
 *    ausschließlich über die Anfragetafel des Clans, mit dessen
 *    Sendekontingent (10 Stück / 3 h), dessen Tier-Sperre (nur graue
 *    Basis-Kopien) und dessen Bestandsprüfung. Eine direkte
 *    Freundesspende wäre ein zweiter Kanal am Clan-System vorbei — und
 *    damit dessen Limits ausgehebelt. giftCards() DELEGIERT deshalb an
 *    ArenaClan.donateCards(); dieses Modul dupliziert weder Quote noch
 *    Prüfung noch Buchung. Wer die Spendenregeln ändern will, ändert
 *    arena_clan.js — hier steht keine einzige davon.
 *
 * ------------------------------------------------------------------
 * WÄHRUNGS-ZUSTÄNDIGKEIT (identisch zum Rest des Projekts)
 * ------------------------------------------------------------------
 * Dieses Modul bucht NICHTS. Keine Trophäen (siehe A), kein Gold, keine
 * Karten (die bucht ArenaClan über ArenaCards, siehe B). Es hält
 * Beziehungen und Bilanzen — sonst nichts.
 *
 * ------------------------------------------------------------------
 * WIRING
 * ------------------------------------------------------------------
 *   1. <script src="arena_friends.js"></script> NACH arena_clan.js
 *      (die Spende delegiert dorthin; fehlt es, wirft nur die Spende,
 *      alles andere läuft).
 *   2. Prototyp einmalig füllen:  ArenaFriends.seedDemoFriends();
 *   3. Badge am Freundes-Knopf:   ArenaFriends.pendingCount()
 *   4. View öffnen → markSeen(), damit der Zähler zurückgeht.
 *   5. Duell: startDuel(id) → Match im Spiel → resolveDuel(id, {win}).
 *
 * Fremde Module werden IMMER defensiv gelesen (ArenaClan, ArenaAvatars,
 * ArenaProfile): fehlt eines, arbeitet dieses Modul mit Rückfallwerten
 * weiter, statt an einer undefined-Property zu sterben.
 *
 * Selbsttest: `node arena_patches/arena_friends.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  /* Der Schlüssel trägt KEINE Version im Namen — die Version steht IM
   * Zustand (Feld `v`), genau wie bei arena_clan.js und arena_daily.js.
   * Ein versionierter Schlüssel ("arenaFriends_v2") würde bei jedem
   * Sprung den alten Stand verwaisen lassen, statt ihn zu migrieren. */
  var KEY = "arenaFriends";
  var STATE_VERSION = 1;

  /* ==================================================================
   * §1 DATEN — Konstanten und Demo-Bevölkerung
   * ================================================================== */

  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;

  /* ---- Limits und Fristen ---- */
  var MAX_FRIENDS = 50;            // Deckel der Freundesliste
  var MAX_OUTGOING = 10;           // gleichzeitig offene eigene Anfragen
  var ONLINE_MS = 5 * MINUTE;      // ab hier gilt jemand als „offline“
  var PRESENCE_BUCKET = 5 * MINUTE; // Takt, in dem der Status wechselt
  var ANSWER_MS = 6 * HOUR;        // bis eine gesendete Anfrage beantwortet wird
  var ACCEPT_P = 0.7;              // Wahrscheinlichkeit, dass sie angenommen wird
  var SEARCH_MIN = 3;              // Mindestlänge einer Namenssuche
  var NOTES_MAX = 40;
  var DUELS_MAX = 60;              // Länge des Duell-Logs

  /* DIE ZAHL, UM DIE ES IN ENTSCHEIDUNG A GEHT. Sie steht als benannte
   * Konstante da und nicht als literale 0 im Code, damit sie im Test
   * und im UI zitierbar ist — und damit auffällt, wenn jemand sie
   * ändern will. */
  var DUEL_TROPHIES = 0;

  /* ---- Freundescode ----
   * Format: APT-XXXX-XXXX. Das Alphabet lässt I, O, 0 und 1 weg — ein
   * Code wird vorgelesen und abgetippt, und genau diese vier Zeichen
   * verwechselt man dabei. */
  var CODE_PREFIX = "APT";
  var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var CODE_GROUP = 4;

  var ELEMENTS = ["fire", "water", "nature", "earth", "light", "darkness"];
  var EL_NAME = { fire: "Feuer", water: "Wasser", nature: "Natur",
                  earth: "Erde", light: "Licht", darkness: "Finsternis" };

  /* Rückfall-Arenaleiter. ERSTE Wahl ist ArenaAvatars.ARENAS — diese
   * Tabelle greift nur, wenn das Modul fehlt (Standalone-Test,
   * Teil-Einbau). Wer dort eine Schwelle ändert, zieht sie hier mit. */
  var ARENAS_FALLBACK = [
    { n: 1, name: "Kristallhof", at: 0 },
    { n: 2, name: "Smaragdtal", at: 300 },
    { n: 3, name: "Saphirfeste", at: 600 },
    { n: 4, name: "Sturmspitze", at: 900 },
    { n: 5, name: "Obsidian-Thron", at: 1200 },
    { n: 6, name: "Prisma-Zitadelle", at: 1500 },
    { n: 7, name: "Aschenmark", at: 2000 },
    { n: 8, name: "Frostbastion", at: 2500 },
  ];

  /* ==================================================================
   * DEMO-BEVÖLKERUNG — PLATZHALTER, NICHT INHALT
   * ------------------------------------------------------------------
   * Alle Einträge tragen `demo:true` und eine id mit Präfix "demo_".
   * Sie ersetzen den Spielerverzeichnis-Dienst, den es noch nicht gibt.
   * SOBALD EIN SERVER LIEFERT: beide Listen leeren und Sim.directory()
   * gegen den echten Dienst tauschen — sonst nichts.
   *
   *   act    Aktivitätsrate 0..1 → wie oft jemand online ist
   *   want   true = diese Person hat DIR bereits eine Anfrage geschickt
   *   seed   Basis-Trophäen; der Tagesdrift liegt in Sim.trophies()
   * ================================================================== */
  var DEMO_FRIENDS = [
    { id: "demo_pim", name: "Pim Nebelgang", title: "Demo-Freund",
      el: "water", seed: 1180, act: 0.55, demo: true },
    { id: "demo_nessa", name: "Nessa Glutfaust", title: "Demo-Freundin",
      el: "fire", seed: 1420, act: 0.30, demo: true },
    { id: "demo_orlo", name: "Orlo Steinherz", title: "Demo-Freund",
      el: "earth", seed: 860, act: 0.18, demo: true },
    { id: "demo_lyra", name: "Lyra Sternhauch", title: "Demo-Freundin",
      el: "light", seed: 1610, act: 0.42, demo: true },
    { id: "demo_kael", name: "Kael Aschenblick", title: "Demo-Freund",
      el: "darkness", seed: 640, act: 0.08, demo: true },
  ];
  /* Fremde: tauchen in der SUCHE auf. Wer `want:true` trägt, hat dem
   * Spieler bereits eine Freundschaftsanfrage geschickt — das ist die
   * Startbelegung der Eingangsliste. */
  var DEMO_STRANGERS = [
    { id: "demo_brann", name: "Brann Dornenschritt", title: "Demo-Spieler",
      el: "nature", seed: 990, act: 0.35, want: true, demo: true },
    { id: "demo_ilva", name: "Ilva Frostmähne", title: "Demo-Spielerin",
      el: "water", seed: 1340, act: 0.26, want: true, demo: true },
    { id: "demo_gorm", name: "Gorm Silberzahn", title: "Demo-Spieler",
      el: "earth", seed: 2120, act: 0.61, demo: true },
    { id: "demo_selune", name: "Selune Lichtträger", title: "Demo-Spielerin",
      el: "light", seed: 2740, act: 0.14, demo: true },
    { id: "demo_vex", name: "Vex Hohlklang", title: "Demo-Spieler",
      el: "darkness", seed: 410, act: 0.47, demo: true },
    { id: "demo_thraxus", name: "Thraxus Flammenhüter", title: "Demo-Spieler",
      el: "fire", seed: 1760, act: 0.22, demo: true },
  ];

  /* ==================================================================
   * §2 LOGIK
   * ================================================================== */

  /* ---- Determinismus-Werkzeug (identisch zu arena_clan.js) ----
   * FNV-1a über die verketteten Argumente MIT murmur3-Finalisierung.
   * Die Finalisierung ist keine Kosmetik: reines FNV-1a mischt die
   * ZULETZT eingespeisten Bytes kaum, und genau die variieren bei uns
   * (…|bucket). Ohne fmix32 wären aufeinanderfolgende Buckets
   * korreliert — der Online-Status würde im Takt blinken. */
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
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  /* ts0(v) — Zeitstempel normalisieren. NIEMALS `v | 0` benutzen:
   * Millisekunden-Zeitstempel sind > 2³¹ und werden von einer 32-Bit-
   * Bit-Operation zerstört (1 784 538 000 000 | 0 = −1 246 083 072).
   * Genau dieser Fehler hat in arena_clan.js den 8-h-Cooldown
   * ausgehebelt; hier hinge die Antwortfrist der gesendeten Anfragen
   * daran. Deshalb dasselbe ts0()-Muster, wortgleich. */
  function ts0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  function n0(v) { return (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0; }

  /* CLOCK ist der Test-Hook (_clock). Direktes Date.now() steht im
   * ganzen Modul nur an dieser einen Stelle. */
  var CLOCK = null;
  function nowMs(override) {
    if (typeof override === "number" && isFinite(override)) return override;
    return CLOCK ? CLOCK() : Date.now();
  }

  /* ---- Zeittexte (deutsch, wie arena_clan.js) ---- */
  function hhmm(ms) {
    if (!ms || ms <= 0) return "0:00";
    var m = Math.ceil(ms / MINUTE), h = Math.floor(m / 60);
    m = m % 60;
    return h + ":" + (m < 10 ? "0" : "") + m;
  }
  function ago(ms) {
    if (ms < MINUTE) return "gerade eben";
    if (ms < HOUR) return "vor " + Math.floor(ms / MINUTE) + " min";
    if (ms < DAY) return "vor " + Math.floor(ms / HOUR) + " h";
    return "vor " + Math.floor(ms / DAY) + " Tag" + (Math.floor(ms / DAY) === 1 ? "" : "en");
  }

  /* ---- Brücke zu den Nachbarmodulen (alles defensiv) ---- */
  function hostObj() {
    if (typeof window !== "undefined" && window) return window;
    if (typeof globalThis !== "undefined" && globalThis) return globalThis;
    return null;
  }
  function clanMod() {
    var h = hostObj();
    return (h && h.ArenaClan) || null;
  }
  function clanOrThrow() {
    var c = clanMod();
    if (!c) throw new Error("Clan-System nicht verfügbar — arena_clan.js fehlt.");
    return c;
  }
  function arenas() {
    try {
      var h = hostObj(), a = h && h.ArenaAvatars;
      if (a && Array.isArray(a.ARENAS) && a.ARENAS.length) return a.ARENAS;
    } catch (e) {}
    return ARENAS_FALLBACK;
  }
  function arenaFor(trophies) {
    var list = arenas(), n = 1;
    for (var i = 0; i < list.length; i++) if (trophies >= list[i].at) n = list[i].n;
    return n;
  }
  function arenaNameOf(n) {
    var list = arenas();
    for (var i = 0; i < list.length; i++) if (list[i].n === n) return list[i].name;
    return "";
  }
  function myTrophies(override) {
    if (typeof override === "number" && isFinite(override)) return Math.max(0, Math.floor(override));
    try {
      var h = hostObj(), p = h && h.ArenaProfile;
      if (p && typeof p.get === "function") {
        var t = (p.get() || {}).trophies;
        if (typeof t === "number" && isFinite(t)) return Math.max(0, Math.floor(t));
      }
    } catch (e) {}
    return 0;
  }

  /* ---- Freundescode ---- */
  function codeGroup(seedA, seedB) {
    var h = hash(seedA, seedB), out = "";
    for (var i = 0; i < CODE_GROUP; i++) {
      out += CODE_ALPHABET.charAt(h % CODE_ALPHABET.length);
      h = Math.floor(h / CODE_ALPHABET.length) + hash(seedA, seedB, i) % 97;
    }
    return out;
  }
  function codeOf(seed) {
    return CODE_PREFIX + "-" + codeGroup(seed, "a") + "-" + codeGroup(seed, "b");
  }
  /* Vergleichsform eines Codes: Großbuchstaben, ohne Trennzeichen und
   * Leerraum. Damit ist "apt zk4m-9prq" derselbe Code wie
   * "APT-ZK4M-9PRQ" — abgetippte Codes kommen selten formatiert an. */
  function codeNorm(s) {
    return String(s == null ? "" : s).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function looksLikeCode(s) {
    var c = codeNorm(s);
    return c.indexOf(CODE_PREFIX) === 0 && c.length === CODE_PREFIX.length + 2 * CODE_GROUP;
  }

  /* ---- Persistenz ---- */
  var memStore = null;               // Node-Fallback

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
    return {
      v: STATE_VERSION,
      created: 0,                    // erster Kontakt; Basis des eigenen Codes
      code: "",                      // eigener Freundescode (einmal vergeben)
      friends: [],                   // {id, name, memberId, el, seed, since, fav}
      outgoing: [],                  // {id, name, ts, done}
      handled: {},                   // {dirId: "accepted"|"declined"}
      duels: [],                     // {id, ts, win}
      notes: [],                     // {ts, kind, text}
      seenTs: 0,                     // letzter Blick in die Liste (Badge)
      stats: { duels: 0, duelWins: 0, gifted: 0, added: 0 },
    };
  }

  /* migrateState(old) — Platzhalter für den ersten Versionssprung.
   * v1 ist die erste Fassung, es gibt also nichts zu migrieren. Die
   * Naht steht trotzdem: sie ist der Ort, an dem v1→v2 später steht,
   * und get() ruft sie bereits auf. Unbekannte Stände landen auf einem
   * frischen Zustand mit übernommenen Notizen — kein stiller Datenmüll. */
  function migrateState(old) {
    var s = fresh();
    if (old && Array.isArray(old.notes)) s.notes = old.notes.slice(0, NOTES_MAX);
    return s;
  }

  /* Verzeichnis: DEMO_FRIENDS + DEMO_STRANGERS, indiziert.
   * Sim.directory() ist die Server-Naht — ein echter Dienst ersetzt
   * genau diese Funktion. */
  var Sim = {};
  Sim.directory = function () { return DEMO_FRIENDS.concat(DEMO_STRANGERS); };

  var DIR_BY_ID = null;
  function dirById(id) {
    if (!DIR_BY_ID) {
      DIR_BY_ID = {};
      Sim.directory().forEach(function (p) { DIR_BY_ID[p.id] = p; });
    }
    return DIR_BY_ID[String(id)] || null;
  }

  /* Sim.presence(p, now) → {online, lastSeen, idleMs, agoText}
   * Der Status wechselt im PRESENCE_BUCKET-Takt und ist eine reine
   * Funktion aus (id, bucket) — zwei Aufrufe innerhalb derselben fünf
   * Minuten liefern dasselbe, das UI kann also frei neu rendern, ohne
   * dass jemand flackert. */
  Sim.presence = function (p, now) {
    now = nowMs(now);
    var bucket = Math.floor(now / PRESENCE_BUCKET);
    /* ALLE Zeitangaben hängen am Bucket-BEGINN, nicht an `now`. Sonst
     * wäre `lastSeen` sekundengenau verschieden bei jedem Rendern —
     * und die Liste sortierte sich unter dem Finger neu. */
    var t0 = bucket * PRESENCE_BUCKET;
    var act = clamp(typeof p.act === "number" ? p.act : 0.3, 0, 1);
    var online = h01(p.id, "on", bucket) < act;
    if (online) {
      return { online: true, lastSeen: t0, idleMs: 0, agoText: "online" };
    }
    /* Abwesenheit läuft im Stundentakt, nicht im Fünf-Minuten-Takt:
     * sonst springt „zuletzt gesehen vor 3 h“ alle fünf Minuten auf
     * einen anderen Wert. Je aktiver jemand ist, desto kürzer ist die
     * Pause — sonst wäre „oft online“ und „lange weg“ gleichzeitig wahr. */
    var hourBucket = Math.floor(now / HOUR);
    var span = (3.5 - 3 * act) * DAY;
    var idle = ONLINE_MS + Math.round(h01(p.id, "idle", hourBucket) * span);
    return { online: false, lastSeen: t0 - idle, idleMs: idle, agoText: ago(idle) };
  };

  /* Sim.trophies(p, now) → Trophäenstand mit Tagesdrift.
   * Der Drift hängt am Tages-Bucket: die Liste bewegt sich sichtbar,
   * springt aber nicht bei jedem Rendern. */
  Sim.trophies = function (p, now) {
    var day = Math.floor(nowMs(now) / DAY);
    var drift = Math.round((h01(p.id, "tro", day) - 0.5) * 180);
    return Math.max(0, (p.seed | 0) + drift);
  };

  /* Sim.answersRequest(id) → nimmt der Angeschriebene an?
   * Reine Funktion aus der id; die FRIST steckt in syncOutgoing(). */
  Sim.answersRequest = function (id) {
    return h01(id, "answer") < ACCEPT_P;
  };

  /* Sim.deck(id) → Deck für ein Freundes-Duell, Format wie die
   * Ghost-Builds in arena_clan.js: [Element, Element, +4 gemischte]. */
  Sim.deck = function (id, el) {
    var deck = [el, el];
    for (var d = 0; d < 4; d++) deck.push(ELEMENTS[hash(id, "deck", d) % ELEMENTS.length]);
    return deck;
  };

  /* ---- Zustand lesen, heilen, fortschreiben ---- */

  function get(now) {
    now = nowMs(now);
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var known = s.friends !== undefined || s.outgoing !== undefined || s.code !== undefined;
    if (s.v !== STATE_VERSION && known) s = migrateState(s);
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    s.v = STATE_VERSION;

    s.created = ts0(s.created) || now;
    if (typeof s.code !== "string" || !looksLikeCode(s.code)) s.code = codeOf("me:" + s.created);

    if (!Array.isArray(s.friends)) s.friends = [];
    s.friends = s.friends.filter(function (e) { return e && e.id; }).map(function (e) {
      return {
        id: String(e.id),
        name: String(e.name || ""),
        memberId: e.memberId ? String(e.memberId) : null,
        el: ELEMENTS.indexOf(e.el) >= 0 ? e.el : ELEMENTS[hash(e.id, "el") % ELEMENTS.length],
        seed: Math.max(0, n0(e.seed)),
        act: (typeof e.act === "number" && isFinite(e.act)) ? clamp(e.act, 0, 1) : 0.3,
        since: ts0(e.since),
        fav: !!e.fav,
        demo: !!e.demo,
      };
    }).slice(0, MAX_FRIENDS);

    if (!Array.isArray(s.outgoing)) s.outgoing = [];
    s.outgoing = s.outgoing.filter(function (e) { return e && e.id && !e.done; }).map(function (e) {
      return { id: String(e.id), name: String(e.name || ""), ts: ts0(e.ts) || now, done: false };
    }).slice(0, MAX_OUTGOING);

    if (!s.handled || typeof s.handled !== "object") s.handled = {};
    if (!Array.isArray(s.duels)) s.duels = [];
    s.duels = s.duels.filter(function (d) { return d && d.id; })
                     .map(function (d) { return { id: String(d.id), ts: ts0(d.ts), win: !!d.win }; })
                     .slice(0, DUELS_MAX);
    if (!Array.isArray(s.notes)) s.notes = [];
    s.notes = s.notes.slice(0, NOTES_MAX);
    s.seenTs = ts0(s.seenTs);
    if (!s.stats || typeof s.stats !== "object") s.stats = f.stats;
    for (var sk in f.stats) s.stats[sk] = Math.max(0, n0(s.stats[sk]));
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function note(s, kind, text, ts) {
    s.notes.unshift({ ts: ts0(ts) || nowMs(), kind: kind, text: text });
    s.notes = s.notes.slice(0, NOTES_MAX);
  }

  /* syncOutgoing(s, now) — LAZY: gesendete Anfragen werden beim LESEN
   * beantwortet, nicht von einem Timer. Dasselbe Muster wie der
   * Wochen-Rollover in arena_clan.js: kein setInterval, kein
   * Hintergrund-Job, und der Zustand ist auch nach zwei Wochen ohne
   * Start des Spiels korrekt. */
  function syncOutgoing(s, now) {
    now = nowMs(now);
    var changed = false, rest = [];
    for (var i = 0; i < s.outgoing.length; i++) {
      var o = s.outgoing[i];
      if (now - o.ts < ANSWER_MS) { rest.push(o); continue; }
      changed = true;
      if (Sim.answersRequest(o.id) && s.friends.length < MAX_FRIENDS) {
        addFriendRaw(s, o.id, now);
        note(s, "accepted", o.name + " hat deine Freundschaftsanfrage angenommen.", o.ts + ANSWER_MS);
      } else {
        note(s, "declined", o.name + " hat deine Freundschaftsanfrage abgelehnt.", o.ts + ANSWER_MS);
      }
    }
    if (changed) s.outgoing = rest;
    return changed;
  }

  /* live(now) — der EINE Einstieg für alle API-Funktionen: lesen,
   * heilen, lazy nachziehen, bei Änderung schreiben. */
  function live(now) {
    now = nowMs(now);
    var s = get(now);
    if (syncOutgoing(s, now)) save(s);
    return s;
  }

  function findFriend(s, id) {
    id = String(id);
    for (var i = 0; i < s.friends.length; i++) if (s.friends[i].id === id) return s.friends[i];
    return null;
  }
  function findOutgoing(s, id) {
    id = String(id);
    for (var i = 0; i < s.outgoing.length; i++) if (s.outgoing[i].id === id) return s.outgoing[i];
    return null;
  }

  /* addFriendRaw — die einzige Stelle, an der ein Freund entsteht.
   * Nimmt entweder eine Verzeichnis-id oder ein fertiges Datenobjekt
   * (Clan-Mitglieder haben keinen Verzeichnis-Eintrag). */
  function addFriendRaw(s, idOrObj, now) {
    var p = typeof idOrObj === "object" && idOrObj ? idOrObj : dirById(idOrObj);
    if (!p) return null;
    if (findFriend(s, p.id)) return findFriend(s, p.id);
    var e = {
      id: String(p.id), name: String(p.name || ""),
      memberId: p.memberId ? String(p.memberId) : null,
      el: ELEMENTS.indexOf(p.el) >= 0 ? p.el : ELEMENTS[hash(p.id, "el") % ELEMENTS.length],
      seed: Math.max(0, n0(p.seed)),
      act: (typeof p.act === "number" && isFinite(p.act)) ? clamp(p.act, 0, 1) : 0.3,
      since: ts0(now) || nowMs(), fav: false, demo: !!p.demo,
    };
    s.friends.push(e);
    s.stats.added++;
    return e;
  }

  /* clanMemberOf(e) → der Clan-Datensatz eines Freundes oder null.
   * EINZIGE Quelle für „ist im selben Clan“: ArenaClan.members(). Es
   * gibt hier keine zweite Mitgliederliste, die auseinanderlaufen
   * könnte. */
  function clanMemberOf(e, now) {
    if (!e || !e.memberId) return null;
    var C = clanMod();
    if (!C || typeof C.members !== "function") return null;
    try {
      var inf = typeof C.info === "function" ? C.info(now) : null;
      if (inf && inf.joined === false) return null;
      var ms = C.members(now);
      for (var i = 0; i < ms.length; i++) if (ms[i].id === e.memberId) return ms[i];
    } catch (err) {}
    return null;
  }

  /* viewFriend(e, now) → das fertige Anzeigeobjekt.
   * Clan-Mitglieder liefern Name, Trophäen und Aktivität aus dem
   * CLAN-Datensatz; alles andere aus Sim. So steht ein Freund, der auch
   * Clankamerad ist, in beiden Listen mit denselben Zahlen. */
  function viewFriend(e, s, now) {
    now = nowMs(now);
    var m = clanMemberOf(e, now);
    var trophies, pres, name = e.name;
    if (m) {
      name = m.name || e.name;
      trophies = Math.max(0, m.trophies | 0);
      var idle = Math.max(0, m.idleMs | 0);
      pres = idle < ONLINE_MS
        ? { online: true, lastSeen: now, idleMs: 0, agoText: "online" }
        : { online: false, lastSeen: now - idle, idleMs: idle, agoText: ago(idle) };
    } else {
      trophies = Sim.trophies(e, now);
      pres = Sim.presence(e, now);
    }
    var ar = arenaFor(trophies);
    var rec = recordOf(s, e.id);
    return {
      id: e.id, name: name, code: codeOf(e.id),
      memberId: e.memberId || null,
      clanMate: !!m, clanRole: m ? m.role : null, clanRoleName: m ? m.roleName : null,
      online: pres.online, lastSeen: pres.lastSeen, idleMs: pres.idleMs,
      statusText: pres.online ? "online" : "zuletzt " + pres.agoText,
      trophies: trophies,
      arena: ar, arenaName: arenaNameOf(ar),
      el: e.el, elName: EL_NAME[e.el] || "",
      fav: !!e.fav, since: e.since, sinceText: ago(now - e.since),
      demo: !!e.demo,
      record: rec,
      recordText: rec.wins + " : " + rec.losses,
    };
  }

  function recordOf(s, id) {
    id = String(id);
    var w = 0, l = 0, last = 0, streak = 0, run = true;
    for (var i = 0; i < s.duels.length; i++) {
      var d = s.duels[i];
      if (d.id !== id) continue;
      if (d.win) w++; else l++;
      if (!last) last = d.ts;
      if (run && d.win) streak++; else run = false;
    }
    return { wins: w, losses: l, total: w + l, streak: streak, lastTs: last };
  }

  /* ==================================================================
   * §3 API
   * ================================================================== */

  /* ---- Eigener Code und Liste ---- */

  function myCode(now) { return live(now).code; }

  /* list(now) → Freundesliste, fertig sortiert.
   * SORTIERUNG: Favoriten zuerst, dann Online, dann Trophäen absteigend.
   * Begründung: Wer online ist, ist der einzige, mit dem man JETZT etwas
   * machen kann — die Liste soll die Handlungsfähigen oben zeigen, nicht
   * die Stärksten. Favoriten stechen das, weil der Spieler sie selbst
   * gesetzt hat. */
  function list(now) {
    now = nowMs(now);
    var s = live(now);
    var out = s.friends.map(function (e) { return viewFriend(e, s, now); });
    out.sort(function (a, b) {
      if (a.fav !== b.fav) return a.fav ? -1 : 1;
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (!a.online && !b.online && a.lastSeen !== b.lastSeen) return b.lastSeen - a.lastSeen;
      return b.trophies - a.trophies;
    });
    return out;
  }
  function friend(id, now) {
    now = nowMs(now);
    var s = live(now), e = findFriend(s, id);
    return e ? viewFriend(e, s, now) : null;
  }
  function count(now) { return live(now).friends.length; }

  /* summary(now) → Kopfzeile der View: eigener Code, Zähler, Online-Zahl. */
  function summary(now) {
    now = nowMs(now);
    var s = live(now), l = list(now);
    var on = 0;
    l.forEach(function (f) { if (f.online) on++; });
    var t = myTrophies();
    return {
      code: s.code, friends: l.length, max: MAX_FRIENDS, online: on,
      pending: requestsIn(now).length, outgoing: s.outgoing.length,
      myTrophies: t, myArena: arenaFor(t), myArenaName: arenaNameOf(arenaFor(t)),
      duels: s.stats.duels, duelWins: s.stats.duelWins, gifted: s.stats.gifted,
    };
  }

  /* ---- Anfragen ---- */

  /* requestsIn(now) → eingehende Anfragen (noch nicht beantwortet).
   * Die Startbelegung steht als `want:true` in den Demo-Daten und ist
   * damit STABIL: eine Anfrage, die man liegen lässt, ist beim nächsten
   * Öffnen noch da. Ein Zeitfenster hätte sie stillschweigend
   * verschwinden lassen — das ist der Unterschied zwischen „ignoriert“
   * und „verpasst“. */
  function requestsIn(now) {
    now = nowMs(now);
    var s = live(now), out = [];
    Sim.directory().forEach(function (p, i) {
      if (!p.want) return;
      if (s.handled[p.id]) return;
      if (findFriend(s, p.id)) return;
      var pres = Sim.presence(p, now);
      var t = Sim.trophies(p, now);
      var ar = arenaFor(t);
      out.push({
        id: p.id, name: p.name, title: p.title || "", code: codeOf(p.id),
        el: p.el, elName: EL_NAME[p.el] || "",
        trophies: t, arena: ar, arenaName: arenaNameOf(ar),
        online: pres.online, statusText: pres.online ? "online" : "zuletzt " + pres.agoText,
        ts: s.created + i * HOUR, ageText: ago(Math.max(0, now - (s.created + i * HOUR))),
        demo: !!p.demo,
      });
    });
    return out;
  }

  /* requestsOut(now) → eigene, noch unbeantwortete Anfragen mit
   * Restfrist. `answerText` ist bewusst vage („antwortet in ~2:30“) —
   * eine Sekundenanzeige würde eine Genauigkeit versprechen, die eine
   * Antwort eines Menschen nie hat. */
  function requestsOut(now) {
    now = nowMs(now);
    var s = live(now);
    return s.outgoing.map(function (o) {
      var left = Math.max(0, ANSWER_MS - (now - o.ts));
      return {
        id: o.id, name: o.name, code: codeOf(o.id),
        ts: o.ts, ageText: ago(now - o.ts),
        waitMs: left, answerText: "antwortet in ~" + hhmm(left),
      };
    });
  }

  function pendingCount(now) { return requestsIn(now).length; }

  /* sendRequest(target) — target ist eine Verzeichnis-id ODER ein
   * Freundescode. Wirft mit deutscher Klartextmeldung, die direkt als
   * Toast taugt. */
  function sendRequest(target, now) {
    now = nowMs(now);
    var s = live(now);
    var p = resolveTarget(s, target);
    if (findFriend(s, p.id)) throw new Error(p.name + " ist bereits dein Freund.");
    if (findOutgoing(s, p.id)) throw new Error("Du hast " + p.name + " schon angefragt.");
    if (s.friends.length >= MAX_FRIENDS) {
      throw new Error("Deine Freundesliste ist voll (" + MAX_FRIENDS + ").");
    }
    /* Wer DICH schon angefragt hat, wird nicht zurück-angefragt — das
     * wäre eine Anfrage, die auf eine Anfrage wartet. Stattdessen gilt
     * das Senden als Annehmen. */
    if (p.want && !s.handled[p.id]) {
      return acceptRequest(p.id, now);
    }
    if (s.outgoing.length >= MAX_OUTGOING) {
      throw new Error("Höchstens " + MAX_OUTGOING + " offene Anfragen gleichzeitig.");
    }
    s.outgoing.push({ id: p.id, name: p.name, ts: now, done: false });
    note(s, "sent", "Freundschaftsanfrage an " + p.name + " gesendet.", now);
    save(s);
    return { ok: true, id: p.id, name: p.name, waitMs: ANSWER_MS,
             answerText: "antwortet in ~" + hhmm(ANSWER_MS) };
  }
  function resolveTarget(s, target) {
    var raw = String(target == null ? "" : target).trim();
    if (!raw) throw new Error("Kein Spieler gewählt.");
    if (raw === "me" || codeNorm(raw) === codeNorm(s.code)) {
      throw new Error("Das ist dein eigener Freundescode.");
    }
    var p = dirById(raw);
    if (!p && looksLikeCode(raw)) {
      var want = codeNorm(raw);
      Sim.directory().forEach(function (q) { if (codeNorm(codeOf(q.id)) === want) p = q; });
      if (!p) throw new Error("Kein Spieler mit dem Code " + raw.toUpperCase() + " gefunden.");
    }
    if (!p) throw new Error("Spieler nicht gefunden: " + raw);
    return p;
  }

  function cancelRequest(id, now) {
    now = nowMs(now);
    var s = live(now), o = findOutgoing(s, id);
    if (!o) throw new Error("Es gibt keine offene Anfrage an diesen Spieler.");
    s.outgoing = s.outgoing.filter(function (x) { return x.id !== o.id; });
    note(s, "cancel", "Anfrage an " + o.name + " zurückgezogen.", now);
    save(s);
    return { ok: true, id: o.id, name: o.name };
  }

  function acceptRequest(id, now) {
    now = nowMs(now);
    var s = live(now);
    var p = dirById(id);
    if (!p || !p.want) throw new Error("Diese Freundschaftsanfrage gibt es nicht.");
    if (s.handled[p.id]) throw new Error("Diese Anfrage hast du bereits beantwortet.");
    if (s.friends.length >= MAX_FRIENDS) {
      throw new Error("Deine Freundesliste ist voll (" + MAX_FRIENDS + ").");
    }
    s.handled[p.id] = "accepted";
    s.outgoing = s.outgoing.filter(function (x) { return x.id !== p.id; });
    var e = addFriendRaw(s, p, now);
    note(s, "friend", p.name + " ist jetzt dein Freund.", now);
    save(s);
    return { ok: true, accepted: true, friend: viewFriend(e, s, now) };
  }

  /* declineRequest — die Ablehnung wird PERSISTIERT (handled), damit
   * dieselbe Anfrage nicht beim nächsten Öffnen wieder oben steht. */
  function declineRequest(id, now) {
    now = nowMs(now);
    var s = live(now);
    var p = dirById(id);
    if (!p || !p.want) throw new Error("Diese Freundschaftsanfrage gibt es nicht.");
    if (s.handled[p.id]) throw new Error("Diese Anfrage hast du bereits beantwortet.");
    s.handled[p.id] = "declined";
    note(s, "declined", "Anfrage von " + p.name + " abgelehnt.", now);
    save(s);
    return { ok: true, declined: true, id: p.id, name: p.name };
  }

  function removeFriend(id, now) {
    now = nowMs(now);
    var s = live(now), e = findFriend(s, id);
    if (!e) throw new Error("Dieser Spieler steht nicht in deiner Freundesliste.");
    s.friends = s.friends.filter(function (x) { return x.id !== e.id; });
    note(s, "removed", e.name + " aus der Freundesliste entfernt.", now);
    save(s);
    return { ok: true, id: e.id, name: e.name };
  }

  function toggleFavorite(id, now) {
    now = nowMs(now);
    var s = live(now), e = findFriend(s, id);
    if (!e) throw new Error("Dieser Spieler steht nicht in deiner Freundesliste.");
    e.fav = !e.fav;
    save(s);
    return { ok: true, id: e.id, fav: e.fav };
  }

  /* addFromClan(memberId) — ein CLANKAMERAD wird Freund. Das ist der
   * Weg, auf dem Freundschaft und Clan-Mitgliedschaft überhaupt
   * zusammenkommen: nur ein so angelegter Freund trägt eine memberId
   * und kann deshalb Karten empfangen (Entscheidung B im Kopf). */
  function addFromClan(memberId, now) {
    now = nowMs(now);
    var C = clanOrThrow();
    var s = live(now);
    var ms = C.members(now), m = null;
    for (var i = 0; i < ms.length; i++) if (ms[i].id === String(memberId)) m = ms[i];
    if (!m) throw new Error("Dieses Clan-Mitglied gibt es nicht.");
    if (m.id === "me") throw new Error("Du kannst dich nicht selbst hinzufügen.");
    var fid = "clan:" + m.id;
    if (findFriend(s, fid)) throw new Error(m.name + " ist bereits dein Freund.");
    if (s.friends.length >= MAX_FRIENDS) {
      throw new Error("Deine Freundesliste ist voll (" + MAX_FRIENDS + ").");
    }
    var e = addFriendRaw(s, {
      id: fid, name: m.name, memberId: m.id, el: m.el,
      seed: m.trophies | 0, act: 0.4, demo: false,
    }, now);
    note(s, "friend", m.name + " aus dem Clan als Freund hinzugefügt.", now);
    save(s);
    return { ok: true, friend: viewFriend(e, s, now) };
  }

  /* ---- Suche ---- */

  /* search(query) → Treffer mit Zustand. Zwei Wege:
   *   · Freundescode  → exakter Treffer, egal wie formatiert
   *   · Spielername   → Teiltreffer ab SEARCH_MIN Zeichen
   * `state` sagt dem UI, welchen Knopf es zeichnen muss:
   *   "friend" | "outgoing" | "incoming" | "declined" | "open" */
  function search(query, now) {
    now = nowMs(now);
    var s = live(now);
    var raw = String(query == null ? "" : query).trim();
    if (!raw) throw new Error("Gib einen Spielernamen oder Freundescode ein.");
    var byCode = looksLikeCode(raw), needle = raw.toLowerCase();
    if (!byCode && raw.length < SEARCH_MIN) {
      throw new Error("Mindestens " + SEARCH_MIN + " Zeichen — oder ein Freundescode (" +
        CODE_PREFIX + "-XXXX-XXXX).");
    }
    if (codeNorm(raw) === codeNorm(s.code)) {
      return { query: raw, byCode: true, self: true, hits: [] };
    }
    var hits = [];
    Sim.directory().forEach(function (p) {
      var match = byCode
        ? codeNorm(codeOf(p.id)) === codeNorm(raw)
        : p.name.toLowerCase().indexOf(needle) >= 0;
      if (!match) return;
      var st = findFriend(s, p.id) ? "friend"
        : findOutgoing(s, p.id) ? "outgoing"
        : (p.want && !s.handled[p.id]) ? "incoming"
        : s.handled[p.id] === "declined" ? "declined" : "open";
      var pres = Sim.presence(p, now);
      var t = Sim.trophies(p, now), ar = arenaFor(t);
      hits.push({
        id: p.id, name: p.name, title: p.title || "", code: codeOf(p.id),
        el: p.el, elName: EL_NAME[p.el] || "",
        trophies: t, arena: ar, arenaName: arenaNameOf(ar),
        online: pres.online, statusText: pres.online ? "online" : "zuletzt " + pres.agoText,
        state: st, canAdd: st === "open" || st === "incoming" || st === "declined",
        demo: !!p.demo,
      });
    });
    hits.sort(function (a, b) { return b.trophies - a.trophies; });
    return { query: raw, byCode: byCode, self: false, hits: hits };
  }

  /* ---- Freundes-Duell (Entscheidung A) ---- */

  /* startDuel(friendId) → Loadout für das Match, im Format der
   * Ghost-Builds aus arena_clan.js, damit der Match-Start beide Quellen
   * gleich behandeln kann. `stake` benennt ausdrücklich die Null. */
  function startDuel(friendId, now) {
    now = nowMs(now);
    var s = live(now), e = findFriend(s, friendId);
    if (!e) throw new Error("Dieser Spieler steht nicht in deiner Freundesliste.");
    var v = viewFriend(e, s, now);
    return {
      id: e.id, name: v.name, title: "Freundes-Duell",
      el: v.el, elName: v.elName,
      hero: h01(e.id, "hero") < 0.5 ? "magmor" : "solara",
      deck: Sim.deck(e.id, v.el),
      aggro: Math.round(h01(e.id, "aggro") * 100) / 100,
      trophies: v.trophies, arena: v.arena, arenaName: v.arenaName,
      friendly: true,
      stake: { trophies: DUEL_TROPHIES, gold: 0, quests: false },
      stakeText: "Freundschaftsspiel — keine Trophäen, keine Belohnung.",
      record: v.record,
    };
  }

  /* resolveDuel(friendId, res) — bucht die BILANZ und sonst nichts.
   * Kein reportEvent an ArenaDaily/ArenaClan, keine Trophäen, kein
   * Gold. Wer das ändert, öffnet die Farm-Lücke aus Entscheidung A;
   * die Selbsttests hängen genau daran. */
  function resolveDuel(friendId, res, now) {
    now = nowMs(now);
    var s = live(now), e = findFriend(s, friendId);
    if (!e) throw new Error("Dieser Spieler steht nicht in deiner Freundesliste.");
    var win = !!(res && res.win);
    s.duels.unshift({ id: e.id, ts: now, win: win });
    s.duels = s.duels.slice(0, DUELS_MAX);
    s.stats.duels++;
    if (win) s.stats.duelWins++;
    var v = viewFriend(e, s, now);
    note(s, "duel", win ? "Duell gegen " + v.name + " gewonnen."
                        : "Duell gegen " + v.name + " verloren.", now);
    save(s);
    return {
      ok: true, id: e.id, name: v.name, win: win,
      trophies: DUEL_TROPHIES, gold: 0, questEvents: 0,
      record: v.record, recordText: v.record.wins + " : " + v.record.losses,
      note: "Freundschaftsspiel — der Trophäenstand bleibt unberührt.",
    };
  }

  function duelRecord(friendId, now) { return recordOf(live(now), friendId); }
  function duels(limit, now) {
    now = nowMs(now);
    var s = live(now);
    return s.duels.slice(0, limit || 20).map(function (d) {
      var e = findFriend(s, d.id);
      return { id: d.id, name: e ? e.name : d.id, win: d.win, ts: d.ts,
               agoText: ago(now - d.ts) };
    });
  }

  /* ---- Kartenspende (Entscheidung B) ---- */

  /* canGift(friendId) → {ok, reason, request, quota}
   * Nicht-werfende Variante für die Anzeige: das UI graut damit den
   * Knopf aus, statt einen Fehler zu provozieren. */
  function canGift(friendId, now) {
    now = nowMs(now);
    var s = live(now), e = findFriend(s, friendId);
    if (!e) return { ok: false, reason: "Kein Freund." };
    var C = clanMod();
    if (!C) return { ok: false, reason: "Clan-System nicht geladen." };
    var m = clanMemberOf(e, now);
    if (!m) {
      return { ok: false, reason: "Kartenspenden gehen nur an Mitglieder deines Clans." };
    }
    var req = null;
    try {
      C.requests(now).forEach(function (r) { if (!r.mine && r.ownerId === e.memberId && !r.closed) req = r; });
    } catch (err) {
      return { ok: false, reason: "Clan-Anfragen nicht lesbar." };
    }
    if (!req) {
      return { ok: false, reason: (m.name || e.name) + " hat gerade keine offene Kartenanfrage.",
               quota: safeQuota(C, now) };
    }
    var q = safeQuota(C, now);
    if (q && q.left <= 0) {
      return { ok: false, reason: "Sendekontingent aufgebraucht — nächster Slot in " +
        q.resetText + ".", request: req, quota: q };
    }
    return { ok: true, request: req, quota: q, max: Math.min(req.left, q ? q.left : req.left) };
  }
  function safeQuota(C, now) {
    try { return C.sendQuota(now); } catch (e) { return null; }
  }

  /* giftableFriends(now) → wer JETZT Karten empfangen kann, mit Grund
   * für alle anderen. Eine Zeile pro Freund — das UI muss nicht
   * filtern und kann den Grund direkt anzeigen. */
  function giftableFriends(now) {
    now = nowMs(now);
    var s = live(now);
    return s.friends.map(function (e) {
      var c = canGift(e.id, now);
      var v = viewFriend(e, s, now);
      return { id: e.id, name: v.name, clanMate: v.clanMate,
               ok: !!c.ok, reason: c.reason || "", max: c.max || 0,
               request: c.request || null };
    });
  }

  /* giftCards(friendId, count) — DELEGIERT vollständig an
   * ArenaClan.donateCards(). Dieses Modul prüft NUR die Beziehung
   * (gleicher Clan) und findet die passende Anfrage; Kontingent,
   * Tier-Sperre, Bestand und Buchung bleiben in arena_clan.js.
   * Damit gibt es genau EINEN Weg, auf dem eine Karte den Besitzer
   * wechselt — und genau eine Stelle, an der seine Regeln stehen. */
  function giftCards(friendId, count, now) {
    now = nowMs(now);
    var C = clanOrThrow();
    var s = live(now), e = findFriend(s, friendId);
    if (!e) throw new Error("Dieser Spieler steht nicht in deiner Freundesliste.");
    var m = clanMemberOf(e, now);
    if (!m) {
      throw new Error("Kartenspenden gehen nur an Mitglieder deines Clans — " +
        e.name + " ist nicht in deinem Clan. Karten laufen über die Anfragetafel " +
        "des Clans, damit das Sendekontingent gilt.");
    }
    var req = null;
    C.requests(now).forEach(function (r) {
      if (!r.mine && r.ownerId === e.memberId && !r.closed) req = r;
    });
    if (!req) {
      throw new Error((m.name || e.name) + " hat gerade keine offene Kartenanfrage. " +
        "Spenden laufen über die Anfragetafel des Clans.");
    }
    // Ab hier gehört alles ArenaClan: Fehlermeldungen kommen von dort.
    var r = C.donateCards(req.id, count, undefined, now);
    var n = r && r.count ? r.count : 0;
    s = live(now);                       // ArenaClan hat inzwischen geschrieben
    s.stats.gifted += n;
    note(s, "gift", "Du hast " + n + " × " + (r.cardName || r.cardId) + " an " +
      (m.name || e.name) + " gespendet.", now);
    save(s);
    return {
      ok: true, friendId: e.id, friendName: m.name || e.name,
      count: n, cardId: r.cardId, cardName: r.cardName,
      quota: r.quota, reward: r.reward, request: r.request,
      via: "ArenaClan.donateCards",     // die Naht steht im Ergebnis
    };
  }

  /* ---- Benachrichtigungen / Badge ---- */

  /* notifications(now) → alles, was seit dem letzten markSeen()
   * passiert ist, plus die offenen Anfragen. Das UI zeigt das im Kopf
   * der View; der BADGE am Knopf zählt nur die Anfragen (pendingCount),
   * weil nur die eine Handlung verlangen. */
  function notifications(now) {
    now = nowMs(now);
    var s = live(now), out = [];
    requestsIn(now).forEach(function (r) {
      out.push({ ts: r.ts, kind: "request", fresh: true,
                 text: r.name + " möchte dein Freund werden.", agoText: r.ageText });
    });
    s.notes.forEach(function (n) {
      if (n.kind !== "accepted" && n.kind !== "declined" && n.kind !== "friend") return;
      out.push({ ts: n.ts, kind: n.kind, fresh: n.ts > s.seenTs,
                 text: n.text, agoText: ago(Math.max(0, now - n.ts)) });
    });
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out;
  }
  function markSeen(now) {
    now = nowMs(now);
    var s = live(now);
    s.seenTs = now;
    save(s);
    return { seenTs: now };
  }
  function feed(limit, now) {
    now = nowMs(now);
    var s = live(now);
    return s.notes.slice(0, limit || 20).map(function (n) {
      return { ts: n.ts, kind: n.kind, text: n.text, agoText: ago(Math.max(0, now - n.ts)) };
    });
  }

  /* ---- Prototyp-Startbelegung ---- */

  /* seedDemoFriends() — NUR für den Prototyp: legt die Demo-Freunde an,
   * damit die View nicht leer aufmacht. Läuft genau einmal (danach hat
   * der Zustand Freunde) und nimmt zusätzlich die ersten beiden
   * CLAN-Mitglieder auf, damit der Spenden-Pfad überhaupt sichtbar ist.
   * Analog zu ArenaClan.seedDemoClan(). */
  function seedDemoFriends(now) {
    now = nowMs(now);
    var s = live(now);
    if (s.friends.length) return list(now);
    DEMO_FRIENDS.forEach(function (p, i) {
      var e = addFriendRaw(s, p, now - (i + 1) * 3 * DAY);
      if (e && i === 0) e.fav = true;
    });
    save(s);
    var C = clanMod();
    if (C && typeof C.members === "function") {
      try {
        var ms = C.members(now), added = 0;
        for (var k = 0; k < ms.length && added < 2; k++) {
          if (ms[k].id === "me") continue;
          try { addFromClan(ms[k].id, now); added++; } catch (e2) {}
        }
      } catch (e3) {}
    }
    return list(now);
  }

  function reset() { save(fresh()); return get(); }

  /* ================= Export ================= */
  var API = {
    // Konstanten
    STATE_VERSION: STATE_VERSION,
    MAX_FRIENDS: MAX_FRIENDS, MAX_OUTGOING: MAX_OUTGOING,
    ONLINE_MS: ONLINE_MS, ANSWER_MS: ANSWER_MS, SEARCH_MIN: SEARCH_MIN,
    DUEL_TROPHIES: DUEL_TROPHIES,
    CODE_PREFIX: CODE_PREFIX, CODE_ALPHABET: CODE_ALPHABET,
    DEMO_FRIENDS: DEMO_FRIENDS, DEMO_STRANGERS: DEMO_STRANGERS,
    // Liste
    get: get, myCode: myCode, list: list, friend: friend, count: count, summary: summary,
    // Anfragen
    requestsIn: requestsIn, requestsOut: requestsOut, pendingCount: pendingCount,
    sendRequest: sendRequest, cancelRequest: cancelRequest,
    acceptRequest: acceptRequest, declineRequest: declineRequest,
    removeFriend: removeFriend, toggleFavorite: toggleFavorite,
    addFromClan: addFromClan,
    // Suche
    search: search, codeOf: codeOf,
    // Duell
    startDuel: startDuel, resolveDuel: resolveDuel, duelRecord: duelRecord, duels: duels,
    // Spende (delegiert an ArenaClan)
    canGift: canGift, giftableFriends: giftableFriends, giftCards: giftCards,
    // Benachrichtigungen
    notifications: notifications, markSeen: markSeen, feed: feed,
    // Sonstiges
    seedDemoFriends: seedDemoFriends, reset: reset,
    arenaFor: arenaFor, arenaNameOf: arenaNameOf, ago: ago, hhmm: hhmm,
    // intern (Tests, Server-Naht)
    _key: KEY, _sim: Sim, _write: function (s) { save(s); },
    _clock: function (fn) { CLOCK = fn || null; },
    _hash: hash, _codeNorm: codeNorm,
  };

  if (typeof window !== "undefined") window.ArenaFriends = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_friends.js) ============ */
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

    /* --- Nachbarmodule laden, OHNE deren Selbsttest auszulösen: sie
     *     überspringen ihn, wenn `window` existiert, setzen
     *     module.exports aber trotzdem. Danach window wieder weg, damit
     *     DIESER Test läuft. Dasselbe Vorgehen wie in arena_clan.js. --- */
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
    var CL = loadSibling("arena_clan.js");
    if (CL) globalThis.ArenaClan = CL;
    var AV = loadSibling("arena_avatars.js");
    if (AV) globalThis.ArenaAvatars = AV;
    var TROPH = 1136;
    globalThis.ArenaProfile = { get: function () { return { trophies: TROPH, best: 1400 }; } };
    globalThis.ArenaRivals = { roster: [] };
    // Ohne Clan gibt es keine Clankameraden — also steht der Demo-Clan,
    // bevor irgendetwas mit Freunden passiert.
    var CLAN_MATES = 0;

    // Kontrollierte Uhr: Montag 2026-07-20 09:00 UTC (Sammelphase des Clans).
    var MON = Date.UTC(2026, 6, 20, 9, 0, 0);
    var T = MON;
    var setT = function (t) { T = t; };
    API._clock(function () { return T; });
    if (CL) CL._clock(function () { return T; });
    if (AV) AV._clock(function () { return T; });

    console.log("\n=== ARENA FRIENDS — Selbsttest (State v" + STATE_VERSION + ") ===\n");

    /* ================= 1. Werkzeug und Zeit ================= */
    console.log("Werkzeug:");
    check("ts0() überlebt echte Millisekunden-Zeitstempel (kein |0)",
      ts0(1784538000000) === 1784538000000 && (1784538000000 | 0) !== 1784538000000,
      ts0(1784538000000));
    check("ts0() wirft Müll weg",
      ts0("quatsch") === 0 && ts0(-5) === 0 && ts0(null) === 0 && ts0(NaN) === 0);
    check("hash() ist rein — gleiche Argumente, gleiche Zahl",
      hash("a", 1) === hash("a", 1) && hash("a", 1) !== hash("a", 2));
    check("nowMs() liest die Testuhr, nicht Date.now()", nowMs() === MON);
    check("ago() formatiert deutsch",
      ago(30000) === "gerade eben" && ago(5 * MINUTE) === "vor 5 min" &&
      ago(3 * HOUR) === "vor 3 h" && ago(DAY) === "vor 1 Tag" && ago(2 * DAY) === "vor 2 Tagen",
      ago(2 * DAY));

    /* ================= 2. Freundescode ================= */
    reset(); setT(MON);
    var code = myCode();
    console.log("\nFreundescode: " + code);
    check("Format " + CODE_PREFIX + "-XXXX-XXXX",
      new RegExp("^" + CODE_PREFIX + "-[A-Z2-9]{4}-[A-Z2-9]{4}$").test(code), code);
    check("Alphabet ohne I, O, 0 und 1", !/[IO01]/.test(code.slice(4)), code);
    check("Code ist stabil über Neu-Laden", myCode() === code);
    check("Codes im Verzeichnis sind eindeutig", (function () {
      var seen = {};
      return Sim.directory().every(function (p) {
        var c = codeOf(p.id);
        if (seen[c]) return false;
        seen[c] = 1; return true;
      });
    })(), Sim.directory().length + " Spieler");
    check("codeNorm() vereinheitlicht Schreibweisen",
      codeNorm("apt zk4m-9prq") === codeNorm("APT-ZK4M-9PRQ"));

    /* ================= 3. Demo-Freunde und Liste ================= */
    if (CL) { CL.reset(); CL.seedDemoClan(); CLAN_MATES = 2; }
    reset();
    var l0 = list();
    check("frischer Zustand: leere Liste, keine Duelle",
      l0.length === 0 && duels().length === 0);
    var seeded = seedDemoFriends();
    console.log("\nFreunde nach seedDemoFriends():");
    seeded.forEach(function (f) {
      console.log("  " + (f.fav ? "★" : " ") + " " + f.name +
        (f.clanMate ? " [Clan]" : "") + "  " + f.trophies + " 🏆  " +
        f.arenaName + "  " + f.statusText);
    });
    check("Demo-Freunde angelegt (" + DEMO_FRIENDS.length + " Platzhalter + " +
      CLAN_MATES + " Clankameraden)",
      seeded.length === DEMO_FRIENDS.length + CLAN_MATES, seeded.length);
    check("die Clankameraden sind als solche erkannt",
      seeded.filter(function (f) { return f.clanMate; }).length === CLAN_MATES);
    check("alle Platzhalter sind als Demo markiert",
      DEMO_FRIENDS.every(function (p) { return p.demo === true; }) &&
      DEMO_STRANGERS.every(function (p) { return p.demo === true; }));
    check("Sortierung: Favorit zuerst, dann online, dann Trophäen", (function () {
      for (var i = 1; i < seeded.length; i++) {
        var a = seeded[i - 1], b = seeded[i];
        if (a.fav !== b.fav) { if (!a.fav) return false; continue; }
        if (a.online !== b.online) { if (!a.online) return false; continue; }
        if (a.online === b.online && a.online && a.trophies < b.trophies) return false;
      }
      return true;
    })());
    check("jeder Freund trägt Arena, Status und Bilanz",
      seeded.every(function (f) {
        return f.arena >= 1 && f.arenaName && f.statusText && f.record &&
               typeof f.record.wins === "number";
      }));
    check("zweiter Aufruf von seedDemoFriends() verdoppelt nichts",
      seedDemoFriends().length === seeded.length);
    check("Favorit lässt sich umschalten", (function () {
      var id = DEMO_FRIENDS[1].id;
      var r1 = toggleFavorite(id), r2 = toggleFavorite(id);
      return r1.fav === true && r2.fav === false;
    })());

    /* ================= 4. Präsenz ================= */
    var p0 = Sim.presence(DEMO_FRIENDS[0], MON);
    check("Präsenz ist im 5-Minuten-Takt stabil",
      JSON.stringify(Sim.presence(DEMO_FRIENDS[0], MON + 2 * MINUTE)) === JSON.stringify(p0));
    check("„zuletzt gesehen“ liegt nie in der Zukunft",
      list().every(function (f) { return f.lastSeen <= nowMs(); }));
    check("Offline-Freunde tragen einen Zeittext, Online-Freunde „online“",
      list().every(function (f) {
        return f.online ? f.statusText === "online" : /^zuletzt /.test(f.statusText);
      }));
    check("über 24 h ändert sich der Online-Status mindestens einmal", (function () {
      var seen = {};
      for (var h = 0; h < 24; h++) seen[String(Sim.presence(DEMO_FRIENDS[0], MON + h * HOUR).online)] = 1;
      return Object.keys(seen).length === 2;
    })());

    /* ================= 5. Eingehende Anfragen ================= */
    var inc = requestsIn();
    console.log("\nEingehende Anfragen: " + inc.map(function (r) { return r.name; }).join(", "));
    check("Demo-Anfragen liegen an (want:true)", inc.length === 2, inc.length);
    check("pendingCount() = Zahl der offenen Anfragen — das ist das Badge",
      pendingCount() === inc.length, pendingCount());
    var acc = acceptRequest(inc[0].id);
    check("Annehmen macht den Anfragenden zum Freund",
      acc.accepted === true && !!friend(inc[0].id), acc.friend.name);
    check("angenommene Anfrage verschwindet aus der Eingangsliste",
      requestsIn().every(function (r) { return r.id !== inc[0].id; }));
    var dec = declineRequest(inc[1].id);
    check("Ablehnen entfernt die Anfrage, ohne Freundschaft",
      dec.declined === true && !friend(inc[1].id) && pendingCount() === 0, pendingCount());
    check("abgelehnte Anfrage kommt nach Neuladen NICHT wieder",
      requestsIn().length === 0 && get().handled[inc[1].id] === "declined");
    check("dieselbe Anfrage zweimal beantworten wirft",
      throws(function () { acceptRequest(inc[1].id); }, "bereits beantwortet").ok);
    check("unbekannte Anfrage annehmen wirft",
      throws(function () { acceptRequest("gibtsnicht"); }, "gibt es nicht").ok);

    /* ================= 6. Ausgehende Anfragen ================= */
    reset(); setT(MON); seedDemoFriends();
    var target = DEMO_STRANGERS.filter(function (p) { return !p.want; })[0];
    var sr = sendRequest(target.id);
    check("Anfrage senden legt einen offenen Eintrag an",
      sr.ok && requestsOut().length === 1 && requestsOut()[0].id === target.id, target.name);
    check("Restfrist wird als Text geliefert",
      /^antwortet in ~/.test(requestsOut()[0].answerText), requestsOut()[0].answerText);
    check("dieselbe Person zweimal anfragen wirft",
      throws(function () { sendRequest(target.id); }, "schon angefragt").ok);
    check("eigenen Freund anfragen wirft",
      throws(function () { sendRequest(DEMO_FRIENDS[0].id); }, "bereits dein Freund").ok);
    check("eigenen Code anfragen wirft",
      throws(function () { sendRequest(myCode()); }, "eigener Freundescode").ok);
    check("Anfrage zurückziehen leert die Liste", (function () {
      cancelRequest(target.id);
      return requestsOut().length === 0;
    })());
    check("zurückziehen ohne Anfrage wirft",
      throws(function () { cancelRequest(target.id); }, "keine offene Anfrage").ok);
    // Antwort-Frist: lazy beim Lesen, kein Timer.
    var accepted = 0, declined = 0;
    DEMO_STRANGERS.forEach(function (p) {
      if (p.want) return;
      reset(); setT(MON); seedDemoFriends();
      sendRequest(p.id);
      var mid = requestsOut().length;
      setT(MON + ANSWER_MS - MINUTE);
      var before = requestsOut().length;
      setT(MON + ANSWER_MS + MINUTE);
      var after = requestsOut().length;
      var got = !!friend(p.id);
      if (got) accepted++; else declined++;
      check("Anfrage an " + p.name + ": vor der Frist offen, danach beantwortet (" +
        (got ? "angenommen" : "abgelehnt") + ")",
        mid === 1 && before === 1 && after === 0);
    });
    check("beide Ausgänge kommen vor (angenommen UND abgelehnt)",
      accepted > 0 && declined > 0, accepted + " angenommen / " + declined + " abgelehnt");
    check("Antwort steht als Benachrichtigung im Verlauf",
      feed().some(function (n) { return n.kind === "accepted" || n.kind === "declined"; }));

    /* ================= 7. Suche ================= */
    reset(); setT(MON); seedDemoFriends();
    var byName = search("gorm");
    check("Suche über den Namen findet den Spieler",
      byName.hits.length === 1 && byName.hits[0].name.indexOf("Gorm") === 0, byName.hits.length);
    check("Namenssuche ist gross-/kleinschreibungsblind",
      search("GORM").hits.length === 1);
    check("Teilsuche im Namen findet mehrere",
      search("ste").hits.length === 2, "„ste“ → " + search("ste").hits.length);
    check("zu kurze Suche wirft mit Hinweis auf den Code",
      throws(function () { search("go"); }, "Mindestens 3 Zeichen").ok);
    check("leere Suche wirft",
      throws(function () { search("  "); }, "Spielernamen oder Freundescode").ok);
    var codeHit = search(codeOf("demo_vex"));
    check("Suche über den Freundescode trifft exakt",
      codeHit.byCode === true && codeHit.hits.length === 1 && codeHit.hits[0].id === "demo_vex");
    check("Code auch unformatiert (Kleinbuchstaben, Leerzeichen)",
      search(codeOf("demo_vex").toLowerCase().replace(/-/g, " ")).hits.length === 1);
    check("eigener Code liefert self:true statt eines Treffers",
      search(myCode()).self === true);
    check("unbekannter Code liefert 0 Treffer",
      search(CODE_PREFIX + "-ZZZZ-ZZZZ").hits.length === 0);
    check("Zustand je Treffer: friend / incoming / open", (function () {
      var f = search(DEMO_FRIENDS[0].name.split(" ")[0]).hits[0];
      var i = search(DEMO_STRANGERS[0].name.split(" ")[0]).hits[0];
      var o = search("Gorm").hits[0];
      return f.state === "friend" && !f.canAdd && i.state === "incoming" && o.state === "open";
    })());

    /* ================= 8. Freundes-Duell (Entscheidung A) ================= */
    console.log("\nFreundes-Duell:");
    var fid = DEMO_FRIENDS[0].id;
    var lo = startDuel(fid);
    console.log("  Loadout: " + lo.name + " · " + lo.elName + " · Held " + lo.hero +
      " · Deck " + lo.deck.join(",") + " · Einsatz " + lo.stake.trophies + " 🏆");
    check("Duell-Loadout hat Deck (6), Held und Element",
      lo.deck.length === 6 && !!lo.hero && !!lo.el);
    check("Einsatz ist ausdrücklich NULL Trophäen",
      lo.stake.trophies === 0 && DUEL_TROPHIES === 0 && lo.friendly === true);
    check("Loadout nennt die Regel im Klartext",
      /keine Trophäen/.test(lo.stakeText), lo.stakeText);
    // Spione auf die Quest-Kanäle: ein Duell darf dort NICHTS melden.
    var spy = 0;
    var spyMods = [];
    if (CL && typeof CL.reportEvent === "function") {
      spyMods.push([CL, "reportEvent", CL.reportEvent]);
      CL.reportEvent = function () { spy++; };
    }
    globalThis.ArenaDaily = { reportEvent: function () { spy++; } };
    var troBefore = myTrophies();
    var d1 = resolveDuel(fid, { win: true });
    var d2 = resolveDuel(fid, { win: false });
    var d3 = resolveDuel(fid, { win: true });
    spyMods.forEach(function (x) { x[0][x[1]] = x[2]; });
    delete globalThis.ArenaDaily;
    check("Duell gibt und kostet keine Trophäen",
      d1.trophies === 0 && d2.trophies === 0 && myTrophies() === troBefore, troBefore + " 🏆");
    check("Duell gibt kein Gold", d1.gold === 0 && d3.gold === 0);
    check("Duell meldet KEIN Quest-Ereignis (kein Farmen über Absprachen)",
      spy === 0 && d1.questEvents === 0, spy + " Meldungen");
    var rec = duelRecord(fid);
    console.log("  Bilanz gegen " + lo.name + ": " + rec.wins + " : " + rec.losses +
      " (Serie " + rec.streak + ")");
    check("Bilanz zählt Siege und Niederlagen",
      rec.wins === 2 && rec.losses === 1 && rec.total === 3, JSON.stringify(rec));
    check("Serie zählt nur die jüngsten Siege in Folge", rec.streak === 1, rec.streak);
    check("Duell-Log führt den jüngsten Kampf oben",
      duels()[0].win === true && duels().length === 3);
    check("Duell gegen einen Nicht-Freund wirft",
      throws(function () { startDuel("demo_gorm"); }, "nicht in deiner Freundesliste").ok);

    /* ================= 9. Kartenspende (Entscheidung B) ================= */
    console.log("\nKartenspende:");
    if (!CL) {
      console.log("  (arena_clan.js fehlt — Spenden-Tests übersprungen)");
    } else {
      reset(); setT(MON);
      CL.reset();
      CL.seedDemoClan();
      seedDemoFriends();
      // Ein Demo-Freund OHNE Clan-Bindung darf nichts bekommen.
      var extern = DEMO_FRIENDS[0].id;
      var tEx = throws(function () { giftCards(extern, 1); }, "nur an Mitglieder deines Clans");
      check("Spende an einen Nicht-Clan-Freund wirft mit Begründung", tEx.ok, tEx.msg);
      check("canGift() sagt dasselbe, ohne zu werfen",
        canGift(extern).ok === false && /Clans/.test(canGift(extern).reason),
        canGift(extern).reason);
      // Ein Clan-Mitglied MIT offener Anfrage: über addFromClan zum Freund machen.
      var open = CL.requests().filter(function (r) { return !r.mine && !r.closed; });
      check("der Clan hat offene Anfragen (Grundlage der Spende)", open.length > 0, open.length);
      var ownerId = open[0].ownerId;
      // seedDemoFriends() hat bereits zwei Clankameraden aufgenommen —
      // ist der Anfragende darunter, wird er nicht doppelt angelegt.
      var already = null;
      list().forEach(function (f) { if (f.memberId === ownerId) already = f; });
      var fr = already ? { ok: true, friend: already } : addFromClan(ownerId);
      check("addFromClan() macht ein Clan-Mitglied zum Freund",
        fr.ok && fr.friend.clanMate === true && fr.friend.memberId === ownerId, fr.friend.name);
      check("dasselbe Clan-Mitglied zweimal hinzufügen wirft",
        throws(function () { addFromClan(ownerId); }, "bereits dein Freund").ok);
      var cg = canGift(fr.friend.id);
      check("canGift() findet die offene Anfrage des Clankameraden",
        cg.ok === true && cg.request.ownerId === ownerId, cg.request && cg.request.cardName);
      // Bestand beim Spender herstellen (das bucht ArenaCards, nicht wir).
      if (AC) AC.addDrop(cg.request.cardId, "common", 5);
      var qBefore = CL.sendQuota().used;
      var g = giftCards(fr.friend.id, 2);
      console.log("  " + g.count + " × " + g.cardName + " an " + g.friendName +
        " · Kontingent " + g.quota.used + "/" + g.quota.max + " · über " + g.via);
      check("Spende läuft über ArenaClan.donateCards()", g.via === "ArenaClan.donateCards");
      check("das CLAN-Sendekontingent wird verbraucht (kein zweiter Kanal)",
        CL.sendQuota().used === qBefore + 2, qBefore + " → " + CL.sendQuota().used);
      check("Belohnung kommt unverändert von ArenaClan",
        g.reward.gold === CL.DONATE_GOLD * 2 && g.reward.material === CL.DONATE_MATERIAL * 2,
        JSON.stringify(g.reward));
      check("dieses Modul bucht selbst nichts — es zählt nur mit",
        get().stats.gifted === 2, get().stats.gifted);
      check("Tier-Sperre bleibt bei ArenaClan (höhere Rarität nicht adressierbar)",
        giftCards.length === 3, "giftCards(friendId, count, now) — kein Tier-Parameter");
      // Clan-Mitglied ohne offene Anfrage
      var noReq = null;
      CL.members().forEach(function (m) {
        if (m.id === "me" || m.id === ownerId || noReq) return;
        if (!open.some(function (r) { return r.ownerId === m.id; })) noReq = m.id;
      });
      if (noReq) {
        var have2 = null;
        list().forEach(function (f) { if (f.memberId === noReq) have2 = f; });
        var fr2 = have2 ? { friend: have2 } : addFromClan(noReq);
        var t2 = throws(function () { giftCards(fr2.friend.id, 1); }, "keine offene Kartenanfrage");
        check("Clankamerad ohne Anfrage: klare Meldung statt stiller Buchung", t2.ok, t2.msg);
      }
      check("giftableFriends() nennt für jeden Freund Ja/Nein und den Grund", (function () {
        var g2 = giftableFriends();
        return g2.length === count() && g2.every(function (x) {
          return typeof x.ok === "boolean" && (x.ok || x.reason.length > 0);
        });
      })());
      check("ohne Clan-Mitgliedschaft ist niemand mehr Clankamerad", (function () {
        CL.leaveClan();
        var after = list().every(function (f) { return f.clanMate === false; });
        var t = throws(function () { giftCards(fr.friend.id, 1); }, "nicht in deinem Clan");
        CL.reset(); CL.seedDemoClan();
        return after && t.ok;
      })());
    }

    /* ================= 10. Benachrichtigungen und Badge ================= */
    reset(); setT(MON); seedDemoFriends();
    var nf = notifications();
    check("offene Anfragen stehen als Benachrichtigung",
      nf.length >= 2 && nf.some(function (n) { return n.kind === "request"; }), nf.length);
    check("markSeen() setzt den Zeitstempel, das Badge bleibt an den Anfragen", (function () {
      var before = pendingCount();
      markSeen();
      return get().seenTs === nowMs() && pendingCount() === before;
    })());
    check("nach Beantworten aller Anfragen ist das Badge 0", (function () {
      requestsIn().forEach(function (r) { declineRequest(r.id); });
      return pendingCount() === 0;
    })());
    var sum = summary();
    console.log("\nsummary(): " + sum.friends + "/" + sum.max + " Freunde · " +
      sum.online + " online · Code " + sum.code + " · Arena " + sum.myArena +
      " (" + sum.myArenaName + ")");
    check("summary() liefert Kopfdaten für die View",
      sum.friends === count() && sum.max === MAX_FRIENDS && !!sum.code &&
      sum.myArena === arenaFor(TROPH), sum.myArena);

    /* ================= 11. Robustheit ================= */
    console.log("\nRobustheit:");
    check("kaputter localStorage-Inhalt → frischer Zustand", (function () {
      lsSet("{kein json");
      var s = get();
      return s.v === STATE_VERSION && Array.isArray(s.friends) && s.friends.length === 0;
    })());
    check("Müll in den Feldern wird geheilt", (function () {
      lsSet(JSON.stringify({
        v: STATE_VERSION, friends: [null, { id: "x", seed: "viel", since: "gestern" }],
        outgoing: "nein", handled: 7, duels: [{}], notes: null, seenTs: -3,
        stats: { duels: -9 },
      }));
      var s = get();
      return s.friends.length === 1 && s.friends[0].seed === 0 && s.friends[0].since === 0 &&
             Array.isArray(s.outgoing) && typeof s.handled === "object" &&
             s.duels.length === 0 && Array.isArray(s.notes) && s.seenTs === 0 &&
             s.stats.duels === 0;
    })());
    check("unbekannte Version wird migriert, Notizen bleiben", (function () {
      lsSet(JSON.stringify({ v: 99, friends: [{ id: "alt" }],
        notes: [{ ts: MON, kind: "friend", text: "Alter Eintrag" }] }));
      var s = get();
      return s.v === STATE_VERSION && s.friends.length === 0 && s.notes.length === 1;
    })());
    check("kaputte Zeitstempel im Duell-Log bleiben zählbar", (function () {
      reset(); seedDemoFriends();
      var s = get();
      s.duels = [{ id: DEMO_FRIENDS[0].id, ts: "gestern", win: true },
                 { id: DEMO_FRIENDS[0].id, ts: -5, win: false }];
      save(s);
      var r = duelRecord(DEMO_FRIENDS[0].id);
      return r.wins === 1 && r.losses === 1 && get().duels.every(function (d) { return d.ts === 0; });
    })());
    check("fehlendes ArenaClan → Liste läuft, nur die Spende wirft", (function () {
      var keep = globalThis.ArenaClan;
      delete globalThis.ArenaClan;
      var ok = list().length > 0 && canGift(DEMO_FRIENDS[0].id).ok === false;
      var t = throws(function () { giftCards(DEMO_FRIENDS[0].id, 1); }, "arena_clan.js fehlt");
      var t2 = throws(function () { addFromClan("b0"); }, "arena_clan.js fehlt");
      globalThis.ArenaClan = keep;
      return ok && t.ok && t2.ok;
    })());
    check("fehlendes ArenaAvatars → Arenaleiter aus dem Rückfall", (function () {
      var keep = globalThis.ArenaAvatars;
      delete globalThis.ArenaAvatars;
      var ok = arenaFor(1200) === 5 && arenaNameOf(5) === "Obsidian-Thron";
      globalThis.ArenaAvatars = keep;
      return ok;
    })());
    check("fehlendes ArenaProfile → 0 Trophäen, kein Absturz", (function () {
      var keep = globalThis.ArenaProfile;
      delete globalThis.ArenaProfile;
      var ok = myTrophies() === 0 && summary().myArena === 1;
      globalThis.ArenaProfile = keep;
      return ok;
    })());
    check("Freundesliste ist gedeckelt", MAX_FRIENDS === 50 && MAX_OUTGOING === 10);
    check("Entfernen wirft für Unbekannte",
      throws(function () { removeFriend("gibtsnicht"); }, "nicht in deiner Freundesliste").ok);
    check("reset() nullt alles", (function () {
      var s = reset();
      return s.friends.length === 0 && s.outgoing.length === 0 && s.duels.length === 0 &&
             s.notes.length === 0 && s.stats.duels === 0;
    })());

    /* ================= 12. Vollständigkeit der API ================= */
    var NEED = ["get", "myCode", "list", "friend", "count", "summary",
      "requestsIn", "requestsOut", "pendingCount", "sendRequest", "cancelRequest",
      "acceptRequest", "declineRequest", "removeFriend", "toggleFavorite", "addFromClan",
      "search", "codeOf", "startDuel", "resolveDuel", "duelRecord", "duels",
      "canGift", "giftableFriends", "giftCards",
      "notifications", "markSeen", "feed", "seedDemoFriends", "reset"];
    check("API vollständig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");
    check("Sim ist als Server-Naht exportiert",
      ["directory", "presence", "trophies", "answersRequest", "deck"].every(function (k) {
        return typeof Sim[k] === "function";
      }));
    check("window.ArenaFriends UND module.exports werden gesetzt",
      typeof module !== "undefined" && module.exports === API);

    API._clock(null);
    if (CL) CL._clock(null);
    if (AV) AV._clock(null);
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
