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

---

## 6. Plattform-Marken im Community-Fenster (7 Vektorpfade)

**Was:** die Bildmarken von Discord, YouTube, TikTok, X, Instagram, Reddit und Facebook, eingebaut
als Vektorpfade in `SOC_MARKEN` (`ui_prototype.html`).

**Woher:** [`simple-icons`](https://www.npmjs.com/package/simple-icons) 16.27.1, über npm bezogen.
Paketlizenz **CC0-1.0**.

**Was das heißt — und was nicht.** CC0 gilt für die *Zeichnungen* im Paket, also das Urheberrecht
daran. Die **Markenrechte bleiben bei den Unternehmen**. Simple Icons sagt das in seinem eigenen
`DISCLAIMER.md` ausdrücklich; CC0 auf das Paket heißt nicht, dass die enthaltenen Marken frei sind.
Das ist der Unterschied, an dem dieser Abschnitt hängt — und der Grund, warum diese sieben nicht in
Abschnitt 2 stehen.

**Was wir damit dürfen.** Alle sieben Anbieter erlauben in ihren Markenrichtlinien, ihre Marke zu
benutzen, um auf ein Profil **bei ihrem eigenen Dienst** zu verlinken. Genau das tut das
Community-Fenster: jede Zeile führt auf unseren eigenen Kanal.

**Was wir nicht dürfen — und wo das im Code sichergestellt ist:**

| Auflage | Umsetzung |
|---|---|
| Marke nicht verändern, verzerren, drehen | Pfad unverändert aus dem Paket, `viewBox` 0 0 24 24, kein `transform` |
| Keine eigene Mehrfarbigkeit erfinden | einfarbig weiß (`fill:currentColor`, `color:#fff`) — die einfarbige Fassung erlauben alle sieben ausdrücklich |
| Keine Partnerschaft oder Billigung suggerieren | die Zeile sagt „Folgen", nicht „Partner"; kein Anbietername im Spieltitel |
| Schutzraum einhalten | die Marke belegt 48 % des Plättchens, ringsum bleiben 26 % frei |
| Marke nicht als eigenes Logo verwenden | erscheint nur in den Kontaktzeilen, nirgends als App-Symbol |

**Die Markenfarbe färbt den Grund, nicht die Marke.** Die offiziellen Farben stehen in
`SOC_MARKEN[*].marke` und stammen aus demselben Paket. Bei TikTok und X ist die Markenfarbe
Schwarz; dort bleibt `--marke` leer, weil eine weiße Marke auf einer flachen schwarzen Scheibe
keine Tiefe hätte — dann trägt das Kristall-Plättchen sie.

**Warum inline statt als Datei.** Die sieben Pfade wiegen zusammen 6,3 KB. Als Vektor skalieren sie
verlustfrei auf jede Plättchengröße und brauchen keine CDN — sie sind also auch dann da, wenn das
Artwork nicht lädt. Für eine Kontaktfläche ist das kein Detail: eine Zeile ohne Marke sieht nicht
aus wie „lädt noch", sondern wie „kaputt" (DESIGNSYSTEM §7b).

**Wenn ein Anbieter seine Marke ändert** (X hat das getan), muss die Fassung hier nachgezogen
werden: `npm pack simple-icons` neu ziehen, Pfad ersetzen, Stand fortschreiben.

**Stand:** 27.07.2026, simple-icons 16.27.1.
