# UI-Übergabe — die komplette Meta-UI von Arcane Prism TD

**Stand:** 31.07.2026 · Branch `claude/arcane-arena-optimization-zi8vxb`, identisch auf `main`

Dieses Blatt ist für die **andere Session**, die die UI ins Spiel zieht. Es beantwortet
vier Fragen: was zu holen ist, wie man es startet, was geprüft ist und was offen bleibt.

---

## 1. Was zu holen ist

```bash
git fetch origin main && git checkout main && git pull
# oder gezielt:
git fetch origin claude/arcane-arena-optimization-zi8vxb
```

Alles liegt unter **`arena_patches/`**. Drei Dinge gehören zusammen und dürfen nicht
getrennt werden:

| | Was | Umfang |
|---|---|---|
| **1** | `ui_prototype.html` | 23 153 Zeilen — Markup, Stylesheet und UI-Logik in **einer** Datei |
| **2** | die **17** Module, die sie lädt | `arena_avatars` `arena_cards` `arena_clan` `arena_daily` `arena_deck` `arena_fortress` `arena_friends` `arena_guide` `arena_matchend` `arena_offline` `arena_packfx` `arena_profil` `arena_rewards` `arena_rivals` `arena_telemetry` `arena_vault` `arena_waves` |
| **3** | `assets/` | 238 Dateien, 78 MB — lokal, **bis auf neun** (siehe §5) |

Die Module sind in sich geschlossen (IIFE, `window.XYZ`-Export, defensiv gegen fehlende
Rückrufe). Die UI spricht sie ausschließlich über ihre `window`-Schnittstelle an.

## 2. Wie man es startet

**Kein Build, kein Server, kein Paketmanager.** Die Datei direkt öffnen:

```
file:///…/arena_patches/ui_prototype.html
```

Zwei Entwicklerschalter in der Adresse:

| | Wirkung |
|---|---|
| `?cdn=1` | lädt die Assets vom Higgsfield-CDN statt aus `assets/`. **Nur zum Vergleichen** — der CDN ist aus manchen Netzen gesperrt, und für `progress_frame_cut` liefert er die unbeschnittene Fassung |
| `?test=1` | Testmodus mit vollen Beständen (siehe `TESTMODUS` im Kopf der Datei) |

> ⚠ **Drei Prüfungen brauchen HTTP statt `file://`** (`assets_lokal.js`,
> `packsprengung.js`, `belohnung.js`). Sie lesen Pixel von einer Leinwand, und unter
> `file://` gilt jede Datei als eigener Ursprung — das Bild „taintet" die Leinwand und
> `getImageData` wirft `SecurityError`. Die drei starten ihren Server selbst.

## 3. Was geprüft ist

**32 Playwright-Suiten** unter `arena_patches/pruefungen/`. Aufruf:

```bash
export NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
node pruefungen/run_v7.js
```

Die vier, die den Gesamtzustand tragen:

| Suite | Was sie hält |
|---|---|
| `run_v5` `run_v6` `run_v7` | Grundgerüst, Clan, Startseite, Pass, Shop-Maße — die AA-Referenzwerte sind hier eingefroren |
| `qualitaet.js` | Trefferflächen ≥ 44 × 44, kein Klick-Diebstahl, kein Überlauf, kein abgeschnittener Text — über **alle 16** Ansichten |
| `passform.js` | Seitenverhältnis jeder Bildquelle gegen ihren Kasten, 441 Bildflächen |
| `lesbarkeit.js` | jeder Schriftzug gegen seinen **wirklichen** Untergrund (Bild, Verlauf, Farbe), 402 messbar |
| `klickdurchlauf.js` | drückt **alles** über 16 Fenster (183 Knöpfe) und fragt nur, ob etwas kaputtgeht |

**Stand 31.07.2026:** die oben genannten fünf sowie `deck`, `packoeffnung`, `login_kal`,
`bildzustand`, `belohnung`, `quoten`, `tresor`, `splash`, `shop_raender`, `avatare`,
`community`, `essenzen` sind einzeln grün gemessen. Ein Lauf über **alle 32 am Stück**
war zum Zeitpunkt dieser Übergabe noch nicht abgeschlossen — wer sie braucht, lässt sie
laufen, statt sich auf diesen Satz zu verlassen.

`iconfrei.js` und `sicht.js` laufen in dieser Umgebung **nicht**: sie laden fest von einer
Vorschau-URL, die der Proxy sperrt. Umgebungsgrenze, kein Befund.

> Warum hier keine runde Zahl steht: ein Prüflauf, der über einen Stand läuft, der sich
> während des Laufs ändert, misst nichts. Genau das ist bei der ersten Fassung dieser
> Übergabe passiert (§42.2) — das Ergebnis wurde verworfen, nicht ausgewertet.

## 4. Regeln, die beim Einbau nicht gebrochen werden dürfen

Jede davon ist einmal teuer gewesen. Die Begründungen stehen ausführlich in
`AA_UI_REFERENZ.md` und im Blatt selbst.

1. **Kein Gold als Kaufwährung.** Gold wird verdient und ausgegeben, nie gekauft — außer
   im Gold-Tausch gegen Kristalle, und nur in dieser Richtung.
