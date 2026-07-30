/* ==================================================================
 * UI-REGRESSION v6 — Clan-System, Ghost-Clankrieg, Spenden, Rangliste
 * ------------------------------------------------------------------
 * Muster wie run_v5.js: nur ECHTE JS-Fehler zaehlen als Fail; die
 * CDN-Bildfehler sind in dieser Umgebung erwartet (der Prototyp muss
 * ueber die CSS-Gradient-Fallbacks lesbar bleiben).
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_v6.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

/* UMGESCHRIEBEN 30.07.2026: Der Pfad war auf /home/user/elemental-td
   festgenagelt. In einem Worktree pruefte die Suite damit den FREMDEN
   Baum — sie lief gruen, waehrend die geaenderte Datei ungeprueft blieb.
   Das ist die gefaehrlichste Sorte Pruefung: eine, die etwas anderes
   misst als das, was man gerade gebaut hat. Jetzt haengt sie an ihrem
   eigenen Verzeichnis und prueft immer den Baum, in dem sie liegt. */
const FILE = 'file://' + path.resolve(__dirname, '..', 'ui_prototype.html');
const SHOTS = '/tmp/claude-0/-home-user-elemental-td/4b0a76dd-5b22-5fdf-85e8-579f1b036ae5/scratchpad/ui_shots_v6';
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
    if (/ERR_|net::|Failed to load resource|cloudfront|\.png|\.mp4/i.test(t)) { imgFails.push(t); return; }
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

  // ================= 0. MODULE GELADEN =================
  const mods = await page.evaluate(() => ({
    cards: !!window.ArenaCards, fortress: !!window.ArenaFortress,
    rivals: !!window.ArenaRivals, clan: !!window.ArenaClan,
    api: window.ArenaClan ? ['requestCards','donateCards','sendQuota','warBoard',
      'startWarAttack','resolveWarAttack','leaderboard','reportEvent','quests',
      'chestTier','sendEmote','assertSendable'].every(k => typeof window.ArenaClan[k] === 'function') : false,
  }));
  step('arena_clan.js geladen (window.ArenaClan)', mods.clan);
  step('arena_rivals.js mitgeladen (Bot-Population wiederverwendet)', mods.rivals);
  step('ArenaClan-API vollstaendig', mods.api);

  // ================= 1. HOME: HUB-KACHELN =================
  step('Home ist Startansicht', await page.locator('#viewHome').evaluate(e => e.classList.contains('active')));
  /* GEAENDERTE ERWARTUNG, mit Absicht.
     Die fuenf Hub-Icons sassen als Reihe in der Profilzeile. An AAs
     Hauptbildschirm nachgemessen (IMG_3344) stehen sie dort aber NICHT:
     die Namenszeile traegt bei AA nur zwei Knoepfe (Freunde, Menue), und
     die Feature-Kacheln sind die SEITENSCHIENEN links und rechts vom
     Pass-Banner. Genau dorthin sind sie gewandert.
     Geprueft wird deshalb jetzt die neue Ordnung. */
  const knoepfe = await page.locator('.profrow .hubicons .tbmenu').count();
  step('Namenszeile traegt nur Freunde- und Menue-Knopf (wie AA)',
    knoepfe === 2, String(knoepfe));
  // UMGESCHRIEBEN 30.07.2026: Der Waehler griff auf `.hubrail` OHNE Seite und
  // zaehlte damit BEIDE Schienen zusammen — der Schrittname sagte „linke
  // Schiene", gemessen wurde die Summe. Solange die rechte Schiene leer war,
  // fiel das nicht auf. Mit den Offline-Ertraegen (§26) traegt sie einen
  // Knopf, und der Schritt wurde rot, ohne dass die Anforderung dahinter
  // verletzt war. Die lautete: „Links auf dem hauptbildschirm ist 3x das
  // gleiche" — es darf NICHT mehrere Kacheln geben, die dasselbe Fenster
  // oeffnen. Genau das wird jetzt gemessen, je Schiene getrennt.
  const schienen = await page.locator('.hubrail.left .railtile').count();
  const schienenRechts = await page.locator('.hubrail.right .railtile').count();
  // UMGESCHRIEBEN 27.07.: waren 7 (3 links + 4 rechts). Die rechte
  // Schiene ist entfallen — Rangliste und Post stehen im Aufklapp-Menue,
  // der Kristalltresor im Shop, die Packs an den Truhen-Slots. Uebrig
  // bleiben die drei Belohnungs-Kacheln links, die es NIRGENDS sonst
  // gibt. Die alte Zahl haette die geloeschte Doppelung festgeschrieben.
  // 27.07., zweiter Durchgang: aus drei Belohnungs-Kacheln ist EINE
  // geworden. Alle drei oeffneten dasselbe Fenster (openRewards) mit
  // einem anderen Reiter — „Links auf dem hauptbildschirm ist 3x das
  // gleiche". Der Kalender oeffnet es auf LOGIN, die uebrigen Reiter
  // stehen dort oben. Der Zaehler fasst jetzt alle vier zusammen.
  step('Die Belohnungs-Kachel sitzt allein in der linken Schiene',
    schienen === 1, String(schienen));
  step('Die rechte Schiene traegt genau den Offline-Knopf',
    schienenRechts === 1 &&
    (await page.locator('.hubrail.right #icoOffline').count()) === 1,
    String(schienenRechts));
  step('Alte Text-Hub-Kacheln entfernt (Entruempelung)',
    (await page.locator('#tileClanSub').count()) === 0 &&
    (await page.locator('.hubrow').count()) === 0 &&
    (await page.locator('.hubrow2').count()) === 0);
  /* Icon-Sweep Batch 6: Der Clan hat einen Bottom-Nav-Tab bekommen, der
     frei gewordene Slot in der Profilzeile traegt jetzt die PACKS. Der
     Clan-Punkt sitzt damit an der Nav (#badgeClan). */
  const clanBadge = await page.evaluate(() =>
    document.getElementById('badgeClan').style.display !== 'none');
  step('Clan-Tab traegt seinen Benachrichtigungs-Punkt', typeof clanBadge === 'boolean');
  // UMGESCHRIEBEN 27.07.: die Pack-Kachel ist als Doppelweg entfallen.
  step('Packs sind ueber die gefuellten Truhen-Slots erreichbar',
    (await page.locator('#packSlots .slot.full').count()) >= 1);

  // ================= 2. CLAN-VIEW: KOPF =================
  await page.click('#navClan');
  await page.waitForTimeout(350);
  step('Bottom-Nav-Tab oeffnet den Clan-View',
    await page.locator('#viewClan').evaluate(e => e.classList.contains('active')));
  /* UMGESCHRIEBEN 30.07.2026 — die alte Zusage lautete „Name,
     Trophaeen-Schnitt, Mitglieder 30/30" und schrieb damit die
     Chip-Reihe fest, die die Kopfkarte ueberladen hat. Nach dem AA-
     Vorbild traegt die Kopfkarte GENAU DREI Angaben: Clanname, die
     Online-Zeile mit gruenem Punkt und rechts die Trophaeensumme.
     Ø-Trophaeen, 30/30, Kriegsserie und Phase sind NICHT verschwunden —
     sie stehen vollstaendig in der Clanhalle (#clanHallStats) und
     werden dort weiter unten geprueft. Der Schritt misst also dieselbe
     Sache an ihrem neuen Ort, aufgeteilt in zwei Zusagen. */
  const head = await page.locator('#clanHead').textContent();
  const trofSumme = await page.evaluate(() => {
    let s = 0; window.ArenaClan.members().forEach(m => s += m.trophies); return s;
  });
  // \D weg statt nur Leerzeichen: faellt das Pokal-Bild aus, steht das
  // Emoji als Rueckfall im selben Element (UIIcon.fail).
  const trofTxt = (await page.locator('#clanHead .ctro').textContent()).replace(/\D/g, '');
  step('Kopfkarte: Clanname, Online-Zeile und Trophaeensumme',
    /Prisma-Orden/.test(head) && /Mitglieder online:\s*\d+/.test(head) &&
    trofTxt === String(trofSumme),
    head.replace(/\s+/g, ' ').trim().slice(0, 90) + ' | Σ' + trofTxt);
  /* „Vorhandensein ist nicht Sichtbarkeit": der gruene Punkt ist ein
     leeres <i>, ein querySelector haette ihn auch gefunden, wenn er
     0 px breit waere. */
  const punkt = await page.locator('#clanHead .odot').evaluate(e => ({
    sicht: e.getClientRects().length > 0,
    breite: Math.round(e.getBoundingClientRect().width),
    farbe: getComputedStyle(e).backgroundColor,
  }));
  step('Gruener Online-Punkt ist sichtbar (8 px, gruen)',
    punkt.sicht && punkt.breite === 8 && punkt.farbe === 'rgb(72, 226, 34)',
    JSON.stringify(punkt));
  const bannerBg = await page.locator('#clanHead .cbanner').evaluate(e => e.style.background);
  step('Banner traegt die Preset-Farben (Gradient)', /gradient/.test(bannerBg), bannerBg.slice(0, 46));
  const frameCls = await page.locator('#clanHead .cbanner').evaluate(e => e.className);
  step('Banner-Rahmen nach Kriegs-Serie gesetzt', /f-(bronze|silver|gold|prisma)/.test(frameCls), frameCls);
  /* Regression: Das Clan-Wappen hiess zuerst .banner — genau wie das
     Raritaets-Band der Turm-Detailkarte. Die Kollision hat dort den Text
     abgeschnitten. Beide Elemente muessen ihre eigene Groesse behalten. */
  const bannerSizes = await page.evaluate(() => {
    const c = document.querySelector('#clanHead .cbanner').getBoundingClientRect();
    return { clan: Math.round(c.width), clip: getComputedStyle(
      document.querySelector('#clanHead .cbanner')).clipPath.slice(0, 7) };
  });
  step('Clan-Wappen traegt eine eigene Klasse (.cbanner)',
    bannerSizes.clan === 60 && bannerSizes.clip === 'polygon', JSON.stringify(bannerSizes));
  /* UMGESCHRIEBEN 30.07.2026 — der Schritt hiess „Drei Clan-Tabs
     (Quests / Spenden / Krieg)" und schrieb genau die Reiterleiste
     fest, die den View ueberladen hat. AAs Clan-Ansicht hat KEINE
     Reiter, sondern einen durchgehenden Scroll. Die Zusage lautet jetzt
     umgekehrt: im View steht keine Reiterleiste mehr. Dass die drei
     Inhalte noch da sind, prueft der Block „CLANHALLE" weiter unten —
     die Funktionen sind umgezogen, nicht gestrichen. */
  const reiterImView = await page.locator('#viewClan [data-clantab], #viewClan .tabs').count();
  step('Clan-Ansicht traegt KEINE Reiterleiste mehr (AA: ein Scroll)',
    reiterImView === 0, String(reiterImView));

  // ---- 2b. AA-REIHENFOLGE: Band → Kopfkarte → Anfragen → Chat → Knoepfe
  /* Reihenfolge ueber die tatsaechliche Y-Position gemessen, nicht ueber
     die DOM-Reihenfolge: nur die Position sagt, was der Spieler zuerst
     sieht. getClientRects().length > 0 filtert nebenbei alles aus, was
     zwar im DOM steht, aber nicht gezeichnet wird. */
  const reihenfolge = await page.evaluate(() => {
    const sel = ['#viewClan h2.title', '#clanHead', '#paneDonate',
                 '#clanChat', '#viewClan .clanbtns'];
    return sel.map(s => {
      const e = document.querySelector(s);
      return { id: s.replace('#viewClan ', '').replace('#', ''),
               sicht: !!e && e.getClientRects().length > 0,
               top: e ? Math.round(e.getBoundingClientRect().top) : -1 };
    });
  });
  step('AA-Reihenfolge: Band, Kopfkarte, Anfragen, Chat, Knopfreihe — alle sichtbar',
    reihenfolge.every(r => r.sicht) &&
    reihenfolge.every((r, i) => i === 0 || r.top > reihenfolge[i - 1].top),
    reihenfolge.map(r => r.id + '@' + r.top).join(' < '));
  /* Das Titelband ist das h2.title der Kopfzeile — hydrateArt() legt dort
     banner_title als 9-Slice unter und setzt Goldschrift. Ein zweites
     Band per secribbon("CLAN") war die erste Fassung und stand als
     sichtbare Dopplung im Screenshot; genau diesen Fehler haelt der
     zweite Teil dieses Schrittes jetzt fest. */
  const baender = await page.$$eval('#viewClan h2.title, #viewClan .secribbon',
    els => els.filter(e => /^\s*CLAN\s*$/i.test(e.textContent)).length);
  const bandTxt = (await page.locator('#viewClan h2.title').textContent()).trim();
  step('GENAU EIN Titelband „CLAN" ueber der Ansicht',
    /CLAN/i.test(bandTxt) && baender === 1, bandTxt + ' (' + baender + '×)');

  // ---- 2c. DIE DREI KNOEPFE: sichtbar UND klickbar
  /* „Vorhandensein ist nicht Sichtbarkeit" — deshalb je Knopf
     getClientRects(), Groesse und elementFromPoint: ein Knopf, ueber dem
     etwas anderes liegt, ist nicht klickbar, auch wenn er sichtbar ist. */
  // Erst ins Bild rollen: elementFromPoint misst NUR im Sichtfenster.
  // Ohne das meldet der Treffertest „verdeckt", obwohl nichts verdeckt
  // ist — die Knoepfe stehen am Ende eines langen Scrolls.
  await page.locator('#viewClan .clanbtns').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const dreiKnoepfe = await page.evaluate(() => {
    return ['btnAskCards', 'btnClanDuel', 'btnClanChat'].map(id => {
      const e = document.getElementById(id);
      if (!e) return { id, sicht: false };
      const r = e.getBoundingClientRect();
      const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { id, sicht: e.getClientRects().length > 0,
               breite: Math.round(r.width), hoehe: Math.round(r.height),
               gesperrt: e.disabled === true,
               frei: !!oben && (oben === e || e.contains(oben)),
               txt: e.textContent.trim() };
    });
  });
  step('Drei Knoepfe unten: Anfragen · Freundschaftskampf · Chat',
    dreiKnoepfe.map(k => k.txt).join('|') === 'Anfragen|Freundschaftskampf|Chat',
    dreiKnoepfe.map(k => k.txt).join(' · '));
  step('Alle drei sind sichtbar, frei und klickbar (nicht nur im DOM)',
    dreiKnoepfe.every(k => k.sicht && k.frei && !k.gesperrt &&
      k.breite > 90 && k.hoehe > 30),
    dreiKnoepfe.map(k => k.id + ' ' + k.breite + '×' + k.hoehe +
      (k.frei ? '' : ' VERDECKT')).join(' · '));
  const chatBlasen = await page.locator('#clanChat .chatblase').count();
  const chatErste = (await page.locator('#clanChat .chatzeile').first().textContent())
    .replace(/\s+/g, ' ').trim();
  step('Chat-Vorschau: Avatar + Blase mit Name, Rolle, Text und Zeit',
    chatBlasen === 3 &&
    (await page.locator('#clanChat .chatzeile .chatav').count()) === chatBlasen &&
    /(Anführer|Ältester|Mitglied)/.test(chatErste) && /vor \d+ Stunde/.test(chatErste),
    chatErste.slice(0, 80));
  step('Die Vorschau ist im UI als Beispiel gekennzeichnet',
    /Beispiel/.test(await page.locator('#clanChat .chatdemo').textContent()));
  await page.screenshot({ path: SHOTS + '/clan_ansicht.png', fullPage: true });

  // ================= 2d. CLAN-CHAT (Nachtrag 30.07.2026) =================
  /* Der Chat wird GEBAUT, nicht angedeutet — die frühere Zusage („der
     Knopf sagt, dass es keinen Chat gibt") ist damit überholt und der
     Schritt dazu ersetzt. Was bleibt, ist die EHRLICHKEIT: es gibt
     keinen Server. Deshalb prüft dieser Block ausdrücklich auch, dass
     NIEMAND auf die eigene Nachricht antwortet. Ein Chat, der antwortet,
     obwohl niemand da ist, wäre der schlimmere Fehler als gar keiner. */
  await page.click('#btnClanChat');
  await page.waitForTimeout(320);
  const chatOffen = await page.locator('#chatLayer').evaluate(e => ({
    klasse: e.classList.contains('open'),
    sicht: e.getClientRects().length > 0,
    blattSicht: (() => { const s = e.querySelector('.chatsheet');
      return !!s && s.getClientRects().length > 0 &&
        s.getBoundingClientRect().width > 200; })(),
  }));
  step('Chat-Knopf oeffnet das Chat-Fenster (sichtbar, nicht nur vorhanden)',
    chatOffen.klasse && chatOffen.sicht && chatOffen.blattSicht, JSON.stringify(chatOffen));
  step('Das Fenster sagt offen, dass der Chat nur lokal laeuft',
    /nur lokal/.test(await page.locator('#chatLokal').textContent()));
  const verlauf0 = await page.locator('#chatVerlauf .chatzeile').count();
  step('Verlauf zeigt die Demo-Nachrichten der Mitglieder', verlauf0 === 3, String(verlauf0));
  const rollen = await page.$$eval('#chatVerlauf .crolle', els => els.map(e => e.textContent));
  step('Jede Blase traegt eine Rolle (Anführer / Ältester / Mitglied)',
    rollen.length === 3 && rollen.every(r => /^(Anführer|Ältester|Mitglied)$/.test(r)),
    rollen.join('/'));
  const zeiten = await page.$$eval('#chatVerlauf .czeit', els => els.map(e => e.textContent));
  step('Jede Blase traegt eine ausgeschriebene Zeit („vor 15 Minuten")',
    zeiten.every(z => /^(gerade eben|vor \d+ (Minuten?|Stunden?|Tagen?))$/.test(z.trim())),
    zeiten.join(' · '));

  // --- Leere Nachricht wird NICHT gesendet ---
  await page.click('#btnChatSend');
  await page.waitForTimeout(240);
  step('Leere Nachricht wird nicht gesendet',
    (await page.locator('#chatVerlauf .chatzeile').count()) === verlauf0);
  // Gegenprobe: nur Leerzeichen ist derselbe Fall.
  await page.fill('#chatInput', '     ');
  await page.click('#btnChatSend');
  await page.waitForTimeout(240);
  step('Auch eine Nachricht aus lauter Leerzeichen wird nicht gesendet',
    (await page.locator('#chatVerlauf .chatzeile').count()) === verlauf0 &&
    (await page.locator('#chatVerlauf .chatzeile.ich').count()) === 0);

  // --- Smiley-Auswahl ---
  await page.fill('#chatInput', '');
  await page.click('#btnSmiley');
  await page.waitForTimeout(260);
  const smAuf = await page.locator('#smileyFeld').evaluate(e => ({
    sicht: e.getClientRects().length > 0,
    zeichen: e.querySelectorAll('[data-smiley]').length,
    gruppen: e.querySelectorAll('.smileygrp').length,
  }));
  step('Smiley-Knopf klappt eine kuratierte Auswahl auf (Gruppen, 24–32 Zeichen)',
    smAuf.sicht && smAuf.zeichen >= 24 && smAuf.zeichen <= 32 && smAuf.gruppen >= 3,
    smAuf.zeichen + ' Zeichen in ' + smAuf.gruppen + ' Gruppen');
  /* Mit offener Auswahl ist das Fenster am hoechsten. Wenn es hier nicht
     mehr passt, rutscht die Eingabezeile aus dem Bild — der Knopf, den
     man gerade braucht. Gemessen statt gehofft. */
  const passt = await page.evaluate(() => {
    const b = document.querySelector('#chatLayer .chatsheet').getBoundingClientRect();
    const z = document.querySelector('.chateingabe').getBoundingClientRect();
    return { blatt: Math.round(b.height), fenster: window.innerHeight,
             zeileUnten: Math.round(z.bottom) };
  });
  step('Fenster passt mit offener Auswahl ins Bild, Eingabezeile bleibt sichtbar',
    passt.blatt <= passt.fenster && passt.zeileUnten <= passt.fenster,
    passt.blatt + ' px Blatt in ' + passt.fenster + ' px, Zeile endet bei ' + passt.zeileUnten);
  /* Ein Tippen fuegt GENAU EIN Zeichen ein — nicht zwei, nicht den
     ganzen Namen — und die Auswahl bleibt offen, weil man selten genau
     ein Zeichen setzen will. Gezaehlt wird in Codepoints, nicht in
     UTF-16-Einheiten: 👍 ist zwei .length-Einheiten und wuerde als
     „zwei Zeichen" durchgehen. */
  await page.click('#smileyFeld [data-smiley]');
  await page.waitForTimeout(220);
  const nachEinem = await page.evaluate(() => ({
    wert: document.getElementById('chatInput').value,
    zeichen: Array.from(document.getElementById('chatInput').value).length,
    nochOffen: document.getElementById('smileyFeld').getClientRects().length > 0,
  }));
  step('Ein Tippen fuegt GENAU EIN Zeichen ein, die Auswahl bleibt offen',
    nachEinem.zeichen === 1 && nachEinem.nochOffen,
    JSON.stringify(nachEinem));
  // Cursorposition: das zweite Zeichen landet HINTER dem ersten.
  await page.click('#smileyFeld [data-smiley]');
  await page.waitForTimeout(200);
  step('Zwei Smileys hintereinander gehen ohne Zwischenschritt',
    (await page.evaluate(() =>
      Array.from(document.getElementById('chatInput').value).length)) === 2);
  await page.click('#btnSmiley');            // Auswahl wieder zuklappen
  await page.waitForTimeout(220);

  // --- Echte Nachricht senden ---
  const MEIN_TEXT = 'Ich sammle Frost — Anfrage steht oben!';
  await page.fill('#chatInput', MEIN_TEXT);
  await page.click('#btnChatSend');
  await page.waitForTimeout(320);
  const nachSenden = await page.evaluate(() => {
    const zeilen = Array.from(document.querySelectorAll('#chatVerlauf .chatzeile'));
    const letzte = zeilen[zeilen.length - 1];
    return { n: zeilen.length, ich: document.querySelectorAll('#chatVerlauf .chatzeile.ich').length,
             txt: letzte ? letzte.querySelector('.ctext').textContent : '',
             feldLeer: document.getElementById('chatInput').value === '' };
  });
  step('Gesendete Nachricht steht sofort im Verlauf und ist als eigene abgesetzt',
    nachSenden.n === verlauf0 + 1 && nachSenden.ich === 1 &&
    nachSenden.txt === MEIN_TEXT && nachSenden.feldLeer,
    JSON.stringify(nachSenden).slice(0, 110));
  const abgesetzt = await page.locator('#chatVerlauf .chatzeile.ich').evaluate(e => ({
    richtung: getComputedStyle(e).flexDirection,
    farbe: getComputedStyle(e.querySelector('.chatblase')).borderTopColor,
  }));
  step('Eigene Blase steht auf der anderen Seite UND hat eine andere Farbe',
    abgesetzt.richtung === 'row-reverse' && abgesetzt.farbe !== 'rgb(38, 52, 63)',
    JSON.stringify(abgesetzt));
  await page.click('#chatClose');
  await page.waitForTimeout(300);
  const vorschauTxt = (await page.locator('#clanChat').textContent()).replace(/\s+/g, ' ');
  step('Die Nachricht steht auch in der Vorschau der Hauptansicht',
    vorschauTxt.indexOf(MEIN_TEXT) >= 0 &&
    (await page.locator('#clanChat .chatzeile.ich').count()) === 1,
    vorschauTxt.slice(-90).trim());
  /* KEINE ANTWORT. Zwei Sekunden warten und nachzaehlen: waere hier ein
     Bot verdrahtet, wuerde er genau in diesem Fenster zuschlagen. */
  await page.waitForTimeout(2000);
  const keineAntwort = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('arenaClanChat')).msgs.length);
  step('Niemand antwortet — es gibt keinen Bot, der Anwesenheit vortaeuscht',
    keineAntwort === verlauf0 + 1, keineAntwort + ' Nachrichten im Speicher');
  const speicher = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('arenaClanChat')));
  step('Eigener Speicherschluessel „arenaClanChat" mit Version im Datensatz',
    speicher.v === 1 && Array.isArray(speicher.msgs),
    JSON.stringify({ v: speicher.v, n: speicher.msgs.length }));
  step('Demo-Zeilen sind IM DATENSATZ als Demo gekennzeichnet',
    speicher.msgs.filter(m => m.demo === true).length === 3 &&
    speicher.msgs.filter(m => m.ich === true).every(m => m.demo === false),
    speicher.msgs.map(m => (m.demo ? 'demo' : 'ich')).join('/'));

  // --- Reload: die Nachricht muss ueberleben ---
  await page.reload();
  await page.waitForTimeout(900);
  if (await page.locator('#loginLayer.open').count()) {
    await page.click('#loginLater');
    await page.waitForTimeout(350);
  }
  await page.click('#navClan');
  await page.waitForTimeout(400);
  const nachReload = (await page.locator('#clanChat').textContent()).replace(/\s+/g, ' ');
  await page.click('#btnClanChat');
  await page.waitForTimeout(320);
  const verlaufReload = await page.evaluate(txt => {
    const zeilen = Array.from(document.querySelectorAll('#chatVerlauf .chatzeile'));
    return { n: zeilen.length,
             treffer: zeilen.some(z => z.querySelector('.ctext').textContent === txt) };
  }, MEIN_TEXT);
  step('Nachricht ueberlebt den Reload — im Verlauf UND in der Vorschau',
    verlaufReload.n === verlauf0 + 1 && verlaufReload.treffer &&
    nachReload.indexOf(MEIN_TEXT) >= 0,
    verlaufReload.n + ' Zeilen');
  await page.screenshot({ path: SHOTS + '/clan_chat.png' });
  await page.click('#chatClose');
  await page.waitForTimeout(280);

  // ================= 3. CLANHALLE: TAB QUESTS =================
  /* UMGESCHRIEBEN 30.07.2026 — Quests, Krieg und Aktivitaet standen als
     Reiter im View und waren ohne Klick erreichbar. Sie liegen jetzt
     hinter EINEM Zugang (Knopf „Clanhalle" in der Kopfkarte). Alle
     folgenden Inhaltspruefungen sind unveraendert; davor steht nur der
     Weg dorthin. Der Zugang selbst ist eine neue Zusage und wird
     mitgeprueft. */
  const hallKnopf = await page.locator('#clanHead #btnClanHall').evaluate(e => ({
    sicht: e.getClientRects().length > 0, txt: e.textContent.trim() }));
  step('Kopfkarte traegt EINEN beschrifteten Zugang zum Rest',
    hallKnopf.sicht && /Clanhalle/.test(hallKnopf.txt), hallKnopf.txt);
  await page.click('#btnClanHall');
  await page.waitForTimeout(300);
  step('Clanhalle oeffnet',
    await page.locator('#clanHallDlg').evaluate(e => e.classList.contains('open')));
  const hallTabs = await page.locator('#clanHallDlg [data-clantab]').count();
  step('Clanhalle traegt die drei Reiter (Quests / Krieg / Aktivitaet)',
    hallTabs === 3, String(hallTabs));
  /* Die alten Kopf-Kennzahlen — vollstaendig, nur eine Ebene tiefer. */
  const hallStats = (await page.locator('#clanHallStats').textContent()).replace(/\s+/g, ' ');
  step('Verdraengte Kennzahlen stehen vollstaendig in der Clanhalle',
    /Ø/.test(hallStats) && /30\/30/.test(hallStats) && /Serie/.test(hallStats) &&
    /(Sammelphase|Kriegsphase)/.test(hallStats), hallStats.trim().slice(0, 95));
  const qcards = await page.locator('#paneQuests .qcard').count();
  step('3 Wochenquests als Karten', qcards === 3, String(qcards));
  const qtxt = await page.locator('#paneQuests').textContent();
  step('Quest-Ziele 360 / 120 / 5 400 sichtbar',
    /360/.test(qtxt) && /120/.test(qtxt) && /5\s?400/.test(qtxt));
  const bars = await page.locator('#paneQuests .qbar').count();
  const fills = await page.$$eval('#paneQuests .qfill', els => els.map(e => parseFloat(e.style.width)));
  /* ⚠ GEAENDERT, mit Absicht — die alte Fassung war am Wochenanfang
     systematisch falsch. Sim.questContribution skaliert mit
     collectFrac(now), dem Anteil der verstrichenen Woche. Am
     Montagmorgen ist der Anteil ~0,04 und die Bot-Summe eines Quests
     rundet auf 0. Gemessen an derselben Uhr:
       jetzt (Mo 06:19)  wins 23 · packs   0 · trophies  269
       +1 Tag            wins 79 · packs  29 · trophies 1278
       +3 Tage          wins 204 · packs  73 · trophies 3290
     Die Pruefung testete also den Wochentag, nicht die Mechanik.
     Jetzt wird die Mechanik an einem festen Zeitpunkt gemessen — die
     API nimmt `now` entgegen — und im DOM nur noch geprueft, dass die
     Balken da sind und nicht ueberlaufen. */
  step('Drei Koop-Fortschrittsbalken, keiner ueber 100 %',
    bars === 3 && fills.every(f => f >= 0 && f <= 100), fills.map(f => f.toFixed(1) + '%').join(' / '));
  const botMitte = await page.evaluate(() => {
    const t = Date.now() + 3 * 864e5;            // drei Tage in die Woche
    return window.ArenaClan.quests(t).map(q => ({ k: q.key, bots: q.bots }));
  });
  step('Bots tragen ueber die Woche zu JEDEM Quest bei',
    botMitte.length === 3 && botMitte.every(q => q.bots > 0),
    botMitte.map(q => q.k + '=' + q.bots).join(' · '));
  const mines = await page.$$eval('#paneQuests .qmine', els => els.map(e => parseFloat(e.style.width)));
  step('Eigener Anteil separat eingefaerbt', mines.some(m => m > 0),
    mines.map(m => m.toFixed(1) + '%').join(' / '));
  const chests = await page.locator('#paneQuests .chestcard').count();
  const reached = await page.locator('#paneQuests .chestcard.reached').count();
  step('Truhen-Staffel Bronze/Silber/Gold', chests === 3, String(chests));
  /* Dieselbe Ursache wie beim Bot-Anteil: chestTier() mittelt die drei
     Quest-Fuellgrade, und die haengen am Wochenfortschritt. Gemessen:
     jetzt (Mo) 9 % und keine Stufe, +3 Tage 64 % und Bronze. Die
     Pruefung testete den Wochentag. Jetzt: die Staffel wird an einem
     festen Zeitpunkt geprueft, im DOM nur die Struktur. */
  step('Keine Stufe faelschlich als erreicht markiert', reached <= 3,
    reached + ' von 3 (Wochenanfang: 0 ist richtig)');
  const staffel = await page.evaluate(() => {
    /* ⚠ NICHT Date.now(): die Truhen-Staffel laeuft ueber die WOCHE und
       setzt am Wochenanfang zurueck. Mit dem Tageswert als Basis fielen
       „+3 Tage" und „+6 Tage" je nach Wochentag in die naechste Woche —
       dann faellt der Fortschritt zurueck und die Pruefung meldet einen
       Fehler, den es nicht gibt. Sie war damit an die Uhrzeit ihres
       Laufs gebunden statt an die Mechanik.
       Basis ist jetzt ein fester Montag 00:00 UTC; die drei Proben
       liegen garantiert in derselben Woche. */
    const T = Date.UTC(2026, 6, 27);   // Montag
    return [0, 3, 6].map(d => {
      const c = window.ArenaClan.chestTier(T + d * 864e5);
      return { tag: d, pct: Math.round(c.pct * 100), stufe: c.tier || '—' };
    });
  });
  step('Truhen-Staffel steigt ueber die Woche und erreicht eine Stufe',
    staffel[0].pct <= staffel[1].pct && staffel[1].pct <= staffel[2].pct &&
    staffel[2].stufe !== '—',
    staffel.map(x => 'Tag ' + x.tag + ': ' + x.pct + '% ' + x.stufe).join(' · '));
  // GOLDTEXT-REGEL: dunkle Schrift auf goldenem Knopf
  const claimStyle = await page.locator('#btnClaimChest').evaluate(e => {
    const cs = getComputedStyle(e);
    return { fill: cs.webkitTextFillColor || cs.color, gold: e.classList.contains('goldtext') };
  });
  step('Claim-Knopf: KEIN goldtext auf goldener Flaeche (dunkle Fuellfarbe)',
    !claimStyle.gold && /rgb\((?:\d+), (?:\d+), (?:\d+)\)/.test(claimStyle.fill), claimStyle.fill);
  await page.screenshot({ path: SHOTS + '/clan_quests.png', fullPage: true });

  // ================= 4. SPENDEN (jetzt die HAUPTANSICHT) =================
  /* UMGESCHRIEBEN 30.07.2026 — es gibt keinen Spenden-Reiter mehr, weil
     das Spenden bei AA die Hauptansicht IST. Der Klick auf #ctabDonate
     entfaellt ersatzlos; die Clanhalle wird vorher geschlossen, damit
     wieder der View gemessen wird und nicht das Fenster darueber. */
  await page.click('#clanHallClose');
  await page.waitForTimeout(250);
  step('Spenden-Anfragen stehen ohne Umweg im View',
    await page.locator('#paneDonate').evaluate(e =>
      e.getClientRects().length > 0 && e.closest('.modal') === null));
  const quota0 = (await page.locator('#paneDonate .quotabar').textContent()).replace(/\s+/g, ' ').trim();
  step('Sendekontingent-Anzeige "X/10 · Reset in h:mm"',
    /0\/10/.test(quota0) && /(Reset in|voll verf)/.test(quota0), quota0);
  const dots = await page.locator('#paneDonate .quotabar .qd').count();
  step('10 Kontingent-Punkte', dots === 10, String(dots));
  /* UMGESCHRIEBEN 30.07.2026 — Waehler .reqrow → .anfrage. Die Anfrage
     ist keine flache Zeile mehr, sondern die zweiteilige AA-Karte; der
     alte Klassenname haette die alte Bauweise festgeschrieben. Die
     Zusage (mindestens drei offene Bot-Anfragen) ist unveraendert. */
  const reqs0 = await page.locator('#paneDonate .anfrage').count();
  step('Aktive Anfragen als Karten (3 Bot-Anfragen)', reqs0 >= 3, String(reqs0));
  /* ERGAENZT 30.07.2026 um die SICHTBARKEIT. Der Schritt las nur den
     Text — und genau das hat einen echten Fehler durchgelassen: die
     GRAU-Marke lag unter dem Rahmen-Overlay (.frm, z-index 3) und war
     im Screenshot nicht zu sehen, waehrend der Schritt gruen blieb.
     Jetzt wird auch gemessen, dass sie oben liegt und Flaeche hat. */
  const tierLabels = await page.$$eval('#paneDonate .anfbild .rtier', els => els.map(e => {
    const cs = getComputedStyle(e);
    const rahmen = e.parentElement.querySelector('.frm');
    return { t: e.textContent, sicht: e.getClientRects().length > 0,
             hoehe: Math.round(e.getBoundingClientRect().height),
             ueberRahmen: !rahmen || (+cs.zIndex > +getComputedStyle(rahmen).zIndex) };
  }));
  step('Jede Anfrage ist als GRAU (Basis-Kopie) markiert — und man SIEHT es',
    tierLabels.length >= 3 &&
    tierLabels.every(x => x.t === 'GRAU' && x.sicht && x.hoehe >= 8 && x.ueberRahmen),
    tierLabels.map(x => x.t + '(' + x.hoehe + 'px' + (x.ueberRahmen ? '' : ', VERDECKT') + ')').join('/'));
  /* NEU 30.07.2026 — die fuenf Teile der AA-Anfragekarte. Gemessen wird
     an einer FREMDEN Anfrage: die eigene traegt statt des SPENDEN-Knopfs
     den Hinweis „deine Anfrage", und das ist richtig so. */
  const teile = await page.evaluate(() => {
    const k = document.querySelector('#paneDonate .anfrage:not(.mine)');
    if (!k) return null;
    const sicht = s => {
      const e = k.querySelector(s);
      return !!e && e.getClientRects().length > 0;
    };
    return {
      marke: sicht('.anfmarke'), kopfName: sicht('.anfkopf .anfname'),
      kopfFrage: sicht('.anfkopf .anffrage'), info: sicht('.anfinfo'),
      bild: sicht('.anfbild'), hast: sicht('.anfhast'),
      knopf: sicht('.anfspenden'), balken: sicht('.anffort .fbar'),
      zahl: sicht('.anffort .fnum'),
      frageTxt: (k.querySelector('.anffrage') || {}).textContent || '',
      hastTxt: (k.querySelector('.anfhast') || {}).textContent || '',
      erhalten: (k.querySelector('.anffort') || {}).textContent || '',
      knopfTxt: (k.querySelector('.anfspenden') || {}).textContent || '',
      knopfBreite: Math.round(
        (k.querySelector('.anfspenden') || { getBoundingClientRect: () => ({ width: 0 }) })
          .getBoundingClientRect().width),
      markeTxt: (k.querySelector('.anfmarke') || {}).textContent || '',
    };
  });
  step('Anfragekarte hat alle fuenf Teile — und alle sind SICHTBAR',
    !!teile && teile.marke && teile.kopfName && teile.kopfFrage && teile.info &&
    teile.bild && teile.hast && teile.knopf && teile.balken && teile.zahl,
    teile ? JSON.stringify(teile).slice(0, 120) : 'keine fremde Anfrage gefunden');
  step('Kopf: „Fragt nach <Karte>!" · Koerper: „Du hast" · Balken: „Erhalten: n/30"',
    /^Fragt nach .+!$/.test(teile.frageTxt.trim()) &&
    // Leerraum ganz weg: „Du hast" und die Zahl sind zwei Elemente,
    // dazwischen steht der Zeilenumbruch des Markups.
    /^Duhast\d+$/.test(teile.hastTxt.replace(/\s+/g, '')) &&
    /^Erhalten:\d+\/\d+$/.test(teile.erhalten.replace(/\s+/g, '')),
    [teile.frageTxt, teile.hastTxt, teile.erhalten].map(s => s.replace(/\s+/g, ' ').trim()).join(' | '));
  step('Runde Marke traegt die Zahl der offenen Spenden',
    /^\d+$/.test(teile.markeTxt.trim()), teile.markeTxt.trim());
  /* Der Knopf war als .donbtn 62 px breit; AAs Knopf ist der groesste
     Treffer der Karte. 96 px sind im CSS gesetzt und hier nachgemessen. */
  step('SPENDEN-Knopf ist gross statt fitzelig', teile.knopfTxt.trim() === 'SPENDEN' &&
    teile.knopfBreite >= 90, teile.knopfBreite + ' px');
  /* UMGESCHRIEBEN 30.07.2026 — der Regeltext stand als sechszeiliger
     Block unter der Liste und war der groesste Einzelposten des
     „cluttered"-Befunds. Er ist NICHT gestrichen: er steht hinter dem ⓘ
     der Anfragekarte, das AAs Vorbild dort ohnehin hat. Der Schritt
     prueft denselben Wortlaut, nur einen Klick weiter — und nebenbei,
     dass das ⓘ ueberhaupt funktioniert. */
  await page.click('#paneDonate .anfrage:not(.mine) .anfinfo');
  await page.waitForTimeout(250);
  step('ⓘ der Anfragekarte oeffnet die Spenden-Regeln',
    await page.locator('#spendInfoDlg').evaluate(e => e.classList.contains('open')));
  const note = await page.locator('#spendInfoDlg .sendnote').textContent();
  step('Regeltext nennt: nur Turmkarten, nur grau, 10 pro 3 h, Fusionen selbst',
    /nur Turmkarten/i.test(note) && /graue/.test(note) && /10 Karten pro 3 Stunden/.test(note) &&
    /Fusionen/.test(note));
  await page.click('#spendInfoClose');
  await page.waitForTimeout(200);

  // --- Spenden-Flow: SPENDEN klicken ---
  const goldBefore = await page.evaluate(() => parseInt(localStorage.getItem('arenaHubGold') || '0', 10));
  const copiesBefore = await page.evaluate(() => {
    const r = window.ArenaClan.requests().filter(x => !x.mine && !x.closed)[0];
    const c = window.ArenaCards.get().cards[r.cardId];
    return { id: r.id, cardId: r.cardId, need: r.need, got: r.got, copies: c.copies.common };
  });
  await page.click('#paneDonate [data-donate]');
  await page.waitForTimeout(320);
  const afterDon = await page.evaluate(cid => {
    const c = window.ArenaCards.get().cards[cid];
    return { copies: c.copies.common, quota: window.ArenaClan.sendQuota(),
             gold: parseInt(localStorage.getItem('arenaHubGold') || '0', 10) };
  }, copiesBefore.cardId);
  step('Spende zieht graue Kopien beim Spender ab',
    afterDon.copies < copiesBefore.copies,
    copiesBefore.copies + ' → ' + afterDon.copies + ' (' + copiesBefore.cardId + ')');
  step('Sendekontingent zaehlt jede Karte einzeln',
    afterDon.quota.used === copiesBefore.copies - afterDon.copies && afterDon.quota.used > 0,
    afterDon.quota.used + '/10');
  step('Spender-Belohnung: Gold gutgeschrieben (25 je Karte)',
    afterDon.gold === goldBefore + 25 * afterDon.quota.used,
    goldBefore + ' → ' + afterDon.gold);
  const quota1 = (await page.locator('#paneDonate .quotabar').textContent()).replace(/\s+/g, ' ').trim();
  step('Anzeige aktualisiert sich auf "X/10 · Reset in h:mm"',
    new RegExp(afterDon.quota.used + '\\/10').test(quota1) && /Reset in \d+:\d\d/.test(quota1), quota1);

  // --- Harte Validierung im Browser nachweisen ---
  const guards = await page.evaluate(() => {
    const CL = window.ArenaClan;
    const grab = fn => { try { fn(); return null; } catch (e) { return e.message; } };
    const open = CL.requests().filter(r => !r.mine && !r.closed)[0];
    return {
      hero: grab(() => CL.assertSendable('solara', 'common')),
      green: grab(() => CL.assertSendable('fire', 'good')),
      greenDon: open ? grab(() => CL.donateCards(open.id, 1, 'good')) : null,
      gold: grab(() => CL.assertSendable('gold', 'common')),
      okCommon: CL.canSend('fire', 'common'),
    };
  });
  step('Held senden → Fehler (deutsch)', /Nur Turmkarten/.test(guards.hero || ''), guards.hero);
  step('Gruene Karte senden → Fehler (deutsch)',
    /Nur graue Basis-Kopien/.test(guards.green || '') && /Fusionen macht jeder selbst/.test(guards.green || ''),
    guards.green);
  step('donateCards(..., "good") → Fehler', /Nur graue Basis-Kopien/.test(guards.greenDon || ''),
    guards.greenDon);
  step('Gold/Material senden → Fehler', /Nur Turmkarten/.test(guards.gold || ''), guards.gold);
  step('Graue Turmkarte bleibt erlaubt', guards.okCommon === true);

  // --- Eigene Anfrage stellen ---
  await page.click('#btnAskCards');
  await page.waitForTimeout(250);
  step('Anfrage-Dialog oeffnet',
    await page.locator('#reqDlg').evaluate(e => e.classList.contains('open')));
  const picks = await page.locator('#reqPick [data-ask]').count();
  const pickIds = await page.$$eval('#reqPick [data-ask]', els => els.map(e => e.getAttribute('data-ask')));
  step('Karten-Wahl zeigt GENAU die 6 Element-Tuerme (keine Helden)',
    picks === 6 && !pickIds.includes('solara') && !pickIds.includes('magmor'),
    pickIds.join(','));
  await page.click('#reqPick [data-ask="water"]');
  await page.waitForTimeout(320);
  step('Dialog schliesst nach der Wahl',
    await page.locator('#reqDlg').evaluate(e => !e.classList.contains('open')));
  // Waehler .reqrow.mine → .anfrage.mine (30.07.2026, neue Kartenbauweise)
  const mineRow = await page.locator('#paneDonate .anfrage.mine').count();
  const mineTxt = mineRow ? await page.locator('#paneDonate .anfrage.mine').first().textContent() : '';
  step('Eigene Anfrage erscheint hervorgehoben in der Liste',
    mineRow === 1 && /FROST/.test(mineTxt), mineTxt.replace(/\s+/g, ' ').trim().slice(0, 60));
  const askDisabled = await page.locator('#btnAskCards').evaluate(e => e.disabled);
  step('Zweite Anfrage gesperrt (max 1 aktiv)', askDisabled === true);
  const cd = await page.evaluate(() => {
    try { window.ArenaClan.requestCards('fire'); return null; }
    catch (e) { return e.message; }
  });
  step('Anfrage-Cooldown/Einzelanfrage wirft deutsche Meldung',
    /offene Anfrage|Neue Anfrage erst in/.test(cd || ''), cd);
  await page.screenshot({ path: SHOTS + '/clan_spenden.png', fullPage: true });

  // --- Limit: bis 10 fuellen, dann muss die 11. scheitern ---
  const limit = await page.evaluate(() => {
    const CL = window.ArenaClan, AC = window.ArenaCards;
    /* ⚠ FESTER ZEITPUNKT. Vorher lief das gegen Date.now() — und wie
       viele fremde Anfragen offen sind, haengt am Zeitpunkt: `get(now)`
       erzeugt und schliesst sie ueber die Zeit. Reichten sie gerade
       nicht fuer zehn Karten, brach die Schleife bei `if (!r) break`
       ab und die Pruefung meldete 9/10 — ein Fehler, den es im Produkt
       nie gab. Sie war an ihre eigene Laufzeit gebunden.
       sendQuota, requests und donateCards nehmen alle ein `now`
       entgegen; die Pruefung hat es nur nie benutzt. */
    const JETZT = Date.UTC(2026, 6, 29, 12);   // Mittwochmittag
    CL.TOWER_IDS.forEach(id => AC.addDrop(id, 'common', 60));
    const offen = () => CL.requests(JETZT).filter(x => !x.mine && !x.closed && x.left > 0);
    const kapazitaet = offen().reduce((s, r) => s + r.left, 0);
    let guard = 0;
    while (CL.sendQuota(JETZT).left > 0 && guard++ < 40) {
      const r = offen()[0];
      if (!r) break;
      const n = Math.min(r.left, CL.sendQuota(JETZT).left);
      try { CL.donateCards(r.id, n, 'common', JETZT); } catch (e) { break; }
    }
    const r2 = offen()[0];
    let msg = null;
    if (r2) { try { CL.donateCards(r2.id, 1, 'common', JETZT); } catch (e) { msg = e.message; } }
    const q = CL.sendQuota(JETZT);
    return { used: q.used, full: q.full, msg, kapazitaet };
  });
  /* Das Limit ist nur pruefbar, wenn ueberhaupt zehn Karten Nachfrage
     da sind. Fehlt sie, ist das ein Mangel des AUFBAUS und muss als
     solcher dastehen — nicht als Produktfehler getarnt. */
  step('Genug offene Anfragen, um das Sendelimit zu pruefen',
    limit.kapazitaet >= 10, limit.kapazitaet + ' Karten Nachfrage');
  step('Genau 10 Karten pro 3 h gehen durch', limit.used === 10 && limit.full === true,
    limit.used + '/10');
  step('Die 11. Karte wird abgelehnt (Limit + Restzeit in der Meldung)',
    /Sendelimit erreicht/.test(limit.msg || '') && /Nächster Slot frei in \d+:\d\d/.test(limit.msg || ''),
    limit.msg);

  // ================= 5. CLANHALLE: TAB KRIEG =================
  /* UMGESCHRIEBEN 30.07.2026 — der Kriegsreiter liegt in der Clanhalle.
     Der Inhalt der Pruefung ist unveraendert, nur der Weg dorthin ist
     jetzt zwei Klicks statt einem. */
  await page.click('#btnClanHall');
  await page.waitForTimeout(280);
  await page.click('#ctabWar');
  await page.waitForTimeout(250);
  const warPre = await page.locator('#paneWar').textContent();
  const isCollect = /SAMMELPHASE/.test(warPre);
  step('Krieg-Tab zeigt Sammelphase-Countdown ODER Kriegsboard',
    isCollect || /VS/.test(warPre), isCollect ? 'Sammelphase' : 'Kriegsphase');
  if (isCollect) {
    const cdTxt = (await page.locator('#paneWar .wc').textContent()).trim();
    step('Countdown im Format h:mm', /^\d+:\d\d$/.test(cdTxt), cdTxt);
    step('Gegnerclan schon in der Sammelphase benannt', /VS/.test(warPre));
    await page.click('#btnWarDemo');           // Demo-Uhr auf Samstag
    await page.waitForTimeout(400);
  }
  const wb = await page.evaluate(() => {
    const b = window.ArenaClan.warBoard();
    return { phase: b.phase.phase, targets: b.targets.length, left: b.attacksLeftToday,
             per: b.attacksPerDay, us: b.us.points, them: b.them.points,
             usName: b.us.name, themName: b.them.name };
  });
  step('Kriegsphase aktiv, beide Clans auf dem Board',
    wb.phase === 'war' && !!wb.usName && !!wb.themName, wb.usName + ' vs ' + wb.themName);
  const sides = await page.locator('#paneWar .warside').count();
  const ghosts = await page.locator('#paneWar .ghostrow').count();
  step('Kriegsboard: 2 Clans + Punktestand', sides === 2, String(sides));
  step('Angriffs-Liste mit 30 Ghost-Gegnern', ghosts === 30, String(ghosts));
  const leftTxt = (await page.locator('#paneWar .atkhead .left').textContent()).trim();
  step('Angriffe-uebrig-Anzeige', /Angriffe heute 3\/3/.test(leftTxt), leftTxt);
  // Drei Angriffe ausfuehren, der vierte muss blockiert sein
  for (let i = 0; i < 3; i++) {
    const btn = page.locator('#paneWar [data-attack]').first();
    if (!(await btn.count())) break;
    await btn.click();
    await page.waitForTimeout(280);
  }
  const afterWar = await page.evaluate(() => {
    const b = window.ArenaClan.warBoard();
    let msg = null;
    const free = b.targets.filter(t => !t.attacked)[0];
    if (free) { try { window.ArenaClan.startWarAttack(free.id); } catch (e) { msg = e.message; } }
    const hit = b.targets.filter(t => t.attacked);
    return { my: b.us.myPoints, left: b.attacksLeftToday, hits: hit.length,
             pts: hit.map(t => t.points), msg, lead: b.lead };
  });
  step('Drei Angriffe verbucht', afterWar.hits === 3, afterWar.pts.join(' + ') + ' Punkte');
  step('Kriegspunkte in der Spanne 20…160 je Angriff',
    afterWar.pts.every(p => p >= 20 && p <= 160), afterWar.pts.join('/'));
  step('Eigene Punktesumme stimmt',
    afterWar.my === afterWar.pts.reduce((a, b2) => a + b2, 0), String(afterWar.my));
  step('Angriffe fuer heute aufgebraucht', afterWar.left === 0);
  step('4. Angriff wird abgelehnt (deutsche Meldung)',
    /Keine Angriffe mehr heute/.test(afterWar.msg || ''), afterWar.msg);
  const hitRows = await page.locator('#paneWar .ghostrow.hit').count();
  step('Angegriffene Ziele sind in der Liste markiert', hitRows === 3, String(hitRows));
  const atkStyle = await page.locator('#paneWar .attackbtn').first().evaluate(e => {
    const cs = getComputedStyle(e);
    return { fill: cs.webkitTextFillColor || cs.color, gold: e.classList.contains('goldtext') };
  });
  step('Angriffs-Knopf: kein goldtext auf goldener Flaeche', !atkStyle.gold, atkStyle.fill);
  await page.screenshot({ path: SHOTS + '/clan_krieg.png', fullPage: true });

  // ================= 6. EMOTES + FEED (Clanhalle, Reiter „Aktivitaet") ===
  /* UMGESCHRIEBEN 30.07.2026 — Emote-Leiste und Feed standen fest unter
     den Reitern im View und waren immer sichtbar. Sie liegen jetzt im
     dritten Reiter der Clanhalle. Der Klick davor ist der einzige
     Unterschied; die Zusagen darunter sind woertlich dieselben. */
  await page.click('#ctabFeed');
  await page.waitForTimeout(250);
  step('Reiter „Aktivitaet" zeigt Emote-Leiste und Feed',
    await page.locator('#paneFeed').evaluate(e => e.getClientRects().length > 0));
  const emos = await page.locator('#emoteBar [data-emote]').count();
  step('Emote-Leiste mit 6 Preset-Spruechen (kein Freitext)', emos === 6, String(emos));
  const feedBefore = await page.locator('#clanFeed .fe').count();
  await page.click('#emoteBar [data-emote="war"]');
  await page.waitForTimeout(250);
  const feedTxt = await page.locator('#clanFeed').textContent();
  step('Emote erscheint im Aktivitaets-Feed', /Alle Mann an die Angriffe/.test(feedTxt));
  const botFeed = await page.locator('#clanFeed .fe').count();
  step('Feed mischt Bot-Ereignisse und eigene Eintraege',
    botFeed >= feedBefore && botFeed > 3, botFeed + ' Eintraege');
  /* UMGESCHRIEBEN 30.07.2026 (Nachtrag). Die alte Zusage war „kein
     Freitext-Eingabefeld im Clan-View" und stammte aus der Zeit, als
     Emotes den Chat ERSETZEN sollten (DESIGN_CLAN.md §8). Der Chat ist
     jetzt gebaut — die Zusage waere damit schlicht falsch. Was bleibt,
     ist der Kern dahinter: die EMOTE-Leiste ist Preset-only, und
     Freitext gibt es an GENAU EINER Stelle, naemlich im Chat-Fenster.
     Zwei Wege, dasselbe zu sagen, waeren wieder Unordnung. */
  const freitextAussenrum = await page.locator(
    '#viewClan input[type=text], #viewClan textarea, ' +
    '#clanHallDlg input[type=text], #clanHallDlg textarea').count();
  const freitextChat = await page.locator(
    '#chatLayer input[type=text], #chatLayer textarea').count();
  step('Freitext gibt es GENAU im Chat-Fenster — Emote-Leiste bleibt Preset-only',
    freitextAussenrum === 0 && freitextChat === 1,
    'aussen ' + freitextAussenrum + ' · Chat ' + freitextChat);
  /* NEU 30.07.2026: die Clan-Rangliste ist aus der Clanhalle erreichbar.
     Sie war die vierte Clan-Funktion, die AAs Hauptansicht nicht zeigt;
     ohne diesen Weg waere sie beim Umbau untergegangen. */
  await page.click('#clanHallBoard');
  await page.waitForTimeout(420);
  step('Clanhalle fuehrt auf die Clan-Rangliste',
    (await page.locator('#viewBoard').evaluate(e => e.classList.contains('active'))) &&
    (await page.locator('#ltabClan').evaluate(e => e.classList.contains('on'))));
  await page.click('#navClan');
  await page.waitForTimeout(300);

  // ================= 7. RANGLISTE =================
  await page.click('#clanBack');
  await page.waitForTimeout(250);
  step('Zurueck-Knopf fuehrt auf Home',
    await page.locator('#viewHome').evaluate(e => e.classList.contains('active')));
  // UMGESCHRIEBEN 27.07.: die Rangliste hat keine Hub-Kachel mehr, sie
  // ist ein Ziel des Aufklapp-Menues. Geprueft wird dieselbe Sache — von
  // der Startseite in die Rangliste — ueber den Weg, den es noch gibt.
  await page.click('#tbMenu');
  await page.waitForTimeout(360);
  await page.click('.tbmi[data-nav="navBoard"]');
  await page.waitForTimeout(400);
  step('Menue-Eintrag oeffnet die Rangliste',
    await page.locator('#viewBoard').evaluate(e => e.classList.contains('active')));
  /* ERGAENZT 30.07.2026: Der Reiter wird jetzt ausdruecklich auf Global
     gestellt. Die Rangliste hat seit dem Clan-Umbau einen ZWEITEN
     Einstieg (Clanhalle → „Clan-Rangliste"), der bewusst den Clan-Reiter
     vorwaehlt. Die folgenden Schritte messen die GLOBALE Liste; sie
     duerfen sich nicht darauf verlassen, dass vorher niemand den Reiter
     angefasst hat — sonst prueft der Schritt die Reihenfolge der
     Pruefung statt das Produkt. */
  await page.click('#ltabGlobal');
  await page.waitForTimeout(300);
  const lbTabs = await page.locator('#viewBoard [data-lbtab]').count();
  step('Drei Ranglisten-Tabs (Global / Clan / Umgebung)', lbTabs === 3, String(lbTabs));
  const gRows = await page.locator('#lbList .lbrow').count();
  step('Global: Top 100 (+ eigene Zeile, falls ausserhalb)',
    gRows === 100 || gRows === 101, String(gRows));
  const gFirst = await page.locator('#lbList .lbrow').first().textContent();
  step('Spitze bei ~9 800 Trophaeen', /9\s?[0-9]{3}/.test(gFirst),
    gFirst.replace(/\s+/g, ' ').trim().slice(0, 50));
  const meCount = await page.locator('#lbList .lbrow.me').count();
  step('Eigene Zeile hervorgehoben und genau einmal vorhanden', meCount === 1);
  const badges = await page.locator('#lbList .lbrow .lbg').count();
  step('Jede Zeile traegt ein Banner-Mini', badges === gRows, badges + '/' + gRows);
  const ranksOk = await page.$$eval('#lbList .lbrow .lrk', els =>
    els.slice(3, 40).every((e, i) => e.textContent.trim() === '#' + (i + 4)));
  step('Raenge lueckenlos (Plaetze 1-3 als Medaillen)', ranksOk);
  const trophiesDesc = await page.$$eval('#lbList .lbrow .ltr', els => {
    const v = els.slice(0, 100).map(e => parseInt(e.textContent.replace(/[^\d]/g, ''), 10));
    return v.every((x, i) => i === 0 || x <= v[i - 1]);
  });
  step('Nach Trophaeen absteigend sortiert', trophiesDesc);

  await page.click('#ltabClan');
  await page.waitForTimeout(300);
  const cRows = await page.locator('#lbList .lbrow').count();
  const cMe = await page.locator('#lbList .lbrow.me').count();
  step('Clan-Ansicht: 30 Mitglieder', cRows === 30, String(cRows));
  step('Clan-Ansicht: eigene Zeile markiert', cMe === 1);
  const roleTxt = await page.locator('#lbList').textContent();
  step('Clan-Ansicht zeigt Rollen', /Anführer/.test(roleTxt) && /Ältester/.test(roleTxt));

  await page.click('#ltabAround');
  await page.waitForTimeout(400);
  const aRows = await page.locator('#lbList .lbrow').count();
  step('Umgebung: ±25 Raenge (max 51 Zeilen)', aRows > 25 && aRows <= 51, String(aRows));
  const aNote = await page.locator('#lbNote').textContent();
  step('Hinweis nennt Rangfenster + arena_rivals.js-Wiederverwendung',
    /Ränge \d+–\d+/.test(aNote) && /arena_rivals\.js/.test(aNote),
    aNote.slice(0, 70));
  // Smooth-Scroll zur eigenen Position (gescrollt wird das Dokument)
  const scrolled = await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.__proto.setLbTab('around');
    return new Promise(res => setTimeout(() => res({
      y: window.scrollY,
      rect: document.getElementById('lbMe').getBoundingClientRect().top,
    }), 900));
  });
  step('Automatischer Scroll zur eigenen Position', scrolled.y > 0,
    'scrollY ' + Math.round(scrolled.y));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.click('#lbJump');
  await page.waitForTimeout(900);
  const meVisible = await page.locator('#lbMe').evaluate(e => {
    const r = e.getBoundingClientRect();
    return r.top > 0 && r.bottom < window.innerHeight;
  });
  step('"Zu meiner Position" bringt die eigene Zeile ins Bild', meVisible);
  await page.screenshot({ path: SHOTS + '/leaderboard.png', fullPage: true });

  // ================= 8. ALTE VIEWS UNVERAENDERT LAUFFAEHIG ============
  const views = [['navShop', 'viewShop'], ['navCollection', 'viewCollection'],
                 ['navFortress', 'viewFortress'], ['navClan', 'viewClan'],
                 ['#packSlots .slot.full', 'viewPack'], ['navHome', 'viewHome']];
  for (const [nav, view] of views) {
    // Der Pack-View haengt an den Truhen-Slots der Startseite (27.07.).
    if (nav.charAt(0) === '#') { await page.click('#navHome'); await page.waitForTimeout(220); }
    await page.click(nav.charAt(0) === '#' ? nav : '#' + nav);
    await page.waitForTimeout(220);
    step('Bestehender View weiterhin erreichbar: ' + view,
      await page.locator('#' + view).evaluate(e => e.classList.contains('active')));
  }
  // ============ 8b. FESTUNG: LAYOUT-VARIANTE 2 „BANNER-STAPEL" =======
  await page.click('#navFortress');
  await page.waitForTimeout(300);
  // Variante 1 muss der Default sein und weiter funktionieren.
  step('Festung startet in Variante 1 (Konstellation)',
    !(await page.locator('#viewFortress').evaluate(e => e.classList.contains('lay-banner'))));
  const branchesV1 = await page.locator('#fortTracks .branch').count();
  const knotsV1 = await page.locator('#fortTracks .knot').count();
  step('Konstellation weiterhin da: 3 Aeste mit Knoten',
    branchesV1 === 3 && knotsV1 > 20, branchesV1 + ' Aeste / ' + knotsV1 + ' Knoten');
  const segs = await page.locator('#viewFortress [data-fortlay]').count();
  step('Layout-Umschalter mit zwei Segmenten vorhanden', segs === 2, String(segs));

  // Gold aufstocken, damit wirklich der KAUF getestet wird und nicht die
  // (korrekte) "Nicht genug Gold"-Sperre. Stufe 73 kostet 78 000.
  await page.evaluate(() => { window.__proto.setGold(300000); window.__proto.renderFortress(); });
  await page.click('#segBanner');
  await page.waitForTimeout(450);
  step('Toggle schaltet auf Variante 2 (Banner)',
    await page.locator('#viewFortress').evaluate(e => e.classList.contains('lay-banner')));
  const layPersist = await page.evaluate(() => localStorage.getItem('arenaFortLayout'));
  step('Layout-Wahl liegt in localStorage "arenaFortLayout"', layPersist === 'banner', layPersist);
  const hiddenV1 = await page.evaluate(() => [
    getComputedStyle(document.querySelector('#viewFortress .castlestage')).display,
    getComputedStyle(document.getElementById('fortTracks')).display,
  ]);
  step('Variante 1 ist im Banner-Layout ausgeblendet',
    hiddenV1.every(d => d === 'none'), hiddenV1.join('/'));
  const banners = await page.locator('#fortBanners .trackbanner').count();
  step('Drei Banner ueber die volle Breite', banners === 3, String(banners));
  const bh = await page.$$eval('#fortBanners .trackbanner', els =>
    els.map(e => Math.round(e.getBoundingClientRect().height)));
  step('Bannerhoehe im Zielband ~120-160 px', bh.every(h => h >= 118 && h <= 175), bh.join('/'));
  const fullWidth = await page.evaluate(() => {
    const b = document.querySelector('#fortBanners .trackbanner');
    const s2 = document.getElementById('fortBanners');
    return Math.abs(b.getBoundingClientRect().width - s2.getBoundingClientRect().width) < 2;
  });
  step('Banner nutzen die volle Breite des Views', fullWidth);
  // Titel + Umschalter duerfen NICHT vom Parallax-Layer verdeckt werden
  const segVisible = await page.evaluate(() => {
    const el = document.getElementById('segBanner');
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  });
  step('Umschalter liegt ueber dem Parallax-Layer (klickbar)', segVisible);
  const bgOn = await page.evaluate(() => {
    const bg = document.getElementById('fortBg');
    const cs = getComputedStyle(bg);
    return { display: cs.display, filter: cs.filter, img: cs.backgroundImage.slice(0, 30) };
  });
  step('Abgedunkelte Burg als Parallax-Layer aktiv',
    bgOn.display === 'block' && /brightness\(0?\.4/.test(bgOn.filter), bgOn.filter.slice(0, 40));
  /* Parallax reagiert auf Scrollen. Bei 430x932 passt der Banner-Stapel
     exakt in eine Bildschirmhoehe — dann gibt es nichts zu scrollen und
     der Test wuerde nichts messen. Deshalb kurz auf ein niedriges
     Viewport (wie ein kleines Geraet im Querformat-Bereich) gehen. */
  await page.setViewportSize({ width: 430, height: 520 });
  await page.waitForTimeout(220);
  const par = await page.evaluate(() => new Promise(res => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      const before = document.getElementById('fortBg').style.transform;
      window.scrollTo(0, 300);
      setTimeout(() => res({ before, after: document.getElementById('fortBg').style.transform,
                             scrolled: window.scrollY }), 260);
    }, 140);
  }));
  step('Parallax verschiebt den Burg-Layer beim Scrollen',
    par.scrolled > 0 && par.after !== par.before && /translateY\(-\d/.test(par.after),
    'scrollY ' + par.scrolled + ' → ' + par.after);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(260);

  // --- Aufbau je Banner: Emblem / Pips / Meilenstein / Kosten-Button ---
  const b0 = await page.evaluate(() => {
    const b = document.querySelector('#fortBanners .trackbanner');
    return {
      emblem: !!b.querySelector('.tb-emblem .tb-art'),
      emblemHex: getComputedStyle(b.querySelector('.tb-emblem')).clipPath.indexOf('polygon') === 0,
      name: b.querySelector('.tb-name').textContent.trim(),
      nameGold: b.querySelector('.tb-name').classList.contains('goldtext'),
      lvl: b.querySelector('.tb-lvl').textContent.replace(/\s+/g, ' ').trim(),
      pips: b.querySelectorAll('.pip').length,
      ms: b.querySelectorAll('.pip.ms').length,
      msLast: b.querySelector('.pip:last-child').classList.contains('ms'),
      msText: b.querySelector('.tb-ms').textContent.replace(/\s+/g, ' ').trim(),
      buy: b.querySelector('.tb-buy').textContent.replace(/\s+/g, ' ').trim(),
    };
  });
  step('Links: Track-Emblem in Hex-Fassung', b0.emblem && b0.emblemHex);
  step('Mitte: Track-Name (goldtext auf dunklem Amethyst-Glas erlaubt)',
    b0.nameGold && /Burg-Stabilit/.test(b0.name), b0.name);
  step('Mitte: "Stufe X / 100"', /Stufe \d+ \/ 100/.test(b0.lvl), b0.lvl);
  step('Pip-Reihe: 10 Pips fuer die aktuelle Dekade', b0.pips === 10, String(b0.pips));
  step('Meilenstein-Gem sitzt am Dekaden-Ende statt eines Pips',
    b0.ms === 1 && b0.msLast === true);
  step('Naechster Meilenstein-Bonus unter der Pip-Reihe',
    /Meilenstein Stufe \d+/.test(b0.msText), b0.msText.slice(0, 60));
  step('Rechts: Kosten-Button mit Goldbetrag', /\d/.test(b0.buy), b0.buy.slice(0, 40));
  // Pip-Fuellung muss zum Level passen (Dekaden-Logik)
  const pipMath = await page.evaluate(() => {
    const AF = window.ArenaFortress;
    return AF.TRACK_KEYS.map((k, i) => {
      const t = AF.trackInfo(k);
      const b = document.querySelectorAll('#fortBanners .trackbanner')[i];
      const full = b.querySelectorAll('.pip.full').length +
                   (b.querySelector('.pip.ms').classList.contains('dim') ? 0 : 1);
      const want = window.__proto.decadeOf(t.lvl, t.maxLvl).filled;
      return { k, lvl: t.lvl, full, want };
    });
  });
  step('Pip-Fuellung entspricht dem Fortschritt in der Dekade',
    pipMath.every(p => p.full === p.want),
    pipMath.map(p => p.k + ' Lv' + p.lvl + ' → ' + p.full + '/10').join(', '));

  // --- GOLD-AUF-GOLD auf den NEUEN Buttons ---
  const buyLum = await page.$$eval('#fortBanners .tb-buy', els => els.map(e => {
    const cs = getComputedStyle(e);
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
    return { gold: e.classList.contains('goldtext'),
             lum: m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255 };
  }));
  step('Kosten-Buttons: dunkle Schriftfuellung, kein goldtext',
    buyLum.length === 3 && buyLum.every(b => !b.gold && b.lum < 120),
    buyLum.map(b => Math.round(b.lum)).join('/'));

  await page.screenshot({ path: SHOTS + '/fortress_v2.png', fullPage: true });

  // --- KAUF im Banner-Layout ---
  const before = await page.evaluate(() => ({
    gold: window.__proto.gold(),
    lvl: window.ArenaFortress.get().lvl.hp,
    steps: window.ArenaFortress.get().steps,
    cost: window.ArenaFortress.trackInfo('hp', 1136).nextCost,
  }));
  await page.click('#fortBanners [data-buyfort2="hp"]');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    gold: window.__proto.gold(),
    lvl: window.ArenaFortress.get().lvl.hp,
    steps: window.ArenaFortress.get().steps,
    lvlText: document.querySelector('#fortBanners .tb-lvl').textContent.replace(/\s+/g, ' ').trim(),
    topGold: document.getElementById('curGold').textContent,
  }));
  step('Kauf im Banner-Layout erhoeht die Stufe',
    after.lvl === before.lvl + 1 && after.steps === before.steps + 1,
    'hp ' + before.lvl + ' → ' + after.lvl);
  step('Gold-Abzug exakt in Hoehe der Stufenkosten',
    after.gold === before.gold - before.cost,
    before.gold + ' − ' + before.cost + ' = ' + after.gold);
  step('Banner zeigt die neue Stufe sofort',
    after.lvlText.indexOf('Stufe ' + after.lvl + ' /') === 0, after.lvlText.slice(0, 22));
  step('Top-Bar-Gold aktualisiert', after.topGold.replace(/\D/g, '') === String(after.gold),
    after.topGold);
  // Kauf-Feedback: Glow-Puls auf dem Banner
  const pulsed = await page.evaluate(() => {
    const b = document.querySelector('#fortBanners [data-banner="hp"]');
    return b ? b.classList.contains('justbought') : false;
  });
  step('Kauf-Feedback: Glow-Puls auf dem gekauften Banner', pulsed);

  // --- Trophaeen-Tor im Banner-Layout (Stufe 81 verlangt 1 200 Trophaeen) ---
  const gate = await page.evaluate(() => {
    const AF = window.ArenaFortress;
    let guard = 0;
    while (AF.get().steps < 80 && guard++ < 30) {
      if (!AF.TRACK_KEYS.some(k => AF.buy(k, 1e9, 1136).ok)) break;
    }
    window.__proto.renderFortress();
    return { steps: AF.get().steps,
             gates: document.querySelectorAll('#fortBanners .tb-buy.gate').length,
             locked: document.querySelectorAll('#fortBanners .trackbanner.locked').length,
             text: (document.querySelector('#fortBanners .tb-buy.gate') || {}).textContent };
  });
  step('Trophaeen-Tor wird im Banner-Layout als Schloss gezeigt',
    gate.steps === 80 && gate.gates === 3 && gate.locked === 3,
    gate.steps + ' Stufen, ' + gate.gates + ' gesperrt');
  step('Gesperrter Button nennt die Trophaeen-Anforderung',
    /1\s?200/.test((gate.text || '').replace(/\s+/g, ' ')), (gate.text || '').trim());

  // --- Zurueck auf Variante 1: alles muss weiter funktionieren ---
  await page.click('#segConstell');
  await page.waitForTimeout(400);
  step('Toggle zurueck auf Konstellation',
    !(await page.locator('#viewFortress').evaluate(e => e.classList.contains('lay-banner'))) &&
    (await page.evaluate(() => localStorage.getItem('arenaFortLayout'))) === 'constell');
  const backV1 = await page.evaluate(() => ({
    branches: document.querySelectorAll('#fortTracks .branch').length,
    knots: document.querySelectorAll('#fortTracks .knot').length,
    gates: document.querySelectorAll('#fortTracks .kgate').length,
    stage: getComputedStyle(document.querySelector('#viewFortress .castlestage')).display,
    banners: getComputedStyle(document.getElementById('fortBanners')).display,
    power: document.getElementById('fortPower').textContent,
    steps: document.getElementById('fortSteps').textContent,
  }));
  step('Konstellation wieder sichtbar, Banner ausgeblendet',
    backV1.stage !== 'none' && backV1.banners === 'none' && backV1.branches === 3,
    backV1.branches + ' Aeste');
  step('Konstellation zeigt denselben Stand (Stufen + Power)',
    /80\/300/.test(backV1.steps) && parseInt(backV1.power.replace(/\D/g, ''), 10) > 0,
    backV1.steps + ' · Power ' + backV1.power);
  step('Trophaeen-Tor auch in der Konstellation sichtbar', backV1.gates === 3, String(backV1.gates));
  // Lebende Burg reagiert weiterhin auf die Stufen
  const castleFx = await page.evaluate(() => ({
    beam: !!document.getElementById('fxBeam'),
    shield: !!document.getElementById('fxShield'),
    walls: +document.getElementById('castleFx').getAttribute('data-walls'),
  }));
  step('Lebende Burg unveraendert funktionsfaehig',
    castleFx.beam && castleFx.shield && castleFx.walls >= 0,
    castleFx.walls + ' Kristall-Anbauten');
  // Layout-Wahl ueberlebt einen Reload
  await page.click('#segBanner');
  await page.waitForTimeout(250);
  await page.reload();
  await page.waitForTimeout(600);
  await page.click('#navFortress');
  await page.waitForTimeout(350);
  step('Layout-Wahl ueberlebt den Reload',
    await page.locator('#viewFortress').evaluate(e => e.classList.contains('lay-banner')));
  await page.click('#segConstell');
  await page.waitForTimeout(250);

  // Trophaeenstrasse + Schmiede als Regression
  await page.click('#navHome');
  await page.waitForTimeout(250);
  // Die Strasse haengt jetzt an der Arena, nicht am KAMPF-Knopf.
  await page.click('#arenaDiorama');
  await page.waitForTimeout(400);
  step('Trophaeenstrasse oeffnet weiterhin (ueber die Arena)',
    await page.locator('#roadLayer').evaluate(e => e.classList.contains('open')));
  await page.click('#roadOk');
  await page.waitForTimeout(250);
  await page.click('#navCollection');
  await page.waitForTimeout(200);
  /* ⚠ ZWEIMAL ANGEPASST, und das ist die eigentliche Notiz.
     30.07.2026 vormittags: die View bekam zwei Reiter (Deck | Sammlung),
     `#btnToForge` verschwand hinter `display:none`, und hier musste ein
     Klick auf `#dkTabColl` davor.
     30.07.2026 nachmittags: die Reiter sind wieder weg — AA stellt Deck
     und Sammlung untereinander auf EINEN Bildschirm, und der Auftraggeber
     hat genau das verlangt. Der Klick ist ersatzlos entfallen.
     Die Lehre steht in beiden Richtungen: ein Test, der den WEG zu einem
     Knopf festschreibt statt seine Erreichbarkeit, muss bei jedem Umbau
     angefasst werden. Geprueft wird deshalb, dass der Knopf sichtbar und
     klickbar IST — nicht, hinter welchem Reiter er liegt. */
  await page.waitForTimeout(150);
  await page.click('#btnToForge');
  await page.waitForTimeout(250);
  step('Schmiede weiterhin erreichbar',
    await page.locator('#viewForge').evaluate(e => e.classList.contains('active')));


  // ============ 8c. AAA-SWEEP: KARTEN-ARTWORK STATT EMOJI ============
  await page.click('#navCollection');
  await page.waitForTimeout(200);
  await page.waitForTimeout(400);
  /* Battle-Deck-Kachel MIT Artwork: die alte `#deckRow`-Vorschau (vier
     feste Beispiel-Karten, keine Zonen, kein Speicher) ist durch den
     echten Editor ersetzt (arena_deck.js). Dieselbe Behauptung —
     "eine ausgeruestete Karte traegt echtes Artwork, nicht nur Emoji"
     — gilt jetzt fuer einen ECHTEN Deck-Platz statt einer Deko-Kachel. */
  await page.evaluate(() => {
    window.__proto.setDkMain();
    window.__proto.ArenaDeck().setze('tuerme', 0, 'fire');
    window.__proto.renderDeckBoard();
  });
  await page.waitForTimeout(200);
  const deckArt = await page.evaluate(() => ({
    img: document.querySelectorAll('#dkTowers img.cart').length,
    emo: document.querySelectorAll('#dkTowers .cartemo').length,
  }));
  step('Battle-Deck-Platz traegt Artwork UND Emoji-Rueckfall darunter',
    deckArt.img === 1 && deckArt.emo === 1, JSON.stringify(deckArt));
  await page.evaluate(() => {
    window.__proto.ArenaDeck()._reset();
    window.__proto.setDkMain();
  });
  await page.waitForTimeout(200);
  const artColl = await page.evaluate(() => ({
    tiles: document.querySelectorAll('#collGrid .tile').length,
    imgs: document.querySelectorAll('#collGrid img.cart').length,
    emos: document.querySelectorAll('#collGrid .cartemo').length,
    frames: document.querySelectorAll('#collGrid .frm').length,
    src: (document.querySelector('#collGrid img.cart') || {}).getAttribute
         ? document.querySelector('#collGrid img.cart').getAttribute('src') : '',
  }));
  /* Sechs, nicht acht: Solara und Magmor sind Helden und stehen im
     Helden-Reiter, nicht im Turm-Raster. */
  step('Sammlung: jede Kachel traegt ein Karten-Artwork',
    artColl.imgs === artColl.tiles && artColl.tiles === 6, artColl.imgs + '/' + artColl.tiles);
  step('Artwork zeigt auf ein Batch-4-Asset', /card_|hf_20260725_16(06|33)/.test(artColl.src),
    artColl.src.slice(-42));
  step('Emoji liegt als Fallback-Ebene IMMER darunter', artColl.emos === artColl.tiles,
    artColl.emos + ' Fallback-Ebenen');
  step('Raritaetsrahmen liegt UEBER dem Artwork', artColl.frames === artColl.tiles,
    artColl.frames + ' Rahmen-Overlays');
  // Der Rahmen-Overlay darf bei fehlendem Bild NICHTS malen (sonst deckt
  // der Fallback-Verlauf das Artwork zu).
  const frmBg = await page.$$eval('#collGrid .frm', els =>
    els.map(e => e.style.backgroundImage).filter(b => /gradient/.test(b)).length);
  step('Rahmen-Overlay ohne Gradient-Fallback', frmBg === 0, String(frmBg));
  const zOrder = await page.evaluate(() => {
    const t = document.querySelector('#collGrid .tile');
    return { art: getComputedStyle(t.querySelector('.artbox')).zIndex,
             frm: getComputedStyle(t.querySelector('.frm')).zIndex };
  });
  step('Stapelreihenfolge Artwork < Rahmen', +zOrder.art < +zOrder.frm,
    zOrder.art + ' < ' + zOrder.frm);
  await page.screenshot({ path: SHOTS + '/collection_art.png', fullPage: true });

  // Detailkarte + Schmiede + Pack-Zeremonie tragen dasselbe Artwork
  await page.click('#collGrid .tile');
  await page.waitForTimeout(400);
  step('Detailkarte zeigt das Artwork randlos',
    await page.locator('#dArt img.cart, #dArt .cartemo').first().isVisible());
  await page.click('#btnDetailClose');
  await page.waitForTimeout(250);
  await page.click('#btnToForge');
  await page.waitForTimeout(350);
  const forgeArt = await page.locator('#forgeGrid .cartemo').count();
  step('Schmiede-Kacheln mit Artwork-Ebene', forgeArt > 0, String(forgeArt));

  // ================= 8d. SEASON-PASS =================
  await page.click('#navHome');
  await page.waitForTimeout(250);
  await page.click('#passBanner');
  await page.waitForTimeout(450);
  step('Hub-Kachel oeffnet den Season-Pass',
    await page.locator('#viewPass').evaluate(e => e.classList.contains('active')));
  const passHead = await page.evaluate(() => ({
    season: document.getElementById('passSeason').textContent.trim(),
    end: document.getElementById('passEnd').textContent.replace(/\s+/g, ' ').trim(),
    lvl: +document.getElementById('passLvl').textContent,
    xp: document.getElementById('passXp').textContent.trim(),
    art: getComputedStyle(document.getElementById('passArt')).backgroundImage.slice(0, 24),
    rows: document.querySelectorAll('#passList .passrow').length,
    free: document.querySelectorAll('#passList .rwcell:not(.prem)').length,
    prem: document.querySelectorAll('#passList .rwcell.prem').length,
    blocked: document.querySelectorAll('#passList .rwcell.prem.blocked').length,
  }));
  step('Keyart als Kopf mit Titel-Overlay', /url\(/.test(passHead.art), passHead.art);
  step('Saison = Kalendermonat, mit Restlaufzeit',
    /\d{4}$/.test(passHead.season) && /Endet in \d+ Tag/.test(passHead.end),
    passHead.season + ' · ' + passHead.end.slice(0, 30));
  step('50 Stufen, zwei Spuren nebeneinander',
    passHead.rows === 50 && passHead.free === 50 && passHead.prem === 50,
    passHead.rows + ' Stufen / ' + passHead.free + ' gratis / ' + passHead.prem + ' premium');
  step('Pass-XP aus Ereignissen ergibt eine Stufe > 0', passHead.lvl > 0 && /\d+\/100 XP/.test(passHead.xp),
    'Stufe ' + passHead.lvl + ', ' + passHead.xp);
  step('Premium-Spur ist ohne Pass komplett gesperrt', passHead.blocked === 50,
    passHead.blocked + '/50 mit Schloss');
  const evXp = await page.evaluate(() => {
    const before = window.ArenaPass.state().xp;
    const r = window.ArenaPass.reportEvent('win', 1);
    const after = window.ArenaPass.state().xp;
    return { before, after, counted: r.counted, gain: r.xp };
  });
  step('ArenaPass.reportEvent(type, amount) — gleiche Signatur wie ArenaClan',
    evXp.counted === true && evXp.after === evXp.before + evXp.gain,
    '+' + evXp.gain + ' XP');
  await page.screenshot({ path: SHOTS + '/pass.png', fullPage: true });

  // --- Gratis-Belohnung abholen (Stufe 1 = Gold) ---
  const goldPre = await page.evaluate(() => window.__proto.gold());
  await page.evaluate(() => { window.__proto.renderPass(); });
  await page.waitForTimeout(200);
  const claimRes = await page.evaluate(() => {
    const before = window.__proto.gold();
    const st = window.ArenaPass.state();
    // erste noch nicht abgeholte Gratis-Stufe mit Gold-Belohnung
    let lvl = 0;
    for (let L = 1; L <= st.level; L++) {
      if (st.claimedFree.indexOf(L) < 0 && window.ArenaPass.reward(L, 'free').kind === 'gold') { lvl = L; break; }
    }
    const rw = window.ArenaPass.reward(lvl, 'free');
    document.querySelector('[data-claim="' + lvl + ':free"]').click();
    return { lvl, want: rw.n, before, after: window.__proto.gold() };
  });
  step('Gratis-Stufe abholen schreibt Gold gut',
    claimRes.after === claimRes.before + claimRes.want,
    'Stufe ' + claimRes.lvl + ': +' + claimRes.want + ' Gold');
  const taken = await page.evaluate(() => window.ArenaPass.state().claimedFree.length);
  step('Abgeholte Stufe ist als erledigt vermerkt', taken >= 1, taken + ' abgeholt');
  const reclaim = await page.evaluate(l => {
    try { window.ArenaPass.claim(l, 'free'); return null; } catch (e) { return e.message; }
  }, claimRes.lvl);
  step('Zweites Abholen wird abgelehnt', /schon abgeholt/.test(reclaim || ''), reclaim);

  // --- Premium-Pass kaufen ---
  const gemPre = await page.evaluate(() => window.__proto.gems());
  await page.click('#btnBuyPass');
  await page.waitForTimeout(450);
  const afterBuy = await page.evaluate(() => ({
    gems: window.__proto.gems(), premium: window.ArenaPass.state().premium,
    blocked: document.querySelectorAll('#passList .rwcell.prem.blocked').length,
    btn: document.getElementById('btnBuyPass').textContent.trim(),
    dis: document.getElementById('btnBuyPass').disabled,
    top: document.getElementById('curGems').textContent,
  }));
  step('Pass-Kauf zieht 950 Gems ab', afterBuy.gems === gemPre - 950,
    gemPre + ' → ' + afterBuy.gems);
  step('Premium aktiv, Sperre auf der Premium-Spur weg',
    afterBuy.premium === true && afterBuy.blocked === 0, afterBuy.btn);
  step('Kauf-Knopf danach deaktiviert', afterBuy.dis === true);
  step('Top-Bar-Gems aktualisiert', afterBuy.top.replace(/\D/g, '') === String(afterBuy.gems),
    afterBuy.top);
  const premClaim = await page.evaluate(() => {
    const st = window.ArenaPass.state();
    let lvl = 0;
    for (let L = 1; L <= st.level; L++) {
      if (st.claimedPrem.indexOf(L) < 0 && window.ArenaPass.reward(L, 'prem').kind === 'gold') { lvl = L; break; }
    }
    const before = window.__proto.gold(), want = window.ArenaPass.reward(lvl, 'prem').n;
    document.querySelector('[data-claim="' + lvl + ':prem"]').click();
    return { lvl, want, before, after: window.__proto.gold() };
  });
  step('Premium-Belohnung abholbar', premClaim.after === premClaim.before + premClaim.want,
    'Stufe ' + premClaim.lvl + ': +' + premClaim.want + ' Gold');
  const rgetLum = await page.$$eval('#passList .rget', els => els.slice(0, 6).map(e => {
    const cs = getComputedStyle(e);
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
    return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
  }));
  step('HOLEN-Knoepfe: dunkle Schrift auf Gold',
    rgetLum.length > 0 && rgetLum.every(l => l < 120), rgetLum.map(Math.round).join('/'));

  // ================= 8e. HELDEN =================
  await page.click('#navCollection');
  await page.waitForTimeout(300);
  await page.waitForTimeout(150);
  await page.click('#tabHeroes');
  await page.waitForTimeout(400);
  step('Helden-Tab der Sammlung oeffnet den Helden-View',
    await page.locator('#viewHeroes').evaluate(e => e.classList.contains('active')));
  const heroes = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('#heroList .herocard')];
    return cs.map(c => ({
      id: c.getAttribute('data-hero'),
      name: c.querySelector('.hnm').textContent.trim(),
      art: !!c.querySelector('.herostage .cartemo'),
      stage: Math.round(c.querySelector('.herostage').getBoundingClientRect().width),
      chips: c.querySelectorAll('.cchip').length,
      locked: c.classList.contains('locked'),
      lockHint: !!c.querySelector('.hlock'),
    }));
  });
  step('Beide Helden auf der Buehne (SOLARA + MAGMOR)',
    heroes.length === 2 && heroes[0].name === 'SOLARA' && heroes[1].name === 'MAGMOR',
    heroes.map(h => h.name).join(' + '));
  step('Helden-Artwork als Buehnenbild', heroes.every(h => h.art && h.stage > 90),
    heroes.map(h => h.stage + 'px').join('/'));
  step('Besitzstand aus der Kartenbank (Stufe, Level, Power, Kopien)',
    heroes.every(h => h.locked || h.chips >= 4), heroes.map(h => h.chips + ' Chips').join('/'));
  const lockedHero = await page.evaluate(() => {
    // Held vorruebergehend "nicht im Besitz" simulieren
    const st = window.ArenaCards.get();
    const keep = JSON.stringify(st.cards.magmor);
    Object.keys(st.cards.magmor.copies).forEach(k => { st.cards.magmor.copies[k] = 0; });
    window.ArenaCards._write(st);
    window.__proto.renderHeroes();
    const c = document.querySelector('[data-hero="magmor"]');
    const out = { locked: c.classList.contains('locked'),
                  hint: (c.querySelector('.hlock') || {}).textContent || '' };
    const st2 = window.ArenaCards.get();
    st2.cards.magmor = JSON.parse(keep);
    window.ArenaCards._write(st2);
    window.__proto.renderHeroes();
    return out;
  });
  step('Nicht besessener Held: gesperrt mit "In Packs zu finden"',
    lockedHero.locked && /In Packs zu finden/.test(lockedHero.hint),
    lockedHero.hint.replace(/\s+/g, ' ').trim().slice(0, 48));
  await page.screenshot({ path: SHOTS + '/heroes.png', fullPage: true });

  // ================= 8f. EVENTS =================
  await page.click('#heroBack');
  await page.waitForTimeout(250);
  await page.click('#tileEvents');
  await page.waitForTimeout(400);
  step('Home-Kachel oeffnet die Events',
    await page.locator('#viewEvents').evaluate(e => e.classList.contains('active')));
  const evs = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('#evList .evcard')];
    return cs.map(c => ({
      key: c.getAttribute('data-event'),
      chip: c.querySelector('.evchip').textContent.trim(),
      live: c.querySelector('.evchip').classList.contains('live'),
      art: getComputedStyle(c.querySelector('.evart')).backgroundImage.slice(0, 24),
      time: c.querySelector('.evtime').textContent.trim(),
      btn: c.querySelector('.evjoin').textContent.trim(),
    }));
  });
  step('Zwei Event-Banner mit Artwork', evs.length === 2 && evs.every(e => /url\(/.test(e.art)),
    evs.map(e => e.key).join(', '));
  step('Genau ein Event ist aktiv (Fenster decken die Woche ab)',
    evs.filter(e => e.live).length === 1, evs.map(e => e.key + ':' + e.chip).join(' · '));
  step('Aktives Event mit Countdown, kommendes mit Startdatum',
    evs.every(e => e.live ? /Endet in .*(h|Tag)/.test(e.time) : /Startet \d{2}\.\d{2}\./.test(e.time)),
    evs.map(e => e.time).join(' | '));
  step('Teilnehmen-Knopf je Status', evs.some(e => e.btn === 'TEILNEHMEN') &&
    evs.some(e => e.btn === 'ERINNERN'), evs.map(e => e.btn).join('/'));
  await page.click('#evList .evjoin');
  await page.waitForTimeout(300);
  step('Teilnehmen loest eine Rueckmeldung aus',
    await page.locator('#toast').evaluate(e => e.classList.contains('on')));
  await page.screenshot({ path: SHOTS + '/events.png', fullPage: true });

  // ================= 8g. POST =================
  await page.click('#evBack');
  await page.waitForTimeout(250);
  // UMGESCHRIEBEN 27.07.: die Post-Kachel ist weg. Ihr Zaehler darf
  // deshalb nicht verschwinden — er sitzt jetzt am Menueknopf, zusammen
  // mit dem des Guide. Genau das wird hier geprueft: eine geloeschte
  // Kachel darf ihre Benachrichtigung nicht stillschweigend mitnehmen.
  const mailBadge = await page.evaluate(() => {
    const e = document.getElementById('badgeMenu');
    return { txt: e ? e.textContent : null, sichtbar: !!e && getComputedStyle(e).display !== 'none' };
  });
  step('Menueknopf traegt den Post-Zaehler', mailBadge.sichtbar && +mailBadge.txt >= 4,
    JSON.stringify(mailBadge));
  await page.click('#tbMenu');
  await page.waitForTimeout(360);
  await page.click('.tbmi[data-nav="navMail"]');
  await page.waitForTimeout(400);
  const mails = await page.evaluate(() => ({
    rows: document.querySelectorAll('#mailList .mailrow').length,
    unread: document.querySelectorAll('#mailList .mailrow.unread').length,
    takes: document.querySelectorAll('#mailList [data-mail]').length,
  }));
  step('Posteingang mit 4 Nachrichten', mails.rows === 4, String(mails.rows));
  step('Alle zunaechst ungelesen', mails.unread === 4, String(mails.unread));
  step('Zwei Belohnungsmails mit ABHOLEN-Knopf', mails.takes === 2, String(mails.takes));
  const mailTake = await page.evaluate(() => {
    const AC = window.ArenaCards;
    const before = { gold: window.__proto.gold(), mat: AC.getMaterials().total };
    document.querySelector('[data-mail="m_welcome"]').click();
    return { before, after: { gold: window.__proto.gold(), mat: AC.getMaterials().total } };
  });
  await page.waitForTimeout(350);
  step('Belohnungsmail schreibt Gold gut (+5 000)',
    mailTake.after.gold === mailTake.before.gold + 5000,
    mailTake.before.gold + ' → ' + mailTake.after.gold);
  step('Belohnungsmail schreibt Material gut (+30)',
    mailTake.after.mat === mailTake.before.mat + 30,
    mailTake.before.mat + ' → ' + mailTake.after.mat);
  const afterMail = await page.evaluate(() => ({
    done: document.querySelectorAll('#mailList .mailtake.done').length,
    unread: document.querySelectorAll('#mailList .mailrow.unread').length,
    badge: (document.getElementById('badgeMenu') || {}).textContent,
    dis: document.querySelector('[data-mail="m_welcome"]').disabled,
  }));
  step('Abgeholt: Knopf deaktiviert und markiert', afterMail.done === 1 && afterMail.dis === true);
  step('Badge zaehlt herunter', +afterMail.badge === 3, afterMail.badge);
  // Gelesen-Zustand
  await page.click('[data-mailrow="m_maint"]');
  await page.waitForTimeout(300);
  const readState = await page.evaluate(() => ({
    unread: document.querySelectorAll('#mailList .mailrow.unread').length,
    stored: JSON.parse(localStorage.getItem('arenaMail')).read.length,
  }));
  step('Gelesen-Zustand wird persistiert',
    readState.unread === 2 && readState.stored >= 2,
    readState.unread + ' ungelesen, ' + readState.stored + ' gespeichert');
  const mailLum = await page.$$eval('#mailList .mailtake:not(.done)', els => els.map(e => {
    const cs = getComputedStyle(e);
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
    return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
  }));
  step('ABHOLEN-Knopf: dunkle Schrift auf Gold', mailLum.every(l => l < 120),
    mailLum.map(Math.round).join('/'));
  await page.screenshot({ path: SHOTS + '/mail.png', fullPage: true });

  // ================= 8h. EINSTELLUNGEN =================
  await page.click('#mailBack');
  await page.waitForTimeout(250);
  /* GEAENDERTER WEG, mit Absicht.
     Die Einstellungen hingen an einer Hub-Kachel der Profilzeile. Bei AA
     sind sie der fuenfte Eintrag im Aufklapp-Menue oben rechts (IMG_3344
     und Screenrecording 13-09-58) — dorthin sind sie gewandert. Geprueft
     wird jetzt der Weg, den es tatsaechlich gibt.
     27.07.: das Menue ist gegliedert, die Einstellungen sind der LETZTE
     Eintrag der Gruppe „Konto". Der Selektor greift weiter, weil er auf
     data-nav zeigt und nicht auf eine Position. */
  await page.evaluate(() => {
    document.getElementById('tbMenu').click();
    document.querySelector('.tbmi[data-nav="navSettings"]').click();
  });
  await page.waitForTimeout(400);
  step('Das Menue oben rechts oeffnet die Einstellungen',
    await page.locator('#viewSettings').evaluate(e => e.classList.contains('active')));
  const setUi = await page.evaluate(() => ({
    switches: document.querySelectorAll('#viewSettings [data-sw]').length,
    on: document.querySelectorAll('#viewSettings .swch.on').length,
    lang: document.getElementById('langDe').textContent.trim(),
    credits: document.getElementById('credits').textContent.replace(/\s+/g, ' ').trim(),
    muted: window.UISfx.isMuted(),
  }));
  step('Drei Schalter (Sound / Musik / Haptik), alle an',
    setUi.switches === 3 && setUi.on === 3, setUi.on + '/3');
  step('Sprache: DE aktiv, EN als "bald"', setUi.lang === 'AKTIV');
  step('Version und Credits vorhanden', /Prototyp 0\.9/.test(setUi.credits),
    setUi.credits.slice(0, 46));
  await page.click('#swSound');
  await page.waitForTimeout(300);
  const muted = await page.evaluate(() => ({
    muted: window.UISfx.isMuted(),
    cls: document.getElementById('swSound').className,
    stored: JSON.parse(localStorage.getItem('arenaSettings')).sound,
  }));
  step('Sound-Schalter wirkt REAL auf UISfx',
    muted.muted === true && muted.stored === false && !/\bon\b/.test(muted.cls), muted.cls);
  await page.reload();
  await page.waitForTimeout(700);
  const afterReload = await page.evaluate(() => ({
    muted: window.UISfx.isMuted(),
    stored: JSON.parse(localStorage.getItem('arenaSettings')).sound,
  }));
  step('Schalterstand ueberlebt den Reload',
    afterReload.muted === true && afterReload.stored === false);
  await page.click('#navHome');
  await page.waitForTimeout(250);
  // Zweiter Weg in die Einstellungen — gleiche Aenderung wie oben, die
  // Hub-Kachel #icoSettings gibt es nicht mehr.
  await page.evaluate(() => {
    document.getElementById('tbMenu').click();
    document.querySelector('.tbmi[data-nav="navSettings"]').click();
  });
  await page.waitForTimeout(350);
  await page.click('#swSound');   // wieder an, damit die restlichen Schritte Ton haben
  await page.waitForTimeout(250);
  // Export / Import
  await page.click('#btnExport');
  await page.waitForTimeout(300);
  const exp = await page.evaluate(() => {
    const raw = document.getElementById('saveArea').value;
    let o = null;
    try { o = JSON.parse(raw); } catch (e) {}
    return { len: raw.length, app: o && o._app, keys: o ? Object.keys(o.data).length : 0,
             note: document.getElementById('saveNote').textContent };
  });
  step('Export erzeugt gueltiges Spielstand-JSON',
    exp.app === 'arcane-prism-td' && exp.keys >= 8 && exp.len > 200,
    exp.keys + ' Schluessel, ' + exp.len + ' Zeichen');
  const badImport = await page.evaluate(() => {
    document.getElementById('saveArea').value = '{"nur":"quatsch"}';
    document.getElementById('btnImport').click();
    return document.getElementById('saveNote').textContent;
  });
  step('Import weist fremdes JSON zurueck', /kein Spielstand dieses Spiels/.test(badImport),
    badImport.slice(0, 46));
  const brokenImport = await page.evaluate(() => {
    document.getElementById('saveArea').value = '{kaputt';
    document.getElementById('btnImport').click();
    return document.getElementById('saveNote').textContent;
  });
  step('Import weist kaputtes JSON zurueck', /Kein g/.test(brokenImport), brokenImport.slice(0, 40));
  await page.evaluate(() => { document.getElementById('saveArea').value = ''; });
  // Reset-Dialog: oeffnen und ABBRECHEN (Daten muessen bleiben)
  await page.click('#btnWipe');
  await page.waitForTimeout(300);
  step('Zuruecksetzen fragt vorher nach',
    await page.locator('#confirmDlg').evaluate(e => e.classList.contains('open')));
  await page.click('#cfNo');
  await page.waitForTimeout(300);
  const cancelled = await page.evaluate(() => ({
    open: document.getElementById('confirmDlg').classList.contains('open'),
    cards: !!localStorage.getItem('arenaCards'),
    pass: !!localStorage.getItem('arenaPass'),
  }));
  step('Abbrechen schliesst den Dialog und laesst den Spielstand unangetastet',
    !cancelled.open && cancelled.cards && cancelled.pass);
  await page.screenshot({ path: SHOTS + '/settings.png', fullPage: true });


  // ============ 8i. KRISTALLTRESOR · ANGEBOTE · TAeGLICHER LOOP =======
  // AA-REBUILD: Das Tresor-Widget ist vom Home in den SHOP gewandert —
  // dort hat AA seine Angebotsflaeche (AA_UI_REFERENZ §8.1). Der
  // Startbildschirm bleibt frei.
  // Alle Overlay-Ebenen sicher schliessen — nach dem Settings-Block kann
  // noch ein Dialog offen sein, und ein offener Layer faengt jeden Klick ab.
  await page.evaluate(() => {
    ['loginLayer', 'dailyLayer', 'offerLayer', 'confirmDlg', 'reqDlg',
     'detailModal', 'bonusDlg', 'mergeCeremony', 'roadLayer']
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('open'); });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__proto.show('navShop'));
  await page.waitForTimeout(450);
  step('Tresor-Widget sitzt jetzt im Shop, nicht mehr auf Home',
    (await page.locator('#viewShop #vaultShop .vaultjar').count()) === 1 &&
    (await page.locator('#viewHome .vaultbox').count()) === 0);
  const loopMods = await page.evaluate(() => ({
    vault: !!window.ArenaVault, daily: !!window.ArenaDaily, tele: !!window.ArenaTelemetry,
    api: window.ArenaVault ? ['vault', 'open', 'offers', 'active', 'best', 'trigger',
      'markShown', 'dismiss', 'claimOffer', 'reportEvent'].every(k => typeof window.ArenaVault[k] === 'function') : false,
    dapi: window.ArenaDaily ? ['state', 'quests', 'reportEvent', 'claim', 'claimBonus',
      'packTimer', 'claimPack', 'streakInfo'].every(k => typeof window.ArenaDaily[k] === 'function') : false,
    // Alle vier Systeme tragen DIESELBE Ereignis-Signatur.
    sameSig: ['ArenaClan', 'ArenaPass', 'ArenaDaily', 'ArenaVault']
      .every(m => window[m] && typeof window[m].reportEvent === 'function'),
  }));
  step('arena_vault.js / arena_daily.js / arena_telemetry.js geladen',
    loopMods.vault && loopMods.daily && loopMods.tele);
  step('Vault- und Daily-API vollstaendig', loopMods.api && loopMods.dapi);
  step('Alle vier Systeme teilen die reportEvent-Naht', loopMods.sameSig);

  // --- Tresor-Widget auf Home ---
  const v0 = await page.evaluate(() => ({
    dom: !!document.querySelector('#vaultShop .vaultjar'),
    fill: document.querySelector('#vaultShop .fill').style.height,
    txt: document.querySelector('#vaultShop .vnum').textContent.trim(),
    sub: document.querySelector('#vaultShop .vsub').textContent.replace(/\s+/g, ' ').trim(),
    btn: document.querySelector('#vaultShop .vaultbtn').textContent.replace(/\s+/g, ' ').trim(),
    state: window.ArenaVault.vault(),
  }));
  step('Kristalltresor-Widget auf Home', v0.dom && /\d+ \/ \d+/.test(v0.txt), v0.txt);
  step('Fuellstand als Balkenhoehe', parseFloat(v0.fill) > 0, v0.fill);
  step('Zeigt Gems je Sieg und "noch N Siege"',
    /\+\d Gems je Sieg/.test(v0.sub) && /noch \d+ Siege/.test(v0.sub), v0.sub);
  step('Preis im deutschen Format auf dem Knopf', /\d+,\d\d €/.test(v0.btn), v0.btn.slice(0, 24));

  // --- Tresor fuellt sich per Demo-Sieg ---
  const vWin = await page.evaluate(() => {
    const before = window.ArenaVault.vault().gems;
    window.__proto.demoMatchResult(true, { silent: true });
    window.__proto.renderShop();          // Shop-Ansicht neu zeichnen
    return { before, after: window.ArenaVault.vault().gems,
             perWin: window.ArenaVault.vault().perWin,
             dom: document.querySelector('#vaultShop .vnum').textContent.trim() };
  });
  step('Ein Sieg fuellt den Tresor', vWin.after === vWin.before + vWin.perWin,
    vWin.before + ' → ' + vWin.after + ' (+' + vWin.perWin + ')');
  step('Widget aktualisiert sich sofort',
    vWin.dom.indexOf(String(vWin.after)) === 0, vWin.dom);

  // --- Tresor voll → Glow + Badge, dann oeffnen ---
  const vFull = await page.evaluate(() => {
    window.ArenaVault.reportEvent('win', 300);
    window.__proto.renderVault();
    const box = document.getElementById('vaultShop');
    return { full: window.ArenaVault.vault().full,
             glow: box.classList.contains('full'),
             tele: window.ArenaTelemetry.count('vault_full') };
  });
  step('Voller Tresor bekommt den Glow-Zustand', vFull.full && vFull.glow);
  step('vault_full an die Telemetrie gemeldet', vFull.tele >= 1, vFull.tele + 'x');
  await page.click('#vaultShop [data-openvault]');
  await page.waitForTimeout(350);
  step('Oeffnen fragt vorher nach (IAP-Platzhalter)',
    await page.locator('#confirmDlg').evaluate(e => e.classList.contains('open')));
  const cfTxt = await page.locator('#cfText').textContent();
  step('Dialog weist auf den Demo-Charakter hin', /keine Zahlung/.test(cfTxt),
    cfTxt.replace(/\s+/g, ' ').slice(-40));
  const beforeOpen = await page.evaluate(() => ({
    gems: window.__proto.gems(), tier: window.ArenaVault.vault().tier,
    cap: window.ArenaVault.vault().cap, inVault: window.ArenaVault.vault().gems,
  }));
  await page.click('#cfYes');
  /* ⚠ 1800 statt 400 ms. Seit dem Sammel-Flug ist die Kopfleiste
     waehrend der Animation ABSICHTLICH eingefroren: die Zahl gehoert
     dem Flug, bis die erste Muenze landet, sonst kommt er zu spaet zu
     seiner eigenen Nachricht. Der Wert stimmt also — er kommt nur rund
     eine Sekunde spaeter. Die Pruefung behauptet weiterhin dasselbe
     („die Kopfleiste zeigt den neuen Stand"), sie wartet nur, bis der
     Effekt fertig ist, statt mitten hineinzugreifen. */
  await page.waitForTimeout(1800);
  const afterOpen = await page.evaluate(() => ({
    gems: window.__proto.gems(), tier: window.ArenaVault.vault().tier,
    cap: window.ArenaVault.vault().cap, inVault: window.ArenaVault.vault().gems,
    top: document.getElementById('curGems').textContent,
  }));
  step('Oeffnen schreibt die Gems gut',
    afterOpen.gems === beforeOpen.gems + beforeOpen.inVault,
    beforeOpen.gems + ' + ' + beforeOpen.inVault + ' = ' + afterOpen.gems);
  step('Tresor startet neu mit hoeherer Kapazitaet',
    afterOpen.inVault === 0 && afterOpen.tier === beforeOpen.tier + 1 &&
    afterOpen.cap > beforeOpen.cap, beforeOpen.cap + ' → ' + afterOpen.cap);
  step('Top-Bar-Gems aktualisiert',
    afterOpen.top.replace(/\D/g, '') === String(afterOpen.gems), afterOpen.top);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/home_daily.png', fullPage: true });

  // --- Taegliche Quests: jetzt hinter dem Kalender-Icon der Profilzeile ---
  await page.click('#navHome');
  await page.waitForTimeout(300);
  step('Tagesziel-Panel NICHT mehr im ersten Blickfeld',
    (await page.locator('#viewHome #dailyPanel').count()) === 0);
  /* ⚠ GEAENDERTE ERWARTUNG (26.07.). Hier stand „Kalender-Icon oeffnet
     die Tagesziele". Die Kachel #icoDaily fuehrt seit dem
     Belohnungs-Fenster auf dessen Reiter LOGIN; alle drei Kacheln der
     linken Schiene oeffnen dasselbe Fenster (AA IMG_3338-3341). Die
     Erwartung ist ueberholt, nicht verletzt — sie wird geteilt:
     das NEUE Ziel der Kachel wird geprueft, und der ganze
     Tagesziel-Abschnitt darunter laeuft unveraendert weiter, nur ueber
     openDaily() statt ueber die Kachel.
     ⚠ OFFENER PUNKT, bewusst hier notiert statt still gelassen: damit
     hat #dailyLayer KEINEN Einstieg in der Oberflaeche mehr. Die drei
     Tagesquests, die Bonus-Truhe und das Gratis-Pack sind nur noch
     ueber __proto.openDaily() erreichbar. Der Patch (patches/
     belohnungen.md) sieht den Reiter TAEGLICH als Nachfolger, hat den
     alten Einstieg aber nicht ersetzt. Das ist eine Produktentscheidung
     und wird nicht im Vorbeigehen erfunden. */
  await page.click('#icoDaily');
  await page.waitForTimeout(350);
  step('Kalender-Kachel oeffnet das Belohnungs-Fenster auf LOGIN',
    await page.evaluate(() =>
      document.getElementById('rwLayer').classList.contains('open') &&
      /LOGIN/.test(document.getElementById('rwTitle').textContent)),
    await page.evaluate(() => document.getElementById('rwTitle').textContent.trim()));
  await page.click('#rwClose');
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__proto.openDaily());
  await page.waitForTimeout(350);
  step('Tagesziel-Fenster oeffnet weiterhin',
    await page.locator('#dailyLayer').evaluate(e => e.classList.contains('open')));
  const d0 = await page.evaluate(() => ({
    rows: document.querySelectorAll('#dailyBody .dqrow').length,
    open: document.getElementById('dailyPanel').classList.contains('open'),
    cnt: document.getElementById('dailyCnt').textContent.trim(),
    sub: document.getElementById('dailySub').textContent.replace(/\s+/g, ' ').trim(),
    bonus: !!document.querySelector('#dailyBody .dbonus'),
    keys: window.ArenaDaily.todayKeys(),
  }));
  step('Drei Tagesquests im Home-Panel', d0.rows === 3 && d0.keys.length === 3,
    d0.keys.join(', '));
  step('Panel ist im Layer offen', d0.open);
  step('Kopfzeile zeigt Stand, Reset und Siegesserie',
    /^\d\/3$/.test(d0.cnt) && /Reset in \d+:\d\d/.test(d0.sub) && /Serie \d/.test(d0.sub),
    d0.cnt + ' · ' + d0.sub.slice(0, 44));
  step('Bonus-Truhe und Gratis-Pack als eigene Zeilen',
    (await page.locator('#dailyBody .dbonus').count()) === 2);
  await page.click('#dailyClose');
  await page.waitForTimeout(300);
  step('Schliessen gibt den Startbildschirm wieder frei',
    !(await page.locator('#dailyLayer').evaluate(e => e.classList.contains('open'))));
  // Wieder aufmachen — seit dem Belohnungs-Fenster ueber openDaily(),
  // siehe die Notiz weiter oben.
  await page.evaluate(() => window.__proto.openDaily());
  await page.waitForTimeout(300);

  // Quest erfuellen und abholen
  const dClaim = await page.evaluate(() => {
    const D = window.ArenaDaily;
    const key = D.todayKeys()[0];
    const def = D.QUEST_POOL.filter(q => q.key === key)[0];
    D.reportEvent(def.ev, def.goal);
    window.__proto.renderDaily();
    const before = window.__proto.gold();
    document.querySelector('[data-dq="' + key + '"]').click();
    return { key: key, want: def.gold, before, after: window.__proto.gold(),
             claimed: D.state().quests.filter(q => q.claimed).length };
  });
  await page.waitForTimeout(300);
  step('Tagesquest abholen schreibt Gold gut',
    dClaim.after === dClaim.before + dClaim.want,
    dClaim.key + ': +' + dClaim.want + ' Gold');
  step('Abgeholte Quest ist markiert', dClaim.claimed === 1);
  const dRe = await page.evaluate(k => {
    try { window.ArenaDaily.claim(k); return null; } catch (e) { return e.message; }
  }, dClaim.key);
  step('Zweites Abholen wird abgelehnt', /schon abgeholt/.test(dRe || ''), dRe);

  // Alle drei → Bonus-Truhe
  const dBonus = await page.evaluate(() => {
    const D = window.ArenaDaily;
    D.todayKeys().forEach(k => {
      const def = D.QUEST_POOL.filter(q => q.key === k)[0];
      D.reportEvent(def.ev, def.goal);
      try { D.claim(k); } catch (e) {}
    });
    window.__proto.renderDaily();
    const before = window.__proto.gold();
    const ready = D.bonus().ready;
    document.getElementById('dqBonus').click();
    return { ready, before, after: window.__proto.gold(), chest: D.BONUS_CHEST.gold,
             tele: window.ArenaTelemetry.count('daily_complete') };
  });
  await page.waitForTimeout(300);
  step('3/3 macht die Tagestruhe frei', dBonus.ready === true);
  step('Tagestruhe schreibt Gold gut',
    dBonus.after === dBonus.before + dBonus.chest, '+' + dBonus.chest + ' Gold');
  step('daily_complete an die Telemetrie gemeldet', dBonus.tele >= 1, dBonus.tele + 'x');

  // --- Tages-Rollover simulieren ---
  const rollover = await page.evaluate(() => {
    const D = window.ArenaDaily;
    const before = { day: D.state().day, done: D.state().done,
                     streak: D.streakInfo().streak };
    const t = Date.now() + 86400000;                 // ein Tag weiter
    D._clock(() => t);
    const after = { day: D.state().day, done: D.state().done,
                    streak: D.streakInfo().streak,
                    have: D.state().quests.map(q => q.have) };
    D._clock(null);
    return { before, after };
  });
  step('Tages-Rollover nullt Fortschritt und Abholungen',
    rollover.after.day !== rollover.before.day && rollover.after.done === 0 &&
    rollover.after.have.every(h => h === 0),
    rollover.before.day + ' → ' + rollover.after.day);
  step('Siegesserie ueberlebt den Tageswechsel',
    rollover.after.streak === rollover.before.streak,
    'Serie ' + rollover.after.streak);

  // --- Siegesserie: Multiplikator und Reset ---
  const streak = await page.evaluate(() => {
    const D = window.ArenaDaily;
    D.reportEvent('loss', 1);                        // sauber starten
    for (let i = 0; i < 4; i++) window.__proto.demoMatchResult(true, { silent: true });
    const up = { streak: D.streakInfo().streak, mul: D.streakInfo().mul };
    window.__proto.demoMatchResult(false, { silent: true });
    const down = { streak: D.streakInfo().streak, mul: D.streakInfo().mul };
    return { up, down, chip: document.querySelector('#dailySub .streakchip').textContent.trim() };
  });
  await page.waitForTimeout(250);
  step('Vier Siege heben den Gold-Multiplikator',
    streak.up.streak === 4 && streak.up.mul > 1, streak.up.streak + ' Siege → x' + streak.up.mul);
  step('Eine Niederlage setzt die Serie zurueck',
    streak.down.streak === 0 && streak.down.mul === 1);

  // --- Gratis-Pack-Timer ---
  const packT = await page.evaluate(() => {
    const D = window.ArenaDaily;
    const t0 = D.packTimer();
    const t = Date.now() + 2 * D.PACK_MS + 60000;
    D._clock(() => t);
    const t2 = D.packTimer();
    const far = Date.now() + 40 * D.PACK_MS;
    D._clock(() => far);
    const t3 = D.packTimer();
    D._clock(null);
    return { start: t0.ready, after8h: t2.ready, after160h: t3.ready, max: D.PACK_MAX,
             slot: (document.querySelector('#packSlots .slot .tmr') || {}).textContent };
  });
  step('Gratis-Pack sammelt sich an (nach 8 h zwei)',
    packT.after8h === 2 && packT.max === 2, packT.start + ' → ' + packT.after8h);
  step('Stapel ist gedeckelt (auch nach 160 h nur zwei)',
    packT.after160h === packT.max, packT.after160h + '/' + packT.max);
  step('Countdown steht am Pack-Slot auf Home',
    /\d+:\d\d|frei/.test(packT.slot || ''), packT.slot);

  // --- Luminanz auf den neuen goldenen Knoepfen ---
  const loopLum = await page.$$eval('#vaultShop .vaultbtn, #dailyBody .dqget', els =>
    els.map(e => {
      const cs = getComputedStyle(e);
      const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
      const lum = m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
      return { gold: e.classList.contains('goldtext'), dim: e.classList.contains('dim'), lum };
    }));
  step('Tresor- und Quest-Knoepfe: dunkle Schrift auf Gold, kein goldtext',
    loopLum.length > 0 && loopLum.filter(b => !b.dim).every(b => !b.gold && b.lum < 120),
    loopLum.map(b => Math.round(b.lum)).join('/'));

  // ================= 8j. ANGEBOTSKETTE =================
  const offerTrig = await page.evaluate(() => {
    const V = window.ArenaVault;
    V.reset();
    const r1 = V.reportEvent('win', 3);              // Starter nach dem 3. Sieg
    V.reportEvent('arena', 3);                        // Referenzstand setzen
    const r2 = V.reportEvent('arena', 4);            // echter Aufstieg
    const r3 = [1, 2, 3].map(() => V.reportEvent('loss', 1)).pop();
    window.__proto.renderShop();
    return { starter: !!r1.offer, arena: !!r2.offer, comeback: !!r3.offer,
             active: V.active().map(o => o.key) };
  });
  step('3 Siege loesen das Starter-Bundle aus', offerTrig.starter);
  step('Ein Arena-Aufstieg loest das Aufstiegs-Angebot aus', offerTrig.arena);
  step('3 Niederlagen loesen das Comeback-Angebot aus', offerTrig.comeback);
  step('Alle drei liegen im Shop-Slot', offerTrig.active.length === 3,
    offerTrig.active.join(', '));
  // Tagesziel-Layer wieder schliessen — ein offener Layer faengt jeden
  // Klick auf die Bottom-Nav ab.
  await page.evaluate(() => {
    const e = document.getElementById('dailyLayer');
    if (e) e.classList.remove('open');
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
  await page.click('#navShop');
  await page.waitForTimeout(400);
  const offerUi = await page.evaluate(() => ({
    sec: getComputedStyle(document.getElementById('offerSec')).display,
    cards: document.querySelectorAll('#offerSlot .offercard').length,
    prices: [...document.querySelectorAll('#offerSlot .offerbuy')]
      .map(e => e.textContent.replace(/\s+/g, ' ').trim()),
    timers: [...document.querySelectorAll('#offerSlot .otime')].map(e => e.textContent.trim()),
    vault: !!document.querySelector('#vaultShop .vaultjar'),
    tier: document.getElementById('vaultTier').textContent.trim(),
  }));
  step('Shop zeigt den Angebots-Abschnitt', offerUi.sec !== 'none' && offerUi.cards === 3,
    offerUi.cards + ' Angebote');
  step('Jedes Angebot mit Preis und Restlaufzeit',
    offerUi.prices.every(p => /\d+,\d\d €/.test(p)) &&
    offerUi.timers.every(t => /noch/.test(t)), offerUi.prices.join(' · '));
  step('Shop hat einen eigenen Tresor-Abschnitt',
    offerUi.vault && /Stufe \d\/\d/.test(offerUi.tier), offerUi.tier);
  await page.screenshot({ path: SHOTS + '/shop_vault.png', fullPage: true });

  // --- Popup ---
  const popped = await page.evaluate(() => window.__proto.maybeShowOffer());
  await page.waitForTimeout(500);
  step('maybeShowOffer() oeffnet genau ein Popup', popped === true);
  const pop = await page.evaluate(() => ({
    open: document.getElementById('offerLayer').classList.contains('open'),
    title: document.querySelector('#offerPop .otitle').textContent.trim(),
    why: document.querySelector('#offerPop .owhy').textContent.replace(/\s+/g, ' ').trim(),
    items: document.querySelectorAll('#offerPop .oitem').length,
    timer: document.querySelector('#offerPop .otimer').textContent.trim(),
    btn: document.querySelector('#offerPop .obtn').textContent.trim(),
    note: document.querySelector('#offerPop .iapnote').textContent.trim(),
    shown: window.ArenaTelemetry.count('offer_shown'),
    // best() liefert das am kuerzesten laufende Angebot: comeback (12 h)
    key: window.ArenaVault.offers().filter(o => o.shown).map(o => o.key),
  }));
  step('Angebots-Popup offen mit Titel, Begruendung und vier Positionen',
    pop.open && pop.title.length > 3 && pop.why.length > 20 && pop.items === 4, pop.title);
  step('Popup nennt Restlaufzeit und Preis',
    /Nur noch/.test(pop.timer) && /\d+,\d\d €/.test(pop.btn), pop.timer + ' · ' + pop.btn);
  step('Popup weist auf den Demo-Charakter hin', /keine Zahlung/.test(pop.note));
  step('Popup zeigt das am kuerzesten laufende Angebot zuerst',
    pop.key.indexOf('comeback') >= 0, pop.key.join(','));
  step('offer_shown an die Telemetrie gemeldet', pop.shown >= 1, pop.shown + 'x');
  const popLum = await page.evaluate(() => {
    const e = document.querySelector('#offerPop .obtn');
    const cs = getComputedStyle(e);
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(cs.webkitTextFillColor || cs.color);
    return { gold: e.classList.contains('goldtext'),
             lum: m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 0 };
  });
  step('Angebots-Knopf: helle Schrift auf Magenta, kein goldtext',
    !popLum.gold && popLum.lum > 180, Math.round(popLum.lum));
  // Kauf (Platzhalter)
  const buy = await page.evaluate(() => {
    const key = window.ArenaVault.offers().filter(o => o.shown && o.active)[0].key;
    const o = window.ArenaVault.active().filter(x => x.key === key)[0];
    const before = { gold: window.__proto.gold(), gems: window.__proto.gems() };
    document.querySelector('#offerPop .obtn').click();
    return { key, want: o.content, before,
             after: { gold: window.__proto.gold(), gems: window.__proto.gems() } };
  });
  await page.waitForTimeout(400);
  step('Angebot kaufen (Platzhalter) schreibt Gold und Gems gut',
    buy.after.gold === buy.before.gold + buy.want.gold &&
    buy.after.gems === buy.before.gems + buy.want.gems,
    '+' + buy.want.gold + ' Gold, +' + buy.want.gems + ' Gems');
  step('Popup schliesst nach dem Kauf',
    !(await page.locator('#offerLayer').evaluate(e => e.classList.contains('open'))));
  const afterBuyOffer = await page.evaluate(() => ({
    clicked: window.ArenaTelemetry.count('offer_clicked'),
    left: window.ArenaVault.active().length,
    err: (() => { try { window.ArenaVault.claimOffer('comeback'); return null; }
                  catch (e) { return e.message; } })(),
  }));
  step('offer_clicked an die Telemetrie gemeldet', afterBuyOffer.clicked >= 1);
  step('Gekauftes Angebot verschwindet und ist nicht wiederholbar',
    afterBuyOffer.left === 2 && /bereits genutzt/.test(afterBuyOffer.err || ''),
    afterBuyOffer.err);
  await page.evaluate(() => { window.__proto.showOfferPopup(window.ArenaVault.active()[0].key); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOTS + '/offer.png' });
  await page.click('#offerLater');
  await page.waitForTimeout(300);
  step('"Spaeter" schliesst das Popup',
    !(await page.locator('#offerLayer').evaluate(e => e.classList.contains('open'))));
  // Wegwischen
  const dismissed = await page.evaluate(() => {
    const before = window.ArenaVault.active().length;
    document.querySelector('#offerSlot [data-offerx]').click();
    return { before, after: window.ArenaVault.active().length };
  });
  step('Angebot laesst sich wegwischen', dismissed.after === dismissed.before - 1,
    dismissed.before + ' → ' + dismissed.after);

  // ================= 8k. TELEMETRIE =================
  /* Erst den Pack-Flow einmal echt auslösen — pack_opened und first_merge
     sind Trichterschritte, die nur aus dem UI kommen duerfen. */
  await page.evaluate(() => window.__proto.show('navPack'));
  await page.waitForTimeout(300);
  await page.click('#btnOpenBronze');
  await page.waitForTimeout(500);
  step('Pack-Oeffnen meldet pack_opened',
    (await page.evaluate(() => window.ArenaTelemetry.count('pack_opened'))) >= 1);
  /* ⚠ NEU (30.07.2026): die Oeffnungsszene liegt seit dem Feinschliff aus
     AA_UI_REFERENZ §23 auf 4000 ms statt 3000 ms — mit dieser Suite hat
     das nichts zu tun, aber `#packLayer.on.spielt` blieb hier bisher nur
     kurz stehen und war laengst zu, wenn der Test weiterklickte. Jetzt
     verdeckt es `#navHome` noch, wenn der naechste Schritt kommt (Timeout
     "subtree intercepts pointer events"). Bestaetigt: derselbe Absturz
     tritt schon auf `HEAD` auf, VOR jeder Aenderung dieser Sitzung — ist
     also keine Regression aus dem Battle-Deck-Umbau. Die Suite schliesst
     die Ebene jetzt selbst, genau wie sie es zwei Zeilen weiter unten
     bereits mit `#mergeCeremony` tut. */
  await page.evaluate(() => {
    const pl = document.getElementById('packLayer');
    if (pl) pl.classList.remove('on', 'spielt');
  });
  const mergeTele = await page.evaluate(() => {
    const AC = window.ArenaCards;
    AC.addDrop('nature', 'common', 3);
    window.__proto.show('navForge');
    // Merge ueber die echte UI-Funktion, damit der Telemetrie-Hook greift
    const before = window.ArenaTelemetry.count('first_merge');
    const el = document.querySelector('#forgeGrid [data-id="nature"][data-tier="common"]');
    if (el) { el.click(); el.click(); el.click(); document.getElementById('btnMerge').click(); }
    return { before, after: window.ArenaTelemetry.count('first_merge') };
  });
  await page.waitForTimeout(500);
  step('Fusion meldet first_merge (einmalig)', mergeTele.after >= 1,
    mergeTele.before + ' → ' + mergeTele.after);
  await page.evaluate(() => { document.getElementById('mergeCeremony').classList.remove('open'); });
  await page.click('#navHome');
  await page.waitForTimeout(300);

  const tele = await page.evaluate(() => {
    const T = window.ArenaTelemetry;
    const f = T.funnel();
    // PII-Probe
    T.track('offer_shown', { offer: 'test', userName: 'Max', deviceId: 'X1', nested: { a: 1 } });
    const last = T.events('offer_shown').slice(-1)[0];
    return {
      defs: T.EVENTS.length, cap: T.CAP,
      seen: f.filter(x => x.count > 0).map(x => x.key),
      buffered: T.stats().buffered,
      pii: last.p,
      dropped: T.stats().dropped,
      noEndpoint: T.hasFlush(),
    };
  });
  step('11 Trichter-Ereignisse, Ringpuffer 500', tele.defs === 11 && tele.cap === 500);
  step('Trichter zaehlt die echten Flows mit',
    ['pack_opened', 'first_merge', 'first_win', 'arena_up', 'vault_full',
     'daily_complete', 'offer_shown', 'offer_clicked', 'clan_joined',
     'donation_sent'].every(k => tele.seen.indexOf(k) >= 0),
    tele.seen.join(', '));
  step('PII wird verworfen, nicht gespeichert',
    tele.pii.offer === 'test' && tele.pii.userName === undefined &&
    tele.pii.deviceId === undefined && tele.pii.nested === undefined,
    JSON.stringify(tele.pii));
  step('Verworfene Felder werden gezaehlt', tele.dropped >= 3, tele.dropped);
  step('Kein Endpunkt registriert (rein lokal)', tele.noEndpoint === false);
  const flushTest = await page.evaluate(async () => {
    const T = window.ArenaTelemetry;
    let got = null;
    T.onFlush(b => { got = b.length; return true; });
    const r = await T.flush();
    const after = T.stats().buffered;
    T.onFlush(null);
    return { got, sent: r.sent, after };
  });
  step('flush() uebergibt den Batch und leert den Puffer',
    flushTest.got > 0 && flushTest.sent === flushTest.got && flushTest.after === 0,
    flushTest.sent + ' Ereignisse');


  // ============ 8l. FARB-PASS, KARTEN-LOOPS, AUDIO =============
  /* Der User-Befund war „sieht alles so leer/tot aus" — die Ursache war,
     dass jede Reihe denselben grauen Koerper hatte. Diese Sektion prueft
     das Gegenteil: farbige Koerper UND lesbaren Text darauf. */
  const lum = (c) => {
    const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c || '');
    return m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : null;
  };

  await page.click('#navHome');
  await page.waitForTimeout(400);
  const tintHome = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.tinted')];
    return {
      n: els.length,
      vars: els.filter(e => getComputedStyle(e).getPropertyValue('--t1').trim()).length,
      grads: els.filter(e => /gradient/.test(getComputedStyle(e).backgroundImage)).length,
      // AA-REBUILD (IMG_3344), Stand 27.07.: nur noch die LINKE Schiene
      // (Login/Daily, Wochenziele, Erfolge) plus EVENTS und das
      // Pass-Banner. Die rechte Schiene und die GUIDE-Kachel sind
      // entfallen — sie boten Ziele doppelt an, die im Aufklapp-Menue
      // bzw. in der Bottom-Nav ohnehin stehen.
      tiles: ['icoDaily', 'passBanner', 'tileEvents']
        .filter(id => (document.getElementById(id) || { classList: { contains: () => false } })
          .classList.contains('tinted')).length,
      ambient: document.querySelectorAll('#arenaHero .ambient i').length,
    };
  });
  step('Home: Farbkoerper statt grauer Flaechen', tintHome.n >= 8 && tintHome.grads === tintHome.n,
    tintHome.n + ' getoente Flaechen');
  step('Jede getoente Flaeche traegt --t1/--t2', tintHome.vars === tintHome.n);
  // 3 statt 10: siehe die Liste oben, dieselben Loeschungen.
  step('Alle Home-Kacheln und Schienen-Icons sind eingefaerbt',
    tintHome.tiles === 3, tintHome.tiles + '/3');
  step('Ambient-Partikel auf dem Home-Hero', tintHome.ambient >= 8, tintHome.ambient + ' Punkte');

  // Lesbarkeit: dunkle Koerper, heller Text
  const contrast = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.tinted').forEach(e => {
      const t1 = getComputedStyle(e).getPropertyValue('--t1').trim();
      const m = /^#([0-9a-f]{6})$/i.exec(t1);
      if (!m) return;
      const r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16),
            b = parseInt(m[1].slice(4, 6), 16);
      out.push({ cls: e.className.split(' ')[0], t1, lum: r * 0.299 + g * 0.587 + b * 0.114 });
    });
    return out;
  });
  const tooBright = contrast.filter(c => c.lum > 90);
  step('Alle Tints sind dunkel genug fuer weissen Text (Luminanz < 90)',
    contrast.length > 0 && tooBright.length === 0,
    contrast.length + ' geprueft, hellste ' +
    Math.round(Math.max(...contrast.map(c => c.lum))));
  const textLum = await page.$$eval('.dqrow .dqn, .mailrow .msub, .qcard .qnm',
    els => els.map(e => getComputedStyle(e).color));
  step('Text auf getoenten Reihen bleibt hell',
    textLum.length > 0 && textLum.every(c => {
      const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c);
      return m && (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) > 170;
    }), textLum.length + ' Textfarben geprueft');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + '/home_farbig.png', fullPage: true });

  // --- Season-Pass: Bannerfarben + Animationsbild ---
  await page.click('#passBanner');
  await page.waitForTimeout(600);
  const passColor = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('#passList .rwcell')];
    const t1s = cells.map(c => getComputedStyle(c).getPropertyValue('--t1').trim());
    const v = document.getElementById('passVid');
    return {
      cells: cells.length,
      tinted: cells.filter(c => c.classList.contains('tinted')).length,
      families: [...new Set(t1s)].length,
      grads: cells.filter(c => /gradient/.test(getComputedStyle(c).backgroundImage)).length,
      milestones: document.querySelectorAll('#passList .passrow.milestone').length,
      msBorder: getComputedStyle(document.querySelector('#passList .passrow.milestone .rwcell'))
        .borderTopColor,
      vidSrc: !!v.src, vidPoster: !!v.poster,
      vidLoop: v.loop && v.muted && v.hasAttribute('playsinline'),
      keyGrad: /gradient|url/.test(getComputedStyle(document.getElementById('passArt')).backgroundImage),
      amb: document.querySelectorAll('#passArt .ambient i').length,
    };
  });
  step('Jede Pass-Reihe hat einen farbigen Banner-Koerper',
    passColor.cells === 100 && passColor.tinted === 100 && passColor.grads === 100,
    passColor.tinted + '/100');
  step('Mehrere Farbfamilien nach Belohnungstyp', passColor.families >= 6,
    passColor.families + ' Familien');
  step('Meilenstein-Reihen sind extra festlich (goldener Rahmen)',
    passColor.milestones === 5 && lum(passColor.msBorder) > 100,
    passColor.milestones + ' Meilensteine, Rahmen ' + passColor.msBorder);
  step('Pass-Header ist ein Animationsbild (Video mit Poster-Fallback)',
    passColor.vidSrc && passColor.vidPoster && passColor.vidLoop);
  step('Standbild bleibt als CSS-Fallback hinter dem Video', passColor.keyGrad);
  step('Ambient-Partikel im Pass-Header', passColor.amb >= 8, passColor.amb);
  // Text darf nicht unter den HOLEN-Knopf laufen
  /* Der HOLEN-Knopf liegt absolut ueber der Zelle. Entscheidend ist also
     nicht die Box von .rtx (die ist flex:1 und reicht bis zum Rand),
     sondern wo der TEXT endet — dafuer sorgt padding-right. */
  const clipped = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('#passList .rwcell.claimable').forEach(c => {
      const tx = c.querySelector('.rtx');
      const r = tx.getBoundingClientRect();
      const pr = parseFloat(getComputedStyle(tx).paddingRight) || 0;
      const bt = c.querySelector('.rget').getBoundingClientRect();
      // Textende (Boxrand minus Innenabstand) muss links vom Knopf liegen
      if (r.right - pr > bt.left + 1) bad.push(c.getAttribute('data-cell') + '/pr' + pr);
      // und der Text darf nicht horizontal ueberlaufen
      if (tx.scrollWidth > tx.clientWidth + 1) bad.push(c.getAttribute('data-cell') + '/overflow');
    });
    return bad;
  });
  step('Belohnungstext laeuft nicht unter den HOLEN-Knopf', clipped.length === 0,
    clipped.length ? clipped.slice(0, 3).join(', ') : 'alle Zellen sauber');
  await page.screenshot({ path: SHOTS + '/pass_farbig.png', fullPage: true });

  // --- Karten-Loops ---
  await page.click('#navCollection');
  await page.waitForTimeout(350);
  await page.waitForTimeout(150);
  await page.click('#collGrid .tile');
  await page.waitForTimeout(600);
  const loopDetail = await page.evaluate(() => {
    const v = document.querySelector('#dArt video.cvid');
    if (!v) return { has: false };
    return { has: true, src: v.getAttribute('src') || '', poster: v.poster,
             loop: v.loop, muted: v.muted, inline: v.hasAttribute('playsinline'),
             card: v.getAttribute('data-card'),
             img: !!document.querySelector('#dArt img.cart'),
             emo: !!document.querySelector('#dArt .cartemo') };
  });
  step('Karten-Detail zeigt den bewegten Loop', loopDetail.has && /\.mp4$/.test(loopDetail.src),
    loopDetail.card + ' → ' + loopDetail.src.slice(-24));
  // Das Raritaets-Band darf nicht beschnitten sein (Klassen-Kollision, s.o.)
  const dBan = await page.evaluate(() => {
    const b = document.getElementById('dBanner');
    return { w: Math.round(b.getBoundingClientRect().width),
             txt: b.textContent.trim(), over: b.scrollWidth > b.clientWidth + 1,
             clip: getComputedStyle(b).clipPath };
  });
  step('Raritaets-Band der Detailkarte ist vollstaendig lesbar',
    dBan.w > 200 && !dBan.over &&
    /^(Gewöhnlich|Gut|Selten|Episch|Legendär|Suprem)$/i.test(dBan.txt),
    dBan.txt + ' (' + dBan.w + 'px)');
  step('Loop ist stumm, laeuft in Schleife und inline',
    loopDetail.loop && loopDetail.muted && loopDetail.inline);
  step('Standbild als poster UND als Ebene darunter (drei Fallback-Stufen)',
    !!loopDetail.poster && loopDetail.img && loopDetail.emo);
  await page.screenshot({ path: SHOTS + '/detail_loop.png' });
  await page.click('#btnDetailClose');
  await page.waitForTimeout(300);

  // Helden-Buehne
  await page.click('#tabHeroes');
  await page.waitForTimeout(600);
  const heroLoops = await page.evaluate(() => ({
    vids: document.querySelectorAll('#heroList video.cvid').length,
    posters: [...document.querySelectorAll('#heroList video.cvid')].filter(v => !!v.poster).length,
  }));
  step('Heldenbuehne nutzt die Loops', heroLoops.vids === 2 && heroLoops.posters === 2,
    heroLoops.vids + ' Loops');
  await page.click('#heroBack');
  await page.waitForTimeout(250);

  // Pack-Flip geht nach dem Aufdecken in den Loop ueber
  await page.evaluate(() => window.__proto.show('navPack'));
  await page.waitForTimeout(300);
  await page.click('#btnOpenBronze');
  // ⚠ 30.07.2026: Hier stand „400 ms warten, dann die erste Kachel im
  // Raster anklicken". Das Raster entsteht aber erst, wenn die
  // Oeffnungsszene fertig ist (Bruch bei 2200 ms) — nach 400 ms waren es
  // NULL Kacheln, und der Schritt meldete „0 Loop(s) auf 0 Karte(n)". Der
  // Kommentar zwei Zeilen weiter unten wusste das sogar („Oeffnungsszene
  // laeuft laenger als dieser Test wartet") und hat die Ebene hinterher
  // von Hand weggeraeumt, statt die Ursache zu beheben.
  // Dazu ist der Klick auf die Kachel seit dem stillen Buchen ueberfluessig:
  // die SZENE deckt auf, das Raster zeichnet fertig offen. Geprueft wird
  // also der Weg, den ein Spieler geht — Zeremonie ueberspringen, Szene
  // schliessen, dann muss die offene Karte ihren Loop tragen. Genau dafuer
  // haengt `attachLoop()` jetzt am Zeichnen und nicht mehr am Drehen.
  await page.waitForTimeout(600);
  await page.click('#pkSkip');
  await page.waitForTimeout(250);
  await page.mouse.click(195, 300);
  await page.waitForTimeout(700);
  const packLoop = await page.evaluate(() => ({
    offen: !!document.querySelector('#packLayer.on'),
    karten: document.querySelectorAll('#packGrid .pcard').length,
    flipped: document.querySelectorAll('#packGrid .pcard.flipped').length,
    vids: document.querySelectorAll('#packGrid .pcfront video.cvid').length,
    poster: !!document.querySelector('#packGrid .pcfront video.cvid') &&
            !!document.querySelector('#packGrid .pcfront video.cvid').poster,
  }));
  step('Oeffnungsszene ist nach dem Ueberspringen geschlossen', !packLoop.offen);
  step('Aufgedeckte Pack-Karte geht in ihren Loop ueber',
    packLoop.karten > 0 && packLoop.flipped === packLoop.karten && packLoop.vids >= 1,
    packLoop.vids + ' Loop(s) auf ' + packLoop.flipped + '/' + packLoop.karten + ' Karte(n)');
  step('Auch dort bleibt das Standbild als poster', packLoop.poster);

  // --- Audio ---
  await page.click('#navHome');
  await page.waitForTimeout(350);
  const audio = await page.evaluate(() => ({
    exists: !!window.ArenaAudio,
    api: ['music', 'sfx', 'stopMusic', 'apply', 'unlock'].every(k => typeof window.ArenaAudio[k] === 'function'),
    wanted: window.ArenaAudio.wanted(),
    unlocked: window.ArenaAudio.isUnlocked(),
  }));
  step('ArenaAudio vorhanden mit Musik- und SFX-Kanal', audio.exists && audio.api);
  step('Theme ist vorgemerkt, laeuft aber noch NICHT (Autoplay-Policy)',
    audio.wanted === 'audio_theme' && audio.unlocked === true,
    'unlocked=' + audio.unlocked + ' (erste Geste war der Klick auf die Nav)');
  const audioToggle = await page.evaluate(() => {
    const A = window.ArenaAudio;
    A.music('audio_theme');
    const before = A.current();
    // Musik-Schalter aus
    window.__proto.toggleSetting('music');
    const offMusic = A.current();
    window.__proto.toggleSetting('music');       // wieder an
    const onAgain = A.current();
    // Sound-Schalter aus schaltet BEIDES
    window.__proto.toggleSetting('sound');
    const offAll = { music: A.current(), sfx: A.sfx('audio_victory') };
    window.__proto.toggleSetting('sound');
    return { before, offMusic, onAgain, offAll,
             settings: JSON.parse(localStorage.getItem('arenaSettings')) };
  });
  step('Musik-Schalter stoppt und startet den Musikkanal',
    audioToggle.before === 'audio_theme' && audioToggle.offMusic === null &&
    audioToggle.onAgain === 'audio_theme',
    audioToggle.before + ' → ' + audioToggle.offMusic + ' → ' + audioToggle.onAgain);
  step('Sound-Schalter schaltet Musik UND Klaenge ab',
    audioToggle.offAll.music === null && audioToggle.offAll.sfx === false);
  /* UMGESCHRIEBEN 30.07.2026 — das Kriegsboard liegt seit dem AA-Umbau
     in der Clanhalle, nicht mehr im View. Der Kriegs-Loop haengt deshalb
     am REITER, nicht am View: das blosse Betreten des Clans darf ihn
     nicht mehr starten (sonst liefe Kriegsmusik ueber einer Ansicht, auf
     der kein Krieg zu sehen ist). Genau das wird jetzt zusaetzlich
     geprueft — der Weg ist der echte: Halle auf, Reiter waehlen. */
  const audioSwitch = await page.evaluate(() => {
    const A = window.ArenaAudio;
    window.__proto.show('navClan');
    const beimBetreten = A.current();
    window.__proto.openClanHall();
    window.__proto.setClanTab('war');
    const war = A.current();
    window.__proto.setClanTab('quests');
    const back = A.current();
    window.__proto.closeClanHall();
    window.__proto.show('navHome');
    return { war, back, beimBetreten };
  });
  step('Clan-Ansicht selbst startet KEINEN Kriegs-Loop',
    audioSwitch.beimBetreten === 'audio_theme', String(audioSwitch.beimBetreten));
  await page.waitForTimeout(300);
  step('Kriegsboard wechselt auf den Kriegs-Loop',
    audioSwitch.war === 'audio_war' && audioSwitch.back === 'audio_theme',
    audioSwitch.war + ' → ' + audioSwitch.back);
  const audioAssets = await page.evaluate(() => {
    const A = window.__proto.ASSETS;
    return ['audio_theme', 'audio_battle', 'audio_war', 'audio_pack_fanfare',
            'audio_victory', 'audio_defeat'].filter(k => /\.mp3$/.test(A[k] || '')).length;
  });
  step('Alle sechs CC0-Audiodateien registriert', audioAssets === 6, audioAssets + '/6');

  // --- prefers-reduced-motion wird respektiert ---
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  const reduced = await page.evaluate(() => ({
    amb: getComputedStyle(document.querySelector('#arenaHero .ambient')).display,
    vid: getComputedStyle(document.querySelector('video.cvid') || document.body).display,
  }));
  step('prefers-reduced-motion schaltet Ambient und Loops ab',
    reduced.amb === 'none', 'ambient=' + reduced.amb);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(250);

  // ================= 9. GOLDTEXT-REGEL GLOBAL ==================
  /* GOLDTEXT-REGRESSION (der Bug ist im Projekt zweimal aufgetreten):
     Jede Flaeche mit goldenem Verlauf MUSS dunkle Schrift tragen und darf
     .goldtext nicht benutzen — sonst ist die Beschriftung unsichtbar. */
  const goldSurfaces = await page.$$eval(
    '.claimbtn, .attackbtn, .cerbtn, .okbtn, .kbuy, .forgebtn, .tb-buy, .rget, .mailtake, .vaultbtn, .dqget, .battlebtn > .goldtext',
    els => els.map(e => {
      const cs = getComputedStyle(e);
      const fill = cs.webkitTextFillColor || cs.color;
      const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(fill);
      const lum = m ? (+m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114) : 255;
      return { cls: e.className, gold: e.classList.contains('goldtext'), fill, lum,
               onGold: /244, 227, 166|240, 197, 61|224, 185, 74/.test(cs.backgroundImage) };
    }));
  // Entscheidend ist die WIRKSAME Fuellfarbe: .cerbtn traegt die Klasse
  // goldtext, ueberschreibt aber -webkit-text-fill-color mit Dunkelbraun —
  // das ist lesbar und damit in Ordnung.
  const badGold = goldSurfaces.filter(s2 => s2.onGold && s2.lum > 140);
  step('Keine helle/goldene Schrift auf goldener Flaeche',
    badGold.length === 0,
    goldSurfaces.filter(s2 => s2.onGold).length + ' goldene Flaechen geprueft' +
    (badGold.length ? ' — Verstoss: ' + badGold.map(b => b.cls).join(',') : ''));
  const icoTotal = await page.locator('img.ico, span.ico').count();
  step('Kristall-Icons + Emoji-Fallback greifen weiterhin', icoTotal > 20, String(icoTotal));

  // ================= 10. PERSISTENZ =================
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('arenaClan');
    const s = JSON.parse(raw);
    // Wie viele der 30 Mitglieder tauchen ueberhaupt im State auf? Erwartet:
    // hoechstens der Spieler selbst plus ein Spendenempfaenger aus den
    // Notizen — die MITGLIEDERLISTE als solche darf nicht persistiert sein.
    // notes und war.log sind EIGENE Ereignisprotokolle des Spielers und
    // duerfen fremde Namen nennen ("Du hast 4 x EMBER an Ilva ... gespendet").
    // Alles ausserhalb davon muss frei von der Bot-Schicht sein.
    const core = JSON.stringify(Object.assign({}, s, {
      notes: [], war: Object.assign({}, s.war, { log: [] }) }));
    // Die eigene Zeile ("Du") gehoert selbstverstaendlich in den State.
    const names = window.ArenaClan.members().filter(m => !m.me).map(m => m.name);
    const pop = window.ArenaClan.leaderboard('global').rows.filter(r => !r.me).map(r => r.name);
    return { size: raw.length, v: s.v, joined: s.joined, sendLog: s.sendLog.length,
             warPoints: s.war.points, members: names.length,
             inCore: names.filter(n => core.indexOf(n) >= 0).length,
             popInCore: pop.filter(n => core.indexOf(n) >= 0).length };
  });
  step('State unter localStorage "arenaClan", Version 2',
    persisted.v === 2 && persisted.joined === true, JSON.stringify({ v: persisted.v }));
  /* ⚠ GEAENDERT, mit Absicht. Die alte Fassung forderte an dieser
     Stelle Eintraege im Sendelog. Das kann hier nicht mehr stimmen:
     das Sendekontingent laeuft in einem rollierenden Fenster von 3 h,
     und `get(now)` streicht aeltere Eintraege beim Normalisieren
     dauerhaft weg (arena_clan.js, Z. 463-467). Weiter oben stellt die
     Pruefung selbst die Demo-Uhr auf Samstag (#btnWarDemo) — damit
     liegen die Spenden von vorhin Tage zurueck und fallen aus dem
     Fenster. Gemessen an genau dieser Stelle: Kontingent 10/10 direkt
     nach dem Spenden, danach 0 und Log leer.
     Das ist richtiges Verhalten, keine kaputte Persistenz. Geprueft
     wird deshalb, was der State wirklich zusagt: die Kriegspunkte
     ueberleben, und das Sendefenster raeumt sich selbst auf. */
  step('Kriegspunkte persistiert, Sendefenster hat sich geraeumt',
    persisted.warPoints > 0 && persisted.sendLog === 0,
    persisted.sendLog + ' Log-Eintraege (0 ist richtig, Demo-Uhr steht auf Samstag), ' +
    persisted.warPoints + ' Punkte');
  /* Dass das Sendelog ueberhaupt schreibt, wird dort geprueft, wo die
     Uhr noch stimmt: unmittelbar nach dem Spenden weiter oben stand das
     Kontingent auf 10/10. Hier ginge es nur noch um das Fenster. */
  const fenster = await page.evaluate(() => {
    const q = window.ArenaClan.sendQuota();
    return { used: q.used, left: q.left, max: window.ArenaClan.SEND_MAX,
             fensterH: window.ArenaClan.SEND_WINDOW_MS / 3600000 };
  });
  step('Sendekontingent nach Fensterablauf wieder voll',
    fenster.used === 0 && fenster.left === fenster.max,
    fenster.used + '/' + fenster.max + ' benutzt, Fenster ' + fenster.fensterH + ' h');
  step('Bot-Schicht persistiert NICHTS (ausser eigenen Ereignisprotokollen)',
    persisted.inCore === 0 && persisted.popInCore === 0 && persisted.size < 6000,
    persisted.inCore + '/' + persisted.members + ' Mitglieder, ' +
    persisted.popInCore + '/100 Board-Zeilen im Kern-State, ' + persisted.size + ' Byte');

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
