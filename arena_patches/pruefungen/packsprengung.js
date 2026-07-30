/* ===================================================================
 * packsprengung.js — die Leinwand-Sprengung des Packs.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Vorgabe des Auftraggebers: „der pack wird perfekt angezeigt nur die
 * Animation passt nicht. wie bekommen wir das genau so hin wie blizzard
 * das macht?"
 *
 * Die Antwort ist, dass das Pack nicht ueberblendet, sondern ZERLEGT
 * wird: eine Leinwand schneidet genau das angezeigte Packbild in
 * Bruchstuecke und schleudert sie durch die Kamera. Die Physik dazu steht
 * in `arena_packfx.js` und pruefte sich selbst (`node arena_packfx.js`).
 * Diese Datei prueft, was der Selbsttest NICHT kann: das Zusammenspiel
 * mit der Szene und mit dem Bild.
 *
 * ⚠ SIE IST AUS FEHLERN ENTSTANDEN, NICHT AUS EINER SPEZIFIKATION.
 * Jeder Schritt hier hat einen echten Fehler vom 30.07.2026 hinter sich,
 * und JEDER dieser Fehler war gemessen gruen:
 *
 *   1. DER SCHWARZE VORHANG. Der Schweif war ein dunkles Rechteck mit
 *      30 % Deckung ueber die ganze Leinwand, jeden Rahmen neu. Nach drei
 *      Rahmen war die Leinwand praktisch undurchsichtig — und weil sie
 *      UEBER der Buehne liegt, war die Szene ab 2,4 s ein schwarzes Loch.
 *      Die EINFLIEGENDEN KARTEN, also genau das, wofuer das Pack gekauft
 *      wurde, lagen dahinter. Gemessen war alles in Ordnung: die
 *      Helligkeit stieg beim Bruch und fiel danach. Richtig ist
 *      `destination-out`, das Deckkraft LOESCHT statt Dunkel aufzutragen.
 *      Geprueft wird darum die DECKUNG der Leinwand, nicht ihre
 *      Helligkeit — mit Gegenprobe.
 *
 *   2. RECHTECKIGE STUECKE. Die erste Zerlegung war ein Raster. Alle
 *      Messungen gruen (Ausschnitte im Bild, ungleich gross, alle zur
 *      Kamera) — und es sah aus wie Konfetti. Glas bricht nicht in
 *      Rechtecke. Geprueft wird jetzt, dass die Stuecke DEN RICHTIGEN
 *      Bildausschnitt tragen, und zwar mit einem Bild, dessen vier
 *      Quadranten unterschiedliche Farben haben. Ohne so ein Bild ist
 *      „jeder Splitter traegt seinen Ausschnitt" nicht von „alle tragen
 *      denselben" zu unterscheiden.
 *
 *   3. DER UNSICHTBARE VORBEIFLUG. Ein Fuenftel der Stuecke fliegt an der
 *      Kamera vorbei. Der Selbsttest bestaetigte das (7 von 36, groesste
 *      Skala 6,0) — auf dem Bildschirm war kein einziges grosses Stueck
 *      zu sehen. Die Perspektivskala vergroessert ein Stueck UND schiebt
 *      seine Bildlage nach aussen, also war es draussen, bevor es gross
 *      wurde. Der Selbsttest misst das jetzt an der BILDLAGE.
 *
 * DER ZUSTAND, DER OERTLICH FEHLT
 * Ohne CDN (DESIGNSYSTEM §7b) ist `#pkArt` leer und die Sprengung nimmt
 * ihren Rueckfall. Der ausgelieferte Zustand ist damit oertlich
 * strukturell unsichtbar — dieselbe Luecke, die `bildzustand.js` fuer die
 * Icons geschlossen hat. Diese Datei setzt darum ein eigenes Bild als
 * Daten-URI ein und prueft BEIDE Zustaende getrennt.
 *
 * AUFRUF
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node packsprengung.js
 * =================================================================== */
