#!/usr/bin/env python3
"""freistellen.py — entfernt eingebackene dunkle Gruende aus den Assets.

WARUM ES DIESES WERKZEUG GIBT
-----------------------------
Am 27.07.2026 habe ich alle 166 Assets vermessen. Das Ergebnis:

    kein einziges hatte einen Alphakanal, 149 trugen einen eingebackenen
    dunklen Grund.

Das ist die Ursache hinter einer ganzen Beschwerdekette des Auftraggebers,
die sich ueber Wochen zog und die ich vorher jedes Mal an der falschen
Stelle gesucht habe:

    „Entferne bei jedem Icon den schwarzen Hintergrund ueberall in der ui"
    „Unten die icons haben immernoch viereckigen schwarzen Hintergrund"
    „Die Banner Shop nur fuer dich usw sind noch immer mit leicht
     schwarzem Hintergrund"
    „Alle Sachen Shop/gems usw immernoch mit schwarzem Hintergrund der
     Hintergrund muss transparent gemacht werden oder rgeschnitten werden"

Ich habe zwischendurch geglaubt, es sei eine CSS-Platte hinter dem Band,
dann ein `box-shadow`, dann ein toter Rand in der Grafik. Alle drei waren
falsch. Der Grund lag im Bild selbst, und kein CSS der Welt bekommt einen
deckenden Pixel weg.

Das Pflaster davor war ein SVG-Filter (`#icoFrei`), der die Deckkraft aus
der Helligkeit ableitet. Der frisst zwangslaeufig die dunklen Stellen im
Motiv mit — ein dunkler Turm auf schwarzem Grund verliert seine eigene
Silhouette. Dieses Werkzeug macht es richtig.

DAS VERFAHREN
-------------
Der Grund ist die vom BILDRAND aus zusammenhaengende Flaeche dunkler
Pixel. Diese Einschraenkung ist der ganze Unterschied zum Helligkeits-
filter: eine dunkle Stelle mitten im Motiv beruehrt den Rand nicht und
bleibt deshalb deckend. Beim Sektionsband heisst das konkret — der dunkle
Bandkoerper bleibt stehen, das Schwarz um die Goldornamente herum geht.

Die Schwellwerte werden NICHT geraten, sondern aus dem Randstreifen
abgeleitet: der Rand IST der Grund, also kennt er seine eigene
Helligkeit. Ein fester Wert war der Fehler im ersten Durchlauf — er hat
`el_dunkelheit` (dunkles Icon auf dunklem Grund) auf 7 % Restmotiv
zusammengeschnitten.

DIE ZWEI SICHERUNGEN
--------------------
1. Kein Schluessel in `ui_assets.json` -> nicht anfassen. Was ich nicht
   benennen kann, kann ich nicht beurteilen. Genau hier sind mir im ersten
   Durchlauf die vier Arena-Kulissen durchgerutscht und wurden zerschnitten.
2. Bleibt weniger als MIND_DECKEND vom Motiv uebrig, wird mit engerem
   Schwellwert wiederholt; hilft das nicht, wird die Datei UNVERAENDERT
   gelassen und gemeldet. Ein zerstoertes Asset ist schlimmer als ein
   Asset mit schwarzem Kasten — den sieht man, den anderen nicht.

VOLLFLAECHIGE ARTWORKS
----------------------
Arenen-Kulissen, Kartenbilder, Teaser und Breitbanner sind randlos
gedacht: bei ihnen IST der dunkle Rand Teil des Bildes (Himmel, Vignette).
Sie stehen in AUSNAHME und werden nie geschnitten.

AUFRUF
------
    python3 freistellen.py <bildordner> <ui_assets.json>

Aendert die Dateien an Ort und Stelle (WebP mit Alphakanal, Guete 90).
"""
import os
import re
import sys
import json
from collections import deque

import numpy as np
from PIL import Image

# Randlos gedachte Bilder: hier waere ein Schnitt immer falsch.
AUSNAHME = re.compile(r"^(arena\d+|card_|tk_|tz_|event_|kulisse|pack_arena|packart_|bg_|fort_castle)")

MIND_DECKEND = 0.10   # bleibt weniger uebrig, ist der Schnitt falsch
MIND_GRUND = 0.03     # darunter lohnt der Eingriff nicht
FEIN = 320            # Kantenlaenge, auf der der Zusammenhang bestimmt wird


def helligkeit(a):
    return .299 * a[..., 0] + .587 * a[..., 1] + .114 * a[..., 2]


