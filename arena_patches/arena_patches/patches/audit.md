# Audit — Material- und Lichtpolitur, gemessene Grundlage

**Gemessen am:** 29.07.2026
**Gegenstand:** `https://prisma-td-vorschau.higgsfield.app/ui` — die **ausgelieferte** Vorschau,
nicht die örtliche Datei. 821 422 Bytes ausgeliefert gegen 818 071 Bytes örtlich: der Stand
weicht leicht ab, weil an `ui_prototype.html` gerade gearbeitet wird. Alle Zahlen unten
gehören zum ausgelieferten Stand.
**Gerät:** 390 × 844, `deviceScaleFactor 2`. Zwei Bildlaufstellen je Fenster (ganz oben und
ganz unten), Werte entdoppelt.
**Bildlage:** 120 `<img>` im Baum, alle geladenen mit `naturalWidth > 0`, **kein** einziger
fehlgeschlagener Bildabruf. Das CDN antwortet in der Auslieferung — genau die Bedingung, unter
der `pruefungen/README.md` das Messen verlangt.

**Diese Datei ändert nichts.** Sie ist eine Messung, kein Eingriff.

---

## 0. Vorbemerkung zu Frage 1 — die Grenze, die wirklich greift

Wörtlich gefragt war: *„Wie viel Prozent der Fläche trägt weder `box-shadow` noch Verlauf noch
Rahmen?"* Die Antwort darauf ist in **jedem** der 21 Fenster **0,0 %**. Es gibt keine einzige
gerundete Fläche mit Hintergrund, der alle drei fehlen. Die Frage ist also bereits beantwortet
und trennt nichts mehr.

Was trennt, ist die Kennzahl, die das Projekt selbst benutzt (`run_v7.js` Z. 2487 ff.,
DESIGNSYSTEM §1): **Anteil der sichtbaren Fläche ohne *innere* Materialkante** (`box-shadow`
ohne `inset`). Das ist die Zahl mit der Grenze 25 % je Fenster, und das ist die Zahl, die unten
steht. Gezählt werden — wie dort — Elemente ab 8 × 8 px mit Hintergrund und Radius ≥ 3 px;
Flächen überlappen sich, es ist ein Anteil, keine Deckung.

Zwei Dinge, die die Zahl **nicht** sieht: der Seitengrund selbst (kein Radius) und alles
unterhalb des Sichtfensters. Sie ist ein Zeiger, keine Bilanz.

---

## 1. Rangliste der Fenster

Gesamt über alle 21 Fenster: **22,0 %** der gemessenen Fläche ohne Materialkante
(5 179 793 px² gemessen). Die bestehende Prüfung fordert ≤ 15 % im Mittel und ≤ 25 % je
Fenster — **beide Grenzen sind gerissen**, und wie schon einmal ist der Mittelwert das
harmlosere Problem.

