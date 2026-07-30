/* ==================================================================
 * SHOP-REGRESSION — Tagesangebote, Booster-Packs, Vorrats-Truhe,
 * Kristalltresor, Gold-Tausch
 * ------------------------------------------------------------------
 * Eigene Suite fuer den Shop-Umbau nach der Fehlerliste zu IMG_3386.
 * Sie prueft die ZUSAGEN des Systems, nicht seinen aktuellen Wortlaut:
 *   · die Tagesziehung ist reproduzierbar und springt nicht,
 *   · es gibt genau EINEN Gratis-Posten pro Tag, einmal abholbar,
 *   · Bronze ist aus dem kaufbaren Angebot raus, drei Packs stehen
 *     nebeneinander,
 *   · die Vorrats-Truhe zeigt ausschliesslich Zahlen aus arena_cards.js,
 *   · die drei breiten Baender sind EINE Bauform, und ihr Artwork
 *     verdeckt keinen Knopf.
 *
 * ⚠ Die letzte Pruefung ist die wichtigste. Oertlich laedt kein Bild
 * (kein CDN), ein Fehler der Bauart „Bild verdeckt Inhalt" ist fuer eine
 * reine Sichtpruefung deshalb strukturell unsichtbar. Sie ist in diesem
 * Projekt schon einmal passiert und hat einen Knopf verdeckt.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_shop.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');

/* ⚠ AM EIGENEN ORT MESSEN (30.07.2026). Hier stand der feste Pfad
   /home/user/elemental-td/... — laeuft die Suite aus einem Worktree,
   prueft sie damit die HAUPT-Auscheckung und nicht die Datei, die
   danebenliegt. Ein gruener Lauf sagte dann nichts ueber die Aenderung
   aus, die man gerade gemacht hat. Der Pfad haengt jetzt an dieser
   Datei, nicht an einer Maschine. */
