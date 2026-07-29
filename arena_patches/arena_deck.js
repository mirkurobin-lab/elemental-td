/* ==================================================================
 * ARENA DECK — das Battle Deck (Stand 30.07.2026)
 * ------------------------------------------------------------------
 * Ausgemessen am Referenzvideo bei t = 100 s, Maße und Aufbau stehen
 * in AA_UI_REFERENZ.md §24. Kurz:
 *
 *     1 Held   (links, eigene groessere Flaeche)
 *     6 Tuerme (rechts, zwei Reihen a drei)
 *     2 Spells (Sechsecke unter dem Helden)
 *     4 Deck-Plaetze, davon 3 und 4 gesperrt
 *
 * WARUM DAS EIN EIGENES MODUL IST
 * -------------------------------
 * Das Deck ist eine ZWEITE Sicht auf denselben Kartenbestand. Es haelt
 * keine Karten, sondern Verweise. Wer das in die Oberflaeche schreibt,
 * bekommt dort eine Datenhaltung, die niemand pruefen kann — und die
 * beim naechsten Umbau still auseinanderlaeuft. Genau das ist mit dem
 * ×10-Kaufweg passiert (siehe Prüfbericht 30.07.2026).
 *
 * ⚠ KEINE ABHAENGIGKEIT ZU ArenaCards
 * Dieses Modul kennt weder Karten noch Stufen. Es bekommt die Regeln
 * beim Einrichten uebergeben (`konfig({istTurm, istHeld, istSpell,
 * besitzt})`). Zwei Gruende: es ist ohne Browser und ohne Kartenmodul
 * pruefbar, und die Frage „darf diese Karte hier liegen" wird an genau
 * EINER Stelle beantwortet statt an dreien.
 *
 * WIRING
 *   <script src="arena_deck.js"></script>   vor dem Haupt-<script>
 *   ArenaDeck.konfig({
 *     istTurm:  function (id) { return TOWER_IDS.indexOf(id) >= 0; },
 *     istHeld:  function (id) { return HERO_IDS.indexOf(id) >= 0; },
 *     istSpell: function (id) { return AC.isSpell(id); },
 *     besitzt:  function (id) { return AC.view(id).owned; },
 *   });
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaDeck";
  var STATE_VERSION = 1;

  /* ---------- Die Form eines Decks ----------
   * Die Zahlen stehen HIER und nirgends sonst. Die Oberflaeche fragt
   * `ArenaDeck.FORM` ab, statt 6 und 2 noch einmal hinzuschreiben —
   * zwei Stellen mit derselben Zahl laufen auseinander, sobald eine
   * davon sich aendert. */
  var FORM = {
    tuerme: 6,     // AA-Beleg §24.2: zwei Reihen a drei
    helden: 1,
    spells: 2,     // die beiden Sechsecke unter dem Helden
  };
  var ZONEN = ["held", "tuerme", "spells"];

  /* ---------- Deck-Plaetze ----------
   * Vier Stueck, zwei davon gesperrt — wie im Vorbild. Die Sperre ist
   * hier eine reine Aussage ueber den Platz; WORAN sie haengt (Arena,
   * Kauf, Trophaeen) ist noch nicht entschieden und gehoert nicht in
   * dieses Modul. `entsperrt` nimmt die Entscheidung von aussen
   * entgegen, damit sie an einer Stelle faellt, wenn sie faellt. */
  var DECKS = 4;
  var FREI_AB_WERK = 2;

  /* ---------- Regeln von aussen ----------
   * Ohne konfig() gibt es KEINE Zuordnung — dann laesst das Modul
   * nichts zu. Das ist Absicht: ein Deck, das ohne Regeln alles
   * annimmt, faellt erst auf, wenn ein Spell auf einem Turmplatz
   * steht. */
  var R = {
    istTurm:  function () { return false; },
    istHeld:  function () { return false; },
    istSpell: function () { return false; },
    besitzt:  function () { return true; },
  };
  var konfiguriert = false;
  function konfig(o) {
    o = o || {};
    ["istTurm", "istHeld", "istSpell", "besitzt"].forEach(function (k) {
      if (typeof o[k] === "function") R[k] = o[k];
    });
    konfiguriert = true;
    return true;
  }

  /* Welche Zone darf diese Karte belegen? Genau eine — oder keine. */
  function zoneFuer(id) {
    if (!id || typeof id !== "string") return null;
    if (R.istHeld(id)) return "held";
    if (R.istSpell(id)) return "spells";
    if (R.istTurm(id)) return "tuerme";
    return null;
  }

  /* ================= Speicher ================= */
  function lsGet() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return SPEICHER[KEY] || null; }
  }
  function lsSet(v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) { SPEICHER[KEY] = v; }
  }
  var SPEICHER = {};   // Ersatz ausserhalb des Browsers (Selbsttest)

  function leeresDeck() {
    return { held: null, tuerme: new Array(FORM.tuerme).fill(null),
             spells: new Array(FORM.spells).fill(null) };
  }
  function fresh() {
    var d = [];
    for (var i = 0; i < DECKS; i++) d.push(leeresDeck());
    return { v: STATE_VERSION, aktiv: 0, frei: FREI_AB_WERK, decks: d };
  }

  /* normDeck — bringt ein gelesenes Deck in Form.
   * ⚠ Diese Funktion ist der ganze Grund, warum es das Modul gibt.
   * Ein Stand aus dem Speicher kann alles enthalten: zu kurze Listen,
   * geloeschte Karten, einen Spell auf einem Turmplatz, dieselbe Karte
   * zweimal. Jeder dieser Faelle wird hier ZU null, nicht zu einem
   * Fehler — eine Ansicht, die wegen eines alten Standes gar nicht
   * mehr laedt, ist schlimmer als ein leerer Platz. */
  function normDeck(d) {
    var out = leeresDeck();
    if (!d || typeof d !== "object") return out;
    var gesehen = {};
    function nimm(id, zone) {
      if (!id || typeof id !== "string") return null;
      if (zoneFuer(id) !== zone) return null;   // falsche Zone
      if (!R.besitzt(id)) return null;          // nicht (mehr) im Besitz
      if (gesehen[id]) return null;             // dieselbe Karte doppelt
      gesehen[id] = 1;
      return id;
    }
    out.held = nimm(d.held, "held");
    for (var i = 0; i < FORM.tuerme; i++) {
      out.tuerme[i] = nimm(d.tuerme && d.tuerme[i], "tuerme");
    }
    for (var j = 0; j < FORM.spells; j++) {
      out.spells[j] = nimm(d.spells && d.spells[j], "spells");
    }
    return out;
  }

  function get() {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    if (!Array.isArray(s.decks)) s.decks = f.decks;
    /* Auf genau DECKS bringen: fehlende anlegen, ueberzaehlige
       wegwerfen. Ein Stand mit fuenf Decks ist kein Grund, den
       fuenften anzuzeigen — es gibt vier Plaetze. */
    var d = [];
    for (var i = 0; i < DECKS; i++) d.push(normDeck(s.decks[i]));
    s.decks = d;
    s.frei = Math.max(1, Math.min(DECKS, s.frei | 0 || FREI_AB_WERK));
    s.aktiv = Math.max(0, Math.min(s.frei - 1, s.aktiv | 0));
    s.v = STATE_VERSION;
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  /* ================= Lesen ================= */
  function deckAt(i) {
    var s = get();
    i = Math.max(0, Math.min(DECKS - 1, i | 0));
    return s.decks[i];
  }
  function aktivesDeck() { return deckAt(get().aktiv); }
  function aktivIndex() { return get().aktiv; }
  function istFrei(i) { return (i | 0) < get().frei; }
  function freieZahl() { return get().frei; }

  /* Wie viele Plaetze sind belegt — je Zone und gesamt. Das ist die
     Zahl, die im Band steht („4 / 9"), und die Bedingung dafuer, ob
     man ins Match darf. */
  function belegung(i) {
    var d = (i === undefined) ? aktivesDeck() : deckAt(i);
    var t = d.tuerme.filter(Boolean).length;
    var sp = d.spells.filter(Boolean).length;
    var h = d.held ? 1 : 0;
    return { held: h, tuerme: t, spells: sp, belegt: h + t + sp,
             plaetze: FORM.helden + FORM.tuerme + FORM.spells,
             voll: h === FORM.helden && t === FORM.tuerme && sp === FORM.spells };
  }

  /* ================= Schreiben ================= */
  /* setze(zone, pos, id) → {ok, grund}
   * `id === null` raeumt den Platz. Jede Ablehnung nennt ihren Grund;
   * ein stilles `false` waere im UI nicht erklaerbar. */
  function setze(zone, pos, id, deckIdx) {
    if (!konfiguriert) return { ok: false, grund: "unkonfiguriert" };
    if (ZONEN.indexOf(zone) < 0) return { ok: false, grund: "zone" };
    var s = get();
    var di = (deckIdx === undefined) ? s.aktiv : (deckIdx | 0);
    if (di < 0 || di >= DECKS) return { ok: false, grund: "deck" };
    if (di >= s.frei) return { ok: false, grund: "gesperrt" };
    var d = s.decks[di];

    if (zone === "held") {
      if (id !== null && zoneFuer(id) !== "held") return { ok: false, grund: "art" };
      if (id !== null && !R.besitzt(id)) return { ok: false, grund: "besitz" };
      d.held = id;
      save(s);
      return { ok: true, deck: di, zone: zone, pos: 0, id: id };
    }

    var liste = d[zone], n = (zone === "tuerme") ? FORM.tuerme : FORM.spells;
    pos = pos | 0;
    if (pos < 0 || pos >= n) return { ok: false, grund: "platz" };
    if (id === null) { liste[pos] = null; save(s); return { ok: true, deck: di, zone: zone, pos: pos, id: null }; }
    if (zoneFuer(id) !== zone) return { ok: false, grund: "art" };
    if (!R.besitzt(id)) return { ok: false, grund: "besitz" };

    /* ⚠ Steht die Karte schon woanders IN DIESEM DECK, wird getauscht
       statt abgelehnt. Ablehnen waere formal richtig und im Gebrauch
       laestig: wer Karte A auf Platz 3 zieht, obwohl sie auf Platz 1
       liegt, meint „vertausche die beiden" und nicht „geht nicht". */
    var alt = liste.indexOf(id);
    if (alt >= 0 && alt !== pos) {
      liste[alt] = liste[pos];
    }
    liste[pos] = id;
    save(s);
    return { ok: true, deck: di, zone: zone, pos: pos, id: id, getauscht: alt >= 0 };
  }

  function raeume(deckIdx) {
    var s = get();
    var di = (deckIdx === undefined) ? s.aktiv : (deckIdx | 0);
    if (di < 0 || di >= DECKS || di >= s.frei) return false;
    s.decks[di] = leeresDeck();
    save(s);
    return true;
  }

  function waehle(i) {
    var s = get();
    i = i | 0;
    if (i < 0 || i >= s.frei) return { ok: false, grund: i >= s.frei ? "gesperrt" : "deck" };
    s.aktiv = i;
    save(s);
    return { ok: true, aktiv: i };
  }

  /* Deck-Platz freischalten. WORAN das haengt, entscheidet der
     Aufrufer — hier wird nur gebucht. */
  function entsperre(bis) {
    var s = get();
    s.frei = Math.max(s.frei, Math.min(DECKS, bis | 0));
    save(s);
    return s.frei;
  }

  /* ================= Sicht fuers UI ================= */
  /* ansicht(i) → alles, was die Deck-Ansicht braucht, in EINEM Aufruf.
   * `kraft` wird von aussen gereicht (kraftVon), weil die Kraft einer
   * Karte im Kartenmodul steht und hier nichts zu suchen hat. */
  function ansicht(i, kraftVon) {
    var s = get();
    var di = (i === undefined) ? s.aktiv : (i | 0);
    var d = deckAt(di);
    var b = belegung(di);
    var kraft = 0;
    if (typeof kraftVon === "function") {
      if (d.held) kraft += (+kraftVon(d.held) || 0);
      d.tuerme.forEach(function (x) { if (x) kraft += (+kraftVon(x) || 0); });
      d.spells.forEach(function (x) { if (x) kraft += (+kraftVon(x) || 0); });
    }
    return {
      index: di, aktiv: s.aktiv, frei: s.frei, decks: DECKS,
      held: d.held, tuerme: d.tuerme.slice(), spells: d.spells.slice(),
      form: { helden: FORM.helden, tuerme: FORM.tuerme, spells: FORM.spells },
      belegung: b, kraft: Math.round(kraft),
      gesperrt: di >= s.frei,
    };
  }

  /* Alle IDs, die IRGENDWO in diesem Deck liegen — die Sammlung
     markiert damit, was schon ausgeruestet ist. */
  function drin(i) {
    var d = (i === undefined) ? aktivesDeck() : deckAt(i);
    var o = {};
    if (d.held) o[d.held] = "held";
    d.tuerme.forEach(function (x) { if (x) o[x] = "tuerme"; });
    d.spells.forEach(function (x) { if (x) o[x] = "spells"; });
    return o;
  }

  var API = {
    FORM: FORM, ZONEN: ZONEN, DECKS: DECKS,
    konfig: konfig, zoneFuer: zoneFuer,
    get: get, deckAt: deckAt, aktivesDeck: aktivesDeck, aktivIndex: aktivIndex,
    istFrei: istFrei, freieZahl: freieZahl, belegung: belegung,
    setze: setze, raeume: raeume, waehle: waehle, entsperre: entsperre,
    ansicht: ansicht, drin: drin,
    _key: KEY, _reset: function () { save(fresh()); },
  };

  if (typeof window !== "undefined") window.ArenaDeck = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ================= Selbsttest (node arena_patches/arena_deck.js) ==== */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, info) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (info !== undefined ? "  " + info : ""));
      if (!cond) fail++;
    };
    console.log("\n=== ARENA DECK v1 — Selbsttest ===\n");

    /* Kartenwelt fuer den Test. Bewusst KEIN Import von ArenaCards:
       das Modul soll ohne es pruefbar sein, und der Test soll nicht
       rot werden, weil sich dort etwas anderes geaendert hat. */
    var TUERME = ["fire", "water", "nature", "earth", "light", "darkness", "wind", "stone"];
    var HELDEN = ["solara", "magmor"];
    var SPELLS = ["splitter", "bann", "bollwerk", "fokus"];
    var BESITZ = {};
    TUERME.concat(HELDEN, SPELLS).forEach(function (k) { BESITZ[k] = true; });

    konfig({
      istTurm:  function (id) { return TUERME.indexOf(id) >= 0; },
      istHeld:  function (id) { return HELDEN.indexOf(id) >= 0; },
      istSpell: function (id) { return SPELLS.indexOf(id) >= 0; },
      besitzt:  function (id) { return !!BESITZ[id]; },
    });

    console.log("Form (AA-Beleg §24):");
    console.log("  Helden " + FORM.helden + " · Tuerme " + FORM.tuerme +
                " · Spells " + FORM.spells + " · Deck-Plaetze " + DECKS +
                " (frei ab Werk " + FREI_AB_WERK + ")\n");

    /* --- 1. Die Form stimmt mit dem Beleg ueberein --- */
    check("sechs Turmplaetze (AA-Beleg: zwei Reihen a drei)", FORM.tuerme === 6, FORM.tuerme);
    check("ein Heldenplatz", FORM.helden === 1);
    check("zwei Spell-Plaetze", FORM.spells === 2);
    check("vier Deck-Plaetze", DECKS === 4);
    check("zwei davon offen, zwei gesperrt", FREI_AB_WERK === 2);
    API._reset();
    check("ein frisches Deck ist leer",
      belegung().belegt === 0 && belegung().plaetze === 9, belegung().plaetze + " Plaetze");

    /* --- 2. Jede Karte nur in IHRE Zone --- */
    API._reset();
    check("ein Turm darf auf einen Turmplatz", setze("tuerme", 0, "fire").ok);
    check("ein Turm darf NICHT auf den Heldenplatz",
      setze("held", 0, "fire").grund === "art");
    check("ein Turm darf NICHT in ein Spell-Sechseck",
      setze("spells", 0, "fire").grund === "art");
    check("ein Spell darf NICHT auf einen Turmplatz",
      setze("tuerme", 1, "splitter").grund === "art");
    check("ein Spell darf in ein Sechseck", setze("spells", 0, "splitter").ok);
    check("ein Held darf NICHT auf einen Turmplatz",
      setze("tuerme", 1, "solara").grund === "art");
    check("ein Held darf auf den Heldenplatz", setze("held", 0, "solara").ok);
    check("zoneFuer nennt fuer jede Art genau eine Zone",
      zoneFuer("fire") === "tuerme" && zoneFuer("solara") === "held" &&
      zoneFuer("splitter") === "spells" && zoneFuer("gibtsnicht") === null);

    /* --- 3. Grenzen der Plaetze --- */
    API._reset();
    check("Turmplatz 6 gibt es nicht (0-5)", setze("tuerme", 6, "fire").grund === "platz");
    check("Turmplatz -1 gibt es nicht", setze("tuerme", -1, "fire").grund === "platz");
    check("Spell-Platz 2 gibt es nicht (0-1)", setze("spells", 2, "splitter").grund === "platz");
    check("eine unbekannte Zone wird abgelehnt", setze("quatsch", 0, "fire").grund === "zone");

    /* --- 4. Dieselbe Karte nicht zweimal im selben Deck --- */
    API._reset();
    setze("tuerme", 0, "fire");
    var tausch = setze("tuerme", 3, "fire");
    var d4 = aktivesDeck();
    check("dieselbe Karte auf zwei Plaetze legen TAUSCHT statt abzulehnen",
      tausch.ok && tausch.getauscht === true, JSON.stringify(d4.tuerme));
    check("und sie liegt danach nur EINMAL im Deck",
      d4.tuerme.filter(function (x) { return x === "fire"; }).length === 1,
      JSON.stringify(d4.tuerme));
    check("der alte Platz ist frei", d4.tuerme[0] === null);

    /* --- 5. Besitz --- */
    API._reset();
    BESITZ.wind = false;
    check("eine Karte, die man nicht besitzt, kommt nicht ins Deck",
      setze("tuerme", 0, "wind").grund === "besitz");
    BESITZ.wind = true;
    check("mit Besitz geht es", setze("tuerme", 0, "wind").ok);

    /* --- 6. Deck-Plaetze und Sperre --- */
    API._reset();
    check("Deck 1 und 2 sind offen", istFrei(0) && istFrei(1));
    check("Deck 3 und 4 sind gesperrt", !istFrei(2) && !istFrei(3));
    check("auf ein gesperrtes Deck kann man nicht legen",
      setze("tuerme", 0, "fire", 2).grund === "gesperrt");
    check("ein gesperrtes Deck kann man nicht waehlen",
      waehle(2).grund === "gesperrt");
    check("ein offenes Deck kann man waehlen", waehle(1).ok && aktivIndex() === 1);
    check("entsperren macht Deck 3 nutzbar",
      entsperre(3) === 3 && istFrei(2) && setze("tuerme", 0, "fire", 2).ok);
    check("entsperren geht nie ueber die vier Plaetze hinaus", entsperre(99) === 4);

    /* --- 7. Decks sind voneinander unabhaengig --- */
    API._reset();
    setze("tuerme", 0, "fire", 0);
    setze("tuerme", 0, "water", 1);
    check("Deck 1 und Deck 2 halten verschiedene Karten",
      deckAt(0).tuerme[0] === "fire" && deckAt(1).tuerme[0] === "water");
    check("dieselbe Karte darf in ZWEI verschiedenen Decks liegen",
      setze("tuerme", 1, "fire", 1).ok && deckAt(1).tuerme[1] === "fire");

    /* --- 8. Ein kaputter Stand darf die Ansicht nicht sprengen ---
       Genau dafuer gibt es normDeck(). Jeder dieser Faelle war ein
       denkbarer Zustand nach einem Umbau oder einem Kartenverlust. */
    API._reset();
    save({ v: 1, aktiv: 0, frei: 2, decks: [
      { held: "fire",                      // Turm auf dem Heldenplatz
        tuerme: ["splitter", "water"],     // Spell auf Turmplatz + zu kurz
        spells: ["fire", "bann", "fokus"] },  // Turm im Sechseck + zu lang
      null, null, null,
    ] });
    var kaputt = aktivesDeck();
    check("ein Turm auf dem Heldenplatz wird geraeumt", kaputt.held === null);
    check("ein Spell auf einem Turmplatz wird geraeumt", kaputt.tuerme[0] === null);
    check("die gueltige Karte bleibt", kaputt.tuerme[1] === "water");
    check("eine zu kurze Turmliste wird auf sechs aufgefuellt",
      kaputt.tuerme.length === 6, kaputt.tuerme.length);
    check("ein Turm im Sechseck wird geraeumt", kaputt.spells[0] === null);
    check("eine zu lange Spell-Liste wird auf zwei gekuerzt",
      kaputt.spells.length === 2, kaputt.spells.length);
    check("fehlende Decks werden angelegt", get().decks.length === 4);

    API._reset();
    save({ v: 1, aktiv: 0, frei: 2, decks: [
      { held: null, tuerme: ["fire", "fire", "fire", null, null, null], spells: [null, null] },
      null, null, null,
    ] });
    check("dieselbe Karte dreimal im Stand ueberlebt nur einmal",
      aktivesDeck().tuerme.filter(function (x) { return x === "fire"; }).length === 1,
      JSON.stringify(aktivesDeck().tuerme));

    API._reset();
    BESITZ.earth = false;
    save({ v: 1, aktiv: 0, frei: 2, decks: [
      { held: null, tuerme: ["earth", "fire", null, null, null, null], spells: [null, null] },
      null, null, null,
    ] });
    check("eine verlorene Karte faellt aus dem Deck, der Rest bleibt",
      aktivesDeck().tuerme[0] === null && aktivesDeck().tuerme[1] === "fire");
    BESITZ.earth = true;

    API._reset();
    save({ v: 1, aktiv: 3, frei: 2, decks: [null, null, null, null] });
    check("ein aktiver Zeiger auf ein gesperrtes Deck wird zurueckgeholt",
      aktivIndex() === 1, aktivIndex());

    /* --- 9. Ohne konfig() nimmt das Modul NICHTS an ---
       Ein Deck, das ohne Regeln alles annimmt, faellt erst auf, wenn
       ein Spell auf einem Turmplatz steht. */
    (function () {
      var merk = konfiguriert;
      konfiguriert = false;
      check("ohne konfig() wird jede Belegung abgelehnt",
        setze("tuerme", 0, "fire").grund === "unkonfiguriert");
      konfiguriert = merk;
    })();

    /* --- 10. Belegung und Ansicht --- */
    API._reset();
    ["fire", "water", "nature", "earth", "light", "darkness"].forEach(function (id, i) {
      setze("tuerme", i, id);
    });
    setze("held", 0, "solara");
    setze("spells", 0, "splitter");
    var teil = belegung();
    check("sechs Tuerme + Held + ein Spell = 8 von 9",
      teil.belegt === 8 && teil.plaetze === 9 && teil.voll === false,
      teil.belegt + "/" + teil.plaetze);
    setze("spells", 1, "bann");
    check("mit dem zweiten Spell ist das Deck voll", belegung().voll === true);

    var kraftTab = { fire: 100, water: 100, nature: 100, earth: 100, light: 100,
                     darkness: 100, solara: 500, splitter: 50, bann: 50 };
    var an = ansicht(undefined, function (id) { return kraftTab[id] || 0; });
    check("die Ansicht liefert alle Zonen in einem Aufruf",
      an.tuerme.length === 6 && an.spells.length === 2 && an.held === "solara");
    check("die Kraft ist die Summe ueber alle belegten Plaetze",
      an.kraft === 6 * 100 + 500 + 50 + 50, an.kraft);
    check("die Ansicht nennt Form und Sperre mit",
      an.form.tuerme === 6 && an.decks === 4 && an.gesperrt === false);
    var innen = drin();
    check("drin() nennt zu jeder Karte ihre Zone",
      innen.fire === "tuerme" && innen.solara === "held" && innen.splitter === "spells");

    /* --- 11. Raeumen --- */
    check("raeume() leert genau ein Deck",
      raeume() && belegung().belegt === 0 && deckAt(1).tuerme[0] === null);

    /* --- 12. Der Stand ueberlebt das Neulesen --- */
    API._reset();
    setze("tuerme", 2, "nature");
    setze("held", 0, "magmor");
    waehle(1);
    setze("tuerme", 0, "light", 1);
    check("Belegung, Auswahl und zweites Deck ueberleben das Neulesen",
      deckAt(0).tuerme[2] === "nature" && deckAt(0).held === "magmor" &&
      aktivIndex() === 1 && deckAt(1).tuerme[0] === "light");

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
