/* ==================================================================
 * ARENA SURRENDER + COMEBACK
 * ------------------------------------------------------------------
 * A) Aufgeben: dezenter Button, der erst NACH 3 Minuten erscheint —
 *    früh aufgeben soll nicht zur Gewohnheit werden, ein aussichtsloses
 *    7-Minuten-Match aber auch niemanden festhalten.
 * B) Comeback: Boss-Kills geben Zurückliegenden Ult-Ladung + etwas
 *    Burg-HP zurück. Führende bekommen nur einen kleinen Ult-Bonus,
 *    damit die Restspannung erhalten bleibt.
 *
 * WIRING (arena_pan.html):
 *   1. <script src="arena_surrender.js"></script> vor dem Haupt-<script>.
 *   2. Nach Matchstart:
 *        ArenaSurrender.mountButton({ onSurrender: () => resolveEnd(false) });
 *      (statt resolveEnd(false) das, was dein Defeat-Ende auslöst)
 *   3. Im Sekunden-Tick des Spiels:
 *        ArenaSurrender.tick(420 - tSec);          // vergangene Sekunden
 *   4. Beim Matchende / Rematch:  ArenaSurrender.unmount();
 *   5. Dort, wo ein Boss stirbt:
 *        const cb = ArenaComeback.onBossKill(castleHP, foeHP);
 *        ultCharge = Math.min(1, ultCharge + cb.ultBonus);
 *        if (cb.healPct) castleHP = Math.min(15000, castleHP + cb.healPct * 15000);
 *        toast('⚡ Boss-Energie absorbiert!');      // eigene Toast-Funktion
 * ================================================================== */
(function () {
  "use strict";

  /* ---------------- A) Aufgeben ---------------- */

  const DEFAULT_AFTER_SEC = 180;   // Button erscheint erst nach 3 Minuten
  const CONFIRM_TIMEOUT = 5000;    // Auto-Abbruch der Rückfrage

  let btn = null, wrap = null, opts = null, shown = false, confirmT = 0;

  const BASE_CSS =
    "position:fixed;top:calc(env(safe-area-inset-top,0px) + 54px);left:50%;" +
    "transform:translateX(-50%);z-index:9500;padding:5px 12px;border-radius:999px;" +
    "border:1px solid rgba(255,255,255,.18);background:rgba(10,12,24,.55);" +
    "color:rgba(230,235,255,.55);font-size:11px;font-weight:700;letter-spacing:.04em;" +
    "cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent";

  /* mountButton(opts)
   *   opts.onSurrender  Callback bei Bestätigung (Pflicht für Wirkung)
   *   opts.afterSec     Sichtbar ab dieser Matchzeit (default 180)
   *   opts.css          überschreibt BASE_CSS komplett                */
  function mountButton(o) {
    unmount();
    opts = o || {};
    wrap = document.createElement("div");
    wrap.id = "surrenderwrap";

    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "surrenderbtn";
    btn.textContent = "🏳 Aufgeben";
    btn.style.cssText = opts.css || BASE_CSS;
    btn.style.display = "none";
    btn.addEventListener("click", askConfirm);

    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    shown = false;
    return btn;
  }

  function unmount() {
    clearTimeout(confirmT);
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    wrap = null; btn = null; opts = null; shown = false;
  }

  /* tick(elapsedSec) — jede Sekunde vom Spiel aufrufen. */
  function tick(elapsedSec) {
    if (!btn || shown) return;
    const after = (opts && opts.afterSec != null) ? opts.afterSec : DEFAULT_AFTER_SEC;
    if ((+elapsedSec || 0) >= after) {
      shown = true;
      btn.style.display = "";
      btn.style.opacity = "0";
      btn.style.transition = "opacity .6s";
      setTimeout(function () { if (btn) btn.style.opacity = "1"; }, 30);
    }
  }

  function closeConfirm() {
    clearTimeout(confirmT);
    const c = document.getElementById("surrenderconfirm");
    if (c && c.parentNode) c.parentNode.removeChild(c);
    if (btn) btn.style.display = shown ? "" : "none";
  }

  function askConfirm() {
    if (!wrap || document.getElementById("surrenderconfirm")) return;
    if (btn) btn.style.display = "none";

    const box = document.createElement("div");
    box.id = "surrenderconfirm";
    box.style.cssText =
      "position:fixed;top:calc(env(safe-area-inset-top,0px) + 48px);left:50%;" +
      "transform:translateX(-50%);z-index:9600;width:min(88vw,300px);padding:12px 14px;" +
      "border-radius:14px;text-align:center;font-family:inherit;color:#eef2ff;" +
      "background:linear-gradient(180deg,rgba(20,14,26,.97),rgba(10,10,20,.97));" +
      "border:1px solid rgba(255,120,120,.35);box-shadow:0 8px 32px rgba(0,0,0,.6)";
    box.innerHTML =
      `<div style="font-size:13px;line-height:1.4">Wirklich aufgeben?<br>
         <span style="opacity:.7;font-size:12px">Zählt als Niederlage.</span></div>
       <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
         <button type="button" data-sr="yes" style="flex:0 0 auto;padding:7px 18px;border-radius:999px;border:0;
           background:linear-gradient(90deg,#ff5b5b,#ff8a4c);color:#fff;font-size:13px;font-weight:900;
           cursor:pointer;font-family:inherit">Ja</button>
         <button type="button" data-sr="no" style="flex:0 0 auto;padding:7px 18px;border-radius:999px;
           border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#cfd6ff;
           font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Nein</button>
       </div>`;
    wrap.appendChild(box);

    box.querySelector('[data-sr="no"]').addEventListener("click", closeConfirm);
    box.querySelector('[data-sr="yes"]').addEventListener("click", function () {
      const cb = opts && opts.onSurrender;
      closeConfirm();
      if (typeof cb === "function") { try { cb(); } catch (e) {} }
    });

    confirmT = setTimeout(closeConfirm, CONFIRM_TIMEOUT); // 5s Auto-Cancel
  }

  window.ArenaSurrender = { mountButton, unmount, tick, _askConfirm: askConfirm };

  /* ---------------- B) Comeback ---------------- */

  const ULT_MIN = 0.25, ULT_MAX = 0.50;  // Bonus-Spanne für Zurückliegende
  const ULT_AHEAD = 0.10;                // Trostbonus für Führende
  const HEAL_PCT = 0.04;                 // 4% der 15000 Burg-HP = 600

  /* onBossKill(hpYou, hpFoe) → { ultBonus, healPct, behind }
   * Der Rückstand wird relativ gemessen: je größer die Lücke, desto
   * näher an ULT_MAX. Das Spiel addiert ultBonus auf ultCharge (cap 1)
   * und heilt castleHP um healPct * 15000. */
  function onBossKill(hpYou, hpFoe) {
    const you = Math.max(0, +hpYou || 0);
    const foe = Math.max(0, +hpFoe || 0);
    if (you >= foe) return { ultBonus: ULT_AHEAD, healPct: 0, behind: 0 };

    const denom = Math.max(1, you + foe);
    const behind = Math.max(0, Math.min(1, (foe - you) / denom)); // 0..1
    // behind ~0.05 → nahe ULT_MIN, behind ~0.5+ → ULT_MAX
    const t = Math.min(1, behind / 0.5);
    const ultBonus = ULT_MIN + (ULT_MAX - ULT_MIN) * t;
    return { ultBonus: Math.round(ultBonus * 100) / 100, healPct: HEAL_PCT, behind };
  }

  window.ArenaComeback = { onBossKill, _cfg: { ULT_MIN, ULT_MAX, ULT_AHEAD, HEAL_PCT } };
})();
