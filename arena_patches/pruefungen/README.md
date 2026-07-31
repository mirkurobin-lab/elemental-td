# Prüfungen

Zuletzt vollständig gemessen am **30.07.2026**: 24 Playwright-Suiten laufen hier
durch. Rot bleibt genau einer — `run_v7.js` „gleiche Drittel" (siehe unten,
braucht eine Produktentscheidung, kein Code-Fix).

**`lesbarkeit.js`** (3 Schritte, 31.07.2026) misst jeden Schriftzug gegen seinen
**wirklichen** Untergrund — Bild, Verlauf oder Farbe. Der Trick, an dem die zwei
Vorgängerfassungen gescheitert sind: der Bildschirm wird zweimal fotografiert, einmal
mit und einmal ohne Schrift. Aus `M = a·S + (1−a)·U` fällt die **Deckung** je Pixel, und
gewertet wird nur der Strich-Kern (a ≥ 0,9). Kantenglättung wird damit ausgerechnet statt
weggeschnitten. Erste Auswertung: 402 messbar, vier unter 3:1, **alle vier echt** —
gegen zwei von zwei falsch bei der Vorgängerfassung.

**`klickdurchlauf.js`** (6 Schritte, 31.07.2026) drückt **alles**, was klickbar aussieht,
über alle 16 Fenster (183 Knöpfe) und fragt nur, ob dabei etwas kaputtgeht: JS-Fehler,
hängende Schicht, Sackgasse, gesprengte Bildbreite. Sie findet die Fehler, an die niemand
gedacht hat, als er die gezielte Prüfung schrieb. Ihr Kopf hält sechs eigene Messfehler
fest — drei davon haben im ersten Lauf falsche Befunde erzeugt.

**`passform.js`** (6 Schritte, 31.07.2026) misst über alle 16 Ansichten das
Seitenverhältnis jeder Quelle gegen das ihres Kastens und dazu die Füllregel —
441 sichtbare Bildflächen. Drei Befundarten, drei verschiedene Konsequenzen:
*gedehnt* ist immer ein Fehler, *Beschnitt* nur bei einem Motiv (nicht bei einer
Kulisse mit Abdunkelungsband), *Rand durch `contain`* ist nur eine Zahl im
Bericht. Der letzte Schritt ist ein **Gegenbeweis**: er nimmt `.keyart` das Band
und prüft, ob das Tor dann zuschlägt — ohne ihn wäre nicht zu unterscheiden, ob
die Suite nichts findet oder nichts mehr finden *kann*.

Ihr wichtigster Schritt heißt „Keine Aufschrift liegt unter einer durchlässigen
Auflage" und schließt eine Lücke, die **alle** vorherigen Prüfungen hatten:
`elementFromPoint` meldet ein Element als oberstes, obwohl ein
`pointer-events:none`-Overlay darüber malt. So blieb monatelang unbemerkt, dass
der Raritätsname auf jeder Kartenkachel vollständig verdeckt war. **Ein Hit-Test
beweist Anklickbarkeit, nicht Sichtbarkeit** (Details in `AA_UI_REFERENZ` §38).

Neu hinzugekommen sind `video_rueckfall.js` (11 Schritte) und **`qualitaet.js`**
(9 Schritte, 30.07.2026). `qualitaet.js` ist der messende Teil des
CEO-Durchgangs: Trefferflächen ≥ 44 × 44, kein Klick-Diebstahl, kein Überlauf
über den Bildschirmrand, kein abgeschnittener Text, kein Bild unter seiner
Anzeigeauflösung, kein leeres Bildfeld — jedes über **alle 16** Ansichten.
Ihr Kopf hält vier eigene Messfehler fest, die beim Bauen aufgetreten sind;
wer sie herausnimmt, holt sich falsche Befunde zurück (Einzelheiten in
`AA_UI_REFERENZ` §34.6). Die Schrittzahlen der
bestehenden Suiten haben sich am selben Tag mehrfach verschoben — `run_v6.js`
allein von 320 auf 334 —, deshalb steht hier **keine Gesamtsumme** mehr: eine
Zahl, die nach jedem Lauf falsch ist, verteidigt nichts. Die Tabelle unten
führt die Suiten einzeln auf; maßgeblich ist der Lauf, nicht der Kopf.

`iconfrei.js` und `sicht.js` sind nicht mitgezählt: sie prüfen die
**ausgelieferte** Seite und brauchen das volle `playwright`-Modul, das in diesem
Container nicht liegt (`Cannot find module 'playwright'`). Das ist eine
Umgebungsgrenze, kein Befund.

Die Tabelle unten führt alle 23 auf und summiert sich auf die 1 378. Jede Zahl
in der Spalte „Schritte" ist gemessen, nicht geschätzt — wer sie ändert, hat die
Suite laufen lassen. (Vier Suiten fehlten bis zum 30.07.2026 ganz in dieser
Tabelle, drei weitere trugen veraltete Zahlen. Eine Übersicht, die nicht stimmt,
ist schlimmer als keine: sie beendet das Nachzählen.)

## Aufruf

Örtlich (Chromium liegt unter `/opt/pw-browsers`):

```
export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
node run_v7.js
```

Das `NODE_PATH` ist nötig, weil `playwright` global installiert ist und
`playwright-core` deshalb unter ihm liegt, nicht im Aufrufverzeichnis. In
einem frisch gestarteten Container gibt es kein lokales `node_modules` —
ohne die Zeile scheitert **jede** Suite sofort mit `MODULE_NOT_FOUND`, und
das sieht aus wie ein kaputter Prototyp statt einer fehlenden Umgebung.

Die meisten Suiten laden
`file:///home/user/elemental-td/arena_patches/ui_prototype.html` direkt — kein
Server, kein Build.

