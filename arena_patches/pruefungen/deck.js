/* ===================================================================
 * deck.js — Battle Deck (§24), die Bruecke zwischen arena_deck.js und
 * dem Bild.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * `arena_deck.js` bringt einen eigenen Selbsttest mit (`node
 * arena_deck.js`, 27 Schritte) — der prueft die REGEL: Zonen, Plaetze,
 * Tausch, Sperre, kaputte Staende. Kein einziger davon sieht die
 * OBERFLAECHE. Er haette nicht gemerkt, wenn die View das Modul falsch
 * verdrahtet, ein Platz nicht wirklich tippbar ist, oder die Sammlung
 * nach einer Deck-Aenderung einen veralteten Stand zeigt. Genau diese
 * Fuge prueft diese Datei, im Browser.
 *
 * DER LEITSATZ: NICHTS EINFRIEREN, WAS SICH LEGITIM AENDERN DARF
 * "Es sind 6 Turmplaetze" wird gegen `ArenaDeck.FORM.tuerme` geprueft,
 * nicht gegen die Zahl 6 — dieselbe Regel wie bei offline.js und den
 * uebrigen Suiten hier (README, "Grün heißt nicht geprüft").
 *
 * DATEIPFAD BEWUSST NICHT HARTKODIERT
 * Alle anderen Suiten in diesem Verzeichnis laden
 * `file:///home/user/elemental-td/arena_patches/ui_prototype.html` —
 * den GEMEINSAMEN Checkout. Diese Datei entsteht in einem eigenen
 * Arbeits-Worktree (siehe Commit-Nachricht), der noch nicht dorthin
 * gemergt ist. Ein hartkodierter Pfad haette hier StILL gegen die
 * FALSCHE — naemlich die alte, unveraenderte — Datei gemessen und
 * waere garantiert gruen gewesen, ganz gleich was in DIESEM Worktree
 * steht. Genau die Falle, vor der das README warnt ("ein gruener
 * Balken, der eine veraltete Datei durchwinkt"). `path.resolve` gegen
 * das eigene Verzeichnis trifft immer die Datei, die tatsaechlich
 * geprueft werden soll — im Worktree wie nach dem Merge gleichermassen.
 *
 * AUFRUF
 *   export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
 *   export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
 *   node deck.js
 * =================================================================== */
const { chromium } = require("playwright-core");
const path = require("path");

const DATEI = "file://" + path.resolve(__dirname, "..", "ui_prototype.html");

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; } else { fehl++; console.log("  FEHL " + n + (z !== undefined ? "  ->  " + z : "")); }
};
/* Gegenprobe: die Regel wird absichtlich gebrochen, die Messung MUSS
   das melden. Ein Schritt ohne Gegenprobe kann gruen sein, weil er
   nichts misst — das faellt sonst nie auf (README, zweimal passiert). */
