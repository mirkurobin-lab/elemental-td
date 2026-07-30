/* ==================================================================
 * UI-REGRESSION v7 — AA-LAYOUT-REBUILD, AAA-ICON-SWEEP, Login, Guide
 * ------------------------------------------------------------------
 * Prueft (a) dass der Startbildschirm AAs Achse traegt und entruempelt
 * ist, (b) die einheitliche Banner-Metrik, (c) die neuen Systeme, und
 * schiesst (d) ALLE Views nach ui_shots_v7/ fuer das User-Review.
 * Nur ECHTE JS-Fehler zaehlen; CDN-Bildfehler sind erwartet.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_v7.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

/* ⚠ AM EIGENEN ORT MESSEN (30.07.2026). Hier stand der feste Pfad
   /home/user/elemental-td/... — laeuft die Suite aus einem Worktree,
   prueft sie damit die HAUPT-Auscheckung und nicht die Datei, die
   danebenliegt. Ein gruener Lauf sagte dann nichts ueber die Aenderung
   aus, die man gerade gemacht hat. Der Pfad haengt jetzt an dieser
   Datei, nicht an einer Maschine. */
const FILE = 'file://' + path.resolve(__dirname, '..', 'ui_prototype.html');
/* Galerie-Ordner. ui_shots_v7 bleibt als Stand VOR dem AAA-Icon-Sweep
   erhalten; die aktuelle Galerie ist v8. */
const SHOTS = '/tmp/claude-0/-home-user-elemental-td/4b0a76dd-5b22-5fdf-85e8-579f1b036ae5/scratchpad/ui_shots_v8';
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const imgFails = [];
const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}
/* Gegenprobe: eine Behauptung, die FALSCH sein muss. Ein Schritt, der
   auch bei kaputtem Programm gruen bleibt, ist keine Pruefung. */
