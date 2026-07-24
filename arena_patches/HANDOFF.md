# HANDOFF — Arcane Arena Drop-in-Module

**Für die Claude-Session auf dem Mac:** Diese Module in `~/elemental-td/public/arena_pan.html`
bzw. `~/elemental-td/public/vs.html` integrieren. Sie liegen hier im Repo unter `arena_patches/`
und sind bewusst **in sich geschlossen** (IIFE, `window.XYZ`-Export, keine Abhängigkeit
untereinander, defensiv gegen fehlende Callbacks).

## ⚠ Vor dem Einbau: Identifier VERIFIZIEREN

Die Module sind gegen die **Namen aus der Doku** (Stand 2026-07-19) gebaut, nicht gegen den
echten Quelltext — `arena_pan.html` lag der schreibenden Session nicht vor. Vor jedem Wiring
prüfen, ob der Bezeichner im echten Code wirklich so heißt:

```bash
cd ~/elemental-td/public
for id in 'resolveEnd' 'newHand' 'drawCard' 'place(' 'placeTower' 'castleHP' 'foeHP' \
          'nextWaveIn' 'ultCharge' 'arenaStreak' 'id="result"' 'id="hand"'; do
  printf '%-16s %s\n' "$id" "$(grep -c -- "$id" arena_pan.html)"
done
```

Zusätzlich prüfen (für arena_pity.js **zwingend**):

```bash
grep -n "drawCard" -A 20 arena_pan.html   # → echtes Kartenobjekt-Literal ablesen
grep -n "combineMode\|_makeFusion\|_makeTriple" arena_pan.html
grep -n "220" arena_pan.html              # → die wave-clear-drain-Zeile finden
```

**Einbindungsart:** Die Dateien sind eigenständige `.js`. Entweder als
`<script src="arena_rivals.js"></script>` vor dem Haupt-`<script>` einbinden (dann müssen sie
nach `public/` kopiert und im Service-Worker-Cache gelistet werden) **oder** den Inhalt direkt
oben in den Haupt-Script-Block kopieren. Bei einem Single-File-Spiel ist Variante 2 meist
weniger Reibung — dann aber daran denken, den WIRING-Kommentar mitzunehmen.

---

## 1. `arena_profile.js` — echte Trophäen / Rang / Packs

**Was es tut:** Ersetzt die kosmetische "+30 Trophäen"-Anzeige durch ein persistiertes Profil
in `localStorage.arenaProfile` (Trophäen, Rang mit 7 Stufen, Siegesserie, Booster-Pack alle
3 Siege, Splitter-Bank für den Hub). Liefert fertiges Result-HTML.

**Einbau:**
1. Script einbinden/einfügen.
2. In `resolveEnd()`, sobald `win` und `stars` feststehen:
   ```js
   const res = ArenaProfile.applyMatchResult({
     win, stars, hpYou: castleHP, hpFoe: foeHP,
     rivalId: (localStorage.arenaRival || null),
   });
   document.getElementById('result').insertAdjacentHTML('beforeend', ArenaProfile.resultHTML(res));
   ```
3. **WICHTIG:** Die bestehende statische `+30 Trophäen`-Zeile in `resolveEnd()` **MUSS raus** —
   sonst stehen zwei Trophäen-Anzeigen untereinander und die falsche zuerst.
4. **`arenaStreak` (alt) kann auf ArenaProfile umziehen:** `ArenaProfile.get().streak` führt
   dieselbe Zahl korrekt mit. Entweder das alte `localStorage.arenaStreak`-Schreiben ersatzlos
   entfernen, oder es einmalig migrieren (alten Wert als Startwert übernehmen) und danach
   löschen. `arenaAiLvl` bleibt unverändert — das ist die Bot-Lernkurve, nicht der Spielerstand.
5. Hub/`deck.html`: `ArenaProfile.get()` lesen, `trophies` + `rankOf(t).name` in der Top-Bar
   zeigen; `applyShardsToHub(hub, cardIds)` verteilt die Splitter-Bank auf `arenaHub.coll`
   (Feldname `shards` ggf. an die echte Struktur anpassen).

**Tuning:** `T_WIN` (30), `T_LOSS` (-10), `T_STAR` (4), `STREAK_BONUS` (bis +20),
`PACK_WINS` (3), `PACK_SHARDS` (6), `LOSS_SHARDS` (1), `RANKS[]`-Schwellen.

**Offene Entscheidung:** Soll eine Niederlage bei 0 Trophäen wirklich nicht unter 0 fallen
(aktuell ja, `Math.max(0, …)`)? Und: Splitter-Verteilung aktuell **zufällig** über alle
Karten — alternativ nur auf Deck-Karten oder vom User wählbar.

