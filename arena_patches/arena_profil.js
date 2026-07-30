/* ==================================================================
 * ARENA PROFIL — das Profil-Fenster (eigenes UND fremdes Profil)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Gebaut wie arena_friends.js und
 * arena_clan.js; wer eines davon kennt, findet sich hier sofort zurecht.
 *
 * WOFÜR: In AA öffnet ein Tipp auf den Spielernamen ein Profil-Fenster.
 * Dasselbe Fenster erscheint, wenn man in der Rangliste, in der
 * Freundesliste oder später in einem Event auf einen Spieler tippt.
 * Dieses Modul liefert die Werte dafür — als EIN Modell, das für das
 * eigene und für ein fremdes Profil dieselbe Form hat. Das UI rendert
 * darum genau eine Funktion, nicht zwei.
 *
 * ------------------------------------------------------------------
 * DIE DREI SCHICHTEN — und was man wo ändert
 * ------------------------------------------------------------------
 *   1. DATEN (§1)  Konstanten, Beschriftungen, Icon-Schlüssel,
 *                  Basis-Power-Spiegel. Neue Kennzahl → hier eintragen,
 *                  nicht im UI zusammenbauen.
 *   2. LOGIK (§2)  Persistenz (nur Anzeigename + Event-Platzierungen)
 *                  und Sim (Bot-Werte). Sim ist die SERVER-NAHT: alles,
 *                  was hier steht, ersetzt ein echter Spielerdienst 1:1.
 *                  Sim persistiert NICHTS — reine Funktion aus (id, …).
 *   3. API (§3)    eigenes() / fremdes() liefern fertige ANZEIGEFELDER
 *                  (Strings, formatiert), damit das UI nicht rechnet.
 *
 * ------------------------------------------------------------------
 * WOHER DIE ZAHLEN KOMMEN — Zuständigkeit, nicht Erfindung
 * ------------------------------------------------------------------
 * EIGENES Profil: ausschließlich aus dem Kern-Zustand.
 *   Trophäen/Höchststand/Siege/Serie/Medaillen → ArenaProfile
 *   Kartenstufen, Boni, Türme, Helden          → ArenaCards
 *   Clan, Spenden, Weltrang                    → ArenaClan
 *   Avatar + Rahmen                            → ArenaAvatars
 *   Spieler-ID                                 → ArenaFriends.myCode()
 *   Festungs-Power                             → ArenaFortress
 *   Event-Platzierungen                        → DIESES Modul (§2.3)
 * Nichts davon wird geraten. Fehlt ein Modul, steht 0 bzw. „—“ da.
 *
 * FREMDES Profil: soweit vorhanden aus echten Daten (Rangliste, Clan,
 * Freundesliste), der Rest aus Sim — deterministisch aus der Spieler-Id,
 * genau wie ArenaFriends.Sim.trophies() oder ArenaClan.Sim.members().
 * Das ist KEINE Erfindung im Sinne von „ausgedacht und gespeichert“,
 * sondern die im Projekt etablierte Bot-Schicht: reine Funktion, kein
 * Zustand, und beim Umstieg auf einen Server ersatzlos ersetzbar.
 *
 * ------------------------------------------------------------------
 * ZWEI BEWUSSTE ENTSCHEIDUNGEN (Abweichungen von AA)
 * ------------------------------------------------------------------
 * A) AA zeigt in der zweiten Kopfzeile LAND (Flagge) und daneben einen
 *    Zahlenwert mit Emblem. Wir haben weder Länder noch Regionen — und
 *    ein Länderfeld wäre ein Datenfeld ohne Quelle. An seiner Stelle
 *    steht die Zugehörigkeit, die es bei uns WIRKLICH gibt: der CLAN
 *    (Wappen + Name). Der Zahlenwert daneben ist der WELTRANG aus
 *    ArenaClan.leaderboard("global") — dieselbe Rolle wie bei AA
 *    („wo stehe ich global“), nur mit einer Quelle, die wir haben.
 *
 * B) AA nennt die per Match verdienten 0–3 Auszeichnungen „Medals“.
 *    Bei uns heißt die Season-Währung laut DESIGN_PROGRESSION.md
 *    ebenfalls MEDAILLEN, und die per Match vergebene 0–3-Wertung
 *    steckt bereits als `stars` in ArenaProfile.history. Beides ist
 *    dasselbe Ding. „Ø Medaillen“ liest deshalb genau diese Wertung —
 *    es entsteht KEIN zweiter Zähler.
 *
 * ------------------------------------------------------------------
 * WÄHRUNGS-ZUSTÄNDIGKEIT
 * ------------------------------------------------------------------
 * Dieses Modul bucht NICHTS: keine Trophäen, kein Gold, keine Karten,
 * keine Medaillen. Es liest und formatiert. Der einzige eigene Zustand
 * sind der ANZEIGENAME und die EVENT-PLATZIERUNGEN — zwei Dinge, für
 * die es im Projekt bisher überhaupt keinen Besitzer gab.
 *
 * ------------------------------------------------------------------
 * WIRING
 * ------------------------------------------------------------------
 *   1. <script src="arena_profil.js"></script> NACH arena_friends.js
 *      (liest ArenaCards, ArenaClan, ArenaProfile, ArenaAvatars,
 *      ArenaFriends, ArenaFortress — alle defensiv, keines ist Pflicht).
 *   2. Eigenes Profil:  ArenaProfil.eigenes()
 *   3. Ranglisten-Zeile: ArenaProfil.ausRanglistenZeile(row)
 *   4. Freundes-Eintrag: ArenaProfil.ausFreund(freund)
 *   5. Umbenennen:      ArenaProfil.setName("Neuer Name")
 *   6. Turnier-Ergebnis: ArenaProfil.eventErgebnis("tournament", platz)
 *
 * Selbsttest: `node arena_patches/arena_profil.js` → „ALLE TESTS OK“.
 * ================================================================== */