**Drei starten einen eigenen HTTP-Server** (`assets_lokal.js`,
`packsprengung.js`, `belohnung.js`), und das ist kein Komfort, sondern notwendig. Sie lesen
Pixel von einer Leinwand, auf die das Packbild gezeichnet wird. Unter `file://`
gilt jede Datei als eigener, undurchsichtiger Ursprung: das Bild „taintet" die
Leinwand und `getImageData` wirft `SecurityError`. Über HTTP teilen Seite und
Bild einen Ursprung — und gemessen wird obendrein die Auslieferungsform, die auf
GitHub Pages wirklich läuft. Der Server bindet auf `127.0.0.1` mit Port 0, es
gibt also keine feste Portnummer, die kollidieren kann.

| Datei | Schritte | Gegenstand |
|---|---:|---|
| `run_v5.js` | 114 | Grundgerüst, Navigation, Sammlung, Festung, Packs |
| `run_v6.js` | 283 | Clan, Ghost-Clankrieg, Spenden, Rangliste, Post |
| `run_v7.js` | 337 | Startseite, Banner-Metrik, Pass, Guide, Profil, Avatare, Shop-Maße |
| `run_friends.js` | 25 | Freundesliste, Anfragen, Suche |
| `run_shop.js` | 36 | Tagesangebote, Booster-Packs, Gold, Tresor, Vorrats-Truhe |
| `avatare.js` | 12 | Fünf zur Wahl, Helden am Besitz, Auswahl im Raster |
| `login_kal.js` | 9 | Login-Kalender: drei pro Reihe, Tag 7 als Band |
| `home_menue.js` | 20 | Keine doppelten Wege, Menü-Icons lesbar |
| `splash.js` | 10 | Startbildschirm: Schriftzug, Ladebalken, Notausgang |
| `shop_raender.js` | 20 | Randfarben: Inhalt (Kristall/Gold) und Produktfamilie (Packs) |
| `flug.js` | 12 | Sammel-Animation — aus JEDEM Fenster, nicht nur aus dem Shop |
| `community.js` | 89 | Community-Reiter: Marken, echte Ziele |
| `spells.js` | 37 | Die vier Spells (Variante B): eine gemeinsame Arkan-Essenz, gleiche Caps/Kurven wie Türme, Fusion 3→nächste Rarität, **eigene Pack-Slots** ohne Berührung der Essenz-Slots, eigener Reiter, ehrliches Detail |
| `packoeffnung.js` | 70 | Pack-Öffnung: Zeitkurve **gekoppelt statt eingefroren**, Farbausströmung, sichtbare Karten, Abbruch, Neustart, **Raritäts-Leiter der Aufdeckung** |
| `quoten.js` | 48 | Drop-Raten hinter dem ⓘ — Auflage nach Apple 3.1.1 / Google Play |
| `essenzen.js` | 36 | Eine Essenz je Karte: Sortenliste == Kartenliste, Ankündigung == Buchung, Fach/Detail/Shop/Pass |
| `guide.js` | 36 | Defenders Guide: bewegbare Reiterleiste, großes Icon am offenen Reiter, Gegner/Boss als eigene Reiter, kein Booster-Reiter |
| `packsprengung.js` | 27 | Die Leinwand-Sprengung: Bruchfächer, Schweif ohne Vorhang, Vorbeiflug, Bildrate — **liest Pixel, braucht deshalb den HTTP-Server** |
| `deck.js` | 57 | Battle Deck: neun Slots, Auswahlfenster, Tausch, Sammlung |
| `offline.js` | 46 | Passive Offline-Erträge: Kappung, Abholung, Buchung |
| `bildzustand.js` | 20 | **Der Zustand mit ECHTEN Assets über HTTP, den örtlich sonst niemand sieht.** Währungsmotiv berührt den Rand nicht (Differenzbild, Kreisring ab 66 % Radius) — *auch ohne den Freistell-Filter*; Portrait in der Kachel wirklich SICHTBAR (Pixel, nicht `elementFromPoint`); Avatarwechsel ändert das Bild wirklich (Quelle **und** Pixel); Kopfleisten-Avatar bleibt in der Leiste. Jeder Schritt mit Gegenprobe |
| `belohnung.js` | 30 | **Das Belohnungsfenster (§29).** Alle drei Wege — normal abholen, Kristalle, Werbung. Kernfrage: stimmt jede Kachel mit dem ueberein, was WIRKLICH gebucht wurde? Gemessen Sorte fuer Sorte gegen `AC.getMaterials()` — **liest Pixel, braucht den HTTP-Server** |
| `assets_lokal.js` | 12 | **Liegen die Bilder im Repo, und kommen sie an?** Struktur (löst das Manifest auf `./assets/` auf), Platte (existiert jede Datei), Pixel (`naturalWidth > 0` je Ansicht) — plus die Mutationsprobe, dass `?cdn=1` den Schritt rot macht |
| `assets_vollstaendig.py` | 4 | Jedes benutzte Asset ist verzeichnet, gesichert UND aktuell |

`assets_vollstaendig.py` ist die einzige Prüfung hier, die kein Playwright
braucht (`python3 pruefungen/assets_vollstaendig.py` aus `arena_patches/`).

Sie deckt eine Lücke ab, die keine der anderen sehen kann: ein Asset, das
direkt in die `ASSETS`-Tabelle der HTML geschrieben wurde, ohne Eintrag in
`ui_assets.json`. So etwas fällt aus **jedem** Werkzeug heraus, das über die
Asset-Liste arbeitet — es wird nie gesichert und beim Freistellen als
„unbekannt" übersprungen. Still, ohne Fehlermeldung. Genau so sind 17
Bilder durchgerutscht, darunter vier Arena-Kulissen, die ein Werkzeug
deshalb sogar zerschnitten hat.