| # | Fenster | ohne Materialkante | begründende Zahl |
|--:|---|---:|---|
| 1 | **Einstellungen** | **84,5 %** | `div.setgrp` allein 76,8 % der Fensterfläche |
| 2 | **Profil bearbeiten** | **74,4 %** | `.avcell` 17,4 % + `#avPreview` 16,1 % + `.avcell.locked` 15,5 % |
| 3 | **Guide** | **38,5 %** | `div.gtask` 25,3 % — und `.gcc` bei 1,10 : 1 |
| 4 | **Match-Ende** | **35,0 %** | `div.merewc` 18,9 %, `#meAgain` 6,4 % |
| 5 | **Shop** | **34,1 %** | `#shopPromo` 10,6 %, `.offercard.artbg` 10,1 %, `.iart` 5,7 % |
| 6 | **Profil (Fenster)** | **31,5 %** | `div.stbox` 29,3 % — die ganze Fensterplatte |
| 7 | **Clan** | 0,0 % | Tiefe in Ordnung, aber `.qlbl` bei **1,01 : 1** — schlechtester Kontrast der App |
| 8 | **Bestiarium** | 0,0 % | `#bsToGrid` bei **1,42 : 1** auf 16 836 px² |
| 9 | **Sammlung** | 0,2 % | Artwork liegt über dem `AUSGERÜSTET`-Band (`img.cart` z-index 1 > `.eq` auto) |
| 10 | **Pass** | 3,3 % | Goldtönung `.rwcell.tinted::after` unter hellem Text: 1,44–1,78 : 1 |
| 11 | Helden | 16,9 % | `div.herostage` — eine einzige Fläche |
| 12 | Burg | 8,3 % | `#fxShield` 4,0 %; dazu ein Kauf-Knopf unter dem Ast-Kopf |
| 13 | Post | 7,2 % | drei kleine Flächen, je ~2 % |
| 14 | Handbuch | 5,8 % | `span.ma` (Kapitelbild) |
| 15 | Schmiede | 3,5 % | `#btnMerge` 2,8 % |
| 16 | Events | 3,4 % | `.evjoin` 1,3 % |
| 17 | Startseite | 3,2 % | `#pbBtn` 2,0 % |
| 18 | Kopf + Fußleiste | 1,8 % | `span.plus` 0,8 % |
| 19 | Freunde | 0,1 % | — |
| 20–22 | Rangliste, Pack-Ansicht | 0,0 % | sauber |

Sechs Fenster über der Grenze. **Fünf davon sind Nebenwege** (Einstellungen, Profil bearbeiten,
Guide, Match-Ende, Profil) — nur der Shop ist ein Hauptweg. Das ist die gute Nachricht: der
Durchgang, der 89 % auf 5 % gebracht hat, hat die Hauptwege erwischt und die Randfenster
liegengelassen.

---

## 2. Die zehn, die ein Nutzer zuerst sieht

Nach Wirkung, nicht nach Kennzahl.

**1 · Clan — der Fortschrittswert steht unsichtbar auf dem Balken.**
`#paneQuests .qcard .qbar > span.qlbl` · **1,01 : 1** (Textfarbe `#0b1116`, gemessener Grund
`rgb(10,15,20)`) · 4 732 px², drei Balken nebeneinander.
Das Label ist über der **ganzen** Balkenbreite zentriert, die Füllung `.qfill` ist aber nur
45–48 % breit. Die Schrift landet also auf der dunklen Restspur, für die sie nie gedacht war —
sie ist als dunkle Schrift auf heller Füllung gebaut. Der Textschatten
`rgba(255,255,255,.333) 0 1px 0` ist alles, was den Wert noch erkennbar macht. Ab 50 %
Fortschritt löst sich das Problem von selbst; darunter ist der Wert weg. Das ist der einzige
Befund der App unter 1,1 : 1.

**2 · Sammlung — das Kartenbild liegt über dem `AUSGERÜSTET`-Band.**
`.tile .eq` (Z. 445) hat keinen `z-index`, `img.cart` (Z. 3459) hat `z-index:1`. Das Bild
gewinnt. Zeilenmessung an einer Kachel: die oberen ~7 der 9 px sind sauber grün, die unteren
~2 px sind vom Artwork überdeckt (Zeilenmittel kippt von `(47,136,28)` auf `(145,114,159)`).
Punktmessungen an drei anderen Kacheln ergaben am Bandmittelpunkt **1,62 / 1,95 / 2,32 : 1** —
wie viel überdeckt wird, hängt am Bild.
**Das ist die Fehlerklasse, die örtlich strukturell unsichtbar ist:** ohne CDN gibt es kein
`img.cart`, sondern nur `.cartemo` auf `z-index:0` — dann liegt das Band frei. Dieselbe Bauart
hat `.tile .lvl` (Stufenband unten, ebenfalls ohne `z-index`); bitte mitprüfen.

