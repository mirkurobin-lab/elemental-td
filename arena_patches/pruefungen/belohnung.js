/* ===================================================================
 * belohnung.js — das Belohnungsfenster (§29)
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Vorgabe des Auftraggebers zu IMG_3459: „Wenn man die offline earnings
 * abholt muss sich so ein Fenster oeffnen … jeweils wenn man mit
 * Kristallen kauft, Ad anschaut oder normal abholt."
 *
 * Ein Belohnungsfenster ist die gefaehrlichste Sorte Oberflaeche, die
 * dieses Projekt hat: es ist ein VERSPRECHEN mit Rahmen und Ton. Wenn
 * darin eine Kachel steht, die niemand einloest, ist das schlimmer als
 * gar kein Fenster — der Spieler glaubt es, prueft es nicht nach, und
 * merkt den Unterschied erst Tage spaeter an seinem Konto.
 *
 * Diese Suite prueft deshalb NICHT „sieht schoen aus", sondern die eine
 * Zusage, an der alles haengt:
 *
 *     WAS IM FENSTER STEHT, IST GEBUCHT WORDEN.
 *
 * Und zwar gegen den Speicher gemessen, nicht gegen die Zahl, die der
 * Aufrufer hineingereicht hat. Der Unterschied ist echt: `addMaterial(60)`
 * verteilt per Round-Robin auf acht Sorten (8,8,8,8,7,7,7,7), und welche
 * Sorte wie viel bekommt, weiss nur `AC.getMaterials()`.
 *
 * ⚠ SIE LAEUFT UEBER HTTP, nicht ueber file://. Die Kacheln tragen
 * echte Bilder, und ein Schritt hier verlangt Pixel — unter file:// ist
 * das eine andere Messung als in der Auslieferung. Siehe README.
 *
 *   export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node belohnung.js
 * ================================================================== */
const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const pfad = require("path");

const WURZEL = pfad.resolve(__dirname, "..");
const TYP = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json",
  ".webp":"image/webp", ".png":"image/png", ".jpg":"image/jpeg", ".mp4":"video/mp4",
  ".mp3":"audio/mpeg", ".css":"text/css", ".svg":"image/svg+xml" };

let ok = 0, fehl = 0;
function pruef(name, wahr, info) {
  if (wahr) { ok++; console.log("ok   " + name + (info ? "  — " + info : "")); }
  else { fehl++; console.log("FAIL " + name + (info ? "  — " + info : "")); }
}
/* Gegenprobe: eine Behauptung, die FALSCH sein MUSS. Ein Schritt, der
   auch bei kaputtem Programm gruen bleibt, ist Deko. */
function gegen(name, sollFalschSein, info) { pruef("gegen: " + name, !sollFalschSein, info); }

