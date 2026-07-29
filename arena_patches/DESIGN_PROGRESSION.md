# Karten-Progression & Booster-Packs (AA-Modell)

**Status:** Design-Spezifikation **v2** (State **v3**), implementiert in
`arena_patches/arena_cards.js` und `arena_patches/arena_fortress.js` (Logik-Module, beide mit
Selbsttest via `node <datei>`) und sichtbar in `arena_patches/ui_prototype.html` (lauffähiger
UI-Nachbau). Alle Zahlen in diesem Dokument sind die Quelle der Wahrheit für die Module —
Änderungen hier **und** dort nachziehen.

> ### ⚠ v2 — was sich am 2026-07-24 geändert hat
> Die **Videoanalyse des echten „Arcane Arena"** (`arena_patches/AA_UI_REFERENZ.md`) hat das
> ursprüngliche Modell dieses Dokuments widerlegt. Bis dahin galt: *Rarität ist ein Level-Band
> derselben Karte, ein Level-Up kostet Kartenkopien + Gold.* **Tatsächlich gilt im Vorbild:**
> *Rarität entsteht durch **Merge von 3 identischen Karten** (§4), ein Level-Up kostet
> **Upgrade-Material + Gold** und **keine** Kartenkopien (§5), und die Rarität bestimmt das
> **Level-Cap** (§2.4).*
>
> Die Kapitel **B** und **C** sind vollständig neu. Die alten Tabellen sind **nicht gelöscht**,
> sondern stehen unverändert im Anhang **§Z — ÜBERHOLT (v1)** am Ende dieses Dokuments.
> Ebenfalls neu: **`arena_patches/GAMEPLAY_OPTIMIERUNG.md`** (Match-Mechanik-Abgleich).

