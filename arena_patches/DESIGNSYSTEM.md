# Arcane Prism TD — Design-System

Eine Regel gilt, wenn sie **getestet** ist. Jeder Abschnitt hier nennt darum die
Prüfung, die ihn hält. Regeln ohne Prüfung sind Absichtserklärungen und rutschen
innerhalb weniger Wochen zurück.

Suiten: `run_v5.js` (93), `run_v6.js` (273), `run_v7.js` (249) — zusammen **615
Checks**. Ausführen:
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_vN.js`

Dazu ein zweiter Prüfstand, `sicht.js`, der gegen die **Live-URL mit
tatsächlich geladenen Bildern** misst. Warum das kein Luxus ist, steht in §7b —
es ist die einzige Prüfung, die eine ganze Fehlerklasse überhaupt sehen kann.

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

## 6c. Fassungen und Bänder: 9-Slice, nicht Bildfläche

**Alle elf generierten Rahmen- und Plattendateien sind vollständig deckend.**
Gemessen: `Alpha min/max 255/255`, **0,0 %** transparente Pixel. Beim orangen
Kartenrahmen hat der Generator die „transparente" Mitte sogar als
Transparenz-Schachbrett hineingemalt — 44 % der Bildfläche.

| | Datei | Alpha | transparent | Füllung beginnt |
|---|---|---|---|---|
| `frame_card_orange` | 896×1200 | 255/255 | 0,0 % | oben 18,1 % · unten 20,0 % · seitlich 15,7 % |
| `frame_card_green` | 896×1200 | 255/255 | 0,0 % | — |
| `frame_card_light` | 896×1200 | 255/255 | 0,0 % | — |
| die sechs Raritätsrahmen | 848×1264 | 255/255 | 0,0 % | ~17–19 % |
| `panel`, `progress_frame` | — | 255/255 | 0,0 % | ~8–11 % |

Als Ebene **über** dem Inhalt deckt so eine Datei den Inhalt komplett zu. Das
war der Fehler „die Tower werden nicht angezeigt" und „der Shop zeigt die Gems
nicht an": `.frm` (z 3) und `.pcfrm` (z 2) lagen über Kartenartwork und
Produktbild.

**Die Regel:**

| Rolle | Technik | `fill` |
|---|---|---|
| Rahmen über Inhalt | `border-image` | **nein** — die Mitte wird verworfen |
| Band, Platte (Inhalt liegt darauf) | `border-image` | **ja** — die Mitte bleibt |
| Kulisse, Diorama, Key-Art | `background-size:cover` | — |

`border-image-slice` bezieht sich auf die **Quelle**, `border-image-width` auf
das **Element**. Dieselben Prozentwerte in beiden halten den Zierrand
proportional gleich groß, unabhängig von der Kachelgröße. Bei Bändern ist der
Schnitt nur waagerecht (`0 22% fill`) und die Randbreite gleich der
**Bandhöhe** — die Enden der Bandgrafik sind nahezu quadratisch.

**Zweiter Befund, gleiche Klasse: die Bandgrafiken füllten ihre Leinwand nur zu
35 %.** `ribbon_section_lg` ist 1376×768, das Band darin nur 1218×269
(Verhältnis 4,53 statt 1,79). In einem 34 px hohen Streifen schnitt `cover`
deshalb fast nur leere Leinwand heraus. Vier Grafiken sind auf ihr Band
zugeschnitten; die Originale bleiben als `_v1` erhalten.

**Die Folgefalle, die daraus entstand und die man kennen muss:** der Zuschnitt
hat die dunkle Fallback-Platte durch das **echte, helle** Artwork ersetzt — und
darauf stand Gold- bzw. heller `pale`-Verlaufstext. Das ist die Bugklasse aus
§4, zum vierten Mal. Sie war unsichtbar, solange das CDN im Test nicht
antwortete. **Lehre: die Textgrundlage darf nie davon abhängen, welches Artwork
gerade lädt.** Beim Straßenknoten sitzt die Beschriftung darum auf einem eigenen
dunklen Plättchen, nicht direkt auf der Plattform.

> **Geprüft:** „Kartenrahmen sind nie eine deckende Bildfläche" über vier Views,
> „Rahmen-Schnitt ohne `fill`", „Rahmen-Randbreite in Prozent", „Sektionsbänder
> sind 9-Slice", „Bandschnitt mit `fill`", „Band-Enden nicht auf einen Strich
> gestaucht (≥ 20 px)", „Kein heller Verlaufstext auf den hellen Bändern",
> „Beschriftung sitzt auf eigenem dunklem Plättchen".

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

## 6d. Zwei Änderungen, die einzeln harmlos waren

Der schwerste Fehler dieser Runde entstand nicht aus einer falschen
Entscheidung, sondern aus **zwei richtigen, die zusammen nicht mehr galten**.

1. `UIIcon.sweep()` tauschte alles gegen sein Emoji, was `!complete ||
   naturalWidth === 0` war. Solange jedes Bild sofort zu laden begann: korrekt.
2. `loading="lazy"` kam dazu, um die Ladelast zu senken. Damit ist
   `complete === false` der **Normalzustand** für alles außerhalb des
   Sichtfelds.

Ergebnis: der Sweep hat jedes Bild unterhalb des Falzes dauerhaft durch sein
Emoji ersetzt. Im Shop zeigte das **erste** Gem-Paket sein Bild, alle darunter
ein grünes Herz. Der Befund „der Shop zeigt die Gems und das Gold nicht" war
also nie ein Asset-Problem — die Dateien lagen die ganze Zeit mit HTTP 200 da.

**Die Lehre ist nicht „mehr testen", sondern eine Frage beim Review:** wenn
eine Änderung eine Annahme über Bilder ändert, wer verlässt sich sonst noch
auf diese Annahme? Der Sweep stand 200 Zeilen entfernt und wurde nicht
angefasst.

Jetzt sauber getrennt: `complete && naturalWidth === 0` ist ein Fehlschlag;
`!complete` heißt „lädt noch" und wird nur nach einer Gnadenfrist und nur im
Sichtfeld als Hänger gewertet.

> **Geprüft:** „Sweep wertet `nicht geladen` nicht mehr als Fehler" (Form) und
> „Lazy geladene Produktbilder überleben den weichen Sweep" (Wirkung).

## 6e. Der Kategorienfehler: Kartenrahmen auf einer Produktkachel

`frame_card_*` sind **Kartenrahmen** — hochkant (0,75), kräftiges Zier auf
allen vier Seiten, gemacht um ein Kartenbild zu fassen. Eine Produktkachel ist
quer (1,33) und trägt Bild, Name, Menge und Knopf. Als 9-Slice darumgezogen
wird aus dem oberen Zierbalken ein breites Silberbrett und aus dem Ganzen ein
**leerer Bilderrahmen mit einem kleinen Icon darin**.

Kein Schnittwert repariert das. Der Rahmen gehört nicht auf diese Kachel. Die
Farbcodierung, um die es geht, trägt jetzt die **Kante** — richtig bei jedem
Seitenverhältnis, kostet kein Byte, und das Produktbild bekommt die Fläche.

**Die Regel dahinter:** ein Asset hat eine Rolle. Ein Rahmen für ein 3:4-Objekt
ist kein Dekor für beliebige Flächen. Vor der Wiederverwendung eines Assets an
neuer Stelle gehört das Verhältnis geprüft, nicht nur die Farbe.

## 6f. Wieviel darf ein Rahmen vom Inhalt nehmen?

`border-image-slice` beschreibt, wo in der **Quelle** das Zier endet. Das ist
gemessen und unveränderlich. `border-image-width` bestimmt, wieviel vom
**Element** der Ring bedeckt — und das ist eine Gestaltungsentscheidung.

Setzt man beide gleich, frisst der Ring auf einer 86×114-Deckkarte 38 % der
Höhe und 32 % der Breite; übrig bleiben 58×71 px für den Turm. Genau der Befund
„die Tower sind zu klein". `border-image` skaliert die Eckstücke auf die
Randbreite — der Ring wird also nur dünner, nicht abgeschnitten.

| | Schnitt (Quelle) | Randbreite (Element) | Öffnung |
|---|---|---|---|
| vorher | 18/16/20/16 % | 18/16/20/16 % | 42 % der Fläche |
| jetzt | 18/16/20/16 % | 12/10/14/10 % | **60 % der Fläche** |

> **Geprüft:** „Der Ring lässt mindestens 55 % der Deckkarte für den Turm".

## 6g. Hauptleiste: AAs Mechanik, nachgemessen

Aus dem Screenrecording vom 26.07. Bild für Bild:

| | AA | wir vorher |
|---|---|---|
| Reiter | Platten mit dünnen Fugen | freistehende Icons |
| Beschriftung | **nur der aktive** trägt sie | alle, dauerhaft |
| aktiver Reiter | wächst in der Breite, schiebt die anderen | gleich breit |
| | hebt sich über die Leistenkante | flach |
| | wird heller | goldener Strich darunter |
| | sein Icon wächst | unverändert |

Technisch heißt das **Flex statt Grid** — ein Grid mit festen Spalten kann
einen Reiter nicht wachsen lassen. Animiert werden `flex-grow` und die
`max-width` der Beschriftung auf derselben Kurve, damit Wachsen und Beschriften
**eine** Bewegung sind statt zwei.

Der goldene Strich ist entfallen: die Platte markiert den Zustand jetzt dreifach
(breiter, heller, angehoben). Ein vierter Hinweis wäre Redundanz.

> **Geprüft:** „Aktiver Reiter ist breiter als die übrigen" (136 gegen 68 px),
> „Nur der aktive Reiter trägt seine Beschriftung", „Aktiver Reiter hebt sich
> über die Leistenkante", „Die Hervorhebung wandert zum neuen Ziel".

## 7b. Die blinde Stelle der Suiten — und wie sie geschlossen ist

**Die 590 lokalen Checks liefen vor und nach dem Rahmen-Fix grün.** Sie laufen
ohne erreichbares CDN: jedes Icon fällt auf sein Emoji zurück, jedes
Rahmen-Overlay bleibt leer. Damit ist die Fehlerklasse **„ein Asset deckt den
Inhalt zu"** für sie *strukturell unsichtbar*. Kein Check hätte den Fehler
finden können, den der Nutzer auf dem ersten Blick sah.

Deshalb gibt es einen zweiten Prüfstand: `sicht.js` läuft in der Sandbox gegen
die **Live-URL**, wartet bis `document.images` vollständig geladen sind und
misst dann. Er hat die Bandgrafik-Befunde gefunden, die lokal nicht auffallen —
und zwar sowohl den Zuschnitt-Fehler als auch den hellen Text darauf.

**Regel:** eine Änderung an Rahmen, Platten, Bändern oder Textfarben auf
Artwork ist erst geprüft, wenn sie **mit geladenen Bildern** angesehen wurde.
Zwei Zustände genügen nicht — es sind drei: ohne Bild, mit Bild, bei
CDN-Ausfall mitten im Laden.

## 6h. Icons werden freigestellt, nicht gemischt

> **Regel: alles unter 24 % Helligkeit ist Hintergrund.**

**Gemessen über alle 163 ausgelieferten Bilddateien: kein einziges hat
Transparenz.** Alpha 255/255, 0,0 % durchsichtige Pixel — nicht nur die elf
Rahmen aus §6c, sondern der *gesamte* Satz. Das Motiv liegt auf einer flachen
dunklen Platte, die je nach Familie 50–90 % der Bildfläche einnimmt.

Die Platten der UI reichen von L 0,027 (Hauptleiste) bis L 0,865 (`.node .rw`,
`.utile`). Ein Mischmodus muss sich für eine Seite entscheiden — er kann nicht
gleichzeitig auf beiden richtig liegen. Genau das war der Fehler:

| Technik | dE Ecke Ø | dE max | Motivverlust dunkel / mittel / hell |
|---|---|---|---|
| nichts tun | 116,3 | 350,2 | 0,2 / 0,2 / 0,2 % |
| `screen` (stand auf `.ico`) | 36,0 | 95,3 | 27,0 / 89,5 / **96,4 %** |
| `lighten` (stand auf `.navimg`) | 6,4 | 69,9 | 1,2 / 44,7 / 92,5 % |
| `mask-mode:luminance` | 0,0 | 0,0 | 98,0 / 92,9 / 95,9 % |
| `filter:url("data:…")` | 116,3 | 350,2 | wirkungslos |
| **SVG-Filter im Dokument, Rampe 0,24→0,28** | **0,0** | **1,6** | **4,8 / 6,4 / 8,4 %** |

Drei Befunde, die man ohne Messung nicht bekommt:

1. **`screen` löst das Rechteck nie auf.** Es hellt den Untergrund *um* den
   Grund herum auf — auf der dunkelsten Platte +0,114 Helligkeit, also ein
   sichtbar **helleres** Kästchen. Nach „gar nichts tun" die schlechteste Option.
2. **`lighten` scheitert genau dort, wo es eingebaut war.** Es hilft nur,
   solange der Untergrund heller ist als der Grund. Die Hauptleiste misst
   L 0,027, `nav_clan` bringt L 0,192 mit. Am Live-Stand gemessen: dE bis 166,8.
   Dazu trägt `.navpop` selbst ein `filter:` und bildet damit eine eigene
   Mischgruppe, in der ein Mischmodus des Kindes ohnehin ins Leere läuft.
3. **`filter:url()` auf eine `data:`-URL ignoriert Chromium still.** Das
   Ergebnis ist pixelgleich mit gar keinem Filter. Der Filter muss im Dokument
   stehen.

Die Schwelle ist kein Schätzwert: der hellste eingebackene Grund im ganzen Satz
ist `rank_gold` mit L 0,232. 24 % sitzt knapp darüber. Sechs Schwellenlagen
wurden getestet; 0,20→0,28 verliert weniger Motiv, versagt aber bei `rank_gold`.

Umgesetzt als ein `<svg>` mit `feColorMatrix` (Helligkeit → Alpha) plus
`feComponentTransfer` direkt nach `<body>`, und **einer** CSS-Regel:

```css
img.ico{--frei:url(#icoFrei);filter:var(--frei)}
```

`--frei` steht in `:root` leer. Dadurch gilt dieselbe Schattenregel für Bild
**und** Emoji-Rückfall — `filter:var(--frei) drop-shadow(…)` ergibt beim `<img>`
`url("#icoFrei") drop-shadow(…)` und beim `<span>` nur `drop-shadow(…)`. Elf
Regeln tragen das Präfix; die Freistellung muss **zuerst** laufen, sonst hebt
ein aufhellender Filter den Grund über die Schwelle.

Keine Ausnahmeliste nötig: jedes Icon der UI kommt aus `ico()` und trägt
deshalb immer `class="ico …"` — auch `navimg`, `prodimg`, `plusimg`.

**Preis, offen benannt:** dunkle Motivteile unter 24 % verschwinden mit.
Gemessen 4,8 % (dunkle Platte) bis 8,4 % (helle Platte) des Kernmotivs, am
stärksten `hub_clan` 15,8 %, `cur_gem` 13,6 %, `ic_gear` 11,1 %. Auf hellen
Platten fehlt dem Icon dadurch der dunkle Rand, den es vorher aus dem Grund
hatte — deshalb müssen die `drop-shadow`-Regeln auf `.node .rw`, `.utile`,
`.pcbuy` und `.mecrown` **erhalten bleiben**.

**Aufnahmekriterium für neue Assets:** Eckfeld-Helligkeit < 0,20 und
Motiv-p05 > 0,30. Ein Icon mit hellerem Grund bricht die Schwelle.

**Der Filter ist ein Netz, kein Ersatz für saubere Assets.** Richtig
freigestellte Dateien hätten weiche, antialiaste Kanten statt eines
4-%-Helligkeitssprungs, würden die 5–8 % Motivverlust vermeiden und auch die
**Platten und Rahmen** heilen, die ein `img`-Filter grundsätzlich nicht
erreicht. Lohnend für die 68 Icon-Dateien (icon 23, nav 11, currency 10, hub 8,
element 6, road 5, rank 3, league 2) — Kartenartwork, Arenen und Teaser
brauchen ihren Grund.

> **Geprüft:** `pruefungen/iconfrei.js`. Zwei Aufnahmen derselben Ansicht,
> einmal mit und einmal ohne Icons, verglichen werden die vier Eckfelder der
> gezeichneten Fläche. Am Live-Stand: **ohne Patch 12 frei / 44 mit Kasten,
> mit Patch 50 frei / 6 mit Kasten.** Die sechs Restbefunde liegen alle im
> Shop; einer davon (`card_back`) ist erklärt und richtig so, die anderen fünf
> sind **nicht aufgeklärt** — wahrscheinlich Rest-Schlagschatten der Ahnen.

## 6i. AAs Startseite, nachgemessen

IMG_3344 nebeneinander mit unserem Stand. Was AA anders macht, ist nicht
Geschmack, sondern Flächenverteilung:

| | AA | vorher | jetzt |
|---|---|---|---|
| Währungsleiste | 73,8 % | 66 % (gleich breite Pillen) | 75,4 % |
| Pass-Banner | 57,2 % | 91 % | 58,5 % |
| linke / rechte Schiene | 16,8 / 16,5 % | fehlten | 16,1 / 16,1 % |
| Arena-Diorama | 52,7 % breit, 17,7 % hoch | 43 % / 13 % | 53,1 % / 18,2 % |
| Kampfreihe y | 72,0–82,7 % | 57,6–65,9 % | 78,9–90,0 % |

Die fünf Kopf-Icons in der Profilzeile waren meine Zwischenlösung. AA verteilt
sie auf **zwei senkrechte Schienen** neben der Arena: links die
Belohnungsstaffel (Login/Daily, Wöchentlich, Lebenszeit = Erfolge), rechts die
Verwaltung (Packs, Rangliste, Post, Tresor). In der Profilzeile bleiben nur
Freundesliste und Menü.

**Ein Detail, das zweimal falsch war:** der freie Platz gehört *nicht*
gleichmäßig zwischen alle Kinder der Arena-Bühne. Bei AA liegt er komplett
zwischen Arena-Chip (27 %) und Trophäenbalken (58 %) — 31 Punkte Luft, während
Balken und Truhenreihe direkt aufeinander sitzen. `justify-content:space-between`
hat ihn halbiert und die Truhen auf 48 % gezogen. Und `align-items:flex-start`
auf dem Band ließ das `flex:1` der Bühne ins Leere greifen: die Mittelspalte war
nur so hoch wie ihr Inhalt. Erst `stretch` + `margin-top:auto` auf dem Balken
ergibt AAs Achse.

## 8. Was noch offen ist

| Paket | Inhalt | Stand |
|---|---|---|
| P2 | Zustandsmatrix je Knopfklasse: normal / pressed / disabled / loading / selected | `selected`, `loading`, `hover` gibt es **null** mal |
| P3 | Fassungen als Assets: 9-Slice-Panel-Platte, Kartenrahmen je Rarität, Bannerplatte | **Kartenrahmen und Bänder erledigt** (§6c). Panel-Platte und `progress_frame` noch offen — beide brauchen erst einen Zuschnitt. |
| P4 | Bewegungssprache: Overshoot, Squash, Hochzählen, Belohnungs-Choreografie | Tokens stehen, Choreografie fehlt |
| — | Typo-Leiter: 40 Schriftgrößen auf 8 benannte Stufen | offen |
| — | Radien: 31 auf 4 | offen |
| — | Fehlende Komponenten: Tooltips, gestaltete Scrollbars, Health/Mana-Balken, Damage-Zahlen, Kampagne, Benachrichtigungssystem, Ladezustände | offen |
| — | **Gold-Produktbilder neu erzeugen.** `shop_gold_t1..t4` messen Farbton 35°, aber nur 0,32–0,39 Sättigung gegen 0,58 beim Währungs-Icon. Bei 108 px lesen sie als graue Münze. Aktuell hebt ein CSS-Sättigungsschub sie an — eine Zwischenlösung, kein Ersatz | offen |

**Regel für alles Neue:** eine Änderung am Design-System ohne begleitenden Check
ist nicht fertig. Sonst steht in sechs Wochen wieder 89 % ohne Tiefe im Blatt und
niemand weiß, wann es passiert ist.
