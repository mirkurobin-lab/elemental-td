/* ==================================================================
 * ARENA TELEMETRY — leichte Analytics-Schicht (Punkt 6)
 * ------------------------------------------------------------------
 * Reines Logik-Modul, KEIN DOM, KEIN Netzwerk. Schreibt Ereignisse in
 * einen RINGPUFFER im localStorage ("arenaTelemetry", Kappe 500) und
 * spiegelt sie auf console.debug. Der spätere echte Endpunkt wird über
 * onFlush() eingehängt — dieses Modul kennt keine URL und keinen Key.
 *
 * WARUM ÜBERHAUPT: Ohne Trichter-Zahlen ist jede Balancing-Entscheidung
 * geraten. Die elf definierten Ereignisse (EVENTS) beantworten genau die
 * Fragen, an denen ein Mobile-Titel scheitert:
 *   tutorial_step  → wo bricht das Onboarding ab?
 *   first_win      → wie viele erreichen überhaupt den ersten Sieg?
 *   pack_opened    → wird der Kern-Belohnungsmoment erreicht?
 *   first_merge    → hat der Spieler das Merge-System VERSTANDEN?
 *   arena_up       → läuft die Trophäenkurve?
 *   offer_shown / offer_clicked → greift die Angebotskette?
 *   vault_full     → wie oft läuft der Tresor über, ohne geöffnet zu werden?
 *   daily_complete → trägt der tägliche Loop?
 *   clan_joined / donation_sent → ist das Sozialsystem lebendig?
 *
 * KEIN PII — und das ist im Code durchgesetzt, nicht nur versprochen:
 *   · Werte dürfen nur number / boolean / string sein.
 *   · Strings werden auf MAX_STR Zeichen gekappt.
 *   · Schlüsselnamen aus BLOCKED (name, email, phone, address, ip, user …)
 *     werden VERWORFEN, nicht maskiert — was nie ankommt, kann nicht leaken.
 *   · Es gibt keine Geräte-, Konto- oder Standortfelder. Die Session-ID ist
 *     eine Zufallszahl pro Modul-Ladung und wird nirgends verknüpft.
 * Schema-Dokumentation: arena_patches/DESIGN_MONETARISIERUNG.md §Analytics
 *
 * WIRING:
 *   1. <script src="arena_telemetry.js"></script> als ERSTES der Module
 *      (die anderen rufen es defensiv über window.ArenaTelemetry auf).
 *   2. Im Spiel an den Trichter-Stellen:
 *        ArenaTelemetry.track("first_win", { arena: 1, sec: 214 });
 *   3. Beim echten Backend nur EINE Zeile ergänzen:
 *        ArenaTelemetry.onFlush(function (batch) {
 *          return fetch("/t", { method: "POST", body: JSON.stringify(batch) })
 *            .then(function (r) { return r.ok; });
 *        });
 *      flush() leert den Puffer nur, wenn der Callback true liefert —
 *      ein fehlgeschlagener Upload verliert also keine Ereignisse.
 *
 * Selbsttest: `node arena_patches/arena_telemetry.js` → "ALLE TESTS OK".
 * ================================================================== */
