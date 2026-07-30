/* ==================================================================
 * ARENA WAVES — Gegner-Bestiarium, Wellen-Skalierung, Element-Matrix
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM, KEIN localStorage. Nachbau des
 * „Defenders Guide" aus Arcane Arena (AA). Die Messgrundlage steht in
 * arena_patches/AA_WELLEN_REFERENZ.md — dort ist Zeile für Zeile
 * belegt, welche Zahl aus welchem Videoframe stammt.
 *
 * AUFBAU IN DREI SCHICHTEN — bitte beim Ändern respektieren:
 *
 *   1. DATEN     — ELEMENTS, STRONG_AGAINST, MOBS, WAVE_PLAN.
 *                  Reine Tabellen. Wer Monster austauscht, ändert
 *                  NUR hier. Kein Rechnen in diesem Block.
 *   2. FORMELN   — refHp(), refDamage(), countAt(). Die Kurven.
 *                  Wer die Balance dreht, ändert NUR hier.
 *   3. API       — all(), bestiary(), statsFor(), waveAt(),
 *                  damageFactor(), matrix(). Nur Verdrahtung.
 *
 * WARUM DIESE TRENNUNG: Der Monster-Katalog ist Platzhalter und wird
 * ersetzt, sobald die UI steht. Läge die Skalierung in den
 * Monsterdaten (jedes Monster mit eigener HP-Tabelle), müsste beim
 * Austausch jede Zahl neu erfunden werden. So hängt jedes Monster mit
 * GENAU EINEM Faktor (hpFactor/dmgFactor) an der gemeinsamen Kurve.
 *
 * KEIN ZUSTAND, KEIN localStorage: Das Modul ist eine reine Funktion
 * von (Monster, Stufe, Welle) auf Zahlen. Es gibt nichts zu
 * migrieren und nichts, was auseinanderlaufen kann. Deshalb hier auch
 * kein versionierter Schlüssel und kein ts0() — beides wäre toter
 * Code. Sollte spätter doch Zustand nötig werden (z. B. „gesehene
 * Bestiarium-Einträge"), gehört der in ein eigenes Modul.
 *
 * WIRING:
 *   <script src="arena_waves.js"></script>   (Reihenfolge beliebig,
 *   das Modul hat keine Abhängigkeiten auf andere Arena-Module.)
 *
 * Selbsttest: `node arena_patches/arena_waves.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  /* ================================================================
   * SCHICHT 1 — DATEN
   * ================================================================ */

  /* ---- Elemente -------------------------------------------------
   * Die Schlüssel sind bewusst DIESELBEN wie in ui_prototype.html
   * (EL_ICON: fire/water/nature/earth/light/darkness) und die
   * asset-Keys dieselben Bild-Schlüssel (el_feuer …). Ein zweites
   * Vokabular hier wäre der schnellste Weg in eine stille
   * Fehlerklasse, bei der Turm-Element und Gegner-Element nicht
   * mehr zusammenfinden. */
  var ELEMENTS = [
    { key: "fire",     de: "Feuer",      asset: "el_feuer",      emoji: "🔥" },
    { key: "water",    de: "Wasser",     asset: "el_wasser",     emoji: "💧" },
    { key: "earth",    de: "Erde",       asset: "el_erde",       emoji: "⛰" },
    { key: "nature",   de: "Natur",      asset: "el_natur",      emoji: "🌿" },
    { key: "light",    de: "Licht",      asset: "el_licht",      emoji: "✨" },
    { key: "darkness", de: "Dunkelheit", asset: "el_dunkelheit", emoji: "🌑" },
  ];

  /* Gegnerklasse ohne jede Element-Bindung. AA hat genau das auch:
     im Element-Rad sitzt „Neutral" AUSSERHALB des Dreiecks und hat
     keinen einzigen Pfeil. Neutrale Gegner nehmen von jedem Element
     exakt 100 % Schaden — das ist der Anker, an dem sich alles
     andere messen lässt. */
  var NEUTRAL = "neutral";

  /* ---- Element-Matrix -------------------------------------------
   * AA-Regel WÖRTLICH aus dem Video (Frame t=5–9 s):
   *   „Units deal 20% extra damage to classes they're strong against
   *    and 20% less damage to those they're weak against."
   * Also +20 % / −20 %, nichts dazwischen. Das übernehmen wir 1:1.
   *
   * AAs Struktur: DREI Klassen im Kreis (Fire, Lightning, Ice) plus
   * Neutral daneben. Jede Klasse ist stark gegen GENAU EINE und
   * schwach gegen GENAU EINE. Wir haben sechs Elemente, also nehmen
   * wir ZWEI getrennte Dreier-Kreise — damit bleibt die AA-Eigenschaft
   * „stark gegen genau eins, schwach gegen genau eins" erhalten,
   * statt eine breite Matrix zu erfinden, die niemand mehr im Kopf hat.
   *
   *   Kreis A (Elementar):  Feuer → Natur → Wasser → Feuer
   *     Feuer verbrennt Natur · Natur saugt Wasser auf ·
   *     Wasser löscht Feuer
   *   Kreis B (Sphären):    Licht → Dunkelheit → Erde → Licht
   *     Licht vertreibt Dunkelheit · Dunkelheit zersetzt Erde ·
   *     Erde (Fels, Staub) verschluckt Licht
   *
   * A → B heißt: A ist STARK gegen B, also +20 % Schaden von A auf B
   * und −20 % Schaden von B auf A. Die Matrix ist damit
   * antisymmetrisch; genau das prüft der Selbsttest. */
  var STRONG_AGAINST = {
    fire: "nature",
    nature: "water",
    water: "fire",
    light: "darkness",
    darkness: "earth",
    earth: "light",
  };

  /* ---- Monster-Katalog -----------------------------------------
   * ### ALLES HIER IST PLATZHALTER ###
   * nameDe und artKey werden ersetzt, sobald die UI steht. Die
   * Rollen-Skelette (Schwarm / Distanz / Panzer / Flieger / Boss)
   * sollen dabei bleiben, damit die Wellenpläne weiter greifen.
   *
   * Felder:
   *   key        stabiler Schlüssel — NICHT umbenennen, WAVE_PLAN
   *              und Speicherstände hängen daran
   *   nameDe     Anzeigename (Platzhalter)
   *   artKey     Bild-Schlüssel (Platzhalter, noch kein Asset)
   *   element    eines der sechs Element-Keys oder NEUTRAL
   *   target     "ground" | "air_ground"  — AA zeigt das als
   *              „Target: Ground" bzw. „Target: Air & Ground";
   *              gemeint ist, welche Ebenen der Gegner angreifen kann
   *   movement   "slow" | "normal" | "fast" — in AA eine reine
   *              Textstufe, KEINE Zahl (nachgemessen: stufenunabhängig)
   *   attackSpeed  Angriffe pro Sekunde. In AA stufenUNabhängig
   *              (per Pixel-Diff über fünf Stufen bestätigt).
   *   hpFactor   Multiplikator auf die gemeinsame HP-Kurve
   *   dmgFactor  Multiplikator auf die gemeinsame Schadenskurve
   *   baseCount  Stückzahl in der ersten Welle, in der er auftaucht
   *   growth     Zuwachs der Stückzahl je Welle (relativ)
   *   fromWave   ab welcher Welle er überhaupt erscheint
   *   boss       true = erscheint NUR in Boss-Wellen
   *   descDe     Kurztext für die Guide-Karte (Platzhalter) */
  var MOBS = [
    { key: "ph_swarm",  nameDe: "Platzhalter Schwarm",  artKey: "mob_ph_swarm",
      element: NEUTRAL,    target: "ground",     movement: "fast",   attackSpeed: 1.20,
      hpFactor: 0.45, dmgFactor: 0.35, baseCount: 6, growth: 0.11, fromWave: 1,  boss: false,
      descDe: "PLATZHALTER — Einer ist ein Witz, ein Dutzend ist ein Problem." },

    { key: "ph_runner", nameDe: "Platzhalter Läufer",   artKey: "mob_ph_runner",
      element: "fire",     target: "ground",     movement: "fast",   attackSpeed: 0.85,
      hpFactor: 0.70, dmgFactor: 0.60, baseCount: 4, growth: 0.09, fromWave: 2,  boss: false,
      descDe: "PLATZHALTER — Schnell, dünn, und immer schon halb vorbei." },

    { key: "ph_archer", nameDe: "Platzhalter Schütze", artKey: "mob_ph_archer",
      element: "nature",   target: "air_ground", movement: "normal", attackSpeed: 1.00,
      hpFactor: 0.85, dmgFactor: 0.90, baseCount: 3, growth: 0.08, fromWave: 4,  boss: false,
      descDe: "PLATZHALTER — Trifft auch, was fliegt. Deckung hilft nicht." },

    { key: "ph_caster", nameDe: "Platzhalter Magier",   artKey: "mob_ph_caster",
      element: "darkness", target: "air_ground", movement: "normal", attackSpeed: 0.55,
      hpFactor: 1.00, dmgFactor: 1.35, baseCount: 2, growth: 0.07, fromWave: 7,  boss: false,
      descDe: "PLATZHALTER — Langsame Sprüche, unangenehme Wirkung." },

    { key: "ph_flyer",  nameDe: "Platzhalter Flieger",  artKey: "mob_ph_flyer",
      element: "light",    target: "air_ground", movement: "fast",   attackSpeed: 1.10,
      hpFactor: 0.80, dmgFactor: 0.80, baseCount: 3, growth: 0.08, fromWave: 10, boss: false,
      descDe: "PLATZHALTER — Klein, in der Luft, und nie daneben." },

    { key: "ph_tank",   nameDe: "Platzhalter Panzer",   artKey: "mob_ph_tank",
      element: "earth",    target: "ground",     movement: "slow",   attackSpeed: 0.45,
      hpFactor: 2.60, dmgFactor: 1.20, baseCount: 1, growth: 0.06, fromWave: 12, boss: false,
      descDe: "PLATZHALTER — Kommt spät an und bleibt dafür lange." },

    { key: "ph_brute",  nameDe: "Platzhalter Schläger", artKey: "mob_ph_brute",
      element: "water",    target: "ground",     movement: "normal", attackSpeed: 0.70,
      hpFactor: 1.40, dmgFactor: 1.50, baseCount: 2, growth: 0.07, fromWave: 15, boss: false,
      descDe: "PLATZHALTER — Schwere Waffe, schwererer Schwung." },

    { key: "ph_shield", nameDe: "Platzhalter Schildträger", artKey: "mob_ph_shield",
      element: NEUTRAL,    target: "ground",     movement: "slow",   attackSpeed: 0.60,
      hpFactor: 1.90, dmgFactor: 0.90, baseCount: 2, growth: 0.05, fromWave: 19, boss: false,
      descDe: "PLATZHALTER — Kein Element, keine Schwäche, viel Geduld." },

    /* hpFactor 20 ist nicht aus der Luft gegriffen: er ist der
       kleinste runde Wert, bei dem JEDE Boss-Welle mehr Gesamt-HP
       hat als die Welle davor, obwohl die Begleitung auf BOSS_ESCORT
       gedrosselt wird. Der Selbsttest prüft genau das — wer hier
       dreht, sieht sofort, wenn der Boss im Trash untergeht. */
    { key: "ph_boss",   nameDe: "Platzhalter Boss",     artKey: "mob_ph_boss",
      element: "darkness", target: "air_ground", movement: "slow",   attackSpeed: 0.50,
      hpFactor: 20.00, dmgFactor: 2.50, baseCount: 1, growth: 0.00, fromWave: 9, boss: true,
      descDe: "PLATZHALTER — Einer. Reicht." },
  ];

  /* ---- Wellenplan ----------------------------------------------
   * AA zeigt im Guide KEINE Wellenliste — nur einen Stufenregler
   * „LvL n/27" pro Gegner. 27 Stufen ist also belegt, die
   * WELLENZUSAMMENSETZUNG dagegen ist komplett unsere Erfindung.
   *
   * Wir setzen Welle == Stufe (Welle 7 zeigt Gegner auf Stufe 7).
   * Das ist die einfachste Abbildung, die AAs 27 Stufen ausnutzt,
   * und sie macht waveAt(n) und statsFor(k, n) deckungsgleich.
   *
   * Drei Akte à neun Wellen, Boss am Ende jedes Akts. 27 = 3 × 9
   * geht dabei ohne Rest auf — der Grund, überhaupt 9 zu wählen. */
  var MAX_WAVE = 27;
  var MAX_LEVEL = 27;          // gelesen: AA zeigt „LvL n/27"
  var BOSS_WAVES = [9, 18, 27];
  var ACT_LENGTH = 9;
  /* In Boss-Wellen wird die Begleitung gedrosselt, damit der Boss
     die Welle trägt und nicht im Trash untergeht. */
  var BOSS_ESCORT = 0.6;

  /* ================================================================
   * SCHICHT 2 — FORMELN
   * ================================================================ */

  /* ---- HP -------------------------------------------------------
   * GELESEN AUS AA, exakt. Sechs Messpunkte am Gegner „Skeleton",
   * alle sechs treffen auf die Einheit:
   *   Stufe  1 →     280      Stufe  2 →     419
   *   Stufe  4 →   1.210      Stufe  6 →   2.895
   *   Stufe 11 →  12.289      Stufe 24 →  84.904
   * Daraus:  HP(L) = floor(250 + 30 · L^2.5)
   * Der Abrundungsmodus ist mitgemessen: bei Stufe 2 liefert die
   * Kurve 419,706. AA zeigt 419, nicht 420 — also floor, nicht round.
   * Genau dieser eine Wert unterscheidet die beiden Varianten; ohne
   * ihn hätten wir hier round() stehen und wären um 1 daneben. */
  var HP_BASE = 250;
  var HP_COEFF = 30;
  var HP_EXP = 2.5;

  function refHp(level) {
    return Math.floor(HP_BASE + HP_COEFF * Math.pow(level, HP_EXP));
  }

  /* ---- Schaden --------------------------------------------------
   * NICHT sauber aus AA belegbar. Gelesene Werte am „Skeleton":
   *   Stufe  1 →   841      Stufe  4 → 1.153
   *   Stufe  6 → 1.153      Stufe 11 → 1.576      Stufe 24 → 2.424
   * Stufe 4 und Stufe 6 sind PIXELGLEICH, obwohl sich die HP im
   * selben Frame ändern — AAs Schadensfeld aktualisiert offenbar
   * nicht bei jedem Stufenschritt. Damit ist keine geschlossene
   * Form ableitbar, und wir raten hier auch nicht.
   *
   * ÜBERNOMMEN wird nur die AUSSAGE der Messung, und die ist für das
   * Balancing das Wertvollste am ganzen Video: Gegner-HP wächst von
   * Stufe 1 bis 24 um Faktor ~303, der Gegner-SCHADEN nur um ~2,9.
   * Gegner werden also fast ausschließlich zäher, kaum gefährlicher.
   *
   * Unsere Kurve ist eine affine Anpassung an die drei
   * vertrauenswürdigen Punkte (1 / 11 / 24) — GESCHÄTZT, nicht
   * gelesen: DMG(L) = floor(840 + 69 · (L − 1))
   * ergibt 840 / 1.530 / 2.427 gegen AAs 841 / 1.576 / 2.424. */
  var DMG_BASE = 840;
  var DMG_STEP = 69;

  function refDamage(level) {
    return Math.floor(DMG_BASE + DMG_STEP * (level - 1));
  }

  /* ---- Stückzahl ------------------------------------------------
   * KOMPLETT UNBELEGT (AA zeigt keine Wellenzusammensetzung).
   * Lineares Wachstum ab der Einstiegswelle des Monsters, damit die
   * Kurve vorhersagbar bleibt: die HP-Kurve ist mit L^2.5 schon
   * steil genug, eine zweite exponentielle Achse würde die späten
   * Wellen unspielbar machen. */
  function countAt(mob, wave) {
    var since = Math.max(0, wave - mob.fromWave);
    var n = Math.round(mob.baseCount * (1 + since * mob.growth));
    return Math.max(1, n);
  }

  /* ================================================================
   * SCHICHT 3 — API
   * ================================================================ */

  var EL_BY_KEY = {};
  ELEMENTS.forEach(function (e) { EL_BY_KEY[e.key] = e; });
  var MOB_BY_KEY = {};
  MOBS.forEach(function (m) { MOB_BY_KEY[m.key] = m; });

  function clampLevel(level) {
    var n = Number(level);
    if (!isFinite(n)) return 1;
    n = Math.floor(n);
    if (n < 1) return 1;
    if (n > MAX_LEVEL) return MAX_LEVEL;
    return n;
  }

  function clampWave(wave) {
    var n = Number(wave);
    if (!isFinite(n)) return 1;
    n = Math.floor(n);
    if (n < 1) return 1;
    if (n > MAX_WAVE) return MAX_WAVE;
    return n;
  }

  function elements() {
    return ELEMENTS.map(function (e) {
      return { key: e.key, de: e.de, asset: e.asset, emoji: e.emoji,
               strongAgainst: STRONG_AGAINST[e.key],
               weakAgainst: weakOf(e.key) };
    });
  }

  /* Gegen wen ist el schwach? Genau gegen den, der stark gegen el
     ist. Aus der einen Tabelle abgeleitet statt zweimal gepflegt —
     zwei Tabellen laufen garantiert irgendwann auseinander. */
  function weakOf(el) {
    var k;
    for (k in STRONG_AGAINST) {
      if (Object.prototype.hasOwnProperty.call(STRONG_AGAINST, k) &&
          STRONG_AGAINST[k] === el) return k;
    }
    return null;
  }

  /* elementRelation(a, b) → "stark" | "schwach" | "neutral"
     aus Sicht von a gegen b. */
  function elementRelation(a, b) {
    if (!EL_BY_KEY[a]) return "neutral";
    if (b === NEUTRAL || !EL_BY_KEY[b]) return "neutral";
    if (STRONG_AGAINST[a] === b) return "stark";
    if (STRONG_AGAINST[b] === a) return "schwach";
    return "neutral";
  }

  var BONUS = 1.2;   // gelesen: AA „20% extra damage"
  var MALUS = 0.8;   // gelesen: AA „20% less damage"

  /* damageFactor(elementKey, monsterKey)
     Faktor auf den Turmschaden. monsterKey darf auch direkt ein
     Element- oder Klassen-Key sein — dann wird der als Gegnerklasse
     gelesen. Unbekanntes liefert 1.0 statt zu werfen: ein fehlendes
     Element darf niemals einen Kampf abbrechen. */
  function damageFactor(elementKey, monsterKey) {
    var cls = null;
    if (MOB_BY_KEY[monsterKey]) cls = MOB_BY_KEY[monsterKey].element;
    else if (monsterKey === NEUTRAL || EL_BY_KEY[monsterKey]) cls = monsterKey;
    if (cls === null) return 1;
    var rel = elementRelation(elementKey, cls);
    if (rel === "stark") return BONUS;
    if (rel === "schwach") return MALUS;
    return 1;
  }

  /* matrix() → { elementKey: { klasse: faktor } }
     Vollständige Tabelle inklusive der Spalte NEUTRAL, damit die
     Guide-Ansicht sie ohne Zusatzlogik als Gitter rendern kann. */
  function matrix() {
    var out = {};
    ELEMENTS.forEach(function (a) {
      var row = {};
      ELEMENTS.forEach(function (b) { row[b.key] = damageFactor(a.key, b.key); });
      row[NEUTRAL] = 1;
      out[a.key] = row;
    });
    return out;
  }

  /* statsFor(monsterKey, level) → Werte eines Gegners auf einer Stufe.
     Gibt null zurück, wenn der Schlüssel unbekannt ist. */
  function statsFor(monsterKey, level) {
    var m = MOB_BY_KEY[monsterKey];
    if (!m) return null;
    var L = clampLevel(level);
    return {
      key: m.key,
      nameDe: m.nameDe,
      artKey: m.artKey,
      element: m.element,
      elementDe: EL_BY_KEY[m.element] ? EL_BY_KEY[m.element].de : "Neutral",
      target: m.target,
      movement: m.movement,
      attackSpeed: m.attackSpeed,   // stufenunabhängig (gemessen)
      level: L,
      maxLevel: MAX_LEVEL,
      hp: Math.floor(refHp(L) * m.hpFactor),
      damage: Math.floor(refDamage(L) * m.dmgFactor),
      boss: !!m.boss,
      placeholder: true,            // solange nameDe/artKey Platzhalter sind
    };
  }

  function all() {
    return MOBS.map(function (m) {
      return {
        key: m.key, nameDe: m.nameDe, artKey: m.artKey, element: m.element,
        target: m.target, movement: m.movement, attackSpeed: m.attackSpeed,
        hpFactor: m.hpFactor, dmgFactor: m.dmgFactor, fromWave: m.fromWave,
        boss: !!m.boss, descDe: m.descDe, placeholder: true,
      };
    });
  }

  /* bestiary(level) → genau das, was die Guide-Seite braucht.
     Ein Eintrag je Gegner, mit Werten auf `level` (Default 1) und
     zusätzlich den Werten auf der Maximalstufe, damit die Ansicht
     eine Spanne zeigen kann, ohne zweimal zu fragen. */
  function bestiary(level) {
    var L = clampLevel(level === undefined ? 1 : level);
    return MOBS.map(function (m) {
      var cur = statsFor(m.key, L);
      var max = statsFor(m.key, MAX_LEVEL);
      return {
        key: m.key,
        nameDe: m.nameDe,
        artKey: m.artKey,
        descDe: m.descDe,
        element: m.element,
        elementDe: cur.elementDe,
        elementAsset: EL_BY_KEY[m.element] ? EL_BY_KEY[m.element].asset : null,
        /* Aus Sicht des SPIELERS gedacht, denn genau so liest die
           Guide-Ansicht es vor: „Schwach gegen X, resistent gegen Y".
           weakTo      = Turm-Element, das +20 % auf diesen Gegner macht
           resistantTo = Turm-Element, das nur 80 % durchbringt
           Bei neutralen Gegnern beides null (AA: „Neutral" hat keine
           Pfeile im Element-Rad). */
        weakTo: EL_BY_KEY[m.element] ? weakOf(m.element) : null,
        resistantTo: EL_BY_KEY[m.element] ? STRONG_AGAINST[m.element] : null,
        target: m.target,
        movement: m.movement,
        attackSpeed: m.attackSpeed,
        level: L,
        maxLevel: MAX_LEVEL,
        hp: cur.hp,
        damage: cur.damage,
        hpAtMax: max.hp,
        damageAtMax: max.damage,
        fromWave: m.fromWave,
        boss: !!m.boss,
        placeholder: true,
      };
    });
  }

  function isBossWave(wave) {
    return BOSS_WAVES.indexOf(clampWave(wave)) >= 0;
  }

  /* waveAt(n) → Zusammensetzung, Stufe, Boss-Flag, Summen. */
  function waveAt(wave) {
    var n = clampWave(wave);
    var boss = isBossWave(n);
    var entries = [];
    MOBS.forEach(function (m) {
      if (m.boss && !boss) return;
      if (n < m.fromWave) return;
      var count = m.boss ? 1 : countAt(m, n);
      if (boss && !m.boss) count = Math.max(1, Math.round(count * BOSS_ESCORT));
      var s = statsFor(m.key, n);
      entries.push({
        key: m.key, nameDe: m.nameDe, artKey: m.artKey, element: m.element,
        target: m.target, movement: m.movement, boss: !!m.boss,
        count: count, level: n, hp: s.hp, damage: s.damage,
        hpTotal: s.hp * count,
      });
    });
    var totalHp = 0, totalCount = 0;
    entries.forEach(function (e) { totalHp += e.hpTotal; totalCount += e.count; });
    return {
      wave: n,
      level: n,
      act: Math.floor((n - 1) / ACT_LENGTH) + 1,
      boss: boss,
      final: n === MAX_WAVE,
      entries: entries,
      totalCount: totalCount,
      totalHp: totalHp,
    };
  }

  function waves() {
    var out = [];
    for (var n = 1; n <= MAX_WAVE; n++) out.push(waveAt(n));
    return out;
  }

  /* Die AA-Referenzkurve offen gelegt, damit die Doku und ein
     späterer Balance-Test dieselbe Quelle benutzen wie das Spiel. */
  function reference() {
    return {
      hpFormula: "floor(250 + 30 * L^2.5)",
      damageFormula: "floor(840 + 69 * (L - 1))",
      hpRead: { 1: 280, 2: 419, 4: 1210, 6: 2895, 11: 12289, 24: 84904 },
      damageRead: { 1: 841, 4: 1153, 6: 1153, 11: 1576, 24: 2424 },
      bonus: BONUS, malus: MALUS, maxLevel: MAX_LEVEL, maxWave: MAX_WAVE,
      bossWaves: BOSS_WAVES.slice(),
      hpAt: refHp, damageAt: refDamage,
    };
  }

  var API = {
    MAX_LEVEL: MAX_LEVEL,
    MAX_WAVE: MAX_WAVE,
    NEUTRAL: NEUTRAL,
    elements: elements,
    elementRelation: elementRelation,
    damageFactor: damageFactor,
    matrix: matrix,
    all: all,
    bestiary: bestiary,
    statsFor: statsFor,
    waveAt: waveAt,
    waves: waves,
    isBossWave: isBossWave,
    reference: reference,
  };

  if (typeof window !== "undefined") window.ArenaWaves = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_waves.js) ==== */
  if (typeof module !== "undefined" && require.main === module) {
    var fail = 0;
    var check = function (label, cond, info) {
      if (!cond) fail++;
      console.log((cond ? "  ok   " : "  FAIL ") + label +
                  (info !== undefined ? "  " + info : ""));
    };
    var noNaN = function (v) { return typeof v === "number" && isFinite(v); };

    console.log("\n--- Referenzkurve gegen die aus AA gelesenen Zahlen ---");
    var READ = reference().hpRead;
    Object.keys(READ).forEach(function (L) {
      check("HP(" + L + ") == AA " + READ[L], refHp(Number(L)) === READ[L], refHp(Number(L)));
    });
    check("HP nutzt floor, nicht round (Stufe 2 = 419)", refHp(2) === 419, refHp(2));
    check("HP(1) ist der Kurvenanfang 280", refHp(1) === 280);

    console.log("\n--- Skalierung: Monotonie und Randfälle ---");
    check("refHp streng steigend 1..27", (function () {
      for (var L = 2; L <= MAX_LEVEL; L++) if (refHp(L) <= refHp(L - 1)) return false;
      return true;
    })());
    check("refDamage streng steigend 1..27", (function () {
      for (var L = 2; L <= MAX_LEVEL; L++) if (refDamage(L) <= refDamage(L - 1)) return false;
      return true;
    })());
    check("HP je Monster streng steigend 1..27", (function () {
      return MOBS.every(function (m) {
        for (var L = 2; L <= MAX_LEVEL; L++) {
          if (statsFor(m.key, L).hp <= statsFor(m.key, L - 1).hp) return false;
        }
        return true;
      });
    })());
    check("Schaden je Monster nicht fallend 1..27", (function () {
      return MOBS.every(function (m) {
        for (var L = 2; L <= MAX_LEVEL; L++) {
          if (statsFor(m.key, L).damage < statsFor(m.key, L - 1).damage) return false;
        }
        return true;
      });
    })());
    check("Stufe 0 wird auf 1 geklemmt", statsFor("ph_swarm", 0).level === 1);
    check("Stufe -5 wird auf 1 geklemmt", statsFor("ph_swarm", -5).level === 1);
    check("Stufe 1 bleibt 1", statsFor("ph_swarm", 1).level === 1);
    check("Stufe 9999 wird auf 27 geklemmt", statsFor("ph_swarm", 9999).level === MAX_LEVEL);
    check("Stufe NaN wird auf 1 geklemmt", statsFor("ph_swarm", NaN).level === 1);
    check("Stufe undefined wird auf 1 geklemmt", statsFor("ph_swarm", undefined).level === 1);
    check("Stufe 3.7 wird abgeschnitten auf 3", statsFor("ph_swarm", 3.7).level === 3);
    check("kein NaN in Werten für Stufe -3..40", (function () {
      for (var L = -3; L <= 40; L++) {
        for (var i = 0; i < MOBS.length; i++) {
          var s = statsFor(MOBS[i].key, L);
          if (!noNaN(s.hp) || !noNaN(s.damage) || !noNaN(s.attackSpeed)) return false;
          if (s.hp < 1 || s.damage < 1) return false;
        }
      }
      return true;
    })());
    check("unbekanntes Monster liefert null statt zu werfen",
      statsFor("gibt_es_nicht", 5) === null);
    check("Panzer hat auf jeder Stufe mehr HP als der Schwarm", (function () {
      for (var L = 1; L <= MAX_LEVEL; L++) {
        if (statsFor("ph_tank", L).hp <= statsFor("ph_swarm", L).hp) return false;
      }
      return true;
    })());
    check("Bosswerte übersteigen jeden Nicht-Boss auf Stufe 27", (function () {
      var b = statsFor("ph_boss", 27).hp;
      return MOBS.filter(function (m) { return !m.boss; })
                 .every(function (m) { return statsFor(m.key, 27).hp < b; });
    })());
    check("Angriffsgeschwindigkeit ist stufenunabhängig (wie in AA)", (function () {
      return MOBS.every(function (m) {
        return statsFor(m.key, 1).attackSpeed === statsFor(m.key, 27).attackSpeed;
      });
    })());
    check("Bewegungsstufe ist stufenunabhängig (wie in AA)", (function () {
      return MOBS.every(function (m) {
        return statsFor(m.key, 1).movement === statsFor(m.key, 27).movement;
      });
    })());

    console.log("\n--- Element-Matrix ---");
    var M = matrix();
    check("elements() liefert sechs Elemente", elements().length === 6, elements().length);
    check("alle Element-Assets heißen el_*",
      elements().every(function (e) { return /^el_/.test(e.asset); }));
    check("Element-Keys sind die aus ui_prototype.html", (function () {
      var want = ["fire", "water", "earth", "nature", "light", "darkness"].sort();
      return ELEMENTS.map(function (e) { return e.key; }).sort().join(",") === want.join(",");
    })());
    check("Bonus ist +20 % (AA-Text)", BONUS === 1.2);
    check("Malus ist -20 % (AA-Text)", MALUS === 0.8);
    check("Diagonale ist neutral", ELEMENTS.every(function (e) { return M[e.key][e.key] === 1; }));
    check("jede Zeile hat genau einen Bonus", ELEMENTS.every(function (a) {
      return ELEMENTS.filter(function (b) { return M[a.key][b.key] === BONUS; }).length === 1;
    }));
    check("jede Zeile hat genau einen Malus", ELEMENTS.every(function (a) {
      return ELEMENTS.filter(function (b) { return M[a.key][b.key] === MALUS; }).length === 1;
    }));
    check("Matrix ist antisymmetrisch: 1.2 <=> Gegenrichtung 0.8",
      ELEMENTS.every(function (a) {
        return ELEMENTS.every(function (b) {
          if (M[a.key][b.key] === BONUS) return M[b.key][a.key] === MALUS;
          if (M[a.key][b.key] === MALUS) return M[b.key][a.key] === BONUS;
          return M[b.key][a.key] === 1;
        });
      }));
    check("nur die drei Faktoren 0.8/1.0/1.2 kommen vor",
      ELEMENTS.every(function (a) {
        return ELEMENTS.every(function (b) {
          return [MALUS, 1, BONUS].indexOf(M[a.key][b.key]) >= 0;
        });
      }));
    check("jedes Element ist stark gegen genau eines",
      ELEMENTS.every(function (e) { return !!EL_BY_KEY[STRONG_AGAINST[e.key]]; }));
    check("jedes Element ist schwach gegen genau eines",
      ELEMENTS.every(function (e) { return !!EL_BY_KEY[weakOf(e.key)]; }));
    check("kein Element ist gegen sich selbst stark",
      ELEMENTS.every(function (e) { return STRONG_AGAINST[e.key] !== e.key; }));
    check("Kreis A schließt: Feuer->Natur->Wasser->Feuer",
      STRONG_AGAINST.fire === "nature" && STRONG_AGAINST.nature === "water" &&
      STRONG_AGAINST.water === "fire");
    check("Kreis B schließt: Licht->Dunkelheit->Erde->Licht",
      STRONG_AGAINST.light === "darkness" && STRONG_AGAINST.darkness === "earth" &&
      STRONG_AGAINST.earth === "light");
    check("neutrale Gegner nehmen von allen Elementen 100 %",
      ELEMENTS.every(function (e) { return damageFactor(e.key, NEUTRAL) === 1; }));
    check("neutrale Monster-Keys ebenso",
      ELEMENTS.every(function (e) { return damageFactor(e.key, "ph_swarm") === 1; }));
    check("Feuer gegen Natur-Monster = 1.2", damageFactor("fire", "ph_archer") === BONUS);
    check("Natur gegen Wasser-Monster = 1.2", damageFactor("nature", "ph_brute") === BONUS);
    check("Wasser gegen Feuer-Monster = 1.2", damageFactor("water", "ph_runner") === BONUS);
    check("Feuer gegen Wasser-Monster = 0.8", damageFactor("fire", "ph_brute") === MALUS);
    check("Licht gegen Dunkelheit-Monster = 1.2", damageFactor("light", "ph_caster") === BONUS);
    check("Erde gegen Licht-Monster = 1.2", damageFactor("earth", "ph_flyer") === BONUS);
    check("Licht gegen Erde-Monster = 0.8", damageFactor("light", "ph_tank") === MALUS);
    check("Feuer gegen Erde-Monster ist neutral", damageFactor("fire", "ph_tank") === 1);
    check("unbekanntes Element liefert 1.0", damageFactor("plasma", "ph_archer") === 1);
    check("unbekanntes Monster liefert 1.0", damageFactor("fire", "gibt_es_nicht") === 1);
    check("elementRelation ist konsistent zur Matrix",
      ELEMENTS.every(function (a) {
        return ELEMENTS.every(function (b) {
          var r = elementRelation(a.key, b.key);
          var f = M[a.key][b.key];
          return (r === "stark" && f === BONUS) || (r === "schwach" && f === MALUS) ||
                 (r === "neutral" && f === 1);
        });
      }));

    console.log("\n--- Wellen ---");
    check("MAX_WAVE ist 27 (AA: LvL n/27)", MAX_WAVE === 27);
    check("waves() liefert 27 Wellen", waves().length === 27, waves().length);
    check("Boss-Wellen sind 9, 18, 27",
      [9, 18, 27].every(isBossWave) && !isBossWave(8) && !isBossWave(10) &&
      !isBossWave(17) && !isBossWave(19) && !isBossWave(26));
    check("genau drei Boss-Wellen unter 27", (function () {
      var c = 0;
      for (var n = 1; n <= MAX_WAVE; n++) if (waveAt(n).boss) c++;
      return c === 3;
    })());
    check("Welle 27 ist als Finale markiert", waveAt(27).final === true);
    check("nur Welle 27 ist Finale", (function () {
      for (var n = 1; n < MAX_WAVE; n++) if (waveAt(n).final) return false;
      return true;
    })());
    check("Akte sind 1,2,3", waveAt(1).act === 1 && waveAt(9).act === 1 &&
      waveAt(10).act === 2 && waveAt(18).act === 2 && waveAt(19).act === 3 &&
      waveAt(27).act === 3);
    check("Welle 0 wird auf 1 geklemmt", waveAt(0).wave === 1);
    check("Welle 999 wird auf 27 geklemmt", waveAt(999).wave === MAX_WAVE);
    check("Welle NaN wird auf 1 geklemmt", waveAt(NaN).wave === 1);
    check("Wellenstufe entspricht der Wellennummer", (function () {
      for (var n = 1; n <= MAX_WAVE; n++) if (waveAt(n).level !== n) return false;
      return true;
    })());
    check("jede Welle hat mindestens einen Eintrag", (function () {
      for (var n = 1; n <= MAX_WAVE; n++) if (waveAt(n).entries.length === 0) return false;
      return true;
    })());
    check("alle Stückzahlen >= 1", (function () {
      for (var n = 1; n <= MAX_WAVE; n++) {
        if (!waveAt(n).entries.every(function (e) { return e.count >= 1; })) return false;
      }
      return true;
    })());
    /* Boss-Wellen sind ABSICHTLICH ein Ausschlag: die Welle danach
       liegt darunter. Über ALLE Wellen streng steigend zu fordern
       wäre also falsch — geprüft wird deshalb getrennt:
       (a) die Normalwellen steigen untereinander streng,
       (b) jede Boss-Welle liegt über der Welle direkt davor. */
    check("Gesamt-HP der Normalwellen streng steigend", (function () {
      var prev = -1;
      for (var n = 1; n <= MAX_WAVE; n++) {
        if (waveAt(n).boss) continue;
        var t = waveAt(n).totalHp;
        if (t <= prev) return false;
        prev = t;
      }
      return true;
    })());
    check("jede Boss-Welle liegt über der Welle davor", (function () {
      return BOSS_WAVES.every(function (n) {
        return waveAt(n).totalHp > waveAt(n - 1).totalHp;
      });
    })());
    /* Der Boss soll die Welle TRAGEN, nicht Beilage sein: mindestens
       ein Viertel der Wellen-HP muss auf ihn entfallen. Ohne diese
       Schranke kann man hpFactor beliebig klein drehen, die Welle
       hieße weiter „Boss-Welle" und wäre keine. */
    check("Boss trägt mindestens 25 % der HP seiner Welle", (function () {
      return BOSS_WAVES.every(function (n) {
        var w = waveAt(n);
        var b = w.entries.filter(function (e) { return e.boss; })[0];
        return b && b.hpTotal >= w.totalHp * 0.25;
      });
    })());
    check("kein NaN in irgendeiner Welle", (function () {
      for (var n = -2; n <= 40; n++) {
        var w = waveAt(n);
        if (!noNaN(w.totalHp) || !noNaN(w.totalCount)) return false;
        if (!w.entries.every(function (e) {
          return noNaN(e.hp) && noNaN(e.damage) && noNaN(e.count) && noNaN(e.hpTotal);
        })) return false;
      }
      return true;
    })());
    check("Boss erscheint ausschließlich in Boss-Wellen", (function () {
      for (var n = 1; n <= MAX_WAVE; n++) {
        var hasBoss = waveAt(n).entries.some(function (e) { return e.boss; });
        if (hasBoss !== waveAt(n).boss) return false;
      }
      return true;
    })());
    check("kein Monster erscheint vor seiner fromWave", (function () {
      for (var n = 1; n <= MAX_WAVE; n++) {
        if (!waveAt(n).entries.every(function (e) {
          return n >= MOB_BY_KEY[e.key].fromWave;
        })) return false;
      }
      return true;
    })());
    check("Welle 1 enthält nur den Schwarm",
      waveAt(1).entries.length === 1 && waveAt(1).entries[0].key === "ph_swarm");
    check("hpTotal ist hp * count", (function () {
      for (var n = 1; n <= MAX_WAVE; n++) {
        if (!waveAt(n).entries.every(function (e) { return e.hpTotal === e.hp * e.count; })) return false;
      }
      return true;
    })());
    check("Sortenzahl wächst über die Wellen",
      waveAt(1).entries.length < waveAt(14).entries.length &&
      waveAt(14).entries.length < waveAt(27).entries.length);

    console.log("\n--- Bestiarium / Guide-Ansicht ---");
    check("bestiary() hat so viele Einträge wie all()",
      bestiary().length === all().length && bestiary().length === MOBS.length);
    check("alle Monster sind als Platzhalter markiert",
      all().every(function (m) { return m.placeholder === true; }));
    check("alle Platzhalternamen tragen 'Platzhalter'",
      all().every(function (m) { return /Platzhalter/.test(m.nameDe); }));
    check("alle Artwork-Keys tragen das Präfix mob_ph_",
      all().every(function (m) { return /^mob_ph_/.test(m.artKey); }));
    check("alle Beschreibungen sind als PLATZHALTER markiert",
      all().every(function (m) { return /PLATZHALTER/.test(m.descDe); }));
    check("bestiary() liefert Werte für Stufe und Maximalstufe",
      bestiary(5).every(function (b) {
        return b.level === 5 && b.maxLevel === 27 && b.hpAtMax > b.hp;
      }));
    check("bestiary() default ist Stufe 1",
      bestiary().every(function (b) { return b.level === 1; }));
    check("bestiary() klemmt Stufe 0 auf 1",
      bestiary(0).every(function (b) { return b.level === 1; }));
    check("Element-Asset ist gesetzt oder null bei neutral",
      bestiary().every(function (b) {
        return b.element === NEUTRAL ? b.elementAsset === null : /^el_/.test(b.elementAsset);
      }));
    check("target ist immer ground oder air_ground",
      all().every(function (m) { return ["ground", "air_ground"].indexOf(m.target) >= 0; }));
    check("movement ist immer slow, normal oder fast",
      all().every(function (m) { return ["slow", "normal", "fast"].indexOf(m.movement) >= 0; }));
    check("jedes Monster-Element ist bekannt oder neutral",
      all().every(function (m) { return m.element === NEUTRAL || !!EL_BY_KEY[m.element]; }));
    check("Monster-Keys sind eindeutig",
      Object.keys(MOB_BY_KEY).length === MOBS.length);
    check("weakTo/resistantTo im Bestiarium passen zur Matrix",
      bestiary().every(function (b) {
        if (b.element === NEUTRAL) return b.weakTo === null && b.resistantTo === null;
        return damageFactor(b.weakTo, b.key) === BONUS &&
               damageFactor(b.resistantTo, b.key) === MALUS;
      }));
    check("weakTo und resistantTo sind nie dasselbe Element",
      bestiary().every(function (b) { return b.weakTo !== b.resistantTo || b.weakTo === null; }));
    check("reference() legt beide Formeln offen",
      /L\^2\.5/.test(reference().hpFormula) && /69/.test(reference().damageFormula));
    var NEED = ["elements", "elementRelation", "damageFactor", "matrix", "all",
                "bestiary", "statsFor", "waveAt", "waves", "isBossWave", "reference"];
    check("API vollständig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
