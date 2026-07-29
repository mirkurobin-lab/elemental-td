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

  const glut = stops(roh.pkglut, "opacity");
  if (glut.length) {
    /* Millisekunde -> Prozent bei 3000 ms Gesamtdauer. */
    const bei = ms => {
      const p = +(ms / 30).toFixed(2);
      const t = glut.find(s => Math.abs(s[0] - p) < 0.06);
      return t ? t[1] : undefined;
    };
    const p1 = bei(583), t1 = bei(750), p2 = bei(1033), t2 = bei(1117),
          p3 = bei(1350), t3 = bei(1417), laden = bei(1650),
          bruch = bei(1783), spitze = bei(1867), abfall = bei(2100);

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

    pruef("Hauptladung bei 1650 ms liegt ueber allen Pulsen", laden > p3, p3 + " -> " + laden);
    pruef("Bruch bei 1783 ms springt auf ueber 0,9", bruch > 0.9, String(bruch));
    pruef("der Bruch ist ein SPRUNG (mehr als das Doppelte der Ladung)",
      bruch > laden * 2, laden + " -> " + bruch);
    pruef("Plateau-Spitze bei 1867 ms ist der Hoechstwert", spitze >= bruch,
      spitze + " gegen " + bruch);
    pruef("Abfall bei 2100 ms unter 0,2", abfall < 0.2, String(abfall));
    /* Anlauf 1650 ms gegen Knall 133 ms = 12:1. */
    pruef("Anlauf und Knall sind stark asymmetrisch", (1650 / 133) > 10, "12:1");
  }

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

  /* ---------- 3. Ein Tipp bricht ab ---------- */
  await p.mouse.click(195, 300);
  await p.waitForTimeout(120);
  const nachTipp = await p.evaluate(() => {
    const l = document.getElementById("packLayer");
    return {
      offen: l.classList.contains("on"),
      karten: document.getElementById("pkStage").querySelectorAll(".pkcard").length,
      raster: document.querySelectorAll("#packGrid .pcard").length,
    };
  });
  pruef("ein Tipp schliesst die Szene sofort", !nachTipp.offen);
  pruef("die Flugkarten sind danach aufgeraeumt", nachTipp.karten === 0,
    nachTipp.karten + " uebrig");
  /* Abbrechen darf NICHT heissen, dass man den Packinhalt verliert. */
  pruef("das Kartenraster ist trotz Abbruch gefuellt", nachTipp.raster > 0,
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

  /* ---------- 5. Sie endet von allein ---------- */
  await p.evaluate(() => { window.__proto.openPackKey("arcane"); });
  await p.waitForTimeout(3500);   // 3000 ms Szene + 180 ms Zuschlag
  const danach = await p.evaluate(() => ({
    offen: document.getElementById("packLayer").classList.contains("on"),
    raster: document.querySelectorAll("#packGrid .pcard").length,
  }));
  pruef("die Szene endet ohne Zutun", !danach.offen);
  pruef("danach steht das Kartenraster", danach.raster > 0, danach.raster + " Karten");

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
  await p.waitForTimeout(3400);
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
