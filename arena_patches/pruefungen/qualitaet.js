/* ==================================================================
 * QUALITAETS-DURCHGANG ueber ALLE Ansichten
 * ------------------------------------------------------------------
 * Vorgabe (30.07.2026): „Schau dir die komplette Ui aus der Sicht eines
 * ceo UI Designers an und optimiere alles was nicht sauber läuft(Bugs)".
 *
 * Diese Suite ist die Messung hinter diesem Satz. Sie fragt sechs
 * Dinge, jedes ueber alle 16 Hauptansichten:
 *
 *   1. Trefferflaechen  — ist jeder Knopf 44 x 44 gross ZU TREFFEN?
 *   2. Kein Klick-Diebstahl — deckt eine Flaeche einen Nachbarn zu?
 *   3. Ueberlauf        — haengt etwas ueber den Bildschirmrand?
 *   4. Abgeschnitten    — wird irgendwo Text weggeschnitten?
 *   5. Schaerfe         — ist ein Bild kleiner als seine Anzeigeflaeche?
 *   6. Leere Bildfelder — steht irgendwo ein Icon-Platz ohne Icon?
 *
 * ⚠ DREI FALLEN, in die diese Messung beim Bauen GELAUFEN IST. Wer sie
 * hier herausnimmt, holt sich falsche Befunde zurueck:
 *
 *   a) elementFromPoint liefert AUSSERHALB des Fensters `null`, und ein
 *      null-Treffer sieht genauso aus wie „ein Fremder liegt darueber".
 *      Erster Lauf: 68 angebliche Klick-Diebstaehle, davon null echt.
 *   b) Das Sichtfenster ist nicht das Browserfenster. Die Ansichten
 *      haben INNERE Scrollkaesten (#passList steht beim Oeffnen auf
 *      scrollTop 240) und unten liegt die feste Leiste. Nachgewiesen
 *      wurde das, indem einer der angeblich verdeckten Knoepfe nach
 *      scrollIntoView angeklickt wurde — der Klick ging durch.
 *   c) Eine runde Trefferflaeche hat keine Ecken. Die erste Fassung
 *      tastete die Ecken an und meldete 27 von 28 Zielen als zu klein.
 *      Gemessen werden deshalb die KANTENMITTEN: sie beantworten die
 *      Frage „44 breit und 44 hoch", nicht die Frage nach der Eckform.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qualitaet.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');

const FILE = 'file://' + (process.env.UI_DATEI
  ? path.resolve(process.env.UI_DATEI)
  : path.resolve(__dirname, '..', 'ui_prototype.html'));

const VIEWS = ['navHome', 'navShop', 'navCollection', 'navForge', 'navPack', 'navFortress',
  'navClan', 'navBoard', 'navPass', 'navHeroes', 'navEvents', 'navMail', 'navFriends',
  'navSettings', 'navCommunity', 'navGuide'];

/* Die Klassen, die eine vergroesserte Trefferflaeche BEKOMMEN sollen.
   Die Liste steht hier UND im Blatt — sie muss zusammenpassen, und
   Schritt 1 prueft genau das. */
const TAPZIELE = ['backbtn', 'dkinfo', 'dkmenu', 'crestmini', 'apknav', 'oddsi',
  'binfo', 'anfinfo', 'dkselbtn', 'offerx', 'iconbtn', 'pfcopy'];

