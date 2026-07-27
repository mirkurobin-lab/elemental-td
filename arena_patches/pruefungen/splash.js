/* Startbildschirm: Schriftzug traegt, Balken luegt nicht, niemand
   wird ausgesperrt. */
const { chromium } = require("playwright-core");
let ok = 0, fehl = 0;
const pruef = (n, w, z) => { if (w) ok++; else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); } };
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = []; p.on("pageerror", e => jsF.push(String(e).slice(0, 110)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html", { waitUntil: "commit", timeout: 40000 });
  // Sofort messen: der Bildschirm muss ab dem ERSTEN Frame stehen.
  await p.waitForTimeout(120);
  const sofort = await p.evaluate(() => {
    const l = document.getElementById("splashLayer");
    if (!l) return null;
    const r = l.getBoundingClientRect();
    return { deckt: r.width >= 390 && r.height >= 844, z: getComputedStyle(l).zIndex };
  });
  pruef("Startbildschirm steht vom ersten Frame an", !!sofort && sofort.deckt,
        JSON.stringify(sofort));

  await p.waitForTimeout(2600);
  const t = await p.evaluate(() => {
    const ti = document.querySelector(".splashtitel").getBoundingClientRect();
    const worte = [...document.querySelectorAll(".sptop,.spmid,.spsub")].map(e => e.textContent.trim());
    const cs = getComputedStyle(document.querySelector(".spmid"));
    return { obenAnteil: ti.top / 844, unten: ti.bottom / 844, worte,
             familie: cs.fontFamily, groesse: parseFloat(cs.fontSize),
             // Schriftzug als TEXT, nicht als Bild
             istText: !!document.querySelector(".spmid").firstChild &&
                      document.querySelector(".spmid").firstChild.nodeType === 3 };
  });
  pruef("der Schriftzug nennt Arcane Prism und Tower Defense",
        t.worte.join(" ") === "ARCANE PRISM TOWER DEFENSE", t.worte.join(" | "));
  pruef("er ist echte Schrift, kein Bild", t.istText);
  pruef("er steht in der gemessenen ruhigen Zone (oben, nicht mittig)",
        t.unten <= 0.44, "endet bei " + (t.unten * 100).toFixed(1) + " %");
  pruef("er nutzt die Gold-Ueberschriften-Familie", /Cinzel|Georgia/.test(t.familie), t.familie);

  const bal = await p.evaluate(() => {
    const f = document.getElementById("splFill");
    return { breite: parseFloat(getComputedStyle(f).width), txt: document.getElementById("splTxt").textContent };
  });
  pruef("der Ladebalken bewegt sich", bal.breite > 0, bal.breite + " px");
  pruef("der Ladetext ist deutsch und konkret", /…$/.test(bal.txt), bal.txt);

  // Notausgang: nach spaetestens 6 s + Blende ist der Bildschirm weg.
  await p.waitForTimeout(5200);
  const weg = await p.evaluate(() => {
    const l = document.getElementById("splashLayer");
    return { versteckt: getComputedStyle(l).display === "none" || l.classList.contains("weg"),
             homeDa: document.getElementById("viewHome").classList.contains("active") };
  });
  pruef("der Startbildschirm gibt die App wieder frei", weg.versteckt);
  pruef("dahinter steht die Startseite", weg.homeDa);
  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);
  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close(); process.exit(fehl ? 1 : 0);
})();