const { chromium } = require("playwright-core");
const { execFileSync } = require("child_process");

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; } else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); }
};
/* gegen(name, erkannt) — die Gegenprobe. Gleiche Bauart wie in
   offline.js, bildzustand.js und packoeffnung.js. Ein Schritt, der nicht
   rot werden KANN, ist wertlos; an diesem Tag ist das dreimal passiert. */
const gegen = (n, erkannt, z) => {
  if (erkannt) { ok++; }
  else { fehl++; console.log("  GEGENPROBE BLIND: " + n + (z ? " -> " + z : "")); }
};

/* Ein Bild mit vier unterscheidbaren Quadranten. Der ganze Sinn: nur so
   ist pruefbar, ob ein Splitter oben links auch das obere linke Viertel
   des Packbildes traegt. Ein einfarbiges Testbild kann das nicht — und
   ein Pack-Artwork auch nicht, weil es zu einheitlich ist. */
function testbild() {
  const py = `
from PIL import Image, ImageDraw
import base64, io, sys
N = 256
im = Image.new("RGB", (N, N), (20, 20, 30)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, N//2, N//2], fill=(220, 40, 40))        # oben links   ROT
d.rectangle([N//2, 0, N, N//2], fill=(40, 200, 60))        # oben rechts  GRUEN
d.rectangle([0, N//2, N//2, N], fill=(50, 90, 240))        # unten links  BLAU
d.rectangle([N//2, N//2, N, N], fill=(240, 210, 40))       # unten rechts GELB
d.line([0, 0, N, N], fill=(255, 255, 255), width=6)
b = io.BytesIO(); im.save(b, "PNG")
sys.stdout.write(base64.b64encode(b.getvalue()).decode())
`;
  return execFileSync("python3", ["-c", py], { encoding: "utf8" }).trim();
}

/* Die Klassierung der Splitterfarben.
   ⚠ NICHT ueber absolute Schwellen. Erster Versuch: „rot heisst r > 120
   und b < 90". Ergebnis 20 rote, 25 gruene, 23 blaue und 1922 gelbe
   Bildpunkte — voelliger Unsinn bei einem Bild, das offensichtlich alle
   vier Farben zeigte. Der Grund ist die Eigenglut: ueber jedem Splitter
   liegt die Packfarbe mit 30 % additiv, und die schiebt jeden Farbton in
   Richtung Magenta. Absolute Schwellen messen dann die Glut, nicht das
   Bild.
   Richtig ist der VERGLEICH der Kanaele untereinander: welcher ist der
   groesste, welcher der kleinste. Das ist gegen einen gleichmaessigen
   Farbstich unempfindlich. */
