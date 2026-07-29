# Spells — vier Karten für den Start des Spell-Systems

> **Stand 29.07.2026.** Entwurf, noch nicht gebaut und noch nicht entschieden.
> Anschluss an `DESIGN_PROGRESSION.md` §E2 („Spells — die dritte Kartenart"). Dieses
> Dokument liefert die vier Karten, ihre Zahlen und **eine Empfehlung** zu der Frage,
> die §E2 offen gelassen hat: womit werden neutrale Spells gelevelt.

**Die fünf Vorgaben, die nicht zur Debatte stehen** (Auftraggeber, 29.07.2026):

1. Der Spieler wählt **2 Spells pro Match** und nimmt sie mit.
2. Im Battledeck sitzen sie als **Sechsecke links und rechts vom Hauptskill** des Helden.
3. Spells werden **wie Türme und Helden gelevelt und fusioniert** — gleiche Raritätsleiter,
   gleiches Merge (3 gleiche → nächste Stufe), gleiche Level-Caps.
4. Spells haben **eigene Kartenslots** in den Packs (Fall B aus §E2).
5. Spells sind **neutral** — kein Element, keine Essenz-Slot-Zugehörigkeit.

---

## A) Was aus „Arcane Arena TD" belegt ist — und was nicht

Ich habe im Netz nach den echten Skills des Vorbilds gesucht. Es gibt welche, und drei
davon haben Namen. **Belegt** heißt hier: der Wortlaut stand in den Store-/MWM-Listings.

| Fund | Wortlaut / Inhalt | Status |
|---|---|---|
| **Blizzard Wing** | Skill: beschwört einen Eisdrachen, der über **sich ausweitende Pfade (3 → 5 → 7)** fegt und AoE-Eiszapfen auf **Luft & Boden** regnen lässt. Eingeführt mit **Update 1.040**. | **belegt** (Store-Text) |
| **Inferno Legion** | Skill: „summon fiery beasts to **taunt** enemies" | **belegt** |
| **Boltstorm** | Skill: „call down lightning bolts that **stun and disrupt** even the toughest foes" | **belegt** |
| **Polymorph** | In-Match-**Booster** (nicht Skill): verwandelt Gegner in harmlose Schafe, **HP bleiben unverändert** | **belegt** |
| **Purify** | In-Match-Booster: entfernt aktive **Trick**-Effekte — **außer Starfall** | **belegt** |
| **Starfall** | Name einer Trick-Karte | **abgeleitet** aus Purifys Ausnahme, nirgends direkt beschrieben |
| **Volcannon**, **Frost Mine** | neue **Türme** aus Update 1.040 | belegt, für uns nur Namensfarbe |
| „upgrade your skills with **skill cards**" | Skill-Material als **eine** benannte Währung, parallel zu „tower cards" und „hero shards" | belegt, **aber zweideutig** — siehe §E |
| Eine Community-Tierliste **„Arcane Arena Spells"** existiert auf TierMaker (ID 18572464) | belegt, dass es eine größere Spell-Liste gibt | **Inhalt nicht gelesen** — 403 |

**Ehrlichkeit zur Quellenlage.** Die Store-Seiten und TierMaker waren aus dieser Umgebung
**nicht direkt abrufbar** (HTTP 403 über den Ausgangs-Proxy). Die Wortlaute oben stammen
aus den Suchtreffer-Auszügen derselben Seiten. Ich halte sie für richtig, habe sie aber
**nicht im Original gegengelesen**. Eine vollständige AA-Spell-Liste habe ich **nicht**
gefunden — was hier nicht steht, existiert für uns nicht als Beleg.

**Quellen:**
`apps.apple.com/us/app/arcane-arena-tower-defense-td/id6746447166` ·
`play.google.com/store/apps/details?id=com.panteon.arcanearena` ·
`mwm.ai/apps/arcane-arena-tower-defense-td/6746447166` ·
`spark.mwm.ai/en/apps/arcane-arena-tower-defense-td/6746447166` ·
`tiermaker.com/categories/clash-royale/arcane-arena-spells-18572464`

### Was ich daraus ableite (und was davon meine Erfindung ist)

Zwei Dinge sind aus den drei belegten Skills ablesbar, und beide fließen unten ein:

1. **AA trennt die Rollen.** Blizzard Wing ist Flächenschaden, Inferno Legion ist
   Aggro-Kontrolle, Boltstorm ist Betäubung/Störung. Drei Skills, drei verschiedene
   Aufgaben — **keine drei Varianten von „Schaden auf eine Fläche"**. Das ist genau die
   Rollentrennung, die der Auftrag verlangt, und sie ist damit nicht nur Geschmack.
2. **AA skaliert Skills über Abdeckung, nicht über die Schadenszahl.** Der einzige
   belegte Skalierungshinweis im ganzen Fund ist Blizzard Wings **„3 → 5 → 7 Pfade"**.
   Nicht „mehr Schaden", sondern **mehr Fläche**. Das übernehme ich für SPLITTER: die
   Merge-Stufen erweitern Radius und Zielzahl, das Level erhöht die Zahl.

Alles Weitere — die vier Namen, die vier Wirkungen, sämtliche Zahlen — ist **unser
Design**. Kein Zahlenwert unten stammt aus AA.

---

## B) Die Rollenverteilung — warum genau diese vier

Ein Match hat vier Arten, verloren zu gehen. Für jede gibt es eine Karte, und **nur eine**:

| # | Das Problem | Der Spell | Die Antwort ist … |
|---|---|---|---|
| 1 | **Massenwelle** — zu viele Gegner gleichzeitig, die Einzelziel-Türme kommen nicht nach | **SPLITTER** | eigener Flächenschaden |
| 2 | **Ein dicker Gegner** — Panzer oder Boss, die Türme kauen zu langsam | **BANN** | Schadensverstärkung auf *ein* Ziel |
| 3 | **Durchbruch** — Gegner sind schon durch, die Burg wird gleich getroffen | **BOLLWERK** | gekaufte **Zeit**, kein Schaden |
| 4 | **Strukturelle Schwäche** — schlechte Kartenhand, zu wenig Durchsatz an der Engstelle | **FOKUS** | Verstärkung der **eigenen Türme** |

Die vier sind bewusst über **vier verschiedene Wirkmechanismen** verteilt:

* **Nur SPLITTER verursacht eigenen Schaden.** Das ist die wichtigste Balance-Aussage des
  Dokuments. Drei von vier Spells können die Türme prinzipiell nicht überflüssig machen,
  weil sie ohne Türme null Schaden erzeugen.
* **BANN und FOKUS multiplizieren beide die eigene Verteidigung** — aber auf verschiedenen
  Achsen: BANN hängt am **Gegner** (alle meine Türme, aber nur gegen einen), FOKUS hängt
  am **Ort** (nur die Türme im Radius, aber gegen alles). Das ist der Unterschied zwischen
  „der Boss ist das Problem" und „diese Ecke ist das Problem".
* **BOLLWERK erzeugt gar keinen Schaden**, sondern Sekunden. Es ist der einzige Spell, der
  auch dann noch etwas rettet, wenn die Verteidigung schon versagt hat.

Zwei Spells pro Match heißt: der Spieler wählt **zwei von vier Problemen**, gegen die er
gewappnet sein will. Das ist eine echte Entscheidung, solange keiner der vier gegen zwei
Probleme hilft. Deshalb ist SPLITTER absichtlich **schlecht gegen Einzelziele** (der
Prozentanteil wird gegen Bosse halbiert) und BOLLWERK absichtlich **wirkungslos gegen
Flieger**.

---

## C) Zwei Arten von Zahlen — und ein Skalen-Befund, der vorher geklärt gehört

### C.1 `statMul` gilt für Schadenszahlen, nicht für Wirkungsprozente

`statMul(lvl) = 1.022^(lvl-1)` ergibt auf Lv100 **8,62×**. Das ist für einen Schadenswert
richtig und für einen Prozentwert eine Katastrophe: aus „+35 % Schaden" würde auf Lv100
**+302 %**. Für Spells gilt deshalb:

| Zahlenart | Beispiel | Skalierung mit Level |
|---|---|---|
| **Schadenszahl** | SPLITTERs Sockelschaden 120 | `× statMul(lvl)` — wie bei Türmen |
| **Wirkungsprozent** | BANNs „+35 % Schaden", FOKUS' „−25 % Angriffstempo" | **linear, mit hartem Endwert auf Lv100** |
| **Zeit** | BOLLWERKs 4,0 s Standzeit | **linear, mit hartem Endwert auf Lv100** |
| **Fläche / Zielzahl** | SPLITTERs Radius | **nur über Merge-Stufen**, nie über Level |

Die letzte Zeile ist die AA-Ableitung aus §A.2 und gleichzeitig eine Balance-Bremse:
Fläche ist der gefährlichste Parameter, und über 100 Level ließe er sich nicht bändigen.
Über fünf Merge-Stufen schon.

### C.2 Der Skalen-Befund — bitte vor dem Playtest ansehen

Ich habe die Wellen aus `arena_waves.js` gegen die Turm-Stats aus `ui_prototype.html`
gerechnet. Die beiden liegen heute **nicht auf derselben Skala**:

| Welle | Gegner | Gesamt-HP der Welle | 6 Türme Lv20 leisten in 15,6 s |
|---|---:|---:|---:|
| 5 | 17 | 19 454 | 12 776 |
| 12 | 33 | **360 556** | 12 776 |
| 18 (Boss) | 28 | **1 680 249** | 12 776 |
| 27 (Boss) | 40 | **5 870 969** | 12 776 |

(Matchlänge 7 min / 27 Wellen = 15,6 s je Welle, `GAMEPLAY_OPTIMIERUNG.md` §1.
Turm-DPS im Mittel 90,3 auf Lv1 gewöhnlich, × `statMul(20)` = 1,512.)

Die Wellen-HP wachsen von Welle 1 bis 27 um **Faktor 7 765**; jede plausible Turmzahl mal
`statMul` kommt nicht in die Nähe. Entweder fehlt eine In-Match-Ausbaustufe, die nirgends
dokumentiert ist, oder eine der beiden Zahlenwelten muss neu skaliert werden. **Das ist
nicht die Aufgabe dieses Dokuments** — aber es hat eine direkte Folge für Spells:

> **Kein absoluter Schadenswert für einen Spell ist heute kalibrierbar.** Deshalb ist
> jeder Spell-Schaden unten **entweder** als Prozent der Maximal-HP des Ziels angegeben
> (skalenfrei, überlebt jede Neu-Skalierung) **oder** als Sockelwert **in derselben
> Einheit wie die Turm-Stats in `CARDS`** (SPLITTERs 120 ≈ 1,25 × EMBERs 96
> Flächenschaden). Wer die Turmzahlen mit einem Faktor multipliziert, multipliziert die
> Spell-Sockel mit demselben Faktor mit — ohne dieses Dokument anzufassen.

### C.3 Warum überhaupt Prozent-Schaden

Innerhalb **eines** Matches wächst die HP eines einzelnen Gegners von 280 (Welle 1) auf
113 889 (Welle 27) — **Faktor 407**. Ein Spell mit reinem Festschaden wäre in Welle 1 eine
Atombombe und in Welle 20 Konfetti; es gibt keinen Wert, der beides überlebt. Der
Prozentanteil löst das, der Sockel rettet die ersten Wellen, in denen der Prozentanteil
lächerlich klein ist. Das ist der Grund für die Zwei-Term-Form „**x % Max-HP + y**".

---

## D) Die vier Spells

Gemeinsam für alle vier: **neutral** (kein Element), **eigene Kartenslots**, Raritätsleiter
und Level-Caps wie in `DESIGN_PROGRESSION.md` §B. Alle Zahlen unten gelten für
**Gewöhnlich, Level 1**.

---

### D.1 `splitter` — **SPLITTER**

> *„Ein Prismensplitter zerplatzt über dem Weg und regnet Scherben auf alles, was
> darunter steht."*

**Rolle:** Massenwelle. Der einzige Spell mit eigenem Schaden.

**Wirkung im Match.** Der Spieler tippt ein Wegfeld. Ein Zielkreis erscheint, **0,8 s**
später schlägt der Splitter ein.

| Größe | Wert |
|---|---|
| Radius | **2,2 Felder** |
| Einschlag je Gegner | **8 % der Maximal-HP + 120** |
| Scherbenfeld danach | **4,0 s**, darin **−20 % Tempo** und **1,5 % Max-HP pro Sekunde** |
| Ziele höchstens | **12** (Sicherheitsschranke, siehe unten) |
| Gegen Bosse | Prozentanteile **halbiert** (4 % / 0,75 %/s), Sockel voll |
| Trifft | Luft **und** Boden |

**Abklingzeit 45 s, 1 Ladung**, unbegrenzt oft pro Match — bei 420 s Matchlänge sind das
**9 Einsätze**, also grob einer alle drei Wellen.

**Skalierung mit Level.** Sockelschaden `120 × statMul(lvl)` (Lv100: 1 035). Prozentanteil
linear **8 % → 14 %** über Lv1–100. Radius, Zielzahl und Felddauer **nicht** — die kommen
aus den Merge-Stufen.

**Warum diese Zahl.** Gemessen gegen die Wellen aus `arena_waves.js` löscht ein Einschlag
mit realistischen 6–8 getroffenen Gegnern **1,1 % bis 6,5 % der Gesamt-HP einer Welle**
(Welle 5: 6,5 %, Welle 12: 1,9 %, Welle 24: 1,1 %). Das ist die Zahl, die zählt: ein
Spell, der 30 % einer Welle löscht, ersetzt Türme — 2 bis 6 % ist ein spürbarer Schub, der
den Ausgang einer knappen Welle dreht und nie allein trägt. Die **Zielschranke 12** bindet
in der Praxis fast nie (ein Kreis mit Radius 2,2 Feldern fasst bei Schwarmdichte 8–14
Gegner); sie ist kein Balance-Regler, sondern ein Geländer gegen einen 40-Gegner-Schwarm,
bei dem der Prozentanteil sonst unbegrenzt multipliziert. Die **Halbierung gegen Bosse**
ist nicht optional: ohne sie wären 8 % der Maximal-HP eines Bosses (Welle 27:
2 277 780 HP) allein **182 222 Schaden** — mehr als die kompletten Wellen 1 bis 12
zusammen.

**Unsicherste Zahl: der Prozentanteil 8 %.** Er ist der einzige Wert im Dokument, der
direkt an der Wellen-HP hängt, und die Wellen-HP sind nach §C.2 selbst noch nicht sicher.
Woran man ihn nach dem ersten Playtest festmacht: **Anteil des Spell-Schadens am
Gesamtschaden eines Matches**. Zielband **8–15 %** für beide Spells zusammen. Liegt
SPLITTER allein über 12 %, geht der Prozentanteil auf 6 %; liegt er unter 4 %, auf 10 %.

**Merge-Boni.**

| Stufe | Option A | Option B |
|---|---|---|
| Gut | +15 % Radius | Scherbenfeld hält 1,5 s länger |
| Selten | Trifft 4 Ziele mehr (12 → 16) | +2 Prozentpunkte Einschlag (8 % → 10 %) |
| Episch | Scherbenfeld verlangsamt −35 % statt −20 % | Abklingzeit −15 % |
| Legendär | Zweiter, kleinerer Einschlag 1,5 s später (60 % Wirkung) | Voller Prozentanteil auch gegen Bosse |
| Suprem | Zweite Ladung | Ziele im Scherbenfeld nehmen +15 % Turmschaden |

```js
splitter: {
  good: [
    { id: "splitter_good_radius", txt: "+15 % Radius",                    pct: 15,  pw: 1.05, mod: { stat: "radius",           mul: 1.15 } },
    { id: "splitter_good_field",  txt: "Scherbenfeld hält 1.5 s länger",            pw: 1.05, mod: { stat: "fieldDuration",    add: 1.5  } },
  ],
  rare: [
    { id: "splitter_rare_targets",txt: "Trifft 4 Ziele mehr (12 → 16)",             pw: 1.07, mod: { stat: "maxTargets",       add: 4    } },
    { id: "splitter_rare_pct",    txt: "+2 Prozentpunkte Einschlag (8 % → 10 %)",   pw: 1.08, mod: { stat: "pctDamage",        add: 0.02 } },
  ],
  epic: [
    { id: "splitter_epic_slow",   txt: "Scherbenfeld verlangsamt −35 % statt −20 %", pct: 35, pw: 1.06, mod: { stat: "slowPct", add: 0.15 } },
    { id: "splitter_epic_cd",     txt: "Abklingzeit −15 %",               pct: -15, pw: 1.07, mod: { stat: "cooldown",         mul: 0.85 } },
  ],
  legendary: [
    { id: "splitter_leg_second",  txt: "Zweiter Einschlag nach 1.5 s (60 % Wirkung)", pw: 1.10, mod: { stat: "extraStrikes",   add: 1    } },
    { id: "splitter_leg_boss",    txt: "Voller Prozentanteil auch gegen Bosse",       pw: 1.09, mod: { stat: "bossPctFactor",  mul: 2.0  } },
  ],
  supreme: [
    { id: "splitter_sup_charge",  txt: "Zweite Ladung",                              pw: 1.12, mod: { stat: "charges",         add: 1    } },
    { id: "splitter_sup_shatter", txt: "Ziele im Scherbenfeld nehmen +15 % Turmschaden", pct: 15, pw: 1.11, mod: { stat: "dmgTakenInField", mul: 1.15 } },
  ],
},
```

**Bild-Auftrag (Higgsfield).** *Der Hintergrund ist tiefdunkel, fast schwarz, absolut flach
und einfarbig — kein Verlauf, keine Textur, keine Vignette, keine Lichtstreuung bis an die
Bildränder.* Davor, formatfüllend und mittig, ein hochwertiges, poliertes
Fantasy-Spielicon: ein **berstender Prismenkristall** im Moment der Explosion, aus dessen
Kern acht bis zwölf scharfkantige, klare Scherben nach außen und schräg nach unten
schießen, jede mit einem feinen Regenbogen-Brechungsstreifen an der Kante. Die Scherben
bilden eine breite, oben schwere Silhouette, die auch bei 96 px noch als „etwas zerspringt
nach unten" lesbar ist. Kalte Weiß-, Eisblau- und Violett-Töne im Kristall, gesättigt und
kontrastreich; darunter ein knapper, warmer Aufprallschimmer, der den Boden **andeutet,
ohne ihn zu zeigen**. Umrahmt von einem schmalen, verzierten **Gold-Messing-Bogen** mit
gravierten Runenkerben, der die oberen zwei Drittel des Motivs fasst. Keine Schrift, keine
Figuren, keine Landschaft, kein Rauch bis an den Rand.

---

### D.2 `bann` — **BANN**

> *„Brennt ein Bannmal in einen einzelnen Gegner — er trägt es, bis es erlischt, und alles
> trifft ihn härter."*

**Rolle:** Der eine dicke Gegner. Kein Eigenschaden.

**Wirkung im Match.** Der Spieler tippt **einen Gegner** an. Für **8,0 s**:

| Größe | Wert |
|---|---|
| Schadensaufschlag | **+35 %** aus allen Quellen |
| Rüstungsabbau | **−40 %** (additiv mit STONEs Rüstungsbruch, gedeckelt bei 80 %) |
| Zielpriorität | Türme in Reichweite **bevorzugen** das Ziel (weicher Fokus, kein Zwang) |
| Übersprung | Stirbt das Ziel, springt das Mal mit der **Restlaufzeit** auf den Gegner mit den meisten verbleibenden HP im Umkreis 3 Felder — **höchstens einmal** |
| Eigenschaden | **keiner** |

**Abklingzeit 30 s, 1 Ladung** — 14 Einsätze pro Match, etwa jede zweite Welle.

**Skalierung mit Level.** Aufschlag linear **+35 % → +70 %**, Dauer linear **8,0 s →
12,0 s**, Rüstungsabbau linear **40 % → 60 %**. Kein `statMul` (§C.1).

**Warum diese Zahl.** +35 % über 8 s auf einer 30-Sekunden-Abklingzeit ist ein
**Dauerschaden-Zuwachs von +9 %**, wenn wirklich alles auf das markierte Ziel feuert
(0,35 × 8 / 30). Das ist mit Absicht der kleinste Dauerwert der vier — BANNs Wert liegt
nicht im Durchschnitt, sondern **im Zeitpunkt**: er wird auf den Panzer in Welle 12 oder
den Boss in Welle 18 gelegt, also genau dann, wenn das Match kippt. Der große Vorteil
dieser Bauart: **BANN hat kein Skalierungsproblem.** Weil er nichts anderes tut, als die
eigene Verteidigung zu multiplizieren, wächst seine absolute Wirkung automatisch mit jedem
Turm, jedem Level und jeder Neu-Skalierung aus §C.2 mit. Er kann weder veralten noch
davonlaufen. Der **Übersprung** ist kein Bonus, sondern eine Frustbremse: ohne ihn wäre ein
BANN auf einen Gegner, der eine halbe Sekunde später ohnehin stirbt, komplett verschwendet
— und in einem Spiel mit 15-Sekunden-Wellen passiert das ständig.

**Unsicherste Zahl: die Dauer 8,0 s.** Der Aufschlag von 35 % ist gut abzuschätzen, die
Dauer nicht — sie hängt daran, wie lange ein Panzer überhaupt in Reichweite der
Verteidigung bleibt. Woran man sie festmacht: **Anteil der Bann-Laufzeit, in der das Ziel
tatsächlich beschossen wird.** Unter 60 % ist die Dauer zu lang (sie läuft ins Leere),
über 95 % zu kurz (das Ziel überlebt sie routinemäßig). Zielband 70–85 %.

**Merge-Boni.**

| Stufe | Option A | Option B |
|---|---|---|
| Gut | +6 Prozentpunkte Aufschlag (35 % → 41 %) | Bannmal hält 2 s länger |
| Selten | Rüstungsabbau 55 % statt 40 % | Abklingzeit −20 % (30 s → 24 s) |
| Episch | Das Mal springt zweimal statt einmal | Ziel zusätzlich 30 % verlangsamt |
| Legendär | Gegner im Umkreis 1,5 Felder nehmen den halben Aufschlag mit | Hinrichtung unter 15 % HP (nicht bei Bossen) |
| Suprem | +12 weitere Prozentpunkte Aufschlag | Gegen Bosse zusätzlich +25 % Aufschlag |

```js
bann: {
  good: [
    { id: "bann_good_amp",   txt: "+6 Prozentpunkte Aufschlag (35 % → 41 %)", pct: 6,  pw: 1.06, mod: { stat: "dmgAmp",         add: 0.06 } },
    { id: "bann_good_dur",   txt: "Bannmal hält 2 s länger",                           pw: 1.05, mod: { stat: "markDuration",   add: 2    } },
  ],
  rare: [
    { id: "bann_rare_armor", txt: "Rüstungsabbau 55 % statt 40 %",            pct: 15, pw: 1.06, mod: { stat: "armorShred",     add: 0.15 } },
    { id: "bann_rare_cd",    txt: "Abklingzeit −20 % (30 s → 24 s)",          pct: -20,pw: 1.07, mod: { stat: "cooldown",       mul: 0.80 } },
  ],
  epic: [
    { id: "bann_epic_chain", txt: "Das Mal springt zweimal statt einmal",              pw: 1.08, mod: { stat: "markJumps",      add: 1    } },
    { id: "bann_epic_slow",  txt: "Ziel zusätzlich 30 % verlangsamt",         pct: 30, pw: 1.07, mod: { stat: "slowPct",        add: 0.30 } },
  ],
  legendary: [
    { id: "bann_leg_aura",   txt: "Gegner im Umkreis 1.5 Felder nehmen den halben Aufschlag mit", pw: 1.10, mod: { stat: "ampSplash", add: 0.5 } },
    { id: "bann_leg_exec",   txt: "Hinrichtung unter 15 % HP (nicht bei Bossen)",      pw: 1.11, mod: { stat: "executeThreshold", add: 0.15 } },
  ],
  supreme: [
    { id: "bann_sup_amp",    txt: "+12 weitere Prozentpunkte Aufschlag",      pct: 12, pw: 1.12, mod: { stat: "dmgAmp",         add: 0.12 } },
    { id: "bann_sup_boss",   txt: "Gegen Bosse zusätzlich +25 % Aufschlag",   pct: 25, pw: 1.11, mod: { stat: "dmgAmpVsBoss",   add: 0.25 } },
  ],
},
```

**Bild-Auftrag (Higgsfield).** *Der Hintergrund ist tiefdunkel, fast schwarz, vollkommen
flach und einfarbig — kein Verlauf, kein Nebel, keine Sterne, keine Aufhellung an den
Rändern.* Davor ein hochwertiges, poliertes Fantasy-Spielicon: ein **schwebendes,
glühendes Bannsiegel** — ein einzelner, streng geschnittener Runenring aus dunklem Metall,
in dessen Mitte eine spitze, kopfüber stehende Kristallklinge aus tiefviolettem Amethyst
hängt und knapp unterhalb des Rings nach unten zielt. Der Ring trägt drei kantige, glühende
Runenmarken in heißem Magenta-Rot, die Klinge wirft ein scharfes, kaltes Innenleuchten. Die
Silhouette ist bewusst **schmal, senkrecht und aufgeräumt** — sofort unterscheidbar von der
breiten Splitter-Explosion. Sattes Violett und Magenta gegen kühles Silber, hoher Kontrast,
harte Glanzkanten. Ein schmaler **Gold-Messing-Zierrahmen** fasst den Ring von links und
rechts wie zwei Klammern. Keine Figur, keine Hand, keine Schrift, kein Rauch, keine
Partikelwolke bis an den Bildrand.

---

### D.3 `bollwerk` — **BOLLWERK**

> *„Eine Kristallwand schießt aus dem Weg und hält alles auf, was am Boden läuft — für ein
> paar teure Sekunden."*

**Rolle:** Verteidigungsnotfall. Kauft Zeit, macht keinen Schaden.

**Wirkung im Match.** Der Spieler setzt die Wand auf ein **Wegfeld**. **Ohne Vorwarnzeit**
— das ist der Notfall-Charakter und der Grund, warum sie sich anders anfühlt als SPLITTER.

| Größe | Wert |
|---|---|
| Standzeit | **4,0 s** |
| Breite | volle Wegbreite eines Feldes |
| Bodengegner | bleiben davor stehen und schlagen sichtbar dagegen |
| Flieger | **passieren ungehindert** — die eingebaute Schwäche |
| Wand-HP | **keine** — die Wand ist nicht zerstörbar, sie läuft nur ab |
| Beim Zerbersten | **1,0 s Betäubung** im Umkreis 1 Feld |

**Abklingzeit 40 s, 1 Ladung** — 10 Einsätze pro Match.

**Skalierung mit Level.** Standzeit linear **4,0 s → 6,5 s**, Betäubung linear **1,0 s →
1,5 s**. Kein `statMul`.

**Warum diese Zahl.** Die entscheidende Entwurfsentscheidung ist, dass die Wand **keine
Trefferpunkte hat**. Eine Wand mit HP bräuchte eine HP-Zahl, und eine HP-Zahl müsste dem
Wellen-Wachstum von Faktor 7 765 folgen (§C.2) — sie wäre in Welle 3 unzerstörbar und in
Welle 20 sofort weg. **Zeit skaliert nicht.** 4,0 s bleiben in Welle 1 und in Welle 27
exakt 4,0 s wert, und das ist der einzige Grund, warum diese Karte ohne Kalibrierung
funktioniert. Das ist auch der Punkt, an dem ich bewusst von AAs *Inferno Legion* abweiche:
ein Taunt-Beschwörungsobjekt löst dasselbe Problem, hätte aber genau die HP-Zahl, die ich
vermeiden will. Warum **4 s**: bei 15,6 s je Welle ist das gut ein Viertel einer Welle und
verdoppelt in der typischen Durchbruchsituation die Zeit, die die hinteren Türme noch
haben. Warum **40 s Abklingzeit**: zehn Einsätze pro Match sind genug, um zwei bis drei
echte Notfälle plus ein paar präventive Setzungen abzudecken — aber zu wenig, um jede Welle
zu verzögern.

**Unsicherste Zahl — und die riskanteste Karte insgesamt: die 4,0 s in Verbindung damit,
dass die Wand überall setzbar ist.** Ich habe bewusst **keine** Sperrzone vor der Burg
eingebaut: eine Notbremse, die genau an der Stelle nicht greift, an der man sie braucht,
fühlt sich kaputt an. Der Preis ist, dass ein Spieler die Wand als reinen Torriegel
missbrauchen kann. Woran man das nach dem Playtest festmacht: **Verteilung der
Setzpositionen entlang des Wegs.** Landen über 60 % aller Setzungen auf den letzten zwei
Feldern vor der Burg, ist die Karte kein Notfall-Werkzeug mehr, sondern ein Riegel — dann
kommt entweder eine Sperrzone von einem Feld oder die Standzeit fällt auf 3,0 s.

**Merge-Boni.**

| Stufe | Option A | Option B |
|---|---|---|
| Gut | Wand hält 0,8 s länger | Berstbetäubung 1,6 s statt 1,0 s |
| Selten | Flieger darüber werden 3 s um 40 % verlangsamt | Abklingzeit −20 % (40 s → 32 s) |
| Episch | Beim Bersten 6 % Max-HP Schaden im Umkreis 1,5 Felder | Doppelwand über zwei benachbarte Felder |
| Legendär | Gegner vor der Wand nehmen +25 % Turmschaden | Zweite Ladung |
| Suprem | Wand hält 2 s länger | Nach dem Bersten bleibt der Boden 3 s verwurzelnd (−60 % Tempo) |

```js
bollwerk: {
  good: [
    { id: "bollwerk_good_time",  txt: "Wand hält 0.8 s länger",                        pw: 1.06, mod: { stat: "wallDuration",  add: 0.8  } },
    { id: "bollwerk_good_stun",  txt: "Berstbetäubung 1.6 s statt 1.0 s",              pw: 1.05, mod: { stat: "stunDuration",  add: 0.6  } },
  ],
  rare: [
    { id: "bollwerk_rare_air",   txt: "Flieger darüber 3 s um 40 % verlangsamt", pct: 40, pw: 1.07, mod: { stat: "airSlowPct", add: 0.40 } },
    { id: "bollwerk_rare_cd",    txt: "Abklingzeit −20 % (40 s → 32 s)",         pct: -20,pw: 1.07, mod: { stat: "cooldown",   mul: 0.80 } },
  ],
  epic: [
    { id: "bollwerk_epic_burst", txt: "Beim Bersten 6 % Max-HP im Umkreis 1.5 Felder", pct: 6, pw: 1.08, mod: { stat: "burstPctDamage", add: 0.06 } },
    { id: "bollwerk_epic_two",   txt: "Doppelwand über zwei benachbarte Felder",       pw: 1.09, mod: { stat: "wallWidth",     add: 1    } },
  ],
  legendary: [
    { id: "bollwerk_leg_soak",   txt: "Gegner vor der Wand nehmen +25 % Turmschaden", pct: 25, pw: 1.10, mod: { stat: "dmgTakenAtWall", mul: 1.25 } },
    { id: "bollwerk_leg_charge", txt: "Zweite Ladung",                                 pw: 1.11, mod: { stat: "charges",       add: 1    } },
  ],
  supreme: [
    { id: "bollwerk_sup_time",   txt: "Wand hält 2 s länger",                          pw: 1.12, mod: { stat: "wallDuration",  add: 2    } },
    { id: "bollwerk_sup_root",   txt: "Boden bleibt 3 s verwurzelnd (−60 % Tempo)", pct: 60, pw: 1.11, mod: { stat: "groundSlowPct", add: 0.60 } },
  ],
},
```

**Bild-Auftrag (Higgsfield).** *Der Hintergrund ist tiefdunkel, nahezu schwarz, komplett
flach und ohne jede Struktur — kein Verlauf, keine Bodenfläche, keine Aufhellung an den
Kanten.* Davor ein hochwertiges, poliertes Fantasy-Spielicon: eine **aus dem Boden
hochgeschossene Kristallmauer**, frontal und leicht von unten gesehen — drei bis fünf
massive, schräg ineinander gewachsene Quarzsäulen in kaltem Aquamarin und milchigem Weiß,
oben unregelmäßig gebrochen, unten von einem harten, engen Lichtsaum aus goldenem
Aufbruch-Glühen gefasst. Die Silhouette ist **breit, blockig und deutlich schwerer als
oben** — die klarste Form der vier, auf 96 px sofort als „Wand" lesbar. Tiefe entsteht über
Innenreflexionen und scharfe Facettenkanten, nicht über Nebel. Ein **Gold-Messing-Zierband
mit Nietenköpfen** läuft waagerecht über das untere Drittel der Mauer wie ein Beschlag.
Keine Gegner, keine Figuren, keine Schrift, keine Trümmerpartikel bis an den Bildrand.

---

### D.4 `fokus` — **FOKUS**

> *„Eine geschliffene Linse bündelt die arkane Strömung — alle Türme darunter feuern
> schneller und weiter."*

**Rolle:** Eigene Verstärkung. Wirkt nur auf die eigene Seite.

**Wirkung im Match.** Der Spieler setzt die Linse auf ein **freies Feld oder auf einen
Turm**. Sie steht **12,0 s**.

| Größe | Wert |
|---|---|
| Radius | **2,5 Felder** |
| Eigene Türme im Radius | **Angriffstempo −25 %** (= ein Drittel mehr Schüsse), **+15 % Reichweite** |
| Hauptskill des Helden | lädt **50 % schneller**, solange die Linse steht |
| Neu gebaute Türme | werden erfasst, sobald sie im Radius stehen |
| Wirkung auf Gegner | **keine** |

**Abklingzeit 35 s, 1 Ladung** — 12 Einsätze pro Match.

**Skalierung mit Level.** Tempo-Bonus linear **−25 % → −40 %**, Standzeit linear **12,0 s →
16,0 s**, Reichweite linear **+15 % → +25 %**. Radius nur über Merge. Kein `statMul`.

**Warum diese Zahl.** −25 % Angriffstempo ist ×1,333 Feuerrate. Über 12 s auf 4 Türmen im
Radius, bei 35 s Abklingzeit, ergibt das einen **Dauerschaden-Zuwachs der gesamten
Verteidigung von rund +6 bis +11 %** (nachgerechnet über die Wellen 5 bis 27: 11,4 % ·
7,6 % · 6,5 % · 5,7 %) — dieselbe
Größenordnung wie BANN, aber gleichmäßig statt punktuell verteilt. Das ist gewollt: FOKUS
ist die Karte für Spieler, die eine Engstelle bauen, BANN die für Spieler, die auf den
richtigen Moment warten. Der **Radius 2,5 Felder** ist der eigentliche Regler: er
entscheidet, ob die Karte 3 oder 6 Türme erfasst, und damit über ihre halbe Stärke. Ich
habe ihn so gewählt, dass er einen typischen Turmcluster erfasst, aber **nie die ganze
Verteidigung** — sonst wäre FOKUS keine Ortsentscheidung mehr. Die **+50 % Ult-Ladung** ist
der Grund, warum diese Karte thematisch neben dem Hauptskill im Sechseck sitzt: sie zieht
die Ult des Helden nach vorn und verbindet die beiden Spell-Slots mit dem, was zwischen
ihnen liegt.

> **Offene Abhängigkeit:** Wie „Ult-Ladung" gerechnet wird, steht nirgends fest — SOLARA
> hat einen Stat „Ult-Ladung 14 %", dessen Einheit nicht dokumentiert ist. Wenn sich die
> +50 % nicht sauber definieren lassen, entfällt dieser Teil ersatzlos und der Tempo-Bonus
> geht von −25 % auf −30 %.

**Verworfene Alternative, damit die Entscheidung nachvollziehbar bleibt:** FOKUS war
zunächst als **Wirtschaftskarte** geplant (Sofort-Gold oder eine zusätzliche Turmkarte in
die Hand). Das löst ein *fünftes* Problem („ich kann nicht bauen, was ich brauche") und
wäre die trennschärfste der vier Rollen gewesen. Dagegen sprach: eine Wirtschaftskarte
wirkt nicht **im** Kampf, sondern daneben, und in einem 7-Minuten-Match mit identischen
Wellen für beide Spieler ist Gold der Parameter, der eine PvP-Balance am schnellsten
zerlegt. Die Wirtschaftskarte gehört ins Set — aber als fünfter Spell, mit eigener
Betrachtung, nicht als einer der ersten vier.

**Unsicherste Zahl: der Radius 2,5 Felder.** Er ist der einzige Wert im ganzen Dokument,
den ich ohne eine Kartengeometrie überhaupt nicht abschätzen kann — er hängt davon ab, wie
eng Türme gebaut werden können, und das steht nirgends. Woran man ihn festmacht:
**Mediananzahl der erfassten Türme pro Einsatz.** Zielband **3 bis 5**. Unter 3 ist die
Karte tot, über 5 ersetzt sie die Bauentscheidung.

**Merge-Boni.**

| Stufe | Option A | Option B |
|---|---|---|
| Gut | Angriffstempo −4 Prozentpunkte mehr (−25 % → −29 %) | +20 % Radius |
| Selten | Linse steht 4 s länger | Türme unter der Linse +12 % Schaden |
| Episch | Ult-Ladung +100 % statt +50 % | +10 % Kritchance unter der Linse |
| Legendär | Türme unter der Linse treffen 1 Ziel mehr | Abklingzeit −25 % (35 s → 26 s) |
| Suprem | Zweite Linse, beide gleichzeitig setzbar | Nach dem Erlöschen bleiben 40 % des Tempobonus 6 s erhalten |

```js
fokus: {
  good: [
    { id: "fokus_good_rate",   txt: "Angriffstempo −4 Prozentpunkte mehr (−25 % → −29 %)", pct: -4, pw: 1.06, mod: { stat: "attackRate", add: -0.04 } },
    { id: "fokus_good_radius", txt: "+20 % Radius",                            pct: 20, pw: 1.05, mod: { stat: "radius",        mul: 1.20 } },
  ],
  rare: [
    { id: "fokus_rare_dur",    txt: "Linse steht 4 s länger",                           pw: 1.06, mod: { stat: "lensDuration",  add: 4    } },
    { id: "fokus_rare_dmg",    txt: "Türme unter der Linse +12 % Schaden",      pct: 12, pw: 1.08, mod: { stat: "damage",        mul: 1.12 } },
  ],
  epic: [
    { id: "fokus_epic_ult",    txt: "Ult-Ladung +100 % statt +50 %",            pct: 50, pw: 1.07, mod: { stat: "ultChargeRate", add: 0.50 } },
    { id: "fokus_epic_crit",   txt: "+10 % Kritchance unter der Linse",         pct: 10, pw: 1.08, mod: { stat: "critChance",    add: 0.10 } },
  ],
  legendary: [
    { id: "fokus_leg_pierce",  txt: "Türme unter der Linse treffen 1 Ziel mehr",        pw: 1.10, mod: { stat: "pierceTargets", add: 1    } },
    { id: "fokus_leg_cd",      txt: "Abklingzeit −25 % (35 s → 26 s)",          pct: -25,pw: 1.09, mod: { stat: "cooldown",      mul: 0.75 } },
  ],
  supreme: [
    { id: "fokus_sup_second",  txt: "Zweite Linse, beide gleichzeitig setzbar",         pw: 1.12, mod: { stat: "charges",       add: 1    } },
    { id: "fokus_sup_keep",    txt: "40 % des Tempobonus bleiben 6 s erhalten",         pw: 1.11, mod: { stat: "afterglow",     add: 0.40 } },
  ],
},
```

**Bild-Auftrag (Higgsfield).** *Der Hintergrund ist tiefdunkel, praktisch schwarz,
vollständig flach und einfarbig — kein Verlauf, keine Lichtwolke, keine Aufhellung, die den
Bildrand berührt.* Davor ein hochwertiges, poliertes Fantasy-Spielicon: eine **runde,
geschliffene Prismenlinse in einer Messingfassung**, halb schräg von vorn, wie ein
schwebendes Monokel ohne Griff. Durch die Linse fällt ein einzelner heller Strahl, der auf
der Austrittsseite in ein enges, sattes Regenbogenband aufgefächert wird — die Auffächerung
bleibt **kurz und gebündelt** und läuft nicht bis zum Bildrand. Die Fassung ist ein
kunstvoll gedrehter **Gold-Messing-Ring** mit drei kleinen, nach außen weisenden
Kristallspitzen auf zwölf, vier und acht Uhr, die die runde Silhouette scharf und
unverwechselbar machen. Warme Gold- und Bernsteintöne in der Fassung gegen kühles,
klares Glas; kräftig gesättigt, harte Glanzlichter, kein Weichzeichner. Keine Hand, kein
Gesicht, keine Schrift, kein Bokeh, keine Nebelschwaden bis an den Rand.

---

## E) Die Essenz-Frage: womit levelt man einen neutralen Spell?

Seit dem 29.07.2026 gilt **eine Essenz je Karte**, Schlüssel = Karten-ID
(`materialTypeOf('fire') === 'fire'`). Der Selbsttest prüft das als **Kopplung**:
`MATERIAL_KEYS` muss sich exakt mit der Kartenliste decken, sonst rot. Ein Spell in `PERKS`
ohne eigene Essenz lässt das Modul also sofort scheitern — genau so gebaut, damit niemand
eine Karte halb einbauen kann.

Wichtig zur Begriffsklärung: **„neutral" heißt kein Element, nicht automatisch keine eigene
Essenz.** Die Vorgabe schließt Möglichkeit A also nicht aus. Drei Wege stehen offen.

### Die drei Möglichkeiten, mit Zahlen

Rechengrundlage: Ertragsannahme aus §B (2 Bronze + 1 Silber pro Tag), Materialbedarf
`3 + tierIdx` je Level-Up, **517 Material** von Lv1 auf Lv100, vier Spells zum Start,
Material-Nachschub aus den Spell-Slots gekoppelt wie in State v4.

| | **A — eigene Essenz je Spell** | **B — eine gemeinsame Arkan-Essenz** | **C — Spells brauchen nur Gold** |
|---|---|---|---|
| Neue Sorten | **4** (`splitter`, `bann`, `bollwerk`, `fokus`) → Raster wächst von 8 auf 12 | **1** (`arkan`) → Raster wächst auf 9 | 0 |
| Modul-Eingriff | **keiner** — die Kopplung greift wie sie ist | `materialTypeOf()` bildet alle Spell-IDs auf `arkan` ab; Selbsttest von „Schlüssel == Karten-ID" auf „jede Karte hat genau eine Essenz **und** jede Essenz mindestens einen Abnehmer" umstellen | Spells aus der Kopplung ausnehmen |
| Nachschub je Spell/Tag (bei 4 Spell-Slots/Tag à 3 Essenz) | 12 ÷ 4 = **3,0** | Pool **12,0**, frei verteilbar | — |
| Tage bis **ein** Spell auf Lv100 | **172** | **43** (wenn alles in einen fließt), **86** bei zwei | gold-limitiert, ca. **30** |
| Vergleich Turm (3,0/Tag) | **identisch** | 4× schneller je gepushtem Spell | deutlich schneller |
| Erzeugt eine Entscheidung? | nein — jeder Vorrat hat genau einen Abnehmer | **ja** — „reicht meine Arkan-Essenz für SPLITTER oder für BANN?" | nein |

### Empfehlung: **B — eine gemeinsame „Arkan-Essenz"**

Vier Gründe, in der Reihenfolge ihres Gewichts:

1. **Sie holt die Entscheidung zurück, die v4 bewusst aufgegeben hat.** §B sagt das
   ausdrücklich: die Dreier-Aufteilung sollte die Frage erzeugen *„reicht meine
   Tempo-Essenz für FROST oder für DAWN?"*, und die gibt es seit v4 nicht mehr. Bei Türmen
   war das der richtige Preis, weil es sechs davon gibt und man vier baut. Bei Spells
   trägt man **zwei von vier** — der Vorrat ist hier eine echte, enge, jeden Tag spürbare
   Wahl. Die Mechanik, die bei Türmen nicht funktioniert hat, funktioniert hier.
2. **Sie passt zum einzigen AA-Beleg, den es dazu gibt.** Der Store-Text nennt drei
   getrennte Ströme: „tower cards", „**skill cards**", „hero shards" — Skill-Material als
   **eine** Währung, nicht als eine pro Skill. *Vorbehalt, und der ist ernst:* „skill
   cards" kann genauso gut die **Merge-Kopien** meinen und gar nicht das Level-Material.
   AA levelt Türme mit turm-eigenem Material und merged mit Kopien; ob es für Skills
   dieselbe Trennung gibt, ist **nicht belegt**. Der Beleg stützt B, beweist ihn nicht.
3. **Vier Spells sind der Anfang, nicht das Ende.** Bei acht Spells stünden unter A
   **sechzehn** Essenz-Kacheln im RESOURCES-Raster. Die Kopfleiste trägt seit v4 nur noch
   die Summe, weil acht Zahlen nicht in eine Zeile passen (§B) — sechzehn Sorten
   verschärfen genau das Problem, das man schon einmal lösen musste.
4. **Der Nachschub bricht unter A nicht, aber er langweilt.** 3,0 Essenz je Spell und Tag
   entsprechen exakt dem Turm-Wert; das ist nicht kaputt, es ist nur eine vierte
   Zahlenreihe ohne eigene Aussage.

**Konkret vorgeschlagen:**

| | |
|---|---|
| Schlüssel | `arkan` |
| Name | **Arkan-Essenz** |
| Symbol / Farbe | `🔷` · `#cfd8e3` (Silber-Prisma, siehe §G) |
| Bezugsquelle | **ausschließlich aus den Spell-Slots der Packs** — derselbe Slot, der einen Spell auslöst, legt Arkan-Essenz dazu. Das spiegelt die v4-Kopplung („die Karte bringt ihren Nachschub mit"), nur gepoolt. Dazu ein fester Betrag aus Arena-Prämien und dem Login-Kalender, damit auch ein Spieler ohne Pack-Kauf vorankommt. |
| Icon | **nicht** aus `CARD_ART` — Arkan-Essenz gehört keiner Karte, also braucht sie als einzige Sorte ein eigenes Bild (`ess_arkan`). Das ist der einzige Punkt, an dem B die „ein Bild kann nicht fehlen"-Eigenschaft aus §B aufgibt. |
| GET FROM / USED TO | „GET FROM: Silber-, Gold-, Arkan-Pack · Arena-Prämien · Login" / „USED TO: alle Spells aufwerten" |

### Die Gegenargumente gegen B — vollständig, nicht abgemildert

1. **B bricht die 1:1-Regel, die dreimal unabhängig belegt ist.** IMG_3427-3430, der
   Catapult-Beleg „78/15" ↔ „x78" und das RESOURCES-Raster aus §22.3 zeigen alle
   dasselbe: in AA ist Material = Karte. B führt eine zweite Materialphilosophie ein, und
   das Spiel hätte danach **zwei** Antworten auf dieselbe Frage. Das ist ein realer
   Konsistenzpreis, kein rhetorischer.
2. **B fasst den Selbsttest an, der genau dafür gebaut wurde, nicht angefasst zu werden.**
   Die Prüfung ist als Kopplung geschrieben, damit man eine Karte nicht halb einbauen
   kann. Die neue Formulierung („jede Karte hat genau eine Essenz **und** jede Essenz hat
   mindestens einen Abnehmer") behält diese Eigenschaft — ein Spell ohne
   Essenz-Zuordnung fällt weiterhin durch. Aber es ist eine Prüfung, die jemand **umbauen**
   muss, und umgebaute Prüfungen sind die, die leiser werden.
3. **B braucht als einzige Sorte ein eigenes Icon.** §B nennt es als ausdrücklichen Vorzug
   der v4-Bauart, dass ein Material-Bild nicht fehlen kann. Bei `arkan` kann es fehlen.
4. **A ist heute schon fertig.** Kein Eingriff, kein Testumbau, kein neues Bild. Wenn die
   Spells zügig kommen sollen, ist A der Weg mit null Risiko — und man kann später immer
   noch poolen, umgekehrt aber nicht ohne Migration.

**C** (nur Gold) empfehle ich nicht: Spells wären dann die einzige Kartenart ohne
Material-Bremse, würden dreimal schneller hochlaufen als Türme, und der starke
Retention-Haken „TO BE FOUND" aus §7.1 fiele für die ganze Kartenart weg. Der einzige
Grund für C wäre Bauzeit-Ersparnis, und die ist bei A auch schon fast null.

**Wenn der Auftraggeber schnell entscheiden will:** A ist die sichere, B die bessere.

---

## F) Nachrechnung zu den Spell-Slots aus §E2

§E2 schlägt vor: **Bronze 0 · Silber 1 · Gold 1 · Arkan 2**, ausdrücklich als offener
Vorschlag. Diese Staffel ist deutlich zu dünn, und zwar nachrechenbar.

Ein Kartenslot ist in Gewöhnlich-Äquivalenten wert (Gewichte × [1, 3, 9, 27, 81]):
Bronze **1,63** · Silber **2,76** · Gold **5,23** · Arkan **11,10**.

| | Turmkarten (heute) | Spells bei §E2 (0/1/1/2) | Spells bei **1/2/2/3** |
|---|---:|---:|---:|
| Slots pro Tag (2 Bronze + 1 Silber) | 17 | **1** | **4** |
| Gewöhnlich-Äquivalente pro Tag | 35,6 | 2,76 | 8,78 |
| … davon je Karte (8 Karten / 4 Spells) | 5,56 | 0,69 | 2,19 |
| Tage bis **Legendär** (81) | 15 | 118 | **37** |
| Tage bis **Suprem** (243) | **44** | **353** | **111** |

353 Tage gegen 44 bei Türmen ist **das Achtfache** — für eine Kartenart, von der man nur
zwei pro Match trägt und die im Battledeck direkt neben dem Helden sitzt. Bei **1/2/2/3**
sind Spells noch immer rund **2,5× langsamer** als Türme, was ich für richtig halte: es
gibt nur vier davon, man braucht zwei, und die Progression soll laut Auftraggeber „eine
Weile dauern". 111 Tage bis zum ersten Suprem-Spell liegt sauber zwischen der Turm-Zahl
(44) und der Pool-40-Zahl aus §B (221).

Ein Nebeneffekt, den man mitentscheiden sollte: **Bronze bekommt damit einen Spell-Slot.**
§E2 wollte Bronze bewusst schlank halten. Der Gegengrund ist, dass Bronze zwei Drittel des
Tagesertrags ausmacht — ohne Bronze-Slot hängt der komplette Spell-Nachschub an einem
einzigen Silber-Pack pro Tag, und ein Spieler, der einen Tag lang nur Bronze öffnet,
bekommt **null** Spells zu sehen.

---

## G) Kartenfarbe und Battledeck

Türme und Helden tragen ihre Elementfarbe. Spells haben keine, brauchen aber eine, und sie
sollte **auf den ersten Blick sagen: das ist kein Turm**.

**Vorschlag: alle vier Spells teilen sich Silber-Prisma `#cfd8e3`.** Das liegt weit genug
von allen sechs Elementfarben und von den sechs Raritätsfarben entfernt und liest sich als
„neutral" statt als „siebtes Element".

*Der offensichtliche Einwand:* vier gleichfarbige Karten sehen im Sammlungsraster gleich
aus. Zwei Gegenmittel sind schon eingebaut: im Battledeck trennt die **Sechseckform** die
Spells ohnehin von den Turmkacheln, und die vier Bild-Aufträge in §D sind gezielt auf
**vier deutlich verschiedene Silhouetten** geschrieben — breite Explosion nach unten,
schmaler senkrechter Ring, breiter Block, geschlossener Kreis. Wenn das im Raster trotzdem
nicht reicht, ist der nächste Schritt eine leichte Tönung je Spell **innerhalb** des
Silbers, nicht vier bunte Karten.

**Namen.** SPLITTER, BANN, BOLLWERK, FOKUS sind deutsch, die Turmnamen (EMBER, FROST,
THORN, STONE, DAWN, HOLLOW) international. Das ist eine bewusste Trennung — die Spells
sollen sich sprachlich anders anfühlen als die Türme — hat aber eine offene Flanke für eine
spätere englische Fassung. Vorschläge für den Fall: SPLITTER → *Splinter*, BANN → *Brand*,
BOLLWERK → *Bulwark*, FOKUS → *Focus*. Drei von vier tragen ohne Nacharbeit; nur BANN
bräuchte einen echten neuen Namen.

---

## H) Die vier unsichersten Zahlen auf einen Blick

| Spell | Unsicherste Zahl | Woran man sie nach Playtest 1 festmacht | Zielband |
|---|---|---|---|
| SPLITTER | Prozentanteil **8 % Max-HP** | Anteil des Spell-Schadens am Gesamtschaden eines Matches | 8–15 % für **beide** Spells zusammen |
| BANN | Dauer **8,0 s** | Anteil der Laufzeit, in der das markierte Ziel tatsächlich beschossen wird | 70–85 % |
| BOLLWERK | **4,0 s** in Verbindung mit freier Setzbarkeit | Verteilung der Setzpositionen entlang des Wegs | < 60 % auf den letzten zwei Feldern |
| FOKUS | Radius **2,5 Felder** | Mediananzahl der erfassten eigenen Türme je Einsatz | 3–5 Türme |

Und die eine Zahl, die über allen vieren steht: **die Wahlquote.** Wenn nach zwei Wochen
ein Spell in unter 15 % oder über 60 % der Matches mitgenommen wird, ist nicht seine
Zahl falsch, sondern seine Rolle — und dann hilft kein Prozentwert, sondern nur ein neuer
Entwurf für diese Karte.

---

## I) Was der Auftraggeber entscheiden muss

1. **Essenz:** A (eigene Essenz je Spell, sofort baubar) oder **B (gemeinsame
   Arkan-Essenz, Empfehlung)** — §E.
2. **Spell-Slots:** §E2s `0/1/1/2` oder die nachgerechnete Staffel **`1/2/2/3`** — §F.
3. **Kartenfarbe:** ein gemeinsames Silber für alle Spells, oder vier eigene Töne — §G.
4. **FOKUS' Ult-Ladung:** bleibt drin (dann muss „Ult-Ladung" definiert werden) oder fällt
   weg (dann Tempo-Bonus −30 % statt −25 %) — §D.4.
5. **Der fünfte Spell:** Wirtschaftskarte (Gold / zusätzliche Turmkarte) als eigene Rolle
   nachziehen, ja oder nein — §D.4, verworfene Alternative.
6. **Nicht Teil dieses Dokuments, aber vorher zu klären:** der Skalen-Befund aus §C.2 —
   Wellen-HP und Turm-Schaden liegen heute nicht auf derselben Skala.
