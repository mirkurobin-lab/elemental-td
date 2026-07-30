# AA-Gameplay vs. Arcane Prism — verifizierte Abweichungen & Optimierungen

**Stand:** 2026-07-25 · **Quelle:** `arena_patches/AA_UI_REFERENZ.md` §9 (Match-HUD, Matchmaking,
Match-Ende, Trophy Road, Map Objectives), belegt aus den Screen-Recordings 1/2/3/6/11 des Users.
**Gegenstand:** Abgleich der **verifizierten** AA-Match-Mechanik gegen unseren Spielstand.

> **Ergänzt am 2026-07-25 aus Video 6:** neuer **Punkt 8** (arena-gebundene Map-Objectives
> und Trick-Card-Freischaltung) und die **korrigierten Arena-Schwellen** in §4
> (600 / 1200 / 1500 statt geschätzter 250 / 700 / 1200, siehe AA-Referenz §9.5 / §12.1).

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

> ### ⚠ KORREKTUR (30.07.2026) — dieser Abschnitt gilt für AA, NICHT für uns
>
> Ansage des Auftraggebers: *„Wir haben keine in Game tower upgrades mit
> Sternen, wir haben Tower die sich fusionieren."*
>
> Damit ist die **Empfehlung unten hinfällig**, und zwar nicht, weil sie
> falsch gerechnet war, sondern weil sie ein Problem löst, das wir nicht
> haben. Unsere Progression liegt vollständig im Meta: Karten fusionieren
> (3 → nächste Rarität), leveln über Essenz und Gold, und was im Match
> steht, steht mit dem Wert, den es beim Betreten mitbringt.
>
> **Was das für die Folgepunkte heißt:**
> * Der **Fluch „Sternenfall"** braucht ein anderes Ziel. Ohne
>   Sternstufen kann er nichts herabsetzen — er müsste stattdessen auf
>   eine matchlokale Größe zielen (Tempo, Reichweite, Ladung).
>   **Offen, nicht entschieden.**
> * Die **zweite Gold-Senke im Match** aus §1 fällt damit ebenfalls weg.
>   Match-Gold hat dann nur noch das Bauen als Senke.
> * Der **Skalenbefund in §12** (Wellen-HP gegen Turmschaden) hat seine
>   Rechengrundlage verloren: er nahm ★1→★5 als eine der Stellschrauben
>   an. Siehe die Korrektur dort.
>
> Der Abschnitt bleibt stehen, weil der **AA-Beleg** stimmt und beim
> Vergleich mit dem Vorbild weiter gebraucht wird. Er ist ab hier
> Fundstück, nicht Bauplan.

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

* **Fixe Basis pro Arena** (planbar, wird vor dem Match im Matchmaking-Screen angezeigt).
  Die Schwellen sind seit Video 6 **belegt** und nicht mehr geschätzt (§9.5):

  | Arena / Liga | Schwelle | Trophäen (Sieg) | Gold (Sieg) | Trophäen (Niederlage) |
  |---|---|---|---|---|
  | 1 | **0 🏆** | +30 | 250 | −8 |
  | 2 | **300 🏆** | +32 | 400 | −9 |
  | 3 | **600 🏆** | +35 | **610** | −10 |
  | 4 | **900 🏆** | +37 | 750 | −11 |
  | 5 | **1200 🏆** | +39 | 900 | −12 |
  | 6 | **1500 🏆** | +42 | 1 100 | −13 |
  | **Champions-Liga** | **~2900 🏆** | +45 | 1 400 | −15 |

  (Die Arena-3-Zeile übernimmt bewusst AAs belegte 610 Gold als Ankerwert.)

> **⚠ KOMPLETT nach den User-Screenshots der Trophäenstraße (AA-Referenz §14.1).**
> AAs Arena-Ribbon liest wörtlich „Arena 2 · 🏆 300" — damit ist die Leiter eine **glatte
> 300er-Schrittweite: 0 / 300 / 600 / 900 / 1200 / 1500**. Alle sechs Schwellen sind jetzt
> belegt bzw. lückenlos abgeleitet, nichts mehr geschätzt. Unsere sechs Arenen
> (Kristallhof / Smaragdtal / Saphirfeste / Sturmspitze / Obsidian-Thron / Prisma-Zitadelle)
> liegen auf genau diesen Schwellen.
>
> **⚠ KORRIGIERT nach Video 6 (§9.5 / §12.1).** Die frühere Fassung dieser Tabelle nannte
> Arena-Aufstiege bei **250 / 700 / 1200** — geraten, weil die Top-Bar-Währungen vertauscht
> gelesen worden waren. Belegt sind jetzt: **Arena 3 = 600**, **Arena 5 = 1200**,
> **Arena 6 ≈ 1500**, danach die Liga **Champions Peak ab ≈ 2900** mit eigenen *Gates*
> (Entrance / Stonegate 3400 / Ironpass 3900 / Bronzeward 4600 / Silverfield 5400 /
> Flamegate 7800 / Stormcrest 8800 / Spitze ≈ 9800). Die Leaderboard-Spitze lag bei
> **~6500** Trophäen — die Trophäenzahlen der Spielerschaft liegen also **etwa Faktor 7
> niedriger** als bisher angenommen, und die frühere Annahme „Arena 4 ≈ 8218 Trophäen"
> war falsch. **Dieselben Schwellen 600 / 1200 / 1500 gaten auch die Festungs-Upgrades**
> (`arena_fortress.js`) und die Objective-/Curse-Freischaltung (Punkt 8) — eine Tabelle
> für drei Systeme.
>
> **Schrittweite der Belohnungsknoten** (§9.5, für die Dichte-Kurve der Trophy Road):
>
> | Bereich | Schrittweite |
> |---|---|
> | 400 – 1 300 🏆 | **50** |
> | 1 500 – 3 400 🏆 | **100** |
> | 3 800 – 9 800 🏆 | **200** |
>
> Also **dichte kleine Belohnungen am Anfang, seltenere große später** — unsere geplanten
> „alle 25 Trophäen ein Knoten" (`DESIGN_PROGRESSION.md` §D) sind damit im unteren Bereich
> etwa doppelt so dicht wie im Vorbild. Empfehlung: auf **50 / 100 / 200** umstellen,
> dafür pro Knoten mehr hineingeben — ein Knoten, der sich lohnt, schlägt zwei, die man
> vergisst.
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

## 8. Arena-gebundene **Map-Objectives** & **Trick-Card-Freischaltung**

**Beleg (§9.7, Video 6 t=105-125).** Jeder Arena-Banner der Trophy Road trägt ein Feld
**„Unlocks:"**, und was dort steht, ist in zwei klar gelabelte Klassen sortiert:

| Klasse | Wirkung | Belegte Namen |
|---|---|---|
| **Map Objective** | Regeländerung für die **ganze Map** | *Spell Frenzy*, *Bounty Bloom*, *Straight Combat*, *Endless Refresh*, *Doom Clock* |
| **Trick Card** | einsetzbare **Störkarte gegen den Gegner** | *Chains of Binding*, *Curse of Weakness*, *Phantom Cart*, *Ghostly Distraction*, *Mystic Obstacles*, *Starfall Curse*, *Cursed Gust* |

Beispiel: Arena 3 (*Sunken Atlantis*, 600 🏆) schaltet *Endless Refresh*, *Doom Clock*,
*Ghostly Distraction* und *Mystic Obstacles* frei. Dazu der Schlüssel-Befund: Der Modifier
**„Neutral"** auf dem Home-Screen (§9.4) bedeutet **kein Map Objective aktiv** — die
Objectives rotieren also, sie sind kein Dauerzustand.

**Bezug zu unseren offenen Punkten.** Zwei Dinge, die wir bisher getrennt geplant hatten,
sind im Vorbild **dasselbe System**:

1. **Unser Curse-System** (Punkt 3 oben, `DESIGN_PROGRESSION.md` §E und „Spätere
   Ausbaustufen" Phase 2) war als Kartenpool-Erweiterung gedacht: Curse-Karten kommen
   irgendwann in den Drop-Pool und laufen über dieselbe Level-Leiter. Offen blieb dabei
   immer die Frage, **wann** ein Spieler sie bekommt — ein Drop-Slot ist kein Ereignis.
   AA beantwortet das: **arena-gebunden freigeschaltet**, mit Namen, Banner und
   „Unlocks:"-Feld.
2. **Der Wochen-Mutator-Vorschlag** (rotierende Regeländerung pro Woche, bisher nur
   mündlich, in keinem Dokument dieses Ordners festgehalten) wollte dasselbe erreichen:
   dieselben Maps sollen sich neu anfühlen. Der Unterschied ist die **Bindung**: Ein
   Wochen-Mutator ist an den **Kalender** gebunden, ein Map Objective an die **Arena**.

**Warum die Arena-Bindung besser ist.** Ein Wochen-Mutator trifft alle Spieler gleichzeitig
und ist damit reine Abwechslung — er belohnt nichts. Ein arenagebundenes Objective ist
**Fortschritt**: „Ab Arena 3 kann *Doom Clock* laufen" macht den Aufstieg zu einem
inhaltlichen Ereignis und nicht nur zu einer größeren Zahl. Genau das fehlt unserer Trophy
Road bisher — sie vergibt Gold, Packs und Material, aber sie verändert **nichts am Spiel**.
Und die Kosten sind lächerlich niedrig: Fünf Regelvarianten auf denselben Maps sind billiger
als eine neue Map.

**Empfehlung.**

* **Objectives als Arena-Feature statt als Wochen-Mutator.** Pro Arena 1-2 neue Objectives,
  freigeschaltet am Arena-Banner der Trophy Road. Im Matchmaking-Screen **vor** dem Match
  anzeigen, welches Objective läuft (AA zeigt es auf dem Home-Screen). **„Neutral"
  übernehmen** — nicht jedes Match braucht einen Modifier, sonst wird die Ausnahme zur
  Regel und der Grundmodus verlernt.
* **Fünf Objectives für den Start**, an unsere Mechanik angepasst:

  | Name | Regel | schaltet frei ab |
  |---|---|---|
  | **Neutral** | kein Modifier (Grundmodus) | Start |
  | **Zauberrausch** (AA: *Spell Frenzy*) | Held-Ult lädt doppelt so schnell | Arena 2 |
  | **Beutesegen** (*Bounty Bloom*) | jeder 5. Gegner lässt eine Zusatz-Handkarte fallen | Arena 3 |
  | **Endlos-Refresh** (*Endless Refresh*) | Hand-Refresh unbegrenzt statt 1×/Runde | Arena 4 |
  | **Doom Clock** | Matchdauer 5 statt 7 Minuten, Wellen 30 % schneller | Arena 5 |
  | **Direktkampf** (*Straight Combat*) | keine Straßenkarten — feste Strecke für beide | Arena 6 |

  *Endlos-Refresh* ist dabei der interessanteste: Er nimmt genau die Schranke weg, über die
  Punkt 2 dieses Dokuments diskutiert — und liefert damit **einen A/B-Test im laufenden
  Betrieb**, ohne dass wir die Grundregel anfassen müssen.
* **Curse-Karten arena-gebunden freischalten** statt sie einfach in den Drop-Pool zu
  schütten. Das ist Content-Tröpfelung im besten Sinn: Jede Arena bringt **eine** neue
  Störkarte, der Spieler lernt sie einzeln kennen statt sieben auf einmal, und die
  Trophy Road hat einen Grund, der nicht „mehr Zahlen" heißt. Reihenfolge-Vorschlag:
  **Sternenfall** (Arena 2, hängt an Punkt 3) → **Fluch der Schwäche** (Arena 3) →
  **Geisterköder** (Arena 4) → **Ketten der Bindung** (Arena 5) → **Arkane Hindernisse**
  (Arena 6).
* **Technisch:** Ein Objective ist ein Datensatz mit einer Handvoll Flags
  (`ultChargeMul`, `refreshLimit`, `matchSeconds`, `waveSpeedMul`, `pathCardsAllowed`) —
  keine Sonderlogik pro Objective, sondern eine Konfiguration, die der Match-Start liest.
  Die Freischaltung liest `ArenaProfile.get().trophies` gegen die Arena-Schwellen
  (dieselbe Tabelle wie §4 und `arena_fortress.js`).

**Aufwand: M** (Objective-Konfiguration + Matchmaking-Anzeige + Unlock-Banner) ·
**Priorität: 2**

---

## 9. Kampf-Juice (Freitag-Wiring)

> **Was das ist:** Fünf kleine Effekte, die zusammen den Unterschied zwischen „funktioniert"
> und „fühlt sich gut an" ausmachen. Alle fünf sind **rein visuell** — kein Balancing, keine
> Zahl im Spiel ändert sich. Genau deshalb sind sie ein Freitagnachmittag: Sie können nichts
> kaputtmachen, was ein Test abfangen müsste.
>
> **Warum das der beste Ertrag pro Stunde im ganzen Projekt ist:** Ein Spieler bewertet ein
> Match nicht nach seiner Mathematik, sondern nach dem Feedback im Moment des Treffers. AA hat
> hier deutlich mehr Substanz als unser Prototyp, und keiner der fünf Punkte braucht neue
> Assets.

**Vorhandene Anknüpfungspunkte in `arena_pan.html`:** `drawMergeFx()`, `drawMuzFx()`, die
Wellen-Schleife und `resolveEnd()`. Alles Folgende hängt an diesen Stellen — es kommt **keine**
neue Rendering-Ebene dazu.

### 9.1 Hit-Stop bei Kills (60–80 ms)

Der wirkungsvollste der fünf. Beim Tod eines Gegners wird die **Simulation** für 60–80 ms
angehalten, das Rendering läuft weiter. Der Treffer bekommt dadurch Gewicht — dieselbe Technik,
die jedes Beat-em-up benutzt.

```js
// oben, neben den übrigen Match-Variablen
var hitStopUntil = 0;
function hitStop(ms) { hitStopUntil = Math.max(hitStopUntil, performance.now() + ms); }

// im Update-Schritt, VOR jeder Bewegung/Timer-Logik:
var nowP = performance.now();
if (nowP < hitStopUntil) { draw(); requestAnimationFrame(loop); return; }   // nur zeichnen
```

Aufruf dort, wo ein Gegner stirbt (dieselbe Stelle, die schon `drawMuzFx()` auslöst):

```js
if (mob.hp <= 0) { hitStop(bossFlag ? 80 : 60); /* … bestehender Kill-Code … */ }
```

**Regeln:** nur bei **Kills**, nie bei normalen Treffern (sonst ruckelt das Spiel dauerhaft);
**nicht kumulieren** (`Math.max`, nicht `+=`); bei mehr als ~8 gleichzeitigen Kills überspringen,
sonst steht das Bild bei einer Bosswelle.

### 9.2 Screen-Shake bei Burg-Treffern

Nur, wenn die **eigene** Burg Schaden nimmt — Shake bei jedem Ereignis wird sofort zur Belästigung.

```js
var shake = 0;                       // Restdauer in ms
function addShake(ms, mag) { shake = Math.max(shake, ms); shakeMag = Math.max(shakeMag || 0, mag); }

// in draw(), vor dem Zeichnen der Welt:
if (shake > 0) {
  var k = shake / 220, a = Math.random() * Math.PI * 2, r = shakeMag * k;
  ctx.save();
  ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
  shake -= dtMs;
}
// … Welt zeichnen … dann:
if (shakeWasApplied) ctx.restore();
```

Stärke nach Schadenshöhe staffeln: normaler Durchbruch `addShake(160, 3)`, Boss-Treffer
`addShake(260, 7)`. **HUD außerhalb der Transformation zeichnen** — ein wackelnder Lebensbalken
sieht nach Bug aus, nicht nach Wucht.

### 9.3 Wellen-Abschluss-Feier

Der Moment, in dem eine Welle geräumt ist, ist aktuell stumm. Er ist der natürliche Taktgeber
des Matches und sollte ihn auch hörbar/sichtbar machen:

- kurzer **Lichtblitz** über die Bahn (dieselbe Mechanik wie `drawMergeFx()`, nur breiter und
  mit 200 ms Abklingzeit),
- **Wellennummer** groß und kurz eingeblendet („WELLE 7 GERÄUMT"), 700 ms, dann ausblenden,
- `UISfx.reward()` (existiert bereits im Hub, im Match auf die echte SFX-Engine mappen),
- bei **perfekter** Welle (kein Durchbruch) zusätzlich ein goldener Rahmenpuls.

Einbau in der Wellen-Schleife an der Stelle, an der `waveIndex++` passiert.

### 9.4 Kill-Streak-Popups

Zählt Kills **innerhalb eines 2-Sekunden-Fensters**. Ab 5 erscheint ein Text am oberen Rand,
der mit der Streak wächst:

| Kills im Fenster | Text | Farbe |
|---|---|---|
| 5 | **GUT!** | Weiß |
| 8 | **STARK!** | Gold |
| 12 | **VERHEEREND!** | Orange |
| 18 | **PRISMA-STURM!** | Violett + Partikel |

```js
var streakN = 0, streakUntil = 0;
function onKill() {
  var t = performance.now();
  if (t > streakUntil) streakN = 0;
  streakN++; streakUntil = t + 2000;
  var s = STREAK_TIERS.filter(function (x) { return streakN >= x.at; }).pop();
  if (s && s.at !== lastShownAt) { showStreakPopup(s); lastShownAt = s.at; }
}
```

**Wichtig:** Die Schwelle darf pro Streak nur **einmal** feuern (`lastShownAt`), sonst blinkt bei
18 Kills viermal derselbe Text.

### 9.5 Merge-Blitz im Match

`drawMergeFx()` existiert bereits für die Schmiede — im Match fehlt der Effekt komplett. Wenn ein
Turm im Spielfeld eine Stufe aufsteigt (Sternstufe aus §3), gehört derselbe Blitz auf das Feld:
kurzer radialer Ausbruch in der Raritätsfarbe der neuen Stufe, 300 ms, plus ein einzelner
Ring, der auf die Reichweite des Turms aufläuft. Das erklärt nebenbei die Reichweiten-Änderung,
ohne einen Tooltip zu brauchen.

### 9.6 Reihenfolge und Aufwand

| # | Effekt | Aufwand | Wirkung | Risiko |
|---|---|---|---|---|
| 1 | Hit-Stop | **S** (20 Zeilen) | sehr hoch | Frame-Loop anfassen |
| 2 | Screen-Shake | **S** | hoch | HUD-Transformation |
| 3 | Wellen-Feier | **S** | hoch | keins |
| 4 | Kill-Streak-Popups | **M** | mittel | keins |
| 5 | Merge-Blitz im Match | **S** | mittel | hängt an §3 |

**Empfehlung:** 1 → 3 → 2 → 4 → 5. Punkte 1–3 sind zusammen ein Nachmittag und liefern den
größten Teil des Effekts.

> **Ein Schalter für alles.** Alle fünf Effekte gehören hinter **eine** Einstellung
> („Bildschirmeffekte", Standard an) in den Einstellungen-View des Hubs. Hit-Stop und Shake sind
> für einen kleinen Teil der Spieler ein Barriere-Thema, und ein Sammelschalter ist billiger als
> fünf einzelne.

---

## 10. Offline-Erträge — GEBAUT am 30.07.2026

> **Status: umgesetzt.** `arena_offline.js` (41 eigene Prüfschritte) + Dialog im Prototyp
> + `pruefungen/offline.js` (42 Schritte, Browser).
>
> **Diese Sektion stand bis zum 30.07.2026 unter der Überschrift „VORSCHLAG, nicht gebaut".**
> Der Auftraggeber hat die Entscheidung überstimmt: *„Das ist irgendwie im Bau verlorengegangen
> die offline earnings. Das ist ein wichtiger Bestandteil um Gold und Materialien zu bekommen
> während man nicht spielt muss eingefügt werden."* Das ist eine Design-Entscheidung, keine
> Widerlegung — die drei Einwände unten waren richtig gestellt und mussten beim Bau
> **beantwortet** werden, statt zu verschwinden. Wie, steht in §10.3.

### 10.1 Was das Referenzspiel macht

**Beim Start** erscheint ein Panel „Offline Earnings" mit einer
Abrechnung der Zeit seit dem letzten Login:

| Element | Beobachtung |
|---|---|
| Ertragsrate | Gold **und** XP pro Stunde, abhängig vom Spielerfortschritt |
| Deckel | maximal **8 Stunden** Ansammlung |
| Boost | „Quick Earnings" — sofortige Zusatzstunden gegen **Werbevideo oder Gems** |
| Platzierung | eigenes Popup direkt nach dem Login-Kalender |

**Warum das mechanisch funktioniert:** Es macht *Abwesenheit* zur Ressource und liefert damit
einen Rückkehrgrund, der ohne Spielzeit auskommt. Der 8-h-Deckel erzeugt zusätzlich ein
weiches Sitzungsraster („zweimal am Tag reinschauen lohnt, dreimal nicht").

### 10.2 Die drei Einwände (Stand vor dem Bau, unverändert zitiert)

1. **Es steht quer zu unserer Ökonomie.** Gold ist bei uns der Endgame-Bottleneck und
   ausdrücklich *an Leistung* gekoppelt (Match-Gold, Siegesserie, Festungs-Senke,
   `DESIGN_PROGRESSION.md`). Eine Quelle, die Gold für Nichtstun ausschüttet, entwertet die
   Siegesserie und die Tagesquests gleichzeitig — also genau die beiden Systeme, die wir
   gerade erst als täglichen Loop etabliert haben.
2. **Wir hätten drei Start-Popups.** Login-Kalender, Angebotskette (`arena_vault.js`) und
   Offline-Earnings würden sich beim ersten Öffnen des Tages stapeln. Drei Popups vor dem
   ersten Tap sind der zuverlässigste Weg, einen Rückkehrer sofort wieder zu verlieren.
3. **„Quick Earnings" braucht Werbung.** Erzwungene oder belohnte Videowerbung ist im Projekt
   bisher bewusst ausgeschlossen (siehe „Was AA macht, das wir bewusst nicht übernehmen").
   Ohne Werbung bleibt nur der Gem-Kauf — und damit wäre das Panel eine reine Verkaufsfläche.

### 10.3 Wie die drei Einwände beim Bau beantwortet wurden

Der Auftrag lautete ausdrücklich **„Gold und Materialien"** — die alte Ausweichlösung
(„nur Material und XP, kein Gold") war damit vom Tisch. Gold ist drin. Die Einwände bleiben
trotzdem gültig, also musste jeder einzeln entschärft werden:

| Einwand | Antwort im Bau | Wo es steht |
|---|---|---|
| **1. Gold für Nichtstun entwertet die Tagesquests** | Die Rate ist **eine** Stellschraube (`RATEN.gold`), gemessen gegen den Tagesertrag der Quests. Ein **voller** Deckel bringt 8 × 1 100 = **8 800 Gold** und bleibt damit unter den **9 000** eines gespielten Tages. Nichtstun kann Spielen also nie schlagen. AA nimmt 1 400/h — wir bewusst weniger. | `arena_offline.js`, Selbsttestschritt „ein voller Deckel bleibt unter dem Tagesertrag der Quests" |
| **2. Drei gestapelte Start-Popups** | Der Dialog öffnet sich **von selbst überhaupt nicht**. Das Modul setzt nur eine **Marke** am Hub-Knopf; geöffnet wird er per Tap. Damit bleibt es bei zwei Start-Popups wie bisher. | `UIOffline.marke()`, Prüfschritt „ohne Guthaben ruft sie NICHT" |
| **3. „Quick Earnings" braucht Werbung** | Der Gem-Weg ist gebaut, der Werbe-Weg wird **ehrlich verweigert**: `quick("gratis", …)` gibt `{ok:false, grund:"keine_werbung"}` zurück, und der Dialog schreibt hin, dass die Anbindung fehlt — statt einen toten Knopf hinzustellen. Sobald ein Anbieter angebunden ist, ist es ein Einzeiler. | Prüfschritte „ohne gesehene Werbung liefert der Gratis-Weg nichts" / „der Dialog sagt dem Spieler, dass die Anbindung fehlt" |

### 10.4 Die gebauten Zahlen

| Größe | Wert | Begründung |
|---|---|---|
| Deckel | **8 h** | wie im Referenzspiel; erzeugt das weiche „zweimal am Tag"-Raster |
| Gold/h | **1 100** | siehe Einwand 1 — voller Deckel < Tagesquests |
| XP/h | **140** | AA: 160 |
| Material | Stufen bei 2/4/6/8 h → 20/40/60/80 | springt sichtbar, statt linear zu tröpfeln |
| Karten | Stufen bei 2/4/6/8 h → 1/2/3/4 | dito |
| Schnell-Ertrag | 120 min, 3× gratis + 3× für Gems pro Tag, 50 Gems | Gems-Preis, **kein** In-Game-Gold als Kaufwährung |

**Zwei Entscheidungen, die man beim Nachlesen leicht für Flüchtigkeitsfehler hält:**

1. **`claim()` setzt `seit = jetzt`, nicht `seit = jetzt − Überhang`.** Wer 20 h weg war,
   bekommt 8 h und die restlichen 12 h sind **weg**. Würde man den Überhang stehen lassen,
   wäre der Deckel zahnlos — man könnte ihn durch mehrfaches Abholen umgehen. Der Dialog sagt
   das offen: *„Du warst 20 h weg, angerechnet wurden 8 h."*
2. **`start()` überschreibt einen vorhandenen Zeitstempel nicht.** Sonst würde jeder Reload
   die gesammelte Zeit wegwerfen.

### 10.5 Was der ursprüngliche Vorschlag anders wollte

Der alte Absatz schlug vor, die Erträge **in den Login-Kalender einzufalten** statt einen
eigenen Dialog zu bauen. Das ist nicht umgesetzt: der Auftraggeber hat den Dialog des
Referenzspiels mit Screenshots vorgegeben (eigenes Panel, Video-Kopf, Belohnungsraster,
„Quick Earnings"). Der Popup-Einwand ist stattdessen über die Marke gelöst (Einwand 2) —
das Panel existiert, drängt sich aber nicht auf.

---

## 11. Pack-Sprengung — GEBAUT am 30.07.2026

Vorgabe: „der pack wird perfekt angezeigt nur die Animation passt nicht. wie
bekommen wir das genau so hin wie blizzard das macht?"

### 11.1 Warum es ein Werkzeugwechsel war und kein besserer Prompt

Drei Wege standen offen, zwei davon sind geprüft und verworfen:

| Weg | Warum er nicht reicht |
|---|---|
| **Kling** (Video) | Erfindet Bewegung aus einer Beschreibung. Man kann ihm nicht sagen „bei Bild 42 zerbricht das Pack in 40 Stücke". Jede Generierung ist eine Lotterie — für einen Ambient-Loop ideal (`off_loop` ist so entstanden), für eine taktgenaue, wiederholbare Zeremonie unbrauchbar. |
| **CSS** | Kann **kein additives Blending**. Das ist der eigentliche Grund, warum die alte Fassung milchig aussah statt heiß: überlappende Lichter müssen sich zu Weiß aufaddieren, und CSS kann Elemente übereinanderlegen, ihre Helligkeit aber nicht summieren. Dazu bricht es ab etwa 50 bewegten Knoten ein. |
| **Canvas** | Beides plus echte Physik, Tiefensortierung und Bewegungsunschärfe. Der Weg, auf dem Mobile-Games diese Effekte tatsächlich ausliefern. |

Der Kern des Griffs steckt in der Vorgabe selbst: das Pack **wird** perfekt
angezeigt. Also wird es nicht weggeblendet, sondern **zerlegt** — die Leinwand
schneidet genau das angezeigte Packbild in Bruchstücke. Deshalb sieht die
Sprengung nach *unserem* Pack aus und nicht nach einem Effekt von der Stange.

### 11.2 Die Bestandteile

| Art | Rolle | Warum sie nötig ist |
|---|---|---|
| **Splitter** | Stücke des Packbildes | Tragen das Artwork. Ohne sie ist es ein Effekt über dem Pack, nicht das Pack. |
| **Funke** | schneller heller Streifen mit Schweif | Kein Gewicht — Licht fällt nicht. Das ist der Unterschied zu Konfetti. |
| **Glut** | langsam, schwer, fällt | Gibt der Szene Boden. |
| **Staub** | fast unsichtbar, treibt | Nimmt der Luft die Leere. |
| **Welle** | genau **eine** Druckwelle | Zwei Wellen lesen sich als Fehler, nicht als Wucht. |

Eine Sprengung nur aus Funken liest sich als Feuerwerk, eine nur aus Splittern
als Unfall. Erst die Mischung liest sich als „etwas Wertvolles bricht auf".

### 11.3 Der Bruchfächer

Die erste Zerlegung war ein **Raster** — rechteckige Ausschnitte. Alle
Messungen grün, und es sah aus wie Konfetti: **Glas bricht nicht in
Rechtecke.** Jetzt laufen vom Einschlagpunkt Risse nach außen, mit einem
Ringriss dazwischen; je Sektor drei Dreiecke, die den Sektor lückenlos
abdecken. Die Sektorgrenzen sind ungleich gestreut (ein gleichmäßiger Fächer
gäbe Tortenstücke) und der Ringriss liegt je Sektor auf einem anderen Radius
(ein fester Radius zeichnet einen sichtbaren Kreis mitten durchs Bild). Jedes
Stück bekommt eine aufgehellte **Bruchkante** — der eine Strich, der aus einer
Fläche ein Stück Material macht.

Die Wucht kommt aus dem **Abstand zum Einschlag**, nicht aus dem Zufall: ein
Randstück fliegt mit 1,30, das Mittelstück mit 0,49.

### 11.4 Der Vorbeiflug — der teuerste Griff

Ein Fünftel der Stücke fliegt **an der Kamera vorbei**: ein Stück des Packs
wird kurz bildschirmgroß und ist weg. Das holt den Zuschauer in die Szene,
statt sie ihm vorzuspielen.

Zwei Zahlen daran sehen falsch aus und sind es nicht:

* Die Vorwärtsgeschwindigkeit steht bei **7 bis 11,5**, nicht bei 2. Der
  Luftwiderstand von 0,88 je Sechzigstel bremst so hart, dass der gesamte Weg
  nach vorn nur `vz / 7,67` beträgt. Beim ersten Versuch (1,5 bis 2,4)
  erreichte **kein einziges** Stück die Kamera.
* Die Seitwärtsgeschwindigkeit der Vorbeiflieger ist auf **22 %** gebremst.
  Grund ist die Projektion: dieselbe Perspektivskala, die ein Stück groß
  macht, schiebt seine Bildlage nach außen. Ohne die Bremse war jedes Stück
  aus dem Bild heraus, *bevor* es groß wurde — der Effekt war messbar
  vorhanden und auf dem Bildschirm nicht zu sehen.

### 11.5 Zwei Ebenen, zwei Räumarten

| Ebene | Inhalt | Räumung |
|---|---|---|
| `#pkFx` | Licht (Funken, Glut, Staub) | Schweif: `destination-out` löscht 34 % Deckkraft je Bild |
| `#pkFx2` | Material (Splitter, Welle) | jedes Bild vollständig gelöscht |

Ein Funke ohne Schweif ist ein Punkt; ein Splitter *mit* Schweif hinterlässt
einen Stapel hartkantiger Kopien, der wie eine ruckelnde Bildrate aussieht.
Gebrochenes Glas ist scharf, nicht verschmiert.

Der Schweif lief zuerst als **dunkles Rechteck** über die ganze Leinwand. Nach
drei Bildern war die Leinwand praktisch undurchsichtig, und weil sie über der
Bühne liegt, war die Szene ab 2,4 s ein schwarzes Loch — die einfliegenden
Karten, also genau das, wofür das Pack gekauft wurde, lagen dahinter.
`destination-out` **löscht** Deckkraft statt Dunkel aufzutragen; wo nichts
ist, bleibt die Leinwand durchsichtig.

### 11.6 Bildrate

Der Zeitschritt war bei 0,05 s gedeckelt. Bricht die Bildrate unter 20 ein,
konnte die Szene je Bild nur 0,05 s Teilchenzeit aufholen und lief damit in
**Zeitlupe** bis hinter die Kartenlandung — sie verlor Tempo statt Bilder,
also die falsche Richtung. Der Deckel liegt jetzt bei 0,25 s. Möglich ist das
erst durch **exakte Wegintegration** statt eines Euler-Schritts: für
`v(t) = v₀·k^t` ist der Weg `v₀·(k^Δt − 1)/ln k`. Die Abweichung zwischen 15
und 60 Bildern je Sekunde liegt damit bei 0,000000 statt 0,079.

Dazu drei Sparmaßnahmen: vorgerechnete Lichtpunkt- und Streifen-Vorlagen statt
eines Verlaufsobjekts je Teilchen je Bild (rund 230 Stück, sechzigmal je
Sekunde), Leinwandüberstand von 150 % auf 120 % (−36 % Bildpunkte) und
Gerätepixel-Deckel von 2 auf 1,5 (−44 %). Vertretbar ist der Deckel nur hier,
weil auf dieser Ebene ausschließlich weiche Lichter und bewegte Bruchstücke
liegen — für Schrift oder Rahmen wäre er falsch.

**Nicht belegt:** eine Bildrate auf dem Gerät. Die Entwicklungsumgebung hat
keine Grafikeinheit und rastert in Software; ihre Zahlen (20 bzw. 3 Bilder je
Sekunde) sagen über ein Telefon mit GPU nichts aus. Belegt ist nur die
**Reihenfolge** der Kosten: was ganzflächig je Bild passiert, dominiert. Eine
echte Zahl braucht ein echtes Gerät.

### 11.7 Zwei Nebenfunde

**„Überspringen" war ein toter Knopf.** Er stand seit dem ersten Entwurf im
Markup, gestylt und sichtbar, ohne jeden Zuhörer. Aufgefallen, als die Prüfung
die Szene mitten im Flug schließen wollte und keinen Weg dafür fand. Er
überspringt jetzt die **Zeremonie**, nicht die Belohnung: Deck sofort
schwebend, alle Karten offen, Beute-Übersicht — schließen tut der Spieler
selbst.

**Der doppelte Reveal.** Nach dem Umbau der Szene deckte der Spieler jede
Karte einzeln auf, sah die Beute-Übersicht — und wurde dann im Raster
gebeten, *dieselben* Karten noch einmal anzutippen. Die Szene hatte den
Reveal übernommen, das Raster hatte es nicht mitbekommen. Wichtig dabei:
`doFlip()` ist nicht nur Kosmetik, sondern die **Buchung**; wer die Kacheln
nur als aufgedeckt zeichnet, nimmt dem Spieler den Inhalt des Packs weg. Der
stille Buchungszweig (`flip(i, null)`) steckte schon im Code und war nie
benutzt.

### 11.8 Prüfung

`arena_packfx.js` prüft die Physik ohne Browser (28 Schritte, `node
arena_packfx.js`); `pruefungen/packsprengung.js` das Zusammenspiel mit Szene
und Bild (25 Schritte). Determinismus ist Pflicht, nicht Komfort: kein
`Math.random()`, der Zufall kommt aus einem Startwert. Sonst ist ein
Standbildvergleich unmöglich, und ein Fehler, der nur bei einer bestimmten
Streuung auftritt, nicht reproduzierbar.

Sechs der oben beschriebenen Fehler waren **gemessen grün** und sind erst beim
Ansehen bei dreifacher Auflösung aufgefallen; zwei umgekehrt nur durch Zählen
und nie durch Ansehen. Beide Richtungen stehen als Schritte in den Prüfungen,
und beide Suiten sind gegen sechs Mutationen gehalten.

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
| 8 | **Map-Objectives + Curse-Karten arena-gebunden** | „Unlocks:" pro Arena-Banner, Modifier „Neutral" | M | **2** |
| 9 | **Kampf-Juice** (Hit-Stop, Shake, Wellen-Feier, Kill-Streaks, Merge-Blitz) | rein visuell, kein Balancing | S–M | **2** |

**Reihenfolge-Empfehlung:** 1 → 3 → 2 → 4 → 5 → 6 → (7 später).
**Punkt 8 hängt an Punkt 3** (die erste Curse-Karte *Sternenfall* braucht die Sternstufen)
und an der korrigierten Arena-Tabelle aus §4 — sinnvoll direkt nach 3 und 4 einzuplanen.
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

---

## 12. Wellen-HP und Turmschaden liegen nicht auf derselben Skala (29.07.2026)

> ### ⚠ AUSGESETZT (30.07.2026)
>
> Ansage des Auftraggebers: *„Das System von Monster Waves und Jo usw
> wird neu gebaut, also derzeit nicht relevant kalkulierbar."*
>
> Der **Befund** bleibt gültig — die beiden Kurven passten nicht
> zusammen, und das war unabhängig von der Ursache messbar. Die
> **Empfehlungen** darunter sind es nicht mehr: sie rechnen gegen eine
> Wellenkurve, die es so nicht mehr geben wird, und eine davon nimmt die
> ★1→★5-Achse als Stellschraube an, die es bei uns nie gab (§3).
>
> Wenn die neue Wellenkurve steht, gehört diese Rechnung **einmal neu
> aufgestellt** — mit denselben zwei Fragen, die dafür beantwortet sein
> müssen: Ist die Wellen-HP **pro Bahn oder gesamt**, und **wie viele
> Türme** stehen am Ende eines echten Matches? Ohne die beiden Zahlen ist
> jede Skalenaussage geraten.
>
> Bis dahin: **nicht danach bauen.**


**Gemessen, nicht geschätzt.** `arena_waves.js` gegen die Turm-Stats aus
`ui_prototype.html` `CARDS`, Matchlänge 7 min / 27 Wellen = 15,6 s je Welle
(§1). Ein Turm auf Lv 20 leistet im Mittel **136,5 DPS**
(90,3 Grund-DPS × `statMul(20)` = 1,512):

| Welle | Gesamt-HP | nötige DPS | Türme Lv 20 | … mit ★5 (×1,94) |
|---|---:|---:|---:|---:|
| 5 | 19 454 | 1 247 | 10 | **5** |
| 12 | 360 556 | 23 113 | 170 | **88** |
| 18 (Boss) | 1 680 249 | 107 708 | 789 | **407** |
| 27 (Boss) | 5 870 969 | 376 344 | 2 757 | **1 422** |

Ab Welle 5 ist die Rechnung noch plausibel. Ab Welle 12 nicht mehr: 88 Türme
auf ★5 sind keine Spielsituation, die es geben kann.

> **⚠ Eine Vermutung ausdrücklich ausgeräumt.** Bei der ersten Sichtung lautete
> der Verdacht, es fehle „eine In-Match-Ausbaustufe, die nirgends dokumentiert
> ist". **Das stimmt nicht** — sie ist dokumentiert, direkt hier in §1
> (Match-Gold + Upgrade-Knopf) und §3 (Sternstufen). Sie ist nur (a) bei uns
> deaktiviert und (b) **um Größenordnungen zu klein**, um die Lücke zu
> schließen: ★1 → ★5 sind vier Schritte à +18 %, zusammen **×1,94**. Das
> halbiert die nötige Turmzahl und ändert an Faktor 28 nichts.
>
> Der Unterschied ist wichtig, weil er die Richtung der Reparatur bestimmt.
> Wären die Sternstufen die Lösung, müsste man §3 umsetzen. Da sie es nicht
> sind, muss **eine der beiden Zahlenwelten neu skaliert werden**.

**Wo die Ursache steckt.** Die HP-Kurve ist `HP(L) = 250 + 30 · L^2.5`
(`arena_waves.js`), die Wellen-Gesamt-HP wächst von Welle 1 (756) bis Welle 27
(5 870 969) um **Faktor 7 766**. Die Turmseite wächst über die ganze
Meta-Progression um `statMul(100)` = **8,62** plus Merge-Boni (grob ×1,25).
Zwei Kurven mit derart verschiedener Steigung können nicht auf einem gemeinsamen
Board zusammenkommen — unabhängig davon, welche Zahl man einzeln dreht.

**Was das NICHT ist:** kein Fehler in `arena_waves.js` für sich. Die Kurve ist
in sich schlüssig und aus AA-Videomaterial abgeleitet (Gegner-HP-Wachstum §... ).
Sie ist nur nie gegen unsere eigenen Turmzahlen gerechnet worden.

**Was als Nächstes zu klären ist — bevor irgendjemand einen Playtest ansetzt:**

1. Ist die Wellen-Kurve als **Gesamt-HP je Welle** gemeint oder als HP **je
   Bahn/je Spieler**? Bei zwei Spielern und geteilten Bahnen ändert sich der
   Nenner, aber nicht die Größenordnung.
2. Wieviele Türme stehen in einem echten Match am Ende auf dem Board? Diese Zahl
   steht nirgends fest und ist der wichtigste fehlende Parameter.
3. Erst danach: `HP_COEFF`/`HP_EXP` senken **oder** die `CARDS`-Schadenszahlen
   anheben. Nicht beides gleichzeitig, sonst weiß hinterher niemand, welche
   Änderung gewirkt hat.

**Folge für alles, was jetzt entworfen wird:** solange die Skala offen ist, sind
absolute Schadenswerte nicht kalibrierbar. Die vier Spells in `DESIGN_SPELLS.md`
sind deshalb bewusst skalenfrei angegeben — als Prozent der Maximal-HP oder in
derselben Einheit wie die `CARDS`-Stats. Wer die Turmzahlen mit einem Faktor
multipliziert, multipliziert die Spells automatisch mit.

**Aufwand: M** · **Priorität: 1** (blockiert jeden belastbaren Playtest)

---

## 13. Die UI hing an einem fremden Host (30.07.2026)

**Befund vom Auftraggeber:** „Wieso sind Images und icons nicht in der Version?
Es muss irgendwo eine fertige Version mit Icon Images und Videos sein."

Beides war richtig. Die fertigen Bilder gab es — sie lagen nur nicht dort, wo die
Seite sie gesucht hat.

### Was gemessen wurde

`ui_prototype.html` löste sein Asset-Manifest auf `https://…cloudfront.net/…` auf:
**226 Einträge, davon 218 auf einen fremden Host** — Icons, Rahmen, Kartenbilder,
Bandgrafiken, die zehn `.mp4` und die sechs `.mp3`. Gleichzeitig lagen **229
dieser Dateien byte-geprüft im Repo**, unter `arena_patches/assets/`, mit Quell-URL,
Größe und SHA-256 je Datei in `assets/HERKUNFT.json`.

Der Kommentar über dem Manifest beschrieb den Umbau sogar schon:

> „Für die echte App die Dateien nach `public/assets/` herunterladen und
> `ASSET_BASE` unten auf `./assets/` umstellen."

Die Dateien wurden geholt. Der Schalter wurde nie umgelegt. Damit entschied ein
Dritter darüber, ob die UI Bilder hat — auf der Higgsfield-Vorschau kamen sie an,
auf GitHub Pages nicht.

### Warum es so lange unentdeckt blieb

Das ist der interessantere Teil. **Jede** Prüfung in `pruefungen/` hatte den Satz
„örtlich lädt kein Bild (kein CDN)" als Normalzustand eingebaut und filterte
Konsolenfehler mit `.png`, `.mp4`, `.mp3` oder `cloudfront` im Text weg. Das war
richtig, solange die Bilder gar nicht im Repo lagen. Ab dem Moment, in dem sie
dort lagen, war es ein Filter, der echte 404 verschluckt.

Zwei Prüfschritte gingen weiter und schrieben den kaputten Zustand als
**Anforderung** fest:

* `run_v5.js`: „Emoji-Fallback greift bei blockiertem CDN" verlangte
  `span.ico > 10` — grün nur, solange keine Bilder ankamen.
* `run_v5.js`: „Upgrade-Kosten mit Währungszeichen sichtbar" suchte 🪙 im
  `textContent`. Das Zeichen stand dort nur als Emoji-Rückfall.

Beide wurden rot, als die Bilder zu laden begannen — also **wegen der
Verbesserung**. Ein Schritt, der eine Verbesserung als Fehler meldet, wird beim
nächsten roten Balken weggeklickt und schützt danach nichts mehr. Beide sind
umgeschrieben: sie prüfen jetzt die Zusage („fällt ein Icon aus, steht sein Emoji
da"; „neben der Zahl steht ein Währungszeichen") mit **erzwungenem** Ausfall statt
mit gesperrtem Netz.

### Der Umbau

`ASSET_BASE = "./assets/"`, danach löst eine Schleife jeden Schlüssel auf
`./assets/<schlüssel>.<endung>` auf. Das geht ohne zweite 227-zeilige Tabelle,
weil `assets_sichern.py` jede Datei nach ihrem Schlüssel benennt; die **21**
Nicht-`.webp`-Endungen stehen in `ENDUNG`.

Drei Dinge sind Absicht:

1. **`NUR_CDN`** — die 8 Schlüssel, die nicht gesichert werden konnten, behalten
   ihre CDN-Adresse und bleiben genau so zerbrechlich wie vorher. Jeder Eintrag
   ist in `assets/NICHT_ERREICHBAR.json` datiert und begründet. Die Prüfung
   verlangt diese Begründung, damit die Liste nicht still wächst.
2. **`?cdn=1`** schaltet zurück aufs CDN. Fehlt ein Bild, unterscheidet dieser
   Schalter in einem Griff „Datei fehlt im Repo" von „Bild ist auch an der Quelle
   kaputt".
3. **`ASSETS_CDN`** behält die Originaladressen im Speicher — die Herkunft
   verschwindet nicht aus dem laufenden Programm.

### Was daran messbar besser ist

| | vorher | nachher |
|---|---|---|
| Bilder mit Pixeln, Shop | 0 von 89 | **89 von 89** |
| Bilder mit Pixeln, 6 Ansichten | 0 | **170 von 170** |
| Assets von einem fremden Host | 218 | **8** (alle begründet) |
| Funktioniert offline / ohne CDN | nein | **ja** |

75 MB liegen damit im Repo, 56 MB davon die zehn Videos. Für GitHub Pages
unkritisch (Grenze 1 GB). **Offen und bewusst nicht angefasst:** die
Karten-Loops sind 3,5–6,4 MB pro Datei. Auf dem Mobilfunknetz ist das viel für
eine Kachelanimation; sobald echte Nutzer messbar sind, gehört das gegen die
Ladezeit gerechnet — nicht vorher nach Gefühl.

**Aufwand: S** · **Priorität: 1** (war der sichtbarste Fehler der Live-Fassung)

---

## 14. Der Kristalltresor war das schlechteste Geschäft im Spiel (30.07.2026)

**Vorgabe des Auftraggebers:** „dieser Beutel soll im Verhältnis bisschen günstiger sein wie
ein normaler Kristall Kauf weil man für den Beutel auch aktiv spielen muss zum füllen
(animiert um mehr zu spielen und macht den Beutel attraktiver)."

### Der Befund

Nachgerechnet gegen die Ladenstaffel (§27.2), Preis je Kristall:

| Kapazität | Tresor **alt** | Laden bei dieser Paketgröße |
|---:|---:|---:|
| 150 | 3,33 ct | 1,69 ct |
| 300 | 3,16 ct | 1,10 ct |
| 600 | 3,00 ct | 0,79 ct |
| 1 200 | 2,75 ct | 0,75 ct |
| 2 400 | 2,50 ct | 0,72 ct |

Der Tresor war an **jeder** Stufe das teuerste Angebot im Spiel — für Kristalle, die der
Spieler sich vorher **selbst erspielt** hat. Das ist nicht nur ein Preisfehler, es ist die
Umkehrung der Mechanik: `arena_vault.js` beschreibt sie im Kopf als *„nicht ‚möchtest du
Gems?', sondern ‚möchtest du DEINE bereits erspielten Gems?'"*. Wer dafür mehr verlangt als
der Laden, bestraft genau das Verhalten, das die Mechanik anregen soll.

Dazu rechnete der Tresor in **€**, während der ganze Shop in **Fr.** rechnet. Zwei Währungen
auf einem Bildschirm sind kein Schönheitsfehler — sie machen jeden Preisvergleich falsch,
den der Spieler anstellt.

### Die neue Staffel

| Kapazität | Preis | ct/Kristall | Laden | Vorteil | Siege zum Füllen |
|---:|---:|---:|---:|---:|---:|
| 150 | Fr. 1.90 | 1,27 | 1,69 | −25 % | ~43 |
| 300 | Fr. 2.90 | 0,97 | 1,10 | −12 % | ~86 |
| 600 | Fr. 3.90 | 0,65 | 0,79 | −18 % | ~172 |
| 1 200 | Fr. 6.90 | 0,57 | 0,75 | −23 % | ~343 |
| 2 400 | Fr. 13.50 | 0,56 | 0,72 | −22 % | ~686 |

Die Regel dahinter, und **so misst `pruefungen/tresor.js` sie auch**: der Preis je Kristall
liegt an jeder Stufe unter dem, was der Laden für eine Packung **derselben Größe** nimmt, und
er sinkt mit jeder Stufe. Die Ladenkurve wird dabei nicht abgeschrieben, sondern aus
`GEM_PACKS` gelesen und log-log interpoliert — ändert jemand die Ladenpreise, wandert die
Prüfung mit. Eine abgeschriebene Kurve wäre beim ersten Preiswechsel eine Lüge mit grünem
Balken.

### Die Füllzeit — entschieden am 30.07.2026: 8 → 30 je Sieg

> „Den Tresor würde ich höher schrauben das pro Sieg 30 Kristalle reinkommen oder meinst du
> das ist Zuviel/zuwenig?"

**Antwort: 30 ist richtig — aber als *oberes* Ende der Staffelung, nicht flach.**

Zuerst das, was die Zahl **nicht** tut: Sie ändert **nichts am Gegenwert**. Preis und
Kapazität je Stufe bleiben, der Tresor kostet weiter 1,27 ct (Stufe 0) bis 0,56 ct (Stufe 4)
je Kristall. Sie steuert allein, **wie oft das Angebot überhaupt erscheint**.

Gerechnet mit **3–4 Siegen je Sitzung** — die Zahl ist nicht geschätzt, sie steht in
DESIGN_CLAN §6.2 und trägt dort schon das ±25-Fenster der Rangliste — und zwei Sitzungen
am Tag:

| Stufe | Kap. | Preis | alt (2–5) | flach 30 | **neu (8–30)** |
|---|---|---|---|---|---|
| 0 | 150 | 1,90 | 75 Siege · 11 Tg | 5 Siege · 0,7 Tg | **19 Siege · 2,7 Tg** |
| 1 | 300 | 2,90 | 100 Siege · 14 Tg | 10 Siege · 1,4 Tg | **21 Siege · 3,1 Tg** |
| 2 | 600 | 3,90 | 150 Siege · 21 Tg | 20 Siege · 2,9 Tg | **29 Siege · 4,1 Tg** |
| 3 | 1200 | 6,90 | 300 Siege · 43 Tg | 40 Siege · 5,7 Tg | **50 Siege · 7,1 Tg** |
| 4 | 2400 | 13,50 | 480 Siege · **69 Tg** | 80 Siege · 11,4 Tg | **80 Siege · 11,4 Tg** |

**Warum der alte Wert zu niedrig war:** ein Angebot, das rechnerisch zweimal im Jahr
erscheint, ist unabhängig vom Preis wirkungslos. Die Stufen 3 und 4 waren praktisch
unerreichbar.

**Warum flach 30 zu viel wäre:** Stufe 0 füllt sich dann in **fünf Siegen**, anderthalb
Sitzungen. Der Spieler steht danach dauerhaft am Anschlag, und dort gilt „jeder weitere Sieg
verpufft" — die Mechanik, die das Spielen belohnen soll, bestrafte es dann die meiste Zeit.
Ausgerechnet in Stufe 0 lernt der Spieler aber erst, was der Tresor ist.

**Warum die 30 trotzdem genau dort steht, wo sie zählt:** Die Stufen 0–3 durchläuft man
**einmal**, in Stufe 4 **lebt** man dauerhaft. 2400 / 30 = 80 Siege, also rund **alle elf
Tage ein 13,50-Angebot**. Das ist die Taktung, die entscheidet.

Umgesetzt über die Arena-Staffelung, die schon existierte — das war oben Option 1 und musste
nur gespreizt werden: `WIN_GEMS_MIN = 8`, `WIN_GEMS_MAX = 30` (A1:8 · A2:11 · A3:14 · A4:17 ·
A5:21 · A6:24 · A7:27 · A8:30). Die Kapazitäten bleiben unangetastet, `tresor.js` bleibt grün.

#### Sieben Stellen hatten die alte Zahl eingefroren

Alle sieben waren rot, ohne dass am Tresor etwas kaputt war:

| Stelle | Was eingefroren war |
|---|---|
| `arena_vault.js` ×4 | `gained === 2`, `Math.ceil(148 / 2)`, „→ 82 Gems", `+ 5` |
| `arena_vault.js` Schrittname | „laufen von 2 (Arena 1) bis 5 (Arena 8)" — die Prüfung las die Quelle, nur der **Name** log. Er wurde grün angezeigt. |
| `arena_vault.js` `state()` | Badge fest auf 2. Sie war nur 2, weil 10 Siege den Tresor beim alten Zuwachs nicht füllten — eine **ungesagte Annahme**, keine Zusage. |
| `run_v6.js` | `/\+\d Gems je Sieg/` fror die **Stellenzahl** ein und war rot bei „+17". |

Dazu der **Demo-Seed**: `reportEvent("win", 34)` ergab nur beim alten Zuwachs den Stand
102/150. Danach war die Demo dauerhaft „VOLL — jeder weitere Sieg verpufft" und zeigte den
Füllstand gar nicht mehr — im Prototyp wie in jeder Vorführung. Der Seed nennt jetzt das
**Ziel** (gut zwei Drittel der ersten Stufe) und rechnet die Siege daraus aus.

**Aufwand: S** (erledigt) · **Priorität: 1** · Füllzeit entschieden