**3 · Bestiarium — heller Text auf Goldknopf.**
`#bsToGrid` „Gegner ansehen" · **1,42–1,54 : 1** · `rgb(232,238,243)` auf
`linear-gradient(#f4e3a6, #e0b94a 55%, #a8842a)` · **16 836 px²** — der größte
Kontrastbefund der App nach Fläche, und der einzige Knopf im Bildschirm.
Jeder andere Goldknopf des Systems macht es richtig: `.kbuy` und `.rget` tragen `#3a2b07` und
messen 7,7–8,7 : 1. Hier ist schlicht die falsche Textfarbe eingesetzt. **Ein Wert, ein Ort.**

**4 · Einstellungen — 84,5 % ohne Materialkante.**
`div.setgrp` allein 76,8 %. Das Fenster besteht praktisch aus einer einzigen flachen
Gruppenplatte. Es ist das Fenster mit dem größten Abstand zum Rest der App und gleichzeitig
das, das ein Spieler am seltensten öffnet — deshalb steht es hier auf Rang 4 und nicht auf 1.

**5 · Profil bearbeiten — 74,4 %, und es ist die Avatarwahl.**
`.avcell` (17,4 %), `#avPreview` (16,1 %), `.avcell.locked` (15,5 %). Das Raster der
Avatarzellen und die große Vorschau tragen keine Kante. Anders als bei den Einstellungen ist
das ein Bildschirm, auf dem der Spieler etwas **aussucht** — die Zellen sind das Bedienelement,
und ein Bedienelement ohne Kante liest sich nicht als antippbar.

**6 · Guide — die Aufgabenzeilen sind flach, und die Zählung verschwindet.**
`div.gtask` 25,3 % der Fensterfläche ohne Kante (allein diese eine Klasse reißt die Grenze).
Dazu: `.gcc` im **geöffneten** Kapitel · **1,10 : 1** (`#f2c53d` auf gemessenem
`rgb(222,211,183)`). Die Kapitelköpfe tragen ein Artwork als Hintergrund; wo es hell ist,
verschwindet die goldene Zählung „0/4". In zwei anderen Kapiteln misst dasselbe Element
7,4 und 11,2 : 1 — **es hängt am Bild dahinter, nicht am Code.** Zweite Ausprägung derselben
Klasse wie Befund 2.

