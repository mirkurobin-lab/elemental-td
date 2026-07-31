/* ==================================================================
 * LESBARKEIT: jeder Schriftzug gegen seinen WIRKLICHEN Untergrund
 * ------------------------------------------------------------------
 * Vorgabe (31.07.2026): „check jeden Schriftzug auf Lesbarkeit usw."
 *
 * DIESE DATEI IST DER DRITTE ANLAUF, und die ersten beiden stehen im
 * Kopf von `kontrast.js` als das, was sie waren: nicht belastbar.
 *   1. Fassung: `getComputedStyle` — meldete Befunde in 16 von 16
 *      Ansichten, durchweg Artefakte. Ein Untergrund ist bei uns fast
 *      nie eine Farbe, sondern ein Bild oder ein Verlauf, und
 *      Verlaufsschrift traegt `-webkit-text-fill-color:transparent`.
 *   2. Fassung: echte Pixel, aber mit einer festen Schwelle `d > 60`,
 *      um Glyphe von Untergrund zu trennen. Zwei ihrer Befunde wurden
 *      gegen die Wirklichkeit als FALSCH nachgewiesen (btnMerge 1,19:1
 *      gemessen gegen 12,98:1 gerechnet). Der Grund: Kantenglaettung.
 *      Ein Buchstabenrand ist eine Mischung aus Schrift- und
 *      Untergrundfarbe, und keine Schwelle trennt die beiden sauber.
 *
 * DIE METHODE, DIE ES LOEST: DECKUNG STATT SCHWELLE
 * ------------------------------------------------------------------
 * Der Bildschirm wird ZWEIMAL fotografiert — einmal normal, einmal mit
 * unsichtbarer Schrift (`color:transparent`, kein Textschatten). Beide
 * Aufnahmen sind pixelgleich bis auf genau das, was die Glyphen malen.
 *
 * Damit ist je Pixel bekannt:
 *   U = Untergrund            (aus der Aufnahme ohne Schrift)
 *   M = Mischung              (aus der Aufnahme mit Schrift)
 *   M = a * S + (1 - a) * U   mit Deckung a und Schriftfarbe S
 *
 * `S` liefert `getComputedStyle` zuverlaessig (die Schriftfarbe ist
 * eine Farbe, auch wenn der Untergrund keine ist). Damit laesst sich
 * `a` je Kanal ausrechnen und mitteln. Gewertet werden nur Pixel mit
 * **a >= 0,9** — das ist der KERN des Strichs, nicht sein Rand. Die
 * Kantenglaettung faellt damit nicht unter eine Schwelle, sie wird
 * ausgerechnet und ausgeschlossen.
 *
 * Verglichen wird dann `S` gegen den Mittelwert von `U` an genau diesen
 * Pixeln — also gegen den Untergrund, den die Schrift wirklich hat,
 * Bild, Verlauf oder Farbe.
 *
 * ⚠ VIER FALLEN, in die auch diese Fassung gelaufen ist:
 *   a) Verlaufsschrift (`-webkit-text-fill-color:transparent` +
 *      `background-clip:text`) hat KEINE Schriftfarbe im Sinne von S.
 *      Fuer sie wird S aus den deckendsten Pixeln der Aufnahme MIT
 *      Schrift geschaetzt, statt sie zu ueberspringen.
 *   b) Emoji sind keine Schrift. Sie faerben sich nicht mit `color` und
 *      wuerden als „Deckung 0" durchfallen. Zeichen ausserhalb von
 *      Latin-1 + Interpunktion werden nicht gewertet.
 *   c) Ein Element, das beim zweiten Foto seine GROESSE aendert (weil
 *      etwas animiert), macht die beiden Aufnahmen unvergleichbar.
 *      Animationen werden fuer beide Aufnahmen stillgelegt.
 *   d) Sehr kleine Schrift hat kaum Pixel mit voller Deckung. Unter 12
 *      solchen Pixeln ist das Ergebnis Rauschen — dann wird nichts
 *      gemeldet, sondern gezaehlt, wie oft das passiert ist.
 *
 * MASSSTAB: WCAG 2.1 — 4,5:1 fuer normale Schrift, 3:1 ab 18,66 px
 * (oder 14 px fett). Gemeldet wird ab 3,0:1, damit die Liste die Faelle
 * zeigt, die auch bei grosser Schrift zu wenig sind.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node lesbarkeit.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');
const zlib = require('zlib');

const FILE = 'file://' + (process.env.UI_DATEI
  ? path.resolve(process.env.UI_DATEI)
  : path.resolve(__dirname, '..', 'ui_prototype.html'));

const VIEWS = ['navHome', 'navShop', 'navCollection', 'navForge', 'navPack', 'navFortress',
  'navClan', 'navBoard', 'navPass', 'navHeroes', 'navEvents', 'navMail', 'navFriends',
  'navSettings', 'navCommunity', 'navGuide'];

const DECKUNG = 0.9;       // ab hier gilt ein Pixel als Strich-Kern
const MIN_PIXEL = 12;      // darunter ist das Ergebnis Rauschen
const MELDE_AB = 3.0;      // gemeldet wird alles darunter

const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}
function gegen(name, sollFalschSein, info) { step('gegen: ' + name, !sollFalschSein, info); }

/* --- PNG lesen, ohne Fremdpaket ------------------------------------
   Playwright liefert PNG. Gebraucht werden nur RGBA-Pixel; das ist mit
   zlib und dem Filter-Algorithmus aus der PNG-Spezifikation machbar. */