---

## 2. `arena_rivals.js` — benannte Bot-Rivalen + Near-Miss-Tuning

**Was es tut:** Gibt dem Bot 12 benannte Persönlichkeiten (Deck, Held, Aggro, Flavor) in drei
Trophäen-Bändern, führt eine Bilanz je Rival (`localStorage.arenaRivalHist`) und zieht mit 35%
Chance den Gegner, gegen den man zuletzt verloren hat ("Revanche!"). Dazu `driftFactor()`, das
den simulierten Bot-HP-Drain gegen Matchende so nachjustiert, dass Finishes knapp werden.

**Einbau (vs.html):**
1. Script einbinden.
2. Im Hero-Reveal-Schritt der Slot-Machine:
   ```js
   const rival = ArenaRivals.pick(window.ArenaProfile ? ArenaProfile.get().trophies : 0);
   foeCardEl.innerHTML = ArenaRivals.vsCardHTML(rival);
   ```
   `pick()` schreibt `localStorage.arenaRival`; `arena_pan.html` liest das nur noch.

**Einbau (arena_pan.html):**
3. Script einbinden.
4. Die wave-clear-drain-Zeile (`foeHP -= 220 + Math.random()*180;` o. ä.) multiplizieren:
   ```js
   foeHP -= (220 + Math.random()*180) * ArenaRivals.driftFactor(castleHP, foeHP, tSec, 420);
   ```
   `tSec` ist hier die **verbleibende** Zeit (Doku: startet bei 420 und zählt runter). Falls
   `tSec` im echten Code hochzählt, `420 - tSec` übergeben — sonst dreht sich die Logik um!
5. In `resolveEnd()`: `ArenaRivals.recordResult(win);`
6. Optional: Rivalennamen ins HUD (`(ArenaRivals.current()||{}).name`) und in den Result-Screen.

**Tuning:** `REMATCH_CHANCE` (0.35), `DRIFT_MIN` (0.55) / `DRIFT_MAX` (1.60), `K` (0.85 = Hebel),
die Intensitätsschwelle `0.6` (= Eingriff beginnt im letzten 40% der Matchzeit), die tote Zone
`|margin| < 0.06`, sowie `bandOf()`-Schwellen (250 / 700 Trophäen).

**Fairness-Garantie (bewusst so gebaut):** Der Faktor greift **nur** am Bot-Drain — nie an
Spieler-HP, Monster-HP oder Turmschaden. In der ersten Match-Hälfte ist er exakt `1.0`, ein
früher Vorsprung ist also echt. Und die Caps sorgen dafür, dass ein klarer Vorsprung (>2x HP)
auch mit gedrosseltem Drain nicht mehr eingeholt werden kann.

**Offene Entscheidungen:** (a) Soll `rival.aggro` / `rival.deck` den Bot wirklich steuern
(Bot-Wellenkadenz, Element der gespawnten Monster) oder vorerst reine Kosmetik bleiben?
(b) Soll `driftFactor` auch bei **aiLvl** mitreden, oder bleiben die zwei Systeme getrennt?
(c) Rivalen-Bilanz im Hub als "Erzfeind"-Liste anzeigen?

---

## 3. `arena_pity.js` — Fusion-/Triple-Garantie

**Was es tut:** Sobald Fusion (Welle ≥3, ≥2 Basis-Türme) bzw. Triple (Welle ≥6, Fusion auf dem
Board) spielbar wäre und **eine** Hand ohne die Karte vergangen ist, wird sie in der nächsten
Hand erzwungen — die geopferte Karte ist bevorzugt eine Straßenkarte, nie die letzte Turmkarte.
Verhindert unverschuldete Niederlagen durch Kartenpech gegen `58*1.23^w`.

**Einbau:**
1. Script einbinden.
2. **`CARD_FUSION` / `CARD_TRIPLE` oben im File anpassen!** Aktuell `{type:'fusion'}` bzw.
   `{type:'triple'}` — durch das echte Literal ersetzen, das `drawCard()` für diese Karten
   erzeugt (inkl. aller Felder, die das Rendering und `cardKey()` brauchen).
3. Am Ende von `newHand()`, vor dem Rendern:
   ```js
   hand = ArenaPity.applyToHand(hand, {
     wave: wave,
     baseTowerCount: towers.filter(t => !t.fusion && !t.triple).length,
     hasFusionOnBoard: towers.some(t => t.fusion),
   });
   ```
   (Feldnamen `t.fusion` / `t.triple` gegen den echten Turm-Datensatz prüfen — evtl. `t.tier`
   oder `t.kind`.)
