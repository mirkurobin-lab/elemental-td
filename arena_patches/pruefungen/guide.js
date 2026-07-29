/* ===================================================================
 * guide.js — DEFENDERS GUIDE: die bewegbare Reiterleiste (29.07.2026)
 *
 * Auftrag, woertlich (zu IMG_3360-3365):
 *   „Die Schaltflächen booster brauchen wir nicht die kannst du weg
 *    lassen. Also ist oben wieder eine beeegbare Leiste wie in unserem
 *    main menu. Mach die icons dann wieder grösser wenn es geöffnet
 *    wird."
 *
 * Diese Datei prueft GEOMETRIE und VERHALTEN, keine Pixel. Der Grund
 * steht im README: oertlich ist das Asset-CDN gesperrt, jedes Icon
 * faellt auf sein Emoji zurueck. „Icon unlesbar" ist damit strukturell
 * unsichtbar — was messbar bleibt, ist die FLAECHE, die das Icon
 * bekommt, und die wird hier gemessen.
 *
 * Was hier NICHT festgeschrieben wird, mit Absicht:
 *   · WIE viele Reiter es gibt. Belegt ist nur, dass GEGNER und BOSS
 *     Reiter DES Guides sind (IMG_3361/3362); die Fuenferbesetzung ist
 *     eine eigene Entscheidung und darf sich aendern, ohne dass eine
 *     Pruefung rot wird. Geprueft wird stattdessen: es gibt eine
 *     Leiste, genau ein Reiter ist offen, GEGNER und BOSS sind dabei,
 *     BOOSTER ist es nicht.
 *   · Konkrete px-Werte der Reiterbreite. Geprueft werden die
 *     VERHAELTNISSE (offen groesser als zu) und die eine harte Grenze
 *     des Projekts: Artwork ab 20 px.
 *
 * Aufruf:  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node guide.js
 * =================================================================== */
