/* ==================================================================
 * UI-REGRESSION — FREUNDESLISTE (Stil run_v7.js)
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_friends.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

/* ⚠ AM EIGENEN ORT MESSEN (30.07.2026) — derselbe Konstruktionsfehler,
   den run_v6.js schon behoben hat, stand hier noch: ein FESTER Pfad auf
   /home/user/elemental-td/... Laeuft die Suite aus einem git-worktree,
   prueft sie damit die HAUPT-Auscheckung statt der Datei, die daneben
   liegt — ein gruener Lauf sagt dann nichts ueber die eigene Aenderung
   aus. GEMESSEN an genau diesem Tag: die Suite blieb gruen, waehrend die
   geaenderte Datei einen Schritt rot gemacht haette (Menge > 1 ging
   durch, weil das alte Modul geladen war).
   Der Standard haengt jetzt an DIESER Datei; FRHTML bleibt der Ausweg
   fuer den seltenen Fall, dass man bewusst einen fremden Baum misst. */
const FILE = 'file://' + (process.env.FRHTML
  ? path.resolve(process.env.FRHTML)
  : path.resolve(__dirname, '..', 'ui_prototype.html'));
const SHOTS = process.env.FRSHOTS || '/tmp/ui_shots_friends';
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const imgFails = [];
const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
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
    if (/ERR_|net::|Failed to load resource|cloudfront|\.png|\.mp4|\.webm|\.mp3/i.test(t)) { imgFails.push(t); return; }
    errors.push('console.error: ' + t);
  });
  page.on('requestfailed', r => imgFails.push('req: ' + r.url().slice(-40)));

  const clearLayers = () => page.evaluate(() => {
    ['loginLayer', 'dailyLayer', 'offerLayer', 'confirmDlg', 'reqDlg', 'detailModal',
     'bonusDlg', 'mergeCeremony', 'roadLayer', 'cineLayer', 'avCerLayer', 'mmLayer',
     'tbMenuLayer'].forEach(id => {
      const e = document.getElementById(id);
      if (!e) return;
      e.classList.remove('open');
      if (id === 'tbMenuLayer') e.hidden = true;
    });
    window.scrollTo(0, 0);
  });
  const shot = async (name) => {
    await page.waitForTimeout(260);
    await page.evaluate(() => { if (window.UIIcon && window.UIIcon.sweep) window.UIIcon.sweep(); });
    await page.waitForTimeout(160);
    await page.screenshot({ path: SHOTS + '/' + name + '.png', fullPage: true });
  };
  const lum = (el) => {
    const cs = getComputedStyle(el);
    const m = /rgba?\((\d+), (\d+), (\d+)/.exec(cs.webkitTextFillColor || cs.color);
    return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
  };

  await page.goto(FILE);
  await page.waitForTimeout(1100);
  await clearLayers();

  // ================= 1. Der Knopf in der Topbar =================
  const geo = await page.evaluate(() => {
    const f = document.getElementById('tbFriends').getBoundingClientRect();
    const m = document.getElementById('tbMenu').getBoundingClientRect();
    return { fx: f.x, fr: f.right, fw: f.width, fh: f.height,
             mx: m.x, mw: m.width, mh: m.height };
  });
  step('Der Freundes-Knopf sitzt LINKS neben dem Menue-Knopf',
    geo.fr <= geo.mx + 1, Math.round(geo.fr) + ' ≤ ' + Math.round(geo.mx));
  step('Beide Platten sind gleich gross',
    Math.abs(geo.fw - geo.mw) < 0.5 && Math.abs(geo.fh - geo.mh) < 0.5,
    geo.fw + '×' + geo.fh + ' gegen ' + geo.mw + '×' + geo.mh);
  const mat = await page.evaluate(() => ({
    f: getComputedStyle(document.getElementById('tbFriends')).boxShadow,
    m: getComputedStyle(document.getElementById('tbMenu')).boxShadow,
  }));
  step('Beide Platten tragen dasselbe Material', mat.f === mat.m,
    mat.f === mat.m ? 'identisch' : mat.f.slice(0, 40));
  const icoBox = await page.evaluate(() => {
    const i = document.querySelector('#tbFriends .ico');
    if (!i) return null;
    const r = i.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), tag: i.tagName,
             txt: (i.textContent || '').trim() };
  });
  step('Das Personen-Icon liest bei seiner Anzeigegroesse (20-px-Regel)',
    !!icoBox && icoBox.w >= 16 && icoBox.h >= 16,
    icoBox ? icoBox.w + '×' + icoBox.h + ' ' + icoBox.tag + ' „' + icoBox.txt + '"' : 'fehlt');

  // ================= 2. Badge =================
  const badge = await page.evaluate(() => {
    const b = document.getElementById('badgeFriends');
    return { n: window.ArenaFriends.pendingCount(), txt: b.textContent.trim(),
             shown: getComputedStyle(b).display !== 'none' };
  });
  step('Das Badge nennt genau die Zahl der offenen Anfragen',
    badge.shown && String(badge.n) === badge.txt, badge.n + ' / „' + badge.txt + '"');

  // ================= 3. Die View oeffnet =================
  await page.click('#tbFriends');
  await page.waitForTimeout(420);
  step('Der Knopf oeffnet die Freundes-View',
    await page.locator('#viewFriends').evaluate(e => e.classList.contains('active')));
  const listState = await page.evaluate(() => {
    const rows = document.querySelectorAll('#frPaneList .frrow');
    return { rows: rows.length, api: window.ArenaFriends.list().length,
             dots: document.querySelectorAll('#frPaneList .frdot').length,
             tro: document.querySelectorAll('#frPaneList .frtr').length,
             duel: document.querySelectorAll('#frPaneList [data-duel]').length,
             code: (document.querySelector('#frHead .frcval') || {}).textContent };
  });
  step('Jeder Freund aus der Logik steht als Zeile in der Liste',
    listState.rows === listState.api && listState.rows > 0,
    listState.rows + ' Zeilen / ' + listState.api + ' laut API');
  step('Jede Zeile traegt Online-Punkt, Trophaeen und Duell-Knopf',
    listState.dots === listState.rows && listState.tro === listState.rows &&
    listState.duel === listState.rows,
    listState.dots + '/' + listState.tro + '/' + listState.duel);
  step('Der eigene Freundescode steht im Kopf der View',
    /^APT-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test((listState.code || '').trim()), listState.code);
  await shot('friends_liste');

  // ================= 4. Material und Farbe =================
  const depth = await page.evaluate(() => {
    const sel = ['.frhead', '.frrow', '.fravatar', '.frcode', '.frduel', '.frgift'];
    const out = {};
    sel.forEach(s => {
      const e = document.querySelector('#viewFriends ' + s);
      out[s] = e ? getComputedStyle(e).boxShadow : 'fehlt';
    });
    return out;
  });
  step('Keine Flaeche der Freundes-View steht ohne Tiefe da',
    Object.keys(depth).every(k => depth[k] !== 'none' && depth[k] !== 'fehlt'),
    Object.keys(depth).filter(k => depth[k] === 'none' || depth[k] === 'fehlt').join(',') || 'alle mit Material');
  const hell = await page.evaluate(() => {
    const bright = [];
    document.querySelectorAll('#viewFriends button, #viewFriends .frtag').forEach(el => {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundImage + ' ' + cs.backgroundColor;
      const m = /rgba?\((\d+), (\d+), (\d+)/.exec(cs.webkitTextFillColor || cs.color);
      const tl = m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
      // helle Flaeche = gruener/goldener Verlauf
      const light = /#?rgb\(88, 250, 27\)|rgb\(88, 250, 27\)|rgb\(242, 197, 61\)/.test(bg);
      if (light && tl > 120) bright.push(el.className + ' L=' + Math.round(tl));
    });
    return bright;
  });
  step('Keine helle Schrift auf heller Flaeche in der Freundes-View',
    hell.length === 0, hell.join(' | ') || 'keine');
  const codePlate = await page.evaluate(() => {
    const e = document.querySelector('#frHead .frcode');
    const cs = getComputedStyle(e);
    const m = /rgba?\((\d+), (\d+), (\d+)/.exec(cs.backgroundColor);
    return { l: m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255,
             inset: /inset/.test(cs.boxShadow), img: cs.backgroundImage };
  });
  step('Der Freundescode sitzt auf einem eigenen dunklen, eingesenkten Plaettchen',
    codePlate.l < 40 && codePlate.inset && codePlate.img === 'none',
    'L=' + Math.round(codePlate.l) + ' inset=' + codePlate.inset);

  // ================= 5. Duell kostet nichts =================
  const duel = await page.evaluate(() => {
    const FR = window.ArenaFriends;
    const id = FR.list()[0].id;
    let quest = 0;
    const DY = window.ArenaDaily, CL = window.ArenaClan;
    const oDY = DY && DY.reportEvent, oCL = CL && CL.reportEvent;
    if (DY) DY.reportEvent = () => { quest++; };
    if (CL) CL.reportEvent = () => { quest++; };
    const before = window.ArenaProfile ? window.ArenaProfile.get().trophies : 0;
    const lo = FR.startDuel(id);
    const r = FR.resolveDuel(id, { win: true });
    if (DY) DY.reportEvent = oDY;
    if (CL) CL.reportEvent = oCL;
    const after = window.ArenaProfile ? window.ArenaProfile.get().trophies : 0;
    return { before, after, stake: lo.stake.trophies, got: r.trophies, gold: r.gold, quest,
             rec: r.recordText };
  });
  step('Ein Freundes-Duell verschiebt keine einzige Trophaee',
    duel.before === duel.after && duel.stake === 0 && duel.got === 0,
    duel.before + ' → ' + duel.after);
  step('Ein Freundes-Duell meldet kein Quest-Ereignis und kein Gold',
    duel.quest === 0 && duel.gold === 0, duel.quest + ' Meldungen');

  // ================= 6. Spende laeuft ueber den Clan =================
  const gift = await page.evaluate(() => {
    const FR = window.ArenaFriends, CL = window.ArenaClan;
    const extern = FR.list().filter(f => !f.clanMate)[0];
    let msg = '';
    try { FR.giftCards(extern.id, 1); } catch (e) { msg = e.message; }
    // Ein Clan-Mitglied MIT offener Anfrage gezielt zum Freund machen.
    const req = CL.requests().filter(r => !r.mine && !r.closed)[0];
    let have = FR.list().filter(f => f.memberId === req.ownerId)[0];
    if (!have) have = FR.addFromClan(req.ownerId).friend;
    window.ArenaCards.addDrop(req.cardId, 'common', 3);
    /* UMGESCHRIEBEN 30.07.2026: `sendQuota()` braucht seit der neuen
       Vorgabe die Anfrage-ID — das Kontingent gilt je Anfrage, nicht mehr
       global. Die Zusage dieses Schritts ist unveraendert: eine
       Freundesspende laeuft durch ArenaClan und wird DORT abgerechnet,
       es gibt keinen zweiten Kanal. */
    /* ⚠ DIE PRUEFUNG LAS DIE FALSCHE ANFRAGE (behoben 31.07.2026).
       Sie nahm `filter(...)[0]` und pruefte dann das Kontingent GENAU
       dieser Anfrage — waehrend giftCards() sich seine eigene suchte.
       Hat ein Kamerad mehr als eine offene Anfrage (im Demo-Stand hat
       `b2` zwei), sind das zwei verschiedene, und der Schritt war rot,
       obwohl das Kontingent sauber gebucht wurde.
       Gemessen wird jetzt die Anfrage, die die Spende WIRKLICH benutzt
       hat — sie steht im Ergebnis (`g.request.id`). Eine Pruefung, die
       raet, welchen Weg der Code nimmt, misst ihre eigene Annahme. */
    const alleIds = CL.requests().filter(r => !r.mine && !r.closed)
      .filter(r => r.ownerId === req.ownerId).map(r => r.id);
    const vorher = {}; alleIds.forEach(id => { vorher[id] = CL.sendQuota(id).used; });
    const g = FR.giftCards(have.id, 1);
    const benutzt = (g.request && g.request.id) || req.id;
    const used0 = vorher[benutzt] !== undefined ? vorher[benutzt] : 0;
    let zuViel = null;
    try { FR.giftCards(have.id, 5); } catch (e) { zuViel = e.message; }
    return { msg, used0, benutzt, offene: alleIds.length,
             used1: CL.sendQuota(benutzt).used, via: g.via, paid: g.reward.gold,
             menge: g.count, zuViel, max: g.quota.max,
             name: g.friendName, card: g.cardName };
  });
  step('Eine Spende an einen Nicht-Clan-Freund wird mit Begruendung abgelehnt',
    /Clan/.test(gift.msg), gift.msg.slice(0, 70));
  step('Die Spende an einen Clankameraden verbraucht das Kontingent DIESER Anfrage',
    gift.used1 === gift.used0 + 1 && gift.menge === 1 &&
    gift.via === 'ArenaClan.donateCards',
    gift.card + ' an ' + gift.name + ' · Anfrage ' + gift.benutzt +
    ' (von ' + gift.offene + ' offenen) · Kontingent ' + gift.used0 + ' → ' +
    gift.used1 + '/' + gift.max);
  /* GEGENPROBE: auch ueber die Freundesliste geht nur EINE Karte je
     Sendevorgang — sonst waere sie der Umweg um „nicht direkt 10". */
  step('Auch als Freundesspende geht keine Menge > 1 durch',
    /je Sendevorgang/.test(gift.zuViel || ''), gift.zuViel);

  // ================= 7. Anfragen und Suche =================
  await page.click('#frTabReq');
  await page.waitForTimeout(220);
  const req0 = await page.evaluate(() => ({
    rows: document.querySelectorAll('#frPaneReq .frrow.req').length,
    badge: document.getElementById('badgeFriends').textContent.trim(),
  }));
  step('Der Reiter „Anfragen" zeigt jede eingehende Anfrage als Zeile',
    req0.rows > 0 && req0.badge === String(req0.rows), req0.rows + ' / Badge ' + req0.badge);
  await shot('friends_anfragen');
  await page.click('#frPaneReq [data-decline]');
  await page.waitForTimeout(320);
  const req1 = await page.evaluate(() => ({
    rows: document.querySelectorAll('#frPaneReq .frrow.req').length,
    badge: document.getElementById('badgeFriends').textContent.trim(),
    shown: getComputedStyle(document.getElementById('badgeFriends')).display !== 'none',
  }));
  step('Ablehnen entfernt die Anfrage und senkt das Badge',
    req1.rows === req0.rows - 1 && (req1.rows === 0 ? !req1.shown : req1.badge === String(req1.rows)),
    req0.rows + ' → ' + req1.rows);
  await page.click('#frTabReq');
  await page.click('#frPaneReq [data-accept]');
  await page.waitForTimeout(320);
  const acc = await page.evaluate(() => ({
    friends: window.ArenaFriends.list().length,
    rows: document.querySelectorAll('#frPaneList .frrow').length,
    pending: window.ArenaFriends.pendingCount(),
  }));
  step('Annehmen macht den Anfragenden zum Freund in der Liste',
    acc.rows === acc.friends && acc.pending === 0, acc.friends + ' Freunde');

  await page.click('#frTabSearch');
  await page.waitForTimeout(200);
  const code = await page.evaluate(() => window.ArenaFriends.codeOf('demo_gorm'));
  await page.fill('#frQuery', code);
  await page.click('#frGo');
  await page.waitForTimeout(320);
  const s1 = await page.evaluate(() => ({
    hits: document.querySelectorAll('#frPaneSearch .frrow').length,
    add: document.querySelectorAll('#frPaneSearch [data-add]').length,
  }));
  step('Die Suche ueber den Freundescode trifft genau einen Spieler',
    s1.hits === 1 && s1.add === 1, s1.hits + ' Treffer');
  await page.fill('#frQuery', 'go');
  await page.click('#frGo');
  await page.waitForTimeout(320);
  const s2 = await page.evaluate(() => document.getElementById('toast').textContent);
  step('Eine zu kurze Suche erklaert im Toast, was fehlt',
    /Mindestens 3 Zeichen/.test(s2), s2.slice(0, 60));
  await page.fill('#frQuery', 'ste');
  await page.click('#frGo');
  await page.waitForTimeout(320);
  const s3 = await page.evaluate(() => ({
    hits: document.querySelectorAll('#frPaneSearch .frrow').length,
    add: document.querySelectorAll('#frPaneSearch [data-add]').length,
    state: Array.prototype.map.call(document.querySelectorAll('#frPaneSearch .frstate'),
                                    e => e.textContent).join(','),
  }));
  step('Die Namenssuche findet beide Treffer und bietet bei Freunden KEIN Hinzufuegen an',
    s3.hits === 2 && s3.add === 0 && s3.state === 'Freund,Freund',
    s3.hits + ' Treffer / ' + s3.add + ' Knöpfe / ' + s3.state);
  await page.fill('#frQuery', 'Gorm');
  await page.click('#frGo');
  await page.waitForTimeout(320);
  await page.click('#frPaneSearch [data-add]');
  await page.waitForTimeout(360);
  const s4 = await page.evaluate(() => ({
    out: window.ArenaFriends.requestsOut().length,
    toast: document.getElementById('toast').textContent,
  }));
  step('„Hinzufuegen" legt eine gesendete Anfrage an', s4.out >= 1, s4.toast.slice(0, 60));
  await shot('friends_suche');

  // ================= 8. Zurueck und Fehlerfreiheit =================
  await page.click('#frTabList');
  await page.click('#frBack');
  await page.waitForTimeout(320);
  step('Zurueck fuehrt auf den Startbildschirm',
    await page.locator('#viewHome').evaluate(e => e.classList.contains('active')));
  step('Kein echter JS-Fehler im ganzen Durchgang', errors.length === 0,
    errors.slice(0, 3).join(' | ') || (imgFails.length + ' Bildfehler erwartet'));

  const bad = steps.filter(s => !s.ok);
  console.log('\n' + steps.length + ' Checks · ' + (steps.length - bad.length) + ' ok · ' +
    bad.length + ' FAIL');
  if (bad.length) bad.forEach(b => console.log('  FAIL ' + b.name));
  console.log('Galerie: ' + SHOTS);
  await browser.close();
  process.exitCode = bad.length ? 1 : 0;
})();