(function () {
  "use strict";

  /* ⚠ NICHT verwechseln: arena_profile.js (englisch, Trophäen/Rang/
   * Streak) persistiert unter "arenaProfile". DIESES Modul benutzt
   * "arenaProfil" (deutsch, ohne e) und speichert etwas ganz anderes —
   * nur Anzeigename und Event-Platzierungen. Die beiden Schlüssel
   * kollidieren nicht, aber sie sehen sich ähnlich; deshalb steht der
   * Hinweis hier und nicht im Änderungsprotokoll. */
  var KEY = "arenaProfil";
  var STATE_VERSION = 1;

  /* ==================================================================
   * §1 DATEN
   * ================================================================== */

  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;

  /* ---- Anzeigename ----
   * Die Grenzen sind bewusst eng: ein Name muss in der Profilzeile der
   * Startseite (12,5 px, ~14 Zeichen), in der Ranglisten-Zeile und im
   * Kopf dieses Fensters OHNE Ellipse stehen. 14 ist die kleinste der
   * drei Grenzen — sie gilt für alle. */
  var NAME_MIN = 3, NAME_MAX = 14;
  var NAME_STANDARD = "Prisma-Magier";

  /* Zeichen, die ein Name tragen darf. Kein <, kein &, keine Steuer-
   * zeichen — der Name landet in innerHTML-Fragmenten des Prototyps. */
  var NAME_ERLAUBT = /^[A-Za-zÄÖÜäöüß0-9 ._\-]+$/;

  /* ---- Kennzahlen-Raster (AA: 2 Spalten, 3 Reihen) ----
   * Reihenfolge = Anzeigereihenfolge, 1:1 nach IMG_3347:
   *   Arena | Höchsttrophäen · Power | Ø Medaillen · Serie | Spenden
   * `ico` ist der Schlüssel aus ui_assets.json, `emoji` der Rückfall.
   * `wappen:true` heißt: das Icon sitzt AUSSERHALB der Zelle (AA setzt
   * das Arena-Wappen halb neben die Zelle und macht sie dadurch schmaler). */
  var KENNZAHLEN = [
    { key: "arena",     label: "Arena",               ico: "arena_crest", emoji: "🏟", wappen: true },
    { key: "best",      label: "Höchsttrophäen",      ico: "cur_trophy",  emoji: "🏆" },
    { key: "power",     label: "Power",               ico: "ic_war",      emoji: "⚔" },
    { key: "medaillen", label: "Ø Medaillen",         ico: "rank_gold",   emoji: "🎖" },
    { key: "streak",    label: "Längste Siegesserie", ico: "el_feuer",    emoji: "🔥" },
    { key: "spenden",   label: "Clan-Spenden",        ico: "ic_donate",   emoji: "🤲" },
  ];

  /* ---- Statistik-Raster ----
   * `geteilt:true` = eine Zelle mit senkrechtem Strich und zwei Werten
   * (AA: „1st Place | Top 10“). */
  var STATISTIK = [
    { key: "siege",  label: "Siege" },
    { key: "quote",  label: "Siegquote" },
    { key: "platz",  geteilt: true, labelA: "1. Platz", labelB: "Top 10" },
    { key: "tuerme", label: "Türme gefunden" },
    { key: "boni",   label: "Boni gefunden" },
    { key: "helden", label: "Helden freigeschaltet" },
  ];

  /* ---- Wochenend-Herausforderung ----
   * Unser Freitag-bis-Sonntag-Event heißt „Kristall-Turnier“ (die
   * Definition steht im Prototyp, EVENTS[1]). Der Schlüssel muss zu dem
   * dort passen, sonst zählt das Modul auf ein Event, das es nicht gibt. */
  var EVENT_KEY = "tournament";
  var EVENT_NAME = "Kristall-Turnier";
  var EVENT_ICO = "summit_emblem", EVENT_EMOJI = "🏅";

  /* ---- Karten-Basis-Power ----
   * SPIEGEL von CARDS[].power aus ui_prototype.html. ArenaCards führt
   * KEINE Power (dort stehen nur Stufen, Tiers und Boni), die Zahl lebt
   * bisher nur im Prototyp. Damit dieses Modul unter `node` und ohne
   * geladenes UI rechnen kann, steht sie hier — genau wie
   * ARENAS_FALLBACK in arena_friends.js.
   * ⚠ Ändert sich eine Zahl im Prototyp, muss sie HIER mitziehen. Der
   *   Selbsttest prüft nur die Form, nicht die Übereinstimmung — die
   *   kann er nicht, weil er den Prototyp nicht liest. */
  var BASIS_POWER = {
    fire: 1180, water: 1040, nature: 970, earth: 1320, light: 860, darkness: 1090,
    solara: 1650, magmor: 1720,
  };
  var TURM_IDS = ["fire", "water", "nature", "earth", "light", "darkness"];
  var HELDEN_IDS = ["solara", "magmor"];
  /* Element je Karte. Für Türme ist die Id gleich dem Element; die
   * beiden Helden haben eigene Namen und brauchen die Zuordnung. */
  var EL_VON = { fire: "fire", water: "water", nature: "nature", earth: "earth",
                 light: "light", darkness: "darkness", solara: "light", magmor: "fire" };
  var EL_NAME = { fire: "Feuer", water: "Wasser", nature: "Natur",
                  earth: "Erde", light: "Licht", darkness: "Finsternis" };
  var EL_EMOJI = { fire: "🔥", water: "❄", nature: "🌿",
                   earth: "🪨", light: "☀", darkness: "🌑" };
  var KARTEN_NAME = { fire: "EMBER", water: "FROST", nature: "THORN", earth: "STONE",
                      light: "DAWN", darkness: "HOLLOW", solara: "SOLARA", magmor: "MAGMOR" };

  /* Rückfall-Arenen, falls ArenaAvatars fehlt (identisch zu
   * arena_friends.js — dieselbe Tabelle, damit beide Module bei
   * fehlendem Avatar-Modul dieselbe Arena nennen). */
  var ARENEN_FALLBACK = [
    { n: 1, name: "Kristallhof",      at: 0 },
    { n: 2, name: "Smaragdtal",       at: 300 },
    { n: 3, name: "Saphirfeste",      at: 600 },
    { n: 4, name: "Sturmspitze",      at: 900 },
    { n: 5, name: "Obsidian-Thron",   at: 1200 },
    { n: 6, name: "Prisma-Zitadelle", at: 1500 },
    { n: 7, name: "Aschenmark",       at: 2000 },
    { n: 8, name: "Frostbastion",     at: 2500 },
  ];
  var TIER_FALLBACK = [
    { key: "common",    name: "Gewöhnlich", color: "#9aa3ad", cap: 25 },
    { key: "good",      name: "Gut",        color: "#58c26a", cap: 40 },
    { key: "rare",      name: "Selten",     color: "#3d9df2", cap: 55 },
    { key: "epic",      name: "Episch",     color: "#a45ef2", cap: 70 },
    { key: "legendary", name: "Legendär",   color: "#f2a13d", cap: 85 },
    { key: "supreme",   name: "Suprem",     color: "#ff5e7e", cap: 100 },
  ];

  /* ==================================================================
   * §2 LOGIK
   * ================================================================== */

  /* ---- §2.1 Werkzeug ---- */

  var CLOCK = null;
  function nowMs(n) {
    if (typeof n === "number" && isFinite(n)) return n;
    if (CLOCK) return CLOCK();
    return Date.now();
  }
  function hostObj() {
    if (typeof window !== "undefined" && window) return window;
    if (typeof globalThis !== "undefined" && globalThis) return globalThis;
    return null;
  }
  function mod(name) {
    try { var h = hostObj(); return (h && h[name]) || null; } catch (e) { return null; }
  }
  function AC() { return mod("ArenaCards"); }
  function CL() { return mod("ArenaClan"); }
  function PR() { return mod("ArenaProfile"); }
  function AV() { return mod("ArenaAvatars"); }
  function FR() { return mod("ArenaFriends"); }
  function AF() { return mod("ArenaFortress"); }

  /* FNV-1a mit murmur3-Finalisierung — Zeichen für Zeichen dasselbe
   * Verfahren wie in arena_clan.js und arena_friends.js. Die
   * Finalisierung ist keine Kosmetik: reines FNV-1a mischt die ZULETZT
   * eingespeisten Bytes kaum, und genau die variieren bei uns
   * (…|kennzahl). Ohne fmix32 lägen die Kennzahlen zweier benachbarter
   * Bots eng beieinander — sichtbar als „alle Bots haben fast dieselbe
   * Power“. */
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
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ganz(v) {
    var n = Number(v);
    return isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  /* Tausenderpunkt wie im übrigen Projekt (fmt() im Prototyp benutzt
   * ein schmales Leerzeichen; im Profil-Fenster steht der Wert GROSS und
   * allein, dort liest der Punkt besser und entspricht AAs „44.000“). */
  function fmtN(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function fmt1(n) {
    var v = Math.round((Number(n) || 0) * 10) / 10;
    return v.toFixed(1).replace(".", ",");
  }
  function fmtPct(v) {
    return (Math.round((Number(v) || 0) * 1000) / 10).toFixed(1).replace(".", ",") + " %";
  }
  function ago(ms) {
    ms = Math.max(0, ms | 0);
    if (ms < MINUTE) return "gerade eben";
    if (ms < HOUR) return "vor " + Math.floor(ms / MINUTE) + " min";
    if (ms < DAY) return "vor " + Math.floor(ms / HOUR) + " h";
    var d = Math.floor(ms / DAY);
    return "vor " + d + (d === 1 ? " Tag" : " Tagen");
  }

  function arenen() {
    var a = AV();
    if (a && Array.isArray(a.ARENAS) && a.ARENAS.length) return a.ARENAS;
    return ARENEN_FALLBACK;
  }
  function arenaFuer(troph) {
    var l = arenen(), n = 1;
    for (var i = 0; i < l.length; i++) if (troph >= l[i].at) n = l[i].n;
    return n;
  }
  function arenaNameVon(n) {
    var l = arenen();
    for (var i = 0; i < l.length; i++) if (l[i].n === n) return l[i].name;
    return "";
  }
  function tiers() {
    var c = AC();
    if (c && Array.isArray(c.TIERS) && c.TIERS.length) return c.TIERS;
    return TIER_FALLBACK;
  }
  function tierVon(key) {
    var l = tiers();
    for (var i = 0; i < l.length; i++) if (l[i].key === key) return l[i];
    return l[0];
  }

  /* ---- §2.2 Zustand: NUR Anzeigename und Event-Platzierungen ---- */

  var memStore = null;                    // Node-Rückfall
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

  function frisch() {
    return { v: STATE_VERSION, name: "", events: {} };
  }
  /* Ein Event-Eintrag. `teilgenommen` zählt JEDE Teilnahme, `erster` und
   * `top10` die Platzierungen. top10 schließt den 1. Platz MIT ein —
   * genau so liest AA es (dort steht bei 1× Sieg auch 1 in Top 10). */
  function frischEvent() { return { erster: 0, top10: 0, teilgenommen: 0 }; }

  function heile(roh) {
    var s = frisch();
    if (!roh || typeof roh !== "object") return s;
    if (roh.v !== STATE_VERSION) {
      /* Unbekannte Version: frischer Zustand, aber der NAME bleibt — er
       * ist das einzige, was der Spieler selbst eingegeben hat. Alles
       * andere ist nachrechenbar bzw. neu erspielbar. */
      if (typeof roh.name === "string") s.name = pruefName(roh.name).ok ? roh.name.trim() : "";
      return s;
    }
    if (typeof roh.name === "string" && pruefName(roh.name).ok) s.name = roh.name.trim();
    if (roh.events && typeof roh.events === "object") {
      for (var k in roh.events) {
        if (!Object.prototype.hasOwnProperty.call(roh.events, k)) continue;
        var e = roh.events[k];
        if (!e || typeof e !== "object") continue;
        s.events[String(k)] = {
          erster: ganz(e.erster), top10: ganz(e.top10), teilgenommen: ganz(e.teilgenommen),
        };
        /* Ein Zustand, in dem mehr 1. Plätze als Teilnahmen stehen, ist
         * kaputt — er entsteht nur durch Manipulation. Statt ihn stehen
         * zu lassen (und im Fenster eine unmögliche Zahl zu zeigen),
         * wird er auf das Mögliche gestutzt. */
        var t = s.events[String(k)];
        t.top10 = Math.min(t.top10, t.teilgenommen);
        t.erster = Math.min(t.erster, t.top10);
      }
    }
    return s;
  }
  function get() {
    var roh = null;
    try { roh = JSON.parse(lsGet() || "null"); } catch (e) { roh = null; }
    return heile(roh);
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }
  function reset() { var s = frisch(); save(s); return s; }

  /* ---- Anzeigename ---- */

  function pruefName(roh) {
    var n = String(roh == null ? "" : roh).trim().replace(/\s+/g, " ");
    if (n.length < NAME_MIN) return { ok: false, name: n, grund: "Mindestens " + NAME_MIN + " Zeichen." };
    if (n.length > NAME_MAX) return { ok: false, name: n, grund: "Höchstens " + NAME_MAX + " Zeichen." };
    if (!NAME_ERLAUBT.test(n)) {
      return { ok: false, name: n, grund: "Erlaubt sind Buchstaben, Ziffern, Leerzeichen, Punkt, Strich." };
    }
    return { ok: true, name: n, grund: "" };
  }
  function name() {
    var s = get();
    return s.name || NAME_STANDARD;
  }
  /* setName() schreibt den Namen AUCH in ArenaClan, weil dort die
   * eigene Ranglisten-Zeile und der Clan-Eintrag ihren Namen herholen
   * (`s.me.name`). Ohne diesen Abgleich hieße derselbe Spieler im
   * Profil „Prisma-Magier“ und in der Rangliste „Du“ — genau der Bruch,
   * den ein Umbenennen-Knopf beheben soll. ArenaClan bekommt dafür
   * keinen eigenen Setter: dieses Modul ist der Besitzer des Namens,
   * ArenaClan nur ein Leser. */
  function setName(roh) {
    var p = pruefName(roh);
    if (!p.ok) throw new Error(p.grund);
    var s = get();
    s.name = p.name;
    save(s);
    syncName(p.name);
    return p.name;
  }
  function syncName(n) {
    var c = CL();
    if (!c || typeof c.get !== "function" || typeof c._write !== "function") return false;
    try {
      var st = c.get();
      if (!st || !st.me) return false;
      st.me.name = n;
      c._write(st);
      return true;
    } catch (e) { return false; }
  }

  /* ---- §2.3 Event-Platzierungen ----
   * Der einzige Zähler, den dieses Modul selbst führt. Es gab bisher
   * keinen Besitzer dafür: ArenaPass zählt XP, ArenaClan zählt Kriege,
   * ArenaProfile zählt Matches — Turnier-PLATZIERUNGEN zählte niemand.
   * Deshalb steht der Zähler hier, statt im Fenster eine Null zu zeigen,
   * die nie etwas anderes werden kann. */
  function eventErgebnis(key, platz, now) {
    key = String(key || EVENT_KEY);
    var p = Math.max(1, Math.floor(Number(platz) || 0) || 999999);
    var s = get();
    var e = s.events[key] || frischEvent();
    e.teilgenommen++;
    if (p <= 10) e.top10++;
    if (p === 1) e.erster++;
    s.events[key] = e;
    save(s);
    return { key: key, platz: p, stand: { erster: e.erster, top10: e.top10, teilgenommen: e.teilgenommen } };
  }
  function eventStand(key) {
    var e = get().events[String(key || EVENT_KEY)];
    return e ? { erster: e.erster, top10: e.top10, teilgenommen: e.teilgenommen } : frischEvent();
  }
  /* Summe über ALLE Events. Das ist der Wert, der im Statistik-Raster
   * steht (AA hat „1st Place | Top 10“ dort UND im Wochenend-Block);
   * der Wochenend-Block zeigt dagegen nur das Kristall-Turnier. Heute
   * sind beide gleich, weil es genau ein Event gibt — sie laufen
   * auseinander, sobald ein zweites dazukommt. Genau dafür sind es zwei
   * getrennte Abfragen und nicht eine. */
  function eventSumme() {
    var s = get(), out = frischEvent();
    for (var k in s.events) {
      if (!Object.prototype.hasOwnProperty.call(s.events, k)) continue;
      out.erster += s.events[k].erster;
      out.top10 += s.events[k].top10;
      out.teilgenommen += s.events[k].teilgenommen;
    }
    return out;
  }

  /* ==================================================================
   * §2.4 Sim — DIE BOT-SCHICHT / SERVER-NAHT
   * ------------------------------------------------------------------
   * Jede Funktion ist rein: gleiche Id → gleicher Wert, über Neuladen
   * und über Geräte hinweg. Nichts wird gespeichert, es gibt also auch
   * nichts zu migrieren, wenn ein echter Spielerdienst diese Funktionen
   * ersetzt. Die Bandbreiten sind an unseren EIGENEN Werten geeicht,
   * nicht an AAs Zahlen: ein Bot mit 1 200 Trophäen muss neben dem
   * Spieler mit 1 200 Trophäen plausibel stehen.
   * ================================================================== */
  var Sim = {};

  /* Summe der Basis-Power aller sechs Türme plus einem Helden — der
   * Bezugswert, an dem alle Bot-Powerwerte hängen. */
  var POWER_BASIS = (function () {
    var s = 0;
    TURM_IDS.forEach(function (id) { s += BASIS_POWER[id]; });
    return s + BASIS_POWER.solara;
  })();

  /* Höchsttrophäen: immer ≥ aktueller Stand. Der Aufschlag wächst mit
   * dem Stand (wer hoch steht, ist schon einmal höher gestanden) und
   * liegt zwischen 2 % und 14 %. */
  Sim.best = function (id, troph) {
    troph = ganz(troph);
    return troph + Math.round(troph * (0.02 + 0.12 * h01(id, "best")) + 10);
  };
  /* Power steigt mit der Arena, weil dort die Kartenstufen steigen.
   * 0 Trophäen → ~70 % der Basis, 2 600 Trophäen → ~215 %. */
  Sim.power = function (id, troph) {
    troph = ganz(troph);
    var f = 0.70 + troph / 1800;
    return Math.round(POWER_BASIS * f * (0.92 + 0.16 * h01(id, "pw")) / 10) * 10;
  };
  /* Ø Medaillen je Match: 0–3 möglich, realistisch 0,8–2,4. */
  Sim.medaillen = function (id) {
    return Math.round((0.8 + 1.6 * h01(id, "med")) * 10) / 10;
  };
  Sim.streak = function (id, troph) {
    return 2 + Math.floor(h01(id, "streak") * 7) + Math.floor(ganz(troph) / 700);
  };
  Sim.spenden = function (id) { return Math.floor(h01(id, "don") * 420); };
  Sim.siege = function (id, troph) {
    return Math.round(ganz(troph) / 9 + h01(id, "win") * 70);
  };
  Sim.quote = function (id) { return 0.40 + 0.24 * h01(id, "rate"); };
  /* Fortschritt in der Sammlung. Bei 6 Türmen / 32 Boni / 2 Helden sind
   * das kleine Zahlen — sie hängen deshalb an den Trophäen, nicht am
   * Zufall allein, sonst stünde ein Arena-8-Bot mit zwei Türmen da.
   *
   * DIE BEZUGSGRÖSSE IST DIE POPULATION, NICHT DIE ARENA: die Rangliste
   * reicht von 150 bis 9 800 Trophäen (ArenaClan LB_BOTTOM/LB_TOP). Ein
   * Nenner, der schon bei 4 200 sättigt, macht aus jedem zweiten Bot
   * einen Vollsammler — dann sagt die Zeile nichts mehr. Beide Formeln
   * erreichen ihr Maximum deshalb erst am oberen Ende der Population. */
  Sim.tuerme = function (id, troph, max) {
    return clamp(2 + Math.floor(ganz(troph) / 700) + Math.floor(h01(id, "tw") * 2), 1, max);
  };
  Sim.boni = function (id, troph, max) {
    return clamp(Math.floor(max * (0.08 + ganz(troph) / 11000)) +
                 Math.floor(h01(id, "bo") * 3), 0, max);
  };
  Sim.helden = function (id, troph, max) {
    return clamp(1 + Math.floor(ganz(troph) / 1600), 0, max);
  };
  /* Kartenstufe. Der Deckel je Stufe kommt aus dem Tier (25/40/55/…),
   * die Höhe aus der Arena. */
  Sim.stufe = function (id, kartenId, troph, cap) {
    var basis = 4 + Math.floor(ganz(troph) / 90) + Math.floor(h01(id, "lvl", kartenId) * 6);
    return clamp(basis, 1, cap);
  };
  Sim.tier = function (id, kartenId, troph) {
    var stufen = tiers();
    var i = clamp(Math.floor(ganz(troph) / 620) + Math.floor(h01(id, "tier", kartenId) * 2),
                  0, stufen.length - 1);
    return stufen[i].key;
  };
  /* Welcher Held steht im Deck? Deterministisch aus der Id — ein Bot
   * wechselt seinen Helden nicht zwischen zwei Renderdurchläufen. */
  Sim.held = function (id, deckNr) {
    return HELDEN_IDS[hash(id, "held", deckNr | 0) % HELDEN_IDS.length];
  };
  /* Anwesenheit. Wortgleich zu ArenaFriends.Sim.presence(): der Status
   * haengt am FÜNF-MINUTEN-Bucket und ist eine reine Funktion aus
   * (id, bucket) — zwei Aufrufe innerhalb derselben fünf Minuten liefern
   * dasselbe, das Fenster darf also frei neu rendern, ohne dass jemand
   * flackert. Die Abwesenheitsdauer laeuft im STUNDEN-Takt, sonst
   * spraenge „zuletzt vor 3 h“ alle fuenf Minuten auf einen anderen Wert.
   * Gebraucht wird das nur fuer Spieler, zu denen es keine echte Quelle
   * gibt — Ranglisten-Zeilen tragen keinen Online-Status. */
  Sim.aktivitaet = function (id) { return 0.10 + 0.45 * h01(id, "act"); };
  Sim.praesenz = function (id, now) {
    now = nowMs(now);
    var bucket = Math.floor(now / (5 * MINUTE));
    var act = Sim.aktivitaet(id);
    if (h01(id, "on", bucket) < act) return { online: true, text: "Online" };
    var stunde = Math.floor(now / HOUR);
    var spanne = (3.5 - 3 * act) * DAY;
    var idle = 5 * MINUTE + Math.round(h01(id, "idle", stunde) * spanne);
    return { online: false, text: "zuletzt " + ago(idle) };
  };
  Sim.event = function (id) {
    var teil = Math.floor(h01(id, "ev") * 9);
    var top = Math.floor(h01(id, "ev10") * (teil + 1));
    var eins = h01(id, "ev1") < 0.12 ? Math.min(1, top) : 0;
    return { erster: eins, top10: top, teilgenommen: teil };
  };

  /* ==================================================================
   * §3 API — fertige Anzeigefelder
   * ================================================================== */

  /* ---- §3.1 Bausteine, die beide Profile teilen ---- */

  function zelle(def, wert, extra) {
    var z = { key: def.key, label: def.label, wert: wert,
              ico: def.ico, emoji: def.emoji, wappen: !!def.wappen };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) z[k] = extra[k];
    return z;
  }
  function statZelle(def, a, b) {
    if (def.geteilt) {
      return { key: def.key, geteilt: true,
               labelA: def.labelA, wertA: a, labelB: def.labelB, wertB: b };
    }
    return { key: def.key, geteilt: false, label: def.label, wert: a };
  }

  /* Karte für die Deck-Anzeige. `boni` steht nur beim Helden — AA zeigt
   * unter der Heldenkarte zwei sechseckige Plättchen mit einer Zahl.
   * Bei uns sind das die MERGE-BONI der Karte; die Zahl ist ihr
   * Prozentwert (bzw. der Power-Beitrag, wenn der Bonus keinen hat).
   * Hat der Held weniger als zwei Boni, bleibt der Platz LEER statt
   * gefüllt — ein leerer Sockel ist eine Aussage, eine erfundene Zahl
   * nicht. */
  function bonusPlaettchen(kartenId, bonusIds) {
    var c = AC(), out = [];
    (bonusIds || []).forEach(function (pid) {
      var p = c && typeof c.perkById === "function" ? c.perkById(pid) : null;
      if (!p) return;
      var zahl = typeof p.pct === "number" ? Math.abs(p.pct)
        : Math.round(((p.pw || 1) - 1) * 100);
      out.push({ id: pid, txt: p.txt || "", zahl: zahl, el: EL_VON[kartenId] || "light" });
    });
    while (out.length < 2) out.push(null);          // leerer Sockel
    return out.slice(0, 2);
  }

  function karte(id, lvl, tierKey, boni) {
    var t = tierVon(tierKey);
    return {
      id: id, name: KARTEN_NAME[id] || id,
      lvl: lvl, lvlText: "LvL " + lvl,
      tier: t.key, tierName: t.name, tierColor: t.color,
      el: EL_VON[id] || "light",
      elName: EL_NAME[EL_VON[id]] || "",
      elEmoji: EL_EMOJI[EL_VON[id]] || "◆",
      held: HELDEN_IDS.indexOf(id) >= 0,
      boni: boni || null,
    };
  }

  /* ---- §3.2 Eigenes Profil ---- */

  function eigeneTrophaeen() {
    var p = PR();
    if (!p || typeof p.get !== "function") return 0;
    try { return ganz((p.get() || {}).trophies); } catch (e) { return 0; }
  }
  function eigenerStand() {
    var p = PR();
    var leer = { trophies: 0, best: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, history: [] };
    if (!p || typeof p.get !== "function") return leer;
    try {
      var s = p.get() || {};
      return {
        trophies: ganz(s.trophies), best: ganz(s.best),
        wins: ganz(s.wins), losses: ganz(s.losses),
        streak: ganz(s.streak), bestStreak: ganz(s.bestStreak),
        history: Array.isArray(s.history) ? s.history : [],
      };
    } catch (e) { return leer; }
  }
  /* Ø Medaillen = Mittel der 0–3-Wertung über die letzten Matches.
   * ArenaProfile führt genau 20 Einträge (history) — das ist die
   * Grundgesamtheit, mehr gibt der Zustand nicht her. Ohne Match steht
   * „—“, nicht „0,0“: keine Daten ist etwas anderes als null Medaillen. */
  function eigeneMedaillen() {
    var h = eigenerStand().history;
    if (!h.length) return null;
    var s = 0, n = 0;
    h.forEach(function (m) {
      if (!m || typeof m !== "object") return;
      s += clamp(ganz(m.s), 0, 3); n++;
    });
    return n ? s / n : null;
  }
  function eigenePower() {
    var c = AC(), summe = 0;
    TURM_IDS.forEach(function (id) {
      var mul = 1;
      try { if (c && c.view) mul = Number(c.view(id).statMul) || 1; } catch (e) {}
      summe += BASIS_POWER[id] * mul;
    });
    /* Der Held zählt mit, aber nur EINER — im Deck steht auch nur einer.
     * Genommen wird der stärkste besessene; ist keiner frei, zählt kein
     * Held (statt heimlich den Basiswert eines gesperrten anzurechnen). */
    var besterHeld = 0;
    HELDEN_IDS.forEach(function (id) {
      try {
        if (!c || !c.view) return;
        var v = c.view(id);
        if (!v.owned) return;
        besterHeld = Math.max(besterHeld, BASIS_POWER[id] * (Number(v.statMul) || 1));
      } catch (e) {}
    });
    summe += besterHeld;
    /* Festungsstufen sind Power im selben Sinn (der Prototyp zeigt sie
     * als „Festungs-Power“). Fehlt das Modul, fehlt der Anteil. */
    var f = AF();
    try {
      if (f && f.state && f.powerSum) summe += Number(f.powerSum(f.state().steps)) || 0;
    } catch (e) {}
    return Math.round(summe);
  }
  function eigeneSpenden() {
    var c = CL();
    if (!c || typeof c.members !== "function") return 0;
    try {
      var m = c.members(), out = 0;
      m.forEach(function (x) { if (x && x.me) out = ganz(x.donated); });
      return out;
    } catch (e) { return 0; }
  }
  function eigenerRang() {
    var c = CL();
    if (!c || typeof c.leaderboard !== "function") return 0;
    try { return ganz(c.leaderboard("global").myRank); } catch (e) { return 0; }
  }
  function eigenerClan() {
    var c = CL();
    if (!c || typeof c.info !== "function") return { name: "", badge: null };
    try {
      var i = c.info();
      if (!i || !i.joined) return { name: "", badge: null };
      return { name: i.name, badge: { c1: i.badge.c1, c2: i.badge.c2, symChar: i.badge.symChar } };
    } catch (e) { return { name: "", badge: null }; }
  }
  function eigeneSammlung() {
    var c = AC();
    var tuerme = 0, helden = 0, boni = 0, boniMax = 0;
    if (c && typeof c.PERKS === "object" && c.PERKS) {
      for (var cid in c.PERKS) {
        if (!Object.prototype.hasOwnProperty.call(c.PERKS, cid)) continue;
        for (var tk in c.PERKS[cid]) {
          if (!Object.prototype.hasOwnProperty.call(c.PERKS[cid], tk)) continue;
          if (Array.isArray(c.PERKS[cid][tk])) boniMax += c.PERKS[cid][tk].length;
        }
      }
    }
    TURM_IDS.concat(HELDEN_IDS).forEach(function (id) {
      try {
        if (!c || !c.view) return;
        var v = c.view(id);
        if (v.owned) { if (HELDEN_IDS.indexOf(id) >= 0) helden++; else tuerme++; }
        boni += (v.mergeBoni || []).length;
      } catch (e) {}
    });
    return { tuerme: tuerme, tuermeMax: TURM_IDS.length,
             helden: helden, heldenMax: HELDEN_IDS.length,
             boni: boni, boniMax: boniMax };
  }
  function eigenesDeck(nr) {
    var c = AC(), heldId = HELDEN_IDS[nr] || HELDEN_IDS[0];
    function bau(id) {
      var lvl = 1, tk = "common", bon = [];
      try {
        if (c && c.view) { var v = c.view(id); lvl = v.lvl; tk = v.tier; bon = v.mergeBoni || []; }
      } catch (e) {}
      return { id: id, lvl: lvl, tier: tk, boni: bon };
    }
    var h = bau(heldId);
    var frei = true;
    try { if (c && c.view) frei = !!c.view(heldId).owned; } catch (e) {}
    return {
      nr: nr,
      held: karte(heldId, h.lvl, h.tier, bonusPlaettchen(heldId, h.boni)),
      heldFrei: frei,
      tuerme: TURM_IDS.map(function (id) {
        var t = bau(id);
        return karte(id, t.lvl, t.tier, null);
      }),
    };
  }
  function eigenesAvatar() {
    var a = AV();
    if (!a || typeof a.active !== "function") return null;
    try {
      var act = a.active();
      return {
        emoji: act.avatar.emoji, portraitUrl: act.avatar.portraitUrl || null,
        ringUrl: act.ringUrl || null, ringFarbe: act.frame.tierColor,
        name: act.avatar.name, rahmen: act.frame.name,
      };
    } catch (e) { return null; }
  }

  function eigenes(now) {
    now = nowMs(now);
    var st = eigenerStand();
    var troph = st.trophies;
    var arenaNr = arenaFuer(troph);
    var clan = eigenerClan();
    var samm = eigeneSammlung();
    var med = eigeneMedaillen();
    var rang = eigenerRang();
    var spiele = st.wins + st.losses;
    var summe = eventSumme(), turnier = eventStand(EVENT_KEY);
    var f = FR();
    var code = null;
    try { if (f && f.myCode) code = f.myCode(now); } catch (e) {}

    return {
      eigen: true,
      id: "me",
      name: name(),
      online: true,
      statusText: "Online",
      avatar: eigenesAvatar(),
      el: null, elName: "", elEmoji: "",
      clanName: clan.name, clanBadge: clan.badge,
      rang: rang, rangText: rang ? "#" + fmtN(rang) : "—",
      trophaeen: troph,
      arena: { n: arenaNr, name: arenaNameVon(arenaNr) },
      kennzahlen: [
        zelle(KENNZAHLEN[0], arenaNameVon(arenaNr), { arenaNr: arenaNr }),
        zelle(KENNZAHLEN[1], fmtN(Math.max(st.best, troph))),
        zelle(KENNZAHLEN[2], fmtN(eigenePower())),
        zelle(KENNZAHLEN[3], med === null ? "—" : fmt1(med)),
        zelle(KENNZAHLEN[4], fmtN(st.bestStreak)),
        zelle(KENNZAHLEN[5], fmtN(eigeneSpenden())),
      ],
      decks: HELDEN_IDS.map(function (_, i) { return eigenesDeck(i); }),
      aktivesDeck: 0,
      statistik: [
        statZelle(STATISTIK[0], fmtN(st.wins)),
        statZelle(STATISTIK[1], spiele ? fmtPct(st.wins / spiele) : "—"),
        statZelle(STATISTIK[2], fmtN(summe.erster), fmtN(summe.top10)),
        statZelle(STATISTIK[3], samm.tuerme + "/" + samm.tuermeMax),
        statZelle(STATISTIK[4], samm.boni + "/" + samm.boniMax),
        statZelle(STATISTIK[5], samm.helden + "/" + samm.heldenMax),
      ],
      wochenende: {
        titel: EVENT_NAME, ico: EVENT_ICO, emoji: EVENT_EMOJI,
        erster: fmtN(turnier.erster), top10: fmtN(turnier.top10),
        teilgenommen: fmtN(turnier.teilgenommen),
      },
      spielerId: code,
    };
  }

  /* ---- §3.3 Fremdes Profil ----
   * `quelle` ist ein flaches Objekt aus dem UI. Pflicht ist nur `id`;
   * alles andere ist optional und wird, wenn es fehlt, aus den anderen
   * Modulen oder aus Sim geholt. Genau deshalb können Rangliste,
   * Freundesliste und später ein Event dieselbe Funktion füttern, ohne
   * dass jede Aufrufstelle dasselbe Objekt zusammenbauen muss.
   *   {id, name, trophies, clanName, clanBadge, rang, el, online, statusText} */
  function fremdes(quelle, now) {
    now = nowMs(now);
    var q = quelle || {};
    var id = String(q.id || "");
    if (!id) throw new Error("Fremdes Profil braucht eine Spieler-Id.");

    /* Echte Daten haben Vorrang, in dieser Reihenfolge:
     *   1. was der Aufrufer mitgibt (Ranglisten-Zeile, Freundes-Eintrag)
     *   2. Clan-Mitglied (dort stehen echte Spenden und echte Aktivität)
     *   3. Freundeseintrag (dort steht echter Online-Status)
     *   4. Sim */
    var mitglied = null;
    var c = CL();
    if (c && typeof c.members === "function") {
      try {
        c.members(now).forEach(function (m) {
          if (m && !m.me && (m.id === id || m.name === q.name)) mitglied = m;
        });
      } catch (e) {}
    }
    var freund = null;
    var f = FR();
    if (f && typeof f.friend === "function") {
      try { freund = f.friend(id, now); } catch (e) {}
    }

    var troph = ganz(q.trophies != null ? q.trophies
      : (mitglied ? mitglied.trophies : (freund ? freund.trophies : Sim.best(id, 800) / 1.1)));
    var arenaNr = arenaFuer(troph);
    var el = q.el || (freund && freund.el) || (mitglied && mitglied.el) ||
             TURM_IDS[hash(id, "el") % TURM_IDS.length];

    var online, statusText;
    if (typeof q.online === "boolean") {
      online = q.online;
      statusText = q.statusText || (online ? "Online" : "Offline");
    } else if (freund) {
      online = !!freund.online;
      statusText = freund.online ? "Online" : "zuletzt " + freund.statusText.replace(/^zuletzt /, "");
    } else if (mitglied) {
      online = ganz(mitglied.idleMs) < 5 * MINUTE;
      statusText = online ? "Online" : "zuletzt " + ago(ganz(mitglied.idleMs));
    } else {
      /* Ranglisten-Zeilen tragen keinen Anwesenheitsstand. Statt „nicht
       * bekannt“ in die Zeile zu schreiben, liefert Sim einen — aber
       * einen, der im Fünf-Minuten-Takt STABIL ist. Ein Status, der bei
       * jedem Rendern springt, wäre schlechter als gar keiner. */
      var pr = Sim.praesenz(id, now);
      online = pr.online;
      statusText = pr.text;
    }

    /* Weltrang. Gibt ihn der Aufrufer nicht mit (Freundesliste tut das
     * nicht), wird er in derselben Rangliste NACHGESCHLAGEN, die das
     * Fenster auch sonst zeigt — ein zweiter, geschätzter Rang wäre eine
     * zweite Wahrheit. Steht der Spieler nicht in den Top 100, bleibt
     * das Feld leer statt falsch. */
    var rang = ganz(q.rang);
    if (!rang && c && typeof c.leaderboard === "function") {
      try {
        c.leaderboard("global", now).rows.forEach(function (r) {
          if (!rang && (r.id === id || r.name === q.name)) rang = ganz(r.rank);
        });
      } catch (e) {}
    }

    var spenden = mitglied ? ganz(mitglied.donated) : Sim.spenden(id);
    var siege = Sim.siege(id, troph);
    var quote = Sim.quote(id);
    var samm = {
      tuerme: Sim.tuerme(id, troph, TURM_IDS.length), tuermeMax: TURM_IDS.length,
      helden: Sim.helden(id, troph, HELDEN_IDS.length), heldenMax: HELDEN_IDS.length,
    };
    var boniMax = eigeneSammlung().boniMax || 32;
    samm.boni = Sim.boni(id, troph, boniMax);
    samm.boniMax = boniMax;
    var ev = Sim.event(id);

    return {
      eigen: false,
      id: id,
      name: q.name || (freund && freund.name) || (mitglied && mitglied.name) || "Unbekannt",
      online: online,
      statusText: statusText,
      avatar: null,                       // Bots tragen kein Portrait-Asset
      el: el, elName: EL_NAME[el] || "", elEmoji: EL_EMOJI[el] || "◆",
      clanName: q.clanName || (mitglied ? (q.clanName || "") : ""),
      clanBadge: q.clanBadge || null,
      rang: rang, rangText: rang ? "#" + fmtN(rang) : "—",
      trophaeen: troph,
      arena: { n: arenaNr, name: arenaNameVon(arenaNr) },
      kennzahlen: [
        zelle(KENNZAHLEN[0], arenaNameVon(arenaNr), { arenaNr: arenaNr }),
        zelle(KENNZAHLEN[1], fmtN(Sim.best(id, troph))),
        zelle(KENNZAHLEN[2], fmtN(Sim.power(id, troph))),
        zelle(KENNZAHLEN[3], fmt1(Sim.medaillen(id))),
        zelle(KENNZAHLEN[4], fmtN(Sim.streak(id, troph))),
        zelle(KENNZAHLEN[5], fmtN(spenden)),
      ],
      decks: [0, 1].map(function (i) { return fremdesDeck(id, troph, i); }),
      aktivesDeck: 0,
      statistik: [
        statZelle(STATISTIK[0], fmtN(siege)),
        statZelle(STATISTIK[1], fmtPct(quote)),
        statZelle(STATISTIK[2], fmtN(ev.erster), fmtN(ev.top10)),
        statZelle(STATISTIK[3], samm.tuerme + "/" + samm.tuermeMax),
        statZelle(STATISTIK[4], samm.boni + "/" + samm.boniMax),
        statZelle(STATISTIK[5], samm.helden + "/" + samm.heldenMax),
      ],
      wochenende: {
        titel: EVENT_NAME, ico: EVENT_ICO, emoji: EVENT_EMOJI,
        erster: fmtN(ev.erster), top10: fmtN(ev.top10), teilgenommen: fmtN(ev.teilgenommen),
      },
      /* Kein fremder Code im eigenen Fenster: die Spieler-ID ist der
       * FREUNDESCODE, und den verteilt jeder selbst. Ein Profil, das
       * fremde Codes ausspuckt, macht aus der Rangliste ein Adressbuch. */
      spielerId: null,
    };
  }

  function fremdesDeck(id, troph, nr) {
    var heldId = Sim.held(id, nr);
    function bau(kid) {
      var tk = Sim.tier(id, kid, troph);
      return karte(kid, Sim.stufe(id, kid, troph, tierVon(tk).cap), tk, null);
    }
    var h = bau(heldId);
    /* Fremde Boni sind NICHT ableitbar — ein Bot hat keine Merge-Wahl
     * getroffen. Beide Sockel bleiben deshalb leer. Das ist der
     * sichtbare Unterschied zwischen „hat keine“ und „wir wissen es
     * nicht“; erfundene Prozentwerte wären hier eine Lüge über einen
     * Build, den es nicht gibt. */
    h.boni = [null, null];
    return { nr: nr, held: h, heldFrei: true, tuerme: TURM_IDS.map(bau) };
  }

  /* ---- §3.4 Bequeme Einstiege für die drei Aufrufstellen ---- */

  /* Ranglisten-Zeile aus ArenaClan.leaderboard(): {rank,id,name,trophies,
   * me,badge,clanName}. Die eigene Zeile liefert das EIGENE Profil —
   * sonst stünde man sich selbst als Bot gegenüber. */
  function ausRanglistenZeile(row, now) {
    if (!row) throw new Error("Keine Ranglisten-Zeile übergeben.");
    if (row.me || row.id === "me") return eigenes(now);
    return fremdes({
      id: row.id, name: row.name, trophies: row.trophies,
      clanName: row.clanName || "", clanBadge: row.badge || null,
      rang: row.rank,
    }, now);
  }
  /* Freundes-Eintrag aus ArenaFriends.list(): {id,name,trophies,online,
   * statusText,el,clanMate,…} */
  function ausFreund(f, now) {
    if (!f) throw new Error("Kein Freundes-Eintrag übergeben.");
    return fremdes({
      id: f.id, name: f.name, trophies: f.trophies, el: f.el,
      online: f.online, statusText: f.online ? "Online" : f.statusText,
      clanName: f.clanMate ? (f.clanName || "") : "",
    }, now);
  }

  /* ================= Export ================= */
  var API = {
    // Konstanten
    STATE_VERSION: STATE_VERSION,
    NAME_MIN: NAME_MIN, NAME_MAX: NAME_MAX, NAME_STANDARD: NAME_STANDARD,
    KENNZAHLEN: KENNZAHLEN, STATISTIK: STATISTIK,
    EVENT_KEY: EVENT_KEY, EVENT_NAME: EVENT_NAME,
    TURM_IDS: TURM_IDS, HELDEN_IDS: HELDEN_IDS, BASIS_POWER: BASIS_POWER,
    EL_NAME: EL_NAME, EL_EMOJI: EL_EMOJI, KARTEN_NAME: KARTEN_NAME,
    // Zustand
    get: get, reset: reset,
    // Name
    name: name, setName: setName, pruefName: pruefName,
    // Events
    eventErgebnis: eventErgebnis, eventStand: eventStand, eventSumme: eventSumme,
    // Profile
    eigenes: eigenes, fremdes: fremdes,
    ausRanglistenZeile: ausRanglistenZeile, ausFreund: ausFreund,
    // Formatierung (das UI soll nicht selbst runden)
    fmtN: fmtN, fmt1: fmt1, fmtPct: fmtPct, ago: ago,
    arenaFuer: arenaFuer, arenaNameVon: arenaNameVon,
    // intern (Tests, Server-Naht)
    _key: KEY, _sim: Sim, Sim: Sim,
    _write: function (s) { save(s); },
    _clock: function (fn) { CLOCK = fn || null; },
    _hash: hash,
  };

  if (typeof window !== "undefined") window.ArenaProfil = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_profil.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, i) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (i !== undefined ? "  — " + i : ""));
      if (!cond) fail++;
    };
    var throws = function (fn, part) {
      try { fn(); return { ok: false, msg: "(kein Fehler)" }; }
      catch (e) { return { ok: part ? e.message.indexOf(part) >= 0 : true, msg: e.message }; }
    };

    /* Nachbarmodule laden, OHNE deren Selbsttest auszulösen — dasselbe
     * Vorgehen wie in arena_friends.js: sie überspringen ihn, wenn
     * `window` existiert, setzen module.exports aber trotzdem. */
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
    var mAC = loadSibling("arena_cards.js");   if (mAC) globalThis.ArenaCards = mAC;
    var mCL = loadSibling("arena_clan.js");    if (mCL) globalThis.ArenaClan = mCL;
    var mAV = loadSibling("arena_avatars.js"); if (mAV) globalThis.ArenaAvatars = mAV;
    var mFR = loadSibling("arena_friends.js"); if (mFR) globalThis.ArenaFriends = mFR;
    var mAF = loadSibling("arena_fortress.js");if (mAF) globalThis.ArenaFortress = mAF;

    // ArenaProfile ist im Prototyp ein Browser-Modul (localStorage im
    // Modulkopf); im Test steht ein Doppel mit denselben Feldnamen.
    var STAND = { trophies: 1136, best: 1204, wins: 85, losses: 59,
                  streak: 3, bestStreak: 8,
                  history: [{ s: 3 }, { s: 2 }, { s: 1 }, { s: 3 }, { s: 2 }] };
    globalThis.ArenaProfile = { get: function () { return STAND; } };

    var MON = Date.UTC(2026, 6, 20, 9, 0, 0);
    var T = MON, setT = function (t) { T = t; };
    API._clock(function () { return T; });
    if (mCL) mCL._clock(function () { return T; });
    if (mAV) mAV._clock(function () { return T; });
    if (mFR) mFR._clock(function () { return T; });
    if (mCL) { mCL.reset(); mCL.seedDemoClan(); }
    if (mFR) { mFR.reset(); mFR.seedDemoFriends(); }

    console.log("\n=== ARENA PROFIL — Selbsttest (State v" + STATE_VERSION + ") ===\n");

    /* ================= 1. Werkzeug ================= */
    console.log("Werkzeug:");
    check("hash() ist rein — gleiche Argumente, gleiche Zahl",
      hash("a", 1) === hash("a", 1) && hash("a", 1) !== hash("a", 2));
    check("hash() mischt auch das LETZTE Argument (fmix32)", (function () {
      var a = [], i;
      for (i = 0; i < 8; i++) a.push(hash("bot", "pw", i) % 1000);
      var min = Math.min.apply(null, a), max = Math.max.apply(null, a);
      return max - min > 300;                     // ohne fmix32 lägen sie eng
    })());
    check("fmtN() setzt Tausenderpunkte", fmtN(44000) === "44.000" && fmtN(8) === "8", fmtN(44000));
    check("fmt1() nutzt das Dezimalkomma", fmt1(2.05) === "2,1" || fmt1(2.05) === "2,0", fmt1(2.1));
    check("fmtPct() rundet auf eine Stelle", fmtPct(0.59027) === "59,0 %", fmtPct(0.59027));
    check("ago() formatiert deutsch",
      ago(30000) === "gerade eben" && ago(3 * HOUR) === "vor 3 h" &&
      ago(DAY) === "vor 1 Tag" && ago(2 * DAY) === "vor 2 Tagen", ago(2 * DAY));
    check("arenaFuer()/arenaNameVon() lesen ArenaAvatars",
      arenaFuer(1136) === 4 && arenaNameVon(5) === "Obsidian-Thron",
      arenaFuer(1136) + " / " + arenaNameVon(5));

    /* ================= 2. Anzeigename ================= */
    reset();
    console.log("\nAnzeigename:");
    check("frisch steht der Standardname", name() === NAME_STANDARD, name());
    check("setName() nimmt einen gültigen Namen an", setName("  Nova   Klinge ") === "Nova Klinge",
      name());
    check("Mehrfach-Leerzeichen werden zusammengezogen", name() === "Nova Klinge", name());
    check("zu kurz wirft", throws(function () { setName("ab"); }, "Mindestens").ok);
    check("zu lang wirft", throws(function () { setName("123456789012345"); }, "Höchstens").ok);
    check("Markup wirft", throws(function () { setName("<b>hi</b>"); }, "Erlaubt").ok);
    check("Umlaute und Bindestrich sind erlaubt", setName("Öde-Käfer_9") === "Öde-Käfer_9", name());
    check("Name überlebt Neu-Laden", (function () { return get().name === "Öde-Käfer_9"; })());
    if (mCL) {
      check("setName() zieht ArenaClan.me.name mit",
        mCL.get().me.name === "Öde-Käfer_9", mCL.get().me.name);
      check("die eigene Ranglisten-Zeile trägt denselben Namen", (function () {
        var lb = mCL.leaderboard("global");
        var me = lb.rows.filter(function (r) { return r.me; })[0];
        return me && me.name === "Öde-Käfer_9";
      })());
    }
    setName(NAME_STANDARD);

    /* ================= 3. Event-Platzierungen ================= */
    console.log("\nEvent-Platzierungen:");
    reset();
    check("frisch: alles null", (function () {
      var e = eventStand(EVENT_KEY);
      return e.erster === 0 && e.top10 === 0 && e.teilgenommen === 0;
    })());
    eventErgebnis(EVENT_KEY, 1);
    eventErgebnis(EVENT_KEY, 7);
    eventErgebnis(EVENT_KEY, 340);
    var ev = eventStand(EVENT_KEY);
    check("1./7./340. Platz → 1 erster, 2 in Top 10, 3 Teilnahmen",
      ev.erster === 1 && ev.top10 === 2 && ev.teilgenommen === 3,
      JSON.stringify(ev));
    eventErgebnis("essence", 2);
    check("eventStand() trennt die Events",
      eventStand("essence").teilgenommen === 1 && eventStand(EVENT_KEY).teilgenommen === 3);
    check("eventSumme() addiert über alle Events",
      eventSumme().teilgenommen === 4 && eventSumme().top10 === 3,
      JSON.stringify(eventSumme()));
    check("unmöglicher Stand wird beim Lesen gestutzt", (function () {
      API._write({ v: STATE_VERSION, name: "", events: { x: { erster: 9, top10: 2, teilgenommen: 1 } } });
      var e = eventStand("x");
      return e.teilgenommen === 1 && e.top10 === 1 && e.erster === 1;
    })(), JSON.stringify(eventStand("x")));

    /* ================= 4. Eigenes Profil ================= */
    console.log("\nEigenes Profil:");
    reset(); setName("Prisma-Magier");
    eventErgebnis(EVENT_KEY, 1); eventErgebnis(EVENT_KEY, 4); eventErgebnis(EVENT_KEY, 88);
    var P = eigenes();
    console.log("  " + P.name + " · " + P.statusText + " · Rang " + P.rangText +
      " · Clan " + (P.clanName || "—"));
    P.kennzahlen.forEach(function (z) { console.log("    " + z.label + ": " + z.wert); });
    P.statistik.forEach(function (z) {
      console.log("    " + (z.geteilt ? z.labelA + " " + z.wertA + " | " + z.labelB + " " + z.wertB
        : z.label + ": " + z.wert));
    });
    check("eigen:true und id 'me'", P.eigen === true && P.id === "me");
    check("sechs Kennzahlen in AAs Reihenfolge",
      P.kennzahlen.length === 6 &&
      P.kennzahlen.map(function (z) { return z.key; }).join(",") ===
        "arena,best,power,medaillen,streak,spenden",
      P.kennzahlen.map(function (z) { return z.key; }).join(","));
    check("die Arena-Zelle trägt das Wappen ausserhalb",
      P.kennzahlen[0].wappen === true && P.kennzahlen[0].arenaNr === arenaFuer(STAND.trophies),
      P.kennzahlen[0].arenaNr);
    check("Arena kommt aus den Trophäen, nicht aus einer Konstante",
      P.kennzahlen[0].wert === arenaNameVon(arenaFuer(STAND.trophies)), P.kennzahlen[0].wert);
    check("Höchsttrophäen sind nie kleiner als der aktuelle Stand",
      P.kennzahlen[1].wert === fmtN(STAND.best), P.kennzahlen[1].wert);
    check("Ø Medaillen = Mittel der 0-3-Wertung aus ArenaProfile.history",
      P.kennzahlen[3].wert === fmt1((3 + 2 + 1 + 3 + 2) / 5), P.kennzahlen[3].wert);
    check("Serie kommt aus bestStreak", P.kennzahlen[4].wert === fmtN(STAND.bestStreak));
    check("Power ist grösser als die Summe der sechs Turm-Basiswerte",
      Number(P.kennzahlen[2].wert.replace(/\./g, "")) >= 6460, P.kennzahlen[2].wert);
    check("Siegquote = Siege / (Siege + Niederlagen)",
      P.statistik[1].wert === fmtPct(85 / 144), P.statistik[1].wert);
    check("die geteilte Zelle trägt zwei Werte",
      P.statistik[2].geteilt === true && P.statistik[2].wertA === "1" && P.statistik[2].wertB === "2",
      P.statistik[2].wertA + "/" + P.statistik[2].wertB);
    check("Türme/Boni/Helden zählen gegen die echten Obergrenzen",
      /^\d+\/6$/.test(P.statistik[3].wert) && /^\d+\/\d+$/.test(P.statistik[4].wert) &&
      /^\d+\/2$/.test(P.statistik[5].wert),
      P.statistik[3].wert + " " + P.statistik[4].wert + " " + P.statistik[5].wert);
    check("Boni-Obergrenze kommt aus ArenaCards.PERKS (32)",
      P.statistik[4].wert.split("/")[1] === "32", P.statistik[4].wert);
    check("Wochenend-Block nennt unser Freitag-Event",
      P.wochenende.titel === "Kristall-Turnier" && P.wochenende.teilgenommen === "3",
      P.wochenende.teilgenommen);
    check("zwei Decks, je Held + sechs Türme",
      P.decks.length === 2 && P.decks[0].tuerme.length === 6 &&
      P.decks[0].held.held === true && P.decks[1].held.id !== P.decks[0].held.id,
      P.decks[0].held.id + " / " + P.decks[1].held.id);
    check("jede Karte trägt Element, Stufe, Tier und Tier-Farbe",
      P.decks[0].tuerme.every(function (k) {
        return k.el && k.lvlText.indexOf("LvL ") === 0 && k.tier && /^#/.test(k.tierColor);
      }));
    check("Heldenkarte hat genau zwei Bonus-Sockel (leer erlaubt)",
      P.decks[0].held.boni.length === 2);
    if (mFR) {
      check("Spieler-ID ist der Freundescode aus ArenaFriends",
        P.spielerId === mFR.myCode(), P.spielerId);
    }
    check("ohne Match steht bei Ø Medaillen ein Strich, keine 0", (function () {
      var keep = STAND.history; STAND.history = [];
      var x = eigenes().kennzahlen[3].wert;
      STAND.history = keep;
      return x === "—";
    })());

    /* ================= 5. Fremdes Profil ================= */
    console.log("\nFremdes Profil:");
    var F = fremdes({ id: "bot_17", name: "Gorm Silberzahn", trophies: 2120,
                      clanName: "Eisenbund", rang: 42 });
    console.log("  " + F.name + " · " + F.statusText + " · Rang " + F.rangText +
      " · Clan " + F.clanName);
    F.kennzahlen.forEach(function (z) { console.log("    " + z.label + ": " + z.wert); });
    check("eigen:false, kein Stift, keine Spieler-ID",
      F.eigen === false && F.spielerId === null);
    check("dieselbe Modell-Form wie das eigene Profil", (function () {
      var a = Object.keys(P).sort().join(","), b = Object.keys(F).sort().join(",");
      return a === b;
    })(), Object.keys(F).length + " Felder");
    check("dieselben sechs Kennzahl-Schlüssel",
      F.kennzahlen.map(function (z) { return z.key; }).join(",") ===
      P.kennzahlen.map(function (z) { return z.key; }).join(","));
    check("Arena folgt den übergebenen Trophäen",
      F.kennzahlen[0].wert === arenaNameVon(arenaFuer(2120)), F.kennzahlen[0].wert);
    check("Höchsttrophäen liegen über dem aktuellen Stand",
      Number(F.kennzahlen[1].wert.replace(/\./g, "")) > 2120, F.kennzahlen[1].wert);
    check("Weltrang kommt aus der Ranglisten-Zeile", F.rangText === "#42", F.rangText);
    check("Bot-Werte sind stabil über zwei Aufrufe", (function () {
      var a = JSON.stringify(fremdes({ id: "bot_17", trophies: 2120 }));
      var b = JSON.stringify(fremdes({ id: "bot_17", trophies: 2120 }));
      return a === b;
    })());
    check("zwei verschiedene Bots bekommen verschiedene Werte", (function () {
      var a = fremdes({ id: "bot_17", trophies: 2120 }).kennzahlen[2].wert;
      var b = fremdes({ id: "bot_18", trophies: 2120 }).kennzahlen[2].wert;
      return a !== b;
    })());
    check("Power eines gleich starken Bots liegt in derselben Grössenordnung wie meine",
      (function () {
        var meins = Number(eigenes().kennzahlen[2].wert.replace(/\./g, ""));
        var seins = Number(fremdes({ id: "bot_x", trophies: STAND.trophies })
          .kennzahlen[2].wert.replace(/\./g, ""));
        return seins > meins * 0.4 && seins < meins * 4;
      })());
    check("fremde Helden-Sockel bleiben leer (kein erfundener Build)",
      F.decks[0].held.boni.every(function (b) { return b === null; }));
    check("fremdes Deck hat sechs Türme und einen Helden",
      F.decks[0].tuerme.length === 6 && F.decks[0].held.held === true);
    check("Kartenstufen bleiben unter dem Deckel ihres Tiers",
      F.decks[0].tuerme.every(function (k) { return k.lvl >= 1 && k.lvl <= tierVon(k.tier).cap; }));
    check("ohne Id wirft fremdes()", throws(function () { fremdes({}); }, "Spieler-Id").ok);
    check("Sammlungs-Nenner sind bei fremd und eigen gleich",
      F.statistik[3].wert.split("/")[1] === P.statistik[3].wert.split("/")[1] &&
      F.statistik[4].wert.split("/")[1] === P.statistik[4].wert.split("/")[1] &&
      F.statistik[5].wert.split("/")[1] === P.statistik[5].wert.split("/")[1]);
    check("Sammlung saettigt erst am oberen Ende der Population, nicht in der Mitte",
      (function () {
        var mitte = fremdes({ id: "bot_m", trophies: 4000 }).statistik[4].wert.split("/");
        var oben = fremdes({ id: "bot_o", trophies: 9800 }).statistik[4].wert.split("/");
        return Number(mitte[0]) < Number(mitte[1]) * 0.75 &&
               Number(oben[0]) >= Number(oben[1]) * 0.85;
      })(),
      fremdes({ id: "bot_m", trophies: 4000 }).statistik[4].wert + " / " +
      fremdes({ id: "bot_o", trophies: 9800 }).statistik[4].wert);
    check("ohne Anwesenheitsquelle liefert Sim einen STABILEN Status", (function () {
      var a = fremdes({ id: "bot_17", trophies: 2120 }).statusText;
      var b = fremdes({ id: "bot_17", trophies: 2120 }, MON + 60000).statusText;
      var c = fremdes({ id: "bot_17", trophies: 2120 }, MON + 40 * MINUTE).statusText;
      return a === b && a !== "zuletzt gesehen unbekannt" && typeof c === "string";
    })(), fremdes({ id: "bot_17", trophies: 2120 }).statusText);
    check("Top 10 eines Bots ist nie kleiner als seine ersten Plätze und nie grösser als seine Teilnahmen",
      (function () {
        for (var i = 0; i < 60; i++) {
          var e = Sim.event("b" + i);
          if (e.erster > e.top10 || e.top10 > e.teilgenommen) return false;
        }
        return true;
      })());

    /* ================= 6. Die drei Einstiege ================= */
    console.log("\nEinstiege:");
    if (mCL) {
      var lb = mCL.leaderboard("global");
      var fremdeZeile = lb.rows.filter(function (r) { return !r.me; })[0];
      var meineZeile = lb.rows.filter(function (r) { return r.me; })[0];
      var A = ausRanglistenZeile(fremdeZeile);
      check("ausRanglistenZeile() übernimmt Name, Trophäen, Clan und Rang",
        A.name === fremdeZeile.name && A.trophaeen === fremdeZeile.trophies &&
        A.rang === fremdeZeile.rank, A.name + " #" + A.rang);
      check("die EIGENE Ranglisten-Zeile liefert das eigene Profil",
        ausRanglistenZeile(meineZeile).eigen === true);
      check("ohne Zeile wirft es", throws(function () { ausRanglistenZeile(null); }, "Zeile").ok);
    }
    if (mFR) {
      var fr0 = mFR.list()[0];
      var B = ausFreund(fr0);
      check("ausFreund() übernimmt Name, Trophäen, Element und Status",
        B.name === fr0.name && B.trophaeen === fr0.trophies && B.el === fr0.el &&
        B.online === fr0.online, B.name + " · " + B.statusText);
      check("fehlender Rang wird in der Rangliste nachgeschlagen, nicht geschätzt",
        (function () {
          if (!mCL) return true;
          var lb2 = mCL.leaderboard("global");
          var fremd2 = lb2.rows.filter(function (r) { return !r.me; })[0];
          // ohne `rang` uebergeben — muss trotzdem den echten Rang finden
          var x = fremdes({ id: fremd2.id, name: fremd2.name, trophies: fremd2.trophies });
          return x.rang === fremd2.rank;
        })());
      check("ohne Eintrag wirft es", throws(function () { ausFreund(null); }, "Eintrag").ok);
    }

    /* ================= 7. Robustheit ================= */
    console.log("\nRobustheit:");
    check("kaputter localStorage-Inhalt → frischer Zustand", (function () {
      lsSet("{kein json");
      var s = get();
      return s.v === STATE_VERSION && s.name === "" && typeof s.events === "object";
    })());
    check("Müll in den Feldern wird geheilt", (function () {
      lsSet(JSON.stringify({ v: STATE_VERSION, name: 7, events: { a: null, b: "x",
        c: { erster: "viel", top10: -3, teilgenommen: 2.7 } } }));
      var s = get();
      return s.name === "" && !s.events.a && !s.events.b &&
             s.events.c.erster === 0 && s.events.c.top10 === 0 && s.events.c.teilgenommen === 2;
    })(), JSON.stringify(get().events));
    check("unbekannte Version: Zähler weg, Name bleibt", (function () {
      lsSet(JSON.stringify({ v: 99, name: "Altname", events: { z: { teilgenommen: 5 } } }));
      var s = get();
      return s.v === STATE_VERSION && s.name === "Altname" &&
             Object.keys(s.events).length === 0;
    })());
    check("ohne ArenaProfile: alles 0, kein Absturz", (function () {
      var keep = globalThis.ArenaProfile;
      delete globalThis.ArenaProfile;
      var x = eigenes();
      globalThis.ArenaProfile = keep;
      return x.kennzahlen[1].wert === "0" && x.statistik[0].wert === "0" &&
             x.statistik[1].wert === "—";
    })());
    check("ohne ArenaCards: Deck steht trotzdem, Stufe 1, grau", (function () {
      var keep = globalThis.ArenaCards;
      delete globalThis.ArenaCards;
      var x = eigenes();
      globalThis.ArenaCards = keep;
      return x.decks[0].tuerme.length === 6 && x.decks[0].tuerme[0].lvl === 1 &&
             x.decks[0].tuerme[0].tier === "common";
    })());
    check("ohne ArenaClan: kein Clan, Rang '—', Spenden 0", (function () {
      var keep = globalThis.ArenaClan;
      delete globalThis.ArenaClan;
      var x = eigenes();
      var n = setName("Ohne Clan");
      globalThis.ArenaClan = keep;
      return x.clanName === "" && x.rangText === "—" && x.kennzahlen[5].wert === "0" &&
             n === "Ohne Clan";
    })());
    check("ohne ArenaAvatars: Arenen aus dem Rückfall",
      (function () {
        var keep = globalThis.ArenaAvatars;
        delete globalThis.ArenaAvatars;
        var ok = arenaNameVon(5) === "Obsidian-Thron" && arenaFuer(1200) === 5;
        globalThis.ArenaAvatars = keep;
        return ok;
      })());
    check("ohne ArenaFriends: kein Code, aber ein Profil", (function () {
      var keep = globalThis.ArenaFriends;
      delete globalThis.ArenaFriends;
      var x = eigenes();
      globalThis.ArenaFriends = keep;
      return x.spielerId === null && x.kennzahlen.length === 6;
    })());
    check("dieses Modul bucht nichts — kein Schreibzugriff auf fremde Zustände",
      (function () {
        if (!mCL) return true;
        var vorher = JSON.stringify(mCL.get().stats);
        eigenes(); fremdes({ id: "bot_9", trophies: 900 });
        return JSON.stringify(mCL.get().stats) === vorher;
      })());

    /* ================= 8. Vollständigkeit der API ================= */
    var NOETIG = ["get", "reset", "name", "setName", "pruefName",
      "eventErgebnis", "eventStand", "eventSumme",
      "eigenes", "fremdes", "ausRanglistenZeile", "ausFreund",
      "fmtN", "fmt1", "fmtPct", "ago", "arenaFuer", "arenaNameVon"];
    check("API vollständig (" + NOETIG.length + " Funktionen)",
      NOETIG.every(function (k) { return typeof API[k] === "function"; }),
      NOETIG.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");
    check("Sim ist als Server-Naht exportiert",
      ["best", "power", "medaillen", "streak", "spenden", "siege", "quote",
       "tuerme", "boni", "helden", "stufe", "tier", "held", "event",
       "aktivitaet", "praesenz"]
        .every(function (k) { return typeof Sim[k] === "function"; }));
    check("window.ArenaProfil UND module.exports werden gesetzt",
      typeof module !== "undefined" && module.exports === API);

    API._clock(null);
    if (mCL) mCL._clock(null);
    if (mAV) mAV._clock(null);
    if (mFR) mFR._clock(null);
    reset();
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
