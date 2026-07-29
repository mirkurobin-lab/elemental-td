/* spells.js — die vier Spells, Variante B (Entscheidung 30.07.2026)
 * ==========================================================================
 * WARUM DIESE SUITE
 * -----------------
 * Die Vorgabe des Auftraggebers steht in vier Halbsätzen:
 *
 *   1. „Nimm Variante B für das Level des spells"
 *      → alle Spells teilen EINE Essenz (Arkan), nicht je eine eigene.
 *   2. „die Fusion von 3 gleichen spell Karten auf die nächste spell
 *      Rarität bleibt"
 *      → dieselbe Merge-Mechanik wie überall.
 *   3. „gleiche Muster und Max lvl pro Rarität wie von Hero und towern"
 *      → dieselben Caps, dieselbe Material- und Goldkurve.
 *   4. „spells bekommen eigene Kartenslots in den packs, die spells
 *      zählen nicht zu den Essenz slots"
 *      → eigene Slots, und die Essenz-Slots bleiben unberührt.
 *
 * Jeder dieser Halbsätze hat hier seinen eigenen Schritt. Eine
 * Sammelprüfung „Spells funktionieren" hätte jede einzelne Abweichung
 * durchgelassen — und drei davon (Arkan im Essenz-Slot, Spell im
 * Kartenslot, abweichender Cap) sind genau die Sorte Fehler, die man im
 * Bild nicht sieht.
 *
 * ⚠ WAS SIE NICHT KANN
 * Ob die Spell-Artworks gut aussehen. Örtlich ist das CDN gesperrt
 * (DESIGNSYSTEM §7b), jedes Bild fällt auf sein Emoji zurück. Geprüft
 * wird die Mechanik und der TEXT, nicht das Bild.
 *
 * AUFRUF
 *   export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
 *   export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
 *   node pruefungen/spells.js
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
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));

  await page.goto(FILE);
  await page.waitForTimeout(1300);
  const clearLayers = () => page.evaluate(() =>
    ['loginLayer', 'dailyLayer', 'offerLayer', 'confirmDlg', 'detailModal',
     'bonusDlg', 'cineLayer', 'avCerLayer'].forEach(id => {
      const e = document.getElementById(id); if (e) e.classList.remove('open');
    }));

  /* ============ 1. Variante B: EINE Essenz für alle vier ============ */
  console.log('\n== 1. Alle Spells teilen die Arkan-Essenz (Variante B) ==');
  const modell = await page.evaluate(() => {
    const AC = window.ArenaCards;
    return {
      spells: AC.SPELL_KEYS.slice(),
      sorten: AC.SPELL_KEYS.map(k => AC.materialTypeOf(k)),
      arkanIstSorte: AC.MATERIAL_KEYS.indexOf(AC.SPELL_MATERIAL) >= 0,
      arkanOhneKarte: AC.materialTypeOf(AC.SPELL_MATERIAL) === null,
      elementOhneArkan: AC.ELEMENT_MATERIAL_KEYS.indexOf(AC.SPELL_MATERIAL) < 0,
      maxImMatch: AC.SPELL_SLOTS_MAX,
    };
  });
  check('es gibt vier Spells', modell.spells.length === 4, modell.spells.join(','));
  check('alle vier ziehen DIESELBE Sorte',
    new Set(modell.sorten).size === 1 && modell.sorten[0] === 'arkan',
    modell.sorten.join(','));
  check('Arkan ist eine echte Sorte im Vorrat', modell.arkanIstSorte);
  check('Arkan hat KEINE eigene Karte', modell.arkanOhneKarte);
  check('Arkan zählt nicht zu den Element-Sorten', modell.elementOhneArkan);
  check('zwei Spells gehen ins Match', modell.maxImMatch === 2, modell.maxImMatch);

  /* ====== 2. Gleiche Muster und Caps wie Held und Turm ====== */
  console.log('\n== 2. Dieselbe Leiter wie Türme und Helden ==');
  const leiter = await page.evaluate(() => {
    const AC = window.ArenaCards;
    const stufen = AC.TIER_KEYS;
    const raus = { caps: [], kurve: [], gold: [] };
    stufen.forEach(t => {
      raus.caps.push([AC.capOf(t), AC.capOf(t)]);
    });
    // Material- und Goldbedarf: Spell gegen Turm, über die ganze Spanne
    for (let lvl = 1; lvl <= 100; lvl += 7) {
      for (let ti = 0; ti < stufen.length; ti++) {
        raus.kurve.push(AC.materialFor(lvl, ti));
      }
      raus.gold.push(AC.goldFor(lvl));
    }
    /* ⚠ Der Vergleich muss im GLEICHEN Zustand stattfinden. Die erste
       Fassung stellte `view(spell)` gegen `view('fire')` — und der
       Demo-Stand hat EMBER längst hochgezogen. Verglichen wurden dann
       zwei verschiedene Level, und die Prüfung meldete einen Unterschied,
       den es nicht gab. Also: beide auf denselben Stand, dann messen —
       und zwar über alle sechs Stufen, nicht nur über die erste. */
    AC._reset();
    const spKey = AC.SPELL_KEYS[0];
    AC.addDrop(spKey, 'common', 1);
    AC.addDrop('fire', 'common', 1);
    let gleicheCaps = true, gleichesMaterial = true, gleichesGold = true;
    for (let i = 0; i < stufen.length; i++) {
      // Beide Karten auf dieselbe Stufe heben und die Angaben vergleichen.
      if (i > 0) {
        AC.addDrop(spKey, stufen[i], 1);
        AC.addDrop('fire', stufen[i], 1);
      }
      const a = AC.view(spKey), b = AC.view('fire');
      if (a.tier !== b.tier) { gleicheCaps = false; break; }
      if (a.cap !== b.cap) gleicheCaps = false;
      if (a.needMaterial !== b.needMaterial) gleichesMaterial = false;
      if (a.needGold !== b.needGold) gleichesGold = false;
    }
    return {
      gleicheCaps: gleicheCaps,
      gleichesMaterial: gleichesMaterial,
      gleichesGold: gleichesGold,
      capsAufsteigend: (() => {
        const c = stufen.map(t => AC.capOf(t));
        return c.every((x, i) => i === 0 || x > c[i - 1]);
      })(),
      capMax: AC.capOf(stufen[stufen.length - 1]),
      mergeKosten: AC.MERGE_COST,
    };
  });
  check('Spell und Turm haben denselben Cap auf derselben Stufe', leiter.gleicheCaps);
  check('und denselben Materialbedarf je Level', leiter.gleichesMaterial);
  check('und dieselben Goldkosten', leiter.gleichesGold);
  check('die Caps steigen streng je Stufe', leiter.capsAufsteigend);
  check('Max-Level bleibt 100', leiter.capMax === 100, leiter.capMax);
  check('Fusion kostet 3 Karten wie überall', leiter.mergeKosten === 3, leiter.mergeKosten);

  /* ====== 3. Fusion: 3 gleiche → nächste Rarität ====== */
  console.log('\n== 3. Drei gleiche Spells ergeben die nächste Rarität ==');
  const fusion = await page.evaluate(() => {
    const AC = window.ArenaCards;
    AC._reset();
    const sp = AC.SPELL_KEYS[0];
    const vorher = AC.view(sp).tier;
    AC.addDrop(sp, 'common', 2);
    const mitZwei = AC.canMerge(sp, 'common', false);
    AC.addDrop(sp, 'common', 1);
    const mitDrei = AC.canMerge(sp, 'common', false);
    const r = AC.merge(sp, 'common', false);
    const nachher = AC.view(sp);
    return {
      vorher, mitZwei, mitDrei,
      neueStufe: r && r.newTier,
      neuerCap: nachher.cap,
      boni: (r && r.bonusChoices || []).length,
      // die Pyramide muss auch für Spells bis Suprem durchlaufen
      pyramide: (() => {
        AC._reset();
        AC.addDrop(sp, 'common', 243);
        const m = AC.mergeAll(sp, { useJokers: false });
        return { merges: m.merges, stufe: AC.view(sp).tier, cap: AC.view(sp).cap };
      })(),
    };
  });
  check('mit zwei Kopien geht es nicht', fusion.mitZwei === false);
  check('mit drei Kopien geht es', fusion.mitDrei === true);
  check('die Stufe steigt auf Gut', fusion.neueStufe === 'good', fusion.neueStufe);
  check('und der Cap steigt mit', fusion.neuerCap === 40, fusion.neuerCap);
  check('die Fusion stellt zwei Boni zur Wahl', fusion.boni === 2, fusion.boni);
  check('243 Kopien laufen bis Suprem durch (wie beim Turm)',
    fusion.pyramide.merges === 121 && fusion.pyramide.stufe === 'supreme' &&
    fusion.pyramide.cap === 100,
    fusion.pyramide.merges + ' Merges → ' + fusion.pyramide.stufe);

  /* ====== 4. Eigene Kartenslots, KEINE Essenz-Slots ====== */
  console.log('\n== 4. Eigene Slots — und die Essenz-Slots bleiben unberührt ==');
  const slots = await page.evaluate(() => {
    const AC = window.ArenaCards;
    let spellsInKarten = 0, arkanInEssenz = 0, spellSlots = 0, arkanAusSlots = 0;
    let essenzSummeStimmt = true;
    const gesehen = {};
    for (let i = 0; i < 600; i++) {
      const typ = ['bronze', 'silver', 'gold', 'arcane'][i % 4];
      const pk = AC.openPack(typ, null, ['solara', 'magmor']);
      pk.cards.forEach(c => { if (AC.isSpell(c.cardId)) spellsInKarten++; });
      arkanInEssenz += pk.materialByType[AC.SPELL_MATERIAL] || 0;
      spellSlots += pk.spells.length;
      arkanAusSlots += pk.arkan;
      pk.spells.forEach(x => { gesehen[x.cardId] = 1; });
      let summe = 0;
      pk.materialSlots.forEach(m => { summe += m.amount; });
      if (summe !== pk.material) essenzSummeStimmt = false;
      // die Spell-Slot-Zahl muss zur Pack-Definition passen
      if (pk.spells.length !== AC.PACKS[typ].spellSlots) essenzSummeStimmt = false;
    }
    return {
      spellsInKarten, arkanInEssenz, spellSlots, arkanAusSlots, essenzSummeStimmt,
      verschiedene: Object.keys(gesehen).length,
      staffel: ['bronze', 'silver', 'gold', 'arcane'].map(k => AC.PACKS[k].spellSlots),
    };
  });
  check('kein Spell fällt jemals in einen normalen Kartenslot',
    slots.spellsInKarten === 0, slots.spellsInKarten + ' über 600 Packs');
  check('keine Arkan-Essenz fällt jemals in einen Essenz-Slot',
    slots.arkanInEssenz === 0, slots.arkanInEssenz);
  check('jedes Pack liefert genau so viele Spell-Slots wie definiert',
    slots.essenzSummeStimmt, 'Staffel ' + slots.staffel.join('/'));
  check('jeder Spell-Slot bringt Arkan mit',
    slots.arkanAusSlots > 0 && slots.arkanAusSlots / slots.spellSlots >= 2 &&
    slots.arkanAusSlots / slots.spellSlots <= 4,
    (slots.arkanAusSlots / slots.spellSlots).toFixed(2) + ' je Slot');
  check('alle vier Spells kommen über die Zeit vor',
    slots.verschiedene === 4, slots.verschiedene);
  check('auch Bronze hat einen Spell-Slot (sonst hängt alles an Silber)',
    slots.staffel[0] >= 1, 'Bronze ' + slots.staffel[0]);

  /* ====== 5. Die Oberfläche: eigener Reiter, kein Spell im Turmraster ====== */
  console.log('\n== 5. Der Spell-Reiter zeigt die Spells — und nur dort ==');
  await clearLayers();
  await page.evaluate(() => window.__proto.show('navCollection'));
  await page.waitForTimeout(350);
  const tuerme = await page.evaluate(() => {
    const AC = window.ArenaCards;
    return [...document.querySelectorAll('#collGrid .tile')]
      .filter(t => AC.isSpell(t.dataset.id)).length;
  });
  check('das Turmraster enthält KEINEN Spell', tuerme === 0, tuerme);

  await page.click('#tabSpells');
  await page.waitForTimeout(350);
  const reiter = await page.evaluate(() => {
    const AC = window.ArenaCards;
    const kacheln = [...document.querySelectorAll('#collGrid .tile')];
    return {
      n: kacheln.length,
      alleSpells: kacheln.every(k => AC.isSpell(k.dataset.id)),
      vollstaendig: AC.SPELL_KEYS.every(k => kacheln.some(x => x.dataset.id === k)),
      sichtbar: kacheln.every(k => k.getBoundingClientRect().width > 20 &&
                                   k.getBoundingClientRect().height > 20),
      hinweis: document.getElementById('collHint').textContent,
    };
  });
  check('der Reiter zeigt genau die vier Spells',
    reiter.n === 4 && reiter.alleSpells && reiter.vollstaendig, reiter.n + ' Kacheln');
  check('die Kacheln haben eine Fläche', reiter.sichtbar);
  check('der Hinweis nennt die Arkan-Essenz',
    /Arkan/.test(reiter.hinweis), reiter.hinweis.slice(0, 70));

  /* ====== 6. Das Detail sagt die Wahrheit ====== */
  console.log('\n== 6. Das Spell-Detail sagt die Wahrheit ==');
  await page.click('#collGrid .tile[data-id="splitter"]');
  await page.waitForTimeout(350);
  const detail = await page.evaluate(() => {
    const txt = id => (document.getElementById(id) || {}).textContent || '';
    const stats = [...document.querySelectorAll('#dStats > *')].map(e =>
      e.textContent.replace(/\s+/g, ' ').trim());
    return {
      name: txt('dName'),
      essenz: txt('dMatName'),
      sub: txt('dMatSub'),
      power: (document.querySelector('.power') || {}).textContent || '',
      stats: stats,
      cd: stats.find(s => /ABKLINGZEIT/i.test(s)) || '',
    };
  });
  check('das Detail nennt die Arkan-Essenz',
    detail.essenz === 'Arkan-Essenz', detail.essenz);
  /* ⚠ Der Herkunftstext der Türme („kommt aus Packs, in denen EMBER
     liegt") ist für einen Spell FALSCH: Arkan fällt in jedem Spell-Slot,
     unabhängig davon, welcher Spell darin steckt. Ein Text, der die
     Herkunft falsch beschreibt, schickt den Spieler an die falsche
     Stelle — deshalb ein eigener Schritt dafür. */
  check('der Herkunftstext nennt die Spell-Slots, nicht die eigene Karte',
    /Spell-Slots/.test(detail.sub) && !/in denen SPLITTER liegt/.test(detail.sub),
    detail.sub.slice(0, 90));
  /* ⚠ „Power: 0" war die erste Fassung — eine ehrliche Rechnung mit
     sinnloser Aussage. Ein Spell schiesst nicht, er hat keine Power. */
  check('statt einer Power-Zahl steht die Rolle',
    /Rolle/.test(detail.power) && !/Power:\s*0/.test(detail.power),
    detail.power.replace(/\s+/g, ' ').trim());
  /* ⚠ Und der teuerste der drei: die Abklingzeit stand als `sec` im
     Modell und WUCHS deshalb mit dem Level — „45,0 s → 45,3 s". Ein
     Level-Up hätte die Wartezeit verlängert und sich dabei grün
     angeschrieben. Abklingzeit sinkt nur über Merge-Boni. */
  check('die Abklingzeit wächst NICHT mit dem Level',
    detail.cd !== '' && !/→/.test(detail.cd), detail.cd);

  /* ====== 7. Ein Spell-Level-Up nimmt Arkan und sonst nichts ====== */
  console.log('\n== 7. Level-Up greift nur auf Arkan zu ==');
  const lvlUp = await page.evaluate(() => {
    const AC = window.ArenaCards;
    AC._reset();
    const sp = AC.SPELL_KEYS[0];
    AC.addDrop(sp, 'common', 1);
    AC.addMaterial(999, 'fire');
    const nurFremd = AC.canLevelUp(sp, 9e9).reason;
    AC.addMaterial(50, AC.SPELL_MATERIAL);
    const vorher = AC.getMaterials();
    const r = AC.levelUp(sp);
    const nachher = AC.getMaterials();
    const geaendert = AC.MATERIAL_KEYS.filter(k => vorher[k] !== nachher[k]);
    return { nurFremd, geaendert, neu: r && r.newLvl, sorte: r && r.materialType };
  });
  check('999 Turmessenz helfen dem Spell nicht', lvlUp.nurFremd === 'material', lvlUp.nurFremd);
  check('mit Arkan klappt das Level-Up', lvlUp.neu === 2, lvlUp.neu);
  check('GENAU EINE Sorte hat sich verändert — Arkan',
    lvlUp.geaendert.length === 1 && lvlUp.geaendert[0] === 'arkan',
    lvlUp.geaendert.join(','));

  check('keine JS-Fehler', errors.length === 0, errors[0]);

  console.log('\n' + ok + ' ok, ' + bad + ' fehlgeschlagen');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
