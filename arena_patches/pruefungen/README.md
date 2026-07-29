# Prüfungen

Sechzehn Playwright-Suiten mit zusammen **1 133 Schritten**, plus zwei
Sonderprüfungen, die nur mit tatsächlich geladenen Bildern laufen.

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

Die Suiten laden `file:///home/user/elemental-td/arena_patches/ui_prototype.html`
direkt — kein Server, kein Build.

| Datei | Schritte | Gegenstand |
|---|---:|---|
| `run_v5.js` | 108 | Grundgerüst, Navigation, Sammlung, Festung, Packs |
| `run_v6.js` | 281 | Clan, Ghost-Clankrieg, Spenden, Rangliste, Post |
| `run_v7.js` | 334 | Startseite, Banner-Metrik, Pass, Guide, Profil, Avatare, Shop-Maße |
| `run_friends.js` | 25 | Freundesliste, Anfragen, Suche |
| `run_shop.js` | 36 | Tagesangebote, Booster-Packs, Gold, Tresor, Vorrats-Truhe |
| `avatare.js` | 12 | Fünf zur Wahl, Helden am Besitz, Auswahl im Raster |
| `login_kal.js` | 9 | Login-Kalender: drei pro Reihe, Tag 7 als Band |
| `home_menue.js` | 20 | Keine doppelten Wege, Menü-Icons lesbar |
| `splash.js` | 10 | Startbildschirm: Schriftzug, Ladebalken, Notausgang |
| `shop_raender.js` | 20 | Randfarben: Inhalt (Kristall/Gold) und Produktfamilie (Packs) |
| `flug.js` | 12 | Sammel-Animation — aus JEDEM Fenster, nicht nur aus dem Shop |
| `community.js` | 89 | Community-Reiter: Marken, echte Ziele |
| `packoeffnung.js` | 60 | Pack-Öffnung: Zeitkurve **gekoppelt statt eingefroren**, Farbausströmung, sichtbare Karten, Abbruch, Neustart, **Raritäts-Leiter der Aufdeckung** |
| `quoten.js` | 48 | Drop-Raten hinter dem ⓘ — Auflage nach Apple 3.1.1 / Google Play |
| `essenzen.js` | 33 | Eine Essenz je Karte: Sortenliste == Kartenliste, Ankündigung == Buchung, Fach/Detail/Shop/Pass |
| `guide.js` | 36 | Defenders Guide: bewegbare Reiterleiste, großes Icon am offenen Reiter, Gegner/Boss als eigene Reiter, kein Booster-Reiter |
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

## Was hier NICHT liegt

Die Wegwerf-Skripte aus der Arbeit am Prototyp (`diag*.js`, `mess*.js`,
`shot_*.js` und Ähnliches) sind bewusst nicht eingecheckt. Sie beantworten
jeweils eine Frage eines Nachmittags und werden danach falsch, ohne dass es
jemand merkt — das ist die schlechteste Sorte Prüfung.