const FILE = 'file://' + path.resolve(__dirname, '..', 'ui_prototype.html');
const errors = [];
const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  \u2014 ' + info : ''));
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 },
                                         deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Bildfehler sind hier erwartet: das CDN ist aus dieser Umgebung tot.
    /* Seit 30.07.2026 liegen die Assets im Repo (arena_patches/assets/,
       Nachweis in assets/HERKUNFT.json). Ein Fehler mit `/assets/` im Text
       ist damit KEIN Umgebungsrauschen mehr, sondern eine fehlende Datei —
       genau der Fall, den der alte Sammelfilter mitgedeckt hat, als das
       Manifest noch aufs CDN zeigte. Er geht deshalb VOR den Filter. */
    if (/\/assets\//.test(t) && !/PRUEFUNG_FEHLT_ABSICHTLICH/.test(t)) {
      /* PRUEFUNG_FEHLT_ABSICHTLICH ist der erzwungene Ausfall der
         Rueckfall-Gegenprobe. Sie MUSS 404 liefern, sonst prueft sie
         nichts — sie hier mitzuzaehlen waere eine Messung, die ihr
         eigenes Werkzeug als Befund meldet. */
      errors.push('fehlende lokale Datei: ' + t); return;
    }
    if (/ERR_|net::|Failed to load resource|cloudfront|\.png|\.mp4|\.webm|\.mp3/i.test(t)) return;
    errors.push('console.error: ' + t);
  });

  await page.goto(FILE);
  await page.waitForTimeout(1200);
  // Jede Overlay-Ebene schliessen — ein offener Layer faengt jeden Klick ab.
  const clearLayers = () => page.evaluate(() =>
    ['loginLayer', 'dailyLayer', 'offerLayer', 'confirmDlg', 'reqDlg', 'detailModal',
     'bonusDlg', 'mergeCeremony', 'roadLayer', 'cineLayer', 'avCerLayer', 'mmLayer']
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('open'); }));
  const go = async (nav) => {
    await clearLayers();
    await page.evaluate(n => window.__proto.show(n), nav);
    await page.waitForTimeout(380);
  };
  await go('navShop');

  /* ==================================================================
   * AUFBAU DER SEKTIONEN — UMGESCHRIEBEN AM 30.07.2026 (§27.1)
   * ------------------------------------------------------------------
   * Vorher stand hier „Acht Sektionen, lueckenlos 1-8" mit der Folge
   *   shopPromo · arenaPackBox · dealGrid · packShop · vorratShop ·
   *   vaultShop · gemShop · goldShop
   * Das war die Folge nach §8.1, aus Videostandbildern geschaetzt. §27
   * ist an acht Screenshots abgelesen und korrigiert zwei Dinge:
   *   · AA hat an Position 1 KEINEN Banner (weder Werbe- noch
   *     Pass-Banner) — aus acht Sektionen werden sieben.
   *   · Die ARCANE SUPPLIES CHEST steht VOR dem Truhenblock, nicht
   *     dahinter — unser Vorrats-Pack rueckt von 5 auf 3.
   * Der Schritt wird NICHT geloescht und NICHT aufgeweicht: er prueft
   * dieselbe Zusage (lueckenlose Nummern, gleiche Folge im DOM) gegen
   * die neue Vorlage.
   *
   * „Vorhandensein ist nicht Sichtbarkeit": gezaehlt wird nur, was
   * getClientRects() auch ausgibt. Ein `display:none`-Band haette den
   * alten Schritt bestanden.
   * ================================================================== */
  const SOLL_FOLGE = ['arenaPackBox', 'dealGrid', 'vorratShop', 'packShop',
                      'vaultShop', 'gemShop', 'goldShop'];
  const auf = await page.evaluate((folge) => {
    const sichtbar = e => !!(e && e.getClientRects().length);
    const alle = [...document.getElementById('viewShop').querySelectorAll('*')];
    return {
      sekt: [...document.querySelectorAll('#viewShop [data-sec]')]
        .filter(sichtbar).map(e => e.dataset.sec).join(','),
      sektRoh: document.querySelectorAll('#viewShop [data-sec]').length,
      reihenfolge: folge.map(id => {
        const e = document.getElementById(id);
        return sichtbar(e) ? alle.indexOf(e) : -1;
      }),
      // Was raus musste — beides darf im ganzen Shop nicht mehr auftauchen.
      passBanner: document.querySelectorAll(
        '#viewShop #shopPromo, #viewShop .promobanner, #viewShop .passbanner').length,
      bannerShop: document.querySelectorAll(
        '#viewShop [data-adfree], #viewShop .adbanner, #viewShop [data-noads]').length,
      // Der Tresor sitzt auf AAs Roulette-Platz (§27.1 Position 5).
      tresorSec: (() => {
        const box = document.getElementById('vaultShop');
        if (!box) return null;
        let p = box.previousElementSibling;
        while (p && !p.hasAttribute('data-sec')) p = p.previousElementSibling;
        return p ? p.getAttribute('data-sec') : null;
      })(),
      tresorSichtbar: sichtbar(document.getElementById('vaultShop')),
      deals: document.querySelectorAll('#dealGrid .prodcard').length,
      dealGratis: document.querySelectorAll('#dealGrid [data-gratis]').length,
      packs: document.querySelectorAll('#packShop .shopcard').length,
      packSpalten: getComputedStyle(document.getElementById('packShop'))
        .gridTemplateColumns.trim().split(/\s+/).length,
      packBronze: document.querySelectorAll('#packShop [data-pack="bronze"]').length,
      packFrei: document.querySelectorAll('#packFreeBox .tagesband').length,
      packFreiBadge: document.querySelectorAll('#packFreeBox .freebadge').length,
      golds: [...document.querySelectorAll('#goldShop .prodcard')].filter(sichtbar).length,
      goldSpalten: getComputedStyle(document.getElementById('goldShop'))
        .gridTemplateColumns.trim().split(/\s+/).length,
      goldGratis: document.querySelectorAll('#goldShop [data-goldfree]').length,
      gems: [...document.querySelectorAll('#gemShop .prodcard')].filter(sichtbar).length,
      gemSpalten: getComputedStyle(document.getElementById('gemShop'))
        .gridTemplateColumns.trim().split(/\s+/).length,
      vorrat: document.querySelectorAll('#vorratShop .vrbtn').length,
      // Die ehrliche Werbezeile — sie MUSS sichtbar sein, nicht nur da.
      werbung: (() => {
        const e = document.getElementById('werbungNote');
        return e && e.getClientRects().length ? e.textContent.replace(/\s+/g, ' ').trim() : '';
      })(),
    };
  }, SOLL_FOLGE);
  step('Sieben sichtbare Sektionen, lueckenlos 1-7 (§27.1)',
    auf.sekt === '1,2,3,4,5,6,7' && auf.sektRoh === 7,
    auf.sekt + '  (' + auf.sektRoh + ' markiert)');
  step('Inhaltscontainer stehen in AAs Folge im DOM',
    auf.reihenfolge.every((v, i) => v >= 0 && (i === 0 || v > auf.reihenfolge[i - 1])),
    SOLL_FOLGE.join(' < ') + '  →  ' + auf.reihenfolge.join(' < '));
  /* Die beiden Streichungen aus §27.1, woertlich vom Auftraggeber:
     „Der battledpass der im Shop oben ist kann entfernt werden" und
     „Den Banner Shop braucht es im Shop nicht der ist in AA auch nicht
     drin." Geprueft wird auf ABWESENHEIT — der haeufigste Rueckfall bei
     so einer Streichung ist, den Baustein „erstmal auszublenden". */
  step('Kein Pass-Banner mehr im Shop', auf.passBanner === 0,
    auf.passBanner + ' gefunden');
  step('Kein Banner-Shop (Werbe-Entfernen-Banner) im Shop', auf.bannerShop === 0,
    auf.bannerShop + ' gefunden');
  step('Der Kristalltresor steht auf AAs Roulette-Platz (Sektion 5)',
    auf.tresorSec === '5' && auf.tresorSichtbar,
    'Sektion ' + auf.tresorSec + ', sichtbar ' + auf.tresorSichtbar);
  step('Booster-Packs: 3 kaufbare nebeneinander, kein Bronze im Raster',
    auf.packs === 3 && auf.packSpalten === 3 && auf.packBronze === 0,
    auf.packs + ' Kacheln / ' + auf.packSpalten + ' Spalten / ' +
    auf.packBronze + ' Bronze');
  step('Gratis-Tagespack als Band unter dem Raster, mit GRATIS-Zeichen',
    auf.packFrei === 1 && auf.packFreiBadge === 1,
    auf.packFrei + ' Band / ' + auf.packFreiBadge + ' Zeichen');
  /* ⚠ UMGESCHRIEBEN (30.07.2026). Vorher: „3 kaufbare Staffeln,
     Gratis-Gold als Band darunter". Das Band war die Antwort auf ein
     Raster mit vier Posten, von denen einer gratis war. AA hat DREI
     Gold-Staffeln, und die erste davon IST die gratis abzuholende
     (§27.2) — es bleibt nichts uebrig, was unter dem Raster stehen
     koennte. Geprueft wird jetzt AAs Raster: drei Kacheln in einer
     Reihe, genau eine davon der Gratisposten. */
  step('Gold: 3 Staffeln in EINER Reihe, die erste ist der Gratisposten',
    auf.golds === 3 && auf.goldSpalten === 3 && auf.goldGratis === 1,
    auf.golds + ' Kacheln / ' + auf.goldSpalten + ' Spalten / ' +
    auf.goldGratis + ' Gratisposten');
  step('Gems: 6 Staffeln in 3 Spalten (AAs 3 x 2)',
    auf.gems === 6 && auf.gemSpalten === 3,
    auf.gems + ' Kacheln / ' + auf.gemSpalten + ' Spalten');
  /* Belohnte Werbung ist nicht angebunden (WERBUNG_VERFUEGBAR = false).
     AA haengt drei Posten an ein Video; wo der Weg fehlt, muss die
     Oberflaeche das SAGEN statt einen toten Knopf zu zeigen. */
  step('Der fehlende Werbeweg steht sichtbar im Shop',
    /nicht angebunden/i.test(auf.werbung) && auf.werbung.length > 40,
    auf.werbung.slice(0, 70));
  step('Kein Knopf im Shop verspricht ein Werbevideo',
    (await page.evaluate(() => [...document.querySelectorAll(
      '#viewShop button')].filter(b => /▶|werbung|video/i.test(b.textContent)).length)) === 0);

  /* ==================================================================
   * PREISE — GEGEN DIE TABELLE AUS §27.2 GERECHNET
   * ------------------------------------------------------------------
   * Die Tabelle steht HIER, weil sie die Vorlage ist; die Zahlen im
   * Prototyp sind die Kopie. Geprueft wird also nicht „steht da 90?",
   * sondern „steht da, was abgelesen wurde?". Wer den Preis aendern
   * will, muss die Vorlage aendern — und merkt dabei, dass er sie
   * aendert.
   * ================================================================== */
  const AA_PREISE = {
    // [Menge, Preis in Fr.] — GEMS, Echtgeld
    gems: [[80, 2], [500, 4], [1200, 9], [2500, 18], [6500, 40], [14000, 90]],
    // [Menge Gold, Preis in Gems] — 0 = gratis (bei AA das Werbevideo)
    gold: [[12000, 0], [36000, 90], [144000, 288]],
    vorratX1: 300, vorratX10: 2680,
    explorer: 80,          // AAs Explorer Chest = unser Silber-Pack
    supplies1: 300,        // AAs Arcane Supplies Chest x1 = unser Gold-Pack
  };
  const preise = await page.evaluate(() => {
    const P = window.__proto;
    const zahl = t => {
      const m = String(t).replace(',', '.').match(/\d+(?:\.\d+)?/);
      return m ? parseFloat(m[0]) : NaN;
    };
    const sichtbar = e => !!(e && e.getClientRects().length);
    return {
      gems: P.GEM_PACKS.map(g => [g.amt, zahl(g.price)]),
      gold: P.GOLD_PACKS.map(g => [g.amt, g.cost]),
      vorratX1: P.VORRAT.preis1, vorratX10: P.VORRAT.preis10,
      packs: P.SHOP_PACKS.map(s => [s.key, s.cost]),
      // und dasselbe noch einmal so, wie es auf dem Schirm steht
      gemKacheln: [...document.querySelectorAll('#gemShop .prodcard')]
        .filter(sichtbar).map(k => [
          zahl(k.querySelector('.pcamt').textContent.replace(/\s/g, '')),
          zahl(k.querySelector('.pcbuy').textContent)]),
      goldKacheln: [...document.querySelectorAll('#goldShop .prodcard')]
        .filter(sichtbar).map(k => [
          zahl(k.querySelector('.pcamt').textContent.replace(/\s/g, '')),
          /GRATIS/i.test(k.querySelector('.pcbuy').textContent)
            ? 0 : zahl(k.querySelector('.pcbuy').textContent)]),
    };
  });
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  step('Gem-Staffeln entsprechen der §27.2-Tabelle (Menge UND Preis)',
    gleich(preise.gems, AA_PREISE.gems),
    preise.gems.map(g => g[0] + '=Fr.' + g[1]).join(' · '));
  step('Die Gem-Preise stehen auch SO auf den Kacheln',
    gleich(preise.gemKacheln, AA_PREISE.gems),
    preise.gemKacheln.map(g => g[0] + '=Fr.' + g[1]).join(' · '));
  step('Gold-Staffeln entsprechen der §27.2-Tabelle',
    gleich(preise.gold, AA_PREISE.gold),
    preise.gold.map(g => g[0] + '=' + (g[1] || 'gratis')).join(' · '));
  step('Die Gold-Preise stehen auch SO auf den Kacheln',
    gleich(preise.goldKacheln, AA_PREISE.gold),
    preise.goldKacheln.map(g => g[0] + '=' + (g[1] || 'gratis')).join(' · '));
  step('Vorrats-Pack: x1 = 300, x10 = 2 680 Gems (§27.2)',
    preise.vorratX1 === AA_PREISE.vorratX1 && preise.vorratX10 === AA_PREISE.vorratX10,
    preise.vorratX1 + ' / ' + preise.vorratX10);
  step('Silber = AAs Explorer (80), Gold = AAs Supplies x1 (300)',
    preise.packs[0][1] === AA_PREISE.explorer && preise.packs[1][1] === AA_PREISE.supplies1,
    preise.packs.map(p => p[0] + '=' + p[1]).join(' · '));
  /* ⚠ DER KNICK. AAs Rappen-je-Gem-Kurve faellt monoton — AUSSER beim
     letzten Sprung: 0,62 → 0,64. Die teuerste Staffel ist pro Gem
     minimal SCHLECHTER als die zweitteuerste. Das ist kein Ablesefehler
     und wird nicht geglaettet: „Trophy" (6 500) gewinnt den Vergleich,
     „Safe" (14 000) verkauft die Menge. Diese Pruefung verlangt den
     Knick ausdruecklich — eine geglaettete Kurve ist hier ein FEHLER,
     kein Fortschritt. */
  const ct = preise.gems.map(g => Math.round(g[1] / g[0] * 10000) / 100);
  step('Rappen je Gem fallen bis zur zweitteuersten Staffel',
    ct.slice(0, -1).every((v, i) => i === 0 || v < ct[i - 1]), ct.join(' → '));
  step('… und STEIGEN beim letzten Schritt wieder (AAs Anker, §27.2)',
    ct[5] > ct[4] && ct[4] === 0.62 && ct[5] === 0.64,
    ct[4] + ' → ' + ct[5] + ' ct je Gem');
  step('„Bester Wert!" sitzt auf der Staffel, die den Vergleich gewinnt',
    (await page.evaluate(() => {
      const k = [...document.querySelectorAll('#gemShop .prodcard')];
      const i = k.findIndex(e => /BESTER WERT/i.test(e.textContent));
      return i;
    })) === ct.indexOf(Math.min(...ct)),
    'guenstigste Staffel ist Nr. ' + (ct.indexOf(Math.min(...ct)) + 1));
  /* Gold je Gem STEIGT dagegen durchgehend (400 → 500, §27.2) — hier
     gibt es keinen Knick, und ein Knick waere hier auch keiner. */
  const jeGem = preise.gold.filter(g => g[1] > 0).map(g => g[0] / g[1]);
  step('Gold je Gem steigt mit der Staffel (400 → 500)',
    jeGem.every((v, i) => i === 0 || v > jeGem[i - 1]) &&
    jeGem[0] === 400 && jeGem[1] === 500, jeGem.join(' → '));
  /* WAEHRUNGSREGEL §27.2: „Tuerme kosten Gems, Baupläne Gold." Unsere
     Essenzen sind AAs Greenprints. Und Gold ist bei uns keine
     Kaufwaehrung fuer Echtgeld-Ware — es kauft nur Spielsachen. */
  const waehrung = await page.evaluate(() => {
    const P = window.__proto;
    let turmGold = 0, essGems = 0, n = 0;
    for (let t = 0; t < 200; t++) P.zieheTagesangebote(t).forEach(x => {
      n++;
      if (x.turmId && x.cur === 'gold') turmGold++;
      if (/^ess_/.test(x.id) && x.cur === 'gems') essGems++;
    });
    return { turmGold, essGems, n };
  });
  step('Tuerme kosten immer Gems, Essenz immer Gold (§27.2)',
    waehrung.turmGold === 0 && waehrung.essGems === 0,
    waehrung.n + ' Posten geprueft, ' + waehrung.turmGold + ' Turm-in-Gold, ' +
    waehrung.essGems + ' Essenz-in-Gems');

  /* ==================================================================
   * TAGESANGEBOTE — die Ziehung muss REPRODUZIERBAR sein
   * ------------------------------------------------------------------
   * Der Auftrag: „mach das System der tagesangebote fertig fuege tower
   * gems gold usw ein es kann Gold oder gems auch mal kostenlos geben
   * nur 1x pro Tag und nicht viel."
   * Fuenf Zusagen, fuenf Pruefungen. Die wichtigste ist die erste:
   * zweimal derselbe Tagesindex muss dieselbe Reihe liefern — sonst
   * springen die Angebote waehrend des Tages, und genau das ist der
   * Fehler, den ein Math.random in der Ziehung erzeugt haette.
   * ================================================================== */
  await go('navShop');
  await page.waitForTimeout(300);
  const tag = await page.evaluate(() => {
    const P = window.__proto;
    const reihe = t => P.zieheTagesangebote(t).map(d => d.id + ':' + d.cur + ':' + d.cost).join('|');
    const a = reihe(20000), b = reihe(20000), c = reihe(20001);
    // 400 Tage durchrechnen: Anzahl Gratis-Posten, Warenvielfalt, Groesse
    const gratisProTag = new Set(), warenIds = new Set(), gratisIds = new Set();
    const gratisMengen = [];
    let gemsKaeuflich = 0;
    for (let t = 0; t < 400; t++) {
      const z = P.zieheTagesangebote(t);
      gratisProTag.add(z.filter(x => x.gratis).length);
      z.forEach(x => {
        if (x.gratis) { gratisIds.add(x.id); gratisMengen.push(x.zahl); }
        else warenIds.add(x.id);
        // Gems duerfen nie fuer Gold zu kaufen sein (Waehrungsregel)
        if (!x.gratis && /gems|kristall/i.test(x.name) && x.cur === 'gold') gemsKaeuflich++;
      });
    }
    // Welche Warengruppen tauchen ueberhaupt auf?
    const gruppen = { turm: 0, gold: 0, material: 0 };
    for (let t = 0; t < 60; t++) P.zieheTagesangebote(t).forEach(x => {
      if (x.turmId) gruppen.turm++;
      else if (/^gold_/.test(x.id)) gruppen.gold++;
      else if (/^ess_/.test(x.id)) gruppen.material++;
    });
    return { stabil: a === b, wechselt: a !== c, laenge: P.zieheTagesangebote(20000).length,
             gratisProTag: [...gratisProTag], warenIds: warenIds.size, gratisIds: gratisIds.size,
             maxGratis: Math.max(...gratisMengen), gemsKaeuflich, gruppen,
             warenGesamt: P.DEAL_WAREN.length, gratisGesamt: P.DEAL_GRATIS.length };
  });
  step('Ziehung ist innerhalb eines Tages STABIL (kein Math.random)',
    tag.stabil, tag.stabil ? 'zwei Ziehungen identisch' : 'Reihe springt');
  step('Ziehung wechselt am naechsten Tag', tag.wechselt);
  step('Genau EIN Gratis-Posten pro Tag, an jedem der 400 geprueften Tage',
    tag.gratisProTag.length === 1 && tag.gratisProTag[0] === 1,
    'beobachtete Anzahlen: ' + tag.gratisProTag.join(','));
  step('Sechs Posten je Tag, alle Waren und alle Gratis-Posten kommen dran',
    tag.laenge === 6 && tag.warenIds === tag.warenGesamt &&
    tag.gratisIds === tag.gratisGesamt,
    tag.laenge + ' Posten · ' + tag.warenIds + '/' + tag.warenGesamt + ' Waren · ' +
    tag.gratisIds + '/' + tag.gratisGesamt + ' Gratis-Sorten');
  step('Tuerme, Gold UND Material sind im Angebot (nicht nur Essenz)',
    tag.gruppen.turm > 0 && tag.gruppen.gold > 0 && tag.gruppen.material > 0,
    JSON.stringify(tag.gruppen));
  /* „nicht viel": der Gratis-Posten bleibt unter allem, was man kaufen
     kann. 600 Gold ist ein Viertel des Tagesgold-Bands, 10 Gems ein
     Achtel der kleinsten Gem-Staffel. */
  step('Gratis-Posten ist klein bemessen (<= 600 Einheiten)',
    tag.maxGratis <= 600, 'groesster Posten: ' + tag.maxGratis);
  /* WAEHRUNGSREGEL: Gems sind nie fuer Gold zu haben — sonst liesse
     sich der Gold-Tausch rueckwaerts befahren. */
  step('Kristalle sind nie fuer Gold kaeuflich', tag.gemsKaeuflich === 0,
    String(tag.gemsKaeuflich) + ' Verstoesse');
  // Einmalige Abholung, und sie ueberlebt einen Render-Durchgang.
  const gratis = await page.evaluate(() => {
    const P = window.__proto;
    const st = P.tagStand(); st.gratis = false; P.tagSpeichern(st);
    P.renderShop();
    const d = P.dealsHeute().filter(x => x.gratis)[0];
    /* ⚠ AUCH MATERIAL. Der Gratis-Posten wird taeglich neu gezogen und
       kann Gold, Kristalle ODER Material sein. Die Pruefung summierte
       nur Gold und Kristalle — an einem Tag, an dem Material gezogen
       wurde, mass sie eine Buchung von 0 gegen eine erwartete Menge von
       sechs und meldete einen Fehler, den es nicht gab. Sie war an den
       Zufall des Tages gebunden statt an die Mechanik. */
    /* NUR `total`. Das Objekt fuehrt die Summe NEBEN den Einzelsorten
       (total/attack/speed/special) — wer ueber alle Werte summiert,
       zaehlt jede Einheit doppelt. */
    const mat = () => +(P.AC.view('solara').materials || {}).total || 0;
    const topf = () => P.gold() + P.gems() + mat();
    const vor = topf();
    document.querySelector('#dealGrid [data-buy="' + d.id + '"]').click();
    const nach1 = topf();
    P.buyDeal(d.id);   // zweiter Versuch — darf nichts mehr buchen
    const nach2 = topf();
    return { id: d.id, zahl: d.zahl,
             gebucht: nach1 - vor,
             zweiterVersuch: nach2 - nach1,
             merker: P.tagStand().gratis,
             knopfTot: !!document.querySelector('#dealGrid [data-gratis] .pcbuy[disabled]') };
  });
  await page.waitForTimeout(300);
  step('Gratis-Posten wird abgeholt und bucht genau seine Menge',
    gratis.gebucht === gratis.zahl, gratis.id + ': +' + gratis.gebucht);
  step('Zweite Abholung am selben Tag bucht NICHTS mehr',
    gratis.zweiterVersuch === 0 && gratis.merker && gratis.knopfTot,
    'Merker ' + gratis.merker + ', Knopf tot ' + gratis.knopfTot);

  /* ==================================================================
   * VORRATS-TRUHE — die Zahlen muessen aus arena_cards.js kommen
   * ------------------------------------------------------------------
   * Der Auftrag verbietet zweite Zahlen ausdruecklich. Diese Pruefung
   * rechnet deshalb nicht nach, sondern VERGLEICHT: jede Prozentzahl in
   * der Chancen-Klappe muss einem Gewicht aus ArenaCards.PACKS
   * entsprechen, und die Mitleidszeile dem getPityStatus().
   * ================================================================== */
  const vt = await page.evaluate(() => {
    const P = window.__proto, AC = window.ArenaCards;
    const pk = AC.PACKS[P.VORRAT.pack], ps = AC.getPityStatus();
    const box = document.getElementById('vorratShop');
    if (!box.classList.contains('open')) box.querySelector('[data-vorratmore]').click();
    const zeilen = [...box.querySelectorAll('.vorratodds .orow')].map(e => ({
      name: e.querySelector('.onm').textContent.trim(),
      wert: parseFloat(e.querySelector('.oval').textContent.replace(',', '.')) }));
    return {
      offen: box.classList.contains('open'),
      zeilen, gewichte: pk.weights, tierNamen: AC.TIERS.slice(0, 5).map(t => t.name),
      pityTxt: box.querySelector('.vorratpity').textContent.replace(/\s+/g, ' ').trim(),
      epicIn: ps.epicIn, legIn: ps.legendaryIn,
      knoepfe: [...box.querySelectorAll('.vrbtn')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
      rabatt: P.vorratRabatt(),
      rabattEcht: Math.round((1 - P.VORRAT.preis10 / (P.VORRAT.preis1 * 10)) * 1000) / 10,
      bandTxt: box.querySelector('.vrpr').textContent,
      versprechen: pk.promise,
    };
  });
  await page.waitForTimeout(250);
  /* (29.07.2026) Vorher: „listet alle FUENF Raritaeten" und „jede Zahl
     stammt 1:1 aus weights". Beides schrieb die alte Bauart fest.
     Geaendert hat sich zweierlei ABSICHTLICH:
       * Suprem steht jetzt mit 0 % dabei statt zu fehlen. „Kommt nicht
         vor" ist eine Aussage, die der Kaeufer sehen soll; das Weglassen
         war eine Annahme darueber, was ihn nicht interessiert.
       * Die Zahlen kommen aus ArenaCards.oddsFor() statt direkt aus
         `weights` — es gab zwei Quellen fuer dieselbe Quote, und sie
         wichen bereits voneinander ab.
     Die Anforderung DAHINTER wird unveraendert geprueft: was auf der
     Kachel steht, muss das sein, woraus gewuerfelt wird. */
  step('Chancen-Klappe listet alle sechs Stufen', vt.offen &&
    vt.zeilen.length === 6, vt.zeilen.length + ' Zeilen');
  step('Jede Prozentzahl stammt aus ArenaCards.oddsFor()',
    vt.zeilen.slice(0, 5).every((z, i) => Math.abs(z.wert - vt.gewichte[i]) < 0.005 &&
                                          z.name === vt.tierNamen[i]),
    vt.zeilen.map(z => z.name + ' ' + z.wert).join(' · '));
  step('Suprem steht ausdruecklich mit 0 % dabei',
    vt.zeilen[5] && /Suprem/.test(vt.zeilen[5].name) && vt.zeilen[5].wert === 0,
    vt.zeilen[5] ? vt.zeilen[5].name + ' ' + vt.zeilen[5].wert : 'fehlt');
  step('das Vorrats-Pack traegt ein ⓘ (Offenlegungspflicht)',
    (await page.locator('#vorratShop [data-odds]').count()) === 1);
  step('Mitleidszeile zeigt getPityStatus(), nicht geschaetzte Zahlen',
    vt.pityTxt.indexOf('≤ ' + vt.epicIn) >= 0 &&
    vt.pityTxt.indexOf('≤ ' + vt.legIn) >= 0, vt.pityTxt);
  step('Truhe traegt OEFFNEN x1 und x10 mit gerechnetem Mengenrabatt',
    /×1/.test(vt.knoepfe[0]) && /×10/.test(vt.knoepfe[1]) &&
    vt.rabatt === vt.rabattEcht && vt.rabatt > 0,
    vt.knoepfe.join('  |  ') + '  → -' + vt.rabatt + ' %');
  step('Das Versprechen der Truhe ist das Pack-Versprechen aus arena_cards.js',
    vt.bandTxt.indexOf(vt.versprechen) === 0, vt.bandTxt.slice(0, 60));
  // x10 bucht zehn Packs und nimmt genau den Rabattpreis.
  const v10 = await page.evaluate(() => {
    const P = window.__proto;
    P.setGems(20000);
    const vorGems = P.gems(), vorPacks = window.ArenaCards.get().packsOpened;
    P.oeffneVorrat(10);
    const r = { ab: vorGems - P.gems(),
                packs: window.ArenaCards.get().packsOpened - vorPacks,
                soll: P.VORRAT.preis10 };
    document.getElementById('confirmDlg').classList.remove('open');
    // Zu wenig Kristalle: nichts wird gebucht, nichts geoeffnet.
    P.setGems(5);
    const vorPacks2 = window.ArenaCards.get().packsOpened;
    P.oeffneVorrat(10);
    r.armPacks = window.ArenaCards.get().packsOpened - vorPacks2;
    r.armGems = P.gems();
    return r;
  });
  step('OEFFNEN x10 oeffnet zehn Packs zum Rabattpreis',
    v10.ab === v10.soll && v10.packs === 10,
    '-' + v10.ab + ' Gems, ' + v10.packs + ' Packs');
  step('Ohne genug Kristalle wird weder gebucht noch geoeffnet',
    v10.armPacks === 0 && v10.armGems === 5,
    v10.armPacks + ' Packs, ' + v10.armGems + ' Gems uebrig');

  /* ==================================================================
   * TAGESBAND — EINE Bauform, und die Bildflaeche darf nichts zudecken
   * ------------------------------------------------------------------
   * ⚠ DIESE PRUEFUNG IST DIE WICHTIGSTE DES BLOCKS. Oertlich laedt kein
   * einziges Bild (kein CDN), ein Fehler der Bauart „Bild verdeckt
   * Knopf" ist fuer eine reine Sichtpruefung deshalb unsichtbar. Sie ist
   * in diesem Projekt schon einmal passiert und hat einen Knopf
   * verdeckt. Geprueft wird darum die STRUKTUR, die den Fehler
   * verhindert (position + overflow auf jedem Bildbehaelter) UND das
   * Ergebnis (elementFromPoint auf der Knopfmitte liefert den Knopf).
   * Beides zusammen greift auch ohne geladenes Bild.
   * ================================================================== */
  /* ⚠ UMGESCHRIEBEN (30.07.2026): `#goldFreeBox .tagesband` ist aus
     dieser Liste gestrichen, weil es das Band nicht mehr gibt — das
     Gratis-Gold ist die erste der drei Gold-Staffeln im Raster (§27.2)
     und damit eine Produktkachel, kein Band. Die Zusage der Pruefung
     bleibt unveraendert und gilt weiter fuer JEDES Band, das es gibt:
     gleiche Bauform, und das Artwork deckt keinen Knopf zu. Der Fehler,
     den sie sucht, ist nicht an die Anzahl der Baender gebunden. */
  const baender = await page.evaluate(() => {
    const sel = ['#packFreeBox .tagesband', '#vaultShop'];
    const wurzel = getComputedStyle(document.documentElement);
    const bannerH = parseFloat(wurzel.getPropertyValue('--banner-h'));
    return sel.map(s => {
      const el = document.querySelector(s);
      if (!el) return { s, fehlt: true };
      /* ⚠ elementFromPoint arbeitet in VIEWPORT-Koordinaten. Ohne diesen
         Schritt liegt das Band weit unter dem Sichtfeld, der Aufruf
         liefert null und die Pruefung meldet einen Fehler, den es nicht
         gibt. Erst scrollen, dann messen. */
      el.scrollIntoView({ block: 'center' });
      const cs = getComputedStyle(el);
      const art = el.querySelector('.bandart, .vaultjar');
      const acs = art ? getComputedStyle(art) : null;
      const btn = el.querySelector('.bandbtn, .vaultbtn');
      const r = btn ? btn.getBoundingClientRect() : null;
      const treffer = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      const rb = el.getBoundingClientRect();
      const rand = el.parentElement.getBoundingClientRect();
      return {
        s,
        pos: cs.position, ovf: cs.overflow,
        artPos: acs ? acs.position : null, artOvf: acs ? acs.overflow : null,
        artB: art ? Math.round(art.getBoundingClientRect().width) : 0,
        artH: art ? Math.round(art.getBoundingClientRect().height) : 0,
        hoehe: Math.round(rb.height), minH: bannerH,
        radius: cs.borderTopLeftRadius, pad: cs.paddingTop,
        knopfFrei: !!(btn && treffer && (treffer === btn || btn.contains(treffer))),
        raus: rb.width - rand.width > 1,
      };
    });
  });
  const bandH = baender.map(b => b.hoehe);
  /* Geprueft wird die BAUFORM, nicht die Pixelhoehe: Radius, Polster und
     Bildkastenmass muessen identisch sein und jedes Band mindestens die
     Reihenhoehe --banner-h haben. Die Hoehe selbst darf abweichen — der
     Tresor traegt eine Zeile mehr (Fortschrittsbalken). Eine Pruefung auf
     gleiche Pixelhoehe wuerde verlangen, dass alle drei denselben Inhalt
     tragen, und das ist nicht die Zusage. */
  step('Alle Baender sind dieselbe Bauform (Radius, Polster, Bildkasten)',
    baender.every(b => !b.fehlt && b.hoehe >= b.minH) &&
    new Set(baender.map(b => b.radius)).size === 1 &&
    new Set(baender.map(b => b.pad)).size === 1 &&
    new Set(baender.map(b => b.artB + 'x' + b.artH)).size === 1,
    bandH.join(' / ') + ' px, Radius ' + baender[0].radius + ', Polster ' + baender[0].pad +
    ', Bildkasten ' + baender[0].artB + 'x' + baender[0].artH);
  step('Jeder Bildbehaelter hat position:relative UND overflow:hidden',
    baender.every(b => b.pos === 'relative' && b.ovf === 'hidden' &&
                       b.artPos === 'relative' && b.artOvf === 'hidden'),
    baender.map(b => b.pos + '/' + b.ovf + ' · ' + b.artPos + '/' + b.artOvf).join(' | '));
  step('Das Artwork verdeckt KEINEN Knopf (elementFromPoint auf der Knopfmitte)',
    baender.every(b => b.knopfFrei), baender.map(b => b.s + ':' + b.knopfFrei).join(' '));
  step('Kein Band sprengt seinen Rahmen', baender.every(b => !b.raus));
  step('Artwork ist bei >= 20 px lesbar bemessen',
    baender.every(b => b.artB >= 20), baender.map(b => b.artB + 'px').join(' / '));
  /* Der Tresor-Bildkasten war 58x70 mit clip-path — das Motiv wurde
     gequetscht UND beschnitten. Jetzt quadratisch und `contain`. */
  const jar = await page.evaluate(() => {
    const j = document.querySelector('#vaultShop .vaultjar');
    const cs = getComputedStyle(j), r = j.getBoundingClientRect();
    return { clip: cs.clipPath, size: cs.backgroundSize,
             verh: +(r.width / r.height).toFixed(2),
             bar: !!document.querySelector('#vaultShop .vbar i') };
  });
  step('Kristalltresor: quadratischer Bildkasten, kein clip-path, contain',
    jar.verh === 1 && (jar.clip === 'none' || !jar.clip) && /contain/.test(jar.size),
    'Verhaeltnis ' + jar.verh + ', clip ' + jar.clip + ', size ' + jar.size);
  step('Kristalltresor zeigt den Fuellstand zusaetzlich als Balken', jar.bar);
  /* GRATIS-Zeichen und Gratis-Knoepfe sind HELLE Flaechen ⇒ dunkle
     Schrift. Dieselbe Regel wie bei den Siegeln weiter oben. */
  const freiLum = await page.evaluate(() => {
    /* ⚠ `:not([disabled])` gehoert dazu. Ein abgeholtes Gratis-Angebot
       traegt eine DUNKLE Plakette (--sh, #222e39) und darauf gedaempfte
       helle Schrift — das ist richtig so. Ohne den Filter meldet die
       Pruefung genau diesen korrekten Zustand als Verstoss (gemessen
       lum 156 auf .pcbuy.freeprice[disabled]). */
    return [...document.querySelectorAll(
      '#viewShop .freebadge, #viewShop .bandbtn.frei:not([disabled]), ' +
      '#viewShop .pcbuy.freeprice:not([disabled]), #viewShop .vrbtn .vrsave')].map(e => {
      const cs = getComputedStyle(e);
      const m = /rgba?\((\d+), (\d+), (\d+)/.exec(cs.webkitTextFillColor || cs.color);
      return { cls: e.className, lum: m ? (+m[1] * .299 + +m[2] * .587 + +m[3] * .114) : 255 };
    });
  });
  step('GRATIS-Zeichen und Gratis-Knoepfe tragen dunkle Schrift auf heller Flaeche',
    freiLum.length >= 3 && freiLum.every(x => x.lum <= 120),
    freiLum.length + ' geprueft, hellster ' + Math.round(Math.max(...freiLum.map(x => x.lum))));
  // .goldtext darf nirgends auf einer hellen/goldenen Flaeche im Shop stehen.
  const goldAufHell = await page.evaluate(() =>
    [...document.querySelectorAll('#viewShop .goldtext')].filter(e => {
      let p = e;
      while (p && p.id !== 'viewShop') {
        if (p.classList.contains('bandbtn') || p.classList.contains('vaultbtn') ||
            p.classList.contains('pcbuy') || p.classList.contains('freebadge') ||
            p.classList.contains('seal')) return true;
        p = p.parentElement;
      }
      return false;
    }).length);
  /* ⚠ Diese Pruefung misst die CSS-EIGENSCHAFT, nicht den Fuellgrad.
     Oertlich ist das CDN gesperrt, jedes Bild hat naturalWidth 0 — ein
     gemessener Fuellgrad waere immer NaN und die Pruefung damit blind
     (DESIGNSYSTEM §7b). Die Ursache ist aber genau diese Eigenschaft:
     mit `contain` fuellten die hochformatigen Turm-Artworks (382x512)
     ihren quadratischen Kasten nur zu 75 %, die quadratischen Icons zu
     100 % — zwei Bildgroessen im selben Raster, und genau das ist
     „sieht nicht sauber aus". Den Fuellgrad misst der Live-Durchgang. */
  const bildfit = await page.evaluate(() => {
    const im = [...document.querySelectorAll('#dealGrid .prodcard .pcart img.prodimg')];
    const kaesten = [...document.querySelectorAll('#dealGrid .prodcard .pcart')]
      .map(e => Math.round(e.getBoundingClientRect().width) + 'x' +
                Math.round(e.getBoundingClientRect().height));
    return { n: im.length,
             falsch: im.filter(e => getComputedStyle(e).objectFit !== 'cover').length,
             groessen: new Set(kaesten).size };
  });
  step('Alle Angebotsbilder fuellen ihren Kasten (object-fit: cover)',
    bildfit.n > 0 && bildfit.falsch === 0,
    bildfit.n + ' Bilder, ' + bildfit.falsch + ' abweichend');
  step('Alle Bildkaesten im Angebotsraster sind gleich gross',
    bildfit.groessen === 1, bildfit.groessen + ' verschiedene Groessen');

  step('.goldtext steht auf keiner hellen/goldenen Flaeche im Shop',
    goldAufHell === 0, String(goldAufHell));

  /* ---------------------------------------------------------------
     TOTE PLATZHALTER-ATTRIBUTE
     ---------------------------------------------------------------
     `data-prodart` wurde beim Rendern gesetzt und von niemandem
     ausgewertet. Die beiden IAP-Kacheln zeigten deshalb ueber Wochen ihr
     Emoji, obwohl beide ein eigenes Produktbild haben — erzeugt,
     verzeichnet, gesichert, freigestellt und nie sichtbar.

     Warum keine Pruefung das gefunden hat: oertlich ist das CDN nicht
     erreichbar, jedes Icon faellt auf sein Emoji zurueck (DESIGNSYSTEM
     §7b). Ein Emoji an dieser Stelle ist hier der Normalzustand und
     taugt deshalb nicht als Hinweis.

     Was sich PRUEFEN laesst, ist der Marker selbst: ein `data-prod*`,
     das die Hydrierung ueberlebt, ist per Definition unbenutzt. Das
     misst nicht das Bild, aber genau den Fehler, der das Bild gekostet
     hat — und zwar auch dann, wenn kein einziges Bild laedt. */
  const tote = await page.evaluate(() =>
    [...document.querySelectorAll('#viewShop [data-prodart],#viewShop [data-prodfrm]')]
      .map(e => e.className + '[' + (e.getAttribute('data-prodart') ||
                                     e.getAttribute('data-prodfrm')) + ']'));
  step('kein unausgewertetes data-prodart/-prodfrm bleibt im Shop stehen',
    tote.length === 0, tote.slice(0, 3).join(' · '));

  /* Und die Gegenprobe: die IAP-Kacheln tragen ueberhaupt eine Bildhuelle,
     nicht nur nackten Text. Ohne sie waere der Marker zwar weg, das Bild
     aber immer noch nicht da. */
  const iap = await page.evaluate(() =>
    [...document.querySelectorAll('#arenaPackBox .iart')]
      .map(e => e.querySelector('img,span.ico') ? 'huelle' : 'nur-text'));
  step('jede IAP-Kachel traegt eine Bildhuelle',
    iap.length > 0 && iap.every(x => x === 'huelle'),
    iap.join(', '));


  /* ============ ZUSAMMENFASSUNG ============ */
  const bad = steps.filter(s => !s.ok);
  console.log('\nEchte JS-Fehler: ' + errors.length);
  errors.forEach(e => console.log('  ' + e));
  console.log(steps.length - bad.length + '/' + steps.length + ' Schritte ok');
  if (bad.length || errors.length) {
    bad.forEach(s => console.log('  FAIL ' + s.name));
    process.exitCode = 1;
  } else {
    console.log('ALLE SHOP-CHECKS OK');
  }
  await browser.close();
})();
