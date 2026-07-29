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
 * Prozentzahlen (23.4 %, 71.5 %, 76.2 %) — der naechste Leser haelt sie
 * fuer ungefaehr und rundet sie. Genau davor schuetzt diese Datei:
 * sie prueft die drei Marken, die den Effekt tragen.
 *
 * DIE DREI MARKEN
 *   Atemzug zurueck  550-800 ms   die Glut FAELLT wieder ab
 *   Bruch            1680-1790    110 ms von 0,4 auf 0,89
 *   Asymmetrie       530 ms hinauf gegen 120 ms hinunter (4,4:1)
 *
 * Der Rueckfall ist der Teil, den Nachbauten weglassen, weil er sich
 * beim Ansehen wie eine Panne anfuehlt. Ohne ihn wirkt der Knall billig.
 * Eine Pruefung, die nur „es blitzt irgendwann" sagt, wuerde das nicht
 * merken.
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
  const kurve = await p.evaluate(() => {
    let text = "";
    for (const s of document.styleSheets) {
      let r; try { r = s.cssRules; } catch (e) { continue; }
      for (const rule of r) if (rule.name === "pkglut") text = rule.cssText;
    }
    if (!text) return null;
    const marken = {};
    text.replace(/([\d.]+)%\s*\{([^}]*)\}/g, (_, pct, body) => {
      const m = /opacity:\s*([\d.]+)/.exec(body);
      if (m) marken[pct] = parseFloat(m[1]);
    });
    return marken;
  });
  pruef("die Glutkurve @keyframes pkglut existiert", !!kurve);

  if (kurve) {
    const bei = pct => kurve[pct];
    // Millisekunde -> Prozent bei 2350 ms Gesamtdauer.
    const puls = bei("23.4"), tal = bei("34"), laden = bei("71.5"),
          bruch = bei("76.2"), spitze = bei("82.1"), abfall = bei("87.2");

    pruef("erster Puls bei 550 ms ist gesetzt", puls > 0.1 && puls < 0.3, "opacity " + puls);
    /* DIE wichtigste Aussage der Datei. */
    pruef("Atemzug zurueck: bei 800 ms faellt die Glut wieder ab",
      tal !== undefined && tal < puls * 0.5, "550 ms " + puls + " -> 800 ms " + tal);
    pruef("Hauptladung bei 1680 ms liegt ueber dem ersten Puls",
      laden > puls, laden + " gegen " + puls);
    pruef("Bruch bei 1790 ms springt auf ueber 0,8", bruch > 0.8, "opacity " + bruch);
    pruef("Bruch ist ein SPRUNG, nicht ein Anstieg (mehr als das Doppelte)",
      bruch > laden * 2, laden + " -> " + bruch);
    pruef("Spitze bei 1930 ms ist der Hoechstwert", spitze >= bruch, spitze + " gegen " + bruch);
    /* Aufbau 1150->1680 = 530 ms, Abbau 1930->2050 = 120 ms. */
    pruef("Aufbau und Abbau sind asymmetrisch (Abfall unter 0,25)",
      abfall < 0.25, "opacity bei 2050 ms " + abfall);
  }

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
  pruef("fuenf Karten liegen bereit", waehrend.karten === 5, waehrend.karten + " Stueck");
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
  await p.waitForTimeout(2700);
  const danach = await p.evaluate(() => ({
    offen: document.getElementById("packLayer").classList.contains("on"),
    raster: document.querySelectorAll("#packGrid .pcard").length,
  }));
  pruef("die Szene endet ohne Zutun", !danach.offen);
  pruef("danach steht das Kartenraster", danach.raster > 0, danach.raster + " Karten");

  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);

  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
