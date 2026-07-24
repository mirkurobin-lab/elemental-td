/* ==================================================================
 * ARENA PROFILE — echte Trophäen / Rang / Streak / Pack-Rewards
 * ------------------------------------------------------------------
 * Ersetzt die kosmetischen "+30 Trophäen" in resolveEnd() durch ein
 * persistiertes Profil (localStorage "arenaProfile").
 *
 * WIRING (arena_pan.html):
 *   1. Dieses Script VOR dem Haupt-<script> einbinden (oder den
 *      Inhalt oben in den Haupt-Script-Block kopieren).
 *   2. In resolveEnd(), nachdem win/lose feststeht:
 *        const res = ArenaProfile.applyMatchResult({
 *          win, stars,               // stars: die bereits berechneten 0..3
 *          hpYou: castleHP, hpFoe: foeHP,
 *          rivalId: (localStorage.arenaRival || null),
 *        });
 *        resultBox.insertAdjacentHTML('beforeend', ArenaProfile.resultHTML(res));
 *      Die alte statische "+30 Trophäen"-Zeile ENTFERNEN.
 *   3. deck.html / Hub: ArenaProfile.get() lesen und Trophäen + Rang
 *      im Top-Bar anzeigen; res.shards in arenaHub.coll einzahlen
 *      (siehe applyShardsToHub() unten — Feld-Namen ggf. anpassen).
 * ================================================================== */
(function () {
  "use strict";
  const KEY = "arenaProfile";

  // Rangleiter: Schwellen in Trophäen. Namen passen zur Arcane-Welt.
  const RANKS = [
    { at: 0,    name: "Bronze",  icon: "🜉" },
    { at: 100,  name: "Silber",  icon: "🜊" },
    { at: 250,  name: "Gold",    icon: "🜚" },
    { at: 450,  name: "Platin",  icon: "🜛" },
    { at: 700,  name: "Diamant", icon: "💠" },
    { at: 1000, name: "Meister", icon: "★" },
    { at: 1400, name: "Arkan",   icon: "✦" },
  ];

  // Trophäen-Formel. Verlust kostet weniger als ein Sieg bringt
  // (Netto-Progression auch bei ~45% Winrate → Frust-Schutz).
  const T_WIN = 30, T_LOSS = -10;
  const T_STAR = 4;              // pro Stern extra
  const STREAK_BONUS = [0, 0, 5, 10, 15, 20]; // ab 3er-Streak, Cap +20
  const PACK_WINS = 3;           // alle 3 Siege ein Booster-Pack
  const PACK_SHARDS = 6;         // Splitter pro Pack (Hub verteilt sie)
  const LOSS_SHARDS = 1;         // Trostpreis: auch Niederlagen zahlen ein

  function fresh() {
    return {
      trophies: 0, best: 0, wins: 0, losses: 0,
      streak: 0, bestStreak: 0,
      packProgress: 0, packsOpened: 0, shardsBank: 0,
      history: [], // letzte 20 Matches {w, t, s, rid, ts}
    };
  }
  function load() {
    try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return fresh(); }
  }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }

  function rankOf(t) {
    let r = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (t >= RANKS[i].at) { r = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    return { name: r.name, icon: r.icon, at: r.at, next };
  }

  function applyMatchResult(m) {
    const p = load();
    const before = rankOf(p.trophies);
    let delta;
    if (m.win) {
      p.wins++; p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      const sb = STREAK_BONUS[Math.min(p.streak, STREAK_BONUS.length - 1)];
      delta = T_WIN + (m.stars | 0) * T_STAR + sb;
    } else {
      p.losses++; p.streak = 0;
      delta = T_LOSS;
    }
    p.trophies = Math.max(0, p.trophies + delta);
    p.best = Math.max(p.best, p.trophies);

    // Pack-Fortschritt + Splitter
    let packAwarded = false, shards = m.win ? 0 : LOSS_SHARDS;
    if (m.win) {
      p.packProgress++;
      if (p.packProgress >= PACK_WINS) {
        p.packProgress = 0; p.packsOpened++; packAwarded = true;
        shards += PACK_SHARDS;
      }
    }
    p.shardsBank += shards; // Bank; der Hub zieht sie ab und verteilt auf Karten

    p.history.unshift({ w: m.win ? 1 : 0, t: delta, s: m.stars | 0, rid: m.rivalId || null, ts: Date.now() });
    p.history = p.history.slice(0, 20);
    save(p);

    const after = rankOf(p.trophies);
    return {
      win: !!m.win, delta, trophies: p.trophies,
      rank: after, rankUp: after.at > before.at, rankDown: after.at < before.at,
      streak: p.streak, packProgress: p.packProgress, packWins: PACK_WINS,
      packAwarded, shards, shardsBank: p.shardsBank,
    };
  }

  // HTML-Schnipsel für den Result-Screen (#result). Nutzt inline-styles,
  // damit nichts mit bestehendem CSS kollidiert.
  function resultHTML(r) {
    const col = r.delta >= 0 ? "#ffd75e" : "#ff7b6b";
    const streak = r.streak >= 2
      ? `<div style="font-size:13px;color:#8fe08f;margin-top:2px">🔥 ${r.streak}er-Siegesserie</div>` : "";
    const rank = r.rankUp
      ? `<div style="font-size:15px;color:#ffd75e;margin-top:4px">⬆ AUFSTIEG: ${r.rank.icon} ${r.rank.name}!</div>`
      : `<div style="font-size:12px;opacity:.8;margin-top:2px">${r.rank.icon} ${r.rank.name} · ${r.trophies} 🏆</div>`;
    const pack = r.packAwarded
      ? `<div style="font-size:14px;color:#b9a7ff;margin-top:4px">🎁 BOOSTER-PACK! +${r.shards} Splitter</div>`
      : `<div style="font-size:12px;opacity:.75;margin-top:2px">Pack: ${r.packProgress}/${r.packWins} Siege${r.shards ? ` · +${r.shards} Splitter` : ""}</div>`;
    return `<div id="profres" style="text-align:center;margin-top:8px">
      <div style="font-size:20px;font-weight:900;color:${col}">${r.delta >= 0 ? "+" : ""}${r.delta} 🏆</div>
      ${rank}${streak}${pack}</div>`;
  }

  // Hub-Seite: Splitter-Bank auf die Karten-Collection verteilen.
  // ANPASSEN an die echte arenaHub-Struktur (coll[id].shards o. ä.).
  function applyShardsToHub(hub, cardIds) {
    const p = load();
    if (!p.shardsBank || !cardIds || !cardIds.length) return 0;
    let given = 0;
    while (p.shardsBank > 0) {
      const id = cardIds[Math.floor(Math.random() * cardIds.length)];
      hub.coll[id] = hub.coll[id] || { lvl: 1, shards: 0 };
      hub.coll[id].shards = (hub.coll[id].shards || 0) + 1;
      p.shardsBank--; given++;
    }
    save(p);
    return given;
  }

  window.ArenaProfile = { get: load, applyMatchResult, resultHTML, rankOf, applyShardsToHub, _key: KEY };
})();
