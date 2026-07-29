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

const FILE = 'file://' + path.resolve('/home/user/elemental-td/arena_patches/ui_prototype.html');
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

  /* ============ AUFBAU DER SEKTIONEN ============ */
  const auf = await page.evaluate(() => ({
    sekt: [...document.querySelectorAll('#viewShop [data-sec]')].map(e => e.dataset.sec).join(','),
    reihenfolge: ['shopPromo', 'arenaPackBox', 'dealGrid', 'packShop', 'vorratShop',
                  'vaultShop', 'gemShop', 'goldShop']
      .map(id => { const e = document.getElementById(id);
        return e ? [...document.getElementById('viewShop').querySelectorAll('*')].indexOf(e) : -1; }),
    deals: document.querySelectorAll('#dealGrid .prodcard').length,
    dealGratis: document.querySelectorAll('#dealGrid [data-gratis]').length,
    packs: document.querySelectorAll('#packShop .shopcard').length,
    packSpalten: getComputedStyle(document.getElementById('packShop'))
      .gridTemplateColumns.trim().split(/\s+/).length,
    packBronze: document.querySelectorAll('#packShop [data-pack="bronze"]').length,
    packFrei: document.querySelectorAll('#packFreeBox .tagesband').length,
    packFreiBadge: document.querySelectorAll('#packFreeBox .freebadge').length,
    golds: document.querySelectorAll('#goldShop .prodcard').length,
    goldFrei: document.querySelectorAll('#goldFreeBox .tagesband').length,
    vorrat: document.querySelectorAll('#vorratShop .vrbtn').length,
  }));
  step('Acht Sektionen, lueckenlos 1-8', auf.sekt === '1,2,3,4,5,6,7,8', auf.sekt);
  step('Inhaltscontainer stehen in derselben Folge im DOM',
    auf.reihenfolge.every((v, i) => v >= 0 && (i === 0 || v > auf.reihenfolge[i - 1])),
    auf.reihenfolge.join(' < '));
  step('Booster-Packs: 3 kaufbare nebeneinander, kein Bronze im Raster',
    auf.packs === 3 && auf.packSpalten === 3 && auf.packBronze === 0,
    auf.packs + ' Kacheln / ' + auf.packSpalten + ' Spalten / ' +
    auf.packBronze + ' Bronze');
  step('Gratis-Tagespack als Band unter dem Raster, mit GRATIS-Zeichen',
    auf.packFrei === 1 && auf.packFreiBadge === 1,
    auf.packFrei + ' Band / ' + auf.packFreiBadge + ' Zeichen');
  step('Gold-Tausch: 3 kaufbare Staffeln, Gratis-Gold als Band darunter',
    auf.golds === 3 && auf.goldFrei === 1,
    auf.golds + ' Kacheln / ' + auf.goldFrei + ' Band');

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
  step('Chancen-Klappe oeffnet und listet alle fuenf Raritaeten', vt.offen &&
    vt.zeilen.length === 5, vt.zeilen.length + ' Zeilen');
  step('Jede Prozentzahl stammt 1:1 aus ArenaCards.PACKS[...].weights',
    vt.zeilen.every((z, i) => Math.abs(z.wert - vt.gewichte[i]) < 0.005 &&
                              z.name === vt.tierNamen[i]),
    vt.zeilen.map(z => z.name + ' ' + z.wert).join(' · '));
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
  const baender = await page.evaluate(() => {
    const sel = ['#packFreeBox .tagesband', '#goldFreeBox .tagesband', '#vaultShop'];
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
  step('Alle drei Baender sind dieselbe Bauform (Radius, Polster, Bildkasten)',
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
