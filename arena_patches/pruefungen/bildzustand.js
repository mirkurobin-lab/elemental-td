/* ===================================================================
 * bildzustand.js — der Zustand, den oertlich NIEMAND sieht.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Frueher war oertlich kein CDN erreichbar; jedes Icon fiel aufs Emoji
 * zurueck (DESIGNSYSTEM §7b). Damit war der Zustand „ein echtes Bild
 * liegt im Kasten" fuer ALLE anderen Pruefungen strukturell unsichtbar.
 * Diese Datei ist dafuer gebaut worden.
 *
 * ⚠ ZWEITE, HAERTERE FASSUNG (30.07.2026, Abend)
 * ----------------------------------------------
 * Am selben Tag meldete der Auftraggeber ZWEI Fehler von der Live-Seite,
 * WAEHREND DIESE DATEI GRUEN WAR:
 *   „Gold fittet noch immer nicht in den Kreis."
 *   „Avatar System … wenn ich einen anderen Avatar waehle kommt wieder
 *    der Platzhalter."
 * Beide waren echt und beide sind hier nachgemessen worden. Warum diese
 * Pruefung sie durchgelassen hat — fuenf Gruende, jeder einzeln
 * ausreichend, alle fuenf jetzt behoben:
 *
 *  (1) FALSCHER BAUM. `DATEI` war fest verdrahtet auf
 *      /home/user/elemental-td/arena_patches/ui_prototype.html. Aus einem
 *      Worktree heraus hat die Pruefung damit einen anderen Stand
 *      gemessen als den, den man gerade aendert. Jetzt: __dirname.
 *  (2) KEINE ECHTEN BILDER. Die Datei setzte ihre eigenen `data:`-Motive
 *      ein (magenta, 10x10 und 40x10) und lief ueber file://. Sie hat nie
 *      ein einziges Asset aus arena_patches/assets/ geladen — und genau in
 *      den Assets lagen beide Ursachen (der helle eingebackene Grund von
 *      cur_gold, die vollflaechig deckenden frame_*.webp). Jetzt: eigener
 *      HTTP-Server auf arena_patches/, echte Dateien, echte Statuscodes.
 *  (3) DIE PRUEFUNG SCHRIEB SICH IHR PRUEFOBJEKT SELBST. Fuer den Avatar
 *      stand hier woertlich
 *          i.className = "avmini";
 *          i.innerHTML = '<span class="avemo">…</span><img …>';
 *      Damit hat sie den EINEN Kasten geprueft, der bereits repariert
 *      war, und zwar mit Markup, das sie selbst erzeugt hat. Die vier
 *      Geschwisterklassen, die der Auftraggeber tatsaechlich ansieht —
 *      .avcpic (Raster), .avpvpic (Vorschau), .pfpic (Profil),
 *      .avcerpic (Zeremonie) — trugen denselben Fehler weiter und wurden
 *      nie geoeffnet. Das Fenster „Profil bearbeiten" hat diese Datei
 *      ueberhaupt nie aufgemacht. Jetzt: gemessen wird, was die App
 *      rendert, nie was die Pruefung schreibt.
 *  (4) NUR GEOMETRIE, KEINE PIXEL. Alle Avatarschritte waren
 *      getBoundingClientRect. Ein deckendes Overlay hat aber dieselben
 *      Rechtecke wie ein durchsichtiges — der Fehler war fuer diese
 *      Messung unsichtbar. Jetzt wird PIXELWEISE gemessen, ob das
 *      Portrait ueberhaupt zu sehen ist.
 *  (5) elementFromPoint HAETTE ES AUCH NICHT GEFUNDEN. Die Rahmenringe
 *      tragen `pointer-events:none`; der Treffer in der Kachelmitte ist
 *      das IMG, obwohl darueber eine deckende Grafik liegt. Nachgemessen
 *      im kaputten Zustand: inMitte = "IMG". Wer „ist das Portrait
 *      verdeckt?" mit elementFromPoint beantwortet, bekommt gruen.
 *      Deshalb ist das hier nur eine Notiz im Bericht, NIE das Kriterium.
 *
 * DIE MESSWERTE, die zu dieser Fassung gefuehrt haben
 * ---------------------------------------------------
 * Gold: Fassung 24x24, padding 4,5 px, Motivkasten 15x15, object-fit
 *   contain — geometrisch bei allen drei gleich. Der Ring war trotzdem
 *   nur deshalb frei, weil `filter:url(#icoFrei)` den eingebackenen
 *   Grund wegschneidet. Motivanteil der Quelldatei: cur_trophy 36 %,
 *   cur_gem 43 %, cur_gold 100 %. Grund-Luminanz: 8 %, 7 %, 13 %.
 *   Mit abgeschaltetem Filter gemessen (Differenzbild gegen die leere
 *   Fassung): Scheibendeckung 19 % -> 35 %, Aussenring 0 % -> 6 %, und
 *   im Bild liegt ein helles Quadrat ueber der Scheibe. Nur bei Gold.
 * Avatar (60-px-Kachel, 430x932): Kreis x=40,2 b=60 · Emoji x=27,2 b=26
 *   · Bild x=53,2 b=60. Emoji und Bild lagen als normale Flex-KINDER
 *   nebeneinander; nur 47 der 60 Bildpunkte lagen im Kreis. Darueber
 *   frame_common.webp als background-image: 848x1264, Alpha durchgehend
 *   255, Innenflaeche 7–9 % Luminanz — vollflaechig deckend. Sichtbar
 *   blieb der schmale Streifen rechts, um den das Bild verschoben war.
 * Kopfleiste: apphead y=0…83, `.avatar i` y=-8…84.
 *
 * WICHTIG BEIM SCHREIBEN NEUER SCHRITTE
 * Die Icon-Aufloesung laeuft NACH: `sweepSoon()` setzt bei 900, 2200 und
 * 6000 ms erneut an. Deshalb wird erst NACH 6,5 s gemessen. Wer diese
 * Wartezeit kuerzt, prueft nichts.
 * Und: `img.ico` traegt `filter:url(#icoFrei)`. Der dunkelt Flaechen ab,
 * ein Helligkeits-Test faellt darauf herein. Gemessen wird deshalb die
 * DIFFERENZ zweier Aufnahmen (Motiv sichtbar / Motiv versteckt) — die
 * ist von Filtern und Farben unabhaengig.
 *
 * AUFRUF
 *   export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node bildzustand.js
 * =================================================================== */