function pngLesen(buf) {
  let p = 8, w = 0, h = 0, bit = 0, farbtyp = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const typ = buf.toString('ascii', p + 4, p + 8);
    const dat = buf.slice(p + 8, p + 8 + len);
    if (typ === 'IHDR') {
      w = dat.readUInt32BE(0); h = dat.readUInt32BE(4);
      bit = dat[8]; farbtyp = dat[9];
    } else if (typ === 'IDAT') idat.push(dat);
    else if (typ === 'IEND') break;
    p += 12 + len;
  }
  if (bit !== 8 || (farbtyp !== 6 && farbtyp !== 2)) {
    throw new Error('PNG-Form nicht unterstuetzt: bit=' + bit + ' typ=' + farbtyp);
  }
  const kan = farbtyp === 6 ? 4 : 3;
  const roh = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * kan);
  const zeile = w * kan;
  let vorZ = Buffer.alloc(zeile);
  for (let y = 0; y < h; y++) {
    const f = roh[y * (zeile + 1)];
    const src = roh.slice(y * (zeile + 1) + 1, y * (zeile + 1) + 1 + zeile);
    const cur = Buffer.alloc(zeile);
    for (let i = 0; i < zeile; i++) {
      const a = i >= kan ? cur[i - kan] : 0;   // links
      const b = vorZ[i];                        // oben
      const c = i >= kan ? vorZ[i - kan] : 0;   // oben links
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 255;
    }
    cur.copy(out, y * zeile);
    vorZ = cur;
  }
  return { w, h, kan, dat: out };
}

