/* ===================================================================
 * arena_packfx.js — die Physik der Pack-Sprengung
 *
 * WARUM ES DIESES MODUL GIBT
 * --------------------------
 * Rueckmeldung des Auftraggebers zur Kling-Fassung: „der pack wird
 * perfekt angezeigt nur die Animation passt nicht. wie bekommen wir das
 * genau so hin wie blizzard das macht?"
 *
 * Die Antwort ist ein Werkzeugwechsel, kein besserer Prompt.
 *
 *   · KLING erfindet Bewegung aus einer Beschreibung. Man kann ihm nicht
 *     sagen „bei Bild 42 zerbricht das Pack in 40 Stuecke, die an der
 *     Kamera vorbeifliegen". Jede Generierung ist eine Lotterie. Fuer
 *     einen Ambient-Loop ist das ideal (`off_loop` ist so entstanden),
 *     fuer eine taktgenaue, WIEDERHOLBARE Zeremonie unbrauchbar.
 *   · CSS kann kein ADDITIVES BLENDING. Das ist der eigentliche Grund,
 *     warum unsere bisherige Fassung milchig aussieht statt heiss:
 *     ueberlappende Lichter muessen sich zu Weiss AUFADDIEREN. CSS kann
 *     Elemente uebereinanderlegen, ihre Helligkeit aber nicht summieren.
 *     Dazu bricht CSS ab etwa 50 animierten Elementen ein.
 *   · CANVAS kann beides — plus echte Physik, Tiefensortierung und
 *     Bewegungsunschauml;rfe. Das ist der Weg, auf dem Mobile-Games diese
 *     Effekte tatsaechlich ausliefern.
 *
 * WAS HIER LIEGT UND WAS NICHT
 * Hier liegt ausschliesslich die RECHNUNG: wie viele Teilchen welcher
 * Art entstehen, mit welcher Geschwindigkeit, und wie sie sich pro
 * Zeitschritt bewegen. Das ZEICHNEN steht im Prototyp, weil es ein
 * Canvas braucht. Die Trennung ist Absicht: so ist die Physik ohne
 * Browser pruefbar (`node arena_packfx.js`), und ein Fehler in der
 * Bewegung ist von einem Fehler im Bild unterscheidbar. Genau diese
 * Unterscheidung hat an diesem Tag mehrfach gefehlt.
 *
 * DETERMINISMUS IST PFLICHT, NICHT KOMFORT
 * Kein Math.random(). Der Zufall kommt aus einem Startwert (`seed`).
 * Zwei Gruende, beide teuer erkauft:
 *   1. Ein Standbildvergleich ist sonst unmoeglich, und genau darueber
 *      laeuft die Pruefung der Oeffnungsszene.
 *   2. Ein Fehler, der nur bei einer bestimmten Streuung auftritt, ist
 *      sonst nicht reproduzierbar.
 *
 * AUFRUF
 *   node arena_packfx.js        → Selbsttest
 * =================================================================== */