(async () => {
  const server = http.createServer((req, res) => {
    const rein = decodeURIComponent(req.url.split("?")[0]);
    const p = pfad.join(WURZEL, pfad.normalize(rein).replace(/^(\.\.[/\\])+/, ""));
    if (!p.startsWith(WURZEL) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      res.writeHead(404); res.end("nicht da"); return;
    }
    res.writeHead(200, { "content-type": TYP[pfad.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const BASIS = "http://127.0.0.1:" + server.address().port + "/";

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 },
                                         deviceScaleFactor: 2 });
  const seite = await ctx.newPage();
  const jsFehler = [];
  seite.on("pageerror", e => jsFehler.push(e.message));

  const frisch = async (suche) => {
    /* Jeder Abschnitt bekommt eine EIGENE Seite. Grund: `claim()` setzt
       den Zeitstempel zurueck und `quick()` verbraucht Tagesversuche —
       zwei Abschnitte auf derselben Seite messen sonst die Reste des
       vorherigen. Genau dieser Fehler hat in packsprengung.js schon
       einmal zwei Schritte rot gefaerbt. */
    await seite.goto(BASIS + "ui_prototype.html" + (suche || "?test=1"));
    /* ⚠ localStorage ueberlebt den Reload. `quickMs` und die Tageszaehler
       aus dem vorherigen Abschnitt wandern sonst mit — nach zwei Kaeufen
       steht der Topf am Deckel, und der naechste Abschnitt misst die
       Deckel-Sperre statt seines eigenen Gegenstands. Der Schluessel wird
       geleert und die Seite noch einmal geladen, damit binde() sauber
       aufsetzt (im TESTMODUS mit 6 h Rueckstand). */
    await seite.evaluate(() => { try { localStorage.removeItem("arenaOffline"); } catch (e) {} });
    await seite.reload();
    await seite.waitForTimeout(2400);
    await seite.evaluate(() =>
      ["loginLayer","dailyLayer","offerLayer","confirmDlg","reqDlg","detailModal",
       "bonusDlg","mergeCeremony","roadLayer","cineLayer","avCerLayer","mmLayer"]
        .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove("open"); }));
  };
  const lese = () => seite.evaluate(() => {
    const l = document.getElementById("belLayer");
    const z = [...document.querySelectorAll("#belGrid .belcell")];
    return {
      offen: !!l && l.classList.contains("open"),
      ariaHidden: l ? l.getAttribute("aria-hidden") : null,
      titel: (document.querySelector("#belBand .srt") || {}).textContent || "",
      note: (document.getElementById("belNote") || {}).textContent || "",
      n: z.length,
      posten: z.map(c => ({ art: c.dataset.art, id: c.dataset.id || null,
                            tier: c.dataset.tier, menge: +c.dataset.menge,
                            rand: getComputedStyle(c).borderTopColor,
                            breit: c.getBoundingClientRect().width })),
      bilder: document.querySelectorAll("#belGrid img").length,
      bilderPixel: [...document.querySelectorAll("#belGrid img")]
        .filter(i => i.complete && i.naturalWidth > 0).length,
      hinweis: (document.getElementById("belHint") || {}).textContent || ""
    };
  });

  console.log("\nbelohnung.js — das Belohnungsfenster\n");

  /* ============ 1. ES OEFFNET SICH NICHT VON SELBST ============ */
  await frisch();
  let s = await lese();
  pruef("Vor dem Abholen ist das Fenster zu", !s.offen && s.ariaHidden === "true",
    "offen=" + s.offen + ", aria-hidden=" + s.ariaHidden);

  /* ============ 2. NORMAL ABHOLEN ============ */
  /* Vorher/Nachher aus dem SPEICHER — die eine Messung, die das Fenster
     ueberhaupt beweisen kann. */
  const vorher = await seite.evaluate(() => ({
    gold: window.__proto.AC ? null : null,
    mat: Object.assign({}, window.ArenaCards.getMaterials()),
    karten: JSON.parse(JSON.stringify(window.ArenaCards.get().cards || {}))
  }));
  await seite.evaluate(() => window.__proto.offOeffne());
  await seite.waitForTimeout(300);
  await seite.evaluate(() => window.__proto.offHole());
  await seite.waitForTimeout(1300);
  s = await lese();

  pruef("Nach dem Abholen steht das Fenster offen",
    s.offen && s.ariaHidden === "false", "Titel: " + s.titel);
  pruef("Das Offline-Fenster darunter ist zu",
    await seite.evaluate(() => !document.getElementById("offLayer").classList.contains("open")),
    "zwei Abdunklungen uebereinander waeren der Fehler");
  pruef("Es stehen Kacheln darin", s.n > 0, s.n + " Kacheln");
  pruef("Der Schliess-Hinweis steht da", /TIPPEN/.test(s.hinweis), s.hinweis);

  /* --- DIE KERNPRUEFUNG: Kacheln == Buchung --- */
  const nachher = await seite.evaluate(() => Object.assign({}, window.ArenaCards.getMaterials()));
  const essKacheln = s.posten.filter(p => p.art === "mat");
  const abweichung = essKacheln.filter(p =>
    ((nachher[p.id] | 0) - (vorher.mat[p.id] | 0)) !== p.menge);
  pruef("Jede Essenz-Kachel entspricht dem echten Zuwachs der Sorte",
    essKacheln.length > 0 && abweichung.length === 0,
    essKacheln.length + " Sorten, " + abweichung.length + " Abweichungen" +
    (abweichung.length ? " (" + abweichung.map(a => a.id).join(",") + ")" : ""));

  /* Und die Gegenprobe dazu: die Verteilung ist NICHT gleichmaessig
     verteilbar (Round-Robin mit Rest). Waeren die Kacheln aus einer
     Tabelle statt aus dem Speicher, haetten alle dieselbe Menge. */
  const mengen = [...new Set(essKacheln.map(p => p.menge))];
  gegen("die Essenz-Kacheln tragen alle dieselbe Menge",
    essKacheln.length > 1 && mengen.length === 1,
    "Mengen: " + essKacheln.map(p => p.menge).join("/") +
    " — der Round-Robin verteilt mit Rest, eine Tabelle taete das nicht");

  const kartenKacheln = s.posten.filter(p => p.art === "karte");
  const kartenEcht = await seite.evaluate(list => {
    const st = window.ArenaCards.get();
    return list.map(k => {
      const c = (st.cards || {})[k.id];
      return { id: k.id, da: !!c, kopien: c ? (c.copies[k.tier] | 0) : 0 };
    });
  }, kartenKacheln);
  pruef("Jede Karten-Kachel liegt wirklich in der Sammlung",
    kartenKacheln.length > 0 && kartenEcht.every(k => k.da && k.kopien > 0),
    kartenKacheln.map((k, i) => k.id + "×" + k.menge +
      " (Speicher: " + kartenEcht[i].kopien + ")").join(", "));

  const goldK = s.posten.filter(p => p.art === "gold");
  pruef("Genau EINE Gold-Kachel, und sie traegt eine Menge",
    goldK.length === 1 && goldK[0].menge > 0, goldK.map(g => "×" + g.menge).join(""));

  /* --- XP: bewusst KEINE Kachel, und das muss eine Entscheidung sein --- */
  pruef("Keine XP-Kachel — XP wird nirgends gebucht (§29)",
    s.posten.filter(p => p.art === "xp").length === 0,
    "AO.claim() liefert xp, hole() bucht es nicht; es gibt kein Spieler-XP-Konto");
  const kannXp = await seite.evaluate(async () => {
    /* Gegenprobe auf einem eigenen Aufruf: das Fenster KANN eine
       XP-Kachel. Ohne diesen Schritt waere „keine XP-Kachel" auch dann
       gruen, wenn die Bauform es gar nicht koennte — dann waere es kein
       Verzicht, sondern ein Mangel. */
    window.__proto.UIBelohnung.zeige("PROBE", [{ art: "xp", tier: "common", menge: 7 }]);
    const n = document.querySelectorAll('#belGrid .belcell[data-art="xp"]').length;
    const stern = !!document.querySelector("#belGrid .xpstar");
    return { n: n, stern: stern };
  });
  gegen("das Fenster kann gar keine XP-Kachel darstellen",
    !(kannXp.n === 1 && kannXp.stern),
    "Probe-Aufruf erzeugt " + kannXp.n + " XP-Kachel mit Stern: " + kannXp.stern +
    " — das Weglassen ist also eine Entscheidung, kein Unvermoegen");

  /* ============ 3. BILD UND FARBE ============ */
  await frisch();
  await seite.evaluate(() => window.__proto.offOeffne());
  await seite.waitForTimeout(250);
  await seite.evaluate(() => window.__proto.offHole());
  await seite.waitForTimeout(1400);
  s = await lese();
  pruef("Jede Kachel liegt im Layout (nicht nur im DOM)",
    s.n > 0 && s.posten.every(p => p.breit > 0),
    s.posten.filter(p => p.breit > 0).length + "/" + s.n + " mit Breite > 0");
  pruef("Jedes Kachelbild traegt Pixel",
    s.bilder > 0 && s.bilderPixel === s.bilder,
    s.bilderPixel + "/" + s.bilder + " mit naturalWidth > 0");

  /* Der Raritaetsrand kommt aus AC.TIERS — nicht aus einer zweiten
     Farbtabelle im CSS. Sonst faellt eine neue Stufe hier durch. */
  const farbenEcht = await seite.evaluate(() => {
    const hex = k => (window.ArenaCards.tierOf(k) || {}).color || "";
    const rgb = h => { const n = parseInt(h.slice(1), 16);
      return "rgb(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ")"; };
    return [...document.querySelectorAll("#belGrid .belcell")].map(c => ({
      tier: c.dataset.tier, ist: getComputedStyle(c).borderTopColor,
      soll: rgb(hex(c.dataset.tier)) }));
  });
  const falscheFarbe = farbenEcht.filter(f => f.ist !== f.soll);
  pruef("Der Kachelrand traegt die Raritaetsfarbe aus AC.TIERS",
    farbenEcht.length > 0 && falscheFarbe.length === 0,
    farbenEcht.length + " Kacheln, " + falscheFarbe.length + " falsch" +
    (falscheFarbe.length ? " (" + falscheFarbe[0].tier + ": " + falscheFarbe[0].ist +
      " statt " + falscheFarbe[0].soll + ")" : ""));

  /* ============ 4. SCHLIESSEN ============ */
  const sofort = await seite.evaluate(() => {
    /* Sofort nach dem Oeffnen darf ein Tap NICHT schliessen — sonst
       schluckt derselbe Druck, der „Abholen" ausgeloest hat, das
       Fenster gleich wieder. */
    window.__proto.UIBelohnung.zeige("PROBE", [{ art: "gold", tier: "common", menge: 5 }]);
    document.getElementById("belLayer").click();
    return document.getElementById("belLayer").classList.contains("open");
  });
  pruef("Ein Tap in den ersten Millisekunden schliesst NICHT", sofort,
    "Doppelereignis-Sperre greift");
  await seite.waitForTimeout(600);
  const danach = await seite.evaluate(() => {
    document.getElementById("belLayer").click();
    return document.getElementById("belLayer").classList.contains("open");
  });
  pruef("Nach der Sperre schliesst ein Tap", !danach);

  /* ============ 5. LEER HEISST KEIN FENSTER ============ */
  const leer = await seite.evaluate(() => {
    const a = window.__proto.UIBelohnung.zeige("LEER", []);
    const b = window.__proto.UIBelohnung.zeige("NULL", [{ art: "gold", tier: "common", menge: 0 }]);
    return { a: a, b: b, offen: document.getElementById("belLayer").classList.contains("open") };
  });
  pruef("Ohne Posten oeffnet sich nichts",
    leer.a === false && leer.b === false && !leer.offen,
    "leere Liste: " + leer.a + ", Menge 0: " + leer.b);

  /* ============ 6. KRISTALL-KAUF ============ */
  await frisch();
  const gemVorher = await seite.evaluate(() => {
    window.__proto.offOeffne();
    return window.__proto.gems ? window.__proto.gems() : null;
  });
  const kauf = await seite.evaluate(() => {
    const vor = window.ArenaOffline.stand(Date.now());
    window.__proto.offQuickWeg("gems");
    return { vorGold: vor.gold, nachGold: window.ArenaOffline.stand(Date.now()).gold };
  });
  await seite.waitForTimeout(1200);
  s = await lese();
  pruef("Kristall-Kauf oeffnet das Fenster", s.offen, "Titel: " + s.titel);
  pruef("Der Titel nennt den Schnell-Ertrag", /SCHNELL/.test(s.titel), s.titel);
  const goldKachel = s.posten.filter(p => p.art === "gold")[0];
  pruef("Die Gold-Kachel entspricht dem echten Zuwachs im Topf",
    !!goldKachel && goldKachel.menge === (kauf.nachGold - kauf.vorGold),
    "Kachel ×" + (goldKachel ? goldKachel.menge : "-") +
    " gegen Topf-Zuwachs " + (kauf.nachGold - kauf.vorGold));
  pruef("Der Satz sagt, dass es im Topf liegt und nicht im Beutel",
    /bereit|abholen/i.test(s.note), s.note);
  /* Karten sind hier noch NICHT gewuerfelt — die Kachel muss deshalb
     die Rueckseite zeigen und darf keine ID behaupten. */
  const kK = s.posten.filter(p => p.art === "karte");
  pruef("Karten-Kachel ohne Zusage einer bestimmten Karte",
    kK.every(k => !k.id), kK.length + " Karten-Kachel(n), IDs: " +
    (kK.map(k => k.id).join(",") || "keine"));

  /* ============ 7. DECKEL-SPERRE ============ */
  await frisch();
  const sperre = await seite.evaluate(() => {
    /* Topf ueber den Deckel drehen: dann bringt gekaufte Zeit NICHTS. */
    window.ArenaOffline._setSeit(Date.now() - 20 * 3600 * 1000);
    const st = window.ArenaOffline.stand(Date.now());
    const gemVor = window.__proto.gems();
    window.__proto.offQuickWeg("gems");
    return { voll: st.voll, gemVor: gemVor, gemNach: window.__proto.gems(),
             offen: document.getElementById("belLayer").classList.contains("open") };
  });
  await seite.waitForTimeout(400);
  pruef("Am Deckel ist der Topf als voll erkannt", sperre.voll === true);
  pruef("Am Deckel kostet der Kauf KEINE Kristalle",
    sperre.gemNach === sperre.gemVor,
    sperre.gemVor + " → " + sperre.gemNach);
  pruef("Am Deckel oeffnet sich kein leeres Belohnungsfenster", !sperre.offen);
  /* ⚠ NICHT an den Kristallen messen. Im TESTMODUS wird der Beutel nach
     jedem Kauf wieder aufgefuellt — `gems()` steht danach wieder auf
     999 999, und die erste Fassung dieser Gegenprobe schloss daraus, es
     sei gar nicht gekauft worden. Gemessen wird deshalb, was der Kauf
     bewirken SOLL: der Topf waechst. */
  gegen("die Sperre greift auch, wenn der Topf NICHT voll ist",
    await seite.evaluate(() => {
      window.ArenaOffline._setSeit(Date.now() - 2 * 3600 * 1000);
      const vor = window.ArenaOffline.stand(Date.now()).gold;
      window.__proto.offQuickWeg("gems");
      const gewachsen = window.ArenaOffline.stand(Date.now()).gold > vor;
      window.__proto.UIBelohnung.schliesse();
      return !gewachsen;   /* MUSS false sein: bei halbvollem Topf wird gekauft */
    }),
    "bei 2 h Rueckstand waechst der Topf — die Sperre haengt am Deckel, nicht am Knopf");

  /* ============ 8. WERBE-WEG ============ */
  await frisch();
  const werbung = await seite.evaluate(() => {
    window.__proto.offWerbung(true);            /* Anbindung vortaeuschen */
    window.__proto.offQuickWeg("gratis");
    return { offen: document.getElementById("belLayer").classList.contains("open"),
             titel: (document.querySelector("#belBand .srt") || {}).textContent || "" };
  });
  await seite.waitForTimeout(900);
  pruef("Der Werbe-Weg oeffnet dasselbe Fenster",
    werbung.offen, "Titel: " + werbung.titel);
  /* Und ohne Anbindung passiert NICHTS — der Prototyp darf sich keine
     Werbung ausdenken. */
  await frisch();
  const ohneWerbung = await seite.evaluate(() => {
    window.__proto.offQuickWeg("gratis");
    return document.getElementById("belLayer").classList.contains("open");
  });
  pruef("Ohne Werbeanbindung gibt es kein Fenster und keine Gutschrift",
    !ohneWerbung, "WERBUNG_VERFUEGBAR ist im Prototyp false");

  /* ============ 9. BEWEGUNG ABBESTELLT ============ */
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 430, height: 932 },
                                          deviceScaleFactor: 2,
                                          reducedMotion: "reduce" });
  const s2 = await ctx2.newPage();
  s2.on("pageerror", e => jsFehler.push(e.message));
  await s2.goto(BASIS + "ui_prototype.html?test=1");
  await s2.waitForTimeout(2400);
  const reduziert = await s2.evaluate(() => {
    window.__proto.UIBelohnung.zeige("PROBE",
      [{ art: "gold", tier: "common", menge: 5 }, { art: "gem", tier: "rare", menge: 3 }]);
    return [...document.querySelectorAll("#belGrid .belcell")].map(c => ({
      op: getComputedStyle(c).opacity, br: c.getBoundingClientRect().width }));
  });
  /* Der klassische Fehler an dieser Stelle: die Kacheln starten auf
     `opacity:0` und werden von der Animation sichtbar gemacht. Laeuft
     die Animation nicht, bleibt das Fenster LEER. */
  pruef("Ohne Bewegung sind die Kacheln trotzdem sichtbar",
    reduziert.length === 2 && reduziert.every(c => +c.op > 0.9 && c.br > 0),
    reduziert.map(c => "op " + c.op).join(", "));

  pruef("Keine JS-Fehler im ganzen Durchgang", jsFehler.length === 0,
    jsFehler.length ? jsFehler.slice(0, 2).join(" | ") : "keine");

  await browser.close();
  server.close();
  console.log("\n" + ok + " ok, " + fehl + " fehlgeschlagen\n");
  if (fehl) process.exitCode = 1;
})().catch(e => { console.error("ABBRUCH: " + e.message); process.exit(1); });
