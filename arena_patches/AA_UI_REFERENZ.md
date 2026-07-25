# AA-UI-Referenz — "Arcane Arena: Tower Defense TD" (Panteon/MWM)

Referenzdokumentation für den Nachbau in **Arcane Prism TD**.

> **Stand: 2. Durchgang (Video 6 eingearbeitet).** Video 6 hat mehrere Lücken geschlossen
> (Trophy Road, Champions Peak, Season, Leaderboard, Clans, Season-Pass, Fortress-Upgrades)
> und **vier Befunde der ersten Fassung korrigiert** — allen voran die Zuordnung der
> Top-Bar-Währungen. **Alle Abweichungen sind in §12 gesammelt; bitte zuerst dort lesen.**
Quelle: Screen-Recordings des Users (Google Drive), analysiert per ffmpeg + Tesseract-OCR
(wortgenaue Koordinaten via `tesseract tsv`), Bewegungsanalyse (Frame-Differenz) und
Farb-Quantisierung in einer Cloud-Sandbox.

> **Hinweis zu Screenshots:** In dieses Repo werden bewusst **keine** AA-Frames eingecheckt
> (urheberrechtlich geschütztes Material, öffentliches Repo).
>
> Die Frames konnten auch **nicht lokal abgelegt** werden: Google Drive ist aus der lokalen
> Umgebung nicht erreichbar (nur `github.com` ist freigegeben), und der einzige Rückkanal aus
> der Cloud-Sandbox ist stdout, das Bildübertragung per Base64 auf ~20 000 Zeichen pro Aufruf
> begrenzt und mittig abschneidet. Die Auswertung erfolgte deshalb **vollständig
> programmatisch in der Sandbox** — was für Zahlen und Layout sogar genauer ist als das
> Betrachten verkleinerter Screenshots.
>
> Ein Index aller analysierten Frames samt exakter `ffmpeg`-Kommandos zur Reproduktion liegt
> im Scratchpad unter `aa_frames/FRAMES_INDEX.md`. Die Zeitstempel in diesem Dokument
> erlauben jederzeit die Rekonstruktion aus den Originalvideos.

**Methodische Genauigkeit:** Fließtext (Labels, Beschreibungen, Merge-Texte) wurde sehr
zuverlässig erkannt (OCR-Confidence 90-96). **Stat-Zahlenwerte** benutzen in AA einen stark
stilisierten Font mit Outline und werden vom OCR häufig verstümmelt — diese sind unten als
*unsicher* markiert. Strukturelle Aussagen (Positionen, Reihenfolge, welche Felder existieren)
sind dagegen exakt, weil sie aus Pixelkoordinaten stammen.

---

## 0. Video → Inhalt → relevante Zeitstempel