2. **Belohnte Werbung ist NICHT angebunden.** `WERBUNG_VERFUEGBAR = false`. Kein Knopf
   darf so tun, als gäbe es sie. Wo AA ein Werbevideo hat, steht bei uns „einmal am Tag
   ohne Gegenleistung" — und die Zeile darunter sagt das auch.
3. **Keine Truhen.** Weder im Bild noch im Wort. Wir haben Packs.
4. **Drop-Raten müssen vor jedem Kauf erreichbar sein** (Apple 3.1.1 / Google Play). Das
   ⓘ auf Pack und Bündel ist Pflicht, nicht Zierde — `quoten.js` hält es.
5. **Keine erfundenen Vergleichspreise.** Ein durchgestrichener Preis behauptet einen
   früheren Preis; wo es den nicht gibt, ist die Angabe falsch. Rabatte werden aus den
   echten Regalpreisen **gerechnet** (`dealRabatt()`, `vorratRabatt()`), nie gesetzt.
6. **Die Shop-Achse ist festgelegt** (§40): Arena-Packs → Tagesangebote → Vorrats-Pack →
   Booster-Packs → Kristalltresor → Gem-Pakete → Gold-Tausch. `run_shop.js` und
   `run_v7.js` frieren sie über `data-sec` 1…7 ein.
7. **Artwork wird nie gestreckt.** `background-size` der Bildebene ist `cover` oder ein
   9-Slice, nie `100% 100%`. `passform.js` hält es.
8. **Deutsche Oberfläche.** Alle sichtbaren Zeichenketten stehen im Markup — das ist
   zugleich der Lokalisierungs-Nachweis.
9. **Kein Wort über das Vorbild auf dem Bildschirm.** Quellenangaben, Paragraphen-
   verweise und Vergleiche mit dem Spiel, an dem wir uns orientieren, gehören ins Blatt,
   nicht in die Oberfläche. Am 31.07.2026 standen davon **drei** sichtbar im Produkt
   (Shop-Fußnote, Werbe-Hinweis, Ranglisten-Notiz) — alle entfernt, die *Aussage* jeweils
   erhalten. Ebenso gilt Regel 3 wörtlich: „Clantruhe" hieß der Wochenlohn im Clan, jetzt
   **Clan-Hort**.

## 5. Was offen ist

| | Was | Warum es offen ist |
|---|---|---|
| **9 Assets fehlen lokal** | `card_bann` `card_bollwerk` `card_fokus` `card_joker` `card_splitter` `ess_arkan` `ic_offline` `off_banner` `off_loop` — sie stehen in `NUR_CDN` und der Proxy sperrt den CDN (403). Sichtbare Folge: die Spell-Karten zeigen ihr Emoji statt des Artworks | braucht eine Sitzung mit CDN-Zugang |
| **Arena-Artworks als echtes 3:2** | die acht Bilder sind 1,79 : 1 in einer 3 : 2-Box, es bleiben 15 % Beschnitt (§37) | dieselbe Sperre |
| **Plattenwerte** | `--panel` steht 1,13 : 1 gegen `--bg` — Grund, Platte und zweite Platte sind praktisch dieselbe Fläche. Vorschlag samt Messung in §41.3 | **Entscheidung des Auftraggebers**, nicht angewendet |
| **Entwicklernotizen** | mehrere Ansichten tragen sichtbare Hinweise („Logik: arena_matchend.js — …") | für die Auslieferung ausblenden, nicht löschen — sie sagen, wo die Rechnung liegt |
| **Benachrichtigungssystem** | einzige noch offene Komponente aus `DESIGNSYSTEM.md` §8 | — |
| **31 Schriftzüge** | zwischen 3,0 : 1 und ihrem WCAG-Soll von 4,5 : 1 | bewusst zurückgenommenes Beiwerk, im Protokoll von `lesbarkeit.js` |

## 6. Wo was steht

| Blatt | Inhalt |
|---|---|
| `AA_UI_REFERENZ.md` | **Wahrheitsquelle.** Jede Messung gegen das Vorbild, jede Entscheidung, jeder Irrtum mit Begründung. §34–§41 sind der Stand dieser Woche |
| `DESIGNSYSTEM.md` | Material, Schatten, Maße, Farbe, Bewegung, Icons — und §8, was offen ist |
| `pruefungen/README.md` | alle 32 Suiten einzeln, mit dem, was jede hält |
| `DESIGN_MONETARISIERUNG.md` | Preise, Währungsregeln, IAP-Platzhalter |
| `LIZENZEN.md` | Fremdmaterial: 6 CC0-Audiodateien, Schriften, Code |
| `assets/HERKUNFT.json` | Herkunft und SHA-256 **jeder** Asset-Datei |

> **Ein Satz zur Arbeitsweise, weil er beim Übernehmen Zeit spart:** in diesem Ordner gilt
> eine Regel erst als wahr, wenn eine Prüfung sie hält. Wer eine Zahl im Blatt ändert,
> lässt die Suite laufen. Die Kommentare im Quelltext nennen bei jeder ungewöhnlichen
> Zeile den **gemessenen** Grund — sie sind kein Beiwerk, sie sind die Begründung.