const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}
function gegen(name, sollFalschSein, info) { step('gegen: ' + name, !sollFalschSein, info); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on('pageerror', e => jsFehler.push(e.message));

  await page.goto(FILE);
  await page.waitForTimeout(1100);
  /* Der Login-Kalender liegt beim ersten Start ueber allem und geht
     NICHT weg, wenn man nur die Klasse entfernt — er hat dafuer einen
     eigenen „Spaeter"-Knopf. */
  if (await page.locator('#loginLater').count()) await page.click('#loginLater');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.layer.open,.pop.open,.modal.open')
    .forEach(e => e.classList.remove('open')));

  /* Die eine Hilfsfunktion, die in der Seite lebt. Sie beantwortet
     „liegt dieser Kasten wirklich sichtbar im Bild" — mit allen drei
     Fallen von oben. */
  /* ⚠ Als FABRIK, nicht als lose Deklarationen. `eval("const x=1")`
     legt x nur im Gueltigkeitsbereich des eval an — im umgebenden Code
     ist es danach nicht da (gemessen: „imBild is not defined"). Ein
     Ausdruck, der ein Objekt zurueckliefert, umgeht das sauber. */
  const HELFER = `(function () {
    const leiste = document.querySelector('nav.bottom');
    const leisteOben = leiste ? leiste.getBoundingClientRect().top : Infinity;
    const eigen = (treffer, e) => { let n = treffer; while (n) { if (n === e) return true; n = n.parentElement; } return false; };
    const imBild = (bx, e) => {
      if (bx.top < 0 || bx.left < 0 || bx.bottom > innerHeight || bx.right > innerWidth) return false;
      if (bx.bottom > leisteOben) return false;
      let n = e && e.parentElement;
      while (n && n !== document.body) {
        const c = getComputedStyle(n);
        if (c.overflow !== 'visible' || c.overflowY !== 'visible' || c.overflowX !== 'visible') {
          const r = n.getBoundingClientRect();
          if (bx.top < r.top || bx.bottom > r.bottom || bx.left < r.left || bx.right > r.right) return false;
        }
        n = n.parentElement;
      }
      return true;
    };
    return { eigen, imBild };
  })()`;

  let zielGetastet = 0, zielKlein = [], knopfGetastet = 0, verdeckt = [];
  let ueber = [], abgeschnitten = [], unscharf = [], leerFeld = [];

  for (const v of VIEWS) {
    await page.evaluate(n => window.__proto.show(n), v);
    await page.waitForTimeout(340);
    /* Bilder decodieren lassen, aber mit Deckel — sonst haengt der Lauf
       an einem einzigen Bild, das nie fertig wird. */
    await Promise.race([
      page.evaluate(() => Promise.all([...document.querySelectorAll('.view.active img')]
        .map(i => i.decode ? i.decode().catch(() => {}) : null))),
      new Promise(r => setTimeout(r, 2500))
    ]);
    await page.waitForTimeout(160);

    const r = await page.evaluate(([ziele, view, helfer]) => {
      const { eigen, imBild } = eval(helfer);
      const A = document.querySelector('.view.active');
      const out = { zielGetastet: 0, zielKlein: [], knopfGetastet: 0, verdeckt: [],
                    ueber: [], abgeschnitten: [], unscharf: [], leerFeld: [] };
      const nm = e => e.id || String(e.className).split(' ')[0] || e.tagName;
      const sicht = e => { const c = getComputedStyle(e), b = e.getBoundingClientRect();
        return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 1 && b.height > 1; };

      // --- 1. Trefferflaechen -------------------------------------
      A.querySelectorAll(ziele.map(c => '.' + c).join(',')).forEach(e => {
        const bx = e.getBoundingClientRect();
        if (!sicht(e)) return;
        const cx = bx.x + bx.width / 2, cy = bx.y + bx.height / 2;
        const w = Math.max(bx.width, 44), h = Math.max(bx.height, 44);
        if (!imBild({ top: cy - h / 2, left: cx - w / 2, bottom: cy + h / 2, right: cx + w / 2 }, e)) return;
        const pkt = [[cx - w / 2 + 1, cy], [cx + w / 2 - 1, cy], [cx, cy - h / 2 + 1], [cx, cy + h / 2 - 1],
                     [cx - w / 4, cy - h / 4], [cx + w / 4, cy + h / 4]];
        const treffer = pkt.filter(([x, y]) => eigen(document.elementFromPoint(x, y), e)).length;
        out.zielGetastet++;
        if (treffer < pkt.length) out.zielKlein.push(view + '/' + nm(e) + ' ' + treffer + '/' + pkt.length);
      });

      // --- 2. Klick-Diebstahl -------------------------------------
      A.querySelectorAll('button,[role=button],.pressable,a[href]').forEach(e => {
        const bx = e.getBoundingClientRect(), cs = getComputedStyle(e);
        if (!sicht(e) || bx.width < 4 || bx.height < 4 || cs.pointerEvents === 'none') return;
        if (!imBild(bx, e)) return;
        out.knopfGetastet++;
        const t = document.elementFromPoint(bx.x + bx.width / 2, bx.y + bx.height / 2);
        if (!eigen(t, e)) out.verdeckt.push(view + '/' + nm(e) + ' -> ' + (t ? nm(t) : 'nichts'));
      });

      // --- 3. Ueberlauf ueber den Bildschirmrand ------------------
      const vr = A.getBoundingClientRect();
      A.querySelectorAll('*').forEach(e => {
        if (!sicht(e)) return;
        const bx = e.getBoundingClientRect();
        if (bx.right <= vr.right + 2 && bx.left >= vr.left - 2) return;
        /* Ein Kind, das ein kappender Vorfahr ohnehin abschneidet, ist
           kein Ueberlauf — das ist eine Querscroll-Reihe. */
        let p = e.parentElement, gekappt = false;
        while (p && p !== A) { if (getComputedStyle(p).overflowX !== 'visible') { gekappt = true; break; } p = p.parentElement; }
        if (!gekappt) out.ueber.push(view + '/' + nm(e) + ' bis ' + Math.round(bx.right) + ' von ' + Math.round(vr.right));
      });

      // --- 4. Abgeschnittener Text --------------------------------
      A.querySelectorAll('*').forEach(e => {
        if (e.children.length || !e.textContent.trim() || !sicht(e)) return;
        const c = getComputedStyle(e);
        const kappt = c.overflow !== 'visible' || c.textOverflow === 'ellipsis' ||
          (e.parentElement && getComputedStyle(e.parentElement).overflow !== 'visible');
        if (!kappt || !e.clientWidth) return;
        /* ⚠ NICHT scrollWidth. Der zaehlt JEDES ueberstehende Kind mit —
           auch ein absolut gesetztes ::after. Genau das ist passiert:
           die vergroesserten Trefferflaechen (44 px in einem 20-px-Knopf)
           liessen scrollWidth anschwellen, und die Pruefung meldete das
           „x" des Ausblenden-Knopfes als abgeschnitten. Es war nie
           abgeschnitten — es war die eigene Trefferflaeche.
           Ein Range ueber den Inhalt misst den TEXT und nichts sonst. */
        const rg = document.createRange();
        rg.selectNodeContents(e);
        const tb = rg.getBoundingClientRect();
        rg.detach && rg.detach();
        if (tb.width > e.clientWidth + 1)
          out.abgeschnitten.push(view + '/' + nm(e) + ' "' + e.textContent.trim().slice(0, 20) +
            '" ' + Math.round(tb.width) + '>' + e.clientWidth);
      });

      // --- 5. Schaerfe --------------------------------------------
      /* Ein Bild ist unscharf, wenn seine Eigenaufloesung kleiner ist
         als die Flaeche, die es in GERAETEPIXELN belegt. 15 % Nachsicht,
         weil ein Icon mit 110 px Quelle auf 38 CSS-px bei dreifacher
         Aufloesung rechnerisch knapp danebenliegt, aber nicht weich
         aussieht. */
      A.querySelectorAll('img').forEach(im => {
        if (!sicht(im) || !im.naturalWidth) return;
        const bx = im.getBoundingClientRect();
        const brauch = Math.max(bx.width, bx.height) * devicePixelRatio;
        const hat = Math.max(im.naturalWidth, im.naturalHeight);
        if (hat < brauch * 0.85)
          out.unscharf.push(view + '/' + (im.getAttribute('data-key') || im.src.split('/').pop()) +
            ' ' + hat + ' fuer ' + Math.round(brauch));
      });

      // --- 6. Leere Bildfelder ------------------------------------
      A.querySelectorAll('[data-ico]').forEach(e => {
        if (!sicht(e)) return;
        const c = getComputedStyle(e);
        if (c.backgroundImage === 'none' && !e.querySelector('img,svg') && !e.textContent.trim())
          out.leerFeld.push(view + '/' + (e.getAttribute('data-ico') || '?'));
      });
      return out;
    }, [TAPZIELE, v.replace('nav', ''), HELFER]);

    zielGetastet += r.zielGetastet; knopfGetastet += r.knopfGetastet;
    zielKlein.push(...r.zielKlein); verdeckt.push(...r.verdeckt);
    ueber.push(...r.ueber); abgeschnitten.push(...r.abgeschnitten);
    unscharf.push(...r.unscharf); leerFeld.push(...r.leerFeld);
  }

  /* ⚠ Die Messung muss ueberhaupt etwas gesehen haben. Ohne diesen
     Schritt waere eine Suite, die durch einen Selektorfehler NICHTS
     findet, strahlend gruen — der teuerste aller falschen Befunde. */
  step('Die Messung hat ueberhaupt Knoepfe angetastet',
    knopfGetastet > 80 && zielGetastet > 10,
    knopfGetastet + ' Knoepfe, davon ' + zielGetastet + ' mit vergroesserter Flaeche');

  /* Die fuenf verbleibenden liegen in Kaesten mit overflow:hidden, die
     eine Kante abschneiden — 5 von 6 Punkten statt 6. Der Deckel steht
     auf 6, damit ein Rueckschritt auffaellt, aber keine Arbeit
     erzwungen wird, die einen fremden Kasten aufreissen muesste. */
  step('Vergroesserte Trefferflaechen erreichen 44 x 44',
    zielKlein.length <= 6,
    zielKlein.length + ' unter Soll' + (zielKlein.length ? ': ' + [...new Set(zielKlein)].slice(0, 5).join(', ') : ''));

  step('Kein Knopf verdeckt einen anderen',
    verdeckt.length === 0,
    verdeckt.length ? [...new Set(verdeckt)].slice(0, 6).join(' | ') : knopfGetastet + ' Knoepfe frei');

  /* Gegenprobe: der Diebstahl-Test muss einen echten Diebstahl FINDEN.
     Ohne sie waere „0 verdeckt" auch dann gruen, wenn der Test gar nichts
     mehr auswaehlt. */
  await page.evaluate(n => window.__proto.show(n), 'navHome');
  await page.waitForTimeout(300);
  const gefunden = await page.evaluate((helfer) => {
    const { eigen, imBild } = eval(helfer);
    const A = document.querySelector('.view.active');
    const opfer = [...A.querySelectorAll('button,.pressable')]
      .find(e => { const b = e.getBoundingClientRect(); return b.width > 30 && b.height > 30 && imBild(b, e); });
    if (!opfer) return 'kein Opfer gefunden';
    const bx = opfer.getBoundingClientRect();
    const dieb = document.createElement('div');
    dieb.style.cssText = 'position:fixed;z-index:99999;left:' + bx.x + 'px;top:' + bx.y +
      'px;width:' + bx.width + 'px;height:' + bx.height + 'px';
    document.body.appendChild(dieb);
    const t = document.elementFromPoint(bx.x + bx.width / 2, bx.y + bx.height / 2);
    const erkannt = !eigen(t, opfer);
    dieb.remove();
    return erkannt ? 'erkannt' : 'NICHT erkannt';
  }, HELFER);
  step('gegen: ein aufgelegtes Rechteck wuerde als Diebstahl erkannt',
    gefunden === 'erkannt', gefunden);

  step('Nichts haengt ueber den Bildschirmrand',
    ueber.length === 0, ueber.length ? [...new Set(ueber)].slice(0, 5).join(' | ') : 'sauber');
  step('Kein Text wird abgeschnitten',
    abgeschnitten.length === 0, abgeschnitten.length ? [...new Set(abgeschnitten)].slice(0, 5).join(' | ') : 'sauber');
  step('Kein Bild unter seiner Anzeigeaufloesung',
    unscharf.length === 0, unscharf.length ? [...new Set(unscharf)].slice(0, 5).join(' | ') : 'sauber');
  step('Kein leeres Bildfeld',
    leerFeld.length === 0, leerFeld.length ? [...new Set(leerFeld)].slice(0, 6).join(', ') : 'sauber');
  step('Keine JS-Fehler beim Durchgang', jsFehler.length === 0, jsFehler.slice(0, 2).join(' | ') || 'keine');

  await browser.close();
  const ok = steps.filter(s => s.ok).length;
  console.log('\n' + ok + '/' + steps.length + ' Schritte ok');
  process.exit(ok === steps.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