**7 · Shop — 34,1 %, und drei davon sind die Verkaufsflächen.**
`#shopPromo` 10,6 %, `.offercard.artbg` 10,1 %, `span.iart` 5,7 %. Genau die Kacheln, die Geld
verdienen sollen, sind die ohne Material. Dazu zwei Kontrastbefunde am selben Ort:
`.secribbon .srx` „Echtgeld · Platzhalter" misst **1,54 : 1** in der hellen Hälfte des Bandes
(4,99 : 1 in der dunklen — das Band ist ein Verlauf, der Text ist es nicht), und `.apkval`
(„+211 % Wert") **2,39–2,84 : 1**, weiß auf der rosa Rosette.

**8 · Match-Ende — 35,0 %, mit `div.merewc` bei 18,9 %.**
Der Belohnungsblock ist die Fläche, auf die der Spieler nach jedem Spiel schaut. `#meAgain`
(6,4 %) und `#meClose` (4,1 %) sind die beiden Knöpfe, mit denen er das Fenster verlässt.

**9 · Profil — die Fensterplatte ist hell und trägt keine Kante.**
`div.stbox` 29,3 % (`linear-gradient(#c3d5ea, #9db6d2)`, Z. 2459). Die helle Platte ist
**gewollt** — der Kommentar daneben sagt es ausdrücklich („Heller Grund, DUNKLE Schrift, nie
`.goldtext`"). Sie trägt `box-shadow:0 12px 30px #000b`, also einen Schlagschatten, aber keine
Innenkante. Bei einer Fläche, die fast das ganze Fenster ist, fällt das auf.
Alle nachprüfbaren Textwerte darauf sind in Ordnung (`.pfcl` 5,0–5,1 : 1, `.pfcv` 9,6 : 1,
`.pfsectitle` 4,7 : 1 gegen die 3,0er-Grenze für große Schrift) — siehe Abschnitt 5, ich hatte
hier zuerst falsch gemessen.

**10 · Pass — die Goldtönung frisst den hellen Text.**
`.rwcell.tinted::after` legt `radial-gradient(120% 90% at 82% 50%, var(--t1), transparent 62%)`
bei `opacity:.55` über die Zelle — rechts am stärksten, genau dort, wo `.rtx` endet. Gemessen
an abholbaren Zeilen: `.rtx` „13 Material" / „Bronze-Pack" **1,44 : 1**
(`rgb(219,230,239)` auf `rgb(226,188,81)`), `.rtx small` **1,21–1,78 : 1**.
*Einschränkung:* diese Werte stammen aus dem zweiten Lauf; im dritten ließen sich die Zeilen
nicht bestätigen, weil sie an der Bildlaufstelle hinter dem Key-Art lagen. Der Mechanismus ist
aus dem Blatt eindeutig, die Zahl bitte nachmessen.

---

## 3. Frage für Frage

### Frage 2 — Kontrast: das Muster hinter den Einzelbefunden

Neben den zehn oben gibt es **zwei systematische Fälle**, die zusammen mehr Orte betreffen als
alle Einzelbefunde:

**a) Der blaue Standardknopf: 3,68–3,78 : 1, überall.**
Weiß auf gemessenem `rgb(45,139,199)` (`linear-gradient(#3fa9e8, #1c6ea8)`).
Orte: `#btnSetGuide`, `#btnSetManual`, `#btnSetLogin`, `#btnDemoWin`, `#btnExport`
(Einstellungen) · `.evjoin` (Events, 2 933 px²) · `.frduel` (Freunde, 6 Zeilen) · `#lbJump`
(Rangliste, 8 198 px²) · `.sthead .stt` (Profil).
Knapp unter 4,5. **Das ist der billigste Eingriff der ganzen Liste:** ein Token dunkler, und
zehn Orte sind zugleich sauber. Ich halte das für den ersten Handgriff, obwohl kein einzelner
Ort dramatisch aussieht.

**b) Die Zählmarken: 2,94 : 1, überall.**
Weiß auf `#ff5e7e`. Orte: `#tileDailyBadge`, `#tileEventBadge`, `#badgeFriends`, `#badgeMenu`,
`#badgeShop`, `#navBadge`, `#frTabN`. 9–10 px, 900er Schnitt, 196–256 px².
**Das halte ich für unkritisch.** Eine Zählmarke wird als roter Punkt gelesen, nicht als Zahl;
die Ziffer ist Beiwerk. Ein dunkleres Rot würde die Signalwirkung kosten. Ich nenne es der
Vollständigkeit halber und würde es liegenlassen.

**Einzelnes, geprüft, unter der Grenze:**

| Ort | Wert | Bemerkung |
|---|---:|---|
| `#viewCollection footer #btnReset` „Demo-Zustand zurücksetzen" | 2,73 : 1 | Demo-Knopf, kein Spielerweg — unkritisch |
| Startseite `#tileEvents span.stn` „EVENTS" | 2,46 : 1 | 8 px auf getönter Kachel |
| Startseite `#passBanner #pbSub` | 2,80 : 1 | Nebenzeile am Pass-Banner |
| Handbuch `.manhead .mhn` „Season-Pass & Tresor" | 2,42 : 1 | **nur an einem Kapitel**; drei andere messen 13,2–13,9 : 1. Artwork-abhängig, wie Befund 6 |
| Schmiede `#btnMerge` „VERSCHMELZEN" | 3,03 : 1 | im ausgegrauten Zustand (`pointer-events:none`) |
| Schmiede `.reqslot` „＋" | 1,98 : 1 | gegen die 3,0er-Grenze; wirkt bewusst zurückgenommen — bitte entscheiden, nicht automatisch heben |
| Einstellungen `#btnWipe` | 4,01 : 1 | weiß auf Rot |
| Startseite `#arenaProgLabel` „1 136 / 1 200" | 4,15 : 1 | knapp |
| Events `.evjoin.soon` „ERINNERN" | 4,20 : 1 | knapp, ausgegrauter Zustand |
| Pass `.pnum small` „MEILE" | 4,09 : 1 | 233 px² |
| Freunde `.frtr b` „1149" | 3,77 : 1 | Gold auf getöntem Grund |
| Freunde `.secribbon .srx` „7" | 1,53 : 1 | dasselbe Band wie im Shop |
| Clan `.secribbon .srx` „46 %" | 1,53 : 1 | dasselbe Band |
| Clan `.clanFeed .fa` (Zeitstempel) | 2,78–3,26 : 1 | vier Zeilen, `#5d7284` auf dunkel |

