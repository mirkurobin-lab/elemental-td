/* ===================================================================
 * iconfrei.js — kein Icon sitzt auf einem eingebackenen Rechteck.
 *
 * Muss MIT geladenen Bildern laufen (DESIGNSYSTEM §7b): die 606 oertlichen
 * Pruefungen sehen diese Fehlerklasse strukturell nicht, weil das CDN dort
 * nicht erreichbar ist und jedes Icon auf das Emoji zurueckfaellt.
 *
 * Prinzip: zwei Aufnahmen derselben Ansicht — einmal normal, einmal mit
 * `visibility:hidden` auf allen Icons. Das Layout bleibt identisch, nur das
 * Icon fehlt. Verglichen werden die vier Eckfelder der GEZEICHNETEN Flaeche
 * (object-fit:contain wird herausgerechnet). Bringt das Icon einen deckenden
 * Grund mit, springt die Ecke; ist es freigestellt, bleibt sie gleich.
 * Zierschatten der Ahnen werden fuer die Messung abgeschaltet, sonst
 * faerben sie die Ecke mit.
 *
 * AUFRUF (in der Sandbox):
 *   PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
 *   NODE_PATH=/usr/local/lib/node_modules node iconfrei.js
 * =================================================================== */
const { chromium } = require("playwright");
const URL  = process.env.PRISMA_URL || "https://prisma-td-vorschau.higgsfield.app/ui.html";
const NAVS = ["navHome", "navCards", "navShop", "navClan", "navFortress"];
const GRENZE = 8;       // dE darueber ist mit blossem Auge ein Kasten
const MINGROESSE = 18;  // darunter ist das Eckfeld zu klein zum Messen
const S = 1;

/* Zierschatten faerben die Ecke mit, sind aber gewollt. Fuer die Dauer
   der Messung aus, danach zurueck. */
const SCHATTEN_AUS = () => {
  document.querySelectorAll("img.ico").forEach(e => {
    /* Auch der Schatten am Icon SELBST faerbt die Ecke — .prodimg traegt
       drop-shadow(0 2px 6px #000a), das reicht mit 6 px Weichzeichnung
       weit in ein Eckfeld von ~5 px hinein. Fuer die Frage „bringt das
       Icon ein eingebackenes Rechteck mit" ist er Rauschen. Die
       Freistellung selbst bleibt stehen, sonst misst man sie nicht. */
    if (/drop-shadow/.test(getComputedStyle(e).filter)) {
      e.dataset.altS = e.style.filter; e.style.filter = "url(#icoFrei)";
    }
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const f = getComputedStyle(a).filter;
      if (f !== "none" && /drop-shadow/.test(f)) { a.dataset.altF = a.style.filter; a.style.filter = "none"; }
    }});
};
const SCHATTEN_AN = () => {
  document.querySelectorAll("[data-alt-f]").forEach(a => { a.style.filter = a.dataset.altF; delete a.dataset.altF; });
  document.querySelectorAll("[data-alt-s]").forEach(a => { a.style.filter = a.dataset.altS; delete a.dataset.altS; });
};

/* object-fit:contain: die gezeichnete Flaeche ist kleiner als die Box.
   Ohne diese Korrektur misst man bei .prodimg leere Randstreifen. */