const gegen = (n, gebrochenErkannt, z) => {
  if (gebrochenErkannt) { ok++; }
  else { fehl++; console.log("  FEHL Gegenprobe " + n + " haette rot sein muessen" + (z !== undefined ? "  ->  " + z : "")); }
};

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 200)));

  async function laden() {
    await p.goto(DATEI, { waitUntil: "load", timeout: 40000 });
    await p.waitForTimeout(1800);
    await p.evaluate(() => {
      ["loginLayer", "dailyLayer", "offerLayer", "cineLayer", "avCerLayer", "splashLayer"]
        .forEach(i => { const e = document.getElementById(i); if (e) e.classList.remove("open"); });
      // Jede Sektion hier braucht den Deck-Reiter offen — nach einem
      // Neuladen steht die App sonst auf navHome, und #deckPane bleibt
      // unsichtbar (display:none), was jeden Klick-Test mit einem
      // Playwright-Timeout ("element is not visible") scheitern liesse.
      window.__proto.show("navCollection");
    });
  }
  async function frischerSpeicher() {
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await laden();
  }
  // Ein Platz ist nur "treffbar", wenn der Daumenpunkt in seiner Mitte
  // WIRKLICH bei ihm (oder einem Kind von ihm) landet — nicht bei einer
  // Ebene, die zufaellig darueber liegt (dieselbe Pruefung wie
  // offline.js, Schritt 1).
  const treffbar = sel => p.evaluate(s => {
    const k = document.querySelector(s);
    if (!k) return { da: false };
    const r = k.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const oben = document.elementFromPoint(cx, cy);
    return { da: true, breite: Math.round(r.width), hoehe: Math.round(r.height),
             frei: !!oben && (oben === k || k.contains(oben)),
             tag: oben ? oben.tagName + "." + oben.className : "-" };
  }, sel);

  await frischerSpeicher();

  /* ================================================================
   * 1. DER ERSTZUSTAND — die wichtigste Lehre des Tages (README)
   * ----------------------------------------------------------------
   * Jeder Schritt danach stellt sich irgendeinen Zustand HER. Dieser
   * hier ist der einzige, der garantiert echt ist: ein Spieler, der
   * das Spiel zum ersten Mal oeffnet. Frischer localStorage, KEIN
   * vorheriges Setzen — genau das hat am selben Tag eine fertige
   * Funktion (Offline-Ertraege) unsichtbar gemacht, weil jede Pruefung
   * vorher einen Zustand herstellte statt den ersten zu messen.
   * ================================================================ */
  const erst = await p.evaluate(() => {
    window.__proto.show("navCollection");
    const D = window.__proto.ArenaDeck();
    const an = D.ansicht();
    return {
      dkMain: window.__proto.dkMain(),
      deckPaneSichtbar: getComputedStyle(document.getElementById("deckPane")).display !== "none",
      collPaneVersteckt: getComputedStyle(document.getElementById("collPane")).display === "none",
      held: an.held, tuerme: an.tuerme, spells: an.spells,
      belegt: an.belegung.belegt, plaetze: an.belegung.plaetze,
      frei: an.frei, aktiv: an.aktiv,
      tuermeButtons: document.querySelectorAll("#dkTowers [data-zone]").length,
      spellButtons: document.querySelectorAll("#dkSpells [data-zone]").length,
      formTuerme: D.FORM.tuerme, formSpells: D.FORM.spells, formHelden: D.FORM.helden,
      decks: D.DECKS,
    };
  });
  pruef("der zweite Bottom-Nav-Reiter zeigt beim ALLERERSTEN Oeffnen das Deck, nicht die Sammlung",
        erst.dkMain === "deck" && erst.deckPaneSichtbar && erst.collPaneVersteckt,
        JSON.stringify({ dkMain: erst.dkMain, deckPane: erst.deckPaneSichtbar, collPane: erst.collPaneVersteckt }));
  pruef("ein frisches Deck ist wirklich LEER (kein Karten-Rest aus einer Demo)",
        erst.held === null && erst.tuerme.every(x => x === null) && erst.spells.every(x => x === null),
        JSON.stringify({ held: erst.held, tuerme: erst.tuerme, spells: erst.spells }));
  pruef("nichts ist belegt — 0 von " + erst.plaetze,
        erst.belegt === 0 && erst.plaetze === erst.formHelden + erst.formTuerme + erst.formSpells,
        erst.belegt + "/" + erst.plaetze);
  pruef("Deck 1 ist aktiv, wie es ein frischer Stand verlangt", erst.aktiv === 0, erst.aktiv);
  pruef("die Turm-Reihe zeigt FORM.tuerme Plaetze, nicht eine feste Zahl",
        erst.tuermeButtons === erst.formTuerme, erst.tuermeButtons + " gegen " + erst.formTuerme);
  pruef("die Spell-Reihe zeigt FORM.spells Plaetze",
        erst.spellButtons === erst.formSpells, erst.spellButtons + " gegen " + erst.formSpells);

  /* ================================================================
   * 2. PLAETZE JE ZONE GEGEN FORM — nichts eingefroren
   * ----------------------------------------------------------------
   * Gegenprobe: FORM.tuerme wird zur Laufzeit veraendert (dasselbe
   * Objekt, das die View abfragt) und neu gezeichnet. Zeichnet die
   * View danach die NEUE Zahl, folgt sie wirklich FORM statt einer
   * eigenen Kopie — genau die Eigenschaft, die Schritt oben behauptet.
   * Rueckgaengig gemacht, damit nichts in die naechsten Schritte
   * durchsickert. ================================================ */
  const formGegenprobe = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    const echt = D.FORM.tuerme;
    D.FORM.tuerme = 4;
    window.__proto.renderDeckBoard();
    const vier = document.querySelectorAll("#dkTowers [data-zone]").length;
    D.FORM.tuerme = echt;
    window.__proto.renderDeckBoard();
    const zurueck = document.querySelectorAll("#dkTowers [data-zone]").length;
    return { vier, zurueck, echt };
  });
  gegen("Turm-Plaetze folgen FORM statt einer Kopie",
        formGegenprobe.vier === 4 && formGegenprobe.zurueck === formGegenprobe.echt,
        JSON.stringify(formGegenprobe));
  pruef("Heldenplatz ist immer genau EINER (kein data-zone-Array noetig)",
        await p.evaluate(() => document.querySelectorAll('[data-zone="held"]').length === 1));

  /* ================================================================
   * 3. ZONEN-REGELN — jede Karte nur in ihre Zone
   * ----------------------------------------------------------------
   * Sowohl auf der DATEN- als auch auf der ANGEBOTS-Seite: die Regel
   * gilt nicht nur, wenn man sie versucht (setze()), sondern die Liste,
   * die man ueberhaupt ANGEBOTEN bekommt (dkKandidaten/openDeckPick),
   * darf die falsche Art gar nicht erst enthalten — sonst waere jeder
   * Fehlversuch nur einen Tipp entfernt. */
  const zonen = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    const tuermeKandidaten = window.__proto.dkKandidaten("tuerme");
    const heldKandidaten = window.__proto.dkKandidaten("held");
    const spellKandidaten = window.__proto.dkKandidaten("spells");
    const HERO = window.__proto.HERO_IDS, TOWER = window.__proto.TOWER_IDS;
    window.__proto.openDeckPick("tuerme", 0);
    const dialogIds = [...document.querySelectorAll("#deckPickGrid [data-pick]")]
      .map(e => e.getAttribute("data-pick"));
    document.getElementById("deckPickDlg").classList.remove("open");
    return {
      turmZoneOk: tuermeKandidaten.every(id => TOWER.indexOf(id) >= 0 && HERO.indexOf(id) < 0),
      heldZoneOk: heldKandidaten.every(id => HERO.indexOf(id) >= 0),
      spellHatKeineTuerme: spellKandidaten.every(id => TOWER.indexOf(id) < 0),
      dialogNurTuerme: dialogIds.length > 0 && dialogIds.every(id => TOWER.indexOf(id) >= 0),
      heldAufTurmplatz: D.setze("tuerme", 0, HERO[0]),
      turmAufHeldenplatz: D.setze("held", 0, TOWER[0]),
      spellAufTurmplatz: D.setze("tuerme", 1, window.__proto.dkKandidaten("spells")[0] || "splitter"),
    };
  });
  pruef("Turm-Waehler bietet ausschliesslich Turmkarten an", zonen.turmZoneOk);
  pruef("Helden-Waehler bietet ausschliesslich Helden an", zonen.heldZoneOk);
  pruef("Spell-Waehler bietet keine Turmkarten an", zonen.spellHatKeineTuerme);
  pruef("der ECHTE Dialog (openDeckPick) zeigt fuer einen Turmplatz nur Tuerme",
        zonen.dialogNurTuerme, JSON.stringify(zonen));
  pruef("ein Held darf NICHT auf einen Turmplatz", zonen.heldAufTurmplatz.grund === "art");
  pruef("ein Turm darf NICHT auf den Heldenplatz", zonen.turmAufHeldenplatz.grund === "art");
  pruef("ein Spell darf NICHT auf einen Turmplatz", zonen.spellAufTurmplatz.grund === "art");
  /* Gegenprobe: mit absichtlich VERTAUSCHTEN Regeln (istTurm sagt zu
     ALLEM ja) muss genau derselbe Aufruf jetzt DURCHGEHEN — sonst
     wuerde obiger Schritt nie etwas geprueft haben. Zurueckgesetzt per
     Neuladen, weil konfig() ueber TOWER_IDS/HERO_IDS geschlossene
     Funktionen einbindet, die sich nicht sauber einzeln zuruecksetzen
     lassen. */
  const kaputteKonfig = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    D.konfig({ istTurm: () => true, istHeld: () => false, istSpell: () => false, besitzt: () => true });
    return D.setze("tuerme", 0, "solara_ware_kein_turm");
  });
  gegen("Zonen-Regel (Held auf Turmplatz)", kaputteKonfig.ok === true, JSON.stringify(kaputteKonfig));
  await laden();   // konfig() zurueck auf die echte Verdrahtung

  /* ================================================================
   * 4. BESITZ — eine nicht besessene Karte kommt nicht ins Deck
   * ================================================================ */
  const besitz = await p.evaluate(() => {
    const AC = window.__proto.AC;
    const st = AC.get();
    const alt = JSON.parse(JSON.stringify(st.cards.magmor.copies));
    Object.keys(st.cards.magmor.copies).forEach(k => { st.cards.magmor.copies[k] = 0; });
    AC._write(st);
    const D = window.__proto.ArenaDeck();
    const kandidatenOhne = window.__proto.dkKandidaten("held");
    const versuchOhne = D.setze("held", 0, "magmor");
    // zurueck: Besitz wiederherstellen
    const st2 = AC.get();
    st2.cards.magmor.copies = alt;
    AC._write(st2);
    const kandidatenMit = window.__proto.dkKandidaten("held");
    const versuchMit = D.setze("held", 0, "magmor");
    return { kandidatenOhne, versuchOhne, kandidatenMit, versuchMit };
  });
  pruef("eine nicht besessene Karte fehlt in der Kandidatenliste",
        besitz.kandidatenOhne.indexOf("magmor") < 0, JSON.stringify(besitz.kandidatenOhne));
  pruef("und setze() lehnt sie mit dem Grund 'besitz' ab",
        besitz.versuchOhne.ok === false && besitz.versuchOhne.grund === "besitz",
        JSON.stringify(besitz.versuchOhne));
  gegen("Besitz-Regel (Kandidatenliste)", besitz.kandidatenMit.indexOf("magmor") >= 0,
        JSON.stringify(besitz.kandidatenMit));
  gegen("Besitz-Regel (setze)", besitz.versuchMit.ok === true, JSON.stringify(besitz.versuchMit));

  /* ================================================================
   * 5. TAUSCH — dieselbe Karte auf einen zweiten Platz TAUSCHT
   * ----------------------------------------------------------------
   * Ueber den ECHTEN Weg: zwei Tipps auf zwei Platzhalter, nicht per
   * direktem API-Aufruf — sonst waere die Verdrahtung des Dialogs gar
   * nicht Teil der Pruefung. */
  await p.evaluate(() => window.__proto.ArenaDeck()._reset());
  await p.evaluate(() => {
    window.__proto.openDeckPick("tuerme", 0);
    window.__proto.dkWaehleKarte("fire");
  });
  await p.evaluate(() => {
    window.__proto.openDeckPick("tuerme", 3);
    window.__proto.dkWaehleKarte("fire");   // dieselbe Karte, ANDERER Platz — muss tauschen
  });
  // dkWaehleKarte() selbst schliesst den Dialog und meldet ueber toast() —
  // hier direkt die Wirkung im DECK lesen, das ist die Behauptung.
  const nachTausch = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    const d = D.aktivesDeck();
    return { tuerme: d.tuerme, gesamt: d.tuerme.filter(x => x === "fire").length };
  });
  pruef("nach dem Tausch liegt 'fire' auf dem NEUEN Platz",
        nachTausch.tuerme[3] === "fire", JSON.stringify(nachTausch.tuerme));
  pruef("und der alte Platz ist frei (kein zweites 'fire')",
        nachTausch.tuerme[0] === null && nachTausch.gesamt === 1, JSON.stringify(nachTausch.tuerme));
  /* Gegenprobe: zwei VERSCHIEDENE Karten duerfen NICHT als "Tausch"
     gelten — sonst waere obige Behauptung nur Zufall (irgendeine
     Karte landet irgendwo). */
  const keinFalscherTausch = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    D._reset();
    D.setze("tuerme", 0, "fire");
    const r = D.setze("tuerme", 1, "water");
    return { getauscht: r.getauscht, tuerme: D.aktivesDeck().tuerme };
  });
  gegen("Tausch nur bei DERSELBEN Karte",
        keinFalscherTausch.getauscht !== true && keinFalscherTausch.tuerme[0] === "fire",
        JSON.stringify(keinFalscherTausch));

  /* ================================================================
   * 6. ENTFERNEN — "Platz leeren" ueber den echten Knopf
   * ================================================================ */
  const entfernen = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    D._reset();
    D.setze("tuerme", 2, "nature");
    window.__proto.openDeckPick("tuerme", 2);
    const knopfSichtbar = getComputedStyle(document.getElementById("deckPickClear")).display !== "none";
    window.__proto.dkLeerePlatz();
    return { knopfSichtbar, danach: D.aktivesDeck().tuerme[2] };
  });
  pruef("'Platz leeren' ist sichtbar, wenn der Platz belegt ist", entfernen.knopfSichtbar);
  pruef("nach 'Platz leeren' ist der Platz wirklich leer", entfernen.danach === null, entfernen.danach);
  const leererKnopfVersteckt = await p.evaluate(() => {
    window.__proto.openDeckPick("tuerme", 2);   // jetzt schon leer
    const versteckt = getComputedStyle(document.getElementById("deckPickClear")).display === "none";
    document.getElementById("deckPickDlg").classList.remove("open");   // Dialog nicht offen lassen
    return versteckt;
  });
  gegen("'Platz leeren' bei einem SCHON leeren Platz versteckt",
        leererKnopfVersteckt, "der Knopf war sichtbar, obwohl nichts zu leeren war");

  /* ================================================================
   * 7. DECKS WECHSELN — gesperrte bleiben gesperrt, freie nicht
   * ----------------------------------------------------------------
   * Ueber ECHTE Klicks auf die Knoepfe (nicht per API), damit die
   * Verdrahtung selbst Teil der Pruefung ist. */
  await p.evaluate(() => window.__proto.ArenaDeck()._reset());
  await p.evaluate(() => window.__proto.renderDeckBoard());
  const vorKlick = await p.evaluate(() => window.__proto.ArenaDeck().aktivIndex());
  await p.click("#dkSel [data-deck='2']");   // Deck 3, gesperrt
  await p.waitForTimeout(150);
  const nachGesperrtemKlick = await p.evaluate(() => window.__proto.ArenaDeck().aktivIndex());
  pruef("ein Klick auf ein GESPERRTES Deck aendert die Auswahl NICHT",
        nachGesperrtemKlick === vorKlick, vorKlick + " -> " + nachGesperrtemKlick);
  await p.click("#dkSel [data-deck='1']");   // Deck 2, frei
  await p.waitForTimeout(150);
  const nachFreiemKlick = await p.evaluate(() => window.__proto.ArenaDeck().aktivIndex());
  pruef("ein Klick auf ein FREIES Deck waehlt es aus", nachFreiemKlick === 1, nachFreiemKlick);
  gegen("Sperre wirkt wirklich unterschiedlich (frei vs. gesperrt)",
        nachGesperrtemKlick !== nachFreiemKlick,
        "beide Klicks hatten dieselbe Wirkung: " + nachGesperrtemKlick + " / " + nachFreiemKlick);
  const sperrIcons = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    return [...document.querySelectorAll("#dkSel .dkselbtn")].map((el, i) => ({
      i, frei: D.istFrei(i), hatSchloss: !!el.querySelector(".lock"),
    }));
  });
  pruef("jedes Deck zeigt ein Schloss GENAU DANN, wenn ArenaDeck.istFrei(i) es verneint",
        sperrIcons.every(s => s.hatSchloss === !s.frei), JSON.stringify(sperrIcons));

  /* ================================================================
   * 8. RELOAD-PERSISTENZ — der Zustand ueberlebt einen Neustart
   * ================================================================ */
  await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    D._reset();
    D.setze("held", 0, "solara");
    D.setze("tuerme", 0, "fire");
    D.setze("tuerme", 4, "earth");
    D.setze("spells", 1, "bann");
    D.waehle(1);
    D.setze("tuerme", 0, "water", 1);
  });
  await laden();
  const nachReload = await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    return { d0: D.deckAt(0), aktiv: D.aktivIndex(), d1turm0: D.deckAt(1).tuerme[0] };
  });
  pruef("Deck 1 (Held, zwei Tuerme, ein Spell) uebersteht den Reload",
        nachReload.d0.held === "solara" && nachReload.d0.tuerme[0] === "fire" &&
        nachReload.d0.tuerme[4] === "earth" && nachReload.d0.spells[1] === "bann",
        JSON.stringify(nachReload.d0));
  pruef("die aktive Deck-Auswahl uebersteht den Reload", nachReload.aktiv === 1, nachReload.aktiv);
  pruef("und Deck 2 haelt seinen EIGENEN Stand", nachReload.d1turm0 === "water", nachReload.d1turm0);

  /* ================================================================
   * 9. GEMESSENE PROZENTBREITEN (§24.2) — mit begruendeter Toleranz
   * ----------------------------------------------------------------
   * Toleranz 3 Prozentpunkte: unsere Views tragen ueberall 12 px
   * Randabstand (die Banner-Metrik-Leiter, siehe CSS-Kommentar bei
   * .dkboard), das Referenzbild hatte an dieser Stelle 18/14 px. Diese
   * Differenz verschiebt jede Spalte um einen kleinen, aber echten
   * Betrag — 3 Punkte fangen genau das ab, ohne "irgendwie passt das
   * schon" zu pruefen (README-Regel: keine Prüfung wird aufgeweicht,
   * um gruen zu werden — die Toleranz ist hier eine MASSEINHEIT, kein
   * Nachgeben). */
  await p.evaluate(() => {
    const D = window.__proto.ArenaDeck();
    D._reset();
    D.setze("tuerme", 0, "fire");
    D.setze("spells", 0, "splitter");
  });
  await p.evaluate(() => window.__proto.renderDeckBoard());
  const masse = await p.evaluate(() => {
    const stage = document.getElementById("viewCollection").getBoundingClientRect().width;
    const box = sel => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
    const held = box("#dkHeld"), turm = box("#dkTowers .dktower"), hex = box("#dkSpells .dkspell");
    return {
      stage: Math.round(stage),
      heldPct: +(held.width / stage * 100).toFixed(1),
      turmPct: +(turm.width / stage * 100).toFixed(1),
      hexPct: +(hex.width / stage * 100).toFixed(1),
      heldHoeheGleichTuerme: Math.abs(held.height - (turm.height * 2 + 8)) < 3,
    };
  });
  const TOL = 3;
  pruef("Held ~35,8 % der Buehnenbreite (§24.2)",
        Math.abs(masse.heldPct - 35.8) <= TOL, masse.heldPct + " %");
  pruef("Turmkarte ~17,2 % der Buehnenbreite",
        Math.abs(masse.turmPct - 17.2) <= TOL, masse.turmPct + " %");
  pruef("Spell-Sechseck ~12,6 % der Buehnenbreite",
        Math.abs(masse.hexPct - 12.6) <= TOL, masse.hexPct + " %");
  pruef("Heldenrahmen ist so hoch wie beide Turmreihen zusammen (§24.3)",
        masse.heldHoeheGleichTuerme, JSON.stringify(masse));
  /* Gegenprobe: die Toleranz ist kein Freifahrtschein — eine
     Breite, die WIRKLICH danebenliegt (die Haelfte des Sollwerts),
     muss durchfallen. */
  gegen("Toleranz deckt keine beliebige Abweichung",
        Math.abs(masse.heldPct - 35.8) <= TOL && !(Math.abs(17.9 - 35.8) <= TOL));

  /* ================================================================
   * 10. TREFFFLAECHEN — jeder Platz ist mit dem Daumen TREFFBAR
   * ================================================================ */
  const treffpunkte = {
    held: await treffbar("#dkHeld"),
    turm0: await treffbar('#dkTowers [data-pos="0"]'),
    turm5: await treffbar('#dkTowers [data-pos="5"]'),
    spell0: await treffbar('#dkSpells [data-pos="0"]'),
    spell1: await treffbar('#dkSpells [data-pos="1"]'),
    deck1: await treffbar('#dkSel [data-deck="0"]'),
    deck3gesperrt: await treffbar('#dkSel [data-deck="2"]'),
    menu: await treffbar("#dkMenu"),
    info: await treffbar("#dkInfo"),
  };
  Object.keys(treffpunkte).forEach(k => {
    const t = treffpunkte[k];
    pruef("Platz '" + k + "' existiert und hat eine Flaeche", t.da && t.breite > 0 && t.hoehe > 0,
          JSON.stringify(t));
    pruef("Platz '" + k + "' ist frei tippbar (elementFromPoint trifft ihn)", t.frei,
          k + ": " + t.tag);
  });

  /* ================================================================
   * 11. KEINE JS-FEHLER
   * ================================================================ */
  pruef("keine JS-Fehler auf der Seite", jsF.length === 0, jsF.slice(0, 3).join(" | "));

  console.log("\ndeck.js  " + ok + " ok, " + fehl + " fehlgeschlagen\n");
  await b.close();
  if (fehl) process.exitCode = 1;
})();
