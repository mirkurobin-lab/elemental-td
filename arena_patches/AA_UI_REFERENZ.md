# AA-UI-Referenz — "Arcane Arena: Tower Defense TD" (Panteon/MWM)

Referenzdokumentation für den Nachbau in **Arcane Prism TD**.

> **Stand: 4. Durchgang (User-Screenshots der Trophäenstraße eingearbeitet, §14).**
> Neu: AAs **Trophäenstraße** als eigener Vollbild-Layer hinter dem BATTLE-Button, die
> **komplette Arena-Leiter 0/300/600/900/1200/1500** (Arena 2 = 300 ist wörtlich belegt),
> und die Korrektur, dass Arenen als **schwebendes Insel-Diorama** inszeniert werden,
> nicht als Vollflächen-Hintergrund. **Bitte §14 zuerst lesen.**
>
> **Stand: 3. Durchgang (Video 7 eingearbeitet).** Video 7 schließt die beiden größten
> Lücken — die **Merge-Ausführung samt Zeremonie** (§4.4) und die **Level→Gold-Kurve**
> (§13.2) — und verwirft dabei den bisherigen Wert „8000 Gold". Neu ist außerdem §9.5b:
> **wie AA die Status-Arenen visuell inszeniert** (Grundlage des HOME-Views im Prototyp).
>
> **Abweichungen bitte ZUERST lesen: §13 (Video 7), danach §12 (Video 6).**
>
> *2. Durchgang:* Video 6 schloss Trophy Road, Champions Peak, Season, Leaderboard, Clans,
> Season-Pass und Fortress-Upgrades und korrigierte vier Befunde der ersten Fassung —
> allen voran die Zuordnung der Top-Bar-Währungen (§12).
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
| 7 | `ScreenRecording_07-25 09-16-41` · `1gQBeekSjfY4QNwTa5SOXBXZsb9v6tJl3` | 0:54 | **Die Aufnahme, die §10.1 und §10.4 schließt: MERGE-AUSFÜHRUNG + drei echte TURM-UPGRADES.** Kurz, aber die dichteste Aufnahme überhaupt. Account: 521 💎 / **19 918 🪙** | 4 Battle Deck · 5-6 „SELECT CARDS TO MERGE!" · **7-16 Merge-Auswahl CATAPULT + Vorschau (MAX LEVEL 20→30)** · **17-24 „PERFECT MERGE!"-Zeremonie** · 29-32 Deck (Gold unverändert!) · **33-37 Catapult-Detailkarte RARE + Upgrade Lv16→17** · **40-53 Boulder COMMON + zwei Upgrades Lv1→3** |
| 8 | `ScreenRecording_07-25 15-59-29` · `1zInGsCyXefVkd58p9RIwf2wZ-azqbTMz` | 7:20 | **Die komplette Trophäenstraße in einem Zug — von 0 🏆 bis zur Spitze.** Schließt die Leiter endgültig: alle 8 Arenen, die 9 Liga-Tore von *Champions Peak*, Knotenkadenz, Season-Regel und die Weltrangliste. Account: *Netherghost*, 1 136 🏆, „Ice Season", „Season Ends In 9d 10h" | 8-88 Arenen 1-5 mit Unlock-Rastern · **104 Arena 6 *Inferno Pit* (1 500)** · **108-113 Arena 7 *Storm Shroom* (2 000)** · **115-120 Arena 8 *Ice Brawl* (2 500)** · **123-128 Liga-Start *Entrance Gate* (2 900)** · 133-192 Tore 2-9 (3 500/4 000/4 500/5 000/6 000/7 000/8 000/9 000) · **194-200 Spitze 9 800** · 202-212 Champions-Peak-Rangliste (Spitze **17 825**) · **213-217 Season-Reset-Tooltip im Wortlaut** → §15 |
| 9 | `ScreenRecording_07-25 16-40-19` · `1NRDRmIM61flSodnDNuG2lZzjoFDAtFqC` | 2:56 | **Die Festungs-/Burg-Upgrades im Detail** — AAs „Upgrade"-Tab über ~40 Stufenkarten. Belegt: genau DREI Tracks, die Bonus- und Power-Kurven, das Account-Level-Gating. Account: *Netherghost*, **Level 14**, 1 918 🪙 (⚠ unverändert — keine Käufe, daher keine Kosten-Differenzen ableitbar) | 1 Home (Level 14, Arena 4) · 3-38 Tab-Wechsel + Kartenzyklus **Max Health · DPS · Attack Speed** · **39-63 Bonus-/Power-Werte lesbar (+1 % Speed, +8…11 % DPS, Power +418…+840)** · **64-77 „Level Too Low" — Account-Level-Gate** → §16 |
| R | *Referenzvideo, anderes Spiel* · `ScreenRecording_07-07-2026 16-30-56_1.MP4` · `1PKtYhm_9drym_Osr7p1TOriq53nEeBcv` | 0:14 | **Vom User als Vorbild markiert: Pack-Öffnung mit Karten-DREHUNG.** Kein AA-Material — Wunsch-Referenz für unsere Pack-Zeremonie | 0-3 Karten drehen sich einzeln um, Swish + Ding, Raritäts-Glühen · **3-13 Vollbild-Cinematic (Marsch → Runen-Podest → Enthüllung von unten)** → §17 |
| 4-5, 8-9 | weitere 07-05-Aufnahmen | — | nicht ausgewertet | — |
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
* ✅ **Level-Caps jetzt dreifach belegt** (Video 7): **Common → 10** (Boulder zeigt `…/10`),
  **Good → 20** und **Rare → 30** (die Merge-Vorschau schreibt wörtlich `MAX LEVEL 20 ⇒ 30`).
  Die Schrittweite +10 pro Raritätsstufe ist damit bestätigt, nicht mehr nur extrapoliert.
* ✅ **Upgrade-Kosten — Lücke geschlossen (Video 7, §13.2).** Es wurden drei Upgrades
  ausgeführt; die Beträge sind über den **Gold-Kontostand arithmetisch bewiesen**:

  | Karte | Stufe | Level-Up | Gold | Material | Beleg (Kontostand) |
  |---|---|---|---|---|---|
  | Boulder | Common | 1 → 2 | **1 000** | 1 (50→49) | 4 918 → 3 918 |
  | Boulder | Common | 2 → 3 | **2 000** | 1 (49→48) | 3 918 → 1 918 |
  | Boulder | Common | 3 → 4 | **3 000** *(angezeigt)* | 1 | — |
  | Catapult | Rare | 16 → 17 | **15 000** | 5 (12→7) | 19 918 → 4 918 |
  | Catapult | Rare | 17 → 18 | **18 000** *(angezeigt)* | 5 | — |

  → Die Kurve liegt bei **≈ 1 000 Gold × Level**, oberhalb Lv15 mit Sprüngen von ~3 000.
  Der ältere „8000 Gold"-Wert aus Video 11 passt **nicht** in diese Reihe (Lv15/16 müssten
  dort 15 000-16 000 kosten) — er ist als OCR-Fehllesung des stilisierten Fonts einzustufen
  (er stand in §2.3 ohnehin unter Vorbehalt). **Video 7 hat Vorrang**, weil die Beträge dort
  aus Kontostand-Differenzen folgen und nicht aus OCR.

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

### 4.4 Merge-AUSFÜHRUNG und Zeremonie — **Lücke geschlossen (Video 7)**

Der vollständige Ablauf, Schritt für Schritt aus Video 7 (t = 4-33 s):

| t | Zustand | Was zu sehen ist |
|---|---|---|
| 4 s | Battle Deck | Gold **19 918**, Gems 521. Einstieg über **Forge**. |
| 5-6 s | `SELECT CARDS TO MERGE!` | Raster aller Karten, Dropdown **By Level**, **Merge All**, **Back**. |
| 7-10 s | Karte angetippt | Der Panel-Kopf wechselt auf den **Kartennamen** (`CATAPULT`, x 850 / y 233). Darunter **`REQUIRED CARDS`** (x 837 / y 495) mit Slot-Reihe, und ein **`Merge`**-Button (x ≈ 941-1130 / y 1200). |
| 11-16 s | **Merge-VORSCHAU** klappt auf | Rechts oben, unter dem Kartennamen: **`MAX LEVEL  20 ⇒ 30`** · **`AREA DAMAGE  324.9 ⇒ 377.1`** · **`ATTACK RATE  2.45 sec ⇒ 2.34 sec`**. Unter `REQUIRED CARDS` steht die Anforderungszeile **`x1 GOOD CATAPULT`**. **Nirgends ein Gold-Betrag.** |
| **17 s** | **Zeremonie startet** | Großer Titel **`PERFECT MERGE!`** (y ≈ 270-310), Karte animiert in der Mitte, unten ein **`CONTINUE`**-Button (y ≈ 2715). |
| 19-23 s | Zeremonie hält | Die Vorher/Nachher-Tafel wandert groß in die Bildmitte (y 1609-2234): `MAX LEVEL 20 / 30`, `AREA DAMAGE 324.9 ⇒ 377.1`, `ATTACK RATE 2.45 sec ⇒ 2.34 sec`. Der Abschluss wechselt von `CONTINUE` auf **`TAP TO CLOSE`**. |
| 21→22 s | **Level-Zähler** | Auf der Karte steht erst **`LvL 1`**, eine Sekunde später **`LvL 16`** — das Level wird **hochgezählt** und ist damit erhalten geblieben. |
| 24 s | Ausklang | Nur noch `PERFECT MERGE!` + `MAX LEVEL 20/30` + `TAP TO CLOSE`. Gesamtdauer ≈ **7 s**. |
| 29-32 s | zurück im Deck | Gold **19 918** — **unverändert**. |

**Die vier Kernbefunde:**

1. **Der Merge kostet KEIN Gold.** Der Kontostand ist vor (t=4) und nach (t=29) dem Merge
   identisch 19 918. Bezahlt wird ausschließlich mit den **3 Kartenkopien**.
2. **Das Level bleibt erhalten, nur das Cap steigt.** Catapult war Lv16 vorher und ist
   Lv16 nachher (`16/30` auf der Detailkarte bei t=33) — die Zeremonie zelebriert das,
   indem sie den Zähler von 1 auf 16 hochlaufen lässt.
3. **Die Vorschau ist Teil der Kaufentscheidung.** AA zeigt *vor* dem Merge exakt drei
   Zeilen: Level-Cap plus die zwei Stats, die der Merge-Bonus anfasst — jeweils als
   `alt ⇒ neu`. Das ist dasselbe Muster wie die Upgrade-Vorschau auf der Detailkarte (§2.3).
4. **Der Merge-Bonus wird beim Merge WIRKSAM, nicht erst danach.** Die Vorschau
   `324.9 ⇒ 377.1` entspricht **+16,1 %** und `2.45 ⇒ 2.34 sec` entspricht **−4,5 %** —
   also genau dem Bonus, den die **Good**-Karte als „Merge 3 identical Catapult cards to
   unlock: Area Damage +16 % and Attack Rate −5 %" angekündigt hatte (Video 11, §4.2).
   Die *neue* Rare-Karte kündigt anschließend die *nächste* Stufe an: **„+18 % / −7 %"**
   (t=33). **Der Bonus wächst also pro Raritätsstufe** — der Text auf der Karte beschreibt
   immer den Bonus des **nächsten** Merges.

Was ausgerüstete Karten angeht: Das Raster zeigt weiterhin `Equipped`-Bänder, ein
Konflikt („ausgerüstete Karte wird verschmolzen") trat nicht auf und wird von AA
offenbar dadurch vermieden, dass die aufgewertete Karte dieselbe Identität behält.

**Noch offen:** die genaue Semantik der Zeile `x1 GOOD CATAPULT` unter `REQUIRED CARDS`
(1 zusätzliche Kopie? oder „1× der Sorte Good Catapult" pro Slot?), und ob Skill-/
Item-Karten ebenfalls mergebar sind (die Tabs existieren, gezeigt wurde nur der Turm-Fall).

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

> ⚠ **SCHWELLEN KOMPLETTIERT (User-Screenshots, §14.1).** Das magenta Arena-Ribbon der
> Trophäenstraße liest wörtlich **„Arena 1 · 🏆 0"** (IMG_3294) und **„Arena 2 · 🏆 300"**
> (IMG_3295). Zusammen mit den hier belegten 600 / 1200 / 1500 ergibt sich AAs echte Leiter
> als **glatte 300er-Schrittweite: 0 / 300 / 600 / 900 / 1200 / 1500**. Arena 4 = **900**
> folgt daraus und ist widerspruchsfrei mit „1136 🏆 → Arena 4 Dock Drop" (§12.1).
> Der Name von Arena 1 ist ebenfalls jetzt bekannt: **Waterfall Vale**.

| Arena / Liga | Name | Trophäen-Schwelle |
|---|---|---|
| Arena 1 | **Waterfall Vale** | **0** (IMG_3294) |
| Arena 2 | **Dustfall Temple** | **300** (IMG_3295) |
| Arena 3 | **Sunken Atlantis** | **600** |
| Arena 4 | **Dock Drop** | **900** (abgeleitet: 300er-Raster + Account mit 1136 stand hier) |
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

### 9.5b Visuelle Inszenierung der Status-Arenen (Video 6, t=100 / 118-190) — neu

> **Warum das für uns zählt:** In **Arcane Prism TD** werden die Match-Welten **zufällig
> pro Spiel** gewählt. Die Arenen sind damit **reine Status-Optik** — sie liefern die
> Genugtuung des Aufstiegs und sind vom Gameplay entkoppelt. **Genau so hält es AA auch:**
> Der Home-Screen zeigt neben der Arena den Modifier **„Neutral"**, d. h. die Arena selbst
> bringt gerade gar keine Regel mit; ihre Funktion ist Rang und Bild.

**A) Home-Screen (Video 6, t=100; Screen 1320 × 2868, Account 425 🏆 = Arena 2).**
Gemessene Positionen:

```
y  213      TOP-BAR: 425 🏆 (x504) | 245 💎 (x786) | 1446 🪙 (x1114)
y  348      Avatar + Spielername "Netherghost" (x322) + "Level 4" (x729)
y  592      Event-Banner "GOLDEN FORTUNE" (zentriert)
y  815      »Arena 2:«            ← ZEILE 1 des Arenanamens, zentriert
y  876      »Dustfall Temple«     ← ZEILE 2, groß, zentriert (x405-917)
y  968      ◎ »Neutral«           ← Modifier-Chip direkt darunter
y ~1650-1760  Trophäen-Fortschrittsleiste, Trophäen-Icon links,
              Belohnungs-/Truhen-Icon am RECHTEN Ende
y ~1820-2050  ARENA-WAPPEN: sechseckiges Schild mit goldener Krone,
              blau-violett, ~70 px breit, mittig — das Status-Emblem
y ~2110-2370  Reihe: [kleine EVENTS-Kachel mit Truhe + „7" + roter Punkt]
              ‖ [große BATTLE-Taste, goldgelb, ~55 % Breite, weiße Schrift
                 mit dunkler Kontur, dicker Goldrahmen]
y ~2590-2860  Bottom-Nav, 5 Tabs; der mittlere („Battle") ist ERHÖHT,
              größer und trägt eigene Grafik
```

**Entscheidend für den Nachbau:**
* ⚠ **KORRIGIERT (§14.2):** Die Key-Art ist **KEIN vollflächiger Hintergrund**, sondern ein
  **freischwebendes INSEL-DIORAMA** — eine kleine, aus dem Boden gestanzte Insel (Hütte,
  Felsen, Wasserrand) die mittig auf **schlichtem Dunkelblau** schwebt, mit Schlagschatten
  darunter. Die frühere Lesung „Vollflächen-Hintergrund" entstand aus den stark
  komprimierten Frame-Transfers; die User-Screenshots zeigen es eindeutig anders.
* Der **Arenaname steht zweizeilig zentriert auf ~28-33 % Bildhöhe**, direkt über der Mitte —
  also im „Himmel" der Key-Art, wo garantiert ruhige Fläche ist.
* Der Name ist **Text auf Bild**, nicht ins Bild gebrannt. Das ist genau unsere
  Text-freie-Assets-Strategie.
* **Ein Bildschirm = ein Ziel.** Zwischen Wappen und Battle-Taste steht nichts Ablenkendes.

**B) Arena-Liste / Trophy Road (Video 6, t=118-190).**
Die Arenen erscheinen **nicht** als kleine Kacheln, sondern als **große, hochkant
eingeschobene Banner-Karten** in einem endlosen Vertikal-Scroll. Gemessen an
„Aztec Grounds" (t=134):

```
y  709   ◎ Neutral                       ← Modifier-Chip
y  802   »Aztec Grounds«                 ← Arenaname, groß, zentriert (x447-974)
y  952   »Arena 5«  (x405)     🏆 »1200« (x843)   ← Nummer links, Schwelle rechts
y 1130   »Unlocks:«                      ← Freischaltungs-Vorschau
y 1563   [Map Objective …]
y 1805   [Trick Card] »Defense Jam«      ← die konkreten Freischaltungen
y 2092   »1150«  (x102)                  ← Trophy-Road-Knoten auf der LINKEN Schiene
y 2286   »x5«                            ← Belohnungsmenge
```

* Der linke Rand (x ≈ 100) ist eine durchlaufende **Schiene mit Trophäenzahlen**
  (…1150, …4600, 4700…); rechts daneben hängen die Belohnungen.
* An jeder Arena-Grenze wird die Schiene von einer **Banner-Karte mit Key-Art**
  unterbrochen, die etwa **45 % der Bildschirmhöhe** einnimmt.
* Die **Liga-Tore** (Champions Peak) sind genauso aufgebaut: Key-Art-Block plus
  zweizeilige Beschriftung `Champions Peak` / `Gate 4 Bronzeward` (t=166, y 2343/2391).
* Ein **Locked-Zustand als Grau-Overlay** war im Ausschnitt nicht isolierbar (der Account
  scrollte durch bereits sichtbare Bereiche); die Sperrlogik kommuniziert AA statt dessen
  über die **Trophäenschwelle auf der Karte** und die Position im Scroll.

