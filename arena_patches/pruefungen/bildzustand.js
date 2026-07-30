/* ===================================================================
 * bildzustand.js — der Zustand, den oertlich NIEMAND sieht.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Oertlich ist das CDN nicht erreichbar. Jedes Icon fAELLT auf ein Emoji
 * zurueck (DESIGNSYSTEM §7b). Damit ist der Zustand „ein echtes <img>
 * liegt im Kasten" fuer ALLE anderen Pruefungen dieses Verzeichnisses
 * strukturell unsichtbar — sie messen immer nur die Emoji-Variante.
 *
 * Am 30.07.2026 hat das zwei Fehler durchgelassen, die dem Auftraggeber
 * auf der LIVE-Seite sofort auffielen, waehrend hier alles gruen war:
 *
 *   1. „Das Ressourcen Icon ist nicht im Kreis."
 *      `.cur .ico` hatte kein `object-fit`. Ein Motiv wird dann auf
 *      18x18 QUADRATISCH GESTRECKT. Pokal und Kristall sind von Haus
 *      aus quadratisch mit transparentem Rand — unauffaellig. Das
 *      Gold-Motiv sind fuenf Muenzen im Breitformat: gestreckt bedeckt
 *      es das Medaillon randlos, die dunkle Scheibe verschwindet.
 *      Nachgemessen mit einem 40x10-Testmotiv: gestreckt 54 % Deckung,
 *      mit `contain` 12 %. Das Emoji 🪙 ist quadratisch — deshalb war
 *      oertlich nie etwas zu sehen.
 *
 *   2. „Avatar Bild funktioniert nicht ist am glitchen."
 *      `.avatar i` ist ein Flex-Kasten. Emoji-Rueckfall und Portrait
 *      lagen beide als normale Flex-KINDER darin, also NEBENeinander.
 *      Gemessen bei 98 px Rahmen: Emoji x=-5 w=34, Bild x=29 w=64 —
 *      das Portrait um ein Drittel verschoben und gequetscht, der
 *      Platzhalter daneben sichtbar. Ohne CDN entsteht gar kein Bild,
 *      das Emoji hat den Kasten allein, alles sieht richtig aus.
 *
 * DIE METHODE
 * Statt auf das CDN zu warten, setzt diese Datei ECHTE Bilder als
 * `data:`-URI ein — die laden immer, auch ohne Netz. Damit ist der
 * Live-Zustand oertlich pruefbar. Zwei Testmotive:
 *   QUADRAT (10x10) und BREIT (40x10).
 * Das breite Motiv ist der eigentliche Trick: nur daran unterscheiden
 * sich `fill` und `contain` ueberhaupt.
 *
 * WICHTIG BEIM SCHREIBEN NEUER SCHRITTE
 * Die Icon-Aufloesung laeuft NACH: `sweepSoon()` setzt bei 900, 2200 und
 * 6000 ms erneut an und ueberschreibt eingesetzte Bilder. Deshalb wird
 * erst NACH 6,5 s eingesetzt. Wer diese Wartezeit kuerzt, prueft nichts
 * — die erste Fassung dieser Datei mass genau deshalb 0 %.
 * Und: `img.ico` traegt `filter:url(#icoFrei)` (gewollte Freistellung).
 * Der dunkelt Flaechen ab, ein Helligkeits-Test faellt darauf herein.
 * Gemessen wird deshalb der FARBTON (R und B klar ueber G), nicht die
 * Helligkeit.
 *
 * AUFRUF
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node bildzustand.js
 * =================================================================== */
const { chromium } = require("playwright-core");
const { execFileSync } = require("child_process");

const DATEI = "file:///home/user/elemental-td/arena_patches/ui_prototype.html";

