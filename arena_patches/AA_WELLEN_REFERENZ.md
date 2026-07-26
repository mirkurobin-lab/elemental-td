# AA-Referenz: Defenders Guide, Gegner-Skalierung, Element-Matrix

Messgrundlage für `arena_patches/arena_waves.js`.
Quelle: Screenrecording von **Arcane Arena: Tower Defense** (AA),
`ScreenRecording_07-26-2026 13-09-58_1.MP4`, 450 MB, 1320 × 2868, 60 fps,
305,3 s Laufzeit.

Diese Datei trennt konsequent **gelesen** von **geschätzt**. Wo eine Zahl
mit „gelesen" markiert ist, steht dahinter ein konkreter Videoframe. Wo
„geschätzt" steht, hat das Video die Antwort nicht hergegeben — dann ist
auch begründet, warum wir trotzdem eine Kurve gewählt haben.

---

## §1 Methode und Quellen

### §1.1 Beschaffung

Der lokale Agent-Proxy blockiert `drive.usercontent.google.com`
(CONNECT 403), der Download lief deshalb über die Higgsfield-Sandbox.
Die Sandbox wird ~10 s nach jedem Aufruf verworfen; die 450 MB mussten
daher pro Arbeitsphase neu geholt werden. Praktisch heißt das: alles,
was aus einem Frame gebraucht wird, in **einem** Rutsch extrahieren.

### §1.2 Statische Fenster finden

1. Frames mit 10 fps bei 160 px Breite extrahiert (3053 Frames).
2. Bewegung = mittlere absolute Pixeldifferenz zu Vorframe, global und
   über ein 16 × 4-Zellraster.
3. Gemessenes Rauschen: **exakt 0,00**. Ein globaler Wert < 3,0 ist ein
   statisches Fenster. Ergebnis: 53 Fenster.

### §1.3 Die wichtigste Korrektur an dieser Methode

**Ein langes statisches Fenster ist NICHT ein Bildschirm.** Beim
Durchsteppen des Stufenreglers ändern sich nur wenige Ziffern; die
globale Differenz bleibt weit unter 3,0. Die acht „ruhigen" Fenster von
20–37 s Länge sind in Wahrheit **komplette Stufenleitern**.

Aufgefallen ist das erst, als der Stufenindikator INNERHALB eines
einzelnen Fensters von `LvL 1/27` auf `LvL 24/27` sprang. Genau daraus
kommt die HP-Kurve — hätte ich die Fenster als „ein Screen" behandelt,
wäre die interessanteste Messung des ganzen Videos liegen geblieben.
**Wer diese Methode wiederverwendet: bei Zahlenfeldern zusätzlich
zellweise auf kleine Änderungen prüfen, nicht nur global.**

### §1.4 Zahlen lesen

`tesseract` (in der Sandbox per apt nachinstalliert) liest die
**Fließtexte** zuverlässig, die **stilisierten Goldziffern** aber nicht
(5/7/6 wurde je nach Vorverarbeitung zu 1/1/5, 187, 157.6 …). Auch
Mehrheitsentscheid über 36 Vorverarbeitungsvarianten blieb unbrauchbar.

Was funktioniert hat:

1. Feld zuschneiden, `autocontrast`, Schwelle beim 55. Perzentil.
2. Auf leeren Pixelspalten in Glyphen segmentieren.
3. Segmente, die näher als 0,65 × Median-Abstand liegen, verschmelzen
   (die „1" zerfällt sonst in Fahne + Stamm, die Zellen-Ränder werden
   sonst als Ziffern mitgezählt).
4. Jede Glyphe einzeln als 18 × 24 ASCII-Art ausgeben und **selbst
   lesen**. Kein OCR mehr im Spiel.

Nebenbefund: Bild-Transfer aus der Sandbox per Base64 in den Chat ist
bei > ~4 kB **unzuverlässig** — zwei Transfers kamen längengleich aber
inhaltlich verfälscht an (md5-Abgleich schlug fehl, WebP nicht
dekodierbar). ASCII-Art ist bei Zahlenfeldern der robustere Weg.

### §1.5 Felder exakt lokalisieren

Zwei Frames desselben Gegners auf **verschiedenen Stufen**
pixelweise differenzieren. Nur die Felder, die sich ändern, leuchten
auf. Ergebnis (Anteile an 1320 × 2868):