def randflut(L, grenze):
    """Vom Bildrand zusammenhaengende Flaeche mit L < grenze (4er-Nachbarschaft)."""
    h, w = L.shape
    kandidat = L < grenze
    S = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if kandidat[y, x] and not S[y, x]:
                S[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if kandidat[y, x] and not S[y, x]:
                S[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and kandidat[ny, nx] and not S[ny, nx]:
                S[ny, nx] = True
                q.append((ny, nx))
    return S


def weite(M, runden=2):
    for _ in range(runden):
        D = M.copy()
        D[1:, :] |= M[:-1, :]
        D[:-1, :] |= M[1:, :]
        D[:, 1:] |= M[:, :-1]
        D[:, :-1] |= M[:, 1:]
        M = D
    return M


def schneide(L, unten, oben):
    """Der ZUSAMMENHANG wird grob bestimmt (schnell), die DECKKRAFT fein aus
    der vollen Aufloesung. So entsteht die Kante aus echten Pixeln, waehrend
    die teure Flutung auf einem kleinen Bild laeuft."""
    h, w = L.shape
    s = max(1, int(round(max(h, w) / FEIN)))
    klein = np.asarray(
        Image.fromarray(L.astype(np.uint8)).resize((max(8, w // s), max(8, h // s)), Image.BILINEAR),
        np.float32)
    grob = weite(randflut(klein, oben), 2)
    S = np.asarray(Image.fromarray(grob.astype(np.uint8) * 255).resize((w, h), Image.NEAREST)) > 127
    deckkraft = np.where(S, np.clip((L - unten) / max(1.0, oben - unten), 0, 1) * 255.0, 255.0)
    return S, deckkraft


def schluesseltabelle(pfad_json):
    """Dateiname (ohne Endung) -> Asset-Schluessel."""
    d = json.load(open(pfad_json, encoding="utf-8"))
    tabelle = {}
    for k, v in d.items():
        u = v.get("url") if isinstance(v, dict) else v
        if isinstance(u, str):
            tabelle[os.path.splitext(os.path.basename(u.split("?")[0]))[0]] = k
    return tabelle


def lauf(ordner, pfad_json):
    tabelle = schluesseltabelle(pfad_json)
    getan, ausn, unbekannt, gerettet, verweigert = [], [], [], [], []

    for datei in sorted(os.listdir(ordner)):
        pfad = os.path.join(ordner, datei)
        stamm = os.path.splitext(datei)[0]
        # `_min` ist die verkleinerte Fassung desselben Assets.
        k = tabelle.get(stamm) or tabelle.get(stamm.replace("_min", ""))
        if k is None:
            unbekannt.append(stamm)
            continue
        if AUSNAHME.match(k):
            ausn.append(k)
            continue
        try:
            im = Image.open(pfad)
        except Exception:
            continue
        if im.mode in ("RGBA", "LA") and np.asarray(im.convert("RGBA"))[..., 3].min() < 250:
            continue  # schon freigestellt

        a = np.asarray(im.convert("RGB"), np.float32)
        L = helligkeit(a)
        ring = np.concatenate([L[:2, :].ravel(), L[-2:, :].ravel(),
                               L[:, :2].ravel(), L[:, -2:].ravel()])
        grundhell = float(np.median(ring))

        eng = False
        for unten, oben in ((grundhell + 4, grundhell + 30), (grundhell + 2, grundhell + 14)):
            S, deckkraft = schneide(L, unten, oben)
            deckend = float((deckkraft > 200).mean())
            if deckend >= MIND_DECKEND:
                break
            eng = True
        if deckend < MIND_DECKEND:
            verweigert.append((k, round(deckend * 100, 1)))
            continue
        if float(S.mean()) < MIND_GRUND:
            continue
        if eng:
            gerettet.append((k, round(deckend * 100, 1)))

        Image.fromarray(np.dstack([a, deckkraft]).astype(np.uint8), "RGBA").save(
            pfad, "WEBP", quality=90, method=4)
        getan.append((k, round(deckend * 100, 1)))

    return getan, ausn, unbekannt, gerettet, verweigert


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__.strip().splitlines()[-3].strip())
    getan, ausn, unbekannt, gerettet, verweigert = lauf(sys.argv[1], sys.argv[2])
    print("freigestellt: %d" % len(getan))
    print("vollflaechiges Artwork ausgenommen: %d" % len(ausn))
    print("unbekannter Schluessel, nicht angefasst: %d" % len(unbekannt))
    print("mit engerem Schwellwert gerettet: %d %s" % (len(gerettet), gerettet))
    print("VERWEIGERT (Motiv waere zerstoert): %d %s" % (len(verweigert), verweigert))
    getan.sort(key=lambda x: x[1])
    print("am wenigsten Motiv uebrig: " + ", ".join("%s %.0f%%" % g for g in getan[:8]))
    # Verweigerte Assets sind kein Fehlschlag des Laufs, aber eine Ansage:
    # sie brauchen eine Neuerzeugung mit sauberem Grund.
    sys.exit(0)