const SAMMLE = min => [...document.querySelectorAll("img.ico")].filter(e => {
    const r = e.getBoundingClientRect();
    return e.complete && e.naturalWidth > 0 && r.width >= min && r.height >= min &&
           r.top > 2 && r.bottom < 842 && r.left >= 2 && r.right <= 388;
  }).map(e => {
    const r = e.getBoundingClientRect();
    let x = r.x, y = r.y, w = r.width, h = r.height;
    if (getComputedStyle(e).objectFit === "contain") {
      const s = Math.min(r.width / e.naturalWidth, r.height / e.naturalHeight);
      const dw = e.naturalWidth * s, dh = e.naturalHeight * s;
      x = r.x + (r.width - dw) / 2; y = r.y + (r.height - dh) / 2; w = dw; h = dh;
    }
    return { cls: e.className.trim(), src: (e.currentSrc || "").split("/").pop(),
             x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  });

/* Ein Eckfeld, in das ein ANDERES Icon hineinragt, misst nicht mehr dieses
   Icon. Die Messung blendet alle Icons gleichzeitig aus — verschwindet der
   Nachbar mit, springt die Ecke, obwohl das gepruefte Icon sauber
   freigestellt ist. Genau so entstand der Befund „nav_shop dE 52,2": in
   seinem rechten oberen Eckfeld liegt ein zweites Icon (212,131,64 mit
   Icons, 21,32,40 ohne). Solche Felder fallen raus; bleibt kein Feld
   uebrig, faellt das Icon aus der Messung — nicht durch. */
const OHNE_NACHBARN = kacheln => kacheln.map((t, i) => ({
  ...t,
  felder: [[0, 0], [1, 0], [0, 1], [1, 1]].filter(([fx, fy]) => {
    const k = Math.max(2, Math.round(Math.min(t.w, t.h) * 0.14));
    const ax = t.x + fx * (t.w - k), ay = t.y + fy * (t.h - k);
    return !kacheln.some((o, j) => j !== i &&
      o.x < ax + k && o.x + o.w > ax && o.y < ay + k && o.y + o.h > ay);
  }),
})).filter(t => t.felder.length > 0);

async function ecken(seite, mitB64, ohneB64, kacheln) {
  return seite.evaluate(async ([a, b, k, s]) => {
    async function bild(d) {
      const i = new Image(); i.src = "data:image/png;base64," + d; await i.decode();
      const c = new OffscreenCanvas(i.width, i.height);
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(i, 0, 0); return g;
    }
    const A = await bild(a), B = await bild(b);
    return k.map(t => {
      const kk = Math.max(2, Math.round(Math.min(t.w, t.h) * s * 0.14));
      const felder = t.felder.map(([fx, fy]) =>
        [t.x*s + fx*(t.w*s-kk), t.y*s + fy*(t.h*s-kk)]);
      let sa = [0,0,0], sb = [0,0,0], n = 0;
      for (const [fx, fy] of felder) {
        const da = A.getImageData(Math.round(fx), Math.round(fy), kk, kk).data;
        const db = B.getImageData(Math.round(fx), Math.round(fy), kk, kk).data;
        for (let i = 0; i < da.length; i += 4) {
          sa[0]+=da[i]; sa[1]+=da[i+1]; sa[2]+=da[i+2];
          sb[0]+=db[i]; sb[1]+=db[i+1]; sb[2]+=db[i+2]; n++;
        }
      }
      const d = [0,1,2].map(i => sa[i]/n - sb[i]/n);
      return { cls: t.cls, src: t.src, dE: Math.hypot(d[0], d[1], d[2]) };
    });
  }, [mitB64, ohneB64, kacheln, S]);
}

(async () => {
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: S });
  await seite.goto(URL, { waitUntil: "load", timeout: 60000 });
  await seite.waitForFunction(() => {
    const i = [...document.images]; return i.length > 0 && i.every(x => x.complete);
  }, { timeout: 45000 }).catch(() => console.log("   (Zeitlimit beim Bildwarten)"));
  await seite.waitForTimeout(2000);
  await seite.evaluate(() => document.querySelectorAll("#offerLayer,#loginLayer,#dailyLayer,#cineLayer")
    .forEach(e => { e.style.display = "none"; }));

  let frei = 0, kasten = 0; const schlimm = [];
  for (const nav of NAVS) {
    await seite.evaluate(n => window.__proto && window.__proto.show(n), nav).catch(() => {});
    await seite.waitForTimeout(1100);
    await seite.evaluate(SCHATTEN_AUS);
    await seite.waitForTimeout(200);
    const kacheln = OHNE_NACHBARN(await seite.evaluate(SAMMLE, MINGROESSE));
    if (!kacheln.length) { await seite.evaluate(SCHATTEN_AN); continue; }
    const mit = (await seite.screenshot()).toString("base64");
    await seite.evaluate(() => document.querySelectorAll("img.ico").forEach(e => { e.style.visibility = "hidden"; }));
    await seite.waitForTimeout(250);
    const ohne = (await seite.screenshot()).toString("base64");
    await seite.evaluate(() => document.querySelectorAll("img.ico").forEach(e => { e.style.visibility = ""; }));
    await seite.evaluate(SCHATTEN_AN);
    for (const r of await ecken(seite, mit, ohne, kacheln)) {
      if (r.dE <= GRENZE) frei++; else { kasten++; schlimm.push({ nav, ...r }); }
    }
  }
  schlimm.sort((a, b) => b.dE - a.dE);
  console.log(frei + " Icons freigestellt, " + kasten + " mit sichtbarem Kasten (dE > " + GRENZE + ")");
  schlimm.slice(0, 12).forEach(x => console.log("   FEHL " + x.nav.padEnd(12) + x.cls.padEnd(16) +
    x.src.slice(0, 24).padEnd(26) + "dE=" + x.dE.toFixed(1)));
  await browser.close();
  process.exit(kasten ? 1 : 0);
})();
