/* ===================================================================
 * tresor.js — der Kristalltresor muss sich lohnen
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Vorgabe des Auftraggebers (30.07.2026): „dieser Beutel soll im
 * Verhaeltnis bisschen guenstiger sein wie ein normaler Kristall Kauf
 * weil man fuer den Beutel auch aktiv spielen muss zum fuellen (animiert
 * um mehr zu spielen und macht den Beutel attraktiver)."
 *
 * Vorher war es genau umgekehrt: der Tresor verlangte 2,50-3,33 ct je
 * Kristall, waehrend der Laden fuer eine Packung derselben Groesse
 * 0,72-1,69 ct nahm. Er war an JEDER Stufe das schlechteste Geschaeft im
 * Spiel — fuer Kristalle, die der Spieler sich vorher erspielt hatte.
 *
 * Das ist keine Preisfrage, sondern ein Widerspruch zur Mechanik. Der
 * Tresor verkauft nicht „moechtest du Gems?", sondern „moechtest du DEINE
 * Gems?" (so steht es im Kopf von arena_vault.js). Wer dafuer mehr
 * verlangt als der Laden, bestraft genau das Spielen, das die Mechanik
 * anregen soll.
 *
 * DIE ZUSAGE, die hier gemessen wird — und zwar GERECHNET, nicht
 * abgeschrieben:
 *
 *   1. Je Stufe liegt der Preis pro Kristall UNTER dem, was der Laden
 *      fuer eine Packung derselben Groesse nimmt.
 *   2. Der Preis pro Kristall SINKT mit jeder Stufe (so sagt es der
 *      Modulkopf zu).
 *   3. Alles rechnet in Franken — der Shop tut es auch, und zwei
 *      Waehrungen auf einem Bildschirm machen jeden Vergleich falsch,
 *      den der Spieler anstellt.
 *
 * ⚠ Die Ladenkurve wird NICHT als Zahlenreihe eingefroren, sondern aus
 * GEM_PACKS des Prototyps gelesen und log-log interpoliert. Aendert
 * jemand die Ladenpreise, wandert diese Pruefung mit — genau das ist der
 * Zweck. Eine abgeschriebene Kurve waere beim ersten Preiswechsel eine
 * Luege mit gruenem Balken.
 *
 *   export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tresor.js
 * ================================================================== */
const { chromium } = require("playwright-core");
const pfad = require("path");

const FILE = "file://" + pfad.resolve(__dirname, "..", "ui_prototype.html");

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; console.log("  ok   " + n + (z ? "  — " + z : "")); }
  else { fehl++; console.log("  FEHL " + n + (z ? "  — " + z : "")); }
};
const gegen = (n, erkannt, z) => {
  if (erkannt) { ok++; console.log("  ok   gegen: " + n + (z ? "  — " + z : "")); }
  else { fehl++; console.log("  GEGENPROBE BLIND: " + n + (z ? "  — " + z : "")); }
};

/* Was der Laden fuer eine Packung DIESER Groesse verlangt, in ct je
   Kristall. Zwischen zwei Staffeln wird log-log interpoliert: die
   Mengenstaffel ist eine Potenzkurve, keine Gerade — linear zu
   interpolieren wuerde die Mitte systematisch zu teuer schaetzen und der
   Pruefung damit eine Latte legen, die der Laden selbst nicht erfuellt. */
function ladenKurve(staffel, menge) {
  const r = staffel.map(s => [s.amt, s.preis / s.amt * 100]).sort((a, b) => a[0] - b[0]);
  if (menge <= r[0][0]) return r[0][1];
  if (menge >= r[r.length - 1][0]) return r[r.length - 1][1];
  for (let i = 0; i < r.length - 1; i++) {
    const [a0, c0] = r[i], [a1, c1] = r[i + 1];
    if (menge >= a0 && menge <= a1) {
      const t = Math.log(menge / a0) / Math.log(a1 / a0);
      return Math.exp(Math.log(c0) + t * (Math.log(c1) - Math.log(c0)));
    }
  }
  return r[r.length - 1][1];
}

