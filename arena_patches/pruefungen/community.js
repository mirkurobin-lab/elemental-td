/* ==================================================================
 * COMMUNITY-FENSTER (#viewCommunity)
 * ------------------------------------------------------------------
 * Geprueft wird dreierlei:
 *
 *  1. Der Weg hinein und der Aufbau: das Aufklapp-Menue fuehrt in die
 *     View, die sieben Plattformzeilen stehen in der Reihenfolge von
 *     SOC_PLATFORMS.
 *
 *  2. Die fuenf Marken-Auflagen aus LIZENZEN.md §6 — jede einzeln und
 *     am gerenderten Baum, nicht an der Quelle:
 *       (1) Pfad unveraendert, viewBox 0 0 24 24, kein transform
 *       (2) einfarbig weiss (ein Pfad, fill=currentColor, color #fff)
 *       (3) die Zeile sagt „Folgen", nicht „Partner"
 *       (4) Schutzraum: Marke 48 % des Plaettchens, ringsum 26 % frei
 *       (5) die Marken erscheinen NUR in diesen Zeilen
 *
 *  3. Die Ehrlichkeit des Platzhalters: solange keine Adresse
 *     eingetragen ist, gibt es keinen <a>, der ins Leere fuehrt —
 *     sondern einen sichtbar gedeckten Knopf mit der Marke BALD, der
 *     beim Tippen sagt, was fehlt. Und sobald eine Adresse da ist,
 *     wird aus derselben Zeile ohne weitere Aenderung ein echter Link.
 *
 * WARUM DAS HIER OERTLICH UEBERHAUPT MESSBAR IST: oertlich ist das CDN
 * gesperrt, jedes Icon faellt auf sein Emoji zurueck (§7b). Die sieben
 * Markenpfade sind aber INLINE-SVG — sie sind deshalb immer da, auch
 * ohne Netz. Genau dafuer liegen sie inline (LIZENZEN.md §6, letzter
 * Absatz). Die Bildfrage „sieht die Kulisse gut aus" bleibt fuer diese
 * Suite trotzdem unsichtbar; die gehoert vor die Auslieferung.
 * ================================================================== */