(function () {
  "use strict";

  var KEY = "arenaTelemetry";
  var STATE_VERSION = 1;
  var CAP = 500;            // Ringpuffer-Kappe
  var MAX_PROPS = 8;        // Eigenschaften je Ereignis
  var MAX_STR = 40;         // Zeichen je String-Wert
  var MAX_KEY = 24;         // Zeichen je Eigenschaftsname

  /* ---------- Die Trichter-Ereignisse ----------
   * `once: true` heißt: Das Ereignis darf pro Installation genau EINMAL
   * gezählt werden. Ein "first_win", das bei jedem Sieg feuert, ist kein
   * Trichterschritt mehr, sondern Rauschen. */
  var EVENTS = [
    { key: "tutorial_step", once: false, desc: "Ein Tutorial-Schritt wurde abgeschlossen" },
    { key: "first_win", once: true, desc: "Erster Sieg überhaupt" },
    { key: "pack_opened", once: false, desc: "Ein Booster-Pack wurde geöffnet" },
    { key: "first_merge", once: true, desc: "Erste Fusion — das System ist verstanden" },
    { key: "arena_up", once: false, desc: "Neue Arena-Stufe erreicht" },
    { key: "offer_shown", once: false, desc: "Ein Angebot wurde eingeblendet" },
    { key: "offer_clicked", once: false, desc: "Ein Angebot wurde angetippt" },
    { key: "vault_full", once: false, desc: "Der Kristalltresor ist voll" },
    { key: "daily_complete", once: false, desc: "Alle drei Tagesquests erfüllt" },
    { key: "clan_joined", once: true, desc: "Clan-Beitritt" },
    { key: "donation_sent", once: false, desc: "Karten an ein Clan-Mitglied gespendet" },
  ];
  var EVENT_BY_KEY = {};
  EVENTS.forEach(function (e) { EVENT_BY_KEY[e.key] = e; });

  /* Schlüsselnamen, die niemals in den Puffer dürfen. Bewusst als
   * TEILSTRING-Prüfung: "userName", "e_mail" und "deviceId" fallen damit
   * genauso raus wie die exakten Begriffe. */
  var BLOCKED = ["name", "mail", "phone", "tel", "address", "adresse", "ip",
                 "user", "device", "geo", "lat", "lon", "gps", "uuid", "token",
                 "password", "passwort", "birth", "geb"];

  /* ================= Zeit / Persistenz ================= */

  var CLOCK = null;                              // Test-Hook
  function nowMs(o) {
    if (typeof o === "number" && isFinite(o)) return o;
    return CLOCK ? CLOCK() : Date.now();
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

  // Session-ID: reine Zufallszahl, kein Geräte- oder Kontobezug.
  var SESSION = "s" + Math.floor(Math.random() * 1e9).toString(36);

  function fresh() {
    return { v: STATE_VERSION, seq: 0, buf: [], once: {}, dropped: 0, sent: 0 };
  }
  function get() {
    var s;
    try { s = JSON.parse(lsGet() || "{}"); } catch (e) { s = {}; }
    if (!s || typeof s !== "object") s = {};
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    if (!Array.isArray(s.buf)) s.buf = [];
    if (!s.once || typeof s.once !== "object") s.once = {};
    s.seq = Math.max(0, s.seq | 0);
    s.dropped = Math.max(0, s.dropped | 0);
    s.sent = Math.max(0, s.sent | 0);
    s.buf = s.buf.filter(function (e) { return e && typeof e === "object" && e.e; })
                 .slice(-CAP);
    s.v = STATE_VERSION;
    return s;
  }
  function save(s) { try { lsSet(JSON.stringify(s)); } catch (e) {} }

  /* ================= PII-Filter ================= */

  function keyBlocked(k) {
    var low = String(k).toLowerCase();
    for (var i = 0; i < BLOCKED.length; i++) if (low.indexOf(BLOCKED[i]) >= 0) return true;
    return false;
  }
  /* sanitize(props) → {props, dropped}
   * Verworfen wird: alles mit blockiertem Schlüssel, alles was kein
   * primitiver Wert ist (Objekte/Arrays/Funktionen könnten beliebige
   * Daten mitschleppen) und alles jenseits von MAX_PROPS. */
  function sanitize(props) {
    var out = {}, dropped = 0, n = 0;
    if (!props || typeof props !== "object") return { props: out, dropped: 0 };
    for (var k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
      var v = props[k];
      if (n >= MAX_PROPS) { dropped++; continue; }
      if (keyBlocked(k)) { dropped++; continue; }
      var key = String(k).slice(0, MAX_KEY);
      if (typeof v === "number") {
        if (!isFinite(v)) { dropped++; continue; }
        out[key] = Math.round(v * 1000) / 1000;
      } else if (typeof v === "boolean") {
        out[key] = v;
      } else if (typeof v === "string") {
        out[key] = v.slice(0, MAX_STR);
      } else {
        dropped++; continue;                     // Objekte, Arrays, null, undefined
      }
      n++;
    }
    return { props: out, dropped: dropped };
  }

  /* ================= API ================= */

  var flushCb = null;

  /* track(event, props, now) → Ereignis oder null
   * Unbekannte Ereignisnamen werden AUFGEZEICHNET (mit `unknown: true`),
   * nicht verworfen: Ein Tippfehler im Aufruf soll in den Zahlen
   * auffallen und nicht lautlos verschwinden. */
  function track(event, props, now) {
    now = nowMs(now);
    var name = String(event || "").trim();
    if (!name) return null;
    var def = EVENT_BY_KEY[name];
    var s = get();
    if (def && def.once && s.once[name]) return null;   // Trichterschritt bleibt einmalig
    var cleaned = sanitize(props);
    s.seq++;
    var ev = { e: name, t: now, n: s.seq, s: SESSION };
    if (Object.keys(cleaned.props).length) ev.p = cleaned.props;
    if (!def) ev.unknown = true;
    s.buf.push(ev);
    if (s.buf.length > CAP) s.buf = s.buf.slice(-CAP);  // Ringpuffer: ältestes fällt raus
    if (def && def.once) s.once[name] = now;
    s.dropped += cleaned.dropped;
    save(s);
    try {
      if (typeof console !== "undefined" && console.debug) {
        console.debug("[telemetry] " + name, ev.p || {});
      }
    } catch (e) {}
    return ev;
  }

  /* onFlush(fn) — Naht zum späteren Endpunkt. fn(batch) darf true, false
   * oder ein Promise<boolean> liefern. */
  function onFlush(fn) { flushCb = (typeof fn === "function") ? fn : null; return !!flushCb; }
  function hasFlush() { return !!flushCb; }

  /* flush() → Promise<{sent, kept}>
   * Leert den Puffer NUR bei bestätigtem Erfolg. Ohne registrierten
   * Callback passiert nichts — der Puffer bleibt vollständig. */
  function flush() {
    var s = get();
    var batch = s.buf.slice();
    if (!flushCb || !batch.length) {
      return Promise.resolve({ sent: 0, kept: batch.length, reason: flushCb ? "empty" : "no-endpoint" });
    }
    var res;
    try { res = flushCb(batch); } catch (e) { res = false; }
    return Promise.resolve(res).then(function (ok) {
      if (ok !== true) return { sent: 0, kept: batch.length, reason: "failed" };
      var s2 = get();
      // Nur die tatsächlich übertragenen Ereignisse entfernen — was
      // während des Uploads dazukam, bleibt liegen.
      s2.buf = s2.buf.filter(function (e) { return e.n > batch[batch.length - 1].n; });
      s2.sent += batch.length;
      save(s2);
      return { sent: batch.length, kept: s2.buf.length, reason: "" };
    }, function () {
      return { sent: 0, kept: batch.length, reason: "failed" };
    });
  }

  function events(filter) {
    var buf = get().buf;
    if (!filter) return buf.slice();
    return buf.filter(function (e) { return e.e === filter; });
  }
  function count(name) { return events(name).length; }
  /* funnel() → Zählstand aller definierten Ereignisse in Trichter-Reihenfolge. */
  function funnel() {
    var buf = get().buf, by = {};
    buf.forEach(function (e) { by[e.e] = (by[e.e] | 0) + 1; });
    return EVENTS.map(function (d) {
      return { key: d.key, desc: d.desc, once: d.once, count: by[d.key] | 0 };
    });
  }
  function stats() {
    var s = get();
    return { buffered: s.buf.length, cap: CAP, seq: s.seq, dropped: s.dropped,
             sent: s.sent, session: SESSION, endpoint: !!flushCb,
             once: Object.keys(s.once).slice() };
  }
  function clear() { save(fresh()); return get(); }

  var API = {
    EVENTS: EVENTS, CAP: CAP, BLOCKED: BLOCKED,
    MAX_PROPS: MAX_PROPS, MAX_STR: MAX_STR, STATE_VERSION: STATE_VERSION,
    track: track, events: events, count: count, funnel: funnel, stats: stats,
    onFlush: onFlush, hasFlush: hasFlush, flush: flush, clear: clear,
    _key: KEY, _sanitize: sanitize, _clock: function (fn) { CLOCK = fn || null; },
    _session: function () { return SESSION; },
  };

  if (typeof window !== "undefined") window.ArenaTelemetry = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ============ Selbsttest (node arena_patches/arena_telemetry.js) ======== */
  if (typeof window === "undefined" && typeof process !== "undefined") {
    var fail = 0;
    var check = function (label, cond, i) {
      console.log((cond ? "  ok   " : "  FAIL ") + label + (i !== undefined ? "  " + i : ""));
      if (!cond) fail++;
    };
    var pad = function (x, n) { x = String(x); while (x.length < n) x += " "; return x; };
    // console.debug im Test stumm schalten, sonst rauscht es 500 Zeilen.
    var realDebug = console.debug;
    console.debug = function () {};

    var T0 = Date.UTC(2026, 6, 27, 8, 0, 0);
    var T = T0;
    API._clock(function () { return T; });

    console.log("\n=== ARENA TELEMETRY — Selbsttest (Analytics-Schicht) ===\n");

    /* --- 1. Ereignis-Katalog --- */
    console.log("Trichter-Ereignisse:");
    EVENTS.forEach(function (e) {
      console.log("  " + pad(e.key, 17) + pad(e.once ? "einmalig" : "wiederholt", 12) + e.desc);
    });
    check("11 Trichter-Ereignisse definiert", EVENTS.length === 11, EVENTS.length);
    check("die geforderten Namen sind alle dabei", [
      "tutorial_step", "first_win", "pack_opened", "first_merge", "arena_up",
      "offer_shown", "offer_clicked", "vault_full", "daily_complete",
      "clan_joined", "donation_sent",
    ].every(function (k) { return !!EVENT_BY_KEY[k]; }));
    check("genau 3 Ereignisse sind einmalig",
      EVENTS.filter(function (e) { return e.once; }).length === 3,
      EVENTS.filter(function (e) { return e.once; }).map(function (e) { return e.key; }).join(","));

    /* --- 2. Aufzeichnen --- */
    clear();
    var ev = track("first_win", { arena: 1, sec: 214 });
    check("track() legt ein Ereignis an", !!ev && ev.e === "first_win" && ev.n === 1);
    check("Zeitstempel, Sequenz und Session am Ereignis",
      ev.t === T0 && ev.n === 1 && typeof ev.s === "string" && ev.s.length > 1, ev.s);
    check("Eigenschaften bleiben erhalten", ev.p.arena === 1 && ev.p.sec === 214);
    check("count() zählt", count("first_win") === 1);
    check("einmalige Ereignisse feuern nur EINMAL",
      track("first_win", { arena: 2 }) === null && count("first_win") === 1);
    check("wiederholbare Ereignisse feuern jedes Mal", (function () {
      track("pack_opened", { type: "bronze" });
      track("pack_opened", { type: "gold" });
      return count("pack_opened") === 2;
    })());
    check("leerer Ereignisname wird abgelehnt", track("") === null && track(null) === null);
    check("unbekanntes Ereignis wird MARKIERT, nicht verworfen", (function () {
      var e = track("packt_opened_tippfehler", { a: 1 });
      return e && e.unknown === true && count("packt_opened_tippfehler") === 1;
    })());

    /* --- 3. PII-Filter (die harte Zusage) --- */
    console.log("\nPII-Filter:");
    var dirty = track("offer_shown", {
      offer: "starter", price: 2.99, ok: true,
      name: "Max Mustermann", email: "max@example.com", userName: "maxi",
      deviceId: "AB-12", ip: "1.2.3.4", geoLat: 52.5,
      deck: ["fire", "water"], nested: { a: 1 }, fn: function () {},
      lang: "de-DE-with-a-very-long-suffix-that-should-be-cut-off-here",
    });
    console.log("  gespeichert: " + JSON.stringify(dirty.p));
    check("erlaubte Primitive kommen durch",
      dirty.p.offer === "starter" && dirty.p.price === 2.99 && dirty.p.ok === true);
    ["name", "email", "userName", "deviceId", "ip", "geoLat"].forEach(function (k) {
      check("PII-Schlüssel verworfen: " + k, dirty.p[k] === undefined);
    });
    check("Objekte und Arrays werden verworfen",
      dirty.p.deck === undefined && dirty.p.nested === undefined && dirty.p.fn === undefined);
    check("Strings werden auf " + MAX_STR + " Zeichen gekappt",
      dirty.p.lang && dirty.p.lang.length === MAX_STR, dirty.p.lang);
    check("höchstens " + MAX_PROPS + " Eigenschaften",
      Object.keys(dirty.p).length <= MAX_PROPS, Object.keys(dirty.p).length);
    check("verworfene Felder werden GEZÄHLT (nicht stillschweigend)",
      stats().dropped > 0, stats().dropped + " verworfen");
    check("Teilstring-Prüfung greift (userName, deviceId, geoLat)",
      keyBlocked("userName") && keyBlocked("deviceId") && keyBlocked("geoLat") &&
      !keyBlocked("arena") && !keyBlocked("price"));
    check("Session-ID enthält keine Ziffernfolge > 12 (kein Zeitstempel)",
      !/\d{13}/.test(API._session()), API._session());
    check("nicht-endliche Zahlen werden verworfen", (function () {
      var e = track("arena_up", { a: Infinity, b: NaN, tier: 3 });
      return e.p.a === undefined && e.p.b === undefined && e.p.tier === 3;
    })());

    /* --- 4. Ringpuffer --- */
    clear();
    for (var i = 0; i < CAP + 120; i++) track("pack_opened", { i: i });
    var st = stats();
    console.log("\nRingpuffer: " + (CAP + 120) + " Ereignisse geschrieben → " +
      st.buffered + " gepuffert (Kappe " + CAP + ")");
    check("Puffer läuft nicht über der Kappe", st.buffered === CAP, st.buffered);
    check("Sequenznummer läuft weiter (nichts wird doppelt gezählt)",
      st.seq === CAP + 120, st.seq);
    check("die ÄLTESTEN Ereignisse fallen raus (FIFO)", (function () {
      var buf = events();
      return buf[0].p.i === 120 && buf[buf.length - 1].p.i === CAP + 119;
    })(), "erstes i=" + events()[0].p.i);

    /* --- 5. Trichter --- */
    clear();
    track("tutorial_step", { step: 1 });
    track("tutorial_step", { step: 2 });
    track("first_win");
    track("pack_opened");
    track("first_merge");
    track("arena_up", { tier: 2 });
    track("offer_shown", { offer: "starter" });
    track("offer_clicked", { offer: "starter" });
    track("vault_full", { tier: 1 });
    track("daily_complete", { day: 3 });
    track("clan_joined");
    track("donation_sent", { n: 4 });
    var fn = funnel();
    console.log("\nTrichter:");
    fn.forEach(function (f) { console.log("  " + pad(f.key, 17) + f.count); });
    check("funnel() nennt alle 11 Stufen in Katalog-Reihenfolge",
      fn.length === 11 && fn[0].key === "tutorial_step" && fn[10].key === "donation_sent");
    check("tutorial_step doppelt, alles andere einfach",
      fn[0].count === 2 && fn.slice(1).every(function (f) { return f.count === 1; }));

    /* --- 6. Flush-Naht --- */
    var got = null;
    check("ohne Endpunkt bleibt der Puffer vollständig", (function () {
      var before = stats().buffered, done = false, kept = 0;
      flush().then(function (r) { done = true; kept = r.kept; });
      return before === 12;
    })());
    check("onFlush() registriert den Endpunkt",
      onFlush(function (b) { got = b; return true; }) === true && hasFlush() === true);
    var flushed = null;
    flush().then(function (r) { flushed = r; });
    // Promise-Mikrotask abwarten
    (function waitFlush(done) {
      if (flushed || done > 50) return finishFlush();
      setTimeout(function () { waitFlush(done + 1); }, 0);
    })(0);

    function finishFlush() {
      check("flush() übergibt den Batch an den Callback",
        Array.isArray(got) && got.length === 12, got ? got.length + " Ereignisse" : "kein Batch");
      check("Batch enthält KEIN PII-Feld", got.every(function (e) {
        return !e.p || Object.keys(e.p).every(function (k) { return !keyBlocked(k); });
      }));
      check("bestätigter Flush leert den Puffer",
        flushed && flushed.sent === 12 && stats().buffered === 0,
        JSON.stringify(flushed));
      check("gesendete Ereignisse werden mitgezählt", stats().sent === 12, stats().sent);

      /* --- 7. Fehlgeschlagener Flush verliert NICHTS --- */
      clear();
      track("pack_opened"); track("pack_opened"); track("arena_up", { tier: 4 });
      onFlush(function () { return false; });
      var failRes = null;
      flush().then(function (r) { failRes = r; });
      setTimeout(function () {
        check("abgelehnter Upload lässt den Puffer unangetastet",
          failRes && failRes.sent === 0 && failRes.reason === "failed" && stats().buffered === 3,
          JSON.stringify(failRes));
        onFlush(function () { throw new Error("Netzwerk weg"); });
        var throwRes = null;
        flush().then(function (r) { throwRes = r; });
        setTimeout(function () {
          check("werfender Callback bringt das Modul nicht um",
            throwRes && throwRes.sent === 0 && stats().buffered === 3);

          /* --- 8. Robustheit --- */
          onFlush(null);
          check("onFlush(null) hängt den Endpunkt wieder ab", hasFlush() === false);
          check("Müll im Speicher → frischer Puffer, kein Crash", (function () {
            lsSet("{kaputt,,");
            var s2 = get();
            return s2.v === STATE_VERSION && Array.isArray(s2.buf) && s2.buf.length === 0;
          })());
          check("kaputte Puffereinträge werden aussortiert", (function () {
            lsSet(JSON.stringify({ v: 1, seq: -5, buf: [null, 42, { e: "pack_opened", t: 1, n: 1 }, {}],
                                   once: "kaputt", dropped: -3 }));
            var s2 = get();
            return s2.buf.length === 1 && s2.seq === 0 && s2.dropped === 0 &&
                   typeof s2.once === "object";
          })(), JSON.stringify(get().buf));
          check("clear() leert alles", (function () {
            clear();
            var s2 = stats();
            return s2.buffered === 0 && s2.seq === 0 && s2.sent === 0 && s2.once.length === 0;
          })());
          check("einmalige Ereignisse sind nach clear() wieder möglich",
            track("first_win") !== null);
          check("track() ohne Eigenschaften ist gültig", (function () {
            clear();
            var e = track("clan_joined");
            return e && e.p === undefined;
          })());
          check("Zeit-Hook wirkt (deterministische Tests)", (function () {
            clear();
            T = T0 + 3600000;
            return track("pack_opened").t === T0 + 3600000;
          })());

          console.debug = realDebug;
          API._clock(null);
          console.log("\n" + (fail === 0 ? "ALLE TESTS OK" : fail + " TEST(S) FEHLGESCHLAGEN") + "\n");
          if (fail) process.exitCode = 1;
        }, 5);
      }, 5);
    }
  }
})();