(async () => {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const seite = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const jsFehler = [];
  seite.on("pageerror", e => jsFehler.push(e.message));
  await seite.goto(FILE);
  await seite.waitForTimeout(1600);

  console.log("\ntresor.js — der Kristalltresor muss sich lohnen\n");

  const daten = await seite.evaluate(() => {
    const V = window.ArenaVault;
    const packs = (window.__proto && window.__proto.GEM_PACKS) || null;
    return {
      caps: V ? V.VAULT_CAPS : null,
      preise: V ? V.VAULT_PRICES : null,
      /* Die Ladenstaffel kommt aus dem Prototyp. `price` ist dort ein
         Text („Fr. 18.–"), also wird die Zahl herausgeloest — und wenn
         das misslingt, faellt es hier auf und nicht still. */
      staffel: packs ? packs.map(p => ({
        name: p.name, amt: p.amt, roh: p.price,
        /* ⚠ NICHT „alles ausser Ziffern wegwerfen". Genau das stand hier
           und lieferte aus „Fr. 2.–" den Wert 0,20: der Punkt von „Fr."
           bleibt stehen, und parseFloat(".2.") ist 0,2. Die Ladenkurve
           war damit zehnmal zu billig, und der Vergleich meldete den
           Tresor als hoffnungslos teuer — ein Messfehler, der wie ein
           Produktfehler aussah. Aufgefallen ist er nur, weil die Tabelle
           mitgedruckt wird: „Laden 0,01 ct" ist offensichtlich Unsinn.
           Jetzt wird die erste Zahl GESUCHT statt der Rest weggeworfen. */
        preis: parseFloat(((String(p.price).match(/\d+(?:[.,]\d+)?/) || ["0"])[0])
          .replace(",", ".")),
      })) : null,
      preisText: V ? V.vault().priceText : null,
    };
  });

  if (!daten.caps || !daten.preise) {
    pruef("ArenaVault ist erreichbar", false, "VAULT_CAPS/VAULT_PRICES fehlen im Export");
  } else if (!daten.staffel) {
    pruef("GEM_PACKS ist fuer die Pruefung exportiert", false,
      "ohne die Ladenstaffel laesst sich „guenstiger als der Laden\" nicht rechnen");
  } else {
    const schlecht = daten.staffel.filter(p => !(p.preis > 0));
    pruef("jede Ladenstaffel traegt einen lesbaren Preis",
      schlecht.length === 0,
      schlecht.length ? schlecht.map(p => p.name + ' „' + p.roh + '"').join(", ")
        : daten.staffel.map(p => p.amt + "→" + p.preis.toFixed(2)).join(", "));

    /* ---- 1. GUENSTIGER ALS DER LADEN, an jeder Stufe ---- */
    const zeilen = daten.caps.map((c, i) => {
      const ct = daten.preise[i] / c * 100;
      const laden = ladenKurve(daten.staffel, c);
      return { stufe: i, cap: c, preis: daten.preise[i], ct: ct, laden: laden,
               vorteil: (laden - ct) / laden };
    });
    zeilen.forEach(z => console.log(
      "     Stufe " + z.stufe + ": " + String(z.cap).padStart(5) + " Gems  Fr. " +
      z.preis.toFixed(2).padStart(6) + "   " + z.ct.toFixed(2) + " ct  ·  Laden " +
      z.laden.toFixed(2) + " ct  ·  " + (z.vorteil * 100).toFixed(0) + " % besser"));

    const teurer = zeilen.filter(z => !(z.ct < z.laden));
    pruef("jede Tresorstufe ist je Kristall guenstiger als der Laden",
      teurer.length === 0,
      teurer.length === 0
        ? "Vorteil " + Math.round(Math.min(...zeilen.map(z => z.vorteil)) * 100) + "-" +
          Math.round(Math.max(...zeilen.map(z => z.vorteil)) * 100) + " %"
        : teurer.map(z => "Stufe " + z.stufe + ": " + z.ct.toFixed(2) +
            " ct gegen " + z.laden.toFixed(2) + " ct").join(" | "));

    /* Gegenprobe: die Rechnung kann ueberhaupt durchfallen. Ohne sie
       waere der Schritt auch bei einer kaputten Kurve gruen — genau der
       Fehler, den dieses Projekt an einem Tag dreimal gemacht hat. */
    gegen("die Rechnung wuerde einen zu teuren Tresor erkennen",
      (daten.caps[0] * 0 + (9.99 / daten.caps[0] * 100)) > ladenKurve(daten.staffel, daten.caps[0]),
      "ein Preis von Fr. 9.99 fuer " + daten.caps[0] + " Gems waere " +
      (9.99 / daten.caps[0] * 100).toFixed(2) + " ct und damit teurer als der Laden");

    /* ---- 2. DER PREIS JE KRISTALL SINKT MIT DER STUFE ---- */
    const steigt = [];
    for (let i = 1; i < zeilen.length; i++) {
      if (!(zeilen[i].ct < zeilen[i - 1].ct)) steigt.push(i);
    }
    pruef("der Preis je Kristall sinkt mit jeder Stufe",
      steigt.length === 0,
      steigt.length === 0 ? zeilen.map(z => z.ct.toFixed(2)).join(" > ")
        : "steigt bei Stufe " + steigt.join(", "));

    /* ---- 3. EINE WAEHRUNG ---- */
    pruef("der Tresor rechnet in Franken wie der uebrige Shop",
      /Fr\./.test(daten.preisText || "") && !/€/.test(daten.preisText || ""),
      daten.preisText);
  }

  pruef("keine JS-Fehler", jsFehler.length === 0,
    jsFehler.length ? jsFehler.slice(0, 2).join(" | ") : "keine");

  await browser.close();
  console.log("\n" + ok + " ok, " + fehl + " fehlgeschlagen\n");
  if (fehl) process.exitCode = 1;
})().catch(e => { console.error("ABBRUCH: " + e.message); process.exit(1); });
