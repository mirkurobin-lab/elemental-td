/* ==================================================================
 * ARENA GUIDE — Einsteiger-Guide + Spiel-Handbuch
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Zwei Teile, die zusammen unsere
 * Meta-FTUE bilden:
 *
 *   1. EINSTEIGER-GUIDE — vier gestaffelte Kapitel, jedes eine
 *      Aufgabenliste mit Häkchen. Die Häkchen sind KEINE eigenen
 *      Zähler: Sie werden aus den Zuständen abgelesen, die ohnehin
 *      existieren (ArenaTelemetry-Trichter, ArenaCards, ArenaClan,
 *      ArenaFortress, ArenaDaily). Belohnung je Aufgabe Gold +
 *      Material, Kapitel-Abschluss ein Booster-Pack.
 *   2. SPIEL-HANDBUCH — acht bebilderte Erklärseiten (MANUAL), reine
 *      Daten mit Asset-Schlüsseln. Das UI rendert sie generisch.
 *
 * WARUM DIE HÄKCHEN NICHT SELBST ZÄHLEN: Ein zweiter Zähler neben dem
 * Trichter geht auseinander — spätestens beim ersten Import eines
 * Spielstands. `probe()` liest deshalb bei JEDEM Aufruf neu; das Modul
 * speichert nur, WANN eine Aufgabe zuerst erfüllt war und was schon
 * abgeholt wurde. Eine erfüllte Aufgabe kann dadurch nie wieder
 * „unerfüllt" werden, auch wenn ein Zähler zurückgesetzt wird.
 *
 * ZWEI SORTEN AUFGABEN:
 *   · "auto"  — aus fremden Modulen abgeleitet (erster Sieg, erste
 *               Fusion, Clan-Beitritt, Festungsstufe …)
 *   · "mark"  — vom UI gemeldet, wenn ein Screen wirklich gesehen
 *               wurde: ArenaGuide.mark("vault_seen"). Genau dafür ist
 *               mark() da und für nichts anderes.
 * Fehlt ein fremdes Modul, liefert die Sonde 0 statt zu werfen — der
 * Guide funktioniert auch im Teil-Einbau.
 *
 * WÄHRUNGS-ZUSTÄNDIGKEIT wie überall: Material bucht das Modul über
 * ArenaCards, GOLD und Packs werden nur GEMELDET (Wallet und
 * Pack-Öffnung liegen im Hub).
 *
 * WIRING:
 *   1. <script src="arena_guide.js"></script> nach arena_telemetry.js.
 *   2. Beim Öffnen eines Screens die Sicht melden:
 *        ArenaGuide.mark("vault_seen");   // Tresor
 *        ArenaGuide.mark("pass_seen");    // Season-Pass
 *        ArenaGuide.mark("board_seen");   // Rangliste
 *        ArenaGuide.mark("card_seen");    // Turm-Detailkarte
 *        ArenaGuide.mark("manual_seen");  // Handbuch
 *   3. Roter Punkt: ArenaGuide.badge() → Anzahl offener Abholungen.
 *
 * Selbsttest: `node arena_patches/arena_guide.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaGuide";
  var STATE_VERSION = 1;

  /* ================= Sonden ==================================
   * Jede Sonde liefert eine ZAHL (erreichter Stand). Sie darf nie
   * werfen: fehlt das Modul, ist der Stand 0. */

  function hostObj() {
    if (typeof window !== "undefined" && window) return window;
    if (typeof globalThis !== "undefined" && globalThis) return globalThis;
    return null;
  }
  function mod(name) {
    try { var h = hostObj(); return (h && h[name]) || null; } catch (e) { return null; }
  }
  function safe(fn) {
    try { var v = fn(); return (typeof v === "number" && isFinite(v)) ? v : (v ? 1 : 0); }
    catch (e) { return 0; }
  }

  var PROBES = {
    // Trichter-Ereignisse aus arena_telemetry.js
    telemetry: function (arg) {
      var t = mod("ArenaTelemetry");
      return (t && typeof t.count === "function") ? safe(function () { return t.count(arg); }) : 0;
    },
    // Höchste erreichte Raritätsstufe über alle Karten (0 = nur grau)
    cardTier: function () {
      var c = mod("ArenaCards");
      if (!c) return 0;
      return safe(function () {
        var st = c.get(), best = 0;
        for (var id in st.cards) {
          var idx = c.tierOf(st.cards[id].tier).index;
          if (idx > best) best = idx;
        }
        return best;
      });
    },
    // Höchstes Kartenlevel
    cardLevel: function () {
      var c = mod("ArenaCards");
      if (!c) return 0;
      return safe(function () {
        var st = c.get(), best = 0;
        for (var id in st.cards) if ((st.cards[id].lvl | 0) > best) best = st.cards[id].lvl | 0;
        return best;
      });
    },
    clanJoined: function () {
      var c = mod("ArenaClan");
      return (c && typeof c.info === "function") ? safe(function () { return c.info().joined ? 1 : 0; }) : 0;
    },
    clanWarPoints: function () {
      var c = mod("ArenaClan");
      return (c && typeof c.get === "function")
        ? safe(function () { return c.get().stats.warPointsTotal | 0; }) : 0;
    },
    clanDonated: function () {
      var c = mod("ArenaClan");
      return (c && typeof c.get === "function")
        ? safe(function () { return c.get().stats.donatedTotal | 0; }) : 0;
    },
    fortressSteps: function () {
      var f = mod("ArenaFortress");
      return (f && typeof f.get === "function") ? safe(function () { return f.get().steps | 0; }) : 0;
    },
    loginClaims: function () {
      var d = mod("ArenaDaily");
      return (d && typeof d.get === "function")
        ? safe(function () { return d.get().login.claims | 0; }) : 0;
    },
    // "mark" liest ausschließlich den eigenen State (siehe mark()).
    mark: function (arg, st) { return (st.marks && st.marks[arg]) ? 1 : 0; },
  };

  /* ================= Kapitel & Aufgaben =================
   * Die Reihenfolge ist die Lernreihenfolge: erst spielen, dann
   * verstehen (Fusion), dann sozial, dann Meta. Jedes Kapitel ist mit
   * dem vorherigen freigeschaltet — gestaffelt, nicht alles auf einmal. */
  var CHAPTERS = [
    { key: "start", name: "Erste Schritte", sym: "🌱", art: "arena1",
      desc: "Das Fundament: ein Match, ein Pack, eine Karte angesehen.",
      pack: "bronze",
      tasks: [
        { key: "win1", title: "Gewinne dein erstes Match", need: 1,
          desc: "Der wichtigste Moment im Spiel — alles andere hängt daran.",
          probe: "telemetry", arg: "first_win", gold: 800, material: 5 },
        { key: "pack1", title: "Öffne dein erstes Booster-Pack", need: 1,
          desc: "Karten kommen aus Packs. Antippen dreht jede Karte einzeln um.",
          probe: "telemetry", arg: "pack_opened", gold: 800, material: 5 },
        { key: "login1", title: "Hol deine erste Login-Belohnung", need: 1,
          desc: "Der 7-Tage-Kalender öffnet sich beim ersten Start des Tages.",
          probe: "loginClaims", gold: 600, material: 4 },
        { key: "card1", title: "Sieh dir eine Turmkarte im Detail an", need: 1,
          desc: "In der Sammlung eine Karte antippen: Stats, Ziel, Material.",
          probe: "mark", arg: "card_seen", gold: 500, material: 4 },
      ] },
    { key: "cards", name: "Karten & Fusion", sym: "⚒", art: "frame_rare",
      desc: "Das Herz der Progression: drei gleiche Karten werden eine bessere.",
      pack: "silver",
      tasks: [
        { key: "merge1", title: "Verschmelze drei gleiche Karten", need: 1,
          desc: "Schmiede öffnen, drei identische Karten derselben Stufe wählen.",
          probe: "telemetry", arg: "first_merge", gold: 1500, material: 10 },
        { key: "tier1", title: "Bring eine Karte auf Grün oder höher", need: 1,
          desc: "Die Rarität hebt das Level-Cap — das ist ihr eigentlicher Wert.",
          probe: "cardTier", gold: 1200, material: 8 },
        { key: "lvl10", title: "Bring eine Karte auf Level 10", need: 10,
          desc: "Level-Ups kosten Material und Gold, aber keine Kartenkopien.",
          probe: "cardLevel", gold: 1000, material: 8 },
        { key: "packs5", title: "Öffne insgesamt 5 Packs", need: 5,
          desc: "Der Pity-Zähler steht offen auf jedem Pack.",
          probe: "telemetry", arg: "pack_opened", gold: 900, material: 6 },
      ] },
    { key: "clan", name: "Clan & Krieg", sym: "🛡", art: "hub_clan",
      desc: "Zusammen mehr: Wochenquests, Spenden und der Ghost-Clankrieg.",
      pack: "silver",
      tasks: [
        { key: "join", title: "Tritt einem Clan bei", need: 1,
          desc: "30 Plätze, gemeinsame Wochenquests, gestaffelte Clantruhe.",
          probe: "clanJoined", gold: 1200, material: 8 },
        { key: "donate", title: "Spende Karten an ein Mitglied", need: 1,
          desc: "Nur graue Basis-Kopien, 10 Stück pro 3 Stunden. Fusionen macht jeder selbst.",
          probe: "clanDonated", gold: 1000, material: 8 },
        { key: "warhit", title: "Führe einen Kriegs-Angriff aus", need: 1,
          desc: "Samstag und Sonntag je drei Angriffe auf Ghost-Gegner.",
          probe: "clanWarPoints", gold: 1400, material: 10 },
        { key: "board", title: "Sieh dir die Rangliste an", need: 1,
          desc: "Global, clanintern und „Umgebung\" (±25 Ränge um dich).",
          probe: "mark", arg: "board_seen", gold: 700, material: 5 },
      ] },
    { key: "meta", name: "Festung & Pass", sym: "🏰", art: "fort_castle",
      desc: "Die dauerhaften Achsen: Burg ausbauen, Saison und Tresor nutzen.",
      pack: "gold",
      tasks: [
        { key: "fort1", title: "Kauf deine erste Festungsstufe", need: 1,
          desc: "Burg-HP, Prisma-Schaden oder Prisma-Tempo — wirkt in JEDEM Match.",
          probe: "fortressSteps", gold: 1500, material: 10 },
        { key: "vault", title: "Sieh dir den Kristalltresor an", need: 1,
          desc: "Füllt sich bei jedem Sieg und wird nur ganz geöffnet.",
          probe: "mark", arg: "vault_seen", gold: 700, material: 5 },
        { key: "pass", title: "Sieh dir den Season-Pass an", need: 1,
          desc: "50 Stufen pro Kalendermonat, kostenlose und Premium-Spur.",
          probe: "mark", arg: "pass_seen", gold: 700, material: 5 },
        { key: "manual", title: "Lies eine Seite im Handbuch", need: 1,
          desc: "Alle Systeme kurz erklärt — jederzeit über die Einstellungen.",
          probe: "mark", arg: "manual_seen", gold: 600, material: 5 },
      ] },
  ];

  // Flache Nachschlagetabellen (Aufgaben-Keys sind global eindeutig).
  var TASK_BY_KEY = {}, CHAPTER_BY_KEY = {}, CHAPTER_OF_TASK = {};
  CHAPTERS.forEach(function (c) {
    CHAPTER_BY_KEY[c.key] = c;
    c.tasks.forEach(function (t) { TASK_BY_KEY[t.key] = t; CHAPTER_OF_TASK[t.key] = c.key; });
  });
  var TASK_TOTAL = CHAPTERS.reduce(function (n, c) { return n + c.tasks.length; }, 0);

  // Gültige mark()-Schlüssel — was nicht hier steht, wird verworfen.
  var MARK_KEYS = [];
  CHAPTERS.forEach(function (c) {
    c.tasks.forEach(function (t) { if (t.probe === "mark") MARK_KEYS.push(t.arg); });
  });

  /* ================= Handbuch =================
   * Reine Daten. `art` ist ein Schlüssel aus ui_assets.json; das UI legt
   * das Bild wie überall als ersten Background-Layer über einen
   * CSS-Fallback. Die Texte sind bewusst kurz — ein Handbuch, das man
   * lesen MUSS, ist ein Designfehler; dieses hier beantwortet Fragen,
   * die beim Spielen entstehen. */
  var MANUAL = [
    { key: "towers", title: "Die sechs Elemente", sym: "🔥", art: "card_ember",
      arts: ["card_ember", "card_frost", "card_thorn", "card_stone", "card_dawn", "card_hollow"],
      intro: "Jeder Turm gehört zu einem Element. Das Element bestimmt, wie er trifft — " +
        "nicht, wie stark er ist. Stark wird ein Turm über Level und Rarität.",
      bullets: [
        "EMBER (Feuer) — Flächenschaden, brennt über Zeit nach.",
        "FROST (Wasser) — Distanzschaden mit Verlangsamung.",
        "THORN (Natur) — Gift, trifft Luft und Boden.",
        "STONE (Erde) — größte Wucht, langsamste Kadenz, bricht Rüstung.",
        "DAWN (Licht) — stärkt umliegende Türme, hohe Kritchance.",
        "HOLLOW (Finsternis) — Fluchschaden mit Lebensraub zur Burg.",
      ] },
    { key: "fusion", title: "Fusion: 3 gleiche → 1 bessere", sym: "⚒", art: "frame_good",
      intro: "Drei identische Karten DERSELBEN Stufe werden in der Schmiede zu einer Karte " +
        "der nächsten Stufe. Das ist der einzige Weg nach oben — Fusionen kann dir niemand " +
        "schenken, auch nicht der Clan.",
      bullets: [
        "Der Merge kostet KEIN Gold, nur die drei Karten.",
        "Die aktive Karte zählt mit: drei Kopien heißt drei Kopien.",
        "Jede Fusion schaltet einen permanenten Bonus zur Auswahl frei.",
        "Aus 243 grauen Kopien wird genau eine Suprem-Karte (3⁵).",
        "Im Clan dürfen nur GRAUE Basis-Kopien wandern — Fusion ist Privatsache.",
      ] },
    { key: "rarity", title: "Die Raritäten-Leiter", sym: "💠", art: "banner_rarity",
      arts: ["frame_common", "frame_good", "frame_rare", "frame_epic",
             "frame_legendary", "frame_supreme"],
      intro: "Sechs Stufen von Grau bis Rot. Die Rarität erhöht nicht direkt den Schaden — " +
        "sie hebt das LEVEL-CAP. Erst das Level macht die Karte stark.",
      bullets: [
        "Gewöhnlich (Grau) → Cap 25",
        "Gut (Grün) → Cap 40",
        "Selten (Blau) → Cap 55",
        "Episch (Lila) → Cap 70",
        "Legendär (Orange) → Cap 85",
        "Suprem (Rot) → Cap 100 — nur über Fusion erreichbar, droppt nie.",
      ] },
    { key: "packs", title: "Booster-Packs & Pity", sym: "🎁", art: "pack_gold",
      arts: ["pack_bronze", "pack_silver", "pack_gold", "pack_arcane"],
      intro: "Packs sind die Hauptquelle für Karten und Material. Jedes Pack nennt seine " +
        "Garantie im Klartext statt in Prozenten.",
      bullets: [
        "Bronze — 5 Karten, mindestens eine Gute oder besser.",
        "Silber — 7 Karten, mindestens eine Seltene oder besser.",
        "Gold — 9 Karten, mindestens eine Epische oder besser.",
        "Arkan — 11 Karten, mindestens eine Legendäre.",
        "Der Pity-Zähler steht OFFEN auf dem Pack: „Episch garantiert in \u2264 N\u201c.",
      ] },
    { key: "fortress", title: "Die Festung", sym: "🏰", art: "fort_castle",
      arts: ["track_hp", "track_dmg", "track_rate"],
      intro: "Die dritte Progressionsachse neben Kartenlevel und Rarität. Sie wirkt in " +
        "JEDEM Match, nicht nur bei einer Karte — und sie ist die planbare Gold-Senke.",
      bullets: [
        "Drei Spuren: Burg-Stabilität, Prisma-Fokus, Prisma-Taktung.",
        "EIN gemeinsamer Kostenzähler: Die Reihenfolge ist eine echte Entscheidung.",
        "Der Bonus pro Stufe sinkt, die Kosten steigen — früh kaufen lohnt.",
        "Trophäen-Tore geben höhere Stufen erst ab bestimmten Rängen frei.",
        "Zwei Darstellungen umschaltbar: Konstellation oder Banner-Stapel.",
      ] },
    { key: "clan", title: "Clan & Ghost-Clankrieg", sym: "🛡", art: "hub_clan",
      intro: "30 Mitglieder, gemeinsame Wochenquests und am Wochenende Krieg gegen einen " +
        "Geister-Clan. Niemand muss dafür gleichzeitig online sein.",
      bullets: [
        "Montag bis Freitag: Sammelphase — Quests und Spenden zählen.",
        "Samstag und Sonntag: Kriegsphase — je 3 Angriffe pro Tag.",
        "Spenden: nur Turmkarten, nur graue Kopien, 10 pro 3 Stunden.",
        "Auch verlorene Angriffe bringen Kriegspunkte.",
        "Serien-Siege schalten Banner-Rahmen frei: Bronze → Silber → Gold → Prisma.",
      ] },
    { key: "season", title: "Season-Pass & Tresor", sym: "🎟", art: "pass_keyart",
      intro: "Zwei Systeme, die über die Zeit laufen: der Pass über einen Kalendermonat, " +
        "der Tresor über deine Siege.",
      bullets: [
        "Pass: 50 Stufen, kostenlose und Premium-Spur, XP aus Siegen und Packs.",
        "Die Saison endet mit dem Monat — auch der gekaufte Premium-Pass.",
        "Tresor: füllt sich mit jedem Sieg um Gems.",
        "Der Tresor wird nur GANZ geöffnet — halb voll bringt nichts.",
        "Je höher deine Arena, desto mehr Gems pro Sieg.",
      ] },
    { key: "daily", title: "Täglich zurückkommen", sym: "🗓", art: "chest_bronze",
      intro: "Vier kleine Systeme, die zusammen den Grund liefern, jeden Tag einmal " +
        "reinzuschauen — jedes greift an einer anderen Stelle der Sitzung an.",
      bullets: [
        "Login-Kalender: 7 Tage, Anker sind Booster-Packs (Tag 7 = Gold-Pack).",
        "Verpasste Tage kosten NICHTS — der Kalender rückt nur beim Abholen vor.",
        "Drei Tagesquests, Reset 00:00 UTC, bei 3/3 eine Tagestruhe.",
        "Siegesserie: bis zu 1,50× Gold — eine Niederlage setzt sie zurück.",
        "Gratis-Pack alle 4 Stunden, maximal zwei gestapelt.",
      ] },
  ];
  var MANUAL_BY_KEY = {};
  MANUAL.forEach(function (m) { MANUAL_BY_KEY[m.key] = m; });

  /* ================= Persistenz ================= */

  var CLOCK = null;
  function nowMs(o) {
    if (typeof o === "number" && isFinite(o)) return o;
    return CLOCK ? CLOCK() : Date.now();
  }
  var memStore = null;
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
  /* ts0(v) — Zeitstempel normalisieren. NIEMALS `v | 0`: ein
   * Millisekunden-Zeitstempel ist > 2³¹ und wird von einer 32-Bit-
   * Bit-Operation in eine negative Zahl verwandelt. Genau dieser Fehler
   * hat beim ersten Testlauf jedes gesetzte mark() sofort wieder
   * unsichtbar gemacht (Math.max(0, negativ) === 0 === falsy). */
  function ts0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  function fresh() {
    return {
      v: STATE_VERSION,
      done: {},            // {taskKey: ts} — WANN zuerst erfüllt
      claimed: [],         // Aufgaben, deren Belohnung abgeholt ist
      chapters: [],        // Kapitel, deren Pack abgeholt ist
      marks: {},           // {markKey: ts} — vom UI gemeldete Sichtungen
      read: [],            // gelesene Handbuchseiten
      stats: { tasksClaimed: 0, chaptersClaimed: 0 },
    };
  }
  function get() {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    s.v = STATE_VERSION;
    if (!s.done || typeof s.done !== "object") s.done = {};
    if (!s.marks || typeof s.marks !== "object") s.marks = {};
    if (!Array.isArray(s.claimed)) s.claimed = [];
    if (!Array.isArray(s.chapters)) s.chapters = [];
    if (!Array.isArray(s.read)) s.read = [];
    // Fremde Schlüssel fallen raus — ein importierter Spielstand kann
    // sonst Belohnungen für Aufgaben tragen, die es nicht mehr gibt.
    s.claimed = s.claimed.filter(function (k2) { return !!TASK_BY_KEY[k2]; });
    s.chapters = s.chapters.filter(function (k2) { return !!CHAPTER_BY_KEY[k2]; });
    s.read = s.read.filter(function (k2) { return !!MANUAL_BY_KEY[k2]; });
    var cleanDone = {};
    for (var d in s.done) if (TASK_BY_KEY[d]) cleanDone[d] = ts0(s.done[d]);
    s.done = cleanDone;
    var cleanMarks = {};
    for (var m in s.marks) if (MARK_KEYS.indexOf(m) >= 0) cleanMarks[m] = ts0(s.marks[m]);
    s.marks = cleanMarks;
    if (!s.stats || typeof s.stats !== "object") s.stats = f.stats;
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function bank() {
    var h = hostObj();
    return (h && h.ArenaCards) || null;
  }
  function bankMaterial(n) {
    var b = bank();
    if (b && n > 0) b.addMaterial(n);
  }
  function telemetry() {
    var t = mod("ArenaTelemetry");
    return (t && typeof t.track === "function") ? t : null;
  }

  /* ================= Auswertung ================= */

  /* probe(task, st) → aktueller Stand der Aufgabe (Zahl). */
  function probe(task, st) {
    var p = PROBES[task.probe];
    if (!p) return 0;
    return p(task.arg, st) | 0;
  }

  /* sync(now) — erfüllte Aufgaben festschreiben. Wird von jedem Leser
   * aufgerufen; einmal erfüllt bleibt erfüllt (siehe Kopfkommentar). */
  function sync(now) {
    now = nowMs(now);
    var s = get(), changed = false;
    CHAPTERS.forEach(function (c) {
      c.tasks.forEach(function (t) {
        if (s.done[t.key]) return;
        if (probe(t, s) >= t.need) { s.done[t.key] = now; changed = true; }
      });
    });
    if (changed) save(s);
    return s;
  }

  /* chapters(now) → alles, was der Guide-View braucht.
   * Kapitel n+1 ist erst offen, wenn Kapitel n vollständig ERLEDIGT ist
   * (nicht: abgeholt) — gestaffelt, aber ohne Abhol-Zwang. */
  function chapters(now) {
    now = nowMs(now);
    var s = sync(now);
    var prevComplete = true;
    return CHAPTERS.map(function (c) {
      var tasks = c.tasks.map(function (t) {
        var have = s.done[t.key] ? t.need : probe(t, s);
        var done = !!s.done[t.key];
        var claimed = s.claimed.indexOf(t.key) >= 0;
        return {
          key: t.key, title: t.title, desc: t.desc,
          need: t.need, have: Math.min(have, t.need), raw: have,
          pct: Math.min(1, have / t.need),
          done: done, claimed: claimed, claimable: done && !claimed,
          gold: t.gold, material: t.material,
          kind: t.probe === "mark" ? "mark" : "auto",
        };
      });
      var doneCount = tasks.filter(function (t) { return t.done; }).length;
      var complete = doneCount === tasks.length;
      var locked = !prevComplete;
      var chClaimed = s.chapters.indexOf(c.key) >= 0;
      var out = {
        key: c.key, name: c.name, sym: c.sym, desc: c.desc, art: c.art,
        tasks: tasks, doneCount: doneCount, total: tasks.length,
        complete: complete, locked: locked,
        pct: doneCount / tasks.length,
        pack: c.pack, chapterClaimed: chClaimed,
        chapterClaimable: complete && !chClaimed,
        openClaims: tasks.filter(function (t) { return t.claimable; }).length +
                    (complete && !chClaimed ? 1 : 0),
      };
      prevComplete = complete;
      return out;
    });
  }

  /* progress(now) → Fortschrittsleiste über ALLE Kapitel. */
  function progress(now) {
    var cs = chapters(now);
    var done = 0, total = 0, chDone = 0;
    cs.forEach(function (c) {
      done += c.doneCount; total += c.total;
      if (c.complete) chDone++;
    });
    return {
      tasksDone: done, tasksTotal: total, pct: total ? done / total : 0,
      pctText: Math.round((total ? done / total : 0) * 100) + " %",
      chaptersDone: chDone, chaptersTotal: cs.length,
      complete: done === total,
    };
  }

  /* badge(now) → EINE Zahl für den roten Punkt. */
  function badge(now) {
    var n = 0;
    chapters(now).forEach(function (c) { if (!c.locked) n += c.openClaims; });
    return n;
  }

  /* claimTask(key) → {gold, material}. Material gebucht, Gold gemeldet. */
  function claimTask(key, now) {
    now = nowMs(now);
    var t = TASK_BY_KEY[key];
    if (!t) throw new Error("Unbekannte Aufgabe.");
    var s = sync(now);
    if (s.claimed.indexOf(key) >= 0) throw new Error("Diese Belohnung ist schon abgeholt.");
    if (!s.done[key]) {
      throw new Error("Noch nicht erledigt: " + t.title + " (" + probe(t, s) + "/" + t.need + ").");
    }
    s.claimed.push(key);
    s.stats.tasksClaimed = (s.stats.tasksClaimed | 0) + 1;
    save(s);
    bankMaterial(t.material);
    return { key: key, title: t.title, gold: t.gold, material: t.material,
             chapter: CHAPTER_OF_TASK[key] };
  }

  /* claimChapter(key) → Kapitel-Pack. Erst wenn ALLE Aufgaben des
   * Kapitels erledigt sind — Einzelbelohnungen dürfen offen bleiben. */
  function claimChapter(key, now) {
    now = nowMs(now);
    var c = CHAPTER_BY_KEY[key];
    if (!c) throw new Error("Unbekanntes Kapitel.");
    var view = null;
    chapters(now).forEach(function (x) { if (x.key === key) view = x; });
    if (view.chapterClaimed) throw new Error("Die Kapitel-Belohnung ist schon abgeholt.");
    if (!view.complete) {
      throw new Error("Erst alle Aufgaben erledigen (" + view.doneCount + "/" + view.total + ").");
    }
    var s = get();
    s.chapters.push(key);
    s.stats.chaptersClaimed = (s.stats.chaptersClaimed | 0) + 1;
    save(s);
    var t = telemetry();
    if (t) t.track("tutorial_step", { step: "guide_" + key, done: s.chapters.length });
    return { key: key, name: c.name, pack: c.pack };
  }

  /* mark(key) — vom UI gemeldete Sichtung. Unbekannte Schlüssel werden
   * still verworfen; das ist Absicht, damit ein Tippfehler im UI nicht
   * den Guide-State vermüllt. */
  function mark(key, now) {
    now = nowMs(now);
    if (MARK_KEYS.indexOf(key) < 0) return { marked: false, reason: "unknown" };
    var s = get();
    if (s.marks[key]) return { marked: false, reason: "already", ts: s.marks[key] };
    s.marks[key] = now;
    save(s);
    sync(now);
    return { marked: true, key: key, ts: now };
  }
  function marked(key) { return !!get().marks[key]; }

  /* ================= Handbuch ================= */

  function manual(now) {
    var s = get();
    return MANUAL.map(function (m) {
      return {
        key: m.key, title: m.title, sym: m.sym, art: m.art,
        arts: (m.arts || []).slice(), intro: m.intro, bullets: m.bullets.slice(),
        read: s.read.indexOf(m.key) >= 0,
      };
    });
  }
  /* readPage(key) — markiert eine Handbuchseite als gelesen und löst
   * damit zugleich die Guide-Aufgabe „manual_seen" aus. */
  function readPage(key, now) {
    now = nowMs(now);
    if (!MANUAL_BY_KEY[key]) return { read: false, reason: "unknown" };
    var s = get();
    if (s.read.indexOf(key) < 0) { s.read.push(key); save(s); }
    mark("manual_seen", now);
    return { read: true, key: key, total: get().read.length, of: MANUAL.length };
  }

  function reset() { save(fresh()); return get(); }

  /* ================= Export ================= */
  var API = {
    CHAPTERS: CHAPTERS, MANUAL: MANUAL, MARK_KEYS: MARK_KEYS,
    TASK_TOTAL: TASK_TOTAL, STATE_VERSION: STATE_VERSION,
    get: get, chapters: chapters, progress: progress, badge: badge,
    claimTask: claimTask, claimChapter: claimChapter,
    mark: mark, marked: marked, manual: manual, readPage: readPage,
    reset: reset,
    _key: KEY, _write: function (s) { save(s); }, _probe: probe,
    _clock: function (fn) { CLOCK = fn || null; },
  };

  if (typeof window !== "undefined") window.ArenaGuide = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_guide.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, i) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (i !== undefined ? "  " + i : ""));
      if (!cond) fail++;
    };
    var pad = function (x, n) { x = String(x); while (x.length < n) x += " "; return x; };
    var throws = function (fn, part) {
      try { fn(); return { ok: false, msg: "(kein Fehler)" }; }
      catch (e) { return { ok: part ? e.message.indexOf(part) >= 0 : true, msg: e.message }; }
    };

    /* --- Fremde Module als steuerbare Stubs --- */
    var TEL = {};                       // Ereignis → Zähler
    globalThis.ArenaTelemetry = {
      count: function (k) { return TEL[k] | 0; },
      track: function () {},
    };
    var CARDS = { tier: "common", lvl: 1, material: 0 };
    globalThis.ArenaCards = {
      get: function () {
        return { cards: { fire: { tier: CARDS.tier, lvl: CARDS.lvl } } };
      },
      tierOf: function (k) {
        var idx = ["common", "good", "rare", "epic", "legendary", "supreme"].indexOf(k);
        return { index: idx < 0 ? 0 : idx };
      },
      addMaterial: function (n) { CARDS.material += n; },
    };
    var CLAN = { joined: false, donated: 0, war: 0 };
    globalThis.ArenaClan = {
      info: function () { return { joined: CLAN.joined }; },
      get: function () { return { stats: { donatedTotal: CLAN.donated, warPointsTotal: CLAN.war } }; },
    };
    var FORT = { steps: 0 };
    globalThis.ArenaFortress = { get: function () { return { steps: FORT.steps }; } };
    var DAILY = { claims: 0 };
    globalThis.ArenaDaily = { get: function () { return { login: { claims: DAILY.claims } }; } };

    var T0 = Date.UTC(2026, 6, 27, 10, 0, 0);
    API._clock(function () { return T0; });

    console.log("\n=== ARENA GUIDE — Selbsttest (Einsteiger-Guide + Handbuch) ===\n");

    /* ================= 1. Aufbau ================= */
    reset();
    var cs = chapters();
    console.log("Kapitel:");
    cs.forEach(function (c) {
      console.log("  " + c.sym + " " + pad(c.name, 20) + c.total + " Aufgaben, " +
        "Abschluss: " + c.pack.toUpperCase() + "-Pack" + (c.locked ? "   (gesperrt)" : ""));
      c.tasks.forEach(function (t) {
        console.log("      " + pad(t.kind, 6) + pad(t.title, 44) +
          t.gold + " Gold · " + t.material + " Material");
      });
    });
    check("4 gestaffelte Kapitel", cs.length === 4,
      cs.map(function (c) { return c.key; }).join("/"));
    check("16 Aufgaben insgesamt", TASK_TOTAL === 16 && progress().tasksTotal === 16, TASK_TOTAL);
    check("jedes Kapitel schliesst mit einem BOOSTER-PACK",
      cs.every(function (c) { return ["bronze", "silver", "gold", "arcane"].indexOf(c.pack) >= 0; }),
      cs.map(function (c) { return c.pack; }).join("/"));
    check("Kapitel-Packs steigern sich",
      cs[0].pack === "bronze" && cs[3].pack === "gold");
    check("jede Aufgabe hat Gold UND Material als Belohnung",
      cs.every(function (c) {
        return c.tasks.every(function (t) { return t.gold > 0 && t.material > 0; });
      }));
    check("Aufgaben-Keys sind global eindeutig",
      Object.keys(TASK_BY_KEY).length === TASK_TOTAL);
    check("nur Kapitel 1 ist offen, 2-4 sind gesperrt",
      cs[0].locked === false && cs.slice(1).every(function (c) { return c.locked; }));
    check("frischer Spieler: 0 Aufgaben erledigt",
      progress().tasksDone === 0 && progress().pctText === "0 %");
    check("badge() ist 0, solange nichts erledigt ist", badge() === 0);

    /* ================= 2. Häkchen aus fremden Modulen ================= */
    console.log("\nHaekchen kommen aus den bestehenden Zustaenden:");
    check("Aufgabe offen, solange die Telemetrie 0 zaehlt",
      chapters()[0].tasks[0].done === false);
    TEL.first_win = 1;
    check("ArenaTelemetry first_win → Haekchen bei 'Gewinne dein erstes Match'",
      chapters()[0].tasks[0].done === true && chapters()[0].tasks[0].claimable === true);
    TEL.pack_opened = 1;
    DAILY.claims = 1;
    check("pack_opened und Login-Abholung setzen ihre Haekchen",
      chapters()[0].tasks[1].done && chapters()[0].tasks[2].done);
    check("badge() zaehlt die offenen Abholungen", badge() === 3, badge());
    check("'mark'-Aufgabe bleibt offen, bis das UI sie meldet",
      chapters()[0].tasks[3].done === false);
    var mk = mark("card_seen");
    check("mark('card_seen') setzt das Haekchen",
      mk.marked === true && chapters()[0].tasks[3].done === true);
    check("zweites mark() ist ein No-Op", mark("card_seen").marked === false);
    check("unbekannter mark-Key wird still verworfen",
      mark("quatsch").reason === "unknown" && Object.keys(get().marks).length === 1);
    check("Kapitel 1 ist jetzt vollstaendig",
      chapters()[0].complete === true && chapters()[0].doneCount === 4);
    check("Kapitel 2 dadurch entsperrt", chapters()[1].locked === false);
    check("Kapitel 3 bleibt gesperrt", chapters()[2].locked === true);

    /* --- einmal erfuellt bleibt erfuellt --- */
    TEL.first_win = 0;
    check("EINMAL ERFUELLT BLEIBT ERFUELLT (Zaehler-Reset schadet nicht)",
      chapters()[0].tasks[0].done === true, "first_win-Zaehler auf 0 zurueckgesetzt");
    TEL.first_win = 1;

    /* ================= 3. Belohnungen ================= */
    console.log("\nBelohnungen:");
    var matBefore = CARDS.material;
    var r1 = claimTask("win1");
    console.log("  " + r1.title + " → " + r1.gold + " Gold, " + r1.material + " Material");
    check("claimTask liefert Gold und Material", r1.gold === 800 && r1.material === 5);
    check("Material wird in der Kartenbank gebucht",
      CARDS.material === matBefore + 5, matBefore + " → " + CARDS.material);
    check("GOLD wird nur gemeldet (Wallet liegt im Hub)",
      typeof r1.gold === "number");
    check("doppelte Abholung wird blockiert",
      throws(function () { claimTask("win1"); }, "schon abgeholt").ok);
    check("nicht erledigte Aufgabe wird abgelehnt",
      throws(function () { claimTask("merge1"); }, "Noch nicht erledigt").ok,
      throws(function () { claimTask("merge1"); }).msg);
    check("unbekannte Aufgabe wirft", throws(function () { claimTask("nix"); }, "Unbekannte").ok);
    // 3 offene Aufgaben-Belohnungen + 1 offenes Kapitel-Pack
    check("badge() sinkt nach dem Abholen", badge() === 4, badge());

    /* --- Kapitel-Belohnung --- */
    check("Kapitel-Pack erst nach ALLEN Aufgaben", (function () {
      return chapters()[0].chapterClaimable === true &&
             chapters()[1].chapterClaimable === false;
    })());
    var ch1 = claimChapter("start");
    console.log("  Kapitel „" + ch1.name + "\" abgeschlossen → " + ch1.pack.toUpperCase() + "-Pack");
    check("claimChapter liefert das Pack", ch1.pack === "bronze");
    check("Kapitel-Pack nur einmal",
      throws(function () { claimChapter("start"); }, "schon abgeholt").ok);
    check("unvollstaendiges Kapitel wird abgelehnt",
      throws(function () { claimChapter("cards"); }, "Erst alle Aufgaben").ok,
      throws(function () { claimChapter("cards"); }).msg);
    check("Einzelbelohnungen duerfen offen bleiben",
      chapters()[0].tasks.filter(function (t) { return t.claimable; }).length === 3 &&
      chapters()[0].chapterClaimed === true);

    /* ================= 4. Alle Kapitel durchspielen ================= */
    console.log("\nAlle Sonden:");
    TEL.first_merge = 1; CARDS.tier = "good"; CARDS.lvl = 10; TEL.pack_opened = 5;
    var c2 = chapters()[1];
    console.log("  Kapitel 2: " + c2.doneCount + "/" + c2.total + " erledigt");
    check("Fusion, Raritaet, Level 10 und 5 Packs setzen Kapitel 2 komplett",
      c2.complete === true, c2.tasks.map(function (t) { return t.key + ":" + t.done; }).join(" "));
    check("Teilfortschritt wird angezeigt (Level 10 von 10)",
      c2.tasks[2].have === 10 && c2.tasks[2].pct === 1);
    CLAN.joined = true; CLAN.donated = 4; CLAN.war = 130;
    mark("board_seen");
    check("Clan-Sonden (Beitritt, Spende, Kriegspunkte) greifen",
      chapters()[2].complete === true);
    FORT.steps = 1;
    mark("vault_seen"); mark("pass_seen");
    check("Handbuch-Aufgabe offen, bis eine Seite gelesen wurde",
      chapters()[3].tasks[3].done === false);
    var rp = readPage("fusion");
    check("readPage() markiert die Seite UND erfuellt die Aufgabe",
      rp.read === true && chapters()[3].tasks[3].done === true &&
      manual()[1].read === true);
    check("alle vier Kapitel vollstaendig",
      chapters().every(function (c) { return c.complete; }));
    check("progress() steht auf 100 %",
      progress().pct === 1 && progress().pctText === "100 %" &&
      progress().tasksDone === 16 && progress().complete === true,
      progress().tasksDone + "/" + progress().tasksTotal);
    check("kein Kapitel mehr gesperrt",
      chapters().every(function (c) { return !c.locked; }));

    /* ================= 5. Handbuch ================= */
    console.log("\nHandbuch:");
    var man = manual();
    man.forEach(function (m) {
      console.log("  " + m.sym + " " + pad(m.title, 30) + m.bullets.length + " Punkte, " +
        "Bild " + m.art + (m.arts.length ? " (+" + m.arts.length + ")" : ""));
    });
    check("8 Handbuchseiten", man.length === 8, man.length);
    check("jede Seite hat Titel, Einleitung und Aufzaehlung",
      man.every(function (m) { return m.title && m.intro.length > 40 && m.bullets.length >= 4; }));
    check("jede Seite nennt ein Asset zur Illustration",
      man.every(function (m) { return !!m.art; }));
    check("die Kernsysteme sind abgedeckt", (function () {
      var ks = man.map(function (m) { return m.key; });
      return ["towers", "fusion", "rarity", "packs", "fortress", "clan", "season", "daily"]
        .every(function (k) { return ks.indexOf(k) >= 0; });
    })(), man.map(function (m) { return m.key; }).join(","));
    check("Fusionsregel steht woertlich im Handbuch",
      /3 gleiche/.test(MANUAL_BY_KEY.fusion.title) &&
      MANUAL_BY_KEY.fusion.bullets.some(function (b) { return /GRAUE Basis-Kopien/.test(b); }));
    check("Login-Kalender-Regel steht im Handbuch",
      MANUAL_BY_KEY.daily.bullets.some(function (b) { return /Verpasste Tage kosten NICHTS/.test(b); }));
    check("unbekannte Seite wird abgelehnt", readPage("nix").read === false);
    check("dieselbe Seite zweimal lesen aendert nichts",
      readPage("fusion").total === 1, readPage("fusion").total);

    /* ================= 6. Robustheit ================= */
    console.log("\nRobustheit:");
    check("Muell im Speicher → frischer State", (function () {
      lsSet("{kaputt,,,");
      var s = get();
      return s.v === 1 && Object.keys(s.done).length === 0 && s.claimed.length === 0;
    })());
    check("kaputter State wird geheilt", (function () {
      lsSet(JSON.stringify({
        v: 1, done: { win1: 123, quatsch: 5 }, claimed: ["win1", "nixgibts"],
        chapters: ["start", "fantasie"], marks: { vault_seen: 9, boese: 1 },
        read: ["fusion", "kaputt"], stats: 42,
      }));
      var s = get();
      return Object.keys(s.done).length === 1 && s.claimed.length === 1 &&
             s.chapters.length === 1 && Object.keys(s.marks).length === 1 &&
             s.read.length === 1 && typeof s.stats === "object";
    })(), JSON.stringify(get().claimed) + " / " + JSON.stringify(get().chapters));
    check("fehlende Fremdmodule → alle Sonden 0, kein Crash", (function () {
      reset();
      var keep = [globalThis.ArenaTelemetry, globalThis.ArenaCards, globalThis.ArenaClan,
                  globalThis.ArenaFortress, globalThis.ArenaDaily];
      delete globalThis.ArenaTelemetry; delete globalThis.ArenaCards;
      delete globalThis.ArenaClan; delete globalThis.ArenaFortress; delete globalThis.ArenaDaily;
      var ok = chapters().length === 4 && progress().tasksDone === 0 && badge() === 0 &&
               manual().length === 8;
      var ok2 = mark("vault_seen").marked === true;      // mark braucht kein Fremdmodul
      globalThis.ArenaTelemetry = keep[0]; globalThis.ArenaCards = keep[1];
      globalThis.ArenaClan = keep[2]; globalThis.ArenaFortress = keep[3];
      globalThis.ArenaDaily = keep[4];
      return ok && ok2;
    })());
    check("fehlendes ArenaCards → Abholen wirft nicht", (function () {
      reset();
      TEL.first_win = 1;
      var keep = globalThis.ArenaCards;
      delete globalThis.ArenaCards;
      var r = claimTask("win1");
      globalThis.ArenaCards = keep;
      return r.gold === 800;
    })());
    check("reset() nullt alles", (function () {
      var s = reset();
      return Object.keys(s.done).length === 0 && s.claimed.length === 0 &&
             s.chapters.length === 0 && s.read.length === 0;
    })());
    var NEED = ["get", "chapters", "progress", "badge", "claimTask", "claimChapter",
                "mark", "marked", "manual", "readPage", "reset"];
    check("API vollstaendig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");

    API._clock(null);
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