Am 29.07.2026 kam eine vierte Frage dazu: **zeigt die gesicherte Datei noch
auf dieselbe Quelle?** Die acht Pack-Bilder wurden gegen eine neue Fassung
getauscht — neuer URL, gleicher Schlüssel. Die drei Prüfungen davor meldeten
weiter grün, weil sie nur nach dem *Schlüssel* fragen; auf der Platte lagen
noch die alten Bilder. Ein grüner Balken, der eine veraltete Datei
durchwinkt, ist schlimmer als gar keine Prüfung: er beendet das Nachschauen.

## Grün heißt nicht geprüft — der Fall vom 29.07.2026

Am 29.07.2026 wurde das Upgrade-Material von drei geteilten Sorten auf
**eine eigene Sorte je Karte** umgestellt: neues Datenmodell, neue
Migration, neue Pack-Mechanik, sechs veränderte Stellen in der
Oberfläche. Danach liefen alle **fünfzehn** bestehenden Suiten durch —
**ohne eine einzige Anpassung**, 1 076/1 076 grün.

Das war kein Freibrief, sondern der Befund: **keine** dieser Suiten hatte
je etwas über das Material-System behauptet, was von der Zahl der Sorten
abhing. Sie hätten genauso grün gemeldet, wenn

* das neue Essenz-Fach leer geblieben wäre,
* ein Shop-Posten eine Sorte angekündigt und eine andere gebucht hätte,
* der Pass fünf von acht Sorten nie ausgeschüttet hätte,
* oder ein Level-Up die Essenz der falschen Karte abgezogen hätte.

Daraus `essenzen.js` — und die Regel dahinter:

> **Wenn eine Änderung an einem System keine einzige bestehende Prüfung
> rot macht, ist die erste Frage nicht „gut gelaufen", sondern: welche
> Prüfung hätte rot werden MÜSSEN?**

`essenzen.js` misst deshalb Kopplungen statt Zahlen: nicht „es sind acht
Sorten" (acht ist heute zufällig richtig), sondern *die Sortenliste und
die Kartenliste sind dieselbe Liste* — kommt morgen eine neunte Karte
dazu, wird die Prüfung rot, bis deren Essenz existiert.

Derselbe Gedanke im Modul-Selbsttest: die Essenz-Verteilung eines Packs
wird nicht gegen eine feste Prozentzahl geprüft, sondern gegen die
**Kartenverteilung desselben Laufs** — eine feste Zahl hätte
`HERO_WEIGHT` stillschweigend überschrieben. Und weil sich die beiden
Kurven ohnehin ähneln, prüft ein eigener Schritt die Kopplung direkt:
*jeder Essenz-Posten gehört zu einer Karte aus DIESEM Pack.*

## Nachtrag zur Ausnahme: sie ist am selben Tag wieder verschwunden

Der Abschnitt unten beschreibt, wie die Kopplung „eine Sorte je Karte"
am 30.07.2026 vormittags eine Ausnahme bekam (Spells teilen sich eine
Essenz). **Nachmittags war sie wieder weg** — die AA-Bildschirme zeigten,
dass dort jeder Spell sein eigenes Upgrade-Material hat, und die Ansage
lautete, es nachzubauen.

Beide Male wurde dieselbe Prüfung angefasst, und beide Male nach
derselben Regel: **sie sagt, was gilt — nicht, was gerade grün ist.**
Erst mit Ausnahme, dann wieder ohne. Was sie NIE tat, ist weicher zu
werden: die heutige Fassung fängt eine Karte ohne Essenz, eine Essenz
ohne Karte und einen Spell mit fremder Sorte.

Der Nebeneffekt ist die eigentliche Lehre: **eine Prüfung, die eine
Kehrtwende überlebt, ohne dass jemand sie aufweicht, hat den Umbau
begleitet statt ihn zu behindern.** Die Kehrtwende kostete zwei Stunden,
nicht zwei Tage — weil an jeder Stelle stand, warum sie so war.


## Eine Regel mit Ausnahme wird genauer, nicht weicher

Am 30.07.2026 kamen die Spells dazu, und die zentrale Kopplung des
Essenz-Systems stimmte nicht mehr: "Sortenliste == Kartenliste" gilt
seither nicht ausnahmslos, weil vier neutrale Spell-Karten sich **eine**
Sorte teilen (Arkan). Zwei Suiten wurden dadurch rot — `essenzen.js` und
der Modul-Selbsttest.

Der bequeme Weg wäre gewesen, die Prüfung auf "irgendwie passt das schon"
abzuschwächen. Stattdessen spricht sie die Regel jetzt **mitsamt ihrer
Ausnahme** aus, und jede Hälfte hat ihren eigenen Schritt:

* Turm- und Heldenkarten: **je eine eigene Sorte** (1:1)
* Spells: **alle gemeinsam** `arkan`
* Arkan: die **einzige Sorte ohne eigene Karte**
* und: jede Karte in `PERKS` ist **entweder** Turmkarte **oder** Spell

Damit fängt sie mehr als vorher, nicht weniger: eine Turmkarte ohne
Essenz wird rot, ein Spell mit eigener Essenz wird rot, und ein fünfter
Spell, den jemand einträgt ohne ihn in `SPELLS` aufzunehmen, ebenfalls —
denn dann ist er weder das eine noch das andere.

**Die Regel dahinter:** Wenn eine Änderung eine Kopplungsprüfung rot
macht, ist die Frage nicht "wie mache ich sie wieder grün", sondern "wie
lautet die Regel jetzt". Eine Prüfung, die man beim ersten Widerspruch
aufweicht, prüft danach gar nichts mehr.

## Eine eingefrorene Zahl sagt „falsch" zur richtigen Änderung

`packoeffnung.js` hatte die Gesamtdauer der Öffnungsszene als `ms / 30`
eingebaut — 3 000 ms, hart. Als die Szene am 29.07.2026 auf 4 000 ms
verlangsamt wurde (**weil** die Messung gegen das Referenzvideo genau das
verlangte), meldete die Prüfung Fehler. Nicht weil etwas kaputt war,
sondern weil sie eine Zahl festhielt statt einer Aussage.