**Nachbau-Empfehlung (so umgesetzt in `ui_prototype.html`, View „HOME"):**
1. Key-Art vollflächig hinter dem oberen Drittel, mit Verlauf nach unten ins UI-Dunkel.
2. Arenaname zweizeilig zentriert darauf, als **HTML-Text** (Gold-Gradient) — nie als Grafik.
3. Modifier-Chip darunter; bei uns steht dort **„Zufallswelt"** statt „Neutral", weil
   das bei uns die ehrliche Aussage ist.
4. Wappen als Status-Emblem, dann die Trophäenleiste mit Belohnungs-Icon rechts.
5. Eine große Kampf-Taste, links davon eine schmale Event-Kachel.
6. Zusätzlich (AA hat das nur im Trophy-Road-Scroll) eine kompakte **Arena-Leiter aus
   6 Kacheln**: erreichte in Key-Art-Farbe, kommende abgedunkelt mit **🔒 + Schwelle**.
   Das bringt die Statusleiter auf den Home-Screen, ohne den Scroll nachbauen zu müssen.

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

---

## 13. Korrekturen und Neubefunde aus Video 7 (Merge + Upgrades)

> Video 7 ist mit 54 Sekunden die **kürzeste** und zugleich **dichteste** Aufnahme: Sie
> schließt die beiden größten Lücken aus §10 (Merge-Ausführung, Level→Gold-Kurve) und
> korrigiert einen Wert, auf dem bereits Systeme gebaut waren.
>
> **Methodisch wichtig:** Alle Geldbeträge in diesem Abschnitt sind über **Differenzen des
> Gold-Kontostands** hergeleitet, nicht über OCR der stilisierten Kostenschrift. Sie sind
> damit belastbarer als alle Zahlenangaben der Abschnitte davor.

### 13.1 ✅ Merge-Ausführung, Zeremonie und Kosten (schließt §10.4)

Vollständig ausformuliert in **§4.4**. Die vier Kernbefunde in Kurzform:

| Frage aus §10.4 | Antwort |
|---|---|
| Kostet der Merge Gold? | **Nein.** 19 918 🪙 vor dem Merge, 19 918 🪙 danach. Bezahlt wird nur mit 3 Kopien. |
| Wie sieht die Zeremonie aus? | Vollbild, Titel **„PERFECT MERGE!"**, Karte animiert, Vorher/Nachher-Tafel, Abschluss `CONTINUE` → `TAP TO CLOSE`. Dauer ≈ **7 s**. |
| Was passiert mit dem Level? | Es **bleibt erhalten** (Lv16 → Lv16). Die Zeremonie lässt den Zähler von 1 auf 16 **hochlaufen** — reine Inszenierung. |
| Was springt? | Das **Level-Cap** (`MAX LEVEL 20 ⇒ 30`) und die zwei Stats des Merge-Bonus. |
| Was mit ausgerüsteten Karten? | Kein Konflikt sichtbar — die Karte behält ihre Identität, `Equipped` bleibt bestehen. |

**Neu und wichtig:** Der Text „Merge 3 identical X cards to unlock: A und B" beschreibt
**immer den NÄCHSTEN Merge**, und der Bonus **wächst pro Stufe**:
Catapult als **Good** kündigte „+16 % / −5 %" an → die Vorschau lieferte exakt
+16,1 % / −4,5 % → als **Rare** kündigt dieselbe Karte nun „**+18 % / −7 %**" an.
Damit ist §4.2 präzisiert: Die Boni sind nicht nur pro Karte, sondern auch **pro
Raritätsstufe** balanciert.

### 13.2 ✅ Die Level→Gold-Kurve (schließt §10.1) — und ⚠ Korrektur von „8000 Gold"

| Karte | Stufe | Level-Up | **Gold** | **Material** | Herleitung |
|---|---|---|---|---|---|
| Boulder | Common | 1 → 2 | **1 000** | 1 | Konto 4 918 → 3 918 |
| Boulder | Common | 2 → 3 | **2 000** | 1 | Konto 3 918 → 1 918 |
| Boulder | Common | 3 → 4 | **3 000** | 1 | Button-Anzeige |
| Catapult | Rare | 16 → 17 | **15 000** | 5 | Konto 19 918 → 4 918 |
| Catapult | Rare | 17 → 18 | **18 000** | 5 | Button-Anzeige (Digit-Whitelist-OCR, zweifach) |

* Die Kurve verläuft **≈ 1 000 Gold × Level** und wird oberhalb Lv15 **steiler**
  (+3 000 statt +1 000 pro Stufe).
* **Materialbedarf hängt an BEIDEM — Level und Stufe.** Boulder (Common, Lv1) braucht **1**,
  Catapult (Rare, Lv16) braucht **5**, Divine Sword (Good, Lv15) braucht **5**,
  Skyflare braucht **3**. Die alte Annahme aus §5 („Bedarf hängt nur an der Stufe")
  konnte den Wert 1 nicht erklären und ist damit **überholt**.
* ⚠ **Korrektur zu §2.3:** Der dort dreifach notierte Wert **„8000 Gold"** (Divine Sword
  Lv15, Catapult Lv16, Ice Blaster Lv15) ist **mit der neuen Reihe unvereinbar** — auf
  Lv15/16 müsste ein Upgrade 15 000-16 000 kosten. Er war schon damals als
  *unsicher* markiert (stilisierter Font). **Verworfen zugunsten der Video-7-Werte.**

### 13.3 ✅ Level-Caps dreifach belegt (präzisiert §2.4)

`MAX LEVEL 20 ⇒ 30` in der Merge-Vorschau belegt **Good = 20** und **Rare = 30** direkt;
Boulders Badge `…/10` belegt **Common = 10**. Die Schrittweite **+10 pro Raritätsstufe**
ist damit gemessen, nicht mehr extrapoliert. Für Epic/Legendary bleibt 40/50 die
naheliegende Fortschreibung.

### 13.4 Neu: ein dritter Button auf der Turm-Detailkarte — „Max Level"

Die Detailkarte trägt in Video 7 **drei** Aktionen statt der in §2.1 notierten zwei:

```
[ Unequip / Equip ]      [ Upgrade  🪙 <Kosten> ]      [ Max Level ]
  x 167-417 / y 2325       x 532-793  / y 2300-2420      x 881-1213 / y 2330
```

**„Max Level"** ist offenbar ein **Sammel-Upgrade** („so weit hochziehen, wie Gold und
Material reichen") — das Pendant zu „Merge All" im Forge-Screen (§4.3). Ausgeführt wurde
es im Video nicht; die Funktion ist daher **wahrscheinlich, nicht bewiesen**.
**Nachbau-Empfehlung:** unbedingt übernehmen — bei 100 Leveln ist Einzel-Tippen zumutbar
nur bis etwa Level 20.

### 13.5 Kleinere Beobachtungen

* **Stat-Vorschau auch beim Merge.** Nicht nur das Upgrade zeigt `alt → neu` (§2.3),
  sondern auch der Merge. AA benutzt dasselbe Vorher/Nachher-Muster konsequent überall.
* **Power ist ein zusammengesetzter Wert.** Catapult: 1 701 (Good Lv16) → **2 301**
  (Rare Lv16, allein durch den Merge, +35 %) → **2 486** (Rare Lv17, durch ein Upgrade,
  +8 %). Der Merge ist also der weit größere Sprung als ein Level.
* **Ressourcenbestände** im Collection-Raster dieses Accounts: `x60 · x60 · x56 · x53`
  (t=39) — bestätigt erneut mehrere getrennte Materialsorten (§7.1).
* Die Ressourcen-Sektion trug hier das Label **„JOKER ITEMS"** statt „HERO ITEMS"
  (OCR, mittlere Konfidenz) — entweder eine weitere Gruppe oder eine Fehllesung.

### 13.6 Auswirkung auf unsere Systeme (bereits eingearbeitet)

| Datei | Änderung |
|---|---|
| `arena_cards.js` → `GOLD_BANDS` | Auf die AA-Reihe kalibriert. AA-Karten laufen bis ~Lv50, unsere bis Lv100 → Faktor 2 auf der Level-Achse, aus `1 000 × n_AA` wird **`≈ 500 × n_uns`**. Bänder bis Lv40 liegen exakt an dieser Linie (unser Lv32 ≈ AA Lv16 → 16 500 vs. 15 000), darüber überlinear als Endgame-Sink. Summe Lv1→100: **5,03 Mio Gold**. |
| `arena_cards.js` → `materialFor` | Von „nur Stufe" (`3 + tierIdx`) auf **`1 + tierIdx + floor(lvl/10)`**, Deckel 16 — trifft AAs Anker `Common/Lv1 → 1` und `Good/Lv15 → 5` beide. |
| `ui_prototype.html` → Forge | **Merge-Vorschau** (Stufe, `MAX LEVEL alt → neu`, zwei Stats) und der ausdrückliche Hinweis **„Kostet kein Gold"**. |
| `ui_prototype.html` → Zeremonie | Vollbild-Overlay „Perfekte Verschmelzung!" mit hochzählendem Level-Badge, Vorher/Nachher-Tafel und `Weiter` → `Tippen zum Schließen`. |
| `ui_prototype.html` → HOME | Neue fünfte Ansicht nach den §9.5b-Messungen (Key-Art vollflächig, Name als Text darauf, Trophäenleiste, Kampf-Taste, Arena-Leiter mit 🔒). |

### 13.7 Was nach Video 7 noch offen ist

1. ❌ **Pack-/Truhen-Öffnungs-Zeremonie** — in keiner der sieben Aufnahmen geöffnet.
2. ❌ **Merge für Skills/Items** — weiterhin nur der Turm-Fall gezeigt.
3. ❌ **Niederlagen-Screen**, **Epic/Legendary-Rahmenfarben**, **Hero Pass / Hero Vault**.
4. 🟡 **`x1 GOOD CATAPULT`** unter `REQUIRED CARDS` — Semantik nicht eindeutig geklärt.
5. 🟡 **„Max Level"-Button** — existiert sicher, Wirkung nur erschlossen (§13.4).
6. 🟡 **Epic/Legendary-Caps (40/50)** — weiterhin Extrapolation, jetzt aber auf einer
   dreifach gemessenen Schrittweite von +10 aufsetzend.

---

## 14. Die Trophäenstraße — Nachtrag aus vier User-Screenshots

> Quelle: vier vom User nachgelieferte AA-Screenshots (IMG_3292 Home, IMG_3293 Arena-1-
> Freischaltungen, IMG_3294 Straßenanfang, IMG_3295 Arena-2-Sektion). Anders als die
> Videoframes sind das **unkomprimierte Vollauflösungs-Bilder** — sie korrigieren daher
> zwei Aussagen, die aus stark komprimierten Frame-Transfers abgeleitet waren.
>
> **Der zentrale Befund:** Der **BATTLE-Button öffnet nicht direkt das Matchmaking**,
> sondern zuerst die **Trophäenstraße** als eigenen Vollbild-Layer.

### 14.1 ✅ Die komplette Arena-Leiter: 0 / 300 / 600 / 900 / 1200 / 1500

Das magenta Arena-Ribbon nennt die Schwelle wörtlich:

| Beleg | Ribbon-Text |
|---|---|
| IMG_3294 | **`Arena 1   🏆 0`** |
| IMG_3295 | **`Arena 2   🏆 300`** |

Damit fügt sich alles zu einer **glatten 300er-Schrittweite**:

| Arena | Name | Schwelle | Status |
|---|---|---|---|
| 1 | Waterfall Vale | **0** | Screenshot |
| 2 | Dustfall Temple | **300** | Screenshot |
| 3 | Sunken Atlantis | **600** | Video 6 |
| 4 | Dock Drop | **900** | abgeleitet (Raster + „1136 🏆 → Arena 4") |
| 5 | Aztec Grounds | **1200** | Video 6 |
| 6 | Inferno Pit | **1500** | Video 6 |

⚠ **Korrektur an unserem Modell:** Wir hatten Smaragdtal auf 600 gelegt — das ist AAs
**Arena-3**-Wert, unsere Leiter war also um eine Stufe gestreckt. Nachgezogen in
`ui_prototype.html` (`ARENA_TIERS`), `ui_assets.json`, `GAMEPLAY_OPTIMIERUNG.md` §4
und `HANDOFF.md`. Die Festungs-Gates in `arena_fortress.js` (600 / 1200 / 1500, gelabelt
„Arena 3 / 5 / 6") bleiben **unverändert richtig** — sie hingen immer an den AA-Werten,
nicht an unserer Nummerierung.

### 14.2 ⚠ Arenen sind schwebende Insel-DIORAMEN, kein Vollflächen-Hintergrund

Die Aussage in §9.5b („Key-Art ist vollflächiger Hintergrund") war **falsch** und stammte
aus einem auf 430 px komprimierten Frame. In Vollauflösung ist klar:

* Der Bildschirmhintergrund ist ein **schlichter dunkelblauer Verlauf**, ohne Motiv.
* Die Arena ist ein **kleines, aus dem Boden gestanztes Insel-Diorama** — Hütte, Felsen,
  Grasrand, Wasserkante, bei „Dock Drop" zusätzlich Tentakel und ein Kieferknochen.
  Es **schwebt** mittig, mit weichem Schlagschatten darunter, leicht von oben gesehen.
* Es nimmt nur etwa **35 % der Bildschirmbreite und 12 % der Höhe** ein.

**Konsequenz für den Nachbau:** Unsere Querformat-Key-Art wird als **abgerundete,
schwebende Karte** inszeniert (Glow + Schlagschatten + minimale `rotateX`-Neigung),
Hintergrund bleibt dunkel. Umgesetzt als CSS-Klasse `.diorama`.

### 14.3 Home-Screen — zwei fehlende Elemente (IMG_3292)

Der Home-Screen hat unter dem Diorama **zwei Reihen**, die bisher fehlten:

```
y ~1650   Trophäen-Balken: 🏆 links · leere Goldrinne · REWARD-ICON am rechten Ende,
          halb aus der Kapsel herausragend (= Belohnung des nächsten Straßen-Knotens)
y ~1830   TRUHEN-/PACK-SLOTS: 4 Plätze in HEX-Rahmen in einem gerundeten Container
          (im Screenshot 3 silberne + 1 goldene Truhe)
y ~2110   EVENTS  |  BATTLE  |  CHALLENGES     ← DREI Elemente, nicht zwei
```

Ergänzt: die **4 Hex-Slots** (Demo: 2 Bronze-Packs + 2 leere Plätze, Klick führt in die
Pack-Ansicht; im Spiel hängt der Bestand an `ArenaProfile` / `packAwarded`) und das
**Belohnungs-Icon am rechten Balkenende**, das die Belohnung des nächsten Knotens zeigt
und die Trophäenstraße öffnet.

Weitere Home-Details aus dem Screenshot (nicht nachgebaut, aber dokumentiert):
Avatar-Portrait links oben, **XP-Ring mit „Level 14"**, Postfach-Icon, Freundesliste- und
Menü-Button, sowie **zwei senkrechte Schienen mit Shop-/Angebots-Icons** am linken und
rechten Bildrand (je 3-4 Kacheln, alle mit rotem „!"-Badge) — ein sehr aggressives
Monetarisierungs-Layout, das wir bewusst nicht übernehmen.

### 14.4 ✅ Aufbau der Trophäenstraße

> ⚠️ **BEWUSSTE ABWEICHUNG (Produktentscheidung, 26.07.2026).**
> Bei AA öffnet der BATTLE-Button die Trophäenstraße — das ist unten korrekt
> gemessen und bleibt als AA-Befund stehen. **Wir machen es anders:** bei uns
> startet KAMPF den Kampf, und die Straße hängt am **Arena-Diorama in der
> Bildmitte**. Begründung: ein Spieler, der auf KAMPF drückt, will spielen und
> nicht erst seinen Kontostand ansehen. AAs Weg kostet auf jedem Spielstart
> einen zusätzlichen Schritt.
> Wer diesen Abschnitt später liest und die Straße „zurück auf KAMPF" legt,
> macht damit eine Produktentscheidung rückgängig — nicht einen Fehler.
> Verdrahtet in `ui_prototype.html`: `btnBattle → startBattle()`,
> `arenaDiorama → openRoad()`. Abgesichert in run_v5/v6/v7.

**Trigger (bei AA):** BATTLE-Button. **Abschluss:** unten fixierter **`Okay`**-Button.
**Scroll-Richtung:** Die Straße wächst **von unten nach oben** — Arena 1 (0 🏆) liegt
ganz unten, höhere Trophäen weiter oben.

**Feste Bedienelemente (bleiben beim Scrollen stehen):**

| Element | Position | Funktion |
|---|---|---|
| **`Top`**-Button | oben mittig | Sprung an die Spitze der Straße |
| Hoch-Pfeil (blau) | links oben, schwebend | eine Bildschirmhöhe nach oben |
| Scroll-Indikator (gelb, ▲▼) | rechter Rand, mittig | reine Anzeige |
| **`Okay`** | unten mittig, eigene Leiste | Layer schließen |

**Linke Schiene:** eine durchgehende, **kräftig goldene Vertikalleiste** am linken Rand.
Rechts daneben stehen die Trophäenzahlen in weißer Fettschrift **alle 50 🏆**
(`0 · 50 · 100 · 150 …`) mit kurzem Tick.

**Belohnungs-Knoten** (alle 50 🏆) sind **grüne Plattform-Karten**: eine Rasenfläche mit
dunklem, abgeschrägtem Sockel darunter (3D-Plattform-Look), darin

* **mittig** die Belohnungs-Kachel (gerahmtes Quadrat mit Icon + `x1`),
* **links und rechts Deko-Props** (Lagerfeuer, Baumstumpf mit Pilzen, Brunnen, Axt im
  Holzblock …) — reine Ausstattung, keine Funktion,
* bei abgeholten Knoten ein **grüner Haken** oben rechts an der Kachel.

**Arena-Sektionen** sitzen an ihren Schwellen und unterbrechen die Knotenkette. Aufbau
strikt in dieser Reihenfolge (IMG_3295):

```
1  [schwebendes Insel-Diorama]
2  ◈ Neutral                       ← Modifier-Chip
3  Dustfall Temple                 ← Arenaname, groß, weiß fett
4  ╔═ MAGENTA RIBBON ═╗            ← Band mit gefalteten Enden:
   ║ Arena 2    🏆 300 ║              Nummer links, Schwelle rechts
   ╚══════════════════╝
5  Unlocks:                        ← gold/gelb, zentriert
6  [Raster silbergerahmter Kacheln] ← Türme + Spells; jede Kachel trägt oben links
                                      ein kleines ELEMENT-GEM (rot/blau/violett/gelb).
                                      Arena 1: 10 Kacheln, Arena 2: 6.
7  [breite Banner-Karten mit (i)]   ← je ein (i)-Button links, darüber eine cyanfarbene
                                      Kategoriezeile, darunter der Name fett weiß,
                                      rechts Artwork
```

**Farbcode der Banner-Karten** (klare visuelle Trennung):

| Kategorie | Rahmenfarbe | Beispiele aus den Screenshots |
|---|---|---|
| **Map Objective** | **orange/gold** | Spell Frenzy · Bounty Bloom · Straight Combat · Swift Trick · Starborn · Blind Pick |
| **Trick Card** | **violett** | Chains of Binding · Curse of Weakness · Phantom Cart · Curse of Silence |

Damit erweitert sich die Liste aus §9.7 um vier bisher unbekannte Namen:
**Swift Trick**, **Starborn**, **Blind Pick** (Objectives) und **Curse of Silence**
(Trick Card).

### 14.5 Warum das Muster so gut funktioniert

Der BATTLE-Button führt nicht ins Match, sondern **zuerst durch die eigene Erfolgsbilanz**.
Der Spieler scrollt an abgeholten Haken vorbei nach oben, sieht den nächsten Knoten
glühen und dahinter die noch gesperrte Arena mit allem, was sie freischaltet — und tippt
dann erst „Okay". Das ist **Motivation genau im Moment der Kampfbereitschaft**, ohne einen
einzigen zusätzlichen Menüpunkt. Kostet nichts außer der Straße, die man ohnehin baut.

### 14.6 Umsetzung im Prototyp

| Element | Umsetzung in `ui_prototype.html` |
|---|---|
| Vollbild-Layer | `#roadLayer`, geöffnet vom KAMPF-Button und vom Belohnungs-Icon |
| Scroll-Start | `scrollTop = scrollHeight` (unteres Ende), dann Auto-Scroll auf den ersten nicht abgeholten Knoten |
| Goldene Schiene | `.rail`, feste Position, plus `.tick`-Marken alle 50 🏆 bis 1500 + „•••" |
| Knoten | `.node` in drei Zuständen: `.done` (✅, gedimmt) · `.next` (Glow-Puls) · `.lock` (🔒, dunkel) |
| Belohnungen | alle 250 🏆 ein Silber-Pack, sonst im Wechsel Gold / Arkan-Essenz / Bronze-Pack; Pack-Kacheln nutzen die generierten Pack-Assets |
| Arena-Sektion | `.arenasec` mit `.diorama`, Chip, Name (`goldtext`), `.ribbon` (Banner-Asset magenta getönt), `.unlockgrid` mit Element-Gems, `.objcard` in orange/violett mit `(i)` |
| Bedienung | `Nach oben` (fix oben), schwebender Hoch-Pfeil, Scroll-Indikator, `Okay` (fix unten) |

Alle Beschriftungen sind **deutsche HTML-Strings** mit `.goldtext`; es wurden **keine neuen
Bilder generiert** — die Straße nutzt ausschließlich die 25 vorhandenen Assets plus
CSS-Fallbacks.

---

## 15. Die komplette Leiter bis zur Spitze — Video 8

**Quelle:** `ScreenRecording_07-25 15-59-29` · Drive-ID `1zInGsCyXefVkd58p9RIwf2wZ-azqbTMz`
· 818 MB · Account *Netherghost*, **1 136 🏆**, Season „**Ice Season**", „Season Ends In 9d 10h".
Der User hat die Trophäenstraße **in einem Zug von unten bis zum Ende durchgescrollt** —
damit ist die Leiter erstmals vollständig belegt und muss nicht mehr extrapoliert werden.

**Methode:** 218 Frames im 2-Sekunden-Raster, parallele Tesseract-OCR (`--psm 11`) plus
zwei koordinatengeschnittene Durchläufe — einer nur auf den Ribbon-Streifen (Arena- und
Tornamen), einer nur auf die linke Schiene (Skalenzahlen). Die Skalenzahlen sind der
eigentliche Schlüssel: **AA setzt an jeder Torschwelle KEINE Skalenzahl.** Wo in der
sonst lückenlosen Reihe eine Zahl fehlt, sitzt ein Tor. Damit lassen sich die
Torschwellen exakt bestimmen, obwohl AA sie nirgends ausschreibt.

### 15.1 Die Arenen — alle acht

| Arena | AA-Name | Schwelle | Beleg |
|---|---|---|---|
| 1 | *Waterfall Vale* | **0 🏆** | Screenshot IMG_3294 |
| 2 | *Dustfall Temple* | **300 🏆** | Screenshot IMG_3295 (Ribbon „Arena 2 · 🏆 300") |
| 3 | *Sunken Atlantis* | **600 🏆** | Video 6 |
| 4 | *Dock Drop* | **900 🏆** | Video 8, f_0071 ff.; konsistent mit „1 136 🏆 → Arena 4" |
| 5 | *Aztec Grounds* | **1 200 🏆** | Video 6 |
| 6 | *Inferno Pit* | **1 500 🏆** | Video 8, f_0104 (Ribbon neben Tick 1500) |
| 7 | ***Storm Shroom*** | **2 000 🏆** | Video 8, f_0108-f_0113 — **NEU** |
| 8 | ***Ice Brawl*** | **2 500 🏆** | Video 8, f_0115-f_0120 — **NEU** |

Damit ist die Reihe **0 / 300 / 600 / 900 / 1 200 / 1 500 / 2 000 / 2 500**: unten ein
starres 300er-Raster, ab Arena 6 auf 500er-Schritte gedehnt. Über Arena 8 folgt **keine
neunte Arena**, sondern die Liga.

Jede Arena-Sektion ist identisch aufgebaut (§14.2): Insel-Diorama, „Neutral"-Chip
bzw. das aktive Map-Objective, magenta-violettes Ribbon „Arena N · 🏆 Schwelle",
darunter das „Unlocks:"-Raster (4-6 Kacheln) und 2-4 Banner-Karten für Map Objectives
(orange) und Trick Cards (violett), jede mit `(i)`-Knopf. Video 8 bestätigt für Arena 4
zusätzlich die Karten *Fate Swap*, *Mirror Bound* und *Cursed Gust*.

### 15.2 Die Liga „Champions Peak" — neun Tore plus Spitze

Ab **2 900 🏆** wechselt die Straße die Sprache: keine Arenen mehr, sondern **Tore**.
Der Kopf zeigt statt des Arena-Namens „**Champions Peak**" mit Season-Zeile.

| Tor | AA-Name | Schwelle | wie belegt |
|---|---|---|---|
| 1 | *Entrance Gate* | **2 900** | Ribbon direkt gelesen (f_0123-f_0128) |
| 2 | *Stonegate* | **3 500** | Ticks …3300, 3400, **—**, 3600… → 3500 fehlt |
| 3 | *Ironpass* | **4 000** | Ticks …3800, 3900, **—**, 4100… |
| 4 | *Bronzeward* | **4 500** | Ticks …4300, 4400, **—**, 4600… |
| 5 | *Silverhold* | **5 000** | Ticks …4800, 4900, **—**, 5200… (Video 6 las „Silverfield") |
| 6 | *Goldreach* | **6 000** | Ticks …5600, 5800, **—**, 6200… |
| 7 | *Crystalpath* | **7 000** | Ticks …6600, 6800, **—**, 7200… |
| 8 | *Flamegate* | **8 000** | Ticks …7600, 7800, **—**, 8200… |
| 9 | *Stormcrest* | **9 000** | Ticks …8600, 8800, **—**, 9200… |
| — | **Spitze / Straßenende** | **9 800** | letzter Tick, f_0194-f_0200 |

> **⚠ Korrektur an §12/Video 6.** Die dort notierten Torschwellen (3400 / 3900 / 4600 /
> 5400 / 7800 / 8800) waren aus dem Scroll-Fluss geschätzt. Video 8 zeigt sie über die
> Tick-Lücken exakt: **3 500 / 4 000 / 4 500 / 5 000 / 6 000 / 7 000 / 8 000 / 9 000** —
> AA legt die Tore auf **runde Zahlen**. Auch der Name lautet *Silverhold*, nicht
> *Silverfield*.

### 15.3 Wie die Liga optisch anders inszeniert wird

Der Bruch ist deutlich und mit wenig Aufwand nachbaubar:

| | Arena-Sektion | Liga-Tor |
|---|---|---|
| Ribbon | magenta/violett, breit | **dunkel**, schmaler, Steinoptik |
| Bildmitte | Insel-**Diorama** einer Welt | **Tor-Emblem** (Steintor), kein Diorama |
| Beschriftung | „Arena N" + Weltname | „Gate N" + Torname |
| Kopfzeile | Weltname + Objective-Chip | „**Champions Peak**" + Season-Zeile |
| „Unlocks" | ja, Raster mit Karten | **nein** — Tore schalten nichts frei |
| Signatur | jede Arena eigenfarbig | einheitlich dunkel; **nur die Spitze** leuchtet |

Die Liga ist damit **reiner Rang**, keine Content-Freischaltung mehr: ab hier klettert
man um des Kletterns willen. Das ist auch die Stelle, an der AA die Season-Regel
einblendet (§15.6).

### 15.4 Knotenkadenz und Belohnungen

Die Skalenzahlen belegen drei Zonen:

| Bereich | Schrittweite | Beleg |
|---|---|---|
| 0 – ~1 500 🏆 | **50** | 50, 100, 150 … 1 150 lückenlos (f04-f43) |
| ~1 500 – 5 000 🏆 | **100** | 1 600, 1 700 … 2 900, 3 100, 3 200 … 4 900 |
| ab 5 000 🏆 | **200** | 5 200, 5 400, 5 600 … 9 600, 9 800 |

Die Straße wird also nach oben **dünner**, nicht dichter — die Knoten bleiben ein
Ereignis, statt zu verwässern. Das ergibt für den ganzen Aufstieg ≈ 30 + 35 + 24 ≈ **90
Knoten** bis zur Spitze.

Die Belohnungsmengen wachsen dabei sichtbar: auf den hohen Knoten stehen Multiplikatoren
**×1 · ×3 · ×10 · ×20 · ×25 · ×30 · ×100 · ×250 · ×1.2K** neben den Symbolen. ×1 sind
Truhen/Packs, die großen Zahlen Gold- und Materialmengen. Belohnungstypen selbst bleiben
über die ganze Straße dieselben (Gold, Material, Truhen) — es skaliert nur die Menge.

### 15.5 Leaderboard und Bottom-Nav

Am Straßenende führt AA direkt in die **Champions-Peak-Rangliste**: Spitze
**17 825 🏆** (*stone116*), dahinter 14 067, dann ein dichtes Feld 10 422 / 10 418 /
10 311 / 10 265 / 10 246, ab Platz 8 unter 10 000 (9 905 / 9 845 / 9 427 / 9 386 …),
Platz 24 noch bei 7 274.

> **Wichtig für unsere Kalibrierung:** Die Straße endet bei 9 800, die Weltspitze steht
> bei 17 825. **Über der Spitze geht es also weiter** — die Straße ist nicht das Ende des
> Ratings, nur das Ende der Belohnungen. Wer 9 800 erreicht, sammelt ab da nur noch Rang.

Die Bottom-Nav-Reihenfolge in dieser Aufnahme: **Shop · Collection · Battle (Mitte,
größer) · Upgrade · Chests**. Wir haben sie 1:1 übernommen (Shop | Sammlung | START |
Festung | Packs), die Schmiede hängt bei uns am Forge-Button der Sammlung.

### 15.6 Die Season-Regel im Klartext

Ein Tooltip auf der Liga-Seite (f_0213-f_0217), wörtlich:

> „At the End of Each Season, Player's Trophies Will Be Reset Based on Their Current
> Progress. They Can Climb Back Again and Collect Rewards."

Also: **kein harter Reset auf 0**, sondern ein progressabhängiger Rückschnitt — und die
Belohnungsknoten sind **erneut abholbar**. Das erklärt, warum AA so viel Aufwand in die
Straße steckt: sie ist kein Einmal-Content, sondern der Season-Loop selbst.

### 15.7 Umsetzung im Prototyp

| Befund | Umsetzung in `ui_prototype.html` |
|---|---|
| 8 Arenen 0-2 500 | `ARENA_TIERS` — unsere Namen: Kristallhof 0 · Smaragdtal 300 · Saphirfeste 600 · Sturmspitze 900 · Obsidian-Thron 1200 · Prisma-Zitadelle 1500 · **Aschenmark 2000** · **Frostbastion 2500** |
| 9 Tore + Spitze | `LEAGUE_NAME = "Prisma-Liga"`, `LEAGUE_GATES` — Eingangstor 2900 · Steintor 3500 · Eisenpfad 4000 · Bronzewacht 4500 · Silberhalt 5000 · Goldweite 6000 · Kristallpfad 7000 · Flammentor 8000 · Sturmkrone 9000 · **Prisma-Krone 9800** (`summit:true`) |
| eigene Liga-Optik | `.gatesec` — dunkles Ribbon, `gate_emblem` statt Diorama, kein Unlock-Raster; nur `summit` trägt `summit_emblem` + Prisma-Akzent |
| Kadenz 50→100→200 | `stepAt(t)`: `t < 1500 ? 50 : t < 5000 ? 100 : 200`, `ROAD_TOP = 9800` |
| Mengen skalieren | `nodeReward(t)` — Gold `200 + 40 × ⌊t/50⌋`, Essenz `2 + ⌊t/300⌋`; Pack an jedem 250er, Silber an 500ern, Gold an 1000ern |
| Namen der neuen Tiers | eigene deutsche Namen **im Geist von AAs Themen, nicht übersetzt** (Aschenmark ≈ *Storm Shroom*-Rolle, Frostbastion ≈ *Ice Brawl*) |
| `(i)`-Teaser | `TEASERS` — je Arena 2-3 Karten mit **echtem deutschen Beschreibungssatz** und eigenem Teaser-Artwork |

Die Straße rendert damit **18 Sektionen (8 Arenen + 10 Liga-Stufen) und ~72 Knoten** bis
9 800 🏆 — von Playwright verifiziert.

---

## 16. Die Festungs-Upgrades im Detail — Video 9

**Quelle:** `ScreenRecording_07-25 16-40-19` · Drive-ID `1NRDRmIM61flSodnDNuG2lZzjoFDAtFqC`
· 524 MB · Account *Netherghost*, **Level 14**, 1 136 🏆 / 521 💎 / **1 918 🪙**, Arena 4
*Dock Drop*. Die Aufnahme scrollt AAs „Upgrade"-Tab über **~40 Karten** hinweg durch und
schließt damit §9.9, das bislang nur aus einem Video-6-Streifzug bestand.

**Methode:** 88 Frames, OCR mit Koordinatenschnitt auf Kartenkopf / Bonuszeile /
Power-Zeile / Kostenknopf.

> **⚠ Wichtige Einschränkung, ehrlich notiert:** Der Goldstand blieb über die **ganze
> Aufnahme konstant bei 1 918** — es wurde **nichts gekauft**. Die sonst zuverlässige
> Methode (Kosten aus Kontostands-**Differenzen** ableiten, §13) war hier nicht möglich.
> Die Kostenwerte stammen daher ausschließlich aus der OCR der stilisierten K-Schreibweise
> („5&.51K", „6a.BIK", „PCS SIKG") und sind **unzuverlässig**. Belastbar sind nur:
> Trackzahl, Bonuswerte, Power-Zuwächse und die Gating-Mechanik.

### 16.1 Genau drei Tracks — nicht mehr

Über alle 88 Frames erscheinen ausschließlich diese drei Kartentypen, im festen Zyklus
**Max Health → DPS → Attack Speed → Max Health → …**:

| AA-Track | Beschreibungstext (OCR) | Bonus je Stufe |
|---|---|---|
| **Max Health** | „Increases fortress health" | „+2.7 %" (fällt) |
| **DPS** | „Increases fortress attack power" | „+11 %" → „+10 %" → „+8 %" |
| **Attack Speed** | „Increases fortress attack speed" | konstant „+1 %" angezeigt |

Es gibt **keine vierte Achse** (kein Range, kein Crit, keine Slots). Die Festung ist
bewusst schmal gehalten — drei Zahlen, viele Stufen. Der feste Zyklus bedeutet außerdem:
AA listet die Stufen **verschachtelt in einer einzigen langen Liste**, nicht in drei
Spalten. Es gibt also keine „Stufe 40 von Track X" als eigene Ansicht — man scrollt eine
gemeinsame Reihe.

### 16.2 Die Kostengerade hält über den ganzen Bereich

Video 6 zeigte die frühen Stufen sauber: **6 000 · 7 000 · 8 000 · 9 000 … 17 000** —
also `6 000 + 1 000 × (Stufe − 1)` mit einem **gemeinsamen Zähler über alle drei Tracks**
(Stufe 12 = 17 000 ✓). Video 9 zeigt auf den hohen Karten Werte im Bereich **20 K – 60 K**.
Beides liegt auf derselben Gerade: Stufe 55 wäre 60 000. Die Reihe ist also **linear, ohne
Knick** — kein exponentieller Sprung im Spätspiel.

> Praktische Folge: Die Festung ist eine **planbare** Gold-Senke. Der Spieler kann
> ausrechnen, was der nächste Block kostet — im Gegensatz zur Kartenaufwertung, deren
> Kosten mit dem Level exponentiell steigen (§13).

### 16.3 Power wächst mit, der Bonus schrumpft

Der zweite große Befund: **„Power +N" ist keine Konstante.** Video 6 zeigte auf einer
frühen Stufe „Power +170", Video 9 liest auf den hohen Karten:

`+418 · +448 · +460 · +478 · +500 · +550 · +580 · +588 · +610 · +670 · +685 · +688 · +760 · +780 · +808 · +840`

Das ist ein **linear wachsender** Zuwachs. Gleichzeitig **fällt** der prozentuale Bonus
(DPS 17 % → 11 % → 10 % → 8 %). AA kombiniert also zwei Kurven:

* **Power** (die angezeigte Gesamtstärke) wächst pro Stufe immer stärker → der Balken
  fühlt sich nie flach an;
* der **echte Effekt** pro Stufe sinkt → der abnehmende Grenznutzen bleibt erhalten.

Das ist ein bemerkenswert sauberer Trick: die Zahl, die der Spieler feiert, wächst; die
Zahl, die das Balancing tragen muss, flacht ab.

### 16.4 Gating: AA gatet über das ACCOUNT-LEVEL

Ab Frame f_0064 tragen alle weiteren Karten den Sperrtext „**Level Too Low**" — nicht
„not enough trophies", nicht „reach Arena N". Der Account war **Level 14**. AA bindet die
Festungsstufen also an das **Account-Level** (XP-Fortschritt), nicht an Trophäen.

> **Bewusste Abweichung bei uns.** Der Prototyp hat **kein Account-Level** — eine
> Kennzahl, die wir nicht führen, kann nichts gaten. Wir behalten daher **Trophäen-Gates**
> und verteilen sie über die volle Leiter aus §15. Das ist funktional äquivalent (beides
> ist „spiele weiter, dann darfst du mehr kaufen") und erspart uns ein zweites
> Fortschrittssystem. Falls später ein Account-Level dazukommt, ist der Umbau eine Zeile
> in `GATES`.

### 16.5 UI-Struktur — und warum wir sie nicht kopieren

AAs Upgrade-Screen ist funktional, aber der **schwächste Screen des Spiels**:

* eine lange, gleichförmige Liste; **eine Karte pro Stufe**, drei Tracks verschachtelt
* **winziges Icon** links (ca. 1/8 der Kartenbreite), viel leere Fläche rechts
* Bonuszeile, Power-Zeile, Kostenknopf „Upgrade" — kein Bild, keine Bühne
* der Kauf quittiert mit einem kleinen Zahlensprung; **nichts verändert sich visuell**

Der User hat das ausdrücklich kritisiert („zu leer, kleine Icons, viel freier
Hintergrund"). Wir übernehmen deshalb **nur die Mathematik**, nicht das Layout — siehe
§16.7.

### 16.6 Kalibrierung von `arena_fortress.js` auf Lv 100

| Konstante | Wert | Begründung |
|---|---|---|
| `LEVELS_PER_TRACK` | **100** | User-Vorgabe: bis Stufe 100 je Track |
| `TOTAL_CAP` | **300** | 3 × 100, gemeinsamer Zähler wie AA |
| `COST_BASE` / `COST_STEP` | **6 000 / 1 000** | AA-Gerade, in beiden Videos bestätigt |
| `DECAY` | **0.977** | AAs DPS 17 % → 8 % über ~30 Stufen; Stufe 100 = 0.977⁹⁹ ≈ 9.9 % des Startbonus |
| `POWER_PER_STEP` / `POWER_GROW` | **170 / 6** | `powerAt(n) = 170 + 6 × (n−1)`: Stufe 1 = 170 (Video 6), Stufe 42 = 416, Stufe 100 = 764 — deckt AAs gelesene 418…840 ab |

Daraus folgt für den Vollausbau: Gesamtkosten **46 650 000 Gold**, Gesamt-Power
`powerSum(300)` = **320 100**, Multiplikatoren **HP ×3.354 · Prisma-Schaden ×4.139 ·
Prisma-Tempo ×2.962**. Die 15 Trophäen-Tore staffeln je 20 Stufen über die Leiter aus §15:

`0 · 300 · 600 · 900 · 1200 · 1500 · 2000 · 2500 · 2900 · 3500 · 4500 · 5000 · 6000 · 7000 · 9000 🏆`

Alle Selbsttests in `arena_fortress.js` laufen grün (`node arena_patches/arena_fortress.js`),
inklusive neuer AA-Anker-Assertions („DPS Stufe 1 ≈ 8 %, Stufe 30 ≈ 4 %").

### 16.7 Unser Gegenentwurf: „Lebende Burg + Kristall-Konstellation"

Statt AAs Liste (User-Entscheidung, Layout „1+3 kombiniert"):

**A) LEBENDE BURG** — ein schwebendes Burg-Diorama oben, das sich **mit den Ausbaustufen
sichtbar verändert**. Umgesetzt als **Ebenen-Stapel**: Basis-Artwork plus reine CSS/DOM-
Overlays, eines je Track.

| Track | Overlay | wächst mit |
|---|---|---|
| Burg-Stabilität | Schild-Schimmer (`#fxShield`) + Kristall-Anbauten an den Mauern (`.wallcrystal`) | Radius und Anzahl steigen mit dem HP-Level |
| Prisma-Fokus | vertikaler Prisma-Strahl über dem Dach (`#fxBeam`) | Breite 5→27 %, Höhe 16→62 %, Glow 4→24 px |
| Prisma-Taktung | **Puls-Tempo desselben Strahls** | `animation-duration` 1.60 s → 0.55 s |

Beim Kauf: Lichtstrahl vom gekauften Knoten zur Burg (`.buyray`) plus Glow-Puls
(`.justbought`).

**B) KRISTALL-KONSTELLATION** — die drei Tracks als **Äste** mit einem Kristall-Knoten je
Stufe, vertikal scrollbar (dasselbe Muster wie die Trophäenstraße): gekauft = golden
glühend, nächste = pulsierend mit Kostenknopf, gesperrt = dunkel; Trophäen-Tore als
Schloss-Symbol auf dem Ast; **alle 10 Stufen ein größerer Meilenstein-Kristall**. Die
Knoten sind **Daten**, das Layout generisch — 100 Stufen je Track sind reine Fensterung
(`WINDOW_BEFORE = 6`, `WINDOW_AFTER = 14`). Die drei großen Track-Embleme sitzen als
Ast-Köpfe (~1/3 Kartenbreite).

**C) SKIN-ARCHITEKTUR** — die Burg ist **nirgends hart verdrahtet**. `window.CastleSkins`
liefert `{key, name, img, anchors}`; **alle** Overlays positionieren sich über
**Prozent-Anker** der Bühne, nie über Pixel:

```js
anchors: {
  prismTip: { x: 50, y: 30 },              // Ansatz des Prisma-Strahls
  shield:   { x: 50, y: 62 },              // Zentrum des Schild-Schimmers
  walls: [ {x:30,y:74}, {x:70,y:74}, … ]   // Ankerpunkte der Kristall-Anbauten
}
```

Ein späterer Verkaufs-Skin besteht damit aus **1 Artwork + 1 Anker-Objekt** und
funktioniert sofort mit allen 100 Ausbaustufen — die Upgrade-Optik ist nicht ins Artwork
eingebacken, sonst müsste jeder Skin in n Stufen gemalt werden. Auswahl liegt in
`localStorage "arenaSkins"`. Details im HANDOFF.

### 16.8 Zweites Layout: „Banner-Stapel" (Variante 2, umschaltbar)

Auf User-Wunsch steht die Festung ab 2026-07-25 in **zwei gleichwertigen Darstellungen**
zur Verfügung, umschaltbar über einen Segment-Umschalter oben rechts im View. Die Wahl
liegt in **`localStorage "arenaFortLayout"`** (`"constell"` \| `"banner"`).

| | Variante 1 „Konstellation" (Standard) | Variante 2 „Banner-Stapel" |
|---|---|---|
| Burg | lebendes Diorama oben, Overlays je Track | abgedunkelter **Parallax-Hintergrund** (`brightness .45`) hinter den Bannern |
| Tracks | drei Äste mit **einem Knoten je Stufe** | drei **Banner über die volle Breite** (~130 px) |
| Fortschrittsanzeige | Knotenkette mit Fensterung (6 zurück / 14 vor) | **Pip-Reihe der aktuellen Zehner-Dekade**: 9 Pips + Meilenstein-Gem an Position 10 |
| Kauf | Kostenknopf am nächsten Knoten | großer Kosten-Button rechts im Banner |
| Kauf-Feedback | Lichtstrahl zur Burg (`.buyray`) | `fx_spark`-Burst am Knopf + Glow-Puls auf dem Banner |
| Stärke | zeigt den **ganzen Weg** — man sieht, wie weit es noch ist | zeigt den **nächsten Meilenstein** — kompakt, ohne 100 Knoten zu rendern |

**Warum beides sinnvoll nebeneinander steht:** Die Konstellation beantwortet „wie weit bin
ich auf dieser Leiter?", der Banner-Stapel beantwortet „was kostet der nächste Schritt und
was bringt er?". Das sind zwei verschiedene Fragen, und AA beantwortet mit seiner
Listenansicht (§16.1) nur die zweite. Welche Variante final wird, entscheidet der User am
Gerät — technisch kostet das Nebeneinander nichts, weil beide Layouts denselben
`allTracks()`-Datensatz lesen und über dieselbe `buyFort()` kaufen. **`arena_fortress.js`
wurde für Variante 2 nicht angefasst.**

**Assets Batch 3** (4 Bilder, `ui_assets.json`, `type: "image"`, `batch: 3`):
`fort_banner_track` (Plakette aus dunklem Amethyst-Glas mit Goldfiligran-Rahmen, Gem-Sockel
links, Button-Zone rechts), `fort_pip_full`, `fort_pip_empty`, `fort_milestone`.

> **Goldtext-Regel, dritte Anwendung.** Auf der Banner-Plakette (dunkles Glas) ist
> `.goldtext` für den Track-Namen **erlaubt**; der goldene Kosten-Button `.tb-buy` setzt
> ausnahmslos **dunkle** Schriftfüllung. Bei dieser Gelegenheit fiel der dritte Altfall
> auf: der **KAMPF-Knopf auf Home** ist selbst golden und trug `.goldtext` — die
> Beschriftung war praktisch unsichtbar. Ebenfalls behoben.

---

## 17. Referenz-Choreografie: Pack-Öffnung mit Karten-Drehung

> **Quelle: User-Referenzvideo, ANDERES Spiel** (nicht Arcane Arena) —
> `ScreenRecording_07-07-2026 16-30-56_1.MP4`, Drive-ID
> `1PKtYhm_9drym_Osr7p1TOriq53nEeBcv`, 14 s, 1320×2868, 60 fps.
> Der User hat es als Vorbild markiert: *„so wäre es brutal geil, wenn die Karten sich so
> drehen usw."* Es ist eine Social-Aufnahme (Creator-Inset unten rechts) eines
> Pack-Openings. **Alles in diesem Kapitel gilt daher als WUNSCH-Referenz, nicht als
> AA-Befund** — AAs eigene Truhen-Zeremonie ist bis heute unbelegt (§10, der Account hatte
> nie genug Gems).

### 17.1 Was das Referenzvideo zeigt

Zwei klar getrennte Phasen:

**Phase 1 — die Karten (0:00-0:03).** Mehrere Karten liegen verdeckt nebeneinander. Sie
**drehen sich eine nach der anderen um** und zeigen je eine Figur. Tonspur: helle
digitale **Dings** plus ein **Karten-Swish** je Drehung. Der Spieler spricht dazu
(„What's it going to be?") — die Spannung entsteht also **vor** dem Reveal, nicht danach.
Aus den Einzelframes: um die sich drehende Karte liegt ein **farbiges Glühen** (im
aufgenommenen Fall kräftiges Rot/Karmesin), das mit der Drehung heller wird; die Karte
kippt kurz **über die Endlage hinaus** und federt zurück.

**Phase 2 — das Cinematic (0:03-0:13, zehn von vierzehn Sekunden!).** Für den besonderen
Zug übernimmt ein **Vollbild-Film** den ganzen Screen:

| Zeit | Bild | Ton |
|---|---|---|
| 0:03-0:08 | drei Krieger in dunkler Plattenrüstung marschieren mit Fackeln durch eine Höhle, langsame Vorwärtsfahrt | schwere metallische Schritte, tiefer Kino-Drone |
| 0:08-0:10 | Nah auf die Füße: Eisenstiefel treten auf ein rundes Runen-Podest, Funken stieben | hallender Metall-Klang |
| 0:10-0:13 | Kamera **kippt nach oben** und enthüllt den Charakter: glühend rote Augen, dunkle Energie | Monster-Brüllen + Orchester-Aufschwung |

**Die Lehre daraus:** Der teure Teil ist nicht die Karte, sondern die **Verzögerung**.
Zehn der vierzehn Sekunden gehören der Vorfreude. Und die Dramaturgie ist bewusst
**generisch** gebaut — Rüstung, Podest, Enthüllung von unten — der eigentliche Charakter
kommt erst in der Schlusssekunde. **Ein Film trägt beliebig viele Karten.**

### 17.2 Umsetzung: echter 3D-Flip, ein Klick pro Karte

Der bisherige Prototyp „flippte" mit einem Keyframe-Trick (`rotateY 0→90°→0` auf
derselben Fläche). Ersetzt durch eine **echte** Zwei-Seiten-Rotation:

```
.pcard            Bühne, perspective: 620px
  .pcglow         Glühring, currentColor = Drop-Raritätsfarbe
  .pc3d           transform-style: preserve-3d, dreht auf rotateY(180deg)
    .pcside.pcback    Kartenrücken-Artwork (Asset card_back)
    .pcside.pcfront   das Ergebnis, vorgedreht um 180°
```

Beide Seiten tragen `backface-visibility: hidden` — es ist immer genau eine sichtbar.

| Referenz-Detail | Umsetzung |
|---|---|
| Achse | **Y-Achse**, 0 → 180° (echte Drehung, keine Skalierung) |
| Tempo | **600 ms** |
| Überschwingen | `cubic-bezier(.34, 1.42, .5, 1)` — kippt über 180° hinaus und federt zurück |
| Glühen während der Drehung | `.turning` → `@keyframes turnglow`, Helligkeit bei 45 % am Maximum, Farbe = Raritätsfarbe |
| Partikel beim Aufdecken | `UIFx.spark()` in der Kartenmitte bei t = 300 ms (genau wenn die Vorderseite kippt) — 8 Funken normal, 14 ab Episch, 20 bei Legendär |
| Ton | `UISfx.flip()` — Swish (Sägezahn 300→1500 Hz) plus Ding (Sinus 1650→2100 Hz) nach 300 ms |
| **kein Auto-Reveal** | jede Karte braucht ihren eigenen Klick; „Alle aufdecken" bleibt als Option und spielt die Drehungen **sequenziell schnell** hintereinander (30 ms Versatz) |

### 17.3 Umsetzung: das Legendär-Cinematic

Ab Drop-Stufe **Legendär** (`tierIndex ≥ 4`) schiebt sich vor die Drehung ein
Vollbild-Video (`#cineLayer` → `<video id="cineVid" playsinline muted>`), Asset
`cinematic_legendary` (5 s, 720×1280, kling3_0_turbo). Danach läuft dieselbe
Dreh-Choreografie wie sonst, plus `.legend`-Nachglühen und 20 Funken.

Drei Dinge daran sind bewusst so gebaut:

1. **Kein Alpha-Kanal.** Ein Vollbild-Film braucht keine Transparenz — genau damit umgeht
   er das aus den eigenen Lessons Learned bekannte Problem, dass Overlay-Videos mit
   Alpha auf Mobile-Safari als schwarzer Kasten erscheinen.
2. **Der Film ist generisch, die Karte dynamisch.** Wie im Referenzvideo endet er in einer
   Lichtexplosion; die **echte gezogene Karte** blendet danach als HTML-Ebene ein. Ein
   Video pro Rarität reicht für beliebig viele Karten.
3. **Es kann nie hängen bleiben.** Drei Auswege: `onended` → weiter · `onerror` bzw. ein
   abgelehntes `play()` → `.fallback` mit reinem CSS-Lichtausbruch (1 250 ms) → weiter ·
   und ein `setTimeout`-Sicherheitsnetz nach 7 s. Dazu ein „Weiter"-Knopf. Der Reveal
   läuft in **allen** Fällen identisch zu Ende — auch offline, wo das CDN blockiert ist
   (genau dieser Fallback-Pfad wird im Playwright-Test durchlaufen).

### 17.4 Was für das echte Spiel noch offen ist

* **Antizipation vor dem Öffnen** (Referenz-Muster, noch nicht gebaut): Pack wackelt beim
  Antippen, glühende Risse wachsen, erst der dritte Tap sprengt es — die Vorfreude gehört
  dem Spieler, nicht der Animation.
* **Vibration** am Höhepunkt (`navigator.vibrate`), im Prototyp absichtlich nicht verdrahtet.
* **Suprem** könnte ein eigenes Cinematic in Rot-Prismatisch bekommen; derzeit teilt es
  sich das Legendär-Video (`LEGEND_FROM = 4`).
* Der Ton läuft noch über die WebAudio-Blips von `window.UISfx`. Im Spiel werden
  `UISfx.flip()` und `UISfx.legend()` **mit umgehängt** — sie sind Teil derselben
  Namensschnittstelle (siehe HANDOFF).

---

## 18. Referenz-Befunde: Login-Kalender, Guide-System, Offline-Earnings

> **Quelle: zwei User-Referenzvideos, ANDERES Spiel** (nicht Arcane Arena) — dasselbe Genre
> (Mobile-TD), vom Koordinator analysiert und die Frames gesichtet. Übernommen wird die
> **Mechanik**, nicht die Optik: Anordnung und Farben bleiben unser Brand-Stil.
> Umgesetzt in `arena_daily.js` (§18.1) und `arena_guide.js` (§18.2); §18.3 ist bewusst
> **nur dokumentiert**.

### 18.1 Daily-Login-Kalender

**Aufbau im Referenzspiel:**

| Element | Beobachtung |
|---|---|
| Auslöser | Popup **beim ersten Öffnen des Tages**, vor allem anderen |
| Raster | **7 Kacheln** (Tag 1–7), meist 4 + 3 oder 7 in einer Reihe |
| Zustände | vergangene Tage **abgehakt**, heutiger Tag **hervorgehoben** mit Abhol-Button, kommende **gesperrt mit sichtbarer Vorschau** |
| Anker | **Truhen** an mehreren Tagen, Tag 7 die größte |
| Tag 7 | eigene, **festlichere Kachel** (größer, andere Rahmenfarbe) |
| Zyklus | nach Tag 7 beginnt der Kalender von vorn |

**Unsere Umsetzung — und die eine bewusste Abweichung:**

> **User-Vorgabe, wörtlich:** *„Daily Login Belohnungen mit Truhen wir brauchen aber mit
> boosterpacks"*

Truhen sind bei uns bereits belegt (Clan-Wochentruhe, Kriegstruhe, Tagestruhe) und stehen
für **Gruppenleistung**. Der Login ist ein **individueller** Moment, also ein **Booster-Pack**:
Tag 3 Bronze, Tag 5 Silber, **Tag 7 Gold-Pack + 5 000 Gold** als Finale. Werte und Herleitung:
`DESIGN_MONETARISIERUNG.md` §D.1.

**Zweite Abweichung — kein Streak.** Das Referenzspiel setzt bei einem verpassten Tag zurück.
Wir nicht: Der Kalender rückt ausschließlich beim **Abholen** vor. Begründung ausführlich in
§D.1 — kurz: Die Härte des täglichen Loops sitzt bei uns schon im Siegesserien-Bonus, wo sie an
*Leistung* hängt statt an Anwesenheit.

### 18.2 Guide-System (zwei Teile)

Das Referenzspiel trennt sauber zwischen *„was soll ich als Nächstes tun"* und *„wie
funktioniert das"* — genau diese Zweiteilung haben wir übernommen:

**Teil 1 — Einsteiger-Guide** (eigener View):

| Element | Beobachtung | Unsere Umsetzung |
|---|---|---|
| Struktur | gestaffelte **Kapitel** | 4 Kapitel: Erste Schritte · Karten & Fusion · Clan & Krieg · Festung & Pass |
| Kapitel-Inhalt | **Aufgabenliste mit Häkchen** | 4 Aufgaben je Kapitel, 16 gesamt |
| Häkchen-Quelle | echte Spielzustände | **`ArenaTelemetry`-Trichter** + ArenaCards/Clan/Fortress/Daily — kein zweiter Zähler |
| Belohnung | pro Aufgabe | 500–1 500 🪙 + 4–10 ⚗ |
| Kapitel-Abschluss | größere Belohnung | **Booster-Pack**, steigend Bronze → Silber → Silber → Gold |
| Fortschritt | Leiste über alle Kapitel | `ArenaGuide.progress()` → 0–100 % über 16 Aufgaben |
| Staffelung | Kapitel n+1 erst nach n | umgesetzt: `locked`, gekoppelt an *erledigt*, nicht an *abgeholt* |

Zwei Aufgabensorten: **auto** (aus fremden Modulen abgeleitet) und **mark** (das UI meldet
eine tatsächlich gesehene Ansicht — `ArenaGuide.mark("vault_seen")`). Damit lassen sich auch
Aufgaben wie *„Sieh dir den Kristalltresor an"* ehrlich abhaken, ohne dafür Telemetrie-Ereignisse
zu erfinden.

**Teil 2 — Spiel-Handbuch:** bebilderte Erklärseiten pro System, aufklappbar, erreichbar aus dem
Einsteiger-Guide **und** aus den Einstellungen. Acht Seiten (`ArenaGuide.MANUAL`): Elemente ·
Fusion · Raritäten-Leiter · Packs & Pity · Festung · Clan & Krieg · Pass & Tresor · Täglicher
Loop. Jede Seite trägt Asset-Schlüssel zur Illustration (die `card_*`-Artworks, `frame_*`,
`pack_*`, `fort_castle`, `hub_clan`, `pass_keyart`) — das UI rendert generisch aus den Daten.

### 18.3 „Offline Earnings" — beobachtet, seit dem 30.07.2026 GEBAUT

Gold **und** XP pro Stunde Abwesenheit, Deckel 8 h, „Quick Earnings" gegen Werbung oder Gems,
eigenes Popup direkt nach dem Login-Kalender.

> **Korrektur 30.07.2026.** Dieser Abschnitt hieß bis dahin „bewusst nicht gebaut" und verwies
> auf drei Gründe gegen eine Übernahme. Der Auftraggeber hat die Übernahme angeordnet; das
> Panel ist gebaut. Die drei Einwände sind nicht verschwunden, sondern einzeln beantwortet —
> `GAMEPLAY_OPTIMIERUNG.md` §10.3. Unsere Maße und Abweichungen: **§26** in dieser Datei.

---

## 19. AA-Layout-Rebuild der Meta-UI (2026-07-25)

> **User-Feedback, wörtlich:** *„AA wirkt viel aufgeräumter und cleaner bei uns ist alles
> cluttert das wollen wir so nicht … Unsere UI muss genau die gleiche Anordnung der Buttons
> haben. Das selbe beim Shop battlepass usw. Wir wollen nur unsere Brand Farben und unsere
> individuellen Designs … Auch die Banner Grösse muss auf das AA Design angepasst werden
> durchgehend durch die komplette Ui."*

### 19.1 Home — AAs Achse, 1:1 übernommen

| AA-Position (§9.5b / §14.3) | Unser Element | gemessen im Prototyp |
|---|---|---|
| 7 % Top-Bar 🏆 \| 💎 \| 🪙 | unverändert | 7 % |
| 12 % Profilzeile (Avatar, Name, Level) | `.profrow` mit XP-Ring | 7 % |
| **21 % Season-Pass als breites Banner** | `.passbanner` | **13 %** |
| ~25 % schwebendes Diorama, 35 % Breite | `.diorama`, 46 % Breite | 25 % |
| 28-33 % Arenaname zweizeilig | `.arenakicker` + `.arenaname` | 39 % |
| 34 % Modifier-Chip | `.arenachip` | 43 % |
| 58 % Trophäenbalken + Reward-Icon rechts | `.progwrap` | 65 % |
| **64 % vier Hex-Slots** | `.slotrow` | 70 % |
| 74-83 % EVENTS \| **BATTLE (55 %)** \| CHALLENGES | `.homerow3` | 82 %, Knopf 55 % |
| 90 % Bottom-Nav, 5 Tabs, Mitte erhöht | unverändert | 90 % |

**Was vom Startbildschirm verschwunden ist** — begründet mit AAs zentraler Aussage §9.5b
*„Ein Bildschirm = ein Ziel. Zwischen Wappen und Battle-Taste steht nichts Ablenkendes."*:

| Entfernt | Wohin | AA-Beleg |
|---|---|---|
| **8er-Arena-Leiter** (die „300-Trophäen-Ziffernflut") | Trophäenstraße hinter dem KAMPF-Knopf | §14.4 — AA hat die Leiter **nur** dort |
| Erklärender Fließtext unter der Leiter | gestrichen | §9.5b — Home zeigt nur eine Fortschrittsleiste |
| **Tresor-Widget** | Shop | §8.1 — dort liegt AAs Angebotsfläche |
| **Tagesziel-Panel** | hinter das Kalender-Icon der Profilzeile | §14.3 — AA hält den Kopf für Icons frei |
| Zwei Hub-Kachelreihen (6 Text-Kacheln) | 5 Icons in der Profilzeile | §14.3 — Postfach-/Freundes-/Menü-Icon |

**Bewusste Abweichungen von AA, jeweils begründet:**

1. **Diorama 46 % statt 35 % Breite.** AAs Key-Art ist 4:3, unsere ist 16:10 — bei exakt 35 %
   wäre die Insel 150 px breit und nicht mehr lesbar. 46 % trifft AAs Wirkung („kleines
   schwebendes Objekt auf ruhigem Grund"), vorher waren es 74 %.
2. **Keine seitlichen Angebots-Schienen.** §14.3 bewertet AAs zwei senkrechte Shop-Schienen mit
   je 3-4 rot gebadgten Kacheln selbst als „sehr aggressives Monetarisierungs-Layout, das wir
   bewusst nicht übernehmen". Diese Bewertung steht.
3. **„CHALLENGES" ist bei uns der Einsteiger-Guide.** Gleiche Rolle (offene Aufgaben mit
   Belohnung), gleiche Position rechts neben dem KAMPF-Knopf.

### 19.2 Einheitliche Banner-Metrik

Vorher trug jede View Freihand-Größen (Reihenhöhen 76/82/90/128 px, Abstände 6/7/8/10 px,
Radien 8/11/12/14/16 px). Genau das liest das Auge als „cluttert", auch wenn jede Reihe für
sich sauber ist. Ab jetzt gilt **eine Leiter** als CSS-Variablen in `:root`:

```
--banner-h:72px    --banner-h-sm:56px   --banner-h-lg:128px
--tile:84px        --gap:8px            --gap-lg:12px
--radius:14px      --radius-sm:10px     --pad:12px
```

Angewendet in **39 CSS-Regeln** quer durch Shop, Sammlung, Schmiede, Clan (Quests/Spenden/
Krieg), Rangliste, Festung, Guide, Handbuch und Login-Kalender. Neue Reihen wählen eine der
Höhen und einen der beiden Radien — **keine Zwischenwerte mehr**.

> **Nachtrag:** Die Leiter hat inzwischen eine **vierte** Höhe `--keyart-h` für
> Vollbild-Key-Art-Köpfe, siehe §19.4. Damit ist sie geschlossen.

### 19.3 Beim Sweep gefundene echte Fehler

| Fehler | Wirkung | Fix |
|---|---|---|
| **`nav.bottom{position:absolute}`** hing an `#app`, das mit dem Inhalt wächst | In langen Views (Einstellungen, Rangliste, Festung) rutschte die Bottom-Nav unter den sichtbaren Bereich und war **nicht mehr erreichbar** | `position:fixed` mit derselben Breite/Zentrierung; AA hält sie konstant bei 90-100 % (§9.5b) |
| Profil- und Pass-Banner-Textblöcke ohne `display:block` | Zeilen liefen ineinander („Stufe 4 · 620/1000 XP" umgebrochen, „TAG 7 · FINALEGOLD-Pack") | `display:block` auf den Textspans |
| `#fortBg` überdeckte Titel und Layout-Umschalter | Umschalter unsichtbar, aber klickbar | `position:relative; z-index:2` auf Titel und `.laybar` (bereits in §16.8) |

Die v7-Suite prüft diese Klasse von Fehlern jetzt **für alle 15 Views automatisch**:
Bottom-Nav sichtbar · keine helle Schrift auf goldener Fläche · kein Titel von einem
positionierten Layer verdeckt · alle sichtbaren Knöpfe mit `.pressable` · kein horizontaler
Scroll.

### 19.4 Metrik-Erweiterung: `--keyart-h`

Die Leiter aus §19.2 hat **eine vierte Höhe** bekommen:

```
--keyart-h:172px   /* Vollbild-Keyart-Kopf: Season-Pass, Event-Kopf */
```

**Begründung:** Der Season-Pass-Kopf ist ein Key-Art-Bild, keine Textreihe. Auf
`--banner-h-lg` (128 px) wird daraus ein Letterbox-Streifen, in dem das Artwork nicht mehr
liest; die vorherige Freihand-Lösung war `aspect-ratio:16/9` und damit **228 px** — dann
rutscht die Stufen-/XP-Leiste unter die Falz und der Spieler sieht seinen Fortschritt beim
Öffnen nicht. 172 px ist der Kompromiss, bei dem beides zutrifft. **Damit ist die Leiter
geschlossen — weitere Zwischenwerte gibt es nicht.**

### 19.5 Shop und Season-Pass auf AAs Anordnung (2026-07-25)

**Shop** (`#viewShop`) folgt jetzt **exakt** der Reihenfolge aus §8.1. Jede Sektion trägt ein
`data-sec`-Attribut, die v7-Suite prüft die DOM-Reihenfolge als Zahlenkette `1,2,3,4,5,6,7`:

| # | AA (§8.1) | Bei uns | Container |
|---|---|---|---|
| 1 | Werbe-Entfernen-Banner | **Promo-Banner Season-Pass** | `#shopPromo` |
| 2 | ARENA PACK / Starter Pack | Angebotskette + **Arena-Pack / Starter-Pack** | `#offerSlot`, `#arenaPackBox` |
| 3 | DAILY DEALS | Tagesangebote | `#dealGrid` |
| 4 | Truhen / Packs | Booster-Packs | `#packShop` |
| 5 | ENDLESS ROULETTE | **Kristalltresor** | `#vaultShop` |
| 6 | Gem-Bundles | **Gem-Pakete** (neu) | `#gemShop` |
| 7 | Gold-Bundles | **Gold-Tausch** (neu) | `#goldShop` |

**Season-Pass** (`#viewPass`) trug die §9.10-Reihenfolge bereits (Keyart-Header →
Stufen-/XP-Leiste → Kauf-/Aktiv-Status → Spurenliste); geändert wurde die **Geometrie**:
Keyart auf `--keyart-h`, Radien auf `--radius`, die Farb-Reihen des Farb-Passes
(`.rwcell`, `.passrow`) auf `--banner-h-sm` / `--radius-sm` / `--gap`. Die v7-Suite prüft
Reihenfolge **und** Metrikbindung.

#### Annahmen — Referenzlücken

Die folgenden Punkte gibt die Videoreferenz **nicht** her. Sie sind nach unserer eigenen
Metrik entschieden und hier festgehalten, damit später nachvollziehbar ist, was Beleg war
und was Entscheidung:

| # | Referenzlücke | Unsere Annahme | Warum so |
|---|---|---|---|
| 1 | **Platz 1** — wir haben keine Werbung, AAs Banner „remove forced ads" ist gegenstandslos | Season-Pass als Dauerangebot auf Platz 1 | §19.1 lehnt AAs aggressive Monetarisierungs-Schienen ab; der Pass ist das stärkste Angebot, das wir **ohne** Werbedruck haben |
| 2 | **Platz 5** — Glücksrad („Endless Roulette") | **Kristalltresor** (`arena_vault.js`) | gleiche Rolle (Sammel-Zufallsbelohnung an fester Stelle), ohne Glücksspiel-Optik |
| 3 | **Kachelraster** der Gem-/Gold-Sektionen — Video zeigt keine Geometrie | 2 Spalten, oberste Staffel über die volle Breite; Radius `--radius`, Abstand `--gap`, Sektionsabstand `--gap-lg` | einheitliche Metrik §19.2; die Querkachel setzt die teuerste Staffel ab, ohne eine neue Größe einzuführen |
| 4 | **Anzahl der Gem-Staffeln** | **5** (80 / 500 / 1 200 / 2 500 / 6 500) | AA zeigt fünf benannte Pakete (Heap · mittel · Bag · Trophy · Safe) — die Anzahl ist belegt, die Beträge sind unsere |
| 5 | **Preise** — AAs Fr.-Werte sind nur teilweise lesbar (》Bag of Gems 2500 = „Fr. 40?"《) | eigene Staffel Fr. 3 / 9 / 19 / 39 / 89 | verankert an AAs **lesbaren** Enden (80 Gems ≈ Fr. 3, 14 000 Gems ≈ Fr. 90); dazwischen unsere eigene, monoton fallende Ct-pro-Gem-Kurve |
| 6 | **Wo die Siegel sitzen** — AA zeigt keine „popular"/„best value"-Marken | „Beliebt!" auf Staffel 2, „Bester Wert!" auf Staffel 4 | der klassische Anker: nicht die billigste (wirkt geizig) und nicht die teuerste (wirkt unerreichbar) |
| 7 | **Gold-Bundles** — AA verkauft sie für Echtgeld, eines gratis per Rewarded Ad | **Gems → Gold** plus ein werbefreies Tages-Gratispaket | Gold ist bei uns die erspielte Währung (DESIGN_PROGRESSION §B); der Tausch ist die Brücke aus der Premium- in die Spielwährung. Rewarded Ads sind nach §19.1 ausgeschlossen |
| 8 | **Höhe des Pass-Keyarts** | `--keyart-h:172px` | siehe §19.4 |

#### Offen

* **AA hat DREI Pass-Stufen** (FREE / EPIC PASS / LEGENDARY PASS, §9.10), unsere
  `window.ArenaPass` führt **zwei** Spuren (Gratis / Premium). Die dritte Spur ist eine
  **Daten**-Erweiterung im Pass-Modul, kein Layout-Thema — sie wurde hier bewusst **nicht**
  mitgemacht, weil ein dritter Knopf ohne dahinterliegende Belohnungsspur nur Attrappe wäre.
* **Echtgeld** (Arena-Pack, Starter-Pack, Gem-Pakete) ist im Prototyp ein **Platzhalter**:
  Der Klick sagt genau das und rührt keine Wallet an. Nur der Gold-Tausch bucht echt.

---

## 20. Farb- und Bewegungsmessung der AA-Meta-UI (2026-07-26)

Anlass: Der Prototyp wirkte trotz aller Inhalte „leer/tot". Die Vermutung war, dass AA mehr
**Bewegung** hat. Die Messung zeigt das Gegenteil — AA hat mehr **Farbfläche**.

### 20.1 Methode

Video 6 (komplette Menü-Tour, 264 s) und Video 11 (Shop/Helden/Turmkarten/Merge, 129 s) wurden
Bild für Bild ausgewertet, nicht per Augenmaß:

* **Farbe:** Jeder Screenshot wird in 14 waagerechte Bänder geschnitten. Pro Band wird der
  Farbton-Sättigung-Helligkeit-Histogramm-Modus bestimmt, wobei fast schwarze und
  entsättigt-dunkle Pixel verworfen werden. Ergebnis: der dominante *Farbeindruck* je
  Bildschirmzone mit Flächenanteil in Prozent.
* **Bewegung:** Aus 8–16 aufeinanderfolgenden Bildern (10–12 fps) wird die mittlere absolute
  Pixeldifferenz gebildet — global und je Zelle eines 16 × 4-Rasters. Der **Rauschboden liegt
  gemessen bei exakt 0,00**, jeder Wert darüber ist echte Bewegung. Zeitpunkte mit globaler
  Bewegung > 3 sind Scroll-/Tippmomente und für die Animationsfrage unbrauchbar; deshalb wurde
  das ganze Video zuerst nach **statischen Fenstern** durchsucht.

### 20.2 Ergebnis Bewegung — AAs Meta-UI ist praktisch statisch

Statische Fenster in Video 6: 90 / 94 / 98 / 190–218 / 226–242 s. Gemessene globale Bewegung
dort: **0,00–0,05**. In Video 11 an den Turm-Detailkarten (63–97 s): **0,0–0,4**.

| Screen | statisch gemessen | Bewegung |
|---|---|---|
| Season-Pass „Golden Fortune" | t=90 / 94 s | **0,03–0,05 → nichts bewegt sich** |
| Festungs-Upgrades | t=230 / 242 s | **0,00–1,5**, und zwar nur ein kleines Feld in der Mitte |
| Collection / Battle Deck | t=120 s (V11) | 0,0 |
| Leaderboard / Champions Peak | t=190–218 s | 0,4–0,5 |
| Helden | t=36 / 38 / 40 s | 0,0 |
| **Turm-Detailkarte** | t=84 / 96 s | **lokal 1,5–5,9 in Zeile 6–9 von 16** |

Damit ist §2.2 **bestätigt und präzisiert**: Der Turm wird animiert, aber nur in einem kleinen
Ausschnitt in der senkrechten Bildmitte (etwa y 38–62 %), Amplitude bescheiden. Zusätzlich
läuft dauerhaft ein **kleines Schimmer-Element** bei Zeile 5, Spalte 1 (Wert konstant 1,1–1,6)
— vermutlich das Raritäts-/Level-Abzeichen.

**Konsequenz für uns:** Wir haben bereits **8 Karten-Loop-Videos** und ein **animiertes
Pass-Keyart**. Damit liegen wir über AAs Bewegungsniveau. Weitere Loop-Videos sind zur
Angleichung **nicht nötig** und wären verbrannte Credits. Bewegung ist nicht die Lücke.

### 20.3 Ergebnis Farbe — hier ist die Lücke

Unsere Palette ist über alle Views hinweg dieselbe: `--bg:#0e1418`, `--panel:#16202a`,
`--panel2:#1c2833` — ein einziges dunkles Grau-Blau. AA dagegen gibt **jedem Screen eine
eigene, großflächige Farbwelt**:

| Screen | AA (gemessen) | wir | Aktion |
|---|---|---|---|
| **Shop** | jede Karte eigener satter Ton: violett 270°, blau 210/229°, orange 30°, gold 50°, magenta 310°, cyan 190° | nur Gems orange + Gold grün (Batch 6) | restliche Sektionen einfärben |
| **Festung/Burg** | **violett/magenta 270–290°, s 0,6–0,9, v 0,6 auf 70–100 % der Fläche** | dunkelgrau | große satte Farbfelder |
| **Clan** | **hell/weiß 210°, s 0,1, v 0,9 auf 40–50 % der Fläche** | dunkelgrau | helle Panels — genau der Kit-Banner-Look |
| **Leaderboard** | violett/indigo 270°/250°, s 1,1 | dunkelgrau | violette Grundfläche |
| **Arena-Liste** | **pro Arena ein eigener Farbton**: orange 30°, grün 90°, violett 270°, cyan 170° | einheitlich | Farbton je Arena |
| **Helden** | dunkle Basis + **helle Panels** je Held (s 0,1, v 0,9) + mittelblaue Statboxen (s 0,6, v 0,4–0,6) | dunkelgrau | helle Heldenpanels |
| **Turm-Detailkarte** | blaue Basis + **grüne Statfläche** 70°, s 0,9, v 0,6 (Band 6–8) | dunkelgrau | grüne Statfläche |
| **Merge / Schmiede** | **rot-braun getönte obere Hälfte** 10°, s 0,4 | dunkelgrau | Warmtönung oben |
| **Season-Pass** | gold/orange Keyart-Header + Tier-Farben je Reihe | teils vorhanden | Tier-Reihen einfärben |
| **Home** | mittelblaues Diorama 229°, s 0,6, v 0,4 + orange/gold Akzente | dunkelgrau | Dioramafläche aufhellen |
| **Collection / Deck** | einheitlich dunkelblau 210°, s 0,9, v 0,1 — die **Karten** tragen die Farbe | dunkel ✓ | **passt, nicht anfassen** |

Der Merksatz: AA ist nicht bunter, weil es blinkt, sondern weil **jeder Screen eine eigene
große Farbfläche** hat. Nur Collection und Deck sind bei AA so dunkel wie bei uns überall —
und genau dort ist unsere Optik deshalb schon richtig.

### 20.4 Icon-Bestandsaufnahme des Prototyps

Zählung über die Emoji-Unicode-Bereiche in `ui_prototype.html`: **356 Treffer, 98 verschiedene
Zeichen**. Nach Abzug von Text-Pfeilen (`→` ×67) und Text-Markern (`⚠` ×16, `✓`/`✔` ×9) bleiben
als echte Icon-Lücken:

| Emoji | Vorkommen | Rolle | Ersatz |
|---|---|---|---|
| 🏆 | 33 | Trophäen — das häufigste Icon überhaupt | `ic_trophy` |
| 🪙 | 22 | **Gold-Währung** | `cur_gold` |
| 💎 | 4 | **Gem-Währung** | `cur_gem` (smaragdgrün) |
| 🔥❄🪨🌿☀🌑 | 28 | die **sechs Elemente** | `el_feuer` … `el_dunkelheit` |
| ⚗ | 10 | Material/Essenz | `cur_material` |
| 🥇🥈🥉 | 11 | Liga-Ränge | `rank_gold/silber/bronze` |
| 🔒 | 6 | gesperrt | `ic_lock` |
| 🛡 | 4 | Verteidigung | `ic_shield` |
| ⚡ | 4 | Tempo | `ic_speed` |
| 📥 | 1 | „Karten anfragen" | `ic_request` |

Die beiden **Währungs-Icons** sind die dringendsten: sie stehen in der Top-Bar und an jedem
Preis, also auf praktisch jedem Screen.

### 20.5 Clan-Kartenversand — was visuell fehlt

`doDonate()` besteht heute aus **Sound + Toast + Neu-Rendern**. Der Moment, in dem ein Spieler
einem Clankameraden hilft, ist damit visuell nicht vorhanden — obwohl er der emotionale Kern
des Clans ist. Fehlend:

1. **Sende-Zeremonie:** Die Karte muss sichtbar von der eigenen Sammlung zur Anfragezeile
   fliegen (Flug + Funkenschweif + Einschlag), nicht nur eine Zeile weiterzählen.
2. **Belohnungs-Einblendung:** `+Gold` und `+Material` als Icon-Zahl-Paare, die aus der
   Einschlagstelle aufsteigen — nicht als Text im Toast.
3. **Erfüllungs-Moment:** Wird eine Anfrage mit der Spende voll, braucht das eine eigene
   Bestätigung („Anfrage erfüllt!") mit Aufleuchten der Zeile.
4. **Kontingent-Feedback:** Die Punktreihe (`qdots`) muss den verbrauchten Punkt sichtbar
   umschalten, damit die 10-pro-3-Stunden-Regel begreifbar wird.
5. **Icons:** `ic_donate` für den Spenden-Knopf, `ic_request` statt 📥.
6. **Helle Panels** nach §20.3, damit der Clan sich wie bei AA vom Rest abhebt.

Punkte 1–4 sind reine CSS/JS-Choreografie und kosten kein Asset.

### 20.6 Zwei Fehler, die erst der Browsertest mit echtem CDN zeigte

Die lokale Playwright-Suite kann das CDN nicht erreichen — dort greifen ueberall die
Emoji-Fallbacks. Layout und Farbflaechen sind so pruefbar, die **Assets selbst nicht**.
Deshalb wurde derselbe Markup-Ausschnitt zusaetzlich im Higgsfield-Sandbox-Browser gerendert,
der das CDN erreicht. Das deckte zwei Fehler auf, die lokal unsichtbar bleiben:

**1. Sektions-Ribbons waren unlesbar.** Die Ribbon-PNGs wurden auf dunklem Grund generiert,
dieser Grund ist im Bild eingebacken. Als Vollflaechen-Hintergrund deckte er die helle
CSS-Platte zu — die dunkle Ueberschrift stand damit auf Dunkel. Lokal fiel das nicht auf,
weil ohne CDN nur die helle Platte zu sehen war.

*Fix:* `background-blend-mode:screen,normal`. Der dunkle PNG-Grund faellt gegen die helle
Platte weg, das helle Band bleibt als Ornament stehen. Damit ist die Ueberschrift in allen
drei Zustaenden lesbar: ohne Bild, mit Bild und bei CDN-Ausfall. Im Sandbox-Browser
gegengeprueft (Varianten A–E, `screen` gewinnt).

**2. Icon-Untergrenze liegt bei 20 px.** `ic_donate` im Spenden-Knopf (14 px) war ein
unlesbarer Klumpen — diese Artworks tragen zu viel Detail fuer Knopfgroesse. Gemessen:
14 px unbrauchbar, 20 px lesbar.

*Fix:* Der kleine Knopf traegt **kein** Icon mehr (gruen + „SPENDEN" ist eindeutig genug).
`ic_donate` sitzt jetzt mit 22 px an der Kontingent-Zeile, wo Flaeche ist, und ankert die
Sektion als „Geben". `ic_request` im vollbreiten Knopf wurde von 16 auf 20 px gezogen.

**Regel fuer alles Weitere:** Diese Artworks brauchen **mindestens 20 px**. Wo weniger Platz
ist, gehoert kein Bild hin — dort tragen Farbe und Wort die Bedeutung.

---

## 21. Merge-System und Level-Caps aus 14 neuen User-Screenshots (2026-07-26)

> Anlass: Der User lieferte 14 AA-Screenshots nach und vermutete
> *„grad grün maximum 20 level, blau maximum 30 lvl usw"*. Dieser Abschnitt prüft die
> Vermutung an den Bildern. **Ergebnis vorweg: die Vermutung ist für grün und blau
> bestätigt** — mit einer wichtigen Präzisierung, welche Stufe „grün" eigentlich ist.

### 21.1 Methode und Bildquellen

**Werkzeug.** Die Bilder liegen auf Google Drive; der lokale Agent-Proxy blockiert
`drive.usercontent.google.com`, deshalb lief die Auswertung vollständig in der
Higgsfield-Sandbox. Dort wurde **Tesseract 5.3.0** installiert und über
`pytesseract.image_to_data` betrieben, sodass zu jedem Wort **Konfidenz und
Bildkoordinaten** vorliegen. Vorverarbeitung: Graustufe → `autocontrast` → **Invertierung**
(AA schreibt hell auf dunkel, uninvertiert liest Tesseract praktisch nichts). Alle Bilder
sind **1320 × 2868 px**; die genannten y-Werte sind Originalkoordinaten.

**Zweistufig.** OCR erkennt AAs **Fließtext** sehr gut (Konfidenz 90-96), scheitert aber
zuverlässig an der **stilisierten Zierschrift mit Kontur**, in der AA alle *Zahlen* auf
Buttons und im Statraster setzt — dort liefert Tesseract auch mit Digit-Whitelist und
psm 7/8/13 nur Konfidenz 0-2. Diese Zahlen wurden deshalb **visuell** gelesen: Ausschnitt
zuschneiden, 2-3× hochskalieren, als WebP über Base64 übertragen und ansehen. Jede Zahl
unten ist mit ihrer Ableseart markiert (*OCR* / *visuell*).

**Was welches Bild zeigt** (alle 14 klassifiziert, damit nichts unbelegt herumliegt):

| Bild | Screen | für Karten/Merge relevant |
|---|---|---|
| **3310** | Forge-/Merge-Screen mit Divine-Sword-Vorschau | **ja — Kernbeleg** |
| **3311** | Zeremonie `PERFECT MERGE!` | **ja — Kernbeleg** |
| **3317** | Turm-Detailkarte **WOLF BARRACKS · GOOD · LVL 20/20** | **ja — Kernbeleg** |
| **3318** | Turm-Detailkarte **DIVINE SWORD · RARE · LVL 20/30** | **ja — Kernbeleg** |
| 3309 | Clan-Anfragen („Requesting Hawk Nest blueprints!", `10/30`, `DONATE`) | ja, indirekt (§21.4) |
| 3300 | Quests, Tab **DAILY** („Upgrade your cards in the Challenge 25 time(s) 7/25") | Randnotiz |
| 3301 | Quests, Tab **LIFETIME** („Unlock 15 towers", „Reach fortress level 15", `2087/2500` Gem) | Randnotiz |
| 3299 | Quests, Tab **WEEKLY** | nein |
| 3298 | Login-Kalender (Tage 22-30, „Next reward in 39h 15m", `x1 x20 x50 x100`) | nein |
| 3306 | Shop, Truhen (Explorer/Mystic, Truhentexte wie §3) | nein |
| 3307 | Shop | nein |
| 3308 | Shop / Daily Deals („Free") | nein |
| 3313 | Offline-Earnings-Dialog | nein |
| 3314 | Offline-Earnings beschleunigen („Remaining: 3") | nein |

Zehn der vierzehn Bilder betreffen also **nicht** das Kartensystem. Die vier relevanten
sind dafür ungewöhnlich ergiebig, weil sie die **zwei Enden eines Merges** zeigen: eine
Karte, die an ihrem Cap klebt, und eine Karte, die den Merge hinter sich hat.

### 21.2 Level-Caps je Rarität

#### Direkt gelesen — belastbar

| Rarität | Cap | Beleg | Ableseart |
|---|---|---|---|
| **Good** (grün) | **20** | **3317**: `LVL: 20/20` (y 981) **und** darunter statt eines Upgrade-Buttons der Satz **`Card has reached the level cap`** (y 2182) | Level *visuell* + *OCR* (Konf. 84-96); Satz *OCR* (Konf. 84-96) |
| **Rare** (blau) | **30** | **3318**: `LVL: 20/30` (y 981) — Karte auf Level 20, Cap 30 | *visuell*, zusätzlich Digit-OCR `20/30` |
| Good → Rare | 20 ⇒ 30 | **3310** Merge-Vorschau `MAX LEVEL 20 ➜ 30` (y 302) und **3311** Zeremonie `MAX LEVEL` / `20 ➜ 30` (y 1609/1697) | *OCR*, Konf. 92-96 |

Die Zeile `Card has reached the level cap` ist der stärkste Einzelbefund des Durchgangs:
Sie belegt nicht nur die **Zahl** 20, sondern auch die **Härte** des Caps — die Karte hatte
mit `31/10` reichlich Material (§21.4) und konnte trotzdem nicht aufgewertet werden.
Der Merge ist damit keine Option, sondern das **einzige Tor** nach Level 20.

#### Stimmt die Vermutung des Users?

**Ja — mit einer Präzisierung.** „Grün = 20" und „blau = 30" sind beide direkt belegt.
Die Präzisierung: **grün ist nicht die unterste Stufe.** AAs Leiter ist
`Common → Good → Rare → Epic → Legendary` (§3), grün ist **Stufe 2 („Good")**, grau ist
Stufe 1 („Common"). Wer „grün = 20" als „Anfängerkarte = 20" liest, verschiebt die ganze
Leiter um eine Stufe. Das steht auf den Bildern wörtlich: Unter dem Kartennamen sitzt in
kleiner Schrift das **Raritätswort** — `GOOD` bei Wolf Barracks (3317), `RARE` bei Divine
Sword (3318), beides *visuell* zweifelsfrei gelesen.

#### Interpoliert / vermutet — NICHT auf diesen Bildern

| Rarität | Cap | Status |
|---|---|---|
| Common (grau) | 10 | **nicht auf diesen 14 Bildern.** Stammt aus §13.3 (Boulder-Badge `…/10`), bleibt dort belegt — hier gibt es **keine** unabhängige Bestätigung, weil keine Common-Karte zu sehen war. |
| Epic | 40 | **reine Fortschreibung** der Schrittweite +10. Keine Epic-Karte auf irgendeinem der 14 Bilder. |
| Legendary | 50 | **reine Fortschreibung.** Ebenso ungesehen. |

Die Schrittweite **+10 pro Stufe** ist durch 20 → 30 an *einer* Übergangsstelle gemessen.
Ob sie oben konstant bleibt oder AA dort größere Sprünge macht (z. B. 30 → 45 → 60), ist
**unbekannt**. Bei der Kalibrierung unserer Tabellen sollte Epic/Legendary weiter als
Annahme markiert bleiben und nicht als Messwert durchgehen.

#### Korrektur zu §3: der blaue Namensbanner ist keine Raritätsfarbe

§3 führt „Detail-Banner **#2379EC / #1D73E6** (blau)" als **Rare**-Farbe, gesampelt am
Ice-Blaster-Banner. Die Messung an 3317 und 3318 widerlegt das: Der Bereich um den
Namensbanner (y 360-470) liefert bei **beiden** Karten **identisch** `h210 · s0,9 · v0,9`
auf 46 % der Fläche — bei der **Good**-Karte genauso wie bei der **Rare**-Karte. Der
Banner ist also **UI-Chrome**, nicht raritätsabhängig. Die Rarität wird in AA auf der
Detailkarte **durch das Wort** ausgedrückt, nicht durch die Bannerfarbe. Für Rare bleibt
damit nur der **Kartenrahmen** im Raster als Farbbeleg (§3).

### 21.3 Merge-System

#### Die Merge-Gleichung ist auf 3310 grafisch aufgelöst

Der Merge-Screen zeigt rechts oben die Vorschau und darunter die Bedingung **als Bild**,
nicht als Text (Originalkoordinaten):

```
y 233   DIVINE SWORD                       (Panelkopf)
y 302   MAX LEVEL      20  ➜  30
y 353   BONUS HEALTH   23.26%  ➜  24.4%
y 405   BONUS DAMAGE   11.97%  ➜  13.22%

y 470   ┌───────┐                          Ergebniskarte, Badge  LvL 15
        │       │
y 555      ⇧                               Aufwärtspfeil
y 640   ┌───────┐   +   ┌─────┐ ┌─────┐
        │Basis  │       │Kopie│ │Kopie│
        │LvL 15 │       │LvL 1│ │LvL 1│
        └───────┘       └─────┘ └─────┘
y 1196  ⚙  [ Merge All ]
y 2721  [ Back ]                [ Merge ]
```

**Daraus folgt die Semantik von „Merge 3 identical cards":** Es sind die **Karte selbst
plus 2 weitere Kopien**. Nicht drei Kopien *zusätzlich* zur Karte. Die Gleichung ist
`1 Basis + 2 Kopien → 1 aufgestufte Karte`, und die Ergebniskarte oberhalb des Pfeils
trägt dasselbe Level-Badge (`LvL 15`) wie die Basis — **das Level wird übernommen**, was
§4.4/§13.1 auf einer zweiten Karte bestätigt.

Die beiden Kopien standen hier auf `LvL 1`. Daraus folgt **nicht**, dass Kopien auf Level 1
stehen müssen — es ist einfach der Bestand dieses Accounts. **Eine Level-Anforderung an
die Kopien ist auf den Bildern nicht erkennbar.**

#### Kosten

Auf dem gesamten Merge-Screen (3310) und in der Zeremonie (3311) erscheint **kein
Goldbetrag** — nicht auf dem `Merge`-Button, nicht an der Kopien-Reihe, nirgends. Das
deckt sich mit §4.4 („Merge kostet kein Gold"). ⚠ **Methodisch ehrlich:** Diese beiden
Bilder zeigen keine Top-Bar mit Kontostand, ein Vorher/Nachher-Vergleich ist an ihnen
also **nicht** möglich. Die Aussage „kostenlos" ruht weiter auf der Kontostandsmessung aus
Video 7 (§13.1), hier kommt nur die **Abwesenheit einer Preisangabe** als schwächeres
Indiz hinzu.

#### Zeremonie — Aufbau auf einer zweiten Karte bestätigt

3311, alles *OCR* mit Konfidenz 92-96:

| y | Inhalt |
|---|---|
| 309 | **`PERFECT MERGE!`** |
| 1609 / 1697 | `MAX LEVEL` · **`20 ➜ 30`** |
| 1870 / 1959 | `BONUS HEALTH` · `23.26% ➜ 24.4%` |
| 2132 / 2220 | `BONUS DAMAGE` · `11.97% ➜ 13.22%` |
| 2719 | **`TAP TO CLOSE`** |

Identisches Layout wie in §4.4 (dort Catapult) — die Zeremonie ist also **eine
Schablone**, nicht pro Karte gestaltet. Für den Nachbau heißt das: ein Overlay mit drei
Vorher/Nachher-Zeilen genügt, egal welche Karte.

#### Der Merge-Bonus wächst — und kann DREI Stats betreffen

| Karte / Stufe | Ankündigungstext auf der Detailkarte | Beleg |
|---|---|---|
| Divine Sword, **Good** | „… to unlock: Bonus Health **+1 %** and Bonus Damage **+1 %**" | §4.2 (Video 11) |
| Divine Sword, **Rare** | „Merge 3 identical Divine Sword cards to unlock: Bonus Health **+2 %** and Bonus Damage **+2 %**" | **3318**, y 1623/1671, *OCR* Konf. 92-96 |
| Wolf Barracks, **Good** | „Merge 3 identical Wolf Barracks cards to unlock: Damage **+5 %**, Max Health **+5 %** and Attack Rate **−5 %**" | **3317**, y 1627/1671, *OCR* Konf. 91-96 |

Zwei Befunde:

1. **§13.1 bestätigt:** Der Bonus wächst pro Raritätsstufe (Divine Sword +1 % als Good →
   +2 % als Rare), und der Text beschreibt immer den **nächsten** Merge.
2. **NEU — ein Merge-Bonus kann DREI Stats anfassen.** §4.2 kannte nur das Muster
   „Bonus A **and** Bonus B". Wolf Barracks bringt **drei** Werte mit
   Aufzählungskomma: `Damage +5 %, Max Health +5 % and Attack Rate −5 %`. Der Nachbau
   darf die Bonusliste also **nicht** auf zwei Einträge hart verdrahten.
   (Nebenbei: Attack Rate erscheint wieder als **negativer** Prozentwert = schneller, §4.2.)

### 21.4 Sonstiges Aufschlussreiches

#### Der Level-Cap entfernt den Upgrade-Button vollständig

Direkter Vergleich derselben Bildzone (y 1840-2500) bei beiden Detailkarten, *visuell*:

```
3317  Good, LVL 20/20  (am Cap)          3318  Rare, LVL 20/30  (nicht am Cap)
      Upgrade Material                         Upgrade Material
      [Materialicon]  31/10                    [Materialicon]  0/10
      Card has reached the level cap
      [ Unequip ]                              [ Unequip ]  [ Upgrade 🪙25000 ]  [ Max Level ]
```

* §13.4 („drei Buttons statt zwei") ist damit **bestätigt** — 3318 zeigt exakt die dort
  notierte Dreierreihe `Unequip | Upgrade 🪙<Kosten> | Max Level`.
* **Neu:** Am Cap fallen `Upgrade` **und** `Max Level` weg und werden durch **einen
  Satz im Panel** ersetzt. AA sperrt den Button nicht grau, es **entfernt** ihn und
  erklärt stattdessen. Gute Vorlage für unseren Prototyp.

#### Neuer Gold-Datenpunkt — und ein Widerspruch zur Kurve aus §13.2

**Divine Sword · Rare · Lv 20 → 21 kostet `🪙 25 000`.** Gelesen *visuell* an einem
2× hochskalierten Ausschnitt (Bild 3318, Button bei y ≈ 2300-2410): die Ziffern stehen
groß und mit klarer Kontur, **`25000`** ist zweifelsfrei. Digit-Whitelist-OCR versagte an
dieser Schrift (Konfidenz 2) und wurde nicht verwendet.

Gegenprobe an §13.2 (Catapult, Rare): 16 → 17 = **15 000**, 17 → 18 = **18 000**. Eine
konstante Steigung von +3 000 pro Level würde für 20 → 21 **27 000** vorhersagen.
Gemessen sind **25 000**.

| Level-Up | Gold | Quelle | Methode |
|---|---|---|---|
| Rare 16 → 17 | 15 000 | §13.2 | Kontostandsdifferenz (stark) |
| Rare 17 → 18 | 18 000 | §13.2 | Button-OCR |
| **Rare 20 → 21** | **25 000** | **3318** | **Button, visuell (klar lesbar)** |

⚠ **Bewertung, ohne die Zahl zu überdehnen:** Die 25 000 sind eine Button-Ablesung, also
methodisch schwächer als eine Kontostandsdifferenz — genau die Schwäche, an der der
verworfene Wert „8000 Gold" (§13.2) gescheitert ist. Anders als damals war die Zahl hier
aber **groß, kontrastreich und eindeutig**, nicht erschlossen. Wenn sie stimmt, ist die
Kurve **oberhalb ~Lv18 flacher als +3 000/Level** (von 18 000 auf 25 000 sind es
≈ +2 333 je Level über drei Stufen). **Empfehlung: als offene Frage führen und bei der
nächsten Aufnahme über Kontostandsdifferenz prüfen, nicht sofort in `GOLD_BANDS`
einrechnen.**

#### Materialbedarf hängt offenbar am LEVEL, nicht an der Rarität

| Karte | Stufe | Level | Bedarf | Bestand | Beleg |
|---|---|---|---|---|---|
| Wolf Barracks | **Good** | 20 | **10** | 31 | 3317, `31/10`, *visuell* (3× Crop, unmissverständlich) |
| Divine Sword | **Rare** | 20 | **10** | 0 | 3318, `0/10`, *visuell* |

Beide Karten stehen auf **Level 20** und brauchen **beide 10** — obwohl sie
**unterschiedliche Raritäten** haben. Zusammen mit den älteren Ankern (§13.2: Common Lv 1
→ 1, Good Lv 15 → 5, Rare Lv 16 → 5) sieht die Reihe so aus:

```
Lv 1 → 1     Lv 15 → 5     Lv 16 → 5     Lv 20 → 10
```

Das ist eine **reine Level-Funktion**; die Rarität taucht darin nicht auf. ⚠ Damit ist
die in §13.6 notierte Formel `1 + tierIdx + floor(lvl/10)` **unvereinbar** — sie ergäbe
für Good/Lv 20 den Wert **4**, gemessen sind **10**. Einschränkung: Es gibt mindestens
acht Materialsorten (§7.1/§12.3), und ob alle dieselbe Bedarfskurve haben, ist ungeprüft;
Skyflares `40/3` (§5) passt in kein Level-Schema, das Level dazu ist aber unbekannt.
**Nicht angefasst** — dies ist eine Dokumentationsnotiz, keine Codeänderung.

#### Zwei vollständig gelesene Turm-Detailkarten

**WOLF BARRACKS · GOOD · LVL 20/20** (3317). Statwerte *visuell* aus einem 780-px-Crop,
alle Ziffern scharf:

```
Targets: Ground
„Spawns angry wolves that leap into melee combat.
 They don't wait for the full moons to start biting."      (OCR Konf. 92-96)
LVL: 20/20        Power: 2441
Damage 214.9      Max Health 473.3
Attack Rate 1.31 sec   Grid Range 5
Unit Count 3
```

`Unit Count` ist ein Stat, den §2 nicht führt — Barracks-Türme haben in AA also eine
**fünfte** Statzeile für die Zahl der gespawnten Einheiten.

**DIVINE SWORD · RARE · LVL 20/30** (3318). Labels *OCR* (Konf. 93-96), Zahlen der
Einzelstats **nicht** lesbar (Zierschrift, zu wenig Crop-Budget):

```
Targets: Air & Ground
„Empowers surrounding towers with silent support.
 Does nothing loudly, but everything effectively."
LVL: 20/30        Power: 3041
Bonus Health · Bonus Damage · Bonus Push Strength · Bonus Crit Chance · Grids Covered
```

Divine Sword ist damit klar als **reiner Aura-/Supportturm** ausgewiesen: **fünf** Stats,
alle als „Bonus …" plus `Grids Covered` — kein eigener Schaden, keine Reichweite. Das
erklärt rückblickend, warum sein Merge-Bonus mit +1 %/+2 % so viel kleiner ausfällt als
der eines Schadensturms (§4.2). Aus der Vorschau in 3310 lassen sich zwei Werte der
Rare-Stufe rekonstruieren: **Bonus Health 24,4 %**, **Bonus Damage 13,22 %**.

#### Clan: Kartenkopien heißen „blueprints", Anfragegröße 30

3309 (*OCR*, Konf. 72-96): `Requesting Hawk Nest blueprints!` · `Requesting Archer
blueprints!` · Zähler **`10/30`**, **`10/30`**, **`0/30`** · Buttons `DONATE` ·
`Time left to collect:` · `7h 59m` · `Members online: 1`.

Zwei Punkte für unser Clan-System (§20.5): AA nennt die spendbaren Kartenkopien
**„blueprints"** (nicht „cards"), und eine Anfrage läuft gegen ein Ziel von **30**
Einheiten mit einer **Sammelfrist** (hier ~8 h Restlaufzeit). Unsere Anfragezeilen sollten
also eine Zielzahl **und** eine Restzeit tragen.

#### Quests koppeln direkt an die Kartenwirtschaft

* 3300 (DAILY): `Upgrade your cards in the Challenge 25 time(s)` — Fortschritt **`7/25`**;
  `Upgrade card 1/5 time(s)`; `Request donations in the clan/5 time(s)` — **`2/5`**.
* 3301 (LIFETIME): `Unlock 15 towers`; `Reach fortress level 15`; `Reach Player Level`;
  ein Gem-Meilenstein **`2087/2500`**.

Karten-Upgrades sind in AA also **Questwährung** — ein Grund mehr, das Upgrade billig und
oft zu machen, statt es zu einer seltenen Großentscheidung zu erheben.

### 21.5 Was auf diesen Bildern NICHT zu sehen war

1. ❌ **Keine Epic- und keine Legendary-Karte** — auf keinem der 14 Bilder. Damit bleiben
   **Caps 40/50 ungemessen** und die **Rahmenfarben ungesampelt** (§13.7 Punkt 3 bleibt
   offen).
2. ❌ **Keine Common-Karte** — Common = 10 aus §13.3 konnte hier nicht gegengeprüft werden.
3. 🟡 **Die Zeile `REQUIRED CARDS` fehlt auf 3310.** Die Bedingung erscheint nur als
   grafische Gleichung (§21.3). Die in §13.7 Punkt 4 als unklar markierte Zeile
   `x1 GOOD CATAPULT` taucht **nicht** auf — ihre Semantik bleibt **ungeklärt**.
4. 🟡 **Level-Anforderung an die Kopien:** unbekannt. Beide Kopien standen auf `LvL 1`,
   was weder eine Anforderung belegt noch ausschließt.
5. 🟡 **Kopienzahl höherer Stufen:** Nur der Fall Good → Rare ist sichtbar (1 + 2). Ob
   Rare → Epic ebenfalls zwei Kopien kostet, ist **nicht** belegt.
6. ❌ **Merge von Skills/Items** — weiterhin nur der Turm-Fall (§13.7 Punkt 2 bleibt offen).
7. ❌ **`Merge All` und `Max Level` in Aktion** — beide Buttons sind belegt, ihre Wirkung
   in keinem Bild ausgeführt (§13.7 Punkt 5 bleibt offen).
8. 🟡 **Merge-Kosten per Kontostand:** Weder 3310 noch 3311 zeigt eine Top-Bar. Der Beweis
   „kostet kein Gold" ruht unverändert allein auf §13.1.
9. 🟡 **Einzelstatwerte von Divine Sword** (Bonus Push Strength, Bonus Crit Chance, Grids
   Covered) — Labels gelesen, Zahlen nicht.
10. ❌ **Gold-Kurve unterhalb Lv 20 und oberhalb Lv 21** — der neue Punkt 25 000 steht
    isoliert; ob die Kurve dort wirklich abflacht, braucht eine zweite Messung (§21.4).

---

## 22. Screenrecording „Battledeck" vom 29.07.2026 — Zwischenstand der Auswertung

**Quelle:** `ScreenRecording_07-29-2026 15-04-54_1.MP4` (Drive-ID
`16eVFRY4SHeliqPR7ZvpZKZW6c1mLlBUI`), **400 437 172 Bytes**, **187,4 s**,
1320 × 2868, 60 fps, HEVC.

### 22.0 Wie das Video ausgewertet wird — und warum das hier steht

Die Datei ist zu groß, um sie örtlich zu holen: der Ausgangs-Proxy sperrt
`drive.usercontent.google.com`, `cloudfront` und jeden Datei-Zwischenwirt;
erreichbar ist von hier aus **nur GitHub**. Die Auswertung läuft deshalb in
der Sandbox (dort ist Drive erreichbar), und jedes Einzelbild muss als
Base64 durch das Werkzeugprotokoll zurück. Das Protokoll schneidet bei
~20 000 Zeichen ab, ein Bild darf also **≤ ~14 KB** groß sein.

Daraus die Arbeitsweise, die sich bewährt hat:

1. **Kontaktbogen zuerst.** 94 Einzelbilder (alle 2 s), 46 × 100 px,
   Graustufen, WebP q8 → 25 KB, in zwei Stücken übertragen. Der Bogen ist
   zu klein zum Lesen, aber groß genug, um zu erkennen **welcher Bildschirm
   wann** zu sehen ist. Ohne ihn zieht man teure Einzelbilder aufs Geratewohl
   — die ersten drei Vollbilder lagen daneben, weil ich das Deck am Anfang
   vermutet hatte und es tatsächlich in der zweiten Hälfte liegt.
2. **Dann gezielt Einzelbilder** an den interessanten Zeitpunkten, 496 px
   breit, Graustufen, autokontrastiert, Qualität so weit herunter, bis die
   Datei unter 14 KB liegt. In dieser Größe ist **jede Beschriftung lesbar** —
   nachgeprüft an „Daily Kill Limit: 4934" und „Merge normal Good tower cards".
3. **Prüfsumme über jede Übertragung.** `md5sum` in der Sandbox gegen
   `md5sum` nach dem Dekodieren. Eine frühere Übertragung in diesem Projekt
   ist still verstümmelt angekommen und hat ein Drittel eines Screenshots
   unbrauchbar gemacht, ohne dass etwas gemeldet hätte.

> **Die Sandbox stirbt ~10 s nach jedem Aufruf.** Das Video ist danach weg
> und muss neu geholt werden (~40 s). Alles, was zusammengehört, gehört in
> **einen** Aufruf — oder in einen Hintergrundprozess, der alle < 60 s
> angestoßen wird.

### 22.1 Was das Video zeigt (Ablauf über 187 s)

| Zeit | Bildschirm |
|---|---|
| 0 – ~46 s | **HERO PASS** — Heldenporträt, „Switch ⟳ Hero", Belohnungsleiter |
| ~48 – ~70 s | Listenansichten, Übergang |
| ~72 – ~94 s | Karten-/Turmdetail-Fenster (großes Mittelpanel mit Porträt) |
| ~96 – ~142 s | **Collection** — Kartenraster + **RESOURCES**-Raster, Detailfenster |
| ~144 – ~166 s | Zweispaltige Ansicht (Vergleich/Deck) |
| ~168 – 187 s | Weitere Raster + Fenster |

Das Deck liegt also **nicht** am Anfang. Wer nur die ersten Sekunden
anschaut, sieht den Hero Pass und hält ihn für das Deck.

### 22.2 HERO PASS (t ≈ 20 s) — gemessen

Von oben nach unten:

* **Chip oben links:** Heldensymbol + „x10", darunter „**Purchase Rewards**".
* **Held groß in der Bühnenfläche**, darunter mittig „**Switch ⟳ Hero**"
  (Text – Icon – Text, das Icon ist ein Kreispfeil).
* **Bandüberschrift „HERO PASS"** mit einem **ⓘ** rechts daneben.
* **Zähler-Leiste:** links ein Totenkopf, Text „**Daily Kill Limit: 4934**",
  darunter ein Fortschrittsbalken „**2989/3000**", rechts in einer runden
  Marke „**10**".
* **Belohnungsleiter**, senkrecht scrollend: links eine **sechseckige
  Stufenmarke** (4, 5, 6, 7 …), rechts daneben die Belohnungskachel mit
  Artwork und Menge (`x500`, `x5`, `x6`), **über** jeder abholbaren Kachel
  ein eigener Knopf „**Claim**". Die Stufen sind durch eine senkrechte
  Linie verbunden.
* **Fußzeile:** „**Ends in: 4d 11h**" mit Uhr-Symbol.
* **Ganz unten:** links „**Back**", mittig ein breiter Preisknopf „**Fr.18**".

Bemerkenswert für uns: **der Claim-Knopf sitzt ÜBER der Kachel**, nicht
darin und nicht daneben. Und die Restlaufzeit steht **unter** der Leiter,
direkt über den Knöpfen — nicht im Kopf.

### 22.3 Collection + RESOURCES + Gegenstands-Fenster (t ≈ 122 s) — gemessen

Der Bildschirm hinter dem Fenster:

* Oben die Währungsleiste (u. a. **526** und **9787**).
* **Kartenraster**, 5 Spalten, jede Kachel mit Band „**LVL 1**" unten.
* Sektionsüberschrift „**RESOURCES**".
* **Material-Raster, 4 Spalten**, jede Kachel eine **Turm-Miniatur** mit
  Menge: **x78 · x68 · x66 · x64** / **x61 · x58 · x49 · x43**.
* Untere Navigationsleiste, aktiver Reiter „**Collection**".

> Das ist die dritte, unabhängige Bestätigung, dass **Material und Turm in
> AA 1:1 zusammengehören** (nach IMG_3427-3430 und dem Catapult-Beleg
> „78/15" ↔ „x78"). Unsere Umstellung auf **eine Essenz je Karte**
> (DESIGN_PROGRESSION.md §B, State v4) steht damit auf drei Beinen.

**Das Gegenstands-Fenster** (Overlay, mittig, verdeckt das Raster):

* **Bandüberschrift** mit dem Namen — hier „**JOKER GOOD TOWER**" — die
  Bandenden ragen links und rechts über den Rahmen hinaus.
* **X-Knopf** in einer runden Marke, rechts **außerhalb** der oberen
  Rahmenkante (überlappend, nicht innen).
* **Linke Spalte:** großes Artwork in einer eingesenkten Fläche, unten
  rechts die Menge „**x1**".
* **Rechte Spalte:** Kasten „**GET FROM**" mit Aufzählung
  (• Arena Chests • Arena Rewards • Special Event) und **eigener
  Bildlaufleiste** — die Liste kann länger sein als der Kasten.
* **Darunter über die volle Breite:** Kasten „**USED TO**" mit
  „• Merge normal Good tower cards".

**Zwei Bauteile, die wir noch nicht haben:**

1. **Das GET FROM / USED TO-Fenster.** AA erklärt jeden Gegenstand an Ort
   und Stelle: *woher* bekomme ich ihn und *wofür* ist er. Das ist genau
   die Auskunft, die bei uns heute fehlt — unser Kartendetail sagt, was
   eine Karte kann, aber nicht, woher ihre Essenz kommt. (Der Untertext im
   Kartendetail, den ich heute eingebaut habe, ist die kleine Fassung
   davon; die große gehört als eigenes Fenster nachgezogen.)
2. **Die JOKER-Karte.** Ein Platzhalter, der sich mit **jeder** normalen
   Karte derselben Stufe verschmelzen lässt („Merge normal Good tower
   cards"). Damit entschärft AA genau den Frust, den unsere Pyramide
   erzeugt: 243 Kopien DERSELBEN Karte für Suprem. Ein Joker je Stufe wäre
   bei uns eine naheliegende Ergänzung — **noch nicht entschieden**, das
   gehört dem Auftraggeber vorgelegt.

### 22.4 Was noch fehlt

Der eigentliche **Deck-Bildschirm** (t ≈ 144 – 166 s, die zweispaltige
Ansicht) und die Fenster der zweiten Hälfte sind **noch nicht in lesbarer
Auflösung ausgewertet**. Die Zeitmarken stehen fest, der Weg ist
eingespielt; es fehlt nur die Übertragung. Bis dahin ist zum Deck-Aufbau
**nichts belegt** — und deshalb steht hier auch nichts dazu.

---

## 23. Pack-Öffnung: unsere Fassung gegen das Referenzvideo (29.07.2026)

**Anlass.** Rückmeldung des Auftraggebers: *„das Referenz Video hat paar
mehr Farben die aus dem boosterpack strömen und ist langsamer als unsere,
unsere braucht dort definitiv einen Feinschliff."* Beides ließ sich
nachmessen, und beides stimmte.

### 23.1 Wie gemessen wurde

Dieselbe Metrik auf beiden Seiten, sonst vergleicht man nichts:
Bild auf 108 × 234 verkleinern, je Pixel `colorsys.rgb_to_hls`, alle
Pixel mit `s > 0,35` **und** `l > 0,25` in **12 Farbtöpfe** einsortieren.
Ein Topf zählt als **Farbkanal**, sobald er über 0,4 % der Bildfläche
hält. Dazu die mittlere Helligkeit über das ganze Bild.

Unsere Seite wird **angehalten** aufgenommen, nicht in Echtzeit
abgeknipst: alle Ebenen bekommen `animation-play-state:paused` und ein
negatives `animation-delay`. Damit sitzt jedes Bild exakt auf seiner
Millisekunde und die Messung ist wiederholbar — in Echtzeit trifft man
den Höhepunkt nur zufällig.

⚠ **Die Karten brauchen im Messstand einen Platzhalter.** `.pkcard` trägt
im Betrieb nur das Kartenbild vom CDN; örtlich ist das CDN gesperrt
(DESIGNSYSTEM §7b), die Karten sind dann unsichtbar. Wer so ein Bild
beurteilt, beurteilt eine Szene ohne ihren Gegenstand — genau das ist mir
zwischendurch passiert und hat zu einer falschen Korrektur geführt.

### 23.2 Der Vergleich

| | Referenz | wir, vorher | wir, jetzt |
|---|---|---|---|
| Farben setzen ein | 1,60 s | 1,80 s | 1,70 s |
| Höhepunkt | 2,20 – 2,40 s | 1,80 s (**ein** Einzelbild) | 2,20 – 2,40 s |
| Farbkanäle im Höhepunkt | 4 | 2 | **5** |
| bunte Fläche | 15 % | 18 %, nur ein Bild | 8,4 % |
| mittlere Helligkeit | 41 | **76** (weiß ausgebrannt) | 48,9 |
| zurück auf Ruhe | 4,00 s | 2,10 s | 3,90 s |
| Dauer der Ausströmung | 2,40 s | 0,30 s | 1,70 s |

**Was geändert wurde:** Gesamtdauer 3000 → 4000 ms; eine eigene
Farbebene `.pkfarben` (zwei gegenläufig gedrehte Kegelverläufe mit je
sechs Elementtönen, weiche Kanten, `blur`, nach außen ausdünnende Maske);
Weißblitz, Kernglut und Schein gedämpft.

**Wo wir noch abweichen:** die bunte Fläche liegt bei 8,4 % statt 15 %.
Der Rest steckt vermutlich in der Vorlage selbst — deren Spielfläche ist
schon im Ruhezustand bunter als unsere (unser Ruhewert liegt bei 13,2
Helligkeit). Weiter aufdrehen ging auf Kosten des Bildes: bei mehr
Deckkraft und größerem Radius wurde aus dem Strahlen ein **Windrad**, das
am Ende den ganzen Schirm füllte. Die Zahl allein hätte das durchgewinkt.

### 23.3 Zwei Fehler, die nur der Blick gefunden hat

1. **Die Grundregel `.pkcard{position:absolute;…}` war verschwunden.**
   Ein Ersetzungslauf beim Umbau auf 4000 ms hatte sie mitgenommen;
   übrig blieb nur die Animationszeile. Fünf Divs ohne Position, ohne
   Größe und ohne Fläche fliegen dann unsichtbar durchs Bild — **die
   Öffnung zeigte keine einzige Karte**, und alle bestehenden Schritte
   der Prüfung blieben grün, weil sie die Klasse zählen, nicht das Bild.
   Gefunden habe ich es erst, als ich die Einzelbilder **angesehen** habe.
   Die Prüfung legt jetzt eine `.pkcard` an und misst nach, ob sie
   überhaupt eine Fläche hat.
2. **Der Schein fiel mitten in der Hauptladung zurück** (47,5 % lag unter
   40 %) — ein vierter Rückfall, wo nur drei hingehören. Entstanden beim
   Dämpfen, weil ich einen Stop einzeln gesenkt und nicht gegen seinen
   Nachbarn geprüft habe. **Das hat umgekehrt die Prüfung gefunden und
   das Auge nicht.** Beide Wege werden gebraucht.

### 23.4 Offen: haben die Pack-Bilder einen Alphakanal?

Im Messbild liegt hinter dem Pack ein **schwarzer Kasten**. Die
archivierte Fassung (`assets/pack_gold.webp`) hat nachweislich keinen
Alphakanal — Ecken `(0,0,0)`, Modus `RGB`. Das Archiv holt die
`_min.webp`-Fassung vom CDN, und die ist flachgerechnet; ob das **PNG**,
das der Prototyp lädt, Alpha trägt, **ist von hier aus nicht prüfbar**
(CONNECT auf `*.cloudfront.net` ist gesperrt, siehe
`assets/NICHT_ERREICHBAR.json`). Falls nicht, zeigt auch die Live-Fassung
den Kasten und die Bilder müssen durch `remove_background`. **Zu prüfen,
sobald die Live-Vorschau wieder erreichbar ist** — vorher ist jede
Änderung daran geraten.

---

## 24. BATTLE DECK — ausgemessen (30.07.2026)

**Quelle:** `ScreenRecording_07-29-2026 15-04-54_1.MP4`, **t = 100 s**.
Rahmen auf 430 px Breite skaliert (unsere Bühnenbreite), Werte daraus als
Prozent der Bühnenbreite. Die Zeitmarke in §22.4 („t ≈ 144–166 s") war
**falsch** — dort laufen Merge-Zeremonien. Der Deck-Bildschirm liegt bei
**≈ 92–104 s**.

### 24.1 Der Aufbau

```
┌──────────────────────────────────────────┐
│        ~~~ BATTLE DECK ~~~          (i)  │  Band, volle Breite
├──────────────────────────────────────────┤
│ ┌──────────┐  ┌────┐ ┌────┐ ┌────┐       │
│ │          │◆ │ T1 │ │ T2 │ │ T3 │       │  ◆ = Skill-Marke
│ │  HELD    │  └────┘ └────┘ └────┘       │      in der Ecke
│ │          │  ┌────┐ ┌────┐ ┌────┐       │
│ │  LvL 25  │  │ T4 │ │ T5 │ │ T6 │       │
│ └──────────┘  └────┘ └────┘ └────┘       │
│  ⬡    ⬡        [1][2][3🔒][4🔒] [≡]      │  ⬡ = Spell-Plätze
├──────────────────────────────────────────┤
│   Towers  │  Skills  │  Items            │  Reiter
└──────────────────────────────────────────┘
```

### 24.2 Die Maße

| Element | Wert | in % der Bühne |
|---|---|---|
| Bühne | 430 × 934 | — |
| Band „BATTLE DECK" | y 122–160 | Höhe 4,1 % der Höhe |
| **Heldenrahmen** | x 18–172, y 182–370 | **35,8 % breit**, Verhältnis B:H = 1 : 1,22 |
| **Turmkarte** | 74 × 94 | **17,2 % breit**, Verhältnis B:H = 1 : 1,27 |
| Spalten-Lücke | 6 px | 1,4 % |
| Turmraster | 3 Spalten × 2 Reihen, x 182–416 | **6 Karten — belegt, nicht geraten** |
| **Spell-Sechseck** | ~54 × 54, x 28–82 und 92–146 | **12,6 % breit**, zwei Stück |
| Deck-Wahl | 4 Knöpfe + Listen-Knopf, y 402–428 | Deck 3 und 4 mit Schloss |
| Reiterleiste | y 445–478 | drei Reiter |

### 24.3 Was daraus folgt

* **Sechs Turmkarten je Deck** — im Bild abgelesen (LvL 20/27/15 · 20/11/17),
  und vom Auftraggeber bestätigt: *„es müssen 6 Turm Karten pro Deck sein"*.
* **Die zwei Spell-Sechsecke sitzen UNTER dem Helden**, nebeneinander, auf
  Höhe der Deck-Wahl. Nicht links und rechts der Ult, sondern als Paar
  unterhalb des Heldenrahmens — die Ult-Marke sitzt oben in der Ecke des
  Rahmens.
* **Vier Deck-Plätze**, zwei davon gesperrt. Ein Fach für später; wir
  bauen die Umschaltung mit, sperren 3 und 4 wie im Vorbild.
* Der Held ist **nicht** eine von sieben gleichen Kacheln, sondern eine
  eigene, größere Fläche links. Höhe = beide Turmreihen zusammen.

### 24.4 Noch nicht abgelesen

Was in den **Sechsecken** genau steht (im Video „11" und „12" — Zahlen,
keine Namen), und ob die Zahl eine Stufe, eine Menge oder eine Aufladung
ist. Das braucht einen Bildausschnitt in höherer Auflösung.


---

## 25. Spell-Detail und Spell-Fusion (AA-Bildschirme, 30.07.2026)

**Quelle:** `IMG_3433` (INFERNO RAIN), `IMG_3434` (METEOR STRIKE),
`IMG_3435` (Fusion BLIZZARD WING), je 1320 × 2868.

### 25.1 Das Spell-Detail

| Element | Beleg |
|---|---|
| Kartenform | **Sechseck** mit Element-Marke oben links, auf lila Karte |
| Stufenband | `LVL: 12/40` grün, mit Aufwärtspfeil — **die Zahl im Sechseck ist das Level** |
| Kraft | `Power: 3532` bzw. `3404` — **AA zeigt für Spells eine echte Kraftzahl** |
| Ziel | „Ground" bzw. „Air & Ground" |
| Werte | Damage 806.5 **+43.1** · Radius 1 · Cooldown 51 — der grüne Zuschlag ist der Gewinn des nächsten Level-Ups |
| Fusions-Hinweis | „**Merge 2 identical** Meteor Strike cards to unlock: Damage +17 %" |
| **Upgrade-Material** | Werkzeugtipp „**Greenprint · Upgrades skills**", Bestand `87/4` — **das Bild ist das Kartenbild selbst, grün eingefärbt** |
| Knöpfe | Unequip · **Upgrade 🪙10 000** · Max Level |

### 25.2 Die Fusion — und wie „Merge 2" zu lesen ist

`IMG_3435` löst den Widerspruch. Der Bildschirm zeigt:

```
   [Ergebnis LvL 1]
        ↑
   [Karte] + [Karte] [Karte]
              REQUIRED CARDS
             X2 GOOD BLIZZARD WING
```

Eine Karte **plus zwei erforderliche** — also **drei insgesamt**. Das
„Merge 2 identical" im Detail meint **zwei weitere**, nicht zwei
insgesamt. `MERGE_COST = 3` bleibt damit richtig, und die Ansage
*„Braucht auch 3"* ist am Bild belegt.

Weiter abgelesen:

* Die Fusion hebt **MAX LEVEL 20 → 30** — bei AA also **+10 je Stufe**.
  Wir arbeiten mit **+15** auf einer 100er-Spanne (25/40/55/70/85/100),
  das ist die bekannte, bewusste Skalierung.
* Die Fusion **verbessert auch die Werte direkt**: Damage 84 → 92.8,
  Cooldown 57 → **54** (kleiner = besser).
* Die Schmiede hat **„By Level"-Sortierung** und **„Merge All"** — beides
  haben wir.
* Links oben im Raster liegen **zwei Joker-Karten** mit `x1` — dieselbe
  Bauart, die wir am 29.07. eingebaut haben.

### 25.3 Was daraus gebaut wurde

Jeder Spell hat seit dem 30.07.2026 **seine eigene Essenz**, deren Bild
das Kartenbild ist — genau AAs Greenprint-Muster und genau das, was bei
unseren Türmen schon galt. Siehe DESIGN_SPELLS.md, Kasten „REVIDIERT".

---

## 26. Offline-Erträge — Dialog (30.07.2026)

> **Vorlage:** drei Screenshots des Auftraggebers (Hub mit Pfeil auf den Einstieg,
> geöffneter Ertrags-Dialog, geöffneter „Quick Earnings"-Dialog).
> **Mechanik und Zahlen:** `GAMEPLAY_OPTIMIERUNG.md` §10. Hier steht nur das Layout.

### 26.1 Der Einstieg

AA hängt den Knopf in die **rechte Hub-Schiene**. Bei uns war genau dieser Platz leer —
die Schiene existierte, trug aber kein Element. Der Knopf ist dort eingezogen, mit einer
Zählmarke, sobald etwas abzuholen ist.

| | AA | unser Prototyp |
|---|---|---|
| Position | rechte Hub-Schiene | dieselbe |
| Marke | rote Zahl oben rechts | rote Marke, **nur bei Guthaben** |
| Öffnet sich von selbst | **ja**, Popup nach dem Login-Kalender | **nein**, nur per Tap |

Die letzte Zeile ist die einzige bewusste Abweichung im Ablauf — Begründung: der
Popup-Stapel-Einwand aus §10.2/§10.3.

### 26.2 Der Dialog, von oben nach unten

| Element | Maß | Anmerkung |
|---|---|---|
| Video-Kopf | **16:9**, volle Dialogbreite, Radius nur oben | in AA ein Turm, der Steine rollt |
| Titelband | überlappt den Videofuß um die **halbe Bandhöhe** | `margin-top:-22px`, `z-index:2` |
| Deckel-Band | eine Zeile, grün, „MAX 8 H" | AAs Platzierung direkt unter dem Titel |
| Ratenzeile | **2 Spalten**, Gold links, XP rechts | je Icon + Wert, `…/h` |
| Belohnungsraster | **4 Spalten**, quadratische Kacheln, Menge unten rechts | Gold · Karten · Material · XP |
| Ehrlicher Satz | eine Zeile, mittig, klein | nennt **beide** Stundenzahlen, siehe unten |
| Knopfpaar | **2 Spalten**, „Schnell-Ertrag" (gold) \| „Abholen" (grün) | AA hat dieselbe Aufteilung |

**Der Satz unter dem Raster ist keine Zierde.** Er nennt die Abwesenheit **und** die
angerechnete Zeit getrennt: *„Du warst 20 h weg, angerechnet wurden 8 h."* Ein Dialog, der
nur „20 h" sagt, verspricht mehr als er zahlt; einer, der nur „8 h" sagt, verschweigt den
Verlust. `pruefungen/offline.js` prüft beide Zahlen einzeln.

### 26.3 Der Schnell-Ertrag

Zweiter, kleinerer Dialog **über** dem ersten. Zwei Wege nebeneinander, jeder mit eigenem
Tageszähler („Übrig: 3"). Der Gratis-Weg braucht ein Werbevideo und ist im Prototyp **offen
als nicht angebunden ausgewiesen**, statt als toter Knopf dazustehen.

> **Fehler beim Bau, hier festgehalten:** solange beide Ebenen offen waren, standen **zwei ✕**
> übereinander. Behoben über `#qkLayer{z-index:290}` und `#offLayer.zu .itemclose{visibility:hidden}`.
> Die Prüfung zählt jetzt die *sichtbaren* ✕ und besteht auf genau einem.

### 26.4 Die drei neuen Assets

| Schlüssel | Art | Inhalt |
|---|---|---|
| `ic_offline` | Icon | Sanduhr, in der statt Sand Goldmünzen rieseln |
| `off_banner` | 16:9 Bild | Bahn-Diorama, Steinturm schleudert einen Felsbrocken — zugleich **Poster** des Videos |
| `off_loop` | **Video, 5 s** | dasselbe Motiv in Bewegung, erzeugt mit **Kling 3.0 Turbo** aus `off_banner` als Startbild |

`off_loop` beantwortet die Frage des Auftraggebers *„Ist es möglich mit Kling Videos zu
erstellen und diese dann dort einzufügen?"* mit **ja** — Bild erzeugen, Bild als `start_image`
an Kling geben, Ergebnis als `<video muted loop>` mit dem Startbild als `poster` einhängen.
Der Poster ist Pflicht: örtlich ist das CDN nicht erreichbar (DESIGNSYSTEM §7b), und auf dem
Gerät deckt er die Ladezeit ab.

---

## 27. SHOP — vollständig abgelesen (30.07.2026) — GEBAUT

> **Quelle:** acht Screenshots des Auftraggebers (IMG_3449–3456), Account **1 200 🏆 / 546 💎 /
> 39 387 🪙**, also **Arena 5**. Auflösung 1320×2868, alle Zahlen direkt lesbar.
> Damit ist §8 (aus Videostandbildern geschätzt) **überholt** — siehe die Korrekturbox unten.
>
> **Auftrag dazu wörtlich:** *„Bau die Anordnung des Shops genau nach wie es in AA ist wir haben
> alles muss nur neu positioniert werden. Dort wo das endless Roulette ist muss unser Kristall
> Tresor hin."*

### 27.1 Abschnittsfolge — verbindlich

Jeder Abschnitt trägt ein **Band** (blaues Ribbon mit gekerbten Enden) als Überschrift.

| # | Band | Inhalt | Raster |
|---|---|---|---|
| 1 | **ARENA PACK** | Karussell, Echtgeld, Punktreihe darunter | 1 Karte |
| 2 | **DAILY DEALS** | Timerzeile + ⓘ + „Refresh"; darunter Angebote | **3 Spalten** |
| 3 | **ARCANE SUPPLIES CHEST** | breite goldene Karte mit Pity-Zeilen | 1 Karte |
| 4 | **CHEST** | Explorer (blau) + Mystic (pink) | **2 Spalten** |
| 5 | **ENDLESS ROULETTE** | Preisband + zwei Knöpfe | 1 Karte |
| 6 | **GEMS** | sechs Staffeln | **3 × 2** |
| 7 | **GOLD** | drei Staffeln | **3 × 1** |

**Was AA an dieser Stelle NICHT hat** — beides fliegt bei uns raus:

- **kein Season-Pass-/Battlepass-Banner.** *„Der battledpass der im Shop oben ist kann entfernt
  werden den brauchen wir an dieser Stelle nicht weil wir ihn schon auf der Battle
  ansicht (hauptbildschirm) oben verkaufen."*
- **kein Werbe-Entfernen-Banner.** *„Den Banner Shop braucht es im Shop nicht der ist in AA auch
  nicht drin."* (§8.1 Pos. 1 führte es noch — in diesen Aufnahmen ist es weg.)

**Position 5 ist bei uns der Kristalltresor.** Die Rollenzuordnung aus §19-Annahme 2
(Tresor = AAs Roulette-Platz) war richtig gedacht, stand aber an der falschen Stelle im Ablauf.

### 27.2 Preise — alle abgelesen, nichts geschätzt

**GEMS** — orange Kacheln, Name (2 Zeilen) · Trennlinie · Menge · Artwork · Preis:

| Kachel | Gems | Preis | ct je Gem |
|---|---|---|---|
| Some Gems | 80 | **Fr. 2** | 2,50 |
| Pile of Gems | 500 | **Fr. 4** | 0,80 |
| Heap of Gems | 1 200 | **Fr. 9** | 0,75 |
| Bag of Gems | 2 500 | **Fr. 18** | 0,72 |
| Trophy of Gems | 6 500 | **Fr. 40** | 0,62 |
| Safe of Gems | 14 000 | **Fr. 90** | 0,64 |

Die Kurve fällt monoton — **außer beim letzten Sprung** (0,62 → 0,64). Die teuerste Staffel ist
also pro Gem minimal *schlechter* als die zweitteuerste. Das ist kein Ablesefehler, beide Werte
stehen groß da; es ist AAs bewusster Anker: „Trophy" wirkt als bester Wert, „Safe" verkauft die
Menge. Wer die Zahlen später glättet, macht AAs Trick kaputt.

**GOLD** — grüne Kacheln. Bezahlt wird mit **Gems**, nicht mit Echtgeld:

| Kachel | Gold | Preis |
|---|---|---|
| Pile of Gold | 12 000 | **▶ FREE** (Werbevideo, roter Merker) |
| Bag of Gold | 36 000 | **💎 90** |
| Trophy of Gold | 144 000 | **💎 288** |

Mengen exakt ×3 je Stufe. Gold je Gem: 400 → 500 — die größere Staffel lohnt sich.

> Unser Gold-Tausch lief schon über Gems (§19-Annahme 7) — diese Aufnahmen **bestätigen**, dass
> das kein Abweichen von AA war, sondern AAs eigener Aufbau. Die Annahme kann gestrichen werden.

**TRUHEN UND KISTEN:**

| Ware | Preis |
|---|---|
| Arcane Supplies Chest **OPEN x1** | 💎 300 |
| Arcane Supplies Chest **OPEN x10** | 💎 2 680 (10,7 % Rabatt) |
| Explorer Chest | ▶ Werbung (4 offen) **oder** 💎 80 |
| Mystic Chest | gratis in 1 d 4 h, sonst 🔑 0/1 |
| Endless Roulette | ▶ Werbung **oder** 💎 75 |

**Pity, jetzt eindeutig lesbar:** „Get **Epic** in **10** opens" · „Get **Legendary** in **50**
opens". Die 50 waren in §8.2 als *unsicher* markiert — sie sind **bestätigt**. Mystic Chest hat
eine eigene Zeile: „Get Epic in **4** opens".

**TAGESANGEBOTE** (Arena 5):

| Ware | Menge | Preis |
|---|---|---|
| Gems (Timer 4 h 25 m) | ×30 | **▶ Free**, „Available: 5" |
| Inferno Rain Greenprint | ×20 | 🪙 **40 000** |
| Ice Wall Greenprint | ×20 | 🪙 **40 000** |
| Frostfall (Ecke „70 % OFF") | ×1 | 💎 **30** |
| Cannon | ×1 | 💎 **300** |
| Thunder | ×1 | 💎 **100** |

Sechs Posten in **zwei Reihen zu drei**. Der Gratisposten steht **vorne links** und ist als
einziger farbig (violett) — alle Kaufposten sind grau. Ein Rabattposten trägt ein diagonales
Eckband. Türme kosten **Gems**, Baupläne **Gold**.

**ARENA PACK:** „Arena 5 Pack", Siegel **„230 % value"**, Inhalt ×800 💎 · ×20 🪙 · ×10 · ×80,
Preis **~~Fr. 20.70~~ Fr. 9**. Sechs Punkte unter dem Karussell = sechs Angebote.

### 27.3 ⚠ Korrektur an §8

§8 stammt aus Videostandbildern und trug mehrere unsichere Lesungen. Was sich mit den
Screenshots ändert:

| §8 sagte | Richtig ist |
|---|---|
| Gem-Staffeln „80 / ~200 / 2500 / 6500 / 14000", **fünf** Pakete | **sechs**: 80 / 500 / 1 200 / 2 500 / 6 500 / 14 000 |
| „Heap of Gems 80 = Fr. 3" | **Some** Gems 80 = **Fr. 2**; *Heap* ist die 1 200er für Fr. 9 |
| „Bag of Gems 2500 = Fr. 40?" | Bag 2 500 = **Fr. 18**; Fr. 40 gehört zu **Trophy 6 500** |
| Gold-Mengen 10 500 / 31 500 / ~126 000 | **12 000 / 36 000 / 144 000** (andere Arena → skaliert) |
| Gold-Bundles per Echtgeld | per **Gems** |
| Pity-Legendary „50, unsicher" | **50, bestätigt**; zusätzlich Epic in 10 |
| Werbe-Entfernen-Banner auf Platz 1 | in diesen Aufnahmen **nicht vorhanden** |

**Die Skalierungs-Beobachtung aus §8.4/§12.4 bleibt gültig** und wird hier sogar schärfer:
dieselben Greenprints kosten bei Arena 2 5 400, bei Arena 4 20 000 und bei Arena 5 **40 000**
Gold. Auch die Gold-Staffeln skalieren (10 500 → 12 000). Die **Echtgeldpreise der Gem-Staffeln
skalieren nicht** — die sind Store-Preise und stehen fest.

### 27.4 Was davon gebaut ist (30.07.2026)

Umgesetzt in `ui_prototype.html`, geprüft in `pruefungen/run_shop.js` (53 Schritte) und
`pruefungen/run_v7.js`:

| §27 sagt | gebaut |
|---|---|
| Abschnittsfolge 1–7 | ✅ `data-sec="1"`…`"7"`, Reihenfolge gegen `getClientRects()` geprüft |
| kein Pass-Banner | ✅ `#shopPromo`, `renderShopPromo()` und `.promobanner` ersatzlos entfernt |
| kein Banner-Shop | ✅ war nie eigenständig da; die Abwesenheit wird jetzt geprüft |
| Tresor auf dem Roulette-Platz | ✅ Sektion 5 |
| GEMS-Preise inkl. **Knick** 0,62 → 0,64 | ✅ übernommen; der Knick wird ausdrücklich eingefordert |
| GOLD 12 000 / 36 000 / 144 000, gratis / 90 / 288 | ✅ drei Kacheln, die erste gratis (1× pro Tag) |
| Supplies Chest 300 / 2 680 | ✅ unverändert bestätigt |
| Explorer 💎 80 | ✅ = unser Silber-Pack |
| Türme Gems, Baupläne Gold | ✅ Währung hängt jetzt an der Warengruppe, nicht am Tageshash |

**Nicht übernommen und warum:**

- **Werbewege.** AA hängt drei Posten an ein Video (erste Gold-Staffel, Explorer-Truhe,
  Endless Roulette). Belohnte Werbung ist nicht angebunden (`WERBUNG_VERFUEGBAR = false`).
  Statt eines Knopfes, der nichts tut, steht unter dem Gold-Raster ein Satz, der das sagt.
  Die erste Gold-Staffel gibt es dafür einmal am Tag gratis.
- **Arena-Pack-Preisleiter.** §27.2 hat dazu genau *einen* Messpunkt („Arena 5 Pack",
  ~~Fr. 20.70~~ Fr. 9, 230 % value). Unsere Leiter hat acht Stufen mit eigenem Inhalt, und
  das Wertsiegel wird gerechnet, nicht behauptet. Eine Umrechnung auf AAs einen Punkt
  hieße, sieben Preise zu erfinden — offen für eine eigene Messung.
- **Violetter Gratis-Posten / diagonales Rabatt-Eckband** in den Tagesangeboten (§27.2).
  Der Gratis-Posten steht vorne links und trägt einen hellen GRATIS-Knopf; die Färbung
  und das Eckband fehlen noch.

---

## 28. LEVEL-AUF-Fenster (30.07.2026)

> **Quelle:** IMG_3445. **Auftrag:** *„So etwas brauchen wir auch beim levelup. Mit Image usw und
> Belohnungen natürlich steigend pro Level. Damit man nicht stuck ist mit dem Gold."*

Ein Vollbild-Overlay, das den Hintergrund stark abdunkelt. Von oben nach unten:

| Element | Beschreibung |
|---|---|
| **Abzeichen** | großer **Stern mit der Levelzahl**, gefasst in einen goldenen Ring, links und rechts je ein goldener **Flügel**. Sitzt bei ~25 % Höhe, überlappt den Kopf des dahinterliegenden Fensters |
| **Titel** | „**Reached level 17!**" — groß, weiß, fett, mittig |
| **Trenner** | dünne Linie mit Rauten links/rechts und dem Wort **REWARDS** in der Mitte |
| **Belohnungsfeld** | dunkle Fläche, darin die Belohnungskacheln — hier **eine** Kachel: goldgerahmt, Gem-Artwork, Menge **x20** unten rechts |
| **Abschluss** | „**TAP TO CLOSE**" ganz unten, außerhalb der Fläche |

**Kein ✕.** Geschlossen wird durch Tippen irgendwo — deshalb steht der Hinweis da.

**Was das für uns heißt:**

1. Der Auftrag nennt den Zweck ausdrücklich: *„Damit man nicht stuck ist mit dem Gold."* Die
   Belohnung muss also **Gold** enthalten, nicht nur Gems — AA gibt hier nur Gems, wir weichen
   bewusst ab. Das ist dieselbe Begründung wie bei den Offline-Erträgen
   (`GAMEPLAY_OPTIMIERUNG.md` §10): eine zweite, planbare Goldquelle gegen den Endgame-Engpass.
2. **Steigend pro Level** — die Belohnung ist eine Kurve über dem Level, keine feste Zahl.
3. Das Abzeichen braucht ein eigenes Asset (Stern + Ring + Flügel), die Levelzahl wird zur
   Laufzeit hineingeschrieben, damit ein Bild für alle Level reicht.
4. Optik „clean wie der Shop" (Auftraggeber) — also dieselbe Bandtypografie, dieselben
   Kachelrahmen, dieselben Icon-Schlüssel wie im übrigen Spiel.

---

## 29. BELOHNUNGS-Fenster nach dem Abholen (IMG_3459, 30.07.2026) — GEBAUT

**Auftrag:** „Wenn man die offline earnings abholt muss sich so ein Fenster öffnen. Bau es
mit unseren icons und Design. Jeweils wenn man mit Kristallen kauft, Ad anschaut oder
normal abholt."

### Was auf dem Bild steht

| Element | Beschreibung |
|---|---|
| **Lage** | eigenes Blatt **über** dem Offline-Fenster; das darunter bleibt sichtbar abgedunkelt stehen |
| **Titel** | Band „REWARDS" mit Linie und Rauten links/rechts — bei uns `secribbon("BELOHNUNGEN")` |
| **Raster** | vier Kacheln je Reihe in einem eingefassten, rollbaren Feld |
| **Kachel** | runder Rahmen in **Raritätsfarbe**, Artwork mittig, Glanzpunkt oben links, Menge `×N` unten rechts |
| **Einflug** | die Kacheln poppen **gestaffelt** auf — auf dem Bild sind zwei mitten im Flug und deshalb blass |
| **Abschluss** | „TAP TO CLOSE" ganz unten, **außerhalb** des Blattes; kein ✕ |

### Umsetzung

`window.UIBelohnung.zeige(titel, posten, opts)` — **eine** Bauform, bewusst allgemein, damit
das Level-auf-Fenster (§28), Tagesbelohnung und Straßen-Knoten dasselbe Fenster benutzen
können. Zwei Fenster, die dasselbe versprechen, driften auseinander.

Ein Posten ist `{ art, id, tier, menge }` mit `art ∈ {gold, gem, xp, mat, karte}`. Der
Kachelrand nimmt seine Farbe aus `AC.TIERS` — dieselbe Quelle wie überall sonst, damit eine
neue Raritätsstufe hier nicht vergessen wird. Der Ton ist `UISfx.flip(stufe)` je Kachel,
**mit** ihrer Rarität: acht Essenzen klingen anders als eine legendäre Karte.

### Die Regel, an der alles hängt

> **Das Fenster zeigt, was GEBUCHT wurde — nicht die Vorschau, nicht die Rate, nicht die
> Absicht.**

Praktisch heißt das: die Essenz-Kacheln kommen aus dem Unterschied von `AC.getMaterials()`
vor und nach der Buchung, nicht aus der Zahl, die hineingereicht wurde. `addMaterial(60)`
verteilt per Round-Robin auf acht Sorten (8,8,8,8,7,7,7,7); welche Sorte wie viel bekommt,
weiß nur der Speicher — und genau das ist die Information, für die der Spieler das Fenster
aufmacht. `pruefungen/belohnung.js` misst diese Gleichheit Sorte für Sorte gegen den
Speicher, mit einer Gegenprobe darauf, dass die Mengen **nicht** alle gleich sind (sonst
käme die Liste aus einer Tabelle).

Ohne Posten öffnet sich **nichts**. Ein leeres Belohnungsfenster ist eine Lüge mit Rahmen.

### Die drei Wege

| Weg | Titel | Inhalt | Satz darunter |
|---|---|---|---|
| Normal abholen | BELOHNUNGEN | Gold + Essenzen je Sorte + die wirklich gezogenen Karten | „Aus **6 h** Abwesenheit." |
| Mit Kristallen | SCHNELL-ERTRAG | Zuwachs im **Topf** (Gold, Essenz-Summe, Kartenrückseite) | „**+120 Minuten** … liegt jetzt im Fenster bereit" |
| Werbung | WERBE-BONUS | dasselbe | dasselbe |

Beim Schnell-Ertrag sind die Kacheln bewusst **unbestimmt**: `quick()` bucht nur Zeit,
gewürfelt wird erst beim Abholen. Die Karten-Kachel zeigt deshalb die **Rückseite** und
behauptet keine ID, und die Essenz steht als Summe (`ESS_SAMMEL`) statt nach Sorten. Der
Satz darunter sagt ausdrücklich, dass es im Topf liegt und nicht im Beutel.

### Zwei Befunde, die beim Bauen aufgefallen sind

**1. Kristalle für nichts (behoben).** `stand()` rechnet `msGut = min(msRoh + quickMs,
DECKEL)`. Steht der Topf schon am Deckel, ändert gekaufte Zeit **nichts** — `quick("gems")`
hätte 40 Kristalle abgebucht und exakt null geliefert. Der Knopf war trotzdem aktiv; seine
einzige Bedingung war „heute noch Versuche übrig". Aufgefallen ist es erst, weil das neue
Fenster zeigen *muss*, was dabei herauskommt: bei vollem Topf wäre es leer geblieben. Ein
Kauf, der nichts bringt, wird jetzt abgelehnt, **bevor** er etwas kostet — auch der
Werbeweg, denn ein Video für nichts ist genauso verbrannt und kostet zusätzlich einen
Tagesversuch.

**2. XP wird versprochen und nirgends gebucht (OFFEN).** `AO.claim()` liefert `xp`
(**140/h**, §10), aber `hole()` bucht es nicht — es gibt **kein Spieler-XP-Konto**. Der
Season-Pass ist es nicht: der läuft über Ereignisse (win/pack/trophy) mit 100 XP je Stufe;
acht Stunden Offline wären dort 1 120 XP und damit **elf Stufen auf einen Griff**. Das
Belohnungsfenster zeigt XP deshalb **nicht** — ein Posten darin ist ein Versprechen, und
dieses könnte niemand einlösen. Die Vorschau im Offline-Fenster zeigt es weiter; das ist
die eigentliche Unstimmigkeit.

**Zu entscheiden:** in welches Konto geht das Offline-XP? Drei Möglichkeiten:
(a) ein neues Spieler-Level (dann gehört §28 daran gekoppelt), (b) in den Season-Pass mit
einem eigenen, viel kleineren Satz, (c) XP aus dem Offline-Ertrag streichen und die 140/h
als Gold verrechnen. Solange das offen ist, verspricht die Vorschau etwas, das nicht kommt.

**Aufwand: S** · **Priorität: 1** (die Vorschau steht heute im Spiel und ist falsch)

---

## 30. Startseite und Battle Deck nachgezogen (30.07.2026)

Vier Befunde aus IMG_3460 bis IMG_3463, in der Reihenfolge, in der sie gemeldet wurden.

### 30.1 Der KAMPF-Knopf saß nicht bündig

> „Der Kampf Banner muss bündig in die Kachel passen."

Das ist Geometrie, kein Geschmack. `btn_primary.webp` ist **1200×896** groß, der Rahmen darin
aber nur **1028×343** — 85,7 % der Breite und **38,3 % der Höhe**, mit je rund 30 % leerer
Leinwand oben und unten. Bei `background-size:100% 175%` blieb davon ein sichtbarer Rand
stehen. Dieselbe Fehlerklasse wie beim Sektionsband (§secribbon), nur an einem anderen Bild.

Beim Nachmessen fiel ein zweiter Fall auf: die **sechs anderen** Knöpfe mit diesen Grafiken
(`btnToForge`, `btnMergeAll`, `btnMerge`, `btnUpgrade`, `btnClearReq`, `btnUnequip`) standen
auf `background-size: auto` — eine 1200-px-Grafik in Originalgröße auf einem 100-px-Knopf,
also ein zufälliger Bildausschnitt. Die Regel `.asset-btn` (210 %) hätte das geregelt, wird
aber **nirgends verwendet**: tote CSS.

Die Passung steht jetzt in `layer()` statt im CSS, weil sie zum **Bild** gehört und jedes der
drei Bilder eine andere Geometrie hat:

| Grafik | Inhalt | `background-size` | `position` |
|---|---|---|---|
| `btn_primary` | 85,7 % × 38,3 % | 114,4 % 250,8 % | 55,3 % 49,7 % |
| `btn_secondary` | 85,0 % × 40,4 % | 115,3 % 237,6 % | 50 % 50 % |
| `btn_danger` | 82,3 % × 35,5 % | 119,0 % 270,5 % | 50 % 50 % |

Gerechnet auf 98 % Breite und 96 % Höhe Füllung — ein Hauch Luft, damit der Eckzierat nicht
am Radius abgeschnitten wird. `run_v7.js` prüft die **Folge** (füllt der Rahmen 90–100 % der
Kachelhöhe?), nicht die Schreibweise, mit einer Gegenprobe darauf, dass der alte Wert
durchfällt (0,383 × 175 % = 67 %).

### 30.2 Die vier Belohnungsplätze zeigten Truhen

> „Die 4 Truhen slots müssen mit neuen boosterpack Images versehen werden wir haben keine
> Truhen."

Richtig — dort stand `chest_bronze`. Beim Nachsehen benutzten **fünf** Stellen ein
Truhenbild, wo ein Pack gemeint war: die Slots, der Gratis-Pack-Countdown, ein
Straßen-Knoten mit der Beschriftung „Bronze-Pack", die Clan-Quest-Karten und die
Straßen-Marker. Alle fünf tragen jetzt Pack-Bilder.

**Neues Asset `pack_arena`** (Bauart 3 wie die übrigen acht, Glut **smaragdgrün** — die
einzige Farbe, die in der Familie noch frei war: Bronze braun, Silber eisblau, Gold goldgelb,
Arkan magenta, Arena-Ikon karminrot, Vorrat bernstein).

**Belegung:** drei Arena-Packs, der **vierte ein Gold-Pack**. Der leere Platz zeigt sein Pack
**blaß** statt eines „＋": ein Plus sagt „hier fehlt etwas", das blasse Pack sagt „hier kommt
*dieses* hin" — und beim Gold-Platz ist genau das die Botschaft, auf die man hinspielt.

### 30.3 Der Loot des Arena-Packs

> „Sie sollen vom Inhalt bisschen schlechter wie die Silber booster packs sein." ·
> „Wir brauchen starke Belohnungen das Leute spielen."

Beides zusammen legt die Stellschraube fest: die **Garantie bleibt bei Selten**, gleich wie
Silber. Der Boden ist das, was ein Spieler beim Öffnen als Versprechen liest; ihn zu senken
macht das Pack nicht „ein bisschen" schlechter, sondern zu einem Bronze-Pack mit anderer
Farbe. Schlechter wird es über **Menge und Quoten**:

| | Bronze | **Arena** | Silber | Gold |
|---|---:|---:|---:|---:|
| Kartenslots | 5 | **6** | 7 | 9 |
| Essenzslots | 2 | **2** | 3 | 4 |
| Spellslots | 1 | **1** | 2 | 2 |
| Gold | 400–800 | **900–1 800** | 1 200–2 500 | 4 000–8 000 |
| Gewöhnlich | 82 % | **70 %** | 62 % | 38 % |
| Garantie | Gut | **Selten** | Selten | Episch |

Gemessen gegen Silber: **1,2 % Legendär je Pack statt 1,4 %**, **6,0 % Episch statt 9,8 %**.
Spürbar schwächer, aber immer noch ein Pack, für das man einen Kampf mehr spielt.

Das Arena-Pack ist **nicht käuflich** und darf keine Kristallquelle bekommen: die vier Plätze
sind die Belohnung fürs Spielen, und ein Pack, das man auch kaufen kann, entwertet sie.

### 30.4 Battle Deck: die Reiter waren da, nur unsichtbar

> „du musst die Tower skills und items Schaltflächen noch einbauen … Deck und Sammlung oben
> brauchen wir nicht über dem battledeck."

Der erste Teil war ein **Trugschluss meinerseits, kein fehlendes Feature**: die Reiter
Türme/Spells/Items/Helden und der Schmiede-Knopf gab es längst — sie lagen hinter dem Reiter
„Sammlung" und waren damit einen Tipp entfernt und unsichtbar. Der Kommentar im Quelltext
hatte die Trennung sogar *begründet* („ein zweites Reiter-Set nur für denselben Filter wäre
Redundanz"). Die Begründung war falsch, weil sie das Falsche verglichen hat: AA setzt Deck
**und** Sammlung auf **einen** Bildschirm, untereinander (IMG_3461/3462/3463). Man sieht sein
Deck und seinen Vorrat gleichzeitig — das ist der ganze Zweck des Bildschirms.

Umgebaut: kein Umschalter mehr, beide Teile untereinander. Erste Zeile nur Filterreiter,
zweite Zeile Sortierung links und **Schmiede rechts** (AA-Anordnung) — ein Knopf, der etwas
*tut*, gehört nicht in eine Reihe mit Umschaltern, die nur filtern. Die Forge-Mechanik war
vollständig gebaut und musste nur erreichbar werden.

**Aufwand: M** · **Priorität: 1**

---

## §31 Der Tresorkopf: wie ein Darstellungsfehler aussah, was es wirklich war

Beim Nachsehen im Laden (30.07.2026) sah der Kopf des **Kristalltresors** kaputt aus: ein
schwarzer Block oben links, daneben Kristalle der Kulisse, quer darüber eine harte helle
Naht. Keine der 23 Prüfungen hat etwas gemeldet — alle Bildprüfungen fragten „ist das Bild
da?", und das war es.

### 31.1 Meine erste Erklärung war falsch

Ich habe zuerst geschrieben, die Füllstands-Säule liege mit `z-index: 0` **hinter** dem
deckenden Packmotiv und sei deshalb unsichtbar. Der Quelltext behauptete an zwei Stellen
dasselbe („Säule als Ebene DAHINTER"). Das ist ein CSS-Irrtum: ein **positioniertes Kind mit
`z-index: 0` wird immer über dem Hintergrund seines Elternteils gezeichnet** — der
Elternhintergrund steht in der Malreihenfolge ganz vorn. Die Säule lag nie hinter dem Motiv.

Aufgefallen ist es nur, weil die neue Prüfung eine **Gegenprobe** hatte, die den angeblich
kaputten Zustand wiederherstellt. Sie konnte ihn nicht wiedererkennen — weil es ihn nie gab.
Ohne diese Gegenprobe wäre eine Prüfung entstanden, die für den kaputten wie für den
reparierten Aufbau grün ist, und dazu ein Kommentar, der künftigen Lesern einen falschen
CSS-Merksatz beibringt. *Die Gegenprobe hat hier nicht den Code geprüft, sondern mich.*

### 31.2 Die tatsächlichen Ursachen

| | Ursache | Messbar? |
|---|---|---|
| **a** | `background:` als **Kurzform** setzt `background-color` auf `transparent`. `renderVault()` überschreibt danach nur `background-image`, die Farbe blieb also weg. `offer_vault_bank.webp` ist **896×1200 (3:4)**, der Kasten **1:1** — `contain` lässt links und rechts je 8 px frei, und durch diese Streifen schien die Kulisse der Karte. **Der Kasten war ein Fenster.** | **ja** |
| **b** | Die Säule deckte mit `opacity:.5` und normalem Mischen das Motiv zu einer flachen Platte zu. | nein |
| **c** | Ohne Pegelstrich las sich die Kante als Naht, nicht als Stand. | nein |

Die Behauptung „das Motiv ist 1:1", die als Begründung für `contain` im Blatt stand, war beim
Schreiben richtig und ist es heute nicht mehr — das Bild wurde später gegen ein 3:4-Motiv
getauscht, der Kommentar blieb stehen. **Ein Kommentar, der eine Maßangabe behauptet, ist ein
Versprechen mit Verfallsdatum.**

### 31.3 Was gemessen wird und was nicht

`pruefungen/tresor.js` misst **nur (a)**: die gerechnete Hintergrundfarbe des Kastens muss
deckend sein. Mit zwei Gegenproben — der durchsichtige Zustand muss erkannt werden, und die
Ablesung darf `rgb(5, 8, 9)` nicht fälschlich für durchsichtig halten (derselbe Fehlertyp wie
der Preisparser in §14, deshalb ausdrücklich abgesichert).

**(b) und (c) sind nicht gemessen, sondern per Augenschein abgenommen.** Lesbarkeit braucht
Bildpunkte; in dieser Umgebung gibt es keinen PNG-Decoder, und `file://` verunreinigt jede
Leinwand, also fällt `getImageData` aus. Die **Bytegröße der Aufnahme** als Ersatzmaß habe ich
ausprobiert und **verworfen** — sie unterscheidet nicht:

| Aufbau | Größe gegenüber der ungefüllten Fläche |
|---|---|
| repariert (`screen`, .34) | 1,099 |
| alt (`normal`, .5) | 1,101 |
| voll deckende Säule | 0,983 |

Eine Schwelle darauf wäre geraten gewesen. Lieber ein ehrliches „nicht gemessen" im Text als
ein grüner Balken, der nichts weiß.

**Aufwand: S** · **Priorität: 2**

---

## §32 „Nicht animiert" — zwei Fragen, zwei verschiedene Antworten

> „Die merge/fusion Funktion funktioniert hat aber keine Animation. Wenn möglich mit Kling 3.0
> erstellen damit wir auf der Animation auch Sound haben.
> Im battledeck sind die Tower und Helden nicht animiert, zuvor waren sie es wieso nicht?"

### 32.1 Das Battle Deck: sie waren dort nie animiert

Nachgesehen statt vermutet:

| Prüfung | Ergebnis |
|---|---|
| `attachLoop`-Aufrufe im Deck-Raster | **keine** — die Aufrufstellen sind Detailkarte, Pack-Enthüllung, Heldenbühne |
| `attachLoop`-Vorkommen über die letzten 25 Commits | 8 → 10, also **nichts entfernt**, nur ergänzt |
| Videos in `#viewCollection`, gemessen | **0** bei 6 Artboxen |

Der Quelltext sagt es sogar selbst: der Loop steht „nur dort, wo die Karte **groß** zu sehen
ist … und nicht in jeder 60-px-Kachel". Das war eine Leistungsentscheidung — acht Loops à
3,7–6,7 MB gleichzeitig in einem scrollenden Raster zu dekodieren ist auf dem Telefon teuer.
Bewegt hat sich immer die **Detailkarte** (Turm antippen), nicht die Kachel.

### 32.2 Was aber wirklich kaputt war: der fehlende Rückfall

Ein Video, dessen Quelle fehlschlägt, wurde **sofort und endgültig versteckt**
(`UIIcon.hide(v)` im ersten `error`). Solange die Loops vom CDN kamen, fiel das nie auf. Seit
sie aus dem Repo geladen werden (§13), ist es der Unterschied zwischen „läuft" und „läuft nie
mehr" — aus Gründen, die **nichts mit der Datei zu tun haben**:

- Wird die Seite als reine Datei geöffnet (`file://`), verweigern mehrere mobile Browser
  Video aus relativen Pfaden, während Bilder anstandslos laden. Genau dieses Bild — Bilder da,
  Türme still — entsteht dabei, und es entstand **erst mit der Umstellung auf lokale Pfade**.
- Ein Browser ohne H.264 meldet `MEDIA_ERR_SRC_NOT_SUPPORTED`, obwohl die Datei mit **200**
  ausgeliefert wird.

`ASSETS_CDN` hält die Originaladressen ohnehin bereit. `videoRueckfall()` schaltet jetzt
einmal darauf um und versteckt erst, wenn **auch** die scheitert. Das Standbild darunter bleibt
in jedem Fall stehen.

**⚠ Ehrlich zur Reichweite dieser Aussage:** Der Chromium dieser Umgebung hat **kein H.264**
(`canPlayType('video/mp4; codecs="avc1.42E01E"') === ""`). Ein laufender Loop ist hier
grundsätzlich nicht herstellbar — ich kann den gemeldeten Zustand also **weder nachstellen noch
ausschließen**. Geprüft ist deshalb nur, was messbar ist: dass zuerst die lokale Quelle
versucht wird und bei Fehlschlag auf die Originalquelle umgeschaltet wird
(`pruefungen/video_rueckfall.js`).

### 32.3 Der Verschmelzungs-Effekt: eine Animation gab es, der **Ton** fehlte

Die Zeremonie hat eine an AA gemessene Choreografie — drei kreisende Kopien, Einsaugen bei
1130 ms, Umschlag bei 1260 ms, Werttafel. Was fehlte, war die **Wucht des Aufpralls** und der
**Ton**.

Erzeugt mit **Kling v3.0** (1:1, 5 s, `mode: pro`, `sound: on`), danach auf 640×640 verkleinert
und die Tiefen auf echtes Schwarz gedrückt. Der letzte Schritt ist keine Kosmetik: Das Video
hat **keinen Alphakanal**, es wird mit `mix-blend-mode: screen` einkomponiert, und `screen`
rechnet Schwarz als „nichts". Gemessen vorher: Eckwerte bis **31** — das wäre als grauer
Schleier über der ganzen Zeremonie gelegen. Nachher: **0** an allen vier Ecken zu 0,3 / 1,5 /
2,1 / 4,5 s.

Zwei Regeln, die der Ton mitbringt:

1. **Doppelter Ton ist schlimmer als keiner.** Läuft das Video hörbar, wird der synthetische
   Blip (`UISfx.legend`/`reward`) unterdrückt. Startet es nicht, kommt der Blip wie bisher.
   Entschieden wird das an `CER.fxTon` — gesetzt, wenn `play()` **ungestummt** durchging, also
   gemessen statt vermutet.
2. **Ton ohne Zutun ist gesperrt.** Die Zeremonie startet immer aus einer Tippgeste, also ist
   die Wiedergabe erlaubt. Wird sie trotzdem abgelehnt, folgt ein stummer zweiter Versuch —
   dann übernimmt wieder der Blip.

Das Video ist **Zugabe, kein Ersatz**: fällt es aus, läuft die CSS-Choreografie unverändert.
Das ist hier nicht theoretisch — die Baumaschine hat **kein H.264** (`canPlayType` liefert
für `avc1.42E01E` den leeren String), hier kann also **kein** mp4 spielen. Der Fall „Video
fehlt" ist damit der Regelfall der Prüfung, nicht der Ausnahmefall.

### 32.4 Die Datei liegt im Repo — in fünf Teilen hergeholt

`*.cloudfront.net` ist aus der Baumaschine gesperrt (CONNECT 403), für **beide** Verteiler.
Ein direkter Download war also ausgeschlossen. Der einzige offene Weg ist die Ausgabe der
Bild-Sandbox, und die schluckt rund **20 000 Zeichen je Aufruf** — bei der ersten Fassung
(640×640, 813 KB) wären das 56 Runden gewesen.

Statt das durchzuziehen, wurde die Datei an das angepasst, was sie im Spiel wirklich sein
muss. Gemessen: die Effektfläche ist **155 × 155 CSS-px** (465 Gerätepixel bei dreifacher
Auflösung) — ein 1080er Quellvideo ist dafür um ein Vielfaches zu gross. Mit 192 × 192, auf
die Länge der Choreografie gekürzt und um 1,42 beschleunigt bleiben **61 704 Byte**, also
fünf Teile.

Der Rest ist Buchhaltung, aber sie hat sich gelohnt: zwei der fünf Teile kamen beim
Abschreiben **beschädigt** an — einem fehlte ein Zeichen, einem hingen vier an. Aufgefallen
ist das nur, weil die Länge jedes Teils vorher bekannt war. Statt alles neu zu holen, wurde
per Prüfsumme über 2000-Zeichen-Blöcke eingegrenzt, wo genau der Fehler sass, und **nur diese
Blöcke** neu übertragen. Der SHA-256 der zusammengesetzten Datei stimmt mit dem der Sandbox
überein — Bit für Bit.

**Merksatz:** Bei einer Übertragung, die durch Abschreiben läuft, ist die Länge das billigste
Prüfmittel und die blockweise Prüfsumme das zweitbilligste. Ohne beides wäre eine still
beschädigte Datei ins Repo gewandert, die auf dem Telefon einfach nicht abspielt.

**Aufwand: M** · **Priorität: 1** · erledigt

## §33 Zwei Fehler aus dem Testbild: unleserliche Knöpfe, schräge Karten

Zwei Meldungen aus einem Lauf auf dem Telefon, beide sofort reproduzierbar, beide mit einer
Ursache, die nicht die naheliegende war.

### 33.1 „Der Text ist auf den Buttons nicht lesbar"

Betroffen: `#btnMerge` („VERSCHMELZEN") und `#btnClearReq` („Leeren") — beides Knöpfe, die
über `layer()` eine **Metallplatte** als Hintergrund bekommen. Sichtbar war die Platte, die
Beschriftung war weg. Nicht blass, nicht kontrastarm: **nicht vorhanden**.

Die erste Erklärung war falsch, und das gehört hierher, weil sie plausibel klingt: Ich hatte
angenommen, `background-clip: text` schneide die Glyphen aus der Platte aus, so dass Schrift
und Untergrund dasselbe Bild zeigen. Am Bau **vor** der Reparatur gemessen:

```
getComputedStyle(btnMerge).backgroundClip     → "border-box, border-box"
getComputedStyle(btnMerge)['-webkit-text-fill-color'] → "rgba(0, 0, 0, 0)"
```

`background-clip` steht also gar nicht auf `text`. Die Regel `.goldtext` setzt beides zusammen
— Verlauf plus `background-clip:text` plus `-webkit-text-fill-color:transparent` —, aber
`.btn.up` schreibt danach die **Kurzform** `background:` und die setzt `background-clip` auf
den Anfangswert `border-box` zurück. Übrig bleibt eine durchsichtige Füllfarbe ohne den
Verlauf, aus dem sie ihre Form beziehen sollte: Die Glyphen malen **nichts**.

Das ist zum zweiten Mal in dieser Sitzung dieselbe Falle (§31: `background:` setzte am
Tresorkopf `background-color` auf `transparent` zurück). **Merksatz:** Eine Kurzform ist keine
Ergänzung, sie ist ein Reset aller ihrer Unterfelder — auch derer, die man nie erwähnt hat.

Repariert an der Quelle statt an der Stelle: `layer()` markiert jedes Element, dem es eine
Platte unterlegt, mit `.traegt-platte`; die Regel

```css
.goldtext.traegt-platte{background-image:none;filter:none;
  -webkit-text-fill-color:#2a1f06;color:#2a1f06;
  text-shadow:0 1px 0 #ffffff99}
```

gibt dort eine deckende dunkle Füllung plus eine helle Kante nach unten. Damit hängt die
Lesbarkeit nicht mehr daran, in welcher Reihenfolge zufällig welche Kurzform gewinnt.

**Die Gegenprobe war zweimal falsch, bevor sie etwas gemessen hat.** Beim ersten Versuch blieb
`text-shadow` stehen — der Schatten zeichnete die Umrisse weiter, das Bild änderte sich, der
Test wäre grün gewesen, ohne dass Schrift zu sehen ist. Beim zweiten kam `background-clip:text`
dazu, das aber die Platte gleich mit entfernt: verglichen wurden zwei unvergleichbare Bilder.
Die Fassung, die zählt, setzt nur Füllung und Farbe auf durchsichtig, dazu `text-shadow:none`
und `filter:none`, und vergleicht dann Ausschnitt-Screenshots mit und ohne Textinhalt.

### 33.2 „Die Tower-Karten liegen schräg während der Fusion"

Im Umlauf der Verschmelzungs-Zeremonie standen die drei Karten gekippt. Ursache im rAF-Takt:

```js
rotate(" + (a * 12 * (1 - q)).toFixed(1) + "deg)
```

`a` ist der **Bahnwinkel im Bogenmass** und läuft über zwei volle Umläufe (bis 4π plus
Kartenversatz). Mal 12 ergibt das Kippwinkel bis über 200° — die Karten überschlagen sich.
Vermutlich war ein kleiner Neigungseffekt gemeint; gemeint und gemessen liegen hier drei
Grössenordnungen auseinander. Die Rotation ist ersatzlos entfernt, die Karten laufen jetzt
aufrecht auf ihrer Bahn (Position und Skalierung bleiben unverändert).

Gemessen wird das mit einem **rAF-Rekorder**, der vor dem Klick installiert wird und die
Neigung jedes Umlaufkärtchens in jedem Bild mitschreibt; ausgelesen wird nach dem Umlauf.
Ergebnis: **225 Messpunkte, grösste Neigung 0,0 Grad** — gegen **175,5 Grad** am Bau vor der
Reparatur.

Der erste Anlauf hatte stattdessen in einer Schleife mit `waitForTimeout` gepollt. Das war
grün, hat aber **1,1 s Wanduhr verbrannt** und damit den nächsten Schritt („Nach dem Umschlag
hält die Zeremonie inne") kaputtgemacht: Er sah 5 Tabellenzeilen statt 0. **Merksatz:** Eine
Messung, die Zeit kostet, misst nicht mehr denselben Ablauf. Aufzeichnen statt abfragen.

**Aufwand: S** · **Priorität: 1** · erledigt

## §34 Der CEO-Durchgang: was eine Messung über 16 Ansichten gefunden hat

Auftrag (30.07.2026): *„Schau dir die komplette Ui aus der Sicht eines ceo UI Designers an
und optimiere alles was nicht sauber läuft(Bugs) … füge überall Schatten + Lichteffekte
hinzu … Pass alle Farben usw unseren Brand Richtlinien an."*

Der Durchgang war **messend**, nicht meinend. Sechs Fragen, jede über alle 16 Ansichten,
festgehalten in `pruefungen/qualitaet.js`.

### 34.1 Was gefunden wurde

| Befund | Zahl | Erledigt |
|---|---|---|
| Knöpfe unter 40 × 40 px | 69 | 21 alleinstehende Symbolknöpfe auf 44 × 44 Trefferfläche |
| Über den Bildschirmrand | 2 (Karussellpfeile) | auf `left/right: 2px` |
| Fläche ohne Tiefe, gesamt | 8,5 % | **2,3 %** |
| Fläche ohne Tiefe, schwächste Ansicht | **90 %** (Einstellungen) | **8 %** |
| Handlungsfarbe ohne Token | 15 + 13 Stellen | `--act` / `--act-2` / `--act-sockel` |
| Abgeschnittener Text | 0 | — |
| Bilder unter ihrer Anzeigeauflösung | 0 von 52 | — |
| Leere Bildfelder | 0 | — |

### 34.2 Der eigentliche Fund: die Zusicherung hatte Löcher

Der Materialcheck in `run_v7` lief über **zwölf** Ansichten. Einstellungen, Guide, Freunde
und Community waren **nie** dabei — und genau dort lag der Schaden: **90 %** der Fläche der
Einstellungen trug keine Tiefe, während der Check seit Wochen grün stand.

Dasselbe eine Ebene tiefer: der Guide hat **fünf Reiter**, gemessen wurde nur der erste.
Reiter 4 („Bosse") lag bei **33 %**, weil `.waverow` flach war.

> **Merksatz:** Eine Zusicherung, die nur für eine gepflegte Liste gilt, ist keine
> Zusicherung — sie vergisst genau die Ansicht, die als nächste dazukommt. Und **eine
> Ansicht ist nicht ein Bild**: wer nur ihren Startzustand misst, misst ein Fünftel.

`MATVIEWS` läuft jetzt über alle 16.

### 34.3 Die Handlungsfarbe: erst als Fremdkörper gelesen, dann nachgezählt

Auf dem Einstellungs-Screen stehen drei kräftig blaue Knöpfe („Öffnen", „Anzeigen") in einer
Umgebung aus Purpur und Gold. Der erste Eindruck war: Fremdkörper, gehört umgefärbt.

Die Zählung sagt etwas anderes. `linear-gradient(180deg,#3fa9e8,#1c6ea8)` steht **15-mal**
wörtlich im Blatt, der Sockelschatten `0 3px 0 #12496f` **13-mal**. Fünfzehn gleiche
Verwendungen sind kein Ausrutscher — **das ist die Handlungsfarbe des Spiels**. Sie wurde
deshalb *nicht* umgefärbt, sondern bekam einen Namen.

Nachgemessen, Aufnahme für Aufnahme: **kein einziges Pixel** hat sich geändert.

> **Merksatz:** Bevor man eine Farbe für einen Fehler hält, zählt man, wie oft sie vorkommt.
> Ein Fehler kommt einmal vor; ein System kommt fünfzehnmal vor.

### 34.4 Der Kontrast-Befund, der keiner war

Eine WCAG-Messung über alle Textknoten meldete Befunde in **16 von 16** Ansichten — der
Titel „Shop" angeblich mit **1,13 : 1**. Das ist unmöglich, und die Stichprobe erklärt warum:

1. `.goldtext` färbt über einen Verlauf und setzt `-webkit-text-fill-color: transparent`.
   Gemessen wurde daraufhin das nie gemalte `color`.
2. Der Untergrund vieler Knöpfe ist ein **Bild**, keine Farbe. Der Sucher lief am Bild vorbei
   nach oben und fand die dunkle Tafel dahinter — also dunkel auf dunkel.

Genau dieselbe Klasse Fehler wie beim Alpha-Leser (`rgb(5, 8, 9)` als Alpha 9) und beim
Preisparser („Fr. 2.–"). **Auf diesen Befund wurde deshalb nicht reagiert.** Eine Kennzahl,
die man nicht erklären kann, ist keine Kennzahl. Ein belastbarer Kontrastwert braucht die
**gerenderten Pixel**, nicht `getComputedStyle` — das bleibt offen.

### 34.5 Trefferflächen: warum keine Sammelregel

Die Symbole dürfen nicht wachsen — ein 20-px-Kreuz ist an seinem Platz richtig, es ist nur
schwer zu treffen. Vergrößert wird deshalb allein die unsichtbare Fläche (`::after` mit
`min-width/min-height: 44px`). Vorher nachgemessen: **keines** der 69 Elemente hat ein
`::after` oder `::before` mit Inhalt, und **keines** kappt seinen Überlauf — sonst hätte die
Regel Haken, Abzeichen und Pfeile gelöscht.

Bewusst **keine** Sammelregel auf `button, .pressable`: bei untereinanderliegenden Knöpfen
mit weniger als 14 px Abstand überlappen sich die Flächen, und dann fängt der im DOM spätere
Knopf die obere Kante seines Nachbarn ab. Aus der Verbesserung wäre ein Klick-Diebstahl
geworden. Gemessen: **0 von 140** Knöpfen verdeckt.

### 34.6 Vier eigene Messfehler, alle im Kopf der Suite festgehalten

| Fehler | Falscher Befund |
|---|---|
| `elementFromPoint` liefert außerhalb des Fensters `null` | 68 Phantom-Klickdiebstähle |
| Innere Scrollkästen übersehen (`#passList` steht auf `scrollTop: 240`) | 9 „verdeckte" HOLEN-Knöpfe — widerlegt, indem einer nach `scrollIntoView` angeklickt wurde |
| `border-radius: inherit` machte die neue Trefferfläche zum **Kreis** | 27 von 28 Zielen scheinbar zu klein (die Ecken angetastet) |
| `scrollWidth` zählt überstehende Kinder mit, auch das neue `::after` | das „×" des Ausblenden-Knopfes galt als abgeschnitten |

Dazu vier **tote Selektoren** (`.gchip`, `.frtab`, `.socbtn`, `.commcard`), die es im Baum
gar nicht gibt — geraten statt nachgesehen. Sie kosten keine Leistung, aber sie lügen: wer
sie liest, glaubt, die Flächen seien versorgt.

### 34.7 Der Bildschirmvergleich braucht einen Rauschboden

Der Nachweis „der Token-Umbau ändert kein Pixel" lief über einen Aufnahmevergleich. Acht von
16 Ansichten unterscheiden sich aber **zwischen zwei identischen Läufen** — sie animieren.
Ohne diesen Kontrolllauf hätte der Vergleich acht Änderungen gemeldet, die keine sind.

> **Merksatz:** Ein Bildvergleich ohne Rauschboden misst die Uhr, nicht die Änderung.

**Aufwand: L** · **Priorität: 1** · erledigt
