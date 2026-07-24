/* ==================================================================
 * ARENA PITY — Garantie für Fusion-/Triple-Karten
 * ------------------------------------------------------------------
 * Problem: Fusion (ab Welle 3) und Triple (ab Welle 6) sind nur
 * MÖGLICH, nicht garantiert. Monster-HP wachsen mit 58*1.23^w — wer
 * Kartenpech hat, verliert unverschuldet. Dieses Modul erzwingt die
 * Karte, sobald sie spielbar WÄRE und eine Hand ohne sie vergangen ist.
 *
 * WIRING (arena_pan.html):
 *   1. <script src="arena_pity.js"></script> vor dem Haupt-<script>.
 *   2. Am Ende von newHand(), bevor die Hand gerendert wird:
 *        hand = ArenaPity.applyToHand(hand, {
 *          wave: wave,
 *          baseTowerCount: towers.filter(t => !t.fusion && !t.triple).length,
 *          hasFusionOnBoard: towers.some(t => t.fusion),
 *        });
 *   3. Bei Matchstart / Rematch:  ArenaPity.reset();
 *   4. Optional: __G.pity = ArenaPity.debugState;
 *
 * !! ANPASSEN !!  Die erzeugten Karten sind hier als {type:'fusion'}
 * bzw. {type:'triple'} modelliert. Ersetze CARD_FUSION/CARD_TRIPLE
 * unten durch das ECHTE Karten-Literal, das drawCard() für die
 * Fusions- bzw. Triple-Karte liefert (die lokale Session kennt es).
 * ================================================================== */
(function () {
  "use strict";

  // >>> ANPASSEN an das echte Karten-Format aus drawCard() <<<
  const CARD_FUSION = function () { return { type: "fusion" }; };
  const CARD_TRIPLE = function () { return { type: "triple" }; };

  const WAVE_FUSION = 3;   // ab dieser Welle ist Fusion spielbar
  const WAVE_TRIPLE = 6;   // ab dieser Welle ist Triple spielbar
  const MIN_BASE_TOWERS = 2; // Fusion braucht ≥2 Basis-Türme
  const MISS_LIMIT = 1;    // so viele Hände ohne die Karte werden geduldet

  // Miss-Zähler pro Match.
  let misses = { fusion: 0, triple: 0 };
  let forced = { fusion: false, triple: false };

  function reset() { misses = { fusion: 0, triple: 0 }; forced = { fusion: false, triple: false }; }

  function isType(c, t) {
    if (!c) return false;
    return c.type === t || c.kind === t || c.card === t;
  }
  function isTower(c) { return isType(c, "tower"); }
  function isPath(c) { return isType(c, "path"); }

  /* Index der Karte, die geopfert wird: bevorzugt die LETZTE Straßen-
   * karte, sonst die letzte Nicht-Turm-Karte, sonst -1 (Hand unangetastet
   * — mindestens eine Turmkarte muss laut newHand() erhalten bleiben). */
  function sacrificeIndex(hand) {
    for (let i = hand.length - 1; i >= 0; i--) if (isPath(hand[i])) return i;
    for (let i = hand.length - 1; i >= 0; i--) if (!isTower(hand[i])) return i;
    return -1;
  }

  /* applyToHand(hand, state) → hand (mutiert und gibt zurück)
   * state = {
   *   wave              aktuelle Wellennummer
   *   baseTowerCount    Anzahl Basis-Türme (keine Fusion/Triple) auf dem Board
   *   hasFusionOnBoard  true, wenn mind. 1 Fusionsturm steht
   *   fusionCardDrawnSinceEligible / tripleCardDrawnSinceEligible
   *                     optional: setzt das Spiel selbst true, wenn die
   *                     Karte bereits regulär gezogen wurde — dann ruht Pity
   * } */
  function applyToHand(hand, state) {
    if (!Array.isArray(hand) || !state) return hand;
    const w = state.wave | 0;

    const kinds = [
      { k: "fusion", eligible: w >= WAVE_FUSION && (state.baseTowerCount | 0) >= MIN_BASE_TOWERS,
        seen: !!state.fusionCardDrawnSinceEligible, make: CARD_FUSION },
      { k: "triple", eligible: w >= WAVE_TRIPLE && !!state.hasFusionOnBoard,
        seen: !!state.tripleCardDrawnSinceEligible, make: CARD_TRIPLE },
    ];

    for (const c of kinds) {
      if (!c.eligible || c.seen || forced[c.k]) continue;
      const inHand = hand.some(x => isType(x, c.k));
      if (inHand) { forced[c.k] = true; continue; }   // regulär gezogen → fertig
      if (misses[c.k] < MISS_LIMIT) { misses[c.k]++; continue; }
      const idx = sacrificeIndex(hand);
      if (idx < 0) continue;
      hand[idx] = c.make();
      forced[c.k] = true;
      break; // nie zwei Karten in derselben Hand erzwingen
    }
    return hand;
  }

  function debugState() {
    return { misses: { fusion: misses.fusion, triple: misses.triple },
             forced: { fusion: forced.fusion, triple: forced.triple },
             cfg: { WAVE_FUSION, WAVE_TRIPLE, MIN_BASE_TOWERS, MISS_LIMIT } };
  }

  window.ArenaPity = { applyToHand, reset, debugState };
})();