4. Bei Matchstart **und** Rematch: `ArenaPity.reset();`
5. Debug: `__G.pity = ArenaPity.debugState;`

**state-Felder:** `wave`, `baseTowerCount`, `hasFusionOnBoard` (Pflicht);
`fusionCardDrawnSinceEligible` / `tripleCardDrawnSinceEligible` (optional — falls das Spiel
selbst mitzählt, ruht Pity, solange das true ist).

**Tuning:** `WAVE_FUSION` (3), `WAVE_TRIPLE` (6), `MIN_BASE_TOWERS` (2), `MISS_LIMIT` (1 =
eine Hand ohne Karte wird geduldet; auf 2 setzen, wenn es sich zu geschenkt anfühlt).

**Offene Entscheidung:** Nach `cardKey()`-Dedupe könnte die erzwungene Karte ein Duplikat
erzeugen, falls die Hand schon eine Fusion-Karte in anderer Form enthält — die `isType()`-
Prüfung deckt `type`/`kind`/`card` ab, sollte aber gegen die echte Struktur gegengecheckt werden.

---

## 4. `arena_surrender.js` — Aufgeben + Comeback

**Was es tut:** (A) Ein dezenter "🏳 Aufgeben"-Button, der erst ab Minute 3 erscheint, mit
Inline-Rückfrage und 5s-Auto-Abbruch. (B) `ArenaComeback.onBossKill()` gibt Zurückliegenden
0.25–0.50 Ult-Ladung + 4% Burg-Heilung, Führenden nur 0.10 Ult.

**Einbau:**
1. Script einbinden.
2. Nach Matchstart: `ArenaSurrender.mountButton({ onSurrender: () => resolveEnd(false) });`
   (bzw. was auch immer das Defeat-Ende auslöst — evtl. braucht es vorher ein
   `castleHP = 0` / Timer-Stopp, damit `resolveEnd()` sauber DEFEAT ableitet).
3. Im Sekunden-Tick: `ArenaSurrender.tick(420 - tSec);` (vergangene Sekunden!).
4. Bei Matchende/Rematch: `ArenaSurrender.unmount();`
5. Beim Boss-Tod:
   ```js
   const cb = ArenaComeback.onBossKill(castleHP, foeHP);
   ultCharge = Math.min(1, ultCharge + cb.ultBonus);
   if (cb.healPct) castleHP = Math.min(15000, castleHP + cb.healPct * 15000);
   toast('⚡ Boss-Energie absorbiert!');
   ```

**Tuning:** `DEFAULT_AFTER_SEC` (180), `CONFIRM_TIMEOUT` (5000), `ULT_MIN` (0.25),
`ULT_MAX` (0.50), `ULT_AHEAD` (0.10), `HEAL_PCT` (0.04 = 600 HP), `BASE_CSS`/`opts.css` für
die Button-Position (aktuell zentriert unter dem Timer).

**Offene Entscheidungen:** (a) Soll Aufgeben Trophäen kosten wie eine normale Niederlage
(aktuell ja — es läuft durch `resolveEnd` → `ArenaProfile`) oder mehr? (b) Soll die
Boss-Heilung auch die **Ult sofort auslösen**, wenn sie dadurch voll wird?

---

## 5. `arena_tutorial.js` — Erstes-Match-Coach

**Was es tut:** Fünf Schritte (~60s) im laufenden ersten Match: Straßenkopf-Prinzip erklären,
Straßenkarte legen lassen, Turm bauen lassen, Held erklären, Siegbedingung. Overlay mit
Highlight-Ring (box-shadow-Loch), "Überspringen" immer sichtbar, Flag `arenaTutorialDone`.

**Einbau:**
1. Script einbinden.
2. Nach Spielstart (nach dem ersten `newHand()`/Render):
   ```js
   if (window.ArenaTutorial && ArenaTutorial.needed())
     ArenaTutorial.start({ onPause: () => { paused = true; }, onResume: () => { paused = false; } });
   ```
   `onPause`/`onResume` sind optional — dort am besten `nextWaveIn` einfrieren (Wert merken und
   im Tick nicht dekrementieren), damit während der ersten 3 Schritte keine Welle startet.
3. In `place()` (Straße gelegt, Erfolgspfad): `window.ArenaTutorial && ArenaTutorial.notify('pathPlaced');`
4. In `placeTower()` (Erfolgspfad): `window.ArenaTutorial && ArenaTutorial.notify('towerPlaced');`

