/* ===================================================================
 * assets_lokal.js — liegen die Bilder im Repo, und kommen sie an?
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Am 30.07.2026 meldete der Auftraggeber zur Live-Fassung: „Wieso sind
 * Images und icons nicht in der Version?" Nachgemessen: das Manifest in
 * ui_prototype.html zeigte mit 227 von 236 Eintraegen aufs Higgsfield-CDN,
 * WAEHREND 229 dieser Dateien byte-geprueft in arena_patches/assets/ lagen.
 * Ein fremder Host entschied also, ob die UI Bilder hat.
 *
 * Und niemand hat es gemerkt, weil JEDE Pruefung in diesem Verzeichnis den
 * Satz „oertlich laedt kein Bild (kein CDN)" als Normalzustand eingebaut
 * hat — run_shop.js, run_v5.js, run_v6.js, run_v7.js und run_friends.js
 * werfen Konsolenfehler mit `.png`, `.mp4`, `.mp3` oder `cloudfront` im
 * Text WEG. Das war richtig, solange die Bilder gar nicht im Repo lagen.
 * Seit sie dort liegen, ist es ein Filter, der echte 404 verschluckt.
 *
 * DIE METHODE
 * Diese Datei filtert NICHTS. Sie serviert arena_patches/ ueber einen
 * eigenen HTTP-Server — nicht file://, weil die ausgelieferte Fassung auf
 * GitHub Pages auch ueber HTTP kommt und file:// bei Unterressourcen
 * andere Regeln hat. Dann fragt sie drei verschiedene Dinge, weil sie
 * verschiedene Fehler finden:
 *
 *   1. STRUKTUR — loest das Manifest auf ./assets/ auf?
 *   2. PLATTE   — existiert zu JEDEM aufgeloesten Pfad eine Datei?
 *   3. PIXEL    — ist `naturalWidth > 0`, kam das Bild also wirklich an?
 *
 * Punkt 3 ist der einzige, der den gemeldeten Fehler gefunden haette.
 * 1 und 2 waren vorher gruen zu machen, ohne dass ein Bild erscheint.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node assets_lokal.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const WURZEL = path.resolve(__dirname, '..');
const HTML = path.join(WURZEL, 'ui_prototype.html');

const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}
/* Gegenprobe: eine Behauptung, die FALSCH sein muss. Ein Schritt, der auch
   bei kaputtem Programm gruen bleibt, ist keine Pruefung, sondern Deko. */
function gegen(name, sollFalschSein, info) {
  step('gegen: ' + name, !sollFalschSein, info);
}

const TYP = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.mp4':'video/mp4',
  '.mp3':'audio/mpeg', '.css':'text/css', '.svg':'image/svg+xml' };