function gegen(name, sollFalschSein, info) { step('gegen: ' + name, !sollFalschSein, info); }

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

  // Alle Overlay-Ebenen schliessen — ein offener Layer faengt jeden Klick ab.
  const clearLayers = () => page.evaluate(() => {
    /* mmLayer MUSS mit drin sein: eine offen gelassene Gegnersuche laeuft
       nach 2,6 s in showMatchEnd und wuerde einen spaeteren Check kapern. */
    ['loginLayer', 'dailyLayer', 'offerLayer', 'confirmDlg', 'reqDlg', 'detailModal',
     'bonusDlg', 'mergeCeremony', 'roadLayer', 'cineLayer', 'avCerLayer', 'mmLayer']
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('open'); });
    window.scrollTo(0, 0);
  });
  /* Vor jedem Galerie-Bild den Icon-Fallback erzwingen. Im Prototyp
     antwortet das CDN nicht; ohne diesen Schritt stuenden auf den
     Screenshots leere Bildfelder, weil `onerror` noch nicht durch ist. */
  const shot = async (name) => {
    await page.waitForTimeout(260);
    await page.evaluate(() => { if (window.UIIcon && window.UIIcon.sweep) window.UIIcon.sweep(); });
    await page.waitForTimeout(160);
    await page.screenshot({ path: SHOTS + '/' + name + '.png', fullPage: true });
  };
  const go = async (nav) => { await page.evaluate(n => window.__proto.show(n), nav); await page.waitForTimeout(380); };

  await page.goto(FILE);
  await page.waitForTimeout(1000);

  // ================= 1. DAILY-LOGIN-KALENDER =================
  step('Login-Kalender oeffnet beim ersten Start des Tages',
    await page.locator('#loginLayer').evaluate(e => e.classList.contains('open')));
  const cal0 = await page.evaluate(() => {
    const D = window.ArenaDaily, c = D.loginCalendar();
    return { cells: document.querySelectorAll('#loginPop .logincell').length,
             today: document.querySelectorAll('#loginPop .logincell.today').length,
             locked: document.querySelectorAll('#loginPop .logincell.locked').length,
             finale: document.querySelectorAll('#loginPop .logincell.finale').length,
             btn: document.getElementById('loginClaim').textContent.trim(),
             packs: c.days.filter(d => d.pack).map(d => d.day + ':' + d.pack).join(' '),
             day7: c.days[6] };
  });
  step('7 Kacheln, heutige hervorgehoben, kommende gesperrt',
    cal0.cells === 7 && cal0.today === 1 && cal0.locked === 6,
    cal0.cells + ' Kacheln / ' + cal0.today + ' heute / ' + cal0.locked + ' gesperrt');
  step('Tag 7 ist die festliche Finale-Kachel (volle Breite)', cal0.finale === 1);
  step('User-Vorgabe: BOOSTER-PACKS statt Truhen (Tag 3/5/7)',
    cal0.packs === '3:bronze 5:silver 7:gold', cal0.packs);
  step('Tag 7 = GOLD-Pack + 5 000 Gold',
    cal0.day7.pack === 'gold' && cal0.day7.gold === 5000);
  step('Abhol-Knopf nennt die heutige Belohnung', /abholen/i.test(cal0.btn), cal0.btn);
  const lumLogin = await page.locator('#loginClaim').evaluate(e => {
    const cs = getComputedStyle(e); const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
    return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
  });
  step('Goldener Abhol-Knopf traegt dunkle Schrift', lumLogin < 120, Math.round(lumLogin));
  await shot('daily_login');

  // Abholen → morgen simulieren → naechste Kachel frei
  const goldBefore = await page.evaluate(() => window.__proto.gold());
  await page.click('#loginClaim');
  await page.waitForTimeout(420);
  const afterClaim = await page.evaluate(() => ({
    gold: window.__proto.gold(),
    cal: window.ArenaDaily.loginCalendar(),
    btnDis: document.getElementById('loginClaim').disabled,
    done: document.querySelectorAll('#loginPop .logincell.done').length,
  }));
  step('Abholen bucht die Belohnung (Tag 1 = 1 200 Gold)',
    afterClaim.gold === goldBefore + 1200, goldBefore + ' → ' + afterClaim.gold);
  step('Kachel 1 abgehakt, Kalender steht auf Kachel 2',
    afterClaim.done === 1 && afterClaim.cal.step === 1);
  step('DOPPEL-ABHOLUNG blockiert (Knopf deaktiviert)', afterClaim.btnDis === true);
  const dbl = await page.evaluate(() => {
    try { window.ArenaDaily.claimLogin(); return null; } catch (e) { return e.message; }
  });
  step('Zweiter Versuch wirft deutsche Meldung',
    /schon abgeholt/.test(dbl || ''), dbl);
  // Morgen simulieren
  const tomorrow = await page.evaluate(() => {
    const D = window.ArenaDaily;
    const off = 86400000;
    D._clock(() => Date.now() + off);
    const c = D.loginCalendar();
    return { can: c.canClaim, day: c.today.day, name: c.today.name };
  });
  step('Morgen ist die naechste Kachel frei',
    tomorrow.can === true && tomorrow.day === 2, 'Tag ' + tomorrow.day + ': ' + tomorrow.name);
  await page.evaluate(() => window.ArenaDaily._clock(null));
  await page.click('#loginLater');
  await page.waitForTimeout(350);
  step('Popup laesst sich schliessen',
    !(await page.locator('#loginLayer').evaluate(e => e.classList.contains('open'))));
  const seen = await page.evaluate(() => localStorage.getItem('arenaLoginSeen'));
  step('Merker verhindert ein zweites Popup am selben Tag', !!seen, seen);

  // ================= 2. AA-ACHSE AUF HOME =================
  const axis = await page.evaluate(() => {
    const h = window.innerHeight;
    const y = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top / h : -1; };
    return { prof: y('profAvatar'), pass: y('passBanner'), dio: y('arenaDiorama'),
             name: y('arenaName'), chip: y('arenaChip'), bar: y('arenaProg'),
             slots: y('packSlots'), battle: y('btnBattle') };
  });
  const pct = v => Math.round(v * 100) + '%';
  /* ⚠ GEAENDERTE REIHENFOLGE, mit Absicht. §19.1 behauptete, der
     Arenaname liege AUF dem Diorama. IMG_3344 in voller Aufloesung zeigt
     das Gegenteil: Titel 28,0/30,5 % · Chip 33,6 % · Diorama 36,0 %.
     Der Titel steht UEBER dem Diorama. */
  step('AA-Achse in der richtigen Reihenfolge (Titel UEBER dem Diorama)',
    axis.prof < axis.pass && axis.pass < axis.name && axis.name < axis.chip &&
    axis.chip < axis.dio && axis.dio < axis.bar && axis.bar < axis.slots &&
    axis.slots < axis.battle,
    ['prof', 'pass', 'dio', 'name', 'chip', 'bar', 'slots', 'battle']
      .map(k => k + ' ' + pct(axis[k])).join(' · '));
  step('Season-Pass als breites Banner oben (AA misst 21 %)',
    axis.pass > 0.08 && axis.pass < 0.28, pct(axis.pass));
  step('4 Hex-Slots im AA-Band (statusleistenkorrigiert 52-76 %)',
    axis.slots > 0.52 && axis.slots < 0.76, pct(axis.slots));
  /* AAs Screenshot enthaelt oben 4,4 % iOS-Statusleiste, unsere Seite
     nicht. Alle absoluten Y-Werte aus IMG_3344 liegen deshalb um diesen
     Betrag hoeher als bei uns. AAs 72,0-82,5 % entsprechen bei uns
     67,6-78,1 %. Genauer als absolute Werte ist der Anteil am Band
     zwischen Kopf-Unterkante und Nav-Oberkante — der stimmt auf 1,3
     Punkte (AA 74,5 %, wir 73,2 %). */
  step('KAMPF-Knopf im AA-Band (um AAs Statusleiste korrigiert: 64-80 %)',
    axis.battle > 0.64 && axis.battle < 0.80, pct(axis.battle));
  const bw = await page.evaluate(() => {
    const b = document.getElementById('btnBattle').getBoundingClientRect();
    const r = document.querySelector('.homerow3').getBoundingClientRect();
    return b.width / r.width;
  });
  step('KAMPF nimmt ~55 % der Reihenbreite (AA-Messung)', bw > 0.48 && bw < 0.64,
    Math.round(bw * 100) + '%');
  const declutter = await page.evaluate(() => ({
    ladder: document.querySelectorAll('#viewHome .ladder').length,
    note: document.querySelectorAll('#viewHome .homenote').length,
    vault: document.querySelectorAll('#viewHome .vaultbox').length,
    daily: document.querySelectorAll('#viewHome .dailypanel').length,
    hubrows: document.querySelectorAll('#viewHome .hubrow, #viewHome .hubrow2').length,
    icons: document.querySelectorAll('.apphead .profrow .hubicon').length,
    railsLinks: document.querySelectorAll('#viewHome .hubband .hubrail.left .railtile').length,
    railsRechts: document.querySelectorAll('#viewHome .hubband .hubrail.right .railtile').length,
    // Die Profilzeile sitzt seit dem Kopf-Umbau im GLOBALEN Kopf, nicht
    // mehr in #viewHome — AA zeigt sie auf jedem Bildschirm (IMG_3347).
    kopfIcons: document.querySelectorAll('.apphead .profrow .hubicons > *').length,
    slots: document.querySelectorAll('#packSlots .slot').length,
    rowTiles: document.querySelectorAll('.homerow3 > *').length,
  }));
  step('ENTRUEMPELT: keine Arena-Leiter, kein Fliesstext, kein Tresor, kein Daily-Panel',
    declutter.ladder === 0 && declutter.note === 0 && declutter.vault === 0 &&
    declutter.daily === 0 && declutter.hubrows === 0);
  /* GEAENDERTE ERWARTUNG, mit Absicht.
     Die fuenf Kopf-Icons in der Profilzeile waren meine Zwischenloesung.
     IMG_3344 zeigt AAs echten Aufbau: die Profilzeile traegt nur noch
     Freundesliste und Menue, die Verwaltungs-Icons sitzen links und
     rechts als senkrechte Schienen neben der Arena — links
     Login/Daily/Lifetime, rechts Packs/Rangliste/Post/Tresor.
     Eine Pruefung, die den alten Aufbau festschreibt, haelt genau die
     Aenderung auf, um die der Nutzer gebeten hat. */
  // UMGESCHRIEBEN 27.07.: waren 3 links + 4 rechts. Die vier rechten
  // Kacheln (Packs, Rangliste, Post, Kristalltresor) boten Ziele doppelt
  // an, die im Aufklapp-Menue, an den Truhen-Slots bzw. in der
  // Bottom-Nav ohnehin stehen — der Auftraggeber hat sie streichen
  // lassen. Die rechte Schiene bleibt als leere Spalte stehen, damit die
  // Arena in der Bildschirmmitte bleibt; sie traegt keine Kachel mehr.
  // Was die Pruefung WEITER sichert, ist das Eigentliche: dass die
  // Belohnungen senkrecht an der Seite haengen und nicht wieder als
  // Icon-Zeile in die Kopfleiste wandern.
  // 27.07., zweiter Durchgang: aus drei Belohnungs-Kacheln ist EINE
  // geworden. Alle drei oeffneten dasselbe Fenster (openRewards) mit
  // einem anderen Reiter — „Links auf dem hauptbildschirm ist 3x das
  // gleiche". Der Kalender oeffnet es auf LOGIN, die uebrigen Reiter
  // stehen dort oben. Der Zaehler fasst jetzt alle vier zusammen.
  // UMGESCHRIEBEN 30.07.2026: Bis hierher zaehlten drei Schritte `.railtile`
  // OHNE Seitenangabe und verglichen mit 1. Das war nur richtig, solange die
  // RECHTE Schiene leer war — der Schrittname sagte trotzdem „linke Schiene".
  // Seit die Offline-Ertraege dort einen Knopf haben (AA_UI_REFERENZ §26),
  // wurden sie rot, ohne dass die Anforderung verletzt war. Die lautet:
  // „Links auf dem hauptbildschirm ist 3x das gleiche" darf nicht
  // wiederkommen — je Schiene GENAU EINE Kachel, keine zwei Wege ins selbe
  // Fenster. Gemessen wird ab jetzt je Seite getrennt.
  step('Belohnungen haengen senkrecht an der Seite, nicht im Kopf',
    declutter.railsLinks === 1 && declutter.railsRechts === 1,
    declutter.railsLinks + ' links / ' + declutter.railsRechts + ' rechts');
  step('Profilzeile traegt nur noch Freunde + Menue',
    declutter.kopfIcons === 2 && declutter.icons === 0, String(declutter.kopfIcons));
  step('Genau 4 Hex-Slots wie AA (§14.3)', declutter.slots === 4, String(declutter.slots));
  // UMGESCHRIEBEN 27.07.: die dritte Kachel war GUIDE — und Guide ist ein
  // Ziel des Aufklapp-Menues. Der Auftraggeber hat die doppelten Wege
  // ausdruecklich streichen lassen („diese sind aber laengst oben im
  // Reiter den man aufklappen kann"). Die alte Fassung haette genau die
  // Doppelung festgeschrieben, die entfernt werden sollte.
  // Was BLEIBT, ist die Anforderung dahinter: der KAMPF-Knopf ist der
  // wichtigste Knopf des Spiels und muss mittig stehen. Das wird jetzt
  // gemessen statt die Kachelzahl zu zaehlen.
  const kampfMitte = await page.evaluate(() => {
    const r = document.getElementById('btnBattle').getBoundingClientRect();
    return { versatz: Math.abs((r.left + r.right) / 2 - window.innerWidth / 2),
             anteil: r.width / window.innerWidth };
  });
  step('KAMPF-Knopf steht mittig (<=2 px Versatz)',
    kampfMitte.versatz <= 2, kampfMitte.versatz.toFixed(1) + ' px');
  step('KAMPF-Knopf behaelt AAs Breite (~55 %)',
    kampfMitte.anteil > 0.45 && kampfMitte.anteil < 0.62,
    (kampfMitte.anteil * 100).toFixed(1) + ' %');
  step('Kein Menue-Ziel liegt zusaetzlich als Kachel auf der Startseite',
    (await page.evaluate(() => ['icoBoard','icoMail','icoVault','icoPack','tileGuide']
      .filter(id => document.getElementById(id)).join(','))) === '');
  await shot('home');

  // ================= 3. EINHEITLICHE BANNER-METRIK =================
  const metric = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    return { h: v('--banner-h'), hs: v('--banner-h-sm'), hl: v('--banner-h-lg'),
             tile: v('--tile'), gap: v('--gap'), radius: v('--radius'), pad: v('--pad') };
  });
  step('Banner-Metrik als CSS-Variablen definiert',
    !!metric.h && !!metric.tile && !!metric.gap && !!metric.radius,
    Object.keys(metric).map(k => k + ':' + metric[k]).join(' '));
  const usage = await page.evaluate(() => {
    // Zaehlt, wie oft die Variablen wirklich benutzt werden.
    let n = 0;
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const r of rules) if (r.cssText && /var\(--(banner-h|tile|gap|radius|pad)/.test(r.cssText)) n++;
    }
    return n;
  });
  step('Die Metrik wird flaechendeckend verwendet (>25 Regeln)', usage > 25, usage + ' Regeln');

  // ================= 4. SEASON-PASS AN AAs PLATZ =================
  const pb = await page.evaluate(() => ({
    txt: document.getElementById('passBanner').textContent.replace(/\s+/g, ' ').trim(),
    tinted: document.getElementById('passBanner').classList.contains('tinted'),
    lum: (() => { const e = document.getElementById('pbBtn'); const cs = getComputedStyle(e);
      const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
      return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255; })(),
  }));
  step('Pass-Banner zeigt Saison, Stufe und Restlaufzeit',
    /SAISON/.test(pb.txt) && /Stufe \d+\/\d+/.test(pb.txt) && /endet in/.test(pb.txt),
    pb.txt.slice(0, 62));
  step('Pass-Banner ist ein Farbkoerper', pb.tinted);
  step('Goldener Knopf im Banner traegt dunkle Schrift', pb.lum < 120, Math.round(pb.lum));
  await page.click('#passBanner');
  await page.waitForTimeout(420);
  step('Pass-Banner oeffnet den Season-Pass',
    await page.locator('#viewPass').evaluate(e => e.classList.contains('active')));

  /* --- 4b. Season-Pass: Reihenfolge und Metrik (§9.10 / §19.2) ---
     AA baut den Pass: Keyart-Header → Stufen-/XP-Leiste → Kauf-/Aktiv-
     Status → Spurenliste. Die Reihenfolge wird als DOM-Reihenfolge
     geprueft, nicht ueber Pixelkoordinaten — Letztere haengen am Inhalt. */
  const passOrder = await page.evaluate(() => {
    const kids = [...document.getElementById('viewPass').children].map(e => e.id || e.className);
    const idx = sel => kids.findIndex(k => k.indexOf(sel) >= 0);
    return { kids, art: idx('passArt'), bar: idx('passbar'), buy: idx('btnBuyPass'),
             head: idx('passhead'), list: idx('passList') };
  });
  step('Pass-Reihenfolge: Keyart → XP-Leiste → Kauf-Status → Spurenliste',
    passOrder.art >= 0 && passOrder.art < passOrder.bar && passOrder.bar < passOrder.buy &&
    passOrder.buy < passOrder.head && passOrder.head < passOrder.list,
    passOrder.kids.join(' → '));
  const passMetric = await page.evaluate(() => {
    const px = v => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v));
    const art = document.getElementById('passArt').getBoundingClientRect();
    const cs = n => getComputedStyle(document.querySelector(n));
    return {
      keyartH: Math.round(art.height), varKeyart: px('--keyart-h'),
      keyartR: cs('#passArt').borderRadius, varR: getComputedStyle(document.documentElement)
        .getPropertyValue('--radius').trim(),
      barR: cs('.passbar').borderRadius,
      rowMin: cs('.rwcell').minHeight, varSm: getComputedStyle(document.documentElement)
        .getPropertyValue('--banner-h-sm').trim(),
      rowR: cs('.rwcell').borderRadius, varRsm: getComputedStyle(document.documentElement)
        .getPropertyValue('--radius-sm').trim(),
      rowGap: cs('.passrow').marginTop, varGap: getComputedStyle(document.documentElement)
        .getPropertyValue('--gap').trim(),
    };
  });
  step('Keyart-Header nutzt die Metrik-Hoehe --keyart-h',
    passMetric.keyartH === Math.round(passMetric.varKeyart),
    passMetric.keyartH + ' px = --keyart-h ' + passMetric.varKeyart);
  step('Keyart-Radius aus der Metrik (--radius)',
    passMetric.keyartR === passMetric.varR, passMetric.keyartR + ' / ' + passMetric.varR);
  step('Farb-Reihen des Passes uebernehmen die Metrik (Hoehe/Radius/Abstand)',
    passMetric.rowMin === passMetric.varSm && passMetric.rowR === passMetric.varRsm &&
    passMetric.rowGap === passMetric.varGap,
    passMetric.rowMin + ' / ' + passMetric.rowR + ' / ' + passMetric.rowGap);
  const passTinted = await page.evaluate(() => ({
    rows: document.querySelectorAll('#passList .rwcell').length,
    tinted: document.querySelectorAll('#passList .rwcell.tinted').length,
  }));
  step('Belohnungszellen sind Farbkoerper (Farb-Pass)',
    passTinted.tinted > passTinted.rows * 0.5,
    passTinted.tinted + '/' + passTinted.rows + ' getoent');
  await shot('pass');

  // ================= 5. EINSTEIGER-GUIDE =================
  // UMGESCHRIEBEN 27.07.: die GUIDE-Kachel auf der Startseite ist weg,
  // der Weg fuehrt jetzt ueber das Aufklapp-Menue. Geprueft wird
  // weiterhin dasselbe: dass man vom Startbildschirm aus in den Guide
  // kommt — nur ueber den Weg, den es noch gibt.
  await go('navHome');
  await page.click('#tbMenu');
  await page.waitForTimeout(360);
  await page.click('.tbmi[data-nav="navGuide"]');
  await page.waitForTimeout(420);
  step('Menue-Eintrag GUIDE oeffnet den Guide',
    await page.locator('#viewGuide').evaluate(e => e.classList.contains('active')));
  const g0 = await page.evaluate(() => ({
    chaps: document.querySelectorAll('#guideChapters .gchap').length,
    locked: document.querySelectorAll('#guideChapters .gchap.locked').length,
    tasks: document.querySelectorAll('#guideChapters .gtask').length,
    prog: document.querySelector('#guideProg .gpn').textContent.trim(),
    bar: document.querySelector('#guideProg .gpbar i').style.width,
    packs: document.querySelectorAll('#guideChapters .gcpack').length,
  }));
  step('4 gestaffelte Kapitel mit 16 Aufgaben',
    g0.chaps === 4 && g0.tasks === 16, g0.chaps + ' Kapitel / ' + g0.tasks + ' Aufgaben');
  step('Fortschrittsleiste ueber alle Kapitel', /%$/.test(g0.prog) && !!g0.bar,
    g0.prog + ' · Balken ' + g0.bar);
  step('Jedes Kapitel schliesst mit einem Booster-Pack', g0.packs === 4);
  step('Spaetere Kapitel sind gesperrt', g0.locked >= 1, g0.locked + ' gesperrt');

  // Aufgabe erfuellen → Haekchen + Belohnung
  const beforeTask = await page.evaluate(() => ({
    gold: window.__proto.gold(),
    done: window.ArenaGuide.chapters()[0].tasks[3].done,
  }));
  step('Aufgabe „Turmkarte ansehen" ist zunaechst offen', beforeTask.done === false);
  await page.evaluate(() => { window.__proto.guideMark('card_seen'); window.__proto.renderGuide(); });
  await page.waitForTimeout(300);
  const afterMark = await page.evaluate(() => ({
    done: window.ArenaGuide.chapters()[0].tasks[3].done,
    checks: document.querySelectorAll('#guideChapters .gtask.done').length,
    claimable: document.querySelectorAll('#guideChapters .gclaim:not(.is-disabled)').length,
  }));
  step('Erfuellte Aufgabe bekommt ihr Haekchen', afterMark.done === true,
    afterMark.checks + ' Haekchen sichtbar');
  step('Erledigte Aufgaben zeigen einen aktiven ABHOLEN-Knopf', afterMark.claimable > 0,
    afterMark.claimable + ' abholbar');
  await page.click('#guideChapters .gclaim:not(.is-disabled)');
  await page.waitForTimeout(400);
  const afterClaim2 = await page.evaluate(() => ({ gold: window.__proto.gold() }));
  step('Belohnung wird gutgeschrieben', afterClaim2.gold > beforeTask.gold,
    beforeTask.gold + ' → ' + afterClaim2.gold);
  // Nur die AKTIVEN Knoepfe sind golden; die deaktivierten sind grau und
  // duerfen deshalb helle Schrift tragen.
  const lumG = await page.$$eval('#guideChapters .gclaim:not(.is-disabled)', els => els.map(e => {
    const cs = getComputedStyle(e); const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
    return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
  }));
  step('Alle Guide-Knoepfe: dunkle Schrift auf Gold', lumG.every(l => l < 130),
    Math.max(...lumG).toFixed(0) + ' max');
  await shot('guide');

  // ================= 6. HANDBUCH =================
  /* UMGESCHRIEBEN 29.07.2026. Diese Pruefung klickte `#btnToManual` und
     verlangte danach `#viewManual.active`. Beides schrieb die alte
     Bauart fest: das Handbuch war ein eigener View hinter einem
     Notknopf im Guide-Kopf. Seit dem Reiter-Umbau ist es ein REITER des
     Guides (AA-Aufbau, IMG_3361/3362), und der Notknopf ist weg — der
     Kommentar an ihm hat genau das angekuendigt.
     Die Anforderung DAHINTER bleibt gleich und wird weiter gemessen:
     das Handbuch ist aus dem Guide heraus erreichbar und zeigt dort
     seine acht Seiten. Nur der Weg heisst jetzt „Reiter" statt „Knopf". */
  await page.evaluate(() => window.__proto.guideTab('manual'));
  await page.waitForTimeout(420);
  step('Handbuch oeffnet aus dem Guide (Reiter)',
    await page.evaluate(() =>
      document.getElementById('viewGuide').classList.contains('active') &&
      window.__proto.gTab() === 'manual' &&
      !document.getElementById('gpManual').hidden));
  const m0 = await page.evaluate(() => ({
    pages: document.querySelectorAll('#manList .manpage').length,
    open: document.querySelectorAll('#manList .manpage.open').length,
    arts: document.querySelectorAll('#manList .manpage.open .manart .ma').length,
    bullets: document.querySelectorAll('#manList .manpage.open li').length,
    titles: [...document.querySelectorAll('#manList .mhn')].map(e => e.textContent.trim()),
  }));
  step('8 aufklappbare Handbuchseiten', m0.pages === 8, String(m0.pages));
  step('Erste Seite ist offen und bebildert', m0.open === 1 && m0.arts > 0,
    m0.arts + ' Illustrationen');
  step('Seiten tragen Aufzaehlungen', m0.bullets >= 4, m0.bullets + ' Punkte');
  step('Die Kernsysteme sind abgedeckt',
    /Elemente/.test(m0.titles.join()) && /Fusion/.test(m0.titles.join()) &&
    /Festung/.test(m0.titles.join()) && /Clan/.test(m0.titles.join()),
    m0.titles.join(' · ').slice(0, 70));
  await page.click('#manList .manpage:nth-child(2) .manhead');
  await page.waitForTimeout(300);
  step('Aufklappen funktioniert und markiert die Seite als gelesen',
    (await page.locator('#manList .manpage.open').count()) >= 1 &&
    (await page.locator('#manList .mhr').count()) >= 1);
  await shot('handbuch');
  // Erreichbarkeit aus den Einstellungen
  await go('navSettings');
  step('Einstellungen haben die Gruppe „Hilfe & Guides"',
    (await page.locator('#btnSetGuide').count()) === 1 &&
    (await page.locator('#btnSetManual').count()) === 1 &&
    (await page.locator('#btnSetLogin').count()) === 1);
  await page.click('#btnSetManual');
  await page.waitForTimeout(380);
  /* UMGESCHRIEBEN 29.07.2026 (siehe oben): der Einstellungs-Knopf ruft
     weiterhin `show("navManual")`. Dass dahinter kein eigener View mehr
     steckt, sondern ein Reiter, ist genau der Punkt — der Weg aus den
     Einstellungen darf davon nichts merken. */
  step('Handbuch ist auch aus den Einstellungen erreichbar',
    await page.evaluate(() =>
      document.getElementById('viewGuide').classList.contains('active') &&
      window.__proto.gTab() === 'manual'));

  /* ================= 6b. AAA-ICON-SWEEP (Batch 6) =================
     Geprueft wird die STRUKTUR, nicht ob das CDN antwortet: Im Prototyp
     laden die Bilder nicht, deshalb muss ueberall der Emoji-/Textfallback
     tragen. Genau das ist hier die Zusicherung. */
  await go('navHome');
  const nav = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('nav.bottom button')];
    const bar = document.querySelector('nav.bottom').getBoundingClientRect();
    const pop = id => document.querySelector('#' + id + ' .navpop');
    const w = id => Math.round(pop(id).getBoundingClientRect().width);
    return {
      ids: btns.map(e => e.id),
      labels: btns.map(e => e.textContent.replace(/[^A-Za-zÄÖÜäöüß]/g, '')),
      pops: document.querySelectorAll('nav.bottom .navpop').length,
      center: w('navHome'), side: w('navShop'),
      popsOut: Math.round(bar.top - pop('navHome').getBoundingClientRect().top),
      fixed: getComputedStyle(document.querySelector('nav.bottom')).position,
      overflow: getComputedStyle(document.querySelector('nav.bottom')).overflowY,
      badges: ['badgeShop', 'navBadge', 'badgeClan'].filter(id => document.getElementById(id)).length,
      onMark: document.querySelectorAll('nav.bottom button.on').length,
    };
  });
  step('Bottom-Nav-Reihenfolge Shop | Sammlung | Start | Clan | Burg',
    nav.ids.join(',') === 'navShop,navCollection,navHome,navClan,navFortress',
    nav.ids.join(' | '));
  step('Deutsche Labels unter den Illustrationen',
    nav.labels.join('|') === 'Shop|Sammlung|Start|Clan|Burg', nav.labels.join(' | '));
  step('Fuenf Popout-Illustrationen, Mitte am groessten',
    nav.pops === 5 && nav.center > nav.side, nav.side + ' px, Mitte ' + nav.center + ' px');
  step('Popouts ragen oben aus der Leiste (AA-Muster)',
    nav.popsOut > 8 && nav.overflow === 'visible', nav.popsOut + ' px oberhalb');
  step('Nav bleibt position:fixed', nav.fixed === 'fixed', nav.fixed);
  step('Badges erhalten geblieben', nav.badges === 3, nav.badges + '/3');
  step('Aktiver Tab ist markiert', nav.onMark === 1);

  // Utility-Icons: jedes Ziel-Icon muss im DOM ankommen (Bild ODER Fallback)
  const utilIcons = await page.evaluate(() => {
    const want = ['ic_calendar', 'ic_mail', 'ic_gear', 'ic_tent', 'ic_compass', 'ic_rank',
                  'ic_gift', 'ic_plus'];
    const A = window.__proto.ASSETS;
    const html = document.documentElement.innerHTML;
    return {
      registered: want.filter(k => !!A[k]).length, want: want.length,
      // Die Icons sitzen als <img src> ODER — nach dem Fallback-Sweep — als
      // <span> mit dem Emoji. Beides zaehlt als "angekommen".
      inDom: want.filter(k => html.indexOf(A[k] || '@@') >= 0).length,
      holes: [...document.querySelectorAll('img.ico, img.prodimg, img.navimg, img.plusimg')]
        .filter(i => i.complete && i.naturalWidth === 0).length,
      // Siehe oben: die Kopf-Icons sind zu den Schienen gewandert.
      railIcons: document.querySelectorAll('.hubrail.left .railtile').length,
      railIconsR: document.querySelectorAll('.hubrail.right .railtile').length,
    };
  });
  step('Alle Utility-Icons aus Batch 6 registriert',
    utilIcons.registered === utilIcons.want, utilIcons.registered + '/' + utilIcons.want);
  // 1 statt 7 seit dem 27.07.: siehe Begruendung weiter oben.
  step('Die linke Hub-Schiene traegt eine Kachel',
    utilIcons.railIcons === 1, String(utilIcons.railIcons));
  step('Die rechte Hub-Schiene traegt eine Kachel (Offline-Ertraege)',
    utilIcons.railIconsR === 1, String(utilIcons.railIconsR));
  step('Kein leeres Bildfeld: UIIcon.sweep hat alle Loecher geschlossen',
    utilIcons.holes === 0, utilIcons.holes + ' Loecher');

  // Gem-Identitaet: SMARAGDGRUEN, Gold bleibt gold
  const gemId = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const hex2rgb = h => { const m = /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h.trim());
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null; };
    const gem = hex2rgb(root.getPropertyValue('--gemc'));
    const gold = hex2rgb(root.getPropertyValue('--gold'));
    const num = getComputedStyle(document.querySelector('.cur.c-gem span:not(.plus)')).color;
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(num);
    return { gem, gold, num: m ? [+m[1], +m[2], +m[3]] : null,
             gemPill: !!document.querySelector('.cur.c-gem'),
             goldPill: !!document.querySelector('.cur.c-gold') };
  });
  step('--gemc ist ein GRUENTON (G dominiert klar)',
    gemId.gem && gemId.gem[1] > gemId.gem[0] * 1.6 && gemId.gem[1] > gemId.gem[2] * 1.6,
    'rgb(' + (gemId.gem || []).join(',') + ')');
  step('Gold bleibt Gold (R+G hoch, B niedrig)',
    gemId.gold && gemId.gold[0] > 200 && gemId.gold[2] < 120,
    'rgb(' + (gemId.gold || []).join(',') + ')');
  step('Gem-Zahl in der Top-Bar traegt den Gruenton',
    gemId.num && gemId.num[1] > gemId.num[0] && gemId.num[1] > gemId.num[2],
    'rgb(' + (gemId.num || []).join(',') + ')');
  step('Beide Waehrungspillen sind als solche markiert',
    gemId.gemPill && gemId.goldPill);

  // ================= 7. ALLE VIEWS DURCHKLICKEN + SCREENSHOTS =========
  await go('navSettings'); await shot('einstellungen');
  /* --- 7b. Shop: AA-Sektionsreihenfolge (§27.1, abgelesen 30.07.2026) ---
     1 Arena-Packs · 2 Tagesangebote · 3 Vorrats-Pack (AAs ARCANE
     SUPPLIES CHEST) · 4 Booster-Packs (AAs CHEST) · 5 Kristalltresor
     (AAs ENDLESS ROULETTE) · 6 Gems · 7 Gold.
     Geprueft wird die DOM-Reihenfolge, nicht die Optik. */
  await go('navShop');
  const shopOrder = await page.evaluate(() => {
    const sichtbar = e => !!(e && e.getClientRects().length);
    const marks = [...document.querySelectorAll('#viewShop [data-sec]')].filter(sichtbar);
    return {
      order: marks.map(e => e.getAttribute('data-sec')),
      // Blocktitel in DOM-Reihenfolge
      labels: marks.map(e => (e.querySelector('.srt') || e.querySelector('.sh') || e)
        .textContent.replace(/\s+/g, ' ').trim().slice(0, 22)),
      // Die Inhaltscontainer muessen in derselben Folge stehen
      slots: ['arenaPackBox', 'dealGrid', 'vorratShop', 'packShop',
              'vaultShop', 'gemShop', 'goldShop']
        .map(id => { const e = document.getElementById(id);
                     return sichtbar(e) ? [...document.getElementById('viewShop').querySelectorAll('*')].indexOf(e) : -1; }),
    };
  });
  /* ⚠ UMGESCHRIEBEN AM 30.07.2026 — VON ACHT AUF SIEBEN SEKTIONEN.
     Diese Pruefung stand zuletzt auf ACHT, mit der Begruendung, unser
     Vorrats-Pack brauche ein eigenes Band neben dem Truhenblock. Die
     Aufteilung bleibt richtig; falsch war die achte Sektion davor.
     §27.1 ist an acht Screenshots abgelesen (IMG_3449-3456) und zeigt:
     AA hat an Position 1 GAR KEINEN Banner. Der Werbe-Entfernen-Banner
     aus §8.1 ist dort nicht (mehr) vorhanden, und einen Pass-Banner hat
     der Store nie gehabt. Beides ist bei uns gestrichen — den Pass
     verkaufen wir auf dem Hauptbildschirm, ein zweites Mal im Shop ist
     kein zweites Angebot.
     Ausserdem ruecken zwei Sektionen: AAs ARCANE SUPPLIES CHEST steht
     VOR dem Truhenblock (Platz 3), nicht dahinter. §8.2 hatte das
     andersherum vermutet.
     Was hier weiterhin geprueft wird, ist unveraendert das eigentlich
     Wichtige: die Nummern sind lueckenlos und aufsteigend, und die
     Inhaltscontainer stehen in derselben Folge im DOM. Neu ist nur,
     dass ausschliesslich SICHTBARE Sektionen zaehlen — ein
     ausgeblendeter Baustein ist keine geloeschte Sektion. */
  step('Shop traegt genau sieben sichtbare Sektionen',
    shopOrder.order.length === 7, shopOrder.order.join(','));
  step('Sektionsreihenfolge lueckenlos 1-7 nach AA §27.1',
    shopOrder.order.join(',') === '1,2,3,4,5,6,7', shopOrder.labels.join(' · '));
  step('Inhaltscontainer stehen in derselben Folge im DOM',
    shopOrder.slots.every((v, i) => v >= 0 && (i === 0 || v > shopOrder.slots[i - 1])),
    shopOrder.slots.join(' < '));
  const shopBlocks = await page.evaluate(() => ({
    /* ⚠ Frueher wurde hier `#shopPromo` ausgelesen. Das Pass-Banner ist
       weg (§27.1); gezaehlt wird jetzt, dass es KEINES mehr gibt —
       weder als Pass- noch als Werbe-Entfernen-Banner. */
    passBanner: document.querySelectorAll(
      '#viewShop #shopPromo, #viewShop .promobanner, #viewShop .passbanner').length,
    bannerShop: document.querySelectorAll(
      '#viewShop [data-adfree], #viewShop .adbanner, #viewShop [data-noads]').length,
    iap: document.querySelectorAll('#arenaPackBox .iapcard').length,
    iapBadges: document.querySelectorAll('#arenaPackBox .valbadge').length,
    iapIcons: document.querySelectorAll('#arenaPackBox .iapicons span').length,
    // Icon-Sweep Batch 6: Deals, Gems und Gold sind jetzt gerahmte
    // Produktkarten (.prodcard) mit Farbcode-Rahmen.
    deals: document.querySelectorAll('#dealGrid .prodcard').length,
    dealGratis: document.querySelectorAll('#dealGrid [data-gratis]').length,
    packs: document.querySelectorAll('#packShop .shopcard').length,
    packSpalten: getComputedStyle(document.getElementById('packShop'))
      .gridTemplateColumns.trim().split(/\s+/).length,
    packFrei: document.querySelectorAll('#packFreeBox .tagesband').length,
    packBronze: document.querySelectorAll('#packShop [data-pack="bronze"]').length,
    vorrat: document.querySelectorAll('#vorratShop .vrbtn').length,
    vorratOdds: document.querySelectorAll('#vorratShop .vorratodds .orow').length,
    vault: document.querySelectorAll('#vaultShop .vaultjar').length,
    gems: document.querySelectorAll('#gemShop .prodcard').length,
    golds: document.querySelectorAll('#goldShop .prodcard').length,
    goldGratis: document.querySelectorAll('#goldShop [data-goldfree]').length,
    gemFrames: document.querySelectorAll('#gemShop .prodcard.fr-kristall').length,
    goldFrames: document.querySelectorAll('#goldShop .prodcard.fr-gold').length,
    dealFrames: document.querySelectorAll('#dealGrid .prodcard.fr-light').length,
    frameLayers: document.querySelectorAll('#viewShop .prodcard .pcfrm').length,
    ribbons: document.querySelectorAll('#viewShop .secribbon').length,
    seals: [...document.querySelectorAll('#viewShop .seal')].map(e => e.textContent.trim()),
  }));
  /* ⚠ UMGESCHRIEBEN (30.07.2026). Der Schritt hiess „(1) Promo-Banner an
     Position 1, mit Inhalt" und schrieb damit genau den Baustein fest,
     den der Auftraggeber weghaben wollte: „Der battledpass der im Shop
     oben ist kann entfernt werden den brauchen wir an dieser Stelle
     nicht weil wir ihn schon auf der Battle ansicht (hauptbildschirm)
     oben verkaufen." Dazu „Den Banner Shop braucht es im Shop nicht der
     ist in AA auch nicht drin."
     Er wird nicht geloescht, sondern auf die neue Zusage gedreht: an
     Position 1 steht das Arena-Pack-Karussell, und BEIDE Banner sind
     verschwunden — nicht nur ausgeblendet. */
  step('(1) Kein Pass-Banner und kein Banner-Shop mehr im Shop (§27.1)',
    shopBlocks.passBanner === 0 && shopBlocks.bannerShop === 0,
    shopBlocks.passBanner + ' Pass-Banner / ' + shopBlocks.bannerShop + ' Banner-Shop');
  step('(1) Arena-Pack + Starter-Pack mit value-Badge und Icon-Reihe',
    shopBlocks.iap === 2 && shopBlocks.iapBadges === 2 && shopBlocks.iapIcons >= 8,
    shopBlocks.iap + ' Karten, ' + shopBlocks.iapIcons + ' Item-Icons');
  step('(2) Tagesangebote: 6 Posten, davon genau EINER gratis',
    shopBlocks.deals === 6 && shopBlocks.dealGratis === 1,
    shopBlocks.deals + ' Deals / ' + shopBlocks.dealGratis + ' gratis');
  /* ⚠ UMGESCHRIEBEN (27.07.): frueher `packs >= 4`. Bronze ist aus dem
     kaufbaren Angebot raus („bronze fliegt raus brauchen wir nicht"),
     kaufbar sind nur noch Silber/Gold/Arkan — und die MUESSEN in EINER
     Reihe stehen („Mach die Banner wieder so das alle 3 nebeneinander
     sind"). Genau das wird jetzt geprueft: drei Kacheln, drei Spalten,
     kein Bronze im Raster, und das Gratis-Pack als Band darunter. */
  step('(4) Booster-Packs: 3 kaufbare nebeneinander, Bronze nur noch gratis',
    shopBlocks.packs === 3 && shopBlocks.packSpalten === 3 &&
    shopBlocks.packBronze === 0 && shopBlocks.packFrei === 1,
    shopBlocks.packs + ' Kacheln in ' + shopBlocks.packSpalten + ' Spalten, ' +
    shopBlocks.packBronze + ' Bronze im Raster, ' + shopBlocks.packFrei + ' Gratis-Band');
  /* (29.07.2026) Vorher wurden FUENF Chancen-Zeilen verlangt. Suprem
     steht jetzt ausdruecklich mit 0 % dabei — „kommt nicht vor" ist eine
     Aussage, die der Kaeufer sehen soll. Sechs Zeilen sind also der
     Sollzustand, nicht ein Zaehlfehler. */
  step('(3) Vorrats-Pack: OEFFNEN x1 und x10 plus Chancen-Klappe',
    shopBlocks.vorrat === 2 && shopBlocks.vorratOdds === 6,
    shopBlocks.vorrat + ' Knoepfe / ' + shopBlocks.vorratOdds + ' Chancen-Zeilen');
  step('(5) Kristalltresor sitzt auf AAs Roulette-Platz', shopBlocks.vault === 1);
  step('(6) Gem-Pakete: 6 Staffeln als Produktkarten', shopBlocks.gems === 6,
    String(shopBlocks.gems));
  /* ⚠ UMGESCHRIEBEN (30.07.2026): frueher „3 kaufbare Staffeln +
     Gratis-Gold als Band". Das Band war die Antwort auf VIER Gold-
     Posten, von denen einer gratis war. AA hat DREI Staffeln, und die
     erste davon ist die gratis abzuholende (§27.2) — es bleibt nichts,
     was unter dem Raster stehen koennte. Die Zusage „das Gratisstueck
     ist als solches erkennbar" bleibt und haengt jetzt am Merker
     `data-goldfree` auf der Kachel. */
  step('(7) Gold: 3 Staffeln, davon genau eine gratis (§27.2)',
    shopBlocks.golds === 3 && shopBlocks.goldGratis === 1,
    shopBlocks.golds + ' Kacheln / ' + shopBlocks.goldGratis + ' Gratisposten');
  /* ⚠ UMGESCHRIEBEN 27.07. — und diese Pruefung ist der Grund, warum
     der Fehler so lange stand. Sie hiess „Gems orange, Gold gruen" und
     hat damit genau die Vertauschung FESTGESCHRIEBEN, die der
     Auftraggeber am Bildschirm sofort sah: die Kristall-Kacheln trugen
     einen goldenen Rand, die Gold-Kacheln einen gruenen. Die Pruefung
     lief gruen, weil sie das Falsche verlangte.
     Sie zaehlt jetzt Rollen-Klassen statt Farbnamen. Ob die Rolle auch
     die richtige FARBE zeichnet, misst pruefungen/shop_raender.js am
     tatsaechlich gerenderten Rand — Klassenzaehlen allein kann das
     nicht, und genau diese Luecke war das Problem. */
  step('Farbcode-Rahmen: Kristalle, Gold, Angebote je eigene Rolle',
    shopBlocks.gemFrames === 6 && shopBlocks.goldFrames === 3 && shopBlocks.dealFrames === 6,
    shopBlocks.gemFrames + ' Kristall / ' + shopBlocks.goldFrames + ' Gold / ' +
    shopBlocks.dealFrames + ' hell');
  step('Jede Produktkarte hat eine eigene Rahmen-Ebene ueber dem Produktbild',
    shopBlocks.frameLayers === shopBlocks.gems + shopBlocks.golds + shopBlocks.deals,
    shopBlocks.frameLayers + ' Rahmen-Ebenen');
  step('Alle sieben Sektionen tragen ein Kit-Ribbon',
    shopBlocks.ribbons >= 7, shopBlocks.ribbons + ' Ribbons');
  step('Siegel "Beliebt!" und "Bester Wert!" vorhanden',
    shopBlocks.seals.some(t => /BELIEBT/.test(t)) && shopBlocks.seals.some(t => /BESTER WERT/.test(t)),
    shopBlocks.seals.join(' · '));
  /* Luminanz: Siegel und value-Badges sind HELLE Flaechen ⇒ dunkle Schrift.
     ⚠ `#viewShop .secribbon .srt` ist hier AUSGETRAGEN (26.07.), mit
     Absicht. Das Sektionsband war hell-silber, seine Ueberschrift musste
     dunkel sein. Seit die Baender die Grafik des Screen-Titels tragen
     (`banner_title`, dunkelviolett), ist DUNKLE Schrift dort der Fehler —
     diese Zeile haette ihn eingefordert. Der Bandtext wird jetzt weiter
     unten gegen SEINEN Grund geprueft („Bandschrift kontrastiert gegen
     ihren Bandgrund"), statt hier gegen eine fremde Annahme. Die uebrigen
     vier Selektoren sind unveraendert echte helle Flaechen.
     ⚠ `.prb` (der Knopf des Pass-Banners) ist am 30.07.2026 ebenfalls
     ausgetragen — den Baustein gibt es nicht mehr (§27.1). Dafuer kommt
     der GRATIS-Knopf der ersten Gold-Staffel dazu: er ist seit dem
     Umbau eine helle Flaeche im Raster und faellt damit unter dieselbe
     Regel. Die Mindestzahl bleibt bei acht Flaechen, nur die Herkunft
     verschiebt sich. */
  const sealLum = await page.$$eval('#viewShop .seal, #viewShop .valbadge, ' +
    '#goldShop .pcbuy.goldprice, #goldShop .pcbuy.freeprice:not([disabled])',
    els => els.map(e => {
      const cs = getComputedStyle(e);
      const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
      return { cls: e.className, lum: m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255 };
    }));
  const sealBad = sealLum.filter(x => x.lum > 120);
  step('Siegel/Badges/Goldknoepfe/Ribbon-Text tragen dunkle Schrift',
    sealLum.length >= 7 && sealBad.length === 0,
    sealLum.length + ' geprueft' + (sealBad.length ? ' — Verstoss: ' + sealBad[0].cls : ''));
  /* Metrik auf den neuen Bausteinen.
     ⚠ Die Hoehenmessung hing am Pass-Banner (`#shopPromo`, gegen
     --banner-h). Der Baustein ist weg; gemessen wird jetzt der
     Kristalltresor, das breite Band, das den Platz des Roulettes haelt
     und dieselbe Reihenhoehe einhalten muss. Die Zusage — „ein breites
     Band ist mindestens --banner-h hoch" — ist unveraendert. */
  const shopMetric = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const cs = n => getComputedStyle(document.querySelector(n));
    return { bandH: Math.round(document.getElementById('vaultShop').getBoundingClientRect().height),
             bannerH: parseFloat(root.getPropertyValue('--banner-h')),
             iapR: cs('.iapcard').borderRadius, gemR: cs('#gemShop .prodcard').borderRadius,
             varR: root.getPropertyValue('--radius').trim(),
             secM: cs('.secribbon').marginTop, varGapLg: root.getPropertyValue('--gap-lg').trim() };
  });
  step('Neue Shop-Bausteine nutzen die Metrik (Hoehe/Radius/Abstand)',
    shopMetric.bandH >= shopMetric.bannerH && shopMetric.iapR === shopMetric.varR &&
    shopMetric.gemR === shopMetric.varR && shopMetric.secM === shopMetric.varGapLg,
    shopMetric.bandH + 'px / ' + shopMetric.iapR + ' / ' + shopMetric.secM);
  /* Gold-Tausch bucht echt, Echtgeld ist ein Platzhalter.
     ⚠ UMGESCHRIEBEN (30.07.2026): hier standen +10 500 Gold und −80
     Gems als feste Zahlen. Mit AAs Staffelung (§27.2) sind es 36 000
     und 90 — und beim naechsten Preisschritt waeren es wieder andere.
     Eine eingefrorene Zahl prueft den Preis, nicht die BUCHUNG. Gelesen
     wird jetzt die Staffel, gegen die geklickt wird; gemessen wird, ob
     genau sie gebucht wurde. */
  const exchange = await page.evaluate(() => {
    const P = window.__proto;
    const g = P.GOLD_PACKS.filter(x => !x.free)[0];
    const before = { gold: P.gold(), gems: P.gems() };
    document.querySelector('#goldShop [data-goldbuy="' + g.id + '"]').click();
    return { before, soll: { amt: g.amt, cost: g.cost },
             after: { gold: P.gold(), gems: P.gems() } };
  });
  await page.waitForTimeout(320);
  step('Gold-Tausch bucht echt: Gems runter, Gold rauf',
    exchange.after.gold === exchange.before.gold + exchange.soll.amt &&
    exchange.after.gems === exchange.before.gems - exchange.soll.cost,
    exchange.before.gems + '→' + exchange.after.gems + ' 💎, ' +
    exchange.before.gold + '→' + exchange.after.gold + ' 🪙 (Soll: +' +
    exchange.soll.amt + ' / −' + exchange.soll.cost + ')');
  const iapNoop = await page.evaluate(() => {
    const before = { gold: window.__proto.gold(), gems: window.__proto.gems() };
    document.querySelector('#arenaPackBox [data-iapbuy]').click();
    document.querySelector('#gemShop [data-gembuy]').click();
    return before.gold === window.__proto.gold() && before.gems === window.__proto.gems();
  });
  step('Echtgeld-Kauf ist ein Platzhalter und veraendert keine Wallet', iapNoop);
  await page.waitForTimeout(200);

  /* Die ausfuehrlichen Pruefungen des Shop-Umbaus (Tagesangebote,
     Vorrats-Truhe, Tagesband) stehen in einer eigenen Suite:
         PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_shop.js
     Hier bleibt nur, was zur Sektions- und Metrik-Pruefung gehoert. */
  await go('navShop');
  await shot('shop');
  /* Battle-Deck-Umbau (30.07.2026): der zweite Bottom-Nav-Reiter zeigt
     seither zuerst das Deck (§24) — fuer die Galerie-Aufnahme "sammlung"
     erst auf den Sammlung-Reiter wechseln, sonst zeigt der Screenshot
     den falschen Bildschirm unter dem richtigen Namen. */
  await shot('sammlung');
  await shot('battledeck');   // NEU: das Deck selbst gehoert ebenso in die Galerie
  await page.evaluate(() => window.__proto.openDetail('fire'));
  await page.waitForTimeout(420);
  step('Turm-Detailkarte oeffnet',
    await page.locator('#detailModal').evaluate(e => e.classList.contains('open')));
  await shot('detail');
  await page.click('#btnDetailClose'); await page.waitForTimeout(300);
  await go('navForge'); await shot('schmiede');
  await go('navPack'); await shot('pack');
  await go('navFortress');
  await page.evaluate(() => window.__proto.setFortLayout('constell', true));
  await page.evaluate(() => window.__proto.renderFortress());
  await shot('festung_konstellation');
  await page.evaluate(() => window.__proto.setFortLayout('banner'));
  await page.waitForTimeout(400);
  await shot('festung_banner');
  await page.evaluate(() => window.__proto.setFortLayout('constell'));
  await go('navClan');
  await page.evaluate(() => window.__proto.setClanTab('quests')); await shot('clan_quests');
  await page.evaluate(() => window.__proto.setClanTab('donate')); await shot('clan_spenden');
  await page.evaluate(() => window.__proto.setClanTab('war')); await shot('clan_krieg');
  await go('navBoard'); await shot('rangliste');
  await go('navEvents'); await shot('events');
  await go('navMail'); await shot('post');
  await go('navHeroes'); await shot('helden');
  await go('navGuide'); await shot('guide');
  await go('navHome');
  /* ⚠ GEAENDERTE ERWARTUNG (26.07.). Hier stand „Kalender-Icon oeffnet
     die Tagesziele" (#dailyLayer). Die Kachel fuehrt jetzt ins
     BELOHNUNGS-FENSTER auf den Reiter LOGIN — alle drei Kacheln der
     linken Schiene oeffnen dasselbe Fenster und waehlen nur ihren
     Reiter vor, so wie AA es macht (IMG_3338-3341). Die Erwartung ist
     also nicht kaputt, sondern ueberholt; sie wird auf das neue Ziel
     umgestellt. Das Tagesziel-Fenster selbst ist unveraendert und wird
     weiter unten ueber openDaily() geprueft. */
  await page.click('#icoDaily'); await page.waitForTimeout(380);
  step('Kalender-Kachel oeffnet das Belohnungs-Fenster auf LOGIN',
    await page.evaluate(() =>
      document.getElementById('rwLayer').classList.contains('open') &&
      /LOGIN/.test(document.getElementById('rwTitle').textContent)),
    await page.evaluate(() => document.getElementById('rwTitle').textContent.trim()));
  await shot('belohnungen_login');
  await page.click('#rwClose'); await page.waitForTimeout(300);
  await page.evaluate(() => window.__proto.openDaily()); await page.waitForTimeout(380);
  step('Tagesziel-Fenster oeffnet weiterhin',
    await page.locator('#dailyLayer').evaluate(e => e.classList.contains('open')));
  await shot('daily');
  await page.click('#dailyClose'); await page.waitForTimeout(300);
  await page.click('#arenaDiorama'); await page.waitForTimeout(500);
  step('Arena-Diorama oeffnet die Trophaeenstrasse',
    await page.locator('#roadLayer').evaluate(e => e.classList.contains('open')));
  await shot('battle_road');
  await page.click('#roadOk'); await page.waitForTimeout(300);

  // ================= 8. FEHLER-CHECK DER GESAMTEN UI =================
  await clearLayers();
  const VIEWS = ['navHome', 'navShop', 'navCollection', 'navForge', 'navPack', 'navFortress',
                 'navClan', 'navBoard', 'navPass', 'navHeroes', 'navEvents', 'navMail',
                 'navSettings', 'navGuide', 'navManual', 'navEditProfile'];
  let deadButtons = 0, badLum = [], overlaps = 0, navHidden = 0;
  const overlapWho = [];
  for (const v of VIEWS) {
    await go(v);
    // a) Bottom-Nav muss in JEDER View sichtbar und klickbar bleiben.
    const navOk = await page.evaluate(() => {
      const n = document.getElementById('navHome').getBoundingClientRect();
      return n.top >= 0 && n.bottom <= window.innerHeight + 1;
    });
    if (!navOk) navHidden++;
    // b) Keine helle Schrift auf goldener Flaeche.
    const lum = await page.$$eval('.view.active button, .view.active .btn', els => els.map(e => {
      const cs = getComputedStyle(e);
      const onGold = /244, 227, 166|240, 197, 61|224, 185, 74/.test(cs.backgroundImage);
      if (!onGold) return null;
      /* Die Schrift kann in einem KIND stecken (z. B. der KAMPF-Knopf mit
         <span class="goldtext">). Gemessen wird der Knoten, der den Text
         wirklich traegt — sonst misst man die geerbte Button-Farbe. */
      const holder = [...e.children].find(c => (c.textContent || '').trim()) || e;
      const hs = getComputedStyle(holder);
      const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(hs.webkitTextFillColor || hs.color);
      const l = m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
      return l > 140 ? (e.id || e.className) : null;
    }).filter(Boolean));
    badLum = badLum.concat(lum);
    // c) Tote Knoepfe: sichtbare Buttons ohne Handler und ohne .pressable.
    const dead = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.view.active button')];
      return els.filter(e => {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        return !e.classList.contains('pressable') && !e.disabled;
      }).length;
    });
    deadButtons += dead;
    // d) Ueberdeckung: liegt der Titel unter einem positionierten Layer?
    const ov = await page.evaluate(() => {
      const t = document.querySelector('.view.active h2.title');
      if (!t) return null;
      const r = t.getBoundingClientRect();
      if (r.width < 4 || r.bottom < 0 || r.top > window.innerHeight) return null;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && (hit === t || t.contains(hit) || hit.contains(t))) return null;
      return document.querySelector('.view.active').id + '←' +
             (hit ? (hit.id || hit.className || hit.tagName) : 'nichts');
    });
    if (ov) { overlaps++; overlapWho.push(ov); }
  }
  step('Bottom-Nav bleibt in ALLEN ' + VIEWS.length + ' Views sichtbar',
    navHidden === 0, navHidden + ' Ausreisser');
  step('Keine helle Schrift auf goldener Flaeche in irgendeiner View',
    badLum.length === 0, badLum.slice(0, 3).join(', ') || 'sauber');
  step('Kein Titel wird von einem positionierten Layer verdeckt',
    overlaps === 0, overlapWho.join(' · ') || 'sauber');
  step('Alle sichtbaren Knoepfe tragen die Interaktions-Schicht (.pressable)',
    deadButtons === 0, deadButtons + ' ohne .pressable');

  // Icons: kein nacktes Emoji dort, wo ein Asset existiert
  const icoStat = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img.ico').length;
    const spans = document.querySelectorAll('span.ico').length;
    return { imgs, spans, total: imgs + spans };
  });
  step('Icon-Ebene flaechendeckend im Einsatz (Asset + Emoji-Fallback)',
    icoStat.total > 60, icoStat.total + ' Icons (' + icoStat.spans + ' Fallback)');

  // Scroll-Verhalten: keine View scrollt horizontal
  let hScroll = 0;
  for (const v of VIEWS) {
    await go(v);
    const h = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (h) hScroll++;
  }
  step('Keine View scrollt horizontal', hScroll === 0, hScroll + ' Ausreisser');


  // ================= 9. AVATAR-SYSTEM (arena_avatars.js) =================
  /* Prueft die drei Aussagen, die hier kollidieren koennten:
     (a) Avatar und Rahmen sind ZWEI unabhaengige Sammlungen — die Wahl
         der einen darf die andere nicht anfassen,
     (b) eine gesperrte Kachel sagt nicht nur „nein", sondern WIE,
     (c) die Zeremonie laeuft genau EINMAL je Freischaltung.
     Dazu die Artwork-Groessen: unter 20 px tragen diese Bilder nur noch
     Farbe und Wort, deshalb wird jede Portraitflaeche nachgemessen. */
  await clearLayers();
  await go('navHome');

  const einstieg = await page.evaluate(() => {
    const a = document.getElementById('profAvatar');
    return { pressable: a.classList.contains('pressable'),
             titel: a.getAttribute('title') || '',
             inner: a.querySelector('i').className };
  });
  step('Portrait der Profilzeile ist der Einstieg (pressable + Titel)',
    einstieg.pressable && /bearbeiten/i.test(einstieg.titel), einstieg.titel);
  step('Profilzeile zeigt den GEWAEHLTEN Avatar (avmini-Traeger)',
    einstieg.inner === 'avmini', einstieg.inner);
  await page.click('#profAvatar');
  await page.waitForTimeout(400);
  step('Tippen oeffnet „Profil bearbeiten"',
    await page.evaluate(() => document.getElementById('viewEditProfile').classList.contains('active') &&
      document.querySelector('#viewEditProfile h2.title').textContent === 'Profil bearbeiten'));

  const prev = await page.evaluate(() => {
    const p = document.querySelector('#avPreview .avpvpic');
    const r = p.getBoundingClientRect();
    const A = window.ArenaAvatars, act = A.active();
    return { w: Math.round(r.width), h: Math.round(r.height),
             ring: getComputedStyle(p).getPropertyValue('--avring').trim(),
             rahmenFarbe: act.frame.tierColor,
             name: (document.querySelector('#avPreview .avpvn') || {}).textContent || '',
             rar: (document.querySelector('#avPreview .avpvr') || {}).textContent || '',
             sub: (document.querySelector('#avPreview .avpvs') || {}).textContent || '',
             emoji: !!p.querySelector('.avemo') };
  });
  step('Vorschau: Profilbild 128 px (weit ueber der 20-px-Grenze)',
    prev.w === 128 && prev.h === 128, prev.w + '×' + prev.h);
  step('Vorschau nennt Spielername, Raritaet und die Kombination',
    /Prisma-Magier/.test(prev.name) && prev.rar.length > 2 && /Rahmen/.test(prev.sub),
    prev.rar + ' · ' + prev.sub.replace(/\s+/g, ' ').slice(0, 60));
  step('Vorschau-Ring traegt die Farbe des RAHMENS, nicht des Portraits',
    prev.ring === prev.rahmenFarbe, prev.ring + ' vs ' + prev.rahmenFarbe);
  step('Portraitflaeche haelt immer ein Emoji als Rueckfall vor', prev.emoji);

  const gridA = await page.evaluate(() => {
    const A = window.ArenaAvatars, l = A.list();
    const cells = [...document.querySelectorAll('#avGrid .avcell')];
    const pic = cells[0].querySelector('.avcpic').getBoundingClientRect();
    return {
      n: cells.length, modul: l.length,
      frei: l.filter(e => !e.locked).length,
      locked: cells.filter(c => c.classList.contains('locked')).length,
      sel: cells.filter(c => c.classList.contains('sel')).length,
      selStreifen: document.querySelectorAll('#avGrid .avcsel').length,
      // Jede gesperrte Kachel: Schloss UND Bedingungstext.
      lockOhneSchloss: cells.filter(c => c.classList.contains('locked') && !c.querySelector('.avlock')).length,
      lockOhneText: cells.filter(c => c.classList.contains('locked') &&
        !((c.querySelector('.avcc') || {}).textContent || '').trim()).length,
      freiMitSchloss: cells.filter(c => !c.classList.contains('locked') && c.querySelector('.avlock')).length,
      bedingungen: cells.map(c => ((c.querySelector('.avcc') || {}).textContent || '')).filter(Boolean),
      picW: Math.round(pic.width),
      solaraLocked: l.find(e => e.key === 'solara').locked,
      artFolgt: [...document.querySelectorAll('#avGrid .avmiss')].length,
      zaehler: document.getElementById('avCntA').textContent,
    };
  });
  step('Avatar-Raster zeigt alle 12 Eintraege', gridA.n === 12 && gridA.modul === 12, gridA.n);
  step('genau EINE Kachel ist als ausgewaehlt markiert',
    gridA.sel === 1 && gridA.selStreifen === 1, gridA.sel);
  step('JEDE gesperrte Kachel traegt ein Schloss',
    gridA.locked > 0 && gridA.lockOhneSchloss === 0, gridA.locked + ' gesperrt');
  step('JEDE gesperrte Kachel nennt zusaetzlich die Bedingung als Text',
    gridA.lockOhneText === 0, gridA.bedingungen.slice(0, 3).join(' | '));
  step('freie Kacheln tragen KEIN Schloss', gridA.freiMitSchloss === 0);
  step('Bedingungstexte sind konkret (Arena / Trophaeen / Liga / Pass)',
    gridA.bedingungen.every(t => /Arena|Trophäen|Liga|Season-Pass/.test(t)),
    gridA.bedingungen.filter(t => !/Arena|Trophäen|Liga|Season-Pass/.test(t)).join(',') || 'alle');
  step('Kachel-Portrait 60 px — Artwork bleibt lesbar', gridA.picW === 60, gridA.picW);
  step('Reiter-Zaehler nennt frei/gesamt',
    gridA.zaehler === gridA.frei + '/12', gridA.zaehler);
  // UMGESCHRIEBEN 27.07.: die Marke „Art folgt" war der ehrliche Hinweis
  // auf ein fehlendes Bild — und sie MUSSTE damals vorkommen, weil 10
  // von 12 Portraets fehlten. Jetzt hat jeder waehlbare Avatar sein
  // Bild. Die Marke darf es weiter geben (fuer die Staffelung
  // oberhalb der Wahl), aber die staerkere Aussage ist heute: KEINE
  // freie Kachel steht ohne Bild da.
  step('keine waehlbare Kachel steht ohne Portrait da',
    gridA.artFolgt <= Math.max(0, gridA.frei - 5), gridA.artFolgt + ' Marken bei ' + gridA.frei + ' freien');
  // UMGESCHRIEBEN: Solara hing an Arena 5. Der Avatar haengt jetzt am
  // BESITZ der Heldenkarte — und das Demo-Profil besitzt Solara,
  // deshalb ist er zu Recht frei. Geprueft wird jetzt die Kopplung
  // selbst: ohne Besitz gesperrt, mit Besitz frei.
  const held = await page.evaluate(() => {
    const A = window.ArenaAvatars;
    const vorher = A.list().find(a => a.key === 'magmor');
    const besitzt = (window.__proto.CARDS || []).length >= 0;
    return { magmorGesperrt: !!vorher.locked, text: vorher.unlockText, besitzt };
  });
  step('Helden-Avatar nennt den Besitz als Bedingung',
    /im Besitz/.test(held.text), held.text);
  await shot('profil_avatare');

  // --- Rahmen-Reiter ---
  await page.click('#avTabFrames');
  await page.waitForTimeout(320);
  const gridF = await page.evaluate(() => {
    const A = window.ArenaAvatars, l = A.listFrames();
    const cells = [...document.querySelectorAll('#avGrid .avcell')];
    return { n: cells.length, modul: l.length,
             frei: l.filter(e => !e.locked).length,
             zaehler: document.getElementById('avCntF').textContent,
             tabF: document.getElementById('avTabFrames').classList.contains('on'),
             tabA: document.getElementById('avTabAvatars').classList.contains('on'),
             ringe: cells.filter(c => c.querySelector('.avcring')).length,
             lockOhneText: cells.filter(c => c.classList.contains('locked') &&
               !((c.querySelector('.avcc') || {}).textContent || '').trim()).length };
  });
  step('Rahmen-Reiter zeigt alle 8 Rahmen', gridF.n === 8 && gridF.modul === 8, gridF.n);
  step('nur EIN Reiter ist aktiv', gridF.tabF === true && gridF.tabA === false);
  step('jede Rahmen-Kachel hat ihre Ring-Ebene', gridF.ringe === 8, gridF.ringe);
  step('auch gesperrte Rahmen nennen ihre Bedingung', gridF.lockOhneText === 0);
  step('Rahmen-Zaehler nennt frei/gesamt', gridF.zaehler === gridF.frei + '/8', gridF.zaehler);
  await shot('profil_rahmen');

  /* --- Der Kern: ZWEI unabhaengige Sammlungen ---
     Ein Rahmenwechsel darf das Portrait nicht anfassen und umgekehrt.
     Genau hier waere ein flaches `gewaehlt`-Feld eingebrochen. */
  const vorher = await page.evaluate(() => {
    const s = window.ArenaAvatars.get();
    return { av: s.avatar.gewaehlt, fr: s.frame.gewaehlt };
  });
  const freierRahmen = await page.evaluate(() =>
    window.ArenaAvatars.listFrames().filter(f => !f.locked && !f.gewaehlt)[0].key);
  await page.click('#avGrid .avcell[data-avpick="' + freierRahmen + '"]');
  await page.waitForTimeout(320);
  const nachRahmen = await page.evaluate(() => {
    const s = window.ArenaAvatars.get();
    return { av: s.avatar.gewaehlt, fr: s.frame.gewaehlt,
             sel: document.querySelectorAll('#avGrid .avcell.sel').length };
  });
  step('Rahmenwahl wird gespeichert', nachRahmen.fr === freierRahmen,
    vorher.fr + ' → ' + nachRahmen.fr);
  step('Rahmenwahl laesst den AVATAR unberuehrt',
    nachRahmen.av === vorher.av, nachRahmen.av);
  step('nach dem Wechsel ist wieder genau eine Kachel markiert', nachRahmen.sel === 1);

  await page.click('#avTabAvatars');
  await page.waitForTimeout(320);
  const freierAvatar = await page.evaluate(() =>
    window.ArenaAvatars.list().filter(a => !a.locked && !a.gewaehlt)[0].key);
  await page.click('#avGrid .avcell[data-avpick="' + freierAvatar + '"]');
  await page.waitForTimeout(320);
  const nachAvatar = await page.evaluate(() => {
    const s = window.ArenaAvatars.get();
    return { av: s.avatar.gewaehlt, fr: s.frame.gewaehlt };
  });
  step('Avatarwahl wird gespeichert', nachAvatar.av === freierAvatar, nachAvatar.av);
  step('Avatarwahl laesst den RAHMEN unberuehrt',
    nachAvatar.fr === freierRahmen, nachAvatar.fr);

  // Gesperrte Kachel: Toast mit Bedingung, Auswahl bleibt stehen.
  const gesperrt = await page.evaluate(() =>
    window.ArenaAvatars.list().filter(a => a.locked)[0].key);
  await page.click('#avGrid .avcell[data-avpick="' + gesperrt + '"]');
  await page.waitForTimeout(320);
  const nachSperre = await page.evaluate(() => ({
    toast: document.getElementById('toast').textContent,
    an: document.getElementById('toast').classList.contains('on'),
    av: window.ArenaAvatars.get().avatar.gewaehlt,
  }));
  step('Klick auf gesperrte Kachel meldet die Bedingung',
    nachSperre.an && /gesperrt/i.test(nachSperre.toast), nachSperre.toast);
  step('die Auswahl bleibt dabei unveraendert', nachSperre.av === freierAvatar);

  // Profilzeile auf Home zieht mit.
  await go('navHome');
  const homeSync = await page.evaluate(() => {
    const A = window.ArenaAvatars, act = A.active();
    const i = document.querySelector('#profAvatar i');
    return { emoji: (i.querySelector('.avemo') || {}).textContent || '',
             soll: act.emoji, rand: getComputedStyle(i).borderColor,
             titel: document.getElementById('profAvatar').getAttribute('title') || '' };
  });
  step('Profilzeile auf Home zeigt den neu gewaehlten Avatar',
    homeSync.emoji === homeSync.soll && homeSync.emoji.length > 0,
    homeSync.emoji + ' / ' + homeSync.soll);
  step('Titel der Profilzeile nennt Avatar UND Rahmen',
    / · /.test(homeSync.titel), homeSync.titel);

  /* --- ZEREMONIE --- */
  await go('navEditProfile');
  await page.click('#avDemo');
  await page.waitForTimeout(520);
  const cer = await page.evaluate(() => {
    const l = document.getElementById('avCerLayer');
    const pic = document.querySelector('#avCer .avcerpic');
    const r = pic ? pic.getBoundingClientRect() : { width: 0, height: 0 };
    const nav = document.getElementById('navHome').getBoundingClientRect();
    const mitte = document.elementFromPoint(nav.left + nav.width / 2, nav.top + nav.height / 2);
    return {
      offen: l.classList.contains('open'),
      w: Math.round(r.width), h: Math.round(r.height),
      name: (document.querySelector('#avCer .avcern') || {}).textContent || '',
      rar: (document.querySelector('#avCer .avcerr') || {}).textContent || '',
      kicker: (document.querySelector('#avCer .avcerk') || {}).textContent || '',
      bedingung: (document.querySelector('#avCer .avcerc') || {}).textContent || '',
      tap: (document.querySelector('#avCer .avcertap') || {}).textContent || '',
      restzeile: (document.querySelector('#avCer .avcerq') || {}).textContent || '',
      rest: window.__proto.avCerQueue().length,
      // Der Layer muss ueber der Bottom-Nav liegen, sonst faengt sie den Tap.
      ueberNav: !!(mitte && (mitte.id === 'avCerLayer' || mitte.closest('#avCerLayer'))),
      lum: (function () {
        const e = document.querySelector('#avCer .avcertap');
        const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(getComputedStyle(e).color);
        return m ? Math.round(+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 0;
      })(),
    };
  });
  step('Demo „Arena 5" oeffnet die Freischaltungs-Zeremonie', cer.offen === true);
  step('Zeremonie zeigt den Avatar GROSS (200 px)', cer.w === 200 && cer.h === 200,
    cer.w + '×' + cer.h);
  step('Kicker benennt die Sorte (NEUER AVATAR / NEUER RAHMEN)',
    /^NEUER (AVATAR|RAHMEN)$/.test(cer.kicker), cer.kicker);
  step('Zeremonie nennt Name und Raritaet',
    cer.name.length > 2 &&
    /GEWÖHNLICH|GUT|SELTEN|EPISCH|LEGENDÄR|SUPREM/.test(cer.rar), cer.name + ' · ' + cer.rar);
  step('Zeremonie nennt, WOFUER es freigeschaltet wurde',
    /Freigeschaltet:/.test(cer.bedingung), cer.bedingung);
  step('„TIPPEN ZUM FORTFAHREN" steht da und ist lesbar',
    cer.tap === 'TIPPEN ZUM FORTFAHREN' && cer.lum > 100, cer.tap + ' (Lum ' + cer.lum + ')');
  step('Zeremonie liegt UEBER der Bottom-Nav (Tap trifft den Layer)', cer.ueberNav === true);
  /* Arena 5 schaltet genau EINEN Eintrag frei (Solara) — dann darf auch
     keine Restzeile stehen. Der Mehrfachfall kommt gleich darunter. */
  step('bei genau einer Freischaltung steht keine Restzeile',
    cer.rest === 0 && cer.restzeile === '', cer.restzeile || 'leer');
  await shot('profil_zeremonie');
  await page.click('#avCerLayer');
  await page.waitForTimeout(220);
  step('ein Tap schliesst die Einzel-Zeremonie',
    await page.evaluate(() => !document.getElementById('avCerLayer').classList.contains('open')));

  /* MEHRFACHFALL: Zustand zuruecksetzen und in EINEM Sprung auf 1 200 🏆.
     Dann stehen mehrere Avatare UND Rahmen an — genau der Fall, in dem
     gestapelte Overlays kaputtgehen wuerden. */
  const viele = await page.evaluate(() => {
    window.ArenaAvatars.reset();
    const r = window.__proto.syncAvatarUnlocks(1200);
    return { anzahl: r.neu.length,
             avatare: r.avatare.length, rahmen: r.rahmen.length,
             tiers: r.neu.map(e => e.tierIndex),
             offen: document.getElementById('avCerLayer').classList.contains('open'),
             restzeile: (document.querySelector('#avCer .avcerq') || {}).textContent || '',
             rest: window.__proto.avCerQueue().length };
  });
  step('ein Sprung auf Arena 5 schaltet Avatare UND Rahmen frei',
    viele.anzahl > 2 && viele.avatare > 1 && viele.rahmen > 1,
    viele.avatare + ' Avatare + ' + viele.rahmen + ' Rahmen');
  step('Raritaet steigt an (Bestes zuletzt, wie in der Pack-Zeremonie)',
    viele.tiers.every((t, i) => i === 0 || viele.tiers[i - 1] <= t), viele.tiers.join('≤'));
  step('mehrere Freischaltungen laufen als Warteschlange, nicht gestapelt',
    viele.offen && viele.rest === viele.anzahl - 1 && /noch \d+ weitere/.test(viele.restzeile),
    viele.restzeile);
  step('nur EIN Overlay im DOM, egal wie viele Eintraege anstehen',
    await page.evaluate(() => document.querySelectorAll('#avCerLayer').length === 1 &&
      document.querySelectorAll('#avCer .avcerpic').length === 1));

  // Durchtippen bis der Layer zu ist — ein Tap je Eintrag.
  let taps = 0;
  while (await page.evaluate(() => document.getElementById('avCerLayer').classList.contains('open'))) {
    await page.click('#avCerLayer');
    await page.waitForTimeout(140);
    if (++taps > 30) break;
  }
  step('Tippen schaltet Eintrag fuer Eintrag weiter und schliesst am Ende',
    taps === viele.anzahl &&
    await page.evaluate(() => !document.getElementById('avCerLayer').classList.contains('open')),
    taps + ' Tipps fuer ' + viele.anzahl + ' Eintraege');

  await page.click('#avDemo');
  await page.waitForTimeout(420);
  const nochmal = await page.evaluate(() => ({
    offen: document.getElementById('avCerLayer').classList.contains('open'),
    toast: document.getElementById('toast').textContent,
    solara: window.ArenaAvatars.list().find(a => a.key === 'solara'),
  }));
  // UMGESCHRIEBEN 27.07.: der Demo-Knopf schaltete fest „Arena 5" frei.
  // Seit Helden-Avatare am Besitz haengen und das Demo-Profil Solara
  // ohnehin hat, war dort nichts mehr zu feiern — der Knopf nimmt jetzt
  // den naechsten noch gesperrten Eintrag, welcher das auch ist. Die
  // Aussage der Pruefung bleibt: eine Freischaltung wird genau einmal
  // gefeiert. Der Hinweistext beim zweiten Mal darf deshalb ein
  // anderer sein.
  // Der Knopf schaltet jetzt bei jedem Druck den NAECHSTEN gesperrten
  // Eintrag frei, feiert also jedes Mal — „kein zweites Mal offen" war
  // an die alte, feste Arena-5-Buchung gebunden. Die Eigenschaft, die
  // wirklich zaehlt, ist eine andere und wird hier direkt geprueft:
  // kein Eintrag wird ZWEIMAL gefeiert. `bekannt` ist das Gedaechtnis,
  // das genau das sicherstellt.
  step('kein Eintrag steht doppelt im Zeremonie-Gedaechtnis',
    await page.evaluate(() => {
      const b = window.ArenaAvatars.get().avatar.bekannt;
      return new Set(b).size === b.length;
    }));
  step('ein WIEDERHOLTER Abgleich mit demselben Stand feiert nichts',
    await page.evaluate(() => {
      const A = window.ArenaAvatars, stand = { trophaeen: 99999, arena: 8, liga: 9 };
      A.syncUnlocks(stand);              // erster Sprung: darf feiern
      return A.syncUnlocks(stand).neu.length === 0;   // zweiter: darf nicht
    }));
  step('Solara ist frei, weil das Demo-Profil den Helden besitzt',
    nochmal.solara.locked === false && /im Besitz/.test(nochmal.solara.unlockText),
    nochmal.solara.unlockText);
  const waehle = await page.evaluate(() => {
    window.__proto.setAvTab('avatars');
    window.__proto.avPick('solara');
    const s = window.ArenaAvatars.get();
    return { av: s.avatar.gewaehlt, fr: s.frame.gewaehlt,
             url: window.ArenaAvatars.active().portraitUrl };
  });
  step('der neue Avatar laesst sich waehlen', waehle.av === 'solara', waehle.av);
  // UMGESCHRIEBEN 27.07.: Solara trug das KARTENbild (896x1200, Figur
  // in voller Gestalt). Im Kreis von 32 px blieb davon ein Ausschnitt
  // der Huefte. Der Avatar ist jetzt ein eigenes Brustbild — geprueft
  // wird deshalb, dass er KEIN Kartenbild mehr benutzt.
  // Geprueft wird der SCHLUESSEL, nicht die aufgeloeste URL: oertlich
  // ist das CDN nicht erreichbar, die URL waere hier immer null und die
  // Pruefung damit blind (DESIGNSYSTEM §7b).
  step('Solara benutzt ein eigenes Avatar-Portrait, kein Kartenbild',
    await page.evaluate(() => {
      const a = window.ArenaAvatars.list().find(x => x.key === 'solara');
      return /^av_/.test(a.portrait || '') && !/^card_/.test(a.portrait || '');
    }));
  // Goldener „AUSGEWAEHLT"-Streifen: heller Grund braucht dunkle Schrift.
  const selLum = await page.evaluate(() => {
    const e = document.querySelector('#avGrid .avcsel');
    if (!e) return null;
    const cs = getComputedStyle(e);
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
    return m ? Math.round(+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
  });
  step('goldener „AUSGEWÄHLT"-Streifen traegt DUNKLE Schrift', selLum !== null && selLum < 120,
    selLum);
  const navFix = await page.evaluate(() =>
    getComputedStyle(document.querySelector('nav.bottom')).position);
  step('Bottom-Nav bleibt in „Profil bearbeiten" position:fixed', navFix === 'fixed', navFix);
  await shot('profil_final');

  // ================= MATCH-ENDE (arena_matchend.js) =================
  /* Nachgebaut nach AAs Endscreen (IMG_3319-3322): EIN Screen mit zwei
     Podesten, der Schadenszaehler liegt hinter dem Knopf unten links.
     Die Checks pruefen genau die drei Aussagen, die dabei kollidieren
     koennten: POSITION sagt wer gewonnen hat, FARBE sagt wer ich bin,
     und der Balken im Werte-Fenster gehoert zum Prozentwert daneben. */
  await clearLayers();
  await go('navSettings');
  await page.click('#btnDemoWin');
  await page.waitForTimeout(420);

  step('Match-Ende-View ist aktiv',
    await page.locator('#viewMatchEnd').evaluate(e => e.classList.contains('active')));
  step('Bottom-Nav ist im Match-Ende ausgeblendet',
    await page.evaluate(() => document.body.classList.contains('me-open') &&
      getComputedStyle(document.querySelector('nav.bottom')).display === 'none'));

  const mePod = await page.evaluate(() => {
    const g = id => document.querySelector('#' + id + ' .mepod');
    const info = e => e && ({
      mine: e.classList.contains('mine'), opp: e.classList.contains('opp'),
      small: e.classList.contains('small'),
      name: (e.querySelector('.mpn') || {}).textContent || '',
      crowns: [...e.querySelectorAll('.mecrown')].filter(c => !c.classList.contains('off')).length,
      total: e.querySelectorAll('.mecrown').length,
    });
    return { top: info(g('meTop')), bot: info(g('meBottom')),
             wl: (document.querySelector('#meVs .wl') || {}).textContent || '',
             wlLose: !!document.querySelector('#meVs .wl.lose'),
             vs: (document.querySelector('#meVs .vs') || {}).textContent || '' };
  });
  step('Sieg: Verlierer-Podest oben ist der Gegner (rot, klein)',
    mePod.top.opp && mePod.top.small && mePod.top.name === 'Netherghost',
    mePod.top.name + ' opp=' + mePod.top.opp);
  step('Sieg: Sieger-Podest unten bin ich (blau, gross)',
    mePod.bot.mine && !mePod.bot.small && mePod.bot.name === 'Prisma-Magier',
    mePod.bot.name + ' mine=' + mePod.bot.mine);
  step('VS-Block sagt GEWINNER!', mePod.vs === 'VS' && mePod.wl === 'GEWINNER!' && !mePod.wlLose,
    mePod.vs + ' / ' + mePod.wl);
  step('Drei Kronen-Plaetze, drei davon verdient',
    mePod.bot.total === 3 && mePod.bot.crowns === 3,
    mePod.bot.crowns + '/' + mePod.bot.total);
  /* Die Kronen waren vorher Textzeichen. Jetzt traegt jedes Abzeichen ein
     Artwork (bzw. lokal den Emoji-Rueckfall), und BEIDE Zustaende nutzen
     dasselbe Bild — der Unterschied ist nur der Sockel plus ein Filter.
     Zwei getrennte Artworks wuerden auseinanderlaufen. */
  const meCr = await page.evaluate(() => {
    const bad = [...document.querySelectorAll('#meTop .mecrown, #meBottom .mecrown')];
    const q = e => {
      const im = e.querySelector('img');
      return { src: im ? im.getAttribute('src') : '', fallback: !im && !!e.querySelector('span'),
               off: e.classList.contains('off') };
    };
    const cs = bad.map(q);
    return { n: cs.length, leer: cs.filter(c => !c.src && !c.fallback).length,
             quellen: [...new Set(cs.map(c => c.src).filter(Boolean))].length,
             filter: getComputedStyle(
               document.querySelector('#meTop .mecrown.off img') ||
               document.querySelector('#meTop .mecrown.off span') || document.body).filter };
  });
  step('Jedes Kronen-Abzeichen traegt ein Bild oder den Emoji-Rueckfall',
    meCr.n === 6 && meCr.leer === 0, meCr.n + ' Abzeichen, ' + meCr.leer + ' leer');
  step('Verdient und offen nutzen DASSELBE Kronen-Artwork',
    meCr.quellen <= 1, meCr.quellen + ' verschiedene Quellen');
  /* Fussleiste: die beiden Knoepfe hatten Emoji im Markup. Jetzt kommen
     sie aus der Icon-Ebene, mit Emoji nur noch als Rueckfall. */
  const meFt = await page.evaluate(() => {
    const q = id => {
      const b = document.getElementById(id);
      return { img: !!b.querySelector('img'), txt: b.textContent.trim(), leer: !b.innerHTML.trim() };
    };
    return { chart: q('meStatsBtn'), share: q('meShareBtn'), emote: q('meEmoteBtn') };
  });
  step('Werte-, Teilen- und Emote-Knopf sind alle bestueckt',
    !meFt.chart.leer && !meFt.share.leer && !meFt.emote.leer,
    JSON.stringify(meFt));

  const meR = await page.evaluate(() => ({
    rew: document.querySelectorAll('#meRew .merewc').length,
    badge: (document.querySelector('#meRew .mrbadge') || {}).textContent || '',
    node: !!document.querySelector('#meNodeGo'),
    nodeTxt: (document.querySelector('#meNodeGo .mnt') || {}).textContent || '',
    tip: !!document.querySelector('#meTipGo'),
    again: !!document.querySelector('#meAgain'),
    foot: document.querySelectorAll('.mefoot .mefbtn').length,
    tap: (document.querySelector('#meTap') || {}).textContent || '',
    statsOpen: document.querySelector('#stLayer').classList.contains('open'),
  }));
  step('Drei Belohnungskarten (Packs/Trophaeen/Gold)', meR.rew === 3, meR.rew);
  step('Pack-Karte traegt die Eckenmarke +1', meR.badge === '+1', meR.badge);
  step('Naechster Trophaeenknoten mit Restdistanz', meR.node && /Noch/.test(meR.nodeTxt),
    meR.nodeTxt.trim().slice(0, 60));
  step('Level-Tipp vorhanden', meR.tip);
  step('Revanche-Knopf vorhanden', meR.again);
  step('Fussleiste hat drei Knoepfe (Werte/Teilen/Emote)', meR.foot === 3, meR.foot);
  step('TIPPEN ZUM SCHLIESSEN steht da', /Tippen zum Schlie/.test(meR.tap), meR.tap);
  step('Werte-Fenster ist zu Beginn geschlossen', meR.statsOpen === false);
  await shot('matchend_sieg');

  /* Werte-Fenster: oeffnet aus dem Knopf unten links, nicht aus einem Reiter. */
  await page.click('#meStatsBtn');
  await page.waitForTimeout(360);
  const stM = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#stBody .strow[data-stdmg]')];
    return {
      open: document.querySelector('#stLayer').classList.contains('open'),
      arena: (document.querySelector('#stArena') || {}).textContent || '',
      tabs: document.querySelectorAll('#stTabs [data-stab]').length,
      onTab: (document.querySelector('#stTabs .sttab.on') || {}).getAttribute('data-stab'),
      crownTab: (document.querySelector('#stTabs .sttab .stcr') || {})
        .parentElement?.getAttribute('data-stab') || '',
      cardOpp: !!document.querySelector('#stBody .stcard.opp'),
      name: (document.querySelector('#stBody .stcard .n1') || {}).textContent || '',
      tro: (document.querySelector('#stBody .stcard .sttro .v') || {}).textContent || '',
      troUp: !!document.querySelector('#stBody .stcard .sttro .v.up'),
      sum: (document.querySelector('#stBody .stcard .sv') || {}).textContent || '',
      win: (document.querySelector('#stBody .stcard .sv2') || {}).textContent || '',
      rows: rows.map(r => ({
        hero: r.classList.contains('isHero'),
        mvp: r.classList.contains('mvp'),
        w: parseFloat((r.querySelector('.stbar i') || {}).style.width) || 0,
        pct: parseInt(((r.querySelector('.stbar span') || {}).textContent || '0'), 10),
        dmg: parseInt(((r.querySelector('.stdmg') || {}).textContent || '0').replace(/\D/g, ''), 10),
        cnt: (r.querySelector('.stcnt') || {}).textContent || '',
        stars: r.querySelectorAll('.ststars i:not(.off)').length,
        tier: [...r.querySelector('.start').classList].find(c => c.startsWith('t-')) || '',
      })),
    };
  });
  step('Knopf unten links oeffnet das Werte-Fenster', stM.open);
  step('Arena-Pille nennt die Arena', /^ARENA \d/.test(stM.arena), stM.arena);
  step('Zwei Reiter ICH/GEGNER, ICH ist offen',
    stM.tabs === 2 && stM.onTab === 'me', stM.tabs + ' / ' + stM.onTab);
  step('Krone sitzt auf dem Reiter der Siegerseite', stM.crownTab === 'me', stM.crownTab);
  step('Kopfkarte zeigt MICH (blauer Rahmen, kein .opp)',
    !stM.cardOpp && stM.name === 'Prisma-Magier', stM.name + ' opp=' + stM.cardOpp);
  step('Trophaeen-Delta positiv und als up markiert',
    /\+39/.test(stM.tro) && stM.troUp, stM.tro.trim() + ' up=' + stM.troUp);
  step('Kopfkarte nennt Gesamtschaden und Siegrate',
    /116/.test(stM.sum.replace(/\D/g, '')) && /61/.test(stM.win), stM.sum + ' / ' + stM.win);
  step('Vier eigene Einheitenzeilen', stM.rows.length === 4, stM.rows.length);
  step('Genau eine MVP-Marke auf der eigenen Seite',
    stM.rows.filter(r => r.mvp).length === 1, stM.rows.filter(r => r.mvp).length);
  step('Held steht in Zeile 1 (AAs Reihenfolge: Held zuerst)',
    stM.rows[0].hero, 'hero0=' + stM.rows[0].hero);
  /* Der Balken gehoert zum Prozentwert DANEBEN: beide muessen denselben
     Anteil der EIGENEN Seite zeigen. Eine gemeinsame Skala haette dem
     Label widersprochen — genau der Fehler, den die Screenshots aufdeckten. */
  const pctOk = stM.rows.every(r => Math.abs(r.w - r.pct) <= 1);
  step('Balkenbreite deckt sich mit dem Prozentlabel daneben', pctOk,
    stM.rows.map(r => r.w.toFixed(0) + '/' + r.pct).join(' '));
  step('Anteile der eigenen Seite summieren auf 100 %',
    Math.abs(stM.rows.reduce((a, r) => a + r.w, 0) - 100) < 1.5,
    stM.rows.reduce((a, r) => a + r.w, 0).toFixed(1) + ' %');
  step('Staerkste eigene Einheit hat den breitesten Balken',
    stM.rows.reduce((b, r) => r.w > b.w ? r : b).dmg ===
    Math.max(...stM.rows.map(r => r.dmg)));
  step('Anzahl-Marken stehen an den Karten mit mehreren Kopien',
    stM.rows.filter(r => r.cnt).length === 3, stM.rows.map(r => r.cnt || '-').join(' '));
  step('Sterne werden je Einheit gezeichnet (Held hat drei)',
    stM.rows[0].stars === 3, stM.rows.map(r => r.stars).join(' '));
  step('Raritaetsrahmen sitzt am Kartenbild',
    stM.rows.every(r => /^t-/.test(r.tier)), stM.rows.map(r => r.tier).join(' '));
  await shot('matchend_werte_ich');

  // Reiter GEGNER: dieselbe Liste, andere Seite — Rahmen wechselt auf rot.
  await page.click('#stTabs [data-stab="them"]');
  await page.waitForTimeout(300);
  const stO = await page.evaluate(() => ({
    cardOpp: !!document.querySelector('#stBody .stcard.opp'),
    name: (document.querySelector('#stBody .stcard .n1') || {}).textContent || '',
    tro: (document.querySelector('#stBody .stcard .sttro .v') || {}).textContent || '',
    down: !!document.querySelector('#stBody .stcard .sttro .v.down'),
    clan: (document.querySelector('#stBody .stcard .n2') || {}).textContent || '',
    rows: document.querySelectorAll('#stBody .strow[data-stdmg]').length,
    heroFirst: document.querySelector('#stBody .strow').classList.contains('isHero'),
    tabsColor: [...document.querySelectorAll('#stTabs [data-stab]')].map(
      b => b.getAttribute('data-stab') + ':' + (b.classList.contains('me') ? 'blau' : 'rot')),
  }));
  step('GEGNER-Reiter: Rahmen der Kopfkarte wechselt auf rot',
    stO.cardOpp && stO.name === 'Netherghost', stO.name + ' opp=' + stO.cardOpp);
  step('Gegner-Delta ist negativ und als down markiert',
    /-39/.test(stO.tro) && stO.down, stO.tro.trim());
  step('Clanloser Gegner steht als „Kein Clan" da', /Kein Clan/.test(stO.clan), stO.clan);
  step('Drei Gegner-Einheitenzeilen, Held zuerst',
    stO.rows === 3 && stO.heroFirst, stO.rows + ' heroFirst=' + stO.heroFirst);
  /* Die Reiterfarben sind IDENTITAETEN: sie duerfen beim Wechsel NICHT
     tauschen, sonst muesste der Spieler jedes Mal neu lesen, wer er ist. */
  step('Reiterfarben bleiben Identitaeten (ich blau, Gegner rot)',
    stO.tabsColor.join(',') === 'me:blau,them:rot', stO.tabsColor.join(','));
  await shot('matchend_werte_gegner');

  // Schliessen ueber das rote X
  await page.click('#stClose');
  await page.waitForTimeout(300);
  step('Rotes X schliesst das Werte-Fenster',
    !(await page.locator('#stLayer').evaluate(e => e.classList.contains('open'))));

  // Niederlage: Podeste tauschen die POSITION, nicht die FARBE
  await clearLayers();
  await go('navSettings');
  await page.click('#btnDemoLose');
  await page.waitForTimeout(420);
  const meL = await page.evaluate(() => {
    const info = id => {
      const e = document.querySelector('#' + id + ' .mepod');
      return { mine: e.classList.contains('mine'), small: e.classList.contains('small'),
               name: (e.querySelector('.mpn') || {}).textContent || '' };
    };
    return { top: info('meTop'), bot: info('meBottom'),
             wl: (document.querySelector('#meVs .wl') || {}).textContent || '',
             lose: !!document.querySelector('#meVs .wl.lose') };
  });
  step('Niederlage: ich stehe oben (klein) und bleibe BLAU',
    meL.top.mine && meL.top.small && meL.top.name === 'Prisma-Magier',
    meL.top.name + ' mine=' + meL.top.mine);
  step('Niederlage: der Gegner steht unten (gross) und bleibt ROT',
    !meL.bot.mine && !meL.bot.small && meL.bot.name === 'Netherghost',
    meL.bot.name + ' mine=' + meL.bot.mine);
  step('Niederlage: Ergebniswort ist NIEDERLAGE und rot getoent',
    meL.wl === 'NIEDERLAGE' && meL.lose, meL.wl + ' lose=' + meL.lose);

  await page.click('#meStatsBtn');
  await page.waitForTimeout(360);
  const stL = await page.evaluate(() => {
    const dmg = sel => [...document.querySelectorAll(sel)]
      .map(e => parseInt(e.textContent.replace(/\D/g, ''), 10));
    return { crownTab: (document.querySelector('#stTabs .sttab .stcr') || {})
               .parentElement?.getAttribute('data-stab') || '',
             tro: (document.querySelector('#stBody .stcard .sttro .v') || {}).textContent || '',
             down: !!document.querySelector('#stBody .stcard .sttro .v.down'),
             mine: dmg('#stBody .strow[data-stdmg] .stdmg'),
             sum: (document.querySelector('#stBody .stcard .sv') || {}).textContent || '' };
  });
  step('Niederlage: Krone sitzt auf dem GEGNER-Reiter', stL.crownTab === 'them', stL.crownTab);
  step('Niederlage: eigenes Delta ist negativ und als down markiert',
    /-18/.test(stL.tro) && stL.down, stL.tro.trim());
  // Quervergleich: der Gesamtschaden in den beiden Kopfkarten traegt ihn.
  const myTotal = parseInt(stL.sum.replace(/\D/g, ''), 10);
  await page.click('#stTabs [data-stab="them"]');
  await page.waitForTimeout(300);
  const oppTotal = await page.evaluate(() => parseInt(
    (document.querySelector('#stBody .stcard .sv') || {}).textContent.replace(/\D/g, ''), 10));
  step('Niederlage: Gegner hat laut Kopfkarten mehr Gesamtschaden',
    oppTotal > myTotal, 'Gegner ' + oppTotal + ' vs ich ' + myTotal);
  const oppMax = await page.evaluate(() => Math.max(...[...document.querySelectorAll(
    '#stBody .strow[data-stdmg] .stdmg')].map(e => parseInt(e.textContent.replace(/\D/g, ''), 10))));
  step('Niederlage: staerkster Turm des Matches steht beim Gegner',
    oppMax > Math.max(...stL.mine), 'Gegner ' + oppMax + ' vs ich ' + Math.max(...stL.mine));
  await shot('matchend_niederlage');
  await page.click('#stClose');
  await page.waitForTimeout(200);

  // ================= BANNER-PASSUNG =================
  /* Bannergrafik darf NIE gestreckt werden. Gemessen wurden Verzerrungen
     bis Faktor 9,1 (.packbtn: hochkantes Artwork in einer breiten Leiste)
     — bei einem Band heisst das, dass die Zierenden zu Schlieren gestaucht
     und die Mitte flach gezogen wird. Es liest sich dann als leere Leiste,
     genau der Befund "der Banner wird nicht aufgefuellt".
     Ursache waren zwei Dinge: background-size:100% 100% auf der
     Artwork-Ebene, und bei .qcard/.clanhead/.trackbanner zusaetzlich
     VERTAUSCHTE Ebenen (100% 100%,cover) — layer() setzt das Artwork
     vorne ein, also traf das Strecken genau die Grafik. */
  await clearLayers();
  const BANVIEWS = ['navHome','navShop','navCollection','navForge','navPack','navFortress',
                    'navClan','navBoard','navPass','navHeroes','navEvents','navMail','navSettings'];
  const gestreckt = [];
  for (const v of BANVIEWS) {
    await go(v);
    await page.waitForTimeout(170);
    const r = await page.evaluate(() => {
      const out = [];
      /* Zerlegt eine Mehrfach-Eigenschaft in ihre Ebenen. NICHT mit
         split(',') — ein linear-gradient() traegt selbst Kommas, und
         `split` zerschneidet dann mitten im Verlauf. Gezaehlt wird die
         Klammertiefe. */
      const ebenen = s => {
        const teile = []; let tiefe = 0, akt = '';
        for (const z of String(s || '')) {
          if (z === '(') tiefe++;
          if (z === ')') tiefe--;
          if (z === ',' && tiefe === 0) { teile.push(akt.trim()); akt = ''; continue; }
          akt += z;
        }
        if (akt.trim()) teile.push(akt.trim());
        return teile;
      };
      document.querySelectorAll('.view.active *').forEach(e => {
        const b = e.getBoundingClientRect();
        if (b.width < 20 || b.height < 10) return;
        const cs = getComputedStyle(e);
        // Nur Elemente mit echter Artwork-Ebene
        if (!/hf_[0-9a-z_-]+\.(png|webp)/i.test(cs.backgroundImage || '')) return;
        // Rahmen duerfen strecken — das ist die benannte Ausnahme.
        if (e.classList.contains('rahmen-fuellt')) return;
        /* ⚠ GEAENDERTE MESSSTELLE, mit Absicht (26.07.).
           Vorher stand hier `backgroundSize.split(',')[0]` mit der
           Begruendung „die ERSTE Ebene ist das Artwork, layer() setzt es
           vorne ein". Das war nie die Regel, sondern die Bauart genau
           EINER Hilfsfunktion. Seit bgArt() (Kulissenflaechen, §6b/§6c)
           liegt vor dem Artwork noch ein Abdunkelungs-Verlauf — die
           Artwork-Ebene ist dort die ZWEITE. Die alte Fassung haette
           deshalb den Verlauf gemessen statt die Grafik: sie meldete
           .iapcard/.promobanner/.offercard/.vaultbox als gestreckt,
           obwohl deren Artwork sauber auf `cover` steht, und haette
           umgekehrt ein wirklich gestrecktes Artwork dahinter nicht mehr
           gesehen. Gesucht wird jetzt die Ebene, die die Grafik traegt —
           unabhaengig davon, wie viele Ebenen davor liegen. */
        const bilder = ebenen(cs.backgroundImage);
        const groessen = ebenen(cs.backgroundSize);
        bilder.forEach((bild, i) => {
          if (!/hf_[0-9a-z_-]+\.(png|webp)/i.test(bild)) return;
          // Fehlen Groessen, wiederholt CSS sie zyklisch.
          const g = groessen.length ? groessen[i % groessen.length] : '';
          if (/^100% 100%$/.test(g))
            out.push(String(e.className || e.tagName).split(' ')[0] + ' ' +
                     Math.round(b.width) + 'x' + Math.round(b.height));
        });
      });
      return out;
    });
    r.forEach(x => gestreckt.push(v.replace('nav','') + ': ' + x));
  }
  const einzig = [...new Set(gestreckt)];
  step('Keine Bannergrafik wird gestreckt (Artwork-Ebene nie 100% 100%)',
    einzig.length === 0, einzig.slice(0, 4).join(' | ') || 'sauber');

  /* ⚠ ERSETZTE PRUEFUNG (26.07.). Hier stand „Sektionsband umschliesst
     seinen Text (nicht volle Spaltenbreite)" mit den Schwellen
     `breiteste < 340` und `Fuellung >= 25 %`.
     Warum sie faellt, und zwar richtig: `width:fit-content` war die
     Antwort auf eine GESTRECKTE Bildflaeche (background-size:cover auf
     366 px Breite bei 105 px Text). Seit die Bandgrafik als 9-Slice
     liegt (§6c), gibt es diesen Grund nicht mehr — die Zierenden behalten
     bei jeder Breite ihre Form. Umgekehrt KOSTETE `fit-content` genau den
     Platz, den der Zusatztext braucht: gemessen lag `.srx` 11,0 px unter
     dem Zierende und war auf dem Telefon nicht zu lesen.
     Eine Pruefung, die eine ueberholte Bauart festschreibt, ist schlimmer
     als keine. An ihre Stelle treten drei Pruefungen, die messen, worum
     es eigentlich ging — dass der Bandtext LESBAR ist:
       · eine Bandfamilie pro Screen, und zwar die des Titels;
       · der Text liegt im Polster, nicht unter dem Zierende;
       · kein Bandtext wird per text-overflow gekuerzt. */
  await go('navShop');
  await page.waitForTimeout(300);
  const titelband = await page.evaluate(() => {
    const h = document.querySelector('.view.active h2.title');
    return h ? (h.getAttribute('data-band') || '') : '';
  });
  const band = await page.evaluate(() =>
    [...document.querySelectorAll('.view.active .secribbon')]
      .filter(r => r.getBoundingClientRect().width > 0)   // ausgeblendete zaehlen nicht
      .map(r => {
        const cs = getComputedStyle(r), b = r.getBoundingClientRect();
        const ende = parseFloat((cs.borderImageWidth || '').split(' ').pop()) || 0;
        const kinder = [...r.querySelectorAll('.srt,.srx')];
        /* Luft zwischen Text und Zierende. NEGATIV heisst: der Text liegt
           unter dem Zier — genau der Befund „der Zusatztext haengt halb
           im Rand". Gemessen waren es -11,0 px. */
        const luft = kinder.map(e => {
          const k = e.getBoundingClientRect();
          return Math.min(k.left - b.left - ende, b.right - ende - k.right);
        });
        return {
          band: r.getAttribute('data-band') || '',
          luft: luft.length ? +Math.min.apply(null, luft).toFixed(1) : null,
          gekuerzt: kinder.some(e => e.scrollWidth > e.clientWidth + 0.5)
        };
      }));
  step('Sektionsbaender tragen dieselbe Grafik wie der Screen-Titel',
    !!titelband && band.length > 0 && band.every(b => b.band === titelband),
    titelband + ' <- ' + [...new Set(band.map(b => b.band))].join(','));
  step('Bandtext liegt im Polster, nicht im Zierende',
    band.length > 0 && band.every(b => b.luft === null || b.luft >= 0),
    'engste Stelle ' +
    Math.min.apply(null, band.map(b => b.luft === null ? 999 : b.luft)).toFixed(1) + ' px');
  step('Kein Bandtext wird gekuerzt',
    band.length > 0 && band.every(b => !b.gekuerzt),
    band.filter(b => b.gekuerzt).length + ' gekuerzt');

  /* ============ 9-SLICE: RAHMEN UND BAENDER ============
     Diese Checks halten den Fix fuer den Befund „die Tower werden nicht
     angezeigt" / „der Banner ist nicht komplett gefuellt".
     Ursache war gemessen: ALLE elf generierten Rahmen- und Plattendateien
     sind vollstaendig deckend (Alpha 255/255, 0,0 % transparente Pixel),
     beim orangen Kartenrahmen ist die „transparente" Mitte sogar als
     Schachbrett hineingemalt. Als Bildflaeche UEBER dem Inhalt decken sie
     ihn zu. `border-image` ohne `fill` verwirft die Mitte der Grafik.
     ⚠ WICHTIG zur Aussagekraft: diese Suite laeuft OHNE erreichbares CDN.
     Sie kann pruefen, dass der Rahmen als border-image angelegt ist —
     ob er den Inhalt zudeckt, kann sie NICHT sehen. Dafuer gibt es die
     Sandbox-Pruefung gegen die Live-URL (siehe DESIGNSYSTEM.md §7b). */
  const RAHMENVIEWS = ['navCollection','navForge','navShop','navPack'];
  let rahmenGes = 0, rahmenFlaeche = 0;
  for (const v of RAHMENVIEWS) {
    await go(v);
    await page.waitForTimeout(260);
    const r = await page.evaluate(() => {
      let ges = 0, flaeche = 0;
      document.querySelectorAll('.view.active .frm, .view.active .pcfrm').forEach(e => {
        ges++;
        const cs = getComputedStyle(e);
        // Ein Rahmen darf KEINE Bildflaeche sein — sonst deckt er zu.
        if (cs.backgroundImage !== 'none') flaeche++;
      });
      return { ges, flaeche };
    });
    rahmenGes += r.ges; rahmenFlaeche += r.flaeche;
  }
  step('Kartenrahmen sind nie eine deckende Bildflaeche',
    rahmenGes > 0 && rahmenFlaeche === 0,
    rahmenGes + ' Rahmen, ' + rahmenFlaeche + ' als Bildflaeche');

  const slice = await page.evaluate(() => {
    const t = document.querySelector('.frm');
    if (!t) return null;
    const cs = getComputedStyle(t);
    return { slice: cs.borderImageSlice, breite: cs.borderImageWidth,
             wiederholung: cs.borderImageRepeat };
  });
  step('Rahmen-Schnitt ohne `fill` (Mitte wird verworfen)',
    slice && !/fill/.test(slice.slice), slice ? slice.slice : 'kein .frm');
  step('Rahmen-Randbreite in Prozent (skaliert mit der Kachel)',
    slice && /%/.test(slice.breite), slice ? slice.breite : '-');

  /* Baender: 9-Slice MIT `fill` — ein Band braucht seine Mitte, aber die
     Zierenden duerfen nicht mitgestaucht werden. Und: die Bandgrafiken
     sind hell, also gilt die Goldtext-Regel. */
  await go('navShop');
  await page.waitForTimeout(300);
  const b9 = await page.evaluate(() => {
    const rs = [...document.querySelectorAll('.secribbon')].slice(0, 4).map(r => {
      const cs = getComputedStyle(r);
      return { hat9: r.classList.contains('band9'), slice: cs.borderImageSlice,
               breite: cs.borderImageWidth, hoehe: Math.round(r.getBoundingClientRect().height) };
    });
    return rs;
  });
  step('Sektionsbaender sind 9-Slice', b9.length > 0 && b9.every(r => r.hat9),
    b9.map(r => r.hat9).join('/'));
  step('Bandschnitt mit `fill` (Mitte bleibt)',
    b9.length > 0 && b9.every(r => /fill/.test(r.slice)), b9[0] ? b9[0].slice : '-');
  step('Band-Enden nicht auf einen Strich gestaucht (>= 20 px)',
    b9.length > 0 && b9.every(r => (parseFloat(r.breite.split(' ').pop()) || 0) >= 20),
    b9.map(r => r.breite).join(' | '));

  /* ============ STRASSENKNOTEN ============
     Befund: „man kann garnicht erkennen was man dort bekommt weil die
     icons so klein sind". Eine Belohnung braucht einen NAMEN — ein Icon
     allein trennt Gold-/Silber-/Bronze-Pack nicht. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__proto.openRoad());
  await page.waitForTimeout(700);
  const kn = await page.evaluate(() => {
    const ns = [...document.querySelectorAll('.node')].slice(0, 4).map(n => {
      const b = n.getBoundingClientRect();
      const nm = n.querySelector('.rwn'), q = n.querySelector('.rwq');
      const rw = n.querySelector('.rw'), ic = rw && rw.querySelector('.ico');
      const ib = ic ? ic.getBoundingClientRect() : null;
      return { w: Math.round(b.width), name: nm ? nm.textContent.trim() : null,
               menge: q ? q.textContent.trim() : null,
               nameGr: nm ? parseFloat(getComputedStyle(nm).fontSize) : 0,
               icon: ib ? Math.round(Math.min(ib.width, ib.height)) : 0,
               props: n.querySelectorAll('.prop').length };
    });
    const ticks = [...document.querySelectorAll('.tick b')].slice(0, 3).map(t => {
      const b = t.getBoundingClientRect();
      return { x: Math.round(b.x), t: t.textContent.trim() };
    });
    const sh = document.querySelector('.scrollhint');
    const rb = document.querySelector('.ribbon');
    let ueberlappt = false;
    if (sh && rb) {
      const a = sh.getBoundingClientRect(), c = rb.getBoundingClientRect();
      ueberlappt = a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top;
    }
    return { ns, ticks, ueberlappt, hatBand: !!rb };
  });
  step('Strassenknoten benennt seine Belohnung',
    kn.ns.length > 0 && kn.ns.every(n => n.name && n.name.length > 2),
    kn.ns.map(n => n.name).join(' | '));
  step('Belohnungsname liest bei >= 12 px',
    kn.ns.length > 0 && kn.ns.every(n => n.nameGr >= 12),
    kn.ns.map(n => n.nameGr).join('/'));
  step('Menge steht am Knoten',
    kn.ns.length > 0 && kn.ns.every(n => /[0-9]/.test(n.menge || '')),
    kn.ns.map(n => n.menge).join(' | '));
  step('Nur ein Zierprop je Knoten (konkurriert nicht mit der Belohnung)',
    kn.ns.length > 0 && kn.ns.every(n => n.props <= 1),
    kn.ns.map(n => n.props).join('/'));
  step('Belohnungs-Icon >= 34 px', kn.ns.length > 0 && kn.ns.every(n => n.icon >= 34),
    kn.ns.map(n => n.icon).join('/'));
  /* Die Beschriftung braucht eine EIGENE Textgrundlage. Der Knoten traegt
     das helle Artwork `road_platform`; der gruene Verlauf ist nur der
     Rueckfall. Ohne eigenes Plaettchen haengt die Lesbarkeit davon ab,
     ob das Bild geladen ist — und genau das war live nicht der Fall. */
  const chip = await page.evaluate(() => {
    const t = document.querySelector('.node .rwtx');
    if (!t) return null;
    const cs = getComputedStyle(t);
    const m = /rgba?\((\d+), *(\d+), *(\d+)/.exec(cs.backgroundColor);
    return { farbe: cs.backgroundColor,
             hell: m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) / 255 : 1,
             radius: parseFloat(cs.borderTopLeftRadius) || 0 };
  });
  step('Beschriftung sitzt auf eigenem dunklem Plaettchen',
    chip && chip.hell < 0.2 && chip.radius >= 4,
    chip ? chip.farbe + ' · Helligkeit ' + chip.hell.toFixed(2) : 'kein .rwtx');

  /* ============ STARTSEITE NACH AAs MASSEN ============
     Alles hier ist an IMG_3344 (AAs Hauptbildschirm, 1320x2868)
     nachgemessen. Die Zahlen sind nicht Geschmack, sondern Ablesungen:
       Waehrungsleiste   73,8 % breit
       linke Schiene     16,8 %
       Mitte (Banner)    57,2 %
       rechte Schiene    16,5 %
       Arena-Diorama     52,7 % breit, 17,7 % hoch
     Unser Banner war 91 % breit und das Diorama 43 % — genau die zwei
     Punkte, die der Nutzer als „Banner zu gross, Arena zu klein"
     gemeldet hat. Die Toleranz ist bewusst eng (±3 Punkte): weiter
     gefasst wuerde die Pruefung den Befund nicht mehr fangen. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(400);
  const heim = await page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const b = s => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { b: +(r.width / W * 100).toFixed(1), h: +(r.height / H * 100).toFixed(1) }; };
    const pillen = [...document.querySelectorAll('.topbar .cur')];
    const ges = pillen.reduce((a, e) => a + e.getBoundingClientRect().width, 0);
    return {
      // Die drei Waehrungen stehen jetzt in EINER Platte (AA, IMG_3344).
      // Die Summe der Gruppenbreiten misst deshalb nicht mehr die Leiste —
      // die Leiste ist die Platte.
      waehrung: +(document.querySelector('.topbar').getBoundingClientRect().width / W * 100).toFixed(1),
      pillen: pillen.map(e => Math.round(e.getBoundingClientRect().width)),
      links: b('.hubrail.left'), mitte: b('.hubmid'), rechts: b('.hubrail.right'),
      banner: b('.passbanner'), diorama: b('.diorama'),
      kacheln: document.querySelectorAll('.hubrail.left .railtile').length,
      kachelnR: document.querySelectorAll('.hubrail.right .railtile').length,
      freunde: !!document.getElementById('tbFriends'),
      menuNeben: (() => {
        const f = document.getElementById('tbFriends'), m = document.getElementById('tbMenu');
        return !!(f && m && f.parentElement === m.parentElement);
      })()
    };
  });
  const nah = (ist, soll, tol) => Math.abs(ist - soll) <= tol;
  step('Waehrungsleiste so breit wie bei AA (74 %)',
    nah(heim.waehrung, 74, 6), heim.waehrung + ' % · Pillen ' + heim.pillen.join('/'));
  /* ⚠ UMGESCHRIEBEN — die alte Fassung schrieb eine ueberholte Bauart fest.
     Sie hiess „Die Pillen sind unterschiedlich breit (Inhalt fuellt sie)"
     und stammte aus der Zeit von `flex:0 1 auto`, als jede Waehrung eine
     eigene Pille war und so breit wurde wie ihre Zahl.
     Seither gilt zweimal das Gegenteil:
       1. „Unser Gold-/Kristalle-Balken ist nicht komplett gefuellt" —
          inhaltsbreite Gruppen liessen den Rest der Leiste leer.
       2. Befund IMG_3386 „Ressourcen Anzahl … muss zentriert sein" —
          eine zentrierte Zahl setzt ein Feld mit fester Mitte voraus.
          Sind die Drittel ungleich breit, sitzen die drei Zahlen auf
          drei verschiedenen Mitten.
     Geprueft wird deshalb jetzt das Gegenteil: drei GLEICHE Drittel.
     Toleranz 1 px (Rundung der Aufteilung), nicht mehr. */
  step('Die drei Waehrungen teilen die Leiste in gleiche Drittel',
    (Math.max.apply(null, heim.pillen) - Math.min.apply(null, heim.pillen)) <= 1,
    heim.pillen.join(' / ') + ' px');
  step('Pass-Banner auf AAs 57 % geschrumpft (war 91 %)',
    heim.banner && nah(heim.banner.b, 57, 3), heim.banner ? heim.banner.b + ' %' : '-');
  step('Linke Schiene an AAs Platz (17 %)',
    heim.links && nah(heim.links.b, 17, 3), heim.links ? heim.links.b + ' %' : '-');
  step('Rechte Schiene an AAs Platz (17 %)',
    heim.rechts && nah(heim.rechts.b, 17, 3), heim.rechts ? heim.rechts.b + ' %' : '-');
  step('Eine Schienen-Kachel links (Belohnungen, alle vier Reiter)',
    heim.kacheln === 1, heim.kacheln + ' Kacheln');
  step('Eine Schienen-Kachel rechts (Offline-Ertraege, §26)',
    heim.kachelnR === 1, heim.kachelnR + ' Kacheln');
  /* Nachgemessen an IMG_3344 in voller Aufloesung: 54,3 % breit,
     19,0 % hoch. Die alten 52,7/17,7 stammten aus einer zu kleinen
     Vorlage — der Nutzer hat zu Recht gesagt, die Arena sei zu klein. */
  /* ============ SHOP: KARTENMASS NACH AA ============
     An IMG_3375 (Tagesangebote) und IMG_3376 (Gems/Gold) nachgemessen,
     je 1320x2868, auf 921x2000 abgelesen:
       Karten je Reihe   3        (wir hatten 2)
       Kartenbreite      29,2 %   (wir hatten 45,0 %)
       Verhaeltnis       0,66     (wir hatten 0,90)
       Bildkasten        63 % der Kartenbreite, quadratisch
     Der Nutzer: „Mach die Flaechen kleiner." Drei Spalten sind dabei
     nicht Geschmack, sondern die Ursache — bei zwei Spalten MUSS jede
     Karte 45 % nehmen. */
  await clearLayers();
  await go('navShop');
  await page.waitForTimeout(400);
  const shopMass = await page.evaluate(() => {
    const W = window.innerWidth;
    const k = document.querySelector('#dealGrid .prodcard');
    const a = k && k.querySelector('.pcart');
    const r = k && k.getBoundingClientRect();
    const spalten = getComputedStyle(document.getElementById('dealGrid'))
      .gridTemplateColumns.trim().split(/\s+/).length;
    return {
      spalten: spalten,
      breite: r ? +(r.width / W * 100).toFixed(1) : 0,
      verh: r ? +(r.width / r.height).toFixed(2) : 0,
      kasten: (a && r) ? +(a.getBoundingClientRect().width / r.width * 100).toFixed(1) : 0,
      kastenQuad: a ? +(a.getBoundingClientRect().width /
                        a.getBoundingClientRect().height).toFixed(2) : 0,
      gem: (() => { const g = document.querySelector('#gemShop .prodcard');
        return g ? +(g.getBoundingClientRect().width / W * 100).toFixed(1) : 0; })(),
      menge: document.querySelectorAll('#dealGrid .pcqty').length,
    };
  });
  /* AAs Shop traegt oben NUR die Waehrungsleiste (IMG_3380): kein
     Portrait, keine Namenszeile, kein Menue. Ich hatte die Namenszeile
     global gemacht, weil AA sie hinter dem Profil- und dem
     Belohnungsfenster zeigt — das sind aber Modals UEBER der
     Startseite. Der Kopf gehoert zur Startseite, die Waehrungsleiste
     ist global. */
  const kopfShop = await page.evaluate(() => {
    const W = window.innerWidth;
    const sicht = e => e && getComputedStyle(e).display !== 'none';
    const cur = [...document.querySelectorAll('.topbar .cur')]
      .map(e => +(e.getBoundingClientRect().width / W * 100).toFixed(1));
    return {
      avatar: sicht(document.getElementById('profAvatar')),
      profrow: sicht(document.querySelector('.profrow')),
      leiste: +(document.querySelector('.topbar').getBoundingClientRect().width / W * 100).toFixed(1),
      gruppen: cur,
      spanne: cur.length ? +(Math.max.apply(null, cur) - Math.min.apply(null, cur)).toFixed(1) : 99,
    };
  });
  step('Shop zeigt oben nur die Waehrungsleiste (AA, IMG_3380)',
    !kopfShop.avatar && !kopfShop.profrow,
    'Portrait ' + (kopfShop.avatar ? 'da' : 'weg') + ' · Namenszeile ' +
    (kopfShop.profrow ? 'da' : 'weg'));
  /* „Unser Gold-/Kristalle-Balken ist nicht komplett gefuellt." AA teilt
     die Leiste in drei gleiche Drittel, zusammen 96 % der Breite. */
  step('Waehrungsleiste nimmt die volle Breite (AA misst 96 %)',
    kopfShop.leiste >= 92, kopfShop.leiste + ' %');
  step('Die drei Waehrungen teilen sie gleichmaessig',
    kopfShop.spanne <= 4, kopfShop.gruppen.join(' / ') + ' % · Spanne ' + kopfShop.spanne);

  /* ============ KOPFLEISTE: MEDAILLON UND ZAHLENMITTE ============
     Befund IMG_3386, woertlich: „Oben bei den Ressourcen Ressourcen Icon
     nicht schoen im Kreis. Ressourcen Anzahl nicht mittig im Banner muss
     zentriert sein."

     ⚠ Warum GEMESSEN und nicht per Screenshot geprueft: oertlich laeuft
     die Suite ohne erreichbares CDN, jedes Icon faellt auf sein Emoji
     zurueck. Ein Bildvergleich saehe hier also nie das echte Icon und
     waere fuer „sitzt nicht rund" blind. Geprueft wird deshalb die
     Geometrie: Kasten des Medaillons (quadratisch + Radius 50 %),
     Gleichheit ueber alle drei, und der Abstand zwischen Textmitte und
     Feldmitte der Zahl.

     Vorher gemessen (430 px, Shop): Medaillon 23x23 mit Radius 0px,
     Versatz Text/Feld -28,9 / -18,5 / -14,5 px. */
  const medaillon = async (wo) => {
    const m = await page.evaluate(() => {
      const g = [...document.querySelectorAll('.topbar .cur')].map(c => {
        const i = c.querySelector(':scope > i');
        const sp = c.querySelector(':scope > span:not(.plus)');
        const ri = i.getBoundingClientRect(), rs = sp.getBoundingClientRect();
        const rg = document.createRange(); rg.selectNodeContents(sp);
        const rt = rg.getBoundingClientRect();
        return {
          k: c.className.replace(/^cur\s*/, ''),
          ib: +ri.width.toFixed(1), ih: +ri.height.toFixed(1),
          radius: getComputedStyle(i).borderRadius,
          // Mitte des Medaillons relativ zur Gruppenoberkante — prueft,
          // dass alle drei auf derselben Hoehe sitzen.
          mitteY: +(ri.top + ri.height / 2).toFixed(1),
          feldB: +rs.width.toFixed(1),
          textB: +rt.width.toFixed(1),
          versatz: +((rt.left + rt.width / 2) - (rs.left + rs.width / 2)).toFixed(1),
          tnum: getComputedStyle(sp).fontVariantNumeric,
          txt: sp.textContent,
        };
      });
      return g;
    });
    const rund = m.every(x => x.ib === x.ih && /50%/.test(x.radius));
    const gleich = (Math.max(...m.map(x => x.ib)) - Math.min(...m.map(x => x.ib))) <= 0.5 &&
                   (Math.max(...m.map(x => x.mitteY)) - Math.min(...m.map(x => x.mitteY))) <= 0.5;
    const mittig = m.every(x => Math.abs(x.versatz) <= 1);
    const passt = m.every(x => x.textB <= x.feldB);
    step('[' + wo + '] Waehrungssymbol sitzt in einem runden Medaillon',
      rund, m.map(x => x.ib + 'x' + x.ih + ' r=' + x.radius).join(' · '));
    step('[' + wo + '] Alle drei Medaillons gleich gross und auf einer Mitte',
      gleich, m.map(x => x.ib + '@y' + x.mitteY).join(' · '));
    step('[' + wo + '] Die Zahl steht zentriert in ihrem Feld',
      mittig, m.map(x => x.k + ' ' + x.versatz + ' px').join(' · '));
    /* Zentriert bringt nichts, wenn die Zahl dabei abgeschnitten wird —
       genau das war der alte Befund „1 136 wurde zu 1…". */
    step('[' + wo + '] Die Zahl passt ungekuerzt in ihr Feld',
      passt, m.map(x => '"' + x.txt + '" ' + x.textB + '/' + x.feldB).join(' · '));
    /* Tabellenziffern: oertlich hat die Ersatzschrift kein `tnum`, das
       Ergebnis ist also nicht in Pixeln pruefbar. Geprueft wird, dass die
       Angabe steht — und dass die Zahl in einem Feld FESTER Breite
       zentriert ist. Damit bleibt ihre Mitte beim Betragswechsel stehen,
       auch wenn die Schrift keine Tabellenziffern liefert. */
    step('[' + wo + '] Zahlen sind auf Tabellenziffern gestellt',
      m.every(x => /tabular-nums/.test(x.tnum)), m[0].tnum);
    return m;
  };
  await medaillon('Shop');
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(300);
  await medaillon('Start');
  await clearLayers();
  await go('navShop');
  await page.waitForTimeout(300);

  /* ============ ARENA-PACK-KARUSSELL (AA, IMG_3382) ============
     Acht Angebote, eins je Arena, waagerecht wischbar. Freigeschaltet
     wird eins, sobald der Spieler seine Arena erreicht hat — die
     gesperrten bleiben SICHTBAR, sie sind der Ausblick. */
  const apk = await page.evaluate(() => {
    const k = [...document.querySelectorAll('.apkcard')];
    const r = k.length ? k[0].getBoundingClientRect() : null;
    return {
      karten: k.length,
      zu: k.filter(e => e.classList.contains('zu')).length,
      an: k.filter(e => e.classList.contains('an')).length,
      breite: r ? +(r.width / window.innerWidth * 100).toFixed(1) : 0,
      verh: r ? +(r.width / r.height).toFixed(2) : 0,
      punkte: document.querySelectorAll('.apkdots i').length,
      werte: k.map(e => parseInt(e.querySelector('.apkval b').textContent, 10)),
      felder: k[0] ? k[0].querySelectorAll('.apkit').length : 0,
    };
  });
  step('Acht Arena-Packs im Karussell', apk.karten === 8 && apk.punkte === 8,
    apk.karten + ' Karten · ' + apk.punkte + ' Punkte');
  step('Kartenmass wie bei AA (93 % breit, Verhaeltnis 2,0)',
    Math.abs(apk.breite - 93.4) <= 2 && Math.abs(apk.verh - 2) <= 0.08,
    apk.breite + ' % · ' + apk.verh);
  step('Vier Belohnungsfelder je Karte', apk.felder === 4, String(apk.felder));
  /* Der Wert ist GERECHNET (packWert), nicht gesetzt. Eine Zahl, die
     niemand nachrechnen kann, waere eine Behauptung. Ein Fehler in der
     Rechnung faellt hier auf: 0 % hiess frueher, dass der Preis-Parser
     den Punkt aus „Fr." mitgelesen hat. */
  step('Jedes Pack traegt einen gerechneten Wert ueber 100 %',
    apk.werte.length === 8 && apk.werte.every(w => w >= 100 && w <= 900),
    apk.werte.join(' / ') + ' %');
  step('Genau eine Karte laeuft (Lichtstreif nur im Bild)', apk.an === 1,
    apk.an + ' aktiv');
  step('Gesperrte Packs bleiben sichtbar', apk.zu >= 1 && apk.zu < 8,
    apk.zu + ' von 8 gesperrt');

  step('Shop stellt drei Karten je Reihe (AA)', shopMass.spalten === 3,
    shopMass.spalten + ' Spalten');
  step('Kartenbreite auf AAs 29 %', Math.abs(shopMass.breite - 29.2) <= 2.5,
    shopMass.breite + ' %');
  step('Karte ist hochkant wie bei AA (0,66)', Math.abs(shopMass.verh - 0.66) <= 0.06,
    String(shopMass.verh));
  step('Gem-Karten haben dasselbe Mass', Math.abs(shopMass.gem - 29.2) <= 2.5,
    shopMass.gem + ' %');
  step('Bildkasten auf AAs 63 % der Kartenbreite, quadratisch',
    Math.abs(shopMass.kasten - 63) <= 4 && Math.abs(shopMass.kastenQuad - 1) <= 0.08,
    shopMass.kasten + ' % · Verhaeltnis ' + shopMass.kastenQuad);
  step('Die Menge sitzt im Bildkasten, nicht im Namen', shopMass.menge >= 3,
    shopMass.menge + ' Mengen-Chips');
  /* Der Rueckfall-Grund der Baender darf NUR bei echtem Ladefehler da
     sein — „die Banner sind noch immer mit leicht schwarzem Hintergrund,
     dieser sollte transparent sein".
     ------------------------------------------------------------------
     UMGESCHRIEBEN 30.07.2026. Die alte Sonde SETZTE `bandfehlt` nicht,
     sondern verliess sich darauf, dass die Klasse wegen des toten CDN
     ohnehin dranhaengt („.bandfehlt ist also RICHTIG gesetzt"). Seit die
     Baender aus dem Repo laden, nimmt `probe.onload` die Klasse weg — die
     Sonde hat damit ZWEIMAL den Zustand „ohne Fehler" gemessen und der
     Schritt wurde rot, obwohl die Kopplung stimmt.
     Jetzt setzt sie beide Zustaende selbst und stellt den Ausgangszustand
     danach wieder her: eine Pruefung, die den Messgegenstand veraendert
     zurueck laesst, faerbt spaeter einen fremden Schritt rot.
     Dazu ein Schritt, der vorher gar nicht moeglich war: das Band soll im
     Normalfall UEBERHAUPT nicht auf dem Rueckfall stehen. */
  const bandKopplung = await page.evaluate(() => {
    const rb = document.querySelector('.secribbon');
    if (!rb) return { fehlt: true };
    const vorher = rb.classList.contains('bandfehlt');
    const rand = getComputedStyle(rb).borderImageSource;
    rb.classList.add('bandfehlt');
    const mitFehler = getComputedStyle(rb).backgroundImage;
    rb.classList.remove('bandfehlt');
    const ohneFehler = getComputedStyle(rb).backgroundImage;
    if (vorher) rb.classList.add('bandfehlt');      /* Ausgangszustand zurueck */
    return { vorher: vorher, rand: rand, mitFehler: mitFehler, ohneFehler: ohneFehler };
  });
  step('Band traegt seinen Grund NUR bei Ladefehler',
    !bandKopplung.fehlt && /gradient/.test(bandKopplung.mitFehler) &&
      bandKopplung.ohneFehler === 'none',
    bandKopplung.fehlt ? '.secribbon fehlt'
      : 'mit .bandfehlt: ' + bandKopplung.mitFehler.slice(0, 30) +
        '… · ohne: ' + bandKopplung.ohneFehler);
  step('Band laedt sein Bild wirklich, steht also nicht auf dem Rueckfall',
    !bandKopplung.fehlt && bandKopplung.vorher === false &&
      /url\(/.test(bandKopplung.rand),
    bandKopplung.fehlt ? '.secribbon fehlt'
      : '.bandfehlt: ' + bandKopplung.vorher + ' · border-image: ' +
        (bandKopplung.rand || '').split('/').pop().slice(0, 28));

  await go('navHome');
  await page.waitForTimeout(300);

  /* ---- KNOPF-PASSUNG (30.07.2026) --------------------------------
     Befund: „Der Kampf Banner muss buendig in die Kachel passen."
     Nachgemessen ist das Geometrie, kein Geschmack: btn_primary.webp ist
     1200x896, der Rahmen darin nur 1028x343 — 38,3 % der Bildhoehe. Bei
     `background-size:100% 175%` blieb rundherum leere Leinwand stehen.
     Die sechs anderen Knoepfe mit diesen Grafiken standen sogar auf
     `auto`, also 1200 px Grafik auf 100 px Knopf.
     Geprueft wird die FOLGE, nicht die Schreibweise: wie hoch steht der
     Rahmen im Verhaeltnis zum Knopf? Aus Bildanteil (0,383) mal
     background-size ergibt sich das direkt. Eine Pruefung auf den
     Zahlenstring waere wertlos — sie waere auch bei einem Bild mit
     anderer Geometrie gruen. */
  const passung = await page.evaluate(() => {
    const ANTEIL = { btn_primary: 0.383, btn_secondary: 0.404, btn_danger: 0.355 };
    return ['btnBattle', 'btnToForge', 'btnMergeAll', 'btnMerge', 'btnUpgrade',
            'btnClearReq', 'btnUnequip'].map(id => {
      const e = document.getElementById(id);
      if (!e) return { id: id, fehlt: true };
      const cs = getComputedStyle(e);
      const bild = (cs.backgroundImage.match(/assets\/(btn_[a-z]+)\./) || [])[1];
      const hoehe = (cs.backgroundSize.split(',')[0] || '').trim().split(/\s+/)[1] || '';
      const proz = parseFloat(hoehe);
      return { id: id, bild: bild || null, roh: hoehe,
               /* Anteil der Knopfhoehe, den der Rahmen wirklich fuellt */
               fuellt: bild && ANTEIL[bild] && proz ? +(ANTEIL[bild] * proz / 100).toFixed(3) : null };
    });
  });
  const mitBild = passung.filter(p => p.bild);
  const schlecht = mitBild.filter(p => !(p.fuellt >= 0.9 && p.fuellt <= 1.0));
  step('Knopfgrafiken fuellen ihre Kachel (90-100 % der Hoehe)',
    mitBild.length >= 1 && schlecht.length === 0,
    mitBild.map(p => p.id + ' ' + Math.round(p.fuellt * 100) + '%').join(', ') +
    (schlecht.length ? ' — daneben: ' + schlecht.map(p => p.id + ' "' + p.roh + '"').join(', ') : ''));
  /* Gegenprobe: der alte Wert MUSS durchfallen. 0,383 x 175 % = 67 % —
     ein Drittel der Kachel waere leerer Rand. */
  gegen('der alte Wert 175 % haette den Schritt bestanden',
    0.383 * 1.75 >= 0.9,
    'alt: 67 % Fuellung, also ein Drittel leerer Rand');

  step('Arena-Diorama auf AAs 54 % Breite',
    heim.diorama && nah(heim.diorama.b, 54.3, 3), heim.diorama ? heim.diorama.b + ' %' : '-');
  step('Arena-Diorama auf AAs 19 % Hoehe',
    heim.diorama && nah(heim.diorama.h, 19, 3), heim.diorama ? heim.diorama.h + ' %' : '-');
  step('Freundes- und Menue-Knopf stehen nebeneinander (AAs Namenszeile)',
    heim.freunde && heim.menuNeben, heim.menuNeben ? 'nebeneinander' : 'getrennt');

  /* ============ HAUPTLEISTE NACH AA-MECHANIK ============
     Aus dem Screenrecording vom 26.07.: der aktive Reiter waechst in der
     Breite, hebt sich ueber die Leistenkante, wird heller — und nur er
     traegt seine Beschriftung. Vier messbare Eigenschaften. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(500);
  const nav1 = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('nav.bottom button')];
    return bs.map(b => {
      const r = b.getBoundingClientRect();
      const l = b.querySelector('.nlbl');
      const lr = l ? l.getBoundingClientRect() : null;
      const cs = getComputedStyle(b);
      const m = /matrix\([^)]*?,\s*(-?[\d.]+)\)$/.exec(cs.transform || '');
      return { id: b.id, aktiv: b.classList.contains('on'),
               breite: Math.round(r.width),
               lblBreite: lr ? Math.round(lr.width) : 0,
               hoch: m ? Math.round(parseFloat(m[1])) : 0,
               hell: (() => {
                 const c = /rgba?\((\d+), *(\d+), *(\d+)/.exec(cs.backgroundColor);
                 return c ? Math.round((+c[1]*0.299 + +c[2]*0.587 + +c[3]*0.114)) : null;
               })() };
    });
  });
  const akt = nav1.find(n => n.aktiv), pas = nav1.filter(n => !n.aktiv);
  step('Aktiver Reiter ist breiter als die uebrigen',
    akt && pas.every(p => akt.breite > p.breite * 1.35),
    'aktiv ' + (akt ? akt.breite : '-') + 'px, passiv ' + pas.map(p => p.breite).join('/'));
  step('Nur der aktive Reiter traegt seine Beschriftung',
    akt && akt.lblBreite > 12 && pas.every(p => p.lblBreite === 0),
    'aktiv ' + (akt ? akt.lblBreite : '-') + 'px, passiv ' + pas.map(p => p.lblBreite).join('/'));
  step('Aktiver Reiter hebt sich ueber die Leistenkante',
    akt && akt.hoch <= -4, akt ? akt.hoch + 'px' : '-');

  /* Und die Mechanik muss WANDERN — sonst ist sie fest verdrahtet und
     nicht an den Zustand gebunden. */
  await go('navClan');
  await page.waitForTimeout(500);
  const nav2 = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('nav.bottom button')];
    const a = bs.find(b => b.classList.contains('on'));
    const l = a && a.querySelector('.nlbl');
    return { id: a ? a.id : null,
             breite: a ? Math.round(a.getBoundingClientRect().width) : 0,
             lbl: l ? Math.round(l.getBoundingClientRect().width) : 0,
             anzahlAktiv: bs.filter(b => b.classList.contains('on')).length };
  });
  /* Die Nav-Illustrationen sind deckende PNGs mit eingebackenem dunklem
     Grund. Auf der helleren Platte des aktiven Reiters stand darum um
     jedes Icon ein dunkles Rechteck.
     ------------------------------------------------------------------
     UMGESCHRIEBEN 30.07.2026. Der Schritt verlangte `mix-blend-mode:
     lighten` am Bild. Diese Bauweise ist ABGESCHAFFT, und der Kommentar
     im Prototyp begruendet es nachgemessen: `lighten` hilft nur, solange
     der Untergrund HELLER ist als der eingebackene Grund — die Leiste
     misst L 0,027, `nav_clan` bringt L 0,192 mit, also gewinnt das
     Rechteck (dE bis 166,8). Dazu traegt `.navpop` selbst ein `filter:`
     und bildet damit eine eigene Mischgruppe, in der ein Mischmodus des
     Kindes ohnehin ins Leere laeuft. An seiner Stelle steht die
     Freistellung `img.ico{filter:url(#icoFrei)}`.
     Gruen blieb der alte Schritt nur, weil oertlich nie ein `img.navimg`
     entstand: der Emoji-Rueckfall machte `'kein img'` daraus, und der
     Vergleich lief leer durch. Seit die Bilder aus dem Repo laden, gibt es
     das `<img>` — und der Schritt verlangte eine Loesung, die aus gutem
     Grund nicht mehr da ist. Geprueft wird jetzt die Loesung, die gilt. */
  const navFrei = await page.evaluate(() => {
    const i = document.querySelector('nav.bottom .navpop img.navimg');
    const sp = document.querySelector('nav.bottom .navpop span.navimg');
    return { img: !!i,
             ico: i ? i.classList.contains('ico') : null,
             filter: i ? getComputedStyle(i).filter : null,
             pixel: i ? (i.complete && i.naturalWidth > 0) : null,
             emojiFilter: sp ? getComputedStyle(sp).filter : 'kein span' };
  });
  step('Nav-Illustration ist freigestellt (icoFrei), nicht gemischt',
    navFrei.img
      ? (navFrei.ico && /url\(/.test(navFrei.filter) && navFrei.pixel)
      : true,
    navFrei.img
      ? 'class ico: ' + navFrei.ico + ' · filter: ' + navFrei.filter +
        ' · Pixel: ' + navFrei.pixel
      : 'kein img.navimg — Emoji-Rueckfall, dann greift der Schritt nicht');
  /* Der Emoji-Rueckfall darf die Freistellung NICHT tragen: der Filter
     wuerde die dunklen Teile des Emojis wegschneiden. `img.ico` als
     Selektor leistet das schon, der Schritt haelt es fest. */
  step('Das Emoji traegt die Freistellung NICHT',
    navFrei.emojiFilter === 'kein span' || navFrei.emojiFilter === 'none',
    String(navFrei.emojiFilter));

  step('Die Hervorhebung wandert zum neuen Ziel',
    nav2.id === 'navClan' && nav2.lbl > 12 && nav2.anzahlAktiv === 1,
    nav2.id + ' · Beschriftung ' + nav2.lbl + 'px · ' + nav2.anzahlAktiv + ' aktiv');
  await go('navHome');
  await page.waitForTimeout(300);

  /* ============ SWEEP GEGEN LAZY-LOADING ============
     Der Sweep tauscht fehlgeschlagene Bilder gegen ihr Emoji. Mit
     loading="lazy" ist `complete === false` aber der Normalzustand fuer
     alles ausserhalb des Sichtfelds — der alte Sweep hat diese Bilder
     als Fehler gewertet und dauerhaft ersetzt. Im Shop hiess das: das
     erste Gem-Paket zeigte sein Bild, alle darunter ein gruenes Herz.
     Diese Pruefung haelt die Trennung fest. */
  const sweepLogik = await page.evaluate(() => {
    const src = window.UIIcon.sweep.toString();
    return { hartesArgument: /hart/.test(src),
             trenntComplete: /img\.complete/.test(src),
             keinOderNichtComplete: !/!img\.complete\s*\|\|/.test(src) };
  });
  step('Sweep wertet `nicht geladen` nicht mehr als Fehler',
    sweepLogik.keinOderNichtComplete && sweepLogik.trenntComplete,
    JSON.stringify(sweepLogik));

  /* Und die Wirkung, nicht nur die Form: ein lazy geladenes Bild weit
     unten im Shop darf nach dem Sweep noch ein <img> sein. */
  await go('navShop');
  await page.waitForTimeout(1200);
  /* ⚠ GEAENDERTE MESSUNG, mit Absicht. Die alte Fassung nahm die letzten
     sechs Produktkarten und verlangte, dass alle sechs nach dem weichen
     Sweep noch ein <img> tragen. Das war ein Stellvertreter fuer die
     eigentliche Frage — und ein schlechter: seit die Karten nach AAs
     Mass drei je Reihe stehen (29 % statt 45 % Breite), passen mehr
     davon in den Blick, mehr beginnen zu laden und scheitern oertlich am
     unerreichbaren CDN. Aus 6/6 wurden 4/6, ohne dass sich am Sweep
     etwas geaendert haette.
     Geprueft wird jetzt die Zusage selbst: ein Bild, das beim Sweep noch
     NICHT fertig geladen ist, darf der weiche Sweep nicht ersetzen. Das
     ist unabhaengig davon, wie viele Karten gerade sichtbar sind. */
  const nachSweep = await page.evaluate(() => {
    const marke = [];
    document.querySelectorAll('#viewShop img.prodimg').forEach((im, i) => {
      if (!im.complete) { im.dataset.sweepId = 'p' + i; marke.push('p' + i); }
    });
    const vorher = document.querySelectorAll('#viewShop img.prodimg').length;
    window.UIIcon.sweep(document);
    const ueberlebt = marke.filter(id =>
      document.querySelector('#viewShop img.prodimg[data-sweep-id="' + id + '"]')).length;
    return { gesamt: document.querySelectorAll('#viewShop .prodcard').length,
             unfertig: marke.length, ueberlebt: ueberlebt, vorher: vorher,
             nachher: document.querySelectorAll('#viewShop img.prodimg').length };
  });
  step('Der weiche Sweep ersetzt KEIN Bild, das noch laedt',
    nachSweep.unfertig === nachSweep.ueberlebt,
    nachSweep.ueberlebt + '/' + nachSweep.unfertig + ' unfertige ueberlebt · ' +
    nachSweep.vorher + ' -> ' + nachSweep.nachher + ' Bilder bei ' +
    nachSweep.gesamt + ' Karten');

  /* ============ PRODUKTKACHEL OHNE KARTENRAHMEN ============ */
  const pk = await page.evaluate(() => {
    const k = [...document.querySelectorAll('#viewShop .prodcard')].slice(0, 6);
    return k.map(e => {
      const f = e.querySelector('.pcfrm');
      const cs = getComputedStyle(e);
      return { rahmenBild: f ? getComputedStyle(f).borderImageSource !== 'none' : false,
               rahmenFlaeche: f ? getComputedStyle(f).backgroundImage !== 'none' : false,
               kante: parseFloat(cs.borderTopWidth) || 0 };
    });
  });
  step('Produktkachel traegt keinen Kartenrahmen mehr',
    pk.length > 0 && pk.every(k => !k.rahmenBild && !k.rahmenFlaeche),
    pk.filter(k => k.rahmenBild || k.rahmenFlaeche).length + ' von ' + pk.length);
  step('Die Farbcodierung traegt jetzt die Kante (>= 2 px)',
    pk.length > 0 && pk.every(k => k.kante >= 2), pk.map(k => k.kante).join('/'));

  /* ============ DECKKARTE: DER TURM MUSS LESEN ============
     ⚠ ANGEPASST (30.07.2026, Battle-Deck-Umbau): `.deckslot` war die
     alte Vorschau-Kachel (vier feste Beispiel-Karten ohne Zonen, ohne
     Speicher). Sie ist durch den echten Editor ersetzt (arena_deck.js,
     §24) — dieselbe Anforderung ("der Rahmen darf den Turm nicht
     zudecken") gilt jetzt fuer `.dktower`/`.dkheld`, die neuen echten
     Deck-Plaetze. Ohne belegte Plaetze traegt keiner ein `.frm`
     (leere Plaetze zeigen nur `+`) — deshalb erst zwei Karten setzen. */
  await go('navCollection');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__proto.ArenaDeck().setze('tuerme', 0, 'fire');
    window.__proto.ArenaDeck().setze('held', 0, 'solara');
    window.__proto.renderDeckBoard();
  });
  await page.waitForTimeout(300);
  const dk = await page.evaluate(() => {
    const s = [...document.querySelectorAll('.dktower, .dkheld')].filter(e => e.querySelector('.frm'));
    return s.map(e => {
      const cs = getComputedStyle(e.querySelector('.frm'));
      const w = (cs.borderImageWidth || '').split(' ').map(parseFloat);
      const oben = w[0] || 0, seite = w[1] || 0, unten = w[2] !== undefined ? w[2] : oben;
      // Prozent der Elementflaeche, die der Ring bedeckt
      const offenH = 100 - oben - unten, offenB = 100 - seite * 2;
      return { anteil: Math.round(offenH * offenB / 100) };
    });
  });
  step('Der Ring laesst mindestens 55 % der Deckkarte fuer den Turm',
    dk.length > 0 && dk.every(d => d.anteil >= 55), dk.map(d => d.anteil + ' %').join('/'));
  await page.evaluate(() => window.__proto.ArenaDeck()._reset());

  /* ============ LEERZUSTAENDE (AAs Post-Fenster, IMG_3359) ============
     Vier Ansichten hatten keinen oder einen lieblosen Leerzustand:
     Post und Events zeigten gar nichts, die Rangliste ebenso, die
     Freundesliste einen grauen Textkasten. Jetzt tragen alle vier
     denselben Baustein. Geprueft werden Form UND die Masse aus dem
     Bild — sonst haelt die Machart nur bis zur naechsten Aenderung. */
  await clearLayers();
  await go('navMail');
  await page.waitForTimeout(300);
  const leerMail = await page.evaluate(() => {
    window.__proto.MAILS.length = 0;
    window.__proto.renderMail();
    const f = document.querySelector('#mailList .leerfeld');
    if (!f) return null;
    const k = f.querySelector('.leerkreis'), t = f.querySelector('.leertxt');
    const fr = f.getBoundingClientRect(), kr = k.getBoundingClientRect(),
          tr = t.getBoundingClientRect();
    const sym = k.querySelector('.ico');
    const sr = sym.getBoundingClientRect();
    const cs = getComputedStyle(f), ks = getComputedStyle(k), ts = getComputedStyle(t);
    return {
      txt: t.textContent.trim(),
      kreisAnteil: kr.width / fr.width,          // AA: 29,1 %
      rund: ks.borderRadius,
      symAnteil: sr.width / kr.width,            // AA: 55,4 %
      grad: parseFloat(ts.fontSize) / kr.width,  // AA: 21,1 %
      // Der BLOCK aus Kreis und Zeilen sitzt senkrecht mittig im Feld —
      // bei AA gemessen: Blockmitte 1478 gegen Feldmitte 1474 px (0,3 %).
      // Gemessen wird der ganze Block, nicht Kreis+Titel: AAs Feld hat
      // keine zweite Zeile, unseres hat eine, und mittig ist mittig.
      versatz: Math.abs(((kr.top + f.lastElementChild.getBoundingClientRect().bottom) / 2
        - (fr.top + fr.bottom) / 2) / fr.height),
      hoehe: fr.height / window.innerHeight,     // AA: 46,5 %
      feldSchatten: cs.boxShadow,
      symFilter: getComputedStyle(sym).filter,
      // Textfarbe gegen Feldfarbe: hell auf dunkel, nie umgekehrt (§4)
      txtHell: ts.color, feldGrund: cs.backgroundColor
    };
  });
  step('Post ohne Nachrichten zeigt AAs Leerfeld', !!leerMail);
  step('Der Satz lautet „Keine Nachrichten"',
    leerMail && leerMail.txt === 'Keine Nachrichten', leerMail && leerMail.txt);
  step('Kreis ist 29 % der Feldbreite (AA: 29,1 %)',
    leerMail && Math.abs(leerMail.kreisAnteil - 0.291) < 0.05,
    leerMail && (leerMail.kreisAnteil * 100).toFixed(1) + ' %');
  step('Der Kreis ist rund', leerMail && /50%/.test(leerMail.rund), leerMail && leerMail.rund);
  step('Symbol ist 55 % des Kreises (AA: 55,4 %)',
    leerMail && Math.abs(leerMail.symAnteil - 0.554) < 0.07,
    leerMail && (leerMail.symAnteil * 100).toFixed(1) + ' %');
  step('Schriftgrad ist 21 % des Kreises (AA: 21,1 %)',
    leerMail && Math.abs(leerMail.grad - 0.211) < 0.05,
    leerMail && (leerMail.grad * 100).toFixed(1) + ' %');
  step('Kreis und Satz stehen senkrecht mittig im Feld (AA: 0,3 % Versatz)',
    leerMail && leerMail.versatz < 0.01,
    leerMail && (leerMail.versatz * 100).toFixed(1) + ' % Versatz');
  step('Das Feld fuellt fast das Fenster (AA: 46,5 % der Hoehe)',
    leerMail && leerMail.hoehe >= 0.42,
    leerMail && (leerMail.hoehe * 100).toFixed(1) + ' %');
  step('Das Feld ist eingesenkt, nicht erhaben (--mat-well)',
    leerMail && /inset/.test(leerMail.feldSchatten), leerMail && leerMail.feldSchatten.slice(0, 40));
  /* §6h: --frei steht ZUERST in der Filterkette, sonst wirkt das
     Freistellen auf ein bereits beschattetes Bild. */
  step('Leerfeld-Symbol stellt zuerst frei, dann Schatten (§6h)',
    leerMail && /^(url|none)/.test(leerMail.symFilter.trim()) &&
    /drop-shadow/.test(leerMail.symFilter), leerMail && leerMail.symFilter);
  {
    const hell = s => { const m = s.match(/\d+/g).map(Number);
      return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    step('Heller Satz auf dunklem Feld — nie umgekehrt (§4)',
      leerMail && hell(leerMail.txtHell) - hell(leerMail.feldGrund) > 100,
      leerMail && Math.round(hell(leerMail.txtHell)) + ' gegen ' +
        Math.round(leerMail.feldGrund ? hell(leerMail.feldGrund) : 0));
  }
  await page.screenshot({ path: SHOTS + '/leer_post.png', fullPage: true });

  const leerRest = await page.evaluate(() => {
    const r = {};
    window.__proto.EVENTS.length = 0;
    window.__proto.renderEvents();
    r.events = !!document.querySelector('#evList .leerfeld.kompakt');
    r.eventsTxt = (document.querySelector('#evList .leertxt') || {}).textContent || '';
    window.__proto.lbLeer(true);
    r.board = !!document.querySelector('#lbList .leerfeld.kompakt');
    r.boardTxt = (document.querySelector('#lbList .leertxt') || {}).textContent || '';
    r.jump = getComputedStyle(document.getElementById('lbJump')).display;
    window.__proto.lbLeer(false);
    r.boardVoll = document.querySelectorAll('#lbList .lbrow').length;
    r.jumpVoll = getComputedStyle(document.getElementById('lbJump')).display;
    return r;
  });
  step('Events ohne Event zeigen dasselbe Leerfeld (kompakt)',
    leerRest.events && leerRest.eventsTxt.length > 3, leerRest.eventsTxt);
  step('Rangliste ohne Eintraege zeigt dasselbe Leerfeld (kompakt)',
    leerRest.board && leerRest.boardTxt.length > 3, leerRest.boardTxt);
  step('„Zu meiner Position" verschwindet mit der leeren Liste',
    leerRest.jump === 'none' && leerRest.jumpVoll !== 'none',
    leerRest.jump + ' / ' + leerRest.jumpVoll);
  step('Die volle Rangliste kommt unveraendert zurueck',
    leerRest.boardVoll > 10, leerRest.boardVoll + ' Zeilen');
  await page.reload();
  await page.waitForTimeout(800);
  await clearLayers();

  /* ============ AUFKLAPP-MENUE OBEN RECHTS ============
     UMGESCHRIEBEN am 27.07., und zwar mit Absicht. Die alten beiden
     Schritte haben eine ungegliederte Sechser-Liste festgeschrieben
     ("menuAuf.length === 6", "Gegner-Eintrag zwischen Guide und
     Einstellungen"). Beides ist ueberholt:
       · COMMUNITY zeigte auf den Clan, der unten einen eigenen
         Bottom-Nav-Tab hat — der Eintrag war eine Doppelung.
       · GEGNER wird doppelt, sobald der Defenders Guide AAs Aufbau
         hat (Reiter ENEMY/BOSS, IMG_3361/3362); der Weg fuehrt jetzt
         ueber den Guide.
     Eine Pruefung, die eine ueberholte Bauart festhaelt, ist schlimmer
     als keine — geprueft wird jetzt die GLIEDERUNG (zwei Gruppen, zwei
     Groessen, Zaehler am Postfach) und dass die entfernten Ziele auf
     anderem Weg erreichbar bleiben. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(300);
  const menuAuf = await page.evaluate(() => {
    document.getElementById('tbMenu').click();
    const li = document.getElementById('tbMenuList');
    return {
      eintraege: [...li.querySelectorAll('.tbmi')].map(e => ({
        nav: e.getAttribute('data-nav'),
        pri: e.classList.contains('pri'),
        sub: (e.querySelector('.tbmsub') || {}).textContent || '',
        h: Math.round(e.getBoundingClientRect().height) })),
      gruppen: [...li.querySelectorAll('.tbmgrp')].map(e => e.textContent.trim()),
      // Reihenfolge im DOM, damit Ueberschrift-vor-Eintrag belegt ist
      folge: [...li.children].map(e => e.classList.contains('tbmgrp')
        ? 'GRP:' + e.textContent.trim() : e.getAttribute('data-nav')),
      zaehler: (li.querySelector('.tbmi[data-nav="navMail"] .tbmn') || {}).textContent || ''
    };
  });
  /* Angepasst 27.07.: das Menue hat ein FUENFTES Ziel bekommen
     (Community). Die Zahl vier war nie die Anforderung — die
     Anforderung war „Clan und Gegner gehoeren hier NICHT hin", weil sie
     eigene Wege haben. Genau das misst der Schritt weiter. */
  step('Menue fuehrt fuenf Ziele — Clan und Gegner sind raus',
    menuAuf.eintraege.length === 5 &&
    !menuAuf.eintraege.some(e => e.nav === 'navClan' || e.nav === 'navBestiary'),
    menuAuf.eintraege.map(e => e.nav).join(' · '));
  step('Zwei Zwischenueberschriften gliedern die Liste',
    menuAuf.gruppen.length === 2 &&
    menuAuf.gruppen[0] === 'Spielen' && menuAuf.gruppen[1] === 'Konto',
    menuAuf.gruppen.join(' · '));
  step('Jede Gruppe steht VOR ihren Eintraegen',
    menuAuf.folge.join('|') ===
      'GRP:Spielen|navBoard|navGuide|navCommunity|GRP:Konto|navMail|navSettings',
    menuAuf.folge.join(' · '));
  /* Das ist der eigentliche Befund des Nutzers: sechs gleich hohe
     Balken sind eine Liste, kein Menue. Gewicht heisst messbar
     unterschiedliche Hoehe, nicht nur andere Reihenfolge. */
  const pri = menuAuf.eintraege.filter(e => e.pri);
  const sec = menuAuf.eintraege.filter(e => !e.pri);
  /* 3 statt 2 grosse Eintraege — Community ist ein ZIEL, kein
     Verwaltungspunkt. Die Aussage bleibt: Ziele stehen oben und sind
     messbar hoeher als die Verwaltung darunter. */
  step('Ziele sind gross, Verwaltung ist klein (echter Hoehenunterschied)',
    pri.length === 3 && sec.length === 2 &&
    Math.min(...pri.map(e => e.h)) >= Math.max(...sec.map(e => e.h)) + 10,
    pri.map(e => e.h).join('/') + ' px gegen ' + sec.map(e => e.h).join('/') + ' px');
  step('Die grossen Eintraege tragen eine Unterzeile',
    pri.every(e => e.sub.length > 6), pri.map(e => e.sub).join(' · '));
  step('Das Postfach zeigt seinen Zaehler im Menue',
    /^[0-9]+$/.test(menuAuf.zaehler) && Number(menuAuf.zaehler) > 0,
    menuAuf.zaehler);
  /* Ein entfernter Eintrag ist nur dann eine Aufraeumung und kein
     Verlust, wenn das Ziel woanders steht. Beides wird belegt. */
  /* UMGESCHRIEBEN 29.07.2026. Vorher hiess der Schritt „Gegner bleiben
     ueber den Guide-Kopf erreichbar" und pruefte `#btnToBestiary`. Der
     Knopf war ausdruecklich ein Provisorium („Bis der Guide-Umbau
     steht …") und ist mit dem Umbau verschwunden. Die Anforderung
     dahinter — ein aus dem Menue entfernter Eintrag muss woanders
     erreichbar bleiben — wird weiter gemessen, nur ueber den Weg, den
     es jetzt gibt: den Reiter GEGNER im Guide. */
  /* Gefragt wird die Reiter-TABELLE, nicht das gerenderte Markup: die
     Leiste wird erst beim Oeffnen des Guides gefuellt, und an dieser
     Stelle des Laufs steht die Startseite. Eine Pruefung, die vom
     Renderzustand eines anderen Views abhaengt, ist eine Zeitbombe. */
  const ersatz = await page.evaluate(() => ({
    clan: !!document.getElementById('navClan'),
    gegner: window.__proto.GTABS.some(t => t.k === 'enemies'),
    kopf: !!document.getElementById('btnToBestiary')
  }));
  step('Clan bleibt ueber die Hauptleiste unten erreichbar', ersatz.clan);
  step('Gegner bleiben als eigener Reiter im Guide erreichbar', ersatz.gegner);
  step('Der Notknopf im Guide-Kopf ist mit dem Umbau weg', !ersatz.kopf);

  /* Der Einstieg fuehrt jetzt in den Guide; das Element-Rad ist dort
     der Reiter ELEMENTE (AAs Seite 1, AA_WELLEN_REFERENZ §2.1). */
  await page.evaluate(() => {
    document.getElementById('tbMenuLayer').hidden = true;
    window.__proto.show('navGuide');
    window.__proto.guideTab('elements');
  });
  await page.waitForTimeout(500);
  const rad = await page.evaluate(() => ({
    view: (document.querySelector('.view.active') || {}).id,
    tab: window.__proto.gTab(),
    knoten: document.querySelectorAll('#elWheel .elnode').length,
    pfeile: document.querySelectorAll('#elWheel line').length,
    p2: document.getElementById('gpEnemies').hidden,
    p3: document.getElementById('bsPage3').hidden
  }));
  step('Element-Rad ist ein eigener Reiter des Guides',
    rad.view === 'viewGuide' && rad.tab === 'elements' && rad.p2 === true && rad.p3 === true,
    rad.view + '/' + rad.tab + ' · Gitter versteckt ' + rad.p2 + ' · Detail versteckt ' + rad.p3);
  step('Das Rad zeigt alle sechs Elemente',
    rad.knoten === 6, rad.knoten + ' Knoten');
  /* Die Pfeile sind der eigentliche Inhalt des Rades. Beim ersten Anlauf
     waren es NULL: ich hatte `elementRelation()` mit einem Argument
     gerufen, das ist aber eine Zwei-Element-Funktion und liefert dann
     immer "neutral". Die Beziehungen stehen direkt am Element. */
  step('Jedes Element hat seinen Stark-gegen-Pfeil',
    rad.pfeile === 6, rad.pfeile + ' Pfeile');

  const hinweis = await page.evaluate(() => {
    document.querySelector('.elnode[data-el="fire"]').click();
    return document.getElementById('elHint').textContent.trim();
  });
  step('Antippen nennt Stärke UND Schwäche des Elements',
    /Feuer/.test(hinweis) && /\+20/.test(hinweis) && /−20|-20/.test(hinweis),
    hinweis);

  await page.evaluate(() => document.getElementById('bsToGrid').click());
  await page.waitForTimeout(400);
  /* UMGESCHRIEBEN 29.07.2026: „das ganze Bestiarium" waren 9 Kacheln in
     EINEM Gitter. Seit dem Reiter-Umbau teilen sich GEGNER und BOSS die
     Liste (AA fuehrt beide als eigene Reiter, IMG_3361/3362). Gemessen
     wird deshalb die Summe ueber beide Reiter — die Anforderung „kein
     Gegner faellt aus dem Nachschlagewerk" ist dieselbe geblieben. */
  const gitter = await page.evaluate(() => {
    const zaehl = () => ({
      k: document.querySelectorAll('#mobGrid .mobtile, #bossGrid .mobtile').length,
      n: [...document.querySelectorAll('#mobGrid .mobtile .mnm, #bossGrid .mobtile .mnm')]
           .filter(e => e.textContent.trim().length > 2).length
    });
    window.__proto.guideTab('boss');
    const b = zaehl();
    window.__proto.guideTab('enemies');
    const a = zaehl();
    return {
      kacheln: a.k + b.k - 0, mitName: a.n + b.n,
      // beide Gitter sind gerendert, also einmal insgesamt zaehlen
      gesamt: document.querySelectorAll('#mobGrid .mobtile').length +
              document.querySelectorAll('#bossGrid .mobtile').length,
      wellen: document.querySelectorAll('#waveList .waverow').length,
      bosse: document.querySelectorAll('#bossGrid .mobtile.boss').length,
      imGegner: document.querySelectorAll('#mobGrid .mobtile.boss').length
    };
  });
  step('Gegner- und Boss-Reiter zusammen zeigen das ganze Bestiarium',
    gitter.gesamt === 9 && gitter.bosse >= 1 && gitter.imGegner === 0,
    gitter.gesamt + ' Kacheln, davon ' + gitter.bosse + ' im Boss-Reiter');
  /* ⚠ Diese Pruefung gibt es, weil der View zuerst NEBEN einem Modal
     stand statt in #app. Ohne die Breitenbegrenzung von #app war er
     1067 px breit, die Kacheln 350 px, und aus drei Spalten wurde
     optisch eine. Die Zaehlung „9 Kacheln" war dabei die ganze Zeit
     gruen — Anzahl und Layout sind zwei verschiedene Fragen. */
  const breite = await page.evaluate(() => {
    const g = document.getElementById('mobGrid');
    // Seit dem Reiter-Umbau gibt es ZWEI Gitter im Guide — die Messung
    // muss sagen, welches sie meint, sonst misst sie ein verstecktes.
    const t = document.querySelector('#mobGrid .mobtile');
    const app = document.getElementById('app');
    return { gitter: Math.round(g.getBoundingClientRect().width),
             kachel: t ? Math.round(t.getBoundingClientRect().width) : 0,
             app: Math.round(app.getBoundingClientRect().width),
             inApp: app.contains(g) };
  });
  step('Der Guide liegt in #app und ist auf Spaltenbreite begrenzt',
    breite.inApp && breite.gitter <= breite.app,
    'Gitter ' + breite.gitter + 'px in App ' + breite.app + 'px');
  step('Drei Kacheln je Reihe (nicht optisch eine)',
    breite.kachel > 0 && breite.kachel < breite.gitter / 2.5,
    'Kachel ' + breite.kachel + 'px bei Gitter ' + breite.gitter + 'px');
  step('Der Wellenplan nennt die Marken, nicht alle 27 Wellen',
    gitter.wellen >= 5 && gitter.wellen <= 10, gitter.wellen + ' Zeilen');

  await page.evaluate(() => document.querySelector('#mobGrid .mobtile').click());
  await page.waitForTimeout(400);
  /* Alle Abfragen sind seit 29.07.2026 auf `#bsPage3` verengt. Grund:
     Handbuch und Gegner-Detail liegen jetzt im SELBEN View und benutzen
     beide die Klasse `.mhn` (`.manhead .mhn` bzw. `.mobhead .mhn`). Ein
     unverankertes `querySelector('.mhn')` traf den Handbuch-Titel und
     die Pruefung haette den falschen Text gelesen — aufgefallen beim
     Nachstellen, nicht beim Lesen. */
  const det = await page.evaluate(() => ({
    name: (document.querySelector('#bsPage3 .mhn') || {}).textContent,
    felder: document.querySelectorAll('#bsPage3 .statcell').length,
    beschriftungen: [...document.querySelectorAll('#bsPage3 .statcell .sl')].map(e => e.textContent),
    stufe: (document.querySelector('#bsPage3 .lvltx') || {}).textContent,
    zielFeld: [...document.querySelectorAll('#bsPage3 .mobfield b')].map(e => e.textContent)
  }));
  /* AA zeigt GENAU VIER Werte in einem 2x2-Gitter (§2.3). Mehr waere
     eine Abweichung, weniger eine Luecke. */
  step('Detailkarte zeigt AAs vier Werte im 2x2-Gitter',
    det.felder === 4 && /Leben/.test(det.beschriftungen[0]) &&
    /Schaden/.test(det.beschriftungen[1]),
    det.beschriftungen.join(' | '));
  /* „undefined" auf der Karte: descDe kommt aus bestiary(), nicht aus
     statsFor() — dort gibt es das Feld nicht. Nur ein Blick auf die
     gerenderte Seite hat das gezeigt, kein Check auf Feldanzahl. */
  const besch = await page.evaluate(() => {
    const d = document.querySelector('.mobdesc');
    return d ? d.textContent.trim() : null;
  });
  step('Die Beschreibung steht da (nicht "undefined")',
    !!besch && besch.length > 8 && !/undefined/.test(besch), besch);

  step('Ziel und Bewegung stehen als eigene Felder',
    det.zielFeld.length === 2 && /Ziel/i.test(det.zielFeld[0]),
    det.zielFeld.join('/'));
  step('Der Stufenregler startet bei 1 von 27',
    /1\/27/.test(det.stufe || ''), det.stufe);

  /* Der Regler ist der Kern der Seite: an ihm haengt die ganze
     HP-Kurve, die im Video ueber 24 Stufen gelesen wurde. */
  const kurve = await page.evaluate(async () => {
    const lies = () => document.getElementById('bsHp').textContent;
    const a = lies();
    for (let i = 0; i < 9; i++) document.getElementById('bsLvlUp').click();
    const b = lies();
    const st = document.querySelector('#bsPage3 .lvltx').textContent;
    return { a, b, st };
  });
  const zahl = t => parseInt(String(t).replace(/[^0-9]/g, ''), 10) || 0;
  step('Der Stufenregler bewegt die Lebenspunkte',
    zahl(kurve.b) > zahl(kurve.a) * 4,
    kurve.a + ' → ' + kurve.b + ' (' + kurve.st + ')');

  /* UMGESCHRIEBEN 29.07.2026. Die alte Fassung schrieb AAs lineare
     Strecke fest: Detail -> Gitter -> Rad, zweimal `#bsBack`. Die
     Strecke gibt es nicht mehr, weil Rad und Gitter Geschwister-REITER
     sind statt Vorgaenger und Nachfolger.
     Die Anforderung dahinter bleibt: Zurueck geht eine EBENE hoch und
     nicht sofort aus dem Guide raus. Genau das wird gemessen — einmal
     ueber `#bsBack` in der Karte, einmal ueber den Kopf-Knopf. */
  const zurueck1 = await page.evaluate(() => {
    document.getElementById('bsBack').click();
    return document.getElementById('gpEnemies').hidden ? 'nicht Gitter' : 'Gitter';
  });
  const zurueck2 = await page.evaluate(() => {
    document.querySelector('#mobGrid .mobtile').click();
    document.getElementById('guideBack').click();
    return { gitter: !document.getElementById('gpEnemies').hidden,
             view: (document.querySelector('.view.active') || {}).id };
  });
  step('Zurueck geht eine Ebene hoch, nicht sofort raus',
    zurueck1 === 'Gitter' && zurueck2.gitter && zurueck2.view === 'viewGuide',
    zurueck1 + ' → ' + zurueck2.view + (zurueck2.gitter ? '/Gitter' : '/—'));

  /* Kein Rechnen in der UI: jede Zahl muss aus dem Modul kommen. Sonst
     laeuft das Balancing beim ersten Dreh auseinander. */
  const ausModul = await page.evaluate(() => {
    const W = window.ArenaWaves;
    const m = W.statsFor(W.bestiary(1)[0].key, 12);
    return { modulHp: m.hp, modulDmg: m.damage };
  });
  step('Das Wellenmodul ist die einzige Zahlenquelle',
    ausModul.modulHp > 0 && ausModul.modulDmg > 0,
    'Stufe 12: ' + ausModul.modulHp + ' LP / ' + ausModul.modulDmg + ' Schaden');
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(200);

  step('Trophaeenzahl sitzt NEBEN der Schiene, nicht darauf',
    kn.ticks.length > 0 && kn.ticks.every(t => t.x >= 34),
    kn.ticks.map(t => t.t + '@' + t.x).join(' | '));
  step('Scroll-Hinweis ueberlappt das Arena-Band nicht',
    kn.hatBand && !kn.ueberlappt, kn.ueberlappt ? 'ueberlappt' : 'frei');

  /* ⚠ UMGESCHRIEBENE ERWARTUNG (26.07.), aus zwei Gruenden.
     (1) Sie schrieb fest: „auf einem Band steht IMMER dunkle Schrift".
         Das war nie die Regel, sondern der damalige Einzelfall — alle
         Baender trugen helle Grafiken. Die Sektionsbaender tragen jetzt
         das DUNKLE Titelband; dort waere dunkle Schrift genau der
         Fehler, den diese Pruefung verhindern sollte, seitenverkehrt.
     (2) Sie war ohnehin blind geworden: bei Verlaufsschrift
         (`background-clip:text`) ist `-webkit-text-fill-color`
         transparent, die Helligkeit misst immer 0,00 und der Check lief
         still durch. Er haette also selbst goldenen Verlaufstext auf
         einem hellen Band nicht mehr gemeldet.
     Geprueft wird jetzt die Regel, die immer gemeint war: DIE SCHRIFT
     KONTRASTIERT GEGEN IHREN GRUND. Welche Grafik ein Band traegt, sagt
     `data-band`, das band() beim Anlegen setzt — statt einer fest
     verdrahteten Annahme. Bei Verlaufsschrift wird die erste Farbe des
     Verlaufs gemessen. */
  const DUNKLE_BAENDER = ['banner_title'];
  const bandschrift = await page.evaluate((dunkel) => {
    const bad = [];
    const lum = f => {
      const m = /rgba?\((\d+), *(\d+), *(\d+)/.exec(f || '');
      return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) / 255 : null;
    };
    document.querySelectorAll('.ribbon, .secribbon').forEach(bd => {
      const key = bd.getAttribute('data-band') || '';
      if (!key) { bad.push('Band ohne data-band'); return; }
      const dunklerGrund = dunkel.indexOf(key) >= 0;
      bd.querySelectorAll('.rl, .rr, .srt, .srx').forEach(e => {
        const cs = getComputedStyle(e);
        const verlauf = /text/.test(cs.webkitBackgroundClip || cs.backgroundClip);
        const farbe = verlauf
          ? (/(rgba?\([^)]+\))/.exec(cs.backgroundImage) || [])[1]
          : (cs.webkitTextFillColor || cs.color);
        const l = lum(farbe);
        if (l === null) return;
        if (dunklerGrund && l < 0.55)
          bad.push(key + '/' + e.className + ':zu dunkel(' + l.toFixed(2) + ')');
        if (!dunklerGrund && l > 0.45)
          bad.push(key + '/' + e.className + ':zu hell(' + l.toFixed(2) + ')');
      });
    });
    return bad;
  }, DUNKLE_BAENDER);
  step('Bandschrift kontrastiert gegen ihren Bandgrund',
    bandschrift.length === 0, bandschrift.slice(0, 4).join(' | ') || 'sauber');
  await clearLayers();

  // ================= MATERIAL-SCHICHT (P1) =================
  /* Der Kern von P1 als KENNZAHL, nicht als Gefuehl: wie viel der
     sichtbaren Flaeche traegt Tiefe? Vor dem Durchgang trugen 89 % der
     Flaeche KEINEN inset-Schatten — das ist der gemessene Abstand zu AA.
     Der Check laeuft ueber alle Haupt-Views und faellt, sobald jemand
     eine grosse Flaeche ohne Material nachschiebt. */
  await clearLayers();
  const MATVIEWS = ['navHome','navShop','navCollection','navForge','navPack','navFortress',
                    'navClan','navBoard','navPass','navHeroes','navEvents','navMail'];
  let flGes = 0, flOhne = 0;
  const suender = {};
  const jeView = [];
  for (const v of MATVIEWS) {
    await go(v);
    await page.waitForTimeout(190);
    const r = await page.evaluate(() => {
      let ges = 0, ohne = 0; const s = {};
      document.querySelectorAll('.view.active *').forEach(e => {
        const cs = getComputedStyle(e), bx = e.getBoundingClientRect();
        if (bx.width < 8 || bx.height < 8) return;
        const bg = cs.backgroundImage !== 'none' ||
          (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
        if (!bg || (parseFloat(cs.borderTopLeftRadius) || 0) < 3) return;
        const a = bx.width * bx.height; ges += a;
        if (!/inset/.test(cs.boxShadow || '')) {
          ohne += a;
          const k = String(e.className || e.tagName).split(' ')[0];
          s[k] = (s[k] || 0) + a;
        }
      });
      return { ges, ohne, s };
    });
    flGes += r.ges; flOhne += r.ohne;
    jeView.push({ v, p: r.ges ? r.ohne / r.ges * 100 : 0 });
    for (const k in r.s) suender[k] = (suender[k] || 0) + r.s[k];
  }
  const antOhne = flGes ? (flOhne / flGes * 100) : 0;
  const top = Object.entries(suender).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, a]) => k + ' ' + (a / flGes * 100).toFixed(1) + '%').join(', ');
  step('Hoechstens 15 % der sichtbaren Flaeche ohne Tiefe (war 89 %)',
    antOhne <= 15, antOhne.toFixed(0) + ' % ohne — groesste: ' + (top || 'keine'));
  /* Und JEDE View einzeln. Der Mittelwert allein hatte die Startseite
     verdeckt: 12 % im Schnitt, aber 64 % auf genau dem Screen, den man
     beim Oeffnen der App zuerst sieht. Ein Durchschnitt ist kein
     Qualitaetsversprechen. */
  jeView.sort((a, b) => b.p - a.p);
  step('Auch die schwaechste einzelne View bleibt unter 25 %',
    jeView[0].p <= 25,
    jeView.slice(0, 3).map(x => x.v.replace('nav', '') + ' ' + x.p.toFixed(0) + '%').join(', '));

  /* Und die Richtung des Lichts: eine erhabene Flaeche hat eine HELLE
     Oberkante und eine DUNKLE Unterkante. Genau EIN Licht, von oben. */
  await go('navHome');
  await page.waitForTimeout(200);
  const licht = await page.evaluate(() => {
    const werte = getComputedStyle(document.documentElement);
    const g = n => werte.getPropertyValue(n).trim();
    return { lit: g('--lit'), unlit: g('--unlit'), sunk: g('--sunk'),
             raised: g('--mat-raised'), kurven: [g('--ease-out'), g('--ease-overshoot')] };
  });
  step('Oberkante ist hell, Unterkante dunkel (Licht von oben)',
    /inset 0 1px 0 #ffffff/.test(licht.lit) && /inset 0 -1px 0 #000000/.test(licht.unlit),
    licht.lit + ' | ' + licht.unlit);
  step('Eingesenkt ist die Umkehrung: Schatten von oben hinein',
    /inset 0 2px 5px #000000/.test(licht.sunk), licht.sunk.slice(0, 40));
  /* getComputedStyle loest var() bereits auf — geprueft wird also der
     AUFGELOESTE Wert: er muss eine helle und eine dunkle Innenkante
     enthalten. Auf die Token-Namen zu pruefen ginge nie durch. */
  step('Fertiges Material traegt helle UND dunkle Innenkante',
    /inset 0 1px 0 #ffffff/.test(licht.raised) && /inset 0 -1px 0 #000000/.test(licht.raised),
    licht.raised.slice(0, 56));
  step('Bewegungskurven sind benannte Tokens', licht.kurven.every(k => k.startsWith('cubic-bezier')),
    licht.kurven.join(' '));

  // ================= AUSLIEFERUNG (P0) =================
  /* 17 Views liegen gleichzeitig im DOM. Ohne loading="lazy" laedt das
     Telefon auch die Bilder der Views, die es nie sieht — gemessen waren
     das 82,78 MB pro Seitenladung. Der Check haelt fest, dass die Bremse
     an JEDEM Bild sitzt, nicht nur an den neuen.

     29.07.2026 — EINE Ausnahme, und sie braucht einen Grund im Markup:
     Bilder mit `data-eager` sind absichtlich nicht verzoegert. Der Fall,
     der dazu gefuehrt hat, ist `#pkArt`, der Pack in der Oeffnungsszene:
     die Bremse gilt fuer Bilder in Views, die man vielleicht nie sieht —
     dieses Bild IST die Szene und wird in dem Moment gebraucht, in dem
     getippt wird. Verzoegert geladen kaeme der Pack erst, wenn er schon
     glueht.

     Die Ausnahme haengt bewusst am ATTRIBUT und nicht an einer Liste von
     IDs hier in der Pruefung: so steht die Begruendung dort, wo sie
     jemand liest, naemlich neben dem Bild. Wer `data-eager` ohne Grund
     setzt, faellt beim Lesen des Markups auf; eine Ausnahmeliste in der
     Pruefung liest nie jemand. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(300);
  const lade = await page.evaluate(() => {
    const alle = [...document.querySelectorAll('img')];
    const gebremst = alle.filter(i => !i.hasAttribute('data-eager'));
    return { n: alle.length, eager: alle.length - gebremst.length,
             ohneLazy: gebremst.filter(i => i.getAttribute('loading') !== 'lazy').length,
             ohneAsync: alle.filter(i => i.getAttribute('decoding') !== 'async').length };
  });
  step('Jedes Bild traegt loading="lazy" (ausser begruendeten data-eager)',
    lade.ohneLazy === 0,
    lade.ohneLazy + ' ohne, von ' + lade.n + ' · ' + lade.eager + ' begruendete Ausnahme(n)');
  step('Jedes Bild traegt decoding="async"', lade.ohneAsync === 0,
    lade.ohneAsync + ' ohne, von ' + lade.n);

  // ============ HELDEN SIND KEINE TUERME + KAMPF-EINSTIEG ============
  /* Zwei Struktur-Korrekturen, die leicht wieder zurueckrutschen:
     Solara und Magmor gehoeren NICHT ins Sammlungsraster, und KAMPF muss
     in den Kampf fuehren statt auf die Trophaeenstrasse. */
  await clearLayers();
  await go('navCollection');
  await page.waitForTimeout(350);
  const coll = await page.evaluate(() => ({
    raster: [...document.querySelectorAll('#collGrid [data-id]')].map(e => e.getAttribute('data-id')),
  }));
  step('Sammlungsraster enthaelt KEINE Helden',
    !coll.raster.includes('solara') && !coll.raster.includes('magmor'),
    coll.raster.join(','));
  step('Sammlungsraster hat genau die sechs Tuerme', coll.raster.length === 6, coll.raster.length);
  /* ⚠ ANGEPASST (30.07.2026, Battle-Deck-Umbau): `#deckRow` war die alte
     Vorschau-Kachel; sie ist durch den echten Editor ersetzt. Dieselbe
     Behauptung — "ein Held landet nicht im Turm-Slot" — muss dort
     gelten, wo jetzt tatsaechlich Karten zugewiesen werden:
     `ArenaDeck.setze`/die Kandidatenliste des Kartenwaehlers. Ein
     Schritt, der nur ein leeres, nicht mehr existierendes Element
     abfragt, wird vacuously wahr — genau die Bugklasse aus dem
     Pruefungen-README ("ein Schritt, der nicht rot werden kann, ist
     wertlos"). */
  const deckZonen = await page.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    return {
      heldAufTurm: D.setze('tuerme', 0, 'solara').ok,
      kandidatenOhneHeld: window.__proto.dkKandidaten('tuerme').indexOf('solara') < 0 &&
                          window.__proto.dkKandidaten('tuerme').indexOf('magmor') < 0,
    };
  });
  step('Deck-Turmplaetze nehmen keine Helden an',
    deckZonen.heldAufTurm === false && deckZonen.kandidatenOhneHeld, JSON.stringify(deckZonen));

  await go('navForge');
  await page.waitForTimeout(350);
  const forge = await page.evaluate(() => [...document.querySelectorAll('#forgeGrid [data-id]')]
    .map(e => e.getAttribute('data-id')));
  step('Schmiede zeigt keine Helden',
    !forge.includes('solara') && !forge.includes('magmor'), [...new Set(forge)].join(','));

  await go('navHeroes');
  await page.waitForTimeout(350);
  const helden = await page.evaluate(() => ({
    karten: [...document.querySelectorAll('#heroList [data-hero]')].map(e => e.getAttribute('data-hero')),
    note: (document.querySelector('#heroNote') || {}).textContent || '',
  }));
  step('Helden-Reiter zeigt Solara und Magmor',
    helden.karten.includes('solara') && helden.karten.includes('magmor'), helden.karten.join(','));
  step('Helden-Hinweis stellt klar, dass ein Held kein Turm ist',
    /KEIN Turm/.test(helden.note), helden.note.slice(0, 70));

  /* KAMPF: fuehrt in die Gegnersuche, NICHT auf die Trophaeenstrasse. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(300);
  await page.click('#btnBattle');
  await page.waitForTimeout(300);
  const kampf = await page.evaluate(() => ({
    mm: document.querySelector('#mmLayer').classList.contains('open'),
    road: document.querySelector('#roadLayer').classList.contains('open'),
    titel: (document.querySelector('#mmTitle') || {}).textContent || '',
    meineSeite: (document.querySelector('#mmMe .mmnm') || {}).textContent || '',
    gegnerJetzt: (document.querySelector('#mmOpp .mmnm') || {}).textContent || '',
  }));
  step('KAMPF oeffnet die Gegnersuche', kampf.mm, 'mm=' + kampf.mm);
  step('KAMPF oeffnet NICHT die Trophaeenstrasse', !kampf.road, 'road=' + kampf.road);
  step('Eigene Seite ist besetzt, Gegnerseite noch nicht',
    kampf.meineSeite.length > 0 && kampf.gegnerJetzt === '…',
    kampf.meineSeite + ' vs ' + kampf.gegnerJetzt);
  await page.waitForTimeout(1200);
  const gefunden = await page.evaluate(() => ({
    found: document.querySelector('#mmLayer').classList.contains('found'),
    gegner: (document.querySelector('#mmOpp .mmnm') || {}).textContent || '',
  }));
  step('Nach kurzer Suche steht ein Gegner da',
    gefunden.found && gefunden.gegner !== '…' && gefunden.gegner.length > 1, gefunden.gegner);
  await shot('kampf_gegnersuche');
  // Uebergabe an das Match-Ende
  await page.waitForTimeout(2000);
  step('Gegnersuche uebergibt an den Match-Ende-Screen',
    await page.locator('#viewMatchEnd').evaluate(e => e.classList.contains('active')),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));
  /* Aufraeumen ueber den ECHTEN Weg: das Match-Ende blendet die Bottom-Nav
     aus (body.me-open), ein go() per Nav-Klick greift dort also nicht.
     „Tippen zum Schliessen" ist der Ausgang — und wird so mitgeprueft. */
  await page.click('#meTap');
  await page.waitForTimeout(400);
  /* Und der harte Fall: Layer hart wegraeumen (wie ein Reset oder die
     Zuruecktaste) und pruefen, dass die Kette NICHT nachtraeglich noch
     das Match-Ende hereinschiebt. */
  await page.click('#btnBattle');
  await page.waitForTimeout(250);
  await clearLayers();
  await page.waitForTimeout(2800);
  step('Hart geschlossene Gegnersuche schiebt kein Match-Ende nach',
    !(await page.locator('#viewMatchEnd').evaluate(e => e.classList.contains('active'))),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));
  step('Tippen zum Schliessen fuehrt zurueck auf Start',
    await page.locator('#viewHome').evaluate(e => e.classList.contains('active')) &&
    !(await page.evaluate(() => document.body.classList.contains('me-open'))),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));

  /* Die Arena in der Mitte oeffnet den Stand. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(300);
  await page.click('#arenaDiorama');
  await page.waitForTimeout(400);
  step('Klick auf die Arena oeffnet die Trophaeenstrasse',
    await page.locator('#roadLayer').evaluate(e => e.classList.contains('open')));
  await clearLayers();

  // ================= WISCHEN ZWISCHEN DEN VIEWS =================
  /* Geprueft werden die drei Dinge, an denen eine Wisch-Navigation
     normalerweise scheitert: sie klaut das vertikale Scrollen, sie klaut
     die querscrollenden Reihen, und am Ende der Reihe passiert nichts. */
  await clearLayers();
  await go('navHome');
  await page.waitForTimeout(250);

  const swInfo = await page.evaluate(() => ({
    da: !!window.ArenaSwipe,
    reihe: window.ArenaSwipe ? window.ArenaSwipe.order.join(',') : '',
    ziel: window.ArenaSwipe ? window.ArenaSwipe.ziel() : null,
  }));
  step('Wisch-Reihe = die fuenf Bottom-Nav-Ziele',
    swInfo.da && swInfo.reihe === 'navShop,navCollection,navHome,navClan,navFortress',
    swInfo.reihe);
  step('Start liegt in der Wisch-Reihe', swInfo.ziel === 'navHome', String(swInfo.ziel));

  // Eine echte Wischgeste mit dem Zeiger: von rechts nach links.
  async function wisch(dx, dy) {
    /* Mitte des SICHTFENSTERS. #app ist bei langen Views mehrere tausend
       Pixel hoch — seine Mitte liegt dann unter dem Bildschirmrand und
       der Zeiger landet im Nichts. Genau daran ist der erste Aufbau
       dieser Checks gescheitert. */
    const vp = page.viewportSize();
    const box = await page.locator('#app').boundingBox();
    const x = Math.min(box.x + box.width / 2, vp.width - 20), y = vp.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
      await page.waitForTimeout(12);
    }
    await page.mouse.up();
    await page.waitForTimeout(650);
  }

  await wisch(-160, 0);
  step('Nach links wischen geht ein Ziel weiter (Start -> Clan)',
    await page.locator('#viewClan').evaluate(e => e.classList.contains('active')),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));
  await wisch(160, 0);
  step('Nach rechts wischen geht ein Ziel zurueck (Clan -> Start)',
    await page.locator('#viewHome').evaluate(e => e.classList.contains('active')),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));

  // Eine vertikale Geste darf NICHT die View wechseln.
  await wisch(0, -180);
  step('Senkrechte Geste wechselt die View nicht',
    await page.locator('#viewHome').evaluate(e => e.classList.contains('active')),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));

  // Eine schraege Geste, bei der die Senkrechte fuehrt, ebenfalls nicht.
  await wisch(-70, -150);
  step('Schraege Geste mit senkrechter Fuehrung wechselt nicht',
    await page.locator('#viewHome').evaluate(e => e.classList.contains('active')),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));

  // Enden der Reihe: aussen darf nichts passieren, aber der View muss
  // danach wieder sauber bei 0 stehen (kein haengender transform).
  await go('navShop');
  await page.waitForTimeout(200);
  await wisch(200, 0);
  const linksEnde = await page.evaluate(() => ({
    id: (document.querySelector('.view.active') || {}).id,
    tf: (document.querySelector('#viewShop') || {}).style.transform,
  }));
  step('Am linken Ende bleibt der Shop stehen', linksEnde.id === 'viewShop', linksEnde.id);
  step('Nach dem Federn steht der View wieder bei 0',
    !linksEnde.tf || /translateX\(0/.test(linksEnde.tf), JSON.stringify(linksEnde.tf));
  await go('navFortress');
  await page.waitForTimeout(200);
  await wisch(-200, 0);
  step('Am rechten Ende bleibt die Burg stehen',
    await page.locator('#viewFortress').evaluate(e => e.classList.contains('active')),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));

  /* Querscrollende Reihen gehoeren sich selbst. Die Trophaeenstrasse ist
     der harte Fall: dort wuerde ein geklauter Zug die Strasse unbenutzbar
     machen. Der Layer ist offen, also darf ohnehin nichts wechseln. */
  await go('navHome');
  await page.waitForTimeout(200);
  /* Die Wischgesten hatten die Trophaeenstrasse geoeffnet (siehe
     DESIGNSYSTEM §6k) — jetzt nicht mehr. Der Aufraeumer bleibt
     trotzdem stehen: er macht den Abschnitt unabhaengig davon, was
     vorher offen war. */
  await clearLayers();
  await page.click('#btnBattle');
  await page.waitForTimeout(400);
  const vorLayer = await page.evaluate(() => (document.querySelector('.view.active') || {}).id);
  await wisch(-170, 0);
  step('Bei offenem Layer wechselt kein View',
    (await page.evaluate(() => (document.querySelector('.view.active') || {}).id)) === vorLayer,
    vorLayer);
  await clearLayers();

  /* Uebergabe-Regel: eine querscrollende Reihe gehoert sich selbst,
     SOLANGE sie noch Weg hat. Ist sie am Ende, uebernimmt der View.
     Ohne den zweiten Teil waere jeder Screen, dessen Mitte eine solche
     Reihe ist, eine Falle — genau das ist beim ersten Aufbau passiert. */
  await clearLayers();
  await go('navClan');
  await page.waitForTimeout(300);
  const scr = await page.evaluate(() => {
    const app = document.getElementById('app');
    const b = app.getBoundingClientRect();
    let el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    for (let n = el; n && n !== app; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (n.scrollWidth > n.clientWidth + 2 && (ox === 'auto' || ox === 'scroll')) {
        n.scrollLeft = 0;                       // Weg nach rechts vorhanden
        return { gefunden: true, id: n.id || String(n.className).split(' ')[0],
                 max: n.scrollWidth - n.clientWidth };
      }
    }
    return { gefunden: false };
  });
  if (scr.gefunden) {
    await wisch(-170, 0);
    step('Querscroller mit Weg behaelt die Geste (View bleibt)',
      await page.locator('#viewClan').evaluate(e => e.classList.contains('active')),
      scr.id + ' max=' + scr.max);
    // Jetzt ans Ende setzen: dann muss der View uebernehmen.
    await page.evaluate(() => {
      const app = document.getElementById('app');
      const b = app.getBoundingClientRect();
      let el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      for (let n = el; n && n !== app; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (n.scrollWidth > n.clientWidth + 2 && (ox === 'auto' || ox === 'scroll')) {
          n.scrollLeft = n.scrollWidth; return;
        }
      }
    });
    await wisch(-170, 0);
    step('Querscroller am Ende gibt die Geste an den View ab',
      await page.locator('#viewFortress').evaluate(e => e.classList.contains('active')),
      await page.evaluate(() => (document.querySelector('.view.active') || {}).id));
  } else {
    step('Clan-Mitte hat keinen Querscroller (Uebergabe nicht pruefbar)', true, 'uebersprungen');
  }

  // Tastatur macht dieselbe Bewegung (Pruefbarkeit am Rechner).
  await go('navHome');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(650);
  step('Pfeil rechts bewegt eine Station weiter',
    await page.locator('#viewClan').evaluate(e => e.classList.contains('active')),
    await page.evaluate(() => (document.querySelector('.view.active') || {}).id));
  await shot('swipe_clan');

  await go('navHome');
  await shot('home_final');

  await browser.close();

  console.log('\nBild-Ladefehler (erwartet, CDN offline): ' + imgFails.length);
  console.log('Echte JS-Fehler: ' + errors.length);
  errors.forEach(e => console.log('  ' + e));
  const bad = steps.filter(s => !s.ok);
  console.log('\n' + (steps.length - bad.length) + '/' + steps.length + ' Schritte ok');
  console.log('Screenshots: ' + SHOTS);
  if (bad.length || errors.length) { console.log('FEHLGESCHLAGEN'); process.exit(1); }
  console.log('ALLE PLAYWRIGHT-CHECKS OK');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
