/* ===================================================================
 * offline.js — Offline-Ertraege, die Bruecke zwischen Modul und Bild.
 *
 * WARUM ES DIESE PRUEFUNG GIBT
 * ----------------------------
 * `arena_offline.js` bringt 41 eigene Schritte mit. Die pruefen die
 * RECHNUNG: Deckel, Stufen, Tageszaehler, kaputte Staende. Kein
 * einziger davon haette gemerkt, wenn der Dialog die Zahlen gar nicht
 * anzeigt — oder eine andere Zahl anzeigt als die, die spaeter gebucht
 * wird. Genau diese Fuge pruefen wir hier, im Browser.
 *
 * DER LEITSATZ: NICHTS EINFRIEREN
 * Es steht hier fast keine feste Zahl. Ein Schritt wie
 * „Gold-Rate zeigt 1 100/h" waere am Tag der ersten Balance-Aenderung
 * rot, ohne dass irgendetwas kaputt ist — und er wuerde still gruen
 * bleiben, wenn der Dialog die Rate aus einer ZWEITEN, veralteten
 * Quelle liest. Beides ist wertlos. Gefragt wird deshalb immer:
 * stimmt das, was im DOM steht, mit dem ueberein, was ArenaOffline
 * fuer denselben Zeitpunkt ausrechnet? Diese Frage ueberlebt jede
 * Balance-Aenderung und faellt bei jeder echten Entkopplung um.
 *
 * WAS HIER ALS FEHLER GEFUNDEN WURDE (30.07.2026)
 *   1. Das Kartenfeld zeigte ein LEERES WEISSES KAESTCHEN. Der
 *      Rueckfall stand auf 🂠 (U+1F0A0) — ein Zeichen ohne Schnitt in
 *      der Container-Schrift. Jede Messung war gruen, das Feld war
 *      trotzdem blank. Seitdem prueft Schritt 6 fuer JEDEN Rueckfall
 *      im Raster, dass er eine Flaeche hat. Gefunden nur durch
 *      ANSEHEN des Screenshots, nicht durch Messen — dieselbe Lehre
 *      wie bei der unsichtbaren `.pkcard`, siehe README.
 *   2. Zwei ✕ uebereinander, sobald der Schnell-Ertrag offen war.
 *      Schritt 8 zaehlt sie jetzt.
 *
 * WAS SIE NICHT KANN
 * Ob die Zahlen FAIR sind — das ist eine Design-Frage, sie steht in
 * GAMEPLAY_OPTIMIERUNG §10. Und ob das Video schoen ist: oertlich ist
 * das CDN nicht erreichbar (DESIGNSYSTEM §7b), im Kopf bleibt der
 * Poster-Rueckfall. Geprueft wird, DASS ein Video eingehaengt ist.
 *
 * AUFRUF
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node offline.js
 * =================================================================== */
const { chromium } = require("playwright-core");

const DATEI = "file:///home/user/elemental-td/arena_patches/ui_prototype.html";
const H = 3600 * 1000;

let ok = 0, fehl = 0;
const pruef = (n, w, z) => {
  if (w) { ok++; } else { fehl++; console.log("  FEHL " + n + (z !== undefined ? "  ->  " + z : "")); }
};
/* Gegenprobe: die Regel wird absichtlich gebrochen, die Messung MUSS
   das melden. Ein Schritt ohne Gegenprobe kann gruen sein, weil er
   nichts misst — das faellt sonst nie auf. */