/* Zwei Testmotive, vollflaechig magenta, zur Laufzeit erzeugt — kein
   Hantieren mit eingefrorenen base64-Klumpen im Quelltext. */
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
const BREIT = motiv(40, 10);

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; } else { fehl++; console.log("  FEHL " + n + (z !== undefined ? "  ->  " + z : "")); }
};
const gegen = (n, erkannt, z) => {
  if (erkannt) { ok++; }
  else { fehl++; console.log("  FEHL Gegenprobe " + n + " haette rot sein muessen" + (z !== undefined ? "  ->  " + z : "")); }
};

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 4 });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 160)));
  await p.goto(DATEI, { waitUntil: "load", timeout: 40000 });
  /* Ueber den letzten Sweep hinaus warten — siehe Kopf. */
  await p.waitForTimeout(6800);
  await p.evaluate(() => {
    ["loginLayer", "dailyLayer", "offerLayer", "cineLayer", "avCerLayer", "splashLayer"]
      .forEach(i => { const e = document.getElementById(i); if (e) e.classList.remove("open"); });
  });

  /* Ein Motiv in einen Waehler setzen und warten, bis es wirklich dekodiert
     ist. Ohne dieses Warten steht naturalWidth auf 0 und jede Messung
     danach ist wertlos. */
  const setze = async (wahl, url, fit) => {
    await p.evaluate(([W, U, F]) => {
      const i = document.querySelector(W);
      i.innerHTML = '<img class="ico" src="' + U + '">';
      if (F) i.querySelector("img").style.objectFit = F;
    }, [wahl, url, fit || ""]);
    await p.waitForFunction(w => {
      const im = document.querySelector(w + " img");
      return im && im.complete && im.naturalWidth > 0;
    }, wahl, { timeout: 6000 });
  };

  /* Anteil der Kachel, den das Motiv bedeckt — ueber den Farbton. */
  const deckung = async (wahl, name) => {
    const pfad = "/tmp/bz_" + name + ".png";
    await p.locator(wahl).screenshot({ path: pfad });
    const py = `
from PIL import Image
im=Image.open("${pfad}").convert('RGB'); w,h=im.size; px=im.load()
n=sum(1 for y in range(h) for x in range(w)
      if px[x,y][0]>px[x,y][1]+12 and px[x,y][2]>px[x,y][1]+12)
print(round(100*n/(w*h)))
`;
    return +execFileSync("python3", ["-c", py]).toString().trim();
  };

  /* ---------- 1. Waehrungs-Medaillons: der Ring bleibt sichtbar ---------- */
  /* ⚠ ZWEITE FASSUNG. Die erste pruefte „object-fit ist gesetzt" und war
     WERTLOS: die Basisregel `.ico` setzt `contain` ohnehin fuer alle, der
     Schritt konnte also nie rot werden. Aufgefallen ist das nur, weil die
     Gegenprobe nach dem Zurueckdrehen des angeblichen Fixes gruen blieb.
     Der Befund war nie ein gestrecktes Bild, sondern ein Motiv OHNE
     eigenen transparenten Rand (`cur_gold` ist ein satter Muenzstapel,
     `cur_trophy`/`cur_gem` sind Einzelobjekte mit Luft drumherum).
     Geprueft wird jetzt die Anforderung selbst: EIN RANDLOSES MOTIV DARF
     DEN RING NICHT ZUDECKEN. Das gilt unabhaengig davon, mit welchem
     Mittel die Fassung ihren Rand freihaelt — Innenabstand heute,
     vielleicht ein neu zugeschnittenes Asset morgen. */
  await setze(".cur.c-gold i", QUADRAT);   // randlos, wie cur_gold
  const dJetzt = await deckung(".cur.c-gold i", "jetzt");
  pruef("ein randloses Motiv deckt den Medaillon-Ring nicht zu",
        dJetzt <= 45, dJetzt + " % Deckung (erlaubt bis 45 %)");

  /* Gegenprobe: ohne den freigehaltenen Rand (Motiv auf die volle Fassung
     aufgezogen) MUSS dieselbe Messung deutlich hoeher liegen. */
  const dRandlos = await (async () => {
    await p.evaluate(U => {
      const i = document.querySelector(".cur.c-gold i");
      i.style.padding = "0";
      i.innerHTML = '<img class="ico" style="width:100%;height:100%" src="' + U + '">';
    }, QUADRAT);
    await p.waitForFunction(() => {
      const im = document.querySelector(".cur.c-gold i img");
      return im && im.complete && im.naturalWidth > 0;
    }, null, { timeout: 6000 });
    const d = await deckung(".cur.c-gold i", "randlos");
    await p.evaluate(() => { document.querySelector(".cur.c-gold i").style.padding = ""; });
    return d;
  })();
  gegen("Medaillon-Ring", dRandlos > dJetzt + 15,
        "mit Rand " + dJetzt + " % gegen ohne Rand " + dRandlos + " %");

  /* Der Rand muss fuer ALLE drei gelten, nicht nur fuer Gold — sonst
     wandert der Fehler beim naechsten Asset-Tausch weiter. */
  const raender = await p.evaluate(() => {
    return [...document.querySelectorAll(".cur")].map(c => {
      const i = c.querySelector("i"), cs = getComputedStyle(i);
      return { k: c.className.replace("cur ", ""),
               oben: parseFloat(cs.paddingTop), links: parseFloat(cs.paddingLeft) };
    });
  });
  pruef("jede Waehrungsfassung haelt ihren Rand frei",
        raender.length === 3 && raender.every(x => x.oben >= 3 && x.links >= 3),
        JSON.stringify(raender));

  /* Alle drei Medaillons muessen dieselbe Fassung haben — rund, gleich
     gross, beschnitten. Eine einzelne Ausnahme war genau der Befund. */
  const fassung = await p.evaluate(() => {
    return [...document.querySelectorAll(".cur")].map(c => {
      const i = c.querySelector("i"), cs = getComputedStyle(i);
      const r = i.getBoundingClientRect();
      return { k: c.className.replace("cur ", ""),
               w: Math.round(r.width), h: Math.round(r.height),
               rund: cs.borderRadius === "50%", clip: cs.overflow === "hidden" };
    });
  });
  pruef("alle drei Medaillons sind rund und beschneiden",
        fassung.length === 3 && fassung.every(x => x.rund && x.clip),
        JSON.stringify(fassung));
  pruef("alle drei Medaillons sind gleich gross",
        new Set(fassung.map(x => x.w + "x" + x.h)).size === 1,
        JSON.stringify(fassung.map(x => x.w + "x" + x.h)));

  /* ---------- 2. Avatar: Bild und Rueckfall liegen UEBEREINANDER ---------- */
  const avatar = await p.evaluate(U => {
    const a = document.getElementById("profAvatar");
    const i = a.querySelector("i");
    i.className = "avmini";
    i.innerHTML = '<span class="avemo">🜂</span><img src="' + U + '">';
    return new Promise(res => {
      const im = i.querySelector("img");
      const fertig = () => {
        const kasten = e => { const r = e.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y),
                   w: Math.round(r.width), h: Math.round(r.height) }; };
        const rb = im.getBoundingClientRect(), re = i.querySelector(".avemo").getBoundingClientRect();
        res({ rahmen: kasten(i), bild: kasten(im), emoji: kasten(i.querySelector(".avemo")),
              nebeneinander: (rb.right <= re.left + 1) || (re.right <= rb.left + 1),
              geladen: im.complete && im.naturalWidth > 0 });
      };
      if (im.complete && im.naturalWidth > 0) fertig(); else im.onload = fertig;
    });
  }, QUADRAT);
  const gleich = (a, c) => a.x === c.x && a.y === c.y && a.w === c.w && a.h === c.h;
  pruef("das Testportrait ist wirklich geladen", avatar.geladen);
  pruef("Portrait und Emoji-Rueckfall stehen NICHT nebeneinander",
        avatar.nebeneinander === false,
        "Bild " + JSON.stringify(avatar.bild) + " Emoji " + JSON.stringify(avatar.emoji));
  pruef("das Portrait fuellt den Avatarrahmen vollstaendig",
        gleich(avatar.bild, avatar.rahmen),
        "Bild " + JSON.stringify(avatar.bild) + " Rahmen " + JSON.stringify(avatar.rahmen));
  pruef("der Rueckfall liegt deckungsgleich DAHINTER, nicht daneben",
        gleich(avatar.emoji, avatar.rahmen),
        "Emoji " + JSON.stringify(avatar.emoji) + " Rahmen " + JSON.stringify(avatar.rahmen));

  /* Gegenprobe: der alte Aufbau (beide als normale Flex-Kinder) MUSS als
     nebeneinander erkannt werden. */
  gegen("Avatar-Ueberlagerung", await p.evaluate(U => {
    const i = document.getElementById("profAvatar").querySelector("i");
    i.className = "avmini";
    i.innerHTML = '<span class="avemo" style="position:static">🜂</span>' +
                  '<img style="position:static;width:100%;height:100%" src="' + U + '">';
    const rb = i.querySelector("img").getBoundingClientRect();
    const re = i.querySelector(".avemo").getBoundingClientRect();
    return (rb.right <= re.left + 1) || (re.right <= rb.left + 1);
  }, QUADRAT));

  /* ---------- 3. Kein Bild darf seinen Kasten sprengen ---------- */
  /* Allgemeiner Fang fuer dieselbe Klasse an anderen Stellen: jedes
     eingesetzte Bild muss innerhalb seines Elternkastens bleiben. */
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
  if (fehl) process.exitCode = 1;
})();
