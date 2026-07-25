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

**Trigger:** BATTLE-Button. **Abschluss:** unten fixierter **`Okay`**-Button.
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

### 18.3 „Offline Earnings" — beobachtet, bewusst nicht gebaut

Gold **und** XP pro Stunde Abwesenheit, Deckel 8 h, „Quick Earnings" gegen Werbung oder Gems,
eigenes Popup direkt nach dem Login-Kalender. Vollständige Bewertung samt der drei Gründe gegen
eine Übernahme (Gold ist unser Endgame-Bottleneck · drei gestapelte Start-Popups · Werbung ist
im Projekt ausgeschlossen) und der Skizze einer verträglichen Variante:
`GAMEPLAY_OPTIMIERUNG.md` §10.
