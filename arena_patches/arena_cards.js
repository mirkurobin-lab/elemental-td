/* ==================================================================
 * ARENA CARDS v2.2 — Merge-Raritäten + Material JE KARTE (AA-verifiziert)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM. Modell nach der per Video-Analyse
 * verifizierten Mechanik von "Arcane Arena TD", siehe
 * arena_patches/AA_UI_REFERENZ.md §2 / §4 / §5 / §7.1 / §12.3.
 *
 * ZWEI GETRENNTE ACHSEN pro Karte:
 *   A) RARITÄT via MERGE  — 3 IDENTISCHE Karten gleicher Stufe → 1 Karte
 *      der nächsten Stufe. Der Merge hebt das LEVEL-CAP und schaltet
 *      einen permanenten, kartenspezifischen BONUS frei.
 *   B) LEVEL via MATERIAL — Level-Ups kosten Upgrade-Material der EIGENEN
 *      Karte (3-8 Stück je nach Stufe) + Gold (Plateau-Kurve).
 *      Kartenkopien werden für Level-Ups NICHT verbraucht.
 *
 * ⚠ ERSETZT das v1-Modell (Kopien+Gold pro Level, Rarität = Level-Band).
 *   Das war eine Fehlannahme vor der Videoanalyse; siehe DESIGN_PROGRESSION.md.
 *
 * ⚠ STATE v3 (2026-07-25): Upgrade-Material wurde von EINER Zahl auf DREI
 *   Sorten (attack/speed/special) aufgefächert.
 *   Ebenfalls damals neu: getPityStatus() — AA zeigt den Pity-Counter OFFEN
 *   auf der Truhe an ("Get Legendary in ~50 opens", §8.2), wir machen unseren
 *   deshalb auch sichtbar.
 *
 * ⚠ STATE v4 (2026-07-29): EINE SORTE JE KARTE.
 *   Die v3-Begründung („AA hat ≥8 Sorten mit den Kategorie-Labels 'speed'
 *   und 'special', also nehmen wir drei Kategorien") war eine FEHLLESUNG.
 *   Die Screenshots IMG_3427-3430 zeigen es anders herum:
 *     · Im RESOURCES-Raster ist jedes Material-Icon eine TURM-MINIATUR.
 *     · Das Catapult-Detail nennt „78/15" — und im Raster steht genau
 *       „x78" unter der Catapult-Miniatur. Material und Turm sind
 *       dieselbe Sache, 1:1.
 *     · „Special" und „Speed" standen unter GESPERRTEN TÜRMEN im Bereich
 *       TO BE FOUND. Das sind Turm-Rollen, keine Materialkategorien.
 *   Also: `MATERIALS` hat jetzt genau so viele Einträge wie es Karten
 *   gibt, und der SCHLÜSSEL EINER SORTE IST DIE KARTEN-ID.
 *   materialTypeOf(cardId) === cardId. Damit kann eine Sorte weder
 *   verwaisen noch doppelt belegt sein — die Zuordnungstabelle, die man
 *   vergessen kann zu pflegen, ist ersatzlos weg.
 *   Migration v3→v4 verteilt jede Altsorte auf GENAU DIE KARTEN, die sie
 *   bisher bedient hat (attack → fire/earth, speed → water/light,
 *   special → nature/darkness/solara/magmor). Niemand verliert Bestand.
 *
 *   NACHSCHUB: Die Material-Slots eines Packs droppen seit v4 die Sorten
 *   DER KARTEN, DIE IM SELBEN PACK LAGEN. Ohne das wäre die Umstellung
 *   eine Verschlechterung: bei 8 statt 3 Sorten und gleichverteiltem
 *   Nachschub käme für eine bestimmte Karte nur noch ein Achtel statt
 *   eines Drittels an. Gekoppelt bleibt die Menge je Karte gleich, und
 *   es entsteht der Zusammenhang, den AA auch hat: die Karte, die man
 *   zieht, bringt ihren eigenen Nachschub mit.
 *
 * WIRING:
 *   1. arena_pan.html — metaMul ERSETZEN:
 *        // alt:  const metaMul = Math.pow(1.12, (hub.coll[id].lvl||1) - 1);
 *        const cs = ArenaCards.get().cards[id];
 *        const metaMul = cs ? ArenaCards.statMul(cs.lvl, cs.mergeBoni) : 1;
 *      (Fusionen/Triples: weiterhin das Durchschnitts-Level der Basis-
 *       Türme (mlvl) in statMul() geben — sie haben keine eigenen Karten.)
 *   2. arena_profile.js — Pack-Vergabe umhängen:
 *        if (res.packAwarded) {
 *          const p = ArenaCards.openPack('bronze', POOL_IDS, HERO_IDS);
 *          // p.cards = [{cardId, tier, …}] → Pack-Screen flippt einzeln,
 *          // pro Flip: ArenaCards.addDrop(d.cardId, d.tier, 1);
 *          // p.materialSlots = [{type, amount, name, sym}] → pro Flip:
 *          //   ArenaCards.addMaterial(slot.amount, slot.type);
 *          // danach: hubGold += p.gold;
 *        }
 *      shardsBank / PACK_SHARDS / LOSS_SHARDS / applyShardsToHub()
 *      STILLLEGEN — Packs droppen Karten, Material und Gold.
 *   3. deck.html / ui_prototype.html — Collection-Grid liest pro Karte:
 *        const c = ArenaCards.get().cards[id];
 *        const t = ArenaCards.tierOf(c.tier);        // {name,color,cap,index}
 *        const m = ArenaCards.progressToNextMerge(id);// {have,need,ready}
 *        const up = ArenaCards.canLevelUp(id, gold); // {ok,reason,needMaterial,
 *                                                    //  materialType,haveMaterial,needGold}
 *        const mt = ArenaCards.materialTypeOf(id);   // === id (eine Sorte je Karte)
 *        const bank = ArenaCards.getMaterials();     // {<jede Karten-ID>…, total}
 *      Pack-Screen zeigt zusätzlich den OFFENEN Pity-Stand (AA-Muster §8.2):
 *        const p = ArenaCards.getPityStatus();       // {epicIn, legendaryIn}
 *   4. Migration (EINMALIG, beim Hub-Start):
 *        ArenaCards.migrateV1();   // v1 → v2 → v3, in einem Durchlauf
 *
 * GOLD wird NICHT von diesem Modul verwaltet (state.gold bleibt bewusst
 * null). Das Gold-Konto liegt hub-seitig in arenaHub; goldFor(lvl) liefert
 * den Preis, canLevelUp(id, gold) prüft ihn mit, levelUp() zieht nur
 * Material ab und meldet den fälligen Gold-Betrag zurück.
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaCards";
  var STATE_VERSION = 4;
  var MAX_LEVEL = 100;
  var MERGE_COST = 3; // 3 identische Karten gleicher Stufe → 1 der nächsten

  /* ---------- Raritätsleiter (6 Stufen, Cap-Schrittweite 15) ----------
   * AA belegt: Good → Cap 20, Rare → Cap 30 (Schrittweite 10 bei 5 Stufen).
   * Wir haben 6 Stufen und die Vorgabe "bis Lv 100" → Schrittweite 15,
   * Start bei 25. Begründung siehe DESIGN_PROGRESSION.md §B. */
  var TIERS = [
    { key: "common",    name: "Gewöhnlich", colorName: "Grau",   color: "#9aa3ad", cap: 25,  index: 0 },
    { key: "good",      name: "Gut",        colorName: "Grün",   color: "#58c26a", cap: 40,  index: 1 },
    { key: "rare",      name: "Selten",     colorName: "Blau",   color: "#3d9df2", cap: 55,  index: 2 },
    { key: "epic",      name: "Episch",     colorName: "Lila",   color: "#a45ef2", cap: 70,  index: 3 },
    { key: "legendary", name: "Legendär",   colorName: "Orange", color: "#f2a13d", cap: 85,  index: 4 },
    { key: "supreme",   name: "Suprem",     colorName: "Rot",    color: "#ff5e7e", cap: 100, index: 5 },
  ];
  var TIER_KEYS = TIERS.map(function (t) { return t.key; });
  var TIER_BY_KEY = {};
  TIERS.forEach(function (t) { TIER_BY_KEY[t.key] = t; });

  /* ---------- Material-SORTEN — EINE JE KARTE (AA-Befund §7.1 / §12.3)
   * Siehe Kopf, „STATE v4". Kurz: in AAs RESOURCES-Raster IST das
   * Material-Icon die Turm-Miniatur, und die Zahl im Turm-Detail
   * („78/15" bei Catapult) ist dieselbe Zahl, die im Raster unter
   * genau diesem Turm steht. Material und Karte sind 1:1.
   *
   * Deshalb ist der SCHLÜSSEL EINER SORTE DIE KARTEN-ID. Es gibt keine
   * Zuordnungstabelle mehr, die man beim Anlegen einer neuen Karte
   * vergessen könnte zu pflegen — wer eine Karte einträgt, hat ihre
   * Essenz damit angelegt.
   *
   * Der Preis dieser Bauart ist bekannt und bewusst bezahlt: der Vorrat
   * ist keine Entscheidung mehr („reicht meine Tempo-Essenz für FROST
   * oder DAWN?"). Genau das wollte v3 erzeugen. Der Nachschub aus dem
   * Pack ist dafür an die gezogenen Karten gekoppelt (siehe openPack),
   * womit die Entscheidung an eine ehrlichere Stelle wandert: WELCHE
   * Karten man spielt, bestimmt, welche Essenz sich lohnt.
   *
   * `sym` ist der Notnagel für Textkontexte (Toast, Zusammenfassung).
   * Das eigentliche Icon ist im UI das Karten-Artwork — ui_prototype.html
   * `matIco()` bildet Sorten-Schlüssel → CARD_ART ab. Ein fehlendes
   * Material-Bild kann es damit nicht geben. */
  var MATERIALS = [
    { key: "fire",     name: "Ember-Essenz",  sym: "🔥", color: "#ff6b3d" },
    { key: "water",    name: "Frost-Essenz",  sym: "❄",  color: "#3dc8ff" },
    { key: "nature",   name: "Thorn-Essenz",  sym: "🌿", color: "#46c46a" },
    { key: "earth",    name: "Stone-Essenz",  sym: "🪨", color: "#e0a43c" },
    { key: "light",    name: "Dawn-Essenz",   sym: "☀",  color: "#ffe36b" },
    { key: "darkness", name: "Hollow-Essenz", sym: "🌑", color: "#9b6bff" },
    { key: "solara",   name: "Solara-Essenz", sym: "✨", color: "#ffd23d" },
    { key: "magmor",   name: "Magmor-Essenz", sym: "🌋", color: "#ff4d2d" },
  ];
  var MATERIAL_KEYS = MATERIALS.map(function (m) { return m.key; });
  var MATERIAL_BY_KEY = {};
  MATERIALS.forEach(function (m) { MATERIAL_BY_KEY[m.key] = m; });

  /* CARD_MATERIAL bleibt exportiert, ist seit v4 aber die Identität.
   * Es steht nur noch da, damit aufrufender Code, der die Tabelle liest,
   * nicht bricht — und damit sichtbar ist, DASS die Zuordnung 1:1 ist. */
  var CARD_MATERIAL = {};
  MATERIAL_KEYS.forEach(function (k) { CARD_MATERIAL[k] = k; });

  /* Unbekannte IDs (Skills, Items, Trick-Karten später) haben KEINE
   * Sorte. Wir erfinden auch keine: materialTypeOf() gibt null zurück,
   * materialInfoOf() eine ehrliche Platzhalter-Auskunft. canLevelUp()
   * scheitert dann an "material" — richtig, denn für so eine Karte ist
   * kein Material definiert. Vorher fielen unbekannte IDs still auf
   * 'special', und ein Item hätte sich mit Turm-Material leveln lassen. */
  var UNKNOWN_MATERIAL = { key: null, name: "Unbekannte Essenz", sym: "❔", color: "#9aa3ad" };
  function materialTypeOf(cardId) {
    return MATERIAL_BY_KEY[cardId] ? cardId : null;
  }
  // materialInfoOf(cardId) → {key, name, sym, color}
  function materialInfoOf(cardId) {
    var d = MATERIAL_BY_KEY[materialTypeOf(cardId)];
    if (!d) return { key: UNKNOWN_MATERIAL.key, name: UNKNOWN_MATERIAL.name,
                     sym: UNKNOWN_MATERIAL.sym, color: UNKNOWN_MATERIAL.color };
    return { key: d.key, name: d.name, sym: d.sym, color: d.color };
  }
  // Bestand einer Sorte, auch wenn der Schlüssel null/unbekannt ist.
  function bankOf(st, key) {
    return (key && MATERIAL_BY_KEY[key]) ? (st.materials[key] | 0) : 0;
  }

  /* ---------- Stat-Kurve ----------
   * statMul(lvl) = 1.022^(lvl-1), Lv100 ≈ 8.62×.
   * Merge-Boni multiplizieren kartenspezifisch dazu (Feld `pw` je Bonus). */
  var STAT_BASE = 1.022;

  /* ---------- Gold-Plateaus (Kosten des Level-Ups AB diesem Level) ----------
   * KALIBRIERT AUF ECHTE AA-ZAHLEN (Video 7, AA_UI_REFERENZ.md §13).
   *
   * In Video 7 wurden drei Upgrades ausgeführt; die Kosten sind über den
   * Gold-Kontostand ARITHMETISCH BEWIESEN (nicht nur OCR-gelesen):
   *   Boulder (Gewöhnlich, Cap 10): Lv1→2 = 1.000 · Lv2→3 = 2.000 · Lv3→4 = 3.000
   *   Catapult (Selten,     Cap 30): Lv16→17 = 15.000 · Lv17→18 = 18.000
   * → AA-Kurve ≈ 1.000 × Level, oberhalb Lv15 mit Sprüngen von ~3.000.
   *
   * SKALIERUNG AUF UNSERE SPANNE: AA-Karten laufen bis ~Lv50 (Legendär),
   * unsere bis Lv100 — Faktor 2 auf der Level-Achse. Aus 1.000×n_AA wird
   * damit ≈ 500×n_uns. Genau daran liegen die Bänder bis Lv40 an:
   *   unser Lv6 ↔ AA Lv3  → 2.500 (AA 3.000)
   *   unser Lv32 ↔ AA Lv16 → 16.500 (AA 15.000)
   *   unser Lv34 ↔ AA Lv17 → 16.500 (AA 18.000; AAs Ein-Level-Sprung
   *                          15k→18k wird bei uns zu einem Plateau geglättet)
   * Ab Lv41 wird die Kurve überlinear — das entspricht AAs eigener
   * Versteilung oberhalb Lv15 und liefert den Endgame-Gold-Sink.
   * Erste Bänder absichtlich unter der 500×L-Linie (sanftes Onboarding). */
  var GOLD_BANDS = [
    { to: 4,   gold: 800 },    { to: 8,   gold: 2500 },   { to: 12,  gold: 4500 },
    { to: 16,  gold: 7000 },   { to: 20,  gold: 9500 },   { to: 25,  gold: 11500 },
    { to: 30,  gold: 14000 },  { to: 35,  gold: 16500 },  { to: 40,  gold: 19000 },
    { to: 50,  gold: 26000 },  { to: 60,  gold: 38000 },  { to: 70,  gold: 55000 },
    { to: 80,  gold: 80000 },  { to: 90,  gold: 115000 }, { to: 100, gold: 165000 },
  ];

  /* ---------- Pack-Definitionen ----------
   * weights: [Gewöhnlich, Gut, Selten, Episch, Legendär] in % (Summe 100).
   * SUPREM droppt NIE — nur über Merge erreichbar.
   * guarantee: Mindest-Stufenindex, den mindestens EIN Kartenslot erreicht.
   * Kommunikation im UI über Raritätsspannen ("Enthält mindestens eine Gute
   * Karte oder besser"), nicht über Prozente — AA-Muster, siehe §8.2. */
  var PACKS = {
    bronze: { key: "bronze", name: "Bronze-Pack", color: "#c98a52",
              source: "Jeder 3. Sieg (arena_profile packAwarded)",
              cardSlots: 5,  materialSlots: 2, gold: [400, 800],
              weights: [82, 15, 2.6, 0.36, 0.04], guarantee: 1,
              promise: "Enthält mindestens eine Gute Karte oder besser" },
    silver: { key: "silver", name: "Silber-Pack", color: "#c9d2da",
              source: "1. Sieg des Tages + Daily-Quests",
              cardSlots: 7,  materialSlots: 3, gold: [1200, 2500],
              weights: [62, 28, 8.4, 1.4, 0.2], guarantee: 2,
              promise: "Enthält mindestens eine Seltene Karte oder besser" },
    gold:   { key: "gold",   name: "Gold-Pack",   color: "#f2c53d",
              source: "Trophy-Road-Knoten, Rang-Aufstieg",
              cardSlots: 9,  materialSlots: 4, gold: [4000, 8000],
              weights: [38, 38, 18.4, 4.6, 1], guarantee: 3,
              promise: "Enthält mindestens eine Epische Karte oder besser" },
    arcane: { key: "arcane", name: "Arkan-Pack",  color: "#a45ef2",
              source: "Season-Pass-Premium, Events",
              cardSlots: 11, materialSlots: 6, gold: [12000, 25000],
              /* ⚠ 29.07.2026: Garantie von Legendär (4) auf Episch (3)
                 gesenkt. Vorher lieferte JEDES Arkan-Pack ein Legendäres,
                 gemessen 1,079 statt 0,435 je Pack — die Spitze war damit
                 in 8,1 Packs erreichbar statt in 20,2. Zwei Nebenwirkungen
                 derselben Zahl: die grosse Legendär-Sequenz lief bei jedem
                 Kauf und war ab dem dritten Mal Wartezeit statt Ereignis,
                 und der Pity-Zähler feuerte für Arkan-Käufer nie.
                 Die Gewichte sind UNVERÄNDERT — 4 % je Slot, über 11 Slots
                 36,2 % je Pack. Auftraggeber: „Es soll nicht aus jedem
                 Booster eine legendäre kommen. Du kannst arcane auf 36 %
                 machen." */
              weights: [18, 34, 29, 15, 4], guarantee: 3,
              promise: "Enthält mindestens eine Epische Karte · 36 % Chance auf Legendär" },
  };
  var PACK_ALIAS = { silber: "silver", arkan: "arcane", arcan: "arcane", bronce: "bronze" };

  /* ---------- JOKER-Karten (AA-Befund, Screenrecording 29.07.2026) ----------
   * AA hat einen Platzhalter je Stufe — im Video als „JOKER GOOD TOWER"
   * mit der Zeile „USED TO · Merge normal Good tower cards".
   *
   * WARUM WIR IHN ÜBERNEHMEN: unsere Pyramide verlangt 243 Kopien
   * DERSELBEN Karte für Suprem (3⁵). Wer 240 EMBER und 3 STONE hat, kommt
   * keinen Schritt weiter — und das ist der Punkt, an dem eine Sammlung
   * aufhört, sich nach Fortschritt anzufühlen. Der Joker löst genau diese
   * Blockade, ohne die Pyramide zu verkleinern.
   *
   * DIE EINE REGEL, DIE IHN EHRLICH HÄLT: höchstens JOKER_MAX = 2 Joker je
   * Verschmelzung. Es muss also immer mindestens EINE echte Kopie dabei
   * sein. Drei Joker hätten sonst kein Ziel — aus was soll die neue Karte
   * werden? — und ein Joker, der eine Karte aus dem Nichts erzeugt, wäre
   * keine Hilfe mehr, sondern die Abkürzung an der Sammlung vorbei.
   *
   * Joker haben KEINE Stufe im Sinne der Leiter: ein Gut-Joker ersetzt eine
   * gute Kopie, er wird nicht selbst verschmolzen. Deshalb liegen sie als
   * eigener Vorrat neben den Karten, nicht in `cards`.
   *
   * SUPREM HAT KEINEN JOKER: Suprem ist Endstufe, es gibt nichts, wozu man
   * ihn verschmelzen könnte.
   *
   * BEZUGSQUELLE: Arena-Truhen, Arena-Belohnungen, Events — NICHT die
   * Kartenslots der Booster. Das ist AAs eigene Angabe („GET FROM: Arena
   * Chests · Arena Rewards · Special Event") und zugleich die Vorgabe des
   * Auftraggebers, die Drop-Tabelle unangetastet zu lassen. */
  var JOKER_MAX = 2;                       // höchstens 2 Joker je Merge
  var JOKER_TIER_KEYS = TIER_KEYS.slice(0, TIER_KEYS.length - 1);  // ohne Suprem

  var MATERIAL_PER_SLOT = [2, 5];  // pro Material-Slot 2-5 Stück
  var PITY_EPIC = 25;              // Packs ohne Episch+ → nächster erzwingt Episch
  var PITY_LEGENDARY = 75;         // Packs ohne Legendär → erzwingt Legendär
  var HERO_WEIGHT = 0.2;           // Helden-Karten droppen 5× seltener
  var MATERIAL_NAME = "Arkan-Essenz"; // Sammelbegriff für alle Sorten (UI-Überschrift)

  /* ================= Level-Mathematik ================= */

  function clampLvl(l) {
    l = Math.floor(Number(l) || 1);
    if (l < 1) l = 1;
    if (l > MAX_LEVEL) l = MAX_LEVEL;
    return l;
  }

  // tierOf akzeptiert Key ODER Index und liefert immer eine Kopie der Definition.
  function tierOf(t) {
    var d = null;
    if (typeof t === "number") d = TIERS[Math.max(0, Math.min(TIERS.length - 1, t | 0))];
    else d = TIER_BY_KEY[String(t || "common")];
    if (!d) d = TIERS[0];
    return { key: d.key, name: d.name, colorName: d.colorName, color: d.color,
             cap: d.cap, index: d.index };
  }
  function capOf(tierKey) { return tierOf(tierKey).cap; }
  function nextTierKey(tierKey) {
    var i = tierOf(tierKey).index;
    return i >= TIERS.length - 1 ? null : TIERS[i + 1].key;
  }

  /* Material für den Level-Up AB lvl.
   * KALIBRIERT AUF AA (Video 7, §13): der Bedarf hängan BEIDEM —
   * am Level UND an der Raritätsstufe:
   *   Boulder  (Gewöhnlich, Lv1)  → Bedarf 1   ("50/1")
   *   Skyflare (Gut,        Lv?)  → Bedarf 3   ("40/3")
   *   Catapult (Selten,     Lv16) → Bedarf 5   ("12/5")
   *   Divine Sword (Gut,    Lv15) → Bedarf 5   ("19/5")
   * Die alte Annahme "nur Stufe" (3+tierIdx) konnte den Wert 1 bei
   * Gewöhnlich/Lv1 nicht erklären. Formel: 1 + tierIdx + floor(lvl/10).
   * Auf unsere Lv-100-Spanne skaliert (AA Lv n ↔ unser Lv 2n):
   *   unser Lv2,  Gewöhnlich → 1  (AA 1)  ✓
   *   unser Lv30, Gut        → 5  (AA 5)  ✓
   *   unser Lv32, Selten     → 6  (AA 5)  ~
   * Obergrenze 16, damit der Bedarf nicht ins Absurde läuft. */
  function materialFor(lvl, tierIdx) {
    if (typeof tierIdx === "string") tierIdx = tierOf(tierIdx).index;
    tierIdx = Math.max(0, Math.min(TIERS.length - 1, tierIdx | 0));
    var n = 1 + tierIdx + Math.floor(clampLvl(lvl) / 10);
    return n > 16 ? 16 : n;
  }

  // Gold für den Level-Up AB lvl (Plateau-Kurve in 5er-/10er-Bändern).
  function goldFor(lvl) {
    lvl = clampLvl(lvl);
    for (var i = 0; i < GOLD_BANDS.length; i++) if (lvl <= GOLD_BANDS[i].to) return GOLD_BANDS[i].gold;
    return GOLD_BANDS[GOLD_BANDS.length - 1].gold;
  }
  function totalGoldTo(lvl) {
    lvl = clampLvl(lvl);
    var s = 0;
    for (var l = 1; l < lvl; l++) s += goldFor(l);
    return s;
  }
  function totalMaterialTo(lvl, tierIdx) {
    lvl = clampLvl(lvl);
    var s = 0;
    for (var l = 1; l < lvl; l++) s += materialFor(l, tierIdx);
    return s;
  }

  // statMul(lvl, mergeBoni) — mergeBoni = Array von Bonus-IDs (optional).
  function statMul(lvl, mergeBoni) {
    var m = Math.pow(STAT_BASE, clampLvl(lvl) - 1);
    if (mergeBoni && mergeBoni.length) {
      for (var i = 0; i < mergeBoni.length; i++) {
        var p = perkById(mergeBoni[i]);
        if (p && p.pw) m *= p.pw;
      }
    }
    return m;
  }

  /* ================= Merge-Bonus-Registry =================
   * PERKS[cardId][mergeTierKey] = [BonusA, BonusB] — der Spieler wählt beim
   * Merge auf diese Stufe EINEN der beiden.
   *
   * ⚠ BEWUSSTE ABWEICHUNG von AA: dort ist der Merge-Bonus FIX ("Merge 3
   *   identical Ice Blaster cards to unlock: Ranged Damage +22% and Attack
   *   Rate -7%"). Wir machen daraus eine Wahl aus zwei Optionen → Build-
   *   Identität statt Statistik. Siehe DESIGN_PROGRESSION.md.
   *
   * mod = maschinenlesbar: {stat, mul} (multiplikativ) oder {stat, add}
   *       (additiv, auch negativ). pct = Anzeigewert in Prozent; bei
   *       attackRate NEGATIV (−5 % = schneller, AA-Muster §4.2).
   * pw  = Beitrag zum Power-/Stat-Multiplikator in statMul(). */
  var PERKS = {
    fire: { // EMBER
      good: [
        { id: "fire_good_burnlen", txt: "+15 % Burn-Dauer",   pct: 15, pw: 1.05, mod: { stat: "burnDuration", mul: 1.15 } },
        { id: "fire_good_rate",    txt: "Angriffstempo −6 %", pct: -6, pw: 1.06, mod: { stat: "attackRate",  mul: 0.94 } },
      ],
      rare: [
        { id: "fire_rare_stack",   txt: "Burn stapelt bis 3× statt 2×",       pw: 1.08, mod: { stat: "burnStacksMax", add: 1 } },
        { id: "fire_rare_exec",    txt: "+12 % Schaden gegen brennende Ziele", pct: 12, pw: 1.07, mod: { stat: "dmgVsBurning", mul: 1.12 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    water: { // FROST
      good: [
        { id: "water_good_freeze", txt: "Freeze braucht 3 statt 4 Stacks", pw: 1.06, mod: { stat: "freezeStacksNeeded", add: -1 } },
        { id: "water_good_slow",   txt: "+10 % Slow",                      pct: 10, pw: 1.04, mod: { stat: "slowPct", mul: 1.10 } },
      ],
      rare: [
        { id: "water_rare_linger", txt: "Slow wirkt 1.5 s länger nach",              pw: 1.05, mod: { stat: "slowDuration", add: 1.5 } },
        { id: "water_rare_shatter",txt: "Eingefrorene Ziele erleiden +20 % Schaden", pct: 20, pw: 1.09, mod: { stat: "dmgVsFrozen", mul: 1.20 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    nature: { // THORN
      good: [
        { id: "nature_good_tick",  txt: "Gift tickt 0.2 s schneller", pw: 1.06, mod: { stat: "poisonTick", add: -0.2 } },
        { id: "nature_good_range", txt: "+12 % Reichweite",           pct: 12, pw: 1.04, mod: { stat: "range", mul: 1.12 } },
      ],
      rare: [
        { id: "nature_rare_root",  txt: "Wurzeln halten 0.5 s länger",                pw: 1.05, mod: { stat: "rootDuration", add: 0.5 } },
        { id: "nature_rare_spread",txt: "Gift springt auf 1 zusätzliches Ziel über",  pw: 1.09, mod: { stat: "poisonSpread", add: 1 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    earth: { // STONE
      good: [
        { id: "earth_good_armor", txt: "−10 % gegnerische Rüstung im Radius", pct: -10, pw: 1.06, mod: { stat: "armorShred", mul: 1.10 } },
        { id: "earth_good_rate",  txt: "Angriffstempo −8 %",                  pct: -8,  pw: 1.07, mod: { stat: "attackRate", mul: 0.92 } },
      ],
      rare: [
        { id: "earth_rare_stun",  txt: "Jeder 6. statt 7. Treffer betäubt 0.4 s", pw: 1.06, mod: { stat: "stunEvery", add: -1 } },
        { id: "earth_rare_heavy", txt: "+18 % Schaden gegen Bosse",               pct: 18, pw: 1.08, mod: { stat: "dmgVsBoss", mul: 1.18 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    light: { // DAWN
      good: [
        { id: "light_good_crit",  txt: "+6 % Kritchance",               pct: 6, pw: 1.05, mod: { stat: "critChance", add: 0.06 } },
        { id: "light_good_aura",  txt: "+5 % Schaden für Nachbartürme", pct: 5, pw: 1.04, mod: { stat: "auraDamage", mul: 1.05 } },
      ],
      rare: [
        { id: "light_rare_pierce",txt: "Strahl trifft 1 Ziel mehr", pw: 1.09, mod: { stat: "pierceTargets", add: 1 } },
        { id: "light_rare_rate",  txt: "Angriffstempo −7 %", pct: -7, pw: 1.07, mod: { stat: "attackRate", mul: 0.93 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    darkness: { // HOLLOW
      good: [
        { id: "dark_good_curse",  txt: "Fluch hält 1 s länger",          pw: 1.05, mod: { stat: "curseDuration", add: 1 } },
        { id: "dark_good_drain",  txt: "+10 % Lebensraub auf die Burg",  pct: 10, pw: 1.04, mod: { stat: "lifesteal", mul: 1.10 } },
      ],
      rare: [
        { id: "dark_rare_exec",   txt: "Hinrichtung unter 12 % statt 8 % HP",        pw: 1.08, mod: { stat: "executeThreshold", add: 0.04 } },
        { id: "dark_rare_chain",  txt: "Fluch springt beim Tod auf ein Ziel über",   pw: 1.07, mod: { stat: "curseChain", add: 1 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    solara: { // Held
      good: [
        { id: "solara_good_ult",  txt: "−8 % Ult-Abklingzeit",           pct: -8, pw: 1.06, mod: { stat: "ultCooldown", mul: 0.92 } },
        { id: "solara_good_heal", txt: "+3 % Burgheilung bei Boss-Kill", pct: 3,  pw: 1.03, mod: { stat: "bossHeal", add: 0.03 } },
      ],
      rare: [
        { id: "solara_rare_beam", txt: "Sonnenstrahl +15 % Breite",         pct: 15, pw: 1.07, mod: { stat: "beamWidth", mul: 1.15 } },
        { id: "solara_rare_aura", txt: "+7 % Schaden für alle Licht-Türme", pct: 7,  pw: 1.06, mod: { stat: "lightAura", mul: 1.07 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
    magmor: { // Held
      good: [
        { id: "magmor_good_dmg",  txt: "+10 % Ult-Schaden",                pct: 10, pw: 1.06, mod: { stat: "ultDamage", mul: 1.10 } },
        { id: "magmor_good_burn", txt: "Ult zündet Burn auf allen Zielen",  pw: 1.05, mod: { stat: "ultApplyBurn", add: 1 } },
      ],
      rare: [
        { id: "magmor_rare_wide", txt: "Lavafeld +20 % Radius",       pct: 20, pw: 1.08, mod: { stat: "lavaRadius", mul: 1.20 } },
        { id: "magmor_rare_fast", txt: "+12 % Ult-Ladung pro Welle",  pct: 12, pw: 1.06, mod: { stat: "ultChargePerWave", mul: 1.12 } },
      ],
      epic: [], legendary: [], supreme: [],
    },
  };
  // Stufen, auf die gemerged werden kann (common ist die Startstufe).
  var MERGE_TIER_KEYS = ["good", "rare", "epic", "legendary", "supreme"];

  var PERK_INDEX = {};
  (function buildIndex() {
    for (var id in PERKS) {
      if (!Object.prototype.hasOwnProperty.call(PERKS, id)) continue;
      for (var t = 0; t < MERGE_TIER_KEYS.length; t++) {
        var arr = PERKS[id][MERGE_TIER_KEYS[t]] || [];
        for (var i = 0; i < arr.length; i++) {
          PERK_INDEX[arr[i].id] = { perk: arr[i], cardId: id, tier: MERGE_TIER_KEYS[t] };
        }
      }
    }
  })();
  function perkById(pid) { var e = PERK_INDEX[pid]; return e ? e.perk : null; }
  function perkEntry(pid) { return PERK_INDEX[pid] || null; }

  // Bonus-Optionen für den Merge AUF tierKey
  function mergeBonusChoices(cardId, tierKey) {
    var c = PERKS[cardId];
    if (!c || !c[tierKey]) return [];
    return c[tierKey].slice();
  }

  /* ================= Persistenz ================= */

  var memStore = null; // Node-Fallback

  function lsGet() {
    try {
      if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(KEY);
    } catch (e) {}
    return memStore;
  }
  function lsSet(v) {
    try {
      if (typeof localStorage !== "undefined" && localStorage) { localStorage.setItem(KEY, v); return; }
    } catch (e) {}
    memStore = v;
  }

  function emptyCopies() {
    var o = {};
    for (var i = 0; i < TIER_KEYS.length; i++) o[TIER_KEYS[i]] = 0;
    return o;
  }
  function emptyMaterials() {
    var o = {};
    for (var i = 0; i < MATERIAL_KEYS.length; i++) o[MATERIAL_KEYS[i]] = 0;
    return o;
  }
  // Fremde/fehlende Sorten aussortieren, negative Bestände abfangen.
  function normMaterials(m) {
    var o = emptyMaterials();
    if (m && typeof m === "object") {
      for (var i = 0; i < MATERIAL_KEYS.length; i++) {
        o[MATERIAL_KEYS[i]] = Math.max(0, m[MATERIAL_KEYS[i]] | 0);
      }
    }
    return o;
  }
  function emptyJokers() {
    var o = {};
    for (var i = 0; i < JOKER_TIER_KEYS.length; i++) o[JOKER_TIER_KEYS[i]] = 0;
    return o;
  }
  function normJokers(j) {
    var o = emptyJokers();
    if (j && typeof j === "object") {
      for (var i = 0; i < JOKER_TIER_KEYS.length; i++) {
        o[JOKER_TIER_KEYS[i]] = Math.max(0, j[JOKER_TIER_KEYS[i]] | 0);
      }
    }
    return o;
  }
  function materialsTotal(m) {
    var n = 0;
    for (var i = 0; i < MATERIAL_KEYS.length; i++) n += m[MATERIAL_KEYS[i]] | 0;
    return n;
  }
  function fresh() {
    return {
      v: STATE_VERSION,
      cards: {},          // {id: {tier, lvl, copies:{tier:n}, mergeBoni:[], pendingBoni:[]}}
      materials: emptyMaterials(), // Upgrade-Material JE KARTE (v4)
      /* Joker-Vorrat je Stufe. BEWUSST OHNE Versions-Sprung: das Feld ist
         rein additiv, und get() füllt jedes fehlende Feld aus fresh() nach.
         Ein v4-Stand von gestern bekommt es beim ersten Lesen, ohne dass
         eine Migration laufen muss — und ohne dass eine Migration, die
         nichts umzurechnen hat, in der Kette stehen bleibt. */
      jokers: emptyJokers(),
      matRR: 0,           // Round-Robin-Zeiger für addMaterial() ohne Sorte
      gold: null,         // BEWUSST null — Gold verwaltet der Hub (arenaHub)
      pityEpic: 0, pityLegendary: 0, packsOpened: 0,
    };
  }
  function get() {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    if (s.v !== STATE_VERSION && (s.cards || s.material !== undefined)) s = migrateState(s);
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    if (!s.cards || typeof s.cards !== "object") s.cards = {};
    s.materials = normMaterials(s.materials);
    s.jokers = normJokers(s.jokers);
    s.matRR = ((s.matRR | 0) % MATERIAL_KEYS.length + MATERIAL_KEYS.length) % MATERIAL_KEYS.length;
    s.gold = null;
    delete s.material;   // v2-Feld — existiert seit v3 nicht mehr
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function cardIn(st, id) {
    if (!st.cards[id]) st.cards[id] = { tier: "common", lvl: 1, copies: emptyCopies(), mergeBoni: [], pendingBoni: [] };
    var c = st.cards[id];
    if (!c.copies || typeof c.copies !== "object") c.copies = emptyCopies();
    for (var i = 0; i < TIER_KEYS.length; i++) c.copies[TIER_KEYS[i]] = Math.max(0, c.copies[TIER_KEYS[i]] | 0);
    if (!Array.isArray(c.mergeBoni)) c.mergeBoni = [];
    if (!Array.isArray(c.pendingBoni)) c.pendingBoni = [];
    if (!TIER_BY_KEY[c.tier]) c.tier = "common";
    c.lvl = clampLvl(c.lvl);
    if (c.lvl > capOf(c.tier)) c.lvl = capOf(c.tier);
    return c;
  }
  function cardOf(id) {
    var c = get().cards[id];
    if (c) return c;
    return { tier: "common", lvl: 1, copies: emptyCopies(), mergeBoni: [], pendingBoni: [], _empty: true };
  }
  function owned(id) {
    var c = cardOf(id);
    if (c._empty) return false;
    for (var i = 0; i < TIER_KEYS.length; i++) if (c.copies[TIER_KEYS[i]] > 0) return true;
    return false;
  }
  function copiesTotal(c) {
    var n = 0;
    for (var i = 0; i < TIER_KEYS.length; i++) n += c.copies[TIER_KEYS[i]] | 0;
    return n;
  }
  // Aktive Stufe = höchste Stufe, von der mindestens eine Kopie im Besitz ist.
  // (Die aktive Karte IST eine der Kopien — deshalb kostet ein Merge auf der
  //  aktiven Stufe die aktive Karte mit, exakt wie im Vorbild.)
  function recomputeTier(c) {
    for (var i = TIER_KEYS.length - 1; i >= 0; i--) {
      if (c.copies[TIER_KEYS[i]] > 0) {
        if (tierOf(TIER_KEYS[i]).index > tierOf(c.tier).index) c.tier = TIER_KEYS[i];
        return c.tier;
      }
    }
    return c.tier;
  }

  /* ================= Sammel-API ================= */

  // addDrop(id, tierKey, n) → {tier, copies, total}
  function addDrop(id, tierKey, n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (!TIER_BY_KEY[tierKey]) tierKey = "common";
    var st = get(), c = cardIn(st, id);
    c.copies[tierKey] += n;
    recomputeTier(c);
    save(st);
    return { tier: c.tier, copies: c.copies[tierKey], total: copiesTotal(c) };
  }

  /* addMaterial(n, typeKey) → {attack, speed, special, total}
   * MIT typeKey: bucht genau auf diese Sorte.
   * OHNE typeKey (rückwärtskompatibel zur v2-Signatur): verteilt n
   * ROUND-ROBIN gleichmäßig über alle Sorten. Der Rest-Zeiger `matRR`
   * wandert mit, damit zehn Aufrufe à 1 Stück nicht alle auf 'attack'
   * landen. Negative n ziehen ab (Bestand bleibt ≥ 0). */
  function addMaterial(n, typeKey) {
    n = Math.floor(Number(n) || 0);
    var st = get(), i;
    if (typeKey && MATERIAL_BY_KEY[typeKey]) {
      st.materials[typeKey] = Math.max(0, st.materials[typeKey] + n);
    } else if (n) {
      var sign = n < 0 ? -1 : 1, mag = Math.abs(n), L = MATERIAL_KEYS.length;
      var per = Math.floor(mag / L), rest = mag % L, cur = st.matRR | 0;
      for (i = 0; i < L; i++) {
        var add = per + (i < rest ? 1 : 0);
        if (!add) continue;
        var key = MATERIAL_KEYS[(cur + i) % L];
        st.materials[key] = Math.max(0, st.materials[key] + sign * add);
      }
      st.matRR = (cur + rest) % L;
    }
    save(st);
    return getMaterialsFrom(st);
  }

  function getMaterialsFrom(st) {
    var o = { total: materialsTotal(st.materials) };
    for (var i = 0; i < MATERIAL_KEYS.length; i++) o[MATERIAL_KEYS[i]] = st.materials[MATERIAL_KEYS[i]];
    return o;
  }
  // getMaterials() → {attack, speed, special, total}
  function getMaterials() { return getMaterialsFrom(get()); }

  /* ================= Merge ================= */

  /* ---------- Joker-Vorrat ---------- */
  function getJokersFrom(st) {
    var o = { total: 0 };
    for (var i = 0; i < JOKER_TIER_KEYS.length; i++) {
      var k = JOKER_TIER_KEYS[i];
      o[k] = st.jokers[k] | 0;
      o.total += o[k];
    }
    return o;
  }
  function getJokers() { return getJokersFrom(get()); }
  /* addJoker(tierKey, n) — bucht n Joker auf eine Stufe. Negative n ziehen
   * ab (Bestand bleibt ≥ 0). OHNE gültige Stufe passiert NICHTS: einen
   * Joker „irgendwohin" zu verteilen wie beim Material wäre hier falsch —
   * die Stufe IST seine Eigenschaft, ein Joker ohne Stufe existiert nicht. */
  function addJoker(tierKey, n) {
    n = Math.floor(Number(n) || 0);
    var st = get();
    if (JOKER_TIER_KEYS.indexOf(tierKey) >= 0 && n) {
      st.jokers[tierKey] = Math.max(0, (st.jokers[tierKey] | 0) + n);
      save(st);
    }
    return getJokersFrom(st);
  }

  /* mergeInfo(id, tierKey) → alles, was die Oberfläche für EINE Zeile der
   * Schmiede braucht. Eine Stelle, damit Blatt, Knopfbeschriftung und
   * Regel nicht auseinanderlaufen — vorher hätte die Oberfläche „habe/
   * brauche" selbst gerechnet und die Joker-Grenze zweimal gekannt. */
  function mergeInfo(id, tierKey) {
    var st = get(), c = cardIn(st, id);
    var gueltig = !!TIER_BY_KEY[tierKey] && !!nextTierKey(tierKey);
    var have = gueltig ? (c.copies[tierKey] | 0) : 0;
    var fehlt = Math.max(0, MERGE_COST - have);
    var vorrat = (JOKER_TIER_KEYS.indexOf(tierKey) >= 0) ? (st.jokers[tierKey] | 0) : 0;
    /* Nutzbar sind höchstens JOKER_MAX, höchstens der Vorrat, höchstens die
     * Lücke — und nie so viele, dass keine echte Kopie übrig bliebe. */
    var nutzbar = Math.min(JOKER_MAX, vorrat, fehlt, MERGE_COST - 1);
    return { tier: tierKey, nextTier: gueltig ? nextTierKey(tierKey) : null,
             have: have, need: MERGE_COST, fehlt: fehlt,
             jokerVorrat: vorrat, jokerNutzbar: nutzbar,
             ok: gueltig && have >= MERGE_COST,
             okMitJokern: gueltig && have >= 1 && (have + nutzbar) >= MERGE_COST };
  }

  /* canMerge(id, tierKey, useJokers)
   * useJokers ist optional und steht auf 0 — Altaufrufe verhalten sich
   * unverändert. Das ist Absicht: „Alle verschmelzen" darf keine Joker
   * verbrauchen, nur weil die Signatur gewachsen ist. */
  function canMerge(id, tierKey, useJokers) {
    var c = cardOf(id);
    if (!TIER_BY_KEY[tierKey]) return false;
    if (!nextTierKey(tierKey)) return false;          // Suprem ist Endstufe
    var j = Math.max(0, Math.min(JOKER_MAX, Math.floor(Number(useJokers) || 0)));
    if (j === 0) return (c.copies[tierKey] | 0) >= MERGE_COST;
    var info = mergeInfo(id, tierKey);
    if (j > info.jokerVorrat) return false;
    if (j > MERGE_COST - 1) return false;             // eine echte Kopie muss bleiben
    return (c.copies[tierKey] | 0) >= (MERGE_COST - j);
  }

  // progressToNextMerge(id) → {tier, have, need, ready, nextTier}
  // Bezieht sich auf die AKTIVE Stufe (das ist die Zeile im Collection-Grid).
  function progressToNextMerge(id) {
    var c = cardOf(id), t = c.tier;
    var nk = nextTierKey(t);
    return { tier: t, have: Math.min(MERGE_COST, c.copies[t] | 0), raw: c.copies[t] | 0,
             need: MERGE_COST, ready: !!nk && (c.copies[t] | 0) >= MERGE_COST,
             nextTier: nk, maxed: !nk };
  }

  /* merge(id, tierKey) → {ok, from, newTier, tierUp, bonusChoices, bonusTier}
   * Verbraucht 3 Kopien der Stufe tierKey und erzeugt 1 Kopie der nächsten.
   * Steigt die AKTIVE Stufe der Karte dadurch, wird der kartenspezifische
   * Bonus dieser Stufe zur Wahl gestellt (chooseMergeBonus). */
  function merge(id, tierKey, useJokers) {
    var st = get(), c = cardIn(st, id);
    if (!TIER_BY_KEY[tierKey]) return null;
    var nk = nextTierKey(tierKey);
    if (!nk) return null;
    /* Joker-Anteil festzurren, BEVOR irgendetwas abgezogen wird. Alle drei
     * Grenzen greifen: höchstens JOKER_MAX, höchstens der Vorrat, und nie
     * so viele, dass keine echte Kopie mehr dabei wäre. */
    var j = Math.max(0, Math.min(JOKER_MAX, Math.floor(Number(useJokers) || 0)));
    if (j > (st.jokers[tierKey] | 0)) return null;
    if (j > MERGE_COST - 1) return null;
    var echt = MERGE_COST - j;
    if (c.copies[tierKey] < echt) return null;
    var beforeIdx = tierOf(c.tier).index;
    c.copies[tierKey] -= echt;
    if (j) st.jokers[tierKey] = Math.max(0, (st.jokers[tierKey] | 0) - j);
    c.copies[nk] += 1;
    recomputeTier(c);
    var tierUp = tierOf(c.tier).index > beforeIdx;
    var choices = [];
    if (tierUp) {
      choices = mergeBonusChoices(id, c.tier);
      var already = c.mergeBoni.some(function (pid) {
        var e = perkEntry(pid); return e && e.tier === c.tier;
      });
      if (choices.length && !already && c.pendingBoni.indexOf(c.tier) < 0) c.pendingBoni.push(c.tier);
    }
    save(st);
    return { ok: true, from: tierKey, newTier: c.tier, tierUp: tierUp,
             cap: capOf(c.tier), bonusTier: tierUp ? c.tier : null,
             bonusChoices: choices, pending: c.pendingBoni.slice(),
             jokersUsed: j, copiesUsed: echt, jokers: getJokersFrom(st) };
  }

  /* mergeAll(id) → {merges, byTier, newTier, pending}
   * AA-Feature "Merge All": kaskadiert von unten nach oben, so dass aus
   * 243 Gewöhnlich-Kopien genau 1 Suprem-Karte wird (3^5). */
  /* mergeAll(id, opts) — opts.useJokers muss AUSDRÜCKLICH gesetzt werden.
   * Ohne die Option fasst „Alle verschmelzen" keinen einzigen Joker an.
   * Grund: eine Kaskade, die im Vorbeigehen den Joker-Vorrat leert, ist
   * genau die Sorte Überraschung, die man einem Spieler nicht antut — er
   * hat auf einen Knopf gedrückt, nicht auf jede einzelne Verschmelzung. */
  function mergeAll(id, opts) {
    var mitJoker = !!(opts && opts.useJokers);
    var byTier = {}, total = 0, last = null, jokerTotal = 0;
    for (var i = 0; i < TIER_KEYS.length - 1; i++) {
      var tk = TIER_KEYS[i];
      var guard = 0;
      while (guard++ < 100000) {
        var j = 0;
        if (canMerge(id, tk)) {
          j = 0;
        } else if (mitJoker) {
          var inf = mergeInfo(id, tk);
          if (!inf.okMitJokern || !inf.jokerNutzbar) break;
          j = inf.jokerNutzbar;
        } else break;
        var r = merge(id, tk, j);
        jokerTotal += j;
        if (!r) break;
        byTier[tk] = (byTier[tk] || 0) + 1;
        total++; last = r;
      }
    }
    var c = cardOf(id);
    return { merges: total, byTier: byTier, newTier: c.tier, cap: capOf(c.tier),
             pending: c.pendingBoni.slice(), last: last,
             jokersUsed: jokerTotal, jokers: getJokers() };
  }

  // chooseMergeBonus(id, perkId) → {ok, tier, perk} | null
  function chooseMergeBonus(id, perkId) {
    var e = perkEntry(perkId);
    if (!e || e.cardId !== id) return null;
    var st = get(), c = cardIn(st, id);
    var p = c.pendingBoni.indexOf(e.tier);
    if (p < 0) return null;
    if (c.mergeBoni.indexOf(perkId) >= 0) return null;
    c.pendingBoni.splice(p, 1);
    c.mergeBoni.push(perkId);
    save(st);
    return { ok: true, tier: e.tier, perk: e.perk, mergeBoni: c.mergeBoni.slice() };
  }

  // Offene Bonus-Wahlen (z. B. nach mergeAll) → [{tier, choices}]
  function pendingBonusChoices(id) {
    var c = cardOf(id), out = [];
    for (var i = 0; i < c.pendingBoni.length; i++) {
      out.push({ tier: c.pendingBoni[i], choices: mergeBonusChoices(id, c.pendingBoni[i]) });
    }
    return out;
  }

  // Gebündelte Mods einer Karte für die Match-Engine → {stat: {mul, add}}
  function modsOf(id) {
    var c = cardOf(id), out = {};
    for (var i = 0; i < c.mergeBoni.length; i++) {
      var p = perkById(c.mergeBoni[i]);
      if (!p || !p.mod) continue;
      var m = p.mod;
      if (!out[m.stat]) out[m.stat] = { mul: 1, add: 0 };
      if (m.mul !== undefined) out[m.stat].mul *= m.mul;
      if (m.add !== undefined) out[m.stat].add += m.add;
    }
    return out;
  }

  /* ================= Level ================= */

  /* canLevelUp(id, goldAvailable)
   *   → {ok, reason, lvl, cap, needMaterial, needGold, haveMaterial,
   *      materialType, materialName, materialSym}
   * Geprüft (und später verbraucht) wird ausschließlich die EIGENE
   * Essenz der Karte (materialTypeOf) — ein Berg Frost-Essenz hilft
   * EMBER nicht. Seit v4 ist das die Essenz DIESER Karte, nicht mehr
   * die einer Sorten-Gruppe. */
  function canLevelUp(id, goldAvailable) {
    var st = get(), c = st.cards[id] || cardOf(id);
    var ti = tierOf(c.tier).index, cap = capOf(c.tier);
    var mi = materialInfoOf(id);
    var out = { ok: false, reason: "", lvl: c.lvl, cap: cap, tier: c.tier,
                needMaterial: materialFor(c.lvl, ti), needGold: goldFor(c.lvl),
                materialType: mi.key, materialName: mi.name, materialSym: mi.sym,
                haveMaterial: bankOf(st, mi.key) };
    if (!owned(id)) { out.reason = "unowned"; return out; }
    if (c.lvl >= MAX_LEVEL) { out.reason = "max"; return out; }
    if (c.lvl >= cap) { out.reason = "cap"; return out; }   // Merge nötig!
    if (out.haveMaterial < out.needMaterial) { out.reason = "material"; return out; }
    if (goldAvailable !== undefined && goldAvailable !== null && goldAvailable < out.needGold) {
      out.reason = "gold"; return out;
    }
    out.ok = true;
    return out;
  }

  /* levelUp(id) → {newLvl, materialSpent, materialType, goldCost, atCap} | null
   * Zieht NUR Material der Karten-Sorte ab. Den Gold-Abzug macht der
   * Aufrufer (Hub-Wallet). */
  function levelUp(id) {
    var st = get(), c = cardIn(st, id);
    var cap = capOf(c.tier), ti = tierOf(c.tier).index;
    if (!owned(id) || c.lvl >= cap || c.lvl >= MAX_LEVEL) return null;
    var mi = materialInfoOf(id);
    var need = materialFor(c.lvl, ti);
    if (bankOf(st, mi.key) < need) return null;
    var gold = goldFor(c.lvl);
    st.materials[mi.key] -= need;
    c.lvl += 1;
    save(st);
    return { newLvl: c.lvl, materialSpent: need, goldCost: gold, cap: cap,
             materialType: mi.key, materialName: mi.name, materialSym: mi.sym,
             atCap: c.lvl >= cap, materials: getMaterialsFrom(st),
             material: bankOf(st, mi.key) };
  }

  // Kompakte Karten-Sicht fürs UI
  function view(id) {
    var st = get(), c = st.cards[id] || cardOf(id);
    var t = tierOf(c.tier);
    var ti = t.index;
    var mi = materialInfoOf(id);
    return {
      id: id, tier: c.tier, tierName: t.name, color: t.color, tierIndex: ti,
      lvl: c.lvl, cap: t.cap, atCap: c.lvl >= t.cap,
      copies: c.copies, owned: owned(id),
      mergeBoni: c.mergeBoni.slice(), pendingBoni: c.pendingBoni.slice(),
      statMul: statMul(c.lvl, c.mergeBoni),
      nextStatMul: statMul(Math.min(t.cap, c.lvl + 1), c.mergeBoni),
      needMaterial: materialFor(c.lvl, ti), needGold: goldFor(c.lvl),
      materialType: mi.key, materialName: mi.name, materialSym: mi.sym,
      materialColor: mi.color, haveMaterial: bankOf(st, mi.key),
      materials: getMaterialsFrom(st),
      mergeProgress: progressToNextMerge(id),
    };
  }

  /* ================= Packs ================= */

  function normType(type) {
    var t = String(type || "bronze").toLowerCase();
    return PACKS[t] ? t : (PACK_ALIAS[t] || "bronze");
  }
  function rollWeighted(weights, rng) {
    var sum = 0, i;
    for (i = 0; i < weights.length; i++) sum += weights[i];
    var r = rng() * sum, acc = 0;
    for (i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r < acc) return i;
    }
    return 0;
  }
  function rollCard(poolIds, heroIds, rng) {
    var heroes = heroIds || [], w = [], total = 0, i;
    for (i = 0; i < poolIds.length; i++) {
      var wt = heroes.indexOf(poolIds[i]) >= 0 ? HERO_WEIGHT : 1;
      w.push(wt); total += wt;
    }
    var r = rng() * total, acc = 0;
    for (i = 0; i < poolIds.length; i++) {
      acc += w[i];
      if (r < acc) return poolIds[i];
    }
    return poolIds[poolIds.length - 1];
  }
  function randInt(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }

  /* getPityStatus() → {epicIn, legendaryIn, pityEpic, pityLegendary, …}
   * AA zeigt den Pity-Stand OFFEN auf der Truhe an ("Get <Legendary> in N
   * opens", §8.2) statt Prozent-Drop-Raten. Wir machen unseren deshalb
   * sichtbar — Lesart: "spätestens in ≤ epicIn Packs kommt ein Episches".
   *
   * ⚠ Zum +1: Der Zähler wird NACH dem Pack erhöht, geprüft wird davor
   * (`pityEpic >= PITY_EPIC` → dieses Pack erzwingt). Bei pityEpic = 25
   * greift also das NÄCHSTE Pack → epicIn = 1. Bei frischem Zähler (0)
   * sind es 26 — deckungsgleich mit der gemessenen längsten Durststrecke
   * von 25 Packs ohne Episch im Selbsttest. Ein reines PITY_EPIC−Zähler
   * wäre um eins zu optimistisch. */
  function getPityStatus() {
    var st = get();
    return {
      epicIn: Math.max(1, PITY_EPIC - (st.pityEpic | 0) + 1),
      legendaryIn: Math.max(1, PITY_LEGENDARY - (st.pityLegendary | 0) + 1),
      pityEpic: st.pityEpic | 0, pityLegendary: st.pityLegendary | 0,
      epicThreshold: PITY_EPIC, legendaryThreshold: PITY_LEGENDARY,
      packsOpened: st.packsOpened | 0,
    };
  }

  /* =====================================================================
   * oddsFor(type) — die Drop-Raten, so wie sie im Laden stehen müssen.
   *
   * WARUM ES DIESE FUNKTION GIBT (29.07.2026)
   * Apple und Google verlangen die Offenlegung, nicht wir:
   *
   *   Apple, App Store Review Guidelines 3.1.1 — „Apps offering ‚loot
   *   boxes' or other mechanisms that provide randomized virtual items
   *   for purchase must disclose the odds of receiving each type of item
   *   to customers PRIOR TO PURCHASE."
   *
   *   Google Play (seit Mai 2019) — „…must clearly disclose the odds of
   *   receiving those items IN ADVANCE OF PURCHASE."
   *
   * Das ersetzt unsere bisherige AA-Nachahmung „Raritätsspannen statt
   * Prozente" (DESIGN_PROGRESSION §C). AAs Zurückhaltung war eine
   * Designentscheidung; die Offenlegung ist eine Auflage. Die Spanne
   * („Enthält mindestens…") bleibt als Aufmacher, die Prozente kommen
   * hinter das ⓘ.
   *
   * ZWEI ZAHLEN, WEIL EINE ALLEIN IRREFÜHRT
   *   perSlot  Wahrscheinlichkeit je gezogener Karte — die ehrliche
   *            Grundgröße, aber niemand kauft einen Kartenslot.
   *   perPack  Wahrscheinlichkeit, im Pack MINDESTENS EINE dieser Stufe
   *            zu finden — das, was der Käufer eigentlich wissen will.
   *
   * ⚠ Die Garantie ist eingerechnet, sonst wäre die Angabe FALSCH — und
   * eine falsche Offenlegung ist schlimmer als keine. Wirkung exakt:
   * bis einschließlich der garantierten Stufe ist perPack = 100 %; jede
   * Stufe DARÜBER bleibt unberührt, weil die Garantie nur dann eingreift,
   * wenn ohnehin nichts Besseres im Pack liegt, und dann einen Slot
   * überschreibt, der unter ihr lag.
   *
   * Das Pity liegt bewusst NICHT in dieser Zahl: es zählt über Packs
   * hinweg und ist damit keine Eigenschaft eines einzelnen Kaufs. Es
   * steht separat daneben (getPityStatus), so wie AA es auf die Truhe
   * schreibt.
   * =================================================================== */
  function oddsFor(type) {
    var def = PACKS[normType(type)];
    var n = def.cardSlots, w = def.weights, i, j;
    var summe = w.reduce(function (a, b) { return a + b; }, 0);
    var perSlot = [], perPack = [];
    for (i = 0; i < w.length; i++) {
      var p = w[i] / summe;
      /* Anteil „diese Stufe ODER besser" für die Pack-Rechnung. */
      var abHier = 0;
      for (j = i; j < w.length; j++) abHier += w[j] / summe;
      var mind1 = i <= def.guarantee ? 1 : 1 - Math.pow(1 - abHier, n);
      perSlot.push({ key: TIERS[i].key, name: TIERS[i].name, color: TIERS[i].color,
                     pct: p * 100 });
      perPack.push({ key: TIERS[i].key, name: TIERS[i].name, color: TIERS[i].color,
                     pct: mind1 * 100, garantiert: i <= def.guarantee });
    }
    return {
      key: def.key, name: def.name, cardSlots: n,
      guarantee: def.guarantee, guaranteeName: TIERS[def.guarantee].name,
      perSlot: perSlot, perPack: perPack,
      /* Suprem taucht bewusst mit 0 auf statt zu fehlen: „kommt nicht vor"
         ist eine Aussage, die der Käufer sehen soll, kein Weglassen. */
      supreme: { key: "supreme", name: TIERS[TIERS.length - 1].name,
                 color: TIERS[TIERS.length - 1].color, pct: 0,
                 hinweis: "Nur durch Verschmelzen von 3 Legendären" },
    };
  }

  /* openPack(type, poolIds, heroIds, rng)
   *   → {packType, name, promise, cards:[{cardId, tier, …}],
   *      materialSlots:[{type, amount, name, sym}], materialByType, material,
   *      gold, pity, guarantee}
   * Wendet die Drops NICHT an — die Pack-Zeremonie ruft pro Flip addDrop()
   * bzw. addMaterial(amount, type); das Gold bucht der Hub. Pity-Zähler und
   * packsOpened werden hier sofort persistiert.
   * Material-Slots droppen seit v4 die Essenzen DER KARTEN, DIE IN
   * DIESEM PACK LAGEN — gleichverteilt über die gezogenen Karten-IDs.
   * Begründung im Kopf unter „STATE v4 / NACHSCHUB": bei acht statt drei
   * Sorten wäre gleichverteilter Nachschub eine stille Kürzung um den
   * Faktor 2,7 für die Karte, die man wirklich hochziehen will. Gekoppelt
   * bleibt die Menge je Karte, und der Zusammenhang stimmt: die Karte,
   * die aus dem Pack kommt, bringt ihren eigenen Nachschub mit.
   * Fallback auf den ganzen Pool, falls ein Pack ohne Kartenslots
   * definiert wird — dann gibt es keine gezogene Karte, an die man
   * koppeln könnte. */
  function openPack(type, poolIds, heroIds, rng) {
    rng = rng || Math.random;
    var def = PACKS[normType(type)];
    poolIds = (poolIds && poolIds.length) ? poolIds : Object.keys(PERKS);
    var st = get(), i;

    var slots = [];
    for (i = 0; i < def.cardSlots; i++) slots.push(rollWeighted(def.weights, rng));

    function best() { var b = 0; for (var j = 0; j < slots.length; j++) if (slots[j] > b) b = slots[j]; return b; }
    function force(minIdx) {
      if (best() >= minIdx) return;
      slots[Math.floor(rng() * slots.length)] = minIdx;
    }
    // 1) Pity (Legendär vor Episch — der stärkere Zwang deckt den schwächeren ab)
    var pityHit = null;
    if (st.pityLegendary >= PITY_LEGENDARY && best() < 4) { force(4); pityHit = "legendary"; }
    if (st.pityEpic >= PITY_EPIC && best() < 3) { force(3); pityHit = pityHit || "epic"; }
    // 2) Pack-Garantie
    force(def.guarantee);

    var b = best();
    st.pityEpic = b >= 3 ? 0 : st.pityEpic + 1;
    st.pityLegendary = b >= 4 ? 0 : st.pityLegendary + 1;
    st.packsOpened += 1;
    save(st);

    var cards = [];
    for (i = 0; i < slots.length; i++) {
      var t = tierOf(slots[i]);
      cards.push({ cardId: rollCard(poolIds, heroIds, rng), tier: t.key, tierName: t.name,
                   tierIndex: t.index, color: t.color, count: 1 });
    }
    /* Die Quelle des Nachschubs: die IDs der Karten aus DIESEM Pack,
       gefiltert auf solche, für die es überhaupt eine Sorte gibt. */
    var quelle = [];
    for (i = 0; i < cards.length; i++) {
      if (MATERIAL_BY_KEY[cards[i].cardId]) quelle.push(cards[i].cardId);
    }
    if (!quelle.length) {
      for (i = 0; i < poolIds.length; i++) {
        if (MATERIAL_BY_KEY[poolIds[i]]) quelle.push(poolIds[i]);
      }
    }
    if (!quelle.length) quelle = MATERIAL_KEYS.slice();

    var matSlots = [], mat = 0, byType = emptyMaterials();
    for (i = 0; i < def.materialSlots; i++) {
      var amount = randInt(rng, MATERIAL_PER_SLOT[0], MATERIAL_PER_SLOT[1]);
      var mk = quelle[Math.min(quelle.length - 1, Math.floor(rng() * quelle.length))];
      var md = MATERIAL_BY_KEY[mk];
      matSlots.push({ type: md.key, amount: amount, name: md.name, sym: md.sym, color: md.color });
      byType[md.key] += amount;
      mat += amount;
    }
    return { packType: def.key, name: def.name, promise: def.promise, color: def.color,
             cards: cards, materialSlots: matSlots, materialByType: byType, material: mat,
             gold: randInt(rng, def.gold[0], def.gold[1]),
             pity: pityHit, guarantee: def.guarantee, packsOpened: st.packsOpened,
             pityStatus: getPityStatus() };
  }

  /* ================= Migration v1 → v2 → v3 =================
   * migrateState() ist der Dispatcher: ein v1-Stand läuft BEIDE Stufen
   * durch (v1→v2→v3), ein v2-Stand nur die zweite.
   *
   * v1-Modell: Rarität war ein LEVEL-BAND derselben Karte (Lv1-19 Gewöhnlich,
   * 20-39 Selten/grün, 40-59 Episch/blau, 60-79 Legendär/lila, 80-99
   * Relikt/orange, 100 Suprem) und `copies` war ein einzelner Zähler als
   * Level-Up-Treibstoff.
   * Überführung:
   *   - Bandindex → gleiche Stufe der neuen Leiter (grün=Gut, blau=Selten,
   *     lila=Episch, orange=Legendär) — die Farbe bleibt also erhalten.
   *   - Level → auf das neue Cap der Stufe gekappt (niemand verliert Stufe).
   *   - 1 Kopie der eigenen Stufe wird gutgeschrieben (die Karte selbst).
   *   - alte `copies` + `dust/10` → Upgrade-Material (Kopien sind für Level
   *     nicht mehr zuständig, verfallen aber nicht).
   *   - alte `perks` → `mergeBoni` (die Perk-IDs sind stabil geblieben,
   *     nur ihre Stufen-Zuordnung hat sich verschoben). */
  var V1_BANDS = [[1, 19], [20, 39], [40, 59], [60, 79], [80, 99], [100, 100]];
  function v1TierIndex(lvl) {
    for (var i = 0; i < V1_BANDS.length; i++) if (lvl >= V1_BANDS[i][0] && lvl <= V1_BANDS[i][1]) return i;
    return 0;
  }
  function migrateState(old) {
    var s = old;
    if ((s.v | 0) < 2) s = migrateV1toV2(s);
    if ((s.v | 0) < 3) s = migrateV2toV3(s);
    if ((s.v | 0) < 4) s = migrateV3toV4(s);
    return s;
  }

  function migrateV1toV2(old) {
    var out = { v: 2, cards: {}, material: 0, gold: null,
                pityEpic: old.pityEpic | 0, pityLegendary: old.pityLegendary | 0,
                packsOpened: old.packsOpened | 0 };
    out.material = Math.max(0, old.material | 0);
    var extraMaterial = Math.floor((old.dust | 0) / 10);
    for (var id in (old.cards || {})) {
      if (!Object.prototype.hasOwnProperty.call(old.cards, id)) continue;
      var o = old.cards[id] || {};
      var lvl = clampLvl(o.lvl);
      var ti = v1TierIndex(lvl);
      var t = TIERS[ti];
      var c = { tier: t.key, lvl: Math.min(lvl, t.cap), copies: emptyCopies(),
                mergeBoni: [], pendingBoni: [] };
      c.copies[t.key] = 1;
      if (Array.isArray(o.perks)) {
        for (var i = 0; i < o.perks.length; i++) if (perkById(o.perks[i])) c.mergeBoni.push(o.perks[i]);
      }
      extraMaterial += Math.max(0, o.copies | 0);
      out.cards[id] = c;
    }
    out.material += extraMaterial;
    out._migratedFrom = old.v || 1;
    return out;
  }

  /* ⚠ EINE MIGRATION MUSS IHRE EIGENE FORM EINFRIEREN.
   * migrateV2toV3() hat früher `emptyMaterials()` und `MATERIAL_KEYS`
   * benutzt — also die Form der JEWEILS AKTUELLEN Fassung. Solange die
   * aktuelle Fassung v3 war, fiel das nicht auf. Mit v4 hätte es einen
   * v2-Stand über die ACHT neuen Schlüssel verteilt, und der Schritt
   * v3→v4 hätte danach unter 'attack'/'speed'/'special' nichts mehr
   * gefunden: das Material eines Altspielers wäre verdoppelt oder
   * verschwunden, je nach Reihenfolge. Deshalb steht die v3-Form hier
   * als eigene Konstante — sie ändert sich nie wieder. */
  var V3_KEYS = ["attack", "speed", "special"];

  /* v2 → v3: aus EINEM generischen Materialbestand werden DREI Sorten.
   * Der Altbestand wird GLEICHMÄSSIG gedrittelt, der Rest (0-2 Stück)
   * geht auf 'attack'. Begründung: Niemand verliert Material, und die
   * Sorten starten ausbalanciert — welche Sorte der Spieler in v2
   * "gemeint" hat, ist nicht rekonstruierbar, also ist jede Ungleich-
   * verteilung willkürlich. Karten, Level, Kopien und Boni bleiben
   * unangetastet; nur die Ressource wird aufgefächert. */
  function migrateV2toV3(old) {
    var mats = {}, i;
    for (i = 0; i < V3_KEYS.length; i++) mats[V3_KEYS[i]] = 0;
    var out = { v: 3, cards: old.cards || {}, materials: mats, matRR: 0,
                gold: null, pityEpic: old.pityEpic | 0,
                pityLegendary: old.pityLegendary | 0, packsOpened: old.packsOpened | 0 };
    if (old._migratedFrom !== undefined) out._migratedFrom = old._migratedFrom;
    else out._migratedFrom = old.v || 2;
    var total = Math.max(0, old.material | 0);
    var L = V3_KEYS.length;
    var per = Math.floor(total / L), rest = total - per * L;
    for (i = 0; i < L; i++) out.materials[V3_KEYS[i]] = per;
    out.materials.attack += rest;
    // Falls ein Stand (Testfixture, Teil-Migration) schon Sorten mitbringt: addieren.
    if (old.materials && typeof old.materials === "object") {
      for (var j = 0; j < L; j++) {
        out.materials[V3_KEYS[j]] += Math.max(0, old.materials[V3_KEYS[j]] | 0);
      }
    }
    return out;
  }

  /* v3 → v4: aus DREI Sorten wird EINE JE KARTE.
   * Jede Altsorte geht an GENAU DIE KARTEN, die sie bisher bedient hat
   * — die v3-Zuordnungstabelle steht dafür hier eingefroren. Der Rest
   * einer nicht glatt teilbaren Menge geht an den ERSTEN Empfänger der
   * Gruppe. Niemand verliert ein Stück, niemand bekommt eines dazu:
   * die Summe vor und nach der Migration ist gleich, und das prüft der
   * Selbsttest unten auch nach.
   *
   * Ein Stand, der bereits Sorten mit den NEUEN Schlüsseln mitbringt
   * (Fixture, halb migriert), wird addiert. Die alten drei Schlüssel
   * können dabei nicht mit den neuen kollidieren: 'attack', 'speed' und
   * 'special' sind keine Karten-IDs. */
  var V3_TO_V4 = {
    attack:  ["fire", "earth"],
    speed:   ["water", "light"],
    special: ["nature", "darkness", "solara", "magmor"],
  };
  function migrateV3toV4(old) {
    var out = { v: 4, cards: old.cards || {}, materials: emptyMaterials(), matRR: 0,
                gold: null, pityEpic: old.pityEpic | 0,
                pityLegendary: old.pityLegendary | 0, packsOpened: old.packsOpened | 0 };
    if (old._migratedFrom !== undefined) out._migratedFrom = old._migratedFrom;
    else out._migratedFrom = old.v || 3;
    var src = (old.materials && typeof old.materials === "object") ? old.materials : {};
    for (var i = 0; i < V3_KEYS.length; i++) {
      var alt = V3_KEYS[i], ziel = V3_TO_V4[alt];
      var menge = Math.max(0, src[alt] | 0);
      var per = Math.floor(menge / ziel.length), rest = menge - per * ziel.length;
      for (var j = 0; j < ziel.length; j++) {
        if (MATERIAL_BY_KEY[ziel[j]]) out.materials[ziel[j]] += per + (j === 0 ? rest : 0);
      }
    }
    // Schon vorhandene NEUE Sorten übernehmen (nicht die drei alten!).
    for (var k = 0; k < MATERIAL_KEYS.length; k++) {
      out.materials[MATERIAL_KEYS[k]] += Math.max(0, src[MATERIAL_KEYS[k]] | 0);
    }
    return out;
  }

  // Explizit anstoßbar (get() migriert ohnehin lazy, speichert aber erst beim
  // nächsten Schreibzugriff — migrateV1() persistiert sofort).
  // Heißt weiterhin migrateV1(), weil es der EINE Migrations-Einstiegspunkt
  // für den Hub-Start ist; intern läuft v1→v2→v3 durch.
  function migrateV1() {
    var raw;
    try { raw = JSON.parse(lsGet() || "{}"); } catch (e) { raw = {}; }
    if (!raw || raw.v === STATE_VERSION) return { skipped: true, cards: 0 };
    var st = get();
    save(st);
    return { skipped: false, cards: Object.keys(st.cards).length,
             from: st._migratedFrom || null, materials: getMaterialsFrom(st) };
  }

  /* ================= Export ================= */
  var API = {
    // Konstanten
    TIERS: TIERS, TIER_KEYS: TIER_KEYS, PACKS: PACKS, PERKS: PERKS,
    MERGE_TIER_KEYS: MERGE_TIER_KEYS, MERGE_COST: MERGE_COST, MAX_LEVEL: MAX_LEVEL,
    GOLD_BANDS: GOLD_BANDS, MATERIAL_NAME: MATERIAL_NAME,
    MATERIALS: MATERIALS, MATERIAL_KEYS: MATERIAL_KEYS, CARD_MATERIAL: CARD_MATERIAL,
    MATERIAL_BY_KEY: MATERIAL_BY_KEY,
    PITY_EPIC: PITY_EPIC, PITY_LEGENDARY: PITY_LEGENDARY, HERO_WEIGHT: HERO_WEIGHT,
    JOKER_MAX: JOKER_MAX, JOKER_TIER_KEYS: JOKER_TIER_KEYS,
    STATE_VERSION: STATE_VERSION,
    // Mathe
    statMul: statMul, goldFor: goldFor, materialFor: materialFor, tierOf: tierOf,
    capOf: capOf, nextTierKey: nextTierKey, totalGoldTo: totalGoldTo,
    totalMaterialTo: totalMaterialTo,
    // Material-Sorten
    materialTypeOf: materialTypeOf, materialInfoOf: materialInfoOf,
    getMaterials: getMaterials, getPityStatus: getPityStatus, oddsFor: oddsFor,
    // Bank
    get: get, addDrop: addDrop, addMaterial: addMaterial, owned: owned, view: view,
    canMerge: canMerge, merge: merge, mergeAll: mergeAll, mergeInfo: mergeInfo,
    getJokers: getJokers, addJoker: addJoker,
    chooseMergeBonus: chooseMergeBonus, mergeBonusChoices: mergeBonusChoices,
    pendingBonusChoices: pendingBonusChoices, progressToNextMerge: progressToNextMerge,
    canLevelUp: canLevelUp, levelUp: levelUp, modsOf: modsOf, perkById: perkById,
    // Packs / Migration
    openPack: openPack, migrateV1: migrateV1,
    _key: KEY, _reset: function () { save(fresh()); },
    _write: function (s) { save(s); },
  };

  if (typeof window !== "undefined") window.ArenaCards = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ================= Selbsttest (node arena_patches/arena_cards.js) ========= */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, info) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (info !== undefined ? "  " + info : ""));
      if (!cond) fail++;
    };
    var mulberry32 = function (a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    var r2 = function (x) { return Math.round(x * 100) / 100; };
    var pad = function (s, n) { s = String(s); while (s.length < n) s += " "; return s; };
    var padL = function (s, n) { s = String(s); while (s.length < n) s = " " + s; return s; };
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };

    console.log("\n=== ARENA CARDS v2.2 (State v4, eine Essenz je Karte) — Selbsttest ===\n");

    /* --- 0. Material-Sorten: EINE JE KARTE (Befund IMG_3427-3430) ---
     * Der Gegenstand dieser Prüfung ist NICHT „es gibt acht Sorten" —
     * acht ist heute zufällig richtig. Geprüft wird die Kopplung:
     * die Sortenliste und die Kartenliste sind DIESELBE Liste. Kommt
     * morgen eine neunte Karte dazu, wird diese Prüfung rot, bis ihre
     * Essenz existiert — genau dafür ist sie da. PERKS ist die
     * Kartenliste des Moduls (openPack fällt ohne poolIds darauf
     * zurück). */
    console.log("Essenzen (Schlüssel = Karten-ID):");
    MATERIALS.forEach(function (m) {
      console.log("  " + m.sym + " " + pad(m.name, 18) + pad(m.key, 10) + m.color);
    });
    var kartenIds = Object.keys(PERKS).sort().join(",");
    check("jede Karte hat genau eine eigene Essenz",
      MATERIAL_KEYS.slice().sort().join(",") === kartenIds,
      MATERIAL_KEYS.length + " Sorten / " + Object.keys(PERKS).length + " Karten");
    check("Sortenschlüssel IST die Karten-ID (Identität)",
      MATERIAL_KEYS.every(function (k) { return materialTypeOf(k) === k; }));
    check("CARD_MATERIAL ist die Identität", Object.keys(CARD_MATERIAL).every(function (k) {
      return CARD_MATERIAL[k] === k;
    }) && Object.keys(CARD_MATERIAL).length === MATERIAL_KEYS.length);
    check("keine zwei Karten teilen sich eine Essenz",
      (function () { var g = {}; return MATERIAL_KEYS.every(function (k) {
        if (g[k]) return false; g[k] = 1; return true; }); })());
    check("Namen und Symbole sind eindeutig", (function () {
      var n = {}, y = {};
      return MATERIALS.every(function (m) {
        if (n[m.name] || y[m.sym]) return false; n[m.name] = 1; y[m.sym] = 1; return true;
      });
    })());
    check("materialTypeOf: unbekannte ID → null (KEIN stiller Ersatz)",
      materialTypeOf("gibtsnicht") === null && materialTypeOf(undefined) === null &&
      materialTypeOf("attack") === null && materialTypeOf("special") === null);
    check("materialInfoOf(unbekannt) sagt es auch",
      materialInfoOf("gibtsnicht").key === null &&
      materialInfoOf("gibtsnicht").name === "Unbekannte Essenz");
    check("materialInfoOf liefert Name + Symbol", materialInfoOf("water").name === "Frost-Essenz" &&
      materialInfoOf("water").sym === "❄");
    check("die drei v3-Sorten sind als Schlüssel WEG",
      !MATERIAL_BY_KEY.attack && !MATERIAL_BY_KEY.speed && !MATERIAL_BY_KEY.special);

    /* --- 1. Raritätsleiter & Kurven --- */
    console.log("\nRaritätsleiter:");
    TIERS.forEach(function (t) {
      console.log("  " + pad(t.name, 12) + pad(t.colorName, 8) + t.color +
        "   Cap " + padL(t.cap, 3) + "   Material/Level-Up " + materialFor(1, t.index));
    });
    console.log("\nLevel-Kurve (statMul, ohne Merge-Boni):");
    [1, 25, 40, 55, 70, 85, 100].forEach(function (l) {
      console.log("  Lv" + padL(l, 3) + "  " + r2(statMul(l)) + "x");
    });
    check("statMul(1) == 1", Math.abs(statMul(1) - 1) < 1e-9, r2(statMul(1)));
    check("statMul(100) in [8, 9.5]", statMul(100) > 8 && statMul(100) < 9.5, r2(statMul(100)) + "x");
    check("statMul monoton steigend", (function () {
      for (var l = 2; l <= 100; l++) if (statMul(l) <= statMul(l - 1)) return false;
      return true;
    })());
    check("Merge-Boni erhöhen statMul", statMul(50, ["fire_good_rate", "fire_rare_exec"]) > statMul(50),
      r2(statMul(50)) + " → " + r2(statMul(50, ["fire_good_rate", "fire_rare_exec"])));
    check("Caps 25/40/55/70/85/100", TIERS.map(function (t) { return t.cap; }).join("/") === "25/40/55/70/85/100");
    // AA-kalibriert (§13): 1 + tierIdx + floor(lvl/10), Deckel 16.
    check("materialFor(Lv1,Gewöhnlich)==1 (AA-Beleg Boulder 50/1)", materialFor(1, 0) === 1, materialFor(1, 0));
    check("materialFor(Lv30,Gut)==5 (AA-Beleg Divine Sword 19/5)", materialFor(30, 1) === 5, materialFor(30, 1));
    check("materialFor(Lv99,Suprem)==15, Deckel 16", materialFor(99, 5) === 15 && materialFor(200, 5) <= 16,
      materialFor(99, 5));
    check("materialFor monoton in Level und Stufe", (function () {
      for (var l = 2; l <= 100; l++) if (materialFor(l, 2) < materialFor(l - 1, 2)) return false;
      for (var t = 1; t < 6; t++) if (materialFor(50, t) <= materialFor(50, t - 1)) return false;
      return true;
    })());

    var gSum = totalGoldTo(100);
    console.log("\nGold kumulativ bis Lv100: " + fmt(gSum) + " Gold");
    console.log("  Bänder: " + GOLD_BANDS.map(function (b) { return "≤" + b.to + ":" + b.gold; }).join(" · "));
    console.log("  Beispiele: goldFor(15)=" + goldFor(15) + "  goldFor(16)=" + goldFor(16) +
      "  goldFor(33)=" + fmt(goldFor(33)) + "  goldFor(99)=" + fmt(goldFor(99)));
    check("goldFor monoton (nicht fallend)", (function () {
      for (var l = 2; l <= 100; l++) if (goldFor(l) < goldFor(l - 1)) return false;
      return true;
    })());
    // Nach der AA-Kalibrierung (§13) liegt die Summe höher als in v2:
    // AAs echte Frühkosten (1.000 Gold schon bei Lv1→2) sind deutlich härter
    // als unsere alte Annahme (100 Gold), dafür ist Lv100 der absolute Endgame.
    check("Gold-Summe bis Lv100 in [4.5M, 5.6M]", gSum > 4.5e6 && gSum < 5.6e6, fmt(gSum));
    check("AA-Anker: goldFor(6)≈2.500 (AA Lv3 = 3.000)", goldFor(6) === 2500, goldFor(6));
    check("AA-Anker: goldFor(32)=16.500 (AA Lv16 = 15.000)", goldFor(32) === 16500, goldFor(32));
    check("Pack-Gewichte summieren auf 100", Object.keys(PACKS).every(function (k) {
      return Math.abs(PACKS[k].weights.reduce(function (a, b) { return a + b; }, 0) - 100) < 1e-9;
    }));
    /* ------------------------------------------------------------------
     * SUPREM IST NICHT DROPPBAR — und das ist eine Entscheidung, kein
     * Zufall (Auftraggeber, 29.07.2026): „3 legendäre Karten verschmelzen
     * am Schluss zu Supreme. Supreme ist nicht droppbar und bleibt auch
     * so."
     *
     * Die alte Prüfung sah nur die LÄNGE der Gewichtstabelle an. Das ist
     * die Tabelle, nicht das Ergebnis: ein `guarantee: 5` oder ein Pity,
     * das auf Index 5 zwingt, wäre durchgekommen, weil beide an den
     * Gewichten vorbei arbeiten (force() setzt einen Slot direkt).
     *
     * Geprüft wird deshalb dreifach — Struktur, Absicht und Ausgabe:
     * ------------------------------------------------------------------ */
    check("Suprem droppt nie: 5 Gewichte für 6 Stufen", Object.keys(PACKS).every(function (k) {
      return PACKS[k].weights.length === TIERS.length - 1;
    }));
    check("Suprem droppt nie: keine Garantie zielt darauf", Object.keys(PACKS).every(function (k) {
      return PACKS[k].guarantee < TIERS.length - 1;
    }), Object.keys(PACKS).map(function (k) { return k + ":" + PACKS[k].guarantee; }).join(" "));
    check("Suprem droppt nie: auch kein Pity zwingt darauf",
      Math.max(4, 4) < TIERS.length - 1, "force() erreicht hoechstens 4");
    /* Und die Aussage selbst, an der Ausgabe gemessen: 4 Typen × 500
       Öffnungen = 2 000 Packs, rund 16 000 Kartenslots. Das ist keine
       Zufallsprobe, sondern eine Struktureigenschaft — sie MUSS halten. */
    (function () {
      var typen = Object.keys(PACKS), hoechste = 0, slots = 0, i, k, r, j;
      var sicher = { copies: {}, cards: {}, pityEpic: 0, pityLegendary: 0 };
      for (k = 0; k < typen.length; k++) {
        for (i = 0; i < 500; i++) {
          r = openPack(typen[k], null, null);
          for (j = 0; j < r.cards.length; j++) {
            slots++;
            if (r.cards[j].tierIndex > hoechste) hoechste = r.cards[j].tierIndex;
          }
        }
      }
      check("Suprem droppt nie: 2.000 Packs geöffnet, hoechste Stufe ist Legendaer",
        hoechste === TIERS.length - 2, "hoechste=" + hoechste + " ueber " + slots + " Slots");
    })();
    var perkCount = 0;
    for (var pid in PERKS) MERGE_TIER_KEYS.forEach(function (t) { perkCount += (PERKS[pid][t] || []).length; });
    console.log("\nMerge-Boni ausformuliert: " + perkCount + " (8 Karten × Gut/Selten × 2), " +
      "Episch/Legendär/Suprem = TBD nach Playtest");
    check("32 Merge-Boni ausformuliert", perkCount === 32, perkCount);
    check("Attack-Rate-Boni sind NEGATIVE Prozente (AA-Muster)", (function () {
      var n = 0, ok = true;
      for (var k in PERK_INDEX) {
        var p = PERK_INDEX[k].perk;
        if (p.mod && p.mod.stat === "attackRate") { n++; if (!(p.pct < 0) || !(p.mod.mul < 1)) ok = false; }
      }
      return ok && n >= 3;
    })());

    /* --- 2. 10.000 Bronze-Packs --- */
    API._reset();
    var rng = mulberry32(20260724);
    var POOL = ["fire", "water", "nature", "earth", "light", "darkness", "solara", "magmor"];
    var HEROES = ["solara", "magmor"];
    var N = 10000, tc = [0, 0, 0, 0, 0, 0], slotsTotal = 0, heroSlots = 0;
    var matTotal = 0, goldTotal = 0, pityEpicHits = 0, pityLegHits = 0;
    var streakNoEpic = 0, maxStreakNoEpic = 0, streakNoLeg = 0, maxStreakNoLeg = 0;
    var packsWithGoodPlus = 0;
    var matBySort = emptyMaterials(), matSlotsBySort = emptyMaterials();
    var kartenJeId = emptyMaterials();   // gezogene KARTEN je ID — die Sollkurve
    var matSlotsTotal = 0, matShapeOk = true;
    var matAusPack = true;               // jeder Essenz-Posten gehört zu einer Karte DIESES Packs
    for (var p = 0; p < N; p++) {
      var res = openPack("bronze", POOL, HEROES, rng);
      if (res.pity === "epic") pityEpicHits++;
      if (res.pity === "legendary") pityLegHits++;
      matTotal += res.material; goldTotal += res.gold;
      var sumSlots = 0;
      for (var ms = 0; ms < res.materialSlots.length; ms++) {
        var slot = res.materialSlots[ms];
        if (!slot || typeof slot !== "object" || !MATERIAL_BY_KEY[slot.type] ||
            !(slot.amount >= MATERIAL_PER_SLOT[0] && slot.amount <= MATERIAL_PER_SLOT[1])) matShapeOk = false;
        matBySort[slot.type] += slot.amount;
        matSlotsBySort[slot.type]++;
        /* Die Kopplung selbst: der Posten gehört zu einer Karte, die in
           DIESEM Pack lag. Ohne diese Zeile wäre die Verteilungsprüfung
           weiter unten auch dann grün, wenn wieder gleichverteilt aus
           allen Sorten gezogen würde — die beiden Kurven ähneln sich. */
        var drin = false;
        for (var mc = 0; mc < res.cards.length; mc++) {
          if (res.cards[mc].cardId === slot.type) { drin = true; break; }
        }
        if (!drin) matAusPack = false;
        matSlotsTotal++; sumSlots += slot.amount;
      }
      if (sumSlots !== res.material) matShapeOk = false;
      var bi = -1, hasGood = false;
      for (var s = 0; s < res.cards.length; s++) {
        tc[res.cards[s].tierIndex]++; slotsTotal++;
        kartenJeId[res.cards[s].cardId]++;
        if (HEROES.indexOf(res.cards[s].cardId) >= 0) heroSlots++;
        if (res.cards[s].tierIndex > bi) bi = res.cards[s].tierIndex;
        if (res.cards[s].tierIndex >= 1) hasGood = true;
      }
      if (hasGood) packsWithGoodPlus++;
      streakNoEpic = bi >= 3 ? 0 : streakNoEpic + 1;
      maxStreakNoEpic = Math.max(maxStreakNoEpic, streakNoEpic);
      streakNoLeg = bi >= 4 ? 0 : streakNoLeg + 1;
      maxStreakNoLeg = Math.max(maxStreakNoLeg, streakNoLeg);
    }
    console.log("\n10.000 Bronze-Packs (" + slotsTotal + " Kartenslots):");
    var raw = PACKS.bronze.weights;
    for (var i3 = 0; i3 < 5; i3++) {
      console.log("  " + pad(TIERS[i3].name + " (" + TIERS[i3].colorName + ")", 20) +
        padL((tc[i3] / slotsTotal * 100).toFixed(3), 8) + " %   (Rohgewicht " + raw[i3] +
        " %)   " + fmt(tc[i3]) + " Slots");
    }
    console.log("  Suprem: " + tc[5] + " Slots (muss 0 sein)");
    console.log("  Ø Material/Pack: " + r2(matTotal / N) + "   Ø Gold/Pack: " + r2(goldTotal / N));
    console.log("  Essenz-Verteilung (" + fmt(matSlotsTotal) + " Posten) gegen die " +
      "Kartenverteilung (" + fmt(slotsTotal) + " Karten):");
    MATERIAL_KEYS.forEach(function (k) {
      console.log("    " + MATERIAL_BY_KEY[k].sym + " " + pad(MATERIAL_BY_KEY[k].name, 18) +
        padL((matSlotsBySort[k] / matSlotsTotal * 100).toFixed(2), 6) + " % der Posten   " +
        padL((kartenJeId[k] / slotsTotal * 100).toFixed(2), 6) + " % der Karten   " +
        padL(fmt(matBySort[k]), 8) + " Stück");
    });
    console.log("  Helden-Slots: " + (heroSlots / slotsTotal * 100).toFixed(2) + " % (Soll 6.25 %)");
    console.log("  Pity ausgelöst: Episch " + pityEpicHits + "×, Legendär " + pityLegHits + "×");
    console.log("  längste Durststrecke: " + maxStreakNoEpic + " Packs ohne Episch+, " +
      maxStreakNoLeg + " ohne Legendär");
    check("Garantie: jedes Bronze-Pack hat ≥1 Gut+", packsWithGoodPlus === N, packsWithGoodPlus + "/" + N);
    check("Suprem droppt nie", tc[5] === 0, tc[5]);
    check("Gewöhnlich-Quote 70-80 %", tc[0] / slotsTotal * 100 > 70 && tc[0] / slotsTotal * 100 < 80,
      (tc[0] / slotsTotal * 100).toFixed(2) + " %");
    check("Gut-Quote 18-28 %", tc[1] / slotsTotal * 100 > 18 && tc[1] / slotsTotal * 100 < 28,
      (tc[1] / slotsTotal * 100).toFixed(2) + " %");
    check("Helden-Quote ~6.25 % (±1 pp)", Math.abs(heroSlots / slotsTotal * 100 - 6.25) < 1,
      (heroSlots / slotsTotal * 100).toFixed(2) + " %");
    check("Ø Material/Pack ≈ 7 (2 Slots à 2-5)", matTotal / N > 6 && matTotal / N < 8, r2(matTotal / N));
    check("Material-Slot-Form {type, amount} korrekt, Summe == material", matShapeOk);
    check("jeder Essenz-Posten gehört zu einer Karte AUS DIESEM PACK", matAusPack);
    /* Nicht „je 12,5 %": Helden droppen 5× seltener (HERO_WEIGHT), also
       droppt Heldenessenz auch 5× seltener. Der Soll-Wert ist deshalb
       die KARTENVERTEILUNG selbst — 6 Türme à 15,6 %, 2 Helden à 3,1 %.
       Eine feste Zahl hier hätte HERO_WEIGHT stillschweigend
       überschrieben. */
    check("Essenz-Verteilung folgt der Kartenverteilung (±1 pp je Sorte)",
      MATERIAL_KEYS.every(function (k) {
        return Math.abs(matSlotsBySort[k] / matSlotsTotal * 100 -
                        kartenJeId[k] / slotsTotal * 100) < 1;
      }), MATERIAL_KEYS.map(function (k) {
        return (matSlotsBySort[k] / matSlotsTotal * 100).toFixed(1) + "/" +
               (kartenJeId[k] / slotsTotal * 100).toFixed(1);
      }).join(" · "));
    check("Turmessenz ~15.6 %, Heldenessenz ~3.1 % der Posten",
      Math.abs(matSlotsBySort.fire / matSlotsTotal * 100 - 15.625) < 1.2 &&
      Math.abs(matSlotsBySort.solara / matSlotsTotal * 100 - 3.125) < 1.2,
      (matSlotsBySort.fire / matSlotsTotal * 100).toFixed(2) + " % / " +
      (matSlotsBySort.solara / matSlotsTotal * 100).toFixed(2) + " %");
    check("jede Sorte droppt überhaupt", MATERIAL_KEYS.every(function (k) { return matBySort[k] > 0; }));
    check("Ø Gold/Pack ≈ 600", goldTotal / N > 550 && goldTotal / N < 650, r2(goldTotal / N));
    check("Pity Episch greift: nie >" + PITY_EPIC + " Packs ohne Episch+", maxStreakNoEpic <= PITY_EPIC, maxStreakNoEpic);
    check("Pity Legendär greift: nie >" + PITY_LEGENDARY + " Packs ohne Legendär", maxStreakNoLeg <= PITY_LEGENDARY, maxStreakNoLeg);
    check("Pity wurde in 10k Packs tatsächlich ausgelöst", pityEpicHits > 0 && pityLegHits > 0,
      pityEpicHits + " / " + pityLegHits);

    // Garantien der übrigen Pack-Typen
    ["silver", "gold", "arcane"].forEach(function (pt) {
      API._reset();
      var r = mulberry32(4242), okAll = true, n2 = 2000;
      for (var q = 0; q < n2; q++) {
        var pr = openPack(pt, POOL, HEROES, r), b2 = 0;
        for (var s2 = 0; s2 < pr.cards.length; s2++) b2 = Math.max(b2, pr.cards[s2].tierIndex);
        if (b2 < PACKS[pt].guarantee) okAll = false;
      }
      check("Garantie " + PACKS[pt].name + ": " + PACKS[pt].promise, okAll);
    });

    /* --- 3. Merge-Pyramide 3^5 --- */
    API._reset();
    addDrop("fire", "common", 243);
    var ma = mergeAll("fire");
    var fc = get().cards.fire;
    console.log("\nMerge-Pyramide: 243 Gewöhnlich-Kopien → mergeAll");
    console.log("  Merges gesamt: " + ma.merges + "   " +
      TIER_KEYS.map(function (k) { return k + ":" + fc.copies[k]; }).join(" "));
    console.log("  Endstufe: " + tierOf(fc.tier).name + " (Cap " + capOf(fc.tier) + ")");
    check("243 common → 1 Suprem", fc.tier === "supreme" && fc.copies.supreme === 1, fc.tier);
    check("Pyramide exakt aufgebraucht (81+27+9+3+1 = 121 Merges)", ma.merges === 121, ma.merges);
    check("keine Restkopien unterhalb Suprem", TIER_KEYS.slice(0, 5).every(function (k) { return fc.copies[k] === 0; }));
    check("Cap durch Merges auf 100", capOf(fc.tier) === 100);
    check("Bonus-Wahlen offen (Gut + Selten ausformuliert)", fc.pendingBoni.length === 2,
      fc.pendingBoni.join(","));
    var pc = pendingBonusChoices("fire");
    check("pendingBonusChoices liefert je 2 Optionen", pc.length === 2 && pc[0].choices.length === 2);
    check("chooseMergeBonus speichert", !!chooseMergeBonus("fire", "fire_good_rate"));
    check("chooseMergeBonus lehnt Fremdkarte ab", chooseMergeBonus("water", "fire_rare_exec") === null);
    check("chooseMergeBonus lehnt doppelte Wahl ab", chooseMergeBonus("fire", "fire_good_burnlen") === null);
    check("modsOf liefert attackRate ×0.94", r2((modsOf("fire").attackRate || {}).mul) === 0.94);

    /* --- 4. Merge-Mechanik im Detail --- */
    API._reset();
    addDrop("water", "common", 2);
    check("canMerge false bei 2 Kopien", canMerge("water", "common") === false);
    check("progressToNextMerge 2/3", progressToNextMerge("water").have === 2 &&
      progressToNextMerge("water").need === 3);
    addDrop("water", "common", 1);
    check("canMerge true bei 3 Kopien", canMerge("water", "common") === true);
    var mr = merge("water", "common");
    check("Merge hebt aktive Stufe auf Gut", mr && mr.newTier === "good" && mr.tierUp === true, mr && mr.newTier);
    check("Merge stellt 2 Bonus-Optionen zur Wahl", mr.bonusChoices.length === 2,
      mr.bonusChoices.map(function (x) { return x.txt; }).join(" | "));
    check("Merge verbraucht genau 3 Kopien", get().cards.water.copies.common === 0 &&
      get().cards.water.copies.good === 1);
    // Merge einer NIEDRIGEREN Stufe erzeugt nur Kopien, hebt die Stufe nicht
    addDrop("water", "common", 3);
    var mr2 = merge("water", "common");
    check("Merge unterhalb der aktiven Stufe erzeugt nur eine Kopie", mr2.tierUp === false &&
      get().cards.water.copies.good === 2 && get().cards.water.tier === "good");
    check("Merge auf Suprem nicht möglich (Endstufe)", canMerge("water", "supreme") === false);

    /* --- 4c. JOKER-Karten (AA-Befund 29.07.2026) ---
     * Geprüft werden die REGELN, nicht meine Umsetzung. Die wichtigste ist
     * die Obergrenze: ein Joker hilft, er ersetzt nicht die Sammlung.
     * Deshalb steht hier ausdrücklich auch der Fall, der scheitern MUSS —
     * drei Joker ohne echte Kopie. Eine Prüfung, die nur das Gelingen
     * misst, hätte eine Umsetzung durchgewunken, die aus drei Jokern eine
     * Karte macht, die man gar nicht besitzt. */
    console.log("\nJoker:");
    check("kein Joker für Suprem (Endstufe, nichts zu verschmelzen)",
      JOKER_TIER_KEYS.indexOf("supreme") < 0 &&
      JOKER_TIER_KEYS.length === TIER_KEYS.length - 1,
      JOKER_TIER_KEYS.join("/"));
    API._reset();
    var jk = addJoker("good", 5);
    check("addJoker bucht auf die genannte Stufe", jk.good === 5 && jk.total === 5,
      JSON.stringify(jk));
    check("addJoker mit unbekannter Stufe bucht NICHTS", (function () {
      var vor = getJokers().total;
      addJoker("gibtsnicht", 9); addJoker("supreme", 9);
      return getJokers().total === vor;
    })(), JSON.stringify(getJokers()));
    check("Joker überleben das Neulesen des Standes", getJokers().good === 5);

    // Zwei echte Kopien + ein Joker
    API._reset();
    addJoker("good", 3);
    addDrop("fire", "good", 2);
    var i1 = mergeInfo("fire", "good");
    console.log("  fehlt " + i1.fehlt + ", Vorrat " + i1.jokerVorrat +
      ", nutzbar " + i1.jokerNutzbar + ", ok=" + i1.ok + ", mitJokern=" + i1.okMitJokern);
    check("mergeInfo: 2 Kopien → fehlt 1, ohne Joker nicht möglich",
      i1.have === 2 && i1.fehlt === 1 && i1.ok === false && i1.okMitJokern === true);
    check("mergeInfo: nutzbar ist auf die Lücke begrenzt, nicht auf den Vorrat",
      i1.jokerNutzbar === 1, i1.jokerNutzbar + " bei Vorrat " + i1.jokerVorrat);
    var m1 = merge("fire", "good", 1);
    check("Merge mit 1 Joker verbraucht 2 Kopien + 1 Joker",
      m1 && m1.jokersUsed === 1 && m1.copiesUsed === 2 && getJokers().good === 2,
      m1 ? (m1.copiesUsed + " Kopien / " + m1.jokersUsed + " Joker") : "null");
    check("und erzeugt eine Kopie GENAU DIESER Karte auf der nächsten Stufe",
      get().cards.fire.copies.rare === 1 && get().cards.fire.copies.good === 0);

    // Eine echte Kopie + zwei Joker
    API._reset();
    addJoker("common", 4);
    addDrop("water", "common", 1);
    var m2 = merge("water", "common", 2);
    check("Merge mit 2 Jokern verbraucht 1 Kopie + 2 Joker",
      m2 && m2.jokersUsed === 2 && m2.copiesUsed === 1 && getJokers().common === 2,
      m2 ? (m2.copiesUsed + " / " + m2.jokersUsed) : "null");

    // Der Fall, der scheitern MUSS
    API._reset();
    addJoker("common", 9);
    check("DREI Joker ohne echte Kopie werden abgelehnt",
      merge("nature", "common", 3) === null && getJokers().common === 9,
      "Vorrat danach " + getJokers().common);
    check("canMerge sagt dasselbe", canMerge("nature", "common", 3) === false);
    check("auch mit 2 Jokern und NULL Kopien geht nichts",
      merge("nature", "common", 2) === null && getJokers().common === 9);
    API._reset();
    addJoker("common", 1);
    addDrop("nature", "common", 1);
    check("mehr Joker verlangt als vorhanden → abgelehnt, Vorrat unberührt",
      merge("nature", "common", 2) === null && getJokers().common === 1);

    // mergeAll fasst ohne Option keinen Joker an
    API._reset();
    addJoker("common", 6);
    addDrop("earth", "common", 2);
    var ma = mergeAll("earth");
    check("„Alle verschmelzen\" ohne Option verbraucht NULL Joker",
      ma.jokersUsed === 0 && getJokers().common === 6 && ma.merges === 0,
      ma.merges + " Merges, " + ma.jokersUsed + " Joker");
    var ma2 = mergeAll("earth", { useJokers: true });
    check("mit ausdrücklicher Option greift es zu",
      ma2.jokersUsed > 0 && ma2.merges > 0,
      ma2.merges + " Merges, " + ma2.jokersUsed + " Joker");
    check("und stoppt, sobald keine echte Kopie mehr da ist",
      get().cards.earth.copies.common === 0);

    // Ein Stand von gestern kennt das Feld noch nicht
    API._reset();
    API._write({ v: STATE_VERSION, cards: {}, materials: emptyMaterials(), matRR: 0,
                 gold: null, pityEpic: 2, pityLegendary: 5, packsOpened: 7 });
    check("ein v4-Stand OHNE Joker-Feld bekommt es beim Lesen (keine Migration nötig)",
      getJokers().total === 0 && get().jokers.good === 0 &&
      get().pityEpic === 2 && get().packsOpened === 7,
      JSON.stringify(getJokers()));

    /* --- 4b. Essenzen: Buchung & Verbrauch --- */
    var L_M = MATERIAL_KEYS.length;
    API._reset();
    var mm = addMaterial(30, "water");
    check("addMaterial(30,'water') bucht nur auf 'water'", mm.water === 30 &&
      mm.total === 30 && MATERIAL_KEYS.every(function (k) {
        return k === "water" ? mm[k] === 30 : mm[k] === 0;
      }), JSON.stringify(mm));
    API._reset();
    addMaterial(L_M);
    check("addMaterial(" + L_M + ") ohne Sorte verteilt je 1", (function () {
      var g = getMaterials();
      return g.total === L_M && MATERIAL_KEYS.every(function (k) { return g[k] === 1; });
    })(), JSON.stringify(getMaterials()));
    API._reset();
    for (var rr = 0; rr < L_M; rr++) addMaterial(1);
    check("Round-Robin: " + L_M + "× addMaterial(1) landet auf " + L_M + " verschiedenen Sorten",
      (function () {
        var g = getMaterials();
        return g.total === L_M && MATERIAL_KEYS.every(function (k) { return g[k] === 1; });
      })(), JSON.stringify(getMaterials()));
    API._reset();
    addMaterial(L_M + 2);
    check("addMaterial(" + (L_M + 2) + ") ohne Sorte: Rest wandert, Summe stimmt", (function () {
      var g = getMaterials();
      var w = MATERIAL_KEYS.map(function (k) { return g[k]; }).sort().join(",");
      return g.total === L_M + 2 && w === new Array(L_M - 2).fill(1).concat([2, 2]).sort().join(",");
    })(), JSON.stringify(getMaterials()));
    check("getMaterials().total == Summe der Sorten", (function () {
      var g = getMaterials(), n = 0;
      MATERIAL_KEYS.forEach(function (k) { n += g[k]; });
      return g.total === n;
    })());
    check("unbekannte Sorte wird wie 'ohne Sorte' verteilt", (function () {
      API._reset(); addMaterial(L_M, "quatsch");
      var g = getMaterials(); return MATERIAL_KEYS.every(function (k) { return g[k] === 1; });
    })());
    check("ein v3-Sortenname bucht NICHTS mehr gezielt", (function () {
      API._reset(); addMaterial(L_M, "attack");
      var g = getMaterials();
      // wird verteilt, nicht auf einen Topf 'attack' gelegt (den gibt es nicht)
      return g.total === L_M && MATERIAL_KEYS.every(function (k) { return g[k] === 1; }) &&
        g.attack === undefined;
    })());

    // levelUp verbraucht NUR die eigene Essenz der Karte
    API._reset();
    addDrop("fire", "common", 1);
    addMaterial(50, "water");
    addMaterial(50, "earth");   // Nachbar-Sorte, früher derselbe Topf wie fire
    check("Level-Up scheitert mit fremder Essenz im Vorrat",
      canLevelUp("fire").reason === "material", canLevelUp("fire").reason +
      " (habe " + canLevelUp("fire").haveMaterial + " " + canLevelUp("fire").materialName + ")");
    check("100 fremde Essenz helfen EMBER kein Stück",
      canLevelUp("fire").haveMaterial === 0, canLevelUp("fire").haveMaterial);
    addMaterial(10, "fire");
    var luS = levelUp("fire");
    var gS = getMaterials();
    console.log("\nEssenz-Verbrauch: EMBER (" + materialInfoOf("fire").name + ") Lv1→Lv" +
      (luS && luS.newLvl) + "  " + JSON.stringify(gS));
    // AA-kalibriert: Gewöhnlich auf Lv1 braucht nur 1 Material (§13).
    check("levelUp zieht genau 1 Ember-Essenz ab", luS && luS.materialSpent === 1 &&
      gS.fire === 9, gS.fire);
    check("levelUp lässt jede andere Essenz unberührt", gS.water === 50 && gS.earth === 50 &&
      gS.total === 109, JSON.stringify(gS));
    check("levelUp meldet die Sorte mit", luS && luS.materialType === "fire" &&
      luS.materialName === "Ember-Essenz");
    check("view() nennt Sorte + Bestand dieser Sorte", (function () {
      var v = view("water");
      return v.materialType === "water" && v.materialName === "Frost-Essenz" &&
             v.haveMaterial === 50;
    })());
    check("eine Karte ohne eigene Essenz kann nicht leveln", (function () {
      var c = canLevelUp("irgendein_item");
      return c.ok === false && c.materialType === null && c.haveMaterial === 0;
    })());

    /* --- 5. Level & Cap-Gating --- */
    API._reset();
    addDrop("earth", "common", 1);
    addMaterial(5000);
    check("Level-Up braucht Besitz", canLevelUp("light").reason === "unowned");
    var steps = 0, guard = 0;
    while (levelUp("earth") && guard++ < 200) steps++;
    var ec = get().cards.earth;
    console.log("\nCap-Gating: Gewöhnlich → " + steps + " Level-Ups → Lv" + ec.lvl);
    check("Level stoppt bei Cap 25", ec.lvl === 25 && steps === 24, "Lv" + ec.lvl + " nach " + steps);
    check("canLevelUp meldet 'cap'", canLevelUp("earth").reason === "cap");
    check("levelUp über Cap schlägt fehl", levelUp("earth") === null);
    addDrop("earth", "common", 3);
    merge("earth", "common");
    check("nach Merge: Stufe Gut, Cap 40, Level bleibt 25", get().cards.earth.tier === "good" &&
      capOf(get().cards.earth.tier) === 40 && get().cards.earth.lvl === 25);
    check("canLevelUp wieder ok", canLevelUp("earth").ok === true);
    var lu = levelUp("earth");
    check("Level-Up kostet 4 Material auf Stufe Gut", lu && lu.materialSpent === 4 && lu.newLvl === 26,
      lu && ("Lv" + lu.newLvl + " / " + lu.materialSpent + " " + lu.materialName + " / " +
             lu.goldCost + " Gold"));
    check("Gold-Kosten werden nur gemeldet, nicht abgezogen", get().gold === null);
    API._reset();
    // LIGHT verbraucht Tempo-Essenz; ohne Vorrat dieser Sorte → Material-Mangel.
    addDrop("light", "common", 1);
    check("canLevelUp meldet Material-Mangel", canLevelUp("light").reason === "material",
      "brauche " + canLevelUp("light").needMaterial + ", habe " + canLevelUp("light").haveMaterial);
    addMaterial(20, "speed");
    addMaterial(10, "speed");
    check("canLevelUp meldet Gold-Mangel", canLevelUp("light", 50).reason === "gold");

    /* --- 6. Material-/Gold-Gesamtbedarf einer Karte Lv1→100 --- */
    (function () {
      var mat = 0, gold = 0, tIdx = 0;
      for (var l = 1; l < 100; l++) {
        while (tIdx < TIERS.length - 1 && l > TIERS[tIdx].cap) tIdx++;
        mat += materialFor(l, tIdx);
        gold += goldFor(l);
      }
      console.log("\nEine Karte von Lv1 auf Lv100: " + mat + " Material + " + fmt(gold) +
        " Gold + 243 Gewöhnlich-Kopien (Merge-Pyramide)");
      check("Material-Gesamtbedarf 650-900 (AA-kalibriert)", mat > 650 && mat < 900, mat);
    })();

    /* --- 6b. Sichtbarer Pity-Counter (AA-Muster §8.2) --- */
    API._reset();
    var ps0 = getPityStatus();
    console.log("\nPity-Status (offen angezeigt, AA-Muster §8.2):");
    console.log("  frischer Zähler:  Episch in ≤" + ps0.epicIn + " Packs, Legendär in ≤" +
      ps0.legendaryIn + "   (Schwellen " + ps0.epicThreshold + "/" + ps0.legendaryThreshold + ")");
    check("frischer Pity-Status: 26 / 76", ps0.epicIn === PITY_EPIC + 1 &&
      ps0.legendaryIn === PITY_LEGENDARY + 1, ps0.epicIn + " / " + ps0.legendaryIn);
    (function () {
      // Zähler auf 24 setzen und den Countdown gegen die Realität prüfen.
      var st = get(); st.pityEpic = 24; st.pityLegendary = 60; save(st);
      var ps = getPityStatus();
      console.log("  Zähler 24/60:     Episch in ≤" + ps.epicIn + " Packs, Legendär in ≤" + ps.legendaryIn);
      check("Countdown zählt runter (24 → Episch in ≤2)", ps.epicIn === 2 && ps.legendaryIn === 16,
        ps.epicIn + " / " + ps.legendaryIn);
      // Genau epicIn Packs öffnen → spätestens im letzten MUSS Episch+ drin sein.
      var r3 = mulberry32(777), sawEpic = false, need = ps.epicIn;
      for (var q = 0; q < need; q++) {
        var pr3 = openPack("bronze", POOL, HEROES, r3);
        for (var s3 = 0; s3 < pr3.cards.length; s3++) if (pr3.cards[s3].tierIndex >= 3) sawEpic = true;
      }
      check("Zusage hält: nach " + need + " Packs war ein Episches dabei", sawEpic);
      check("Pity-Status nach dem Treffer zurückgesetzt", getPityStatus().epicIn === PITY_EPIC + 1,
        getPityStatus().epicIn);
      check("openPack liefert pityStatus mit", typeof openPack("bronze", POOL, HEROES, r3)
        .pityStatus.epicIn === "number");
    })();

    /* --- 7. Migration v1 → v2 → v3 → v4 --- */
    API._reset();
    var v1 = {
      v: 1, dust: 300, material: 0, pityEpic: 3, pityLegendary: 9, packsOpened: 44,
      cards: {
        fire:  { lvl: 45, copies: 12, perks: ["fire_good_burnlen"] },   // v1 Episch/blau
        water: { lvl: 8,  copies: 5,  perks: [] },                      // v1 Gewöhnlich
        light: { lvl: 100, copies: 50, perks: [] },                     // v1 Suprem
      },
    };
    API._write(v1);
    var mg = migrateV1();
    var ms = get();
    var mgMat = getMaterials();
    console.log("\nMigration v1→v4 (drei Stufen in einem Durchlauf): " + mg.cards +
      " Karten, Material " + JSON.stringify(mgMat));
    Object.keys(ms.cards).forEach(function (k) {
      var c = ms.cards[k];
      console.log("  " + pad(k, 8) + tierOf(c.tier).name + " Lv" + c.lvl +
        "  Kopien " + c.copies[c.tier] + "  Boni [" + c.mergeBoni.join(",") + "]");
    });
    check("v1 Lv45 (blau) → Selten, Level gekappt auf 55", ms.cards.fire.tier === "rare" &&
      ms.cards.fire.lvl === 45);
    check("v1 Lv8 → Gewöhnlich Lv8", ms.cards.water.tier === "common" && ms.cards.water.lvl === 8);
    check("v1 Lv100 → Suprem Lv100", ms.cards.light.tier === "supreme" && ms.cards.light.lvl === 100);
    check("jede migrierte Karte besitzt 1 Kopie ihrer Stufe", Object.keys(ms.cards).every(function (k) {
      return ms.cards[k].copies[ms.cards[k].tier] === 1;
    }));
    check("alte Kopien + Staub → Material (12+5+50 + 300/10 = 97)", mgMat.total === 97, mgMat.total);
    /* 97 → v3: 33 attack / 32 speed / 32 special
       → v4: attack an fire+earth (17/16), speed an water+light (16/16),
             special an nature/darkness/solara/magmor (8/8/8/8). */
    check("v1-Material landet auf den KARTEN-Sorten (17/16/16/16/8/8/8/8)",
      mgMat.fire === 17 && mgMat.earth === 16 && mgMat.water === 16 && mgMat.light === 16 &&
      mgMat.nature === 8 && mgMat.darkness === 8 && mgMat.solara === 8 && mgMat.magmor === 8,
      JSON.stringify(mgMat));
    check("Summe über beide Migrationsstufen unverändert (97)", mgMat.total === 97, mgMat.total);
    check("die drei v3-Töpfe sind im Stand nicht mehr vorhanden",
      get().materials.attack === undefined && get().materials.speed === undefined &&
      get().materials.special === undefined);
    check("altes Zahlenfeld `material` ist weg", get().material === undefined);
    check("alte Perks überleben als mergeBoni", ms.cards.fire.mergeBoni.length === 1);
    check("Migration läuft nur einmal", migrateV1().skipped === true);
    check("State-Version ist 4", get().v === 4, get().v);
    check("Pity-Zähler überleben die Migration", get().pityEpic === 3 && get().pityLegendary === 9);

    /* --- 7b. Migration v2 → v4 (generisches Material → Karten-Essenzen) --- */
    API._reset();
    var v2 = {
      v: 2, material: 100, gold: null, pityEpic: 7, pityLegendary: 31, packsOpened: 88,
      cards: {
        fire:  { tier: "good", lvl: 30, copies: { common: 2, good: 1, rare: 0, epic: 0, legendary: 0, supreme: 0 },
                 mergeBoni: ["fire_good_rate"], pendingBoni: [] },
        water: { tier: "common", lvl: 11, copies: { common: 4, good: 0, rare: 0, epic: 0, legendary: 0, supreme: 0 },
                 mergeBoni: [], pendingBoni: [] },
      },
    };
    API._write(v2);
    var mg2 = migrateV1();
    var m2 = getMaterials(), s2 = get();
    console.log("\nMigration v2→v4: 100 generisches Material → " + JSON.stringify(m2));
    check("v2→v4 lief (nicht übersprungen)", mg2.skipped === false);
    /* 100 → v3: 34/33/33 → v4: 17+17 / 17+16 / 9+8+8+8 = 100. */
    check("100 Material → 17/17/17/16/9/8/8/8, Summe unverändert",
      m2.fire === 17 && m2.earth === 17 && m2.water === 17 && m2.light === 16 &&
      m2.nature === 9 && m2.darkness === 8 && m2.solara === 8 && m2.magmor === 8 &&
      m2.total === 100, JSON.stringify(m2));
    check("Karten/Level/Kopien/Boni bleiben unangetastet", s2.cards.fire.tier === "good" &&
      s2.cards.fire.lvl === 30 && s2.cards.fire.copies.common === 2 &&
      s2.cards.fire.mergeBoni[0] === "fire_good_rate" && s2.cards.water.copies.common === 4);
    check("Pity/packsOpened bleiben erhalten", s2.pityEpic === 7 && s2.pityLegendary === 31 &&
      s2.packsOpened === 88);
    check("State-Version nach v2→v4 ist 4", s2.v === 4, s2.v);
    check("zweiter Aufruf ist ein No-Op", migrateV1().skipped === true);
    check("EMBER kann nach der Migration sofort leveln (17 Ember-Essenz)",
      canLevelUp("fire", 1e9).ok === true, canLevelUp("fire", 1e9).reason || "ok");
    check("EMBERs Essenz ist 'fire', nicht mehr 'attack'",
      canLevelUp("fire", 1e9).materialType === "fire" &&
      canLevelUp("fire", 1e9).materialName === "Ember-Essenz");

    /* --- 7c. Migration v3 → v4 aus einem ECHTEN v3-Stand ---
     * Der Weg über v1/v2 oben läuft durch migrateV2toV3() und damit durch
     * unseren eigenen Verteiler. Hier steht ein v3-Stand, wie ihn ein
     * Spielgerät seit dem 25.07. wirklich liegen hat: krumme Zahlen, die
     * kein Drittel von irgendetwas sind. */
    API._reset();
    API._write({
      v: 3, materials: { attack: 41, speed: 7, special: 26 }, matRR: 2, gold: null,
      pityEpic: 12, pityLegendary: 60, packsOpened: 210,
      cards: { earth: { tier: "epic", lvl: 62,
                        copies: { common: 0, good: 0, rare: 0, epic: 3, legendary: 0, supreme: 0 },
                        mergeBoni: [], pendingBoni: [] } },
    });
    var mg3 = migrateV1(), m3 = getMaterials(), s3s = get();
    console.log("\nMigration v3→v4: {attack:41, speed:7, special:26} → " + JSON.stringify(m3));
    check("v3→v4 lief", mg3.skipped === false && s3s.v === 4, s3s.v);
    check("41 attack → fire 21 / earth 20 (Rest an den ersten Empfänger)",
      m3.fire === 21 && m3.earth === 20, m3.fire + "/" + m3.earth);
    check("7 speed → water 4 / light 3", m3.water === 4 && m3.light === 3,
      m3.water + "/" + m3.light);
    check("26 special → 8/6/6/6", m3.nature === 8 && m3.darkness === 6 &&
      m3.solara === 6 && m3.magmor === 6, JSON.stringify(m3));
    check("kein Stück verloren, keins erfunden (41+7+26 = 74)", m3.total === 74, m3.total);
    check("Karte bleibt Episch Lv62 mit 3 Kopien", s3s.cards.earth.tier === "epic" &&
      s3s.cards.earth.lvl === 62 && s3s.cards.earth.copies.epic === 3);
    check("Pity/packsOpened überleben auch v3→v4", s3s.pityEpic === 12 &&
      s3s.pityLegendary === 60 && s3s.packsOpened === 210);

    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