const { chromium } = require("playwright-core");
let ok = 0, fehl = 0;
const pruef = (name, wahr, zusatz) => {
  if (wahr) { ok++; } else { fehl++; console.log("  FEHL " + name + (zusatz ? " -> " + zusatz : "")); }
};

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsFehler = [];
  p.on("pageerror", e => jsFehler.push(String(e).slice(0, 140)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html",
    { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2000);

  /* ---------- 1. Der Weg hinein ---------- */
  const menu = await p.evaluate(() => {
    document.getElementById("tbMenu").click();
    const li = document.getElementById("tbMenuList");
    const folge = [...li.children].map(e => e.classList.contains("tbmgrp")
      ? "GRP:" + e.textContent.trim() : e.getAttribute("data-nav"));
    const e = li.querySelector('.tbmi[data-nav="navCommunity"]');
    const i = e ? e.querySelector(".ico") : null;
    const r = i ? i.getBoundingClientRect() : null;
    return {
      folge,
      da: !!e,
      pri: !!e && e.classList.contains("pri"),
      txt: e ? (e.querySelector(".tbmtx").firstChild.textContent || "").trim() : "",
      sub: e ? (e.querySelector(".tbmsub") || {}).textContent || "" : "",
      hatBild: !!i,
      w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0
    };
  });
  pruef("Menue fuehrt einen Eintrag COMMUNITY", menu.da && menu.txt === "Community", menu.txt);
  pruef("COMMUNITY steht in der Gruppe „Spielen“",
    menu.folge.indexOf("navCommunity") > menu.folge.indexOf("GRP:Spielen") &&
    menu.folge.indexOf("navCommunity") < menu.folge.indexOf("GRP:Konto"),
    menu.folge.join(" · "));
  pruef("COMMUNITY ist ein ZIEL (gross, mit Unterzeile)",
    menu.pri && menu.sub.length > 6, "pri=" + menu.pri + " sub=„" + menu.sub + "“");
  pruef("COMMUNITY traegt ein Bild, lesbar >= 20 px",
    menu.hatBild && menu.w >= 20 && menu.h >= 20, menu.w + "x" + menu.h);
  /* Die Unterzeile im MENUE darf keine fremde Marke nennen — Auflage 5:
     die Zeichen und Namen erscheinen nur in den Kanalzeilen selbst. */
  pruef("Menue-Unterzeile nennt keinen Anbieternamen",
    !/discord|youtube|tiktok|instagram|reddit|facebook/i.test(menu.sub), menu.sub);

  const auf = await p.evaluate(() => {
    document.querySelector('.tbmi[data-nav="navCommunity"]').click();
    return null;
  });
  await p.waitForTimeout(500);
  const aktiv = await p.evaluate(() => (document.querySelector(".view.active") || {}).id);
  pruef("Der Eintrag oeffnet #viewCommunity", aktiv === "viewCommunity", aktiv);

  /* ---------- 2. Aufbau: sieben Zeilen in der Reihenfolge der Tabelle ---------- */
  const bau = await p.evaluate(() => {
    const v = document.getElementById("viewCommunity");
    const rows = [...v.querySelectorAll(".socrow")];
    return {
      anzahl: rows.length,
      soll: window.__proto.SOC_PLATFORMS.map(x => x.name),
      ist: rows.map(r => r.querySelector(".socname").firstChild.textContent.trim()),
      titel: (v.querySelector("h2.title") || {}).textContent || "",
      band: !!v.querySelector(".secribbon .srt"),
      zurueck: !!document.getElementById("commBack")
    };
  });
  pruef("Sieben Plattformzeilen", bau.anzahl === 7, "sind " + bau.anzahl);
  pruef("Reihenfolge entspricht SOC_PLATFORMS",
    bau.ist.join("|") === bau.soll.join("|"), bau.ist.join(" · "));
  pruef("Fenster hat Titel und Zurueck-Weg",
    /COMMUNITY/i.test(bau.titel) && bau.zurueck, bau.titel);
  pruef("Ein Bandtrenner gliedert die Kanalliste", bau.band);

  /* ---------- 2a. Auflage 1: Marke unveraendert ---------- */
  const marken = await p.evaluate(() => {
    const M = window.__proto.SOC_MARKEN;
    const P = window.__proto.SOC_PLATFORMS;
    return [...document.querySelectorAll("#viewCommunity .socrow")].map((r, i) => {
      const id = P[i].id;
      const svg = r.querySelector("svg.soclogo");
      const pfade = svg ? [...svg.querySelectorAll("path")] : [];
      const chip = r.querySelector(".socchip");
      const cr = chip ? chip.getBoundingClientRect() : null;
      const lr = svg ? svg.getBoundingClientRect() : null;
      return {
        id,
        hatSvg: !!svg,
        pfadZahl: pfade.length,
        gleich: !!pfade[0] && pfade[0].getAttribute("d") === M[id].d,
        laenge: pfade[0] ? pfade[0].getAttribute("d").length : 0,
        viewBox: svg ? svg.getAttribute("viewBox") : "",
        transform: svg ? (svg.getAttribute("transform") || "") +
          (pfade[0] ? (pfade[0].getAttribute("transform") || "") : "") : "x",
        cssTransform: svg ? getComputedStyle(svg).transform : "x",
        fill: pfade[0] ? pfade[0].getAttribute("fill") : "",
        farbe: svg ? getComputedStyle(svg).color : "",
        // Schutzraum: Kante der Marke gegen Kante des Plaettchens
        chipW: cr ? cr.width : 0, chipH: cr ? cr.height : 0,
        logoW: lr ? lr.width : 0, logoH: lr ? lr.height : 0,
        linksFrei: (cr && lr) ? (lr.left - cr.left) / cr.width : 0,
        obenFrei: (cr && lr) ? (lr.top - cr.top) / cr.height : 0,
        rechtsFrei: (cr && lr) ? (cr.right - lr.right) / cr.width : 0,
        untenFrei: (cr && lr) ? (cr.bottom - lr.bottom) / cr.height : 0
      };
    });
  });
  pruef("Alle sieben Marken zeichnen (Inline-SVG, ohne CDN)",
    marken.length === 7 && marken.every(m => m.hatSvg && m.laenge > 100),
    marken.map(m => m.id + ":" + m.laenge).join(" "));
  marken.forEach(m => {
    pruef(m.id + ": Pfad unveraendert aus SOC_MARKEN", m.gleich);
    pruef(m.id + ": viewBox 0 0 24 24", m.viewBox === "0 0 24 24", m.viewBox);
    pruef(m.id + ": kein transform (nicht gedreht, nicht verzerrt)",
      m.transform === "" && (m.cssTransform === "none" || m.cssTransform === ""),
      m.transform + " / " + m.cssTransform);
    /* Auflage 2: EIN Pfad, fill=currentColor, und currentColor ist
       Weiss. Ein zweiter Pfad waere schon erfundene Mehrfarbigkeit. */
    pruef(m.id + ": genau ein Pfad (keine eigene Mehrfarbigkeit)", m.pfadZahl === 1,
      String(m.pfadZahl));
    pruef(m.id + ": einfarbig weiss",
      m.fill === "currentColor" && m.farbe === "rgb(255, 255, 255)",
      m.fill + " / " + m.farbe);
    /* Auflage 4: Schutzraum. 48 % Marke, ringsum 26 % frei — mit
       1 px Toleranz fuer die Rundung des Layouts. */
    pruef(m.id + ": Schutzraum ringsum >= 25 %",
      Math.min(m.linksFrei, m.obenFrei, m.rechtsFrei, m.untenFrei) >= 0.25,
      [m.linksFrei, m.obenFrei, m.rechtsFrei, m.untenFrei]
        .map(x => (x * 100).toFixed(1) + "%").join(" "));
    // Artwork muss bei >= 20 px lesbar sein — 44 px * 48 % = 21,1 px.
    pruef(m.id + ": Marke >= 20 px",
      m.logoW >= 20 && m.logoH >= 20,
      m.logoW.toFixed(1) + "x" + m.logoH.toFixed(1) + " auf " + m.chipW + " px Chip");
  });

  /* ---------- 2b. Auflage 3: „Folgen", nicht „Partner" ---------- */
  const wort = await p.evaluate(() => {
    const v = document.getElementById("viewCommunity");
    const knoepfe = [...v.querySelectorAll(".socfolg")];
    return {
      texte: knoepfe.map(k => k.textContent.trim()),
      labels: knoepfe.map(k => k.getAttribute("aria-label") || ""),
      recht: (document.getElementById("commRecht") || {}).textContent || "",
      // Alles Sichtbare AUSSER dem Rechtehinweis darf „Partner" nicht sagen
      restText: [...v.querySelectorAll(".socrow, .commclaim, .secribbon")]
        .map(e => e.textContent).join(" ")
    };
  });
  pruef("Jede Zeile sagt „Folgen“",
    wort.texte.length === 7 && wort.texte.every(t => t === "Folgen"),
    wort.texte.join(" · "));
  pruef("Nirgends „Partner“, „offiziell“ oder „Zusammenarbeit“ an einer Zeile",
    !/partner|offiziell|zusammenarbeit|kooperation/i.test(wort.restText));
  pruef("Auch die Vorlesehilfe sagt „folgen“",
    wort.labels.every(l => /folgen/i.test(l)), wort.labels[0]);
  /* Der Hinweis muss die Nicht-Partnerschaft AUSSPRECHEN, nicht nur
     das Wort meiden — sonst haengt Auflage 3 an einer Leerstelle. */
  pruef("Rechtehinweis nennt die Marken als fremd",
    /marken der/i.test(wort.recht) && /jeweilig/i.test(wort.recht), wort.recht.slice(0, 70));
  pruef("Rechtehinweis schliesst eine Partnerschaft ausdruecklich aus",
    /(partnerschaft|zusammenarbeit|billigung)[^.]*besteht nicht/i.test(wort.recht),
    wort.recht.slice(-90));

  /* ---------- 2c. Auflage 5: nie als eigenes Logo ---------- */
  const nurHier = await p.evaluate(() => ({
    gesamt: document.querySelectorAll("svg.soclogo").length,
    imFenster: document.querySelectorAll("#viewCommunity svg.soclogo").length,
    chipsGesamt: document.querySelectorAll(".socchip").length,
    chipsImFenster: document.querySelectorAll("#viewCommunity .socchip").length,
    imKopf: document.querySelectorAll("header .soclogo, header .socchip").length,
    inNav: document.querySelectorAll(".bottomnav .soclogo, .bottomnav .socchip").length
  }));
  pruef("Die Marken stehen NUR in den Kanalzeilen",
    nurHier.gesamt === 7 && nurHier.imFenster === 7 &&
    nurHier.chipsGesamt === nurHier.chipsImFenster,
    nurHier.gesamt + " gesamt / " + nurHier.imFenster + " im Fenster");
  pruef("Keine fremde Marke in Kopfleiste oder Hauptleiste",
    nurHier.imKopf === 0 && nurHier.inNav === 0);

  /* ---------- 3. Der Platzhalter ist als solcher erkennbar ---------- */
  const warte = await p.evaluate(() => {
    const v = document.getElementById("viewCommunity");
    const rows = [...v.querySelectorAll(".socrow")];
    const k = rows.map(r => r.querySelector(".socfolg"));
    return {
      links: v.querySelectorAll("a[href]").length,
      knoepfe: k.filter(x => x && x.tagName === "BUTTON").length,
      ariaDis: k.every(x => x.getAttribute("aria-disabled") === "1" ||
                            x.getAttribute("aria-disabled") === "true"),
      baldMarken: v.querySelectorAll(".socbald").length,
      baldText: (v.querySelector(".socbald") || {}).textContent || "",
      unterzeile: rows.map(r => (r.querySelector(".socname small") || {}).textContent || ""),
      // Der Wartezustand muss SICHTBAR anders sein als der verlinkte
      grundWarte: getComputedStyle(k[0]).backgroundImage,
      farbeWarte: getComputedStyle(k[0]).color,
      note: (document.getElementById("commNote") || {}).textContent || ""
    };
  });
  pruef("Kein <a>, das ins Leere fuehrt", warte.links === 0, String(warte.links));
  pruef("Sieben Knoepfe im Wartezustand", warte.knoepfe === 7, String(warte.knoepfe));
  pruef("Jeder traegt aria-disabled", warte.ariaDis);
  pruef("Jede offene Zeile traegt die Marke BALD",
    warte.baldMarken === 7 && warte.baldText.trim() === "BALD", warte.baldText);
  pruef("Die Unterzeile sagt, dass die Adresse fehlt",
    warte.unterzeile.every(t => /nachgetragen|folgt/i.test(t)), warte.unterzeile[0]);
  pruef("Die Fussnote beziffert, wie viele Kanaele offen sind",
    /7 von 7/.test(warte.note), warte.note.slice(0, 60));

  // Getippt erklaert sich der Platzhalter, statt nichts zu tun.
  await p.evaluate(() => document.querySelector("#viewCommunity .socfolg").click());
  await p.waitForTimeout(200);
  const meldung = await p.evaluate(() => {
    const t = document.getElementById("toast");
    return { an: t.classList.contains("on"), txt: t.textContent };
  });
  pruef("Ein Tipp auf den Platzhalter erklaert sich",
    meldung.an && /link/i.test(meldung.txt) && /Discord/.test(meldung.txt), meldung.txt);

  /* ---------- 3b. Sobald eine Adresse da ist, wird es ein echter Link ----------
     Das ist die Gegenprobe zum Wartezustand: der Bauplan des Fensters
     darf nicht am Platzhalter haengen. Geprueft wird ueber die
     offengelegte Tabelle, nicht ueber eingetragene echte Adressen —
     eine Pruefung, die auf ein Konto zeigt, das es noch nicht gibt,
     wird beim ersten Umzug falsch. */
  const verlinkt = await p.evaluate(() => {
    window.__proto.SOC_LINKS.discord = "https://discord.gg/beispiel/";
    window.__proto.renderCommunity();
    const r = document.querySelector("#viewCommunity .socrow");
    const a = r.querySelector(".socfolg");
    return {
      tag: a.tagName,
      href: a.getAttribute("href") || "",
      ziel: a.getAttribute("target") || "",
      rel: a.getAttribute("rel") || "",
      txt: a.textContent.trim(),
      bald: !!r.querySelector(".socbald"),
      unterzeile: (r.querySelector(".socname small") || {}).textContent || "",
      grundLink: getComputedStyle(a).backgroundImage,
      note: (document.getElementById("commNote") || {}).textContent || ""
    };
  });
  pruef("Mit Adresse wird aus der Zeile ein echter Link",
    verlinkt.tag === "A" && verlinkt.href === "https://discord.gg/beispiel/",
    verlinkt.tag + " " + verlinkt.href);
  pruef("Der Link oeffnet auswaerts und sicher",
    verlinkt.ziel === "_blank" && /noopener/.test(verlinkt.rel),
    verlinkt.ziel + " " + verlinkt.rel);
  pruef("Der Link sagt weiterhin „Folgen“", verlinkt.txt === "Folgen", verlinkt.txt);
  pruef("Die verlinkte Zeile traegt kein BALD mehr", !verlinkt.bald);
  pruef("Die Unterzeile zeigt die Adresse ohne Schema",
    verlinkt.unterzeile === "discord.gg/beispiel", verlinkt.unterzeile);
  pruef("Die Fussnote zaehlt mit", /6 von 7/.test(verlinkt.note), verlinkt.note.slice(0, 40));
  /* Der eigentliche Punkt: der Wartezustand sieht ANDERS aus als der
     verlinkte. Gleiche Optik waere ein Knopf, der luegt. */
  pruef("Wartezustand ist sichtbar vom verlinkten unterscheidbar",
    warte.grundWarte !== verlinkt.grundLink,
    warte.grundWarte.slice(0, 40) + " gegen " + verlinkt.grundLink.slice(0, 40));

  // Zuruecksetzen, damit die folgenden Messungen den Auslieferstand sehen.
  await p.evaluate(() => {
    window.__proto.SOC_LINKS.discord = "";
    window.__proto.renderCommunity();
  });
  await p.waitForTimeout(150);

  /* ---------- 4. Kulisse und Material ---------- */
  const kulisse = await p.evaluate(() => {
    const v = document.getElementById("viewCommunity");
    const a = document.getElementById("commArt");
    const grp = v.querySelector(".socgrp");
    const titel = v.querySelector(".commtitle");
    // Grundfarbe hinter dem Goldtitel: muss DUNKEL sein (.goldtext-Regel)
    let el = titel, grund = "rgba(0, 0, 0, 0)";
    while (el && grund === "rgba(0, 0, 0, 0)") {
      grund = getComputedStyle(el).backgroundColor; el = el.parentElement;
    }
    const m = grund.match(/\d+/g) || [0, 0, 0];
    const L = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    return {
      da: !!a,
      istIco: a ? a.classList.contains("ico") : true,
      klasse: a ? a.className : "",
      elternteil: a && a.parentElement ? a.parentElement.id : "",
      grund, L,
      goldtitel: !!(titel && titel.classList.contains("goldtext")),
      grpSchatten: grp ? getComputedStyle(grp).boxShadow : "none",
      knopfSchatten: getComputedStyle(v.querySelector(".socfolg")).boxShadow,
      chipSchatten: getComputedStyle(v.querySelector(".socchip")).boxShadow
    };
  });
  pruef("Die Kulisse ist ein <img class=commfig>, KEIN Icon",
    kulisse.da && !kulisse.istIco && /commfig/.test(kulisse.klasse), kulisse.klasse);
  /* Die Kulissendatei hat eine deckende Platte, die nur auf --bg
     unsichtbar ist. Sie darf deshalb nicht in einem Panel haengen. */
  pruef("Die Kulisse steht direkt auf dem Fenstergrund",
    kulisse.elternteil === "viewCommunity", kulisse.elternteil);
  pruef("Der Goldtitel steht auf DUNKLEM Grund",
    kulisse.goldtitel && kulisse.L < 0.22, kulisse.grund + " L=" + kulisse.L.toFixed(3));
  /* Licht kommt von oben: erhabene Flaechen tragen einen Schatten aus
     dem Verbund, keine leere Angabe. */
  pruef("Kanalgruppe ist erhaben (Schatten gesetzt)",
    kulisse.grpSchatten !== "none" && /inset/.test(kulisse.grpSchatten),
    kulisse.grpSchatten.slice(0, 60));
  pruef("Folgen-Knopf ist erhaben",
    kulisse.knopfSchatten !== "none" && /inset/.test(kulisse.knopfSchatten),
    kulisse.knopfSchatten.slice(0, 60));
  pruef("Das Plaettchen ist erhaben",
    kulisse.chipSchatten !== "none" && /inset/.test(kulisse.chipSchatten),
    kulisse.chipSchatten.slice(0, 60));

  /* ---------- 5. Zurueck und Sauberkeit ---------- */
  await p.evaluate(() => document.getElementById("commBack").click());
  await p.waitForTimeout(400);
  const zurueck = await p.evaluate(() => (document.querySelector(".view.active") || {}).id);
  pruef("Zurueck fuehrt auf die Startseite", zurueck === "viewHome", zurueck);

  pruef("keine JS-Fehler", jsFehler.length === 0, jsFehler[0]);
  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close();
  process.exit(fehl ? 1 : 0);
})();
