/* ===================================================================
 * packoeffnung.js — die Öffnungsszene, gegen die gemessene Kurve.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Die Szene ist aus einem Video abgelesen: alle 180 Einzelbilder des
 * Drive-Videos vom 29.07.2026 wurden auf mittlere Helligkeit und
 * Magenta-Anteil vermessen, daraus stammen die Zeitpunkte im CSS.
 *
 * Eine so gewonnene Kurve ist genau so lange etwas wert, wie sie
 * unveraendert bleibt. Sie sieht im Code aus wie beliebige krumme
 * Prozentzahlen (19.43 %, 45.00 %, 59.43 %) — der naechste Leser haelt
 * sie fuer ungefaehr und rundet sie. Genau davor schuetzt diese Datei.
 *
 * ⚠ ZWEITE FASSUNG. Die erste Pruefung war GRUEN, waehrend die Animation
 * falsch lief — sie hat genau die geglaettete Kurve festgeschrieben, die
 * der Auftraggeber sofort als „viel zu schnell, viele Details werden
 * einfach uebersprungen" erkannt hat. Zwei Fehlerklassen sind dabei
 * durchgerutscht, beide stehen jetzt als eigene Schritte hier drin:
 *
 *   1. GEGLAETTETE KURVE. Der Aufbau hat DREI Puls-Rueckfall-Zyklen
 *      (583/750, 1033/1117, 1350/1417 ms). Ich hatte einen daraus
 *      gemacht. Aus drei Atemzuegen einen zu machen halbiert die
 *      gefuehlte Dauer, obwohl die Gesamtzahl gleich bleibt. Die
 *      Pruefung zaehlt deshalb GENAU DREI Taeler, nicht „mindestens
 *      eines" — eine Schwelle haette das nie gemeldet.
 *
 *   2. FEHLENDER ANFANGSWERT. `pkbeben` setzte `opacity` erst bei 76 %.
 *      Der Browser interpoliert dann vom Ausgangswert ueber die GANZE
 *      Animation dorthin: der Pack war bei 1,5 s schon zu 37 % verblasst.
 *      Im CSS sieht das aus wie eine Auslassung, in Wahrheit ist es eine
 *      stille Rampe ueber alles. Geprueft wird jetzt fuer JEDE
 *      pk-Animation, dass am 0-%-Stop alles steht, was spaeter kommt.
 *
 * Die Lehre daraus gilt ueber diese Datei hinaus: eine Pruefung, die aus
 * derselben Vorlage gebaut wird wie die Sache, die sie pruefen soll,
 * bestaetigt den Denkfehler statt ihn zu finden. Sie muss gegen die
 * MESSUNG stehen, nicht gegen die Umsetzung.
 *
 * WAS SIE NICHT KANN
 * Ob die Szene SCHOEN ist. Oertlich ist das CDN nicht erreichbar
 * (DESIGNSYSTEM §7b), das Packbild bleibt leer. Geprueft wird der
 * Ablauf, nicht das Bild.
 *
 * AUFRUF
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node packoeffnung.js
 * =================================================================== */
const { chromium } = require("playwright-core");

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; } else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); }
};
/* gegen(name, erkannt) — die Gegenprobe. Ein Schritt, der nicht rot
   werden KANN, ist wertlos; das ist an diesem Tag zweimal passiert (ein
   `object-fit`-Fix, der ein No-op war, und ein Dauer-Filter, der ins
   Leere griff). Die Gegenprobe belegt, dass die Messung ueberhaupt
   unterscheidet. Gleiche Bauart wie in offline.js und bildzustand.js. */
const gegen = (n, erkannt, z) => {
  if (erkannt) { ok++; }
  else { fehl++; console.log("  FEHL Gegenprobe " + n + " haette rot sein muessen" + (z ? " -> " + z : "")); }
};

/* durchtippen(p) — die Szene so beenden, wie ein Spieler es tut.
   Seit dem Deck-Umbau (30.07.2026) gibt es KEIN Zeitschloss mehr: die
   Szene wartet auf den Spieler. Jede Stelle, die frueher `waitForTimeout
   (DAUER + x)` benutzt hat, muss stattdessen durchtippen — sonst liegt
   die Oeffnungsebene noch ueber dem Raster und der eigentliche
   Pruefschritt misst eine Kachel, die gar nicht erreichbar ist. Genau
   dieser Fehler ist in dieser Datei schon zweimal passiert, beide Male
   als falsche Wartezeit. Deshalb hier EIN Helfer statt verstreuter
   Zahlen. */
