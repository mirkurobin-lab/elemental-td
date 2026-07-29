/* ===================================================================
 * flug.js — die Sammel-Animation fliegt aus JEDEM Fenster.
 *
 * Der Auftrag lautete „jedes Fenster muss dies ausfuehren auch Clan
 * usw". Deshalb prueft diese Datei NICHT einzelne Knoepfe, sondern die
 * Naht, an der alle haengen: waechst ein Waehrungsbetrag, fliegt er.
 * Ein Test, der nur den Shop-Knopf ansieht, wuerde gruen bleiben,
 * waehrend der Clan nichts tut.
 * =================================================================== */
const { chromium } = require("playwright-core");
let ok = 0, fehl = 0;
const pruef = (n, w, z) => { if (w) ok++; else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); } };
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = []; p.on("pageerror", e => jsF.push(String(e).slice(0, 120)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html", { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2400);
  await p.evaluate(() => document.querySelectorAll("#offerLayer,#loginLayer,#dailyLayer,#cineLayer,#splashLayer")
    .forEach(e => { e.style.display = "none"; }));

  // 1. Gold waechst -> Muenzen entstehen, Anzeige eilt NICHT voraus
  const g = await p.evaluate(async () => {
    const P = window.__proto;
    const vorher = document.getElementById("curGold").textContent;
    P.setGold(P.gold() + 5000);
    await new Promise(r => setTimeout(r, 90));
    return { sprites: document.querySelectorAll("#flugLayer .flug").length,
             anzeigeSofort: document.getElementById("curGold").textContent,
             vorher, buehneKlickdurchlaessig:
               getComputedStyle(document.getElementById("flugLayer")).pointerEvents };
  });
  pruef("Gold-Zuwachs erzeugt fliegende Muenzen", g.sprites >= 3, g.sprites + " Sprites");
  pruef("die Anzeige eilt dem Flug NICHT voraus", g.anzeigeSofort === g.vorher,
    g.vorher + " -> " + g.anzeigeSofort);
  pruef("die Flugbuehne faengt keine Klicks ab", g.buehneKlickdurchlaessig === "none",
    g.buehneKlickdurchlaessig);

  // 2. Nach der Landung stimmt die Zahl
  await p.waitForTimeout(1500);
  const nach = await p.evaluate(() => ({
    anzeige: document.getElementById("curGold").textContent.replace(/\s/g, ""),
    echt: String(window.__proto.gold()),
    uebrig: document.querySelectorAll("#flugLayer .flug").length,
  }));
  pruef("nach der Landung zeigt die Leiste den echten Stand",
    nach.anzeige === nach.echt, nach.anzeige + " gegen " + nach.echt);
  pruef("keine Sprites bleiben liegen", nach.uebrig === 0, nach.uebrig + " uebrig");

  // 3. Kristalle ebenso
  const k = await p.evaluate(async () => {
    const P = window.__proto;
    P.setGems(P.gems() + 120);
    await new Promise(r => setTimeout(r, 90));
    return document.querySelectorAll("#flugLayer .flug").length;
  });
  pruef("Kristall-Zuwachs fliegt ebenfalls", k >= 3, k + " Sprites");
  await p.waitForTimeout(1400);

  // 4. DER KERN: es haengt an der Waehrung, nicht am Fenster.
  for (const nav of ["navClan", "navFortress", "navCollection", "navHome"]) {
    const n = await p.evaluate(async (nav) => {
      const P = window.__proto;
      P.show(nav);
      await new Promise(r => setTimeout(r, 260));
      P.setGold(P.gold() + 900);
      await new Promise(r => setTimeout(r, 90));
      return document.querySelectorAll("#flugLayer .flug").length;
    }, nav);
    pruef("auch aus " + nav + " fliegt es", n >= 3, n + " Sprites");
    await p.waitForTimeout(1200);
  }

  // 5. Abnahme, nicht Zuwachs, darf NICHT fliegen
  const ab = await p.evaluate(async () => {
    const P = window.__proto;
    P.setGold(P.gold() - 500);
    await new Promise(r => setTimeout(r, 90));
    return document.querySelectorAll("#flugLayer .flug").length;
  });
  pruef("ein Kauf (Abnahme) fliegt NICHT", ab === 0, ab + " Sprites");

  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);
  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close(); process.exit(fehl ? 1 : 0);
})();