const { chromium } = require("playwright-core");
const { execFileSync } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

/* ⚠ __dirname, nicht der feste Pfad. Der feste Pfad war heute dreimal
   die Ursache falsch-gruener Laeufe aus einem Worktree. */
const WURZEL = path.resolve(__dirname, "..");
const TMP = fs.mkdtempSync("/tmp/bildzustand_");

/* Zwei Testmotive, vollflaechig magenta, zur Laufzeit erzeugt — sie
   dienen nur noch den STRUKTUR-Schritten (passt ein fremdes Bild in
   seinen Kasten). Alles, was mit „sieht man es" zu tun hat, misst
   ausschliesslich die echten Assets. */
function motiv(w, h) {
  const py = `
from PIL import Image
import base64,io,sys
im=Image.new('RGB',(${w},${h}),(255,0,255))
b=io.BytesIO(); im.save(b,'PNG')
sys.stdout.write(base64.b64encode(b.getvalue()).decode())
`;
  return "data:image/png;base64," + execFileSync("python3", ["-c", py]).toString().trim();
}
const QUADRAT = motiv(10, 10);

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; console.log("  ok   " + n); }
  else { fehl++; console.log("  FEHL " + n + (z !== undefined ? "  ->  " + z : "")); }
};
const gegen = (n, erkannt, z) => {
  if (erkannt) { ok++; console.log("  ok   Gegenprobe " + n); }
  else { fehl++; console.log("  FEHL Gegenprobe " + n + " haette rot sein muessen" + (z !== undefined ? "  ->  " + z : "")); }
};

const TYP = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4",
  ".mp3": "audio/mpeg", ".css": "text/css", ".svg": "image/svg+xml" };