(async () => {
  /* ---- eigener Server: kein file://, keine Netzpolitik, echte Statuscodes ---- */
  const server = http.createServer((req, res) => {
    const rein = decodeURIComponent(req.url.split('?')[0]);
    const p = path.join(WURZEL, path.normalize(rein).replace(/^(\.\.[/\\])+/, ''));
    if (!p.startsWith(WURZEL) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      res.writeHead(404); res.end('nicht da'); return;
    }
    res.writeHead(200, { 'content-type': TYP[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASIS = 'http://127.0.0.1:' + server.address().port + '/';

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 },
                                         deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  /* KEIN Filter. Jede fehlgeschlagene Anfrage wird notiert; welche davon
     erlaubt ist, entscheidet weiter unten ein Schritt mit Begruendung —
     nicht ein Regex, der sie unsichtbar macht. */
  const fehlgeschlagen = [];
  const jsFehler = [];
  page.on('pageerror', e => jsFehler.push(e.message));
  page.on('requestfailed', r => fehlgeschlagen.push(
    { url: r.url(), grund: (r.failure() || {}).errorText || '?' }));
  page.on('response', r => {
    if (r.status() >= 400) fehlgeschlagen.push({ url: r.url(), grund: 'HTTP ' + r.status() });
  });

  await page.goto(BASIS + 'ui_prototype.html');
  /* 6,5 s: der Icon-Sweep setzt bei 900/2200/6000 ms erneut an und
     ueberschreibt Bilder. Wer hier kuerzt, misst einen Zwischenstand —
     bildzustand.js hat sich daran schon einmal die Zaehne ausgebissen. */
  await page.waitForTimeout(6800);

  /* ================= 1. STRUKTUR ================= */
  const m = await page.evaluate(() => {
    const A = window.__proto && window.__proto.ASSETS ? window.__proto.ASSETS : null;
    return {
      hat: !!A,
      basis: window.__proto ? window.__proto.ASSET_BASE : null,
      werte: A ? Object.keys(A).map(k => [k, A[k]]) : [],
      nurCdn: window.__proto ? Object.keys(window.__proto.NUR_CDN || {}) : []
    };
  });
  if (!m.hat) {
    step('ASSETS ueber window.__proto erreichbar', false,
      'Ohne Zugriff kann diese Suite die Aufloesung nicht pruefen — Export fehlt');
  } else {
    const lokal = m.werte.filter(([, v]) => v.indexOf('./assets/') === 0);
    const cdn = m.werte.filter(([, v]) => /^https?:/.test(v));
    step('Manifest zeigt auf ./assets/', lokal.length > 200,
      lokal.length + ' von ' + m.werte.length + ' lokal, ' + cdn.length + ' noch am CDN');

    /* ================= 2. PLATTE ================= */
    const fehlt = lokal.filter(([, v]) =>
      !fs.existsSync(path.join(WURZEL, v.replace('./', ''))));
    step('zu jedem lokalen Pfad existiert eine Datei', fehlt.length === 0,
      fehlt.length === 0 ? lokal.length + ' Dateien vorhanden'
        : 'fehlt: ' + fehlt.slice(0, 8).map(x => x[0]).join(', '));

    gegen('die Platten-Pruefung kann ueberhaupt scheitern',
      fs.existsSync(path.join(WURZEL, 'assets/PRUEFUNG_FEHLT_ABSICHTLICH.webp')),
      'ein erfundener Pfad wird als fehlend erkannt');

    /* Jeder CDN-Rest muss begruendet sein. NICHT_ERREICHBAR.json ist die
       einzige erlaubte Quelle dafuer — sonst waechst die Liste still. */
    const ne = Object.keys(JSON.parse(
      fs.readFileSync(path.join(WURZEL, 'assets/NICHT_ERREICHBAR.json'), 'utf8')).eintraege);
    const unbegruendet = cdn.map(x => x[0]).filter(k => ne.indexOf(k) < 0);
    step('jeder verbliebene CDN-Eintrag ist in NICHT_ERREICHBAR.json datiert',
      unbegruendet.length === 0,
      unbegruendet.length === 0 ? cdn.length + ' Ausnahmen, alle begruendet'
        : 'ohne Begruendung: ' + unbegruendet.join(', '));
  }

  /* ================= 3. PIXEL ================= */
  /* Der eigentliche Schritt. `count()` und `src` haben vorher gelogen:
     ein <img> mit gesetztem src ist vorhanden, sichtbar und leer.
     ------------------------------------------------------------------
     ⚠ NUR DER SICHTBARE BAUM. Die erste Fassung zaehlte alle <img> im
     Dokument und war rot mit 34 „leeren" Bildern. Nachgemessen war jedes
     einzelne `loading="lazy"` in einer Ansicht mit `display:none` —
     Chromium laedt die zu Recht NICHT. Der Fehler lag im Schritt, nicht
     in der App. Eine Prueffrage, die ein korrektes Verhalten anschwaerzt,
     wird beim naechsten roten Balken weggeklickt und ist damit wertlos.
     Deshalb: erst Ansicht zeigen, dann durchrollen (das loest `lazy`
     ueberhaupt erst aus), dann nur messen, was im Layout steht. */
  const pixelnAktiv = async () => {
    /* Durchrollen in Schritten: `lazy` haengt am Sichtfenster, ein
       einzelner Sprung nach unten laedt die Mitte nie. */
    await page.evaluate(async () => {
      const sc = document.scrollingElement || document.documentElement;
      for (let y = 0; y <= sc.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    return page.evaluate(() => {
      const drin = [...document.querySelectorAll('img')].filter(i =>
        i.getAttribute('src') && i.getClientRects().length > 0);
      const leer = drin.filter(i => !(i.complete && i.naturalWidth > 0))
        .map(i => (i.getAttribute('src') || '').split('/').pop());
      return { alle: drin.length, leer: [...new Set(leer)] };
    });
  };
  const pix = await pixelnAktiv();
  step('Bilder auf der Startseite tragen Pixel',
    pix.alle > 0 && pix.leer.length === 0,
    (pix.alle - pix.leer.length) + '/' + pix.alle + ' mit naturalWidth>0' +
    (pix.leer.length ? ', leer: ' + pix.leer.slice(0, 8).join(', ') : ''));

  gegen('die Pixel-Pruefung kann ueberhaupt scheitern', await page.evaluate(async () => {
    /* Auf einem LOSGELOESTEN Bild, nicht im Dokument: eine Gegenprobe, die
       die laufende Seite anfasst, faerbt den naechsten Schritt rot. Dieser
       Fehler ist in packsprungung.js schon einmal passiert. */
    const i = new Image();
    i.src = './assets/PRUEFUNG_FEHLT_ABSICHTLICH.webp';
    await new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 2500); });
    return i.complete && i.naturalWidth > 0;
  }), 'ein erfundenes Bild meldet naturalWidth 0');

  /* Karten-Loops: Video ist der Fall, den kein Bild-Schritt erfasst. */
  const vid = await page.evaluate(() => {
    const v = [...document.querySelectorAll('video.cvid')];
    return { n: v.length, breit: v.filter(x => x.videoWidth > 0).length,
             quellen: v.slice(0, 3).map(x => (x.getAttribute('src') || '').split('/').pop()) };
  });
  step('Karten-Loops liefern Videobild', vid.n === 0 || vid.breit === vid.n,
    vid.n ? vid.breit + '/' + vid.n + ' mit videoWidth>0 (' + vid.quellen.join(', ') + ')'
      : 'auf der Startseite laeuft kein Loop — Schritt greift in run_v6.js');

  /* ================= 4. ALLE ANSICHTEN ================= */
  const NAV = ['navHome', 'navShop', 'navDeck', 'navFortress', 'navClan', 'navProfil'];
  const kaputt = [];
  for (const n of NAV) {
    await page.evaluate(() =>
      ['loginLayer','dailyLayer','offerLayer','confirmDlg','reqDlg','detailModal','bonusDlg',
       'mergeCeremony','roadLayer','cineLayer','avCerLayer','mmLayer']
        .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('open'); }));
    const da = await page.evaluate(nav => {
      if (!window.__proto || !window.__proto.show) return false;
      window.__proto.show(nav); return true;
    }, n);
    if (!da) continue;
    /* ⚠ `loading="lazy"` — DIE FALLE, DIE DIESEN SCHRITT ROT MACHTE.
       Gemessen am 31.07.2026: `shop_gem_t1..t5` meldeten `naturalWidth 0`
       und wurden als „leeres Bild" gefuehrt. Die Dateien sind in Ordnung
       — nach `scrollIntoView` stehen sie mit 1024x1024 da. Sie lagen
       schlicht ausserhalb des Sichtfensters, und ein `lazy`-Bild wird
       dort per Definition NICHT geladen.
       Ein Pixel-Schritt, der Bilder misst, die der Browser absichtlich
       noch nicht geholt hat, misst die Ladestrategie und nicht die
       Dateien. Deshalb: erst alle Bilder der Ansicht anfordern und ihr
       Dekodieren abwarten, dann messen.
       Der Deckel von 3 s ist noetig, weil ein einzelnes haengendes Bild
       sonst den ganzen Lauf blockiert. */
    await Promise.race([
      page.evaluate(() => {
        const b = [...document.querySelectorAll('.view.active img')];
        b.forEach(i => { i.loading = 'eager'; });
        return Promise.all(b.map(i => (i.decode ? i.decode().catch(() => {}) : null)));
      }),
      new Promise(r2 => setTimeout(r2, 3000)),
    ]);
    await page.waitForTimeout(700);
    const r = await pixelnAktiv();
    if (r.leer.length) kaputt.push(n + ': ' + r.leer.slice(0, 5).join(', '));
    console.log('     ' + n + ': ' + (r.alle - r.leer.length) + '/' + r.alle + ' Bilder mit Pixeln');
  }
  step('kein leeres Bild in den Hauptansichten', kaputt.length === 0,
    kaputt.length === 0 ? NAV.length + ' Ansichten geprueft' : kaputt.join(' | '));

  /* ================= 5. KEINE 404 ================= */
  /* `PRUEFUNG_FEHLT_ABSICHTLICH.webp` ist die Gegenprobe von oben — sie MUSS 404 liefern,
     sonst prueft sie nichts. Sie hier mitzuzaehlen hat den Schritt in der
     ersten Fassung rot gefaerbt: eine Messung, die ihr eigenes Werkzeug
     als Befund meldet. */
  const a404 = fehlgeschlagen.filter(f =>
    /\/assets\//.test(f.url) && !/PRUEFUNG_FEHLT_ABSICHTLICH/.test(f.url));
  step('keine Anfrage nach ./assets/ scheitert', a404.length === 0,
    a404.length === 0 ? 'sauber'
      : [...new Set(a404.map(f => f.url.split('/').pop() + ' ' + f.grund))]
          .slice(0, 6).join(', '));
  step('keine JS-Fehler', jsFehler.length === 0,
    jsFehler.length === 0 ? 'keine' : jsFehler.slice(0, 3).join(' | '));

  /* ================= 6. NOTSCHALTER ?cdn=1 ================= */
  const p2 = await ctx.newPage();
  await p2.goto(BASIS + 'ui_prototype.html?cdn=1');
  await p2.waitForTimeout(1500);
  const zurueck = await p2.evaluate(() => {
    const A = window.__proto && window.__proto.ASSETS;
    if (!A) return null;
    const w = Object.keys(A).map(k => A[k]);
    return { cdn: w.filter(v => /^https?:/.test(v)).length, n: w.length };
  });
  step('?cdn=1 schaltet zurueck aufs CDN', !!zurueck && zurueck.cdn === zurueck.n,
    zurueck ? zurueck.cdn + '/' + zurueck.n + ' am CDN' : 'ASSETS nicht erreichbar');

  /* ---- MUTATIONSPROBE ----------------------------------------------
     ?cdn=1 ist genau der Zustand VOR diesem Umbau. Aus dieser Umgebung
     ist *.cloudfront.net gesperrt (CONNECT 403, s. NICHT_ERREICHBAR.json),
     die Bilder koennen also nicht ankommen. Bleibt der Pixel-Schritt dabei
     gruen, prueft er nichts — dann waere der gemeldete Fehler „Images und
     icons fehlen" auch mit dieser Suite durchgerutscht.
     Der Schritt misst hier die eigene Empfindlichkeit, nicht die App. */
  /* Gleiche Ausgangslage wie oben, sonst vergleicht die Probe zwei
     verschiedene Zustaende. Die erste Fassung wartete nur 1,5 s und liess
     die Login-Ebene offen — dann liegt KEINE Ansicht im Layout und die
     Probe meldete 0/0, also weder gruen noch aussagekraeftig. */
  await p2.waitForTimeout(6800);
  await p2.evaluate(() => {
    ['loginLayer','dailyLayer','offerLayer','confirmDlg','reqDlg','detailModal','bonusDlg',
     'mergeCeremony','roadLayer','cineLayer','avCerLayer','mmLayer']
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('open'); });
    if (window.__proto && window.__proto.show) window.__proto.show('navShop');
  });
  await p2.waitForTimeout(1200);
  const ohne = await p2.evaluate(() => {
    const drin = [...document.querySelectorAll('img')].filter(i =>
      i.getAttribute('src') && i.getClientRects().length > 0);
    return { alle: drin.length,
             leer: drin.filter(i => !(i.complete && i.naturalWidth > 0)).length };
  });
  step('Pixel-Schritt wuerde den gemeldeten Fehler finden',
    ohne.alle > 0 && ohne.leer === ohne.alle,
    'am CDN (hier gesperrt): ' + ohne.leer + '/' + ohne.alle +
    ' Bilder leer — lokal 0. Der Schritt unterscheidet die beiden Zustaende');

  await browser.close();
  server.close();

  const rot = steps.filter(s => !s.ok);
  console.log('\n' + (steps.length - rot.length) + '/' + steps.length + ' gruen');
  if (rot.length) { console.log('ROT:\n  ' + rot.map(s => s.name).join('\n  ')); process.exit(1); }
})().catch(e => { console.error('ABBRUCH: ' + e.message); process.exit(1); });
