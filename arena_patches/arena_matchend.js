/* ==================================================================
 * ARENA MATCH-ENDE — Ergebnis, Schadensbilanz, Anschluss
 * ------------------------------------------------------------------
 * Die größte Lücke gegen AA (AA_UI_REFERENZ §9.3): AA hat einen
 * Match-Ende-Screen (Video 2, t=438: VICTORY → +39 Trophäen, +610 Gold
 * → TAP TO CLOSE), wir hatten nur die Audio-Stinger. Der Moment mit der
 * höchsten emotionalen Intensität im Spiel endete bei uns in Stille.
 *
 * Dieses Modul ist die LOGIK dazu. Es rechnet aus den Rohdaten eines
 * Matches ein fertiges Anzeigemodell — Rangliste, Anteile, MVP,
 * Vergleich beider Seiten, Belohnung, Anschluss-Hinweise. Es rendert
 * NICHTS und kennt kein DOM.
 *
 * Drei Dinge, die AA NICHT zeigt und die hier bewusst drin sind:
 *
 *   1. SCHADENSBILANZ BEIDER SEITEN auf GEMEINSAMER SKALA. Nur so
 *      erkennt man „sein Katapult hat mehr Schaden gemacht als mein
 *      ganzes Board". Getrennte Skalen je Spieler würden genau die
 *      Aussage zerstören, um die es geht.
 *   2. SCHADEN JE STUFE. Der eigentliche Nutzen für den Spieler ist
 *      nicht „wer war am stärksten", sondern „was lohnt sich zu
 *      leveln". Ein Turm auf Stufe 4 mit halbem Schaden eines Stufe-20-
 *      Turms ist die bessere Investition — das sieht man nur so.
 *   3. ANSCHLUSS: der nächste Trophäenstraßen-Knoten mit Restdistanz.
 *      Das ist der stärkste „nochmal"-Auslöser, den es gibt, weil das
 *      Ende der Session zum Anfang der nächsten wird.
 *
 * HELDEN laufen mit in derselben Rangliste (der Spieler will wissen,
 * was performt hat, und der Held IST Teil des Boards), sind aber als
 * `hero:true` markiert und werden in den Summen getrennt ausgewiesen.
 * Grund: Heldenschaden ist nicht mit Turmschaden vergleichbar, weil
 * dahinter eine andere Investition steckt. Beides zusammenzuwerfen
 * würde eine falsche Gleichheit behaupten.
 *
 * WIRING (arena_pan.html):
 *   1. <script src="arena_matchend.js"></script> vor dem Haupt-<script>.
 *   2. Pro Turm/Held im Match Schaden mitzählen. Minimal reicht:
 *        t.dmgDone = (t.dmgDone || 0) + schaden;
 *      Zusätzlich nützlich, aber optional: hits, kills.
 *   3. Bei Matchende:
 *        var model = ArenaMatchEnd.build({
 *          result: won ? "victory" : "defeat",
 *          durationMs: Date.now() - matchStart,
 *          wavesSurvived: wave,
 *          trophiesBefore: ArenaProfile.trophies(),
 *          trophiesDelta: won ? +39 : -18,
 *          gold: won ? 610 : 120,
 *          me:   { name: myName,  units: towers.map(toUnit) },
 *          them: { name: oppName, units: oppTowers.map(toUnit) },
 *        });
 *      toUnit(t) = { cardId:t.id, lvl:t.lvl, tier:t.tier, dmg:t.dmgDone,
 *                    hits:t.hits, kills:t.kills, hero:!!t.hero }
 *   4. Modell an die UI geben (im Prototyp: showMatchEnd(model)).
 *
 * ROBUSTHEIT: Das Modul rechnet auch mit unvollständigen Daten. Fehlt
 * `dmg`, zählt die Einheit als 0 und wird als „ohne Messung" markiert —
 * es stürzt nichts ab und es wird nichts erfunden. Genau das ist beim
 * Einbau wichtig, weil das Schadenszählen im Match zuletzt kommt.
 *
 * Selbsttest: `node arena_patches/arena_matchend.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  /* ---------------- Trophäenstraße (Kadenz aus §15.4) ----------------
     Knoten alle 50 🏆 bis 1 500, dann alle 100 bis 5 000, dann alle 200
     bis 9 800. Dieselbe Staffel wie im Prototyp — hier gespiegelt, damit
     das Modul ohne die UI lauffähig bleibt (Selbsttest in node). */
  var ROAD_TOP = 9800;
  function stepAt(t) { return t < 1500 ? 50 : (t < 5000 ? 100 : 200); }
  function nextNodeAt(trophies) {
    var t = Math.max(0, Math.floor(trophies || 0));
    if (t >= ROAD_TOP) return null;                 // Straßenende erreicht
    var step = stepAt(t);
    var next = Math.floor(t / step) * step + step;
    // Kein Sonderfall an den Kadenzgrenzen noetig: 1 500 ist ein Vielfaches
    // von 50 und 5 000 eines von 100 — die Grenze IST also selbst ein Knoten
    // und kann nie uebersprungen werden. (Im Selbsttest gegengeprueft:
    // 1480 → 1500, 1510 → 1600, 4960 → 5000, 5010 → 5200.)
    return Math.min(next, ROAD_TOP);
  }

  /* Belohnungsstaffel der Knoten — grob wie im Prototyp (nodeReward).
     Bewusst nur die LABEL-Ebene: Was genau dropt, entscheidet die UI
     bzw. arena_cards.js, nicht dieses Modul. */
  function nodeLabel(at) {
    if (at % 1000 === 0) return "Gold-Pack";
    if (at % 500 === 0) return "Silber-Pack";
    if (at % 250 === 0) return "Bronze-Pack";
    return "Belohnung";
  }

  function num(v) { return typeof v === "number" && isFinite(v) ? v : 0; }
  function clampPct(v) { return Math.max(0, Math.min(1, v)); }

  function msToText(ms) {
    var s = Math.max(0, Math.round(num(ms) / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  /* ------------------------------------------------------------------
   * Eine Seite aufbereiten: sortieren, Anteile, MVP, Summen.
   * ------------------------------------------------------------------ */
  function buildSide(raw) {
    var side = raw || {};
    var units = (side.units || []).map(function (u) {
      var dmg = num(u && u.dmg);
      var lvl = Math.max(1, Math.round(num(u && u.lvl) || 1));
      return {
        cardId: (u && u.cardId) || "unknown",
        name: (u && u.name) || null,          // UI darf den Namen liefern
        lvl: lvl,
        tier: (u && u.tier) || "common",
        hero: !!(u && u.hero),
        dmg: dmg,
        hits: num(u && u.hits),
        kills: num(u && u.kills),
        // „ohne Messung" statt stillschweigend 0: Wenn das Match keinen
        // Schaden gezählt hat, soll die UI das SAGEN können.
        measured: !!(u && typeof u.dmg === "number" && isFinite(u.dmg)),
        perLevel: dmg / lvl,
      };
    });

    // Absteigend nach Schaden. Bei Gleichstand entscheidet Schaden je
    // Stufe — damit steht bei zwei gleich starken Türmen der günstigere
    // oben, und das ist die nützlichere Aussage.
    units.sort(function (a, b) {
      return (b.dmg - a.dmg) || (b.perLevel - a.perLevel);
    });

    var total = units.reduce(function (s, u) { return s + u.dmg; }, 0);
    var heroTotal = units.reduce(function (s, u) { return s + (u.hero ? u.dmg : 0); }, 0);
    var towerTotal = total - heroTotal;

    units.forEach(function (u, i) {
      u.rank = i + 1;
      u.share = total > 0 ? u.dmg / total : 0;
      u.isMvp = i === 0 && u.dmg > 0;
    });

    return {
      name: side.name || "—",
      clan: side.clan || null,
      units: units,
      total: total,
      heroTotal: heroTotal,
      towerTotal: towerTotal,
      mvp: units.length && units[0].dmg > 0 ? units[0] : null,
      // Wurde überhaupt gemessen? Steuert den Hinweis in der UI.
      anyMeasured: units.some(function (u) { return u.measured; }),
    };
  }

  /* ------------------------------------------------------------------
   * Vergleichssatz. Kurz, konkret, ohne Schönfärberei — er darf auch
   * sagen, dass man unterlegen war.
   * ------------------------------------------------------------------ */
  function verdictText(me, them) {
    if (!me.total && !them.total) return "Kein Schaden gemessen.";
    if (!them.total) return "Dein Board hat den ganzen Schaden getragen.";
    if (!me.total) return "Dein Board hat keinen Schaden gemacht.";
    var ratio = me.total / them.total;
    var pct = Math.round(Math.abs(ratio - 1) * 100);
    if (pct < 5) return "Beide Boards lagen praktisch gleichauf.";
    return ratio > 1
      ? "Dein Board hat " + pct + " % mehr Schaden gemacht."
      : "Sein Board hat " + pct + " % mehr Schaden gemacht.";
  }

  /* ------------------------------------------------------------------
   * Level-Empfehlung: der Turm mit dem besten Schaden JE STUFE, der
   * noch nicht der stärkste ist. Das ist die Karte, die pro investierter
   * Stufe am meisten zurückgibt — und damit der ehrlichste Tipp, den
   * dieser Screen geben kann.
   * ------------------------------------------------------------------ */
  function levelTip(me) {
    var cands = me.units.filter(function (u) { return u.dmg > 0 && !u.hero; });
    if (cands.length < 2) return null;
    var best = cands.slice().sort(function (a, b) { return b.perLevel - a.perLevel; })[0];
    if (!best || best.isMvp) return null;   // der Stärkste braucht keinen Tipp
    return {
      cardId: best.cardId,
      lvl: best.lvl,
      perLevel: best.perLevel,
      // Wieviel effizienter als der Spitzenreiter?
      factor: me.units[0].perLevel > 0 ? best.perLevel / me.units[0].perLevel : 1,
    };
  }

  /* ==================================================================
   * build(input) → Anzeigemodell
   * ================================================================== */
  function build(input) {
    var inp = input || {};
    var isWin = inp.result === "victory" || inp.result === true;
    var me = buildSide(inp.me);
    var them = buildSide(inp.them);

    var tBefore = Math.max(0, Math.round(num(inp.trophiesBefore)));
    var tDelta = Math.round(num(inp.trophiesDelta));
    var tAfter = Math.max(0, tBefore + tDelta);

    var nAt = nextNodeAt(tAfter);
    var nextNode = nAt === null ? null : {
      at: nAt,
      missing: Math.max(0, nAt - tAfter),
      label: nodeLabel(nAt),
      // Fortschritt zwischen vorigem und nächstem Knoten, für den Balken.
      pct: (function () {
        var step = stepAt(tAfter);
        var prev = Math.max(0, nAt - step);
        return clampPct((tAfter - prev) / Math.max(1, nAt - prev));
      })(),
    };

    // Gemeinsame Skala: der größte Einzelschaden BEIDER Seiten. Damit
    // sind die Balken über den Spielerwechsel hinweg vergleichbar.
    var scale = 0;
    me.units.concat(them.units).forEach(function (u) {
      if (u.dmg > scale) scale = u.dmg;
    });

    return {
      result: isWin ? "victory" : "defeat",
      isWin: isWin,
      headline: isWin ? "SIEG" : "NIEDERLAGE",
      durationMs: num(inp.durationMs),
      durationText: msToText(inp.durationMs),
      waves: Math.max(0, Math.round(num(inp.wavesSurvived))),
      reward: {
        trophiesDelta: tDelta,
        trophiesBefore: tBefore,
        trophiesAfter: tAfter,
        gold: Math.max(0, Math.round(num(inp.gold))),
        packs: Array.isArray(inp.packs) ? inp.packs.slice() : [],
      },
      sides: { me: me, them: them },
      scale: scale,
      verdict: verdictText(me, them),
      nextNode: nextNode,
      levelTip: levelTip(me),
    };
  }

  var API = { build: build, nextNodeAt: nextNodeAt, _buildSide: buildSide };
  if (typeof window !== "undefined") window.ArenaMatchEnd = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ================================================================
   * SELBSTTEST
   * ================================================================ */
  if (typeof module !== "undefined" && require.main === module) {
    var fail = 0;
    function check(name, cond, got) {
      if (cond) { console.log("  ok   " + name); }
      else { fail++; console.log("  FAIL " + name + (got !== undefined ? "  — " + got : "")); }
    }

    console.log("\nARENA MATCH-ENDE — Selbsttest\n");

    var m = build({
      result: "victory",
      durationMs: 258000,
      wavesSurvived: 14,
      trophiesBefore: 1136,
      trophiesDelta: 39,
      gold: 610,
      packs: [{ tier: "bronze" }],
      me: { name: "Prisma-Magier", clan: "Prisma-Orden", units: [
        { cardId: "fire",  lvl: 16, tier: "rare",  dmg: 48210, hits: 312, kills: 41 },
        { cardId: "water", lvl: 12, tier: "good",  dmg: 22140, hits: 288, kills: 19 },
        { cardId: "solara", lvl: 8, tier: "epic",  dmg: 31900, hits: 88,  kills: 12, hero: true },
        { cardId: "light", lvl: 4,  tier: "common", dmg: 14000, hits: 140, kills: 6 },
      ] },
      them: { name: "Netherghost", units: [
        { cardId: "earth", lvl: 20, tier: "epic",  dmg: 60300, hits: 210, kills: 52 },
        { cardId: "darkness", lvl: 9, tier: "good", dmg: 18400, hits: 176, kills: 14 },
      ] },
    });

    console.log("Kopf: " + m.headline + " · " + m.durationText + " · Welle " + m.waves);
    check("Sieg erkannt", m.isWin === true && m.headline === "SIEG");
    check("Dauer 258 s → 4:18", m.durationText === "4:18", m.durationText);
    check("Trophäen 1136 + 39 = 1175", m.reward.trophiesAfter === 1175, m.reward.trophiesAfter);

    console.log("\nEigene Rangliste:");
    m.sides.me.units.forEach(function (u) {
      console.log("  #" + u.rank + " " + u.cardId + (u.hero ? " (Held)" : "") +
        " Lv" + u.lvl + "  " + u.dmg + "  " + (u.share * 100).toFixed(1) + " %  " +
        "je Stufe " + u.perLevel.toFixed(0) + (u.isMvp ? "  ← MVP" : ""));
    });
    check("absteigend nach Schaden sortiert", m.sides.me.units[0].cardId === "fire" &&
      m.sides.me.units[1].cardId === "solara" && m.sides.me.units[2].cardId === "water");
    check("MVP ist der stärkste Turm", m.sides.me.mvp.cardId === "fire" &&
      m.sides.me.units[0].isMvp === true);
    check("nur EIN MVP je Seite",
      m.sides.me.units.filter(function (u) { return u.isMvp; }).length === 1);
    check("Summe eigene Seite", m.sides.me.total === 48210 + 22140 + 31900 + 14000,
      m.sides.me.total);
    check("Anteile summieren auf 1",
      Math.abs(m.sides.me.units.reduce(function (s, u) { return s + u.share; }, 0) - 1) < 1e-9);

    check("Held getrennt ausgewiesen", m.sides.me.heroTotal === 31900, m.sides.me.heroTotal);
    check("Turmsumme ohne Held", m.sides.me.towerTotal === 48210 + 22140 + 14000,
      m.sides.me.towerTotal);
    check("Held bleibt in der Rangliste", m.sides.me.units.some(function (u) {
      return u.hero && u.rank === 2; }));

    console.log("\nGemeinsame Skala: " + m.scale);
    check("Skala ist der größte Einzelschaden BEIDER Seiten", m.scale === 60300, m.scale);
    check("Gegnerbalken kann die Skala ausschöpfen",
      m.sides.them.units[0].dmg / m.scale === 1);

    console.log("\nVergleich: " + m.verdict);
    check("Vergleichssatz nennt die eigene Seite als stärker (114 300 vs 78 700)",
      /Dein Board hat 48 % mehr/.test(m.verdict), m.verdict);

    var vUnter = build({ me: { units: [{ cardId: "a", lvl: 1, dmg: 1000 }] },
      them: { units: [{ cardId: "b", lvl: 1, dmg: 2000 }] } });
    check("umgekehrter Fall: Vergleichssatz nennt den Gegner als stärker",
      /Sein Board hat 50 % mehr/.test(vUnter.verdict), vUnter.verdict);

    console.log("Nächster Knoten: " + JSON.stringify(m.nextNode));
    check("nächster Knoten nach 1175 ist 1200", m.nextNode.at === 1200, m.nextNode.at);
    check("Restdistanz 25", m.nextNode.missing === 25, m.nextNode.missing);
    check("Knotenfortschritt zwischen 0 und 1",
      m.nextNode.pct > 0 && m.nextNode.pct < 1, m.nextNode.pct);

    console.log("Level-Tipp: " + JSON.stringify(m.levelTip));
    check("Level-Tipp nennt den effizientesten Turm (light, Lv4)",
      m.levelTip && m.levelTip.cardId === "light", m.levelTip && m.levelTip.cardId);
    check("Level-Tipp ist nie der MVP selbst",
      !!m.levelTip && m.levelTip.cardId !== m.sides.me.mvp.cardId);

    console.log("\n— Grenzfälle —");

    var g1 = build({ result: "defeat", trophiesBefore: 400, trophiesDelta: -18,
      me: { units: [] }, them: { units: [] } });
    check("Niederlage erkannt", g1.isWin === false && g1.headline === "NIEDERLAGE");
    check("leere Boards stürzen nicht ab", g1.sides.me.total === 0 && g1.scale === 0);
    check("kein MVP bei leerem Board", g1.sides.me.mvp === null);
    check('Vergleichssatz sagt: kein Schaden gemessen',
      /Kein Schaden gemessen/.test(g1.verdict), g1.verdict);
    check("negativer Delta zieht Trophäen ab", g1.reward.trophiesAfter === 382,
      g1.reward.trophiesAfter);

    var g2 = build({ me: { units: [{ cardId: "fire", lvl: 3 }] }, them: { units: [] } });
    check("fehlender Schadenswert → 0, nicht NaN", g2.sides.me.units[0].dmg === 0);
    check('fehlender Schadenswert wird als ohne-Messung markiert',
      g2.sides.me.units[0].measured === false);
    check("anyMeasured=false, wenn nichts gezählt wurde",
      g2.sides.me.anyMeasured === false);
    check("kein MVP ohne Schaden", g2.sides.me.mvp === null);

    // Kadenzwechsel 50→100 bei 1 500 und 100→200 bei 5 000: die Grenze ist
    // selbst ein Knoten, darunter gilt die feine, darueber die grobe Staffel.
    check("1480 → nächster Knoten 1500 (noch feine Staffel)",
      API.nextNodeAt(1480) === 1500, API.nextNodeAt(1480));
    check("1500 erreicht → nächster Knoten 1600 (grobe Staffel greift)",
      API.nextNodeAt(1500) === 1600, API.nextNodeAt(1500));
    check("1510 → nächster Knoten 1600, nicht 1500 (1500 liegt hinter uns)",
      API.nextNodeAt(1510) === 1600, API.nextNodeAt(1510));
    check("4960 → nächster Knoten 5000", API.nextNodeAt(4960) === 5000, API.nextNodeAt(4960));
    check("5010 → nächster Knoten 5200 (200er-Staffel)",
      API.nextNodeAt(5010) === 5200, API.nextNodeAt(5010));
    var g5 = build({ trophiesBefore: 9800, trophiesDelta: 0, me: { units: [] }, them: { units: [] } });
    check("Straßenende: kein nächster Knoten", g5.nextNode === null);

    var g6 = build({ me: { units: [
      { cardId: "a", lvl: 10, dmg: 1000 }, { cardId: "b", lvl: 2, dmg: 1000 } ] },
      them: { units: [] } });
    check("Gleichstand: der günstigere Turm steht oben",
      g6.sides.me.units[0].cardId === "b", g6.sides.me.units[0].cardId);

    var g7 = build({ me: { units: [{ cardId: "solo", lvl: 5, dmg: 900 }] }, them: { units: [] } });
    check("Level-Tipp entfällt bei nur einem Turm", g7.levelTip === null);

    var g8 = build({ me: { units: [{ cardId: "h", lvl: 5, dmg: 900, hero: true }] },
      them: { units: [] } });
    check("Held allein: Turmsumme 0, Heldensumme 900",
      g8.sides.me.towerTotal === 0 && g8.sides.me.heroTotal === 900);
    check("Level-Tipp ignoriert Helden", g8.levelTip === null);

    var g9 = build({ me: { units: [{ cardId: "a", lvl: 1, dmg: 500 }] },
      them: { units: [{ cardId: "b", lvl: 1, dmg: 505 }] } });
    check('unter 5 % Unterschied → praktisch gleichauf',
      /gleichauf/.test(g9.verdict), g9.verdict);

    check("nextNodeAt(0) = 50", API.nextNodeAt(0) === 50, API.nextNodeAt(0));
    check("nextNodeAt(50) = 100", API.nextNodeAt(50) === 100, API.nextNodeAt(50));
    check("nextNodeAt(9799) = 9800", API.nextNodeAt(9799) === 9800, API.nextNodeAt(9799));
    check("nextNodeAt über dem Ende = null", API.nextNodeAt(12000) === null);

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
