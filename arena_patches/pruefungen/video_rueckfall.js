/* ===================================================================
 * video_rueckfall.js — ein fehlschlagendes Video darf nicht das Aus sein
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * Meldung des Auftraggebers (30.07.2026): „Im battledeck sind die Tower
 * und Helden nicht animiert, zuvor waren sie es wieso nicht?"
 *
 * Die Untersuchung ergab ZWEI getrennte Dinge, und nur eines davon war
 * ein Fehler:
 *
 *   (1) Im Kachelraster des Decks lief NIE ein Video. `attachLoop()`
 *       wird dort nicht aufgerufen — das war Absicht und steht so im
 *       Quelltext („nicht in jeder 60-px-Kachel"). Bewegt haben sich
 *       Detailkarte, Pack-Enthuellung und Heldenbuehne.
 *   (2) Der Rueckfall fehlte: bei einem Fehler wurde das Video sofort
 *       und endgueltig versteckt. Seit die Assets aus dem Repo statt
 *       vom CDN kommen, ist das der Unterschied zwischen „laeuft" und
 *       „laeuft nie mehr" — aus Gruenden, die nichts mit der Datei zu
 *       tun haben: mehrere mobile Browser verweigern Video aus
 *       relativen Pfaden, wenn die Seite als file:// geoeffnet wird,
 *       waehrend Bilder anstandslos laden.
 *
 * ⚠ WAS HIER NICHT GEPRUEFT WERDEN KANN, und warum das so bleibt:
 * Der Chromium dieser Umgebung hat KEIN H.264
 * (canPlayType('video/mp4; codecs="avc1.42E01E"') === ""). Ein
 * abspielender Loop ist hier grundsaetzlich nicht herstellbar — jede
 * Pruefung, die „das Video laeuft" behauptet, waere hier eine Luege.
 * Geprueft wird deshalb genau das, was messbar UND kaputt war: dass bei
 * einem Fehlschlag auf die Originalquelle umgeschaltet wird.
 *
 * Der Server liefert jede .mp4 mit 404 aus und laesst alles andere
 * durch. Das ist die kleinste Nachbildung des gemeldeten Zustands:
 * Bilder da, Video nicht.
 *
 *   export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node video_rueckfall.js
 * ================================================================== */
const { chromium } = require("playwright-core");
const http = require("http"), fs = require("fs"), path = require("path");

const WURZEL = path.resolve(__dirname, "..");
const TYP = { ".html": "text/html", ".js": "text/javascript", ".webp": "image/webp",
  ".png": "image/png", ".json": "application/json", ".mp3": "audio/mpeg",
  ".mp4": "video/mp4", ".webm": "video/webm", ".jpg": "image/jpeg" };

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; console.log("  ok   " + n + (z ? "  — " + z : "")); }
  else { fehl++; console.log("  FEHL " + n + (z ? "  — " + z : "")); }
};
const gegen = (n, erkannt, z) => {
  if (erkannt) { ok++; console.log("  ok   gegen: " + n + (z ? "  — " + z : "")); }
  else { fehl++; console.log("  GEGENPROBE BLIND: " + n + (z ? "  — " + z : "")); }
};

/* mp4Kaputt=true → jede .mp4 bekommt 404, alles andere wird normal
   ausgeliefert. */
function server(mp4Kaputt) {
  return new Promise((fertig) => {
    const s = http.createServer((q, r) => {
      const rel = decodeURIComponent(q.url.split("?")[0]);
      if (mp4Kaputt && /\.mp4$/.test(rel)) { r.writeHead(404); return r.end(); }
      fs.readFile(path.join(WURZEL, rel), (e, d) => e ? (r.writeHead(404), r.end())
        : (r.writeHead(200, { "Content-Type": TYP[path.extname(rel)] ||
            "application/octet-stream" }), r.end(d)));
    }).listen(0, "127.0.0.1");
    s.on("listening", () => fertig(s));
  });
}

