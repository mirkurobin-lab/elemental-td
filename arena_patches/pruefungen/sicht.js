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
  /* GEÄNDERTE ERWARTUNG, mit Absicht (DESIGNSYSTEM §6e).
     Auf den Produktkacheln lag ein KARTENrahmen — Hochformat 0,75 auf
     einer Kachel im Querformat 1,33. Das ist ein Kategorienfehler, kein
     Zuschnittfehler: dorthin gehört gar kein Rahmen. `.pcfrm` ist nur
     noch eine Glanzschicht, die Rarität trägt der 2-px-Rand der Kachel.
     Geprüft wird deshalb, dass genau das so bleibt — die alte Prüfung
     hätte den Rahmen wieder eingefordert. */
  await go("navShop");
  await seite.waitForTimeout(1500);
  const pc = await seite.evaluate(() => [...document.querySelectorAll(".view.active .prodcard")]
    .slice(0, 8).map(e => {
      const f = e.querySelector(".pcfrm"), cs = getComputedStyle(e);
      return {
        rahmenbild: f ? getComputedStyle(f).borderImageSource !== "none" : false,
        flaeche:    f ? getComputedStyle(f).backgroundImage   !== "none" : false,
        rand:       parseFloat(cs.borderTopWidth) || 0,
        randfarbe:  cs.borderTopColor,
      };
    }));
  pruef("Produktkachel trägt KEINEN Kartenrahmen (§6e)",
        pc.length > 0 && pc.every(x => !x.rahmenbild && !x.flaeche),
        pc.filter(x => x.rahmenbild || x.flaeche).length + " von " + pc.length);
  pruef("Rarität sitzt stattdessen im Rand der Kachel",
        pc.length > 0 && pc.every(x => x.rand >= 2),
        (pc[0] || {}).rand + "px " + (pc[0] || {}).randfarbe);

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

  /* ---------- Hintergrundebenen stapeln sich nicht (§6b) ----------
     Befund vom 26.07., gefunden beim Einspielen der Kulissenbanner:
     `layer()` und `bgArt()` lasen den BERECHNETEN Hintergrund und legten
     ihr Artwork davor. Beim zweiten Aufruf lasen sie damit ihren eigenen
     Stapel — jedes Neuzeichnen der Startseite hängte eine weitere Kopie
     an. Gemessen nach einem einzigen Shop→Home→Shop-Durchgang: `.progbar`
     und `.battlebtn` trugen drei Ebenen statt zwei, `.promobanner` und
     `.vaultbox` fünf statt drei.
     Das ist nicht nur unsauber, sondern ein §6b-Bruch: `background-size`
     nennt zwei bzw. drei Werte, CSS wiederholt sie zyklisch, und die
     ÜBERZÄHLIGE Artwork-Kopie landet dadurch auf `100% 100%` — die
     gestreckte Bannergrafik, die §6b verbietet. Beide Funktionen nehmen
     jetzt zuerst ihren Inline-Stil zurück und lesen die Farbplatte wieder
     aus dem Blatt.

     ⚠ WARUM DIE PRÜFUNG HIER STEHT UND NICHT NUR IN run_v7.js: die
     Suiten sehen nur die ERSTE Ebene an. Genau diese Annahme („layer()
     setzt das Artwork vorne ein") war es, die den Fehler jahrelang
     unsichtbar hielt — und seit `bgArt()` einen Abdunkelungs-Verlauf
     davorlegt, stimmt sie ohnehin nicht mehr. Gezählt wird deshalb
     NACH einem Rundgang durch die Ansichten, nicht beim ersten Zeichnen:
     einmalig stapelt nichts, der Fehler entsteht erst beim Wiederholen. */
  for (const v of ["navShop", "navHome", "navShop", "navHome"]) {
    await go(v);
    await seite.waitForTimeout(250);
  }
  const stapel = await seite.evaluate(() => {
    /* Ebenen einer Mehrfach-Eigenschaft zählen. NICHT mit split(",") —
       ein linear-gradient() trägt selbst Kommas. */
    const zerlege = s => {
      const teile = []; let tiefe = 0, akt = "";
      for (const z of String(s || "")) {
        if (z === "(") tiefe++;
        if (z === ")") tiefe--;
        if (z === "," && tiefe === 0) { teile.push(akt.trim()); akt = ""; continue; }
        akt += z;
      }
      if (akt.trim()) teile.push(akt.trim());
      return teile;
    };
    const schlecht = [];
    document.querySelectorAll("#arenaProg,#btnBattle,#shopPromo,#vaultBox,#vaultShop," +
                              "#clanHead,.iapcard,.offercard").forEach(e => {
      const cs = getComputedStyle(e);
      const bilder = zerlege(cs.backgroundImage);
      const groessen = zerlege(cs.backgroundSize);
      const artwork = bilder.filter(b => /url\(/.test(b)).length;
      if (artwork > 1) {
        schlecht.push((e.id || e.className.split(" ")[0]) + ": " + artwork + " Artwork-Ebenen");
        return;
      }
      bilder.forEach((b, i) => {
        if (!/url\(/.test(b)) return;
        const g = groessen.length ? groessen[i % groessen.length] : "";
        if (/^100% 100%$/.test(g))
          schlecht.push((e.id || e.className.split(" ")[0]) + ": Artwork gestreckt");
      });
    });
    return schlecht;
  });
  pruef("Hintergrundebenen stapeln sich beim Neuzeichnen nicht",
        stapel.length === 0, stapel.slice(0, 4).join(" | ") || "sauber");

  await browser.close();
  console.log("\n" + ok + " ok, " + fehler + " Fehler");
  process.exit(fehler ? 1 : 0);
})();