const KLASSIERER = (r, g, b) => {
  const min = Math.min(r, g, b), max = Math.max(r, g, b);
  if (max - min < 24) return "grau";
  if (min === b && g > r * 0.55) return "gelb";     /* R und G hoch, B klein */
  if (max === g) return "gruen";
  if (max === b) return "blau";
  if (min === g) return "rot";
  return "grau";
};

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--force-device-scale-factor=3"],
  });
  const seite = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 3 });
  const seitenfehler = [];
  seite.on("pageerror", (e) => seitenfehler.push(e.message));
  await seite.goto("file://" + __dirname.replace(/\/pruefungen$/, "") + "/ui_prototype.html");
  await seite.waitForTimeout(1200);

  console.log("\npacksprengung.js — die Leinwand-Sprengung\n");

  /* =============== 1. DAS GERUEST ================================== */
  const bau = await seite.evaluate(() => {
    const a = document.getElementById("pkFx"), z = document.getElementById("pkFx2");
    const st = document.getElementById("pkStage");
    if (!a || !z || !st) return { fehlt: true };
    const sa = getComputedStyle(a), sz = getComputedStyle(z);
    return {
      modul: !!(window.ArenaPackFX && window.ArenaPackFX.erzeuge),
      beide: true,
      inBuehne: st.contains(a) && st.contains(z),
      zA: +sa.zIndex, zZ: +sz.zIndex,
      klicksA: sa.pointerEvents, klicksZ: sz.pointerEvents,
      breiteA: sa.width, breiteZ: sz.width,
    };
  });
  pruef("die Physik (arena_packfx.js) ist geladen", bau.modul);
  pruef("es gibt ZWEI Leinwaende in der Buehne", bau.beide && bau.inBuehne);
  /* Das Material muss VOR dem Licht liegen: die Bruchstuecke sind das
     Pack selbst und muessen die Funken verdecken, nicht umgekehrt. */
  pruef("das Material (#pkFx2) liegt vor dem Licht (#pkFx)",
    bau.zZ > bau.zA, bau.zA + " gegen " + bau.zZ);
  /* Gleiche Groesse, sonst laufen die beiden Koordinatensysteme
     auseinander und die Splitter passen nicht zu den Funken. */
  pruef("beide Leinwaende sind gleich gross",
    bau.breiteA === bau.breiteZ, bau.breiteA + " gegen " + bau.breiteZ);
  pruef("keine der Leinwaende faengt den Tap ab",
    bau.klicksA === "none" && bau.klicksZ === "none");

  /* =============== 2. DER EINSATZ LIEGT AUF DEM BRUCH ============== */
  /* Der Bruch ist 55 % von 4000 ms = 2200 ms. Dort sitzt der Hoehepunkt
     von `pkblitz`, dort das Beben und dort starten die CSS-Funken. Eine
     Sprengung, die vorher oder nachher losgeht, ist ein zweites Ereignis
     statt einer Wucht.
     ⚠ Geprueft wird gegen den WERT AUS DEM BLATT, nicht gegen 2200 als
     Literal: sonst friert die Pruefung eine Zahl ein, die im CSS
     woanders steht, und beide koennen auseinanderlaufen. */
  const bruchCss = await seite.evaluate(() => {
    for (const bl of document.styleSheets) {
      let regeln; try { regeln = bl.cssRules; } catch (e) { continue; }
      for (const r of regeln) {
        /* ⚠ `#packLayer.spielt #pkStage` — mit ID, nicht mit Klasse. Erster
           Versuch suchte `.pkstage` und fand nichts; die Pruefung fiel
           still auf 2200 als Literal zurueck und haette damit genau das
           eingefroren, was sie aus dem Blatt lesen sollte. Ein `null` als
           Fund ist deshalb ein eigener roter Schritt weiter unten. */
        if (r.selectorText && /#packLayer\.spielt\s+#pkStage/.test(r.selectorText)) {
          const d = r.style.animationDelay;
          if (d) return parseFloat(d) * (/ms/.test(d) ? 1 : 1000);
        }
      }
    }
    return null;
  });

  async function neuOeffnen(key, bild) {
    await seite.evaluate((arg) => {
      window.__proto.openPackKey(arg.key);
      if (arg.b64) {
        const a = document.getElementById("pkArt");
        a.src = "data:image/png;base64," + arg.b64;
        a.style.visibility = "";
      }
    }, { key: key, b64: bild || null });
  }
  const deckung = () => seite.evaluate(() => {
    const o = {};
    for (const id of ["pkFx", "pkFx2"]) {
      const c = document.getElementById(id);
      if (!c || !c.width) { o[id] = { deckt: 0, leer: true }; continue; }
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let n = 0, deckt = 0;
      for (let i = 0; i < d.length; i += 4 * 11) { n++; if (d[i + 3] > 24) deckt++; }
      o[id] = { deckt: +(100 * deckt / n).toFixed(1) };
    }
    o.karten = document.querySelectorAll("#pkDeck .pkcard").length;
    return o;
  });

  /* ⚠ NICHT auf einen festen Augenblick nach dem Bruch gemessen. Erster
     Versuch prueft „Bruch + 150 ms" und war rot: die Leinwand wird bei
     2200 ms angelegt (die Kante wechselt messbar von 300 auf 540), der
     erste GEZEICHNETE Rahmen landet in dieser Umgebung aber erst rund
     200 ms spaeter — sie rastert in Software. Das ist eine Eigenschaft der
     Pruefungsumgebung, keine der Szene, und eine Pruefung darf daran nicht
     haengen. Gewartet wird darum auf den Inhalt, mit Obergrenze: bleibt er
     ganz aus, ist der Ausloeser wirklich kaputt und der Schritt rot. */
  const warteAufInhalt = async (id, maxMs) => {
    let t = 0;
    while (t < maxMs) {
      const d = await deckung();
      if (d[id].deckt > 0.5) return { da: true, nachMs: t, stand: d };
      await seite.waitForTimeout(80);
      t += 80;
    }
    return { da: false, nachMs: t, stand: await deckung() };
  };

  await neuOeffnen("arcane");
  await seite.waitForTimeout(Math.max(400, (bruchCss || 2200) - 350));
  const vorher = await deckung();
  /* Hier — noch VOR dem Bruch — wird festgehalten, dass das Packbild
     ueberhaupt zu sehen war. Der Wert traegt die Gegenprobe weiter unten,
     ohne dass dort eine neue Szene gestartet werden muss. */
  const vorPack = await seite.evaluate(() => {
    const a = document.getElementById("pkArt");
    return { vis: getComputedStyle(a).visibility, inline: a.style.visibility };
  });
  pruef("vor dem Bruch sind beide Leinwaende leer",
    vorher.pkFx.deckt === 0 && vorher.pkFx2.deckt === 0,
    JSON.stringify(vorher));
  const losErst = await warteAufInhalt("pkFx2", 2500);
  pruef("mit dem Bruch fliegt Material los",
    losErst.da && losErst.stand.pkFx2.deckt > 3,
    "nach " + losErst.nachMs + " ms: " + JSON.stringify(losErst.stand.pkFx2));
  pruef("und Licht dazu",
    losErst.stand.pkFx.deckt > 0.2, JSON.stringify(losErst.stand.pkFx));
  gegen("die Deckungsmessung unterscheidet ueberhaupt",
    vorher.pkFx2.deckt === 0 && losErst.stand.pkFx2.deckt > 0);

  /* ==============================================================
   * DAS PACK IST WEG, SOBALD DIE SPLITTER DA SIND
   * --------------------------------------------------------------
   * Der Fehler, der diesen Schritt erzwungen hat: gemessen stand
   * `#pkArt` 50 ms NACH dem Bruch noch auf Deckkraft 1 und erst bei
   * 2700 ms auf 0. Eine halbe Sekunde lang lagen das ganze Pack und
   * seine eigenen Bruchstuecke uebereinander — es sah aus wie ein
   * Effekt UEBER einem Pack statt wie ein Pack, das bricht. Kein
   * Schritt hat das gemeldet; gefunden wurde es beim Ansehen des
   * ganzen Telefonbildes, nicht des Buehnenausschnitts.
   * Geprueft wird die Gleichzeitigkeit: in dem Augenblick, in dem die
   * Splitter auf der Leinwand stehen, muss das Bild verborgen sein.
   * ⚠ `visibility` und nicht `opacity`: `pkbeben` animiert die
   * Deckkraft weiter (sie faellt ohnehin), und eine laufende
   * Animation schlaegt eine Inline-Angabe. Die Sichtbarkeit steht in
   * keinem Keyframe und ist damit die belastbare Groesse.
   * ============================================================== */
  const packWeg = await seite.evaluate(() => {
    const a = document.getElementById("pkArt");
    return { vis: getComputedStyle(a).visibility, inline: a.style.visibility };
  });
  pruef("mit dem ersten Splitter-Rahmen ist das ganze Packbild verborgen",
    packWeg.vis === "hidden", JSON.stringify(packWeg));
  /* Gegenprobe: VOR dem Bruch war es sichtbar — sonst wuerde der Schritt
     auch bei einem Pack gruen, das nie zu sehen war (etwa ohne CDN).
     ⚠ Der Wert stammt aus der LAUFENDEN Szene, gelesen weiter oben. Erster
     Versuch hat dafuer ein frisches Pack geoeffnet — und damit die Szene
     ersetzt, die die naechsten Schritte messen wollten: zwei davon wurden
     rot („Deck steht bereit", „Rueckfall greift"). Dieselbe Falle wie bei
     der Vorhang-Gegenprobe, die auf die echte Leinwand malte. Eine
     Gegenprobe darf den Ablauf nicht anfassen. */
  gegen("das Packbild war vor dem Bruch ueberhaupt sichtbar",
    vorPack.vis === "visible", JSON.stringify(vorPack));
  pruef("die Einsatzzeit steht im Blatt und ist nicht 0",
    bruchCss !== null && bruchCss > 1000, String(bruchCss));

  /* =============== 3. KEIN SCHWARZER VORHANG ======================= */
  /* Der teuerste Fehler des Tages. Die Leinwand darf die Buehne nie
     zudecken — dahinter liegen die einfliegenden Karten.
     Die Schwelle 55 % ist nicht geraten: bei der fehlerhaften Fassung
     war die Deckung nach drei Rahmen bei ueber 99 %, bei der richtigen
     liegt der Hoechstwert bei 32 %. Zwischen den beiden liegt ein
     Faktor drei; 55 % trennt sie und laesst Luft fuer eine heftigere
     Sprengung. */
  let maxDeck = 0, kartenImmerDa = true, verlauf = [];
  for (let i = 0; i < 9; i++) {
    const d = await deckung();
    const summe = d.pkFx.deckt + d.pkFx2.deckt;
    verlauf.push(summe.toFixed(0));
    if (summe > maxDeck) maxDeck = summe;
    if (d.karten < 11) kartenImmerDa = false;
    await seite.waitForTimeout(70);
  }
  pruef("die Leinwand deckt die Buehne NIE zu (kein schwarzer Vorhang)",
    maxDeck < 55, "Hoechstdeckung " + maxDeck.toFixed(1) + " %, Verlauf " + verlauf.join("/"));
  pruef("die einfliegenden Karten bleiben die ganze Zeit vorhanden",
    kartenImmerDa);
  /* GEGENPROBE zum Vorhang: ein Rechteck mit voller Deckung MUSS die
     Messung ueber die Schwelle treiben. Ohne diesen Schritt koennte
     `deckung()` konstant kleine Werte liefern und der Vorhang waere nicht
     zu erkennen — genau der Fehler, den die erste Fassung hatte.
     ⚠ AUF EINER EIGENEN, LOSEN LEINWAND. Erster Versuch malte auf `#pkFx`
     selbst. Damit hat die Gegenprobe die Szene, die sie prueft, kaputt
     gemacht: der naechste Schritt („nachher ist nichts mehr da") sah 100 %
     Deckung und wurde rot — durch die Pruefung, nicht durch den Code. Eine
     Pruefung, die den Messgegenstand veraendert, misst sich selbst. */
  const vorhangErkannt = await seite.evaluate(() => {
    const echt = document.getElementById("pkFx");
    const c = document.createElement("canvas");
    c.width = echt.width; c.height = echt.height;
    const g = c.getContext("2d");
    g.fillStyle = "#06090d";
    g.fillRect(0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, deckt = 0;
    for (let i = 0; i < d.length; i += 4 * 11) { n++; if (d[i + 3] > 24) deckt++; }
    return 100 * deckt / n;
  });
  gegen("die Vorhangmessung wuerde einen echten Vorhang finden",
    vorhangErkannt > 55, vorhangErkannt.toFixed(1) + " %");

  /* =============== 4. NACHHER IST NICHTS MEHR DA =================== */
  /* Teilchen, die noch quer durchs Bild fliegen, wenn die Karten liegen,
     ziehen den Blick von der Enthuellung weg. Die Sprengung muss also von
     selbst enden und ihre Leinwand raeumen.
     ⚠ NICHT auf einen festen Zeitpunkt gemessen. Erster Versuch prueft bei
     „Bruch + 2450 ms" und wurde rot — nicht wegen der Szene, sondern weil
     die Pruefung selbst langsam ist: jedes `getImageData` auf einer grossen
     Leinwand zieht die Bilddaten von der Grafikeinheit zurueck und bremst
     die Zeichenkette. Die Messung hat den Messgegenstand verlangsamt,
     dieselbe Falle wie bei der Gegenprobe weiter oben.
     Darum wird jetzt GEWARTET, bis geraeumt ist, und geprueft, DASS es
     passiert. Das ist die Anforderung; die Wanduhr der Pruefungsumgebung
     ist keine. Wie lange die Sprengung in TEILCHENZEIT dauert, prueft der
     Selbsttest des Moduls („alles ist durch, bevor der Spieler zu tippen
     beginnt") — dort gehoert es hin, weil es dort ohne Browser messbar ist. */
  let geraeumt = false, warten = 0;
  let letzterStand = null;
  while (warten < 9000) {
    const d = await deckung();
    letzterStand = d;
    if (d.pkFx.deckt < 1 && d.pkFx2.deckt < 1) { geraeumt = true; break; }
    await seite.waitForTimeout(250);
    warten += 250;
  }
  pruef("die Sprengung endet von selbst und raeumt ihre Leinwand",
    geraeumt, "nach " + warten + " ms noch " + JSON.stringify(letzterStand));
  /* Und das Deck ist dann da — die Zeremonie geht weiter, die Sprengung
     hat sie nicht abgebrochen. */
  const deckDa = await seite.evaluate(() => ({
    schwebt: !!document.querySelector("#pkDeck.schwebt"),
    karten: document.querySelectorAll("#pkDeck .pkcard").length,
  }));
  pruef("und das Deck steht danach bereit zum Aufdecken",
    deckDa.schwebt && deckDa.karten === 11, JSON.stringify(deckDa));

  /* =============== 5. SCHLIESSEN RAEUMT BEIDE EBENEN =============== */
  /* Eine vergessene Ebene haengt als Standbild ueber der Buehne. Weil
     `#pkFx2` das Material traegt, waere genau das Packbruchstueck
     stehengeblieben — mitten im naechsten Bildschirm. */
  await neuOeffnen("arcane");
  await seite.waitForTimeout((bruchCss || 2200) + 120);
  const imFlug = await deckung();
  /* ⚠ NICHT mit 20 Taps auf die Ebene. Erster Versuch tat genau das und
     die Szene blieb offen: `tipp()` steigt sofort aus, solange das Deck
     noch nicht schwebt (ab 3120 ms) — waehrend der Sprengung sind Taps
     absichtlich wirkungslos, damit ein Tap auf dem Weg zum Knopf niemandem
     den Moment wegnimmt. Der richtige Weg mitten im Flug ist der
     Überspringen-Knopf. Genau dabei ist aufgefallen, dass der Knopf seit
     dem ersten Entwurf gar keinen Zuhoerer hatte. */
  await seite.evaluate(() => {
    document.getElementById("pkSkip")
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  await seite.waitForTimeout(120);
  /* ⚠ NICHT gegen `#pkDeck.schwebt` geprueft. Erster Versuch tat das und
     wurde rot: `zeigeFinale()` NIMMT die Klasse absichtlich wieder weg,
     weil das Deck der Beute-Uebersicht Platz macht. Die Pruefung hat also
     einen Zwischenzustand verlangt, den der Endzustand richtigerweise
     nicht mehr hat — geprueft wird das ERGEBNIS: alles offen, Beute da. */
  const nachSprung = await seite.evaluate(() => ({
    zu: document.querySelectorAll("#pkDeck .pkcard:not(.auf):not(.weg)").length,
    beute: !!document.querySelector(".pkfinale"),
    stuecke: document.querySelectorAll(".pkfinale .pkfin").length,
  }));
  pruef("Überspringen deckt alles auf und zeigt die Beute (kein toter Knopf)",
    nachSprung.zu === 0 && nachSprung.beute && nachSprung.stuecke === 11,
    JSON.stringify(nachSprung));
  /* Und DANN schliesst ein Tap. */
  await seite.evaluate(() => {
    document.getElementById("packLayer")
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  await seite.waitForTimeout(200);
  const nachSchluss = await seite.evaluate(() => {
    const o = { offen: document.getElementById("packLayer").classList.contains("on") };
    for (const id of ["pkFx", "pkFx2"]) {
      const c = document.getElementById(id);
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let deckt = 0;
      for (let i = 3; i < d.length; i += 4 * 11) if (d[i] > 8) deckt++;
      o[id] = deckt;
    }
    return o;
  });
  pruef("beim Schliessen werden BEIDE Leinwaende geleert",
    nachSchluss.pkFx === 0 && nachSchluss.pkFx2 === 0, JSON.stringify(nachSchluss));
  gegen("die Leerungsmessung hat vorher ueberhaupt etwas gesehen",
    imFlug.pkFx2.deckt > 0, JSON.stringify(imFlug.pkFx2));

  /* =============== 6. DIE STUECKE TRAGEN UNSER PACK ================ */
  /* Der Zustand, der ausgeliefert wird, und der oertlich nie eintritt.
     Ein Bild mit vier verschieden gefaerbten Quadranten wird eingesetzt;
     danach muessen alle vier Farben in den Splittern auftauchen. Traegt
     jeder Splitter denselben Ausschnitt, ist es nur eine Farbe. Greift
     der Rueckfall, sind es gar keine. */
  const B64 = testbild();
  await neuOeffnen("arcane", B64);
  await seite.waitForTimeout(500);
  const bildDa = await seite.evaluate(() => {
    const a = document.getElementById("pkArt");
    return { complete: a.complete, w: a.naturalWidth, sichtbar: a.style.visibility !== "hidden" };
  });
  pruef("das Packbild ist VOR dem Bruch geladen (sonst greift der Rueckfall)",
    bildDa.complete && bildDa.w > 0 && bildDa.sichtbar, JSON.stringify(bildDa));

  /* Wieder warten statt zielen — gleicher Grund wie oben. */
  const farbFlug = await warteAufInhalt("pkFx2", 4000);
  pruef("die Splitter fliegen auch mit geladenem Packbild",
    farbFlug.da, "nach " + farbFlug.nachMs + " ms");
  const farben = await seite.evaluate((quelle) => {
    /* Der Klassierer wird als Text hineingegeben, damit er in der
       Pruefung UND im Browser derselbe ist. */
    const klass = eval("(" + quelle + ")");
    const c = document.getElementById("pkFx2");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const z = { rot: 0, gruen: 0, blau: 0, gelb: 0, grau: 0 };
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * 7) {
      if (d[i + 3] < 90) continue;    /* nur deckende Stellen, kein Halo */
      n++;
      z[klass(d[i], d[i + 1], d[i + 2])]++;
    }
    return { n: n, z: z };
  }, KLASSIERER.toString());
  const anteil = (k) => farben.n ? farben.z[k] / farben.n : 0;
  pruef("alle vier Quadranten des Packbildes stecken in den Splittern",
    ["rot", "gruen", "blau", "gelb"].every((k) => anteil(k) >= 0.05),
    "rot " + (anteil("rot") * 100).toFixed(0) + " / gruen " + (anteil("gruen") * 100).toFixed(0) +
    " / blau " + (anteil("blau") * 100).toFixed(0) + " / gelb " + (anteil("gelb") * 100).toFixed(0) +
    " %, " + farben.n + " Punkte");
  gegen("die Farbmessung findet ueberhaupt Farbe (nicht nur Grau)",
    anteil("grau") < 0.7, (anteil("grau") * 100).toFixed(0) + " % grau");

  /* Und die LAGE stimmt: die roten Stuecke muessen links oben liegen, die
     gelben rechts unten — so, wie sie im Packbild liegen. DAS ist der
     Nachweis, dass die Zerlegung eine Zerlegung ist und kein Streumuster
     mit Packfarben drauf. Die Schwerpunkte werden verglichen, nicht
     einzelne Punkte: ein Stueck dreht sich, ein Schwerpunkt nicht. */
  const lage = await seite.evaluate((quelle) => {
    const klass = eval("(" + quelle + ")");
    const c = document.getElementById("pkFx2");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const s = {};
    for (const k of ["rot", "gruen", "blau", "gelb"]) s[k] = { x: 0, y: 0, n: 0 };
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 90) continue;
      const k = klass(d[i], d[i + 1], d[i + 2]);
      if (!s[k]) continue;
      const px = (i / 4) % c.width, py = Math.floor((i / 4) / c.width);
      s[k].x += px; s[k].y += py; s[k].n++;
    }
    const o = {};
    for (const k in s) {
      o[k] = s[k].n ? { x: s[k].x / s[k].n / c.width, y: s[k].y / s[k].n / c.height, n: s[k].n } : null;
    }
    return o;
  }, KLASSIERER.toString());
  const alle4 = ["rot", "gruen", "blau", "gelb"].every((k) => lage[k] && lage[k].n > 200);
  pruef("die Splitter liegen dort, wo ihr Ausschnitt im Packbild liegt",
    alle4 &&
    lage.rot.x < lage.gruen.x &&      /* rot links, gruen rechts */
    lage.blau.x < lage.gelb.x &&      /* blau links, gelb rechts */
    lage.rot.y < lage.blau.y &&       /* rot oben, blau unten */
    lage.gruen.y < lage.gelb.y,       /* gruen oben, gelb unten */
    alle4 ? ["rot", "gruen", "blau", "gelb"].map((k) =>
      k + " " + lage[k].x.toFixed(2) + "/" + lage[k].y.toFixed(2)).join("  ")
      : "nicht alle vier Farben gefunden");

  /* =============== 7. OHNE BILD LAEUFT ES TROTZDEM ================= */
  /* Auf dem Geraet kann ein Bild fehlschlagen. Ohne Rueckfall waere die
     Sprengung dann unsichtbar — genau die Fehlerklasse, die an diesem Tag
     dreimal zugeschlagen hat. */
  await seite.evaluate(() => {
    /* Das Bild absichtlich unbrauchbar machen, so wie ein fehlgeschlagener
       Abruf es hinterlaesst. */
    window.__ohneBild = true;
  });
  await neuOeffnen("bronze");
  await seite.evaluate(() => {
    const a = document.getElementById("pkArt");
    a.removeAttribute("src");
    a.style.visibility = "hidden";
  });
  await seite.waitForTimeout((bruchCss || 2200) + 160);
  const ohne = await deckung();
  pruef("ohne Packbild fliegen die Stuecke trotzdem (Rueckfall greift)",
    ohne.pkFx2.deckt > 2, JSON.stringify(ohne.pkFx2));

  pruef("kein Skriptfehler in der ganzen Pruefung",
    seitenfehler.length === 0, seitenfehler.slice(0, 3).join(" | "));

  console.log("\n" + ok + " ok, " + fehl + " fehl — " +
    (fehl === 0 ? "ALLE SCHRITTE GRUEN" : "ROT") + "\n");
  await b.close();
  if (fehl) process.exitCode = 1;
})();
