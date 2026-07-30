/* ===================================================================
 * quoten.js — die Drop-Raten sind eine AUFLAGE, keine Zierde.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 *   Apple, App Store Review Guidelines 3.1.1 — „Apps offering ‚loot
 *   boxes' or other mechanisms that provide randomized virtual items for
 *   purchase must disclose the odds of receiving each type of item to
 *   customers PRIOR TO PURCHASE."
 *   Google Play, seit Mai 2019 — dieselbe Forderung.
 *
 * Eine fehlende Angabe kostet die Freigabe im Store. Eine FALSCHE Angabe
 * ist schlimmer als keine: sie ist eine Zusage, die das Spiel bricht.
 * Deshalb prueft diese Datei nicht, ob irgendwo Prozente stehen, sondern
 * ob die angezeigten Zahlen mit denen uebereinstimmen, aus denen das
 * Spiel wuerfelt.
 *
 * AUFRUF
 *   NODE_PATH=... PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node quoten.js
 * =================================================================== */
const { chromium } = require("playwright-core");
/* ⚠ AM EIGENEN ORT MESSEN (30.07.2026). Hier stand der feste Pfad
   /home/user/elemental-td/... — laeuft die Suite aus einem Worktree,
   prueft sie damit die HAUPT-Auscheckung und nicht die Datei, die
   danebenliegt. Der Pfad haengt jetzt an dieser Datei. */
