# Auslieferung — warum die Vorschau nicht Byte für Byte dem Repo entspricht

Die Live-Vorschau unter <https://prisma-td-vorschau.higgsfield.app/ui> entsteht
**nicht** durch bloßes Kopieren von `ui_prototype.html`. Zwischen Repo und
Auslieferung liegt ein Schritt, der die Assets freistellt. Dieses Dokument
erklärt, warum es diesen Schritt gibt und was er genau tut — damit niemand
(auch ich nicht) den Unterschied später für einen Fehler hält.

## Der Befund, der den Schritt nötig macht

Stand 27.07.2026, gemessen über alle 166 Assets in `ui_assets.json`:

> **Kein einziges Asset hat einen Alphakanal. 149 tragen einen eingebackenen
> dunklen Grund.**

Der Bildgenerator liefert deckende Rechtecke. Ein Icon ist damit immer ein
schwarzes Kästchen mit einem Motiv drin, ein Sektionsband immer ein schwarzer
Kasten mit einer Schleife drin. Das ist die Ursache hinter allen Beschwerden
des Auftraggebers über „schwarzen Hintergrund" — und der Grund, warum keine
CSS-Änderung sie je beheben konnte.

## Was der Schritt tut

`werkzeuge/freistellen.py` schneidet den vom Bildrand zusammenhängenden dunklen
Grund heraus und schreibt einen echten Alphakanal. Die Begründung des
Verfahrens und seine zwei Sicherungen stehen im Kopf der Datei.

Zusätzlich werden in der ausgelieferten HTML **zwei** Regeln umgestellt:

| Regel im Repo | in der Auslieferung | warum |
|---|---|---|
| `img.ico{--frei:url(#icoFrei);filter:var(--frei)}` | `img.ico{--frei: ;}` | Der SVG-Filter leitet die Deckkraft aus der Helligkeit ab. Gegen die **un**freigestellten CDN-Bilder ist er richtig, gegen freigestellte frisst er die dunklen Stellen im Motiv. |
| `.secribbon{box-shadow:var(--lit-2),var(--unlit),var(--sh-2)}` | `.secribbon{box-shadow:none}` | `box-shadow` zeichnet immer das **Rechteck** des Elements. Bei einem geformten Band ist das ein dunkler Kasten drumherum. Die Tiefe kommt stattdessen aus `filter:drop-shadow`, das der Alphaform folgt. |

**Deshalb bleiben beide Regeln im Repo stehen, wie sie sind.** Wer
`ui_prototype.html` direkt gegen das CDN öffnet, bekommt die Originalbilder mit
Grund — und dafür sind der Filter und der Rechteckschatten die richtige
Behandlung. Die Umstellung gehört zur Auslieferung, nicht zur Quelle.

## Ablauf

1. Vorschau-Repo klonen (`website_repo_access` liefert URL, Zweig und Token).
2. `ui_prototype.html` vom GitHub-Zweig holen und als **`app/public/ui.html`**
   ablegen. ⚠ **`ui.html` ist die ausgelieferte Datei, nicht
   `ui_prototype.html`** — `/ui` liefert `ui.html`. Am 29.07.2026 lag eine
   fertige Fassung eine Runde lang in `ui_prototype.html`: Push ging durch,
   Deploy meldete Erfolg, live lag weiter der alte Stand, und kein Schritt
   schlug fehl. Dann `CDN + "….png"`
   und `CDNA + "….png"` auf `IMG + "….webp"` umschreiben und `var IMG = "/img/";`
   vor `var CDN` einfügen.
3. Fehlende Bilder nach `app/public/img/` holen — bevorzugt die `_min.webp`
   (volle Auflösung, 32–54 KB statt 1,3–1,7 MB, PSNR 37,7 dB).
4. **`python3 werkzeuge/freistellen.py app/public/img ui_assets.json`**
5. Die beiden Regeln aus der Tabelle oben in der ausgelieferten HTML ersetzen.
6. Committen, pushen, `deploy_website` aufrufen.

## Wo das hin soll

Der Schritt ist eine Reparatur, kein Zielzustand. Richtig wäre, die
freigestellten Fassungen als eigene Assets hochzuladen und `ui_assets.json`
darauf zeigen zu lassen — dann fällt der Sonderweg weg und die örtlichen
Prüfungen sähen dieselben Bilder wie die Auslieferung. Das sind rund 130
Uploads und steht aus.

## Offen: `prop_obelisk`

Ein Asset hat die Freistellung **verweigert** — bei ihm blieben nur 9 % Motiv
übrig, das Werkzeug hat es deshalb unverändert gelassen. Es braucht eine
Neuerzeugung mit hellerem Motiv oder dunklerem Grund. Bis dahin trägt es
sichtbar seinen schwarzen Kasten; das ist gewollt und besser als ein
zerschnittenes Bild.