**Tuning:** `STEPS[]` (Texte/Reihenfolge), `PAUSE_UNTIL_INDEX` (2 = Pause bis inkl. Turm-Schritt),
`opts.highlightHand` (default `#hand`), `opts.highlightBoard` (default `#c`).
Zum Wiedertesten: `ArenaTutorial.reset()` in der Konsole.

**Offene Entscheidung:** Schritt 2/3 blockieren die Eingabe **nicht** (pointer-events werden
durchgelassen) — der Spieler kann also auch etwas anderes tun und hängt dann im Step fest, bis
er die Aktion ausführt. Alternative: Timeout, der nach ~20s automatisch weiterspringt.

---

## 6. Karten-Progression (neu) — `DESIGN_PROGRESSION.md` + `arena_cards.js`

**Was es ist:** Das komplette Sammel- und Booster-Pack-System nach dem Vorbild von
"Arcane Arena" (Panteon/MWM). Karten haben Level 1–100, die Rarität ist ein Level-Band
derselben Karte (Gewöhnlich → Selten → Episch → Legendär → Relikt → Suprem), Packs droppen
Karten-**Kopien** in Bündeln, jeder Raritäts-Aufstieg ab Selten bringt eine Perk-Wahl.

- **`arena_patches/DESIGN_PROGRESSION.md`** — vollständige Design-Spezifikation: Level-/Kopien-/
  Gold-Tabellen, Stat-Kurve `statMul(lvl) = 1.018^(lvl-1) × 1.10^tierIndex`, Zeit-bis-Farbwechsel,
  Perk-Registry (64 Slots, 32 ausformuliert), 4 Pack-Typen mit Drop-Gewichten + Pity + Overflow,
  Pack-Öffnungs-Zeremonie, Trophy-Road/Season-Pass/Daily-Loop, Migration, Test-Checkliste,
  plus ein Abschnitt mit den **verifizierten Fakten zum echten AA** (Quellenliste).
- **`arena_patches/arena_cards.js`** — reines Logik-Modul (kein DOM), `window.ArenaCards`.
  Selbsttest: `node arena_patches/arena_cards.js` (10 000 simulierte Bronze-Packs, Quoten,
  Pity, Level-Kurve, Bank-Mechanik, Migration → "ALLE TESTS OK").

**⚠ Ersetzt bestehende Systeme:**
1. **`metaMul = 1.12^(lvl-1)` in `arena_pan.html` MUSS raus** — auf einer 1–100-Leiter wären das
   ~10⁴-fache Werte. Ersatz: `ArenaCards.statMul(lvl)` (Lv100 ≈ 10.8×).
2. **`shardsBank` aus `arena_profile.js` wird ersetzt.** Packs droppen ab jetzt Karten-Kopien
   statt Splitter → `PACK_SHARDS`, `LOSS_SHARDS`, `applyShardsToHub()` stilllegen und in
   `applyMatchResult()` bei `packAwarded` stattdessen
   `ArenaCards.openPack('bronze', POOL_IDS, HERO_IDS)` aufrufen. Bestehende Splitter einmalig
   kulant abgelten (siehe Design-Doku §E) — sie hatten nie eine definierte Umrechnung.
3. **Einmal-Migration** beim Hub-Start: `ArenaCards.migrateFromHub(...)` → alte
   `arenaHub.coll`-Level × 5 (Lv8 → Lv40/Episch). Läuft nur einmal (Flag im State),
   `arenaHub` bleibt unangetastet.

Der WIRING-Block oben in `arena_cards.js` listet alle vier Einbaustellen mit Code.

---

## Reihenfolge & Aufwand

Empfohlen, weil jedes Modul auf dem Verständnis des vorherigen aufbaut und `arena_profile.js`
die Datenbasis für `arena_rivals.js` liefert:

| # | Modul | Warum hier | Aufwand |
|---|-------|-----------|---------|
| 1 | `arena_profile.js` | Kleinster Eingriff (2 Stellen in `resolveEnd()`), sofort sichtbarer Wert, liefert `trophies` für Rivals | ~20–30 min |
| 2 | `arena_rivals.js` | 2 Dateien (vs.html + arena_pan.html), braucht Profil-Trophäen; `driftFactor` will einmal getestet werden | ~40–60 min |
| 3 | `arena_pity.js` | Braucht das echte `drawCard()`-Kartenliteral → erst Code lesen, dann anpassen | ~30–40 min |
| 4 | `arena_surrender.js` | Unabhängig, zwei getrennte Hooks (Button + Boss-Kill) | ~25–35 min |
| 5 | `arena_tutorial.js` | Am invasivsten (Pause-Logik im Game-Loop), am besten mit frischem Kopf | ~40–60 min |