const DATEI = "file://" + require("path").resolve(__dirname, "..", "ui_prototype.html");

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; } else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); }
};

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 120)));
  await p.goto(DATEI,
               { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2400);
  await p.evaluate(() => document.querySelectorAll(
    "#offerLayer,#loginLayer,#dailyLayer,#cineLayer,#splashLayer")
      .forEach(e => { e.style.display = "none"; }));

  /* ---------- 1. Die Rechnung selbst ---------- */
  const rechnung = await p.evaluate(() => {
    const AC = window.ArenaCards, raus = {};
    ["bronze", "silver", "gold", "arcane"].forEach(k => {
      const o = AC.oddsFor(k), def = AC.PACKS[k];
      raus[k] = {
        slots: o.cardSlots, garantie: o.guarantee, gewichte: def.weights.slice(),
        jeKarte: o.perSlot.map(t => +t.pct.toFixed(4)),
        jePack: o.perPack.map(t => +t.pct.toFixed(2)),
        garantiert: o.perPack.map(t => t.garantiert),
        supreme: o.supreme.pct,
      };
    });
    return raus;
  });

  Object.keys(rechnung).forEach(k => {
    const r = rechnung[k];
    /* Die angezeigte Rate je Karte MUSS das Gewicht sein, aus dem
       gewuerfelt wird — nicht eine daneben gepflegte Zahl. */
    pruef(k + ": je-Karte-Raten sind die Wuerfelgewichte",
      r.jeKarte.every((v, i) => Math.abs(v - r.gewichte[i]) < 1e-6),
      r.jeKarte.join("/") + " gegen " + r.gewichte.join("/"));
    /* Und die Pack-Rate muss die Garantie beruecksichtigen. Ohne sie
       waere die Angabe zu niedrig — also falsch. */
    r.garantiert.forEach((g, i) => {
      if (g) pruef(k + ": Stufe " + i + " ist garantiert und steht mit 100 %",
        r.jePack[i] === 100, String(r.jePack[i]));
    });
    pruef(k + ": Suprem steht mit 0 %", r.supreme === 0, String(r.supreme));
  });

  /* Die schaerfste Einzelaussage: Arcane liefert NICHT mehr aus jedem
     Pack ein Legendaeres. Auftraggeber, 29.07.2026. */
  pruef("Arcane garantiert KEIN Legendaeres mehr",
    rechnung.arcane.garantie === 3, "guarantee=" + rechnung.arcane.garantie);
  pruef("Arcane: Legendaer-Chance je Pack liegt bei 36 %",
    Math.abs(rechnung.arcane.jePack[4] - 36.2) < 0.4, rechnung.arcane.jePack[4] + " %");
  pruef("Arcane: Legendaer ist NICHT als garantiert markiert",
    rechnung.arcane.garantiert[4] === false);

  /* ---------- 2. Das ⓘ ist erreichbar, VOR dem Kauf ---------- */
  await p.evaluate(() => window.__proto.show("navShop"));
  await p.waitForTimeout(1200);
  const knoepfe = await p.evaluate(() => {
    const b = [...document.querySelectorAll("#viewShop [data-odds]")];
    return b.map(e => {
      const r = e.getBoundingClientRect();
      return { pack: e.getAttribute("data-odds"), w: Math.round(r.width), h: Math.round(r.height) };
    });
  });
  pruef("jedes kaufbare Pack im Shop hat ein ⓘ", knoepfe.length >= 3,
    knoepfe.map(x => x.pack).join(", "));
  /* Eine Pflichtangabe darf kein Nadeloehr sein — 24 px ist die
     Trefferschwelle, unter der man daneben tippt. */
  pruef("jedes ⓘ ist mindestens 24x24 px gross",
    knoepfe.every(x => x.w >= 24 && x.h >= 24),
    knoepfe.map(x => x.w + "x" + x.h).join(" "));

  /* ---------- 2b. ABDECKUNG: jede Kauf- und Öffnungsflaeche ----------
     Ein Agent hat 22 Stellen kartiert, an denen ein Pack gekauft, vergeben
     oder geoeffnet wird. Zwei trugen ein ⓘ. Diese Liste haelt fest, welche
     es tragen MUESSEN — nicht als Zahl („mindestens drei"), sondern
     namentlich: eine Zahl waere schon dann gruen, wenn irgendwo drei
     Knoepfe stehen, und genau so uebersieht man die vierte Flaeche.

     Die drei ersten sind nach Apple 3.1.1 / Google Play zwingend
     (Echtgeld bzw. Kristalle); die uebrigen sind Oeffnungsflaechen, wo
     die Angabe fachlich hingehoert. */
  const flaechen = [
    ["#packShop [data-odds]",       3, "die drei kaufbaren Booster"],
    ["#vorratShop [data-odds]",     1, "Vorrats-Pack (Kristalle, gewuerfelter Inhalt)"],
    ["#arenaPackBox [data-odds]",   2, "Arena- und Starter-Pack (Echtgeld, enthalten Booster)"],
    ["#apkRail [data-odds]",        1, "Arena-Karussell (Echtgeld, enthaelt Booster)"],
    ["#packFreeBox [data-odds]",    1, "Gratis-Tagespack"],
    ["#vaultShop [data-festinfo]",  1, "Kristalltresor — FESTE Ausschuettung, keine Quote"],
  ];
  for (const [sel, min, warum] of flaechen) {
    const n = await p.evaluate(s => document.querySelectorAll(s).length, sel);
    pruef("Abdeckung: " + warum, n >= min, n + " von mind. " + min + " (" + sel + ")");
  }

  /* Der Tresor darf KEINE Quotentabelle bekommen. Er zahlt einen festen,
     vorher sichtbaren Betrag aus (arena_vault.js, kein Math.random im
     ganzen Modul) und ist damit keine Loot-Box. Eine Quote dort waere
     nicht ueberfluessig, sondern falsch: sie behauptete einen Zufall,
     den es nicht gibt. */
  pruef("der Tresor traegt KEIN data-odds",
    (await p.evaluate(() => document.querySelectorAll("#vaultShop [data-odds]").length)) === 0);
  await p.click("#vaultShop [data-festinfo]");
  await p.waitForTimeout(300);
  const fest = await p.evaluate(() =>
    document.getElementById("oddsBox").textContent.replace(/\s+/g, " "));
  pruef("der Tresor sagt ausdruecklich, dass nichts gewuerfelt wird",
    /nichts gew(ü|ue)rfelt/i.test(fest), fest.slice(0, 80));
  /* Ohne Leerzeichen pruefen: benachbarte Tabellenzellen liefern in
     textContent „Kartenkeine" ohne Trenner. */
  pruef("und nennt Karten und Packs ausdruecklich mit „keine\"",
    /Karten\s*keine/.test(fest) && /Packs\s*keine/.test(fest), fest.slice(0, 140));
  pruef("im Tresor-Fenster steht KEIN Prozentwert", !/%/.test(fest), fest.slice(0, 100));
  await p.click("#oddsClose");
  await p.waitForTimeout(200);

  /* ---------- 3. Was im Fenster steht, stimmt mit der Rechnung ---------- */
  await p.click("#viewShop [data-odds='arcane']");
  await p.waitForTimeout(300);
  const fenster = await p.evaluate(() => {
    const l = document.getElementById("oddsLayer");
    return { offen: l.classList.contains("on"), versteckt: l.getAttribute("aria-hidden"),
             text: document.getElementById("oddsBox").textContent.replace(/\s+/g, " ") };
  });
  pruef("das ⓘ oeffnet das Fenster", fenster.offen);
  pruef("aria-hidden ist dabei false", fenster.versteckt === "false");
  pruef("die Legendaer-Rate je Karte steht drin (4,00 %)",
    /4,00\s*%/.test(fenster.text), fenster.text.slice(0, 90));
  pruef("die Pack-Chance 36,2 % steht drin", /36,2\s*%/.test(fenster.text));
  pruef("Suprem wird ausdruecklich als 0 genannt",
    /Suprem/.test(fenster.text) && /0,00\s*%/.test(fenster.text));
  pruef("der Fusionsweg zu Suprem wird erklaert",
    /3 Legend/i.test(fenster.text), fenster.text.slice(-140));
  pruef("der Pity-Stand steht dabei", /sp(ä|ae)testens/i.test(fenster.text));

  /* ---------- 4. Es laesst sich wieder schliessen ---------- */
  await p.click("#oddsClose");
  await p.waitForTimeout(200);
  pruef("Schliessen schliesst", await p.evaluate(() =>
    !document.getElementById("oddsLayer").classList.contains("on")));

  /* ---------- 5. Auch dort, wo geoeffnet wird ---------- */
  await p.evaluate(() => window.__proto.show("navPack"));
  await p.waitForTimeout(500);
  pruef("auch die Pack-Ansicht traegt ein ⓘ",
    await p.evaluate(() => !!document.querySelector("#viewPack [data-odds]")));
  /* Es wird bei jedem renderPity() neu erzeugt — ein Knopf aus dem
     statischen Markup waere nach dem ersten Rendern weg. */
  /* ⚠ Kein `&&`-Kurzschluss hier. In der ersten Fassung stand
     `window.__proto.renderPity && window.__proto.renderPity()` — und weil
     die Funktion damals gar nicht exportiert war, lief der Aufruf ins
     Leere, der Knopf blieb vom vorherigen Rendern stehen und der Schritt
     bestand, ohne etwas zu pruefen. Jetzt scheitert er laut, wenn der
     Export verschwindet. */
  pruef("renderPity ist von aussen aufrufbar",
    await p.evaluate(() => typeof window.__proto.renderPity === "function"));
  await p.evaluate(() => window.__proto.renderPity());
  await p.waitForTimeout(150);
  pruef("das ⓘ ueberlebt ein erneutes Rendern der Pity-Zeile",
    await p.evaluate(() => !!document.querySelector("#viewPack [data-odds]")));

  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);

  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
