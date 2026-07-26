/* ===================================================================
 * sicht.js — Sichtprüfung MIT tatsächlich geladenen Bildern
 * -------------------------------------------------------------------
 * WARUM ES DIESE PRÜFUNG GIBT
 *
 * Die drei lokalen Suiten (run_v5/6/7, zusammen 606 Checks) laufen ohne
 * erreichbares CDN. Jedes Icon fällt dort auf sein Emoji zurück, jedes
 * Rahmen-Overlay bleibt leer. Damit ist eine ganze Fehlerklasse für sie
 * STRUKTURELL UNSICHTBAR:
 *
 *     „ein Asset deckt den Inhalt zu"
 *
 * Genau diese Klasse hat zugeschlagen. Alle elf generierten Rahmen- und
 * Plattendateien sind vollständig deckend (Alpha 255/255, 0,0 %
 * transparente Pixel); als Ebene über dem Inhalt haben sie Kartenartwork
 * und Produktbild komplett verdeckt. Die 590 Checks liefen vorher UND
 * nachher grün. Der Nutzer sah den Fehler beim ersten Blick aufs Telefon.
 *
 * Eine zweite Variante derselben Klasse: das Artwork ersetzt die dunkle
 * Fallback-Platte durch eine HELLE Fläche — und der helle Text darauf
 * verschwindet. Auch das sieht keine Prüfung ohne Bilder.
 *
 * Deshalb misst diese Prüfung gegen die LIVE-URL und wartet vorher, bis
 * `document.images` vollständig geladen sind.
 *
 * AUSFÜHREN (in der Sandbox, die das CDN erreicht):
 *     PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
 *     NODE_PATH=/usr/local/lib/node_modules node sicht.js
 * =================================================================== */
const { chromium } = require("playwright");

const URL = process.env.PRISMA_URL ||
  "https://prisma-td-vorschau.higgsfield.app/ui.html";

let ok = 0, fehler = 0;
function pruef(name, bedingung, info) {
  if (bedingung) { ok++; console.log("ok   " + name + (info ? "  — " + info : "")); }
  else { fehler++; console.log("FEHL " + name + (info ? "  — " + info : "")); }
}
function helligkeit(farbe) {
  const m = /rgba?\((\d+), *(\d+), *(\d+)/.exec(farbe || "");
  return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) / 255 : null;
}