const srgb = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const kontrast = (a, b) => { const l1 = Math.max(a, b), l2 = Math.min(a, b); return (l1 + 0.05) / (l2 + 0.05); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto(FILE);
  await page.waitForTimeout(1200);
  if (await page.locator('#loginLater').count()) await page.click('#loginLater');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.layer.open,.pop.open,.modal.open')
    .forEach(e => e.classList.remove('open')));

  /* Falle c: Bewegung stilllegen — beide Aufnahmen muessen bis auf die
     Glyphen deckungsgleich sein. */
  await page.addStyleTag({ content:
    '*,*::before,*::after{animation:none!important;transition:none!important}' });

  const befunde = [], zuKlein = [];
  let gemessen = 0, verlaufSchrift = 0;

  for (const v of VIEWS) {
    await page.evaluate(n => window.__proto.show(n), v);
    await page.waitForTimeout(320);

    /* Alle Textelemente dieser Ansicht mit ihrem Kasten und ihrer Farbe. */
    const ziele = await page.evaluate(() => {
      const A = document.querySelector('.view.active');
      const out = [];
      const nm = e => e.id || String(e.className).split(' ')[0] || e.tagName.toLowerCase();
      A.querySelectorAll('*').forEach(e => {
        const eigen = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!eigen) return;
        const c = getComputedStyle(e);
        if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.15) return;
        const b = e.getBoundingClientRect();
        if (b.width < 4 || b.height < 4) return;
        if (b.top < 0 || b.left < 0 || b.bottom > innerHeight || b.right > innerWidth) return;
        /* Falle b: Emoji und Zeichen ohne Schriftfarbe nicht werten. */
        const txt = [...e.childNodes].filter(n => n.nodeType === 3)
          .map(n => n.textContent).join('').trim();
        if (!txt || !/[A-Za-zÀ-ÿ0-9]/.test(txt)) return;
        const fill = c.webkitTextFillColor || c.color;
        const verlauf = /transparent|rgba\(0, 0, 0, 0\)/.test(fill);
        out.push({
          nm: nm(e), txt: txt.slice(0, 20), verlauf,
          farbe: verlauf ? null : (c.color === fill ? c.color : fill),
          fs: parseFloat(c.fontSize), fw: c.fontWeight,
          r: [b.x, b.y, b.width, b.height]
        });
      });
      return out;
    }, v);
    if (!ziele.length) continue;

    const mitBuf = await page.screenshot();
    /* Schrift unsichtbar machen — NUR die Fuellfarbe, nicht das Layout. */
    const marke = await page.addStyleTag({ content:
      '.view.active,.view.active *{color:transparent!important;' +
      '-webkit-text-fill-color:transparent!important;text-shadow:none!important}' });
    await page.waitForTimeout(120);
    const ohneBuf = await page.screenshot();
    await page.evaluate(el => el.remove(), marke);
    await page.waitForTimeout(80);

    const mit = pngLesen(mitBuf), ohne = pngLesen(ohneBuf);
    const dpr = mit.w / 430;

    for (const z of ziele) {
      const x0 = Math.max(0, Math.round(z.r[0] * dpr)), y0 = Math.max(0, Math.round(z.r[1] * dpr));
      const x1 = Math.min(mit.w, Math.round((z.r[0] + z.r[2]) * dpr));
      const y1 = Math.min(mit.h, Math.round((z.r[1] + z.r[3]) * dpr));
      if (x1 <= x0 || y1 <= y0) continue;

      let S = null;
      if (!z.verlauf) {
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(z.farbe || '');
        if (m) S = [+m[1], +m[2], +m[3]];
      }

      /* Deckung je Pixel ausrechnen. Ohne bekannte Schriftfarbe (Falle a)
         wird der Pixel mit dem groessten Abstand zum Untergrund als
         Schriftfarbe genommen — die Verlaufsschrift ist dort am
         deckendsten. */
      const kandidaten = [];
      let maxAbst = 0, ersatzS = null;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * mit.w + x) * mit.kan;
          const M = [mit.dat[i], mit.dat[i + 1], mit.dat[i + 2]];
          const U = [ohne.dat[i], ohne.dat[i + 1], ohne.dat[i + 2]];
          const d = Math.abs(M[0] - U[0]) + Math.abs(M[1] - U[1]) + Math.abs(M[2] - U[2]);
          if (d === 0) continue;
          if (d > maxAbst) { maxAbst = d; ersatzS = M; }
          kandidaten.push({ M, U });
        }
      }
      if (!kandidaten.length) continue;
      if (!S) { S = ersatzS; verlaufSchrift++; }
      if (!S) continue;

      /* a = (M - U) / (S - U), je Kanal, nur wo der Nenner traegt. */
      const kern = [];
      for (const k of kandidaten) {
        let sum = 0, n = 0;
        for (let c = 0; c < 3; c++) {
          const nen = S[c] - k.U[c];
          if (Math.abs(nen) < 24) continue;         // Kanal traegt keine Aussage
          sum += (k.M[c] - k.U[c]) / nen; n++;
        }
        if (!n) continue;
        const a = sum / n;
        if (a >= DECKUNG && a <= 1.15) kern.push(k.U);
      }
      /* Falle d */
      if (kern.length < MIN_PIXEL) { zuKlein.push(v + '/' + z.nm); continue; }

      const U = [0, 1, 2].map(c => kern.reduce((s, p) => s + p[c], 0) / kern.length);
      const kw = kontrast(lum(S[0], S[1], S[2]), lum(U[0], U[1], U[2]));
      gemessen++;
      const gross = z.fs >= 18.66 || (z.fs >= 14 && +z.fw >= 700);
      const soll = gross ? 3.0 : 4.5;
      if (kw < Math.min(soll, MELDE_AB) || kw < soll) {
        befunde.push({ ort: v + '/' + z.nm, txt: z.txt, kw: +kw.toFixed(2), soll,
                       fs: z.fs, kern: kern.length,
                       S: S.map(Math.round).join(','), U: U.map(Math.round).join(',') });
      }
    }
  }

  await browser.close();

  befunde.sort((a, b) => a.kw - b.kw);
  const hart = befunde.filter(b => b.kw < MELDE_AB);

  step('Genug Schriftzuege gemessen (>=200)', gemessen >= 200,
    gemessen + ' mit auswertbarem Strich-Kern, ' + zuKlein.length + ' zu klein fuer eine Aussage');
  gegen('Messung findet ueberhaupt Glyphen', gemessen === 0,
    'davon ' + verlaufSchrift + ' mit Verlaufsschrift (Farbe geschaetzt)');

  step('Kein Schriftzug unter ' + MELDE_AB + ':1', hart.length === 0,
    hart.length ? hart.slice(0, 10).map(b => b.ort + ' "' + b.txt + '" ' + b.kw + ':1').join(' | ')
                : 'schlechtester Wert ' + (befunde[0] ? befunde[0].kw : '—') + ':1');

  const weich = befunde.filter(b => b.kw >= MELDE_AB);
  console.log('     Unter WCAG-Soll, aber ueber ' + MELDE_AB + ':1 (Bericht, kein Tor): ' + weich.length +
    (weich.length ? ' — ' + weich.slice(0, 6).map(b => b.ort + ' ' + b.kw + '/' + b.soll).join(' | ') : ''));

  const bad = steps.filter(s => !s.ok).length;
  console.log(bad ? bad + ' FEHLER' : steps.length + '/' + steps.length + ' Schritte ok');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
