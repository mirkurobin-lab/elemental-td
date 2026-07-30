const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

/* ⚠ AM EIGENEN ORT MESSEN (30.07.2026).
   Hier stand ein FESTER Pfad auf /home/user/elemental-td/... Laeuft die
   Suite aus einem git-worktree, prueft sie damit die HAUPT-Auscheckung
   statt der Datei, die danebenliegt: ein gruener Lauf sagt dann nichts
   ueber die Aenderung aus, die man gerade gemacht hat.
   DREI Bearbeiter sind an EINEM Tag unabhaengig voneinander darueber
   gestolpert, zwei davon mit einem falsch-gruenen Ausgangslauf. Damit
   ist es kein Bedienfehler, sondern ein Konstruktionsfehler.
   Der Standard haengt jetzt an DIESER Datei. `UI_DATEI` bleibt als
   Ausweg fuer den seltenen Fall, dass man bewusst einen fremden Baum
   messen will — aber eben als Ausnahme, nicht als Normalzustand: ein
   Standard, den man sich merken muss, wird vergessen. */
const FILE = 'file://' + (process.env.UI_DATEI
  ? path.resolve(process.env.UI_DATEI)
  : path.resolve(__dirname, '..', 'ui_prototype.html'));
const SHOTS = '/tmp/claude-0/-home-user-elemental-td/4b0a76dd-5b22-5fdf-85e8-579f1b036ae5/scratchpad/ui_shots_v5';
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const imgFails = [];
const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}
/* Gegenprobe (uebernommen aus run_v7.js, 30.07.2026): eine Behauptung, die
   FALSCH sein MUSS. Ein Schritt, der auch bei kaputtem Programm gruen
   bleibt, ist keine Pruefung. */
