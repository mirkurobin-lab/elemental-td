/* ==================================================================
 * ARENA RIVALS — benannte Bot-Gegner + Near-Miss-Tuning
 * ------------------------------------------------------------------
 * Gibt dem heuristischen Bot ein GESICHT (Name, Titel, Deck, Held,
 * Flavor) und eine persistente Bilanz ("arenaRivalHist"). Zusätzlich
 * liefert driftFactor() einen Multiplikator für den foe-wave-clear-
 * Drain, der Matches gegen Ende hin ENG macht, ohne einen klar
 * verdienten Sieg zu kippen.
 *
 * WIRING (vs.html):
 *   1. <script src="arena_rivals.js"></script> vor dem Reveal-Code.
 *   2. Beim Hero-Reveal-Schritt:
 *        const rival = ArenaRivals.pick((ArenaProfile ? ArenaProfile.get().trophies : 0));
 *        document.getElementById('foecard').innerHTML = ArenaRivals.vsCardHTML(rival);
 *      (pick() schreibt localStorage.arenaRival — arena_pan.html liest das)
 *
 * WIRING (arena_pan.html):
 *   3. Script einbinden (vor dem Haupt-<script>).
 *   4. Beim wave-clear-Drain des Bots — die Zeile in der Art
 *        foeHP -= 220 + Math.random()*180;
 *      wird zu:
 *        foeHP -= (220 + Math.random()*180) * ArenaRivals.driftFactor(castleHP, foeHP, tSec, 420);
 *   5. In resolveEnd(), nachdem win feststeht:
 *        ArenaRivals.recordResult(win);
 *   6. Optional im HUD den Gegnernamen zeigen:
 *        (ArenaRivals.current()||{}).name
 * ================================================================== */
