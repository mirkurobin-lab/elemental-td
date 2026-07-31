/* ==================================================================
 * KLICKDURCHLAUF: jedes Fenster, jeder Knopf, wirklich gedrueckt
 * ------------------------------------------------------------------
 * Vorgabe (31.07.2026): „teste jedes Fenster auf bugs alles muss
 * funktionieren".
 *
 * Die anderen Suiten pruefen ZIELGERICHTET — sie kennen den Knopf, den
 * sie drueckt, und die Wirkung, die sie erwartet. Diese hier macht das
 * Gegenteil: sie druckt ALLES, was klickbar aussieht, und fragt nur, ob
 * dabei etwas kaputtgeht. Sie findet damit die Fehler, an die niemand
 * gedacht hat, als er die gezielte Pruefung schrieb.
 *
 * GEPRUEFT WIRD NACH JEDEM KLICK:
 *   1. Kein JS-Fehler (pageerror) und keine Ausnahme im Handler.
 *   2. Kein Layer bleibt haengen, den niemand schliessen kann — nach
 *      dem Klick wird die Flucht (Zurueck/Schliessen/Escape) versucht.
 *   3. Die Ansicht ist danach noch bedienbar: die Bottom-Nav ist
 *      erreichbar und der aktive View hat sichtbaren Inhalt.
 *   4. Kein Element rutscht aus dem Bild (Breite des Views waechst).
 *
 * ⚠ FUENF FALLEN, in die dieser Durchlauf beim Bauen gelaufen ist:
 *   a) Ein Klick kann die Ansicht WECHSELN. Danach zeigen die zuvor
 *      gesammelten Kaesten ins Leere. Deshalb wird die Liste vor JEDEM
 *      Klick neu geholt und ueber einen stabilen Schluessel angesteuert.
 *   b) Ein Klick kann den Knopf ENTFERNEN (Kauf, Abholen). Das ist kein
 *      Fehler — fehlt der Knopf beim naechsten Anlauf, wird er
 *      uebersprungen, nicht gemeldet.
 *   c) Kaufknoepfe veraendern den gespeicherten Zustand. Der Durchlauf
 *      arbeitet deshalb auf einem FRISCHEN localStorage je Ansicht,
 *      sonst haengt das Ergebnis von der Reihenfolge ab.
 *   d) Ein Klick auf die Bottom-Nav wechselt die Ansicht und macht den
 *      Rest der Liste sinnlos — die Nav wird ausgelassen, sie hat ihre
 *      eigene Pruefung.
 *   e) `pageerror` feuert asynchron. Nach dem Klick muss gewartet
 *      werden, sonst landet der Fehler beim naechsten Knopf im Protokoll
 *      und beschuldigt den Falschen.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node klickdurchlauf.js
 * ================================================================== */
const { chromium } = require('playwright-core');
const path = require('path');

const FILE = 'file://' + (process.env.UI_DATEI
  ? path.resolve(process.env.UI_DATEI)
  : path.resolve(__dirname, '..', 'ui_prototype.html'));

const VIEWS = ['navHome', 'navShop', 'navCollection', 'navForge', 'navPack', 'navFortress',
  'navClan', 'navBoard', 'navPass', 'navHeroes', 'navEvents', 'navMail', 'navFriends',
  'navSettings', 'navCommunity', 'navGuide'];

