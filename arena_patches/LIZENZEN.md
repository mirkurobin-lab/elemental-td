# Lizenzen — Fremdmaterial in Arcane Prism TD

Dieses Dokument listet **alles Material, das nicht selbst erzeugt wurde**, mit Quelle, Lizenz und
vorgenommener Bearbeitung. Es ist die Grundlage für den Credits-Bildschirm und für jede
Store-Einreichung.

**Stand:** 2026-07-25 · **Assets gesamt:** 115 (`arena_patches/ui_assets.json`)

---

## 1. Audio (6 Dateien, alle CC0)

Alle Musik- und Stinger-Dateien stammen von **[OpenGameArt.org](https://opengameart.org)** und
stehen unter **CC0 1.0 Universal (Public Domain Dedication)**.

> **CC0 bedeutet:** Keine Namensnennung erforderlich, kommerzielle Nutzung erlaubt, Bearbeitung
> erlaubt. Wir nennen die Urheber **trotzdem** im Credits-Bildschirm — das ist Anstand, nicht
> Pflicht, und es kostet nichts.

| Asset-Key | Verwendung | Originaltitel | Lizenz | Bearbeitung |
|---|---|---|---|---|
| `audio_theme` | Meta-UI-Musikloop (Hub), 3:12 | *Fantasy Orchestral Theme* | CC0 | unverändert |
| `audio_battle` | Match-Musikloop, 1:10 | *Hope (Orchestral Battle Music)* | CC0 | unverändert |
| `audio_war` | Clankriegs-Board, 1:16 | *Call to War* | CC0 | unverändert |
| `audio_pack_fanfare` | Pack-Zeremonie, Höhepunkt, 10 s | *Hero's Reprise* | CC0 | **Ausschnitt** (Höhepunkt herausgeschnitten) |
| `audio_victory` | Sieg-Stinger, 8 s | *Call to War* | CC0 | **Ausschnitt** |
| `audio_defeat` | Niederlage-Stinger, 10 s | *Fantasy Orchestral Theme* | CC0 | **Ausschnitt, verlangsamt** |

**Quellenverzeichnis:** <https://opengameart.org> — die Einzelseiten der oben genannten Titel.
Die Dateien liegen als MP3 auf dem Projekt-CDN; die Original-Downloads gehören vor einem Release
ins Repository (`public/audio/`), damit die Herkunft nachweisbar bleibt, auch wenn das CDN
verschwindet.

### 1.1 Was beim Release noch zu tun ist

1. **Direktlinks der OGA-Seiten** in die Tabelle eintragen (aktuell nur der Titel bekannt) und
   die Urhebernamen ergänzen — für den Credits-Bildschirm.
2. **Originaldateien mitliefern** (`public/audio/original/`), unverändert, neben den bearbeiteten
   Fassungen. Bei CC0 nicht vorgeschrieben, aber der einzige belastbare Herkunftsnachweis.
3. **Lizenz-Screen in der App**: `LIZENZEN.md` gehört als scrollbarer Text in die Einstellungen
   (der View hat bereits eine Credits-Zeile, siehe `ui_prototype.html` → `#credits`).

---

## 2. Bild- und Videomaterial (109 Dateien)

**Alle selbst erzeugt** über Higgsfield (`nano_banana_pro` für Bilder, `kling3_0_turbo` für
Videos) im Rahmen dieses Projekts. Kein Fremdmaterial, keine Stockbibliothek, keine
KI-Trainingsdaten Dritter, die eine Namensnennung verlangen.

| Batch | Inhalt | Anzahl |
|---|---|---|
| 1 | Meta-UI-Grundsatz (Buttons, Panels, Rahmen, Packs, Arenen) | 25 |
| 2 | Icons, Straßen-Elemente, Teaser-Artworks, Leiter-Ergänzung | 52 |
| 3 | Festungs-Layout Variante 2 (Banner-Plakette, Pips, Meilenstein) | 4 |
| 4 | Karten-Artworks, Breitbanner, Emote-Tokens | 17 |
| 5 | Pass-Keyart-Video, 8 Karten-Loops | 9 |

Die vollständigen URLs, Job-IDs und Beschreibungen stehen in `arena_patches/ui_assets.json`.

---

## 3. Schriften

Der Prototyp verwendet **ausschließlich Systemschriften**
(`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) sowie für die
Gold-Überschriften den Stapel `Cinzel, Georgia, "Times New Roman", serif`.

⚠ **`Cinzel` ist nicht eingebunden.** Der Prototyp fällt auf Georgia zurück. Wer die Schrift
tatsächlich verwenden will, muss sie einbinden — Cinzel steht unter der **SIL Open Font License
1.1** (Google Fonts). Die OFL verlangt, dass die Lizenzdatei mitgeliefert wird und die Schrift
nicht einzeln verkauft wird; beides ist für ein Spiel unproblematisch, muss aber **vor** dem
Einbinden erledigt werden.

---

## 4. Code

| Bestandteil | Herkunft |
|---|---|
| `arena_*.js` (alle Module) | eigener Code |
| `ui_prototype.html` | eigener Code |
| FNV-1a-Hash + murmur3-`fmix32` | Public-Domain-Algorithmen, eigene Implementierung |
| Kein Framework, keine Bibliothek, kein Build | — |

Der Prototyp lädt **keine** externen Skripte. Die einzigen Netzwerkzugriffe gehen an das
Asset-CDN; fällt es aus, greifen überall CSS- und Emoji-Fallbacks.

---

## 5. Vorbild-Analyse

`AA_UI_REFERENZ.md` dokumentiert die Analyse von **Arcane Arena** (fremdes Spiel) anhand von
Bildschirmaufnahmen. Verwendet wurden ausschließlich **Erkenntnisse über Aufbau und Mechanik** —
**keine** Assets, keine Texte, kein Code aus diesem Spiel. Sämtliche Artworks, Farbpaletten,
Namen und Formeln dieses Projekts sind eigenständig.
