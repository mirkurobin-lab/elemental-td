# Karten-Progression & Booster-Packs (AA-Modell)

**Status:** Design-Spezifikation, implementiert in `arena_patches/arena_cards.js` (Logik-Modul,
`node arena_patches/arena_cards.js` = Selbsttest). Alle Zahlen in diesem Dokument sind die
Quelle der Wahrheit für das Modul — Änderungen hier **und** dort nachziehen.

**Ersetzt:** die Splitter-Ökonomie aus `arena_profile.js` (`shardsBank`, `PACK_SHARDS`,
`LOSS_SHARDS`, `applyShardsToHub()`) und die Match-Skalierung `metaMul = 1.12^(lvl-1)`
in `arena_pan.html`.

---

## A) Design-Philosophie

Eine Karten-Sammel-Progression bindet, weil sie vier Belohnungsformen übereinanderlegt, die
jeweils auf einer anderen Zeitskala wirken:

1. **Schnelle Frühphase-Levels = tägliche Dopamin-Hits.** Ein Gewöhnlich-Level kostet 2 Kopien.
   Wer eine halbe Stunde spielt, geht mit mehreren Level-Ups aus der Session — die Sitzung hat
   *immer* etwas verändert, auch nach einer Pechsträhne im PvP.
2. **Sichtbare Fast-Fertig-Balken = Near-Miss.** Jede Karte trägt ihren Fortschrittsbalken
   *dauerhaft* im Collection-Grid. „Noch 3 Kopien bis EPISCH" ist der stärkste Rückkehrgrund,
   den ein Mobile-Spiel hat — stärker als jede Push-Nachricht, weil der Spieler die Zahl selbst
   gelesen hat.
3. **Raritäts-Aufstiege = Status-Momente.** Der Wechsel Grün → Blau ist selten genug, um ein
   Ereignis zu sein, und optisch laut genug (Rahmenfarbe, FX, Perk-Wahl), um erinnert zu werden.
   Der Kartenrahmen ist ein permanentes, sichtbares Statussymbol im eigenen Deck.
4. **Pack-Öffnung = variable Belohnung.** Die Bündelgröße pro Slot ist unbekannt, bis die Karte
   umgedreht wird. Genau dieser Moment — nicht das Match — ist der Kern der Retention.

**Fairness & Transparenz.** Die Drop-Raten stehen **im Spiel**, nicht in einem PDF: ein
Info-Button auf jedem Pack zeigt die vollständige Qualitäts-Tabelle inkl. Garantie und der
Pity-Schwellen in Klartext. Das ist in der EU ohnehin Pflichtpraxis und in AAA-Titeln Standard,
und es kostet nichts — im Gegenteil, offene Raten erhöhen die Zahlungsbereitschaft, weil sie
Misstrauen aus dem Kauf nehmen. Ebenso gilt: **kein Pay-to-lose-Matchmaking.** Gegner werden
nach Trophäen (und später Karten-Power-Score) gepaart, nie danach, wer wahrscheinlich zahlt oder
wer gerade eine Niederlage „gebrauchen kann". Der Bot-Drift aus `arena_rivals.js` greift
weiterhin ausschließlich am Bot-HP-Drain, nie an Spielerwerten.

---

## Verifizierte AA-Referenz (Web-Recherche 2026-07-24)

Belegte Fakten zum echten Vorbild **„Arcane Arena: Tower Defense TD"** (Panteon / MWM,
`com.panteon.arcanearena`). Was hier steht, ist Recherche-Stand — was in den übrigen Kapiteln
steht, ist unser Design.

