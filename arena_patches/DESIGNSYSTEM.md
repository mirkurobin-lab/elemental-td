# Arcane Prism TD — Design-System

Eine Regel gilt, wenn sie **getestet** ist. Jeder Abschnitt hier nennt darum die
Prüfung, die ihn hält. Regeln ohne Prüfung sind Absichtserklärungen und rutschen
innerhalb weniger Wochen zurück.

Suiten: `run_v5.js` (92), `run_v6.js` (273), `run_v7.js` (225) — zusammen **590
Checks**. Ausführen:
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_vN.js`

---

## 1. Material und Licht

**Die eine Regel: Licht kommt von oben.** Ausnahmslos, über alle Screens.

| Fläche | Kanten | Token |
|---|---|---|
| erhaben | helle Oberkante, dunkle Unterkante | `--mat-raised` |
| erhaben, groß | dito, kräftiger, plus Verdeckung unten | `--mat-raised-lg` |
| eingesenkt | Schatten von oben hinein, Bounce-Licht unten | `--mat-well` |
| gedrückt | eingesenkt plus 1 px Versatz nach unten | `--mat-sunken` |

Bausteine: `--lit` `--lit-2` `--unlit` `--ao` `--rim` `--sunk` `--sunk-2`.
**Benutzt werden die fertigen Materialien, nicht die Bausteine.**

Gemessen vor dem Durchgang trugen **89 %** der sichtbaren Fläche keine Tiefe,
danach **5 %** (schwächste einzelne View: 16 %). Das war der eigentliche Abstand zu AA — nicht Bewegung (AAs
Meta-UI ist praktisch statisch, `AA_UI_REFERENZ` §20.2) und nicht mehr die Icons.

> **Geprüft:** zwei Kennzahlen — „Höchstens 15 % der sichtbaren Fläche ohne
> Tiefe" **und** „Auch die schwächste einzelne View bleibt unter 25 %". Der
> zweite Check ist der wichtigere: der Mittelwert stand bei 12 %, während die
> **Startseite** — der Screen, den man beim Öffnen zuerst sieht — bei **64 %**
> lag. Ein Durchschnitt ist kein Qualitätsversprechen.
> Zusammen haben die beiden Checks vier Dinge aufgedeckt, die meine Handmessung
> übersehen hatte: `.lbrow` (29 % der App-Fläche, Rangliste war beim Messen
> nicht gerendert), dann die Startseite, dann Pack (100 %), Schmiede (36 %) und
> Pass (25 %). Dazu vier Checks auf die Token-Form.

**Warum einklassige Selektoren.** Der Material-Durchgang am Ende des `<style>`
nutzt ausschließlich einklassige Regeln. Zustandsregeln sind zweiklassig
(`.tile.sel`, `.prodcard.gem`) und gewinnen über die Spezifität, unabhängig von
der Reihenfolge. Der Durchgang kann so keinen Zustand überschreiben.
Zwölf Zustandsregeln, die den Schatten *ersetzten* statt zu ergänzen, tragen das
Material jetzt selbst mit (`box-shadow:var(--mat-raised),<eigener Glow>`).

## 2. Schatten

Sechs Stufen: `--sh-1` bis `--sh-5` plus `--sh-press`. Vorher standen **105
verschiedene** `box-shadow`-Definitionen im Blatt.

## 3. Maß und Abstand

`--banner-h:72` `--banner-h-sm:56` `--banner-h-lg:128` `--keyart-h:172` ·
`--tile:84` · `--gap:8` `--gap-lg:12` · `--radius:14` `--radius-sm:10` ·
`--pad:12`

Jede neue Reihe wählt **eine** dieser Höhen und **einen** dieser Radien. Keine
Zwischenwerte. Begründung der vierten Höhe in `AA_UI_REFERENZ` §19.4.

> **Offen:** 31 verschiedene Radien und 40 verschiedene Schriftgrößen sind noch
> im Blatt (P1 hat Material gelöst, nicht die Typo-Leiter). Siehe §8.

## 4. Farbe

Basis `--bg` `--panel` `--panel2` `--line` `--txt` `--dim` `--top`.
Rollen `--up` `--gold` `--danger`.
Währungs-Identität: Gold bleibt Gold, Gems sind **Smaragdgrün** (`--gemc`) —
bewusste Abgrenzung von AA, wo Gems magenta/blau sind. Dieselbe Farbe trägt
Icon, Zahl in der Top-Bar, Preis und Produktkarte.

**Verbot:** niemals `.goldtext` auf helle oder goldene Flächen. Diese Bugklasse
hat dreimal zugeschlagen.

> **Geprüft:** „Keine helle Schrift auf goldener Fläche in irgendeiner View" und
> „Siegel/Badges/Goldknöpfe/Ribbon-Text tragen dunkle Schrift".

## 5. Bewegung

Drei Kurven, drei Dauern: `--ease-out` `--ease-in-out` `--ease-overshoot` ·
`--t-fast:.12s` `--t-mid:.22s` `--t-slow:.34s`.
Alles Anfassbare nutzt `.pressable` und damit dieselbe Kurve.

Wischen zwischen den fünf Hauptzielen: Richtung der ersten Fingerbewegung
entscheidet und hält bis zum Loslassen; querscrollende Reihen behalten die Geste
nur, solange sie noch Weg haben; am Ende der Reihe federt der View.

> **Geprüft:** 12 Wisch-Checks, unter anderem „Senkrechte Geste wechselt die
> View nicht" und „Querscroller am Ende gibt die Geste an den View ab".

## 6. Icons

174 registrierte Assets in `ui_assets.json`, alle gegen dasselbe Style-Sheet
(Job `22646ce4`) generiert. Jedes Icon hat eine **Emoji-Rückfallebene** —
antwortet das CDN nicht, steht das Emoji.

**Die 20-px-Regel:** ein Icon muss in seiner *Anzeigegröße* lesen. Unterhalb von
20 px tragen nur Farbe und Silhouette. Vor der Aufnahme wird jedes Icon bei
20/26/110 px gegengeprüft. So fiel der alte Goldtaler auf (bei 20 px ein beiger
Punkt) und so fiel die goldene Krone auf goldenem Sockel auf (Kontrast **2,47:1**,
unter der 3:1-Schwelle; nach der Korrektur 7,12:1).

> **Geprüft:** „Kein leeres Bildfeld", „Icon-Ebene flächendeckend im Einsatz",
> „Verdient und offen nutzen dasselbe Kronen-Artwork".

## 6b. Banner-Passung

**Artwork wird nie gestreckt.** `background-size` der Artwork-Ebene ist `cover`,
niemals `100% 100%`. Gemessen über alle Views waren Bannergrafiken auf fremde
Seitenverhältnisse gequetscht:

| Element | Grafik | Fläche | Verzerrung |
|---|---|---|---|
| `.packbtn` | 0,67 (hochkant) | 6,10 | **9,1×** |
| `.progbar` | 1,79 | 13,50 | **7,5×** |
| `.pcfrm` | 0,75 | 3,14 | **4,2×** |
| `.title` | 2,36 | 9,15 | **3,9×** |
| `.secribbon` | 1,79 | 5,59 | **3,1×** |
| `.qcard` / `.clanhead` | 1,34 | 3,2 | **2,4×** |

Bei einem Band heißt das: die Zierenden werden zu Schlieren gestaucht, die Mitte
flach gezogen — es liest sich als **leere Leiste**. Genau der Befund „der Banner
wird nicht aufgefüllt".

Zwei Ursachen, beide behoben:
1. `background-size:100% 100%` auf der Artwork-Ebene.
2. Bei `.qcard`, `.clanhead`, `.trackbanner`: **vertauschte Ebenen**
   (`100% 100%,cover`). `layer()` setzt das Artwork **vorne** ein, das Strecken
   traf also genau die Grafik. Die Reihenfolge ist immer `cover,100% 100%` —
   Artwork deckt, Farbplatte füllt und bleibt Textgrundlage.

**Die eine Ausnahme:** ein **Rahmen** muss auf die Kante gezogen werden, sonst
fehlt genau der Rand, der ihn zum Rahmen macht. Solche Elemente tragen
`rahmen-fuellt` — die Ausnahme ist benannt, statt die Regel zu verwässern.

**Das Band umschließt seinen Text.** `.secribbon` war über die volle Spaltenbreite
gezogen: 366 px Fläche bei 105 px Text = **12 % Füllung** (kleine Variante 7 %).
Jetzt `width:fit-content` mit `min-width`, gemessen 37–55 % Füllung bei maximal
308 px Breite. Der Zusatz (`.srx`) läuft im Fluss mit, damit das Band seine
Breite korrekt mitrechnet.

> **Geprüft:** „Keine Bannergrafik wird gestreckt (Artwork-Ebene nie 100 % 100 %)"
> über 13 Views, und „Sektionsband umschließt seinen Text".

**P3 kennt jetzt seine Zielverhältnisse.** Die richtige Lösung ist nicht `cover`,
sondern **9-Slice** (`border-image`) oder Grafiken, die im Zielverhältnis erzeugt
werden. Die Tabelle oben nennt die benötigten Verhältnisse pro Element.

## 7. Auslieferung

| | vorher | nachher |
|---|---|---|
| Bild-Bytes pro Seitenladung | 82,78 MB | **0,59 MB** |
| alle 158 Assets | 210,97 MB | 1,98 MB |
| Ladezeit bis `load` | 2630 ms | 697 ms |

Jedes `<img>` trägt `loading="lazy"` und `decoding="async"` — das begrenzt die
**Anzahl** (17 Views liegen gleichzeitig im DOM). Die **Größe** löst der
Bildschritt vor der Auslieferung, dokumentiert in `HANDOFF.md`.

**Nicht übernehmen:** die Unity-Empfehlung „Assets immer größer erzeugen als
nötig, Panels mit 4096 px". Dort kommen die Bilder offline komprimiert mit der
App, bei uns geht jedes Byte über die Leitung.

> **Geprüft:** „Jedes Bild trägt `loading=lazy`" und „… `decoding=async`" über
> alle `<img>` — beim ersten Anlauf liefen 15 von 48 an den Helfern vorbei.

## 8. Was noch offen ist

| Paket | Inhalt | Stand |
|---|---|---|
| P2 | Zustandsmatrix je Knopfklasse: normal / pressed / disabled / loading / selected | `selected`, `loading`, `hover` gibt es **null** mal |
| P3 | Fassungen als Assets: 9-Slice-Panel-Platte, Kartenrahmen je Rarität, Bannerplatte | offen — **Zielverhältnisse jetzt gemessen, siehe §6b** |
| P4 | Bewegungssprache: Overshoot, Squash, Hochzählen, Belohnungs-Choreografie | Tokens stehen, Choreografie fehlt |
| — | Typo-Leiter: 40 Schriftgrößen auf 8 benannte Stufen | offen |
| — | Radien: 31 auf 4 | offen |
| — | Fehlende Komponenten: Tooltips, gestaltete Scrollbars, Health/Mana-Balken, Damage-Zahlen, Freunde, Kampagne, Benachrichtigungssystem, Ladezustände | offen |

**Regel für alles Neue:** eine Änderung am Design-System ohne begleitenden Check
ist nicht fertig. Sonst steht in sechs Wochen wieder 89 % ohne Tiefe im Blatt und
niemand weiß, wann es passiert ist.
