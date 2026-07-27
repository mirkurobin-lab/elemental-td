#!/usr/bin/env python3
"""assets_vollstaendig.py — jedes benutzte Asset ist verzeichnet und gesichert.

WARUM ES DIESE PRÜFUNG GIBT
---------------------------
Am 27.07.2026 wurden alle Assets vom CDN ins Repository geholt. Auf die
Frage „ist damit wirklich alles gesichert?" ergab die Nachmessung: **nein**.
17 Bilder, die der Prototyp benutzt, standen gar nicht in
`ui_assets.json` — sie waren direkt in die `ASSETS`-Tabelle der HTML
geschrieben worden, ohne den Umweg über die Asset-Liste.

Die Folge war schlimmer als ein fehlender Eintrag:

* Das Sicherungswerkzeug liest `ui_assets.json` — es hat sie nie geholt.
* Das Freistell-Werkzeug ordnet Dateien über `ui_assets.json` einem
  Schlüssel zu — es hat sie als „unbekannt" übersprungen. Darunter die
  vier Arena-Kulissen, die es beim ersten Durchlauf sogar zerschnitten
  hatte, weil sie ohne Schlüssel nicht als vollflächiges Artwork
  erkennbar waren.

Ein Asset, das nur in der HTML steht, ist also nicht bloß undokumentiert:
es fällt aus jedem Werkzeug heraus, das über die Asset-Liste arbeitet —
still, ohne Fehlermeldung.

DIE ZWEI FRAGEN
---------------
1. Steht jede Datei, die `ui_prototype.html` über `CDN`/`CDNA` anzieht,
   auch in `ui_assets.json`?
2. Liegt für jeden dieser Einträge eine Datei unter `assets/`, mit einem
   Eintrag in `HERKUNFT.json`?

Die zweite Frage darf nur dann fehlschlagen, wenn der Sicherungs-Workflow
seit dem letzten Nachtrag nicht gelaufen ist — dann ist der Hinweis
genau richtig.

AUFRUF
------
    python3 pruefungen/assets_vollstaendig.py
(aus `arena_patches/` heraus)
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)


def datei(*teile):
    return os.path.join(WURZEL, *teile)


def lauf():
    html = open(datei("ui_prototype.html"), encoding="utf-8").read()
    liste = json.load(open(datei("ui_assets.json"), encoding="utf-8"))

    verzeichnet = {}
    for k, v in liste.items():
        if k.startswith("_"):
            continue
        u = v.get("url") if isinstance(v, dict) else v
        if isinstance(u, str):
            verzeichnet[os.path.basename(u.split("?")[0])] = k

    benutzt = re.findall(r'(\w+):\s*CDNA?\s*\+\s*"([^"]+)"', html)
    fehler = 0

    ohne_eintrag = [(k, f) for k, f in benutzt if f not in verzeichnet]
    if ohne_eintrag:
        fehler += 1
        print("FEHL  %d benutzte Assets stehen NICHT in ui_assets.json:"
              % len(ohne_eintrag))
        for k, f in ohne_eintrag[:15]:
            print("        %-22s %s" % (k, f[:44]))
        print("      -> eintragen, sonst holt das Sicherungswerkzeug sie nie")
        print("         und das Freistell-Werkzeug ueberspringt sie als "
              "„unbekannt\".")
    else:
        print("ok    alle %d benutzten Assets stehen in ui_assets.json"
              % len(benutzt))

    pfad_h = datei("assets", "HERKUNFT.json")
    if not os.path.exists(pfad_h):
        print("WARN  assets/HERKUNFT.json fehlt — der Sicherungs-Workflow "
              "ist noch nicht gelaufen.")
        return fehler

    gesichert = json.load(open(pfad_h, encoding="utf-8"))["assets"]
    soll = {k for k in liste if not k.startswith("_")
            and isinstance(liste[k], (dict, str))}
    fehlend = sorted(soll - set(gesichert))
    if fehlend:
        fehler += 1
        print("FEHL  %d Eintraege ohne gesicherte Datei: %s"
              % (len(fehlend), ", ".join(fehlend[:10])))
        print("      -> Workflow „Assets sichern\" erneut ausloesen "
              "(er holt nur das Fehlende nach).")
    else:
        print("ok    alle %d Eintraege liegen als Datei unter assets/"
              % len(gesichert))

    # Fehlt umgekehrt eine Datei, auf die HERKUNFT.json zeigt?
    verwaist = [k for k, v in gesichert.items()
                if not os.path.exists(datei("assets", v["datei"]))]
    if verwaist:
        fehler += 1
        print("FEHL  %d Dateien aus HERKUNFT.json fehlen auf der Platte: %s"
              % (len(verwaist), ", ".join(verwaist[:10])))
    else:
        print("ok    jede Datei aus HERKUNFT.json liegt wirklich da")

    return fehler


if __name__ == "__main__":
    sys.exit(1 if lauf() else 0)
