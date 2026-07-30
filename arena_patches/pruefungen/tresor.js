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

  /* ==================================================================
   * (4) DER TRESORKASTEN DARF KEIN FENSTER SEIN
   * ------------------------------------------------------------------
   * Gefunden am 30.07.2026 durch HINSEHEN, nicht durch Messen: der
   * Tresorkopf im Laden sah aus wie ein Darstellungsfehler — ein
   * schwarzer Block, daneben Kristalle der Kulisse, quer darueber eine
   * harte helle Naht.
   *
   * ⚠ ZUR ENTSTEHUNG DIESES SCHRITTS — er stand hier zuerst FALSCH.
   * Meine erste Erklaerung lautete: „die Fuellstands-Saeule liegt mit
   * z-index 0 HINTER dem deckenden Motiv und ist deshalb unsichtbar."
   * Der Quelltext behauptete dasselbe („Saeule als Ebene DAHINTER").
   * Beides ist falsch, und die GEGENPROBE hat es aufgedeckt: ein
   * positioniertes Kind mit z-index 0 wird IMMER ueber dem Hintergrund
   * seines Elternteils gezeichnet — der Hintergrund kommt in der
   * Malreihenfolge zuerst. Die Saeule lag also nie hinter dem Motiv.
   * Die Pruefung, die ich zuerst gebaut hatte („bei 0 % und 70 % muss
   * sich die Motivflaeche unterscheiden"), war deshalb wertlos: sie war
   * fuer den kaputten wie fuer den reparierten Aufbau gruen.
   *
   * WAS WIRKLICH KAPUTT WAR, sind drei Dinge:
   *   (a) `background` als Kurzform setzt die Hintergrundfarbe auf
   *       transparent. renderVault() ueberschreibt danach nur
   *       background-IMAGE. offer_vault_bank.webp ist 896x1200 (3:4),
   *       der Kasten 1:1 — `contain` laesst links und rechts je 8 px
   *       frei, und durch diese Streifen sah man die Kulisse der Karte.
   *       Der Kasten war ein Fenster.
   *   (b) Die Saeule deckte mit opacity .5 und normalem Mischen das
   *       Motiv zu einer flachen Platte zu.
   *   (c) Es gab keinen Pegelstrich, also las sich die Kante als Naht.
   *
   * GEMESSEN WIRD HIER NUR (a). Das ist Absicht und keine Nachlaessig-
   * keit: (b) und (c) sind Fragen der Lesbarkeit, und die braucht
   * Bildpunkte. In dieser Umgebung gibt es keinen PNG-Decoder, und
   * `getImageData` scheidet aus, weil `file://` jede Leinwand
   * verunreinigt. Ich habe die Bytegroesse der Aufnahme als Ersatzmass
   * ausprobiert und VERWORFEN — sie unterscheidet nicht: neuer Aufbau
   * 1,099, alter Aufbau 1,101, voll deckende Saeule 0,983 gegenueber
   * der ungefuellten Flaeche. Eine Schwelle darauf waere geraten
   * gewesen. (b) und (c) sind deshalb per Augenschein abgenommen und
   * in AA_UI_REFERENZ.md §31 als solche vermerkt — nicht als Messung
   * ausgegeben.
   *
   * (a) dagegen ist hart pruefbar, war tatsaechlich kaputt, und faellt
   * bei jedem kuenftigen `background:`-Kurzform-Griff sofort auf.
   * ================================================================== */
  await seite.evaluate(() => {
    ["loginLayer", "dailyLayer", "offerLayer", "confirmDlg", "reqDlg", "detailModal",
     "bonusDlg", "mergeCeremony", "roadLayer", "cineLayer", "avCerLayer", "mmLayer"]
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove("open"); });
    window.__proto.show("navShop");
  });
  await seite.waitForTimeout(600);

  const krug = await seite.$("#vaultShop .vaultjar") || await seite.$(".vaultjar");
  if (!krug) {
    pruef("der Tresorkrug ist auffindbar", false, "kein .vaultjar im Laden");
  } else {
    /* Deckkraft aus der GERECHNETEN Farbe, nicht aus dem Blatt: nur so
       faellt auch auf, wenn jemand die Farbe spaeter per Kurzform oder
       inline wieder wegnimmt — genau der Weg, auf dem sie verloren ging. */
    const lies = () => seite.evaluate(() => {
      const j = document.querySelector("#vaultShop .vaultjar") ||
                document.querySelector(".vaultjar");
      return getComputedStyle(j).backgroundColor;
    });
    /* `rgb(...)` ohne vierten Wert ist deckend. Ein naiver Griff nach
       „der letzten Zahl in der Klammer" liefert hier den Blauanteil und
       nennt rgb(5,8,9) durchsichtig — derselbe Fehlertyp wie beim
       Preisparser weiter oben, deshalb ausdruecklich getrennt. */
    const deckkraft = (f) => {
      if (/^transparent$/i.test(f)) return 0;
      const m = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/.exec(f);
      return m ? parseFloat(m[1]) : 1;
    };
    const grund = await lies();
    pruef("der Tresorkasten ist deckend — die Randstreifen sind kein Fenster",
      deckkraft(grund) === 1,
      grund + " → Deckkraft " + deckkraft(grund) +
      "; das Motiv ist 3:4 im 1:1-Kasten, links und rechts bleiben je 8 px Kastenfarbe");

    /* Gegenprobe: der kaputte Zustand wird wiederhergestellt. Meldet
       die Ablesung ihn nicht, prueft der Schritt darueber nichts. */
    await seite.evaluate(() => {
      const j = document.querySelector("#vaultShop .vaultjar") ||
                document.querySelector(".vaultjar");
      j.style.backgroundColor = "transparent";
    });
    const kaputt = await lies();
    gegen("ein durchsichtiger Kasten wuerde auffallen",
      deckkraft(kaputt) === 0,
      kaputt + " → Deckkraft " + deckkraft(kaputt) + " (erkannt)");
    /* Und die Ablesung darf nicht einfach alles fuer durchsichtig
       halten: rgb() ohne vierten Wert muss deckend herauskommen. */
    gegen("die Ablesung haelt rgb(5, 8, 9) nicht faelschlich fuer durchsichtig",
      deckkraft("rgb(5, 8, 9)") === 1 && deckkraft("rgba(5, 8, 9, 0.4)") === 0.4,
      "rgb→1, rgba(…,0.4)→0.4");

    await seite.evaluate(() => {
      const j = document.querySelector("#vaultShop .vaultjar") ||
                document.querySelector(".vaultjar");
      j.style.backgroundColor = "";
    });
  }

  pruef("keine JS-Fehler", jsFehler.length === 0,
    jsFehler.length ? jsFehler.slice(0, 2).join(" | ") : "keine");

  await browser.close();
  console.log("\n" + ok + " ok, " + fehl + " fehlgeschlagen\n");
  if (fehl) process.exitCode = 1;
})().catch(e => { console.error("ABBRUCH: " + e.message); process.exit(1); });