**Gesamt: ca. 2.5–4 Stunden** inklusive Testen. Nach jedem Modul einzeln testen und committen —
nicht alle fünf auf einmal einbauen.

---

## Test-Checkliste

**arena_profile.js**
- Match gewinnen → `JSON.parse(localStorage.arenaProfile).trophies` ist gestiegen (+30 plus Sterne).
- Dritter Sieg in Folge → Result-Screen zeigt "🎁 BOOSTER-PACK!", `packProgress` steht wieder auf 0.
- Im Result-Screen steht die alte "+30 Trophäen"-Zeile **nicht mehr** doppelt.

**arena_rivals.js**
- `vs.html` laden → Gegnerkarte mit Name/Titel/Flavor; `localStorage.arenaRival` ist gesetzt.
- Gegen denselben Rival verlieren, dann 3–4× neu matchen → mindestens einmal "⚔ REVANCHE!"-Badge.
- Konsole: `ArenaRivals.driftFactor(9000, 3000, 300, 420)` → exakt `1` (frühe Hälfte, kein Eingriff);
  `ArenaRivals.driftFactor(9000, 3000, 40, 420)` → deutlich `< 1`; `(3000, 9000, 40, 420)` → `> 1`;
  alle Werte in `[0.55, 1.60]`.

**arena_pity.js**
- Konsole: `__G.pity()` nach Welle 4 mit 2+ Basis-Türmen → `forced.fusion === true` und die
  Fusion-Karte ist spätestens in der zweiten Hand danach sichtbar.
- Die erzwungene Karte ist **spielbar** (nicht nur optisch da) → antippen, zwei Basis-Türme
  wählen, Fusion entsteht. Falls nicht: `CARD_FUSION`-Literal stimmt nicht.
- `ArenaPity.reset()` beim Rematch → `debugState().misses` wieder `{fusion:0, triple:0}`.

**arena_surrender.js**
- Bei 2:59 Matchzeit kein Button, ab 3:00 erscheint er eingeblendet.
- Tap → Rückfrage; 5 Sekunden warten → verschwindet von selbst, Button ist wieder da.
- "Ja" → DEFEAT-Screen, und `arenaProfile.losses` ist um 1 gestiegen.
- Konsole: `ArenaComeback.onBossKill(3000, 12000)` → `ultBonus` nahe `0.5`, `healPct: 0.04`;
  `onBossKill(12000, 3000)` → `{ultBonus: 0.1, healPct: 0}`.

**arena_tutorial.js**
- `localStorage.removeItem('arenaTutorialDone')` + Reload → Tutorial startet.
- Schritt 2/3: Aktion ausführen → "✓ Sehr gut!" und automatischer Weitersprung.
- Nach Abschluss oder "Überspringen": `localStorage.arenaTutorialDone === "1"`, Reload zeigt es
  **nicht** erneut, und das Spiel läuft (nicht dauerhaft pausiert!) weiter.

---

## Nicht vergessen

- **Service-Worker-Cache-Version bumpen.** Nach jedem Einbau die Cache-Konstante
  (`arena-vNN`) im Service Worker hochzählen — sonst liefert der SW die alte
  `arena_pan.html` aus und man debuggt stundenlang eine Datei, die gar nicht läuft.
  Falls die Module als separate `.js` eingebunden werden: **auch in die Precache-Liste aufnehmen.**
- **`arena_deploy.sh` meldet auch bei Fehlern Erfolg.** Nach dem Deploy immer verifizieren:
  ```bash
  curl -s https://<domain>/arena_pan.html | grep -c "ArenaProfile"
  curl -sI https://<domain>/arena_pan.html | grep -i 'last-modified\|content-length'
  ```
  Wenn der grep 0 zurückgibt, ist der Deploy trotz "OK" nicht durchgegangen.
- **`arena_pan.html` endlich in git tracken.** Die Datei ist ~257 KB, das ist für git völlig
  unproblematisch — aber ohne Versionierung ist jeder dieser Eingriffe unumkehrbar. Vor dem
  ersten Einbau: `git add public/arena_pan.html public/vs.html public/deck.html && git commit`.
  Danach pro Modul ein eigener Commit, dann ist ein Rollback ein `git revert`.
- **Vor dem Einbau ein Backup:** `cp public/arena_pan.html public/arena_pan.html.bak` — kostet
  nichts und rettet den Abend, falls git doch noch nicht eingerichtet ist.
