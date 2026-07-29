# Prüfungen

Fünfzehn Playwright-Suiten mit zusammen **1 064 Schritten**, plus zwei
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
| `run_shop.js` | 34 | Tagesangebote, Booster-Packs, Gold, Tresor, Vorrats-Truhe |
| `avatare.js` | 12 | Fünf zur Wahl, Helden am Besitz, Auswahl im Raster |
| `login_kal.js` | 9 | Login-Kalender: drei pro Reihe, Tag 7 als Band |
| `home_menue.js` | 20 | Keine doppelten Wege, Menü-Icons lesbar |
| `splash.js` | 10 | Startbildschirm: Schriftzug, Ladebalken, Notausgang |
| `shop_raender.js` | 20 | Randfarben: Inhalt (Kristall/Gold) und Produktfamilie (Packs) |
| `flug.js` | 12 | Sammel-Animation — aus JEDEM Fenster, nicht nur aus dem Shop |
| `community.js` | 89 | Community-Reiter: Marken, echte Ziele |
| `packoeffnung.js` | 36 | Pack-Öffnung: gemessene Zeitkurve, Abbruch, Neustart |
| `quoten.js` | 38 | Drop-Raten hinter dem ⓘ — Auflage nach Apple 3.1.1 / Google Play |
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