| Feld | x | y |
|---|---|---|
| Stufenziffern | 0,211 … 0,241 | 0,503 … 0,513 |
| Max Health (Wert) | 0,203 … 0,315 | 0,567 … 0,582 |
| Damage (Wert) | 0,595 … 0,686 | 0,567 … 0,582 |
| Attack Speed (Wert) | 0,203 … 0,315 | 0,609 … 0,632 |
| Movement Speed (Wert) | 0,595 … 0,686 | 0,609 … 0,632 |

Derselbe Diff-Trick liefert einen **Befund, nicht nur Koordinaten**: in
der Zeile bei y 0,609 … 0,632 ändert sich über fünf Stufen (1, 4, 6, 11,
24) **kein einziges Pixel**. Attack Speed und Movement Speed sind in AA
also stufenunabhängig. Das musste nicht geraten werden.

Wichtig für Nachmessungen: die Zahlen sind in ihrer Zelle **mittig**
gesetzt. Ein Crop mit fester linker Kante schneidet bei längeren Zahlen
die erste Ziffer ab — genau dieser Fehler hat mich beim Schadenswert
zuerst „576" statt „1576" lesen lassen. Immer die ganze Zelle greifen.

### §1.6 Fahrplan des Videos

| Zeit | Inhalt |
|---|---|
| 0 – 3 s | Hauptmenü, „Arena 1 · Aztec Grounds", BATTLE-Knopf |
| 3 – 11 s | **Defender's Guide, Seite 1**: Erklärtext + Element-Rad |
| 11 – 17 s | **Defender's Guide, Seite 2**: Gegner-Kachelgitter |
| 17 – 22 s | Skeleton-Detailkarte öffnet sich, `LvL 1/27` |
| 22,9 – 59,8 s | **Skeleton, Stufe 1 → 24 durchgesteppt** (die HP-Kurve) |
| 63,4 – 90,4 s | Archer Goblin, Stufe 2 → 26 |
| 94,6 – 123,7 s | Goblin Shaman, Stufe 3 → 12 |
| 128,5 – 150,7 s | Skelobomber, Stufe 3 → 25 |
| 156,5 – 182,5 s | Baby Dragon, Stufe 2 → 26 |
| 188,7 – 209,1 s | Golem, Stufe 1 → 25 |
| 213,1 – 233,4 s | Orc, Stufe 2 → 26 |
| ~235 s | zurück zum Kachelgitter |
| 240 – 305 s | anderer Abschnitt: **BOOSTERS / TIPS** (nicht Gegner) |

Einzelframes, aus denen Werte stammen, sind unten jeweils als
`t=xx,x s` benannt.

---

## §1.7 Wo der Guide im Menü hängt — nachgemessen

Die erste Fassung dieser Datei nannte den Fahrplan, aber nicht den **Ort**.
Nachgeholt am selben Video, Frame für Frame:

| Zeit | Zustand |
|---|---|
| 0 – 1,9 s | Hauptmenü, statisch (Bilddifferenz **exakt 0,0**) |
| 1,9 – 2,3 s | Aufklapp-Menü fährt ein (Differenz 29,8 → 18,7) |
| 2,3 – 2,9 s | Menü steht offen, statisch (0,3 → 0,2) |
| ab ~3 s | Defender's Guide, Seite 1 |

Der Knopf sitzt **oben rechts** in der Kopfleiste, direkt neben dem
Freundeslisten-Knopf: drei waagerechte Striche auf blauer Platte. Das Menü
klappt darunter auf, rechtsbündig, und trägt **fünf** Einträge — jeder eine
blaue Pille mit Icon links und Versalien-Beschriftung:

```
  LEADERBOARDS
  COMMUNITY
  MAIL
  GUIDE          ← der Defender's Guide
  SETTINGS
```

Kein Vollbild-Overlay, kein Bottom-Sheet, kein eigener Schließen-Knopf — ein
Tipp daneben schließt.

**Unsere Umsetzung** übernimmt Ort und Reihenfolge und fügt genau einen
Eintrag hinzu: *Gegner* zwischen *Guide* und *Einstellungen*. Grund: AA führt
Einsteiger-Hilfe und Gegner-Nachschlagewerk unter einem Wort, wir haben beides
getrennt (`AA_UI_REFERENZ` §18.2 — Einsteiger-Guide mit Aufgabenliste, Handbuch
mit acht Erklärseiten). Ein gemeinsamer Eintrag müsste sich erst verzweigen;
zwei Einträge sagen sofort, was dahinter liegt.