function gegen(name, sollFalschSein, info) { step('gegen: ' + name, !sollFalschSein, info); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // Nur ECHTE JS-Fehler zählen. Bild-Ladefehler sind hier erwartet:
  // das Higgsfield-CDN ist aus dieser Umgebung nicht erreichbar; die
  // CSS-Gradient-Fallbacks müssen greifen.
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
    if (/ERR_|net::|Failed to load resource|cloudfront|\.png/i.test(t)) { imgFails.push(t); return; }
    errors.push('console.error: ' + t);
  });
  page.on('requestfailed', r => imgFails.push('req: ' + r.url().slice(-40)));

  await page.goto(FILE);
  await page.waitForTimeout(900);
  // AA-REBUILD: Der Login-Kalender oeffnet beim ersten Start des Tages.
  // Er muss weg, bevor irgendetwas auf Home geklickt wird.
  if (await page.locator('#loginLayer.open').count()) {
    await page.click('#loginLater');
    await page.waitForTimeout(350);
  }

  // ================= 1. HOME-VIEW =================
  step('Home ist die Startansicht', await page.locator('#viewHome').evaluate(e => e.classList.contains('active')));
  const aname = (await page.locator('#arenaName').textContent()).trim();
  const akick = (await page.locator('#arenaKicker').textContent()).trim();
  // Korrigierte AA-Leiter 0/300/600/900/1200/1500 (Beleg IMG_3295):
  // 1136 🏆 liegt zwischen Sturmspitze (900) und Obsidian-Thron (1200).
  step('Arena nach Demo-Trophäen (1136 → Arena 4 Sturmspitze)',
    // AA schreibt „Arena 5:" mit Doppelpunkt — die zweite Zeile ist die
    // Fortsetzung der ersten, nicht eine eigene Ueberschrift.
    aname === 'Sturmspitze' && akick === 'Arena 4:', akick + ' / ' + aname);
  // AA-REBUILD: Die Arena-Leiter und der Erklaertext sind vom Home
  // VERSCHWUNDEN — AA zeigt beides nur in der Trophaeenstrasse hinter dem
  // BATTLE-Knopf (AA_UI_REFERENZ §14.4). Statt ihrer wird jetzt geprueft,
  // dass der Startbildschirm genau AAs Achse traegt.
  step('Arena-Leiter NICHT mehr auf Home (AA §9.5b: ein Bildschirm = ein Ziel)',
    (await page.locator('#arenaLadder').count()) === 0 &&
    (await page.locator('#homeNote').count()) === 0);
  const axis = await page.evaluate(() => {
    const h = window.innerHeight;
    const y = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top / h : -1; };
    return { prof: y('profAvatar'), pass: y('passBanner'), dio: y('arenaDiorama'),
             name: y('arenaName'), chip: y('arenaChip'), bar: y('arenaProg'),
             slots: y('packSlots'), battle: y('btnBattle') };
  });
  /* ⚠ GEAENDERTE REIHENFOLGE, mit Absicht — und die alte war ein Fehler,
     kein Geschmack. AA_UI_REFERENZ §19.1 behauptete, der Arenaname liege
     AUF dem Diorama. IMG_3344 in voller Aufloesung zeigt das Gegenteil:
       Titel Zeile 1  28,0 %
       Titel Zeile 2  30,5 %
       Chip           33,6 %
       Diorama        36,0 %
     Der Titel steht UEBER dem Diorama, in eigenem Raum. Aus der
     Fehllesung folgte alles Weitere: das Diorama sass 12 Punkte zu hoch,
     und Balken, Truhen und Kampfreihe rutschten 7 Punkte zu tief. */
  step('AA-Achse: Profil < Pass < Name < Chip < Diorama < Balken < Slots < Kampf',
    axis.prof < axis.pass && axis.pass < axis.name && axis.name < axis.chip &&
    axis.chip < axis.dio && axis.dio < axis.bar && axis.bar < axis.slots &&
    axis.slots < axis.battle,
    Object.keys(axis).map(k => k + ' ' + Math.round(axis[k] * 100) + '%').join(' · '));
  step('Season-Pass sitzt auf AAs Platz (~13-25 % Hoehe, AA misst 21 %)',
    axis.pass > 0.08 && axis.pass < 0.28, Math.round(axis.pass * 100) + '%');
  /* AAs Screenshot enthaelt oben 4,4 % iOS-Statusleiste, unsere Seite
     nicht — alle absoluten Y-Werte aus IMG_3344 liegen deshalb um diesen
     Betrag hoeher. AAs 72,0 % entsprechen bei uns 67,6 %. */
  step('KAMPF-Knopf in AAs Band (statusleistenkorrigiert 64-80 %)',
    axis.battle > 0.64 && axis.battle < 0.80, Math.round(axis.battle * 100) + '%');
  const pf = await page.locator('#arenaProgFill').evaluate(e => e.style.width);
  step('Fortschrittsbalken gefüllt (>0 %, <100 %)',
    parseFloat(pf) > 0 && parseFloat(pf) < 100, pf);
  // Fallback-Nachweis: das Asset steht als erster Layer, der Gradient dahinter.
  // §14.2: Key-Art steckt jetzt im schwebenden Diorama, nicht im Hero-BG.
  const dioBg = await page.locator('#arenaDiorama').evaluate(e => getComputedStyle(e).backgroundImage);
  step('Diorama: Asset-Layer + Gradient-Fallback vorhanden',
    /url\(/.test(dioBg) && /gradient/.test(dioBg), dioBg.slice(0, 55) + '…');
  const slotsFull = await page.locator('#packSlots .slot.full').count();
  const slotsEmpty = await page.locator('#packSlots .slot.empty').count();
  step('Truhen-/Pack-Slot-Reihe: 4 Hex-Plätze (2 voll, 2 leer)',
    slotsFull === 2 && slotsEmpty === 2, slotsFull + ' voll / ' + slotsEmpty + ' leer');
  const rewIcon = (await page.locator('#arenaProgIcon').textContent()).trim();
  step('Belohnungs-Icon am Balkenende gesetzt', rewIcon.length > 0, rewIcon);
  const gt = await page.locator('.goldtext').count();
  step('Gold-Gradient-Text-Ebene im Einsatz (≥8 Elemente)', gt >= 8, String(gt));
  /* GEAENDERT, mit Absicht: der Arenaname ist kein Gold-Gradient mehr.
     AA setzt beide Titelzeilen WEISS mit dunkler Kontur (IMG_3344) —
     Gold auf dem hellen Diorama daneben war schlecht lesbar und die
     vierte Wiederholung derselben Panne. Geprueft wird der Gradient
     jetzt dort, wo es ihn noch gibt. */
  const gtClip = await page.locator('.goldtext').first().evaluate(e =>
    getComputedStyle(e).webkitBackgroundClip || getComputedStyle(e).backgroundClip);
  step('.goldtext nutzt background-clip:text', gtClip === 'text', gtClip);
  const nameWeiss = await page.locator('#arenaName').evaluate(e => {
    const cs = getComputedStyle(e);
    return { fill: cs.webkitTextFillColor || cs.color, gold: e.classList.contains('goldtext') };
  });
  step('Arenaname ist weiss, nicht gold (AA, IMG_3344)',
    !nameWeiss.gold && /255,\s*255,\s*255/.test(nameWeiss.fill), nameWeiss.fill);
  // ---- Kristall-Icons + Emoji-Rueckfall ----
  const icoTotal = await page.locator('img.ico, span.ico').count();
  step('Kristall-Icons im Einsatz (>20)', icoTotal > 20, icoTotal + ' Icons');
  /* UMGESCHRIEBEN 30.07.2026. Vorher hiess dieser Schritt „Emoji-Fallback
     greift bei blockiertem CDN" und verlangte `span.ico > 10`. Damit hat er
     den KAPUTTEN Zustand als Anforderung festgeschrieben: er war nur gruen,
     solange keine Bilder ankamen. Seit die Assets im Repo liegen, laden sie
     — und der Schritt wurde rot, obwohl genau das die Verbesserung war.
     Ein Schritt, der eine Verbesserung als Fehler meldet, wird beim
     naechsten roten Balken weggeklickt und schuetzt danach nichts mehr.
     Geprueft wird jetzt die ZUSAGE — „faellt ein Icon aus, steht sein Emoji
     an seiner Stelle" — mit ERZWUNGENEM Ausfall statt mit gesperrtem Netz.
     Das misst die Absicherung, nicht die Umgebung.
     Der Klon haengt an einem LOSGELOESTEN Kasten: eine Gegenprobe, die die
     laufende Seite anfasst, faerbt den naechsten Schritt rot — dieser
     Fehler ist in packsprengung.js schon einmal passiert. */
  const rueck = await page.evaluate(async () => {
    const orig = document.querySelector('img.ico[alt]');
    if (!orig) return { kein: true };
    const kasten = document.createElement('div');
    const klon = orig.cloneNode(true);
    kasten.appendChild(klon);
    klon.src = './assets/PRUEFUNG_FEHLT_ABSICHTLICH.webp';
    await new Promise(r => { klon.onerror = r; klon.onload = r; setTimeout(r, 2500); });
    window.UIIcon.sweep(kasten);
    const sp = kasten.querySelector('span.ico');
    return { alt: orig.getAttribute('alt'), text: sp ? sp.textContent : null,
             bildWeg: !kasten.querySelector('img') };
  });
  step('Emoji-Rueckfall: ausgefallenes Icon wird durch sein Emoji ersetzt',
    !rueck.kein && rueck.bildWeg && rueck.text === rueck.alt,
    rueck.kein ? 'kein img.ico im Dokument'
      : 'alt="' + rueck.alt + '" → "' + rueck.text + '", <img> entfernt: ' + rueck.bildWeg);
  // ---- Interaktions-Ebene ----
  const pressables = await page.locator('.pressable').count();
  step('.pressable auf allen klickbaren Elementen (>15)', pressables > 15, String(pressables));
  const sfxOk = await page.evaluate(() => !!(window.UISfx && window.UISfx.tap &&
    window.UISfx.confirm && window.UISfx.deny && window.UISfx.reward));
  step('window.UISfx mit tap/confirm/deny/reward', sfxOk);
  const badgeOk = await page.evaluate(() => {
    if (!window.UIBadge) return false;
    window.UIBadge.set('collection', 7);
    var el = document.getElementById('navBadge');
    return el && el.textContent === '7' && el.style.display !== 'none';
  });
  step('window.UIBadge.set(navKey, n) setzt den roten Punkt', badgeOk);
  // Klick erzeugt .pressed + Funken
  await page.locator('#btnBattle').dispatchEvent('pointerdown', { clientX: 200, clientY: 500 });
  await page.waitForTimeout(60);
  const pressedNow = await page.locator('#btnBattle.pressed').count();
  const sparks = await page.locator('#fxLayer .sparkdot').count();
  step('Klick setzt .pressed und erzeugt Tap-Funken', pressedNow === 1 && sparks > 0,
    pressedNow + ' pressed / ' + sparks + ' Funken');
  await page.locator('#btnBattle').dispatchEvent('pointerup', {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOTS + '/home.png', fullPage: true });

  /* ============ 2. HOME → ARENA → TROPHÄENSTRASSE ============
     BEWUSSTE ABWEICHUNG VON AA: bei AA öffnet der BATTLE-Knopf die Straße
     (§14.4). Bei uns startet KAMPF den Kampf, und der Stand hängt am
     Arena-Diorama in der Mitte. Ein Spieler, der spielen will, soll nicht
     erst seinen Kontostand ansehen müssen. */
  await page.click('#arenaDiorama');
  await page.waitForTimeout(450);
  step('Klick auf die Arena öffnet die Trophäenstraße',
    await page.locator('#roadLayer').evaluate(e => e.classList.contains('open')));
  const nodes = await page.locator('#roadScroll .node').count();
  const secs = await page.locator('#roadScroll .arenasec').count();
  const gates = await page.locator('#roadScroll .arenasec.league').count();
  step('Straße: volle Leiter — 8 Arenen + 10 Liga-Tore + viele Knoten',
    secs === 18 && gates === 10 && nodes > 60,
    nodes + ' Knoten / ' + secs + ' Sektionen / ' + gates + ' Tore');
  const summit = await page.locator('#roadScroll .arenasec.league.summit').count();
  step('Genau eine Spitzen-Sektion mit Prisma-Signatur', summit === 1, String(summit));
  const gate1 = await page.locator(`#roadScroll .arenasec[data-gate="1"] .ribbon`).textContent();
  step('Liga-Tor 1 bei 2 900 🏆', /2\s?900/.test(gate1), gate1.replace(/\s+/g,' ').trim());
  const gtop = await page.locator('#roadScroll .arenasec.league.summit .ribbon').textContent();
  step('Spitze bei 9 800 🏆', /9\s?800/.test(gtop), gtop.replace(/\s+/g,' ').trim());
  const a8 = await page.locator('#roadScroll .arenasec[data-arena="8"] .ribbon').textContent();
  step('Arena 8 (Frostbastion) bei 2 500 🏆', /2\s?500/.test(a8), a8.replace(/\s+/g,' ').trim());
  const nDone = await page.locator('#roadScroll .node.done').count();
  const nNext = await page.locator('#roadScroll .node.next').count();
  const nLock = await page.locator('#roadScroll .node.lock').count();
  step('Knoten-Zustände ✓ / Glow / 🔒 alle vorhanden',
    nDone > 0 && nNext === 1 && nLock > 0, nDone + ' ✓ / ' + nNext + ' next / ' + nLock + ' 🔒');
  step('Abgeholte Knoten tragen ✅', (await page.locator('#roadScroll .node.done .chk').count()) === nDone);
  step('Gesperrte Knoten tragen 🔒', (await page.locator('#roadScroll .node.lock .chk').count()) === nLock);
  // Ribbon-Beschriftung: Arena 2 muss 300 🏆 zeigen (Beleg IMG_3295).
  const rib2 = await page.locator('#roadScroll .arenasec[data-arena="2"] .ribbon').textContent();
  step('Ribbon „Arena 2 · 🏆 300" (korrigierte Schwelle)',
    /Arena 2/.test(rib2) && /300/.test(rib2), rib2.replace(/\s+/g, ' ').trim());
  const rails = await page.locator('#roadLayer .rail').count();
  const ticks = await page.locator('#roadScroll .tick').count();
  step('Goldene Schiene + Skala bis zur Spitze', rails === 1 && ticks > 80,
    rails + ' Schiene / ' + ticks + ' Ticks');
  const un1 = await page.locator('#roadScroll .arenasec[data-arena="1"] .utile').count();
  const ob1 = await page.locator('#roadScroll .arenasec[data-arena="1"] .objcard').count();
  const inf = await page.locator('#roadScroll .arenasec[data-arena="1"] .objcard .ibtn').count();
  step('Arena 1: Unlocks-Raster + Objective-/Trick-Karten mit (i)',
    un1 === 6 && ob1 === 3 && inf === 3, un1 + ' Kacheln / ' + ob1 + ' Karten / ' + inf + ' (i)');
  const infoTxt = await page.locator('#roadScroll .arenasec[data-arena="1"] .objcard .ibtn')
    .first().getAttribute('data-info');
  step('(i)-Teaser hat echten Beschreibungstext',
    infoTxt.length > 40 && /Kartensturm|Zauberkarten/.test(infoTxt), infoTxt.slice(0, 60) + '…');
  // Auto-Scroll zur Spielerposition: nicht am unteren Ende stehengeblieben.
  const sc = await page.locator('#roadScroll').evaluate(e =>
    ({ top: e.scrollTop, max: e.scrollHeight - e.clientHeight }));
  step('Straße auf Spielerposition gescrollt (nicht am Ende)',
    sc.top > 0 && sc.top < sc.max - 50, sc.top + ' / ' + sc.max);
  await page.screenshot({ path: SHOTS + '/road_bottom.png' });
  // Nach oben scrollen und eine Arena-Sektion aufnehmen.
  await page.locator('#roadScroll .arenasec[data-arena="2"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/road_arena.png' });
  await page.locator('#roadScroll .arenasec.league.summit').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + '/road_champions.png' });
  await page.locator('#roadScroll').evaluate(e => { e.scrollTop = 0; });
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + '/road_top.png' });
  await page.click('#roadUp');
  await page.waitForTimeout(250);
  await page.click('#roadTop');
  await page.waitForTimeout(300);
  step('„Nach oben" springt an den Straßenanfang',
    (await page.locator('#roadScroll').evaluate(e => e.scrollTop)) === 0);
  await page.click('#roadOk');
  await page.waitForTimeout(300);
  step('„Okay" schließt die Straße',
    !(await page.locator('#roadLayer').evaluate(e => e.classList.contains('open'))));

  // ---- Bottom-Nav in AA-Ordnung ----
  const navOrder = await page.locator('nav.bottom button').evaluateAll(
    els => els.map(e => e.id));
  // Reihenfolge nach User-Vorgabe (Icon-Sweep Batch 6): Packs sind in die
  // Home-Iconleiste gewandert, der Clan hat den Dauerplatz bekommen.
  step('Bottom-Nav: Shop | Sammlung | START | Clan | Burg',
    navOrder.join(',') === 'navShop,navCollection,navHome,navClan,navFortress',
    navOrder.join(' | '));
  const navLabels = await page.locator('nav.bottom button').evaluateAll(
    els => els.map(e => e.textContent.replace(/[^A-Za-zÄÖÜäöüß]/g, '')));
  step('Nav-Labels deutsch und vollstaendig',
    navLabels.join('|') === 'Shop|Sammlung|Start|Clan|Burg', navLabels.join(' | '));
  const navPops = await page.locator('nav.bottom .navpop').count();
  const navCenter = await page.evaluate(() => {
    const c = document.querySelector('.nav-center .navpop').getBoundingClientRect();
    const o = document.querySelector('#navShop .navpop').getBoundingClientRect();
    const bar = document.querySelector('nav.bottom').getBoundingClientRect();
    return { center: Math.round(c.width), other: Math.round(o.width),
             popsOut: Math.round(bar.top - c.top) };
  });
  step('Fuenf Popout-Illustrationen, Mitte am groessten',
    navPops === 5 && navCenter.center > navCenter.other,
    navCenter.other + ' px / Mitte ' + navCenter.center + ' px');
  step('Popouts ragen oben aus der Nav-Leiste heraus',
    navCenter.popsOut > 0, navCenter.popsOut + ' px oberhalb');
  // UMGESCHRIEBEN 27.07.: die Pack-Kachel der Home-Iconleiste ist weg —
  // sie war einer von vier doppelten Wegen, die der Auftraggeber
  // streichen liess. Die Anforderung bleibt („Packs sind vom
  // Startbildschirm erreichbar"), nur fuehrt der Weg jetzt ueber die
  // gefuellten Truhen-Slots in der Bildschirmmitte — dort, wo AA ihn
  // auch hat, und wo die Zahl der wartenden Packs ohnehin steht.
  step('Packs sind ueber die gefuellten Truhen-Slots erreichbar',
    (await page.locator('#packSlots .slot.full').count()) >= 1,
    (await page.locator('#packSlots .slot.full').count()) + ' volle Slots');

  // ================= 3. SAMMLUNG =================
  await page.click('#navCollection');
  await page.waitForTimeout(350);
  step('Sammlung offen', await page.locator('#viewCollection').evaluate(e => e.classList.contains('active')));
  /* ⚠ 30.07.2026: Der zweite Bottom-Nav-Platz fuehrt jetzt auf ZWEI
     gleichrangige Reiter — Battle Deck und Sammlung — und das Deck ist der
     Voreingestellte (AA hat auf diesem Platz das Deck, §24). Das
     Sammlungs-Raster liegt damit hinter `display:none`, bis der Reiter
     gewechselt wird.
     Der Schritt darunter zaehlte NUR die Knoten und war deshalb GRUEN,
     waehrend die Kacheln unsichtbar waren; abgestuerzt ist erst der Klick
     danach („element is not visible"). Genau die Fehlerklasse, die dieses
     Projekt schon mehrfach getroffen hat: Vorhandensein ist nicht
     Sichtbarkeit. Jetzt wird beides geprueft. */
  /* UMGESCHRIEBEN 30.07.2026. Vorher: „Battle Deck ist der
     voreingestellte Reiter" — das prueft eine Bauweise, die es nicht
     mehr gibt. Es gibt keinen Umschalter mehr; Deck UND Sammlung stehen
     untereinander auf einem Bildschirm, so wie in AA (IMG_3461). Die
     Zusage lautet jetzt: man sieht beides GLEICHZEITIG, ohne zu tippen.
     Genau das misst der Schritt — beide Teile im Layout, nicht nur im
     DOM. Vorhandensein ist nicht Sichtbarkeit. */
  const beides = await page.evaluate(() => {
    const d = document.getElementById('deckPane'), c = document.getElementById('collPane');
    const sicht = e => !!e && e.getClientRects().length > 0 &&
                       getComputedStyle(e).display !== 'none';
    return { deck: sicht(d), coll: sicht(c),
             umschalter: !!document.getElementById('dkTabDeck') ||
                         !!document.getElementById('dkTabColl') };
  });
  step('Deck und Sammlung stehen gleichzeitig auf einem Bildschirm (AA)',
    beides.deck && beides.coll && !beides.umschalter,
    'Deck sichtbar: ' + beides.deck + ' · Sammlung sichtbar: ' + beides.coll +
    ' · alte Umschalter noch da: ' + beides.umschalter);
  await page.waitForTimeout(250);
  const tiles = await page.locator('#collGrid .tile').count();
  /* Genau SECHS: die Sammlung zeigt Tuerme. Solara und Magmor sind Helden
     und stehen im Helden-Reiter — vorher lief beides ueber POOL_IDS und
     die Erwartung war >= 8. */
  step('Sammlung rendert das Turm-Raster (6 Tuerme, keine Helden)',
    tiles === 6, String(tiles));
  step('und die Kacheln sind wirklich SICHTBAR, nicht nur vorhanden',
    tiles > 0 && await page.locator('#collGrid .tile').first().isVisible());
  await page.screenshot({ path: SHOTS + '/collection.png', fullPage: true });

  // ================= 3. DETAILKARTE =================
  await page.locator('#collGrid .tile').first().click();
  await page.waitForTimeout(350);
  step('Detail-Modal offen', await page.locator('#detailModal').evaluate(e => e.classList.contains('open')));
  const bnHtml = await page.locator('#dBanner').innerHTML();
  /* GEAENDERTE ERWARTUNG, mit Absicht.
     Diese Pruefung forderte früher Gold-Gradient-Text auf dem
     Raritaetsband. Das Band-Asset ist aber ein HELLES Kristallband — und
     damit war das genau die Bugklasse, die im Projekt schon dreimal
     zugeschlagen hat: .goldtext gehoert auf DUNKLE Flaechen. Sichtbar
     wurde es erst in einem Live-Screenshot mit geladenen Bildern; ohne
     CDN steht hier die dunkle Fallback-Platte und alles sah gut aus.
     Die Raritaet traegt jetzt einen farbigen Saum unter dem Band, die
     Schrift ist dunkel. Geprueft wird deshalb das Gegenteil von vorher. */
  const bnT = await page.locator('#dBanner span').evaluate(e => {
    const cs = getComputedStyle(e);
    return { fill: cs.webkitTextFillColor || cs.color, txt: e.textContent.trim() };
  });
  const bnHell = (() => {
    const m = /rgba?\((\d+), *(\d+), *(\d+)/.exec(bnT.fill);
    return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) / 255 : 1;
  })();
  step('Raritäts-Banner: dunkle Schrift auf hellem Band (kein Goldtext)',
    !/goldtext/.test(bnHtml) && bnHell < 0.45,
    bnT.txt + ' · Helligkeit ' + bnHell.toFixed(2));
  const bnB = await page.locator('#dBanner').evaluate(e => {
    const cs = getComputedStyle(e);
    return { quelle: cs.borderImageSource, slice: cs.borderImageSlice,
             breite: cs.borderImageWidth, platte: e.style.background,
             schatten: cs.boxShadow };
  });
  /* Das Band liegt als 9-SLICE an, nicht als Bildflaeche: nur so behalten
     die Zierenden ihre Form, waehrend die Mitte auf die Bandbreite zieht.
     Ohne erreichbares CDN ist borderImageSource `none` — dann traegt die
     Farbplatte das Band allein, und genau das ist der gewollte Rueckfall. */
  step('Raritäts-Banner: 9-Slice mit `fill`, Enden nicht gestaucht',
    /fill/.test(bnB.slice) && (parseFloat(bnB.breite.split(' ').pop()) || 0) >= 20,
    bnB.slice + ' / ' + bnB.breite);
  step('Raritäts-Banner: Raritätsfarbe trägt Platte und Saum',
    /rgb|#/.test(bnB.platte) && /rgb/.test(bnB.schatten),
    bnB.platte + ' · ' + bnB.schatten.slice(0, 40));
  /* Erst den Icon-Rueckfall erzwingen: ico() liefert ein <img>, und dessen
     textContent ist leer, solange onerror nicht durch ist. Lokal antwortet
     das CDN nicht, also haengt die Pruefung sonst am Zufall der
     Fehlschlag-Reihenfolge. Der Inhalt bleibt derselbe, nur der Zeitpunkt
     ist jetzt definiert. */
  await page.evaluate(() => { if (window.UIIcon && UIIcon.sweep) UIIcon.sweep(); });
  await page.waitForTimeout(120);
  /* UMGESCHRIEBEN 30.07.2026, gleicher Grund wie beim Emoji-Rueckfall oben:
     der Schritt las `textContent` und verlangte darin ein 🪙. Dieses Zeichen
     stand dort nur, weil das Gold-Icon auf sein Emoji zurueckgefallen war.
     Jetzt liegt an derselben Stelle das echte Bild:
       <img class="ico" src="./assets/cur_gold.webp" alt="🪙"> 9 500
     — nachgemessen naturalWidth 1024. Der Text enthaelt also nur noch die
     Zahl, und der alte Schritt wurde rot, obwohl die Kosten sichtbarer sind
     als vorher. Die Zusage lautet „neben der Zahl steht ein Waehrungs-
     zeichen", nicht „im Text steht ein Emoji"; beide Bauformen erfuellen
     sie, und der Schritt akzeptiert jetzt beide — beim Bild aber nur, wenn
     es wirklich Pixel traegt. Ein leeres <img alt="🪙"> ist kein Zeichen. */
  const upCost = await page.evaluate(() => {
    const e = document.getElementById('dUpCost');
    if (!e) return { fehlt: true };
    const img = e.querySelector('img.ico');
    return { text: e.textContent.trim(),
             marke: img ? (img.getAttribute('alt') || '') : '',
             pixel: !!img && img.complete && img.naturalWidth > 0 };
  });
  step('Upgrade-Kosten mit Waehrungszeichen sichtbar',
    !upCost.fehlt && /\d/.test(upCost.text) &&
      (/🪙/.test(upCost.text) || (upCost.marke === '🪙' && upCost.pixel)),
    upCost.fehlt ? '#dUpCost fehlt'
      : upCost.text + '  · Zeichen: ' + (upCost.marke || '(im Text)') +
        (upCost.marke ? ' als Bild mit Pixeln: ' + upCost.pixel : ''));
  await page.screenshot({ path: SHOTS + '/detail.png', fullPage: true });
  await page.click('#btnDetailClose');
  await page.waitForTimeout(250);

  // ================= 4. SCHMIEDE + MERGE-ZEREMONIE =================
  // Die Schmiede hat KEINEN Nav-Knopf mehr (AA-Ordnung) — sie wird ueber
  // den Forge-Button der Sammlung erreicht.
  await page.click('#navCollection');
  await page.waitForTimeout(300);
  await page.click('#btnToForge');
  await page.waitForTimeout(400);
  step('Schmiede über den Forge-Button der Sammlung erreichbar', await page.locator('#viewForge').evaluate(e => e.classList.contains('active')));
  const fTiles = await page.locator('#forgeGrid .tile').count();
  step('Schmiede rendert Karten', fTiles >= 1, String(fTiles));
  // Drei Kopien derselben Karte/Stufe wählen → Merge-Vorschau muss erscheinen.
  const firstSel = '#forgeGrid .tile';
  const cand = await page.locator(firstSel).evaluateAll(els => {
    for (const e of els) {
      const c = parseInt((e.querySelector('.cnt') || {}).textContent?.replace('×', '') || '0', 10);
      if (c >= 3) return { id: e.dataset.id, tier: e.dataset.tier };
    }
    return null;
  });
  if (cand) {
    const sel = `#forgeGrid .tile[data-id="${cand.id}"][data-tier="${cand.tier}"]`;
    for (let i = 0; i < 3; i++) { await page.click(sel); await page.waitForTimeout(90); }
    const prevOn = await page.locator('#mergePreview').evaluate(e => e.classList.contains('on'));
    const prevTxt = await page.locator('#mergePreview').textContent();
    step('Merge-Vorschau zeigt Max.-Level und "kostet kein Gold"',
      prevOn && /Max\. Level/.test(prevTxt) && /kein Gold/.test(prevTxt), prevTxt.slice(0, 70));
    /* NEU nach einem echten Ausfall: das Kartenbild im Anforderungs-Slot
       war 390 x 1012 px statt 99 x 136 — `.artbox` ist position:absolute
       und `.reqslot` hatte kein position:relative, also bezog sie sich auf
       die Ansicht. Drei davon uebereinander haben den Bildschirm samt
       VERSCHMELZEN-Knopf zugedeckt; die Fusion war nicht ausfuehrbar.
       Geprueft wird deshalb nicht „das Bild ist da", sondern „das Bild
       bleibt in seinem Slot". */
    const slotMasse = await page.evaluate(() =>
      [...document.querySelectorAll('#reqSlots .reqslot')].map(sl => {
        const a = sl.querySelector('.artbox'); if (!a) return null;
        const rs = sl.getBoundingClientRect(), ra = a.getBoundingClientRect();
        return { ok: ra.width <= rs.width + 1 && ra.height <= rs.height + 1,
                 w: Math.round(ra.width), h: Math.round(ra.height),
                 sw: Math.round(rs.width), sh: Math.round(rs.height) };
      }).filter(Boolean));
    step('Kartenbild bleibt im Anforderungs-Slot',
      slotMasse.length === 3 && slotMasse.every(x => x.ok),
      slotMasse.map(x => x.w + 'x' + x.h + ' in ' + x.sw + 'x' + x.sh).join(' · '));
    const knopf = await page.evaluate(() => {
      const b = document.getElementById('btnMerge'), r = b.getBoundingClientRect();
      const oben = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { frei: b.contains(oben) || oben === b, ueber: (oben && oben.className || '').toString().slice(0, 30) };
    });
    step('VERSCHMELZEN-Knopf ist anklickbar (nichts liegt darueber)',
      knopf.frei, knopf.ueber);
    const titel = await page.evaluate(() => {
      const h = document.querySelector('#viewForge h2.title');
      const sp = h.querySelector('.goldtext') || h;
      return { txt: h.textContent.trim(),
               zeilen: Math.round(sp.getBoundingClientRect().height /
                 (parseFloat(getComputedStyle(sp).fontSize) * 1.2)) };
    });
    /* Das Bandasset hat 44 px Zierenden je Seite. Ein zweizeiliger Titel
       laeuft hinein — genau das war „Fusions Banner ist kaum lesbar". */
    step('Fusions-Titel bleibt einzeilig auf dem Band',
      titel.zeilen === 1, titel.txt + ' / ' + titel.zeilen + ' Zeile(n)');
    await page.screenshot({ path: SHOTS + '/forge.png', fullPage: true });
    const goldBefore = (await page.locator('#curGold').textContent()).replace(/\s/g, '');
    await page.click('#btnMerge');
    await page.waitForTimeout(500);
    const cerOpen = await page.locator('#mergeCeremony').evaluate(e => e.classList.contains('open'));
    step('Merge-Zeremonie erscheint', cerOpen,
      (await page.locator('#cerTitle').textContent()).trim());
    if (cerOpen) {
      /* GEAENDERT, mit Absicht. Die Zeremonie ist jetzt eine Choreografie:
         kreisen (0-1150 ms) -> verschmelzen (bis 1780) -> enthuellen ->
         Werte (ab ~2360 ms). Die Tafel SOFORT nach dem Klick zu lesen war
         vorher richtig und ist es jetzt nicht mehr — also warten, statt
         die Choreografie wieder abzuschaffen.
         Zweite Aenderung: die alte Zusicherung suchte das Emoji „0 🪙".
         Das trifft nur, solange das CDN unerreichbar ist und das Icon auf
         sein Emoji zurueckfaellt — am Live-Stand mit geladenen Bildern
         waere sie falsch negativ (DESIGNSYSTEM §7b). Jetzt wird der Text
         geprueft, den es in beiden Faellen gibt. */
      /* GEAENDERT, mit Absicht — zum zweiten Mal. Die Zeitachse ist jetzt an
         AAs Screenrecording gemessen (07-27-2026, 60 fps) statt geschaetzt:
         Umschlag bei 1260 ms, danach 280 ms echter Stillstand, erst dann die
         Werttafel. Bei AA ist diese Pause messbar (Bild-zu-Bild-Differenz
         exakt 0 ueber 17 Bilder) und sie ist der Punkt, an dem der Blick auf
         der neuen Karte liegt. Sie faellt weg, sobald die Tafel zu frueh
         kommt — deshalb wird jetzt nicht nur „die Tafel kommt irgendwann"
         zugesichert, sondern auch „sie kommt nicht zu frueh".
         Der Nachlauf faellt von 900 auf 500 ms, weil der Hochzaehler von
         612 auf 312 ms gekuerzt ist. */
      const tafel500 = await page.evaluate(
        () => document.querySelectorAll('#cerTable .row2').length);
      step('500 ms nach dem Klick kreisen die Karten noch (Werttafel leer)',
        tafel500 === 0, tafel500 + ' Zeilen');
      const auftakt = await page.evaluate(() => {
        const s = getComputedStyle(document.getElementById('cerStage'));
        return { name: s.animationName, dauer: s.animationDuration };
      });
      step('Auftakt zieht die Buehne auf (AA: 283 ms, +6,7 % Ueberschwung)',
        auftakt.name === 'cerpop' && parseFloat(auftakt.dauer) === 0.28,
        auftakt.name + ' / ' + auftakt.dauer);
      const titelA = await page.locator('#cerTitle').boundingBox();
      await page.waitForTimeout(1000);          // -> rund 1500 ms nach dem Klick
      const phase = await page.evaluate(() => ({
        zeigen: document.getElementById('cerCard').classList.contains('zeigen'),
        orbs: document.querySelectorAll('#cerRing .orbcard').length,
        zeilen: document.querySelectorAll('#cerTable .row2').length,
        tiefer: document.getElementById('cerSheet').classList.contains('tiefer')
      }));
      step('1500 ms nach dem Klick ist der Umschlag durch (AA: 1267 ms)',
        phase.zeigen && phase.orbs === 0,
        'zeigen=' + phase.zeigen + ' orbs=' + phase.orbs);
      step('Nach dem Umschlag haelt die Zeremonie inne (AA: 283 ms Stillstand)',
        phase.zeilen === 0, phase.zeilen + ' Zeilen');
      step('Umschlag nimmt den Hintergrund ein zweites Mal zurueck (AA: -14 %)',
        phase.tiefer, 'tiefer=' + phase.tiefer);
      await page.waitForFunction(
        () => document.querySelectorAll('#cerTable .row2').length > 0, { timeout: 6000 });
      /* AA wackelt nicht: die Bounding-Box des Titels steht ueber die vollen
         1,9 s der Zeremonie auf demselben Pixel (x 95..343 im 440er Raster,
         114 Bilder lang unveraendert). Kein Screenshake — und wir fuehren
         auch keinen ein. */
      const titelB = await page.locator('#cerTitle').boundingBox();
      step('Kein Bildschirmwackeln — der Titel steht still (AA: bbox konstant)',
        Math.abs(titelA.x - titelB.x) < 1 && Math.abs(titelA.y - titelB.y) < 1,
        Math.round(titelA.x) + ',' + Math.round(titelA.y) + ' -> ' +
        Math.round(titelB.x) + ',' + Math.round(titelB.y));
      await page.waitForTimeout(500);   // Hochzaehler auslaufen lassen
      const tbl = (await page.locator('#cerTable').textContent()).replace(/\s+/g, ' ');
      step('Zeremonie zeigt Max.-Level-Sprung + 0 Gold',
        /Max\. Level/.test(tbl) && /Kosten/.test(tbl) && /3 Kopien/.test(tbl),
        tbl.slice(0, 90));
      const orbs = await page.evaluate(() => document.querySelectorAll('#cerRing .orbcard').length);
      step('Die drei Ausgangskarten sind nach dem Verschmelzen weg', orbs === 0, orbs + ' Orbs');
      step('Ergebniskarte ist enthuellt',
        await page.locator('#cerCard').evaluate(e => e.classList.contains('zeigen') &&
          !e.classList.contains('warten')));
      await page.screenshot({ path: SHOTS + '/ceremony.png', fullPage: true });
      await page.waitForTimeout(400);
      await page.click('#cerBtn');
      await page.waitForTimeout(350);
      // Bonus-Dialog kann sich öffnen — dann die erste Wahl treffen.
      if (await page.locator('#bonusDlg').evaluate(e => e.classList.contains('open'))) {
        await page.locator('#bonusList .bonusbtn').first().click();
        await page.waitForTimeout(300);
      }
    }
    const goldAfter = (await page.locator('#curGold').textContent()).replace(/\s/g, '');
    step('Merge kostet kein Gold (Kontostand unverändert)', goldBefore === goldAfter,
      goldBefore + ' → ' + goldAfter);
  } else {
    step('Merge-Kandidat mit 3 Kopien gefunden', false, 'kein Kandidat im Demo-Seed');
    await page.screenshot({ path: SHOTS + '/forge.png', fullPage: true });
  }

  // ================= 5a. SHOP (§8) =================
  await page.click('#navShop');
  await page.waitForTimeout(400);
  step('Shop offen', await page.locator('#viewShop').evaluate(e => e.classList.contains('active')));
  /* ⚠ DREI PRUEFUNGEN HIER UMGESCHRIEBEN (27.07.), weil sich das Design
     bewusst geaendert hat — die alten Fassungen haetten den alten
     Zustand festgeschrieben:
       a) „4 Packs + Gratis-Tagespack = 5 .shopcard": Bronze ist aus dem
          kaufbaren Angebot raus (Auftrag zu IMG_3386), kaufbar sind nur
          noch Silber/Gold/Arkan, und das Gratis-Pack ist kein
          .shopcard mehr, sondern ein `.tagesband` in #packFreeBox.
       b) „/6h 58m/": das war AAs Screenshot-Wert, im Markup fest
          verdrahtet. Der Timer laeuft jetzt echt gegen 00:00 UTC — eine
          Pruefung auf genau diesen Text haette den Platzhalter zurueck
          verlangt. Geprueft wird jetzt die FORM und dass die Zahl im
          Tagesfenster liegt.
       c) „data-buy=d1": die Angebots-Kennungen sind keine Zaehlnummern
          mehr, sie kommen aus der gezogenen Ware. Geprueft wird jetzt
          die ZUSAGE (Preis wird abgebucht, Stueckzahl zaehlt herunter)
          statt einer festen Kennung mit festem Preis. */
  const deals = await page.locator('#dealGrid .prodcard').count();
  const packs = await page.locator('#packShop .shopcard').count();
  const freePack = await page.locator('#packFreeBox .tagesband').count();
  step('Shop: 6 Tagesangebote + 3 kaufbare Packs + Gratis-Tagespack',
    deals === 6 && packs === 3 && freePack === 1,
    deals + ' Deals / ' + packs + ' Pack-Karten / ' + freePack + ' Gratis-Band');
  const timerTxt = await page.locator('#dealTimer').textContent();
  const tm = /Neu in (?:(\d+)h )?(\d+)m/.exec(timerTxt);
  const restMin = tm ? (+(tm[1] || 0)) * 60 + (+tm[2]) : -1;
  step('Refresh-Timer laeuft echt gegen die Tagesgrenze',
    !!tm && restMin > 0 && restMin <= 24 * 60, timerTxt);
  step('Offener Pity-Stand auf den Packs sichtbar',
    /Episch/.test(await page.locator('#packPity').textContent()));
  const freeB = await page.locator('#packFreeBox .freebadge').count();
  step('Gratis-Tagespack hat GRATIS-Badge', freeB === 1, String(freeB));
  // Genau EIN Gratis-Posten unter den Tagesangeboten — nie zwei.
  const gratisN = await page.locator('#dealGrid [data-gratis]').count();
  step('Genau ein Gratis-Posten pro Tag', gratisN === 1, String(gratisN));
  // Kauf gegen die Demo-Wallet, an einem BEZAHLTEN Gold-Angebot des Tages.
  const kauf = await page.evaluate(() => {
    const P = window.__proto;
    P.setGold(500000);
    const d = P.dealsHeute().filter(x => !x.gratis && x.cur === 'gold')[0];
    if (!d) return null;
    const vor = P.gold();
    document.querySelector('#dealGrid [data-buy="' + d.id + '"]').click();
    return { id: d.id, cost: d.cost, ab: vor - P.gold(), rest: d.stueck - 1 };
  });
  await page.waitForTimeout(400);
  step('Kauf zieht genau den Angebotspreis von der Demo-Wallet ab',
    !!kauf && kauf.ab === kauf.cost,
    kauf ? kauf.id + ': -' + kauf.ab + ' Gold' : 'kein Gold-Angebot heute');
  const avail = kauf
    ? await page.locator('#dealGrid [data-deal="' + kauf.id + '"] .pcsub').textContent() : '';
  step('St\u00fcckzahl z\u00e4hlt herunter',
    !!kauf && new RegExp('Verf\u00fcgbar: ' + kauf.rest + '$').test(avail.trim()), avail);
  await page.screenshot({ path: SHOTS + '/shop.png', fullPage: true });

  // ================= 5b. FESTUNG - Layout "1+3 kombiniert" =================
  await page.click('#navFortress');
  await page.waitForTimeout(450);
  step('Festung offen', await page.locator('#viewFortress').evaluate(e => e.classList.contains('active')));

  // --- A) LEBENDE BURG ---
  const castBg = await page.locator('#castleStage').evaluate(e => e.style.backgroundImage);
  step('Burg-Buehne: Skin-Asset + Gradient-Fallback',
    /url\(/.test(castBg) && /gradient/.test(castBg));
  const skin = await page.evaluate(() => {
    const c = window.CastleSkins && window.CastleSkins.current();
    return c ? { key: c.key, img: !!c.img, tip: c.anchors.prismTip,
                 shield: c.anchors.shield, walls: c.anchors.walls.length,
                 list: window.CastleSkins.list().length } : null;
  });
  step('window.CastleSkins liefert Skin mit Prozent-Ankern',
    !!skin && skin.img && typeof skin.tip.x === 'number' && typeof skin.tip.y === 'number' &&
    typeof skin.shield.x === 'number' && skin.walls > 0,
    skin ? skin.key + ', ' + skin.walls + ' Mauer-Anker, ' + skin.list + ' Skin(s)' : 'fehlt');
  const anchorPct = await page.evaluate(() => {
    const b = document.getElementById('fxBeam'), sh = document.getElementById('fxShield');
    const a = window.CastleSkins.current().anchors;
    return { bl: b.style.left, bt: b.style.top, sl: sh.style.left,
             ax: a.prismTip.x + '%', ay: a.prismTip.y + '%', sx: a.shield.x + '%' };
  });
  step('Overlays sitzen auf den Anker-PROZENTEN (keine Pixel)',
    anchorPct.bl === anchorPct.ax && anchorPct.bt === anchorPct.ay &&
    anchorPct.sl === anchorPct.sx,
    'Strahl ' + anchorPct.bl + '/' + anchorPct.bt + ', Schild ' + anchorPct.sl);

  /* --- B) UPGRADE-ZEILEN (frueher „Kristall-Konstellation") ---
     ⚠ UMGESCHRIEBENE ZUSAGE, 30.07.2026. Hier stand:
       · „Knoten je Stufe mit Zustaenden done/next/milestone" (>= 30 Knoten
         OFFEN im Layout)
       · „Naechste Stufe zeigt Kostenknopf ODER Trophaeen-Tor" (Knopf IM
         Knoten)
       · „Aeste sind vertikal scrollbar (skaliert auf 100 Stufen)"
     Diese drei Schritte haben die ausgeschriebene Stufenliste FESTGESCHRIEBEN
     — genau das, was der Auftraggeber als „sehr cluttered" beanstandet hat:
     gemessen 948 px Liste, 1483 px Gesamtansicht, 598 px Scroll-Ueberhang bei
     430x932. Auftraggeber praezisiert: „jeder Upgrade Schritt soll immer nur
     den aktuellen anzeigen und den naechsten."
     Die Liste ist nicht geloescht, sondern in ein EIGENES FENSTER hinter dem
     ⓘ gewandert (#fortStepsDlg); der Kauf sitzt jetzt in der Zeile.
     Die Zusagen werden deshalb NICHT weicher, sondern praeziser: geprueft
     wird ab jetzt, dass im View KEINE Stufenliste liegt (getClientRects()
     .length === 0 — Vorhandensein ist nicht Sichtbarkeit), dass die Zeile
     genau zwei Werte zeigt, und dass das ⓘ die volle Leiter hervorholt. */
  const branches = await page.locator('#fortTracks .branch').count();
  step('Drei Upgrade-Zeilen gerendert', branches === 3, String(branches));
  const bicos = await page.locator('#fortTracks .branchhead .bico').evaluateAll(
    els => els.filter(e => /url\(/.test(e.style.backgroundImage) &&
                           /gradient/.test(e.style.backgroundImage)).length);
  step('Zeilen tragen die drei Track-Embleme (+ Fallback)', bicos === 3, String(bicos));
  const zeile = await page.evaluate(() => {
    const r = document.getElementById('fortTracks');
    const sicht = e => !!e && e.getClientRects().length > 0;
    return Array.prototype.map.call(r.querySelectorAll('.branch'), b => ({
      key: b.getAttribute('data-track'),
      stat: (b.querySelector('.bstat') || {}).textContent || '',
      statSicht: sicht(b.querySelector('.bstat')),
      lv: ((b.querySelector('.blv') || {}).textContent || '').trim(),
      lvSicht: sicht(b.querySelector('.blv')),
      ms: ((b.querySelector('.bms') || {}).textContent || '').trim(),
      msSicht: sicht(b.querySelector('.bms')),
      kauf: (b.querySelector('.kbuy') || {}).textContent || '',
      kaufSicht: sicht(b.querySelector('.kbuy')),
      tor: sicht(b.querySelector('.kgate')), max: sicht(b.querySelector('.kmax')),
      listeSicht: sicht(b.querySelector('.branchrail')),
      knoten: b.querySelectorAll('.knot').length,
      infoKnopf: sicht(b.querySelector('.binfo')),
    }));
  });
  // AKTUELLER Wert (fett) UND naechster Zuwachs (gruen) muessen beide da sein.
  step('Je Upgrade: aktueller Wert UND naechster Zuwachs sichtbar',
    zeile.length === 3 && zeile.every(z => z.statSicht &&
      /\+\d+,\d+ %/.test(z.stat) && /→ \+\d+,\d+ %/.test(z.stat)),
    zeile.map(z => z.stat.replace(/\s+/g, ' ').trim()).join(' | '));
  step('Je Upgrade: Stufenstand „Lv x/100" sichtbar',
    zeile.every(z => z.lvSicht && /^Lv \d+\/100$/.test(z.lv)),
    zeile.map(z => z.lv).join(' | '));
  step('Je Upgrade genau EINE Aktion: Kaufknopf ODER Tor ODER MAX',
    zeile.every(z => (z.kaufSicht ? 1 : 0) + (z.tor ? 1 : 0) + (z.max ? 1 : 0) === 1),
    zeile.map(z => z.key + ':' + (z.kaufSicht ? 'Kauf' : z.tor ? 'Tor' : 'MAX')).join(' '));
  step('Kaufknopf traegt einen Preis',
    zeile.filter(z => z.kaufSicht).every(z => /\d/.test(z.kauf.replace(/\s/g, ''))),
    zeile.map(z => z.kauf.replace(/\s+/g, ' ').trim()).join(' | '));
  // Der Meilenstein ist echte Mechanik — er darf aus der LISTE verschwinden,
  // aber nicht aus der Ansicht.
  step('Je Upgrade: naechster Meilenstein bleibt sichtbar',
    zeile.every(z => z.msSicht && /Meilenstein bei Lv \d+|Vollausbau/.test(z.ms)),
    zeile.map(z => z.ms).join(' | '));
  /* Der harte Punkt: die Zeile zeigt GENAU ZWEI Stufenwerte. Waere die
     Stufenleiter noch in der Zeile (auch zugeklappt), koennte ein Tipp sie
     dort aufziehen — die Zusage lautet aber „nur der aktuelle und der
     naechste". Deshalb wird gemessen, dass im View ueberhaupt KEIN .knot
     und KEINE .branchrail liegt. */
  step('KEINE ausgeschriebene Stufenliste im Layout',
    zeile.every(z => z.listeSicht === false && z.knoten === 0) &&
    (await page.locator('#viewFortress .knot').count()) === 0,
    zeile.map(z => z.key + ':' + z.knoten + ' Knoten').join(' '));
  gegen('Stufenliste steht in der Upgrade-Zeile',
    zeile.some(z => z.listeSicht || z.knoten > 0));
  step('Jede Zeile bietet ein ⓘ fuer die volle Stufenleiter',
    zeile.every(z => z.infoKnopf));
  // Gegenprobe: das ⓘ muss die Leiter WIRKLICH hervorholen, sonst waere
  // die Information ersatzlos geloescht statt verlagert.
  await page.click('#fortTracks .branch[data-track="hp"] .binfo');
  await page.waitForTimeout(340);
  const fenster = await page.evaluate(() => {
    const d = document.getElementById('fortStepsDlg');
    const l = document.getElementById('fsList');
    return { offen: d.classList.contains('open'), sicht: l.getClientRects().length > 0,
             name: document.getElementById('fsName').textContent.trim(),
             knoten: l.querySelectorAll('.knot').length,
             done: l.querySelectorAll('.knot.done').length,
             next: l.querySelectorAll('.knot.next').length,
             ms: l.querySelectorAll('.knot.milestone').length,
             hoehe: Math.round(l.getBoundingClientRect().height) };
  });
  // Die Leiter muss VOLLSTAENDIG sein (erledigte, naechste und Meilenstein-
  // Stufen); ob sie scrollt, haengt an der Fensterhoehe und ist keine Zusage.
  step('Das ⓘ oeffnet ein eigenes Fenster mit der vollen Stufenleiter',
    fenster.offen && fenster.sicht && /Burg-Stabilit/.test(fenster.name) &&
    fenster.knoten >= 15 && fenster.done > 0 && fenster.next > 0 && fenster.ms > 0,
    JSON.stringify(fenster));
  await page.click('#fsClose');
  await page.waitForTimeout(300);
  step('Das Fenster schliesst wieder',
    await page.evaluate(() => document.getElementById('fsList').getClientRects().length === 0));

  /* --- Kauf-Klick: Overlays muessen WACHSEN ---
     ⚠ GEAENDERTE MESSSTELLE, 30.07.2026. Geklickt wurde bisher
     `.knot.next .kbuy` — der Kaufknopf sass IM naechsten Listenknoten und
     setzte damit voraus, dass die ganze Stufenliste offen im Layout steht.
     Seit dem Entruempeln sitzt der Kaufknopf in der Zeile selbst
     (`.branchhead .kbuy`); die Liste ist zugeklappt. Die Zusage bleibt
     woertlich dieselbe (ein Kauf laesst die Burg-Overlays wachsen), nur der
     Griff daran ist der, den ein Spieler heute wirklich benutzt. */
  const fxSnap = () => page.evaluate(() => {
    const b = document.getElementById('fxBeam');
    return { w: b.style.width, h: b.style.height, dur: b.style.animationDuration,
             lvl: b.getAttribute('data-lvl'),
             walls: document.getElementById('castleFx').getAttribute('data-walls'),
             shield: document.getElementById('fxShield').style.width,
             shieldLvl: document.getElementById('fxShield').getAttribute('data-lvl') };
  });
  // Demo-Wallet aufstocken: die Lv-100-Kalibrierung (6 000 + 1 000/Stufe)
  // uebersteigt sonst das Startgold, und der zweite Kauf wuerde nur
  // "nicht genug Gold" melden statt die Overlays zu bewegen.
  await page.evaluate(() => { localStorage.setItem('arenaHubGold', '500000'); });
  await page.evaluate(() => window.__proto.renderFortress());
  await page.waitForTimeout(250);
  const before = await fxSnap();
  const pw0 = (await page.locator('#fortPower').textContent()).replace(/\s|\u00a0/g, '');
  const g0 = (await page.locator('#curGold').textContent()).replace(/\s|\u00a0/g, '');
  await page.click('#fortTracks .branch[data-track="prismDmg"] .branchhead .kbuy');
  await page.waitForTimeout(450);
  const after = await fxSnap();
  const pw1 = (await page.locator('#fortPower').textContent()).replace(/\s|\u00a0/g, '');
  const g1 = (await page.locator('#curGold').textContent()).replace(/\s|\u00a0/g, '');
  step('Kauf: Power steigt, Gold sinkt',
    parseInt(pw1, 10) > parseInt(pw0, 10) && parseInt(g1, 10) < parseInt(g0, 10),
    'Power ' + pw0 + '->' + pw1 + ', Gold ' + g0 + '->' + g1);
  step('Prisma-Strahl WAECHST mit der Ausbaustufe (Breite + Hoehe)',
    parseFloat(after.w) > parseFloat(before.w) && parseFloat(after.h) > parseFloat(before.h) &&
    (+after.lvl) === (+before.lvl) + 1,
    'Breite ' + before.w + '->' + after.w + ', Hoehe ' + before.h + '->' + after.h +
    ', Lv ' + before.lvl + '->' + after.lvl);
  step('Kauf-Feedback: Glow-Puls-Klasse auf der Buehne',
    await page.locator('#castleStage').evaluate(e => e.classList.contains('justbought')));

  // HP-Track kaufen -> Schild + Mauer-Kristalle reagieren
  const hpBuy = await page.locator('#fortTracks .branch[data-track="hp"] .branchhead .kbuy').count();
  if (hpBuy) {
    await page.click('#fortTracks .branch[data-track="hp"] .branchhead .kbuy');
    await page.waitForTimeout(400);
  }
  const afterHp = await fxSnap();
  const nCryst = await page.locator('#castleFx .wallcrystal').count();
  step('Burg-HP-Kauf vergroessert den Schild-Schimmer',
    hpBuy ? parseFloat(afterHp.shield) > parseFloat(after.shield) : true,
    'Schild ' + after.shield + ' -> ' + afterHp.shield + ', Lv ' + afterHp.shieldLvl);
  step('Mauer-Kristalle sind DOM-Overlays, Zaehler konsistent',
    String(nCryst) === String(afterHp.walls) && nCryst > 0,
    nCryst + ' Kristalle / data-walls=' + afterHp.walls);

  // Tempo-Track -> Puls-Tempo des Strahls
  const rtBuy = await page.locator('#fortTracks .branch[data-track="prismRate"] .branchhead .kbuy').count();
  if (rtBuy) {
    await page.click('#fortTracks .branch[data-track="prismRate"] .branchhead .kbuy');
    await page.waitForTimeout(400);
  }
  const durAfter = await page.locator('#fxBeam').evaluate(e => e.style.animationDuration);
  step('Prisma-Tempo beschleunigt den Strahl-Puls (kuerzere Dauer)',
    rtBuy ? parseFloat(durAfter) < parseFloat(after.dur) : true,
    after.dur + ' -> ' + durAfter);
  const skinOpts = await page.locator('#skinSel option').count();
  step('Skin-Auswahl gerendert (mind. 1 Standard-Skin)', skinOpts >= 1, String(skinOpts));
  await page.screenshot({ path: SHOTS + '/fortress.png', fullPage: true });

  // ================= 5c. PACKS: Karten-Drehung (§17) =================
  // Packs haengen an den gefuellten Truhen-Slots der Startseite; die
  // fruehere Iconleisten-Kachel ist als Doppelweg entfallen (27.07.).
  await page.click('#navHome'); await page.waitForTimeout(250);
  await page.click('#packSlots .slot.full');
  await page.waitForTimeout(300);
  step('Packs offen', await page.locator('#viewPack').evaluate(e => e.classList.contains('active')));
  const pbBg = await page.locator('#btnOpenBronze').evaluate(e => e.style.backgroundImage);
  step('Pack-Button: Asset + Fallback', /url\(/.test(pbBg) && /gradient/.test(pbBg));
  await page.click('#btnOpenBronze');
  // ⚠ DRITTE FASSUNG, 30.07.2026. Der Block darueber lautete:
  //   „ein Tipp bricht die Szene ab" → dann Raster pruefen, Karten
  //   muessen VERDECKT liegen.
  // Beides ist seit dem Umbau der Szene falsch, und der Test ist genau
  // deshalb mit einem TypeError abgestuerzt (`#packGrid .pcard` war null):
  //   · Ein Tipp bricht die Szene NICHT mehr ab. Er deckt genau EINE
  //     Karte auf — das Zeitschloss ist absichtlich weg, damit ein
  //     zufaelliger Tap niemandem den Legendaer-Moment nimmt. Die Szene
  //     blieb also offen und das Raster war nie erreichbar.
  //   · „Karten liegen verdeckt" ist die Anforderung von VORHER. Heute
  //     ist die SZENE der Reveal; das Raster holt danach nur noch auf.
  //     Ein Raster, das nach der Zeremonie erneut zum Antippen auffordert,
  //     laesst denselben Spieler dasselbe Geschenk zweimal auspacken —
  //     ein echter Fehler, der beim Neuschreiben dieses Blocks aufgefallen
  //     ist und im Prototyp behoben wurde.
  // Geprueft wird jetzt der WEG, den ein Spieler wirklich geht.
  await page.waitForTimeout(400);
  step('Oeffnungsszene laeuft nach dem Klick',
    (await page.locator('#packLayer.on').count()) === 1);
  // Ein einzelner Tipp darf die Zeremonie NICHT beenden. Das ist die
  // Anforderung, die den alten Schritt ersetzt — und sie ist das
  // Gegenteil von dem, was dort stand.
  await page.mouse.click(195, 300);
  await page.waitForTimeout(150);
  step('ein einzelner Tipp beendet die Zeremonie NICHT',
    (await page.locator('#packLayer.on').count()) === 1);
  // Der Weg heraus fuer wen es eilig hat: der Überspringen-Knopf.
  await page.click('#pkSkip');
  await page.waitForTimeout(250);
  step('Überspringen zeigt die Beute-Uebersicht',
    (await page.locator('.pkfinale').count()) === 1);
  await page.mouse.click(195, 300);
  await page.waitForTimeout(400);
  step('danach schliesst ein Tipp die Szene',
    (await page.locator('#packLayer.on').count()) === 0);

  const nCards = await page.locator('#packGrid .pcard').count();
  // Die SZENE war der Reveal. Das Raster zeigt danach dasselbe Ergebnis,
  // es fragt nicht noch einmal.
  const nachSzene = await page.evaluate(() => ({
    flipped: document.querySelectorAll('#packGrid .pcard.flipped').length,
    alle: document.querySelectorAll('#packGrid .pcard').length,
    summe: document.getElementById('packSummary').style.display !== 'none',
  }));
  step('kein zweites Aufdecken: das Raster ist nach der Szene fertig',
    nCards > 0 && nachSzene.flipped === nachSzene.alle && nachSzene.summe,
    nachSzene.flipped + '/' + nachSzene.alle + ' aufgedeckt, Zusammenfassung ' +
    (nachSzene.summe ? 'da' : 'fehlt'));

  // ---- Die Flip-Mechanik selbst ----
  // Sie ist ueber den normalen Weg nicht mehr erreichbar (das Raster ist
  // nach der Szene schon offen), bleibt aber eine echte Anforderung: das
  // Raster traegt sie beim Nachholen und beim Wiederansehen. Geprueft
  // wird sie darum ueber die Testklappe `setPackState`, die genau dafuer
  // da ist — nicht ueber einen Umweg, der die Szene austrickst.
  await page.evaluate(() => {
    const echt = window.__proto.packState();
    window.__proto.setPackState(echt.map(s => ({ ...s, done: false, busy: false })));
  });
  await page.waitForTimeout(200);
  step('Raster neu gesetzt: Karten liegen verdeckt (kein Auto-Reveal)',
    (await page.locator('#packGrid .pcard').count()) > 0 &&
    (await page.locator('#packGrid .pcard.flipped').count()) === 0,
    (await page.locator('#packGrid .pcard').count()) + ' Karten, 0 aufgedeckt');
  const struct = await page.evaluate(() => {
    const c = document.querySelector('#packGrid .pcard');
    const back = c.querySelector('.pc3d > .pcside.pcback');
    const front = c.querySelector('.pc3d > .pcside.pcfront');
    const cs = getComputedStyle(c), i3 = getComputedStyle(c.querySelector('.pc3d'));
    return { back: !!back, front: !!front, glow: !!c.querySelector('.pcglow'),
             persp: cs.perspective, style3d: i3.transformStyle,
             bfv: getComputedStyle(back).backfaceVisibility,
             backBg: back.style.backgroundImage, dur: i3.transitionDuration,
             ease: i3.transitionTimingFunction };
  });
  step('Echter 3D-Aufbau: Bühne + zwei Seiten + Glühring',
    struct.back && struct.front && struct.glow && struct.style3d === 'preserve-3d' &&
    struct.bfv === 'hidden' && parseFloat(struct.persp) > 0,
    'perspective ' + struct.persp + ', ' + struct.style3d + ', backface ' + struct.bfv);
  step('Kartenrücken: Asset + Gradient-Fallback',
    /url\(/.test(struct.backBg) && /gradient/.test(struct.backBg));
  step('Drehung 600 ms mit Überschwing-Kurve',
    /0\.6s|600ms/.test(struct.dur) && /cubic-bezier/.test(struct.ease),
    struct.dur + ' / ' + struct.ease);

  // --- EIN Klick dreht GENAU EINE Karte ---
  const rot0 = await page.evaluate(() =>
    getComputedStyle(document.querySelector('#packGrid .pcard .pc3d')).transform);
  await page.click('#packGrid .pcard:first-child');
  await page.waitForTimeout(120);
  const turning = await page.locator('#packGrid .pcard:first-child').evaluate(
    e => e.classList.contains('turning') && e.classList.contains('flipped'));
  step('Klick startet die Drehung (.turning + .flipped)', turning);
  const sparksMid = await page.evaluate(() => new Promise(r =>
    setTimeout(() => r(document.querySelectorAll('#fxLayer .sparkdot').length), 260)));
  step('Partikel-Burst beim Aufdecken', sparksMid > 0, sparksMid + ' Funken');
  await page.waitForTimeout(700);
  const after1 = await page.evaluate(() => {
    const c = document.querySelector('#packGrid .pcard:first-child');
    return { rot: getComputedStyle(c.querySelector('.pc3d')).transform,
             turning: c.classList.contains('turning'),
             flippedTotal: document.querySelectorAll('#packGrid .pcard.flipped').length };
  });
  step('Nur DIESE eine Karte ist gedreht', after1.flippedTotal === 1,
    after1.flippedTotal + ' von ' + nCards);
  step('Drehmatrix hat sich geändert (echte rotateY-Rotation)',
    after1.rot !== rot0 && after1.rot !== 'none', rot0 + ' -> ' + after1.rot);
  step('.turning wird nach der Drehung wieder abgenommen', after1.turning === false);
  await page.screenshot({ path: SHOTS + '/pack_flip.png', fullPage: true });

  // --- LEGENDÄR-PFAD: Cinematic + Fallback (CDN offline => .fallback) ---
  const cine = await page.evaluate(() => new Promise(resolve => {
    const lay = document.getElementById('cineLayer');
    const seen = { on: false, fallback: false };
    const obs = new MutationObserver(() => {
      if (lay.classList.contains('on')) seen.on = true;
      if (lay.classList.contains('fallback')) seen.fallback = true;
    });
    obs.observe(lay, { attributes: true, attributeFilter: ['class'] });
    window.__proto.playCinematic(() => {
      obs.disconnect();
      resolve({ ...seen, closed: !lay.classList.contains('on'),
                vidSrc: !!document.getElementById('cineVid').getAttribute('src') });
    });
  }));
  step('Legendär-Cinematic öffnet den Vollbild-Layer', cine.on);
  step('Video-Quelle gesetzt (CDN-URL aus ui_assets.json)', cine.vidSrc);
  step('CDN offline => CSS-Lichtausbruch als Fallback', cine.fallback);
  step('Zeremonie schließt sich und gibt den Reveal frei', cine.closed);
  await page.screenshot({ path: SHOTS + '/pack_legendary.png', fullPage: true });

  // --- "Alle aufdecken": Flips sequenziell hintereinander ---
  await page.click('#btnRevealAll');
  await page.waitForTimeout(400);
  const partly = await page.locator('#packGrid .pcard.flipped').count();
  step('Alle-aufdecken spielt die Flips SEQUENZIELL (nicht alle auf einmal)',
    partly > 1 && partly < nCards, partly + '/' + nCards + ' nach 400 ms');
  await page.waitForTimeout(2500);
  const allFlipped = await page.locator('#packGrid .pcard.flipped').count();
  step('Am Ende sind alle Karten aufgedeckt', allFlipped === nCards,
    allFlipped + '/' + nCards);
  step('Zusammenfassung erscheint',
    await page.locator('#packSummary').evaluate(e => e.style.display !== 'none'));
  await page.screenshot({ path: SHOTS + '/pack.png', fullPage: true });

  // ================= 6. ZURÜCK AUF HOME =================
  await page.click('#navHome');
  await page.waitForTimeout(350);
  step('Zurück auf Home', await page.locator('#viewHome').evaluate(e => e.classList.contains('active')));

  await browser.close();

  console.log('\nBild-Ladefehler (erwartet, CDN offline): ' + imgFails.length);
  console.log('Echte JS-Fehler: ' + errors.length);
  errors.forEach(e => console.log('  ' + e));
  const bad = steps.filter(s => !s.ok);
  console.log('\n' + (steps.length - bad.length) + '/' + steps.length + ' Schritte ok');
  if (bad.length || errors.length) { console.log('FEHLGESCHLAGEN'); process.exit(1); }
  console.log('ALLE PLAYWRIGHT-CHECKS OK');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