| Fakt | Beleg / Status | Konsequenz für uns |
|---|---|---|
| Raritäten **Epic, Legendary, Relic, Supreme** existieren | über Achievements belegt („first Epic card", „first Legendary card", „first Relic card", „first Supreme card") | Wir übernehmen die Namen. Die beiden unteren Stufen sind **nicht** öffentlich dokumentiert — **Common / Rare** ist unsere plausible Annahme. |
| **Drei getrennte Upgrade-Währungen**: Turm-Karten („tower cards earned from PvP battles"), Skill-Karten („upgrade your skills with skill cards"), Helden-**Shards** („upgrade heroes with hero shards") | Store-Beschreibungen | **Bewusste Abweichung:** Wir führen Helden als normale Karten im selben System (nur 5× seltener). Ein Held braucht dadurch keinen eigenen Währungs-Track, keine eigene UI, keine eigene Drop-Tabelle. Skill-Karten sind als *dritter Track* vorgemerkt (siehe „Spätere Ausbaustufen"). |
| **Clan-System mit Karten-Donations** („request donations to power up towers faster, donate to earn gold") | Store-Beschreibung | Phase-3-Feature. Der soziale Hebel liegt darin, dass **Geben** mit Gold belohnt wird — Schenken wird zur eigenen Progression. |
| Zweitwährung **Gems** + Monats-Abo („Royal Monthly Letter": 1200 Gems sofort + 300/Tag) | Store / Shop | Nur Monetarisierungs-Referenz. Für uns „später" — unser Design ist zunächst rein F2P-Ökonomie. |
| Season läuft über **Medals** (Quests sammeln Medaillen über die Saison) | Store-Beschreibung | Begriff übernommen: unsere Season-Währung heißt **Medaillen**. |
| **Beide Spieler bekommen identische Wellen** („face identical waves in fair, real-time duels"), **3 zufällige Turm-Karten pro Runde** | Store-Beschreibung | Deckt sich exakt mit unserer 3-Karten-Hand. Die identischen Wellen sind ein Fairness-Prinzip, das wir in §E festschreiben. |
| **„Trick cards"** als Kern-Feature fürs Disruption-Play | Store-Beschreibung | Bestätigt unseren Curse-Karten-Plan — nicht optional, sondern Kern-Loop des Vorbilds. |
| **Arenen / Maps / Chapters** schalten sich über Spieler-Level bzw. Trophäen frei; PvP-Leaderboard vorhanden | Store-Beschreibung | Deckt sich mit unserer Trophy-Road (Arena-Unlocks bei 250 / 700). |

**Quellen:**
- https://www.exophase.com/game/arcane-arena-tower-defense-td-apple/achievements/
- https://play.google.com/store/apps/details?id=com.panteon.arcanearena
- https://apps.apple.com/us/app/id6746447166
- https://mwm.ai/apps/arcane-arena-tower-defense-td/6746447166
- https://apkpure.net/arcane-arena-tower-defense-td/com.panteon.arcanearena

---

## B) Karten-Level-System (Level 1–100)

Es gibt **keine** separaten Raritäten pro Karte. Die Rarität **ist** ein Level-Band derselben
Karte: jede Karte startet gewöhnlich und arbeitet sich durch die Farben nach oben. Das hält den
Pool klein, macht jede gedroppte Kopie relevant und erzeugt die Aufstiegs-Momente.

| Stufe | Farbe | Hex | Level | Kopien pro Level-Up | Gold pro Level-Up |
|---|---|---|---|---|---|
| Gewöhnlich | Grau | `#9aa3ad` | 1–19 | 2 | 30 × lvl |
| Selten | Grün | `#58c26a` | 20–39 | 4 | 45 × lvl |
| Episch | Blau | `#3d9df2` | 40–59 | 8 | 60 × lvl |
| Legendär | Lila | `#a45ef2` | 60–79 | 15 | 80 × lvl |
| Relikt | Orange | `#f2a13d` | 80–99 | 25 | 100 × lvl |
| **Suprem** | Rot / Prismatisch | `#ff5e7e` | 100 | 50 **+ 1 Arkan-Kern** | 15 000 |

Die Kosten-Zeile gilt für den Level-Up, der **von** einem Level dieses Bandes ausgeht:
Lv19 → 20 kostet noch 2 Kopien, Lv20 → 21 bereits 4.

**Gesamtkosten einer Karte von Lv1 auf Lv100:**

| Band | Kopien | Gold |
|---|---|---|
| Gewöhnlich (19 Level-Ups × 2) | 38 | 5 700 |
| Selten (20 × 4) | 80 | 26 550 |
| Episch (20 × 8) | 160 | 59 400 |
| Legendär (20 × 15) | 300 | 111 200 |
| Relikt (20 × 25) | 500 | 179 000 |
| **Summe bis Lv100** | **1 078** | **381 850** |
| Suprem-Aszension | 50 + 1 Arkan-Kern | 15 000 |
| **Gesamt** | **1 128** | **396 850** |

Der **Arkan-Kern** ist ein Season-/Mastery-Item (Season-Pass Stufe 50 free / 30 premium,
Event-Belohnung) — kein Drop aus Packs. Er ist der harte Deckel auf der Endphase: selbst wer
alle Kopien hat, kann pro Saison nur begrenzt viele Karten auf Suprem heben. Das ist der
Ort, an dem die Progression bewusst **vom Zeitfluss statt vom Grind** gebremst wird.

### Stat-Kurve

```
statMul(lvl) = 1.018^(lvl-1) × 1.10^tierIndex        tierIndex = 0 (Gewöhnlich) … 5 (Suprem)
Suprem-Aszension zusätzlich × 1.15
```

| Level | Stufe | statMul |
|---|---|---|
| 1 | Gewöhnlich | 1.00× |
| 20 | Selten | 1.54× |
| 40 | Episch | 2.43× |
| 60 | Legendär | 3.81× |
| 80 | Relikt | 5.99× |
| 100 (ohne Aszension) | Suprem | 9.42× |
| **100 (aszendiert)** | **Suprem** | **10.83×** |

Der Sprung an der Bandgrenze (×1.10) ist bewusst spürbar, aber nicht spielentscheidend: Lv39 →
Lv40 ist +12 % statt +1.8 %. Das macht den Farbwechsel zum *gefühlten* Machtsprung, ohne dass
ein Matchup allein daran kippt.

### Zeit bis zum Farbwechsel

Grundannahme: **~65 Kopien/Tag** bei aktivem Spiel (≈ 10 Matches, 50 % Winrate → 1–2 Bronze-Packs
+ 1 Silber-Pack aus Tagessieg/Quests; siehe die gemessenen Pack-Erträge in §C). Die Drops
verteilen sich gleichmäßig über den freigeschalteten Pool.

**Pool 8 (Launch: 6 Elemente + 2 Helden) → 8.13 Kopien/Karte/Tag**

| Band | Kopien | Zeit pro Level | Zeit für das ganze Band | kumuliert |
|---|---|---|---|---|
| Gewöhnlich | 38 | 0.25 Tage | 4.7 Tage | 5 Tage |
| Selten | 80 | 0.49 Tage | 9.8 Tage | 15 Tage |
| Episch | 160 | 0.98 Tage | 19.7 Tage | 34 Tage |
| Legendär | 300 | 1.85 Tage | 36.9 Tage | 71 Tage |
| Relikt | 500 | 3.08 Tage | 61.5 Tage | 133 Tage |
| Suprem (Aszension) | 50 | — | 6.2 Tage | **139 Tage** |

**Pool 20 (Ausbaustufe) → 3.25 Kopien/Karte/Tag:** Gewöhnlich-Band 12 Tage, Selten 25, Episch 49,
Legendär 92, Relikt 154 → **347 Tage** bis Suprem.
**Pool 40 (Zielzustand) → 1.63 Kopien/Karte/Tag:** Gewöhnlich-Band 23 Tage, Selten 49, Episch 99,
Legendär 185, Relikt 308 → **694 Tage**.

> **⚠ Abweichung zur Zielvorgabe (bitte bewusst entscheiden).** Die Vorgabe lautete
> „Gewöhnlich-Level alle 1–2 Tage, Episch-Level ~wöchentlich, Relikt ~monatlich". Das entspricht
> rechnerisch **1.2–1.6 Kopien/Karte/Tag** — bei 65 Kopien/Tag also einem Pool von ~40–55 Karten.
> Beim **Launch-Pool von 8** ist die Frühphase rund **6× schneller**: ein Gewöhnlich-Level dauert
> 6 Stunden, nicht 1–2 Tage. Auf **Band**-Ebene stimmt das Gefühl dagegen gut (Gewöhnlich ~5 Tage,
> Episch ~3 Wochen, Relikt ~2 Monate). Drei Stellschrauben, falls die Frühphase zu schnell wirkt:
> (a) Pool schneller ausbauen — der sauberste Hebel, weil er gleichzeitig Content liefert;
> (b) Gold als echten Bottleneck ernst nehmen (siehe unten) statt es nebenher zu verschenken;
> (c) Bronze-Pack von 6 auf 4 Slots senken (−33 % Tagesertrag). **Empfehlung: (a) + (b).**
> Eine zu schnelle erste Woche ist das kleinere Übel — sie erzeugt die Gewohnheit, die man später
> braucht.

**Gold ist der zweite Bottleneck und darf es sein.** 381 850 Gold bis Lv100 heißt: in den
Relikt-Leveln kostet *ein einziger* Level-Up 8 000–9 900 Gold. Wenn Gold pro Match in der
Größenordnung von 100–300 liegt, ist die Endphase gold-limitiert, nicht kopien-limitiert —
das ist gewollt, weil Gold aus **Spielen** kommt und nicht aus Glück. Der Gold-Fluss wird nach
den ersten Telemetrie-Daten kalibriert; die Kopien-Kurve bleibt fix.

### Raritäts-Aufstieg = Event mit Perk-Wahl

Ein Farbwechsel darf niemals ein stiller Zahlenwechsel sein. Ablauf:

1. Vollbild-Upgrade-FX, Kartenrahmen wechselt hörbar und sichtbar die Farbe.
2. **Perk-Wahl:** ab Selten wählt der Spieler bei **jedem** Aufstieg **1 von 2** Perks — pro Karte,
   also 4 Entscheidungen über die Karriere einer Karte (Selten / Episch / Legendär / Relikt).
3. Die Wahl steht im Collection-Grid als kleines Symbol auf der Karte.

Das ist der wichtigste Punkt des ganzen Systems: **Upgrades werden zu Entscheidungen statt zu
Statistik.** Zwei Spieler mit identischem EMBER auf Lv60 haben unterschiedliche Türme, und der
Spieler kann seinen Build erklären. Build-Identität ist der Grund, warum man über ein Spiel
redet — und Reden ist die billigste Akquise, die es gibt.

**Respec** kostet Gold (Vorschlag: 2 × die Gold-Kosten des jeweiligen Aufstiegs-Levels, alle
Perks einer Karte gemeinsam). Nicht kostenlos, damit die Wahl Gewicht hat; nicht gesperrt, damit
niemand eine Karte „ruiniert" und aufhört.

**Perk-Registry: 8 Karten × 4 Stufen × 2 Optionen = 64 Slots.** 32 davon sind ausformuliert
(Selten + Episch, unten), Legendär und Relikt bleiben bewusst **TBD nach Playtest** — sie sind
erst in Monat 2–3 des Spielerlebens relevant und sollten mit echten Build-Daten entworfen werden.

| Karte | Element | Selten (1 von 2) | Episch (1 von 2) | Legendär | Relikt |
|---|---|---|---|---|---|
| **EMBER** | fire | +15 % Burn-Dauer · +8 % Splash-Radius | Burn stapelt bis 3× statt 2× · +12 % Schaden gegen brennende Ziele | TBD | TBD |
| **FROST** | water | Freeze braucht 3 statt 4 Stacks · +10 % Slow | Slow wirkt 1.5 s länger nach · Eingefrorene Ziele erleiden +20 % Schaden | TBD | TBD |
| **THORN** | nature | Gift tickt 0.2 s schneller · +12 % Reichweite | Wurzeln halten 0.5 s länger · Gift springt auf 1 zusätzliches Ziel über | TBD | TBD |
| **STONE** | earth | −10 % gegnerische Rüstung im Radius · +8 % Angriffstempo | Jeder 6. statt 7. Treffer betäubt 0.4 s · +18 % Schaden gegen Bosse | TBD | TBD |
| **DAWN** | light | +6 % Kritchance · +5 % Schaden für Nachbartürme | Strahl trifft 1 Ziel mehr · +12 % Ult-Ladung pro Kill | TBD | TBD |
| **HOLLOW** | darkness | Fluch hält 1 s länger · +10 % Lebensraub auf die Burg | Hinrichtung unter 12 % statt 8 % HP · Fluch springt beim Tod auf ein Ziel über | TBD | TBD |
| **SOLARA** | Held | −8 % Ult-Abklingzeit · +3 % Burgheilung bei Boss-Kill | Sonnenstrahl +15 % Breite · +7 % Schaden für alle Licht-Türme | TBD | TBD |
| **MAGMOR** | Held | +10 % Ult-Schaden · Ult zündet Burn auf allen Zielen | Lavafeld +20 % Radius · +12 % Ult-Ladung pro Welle | TBD | TBD |

Alle Perks liegen in `arena_cards.js` als `PERKS[cardId][tier]` mit maschinenlesbarem
`mod: {stat, mul}` bzw. `{stat, add}` — die Match-Engine liest sie über `ArenaCards.modsOf(id)`
als gebündeltes `{stat: {mul, add}}`-Objekt und muss keine Texte parsen.

> Anzeigenamen laut Spiel-Doku: fire=EMBER, water=FROST, **earth=STONE, nature=THORN**,
> light=DAWN, darkness=HOLLOW. Die Perk-Mechaniken in `arena_cards.js` hängen an den
> **Element-Keys** (`nature` = Gift/Wurzeln, `earth` = Rüstung/Betäubung), nicht an den
> Anzeigenamen.

### Helden

Gleiche 1–100-Leiter, gleiche Kopien- und Gold-Kosten. Zwei Unterschiede:

- **Helden-Kopien droppen ~5× seltener** (Slot-Gewicht 1/5 gegenüber Element-Türmen). Bei Pool 8
  mit 2 Helden landen damit 6.25 % aller Slots auf Helden (gemessen: 6.25 %).
- **Neue Helden werden über eine Freischalt-Schwelle entsperrt: die ersten 10 Kopien = Unlock.**
  Vorher ist der Held im Grid sichtbar, aber gesperrt, mit Balken „7/10 bis Freischaltung" —
  das ist ein Near-Miss-Anker auf Content, den man noch gar nicht besitzt, und der stärkste
  Grund, einen weiteren Pack zu öffnen.

### Fusionen & Triples

Fusionen und Triples erben im Match weiterhin das **Durchschnitts-Level der Basis-Türme**
(bestehende `mlvl`-Mechanik, nur mit `statMul()` statt `metaMul`). Sie haben **keine eigenen
Sammelkarten.**

*Begründung:* (1) Es hält den Pool klein — jede zusätzliche Sammelkarte verdünnt alle Drops und
verlängert jede Progression; (2) es macht das Investment in Basis-Türme **universell wertvoll**:
wer EMBER hochzieht, verbessert automatisch jede Fusion, die EMBER enthält, und muss nicht
raten, welche Fusion sich lohnt; (3) es hält die Fusion als *taktische* Entscheidung im Match
statt als weitere Meta-Ressource. Fusionen bleiben damit das, was sie sein sollen: die Belohnung
für gutes Spielen, nicht für gutes Sammeln.

---

## C) Booster-Pack-System

Statt Truhen mit Wartezeit gibt es **Booster-Packs**, die sofort geöffnet werden. Was gedroppt
wird, sind **Karten-Bündel**: jeder Slot zieht eine **Drop-Qualität**, und die Qualität bestimmt,
wie viele Kopien in diesem Slot stecken.

| Drop-Qualität | Farbe | Kopien einer Karte |
|---|---|---|
| Gewöhnlich | Grau | 1 |
| Selten | Grün | 3 |
| Episch | Blau | 10 |
| Legendär | Lila | 30 |
| Relikt | Orange | 100 |

Damit bleibt der **Rarity-Reveal-Moment** erhalten, obwohl Rarität eigentlich eine Karten*stufe*
ist — der Spieler dreht eine Karte um und sieht *sofort an der Farbe*, ob das ein Achselzucken
oder ein Fest war.

### Pack-Typen

Jeder Slot zieht **unabhängig** aus der Qualitäts-Tabelle; die Karte je Slot wird uniform aus dem
freigeschalteten Pool gezogen (Helden-Slots mit Gewicht 1/5).

| Pack | Quelle | Slots | Qualitäts-Gewichte [Gew./Sel./Epi./Leg./Rel.] | Garantie |
|---|---|---|---|---|
| **Bronze** | jeder 3. Sieg (`arena_profile` → `packAwarded`) | 6 | 70 / 24 / 5 / 0.9 / 0.1 | ≥1 Selten |
| **Silber** | 1. Sieg des Tages + Daily-Quests | 8 | 50 / 33 / 14 / 2.6 / 0.4 | ≥1 Episch |
| **Gold** | Trophy-Road-Knoten, Rang-Aufstieg | 10 | 30 / 40 / 22 / 7 / 1 | ≥1 Legendär |
| **Arkan** | Season-Pass-Premium, Events | 12 | 15 / 35 / 30 / 16 / 4 | ≥1 Relikt |

**Gemessene Erträge** (je 20 000 simulierte Packs, inkl. Garantie und Pity — die effektiven
Quoten liegen über den Roh-Gewichten, weil Garantie und Pity Slots nach oben ziehen):

| Pack | Ø Kopien/Pack | effektive Slot-Quoten % |
|---|---|---|
| Bronze | 15.9 | 67.7 / 25.7 / 5.0 / 1.2 / 0.3 |
| Silber | 35.1 | 48.2 / 31.9 / 16.9 / 2.6 / 0.5 |
| Gold | 79.4 | 28.5 / 38.0 / 21.1 / 11.4 / 1.0 |
| Arkan | 211.7 | 14.2 / 33.2 / 28.3 / 15.2 / 9.1 |

Das sind die Zahlen, die im **In-Game-Info-Panel** stehen sollten — die *effektiven*, nicht die
Roh-Gewichte. Alles andere wäre technisch korrekt und trotzdem irreführend.

### Pity (versteckt in der Mechanik, offen in der Doku)

Ein Zähler über **alle** Packs hinweg, unabhängig vom Pack-Typ:

- **20 Packs ohne Legendär+ (Lila) → der nächste Pack erzwingt einen Legendär-Slot.**
- **60 Packs ohne Relikt (Orange) → der nächste Pack erzwingt einen Relikt-Slot.**
- Zähler-Reset bei einem Drop dieser Qualität — auch bei einem **natürlichen** Drop, nicht nur
  bei einem erzwungenen. Wer Glück hat, fängt bei 0 an; wer Pech hat, bekommt eine Garantie.

Effekt in der Messung (10 000 Bronze-Packs): Legendär-Pity griff 189×, Relikt-Pity 141×, die
längste Durststrecke betrug exakt 20 bzw. 60 Packs — das Sicherheitsnetz greift nachweislich.
Ohne Pity läge die längste Durststrecke bei ca. 80+ Packs, und genau dort verliert man Spieler.

**Der Zähler wird im Spiel nicht angezeigt.** Die *Regel* steht im Info-Panel („spätestens alle
20 Packs ein Legendär-Drop"), der aktuelle Stand nicht — sonst wird das Öffnen von Packs zum
Zählspiel und der Zufall verliert seine Wirkung.

### Overflow → Arkan-Staub

Kopien, die eine Karte auf Lv100 nicht mehr braucht, werden zu **Arkan-Staub**:
**1 überzählige Kopie = 1 Staub**, **150 Staub = 1 beliebige Kopie im Shop**. Auf Lv100 hält die
Karte eine Reserve von 50 Kopien für die Aszension; alles darüber (und alles nach der Aszension)
staubt ab. So fühlt sich **kein Drop je wertlos an** — der 100. Relikt-Drop auf eine
ausgemaxte Karte ist immer noch 100 Staub und damit ⅔ einer freien Kopie.

### Pack-Öffnungs-Zeremonie (UI-Spec)

**Das ist der eigentliche Suchtmoment — hier darf kein Frame gespart werden.**

1. **Kartenstapel verdeckt** in der Bildmitte, leicht gefächert, Anzahl = Slots.
2. **Tap flippt einzeln.** Kein Auto-Reveal beim ersten Pack — der Spieler soll die Bewegung
   lernen.
3. **VOR dem Flip glüht die Kartenkante in der Drop-Qualitäts-Farbe.** Das ist der wichtigste
   Trick der ganzen Zeremonie: die Antizipation entsteht *vor* der Information. Ein lila Glimmen
   am Kartenrand ist ein halbe Sekunde purer Adrenalin-Vorlauf.
4. **Legendär+ = Zeitlupe + Burst-FX + Sound-Stinger.** Der Flip verlangsamt sich, der
   Bildschirm dunkelt kurz ab, ein Stinger setzt ein. Relikt bekommt eine eigene, längere
   Variante — sie soll auch beim 200. Mal noch den Kopf heben lassen.
5. **Nach jedem Flip füllt sich der Fortschrittsbalken der Karte sichtbar animiert.** Nicht
   springen — *laufen*. Der Balken ist der Beweis, dass der Drop etwas bewegt hat.
6. **Level-Up direkt im Pack-Screen.** Erreicht der Balken die Schwelle: „LEVEL-UP!"-Banner mit
   **Upgrade-Button an Ort und Stelle**. Das ist der Conversion-Punkt — hier ist der Spieler
   emotional oben, hier wird Gold ausgegeben und hier wird ein fehlender Gold-Betrag zum
   Shop-Besuch. Niemals: „gehe ins Menü, um zu upgraden".
7. **„Alle aufdecken"-Button ab dem 2. Pack.** Wer 5 Packs am Stück öffnet, will nicht 60 Mal
   tippen. Die Zeremonie muss überspringbar sein, sonst wird sie zur Arbeit — aber erst, nachdem
   sie einmal vollständig erlebt wurde.

---

## D) Reward-Verzahnung

Kein Belohnungssystem trägt allein. Vier Schleifen mit unterschiedlichem Takt greifen ineinander:

**Trophy-Road (Takt: pro Match).** Alle **25 Trophäen** ein Knoten mit Gold / Pack / Staub /
Kosmetik, alle **100 Trophäen** ein **Gold-Pack**. **Arena-Unlocks bei 250 und 700 Trophäen** —
neue Arena = neue Optik + neuer Bot-Rivalen-Band (siehe `arena_rivals.js`, gleiche Schwellen).
Die Road ist immer sichtbar, mit dem nächsten Knoten und der Distanz dorthin. Nach jedem Match
bewegt sich der Marker — auch nach einer Niederlage, weil `arena_profile.js` nur −10 abzieht.

**Season-Pass (Takt: monatlich).** **60 Stufen**, Free- und Premium-Spur. Stufen werden mit
**Medaillen** aus Quests gefüllt (Begriff aus AA übernommen). **Arkan-Kern auf Stufe 50 (free)
bzw. Stufe 30 (premium).** Monatlicher Reset, exklusive Kosmetik, die danach nie wiederkommt.
Der Season-Pass ist die einzige Stelle, an der ein *Zeit*-Druck existiert — und genau deshalb
darf er nichts enthalten, was das Powerlevel dauerhaft entscheidet außer dem Kern, der ohnehin
gedeckelt ist.

**Daily-Loop (Takt: täglich).** Drei Quests: **„2 Siege" / „2 Bosse besiegen" / „5 Fusionen
spielen"** → Medaillen. Der **1. Tagessieg** gibt zusätzlich ein **Silber-Pack** — das ist der
eigentliche Rückkehrgrund und muss in der Push-Nachricht stehen. Dazu ein **7-Tage-Login-Kalender
mit eskalierender Belohnung** (Tag 7 deutlich fetter als Tag 1–6 zusammen), der nach 7 Tagen
neu startet.

**Red-Dot-Ökonomie (Takt: permanent).** Ein roter Punkt ist ein Versprechen und muss immer
einlösbar sein:
- **Hub-Button** → sobald *irgendeine* Karte upgradebar ist (Kopien **und** Gold reichen).
- **Collection-Tab** → dito, mit Anzahl.
- **Einzelne Karte** → Badge direkt auf der Karte.
- **Auf jeder Karte immer sichtbar:** der Fortschrittsbalken **und** die Zeile
  „noch N Kopien bis EPISCH" (`ArenaCards.toNextTier(id)`). Diese Zeile ist die meistgelesene
  Information im ganzen Spiel — sie darf nie hinter einem Tap versteckt sein.

Regel: **Nie ein Red Dot ohne Aktion dahinter.** Ein Punkt, der nach dem Tap nichts zu tun
findet, entwertet alle anderen Punkte dauerhaft.

---

## E) Balance & Migration

### Warum `1.12^(lvl-1)` ersetzt werden muss

Die alte Meta-Skalierung war für ~Lv20 gebaut. Auf der neuen 1–100-Leiter ergäbe sie
`1.12^99 ≈ 8.6 × 10^4` — eine Karte auf Lv100 würde das Vierzigtausendfache einer Lv1-Karte
anrichten. Jede Wellen-Kurve (`58 × 1.23^w`) wäre binnen weniger Level irrelevant, und PvP wäre
rein eine Frage des Kontostands. Die neue Kurve landet bei **10.83×** über 100 Level — ein
Faktor, den Wellenwachstum und Turmanzahl auffangen können, und der einen Lv40-Spieler gegen
einen Lv60-Spieler noch gewinnen lässt, wenn er besser spielt.

### Migration bestehender Stände

```
newLvl = min(100, round(oldLvl × 5))
```

Eine Lv8-Karte wird zu **Lv40 = Episch/Blau**. Die gefühlte Power bleibt dabei ähnlich:
alt `1.12^7 = 2.21×`, neu `statMul(40) = 2.43×`. Über die relevante Spanne (alt Lv1–20) ist die
Abweichung klein und immer leicht **positiv** — niemand verliert bei der Migration Stärke, was
die einzige Regel ist, die bei einer Progressions-Umstellung wirklich zählt.

Umsetzung: `ArenaCards.migrateFromHub(JSON.parse(localStorage.arenaHub || '{}'))` — läuft
**einmalig** (Flag `migrated` im State), setzt `copies` auf 0 und lässt `arenaHub` unangetastet,
damit ein Rollback möglich bleibt.

**`shardsBank` aus `arena_profile.js` entfällt.** Bestehende Splitter werden **nicht** migriert
(sie hatten nie eine definierte Umrechnung); stattdessen einmalig kulant abgelten:
`ArenaCards.addCopies()` mit `shardsBank` Kopien auf eine zufällige Karte, oder pauschal
`shardsBank × 10` Arkan-Staub gutschreiben. Danach `applyShardsToHub()`, `PACK_SHARDS` und
`LOSS_SHARDS` löschen.

### Matchmaking & Fairness

- **`aiLvl` bleibt adaptiv** — die Bot-Lernkurve ist unabhängig von der Karten-Progression und
  soll es bleiben, sonst kompensieren sich zwei Systeme gegenseitig und keines ist mehr messbar.
- **Später Ghost-PvP nach Karten-Power-Score**: `Σ lvl` über alle Karten, gebändert (z. B. Bänder
  à 100 Punkte). Ein Spieler trifft nur Geister aus dem eigenen Band — dadurch wird Investment
  belohnt (man klettert), ohne dass es Neulinge überrollt.
- **Identische Wellen für beide Seiten** (Fairness-Prinzip aus dem Vorbild, siehe verifizierte
  Referenz): Beide Spieler sehen dieselbe Wellenabfolge mit demselben Seed. Der Unterschied
  liegt ausschließlich in Karten, Bau-Entscheidungen und Timing. Das ist die Bedingung dafür,
  dass eine Niederlage als *eigener* Fehler akzeptiert wird — und damit die Bedingung für die
  nächste Partie.
- **Trick-/Curse-Karten** (Disruption-Play) sind im Vorbild ein Kern-Feature. Sie gehören in den
  Karten-Pool und damit in dasselbe Level-System — aber **erst**, wenn die Basis-Progression
  live und gemessen ist.

---

## F) Implementierungs-Reihenfolge

| # | Schritt | Warum hier | Aufwand |
|---|---|---|---|
| 1 | `arena_cards.js` einbinden, `metaMul` → `ArenaCards.statMul()` | Kleinster Eingriff, sofort testbar, entkoppelt die Balance von allem Weiteren | ~20 min |
| 2 | Einmal-Migration `migrateFromHub()` beim Hub-Start | Muss **vor** der ersten Collection-Anzeige laufen, sonst stehen alle Karten auf Lv1 | ~15 min |
| 3 | `arena_profile.js`: `packAwarded` → `openPack('bronze', …)`, `shardsBank` stilllegen | Ab hier fließen echte Kopien ins System | ~30 min |
| 4 | Pack-Öffnungs-Screen (Zeremonie §C) | Der eigentliche Wert des ganzen Systems — bewusst als eigener Block, nicht nebenbei | ~2–3 h |
| 5 | Collection-Grid in `deck.html`: `tierOf` / `progress` / `toNextTier`, Upgrade-Button | Macht den Fortschritt sichtbar; ohne das ist Schritt 4 wirkungslos | ~1.5–2 h |
| 6 | Perk-Wahl-Dialog beim Raritäts-Aufstieg | Kann nachgeliefert werden — bis dahin `perkChoiceDue` ignorieren, es bricht nichts | ~1–1.5 h |
| 7 | Red-Dot-Ökonomie + Daily-Quests | Retention-Schicht, sinnvoll erst wenn 1–6 stabil laufen | ~1.5 h |
| 8 | Trophy-Road / Season-Pass (Medaillen) | Größter Brocken, eigenes Arbeitspaket | ~4–6 h |

**Gesamt Schritte 1–7: ca. 7–9 Stunden.** Nach jedem Schritt einzeln testen und committen.

### Test-Checkliste

- [ ] `node arena_patches/arena_cards.js` → **ALLE TESTS OK** (10 000 Bronze-Packs, Quoten,
      Pity, Level-Kurve, Bank-Mechanik, Migration).
- [ ] `localStorage.arenaCards` existiert nach dem ersten Pack und enthält
      `{cards, dust, pityEpic, pityLegendary, packsOpened}`.
- [ ] `openPack`-Verteilung über 10 000 Simulationen: Gewöhnlich ~68 %, Selten ~26 %,
      Episch ~5 %, Legendär ~1.2 %, Relikt ~0.3 % (Bronze).
- [ ] **Jedes** Bronze-Pack enthält mindestens einen Selten-Slot (Garantie).
- [ ] **Pity greift:** nie mehr als 20 Packs ohne Legendär+, nie mehr als 60 ohne Relikt.
- [ ] **Overflow → Staub:** Karte auf Lv100 setzen, 200 Kopien geben → `copies` bleibt bei 50,
      `dust` steigt um 200.
- [ ] **Helden-Quote:** ~6.25 % der Slots bei Pool 8 mit 2 Helden.
- [ ] Migration: `arenaHub.coll.fire.lvl = 8` → `arenaCards.cards.fire.lvl === 40`; zweiter
      Aufruf liefert `{skipped: true}`.
- [ ] Match: ein Lv40-Turm richtet ~2.4× Schaden eines Lv1-Turms an — **nicht** ~10 000×
      (= alte Formel läuft noch irgendwo).
- [ ] Fusion im Match: erbt weiterhin `mlvl` der Basis-Türme, keine eigene Karte im Grid.

---

## Spätere Ausbaustufen

| Phase | Feature | Referenz |
|---|---|---|
| 2 | **Skill-Karten** als dritter Track: eigenes Meta-Level für die 3 Hero-Spells, eigene Drop-Slots in Silber+ Packs. Im Vorbild eine getrennte Währung; für uns erst sinnvoll, wenn die Spells mechanisch ausgebaut sind. | AA: „upgrade your skills with skill cards" |
| 2 | **Trick-/Curse-Karten** in den Pool (Disruption-Play), gleiche Level-Leiter. | AA-Kern-Feature |
| 3 | **Clan-System mit Karten-Donations**: anfragen + spenden, **Spenden gibt Gold**. Der stärkste soziale Retention-Hebel im Vorbild, weil Geben sich selbst belohnt. | AA: „request donations …, donate to earn gold" |
| 3 | **Ghost-PvP** nach Karten-Power-Score (`Σ lvl`), gebändert. | §E |
| 4 | **Gems als Zweitwährung + Monats-Abo** (Referenz: „Royal Monthly Letter", 1200 Gems + 300/Tag). Erst wenn Retention steht — eine Monetarisierung auf einem undichten Eimer ist verschwendete Arbeit. | AA-Shop |