/* Detailkarte eines Turms oeffnen und das Loop-Video zurueckgeben. */
async function loopHolen(seite) {
  await seite.evaluate(() => {
    ["loginLayer", "dailyLayer", "offerLayer", "confirmDlg", "reqDlg", "detailModal",
     "bonusDlg", "mergeCeremony", "roadLayer", "cineLayer", "avCerLayer", "mmLayer"]
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove("open"); });
    window.__proto.show("navCollection");
  });
  await seite.waitForTimeout(700);
  await seite.evaluate(() => {
    const k = document.querySelector("#collGrid > *"); if (k) k.click();
  });
  await seite.waitForTimeout(2500);
  return seite.evaluate(() => {
    const v = document.querySelector("#dArt video.cvid");
    if (!v) return null;
    return { src: v.src, aufCDN: /^https?:/.test(v.src) && !/127\.0\.0\.1/.test(v.src),
             fehlercode: v.error ? v.error.code : null };
  });
}

(async () => {
  console.log("\nvideo_rueckfall.js — ein fehlschlagendes Video darf nicht das Aus sein\n");
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

  /* Zuerst schwarz auf weiss festhalten, dass dieser Browser die Loops
     ueberhaupt nicht abspielen KANN. Ohne diese Zeile liest jemand
     spaeter „Video versteckt" und haelt es fuer einen Produktfehler. */
  const probe = await browser.newPage();
  const codec = await probe.evaluate(() => {
    const v = document.createElement("video");
    return { h264: v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
             webm: v.canPlayType('video/webm; codecs="vp9"') };
  });
  await probe.close();
  console.log("     Codec-Lage dieses Browsers: H.264 „" + codec.h264 + "\", WebM „" +
    codec.webm + "\" → ein laufender Loop ist hier nicht herstellbar.\n");

  /* ---- 1. DIE LOKALE QUELLE WIRD ZUERST VERSUCHT ----
     ⚠ NICHT pruefen „am Ende steht die lokale Quelle da". Genau das
     stand hier zuerst und war rot — zu Recht: in einem Browser ohne
     H.264 scheitert auch die einwandfrei ausgelieferte Datei, der
     Rueckfall greift und die Quelle steht am Ende auf dem CDN. Das ist
     das gewuenschte Verhalten, nicht der Fehler.
     Messbar und aussagekraeftig ist die REIHENFOLGE: die erste
     Videoanfrage muss an den lokalen Server gehen. Waere es umgekehrt,
     laege das Repo brach und jedes Geraet zoege am Netz. */
  let srv = await server(false);
  let seite = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const anfragen = [];
  seite.on("request", q => { if (/\.mp4/.test(q.url())) anfragen.push(q.url()); });
  await seite.goto("http://127.0.0.1:" + srv.address().port + "/ui_prototype.html");
  await seite.waitForTimeout(2600);
  const gut = await loopHolen(seite);
  pruef("die Detailkarte legt ueberhaupt ein Loop-Video an",
    !!gut, gut ? gut.src.split("/").pop() : "kein video.cvid im #dArt");
  pruef("die ERSTE Videoanfrage geht an die lokale Quelle, nicht ans Netz",
    anfragen.length > 0 && /127\.0\.0\.1/.test(anfragen[0]),
    anfragen.length
      ? anfragen.length + " Anfrage(n), zuerst: " +
        anfragen[0].replace(/^https?:\/\//, "").slice(0, 46) + "…"
      : "keine einzige mp4-Anfrage");
  await seite.close(); srv.close();

  /* ---- 2. KAPUTTER FALL: es muss auf die Originalquelle wechseln ---- */
  srv = await server(true);
  seite = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await seite.goto("http://127.0.0.1:" + srv.address().port + "/ui_prototype.html");
  await seite.waitForTimeout(2600);
  const kaputt = await loopHolen(seite);
  pruef("scheitert die lokale Datei, wird auf die Originalquelle gewechselt",
    !!kaputt && kaputt.aufCDN,
    !kaputt ? "kein Video angelegt"
      : (kaputt.aufCDN ? "gewechselt auf " + kaputt.src.slice(0, 52) + "…"
                       : "blieb bei " + kaputt.src + " — kein Rueckfall"));

  /* Gegenprobe: der Aufbau muss den kaputten Zustand auch WIRKLICH
     herstellen. Liefert der Server die mp4 in Wahrheit aus, prueft
     Schritt 2 gar nichts. */
  const antwort = await seite.evaluate(async (p) => {
    try { const r = await fetch("http://127.0.0.1:" + p + "/assets/loop_dawn.mp4");
          return r.status; } catch (e) { return -1; }
  }, srv.address().port);
  gegen("der Aufbau liefert die lokale mp4 tatsaechlich nicht aus",
    antwort === 404, "GET assets/loop_dawn.mp4 → " + antwort);

  /* Und: ASSETS_CDN muss die Originaladressen ueberhaupt fuehren —
     ohne sie waere der Rueckfall eine leere Geste. */
  const vorrat = await seite.evaluate(() => {
    const P = window.__proto;
    if (!P || !P.ASSETS_CDN) return null;
    const k = Object.keys(P.CARD_LOOP || {}).map(i => P.CARD_LOOP[i]);
    return { gefuehrt: k.filter(x => !!P.ASSETS_CDN[x]).length, gesamt: k.length };
  });
  pruef("ASSETS_CDN fuehrt die Originaladresse jedes Loops",
    !!vorrat && vorrat.gefuehrt === vorrat.gesamt && vorrat.gesamt > 0,
    vorrat ? vorrat.gefuehrt + " von " + vorrat.gesamt : "ASSETS_CDN/CARD_LOOP nicht exportiert");

  await seite.close(); srv.close();

  /* ==================================================================
   * DER VERSCHMELZUNGS-EFFEKT DARF DIE ZEREMONIE NICHT ERSETZEN
   * ------------------------------------------------------------------
   * Vorgabe (30.07.2026): das Effektvideo aus Kling v3.0 bringt den Ton
   * mit, den die Zeremonie bisher nicht hatte. Es ist aber ZUGABE: die
   * CSS-Choreografie (drei kreisende Kopien, Umschlag, Werttafel) muss
   * unveraendert laufen, auch wenn das Video nicht kommt.
   *
   * Das ist hier keine theoretische Absicherung. Die Datei liegt zwar
   * seit dem 30.07.2026 im Repo (assets/merge_fx.mp4), aber dieser
   * Chromium hat kein H.264 — sie wird geladen und dann verworfen. Der
   * Fall „Effekt kommt nicht" ist damit der REGELFALL der Pruefung,
   * nicht ein herbeigefuehrter Sonderfall, und genau deshalb
   * aussagekraeftig: gemessen wird, dass die Zeremonie ihn nicht
   * braucht.
   *
   * ⚠ Geprueft wird NICHT „das Video laeuft" (H.264 fehlt hier ohnehin),
   * sondern: die Zeremonie oeffnet, kreist, schlaegt um — und der Ton
   * faellt auf den synthetischen Blip zurueck, weil CER.fxTon false
   * bleibt. Doppelter Ton waere der eigentliche Fehler.
   * ================================================================== */
  srv = await server(false);
  seite = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const jsFehler = [];
  seite.on("pageerror", e => jsFehler.push(e.message));
  await seite.goto("http://127.0.0.1:" + srv.address().port + "/ui_prototype.html");
  await seite.waitForTimeout(2600);
  await seite.evaluate(() => {
    ["loginLayer", "dailyLayer", "offerLayer", "confirmDlg", "reqDlg", "detailModal",
     "bonusDlg", "mergeCeremony", "roadLayer", "cineLayer", "avCerLayer", "mmLayer"]
      .forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove("open"); });
    window.__proto.show("navCollection");
  });
  await seite.waitForTimeout(600);
  await seite.click("#btnToForge");
  await seite.waitForTimeout(500);

  /* Die Blips abfangen, statt sie zu hoeren: so laesst sich messen, ob
     genau EIN Belohnungsgeraeusch ausgeloest wurde. */
  await seite.evaluate(() => {
    window.__blips = [];
    ["reward", "legend"].forEach(n => {
      const alt = window.UISfx[n];
      window.UISfx[n] = function () { window.__blips.push(n); return alt.apply(this, arguments); };
    });
  });
  /* Drei Kopien derselben Karte waehlen — vorher ist VERSCHMELZEN
     deaktiviert. Genau so macht es run_v5.js; die Auswahl ist Teil des
     Aufbaus, nicht der Messung. */
  const kand = await seite.locator("#forgeGrid .tile").evaluateAll(els => {
    for (const e of els) {
      const c = parseInt((e.querySelector(".cnt") || {}).textContent
        ?.replace("×", "") || "0", 10);
      if (c >= 3) return { id: e.dataset.id, tier: e.dataset.tier };
    }
    return null;
  });
  if (kand) {
    const sel = `#forgeGrid .tile[data-id="${kand.id}"][data-tier="${kand.tier}"]`;
    for (let i = 0; i < 3; i++) { await seite.click(sel); await seite.waitForTimeout(90); }
  }
  const knopf = kand &&
    await seite.locator("#btnMerge").evaluate(b => !b.disabled).catch(() => false);
  if (!knopf) {
    pruef("drei Kopien lassen sich zum Verschmelzen waehlen", false,
      kand ? "#btnMerge blieb deaktiviert" : "keine Karte mit 3+ Kopien in der Schmiede");
  } else {
    await seite.click("#btnMerge");
    /* ⚠ 2200 ms, nicht 900. Der Blip faellt in `enthuellen()`, und das
       ist laut Choreografie erst bei ~1260 ms (Auftakt 280, Kreisen bis
       1130, Einsaugen bis 1260). Mit 900 ms war der Schritt rot und die
       Gegenprobe zugleich blind — beide haben nur zu frueh geschaut.
       Ein Messfehler, der wie ein stummes Spiel aussah. */
    await seite.waitForTimeout(2200);
    const z = await seite.evaluate(() => {
      const v = document.getElementById("cerFx");
      const st = v ? getComputedStyle(v) : null;
      return {
        offen: document.getElementById("mergeCeremony").classList.contains("open"),
        fxDa: !!v,
        blend: st ? st.mixBlendMode : null,
        zIndex: st ? st.zIndex : null,
        klickdurch: st ? st.pointerEvents : null,
        blips: window.__blips.slice(),
      };
    });
    pruef("die Zeremonie oeffnet auch ohne das Effektvideo",
      z.offen, z.offen ? "offen" : "blieb zu — das Video haette sie blockiert");
    pruef("der Effekt liegt als Lichtplatte darueber (screen), nicht als schwarzer Kasten",
      z.fxDa && z.blend === "screen",
      z.fxDa ? "mix-blend-mode: " + z.blend : "#cerFx fehlt");
    pruef("der Effekt faengt keine Klicks ab",
      z.klickdurch === "none", "pointer-events: " + z.klickdurch);
    /* Der Kern: ohne hoerbares Video MUSS der Blip kommen — und zwar
       genau einmal. Kaeme er zusaetzlich zum Videoton, laegen zwei
       Belohnungsgeraeusche uebereinander. */
    pruef("ohne hoerbares Video springt genau EIN synthetischer Ton ein",
      z.blips.length === 1,
      z.blips.length + " Blip(s): " + (z.blips.join(", ") || "keiner"));

    /* Gegenprobe: die Unterdrueckung muss ueberhaupt greifen koennen.
       Mit gesetztem CER.fxTon darf KEIN Blip mehr kommen — sonst ist die
       Bedingung wirkungslos und der Doppelton kaeme im Ernstfall doch. */
    const ohne = await seite.evaluate(async () => {
      window.__blips.length = 0;
      const P = window.__proto;
      if (!P.CER) return null;
      P.CER.fxTon = true;
      document.getElementById("mergeCeremony").classList.remove("open");
      try { P.doMerge("fire"); } catch (e) { /* Vorrat evtl. leer */ }
      await new Promise(r => setTimeout(r, 2200));   // wie oben: nach der Enthuellung
      const n = window.__blips.length;
      P.CER.fxTon = false;
      return n;
    });
    gegen("bei hoerbarem Video bleibt der synthetische Ton aus",
      ohne === 0,
      ohne === null ? "CER nicht exportiert — Unterdrueckung nicht pruefbar"
        : ohne + " Blip(s) trotz CER.fxTon");
  }
  pruef("keine JS-Fehler", jsFehler.length === 0,
    jsFehler.length ? jsFehler.slice(0, 2).join(" | ") : "keine");

  await seite.close(); srv.close();
  await browser.close();
  console.log("\n" + ok + " ok, " + fehl + " fehlgeschlagen\n");
  if (fehl) process.exitCode = 1;
})().catch(e => { console.error("ABBRUCH: " + e.message); process.exit(1); });