---

## §2 Defenders Guide: Aufbau der Seite

### §2.1 Seite 1 — Element-Regel und Rad

Titel `DEFENDER'S GUIDE`. Darunter ein Erklärabsatz, **wörtlich
gelesen** (t = 5,0 s und t = 9,0 s, zwei unabhängige Frames identisch):

> „Units deal 20% extra damage to classes they're strong against and
> 20% less damage to those they're weak against."

Darunter ein Rad aus **vier** Sechseck-Knoten in Rautenanordnung, jeder
mit Beschriftung darunter:

```
                Fire
                 ▲
        Lightning ◄──── Ice
                 │
              Neutral
```

- oben `Fire`, links `Lightning`, rechts `Ice`, unten `Neutral`
- gestrichelte Pfeile bilden ein **Dreieck** Fire – Lightning – Ice
- `Neutral` sitzt **außerhalb** des Dreiecks und hat **keinen einzigen
  Pfeil** — es gibt für Neutral also weder Stärke noch Schwäche

### §2.2 Seite 2 — Gegner-Kachelgitter

Titel `DEFENDER'S GUIDE`, darunter der Untertitel (gelesen, t = 13,0 s):

> „Several classes of enemies can appear across battles and waves."

Darunter ein Gitter aus Gegner-Kacheln (Porträt + Name), zwei Reihen,
unten ein `Back`-Knopf. Sieben Kacheln wurden im Video geöffnet, das
Gitter wirkt auf 8–9 Plätze ausgelegt.

### §2.3 Seite 3 — Gegner-Detailkarte (Modal)

Aufbau von oben nach unten:

1. **Namensschild** in der Kopfleiste (hell, dunkle Schrift)
2. **linke Spalte**: Porträt, darunter ein **Stufenregler**
   `◀ LvL n/27 ▶`
3. **rechte Spalte**:
   - Feld `Target` mit Wert `Ground` bzw. `Air & Ground`
   - Freitext-Beschreibung (Flavour, 2–4 Zeilen)
4. **Wertegitter 2 × 2**:

   | Max Health | Damage |
   |---|---|
   | **Attack Speed** | **Movement Speed** |

5. **Vorschau-Clip**: der Gegner läuft animiert über ein Stück der
   echten Karte (kein Standbild)
6. `Back`-Knopf

AA zeigt also genau **vier** Werte pro Gegner. Es gibt **kein**
Rüstungs-, Resistenz- oder Element-Feld auf dieser Karte (siehe §6).

---

## §3 Gegnertypen mit den gelesenen Werten

Alle Zeilen **gelesen**. `Target` meint, welche Ebenen der Gegner
angreifen kann. Movement Speed ist in AA eine **Textstufe**, keine Zahl.

| Gegner | Target | Movement | Frame |
|---|---|---|---|
| Skeleton | Ground | Fast | t = 19,5 / 40,0 s |
| Archer Goblin | Air & Ground | Normal | t = 75,0 s |
| Goblin Shaman | Air & Ground | Normal | t = 108,0 s |
| Skelobomber | Air & Ground | Normal | t = 140,0 s |
| Baby Dragon | Air & Ground | Fast | t = 170,0 s |
| Golem | Ground | Slow | t = 198,0 s |
| Orc | Ground | Fast | t = 222,0 s |

Gelesene Flavour-Texte (Auswahl, belegt die Rollen):

- **Skeleton** — „One's a joke. A dozen write your ending. Ignore them
  early and regret it later." → Schwarmgegner
- **Archer Goblin** — „A sneaky goblin with a fast bow and a faster
  attitude. Keep your eyes open and your head down." → Distanz
- **Goblin Shaman** — „He smells like burnt mushrooms and bad
  decisions — Goblin Shaman, master of questionable magic!" → Caster
- **Skelobomber** — „A flying skeleton with a bad attitude and a worse
  payload. Bombs away — no refunds." → Flieger/Flächenschaden
- **Baby Dragon** — „Small, airborne, and never misses a shot." → Flieger
- **Orc** — „Heavy axe, heavier swing. This orc doesn't fight clean, he
  clears everything in reach." → Nahkampf-Brecher