Der `.secribbon .srx` taucht in drei Fenstern mit demselben Wert auf — **das ist ein dritter
systematischer Fall**, nicht drei Einzelfälle.

**Emoji und Symbole habe ich getrennt gezählt und aus den Befunden herausgenommen**
(Rangliste 13, Pass 18, Sammlung 7, Clan 7, Schmiede 5 …). Ein Emoji wird von der Schriftfarbe
gar nicht eingefärbt; ein Kontrastwert darauf misst nichts. Die Zahlen stehen in
`kSymbolAnz`, falls jemand sie sehen will.

### Frage 3 — Artwork unter 20 px: fast nur Fehlalarm

Gefunden: 36 eindeutige Stellen über alle Fenster (Rangliste 5, Kopf/Fußleiste 5, Shop 4,
Profil 4, Match-Ende 4, Pass 3, Clan/Guide je 2, sieben Fenster je 1).

**34 davon sind Icons mit `naturalWidth` 96 px, gezeichnet auf 11–18 px.** Bei
`deviceScaleFactor 2` sind das 22–36 Gerätepixel aus einer 96er Quelle — mehr Auflösung als
nötig. Die Kennzahl misst hier die Anzeigegröße und nennt es Artwork; das ist die falsche
Frage. Ich würde keine davon anfassen.

Zwei Fälle bleiben:

- `#viewPack #pityLine img.ico` · 13,8 × 13,8 px aus **172 × 256** (Kartenformat 2:3).
  Ein hochkantes Kartenbild in ein Quadrat gezwungen — hier ist die kleine Größe nicht das
  Problem, das Seitenverhältnis ist es. **Ansehen.**
- `#avGrid .avcell.locked .avlock img.ico` · **11,0 × 11,0 px**, das kleinste der App. Ein
  Schloss auf 11 px auf einer Zelle, die 15,5 % der Fensterfläche ausmacht (siehe Rang 2) —
  das Verhältnis stimmt nicht.

### Frage 4 — Verdeckung: **kein toter Knopf**

Das ist das klare Ergebnis. `elementFromPoint` an der Mitte jedes Knopfes, an beiden
Bildlaufstellen, ohne Randklemmung: **kein einziges Bedienelement ist an seiner eigenen
Position dauerhaft nicht erreichbar.**

Was gefunden wurde, in drei Sorten:

**a) Unter der Fußleiste — nur an der oberen Bildlaufstelle** (7 Stellen).
`.gchead` (Guide, 20 384 px²), `.manhead` (Handbuch, 20 384 px²), `#avDemo`
(Profil bearbeiten, 10 816 px²), `#btnDemoWin`/`#btnDemoLose` (Einstellungen, ~5 300 px²),
`.ibuy` (Shop, 2 155 px²), `.rget` (Pass, 1 113 px²), `.frduel` (Freunde, 1 826 px²).
An der **unteren** Bildlaufstelle ist keine dieser Stellen mehr verdeckt — die Listen haben
also genug Fußraum. Der Spieler scrollt, und der Knopf ist da. **Kein Fehler, aber der Grund,
warum eine Messung ohne Bildlauf hier sieben Geister meldet.**

