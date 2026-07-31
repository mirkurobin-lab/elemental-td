/* ==================================================================
 * KONTRAST AUF GERENDERTEN PIXELN — WERKZEUG, KEIN TOR
 * ------------------------------------------------------------------
 * ⚠ DIESE MESSUNG IST NOCH NICHT VERLAESSLICH. Sie laeuft als BERICHT
 * und beendet sich immer mit 0. Wer sie zu einem Pruefschritt macht,
 * baut ein rotes Tor, das man ignorieren lernt — und das ist schlimmer
 * als gar keins.
 *
 * WARUM ES SIE TROTZDEM GIBT
 * Die naheliegende Messung ueber getComputedStyle ist NACHWEISLICH
 * unbrauchbar: sie meldete Befunde in 16 von 16 Ansichten, den Titel
 * „Shop" mit angeblich 1,13:1. Verlaufsschrift setzt
 * -webkit-text-fill-color durchsichtig, und viele Untergruende sind
 * Bilder statt Farben — beides sieht sie nicht.
 *
 * DER ANSATZ
 * Jeder Textkasten wird zweimal aufgenommen — einmal normal, einmal mit
 * durchsichtig gestellter Fuellfarbe — und aus der Differenz die
 * Leuchtdichte der Schriftpixel gegen die des Untergrunds bestimmt.
 *
 * WAS DARAN SCHON STIMMT (jedes einzeln beim Bauen gemessen)
 *   · Text durchsichtig stellen statt entfernen: sonst schrumpft jeder
 *     inhaltsbreite Knopf und fast alle Pixel unterscheiden sich.
 *   · Kandidaten MARKIEREN statt spaeter ueber Text+Position suchen:
 *     mit Suche kamen 28 Knoten durch, mit Kennzeichen 380.
 *   · Untergrund im RING um die Glyphen statt global: ueber einem halb
 *     gefuellten Balken gibt es keinen einen Untergrund.
 *   · Emoji ausschliessen: „Kontrast" ist bei einem 🪨 keine Groesse.
 *   · Ungleichmaessigen Grund als „unbestimmt" ueberspringen statt zu
 *     raten.
 *
 * WAS NOCH NICHT STIMMT — der Grund fuer „Werkzeug, kein Tor"
 * Zwei Befunde wurden gegen die Wirklichkeit geprueft, beide FALSCH:
 *     Forge/btnMerge   gemeldet 1,19:1 — tatsaechlich dunkle Schrift
 *                      auf heller Platte, im Bild klar lesbar
 *     Board/lnm        gemeldet 1,02:1 — rgb(232,238,243) auf
 *                      rgb(27,39,50), rechnerisch 12,98:1
 * Die Ursache liegt in der Trennung von Schrift- und Grundpixeln:
 * Kantenglaettung schiebt Proben in den jeweils falschen Topf, und bei
 * duenner Schrift ueberwiegen die geglaetteten Pixel die vollen.
 *
 * ⚠ EIN FRUEHERES ERGEBNIS DIESER DATEI („0 Befunde ueber alle 16
 * Ansichten") STAMMT AUS EINER FASSUNG, DIE SICH SPAETER ALS EBENSO
 * UNZUVERLAESSIG ERWIESEN HAT. Die Null war Glueck, nicht Richtigkeit.
 * Das ist hier festgehalten, damit sie niemand als Nachweis zitiert.
 *
 * WAS UNABHAENGIG DAVON GESICHERT IST
 * Die Melde-Abzeichen wurden NICHT auf Grund dieser Messung geaendert,
 * sondern auf Grund der Farbwerte selbst: weiss auf --danger (#ff5e7e)
 * ergibt rechnerisch 2,94:1, weiss auf --melde (#c62348) 5,62:1. Das
 * ist Arithmetik aus zwei bekannten Farben und braucht keine Pixel.
 *
 * NAECHSTER SCHRITT, falls jemand weitermacht: die Trennung nicht ueber
 * einen festen Schwellwert (d > 60) fahren, sondern die Aufnahme mit
 * Text gegen die OHNE alpha-mischen und je Pixel die Deckung des
 * Glyphs bestimmen. Dann faellt die Kantenglaettung als eigener Fall
 * weg, statt zwischen die Toepfe zu geraten.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node kontrast.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');
const FILE = 'file://' + (process.env.UI_DATEI
  ? path.resolve(process.env.UI_DATEI)
  : path.resolve(__dirname, '..', 'ui_prototype.html'));
const VIEWS = ['navHome','navShop','navCollection','navForge','navPack','navFortress',
  'navClan','navBoard','navPass','navHeroes','navEvents','navMail','navFriends',
  'navSettings','navCommunity','navGuide'];

const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({ viewport:{width:430,height:932}, deviceScaleFactor:1 })).newPage();
  await p.goto(FILE);
  await p.waitForTimeout(1600);
  if (await p.locator('#loginLater').count()) await p.click('#loginLater');
  await p.waitForTimeout(500);

  /* Die Leuchtdichte-Auswertung passiert IM Browser auf einem Canvas —
     Node hat hier keinen PNG-Decoder. Gezeichnet wird per
     html2canvas-freiem Trick: der Kasten wird zweimal per
     page.screenshot geholt und im Browser via createImageBitmap
     ausgewertet. */
  const auswerten = async (clip) => {
    const mit = (await p.screenshot({ clip })).toString('base64');
    return mit;
  };

  /* Die Leuchtdichte-Rechnung wird ZWEIMAL gebraucht (Messung und
     Gegenprobe) und lebt deshalb als eine Funktion in der Seite. */
  await p.evaluate(() => {
    window.__kontrast = async (a, c) => {
      const lade = (b64) => new Promise(r => { const i = new Image();
        i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; });
      const [ia, ic] = await Promise.all([lade(a), lade(c)]);
      const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(ia, 0, 0); const A = g.getImageData(0,0,cv.width,cv.height).data;
      g.clearRect(0,0,cv.width,cv.height); g.drawImage(ic, 0, 0);
      const C = g.getImageData(0,0,cv.width,cv.height).data;
      const lum = (r,gg,bb) => { const f = x => { x/=255;
        return x<=.03928 ? x/12.92 : Math.pow((x+.055)/1.055,2.4); };
        return .2126*f(r) + .7152*f(gg) + .0722*f(bb); };
      /* ⚠ DER UNTERGRUND WIRD LOKAL GENOMMEN, NICHT GLOBAL.
         Die erste Fassung nahm den Median ALLER unveraenderten Pixel des
         Kastens. Das setzt einen gleichmaessigen Grund voraus — und
         genau den gibt es hier oft nicht: `#arenaProgLabel` liegt ueber
         einem halb gefuellten Goldbalken (links Gold, rechts dunkel),
         `#btnMerge` ueber einer Metallplatte mit Verlauf. Der Median
         beider Haelften ist eine Farbe, die an keiner Stelle vorkommt,
         und das Ergebnis war Unsinn: btnMerge kam auf 1,19:1, obwohl
         dort nachweislich dunkle Schrift auf heller Platte steht.
         Gemessen wird deshalb der Grund im RING um die Glyphen — die
         unveraenderten Pixel, die hoechstens zwei Pixel von einem
         veraenderten entfernt liegen. Das ist der Grund, gegen den das
         Auge die Schrift tatsaechlich sieht. */
      const W = cv.width, H = cv.height;
      const istText = new Uint8Array(W * H);
      for (let i = 0, px = 0; i < A.length; i += 4, px++) {
        const d = Math.abs(A[i]-C[i]) + Math.abs(A[i+1]-C[i+1]) + Math.abs(A[i+2]-C[i+2]);
        if (d > 60) istText[px] = 1;
      }
      let schrift = [], grund = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = y * W + x, i = px * 4;
        if (istText[px]) { schrift.push(lum(A[i],A[i+1],A[i+2])); continue; }
        let nah = false;
        for (let dy = -2; dy <= 2 && !nah; dy++) for (let dx = -2; dx <= 2; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          if (istText[yy * W + xx]) { nah = true; break; }
        }
        if (nah) grund.push(lum(C[i],C[i+1],C[i+2]));
      }
      if (schrift.length < 6 || grund.length < 6) return null;
      schrift.sort((x,y)=>x-y); grund.sort((x,y)=>x-y);
      const q = (arr, f) => arr[Math.floor((arr.length-1)*f)];
      const lg = q(grund, .5);
      /* Kern der Glyphen statt Mittelwert: die Kantenglaettung mischt
         Schrift und Grund und wuerde jeden Wert Richtung „bestanden"
         verwaessern. */
      const ls = q(schrift, lg > .5 ? .05 : .95);
      /* ⚠ WIE GLEICHMAESSIG IST DER GRUND UEBERHAUPT? Liegt Text ueber
         einer Kante — halb gefuellter Balken, Verlauf, Bildmotiv —, dann
         gibt es keinen EINEN Untergrund, gegen den man rechnen koennte.
         Statt in so einem Fall eine Zahl zu erfinden, sagt die Messung,
         dass sie es nicht entscheiden kann. Ein Pruefstand, der bei
         Unsicherheit raet, ist schlimmer als einer, der schweigt. */
      const streuung = q(grund, .9) - q(grund, .1);
      return { kn: +(((Math.max(ls,lg)+.05)/(Math.min(ls,lg)+.05)).toFixed(2)),
               unbestimmt: streuung > .18, streuung: +streuung.toFixed(3) };
    };
  });

  const befunde = [];
  let gemessen = 0, unbestimmt = 0;
  for (const v of VIEWS) {
    await p.evaluate(n => window.__proto.show(n), v);
    await p.waitForTimeout(420);
    /* ⚠ Die Kandidaten werden MARKIERT, nicht spaeter ueber Text und
       Position wiedergefunden. Die erste Fassung suchte sie erneut
       ("gleicher Text, gleiche Ecke") — und verlor dabei die meisten:
       gemessen kamen nur 28 Knoten ueber 16 Ansichten durch, keine zwei
       je Ansicht. Ein Kennzeichen am Element ist eindeutig und ueberlebt
       das Leeren des Textinhalts. */
    const kandidaten = await p.evaluate(() => {
      const out = [];
      let i = 0;
      document.querySelectorAll('.view.active *').forEach(e => {
        if (e.children.length || !e.textContent.trim()) return;
        const cs = getComputedStyle(e), bx = e.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .5) return;
        if (bx.width < 8 || bx.height < 6) return;
        if (bx.top < 0 || bx.bottom > innerHeight || bx.left < 0 || bx.right > innerWidth) return;
        /* ⚠ EMOJI UND SYMBOLE SIND KEIN TEXT. Sie bringen ihre Farben
           selbst mit; „Kontrast" ist bei einem 🪨 keine sinnvolle
           Groesse, und die Messung meldete sie reihenweise als Verstoss
           (Pass/rico „🪨", Forge/reqslot „＋"). Gemessen wird nur, was
           lateinische Buchstaben oder Ziffern enthaelt. */
        if (!/[A-Za-z0-9ÄÖÜäöüß]/.test(e.textContent)) return;
        const gross = parseFloat(cs.fontSize) >= 18.66 ||
                      (parseFloat(cs.fontSize) >= 14 && +cs.fontWeight >= 700);
        const mark = 'k' + (i++);
        e.setAttribute('data-kmark', mark);
        out.push({ mark, id: e.id || String(e.className).split(' ')[0],
          txt: e.textContent.trim().slice(0,18), gross,
          px: Math.round(parseFloat(cs.fontSize)),
          clip: { x: Math.round(bx.x), y: Math.round(bx.y),
                  width: Math.max(2, Math.round(bx.width)),
                  height: Math.max(2, Math.round(bx.height)) } });
      });
      return out;
    });
    for (const k of kandidaten) {
      const mit = (await p.screenshot({ clip: k.clip })).toString('base64');
      /* ⚠ DER TEXT WIRD DURCHSICHTIG GESTELLT, NICHT ENTFERNT.
         Die erste Fassung leerte `textContent` — und bei jedem Knopf,
         dessen Breite am Inhalt haengt, schrumpfte damit die ganze
         Flaeche. Fast alle Pixel unterschieden sich dann, der
         Untergrund bekam kaum Proben, und die Rechnung lieferte Unsinn:
         `#btnMerge` kam auf 1,19:1, obwohl dort nachweislich dunkle
         Schrift auf heller Platte steht und bestens lesbar ist.
         Eine Messung, die ihren Gegenstand veraendert, misst ihn nicht.
         Durchsichtige Fuellfarbe laesst den Kasten exakt stehen und
         nimmt nur die Glyphen weg — auch bei Verlaufsschrift, denn
         deren Farbe kommt ueber background-clip:text und verschwindet
         mit ihnen. */
      const alt = await p.evaluate((m) => {
        const el = document.querySelector('[data-kmark="' + m + '"]');
        if (!el) return null;
        const vor = { c: el.style.color, f: el.style.webkitTextFillColor,
                      s: el.style.textShadow };
        el.style.color = 'transparent';
        el.style.webkitTextFillColor = 'transparent';
        el.style.textShadow = 'none';
        return vor;
      }, k.mark);
      if (alt === null) continue;
      const ohne = (await p.screenshot({ clip: k.clip })).toString('base64');
      await p.evaluate(([m, v]) => {
        const el = document.querySelector('[data-kmark="' + m + '"]');
        if (el) { el.style.color = v.c; el.style.webkitTextFillColor = v.f;
                  el.style.textShadow = v.s; el.removeAttribute('data-kmark'); }
      }, [k.mark, alt]);
      const kn = await p.evaluate(([a, c]) => window.__kontrast(a, c), [mit, ohne]);
      if (kn === null) continue;
      if (kn.unbestimmt) { unbestimmt++; continue; }
      gemessen++;
      const soll = k.gross ? 3 : 4.5;
      if (kn.kn < soll) befunde.push({ v: v.replace('nav',''), ...k, kn: kn.kn, soll });
    }
  }
  befunde.sort((a,b)=>a.kn-b.kn);
  befunde.slice(0,25).forEach(x => console.log('  ' + String(x.kn).padStart(5) + ':1 (soll ' +
    x.soll + ')  ' + x.v + '/' + x.id + '  "' + x.txt + '" ' + x.px + 'px'));

  /* ⚠ Der wichtigste Schritt zuerst: hat die Messung ueberhaupt etwas
     gesehen? Eine Kontrastpruefung, die durch einen Selektorfehler NULL
     Knoten anfasst, meldet stolz „0 Befunde". Genau dieser Fall waere
     der teuerste — er sieht aus wie ein Erfolg. */
  step('Die Messung hat ueberhaupt Text vermessen', gemessen >= 200, gemessen + ' Textknoten');
  /* KEIN Pruefschritt — siehe Kopf. Nur eine Zahl zum Hinsehen. */
  console.log('\nBERICHT: ' + befunde.length + ' Verdachtsfaelle unter WCAG AA von ' +
    gemessen + ' eindeutig vermessenen Textknoten.');
  console.log('⚠ Verdachtsfaelle sind KEINE Befunde — zwei gepruefte waren falsch');
  console.log('  (btnMerge, Board/lnm). Jeden einzeln gegen das Bild pruefen.');

  /* Gegenprobe: die Messung MUSS einen echten Verstoss finden. Ohne sie
     ist „0 Befunde" nicht von „misst nichts" zu unterscheiden. */
  await p.evaluate(n => window.__proto.show(n), 'navHome');
  await p.waitForTimeout(400);
  const opferClip = await p.evaluate(() => {
    const e = [...document.querySelectorAll('.view.active *')].find(x =>
      !x.children.length && x.textContent.trim().length > 3 &&
      x.getBoundingClientRect().width > 30 && x.getBoundingClientRect().top > 0 &&
      x.getBoundingClientRect().bottom < innerHeight);
    if (!e) return null;
    e.style.color = '#3a4550'; e.style.webkitTextFillColor = '#3a4550';
    e.style.background = '#2b3540'; e.style.backgroundImage = 'none';
    e.style.filter = 'none'; e.style.textShadow = 'none';
    const b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y),
             width: Math.max(2, Math.round(b.width)), height: Math.max(2, Math.round(b.height)) };
  });
  let erkannt = 'kein Opfer gefunden';
  if (opferClip) {
    const m2 = (await p.screenshot({ clip: opferClip })).toString('base64');
    const t2 = await p.evaluate((c) => {
      const e = [...document.querySelectorAll('.view.active *')].find(x =>
        !x.children.length && Math.round(x.getBoundingClientRect().x) === c.x &&
        Math.round(x.getBoundingClientRect().y) === c.y);
      if (!e) return null; const t = e.textContent; e.textContent = ''; return t;
    }, opferClip);
    const o2 = (await p.screenshot({ clip: opferClip })).toString('base64');
    const kn2 = await p.evaluate(([a, c]) => window.__kontrast(a, c), [m2, o2]);
    erkannt = kn2 === null ? 'nicht messbar' : kn2.kn.toFixed(2) + ':1';
  }
  step('gegen: grau auf grau wuerde als Verstoss erkannt',
    typeof erkannt === 'string' && parseFloat(erkannt) > 0 && parseFloat(erkannt) < 4.5, erkannt);

  await b.close();
  const ok = steps.filter(s => s.ok).length;
  console.log('\n' + ok + '/' + steps.length + ' Schritte ok (Werkzeug, kein Tor)');
  /* Immer 0: diese Datei darf keinen Lauf rot machen. */
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