> ### ⚠ Nachtrag 2026-07-25 — die Befunde aus Video 6
> Die zweite UI-Tour (`AA_UI_REFERENZ.md` §12) hat vier Stellen dieses Dokuments korrigiert
> und eine ergänzt:
>
> | Was | Vorher | Jetzt |
> |---|---|---|
> | **Upgrade-Material** | eine generische Ressource | **3 Sorten** je Karten-Rolle (§B „Material-Sorten"), State **v3** — am 29.07. auf **eine Sorte JE KARTE** korrigiert, State **v4**, siehe ⚠ KORREKTUR 2 |
> | **Pity-Counter** | Stand versteckt, Regel offen | **offen angezeigt** — „Episch garantiert in ≤N Packs" (§C) |
> | **Season-Pass** | 60 Stufen, 2 Spuren, Medaillen aus Quests | **3 Spuren** FREE/EPIC/LEGENDARY, ~30 Tage, Medals über **Siegesserien**, Overflow-Regel nach dem Cap (§D) |
> | **Arena-Schwellen** | geschätzt 250 / 700 | **belegt 600 / 1200 / 1500**, Liga ab ~2900; Trophy-Road-Schrittweite 50 → 100 → 200 (§D) |
> | **Festungs-Upgrades** | fehlte vollständig | **neue dritte Achse**, `arena_fortress.js` (§B „Festungs-Upgrades") |
>
> Die Korrekturen sind an ihrer jeweiligen Stelle als **⚠ KORREKTUR** markiert, damit
> nachvollziehbar bleibt, welche Entscheidung auf welcher Datenlage getroffen wurde.

**Ersetzt:** die Splitter-Ökonomie aus `arena_profile.js` (`shardsBank`, `PACK_SHARDS`,
`LOSS_SHARDS`, `applyShardsToHub()`) und die Match-Skalierung `metaMul = 1.12^(lvl-1)`
in `arena_pan.html`.

---

## A) Design-Philosophie

Eine Karten-Sammel-Progression bindet, weil sie vier Belohnungsformen übereinanderlegt, die
jeweils auf einer anderen Zeitskala wirken:

1. **Schnelle Frühphase-Levels = tägliche Dopamin-Hits.** Ein Gewöhnlich-Level kostet 3 Material
   und 100 Gold. Wer eine halbe Stunde spielt, geht mit mehreren Level-Ups aus der Session — die
   Sitzung hat *immer* etwas verändert, auch nach einer Pechsträhne im PvP.
2. **Sichtbare Fast-Fertig-Anzeige = Near-Miss.** Jede Karte trägt ihre Merge-Punkte **●●○**
   *dauerhaft* im Collection-Grid. „Noch **eine** EMBER-Karte bis Selten" ist der stärkste
   Rückkehrgrund, den ein Mobile-Spiel hat — stärker als jede Push-Nachricht, weil der Spieler
   die Lücke selbst gesehen hat. Bei einem Bedarf von **3** ist der Abstand zum Ziel außerdem
   immer greifbar; ein Balken „34/80" ist es nie.
3. **Raritäts-Aufstiege = Status-Momente.** Der Wechsel Grün → Blau ist selten genug, um ein
   Ereignis zu sein, und optisch laut genug (Rahmenfarbe, FX, **Bonus-Wahl**), um erinnert zu
   werden. Der Kartenrahmen ist ein permanentes, sichtbares Statussymbol im eigenen Deck.
4. **Pack-Öffnung = variable Belohnung.** Welche Stufe ein Slot trägt, ist unbekannt, bis die
   Karte umgedreht wird. Genau dieser Moment — nicht das Match — ist der Kern der Retention.
5. **Zwei Achsen = zwei Sitzungslängen.** Der Merge ist der *schnelle* Fortschritt (Tage), das
   Level der *langsame* (Wochen bis Monate). Wer nur zehn Minuten hat, hat trotzdem etwas
   Sichtbares getan — und wer monatelang bleibt, hat immer noch ein Ziel.

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

> **Neuer, stärkerer Beleg:** `arena_patches/AA_UI_REFERENZ.md` wertet **Screen-Recordings des
> echten Spiels** aus (OCR + Pixelkoordinaten). Wo die Videoanalyse und diese Web-Recherche sich
> widersprechen, **gilt die Videoanalyse.** Betroffen ist vor allem die Raritätsleiter (unten)
> und das gesamte Level-/Merge-Modell (Kapitel B).

Belegte Fakten zum echten Vorbild **„Arcane Arena: Tower Defense TD"** (Panteon / MWM,
`com.panteon.arcanearena`). Was hier steht, ist Recherche-Stand — was in den übrigen Kapiteln
steht, ist unser Design.

| Fakt | Beleg / Status | Konsequenz für uns |
|---|---|---|
| Raritäten **Epic, Legendary, Relic, Supreme** existieren | über Achievements belegt („first Epic card", „first Legendary card", „first Relic card", „first Supreme card") | ⚠ **teilweise korrigiert durch die Videoanalyse:** im Spiel sichtbar sind **Common / Good / Rare / Epic / Legendary** (§3 der UI-Referenz), „Good" schiebt sich zwischen Common und Rare. Wir übernehmen diese fünf und ergänzen **Suprem** als Endstufe; **Relikt** entfällt. |
| **Drei getrennte Upgrade-Währungen**: Turm-Karten („tower cards earned from PvP battles"), Skill-Karten („upgrade your skills with skill cards"), Helden-**Shards** („upgrade heroes with hero shards") | Store-Beschreibungen | **Bewusste Abweichung:** Wir führen Helden als normale Karten im selben System (nur 5× seltener). Ein Held braucht dadurch keinen eigenen Währungs-Track, keine eigene UI, keine eigene Drop-Tabelle. Skill-Karten sind als *dritter Track* vorgemerkt (siehe „Spätere Ausbaustufen"). |
| **Clan-System mit Karten-Donations** („request donations to power up towers faster, donate to earn gold") | Store-Beschreibung | Phase-3-Feature. Der soziale Hebel liegt darin, dass **Geben** mit Gold belohnt wird — Schenken wird zur eigenen Progression. |
| Zweitwährung **Gems** + Monats-Abo („Royal Monthly Letter": 1200 Gems sofort + 300/Tag) | Store / Shop | Nur Monetarisierungs-Referenz. Für uns „später" — unser Design ist zunächst rein F2P-Ökonomie. |
| Season läuft über **Medals** (Quests sammeln Medaillen über die Saison) | Store-Beschreibung | Begriff übernommen: unsere Season-Währung heißt **Medaillen**. |
| **Beide Spieler bekommen identische Wellen** („face identical waves in fair, real-time duels"), **3 zufällige Turm-Karten pro Runde** | Store-Beschreibung | Deckt sich exakt mit unserer 3-Karten-Hand. Die identischen Wellen sind ein Fairness-Prinzip, das wir in §E festschreiben. |
| **„Trick cards"** als Kern-Feature fürs Disruption-Play | Store-Beschreibung | Bestätigt unseren Curse-Karten-Plan — nicht optional, sondern Kern-Loop des Vorbilds. |
| **Arenen / Maps / Chapters** schalten sich über Spieler-Level bzw. Trophäen frei; PvP-Leaderboard vorhanden | Store-Beschreibung | Deckt sich mit unserer Trophy-Road. **Schwellen seit Video 6 belegt: 600 / 1200 / 1500**, darüber die Liga *Champions Peak* ab ≈ 2900 (§9.5) — die früheren 250 / 700 waren geschätzt und sind in §D korrigiert. |

**Quellen:**
- https://www.exophase.com/game/arcane-arena-tower-defense-td-apple/achievements/
- https://play.google.com/store/apps/details?id=com.panteon.arcanearena
- https://apps.apple.com/us/app/id6746447166
- https://mwm.ai/apps/arcane-arena-tower-defense-td/6746447166
- https://apkpure.net/arcane-arena-tower-defense-td/com.panteon.arcanearena

---

## B) Karten-System **v2** — Rarität via Merge, Level via Material

> **v2 seit 2026-07-24.** Ersetzt das ursprüngliche Modell „Rarität = Level-Band, Level-Up kostet
> Kartenkopien". Das war eine plausible, aber **falsche** Annahme; die Videoanalyse des echten
> Spiels (`AA_UI_REFERENZ.md` §2/§4/§5) hat sie widerlegt. Die alten Tabellen stehen unverändert
> im Anhang **§Z — ÜBERHOLT (v1)** am Ende dieses Dokuments.

### Die zwei Achsen

Jede Karte hat **zwei voneinander unabhängige** Fortschrittsachsen:

| Achse | Ressource | Wirkung | Beleg |
|---|---|---|---|
| **A — Rarität** | **3 identische Karten** derselben Stufe | Stufe steigt · **Level-Cap steigt** · **permanenter Bonus** wird freigeschaltet | AA-Kartentext: *„Merge 3 identical &lt;Turm&gt; cards to unlock: &lt;Bonus A&gt; and &lt;Bonus B&gt;"* (§4.1) |
| **B — Level** | **Upgrade-Material + Gold** | Stats und Power steigen | AA-Detailkarte: Block *„Upgrade Material 19 / 5"* + grüner *Upgrade*-Button mit **8000 Gold** (§5) |

**Kartenkopien werden für Level-Ups NICHT verbraucht** — sie sind ausschließlich Merge-Futter.
Das ist AAs Kern-Unterschied zum Clash-Royale-Modell und der Grund, warum in keinem Video ein
„Kopien x/y bis Level-Up"-Balken zu sehen war (§10.9).

### Raritätsleiter (6 Stufen)

| Stufe | Farbe | Hex | **Level-Cap** | Material pro Level-Up |
|---|---|---|---|---|
| Gewöhnlich | Grau | `#9aa3ad` | **25** | 3 |
| Gut | Grün | `#58c26a` | **40** | 4 |
| Selten | Blau | `#3d9df2` | **55** | 5 |
| Episch | Lila | `#a45ef2` | **70** | 6 |
| Legendär | Orange | `#f2a13d` | **85** | 7 |
| **Suprem** | Rot | `#ff5e7e` | **100** | 8 |

**Zur Cap-Schrittweite 15.** AA belegt **Good → Cap 20** und **Rare → Cap 30**, also Schrittweite
**10** bei 5 Stufen (§2.4). Wir haben **6** Stufen und die Vorgabe „bis Level 100". 6 Stufen ×
Schrittweite 10 ergäbe Cap 75 an der Spitze — die Lv-100-Vorgabe wäre unerreichbar. Deshalb
**Start 25, Schritt 15**: dieselbe Dramaturgie (jeder Merge öffnet spürbar Raum), aber die
Leiter endet exakt bei 100. Die Namen folgen AA (**„Gut"** zwischen Gewöhnlich und Selten, §3),
die Endstufe **Suprem** ist unsere Ergänzung — in AA existiert oberhalb Legendary nichts.

#### Suprem ist nicht droppbar — Festlegung 29.07.2026

> „3 legendäre Karten verschmelzen am Schluss zu Supreme. Supreme ist nicht droppbar und
> bleibt auch so. Wir belassen unsere Drop-Tabelle wie sie ist. Legendär soll so selten sein,
> am Ende kann der Spieler sich bis legendär sowieso hoch fusionieren, die Progression soll
> eine Weile dauern." — Auftraggeber

Damit ist **Suprem die einzige Stufe ohne Droppfad**. Sie entsteht ausschließlich aus
**3 identischen Legendären** derselben Karte (`MERGE_COST = 3`), und über die volle Leiter
gerechnet aus **3⁵ = 243 gewöhnlichen Karten** derselben Sorte.

Das war bis dahin ein *Nebeneffekt* der Datenlage: die Gewichtstabelle hat fünf Einträge für
sechs Stufen, also blieb die sechste übrig. Ein Nebeneffekt ist keine Regel — ein späterer
sechster Gewichtseintrag, ein `guarantee: 5` oder ein Pity, das auf Index 5 zwingt, hätte
Suprem still droppbar gemacht. Garantie und Pity arbeiten nämlich **an den Gewichten vorbei**:
`force()` setzt einen Slot direkt.

`arena_cards.js` prüft die Zusage deshalb jetzt vierfach — Struktur, Absicht **und Ausgabe**:

| Prüfung | misst |
|---|---|
| 5 Gewichte für 6 Stufen | die Tabelle |
| keine Garantie zielt auf Index 5 | die Absicht je Pack |
| `force()` erreicht höchstens 4 | den Pity-Pfad |
| **2 000 Packs geöffnet, höchste Stufe = Legendär** | das Ergebnis, über ~16 000 Kartenslots |

Die vierte ist die einzige, die den Fehler *gefunden* hätte — die anderen drei beschreiben nur,
wo man hinschauen muss.

#### Wie lange „eine Weile" gemessen dauert

Simulation über je 4 000 Durchläufe gegen den echten `openPack()`, Pity eingerechnet — Packs
bis zur **ersten** Suprem-Karte:

| Pack | Garantie | Packs | Legendäre/Pack |
|---|---|---:|---:|
| Bronze | ≥ Gut | 605 | 0,014 |
| Silber | ≥ Selten | 404 | 0,021 |
| Gold | ≥ Episch | 96 | 0,090 |
| Arcane | ≥ Legendär | **8,1** | **1,079** |

**Erledigt 29.07.2026.** Das Arcane-Pack umging die Droptabelle: seine Garantie hob es von 0,44
auf 1,08 Legendäre je Pack und machte die Spitze in acht Packs erreichbar — gegen 96 über Gold.

> „Es soll nicht aus jedem Booster eine legendäre kommen. Du kannst arcane auf 36 % machen."
> — Auftraggeber

Die Garantie steht jetzt auf **Episch**, die Gewichte sind **unverändert**: 4 % je Slot, über
11 Slots **36,2 %** je Pack. Gemessen sind es damit **20,2 Packs** bis zur ersten Suprem-Karte
statt 8,1. Zwei Nebenwirkungen fallen mit weg: die große Legendär-Sequenz lief bei *jedem*
Arcane-Kauf, und der Pity-Zähler feuerte für Arcane-Käufer nie.

### Merge

* **3 identische Karten derselben Stufe → 1 Karte der nächsten Stufe.** „Identisch" heißt
  *derselbe Turm*, nicht *dieselbe Rarität* — im Vorbild wörtlich als „3 identical Ice Blaster
  cards" formuliert.
* Die aktive Karte **ist eine der Kopien**: Wer 3 Gut-Kopien besitzt und merged, hat danach
  1 Selten-Karte, keine Gut-Karte mehr. Merges unterhalb der aktiven Stufe erzeugen nur Kopien.
* **Das Level bleibt erhalten** (eine Lv25-Karte bleibt nach dem Merge Lv25, nur der Cap steigt).
  Bewusste Spielerfreundlichkeit — im Vorbild nicht belegt, aber alles andere wäre eine Falle.
* **„Alle verschmelzen"** (AAs *Merge All*, §4.3) kaskadiert von unten nach oben: aus 243
  Gewöhnlich-Kopien wird in 121 Merges genau **1 Suprem-Karte** (3⁵).
* **Merge-Bonus — bewusste Abweichung:** In AA ist der Bonus **fix** („Ranged Damage +22 % **und**
  Attack Rate −7 %"). Bei uns wählt der Spieler beim Merge **1 von 2** kartenspezifischen Boni.
  Begründung unverändert (siehe unten): Upgrades werden zu **Entscheidungen** statt zu Statistik.
* **Attack-Rate-Boni werden als NEGATIVE Prozente angezeigt** (−6 % = schneller) — direkt aus dem
  Vorbild übernommen (§4.2), weil „kleiner ist besser" sonst niemand intuitiv liest.

### Material-**Sorten** (korrigiert 2026-07-25, Video 6)

> **⚠ KORREKTUR 1 (25.07.2026).** Die erste Fassung dieses Kapitels nahm **eine generische**
> Ressource an („Arkan-Essenz"), gestützt darauf, dass zwei Turmkarten identisch **19**
> anzeigten. Video 6 zeigt das RESOURCES-Raster ausgescrollt (§7.1) und widerlegt das: Es gibt
> dort **mindestens 8 verschiedene Materialsorten** mit **unabhängigen** Beständen
> (18 / 16 / 10 / 8 / 7 / 6 / 2 / 1). Die Gleichheit der beiden „19" war Zufall; Skyflares
> abweichendes „40/3" ist der Gegenbeweis (§12.3).
>
> **⚠ KORREKTUR 2 (29.07.2026) — und diese betrifft die Korrektur selbst.** Aus Video 6
> wurden damals „Kategorie-Labels **speed** und **special**" gelesen und daraus **drei
> Kategorien** abgeleitet. Die Screenshots IMG_3427-3430 zeigen, dass das eine Fehllesung
> war — gleich doppelt:
>
> 1. **Die Labels gehören nicht zum Material.** „Special" und „Speed" stehen im Abschnitt
>    **TO BE FOUND** unter **gesperrten Türmen**. Es sind Turm-Rollen, keine Materialsorten.
> 2. **Jedes Material-Icon im RESOURCES-Raster ist eine Turm-Miniatur.** Und die Zahl im
>    Turm-Detail ist dieselbe, die im Raster unter genau diesem Turm steht: Catapult zeigt im
>    Detail **„78/15"**, im Raster steht unter der Catapult-Miniatur **„x78"**.
>
> Material und Karte sind in AA also **1:1**. Es gab nie eine Kategorie-Ebene dazwischen.

**Eine Essenz JE KARTE** (Stand 29.07.2026, **State v4**):

| Essenz | Symbol | Abnehmer | Farbe |
|---|---|---|---|
| **Ember-Essenz** | 🔥 | EMBER (fire) | `#ff6b3d` |
| **Frost-Essenz** | ❄ | FROST (water) | `#3dc8ff` |
| **Thorn-Essenz** | 🌿 | THORN (nature) | `#46c46a` |
| **Stone-Essenz** | 🪨 | STONE (earth) | `#e0a43c` |
| **Dawn-Essenz** | ☀ | DAWN (light) | `#ffe36b` |
| **Hollow-Essenz** | 🌑 | HOLLOW (darkness) | `#9b6bff` |
| **Solara-Essenz** | ✨ | SOLARA (Held) | `#ffd23d` |
| **Magmor-Essenz** | 🌋 | MAGMOR (Held) | `#ff4d2d` |

**Der Schlüssel einer Sorte IST die Karten-ID.** `materialTypeOf('fire') === 'fire'`. Damit
gibt es keine Zuordnungstabelle mehr, die man beim Anlegen einer Karte vergessen könnte zu
pflegen — wer eine Karte einträgt, hat ihre Essenz angelegt. Der Selbsttest prüft das als
Kopplung, nicht als Zahl: `MATERIAL_KEYS` muss identisch zur Kartenliste sein, sonst rot.

**Unbekannte IDs bekommen KEINE Ersatzsorte.** Vorher fielen sie still auf `special` — ein
später eingeführtes Item hätte sich mit Turm-Material leveln lassen. Jetzt liefert
`materialTypeOf()` für Unbekanntes `null`, `materialInfoOf()` eine ehrliche
Platzhalter-Auskunft und `canLevelUp()` scheitert an `reason: 'material'`.

**Was wir damit aufgeben — und warum das in Ordnung ist.** Die Dreier-Aufteilung sollte die
Frage erzeugen *„Reicht meine Tempo-Essenz für FROST oder für DAWN?"*. Die gibt es jetzt nicht
mehr. Dafür wandert die Entscheidung an eine ehrlichere Stelle: **welche Karten man spielt**,
bestimmt, welche Essenz sich zu sammeln lohnt. Und das ist die Entscheidung, die AA
tatsächlich stellt.

**NACHSCHUB — der Teil, den man leicht übersieht.** Bei acht statt drei Sorten und weiterhin
gleichverteiltem Materialdrop käme für eine bestimmte Karte nur noch **ein Achtel** statt
eines Drittels an: eine stille Kürzung um den Faktor **2,7** für genau den Turm, den ein
Spieler hochziehen will. Deshalb droppen die Material-Slots eines Packs seit v4 **die
Essenzen der Karten, die in diesem Pack lagen**. Wirkung, im Selbsttest über 10 000 Packs
nachgemessen:

* Die Essenz-Verteilung folgt exakt der **Kartenverteilung** — 6 Türme à ~15,6 %, 2 Helden à
  ~3,1 % (Helden droppen über `HERO_WEIGHT` 5× seltener, ihre Essenz also auch).
* Die Menge je Karte bleibt gegenüber v3 praktisch unverändert.
* Und es entsteht der Zusammenhang, den AA auch hat: *die Karte, die aus dem Pack kommt,
  bringt ihren eigenen Nachschub mit.*

Die Prüfung dafür misst **die Kopplung selbst** („jeder Essenz-Posten gehört zu einer Karte
aus DIESEM Pack") und nicht nur die Verteilung — die beiden Kurven ähneln sich zu sehr, als
dass eine Verteilungsprüfung allein den Unterschied gemerkt hätte.

**„TO BE FOUND" übernehmen (§7.1).** AA zeigt unterhalb des RESOURCES-Rasters einen eigenen
Abschnitt mit den **noch nicht besessenen** Materialien und direkt darunter, **in welcher
Arena** sie freigeschaltet werden („Arena 4", „Arena 5", „Arena 8") bzw. „Not found" für
Unbekannte. Das ist ein außergewöhnlich starkes Retention-Element, weil es aus einer leeren
Zelle ein **konkretes Ziel** macht. Mit einer Essenz je Karte ist es jetzt sogar
buchstäblich dasselbe Raster wie die Kartensammlung. Für uns:

* Das **Essenz-Fach** in der Sammlung zeigt alle Sorten, auch die mit Bestand 0 (abgeblendet,
  nicht ausgeblendet). Später kommen die noch nicht existierenden als graue Platzhalter mit
  Arena-Angabe dazu.
* Die Kopfleiste trägt seit v4 nur noch die **Summe** — acht Zahlen passen nicht in eine
  Zeile, die schon ein Sortier-Menü trägt. Ein Tipp klappt das Fach darunter auf.
* In der Turm-Detailkarte steht die Essenz **mit Namen, Bild und Bedarf** („🔥 Ember-Essenz
  16 / 5"). Die frühere Zeile *„die anderen Sorten — für diesen Turm nicht verwendbar"* ist
  **weg**: bei drei Sorten war sie eine Beruhigung, bei acht wäre sie eine Textwand. An ihrer
  Stelle steht jetzt, **woher** die Essenz kommt — das ist die Frage, die ein leerer Vorrat
  wirklich aufwirft.

**Das Icon einer Essenz ist das Artwork ihrer Karte** (`matIco()` im Prototyp bildet
Sorten-Schlüssel → `CARD_ART` ab). Genau wie in AA, wo die Turm-Miniatur das Material-Icon
ist. Das ist nicht nur billiger als acht neue Bilder, es ist die einzige Variante, bei der
**kein Material-Bild fehlen kann**: gibt es die Karte, gibt es ihr Icon. Ein generisches
Essenz-Bild (`ess_special`) steht nur noch dort, wo bewusst eine **Summe** gemeint ist —
Bundle-Zeile, Login-Kalender, Guide-Aufgabe, Straßen-Knoten.

### Level-Kosten

**Material:** `materialFor(lvl, tierIdx) = 3 + tierIdx` — also 3 auf Gewöhnlich bis 8 auf Suprem,
**unverändert von der Sorten-Aufteilung** (die Sorte bestimmt *welches* Material, nicht *wie
viel*). AA zeigt Bedarfe von **3** und **5** bei Level 15/16 (§5); die Größenordnung stimmt, die
Kopplung an die Stufe ist unsere Interpretation (AA zeigte 5 sowohl bei Good als auch bei Rare —
die Datenlage lässt beides zu).

**Gold — Plateau-Kurve in Bändern** (Kosten des Level-Ups **ab** dem genannten Level):

| Level | 1-5 | 6-10 | 11-15 | 16-20 | 21-25 | 26-30 | 31-35 | 36-40 |
|---|---|---|---|---|---|---|---|---|
| Gold | 100 | 250 | 600 | 1 500 | 3 000 | 5 000 | **8 000** | 12 000 |

| Level | 41-50 | 51-60 | 61-70 | 71-80 | 81-90 | 91-100 |
|---|---|---|---|---|---|---|
| Gold | 18 000 | 26 000 | 38 000 | 55 000 | 80 000 | 120 000 |

**Summe Lv1 → Lv100: 3 402 250 Gold** und **517 Material**.

> **Kalibrierbar, bewusst markiert.** AAs einziger lesbarer Preis war **8000 Gold**, und zwar bei
> **Lv15/16** (§2.4) — bei uns steht 8000 erst im Band 31-35. Wir liegen in der Frühphase also
> deutlich **günstiger** und in der Spätphase deutlich **teurer**. Das ist Absicht: AAs Kurve ist
> auf ein Cap von 20-30 gebaut, unsere auf 100. Eine Plateau-Kurve (statt Kosten pro Level) ist
> dabei direkt aus dem Vorbild abgeleitet — drei Karten mit *unterschiedlichem* Level und
> *unterschiedlichem* Materialstand zeigten **denselben** Goldpreis. Sobald echte Telemetrie
> vorliegt, sind die 14 Bandwerte die erste Stellschraube.

### Stat-Kurve

```
statMul(lvl) = 1.022^(lvl-1)                     — Basis, ohne Boni
statMul(lvl, boni) = 1.022^(lvl-1) × Π pw(bonus) — Merge-Boni multiplizieren kartenspezifisch
```

| Level | 1 | 25 | 40 | 55 | 70 | 85 | 100 |
|---|---|---|---|---|---|---|---|
| statMul | 1.00× | 1.69× | 2.34× | 3.24× | 4.49× | 6.22× | **8.62×** |

Kein Sprung an der Stufengrenze mehr — der Sprung *ist* jetzt das geöffnete Cap plus der neue
Bonus. Das ist sauberer als der alte ×1.10-Bandsprung: Der Spieler bekommt beim Merge etwas, das
er **sieht** (Rahmenfarbe), etwas, das er **wählt** (Bonus), und etwas, das er **planen** kann
(Cap) — statt einer stillen Multiplikation.

**8.62× über 100 Level** ist der Rahmen, den Wellenwachstum (`58 × 1.23^w`) und Turmanzahl
auffangen können; ein Lv55-Spieler kann gegen einen Lv85-Spieler noch gewinnen, wenn er besser
spielt. Jeder Merge-Bonus multipliziert mit **1.03-1.09** dazu, ein voll ausgebauter Satz Boni
also grob **×1.25** obendrauf.

### Die Pyramiden-Ökonomie (Zeitbedarf)

Eine Karte auf **Suprem** zu heben, kostet **243 Gewöhnlich-Kopien** derselben Karte (3⁵) —
oder jede beliebige äquivalente Mischung, denn eine höherstufige Kopie ersetzt ihre Basis exakt:

| gedroppte Stufe | wert in Gewöhnlich-Kopien |
|---|---|
| Gewöhnlich | 1 |
| Gut | 3 |
| Selten | 9 |
| Episch | 27 |
| Legendär | 81 |

Das ersetzt das alte „Bündel"-Konzept (ein Slot droppte *n* Kopien): Ein Slot droppt jetzt
**genau eine Karte** — nur eben manchmal eine **vorgemergte**. Der Reveal-Moment ist derselbe,
das Modell ist ehrlicher, und eine Gut-Karte ist rechnerisch exakt drei Gewöhnliche.

**Ertragsannahme (aktives Spiel):** 2 Bronze-Packs + 1 Silber-Pack pro Tag
≈ **44 Gewöhnlich-Äquivalente/Tag**, gleichmäßig über den freigeschalteten Pool verteilt.

| Ziel-Stufe | Kopien-Äquivalente | Pool 8 (5.5/Karte/Tag) | Pool 20 (2.2) | Pool 40 (1.1) |
|---|---|---|---|---|
| Gut | 3 | < 1 Tag | 1.4 Tage | 3 Tage |
| Selten | 9 | 2 Tage | 4 Tage | 8 Tage |
| Episch | 27 | 5 Tage | 12 Tage | 25 Tage |
| Legendär | 81 | 15 Tage | 37 Tage | 74 Tage |
| **Suprem** | **243** | **44 Tage** | **110 Tage** | **221 Tage** |

> **⚠ Der eigentliche Bottleneck ist Gold, nicht die Pyramide.** Bei ~5 600 Gold/Tag (10 Matches
> plus Pack-Gold) dauert **eine einzige Karte von Lv1 auf Lv100 rund 600 Tage** — vier- bis
> vierzehnmal länger als der Raritätsaufstieg. Die Rarität ist also der **schnelle, sichtbare**
> Fortschritt (Rahmenfarbe alle paar Tage), das Level der **lange** (Monate). Das ist eine
> gesunde Aufteilung, aber die Endphase ist damit **gold-limitiert**. Drei Stellschrauben:
> (a) Gold-Einkommen anheben (Arena-Prämien, siehe `GAMEPLAY_OPTIMIERUNG.md` §4);
> (b) die oberen vier Goldbänder senken; (c) so lassen und Lv100 bewusst als Jahresziel für
> **eine** Lieblingskarte definieren. **Empfehlung: (c) + moderat (a)** — ein erreichbares
> Maximum entwertet die Progression schneller als ein fernes.

**Material ist der zweite, stillere Bottleneck:** 517 Material pro Karte bis Lv100 bei ~24
Material/Tag für die **gesamte** Sammlung. Material ist damit die Ressource, die entscheidet,
**welche** Karte man hochzieht — genau die Rolle, die sie in AA hat (§5 / §7.1). Durch die
**einer Essenz je Karte** verschärft sich das gezielt: Pro Essenz kommen nur wenige
Stück/Tag herein, und
eine Sorte versorgt 2-4 Karten. Der Engpass ist damit nicht mehr „mein Vorrat", sondern
„mein Vorrat **für diese Rolle**" — die Entscheidung wird enger und dadurch spürbarer.
Pack-Material-Slots droppen eine **zufällige** Sorte (gleichverteilt, gemessen 33.4 / 33.4 /
33.2 % über 20 000 Slots), es gibt also keinen Weg, gezielt zu farmen — was die
Kaufentscheidung für gezielte Sorten-Angebote im Shop erst interessant macht.

### Merge-Bonus-Registry

**8 Karten × 5 Merge-Stufen × 2 Optionen = 80 Slots.** Ausformuliert sind die Stufen **Gut** und
**Selten** (32 Boni); **Episch / Legendär / Suprem** bleiben bewusst **TBD nach Playtest** — sie
sind erst nach Wochen relevant und sollten mit echten Build-Daten entstehen.

| Karte | Element | Gut (1 von 2) | Selten (1 von 2) |
|---|---|---|---|
| **EMBER** | fire | +15 % Burn-Dauer · **Angriffstempo −6 %** | Burn stapelt bis 3× statt 2× · +12 % Schaden gegen brennende Ziele |
| **FROST** | water | Freeze braucht 3 statt 4 Stacks · +10 % Slow | Slow wirkt 1.5 s länger nach · Eingefrorene Ziele erleiden +20 % Schaden |
| **THORN** | nature | Gift tickt 0.2 s schneller · +12 % Reichweite | Wurzeln halten 0.5 s länger · Gift springt auf 1 zusätzliches Ziel über |
| **STONE** | earth | −10 % gegnerische Rüstung im Radius · **Angriffstempo −8 %** | Jeder 6. statt 7. Treffer betäubt 0.4 s · +18 % Schaden gegen Bosse |
| **DAWN** | light | +6 % Kritchance · +5 % Schaden für Nachbartürme | Strahl trifft 1 Ziel mehr · **Angriffstempo −7 %** |
| **HOLLOW** | darkness | Fluch hält 1 s länger · +10 % Lebensraub auf die Burg | Hinrichtung unter 12 % statt 8 % HP · Fluch springt beim Tod auf ein Ziel über |
| **SOLARA** | Held | −8 % Ult-Abklingzeit · +3 % Burgheilung bei Boss-Kill | Sonnenstrahl +15 % Breite · +7 % Schaden für alle Licht-Türme |
| **MAGMOR** | Held | +10 % Ult-Schaden · Ult zündet Burn auf allen Zielen | Lavafeld +20 % Radius · +12 % Ult-Ladung pro Welle |

Alle Boni liegen in `arena_cards.js` als `PERKS[cardId][mergeTierKey]` mit maschinenlesbarem
`mod: {stat, mul|add}`, einem Anzeige-Prozentwert `pct` (bei Attack Rate **negativ**) und einem
Power-Faktor `pw`, den `statMul()` mitmultipliziert. Die Match-Engine liest sie über
`ArenaCards.modsOf(id)` als gebündeltes `{stat: {mul, add}}`-Objekt und parst keine Texte.

> Anzeigenamen laut Spiel-Doku: fire=EMBER, water=FROST, **earth=STONE, nature=THORN**,
> light=DAWN, darkness=HOLLOW. Die Bonus-Mechaniken hängen an den **Element-Keys**
> (`nature` = Gift/Wurzeln, `earth` = Rüstung/Betäubung), nicht an den Anzeigenamen.

**Respec** kostet Gold (Vorschlag: `2 × goldFor(cap der Stufe)`, alle Boni einer Karte gemeinsam).
Nicht kostenlos, damit die Wahl Gewicht hat; nicht gesperrt, damit niemand eine Karte „ruiniert".

### Helden

Gleiche Leiter, gleiche Kosten. Zwei Unterschiede:

- **Helden-Kopien droppen ~5× seltener** (Slot-Gewicht 1/5). Bei Pool 8 mit 2 Helden landen damit
  **6.25 %** aller Slots auf Helden (gemessen: 6.31 %).
- **Freischaltung:** Der erste Drop schaltet den Helden frei; vorher ist er im Grid sichtbar, aber
  gesperrt. (Die alte „10 Kopien = Unlock"-Schwelle entfällt — im Merge-Modell ist jede Kopie
  Merge-Futter, eine zweckentfremdete Unlock-Schwelle würde die Pyramide verzerren.)

### Fusionen & Triples

Unverändert: Fusionen und Triples erben im Match das **Durchschnitts-Level der Basis-Türme**
(`mlvl`, nur mit `statMul()` statt `metaMul`) und haben **keine eigenen Sammelkarten**.

*Begründung:* (1) Es hält den Pool klein — jede zusätzliche Sammelkarte verdünnt alle Drops;
(2) es macht das Investment in Basis-Türme **universell wertvoll**; (3) es hält die Fusion als
*taktische* Entscheidung im Match statt als weitere Meta-Ressource.

### Festungs-Upgrades (die DRITTE Achse) — neu 2026-07-25

> Implementiert in **`arena_patches/arena_fortress.js`** (`window.ArenaFortress`, Selbsttest:
> `node arena_patches/arena_fortress.js`). Beleg: **AA-Referenz §9.9 / §12.6** — ein in der
> ersten Fassung **komplett fehlendes System**, das Video 6 als eigenes Bottom-Nav-Tab
> „Upgrade" zeigt.

```
Karten-Level    ←  Upgrade-Material (3 Sorten) + Gold      [arena_cards.js]
Karten-Rarität  ←  3 identische Karten mergen              [arena_cards.js]
FESTUNG         ←  Gold + Trophäen-Gate                    [arena_fortress.js]
```

AA wertet die **Festung/Basis des Spielers** dauerhaft auf — völlig getrennt von den
Turmkarten. Belegte Tracks: *DPS* („Increases fortress attack power", **+17 % → +16 %**),
*Attack Speed*, *Max Health*; Goldkosten **6 000 → 9 000 → … → 17 000**, also grob **+1 000
pro Stufe**; gegated per **Account-Level** (Button zeigt dann „Level Too Low"); je Stufe
zusätzlich **Power +170**; und der Prozentwert **sinkt** mit der Stufe.

**Unsere drei Tracks** (die Stellschrauben, die unser Spiel tatsächlich hat — Burg und
Prisma-Laser existieren beide):

| Track | Wirkt auf | Bonus Stufe 1 → 12 | Summe (12 Stufen) |
|---|---|---|---|
| 🛡 **Burg-Stabilität** (`hp`) | Burg-HP | +6.0 % → +2.7 % | **+49.8 %** → `hpMul 1.498` |
| 🔺 **Prisma-Fokus** (`prismDmg`) | Prisma-Schaden | +8.0 % → +3.6 % | **+66.4 %** → `prismDmgMul 1.664` |
| ⚡ **Prisma-Taktung** (`prismRate`) | Prisma-Abklingzeit | +5.0 % → +2.3 % | **+41.5 %** → `prismRateMul 1.415` |

**Abnehmender Grenznutzen:** Bonus × **0.93** je gekaufter Stufe desselben Tracks. Nach 12
Stufen liegt der Zugewinn bei 45 % des Startwerts (`0.93¹¹`) — die Kurve, nicht die
Endpunkte, ist die Vorgabe. Voll ausgebaut: Burg 15 000 → **22 475 HP**, Prisma-Abklingzeit
**×0.707**, Power **+6 120**.

**Ein gemeinsamer Kostenzähler über ALLE Tracks:** `6 000 + 1 000 × (bereits gekaufte
Gesamtstufen)`, also **6 000 · 7 000 · 8 000 · … · 41 000** über 36 Stufen (3 × 12),
**Gesamtsumme 846 000 Gold**. Das ist der interessanteste Teil des Vorbilds und bewusst
übernommen: Weil die nächste Stufe **unabhängig vom Track** teurer wird, ist die
**Reihenfolge** eine echte Entscheidung — wer zuerst Burg-HP kauft, zahlt für Prisma-Schaden
mehr. Drei Tracks mit je eigener Kostenkurve wären dagegen drei voneinander unabhängige
Balken ohne Entscheidung.

**Gates über TROPHÄEN statt Account-Level**, weil wir kein Account-Level haben — und das ist
die bessere Bindung, weil sie die Trophy Road mit Bedeutung auflädt:

| Gesamtstufen | benötigt | entspricht |
|---|---|---|
| 1 – 6 | **frei** | Start |
| 7 – 12 | **600 🏆** | Arena 3 |
| 13 – 24 | **1 200 🏆** | Arena 5 |
| 25 – 36 | **1 500 🏆** | Arena 6 |

Die Schwellen sind AAs belegte Arena-Aufstiege (§9.5) — **dieselbe Tabelle** wie in
`GAMEPLAY_OPTIMIERUNG.md` §4 und bei der Objective-Freischaltung. `trackInfo(key).locked`
liefert das AA-Äquivalent zu „Level Too Low", `lockAt` die fehlende Schwelle.

**Warum das unser dokumentiertes Gold-Problem entschärft.** Oben in diesem Kapitel steht:
*„Der eigentliche Bottleneck ist Gold, nicht die Pyramide"* — eine Karte von Lv1 auf Lv100
kostet **3.4 Mio Gold ≈ 600 Tage**, das Vier- bis Vierzehnfache des Raritätsaufstiegs. Bisher
gab es dafür nur drei Stellschrauben (Einkommen anheben / obere Goldbänder senken / Lv100 als
Jahresziel akzeptieren). Der Festungsbaum ist eine **vierte, elegantere**: eine **zweite
sinnvolle Gold-Senke**, die

* **planbar** ist (846 000 Gold, 36 Stufen, feste Reihe — kein Zufall, keine Pyramide),
* **abgeschlossen** ist (sie endet; sie konkurriert also nicht dauerhaft mit den Karten),
* in **jedem** Match wirkt statt nur für eine Karte, und
* dem Spieler in der Frühphase, in der 3.4 Mio Gold unvorstellbar sind, ein **erreichbares**
  Goldziel gibt.

Sie löst das Problem nicht auf — 846 000 sind ein Viertel einer einzigen Lv100-Karte —, aber
sie nimmt der Karten-Goldkurve den Druck, ohne die Sammlung zu entwerten. **Empfehlung:
Festung vor der Feinjustierung der oberen Goldbänder bauen** und danach neu messen; es kann
gut sein, dass die Bänder dann gar nicht angefasst werden müssen.

**Gold-Handling wie bei den Karten:** `arena_fortress.js` verwaltet **kein** Gold.
`buy(key, goldAvailable)` prüft den Betrag mit und **meldet** die Kosten zurück; den Abzug
macht die Hub-Wallet. `totalMultipliers()` ist die einzige Funktion, die das Match braucht.

---

## C) Booster-Pack-System **v2**

Statt Truhen mit Wartezeit gibt es **Booster-Packs**, die sofort geöffnet werden. Ein Pack hat
drei Slot-Sorten: **Karten**, **Upgrade-Material** und **Gold**.

Ein Karten-Slot droppt **eine Karte in einer Stufe** — meist Gewöhnlich, seltener bereits
**vorgemergt** (Gut/Selten/Episch/Legendär). **Suprem droppt nie** und ist ausschließlich über
den Merge erreichbar. Das ist der Reveal-Moment: Der Spieler dreht eine Karte um und sieht
*sofort an der Rahmenfarbe*, ob das ein Achselzucken oder ein Fest war.

| Pack | Quelle | Karten | Material-Slots | Gold | Gewichte [Gew./Gut/Sel./Epi./Leg.] |
|---|---|---|---|---|---|
| **Bronze** | jeder 3. Sieg (`arena_profile` → `packAwarded`) | 5 | 2 | 400-800 | 82 / 15 / 2.6 / 0.36 / 0.04 |
| **Silber** | 1. Sieg des Tages + Daily-Quests | 7 | 3 | 1 200-2 500 | 62 / 28 / 8.4 / 1.4 / 0.2 |
| **Gold** | Trophy-Road-Knoten, Rang-Aufstieg | 9 | 4 | 4 000-8 000 | 38 / 38 / 18.4 / 4.6 / 1 |
| **Arkan** | Season-Pass-Premium, Events | 11 | 6 | 12 000-25 000 | 18 / 34 / 29 / 15 / 4 |

Pro Material-Slot fallen **2-5** Material an (Bronze also ⌀ 7, Arkan ⌀ 21) — als **Essenz
einer Karte, die in DIESEM Pack lag** (gleichverteilt über die gezogenen Karten-IDs, seit
State v4). Jeder Material-Slot ist damit ein eigener kleiner Reveal („welche Essenz?"), und
das Icon zeigt sofort, für welchen Turm sie zählt. Gezieltes Farmen einer Essenz bleibt
unmöglich — man kann nur beeinflussen, welche Packs man öffnet, nicht welche Karten fallen.
`openPack()` liefert die Slots als `[{type, amount, name, sym, color}]`, die Zeremonie ruft
pro Flip `addMaterial(amount, type)`.

### Kommunikation: Raritätsspannen statt Prozente

**Aus dem Vorbild übernommen (§8.2):** AA blendet **nirgends** Drop-Raten ein. Truhen
kommunizieren stattdessen eine **garantierte Spanne** — „Contains one **Common or Good** card".
Das ist psychologisch stärker (ein Versprechen statt einer Wahrscheinlichkeit) und rechtlich
einfacher. Unsere Garantien, so im UI formuliert:

| Pack | Garantie-Text im UI | technisch |
|---|---|---|
| Bronze | „Enthält mindestens eine **Gute** Karte oder besser" | ≥1 Slot auf Stufenindex 1 |
| Silber | „Enthält mindestens eine **Seltene** Karte oder besser" | ≥1 Slot auf 2 |
| Gold | „Enthält mindestens eine **Epische** Karte oder besser" | ≥1 Slot auf 3 |
| Arkan | „Enthält mindestens eine **Legendäre** Karte" | ≥1 Slot auf 4 |

Die **Gewichte bleiben intern**, sind aber auf Wunsch einsehbar: ein „i"-Button auf jedem Pack
zeigt die **effektiven** Quoten (inkl. Garantie und Pity) im Klartext. Offen kommunizierte Raten
nehmen Misstrauen aus dem Kauf; sie zu verstecken hat noch nie ein Spiel besser gemacht.

**Gemessene Bronze-Quoten** (10 000 Packs, `node arena_patches/arena_cards.js`):

| Stufe | Rohgewicht | effektiv (mit Garantie + Pity) |
|---|---|---|
| Gewöhnlich | 82 % | **74.29 %** |
| Gut | 15 % | **22.07 %** |
| Selten | 2.6 % | **2.55 %** |
| Episch | 0.36 % | **0.81 %** |
| Legendär | 0.04 % | **0.28 %** |

⌀ 7.0 Material und ⌀ 602 Gold pro Bronze-Pack; 6.31 % aller Kartenslots landen auf Helden.

### Pity — **offen angezeigt** (korrigiert 2026-07-25, Video 6)

Ein Zähler über **alle** Packs hinweg, unabhängig vom Pack-Typ:

- **25 Packs ohne Episch+ → der nächste Pack erzwingt einen Epischen Slot.**
- **75 Packs ohne Legendär → der nächste Pack erzwingt einen Legendären Slot.**
- Reset auch bei einem **natürlichen** Drop dieser Stufe, nicht nur bei einem erzwungenen.

Messung über 10 000 Bronze-Packs: Episch-Pity griff **228×**, Legendär-Pity **121×**, die
längste Durststrecke betrug exakt **25** bzw. **75** Packs — das Sicherheitsnetz greift
nachweislich und niemand fällt hindurch.

> **⚠ KORREKTUR: Der Zählerstand wird SEHR WOHL angezeigt.** Die erste Fassung dieses
> Kapitels entschied „Regel offen, Stand versteckt" — mit der Begründung, ein sichtbarer
> Zähler mache das Öffnen zum Zählspiel. **Video 6 zeigt, dass das Vorbild es genau
> umgekehrt macht** (§8.2): Die ARCANE SUPPLIES CHEST trägt die Zeile
> **„Get [Legendary] in <N> opens"** direkt auf der Truhe, im Kaufbildschirm, neben dem
> Preis. Und AA blendet **nirgends** Prozent-Drop-Raten ein — der sichtbare Pity-Counter
> **ersetzt** sie. Das ist die stärkere Lösung: Ein Versprechen mit Countdown („in ≤19
> Packs") liest sich besser als eine Wahrscheinlichkeit, es ist nicht anfechtbar, und es
> gibt dem Öffnen eine zweite, planbare Belohnungsachse neben dem Zufall. Das „Zählspiel",
> das wir vermeiden wollten, ist in Wahrheit **das Feature**.

**Umsetzung.** `ArenaCards.getPityStatus()` → `{epicIn, legendaryIn}` liefert die
verbleibenden Packs bis zur jeweiligen Garantie; der Pack-Screen rendert daraus
**„🛟 Episch garantiert in ≤N Packs · Legendär in ≤M"** direkt unter dem Öffnen-Button (im
Prototyp umgesetzt, aktualisiert sich nach jedem Pack). `openPack()` gibt denselben Stand als
`pityStatus` mit zurück, damit der Zeremonie-Screen ihn ohne zweiten Lesezugriff hat.

*Zur Zählweise:* `epicIn = PITY_EPIC − Zähler + 1`. Das **+1** ist kein Rundungsfehler,
sondern die Reihenfolge im Code: Der Zähler wird **nach** dem Pack erhöht, geprüft wird
**davor**. Bei frischem Zähler sind es also 26 Packs — deckungsgleich mit der gemessenen
längsten Durststrecke von 25 Packs **ohne** Episches. Ein reines `PITY_EPIC − Zähler` wäre
um eins zu optimistisch, und ein Countdown, der einmal lügt, ist schlimmer als keiner.

### Kein Overflow-Verfall mehr

Der alte „Arkan-Staub" entfällt: Im Merge-Modell ist **jede** Kopie dauerhaft nützlich, weil sie
Merge-Futter für die nächste Stufe ist — bis hinauf zu Suprem. Ein Drop kann sich damit nie
„wertlos" anfühlen, ohne dass es dafür eine eigene Zweitwährung braucht. Erst Kopien **oberhalb**
einer Suprem-Karte (die nicht mehr mergebar sind) sammeln sich als Reserve an; ob die später
in Gold, Material oder eine Prestige-Währung getauscht werden, ist bewusst **offen** und wird
erst relevant, wenn die ersten Spieler dort ankommen (frühestens nach ~44 Tagen, s. o.).

### Pack-Öffnungs-Zeremonie (UI-Spec)

**Das ist der eigentliche Suchtmoment — hier darf kein Frame gespart werden.**
Implementiert und lauffähig in **`arena_patches/ui_prototype.html`** (View „Packs").

1. **Kartenstapel verdeckt** in der Bildmitte, Anzahl = Karten- + Material- + Gold-Slots.
2. **Tap flippt einzeln.** Kein Auto-Reveal beim ersten Pack — die Bewegung will gelernt werden.
3. **VOR dem Flip glüht die Kartenkante in der Drop-Raritätsfarbe.** Der wichtigste Trick der
   ganzen Zeremonie: Die Antizipation entsteht *vor* der Information.
4. **Episch+ = Burst-FX** (im Prototyp als CSS-Ring), Legendär zusätzlich mit Zeitlupe und
   Sound-Stinger.
5. **Material- und Gold-Drops als eigene Mini-Karten** im selben Stapel — sie sind Teil des
   Rhythmus, nicht eine Zeile im Abspann.
6. **„Alle aufdecken"** ab dem 2. Pack, danach Zusammenfassung („+5 Karten, +8 Material, +432 Gold").
7. **Merge-verfügbar-Badge** erscheint **live** in der Collection, sobald ein Flip die dritte
   Kopie einer Stufe komplettiert. Der rote Punkt ist die direkte Fortsetzung des Pack-Moments.

## D) Reward-Verzahnung

Kein Belohnungssystem trägt allein. Vier Schleifen mit unterschiedlichem Takt greifen ineinander:

**Trophy-Road (Takt: pro Match).** Knoten mit Gold / Pack / Material / Kosmetik, mit
**wachsender Schrittweite** — im Vorbild belegt (§9.5): **50** Trophäen bis ~1300, **100** bis
~3400, danach **200**. Das übernehmen wir statt der ursprünglich geplanten konstanten 25er-
Schritte: dichte kleine Belohnungen am Anfang, seltenere große später, und pro Knoten mehr
Inhalt. **Arena-Unlocks bei 600 / 1200 / 1500 Trophäen** (belegte AA-Schwellen, §9.5 —
die früheren 250/700 waren geraten), darüber die Liga **Champions Peak ab ≈ 2900** mit eigenen
Gates. Neue Arena = neue Optik, neuer Bot-Rivalen-Band (`arena_rivals.js`, Schwellen dort
nachziehen), **neues Map Objective und eine neue Curse-Karte**
(`GAMEPLAY_OPTIMIERUNG.md` §8) und **neue Festungs-Stufen** (`arena_fortress.js`).
Die Road ist immer sichtbar, mit dem nächsten Knoten und der Distanz dorthin. Nach jedem Match
bewegt sich der Marker — auch nach einer Niederlage, weil `arena_profile.js` nur −10 abzieht.

**Season-Pass (Takt: ~30 Tage) — Struktur nach AAs „Golden Fortune" (§9.10).**
Video 6 zeigt das Season-Event vollständig; die erste Fassung dieses Kapitels hatte es als
reine Shard-Quelle fehlinterpretiert (§12.5). Übernommen wird:

* **DREI Spuren statt zwei:** **FREE**, **EPIC PASS**, **LEGENDARY PASS**. Die dritte Stufe ist
  der eigentliche Trick — sie verkauft nicht „Premium ja/nein", sondern lässt den Spieler die
  *Höhe* seines Einsatzes wählen. Bei zwei Spuren ist die Entscheidung binär und der
  Zahlungsunwillige ist dauerhaft draußen; bei drei gibt es eine mittlere Option, die
  Ersteinsteiger holt.
* **Saisonlänge ≈ 30 Tage** (belegter Season-Timer „Season Ends In 29d 9h", §9.6). Zusätzlich
  laufen **kürzere Events innerhalb** der Season — „Golden Fortune" selbst lief mit
  **„Ends in 9 day(s)"**. Zwei verschachtelte Takte: Season = Rahmen, Event = Sprint.
* **Event-Währung „Medals" über SIEGESSERIEN**, wörtlich: *„Keep your win streaks and earn
  bonus medals."* Das ist der wichtigste Unterschied zu unserer bisherigen Planung
  (Medaillen aus **Quests**): Eine Siegesserie belohnt **Können und Kontinuität am Stück**,
  eine Quest-Checkliste belohnt Anwesenheit. Empfehlung: **beides**, aber der Streak-Anteil
  ist der größere — Quests als Grundeinkommen, Streaks als Multiplikator. Das verzahnt sich
  direkt mit `arena_profile.js` (`streak` existiert dort schon) und mit dem Streak-Bonus aus
  `GAMEPLAY_OPTIMIERUNG.md` §4.
* **Endgame-Overflow als Vorbild** — der wörtliche Tooltip aus AA (§9.10):
  > „After reaching level 120, you get 1 Silver Chest with taps for every 100 exp you earn.
  > You can get a maximum of 20 chests in total."

  Also: **Pass-Level-Cap 120**, danach läuft die Progression als **Endlos-Overflow** weiter —
  je **100 EXP** eine **Silber-Truhe**, **maximal 20**. Das löst elegant das Problem, dass
  Vielspieler den Pass nach zwei Wochen durch haben und den Rest der Season ohne Ziel
  spielen: Es gibt weiter etwas zu holen, aber gedeckelt, also nicht farmbar. **Für uns
  1:1 übernehmen**, nur mit unseren Zahlen: Cap bei **60 Stufen**, danach je **100 Medaillen**
  ein **Silber-Pack**, maximal **20** — das sind 20 zusätzliche Packs für die obersten paar
  Prozent, kein zweiter Pass.
* **Kein Powerlevel-Deckel im Pass.** Bleibt so: Der Pass ist die einzige Stelle mit
  *Zeit*-Druck und darf deshalb nichts enthalten, was dauerhaft über PvP entscheidet.
  **Der „Arkan-Kern" der v1 entfällt** (er war der Deckel auf der Suprem-Aszension, die es
  nicht mehr gibt); an seine Stelle treten großzügige **Material**-Stufen — und zwar
  **sortenrein wählbar** (der Spieler entscheidet bei der Belohnung, welche der drei Essenzen
  er nimmt). Material ist im v2-Modell die knappste Ressource und damit die wirksamste
  Pass-Belohnung; die Wahl der Sorte macht daraus eine Entscheidung statt einer Gutschrift.

**Daily-Loop (Takt: täglich).** Drei Quests: **„2 Siege" / „2 Bosse besiegen" / „5 Fusionen
spielen"** → Medaillen. Der **1. Tagessieg** gibt zusätzlich ein **Silber-Pack** — das ist der
eigentliche Rückkehrgrund und muss in der Push-Nachricht stehen. Dazu ein **7-Tage-Login-Kalender
mit eskalierender Belohnung** (Tag 7 deutlich fetter als Tag 1–6 zusammen), der nach 7 Tagen
neu startet.

**Red-Dot-Ökonomie (Takt: permanent).** Ein roter Punkt ist ein Versprechen und muss immer
einlösbar sein:
- **Hub-Button** → sobald *irgendeine* Karte upgradebar (Material **und** Gold reichen) **oder
  mergebar** ist. Zwei Anlässe, ein Punkt.
- **Collection-Tab** → dito, mit Anzahl (im Prototyp: Zähler am Nav-Eintrag „Sammlung").
- **Einzelne Karte** → roter Punkt direkt auf der Kachel, sobald 3 Kopien einer Stufe beisammen
  sind (`ArenaCards.progressToNextMerge(id).ready`).
- **Auf jeder Karte immer sichtbar:** die **Merge-Punkte** ●●○ (`progressToNextMerge` →
  `have`/`need`) und das **LvL n**-Badge. Die Punktreihe ersetzt den alten Fortschrittsbalken:
  Sie ist auf 18 % Kachelbreite lesbar und beantwortet die einzige Frage, die zählt —
  *wie weit bin ich vom nächsten Farbwechsel?*

Regel: **Nie ein Red Dot ohne Aktion dahinter.** Ein Punkt, der nach dem Tap nichts zu tun
findet, entwertet alle anderen Punkte dauerhaft.

---

## E) Balance & Migration

### Warum `1.12^(lvl-1)` ersetzt werden muss

Die alte Meta-Skalierung war für ~Lv20 gebaut. Auf der 1–100-Leiter ergäbe sie
`1.12^99 ≈ 8.6 × 10^4` — eine Karte auf Lv100 würde das Vierzigtausendfache einer Lv1-Karte
anrichten. Jede Wellen-Kurve (`58 × 1.23^w`) wäre binnen weniger Level irrelevant, und PvP wäre
rein eine Frage des Kontostands. Die v2-Kurve landet bei **8.62×** über 100 Level — ein Faktor,
den Wellenwachstum und Turmanzahl auffangen können, und der einen Lv55-Spieler gegen einen
Lv85-Spieler noch gewinnen lässt, wenn er besser spielt.

Ersatz im Match: `ArenaCards.statMul(card.lvl, card.mergeBoni)` — die Merge-Boni gehen über den
`pw`-Faktor mit ein, die Einzelstat-Effekte separat über `ArenaCards.modsOf(id)`.

### Migration bestehender Stände

**v1 → v2** (`ArenaCards.migrateV1()`, läuft einmalig und lazy beim ersten `get()`):

| v1 | v2 |
|---|---|
| Level-Band (Lv1-19 grau, 20-39 grün, 40-59 blau, 60-79 lila, 80-99 orange, 100 rot) | **gleichfarbige Stufe** der neuen Leiter (grün = **Gut**, blau = **Selten**, lila = **Episch**, orange = **Legendär**) |
| `lvl` | `lvl`, gekappt auf das **Cap der Stufe** (niemand fällt eine Stufe zurück) |
| — | **1 Kopie** der eigenen Stufe (die Karte selbst) |
| `copies` (Level-Treibstoff) | → **Upgrade-Material**, 1:1 |
| `dust` (Arkan-Staub) | → **Upgrade-Material**, 10:1 |
| `perks` | → `mergeBoni` (die Perk-IDs sind stabil, nur ihre Stufen-Zuordnung hat sich verschoben) |

Die **Farbe bleibt also erhalten** — das ist die einzige Größe, die ein Spieler von seiner
Sammlung im Kopf hat. Eine v1-Karte auf Lv45 (blau) ist danach eine **Selten**-Karte auf Lv45
mit Cap 55: gleiche Farbe, gleiches Level, und der Weg nach oben ist wieder offen.

**v2 → v3** (Material-Sorten, `ArenaCards.migrateV1()` läuft **alle** Stufen in einem
Durchlauf, ein v1-Stand also v1→v2→v3):

| v2 | v3 |
|---|---|
| `material: n` (eine Zahl) | `materials: {attack, speed, special}` |
| — | Verteilung: **gleichmäßig gedrittelt**, Rest (0-2 Stück) auf `attack` |
| `cards`, `lvl`, `copies`, `mergeBoni`, `pendingBoni` | **unangetastet** |
| `pityEpic`, `pityLegendary`, `packsOpened` | **unangetastet** |

Beispiel: 100 Material → **34 / 33 / 33**. Niemand verliert etwas, und die Sorten starten
ausbalanciert — welche Sorte ein Spieler in v2 „gemeint" hat, ist nicht rekonstruierbar, jede
Ungleichverteilung wäre also willkürlich. Das alte Zahlenfeld `material` wird beim Lesen
entfernt, damit kein Code versehentlich weiter darauf zugreift.

#### v3 → v4 (eine Essenz je Karte, 29.07.2026)

Jede Altsorte geht an **genau die Karten, die sie bisher bedient hat**; der Rest einer nicht
glatt teilbaren Menge an den ersten Empfänger der Gruppe:

| v3-Sorte | → v4-Essenzen |
|---|---|
| `attack` | `fire`, `earth` |
| `speed` | `water`, `light` |
| `nature`… nein: `special` | `nature`, `darkness`, `solara`, `magmor` |

Beispiel aus dem Selbsttest: `{attack: 41, speed: 7, special: 26}` → `fire 21 / earth 20`,
`water 4 / light 3`, `nature 8 / darkness 6 / solara 6 / magmor 6`. **Summe 74 vorher wie
nachher** — der Test prüft genau das, nicht die Einzelzahlen allein.

> **⚠ Eine Migration muss ihre eigene Form einfrieren.** `migrateV2toV3()` hat bis zum
> 29.07.2026 `emptyMaterials()` und `MATERIAL_KEYS` benutzt — also die Form der *jeweils
> aktuellen* Fassung. Solange die aktuelle Fassung v3 war, fiel das nicht auf. Mit v4 hätte
> es einen v2-Stand über die **acht neuen** Schlüssel verteilt, und der Schritt v3→v4 hätte
> danach unter `attack`/`speed`/`special` nichts mehr gefunden: das Material eines
> Altspielers wäre je nach Reihenfolge verdoppelt oder verschwunden. Die v3-Form steht
> deshalb jetzt als eigene Konstante `V3_KEYS` im Modul und ändert sich nie wieder.

`getMaterials()` liefert seit v4 `{fire, water, nature, earth, light, darkness, solara,
magmor, total}`. `addMaterial(n)` **ohne** Sortenangabe bleibt rückwärtskompatibel und
verteilt round-robin über **alle** Sorten (mit wanderndem Rest-Zeiger, damit zehn
Einzelaufrufe nicht alle auf derselben landen) — genau das nutzen die generischen
Belohnungen (Straßen-Knoten, Login-Kalender, Guide-Aufgaben).

Der ältere Pfad **arenaHub → arenaCards** (`newLvl = min(100, round(oldLvl × 5))`) entfällt: Die
v1-Migration hat ihn bereits ausgeführt; wer direkt von `arenaHub` kommt, bekommt beim ersten
Start ohnehin eine leere v2-Bank und wird über die normalen Packs versorgt.

**`shardsBank` aus `arena_profile.js` entfällt.** Bestehende Splitter werden **nicht** migriert
(sie hatten nie eine definierte Umrechnung); stattdessen einmalig kulant abgelten:
`ArenaCards.addMaterial(shardsBank × 2)`. Danach `applyShardsToHub()`, `PACK_SHARDS` und
`LOSS_SHARDS` löschen.

### Matchmaking & Fairness

- **`aiLvl` bleibt adaptiv** — die Bot-Lernkurve ist unabhängig von der Karten-Progression und
  soll es bleiben, sonst kompensieren sich zwei Systeme gegenseitig und keines ist mehr messbar.
- **Später Ghost-PvP nach Karten-Power-Score**: `Σ (lvl × (1 + tierIndex × 0.5))` über alle
  Karten, gebändert (z. B. Bänder à 100 Punkte) — die Stufe muss mitzählen, weil zwei Karten auf
  Lv40 sehr unterschiedlich stark sind, wenn eine davon drei Merge-Boni trägt. Ein Spieler trifft nur Geister aus dem eigenen Band — dadurch wird Investment
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
| 1 | `arena_cards.js` einbinden, `metaMul` → `ArenaCards.statMul(lvl, mergeBoni)` | Kleinster Eingriff, sofort testbar, entkoppelt die Balance von allem Weiteren | ~20 min |
| 2 | Einmal-Migration `migrateV1()` beim Hub-Start | Muss **vor** der ersten Collection-Anzeige laufen, sonst wirkt die Sammlung leer | ~15 min |
| 3 | `arena_profile.js`: `packAwarded` → `openPack('bronze', …)`, `shardsBank` stilllegen | Ab hier fließen echte Karten, Material und Gold ins System | ~30 min |
| 4 | Pack-Öffnungs-Screen (Zeremonie §C) — **Vorlage: `ui_prototype.html`, View „Packs"** | Der eigentliche Wert des ganzen Systems — bewusst als eigener Block, nicht nebenbei | ~2–3 h |
| 5 | Collection-Grid in `deck.html`: `view()` / `progressToNextMerge()`, Merge-Punkte, Red Dot | Macht den Fortschritt sichtbar; ohne das ist Schritt 4 wirkungslos | ~1.5–2 h |
| 6 | **Turm-Detailkarte** (§2 der AA-Referenz): Stat-Vorschau, Material-Block, Upgrade-Button | Der meistbesuchte Screen des Spiels — **Vorlage: `ui_prototype.html`, View „Turm"** | ~2–3 h |
| 7 | **Forge/Merge-Screen** inkl. „Alle verschmelzen" + Bonus-Wahl-Dialog | Ohne ihn ist die Raritätsachse nicht spielbar — **Vorlage: `ui_prototype.html`, View „Schmiede"** | ~2 h |
| 8 | Red-Dot-Ökonomie + Daily-Quests | Retention-Schicht, sinnvoll erst wenn 1–7 stabil laufen | ~1.5 h |
| 8b | **`arena_fortress.js` + Festungs-Tab** (`totalMultipliers()` in `arena_pan.html`, Tab im Hub) | Unabhängig von 1–8 baubar, aber erst sinnvoll, wenn Meta-Gold fließt (Schritt 3). Löst die Gold-Senke — siehe §B „Festungs-Upgrades" | ~2–2.5 h |
| 9 | Trophy-Road / Season-Pass (3 Spuren, Medals über Siegesserien) | Größter Brocken, eigenes Arbeitspaket | ~4–6 h |

**Gesamt Schritte 1–8b: ca. 12–16 Stunden.** Nach jedem Schritt einzeln testen und committen.
Die Schritte 4, 6 und 7 haben mit `arena_patches/ui_prototype.html` eine **lauffähige, gegen
`ArenaCards` verdrahtete Vorlage** — dort ist Markup, CSS und Event-Logik bereits durchgetestet
(Playwright, 4 Views) und muss im Wesentlichen nur an die echten Turm-Assets angeschlossen werden.

### Test-Checkliste

- [ ] `node arena_patches/arena_cards.js` → **ALLE TESTS OK** (Leiter, Kurven, 10 000
      Bronze-Packs, Garantien aller vier Pack-Typen, Pity, Merge-Pyramide, Cap-Gating, Migration).
- [ ] `localStorage.arenaCards` existiert nach dem ersten Pack, hat **`v: 3`** und enthält
      `{cards, materials: {attack, speed, special}, matRR, gold: null, pityEpic,
      pityLegendary, packsOpened}` — **kein** Zahlenfeld `material` mehr.
- [ ] **Essenzen:** `materialTypeOf('fire') === 'fire'` (Schlüssel == Karten-ID);
      `MATERIAL_KEYS` deckt sich **exakt** mit der Kartenliste; unbekannte ID → `null`;
      `canLevelUp('fire')` meldet `reason: 'material'`, solange nur Frost-Essenz im Vorrat
      liegt — auch bei 999 Stück davon.
- [ ] **Pack-Sorten:** `openPack().materialSlots` ist ein Array aus `{type, amount}`, die
      Summe der `amount` entspricht `material`, und die Sorten sind über viele Packs
      gleichverteilt (gemessen 33.4 / 33.4 / 33.2 % über 20 000 Slots).
- [ ] **Offener Pity:** `getPityStatus()` → `{epicIn, legendaryIn}`; bei frischem Zähler
      **26 / 76**, und nach genau `epicIn` Packs war nachweislich ein Episches dabei.
- [ ] **Migration v2→v3:** Stand mit `material: 100` → `materials {34, 33, 33}`, Karten,
      Level, Kopien, Boni und Pity-Zähler unverändert, `v: 3`; zweiter Aufruf `{skipped: true}`.
- [ ] Eine Karte hat `{tier, lvl, copies: {common…supreme}, mergeBoni, pendingBoni}` —
      `copies` ist ein **Objekt pro Stufe**, kein Zähler.
- [ ] `openPack('bronze')`-Verteilung über 10 000 Simulationen: Gewöhnlich ~74 %, Gut ~22 %,
      Selten ~2.6 %, Episch ~0.8 %, Legendär ~0.3 %; **Suprem exakt 0**.
- [ ] **Jedes** Bronze-Pack enthält mindestens einen Gut-Slot (Garantie); analog Silber ≥ Selten,
      Gold ≥ Episch, Arkan ≥ Legendär.
- [ ] **Pity greift:** nie mehr als 25 Packs ohne Episch+, nie mehr als 75 ohne Legendär.
- [ ] **Merge-Pyramide:** 243 Gewöhnlich-Kopien auf eine Karte → `mergeAll()` → 121 Merges,
      Endstufe **Suprem**, keine Restkopien darunter.
- [ ] **Cap-Gating:** Karte auf Gewöhnlich hochleveln → stoppt bei **Lv25**, `canLevelUp().reason
      === 'cap'`; nach einem Merge auf Gut geht es bis **Lv40** weiter.
- [ ] **Level-Up zieht Material, nicht Kopien:** `copies` bleibt unverändert, `material` sinkt um
      `3 + tierIndex`, `goldCost` wird nur **gemeldet** (Abzug macht der Hub).
- [ ] **Helden-Quote:** ~6.25 % der Slots bei Pool 8 mit 2 Helden.
- [ ] Migration: v1-Stand mit `cards.fire.lvl = 45` → v2 `tier: 'rare'`, `lvl: 45`,
      `copies.rare === 1`; zweiter Aufruf liefert `{skipped: true}`.
- [ ] Match: ein Lv40-Turm richtet ~2.3× Schaden eines Lv1-Turms an — **nicht** ~10 000×
      (= alte Formel läuft noch irgendwo).
- [ ] Fusion im Match: erbt weiterhin `mlvl` der Basis-Türme, keine eigene Karte im Grid.
- [ ] **Festung:** `node arena_patches/arena_fortress.js` → **ALLE TESTS OK**. Kostenreihe
      beginnt **6 000 · 7 000 · 8 000 · 9 000**, letzte (36.) Stufe **41 000**, Summe
      **846 000**; bei 0 🏆 sind genau **6** Stufen kaufbar, dann `locked` mit
      `lockAt: 600`; voll ausgebaut `hpMul 1.498` / `prismDmgMul 1.664` /
      `prismRateMul 1.415`, Power **6 120**.
- [ ] **Festung im Match:** ein Kauf auf `hp` erhöht die Burg-HP im nächsten Match sichtbar;
      ohne Käufe sind alle Multiplikatoren **exakt 1.0** (kein stiller Balance-Eingriff).
- [ ] **UI:** `arena_patches/ui_prototype.html` im Browser öffnen → alle vier Views ohne
      JS-Fehler durchklickbar (Playwright-Skript im Scratchpad, **37 Schritte** grün):
      Top-Bar-Reihenfolge 🏆|💎|🪙, Material-Sorte in der Detailkarte, Sortierung „Nach
      Rarität", Pity-Zeile auf dem Pack-Screen.

---

## Spätere Ausbaustufen

| Phase | Feature | Referenz |
|---|---|---|
| 2 | **Skill-Karten** als dritter Track: eigenes Meta-Level für die 3 Hero-Spells, eigene Drop-Slots in Silber+ Packs. Im Vorbild eine getrennte Währung; für uns erst sinnvoll, wenn die Spells mechanisch ausgebaut sind. | AA: „upgrade your skills with skill cards" |
| 2 | **Trick-/Curse-Karten** in den Pool (Disruption-Play), gleiche Level-Leiter. | AA-Kern-Feature |
| 3 | **Clan-System mit Karten-Donations**: anfragen + spenden, **Spenden gibt Gold**. Der stärkste soziale Retention-Hebel im Vorbild, weil Geben sich selbst belohnt. **Konkretisiert 2026-07-25 aus dem belegten Clan-Screen (§9.8):** max. **40 Mitglieder** (beobachtet 39/40, 38/40, 37/40, 27/40); Beitrittsmodus **„Nur auf Anfrage"** oder **„Offen"** pro Clan; **Clan-Gesamttrophäen** als Sortier-/Prestigewert (beobachtet 72.6K bis 25.3K); und als Aufnahmekriterium das Feld **„Min *Peak* Trophy Requirement"** — es zählt der **historische Höchststand**, nicht der aktuelle Stand. Letzteres unbedingt übernehmen: Es macht eine Pechsträhne unschädlich für die Clan-Zugehörigkeit (niemand fliegt raus, weil er drei Matches verloren hat) und verlangt trotzdem einen echten Nachweis. Dafür muss `arena_profile.js` ein Feld **`peakTrophies`** mitführen — billig jetzt, nachträglich nicht rekonstruierbar. | AA: „request donations …, donate to earn gold" · §9.8 |
| 3 | **Ghost-PvP** nach Karten-Power-Score (`Σ lvl`), gebändert. | §E |
| 4 | **Gems als Zweitwährung + Monats-Abo** (Referenz: „Royal Monthly Letter", 1200 Gems + 300/Tag). Erst wenn Retention steht — eine Monetarisierung auf einem undichten Eimer ist verschwendete Arbeit. | AA-Shop |

---

## Z) ÜBERHOLT (v1) — das ursprüngliche Kopien-Level-Modell

> **⚠ ÜBERHOLT durch die Videoanalyse vom 2026-07-24 — siehe `AA_UI_REFERENZ.md` §2/§4/§5
> und die Kapitel B/C oben.** Dieser Anhang ist bewusst erhalten, weil er die Begründungs-
> kette der ersten Fassung dokumentiert und weil einzelne Bausteine (Perk-Philosophie,
> Zeremonie-Spec, Fairness-Prinzipien) unverändert weitergelten. **Nicht implementieren.**
>
> **Die drei Kernirrtümer der v1:**
> 1. *„Rarität ist ein Level-Band derselben Karte."* — Falsch. Rarität ist eine **eigene Achse**,
>    die per Merge steigt und das **Level-Cap** setzt (AA: Good → 20, Rare → 30).
> 2. *„Ein Level-Up kostet Kartenkopien."* — Falsch. Er kostet **Upgrade-Material + Gold**;
>    Kartenkopien sind ausschließlich Merge-Futter. In keinem Video existierte ein
>    „Kopien x/y"-Balken (§10.9).
> 3. *„Ein Pack-Slot droppt ein Bündel von n Kopien."* — Ersetzt durch: ein Slot droppt **eine
>    Karte, ggf. vorgemergt**. Eine Gut-Karte ist rechnerisch exakt 3 Gewöhnliche.

<details>
<summary>Vollständiger v1-Text (Kapitel B und C, Stand 2026-07-19)</summary>

### (v1) B) Karten-Level-System (Level 1–100)

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

#### Stat-Kurve

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

#### Zeit bis zum Farbwechsel

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

#### Raritäts-Aufstieg = Event mit Perk-Wahl

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

#### Helden

Gleiche 1–100-Leiter, gleiche Kopien- und Gold-Kosten. Zwei Unterschiede:

- **Helden-Kopien droppen ~5× seltener** (Slot-Gewicht 1/5 gegenüber Element-Türmen). Bei Pool 8
  mit 2 Helden landen damit 6.25 % aller Slots auf Helden (gemessen: 6.25 %).
- **Neue Helden werden über eine Freischalt-Schwelle entsperrt: die ersten 10 Kopien = Unlock.**
  Vorher ist der Held im Grid sichtbar, aber gesperrt, mit Balken „7/10 bis Freischaltung" —
  das ist ein Near-Miss-Anker auf Content, den man noch gar nicht besitzt, und der stärkste
  Grund, einen weiteren Pack zu öffnen.

#### Fusionen & Triples

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

### (v1) C) Booster-Pack-System

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

#### Pack-Typen

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

#### Pity (versteckt in der Mechanik, offen in der Doku)

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

#### Overflow → Arkan-Staub

Kopien, die eine Karte auf Lv100 nicht mehr braucht, werden zu **Arkan-Staub**:
**1 überzählige Kopie = 1 Staub**, **150 Staub = 1 beliebige Kopie im Shop**. Auf Lv100 hält die
Karte eine Reserve von 50 Kopien für die Aszension; alles darüber (und alles nach der Aszension)
staubt ab. So fühlt sich **kein Drop je wertlos an** — der 100. Relikt-Drop auf eine
ausgemaxte Karte ist immer noch 100 Staub und damit ⅔ einer freien Kopie.

#### Pack-Öffnungs-Zeremonie (UI-Spec)

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

</details>
