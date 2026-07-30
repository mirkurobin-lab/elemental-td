/* ===================================================================
 * shop_raender.js — der Rand sagt, was drin ist.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Die Kristall-Kacheln trugen einen GOLDENEN Rand, die Gold-Kacheln
 * einen GRUENEN. Exakt vertauscht, ueber Wochen, und im Code faellt es
 * beim Lesen nicht auf: die Klassen hiessen `fr-orange` und `fr-green`
 * — nach ihrer Farbe. Ein Klassenname, der die Farbe nennt, sagt nichts
 * darueber, ob sie zum Inhalt passt.
 *
 * Die Klassen heissen jetzt nach ihrer Rolle (`fr-kristall`, `fr-gold`).
 * Das macht den Fehler beim Lesen sichtbar — aber nicht unmoeglich.
 * Deshalb misst diese Pruefung die TATSAECHLICH gezeichnete Randfarbe
 * und vergleicht ihren Farbton mit dem, was auf der Kachel steht.
 *
 * ZWEI BEDEUTUNGEN, ABSICHTLICH GETRENNT
 * --------------------------------------
 *   Rand nach INHALT          Kristalle gruen, Gold golden
 *   Rand nach PRODUKTFAMILIE  alle Booster-Packs blau, egal was drin
 *                             ist — hier ist der Rand ein Hinweis auf
 *                             die Warengruppe, nicht auf den Inhalt
 *
 * Geprueft wird der FARBTON (H im HSL-Raum), nicht der exakte Wert:
 * ein Feinschliff an der Saettigung soll die Pruefung nicht brechen,
 * ein Vertauschen von gruen und gold schon.
 *
 * AUFRUF
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node shop_raender.js
 * =================================================================== */
const { chromium } = require("playwright-core");

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; } else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); }
};

/* Farbton aus "rgb(r, g, b)". Rueckgabe 0-360, oder -1 wenn grau. */
function farbton(css) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(css || "");
  if (!m) return -1;
  const r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.06) return -1;                       // zu grau fuer eine Aussage
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}
/* Kreisfoermiger Abstand zweier Farbtoene, 0-180 Grad. */
function abstand(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
const nah = (h, soll, tol) => h >= 0 && abstand(h, soll) <= tol;

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 110)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html",
               { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2400);
  await p.evaluate(() => {
    document.querySelectorAll("#offerLayer,#loginLayer,#dailyLayer,#cineLayer,#splashLayer")
      .forEach(e => { e.style.display = "none"; });
    window.__proto.show("navShop");
  });
  await p.waitForTimeout(1200);

  const m = await p.evaluate(() => {
    const rand = e => e ? getComputedStyle(e).borderTopColor : null;
    const alle = s => [...document.querySelectorAll(s)];
    return {
      kristall: alle("#viewShop .prodcard.fr-kristall").map(rand),
      gold:     alle("#viewShop .prodcard.fr-gold").map(rand),
      packs:    alle("#viewShop .packshop .shopcard").map(rand),
      gratisPack: rand(document.querySelector("#packFreeBox .tagesband")),
      gratisGold: rand(document.querySelector("#goldFreeBox .tagesband")),
      vorrat:   rand(document.querySelector("#viewShop .vorratbox")),
      // Die alten Farb-Klassennamen duerfen nicht zurueckkehren.
      altKlassen: alle("[class*='fr-orange'],[class*='fr-green']").length,
    };
  });

  pruef("Kristall-Kacheln vorhanden", m.kristall.length > 0, m.kristall.length + " Stueck");
  pruef("Gold-Kacheln vorhanden", m.gold.length > 0, m.gold.length + " Stueck");

  // GRUEN ist ~135 Grad, GOLD ~35 Grad, BLAU ~210 Grad.
  m.kristall.forEach((c, i) =>
    pruef("Kristall-Kachel " + (i + 1) + " hat einen GRUENEN Rand",
      nah(farbton(c), 135, 45), c + " -> H " + farbton(c)));
  m.gold.forEach((c, i) =>
    pruef("Gold-Kachel " + (i + 1) + " hat einen GOLDENEN Rand",
      nah(farbton(c), 35, 30), c + " -> H " + farbton(c)));
  m.packs.forEach((c, i) =>
    pruef("Booster-Pack " + (i + 1) + " hat einen BLAUEN Rand",
      nah(farbton(c), 210, 40), c + " -> H " + farbton(c)));

  pruef("das Gratis-Tagespack traegt dieselbe Pack-Farbe",
    nah(farbton(m.gratisPack), 210, 40), m.gratisPack + " -> H " + farbton(m.gratisPack));
  pruef("das Gratis-Gold traegt die Gold-Farbe",
    nah(farbton(m.gratisGold), 35, 30), m.gratisGold + " -> H " + farbton(m.gratisGold));
  pruef("die Vorrats-Truhe traegt die Gold-Farbe",
    nah(farbton(m.vorrat), 35, 30), m.vorrat + " -> H " + farbton(m.vorrat));

  /* Die schaerfste Aussage der Datei: Kristall und Gold duerfen sich
     nicht ANGLEICHEN. Waeren beide golden, gingen alle Einzelpruefungen
     oben durch — nur die Unterscheidung waere weg. */
  const hK = farbton(m.kristall[0]), hG = farbton(m.gold[0]);
  pruef("Kristall und Gold sind klar unterscheidbar (>60 Grad Abstand)",
    hK >= 0 && hG >= 0 && abstand(hK, hG) > 60,
    "H " + hK + " gegen H " + hG);

  pruef("die alten Farb-Klassennamen sind verschwunden", m.altKlassen === 0,
    m.altKlassen + " Elemente");
  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);

  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
