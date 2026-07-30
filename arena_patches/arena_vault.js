/* ==================================================================
 * ARENA VAULT — Kristalltresor + Angebotskette (Punkt 3)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM, KEIN Zahlungsvorgang. Zwei Systeme, die
 * beide dieselbe Frage beantworten: WANN ist ein Angebot relevant?
 *
 *   1. KRISTALLTRESOR (Piggy Bank). Jeder Sieg legt Bonus-Gems in einen
 *      Tresor, den man nur GESAMT öffnen kann. Der Preis ist damit nicht
 *      "möchtest du Gems?", sondern "möchtest du DEINE bereits erspielten
 *      Gems?" — der Spieler hat sie sichtbar selbst verdient. Die
 *      Kapazität staffelt nach jeder Öffnung (150 → 300 → 600 → 1200 →
 *      2400), der Preis steigt mit, der Gem-Preis SINKT dabei.
 *   2. ANGEBOTSKETTE. Drei kontextuelle Zeit-Angebote, die an einem
 *      ERLEBNIS hängen statt an einem Kalender:
 *        · Starter-Bundle    — einmalig, nach dem 3. Sieg
 *        · Arena-Aufstieg    — 24 h nach jedem neuen Arena-Tier
 *        · Comeback-Angebot  — nach 3 Niederlagen in Folge
 *
 * ⚠ KEIN ECHTER KAUF. open() und claimOffer() sind IAP-PLATZHALTER: Sie
 * liefern Preis und Inhalt zurück und buchen die Spielwährung, lösen aber
 * keine Zahlung aus. Die Store-Anbindung ist bewusst NICHT Teil dieses
 * Moduls — sie gehört in die App-Hülle.
 *
 * WÄHRUNGS-ZUSTÄNDIGKEIT wie überall: Material bucht das Modul über
 * ArenaCards, GOLD und GEMS werden nur GEMELDET — beide Wallets liegen
 * im Hub. So gibt es weiterhin genau eine Stelle, die Guthaben ändert.
 *
 * SCHNITTSTELLE — identisch zu ArenaClan / ArenaPass / ArenaDaily:
 *       ArenaVault.reportEvent(type, amount, opts)
 *   type: "win" | "loss" | "arena" | "trophy"
 *   opts: { trophies }  (optional — sonst wird ArenaProfile gelesen)
 *
 * Alle Regeln, Preispunkte und ihre Begründung:
 *   arena_patches/DESIGN_MONETARISIERUNG.md
 *
 * Selbsttest: `node arena_patches/arena_vault.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaVault";
  var STATE_VERSION = 1;

  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;

  /* ---------- Tresor ----------
   * Kapazitätsstaffel und Preisleiter. Der Preis je Gem SINKT mit jeder
   * Stufe (3,3 ct → 2,5 ct) — wer dranbleibt, wird besser behandelt.
   * Das ist die einzige Preisdynamik, die ein Spieler als fair empfindet. */
  var VAULT_CAPS = [150, 300, 600, 1200, 2400];
  /* ==================================================================
   * TRESOR-PREISE — 30.07.2026 neu gesetzt
   * ------------------------------------------------------------------
   * Vorgabe des Auftraggebers: „dieser Beutel soll im Verhaeltnis
   * bisschen guenstiger sein wie ein normaler Kristall Kauf weil man fuer
   * den Beutel auch aktiv spielen muss zum fuellen (animiert um mehr zu
   * spielen und macht den Beutel attraktiver)."
   *
   * Das war vorher GENAU UMGEKEHRT, und zwar deutlich. Nachgerechnet
   * gegen die Ladenstaffel (ui_prototype GEM_PACKS, §27.2):
   *
   *   Kapazitaet   Tresor alt      Laden bei dieser Paketgroesse
   *      150       3,33 ct              1,69 ct
   *      300       3,16 ct              1,10 ct
   *      600       3,00 ct              0,79 ct
   *     1200       2,75 ct              0,75 ct
   *     2400       2,50 ct              0,72 ct
   *
   * Der Tresor war an JEDER Stufe das schlechteste Geschaeft im Spiel —
   * fuer Kristalle, die der Spieler sich vorher erspielt hat. Das ist die
   * Umkehrung des Versprechens, auf dem die ganze Mechanik steht („deine
   * bereits verdienten Gems"), und es bestraft genau das Verhalten, das
   * die Mechanik belohnen soll.
   *
   * DIE REGEL, die jetzt gilt und die pruefungen/tresor.js einfordert:
   * der Preis je Kristall liegt an JEDER Stufe UNTER dem, was der Laden
   * fuer eine Packung derselben Groesse nimmt (log-log-Interpolation der
   * Ladenkurve), und er SINKT mit jeder Stufe — so steht es auch im Kopf
   * dieses Moduls („der Gem-Preis SINKT dabei").
   *
   *   Kapazitaet   Preis     ct/Gem   Laden    Vorteil   Siege zum Fuellen
   *      150      Fr. 1.90    1,27     1,69     −25 %          ~43
   *      300      Fr. 2.90    0,97     1,10     −12 %          ~86
   *      600      Fr. 3.90    0,65     0,79     −18 %         ~172
   *     1200      Fr. 6.90    0,58     0,75     −23 %         ~343
   *     2400      Fr. 13.50   0,56     0,72     −22 %         ~686
   *
   * ⚠ WAEHRUNG: vorher Euro, waehrend der ganze Shop in Franken rechnet.
   * Zwei Waehrungen auf einem Bildschirm sind kein Detail — sie machen
   * jeden Preisvergleich, den der Spieler anstellt, falsch.
   *
   * ⚠ FUELLZEIT — am 30.07.2026 entschieden, vorher offen.
   * ================================================================== */
  var VAULT_PRICES = [1.90, 2.90, 3.90, 6.90, 13.50];
  var VAULT_TIER_MAX = VAULT_CAPS.length - 1;

  /* Gems je Sieg, gestaffelt nach Arena-Stufe (8 … 30).
   * BEWUSST OHNE ZUFALL: Ein schwankender Zuwachs macht den Tresor
   * unlesbar ("wie lange noch?") und lädt zum Nachrechnen ein.
   *
   * ⚠ WAS DIESE ZAHL STEUERT — und was nicht.
   * Sie aendert NICHTS am Gegenwert: Preis und Kapazitaet je Stufe
   * bleiben, der Tresor kostet weiter 1,27 ct (Stufe 0) bis 0,56 ct
   * (Stufe 4) je Kristall. Sie steuert allein, WIE OFT das Angebot
   * ueberhaupt erscheint.
   *
   * Vorher 2 … 5. Gerechnet mit 3-4 Siegen je Sitzung (die Zahl steht
   * in DESIGN_CLAN §6.2 und traegt dort schon das ±25-Fenster der
   * Rangliste) und zwei Sitzungen am Tag:
   *
   *   Stufe  Kap.   Preis    alt 2-5           neu 8-30
   *     0     150   1,90   75 Siege ~11 Tg   19 Siege ~2,7 Tg
   *     1     300   2,90  100 Siege ~14 Tg   21 Siege ~3,1 Tg
   *     2     600   3,90  150 Siege ~21 Tg   29 Siege ~4,1 Tg
   *     3    1200   6,90  300 Siege ~43 Tg   50 Siege ~7,1 Tg
   *     4    2400  13,50  480 Siege ~69 Tg   80 Siege ~11,4 Tg
   *
   * Die oberste Stufe war praktisch unerreichbar: ein Angebot, das
   * zweimal im Jahr erscheint, ist unabhaengig vom Preis wirkungslos.
   *
   * ⚠ WARUM 30 NICHT FLACH GILT, sondern nur als OBERES Ende.
   * Bei flach 30 fuellt sich Stufe 0 in FUENF Siegen — anderthalb
   * Sitzungen. Der Spieler steht danach dauerhaft am Anschlag, und dort
   * gilt „jeder weitere Sieg verpufft": die Mechanik, die das Spielen
   * belohnen soll, bestraft es dann die meiste Zeit. Ausgerechnet in
   * Stufe 0 lernt der Spieler aber erst, was der Tresor ist.
   * Massgeblich ist ohnehin das obere Ende: die Stufen 0-3 durchlaeuft
   * man EINMAL, in Stufe 4 lebt man dauerhaft. Dort steht jetzt genau
   * die gewuenschte 30 — 2400/30 = 80 Siege, also rund alle elf Tage
   * ein 13,50-Angebot. Das ist die Taktung, die zaehlt.
   *
   * Die Staffelung nach Arena war schon da und musste nur gespreizt
   * werden — GAMEPLAY_OPTIMIERUNG §14 hatte genau diesen Weg als
   * Option 1 benannt. */
  var WIN_GEMS_MIN = 8, WIN_GEMS_MAX = 30;
  // Arena-Schwellen wie im restlichen Projekt (AA-Beleg, ui_prototype §14.1)
  var ARENA_AT = [0, 300, 600, 900, 1200, 1500, 2000, 2500];

  /* ---------- Angebotskette ---------- */
  var OFFER_DEFS = {
    starter: {
      key: "starter", name: "Starter-Bundle", sym: "🌟", once: true,
      windowMs: 48 * HOUR, price: 2.99,
      trigger: "Nach dem 3. Sieg — einmalig pro Konto",
      why: "Der erste Kaufimpuls entsteht, wenn das Spiel verstanden ist, " +
           "nicht beim ersten Start.",
      content: { gems: 300, gold: 15000, material: 40, packs: ["silver"] },
    },
    arena_up: {
      key: "arena_up", name: "Aufstiegs-Angebot", sym: "⬆", once: false,
      windowMs: 24 * HOUR, price: 4.99,
      trigger: "24 h nach jedem neuen Arena-Tier",
      why: "Im Moment des Aufstiegs ist die Bindung am höchsten und der " +
           "nächste Bedarf (stärkere Karten) gerade sichtbar geworden.",
      content: { gems: 500, gold: 25000, material: 60, packs: ["gold"] },
    },
    comeback: {
      key: "comeback", name: "Comeback-Angebot", sym: "🛡", once: false,
      windowMs: 12 * HOUR, price: 1.99,
      trigger: "Nach 3 Niederlagen in Folge",
      why: "Kein Verkaufsdruck, sondern Frust-Schutz: ein kleines, " +
           "günstiges Paket genau dann, wenn jemand sonst aufhört.",
      content: { gems: 120, gold: 8000, material: 20, packs: ["bronze"] },
    },
  };
  var OFFER_KEYS = Object.keys(OFFER_DEFS);
  var COMEBACK_LOSSES = 3;     // Niederlagen in Folge bis zum Comeback-Angebot
  var STARTER_WINS = 3;        // Siege bis zum Starter-Bundle

  /* Der Aufstiegs-Inhalt SKALIERT mit der erreichten Arena — sonst ist er
   * in Arena 7 ein Witz und in Arena 2 ein Balancing-Bruch.
   * Faktor 1.0 … 2.2 über die acht Stufen, Preisband in drei Schritten. */
  function arenaScale(tier) {
    var t = Math.max(0, Math.min(ARENA_AT.length - 1, tier | 0));
    return 1 + t * 0.17;
  }
  function arenaPrice(tier) {
    var t = Math.max(0, tier | 0);
    return t <= 2 ? 4.99 : (t <= 5 ? 9.99 : 19.99);
  }

  /* ================= Zeit / Persistenz ================= */

  var CLOCK = null;
  function nowMs(o) {
    if (typeof o === "number" && isFinite(o)) return o;
    return CLOCK ? CLOCK() : Date.now();
  }
  function ts0(v) {
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function hhmm(ms) {
    if (!ms || ms <= 0) return "0:00";
    var m = Math.ceil(ms / MINUTE), h = Math.floor(m / 60);
    return h + ":" + ("0" + (m % 60)).slice(-2);
  }
  function dtText(ms) {
    if (ms <= 0) return "abgelaufen";
    var h = Math.floor(ms / HOUR), d = Math.floor(h / 24);
    if (d >= 1) return d + " Tag" + (d === 1 ? "" : "en") + " " + (h % 24) + " h";
    return hhmm(ms) + " h";
  }

  var memStore = null;
  function hostObj() {
    if (typeof window !== "undefined" && window) return window;
    if (typeof globalThis !== "undefined" && globalThis) return globalThis;
    return null;
  }
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

  function fresh() {
    return {
      v: STATE_VERSION,
      gems: 0, tier: 0, opened: 0, fullNotified: false,
      wins: 0, lossStreak: 0, arenaTier: 0, arenaSeen: false,
      offers: {},          // {key: {ts, expires, tier, used, shown, clicked, hidden}}
      stats: { gemsEarned: 0, gemsTaken: 0, offersShown: 0, offersTaken: 0, spent: 0 },
    };
  }
  function get(now) {
    now = nowMs(now);
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    s.v = STATE_VERSION;
    s.tier = clamp(s.tier | 0, 0, VAULT_TIER_MAX);
    s.gems = clamp(s.gems | 0, 0, VAULT_CAPS[s.tier]);
    s.opened = Math.max(0, s.opened | 0);
    s.wins = Math.max(0, s.wins | 0);
    s.lossStreak = Math.max(0, s.lossStreak | 0);
    s.arenaTier = clamp(s.arenaTier | 0, 0, ARENA_AT.length - 1);
    s.fullNotified = !!s.fullNotified;
    s.arenaSeen = !!s.arenaSeen;
    if (!s.offers || typeof s.offers !== "object") s.offers = {};
    var clean = {};
    OFFER_KEYS.forEach(function (k2) {
      var o = s.offers[k2];
      if (!o || typeof o !== "object") return;
      clean[k2] = {
        ts: ts0(o.ts), expires: ts0(o.expires), tier: clamp(o.tier | 0, 0, ARENA_AT.length - 1),
        used: !!o.used, shown: !!o.shown, clicked: !!o.clicked, hidden: !!o.hidden,
      };
    });
    s.offers = clean;
    if (!s.stats || typeof s.stats !== "object") s.stats = f.stats;
    for (var sk in f.stats) s.stats[sk] = Math.max(0, +s.stats[sk] || 0);
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  function telemetry() {
    try {
      var h = hostObj(), t = h && h.ArenaTelemetry;
      return (t && typeof t.track === "function") ? t : null;
    } catch (e) { return null; }
  }
  function bankMaterial(n) {
    var h = hostObj(), b = h && h.ArenaCards;
    if (b && n > 0) b.addMaterial(n);
  }
  function trophiesNow(override) {
    if (typeof override === "number" && isFinite(override)) return Math.max(0, Math.floor(override));
    try {
      var h = hostObj(), p = h && h.ArenaProfile;
      if (p && typeof p.get === "function") {
        var t = p.get().trophies;
        if (typeof t === "number" && isFinite(t)) return Math.max(0, Math.floor(t));
      }
    } catch (e) {}
    return 0;
  }
  function arenaIndexFor(trophies) {
    var idx = 0;
    for (var i = 0; i < ARENA_AT.length; i++) if (trophies >= ARENA_AT[i]) idx = i;
    return idx;
  }

  /* ================= Kristalltresor ================= */

  /* gemsPerWin(trophies) → 2 … 5, linear über die acht Arenen. */
  function gemsPerWin(trophies) {
    var idx = arenaIndexFor(trophiesNow(trophies));
    var span = ARENA_AT.length - 1;
    return WIN_GEMS_MIN + Math.round(idx * (WIN_GEMS_MAX - WIN_GEMS_MIN) / span);
  }

  /* vault(now) → alles, was das Widget braucht. */
  function vault(now, trophiesOverride) {
    now = nowMs(now);
    var s = get(now);
    var cap = VAULT_CAPS[s.tier];
    return {
      gems: s.gems, cap: cap, tier: s.tier, tierMax: VAULT_TIER_MAX,
      pct: cap ? s.gems / cap : 0,
      pctText: Math.round((cap ? s.gems / cap : 0) * 100) + " %",
      full: s.gems >= cap,
      price: VAULT_PRICES[s.tier], priceText: VAULT_PRICES[s.tier].toFixed(2).replace(".", ",") + " Fr.",
      perGemCt: Math.round(VAULT_PRICES[s.tier] / cap * 10000) / 100,
      perWin: gemsPerWin(trophiesOverride),
      opened: s.opened,
      nextCap: s.tier < VAULT_TIER_MAX ? VAULT_CAPS[s.tier + 1] : null,
      missing: Math.max(0, cap - s.gems),
      // "noch N Siege" ist die einzige Zahl, die der Spieler wirklich liest.
      winsLeft: Math.ceil(Math.max(0, cap - s.gems) / Math.max(1, gemsPerWin(trophiesOverride))),
      stats: s.stats,
    };
  }

  /* open() → IAP-PLATZHALTER. Liefert Gems und Preis, setzt den Tresor
   * zurück und hebt die Kapazitätsstufe. Bucht KEINE Zahlung. */
  function open(now) {
    now = nowMs(now);
    var s = get(now);
    if (s.gems <= 0) throw new Error("Der Kristalltresor ist leer — gewinne erst ein paar Matches.");
    var gems = s.gems, price = VAULT_PRICES[s.tier], tier = s.tier;
    s.gems = 0;
    s.tier = Math.min(VAULT_TIER_MAX, s.tier + 1);
    s.opened++;
    s.fullNotified = false;
    s.stats.gemsTaken += gems;
    s.stats.spent = Math.round((s.stats.spent + price) * 100) / 100;
    save(s);
    return {
      ok: true, gems: gems, price: price,
      priceText: price.toFixed(2).replace(".", ",") + " Fr.",
      tier: tier, nextTier: s.tier, nextCap: VAULT_CAPS[s.tier],
      placeholder: true,      // ⚠ kein echter Kauf
    };
  }

  /* ================= Angebotskette ================= */

  function offerView(s, key, now) {
    var o = s.offers[key], d = OFFER_DEFS[key];
    if (!o || !d) return null;
    var left = o.expires - now;
    var content = key === "arena_up" ? scaledContent(d.content, o.tier) : d.content;
    var price = key === "arena_up" ? arenaPrice(o.tier) : d.price;
    return {
      key: key, name: d.name, sym: d.sym, why: d.why, trigger: d.trigger,
      ts: o.ts, expires: o.expires, msLeft: Math.max(0, left),
      leftText: dtText(left), expired: left <= 0,
      used: !!o.used, shown: !!o.shown, clicked: !!o.clicked, hidden: !!o.hidden,
      active: left > 0 && !o.used && !o.hidden,
      tier: o.tier, content: content,
      price: price, priceText: price.toFixed(2).replace(".", ",") + " Fr.",
      value: contentValue(content),
    };
  }
  function scaledContent(base, tier) {
    var f = arenaScale(tier);
    return {
      gems: Math.round(base.gems * f / 10) * 10,
      gold: Math.round(base.gold * f / 500) * 500,
      material: Math.round(base.material * f / 5) * 5,
      packs: base.packs.slice(),
    };
  }
  // Grober Gegenwert in Gems — nur für die "Wert"-Zeile im UI.
  function contentValue(c) {
    return Math.round(c.gems + c.gold / 100 + c.material * 3 + c.packs.length * 150);
  }

  /* trigger(key, now, tier) — Angebot starten. Intern von reportEvent
   * gerufen, für Tests und Demo auch von außen. */
  function trigger(key, now, tier) {
    now = nowMs(now);
    var d = OFFER_DEFS[key];
    if (!d) throw new Error("Unbekanntes Angebot: " + key);
    var s = get(now);
    var prev = s.offers[key];
    // Einmalige Angebote: nie ein zweites Mal, auch nicht nach Ablauf.
    if (d.once && prev) return null;
    // Laufendes Angebot nicht überschreiben — sonst verlängert ein
    // Ereignis den Timer beliebig oft ("Countdown, der nie abläuft").
    if (prev && prev.expires > now && !prev.used && !prev.hidden) return null;
    s.offers[key] = {
      ts: now, expires: now + d.windowMs,
      tier: clamp(tier === undefined ? s.arenaTier : tier, 0, ARENA_AT.length - 1),
      used: false, shown: false, clicked: false, hidden: false,
    };
    save(s);
    return offerView(get(now), key, now);
  }

  function offers(now) {
    now = nowMs(now);
    var s = get(now);
    return OFFER_KEYS.map(function (k) { return offerView(s, k, now); })
                     .filter(function (o) { return !!o; });
  }
  function active(now) {
    return offers(now).filter(function (o) { return o.active; });
  }
  /* best(now) → das EINE Angebot, das ein Popup rechtfertigt.
   * Regel: das am kürzesten laufende zuerst — es geht am ehesten verloren. */
  function best(now) {
    var a = active(now).filter(function (o) { return !o.shown; });
    if (!a.length) return null;
    a.sort(function (x, y) { return x.msLeft - y.msLeft; });
    return a[0];
  }

  /* markShown(key) — das UI meldet, dass das Angebot sichtbar WAR.
   * Erst das schaltet es aus dem Popup-Kandidatenkreis. */
  function markShown(key, now) {
    now = nowMs(now);
    var s = get(now), o = s.offers[key];
    if (!o || o.shown) return null;
    o.shown = true;
    s.stats.offersShown++;
    save(s);
    var t = telemetry();
    if (t) t.track("offer_shown", { offer: key, tier: o.tier });
    return offerView(get(now), key, now);
  }
  function dismiss(key, now) {
    now = nowMs(now);
    var s = get(now), o = s.offers[key];
    if (!o) throw new Error("Dieses Angebot gibt es nicht.");
    o.hidden = true;
    save(s);
    return { dismissed: true, key: key };
  }

  /* claimOffer(key) → IAP-PLATZHALTER. Bucht Material, meldet Gold/Gems
   * und den Preis zurück; löst KEINE Zahlung aus. */
  function claimOffer(key, now) {
    now = nowMs(now);
    var s = get(now), o = s.offers[key], d = OFFER_DEFS[key];
    if (!o || !d) throw new Error("Dieses Angebot gibt es nicht.");
    if (o.used) throw new Error("Dieses Angebot hast du bereits genutzt.");
    if (o.expires <= now) throw new Error("Dieses Angebot ist abgelaufen.");
    var view = offerView(s, key, now);
    o.used = true;
    o.clicked = true;
    s.stats.offersTaken++;
    s.stats.spent = Math.round((s.stats.spent + view.price) * 100) / 100;
    save(s);
    bankMaterial(view.content.material);
    var t = telemetry();
    if (t) t.track("offer_clicked", { offer: key, tier: o.tier, price: view.price });
    return {
      ok: true, key: key, name: d.name, price: view.price, priceText: view.priceText,
      content: view.content, placeholder: true,
    };
  }

  /* ================= Ereignis-Naht ================= */

  /* reportEvent(type, amount, opts)
   *   "win"    → Tresor füllen, Siegzähler, Niederlagenserie zurücksetzen,
   *              ggf. Starter-Bundle auslösen
   *   "loss"   → Niederlagenserie, ggf. Comeback-Angebot
   *   "arena"  → amount = neuer Arena-Index (oder opts.trophies), löst das
   *              Aufstiegs-Angebot aus
   *   "trophy" → nur Arena-Erkennung, kein eigener Effekt
   */
  function reportEvent(type, amount, opts, now) {
    now = nowMs(now);
    opts = opts || {};
    var ev = String(type || "").toLowerCase();
    var n = Math.floor(Number(amount == null ? 1 : amount) || 0);
    var s = get(now);
    var out = { counted: false, type: ev };

    if (ev === "win" || ev === "wins" || ev === "sieg") {
      if (n <= 0) return { counted: false, reason: "amount" };
      var per = gemsPerWin(opts.trophies);
      var cap = VAULT_CAPS[s.tier];
      var before = s.gems;
      s.gems = Math.min(cap, s.gems + per * n);
      s.stats.gemsEarned += s.gems - before;
      s.wins += n;
      s.lossStreak = 0;
      var justFull = s.gems >= cap && !s.fullNotified;
      if (justFull) s.fullNotified = true;
      save(s);
      if (justFull) {
        var t1 = telemetry();
        if (t1) t1.track("vault_full", { tier: s.tier, gems: s.gems });
      }
      out.counted = true;
      out.gems = s.gems; out.gained = s.gems - before; out.full = s.gems >= cap;
      out.vaultFull = justFull;
      // Starter-Bundle nach dem 3. Sieg
      if (s.wins >= STARTER_WINS) {
        var st = trigger("starter", now);
        if (st) out.offer = st;
      }
      return out;
    }
    if (ev === "loss" || ev === "lose" || ev === "niederlage") {
      if (n <= 0) return { counted: false, reason: "amount" };
      s.lossStreak += n;
      save(s);
      out.counted = true;
      out.lossStreak = s.lossStreak;
      if (s.lossStreak >= COMEBACK_LOSSES) {
        var cb = trigger("comeback", now);
        if (cb) { out.offer = cb; s = get(now); s.lossStreak = 0; save(s); out.lossStreak = 0; }
      }
      return out;
    }
    if (ev === "arena" || ev === "arena_up") {
      var tier = (amount == null || !isFinite(amount))
        ? arenaIndexFor(trophiesNow(opts.trophies))
        : clamp(n, 0, ARENA_AT.length - 1);
      var known = s.arenaTier, seen = s.arenaSeen;
      s.arenaTier = tier;
      s.arenaSeen = true;
      save(s);
      out.counted = true;
      out.tier = tier;
      // Nur bei einem ECHTEN Aufstieg, und nicht beim allerersten Setzen.
      if (seen && tier > known) {
        var t2 = telemetry();
        if (t2) t2.track("arena_up", { tier: tier });
        var off = trigger("arena_up", now, tier);
        if (off) out.offer = off;
        out.arenaUp = true;
      }
      return out;
    }
    if (ev === "trophy" || ev === "trophies") {
      return reportEvent("arena", null, opts, now);
    }
    return { counted: false, reason: "unknown", type: ev };
  }

  /* ================= Gesamtzustand ================= */

  function state(now, trophiesOverride) {
    now = nowMs(now);
    var s = get(now);
    var v = vault(now, trophiesOverride);
    var act = active(now);
    return {
      vault: v, offers: offers(now), active: act, best: best(now),
      wins: s.wins, lossStreak: s.lossStreak, arenaTier: s.arenaTier,
      badge: (v.full ? 1 : 0) + act.length,
      stats: s.stats,
    };
  }
  function reset() { save(fresh()); return get(); }

  var API = {
    VAULT_CAPS: VAULT_CAPS, VAULT_PRICES: VAULT_PRICES, VAULT_TIER_MAX: VAULT_TIER_MAX,
    OFFER_DEFS: OFFER_DEFS, OFFER_KEYS: OFFER_KEYS,
    COMEBACK_LOSSES: COMEBACK_LOSSES, STARTER_WINS: STARTER_WINS,
    ARENA_AT: ARENA_AT, STATE_VERSION: STATE_VERSION,
    get: get, state: state, vault: vault, open: open, gemsPerWin: gemsPerWin,
    offers: offers, active: active, best: best, trigger: trigger,
    markShown: markShown, dismiss: dismiss, claimOffer: claimOffer,
    reportEvent: reportEvent, arenaIndexFor: arenaIndexFor,
    arenaScale: arenaScale, arenaPrice: arenaPrice, hhmm: hhmm, dtText: dtText,
    reset: reset,
    _key: KEY, _write: function (s) { save(s); },
    _clock: function (fn) { CLOCK = fn || null; },
  };

  if (typeof window !== "undefined") window.ArenaVault = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_vault.js) ============ */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, i) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (i !== undefined ? "  " + i : ""));
      if (!cond) fail++;
    };
    var pad = function (x, n) { x = String(x); while (x.length < n) x += " "; return x; };
    var padL = function (x, n) { x = String(x); while (x.length < n) x = " " + x; return x; };
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
    var throws = function (fn, part) {
      try { fn(); return { ok: false, msg: "(kein Fehler)" }; }
      catch (e) { return { ok: part ? e.message.indexOf(part) >= 0 : true, msg: e.message }; }
    };

    var AC = null;
    try {
      globalThis.window = {};
      AC = require(require("path").join(__dirname, "arena_cards.js"));
      delete globalThis.window;
      globalThis.ArenaCards = AC;
    } catch (e) {
      try { delete globalThis.window; } catch (e2) {}
    }
    var TRACKED = [];
    globalThis.ArenaTelemetry = { track: function (e, p) { TRACKED.push({ e: e, p: p }); } };
    var TROPH = 1136;
    globalThis.ArenaProfile = { get: function () { return { trophies: TROPH, best: TROPH }; } };

    var T0 = Date.UTC(2026, 6, 27, 10, 0, 0);
    var T = T0;
    API._clock(function () { return T; });
    var setT = function (t) { T = t; };

    console.log("\n=== ARENA VAULT — Selbsttest (Tresor + Angebotskette) ===\n");

    /* ================= 1. Tresor-Staffel ================= */
    console.log("Kapazitäts- und Preisstaffel:");
    VAULT_CAPS.forEach(function (c, i) {
      console.log("  Stufe " + i + ": " + padL(fmt(c), 6) + " Gems   " +
        padL(VAULT_PRICES[i].toFixed(2).replace(".", ","), 6) + " Fr.  " +
        (VAULT_PRICES[i] / c * 100).toFixed(2) + " ct/Gem");
    });
    check("5 Kapazitätsstufen mit passender Preisleiter",
      VAULT_CAPS.length === 5 && VAULT_PRICES.length === 5);
    check("Kapazität verdoppelt sich je Stufe (150 → 2400)",
      VAULT_CAPS.join(",") === "150,300,600,1200,2400");
    check("Preis je Gem SINKT mit jeder Stufe (Treuevorteil)", (function () {
      for (var i = 1; i < VAULT_CAPS.length; i++) {
        if (VAULT_PRICES[i] / VAULT_CAPS[i] >= VAULT_PRICES[i - 1] / VAULT_CAPS[i - 1]) return false;
      }
      return true;
    })(), (VAULT_PRICES[0] / VAULT_CAPS[0] * 100).toFixed(2) + " ct → " +
      (VAULT_PRICES[4] / VAULT_CAPS[4] * 100).toFixed(2) + " ct");
    console.log("\nGems je Sieg nach Arena:");
    var row = ARENA_AT.map(function (at, i) { return "A" + (i + 1) + ":" + gemsPerWin(at); });
    console.log("  " + row.join("  "));
    /* Die Zahlen NICHT in den Namen schreiben: der Schritt liest sie aus
       WIN_GEMS_MIN/MAX und wandert damit mit. Ein Name, der „2 bis 5"
       behauptet, waehrend die Pruefung 8 bis 30 misst, ist eine
       gruen angezeigte Falschaussage — genau so stand es hier. */
    check("Gems je Sieg laufen von WIN_GEMS_MIN (Arena 1) bis WIN_GEMS_MAX (Arena 8)",
      gemsPerWin(0) === WIN_GEMS_MIN && gemsPerWin(2500) === WIN_GEMS_MAX);
    check("Zuwachs ist monoton, nie zufällig", (function () {
      var last = 0;
      for (var i = 0; i < ARENA_AT.length; i++) {
        var g = gemsPerWin(ARENA_AT[i]);
        if (g < last) return false;
        last = g;
      }
      return gemsPerWin(1136) === gemsPerWin(1136);
    })());

    /* ================= 2. Tresor füllen ================= */
    reset(); setT(T0);
    TROPH = 0;
    var v0 = vault();
    check("frisch: leer, Stufe 0, Kapazität 150",
      v0.gems === 0 && v0.tier === 0 && v0.cap === 150 && v0.full === false);
    check("Preisangabe im deutschen Format und in Franken", v0.priceText === "1,90 Fr.", v0.priceText);
    /* ⚠ Diese vier Schritte standen bis 30.07.2026 mit der Zahl 2 fest
       verdrahtet da („gained === 2", „Math.ceil(148 / 2)", „→ 82 Gems",
       „+ 5"). Beim Anheben des Zuwachses waren sie alle vier rot, ohne
       dass am Tresor etwas kaputt war — sie hatten den Zustand
       eingefroren statt die Zusage geprueft. Jetzt rechnen sie gegen
       WIN_GEMS_MIN/MAX, also gegen die Quelle. */
    var w1 = reportEvent("win", 1);
    check("ein Sieg legt Gems in den Tresor",
      w1.counted === true && w1.gained === WIN_GEMS_MIN &&
      vault().gems === WIN_GEMS_MIN, vault().gems);
    check("„noch N Siege“ wird ausgerechnet",
      vault().winsLeft === Math.ceil((VAULT_CAPS[0] - WIN_GEMS_MIN) / WIN_GEMS_MIN),
      vault().winsLeft + " Siege");
    reportEvent("win", 10);
    check("10 weitere Siege → 11× der Zuwachs",
      vault().gems === 11 * WIN_GEMS_MIN, vault().gems);
    check("höhere Arena bringt mehr je Sieg", (function () {
      TROPH = 2500;
      var before = vault().gems;
      reportEvent("win", 1);
      return vault().gems === before + WIN_GEMS_MAX;
    })(), "Arena 8: +" + gemsPerWin(2500));
    TROPH = 0;
    check("Tresor läuft NICHT über die Kapazität", (function () {
      reportEvent("win", 500);
      return vault().gems === 150 && vault().full === true;
    })(), vault().gems + "/" + vault().cap);
    check("vault_full genau EINMAL gemeldet", (function () {
      var n = TRACKED.filter(function (t) { return t.e === "vault_full"; }).length;
      reportEvent("win", 5);
      return n === 1 && TRACKED.filter(function (t) { return t.e === "vault_full"; }).length === 1;
    })());

    /* ================= 3. Tresor öffnen (IAP-Platzhalter) ================= */
    var op = open();
    console.log("\nTresor geöffnet: " + op.gems + " Gems für " + op.priceText +
      " → nächste Kapazität " + op.nextCap);
    /* ⚠ NICHT gegen eine eingetippte Zahl pruefen (30.07.2026). Hier stand
       `op.price === 4.99`; beim Neusetzen der Staffel wurde der Schritt rot,
       obwohl open() voellig richtig arbeitete — er verteidigte einen Preis,
       keine Zusage. Die Zusage lautet: open() liefert die Kapazitaet der
       aktuellen Stufe und DEREN Preis. */
    check("open() liefert Gems und Preis der aktuellen Stufe",
      op.gems === VAULT_CAPS[0] && op.price === VAULT_PRICES[0],
      op.gems + " Gems / " + op.price);
    check("open() ist als PLATZHALTER markiert", op.placeholder === true);
    check("Tresor startet neu und steigt eine Stufe",
      vault().gems === 0 && vault().tier === 1 && vault().cap === 300);
    check("neuer Preis passt zur neuen Stufe", vault().priceText === "2,90 Fr.", vault().priceText);
    check("leerer Tresor lässt sich nicht öffnen",
      throws(function () { open(); }, "ist leer").ok);
    check("Statistik mitgeführt",
      get().stats.gemsTaken === VAULT_CAPS[0] && get().stats.spent === VAULT_PRICES[0],
      JSON.stringify(get().stats));
    check("vault_full feuert nach dem Öffnen wieder", (function () {
      TRACKED.length = 0;
      reportEvent("win", 200);
      return TRACKED.filter(function (t) { return t.e === "vault_full"; }).length === 1;
    })());
    check("Kapazitätsstufe ist gedeckelt", (function () {
      for (var i = 0; i < 10; i++) { reportEvent("win", 999); open(); }
      return vault().tier === VAULT_TIER_MAX && vault().cap === 2400;
    })(), "Stufe " + vault().tier);

    /* ================= 4. Angebotskette ================= */
    console.log("\n" + "=".repeat(64));
    console.log("ANGEBOTSKETTE");
    console.log("=".repeat(64));
    OFFER_KEYS.forEach(function (k) {
      var d = OFFER_DEFS[k];
      console.log("  " + d.sym + " " + pad(d.name, 20) + pad(d.trigger, 42) +
        pad((d.windowMs / HOUR) + " h", 6) + d.price.toFixed(2).replace(".", ",") + " Fr.");
    });
    check("drei Angebote definiert", OFFER_KEYS.length === 3);
    check("nur das Starter-Bundle ist einmalig",
      OFFER_DEFS.starter.once === true && OFFER_DEFS.arena_up.once === false &&
      OFFER_DEFS.comeback.once === false);

    /* --- Starter-Bundle nach dem 3. Sieg --- */
    reset(); setT(T0);
    TRACKED.length = 0;
    reportEvent("win", 1);
    reportEvent("win", 1);
    check("nach 2 Siegen noch kein Starter-Bundle", active().length === 0);
    var w3 = reportEvent("win", 1);
    console.log("\nStarter-Bundle nach dem 3. Sieg: " + (w3.offer ? "ausgelöst" : "FEHLT"));
    check("der 3. Sieg löst das Starter-Bundle aus",
      !!w3.offer && w3.offer.key === "starter", w3.offer && w3.offer.name);
    var st1 = active()[0];
    check("Angebot ist 48 h gültig",
      Math.abs(st1.msLeft - 48 * HOUR) < 1000 && /2 Tagen/.test(st1.leftText), st1.leftText);
    check("Inhalt und Preis liegen an",
      st1.content.gems === 300 && st1.content.gold === 15000 && st1.price === 2.99,
      st1.priceText);
    check("Gegenwert wird berechnet", st1.value > st1.content.gems, st1.value + " Gems-Wert");
    check("weitere Siege lösen es nicht erneut aus", (function () {
      reportEvent("win", 5);
      return active().filter(function (o) { return o.key === "starter"; }).length === 1;
    })());
    check("markShown() meldet offer_shown an die Telemetrie", (function () {
      markShown("starter");
      return TRACKED.some(function (t) { return t.e === "offer_shown" && t.p.offer === "starter"; });
    })());
    check("gezeigtes Angebot ist kein Popup-Kandidat mehr", best() === null);
    var cl = claimOffer("starter");
    console.log("  gekauft (Platzhalter): " + cl.name + " für " + cl.priceText + " — " +
      cl.content.gems + " Gems, " + fmt(cl.content.gold) + " Gold, " +
      cl.content.material + " Material, " + cl.content.packs.join("+") + "-Pack");
    check("claimOffer() liefert Inhalt und Preis, ist Platzhalter",
      cl.ok === true && cl.placeholder === true && cl.price === 2.99);
    check("offer_clicked gemeldet",
      TRACKED.some(function (t) { return t.e === "offer_clicked" && t.p.offer === "starter"; }));
    check("Material wurde gebucht", !AC || AC.getMaterials().total >= 40,
      AC ? AC.getMaterials().total : "n/a");
    check("Angebot ist danach verbraucht",
      active().length === 0 && throws(function () { claimOffer("starter"); }, "bereits genutzt").ok);
    check("einmaliges Angebot kommt NIE wieder", (function () {
      reportEvent("win", 20);
      return offers().filter(function (o) { return o.key === "starter"; }).length === 1 &&
             active().length === 0;
    })());

    /* --- Arena-Aufstieg --- */
    reset(); setT(T0);
    reportEvent("arena", 3);                       // erstes Setzen — kein Angebot
    check("das erste Setzen der Arena löst NICHTS aus",
      active().length === 0 && get().arenaTier === 3);
    TRACKED.length = 0;
    var au = reportEvent("arena", 4);
    console.log("\nAufstieg Arena 4 → 5: " + (au.offer ? "Angebot ausgelöst" : "FEHLT"));
    check("echter Aufstieg löst das Angebot aus",
      au.arenaUp === true && !!au.offer && au.offer.key === "arena_up");
    check("arena_up an die Telemetrie gemeldet",
      TRACKED.some(function (t) { return t.e === "arena_up" && t.p.tier === 4; }));
    var ao = active().filter(function (o) { return o.key === "arena_up"; })[0];
    check("24-h-Fenster", Math.abs(ao.msLeft - 24 * HOUR) < 1000, ao.leftText);
    check("Inhalt SKALIERT mit der Arena", (function () {
      var low = scaledContent(OFFER_DEFS.arena_up.content, 0);
      var high = scaledContent(OFFER_DEFS.arena_up.content, 7);
      return high.gems > low.gems * 1.5 && high.gold > low.gold * 1.5;
    })(), "Arena 1: " + scaledContent(OFFER_DEFS.arena_up.content, 0).gems + " Gems · Arena 8: " +
      scaledContent(OFFER_DEFS.arena_up.content, 7).gems + " Gems");
    check("Preis staffelt in drei Bändern",
      arenaPrice(0) === 4.99 && arenaPrice(3) === 9.99 && arenaPrice(7) === 19.99,
      [0, 3, 7].map(function (t) { return arenaPrice(t); }).join(" / "));
    check("Abstieg löst KEIN Angebot aus", (function () {
      var before = active().length;
      var r = reportEvent("arena", 2);
      return !r.arenaUp && active().length === before;
    })());
    check("laufendes Angebot wird nicht verlängert", (function () {
      var t1 = active().filter(function (o) { return o.key === "arena_up"; })[0].expires;
      setT(T0 + 6 * HOUR);
      reportEvent("arena", 5);
      var t2 = active().filter(function (o) { return o.key === "arena_up"; })[0].expires;
      return t1 === t2;
    })());
    check("nach Ablauf ist es weg", (function () {
      setT(T0 + 25 * HOUR);
      return active().length === 0 &&
             offers().filter(function (o) { return o.key === "arena_up"; })[0].expired === true;
    })());
    check("abgelaufenes Angebot lässt sich nicht mehr kaufen",
      throws(function () { claimOffer("arena_up"); }, "abgelaufen").ok);
    check("ein NEUER Aufstieg startet ein neues Fenster", (function () {
      var r = reportEvent("arena", 6);
      return !!r.offer && active().length === 1;
    })());

    /* --- Comeback nach 3 Niederlagen --- */
    reset(); setT(T0);
    reportEvent("loss", 1);
    reportEvent("loss", 1);
    check("nach 2 Niederlagen noch kein Comeback-Angebot",
      active().length === 0 && get().lossStreak === 2);
    var cb = reportEvent("loss", 1);
    console.log("\nComeback nach 3 Niederlagen: " + (cb.offer ? "ausgelöst" : "FEHLT") +
      " · " + OFFER_DEFS.comeback.price.toFixed(2).replace(".", ",") + " Fr.");
    check("die 3. Niederlage löst das Comeback-Angebot aus",
      !!cb.offer && cb.offer.key === "comeback" && cb.offer.price === 1.99);
    check("12-h-Fenster", Math.abs(cb.offer.msLeft - 12 * HOUR) < 1000, cb.offer.leftText);
    check("Niederlagenserie wird danach zurückgesetzt",
      get().lossStreak === 0, get().lossStreak);
    check("Comeback ist das GÜNSTIGSTE Angebot der Kette",
      OFFER_DEFS.comeback.price < OFFER_DEFS.starter.price &&
      OFFER_DEFS.comeback.price < OFFER_DEFS.arena_up.price);
    check("ein Sieg setzt die Niederlagenserie zurück", (function () {
      reportEvent("loss", 2);
      reportEvent("win", 1);
      return get().lossStreak === 0;
    })());
    check("dismiss() blendet ein Angebot aus", (function () {
      dismiss("comeback");
      return active().filter(function (o) { return o.key === "comeback"; }).length === 0 &&
             offers().filter(function (o) { return o.key === "comeback"; })[0].hidden === true;
    })());
    check("unbekanntes Angebot → klare Meldung",
      throws(function () { claimOffer("gibtsnicht"); }, "gibt es nicht").ok &&
      throws(function () { dismiss("gibtsnicht"); }, "gibt es nicht").ok &&
      throws(function () { trigger("gibtsnicht"); }, "Unbekanntes Angebot").ok);

    /* --- best(): welches Popup? --- */
    reset(); setT(T0);
    trigger("comeback", T0);                     // 12 h
    trigger("arena_up", T0, 4);                  // 24 h
    var b = best();
    check("best() wählt das am kürzesten laufende Angebot",
      b && b.key === "comeback", b && b.key + " (" + b.leftText + ")");
    check("nach markShown fällt es aus der Auswahl", (function () {
      markShown("comeback");
      var b2 = best();
      return b2 && b2.key === "arena_up";
    })());
    check("wenn alles gezeigt wurde, gibt es kein Popup", (function () {
      markShown("arena_up");
      return best() === null;
    })());

    /* ================= 5. Gesamtzustand ================= */
    reset(); setT(T0);
    TROPH = 1136;
    reportEvent("win", 10);
    trigger("comeback", T0);
    var stt = state();
    console.log("\nstate(): Tresor " + stt.vault.gems + "/" + stt.vault.cap + " (" +
      stt.vault.pctText + "), " + stt.active.length + " aktive Angebote, Badge " + stt.badge);
    // 10 Siege lösen zusätzlich das Starter-Bundle aus → zwei Angebote.
    /* ⚠ Die Badge-Zahl stand hier als 2 fest. Sie war nur deshalb 2,
       weil 10 Siege beim alten Zuwachs (2-5) den Tresor nicht fuellten;
       das war eine ungesagte Annahme, keine Zusage. Beim neuen Zuwachs
       fuellen 10 Siege Stufe 0, der volle Tresor zaehlt mit, und der
       Schritt war rot, ohne dass etwas kaputt war. Jetzt steht die
       Zusage selbst da: die Badge ist die Zahl der Angebote plus eins,
       wenn der Tresor voll ist. */
    check("state() liefert Tresor, Angebote und Badge",
      !!stt.vault && Array.isArray(stt.offers) && stt.active.length === 2 &&
      stt.badge === stt.active.length + (stt.vault.full ? 1 : 0),
      stt.active.map(function (o) { return o.key; }).join("+") +
      ", Badge " + stt.badge + ", Tresor " + (stt.vault.full ? "voll" : "nicht voll"));
    check("Badge zählt vollen Tresor zusätzlich mit", (function () {
      reportEvent("win", 200);
      return state().badge === 3 && state().vault.full === true;
    })(), state().badge);

    /* ================= 6. Robustheit ================= */
    console.log("\nRobustheit:");
    check("Müll im Speicher → frischer Tresor, kein Crash", (function () {
      lsSet("{kaputt,,,");
      var s = get();
      return s.v === 1 && s.gems === 0 && s.tier === 0;
    })());
    check("kaputter State wird geheilt", (function () {
      lsSet(JSON.stringify({
        v: 1, gems: 99999, tier: 42, opened: -3, wins: -5, lossStreak: -1,
        arenaTier: 99, offers: { quatsch: { ts: 1 }, starter: "kaputt" }, stats: 7,
      }));
      var s = get();
      return s.tier === VAULT_TIER_MAX && s.gems === VAULT_CAPS[VAULT_TIER_MAX] &&
             s.opened === 0 && s.wins === 0 && s.lossStreak === 0 &&
             s.arenaTier === ARENA_AT.length - 1 &&
             Object.keys(s.offers).length === 0 && typeof s.stats === "object";
    })(), JSON.stringify(get().offers));
    check("fehlendes ArenaProfile → Arena 1, kein Crash", (function () {
      var keep = globalThis.ArenaProfile;
      delete globalThis.ArenaProfile;
      var ok = gemsPerWin() === WIN_GEMS_MIN && vault().perWin === WIN_GEMS_MIN;
      globalThis.ArenaProfile = keep;
      return ok;
    })());
    check("fehlende Telemetrie → kein Crash", (function () {
      reset(); setT(T0);
      var keep = globalThis.ArenaTelemetry;
      delete globalThis.ArenaTelemetry;
      reportEvent("win", 500);
      trigger("comeback", T0);
      var ok = markShown("comeback") !== null;
      globalThis.ArenaTelemetry = keep;
      return ok;
    })());
    check("fehlendes ArenaCards → Angebot trotzdem einlösbar", (function () {
      reset(); setT(T0);
      var keep = globalThis.ArenaCards;
      delete globalThis.ArenaCards;
      trigger("comeback", T0);
      var ok = claimOffer("comeback").ok === true;
      globalThis.ArenaCards = keep;
      return ok;
    })());
    check("unbekannter Ereignistyp wird ignoriert",
      reportEvent("bananen", 3).counted === false &&
      reportEvent("win", 0).counted === false);
    check("reset() nullt alles", (function () {
      var s = reset();
      return s.gems === 0 && s.tier === 0 && s.wins === 0 &&
             Object.keys(s.offers).length === 0;
    })());
    var NEED = ["get", "state", "vault", "open", "gemsPerWin", "offers", "active", "best",
      "trigger", "markShown", "dismiss", "claimOffer", "reportEvent", "reset"];
    check("API vollständig (" + NEED.length + " Funktionen)",
      NEED.every(function (k) { return typeof API[k] === "function"; }),
      NEED.filter(function (k) { return typeof API[k] !== "function"; }).join(",") || "alle da");

    API._clock(null);
    console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
    if (fail) process.exitCode = 1;
  }
})();