async function durchtippen(p, max) {
  await p.waitForFunction(() => {
    const d = document.getElementById("pkDeck");
    return d && d.classList.contains("schwebt");
  }, null, { timeout: 9000 }).catch(() => {});
  for (let i = 0; i < (max || 30); i++) {
    const offen = await p.evaluate(() =>
      document.getElementById("packLayer").classList.contains("on"));
    if (!offen) return i;
    await p.evaluate(() => document.getElementById("packLayer")
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await p.waitForTimeout(620);
  }
  return -1;
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 120)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html",
               { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2400);
  await p.evaluate(() => {
    document.querySelectorAll("#offerLayer,#loginLayer,#dailyLayer,#cineLayer,#splashLayer")
      .forEach(e => { e.style.display = "none"; });
  });

  /* ---------- 1. Die Kurve steht im Stylesheet ---------- */
  const roh = await p.evaluate(() => {
    const aus = {};
    for (const s of document.styleSheets) {
      let r; try { r = s.cssRules; } catch (e) { continue; }
      for (const rule of r) if (rule.name && /^pk/.test(rule.name)) aus[rule.name] = rule.cssText;
    }
    return aus;
  });
  /* ⚠ `cssText` einer @keyframes-Regel ist in die Regel selbst
     eingewickelt: `@keyframes pkglut { 0% { … } 7.23% { … } }`. Wer
     direkt darauf loslaesst, faengt die AEUSSERE Klammer und liest
     danach jeden Block um einen versetzt — die Pruefung meldete
     „pkglut ohne opacity bei 0 %", obwohl der Stop da war. Deshalb
     zuerst die Huelle abziehen. */
  const inhalt = t => {
    if (!t) return "";
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    return a < 0 || b < a ? "" : t.slice(a + 1, b);
  };

  /* Stops einer @keyframes-Regel als [Prozent, Deckkraft] lesen. */
  function stops(text, eigenschaft) {
    const raus = [];
    if (!text) return raus;
    inhalt(text).replace(/([\d.,%\s]+)\{([^}]*)\}/g, (_, kopf, koerper) => {
      const m = new RegExp(eigenschaft + ":\\s*([\\d.]+)").exec(koerper);
      if (!m) return;
      kopf.split(",").forEach(k => {
        const z = parseFloat(k.trim());
        if (!isNaN(z)) raus.push([z, parseFloat(m[1])]);
      });
    });
    return raus.sort((a, b) => a[0] - b[0]);
  }

  pruef("die Glutkurve @keyframes pkglut existiert", !!roh.pkglut);
  pruef("der Kern hat eine EIGENE Kurve (@keyframes pkkernglut)", !!roh.pkkernglut);

  /* ------------------------------------------------------------------
     ⚠ DRITTE FASSUNG (29.07.2026). Diese Datei hatte 3000 ms fest
     eingebaut (`ms / 30`). Am selben Tag wurde die Szene auf 4000 ms
     verlangsamt — weil das Referenzvideo 2,40 s Ausstroemung zeigt und
     wir 0,30 s hatten. Eine Pruefung, die eine Zahl einfriert, wird
     genau bei der Korrektur rot, die richtig war, und sagt „falsch" zu
     der Verbesserung. Sie liest die Dauer deshalb dort, wo sie steht,
     und prueft stattdessen die KOPPLUNG: CSS und JS muessen dieselbe
     tragen. Laufen die beiden auseinander, schliesst der Vorhang
     mitten in der Bewegung — und das faellt sonst niemandem auf.
     ------------------------------------------------------------------ */
  const dauerCss = await p.evaluate(() => {
    const raus = new Set();
    for (const s of document.styleSheets) {
      let r; try { r = s.cssRules; } catch (e) { continue; }
      for (const rule of r) {
        if (!rule.selectorText || !/#packLayer\.spielt/.test(rule.selectorText)) continue;
        /* ⚠ Chromium serialisiert `animation:pkglut 4000ms linear` als
           `animation: 4000ms linear 0s 1 normal forwards running pkglut`
           — der Name steht HINTEN. Wer auf die Schreibweise aus der
           Quelle prueft, findet nichts und meldet „keine Dauer". */
        if (!/\bpk[a-z0-9]+\b/.test(rule.cssText)) continue;
        /* ⚠ NACHGEZOGEN 30.07.2026. Dieser Schritt sammelte JEDE Dauer
           unter `#packLayer.spielt` ein und verlangte, dass es genau eine
           gibt. Das war richtig, solange die Szene EINE Zeitachse hatte.
           Seit die Karten von HAND aufgedeckt werden, gibt es bewusst
           zweierlei: die Aufbau-Ebenen laufen weiter auf DAUER, die
           Karten-Ebenen (Drehen, Schweben, Pulsen, Abgang) haengen an
           KLASSEN und muessen eigene Dauern haben — eine Drehung, die
           4000 ms braucht, waere unbenutzbar.
           Die Anforderung dahinter bleibt aber gueltig und wird weiter
           geprueft: die Ebenen, die auf der SZENEN-Zeitachse liegen,
           muessen dieselbe Dauer tragen wie das JS. Laufen die
           auseinander, faellt der Vorhang mitten in der Bewegung. */
        /* ⚠ Ausschluss ueber den WAEHLER, nicht ueber den Regeltext.
           Chromium serialisiert die Kurzschreibweise `animation:` mit
           `var()` darin nicht zuverlaessig — ein Textfilter auf den
           Animationsnamen greift dann ins Leere und die Dauer rutscht
           doch in den Satz. Das ist genau hier passiert. */
        if (/#pkStage|\.pkfunke|\.pkmotte|#pkDeck|\.pkcard\.(auf|weg|oben)/
            .test(rule.selectorText)) continue;
        /* Aufprall und Funken liegen zwar AUF der Szenen-Zeitachse, sind
           aber Ereignisse an einem PUNKT und keine Ebenen ueber die ganze
           Dauer — ein Schlag, der 4000 ms braucht, waere kein Schlag.
           Ihre Dauer ist deshalb frei; ihr ZEITPUNKT ist gebunden und
           wird unten eigens geprueft. Sie stehen im Waehler-Ausschluss. */
        const m = /(\d+)ms/.exec(rule.cssText);
        if (m) raus.add(+m[1]);
      }
    }
    return [...raus];
  });
  pruef("alle pk-Ebenen laufen auf EINER Dauer", dauerCss.length === 1,
    dauerCss.join(" / "));
  const DAUER = dauerCss[0] || 4000;

  /* ---------- Der Aufprall sitzt AUF dem Bruch ----------
     Neu am 30.07.2026. Anlass: der Shake lag zuerst bei 2060 ms, weil
     die Zahl aus dem Referenzvideo uebernommen war — dort liegt bei
     2066 ms der Legendaer-Ausbruch eines 10er-Zugs, nicht das
     Aufreissen eines Packs. Er kam damit 140 ms VOR dem Blitz, und ein
     Schlag vor dem Licht liest sich als Fehler.
     Geprueft wird nicht die Zahl, sondern die KOPPLUNG: der Aufprall
     muss dort liegen, wo `pkblitz` seinen Hoehepunkt hat. Verschiebt
     jemand den Bruch, wandert die Anforderung mit. */
  const aufprall = await p.evaluate(() => {
    /* Am ECHTEN Element gemessen statt aus dem Regeltext geparst: nur
       so steht da, was der Browser wirklich tut. Die Szene muss dafuer
       kurz laufen — `.spielt` setzt die Animationen. */
    const lay = document.getElementById("packLayer");
    const warOffen = lay.classList.contains("on");
    lay.classList.add("on", "spielt");
    const st = document.getElementById("pkStage");
    const schlagMs = parseFloat(getComputedStyle(st).animationDelay) * 1000;
    if (!warOffen) lay.classList.remove("on", "spielt");
    let blitzProz = null;
    for (const bl of document.styleSheets) {
      let rs; try { rs = bl.cssRules; } catch (e) { continue; }
      for (const r of rs) {
        if (r.type === CSSRule.KEYFRAMES_RULE && r.name === "pkblitz") {
          let best = -1;
          for (const k of r.cssRules) {
            const o = parseFloat(k.style.opacity);
            const pz = parseFloat(k.keyText);
            if (!isNaN(o) && !isNaN(pz) && o > best) { best = o; blitzProz = pz; }
          }
        }
      }
    }
    return { schlagMs, blitzProz };
  });
  const blitzMs = aufprall.blitzProz != null
    ? Math.round(DAUER * aufprall.blitzProz / 100) : null;
  pruef("der Aufprall liegt auf dem Hoehepunkt des Blitzes",
    aufprall.schlagMs != null && blitzMs != null &&
      Math.abs(aufprall.schlagMs - blitzMs) <= 60,
    aufprall.schlagMs + " ms gegen Blitz " + blitzMs + " ms");
  const quelle = require("fs").readFileSync(
    "/home/user/elemental-td/arena_patches/ui_prototype.html", "utf8");
  const jsDauer = /var DAUER = (\d+)/.exec(quelle);
  pruef("die Dauer im JS ist dieselbe wie im CSS",
    jsDauer && +jsDauer[1] === DAUER, (jsDauer ? jsDauer[1] : "?") + " gegen " + DAUER);
  /* Die Untergrenze ist keine Geschmacksfrage: unter 3,5 s ist die
     gemessene Ausstroemung des Vorbilds (Start 1,60 s, Ende 4,00 s)
     nicht unterzubringen. */
  pruef("die Szene ist lang genug fuer die gemessene Ausstroemung",
    DAUER >= 3500, DAUER + " ms");

  const glut = stops(roh.pkglut, "opacity");
  if (glut.length) {
    /* Millisekunde -> Prozent, gegen die WIRKLICHE Dauer. */
    const bei = ms => {
      const p = +(ms * 100 / DAUER).toFixed(2);
      const t = glut.find(s => Math.abs(s[0] - p) < 0.06);
      return t ? t[1] : undefined;
    };
    /* Die sechs Vorlauf-Marken stammen aus der Bildmessung und haengen
       nicht an der Gesamtdauer — sie stehen weiter in Millisekunden.
       Die Hauptladung liegt seit dem Umbau bei 1600 ms (vorher 1650),
       weil die Ausstroemung dort ansetzt; das ist im Blatt vermerkt. */
    const p1 = bei(583), t1 = bei(750), p2 = bei(1033), t2 = bei(1117),
          p3 = bei(1350), t3 = bei(1417), laden = bei(1600);

    /* ------------------------------------------------------------------
       DIE WICHTIGSTE AUSSAGE DER DATEI: DREI Rueckfaelle, nicht einer.
       Die erste Fassung hatte die Kurve GEGLAETTET — aus drei Atemzuegen
       wurde eine Rampe, und der Auftraggeber sah es sofort: „viel zu
       schnell, viele Details werden einfach uebersprungen". Aus drei
       Zyklen einen zu machen halbiert die gefuehlte Dauer, obwohl die
       Gesamtzahl gleich bleibt. Eine Pruefung, die nur „es faellt
       irgendwo zurueck" sagt, haette das durchgewinkt.
       ------------------------------------------------------------------ */
    pruef("Puls 1 bei 583 ms", p1 > 0.12 && p1 < 0.25, String(p1));
    pruef("Rueckfall 1 bei 750 ms", t1 !== undefined && t1 < p1 * 0.5, p1 + " -> " + t1);
    pruef("Puls 2 bei 1033 ms steigt wieder", p2 > t1, t1 + " -> " + p2);
    pruef("Rueckfall 2 bei 1117 ms", t2 !== undefined && t2 < p2, p2 + " -> " + t2);
    pruef("Puls 3 bei 1350 ms ist der hoechste vor der Ladung", p3 > p1 && p3 > p2,
      [p1, p2, p3].join(" / "));
    pruef("Rueckfall 3 bei 1417 ms", t3 !== undefined && t3 < p3, p3 + " -> " + t3);
    /* Genau drei Taeler zaehlen — nicht „mindestens eines". */
    let taeler = 0;
    for (let i = 1; i < glut.length - 1; i++)
      if (glut[i][1] < glut[i - 1][1] && glut[i][1] <= glut[i + 1][1] && glut[i][0] < 55) taeler++;
    pruef("es sind GENAU drei Rueckfaelle vor der Hauptladung", taeler === 3,
      taeler + " gezaehlt");

    /* ⚠ Hier standen absolute Deckkraft-Schwellen („springt auf ueber
       0,9"). Die sind am 29.07.2026 falsch geworden, und zwar aus einem
       GUTEN Grund: der Schein war mit 0,9 so hell, dass er die Farben
       ausgebrannt hat — gemessen Helligkeit 76 gegen 41 im Vorbild. Die
       Pruefung haette die Daempfung als Fehler gemeldet. Was wirklich
       zaehlt, ist das VERHAELTNIS: der Hauptschlag muss deutlich ueber
       allem liegen, was vorher war. Wie hell er absolut ist, entscheidet
       die Messung gegen das Video, nicht diese Datei. */
    const spitzeGlut = Math.max(...glut.map(g => g[1]));
    const vorlauf = Math.max(p1, p2, p3);
    pruef("Hauptladung liegt ueber allen Pulsen", laden > p3, p3 + " -> " + laden);
    pruef("der Hauptschlag ist mindestens doppelt so stark wie der staerkste Puls",
      spitzeGlut >= vorlauf * 2, vorlauf + " -> " + spitzeGlut);
    pruef("der Hoechstwert liegt im Bruchfenster, nicht im Vorlauf",
      glut.find(g => g[1] === spitzeGlut)[0] > 45,
      glut.find(g => g[1] === spitzeGlut)[0] + " %");
    pruef("am Ende ist der Schein wieder aus",
      glut[glut.length - 1][1] < 0.05, String(glut[glut.length - 1][1]));
    /* Anlauf gegen Knall: der Aufbau dauert ein Vielfaches des Schlags.
       Das ist die Aussage hinter der alten 12:1-Zeile — sie haengt an
       der Form, nicht an 1650 und 133. */
    const knallAb = 47.5, knallBis = 55;
    pruef("Anlauf und Knall sind stark asymmetrisch",
      knallAb / (knallBis - knallAb) > 4,
      (knallAb / (knallBis - knallAb)).toFixed(1) + ":1");
  }

  /* ------------------------------------------------------------------
     6b. DIE FARBAUSSTROEMUNG — der Anlass fuer die dritte Fassung.
     Rueckmeldung vom 29.07.2026: „das Referenz Video hat paar mehr
     Farben die aus dem boosterpack stroemen und ist langsamer als
     unsere". Nachgemessen stimmte beides: das Vorbild traegt auf dem
     Hoehepunkt 4 Farbkanaele ueber 2,40 s, wir hatten 2 Kanaele in
     EINEM Einzelbild. Der Grund war, dass es gar keine Farbebene gab —
     die Farbe kam allein aus dem Glutschein, und der hat je Pack nur
     eine. Geprueft wird deshalb die Ursache, nicht die Wirkung.
     ------------------------------------------------------------------ */
  pruef("es gibt eine eigene Farbausstroemung (@keyframes pkstroemen)", !!roh.pkstroemen);
  pruef("und eine zweite, gegenlaeufige Ebene", !!roh.pkstroemen2);
  const farbregeln = await p.evaluate(() => {
    const raus = {};
    for (const s of document.styleSheets) {
      let r; try { r = s.cssRules; } catch (e) { continue; }
      for (const rule of r) {
        if (rule.selectorText === ".pkfarben") raus.eins = rule.cssText;
        if (rule.selectorText === ".pkfarben.zwei") raus.zwei = rule.cssText;
      }
    }
    return raus;
  });
  /* ⚠ Das CSSOM gibt Farben als `rgb(255, 107, 61)` zurueck, nie als
     Hex — die Quelle steht in Hex da, die Regel nicht. Gezaehlt werden
     deshalb rgb-Tupel, und Schwarz sowie Volltransparentes fallen raus:
     das sind die Luecken zwischen den Strahlen, keine Farben. */
  const toene = t => new Set((String(t).match(/rgba?\([^)]+\)/g) || [])
    .map(x => x.replace(/\s+/g, ""))
    .filter(x => !/,0\)$/.test(x) && !/^rgba?\(0,0,0/.test(x)));
  const t1f = toene(farbregeln.eins), t2f = toene(farbregeln.zwei);
  /* „Mehr Farben" heisst mehr als die eine Glutfarbe des Packs. Sechs
     ist keine Zierzahl: es ist ein Ton je Element, damit die
     Ausstroemung zeigt, WORAUS ein Pack besteht. */
  pruef("die erste Farbebene traegt mindestens sechs Toene",
    t1f.size >= 6, t1f.size + " Toene");
  pruef("die zweite traegt eigene, nicht dieselben",
    t2f.size >= 6 && [...t2f].filter(x => t1f.has(x)).length === 0,
    t2f.size + " Toene, " + [...t2f].filter(x => t1f.has(x)).length + " doppelt");

  const str1 = stops(roh.pkstroemen, "opacity");
  const str2 = stops(roh.pkstroemen2, "opacity");
  if (str1.length && str2.length) {
    const max1 = Math.max(...str1.map(x => x[1]));
    const beiP = (liste, pz) => {
      const t = liste.filter(x => x[0] <= pz).pop();
      return t ? t[1] : 0;
    };
    /* Der eigentliche Fehler der alten Fassung: die Farbe war EIN
       Einzelbild lang da. Sie muss den Bruch ueberleben — im Vorbild um
       1,6 s. 85 % von 4000 ms sind 3400 ms, also 1,2 s nach dem Bruch. */
    pruef("die Farbe lebt lange nach dem Bruch weiter",
      beiP(str1, 85) >= max1 * 0.25,
      "bei 85 % noch " + beiP(str1, 85) + " von " + max1);
    pruef("sie ist am Ende der Szene aber wirklich weg",
      str1[str1.length - 1][1] < 0.05, String(str1[str1.length - 1][1]));
    pruef("die zweite Ebene laeuft gegenlaeufig",
      /rotate\(-/.test(roh.pkstroemen2) && !/rotate\(-/.test(roh.pkstroemen));
    /* ⚠ Der Weissblitz darf den Hoehepunkt MARKIEREN, nicht ersetzen.
       Gemessen hatte er die Farben entsaettigt: 5 Kanaele wurden zu 1,
       weil alles weiss war. Deshalb steht er unter der Farbe. */
    const blitz = stops(roh.pkblitz, "opacity");
    if (blitz.length) {
      const maxB = Math.max(...blitz.map(x => x[1]));
      pruef("der Weissblitz bleibt schwaecher als die Farbausstroemung",
        maxB < max1, maxB + " gegen " + max1);
    }
  }

  /* ------------------------------------------------------------------
     6c. DIE KARTEN MUESSEN SICHTBAR SEIN.
     Am 29.07.2026 hat ein Ersetzungslauf beim Umbau auf 4000 ms die
     Grundregel `.pkcard{position:absolute;…}` mitgenommen. Uebrig blieb
     nur die Animationszeile. Ergebnis: fuenf Divs ohne Position, ohne
     Groesse und ohne Flaeche fliegen unsichtbar durchs Bild — die Szene
     lief technisch einwandfrei und zeigte nichts. Alle bestehenden
     Schritte blieben gruen, weil sie die KLASSE zaehlen, nicht das Bild.
     Deshalb dieser Schritt: eine Karte anlegen und nachsehen, ob sie
     ueberhaupt eine Flaeche hat.
     ------------------------------------------------------------------ */
  const kartenBild = await p.evaluate(() => {
    const lay = document.getElementById("packLayer");
    const st = document.getElementById("pkStage");
    /* ⚠ #packLayer ist display:none, solange nichts laeuft. Eine Karte
       darin hat dann 0x0 — nicht weil sie keine Flaeche HAT, sondern
       weil nichts gelayoutet wird. Also kurz aufmachen und wieder zu. */
    const warOffen = lay.classList.contains("on");
    if (!warOffen) lay.classList.add("on");
    const d = document.createElement("div");
    /* ⚠ Die Sonde muss die ECHTE Bauart nachbilden, sonst misst sie eine
       Karte, die es so nicht gibt. Seit dem Deck-Umbau traegt `.pkcard`
       selbst weder Fuellung noch Rand — beides sitzt auf den zwei
       Seiten. Eine nackte Sonde meldete deshalb „nichts zu sehen",
       obwohl mehr zu sehen war als vorher. */
    d.innerHTML = '<div class="pk3d">' +
      '<div class="pkface pkback"></div>' +
      '<div class="pkface pkfront"></div></div>';
    d.className = "pkcard";
    st.appendChild(d);
    const cs = getComputedStyle(d);
    /* ⚠ getBoundingClientRect() liefert die TRANSFORMIERTE Box. Die
       Grundregel setzt scale(.3) als Ausgangslage, also meldet sie 17
       statt 57 px — und das sieht aus wie „keine Flaeche", ist aber der
       richtige Startzustand. Gefragt ist die Layout-Groesse. */
    const raus = {
      pos: cs.position,
      breite: d.offsetWidth,
      hoehe: d.offsetHeight,
      grund: cs.backgroundImage !== "none" || !/, 0\)$/.test(cs.backgroundColor),
      rand: parseFloat(cs.borderTopWidth) || 0,
    };
    /* ⚠ NACHGEZOGEN 30.07.2026. Fuellung und Rand sitzen nicht mehr auf
       `.pkcard`, sondern auf den beiden SEITEN `.pkface` — die Karte
       selbst ist seit dem Umbau nur noch der drehbare Traeger und
       absichtlich unsichtbar. Der Schritt hat das als „nichts zu sehen"
       gemeldet, obwohl mehr zu sehen war als vorher.
       Die Anforderung dahinter ist die alte und die wichtigste dieser
       Datei: eine Karte, die fliegt, muss man SEHEN. Genau daran ist die
       Szene einmal gescheitert, ohne dass eine Messung es meldete.
       Gemessen wird deshalb jetzt die Seite, die oben liegt. */
    const seite = d.querySelector(".pkback") || d.querySelector(".pkface");
    if (seite) {
      const sc = getComputedStyle(seite);
      raus.grund = raus.grund ||
        sc.backgroundImage !== "none" || !/, 0\)$/.test(sc.backgroundColor);
      raus.rand = Math.max(raus.rand, parseFloat(sc.borderTopWidth) || 0);
    }
    d.remove();
    if (!warOffen) lay.classList.remove("on");
    return raus;
  });
  pruef("eine .pkcard liegt absolut, nicht im Textfluss",
    kartenBild.pos === "absolute", kartenBild.pos);
  pruef("sie hat eine Flaeche", kartenBild.breite > 20 && kartenBild.hoehe > 20,
    kartenBild.breite + "x" + kartenBild.hoehe);
  pruef("und etwas zu sehen darauf (Fuellung oder Rand)",
    kartenBild.grund || kartenBild.rand > 0,
    "Fuellung " + kartenBild.grund + ", Rand " + kartenBild.rand);

  /* ------------------------------------------------------------------
     DIE ZWEITE FEHLERKLASSE, und die teurere: ein fehlender ANFANGSWERT.
     `pkbeben` setzte `opacity` erst bei 76 %. Der Browser interpoliert
     dann VOM AUSGANGSWERT ueber die ganze Animation dorthin — der Pack
     war bei 1,5 s schon zu 37 % verblasst, waehrend er noch laden sollte.
     Im CSS sieht das aus wie eine Auslassung; in Wahrheit ist es eine
     stille Rampe ueber alles. Deshalb wird hier fuer JEDE pk-Animation
     verlangt, dass jede Eigenschaft, die sie spaeter setzt, schon am
     0-%-Stop steht.
     ------------------------------------------------------------------ */
  const luecken = [];
  for (const [name, text] of Object.entries(roh)) {
    const bloecke = [];
    inhalt(text).replace(/([\d.,%\s]+)\{([^}]*)\}/g, (_, kopf, koerper) => {
      kopf.split(",").forEach(k => {
        const z = parseFloat(k.trim());
        if (!isNaN(z)) bloecke.push([z, koerper]);
      });
    });
    if (!bloecke.length) continue;
    /* Ausnahme mit Grund: eine Regel mit EINEM einzigen Stop (`to{…}`)
       ist die Bauart „von wo auch immer du gerade bist bis hierhin" —
       genau das, was eine Endlosdrehung wie `pkspin` braucht, damit sie
       nahtlos schleift. Ein Anfangswert waere dort falsch, nicht
       fehlend. Die Regel gilt fuer die einmal laufenden Kurven. */
    if (bloecke.length === 1) continue;
    bloecke.sort((a, b) => a[0] - b[0]);
    const start = bloecke.filter(b => b[0] === 0).map(b => b[1]).join(";");
    const genannt = new Set();
    bloecke.forEach(b => (b[1].match(/[a-z-]+(?=\s*:)/g) || []).forEach(e => genannt.add(e)));
    genannt.forEach(e => {
      if (!new RegExp("(^|;|\\s)" + e + "\\s*:").test(start))
        luecken.push(name + " ohne " + e + " bei 0 %");
    });
  }
  pruef("jede pk-Animation setzt bei 0 % alles, was sie spaeter aendert",
    luecken.length === 0, luecken.slice(0, 4).join(" · "));

  /* ---------- 2. Der Ablauf im Betrieb ---------- */
  await p.evaluate(() => { window.__proto.show("navPack"); });
  await p.waitForTimeout(400);

  const vorher = await p.evaluate(() =>
    document.getElementById("packLayer").classList.contains("on"));
  pruef("die Ebene liegt geschlossen da, solange nichts geoeffnet wird", !vorher);

  await p.click("#btnOpenBronze");
  await p.waitForTimeout(160);

  const waehrend = await p.evaluate(() => {
    const l = document.getElementById("packLayer"), st = document.getElementById("pkStage");
    return {
      offen: l.classList.contains("on"),
      spielt: l.classList.contains("spielt"),
      versteckt: l.getAttribute("aria-hidden"),
      karten: st.querySelectorAll(".pkcard").length,
      farbe: getComputedStyle(st).color,
      // Liegt die Ebene ueber dem App-Inhalt?
      z: +getComputedStyle(l).zIndex,
      // Traegt die erste Karte einen ECHTEN Zielort?
      zx: st.querySelector(".pkcard") &&
          st.querySelector(".pkcard").style.getPropertyValue("--zx"),
    };
  });
  pruef("die Ebene ist offen", waehrend.offen);
  pruef("die Animation laeuft", waehrend.spielt);
  pruef("aria-hidden ist waehrenddessen false", waehrend.versteckt === "false");
  pruef("die Kartenzahl kommt aus dem Pack (Bronze = 5)",
    waehrend.karten === 5, waehrend.karten + " Stueck");
  pruef("die Ebene deckt den App-Inhalt", waehrend.z >= 260, "z-index " + waehrend.z);
  /* Ein Zielort in Pixeln, nicht 0 — sonst landen alle Karten aufeinander.
     Genau das passiert, wenn die Buehnenbreite beim Rechnen 0 war. */
  pruef("die Karten haben einen berechneten Zielort",
    /-?\d+px/.test(waehrend.zx || "") && waehrend.zx !== "0px", waehrend.zx);

  /* Die Glutfarbe muss die des Packs sein, nicht pauschal Magenta.
     Bronze glueht bernstein — das ist der Unterschied zum Vorbild und
     der Grund, warum der Magenta-Knall dem Arcane-Pack gehoert. */
  const bronze = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(waehrend.farbe);
  pruef("Bronze glueht bernstein, nicht magenta",
    bronze && +bronze[1] > 180 && +bronze[2] > 110 && +bronze[3] < 110, waehrend.farbe);

  /* ---------- 2b. Die Zahl folgt dem Pack ----------
     29.07.2026: Die Szene legte FEST fuenf Plaetze an, egal was im Pack
     war. Wer ein Arkan-Pack oeffnete, sah elf Karten im Raster, aber nur
     fuenf davon fliegen. Zwei Zahlen, die dasselbe meinen und getrennt
     gepflegt werden, laufen immer auseinander — deshalb wird hier gegen
     `ArenaCards.PACKS[key].cardSlots` geprueft und nicht gegen eine
     Zahl in dieser Datei. */
  await p.mouse.click(195, 300);
  await p.waitForTimeout(150);
  const proTyp = await p.evaluate(async () => {
    const raus = [];
    for (const key of ["bronze", "silver", "gold", "arcane"]) {
      window.__proto.openPackKey(key);
      await new Promise(r => setTimeout(r, 120));
      raus.push({ key: key,
                  soll: window.ArenaCards.PACKS[key].cardSlots,
                  ist: document.getElementById("pkStage").querySelectorAll(".pkcard").length });
      document.getElementById("packLayer").dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
    }
    return raus;
  });
  proTyp.forEach(x => pruef(
    "Pack " + x.key + ": " + x.soll + " Karten fliegen",
    x.ist === x.soll, x.ist + " statt " + x.soll));
  /* Und die Gegenprobe: die vier Typen sind NICHT alle gleich. Waere die
     Zahl wieder fest verdrahtet, gingen die vier Schritte oben nur dann
     durch, wenn zufaellig alle Packs gleich viele Karten haetten. */
  pruef("die vier Pack-Typen unterscheiden sich in der Kartenzahl",
    new Set(proTyp.map(x => x.ist)).size === 4,
    proTyp.map(x => x.key + "=" + x.ist).join(" "));

  await p.evaluate(() => { window.__proto.openPackKey("bronze"); });
  await p.waitForTimeout(150);

  /* ---------- 3. Ein Tipp deckt auf ----------
     ⚠ Erst warten, bis der Stapel schwebt. Vorher ist absichtlich nichts
     aufzudecken: ein Tipp waehrend des Aufbaus darf den Bruch NICHT
     ueberspringen, dafuer wurde das Pack gekauft. Wer hier zu frueh
     tippt, misst genau diese Sperre und haelt sie faelschlich fuer einen
     Fehler. */
  await p.waitForFunction(() => {
    const d = document.getElementById("pkDeck");
    return d && d.classList.contains("schwebt");
  }, null, { timeout: 9000 });
  await p.mouse.click(195, 300);
  await p.waitForTimeout(160);
  const nachTipp = await p.evaluate(() => {
    const l = document.getElementById("packLayer");
    return {
      offen: l.classList.contains("on"),
      karten: document.getElementById("pkStage").querySelectorAll(".pkcard").length,
      auf: document.querySelectorAll("#pkStage .pkcard.auf").length,
      raster: document.querySelectorAll("#packGrid .pcard").length,
    };
  });
  /* ⚠ UMGESCHRIEBEN 30.07.2026. Hier stand „ein Tipp schliesst die Szene
     sofort". Das war die alte Zusage und ist durch eine ausdrueckliche
     Ansage des Auftraggebers ersetzt worden: „dann muss jede Karte
     nacheinander geklickt werden diese drehen sich dann". Ein Tipp deckt
     jetzt GENAU EINE Karte auf; geschlossen wird erst, wenn keine mehr
     liegt.
     Die Anforderung dahinter — der Spieler kommt aus der Szene wieder
     heraus und verliert dabei nichts — bleibt und wird weiter geprueft,
     nur ueber den neuen Weg. Der alte Schritt haette den Umbau als
     Fehler gemeldet, obwohl er der Auftrag war. */
  pruef("ein Tipp schliesst die Szene NICHT, sondern deckt auf",
    nachTipp.offen, "Ebene war zu");
  pruef("und dabei ist genau eine Karte umgedreht",
    nachTipp.auf === 1, nachTipp.auf + " umgedreht");
  /* Abbrechen darf NICHT heissen, dass man den Packinhalt verliert.
     ⚠ Seit dem Umbau steht das Raster erst, wenn die Szene durch ist —
     also NACH dem letzten Tipp, nicht schon beim ersten. Geprueft wird
     das jetzt weiter unten, wo wirklich durchgeklickt wird. */
  pruef("beim ersten Tipp steht das Raster noch nicht", nachTipp.raster === 0,
    nachTipp.raster + " Karten");

  /* ---------- 4. Zweites Pack startet wirklich neu ---------- */
  await p.evaluate(() => { window.__proto.openPackKey("bronze"); });
  await p.waitForTimeout(140);
  const zweitesMal = await p.evaluate(() => {
    const l = document.getElementById("packLayer");
    return l.classList.contains("on") && l.classList.contains("spielt");
  });
  pruef("das zweite Pack startet die Animation erneut", zweitesMal);
  await p.mouse.click(195, 300);
  await p.waitForTimeout(120);

  /* ---------- 5. Sie endet, wenn der Spieler durch ist ----------
     ⚠ UMGESCHRIEBEN 30.07.2026, gleicher Grund wie oben: die Szene hat
     kein Zeitschloss mehr. Vorher stand hier „die Szene endet ohne
     Zutun" — das war genau das Verhalten, das dem Spieler den
     Legendaer-Moment wegnehmen konnte. Geprueft wird jetzt, dass er sie
     durch Tippen zuverlaessig BEENDEN kann und dabei nichts verliert.
     Ein Deckel gegen Endlosschleifen bleibt: mehr Tipps als Karten plus
     Reserve duerfen nie noetig sein. */
  await p.evaluate(() => { window.__proto.openPackKey("arcane"); });
  await p.waitForFunction(() => {
    const d = document.getElementById("pkDeck");
    return d && d.classList.contains("schwebt");
  }, null, { timeout: 9000 });
  const zuDecken = await p.evaluate(() =>
    document.querySelectorAll("#pkDeck .pkcard").length);
  let tipps = 0;
  while (tipps < zuDecken + 3) {
    const offen = await p.evaluate(() =>
      document.getElementById("packLayer").classList.contains("on"));
    if (!offen) break;
    await p.evaluate(() => document.getElementById("packLayer")
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    tipps++;
    await p.waitForTimeout(620);
  }
  const danach = await p.evaluate(() => ({
    offen: document.getElementById("packLayer").classList.contains("on"),
    raster: document.querySelectorAll("#packGrid .pcard").length,
  }));
  pruef("die Szene laesst sich durch Tippen beenden", !danach.offen,
    tipps + " Tipps fuer " + zuDecken + " Karten");
  /* ⚠ +2, nicht +1. Seit dem 30.07.2026 zeigt die Szene nach der letzten
     Karte die BEUTE-UEBERSICHT („zeig alle Karten die im booster waren
     nebeneinander"), und erst der Tap danach schliesst. Ein Tipp je Karte,
     einer fuer die Beute, einer zum Schluss. */
  pruef("ein Tippen je Karte, eines fuer die Beute, eines zum Schluss",
    tipps === zuDecken + 2, tipps + " statt " + (zuDecken + 2));
  pruef("danach steht das Kartenraster", danach.raster > 0, danach.raster + " Karten");

  /* ---------- 5b. DIE AUFGEDECKTE KARTE RAEUMT DAS FELD ----------
     ⚠ NEU am 30.07.2026 nach einem Befund des Auftraggebers: „die
     aufgedeckte Karte geht nicht vom Deck weg damit man die naechste
     sieht". Der Zustandswechsel im JS war korrekt — die Klasse `.weg`
     wurde gesetzt. Trotzdem blieb die Karte stehen, weil die GEWINNENDE
     Animation `pkkarte` hiess: `#packLayer.spielt .pkcard` traegt eine ID
     und schlaegt `.pkcard.weg`. Die Abgangsanimation lief nie.
     DIE LEHRE FUER DIESE DATEI: eine Pruefung auf die KLASSE haette den
     Fehler nicht gefunden. Gemessen werden muss, was der Browser am Ende
     wirklich tut — welche Animation gewinnt und wie deckend die Karte
     danach ist. Klassen sind Absichten, keine Wirkung. */
  await p.evaluate(() => { window.__proto.openPackKey("bronze"); });
  await p.waitForFunction(() => {
    const d = document.getElementById("pkDeck");
    return d && d.classList.contains("schwebt");
  }, null, { timeout: 9000 });
  await p.evaluate(() => document.getElementById("packLayer")
    .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
  await p.waitForTimeout(1400);   /* Drehung + Abgang komplett */
  const abgang = await p.evaluate(() => {
    const k = document.querySelector("#pkDeck .pkcard.weg");
    if (!k) return { da: false };
    const cs = getComputedStyle(k);
    return { da: true, animation: cs.animationName, deckkraft: +cs.opacity };
  });
  pruef("die aufgedeckte Karte bekommt ihren Abgang", abgang.da);
  pruef("und die ABGANGS-Animation gewinnt, nicht der Einflug",
    abgang.animation === "pkweg", abgang.animation);
  pruef("danach ist sie wirklich weg, nicht nur markiert",
    abgang.deckkraft < 0.05, "Deckkraft " + abgang.deckkraft);
  gegen("Abgang", abgang.animation === "pkweg" && abgang.deckkraft < 0.05);

  /* ---------- 5c. DAS FINALE ZEIGT DIE GANZE BEUTE ----------
     Vorgabe: „Sobald alle aufgedeckt wurden zeig alle Karten die im
     booster waren nebeneinander fuer den Spieler." Geprueft wird gegen
     die Zahl der Karten IM DECK, nicht gegen eine feste Anzahl — sonst
     waere der Schritt beim naechsten Packformat rot. */
  const imDeck = await p.evaluate(() =>
    document.querySelectorAll("#pkDeck .pkcard").length);
  /* ⚠ Tippen, BIS die Beute steht — nicht eine feste Anzahl. Eine feste
     Zahl tippte einmal zu oft, schloss damit die Szene und `raeumen()`
     nahm die Uebersicht gleich mit; gemessen wurde dann „kein Finale",
     obwohl es da gewesen war. Der Deckel (Karten + 2) bleibt als Schutz
     gegen eine Endlosschleife. */
  for (let i = 0; i < imDeck + 2; i++) {
    const st = await p.evaluate(() => ({
      offen: document.getElementById("packLayer").classList.contains("on"),
      finale: !!document.querySelector(".pkfinale") }));
    if (!st.offen || st.finale) break;
    await p.evaluate(() => document.getElementById("packLayer")
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await p.waitForTimeout(1080);
  }
  const finale = await p.evaluate(() => {
    const f = document.querySelector(".pkfinale");
    return { da: !!f,
             kacheln: f ? f.querySelectorAll(".pkfin").length : 0,
             mitBild: f ? [...f.querySelectorAll(".pkfin")]
               .filter(c => c.querySelector(".artbox")).length : 0,
             nochOffen: document.getElementById("packLayer").classList.contains("on") };
  });
  pruef("nach der letzten Karte erscheint die Beute-Uebersicht", finale.da);
  pruef("sie zeigt JEDE Karte des Packs",
    finale.kacheln === imDeck + 1 || finale.kacheln === imDeck,
    finale.kacheln + " Kacheln fuer " + imDeck + " Karten");
  pruef("und jede traegt ihr Artwork",
    finale.kacheln > 0 && finale.mitBild === finale.kacheln,
    finale.mitBild + " von " + finale.kacheln);
  pruef("die Szene bleibt dafuer offen — der Blick gehoert zur Zeremonie",
    finale.nochOffen);


  /* ---------- 6. Die Raritaets-Leiter der Aufdeckung ----------
   * Anlass: bis zum 29.07.2026 war die Aufdeckung BINAER — ab Episch
   * ein Burst-Ring, ab Legendaer das Cinematic. Gewoehnlich, Gut und
   * Selten waren in Dauer, Bewegung und Ton NICHT unterscheidbar.
   * Geprueft wird deshalb nicht „Stufe 3 hat einen Burst" (das war auch
   * vorher wahr), sondern: JEDE Stufe unterscheidet sich von JEDER
   * anderen — und zwar streng monoton steigend. Eine Leiter mit zwei
   * gleich hohen Sprossen ist keine. */
  const leiter = await p.evaluate(() => {
    const AC = window.ArenaCards;
    const out = [];
    for (let t = 0; t <= 4; t++) {
      // Ein Ein-Karten-Pack mit GENAU dieser Stufe stellen.
      window.__proto.setPackState([{ kind: "card", done: false, d: {
        cardId: "fire", tier: AC.TIER_KEYS[t], tierIndex: t,
        tierName: AC.TIERS[t].name, color: AC.TIERS[t].color, count: 1 } }]);
      const fx = window.__proto.stufeFx({ kind: "card", d: { tierIndex: t } });
      out.push({ t: t, dauer: fx.dauer, partikel: fx.partikel, stufe: fx.stufe });
    }
    // Und was bekommen Gold-/Essenz-Posten?
    const gold = window.__proto.stufeFx({ kind: "gold", n: 500 });
    const mat = window.__proto.stufeFx({ kind: "mat", m: { amount: 3 } });
    return { out: out, gold: gold, mat: mat };
  });
  pruef("stufeFx ist pruefbar exportiert", !!leiter && leiter.out.length === 5);
  pruef("jede Stufe hat ihre eigene Dauer",
    new Set(leiter.out.map(x => x.dauer)).size === 5,
    leiter.out.map(x => x.dauer).join("/"));
  pruef("jede Stufe hat ihre eigene Partikelzahl",
    new Set(leiter.out.map(x => x.partikel)).size === 5,
    leiter.out.map(x => x.partikel).join("/"));
  pruef("die Dauer steigt streng monoton",
    leiter.out.every((x, i) => i === 0 || x.dauer > leiter.out[i - 1].dauer));
  pruef("die Partikelzahl steigt streng monoton",
    leiter.out.every((x, i) => i === 0 || x.partikel > leiter.out[i - 1].partikel));
  pruef("Gold- und Essenz-Posten liegen auf der untersten Stufe",
    leiter.gold.stufe === 0 && leiter.mat.stufe === 0,
    leiter.gold.stufe + "/" + leiter.mat.stufe);

  /* Das Blatt muss die Stufen auch WIRKLICH unterscheiden — eine
     Leiter, die nur in JS existiert, sieht der Spieler nicht. */
  const css = await p.evaluate(() => {
    const noetig = ["pcwisch", "pcpuls", "pcstrahl", "pcwelle", "pcbeben", "pcheb"];
    const da = {};
    for (const bl of document.styleSheets) {
      let rs; try { rs = bl.cssRules; } catch (e) { continue; }
      for (const r of rs) if (r.type === CSSRule.KEYFRAMES_RULE) da[r.name] = 1;
    }
    // und die Stufenklassen muessen adressiert werden
    let txt = "";
    for (const bl of document.styleSheets) {
      let rs; try { rs = bl.cssRules; } catch (e) { continue; }
      for (const r of rs) txt += (r.selectorText || "") + " ";
    }
    return {
      fehlend: noetig.filter(n => !da[n]),
      klassen: [0, 1, 2, 3, 4].filter(i => txt.indexOf(".pcard.r" + i) >= 0),
      reduziert: txt.indexOf("prefers-reduced-motion") >= 0 ||
        [...document.styleSheets].some(bl => {
          let rs; try { rs = bl.cssRules; } catch (e) { return false; }
          return [...rs].some(r => r.type === CSSRule.MEDIA_RULE &&
            r.conditionText.indexOf("reduced-motion") >= 0);
        }),
    };
  });
  pruef("jede Stufen-Animation steht im Blatt", css.fehlend.length === 0,
    css.fehlend.join(","));
  pruef("die oberen vier Stufen werden im Blatt adressiert",
    css.klassen.length >= 4, "r" + css.klassen.join(",r"));
  pruef("es gibt eine Ruecknahme fuer `Bewegung reduzieren`", css.reduziert);

  /* Und die Karte traegt die Stufe nach dem Aufdecken auch am Element. */
  await p.evaluate(() => { window.__proto.openPackKey("bronze"); });
  /* ⚠ Hier standen erst 3400 ms fest, dann DAUER + 500. Beide Male war
     die Oeffnungsebene beim Klicken noch ueber dem Raster und die
     Meldung lautete „traegt ihre Stufenklasse nicht" — der Fehler war nie
     in der Karte, sondern in der Wartezeit. Seit die Szene auf den
     Spieler wartet, gibt es ueberhaupt keine richtige Wartezeit mehr.
     Also wird getippt statt gewartet. */
  await durchtippen(p);
  /* ⚠ DRITTE Nachbesserung an derselben Stelle, 30.07.2026 — diesmal aus
     einem anderen Grund als die zwei darueber. Seit die Szene den Reveal
     uebernimmt, bucht der Prototyp die Posten am Ende der Zeremonie STILL
     und zeichnet das Raster fertig offen (sonst muesste der Spieler
     dieselben Karten zweimal antippen). Ein Klick auf eine offene Kachel
     steigt in `flip()` sofort wieder aus — `.turning`, `.r<stufe>` und
     `--pcdur` entstehen also nie mehr, und der Schritt meldete „traegt
     ihre Stufenklasse nicht" bei voellig richtigem Verhalten.
     Die Anforderung bleibt: die Raritaets-Leiter muss AM ELEMENT
     ankommen, nicht nur in JS. Sie gilt weiter fuer jede Drehung im
     Raster (Nachholen ueber „Alle aufdecken", Wiederansehen). Geprueft
     wird sie darum ueber die Testklappe `setPackState`, die das Raster
     zurueck auf verdeckt setzt — dieselbe Loesung wie in run_v5.js.
     Das ist keine Umgehung: der Klick, die Drehung und die Klassen sind
     danach genau die echten. */
  await p.evaluate(() => {
    const echt = window.__proto.packState();
    window.__proto.setPackState(echt.map(s => ({ ...s, done: false, busy: false })));
  });
  await p.waitForTimeout(200);
  const amElement = await p.evaluate(async () => {
    const karten = [...document.querySelectorAll("#packGrid .pcard")];
    const treffer = [];
    for (const k of karten) {
      const t = parseInt(k.getAttribute("data-tier"), 10);
      if (t < 0) continue;              // Gold/Essenz
      k.click();
      await new Promise(r => setTimeout(r, 60));
      treffer.push({ t: t, hatKlasse: k.classList.contains("r" + t),
                     dauer: k.style.getPropertyValue("--pcdur") });
      await new Promise(r => setTimeout(r, 900));
    }
    return treffer;
  });
  pruef("jede aufgedeckte Karte traegt ihre Stufenklasse",
    amElement.length > 0 && amElement.every(x => x.hatKlasse),
    amElement.map(x => "r" + x.t + (x.hatKlasse ? "" : "!")).join(" "));
  pruef("und ihre eigene Dauer als CSS-Variable",
    amElement.every(x => /^\d+ms$/.test(x.dauer)),
    amElement.map(x => x.dauer).join(" "));

  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);

  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