const gegen = (n, gebrochenErkannt, z) => {
  if (gebrochenErkannt) { ok++; }
  else { fehl++; console.log("  FEHL Gegenprobe " + n + " haette rot sein muessen" + (z !== undefined ? "  ->  " + z : "")); }
};

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const jsF = [];
  p.on("pageerror", e => jsF.push(String(e).slice(0, 160)));
  await p.goto(DATEI, { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2000);

  /* Startpopups aus dem Weg. Sie gehoeren nicht zu dieser Pruefung,
     verdecken aber die Leiste. */
  await p.evaluate(() => {
    ["loginLayer", "dailyLayer", "offerLayer", "cineLayer", "avCerLayer", "splashLayer"]
      .forEach(i => { const e = document.getElementById(i); if (e) e.classList.remove("open"); });
  });

  /* Hilfsfunktion: Uhr um `h` Stunden zurueckdrehen und neu zeichnen. */
  const stelle = h => p.evaluate(st => {
    window.ArenaOffline._reset(Date.now());
    window.ArenaOffline._setSeit(Date.now() - st * 3600 * 1000);
    window.__proto.offMarke();
  }, h);

  /* ---------- 1. Der Einstieg ist da und ist erreichbar ---------- */
  await stelle(6);
  const eingang = await p.evaluate(() => {
    const k = document.getElementById("icoOffline");
    if (!k) return { da: false };
    const r = k.getBoundingClientRect();
    /* Nicht „existiert im DOM", sondern „ein Daumen trifft ihn":
       der Punkt in der Mitte muss wirklich beim Knopf landen. */
    const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { da: true, breite: Math.round(r.width), hoehe: Math.round(r.height),
             frei: !!oben && (oben === k || k.contains(oben)),
             tag: oben ? oben.tagName + "." + oben.className : "-" };
  });
  pruef("der Offline-Knopf steckt in der Hub-Leiste", eingang.da);
  pruef("er hat eine Daumenflaeche (>= 40 px)",
        eingang.breite >= 40 && eingang.hoehe >= 40,
        eingang.breite + "x" + eingang.hoehe);
  pruef("er wird von nichts verdeckt", eingang.frei, eingang.tag);

  /* ---------- 2. Die Marke haengt am Guthaben, nicht an der Zeit ---------- */
  const markeSichtbar = () => p.evaluate(() => {
    const m = document.getElementById("tileOfflineBadge");
    return !!m && m.style.display !== "none" && m.getBoundingClientRect().width > 0;
  });
  await stelle(6);
  const m6 = await markeSichtbar();
  await stelle(0);
  const m0 = await markeSichtbar();
  pruef("nach 6 h Abwesenheit ruft die Marke", m6);
  pruef("ohne Guthaben ruft sie NICHT", !m0, "sie war sichtbar, obwohl nichts da ist");
  gegen("Marke", m6 !== m0);

  /* ---------- 3. Der Dialog zeigt, was das Modul rechnet ---------- */
  await stelle(6);
  await p.evaluate(() => window.__proto.offOeffne());
  await p.waitForTimeout(600);

  const abgleich = await p.evaluate(() => {
    const t = id => ((document.getElementById(id) || {}).textContent || "")
      .replace(/\s+/g, " ").trim();
    /* Ziffern aus einem Text ziehen — 1 100/h, ×6 600, 12 500 alle
       gleich behandeln, egal welches Trennzeichen die Anzeige nutzt. */
    const zahl = s => { const m = String(s).replace(/[  \s.']/g, "").match(/\d+/); return m ? +m[0] : null; };
    const st = window.ArenaOffline.stand(Date.now());
    const zellen = [...document.querySelectorAll("#offGrid .offcell")]
      .map(c => ({ text: c.textContent.replace(/\s+/g, " ").trim(), wert: zahl(c.textContent) }));
    return {
      offen: document.getElementById("offLayer").classList.contains("open"),
      rateGold: zahl(t("offRateGold")), rateXp: zahl(t("offRateXp")),
      capText: t("offCap"), capZahl: zahl(t("offCap")),
      note: t("offNote"), zellen,
      claimAn: !document.getElementById("offClaim").disabled,
      modul: { gold: st.gold, xp: st.xp, material: st.material, karten: st.karten,
               rGold: window.ArenaOffline.RATEN.gold, rXp: window.ArenaOffline.RATEN.xp,
               deckel: window.ArenaOffline.DECKEL_H, bereit: st.bereit,
               abwesendH: st.abwesendH, gutH: st.gutH },
    };
  });
  const M = abgleich.modul;
  pruef("der Dialog geht auf", abgleich.offen);
  pruef("die Gold-Rate im Kopf ist die Rate des Moduls",
        abgleich.rateGold === M.rGold, abgleich.rateGold + " gegen " + M.rGold);
  pruef("die XP-Rate im Kopf ist die Rate des Moduls",
        abgleich.rateXp === M.rXp, abgleich.rateXp + " gegen " + M.rXp);
  pruef("das Band nennt den Deckel des Moduls",
        abgleich.capZahl === M.deckel, abgleich.capText + " gegen " + M.deckel);
  pruef("der Abhol-Knopf ist offen, weil Guthaben da ist",
        abgleich.claimAn === M.bereit, abgleich.claimAn + " / bereit=" + M.bereit);

  /* Jede Kachel muss einen Wert des Moduls treffen — und Gold, das
     groesste Feld, muss dabei sein. Verglichen wird gegen die Menge,
     nicht gegen eine Reihenfolge: die Kacheln duerfen umziehen. */
  const werte = abgleich.zellen.map(z => z.wert);
  pruef("jede Belohnungskachel traegt eine Zahl",
        werte.length > 0 && werte.every(v => v !== null),
        JSON.stringify(abgleich.zellen.map(z => z.text)));
  pruef("die Gold-Kachel zeigt genau das Gold des Moduls",
        werte.indexOf(M.gold) >= 0, M.gold + " nicht unter " + JSON.stringify(werte));
  pruef("die XP-Kachel zeigt genau die XP des Moduls",
        werte.indexOf(M.xp) >= 0, M.xp + " nicht unter " + JSON.stringify(werte));

  /* ---------- 4. Der Satz sagt die Wahrheit ueber den Deckel ---------- */
  /* 20 h weg, 8 h gutgeschrieben. Ein Dialog, der nur „20 h" sagt,
     verspricht mehr als er zahlt; einer, der nur „8 h" sagt,
     verschweigt den Verlust. Beide Zahlen muessen vorkommen. */
  await p.evaluate(() => window.__proto.offSchliesse && window.__proto.offSchliesse());
  await stelle(20);
  await p.evaluate(() => window.__proto.offOeffne());
  await p.waitForTimeout(500);
  const lang = await p.evaluate(() => {
    const t = id => ((document.getElementById(id) || {}).textContent || "")
      .replace(/\s+/g, " ").trim();
    const zahl = s => { const m = String(s).replace(/[  \s.']/g, "").match(/\d+/); return m ? +m[0] : null; };
    const st = window.ArenaOffline.stand(Date.now());
    return { note: t("offNote"),
             zellen: [...document.querySelectorAll("#offGrid .offcell")].map(c => zahl(c.textContent)),
             gold: st.gold, gutH: st.gutH, abwesendH: st.abwesendH,
             deckel: window.ArenaOffline.DECKEL_H,
             rGold: window.ArenaOffline.RATEN.gold };
  });
  /* Nicht „gold === deckel * rate" — dieser Schritt war beim
     Mutationstest aus dem falschen Grund rot: mit aufgehobenem Deckel
     zahlte das Modul korrekt die vollen 20 h, und die Behauptung fiel
     um, obwohl sie nur ihre eigene Annahme („20 > Deckel") verletzt
     sah. Geprueft wird jetzt die Formel selbst; DASS der Deckel hier
     greift, sagt die Gegenprobe weiter unten. */
  const erwartet = Math.floor(Math.min(lang.abwesendH, lang.deckel)) * lang.rGold;
  pruef("das Gold ist genau die angerechnete Zeit mal Rate",
        lang.gold === erwartet, lang.gold + " gegen " + erwartet);
  pruef("die Anzeige zahlt denselben gedeckelten Betrag",
        lang.zellen.indexOf(lang.gold) >= 0, JSON.stringify(lang.zellen));
  /* `abwesendH` ist eine echte Bruchzahl (20,00014 h — die Millisekunden
     zwischen Stellen und Ablesen). Die Anzeige rundet, der Vergleich
     muss das auch tun, sonst prueft er die Uhr statt den Satz. */
  const gutR = Math.floor(lang.gutH), wegR = Math.floor(lang.abwesendH);
  pruef("der Satz nennt die gutgeschriebenen Stunden",
        new RegExp("\\b" + gutR + "\\b").test(lang.note), lang.note);
  pruef("der Satz verschweigt die verlorene Zeit nicht",
        gutR === wegR || new RegExp("\\b" + wegR + "\\b").test(lang.note),
        "abwesend " + wegR + " h, Satz: " + lang.note);
  gegen("Deckel", wegR > gutR, "20 h wurden nicht gedeckelt");

  /* ---------- 5. Abholen raeumt den Ueberhang ab ---------- */
  /* Der Deckel waere zahnlos, wenn die 12 verfallenen Stunden nach dem
     Abholen einfach weiterlaufen. Direkt nach dem Abholen muss der
     Zaehler bei null stehen — nicht bei 12 h. */
  const nachher = await p.evaluate(() => {
    const r = window.ArenaOffline.claim(Date.now());
    const st = window.ArenaOffline.stand(Date.now());
    return { ok: r.ok, restGold: st.gold, restH: st.abwesendH, bereit: st.bereit };
  });
  pruef("das Abholen greift", nachher.ok === true);
  pruef("nach dem Abholen ist der Ueberhang WEG, nicht gutgeschrieben",
        nachher.restGold === 0 && nachher.restH === 0,
        "Rest " + nachher.restGold + " Gold / " + nachher.restH + " h");
  pruef("und der Knopf faellt zu", nachher.bereit === false);
  await p.evaluate(() => window.__proto.offMarke());
  pruef("die Marke verschwindet mit dem Guthaben", !(await markeSichtbar()));

  /* ---------- 6. Jedes Feld hat wirklich ein Bild ---------- */
  /* Vorgeschichte, und zugleich die Grenze dieses Schritts:
     Der Karten-Rueckfall stand auf 🂠 (U+1F0A0). Im Screenshot war das
     ein LEERES WEISSES RECHTECK. Naheliegende Erklaerung waere „kein
     Schnitt vorhanden" — nachgemessen stimmt sie NICHT: 🂠 ist 40,9 px
     breit, ein wirklich fehlendes Zeichen misst hier 30 px. Es gibt
     einen Schnitt, er ZEICHNET nur eine leere Karte.
     Damit ist „sieht blank aus" mit CSS nicht messbar: ⚗ ist mit
     35,9 px noch schmaler und liest sich einwandfrei. Dieser Fehler
     wurde durch ANSEHEN gefunden, nicht durch Messen — genau die Lehre
     aus dem README, und sie wird hier nicht wegdefiniert.
     Messbar und deshalb geprueft ist die groessere Klasse darunter:
     ein Rueckfall, fuer den es ueberhaupt keinen Schnitt gibt. Als
     Vergleichsmass dient die Breite eines garantiert leeren
     Codepunkts, zur Laufzeit ermittelt statt fest verdrahtet. */
  await stelle(6);
  await p.evaluate(() => window.__proto.offOeffne());
  await p.waitForTimeout(400);
  const bilder = await p.evaluate(() => {
    function breite(z, stil) {
      const s = document.createElement("span");
      s.style.cssText = "position:absolute;visibility:hidden;white-space:pre;" + stil;
      s.textContent = z; document.body.appendChild(s);
      const w = s.getBoundingClientRect().width; s.remove(); return +w.toFixed(2);
    }
    return [...document.querySelectorAll("#offGrid .offcell")].map(c => {
      const img = c.querySelector("img");
      const ico = c.querySelector(".ico");
      const el = img || ico;
      const r = el ? el.getBoundingClientRect() : { width: 0, height: 0 };
      const zeichen = (ico ? ico.textContent : "").trim();
      let leer = false;
      if (!img && zeichen) {
        /* Gleiche Schrift, gleiche Groesse fuer beide Messungen. */
        const cs = getComputedStyle(ico);
        const stil = "font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize + ";";
        leer = breite(zeichen, stil) === breite("\u{10FFFD}", stil);
      }
      return { art: img ? "bild" : "zeichen", zeichen,
               breite: Math.round(r.width), hoehe: Math.round(r.height), leer };
    });
  });
  pruef("jedes Feld traegt ein Bild oder ein Zeichen",
        bilder.length > 0 && bilder.every(x => x.breite > 0 && x.hoehe > 0),
        JSON.stringify(bilder));
  pruef("kein Rueckfall ist ein Zeichen ohne Schnitt",
        bilder.every(x => !x.leer),
        JSON.stringify(bilder.filter(x => x.leer).map(x => x.zeichen)));
  gegen("Schnitt-Erkennung",
        await p.evaluate(() => {
          /* Ein garantiert leerer Codepunkt muss als leer auffallen,
             ein sichtbares Zeichen nicht. Faellt beides gleich aus,
             misst der Schritt oben nichts. */
          function breite(z) {
            const s = document.createElement("span");
            s.style.cssText = "position:absolute;visibility:hidden;font-size:40px;white-space:pre";
            s.textContent = z; document.body.appendChild(s);
            const w = s.getBoundingClientRect().width; s.remove(); return +w.toFixed(2);
          }
          const leer = breite("\u{10FFFD}");
          return breite("\u{F8FF}") === leer && breite("\u{1FA99}") !== leer;
        }));

  /* ---------- 7. Das Video haengt im Kopf ---------- */
  const kopf = await p.evaluate(() => {
    const w = document.getElementById("offVid");
    const v = w && w.querySelector("video");
    const i = w && w.querySelector("img");
    const r = w ? w.getBoundingClientRect() : { width: 0, height: 0 };
    return { da: !!w, video: !!v, poster: !!i,
             stumm: v ? v.muted === true : null, schleife: v ? v.loop === true : null,
             breite: Math.round(r.width), hoehe: Math.round(r.height),
             verhaeltnis: r.height ? +(r.width / r.height).toFixed(2) : 0 };
  });
  pruef("der Kopf ist da", kopf.da);
  pruef("ein Video haengt drin", kopf.video);
  pruef("es laeuft stumm und in Schleife (kein Ton beim Oeffnen)",
        kopf.stumm === true && kopf.schleife === true,
        "stumm=" + kopf.stumm + " schleife=" + kopf.schleife);
  pruef("ein Poster faengt das nicht erreichbare CDN ab", kopf.poster);
  pruef("der Kopf steht 16:9 wie das erzeugte Material",
        Math.abs(kopf.verhaeltnis - 16 / 9) < 0.06,
        kopf.breite + "x" + kopf.hoehe + " = " + kopf.verhaeltnis);

  /* ---------- 8. Schnell-Ertrag: ein Dialog, ein ✕ ---------- */
  await p.evaluate(() => document.getElementById("offQuick").click());
  await p.waitForTimeout(450);
  const quick = await p.evaluate(() => {
    const t = id => ((document.getElementById(id) || {}).textContent || "")
      .replace(/\s+/g, " ").trim();
    /* Nur die ✕, die man auch SIEHT — beide Ebenen bringen eine mit. */
    const kreuze = [...document.querySelectorAll("#offLayer .itemclose, #qkLayer .itemclose")]
      .filter(e => {
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        return s.visibility !== "hidden" && s.display !== "none" &&
               +s.opacity > 0.05 && r.width > 0 && r.height > 0;
      });
    return { offen: document.getElementById("qkLayer").classList.contains("open"),
             cap: t("qkCap"), frei: t("qkFreeRest"), gem: t("qkGemRest"),
             note: t("qkNote"), kreuze: kreuze.length,
             minuten: window.ArenaOffline.QUICK_MIN,
             freiProTag: window.ArenaOffline.QUICK_GRATIS_PRO_TAG,
             gemProTag: window.ArenaOffline.QUICK_GEMS_PRO_TAG };
  });
  pruef("der Schnell-Ertrag geht auf", quick.offen);
  pruef("genau EIN ✕ ist sichtbar, wenn beide Ebenen offen sind",
        quick.kreuze === 1, quick.kreuze + " sichtbare ✕");
  pruef("die Kopfzeile nennt die Minuten des Moduls",
        new RegExp("\\b" + quick.minuten + "\\b").test(quick.cap), quick.cap);
  pruef("der Gratis-Zaehler nennt den Rest des Moduls",
        new RegExp("\\b" + quick.freiProTag + "\\b").test(quick.frei), quick.frei);
  pruef("der Gem-Zaehler nennt den Rest des Moduls",
        new RegExp("\\b" + quick.gemProTag + "\\b").test(quick.gem), quick.gem);

  /* ---------- 9. Der Werbe-Weg wird ehrlich verweigert ---------- */
  /* Im Projekt ist keine Werbung angebunden (GAMEPLAY_OPTIMIERUNG §10).
     Der Gratis-Weg darf deshalb NICHT liefern — und der Dialog muss
     das sagen, statt einen toten Knopf hinzustellen. */
  const werbung = await p.evaluate(() => {
    const r = window.ArenaOffline.quick("gratis", Date.now(), {});
    const rGesehen = window.ArenaOffline.quick("gratis", Date.now(), { werbungGesehen: true });
    const note = ((document.getElementById("qkNote") || {}).textContent || "")
      .replace(/\s+/g, " ").trim();
    return { ohne: r, mit: rGesehen.ok, note };
  });
  pruef("ohne gesehene Werbung liefert der Gratis-Weg nichts",
        werbung.ohne.ok === false, JSON.stringify(werbung.ohne));
  pruef("und nennt den Grund beim Namen",
        werbung.ohne.grund === "keine_werbung", werbung.ohne.grund);
  pruef("der Dialog sagt dem Spieler, dass die Anbindung fehlt",
        /werbe|werbung/i.test(werbung.note), werbung.note);
  gegen("Werbe-Weigerung", werbung.ohne.ok === false && werbung.mit === true,
        "der Weg war entweder immer zu oder immer offen");

  /* ---------- 10. Kein Gold aus dem Nichts ---------- */
  /* Der Dialog darf nur ANZEIGEN. Gebucht wird ausschliesslich beim
     Abholen — sonst waere jedes Oeffnen eine Geldquelle. */
  await stelle(6);
  const buchung = await p.evaluate(() => {
    const vorher = window.__proto.getGold ? window.__proto.getGold() : null;
    window.__proto.offOeffne(); window.__proto.offOeffne(); window.__proto.offOeffne();
    const nachher = window.__proto.getGold ? window.__proto.getGold() : null;
    return { vorher, nachher };
  });
  if (buchung.vorher === null) {
    pruef("Gold-Stand lesbar (uebersprungen: kein Zugriff)", true);
  } else {
    pruef("dreimal Oeffnen bucht kein Gold",
          buchung.vorher === buchung.nachher,
          buchung.vorher + " -> " + buchung.nachher);
  }

  /* ---------- 11. Nichts ist im Hintergrund kaputtgegangen ---------- */
  pruef("keine JS-Fehler auf der Seite", jsF.length === 0, jsF.slice(0, 3).join(" | "));

  console.log("\noffline.js  " + ok + " ok, " + fehl + " fehlgeschlagen\n");
  await b.close();
  if (fehl) process.exitCode = 1;
})();