| # | Datei / Drive-ID | Länge | Inhalt | Interessante Zeitstempel |
|---|---|---|---|---|
| 11 | `ScreenRecording_07-24-2026 23-18-43` · `1Q8mMXaUxWuyNL3ioKZuxi_Ay20pB35Db` | 2:09 | **Menü-Tour — die mit Abstand wichtigste Aufnahme.** Shop → Helden → Turmkarten → Battle Deck → Merge → Collection → Home | 0-25 Shop/Daily Deals · 15 Truhen · 20 Gems/Gold-Bundles · 30-60 Helden + Shard-Popup · 63-97 **Turm-Detailkarten** (Divine Sword, Catapult, Ice Blaster, Skyflare) · 100/115/121 Battle Deck + Collection · **105-112 Merge-Screen** · 125-129 Home/Trophy |
| 1 | `ScreenRecording_07-18 07-40` · `109XW1SNSiwoRpb7zbn0W0FYBEo5GzXza` | 4:35 | Reines PvP-Match, Arena 4 „Dock Drop", Gegner *Netherghost* vs. *SunnyJewel2N40*. Kein Endscreen (Aufnahme bricht im Match ab) | 0-10 Matchmaking + Ladebildschirm mit Tipps · 15+ Match-HUD |
| 2 | `ScreenRecording_07-17 19-59` · `1f8wCYEb6UBf-W84NOlUs9qlkb5Vd_Jpl` | 7:24 | PvP-Match Arena 4, *FlashDovey20U3* vs. *HelloThaiLanD* — **mit Sieg + Belohnungsscreen** | 78 Match-HUD mit Turmauswahl · 198 Skill-Beschreibung („star levels") · **438 VICTORY** · **441 Belohnungsscreen (+39 Trophäen, +610 Gold)** |
| 3 | `ScreenRecording_07-17 19-46` · `1p5cDo0-bWSW-d3c4RfV6gktynhCESwuy` | 6:06 | PvP-Match Arena 4, *Netherghost* vs. *DirtyDansen* — **mit Sieg + Belohnungsscreen**; enthält zusätzlich die Turm-Platzierungs-Hinweise („1x2 TOWER PATH") | 0-8 Matchmaking · Match-HUD · **358 VICTORY** (bei Restzeit 02:18) · **365 Belohnungsscreen (+39 Trophäen, 610 Gold, „TAP TO CLOSE")** |
| 6 | `ScreenRecording_07-05 16-04` · `12-pNrsLpUwnnySckbYh8IOwbhRFc6RY2` (Kopie: `1CM1fn9aw7hjkA7FF3BSzHfl1fcxrbF5L`) | 4:25 | **Zweite große Menü-Tour — komplementär zu Video 11.** Anderer Account-Stand: *Netherghost*, **Level 4, Arena 2, 425 Trophäen**. Enthält alles, was Video 11 fehlte: Trophy Road komplett, Champions Peak, Season, Leaderboard, Clans, Golden-Fortune-Pass und das **Fortress-Upgrade-System** | 0-22 Shop (Daily Deals, Arcane Supplies Chest mit Pity-Counter, Truhen, Gem-Bundles) · 25-32 Battle Deck + Collection („By Rarity", RESOURCES, **TO BE FOUND**) · **34-98 Golden Fortune (Season-Pass, FREE/EPIC/LEGENDARY)** · 100 Home (Level 4, Arena 2) · 105-112 **Map Objectives + Trick Cards** · **115-190 Trophy Road / Arena-Liste mit allen Schwellen** · 150-215 Champions Peak + Season + Leaderboard · **220 CLANS** · **226-264 FORTRESS-UPGRADES mit Goldkosten** |
| 4-5, 7-9 | weitere 07-05-Aufnahmen | — | nicht ausgewertet | — |
| 10 | YouTube „ARROW PLAY" | — | nicht ausgewertet | — |

---

## 1. Währungen & Top-Bar

> ⚠️ **Dieser Abschnitt wurde nach Video 6 korrigiert.** Die ursprüngliche Zuordnung war falsch —
> siehe §12.1.

Die Top-Bar sitzt bei **y ≈ 180-250** (Screen 1320 × 2868, iPhone-Hochformat) und zeigt
bis zu drei Werte, jeweils Icon + Zahl, plus ein „+"-Badge zum Aufladen:

| Position (x) | Währung | Icon-Farbe (gemessen) | Video 6 (Arena 2) | Video 11 (Arena 4) |
|---|---|---|---|---|
| ~215-300 | **Trophäen** | hellblau/weiß `#9FC0DF`, Zahl cyan `#ADF6F3` | **425** | **1136** |
| ~650-740 | **Gems** (Premium) | magenta/pink `#DC1DDB`, `#F5A7F7` | **245** | **491** |
| ~1065-1180 | **Gold** (Soft Currency) | goldgelb `#F3B733`, `#F4CD46` | **1446** | **8218** |

Beweis für die Zuordnung (dreifach):
1. Der Leaderboard-Screen in Video 6 (t=195) schreibt wörtlich **„Your Trophies: 425"** —
   identisch mit dem Wert im ersten Feld.
2. Die Icon-Farben passen: Goldmünze = gelb (Feld 3), Gem-Kristall = magenta (Feld 2).
3. Die Arena-Schwellen (§9.5) passen exakt: 425 Trophäen → Arena 2 ✓ ·
   1136 Trophäen → Arena 4 (Arena 5 beginnt erst bei 1200) ✓.

**Die Top-Bar ist kontextabhängig** und zeigt nicht überall dieselben drei Werte:
* **Home / Shop / Trophy Road:** Trophäen · Gems · Gold
* **Collection / Battle Deck:** nur **Gems · Gold** (kein Trophäenfeld!)
* **Helden-Screen:** im ersten Slot stehen statt der Trophäen die **Helden-Shards**
  (in Video 11 dort „840", während die Trophäen 1136 betrugen — das erklärt den scheinbaren
  „Absturz" von 1136 auf 840 beim Screenwechsel).

Weitere Ressourcen existieren, werden aber nicht in der Top-Bar geführt, sondern im
Collection-Tab (siehe §7): Upgrade-Material (8 Sorten), Helden-Shards, Hero Items, Booster.
Zusätzlich existiert eine Event-Währung **Medals** (Golden Fortune, §9.10) und ein
**Account-Level** mit XP (Home-Screen, Video 6: „Level 4"), das Fortress-Upgrades freischaltet.

Ein Antipp-Tooltip erklärt Währungen im Klartext, z. B. **„Gem — A valuable currency"**
(Video 6, t=210).

---

## 2. Turm-Detailkarte (der zentrale Screen) — **Priorität 1**

Beobachtet an vier Türmen: **Divine Sword**, **Catapult**, **Ice Blaster**, **Skyflare**
(Video 11, t = 63-97 s).

### 2.1 Layout (exakte Pixelkoordinaten, Screen 1320 × 2868)

Der Screen ist ein **Vollbild-Modal** (Panel von y ≈ 360 bis y ≈ 2510, x ≈ 40 bis 1280),
darüber bleibt die Top-Bar sichtbar.

```
y 180-250   ┌ TOP-BAR: Gems | Gold | Trophäen ──────────────────────┐
y 360-430   │ ‹ (Zurück, x≈211)      [Rarität-Banner]      × (schließen) │
y 390       │        TURMNAME (zentriert, x 424-880)                │
y 430-540   │        RARITÄTS-BANNER (farbig, siehe §3)             │
            │                                                        │
y 450-1080  │  ┌──────────────┐   Target                            │
            │  │  TURM-       │   Air & Ground / Ground   (x≈670)   │
            │  │  DARSTELLUNG │                                      │
            │  │  (ANIMIERT!) │   Beschreibungstext, 3 Zeilen        │
            │  │  x 100-500   │   (x 542-1135, y 803-910)            │
            │  │              │                                      │
            │  │              │   [LEVEL n/max Badge]  (y≈960-1030)  │
            │  └──────────────┘                                      │
y 1101      │  ⚡ Power: 2116          (x 213, linksbündig)          │
            │                                                        │
y 1239      │  ┌ Stat 1 (x 281) ──────┬ Stat 2 (x 794) ──────┐      │
y 1270-1330 │  │ Wert → Wert nach Up  │ Wert → Wert nach Up  │      │
y 1364      │  ├ Stat 3 (x 280) ──────┼ Stat 4 (x 794) ──────┤      │
y 1390-1450 │  │ Wert                 │ Wert                 │      │
y 1489      │  └ Stat 5 (Grids Covered, nur bei Support-Türmen)     │
            │                                                        │
y 1627-1673 │  „Merge 3 identical <Turm> cards to unlock:"          │
            │  „<Bonus A> und <Bonus B>"                            │
            │                                                        │
y 1881      │        Upgrade Material  (zentriert, x 482-840)       │
y 1950-2150 │        [Material-Icon]   19/5   (x≈658)               │
            │                                                        │
y 2250-2450 │  [ Unequip ]            [ UPGRADE ]                   │
y 2295      │                          „Upgrade" (x 537-785)        │
y 2366      │                          🪙 8000   (x 646)            │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Die „Video"-Frage — **bestätigt: der Turm wird animiert dargestellt**

Der User berichtete, AA zeige in der Turm-Detailkarte *Videos* des Turmangriffs.
Das wurde messtechnisch verifiziert (Frame-Differenz über 1,0-1,6 s bei **statischem**
Screen, also ohne Öffnungs-/Slide-Animation):

* Bei **allen** untersuchten Turmkarten (Divine Sword t=64,6-66,2 · Ice Blaster t=79,0-80,5)
  ist **exakt eine** Bildregion dauerhaft in Bewegung, alles andere ist pixelgenau statisch
  (Differenz ≈ 0,0-0,6):
  * **x ≈ 165-495, y ≈ 880-1080** (starke Bewegung, Mittelwert-Differenz 60-70)
  * plus schwacher „Halo" direkt darüber bei y ≈ 836-956
* Diese Region liegt **links unten in der Turmdarstellung**, direkt links neben dem
  Beschreibungstext. Größe ca. **330 × 200 px** ≈ 25 % der Bildschirmbreite.
* **Interpretation:** Es ist eine dauerhaft laufende **Loop-Animation** (kein einmaliges
  Intro — sie läuft auch >15 s nach dem Öffnen der Karte noch), die den Turm bzw. sein
  Geschoss/Effekt in Aktion zeigt. Technisch reicht für den Nachbau ein **geloopter
  Sprite-/Spine-Clip oder ein kurzes stummes Video-Loop** in einem festen Rahmen.
* Der Rest der Turmgrafik (oberer Teil, y ≈ 450-880) ist **statisch** — es wird also nicht
  die ganze Kachel als Video gerendert, sondern nur der „Action"-Ausschnitt.

**Nachbau-Empfehlung:** Rahmen ~25 % Breite / ~7 % Höhe des Screens, links, vertikal auf
Höhe des unteren Beschreibungsdrittels; Endlosschleife ohne Steuerelemente, ohne Ton.

### 2.3 Konkrete Werte pro Turm

| Turm | Rarität | Level-Anzeige | Power | Stat-Felder | Merge-Bonus (3 identische) | Upgrade Material | Upgrade-Kosten |
|---|---|---|---|---|---|---|---|
| **Divine Sword** | GOOD (grün) | `15/20` | **1516** | Bonus Health · Bonus Damage · Bonus Push Strength · Bonus Crit Chance · Grids Covered | **Bonus Health +1 % und Bonus Damage +1 %** | **19 / 5** | **8000 Gold** |
| **Catapult** | GOOD (grün) | `16/20` | **1701** | Area Damage · Attack Rate · Crit Chance · Min Attack Range · Max Attack Range | **Area Damage +16 % und Attack Rate −5 %** | **12 / 5** | 8000 Gold *(gleiche Position, s. u.)* |
| **Ice Blaster** | RARE (blau) | `15/30` | **2116** | Ranged Damage · Attack Rate · Slow Effect · Attack Range | **Ranged Damage +22 % und Attack Rate −7 %** | **19 / 5** | **8000 Gold** |
| **Skyflare** | — | — | **464** | (Anti-Air) | — | **40 / 3** | 8000 Gold |

Beschreibungstexte (wörtlich, OCR-Confidence 95-96):

* **Divine Sword** — „Empowers surrounding towers with silent support. Does nothing loudly,
  but everything effectively." · Targets: **Air & Ground**
* **Catapult** — „Deals high area damage from afar with arcing, powerful shots. Big rock.
  Big boom. No complaints." · Target: **Ground**
* **Ice Blaster** — „Fires icy spikes that slow down enemies hit. Cool under pressure.
  Literally." · Target: **Ground**
* **Skyflare** — „Burns through the skies, leaving no flying enemy untouched.
  Clouds not included."

**Stat-Werte (unsicher, stilisierter Font):** Ice Blaster Slow Effect ≈ **57,5 %**,
Attack Rate ≈ **0,93 s**, Ranged Damage ≈ **438 → 522** (Pfeil-Darstellung).
Wichtig ist die **Struktur**: die Karte zeigt bei den upgradebaren Stats **zwei** Werte —
*aktuell* und *nach dem nächsten Upgrade* — verbunden durch einen Pfeil. Das ist ein sehr
konversionsstarkes Muster und sollte übernommen werden.

### 2.4 Das Level-System (Herleitung)

* Battle-Deck und Merge-Screen zeigen an jeder Karte ein Badge **`LvL n`**; beobachtete
  Werte: **1, 1, 1, 7, 8, 8, 11, 15, 15, 16, 17, 20, 23**.
* Die Detailkarte zeigt eine Anzeige der Form **`n / max`**:
  Divine Sword `15/20`, Catapult `16/20` (beide **GOOD/grün**), Ice Blaster `15/30` (**RARE/blau**).
* **Schlussfolgerung:** Das Maximallevel einer Karte hängt an ihrer **Rarität**.
  Beobachtet: **GOOD → Cap 20**, **RARE → Cap 30**. Extrapoliert (nicht direkt belegt):
  Common → 10, Epic → 40, Legendary → 50 (jeweils +10 pro Raritätsstufe).
  Ein Deck-Turm mit `LvL 23` bestätigt, dass Level >20 nur oberhalb von GOOD existieren.
* **Upgrade-Kosten:** Nur ein einziger Gold-Betrag war lesbar: **8000 Gold**, und zwar bei
  drei verschiedenen Karten (Divine Sword Lv15, Catapult Lv16, Ice Blaster Lv15) mit
  *unterschiedlichen* Materialständen. Das legt nahe, dass die **Goldkosten in Stufen/
  Plateaus** wachsen (nicht pro Level einzeln), oder dass die drei Karten zufällig im selben
  Kostenband lagen. **Eine vollständige Level→Kosten-Tabelle war in den Videos nicht sichtbar**
  (siehe Lücken, §10).

---

## 3. Raritätsleiter

Aus den Truhen-Texten (Video 11, t=16 s, OCR-Confidence 90-96) direkt belegt:

* *Explorer Chest*: „Contains one **Common** or **Good** card"
* *Mystic Chest*: „Contains one **Good**, **Rare**, or … card"
* Shop-Banner oben: „… **Epic** or **Legendary** …"

**Belegte Leiter (aufsteigend):**

| Stufe | Name | Farbe (gemessen, Hex) | Beleg |
|---|---|---|---|
| 1 | **Common** | grau (nicht direkt gesampelt) | Explorer-Chest-Text |
| 2 | **Good** | **#68B965 / #89DD4C / #8ADB4F** (grün) | Kartenrahmen Merge-Screen + Rarität-Label auf Divine Sword/Catapult |
| 3 | **Rare** | **#5291EF / #559BEB / #619EF7** (blau); Detail-Banner **#2379EC / #1D73E6** | Kartenrahmen Merge-Screen + Ice-Blaster-Banner |
| 4 | **Epic** | vermutlich violett (nicht gesampelt) | Shop-Banner |
| 5 | **Legendary** | vermutlich orange/gold (nicht gesampelt) | Shop-Banner |

Hinweis: AA benutzt **nicht** „Common/Rare/Epic/Legendary" wie Clash Royale, sondern schiebt
eine Stufe **„Good"** zwischen Common und Rare. Höhere Stufen als Legendary (Relic/Supreme)
waren in **keinem** Video zu sehen — Video 6 bestätigt das: Die höchste irgendwo genannte
Stufe ist **Legendary** (Truhentexte, „LEGENDARY PASS", Pity-Counter „Get Legendary in …").
**Die Leiter hat damit fünf Stufen und endet bei Legendary.**

Ergänzung aus Video 6 (Collection sortiert **„By Rarity"**, Account Level 4): Das Kartenraster
zeigte nur **graue** und **grüne** Rahmen — der Account besaß noch keine höheren Raritäten.
Damit ist die Farbe für **Common = grau** bestätigt, **Epic** und **Legendary** bleiben
ungemessen (einziger Hinweis: der *Legendary-Pass*-Button hat einen violetten Farbstich
`#2D0B39`, was für Legendary eher violett/magenta als orange spricht).

Weitere gemessene UI-Farben: **Upgrade-Button grün #58FA1B / #48E222**, Hintergrund der
Turmdarstellung blau **#5D9BF5 / #63B1EE**, Top-Bar-Hintergrund fast schwarz **#01090B**.

---

## 4. Merge-System — **Priorität 1 (User-Nachtrag)**

### 4.1 Bestätigung der User-Beschreibung

Die Aussage „3 graue → 1 grüne, 3 grüne → 1 blaue …" wird durch die Videos **bestätigt und
präzisiert**. Der Text auf **jeder** Turm-Detailkarte lautet wörtlich:

> **„Merge 3 identical &lt;Kartenname&gt; cards to unlock: &lt;Bonus A&gt; and &lt;Bonus B&gt;"**

**→ Es müssen 3 IDENTISCHE Karten sein (derselbe Turm), nicht drei beliebige derselben
Raritätsstufe.** Das ist explizit im UI-Text verankert („3 identical Ice Blaster cards").

### 4.2 Was der Merge bringt

Anders als ein reines „3-zu-1"-Fusionieren schaltet der Merge einen **permanenten
Zusatz-Bonus** auf der Karte frei — pro Karte individuell und thematisch passend:

| Karte | Freigeschalteter Merge-Bonus |
|---|---|
| Divine Sword | **Bonus Health +1 %** und **Bonus Damage +1 %** |
| Catapult | **Area Damage +16 %** und **Attack Rate −5 %** (−5 % = schneller) |
| Ice Blaster | **Ranged Damage +22 %** und **Attack Rate −7 %** |

Beachtenswert: Die Boni sind **nicht** einheitlich, sondern pro Turm balanciert (Support-Turm
Divine Sword bekommt nur +1 %/+1 %, Damage-Türme deutlich mehr). Attack Rate wird als
**negativer Prozentwert** dargestellt, weil kleinere Werte besser sind.

Der Merge ist damit gleichzeitig **Raritäts-Aufstieg** (grün → blau, mit dem daran hängenden
höheren Level-Cap, s. §2.4) **und** Stat-Freischaltung.

### 4.3 Merge-Flow in der UI (Video 11, t = 103-113 s)

Einstieg: **Battle Deck / Collection → Button „Forge"** (im Deck-Screen unten rechts neben
den Tabs sichtbar). Danach öffnet sich ein Vollbild-Screen:

```
y 305    SELECT CARDS TO MERGE!            (Titel, zentriert x 779-1117)
y 443                       REQUIRED CARDS  (rechts oben, x 833-1063)
y 480-1000                  [Slot-Bereich für die benötigten Karten]
y 1172                      [ Merge All ]   (x ≈ 1019-1269, rechts)
y 1203   By Level ▾  (Sortier-Dropdown, links, x 84-268)
y 1380+  ┌─────┬─────┬─────┬─────┬─────┐   Kartenraster, 5 Spalten
         │     │     │     │     │     │   Spalten-x ≈ 96 / 344 / 592 / 844 / 1095
         │Equip│Equip│Equip│Equip│Equip│   „Equipped"-Badge auf ausgerüsteten Karten
         │LvL20│LvL17│LvL16│LvL15│LvL15│   Level-Badge unten auf jeder Karte
         ├─────┼─────┼─────┼─────┼─────┤
         │LvL11│LvL8 │LvL8 │LvL7 │LvL1 │
         ├─────┼─────┼─────┼─────┼─────┤
         │LvL1 │LvL1 │ …
y 2721   [ Back ]  (links unten)
```

Beobachteter Ablauf:
1. Nutzer tippt „Forge" im Deck.
2. Screen „SELECT CARDS TO MERGE!" öffnet sich, das Raster zeigt **alle** Karten,
   sortiert per Dropdown **„By Level"**.
3. Rechts oben zeigt „REQUIRED CARDS" die für den Merge benötigten Karten an.
4. Ein **„Merge All"**-Button erlaubt das Sammel-Mergen aller möglichen Kombinationen
   auf einmal (Convenience-Feature, wichtig für den Nachbau!).
5. „Back" links unten.

**Nicht beobachtet:** eine explizite Gold-Kosten-Anzeige im Merge-Screen, die
Merge-Zeremonie/Animation selbst, und ob Skill- und Helden-Karten ebenfalls mergebar sind
(die Tabs „Towers / Skills / Items" existieren, ein Merge wurde aber nur im Turm-Kontext
gezeigt). Siehe §10.

---

## 5. Upgrade-Material (die „Upgrade-Karten" des Users) — **Priorität 1 (User-Nachtrag)**

Die Turm-Detailkarte hat einen eigenen, zentrierten Block:

```
y 1881          Upgrade Material          (Label, zentriert)
y 1950-2150     [Material-Icon]  19 / 5   (Bestand / Bedarf)
```

Beobachtete Stände: **19/5** (Divine Sword), **12/5** (Catapult), **19/5** (Ice Blaster),
**40/3** (Skyflare).

**Auswertung:**
* Das Format ist **Bestand / Bedarf-für-das-nächste-Level**. Der Bedarf ist mit **3 bzw. 5**
  sehr klein und variiert pro Karte — vermutlich abhängig von Rarität und/oder aktuellem Level.
* ⚠️ **Korrigiert nach Video 6 (§12.3):** Es gibt **mindestens 8 verschiedene Materialsorten**
  mit unabhängigen Beständen und Kategorien („speed", „special") — siehe §7.1. Der gleiche
  Bestand **19** bei Divine Sword und Ice Blaster war **Zufall**, keine gemeinsame generische
  Ressource. Skyflares „40/3" ist entsprechend ein **anderer Materialtyp mit anderem Bedarf**.
* Das Upgrade wird über den grünen **„Upgrade"-Button** ausgelöst, der **Material + Gold**
  kostet (**8000 Gold** in allen drei lesbaren Fällen).
* **Konsequenz für das Modell:** Ein Karten-Level-Up kostet in AA **Upgrade-Material +
  Gold** — es kostet **nicht** Kopien der Karte selbst. Die Kartenkopien werden stattdessen
  für den **Merge** (Raritätsaufstieg) verbraucht. Das ist ein wichtiger Unterschied zum
  Clash-Royale-Modell und deckt sich mit der Beschreibung des Users
  („separate Upgrade-Karten, die nur Stats erhöhen").
* Erhöht werden dadurch die auf der Karte gelisteten Stats (Power sowie die 4-5 Einzelstats);
  die Karte zeigt die Erhöhung vorab als **„aktuell → nachher"** an (§2.3).

**Drop-Quellen** (aus Shop/Truhen-Screens): Truhen (Explorer/Mystic/Arcane Supplies Chest),
Daily Deals im Shop, sowie Arena-/Match-Belohnungen. Eine explizite Zuordnung
„Material droppt aus X" war nicht eingeblendet.

---

## 6. Helden-Screen — Priorität 3

Video 11, t = 25-62 s. Beobachtete Helden: **Frost**, **Storm**, **Ember**, **Melody**,
**Merlin** (letzterer per „Unlock"-Dialog).

### 6.1 Layout

```
y 180-250   Top-Bar (Gems 840 | Gold 491 | Trophäen 8218)
y 350-600   Held-Portrait / 3D-Darstellung (links, groß)
y 587       Rank        (Label, x 695)     →  Wert z. B. „Amateur"
y 721       Level       (Label, x 695)     →  z. B. „1/18", „23/50"
y ~820      Target      (Label)            →  „Air & Ground"
y 992       Damage      (Label, x 695)
y 1127      Attack Rate (Label, x 812)     →  „0.53 sec" / „0.08 sec"
y 1379      [ Upgrade ] (Button, x 720-909)
y 1430+     „Hero Pass"  |  „HERO VAULT"   (zwei Sub-Einstiege)
y 1600-2300 Skill-/Perk-Liste (siehe unten)
y 2719      [ Back ]
```

### 6.2 Helden-Skills / Perks

Unterhalb der Basiswerte listet der Screen aufwertbare **Helden-Skills**, jeweils mit
Beschreibung, Wirkungswert und einem Fortschritt `x/y` (verbrauchte/benötigte Shards):

| Skill | Wirkung (OCR) | Fortschritt |
|---|---|---|
| **Lightning** | „Lightning enemy attack speed loss: **−30,4 %**" | — |
| **Icesurge** | „Ice towers gain crit damage" | — |
| **Heroic Range** | „Hero range: **+10,74**" | — |
| **Ice Expanse** | „Skill's … radius **+30 %**" | — |
| **Heroic Might** | „Hero damage …" | **36 / 50** |

Zusätzlich Zeilen mit Scope-Angabe **„All Heroes"** und Werten **40 / 60 / 50** sowie **1100** —
vermutlich globale Helden-Boni (Account-weit) mit Trophäen-/Level-Schwellen.

### 6.3 Shards & Unlock

* Helden werden mit **Shards** freigeschaltet/aufgewertet.
* Popup **„INSUFFICIENT SHARDS — You need … more Frost shards."** mit Sektion **„HOW TO GET"**,
  die die Quellen nennt: **Golden Fortune**, **Arena Rewards**, **Frozen Treasure**.
* Alternativ Sofortkauf: **2800** (Gems) mit Hinweis **„1/2 Chances left"** (limitiertes
  Kaufkontingent!).
* Unlock-Dialoge: **„Unlock Storm now?"** → **800** (Gems) bei **178/18**? (Shards),
  **„Unlock Ember"** → **~1800**, **„Unlock Merlin now?"**.
* Held-Level-Anzeige `1/18`, `23/50` → auch hier **Level / Cap**, Cap abhängig von der
  Held-Rarität (Frost war als **Rare**, ein anderer als **Epic** gelabelt).

---

## 7. Collection / Battle Deck — Priorität 6

Video 11, t = 100 / 115 / 121 s.

```
y 405/465   BATTLE DECK        (Titel)
y 600-1350  Deck-Slots: große Karten mit Level-Badges „LvL 23", „LvL 20", „LvL 17", „LvL 15"
y 1460      Tabs:  Towers (x 269)  |  Skills (x 603)  |  Items (x 910)
            daneben: Sortierung „By Level"  und  Button „Forge"
y 1500-2700 Kartenraster (5 Spalten), Karten mit farbigem Raritätsrahmen + „LvL n"
y 1770      RESOURCES        →  x23 · x7 · x85
y 2155      HERO ITEMS       →  x3 · x5 · x3   (mit „New!"-Badges)
y 2400+     BOOSTERS         →  x5 · x3 · x3
y 2754      [ Collection ]   (Bottom-Nav)
```

* Das Kartenraster ist durchgehend **5 Spalten breit** (Spalten-x ≈ 96 / 344 / 592 / 844 / 1095,
  Kartenbreite ≈ 240 px bei 1320 px Screenbreite → ca. 18 % Breite pro Karte, ~2 % Gutter).
* Jede Karte trägt: Raritätsrahmen (Farbe = Rarität), Turm-Icon, **`LvL n`**-Badge unten,
  und bei ausgerüsteten Karten zusätzlich ein **„Equipped"**-Band.
* Drei Kartenklassen: **Towers**, **Skills**, **Items** — alle im selben Raster-Muster.
* Ressourcen sind in drei Gruppen unterteilt: **RESOURCES**, **HERO ITEMS**, **BOOSTERS**,
  jeweils als Icon-Reihe mit `xN`-Bestand und „New!"-Badge bei Neuzugängen.
* **Sortierung:** Es gibt mindestens zwei Modi — **„By Level"** (Video 11) und
  **„By Rarity"** (Video 6). Umschaltbar per Dropdown links über dem Raster.

### 7.1 RESOURCES-Raster und „TO BE FOUND" (Video 6, t=28-32) — neu

Video 6 zeigt den Ressourcen-Bereich vollständig ausgescrollt. Das Raster ist
**4 Spalten breit** (Spalten-x ≈ 178 / 494 / 810 / 1165):

```
y  358   RESOURCES
y  656   x18    x16    x10    x8       ← Reihe 1 (4 Materialsorten)
y  972   x7     x1                     ← Reihe 2
y 1122   TO BE FOUND
y 1452   „Not found"   „Arena 8"   „Arena 8"        ← Reihe 1
y 1786   „Arena 4"     „Arena 5"                    ← Reihe 2
```

* Es existieren also **mindestens 8 verschiedene Upgrade-Material-/Ressourcensorten**
  (Bestände 18 / 16 / 10 / 8 / 7 / 6 / 2 / 1). Das stützt und präzisiert §5: Skyflare zeigte
  „40/3", die anderen Türme „19/5" bzw. „12/5" — **es sind unterschiedliche Materialsorten
  pro Turm/Element**, nicht eine einzige generische Ressource.
* **„TO BE FOUND"** ist ein eigener Abschnitt, der die **noch nicht besessenen** Ressourcen
  zeigt und direkt daruntersteht, **in welcher Arena sie freigeschaltet werden**
  („Arena 4", „Arena 5", „Arena 8") bzw. „Not found" für noch unbekannte.
  Die Icons trugen Labels wie **„speed"** und **„special"** → es gibt Material-Kategorien.
* **Nachbau-Empfehlung:** Dieses „TO BE FOUND"-Panel ist ein sehr starkes
  Retention-Element — es zeigt dem Spieler konkret, welche Arena er erreichen muss, um an
  ein bestimmtes Material zu kommen.

---

## 8. Shop & Truhen — Priorität 4/5

Video 11, t = 0-25 s. Bottom-Nav-Tab **„Shop"**.

### 8.1 Aufbau (von oben nach unten)

1. **Werbe-Entfernen-Banner**: „Buy any offer to remove forced ads"
2. **ARENA PACK** und **Starter Pack** — Echtgeld-Angebote, Preis in **Fr.** (Schweizer
   Franken, Store-Währung des Users): z. B. **Fr. 3**; Inhalt als Icon-Reihe
   (`x500`, `x5`, `x3`, `x25`) plus „value"-Badge.
3. **DAILY DEALS** — „New deals in **6h 58m**", mit **Refresh**-Button.
   Beobachtete Einzelangebote:
   | Ware | Menge | Preis |
   |---|---|---|
   | Gems | — | — |
   | Boomerang | x30 | **Free** (Ad) |
   | Ice Wall | x10 | **10 000** Gold |
   | Blueprint / Greenprint | x10 | **20 000** Gold |
   | Lightning / Share / Blitzcard / Wing | — | **300 / 500 / 800** |
   * Anzeige **„Available: 5"** → begrenzte Stückzahl pro Tag.
   * Fehlkauf-Popup: **„INSUFFICIENT GOLD — You need 176 more Gold." → [Get Now]**
4. **TRUHEN** (t = 15 s):
   | Truhe | Inhalt-Text | Timer / Preis |
   |---|---|---|
   | **EXPLORER CHEST** | „Contains one **Common or Good** card" | **Free in: 3h 41m** |
   | **MYSTIC CHEST** | „Contains one **Good, Rare, or …** card" | **Free in: 3h 41m**, Sofort für **80** Gems |
   | **ARCANE SUPPLIES CHEST** | (Material/Ressourcen) | — |
   * Banner darüber verspricht **„Epic or Legendary cards"** (kostenpflichtige Truhe).
5. **ENDLESS ROULETTE** — Glücksrad-Feature mit Belohnungsreihe (`x5`, `x1`, `x8`, `x1`).
6. **Gem-Bundles** (t = 20 s):
   | Paket | Gems | Preis |
   |---|---|---|
   | Heap of Gems | **80** | Fr. 3 |
   | (mittel) | **~200** | Fr. 4 |
   | Bag of Gems | **2500** | Fr. 40? |
   | Trophy of Gems | **6500** | — |
   | Safe of Gems | **14000** | Fr. 90 |
7. **Gold-Bundles**:
   | Paket | Gold | Preis |
   |---|---|---|
   | Bag of Gold | **10 500** | — |
   | Pile of Gold | **31 500** | — |
   | Trophy of Gold | **~126 000** | — |
   * Ein Gold-Paket ist per Werbevideo **FREE** (Rewarded Ad).

### 8.2 ARCANE SUPPLIES CHEST — Pity-Counter und Mengenrabatt (Video 6, t=10-18)

Video 6 zeigt diese Truhe im Detail — sie ist die **gem-basierte Karten-Truhe**:

```
        ARCANE SUPPLIES CHEST
   „Get Good, Rare, Epic, or Legendary cards"
   „Get [Legendary-Icon] in <N> opens"      ← PITY-COUNTER
   [ OPEN x1 ]  300 Gems      [ OPEN x10 ]  2680 Gems
```

* **Pity-Counter:** Die Truhe zeigt direkt auf der Karte an, nach wie vielen Öffnungen eine
  **Legendary garantiert** ist. Der Zahlwert ist im OCR nicht sicher lesbar (stilisierte
  Schrift mit Inline-Icon), die beste Lesung ist **50 Öffnungen** — als *unsicher* zu behandeln,
  die *Existenz* des Mechanismus ist dagegen sicher.
* **Mengenrabatt:** 10× Öffnen kostet **2680** statt 3000 Gems → **≈ 10,7 % Rabatt**.
* Raritätsspanne dieser Truhe: **Good, Rare, Epic oder Legendary** (kein Common).

### 8.3 Drop-Raten

**Es wurden in keinem Video prozentuale Drop-Raten eingeblendet**, auch nicht in Video 6.
Kein Info-/„i"-Button wurde geöffnet. AA kommuniziert Wahrscheinlichkeiten stattdessen über
zwei Mechanismen:

1. **Garantierte Raritätsspannen** im Truhentext („Contains one Common or Good card",
   „Get Good, Rare, Epic, or Legendary cards").
2. **Sichtbarer Pity-Counter** („Get Legendary in N opens", §8.2).

Das ist für den Nachbau die wichtigere Erkenntnis: AA verzichtet bewusst auf Prozentangaben.

### 8.4 Preis-Skalierung mit dem Fortschritt (Abweichung, siehe §12.4)

Der Shop zeigt bei den beiden Accounts **deutlich unterschiedliche Preise**:

| Ware | Video 6 (Arena 2, Lv 4) | Video 11 (Arena 4) |
|---|---|---|
| Daily Deal „Ice Wall" | **3 000** Gold | **10 000** Gold |
| Daily Deal „Blueprint/Greenprint" | **5 400** Gold | **20 000** Gold |
| weitere Daily Deals | 200 / 720 / 900 / 2 700 | 300 / 500 / 800 |
| Angebotsanzahl | „Available: 3" | „Available: 5" |
| Daily-Deal-Reset | „New deals in 2h 26m" | „New deals in 6h 58m" |
| Gratis-Truhen-Timer | „Free in: 3d 9h" | „Free in: 3h 41m" |

→ **Sowohl Preise als auch Slot-Anzahl und Timer skalieren mit dem Account-Fortschritt.**

Weitere in Video 6 sichtbare Shop-Elemente:
* **„Arena 2 Pack"** — **arena-spezifische** Echtgeld-Pakete (Fr. 4), passen sich der
  aktuellen Arena an.
* **„EPIC SUNDAY"** — Wochentags-gebundenes Sonderangebot.
* Gem-Bundles hier: **80** / **200** / **500** / **7 200** (Heap / Pile / … of Gems).
* **ENDLESS ROULETTE** mit Belohnungsreihe (x1, x10, x75 …).

---

## 9. Match-HUD, Match-Ende & Meta-Progression

Belegt aus Video 1 (Arena 4 „Dock Drop") und Video 2 (mit Sieg).

### 9.1 Ladebildschirm / Matchmaking

* „Looking for a worthy opponent" mit Countdown (**4 sec**), Arena-Label **„Arena 4: Dock Drop"**,
  [CANCEL]-Button.
* **Rotierende Gameplay-Tipps**, z. B.:
  * „Enemies get stronger over time. Don't rely on just one strategy."
  * „Placing a Boulder Tower at the beginning of a long path could be a good strategy."
* Danach „Battle is starting" mit Vorschau der eingesetzten Karten (z. B. *Frost Gargoyle*,
  *Fire Mage*, *SpellFrenzy*).
* Beide Spieler werden mit Name und **Clan** („No clan") gegenübergestellt.

### 9.2 In-Match-HUD (1320 × 2868)

```
y ~170   [Gegnername links]                    [Eigener Name rechts]
y ~207   „Time Left:"  →  z. B. 07:55 / 06:36 / 00:58   (zentriert, x ~580-745)
y ~240   Gold-Anzeige des Spielers  (z. B. 10 500 / 10 817 / 3 500)
y ~720   Helden-Label „Frost" / „Storm" (Held im Feld, mit Level/Balken)
y 1665   [ Refresh ]   (x 1089-1281)  — würfelt das Turm-Angebot neu
y 1891   [ Upgrade ]   (x 1075-1209)  — wertet den gewählten Turm im Match auf
y ~2340  Turm-Auswahlleiste, 3 Karten nebeneinander, z. B.
         WOLF BARRACKS | ARCHER TOWER | (dritter Turm)
         bzw. CANNON TOWER | ICE BLASTER TOWER | THUNDER TOWER
         bzw. WOLF BARRACKS | CANNON TOWER | CATAPULT TOWER
y ~2450  Cooldown-Anzeigen pro Karte: „30 sec", „25 sec", „15 sec", „10 sec", „2 sec"
y ~2500  Wellen-Banner: „Wave incoming in 5" / „>> Wave Incoming 4"
```

Weitere HUD-Elemente:
* **Turm-Platzierung (Video 3):** Beim Ziehen einer Turmkarte auf das Feld erscheint ein
  Hinweis-Overlay mit der **Grundfläche des Turms** und dem Pfadbezug, wörtlich
  **„1x2"** und **„TOWER PATH"**. Türme belegen also ein **rechteckiges Grid-Feld
  (z. B. 1×2 Zellen)** und werden relativ zum Gegnerpfad platziert. Das korrespondiert
  direkt mit dem Meta-Stat **„Grids Covered"** auf der Turm-Detailkarte (§2.3) — die
  belegte/abgedeckte Fläche ist eine aufwertbare Eigenschaft.
* **Skill-/Zauberkarten** mit Kurzbeschreibung, z. B. *Spell Frenzy* — „…fast for nonstop
  spell chaos.", *Starfall Curse*, sowie ein Effekt „**Reduces star levels of a … by 1/1/2
  star level(s)**".
* **→ Türme haben im Match „Star Levels"** (Sternstufen), die im Match steigen bzw. durch
  gegnerische Skills gesenkt werden können. Das ist ein eigenständiger In-Match-Progressions-
  Layer neben dem Meta-Level der Karte.
* Der **Refresh-Button** deutet auf ein rotierendes Turm-Angebot im Match hin (Draft/Shop-
  Mechanik pro Match), der **Upgrade-Button** auf In-Match-Turmaufwertung gegen Match-Gold.

### 9.3 Match-Ende (Video 2, t = 438-443 s)

```
y ~608    V I C T O R Y   (groß, zentriert, x 412-846)
y ~862    FlashDovey20U3           (Sieger oben)
y ~918    HelloThaiLanD            (Verlierer)
y 1036    VS
y ~1494   Held-Anzeige „Frost"
y 2044    + 39      →  Trophäen-Gewinn
y 2141    + 610     →  Gold-Gewinn
```

**Belohnung bei Sieg in Arena 4: +39 Trophäen, +610 Gold.**

Dieser Wert ist **doppelt belegt**: Video 2 (t=441) und Video 3 (t=365) zeigen bei
unterschiedlichen Gegnern und unterschiedlichem Matchverlauf **exakt dieselben Beträge**
(+39 / 610). Das spricht für **feste, arenagebundene Siegprämien** statt performance-
abhängiger Belohnung — ein wichtiges Balancing-Detail für den Nachbau.

Der Screen aus Video 3 ergänzt:
* Aufbau: **VICTORY** (y≈642) → Sieger-/Verlierername mit Clan („No clan") um y 861/918,
  **VS** dazwischen (y 1037) → Held-Anzeige → Belohnungszeilen (y 2044 Trophäen, y 2141 Gold)
* Abschluss per **„TAP TO CLOSE"** (y≈2598, zentriert) — kein expliziter Button.
* Das Match endete bei **Restzeit 02:18**, d. h. Matches haben ein Zeitlimit, können aber
  vorher durch Zerstörung der Gegnerbasis entschieden werden.

Ein Kartendrop war auf dem Belohnungsscreen nicht erkennbar. Ein **Niederlagen-Screen** war
in keinem Video enthalten.

### 9.4 Home-Screen / Meta

Video 11, t ≈ 126 s:
* **„Arena 4: Dock Drop"** mit Zusatz **„Neutral"** (Modifier/Element der Arena?).
* **„GOLDEN FORTUNE"**-Event-Banner mit Countdown **2d 3h**.
* Untere Kacheln: **EVENTS** (x 197) und **CHALLENGES** (x 939).
* Großer **[ Battle ]**-Button unten (x 584).
* Spieler-**Level**-Anzeige oben links neben dem Avatar.
* Eine Trophäen-/Belohnungsleiste mit Schwellen **1000 / 1050 / 1100 / 1150** und Rewards
  (`x25`, `x5` …) — die Schrittweite der Trophy Road beträgt hier **50 Trophäen**
  (vollständige Leiter jetzt in §9.5).
* Video 6 ergänzt: **Account-Level** neben dem Avatar („Level 4"), Arena-Label
  **„Arena 2: Dustfall Temple"** mit Modifier **„Neutral"**, Event-Banner **GOLDEN FORTUNE**.

### 9.5 Trophy Road / Arena-Liste — vollständig (Video 6, t=115-190) — **Lücke geschlossen**

Die Trophy Road ist ein **vertikaler Scroll** mit den Trophäenschwellen linksbündig
(x ≈ 100) und den Belohnungen rechts daneben. An den Arena-Grenzen ist jeweils ein
**Arena-Banner** eingeschoben, der Name, Nummer, Schwelle und ein **„Unlocks:"**-Feld zeigt.

| Arena / Liga | Name | Trophäen-Schwelle |
|---|---|---|
| Arena 2 | **Dustfall Temple** | < 600 (Account mit 425 war hier) |
| Arena 3 | **Sunken Atlantis** | **600** |
| Arena 4 | *(Name in Videos nicht sichtbar)* | zwischen 600 und 1136 (Account mit 1136 war hier) |
| Arena 5 | **Aztec Grounds** | **1200** |
| Arena 6 | **Inferno Pit** | ≈ **1500** |
| Liga | **Champions Peak** — Entrance Gate | ≈ **2900** |
| Liga | Champions Peak — **Gate 2 Stonegate** | ≈ **3400** |
| Liga | Champions Peak — **Gate 3 Ironpass** | ≈ **3900** |
| Liga | Champions Peak — **Gate 4 Bronzeward** | ≈ **4600** |
| Liga | Champions Peak — **Gate 5 Silverfield** | ≈ **5400** |
| Liga | Champions Peak — **Gate 8 Flamegate** | ≈ **7800** |
| Liga | Champions Peak — **Gate 9 Stormcrest** | ≈ **8800** |
| Liga | Champions Peak — Spitze | ≈ **9800** |

Auch die Arena 1 und die Gates 6/7 existieren zwangsläufig, waren aber nicht im Scroll-
Ausschnitt. Die Gate-Namen folgen einer Material-Progression
(*Stone → Iron → Bronze → Silver → … → Flame → Storm*).

**Schrittweite der Belohnungsknoten** (wichtig für die Kurve):

| Trophäenbereich | Schrittweite | belegte Knoten |
|---|---|---|
| 400 – 1 300 | **50** | 400, 450, 500, 550, 600, 700, 750, 800, 850, 900, 950, 1000, 1050, 1200, 1250, 1300 |
| 1 500 – 3 400 | **100** | 1500, 1600, 1700, 2000, 2100, 2200, 2300, 2400, 2700, 2800, 2900, 3100, 3200, 3300, 3400 |
| 3 800 – 9 800 | **200** | 3800, 3900, 4400, 4600, 5200, 5400, 6400, 6600, 7200, 7400, 7600, 7800, 8600, 8800, 9800 |

Belohnungsmengen pro Knoten (gemischt Gold, Gems, Karten, Material):
`x1, x3, x4, x5, x8, x10, x12, x15, x20, x23, x25, x30, x35, x45, x75, x80, x125, x1K, x1.2K, x4K`.
Die großen `xK`-Werte sind Gold, die kleinen Zahlen Karten/Material/Gems.
Am Ende einer Sektion gibt es einen **„Okay"**-Bestätigungsbutton und einen **„Top"**-Sprung-
Button (springt an die Spitze der Leiter).

### 9.6 Champions Peak, Season & Leaderboard (Video 6, t=150-215) — **Lücke geschlossen**

* Oberhalb der normalen Arenen liegt die Liga **„Champions Peak"**, unterteilt in
  **Gates** (Entrance Gate, Gate 2-9+, siehe §9.5).
* **Season-Timer:** „**Season Ends In 29d 9h**" — dauerhaft im Kopf der Trophy Road und der
  Champions-Peak-Ansicht eingeblendet. Saisonlänge also ≈ **30 Tage**.
* **Leaderboard** (eigener Screen, Einstieg „Leaderboards" neben dem Season-Timer):
  Rangliste mit Avatar, Rang, Spielername und Trophäenzahl.
  Beobachtete Spitzenwerte: **6509, 6412, 6384, 6308, 6287, 6235, 6186, 6131, 6116**
  (Namen: *Theseus, stone116, Defendermmorpg, Alexflow, Midnightsun, maso2020, littleb38,
  ForsakenSleeper*).
* Im Kopf des eigenen Eintrags steht **„Your Trophies: 425"** — der Beweis für die
  Währungs-Korrektur in §1/§12.1.

### 9.7 Map Objectives & Trick Cards — Arena-Freischaltungen (Video 6, t=105-125) — neu

Jede Arena schaltet über das **„Unlocks:"**-Feld ihres Banners neue Match-Modifier frei.
Es gibt zwei Klassen, die im UI klar als solche gelabelt sind:

**„Map Objective"** — Regeländerung für die ganze Map:

| Name | Notiz |
|---|---|
| **Spell Frenzy** | schon aus Video 1 bekannt („…fast for nonstop spell chaos") |
| **Bounty Bloom** | |
| **Straight Combat** | |
| **Endless Refresh** | vermutlich unbegrenztes Turm-Angebot-Refreshen (§9.2) |
| **Doom Clock** | |

**„Trick Card"** — einsetzbare Störkarte gegen den Gegner:

| Name | Notiz |
|---|---|
| **Chains of Binding** | |
| **Curse of Weakness** | |
| **Phantom Cart** | |
| **Ghostly Distraction** | |
| **Mystic Obstacles** | |
| **Starfall Curse** | schon aus Video 1 im Match beobachtet |
| **Cursed Gust** | |

Der Arena-Modifier **„Neutral"** auf dem Home-Screen bedeutet demnach: *aktuell kein
Map Objective aktiv*. Beispiel: Arena 3 (Sunken Atlantis, 600 Trophäen) schaltet frei:
*Endless Refresh*, *Doom Clock*, *Ghostly Distraction*, *Mystic Obstacles*.

**Nachbau-Empfehlung:** Das ist ein extrem billiger Content-Multiplikator — dieselben Maps
fühlen sich durch rotierende Objectives neu an, und es gibt der Trophy Road einen Zweck
jenseits von Zahlen.

### 9.8 Clan-Screen (Video 6, t=220) — **Lücke geschlossen**

Titel **„CLANS"** (y 201), darunter eine Liste; Bottom-Nav-Tab heißt **„Clans"**.
Jede Zeile (Höhe ≈ 203 px) enthält:

```
[Clan-Wappen]  Clanname                    Min Peak Trophy Requirement
               [Mitglieder 39/40]  [Request only | Open]        <Wert>
                                                    [Clan-Gesamttrophäen  72.6K]
```

| Feld | Beobachtete Werte |
|---|---|
| Clannamen | TheCorner, DarkLord, Celtic Warriors, Knights of Old, House of Kings, BULGARS, Gondor, Dildopia, IRAN korosh, …FC |
| Mitgliederzahl | **39/40**, 38/40, 37/40, 27/40 → **Clangröße max. 40** |
| Beitrittsmodus | **„Request only"** oder **„Open"** |
| **Min Peak Trophy Requirement** | eigenes Feld pro Clan (im Beispiel 0) |
| Clan-Gesamttrophäen | **72.6K, 54.9K, 46.2K, 45.2K, 43.3K, 38.18K, 33.2K, 25.3K** |

Bemerkenswert: Das Aufnahmekriterium heißt **„Min *Peak* Trophy Requirement"** — es zählt
also der **historische Höchststand**, nicht der aktuelle Trophäenstand.

### 9.9 Fortress-Upgrades — eigenes Bottom-Nav-Tab „Upgrade" (Video 6, t=226-264) — **komplett neues System**

Dies ist das **wichtigste neue Finding aus Video 6** und war in der bisherigen Referenz
überhaupt nicht enthalten. Es gibt einen eigenen Bottom-Nav-Tab **„Upgrade"** (x ≈ 1033),
der die **Festung/Basis des Spielers** dauerhaft aufwertet — völlig getrennt von den
Turmkarten.

**Layout:** Vertikale Liste von Upgrade-Karten; die oberste ist aufgeklappt und zeigt Details,
die darunter (y ≈ 1125, 1575, 2025, 2475 — Abstand ≈ 450 px) sind zusammengeklappt.

```
y  375-450   <UPGRADE-NAME>            z. B. „DPS", „Attack Speed", „Max Health"
y  525       „Increases fortress attack power" / „...attack speed" / „Increases health"
y  600       <Stat> +16%  /  +17%  /  +1%  /  +HP
y  675       Power  +170                        ← Gesamt-Power-Zugewinn
y  900       [ 🪙 9,000 ]                       ← Goldkosten
             bzw. [ Level Too Low ]             ← gesperrt, wenn Account-Level zu niedrig
y 2758       Bottom-Nav: „Upgrade"
```

**Upgrade-Tracks und Goldkosten (die gesuchte Kostenkurve!):**

| Track | Effekt pro Stufe | Beobachtete Goldkosten |
|---|---|---|
| **DPS** | „Increases fortress attack power" — **+17 %**, dann **+16 %** | **6 000** → **9 000** |
| **Attack Speed** | „Increases fortress attack speed" — **+1 %** | **7 000** → **17 K** |
| **Max Health** | „Increases health" — +HP | **8 000** |
| *(alle)* | zusätzlich **Power +170** pro Stufe | |

* Beobachtete Kostenreihe insgesamt: **6 000 · 7 000 · 8 000 · 9 000 · … · 17 000**
  → grob **+1 000 Gold pro Stufe** im unteren Bereich, später deutlich steiler.
* **Gating:** Stufen sind zusätzlich per Account-Level gesperrt — der Button zeigt dann
  **„Level Too Low"** statt eines Preises. Der Account in Video 6 war Level 4 und hatte
  1446 Gold, konnte also keine der Stufen kaufen (deshalb wurde auch keine ausgeführt).
* Der Prozentwert **sinkt** mit steigender Stufe (+17 % → +16 %), d. h. AA nutzt
  **abnehmenden Grenznutzen** bei steigenden Kosten.

**Nachbau-Empfehlung:** Ein solcher Festungs-Upgrade-Baum ist ein hervorragender
Gold-Sink jenseits der Karten und gibt dem Account-Level (XP) eine echte Funktion.

### 9.10 „Golden Fortune" — Season-Pass/Event (Video 6, t=34-98) — **Lücke geschlossen**

Ein großes, zeitlich begrenztes Belohnungs-Event mit Pass-Struktur:

* Titel **„Golden Fortune"**, Timer **„Ends in 9 day(s)"** (also ≈ 9 Tage, kürzer als die
  30-tägige Season) — es lief in Video 11 ebenfalls („Golden Fortune", 2d 3h Restzeit).
* Untertitel/Regel: **„Keep your win streaks and earn bonus medals."**
  → Die Event-Währung sind **Medals**, verdient über **Siegesserien (win streaks)**.
* **Drei Pass-Stufen** (Buttons am unteren Rand):
  * **FREE** (Gratis-Spur)
  * **EPIC PASS** (kostenpflichtig)
  * **LEGENDARY PASS** (kostenpflichtig, höchste Stufe; Button mit violettem Farbstich
    `#2D0B39`)
* Der Belohnungspfad ist ein langer horizontaler/vertikaler Scroll (t=34-98, ca. 64 s
  Scrollzeit!) mit Mengen `x1, x2, x3, x4, x5, x6, x8, x10, x20, x23, x30, x35, x98, x110`
  sowie einem Medal-Zähler („…30" im Kopf).
* Es gibt eine **„Extra Reward"**-Sektion mit erklärendem Tooltip (wörtlich):
  > **„After reaching level 120, you get 1 Silver Chest with taps for every 100 exp you earn.
  > You can get a maximum of 20 chests in total."**

  → Nach dem Pass-Level-Cap **120** läuft die Progression als **Endlos-Overflow** weiter:
  je **100 EXP** eine **Silver Chest**, **maximal 20** Truhen. Ein sehr konkretes,
  übernehmbares Muster für das Pass-Ende.
* **„Back"**-Button unten links.

---

## 10. Lücken — Stand nach Video 6

**Status-Legende:** ✅ geschlossen · 🟡 teilweise geschlossen · ❌ weiterhin offen

1. 🟡 **Level→Kosten-Tabelle der Turmkarten.** Bei den *Karten* immer noch nur **ein**
   Preis (8000 Gold) — Video 6 enthält **keine einzige Turm-Detailkarte**.
   **Aber:** Für die **Festung** liegt jetzt eine echte Kostenreihe vor
   (6 000 / 7 000 / 8 000 / 9 000 / … / 17 000 Gold, §9.9). Für die Kartenkurve wäre eine
   Aufnahme nötig, in der derselbe Turm mehrfach hintereinander aufgewertet wird.
2. 🟡 **Drop-Raten.** Weiterhin **keine Prozentwerte** und kein geöffneter Info-Button.
   Neu ist aber der **Pity-Counter** („Get Legendary in ~50 opens", §8.2) — AA kommuniziert
   Wahrscheinlichkeit bewusst über Raritätsspannen + Pity statt über Prozente.
3. ❌ **Pack-/Truhen-Öffnungs-Zeremonie.** Auch in Video 6 wurde keine Truhe geöffnet.
   Grund ist jetzt bekannt: Der Account hatte **245 Gems**, das Öffnen kostet **300 Gems** —
   er konnte es sich nicht leisten. Ablauf, Glüh-/Flip-Animation und Skip bleiben unbekannt.
4. ❌ **Merge-Animation und Merge-Kosten.** Video 6 zeigt den Merge-Screen nicht einmal
   (nur den „Forge"-Button). Unverändert offen.
5. ❌ **Merge für Skills/Items.** Unverändert offen. Helden nutzen erkennbar **Shards**
   statt Karten, ein Helden-Merge ist daher unwahrscheinlich.
6. 🟡 **Raritätsfarben.** **Common = grau bestätigt** (Video 6, Collection „By Rarity").
   **Epic** und **Legendary** weiterhin ungemessen — der Account war zu früh im Spiel.
   Sicher ist jetzt: **die Leiter endet bei Legendary**, es gibt kein Relic/Supreme.
7. ✅ **Clan-Screen** (§9.8), ✅ **Season/Battle-Pass** (§9.10 Golden Fortune mit
   FREE/EPIC/LEGENDARY), ✅ **vollständige Arena-Liste mit Trophäenschwellen** (§9.5),
   ✅ **Champions-Peak-Liga, Season-Timer und Leaderboard** (§9.6).
   ❌ Weiterhin offen: **Niederlagen-Screen** und eine **Sterne-Wertung** von Matches
   (in vier Match-Aufnahmen nie eine Niederlage aufgezeichnet), sowie die Details von
   **„Hero Pass"** und **„HERO VAULT"** (nur als Einstiegs-Buttons gesehen).
8. ❌ **Name von Arena 4** und die Namen von Arena 1 sowie Champions-Peak-Gate 6/7 —
   lagen nicht im Scroll-Ausschnitt.
9. ❌ **Helden-Screen in Video 6** nicht enthalten; die Helden-Angaben stammen weiterhin
   ausschließlich aus Video 11 (§6).
8. **Videos 4-9 (07-05) und 10 (YouTube)** wurden nicht ausgewertet — Videos 1, 2 und 3
   erwiesen sich sämtlich als reines Gameplay, die komplette Menü-Ausbeute stammt aus
   Video 11. Die 07-05-Aufnahmen sind nach Dateigröße/Länge ebenfalls Gameplay und hätten
   voraussichtlich nichts Neues zum UI beigetragen.
9. **Karten-Kopien-Anzeige.** Nirgends war ein „Kartenkopien x/y bis Level-Up"-Balken
   sichtbar (das klassische Clash-Royale-Element). Das stützt die Auswertung in §5, wonach
   Level-Ups über Upgrade-Material laufen und Kartenkopien ausschließlich für den Merge
   gebraucht werden — sollte aber an einem Video mit tatsächlichem Level-Up verifiziert
   werden.

---

## 11. Die wichtigsten Übernahme-Empfehlungen für Arcane Prism TD

1. **Zwei getrennte Progressions-Achsen pro Karte:** *Level* (Upgrade-Material + Gold, hebt
   Stats) und *Rarität* (3 identische Karten mergen, hebt Level-Cap **und** schaltet einen
   permanenten Zusatz-Bonus frei). Das ist AAs Kern-Differenzierung gegenüber Clash Royale.
2. **Level-Cap an die Rarität koppeln** (belegt: Good 20, Rare 30 → Schrittweite 10).
3. **Merge-Bonus pro Karte individuell balancieren**, nicht pauschal (+1 %/+1 % beim Support-
   Turm vs. +22 %/−7 % beim Damage-Turm).
4. **„Merge All"-Sammelbutton** von Anfang an einbauen — bei 5-spaltigen Rastern mit vielen
   Karten ist Einzel-Mergen unzumutbar.
5. **Animierter Turm-Loop in der Detailkarte**, links, ca. 25 % Breite, dauerhaft laufend.
   Kostet wenig und wertet die Karte massiv auf.
6. **Stat-Vorschau „aktuell → nach Upgrade"** direkt neben jedem Stat auf der Detailkarte.
7. **Attack Rate als negativen Prozentwert** darstellen (−7 %), damit „kleiner = besser"
   intuitiv bleibt.
8. **Truhen kommunizieren garantierte Raritätsspannen** statt Prozent-Drop-Raten
   („Contains one Good, Rare, or Epic card") — psychologisch stärker und rechtlich einfacher.
9. **In-Match-Layer zusätzlich zur Meta:** Star Levels pro Turm, ein per **Refresh**
   neu würfelbares Turm-Angebot und In-Match-**Upgrade** gegen Match-Gold.
10. **Trophy Road mit wachsender Schrittweite**: 50er-Schritte bis ~1300 Trophäen,
    100er bis ~3400, danach 200er (§9.5). Dichte kleine Belohnungen am Anfang,
    seltenere große später.
11. **Festungs-Upgrade-Baum als zweiter Gold-Sink** (§9.9), per Account-Level gegated
    („Level Too Low") und mit abnehmendem Grenznutzen (+17 % → +16 % bei steigenden Kosten).
12. **„TO BE FOUND"-Panel** in der Collection: zeigt fehlende Materialien und **in welcher
    Arena** sie zu holen sind (§7.1) — starkes Retention-Element.
13. **Map Objectives + Trick Cards pro Arena freischalten** (§9.7) — billiger
    Content-Multiplikator, gibt der Trophy Road inhaltlichen Sinn.
14. **Pity-Counter sichtbar auf der Truhe** statt Prozent-Drop-Raten (§8.2).
15. **Pass-Overflow nach dem Level-Cap**: „ab Level 120 je 100 EXP eine Silver Chest,
    maximal 20" (§9.10) — löst das Problem, dass Vielspieler den Pass früh durchhaben.
16. **Shop-Preise, Slot-Anzahl und Timer mit dem Fortschritt skalieren** (§8.4).

---

## 12. Korrekturen aus Video 6 — Abweichungen zur vorherigen Referenz

> Diese Punkte **widersprechen** der ersten Fassung dieses Dokuments. Da darauf schon Systeme
> gebaut wurden, sind sie hier explizit als Korrektur ausgewiesen.

### 12.1 ⚠️ SCHWERWIEGEND: Top-Bar-Währungen waren vertauscht

| Feld (x) | **FALSCH** (alte Fassung) | **RICHTIG** (korrigiert) |
|---|---|---|
| ~215-300 | Gems | **Trophäen** |
| ~650-740 | Gold | **Gems** |
| ~1065-1180 | Trophäen | **Gold** |

**Belege:** (1) Video 6, t=195: wörtlich **„Your Trophies: 425"** — identisch mit Feld 1.
(2) Icon-Farbmessung: Feld 2 magenta `#DC1DDB` (Gem-Kristall), Feld 3 goldgelb `#F3B733`
(Münze). (3) Arena-Schwellen passen nur so: 425 → Arena 2 ✓, 1136 → Arena 4 ✓.

**Folgen für die alten Angaben:**
* Video 11 hatte **1136 Trophäen / 491 Gems / 8218 Gold** — *nicht* 1136 Gems / 491 Gold /
  8218 Trophäen. Der Spieler stand mit 1136 Trophäen in **Arena 4**, nicht mit 8218.
* Die Daily-Deal-Preise aus Video 11 (**10 000 / 20 000**) sind **Gold**, nicht Gems.
* Das Popup „INSUFFICIENT GOLD — You need 176 more Gold" bezog sich korrekt auf Gold (8218).
* Die Truhen-Sofortöffnung (**80**) und die Helden-Unlocks (**800 / 1800 / 2800**) sind
  **Gems** — diese Angaben bleiben unverändert richtig.
* **Trophäenzahlen der Spielerschaft** liegen viel niedriger als angenommen: Die Spitze des
  Leaderboards liegt bei **~6500**, die Trophy Road endet bei **~9800** (§9.5/§9.6).
  Eine frühere Annahme „Arena 4 ≈ 8218 Trophäen" ist um etwa **Faktor 7** zu hoch.

### 12.2 ⚠️ Die Top-Bar ist kontextabhängig, nicht konstant

Die alte Fassung sprach von „konstant drei Werten". Falsch: Auf **Collection/Battle Deck**
werden nur **zwei** Werte gezeigt (Gems + Gold, ohne Trophäen), auf dem **Helden-Screen**
steht im ersten Slot die **Shard**-Zahl. Der in der alten Fassung als „Gems 1136 → 840 nach
Ausgabe" interpretierte Sprung war **kein Kauf**, sondern ein Wechsel der angezeigten Währung.

### 12.3 ⚠️ Upgrade-Material ist NICHT eine einzige generische Ressource

Die alte Fassung (§5) schloss aus zwei gleichen Beständen („19"), es handle sich um eine
gemeinsame generische Ressource. Video 6 zeigt im RESOURCES-Raster **mindestens 8
verschiedene Materialsorten** mit unabhängigen Beständen (18/16/10/8/7/6/2/1) und
Kategorie-Labels (**„speed"**, **„special"**). Die Gleichheit von „19" bei Divine Sword und
Ice Blaster war **Zufall**. Skyflares abweichendes „40/3" bestätigt jetzt eindeutig
**verschiedene Materialtypen mit verschiedenem Bedarf**.

### 12.4 ⚠️ Shop-Preise sind nicht absolut, sondern skalieren

Die alte Fassung listete die Daily-Deal-Preise als feste Werte. Sie **skalieren mit dem
Fortschritt**: dieselben Waren kosten in Arena 2 **3 000 / 5 400** Gold und in Arena 4
**10 000 / 20 000** Gold. Auch Slot-Anzahl („Available: 3" vs. „5"), Reset-Timer (2 h 26 m
vs. 6 h 58 m) und Gratis-Truhen-Cooldown (3 d 9 h vs. 3 h 41 m) unterscheiden sich. Preis-
und Timer-Angaben aus diesem Dokument sind daher immer **stand-abhängig** zu lesen.

### 12.5 Ergänzung: „Golden Fortune" war fehlinterpretiert

In der alten Fassung (§6.3) erschien „Golden Fortune" nur als eine **Shard-Quelle** in der
„HOW TO GET"-Liste. Es ist tatsächlich ein **eigenständiges, ~9 Tage laufendes
Season-Event mit dreistufigem Pass** (FREE / EPIC / LEGENDARY), Medals als Event-Währung
und Siegesserien als Verdienstmechanik (§9.10).

### 12.6 Ergänzung: ein komplett fehlendes System

Der **Festungs-Upgrade-Baum** (Bottom-Nav-Tab „Upgrade", §9.9) fehlte in der ersten Fassung
vollständig. Er ist eine **dritte Progressionsachse** neben Kartenlevel und Kartenrarität:

```
Karten-Level     ←  Upgrade-Material (8 Sorten) + Gold
Karten-Rarität   ←  3 identische Karten mergen
Festung          ←  Gold + Account-Level (DPS / Attack Speed / Max Health / Power)
```

### 12.7 Bestätigt (keine Korrektur nötig)

* Raritätsleiter Common → Good → Rare → Epic → Legendary, **endet bei Legendary**
  (kein Relic/Supreme) — Video 6 bestätigt über Truhentexte und Pass-Namen.
* Trophy-Road-Schrittweite 50 im unteren Bereich.
* Bottom-Navigation, Arena-Modifier „Neutral", Event-/Challenge-Kacheln.
* Die 5-spaltige Rastergeometrie der Kartenlisten.
