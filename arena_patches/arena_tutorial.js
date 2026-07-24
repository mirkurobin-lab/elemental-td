/* ==================================================================
 * ARENA TUTORIAL — Erstes-Match-Coach (~60 Sekunden)
 * ------------------------------------------------------------------
 * Fünf kurze Schritte, die im LAUFENDEN ersten Match erklären, was
 * dieses Spiel von normalem TD unterscheidet: die Straße wird selbst
 * gebaut, Monster spawnen am Straßenkopf, der Held kämpft mit.
 * Läuft genau EINMAL (localStorage "arenaTutorialDone").
 *
 * WIRING (arena_pan.html):
 *   1. <script src="arena_tutorial.js"></script> vor dem Haupt-<script>.
 *   2. Direkt nach dem Spielstart (nach dem ersten newHand()/Render):
 *        if (window.ArenaTutorial && ArenaTutorial.needed())
 *          ArenaTutorial.start({
 *            onPause:  () => { paused = true;  },   // z.B. nextWaveIn einfrieren
 *            onResume: () => { paused = false; },
 *          });
 *   3. In place() (Straße gelegt), am Ende des Erfolgspfads:
 *        window.ArenaTutorial && ArenaTutorial.notify('pathPlaced');
 *   4. In placeTower(), am Ende des Erfolgspfads:
 *        window.ArenaTutorial && ArenaTutorial.notify('towerPlaced');
 *
 * Hinweis: onPause/onResume sind OPTIONAL. Fehlen sie, läuft das Match
 * einfach weiter — das Overlay ist dann nur ein Hinweis-Layer.
 * ================================================================== */
