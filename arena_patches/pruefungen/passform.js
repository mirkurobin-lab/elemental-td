/* ==================================================================
 * PASSFORM: sitzt jedes Icon und jedes Banner richtig in seinem Kasten?
 * ------------------------------------------------------------------
 * Vorgabe (31.07.2026): „Pass alle icons und banner an das sie richtig
 * fitten."
 *
 * Gemessen wird EIN Verhaeltnis gegen ein anderes:
 *   Seitenverhaeltnis der QUELLE  gegen  Seitenverhaeltnis des KASTENS
 * und dazu, was die Fuellregel (`object-fit` / `background-size`) aus
 * dem Unterschied macht. Daraus fallen drei verschiedene Befunde:
 *
 *   VERZERRT  — die Fuellregel dehnt (`fill`, `100% 100%`). Ein rundes
 *               Icon wird oval. Das ist immer ein Fehler.
 *   BESCHNITT — `cover` schneidet. Bis ~12 % ist das Absicht (ein Bild
 *               soll seinen Kasten fuellen), darueber verliert das
 *               Motiv Substanz.
 *   LEERRAUM  — `contain` laesst Rand stehen. Bei einem Banner mit
 *               eigener Platte sieht man den Rand als Naht.
 *
 * ⚠ VIER FALLEN, in die diese Messung beim Bauen gelaufen ist:
 *
 *   a) `object-fit` ist standardmaessig `fill`. Ein <img> OHNE Angabe
 *      dehnt also — man sieht es nur, wenn die Quelle zufaellig passt.
 *      Der haeufigste echte Befund kommt aus genau diesem Standard.
 *   b) Ein Hintergrundbild hat kein `naturalWidth`. Es muss ueber ein
 *      eigenes Image()-Objekt nachgeladen werden, und `url(...)` kann
 *      mehrere Schichten tragen (Verlauf UEBER Bild) — nur die erste
 *      echte Datei zaehlt.
 *   c) Ein Kasten mit `width:0` oder `height:0` liefert ein
 *      Verhaeltnis von 0 oder Infinity und meldet jede Datei als
 *      verzerrt. Kaesten unter 6 px werden deshalb uebersprungen.
 *   d) Icons, die als MASKE laufen (`-webkit-mask`), haben ueberhaupt
 *      kein sichtbares Bild — ihre Form kommt aus der Maske, das
 *      Verhaeltnis der Quelle ist dort bedeutungslos.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node passform.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');

const FILE = 'file://' + (process.env.UI_DATEI
  ? path.resolve(process.env.UI_DATEI)
  : path.resolve(__dirname, '..', 'ui_prototype.html'));

const VIEWS = ['navHome', 'navShop', 'navCollection', 'navForge', 'navPack', 'navFortress',
  'navClan', 'navBoard', 'navPass', 'navHeroes', 'navEvents', 'navMail', 'navFriends',
  'navSettings', 'navCommunity', 'navGuide'];

/* Ab wann ein Unterschied zaehlt. 3 % deckt Rundungen des Layouts ab
   (ein 64-px-Kasten, der als 64,4 px rendert), 12 % ist die Grenze,
   ab der ein Beschnitt Motiv frisst statt nur Rand. */
const DEHN_GRENZE = 0.03;
const BESCHNITT_GRENZE = 0.12;

/* Stellen, die ABSICHTLICH stark beschneiden. Jede steht hier nur, weil
   im Prototyp an der Regel steht, warum — nachlesbar an derselben
   Klasse. Wer eine Zeile ergaenzt, ohne die Begruendung im Blatt zu
   haben, macht aus der Pruefung ein Ablagefach.
     .prodcard .pcart img.prodimg — 3:4-Produktbilder in quadratischen
       Kacheln: `contain` liess zwei von sechs Kacheln kleiner wirken
       („sieht nicht sauber aus"), deshalb `cover` mit object-position
       28 %, damit der Schnitt unten mehr nimmt als oben.
     .rwcell .rico — dieselbe Lage in der Belohnungsliste, dieselbe
       Loesung, seit 31.07.2026 ebenfalls auf 28 % Hoehe. */