**b) Ausgegraute Knöpfe mit `pointer-events:none`** (getrennt gezählt, 6 Stellen).
`.gclaim.is-disabled` (Guide), `.frgift.is-disabled` (Freunde), `#apkPrev` (Shop, am Anfang
der Bahn), **`#btnMerge` (Schmiede)**. Alle absichtlich. Ich nenne `#btnMerge` trotzdem: an
genau dieser Stelle war die Fusion schon einmal unbedienbar (DESIGNSYSTEM Z. 476), und der
Zustand „ausgegraut, weil keine gültige Dreiergruppe gewählt ist" sieht in der Messung genauso
aus wie „kaputt". Er ist es nicht — aber wenn irgendwo eine Regression durchrutscht, dann hier.

**c) Ein echter Befund.**
`div.branch .branchrail .knot.next > button.kbuy` (Burg, „78 000") liegt an der unteren
Bildlaufstelle unter `div.branch .branchhead .btx .bnm.goldtext` — dem Astkopf, nicht der
Fußleiste. `pointer-events:auto` auf beiden. 1 683 px².
Der Astkopf ist der einzige Fall, in dem etwas anderes als die Fußleiste einen aktiven
Kaufknopf verdeckt. **Ansehen.**

### Frage 5 — leere Bilder: **null**

`naturalWidth === 0` bei `complete === true`: **0 in allen 21 Fenstern.** Kein einziger
fehlgeschlagener Bildabruf im Netzprotokoll.
Das ist die Prüfung, die örtlich prinzipiell nichts sagen kann und in der Auslieferung sauber
ist. Bemerkenswert: von 120 `<img>` waren beim ersten Messpunkt nur 24 geladen — `loading=lazy`
arbeitet also, und die Nachladung beim Fensterwechsel kam in jedem Fall rechtzeitig durch.

### Frage 6 — Licht von oben: **die harte Regel hält**

Zur Formulierung: „Licht kommt von oben" (DESIGNSYSTEM §1) bedeutet **oben hell, unten dunkel**.
Verletzt wird die Regel von einem Verlauf, der **nach unten heller** wird. So habe ich gemessen.

Alle `linear-gradient` über alle 21 Fenster (≈ 250 Verläufe, aus dem Blatt geparst, Winkel
normalisiert, Stopps über die eigene Grundfarbe komponiert):
**genau eine Auffälligkeit** — `#viewFortress #castleStage`, und das ist ein `url()`-Artwork,
kein Verlauf. Alle übrigen laufen richtig herum. Die Tokens selbst sind sauber (`--lit`
`inset 0 1px 0 #ffffff`, `--unlit` `inset 0 -1px 0 #000000`).

Die zweite Messung — Pixelvergleich des oberen gegen den unteren Randstreifen der gezeichneten
Fläche — meldet mehr, ist aber **von Inhalt verunreinigt**: bei `.avcell.sel` (d = +0,485),
`.mecrown` (+0,153), `#tileEvents` (+0,157) ist die Unterkante heller, weil dort das Portrait
bzw. die Krone sitzt, nicht weil der Verlauf falsch läuft. Diese Zahlen taugen nicht als
Befund.

Was daraus **doch** bleibt und keine Kennzahl erfasst: mehrere **Artworks** sind unten heller
als oben — `#tileEvents` (+0,157), Handbuch `.manart .ma` (+0,119). Das liest sich im Bild als
Licht von unten, auch wenn kein CSS-Verlauf verletzt ist. Für den Bild-Durchgang notiert, nicht
für den Material-Durchgang.

---

## 4. Was mir auffällt, das keine Kennzahl erfasst

- **Die Grenze 25 % misst Fenster, nicht Wege.** Einstellungen (84,5 %) und Profil bearbeiten
  (74,4 %) sind die beiden schlechtesten Werte und zusammen vielleicht 2 % der Spielzeit. Der
  Shop mit 34,1 % ist der einzige Hauptweg über der Grenze — und die drei Flächen, die ihn
  treiben, sind ausgerechnet die Verkaufsflächen. Wenn nur eines gemacht wird: der Shop.

- **Drei Befunde sind derselbe Fehler an drei Stellen.** `.qlbl` über der halbleeren Spur,
  `.eq` unter dem Kartenbild, `.gcc`/`.mhn` auf hellem Artwork: dreimal steht eine feste
  Textfarbe auf einem Grund, der sich zur Laufzeit ändert (Fortschritt, geladenes Bild,
  Kapitelbild). Das ist keine Farbfrage, sondern eine Bauartfrage — ein fester Grund unter dem
  Text (Plakette, Verdunkelung) löst alle drei auf einmal. Eine Liste einzelner Farbwerte würde
  das verstecken.

- **`.stbox` ist der einzige helle Fensterrahmen der App.** Die Entscheidung ist begründet und
  im Blatt kommentiert. Aber sie erzeugt eine zweite Textfarbwelt (dunkel auf hell), die sonst
  nirgends gilt — und genau dort war meine eigene Messung zuerst falsch (Abschnitt 5). Wenn ein
  Messwerkzeug an dieser Stelle stolpert, stolpert auch der nächste, der etwas daran ändert.
  Nicht wegen der Zahlen — wegen der Ausnahme.

- **`img.cart` mit `z-index:1` gegen `.eq`/`.lvl` ohne `z-index`** ist kein Kontrastproblem,
  sondern eine Stapelreihenfolge. Es wird in **jeder** örtlichen Prüfung grün bleiben, weil das
  Bild dort nie existiert. Das ist wörtlich der Fall, für den `sicht.js` geschrieben wurde.

- **Die Fußleiste verdeckt an der oberen Bildlaufstelle 20 384 px² Guide- und Handbuchkopf.**
  Erreichbar bleibt alles. Aber ein Kapitelkopf, der halb unter der Leiste anfängt, wirkt beim
  Öffnen wie ein abgeschnittener Bildschirm. Keine Kennzahl fällt darüber; ein Blick schon.

---

## 5. Was ich zurücknehme

Fünf Befunde aus meinem ersten Durchgang waren **Messfehler**, keine Fehler des Produkts. Ich
führe sie auf, damit sie niemand aus einem älteren Zwischenstand aufliest:

| zuerst gemeldet | Wert | tatsächlich |
|---|---:|---|
| Shop `.ibuy` „Fr. 9.–" | 1,12 : 1 | Messpunkt lag unter der Fußleiste. Der Knopf selbst misst **8,4–9,7 : 1** |
| Pass `.rget` „HOLEN" | 1,21 : 1 | Messpunkt hinter dem Key-Art. Gold mit `#3a2b07` misst **~7,7 : 1** |
| Burg `.kbuy` „78 000" | 1,05 : 1 | verdeckte Instanz. Die freie misst **7,67 : 1** |
| Einstellungen `#btnDemoLose` | 2,10 : 1 | unter der Fußleiste |
| Profil `.pfcl` / `.pfsectitle` | 1,08 / 2,66 : 1 | Zellen außerhalb des sichtbaren Modalbereichs. Bestätigt: **5,0–5,1** bzw. **4,7 : 1** |

Die Ursache war in allen fünf Fällen dieselbe: der Farbgrund wurde über die Elternkette
berechnet bzw. der Mittelpunkt ins Sichtfenster geklemmt. Der Nachlauf prüft jetzt mit
`elementFromPoint`, ob der abgetastete Punkt überhaupt zum Element gehört, und verwirft ihn
sonst. Ebenso waren im ersten Durchgang **26 von 32** Verdeckungsmeldungen Klemm-Artefakte.

Umgekehrt hat erst die Pixelabtastung drei Befunde **sichtbar gemacht**, die die
Elternketten-Rechnung übersehen hatte: `.qlbl`, `.eq` und `.gcc` — alle drei, weil der
tatsächliche Grund von einem Geschwisterelement oder einem Bild kommt, nicht von einem
Vorfahren. Das sind die drei stärksten Befunde des Berichts.

---

## 6. Was ich nicht messen konnte, und warum

1. **Örtlich war die Vorschau nicht erreichbar.** Der Agent-Proxy lehnt `CONNECT` auf
   `prisma-td-vorschau.higgsfield.app` mit 403 ab (`curl` wie Chromium:
   `ERR_TUNNEL_CONNECTION_FAILED`). Gemessen wurde deshalb aus der Higgsfield-Sandbox
   (`PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`, Playwright 1.61.1). Dort antworten Vorschau
   **und** CDN. Nebenwirkung: die Sandbox wird zwischen Aufrufen verworfen und wird von einem
   zweiten Agenten mitbenutzt — die Screenshots des ersten Laufs waren beim Zusammenbauen der
   Montage bereits gelöscht.

2. **Ich habe die Fenster nicht als Bild angesehen.** Der einzige Weg, ein Bild aus der Sandbox
   hierher zu bekommen, ist Base64 durch den Gesprächsverlauf; eine lesbare Montage der acht
   wichtigsten Fenster wurde dabei abgeschnitten. Statt zu raten habe ich die Zweifelsfälle
   **numerisch** aufgelöst (Pixelabtastung, `elementsFromPoint`-Stapel, zeilenweise Helligkeit
   im `.eq`-Band, Gegenprobe im Blatt). Das hat die fünf Fehlmessungen oben aufgedeckt.
   **Es ersetzt das Hinsehen nicht.** Die Punkte, bei denen ein Blick den Ausschlag geben
   müsste, sind ausdrücklich als *„ansehen"* markiert: `.eq`/`.lvl` in der Sammlung,
   `#pityLine img`, der Astkopf in der Burg, die hellen Kapitelbilder in Guide und Handbuch.

3. **Nur zwei Bildlaufstellen je Fenster** (ganz oben, ganz unten). Was in der Mitte einer
   langen Liste steht, ist ungemessen. Betrifft vor allem Rangliste, Guide, Handbuch und Pass.

4. **Nur ein Zustand je Fenster.** Der Demo-Stand, wie er beim Öffnen erscheint: ein Reiter,
   eine Auswahl, kein aufgeklapptes Detail, keine Kaufbestätigung, keine Feier-Ebene. Modals
   wurden vor jeder Messung geschlossen. Gemessen wurden 21 Ansichten — **nicht** gemessen:
   Detailkarte, Fusions-Zeremonie, Login-Kalender, Angebotskette, Trophäenstraße, Clan-Reiter
   außer dem ersten, Ranglisten-Reiter außer dem ersten, Freundes-Reiter „Anfragen"/„Suche",
   Shop-Tresor und Vorrats-Truhe.

5. **Die Kontrastgrenze ist WCAG (4,5 : 1, bzw. 3,0 : 1 ab 24 px oder 18,66 px fett).**
   `text-shadow` fließt **nicht** ein. Wo ein Schatten die Lesbarkeit rettet, ist der Wert zu
   streng — bei `.qlbl` (weißer Schatten) und `.pfsectitle` (dunkler Schatten) ausdrücklich
   vermerkt. Umgekehrt kann ein Wert über 4,5 trotzdem schlecht aussehen; die Kennzahl misst
   Farbe, nicht Form.

6. **Die Tiefenkennzahl ist ein Anteil, keine Deckung.** Verschachtelte Flächen werden mehrfach
   gezählt, der Seitengrund selbst gar nicht (kein Radius). Vergleichbar mit dem bestehenden
   Wert in `run_v7.js`, aber keine Aussage darüber, wie viel des Bildschirms wirklich flach ist.

7. **Der ausgelieferte Stand ist nicht der örtliche.** 821 422 gegen 818 071 Bytes. Wenn die
   beiden anderen Agenten inzwischen etwas geändert haben, gehört es nicht zu diesen Zahlen.
   Nach dem nächsten Deploy neu messen.