(async () => {
  /* ---- eigener Server: kein file://, die Live-Seite kommt auch ueber HTTP ---- */
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const f = path.join(WURZEL, u === "/" ? "/ui_prototype.html" : u);
    if (!f.startsWith(WURZEL) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404); res.end("nicht da"); return;
    }
    res.writeHead(200, { "Content-Type": TYP[path.extname(f)] || "application/octet-stream" });
    res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, r));
  const DATEI = "http://127.0.0.1:" + server.address().port + "/ui_prototype.html?test=1";

  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  /* 430x932 ist das Geraet, von dem die Meldungen kommen (iPhone 15/16
     Pro Max). deviceScaleFactor 4, damit ein 24-px-Medaillon 96 Pixel
     hat und ein Anteil von 2 % ueberhaupt messbar ist. */
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 4 });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 160)));
  await p.goto(DATEI, { waitUntil: "load", timeout: 40000 });
  /* Ueber den letzten Sweep hinaus warten — siehe Kopf. */
  await p.waitForTimeout(6800);
  await p.evaluate(() => {
    ["loginLayer", "dailyLayer", "offerLayer", "cineLayer", "avCerLayer", "splashLayer"]
      .forEach(i => { const e = document.getElementById(i); if (e) e.classList.remove("open"); });
  });
  await p.waitForTimeout(300);

  /* ================================================================
   * WERKZEUG: DIFFERENZMESSUNG
   * Zwei Aufnahmen desselben Elements — einmal mit dem Motiv, einmal
   * mit `visibility:hidden` darauf. Was sich unterscheidet, IST das
   * Motiv. Das ist unabhaengig von Farbe, Filter und Hintergrund und
   * damit das einzige Mass, das auch dann noch stimmt, wenn jemand die
   * Assets tauscht. `r0`/`r1` grenzen einen Kreisring ein (Anteil des
   * Radius); r0=0 misst die ganze Scheibe.
   * ================================================================ */
  let lfd = 0;
  async function differenz(wahl, motivWahl, r0, r1) {
    const n = "d" + (++lfd);
    const aus = TMP + "/" + n;
    await p.locator(wahl).screenshot({ path: aus + "_mit.png" });
    await p.evaluate(w => { document.querySelector(w).style.visibility = "hidden"; }, motivWahl);
    await p.locator(wahl).screenshot({ path: aus + "_ohne.png" });
    await p.evaluate(w => { document.querySelector(w).style.visibility = ""; }, motivWahl);
    const py = `
from PIL import Image
a=Image.open("${aus}_mit.png").convert('RGB'); b=Image.open("${aus}_ohne.png").convert('RGB')
w,h=a.size; pa=a.load(); pb=b.load(); R=min(w,h)/2
n=0; d=0
for y in range(h):
  for x in range(w):
    r=(((x+.5)-w/2)**2+((y+.5)-h/2)**2)**.5 / R
    if r < ${r0} or r > ${r1}: continue
    n+=1
    if sum(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))>24: d+=1
print(round(100*d/n) if n else -1)
`;
    return +execFileSync("python3", ["-c", py]).toString().trim();
  }

  /* Zwei Aufnahmen ZU VERSCHIEDENEN ZEITPUNKTEN vergleichen — dafuer,
     dass ein Wechsel wirklich etwas am Bildschirm veraendert. */
  async function schnappschuss(wahl, name) {
    const f = TMP + "/s_" + name + ".png";
    await p.locator(wahl).screenshot({ path: f });
    return f;
  }
  function unterschied(a, c) {
    const py = `
from PIL import Image
a=Image.open("${a}").convert('RGB'); b=Image.open("${c}").convert('RGB')
if a.size!=b.size: print(100)
else:
  w,h=a.size; pa=a.load(); pb=b.load()
  d=sum(1 for y in range(h) for x in range(w)
        if sum(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))>24)
  print(round(100*d/(w*h)))
`;
    return +execFileSync("python3", ["-c", py]).toString().trim();
  }

  /* ================================================================
   * 0. GRUNDLAGE — messen wir ueberhaupt an echten Bildern?
   * Ohne diesen Schritt kann jede folgende Messung „gruen" sein, weil
   * gar nichts geladen ist. Das war der eigentliche Konstruktionsfehler
   * der ersten Fassung.
   * ================================================================ */
  const geladen = await p.evaluate(() => {
    return [...document.querySelectorAll(".topbar .cur i > img")].map(im => ({
      src: im.getAttribute("src") || "",
      da: im.complete && im.naturalWidth > 0
    }));
  });
  pruef("die drei Waehrungsmotive sind ECHTE, geladene Assets",
        geladen.length === 3 && geladen.every(x => x.da && /^\.\/assets\//.test(x.src)),
        JSON.stringify(geladen));

  /* ================================================================
   * 1. WAEHRUNGS-MEDAILLONS — der Ring bleibt frei
   * ⚠ DRITTE FASSUNG. Fassung 1 prueft „object-fit ist gesetzt" (war ein
   * No-op). Fassung 2 setzte ein magenta Ersatzmotiv ein und mass dessen
   * Farbton — beides konnte den echten Befund nicht sehen.
   * Fassung 3 misst das ECHTE Motiv im Differenzbild und fragt nach dem
   * AUSSENRING: zwischen 66 % und 100 % des Radius darf vom Motiv nichts
   * liegen. 66 % ist nicht gegriffen, sondern die Vorgabe: der
   * Motivkasten ist 15 von 24 px, sein Umkreis endet bei 62,5 % — ein
   * ordentlich beschnittenes Motiv bleibt also mit Reserve darunter.
   * ================================================================ */
  const WAEHRUNGEN = ["c-trophy", "c-gem", "c-gold"];
  const ringDeckung = {};
  for (const k of WAEHRUNGEN) {
    ringDeckung[k] = await differenz(".cur." + k + " i", ".cur." + k + " i > *", 0.66, 0.98);
  }
  pruef("kein Waehrungsmotiv beruehrt den Rand seiner Fassung",
        WAEHRUNGEN.every(k => ringDeckung[k] <= 2),
        JSON.stringify(ringDeckung) + " % Aussenring (erlaubt bis 2)");

  /* Gegenprobe: der Rueckfall in genau die gemeldete Form — Motiv fuellt
     die Fassung randlos. Muss deutlich ueber die Schwelle gehen. */
  await p.addStyleTag({ content:
    "#gegen1{}.cur i{padding:0!important}.cur .ico{border-radius:0!important}" });
  const gegenRing = await differenz(".cur.c-gold i", ".cur.c-gold i > *", 0.66, 0.98);
  /* Die Schwelle ist gemessen, nicht geschaetzt: randlos aufgezogen sind
     es 14 % Aussenring gegen 0 % im richtigen Zustand. `> 8` liegt in der
     Mitte dieser Luecke und ueber der 2-%-Grenze des Schrittes selbst.
     Nicht hoeher setzen — der Freistell-Filter laeuft in DIESER Probe
     noch mit und schneidet einen Teil des Quadrats ohnehin weg. */
  gegen("Aussenring", gegenRing > 8 && gegenRing > ringDeckung["c-gold"] + 5,
        "randlos aufgezogen: " + gegenRing + " % gegen " + ringDeckung["c-gold"] + " % vorher");
  await p.evaluate(() => {
    [...document.querySelectorAll("style")].forEach(s => {
      if (s.textContent.indexOf("#gegen1") === 0) s.remove();
    });
  });

  /* ---- Der freie Ring darf NICHT am Freistell-Filter haengen ----
     DAS ist der Schritt, der den gemeldeten Rueckfall gefunden haette.
     Geprueft wird im Chromium, gemeldet wird vom iPhone. `filter:url()`
     zeigt auf eine Referenz im Dokument; wenn die auf einem Geraet nicht
     greift, steht ploetzlich der eingebackene Grund des Assets im
     Medaillon — bei cur_gold ein helles Quadrat ueber der ganzen
     Scheibe. Eine Fassung, deren Rundheit an einem SVG-Filter haengt,
     ist nicht rund, sondern hat Glueck. */
  await p.addStyleTag({ content: "#gegen2{}.cur .ico{filter:none!important}" });
  const ohneFilter = {};
  for (const k of WAEHRUNGEN) {
    ohneFilter[k] = await differenz(".cur." + k + " i", ".cur." + k + " i > *", 0.66, 0.98);
  }
  pruef("der freie Ring haengt NICHT am Freistell-Filter",
        WAEHRUNGEN.every(k => ohneFilter[k] <= 2),
        JSON.stringify(ohneFilter) + " % Aussenring ohne #icoFrei");

  /* Gegenprobe dazu: nimmt man dem Motiv seine eigene Rundung, traegt
     ohne Filter wieder das nackte Quadrat — dann MUSS es rot werden. */
  await p.addStyleTag({ content: "#gegen3{}.cur .ico{border-radius:0!important}" });
  const ohneRundung = await differenz(".cur.c-gold i", ".cur.c-gold i > *", 0.66, 0.98);
  gegen("Ring ohne Filter", ohneRundung > ohneFilter["c-gold"] + 2,
        "ohne Rundung " + ohneRundung + " % gegen mit Rundung " + ohneFilter["c-gold"] + " %");
  await p.evaluate(() => {
    [...document.querySelectorAll("style")].forEach(s => {
      const t = s.textContent;
      if (t.indexOf("#gegen2") === 0 || t.indexOf("#gegen3") === 0) s.remove();
    });
  });

  /* Struktur — die Fassung selbst. Diese Schritte bleiben aus Fassung 2:
     sie halten fest, dass es UEBERHAUPT drei gleiche runde Medaillons
     gibt, unabhaengig vom Bild darin. */
  const fassung = await p.evaluate(() => {
    return [...document.querySelectorAll(".topbar .cur")].map(c => {
      const i = c.querySelector("i"), cs = getComputedStyle(i);
      const r = i.getBoundingClientRect();
      return { k: c.className.replace("cur ", ""),
               w: Math.round(r.width), h: Math.round(r.height),
               rund: cs.borderRadius === "50%", clip: cs.overflow === "hidden",
               oben: parseFloat(cs.paddingTop), links: parseFloat(cs.paddingLeft) };
    });
  });
  pruef("jede Waehrungsfassung haelt ihren Rand frei",
        fassung.length === 3 && fassung.every(x => x.oben >= 3 && x.links >= 3),
        JSON.stringify(fassung));
  pruef("alle drei Medaillons sind rund, beschneiden und sind gleich gross",
        fassung.length === 3 && fassung.every(x => x.rund && x.clip) &&
        new Set(fassung.map(x => x.w + "x" + x.h)).size === 1,
        JSON.stringify(fassung));

  /* ================================================================
   * 2. AVATAR — gemessen an DEN KACHELN, DIE DIE APP BAUT
   * Kein selbst geschriebenes Markup mehr (Grund 3 im Kopf).
   * ================================================================ */
  await p.evaluate(() => window.__proto.show("navEditProfile"));
  await p.waitForTimeout(1200);
  await p.waitForFunction(() => {
    const im = document.querySelector("#avGrid .avcell .avcpic img");
    return im && im.complete && im.naturalWidth > 0;
  }, null, { timeout: 15000 }).catch(() => {});

  const kacheln = await p.evaluate(() => {
    const k = e => { const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y),
               w: Math.round(r.width), h: Math.round(r.height) }; };
    return [...document.querySelectorAll("#avGrid .avcell")].map(z => {
      const pic = z.querySelector(".avcpic");
      const img = pic.querySelector("img"), emo = pic.querySelector(".avemo");
      const rp = pic.getBoundingClientRect();
      const treffer = document.elementFromPoint(rp.x + rp.width / 2, rp.y + rp.height / 2);
      return { key: z.getAttribute("data-avpick"),
        hatBild: !!img, geladen: img ? (img.complete && img.naturalWidth > 0) : false,
        kreis: k(pic), bild: img ? k(img) : null, emoji: emo ? k(emo) : null,
        /* NUR ZUR INFORMATION — siehe Grund 5 im Kopf: die Ringe tragen
           pointer-events:none, elementFromPoint findet ein Overlay nicht. */
        inMitte: treffer ? treffer.tagName : null };
    });
  });
  const mitBild = kacheln.filter(z => z.hatBild);
  const gleich = (a, c) => a && c && a.x === c.x && a.y === c.y && a.w === c.w && a.h === c.h;

  pruef("das Raster laedt echte Portraits (nicht nur Emoji-Rueckfall)",
        mitBild.length >= 5 && mitBild.every(z => z.geladen),
        mitBild.length + " Kacheln mit Bild, davon geladen: " +
        mitBild.filter(z => z.geladen).length);
  pruef("in JEDER Kachel liegt das Portrait deckungsgleich im Kreis",
        mitBild.every(z => gleich(z.bild, z.kreis)),
        JSON.stringify(mitBild.filter(z => !gleich(z.bild, z.kreis))
          .slice(0, 3).map(z => z.key + " Bild " + JSON.stringify(z.bild) +
            " Kreis " + JSON.stringify(z.kreis))));
  pruef("der Emoji-Rueckfall liegt DAHINTER, nicht daneben",
        kacheln.every(z => gleich(z.emoji, z.kreis)),
        JSON.stringify(kacheln.filter(z => !gleich(z.emoji, z.kreis))
          .slice(0, 3).map(z => z.key + " Emoji " + JSON.stringify(z.emoji))));

  /* Gegenprobe: der alte Aufbau (beide als normale Flex-Kinder) MUSS als
     verschoben erkannt werden. */
  gegen("Kachel-Ueberlagerung", await p.evaluate(() => {
    const pic = document.querySelector("#avGrid .avcell .avcpic");
    const img = pic.querySelector("img"), emo = pic.querySelector(".avemo");
    img.style.position = "static"; emo.style.position = "static";
    const a = img.getBoundingClientRect(), c = pic.getBoundingClientRect();
    const verschoben = Math.abs(a.x - c.x) > 1 || Math.abs(a.width - c.width) > 1;
    img.style.position = ""; emo.style.position = "";
    return verschoben;
  }));

  /* ---- DER SCHRITT, DEN ES BISHER NICHT GAB ----
     Ist das Portrait ueberhaupt ZU SEHEN? Geometrie beantwortet das
     nicht: ein deckendes Overlay hat dieselben Rechtecke wie ein
     durchsichtiges, und elementFromPoint laeuft an `pointer-events:none`
     vorbei. Also PIXEL: die Kachel einmal mit und einmal ohne Portrait
     aufnehmen. Was das Portrait beitraegt, muss ein erheblicher Teil
     des Kreises sein. Im gemeldeten Zustand lag frame_common.webp
     (Alpha 255, Innenflaeche 7–9 % Luminanz) vollflaechig darueber. */
  const ersteMitBild = mitBild[0].key;
  const kachelWahl = '#avGrid [data-avpick="' + ersteMitBild + '"] .avcpic';
  const sicht = await differenz(kachelWahl, kachelWahl + " img", 0, 0.9);
  pruef("das Portrait ist in der Kachel wirklich SICHTBAR",
        sicht >= 25, sicht + " % der Kreisflaeche kommen vom Portrait " +
        "(mindestens 25) · elementFromPoint sagt hier " +
        kacheln.find(z => z.key === ersteMitBild).inMitte + " — kein Kriterium, siehe Kopf");

  /* Gegenprobe: eine deckende Schicht daruebergelegt, so wie es der
     Rahmenring vorher tat — die Sichtbarkeit MUSS zusammenbrechen. */
  await p.evaluate(w => {
    const pic = document.querySelector(w);
    const s = document.createElement("span");
    s.id = "gegenDeckel";
    s.style.cssText = "position:absolute;inset:0;border-radius:50%;background:#12202c;" +
      "pointer-events:none;z-index:9";
    pic.appendChild(s);
  }, kachelWahl);
  const sichtVerdeckt = await differenz(kachelWahl, kachelWahl + " img", 0, 0.9);
  gegen("Portrait sichtbar", sichtVerdeckt < 5,
        "verdeckt " + sichtVerdeckt + " % gegen frei " + sicht + " %");
  await p.evaluate(() => { const e = document.getElementById("gegenDeckel"); if (e) e.remove(); });

  /* ================================================================
   * 3. AVATARWECHSEL — aendert sich das ANGEZEIGTE Bild wirklich?
   * Der Auftraggeber schrieb: „…kommt der Toast ‚Avatar gewaehlt', die
   * Auswahl wird also gebucht; sichtbar aendert sich nichts." Genau das
   * trennt dieser Schritt: nicht der Zustand im Modul zaehlt, sondern
   * das Bild auf dem Schirm. avatare.js prueft den Zustand — hier
   * werden die Pixel der grossen Vorschau verglichen.
   * ================================================================ */
  const vorherSrc = await p.evaluate(() =>
    (document.querySelector(".avpvpic img") || {}).src || null);
  const vorherBild = await schnappschuss(".avpvpic", "wechsel_vorher");

  const ziel = await p.evaluate(() => {
    const A = window.ArenaAvatars;
    const z = A.list().filter(a => !a.locked && !a.gewaehlt && a.portraitUrl)[0];
    if (!z) return null;
    document.querySelector('#avGrid [data-avpick="' + z.key + '"]').click();
    return z.key;
  });
  await p.waitForTimeout(900);
  await p.waitForFunction(() => {
    const im = document.querySelector(".avpvpic img");
    return im && im.complete && im.naturalWidth > 0;
  }, null, { timeout: 10000 }).catch(() => {});
  const nachherSrc = await p.evaluate(() =>
    (document.querySelector(".avpvpic img") || {}).src || null);
  const nachherBild = await schnappschuss(".avpvpic", "wechsel_nachher");
  const wechselDiff = unterschied(vorherBild, nachherBild);

  pruef("ein Avatarwechsel tauscht die Bildquelle der Vorschau",
        !!ziel && !!nachherSrc && nachherSrc !== vorherSrc,
        "Ziel " + ziel + ": " + String(vorherSrc).split("/").pop() +
        " -> " + String(nachherSrc).split("/").pop());
  pruef("ein Avatarwechsel aendert die Vorschau auch auf dem SCHIRM",
        wechselDiff >= 10, wechselDiff + " % der Vorschaupixel geaendert (mindestens 10)");

  /* Gegenprobe: denselben Avatar noch einmal waehlen — dann DARF sich
     nichts aendern. Ohne diese Probe wuerde der Schritt auch dann gruen
     bleiben, wenn das Bild bei jedem Rendern zufaellig flackert. */
  const gleichBild1 = await schnappschuss(".avpvpic", "gleich1");
  await p.evaluate(k => {
    document.querySelector('#avGrid [data-avpick="' + k + '"]').click();
  }, ziel);
  await p.waitForTimeout(700);
  const gleichBild2 = await schnappschuss(".avpvpic", "gleich2");
  gegen("Avatarwechsel", unterschied(gleichBild1, gleichBild2) < 5,
        "derselbe Avatar noch einmal: " + unterschied(gleichBild1, gleichBild2) + " % Aenderung");

  /* ================================================================
   * 4. KOPFLEISTE — das Portrait bleibt in der Leiste
   * „Der grosse Avatar in der Kopfleiste ragt aus der Leiste heraus
   * (er steht im schwarzen Bereich darueber)."
   * ================================================================ */
  await p.evaluate(() => window.__proto.show("navHome"));
  await p.waitForTimeout(900);
  const kopf = await p.evaluate(() => {
    const a = document.querySelector(".apphead .avatar");
    if (!a) return null;
    const i = a.querySelector("i");
    const ra = i.getBoundingClientRect(), rh = a.closest(".apphead").getBoundingClientRect();
    return { oben: +(rh.top - ra.top).toFixed(1), unten: +(ra.bottom - rh.bottom).toFixed(1),
             hoehe: +ra.height.toFixed(1) };
  });
  pruef("der Kopfleisten-Avatar ragt senkrecht nicht aus der Leiste",
        kopf && kopf.oben <= 0.5 && kopf.unten <= 0.5,
        JSON.stringify(kopf) + " px Ueberstand oben/unten");
  gegen("Kopfleisten-Avatar", await p.evaluate(() => {
    const a = document.querySelector(".apphead .avatar"), i = a.querySelector("i");
    i.style.top = "-8px";
    const raus = a.closest(".apphead").getBoundingClientRect().top -
                 i.getBoundingClientRect().top;
    i.style.top = "";
    return raus > 0.5;
  }));

  /* ================================================================
   * 5. ALLGEMEIN
   * ================================================================ */
  /* Allgemeiner Fang fuer dieselbe Klasse an anderen Stellen: jedes
     eingesetzte Bild muss innerhalb seines Elternkastens bleiben. Hier
     ist das synthetische Motiv richtig — geprueft wird der KASTEN, nicht
     das Bild. */
  const ueber = await p.evaluate(U => {
    const raus = [];
    ["#offGrid .offcell", ".packshop .apkcard", ".prodgrid > *"].forEach(w => {
      document.querySelectorAll(w).forEach(z => {
        const alt = z.querySelector("img, .ico");
        if (!alt) return;
        const im = document.createElement("img");
        im.className = "ico"; im.src = U;
        alt.replaceWith(im);
        const a = im.getBoundingClientRect(), e = z.getBoundingClientRect();
        if (a.width > e.width + 2 || a.height > e.height + 2) {
          raus.push({ w: w, bild: Math.round(a.width) + "x" + Math.round(a.height),
                      kasten: Math.round(e.width) + "x" + Math.round(e.height) });
        }
      });
    });
    return raus;
  }, QUADRAT);
  pruef("kein eingesetztes Bild ist groesser als sein Kasten",
        ueber.length === 0, JSON.stringify(ueber.slice(0, 4)));

  pruef("keine JS-Fehler auf der Seite", jsF.length === 0, jsF.slice(0, 3).join(" | "));

  console.log("\nbildzustand.js  " + ok + " ok, " + fehl + " fehlgeschlagen\n");
  await b.close();
  server.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  if (fehl) process.exitCode = 1;
})();
