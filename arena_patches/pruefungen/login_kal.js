/* Login-Kalender nach dem Shop-Vorbild: 3 pro Reihe, Tag 7 als Band.
   Gemessen wird die GEOMETRIE — oertlich faellt jedes Icon aufs Emoji
   zurueck, ein Bildvergleich waere hier blind (DESIGNSYSTEM §7b). */
const { chromium } = require("playwright-core");
let ok = 0, fehl = 0;
const pruef = (n, w, z) => { if (w) ok++; else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); } };
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = []; p.on("pageerror", e => jsF.push(String(e).slice(0, 110)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html", { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2200);
  await p.evaluate(() => {
    document.querySelectorAll("#offerLayer,#dailyLayer,#cineLayer").forEach(e => e.style.display = "none");
    window.__proto.show("navHome");
  });
  await p.evaluate(() => document.getElementById("loginLayer").classList.add("open"));
  await p.waitForTimeout(600);
  const m = await p.evaluate(() => {
    const g = document.querySelector(".logingrid");
    const z = [...document.querySelectorAll(".logincell")];
    const nor = z.filter(e => !e.classList.contains("finale"));
    const fin = z.find(e => e.classList.contains("finale"));
    const pop = document.getElementById("loginPop");
    const spalten = getComputedStyle(g).gridTemplateColumns.split(" ").length;
    const reihen = [...new Set(nor.map(e => Math.round(e.getBoundingClientRect().top)))];
    const kasten = nor.map(e => { const i = e.querySelector(".lgi"), r = i.getBoundingClientRect(),
                                  c = e.getBoundingClientRect();
      return { anteil: r.width / c.width, quadrat: Math.abs(r.width - r.height) };});
    const pr = pop.getBoundingClientRect();
    return { spalten, zellen: nor.length, reihen: reihen.length,
             finaleBreite: fin ? Math.round(fin.getBoundingClientRect().width) : 0,
             // Innenmass, nicht Aussenmass: das Gitter hat 14 px Polster,
             // die volle Bandbreite ist die INHALTSbreite.
             gitterBreite: Math.round(g.clientWidth
               - parseFloat(getComputedStyle(g).paddingLeft)
               - parseFloat(getComputedStyle(g).paddingRight)),
             finaleHoehe: fin ? Math.round(fin.getBoundingClientRect().height) : 0,
             kastenAnteil: kasten.map(k => +k.anteil.toFixed(2)),
             kastenQuadrat: Math.max(...kasten.map(k => k.quadrat)),
             popHoehe: Math.round(pr.height), popOben: Math.round(pr.top),
             popUnten: Math.round(pr.bottom),
             // Deckt ein Bild seinen eigenen Knopf oder Text zu?
             ueberlappt: nor.filter(e => {
               const i = e.querySelector(".lgi").getBoundingClientRect();
               const n = e.querySelector(".lgn").getBoundingClientRect();
               return i.bottom > n.top + 1; }).length };
  });
  pruef("drei Spalten", m.spalten === 3, m.spalten + " Spalten");
  pruef("sechs Vortage in zwei vollen Reihen", m.zellen === 6 && m.reihen === 2,
        m.zellen + " Zellen / " + m.reihen + " Reihen");
  pruef("Tag 7 ueber die volle Breite", Math.abs(m.finaleBreite - m.gitterBreite) <= 1,
        m.finaleBreite + " von " + m.gitterBreite);
  pruef("Tag-7-Band bleibt flach (<=110 px)", m.finaleHoehe <= 110, m.finaleHoehe + " px");
  pruef("Bildkasten wie im Shop (63 % der Kartenbreite)",
        m.kastenAnteil.every(a => a >= 0.58 && a <= 0.68), m.kastenAnteil.join("/"));
  pruef("Bildkasten ist quadratisch", m.kastenQuadrat <= 1, m.kastenQuadrat.toFixed(1) + " px Abweichung");
  pruef("kein Bild ueberlappt seinen Text", m.ueberlappt === 0, m.ueberlappt + " Zellen");
  pruef("Fenster passt auf den Bildschirm", m.popOben >= 0 && m.popUnten <= 844,
        m.popOben + ".." + m.popUnten + " (Hoehe " + m.popHoehe + ")");
  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);
  console.log("  Fenster " + m.popHoehe + " px, Tag-7-Band " + m.finaleHoehe + " px");
  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close(); process.exit(fehl ? 1 : 0);
})();
