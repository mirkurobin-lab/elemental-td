# AA-Gameplay vs. Arcane Prism — verifizierte Abweichungen & Optimierungen

**Stand:** 2026-07-24 · **Quelle:** `arena_patches/AA_UI_REFERENZ.md` §9 (Match-HUD, Matchmaking,
Match-Ende), belegt aus den Screen-Recordings 1/2/3 des Users.
**Gegenstand:** Abgleich der **verifizierten** AA-Match-Mechanik gegen unseren Spielstand.

**Unser Stand (Referenz für alles Folgende):**

| Feature | Unser aktueller Zustand |
|---|---|
| Match-Gold | **am 19.07. ENTFERNT** (samt „Send"-Funktion) |
| Bauen | **1 Build pro Wellen-Runde** |
| In-Match-Turm-Upgrades | **deaktiviert** |
| Fusion / Triple | als **Handkarten** |
| Matchlänge | **7 Minuten** |
| Hand-Refresh | **1× pro Runde** |

> ⚠ **Wichtigste Erkenntnis dieses Dokuments:** Mehrere unserer Vereinfachungen vom 19.07.
> wurden mit „AA macht das auch nicht" begründet. Die Videoanalyse zeigt: **AA macht es doch.**
> Die Punkte 1–3 korrigieren Entscheidungen, die auf falschen Annahmen beruhten.

---

## 1. AA **HAT** Match-Gold — und einen In-Match-Upgrade-Button

**Beleg (§9.2).** Das Match-HUD führt bei `y ≈ 240` durchgehend eine **Gold-Anzeige des
Spielers**; beobachtete Stände in drei verschiedenen Matches: **10 500**, **10 817**, **3 500**.
Zwei Buttons hängen direkt daran:

* `y 1665` **[ Refresh ]** — würfelt das Turm-Angebot neu
* `y 1891` **[ Upgrade ]** — wertet den **gewählten Turm im laufenden Match** auf

Die Zahlen schwanken innerhalb eines Matches deutlich (10 500 → 10 817 → 3 500), das ist also
kein Deko-Zähler, sondern eine **aktiv ausgegebene Match-Ressource**.

**Problem bei uns.** Wir haben Match-Gold am 19.07. entfernt — begründet mit der Annahme
„AA has none". Die Annahme ist **widerlegt**. Folgen der Entfernung:

* Die einzige Entscheidung im Match ist „wohin baue ich" — es gibt keine **Ressourcen**-Ebene,
  also kein Sparen, kein Timing, kein Risiko.
* „1 Build pro Runde" musste als künstliche Bremse eingeführt werden, *weil* die natürliche
  Bremse (Gold) fehlte. Eine Zählschranke ist immer schlechter als eine Ökonomie: Sie ist nicht
  verhandelbar, nicht planbar und belohnt kein gutes Spiel.
* Der Refresh (1×/Runde) hat keinen Preis und damit keine Gewichtung.

**Empfehlung: Match-Ökonomie reaktivieren.** Konkreter Zahlenvorschlag für ein 7-Minuten-Match:

| Posten | Wert | Begründung |
|---|---|---|
| Startgold | **900** | reicht für genau 1 Turm der mittleren Preisklasse + Rest |
| Gold pro normalem Kill | **6 + 2 × Wellenindex** | wächst mit der Wellenkurve `58 × 1.23^w` mit |
| Gold pro Wellen-Clear | **120 + 40 × w** | der verlässliche Grundeinkommens-Anteil |
| Gold pro Boss-Kill | **500** | macht Bosse zum Wirtschafts-Ereignis, nicht nur zur Gefahr |
| Turmkosten | **250 / 400 / 650** (nach Kartenstufe im Match) | |
| In-Match-Upgrade | **300 × (Sternstufe)** | siehe Punkt 3 |
| Hand-Refresh | **150**, danach **+150 pro Refresh derselben Runde** | ersetzt „1×/Runde" |

Erwarteter Gesamtdurchsatz über 7 Minuten: **9 000–12 000 Gold** — genau die Größenordnung, die
das AA-HUD zeigt (10 500 / 10 817). Das ist kein Zufall, sondern ein guter Sanity-Check.

**„1 Build pro Runde" ersatzlos streichen** und durch die Goldschranke ersetzen. Wer spart, baut
in Runde 4 zwei Türme; wer verschwendet, baut keinen. Das ist dieselbe Bremse — nur eine, die
der Spieler kontrolliert.

> **Abgrenzung zum Meta-Gold:** Match-Gold ist eine **eigene, matchlokale** Währung und wird am
> Matchende auf 0 gesetzt. Das Meta-Gold (Hub-Wallet, `goldFor(lvl)` in `arena_cards.js`) bleibt
> davon unberührt. Verwechslung der beiden war vermutlich der eigentliche Auslöser der
> Entfernung am 19.07. — im HUD heißen sie gleich, sind aber zwei getrennte Systeme, exakt wie
> in AA (dort: Match-HUD-Gold vs. Top-Bar-Gold 491).

**Aufwand: M** (Ökonomie + HUD-Zeile + Kaufpfade) · ~~Priorität: 1~~ → **ENTSCHIEDEN (User, 2026-07-25): NICHT übernehmen.**

> **⛔ User-Entscheidung:** In der Arena wird **kein Gold** für Türme oder Upgrades gebraucht —
> das Match bleibt ökonomie-frei (freie Builds, Bau-Taktung über Runden/Cooldowns, Power-Kurve
> über Fusionen). Übernommen wird nur die **Meta-Seite**: feste **Gold-Siegprämie** nach dem
> Match (AA: +610), die ins Hub-Wallet fließt und dort die Karten-Level-Ups
> (`goldFor(lvl)` + Material) bezahlt — siehe Punkt 4. Der Zahlenvorschlag oben bleibt als
> Referenz stehen, falls die Entscheidung nach Playtests revidiert wird.

---

## 2. AA taktet das Bauen über **Per-Karten-Cooldowns**, nicht über eine Rundenschranke

**Beleg (§9.2).** Unter der Turm-Auswahlleiste (`y ≈ 2450`) steht **pro Karte ein eigener
Cooldown**; beobachtete Werte: **30 s, 25 s, 15 s, 10 s, 2 s**. Die Karten laufen also
unabhängig voneinander ab und stehen zu unterschiedlichen Zeitpunkten bereit.

**Problem bei uns.** „1 Build pro Wellen-Runde" synchronisiert alle Entscheidungen auf einen
einzigen Zeitpunkt pro Runde. Dazwischen ist der Spieler **Zuschauer**. Bei 7 Minuten
Matchlänge und ~10 Runden sind das ganze 10 Entscheidungen pro Match. In AA sind es durch
gestaffelte Cooldowns eher 25–40 — bei gleicher Matchlänge.

**Empfehlung (als A/B-Test, nicht als Blind-Umstellung).**

* **Variante A (Kontrolle):** Status quo, 1 Build/Runde.
* **Variante B:** Cooldown pro Handkarte, gestaffelt nach Turmklasse —
  **billige Türme 10 s · mittlere 18 s · teure 30 s · Fusion 45 s · Triple 60 s**.
  Kein Rundenlimit mehr; die Schranke ist Gold (Punkt 1) **und** Cooldown.
* Metrik: **Aktionen pro Minute** und **Abbruchrate vor Minute 3**. Erwartung: B hebt beides
  in die gewünschte Richtung; falls B die Abbruchrate erhöht (Überforderung), Cooldowns um
  50 % verlängern statt zurück zu A.

Cooldowns sind außerdem der natürliche Platz für **Karten-Level-Effekte** („−0.3 s Cooldown pro
5 Level") — noch eine Stelle, an der die Meta-Progression im Match sichtbar wird.

**Aufwand: S** (Timer pro Handkarte + Rendering) · **Priorität: 2**

---

## 3. Türme haben in AA **In-Match-Sternstufen** (Star Levels)

**Beleg (§9.2).** Eine gegnerische Skill-Karte beschreibt sich wörtlich mit
**„Reduces star levels of a … by 1/1/2 star level(s)"**. Es existiert also ein
**matchlokaler Stufen-Layer pro Turm**, der von gegnerischen Karten **gesenkt** werden kann —
und der In-Match-**[ Upgrade ]**-Button (§9.2) ist offensichtlich der Weg, ihn zu **heben**.
Das ist eine zweite, vom Meta-Level unabhängige Progressionsachse *innerhalb* eines Matches.

**Problem bei uns.** Wir haben In-Match-Upgrades **deaktiviert**. Damit ist ein Turm ab dem
Moment des Bauens eingefroren, und unser geplantes **Curse-System** hat kein Ziel: Ein Fluch
kann nur Schaden/Tempo temporär modifizieren, aber nichts *wegnehmen*, was der Gegner sich
erarbeitet hat. Genau das ist aber der emotionale Kern von Disruption-Play.

**Empfehlung: Star-Level-Layer einführen.**

* Jeder gebaute Turm startet auf **★1**, maximal **★5**.
* **Aufwerten im Match** kostet Gold: **300 × aktueller Sternstufe** (★1→★2 = 300, ★4→★5 = 1200).
* Ein Sternschritt gibt **+18 % Schaden und +6 % Reichweite** — spürbar, aber ein ★5-Turm ist
  nicht so stark wie zwei ★2-Türme (verhindert Einzelturm-Strategien).
* **Curse-Karte „Sternenfall"** (Name aus AAs *Starfall Curse*, §9.2): senkt die Sternstufe
  eines gegnerischen Turms um **1** (Stufe Gewöhnlich/Gut), um **2** ab Selten. Nie unter ★1 —
  ein Turm wird nie zerstört, nur zurückgeworfen. Erstattung: **0 Gold** (das ist der Schmerz).
* Sichtbarkeit: Sterne als kleine Reihe über dem Turm auf dem Board, mit kurzem Rot-Blitz beim
  Verlust — der Gegner muss *sehen*, dass seine Karte gewirkt hat.

Das koppelt drei bisher lose Enden zusammen: Match-Gold bekommt eine zweite Senke, der
deaktivierte Upgrade-Button bekommt seinen Sinn zurück, und das Curse-System bekommt sein Ziel.

**Aufwand: M** · **Priorität: 2**

---

## 4. Siegprämien sind in AA **fix und arenagebunden**

**Beleg (§9.3).** Video 2 (t=441) und Video 3 (t=365) zeigen bei **unterschiedlichen Gegnern**
und **unterschiedlichem Matchverlauf** exakt dieselben Beträge: **+39 Trophäen, +610 Gold**
(Arena 4). Doppelt belegt → die Prämie hängt an der **Arena**, nicht an der Leistung.

**Problem bei uns.** `arena_profile.js` vergibt **variabel**: `T_WIN` 30, `T_STAR` 4 pro Stern,
`STREAK_BONUS` bis +20. Das ist nicht falsch, aber es hat zwei Nachteile: Der Spieler kann seine
Belohnung **nicht vorhersagen** (kein Ziel vor dem Match), und Sterne-Boni belohnen tendenziell
das *leichtere* Matchup, nicht das bessere Spiel.

**Empfehlung: Hybrid.**

* **Fixe Basis pro Arena** (planbar, wird vor dem Match im Matchmaking-Screen angezeigt):

  | Arena | Trophäen (Sieg) | Gold (Sieg) | Trophäen (Niederlage) |
  |---|---|---|---|
  | 1 | +30 | 250 | −8 |
  | 2 (ab 250 🏆) | +32 | 400 | −9 |
  | 3 (ab 700 🏆) | +35 | 610 | −10 |
  | 4 (ab 1200 🏆) | +39 | 900 | −12 |

  (Die Arena-3-Zeile übernimmt bewusst AAs belegte 610 Gold als Ankerwert.)
* **Streak-Bonus bleibt** als einziger variabler Anteil: **+3 Trophäen pro Siegesserie-Stufe,
  gedeckelt bei +15**. Das belohnt Konstanz statt Glück und ist trotzdem vorhersagbar.
* **Sterne-Bonus streichen** (`T_STAR`) — er ist der intransparenteste Teil und der einzige, den
  ein Spieler nicht erklären kann.

**Aufwand: S** (Tabelle + `applyMatchResult()` anpassen) · **Priorität: 3**

---

## 5. Ladebildschirm-**Gameplay-Tipps** (rotierende Texte)

**Beleg (§9.1).** Während „Looking for a worthy opponent" (Countdown 4 s) rotieren
Gameplay-Tipps, wörtlich belegt u. a.:
*„Enemies get stronger over time. Don't rely on just one strategy."* und
*„Placing a Boulder Tower at the beginning of a long path could be a good strategy."*

**Warum übernehmen.** Der Ladebildschirm ist die einzige Stelle, an der ein Spieler **nichts zu
tun hat und trotzdem hinschaut**. Tipps dort sind kostenloses Onboarding, das den ersten Tagen
die Frustration nimmt — und sie kosten exakt eine Textliste.

**Empfehlung: in `vs.html` einbauen** (Matchmaking-/Slot-Machine-Phase), Rotation alle **2,5 s**,
zufällige Startposition, keine Wiederholung innerhalb einer Session. **Zehn ausformulierte
deutsche Tipps:**

1. „Gegner werden mit jeder Welle stärker. Ein einziger Turmtyp trägt dich nicht bis zum Ende."
2. „Ein STONE-Turm am **Anfang** eines langen Weges wirkt länger als einer am Ende — die Gegner
   laufen an ihm vorbei, solange sie noch vollständig sind."
3. „FROST verlangsamt, tötet aber kaum. Stell ihn dorthin, wo deine Schadenstürme zuschauen."
4. „Fusionen entstehen nur aus Türmen, die schon stehen. Bau früh Basis-Türme, wenn du eine
   Fusion planst."
5. „Elementarschwächen entscheiden Bosse: EMBER gegen Pflanzen, FROST gegen Feuer,
   HOLLOW gegen alles Helle."
6. „Deine Ult lädt sich durch Kills auf — nicht durch Warten. Wer früh tötet, ult früher."
7. „Ein Turm auf ★3 schlägt selten zwei Türme auf ★1. Breite schlägt Höhe, solange du Platz hast."
8. „Beide Spieler bekommen **dieselben Wellen**. Wenn du verlierst, lag es nicht am Pech."
9. „Karten-Level heben deine Türme in **jedem** Match. Ein Upgrade zwischen zwei Partien ist mehr
   wert als eine weitere Partie."
10. „Der Weg gehört dir: Straßenkarten verlängern die Strecke. Längerer Weg = mehr Zeit unter
    Beschuss."

**Aufwand: S** · **Priorität: 3**

---

## 6. Matchmaking zeigt **Name + Clan**

**Beleg (§9.1 / §9.3).** Im Matchmaking und im Sieg-Screen stehen beide Spieler mit **Name und
Clan** untereinander — bei Spielern ohne Clan explizit **„No clan"**.

**Problem bei uns.** `arena_rivals.js` liefert 12 benannte Bot-Rivalen mit Titel und Flavor,
aber ohne Clan-Feld. Der leere Platz unter dem Namen ist eine verschenkte Zeile — und ein
späteres Clan-System (Design-Doku Phase 3) hätte keinen Ort, an dem es vorher schon sichtbar war.

**Empfehlung.**

* `arena_rivals.js` um ein Feld **`clan`** pro Rival erweitern (z. B. „Aschenorden",
  „Frostwacht", „Die Dornen", „Prismafaust"), bei ~⅓ der Rivalen bewusst **„Kein Clan"**.
* `vsCardHTML()` rendert die Clan-Zeile klein unter dem Namen — dieselbe Zeile später für den
  echten Spieler-Clan.
* Der eigene Spieler zeigt vorerst konstant **„Kein Clan"** mit einem ausgegrauten
  „Clan beitreten"-Hinweis. Das ist ein sichtbarer, permanenter Haken für Phase 3.

**Aufwand: S** · **Priorität: 5**

---

## 7. Turm-**Grundflächen** (1×2) und „Grids Covered" als Stat

**Beleg (§9.2 / §2.3).** Beim Ziehen einer Turmkarte aufs Feld blendet AA die Grundfläche ein,
wörtlich **„1x2"** und **„TOWER PATH"**. Passend dazu führt die Turm-Detailkarte bei
Support-Türmen (Divine Sword) den Stat **„Grids Covered"** — die abgedeckte Fläche ist also
eine **aufwertbare Eigenschaft**, nicht nur eine Bauregel.

**Problem/Chance bei uns.** Unsere Türme belegen 1 Feld. Rechteckige Grundflächen wären ein
echter Maze-Tradeoff: Ein 1×2-Turm nimmt zwei Wegplanungs-Felder weg und zwingt zu einer
Entscheidung zwischen Feuerkraft und Streckenführung. Das ist **die** Design-Chance in dieser
Liste — und gleichzeitig die riskanteste, weil sie Platzierungs-, Kollisions- und
Pfadfindungscode berührt und **jede** bestehende Map neu balanciert werden müsste.

**Empfehlung: als Later-Punkt vormerken, nicht jetzt bauen.** Wenn, dann so:

* Nur **große/teure Türme** bekommen 1×2 (Katapult-Klasse), alles andere bleibt 1×1.
* Placement-Overlay wie in AA: Grundfläche + Pfadbezug **vor** dem Loslassen einblenden.
* „Felder abgedeckt" als **Stat auf der Detailkarte** (im UI-Prototyp bei DAWN bereits als
  Platzhalter vorhanden) — steigerbar erst ab Stufe Selten.
* **Voraussetzung:** mindestens eine Map, die gezielt für gemischte Grundflächen gebaut ist.
  Vorher ist der Tradeoff kein Tradeoff, sondern nur Ärger.

**Aufwand: L** · **Priorität: 7 (Later)**

---

## Übersicht

| # | Thema | Beleg | Aufwand | Priorität |
|---|---|---|---|---|
| 1 | **Match-Gold + In-Match-Upgrades reaktivieren** | HUD 10 500 / 10 817 / 3 500 + [Upgrade] | M | **1** |
| 2 | Per-Karten-Cooldowns statt 1 Build/Runde (A/B) | 30/25/15/10/2 s | S | 2 |
| 3 | In-Match-Sternstufen + Curse „Sternenfall" | „reduces star levels … by 1/1/2" | M | 2 |
| 4 | Fixe Arena-Siegprämien + Streak-Bonus | +39 / 610 doppelt belegt | S | 3 |
| 5 | Ladebildschirm-Tipps (10 Texte) | rotierende Tipps im Matchmaking | S | 3 |
| 6 | Clan-Tag im Rivalen-Modul | „No clan" unter beiden Namen | S | 5 |
| 7 | Turm-Grundflächen 1×2 + „Felder abgedeckt" | „1x2 TOWER PATH" / „Grids Covered" | L | 7 (Later) |

**Reihenfolge-Empfehlung:** 1 → 3 → 2 → 4 → 5 → 6 → (7 später).
Punkte 1 und 3 hängen zusammen (Gold ist die Währung der Sternstufen) und sollten in einem
Arbeitspaket gebaut werden; Punkt 2 baut auf der wiederhergestellten Ökonomie auf und ist
danach ein Zweizeiler pro Handkarte.

---

## Was AA macht, das wir bewusst **nicht** übernehmen

| AA-Verhalten | Unsere Entscheidung | Begründung |
|---|---|---|
| Merge-Bonus ist **fix** pro Karte | Wir stellen **2 Optionen zur Wahl** | Build-Identität statt Statistik — siehe `DESIGN_PROGRESSION.md` |
| Truhen mit **Wartezeit** (3 h 41 m) | **Booster-Packs**, sofort öffenbar | Wartezeit-Monetarisierung ohne Retention-Basis ist verschwendete Reibung |
| **Forced Ads** („Buy any offer to remove forced ads") | keine erzwungene Werbung | — |
| Helden über **separate Shard-Währung** | Helden laufen im **selben Kartensystem** (5× seltener) | Kein zweiter Währungs-Track, keine zweite UI |
| Rarität endet bei **Legendary** | zusätzliche Endstufe **Suprem** | Langzeit-Ziel für die Lv-100-Vorgabe |
