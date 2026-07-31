# HANDOFF — Arcane Arena Drop-in-Module

> ⚠ **Dieses Blatt beschreibt die MATCH-Module (Stand 19.07.2026), nicht die Oberfläche.**
> Wer die **komplette Meta-UI** ins Spiel ziehen will, ist hier falsch und findet alles
> in **`UI_UEBERGABE.md`** — was zusammengehört, wie man es startet, was geprüft ist und
> welche acht Regeln beim Einbau nicht gebrochen werden dürfen.


**Für die Claude-Session auf dem Mac:** Diese Module in `~/elemental-td/public/arena_pan.html`
bzw. `~/elemental-td/public/vs.html` integrieren. Sie liegen hier im Repo unter `arena_patches/`
und sind bewusst **in sich geschlossen** (IIFE, `window.XYZ`-Export, keine Abhängigkeit
untereinander, defensiv gegen fehlende Callbacks).

**Inhalt des Ordners:**

| Datei | Was |
|---|---|
| `arena_profile.js` · `arena_rivals.js` · `arena_pity.js` · `arena_surrender.js` · `arena_tutorial.js` | die fünf Match-Module (§1–§5) |
| `arena_cards.js` | **Karten-Progression v2** — Merge + Material-**Sorten** (§6) |
| `arena_fortress.js` | **Festungs-Upgrades** — die dritte Progressions-Achse (§7) |
| `arena_clan.js` | **Clan-System Stufe 1** — Quests, Spenden, Ghost-Clankrieg, Leaderboard (`DESIGN_CLAN.md`) |
| `arena_vault.js` | **Kristalltresor + Angebotskette** — IAP-Platzhalter (`DESIGN_MONETARISIERUNG.md`) |
| `arena_daily.js` | **Täglicher Loop** — 3 Tagesquests, Siegesserie, Gratis-Pack-Timer |
| `arena_telemetry.js` | **Analytics** — Ringpuffer im localStorage, 11 Trichter-Ereignisse, PII-frei |
| `LIZENZEN.md` | **Fremdmaterial** — die 6 CC0-Audiodateien (OpenGameArt), Schriften, Code |
| `ui_prototype.html` | **lauffähiger UI-Nachbau** der vier Meta-Screens (§6) |
| `AA_UI_REFERENZ.md` | verifizierte Referenz zum Vorbild (Video-Analyse) — **Wahrheitsquelle** |
| `DESIGN_PROGRESSION.md` | Design-Spezifikation der Karten-Progression (v2, inkl. v1-Anhang) |
| `GAMEPLAY_OPTIMIERUNG.md` | Abgleich der AA-**Match**-Mechanik gegen unseren Spielstand |

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

> **Siehe auch `GAMEPLAY_OPTIMIERUNG.md` §4:** AA vergibt **fixe, arenagebundene** Siegprämien
> (+39 Trophäen / 610 Gold, doppelt belegt). Empfehlung dort: fixe Basis pro Arena + Streak-Bonus,
> `T_STAR` streichen.

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

> **⚠ `bandOf()`-Schwellen nachziehen.** Die 250/700 stammen aus der geschätzten Arena-Tabelle.
> **Stand jetzt (AA-Referenz §14.1): die vollständige Leiter ist 0 / 300 / 600 / 900 / 1200 /
> 1500.** Für `bandOf()` also am besten `Math.min(5, Math.floor(trophies / 300))` — dann
> stimmen Bänder und Arenen per Konstruktion überein, ohne dass eine zweite Tabelle
> gepflegt werden muss.
> Belegt sind seit Video 6 **600 / 1200 / 1500** (`AA_UI_REFERENZ.md` §9.5). Damit die
> Rivalen-Bänder mit den Arenen zusammenfallen — sonst wechselt der Gegnertyp mitten in einer
> Arena —, beim Einbau auf **600 / 1200** umstellen (bzw. ein viertes Band ab 1500 ergänzen).
> Dieselbe Tabelle gaten `arena_fortress.js` und die Objectives aus
> `GAMEPLAY_OPTIMIERUNG.md` §8.

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

## 6. Karten-Progression **v2** — Merge + Upgrade-Material

**⚠ v2 seit 2026-07-24.** Das ursprüngliche Modell (Rarität = Level-Band, Level-Up kostet
Kartenkopien) ist durch die **Videoanalyse des echten Spiels** widerlegt und ersetzt. Grundlage
ist jetzt `arena_patches/AA_UI_REFERENZ.md` (§2 Turm-Detailkarte, §4 Merge, §5 Upgrade-Material).

**Das Modell in drei Sätzen.** Eine Karte hat **zwei getrennte Achsen**: Die **Rarität** steigt,
indem man **3 identische Karten derselben Stufe verschmilzt** — das hebt das **Level-Cap** und
schaltet einen **permanenten kartenspezifischen Bonus** frei. Das **Level** steigt gegen
**Upgrade-Material + Gold** und verbraucht **keine** Kartenkopien. Booster-Packs droppen
**Karten** (meist Gewöhnlich, seltener vorgemergt), **Material** und **Gold**.

| Stufe | Farbe | Level-Cap | Material/Level-Up |
|---|---|---|---|
| Gewöhnlich | Grau `#9aa3ad` | 25 | 3 |
| Gut | Grün `#58c26a` | 40 | 4 |
| Selten | Blau `#3d9df2` | 55 | 5 |
| Episch | Lila `#a45ef2` | 70 | 6 |
| Legendär | Orange `#f2a13d` | 85 | 7 |
| Suprem | Rot `#ff5e7e` | 100 | 8 |

**Die vier Dateien:**

- **`arena_patches/arena_cards.js`** — reines Logik-Modul (kein DOM), `window.ArenaCards`.
  API: `statMul(lvl, mergeBoni)` · `goldFor(lvl)` · `materialFor(lvl, tierIdx)` · `tierOf(key|idx)`
  · `addDrop(id, tier, n)` · `addMaterial(n, typeKey)` · `canMerge` / `merge` / `mergeAll` /
  `chooseMergeBonus` / `pendingBonusChoices` / `progressToNextMerge` · `canLevelUp(id, gold)` /
  `levelUp(id)` · `view(id)` · `openPack(type, poolIds, heroIds, rng)` · `modsOf(id)` ·
  `migrateV1()`. **Neu (State v3):** `materialTypeOf(id)` / `materialInfoOf(id)` /
  `getMaterials()` / `getPityStatus()`. Selbsttest: `node arena_patches/arena_cards.js`
  → **ALLE TESTS OK**.