const { chromium } = require("playwright-core");
const DATEI = "file:///home/user/elemental-td/arena_patches/ui_prototype.html";
let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; console.log("ok   " + n + (z ? "  — " + z : "")); }
  else { fehl++; console.log("FEHL " + n + (z ? "  — " + z : "")); }
};

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 140)));

  await p.goto(DATEI, { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(1600);
  // Ein offener Layer frisst jeden Klick — erst aufraeumen, dann messen.
  await p.evaluate(() => {
    ["loginLayer", "dailyLayer", "offerLayer", "confirmDlg", "reqDlg", "detailModal",
     "roadLayer", "cineLayer", "avCerLayer", "mmLayer", "splashLayer"]
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove("open"); });
    const m = document.getElementById("tbMenuLayer"); if (m) m.hidden = true;
    window.__proto.show("navGuide");
  });
  await p.waitForTimeout(500);

  /* ---------- 1. Der Guide ist EIN View mit einer Leiste ---------- */
  const auf = await p.evaluate(() => ({
    view: (document.querySelector(".view.active") || {}).id,
    leiste: !!document.getElementById("guideRail"),
    reiter: [...document.querySelectorAll("#guideRail .grtab")]
      .map(e => e.getAttribute("data-gtab")),
    offen: [...document.querySelectorAll("#guideRail .grtab.on")]
      .map(e => e.getAttribute("data-gtab")),
    rollen: [...document.querySelectorAll("#guideRail .grtab")]
      .filter(e => e.getAttribute("role") === "tab").length,
    beschriftung: [...document.querySelectorAll("#guideRail .grn")]
      .map(e => e.textContent.trim())
  }));
  pruef("Der Guide oeffnet als EIN View", auf.view === "viewGuide", auf.view);
  pruef("Oben sitzt eine Reiterleiste mit mehreren Reitern",
    auf.leiste && auf.reiter.length >= 4, auf.reiter.join(" · "));
  pruef("Genau EIN Reiter ist offen", auf.offen.length === 1, auf.offen.join("/"));
  pruef("Jeder Reiter ist als Reiter ausgezeichnet (role=tab)",
    auf.rollen === auf.reiter.length, auf.rollen + " von " + auf.reiter.length);

  /* ---------- 2. GEGNER und BOSS sind Reiter, BOOSTER nicht ----------
     Das ist der belegte Teil (IMG_3361/3362) und zugleich der
     ausdrueckliche Wunsch, den Booster-Knopf wegzulassen. */
  pruef("GEGNER ist ein eigener Reiter", auf.reiter.indexOf("enemies") >= 0);
  pruef("BOSS ist ein eigener Reiter", auf.reiter.indexOf("boss") >= 0);
  pruef("KEIN Booster-Reiter — ausdruecklich nicht gewuenscht",
    !/booster/i.test(auf.reiter.join(" ") + " " + auf.beschriftung.join(" ")),
    auf.beschriftung.join(" · "));

  /* ---------- 3. Die Leiste ist BEWEGBAR, keine starre Zeile ----------
     Drei Bedingungen, und alle drei muessen gelten:
       a) sie ist ein Querscroller (overflow-x),
       b) sie hat mehr Inhalt als Platz — sonst gibt es nichts zu
          bewegen und die „Leiste" ist optisch eine Reiterzeile,
       c) der senkrechte Wisch bleibt frei (overscroll-behavior-x). */
  const leiste = await p.evaluate(() => {
    const r = document.getElementById("guideRail");
    const cs = getComputedStyle(r);
    const app = document.getElementById("app").getBoundingClientRect().width;
    return { ox: cs.overflowX, obx: cs.overscrollBehaviorX,
             scrollW: r.scrollWidth, clientW: Math.round(r.clientWidth),
             app: Math.round(app) };
  });
  pruef("Die Leiste ist ein Querscroller",
    leiste.ox === "auto" || leiste.ox === "scroll", leiste.ox);
  pruef("Sie hat mehr Inhalt als Platz — es gibt etwas zu bewegen",
    leiste.scrollW > leiste.clientW + 8,
    leiste.scrollW + " px Inhalt in " + leiste.clientW + " px Leiste");
  pruef("Der senkrechte Wisch bleibt frei (overscroll-behavior-x)",
    leiste.obx === "contain", leiste.obx);
  pruef("Die Leiste bleibt in der Spaltenbreite von #app",
    leiste.clientW <= leiste.app, leiste.clientW + " px in " + leiste.app + " px");

  /* ---------- 4. Wischen bewegt die Leiste, ohne einen Reiter zu
     oeffnen ----------
     Der View-Wisch hat dafuer `klickSperre`; die Leiste braucht keine
     zweite Sperre, weil natives Scrollen den Klick selbst verschluckt.
     Genau das wird hier nachgestellt: eine echte Touch-Geste ueber der
     Leiste. Sie muss scrollen UND den Reiter stehen lassen. */
  const cdp = await p.context().newCDPSession(p);
  const geste = await p.evaluate(() => {
    const r = document.getElementById("guideRail");
    r.scrollLeft = 0;
    const box = r.getBoundingClientRect();
    return { y: Math.round(box.top + box.height / 2),
             x1: Math.round(box.right - 24), x2: Math.round(box.left + 24),
             vorher: window.__proto.gTab(), scroll0: Math.round(r.scrollLeft) };
  });
  const tippen = async (typ, x, y) => cdp.send("Input.dispatchTouchEvent", {
    type: typ,
    touchPoints: typ === "touchEnd" ? [] : [{ x, y, id: 1 }]
  });
  await tippen("touchStart", geste.x1, geste.y);
  for (let i = 1; i <= 8; i++) {
    await tippen("touchMove", geste.x1 + (geste.x2 - geste.x1) * i / 8, geste.y);
    await p.waitForTimeout(16);
  }
  await tippen("touchEnd", geste.x2, geste.y);
  await p.waitForTimeout(600);
  const nachGeste = await p.evaluate(() => ({
    scroll: Math.round(document.getElementById("guideRail").scrollLeft),
    tab: window.__proto.gTab()
  }));
  pruef("Wischen bewegt die Leiste",
    nachGeste.scroll > geste.scroll0, geste.scroll0 + " → " + nachGeste.scroll + " px");
  pruef("Ein Wisch oeffnet KEINEN Reiter (kein Klick aus einer Geste)",
    nachGeste.tab === geste.vorher, geste.vorher + " → " + nachGeste.tab);

  /* ---------- 5. Das Icon des OFFENEN Reiters ist groesser ----------
     Woertliche Vorgabe. Zusaetzlich die Projektgrenze: kein Artwork
     unter 20 px — der geschlossene Reiter wird kleiner, nicht blind. */
  const mass = async () => p.evaluate(() => {
    const kachel = e => {
      const i = e.querySelector(".gri > *") || e.querySelector(".gri");
      const r = i.getBoundingClientRect(), k = e.getBoundingClientRect();
      return { tab: e.getAttribute("data-gtab"), on: e.classList.contains("on"),
               ico: Math.round(r.width), h: Math.round(r.height),
               breit: Math.round(k.width) };
    };
    return [...document.querySelectorAll("#guideRail .grtab")].map(kachel);
  });
  // Erst den Emoji-/Asset-Fallback durchlaufen lassen, sonst misst man
  // ein <img>, das noch gar nicht entschieden hat, was es ist.
  await p.evaluate(() => window.UIIcon.sweep(document.getElementById("viewGuide"), true));
  await p.waitForTimeout(200);
  const m1 = await mass();
  const anTab = m1.filter(e => e.on)[0];
  const zuTabs = m1.filter(e => !e.on);
  pruef("Das Icon des offenen Reiters ist groesser als die uebrigen",
    !!anTab && zuTabs.every(e => anTab.ico >= e.ico + 8),
    "offen " + (anTab && anTab.ico) + " px gegen " +
      zuTabs.map(e => e.ico).join("/") + " px");
  pruef("Auch geschlossene Reiter bleiben ueber der 20-px-Grenze",
    m1.every(e => e.ico >= 20 && e.h >= 20),
    m1.map(e => e.tab + ":" + e.ico).join(" · "));
  pruef("Der offene Reiter ist auch breiter als die geschlossenen",
    !!anTab && zuTabs.every(e => anTab.breit > e.breit),
    "offen " + (anTab && anTab.breit) + " px gegen " +
      zuTabs.map(e => e.breit).join("/") + " px");

  /* ---------- 6. Licht kommt von oben ----------
     Offener Reiter = erhaben, geschlossener = eingesenkt. Gemessen an
     den Token-Signaturen, nicht an einer Farbe: `inset 0 1...px 0
     #ffffff…` ist die helle OBERkante (erhaben), `inset 0 2px 5px
     #000…` der Schatten VON OBEN hinein (eingesenkt). */
  const licht = await p.evaluate(() => {
    const an = document.querySelector("#guideRail .grtab.on");
    const zu = document.querySelector("#guideRail .grtab:not(.on)");
    return { an: getComputedStyle(an).boxShadow, zu: getComputedStyle(zu).boxShadow };
  });
  pruef("Offener Reiter ist erhaben (helle Oberkante innen)",
    /inset\s+rgba?\([^)]*\)\s+0px\s+1(\.5)?px\s+0px/.test(licht.an) ||
    /rgba?\([^)]*\)\s+0px\s+1(\.5)?px\s+0px\s+0px\s+inset/.test(licht.an),
    licht.an.slice(0, 70));
  pruef("Geschlossener Reiter ist eingesenkt (Schatten von oben hinein)",
    /inset/.test(licht.zu) && /0px\s+2px\s+5px/.test(licht.zu),
    licht.zu.slice(0, 70));
  pruef("Keine .goldtext in der Reiterleiste",
    await p.evaluate(() => !document.querySelector("#guideRail .goldtext")));

  /* ---------- 7. Ein Reiter zeigt genau eine Flaeche ---------- */
  const PANES = ["gpTasks", "gpManual", "gpElements", "gpEnemies", "gpBoss"];
  let sauber = 0, gemessen = 0, geholt = 0;
  for (const t of ["tasks", "manual", "elements", "enemies", "boss"]) {
    const s = await p.evaluate(async k => {
      window.__proto.guideTab(k);
      await new Promise(r => setTimeout(r, 220));
      const r = document.getElementById("guideRail");
      const an = r.querySelector(".grtab.on");
      const rb = r.getBoundingClientRect(), ab = an.getBoundingClientRect();
      return {
        tab: window.__proto.gTab(),
        sichtbar: ["gpTasks", "gpManual", "gpElements", "gpEnemies", "gpBoss"]
          .filter(id => !document.getElementById(id).hidden),
        anId: an.getAttribute("data-gtab"),
        // Liegt der offene Reiter vollstaendig im Sichtfenster der Leiste?
        drin: ab.left >= rb.left - 1 && ab.right <= rb.right + 1
      };
    }, t);
    gemessen++;
    if (s.tab === t && s.anId === t && s.sichtbar.length === 1) sauber++;
    if (s.drin) geholt++;
  }
  pruef("Jeder Reiter zeigt genau seine eine Flaeche",
    sauber === gemessen, sauber + " von " + gemessen);
  pruef("Der offene Reiter wird in die Leiste hineingeholt",
    geholt === gemessen, geholt + " von " + gemessen + " vollstaendig sichtbar");

  /* ---------- 8. Inhalte der Reiter ----------
     Nur so viel, dass ein leerer Reiter auffaellt. Die Tiefenpruefung
     der einzelnen Bausteine (Rad, Gitter, Detailkarte, Handbuch) steht
     unveraendert in run_v7.js — sie hier zu wiederholen waere eine
     zweite Wahrheit ueber dieselbe Sache. */
  const inhalt = await p.evaluate(async () => {
    const G = window.__proto, r = {};
    const zu = async k => { G.guideTab(k); await new Promise(s => setTimeout(s, 200)); };
    await zu("tasks");
    r.kapitel = document.querySelectorAll("#guideChapters .gchap").length;
    await zu("manual");
    r.seiten = document.querySelectorAll("#manList .manpage").length;
    await zu("elements");
    r.knoten = document.querySelectorAll("#elWheel .elnode").length;
    await zu("enemies");
    r.gegner = document.querySelectorAll("#mobGrid .mobtile").length;
    r.gegnerBoss = document.querySelectorAll("#mobGrid .mobtile.boss").length;
    r.wellen = document.querySelectorAll("#waveList .waverow").length;
    await zu("boss");
    r.bosse = document.querySelectorAll("#bossGrid .mobtile").length;
    r.bosseNurBoss = document.querySelectorAll("#bossGrid .mobtile:not(.boss)").length;
    r.bossWellen = document.querySelectorAll("#bossWaves .waverow").length;
    r.bossWellenNurBoss = document.querySelectorAll("#bossWaves .waverow:not(.boss)").length;
    return r;
  });
  pruef("Reiter AUFGABEN traegt die Kapitel", inhalt.kapitel >= 4, inhalt.kapitel + " Kapitel");
  pruef("Reiter HANDBUCH traegt die Erklaerseiten", inhalt.seiten === 8, inhalt.seiten + " Seiten");
  pruef("Reiter ELEMENTE traegt das Rad", inhalt.knoten === 6, inhalt.knoten + " Knoten");
  pruef("Reiter GEGNER zeigt Gegner und KEINEN Boss",
    inhalt.gegner >= 5 && inhalt.gegnerBoss === 0,
    inhalt.gegner + " Kacheln, " + inhalt.gegnerBoss + " davon Boss");
  pruef("Reiter BOSS zeigt AUSSCHLIESSLICH Bosse",
    inhalt.bosse >= 1 && inhalt.bosseNurBoss === 0,
    inhalt.bosse + " Kacheln, " + inhalt.bosseNurBoss + " davon kein Boss");
  pruef("Reiter BOSS listet nur Bosswellen",
    inhalt.bossWellen >= 1 && inhalt.bossWellenNurBoss === 0 &&
    inhalt.bossWellen < inhalt.wellen,
    inhalt.bossWellen + " von " + inhalt.wellen + " Wellenzeilen");

  /* ---------- 9. Die Detailkarte gehoert ihrem Reiter ----------
     Sie ist EIN Bauteil fuer beide Kachel-Reiter. Zwei Dinge muessen
     stimmen: Zurueck fuehrt auf das Gitter, aus dem man kam, und ein
     Reiterwechsel laesst die Karte nicht offen stehen. */
  const detail = await p.evaluate(async () => {
    const G = window.__proto, warte = () => new Promise(r => setTimeout(r, 220));
    G.guideTab("boss"); await warte();
    document.querySelector("#bossGrid .mobtile").click(); await warte();
    const a = { karte: !document.getElementById("bsPage3").hidden,
                gitter: document.getElementById("gpBoss").hidden,
                zurueck: !!document.getElementById("bsBack"),
                name: (document.querySelector("#bsPage3 .mhn") || {}).textContent };
    document.getElementById("bsBack").click(); await warte();
    const zurBoss = { karte: !document.getElementById("bsPage3").hidden,
                      gitter: !document.getElementById("gpBoss").hidden,
                      tab: G.gTab() };
    // Karte offen lassen und den Reiter wechseln
    document.querySelector("#bossGrid .mobtile").click(); await warte();
    G.guideTab("elements"); await warte();
    const wechsel = { karte: !document.getElementById("bsPage3").hidden,
                      pane: !document.getElementById("gpElements").hidden };
    return { a, zurBoss, wechsel };
  });
  pruef("Eine Kachel oeffnet die Detailkarte statt des Gitters",
    detail.a.karte && detail.a.gitter && detail.a.zurueck, detail.a.name);
  pruef("Zurueck fuehrt auf das Gitter DES Reiters, aus dem man kam",
    !detail.zurBoss.karte && detail.zurBoss.gitter && detail.zurBoss.tab === "boss",
    detail.zurBoss.tab);
  pruef("Ein Reiterwechsel laesst keine Detailkarte stehen",
    !detail.wechsel.karte && detail.wechsel.pane);

  /* ---------- 10. Die alten Wege bleiben gueltig ----------
     Handbuch und Bestiarium sind keine eigenen Views mehr. Wer sie
     trotzdem anspringt — Einstellungen, Menue, aeltere Suiten —, muss
     im richtigen Reiter landen statt im Leeren. */
  const wege = await p.evaluate(async () => {
    const G = window.__proto, warte = () => new Promise(r => setTimeout(r, 220));
    G.show("navManual"); await warte();
    const man = { view: (document.querySelector(".view.active") || {}).id, tab: G.gTab() };
    G.show("navBestiary"); await warte();
    const bs = { view: (document.querySelector(".view.active") || {}).id, tab: G.gTab() };
    return { man, bs,
             alteViews: !!document.getElementById("viewManual") ||
                        !!document.getElementById("viewBestiary"),
             notknoepfe: !!document.getElementById("btnToManual") ||
                         !!document.getElementById("btnToBestiary") };
  });
  pruef("navManual landet im Reiter HANDBUCH",
    wege.man.view === "viewGuide" && wege.man.tab === "manual",
    wege.man.view + "/" + wege.man.tab);
  pruef("navBestiary landet im Reiter GEGNER",
    wege.bs.view === "viewGuide" && wege.bs.tab === "enemies",
    wege.bs.view + "/" + wege.bs.tab);
  pruef("Die alten Einzel-Views gibt es nicht mehr", !wege.alteViews);
  pruef("Die beiden Notknoepfe im Guide-Kopf sind weg", !wege.notknoepfe);

  /* ---------- 11. Nichts scrollt waagerecht aus dem Bild ----------
     Die Leiste DARF quer scrollen — die SEITE nicht. Das ist genau der
     Unterschied, an dem eine bis an die Kante gezogene Reihe sonst
     scheitert. */
  const quer = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  pruef("Der Guide laesst die Seite nicht waagerecht scrollen", !quer);

  pruef("Keine JS-Fehler im Guide", jsF.length === 0, jsF[0]);
  console.log("\n" + ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