const steps = [];
function step(name, ok, info) {
  steps.push({ name, ok, info });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  — ' + info : ''));
}
function gegen(name, sollFalschSein, info) { step('gegen: ' + name, !sollFalschSein, info); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  let jsFehler = [];
  page.on('pageerror', e => jsFehler.push(e.message));
  /* ⚠ NETZFEHLER SIND KEINE KLICKFEHLER, aber sie duerfen auch nicht
     pauschal verschwinden. Neun Assets stehen nur auf dem Higgsfield-CDN
     und der Proxy dieser Umgebung sperrt es (`ERR_TUNNEL_CONNECTION_
     FAILED`). Genau diese eine Meldung wandert in einen eigenen Zaehler;
     jeder andere Konsolenfehler — auch ein 404 auf eine lokale Datei —
     bleibt ein Befund. Ein Filter auf „alles mit .png" waere der Fehler,
     vor dem der Kopf von assets_lokal.js warnt. */
  let netzfehler = 0;
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY|ERR_NAME_NOT_RESOLVED/.test(t)) { netzfehler++; return; }
    jsFehler.push('console: ' + t.slice(0, 120));
  });

  await page.goto(FILE);
  await page.waitForTimeout(1200);
  if (await page.locator('#loginLater').count()) await page.click('#loginLater');
  await page.waitForTimeout(400);

  const kaputt = [], haengt = [], tot = [], ueber = [];
  let geklickt = 0, uebersprungen = 0, navigiert = 0;

  /* ⚠ EIN KLICK KANN DIE SEITE NEU LADEN. „Demo-Zustand zuruecksetzen"
     tut genau das, und andere Knoepfe koennen ueber einen Verweis
     dasselbe ausloesen. Playwright zerreisst dann den Kontext und jeder
     folgende `evaluate` stirbt mit „Execution context was destroyed" —
     der Durchlauf war damit zweimal vorzeitig zu Ende, ohne dass die
     Anwendung etwas falsch gemacht haette.
     `sicher()` faengt genau diesen Fall ab und zaehlt ihn; der Aufrufer
     stellt danach den Ausgangszustand wieder her. */
  const sicher = async (fn, ersatz) => {
    try { return await fn(); }
    catch (e) {
      if (!/Execution context was destroyed|Target closed|Navigation/.test(String(e.message))) throw e;
      navigiert++;
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(700);
      if (await page.locator('#loginLater').count()) await page.click('#loginLater').catch(() => {});
      return ersatz;
    }
  };

  /* Ein stabiler Schluessel je Knopf: Ansicht + Position in der Liste
     der klickbaren Elemente. Falle a. */
  const sammle = () => page.evaluate(() => {
    const A = document.querySelector('.view.active');
    if (!A) return [];
    return [...A.querySelectorAll('button,[role=button],a[href],.pressable')]
      .map((e, i) => {
        const c = getComputedStyle(e), b = e.getBoundingClientRect();
        const gut = c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 &&
                    b.width > 6 && b.height > 6 && c.pointerEvents !== 'none' && !e.disabled;
        return gut ? { i, nm: e.id || String(e.className).split(' ')[0] || e.tagName,
                       txt: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18) } : null;
      }).filter(Boolean);
  });

  for (const v of VIEWS) {
    /* Falle c: fuer jede Ansicht denselben Ausgangszustand. */
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload();
    await page.waitForTimeout(1100);
    if (await page.locator('#loginLater').count()) await page.click('#loginLater');
    await page.waitForTimeout(300);
    /* ⚠ FALLE f, beim ersten Lauf sofort zugeschlagen: ein `a[href]`
       verlaesst die Seite, und der naechste `page.evaluate` stirbt mit
       „Execution context was destroyed". Ein Link, der navigiert, ist
       kein Fehler — er gehoert zu den Sozial-Verweisen. Geprueft werden
       soll aber, ob der KLICK etwas kaputt macht, nicht ob der Browser
       navigieren kann. Deshalb wird die Navigation abgefangen und der
       Link getrennt gezaehlt. */
    await page.evaluate(() => {
      window.__verweise = [];
      document.addEventListener('click', e => {
        const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        window.__verweise.push(a.getAttribute('href'));
        e.preventDefault();
      }, true);
    });
    await page.evaluate(n => window.__proto.show(n), v);
    await page.waitForTimeout(400);

    const liste = await sammle();
    for (const ziel of liste) {
      jsFehler = [];
      /* Vor jedem Klick zurueck auf die Ansicht und Schicht schliessen. */
      await sicher(() => page.evaluate(n => {
        document.querySelectorAll('.layer.open,.pop.open,.modal.open')
          .forEach(e => e.classList.remove('open'));
        window.__proto.show(n);
      }, v), null);
      await page.waitForTimeout(180);

      const traf = await sicher(() => page.evaluate(idx => {
        const A = document.querySelector('.view.active');
        if (!A) return null;
        const alle = [...A.querySelectorAll('button,[role=button],a[href],.pressable')];
        const e = alle[idx];
        if (!e) return null;                                   // Falle b
        const c = getComputedStyle(e), b = e.getBoundingClientRect();
        if (c.display === 'none' || +c.opacity < 0.05 || b.width < 6 || e.disabled) return null;
        if (e.closest('nav.bottom')) return 'nav';              // Falle d
        try { e.click(); } catch (err) { return 'wurf:' + err.message; }
        return 'ok';
      }, ziel.i), 'ok');

      if (traf === null || traf === 'nav') { uebersprungen++; continue; }
      geklickt++;
      await page.waitForTimeout(260);                           // Falle e

      if (String(traf).startsWith('wurf:')) {
        kaputt.push(v + '/' + ziel.nm + ' ' + traf);
      } else if (jsFehler.length) {
        kaputt.push(v + '/' + ziel.nm + ' "' + ziel.txt + '" -> ' + jsFehler[0].slice(0, 90));
      }

      /* Bleibt eine Schicht offen, die man nicht mehr los wird? */
      const zustand = await sicher(() => page.evaluate(() => {
        const offen = [...document.querySelectorAll('.layer.open,.pop.open,.modal.open')]
          .map(e => e.id || e.className);
        return { offen, navDa: !!document.querySelector('nav.bottom') };
      }), { offen: [], navDa: true });
      if (zustand.offen.length) {
        /* ⚠ DIE FLUCHT MUSS TUN, WAS EIN SPIELER TAETE: jeden sichtbaren
           Knopf in der Schicht probieren, bis sie zu ist. Die erste
           Fassung suchte eine feste Liste (`.backbtn`, `[data-close]`,
           `.popx`) und meldete deshalb die Trophaeenstrasse, das
           Bestaetigungsfenster und die Deck-Auswahl als „haengt" — alle
           drei haben einen Schliesser, er heisst dort nur anders
           (`#roadOk` traegt schlicht „Okay").
           Eine Pruefung, die nur EINE Bauart des Schliessens kennt,
           meldet jede andere als Fehler. */
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(120);
        await sicher(() => page.evaluate(() => {
          const zu = () => document.querySelectorAll('.layer.open,.pop.open,.modal.open').length;
          for (let runde = 0; runde < 12 && zu(); runde++) {
            const schicht = document.querySelector('.layer.open,.pop.open,.modal.open');
            if (!schicht) break;
            const knoepfe = [...schicht.querySelectorAll('button,[role=button],.pressable')]
              .filter(e => { const b = e.getBoundingClientRect();
                             return b.width > 6 && b.height > 6 && !e.disabled; });
            if (!knoepfe.length) { schicht.click(); break; }
            /* Von hinten: der Schliesser steht fast immer unten. */
            const e = knoepfe[knoepfe.length - 1 - (runde % knoepfe.length)];
            try { e.click(); } catch (x) {}
          }
        }), null);
        await page.waitForTimeout(200);
        const rest = await sicher(() => page.evaluate(() =>
          [...document.querySelectorAll('.layer.open,.pop.open,.modal.open')].map(e => e.id || e.className)), []);
        if (rest.length) haengt.push(v + '/' + ziel.nm + ' -> ' + rest.join(','));
      }

      /* Ist die Oberflaeche danach noch bedienbar? */
      const lebt = await sicher(() => page.evaluate(() => {
        document.querySelectorAll('.layer.open,.pop.open,.modal.open')
          .forEach(e => e.classList.remove('open'));
        const A = document.querySelector('.view.active');
        const nav = document.querySelector('nav.bottom');
        /* ⚠ „BEDIENBAR" IST NICHT „DIE LEISTE IST DA". Die erste Fassung
           verlangte eine sichtbare Bottom-Nav und meldete deshalb
           `btnDemoWin`/`btnDemoLose` als kaputt — beide oeffnen den
           Ergebnisbildschirm, und der blendet die Leiste ABSICHTLICH aus
           (`body.me-open`), weil er ein Vollbild ist. Er bietet
           stattdessen REVANCHE, „Weiter" und „Tippen zum Schliessen".
           Die richtige Frage ist, ob der Spieler von hier WEITERKOMMT:
           entweder ueber die Leiste oder ueber einen sichtbaren Knopf in
           der Ansicht. */
        const wege = A ? [...A.querySelectorAll('button,[role=button],.pressable')]
          .filter(e => { const b = e.getBoundingClientRect();
                         return b.width > 20 && b.height > 14 && !e.disabled; }).length : 0;
        return { inhalt: A ? A.querySelectorAll('*').length : 0,
                 nav: (!!nav && nav.getBoundingClientRect().height > 10) || wege > 0,
                 wege,
                 breite: A ? Math.round(A.scrollWidth) : 0,
                 fenster: innerWidth };
      }), { nav: true, inhalt: 99, wege: 1, breite: 0, fenster: 430 });
      if (!lebt.nav || lebt.inhalt < 5) tot.push(v + '/' + ziel.nm);
      if (lebt.breite > lebt.fenster + 2) ueber.push(v + '/' + ziel.nm + ' ' + lebt.breite + '>' + lebt.fenster);
    }
  }

  await browser.close();

  step('Genug Knoepfe wirklich gedrueckt (>=150)', geklickt >= 150,
    geklickt + ' geklickt, ' + uebersprungen + ' ausgelassen, ' +
    netzfehler + ' Netzfehler vom gesperrten CDN, ' + navigiert + ' Seitenwechsel abgefangen');
  gegen('Durchlauf hat ueberhaupt geklickt', geklickt === 0, '');
  step('Kein Klick wirft einen Fehler', kaputt.length === 0,
    kaputt.length ? kaputt.slice(0, 8).join(' | ') : 'keiner');
  step('Keine Schicht bleibt haengen', haengt.length === 0,
    haengt.length ? haengt.slice(0, 8).join(' | ') : 'jede liess sich schliessen');
  step('Oberflaeche bleibt nach jedem Klick bedienbar', tot.length === 0,
    tot.length ? tot.slice(0, 8).join(' | ')
               : 'immer ein Weg weiter — Leiste oder Knopf in der Ansicht');
  step('Kein Klick sprengt die Bildbreite', ueber.length === 0,
    ueber.length ? ueber.slice(0, 8).join(' | ') : 'keine Ansicht wurde breiter als das Fenster');

  const bad = steps.filter(s => !s.ok).length;
  console.log(bad ? bad + ' FEHLER' : steps.length + '/' + steps.length + ' Schritte ok');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