(function () {
  "use strict";

  const KEY_HIST = "arenaRivalHist";   // {[id]: {w, l, lastResult:'w'|'l', lastTs}}
  const KEY_CUR  = "arenaRival";       // id des aktuellen Gegners

  // Element-Farben für die vs-Karte (passend zum Element-System).
  const EL_COL = {
    fire: "#ff7a3c", water: "#5fd0ff", earth: "#d2a86a",
    nature: "#7fe07f", light: "#ffe89a", darkness: "#b48cff",
  };

  const EL_NAME = {
    fire: "Feuer", water: "Wasser", earth: "Erde",
    nature: "Natur", light: "Licht", darkness: "Finsternis",
  };

  /* Roster — 12 Rivalen, 3 Rang-Bänder à 4.
   * aggro 0..1: wie früh/aggressiv der Bot Wellen pusht (das Spiel darf
   * das auf aiLvl / Wellen-Kadenz mappen; rein informativ, wenn nicht).
   * deck: 6 Basis-Elemente (Duplikate erlaubt = Schwerpunkt).      */
  const ROSTER = [
    /* --- Band 1: Einsteiger (0–249 Trophäen) --- */
    { id: "grubb",  name: "Grubb der Stolperer",  title: "Lehrling der Grube", el: "earth",    hero: "magmor",
      deck: ["earth", "earth", "fire", "nature", "water", "light"], aggro: 0.25,
      style: "Baut breit, aber planlos. Wer ruhig bleibt, gewinnt gegen ihn." },
    { id: "pim",    name: "Pim Funkenschwanz",    title: "Zunder-Kobold",      el: "fire",     hero: "magmor",
      deck: ["fire", "fire", "fire", "earth", "light", "nature"], aggro: 0.7,
      style: "Rennt früh los und verbrennt sich oft selbst. Halte den Anfang aus." },
    { id: "nessa",  name: "Nessa Tautropfen",     title: "Quellwächterin",     el: "water",    hero: "solara",
      deck: ["water", "water", "nature", "nature", "light", "earth"], aggro: 0.2,
      style: "Turtelt hinter Frost-Türmen. Sie gewinnt nach Zeit, nicht nach KO." },
    { id: "orlo",   name: "Orlo Rankenfuß",       title: "Hüter des Unterholz", el: "nature",  hero: "solara",
      deck: ["nature", "nature", "nature", "water", "earth", "light"], aggro: 0.35,
      style: "Gift und Geduld. Seine Wellen kommen spät, dafür zäh." },

    /* --- Band 2: Fortgeschritten (250–699) --- */
    { id: "lyra",   name: "Lyra Frostweberin",    title: "Herrin des Stillstands", el: "water", hero: "solara",
      deck: ["water", "water", "water", "light", "light", "earth"], aggro: 0.3,
      style: "Friert alles ein und lässt die Zeit für sich arbeiten." },
    { id: "kael",   name: "Kael Sturmklinge",     title: "Erster der Morgenwacht", el: "light", hero: "solara",
      deck: ["light", "light", "fire", "fire", "water", "nature"], aggro: 0.65,
      style: "Markiert dein bestes Ziel und schlägt genau dort zu." },
    { id: "brann",  name: "Brann Steinfaust",     title: "Wall von Tiefengrund", el: "earth",   hero: "magmor",
      deck: ["earth", "earth", "earth", "fire", "nature", "water"], aggro: 0.15,
      style: "Ein Bollwerk. Er verliert nie schnell — du musst ihn zermürben." },
    { id: "sylketh", name: "Sylketh Dornmutter",  title: "Sammlerin der Fusionen", el: "nature", hero: "solara",
      deck: ["nature", "nature", "water", "water", "darkness", "light"], aggro: 0.4,
      style: "Spart Karten, bis zwei Elemente verschmelzen. Dann wird es hässlich." },

    /* --- Band 3: Meister (700+) --- */
    { id: "vex",    name: "Vex der Aschenlord",   title: "Zorn von Emberdeep",  el: "fire",     hero: "magmor",
      deck: ["fire", "fire", "fire", "earth", "earth", "darkness"], aggro: 0.9,
      style: "Kompromisslose Aggression. Überlebe seine ersten sechs Wellen." },
    { id: "morra",  name: "Morra Hohlgesang",     title: "Stimme aus dem Nichts", el: "darkness", hero: "solara",
      deck: ["darkness", "darkness", "darkness", "water", "light", "nature"], aggro: 0.55,
      style: "Fluch und Furcht. Deine Türme zielen daneben, wenn sie singt." },
    { id: "auren",  name: "Auren Tagbringer",     title: "Erwählter der Dämmerung", el: "light", hero: "solara",
      deck: ["light", "light", "light", "fire", "water", "earth"], aggro: 0.5,
      style: "Perfekte Kurve, nie eine Karte verschwendet. Der ehrlichste Gegner." },
    { id: "thraxus", name: "Thraxus Dreifaltig",  title: "Architekt der Triaden", el: "darkness", hero: "magmor",
      deck: ["darkness", "fire", "earth", "water", "nature", "light"], aggro: 0.45,
      style: "Spielt auf drei Elemente hin. Wer ihn Welle 10 erreichen lässt, hat verloren." },
  ];

  // Trophäen-Bänder → Roster-Indexbereich.
  function bandOf(trophies) {
    const t = trophies | 0;
    if (t < 250) return [0, 4];
    if (t < 700) return [4, 8];
    return [8, 12];
  }

  function loadHist() {
    try { return JSON.parse(localStorage.getItem(KEY_HIST) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveHist(h) { try { localStorage.setItem(KEY_HIST, JSON.stringify(h)); } catch (e) {} }

  function get(id) {
    for (let i = 0; i < ROSTER.length; i++) if (ROSTER[i].id === id) return ROSTER[i];
    return null;
  }
  function current() {
    try { return get(localStorage.getItem(KEY_CUR) || "") || null; } catch (e) { return null; }
  }
  function recordOf(id) {
    const r = loadHist()[id];
    return r ? { w: r.w | 0, l: r.l | 0, lastResult: r.lastResult || null, lastTs: r.lastTs || 0 } : null;
  }

  const REMATCH_CHANCE = 0.35;   // Wahrscheinlichkeit, den Angstgegner zu ziehen

  /* pick(trophies) — wählt einen Rivalen aus dem passenden Band.
   * Mit 35% Chance wird stattdessen der zuletzt VERLORENE Rival aus
   * demselben Band gewählt (Revanche-Hook). Schreibt localStorage. */
  function pick(trophies) {
    const [lo, hi] = bandOf(trophies);
    const band = ROSTER.slice(lo, hi);
    const hist = loadHist();

    let chosen = null;
    if (Math.random() < REMATCH_CHANCE) {
      // jüngste Niederlage im Band suchen
      let bestTs = 0;
      for (const r of band) {
        const h = hist[r.id];
        if (h && h.lastResult === "l" && (h.lastTs || 0) > bestTs) { bestTs = h.lastTs; chosen = r; }
      }
    }
    if (!chosen) {
      // nicht zweimal hintereinander denselben, wenn Alternativen da sind
      const prev = (function () { try { return localStorage.getItem(KEY_CUR); } catch (e) { return null; } })();
      const pool = band.filter(r => r.id !== prev);
      const src = pool.length ? pool : band;
      chosen = src[Math.floor(Math.random() * src.length)];
    }
    try { localStorage.setItem(KEY_CUR, chosen.id); } catch (e) {}
    return chosen;
  }

  /* recordResult(win) — Bilanz gegen den AKTUELLEN Rivalen fortschreiben. */
  function recordResult(win) {
    const r = current();
    if (!r) return null;
    const hist = loadHist();
    const e = hist[r.id] || { w: 0, l: 0, lastResult: null, lastTs: 0 };
    if (win) { e.w++; e.lastResult = "w"; } else { e.l++; e.lastResult = "l"; }
    e.lastTs = Date.now();
    hist[r.id] = e;
    saveHist(hist);
    return e;
  }

  /* ------------------------------------------------------------------
   * driftFactor(hpYou, hpFoe, tLeft, tTotal) → 0.55 .. 1.60
   * ------------------------------------------------------------------
   * Multiplikator für den simulierten wave-clear-Drain des Bots.
   *   > 1  = Bot verliert SCHNELLER HP  (er lag zu weit vorne)
   *   < 1  = Bot verliert LANGSAMER HP  (er lag zu weit hinten)
   *
   * Ziel: knappe Finishes ("near miss"), nicht Betrug.
   * Zwei Sicherungen sorgen dafür, dass ein VERDIENTER Ausgang bleibt:
   *   a) INTENSITÄT wächst erst gegen Matchende. Bei tLeft/tTotal > 0.6
   *      ist der Eingriff ~0 — die erste Match-Hälfte wird ehrlich
   *      gespielt und ein früher Vorsprung ist echt erarbeitet.
   *   b) HARTE CAPS. Der Drain kann nie unter 0.55x fallen und nie über
   *      1.60x steigen. Wer >2x so viel HP hat wie der Bot, gewinnt
   *      auch mit gedrosseltem Drain — das Delta ist zu groß, als dass
   *      ein 0.55x-Faktor es in 7 Minuten aufholen könnte.
   * Der Faktor greift NUR am Bot-Drain, nie an Spieler-HP, nie an
   * Monster-HP. Das Spielgefühl bleibt unverändert.                  */
  const DRIFT_MIN = 0.55, DRIFT_MAX = 1.60;

  function driftFactor(hpYou, hpFoe, tLeft, tTotal) {
    const you = Math.max(0, +hpYou || 0);
    const foe = Math.max(0, +hpFoe || 0);
    const total = (+tTotal > 0) ? +tTotal : 420;
    const left = Math.max(0, Math.min(total, +tLeft || 0));
    if (!you && !foe) return 1;

    // Relative Marge: +1 = du führst maximal, -1 = Bot führt maximal.
    const denom = Math.max(1, you + foe);
    const margin = (you - foe) / denom;          // -1 .. 1

    // Intensität: 0 in der ersten Match-Hälfte, 1 auf der Ziellinie.
    const frac = left / total;                    // 1 = Start, 0 = Ende
    let intensity = (0.6 - frac) / 0.6;           // <0 früh, 1 am Ende
    intensity = Math.max(0, Math.min(1, intensity));
    if (intensity <= 0) return 1;

    // Führst du deutlich (margin > 0) → Bot soll NICHT noch schneller
    // sterben, sondern länger leben → Faktor < 1.
    // Liegst du hinten (margin < 0) → Bot verliert schneller → > 1.
    const K = 0.85;                               // Hebel vor Caps
    let f = 1 - margin * K * intensity;

    // Tote Zone: bei ohnehin knappem Stand nicht herumfummeln.
    if (Math.abs(margin) < 0.06) f = 1;

    return Math.max(DRIFT_MIN, Math.min(DRIFT_MAX, f));
  }

  /* vsCardHTML(rival) — Snippet für vs.html. Inline-styles, damit es
   * in jedes bestehende Layout fällt. */
  function vsCardHTML(rival) {
    const r = rival || current() || ROSTER[0];
    const col = EL_COL[r.el] || "#cfd6ff";
    const rec = recordOf(r.id);
    const heroName = r.hero === "magmor" ? "MAGMOR" : "SOLARA";

    const badge = (rec && rec.lastResult === "l")
      ? `<div style="display:inline-block;margin-bottom:6px;padding:3px 10px;border-radius:999px;
           background:linear-gradient(90deg,#ff4d4d,#ff9040);color:#fff;font-size:12px;
           font-weight:900;letter-spacing:.06em">⚔ REVANCHE!</div>`
      : "";

    const bilanz = rec
      ? `<div style="font-size:12px;opacity:.85;margin-top:6px">
           Bilanz: <b style="color:#8fe08f">${rec.w}S</b> · <b style="color:#ff7b6b">${rec.l}N</b></div>`
      : `<div style="font-size:12px;opacity:.6;margin-top:6px">Erste Begegnung</div>`;

    const deck = r.deck.map(e =>
      `<span title="${EL_NAME[e] || e}" style="display:inline-block;width:14px;height:14px;border-radius:4px;
         margin:0 2px;background:${EL_COL[e] || "#888"};box-shadow:0 0 6px ${EL_COL[e] || "#888"}66"></span>`
    ).join("");

    return `<div class="rivalcard" style="text-align:center;padding:12px 14px;border-radius:14px;
        background:rgba(10,12,24,.72);border:1px solid ${col}55;box-shadow:0 0 24px ${col}33">
      ${badge}
      <div style="font-size:20px;font-weight:900;color:${col};text-shadow:0 0 12px ${col}88">${r.name}</div>
      <div style="font-size:13px;opacity:.9;letter-spacing:.05em;margin-top:2px">${r.title}</div>
      <div style="font-size:11px;opacity:.7;margin-top:4px">${EL_NAME[r.el] || r.el} · Held ${heroName}</div>
      <div style="margin-top:8px">${deck}</div>
      <div style="font-size:12px;opacity:.85;margin-top:8px;font-style:italic;max-width:260px;
        margin-left:auto;margin-right:auto;line-height:1.35">„${r.style}“</div>
      ${bilanz}
    </div>`;
  }

  window.ArenaRivals = {
    pick, get, current, recordResult, recordOf, driftFactor, vsCardHTML,
    roster: ROSTER, _keys: { hist: KEY_HIST, cur: KEY_CUR },
  };
})();
