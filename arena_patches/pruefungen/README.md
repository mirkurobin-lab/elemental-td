# Prüfungen

Neun Playwright-Suiten mit zusammen **813 Schritten**, plus zwei Sonderprüfungen,
die nur mit tatsächlich geladenen Bildern laufen.

## Aufruf

Örtlich (Chromium liegt unter `/opt/pw-browsers`, `playwright-core` muss im
Aufrufverzeichnis auffindbar sein):

```
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node run_v7.js
```

Die Suiten laden `file:///home/user/elemental-td/arena_patches/ui_prototype.html`
direkt — kein Server, kein Build.

| Datei | Schritte | Gegenstand |
|---|---:|---|
| `run_v5.js` | 107 | Grundgerüst, Navigation, Sammlung, Festung, Packs |
| `run_v6.js` | 280 | Clan, Ghost-Clankrieg, Spenden, Rangliste, Post |
| `run_v7.js` | 333 | Startseite, Banner-Metrik, Pass, Guide, Profil, Avatare, Shop-Maße |
| `run_friends.js` | 25 | Freundesliste, Anfragen, Suche |
| `run_shop.js` | 30 | Tagesangebote, Booster-Packs, Gold, Tresor, Vorrats-Truhe |
| `avatare.js` | 12 | Fünf zur Wahl, Helden am Besitz, Auswahl im Raster |
| `login_kal.js` | 9 | Login-Kalender: drei pro Reihe, Tag 7 als Band |
| `home_menue.js` | 17 | Keine doppelten Wege, Menü-Icons lesbar |
| `splash.js` | 10 | Startbildschirm: Schriftzug, Ladebalken, Notausgang |
| `assets_vollstaendig.py` | 3 | Jedes benutzte Asset ist verzeichnet UND gesichert |

`assets_vollstaendig.py` ist die einzige Prüfung hier, die kein Playwright
braucht (`python3 pruefungen/assets_vollstaendig.py` aus `arena_patches/`).
Sie deckt eine Lücke ab, die keine der anderen sehen kann: ein Asset, das
direkt in die `ASSETS`-Tabelle der HTML geschrieben wurde, ohne Eintrag in
`ui_assets.json`. So etwas fällt aus **jedem** Werkzeug heraus, das über die
Asset-Liste arbeitet — es wird nie gesichert und beim Freistellen als
„unbekannt" übersprungen. Still, ohne Fehlermeldung. Genau so sind 17
Bilder durchgerutscht, darunter vier Arena-Kulissen, die ein Werkzeug
deshalb sogar zerschnitten hat.

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

## Was hier NICHT liegt

Die Wegwerf-Skripte aus der Arbeit am Prototyp (`diag*.js`, `mess*.js`,
`shot_*.js` und Ähnliches) sind bewusst nicht eingecheckt. Sie beantworten
jeweils eine Frage eines Nachmittags und werden danach falsch, ohne dass es
jemand merkt — das ist die schlechteste Sorte Prüfung.
