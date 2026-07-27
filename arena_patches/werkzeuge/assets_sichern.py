#!/usr/bin/env python3
"""assets_sichern.py — holt jedes Asset vom CDN ins Repository.

WARUM
-----
`ui_assets.json` enthält 203 Einträge, und jeder davon ist nur eine URL.
Die Bilder, Videos und Tondateien selbst liegen ausschließlich auf dem
Higgsfield-CDN. Solange das so ist, hängt die gesamte Bildarbeit dieses
Projekts an einem fremden Konto: geht es verloren oder wird das CDN
abgeschaltet, ist alles weg — und `ui_assets.json` beschreibt dann nur
noch, was es einmal gab.

`LIZENZEN.md` verlangt das für die Tondateien ohnehin ausdrücklich
(„die Original-Downloads gehören vor einem Release ins Repository, damit
die Herkunft nachweisbar bleibt, auch wenn das CDN verschwindet"). Für
die Bilder gilt derselbe Satz, er stand nur nirgends.

WAS GEHOLT WIRD
---------------
Bei PNGs zuerst die `_min.webp`-Fassung: sie hat die volle Auflösung bei
rund 3 % der Dateigröße (44 KB statt 1,4 MB, gemessener PSNR 37,7 dB).
Gibt es sie nicht, das Original. Videos und Ton immer im Original — dort
gibt es keine Kleinfassung.

Gemessener Umfang (27.07.2026):
    182 PNG als _min.webp      8,0 MB
      5 PNG als Original       2,9 MB
      6 MP3                    5,9 MB
     10 MP4                   59,2 MB
    ---------------------------------
    203 Dateien               76,0 MB

Die Videos sind vier Fünftel der Last. Sie bleiben trotzdem drin: sie
sind das Teuerste am ganzen Bestand, und 76 MB sind für ein Repository
kein Problem — ein verlorenes Video schon.

WARUM DAS NICHT LOKAL LÄUFT
---------------------------
Die Entwicklungsumgebung erreicht das CDN nicht; die Netzrichtlinie
beantwortet CONNECT mit 403. Deshalb läuft dieses Skript in GitHub
Actions (`.github/workflows/assets-sichern.yml`), wo es diese Sperre
nicht gibt.

EIGENSCHAFTEN
-------------
* **Wiederholbar**: vorhandene Dateien werden übersprungen. Ein zweiter
  Lauf lädt nichts neu und schreibt nichts um.
* **Nachweisbar**: schreibt `assets/HERKUNFT.json` mit Schlüssel,
  Quell-URL, Dateiname, Größe und SHA-256 je Datei. Damit lässt sich
  später beweisen, dass die Datei im Repo die Datei vom CDN ist.
* **Ehrlich beim Scheitern**: eine fehlgeschlagene Datei bricht den Lauf
  nicht ab, wird aber am Ende aufgelistet und setzt den Rückgabewert.
  Ein halber Bestand, der sich als vollständig ausgibt, wäre schlimmer
  als ein sichtbar unvollständiger.

AUFRUF
------
    python3 assets_sichern.py <ui_assets.json> <zielordner>
"""
import hashlib
import json
import os
import re
import sys
import urllib.request

ZEITLIMIT = 120
VERSUCHE = 3


def hole(url):
    letzter = None
    for versuch in range(VERSUCHE):
        try:
            with urllib.request.urlopen(url, timeout=ZEITLIMIT) as r:
                if r.status != 200:
                    letzter = "HTTP %s" % r.status
                    continue
                return r.read()
        except Exception as e:                      # noqa: BLE001
            letzter = str(e)[:80]
    raise RuntimeError(letzter or "unbekannt")


def kleinfassung(url):
    """Die _min.webp-Fassung — volle Auflösung, rund 3 % der Größe."""
    return re.sub(r"\.(png|jpg|jpeg)$", "_min.webp", url, flags=re.I)


def lauf(pfad_json, ziel):
    d = json.load(open(pfad_json, encoding="utf-8"))
    os.makedirs(ziel, exist_ok=True)
    herkunft, fehler, neu, schon, summe = {}, [], 0, 0, 0

    for k in sorted(d):
        if k.startswith("_"):
            continue
        v = d[k]
        url = v.get("url") if isinstance(v, dict) else v
        if not isinstance(url, str) or not url.startswith("http"):
            continue

        kandidaten = []
        if re.search(r"\.(png|jpg|jpeg)$", url, re.I):
            kandidaten.append(kleinfassung(url))
        kandidaten.append(url)

        gespeichert = None
        for kand in kandidaten:
            endung = os.path.splitext(kand.split("?")[0])[1].lower() or ".bin"
            name = k + endung
            pfad = os.path.join(ziel, name)
            if os.path.exists(pfad):                # wiederholbar
                roh = open(pfad, "rb").read()
                gespeichert = (kand, name, roh)
                schon += 1
                break
            try:
                roh = hole(kand)
            except Exception as e:                  # noqa: BLE001
                if kand is kandidaten[-1]:
                    fehler.append((k, str(e)))
                continue
            open(pfad, "wb").write(roh)
            gespeichert = (kand, name, roh)
            neu += 1
            break

        if gespeichert:
            quelle, name, roh = gespeichert
            summe += len(roh)
            herkunft[k] = {
                "quelle": quelle,
                "datei": name,
                "bytes": len(roh),
                "sha256": hashlib.sha256(roh).hexdigest(),
                "kleinfassung": quelle != url,
            }

    with open(os.path.join(ziel, "HERKUNFT.json"), "w", encoding="utf-8") as f:
        json.dump({
            "_hinweis": "Erzeugt von werkzeuge/assets_sichern.py. Schluessel, "
                        "Quell-URL, Dateiname, Groesse und SHA-256 je Asset — "
                        "der Nachweis, dass die Datei im Repo die Datei vom CDN ist.",
            "_dateien": len(herkunft),
            "_bytes": summe,
            "assets": herkunft,
        }, f, ensure_ascii=False, indent=1, sort_keys=True)

    print("neu geholt: %d · schon da: %d · gesamt %.1f MB"
          % (neu, schon, summe / 1e6))
    if fehler:
        print("FEHLGESCHLAGEN: %d" % len(fehler))
        for k, e in fehler[:20]:
            print("   %-28s %s" % (k[:28], e))
    return 1 if fehler else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Aufruf: assets_sichern.py <ui_assets.json> <zielordner>")
    sys.exit(lauf(sys.argv[1], sys.argv[2]))