(function () {
  "use strict";

  const KEY = "arenaTutorialDone";
  const Z = 99000;

  // Steps: wait = null → "Weiter"-Tap, sonst Event-Name aus notify().
  const STEPS = [
    { id: "intro", wait: null, target: "board",
      text: "Willkommen in der Arena! Monster spawnen am ENDE deiner Straße und laufen zu deiner Burg.",
      cta: "Weiter" },
    { id: "path", wait: "pathPlaced", target: "hand",
      text: "Spiele eine STRASSEN-Karte und ziehe sie aufs Feld — je länger dein Weg, desto mehr Zeit haben deine Türme.",
      cta: null },
    { id: "tower", wait: "towerPlaced", target: "hand",
      text: "Baue jetzt einen TURM auf einen leuchtenden Bauplatz neben der Straße.",
      cta: null },
    { id: "hero", wait: null, target: "board",
      text: "Dein Held kämpft mit! Tippe auf das Feld, um ihn zu bewegen — seine Zauber findest du unten.",
      cta: "Weiter" },
    { id: "goal", wait: null, target: null,
      text: "Gewinne, indem die Burg deines Rivalen zuerst fällt. Viel Erfolg!",
      cta: "Los geht's!" },
  ];

  // Ab diesem Step läuft das Spiel wieder normal (Steps 1–3 pausierbar).
  const PAUSE_UNTIL_INDEX = 2;

  let state = null; // {i, opts, root, ring, panel, paused}

  function needed() {
    try { return localStorage.getItem(KEY) !== "1"; } catch (e) { return false; }
  }
  function markDone() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }

  function el(sel) {
    if (!sel) return null;
    if (typeof sel !== "string") return sel.getBoundingClientRect ? sel : null;
    try { return document.querySelector(sel); } catch (e) { return null; }
  }

  function buildDom() {
    const root = document.createElement("div");
    root.id = "tutovl";
    root.style.cssText =
      "position:fixed;inset:0;z-index:" + Z + ";pointer-events:auto;" +
      "font-family:inherit;color:#eef2ff;-webkit-tap-highlight-color:transparent";

    // Abdunklung: eigenes div, damit der Ring darüber ein "Loch" stanzen kann.
    const dim = document.createElement("div");
    dim.className = "tutodim";
    dim.style.cssText = "position:absolute;inset:0;background:rgba(4,6,16,.62);transition:opacity .2s";
    root.appendChild(dim);

    // Highlight-Ring: transparenter Kreis mit riesigem box-shadow = Loch-Effekt.
    const ring = document.createElement("div");
    ring.className = "tutoring";
    ring.style.cssText =
      "position:absolute;border-radius:18px;pointer-events:none;display:none;" +
      "box-shadow:0 0 0 9999px rgba(0,0,0,.7), 0 0 26px 4px rgba(140,180,255,.75) inset;" +
      "border:2px solid rgba(170,205,255,.9);transition:all .25s ease";
    root.appendChild(ring);

    const panel = document.createElement("div");
    panel.className = "tutopanel";
    panel.style.cssText =
      "position:absolute;left:50%;transform:translateX(-50%);width:min(92vw,420px);" +
      "padding:14px 16px 12px;border-radius:16px;text-align:center;" +
      "background:linear-gradient(180deg,rgba(18,22,44,.97),rgba(10,12,26,.97));" +
      "border:1px solid rgba(150,180,255,.35);box-shadow:0 10px 40px rgba(0,0,0,.6)";
    root.appendChild(panel);

    const skip = document.createElement("button");
    skip.type = "button";
    skip.textContent = "Überspringen";
    skip.style.cssText =
      "position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);right:12px;" +
      "padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.25);" +
      "background:rgba(0,0,0,.45);color:#cfd6ff;font-size:12px;font-weight:700;cursor:pointer";
    skip.addEventListener("click", function (ev) { ev.stopPropagation(); skip_(); });
    root.appendChild(skip);

    return { root, dim, ring, panel, skip };
  }

  function positionRing(target) {
    const r = state.ring;
    const node = el(target);
    if (!node || !node.getBoundingClientRect) { r.style.display = "none"; return null; }
    const b = node.getBoundingClientRect();
    if (!b.width && !b.height) { r.style.display = "none"; return null; }
    const pad = 10;
    r.style.display = "block";
    r.style.left = Math.max(0, b.left - pad) + "px";
    r.style.top = Math.max(0, b.top - pad) + "px";
    r.style.width = (b.width + pad * 2) + "px";
    r.style.height = (b.height + pad * 2) + "px";
    return b;
  }

  function render() {
    const s = STEPS[state.i];
    if (!s) { finish(); return; }

    // Ziel-Selector auflösen (hand | board | null).
    const sel = s.target === "hand" ? state.opts.highlightHand
      : s.target === "board" ? state.opts.highlightBoard
        : null;
    let box = null;
    if (sel) box = positionRing(sel);
    else state.ring.style.display = "none";

    // Dim nur ohne Ring — mit Ring erzeugt der box-shadow die Abdunklung.
    state.dim.style.opacity = box ? "0" : "1";

    // Panel oberhalb/unterhalb des Highlights platzieren.
    const vh = window.innerHeight || 600;
    if (box && box.top > vh * 0.5) state.panel.style.top = "14%";
    else if (box) state.panel.style.top = "62%";
    else state.panel.style.top = "38%";

    const n = state.i + 1;
    const dots = STEPS.map((_, k) =>
      `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin:0 3px;
        background:${k <= state.i ? "#8fb4ff" : "rgba(255,255,255,.22)"}"></span>`).join("");

    const btn = s.cta
      ? `<button type="button" data-tuto-next="1" style="margin-top:12px;padding:9px 22px;border-radius:999px;
           border:0;background:linear-gradient(90deg,#6f8cff,#9c6bff);color:#fff;font-size:14px;
           font-weight:900;cursor:pointer;box-shadow:0 4px 18px rgba(120,110,255,.5)">${s.cta}</button>`
      : `<div style="margin-top:10px;font-size:12px;color:#9fd0ff;font-weight:700">
           ↓ Führe die Aktion aus, um fortzufahren</div>`;

    state.panel.innerHTML =
      `<div style="font-size:11px;letter-spacing:.14em;opacity:.6;font-weight:800">SCHRITT ${n}/${STEPS.length}</div>
       <div style="font-size:15px;line-height:1.45;margin-top:8px">${s.text}</div>
       ${btn}
       <div style="margin-top:10px">${dots}</div>`;

    const b = state.panel.querySelector("[data-tuto-next]");
    if (b) b.addEventListener("click", function (ev) { ev.stopPropagation(); next(); });

    // Bei wartenden Steps darf das Spiel bedient werden → Klicks durchlassen.
    state.root.style.pointerEvents = s.cta ? "auto" : "none";
    state.panel.style.pointerEvents = "auto";
    if (state.skip) state.skip.style.pointerEvents = "auto";

    updatePause();
  }

  function updatePause() {
    const shouldPause = state.i <= PAUSE_UNTIL_INDEX;
    if (shouldPause === state.paused) return;
    state.paused = shouldPause;
    try {
      if (shouldPause) { if (state.opts.onPause) state.opts.onPause(); }
      else { if (state.opts.onResume) state.opts.onResume(); }
    } catch (e) {}
  }

  function next() {
    if (!state) return;
    state.i++;
    if (state.i >= STEPS.length) { finish(); return; }
    render();
  }

  /* notify(eventName) — vom Spiel gerufen: 'pathPlaced' | 'towerPlaced'. */
  function notify(name) {
    if (!state) return;
    const s = STEPS[state.i];
    if (s && s.wait && s.wait === name) {
      // kurzes Erfolgs-Feedback, dann weiter
      state.panel.innerHTML =
        `<div style="font-size:17px;font-weight:900;color:#8fe08f">✓ Sehr gut!</div>`;
      setTimeout(next, 650);
    }
  }

  function teardown() {
    if (!state) return;
    // Pause auf jeden Fall aufheben, bevor das Overlay verschwindet.
    if (state.paused) { state.paused = false; try { if (state.opts.onResume) state.opts.onResume(); } catch (e) {} }
    window.removeEventListener("resize", onResize);
    if (state.root && state.root.parentNode) state.root.parentNode.removeChild(state.root);
    state = null;
  }

  function onResize() {
    if (!state) return;
    render();
  }

  function finish() { markDone(); teardown(); }
  function skip_() { markDone(); teardown(); }

  /* start(opts)
   *   opts.highlightHand  Selector der Handkarten-Leiste (default "#hand")
   *   opts.highlightBoard Selector des Spielfelds        (default "#c")
   *   opts.onPause / opts.onResume  optionale Callbacks (Steps 1–3)  */
  function start(opts) {
    if (state) return;
    const o = opts || {};
    const dom = buildDom();
    state = {
      i: 0, paused: false,
      opts: {
        highlightHand: o.highlightHand || "#hand",
        highlightBoard: o.highlightBoard || "#c",
        onPause: typeof o.onPause === "function" ? o.onPause : null,
        onResume: typeof o.onResume === "function" ? o.onResume : null,
      },
      root: dom.root, dim: dom.dim, ring: dom.ring, panel: dom.panel, skip: dom.skip,
    };
    document.body.appendChild(dom.root);
    window.addEventListener("resize", onResize);
    render();
  }

  window.ArenaTutorial = {
    needed, start, notify, skip: skip_,
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    _key: KEY,
  };
})();