Sie liest die Dauer jetzt dort, wo sie steht, und prüft die **Kopplung**:
alle `pk`-Ebenen laufen auf **einer** Dauer, und das CSS trägt dieselbe
wie die JS-Konstante `DAUER`. Laufen die beiden auseinander, fällt der
Vorhang mitten in der Bewegung — das ist der Fehler, der wirklich weh
tut, und den hätte keine Zahl gefunden.

Ebenso ersetzt sind die absoluten Schwellen der Glutkurve („springt auf
über 0,9"). Die wurden falsch, als der Schein **gedämpft** wurde — er war
mit 0,9 so hell, dass er die Farben ausbrannte (Helligkeit 76 gegen 41 im
Vorbild). Geprüft wird jetzt das Verhältnis: *der Hauptschlag liegt
mindestens doppelt über dem stärksten Puls davor*. Wie hell er absolut
ist, entscheidet die Messung gegen das Video — nicht die Prüfdatei.

## Messen und Ansehen finden verschiedene Fehler

Am selben Nachmittag, an derselben Szene, zwei Fehler:

* **Nur das Auge fand ihn:** die Grundregel `.pkcard{position:absolute;…}`
  war bei einem Ersetzungslauf verschwunden. Die Karten flogen unsichtbar
  durchs Bild — **die Öffnung zeigte keine einzige Karte**. Alle Schritte
  blieben grün, denn sie zählen die Klasse, nicht die Fläche. Jetzt legt
  die Prüfung eine `.pkcard` an und misst nach, ob sie eine hat.
* **Nur die Messung fand ihn:** der Schein fiel bei 47,5 % unter seinen
  Wert bei 40 % zurück — ein vierter Rückfall, wo nur drei hingehören.
  Auf dem Schirm ist das nicht zu sehen; die Zählung der Täler meldete es
  sofort.

Beide Wege werden gebraucht. Eine Suite, die nur misst, übersieht ein
leeres Bild; ein Blick, der nur schaut, übersieht eine Delle in einer
Kurve.

⚠ Und für Bildurteile gilt DESIGNSYSTEM §7b doppelt: örtlich ist das CDN
gesperrt, `.pkcard` trägt **nur** das Kartenbild. Wer so ein Messbild
beurteilt, beurteilt eine Szene ohne ihren Gegenstand. Der Messstand
setzt deshalb einen Platzhalter ein — sonst führt der Blick in die Irre,
und zwar überzeugend.

## Keine Prüfung darf an ihrer eigenen Laufzeit hängen

Vier Prüfungen sind an einem einzigen Tag rot geworden, ohne dass sich am
Produkt etwas geändert hätte — sie lasen `Date.now()` statt einen
festgehaltenen Zeitpunkt:

- **Truhen-Staffel**: maß Tag 0, +3 und +6. Je nach Wochentag fielen die
  späteren Proben in die nächste Woche, wo der Fortschritt zurücksetzt.
- **Clan-Sendelimit**: erschöpfte das Limit über fremde Anfragen — wie
  viele offen sind, hängt am Zeitpunkt. Bei zu wenigen brach die Schleife
  ab und meldete 9/10. `sendQuota`, `requests` und `donateCards` nehmen
  alle ein `now` entgegen; die Prüfung hat es nur nie benutzt.
- **Gratis-Posten im Shop**: summierte nur Gold und Kristalle. Der Posten
  wird täglich neu gezogen und kann auch Material sein — an so einem Tag
  maß sie 0 gegen erwartete 6.

Die Regel daraus: **wenn eine Mechanik ein `now` entgegennimmt, übergib
es.** Eine Prüfung, die vom Wochentag ihres Laufs abhängt, meldet
irgendwann einen Fehler, den es nicht gibt — und wer das zweimal erlebt,
schaut beim dritten Mal nicht mehr hin. Das ist der eigentliche Schaden.

Und ein Messfehler derselben Art: `materials` führt die Summe unter
`total` **neben** den Einzelsorten. Wer über alle Werte summiert, zählt
jede Einheit doppelt.

## Die zwei Sonderfälle — und warum es sie gibt

`sicht.js` und `iconfrei.js` laufen **nicht** örtlich, sondern gegen die
ausgelieferte Vorschau. Der Grund steht in DESIGNSYSTEM §7b und ist die
wichtigste Einschränkung dieses ganzen Verzeichnisses:

> Örtlich ist das Asset-CDN nicht erreichbar. Jedes Icon fällt auf sein Emoji
> zurück. Fehler der Bauart „Bild verdeckt Inhalt", „Icon bringt einen
> schwarzen Kasten mit" oder „Artwork ist unlesbar" sind für die neun Suiten
> oben **strukturell unsichtbar** — nicht schwer zu finden, sondern
> grundsätzlich nicht auffindbar.

Wer eine Bildfrage beantworten will, muss deshalb gegen die Auslieferung messen
oder sich das Bild ansehen. Ein Beispiel aus der Praxis: `av_smaragd` erfüllte
jede Kennzahl und war trotzdem falsch — der Kopf saß so hoch, dass die
Kreismaske ihn anschnitt. Aufgefallen ist das erst beim Ansehen einer Montage.
**Eine Kennzahl außerhalb ihres Korridors ist ein Hinweis, wo man hinsehen
soll; sie ersetzt das Hinsehen nicht.**

## Die Regel, an die sich jede Änderung hier halten muss

> Eine Prüfung, die eine Bugklasse oder eine überholte Bauart festschreibt, ist
> schlimmer als keine.

Wenn eine bestehende Prüfung einer Änderung widerspricht, **weil sich das
Design absichtlich geändert hat**, wird sie umgeschrieben — und zwar so, dass
sie die Anforderung DAHINTER weiter misst, nicht die alte Umsetzung. Die
Begründung gehört als Kommentar daneben, mit Datum.

Beispiele aus diesem Verzeichnis:

- „Die Pillen sind unterschiedlich breit" → „Die drei Währungen teilen die
  Leiste in gleiche Drittel". Die alte Fassung stammte aus der
  `flex:0 1 auto`-Zeit und schrieb genau die Bauart fest, die zweimal
  beanstandet worden war.
- „CHALLENGES-Kachel öffnet den Guide" → „Menü-Eintrag GUIDE öffnet den Guide".
  Dieselbe Aussage, über den Weg, den es noch gibt.
- „Solara ist bei 1 136 🏆 gesperrt" → „Solara ist frei, weil das Demo-Profil
  den Helden besitzt". Die Bedingung hat sich geändert, die Kopplung wird
  weiter geprüft.
- (29.07.2026, Guide-Reiterumbau) „Handbuch öffnet aus dem Guide" maß
  `#btnToManual` → `#viewManual.active`. Beides war die alte Bauart: ein
  eigener View hinter einem Notknopf, dessen Kommentar selbst sagte, dass er
  nur bis zum Umbau bleibt. Jetzt gemessen: der Guide ist aktiv, der Reiter
  `manual` ist gewählt, seine Fläche ist offen. Ebenso „Bestiarium öffnet auf
  Seite 1" → „Element-Rad ist ein eigener Reiter", „Gegner-Gitter zeigt das
  ganze Bestiarium" → „Gegner- und Boss-Reiter zusammen zeigen es" und
  „Zurück geht Detail → Gitter → Rad" → „Zurück geht eine Ebene hoch".

## Wenn eine Erklärung sich anbietet, erst nachmessen (30.07.2026)

Im Offline-Dialog stand statt eines Kartensymbols ein **leeres weißes Rechteck**.
Die naheliegende Erklärung: das Zeichen 🂠 hat in dieser Umgebung keinen
Schnitt, der Browser zeigt einen Ersatzkasten. Daraus wurde ein Prüfschritt
gebaut, der Zeichen im Unicode-Spielkartenblock verbietet.

**Beides war falsch.** Nachgemessen:

| Zeichen | Breite bei 40 px |
|---|---|
| fehlender Codepunkt (U+10FFFD) | 30,0 px |
| 🂠 U+1F0A0 | **40,9 px** |
| ⚗ (liest sich einwandfrei) | 35,9 px |
| 🃏 U+1F0CF | 49,9 px |

🂠 hat sehr wohl einen Schnitt — er **zeichnet** nur eine leere Karte. Und der
Blocktest hätte 🃏 verboten, also genau die richtige Lösung. Ein Prüfschritt,
der aus einer plausiblen Erklärung statt aus einer Messung gebaut wird,
schreibt den Denkfehler fest; dieser hier war beim ersten Lauf rot, obwohl
nichts kaputt war.

Zwei Lehren, beide stehen im Kopf von `offline.js`:

1. **„Sieht blank aus" ist mit CSS nicht messbar.** ⚗ ist schmaler als 🂠 und
   völlig in Ordnung. Der Fehler wurde durch **Ansehen** des Screenshots
   gefunden — wie schon die unsichtbare `.pkcard`. Das wird in der Prüfung
   offen zugegeben statt mit einem Ersatzmaß überdeckt.
2. **Die messbare Klasse darunter wird trotzdem geprüft**: ein Rückfall ohne
   jeden Schnitt. Verglichen wird gegen die zur Laufzeit ermittelte Breite
   eines garantiert leeren Codepunkts — nicht gegen die fest verdrahtete 30.

## Mutationstest: die Prüfung selbst kaputtmachen (30.07.2026)

`offline.js` war beim ersten grünen Lauf 42 von 42. Das sagt für sich genommen
nichts — eine Prüfung, die nichts misst, ist auch grün. Deshalb wurden drei
echte Fehler eingebaut und jeweils geprüft, dass die Datei rot wird:

| Mutation | erwartete Meldung | kam |
|---|---|---|
| Gold-Rate im Dialog fest verdrahtet (`1400` statt aus dem Modul) | Rate entkoppelt | ✔ „1400 gegen 1100" |
| `#offLayer.zu .itemclose` auf `visible` | zwei ✕ | ✔ „2 sichtbare ✕" |
| `DECKEL_H = 999` | Deckel greift nicht | ✔ zwei Schritte rot |

Die dritte Mutation hat zusätzlich einen **Fehler in der Prüfung** aufgedeckt:
der Schritt behauptete `gold === deckel × rate` und fiel um, obwohl das Modul
mit aufgehobenem Deckel völlig korrekt die vollen 20 h zahlte. Er prüfte seine
eigene Annahme („20 > Deckel") mit. Jetzt prüft er die Formel
(`min(abwesend, deckel) × rate`), und **dass** der Deckel greift, sagt die
Gegenprobe daneben. Ohne den Mutationstest wäre das nie aufgefallen.

## Bekannt rot: „gleiche Drittel" gegen „nichts abschneiden" (30.07.2026)

`run_v7.js` meldet **einen** Fehlschlag, der **nicht** aus der Arbeit an den
Offline-Erträgen stammt — er besteht schon im Stand von `HEAD` (nachgeprüft,
indem die Prüfung gegen `git show HEAD:…/ui_prototype.html` lief):

```
FAIL Die drei Waehrungen teilen die Leiste in gleiche Drittel  — 102 / 102 / 110 px
```

Dahinter stehen **zwei Anforderungen des Auftraggebers, die sich widersprechen**:

| # | Anforderung | Folge im CSS |
|---|---|---|
| A | *„Ressourcen Anzahl … muss zentriert sein"* (IMG_3386) — drei Zahlen auf einer Mitte | verlangt `flex:1 1 0`, exakte Drittel |
| B | Gold darf nicht als „12 5…" abgeschnitten werden (Befund aus dem Agenten-Audit) | verlangt `flex:1 1 auto`, Breite nach Inhalt |

Gemessen, damit die Entscheidung nicht wieder aus dem Bauch fällt:

| Aufbau | Breiten | Gold abgeschnitten? |
|---|---|---|
| `flex:1 1 auto` (heute) | 91,8 / 91,8 / **99,6** | nein |
| `flex:1 1 0` bei 390 px | 94,4 / 94,4 / 94,4 | **ja**, schon bei „12 500" |
| `flex:1 1 0` + Abstände auf 3/2 px bei 360 px | 86,5 × 3 | **ja** |

Die Abstände zu trimmen reicht **nicht**: bei 360 px passt keine sechs- oder
siebenstellige Zahl in ein Drittel bei 14 px Schrift. Beide Anforderungen sind
nur gleichzeitig erfüllbar, wenn die Zahl **kürzer wird** — also mit einer
kompakten Schreibweise („126 K", „1,27 Mio."), wie AA und praktisch jedes
Mobile-Spiel sie im Kopf benutzt.

**Das ist eine Produktentscheidung, keine Aufräumarbeit**, und sie ändert die
Darstellung jeder Währung im Spiel. Deshalb bleibt der Schritt bewusst **rot**,
statt ihn auf eine Toleranz aufzuweichen: eine Prüfung, die man passend macht,
damit sie grün ist, hätte den Konflikt für immer zugedeckt. Sobald die
Schreibweise entschieden ist, wird der Schritt grün, ohne dass man ihn anfasst.

## Die Gegenprobe hat eine falsche Diagnose entlarvt (30.07.2026)

Befund des Auftraggebers: *„Das Ressourcen Icon ist nicht im Kreis."* Gold saß
sichtbar anders in seiner Fassung als Trophäe und Gem.

**Erste Erklärung, plausibel und falsch:** `.cur .ico` habe kein `object-fit`,
das Motiv werde also auf 18×18 gestreckt. Es wurde ein Prüfschritt gebaut
(„object-fit ist gesetzt"), ein `contain` eingetragen, alles grün.

Dann der Mutationstest: `contain` wieder entfernt — **und die Prüfung blieb
grün**. Grund: die Basisregel `.ico` setzt `object-fit:contain` ohnehin für
alle. Der „Fix" war ein No-op, der Prüfschritt konnte nie rot werden.

**Die echte Ursache** fand erst das *Ansehen* des Screenshots bei dreifacher
Vergrößerung: die dunkle Scheibe ist sehr wohl da. `cur_gold` ist ein satter
Münzstapel, der seine Bildfläche randlos ausfüllt; `cur_trophy` und `cur_gem`
sind Einzelobjekte mit rund einem Viertel transparenter Luft. Bei 18 von 24 px
stößt ein randloses Motiv an die Rundung — das liest sich als „nicht im Kreis".
Es war eine Eigenschaft des **Assets**, nicht des Stylesheets.

Drei Lehren:

1. **Ein Prüfschritt ohne Gegenprobe kann eine Fehldiagnose zementieren.** Hier
   hätte er dauerhaft grün behauptet, das Problem sei gelöst.
2. **Eine plausible Erklärung ist keine Messung.** Dieselbe Falle wie beim
   Kartensymbol 🂠 im selben Sweep — zweimal am selben Tag.
3. **Die Regel darf keine Ausnahme für ein Asset sein.** Behoben ist es
   deshalb an der *Fassung* (`.cur i{padding:4.5px}`, eine Regel für alle drei),
   nicht mit einem Sonderfall für `c-gold`. Geprüft wird die Anforderung
   dahinter: *ein randloses Motiv darf den Ring nicht zudecken* — messbar mit
   einem eigens erzeugten randlosen Testmotiv, und rot, sobald der Rand fehlt.

Die Datei dazu ist **`bildzustand.js`**. Sie schließt den strukturellen blinden
Fleck aller anderen Prüfungen hier: örtlich ist das CDN nicht erreichbar, jedes
Icon fällt auf ein Emoji zurück (DESIGNSYSTEM §7b), der Zustand „ein echtes
`<img>` liegt im Kasten" ist also nie zu sehen. `bildzustand.js` setzt echte
Bilder als `data:`-URI ein und macht den Live-Zustand örtlich prüfbar. Beide
Fehler dieses Tages — das Icon und der glitchende Avatar — waren genau von
dieser Sorte: live sofort sichtbar, hier strukturell unsichtbar.

### Nachtrag am selben Abend: `bildzustand.js` war grün und beide Fehler kamen zurück

Der Auftraggeber meldete von der Live-Seite: *„Gold fittet noch immer nicht in
den Kreis"* und *„Avatar System … wenn ich einen anderen Avatar wähle kommt
wieder der Platzhalter"*. Beides stimmte, beides war nachmessbar — und diese
Datei war grün. Fünf Gründe, jeder einzeln ausreichend; sie stehen ausführlich
im Kopf von `bildzustand.js` und hier als **Regeln für jede neue Prüfung**:

1. **Fester Pfad = falscher Baum.** `DATEI` zeigte auf
   `/home/user/elemental-td/…`; aus einem Worktree misst das einen fremden
   Stand. **Immer `__dirname`.** (`avatare.js` hatte denselben Fehler.)
2. **Ersatzbilder messen keine Assets.** Die Datei setzte eigene `data:`-Motive
   ein und lief über `file://`. Sie hat nie ein Asset aus `assets/` geladen —
   und dort lagen beide Ursachen: `cur_gold` hat als einziges Motiv einen
   *hellen* eingebackenen Grund (13 % gegen 8 % und 7 %) und füllt sein Bild
   randlos (100 % gegen 36 % und 43 %); die `frame_*.webp` sind durchgehend
   deckend (Alpha 255, Innenfläche 7–9 % Luminanz). **Eigener HTTP-Server,
   echte Dateien.**
3. **Wer sein Prüfobjekt selbst schreibt, prüft sich selbst.** Für den Avatar
   stand hier `i.innerHTML = '<span class="avemo">…</span><img …>'`. Das war
   genau der eine Kasten, der schon repariert war. Die vier Geschwister
   `.avcpic`, `.avpvpic`, `.pfpic`, `.avcerpic` trugen den Fehler weiter; das
   Fenster „Profil bearbeiten" wurde nie geöffnet. **Messen, was die App
   rendert.**
4. **Geometrie sieht kein Overlay.** Alle Avatarschritte waren
   `getBoundingClientRect`. Eine deckende Grafik hat dieselben Rechtecke wie
   eine durchsichtige. **Pixel messen**, wenn die Frage „sieht man es?" lautet.
5. **`elementFromPoint` wäre auch grün gewesen.** Die Rahmenringe tragen
   `pointer-events:none`; der Treffer in der Kachelmitte war das `IMG`, obwohl
   darüber eine deckende Grafik lag. **Nie als Kriterium für Verdeckung.**

Und eine Lehre zur *Reparatur*: die Fassung war nur deshalb rund, weil
`filter:url(#icoFrei)` den eingebackenen Grund wegschneidet. Geprüft wird im
Chromium, gemeldet wird vom iPhone. **Eine Zusicherung, die an einem
SVG-Filter hängt, ist keine.** Das Motiv trägt jetzt seine eigene Rundung
(`.cur .ico{border-radius:50%}`), und ein eigener Schritt misst den freien
Ring *mit abgeschaltetem Filter*.

## Die Prüfung darf den Messgegenstand nicht anfassen (30.07.2026)

Beim Bau von `packsprengung.js` sind zwei Prüfungsfehler entstanden, die
beide dieselbe Wurzel haben: die Messung hat verändert, was sie messen
wollte. Sie stehen als Warnung in der Datei und hier als Regel.

**Die Gegenprobe hat die Szene kaputtgemacht.** Der Schritt „die
Vorhangmessung würde einen echten Vorhang finden" hat ein deckendes Rechteck
auf `#pkFx` gemalt — auf die *echte* Leinwand. Der nächste Schritt („nachher
ist nichts mehr da") sah daraufhin 100 % Deckung und wurde rot. Nicht wegen
des Codes, sondern wegen der Prüfung davor. Eine Gegenprobe gehört auf eine
eigene, lose Leinwand.

**`getImageData` bremst, was es messen soll.** Jeder Aufruf zieht die
Bilddaten von der Grafikeinheit in den Hauptspeicher zurück und legt die
Zeichenkette lahm. Eine Messung, die alle 100 ms zwei große Leinwände
ausliest, hat 1,5 Bilder je Sekunde gemessen — nicht die Szene, sondern sich
selbst. Erst eine Zählung *ohne* Rückfrage hat die echte Zahl gezeigt.

Daraus folgt eine Regel, die über Leinwände hinausgeht: **kein Schritt darf
auf einem festen Zeitpunkt „x ms nach dem Ereignis" stehen, wenn die
Prüfungsumgebung selbst die Uhr verbiegt.** Zwei Schritte in
`packsprengung.js` waren genau so gebaut und rot, obwohl der Code stimmte.
Richtig ist: auf den Zustand *warten*, mit Obergrenze — dann bleibt der
Schritt rot, wenn der Zustand ausbleibt, und grün, wenn er nur spät kommt.
Was in *Teilchenzeit* wie lange dauert, prüft der Selbsttest des Moduls
ohne Browser; dort verbiegt niemand die Uhr.

## Vorhandensein ist nicht Sichtbarkeit (30.07.2026, Deck-Reiter)

`run_v5.js` zählte die Kacheln der Sammlung mit
`locator('#collGrid .tile').count()` — sechs, grün. Sichtbar war keine
einzige: der zweite Bottom-Nav-Platz führt seit dem Battle Deck auf zwei
gleichrangige Reiter, und das Deck ist der voreingestellte, also lag das
Sammlungs-Raster hinter `display:none`. Gemeldet hat es erst der *Klick* im
Schritt danach, mit „element is not visible" — als Absturz, nicht als
Fehlschlag.

`count()` fragt das DOM, nicht den Bildschirm. Wo ein Schritt behauptet,
etwas werde *gezeigt*, muss `isVisible()` dabei sein. Der Schritt ist
entsprechend erweitert.

## Ein Test, der eine abgeschaffte Bauweise einfriert (30.07.2026, dritter Fall)

`run_v5.js` prüfte nach dem Pack-Öffnen: „ein Tipp bricht die Szene ab" und
danach „die Karten im Raster liegen verdeckt". Beides war die Anforderung von
*vorher*. Das Zeitschloss der Szene ist absichtlich weg — ein Tipp deckt
genau eine Karte auf —, also blieb die Szene offen, das Raster war nie
erreichbar, und der Test starb an einem `TypeError` auf `null`.

Beim Neuschreiben ist ein echter Fehler aufgefallen, den kein Schritt
gemeldet hatte: der Spieler wurde nach der Zeremonie im Raster gebeten,
**dieselben Karten noch einmal anzutippen**. Zweimal dasselbe Geschenk
auspacken. Das ist der vierte Beleg an einem Tag für dieselbe Sache — der
Fehler lag zwischen zwei Teilen, die jeder für sich grün waren.

Merke: eine abgestürzte Prüfung ist kein Umbauhindernis, sondern ein
Hinweis darauf, dass in der Nähe eine Anforderung veraltet ist. Nur den
Selektor zu reparieren hätte den doppelten Reveal nicht gefunden.

## Ein Filter, der einen Fehler jahrelang deckt (30.07.2026, `assets_lokal.js`)

Der schwerste Befund dieses Tages kam vom Auftraggeber, nicht von hier: „Wieso
sind Images und icons nicht in der Version?" Das Manifest in
`ui_prototype.html` löste 218 von 226 Assets auf ein fremdes CDN auf, während
dieselben Dateien byte-geprüft im Repo lagen.

Warum keine der 24 Suiten das gesehen hat, ist die Lektion. **Fünf** von ihnen
tragen dieselbe Zeile:

```js
if (/ERR_|net::|Failed to load resource|cloudfront|\.png|\.mp4|\.mp3/i.test(t)) return;
```

Die Zeile war richtig, als sie geschrieben wurde: das CDN ist von hier gesperrt,
jedes Bild scheiterte, ohne Filter wäre jede Suite dauerrot gewesen. Ab dem
Moment, in dem die Dateien ins Repo wanderten, war derselbe Filter ein Sieb für
echte 404. Er hat nicht gelogen — er hat aufgehört, die Wahrheit zu sagen, ohne
sich dabei zu ändern.

Zwei Schritte gingen weiter und machten den Ausfall zur **Anforderung**:
„Emoji-Fallback greift bei blockiertem CDN" verlangte `span.ico > 10`, und die
Upgrade-Kosten wurden über ein 🪙 im `textContent` geprüft — das dort nur stand,
weil das Gold-Icon zurückgefallen war. Als die Bilder zu laden begannen, wurden
beide rot. Nicht wegen eines Fehlers: **wegen der Verbesserung.**

Drei Regeln daraus:

1. **Ein Filter braucht ein Ablaufdatum in Form einer Bedingung.** Nicht
   „Bildfehler ignorieren", sondern „Fehler an *diesem* Host ignorieren, solange
   er in `NICHT_ERREICHBAR.json` steht". Die fünf Suiten prüfen jetzt zuerst auf
   `/assets/` und melden das als echten Fehler.
2. **Nie den Umgebungsdefekt als Zusage formulieren.** „Bei blockiertem CDN
   greift der Rückfall" ist keine Anforderung an das Produkt, sondern eine
   Beschreibung dieser Baumaschine. Die Zusage lautet „fällt ein Icon aus, steht
   sein Emoji da" — und die prüft man mit einem **erzwungenen** Ausfall.
3. **Wenn ein Schritt rot wird, erst fragen, ob er das Richtige verlangt.** Hier
   waren zwei rote Schritte das Symptom einer Reparatur.

Und ein vierter Punkt, der `assets_lokal.js` selbst betrifft: die erste Fassung
meldete 34 leere Bilder. Alle 34 waren `loading="lazy"` in einer Ansicht mit
`display:none` — Chromium lädt die zu Recht nicht. Der Schritt hat also
korrektes Verhalten angeschwärzt, und zwar in der Datei, die genau diese Sorte
Fehler verhindern soll. Er misst jetzt nur, was im Layout steht, nachdem die
Ansicht gezeigt und durchgerollt wurde. Dazu die Mutationsprobe: mit `?cdn=1`
**muss** der Pixel-Schritt hier rot werden (20/20 leer). Bliebe er grün, wäre
der gemeldete Fehler auch an dieser Suite vorbeigelaufen.

## Eine Klasse, die es schon gab (30.07.2026, Belohnungsfenster)

Das neue Belohnungsfenster (§29) bekam die Namen `#rwLayer`, `.rwcell`, `.rwpop` — „rw"
für *reward*, naheliegend und sauber gewählt. Beim ersten Lauf von `belohnung.js` waren
zwei Schritte rot:

* der Kachelrand trug `rgb(38,52,63)` statt der Raritätsfarbe,
* ein Tap in den ersten Millisekunden schloss das Fenster, obwohl eine Sperre dagegen steht.

Zwei sehr verschiedene Symptome, eine Ursache: **beide Namen waren längst vergeben.**
`.rwcell` ist die Belohnungskachel des Season-Pass (35 Verwendungen), und `#rwLayer` war
bereits die Belohnungs-Ebene der Trophäenstraße. Es gab also **zwei Elemente mit derselben
ID** — `$("rwLayer")` traf meins, der fremde Klick-Handler rief `closeRewards()` und schloss
es an der Sperre vorbei. Und meine `.rwcell`-Regeln, darunter `opacity:0` plus Einflug-
Animation, lagen ab sofort auch auf den Pass-Kacheln.

Die Lehre ist nicht „besser aufpassen", sondern:

> **Vor einem neuen Klassen- oder ID-Präfix einmal `grep -oE '\bprefix[A-Za-z]+'` laufen
> lassen.** Zehn Sekunden gegen eine Kollision, die sich als drei unabhängige Fehler tarnt.

Bemerkenswert ist, was die Kollision NICHT ausgelöst hat: keine Konsolenmeldung, kein
ungültiges HTML nach außen, keine der 22 bestehenden Suiten rot. Ein doppeltes `id` ist in
HTML zwar ungültig, aber Browser reparieren es still — `getElementById` nimmt einfach das
erste. Gefunden hat es allein der Schritt, der die Randfarbe gegen `AC.TIERS` **nachrechnet**
statt sie nur vorhanden zu finden. Eine Prüfung, die „hat einen Rand" gefragt hätte, wäre
grün geblieben.

## Was hier NICHT liegt

Die Wegwerf-Skripte aus der Arbeit am Prototyp (`diag*.js`, `mess*.js`,
`shot_*.js` und Ähnliches) sind bewusst nicht eingecheckt. Sie beantworten
jeweils eine Frage eines Nachmittags und werden danach falsch, ohne dass es
jemand merkt — das ist die schlechteste Sorte Prüfung.