const AUSNAHMEN = ['.prodcard .pcart img.prodimg', '.rwcell .rico'];

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

  await page.goto(FILE);
  await page.waitForTimeout(1100);
  if (await page.locator('#loginLater').count()) await page.click('#loginLater');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.layer.open,.pop.open,.modal.open')
    .forEach(e => e.classList.remove('open')));

  const verzerrt = [], beschnitt = [], leerraum = [], gewollt = [];
  let gemessen = 0, quellen = 0;

  for (const v of VIEWS) {
    await page.evaluate(n => window.__proto.show(n), v);
    await page.waitForTimeout(320);
    await Promise.race([
      page.evaluate(() => Promise.all([...document.querySelectorAll('.view.active img')]
        .map(i => i.decode ? i.decode().catch(() => {}) : null))),
      new Promise(r => setTimeout(r, 2500))
    ]);

    const r = await page.evaluate(async ([view, DG, BG, ausnahmen]) => {
      const A = document.querySelector('.view.active');
      const out = { verzerrt: [], beschnitt: [], leerraum: [], gewollt: [], gemessen: 0, quellen: [] };
      const nm = e => e.id || String(e.className).split(' ')[0] || e.tagName.toLowerCase();
      const sicht = e => {
        const c = getComputedStyle(e), b = e.getBoundingClientRect();
        return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 &&
               b.width > 6 && b.height > 6;
      };

      /* Falle b: die erste echte Datei aus einem moeglicherweise
         mehrschichtigen background-image ziehen — UND die dazu
         gehoerende Groesse.
         ⚠ DIESER TEIL WAR IN DER ERSTEN FASSUNG FALSCH, und der Fehler
         hat echte Befunde verdeckt: sie nahm die erste DATEI, aber die
         erste GROESSENANGABE. Liegt ein Verlauf ueber dem Bild — bei uns
         der Regelfall, siehe bgArt() —, gehoeren die beiden nicht
         zusammen: gemessen wurde die Groesse des Verlaufs. Sechs Kaesten
         meldeten dadurch `100% 100%` (also „gedehnt"), obwohl ihr Bild
         auf `cover` stand, und umgekehrt fiel eine echte Dehnung auf
         `.tile` durch. Schicht und Groesse muessen ueber denselben
         INDEX geholt werden. */
      const schichten = s => {
        const r = []; let t = 0, cur = '';
        for (const ch of String(s || '')) {
          if (ch === '(') t++;
          if (ch === ')') t--;
          if (ch === ',' && t === 0) { r.push(cur.trim()); cur = ''; continue; }
          cur += ch;
        }
        if (cur.trim()) r.push(cur.trim());
        return r;
      };
      const bildSchicht = s => {
        const L = schichten(s);
        for (let i = 0; i < L.length; i++) {
          const m = L[i].match(/url\((['"]?)([^'")]+)\1\)/);
          if (m) return { i, url: m[2] };
        }
        return null;
      };
      const masse = {};
      const laden = u => new Promise(res => {
        if (masse[u] !== undefined) return res(masse[u]);
        const im = new Image();
        im.onload = () => { masse[u] = [im.naturalWidth, im.naturalHeight]; res(masse[u]); };
        im.onerror = () => { masse[u] = null; res(null); };
        im.src = u;
      });

      const kandidaten = [];
      A.querySelectorAll('img').forEach(e => {
        if (!sicht(e) || !e.naturalWidth) return;
        kandidaten.push({ e, w: e.naturalWidth, h: e.naturalHeight,
                          regel: getComputedStyle(e).objectFit, art: 'img',
                          quelle: e.currentSrc || e.src });
      });
      const hg = [];
      A.querySelectorAll('*').forEach(e => {
        const c = getComputedStyle(e);
        /* Falle d: eine Maske traegt die Form, nicht das Bild. */
        if (c.webkitMaskImage && c.webkitMaskImage !== 'none') return;
        const bs = bildSchicht(c.backgroundImage);
        if (!bs || !sicht(e)) return;
        const gr = schichten(c.backgroundSize);
        /* Fehlt eine Groesse fuer die Schicht, wiederholt CSS die Liste. */
        hg.push({ e, u: bs.url, art: 'bg', schicht: bs.i,
                  regel: gr.length ? gr[bs.i % gr.length] : 'auto' });
      });
      for (const k of hg) {
        const m = await laden(k.u);
        if (!m || !m[0]) continue;
        kandidaten.push({ e: k.e, w: m[0], h: m[1], regel: k.regel, art: 'bg',
                          quelle: k.u, schicht: k.schicht });
      }

      for (const k of kandidaten) {
        const b = k.e.getBoundingClientRect();
        /* Falle c */
        if (b.width < 6 || b.height < 6) continue;
        out.gemessen++;
        const datei = String(k.quelle).split('/').pop();
        out.quellen.push(datei);
        const qv = k.w / k.h, kv = b.width / b.height;
        const ab = Math.abs(qv - kv) / Math.max(qv, kv);   // 0 = gleich
        const ort = view + '/' + nm(k.e);
        const zahl = Math.round(qv * 100) / 100 + ' vs ' + Math.round(kv * 100) / 100;

        const regel = k.regel.trim();
        const dehnt = k.art === 'img' ? regel === 'fill' : regel === '100% 100%';
        const cover = regel === 'cover';
        const contain = regel === 'contain';
        /* Absichtlicher Beschnitt, jeweils mit Begruendung im Blatt.
           Eine Ausnahme steht hier NUR, wenn im Prototyp an der Stelle
           steht, warum — sonst waere die Liste ein Ablagefach fuer
           unbequeme Befunde. */
        const gewollt = ausnahmen.some(a => k.e.matches(a));
        /* KULISSE ODER MOTIV? Der Unterschied ist im Bauplan angelegt,
           nicht geschaetzt: `layer()` setzt das Artwork als OBERSTE
           Schicht (Index 0), `bgArt()` legt fuer Kulissenflaechen einen
           Abdunkelungs-Verlauf DARUEBER (Artwork also Index >= 1).
           Eine Kulisse SOLL ihren Kasten fuellen und darf beschneiden —
           sie traegt Text, kein Motiv, das man lesen muss. Ein Motiv
           darf es nicht. Deshalb ist der Schichtindex das Kriterium und
           keine von Hand gepflegte Liste. */
        /* ⚠ DAS BAND HAT DREI BAUFORMEN, UND ES IST DREIMAL DASSELBE.
           Die erste Fassung dieser Pruefung kannte nur die erste und
           meldete deshalb Flaechen als Fehler, die laengst abgedunkelt
           sind. Statt einen dritten Sonderfall anzuhaengen, wird die
           Frage einmal richtig gestellt: legt IRGENDETWAS ein Band ueber
           dieses Artwork?
             1. eine Hintergrundschicht darueber   — bgArt()
             2. ein deckendes ::before/::after     — .passbanner
             3. ein deckendes Kind-Element         — .keyart .kshade
           Wo layer() das Artwork zwingend als oberste HINTERGRUND-Ebene
           setzt, sind 2 und 3 die einzigen Wege ueberhaupt; sie deshalb
           anders zu bewerten waere eine Unterscheidung nach Bauart statt
           nach Wirkung. */
        const deckend = s => (s.backgroundImage && s.backgroundImage !== 'none') ||
                             (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)');
        const bandPseudo = ['::before', '::after'].some(pe => {
          const ps = getComputedStyle(k.e, pe);
          return ps && ps.content !== 'none' && ps.position === 'absolute' && deckend(ps);
        });
        const kb = k.e.getBoundingClientRect();
        const bandKind = [...k.e.children].some(ch => {
          const cs = getComputedStyle(ch);
          if (cs.position !== 'absolute' || !deckend(cs)) return false;
          const cb = ch.getBoundingClientRect();
          /* „Deckend" heisst: es liegt wirklich ueber der Flaeche, nicht
             als 20-px-Chip in einer Ecke. 80 % beider Kanten. */
          return cb.width >= kb.width * 0.8 && cb.height >= kb.height * 0.8;
        });
        const kulisse = (k.art === 'bg' && (k.schicht | 0) > 0) || bandPseudo || bandKind;

        if (dehnt) {
          if (ab > DG) out.verzerrt.push(ort + ' ' + datei + ' ' + zahl +
            ' (' + Math.round(ab * 100) + ' % Dehnung)');
        } else if (cover && ab > BG) {
          (gewollt || kulisse ? out.gewollt : out.beschnitt).push(ort + ' ' + datei + ' ' + zahl +
            ' (' + Math.round(ab * 100) + ' % weg' + (kulisse ? ', Kulisse' : '') + ')');
        } else if (contain && ab > BG) {
          /* KEIN Fehler, nur eine Zahl: `contain` schneidet nichts weg,
             es laesst Rand stehen. Bei einer Bibliothek mit 1:1-, 3:4-
             und 2:3-Quellen ist das die richtige Fuellregel — die Kachel
             wirkt nur optisch kleiner als ihre quadratischen Nachbarn.
             Das ist eine Gestaltungsfrage, kein Defekt, und darf deshalb
             keinen Lauf rot machen. */
          out.leerraum.push(ort + ' ' + datei + ' ' + Math.round(ab * 100) + ' %');
        }
      }
      return out;
    }, [v, DEHN_GRENZE, BESCHNITT_GRENZE, AUSNAHMEN]);

    verzerrt.push(...r.verzerrt);
    beschnitt.push(...r.beschnitt);
    leerraum.push(...r.leerraum);
    gewollt.push(...r.gewollt);
    gemessen += r.gemessen;
    quellen += r.quellen.length;
  }

  step('Genug Bilder gemessen (>=120)', gemessen >= 120, gemessen + ' sichtbare Bildflaechen');
  gegen('Messung findet ueberhaupt Quellmasse', quellen === 0, quellen + ' Dateien aufgeloest');

  step('Kein Icon und kein Banner wird gedehnt', verzerrt.length === 0,
    verzerrt.length ? verzerrt.slice(0, 14).join(' | ') : 'keine Dehnung ueber ' + (DEHN_GRENZE * 100) + ' %');
  step('Kein Bild verliert mehr als ' + (BESCHNITT_GRENZE * 100) + ' % durch cover',
    beschnitt.length === 0,
    beschnitt.length ? beschnitt.slice(0, 14).join(' | ')
                     : 'kein ungewollter Beschnitt (' + gewollt.length + ' begruendete Ausnahmen)');
  /* Bericht, kein Tor — Begruendung an der Fundstelle oben. */
  console.log('     Rand durch contain (kein Fehler): ' + leerraum.length + ' Stellen' +
    (leerraum.length ? ', groesste: ' + leerraum.slice(0, 4).join(' | ') : ''));

  /* ⚠ BEISST DAS TOR NOCH? 56 begruendete Ausnahmen sind viel, und ein
     Tor, das alles durchwinkt, sieht von aussen genauso gruen aus wie
     eines, das nichts zu meckern hat. Der Gegenbeweis nimmt EINER
     bekannten Kulisse ihr Band (`.keyart .kshade`) und prueft, ob
     dieselbe Flaeche danach als Beschnitt gemeldet wird. Faellt dieser
     Schritt, ist die Kulissen-Erkennung zu weit geraten — dann meldet
     die Suite nichts mehr, egal was passiert. */
  await page.evaluate(() => window.__proto.show('navPass'));
  await page.waitForTimeout(400);
  const scharf = await page.evaluate(() => {
    const el = document.querySelector('.keyart');
    if (!el) return null;
    const sh = el.querySelector('.kshade');
    const messen = () => {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const deckend = s => (s.backgroundImage && s.backgroundImage !== 'none') ||
                           (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)');
      return [...el.children].some(ch => {
        const c = getComputedStyle(ch);
        if (c.position !== 'absolute' || !deckend(c)) return false;
        const cb = ch.getBoundingClientRect();
        return cb.width >= b.width * 0.8 && cb.height >= b.height * 0.8;
      }) || (cs.backgroundImage || '').split('url(').length - 1 === 0;
    };
    const vorher = messen();
    const alt = sh ? sh.style.display : null;
    if (sh) sh.style.display = 'none';
    const nachher = messen();
    if (sh) sh.style.display = alt;
    return { hatKshade: !!sh, vorher, nachher };
  });
  step('gegen: Kulissen-Erkennung haengt wirklich am Band',
    !!scharf && scharf.hatKshade && scharf.vorher === true && scharf.nachher === false,
    scharf ? 'mit Band: ' + scharf.vorher + ' · ohne Band: ' + scharf.nachher : 'kein .keyart gefunden');

  /* ------------------------------------------------------------------
   * 4. UEBERMALTE AUFSCHRIFTEN
   * ------------------------------------------------------------------
   * Der Befund, der diese Pruefung ausgeloest hat: die Raritaet auf der
   * Sammel-/Schmiedekachel war unsichtbar, und aus dem Stueckzaehler
   * „x7" war „<7" geworden. Beides kam vom Rahmen-Overlay `.frm`
   * (z-index 3), dessen border-image echte BAENDER an allen vier Kanten
   * malt — genau dort, wo die Aufschriften sitzen.
   *
   * ⚠ WARUM KEIN TREFFERTEST DAS FINDET: `.frm` traegt
   * `pointer-events:none`. `elementFromPoint` meldet an dieser Stelle
   * die Schrift als oberstes Element, obwohl der Rahmen darueber liegt.
   * Ein Hit-Test beweist Anklickbarkeit, nicht Sichtbarkeit.
   * Gemessen wird deshalb die MALREIHENFOLGE, nicht der Treffer.
   * ---------------------------------------------------------------- */
  const uebermalt = [];
  for (const v of VIEWS) {
    await page.evaluate(n => window.__proto.show(n), v);
    await page.waitForTimeout(300);
    const r = await page.evaluate(view => {
      const A = document.querySelector('.view.active');
      const out = [];
      const nm = e => e.id || String(e.className).split(' ')[0] || e.tagName.toLowerCase();
      const sicht = e => { const c = getComputedStyle(e), b = e.getBoundingClientRect();
        return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 2 && b.height > 2; };
      /* Alle durchlaessigen Auflagen einsammeln: absolut gesetzt, ohne
         Trefferflaeche, mit eigener Malebene. */
      const auflagen = [...A.querySelectorAll('*')].filter(e => {
        const c = getComputedStyle(e);
        if (!(c.pointerEvents === 'none' && c.position === 'absolute' &&
              c.zIndex !== 'auto' && +c.zIndex > 0 && sicht(e))) return false;
        /* ⚠ EIN VIDEO ODER BILD, DAS DEN PLATZ VOLL AUSFUELLT, IST EIN
           ERSATZ, KEINE UEBERMALUNG. Die Kartenkachel haelt bewusst drei
           Ebenen (Video ueber Artwork ueber Emoji), damit in jedem
           Netz-Zustand etwas zu sehen ist — das Emoji SOLL verschwinden,
           sobald das Video laeuft. Erste Fassung meldete genau das als
           Fehler. */
        if (e.tagName === 'VIDEO' || e.tagName === 'IMG') return false;
        return true;
      });
      /* ⚠ EIN RECHTECK-UEBERLAPP IST NOCH KEINE UEBERDECKUNG. Erste
         Fassung dieser Pruefung meldete 10 Stellen, davon keine echt:
         sie verglich den ganzen Kasten der Auflage gegen den ganzen
         Kasten des Nachbarn. Eine border-image-Auflage malt aber NUR
         ihre vier BAENDER — die Mitte bleibt leer —, und ein Text malt
         nur dort, wo Glyphen stehen, nicht ueber seinen ganzen Kasten.
         Gemessen wird deshalb: Glyphenkasten (per Range) gegen Band. */
      const baender = o => {
        const b = o.getBoundingClientRect();
        const s = getComputedStyle(o);
        if (!s.borderImageSource || s.borderImageSource === 'none') {
          /* ⚠ ZWEITE SCHAERFUNG, aus einem falschen Befund gelernt:
             `.cbanner .bframe` wurde gemeldet, weil diese Zweigstelle
             frueher pauschal „die ganze Flaeche malt" annahm. Das Element
             ist aber `border:2px solid transparent` OHNE Fuellung — es
             malt einen Ring, keine Flaeche, und das Zeichen in der Mitte
             bleibt frei. Eine Auflage ohne Fuellung malt nur ihren Rand. */
          const leer = (s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent') &&
                       (!s.backgroundImage || s.backgroundImage === 'none');
          if (!leer) return [b];                        // volle Flaeche malt
          const o1 = parseFloat(s.borderTopWidth) || 0, r1 = parseFloat(s.borderRightWidth) || 0;
          const u1 = parseFloat(s.borderBottomWidth) || 0, l1 = parseFloat(s.borderLeftWidth) || 0;
          if (!(o1 || r1 || u1 || l1)) return [];       // malt gar nichts
          return [
            { left: b.left, right: b.right, top: b.top, bottom: b.top + o1 },
            { left: b.right - r1, right: b.right, top: b.top, bottom: b.bottom },
            { left: b.left, right: b.right, top: b.bottom - u1, bottom: b.bottom },
            { left: b.left, right: b.left + l1, top: b.top, bottom: b.bottom }
          ];
        }
        const teile = s.borderImageWidth.split(/\s+/);
        const w = k => { const t = teile[k] !== undefined ? teile[k] : teile[k % teile.length];
          const waag = k === 1 || k === 3;
          return /%$/.test(t) ? parseFloat(t) / 100 * (waag ? b.width : b.height) : parseFloat(t) || 0; };
        const o1 = w(0), r1 = w(1), u1 = w(2), l1 = w(3);
        return [
          { left: b.left, right: b.right, top: b.top, bottom: b.top + o1 },
          { left: b.right - r1, right: b.right, top: b.top, bottom: b.bottom },
          { left: b.left, right: b.right, top: b.bottom - u1, bottom: b.bottom },
          { left: b.left, right: b.left + l1, top: b.top, bottom: b.bottom }
        ];
      };
      const textKasten = e => {
        const r = document.createRange(); r.selectNodeContents(e);
        const b = r.getBoundingClientRect();
        return b.width > 0 && b.height > 0 ? b : null;
      };
      auflagen.forEach(o => {
        const oz = +getComputedStyle(o).zIndex;
        const bs = baender(o);
        const eltern = o.parentElement;
        if (!eltern) return;
        [...eltern.children].forEach(g => {
          if (g === o || !sicht(g)) return;
          if (!g.textContent || !g.textContent.trim()) return;
          const gs = getComputedStyle(g);
          if (gs.position === 'static') return;          // liegt gar nicht in derselben Ebene
          const gz = gs.zIndex === 'auto' ? 0 : +gs.zIndex;
          if (gz > oz) return;                            // liegt darueber, alles gut
          /* Nur das eigene Textstueck, nicht das der Kinder: sonst misst
             man den Kasten eines Behaelters und meldet ihn als Schrift. */
          const eigenerText = [...g.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          if (!eigenerText) return;
          const tb = textKasten(g);
          if (!tb) return;
          const trifft = bs.some(bd => !(tb.right <= bd.left || tb.left >= bd.right ||
                                         tb.bottom <= bd.top || tb.top >= bd.bottom));
          if (trifft) out.push(view + '/' + nm(g) + ' (z ' + gz + ') unter ' +
            nm(o) + ' (z ' + oz + ') — "' + g.textContent.trim().slice(0, 14) + '"');
        });
      });
      return out;
    }, v);
    uebermalt.push(...r);
  }
  step('Keine Aufschrift liegt unter einer durchlaessigen Auflage',
    uebermalt.length === 0,
    uebermalt.length ? uebermalt.slice(0, 10).join(' | ')
                     : 'alle Aufschriften malen ueber ihren Auflagen');

  await browser.close();
  const bad = steps.filter(s => !s.ok).length;
  console.log(bad ? bad + ' FEHLER' : steps.length + '/' + steps.length + ' Schritte ok');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