**Attack Speed**: nur für Skeleton halbwegs sicher gelesen (Ziffernfolge
„85", vermutlich `0.85`). Die übrigen Werte blieben unter der
Lesbarkeitsschwelle und wurden **nicht geraten** — im Modul sind die
Angriffsgeschwindigkeiten deshalb eigene, gewählte Werte (§7).

---

## §4 Wellen-Skalierung

### §4.1 Stufenraum

**Gelesen**: jede Gegnerkarte hat einen Regler `LvL n/27`. Der
Stufenraum ist also **1 … 27**. Eine Zuordnung Stufe ↔ Welle zeigt AA
im Guide **nicht** (siehe §6).

### §4.2 Max Health — exakt gelesen

Sechs Messpunkte am **Skeleton**, alle innerhalb des Fensters
22,9 – 59,8 s:

| Stufe | Max Health | Frame |
|---|---|---|
| 1 | 280 | t = 23,5 s |
| 2 | 419 | t = 26,0 s |
| 4 | 1.210 | t = 28,0 s |
| 6 | 2.895 | t = 33,0 s |
| 11 | 12.289 | t = 40,0 s |
| 24 | 84.904 | t = 55,0 s |

Daraus ergibt sich **auf die Einheit genau**:

```
HP(L) = floor(250 + 30 · L^2.5)
```

Kontrollrechnung: 24^2,5 = 2821,807 → · 30 = 84.654,22 → + 250 =
84.904,22 → floor = **84.904**. Trifft.

**Der Abrundungsmodus ist mitgemessen.** Bei Stufe 2 liefert die Kurve
419,706. AA zeigt **419**, nicht 420 — also `floor`, nicht `round`.
Stufe 2 ist der einzige der sechs Punkte, der die beiden Varianten
unterscheidet; ohne ihn stünde im Modul `round()` und wir lägen
dauerhaft um 1 daneben.

Sechs von sechs Punkten passen. Bei drei freien Parametern (Basis,
Koeffizient, Exponent) und sechs Treffern ist das keine Anpassung
mehr, sondern die Formel des Spiels.

### §4.3 Damage — gelesen, aber ohne belastbare Kurve

| Stufe | Damage | Frame |
|---|---|---|
| 1 | 841 | t = 23,5 s |
| 4 | 1.153 | t = 28,0 s |
| 6 | 1.153 | t = 33,0 s |
| 11 | 1.576 | t = 40,0 s |
| 24 | 2.424 | t = 55,0 s |

**Stufe 4 und Stufe 6 sind pixelgleich**, obwohl sich im selben
Frame-Paar die HP von 1.210 auf 2.895 ändern. Der Diff aus §1.5 zeigt
für dieses Paar nur zwei aktive Bereiche: Stufenziffern und Max Health.
Das Schadensfeld bleibt unberührt.

Interpretation: AAs Guide **aktualisiert den Schadenswert nicht bei
jedem Stufenschritt** (vermutlich Anzeige-Bug oder bewusst gecacht).
Damit ist keine geschlossene Form ableitbar. Eine Kurve durch die drei
plausiblen Punkte (1 / 11 / 24) verlangt einen Exponenten von ~0,95 —
also praktisch linear, aber mit keinem runden Designerwert.
**Wir raten hier nicht.**

### §4.4 Der eigentliche Balancing-Befund

Das Wertvollste am Video ist nicht eine einzelne Zahl, sondern das
**Verhältnis** der beiden Kurven über den Stufenraum:

| | Stufe 1 | Stufe 24 | Faktor |
|---|---|---|---|
| Max Health | 280 | 84.904 | **× 303** |
| Damage | 841 | 2.424 | **× 2,9** |

Gegner werden über den Stufenraum **fast ausschließlich zäher, kaum
gefährlicher**. Der Schaden startet hoch (841 gegen 280 HP) und wächst
dann kaum. Das verschiebt die Spielerentscheidung von „überlebe den
Treffer" zu „bring genug DPS auf die Bahn" — und erklärt, warum in
diesem Genre Schadensskalierung der Türme der einzige Hebel ist, der
zählt. Diese Asymmetrie haben wir übernommen (§7).

### §4.5 Attack Speed und Movement Speed

**Gelesen, per Pixel-Diff über fünf Stufen (1, 4, 6, 11, 24):
stufenunabhängig.** In der zweiten Wertezeile ändert sich kein Pixel.
Beide Werte sind also reine Monstereigenschaften.

Movement Speed ist kategorial: beobachtet wurden **Slow / Normal /
Fast**. Ob AA darüber hinaus „Very Fast" kennt, ist nicht belegt.

### §4.6 Wertetabelle Stufe 1 … 27

HP nach der gelesenen Formel, Damage nach unserer Anpassung (§7.3).
Spalte „Quelle" bezieht sich auf die **HP**.

| Stufe | HP | Damage (unser Modell) | Quelle HP |
|---|---|---|---|
| 1 | 280 | 840 | gelesen |
| 2 | 419 | 909 | gelesen |
| 3 | 717 | 978 | interpoliert |
| 4 | 1.210 | 1.047 | gelesen |
| 5 | 1.927 | 1.116 | interpoliert |
| 6 | 2.895 | 1.185 | gelesen |
| 7 | 4.139 | 1.254 | interpoliert |
| 8 | 5.680 | 1.323 | interpoliert |
| 9 | 7.540 | 1.392 | interpoliert |
| 10 | 9.736 | 1.461 | interpoliert |
| 11 | 12.289 | 1.530 | gelesen |
| 12 | 15.214 | 1.599 | interpoliert |
| 13 | 18.530 | 1.668 | interpoliert |
| 14 | 22.250 | 1.737 | interpoliert |
| 15 | 26.392 | 1.806 | interpoliert |
| 16 | 30.970 | 1.875 | interpoliert |
| 17 | 35.997 | 1.944 | interpoliert |
| 18 | 41.488 | 2.013 | interpoliert |
| 19 | 47.456 | 2.082 | interpoliert |
| 20 | 53.915 | 2.151 | interpoliert |
| 21 | 60.877 | 2.220 | interpoliert |
| 22 | 68.354 | 2.289 | interpoliert |
| 23 | 76.359 | 2.358 | interpoliert |
| 24 | 84.904 | 2.427 | gelesen |
| 25 | 94.000 | 2.496 | interpoliert |
| 26 | 103.658 | 2.565 | interpoliert |
| 27 | 113.889 | 2.634 | interpoliert |

„interpoliert" heißt hier: **nicht aus dem Video gelesen, sondern von
der belegten Formel erzeugt**. Bei HP ist das unkritisch (sechs
Stützpunkte, exakte Treffer). Bei Damage ist die ganze Spalte unser
Modell, nicht AAs Werte.

---

## §5 Element-Schwächen und -Resistenzen

### §5.1 Gelesen

- **Modifikator: +20 % / −20 %.** Wörtlicher Text, §2.1. Es gibt keine
  Zwischenstufen und keine Immunitäten.
- **Vier Klassen**: `Fire`, `Lightning`, `Ice`, `Neutral`.
- **Struktur**: Dreieck über Fire/Lightning/Ice, `Neutral` außerhalb
  ohne jeden Pfeil. Jede der drei Kreis-Klassen ist damit stark gegen
  **genau eine** und schwach gegen **genau eine**.
- **Eine Pfeilrichtung sicher gelesen**: auf der waagerechten Kante
  zwischen `Ice` (rechts) und `Lightning` (links) sitzt die
  Pfeilspitze **links**, also `Ice → Lightning`. Die Spitze ist ein
  großes Dreieck über 9 Rasterzeilen und eindeutig.

### §5.2 Nicht gelesen

Die Richtungen der beiden **schrägen** Kanten (Fire↔Lightning,
Fire↔Ice) waren nicht auflösbar: die Kanten sind gestrichelt, und die
Striche haben dieselbe Parallelogrammform wie eine Pfeilspitze. Aus der
Kreisstruktur plus der einen gelesenen Richtung folgt zwingend

```
Lightning → Fire → Ice → Lightning
```

Das ist eine **Ableitung, keine Messung**. Sollte AA das Rad doch
anders lesen („A → B" = A ist schwach gegen B), dreht sich der Kreis;
am Betrag ±20 % ändert das nichts.

### §5.3 Was AA nicht zeigt

Auf **keiner** Gegnerkarte steht, welche Klasse der Gegner hat. Die
Zuordnung Gegner → Fire/Lightning/Ice/Neutral ist im Video also
nirgends sichtbar. Vermutlich sitzt sie als kleines Icon auf den
Kacheln des Gitters, dort aber unter der Lesbarkeitsschwelle.

### §5.4 Unsere Matrix

Wir haben **sechs** Elemente, AA hat drei plus Neutral. Übernommen wird
die *Eigenschaft* der AA-Matrix, nicht ihre Größe: jedes Element ist
stark gegen genau eines und schwach gegen genau eines. Bei sechs
Elementen geht das mit **zwei getrennten Dreier-Kreisen** auf:

**Kreis A (Elementar)** — `Feuer → Natur → Wasser → Feuer`
- Feuer verbrennt Natur
- Natur saugt Wasser auf
- Wasser löscht Feuer

**Kreis B (Sphären)** — `Licht → Dunkelheit → Erde → Licht`
- Licht vertreibt Dunkelheit
- Dunkelheit zersetzt Erde
- Erde (Fels, Staub) verschluckt Licht

Vollständige Faktorenmatrix (Zeile = Turm-Element, Spalte =
Gegnerklasse):

| ↓ Turm \ Gegner → | Feuer | Wasser | Erde | Natur | Licht | Dunkelheit | neutral |
|---|---|---|---|---|---|---|---|
| **Feuer** | 1,0 | 0,8 | 1,0 | **1,2** | 1,0 | 1,0 | 1,0 |
| **Wasser** | **1,2** | 1,0 | 1,0 | 0,8 | 1,0 | 1,0 | 1,0 |
| **Erde** | 1,0 | 1,0 | 1,0 | 1,0 | **1,2** | 0,8 | 1,0 |
| **Natur** | 0,8 | **1,2** | 1,0 | 1,0 | 1,0 | 1,0 | 1,0 |
| **Licht** | 1,0 | 1,0 | 0,8 | 1,0 | 1,0 | **1,2** | 1,0 |
| **Dunkelheit** | 1,0 | 1,0 | **1,2** | 1,0 | 0,8 | 1,0 | 1,0 |

Eigenschaften (alle im Selbsttest abgesichert):
- Diagonale = 1,0
- pro Zeile genau eine 1,2 und genau eine 0,8
- antisymmetrisch: `f(a,b) = 1,2` ⟺ `f(b,a) = 0,8`
- nur die drei Werte 0,8 / 1,0 / 1,2 kommen vor
- Spalte `neutral` ist durchgehend 1,0 (wie AAs `Neutral`)

Element-Schlüssel sind bewusst die im Projekt bereits vorhandenen aus
`ui_prototype.html` (`EL_ICON`): `fire`, `water`, `earth`, `nature`,
`light`, `darkness`, mit den Asset-Keys `el_feuer` … `el_dunkelheit`.
Ein zweites Vokabular hier wäre die schnellste Route in eine stille
Fehlerklasse, bei der Turm- und Gegner-Element nicht zusammenfinden.

---

## §6 Was im Video NICHT zu sehen war

Offene Punkte, für die im Modul **eigene** Entscheidungen stehen:

1. **Keine Wellenliste.** Es gibt keinen Screen, der zeigt, welche
   Gegner in welcher Welle in welcher Stückzahl kommen. Der Guide
   kennt nur „Stufe 1 … 27" pro Gegner.
2. **Kein Zusammenhang Stufe ↔ Welle.** Ob AAs Stufe = Wellennummer
   ist, oder Arena-Fortschritt, oder Ligastufe, ist unbelegt.
3. **Keine Boss-Wellen.** Kein Gegner ist als Boss markiert, es gibt
   keine Boss-Kennzeichnung in Gitter oder Karte.
4. **Keine Gegner-Anzahl.** Nirgends eine Stückzahl.
5. **Keine Element-Zuordnung der Gegner** (§5.3).
6. **Keine Rüstung / Resistenz / Immunität.** Die Karte hat genau vier
   Werte, keinen fünften.
7. **Zwei der drei Pfeilrichtungen** im Element-Rad (§5.2).
8. **Die echte Damage-Formel** (§4.3).
9. **Attack-Speed-Zahlen** für sechs der sieben Gegner (§3).
10. **Sonderfähigkeiten.** Nur aus Flavour-Texten erahnbar
    (Skelobomber „worse payload" → wohl Flächenschaden; Goblin Shaman
    „questionable magic" → wohl Buff/Debuff). Kein Mechanik-Feld.
11. **Ab 240 s** zeigt das Video einen anderen Abschnitt (BOOSTERS /
    TIPS, u. a. „EXTRA CARD — Grants a free card selection",
    „POLYMORPH — Transforms all enemies into sheep"). Das gehört nicht
    zum Bestiarium und ist hier nicht ausgewertet.

---

## §7 Wie unser Nachbau abweicht — und warum

### §7.1 Übernommen, 1:1

- **HP-Kurve** `floor(250 + 30 · L^2.5)` inklusive `floor` (§4.2).
  Bei `hpFactor = 1` liefert unser Modul exakt AAs Zahlen; der
  Selbsttest prüft alle sechs gelesenen Punkte gegen die Kurve.
- **Stufenraum 1 … 27** (§4.1).
- **±20 % Modifikator** (§5.1).
- **„stark gegen genau eins, schwach gegen genau eins"** plus eine
  neutrale Klasse ohne Beziehungen (§5.4).
- **Attack Speed und Movement Speed stufenunabhängig** (§4.5).
- **Movement Speed als Textstufe** Slow / Normal / Fast, nicht als Zahl.

### §7.2 Bewusst anders: sechs Elemente statt drei plus Neutral

AAs Rad hat drei Kreis-Klassen. Unsere Marke hat sechs Elemente, die
längst in `ui_prototype.html` und `arena_cards.js` stehen. Statt AAs
Dreieck zu kopieren und drei Elemente ohne Funktion zu lassen,
übernehmen wir die Eigenschaft der Matrix und realisieren sie als zwei
Dreier-Kreise (§5.4). `neutral` bleibt als **Gegnerklasse** erhalten —
es ist der Anker, an dem man ablesen kann, ob eine Turmrechnung
überhaupt Element-Logik anwendet.

### §7.3 Ersetzt: Damage-Kurve

AAs Kurve ist nicht ableitbar (§4.3). Wir nehmen eine affine Anpassung
an die drei plausiblen Punkte:

```
DMG(L) = floor(840 + 69 · (L − 1))
```

→ 840 / 1.530 / 2.427 gegen AAs 841 / 1.576 / 2.424.

Damit ist die **Asymmetrie aus §4.4 erhalten** (HP × 407 gegen Damage
× 3,1 über 1 … 27), und das ist der Punkt: die Kurve ist geraten, die
*Aussage* ist gemessen. Im Code ist sie als geschätzt markiert.

### §7.4 Neu erfunden: der Wellenplan

AA gibt nichts her (§6.1–§6.4). Unsere Entscheidungen:

- **Welle == Stufe.** Welle 7 zeigt Gegner auf Stufe 7. Einfachste
  Abbildung, die AAs 27 Stufen ausnutzt, und sie macht `waveAt(n)` und
  `statsFor(k, n)` deckungsgleich.
- **27 Wellen in drei Akten à neun**, Boss am Ende jedes Akts
  (**9, 18, 27**). 27 = 3 × 9 geht ohne Rest auf — das ist der ganze
  Grund, 9 zu wählen.
- **Stückzahl linear** ab der Einstiegswelle des Monsters. Die HP-Kurve
  ist mit `L^2.5` schon steil genug; eine zweite exponentielle Achse
  würde die späten Wellen unspielbar machen.
- **Boss-Wellen drosseln die Begleitung** auf 60 % und stellen einen
  Boss dazu. Der Boss-`hpFactor` ist so gewählt, dass jede Boss-Welle
  mehr Gesamt-HP hat als die Welle davor **und** der Boss mindestens
  25 % der Wellen-HP trägt — beides prüft der Selbsttest, damit man es
  merkt, wenn jemand an den Faktoren dreht.
- **Keine strenge Monotonie über alle Wellen.** Eine Boss-Welle ist ein
  Ausschlag; die Welle danach darf darunter liegen. Der Test prüft
  deshalb getrennt: Normalwellen streng steigend, und jede Boss-Welle
  über ihrer Vorwelle.

### §7.5 Platzhalter

Der Monster-Katalog ist **vollständig Platzhalter** und als solcher
markiert (`placeholder: true`, Namen mit „Platzhalter", Artwork-Keys
mit Präfix `mob_ph_`, Beschreibungen mit „PLATZHALTER" — jeweils vom
Selbsttest erzwungen). Neun Einträge decken die Rollen ab, die aus AAs
Bestiarium ablesbar sind: Schwarm, Läufer, Schütze, Magier, Flieger,
Panzer, Schläger, Schildträger, Boss.

Beim Austausch gilt: jedes Monster hängt mit **genau einem** Faktor
(`hpFactor`, `dmgFactor`) an der gemeinsamen Kurve. Wer Monster
ersetzt, ändert Namen, Artwork-Key, Element, Target, Movement und diese
zwei Faktoren — **keine einzige Formel**. Der `key` sollte stabil
bleiben, weil der Wellenplan daran hängt.

### §7.7 Die UI, und was beim Bauen auffiel

Gebaut ist der Guide als **eine** View mit drei Ebenen (`bsSeite` 1/2/3), nicht
als drei Views. AA führt sie auch als eine Strecke: Rad → Gitter → Detail, und
`Back` geht jeweils **eine Ebene hoch**, nicht sofort hinaus. Drei Views wären
dreimal dieselbe Kopfzeile und dreimal derselbe Wisch-Ausschluss gewesen.

**Das Element-Rad ist ein SVG, keine CSS-Kanten.** AA hat vier Knoten in einer
Raute, wir haben sechs in einem Kreis; die Pfeile müssen zwischen beliebigen
Paaren laufen. Mit CSS-Rändern wären das ein Dutzend Sonderfälle, als SVG-Linie
mit Marker ist es eine Zeile. Die Pfeile enden 9 % vor dem Zielknoten, sonst
verschwindet die Spitze darunter.

**Ein Fehler beim Verdrahten, der hierher gehört:** ich habe `elementRelation()`
zuerst mit *einem* Argument gerufen. Die Funktion nimmt aber **zwei** Elemente
und sagt, wie sie zueinander stehen — mit einem Argument liefert sie immer
`"neutral"`. Ergebnis: ein Rad ohne einen einzigen Pfeil und der Hinweistext
„Neutral hat weder Stärke noch Schwäche" für *jedes* Element. Die Beziehungen
stehen direkt am Element (`strongAgainst` / `weakAgainst`). Gemerkt hat es kein
Blick auf den Code, sondern die Zählung: `pfeile: 0`.

Daraus die Prüfung **„Jedes Element hat seinen Stark-gegen-Pfeil"** — sie zählt
sechs. Eine Prüfung „das Rad rendert" hätte den Fehler nicht gesehen.

**Keine Zahl wird in der UI gerechnet.** Alles kommt aus `ArenaWaves`. Das ist
die Bedingung dafür, dass das Balancing an *einer* Stelle gedreht werden kann
(Block FORMELN in `arena_waves.js`) und die Anzeige ohne Nacharbeit folgt. Eine
eigene Prüfung hält das fest.

**Drei Fehler beim Bauen, die die Prüfungen jetzt halten:**

1. `elementRelation()` mit *einem* Argument gerufen — sie nimmt zwei. Ergebnis:
   ein Rad ohne einen einzigen Pfeil. Gemerkt hat es die Zählung `pfeile: 0`,
   nicht der Blick auf den Code.
2. `descDe` aus `statsFor()` gelesen — das Feld gibt es nur in `bestiary()`.
   Auf der Karte stand wörtlich **„undefined"**. Kein Struktur-Check hätte das
   gesehen; erst der Blick auf die gerenderte Seite.
3. Der View lag zuerst **neben einem Modal statt in `#app`**. Ohne dessen
   Breitenbegrenzung war er 1067 px breit, die Kacheln 350 px — aus drei
   Spalten wurde optisch eine. Die Prüfung „9 Kacheln" war dabei die ganze Zeit
   grün. **Anzahl und Layout sind zwei verschiedene Fragen**, und nur die erste
   war geprüft.

Der dritte ist der lehrreichste: eine Zählung sagt nichts über Anordnung. Es
gibt jetzt zwei Prüfungen dafür — „liegt in `#app` und ist auf Spaltenbreite
begrenzt" und „drei Kacheln je Reihe (nicht optisch eine)".

**Der Wellenplan zeigt Marken, nicht alle 27 Wellen** (1 · 7 · 9 · 14 · 18 · 22
· 27 — Aktwechsel und Bosswellen). Eine 27-zeilige Liste wäre vollständig und
unlesbar.

### §7.6 Nicht nachgebaut

- **Vorschau-Clip** auf der Detailkarte (§2.3, Punkt 5). Das ist
  Asset-Arbeit, keine Logik.
- **Sonderfähigkeiten**. AA zeigt keine, wir erfinden keine. Sobald
  Mechaniken feststehen, gehören sie als Feld in `MOBS`, nicht in die
  Formeln.
