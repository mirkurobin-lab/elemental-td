/* ==================================================================
 * ARENA AVATARS — Profilbild + Rahmen („Profil bearbeiten")
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Bis hierher hatte das Spiel EINEN
 * Avatar; AA schaltet ab Arena 5 laufend neue frei und macht daraus
 * eine kleine Zeremonie. Dieses Modul liefert dafür Katalog, Zustand
 * und Freischalt-Logik. Die Darstellung liegt komplett im UI.
 *
 * ZWEI GETRENNTE SAMMLUNGEN, FREI KOMBINIERBAR
 * --------------------------------------------
 * Ein Profilbild besteht bei AA aus ZWEI unabhängigen Teilen:
 *
 *     PORTRÄT (avatar)  +  RAHMEN (frame)  =  Profilbild
 *
 * Beide haben ihren EIGENEN Katalog, ihre EIGENEN Freischalt-
 * bedingungen und ihren EIGENEN Zustandszweig mit eigenem `gewaehlt`.
 * Es gibt KEINE Kopplung: jeder freigeschaltete Rahmen passt zu jedem
 * freigeschalteten Porträt, 12 × 8 = 96 Kombinationen. `select()`
 * berührt den Rahmen nie, `selectFrame()` das Porträt nie — genau
 * dafür ist der Zustand zweigeteilt und nicht ein flaches Feld.
 *
 * WARUM EIN HÖCHSTSTAND STATT DES TAGESWERTS
 * ------------------------------------------
 * Trophäen können SINKEN (Niederlagen, Saison-Reset). Würde `list()`
 * gegen den Tageswert prüfen, verlöre man einen bereits benutzten
 * Avatar mitten in der Saison wieder — und das UI müsste ihn aus dem
 * Profil reißen. Deshalb schreibt `syncUnlocks()` einen HÖCHSTSTAND
 * fort (`stand`) und merkt jeden je erreichten Schlüssel in `bekannt`.
 * Freigeschaltet bleibt freigeschaltet.
 *
 * `bekannt` hat einen zweiten Zweck: Es trennt „schon freigeschaltet"
 * von „gerade freigeschaltet". `syncUnlocks()` gibt NUR die neuen
 * Einträge zurück — das ist die Liste, die das UI als Zeremonie
 * abspielt. Ein zweiter Aufruf liefert nichts mehr, die Zeremonie
 * läuft also nie doppelt, auch nicht nach einem Reload.
 *
 * PORTRÄTS: 2 VON 12 EXISTIEREN
 * -----------------------------
 * Vorhanden sind die beiden Helden-Artworks `card_solara` und
 * `card_magmor`. Die anderen zehn tragen `portrait: null` und einen
 * `portraitWunsch`-Schlüssel (`av_*`) — das ist die Bestellliste für
 * die Bildgenerierung, abrufbar über `missingPortraits()`. Bis dahin
 * zeichnet das UI das `emoji` des Eintrags. Rahmen sind vollständig:
 * sie greifen auf die sechs vorhandenen `frame_*`-Raritätsrahmen zu.
 *
 * WIRING:
 *   1. <script src="arena_avatars.js"></script> vor dem Haupt-Script.
 *   2. Einmalig die Asset-Tabelle anmelden, damit `active()` fertige
 *      URLs liefern kann:
 *        ArenaAvatars.assets(ASSETS);
 *   3. Nach jedem Match / beim Hub-Eintritt:
 *        var r = ArenaAvatars.syncUnlocks({ trophaeen: profil.trophies });
 *        r.neu.forEach(zeigeZeremonie);       // meist leer
 *   4. Anzeige (Ladebildschirm, HUD, Profilzeile):
 *        var a = ArenaAvatars.active();
 *        a.portraitUrl || a.emoji, a.ringUrl
 *
 * Selbsttest: `node arena_patches/arena_avatars.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "apd_avatars_v1";
  /* Vorgänger-Schlüssel aus der Zeit mit EINEM Avatar. Er trug nur den
     Namen des gewählten Porträts als reinen String. migrate() hebt ihn
     an; ein Spieler, der schon gewählt hatte, behält seine Wahl. */
  var LEGACY_KEY = "apd_avatar";
  var STATE_VERSION = 1;

  /* ================= Raritäten =================
   * Dieselben sechs Stufen und Farben wie in arena_cards.js. Bewusst
   * hier gespiegelt und nicht importiert: Das Modul muss auch ohne
   * ArenaCards laufen (Ladebildschirm, Match-Prozess). */
  var TIERS = [
    { key: "common",    name: "Gewöhnlich", color: "#9aa3ad", index: 0, ring: "frame_common" },
    { key: "good",      name: "Gut",        color: "#58c26a", index: 1, ring: "frame_good" },
    { key: "rare",      name: "Selten",     color: "#3d9df2", index: 2, ring: "frame_rare" },
    { key: "epic",      name: "Episch",     color: "#a45ef2", index: 3, ring: "frame_epic" },
    { key: "legendary", name: "Legendär",   color: "#f2a13d", index: 4, ring: "frame_legendary" },
    { key: "supreme",   name: "Suprem",     color: "#ff5e7e", index: 5, ring: "frame_supreme" },
  ];
  var TIER_BY_KEY = {};
  TIERS.forEach(function (t) { TIER_BY_KEY[t.key] = t; });

  /* ================= Arenen und Liga =================
   * Schwellen SPIEGELN ARENA_TIERS / LEAGUE_GATES aus dem Prototyp.
   * Wer dort eine Schwelle ändert, muss sie hier mitziehen — sonst
   * verspricht der Freischalt-Text eine andere Arena als die Straße
   * anzeigt. Ein Selbsttest-Check hängt an genau diesen Zahlen. */
  var ARENAS = [
    { n: 1, name: "Kristallhof",      at: 0 },
    { n: 2, name: "Smaragdtal",       at: 300 },
    { n: 3, name: "Saphirfeste",      at: 600 },
    { n: 4, name: "Sturmspitze",      at: 900 },
    { n: 5, name: "Obsidian-Thron",   at: 1200 },
    { n: 6, name: "Prisma-Zitadelle", at: 1500 },
    { n: 7, name: "Aschenmark",       at: 2000 },
    { n: 8, name: "Frostbastion",     at: 2500 },
  ];
  var LEAGUE_NAME = "Prisma-Liga";
  var LEAGUE_GATES = [
    { n: 1,  name: "Eingangstor",  at: 2900 },
    { n: 2,  name: "Steintor",     at: 3500 },
    { n: 3,  name: "Eisenpfad",    at: 4000 },
    { n: 4,  name: "Bronzewacht",  at: 4500 },
    { n: 5,  name: "Silberhalt",   at: 5000 },
    { n: 6,  name: "Goldweite",    at: 6000 },
    { n: 7,  name: "Kristallpfad", at: 7000 },
    { n: 8,  name: "Flammentor",   at: 8000 },
    { n: 9,  name: "Sturmkrone",   at: 9000 },
    { n: 10, name: "Prisma-Krone", at: 9800 },
  ];

  /* ================= Katalog: 12 PORTRÄTS =================
   * unlock.typ:
   *   "start"      — von Anfang an da (genau EINER)
   *   "arena"      — ab Arena `wert`
   *   "trophaeen"  — ab `wert` Trophäen
   *   "liga"       — ab Liga-Tor `wert`
   *   "pass"       — NICHT aus Trophäen ableitbar, muss über
   *                  grant("avatar", key) gebucht werden (Season-Pass,
   *                  Shop, Event). Bleibt sonst dauerhaft gesperrt.
   *
   * Die Staffelung folgt der Arena-Leiter, damit jede Arena ab 2 etwas
   * abwirft — Arena 5 (`solara`) ist der Fall, der uns zu diesem Modul
   * gebracht hat. Zwei Lücken (1350 Trophäen, Liga-Tor 1) sitzen
   * bewusst NEBEN der Leiter, sonst wären die Belohnungen zwischen
   * Arena 5 und 6 zu weit auseinander. */
  var AVATARS = [
    /* DIE FÜNF ZUR WAHL. Sie standen früher gestaffelt hinter Trophäen
       und Arenen — der Auftraggeber wollte ausdrücklich eine WAHL zum
       Start: „Bau ein das der Spieler unter den 5 wählen kann."
       Eine Auswahl mit genau einem freigeschalteten Eintrag ist keine
       Auswahl, sondern eine Ankündigung. Die Staffelung lebt in den
       Einträgen darunter weiter; dort verschenkt sie nichts, weil man
       die fünf hier schon hat. */
    { key: "novize",   name: "Prisma-Novize",         tier: "common",
      unlock: { typ: "start" },                 emoji: "🜂",
      portrait: "av_novize" },
    { key: "scherbe",  name: "Scherbenschmiedin",     tier: "common",
      unlock: { typ: "start" },                 emoji: "🔨",
      portrait: "av_scherbe" },
    { key: "smaragd",  name: "Smaragd-Wächter",       tier: "good",
      unlock: { typ: "start" },                 emoji: "🛡",
      portrait: "av_smaragd" },
    { key: "saphir",   name: "Saphir-Kanonier",       tier: "good",
      unlock: { typ: "start" },                 emoji: "💧",
      portrait: "av_saphir" },
    { key: "sturm",    name: "Sturmruferin",          tier: "rare",
      unlock: { typ: "start" },                 emoji: "🌩",
      portrait: "av_sturm" },
    /* HELDEN-AVATARE. Bedingung ist der BESITZ der Heldenkarte, nicht
       ein Trophäenstand: „jeder Held den wir haben einen Avatar bekommen
       den man als Profil Avatar wählen kann wenn man den Held besitzt."
       Das ist die bessere Kopplung — der Avatar zeigt dann etwas, das
       man wirklich hat, statt etwas, an dem man vorbeigelaufen ist.
       Eigenes Porträt statt des Kartenbilds: die Karte ist 896x1200 und
       zeigt die Figur in voller Gestalt; im Kreis von 32 px bliebe davon
       ein Ausschnitt der Hüfte. */
    { key: "solara",   name: "Solara, Lichtherrin",   tier: "epic",
      unlock: { typ: "held", wert: "solara" },  emoji: "☀",
      portrait: "av_held_solara" },
    { key: "obsidian", name: "Obsidian-Fürst",        tier: "epic",
      unlock: { typ: "trophaeen", wert: 1350 }, emoji: "⬛",
      portrait: null, portraitWunsch: "av_obsidian" },
    { key: "prisma",   name: "Prisma-Erzmagier",      tier: "legendary",
      unlock: { typ: "arena", wert: 6 },        emoji: "✦",
      portrait: null, portraitWunsch: "av_prisma" },
    { key: "asche",    name: "Aschenmark-Veteranin",  tier: "legendary",
      unlock: { typ: "arena", wert: 7 },        emoji: "🔥",
      portrait: null, portraitWunsch: "av_asche" },
    { key: "frost",    name: "Frostbastion-Hüterin",  tier: "legendary",
      unlock: { typ: "arena", wert: 8 },        emoji: "❄",
      portrait: null, portraitWunsch: "av_frost" },
    { key: "magmor",   name: "Magmor, Glutkoloss",    tier: "supreme",
      unlock: { typ: "held", wert: "magmor" },  emoji: "🌋",
      portrait: "av_held_magmor" },
    { key: "fortuna",  name: "Fortunas Erbin",        tier: "supreme",
      unlock: { typ: "pass", wert: 30 },        emoji: "🎟",
      portrait: null, portraitWunsch: "av_fortuna" },
  ];

  /* ================= Katalog: 8 RAHMEN =================
   * `ring` ist der Asset-Schlüssel des Rahmenbilds. Alle acht greifen
   * auf die sechs vorhandenen Raritätsrahmen zu (`frame_common` …
   * `frame_supreme`) — deshalb fehlt bei den Rahmen KEIN Asset.
   * Zwei Rahmen teilen sich absichtlich ein Bild (Bronzefiligran mit
   * Schlichter Reif, Fortunas Kranz mit Amethystreif): Sie sind über
   * die Farbe des Eintrags unterscheidbar, nicht über die Kontur. */
  var FRAMES = [
    { key: "schlicht",     name: "Schlichter Reif", tier: "common",
      unlock: { typ: "start" },                 ring: "frame_common",  emoji: "◯" },
    { key: "bronze",       name: "Bronzefiligran",  tier: "common",
      unlock: { typ: "trophaeen", wert: 200 },  ring: "frame_common",  emoji: "◎" },
    { key: "smaragdrand",  name: "Smaragdrand",     tier: "good",
      unlock: { typ: "arena", wert: 2 },        ring: "frame_good",    emoji: "❇" },
    { key: "saphirkranz",  name: "Saphirkranz",     tier: "rare",
      unlock: { typ: "arena", wert: 4 },        ring: "frame_rare",    emoji: "❈" },
    { key: "amethystreif", name: "Amethystreif",    tier: "epic",
      unlock: { typ: "arena", wert: 6 },        ring: "frame_epic",    emoji: "✧" },
    { key: "flammenkrone", name: "Flammenkrone",    tier: "legendary",
      unlock: { typ: "arena", wert: 7 },        ring: "frame_legendary", emoji: "♨" },
    { key: "prismareif",   name: "Prisma-Reif",     tier: "supreme",
      unlock: { typ: "liga", wert: 1 },         ring: "frame_supreme", emoji: "✵" },
    { key: "fortunakranz", name: "Fortunas Kranz",  tier: "epic",
      unlock: { typ: "pass", wert: 15 },        ring: "frame_epic",    emoji: "✺" },
  ];

  var AV_BY_KEY = {}, FR_BY_KEY = {};
  AVATARS.forEach(function (a, i) { a._i = i; AV_BY_KEY[a.key] = a; });
  FRAMES.forEach(function (f, i) { f._i = i; FR_BY_KEY[f.key] = f; });

  function startKey(list) {
    for (var i = 0; i < list.length; i++) if (list[i].unlock.typ === "start") return list[i].key;
    return list[0].key;
  }
  var AV_START = startKey(AVATARS), FR_START = startKey(FRAMES);

  /* ================= Persistenz ================= */

  /* Kein localStorage (node, private Modi, Quota voll) → Speicher im
     Prozess. Zwei Schlüssel, weil die Migration den alten mitliest. */
  var memStore = {};
  function lsGet(k) {
    try {
      if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(k);
    } catch (e) {}
    return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null;
  }
  function lsSet(k, v) {
    try {
      if (typeof localStorage !== "undefined" && localStorage) { localStorage.setItem(k, v); return; }
    } catch (e) {}
    memStore[k] = v;
  }
  function lsDel(k) {
    try {
      if (typeof localStorage !== "undefined" && localStorage) { localStorage.removeItem(k); return; }
    } catch (e) {}
    delete memStore[k];
  }

  /* ts0(v) — Zeitstempel normalisieren. NIEMALS `v | 0`: ein
     Millisekunden-Zeitstempel liegt über 2³¹ und wird von jeder
     32-Bit-Bit-Operation in eine negative Zahl gekippt. Derselbe
     Fehler hat in arena_guide.js schon einmal jede Markierung
     unsichtbar gemacht. */
  function ts0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  function n0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  var CLOCK = null;
  function nowMs(o) {
    if (typeof o === "number" && isFinite(o)) return o;
    return CLOCK ? CLOCK() : Date.now();
  }

  function startKeys(liste) {
    var out = [];
    liste.forEach(function (e) { if (e.unlock.typ === "start") out.push(e.key); });
    return out;
  }
  function fresh() {
    return {
      v: STATE_VERSION,
      /* ZWEI Zweige, absichtlich gleich gebaut und absichtlich
         getrennt. `gewaehlt` ist die Anzeige-Auswahl, `bekannt` das
         Zeremonie-Gedächtnis, `gewaehrt` die Liste der von außen
         gebuchten Einträge (Pass/Shop). */
      /* `bekannt` startet mit ALLEN Start-Einträgen, nicht nur mit dem
         gewählten. Sonst feiert der allererste syncUnlocks() die vier
         übrigen Start-Porträts als frisch freigeschaltet — eine
         Zeremonie für etwas, das der Spieler nie verdient hat. Solange
         es nur EIN Start-Porträt gab, fiel das nicht auf. */
      avatar: { gewaehlt: AV_START, bekannt: startKeys(AVATARS), gewaehrt: [], ts: 0 },
      frame:  { gewaehlt: FR_START, bekannt: startKeys(FRAMES), gewaehrt: [], ts: 0 },
      // Höchststand, gegen den gesperrt/frei entschieden wird.
      stand: { trophaeen: 0, arena: 1, liga: 0, helden: [] },
    };
  }

  /* migrate(raw) — hebt jeden Altzustand auf STATE_VERSION.
   *   kein Eintrag  → frisch, aber Legacy-Schlüssel wird gelesen
   *   v fehlt / 0   → v0: flaches {gewaehlt:"key"} aus der Ein-Avatar-Zeit
   *   v === 1       → aktuell
   * Unbekannte höhere Versionen werden NICHT heruntergerechnet: dann
   * lieber frisch anfangen als mit fremden Feldern weiterarbeiten. */
  function migrate(raw) {
    var f = fresh();
    if (!raw || typeof raw !== "object") {
      // v0-Sonderfall: der alte Einzel-Schlüssel trug nur einen String.
      var legacy = lsGet(LEGACY_KEY);
      if (typeof legacy === "string" && AV_BY_KEY[legacy]) {
        f.avatar.gewaehlt = legacy;
        if (f.avatar.bekannt.indexOf(legacy) < 0) f.avatar.bekannt.push(legacy);
        f.avatar.gewaehrt.push(legacy);   // Herkunft unbekannt → als gebucht behandeln
      }
      return f;
    }
    var v = n0(raw.v);
    if (v > STATE_VERSION) return f;
    if (v === 0) {
      // v0: flach, nur ein Avatar, keine Rahmen, kein Gedächtnis.
      var g = typeof raw.gewaehlt === "string" ? raw.gewaehlt : raw.avatar;
      if (typeof g === "string" && AV_BY_KEY[g]) {
        f.avatar.gewaehlt = g;
        if (f.avatar.bekannt.indexOf(g) < 0) f.avatar.bekannt.push(g);
        f.avatar.gewaehrt.push(g);
      }
      return f;
    }
    // v1 → heilen. Alles Fremde fällt raus, nichts wirft.
    var s = f;
    s.avatar = healBranch(raw.avatar, AV_BY_KEY, AV_START);
    s.frame = healBranch(raw.frame, FR_BY_KEY, FR_START);
    var st = (raw.stand && typeof raw.stand === "object") ? raw.stand : {};
    s.stand = {
      trophaeen: n0(st.trophaeen),
      arena: Math.max(1, Math.min(ARENAS.length, n0(st.arena) || 1)),
      liga: Math.max(0, Math.min(LEAGUE_GATES.length, n0(st.liga))),
      /* Auch ein Spielstand aus der Zeit VOR den Helden-Avataren muss
         hier ein Feld bekommen — sonst greift jeder spaetere Leser ins
         Leere. Unbekannte Helden-Ids fallen raus, damit ein manipulierter
         Spielstand keinen Avatar oeffnet, den es nicht gibt. */
      helden: (Array.isArray(st.helden) ? st.helden : []).filter(function (id, i, a) {
        return typeof id === "string" && HELDEN_NAME[id] && a.indexOf(id) === i;
      }),
    };
    // Höchststand darf der Arena nie widersprechen.
    var abyT = arenaFor(s.stand.trophaeen);
    if (abyT > s.stand.arena) s.stand.arena = abyT;
    var lbyT = ligaFor(s.stand.trophaeen);
    if (lbyT > s.stand.liga) s.stand.liga = lbyT;
    return s;
  }

  function healBranch(b, byKey, startK) {
    var alleStart = startKeys(byKey === AV_BY_KEY ? AVATARS : FRAMES);
    var out = { gewaehlt: startK, bekannt: alleStart.slice(), gewaehrt: [], ts: 0 };
    if (!b || typeof b !== "object") return out;
    out.ts = ts0(b.ts);
    var seen = {};
    alleStart.forEach(function (k) { seen[k] = 1; });
    (Array.isArray(b.bekannt) ? b.bekannt : []).forEach(function (k) {
      if (byKey[k] && !seen[k]) { seen[k] = 1; out.bekannt.push(k); }
    });
    if (!seen[startK]) seen[startK] = 1;               // Start ist immer bekannt
    var seenG = {};
    (Array.isArray(b.gewaehrt) ? b.gewaehrt : []).forEach(function (k) {
      if (byKey[k] && !seenG[k]) { seenG[k] = 1; out.gewaehrt.push(k); }
    });
    // Deduplizieren: der Start-Eintrag steckt schon drin.
    out.bekannt = out.bekannt.filter(function (k, i, a) { return a.indexOf(k) === i; });
    if (typeof b.gewaehlt === "string" && byKey[b.gewaehlt]) out.gewaehlt = b.gewaehlt;
    return out;
  }

  function get() {
    var raw = null;
    try { raw = JSON.parse(lsGet(KEY) || "null"); } catch (e) { raw = null; }
    var s = migrate(raw);
    /* Letzte Sicherung: zeigt `gewaehlt` auf etwas, das (noch) gesperrt
       ist — importierter Spielstand, zurückgesetzte Trophäen —, fällt
       die Auswahl auf den Start-Eintrag zurück. Ein Profil darf nie ein
       Bild zeigen, das der Spieler nicht besitzt. */
    if (!isUnlocked(AV_BY_KEY[s.avatar.gewaehlt], s)) s.avatar.gewaehlt = AV_START;
    if (!isUnlocked(FR_BY_KEY[s.frame.gewaehlt], s)) s.frame.gewaehlt = FR_START;
    return s;
  }
  function save(s) { try { lsSet(KEY, JSON.stringify(s)); } catch (e) {} }

  /* ================= Fortschritt ================= */

  function arenaFor(trophaeen) {
    var n = 1;
    for (var i = 0; i < ARENAS.length; i++) if (trophaeen >= ARENAS[i].at) n = ARENAS[i].n;
    return n;
  }
  function ligaFor(trophaeen) {
    var n = 0;
    for (var i = 0; i < LEAGUE_GATES.length; i++) if (trophaeen >= LEAGUE_GATES[i].at) n = LEAGUE_GATES[i].n;
    return n;
  }

  /* normStand(x) — nimmt entgegen, was die Aufrufer tatsächlich haben:
   *   Zahl            → Trophäen
   *   {trophaeen}     → unser Feldname
   *   {trophies|best} → ArenaProfile.get()
   *   {arena}         → nur die Arena-Nummer (z. B. aus dem Prototyp)
   * Arena und Liga werden aus den Trophäen abgeleitet, wenn sie nicht
   * mitkommen; eine MITGELIEFERTE höhere Arena gewinnt (der Aufrufer
   * kennt seinen Stand besser als unsere Schwellentabelle). */
  /* `helden` ist die Liste der BESESSENEN Heldenkarten-Ids. Sie steht im
     Stand und nicht in einem eigenen Zweig, weil sie dieselbe
     Eigenschaft hat wie Trophäen-Höchststand und Arena: sie wächst nur.
     Eine Heldenkarte verliert man nicht — und selbst wenn eine
     Aufrufstelle sie einmal nicht mitliefert, darf der Avatar nicht
     verschwinden. maxStand() vereinigt deshalb, es ersetzt nicht. */
  function normHelden(x) {
    var q = x && typeof x === "object"
      ? (x.helden || x.heroes || x.besitzt || null) : null;
    if (!q) return [];
    var out = [];
    for (var i = 0; i < q.length; i++) {
      var v = q[i];
      var id = (v && typeof v === "object") ? (v.id || v.cardId) : v;
      if (typeof id === "string" && id && out.indexOf(id) < 0) out.push(id);
    }
    return out;
  }
  function normStand(x) {
    var t = 0, a = 0, l = 0;
    if (typeof x === "number" && isFinite(x)) {
      t = Math.max(0, Math.floor(x));
    } else if (x && typeof x === "object") {
      t = Math.max(n0(x.trophaeen), n0(x.trophies), n0(x.best), n0(x.t));
      a = Math.max(n0(x.arena), n0(x.arenaNr));
      l = Math.max(n0(x.liga), n0(x.league), n0(x.gate));
    }
    var out = { trophaeen: t, arena: Math.max(1, a, arenaFor(t)), liga: Math.max(0, l, ligaFor(t)),
                helden: normHelden(x) };
    if (out.arena > ARENAS.length) out.arena = ARENAS.length;
    if (out.liga > LEAGUE_GATES.length) out.liga = LEAGUE_GATES.length;
    return out;
  }
  // Der jeweils größere von zwei Ständen, Feld für Feld.
  function maxStand(a, b) {
    var h = (a.helden || []).slice();
    (b.helden || []).forEach(function (id) { if (h.indexOf(id) < 0) h.push(id); });
    return { trophaeen: Math.max(n0(a.trophaeen), n0(b.trophaeen)),
             arena: Math.max(1, n0(a.arena), n0(b.arena)),
             liga: Math.max(0, n0(a.liga), n0(b.liga)),
             helden: h };
  }

  /* isUnlocked(eintrag, state) — der EINE Entscheider. Alles, was
     `locked` schreibt, ruft hier durch. */
  function isUnlocked(e, s) {
    if (!e) return false;
    var u = e.unlock, st = s.stand;
    var branch = AV_BY_KEY[e.key] === e ? s.avatar : s.frame;
    if (branch && branch.gewaehrt.indexOf(e.key) >= 0) return true;   // von außen gebucht
    switch (u.typ) {
      case "start":     return true;
      case "arena":     return n0(st.arena) >= n0(u.wert);
      case "trophaeen": return n0(st.trophaeen) >= n0(u.wert);
      case "liga":      return n0(st.liga) >= n0(u.wert);
      case "held":      return (st.helden || []).indexOf(u.wert) >= 0;
      case "pass":      return false;   // nur über grant()
      default:          return false;
    }
  }

  /* ================= Texte ================= */

  function num(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function arenaName(n) {
    for (var i = 0; i < ARENAS.length; i++) if (ARENAS[i].n === n) return ARENAS[i].name;
    return "";
  }
  /* Die Anzeigenamen der Helden. Bewusst hier gespiegelt statt aus dem
     Prototyp gezogen: das Modul muss DOM-frei laufen (Ladebildschirm,
     Match-Prozess). Kommt ein dritter Held dazu, gehört er hierher UND
     in den Katalog — der Selbsttest unten prüft, dass beide Listen
     zusammenpassen. */
  var HELDEN_NAME = { solara: "Solara", magmor: "Magmor" };
  function heldName(id) { return HELDEN_NAME[id] || id; }
  function gateName(n) {
    for (var i = 0; i < LEAGUE_GATES.length; i++) if (LEAGUE_GATES[i].n === n) return LEAGUE_GATES[i].name;
    return "";
  }
  /* unlockText(unlock) — die Zeile, die unter einem GESPERRTEN Eintrag
     steht. Immer deutsch, immer eine konkrete Bedingung, nie „bald
     verfügbar": Der Spieler muss ablesen können, was er tun soll. */
  function unlockText(u) {
    if (!u) return "";
    switch (u.typ) {
      case "start":     return "Von Anfang an dabei";
      case "arena":     return "Arena " + u.wert + " · " + arenaName(u.wert);
      case "trophaeen": return num(u.wert) + " Trophäen";
      case "liga":      return LEAGUE_NAME + " · " + gateName(u.wert);
      case "held":      return "Held " + heldName(u.wert) + " im Besitz";
      case "pass":      return "Season-Pass · Stufe " + u.wert;
      default:          return "";
    }
  }

  /* ================= Asset-Auflösung =================
   * Das Modul kennt die ASSETS-Tabelle nicht (sie lebt im UI) und will
   * sie auch nicht kennen — sonst wäre es nicht mehr DOM-frei
   * einsetzbar. Das UI meldet sie einmal an; ohne Anmeldung sind alle
   * URLs null und das UI zeichnet das Emoji. */
  var ASSET_SRC = null;
  function assets(mapOrFn) {
    ASSET_SRC = mapOrFn || null;
    return API;
  }
  function url(key) {
    if (!key || !ASSET_SRC) return null;
    try {
      var u = (typeof ASSET_SRC === "function") ? ASSET_SRC(key) : ASSET_SRC[key];
      return (typeof u === "string" && u) ? u : null;
    } catch (e) { return null; }
  }

  /* ================= Ansichten ================= */

  function viewAvatar(a, s) {
    var t = TIER_BY_KEY[a.tier];
    var frei = isUnlocked(a, s);
    return {
      key: a.key, name: a.name, tier: a.tier, tierName: t.name, tierColor: t.color,
      tierIndex: t.index, emoji: a.emoji,
      unlock: { typ: a.unlock.typ, wert: n0(a.unlock.wert) || a.unlock.wert },
      unlockText: unlockText(a.unlock),
      locked: !frei,
      gewaehlt: s.avatar.gewaehlt === a.key,
      portrait: a.portrait || null,
      portraitUrl: url(a.portrait),
      portraitWunsch: a.portrait ? null : (a.portraitWunsch || null),
      portraitFehlt: !a.portrait,
    };
  }
  function viewFrame(f, s) {
    var t = TIER_BY_KEY[f.tier];
    var frei = isUnlocked(f, s);
    return {
      key: f.key, name: f.name, tier: f.tier, tierName: t.name, tierColor: t.color,
      tierIndex: t.index, emoji: f.emoji,
      unlock: { typ: f.unlock.typ, wert: n0(f.unlock.wert) || f.unlock.wert },
      unlockText: unlockText(f.unlock),
      locked: !frei,
      gewaehlt: s.frame.gewaehlt === f.key,
      ring: f.ring, ringUrl: url(f.ring),
    };
  }

  /* list() — ALLE Porträts, freigeschaltete zuerst? NEIN: Katalog-
     Reihenfolge. Ein Raster, das umsortiert, sobald etwas freigeschaltet
     wird, lässt den Spieler seinen Avatar suchen. Die Reihenfolge ist
     die Progressionsreihenfolge und bleibt stabil. */
  function list() {
    var s = get();
    return AVATARS.map(function (a) { return viewAvatar(a, s); });
  }
  function listFrames() {
    var s = get();
    return FRAMES.map(function (f) { return viewFrame(f, s); });
  }

  /* unlockedFor(trophaeen | stand) → welche Schlüssel dieser Stand
     freischalten WÜRDE. Reine Abfrage, schreibt nichts — das UI nutzt
     sie für Vorschauen („was bringt Arena 6?"). */
  function unlockedFor(x) {
    var stand = normStand(x);
    var probe = { stand: stand, avatar: { gewaehrt: [] }, frame: { gewaehrt: [] } };
    var av = [], fr = [];
    AVATARS.forEach(function (a) { if (isUnlocked(a, probe)) av.push(a.key); });
    FRAMES.forEach(function (f) { if (isUnlocked(f, probe)) fr.push(f.key); });
    return { stand: stand, avatare: av, rahmen: fr };
  }

  /* syncUnlocks(stand) — der Aufruf nach jedem Match.
   * Schreibt den Höchststand fort und gibt ZURÜCK, was dadurch NEU
   * freigeschaltet wurde. Genau diese Liste spielt das UI als Zeremonie
   * ab; ein zweiter Aufruf mit demselben Stand liefert nichts mehr.
   *
   * Sortierung: aufsteigende Rarität, bei Gleichstand Katalog-
   * Reihenfolge. Wer in einem Sprung Grau UND Suprem freischaltet,
   * sieht das Beste zuletzt — dieselbe Eskalation wie in der
   * Pack-Zeremonie. */
  function syncUnlocks(x, now) {
    var s = get();
    var neuStand = maxStand(s.stand, normStand(x));
    s.stand = neuStand;
    var t = nowMs(now);
    var neu = [];
    AVATARS.forEach(function (a) {
      if (!isUnlocked(a, s)) return;
      if (s.avatar.bekannt.indexOf(a.key) >= 0) return;
      s.avatar.bekannt.push(a.key);
      var v = viewAvatar(a, s); v.art = "avatar"; neu.push(v);
    });
    FRAMES.forEach(function (f) {
      if (!isUnlocked(f, s)) return;
      if (s.frame.bekannt.indexOf(f.key) >= 0) return;
      s.frame.bekannt.push(f.key);
      var v = viewFrame(f, s); v.art = "frame"; neu.push(v);
    });
    if (neu.length) { s.avatar.ts = t; s.frame.ts = t; }
    save(s);
    neu.sort(function (a, b) {
      return (a.tierIndex - b.tierIndex) ||
             (AV_BY_KEY[a.key] ? AV_BY_KEY[a.key]._i : FR_BY_KEY[a.key]._i) -
             (AV_BY_KEY[b.key] ? AV_BY_KEY[b.key]._i : FR_BY_KEY[b.key]._i);
    });
    return {
      stand: { trophaeen: neuStand.trophaeen, arena: neuStand.arena, liga: neuStand.liga },
      neu: neu,
      avatare: neu.filter(function (e) { return e.art === "avatar"; }),
      rahmen: neu.filter(function (e) { return e.art === "frame"; }),
    };
  }

  /* select(key) — Porträt wählen. Der RAHMEN wird nicht angefasst;
     das ist die halbe Begründung für die getrennten Zustandszweige. */
  function select(key) {
    var s = get(), a = AV_BY_KEY[key];
    if (!a) return { ok: false, grund: "unbekannt", meldung: "Diesen Avatar gibt es nicht." };
    if (!isUnlocked(a, s)) {
      return { ok: false, grund: "gesperrt",
               meldung: "Noch gesperrt: " + unlockText(a.unlock) + "." };
    }
    s.avatar.gewaehlt = key;
    save(s);
    return { ok: true, key: key, aktiv: active() };
  }
  /* selectFrame(key) — Rahmen wählen. Das PORTRÄT wird nicht angefasst. */
  function selectFrame(key) {
    var s = get(), f = FR_BY_KEY[key];
    if (!f) return { ok: false, grund: "unbekannt", meldung: "Diesen Rahmen gibt es nicht." };
    if (!isUnlocked(f, s)) {
      return { ok: false, grund: "gesperrt",
               meldung: "Noch gesperrt: " + unlockText(f.unlock) + "." };
    }
    s.frame.gewaehlt = key;
    save(s);
    return { ok: true, key: key, aktiv: active() };
  }

  /* grant(art, key) — Eintrag von außen buchen: Season-Pass, Shop,
     Event, Wiedergutmachung. Der EINZIGE Weg an einen "pass"-Eintrag.
     Die Zeremonie läuft danach über syncUnlocks() wie bei allem
     anderen — deshalb wird hier NICHT `bekannt` gesetzt. */
  function grant(art, key) {
    var s = get();
    var byKey = art === "frame" ? FR_BY_KEY : AV_BY_KEY;
    var branch = art === "frame" ? s.frame : s.avatar;
    if (art !== "frame" && art !== "avatar") {
      return { ok: false, grund: "unbekannt", meldung: "Unbekannte Sorte: " + art + "." };
    }
    if (!byKey[key]) {
      return { ok: false, grund: "unbekannt", meldung: "Diesen Eintrag gibt es nicht." };
    }
    if (branch.gewaehrt.indexOf(key) >= 0) return { ok: true, key: key, neu: false };
    branch.gewaehrt.push(key);
    save(s);
    return { ok: true, key: key, neu: true };
  }

  /* active() — was das Profil ANZEIGT. Ladebildschirm, In-Game-HUD,
     Profilzeile und Rangliste lesen alle genau das hier. */
  function active() {
    var s = get();
    var a = AV_BY_KEY[s.avatar.gewaehlt] || AV_BY_KEY[AV_START];
    var f = FR_BY_KEY[s.frame.gewaehlt] || FR_BY_KEY[FR_START];
    return {
      avatar: viewAvatar(a, s),
      frame: viewFrame(f, s),
      // Bequemlichkeit für die Anzeige — dieselben Werte flach.
      portraitUrl: url(a.portrait),
      emoji: a.emoji,
      ringUrl: url(f.ring),
      ringEmoji: f.emoji,
      tierColor: TIER_BY_KEY[a.tier].color,
    };
  }

  /* apply(stand) — der EINE Aufruf für den Hub-Eintritt: Höchststand
     fortschreiben, neue Freischaltungen zurückgeben, fertiges
     Anzeigepaket mitliefern. Sonst müsste jeder Aufrufer syncUnlocks()
     und active() selbst hintereinanderhängen und könnte die
     Reihenfolge vertauschen. */
  function apply(x, now) {
    var r = syncUnlocks(x, now);
    r.aktiv = active();
    return r;
  }

  /* missingPortraits() — Bestellliste für die Bildgenerierung.
     Sobald ein Asset existiert, wird `portrait` im Katalog gesetzt und
     der Eintrag verschwindet hier von selbst. */
  function missingPortraits() {
    return AVATARS.filter(function (a) { return !a.portrait; })
      .map(function (a) {
        return { key: a.key, name: a.name, tier: a.tier,
                 assetKey: a.portraitWunsch, emoji: a.emoji };
      });
  }

  function reset() { lsDel(LEGACY_KEY); save(fresh()); return get(); }

  /* ================= Export ================= */
  var API = {
    TIERS: TIERS, AVATARS: AVATARS, FRAMES: FRAMES,
    ARENAS: ARENAS, LEAGUE_GATES: LEAGUE_GATES, LEAGUE_NAME: LEAGUE_NAME,
    STATE_VERSION: STATE_VERSION,
    get: get, list: list, listFrames: listFrames,
    unlockedFor: unlockedFor, syncUnlocks: syncUnlocks, apply: apply,
    select: select, selectFrame: selectFrame, grant: grant, active: active,
    assets: assets, unlockText: unlockText, arenaFor: arenaFor, ligaFor: ligaFor,
    missingPortraits: missingPortraits, reset: reset,
    _key: KEY, _legacyKey: LEGACY_KEY,
    _write: function (raw) { lsSet(KEY, typeof raw === "string" ? raw : JSON.stringify(raw)); },
    _writeLegacy: function (v) { lsSet(LEGACY_KEY, v); },
    _clock: function (fn) { CLOCK = fn || null; },
  };

  if (typeof window !== "undefined") window.ArenaAvatars = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_avatars.js) ============ */
  if (typeof module !== "undefined" && require.main === module) {
    var fail = 0;
    function check(label, cond, info) {
      if (cond) { console.log("  ok   " + label + (info !== undefined ? "  — " + info : "")); }
      else { fail++; console.log("  FAIL " + label + (info !== undefined ? "  — " + info : "")); }
    }

    console.log("\nARENA AVATARS — Selbsttest\n");

    /* ---------------- 1. Katalog ---------------- */
    console.log("Katalog:");
    check("12 Porträts", AVATARS.length === 12, AVATARS.length);
    check("8 Rahmen (Vorgabe: mindestens 6)", FRAMES.length === 8, FRAMES.length);
    check("alle Porträt-Schlüssel eindeutig",
      Object.keys(AV_BY_KEY).length === AVATARS.length);
    check("alle Rahmen-Schlüssel eindeutig",
      Object.keys(FR_BY_KEY).length === FRAMES.length);
    check("jeder Eintrag hat Name, Rarität, Unlock und Emoji",
      AVATARS.concat(FRAMES).every(function (e) {
        return e.name && TIER_BY_KEY[e.tier] && e.unlock && e.unlock.typ && e.emoji;
      }));
    check("alle sechs Raritäten kommen bei den Porträts vor",
      TIERS.every(function (t) {
        return AVATARS.some(function (a) { return a.tier === t.key; });
      }));
    /* UMGESCHRIEBEN: waren 1 und 1. Der Auftraggeber wollte eine WAHL
       zum Start — eine Auswahl mit einem Eintrag ist keine. Fünf
       Porträts stehen jetzt offen, der Start-Rahmen bleibt bei einem
       (der Rahmen ist die Staffelung, das Porträt die Wahl). */
    check("fünf Start-Porträts und EIN Start-Rahmen",
      AVATARS.filter(function (a) { return a.unlock.typ === "start"; }).length === 5 &&
      FRAMES.filter(function (f) { return f.unlock.typ === "start"; }).length === 1,
      AVATARS.filter(function (a) { return a.unlock.typ === "start"; })
        .map(function (a) { return a.key; }).join(","));
    check("jeder Rahmen hat ein vorhandenes frame_*-Asset",
      FRAMES.every(function (f) { return /^frame_(common|good|rare|epic|legendary|supreme)$/.test(f.ring); }));
    /* UMGESCHRIEBEN: Solara hing an Arena 5. Helden-Avatare haengen
       jetzt am BESITZ der Heldenkarte — „wenn man den Held besitzt".
       Und jeder Held braucht auch wirklich einen: die zweite Zeile
       prueft, dass Katalog und Heldenliste zusammenpassen, damit ein
       dritter Held nicht stillschweigend ohne Avatar bleibt. */
    check("Helden-Avatare haengen am Besitz der Heldenkarte",
      AV_BY_KEY.solara.unlock.typ === "held" && AV_BY_KEY.solara.unlock.wert === "solara" &&
      AV_BY_KEY.magmor.unlock.typ === "held" && AV_BY_KEY.magmor.unlock.wert === "magmor");
    check("jeder Held aus HELDEN_NAME hat genau einen Avatar",
      Object.keys(HELDEN_NAME).every(function (id) {
        return AVATARS.filter(function (a) {
          return a.unlock.typ === "held" && a.unlock.wert === id; }).length === 1;
      }), Object.keys(HELDEN_NAME).join(","));

    /* Porträt-Bestand: 2 vorhanden, 10 offen. */
    var haben = AVATARS.filter(function (a) { return !!a.portrait; });
    /* UMGESCHRIEBEN: waren 2 vorhanden / 10 offen, und die zwei waren
       KARTENbilder. Ein Kartenbild ist 896x1200 und zeigt die Figur in
       voller Gestalt — im Kreis von 32 px bliebe ein Ausschnitt der
       Huefte. Die sieben neuen sind eigene Brustbilder. */
    check("sieben Porträts sind vorhanden (5 zur Wahl + 2 Helden)",
      haben.length === 7 &&
      haben.every(function (a) { return /^av_/.test(a.portrait); }),
      haben.map(function (a) { return a.portrait; }).join(","));
    check("kein Porträt benutzt ein KARTENbild",
      AVATARS.every(function (a) { return !/^card_/.test(a.portrait || ""); }));
    var offen = missingPortraits();
    check("fünf Porträts fehlen noch (die Staffelung oberhalb der Wahl)",
      offen.length === 5, offen.length);
    check("jedes fehlende Porträt hat einen av_*-Wunschschlüssel",
      offen.every(function (o) { return /^av_[a-z]+$/.test(o.assetKey); }),
      offen.map(function (o) { return o.assetKey; }).join(" "));

    /* ---------------- 2. Frischer Zustand ---------------- */
    console.log("\nFrischer Zustand:");
    reset();
    var s0 = get();
    check("Version 1 im Zustand", s0.v === 1, s0.v);
    check("Start-Porträt und Start-Rahmen sind gewählt",
      s0.avatar.gewaehlt === "novize" && s0.frame.gewaehlt === "schlicht",
      s0.avatar.gewaehlt + " / " + s0.frame.gewaehlt);
    check("Höchststand steht auf 0 Trophäen / Arena 1",
      s0.stand.trophaeen === 0 && s0.stand.arena === 1 && s0.stand.liga === 0);
    var l0 = list();
    /* UMGESCHRIEBEN: war 1. Genau das ist der Punkt der Änderung — der
       Spieler soll ohne Vorleistung unter fünf waehlen koennen. */
    check("bei Stand 0 stehen FÜNF Porträts zur Wahl",
      l0.filter(function (a) { return !a.locked; }).length === 5,
      l0.filter(function (a) { return !a.locked; }).map(function (a) { return a.key; }).join(","));
    check("bei Stand 0 ist genau EIN Rahmen frei",
      listFrames().filter(function (f) { return !f.locked; }).length === 1);
    check("gesperrte Einträge tragen einen deutschen Bedingungstext",
      l0.filter(function (a) { return a.locked; }).every(function (a) { return a.unlockText.length > 3; }));

    /* ---------------- 3. Schwellen ---------------- */
    console.log("\nSchwellen (spiegeln ARENA_TIERS im Prototyp):");
    check("0 🏆 → Arena 1", arenaFor(0) === 1);
    check("299 🏆 → noch Arena 1, 300 → Arena 2",
      arenaFor(299) === 1 && arenaFor(300) === 2);
    check("1 200 🏆 → Arena 5 (Obsidian-Thron)", arenaFor(1200) === 5, arenaFor(1200));
    check("2 500 🏆 → Arena 8", arenaFor(2500) === 8);
    check("2 900 🏆 → Liga-Tor 1, darunter 0",
      ligaFor(2899) === 0 && ligaFor(2900) === 1);

    var u5 = unlockedFor(1200);
    check("unlockedFor(1200) enthält die fünf zur Wahl",
      ["novize","scherbe","smaragd","saphir","sturm"]
        .every(function (k) { return u5.avatare.indexOf(k) >= 0; }), u5.avatare.join(","));
    check("unlockedFor(1200) enthält Prisma-Erzmagier NOCH NICHT",
      u5.avatare.indexOf("prisma") < 0);
    /* Trophäen allein oeffnen KEINEN Helden-Avatar — sonst waere die
       Kopplung an den Besitz nur behauptet. */
    check("ohne Heldenbesitz kein Helden-Avatar, egal wie viele Trophäen",
      unlockedFor(99999).avatare.indexOf("solara") < 0 &&
      unlockedFor(99999).avatare.indexOf("magmor") < 0);
    check("mit Heldenbesitz ist der Helden-Avatar frei",
      unlockedFor({ helden: ["solara"] }).avatare.indexOf("solara") >= 0 &&
      unlockedFor({ helden: ["solara"] }).avatare.indexOf("magmor") < 0);
    check("unlockedFor akzeptiert auch ein Objekt mit Arena-Nummer",
      unlockedFor({ arena: 6 }).avatare.indexOf("prisma") >= 0);
    check("unlockedFor akzeptiert ArenaProfile-Felder (trophies/best)",
      unlockedFor({ trophies: 100, best: 1500 }).avatare.indexOf("prisma") >= 0);
    check("unlockedFor schreibt NICHTS (Zustand unverändert)",
      get().stand.trophaeen === 0);
    check("Pass-Einträge tauchen in unlockedFor NIE auf",
      unlockedFor(99999).avatare.indexOf("fortuna") < 0 &&
      unlockedFor(99999).rahmen.indexOf("fortunakranz") < 0);

    /* ---------------- 4. Zeremonie ---------------- */
    console.log("\nZeremonie (syncUnlocks):");
    reset();
    var r0 = syncUnlocks(0);
    check("erster Aufruf bei Stand 0 feiert NICHTS (alle fünf sind bekannt)",
      r0.neu.length === 0, r0.neu.length);
    var r1 = syncUnlocks({ arena: 6, trophaeen: 1500, helden: ["solara"] });
    check("Sprung auf Arena 6 schaltet neue Einträge frei", r1.neu.length > 0, r1.neu.length);
    /* Der neu erworbene Held wird MITGEFEIERT — er ist genauso ein
       Freischalten wie eine erreichte Arena. */
    check("Solara ist dabei und als Porträt markiert",
      r1.avatare.some(function (e) { return e.key === "solara" && e.art === "avatar"; }),
      r1.avatare.map(function (e) { return e.key; }).join(","));
    check("Rahmen kommen getrennt zurück",
      r1.rahmen.length > 0 && r1.rahmen.every(function (e) { return e.art === "frame"; }),
      r1.rahmen.map(function (e) { return e.key; }).join(","));
    check("neue Einträge nach Rarität AUFSTEIGEND (Bestes zuletzt)",
      r1.neu.every(function (e, i) { return i === 0 || r1.neu[i - 1].tierIndex <= e.tierIndex; }),
      r1.neu.map(function (e) { return e.tier; }).join(" → "));
    check("Zeremonie-Eintrag trägt alles, was das Overlay braucht",
      r1.neu.every(function (e) {
        return e.name && e.tierName && e.tierColor && (e.emoji || e.portraitUrl) && !e.locked;
      }));
    var r2 = syncUnlocks({ arena: 6, trophaeen: 1500, helden: ["solara"] });
    check("zweiter Aufruf mit demselben Stand feiert NICHTS mehr",
      r2.neu.length === 0, r2.neu.length);
    check("Höchststand ist fortgeschrieben",
      get().stand.arena === 6 && get().stand.trophaeen === 1500);
    /* Ein Aufruf OHNE die Heldenliste darf den Helden-Avatar nicht
       wieder entziehen — maxStand() vereinigt, es ersetzt nicht. */
    var rH = syncUnlocks({ arena: 6, trophaeen: 1500 });
    check("Held ohne Nennung bleibt freigeschaltet",
      rH.neu.length === 0 && get().stand.helden.indexOf("solara") >= 0,
      get().stand.helden.join(","));
    var r3 = syncUnlocks(0);
    check("RÜCKSCHRITT sperrt nichts wieder (Höchststand gewinnt)",
      r3.neu.length === 0 && get().stand.arena === 6 &&
      list().filter(function (a) { return !a.locked; }).length ===
      unlockedFor({ arena: 6, trophaeen: 1500, helden: ["solara"] }).avatare.length,
      get().stand.arena + " / " +
      list().filter(function (a) { return !a.locked; }).length + " frei");

    /* ---------------- 5. Auswahl, getrennt ---------------- */
    console.log("\nAuswahl (Porträt und Rahmen unabhängig):");
    var sel = select("solara");
    check("freigeschaltetes Helden-Porträt lässt sich wählen", sel.ok === true, sel.meldung);
    check("Auswahl übersteht das Neuladen", get().avatar.gewaehlt === "solara");
    check("die Rahmen-Auswahl blieb dabei UNBERÜHRT",
      get().frame.gewaehlt === "schlicht", get().frame.gewaehlt);
    var selF = selectFrame("saphirkranz");
    check("freigeschalteter Rahmen lässt sich wählen", selF.ok === true);
    check("die Porträt-Auswahl blieb dabei UNBERÜHRT",
      get().avatar.gewaehlt === "solara", get().avatar.gewaehlt);
    check("beide Zweige tragen ihr eigenes `gewaehlt`",
      get().avatar.gewaehlt === "solara" && get().frame.gewaehlt === "saphirkranz");
    /* Freie Kombinierbarkeit ausdrücklich nachgerechnet: JEDES freie
       Porträt lässt sich mit JEDEM freien Rahmen paaren. */
    var freieA = list().filter(function (a) { return !a.locked; }).map(function (a) { return a.key; });
    var freieF = listFrames().filter(function (f) { return !f.locked; }).map(function (f) { return f.key; });
    var kombis = 0, kombiFehler = "";
    freieA.forEach(function (ak) {
      freieF.forEach(function (fk) {
        if (select(ak).ok && selectFrame(fk).ok &&
            get().avatar.gewaehlt === ak && get().frame.gewaehlt === fk) kombis++;
        else kombiFehler = ak + "+" + fk;
      });
    });
    check("jede Kombination aus freiem Porträt und freiem Rahmen ist möglich",
      kombis === freieA.length * freieF.length && !kombiFehler,
      kombis + " von " + (freieA.length * freieF.length) + (kombiFehler ? " Fehler bei " + kombiFehler : ""));
    var bad = select("frost");
    check("gesperrtes Porträt wird abgelehnt", bad.ok === false && bad.grund === "gesperrt");
    check("Ablehnung nennt die Bedingung auf Deutsch",
      /Arena 8/.test(bad.meldung), bad.meldung);
    check("unbekannter Schlüssel wird abgelehnt, wirft aber nicht",
      select("gibtsnicht").ok === false && selectFrame("gibtsnicht").ok === false);
    check("die Auswahl blieb nach beiden Fehlversuchen stehen",
      get().avatar.gewaehlt === freieA[freieA.length - 1]);

    /* ---------------- 6. Anzeige ---------------- */
    console.log("\nAnzeige (active):");
    select("solara"); selectFrame("saphirkranz");
    var act = active();
    check("active() liefert Porträt UND Rahmen getrennt",
      act.avatar.key === "solara" && act.frame.key === "saphirkranz");
    check("ohne Asset-Tabelle sind alle URLs null",
      act.portraitUrl === null && act.ringUrl === null);
    check("das Emoji ist trotzdem da (Fallback für fehlende Bilder)",
      act.emoji === "☀" && !!act.ringEmoji);
    /* Der Schlüssel heisst jetzt av_held_solara, nicht mehr card_solara:
       der Avatar ist ein eigenes Brustbild, kein Kartenausschnitt. */
    assets({ av_held_solara: "https://cdn/solara.png", frame_rare: "https://cdn/rare.png" });
    var act2 = active();
    check("mit Asset-Tabelle liefert active() fertige URLs",
      act2.portraitUrl === "https://cdn/solara.png" && act2.ringUrl === "https://cdn/rare.png");
    check("Raritätsfarbe kommt mit (epische Solara = Lila)",
      act2.tierColor === "#a45ef2", act2.tierColor);
    /* novize HAT jetzt ein Porträt — für diesen Fall braucht es einen
       Eintrag, dessen Bild noch aussteht. `prisma` ist einer davon. */
    grant("prisma"); select("prisma");
    var act3 = active();
    check("Porträt ohne Asset: URL null, portraitFehlt gesetzt, Emoji da",
      act3.portraitUrl === null && act3.avatar.portraitFehlt === true && act3.emoji === "✦",
      act3.portraitUrl + " / " + act3.avatar.portraitFehlt + " / " + act3.emoji);
    check("der Rahmen behält seine URL, obwohl das Porträt fehlt",
      act3.ringUrl === "https://cdn/rare.png");
    assets(null);

    /* ---------------- 7. Texte ---------------- */
    console.log("\nTexte:");
    check("start-Text", unlockText({ typ: "start" }) === "Von Anfang an dabei");
    check("arena-Text nennt Nummer UND Namen",
      unlockText({ typ: "arena", wert: 5 }) === "Arena 5 · Obsidian-Thron",
      unlockText({ typ: "arena", wert: 5 }));
    check("trophaeen-Text mit Tausendertrennung",
      unlockText({ typ: "trophaeen", wert: 1350 }) === "1 350 Trophäen",
      unlockText({ typ: "trophaeen", wert: 1350 }));
    check("liga-Text nennt Liga und Tor",
      unlockText({ typ: "liga", wert: 1 }) === "Prisma-Liga · Eingangstor",
      unlockText({ typ: "liga", wert: 1 }));
    check("pass-Text nennt die Pass-Stufe",
      unlockText({ typ: "pass", wert: 30 }) === "Season-Pass · Stufe 30",
      unlockText({ typ: "pass", wert: 30 }));
    check("unbekannter Typ liefert leeren Text statt zu werfen",
      unlockText({ typ: "quatsch" }) === "" && unlockText(null) === "");

    /* ---------------- 8. grant ---------------- */
    console.log("\nBuchung von außen (grant):");
    reset();
    check("Pass-Porträt ist ohne Buchung gesperrt — auch bei 99 999 🏆",
      (function () { syncUnlocks(99999); return list().filter(function (a) {
        return a.key === "fortuna"; })[0].locked === true; })());
    check("select() auf den Pass-Eintrag scheitert vorher",
      select("fortuna").ok === false);
    check("grant bucht das Porträt", grant("avatar", "fortuna").ok === true);
    check("danach ist es frei und wählbar",
      list().filter(function (a) { return a.key === "fortuna"; })[0].locked === false &&
      select("fortuna").ok === true);
    check("die Zeremonie läuft NACH der Buchung genau einmal",
      (function () {
        var a = syncUnlocks(99999), b = syncUnlocks(99999);
        return a.neu.some(function (e) { return e.key === "fortuna"; }) && b.neu.length === 0;
      })());
    check("doppeltes grant ist harmlos (neu:false)",
      grant("avatar", "fortuna").neu === false);
    check("grant für Rahmen läuft über denselben Weg",
      grant("frame", "fortunakranz").ok === true && selectFrame("fortunakranz").ok === true);
    check("grant mit unbekannter Sorte oder unbekanntem Schlüssel scheitert",
      grant("hut", "fortuna").ok === false && grant("avatar", "nixgibts").ok === false);
    check("Buchung landet im richtigen Zweig (kein Übersprung)",
      get().avatar.gewaehrt.indexOf("fortuna") >= 0 &&
      get().frame.gewaehrt.indexOf("fortuna") < 0);

    /* ---------------- 9. apply ---------------- */
    console.log("\napply (ein Aufruf für den Hub-Eintritt):");
    reset();
    var ap = apply({ trophaeen: 1200 });
    check("apply liefert neue Freischaltungen UND das Anzeigepaket",
      Array.isArray(ap.neu) && ap.neu.length > 0 && !!ap.aktiv && !!ap.aktiv.avatar);
    check("apply schreibt denselben Höchststand wie syncUnlocks",
      ap.stand.arena === 5 && get().stand.trophaeen === 1200);
    check("zweiter apply-Aufruf: aktiv da, neu leer",
      (function () { var b = apply({ trophaeen: 1200 });
        return b.neu.length === 0 && !!b.aktiv.avatar; })());

    /* ---------------- 10. Migration ---------------- */
    console.log("\nMigration:");
    reset();
    API._writeLegacy("solara");
    lsDel(KEY);
    var mig = get();
    check("v0-Altschlüssel (nur ein Avatar-Name) wird übernommen",
      mig.avatar.gewaehlt === "solara" && mig.v === 1, mig.avatar.gewaehlt);
    check("der übernommene Avatar gilt als gebucht (Herkunft unbekannt)",
      mig.avatar.gewaehrt.indexOf("solara") >= 0 &&
      list().filter(function (a) { return a.key === "solara"; })[0].locked === false);
    reset();
    API._write({ gewaehlt: "magmor" });                 // v0-Objekt, kein `v`
    var mig2 = get();
    check("v0-Objekt ohne Versionsfeld wird angehoben",
      mig2.v === 1 && mig2.avatar.gewaehlt === "magmor" &&
      mig2.frame.gewaehlt === "schlicht", mig2.avatar.gewaehlt);
    reset();
    API._write({ v: 99, avatar: { gewaehlt: "frost" } }); // Zukunftsversion
    check("unbekannt hohe Version → frischer Zustand statt Fremdfelder",
      get().avatar.gewaehlt === "novize" && get().v === 1);

    /* ---------------- 11. Robustheit ---------------- */
    console.log("\nRobustheit:");
    API._write("{kaputt,,,");
    check("Müll im Speicher → frischer Zustand",
      get().v === 1 && get().avatar.gewaehlt === "novize");
    API._write({
      v: 1,
      avatar: { gewaehlt: "solara", bekannt: ["novize", "solara", "nixgibts", "solara"],
                gewaehrt: ["solara", "quatsch"], ts: Date.now() },
      frame: { gewaehlt: "kaputt", bekannt: ["schlicht", "boese"], gewaehrt: [] },
      stand: { trophaeen: 1200, arena: 1, liga: -5 },
    });
    var h = get();
    check("fremde Schlüssel fallen aus `bekannt` und `gewaehrt`",
      h.avatar.bekannt.indexOf("nixgibts") < 0 && h.avatar.gewaehrt.indexOf("quatsch") < 0,
      h.avatar.bekannt.join(","));
    check("`bekannt` enthält keine Doppelten",
      h.avatar.bekannt.length === h.avatar.bekannt.filter(function (k, i, a) {
        return a.indexOf(k) === i; }).length);
    check("ungültiges `gewaehlt` fällt auf den Start-Eintrag zurück",
      h.frame.gewaehlt === "schlicht", h.frame.gewaehlt);
    check("widersprüchlicher Stand wird geheilt (Arena 1 bei 1 200 🏆 → 5)",
      h.stand.arena === 5 && h.stand.liga === 0, h.stand.arena + "/" + h.stand.liga);
    API._write({ v: 1, avatar: { gewaehlt: "frost" }, frame: {}, stand: {} });
    check("gesperrtes `gewaehlt` (importierter Spielstand) fällt zurück",
      get().avatar.gewaehlt === "novize", get().avatar.gewaehlt);
    /* 32-Bit-Falle: ein Millisekunden-Zeitstempel darf NICHT durch
       `| 0` laufen. ts0() muss ihn unverändert durchlassen. */
    var big = 1893456000000;
    check("Zeitstempel über 2³¹ bleibt positiv (kein 32-Bit-Overflow)",
      ts0(big) === big && (big | 0) !== big, ts0(big) + " vs " + (big | 0));
    reset();
    var r = syncUnlocks({ trophaeen: 1200 }, big);
    check("syncUnlocks schreibt den großen Zeitstempel unverfälscht",
      r.neu.length > 0 && get().avatar.ts === big, get().avatar.ts);
    check("reset() nullt alles zurück",
      (function () { var z = reset();
        return z.avatar.gewaehlt === "novize" && z.frame.gewaehlt === "schlicht" &&
               z.stand.trophaeen === 0 && z.avatar.gewaehrt.length === 0; })());
    check("list()/listFrames() werfen nie — auch nicht bei leerem Speicher",
      (function () { lsDel(KEY); lsDel(LEGACY_KEY);
        try { return list().length === 12 && listFrames().length === 8; }
        catch (e) { return false; } })());

    var NEED = ["get", "list", "listFrames", "unlockedFor", "syncUnlocks", "apply",
                "select", "selectFrame", "grant", "active", "assets", "unlockText",
                "arenaFor", "ligaFor", "missingPortraits", "reset"];
    check("API vollständig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");

    reset();
    console.log("\nFehlende Porträts (" + missingPortraits().length + "): " +
      missingPortraits().map(function (o) { return o.assetKey; }).join(" "));
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