(async () => {
  const browser = await chromium.launch();
  const seite = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2
  });

  const fehlgeschlagen = [];
  seite.on("requestfailed", r => {
    if (/\.(webp|png|jpg)$/.test(r.url())) fehlgeschlagen.push(r.url());
  });

  await seite.goto(URL, { waitUntil: "load", timeout: 60000 });

  /* Ohne dieses Warten misst man den Ladezustand, nicht das Ergebnis —
     und bekommt dieselbe Blindheit wie lokal, nur langsamer. */
  await seite.waitForFunction(() => {
    const im = Array.from(document.images);
    return im.length > 0 && im.every(i => i.complete);
  }, { timeout: 45000 }).catch(() => console.log("   (Zeitlimit beim Bildwarten)"));
  await seite.waitForTimeout(2500);

  /* Popups wegräumen. Sonst schiesst man das Angebots-Popup ab statt der
     Ansicht — beim ersten Anlauf genau so passiert. */
  await seite.evaluate(() => {
    document.querySelectorAll("#offerLayer,#loginLayer,#dailyLayer,#cineLayer")
      .forEach(e => { e.style.display = "none"; });
  });

  const go = n => seite.evaluate(nav => window.__proto.show(nav), n);

  const bilder = await seite.evaluate(() => {
    const im = Array.from(document.images);
    return {
      gesamt: im.length,
      geladen: im.filter(i => i.complete && i.naturalWidth > 0).length,
      leer: im.filter(i => i.complete && i.naturalWidth === 0).length
    };
  });
  console.log("Bilder: " + bilder.gesamt + " im DOM, " + bilder.geladen +
              " geladen, " + bilder.leer + " leer");
  pruef("Keine fehlgeschlagene Bildanfrage", fehlgeschlagen.length === 0,
        fehlgeschlagen.length + " Fehlschläge");
  pruef("Kein geladenes Bild ist leer", bilder.leer === 0, bilder.leer + " leer");

  /* ---------- Rahmen decken den Inhalt nicht zu ----------
     Ein Rahmen darf keine Bildfläche sein. Ist `backgroundImage` gesetzt,
     liegt eine deckende Datei über dem Inhalt — der Fehler von damals. */
  async function rahmen(nav, sel, name) {
    await go(nav);
    await seite.waitForTimeout(1500);
    const r = await seite.evaluate(s => {
      const els = [...document.querySelectorAll(".view.active " + s)].slice(0, 8);
      return els.map(e => {
        const cs = getComputedStyle(e);
        return {
          flaeche: cs.backgroundImage !== "none",
          border: cs.borderImageSource !== "none",
          slice: cs.borderImageSlice,
          breite: cs.borderImageWidth
        };
      });
    }, sel);
    if (!r.length) { pruef(name, false, "kein Element gefunden"); return; }
    pruef(name + ": nie eine deckende Bildfläche",
          r.every(x => !x.flaeche), r.filter(x => x.flaeche).length + " von " + r.length);
    pruef(name + ": Grafik liegt als border-image an",
          r.every(x => x.border), r.filter(x => x.border).length + "/" + r.length);
    pruef(name + ": Schnitt ohne `fill` (Mitte wird verworfen)",
          r.every(x => !/fill/.test(x.slice)), r[0].slice);
  }
  await rahmen("navCollection", ".tile .frm", "Sammlungs-Kartenrahmen");
  await rahmen("navShop", ".prodcard .pcfrm", "Shop-Produktrahmen");

  /* ---------- Text auf Artwork ----------
     Die zweite Variante derselben Klasse. Das Artwork ersetzt die dunkle
     Fallback-Platte durch eine helle Fläche; heller Text darauf ist weg.
     Geprüft wird die Regel, nicht der Einzelfall: auf allen Bändern steht
     dunkle Schrift, und keine trägt `.goldtext`. */
  const bandtext = await seite.evaluate(() => {
    const schlecht = [];
    document.querySelectorAll(".ribbon .rl, .ribbon .rr, .secribbon .srt")
      .forEach(e => {
        const cs = getComputedStyle(e);
        if (e.classList.contains("goldtext")) schlecht.push("goldtext auf Band");
        schlecht.push.apply(schlecht, []);
        const f = cs.webkitTextFillColor || cs.color;
        const m = /rgba?\((\d+), *(\d+), *(\d+)/.exec(f);
        if (m) {
          const l = (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) / 255;
          if (l > 0.45) schlecht.push(e.className + " hell " + l.toFixed(2));
        }
      });
    return schlecht;
  });
  pruef("Kein heller Text auf den hellen Bändern", bandtext.length === 0,
        bandtext.slice(0, 4).join(" | ") || "sauber");

  /* ---------- Bänder ---------- */
  const baender = await seite.evaluate(() =>
    [...document.querySelectorAll(".secribbon")].slice(0, 4).map(r => {
      const cs = getComputedStyle(r);
      return {
        quelle: cs.borderImageSource !== "none",
        slice: cs.borderImageSlice,
        enden: parseFloat((cs.borderImageWidth || "").split(" ").pop()) || 0
      };
    }));
  pruef("Sektionsbänder tragen ihre Grafik als border-image",
        baender.length > 0 && baender.every(b => b.quelle),
        baender.filter(b => b.quelle).length + "/" + baender.length);
  pruef("Bandschnitt mit `fill` (die Mitte bleibt)",
        baender.length > 0 && baender.every(b => /fill/.test(b.slice)),
        baender[0] ? baender[0].slice : "-");
  pruef("Band-Enden nicht auf einen Strich gestaucht (≥ 20 px)",
        baender.length > 0 && baender.every(b => b.enden >= 20),
        baender.map(b => b.enden).join("/"));

  /* ---------- Trophäenstraße ---------- */
  await go("navHome");
  await seite.waitForTimeout(700);
  await seite.evaluate(() => window.__proto.openRoad());
  await seite.waitForTimeout(2500);

  const strasse = await seite.evaluate(() => {
    const knoten = [...document.querySelectorAll(".node")].slice(0, 4).map(n => {
      const nm = n.querySelector(".rwn"), q = n.querySelector(".rwq");
      const tx = n.querySelector(".rwtx");
      const ic = n.querySelector(".rw .ico");
      const ib = ic ? ic.getBoundingClientRect() : null;
      return {
        name: nm ? nm.textContent.trim() : null,
        menge: q ? q.textContent.trim() : null,
        chip: tx ? getComputedStyle(tx).backgroundColor : null,
        icon: ib ? Math.round(Math.min(ib.width, ib.height)) : 0,
        props: n.querySelectorAll(".prop").length
      };
    });
    const band = document.querySelector(".ribbon");
    const hint = document.querySelector(".scrollhint");
    let ueberlappt = false;
    if (band && hint) {
      const a = hint.getBoundingClientRect(), b = band.getBoundingClientRect();
      ueberlappt = a.left < b.right && a.right > b.left &&
                   a.top < b.bottom && a.bottom > b.top;
    }
    return {
      knoten, ueberlappt,
      bandQuelle: band ? getComputedStyle(band).borderImageSource !== "none" : false,
      ticks: [...document.querySelectorAll(".tick b")].slice(0, 3)
        .map(t => Math.round(t.getBoundingClientRect().x))
    };
  });

  pruef("Straßenknoten benennt seine Belohnung",
        strasse.knoten.length > 0 && strasse.knoten.every(k => k.name && k.name.length > 2),
        strasse.knoten.map(k => k.name).join(" | "));
  pruef("Menge steht am Knoten",
        strasse.knoten.length > 0 && strasse.knoten.every(k => /[0-9]/.test(k.menge || "")),
        strasse.knoten.map(k => k.menge).join(" | "));
  const chipHell = strasse.knoten.map(k => helligkeit(k.chip)).filter(h => h !== null);
  pruef("Beschriftung sitzt auf eigenem dunklem Plättchen",
        chipHell.length > 0 && chipHell.every(h => h < 0.2),
        chipHell.map(h => h.toFixed(2)).join("/"));
  pruef("Belohnungs-Icon ≥ 34 px",
        strasse.knoten.length > 0 && strasse.knoten.every(k => k.icon >= 34),
        strasse.knoten.map(k => k.icon).join("/"));
  pruef("Höchstens ein Zierprop je Knoten",
        strasse.knoten.every(k => k.props <= 1),
        strasse.knoten.map(k => k.props).join("/"));
  pruef("Arena-Band trägt seine Grafik", strasse.bandQuelle);
  pruef("Scroll-Hinweis überlappt das Band nicht", !strasse.ueberlappt);
  pruef("Trophäenzahl sitzt neben der Schiene, nicht darauf",
        strasse.ticks.length > 0 && strasse.ticks.every(x => x >= 34),
        strasse.ticks.join("/"));

  await browser.close();
  console.log("\n" + ok + " ok, " + fehler + " Fehler");
  process.exit(fehler ? 1 : 0);
})();
