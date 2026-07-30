/* ==================================================================
 * ARENA OFFLINE — Erträge während der Abwesenheit (30.07.2026)
 * ------------------------------------------------------------------
 * Ausgemessen an den AA-Bildschirmen IMG_3442 (OFFLINE EARNINGS) und
 * IMG_3443 (QUICK EARNINGS):
 *
 *     Deckel      MAX 8H
 *     Raten       1400 Gold/h · 160 XP/h
 *     Ausschuett. 8 h → 11,2 K Gold · 1,2 K XP · 4+4 Karten · 80 Essenz
 *     Ehrlichkeit „You were offline for 8h 14m, but only received
 *                  Offline Earnings for 8h"
 *     Quick       120 Minuten sofort, 3× gratis + 3× für 50 Gems je Tag
 *
 * ⚠ DIESES MODUL WAR EINE ABLEHNUNG
 * GAMEPLAY_OPTIMIERUNG.md §10 hat Offline-Erträge am 25.07.2026
 * ausdrücklich NICHT gebaut, mit drei Gründen. Am 30.07.2026 hat der
 * Auftraggeber sie angefordert („ist im Bau verlorengegangen … muss
 * eingefügt werden"). Die Gründe verschwinden dadurch nicht — zwei
 * davon sind hier KONSTRUKTIV beantwortet, einer bleibt offen:
 *
 *   1. „Gold für Nichtstun entwertet die Siegesserie."
 *      → Die Rate ist eine Stellschraube (RATEN), kein Naturgesetz.
 *        Sie steht an EINER Stelle und ist gegen den Tagesertrag der
 *        Quests gerechnet — siehe dort. Wer sie ändert, sieht sofort,
 *        wogegen.
 *   2. „Drei Popups vor dem ersten Tap."
 *      → Dieses Modul oeffnet NICHTS von selbst. Es beantwortet nur
 *        `bereit()`. Die Oberflaeche zeigt eine Marke am Knopf; ob und
 *        wann ein Fenster aufgeht, entscheidet sie — nicht das Modul.
 *   3. „Quick Earnings braucht Werbung."
 *      → OFFEN. `quick("gratis")` verlangt einen Nachweis von aussen
 *        (`opts.werbungGesehen`). Ohne Werbeanbindung liefert es
 *        `{ok:false, grund:"keine_werbung"}` — ehrlich statt still.
 *
 * ⚠ KEINE ABHAENGIGKEIT ZU ANDEREN MODULEN
 * Kein DOM, kein ArenaCards, kein Wallet. Das Modul RECHNET und BUCHT
 * seinen eigenen Stand; wer die Belohnung wirklich gutschreibt, ist der
 * Aufrufer. Grund: die Zeitrechnung ist der fehleranfaellige Teil und
 * soll ohne Browser pruefbar sein.
 *
 * ⚠ JEDE FUNKTION NIMMT `jetzt` ENTGEGEN
 * Kein `Date.now()` im Inneren. Vier Pruefungen dieses Projekts sind
 * schon einmal an einem einzigen Tag rot geworden, weil sie die Uhr
 * gelesen haben statt einen festgehaltenen Zeitpunkt (pruefungen/README).
 * Bei einem Modul, das NUR aus Zeitrechnung besteht, waere das fatal.
 *
 * WIRING
 *   <script src="arena_offline.js"></script>
 *   ArenaOffline.start(Date.now());        // beim App-Start EINMAL
 *   var st = ArenaOffline.stand(Date.now());
 *   if (st.bereit) { ...Marke am Knopf... }
 *   var r = ArenaOffline.claim(Date.now());  // r.gold, r.xp, r.material...
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaOffline";
  var STATE_VERSION = 1;

  var STUNDE = 3600 * 1000;

  /* ---------- Der Deckel ----------
   * 8 Stunden, wie im Vorbild. Die Zahl ist mehr als eine Obergrenze:
   * sie erzeugt ein weiches Sitzungsraster („zweimal am Tag lohnt,
   * dreimal nicht"). Wer sie auf 24 setzt, macht aus dem Rueckkehrgrund
   * eine Tagesabrechnung — das ist eine Design-Entscheidung, keine
   * Zahlenpflege. */
  var DECKEL_H = 8;

  /* ---------- Die Raten ----------
   * ⚠ HIER sitzt die Antwort auf Einwand 1 aus §10. Zum Vergleich, was
   * ein SPIELENDER Tag bringt (DESIGN_PROGRESSION.md): die Tagesquests
   * schuetten rund 9 000 Gold aus, ein Match traegt je nach Arena
   * 300-900. Ein voller Offline-Deckel liegt mit 8 × 1 100 = 8 800
   * bewusst DARUNTER — Abwesenheit soll einen Spieltag nie schlagen.
   * AA faehrt 1 400/h; wir gehen tiefer, weil Gold bei uns der
   * Endgame-Engpass ist und nicht die Zwischenwaehrung. */
  var RATEN = { gold: 1100, xp: 140 };

  /* Material und Karten laufen NICHT ueber eine Stundenrate, sondern
     ueber Schwellen. Grund: eine Rate von „0,5 Essenz je Stunde" ist
     eine Zahl, die niemand im Kopf nachrechnet, und sie erzeugt bei
     kurzer Abwesenheit Bruchteile. Schwellen sind ehrlich: ab 2 h gibt
     es das erste Stueck, ab 4 h das zweite. */
  var MATERIAL_STUFEN = [
    { ab: 2, menge: 20 }, { ab: 4, menge: 40 }, { ab: 6, menge: 60 }, { ab: 8, menge: 80 },
  ];
  var KARTEN_STUFEN = [
    { ab: 2, menge: 1 }, { ab: 4, menge: 2 }, { ab: 6, menge: 3 }, { ab: 8, menge: 4 },
  ];

  /* ---------- Quick Earnings ----------
   * 120 Minuten sofort, wie im Vorbild. Beide Wege haben ein eigenes
   * Tageskonto — im Bild steht „Remaining: 3" ZWEIMAL, je Knopf. */
  var QUICK_MIN = 120;
  var QUICK_GRATIS_PRO_TAG = 3;
  var QUICK_GEMS_PRO_TAG = 3;
  var QUICK_GEM_PREIS = 50;

  /* ================= Speicher ================= */
  var SPEICHER = {};
  function lsGet() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return SPEICHER[KEY] || null; }
  }
  function lsSet(v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) { SPEICHER[KEY] = v; }
  }

  function fresh(jetzt) {
    return { v: STATE_VERSION, seit: +jetzt || 0, quickMs: 0,
             tag: null, gratisHeute: 0, gemsHeute: 0 };
  }

  /* Tagesschluessel aus einem Zeitpunkt — ORTSZEIT, nicht UTC.
     Ein Tageskonto, das um 01:00 Ortszeit umspringt, ist fuer den
     Spielenden Willkuer. */
  function tagKey(ms) {
    var d = new Date(+ms || 0);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function get(jetzt) {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var f = fresh(jetzt);
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    s.seit = Math.max(0, +s.seit || 0);
    s.quickMs = Math.max(0, +s.quickMs || 0);
    s.gratisHeute = Math.max(0, s.gratisHeute | 0);
    s.gemsHeute = Math.max(0, s.gemsHeute | 0);
    /* Tageswechsel: die beiden Konten laufen zurueck. */
    var heute = tagKey(jetzt);
    if (s.tag !== heute) { s.tag = heute; s.gratisHeute = 0; s.gemsHeute = 0; }
    s.v = STATE_VERSION;
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  /* start(jetzt) — beim App-Start EINMAL aufrufen.
   * Setzt den Zeitstempel nur, wenn es noch keinen gibt. Ein zweiter
   * Aufruf darf die angesammelte Zeit NICHT wegwerfen — genau das ist
   * der Fehler, der bei so einem Modul am haeufigsten passiert. */
  function start(jetzt) {
    var s = get(jetzt);
    if (!s.seit) { s.seit = +jetzt || 0; save(s); }
    return s.seit;
  }

  /* ================= Rechnen ================= */
  function stufenWert(stufen, stunden) {
    var w = 0;
    for (var i = 0; i < stufen.length; i++) if (stunden >= stufen[i].ab) w = stufen[i].menge;
    return w;
  }

  /* stand(jetzt) → was gerade bereitliegt.
   * `abwesendH` ist die WIRKLICHE Abwesenheit, `gutH` die angerechnete.
   * Beide werden zurueckgegeben, damit die Oberflaeche den ehrlichen
   * Satz aus dem Vorbild bilden kann: „8h 14m offline, angerechnet 8h".
   * Eine Zahl, die beides koennen soll, kann es nicht. */
  function stand(jetzt) {
    var s = get(jetzt);
    var seit = s.seit || +jetzt || 0;
    var msRoh = Math.max(0, (+jetzt || 0) - seit);
    var msGesamt = msRoh + s.quickMs;
    var deckelMs = DECKEL_H * STUNDE;
    var msGut = Math.min(msGesamt, deckelMs);
    var abwesendH = msRoh / STUNDE;
    var gutH = msGut / STUNDE;

    var gold = Math.floor(RATEN.gold * gutH);
    var xp = Math.floor(RATEN.xp * gutH);
    var material = stufenWert(MATERIAL_STUFEN, gutH);
    var karten = stufenWert(KARTEN_STUFEN, gutH);

    return {
      abwesendMs: msRoh, abwesendH: abwesendH,
      quickMs: s.quickMs,
      gutMs: msGut, gutH: gutH,
      gedeckelt: msGesamt > deckelMs,
      deckelH: DECKEL_H, voll: msGut >= deckelMs,
      raten: { gold: RATEN.gold, xp: RATEN.xp },
      gold: gold, xp: xp, material: material, karten: karten,
      /* `bereit` ist die Frage, die die Marke am Knopf beantwortet.
         Unter einer Minute ist nichts da — sonst leuchtet die Marke
         schon, waehrend man noch im Menue steht. */
      bereit: msGut >= 60 * 1000 && gold > 0,
      quick: quickStand(jetzt, s),
    };
  }

  function quickStand(jetzt, s) {
    s = s || get(jetzt);
    var minuten = QUICK_MIN, h = minuten / 60;
    return {
      minuten: minuten,
      gold: Math.floor(RATEN.gold * h), xp: Math.floor(RATEN.xp * h),
      material: Math.round(MATERIAL_STUFEN[0].menge * (h / MATERIAL_STUFEN[0].ab)),
      karten: 1,
      gratisOffen: Math.max(0, QUICK_GRATIS_PRO_TAG - s.gratisHeute),
      gemsOffen: Math.max(0, QUICK_GEMS_PRO_TAG - s.gemsHeute),
      gemPreis: QUICK_GEM_PREIS,
    };
  }

  /* ================= Buchen ================= */
  /* claim(jetzt) → die Belohnung, und der Zaehler startet neu.
   * ⚠ Der Zeitstempel wird auf `jetzt` gesetzt, NICHT um die
   * angerechnete Zeit zurueckgedreht. Wer 20 h weg war und 8 h
   * bekommt, faengt bei null an — sonst haette er nach dem Abholen
   * sofort wieder 12 h auf dem Konto und der Deckel waere wirkungslos. */
  function claim(jetzt) {
    var st = stand(jetzt);
    if (!st.bereit) return { ok: false, grund: "nichts_da", stand: st };
    var s = get(jetzt);
    s.seit = +jetzt || 0;
    s.quickMs = 0;
    save(s);
    return { ok: true, gold: st.gold, xp: st.xp, material: st.material,
             karten: st.karten, gutH: st.gutH, gedeckelt: st.gedeckelt,
             abwesendH: st.abwesendH };
  }

  /* quick(art, jetzt, opts) → legt QUICK_MIN Minuten auf das Konto.
   *   art "gratis" braucht opts.werbungGesehen === true
   *   art "gems"   braucht opts.gems >= QUICK_GEM_PREIS
   * Gebucht wird NUR die Zeit; die Gems zieht der Aufrufer ab — dieses
   * Modul fasst keine Waehrung an. */
  function quick(art, jetzt, opts) {
    opts = opts || {};
    var s = get(jetzt);
    if (art === "gratis") {
      if (s.gratisHeute >= QUICK_GRATIS_PRO_TAG) return { ok: false, grund: "aufgebraucht" };
      /* ⚠ Ohne Werbeanbindung gibt es hier NICHTS umsonst. Das ist der
         offene Punkt 3 aus §10 — sichtbar als Ablehnung statt als
         stille Gutschrift. */
      if (opts.werbungGesehen !== true) return { ok: false, grund: "keine_werbung" };
      s.gratisHeute++;
    } else if (art === "gems") {
      if (s.gemsHeute >= QUICK_GEMS_PRO_TAG) return { ok: false, grund: "aufgebraucht" };
      if ((opts.gems | 0) < QUICK_GEM_PREIS) return { ok: false, grund: "gems" };
      s.gemsHeute++;
    } else {
      return { ok: false, grund: "art" };
    }
    s.quickMs += QUICK_MIN * 60 * 1000;
    save(s);
    return { ok: true, art: art, minuten: QUICK_MIN,
             gemKosten: art === "gems" ? QUICK_GEM_PREIS : 0,
             stand: stand(jetzt) };
  }

  var API = {
    DECKEL_H: DECKEL_H, RATEN: RATEN, QUICK_MIN: QUICK_MIN,
    QUICK_GEM_PREIS: QUICK_GEM_PREIS,
    QUICK_GRATIS_PRO_TAG: QUICK_GRATIS_PRO_TAG, QUICK_GEMS_PRO_TAG: QUICK_GEMS_PRO_TAG,
    MATERIAL_STUFEN: MATERIAL_STUFEN, KARTEN_STUFEN: KARTEN_STUFEN,
    start: start, stand: stand, claim: claim, quick: quick,
    _key: KEY, _reset: function (jetzt) { save(fresh(jetzt)); },
    _setSeit: function (ms) { var s = get(ms); s.seit = +ms || 0; save(s); },
  };

  if (typeof window !== "undefined") window.ArenaOffline = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ================= Selbsttest (node arena_offline.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, info) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (info !== undefined ? "  " + info : ""));
      if (!cond) fail++;
    };
    console.log("\n=== ARENA OFFLINE v1 — Selbsttest ===\n");
    /* ⚠ EIN festgehaltener Zeitpunkt fuer den ganzen Lauf. Kein
       Date.now(). 12:00 Ortszeit, damit +8 h nicht ueber Mitternacht
       laeuft und den Tageswechsel ausloest. */
    var T0 = new Date(2026, 6, 30, 12, 0, 0).getTime();
    var H = 3600 * 1000;

    console.log("Deckel " + DECKEL_H + " h · " + RATEN.gold + " Gold/h · " +
                RATEN.xp + " XP/h · Quick " + QUICK_MIN + " min\n");

    /* --- 1. Die Rechnung --- */
    API._reset(T0); start(T0);
    check("frisch gestartet liegt nichts bereit", !stand(T0).bereit);
    check("nach 1 h: 1 100 Gold, 140 XP",
      stand(T0 + H).gold === 1100 && stand(T0 + H).xp === 140,
      stand(T0 + H).gold + "/" + stand(T0 + H).xp);
    check("nach 4 h: das Vierfache", stand(T0 + 4 * H).gold === 4400);
    check("nach 8 h steht der Deckel",
      stand(T0 + 8 * H).gold === 8800 && stand(T0 + 8 * H).voll === true);
    check("nach 20 h steht IMMER NOCH der Deckel",
      stand(T0 + 20 * H).gold === 8800, stand(T0 + 20 * H).gold);
    check("und das Modul sagt, dass gedeckelt wurde",
      stand(T0 + 20 * H).gedeckelt === true);
    check("die WIRKLICHE Abwesenheit bleibt getrennt sichtbar",
      Math.round(stand(T0 + 20 * H).abwesendH) === 20 &&
      stand(T0 + 20 * H).gutH === 8,
      stand(T0 + 20 * H).abwesendH.toFixed(1) + " h offline / " +
      stand(T0 + 20 * H).gutH + " h angerechnet");

    /* --- 2. Material und Karten laufen ueber Schwellen --- */
    API._reset(T0); start(T0);
    check("unter 2 h gibt es kein Material", stand(T0 + 1.9 * H).material === 0);
    check("ab 2 h die erste Stufe", stand(T0 + 2 * H).material === 20);
    check("ab 4 h die zweite", stand(T0 + 4 * H).material === 40);
    check("ab 8 h die letzte", stand(T0 + 8 * H).material === 80);
    check("der Deckel gilt auch fuer Material", stand(T0 + 50 * H).material === 80);
    check("Karten laufen mit: 0/1/2/3/4",
      stand(T0 + 1 * H).karten === 0 && stand(T0 + 2 * H).karten === 1 &&
      stand(T0 + 4 * H).karten === 2 && stand(T0 + 8 * H).karten === 4);

    /* --- 3. Die Marke --- */
    API._reset(T0); start(T0);
    check("unter einer Minute leuchtet die Marke NICHT",
      stand(T0 + 30 * 1000).bereit === false);
    check("nach einer Stunde leuchtet sie", stand(T0 + H).bereit === true);

    /* --- 4. Abholen --- */
    API._reset(T0); start(T0);
    var r = claim(T0 + 5 * H);
    check("claim liefert die Belohnung", r.ok && r.gold === 5500 && r.material === 40,
      r.gold + " Gold / " + r.material + " Material");
    check("danach ist das Konto leer", stand(T0 + 5 * H).gold === 0);
    check("und faengt neu an zu laufen", stand(T0 + 6 * H).gold === 1100);
    check("zweimal abholen ohne Zeit dazwischen geht nicht",
      claim(T0 + 6 * H).ok === true && claim(T0 + 6 * H).grund === "nichts_da");

    /* ⚠ Der wichtigste Schritt des Abschnitts: wer 20 h weg war und 8 h
       bekommt, faengt bei NULL an — nicht bei 12 h. Sonst waere der
       Deckel wirkungslos und die Abwesenheit doch wieder voll bezahlt. */
    API._reset(T0); start(T0);
    claim(T0 + 20 * H);
    check("nach dem Abholen ist der Ueberhang WEG, nicht gutgeschrieben",
      stand(T0 + 20 * H).gold === 0 && stand(T0 + 21 * H).gold === 1100,
      stand(T0 + 21 * H).gold + " nach einer weiteren Stunde");

    /* --- 5. Quick Earnings --- */
    API._reset(T0); start(T0);
    var q0 = stand(T0).quick;
    check("Quick zeigt 120 Minuten", q0.minuten === 120);
    check("und den Gegenwert von zwei Stunden",
      q0.gold === 2200 && q0.xp === 280, q0.gold + "/" + q0.xp);
    check("beide Konten stehen auf drei",
      q0.gratisOffen === 3 && q0.gemsOffen === 3);
    check("ohne Werbenachweis gibt es NICHTS gratis",
      quick("gratis", T0).grund === "keine_werbung");
    check("mit Werbenachweis schon",
      quick("gratis", T0, { werbungGesehen: true }).ok === true);
    check("die 120 Minuten liegen sofort auf dem Konto",
      stand(T0).gold === 2200, stand(T0).gold);
    check("das Gratis-Konto zaehlt runter", stand(T0).quick.gratisOffen === 2);
    check("ohne genug Gems geht der Kauf nicht",
      quick("gems", T0, { gems: 49 }).grund === "gems");
    check("mit genug Gems schon", quick("gems", T0, { gems: 50 }).ok === true);
    check("und beide Konten sind getrennt",
      stand(T0).quick.gratisOffen === 2 && stand(T0).quick.gemsOffen === 2);
    check("jetzt liegen vier Stunden auf dem Konto",
      stand(T0).gold === 4400, stand(T0).gold);
    check("eine unbekannte Art wird abgelehnt", quick("quatsch", T0).grund === "art");

    API._reset(T0); start(T0);
    for (var i = 0; i < QUICK_GRATIS_PRO_TAG; i++) quick("gratis", T0, { werbungGesehen: true });
    check("nach drei Gratis-Nutzungen ist Schluss",
      quick("gratis", T0, { werbungGesehen: true }).grund === "aufgebraucht");
    check("der Gem-Weg ist davon unberuehrt",
      quick("gems", T0, { gems: 99 }).ok === true);

    /* Quick kann den Deckel NICHT sprengen. */
    API._reset(T0); start(T0);
    quick("gems", T0 + 8 * H, { gems: 99 });
    check("Quick hebt den 8-h-Deckel NICHT auf",
      stand(T0 + 8 * H).gold === 8800, stand(T0 + 8 * H).gold);

    /* --- 6. Tageswechsel --- */
    API._reset(T0); start(T0);
    quick("gratis", T0, { werbungGesehen: true });
    quick("gems", T0, { gems: 99 });
    check("am selben Tag bleiben die Konten stehen",
      stand(T0 + H).quick.gratisOffen === 2 && stand(T0 + H).quick.gemsOffen === 2);
    var MORGEN = new Date(2026, 6, 31, 12, 0, 0).getTime();
    check("am naechsten Tag stehen beide wieder auf drei",
      stand(MORGEN).quick.gratisOffen === 3 && stand(MORGEN).quick.gemsOffen === 3);

    /* --- 7. start() darf nichts wegwerfen --- */
    API._reset(T0); start(T0);
    start(T0 + 3 * H);   // zweiter Aufruf, z. B. nach einem Reload
    check("ein zweiter start() wirft die gesammelte Zeit NICHT weg",
      stand(T0 + 3 * H).gold === 3300, stand(T0 + 3 * H).gold);

    /* --- 8. Kaputte Staende --- */
    API._reset(T0);
    save({ v: 1, seit: "quatsch", quickMs: -500, gratisHeute: -3, gemsHeute: 99, tag: null });
    var kaputt = stand(T0);
    check("ein kaputter Stand sprengt die Rechnung nicht",
      kaputt.gold >= 0 && kaputt.quickMs === 0 &&
      kaputt.quick.gratisOffen >= 0 && kaputt.quick.gemsOffen >= 0,
      JSON.stringify({ gold: kaputt.gold, gratis: kaputt.quick.gratisOffen }));
    check("eine Zeit aus der Zukunft ergibt kein negatives Guthaben",
      (function () { API._reset(T0); API._setSeit(T0 + 5 * H); return stand(T0).gold === 0; })());

    /* --- 9. Die Rate bleibt unter einem Spieltag --- */
    check("ein voller Deckel bleibt unter dem Tagesertrag der Quests (9 000)",
      DECKEL_H * RATEN.gold < 9000, DECKEL_H * RATEN.gold + " gegen 9 000");

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
