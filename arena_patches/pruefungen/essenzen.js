/* essenzen.js — EINE ESSENZ JE KARTE (Umstellung 29.07.2026)
 * ==========================================================================
 * WARUM DIESE SUITE
 * -----------------
 * Am 29.07.2026 wurde das Upgrade-Material von DREI geteilten Sorten
 * (attack/speed/special) auf EINE EIGENE SORTE JE KARTE umgestellt.
 * Nach der Umstellung waren alle fünfzehn bestehenden Suiten grün — und
 * zwar SOFORT, ohne eine einzige Anpassung. Das ist kein gutes Zeichen,
 * sondern die Diagnose: keine von ihnen hat je etwas über das
 * Material-System behauptet, was mit der Zahl der Sorten zu tun hatte.
 * Sie hätten genauso grün gemeldet, wenn das Essenz-Fach leer geblieben
 * wäre, wenn der Shop eine Sorte angekündigt und eine andere gebucht
 * hätte oder wenn der Pass fünf von acht Sorten nie ausgeschüttet hätte.
 *
 * Deshalb misst diese Suite die Kopplungen, nicht die Zahlen:
 *   1. Sorten-Liste == Karten-Liste (nicht: „es sind acht")
 *   2. Was ein Posten ANKÜNDIGT, ist auch das, was er BUCHT
 *   3. Die Kopfleiste zeigt die Summe, das Fach die Einzelbestände
 *   4. Level-Up nimmt genau die eigene Essenz und keine andere
 *   5. Der Pass erreicht ALLE Sorten, nicht nur die ersten drei
 *
 * AUFRUF
 *   export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
 *   export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
 *   node pruefungen/essenzen.js
 * ========================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '..', 'ui_prototype.html');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let ok = 0, bad = 0;
function check(label, cond, info) {
  console.log((cond ? '  ok   ' : '  FAIL ') + label + (info !== undefined ? '  — ' + info : ''));
  cond ? ok++ : bad++;
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on('pageerror', e => errors.push('' + e));

  await page.goto(FILE);
  await page.waitForTimeout(1200);
  const clearLayers = () => page.evaluate(() =>
    ['loginLayer', 'dailyLayer', 'offerLayer', 'confirmDlg', 'reqDlg', 'detailModal',
     'bonusDlg', 'mergeCeremony', 'roadLayer', 'cineLayer', 'avCerLayer', 'mmLayer']
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('open'); }));
  const go = async (nav) => {
    await clearLayers();
    await page.evaluate(n => window.__proto.show(n), nav);
    await page.waitForTimeout(380);
  };

  /* ================= 1. Das Modell ================= */
  console.log('\n== 1. Sortenliste und Kartenliste sind DIESELBE Liste ==');
  const modell = await page.evaluate(() => {
    const AC = window.ArenaCards;
    return {
      sorten: AC.MATERIAL_KEYS.slice().sort(),
      karten: Object.keys(AC.PERKS).sort(),
      identitaet: AC.MATERIAL_KEYS.every(k => AC.materialTypeOf(k) === k),
      unbekannt: AC.materialTypeOf('gibtsnicht'),
      altSorten: ['attack', 'speed', 'special'].map(k => AC.materialTypeOf(k)),
      version: AC.STATE_VERSION,
      namen: AC.MATERIALS.map(m => m.name),
    };
  });
  check('jede Karte hat genau eine eigene Essenz',
    modell.sorten.join(',') === modell.karten.join(','),
    modell.sorten.length + ' Sorten / ' + modell.karten.length + ' Karten');
  check('Sortenschlüssel IST die Karten-ID', modell.identitaet);
  check('unbekannte ID bekommt KEINE Ersatzsorte', modell.unbekannt === null, '' + modell.unbekannt);
  check('die drei alten Sortennamen sind keine Sorten mehr',
    modell.altSorten.every(x => x === null), JSON.stringify(modell.altSorten));
  check('State-Version ist 4', modell.version === 4, modell.version);
  check('jede Sorte hat einen eigenen Namen',
    new Set(modell.namen).size === modell.namen.length, modell.namen.join(' · '));

  /* ================= 2. Essenz-Fach in der Sammlung ================= */
  console.log('\n== 2. Kopfleiste zeigt die Summe, das Fach die Einzelbestände ==');
  await go('navCollection');
  const zu = await page.evaluate(() => ({
    txt: document.getElementById('matCount').textContent.replace(/\s+/g, ' ').trim(),
    hidden: document.getElementById('essBank').hidden,
    expanded: document.getElementById('matCount').getAttribute('aria-expanded'),
    total: window.ArenaCards.getMaterials().total,
    // die Kopfleiste darf NICHT acht Zahlen tragen
    zahlen: (document.getElementById('matCount').textContent.match(/\d+/g) || []).length,
  }));
  check('Fach ist zunächst zu', zu.hidden === true && zu.expanded === 'false');
  check('Kopfleiste trägt GENAU EINE Zahl (die Summe)', zu.zahlen === 1, zu.zahlen + ' Zahlen');
  check('und diese Zahl ist die Summe über alle Sorten',
    zu.txt.replace(/[^\d]/g, '') === String(zu.total).replace(/[^\d]/g, ''),
    zu.txt + ' vs. ' + zu.total);

  await page.click('#matCount');
  await page.waitForTimeout(250);
  const auf = await page.evaluate(() => {
    const AC = window.ArenaCards, bank = AC.getMaterials();
    const zellen = [...document.querySelectorAll('#essBank .esscell')];
    return {
      hidden: document.getElementById('essBank').hidden,
      expanded: document.getElementById('matCount').getAttribute('aria-expanded'),
      n: zellen.length,
      sorten: AC.MATERIAL_KEYS.length,
      // jede Zelle: richtige Sorte, richtiger Bestand
      stimmt: zellen.every(z => {
        const k = z.dataset.esssorte;
        return AC.MATERIAL_KEYS.indexOf(k) >= 0 &&
          z.querySelector('.essz').textContent.replace(/[^\d]/g, '') ===
            String(bank[k]).replace(/[^\d]/g, '');
      }),
      // keine Sorte doppelt, keine fehlt
      abgedeckt: new Set(zellen.map(z => z.dataset.esssorte)).size,
      spalten: getComputedStyle(document.getElementById('essBank')).gridTemplateColumns
        .split(' ').length,
    };
  });
  check('Klick öffnet das Fach', auf.hidden === false && auf.expanded === 'true');
  check('das Fach zeigt JEDE Sorte genau einmal',
    auf.n === auf.sorten && auf.abgedeckt === auf.sorten, auf.n + '/' + auf.sorten);
  check('jede Zelle zeigt den Bestand ihrer eigenen Sorte', auf.stimmt);
  check('das Fach bricht um statt in die Breite zu laufen', auf.spalten <= 4, auf.spalten + ' Spalten');

  // Tastatur — der Chip ist ein <span role=button> und muss Enter selbst behandeln
  await page.focus('#matCount');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check('Enter schliesst das Fach wieder (role=button ist tastaturfähig)',
    await page.evaluate(() => document.getElementById('essBank').hidden === true));
  await page.click('#matCount');
  await page.waitForTimeout(200);

  /* ================= 3. Kartendetail ================= */
  console.log('\n== 3. Kartendetail nennt die EIGENE Essenz ==');
  const detail = await page.evaluate(() => {
    const AC = window.ArenaCards;
    const ids = ['fire', 'water', 'light', 'darkness'];
    return ids.map(id => {
      window.__proto.openDetail(id);
      const v = AC.view(id);
      return {
        id: id,
        typ: v.materialType,
        name: document.getElementById('dMatName').textContent,
        sub: document.getElementById('dMatSub').textContent,
        stand: document.getElementById('dMat').textContent,
        // hebt das offene Fach die eigene Sorte hervor?
        eigen: [...document.querySelectorAll('#essBank .esscell.eigen')].map(z => z.dataset.esssorte),
      };
    });
  });
  check('jede Karte nennt ihre eigene Sorte',
    detail.every(d => d.typ === d.id), detail.map(d => d.id + '→' + d.typ).join(' '));
  check('vier Karten nennen VIER verschiedene Essenzen',
    new Set(detail.map(d => d.name)).size === 4, detail.map(d => d.name).join(' · '));
  check('kein Detail listet mehr „für diesen Turm nicht verwendbar"',
    detail.every(d => !/nicht verwendbar/.test(d.sub)));
  check('der Untertext sagt, woher die Essenz kommt oder dass sie reicht',
    detail.every(d => /kommt aus|Reicht für/.test(d.sub)), detail[0].sub);
  check('das offene Fach hebt genau die eigene Sorte hervor',
    detail.every(d => d.eigen.length === 1 && d.eigen[0] === d.id),
    detail.map(d => d.eigen.join('+')).join(' '));

  /* ================= 4. Level-Up nimmt NUR die eigene Essenz ============ */
  console.log('\n== 4. Level-Up greift nur auf die eigene Essenz zu ==');
  const lvl = await page.evaluate(() => {
    const AC = window.ArenaCards;
    const vorher = AC.getMaterials();
    const v = AC.view('fire');
    const r = AC.levelUp('fire');
    const nachher = AC.getMaterials();
    const veraendert = AC.MATERIAL_KEYS.filter(k => vorher[k] !== nachher[k]);
    return { r: r, veraendert: veraendert, abzug: vorher.fire - nachher.fire,
             brauchte: v.needMaterial };
  });
  check('Level-Up hat stattgefunden', !!lvl.r, lvl.r && ('Lv' + lvl.r.newLvl));
  check('GENAU EINE Sorte hat sich verändert',
    lvl.veraendert.length === 1 && lvl.veraendert[0] === 'fire', lvl.veraendert.join(','));
  check('und zwar um genau die Kosten',
    lvl.abzug === lvl.brauchte, lvl.abzug + ' von ' + lvl.brauchte);

  const fremd = await page.evaluate(() => {
    const AC = window.ArenaCards;
    // Alle Essenz WEG, dann 999 einer FREMDEN Sorte drauf.
    AC.MATERIAL_KEYS.forEach(k => AC.addMaterial(-9999, k));
    AC.addMaterial(999, 'water');
    const c = AC.canLevelUp('fire', 1e9);
    return { reason: c.reason, have: c.haveMaterial, ok: c.ok, wasser: AC.getMaterials().water };
  });
  check('999 fremde Essenz machen EMBER kein Level-Up möglich',
    fremd.ok === false && fremd.reason === 'material' && fremd.have === 0,
    fremd.reason + ', habe ' + fremd.have + ' (Frost-Vorrat: ' + fremd.wasser + ')');

  /* ================= 5. Shop: Ankündigung == Buchung ================= */
  console.log('\n== 5. Was ein Essenz-Posten ankündigt, bucht er auch ==');
  const shop = await page.evaluate(() => {
    const AC = window.ArenaCards, ziehe = window.__proto.zieheTagesangebote;
    if (typeof ziehe !== 'function') return { fehlt: true };
    const tage = [], sortenGesehen = {};
    for (let t = 0; t < 40; t++) {
      const deals = ziehe(t);
      const ess = deals.filter(d => d.essSorte);
      ess.forEach(d => { sortenGesehen[d.essSorte] = (sortenGesehen[d.essSorte] | 0) + 1; });
      tage.push({
        t: t,
        // Name des Postens muss der Name SEINER Sorte sein
        namenStimmen: ess.every(d => d.name === AC.MATERIAL_BY_KEY[d.essSorte].name),
        // Buchung: geben() muss genau auf diese Sorte laufen
        bucht: ess.map(d => {
          const vor = AC.getMaterials();
          d.geben();
          const nach = AC.getMaterials();
          const diff = AC.MATERIAL_KEYS.filter(k => nach[k] !== vor[k]);
          AC.addMaterial(-(nach[d.essSorte] - vor[d.essSorte]), d.essSorte);
          return diff.length === 1 && diff[0] === d.essSorte &&
                 (nach[d.essSorte] - vor[d.essSorte]) === d.zahl;
        }),
        anzahl: ess.length,
      });
    }
    return { tage: tage, sortenGesehen: sortenGesehen, alleSorten: AC.MATERIAL_KEYS };
  });
  check('zieheTagesangebote ist prüfbar exportiert', !shop.fehlt);
  if (!shop.fehlt) {
    check('jeder Essenz-Posten heisst wie SEINE Sorte',
      shop.tage.every(t => t.namenStimmen));
    check('jeder Essenz-Posten bucht genau seine Sorte in seiner Menge',
      shop.tage.every(t => t.bucht.every(Boolean)),
      shop.tage.filter(t => !t.bucht.every(Boolean)).map(t => 'Tag ' + t.t).join(',') || '—');
    check('über 40 Tage kommt JEDE Sorte mindestens einmal ins Angebot',
      shop.alleSorten.every(k => shop.sortenGesehen[k] > 0),
      shop.alleSorten.map(k => k + ':' + (shop.sortenGesehen[k] | 0)).join(' '));
    check('nicht jeden Tag dieselben Sorten (der Hash rotiert wirklich)',
      new Set(shop.tage.map(t => JSON.stringify(t))).size > 20);
  }

  /* ================= 6. Pass erreicht alle Sorten ================= */
  console.log('\n== 6. Der Pass schüttet ALLE Sorten aus, nicht die ersten drei ==');
  const pass = await page.evaluate(() => {
    const AC = window.ArenaCards, P = window.ArenaPass;
    const gesehen = {}, zeilen = [];
    for (let L = 1; L <= 50; L++) {
      ['free', 'prem'].forEach(tr => {
        const r = P.reward(L, tr);
        if (r && r.kind === 'mat') {
          gesehen[r.key] = (gesehen[r.key] | 0) + 1;
          // Ankündigung == Sorte: das Bild ist das Artwork DIESER Karte,
          // der Untertitel ihr Name.
          zeilen.push({ key: r.key, ico: r.ico, sub: r.sub,
                        stimmt: r.sub === AC.MATERIAL_BY_KEY[r.key].name &&
                                AC.MATERIAL_KEYS.indexOf(r.key) >= 0 });
        }
      });
    }
    return { gesehen: gesehen, alle: AC.MATERIAL_KEYS, zeilen: zeilen };
  });
  check('der Pass erreicht JEDE Sorte',
    pass.alle.every(k => pass.gesehen[k] > 0),
    pass.alle.map(k => k + ':' + (pass.gesehen[k] | 0)).join(' '));
  check('jede Pass-Belohnung nennt den Namen ihrer eigenen Sorte',
    pass.zeilen.length > 10 && pass.zeilen.every(z => z.stimmt),
    pass.zeilen.length + ' Material-Belohnungen');
  check('die Pass-Icons sind Karten-Artwork, nicht das Sammelbild',
    new Set(pass.zeilen.map(z => z.ico)).size >= 8 &&
    pass.zeilen.every(z => z.ico !== 'ess_special'),
    new Set(pass.zeilen.map(z => z.ico)).size + ' verschiedene Icons');

  /* ================= 7. Kein totes Sorten-Bild ================= */
  console.log('\n== 7. Sortenspezifische Stellen benutzen kein Sammelbild ==');
  const bilder = await page.evaluate(() => {
    // Das Sammelbild ess_special steht NUR an Summen-Stellen. Im
    // Essenz-Fach und im Kartendetail muss das Karten-Artwork stehen.
    const q = sel => [...document.querySelectorAll(sel)]
      .map(e => e.tagName === 'IMG' ? (e.getAttribute('src') || '') : e.textContent);
    return {
      fach: q('#essBank .esscell .ico'),
      detailAlt: [...document.querySelectorAll('#dMatSym img')].map(e => e.getAttribute('alt')),
      fachAlt: [...document.querySelectorAll('#essBank img')].map(e => e.getAttribute('alt')),
    };
  });
  check('das Essenz-Fach zeigt acht UNTERSCHIEDLICHE Symbole',
    new Set(bilder.fach.concat(bilder.fachAlt)).size >= 8,
    new Set(bilder.fach.concat(bilder.fachAlt)).size + ' verschiedene');

  check('keine JS-Fehler', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + ok + ' ok, ' + bad + ' fehlgeschlagen\n');
  process.exit(bad ? 1 : 0);
})();