- **`arena_patches/ui_prototype.html`** — **lauffähiger UI-Nachbau** der AA-Screens mit unserem
  Content (eine Datei, kein Build, lädt `./arena_cards.js` relativ; einfach im Browser öffnen).
  Vier Views mit Bottom-Nav: **Collection** (Deck-Zeile, Tabs, 5-Spalten-Raster mit
  Raritätsrahmen, LvL-Badge, Merge-Punkte ●●○, Red Dot), **Turm-Detail** (Vollbild-Modal,
  animierter Loop-Slot, 2×2-Stat-Grid mit „aktuell → nachher"-Vorschau, Attack Rate als
  **negativer** Prozentwert, Merge-Hinweiszeile, Material-Block, funktionaler Upgrade-Button),
  **Forge** (Required-Cards-Panel, „Alle verschmelzen", Bonus-Wahl-Dialog, Zeremonie-FX) und
  **Packs** (verdeckter Stapel, Glühen vor dem Flip, Burst ab Episch, Zusammenfassung).
  **Dient als Vorlage für den Einbau in `deck.html`** — Markup, CSS und Event-Logik sind
  durchgetestet, es fehlen nur die echten Turm-Assets.
- **`arena_patches/DESIGN_PROGRESSION.md`** — Design-Spezifikation v2: Leiter, Cap-Begründung,
  Gold-Plateaus, Stat-Kurve, **Pyramiden-Ökonomie** (243 Gewöhnlich-Kopien = 1 Suprem) mit
  Zeitschätzungen für Pool 8/20/40, Merge-Bonus-Registry, Pack-Tabellen, Pity, Zeremonie-Spec,
  Migration. Der alte v1-Text steht als **Anhang §Z (ÜBERHOLT)** vollständig erhalten darin.
- **`arena_patches/GAMEPLAY_OPTIMIERUNG.md`** — **neu:** Abgleich der verifizierten
  AA-**Match**-Mechanik gegen unseren Spielstand. Wichtigster Punkt: **AA hat Match-Gold und
  In-Match-Upgrades** — unsere Entfernung vom 19.07. beruhte auf einer falschen Annahme.
  Dazu: Per-Karten-Cooldowns statt „1 Build/Runde", In-Match-Sternstufen (+ Curse-Anbindung),
  fixe Arena-Prämien (Schwellen **600 / 1200 / 1500**, korrigiert), 10 ausformulierte
  Ladebildschirm-Tipps, Clan-Tag, Turm-Grundflächen 1×2 und **§8 arena-gebundene
  Map-Objectives + Curse-Karten-Freischaltung** (Priorität 2).

**⚠ Ersetzt bestehende Systeme:**
1. **`metaMul = 1.12^(lvl-1)` in `arena_pan.html` MUSS raus.** Ersatz:
   `ArenaCards.statMul(cs.lvl, cs.mergeBoni)` (Lv100 ≈ 8.6×). Einzelstat-Boni separat über
   `ArenaCards.modsOf(id)`.
2. **`shardsBank` aus `arena_profile.js` wird ersetzt.** Bei `packAwarded` stattdessen
   `ArenaCards.openPack('bronze', POOL_IDS, HERO_IDS)`; die Pack-Zeremonie ruft pro Flip
   `addDrop()` / `addMaterial()`, das **Gold bucht der Hub**. Bestehende Splitter einmalig
   kulant abgelten: `ArenaCards.addMaterial(shardsBank * 2)`.
3. **Einmal-Migration** beim Hub-Start: `ArenaCards.migrateV1()` — alte v1-Stände behalten ihre
   **Farbe** (grün → Gut, blau → Selten, lila → Episch, orange → Legendär), das Level wird auf
   das Cap der Stufe gekappt, alte `copies` + `dust/10` werden zu **Material**, alte `perks`
   werden zu `mergeBoni`.
4. **Gold liegt bewusst NICHT in diesem Modul** (`state.gold === null`). `levelUp()` zieht nur
   Material ab und **meldet** die Goldkosten zurück; den Abzug macht die Hub-Wallet.

Der WIRING-Block oben in `arena_cards.js` listet alle vier Einbaustellen mit Code.

---

## 7. `arena_fortress.js` — Festungs-Upgrades (dritte Achse)

**⚠ Neu 2026-07-25.** Video 6 hat ein **komplett fehlendes System** aufgedeckt: AA hat ein
eigenes Bottom-Nav-Tab **„Upgrade"**, das die Festung des Spielers dauerhaft aufwertet —
getrennt von den Turmkarten (`AA_UI_REFERENZ.md` §9.9 / §12.6).

**Was es tut:** Drei Gold-Tracks à **100 Stufen** — `hp` (Burg-HP), `prismDmg`
(Prisma-Schaden), `prismRate` (Prisma-Tempo). **Ein gemeinsamer Kostenzähler über alle
Tracks** (`6000 + 1000 × gekaufte Gesamtstufen` → 6 000 · 7 000 · … · 305 000, Summe
**46 650 000 Gold** für alle 300 Stufen), abnehmender Grenznutzen (Bonus × 0.977 je Stufe),
Gates über **Trophäen** — 15 Tore à 20 Stufen, verteilt über die volle Leiter aus
`AA_UI_REFERENZ.md` §15: 0 · 300 · 600 · 900 · 1200 · 1500 · 2000 · 2500 · 2900 · 3500 ·
4500 · 5000 · 6000 · 7000 · 9000 🏆.
Voll ausgebaut: `hpMul 3.354` / `prismDmgMul 4.139` / `prismRateMul 2.962`,
Gesamt-Power **320 100** (`powerSum(300)`).

> **⚠ KALIBRIERT NACH VIDEO 9** (`AA_UI_REFERENZ.md` §16). Die frühere Fassung lief bis
> Stufe 12 je Track (36 gesamt, 846 000 Gold) — das war der Stand vor dem Burg-Video. Neu
> belegt: AA hat **genau drei** Tracks, die Kostengerade `6000 + 1000 × Stufe` hält über den
> ganzen Bereich, und **„Power +N" wächst** mit der Stufe (`powerAt(n) = 170 + 6 × (n−1)`,
> AA-gelesen +418 … +840) während der prozentuale Bonus fällt. AA gatet über das
> **Account-Level** („Level Too Low"); wir bleiben bei Trophäen, weil der Prototyp kein
> Account-Level führt (§16.4).

**Einbau (arena_pan.html):**
1. Script einbinden.
2. Bei Match-Start die drei Multiplikatoren ziehen:
   ```js
   const fm = ArenaFortress.totalMultipliers();
   const CASTLE_MAX = Math.round(15000 * fm.hpMul);
   castleHP = CASTLE_MAX;
   const PRISM_DMG_EFF = PRISM_DMG * fm.prismDmgMul;
   const PRISM_CD_EFF  = PRISM_CD  / fm.prismRateMul;   // Tempo → CD KÜRZER
   ```
3. **⚠ Jede hartverdrahtete `15000`** muss auf `CASTLE_MAX` umgestellt werden — auch die in
   `arena_surrender.js` (`castleHP = Math.min(15000, …)` in der Boss-Heilung), sonst heilt die
   Comeback-Mechanik auf den alten Deckel und die gekaufte Stufe verpufft.

**Einbau (Hub / deck.html):** neuer Tab **„Festung"** neben Sammlung / Schmiede / Packs, eine
Karte pro Track:
```js
ArenaFortress.TRACKS.forEach(tr => {
  const i = ArenaFortress.trackInfo(tr.key);
  // i.locked  → Button "Ab " + i.lockAt + " 🏆"   (AAs "Level Too Low"-Äquivalent)
  // sonst     → "🪙 " + i.nextCost  und  i.stat + " +" + i.nextPct + " %"
  //             plus "Power +" + ArenaFortress.powerAt(totalStepNo)
});
const r = ArenaFortress.buy('hp', hubGold);   // Gold zieht der HUB ab:
if (r.ok) setHubGold(hubGold - r.cost);
```
Red Dot auf dem Tab: `ArenaFortress.anyAffordable(hubGold)`.

**Gold-Handling identisch zu `arena_cards.js`:** Das Modul kennt **keine Wallet**.
`buy(key, goldAvailable)` prüft nur mit und meldet `cost` zurück; den Abzug macht der Hub.
Persistiert werden ausschließlich die Stufen (`localStorage.arenaFortress`).

**Trophäen-Anbindung:** liest defensiv `ArenaProfile.get().trophies`. Fehlt das Modul, gilt 0
— dann sind genau die ersten 20 freien Stufen kaufbar und nichts wirft eine Exception. Für Tests
und Sonderfälle nehmen `trackInfo(key, trophies)` und `buy(key, gold, trophies)` einen
expliziten Wert, der Vorrang hat.

**Tuning:** `LEVELS_PER_TRACK` (100), `TOTAL_CAP` (300), `COST_BASE` (6000), `COST_STEP`
(1000), `DECAY` (0.977), `POWER_PER_STEP` (170) + `POWER_GROW` (6), die `base`-Werte der drei
Tracks (0.06 / 0.08 / 0.05) und die `GATES`-Schwellen. Zusätzliche API für die UI:
`allTracks(trophiesOverride)`, `bonusAt(key, n)`, `powerAt(n)`, `powerSum(n)`, `nextGate()`.

**Warum es wichtig ist:** `DESIGN_PROGRESSION.md` dokumentiert Gold als Endgame-Bottleneck
(eine Karte Lv1→100 = 3.4 Mio Gold ≈ 600 Tage). Die Festung ist die **zweite sinnvolle
Gold-Senke** — planbar, abgeschlossen und in **jedem** Match wirksam. Details und Begründung:
`DESIGN_PROGRESSION.md` §B „Festungs-Upgrades (die DRITTE Achse)".

**Offene Entscheidungen:** (a) Soll `prismRate` auch die Ult-Ladung beschleunigen oder nur die
Laser-Abklingzeit? (b) Braucht die Festung eine **vierte** Spur (z. B. Start-Handkarten +1),
oder verwässert das die drei klaren Achsen? (c) Soll ein Respec möglich sein — bei einem
gemeinsamen Kostenzähler ist eine Rückerstattung nicht trivial (welche Stufe war die teure?).

---

## Reihenfolge & Aufwand

> **✅ Bestätigte Ausbaustufe (User, 2026-07-25) — diese 3 Systeme werden eingebaut:**
> 1. **Gold als Siegprämie (Meta-Gold):** Nach dem Match fließt eine **fixe, arenagebundene**
>    Gold-Prämie ins Hub-Wallet (Tabelle in `GAMEPLAY_OPTIMIERUNG.md` §4; AA-Anker: 610 Gold).
>    In `resolveEnd()` zusammen mit den Trophäen gutschreiben. Das Gold bezahlt im Hub die
>    Karten-Level-Ups (`goldFor(lvl)` + Material).
> 2. **Kartensystem v2 + Booster-Packs** (`arena_cards.js` + UI aus `ui_prototype.html`).
> 3. **Trophäen/Rang/Streak + Rivalen** (`arena_profile.js` + `arena_rivals.js`).
>
> **⛔ Ausdrücklich NICHT gewünscht:** In-Match-Gold. In der Arena kosten Türme, Upgrades und
> Refresh **kein Gold** — `GAMEPLAY_OPTIMIERUNG.md` §1 ist entschieden abgelehnt (Referenz
> bleibt dokumentiert). Das Match bleibt ökonomie-frei; Gold existiert nur als Belohnung/Meta.
>
> **📼 Nachgeführt 2026-07-25 nach Video 6** (`AA_UI_REFERENZ.md` §12) — vier Punkte, die die
> bestätigten Systeme betreffen:
> * **Material-Sorten statt generischem Material.** AA führt ≥8 Materialsorten, nicht eine
>   gemeinsame Ressource (§12.3). Zuerst mit **drei** Sorten umgesetzt (State v3).
>   **⚠ Am 29.07.2026 korrigiert:** die damals gelesenen „Kategorie-Labels speed/special"
>   gehören zu **gesperrten Türmen** im Abschnitt TO BE FOUND, nicht zum Material — und jedes
>   Material-Icon im RESOURCES-Raster ist eine **Turm-Miniatur** (Catapult-Detail „78/15" ↔
>   Raster „x78"). Material und Karte sind 1:1. Seither: **eine Essenz je Karte**, Schlüssel
>   == Karten-ID, **State v4**. Siehe DESIGN_PROGRESSION.md §B „⚠ KORREKTUR 2".
> * **Pity-Counter wird OFFEN angezeigt.** AA schreibt ihn direkt auf die Truhe („Get Legendary
>   in ~50 opens", §8.2) und verzichtet dafür ganz auf Prozent-Drop-Raten. Unsere frühere
>   Entscheidung „Stand verstecken" ist damit revidiert — `getPityStatus()` + Pity-Zeile im
>   Pack-Screen.
> * **Top-Bar-Reihenfolge war vertauscht.** Richtig ist **🏆 Trophäen | 💎 Gems | 🪙 Gold**
>   (§12.1, belegt über „Your Trophies: 425" und Icon-Farbmessung). Im UI-Prototyp korrigiert;
>   beim Einbau in den Hub darauf achten. Nebenwirkung: Die Trophäenzahlen der Spielerschaft
>   liegen **~Faktor 7 niedriger** als angenommen (Leaderboard-Spitze ~6500, nicht ~40 000) —
>   alle Arena-Schwellen in `GAMEPLAY_OPTIMIERUNG.md` §4 sind entsprechend korrigiert.
> * **Dritte Progressions-Achse ergänzt:** `arena_fortress.js` (§7 dieses Dokuments) — in der
>   ersten Fassung fehlte das System vollständig (§12.6).

Empfohlen, weil jedes Modul auf dem Verständnis des vorherigen aufbaut und `arena_profile.js`
die Datenbasis für `arena_rivals.js` liefert:

| # | Modul | Warum hier | Aufwand |
|---|-------|-----------|---------|
| 1 | `arena_profile.js` | Kleinster Eingriff (2 Stellen in `resolveEnd()`), sofort sichtbarer Wert, liefert `trophies` für Rivals | ~20–30 min |
| 2 | `arena_rivals.js` | 2 Dateien (vs.html + arena_pan.html), braucht Profil-Trophäen; `driftFactor` will einmal getestet werden | ~40–60 min |
| 3 | `arena_pity.js` | Braucht das echte `drawCard()`-Kartenliteral → erst Code lesen, dann anpassen | ~30–40 min |
| 4 | `arena_surrender.js` | Unabhängig, zwei getrennte Hooks (Button + Boss-Kill) | ~25–35 min |
| 5 | `arena_tutorial.js` | Am invasivsten (Pause-Logik im Game-Loop), am besten mit frischem Kopf | ~40–60 min |
| 6 | **`arena_cards.js` (v2, State v3)** + `migrateV1()` + Pack-Vergabe | Eigenes Arbeitspaket; siehe die 9-Schritt-Reihenfolge in `DESIGN_PROGRESSION.md` §F | ~10–13 h |
| 7 | **UI aus `ui_prototype.html`** nach `deck.html` überführen (Collection / Detail / Forge / Packs) | Teil von #6, aber getrennt planbar — die Vorlage ist fertig und getestet | (in #6 enthalten) |
| 8 | **`arena_fortress.js`** + Festungs-Tab im Hub | **Nach dem Kartensystem**: braucht ein Spiel, in dem Meta-Gold fließt (#6, Schritt 3) und Trophäen laufen (#1) — sonst sind alle Stufen entweder unbezahlbar oder gesperrt. Danach der kleinste Eingriff mit dem größten Ökonomie-Effekt | ~2–2.5 h |

**Gesamt Module 1–5: ca. 2.5–4 Stunden** inklusive Testen. Nach jedem Modul einzeln testen und
committen — nicht alle fünf auf einmal einbauen. Die Karten-Progression (#6/#7) ist ein eigenes
Projekt und sollte **nach** den fünf Match-Modulen kommen: Sie braucht ein Spiel, das schon
Trophäen und Packs vergibt. Die **Festung (#8)** kommt zuletzt: Sie ist von #6 nur über die
Gold-Wallet abhängig, aber ohne Gold-Einkommen und ohne Trophäenstand hat sie nichts zu tun.

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

**arena_cards.js (v2, State v3)**
- `node arena_patches/arena_cards.js` → **ALLE TESTS OK** (Material-Sorten, Leiter/Kurven,
  10 000 Bronze-Packs, Garantien aller vier Pack-Typen, Pity + `getPityStatus()`,
  Merge-Pyramide, Cap-Gating, Migration v1→v2→v3).
- `localStorage.arenaCards` hat nach dem ersten Pack `v: 3`,
  `materials: {attack, speed, special}` (**kein** Zahlenfeld `material` mehr), `gold === null`
  und pro Karte `{tier, lvl, copies:{common…supreme}, mergeBoni, pendingBoni}`.
- **Essenzen (v4):** `ArenaCards.materialTypeOf('fire') === 'fire'` — der Sortenschlüssel IST
  die Karten-ID; `MATERIAL_KEYS` deckt sich exakt mit der Kartenliste; unbekannte ID → `null`
  (kein stiller Ersatz mehr).
- **Sorten-Verbrauch:** Level-Up an FROST senkt **nur** `materials.water`;
  `canLevelUp('fire')` meldet `reason: 'material'`, solange nur Frost-Essenz im Vorrat liegt —
  auch bei 999 Stück davon.
- **Pack-Material:** `openPack().materialSlots` ist `[{type, amount, name, sym}]`, Summe der
  `amount` == `material`; die Zeremonie ruft pro Flip `addMaterial(amount, type)`.
- **Offener Pity:** `ArenaCards.getPityStatus()` → bei frischem Zähler `{epicIn: 26,
  legendaryIn: 76}`, zählt mit jedem Pack ohne Treffer runter, springt beim Treffer zurück.
- **Migration v2→v3:** alter Stand mit `material: 100` → `materials {34, 33, 33}`; Karten,
  Level, Kopien, Boni und Pity-Zähler unverändert; zweiter Aufruf `{skipped: true}`.
- **Cap-Gating:** Karte auf Gewöhnlich hochleveln → stoppt bei **Lv25**,
  `ArenaCards.canLevelUp(id).reason === 'cap'`; nach `merge(id,'common')` geht es bis **Lv40**.
- **Merge-Pyramide:** `addDrop(id,'common',243)` + `mergeAll(id)` → 121 Merges, Endstufe
  **Suprem**, keine Restkopien darunter.
- **Level-Up zieht Material, keine Kopien:** `copies` unverändert, `material` −(3+tierIndex),
  `goldCost` wird nur gemeldet.
- **Suprem droppt nie** aus Packs; jedes Bronze-Pack enthält ≥1 Gut-Karte.

**arena_fortress.js**
- `node arena_patches/arena_fortress.js` → **ALLE TESTS OK** (Bonus-Kurve, Kostenreihe,
  gemeinsamer Zähler, Gold-Schranke, Trophäen-Gates, Caps, Persistenz-Robustheit).
- **Kostenreihe:** `ArenaFortress.costAt(0..35)` → **6 000 · 7 000 · 8 000 · … · 41 000**;
  `totalCost() === 846000`. AAs beobachtete 17 000 liegen exakt auf Stufe 12.
- **Gemeinsamer Zähler:** `buy('hp')` → 6 000, dann `buy('prismDmg')` → **7 000** (obwohl
  anderer Track!), dann 8 000. Die Reihenfolge ist damit eine Entscheidung.
- **Gate:** bei 0 🏆 sind genau **6** Stufen kaufbar, danach `trackInfo(k).locked === true` mit
  `lockAt: 600` und `buy(...).reason === 'locked'`. Ab 600 🏆 geht es bis Stufe 12, dann 1200,
  dann 1500.
- **Diminishing:** `bonusAt('hp', 1..12)` fällt streng monoton 6.0 → 2.7 %, Quotient exakt
  0.93. Voll ausgebaut: `hpMul 1.498` / `prismDmgMul 1.664` / `prismRateMul 1.415`, Power 6 120.
- **Ohne Käufe sind alle Multiplikatoren exakt `1.0`** — das Modul darf die Balance nicht
  stillschweigend verschieben, solange nichts gekauft ist.
- Ohne geladenes `ArenaProfile`: keine Exception, `trophies === 0`.

**ui_prototype.html**
- Datei im Browser öffnen (kein Server nötig; `arena_cards.js` muss **daneben** liegen).
- Beim ersten Start wird ein Demo-Zustand geseedet: EMBER Lv18/Gut **mergebar**, THORN Lv12
  mergebar, STONE Lv25 **am Cap**, Material **26 ⚔️ / 21 ⚡ / 17 ✨**, **12 500 Gold**
  (bewusst knapp: DAWN Lv44 kostet 18 000 und ist damit sichtbar unbezahlbar — der
  dokumentierte Gold-Bottleneck). Top-Bar: 1136 🏆 / 245 💎 / 12 500 🪙.
  Reset-Knopf unten in der Sammlung.
- Durchklicken: Sammlung (**Essenz-Summe** in der Leiste, Tipp klappt das Fach mit allen acht
  Beständen auf) → Karte antippen → Detail zeigt die **eigene Essenz des Turms**
  („🔥 Ember-Essenz 21 / 5") und woher sie kommt → **Upgrade** (Level/Power/Gold ändern sich
  live, es sinkt **nur** die Essenz dieser Karte) → Sortierung auf **„Nach Rarität"** umstellen (Raster ordnet sich um) →
  Schmiede → 3 identische Karten antippen → **VERSCHMELZEN** → Bonus wählen (Rahmenfarbe
  wechselt) → Packs (**Pity-Zeile** „Episch garantiert in ≤N Packs · Legendär in ≤M" unter dem
  Öffnen-Button) → **Bronze-Pack öffnen** → einzeln flippen (Material-Slots zeigen ihre Sorte)
  → „Alle aufdecken" → Zusammenfassung mit Material nach Sorte → Pity-Zeile hat sich um 1
  verringert → zurück zur Sammlung (Red-Dot-Zähler und Material-Leiste aktualisiert).
- **Konsole muss leer bleiben** — automatisiert geprüft mit einem Playwright-Skript
  (**37 Schritte**, Screenshots je View, **0 JS-Fehler**).

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

---

## UI-Assets & Home-View (Stand 2026-07-25)

### Was neu dazugekommen ist

| Datei | Inhalt |
|---|---|
| `arena_patches/ui_assets.json` | **Manifest aller 25 Meta-UI-Assets** — Key → `{url, job, type, beschreibung}`. Stil „Edel & Kristallin", erzeugt mit `nano_banana_pro` und dem Style-Sheet `22646ce4-…` als Bild-Referenz. |
| `arena_patches/ui_prototype.html` | Neue **fünfte Ansicht „HOME"** (Status-Arenen), **Asset-Ebene** über allen Buttons/Panels/Rahmen/Bändern, **Gold-Gradient-Text-Ebene** (`.goldtext`), Merge-Vorschau + Merge-Zeremonie. |
| `arena_patches/AA_UI_REFERENZ.md` | §4.4 (Merge-Ablauf), §9.5b (visuelle Inszenierung der Arenen), **§13** (alle Video-7-Befunde und -Korrekturen). |

### Die zwei Regeln, an denen alles hängt

**1. Assets sind TEXT-FREI. Beschriftung ist immer HTML.**
Alle 25 Assets wurden bewusst ohne Buchstaben generiert und danach per Tesseract-OCR
gegengeprüft (Ergebnis: sauber). Jede Beschriftung liegt als deutscher String im Markup
und bekommt die Klasse `.goldtext` (Serif-Kapitälchen + Gold-Verlauf via
`background-clip:text`). **Lokalisierung tauscht damit nur Strings, nie eine Grafik.**
Beim Übernehmen ins Spiel: diese Trennung nicht aufweichen — sobald ein Wort im PNG
landet, ist die Sprachumschaltung tot.

**2. Jedes Asset hat einen Fallback.**
Technik: Mehrfach-Hintergrund. Die Asset-URL steht als **erster**
`background-image`-Layer, der bisherige CSS-Gradient als **letzter**:

```css
background-image: url("…/asset.png"), linear-gradient(180deg,#243342,#141d26);
```

Lädt das Bild nicht (offline, `file://`, Proxy, CDN weg), bleibt der Gradient sichtbar
und die UI funktioniert unverändert. Im Prototyp macht das die Hilfsfunktion `layer()`.
Der Playwright-Lauf verifiziert genau das: 82 Bild-Ladefehler, **0 JS-Fehler**,
alle 25 Prüfschritte grün.

### Assets vom CDN nach `public/assets/` holen (für die Mac-Session)

Die URLs zeigen aufs Higgsfield-CDN. Für die echte App die Dateien einmal lokal ziehen:

```bash
cd public && mkdir -p assets && \
python3 -c "
import json
d=json.load(open('../arena_patches/ui_assets.json'))
for k,v in d.items():
    if k.startswith('_'): continue
    print(k, v['url'])
" | while read key url; do
  curl -sfL -o "assets/$key.png" "$url" && echo "ok   $key" || echo "FAIL $key"
done
```

Danach im Prototyp bzw. im Spiel nur noch die Basis umstellen:

```js
// ui_prototype.html, Abschnitt ASSET-MANIFEST
var CDN = "./assets/";              // statt der cloudfront-URL
// und die Dateinamen auf "<key>.png" kürzen
```

**Wichtig:** Die CDN-URLs sind nicht dauerhaft garantiert. Der Download sollte vor dem
ersten Release passieren, damit das Spiel nicht von fremder Infrastruktur abhängt.

### Schrift-Empfehlung fürs echte Spiel

`.goldtext` fällt derzeit auf `Georgia / Times New Roman` zurück. Fürs Spiel:

* **Cinzel** (Google Fonts, OFL) — römische Kapitälchen, trifft die Anmutung des
  Style-Sheets fast exakt, gibt es in 400/600/700/900.
* Einbindung als **selbst gehostete WOFF2** (nicht per Google-CDN — dasselbe
  Abhängigkeitsargument wie oben), `font-display: swap`, nur die Latin-Subsets.
* Für Zahlen (Gold, Level, Trophäen) besser bei einer **tabellarischen Sans** bleiben —
  Kapitälchen-Ziffern springen beim Hochzählen. Empfehlung: Systemschrift mit
  `font-variant-numeric: tabular-nums`.
* Fallback-Kette dann:
  `font-family: Cinzel, Georgia, "Times New Roman", serif;`

### Arena-Definitionen

`ARENA_TIERS` steht als `const` in `ui_prototype.html` (und gespiegelt in
`ui_assets.json`):

| # | Name | ab 🏆 | AA-Vorbild |
|---|---|---|---|
| 1 | Kristallhof | 0 | *Waterfall Vale* |
| 2 | Smaragdtal | 300 | *Dustfall Temple* |
| 3 | Saphirfeste | 600 | *Sunken Atlantis* |
| 4 | Sturmspitze | 900 | *Dock Drop* |
| 5 | Obsidian-Thron | 1 200 | *Aztec Grounds* |
| 6 | Prisma-Zitadelle | 1 500 | *Inferno Pit* |
| 7 | Aschenmark | 2 000 | *Storm Shroom* |
| 8 | Frostbastion | 2 500 | *Ice Brawl* |

Darüber liegt die **`LEAGUE_GATES`-Liga** („Prisma-Liga", AAs *Champions Peak*) mit zehn
Stufen — Tore statt Arenen, eigene dunkle Ribbon-Optik, **keine** Freischaltungen:

| Tor | Name | ab 🏆 | | Tor | Name | ab 🏆 |
|---|---|---|---|---|---|---|
| 1 | Eingangstor | 2 900 | | 6 | Goldweite | 6 000 |
| 2 | Steintor | 3 500 | | 7 | Kristallpfad | 7 000 |
| 3 | Eisenpfad | 4 000 | | 8 | Flammentor | 8 000 |
| 4 | Bronzewacht | 4 500 | | 9 | Sturmkrone | 9 000 |
| 5 | Silberhalt | 5 000 | | — | **Prisma-Krone** (`summit`) | **9 800** |

Die Schwellen sind **AAs echte Leiter**, seit Video 8 vollständig belegt (AA-Referenz
§15.1/§15.2): unten glatte 300er-Schritte, ab Arena 6 auf 500 gedehnt, die Liga auf runden
Tausendern. Die Knotenkadenz folgt `stepAt(t)` — **50 🏆 bis 1 500, dann 100, ab 5 000 dann
200** (§15.4). **Die Arenen sind reine Status-Optik** — die Match-Welt wird in Arcane Prism TD pro Spiel zufällig gewählt.
Deshalb steht auf dem Home-Screen „Zufallswelt" statt AAs „Neutral". Wer die Schwellen
verschiebt, muss nur `ARENA_TIERS` anfassen; Fortschrittsbalken, Leiter und der
„noch N 🏆 bis …"-Text rechnen sich daraus.

### Trophäenstraße (neu, `#roadLayer` in `ui_prototype.html`)

AAs BATTLE-Button öffnet **nicht** direkt das Matchmaking, sondern zuerst die
**Trophäenstraße** — einen Vollbild-Layer, der von unten nach oben durch alle Arenen
führt (AA-Referenz **§14.4**, Quelle: vier User-Screenshots). Im Prototyp nachgebaut:

* **Öffnen:** KAMPF-Button oder das Belohnungs-Icon am Trophäen-Balken.
  **Schließen:** unten fixierter `Okay`-Button.
* **Scroll:** startet am unteren Ende (Arena 1, 0 🏆) und springt dann automatisch auf den
  ersten noch nicht abgeholten Knoten — der Spieler landet immer bei sich selbst.
* **Knoten** alle 50 🏆 in drei Zuständen: abgeholt (✅, gedimmt) · nächster (Glow-Puls) ·
  gesperrt (🔒, dunkel). Belohnungen: alle 250 🏆 ein Silber-Pack, sonst im Wechsel
  Gold / Arkan-Essenz / Bronze-Pack.
* **Arena-Sektionen** an den Schwellen: Diorama-Karte, „Zufallswelt"-Chip, Name,
  magenta Ribbon `Arena N · 🏆 Schwelle`, „Schaltet frei:"-Raster mit Element-Gems und
  Map-Ziel-/Trick-Karten-Banner mit `(i)`-Button.

**Beim Einbau ins Spiel:** `DEMO_TROPHIES` durch `ArenaProfile.trophies()` ersetzen und die
Knoten-Abholung persistieren (ein `Set` abgeholter Schwellen genügt) — die Zustandslogik
hängt an genau einer Funktion, `nextNodeTrophies()`. Die Straße braucht **keine neuen
Bilder**: sie nutzt die 25 Assets aus `ui_assets.json` plus CSS-Fallbacks.

**Ebenfalls neu auf dem Home-Screen** (AA-Referenz §14.3): die **4 Truhen-/Pack-Slots** in
Hex-Rahmen (Demo 2 Bronze + 2 leer, Klick → Pack-Ansicht; im Spiel an `ArenaProfile` /
`packAwarded` andocken) und das **Belohnungs-Icon** am rechten Ende des Trophäen-Balkens.

**Und eine Korrektur der Optik** (§14.2): Arenen sind **schwebende Insel-Dioramen** auf
dunklem Grund, **kein** vollflächiger Hintergrund. Unsere Querformat-Key-Art wird deshalb
als gerundete, schwebende Karte mit Glow und Schlagschatten gezeigt (`.diorama`).

---

## Asset-Batch 2, Interaktions-Schicht, Shop, Festung (Stand 2026-07-25, Runde 3-6)

### Asset-Batch 2 — 52 weitere Assets

`ui_assets.json` enthält jetzt **77 Assets** (Batch 1 = 25, Batch 2 = 52), jedes mit
`{url, job, type, batch, beschreibung}`. Neu in Batch 2:

| Gruppe | Anzahl | Inhalt |
|---|---|---|
| A — Währungen/Ressourcen | 7 | Trophäe, Gem, Goldmünze, Angriffs-/Tempo-/Spezial-Essenz, XP-Stern |
| B — Nav/Hub-Icons | 13 | Start, Sammlung, Turm, Schmiede, Packs + Pass, Post, Klan, Events, Herausforderungen, Shop, Rangliste, Einstellungen |
| C — Straßen-Elemente | 8 | Knoten-Podest (Kristallsockel), 4 Deko-Props, Hex-Slot-Rahmen, Arena-Wappen, Bronzetruhe |
| D — Teaser-Artworks | 12 | 6 Map-Ziele + 6 Trick-Karten |
| E — Leiter/Liga | 4 | Arena 7 + 8 Dioramen, Liga-Tor-Emblem, Spitzen-Emblem |
| F — Kleinteile | 4 | Info-„i", Schloss, Häkchen-Siegel, Funken-Burst |
| Festung | 4 | Burg-Basis-Artwork + 3 **große** Track-Embleme (Ast-Köpfe) |

**Credits:** Batch 1 = 50, Batch 2 = 104 → **154 Credits, 0 Retakes**. Der Deckel von 200
Credits für Batch 2 wurde nicht ausgeschöpft. Alle Assets sind per Tesseract-OCR als
**textfrei** verifiziert. Download-Anleitung: dieselbe `curl`-Schleife wie bei Batch 1
(Abschnitt „Assets vom CDN nach `public/assets/` holen") — sie liest `ui_assets.json`
und zieht daher Batch 2 automatisch mit.

### Icons statt Emojis — mit Emoji als Fallback

Emojis sind **nur noch Notnagel**. Jedes Icon im Markup ist:

```html
<img class="ico" src="<CDN-URL>" alt="🏆" onerror="UIIcon.fail(this)">
```

`UIIcon.fail()` ersetzt das `<img>` durch ein `<span>` mit dem Emoji aus `alt` — schlägt
das CDN fehl, bleibt die UI vollständig lesbar. Im Markup steht dafür die Kurzform
`<i data-ico="cur_gold" data-emoji="🪙"></i>`, die `hydrateIcons(root)` nach jedem Render
auflöst. `.ico` trägt `mix-blend-mode: screen`, damit sich der dunkle #0e1418-Grund der
Assets auf dunkler UI von selbst auflöst — **kein Freistellen nötig**.

### Interaktions-Schicht — EINE Stelle für alles Klickbare

Vier zusammenhängende Bausteine, absichtlich mit den Namen, die die Spiel-Engine schon
verwendet, damit der Einbau am Mac **nur Umhängen** ist:

| Baustein | API | Aufgabe |
|---|---|---|
| `.pressable` | `markPressable(root)` | setzt die Klasse auf alles Klickbare (`PRESS_SEL`); `:active` → `scale(.96)` + `brightness(.85)`, 90 ms; `[disabled]` → entsättigt, `pointer-events:none` |
| Tap-Funken | `window.UIFx.spark(x, y, n)` | CSS-Partikel-Burst am Klickpunkt in `#fxLayer` — **kein Canvas** |
| Klick-Sounds | `window.UISfx.tap() / confirm() / deny() / reward() / mute() / isMuted()` | kleine WebAudio-Blips, Kontext wird erst beim ersten echten Tap erzeugt (Autoplay-Policy) |
| Rote Punkte | `window.UIBadge.set(navKey, n)` | `navKey` ∈ `collection` \| `shop` \| `pack`; `n = 0` versteckt das Badge |

> **⚠ SFX UMHÄNGEN, NICHT ERSETZEN.** `window.UISfx` hat **absichtlich dieselben
> Funktionsnamen** wie die SFX-Engine des Spiels. Beim Einbau **nicht** die Aufrufe im
> Prototyp umschreiben, sondern `window.UISfx` einmal auf die echte Engine zeigen lassen:
>
> ```js
> window.UISfx = { tap: Sfx.uiTap, confirm: Sfx.uiConfirm,
>                  deny: Sfx.uiDeny, reward: Sfx.uiReward,
>                  mute: Sfx.toggleMute, isMuted: Sfx.isMuted };
> ```
>
> Danach klingt der ganze Meta-UI-Layer wie das restliche Spiel, ohne eine einzige
> Aufrufstelle anzufassen. Dasselbe gilt für `UIFx.spark` (auf die Partikel-Engine) und
> `UIBadge.set` (auf das echte Badge-System).

Ein Pointer-Handler auf `document` erledigt Pressed-Klasse, Funken und Tap-Sound
**delegiert** — neue Buttons brauchen nur `.pressable` bzw. einen Lauf durch
`markPressable()`, keine eigenen Listener.

### Neue Views: Shop und Festung, neue Nav-Reihenfolge

**Bottom-Nav in AAs Reihenfolge** (§15.5): **Shop | Sammlung | START | Festung | Packs**
— START mittig und größer. Die **Schmiede hat keinen eigenen Nav-Knopf mehr**, sie hängt
am Forge-Button der Sammlung (`#btnToForge`). Konsequenz für den Code: `NAV_IDS` enthält
weiterhin `navTower`/`navForge`, deren `$()`-Lookups sind aber **überall null-geprüft**.

**Shop** (`#viewShop`, nach AA §8, aber ohne Echtgeld): 6 Tagesangebote mit
Stückzahl-Countdown und statischem Refresh-Timer, 4 Packs (Bronze für Gold, Silber/Gold/
Arkan für Gems) plus **1 Gratis-Tagespack** mit Badge, jedes mit Garantietext und
**offenem Pity-Stand**. Käufe laufen gegen die Demo-Wallet und `ArenaCards`; ein
Pack-Kauf öffnet direkt die Pack-Ansicht (`openPackKey`).

### AAA-Icon-Sweep (Batch 6, 39 Assets) — Konzept „Option A"

**Bottom-Nav neu geordnet** (User-Vorgabe): **Shop | Sammlung | START | Clan | Burg**.
Alle fünf Tabs tragen `.navpop`-Illustrationen (`nav_shop`, `nav_cards`, `nav_start`,
`nav_clan` — **V2**, nicht `nav_clan_v1`, `nav_fortress`), die oben aus der Leiste
herausragen (`overflow:visible` + negativer `margin-top`); die Mitte ist mit 60 px die
größte. Nav bleibt `position:fixed`, Badges bleiben.

> **Wo sind die Packs hin?** Die Packs hatten den fünften Nav-Platz und sind in die
> Icon-Leiste der Profilzeile gewandert (`#icoPack`, `ic_gift`). Begründung: Der Clan wird
> **täglich** angefasst (Spenden, Quests, Krieg) und braucht deshalb den Dauerplatz. Das
> Pack-Öffnen ist dagegen **ereignisgetrieben** — nach einem Sieg, aus einer Truhe, aus dem
> Shop — und wird von diesen Stellen ohnehin direkt angesprungen (`show("navPack")`).

**Produktkarten im Shop** (`prodCard()`): AA codiert seine Store-Kacheln über die
**Rahmenfarbe** (IMG_3306-3308). Übernommen mit unseren Rahmen:
`frame_card_orange` = Gems · `frame_card_green` = Gold · `frame_card_light` = Angebote/Material.
Die Rahmen-PNGs haben eine **leere Mitte**, deshalb drei Ebenen: `.pcart` (Produktbild,
z 0) · `.pcfrm` (Rahmen, absolut, z 2) · `.pcbody` (Text + Knopf, z 3). Das Produktbild ist
ein **Flex-Item**, kein absolutes Element — sonst überlappt es den Text. Gem- und
Gold-Produktbilder sind **Eskalationsketten** (`shop_gem_t1…t6`, `shop_gold_t1…t4`):
das Bild erzählt die Menge, nicht die Zahl.

**Sektions-Ribbons**: alle Shop-Sektionen tragen `ribbon_section_lg` (`.secribbon`).
Das Ribbon ist **hell-silber** — `.goldtext` ist dort **verboten**, der Titel hat dunkle
Füllfarbe. Timer/Pity-Stand hängen rechts außen (`.srx`), nicht auf dem Band.

**Gem-Identität smaragdgrün** (`--gemc: #2fd47a`), bewusste Abgrenzung von AA: Währungs-Icon,
Zahl und Rand der Top-Bar-Pille, alle Gem-Preise, der Gems-Tint und der Kristalltresor.
**Gold bleibt gold** — sonst kollidieren die beiden Währungen.

**Utility-Icons**: `ic_calendar` · `ic_gift` · `ic_rank` · `ic_mail` · `ic_gear` (Profilzeile),
`ic_tent` (Events), `ic_compass` (Guide), `ic_helm` (Helden), `ic_quest` / `ic_war` (Quests
und Clankrieg), `ic_hourglass` (Countdowns), `ic_plus` (Plus-Knöpfe der Währungspillen).

> **`UIIcon.sweep()` — neu und wichtig.** Alle Bilder laufen über
> `<img … onerror="UIIcon.fail(this)">`. Bei hängenden Verbindungen kommt `onerror`
> aber **gar nicht** (Request läuft ins Timeout) und es stünde dauerhaft ein **leeres
> Bildfeld** im Layout. `UIIcon.sweep()` tauscht alles mit `naturalWidth === 0` gegen sein
> Emoji; es läuft bei 1,2 s und 3 s nach dem Boot und nach jedem Nachrendern
> (`sweepSoon()`). Ein `new Image()`-Probe wäre hier **falsch**: Die Instanz wird von nichts
> gehalten und kann vor dem error-Event eingesammelt werden — genau das ist im ersten
> Durchgang passiert und hat alle Produktbilder leer gelassen.

**Shop** (`#viewShop`): Sektionsreihenfolge **1:1 nach AA §8.1** — Promo-Banner ·
Arena-/Starter-Pack · Tagesangebote · Booster-Packs · Kristalltresor (AAs Roulette-Platz) ·
Gem-Pakete · Gold-Tausch. Jede Sektion trägt `data-sec="1…7"`, die v7-Suite prüft die
DOM-Reihenfolge als Zahlenkette. Neu sind `#arenaPackBox` (Echtgeld-Bundles mit Icon-Reihe
und „value"-Badge), `#gemShop` (5 Staffeln, Siegel „Beliebt!" / „Bester Wert!") und
`#goldShop` (Gems → Gold, plus ein werbefreies Tages-Gratispaket). **Echtgeld ist ein
Platzhalter** — nur der Gold-Tausch bucht echt. Annahmen und Referenzlücken stehen in
`AA_UI_REFERENZ.md` §19.5.

**Season-Pass** (`#viewPass`): Reihenfolge nach §9.10 (Keyart-Header → Stufen-/XP-Leiste →
Kauf-/Aktiv-Status → Spurenliste); Keyart auf der neuen Metrik-Höhe `--keyart-h` (172 px,
§19.4), die Farb-Reihen des Farb-Passes auf `--banner-h-sm` / `--radius-sm` / `--gap`.
Offen: AA hat drei Pass-Stufen, wir haben zwei Spuren — das ist eine Daten-Erweiterung im
Pass-Modul, siehe §19.5.

**Festung** (`#viewFortress`): **ZWEI umschaltbare Layouts** — siehe nächste zwei Abschnitte.

### Festung: zwei Layouts, ein Datensatz

Der View trägt oben rechts einen Segment-Umschalter (`[data-fortlay]`):

| Segment | Layout | Aufbau |
|---|---|---|
| **Konstellation** (Standard) | Variante 1, „1+3 kombiniert" | lebende Burg + drei kompakte Upgrade-Zeilen |
| **Banner** | Variante 2, „Banner-Stapel" | drei Banner über die volle Breite, Burg als abgedunkelter Parallax dahinter |

* Die Wahl liegt in **`localStorage["arenaFortLayout"]`** (`"constell"` \| `"banner"`),
  gesetzt über `setFortLayout(key)`. Sie überlebt den Reload.
* Umgeschaltet wird **rein über eine CSS-Klasse** am View (`.lay-banner`); `renderFortress()`
  rendert **beide** Layouts (bei drei Tracks kostenlos) und CSS blendet das inaktive aus —
  deshalb reagiert der Umschalter ohne Nachladen.
* **`arena_fortress.js` ist unberührt.** Beide Layouts lesen dasselbe `allTracks()` und
  kaufen über dieselbe `buyFort()`. Ein drittes Layout wäre wieder nur eine Render-Funktion
  plus ein Segment.

**Variante 2 im Detail** (`renderBanners(tracks)`):

* **links** Track-Emblem (`track_hp`/`track_dmg`/`track_rate`) in einer Hex-Fassung
  (`hex_slot`, CSS-Hexagon als Fallback).
* **mitte** Track-Name (`.tb-name.goldtext` — die Plakette ist dunkles Amethyst-Glas, dort
  ist `goldtext` erlaubt), „Stufe X / 100", eine **Pip-Reihe der aktuellen Zehner-Dekade**
  (9 Pips + Meilenstein-Gem an Position 10, `decadeOf(lvl, maxLvl)`) und darunter der
  nächste Meilenstein-Bonus. Das ist die eigentliche Stärke dieses Layouts: Der nächste
  greifbare Belohnungspunkt ist sichtbar, **ohne 100 Knoten zu rendern**.
* **rechts** Kosten-Button `.tb-buy` (Gold ⇒ **dunkle Schriftfüllung**), bei Trophäen-Tor
  `.tb-buy.gate` mit `icon_lock` + Anforderung.
* **Kauf-Feedback** je Layout: Konstellation → `fireBuyRay()` (Lichtstrahl zur Burg),
  Banner → `fireSparkBurst()` (`fx_spark`-Burst am Knopf) + `.justbought`-Glow auf dem Banner.
* **Parallax**: `#fortBg` (abgedunkelt, `brightness(.45)`) wird von `fortParallax()` beim
  Scrollen um `scrollY × −0.28` verschoben. Gescrollt wird das **Dokument** (`#app` hat nur
  `min-height:100vh`), der Listener hängt deshalb am `window`.

> ⚠ `#fortBg` ist positioniert und lag anfangs **über** dem nicht positionierten Titel und
> dem Umschalter (gleiche Stapelebene, später im DOM). `#viewFortress > h2.title` und
> `.laybar` brauchen deshalb `position:relative; z-index:2`.

**Assets Batch 3** (in `ui_assets.json`, `type: "image"`, `batch: 3`):
`fort_banner_track` (Plakette), `fort_pip_full`, `fort_pip_empty`, `fort_milestone`.
Die Pip-/Meilenstein-Bilder haben dunkle Hintergründe und werden deshalb als runde
(`border-radius:50%`) bzw. hexagonale (`clip-path`) Elemente beschnitten — Pips 19 px,
Meilenstein 30 px. Wie überall liegt das Asset als **erster** Background-Layer, der
CSS-Verlauf dahinter trägt den Offline-Fallback.

### Festung: lebende Burg + Kristall-Konstellation (Variante 1)

Die Mathematik liegt komplett in `arena_fortress.js` (auf **Lv 100 je Track**
kalibriert, AA-Referenz §16.6); die View ist reine Präsentation und liest ausschließlich
`allTracks()`. Drei Bausteine:

* `renderCastle(tracks)` — Overlay-Ebenen über dem Burg-Artwork. Aus `lvl/maxLvl` je Track
  werden Strahlbreite/-höhe/-glow (`#fxBeam`), Schild-Radius (`#fxShield`) und Anzahl der
  Mauer-Kristalle (`#castleFx[data-walls]`) berechnet; `prismRate` steuert die
  `animation-duration` des Strahlpulses.
* `renderConstellation(tracks)` — **seit 30.07.2026 drei kompakte Zeilen statt drei
  Knoten-Äste.** Auftraggeber wörtlich: „ohne die ganzen % Zahlen mach nur immer die
  aktuellen % rein und die die die nächste ist zum Upgraden alles sollte auf eine Seite
  passen nicht ewig zum scrollen." — präzisiert: „jeder Upgrade Schritt soll immer nur den
  aktuellen anzeigen und den nächsten."
  Eine Zeile (`.branch > .branchhead`, gemessen **83 px**) zeigt: Emblem · Name +
  einzeiliger Zweck · `Lv x/100` · ⓘ · **genau zwei Werte: aktueller Wert → Zuwachs der
  nächsten Stufe** · Meilenstein-Angabe (`.bms`, aus `decadeOf()` — dieselbe Rechnung wie
  im Banner-Layout) · rechts `.kbuy` mit Preis bzw. `.kgate` (Trophäen-Tor) / `.kmax`
  (Vollausbau).
  Die **ausgeschriebene Stufenleiter** (`WINDOW_BEFORE = 6`, `WINDOW_AFTER = 14`) ist nicht
  gelöscht, klappt aber **nicht in der Zeile auf** — sie liegt im eigenen Fenster
  `#fortStepsDlg` hinter dem ⓘ (`openFortSteps(key)` / `closeFortSteps()`). Das Fenster
  hängt am `body`, nicht im View: die Views bekommen beim Wischen ein `transform`, und ein
  transformierter Vorfahr macht aus `position:fixed` eine Falle.
  **Gemessen 430x932 / deviceScaleFactor 2:** `#fortTracks` 948 → **264 px**,
  `#viewFortress` 1483 → **885 px**, Dokument 1530 → **932 px**, Scroll-Überhang
  598 → **0 px**. Inhaltsunterkante 744 px, Bottom-Nav ab 863 px. Festgehalten in
  `pruefungen/run_v7.js` („Ganze Festungs-Ansicht passt in eine Bildschirmhöhe").
  **Die Knoten bleiben Daten** — mehr Stufen ändern am Layout nichts.
* `buyFort(key, ev)` → `fireBuyRay(ev)` (Lichtstrahl vom Knopf zur Burg) + `.justbought`
  (Glow-Puls) + `renderFortress()`.

> **Layout weiterhin nicht final — jetzt aber vergleichbar.** Beide Varianten sind live
> umschaltbar, der User kann sie am Gerät gegeneinander halten. Dass das ohne
> Datenänderung ging, ist der Beweis für die Trennung: alles, was eine View braucht, kommt
> aus `ArenaFortress.allTracks()`. Ein Layoutwechsel betrifft nur `renderCastle` /
> `renderConstellation` / `renderBanners`, keine Datenstruktur.

### 🔑 `window.CastleSkins` — die Skin-Architektur (für den späteren Verkauf)

**Die Burg ist nirgends hart verdrahtet.** Jede Stelle, die eine Burg zeigt, fragt die
Registry:

```js
window.CastleSkins.current();   // → { key, name, img, anchors }
window.CastleSkins.list();      // → [{ key, name }, …]
window.CastleSkins.set(key);    // persistiert in localStorage "arenaSkins"
window.CastleSkins.register(s); // neuen Skin anmelden
```

Ein Skin ist **1 Artwork + 1 Anker-Objekt**:

```js
{ key: "prisma", name: "Prisma-Feste (Standard)", img: "<URL>",
  anchors: {
    prismTip: { x: 50, y: 30 },               // Ansatzpunkt des Prisma-Strahls
    shield:   { x: 50, y: 62 },               // Zentrum des Schild-Schimmers
    walls: [ {x:30,y:74}, {x:70,y:74}, … ]    // Ankerpunkte der Kristall-Anbauten
  } }
```

**Alle Anker sind PROZENTWERTE der Bühne (0-100), niemals Pixel.** Genau das macht Skins
billig: Die Upgrade-Optik ist **nicht ins Artwork eingebacken**, sondern liegt als
Overlay-Ebene darüber. Ein neuer Verkaufs-Skin muss deshalb **nicht** in n Ausbaustufen
gemalt werden — er liefert ein Bild plus sechs bis acht Zahlenpaare und funktioniert
sofort mit allen 100 Stufen.

**Regeln für den Einbau:**

1. **Nie** `ASSETS.fort_castle` direkt referenzieren — immer `CastleSkins.current().img`.
   Das gilt auch für Home, Sieg-Screen und jede künftige Burg-Darstellung.
2. Neue Overlay-Effekte **ausschließlich** über Anker positionieren. Braucht ein Effekt
   einen Punkt, den es noch nicht gibt, kommt ein **neuer Anker** ins Schema (und in jeden
   Skin) — kein Pixel-Offset.
3. `set(key)` schreibt nur eine ID; im echten Spiel gehört diese ID ins **Spielerprofil**,
   nicht in den `localStorage`, damit der Skin geräteübergreifend gilt.
4. **MATCH-Skins sind ein anderes Format.** Die Burg im Spielfeld wird gedreht dargestellt
   und braucht daher zusätzlich das **24-Winkel-Sheet** wie `castle_v3`. Meta-Skin
   (1 Artwork + Anker) und Match-Skin (24-Winkel-Sheet) sind getrennte Assets desselben
   Produkts — beim Bepreisen zusammen denken, beim Produzieren getrennt beauftragen.

### Pack-Öffnung: Karten-Drehung + Legendär-Cinematic (§17)

**Der Kern der Anforderung:** Jede Karte liegt verdeckt und wird **einzeln angeklickt** —
kein Auto-Reveal. Der Klick dreht sie um.

* **Echter 3D-Flip.** `.pcard` (Bühne, `perspective:620px`) → `.pc3d`
  (`transform-style:preserve-3d`, dreht auf `rotateY(180deg)`) → zwei `.pcside` mit
  `backface-visibility:hidden`: `.pcback` trägt das Kartenrücken-Asset (`card_back`),
  `.pcfront` das Ergebnis, vorgedreht um 180°. Dauer **600 ms**,
  `cubic-bezier(.34,1.42,.5,1)` für das Überschwingen.
* **Glühen in der Drop-Raritätsfarbe** während der Drehung: `.pcglow` nutzt
  `currentColor`, die Farbe steht als Inline-`color` auf der Karte — ein Wert, zwei
  Effekte (Glühring + Vorderseiten-Rand).
* **Partikel** bei t = 300 ms in der Kartenmitte über `UIFx.spark()`; 8 / 14 / 20 Funken
  je nach Rarität.
* **Ton:** `UISfx.flip()` (Swish + Ding) und für Legendär `UISfx.legend()` (Crescendo).
  Beide gehören zur **selben Namensschnittstelle** wie `tap/confirm/deny/reward` und
  werden beim Einbau **mit umgehängt** — nicht neu verdrahtet.
* **„Alle aufdecken"** bleibt, spielt die Flips aber **sequenziell** (30 ms Versatz) statt
  alle gleichzeitig, damit ein Legendär-Cinematic nicht überfahren wird.

**Legendär-Cinematic** (`#cineLayer`, Asset `cinematic_legendary`, 5 s, 720×1280): läuft ab
`tierIndex ≥ 4` (`LEGEND_FROM`) **vor** der Drehung, danach `.legend`-Nachglühen.

> **⚠ Drei Auswege sind Pflicht, nicht Deko.** `onended` · `onerror`/abgelehntes `play()`
> → CSS-Lichtausbruch (`.fallback`, 1 250 ms) · `setTimeout`-Netz nach 7 s, plus
> „Weiter"-Knopf. Eine Zeremonie, die hängen bleibt, sperrt den Spieler aus seinem eigenen
> Pack aus. Der Fallback-Pfad ist der, der offline läuft — und genau der, den der
> Playwright-Test durchspielt.

**Beim Einbau:** Das Video ist eine **MP4** in `ui_assets.json` — die `curl`-Schleife nach
`public/assets/` darf nicht auf `*.png` filtern. `playsinline muted preload="none"` bleibt
zwingend (Autoplay-Policy). Für Suprem kann später ein zweites Video dazukommen; dafür nur
`LEGEND_FROM` und die Asset-Auswahl in `playCinematic()` anfassen.

### Wo `.goldtext` NICHT hin darf

Stehende Regel nach zwei Bugs: `.goldtext` arbeitet mit `background-clip:text` und
`-webkit-text-fill-color: transparent`. **Auf hellen oder goldenen Flächen ist die
Schrift dadurch unsichtbar.** Für Beschriftungen auf Gold-Buttons stattdessen:

```css
-webkit-text-fill-color: #3a2b07; color: #3a2b07; filter: none;
```

Betroffen waren der „Weiter"-Knopf der Merge-Zeremonie und das „Nach oben"-Label der
Trophäenstraße — beide gefixt. Bei **jeder neuen Beschriftung** vorher prüfen, worauf sie
liegt.

---

## Farb-Pass, Karten-Loops und Audio (Batch 5)

### Farb-Pass — ein System für alle Views

**Befund des Users:** *„nicht so farbenfroh wie AA … sieht alles so leer/tot aus."* Die Ursache
war strukturell, nicht dekorativ: Bis Batch 4 hatte **jede** Reihe denselben dunkelgrauen Körper
(`#1b2732 → #131c25`), farbig war nur der Text. AA macht es umgekehrt — **der Körper trägt die
Farbe, der Text ist weiß.**

Umgesetzt als **eine** Mechanik statt fünfzehn Sonderfällen:

```js
tint(el, "pack_gold");          // setzt --t1/--t2 + Klasse .tinted
tintStyle("fire")               // dieselbe Palette als Inline-String fürs Markup
```

```css
.tinted.tinted{ background-image:linear-gradient(135deg,var(--t1),var(--t2) 62%,#0e1418) }
```

> ⚠ **Die Klasse steht doppelt im Selektor (`.tinted.tinted`) — das ist Absicht.** Alle
> getönten Bausteine (`.dqrow`, `.rwcell`, `.mailrow`, `.shopcard` …) bringen ein eigenes
> `background:` mit und stehen im Stylesheet **weiter unten**; bei gleicher Spezifität gewinnt
> der spätere. Verdoppeln hebt die Spezifität auf 0,2,0 und macht den Farbkörper unabhängig von
> der Reihenfolge. Ohne diesen Kniff blieben genau die Reihen grau, um die es ging.

**Palette (`TINTS`):** Belohnungstypen (gold / attack / speed / special / pack_bronze…arcane /
emote / skin), Elementfarben (fire…darkness), Questfarben (`q_*`), Mail-Typen, Währungen. **Alle
Tints haben Luminanz < 90** — die Playwright-Suite rechnet das nach und prüft zusätzlich, dass
der Text darauf über 170 bleibt.

**Wo es greift:** Season-Pass (Farbfamilie je Belohnungstyp, Premium-Spalte violett,
Meilenstein-Reihen mit Goldrahmen + Schimmer), Clan-Quests, Spenden-Reihen (Elementfarbe der
angefragten Karte), Kriegsboard (grün/rot Teamseiten), Tagesziele, Post, Shop, Events, Helden,
Home-Hub-Kacheln.

**Ambient-Leben:** `ambient(el, n)` streut langsam schwebende Lichtpunkte (nur `transform` und
`opacity`, laufen auf dem Compositor). Dazu `.pulseglow` für Header. **Beides plus die
Video-Loops sind unter `prefers-reduced-motion: reduce` komplett abgeschaltet.**

### Karten-Loops (`attachLoop`)

Acht 720×1280-Videos, eines je Karte. Bewusst **Progressive Enhancement**: `artBox()` rendert
weiterhin zuerst Emoji + Standbild, `attachLoop(box, id)` hängt das Video **nachträglich**
darüber. Drei Fallback-Stufen: Video → `poster` (= Karten-Artwork) → `<img>` → Emoji.

Eingebaut nur dort, wo die Karte **groß** zu sehen ist: Detailkarte, Pack-Reveal (620 ms nach der
Drehung — der Moment, in dem man die Karte zum ersten Mal sieht) und Heldenbühne. **Nicht** in
60-px-Kacheln; acht gleichzeitige Videos in einem Grid sind Batterieverbrauch ohne Nutzen.

Der Season-Pass-Header ist ebenfalls ein Video (`pass_keyart_anim`) mit dem Standbild als
`poster` **und** als CSS-Hintergrund darunter.

### `window.ArenaAudio`

```js
ArenaAudio.music("audio_theme");   // Loop wechseln, weiche Überblendung
ArenaAudio.sfx("audio_victory");   // Stinger, eigenes Element je Aufruf
ArenaAudio.apply();                // von applySettings() gerufen
ArenaAudio.unlock();               // beim ERSTEN pointerdown
```

* **Zwei Kanäle**, damit die Schalter *Sound* und *Musik* unabhängig wirken. *Sound aus* schaltet
  beides ab, *Musik aus* nur den Loop.
* **Autoplay-Policy**: Musik startet **nicht** beim Laden, sondern beim ersten `pointerdown`
  (einmaliger Listener). Abgelehnte `play()`-Promises werden bewusst verschluckt — ein
  blockierter Autoplay ist der Normalfall, kein Fehler.
* **Musik folgt dem View**: Hub-Theme überall, `audio_war` auf dem Kriegsboard. Der Match-Loop
  (`audio_battle`) und die Stinger `audio_victory` / `audio_defeat` hängen später in
  `arena_pan.html` — die Naht ist `demoMatchResult()` im Prototyp.
* Fällt das CDN aus, passiert schlicht **nichts**: kein Ton, keine Fehler.

Alle sechs Dateien sind **CC0 von OpenGameArt** — Titel, Bearbeitung und offene Punkte in
**`LIZENZEN.md`**.

### Asset-Download (Batch 5 ergänzt)

Die Download-Schleife aus dem Abschnitt oben deckt Batch 5 mit ab — `ui_assets.json` enthält
jetzt **115** Einträge mit `type` (`image` / `video` / `audio`). Für den echten Build:

```bash
python3 - <<'EOF'
import json, os, urllib.request
d = json.load(open("arena_patches/ui_assets.json"))
for k, v in d.items():
    if k == "_meta": continue
    sub = {"image": "img", "video": "vid", "audio": "audio"}.get(v.get("type"), "img")
    os.makedirs("public/assets/%s" % sub, exist_ok=True)
    ext = v["url"].rsplit(".", 1)[-1]
    urllib.request.urlretrieve(v["url"], "public/assets/%s/%s.%s" % (sub, k, ext))
    print(k)
EOF
```

Danach im Prototyp `CDN` und `CDNA` auf `./assets/img/` bzw. `./assets/audio/` umstellen.

> **Klassen-Kollision, teuer bezahlt:** Das Clan-Wappen hieß zuerst `.banner` — genauso wie das
> Raritäts-Band der Turm-Detailkarte (`#dBanner`). Die Wappen-Regeln (feste Breite 60 px,
> Wappen-`clip-path`) haben dort den Text abgeschnitten („EPISCH" → „PISC"). Das Wappen heißt
> jetzt `.cbanner`; die Playwright-Suite prüft **beide** Elemente auf ihre eigene Größe. Wer neue
> Bausteine benennt: **im ganzen Dokument nach dem Klassennamen greppen**, bevor er vergeben wird.

---

## Avatar-System (`arena_avatars.js`) — Profilbild, Rahmen, Freischalt-Zeremonie

**Anlass:** In AA schaltet Arena 5 einen neuen Avatar frei. Bisher hatte das Spiel **einen**
Avatar. Das Modul liefert Katalog, Zustand und Freischalt-Logik; die Darstellung liegt
vollständig im UI (`ui_prototype.html`, View `viewEditProfile`).

### Was drin ist

| | Anzahl | Bedingungs-Typen |
|---|---|---|
| **Porträts** (`AVATARS`) | 12 | `start`, `arena`, `trophaeen`, `liga`, `pass` |
| **Rahmen** (`FRAMES`) | 8 | dieselben fünf |

**Zwei getrennte Sammlungen, frei kombinierbar.** Ein Profilbild ist `PORTRÄT + RAHMEN`. Beide
haben eigenen Katalog, eigene Bedingungen und einen eigenen Zustandszweig mit eigenem
`gewaehlt`. `select()` fasst den Rahmen nie an, `selectFrame()` das Porträt nie — 12 × 8 = 96
Kombinationen. Genau dafür ist der Zustand zweigeteilt und nicht ein flaches Feld.

**Höchststand statt Tageswert.** Trophäen können sinken. `syncUnlocks()` schreibt deshalb einen
Höchststand (`state.stand`) fort und merkt jeden je erreichten Schlüssel in `bekannt`.
Freigeschaltet bleibt freigeschaltet — sonst würde ein Saison-Reset dem Spieler seinen Avatar
aus dem Profil reißen. `bekannt` trennt zugleich „schon frei" von „gerade frei": `syncUnlocks()`
gibt **nur** die neuen Einträge zurück, und das ist die Zeremonie-Liste. Zweiter Aufruf → leer,
also läuft die Zeremonie nie doppelt, auch nicht nach einem Reload.

**Speicher:** `localStorage["apd_avatars_v1"]`, versionierte Migration in `migrate()`.
Angehoben werden: der Alt-Schlüssel `apd_avatar` (nur ein Avatar-Name als String) und flache
v0-Objekte `{gewaehlt:"key"}`. Eine unbekannt **höhere** Version wird nicht heruntergerechnet,
sondern verworfen. Zeitstempel laufen durch `ts0()` — **niemals `v | 0`** (32-Bit-Overflow).

### API

```js
ArenaAvatars.assets(ASSETS);              // EINMALIG: Asset-Tabelle anmelden
ArenaAvatars.list();                      // 12 Porträts, je mit locked/gewaehlt/unlockText
ArenaAvatars.listFrames();                // 8 Rahmen, gleiche Form
ArenaAvatars.unlockedFor(1200);           // reine Abfrage: was WÜRDE dieser Stand freischalten
ArenaAvatars.syncUnlocks({trophaeen:1200});// schreibt Höchststand, gibt {neu, avatare, rahmen}
ArenaAvatars.apply({trophaeen:1200});     // syncUnlocks + fertiges Anzeigepaket in .aktiv
ArenaAvatars.select("solara");             // {ok, meldung} — Rahmen bleibt unberührt
ArenaAvatars.selectFrame("saphirkranz");   // {ok, meldung} — Porträt bleibt unberührt
ArenaAvatars.grant("avatar","fortuna");    // Season-Pass / Shop / Event
ArenaAvatars.active();                     // {avatar, frame, portraitUrl, emoji, ringUrl, tierColor}
ArenaAvatars.missingPortraits();           // Bestellliste für die Bildgenerierung
```

`unlockedFor()` und `syncUnlocks()` nehmen entgegen, was der Aufrufer hat: eine Zahl (Trophäen),
`{trophaeen}`, `{trophies, best}` (= `ArenaProfile.get()`) oder `{arena}`. Fehlende Felder werden
aus den Trophäen abgeleitet; ein mitgeliefertes **höheres** Feld gewinnt.

Selbsttest: `node arena_patches/arena_avatars.js` → 90 Checks, endet mit `ALLE TESTS OK`.

### Verdrahtung in `vs.html` — Ladebildschirm

Der VS-/Matchmaking-Screen zeigt beide Profilbilder. **Eigenes** Bild kommt aus dem Modul, das
**gegnerische** aus dem Rival-Datensatz (Bots haben noch keine Avatare — bis dahin das
Element-Emoji des Rivalen, siehe unten).

1. Script einbinden — **nach** `arena_profile.js`, **vor** dem Haupt-`<script>`:
   ```html
   <script src="./arena_profile.js"></script>
   <script src="./arena_rivals.js"></script>
   <script src="./arena_avatars.js"></script>
   ```
2. Einmalig die Asset-Tabelle anmelden. In `vs.html` gibt es keine `ASSETS`-Map wie im
   Prototyp — dort zeigt sie auf den ausgelieferten Ordner:
   ```js
   ArenaAvatars.assets(function (key) { return "./assets/img/" + key + ".png"; });
   ```
   Ohne diesen Aufruf sind alle URLs `null` und das UI zeichnet die Emoji-Rückfallebene. Das ist
   **kein Fehler**, sondern die vorgesehene Stufe — genau wie bei `ico()`.
3. Im Aufbau des VS-Blocks (dort, wo heute `ArenaRivals.vsCardHTML(rival)` steht):
   ```js
   const av = ArenaAvatars.active();
   myPortraitEl.innerHTML =
     '<span class="vsav" style="--avring:' + av.frame.tierColor + '">' +
       '<span class="vsemo">' + av.emoji + '</span>' +
       (av.portraitUrl
         ? '<img src="' + av.portraitUrl + '" alt="' + av.emoji +
           '" onerror="this.style.display=\'none\'">' : '') +
       '<span class="vsring"' +
         (av.ringUrl ? ' style="background-image:url(\'' + av.ringUrl + '\')"' : '') +
       '></span>' +
     '</span>';
   myNameEl.textContent = ArenaProfile.get().name || "Prisma-Magier";
   ```
   **Reihenfolge im Markup ist Absicht:** Emoji zuerst (liegt unten und bleibt stehen), Bild
   darüber, Rahmen ganz oben. Fällt das Bild aus, ist das Emoji schon da. Dieselbe Staffelung
   wie `cardArtHTML()`.
4. CSS dazu (Prototyp-Vorlage: `.avpvpic` / `.avpvring`). **Kein `overflow:hidden` auf der
   Portraitfläche** — der Ring liegt mit negativem `inset` außerhalb des Kreises und würde
   weggeschnitten. Beschnitten wird das **Bild** über seinen eigenen `border-radius`:
   ```css
   .vsav{position:relative;width:96px;height:96px;border-radius:50%;display:flex;
     align-items:center;justify-content:center;
     background:radial-gradient(circle at 50% 35%,#33475c,#0d151c 72%)}
   .vsav img{width:100%;height:100%;object-fit:cover;border-radius:50%}
   .vsring{position:absolute;inset:-5%;pointer-events:none;border-radius:50%;
     background-repeat:no-repeat;background-position:center;background-size:contain;
     box-shadow:inset 0 0 0 3px var(--avring,#9aa3ad)}
   ```
   > ⚠ **Mindestens 96 px im Ladebildschirm.** Unter 20 px tragen diese Artworks nur noch Farbe
   > und Wort. Im HUD (unten) sind 28 px die Untergrenze — deshalb steht dort der **Name**
   > daneben, nicht nur das Bild.
5. Gegnerseite, bis Bots eigene Avatare haben:
   ```js
   const rival = ArenaRivals.current() || ArenaRivals.pick(ArenaProfile.get().trophies);
   foePortraitEl.innerHTML = '<span class="vsav" style="--avring:#ff5e7e">' +
     '<span class="vsemo">' + (rival.emoji || "👤") + '</span></span>';
   ```

### Verdrahtung in `vs.html` — In-Game-HUD

Das HUD liegt in `arena_pan.html`, wird aber aus `vs.html` heraus betreten; der gewählte Avatar
muss über den Screenwechsel hinweg gelten. Er tut es automatisch — beide Seiten lesen
denselben `localStorage`-Schlüssel. **Nichts durchreichen, nichts in die URL hängen.**

1. Script auch in `arena_pan.html` einbinden und `assets()` genauso anmelden.
2. Beim Aufbau der HUD-Kopfzeile (die Zeile mit eigenem Namen und Burg-HP):
   ```js
   const av = ArenaAvatars.active();
   hudAvatarEl.style.setProperty("--avring", av.frame.tierColor);
   hudAvatarEl.innerHTML = '<span class="hudemo">' + av.emoji + '</span>' +
     (av.portraitUrl ? '<img src="' + av.portraitUrl + '" alt="' + av.emoji +
       '" onerror="this.style.display=\'none\'">' : '');
   ```
   `hudAvatarEl` ist 28 px groß, der farbige Ring kommt aus `--avring` (2 px `inset`-Schatten).
   **Einmal beim Match-Start setzen, nicht pro Frame** — `active()` liest bei jedem Aufruf den
   Speicher; im Render-Loop wäre das ein Parse pro Frame.

### Wann die Zeremonie läuft

Die Freischaltung wird nach dem **Match-Ergebnis** ausgelöst, nicht beim Öffnen des Profils —
sonst sähe man sie erst, wenn man ohnehin schon im Profil ist.

In `resolveEnd()` (`arena_pan.html`), direkt **nach** `ArenaProfile.applyMatchResult()`, weil erst
danach die neuen Trophäen stehen:
```js
const res  = ArenaProfile.applyMatchResult({ win, stars, /* … */ });
const neue = ArenaAvatars.syncUnlocks({ trophaeen: res.trophies }).neu;
// `neue` in den Hub mitgeben — die Zeremonie gehört NICHT auf den Result-Screen,
// sie würde dort mit Trophäen-, Pack- und Rang-Meldung um Aufmerksamkeit ringen.
if (neue.length) sessionStorage.setItem("apd_avatar_neu", JSON.stringify(neue));
```
Im Hub (`deck.html` / `ui_prototype.html`) beim ersten Frame nach der Rückkehr:
```js
const roh = sessionStorage.getItem("apd_avatar_neu");
if (roh) { sessionStorage.removeItem("apd_avatar_neu"); showAvatarCeremony(JSON.parse(roh)); }
```
`showAvatarCeremony(liste)` steht im Prototyp und arbeitet die Liste als **Warteschlange** ab:
ein Overlay, ein Eintrag, ein Tap („TIPPEN ZUM FORTFAHREN"). Wer nach einer langen Pause drei
Avatare freischaltet, sieht sie **nacheinander** statt drei gestapelte Overlays. Die Liste kommt
schon in der richtigen Reihenfolge — Rarität **aufsteigend**, das Beste zuletzt, dieselbe
Eskalation wie die Pack-Zeremonie.

Ist der Hub übersprungen (Direkt-Revanche), passiert nichts Schlimmes: `bekannt` ist gesetzt,
die Einträge sind frei, nur die Zeremonie fällt aus. Wer sie retten will, legt die Liste statt in
`sessionStorage` in den Zustand (`state.avatar.offen`) — dann überlebt sie auch einen Neustart.

### Prototyp-Naht

| Funktion | Rolle |
|---|---|
| `renderEditProfile()` | Vorschau + Reiter + Raster, ruft nur Modul-Getter |
| `avPick(key)` | Reiter-abhängig `select()` / `selectFrame()`, Toast bei Ablehnung |
| `setAvTab("avatars"\|"frames")` | wechselt nur, WELCHE Sammlung das Raster zeigt |
| `showAvatarCeremony(neu)` / `avCerStep()` | Warteschlange, ein Overlay |
| `syncAvatarUnlocks(t)` | die EINE Naht zwischen Fortschritt und Avataren |
| `seedAvatars()` | einmaliger **stiller** Abgleich beim ersten Start (keine Zeremonie) |

Einstieg ist das Porträt der Home-Profilzeile (`#profAvatar`) — dieselbe Stelle wie in AA.
CSS-Präfix des ganzen Blocks: **`av` / `avg`**. Der goldene „AUSGEWÄHLT"-Streifen trägt
**dunkle** Schrift (`.goldtext` ist auf hellen Flächen verboten — Bug-Klasse aus dem Farb-Pass).
Jede Kachel hat denselben Innenabstand unten, auch ohne Streifen: sonst wäre der Name der
gewählten Kachel halb verdeckt oder das Raster würde beim Wechseln um 8 px springen.

### ⚠ Offen: 10 von 12 Porträts fehlen

Vorhanden sind nur die zwei Helden-Artworks aus Batch 4: **`card_solara`** (→ Avatar `solara`)
und **`card_magmor`** (→ Avatar `magmor`). Die anderen zehn tragen `portrait: null` und einen
`portraitWunsch`-Schlüssel; das Raster markiert sie mit „Art folgt", angezeigt wird das Emoji.

Zu generieren (1:1, rund beschnittenes Brustporträt, textfrei, gleiche Bildsprache wie die
Karten-Artworks):

| Asset-Key | Avatar | Rarität |
|---|---|---|
| `av_novize`   | Prisma-Novize        | Gewöhnlich |
| `av_scherbe`  | Scherbenschmiedin    | Gewöhnlich |
| `av_smaragd`  | Smaragd-Wächter      | Gut |
| `av_saphir`   | Saphir-Kanonier      | Gut |
| `av_sturm`    | Sturmruferin         | Selten |
| `av_obsidian` | Obsidian-Fürst       | Episch |
| `av_prisma`   | Prisma-Erzmagier     | Legendär |
| `av_asche`    | Aschenmark-Veteranin | Legendär |
| `av_frost`    | Frostbastion-Hüterin | Legendär |
| `av_fortuna`  | Fortunas Erbin       | Suprem |

Sobald ein Asset existiert: `portrait:` im Katalog setzen, `portraitWunsch` entfernen — der
Eintrag verschwindet dann von selbst aus `missingPortraits()` und die „Art folgt"-Marke geht weg.

**Rahmen brauchen keine neuen Assets**, greifen aber auf die sechs *Karten*-Raritätsrahmen
(`frame_common` … `frame_supreme`) zu. Die sind rechteckig; im runden Avatar-Ring trägt deshalb
aktuell die **Farbe** die Aussage, nicht die Kontur. Acht runde Ring-Artworks wären ein eigener
kleiner Batch — kein Blocker, das Farbsystem funktioniert ohne sie vollständig.

## Bilder fuer die Auslieferung (P0, gemessen am 26.07.2026)

**Das Problem, in Zahlen.** Die Assets liegen als 1024x1024-PNG am CDN, angezeigt
werden sie bei 15 bis 20 px. Auf einem iPhone-Format gemessen:

| | vorher | nachher |
|---|---|---|
| Bild-Bytes einer Seitenladung | **82,78 MB** | **0,59 MB** |
| alle 158 Assets zusammen | 210,97 MB | 1,98 MB |
| Ladezeit bis `load` | 2630 ms | 697 ms |

Von 28 sichtbaren Bildern war **jedes** mehr als dreifach ueberdimensioniert.

**Warum das kein Detail ist.** Eine Seite, die auf Mobilfunk minutenlang laedt,
liest niemand als hochwertig — egal wie gut die Fasen sind. Und die verbreitete
Empfehlung aus der Unity-Welt ("Assets immer groesser erzeugen als noetig,
Panels mit 4096 px") ist hier aktiv schaedlich: dort kommen die Bilder offline
komprimiert mit der App, bei uns geht jedes Byte ueber die Leitung.

**Der Bildschritt.** Vor der Auslieferung einmal ueber alle Assets:

1. Deckel je Typ (das 2- bis 3-fache der groessten Anzeigegroesse):
   Icon/Waehrung/Element/Rang 96 · Rahmen 128 · Nav 160 · Ribbon/Kartenrahmen 256
   · Knopf/Pack/Strasse/Shop-Produkt 320 · Arena/Bild/Teaser/Festung 512
   · Banner/Panel 640 · alles andere 320
2. Skalieren mit Lanczos, speichern als **WebP q86**.
3. Adressen umbiegen: die Bild-Adressen zeigen auf den lokalen Ordner,
   `.mp4`/`.mp3` bleiben am CDN.

Erledigt fuer die Vorschau unter `prisma-td-vorschau.higgsfield.app` — das
Skript steht im Sitzungsprotokoll und muss fuer die echte Auslieferung in einen
Build-Schritt wandern. `ui_prototype.html` selbst traegt `loading="lazy"` und
`decoding="async"` an jedem Bild; das begrenzt die ANZAHL der Anfragen (17 Views
im DOM), nicht die Groesse der Dateien.