(function () {
  "use strict";

  /* ---------- Deterministischer Zufall (Mulberry32) ----------
     Klein, schnell, gut genug fuer Partikel. Wichtig ist nicht die
     statistische Guete, sondern dass derselbe Startwert dieselbe Folge
     ergibt — auf jedem Geraet und in jedem Browser. */
  function rng(seed) {
    var a = (seed | 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Die Teilchenarten ----------
     Jede Art traegt eine eigene Rolle in der Wirkung. Sie sind NICHT
     beliebig: eine Sprengung, die nur aus Funken besteht, liest sich als
     Feuerwerk; eine, die nur aus Splittern besteht, als Unfall. Erst die
     Mischung liest sich als „etwas Wertvolles bricht auf".
       SPLITTER  Stuecke des Packs selbst. Sie tragen das Artwork und
                 sind der Grund, warum die Sprengung nach UNSEREM Pack
                 aussieht und nicht nach einem Effekt von der Stange.
       FUNKE     kurzer heller Streifen mit Schweif, hohe Geschwindigkeit
       GLUT      langsam, schwer, faellt — gibt der Szene Boden
       STAUB     fast unsichtbar, treibt; nimmt der Luft die Leere
       WELLE     die Druckwelle, EINE, expandiert und verblasst */
  var ART = { SPLITTER: 0, FUNKE: 1, GLUT: 2, STAUB: 3, WELLE: 4 };

  /* Wie viele Teilchen je Art. Die Zahlen sind nach Wirkung gewaehlt und
     hier zentral, damit ein Balance-Eingriff EINE Stelle hat.
     `proKarte` skaliert mit dem Packinhalt: ein Arkan-Pack mit elf Karten
     muss sichtbar heftiger aufreissen als ein Bronze-Pack mit fuenf.
     Der Deckel verhindert, dass ein grosses Pack die Bildrate frisst. */
  var MENGE = {
    splitter: { grund: 18, proKarte: 1.6, deckel: 44 },
    funke:    { grund: 40, proKarte: 6.0, deckel: 160 },
    glut:     { grund: 22, proKarte: 2.4, deckel: 70 },
    staub:    { grund: 30, proKarte: 1.0, deckel: 54 },
    welle:    { grund: 1,  proKarte: 0,   deckel: 1 },
  };

  function anzahl(k, karten) {
    var m = MENGE[k];
    return Math.min(m.deckel, Math.round(m.grund + m.proKarte * (karten || 5)));
  }

  /* ---------- Physik ----------
     LUFT bremst, SCHWERE zieht nach unten. Beides ist bewusst schwach:
     ein Funke, der sichtbar abbremst, wirkt wie in Sirup; einer, der
     gerade so nachlaesst, wirkt schnell. `SCHWERE` gilt NICHT fuer
     Funken — Funken sind Licht, kein Material, und Licht faellt nicht.
     Das ist der Unterschied zwischen einem Effekt, der teuer aussieht,
     und einem, der wie Konfetti aussieht. */
  var LUFT = { splitter: 0.88, funke: 0.72, glut: 0.90, staub: 0.96 };
  var SCHWERE = { splitter: 620, funke: 0, glut: 900, staub: 90 };

  /* Die Kamera sitzt bei z = 1. Ein Teilchen mit z < 0 ist an ihr
     VORBEIgeflogen und wird nicht mehr gezeichnet. Genau dieses
     Vorbeifliegen ist der Blizzard-Griff: es holt den Zuschauer in die
     Szene, statt sie ihm vorzuspielen. */
  var Z_KAMERA = 1, Z_WEG = -0.05;

  /* erzeuge(karten, seed) → Teilchenliste
     Positionen und Geschwindigkeiten sind EINHEITENLOS (Bruchteile der
     Buehnenbreite je Sekunde). Erst das Zeichnen rechnet sie in Pixel um.
     Der Grund: die Szene ist auf jedem Geraet anders gross, und ein in
     Pixeln gerechneter Effekt sieht auf dem Tablet zahm und auf dem
     kleinen Telefon ueberdreht aus. */
  function erzeuge(karten, seed) {
    var r = rng(seed || 1), teile = [], i, w, sp, k;

    /* --- Splitter: Stuecke des Packbildes ---
       ⚠ ZWEITE FASSUNG, 30.07.2026. Hier stand zuerst ein RASTER mit
       ungleichen Spalten — rechteckige Ausschnitte. Gemessen war das
       gruen (alle Ausschnitte im Bild, ungleich gross, alles zur Kamera).
       ANGESEHEN war es falsch: rechteckige Stuecke lesen sich als
       KONFETTI, nicht als Bruch. Glas bricht nicht in Rechtecke.
       Das ist die dritte Stelle an diesem Tag, an der eine gruene Messung
       einen Fehler getragen hat, den erst der Blick gefunden hat.

       Jetzt: ein BRUCHFAECHER. Vom Einschlagpunkt (Bildmitte) laufen
       Risse nach aussen, ein Ringriss dazwischen. Genau so bricht eine
       Scheibe, die von innen getroffen wird:
         · je Sektor drei Dreiecke — eines von der Mitte an den Ringriss,
           zwei von dort an den Bildrand,
         · die Sektorgrenzen sind UNGLEICH gestreut (ein gleichmaessiger
           Faecher gaebe Tortenstuecke, also wieder Absicht statt Bruch),
         · der Ringriss liegt je Sektor auf einem anderen Radius, sonst
           entsteht ein sichtbarer Kreis.
       Die drei Dreiecke eines Sektors decken den Sektor LUECKENLOS ab —
       darum ist die Zerlegung eine Zerlegung und kein Streumuster. Der
       Selbsttest misst die gedeckte Flaeche.

       Physik nach LAGE, nicht nach Zufall: ein Stueck vom Rand hat den
       weiteren Weg vom Einschlag und fliegt schneller; das Mittelstueck
       bleibt laenger stehen. Zufaellige Kraft haette das verwischt. */
    var sp_n = anzahl("splitter", karten);
    var TAU = Math.PI * 2;
    /* Drei Dreiecke je Sektor. Mindestens vier Sektoren, sonst wird der
       Faecher zum Halbkreis. */
    var sekt = Math.max(4, Math.ceil(sp_n / 3));

    /* Der Strahl vom Mittelpunkt bis zum BILDRAND. Ueber den laengeren
       Achsenanteil gerechnet, damit der Punkt exakt auf der Kante des
       Einheitsquadrats landet — so reicht die Zerlegung bis an den Rand
       des Packbildes und nicht bis an einen eingeschriebenen Kreis. */
    function rand(a) {
      var c = Math.cos(a), s = Math.sin(a);
      var t = 0.5 / Math.max(Math.abs(c), Math.abs(s), 1e-6);
      return [0.5 + c * t, 0.5 + s * t];
    }
    function auf(a, f) {          /* Anteil f des Weges zum Rand */
      var p = rand(a);
      return [0.5 + (p[0] - 0.5) * f, 0.5 + (p[1] - 0.5) * f];
    }

    /* Sektorgrenzen vorab: die Streuung bleibt unter einer halben
       Sektorbreite, damit die Reihenfolge monoton bleibt und sich zwei
       Sektoren nicht ueberlappen. */
    var grenzen = [];
    for (i = 0; i <= sekt; i++) {
      var j = (i % sekt);
      grenzen.push(((i + (rng((seed || 1) * 31 + j)() - 0.5) * 0.6) / sekt) * TAU);
    }

    var drei = [];
    for (i = 0; i < sekt && drei.length < sp_n; i++) {
      var a0 = grenzen[i], a1 = grenzen[i + 1];
      var rm = 0.34 + r() * 0.24;              /* Ringriss je Sektor anders */
      var M = [0.5, 0.5];
      var A = auf(a0, rm), B = auf(a1, rm);
      var C = rand(a1), D = rand(a0);
      /* `rm` reist mit. Nicht aus Bequemlichkeit: der Selbsttest muss die
         Streuung des Ringrisses messen koennen. Ohne dieses Feld ist ein
         auf EINEN Radius festgenagelter Ringriss aus der Teilchenliste
         nicht mehr nachweisbar — der Mutationstest vom 30.07.2026 hat
         genau diese Luecke gezeigt: ein Bruch mit ueberall gleichem
         Ringriss zeichnet einen sichtbaren Kreis, liest sich als Absicht
         statt als Bruch, und ALLE Schritte blieben gruen. */
      drei.push({ p: [M, A, B], rm: rm },
                { p: [A, B, C], rm: rm },
                { p: [A, C, D], rm: rm });
    }
    drei.length = Math.min(drei.length, sp_n);

    for (i = 0; i < drei.length; i++) {
      var p = drei[i].p;
      var cu = (p[0][0] + p[1][0] + p[2][0]) / 3;
      var cv = (p[0][1] + p[1][1] + p[2][1]) / 3;
      var mx = cu - 0.5, my = cv - 0.5;
      var len = Math.sqrt(mx * mx + my * my) || 0.001;
      /* Kraft aus dem Abstand zum Einschlag. Der Faktor 2,2 bringt ein
         Randstueck (len ≈ 0,4) auf knapp 0,9 und das Mittelstueck
         (len ≈ 0,15) auf 0,33 — sichtbar unterschiedlich, ohne dass
         eines stehen bleibt. */
      var kraft = 0.22 + len * 2.2;
      /* Die Minderheit, die an der Kamera vorbeifliegt. Die Wuerfelung
         steht HIER und nicht in der Zuweisung von `vz`, weil sie BEIDE
         Richtungen betrifft — siehe darunter. */
      var vorbei = r() < 0.22;
      /* ⚠ SEITWAERTS GEBREMST, und das ist keine Feinheit, sondern der
         Unterschied zwischen „Effekt vorhanden" und „Effekt sichtbar".
         Erste Fassung: die Vorbeiflieger hatten die volle Seitwaerts-
         geschwindigkeit. Die Physik war richtig, die Pruefung gruen (7 von
         36 erreichten die Kamera, groesste Skala 6,0) — und auf dem Bild
         war NICHTS davon zu sehen. Der Grund steckt in der Projektion:
         die Bildlage ist `mitte + x · Breite · skala`. Dieselbe
         Perspektivskala, die das Stueck gross macht, schiebt es auch nach
         aussen. Ein Stueck mit Seitwaertsdrift ist also aus dem Bild
         heraus, LANGE bevor es gross wird.
         Ein Stueck, das einem entgegenkommt, treibt ohnehin kaum zur
         Seite: der Stoss ging nach vorn. Faktor 0,22 haelt es in der
         Bildmitte, wo man es sieht.
         Gefunden durch ANSEHEN, nicht durch Messen — die Messung sagte
         genau das Gegenteil. Der Selbsttest darunter prueft jetzt die
         BILDLAGE und nicht mehr nur die Tiefe. */
      var seit = vorbei ? 0.22 : 1;
      teile.push({
        art: ART.SPLITTER,
        x: mx * 0.5 * seit, y: my * 0.5 * seit, z: Z_KAMERA,
        vx: (mx / len) * kraft * seit, vy: ((my / len) * kraft - 0.15) * seit,
        /* Nach VORNE, zur Kamera. Ohne diese Komponente bleibt die
           Sprengung flach und sieht aus wie ein Papierschnipsel-Regen.
           ⚠ EIN FUENFTEL fliegt sehr viel schneller nach vorn und geht
           damit AN DER KAMERA VORBEI. Das ist der teuerste Griff in der
           ganzen Szene und der Grund, warum ein Blizzard-Aufreisser den
           Zuschauer hineinzieht: ein Stueck des Packs wird kurz
           bildschirmgross und ist weg. Ohne diese Minderheit fliegen alle
           Stuecke gleich weit nach vorn, die Tiefenskalierung bleibt
           zwischen 1,05 und 1,2 — gemessen — und die Sprengung liest sich
           trotz Perspektive flach.
           Es ist bewusst eine MINDERHEIT: fliegen alle vorbei, ist das
           Bild eine halbe Sekunde lang zugemalt und der Bruch nicht mehr
           lesbar.
           ⚠ Die Zahl sieht absurd hoch aus und ist es nicht. Der erste
           Versuch stand bei 1,5..2,4 und KEIN EINZIGES Stueck erreichte
           die Kamera — der Selbsttest hat das gemeldet, angesehen haette
           ich es nie gefunden. Der Grund ist der Luftwiderstand: 0,88 je
           Sechzigstel bremst so hart, dass der gesamte Weg nach vorn nur
           vz/7,67 betraegt. Fuer die Strecke von z = 1 bis zur Kamera
           braucht es also rund -8, nicht -2. Die Streuung 7..11,5 ist
           Absicht: das obere Ende fliegt vorbei, das untere baut sich
           riesig auf und verglueht davor. Zwei verschiedene Bewegungen
           aus einer Formel. */
        vz: vorbei ? -(7 + r() * 4.5) : -(0.25 + r() * 0.55),
        dreh: r() * 6.283, vdreh: (r() - 0.5) * 9,
        /* Das Dreieck im Packbild (Anteile 0..1) und sein Schwerpunkt.
           Der Schwerpunkt ist der Drehpunkt: ein Splitter, der um die
           Bildmitte statt um sich selbst dreht, schlingert. */
        p: p, cu: cu, cv: cv, rm: drei[i].rm,
        /* Merkmal, nicht Zierde: die beiden Gruppen gehorchen
           unterschiedlichen Regeln (die eine streut in der Ebene, die
           andere schiesst nach vorn), und ein Selbsttest, der sie
           vermischt, misst ein Mittel aus zwei Sachen. Genau daran ist
           der Schritt „Randstueck schneller als Mittelstueck" beim
           Einbau der Kamerafahrt rot geworden. */
        vorbei: vorbei,
        leben: 1, tempo: 0.62 + r() * 0.35,
      });
    }

    /* --- Funken: schnell, hell, mit Schweif --- */
    var f_n = anzahl("funke", karten);
    for (i = 0; i < f_n; i++) {
      /* Der goldene Winkel streut gleichmaessig OHNE ein Muster zu
         bilden. Ein gleichmaessiger Kreis ergaebe Speichen — genau der
         Fehler, den die CSS-Fassung hatte und der sie als Farbrad
         verraten hat. */
      w = (i * 2.39996323) + r() * 0.35;
      sp = 0.95 + r() * 1.35;
      teile.push({
        art: ART.FUNKE,
        x: 0, y: 0, z: Z_KAMERA,
        vx: Math.cos(w) * sp, vy: Math.sin(w) * sp,
        vz: -(r() * 0.5),
        dicke: 0.6 + r() * 1.8,
        leben: 1, tempo: 0.9 + r() * 0.9,
        weiss: r() < 0.35,   /* ein Drittel weissgluehend, der Rest farbig */
      });
    }

    /* --- Glut: schwer, faellt, gibt Boden --- */
    var g_n = anzahl("glut", karten);
    for (i = 0; i < g_n; i++) {
      w = r() * 6.283; sp = 0.25 + r() * 0.6;
      teile.push({
        art: ART.GLUT,
        x: 0, y: 0, z: Z_KAMERA,
        vx: Math.cos(w) * sp, vy: Math.sin(w) * sp - 0.25,
        vz: -(r() * 0.3),
        r: 0.004 + r() * 0.008,
        leben: 1, tempo: 0.62 + r() * 0.4,
      });
    }

    /* --- Staub: treibt, nimmt der Luft die Leere --- */
    var s_n = anzahl("staub", karten);
    for (i = 0; i < s_n; i++) {
      w = r() * 6.283; sp = 0.05 + r() * 0.25;
      teile.push({
        art: ART.STAUB,
        x: (r() - 0.5) * 0.5, y: (r() - 0.5) * 0.5, z: Z_KAMERA,
        vx: Math.cos(w) * sp, vy: Math.sin(w) * sp - 0.08,
        vz: 0,
        r: 0.0015 + r() * 0.003,
        leben: 1, tempo: 0.60 + r() * 0.25,
      });
    }

    /* --- Die Druckwelle: genau EINE ---
       Zwei Wellen lesen sich als Fehler, nicht als Wucht. */
    teile.push({ art: ART.WELLE, x: 0, y: 0, z: Z_KAMERA,
                 vx: 0, vy: 0, vz: 0, leben: 1, tempo: 1.15 });

    return teile;
  }

  /* schritt(teile, dt) — EIN Zeitschritt, dt in Sekunden.
     Gibt die Zahl der noch lebenden Teilchen zurueck. Tote Teilchen
     werden NICHT aus der Liste entfernt: das Umsortieren eines Feldes
     mitten in der Animation kostet mehr als das Ueberspringen, und die
     Liste lebt ohnehin nur zwei Sekunden. */
  function schritt(teile, dt) {
    var lebend = 0;
    for (var i = 0; i < teile.length; i++) {
      var t = teile[i];
      if (t.leben <= 0) continue;

      t.leben -= dt * t.tempo;
      if (t.leben <= 0) { t.leben = 0; continue; }

      if (t.art === ART.WELLE) { lebend++; continue; }

      var name = t.art === ART.SPLITTER ? "splitter"
               : t.art === ART.FUNKE ? "funke"
               : t.art === ART.GLUT ? "glut" : "staub";
      /* Luftwiderstand als Potenz von dt, nicht als Multiplikation je
         Bild: sonst haengt die Bremswirkung an der Bildrate, und die
         Szene laeuft auf einem schnellen Geraet anders als auf einem
         langsamen. Das ist ein Fehler, den man erst auf dem Geraet sieht. */
      var b = Math.pow(LUFT[name], dt * 60);

      /* ⚠ ZWEITE FASSUNG, 30.07.2026. Hier stand `t.x += t.vx * dt` —
         ein Euler-Schritt. Der ist bei exponentieller Bremsung SYSTEMATISCH
         zu weit: er rechnet den ganzen Schritt mit der Anfangs-
         geschwindigkeit, obwohl das Teilchen unterwegs langsamer wird. Bei
         60 fps faellt das kaum auf, bei 30 fps schon.
         Der Selbsttest hat es gemeldet, als eine andere Zufallsfolge einen
         SCHNELLEREN Funken an die Messstelle brachte: 0,079 Abweichung
         zwischen 15 und 60 fps statt 0,054. Die Versuchung war, die
         Schwelle zu lockern. Das waere das Einfrieren eines Fehlers.
         Jetzt EXAKT: fuer v(t) = v0 · k^t mit k = LUFT^60 ist der Weg
         v0 · (k^dt − 1) / ln k. Mit b = k^dt ist das (b − 1)/(60·ln LUFT).
         Fuer kleine dt geht der Faktor gegen dt; fuer grosse bleibt er
         richtig. Damit ist die Bewegung ohne Schwerkraft bildratenUNABHAENGIG,
         nicht nur „fast". */
      var weg = (b - 1) / (60 * Math.log(LUFT[name]));

      /* Die Schwerkraft auf halbe Schritte verteilt (vor und nach dem Weg).
         Ein ganzer Stoss vor oder nach der Wegstrecke ist erster Ordnung
         in dt und schleppt die Bildratenabhaengigkeit wieder herein — genau
         dort, wo sie gerade herausgerechnet wurde. */
      var gh = (SCHWERE[name] / 1000) * dt / 2;
      t.vy += gh;

      t.x += t.vx * weg;
      t.y += t.vy * weg;
      t.z += t.vz * weg;

      t.vx *= b; t.vy *= b; t.vz *= b;
      t.vy += gh;

      if (t.vdreh) t.dreh += t.vdreh * dt;

      /* An der Kamera vorbei = aus dem Bild. */
      if (t.z < Z_WEG) { t.leben = 0; continue; }
      lebend++;
    }
    return lebend;
  }

  /* Skalierung aus der Tiefe. Ein Teilchen bei z = 1 ist normal gross,
     eines kurz vor der Kamera riesig. Der Deckel bei 6 verhindert, dass
     ein einzelner Splitter den ganzen Bildschirm zumalt. */
  function skala(z) {
    var s = Z_KAMERA / Math.max(0.08, z);
    return Math.min(6, s);
  }

  var API = {
    ART: ART, MENGE: MENGE, LUFT: LUFT, SCHWERE: SCHWERE,
    Z_KAMERA: Z_KAMERA, Z_WEG: Z_WEG,
    rng: rng, anzahl: anzahl, erzeuge: erzeuge, schritt: schritt, skala: skala,
  };

  if (typeof window !== "undefined") window.ArenaPackFX = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ================= Selbsttest (node arena_packfx.js) ============== */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var ok = 0, fail = 0;
    function check(n, w, z) {
      if (w) { ok++; console.log("  ok   " + n + (z !== undefined ? "  " + z : "")); }
      else { fail++; console.log("  FEHL " + n + (z !== undefined ? "  " + z : "")); }
    }
    console.log("\narena_packfx.js — Selbsttest\n");

    /* --- 1. Determinismus --- */
    var a = erzeuge(5, 42), b = erzeuge(5, 42), c = erzeuge(5, 43);
    check("derselbe Startwert ergibt dieselbe Sprengung",
      JSON.stringify(a) === JSON.stringify(b));
    check("ein anderer Startwert ergibt eine andere",
      JSON.stringify(a) !== JSON.stringify(c));
    check("kein Math.random im Ergebnis (zweimal erzeugt, gleich)",
      JSON.stringify(erzeuge(11, 7)) === JSON.stringify(erzeuge(11, 7)));

    /* --- 2. Die Menge skaliert mit dem Packinhalt --- */
    var klein = erzeuge(5, 1).length, gross = erzeuge(11, 1).length;
    check("ein Arkan-Pack reisst heftiger auf als ein Bronze-Pack",
      gross > klein, klein + " gegen " + gross);
    check("aber der Deckel greift, damit die Bildrate haelt",
      erzeuge(200, 1).length < erzeuge(11, 1).length * 4,
      erzeuge(200, 1).length + " bei 200 Karten");
    check("die Zahl der Wellen ist GENAU eins, egal wie gross das Pack",
      erzeuge(5, 1).filter(function (t) { return t.art === ART.WELLE; }).length === 1 &&
      erzeuge(24, 1).filter(function (t) { return t.art === ART.WELLE; }).length === 1);

    /* --- 3. Alle Arten kommen vor --- */
    var arten = {};
    erzeuge(5, 3).forEach(function (t) { arten[t.art] = 1; });
    check("jede der fuenf Arten ist vertreten",
      Object.keys(arten).length === 5, Object.keys(arten).join(","));

    /* --- 4. Die Splitter zerlegen das GANZE Packbild ---
       ⚠ Diese Gruppe ist am 30.07.2026 NEU GESCHRIEBEN worden, nicht
       angepasst. Die alte Fassung prueft Rechtecke (`sx/sy/sw/sh`) und
       waere nach dem Umbau auf den Bruchfaecher schlicht nicht mehr
       aufgerufen worden — ein Test, der eine abgeschaffte Bauweise
       einfriert, ist schlimmer als keiner. */
    var sp = erzeuge(5, 9).filter(function (t) { return t.art === ART.SPLITTER; });
    check("jeder Splitter ist ein Dreieck mit drei Eckpunkten",
      sp.length > 0 && sp.every(function (t) {
        return t.p && t.p.length === 3 && t.p.every(function (e) { return e.length === 2; });
      }));
    check("kein Eckpunkt liegt jenseits des Packbildes",
      sp.every(function (t) {
        return t.p.every(function (e) {
          return e[0] >= -0.001 && e[0] <= 1.001 && e[1] >= -0.001 && e[1] <= 1.001;
        });
      }));
    /* Flaeche ueber die Kreuzproduktformel. Der Bruchfaecher deckt das
       Bild bis auf die vier Ecken, die eine gerade Sehne zwischen zwei
       Randpunkten abschneidet — das sind wenige Prozent und im Flug
       unsichtbar. Unter 0,80 waere die Zerlegung dagegen kein Bruch mehr,
       sondern ein Streumuster mit Loechern. */
    function flaeche(t) {
      var p = t.p;
      return Math.abs((p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) -
                      (p[2][0] - p[0][0]) * (p[1][1] - p[0][1])) / 2;
    }
    var gedeckt = sp.reduce(function (s, t) { return s + flaeche(t); }, 0);
    check("die Splitter decken das Packbild nahezu vollstaendig ab",
      gedeckt > 0.80 && gedeckt < 1.02, (gedeckt * 100).toFixed(1) + " %");
    check("die Stuecke sind NICHT alle gleich gross (kein Tortenschnitt)",
      new Set(sp.map(function (t) { return flaeche(t).toFixed(4); })).size > sp.length * 0.7,
      new Set(sp.map(function (t) { return flaeche(t).toFixed(4); })).size + " von " + sp.length);
    /* Gegenprobe zur Flaechenmessung: ein absichtlich geschrumpftes
       Dreieck MUSS die Deckung unter die Schwelle druecken. Ohne diesen
       Schritt koennte die Formel konstant 1 liefern und der Test waere
       nicht rot zu bekommen — genau der Fehler, der an diesem Tag zweimal
       aufgetreten ist. */
    var geschrumpft = erzeuge(5, 9).filter(function (t) { return t.art === ART.SPLITTER; })
      .map(function (t) {
        return { p: t.p.map(function (e) { return [0.5 + (e[0] - 0.5) * 0.5, 0.5 + (e[1] - 0.5) * 0.5]; }) };
      });
    check("GEGENPROBE: halbierte Dreiecke fallen unter die Deckungsschwelle",
      geschrumpft.reduce(function (s, t) { return s + flaeche(t); }, 0) < 0.80);
    /* Der Ringriss liegt je Sektor auf einem ANDEREN Radius. Sonst
       zeichnet der Bruch einen sichtbaren Kreis mitten durchs Packbild,
       und die Zerlegung liest sich als Absicht statt als Bruch.
       ⚠ Dieser Schritt fehlte in der ersten Fassung. Der Mutationstest hat
       es gezeigt: `rm` auf 0,46 festgenagelt — alle 28 Schritte gruen. Die
       Streuung ist damit die dritte Eigenschaft an diesem Tag, die
       plausibel im Code stand und von nichts geprueft war.
       Verlangt: mindestens zwei Drittel der Sektoren mit eigenem Radius
       und eine Spannweite von mindestens 0,10. */
    var radien = sp.map(function (t) { return t.rm; });
    var eigene = new Set(radien.map(function (v) { return v.toFixed(4); })).size;
    var spanne = Math.max.apply(null, radien) - Math.min.apply(null, radien);
    check("der Ringriss liegt je Sektor auf einem anderen Radius",
      eigene >= Math.ceil(sp.length / 3 * 0.66) && spanne >= 0.10,
      eigene + " verschiedene, Spannweite " + spanne.toFixed(3));

    /* Der Schwerpunkt ist der Drehpunkt beim Zeichnen. Liegt er nicht im
       Dreieck, schlingert der Splitter um einen Punkt neben sich. */
    check("der gemerkte Schwerpunkt stimmt mit den Eckpunkten ueberein",
      sp.every(function (t) {
        return Math.abs((t.p[0][0] + t.p[1][0] + t.p[2][0]) / 3 - t.cu) < 1e-9 &&
               Math.abs((t.p[0][1] + t.p[1][1] + t.p[2][1]) / 3 - t.cv) < 1e-9;
      }));

    /* --- 5. Alles fliegt zur Kamera, nichts von ihr weg --- */
    check("Splitter fliegen zur Kamera, nicht von ihr weg",
      sp.every(function (t) { return t.vz < 0; }));

    /* ⚠ Und eine MINDERHEIT fliegt VORBEI. Nicht an `vz` gemessen,
       sondern am Ergebnis: wie viele Stuecke erreichen die Kamera
       ueberhaupt (z < Z_WEG), bevor ihre Lebenszeit endet? Eine Pruefung
       auf `vz < -1.5` haette die Absicht festgeschrieben, nicht die
       Wirkung — und waere gruen geblieben, wenn der Luftwiderstand die
       Stuecke vorher ausbremst.
       Zwischen 10 % und 45 %: darunter kommt die Kamerafahrt nicht
       zustande, darueber ist das Bild zugemalt. */
    var t5 = erzeuge(11, 9);
    var spAlle = t5.filter(function (t) { return t.art === ART.SPLITTER; });
    var vorbei = 0;
    spAlle.forEach(function (t) { t.__vorbei = false; });
    for (var s5 = 0; s5 < 240; s5++) {
      schritt(t5, 1 / 60);
      spAlle.forEach(function (t) {
        if (!t.__vorbei && t.z < Z_WEG) { t.__vorbei = true; vorbei++; }
      });
    }
    var anteil = vorbei / spAlle.length;
    check("eine Minderheit der Splitter fliegt an der Kamera VORBEI",
      anteil >= 0.10 && anteil <= 0.45,
      vorbei + " von " + spAlle.length + " = " + (anteil * 100).toFixed(0) + " %");
    /* Und die, die vorbeifliegen, werden dabei WIRKLICH gross — sonst ist
       die Kamerafahrt eine Behauptung. Ein Deckel von 6 heisst: das Stueck
       wird sechsfach. Verlangt wird mindestens dreifach. */
    var maxSkala = 0;
    var t5b = erzeuge(11, 9);
    for (var s6 = 0; s6 < 240; s6++) {
      schritt(t5b, 1 / 60);
      t5b.forEach(function (t) {
        if (t.art === ART.SPLITTER && t.leben > 0) {
          var k = skala(t.z); if (k > maxSkala) maxSkala = k;
        }
      });
    }
    check("ein vorbeifliegendes Stueck wird dabei mindestens dreifach gross",
      maxSkala >= 3, "groesste Skala " + maxSkala.toFixed(2));

    /* ⚠ UND ES IST DABEI IM BILD. Das ist der Schritt, der gefehlt hat.
       Die beiden Schritte darueber waren gruen, waehrend auf dem
       Bildschirm kein einziges grosses Stueck zu sehen war: die
       Perspektivskala vergroessert das Stueck UND schiebt seine Bildlage
       nach aussen (`mitte + x · Breite · skala`), also war es draussen,
       bevor es gross wurde. Eine Messung der TIEFE kann das nicht finden —
       gemessen werden muss die BILDLAGE.
       Die Buehne reicht von -0,5 bis +0,5 Breiten. Verlangt wird ein
       Stueck mit mindestens dreifacher Skala, dessen Mittelpunkt bei
       hoechstens 0,5 Breiten liegt, also im Bild oder direkt am Rand. */
    /* ⚠ Gezaehlt werden STUECKE, nicht Rahmen. Erste Fassung zaehlte
       Rahmen und verlangte „mehr als null" — die Mutation „Seitwaerts-
       bremse weg" blieb damit gruen. Der Grund: die Dreiecke rund um den
       Einschlagpunkt haben ohnehin fast keine Seitwaertsgeschwindigkeit
       (die Kraft waechst mit dem Abstand), also war IMMER eines in der
       Mitte, egal ob gebremst wird oder nicht. Verlangt wird jetzt, dass
       die MEHRHEIT der grossen Stuecke im Bild ist. */
    var grossGesamt = 0, grossImBild = 0;
    var t5c = erzeuge(11, 9);
    var gesehen = {};
    for (var s7 = 0; s7 < 240; s7++) {
      schritt(t5c, 1 / 60);
      for (var q = 0; q < t5c.length; q++) {
        var tq = t5c[q];
        if (tq.art !== ART.SPLITTER || tq.leben <= 0 || gesehen[q]) continue;
        var k = skala(tq.z);
        if (k < 3) continue;
        /* Jedes Stueck genau einmal, beim ERSTEN Erreichen der Groesse. */
        gesehen[q] = 1; grossGesamt++;
        if (Math.max(Math.abs(tq.x * k), Math.abs(tq.y * k)) <= 0.5) grossImBild++;
      }
    }
    check("und die grossen Stuecke sind IM BILD, nicht aus dem Rahmen gedriftet",
      grossGesamt > 0 && grossImBild / grossGesamt >= 0.7,
      grossImBild + " von " + grossGesamt + " grossen Stuecken in der Bildmitte");
    /* Die Wucht in der EBENE kommt aus dem Abstand zum Einschlag, nicht
       aus dem Zufall. Messbar daran, dass Rand und Mitte sich klar trennen.
       ⚠ NUR innerhalb der streuenden Gruppe. Die Vorbeiflieger sind
       seitwaerts absichtlich gebremst (Faktor 0,22); nimmt man sie mit
       hinein, misst der Schritt ein Mittel aus zwei verschiedenen Regeln
       und wurde beim Einbau der Kamerafahrt rot — bei voellig richtigem
       Verhalten. Das ist keine Lockerung: der Vergleich wird SCHAERFER,
       weil er nur noch Vergleichbares vergleicht, und die zweite Gruppe
       bekommt ihren eigenen Schritt darunter. */
    function wucht(t) { return Math.sqrt(t.vx * t.vx + (t.vy + 0.15) * (t.vy + 0.15)); }
    function abstand(t) { return Math.sqrt(Math.pow(t.cu - 0.5, 2) + Math.pow(t.cv - 0.5, 2)); }
    var streuer = sp.filter(function (t) { return !t.vorbei; })
                    .sort(function (a, b) { return abstand(a) - abstand(b); });
    check("ein Randstueck fliegt schneller als das Mittelstueck",
      streuer.length > 2 &&
      wucht(streuer[streuer.length - 1]) > wucht(streuer[0]) * 1.5,
      wucht(streuer[0]).toFixed(2) + " innen gegen " +
      wucht(streuer[streuer.length - 1]).toFixed(2) + " aussen, " +
      streuer.length + " Streuer");
    /* Und die andere Gruppe steckt ihre Wucht nach VORN statt in die
       Ebene. Ohne diesen Schritt waere das Wegfiltern oben ein
       Wegschauen. */
    var flieger = sp.filter(function (t) { return t.vorbei; });
    check("ein Vorbeiflieger steckt seine Wucht nach vorn, nicht zur Seite",
      flieger.length > 0 && flieger.every(function (t) {
        return Math.abs(t.vz) > wucht(t) * 4;
      }),
      flieger.length + " Vorbeiflieger");

    /* --- 6. Funken sind Licht, kein Material --- */
    check("Funken fallen NICHT (Licht hat kein Gewicht)", SCHWERE.funke === 0);
    check("Glut fällt dagegen schon", SCHWERE.glut > 0);

    /* --- 7. Die Bewegung ist bildratenunabhaengig ---
       Derselbe Zeitraum in grossen und in kleinen Schritten muss
       (nahezu) dieselbe Lage ergeben. Laeuft das auseinander, sieht die
       Szene auf einem schnellen Geraet anders aus als auf einem
       langsamen — ein Fehler, den man erst auf dem Geraet bemerkt. */
    function lageNach(dt, n, art, seed) {
      var t = erzeuge(5, seed || 5);
      for (var i = 0; i < n; i++) schritt(t, dt);
      var f = t.filter(function (x) { return x.art === art; })[0];
      return f ? [f.x, f.y] : [0, 0];
    }
    function abwFuer(art) {
      var grob = lageNach(1 / 15, 15, art), fein = lageNach(1 / 60, 60, art);
      return Math.abs(grob[0] - fein[0]) + Math.abs(grob[1] - fein[1]);
    }
    /* ⚠ Die Schwelle ist am 30.07.2026 VERSCHAERFT worden, von 0,06 auf
       0,004 — nicht gelockert. Mit exakter Wegintegration ist der Rest nur
       noch Gleitkomma-Rauschen. Eine Schwelle, die den behobenen Fehler
       noch durchliesse, wuerde ihn beim naechsten Mal nicht melden. */
    check("ein FUNKE landet bei 15 und bei 60 fps an derselben Stelle",
      abwFuer(ART.FUNKE) < 0.004, "Abweichung " + abwFuer(ART.FUNKE).toFixed(6));
    /* Und mit Schwerkraft. Glut ist der schwerste Fall (SCHWERE 900). Die
       halbierten Stoesse machen daraus zweite Ordnung — messbar daran,
       dass die Abweichung deutlich unter der eines Euler-Schritts liegt.
       Ein FUNKE allein haette das nie geprueft: er hat kein Gewicht, und
       genau der Zweig des Codes waere ungetestet geblieben. */
    check("und eine GLUT trotz Schwerkraft ebenfalls",
      abwFuer(ART.GLUT) < 0.01, "Abweichung " + abwFuer(ART.GLUT).toFixed(6));

    /* --- 8. Alles stirbt, nichts bleibt haengen --- */
    var t8 = erzeuge(11, 11), runden = 0, lebend = 1;
    while (lebend > 0 && runden < 600) { lebend = schritt(t8, 1 / 60); runden++; }
    check("nach hoechstens 10 s ist kein Teilchen mehr uebrig",
      lebend === 0, runden + " Bilder = " + (runden / 60).toFixed(2) + " s");
    /* ⚠ Die Grenze ist NICHT die Szenendauer, sondern der Moment, in dem
       der Spieler zu tippen beginnt. Der Bruch liegt bei 2200 ms, das
       Deck schwebt ab 3120 ms — ab da gehoert die Aufmerksamkeit den
       Karten. Teilchen, die dann noch quer durchs Bild fliegen, ziehen
       den Blick von der Enthuellung weg. 2,0 s nach dem Bruch ist die
       Grenze; der erste Lauf lag bei 4,32 s, weil der Staub mit tempo
       0,22 ganze 4,5 s lebte. */
    check("und alles ist durch, bevor der Spieler zu tippen beginnt",
      runden / 60 <= 2.0, (runden / 60).toFixed(2) + " s nach dem Bruch");

    /* --- 9. Tiefenskalierung --- */
    check("ein Teilchen an der Kamera ist groesser als eines dahinter",
      skala(0.2) > skala(1));
    check("die Skala ist gedeckelt, damit kein Splitter das Bild zumalt",
      skala(0.0001) <= 6, String(skala(0.0001)));

    /* --- 10. Kaputte Eingaben --- */
    check("ohne Kartenzahl entsteht trotzdem eine Sprengung",
      erzeuge(undefined, 1).length > 0);
    check("ohne Startwert entsteht trotzdem eine Sprengung",
      erzeuge(5).length > 0);
    check("ein Schritt mit dt = 0 aendert nichts und kracht nicht",
      (function () {
        var t = erzeuge(5, 2), vor = JSON.stringify(t);
        schritt(t, 0);
        return JSON.stringify(t) === vor;
      })());

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
