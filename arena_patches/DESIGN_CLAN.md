# Clan-System, Ghost-Clankrieg, Karten-Sendemechanik & Leaderboard

**Status:** Design-Spezifikation **Stufe 1** (State **v3**), implementiert in
`arena_patches/arena_clan.js` (Logik-Modul mit Selbsttest via `node arena_patches/arena_clan.js`)
und sichtbar in `arena_patches/ui_prototype.html` (Views **Clan** und **Rangliste**).
Alle Zahlen in diesem Dokument sind die **Quelle der Wahrheit** für das Modul — Änderungen hier
**und** dort nachziehen.

**Verwandte Dokumente:**
`DESIGN_PROGRESSION.md` (Karten, Packs, Festung — die drei Progressionsachsen),
`AA_UI_REFERENZ.md` (Videoanalyse des Vorbilds), `GAMEPLAY_OPTIMIERUNG.md` (Match-Mechanik).

**Abhängigkeiten:** `arena_cards.js` (Kartenbank, `copies`-Struktur, Material-Sorten),
`arena_profile.js` (Trophäen, Match-Events), `arena_rivals.js` (Bot-Architektur, Namensstil).

---

## 0) DIE BINDENDE USER-VORGABE ZUR SENDEMECHANIK

Diese Vorgabe ist **wörtlich** festgehalten und gilt als **harte Constraint**. Sie ist im Code
nicht als Empfehlung, sondern als **Validierung mit Fehlerwurf** implementiert
(`arena_clan.js` → `donateCards()` / `requestCards()`). Derselbe Text steht als Kopfkommentar
in `arena_clan.js`.

### 0.0 Fassung vom **30.07.2026** — GÜLTIG

Wörtlich vom Auftraggeber:

> „man darf 30 Karten anfordern. Jeder Spieler darf aber nur maximal 10 Karten dazu steuern.
> Es kann auch nur eine gesendet werden nicht direkt 10. man darf aber nur alle 5 Stunden
> Karten anfordern."

Das sind vier Regeln, im Code vier Konstanten:

| Regel | Konstante | Wert |
|---|---|---|
| Eine Anfrage umfasst 30 Karten | `REQUEST_SIZE` | **30** |
| Ein einzelner Spieler steuert höchstens 10 zu **einer** Anfrage bei | `DONATE_MAX_PER_REQUEST` | **10** |
| Ein Sendevorgang bucht **eine** Karte — nicht 10 auf einen Griff | `DONATE_PER_TAP` | **1** |
| Neue eigene Anfrage frühestens alle 5 h | `REQUEST_COOLDOWN_MS` | **5 h** |

Unverändert weiter gültig (die drei anderen bindenden Vorgaben, Begründung in §0.1):

> - Es dürfen **NUR Tower-Karten** versendet werden (keine Helden, kein Material, kein Gold).
> - **NUR Basis-Kopien (Tier "common"/grau)** dürfen versendet werden — **KEINE
>   grünen/blauen/höheren Raritäten**. Fusionen (3 gleiche → nächste Stufe) muss **jeder Spieler
>   selbst machen und selbst herausfinden**. Das ist eine bewusste **Progressions-Schutzregel**.
> - Die **eigene Anfrage** kann man **nicht selbst bespenden**.

**Die eine Entscheidung, die dabei zu treffen war** (getroffen am 30.07.2026, dem Auftraggeber
gemeldet): Das alte **globale Zeitfenster** („10 Karten pro 3 h über alle Anfragen hinweg",
§0.2) und die neue Grenze („höchstens 10 je Anfrage") tragen **dieselbe Zahl 10**. Nebeneinander
hätten sie bedeutet: *wer einem Clankollegen mit 10 Karten hilft, kann drei Stunden lang keinem
zweiten mehr helfen.* Das Zeitfenster hätte genau das Verhalten bestraft, für das es Clans gibt.
Es entfällt deshalb **ersatzlos**; verbindlich ist allein die Grenze **je Anfrage**.

**Gemessene Nebenwirkung, offen ausgewiesen:** Der Tagesdeckel steigt von **80 auf 120 Karten**
(4 Bot-Anfrage-Buckets à 6 h × 3 gleichzeitig offene Anfragen × 10 eigene Karten). Der
Gold-Zufluss aus Spenden damit von **2 000 auf 3 000 🪙/Tag**. Weiterhin gilt: Der Deckel setzt
120 *überzählige* graue Kopien pro Tag voraus und ist praktisch unerreichbar (§4.3). Sollte die
Zahl später doch stören, ist der richtige Hebel `DONATE_MAX_PER_REQUEST` oder die Zahl der
gleichzeitig offenen Anfragen — **nicht** die Rückkehr des Zeitfensters, das die Kooperation
bestraft statt den Transfer.

### 0.2 Fassung vom **26.07.2026** — ABGELÖST (steht hier zur Nachvollziehbarkeit)

Ursprünglicher Wortlaut, so lange gültig, bis ihn die Fassung vom 30.07.2026 ersetzt hat:

> - Es dürfen **NUR Tower-Karten** versendet werden (keine Helden, kein Material, kein Gold).
> - Limit: **10 Stück pro 3 Stunden** (rollierendes Fenster oder Cooldown-Timer — entscheide
>   dich, dokumentiere).
> - **NUR Basis-Kopien (Tier "common"/grau)** dürfen versendet werden — **KEINE
>   grünen/blauen/höheren Raritäten**.

Umgesetzt war das als rollierendes 3-h-Fenster (§1) mit den Konstanten `SEND_MAX = 10`,
`SEND_WINDOW_MS = 3 h`, dem persistierten `sendLog` und `REQUEST_SIZE = 10` /
`REQUEST_COOLDOWN_MS = 8 h`. Alle vier sind seit dem 30.07.2026 **aus dem Code entfernt** —
bewusst ohne Alias: ein Aufrufer, der sie noch liest, bekommt `undefined` und scheitert laut,
statt still mit einer plausiblen falschen Zahl zu rechnen. Der State ist dafür von **v2 auf v3**
gehoben worden; die Migration löscht `sendLog` und übernimmt `donated` unverändert.

### 0.3 Warum die drei unveränderten Regeln richtig sind

Ein Spendensystem ist die gefährlichste Stelle jedes Sammel-Metas, weil es die
Fortschrittskurve **umgehen** kann. Drei Angriffe sind zu erwarten, alle drei sind durch die
Vorgabe geschlossen:

| Angriff | Ohne Regel | Mit Regel |
|---|---|---|
| **Alt-Account-Farming** | Zweitaccount öffnet Packs, schickt Legendäre an den Hauptaccount → Sammlung in Tagen statt Monaten | Nur graue Basis-Kopien wandern. Eine Legendäre entsteht aus **243 grauen** Kopien (3⁵) — das Verschieben spart keine Zeit, es verschiebt nur *welche* Karte man hochzieht. |
| **Clan als Rarität-Fabrik** | 30 Spieler mergen zusammen; einer bekommt alles | Der Merge ist **Privatsache**. Jeder Spieler baut seine eigene Leiter. Der Clan kann nur *Breite* liefern, nie *Höhe*. |
| **Ökonomie-Wäsche** | Gold/Material/Helden als Handelsware → Schwarzmarkt, Account-Verkauf | Nur eine Ressourcenart ist übertragbar: graue Turmkarten. Helden (`solara`, `magmor`) sind **explizit gesperrt** — sie sind Identität, nicht Ware. |

Der zweite Teil der Vorgabe — *„selbst machen und selbst herausfinden"* — ist ein
**Lern-Design**, kein Gängeln: Der Merge (**●●○** → nächste Stufe) ist der Moment, in dem ein
Spieler das System *begreift*. Wer eine fertige grüne Karte geschenkt bekommt, hat diesen Moment
nie. Der Clan liefert deshalb **Rohstoff**, nicht **Ergebnis**.

### 0.4 Was der Code garantiert

`donateCards()` wirft bei jedem Verstoß einen `Error` mit **deutscher Klartextmeldung**
(direkt als Toast anzeigbar):

| Verstoß | Meldung |
|---|---|
| Karten-ID ist kein Tower (`solara`, `magmor`, Skills, Items, Unbekanntes) | `Nur Turmkarten dürfen gespendet werden — SOLARA ist keine.` |
| Rarität ≠ `common` (Tier-Index 0) | `Nur graue Basis-Kopien dürfen gespendet werden — „Gut" (Grün) ist gesperrt. Fusionen macht jeder selbst.` |
| Grenze je Anfrage erreicht | `Du hast dieser Anfrage schon 10 Karten gegeben — mehr darf ein einzelner Spieler nicht beisteuern. Den Rest holen die anderen im Clan.` |
| Menge über dem Rest-Kontingent | `Du kannst dieser Anfrage nur noch 4 Karten geben (höchstens 10 je Anfrage).` |
| Mehr als eine Karte je Sendevorgang | `Es geht genau eine Karte je Sendevorgang — tippe mehrfach, wenn du mehr geben willst.` |
| Neue Anfrage zu früh | `Neue Anfrage erst in 3:12 möglich (eine alle 5 Stunden).` |
| Nicht genug eigene graue Kopien | `Du hast nur 2 graue EMBER-Kopien.` |
| Anfrage geschlossen/unbekannt/eigene | `Diese Anfrage ist bereits erfüllt.` / `Anfrage nicht gefunden.` / `Du kannst deine eigene Anfrage nicht bespenden.` |

Zusätzlich ist die **Signatur selbst** eng geschnitten: `donateCards(requestId, count)` nimmt
**keinen Tier-Parameter**. Es gibt keinen Aufrufpfad, über den eine höhere Rarität *überhaupt
adressierbar* wäre — die Validierung ist die zweite Verteidigungslinie, nicht die erste.

---

## 1) Entscheidung: Kontingent JE ANFRAGE, kein Zeitfenster

**Stand 30.07.2026. Gewählt: das Kontingent hängt an der Anfrage, nicht an der Uhr.**

**So funktioniert es:** `donated` (persistiert, `{anfrageId: n}`) hält, wie viele Karten *ich*
zu *dieser* Anfrage beigetragen habe. `sendQuota(anfrageId)` liest daraus `used/10`, jede Spende
erhöht `n` um genau 1. Es gibt keinen Reset und keine Restzeit — deshalb liefert `sendQuota`
auch keine Felder `resetAt`/`resetIn`/`resetText` mehr: ein Feld, das immer 0 sagt, liest sich
wie „gleich frei" und lügt.

**Die Signatur hat sich gedreht:** `sendQuota(anfrageId, now)` statt `sendQuota(now)`. Der alte
Aufruf übergäbe eine **Zahl** als Anfrage-ID; das wird abgefangen und wirft mit Klartext.
Bewusst so: eine stille `0/10` wäre der schlimmste Ausgang — das UI hätte weitergezeichnet und
niemand hätte es gemerkt.

**Warum nicht zusätzlich ein Zeitfenster** (das alte Modell, §0.2):

| | Kontingent je Anfrage | zusätzlich globales 3-h-Fenster |
|---|---|---|
| Spieler hilft **einem** Kollegen mit 10 Karten | kann sofort dem nächsten helfen | drei Stunden lang **keinem zweiten** — das System bestraft die Hilfsbereitschaft, für die es Clans gibt |
| Massentransfer an **einen** Account | hart gedeckelt: 10 je Anfrage, egal wie oft man tippt | ebenfalls gedeckelt, aber die Grenze je Anfrage tut die Arbeit bereits |
| Erklärbarkeit im UI | zehn Punkte **auf der Anfragekarte**: „so viel hast du DIESER Anfrage gegeben" | eine Leiste über der Liste, die nicht sagen kann, worauf sich ihre Zahl bezieht |
| Uhr-Manipulation (Systemzeit) | **wirkungslos** — es gibt keine Zeitkomponente mehr | umgehbar, solange kein Server die Zeitstempel setzt |

Die Grenze je Anfrage ist zugleich **freundlicher zum kooperativen Spieler** und **robuster**
(sie kennt keine Uhr, die man stellen kann). Der einzige Preis ist der höhere Tagesdeckel —
offen ausgewiesen in §0.0 und §4.3.

**Was die Grenze NICHT deckt, bewusst:** ein Spieler kann in derselben Minute drei offene
Anfragen mit je 10 Karten bedienen. Genau das ist gewollt — es ist Hilfe an *drei verschiedene*
Mitglieder, nicht Transfer an eines. Der Kanal „alles an einen Account" bleibt bei 10 Karten je
Anfrage geschlossen, und die eigene Anfrage ist ohnehin nicht selbst bespendbar.

**Ein Sendevorgang = eine Karte.** `donateCards()` nimmt `count` nur noch entgegen, um Mengen
> 1 **abzulehnen**. Das ist keine Schikane, sondern die dritte Regel der Vorgabe: die
Entscheidung, wie viel man gibt, bleibt beim Spieler und wird nicht vom UI vorweggenommen (das
rechnete vorher „Restbedarf × Kontingent × Bestand" aus und schickte alles in einem Zug).

---

## 2) Clan-Grundgerüst (Stufe 1)

### 2.1 Datenmodell

Persistiert unter `localStorage["arenaClan"]`, State-Version **3** (v2 → v3 am 30.07.2026:
`sendLog` entfällt, siehe §0.2):

```
{
  v: 3,
  joined:  bool,                       // ist der Spieler in einem Clan?
  clan: {
    id, name,                          // Name: 3-20 Zeichen
    badge: { color, sym },             // Preset-Keys, siehe §2.2
    desc,                              // Beschreibung, max 120 Zeichen
    joinMode: "open" | "request",      // offen / auf Anfrage
    minTrophies: int,                  // Mindest-Trophäen (PEAK, siehe §2.3)
    created: ts,
    seed: int,                         // Determinismus-Anker der Bot-Schicht
    warWins, warStreak, warBadge       // Kriegs-Historie, siehe §5.5
  },
  me:      { id:"me", role, joinedTs, lastActive, lastRequestTs },
  quests:  { week, progress:{wins,packs,trophies}, claimed },
  requests:[ {id, ownerId, cardId, need, got, ts, closed, donors:{id:n}} ],
  donated: { anfrageId: n },           // eigene Spenden JE ANFRAGE, n ≤ 10 —
                                       // trägt seit v3 die Sendegrenze,
                                       // max DONATED_KEEP Einträge
  notes:   [ {ts, kind, text} ],       // Benachrichtigungen + Aktivitäts-Feed (max 40)
  war:     { week, points, attacks:{targetId:n}, log:[], resolved, won }
}
```

**Was NICHT im State liegt:** die 29 Mitspieler, ihre Trophäen, ihre Quest-Beiträge, ihre
Anfragen, der Gegnerclan, die Kriegsverläufe der Bots und die Leaderboard-Population. All das
ist **berechnet**, nicht gespeichert (§7).

### 2.2 Abzeichen (Banner)

Ein Abzeichen ist ein Paar aus **Farbpreset** und **Symbolpreset** — keine Freitext-Eingabe, kein
Bild-Upload, damit nichts moderiert werden muss:

| Farbpresets (8) | Symbolpresets (8) |
|---|---|
| Blutrot · Goldglanz · Azurblau · Smaragd · Amethyst · Bernstein · Frostweiß · Obsidian | ◈ Prisma · 🔥 Flamme · ❄ Frost · 🌿 Ranke · 🪨 Fels · ☀ Sonne · 🌑 Leere · ♛ Krone |

64 Kombinationen. Alle Symbole sind **Text**, keine Assets — das Banner rendert offline und im
`file://`-Prototyp identisch. Der **Kriegs-Rahmen** (§5.5) legt sich als vierte Stufe darüber.

### 2.3 Beitritt & Rollen

- **Beitrittsart:** `open` (jeder unter Erfüllung der Trophäen-Schwelle tritt sofort ein) oder
  `request` (Anführer/Älteste bestätigen). In Stufe 1 ohne Server ist `request` **Datenfeld und
  UI-Anzeige**, kein Workflow.
- **Mindest-Trophäen = PEAK, nicht aktuell.** Gemessen wird `ArenaProfile.get().best`, nicht
  `.trophies`. Begründung: Wer 1 400 🏆 erreicht hat und aktuell bei 1 180 steht, ist derselbe
  Spieler. Eine Schwelle auf dem Momentanwert würde Spieler **während einer Pechsträhne
  aussperren** — genau dann, wenn sie einen Clan am dringendsten brauchen. Das ist dieselbe
  Frust-Schutz-Logik wie `T_LOSS = −10` gegen `T_WIN = +30` in `arena_profile.js`.
- **Mitgliederlimit 30.** Der lokale Spieler + **29** simulierte Mitspieler.
- **Rollen:** `leader` (Anführer, genau 1) · `elder` (Ältester, bis 5) · `member` (Mitglied).
  Rechte in Stufe 1: rein kosmetisch/informativ; die Rollenverteilung ist deterministisch aus
  `clan.seed` erzeugt, der lokale Spieler ist **Anführer seines eigenen Clans**.
- **Aktivitätszeitstempel:** je Mitglied `lastActive`. Bots erhalten deterministische Werte im
  Band „vor wenigen Minuten" bis „vor 4 Tagen"; das UI zeigt sie als „aktiv vor 2 h". Wer > 7
  Tage inaktiv ist, wird im UI **abgedunkelt** — Vorbereitung für den späteren Kick-Workflow.

---

## 3) Clan-Quests (wöchentlich, Koop)

### 3.1 Die drei Quests

Drei **parallele** Wochenquests mit einem **gemeinsamen** Fortschrittsbalken pro Quest (nicht pro
Mitglied). Gespeist aus Match-Events über `ArenaClan.reportEvent(type, amount)`:

| Key | Text | Ziel | Event-Quelle in `arena_profile.js` |
|---|---|---|---|
| `wins` | „Gewinnt zusammen **360** Matches" | 360 | `applyMatchResult({win:true})` → `reportEvent("win", 1)` |
| `packs` | „Öffnet zusammen **120** Packs" | 120 | `openPack()` bzw. `packAwarded` → `reportEvent("pack", 1)` |
| `trophies` | „Verdient zusammen **5 400** Trophäen" | 5400 | `applyMatchResult()` → `reportEvent("trophy", res.delta)` (nur positive Deltas) |

`reportEvent()` ist die **einzige** Schnittstelle vom Spiel in die Quests. Sie ist absichtlich
dumm (Typ + Menge) und kennt keine Match-Details — damit sie später serverseitig 1:1
validierbar ist.

### 3.2 Warum genau diese Zahlen

Die Ziele sind so kalibriert, dass die **29 Bots ~89 % erreichen** und der Spieler den Rest
liefert. Erwarteter Bot-Beitrag pro Woche und Bot: **11 Siege · 3,7 Packs · 168 🏆**
(Jitter-Faktor 0,7–1,3×, Mittel 1,0) → 29 Bots ≈ **319 / 107 / 4 872**.

| Quest | Bot-Erwartung (σ) | Ziel | Bots allein | Spieler-Anteil bis Gold |
|---|---|---|---|---|
| Siege | 319 (± 10) | 360 | ~89 % | **41 Siege** ≈ 6/Tag |
| Packs | 107 (± 3) | 120 | ~89 % | **13 Packs** ≈ 2/Tag |
| Trophäen | 4 872 (± 157) | 5 400 | ~90 % | **528 🏆** ≈ 75/Tag |

Das ist der Kern des Designs: **Der Clan schafft es ohne dich fast — und mit dir sicher.** Eine
Wochenleistung, die ein engagierter Spieler in täglichen Sitzungen erbringt, entscheidet die
Truhenstufe für **30 Leute**. Genau diese Hebelwirkung ist der Grund, warum Clan-Quests binden.
Ziele deutlich über der Bot-Erwartung („der Clan schafft es nie") oder deutlich darunter („der
Clan schafft es sowieso") töten den Effekt in beide Richtungen.

> **Warum die Jitter-Spanne eng ist (0,7–1,3 statt 0,5–1,5).** Die Streuung der *Summe* über 29
> Bots wächst mit der Spanne. Bei 0,5–1,5 liegt σ der Siege-Summe bei ±19 — dann reißt in etwa
> jeder sechsten Woche ein Quest die 100 % **ohne** den Spieler, und die Quest ist in dieser
> Woche Deko. Bei 0,7–1,3 sinkt σ auf ±10; die Bots landen verlässlich bei 84–96 %, und der
> Spieler ist **immer** der Unterschied. Der erste Testlauf hat genau diesen Fehler
> aufgedeckt (gemessen: 103 % / 88 % / 95 %).

### 3.3 Truhen-Staffel

Gesamtfortschritt = **Mittel der drei Füllgrade**, jeder bei 100 % gekappt (damit ein
übererfüllter Quest keinen vernachlässigten kompensiert):

| Stufe | Ab | Inhalt (an **alle** 30 Mitglieder) |
|---|---|---|
| — | < 50 % | keine Truhe |
| 🥉 **Bronze** | ≥ 50 % | 1 × Bronze-Pack · 1 500 🪙 · 20 ⚗ |
| 🥈 **Silber** | ≥ 80 % | 1 × Silber-Pack · 4 000 🪙 · 45 ⚗ |
| 🥇 **Gold** | = 100 % | 1 × Gold-Pack · 9 000 🪙 · 90 ⚗ |

Die Pack-Äquivalente sind echte `ArenaCards.PACKS`-Keys — die Truhe schüttet über den
bestehenden Pack-Pfad aus, es gibt keine zweite Belohnungsökonomie.

**Größenordnung:** Die Gold-Truhe entspricht ~1,5 Festungsstufen (`COST_BASE = 6 000`) oder
knapp einem Level-Up im Bereich Lv 30. Sie ist ein **spürbarer Wochenschub, kein Ersatz** für
Matches. Bewusst: Der Clan darf die Solo-Progression beschleunigen, nicht ablösen.

### 3.4 Wochen-Rhythmus & Rollover

- **Wochengrenze: Montag 00:00 UTC.** Nicht Ortszeit. Begründung: Ein Clan hat Mitglieder in
  mehreren Zeitzonen; eine lokale Grenze würde bedeuten, dass derselbe gemeinsame Balken für
  verschiedene Mitglieder zu verschiedenen Zeiten zurückspringt. UTC ist außerdem die Grenze, die
  ein Server ohnehin verwenden wird — Stufe 1 und Stufe 2 verhalten sich damit identisch.
- **Wochenschlüssel:** ISO-artig `"2026-W30"`, berechnet aus dem UTC-Montag.
- **Rollover:** Beim ersten `get()` in einer neuen Woche werden `quests.progress` genullt,
  `quests.claimed` zurückgesetzt und der Kriegs-Block frisch angelegt. Kein `setInterval`, kein
  Hintergrund-Job — der Rollover passiert **lazy beim Lesen**.
- **Sammelphase Mo–Fr:** `reportEvent()` zählt **nur** in der Sammelphase. Am Wochenende gehört
  die Aufmerksamkeit dem Krieg; Ereignisse vom Samstag/Sonntag laufen ins Leere (bzw. in die
  Kriegspunkte). Das hält Quest-Fortschritt und Kriegs-Fortschritt sauber getrennt und macht die
  Truhenstufe **ab Samstag 00:00 UTC unveränderlich und abholbar**.

### 3.5 Deterministischer Bot-Fortschritt

Kein Timer, keine gespeicherten Zwischenstände. Der Bot-Beitrag ist eine **reine Funktion**:

```
botProgress(quest, now) = Σ_bots round( base[quest] · rate(bot, week, quest) · frac(now) )
rate(...)  = 0.7 + 0.6 · hash01(seed, botId, weekKey, questKey)     // 0.7 .. 1.3, fix pro Woche
frac(now)  = clamp( (now − Wochenstart) / 5 Tage , 0 , 1 )          // Sammelphase
```

Eigenschaften, die daraus folgen und im Selbsttest geprüft werden: **monoton** (der Balken
springt nie zurück — `round` ist monoton in seinem Argument), **reproduzierbar** (zweimal
derselbe Zeitpunkt = dasselbe Ergebnis), **wochenstabil** (`rate` ändert sich nur beim
Wochenwechsel) und **serverersetzbar** (eine echte Summe über 29 Datensätze hat genau dieselbe
Signatur).

> **Implementierungsfalle, teuer bezahlt:** `hash01()` ist FNV-1a **mit murmur3-Finalisierung**.
> Reines FNV-1a mischt die *zuletzt* eingespeisten Bytes kaum — und genau die variieren hier
> (`…|k` mit k = 0…28). Ohne Finalisierung sind die 29 „Zufallswerte" korreliert und die
> Summe verfehlt ihren Erwartungswert systematisch (gemessen: Packs bei 54 % statt 89 %).
> Wer die Bot-Schicht erweitert, muss diesen Mischschritt beibehalten.

---

## 4) Sendemechanik — Karten-Spenden

### 4.1 Anfragen

- `requestCards(cardId)` — Mitglied stellt eine Anfrage für **eine** Turmkarte.
- **Bedarf pro Anfrage: 30 Kopien** (`REQUEST_SIZE`, Vorgabe 30.07.2026). Das **Dreifache**
  dessen, was ein einzelner Spender beisteuern darf — eine Anfrage ist damit **nie** von einer
  Person allein füllbar. Genau das ist der Zweck: die Anfrage ist eine Bitte an den **Clan**,
  nicht an einen Wohltäter.
- **Höchstens 10 Kopien von EINEM Spieler** je Anfrage (`DONATE_MAX_PER_REQUEST`). Die restlichen
  20 kommen von anderen. Die Fehlermeldung sagt das ausdrücklich mit („Den Rest holen die
  anderen im Clan"), sonst liest sich die Sperre wie „hier ist nichts mehr zu holen".
- **Eine Karte je Sendevorgang** (`DONATE_PER_TAP`). Der SPENDEN-Knopf sendet genau eine; wer
  mehr geben will, tippt mehrfach.
- **Max 1 aktive Anfrage** pro Spieler. Wer noch eine offene hat, muss sie erfüllt sehen oder
  zurückziehen (`cancelRequest()`).
- **Neue Anfrage frühestens alle 5 h** (`REQUEST_COOLDOWN_MS`, Vorgabe 30.07.2026). Das begrenzt
  den Zufluss auf **max. 4 Anfragen/Tag ≈ 120 Karten/Tag** pro Spieler — theoretisch, denn die
  Anfrage füllt sich über ~4 h und wird selten voll ausgeschöpft. Vorher waren es 3 Anfragen à
  10 Karten (30/Tag); der Zufluss steigt also deutlich. Er bleibt gedeckelt durch das, was der
  **Clan** überhaupt spenden kann — 29 andere Mitglieder mit je 10 Karten je Anfrage.
- Anfragen sind für **alle** Mitglieder sichtbar (im UI eine Kartenreihe mit Spenden-Button).
- Validierung auch hier hart: **nur Tower, nur `common`** — eine Anfrage für `solara` ist genauso
  unmöglich wie eine Spende von `solara`.

### 4.2 Spenden

`donateCards(requestId, count)`:

1. Anfrage auflösen, Zustand prüfen (existiert, offen, nicht die eigene).
2. Karten-ID gegen `TOWER_IDS` prüfen → sonst Fehler.
3. Tier ist implizit `common` (Index 0) — nicht parametrisierbar; `assertCommon()` prüft
   zusätzlich jeden explizit übergebenen Tier-Wert und wirft bei ≠ 0.
4. Menge prüfen: genau `DONATE_PER_TAP` (= 1) → sonst Fehler.
5. Kontingent **dieser Anfrage** prüfen (`sendQuota(requestId)`, §1) → sonst Fehler mit der
   Grenze im Klartext.
6. Eigenen Bestand prüfen: `ArenaCards.get().cards[id].copies.common ≥ count`.
7. **Abziehen beim Spender**, **gutschreiben beim Empfänger** (bei `me` als Empfänger über
   `ArenaCards.addDrop(id, "common", n)`); `donated[requestId] += n`.
8. Spender-Belohnung buchen (§4.3).
9. Ist die Anfrage voll → schließen und **Benachrichtigung** an alle Spender.

### 4.3 Spender-Belohnung

| Pro gespendeter Karte | Wert |
|---|---|
| Gold | **25 🪙** |
| Upgrade-Material | **1 ⚗** — in der **Sorte der gespendeten Karte** (`ArenaCards.materialTypeOf`) |

**Maximum (Stand 30.07.2026):** 10 Karten je Anfrage × 3 gleichzeitig offene Anfragen ×
4 Anfrage-Buckets à 6 h → **120 Karten/Tag** → **3 000 🪙 + 120 ⚗** täglich. Vorher (globales
3-h-Fenster): 80 Karten/Tag → 2 000 🪙. Der Deckel steigt also um **50 %** — offen ausgewiesen,
weil er die Folge der Entscheidung in §0.0 ist. Praktisch unerreichbar bleibt er trotzdem: Er
setzt 120 **überzählige** graue Kopien pro Tag voraus (ein Bronze-Pack liefert 5 Karten, davon
~4 grau). Realistisch für einen aktiven Spieler unverändert:
**10–20 Karten/Tag ≈ 250–500 🪙 + 10–20 ⚗.**

Ein Level-Up im Bereich Lv 8–12 kostet 4 500 🪙 (`GOLD_BANDS`); die Spenden-Belohnung ist damit
**Beschleuniger im niedrigen Prozentbereich**, kein Einkommensersatz. Die Sortenbindung des
Materials ist dabei der elegantere Teil: Wer `fire` spendet, bekommt Ember-Essenz — seit
State v4 also **exakt** das Material für die Karte, die er offensichtlich im Überfluss hat
(vorher war es die Sorte einer Zweier-/Vierergruppe, jetzt die Karte selbst). Die Belohnung
verstärkt die vorhandene Schwerpunktsetzung statt sie zu verwässern.

**Wer bucht was:** Kartenkopien und Material bucht das Modul selbst über `ArenaCards` (dessen
Domäne). **Gold wird nur gemeldet** (`reward.gold`) und vom Hub ausgezahlt — exakt dieselbe
Arbeitsteilung wie in `arena_cards.js` (`goldFor()`) und `arena_fortress.js` (`buy()`). Es gibt
im Projekt genau eine Gold-Wallet, und sie liegt nicht in einem Logik-Modul.

**Bewusst NICHT belohnt:** der Empfänger. Er bekommt die Karten — das ist die Belohnung. Ein
zusätzlicher Bonus fürs Anfragen würde Anfrage-Spam erzeugen.

### 4.4 Benachrichtigungen

Wird eine Anfrage voll, erhält **jeder** Spender einen Eintrag in `notes`:

> `Deine Spende hat Nessa Tautropfen geholfen — 4 × EMBER angekommen.`

Der Eintrag trägt `kind:"help"` und erscheint im Aktivitäts-Feed des Clan-Views. Damit hat das
Spenden einen **sichtbaren Abschluss** — ohne diesen Rücklauf fühlt sich Spenden wie ein Loch an,
in das man Karten wirft.

---

## 5) Ghost-Clankrieg (Wochenende)

### 5.1 Zyklus

| Phase | Zeitraum (UTC) | Was passiert |
|---|---|---|
| **Sammelphase** | Mo 00:00 – Fr 24:00 | Quests + Spenden zählen. Kriegsboard zeigt Countdown. |
| **Kriegsphase** | Sa 00:00 – So 24:00 | Angriffe auf Ghost-Builds. Quest-Events zählen nicht. |
| **Auswertung** | So 24:00 (= Mo 00:00) | Punktevergleich, Truhe, Banner-Rahmen, Rollover. |

Vollständig **deterministisch aus der Kalenderwoche** berechnet — `warPhase(now)` liefert
`{phase, weekKey, day, msLeft, until}` ohne jeden gespeicherten Zustand.

### 5.2 Matchmaking

Eigener Clan vs. **einen** Geister-Gegnerclan, generiert aus `hash(clan.seed, weekKey)`:

- Name aus zwei Presetlisten („Eiserne Klingen", „Letzte Bastion", …), eigenes Abzeichen.
- **Stärke ≈ Trophäen-Schnitt des eigenen Clans ± 8 %.** Kein Sandbagging möglich, kein
  Hoffnungslos-Matchup.
- Jedes der 30 Gegnermitglieder trägt ein **Ghost-Build**: ein Bot-Loadout im Stil von
  `arena_rivals.js` (`{id, name, el, hero, deck[6], aggro, trophies, tier}`). Ein Ghost ist eine
  Momentaufnahme, kein Live-Gegner — deshalb „Ghost": **niemand muss gleichzeitig online sein.**
  Das ist der ganze Grund für dieses Design; synchrone Clankriege sterben an der Terminfindung.

### 5.3 Angriffe

- **3 Angriffe pro Kriegstag** (`WAR_ATTACKS_PER_DAY`) → **6 über das Wochenende**.
  Tageszähler, kein Gesamtzähler: Wer Samstag nicht spielt, verliert diese 3 — das ist der Grund,
  am Samstag *und* Sonntag reinzuschauen.
- **Jedes Ziel maximal einmal pro Krieg** (`WAR_MAX_PER_TARGET = 1`). 6 Angriffe auf 30 Ghosts →
  Zielwahl ist eine echte Entscheidung (leichtes Ziel für sichere Punkte vs. starkes Ziel für
  Performance-Bonus).
- **`startWarAttack(targetId)`** → liefert das Loadout und reserviert nichts. Das echte Match
  läuft im Spiel (`arena_pan.html`).
- **`resolveWarAttack(targetId, result)`** → verbucht die Punkte. `result = {win, stars, hpFrac}`.

**Punkteformel:**

| | Punkte |
|---|---|
| **Sieg** | `100 + 15 × stars(0..3) + round(15 × hpFrac)` → **100 … 160** |
| **Niederlage** | `20 + 5 × stars(0..3)` → **20 … 35** |

Auch eine Niederlage zahlt ein. Dieselbe Frust-Schutz-Philosophie wie überall im Projekt: Ein
Angriff, der 0 Punkte bringt, ist ein Angriff, den man nicht macht — und ein Clan, in dem die
schwächeren Mitglieder nicht angreifen, verliert erst richtig.

### 5.4 Deterministische Punkteverläufe beider Seiten

```
enemyTotal(frac) = floor( ENEMY_END(seed, week) · ease(frac) )
ourBotTotal(frac)= floor( (ENEMY_END − GAP(seed, week)) · ease(frac) )
GAP              = 250 + hash % 200                              // 250 … 449
ease(frac)       = frac^0.85                                      // vorne etwas steiler
```

Konsequenz und **Kern des Designs**: Ohne den Spieler verliert der eigene Clan um **GAP**
Punkte. Der Spieler hat 6 Angriffe à 20–160 Punkte, also **120–960** in der Hand. Drei Siege
(≈ 3 × 130 + 3 × 30 = 480) reichen sicher, ein Wochenende ohne Login verliert sicher.

**Der eigene Beitrag ist damit immer die entscheidende Größe** — genau die Botschaft, die ein
Clankrieg senden muss. Der Zufall (`GAP`) sorgt dafür, dass manche Wochen knapp sind, ohne dass
der Ausgang jemals *nur* Zufall ist.

### 5.5 Kriegsende: Truhe & Banner-Rahmen

**Kriegs-Truhe** (größer als die Wochen-Truhe, §3.3):

| Ausgang | Inhalt |
|---|---|
| **Sieg** | 1 × Gold-Pack · 15 000 🪙 · 140 ⚗ |
| **Niederlage** | 1 × Bronze-Pack · 3 000 🪙 · 25 ⚗ |

Die Niederlagen-Truhe existiert aus demselben Grund wie die Niederlagen-Punkte. Der Abstand
Sieg/Niederlage (5×) ist groß genug, dass Gewinnen zählt.

**Kosmetischer Banner-Rahmen** nach **Serien-Siegen** (`warStreak`):

| Rahmen | Ab Siegesserie |
|---|---|
| 🥉 Bronze-Rahmen | 1 |
| 🥈 Silber-Rahmen | 3 |
| 🥇 Gold-Rahmen | 6 |
| 💠 **Prisma-Rahmen** | 10 |

**Entscheidung: Der erreichte Rahmen wird nie wieder entfernt.** Eine Niederlage setzt die
*Serie* zurück (`warStreak = 0`), nicht den *Rahmen* (`warBadge` = höchster je erreichter). Ein
Kosmetikum wegzunehmen, das zehn gewonnene Wochenenden gekostet hat, ist die zuverlässigste Art,
einen Spieler zu verlieren. Die Serie bleibt als **zweite, verlierbare Zahl** im Clan-Header
sichtbar — das erzeugt die Spannung, ohne den Besitz anzutasten.

---

## 6) Leaderboard

Drei Ansichten über **einer** Population — nicht drei Datenquellen:

| Ansicht | Inhalt |
|---|---|
| **Global** | Top 100 nach Trophäen. Passt der Spieler nicht hinein, wird seine Zeile mit echtem Rang **angehängt**, damit die Ansicht nie ohne den Spieler dasteht. |
| **Clan** | die 30 Mitglieder, nach Trophäen sortiert |
| **Umgebung** | **±25 Ränge** um den Spieler (max 51 Zeilen) |

### 6.1 Population — und wie `arena_rivals.js` eingebunden ist

Die Vorgabe lautete, die **bestehende** Bot-Population zu nutzen statt eine zweite zu erfinden.
Das ist gemacht, mit einer **notwendigen Erweiterung**: `arena_rivals.js` hat **12 Rivalen** in
3 Trophäen-Bändern (`bandOf`: < 250 / < 700 / 700+). Für ein Top-100-Board mit einer Spitze bei
~9 800 🏆 reicht das nicht — 12 Einträge sind kein Board, und die Bänder decken nur die untere
Hälfte der Leiter ab.

**Umsetzung:**

1. `window.ArenaRivals.roster` wird gelesen, **wenn vorhanden** (kein harter Import, das Modul
   darf fehlen). Jeder der 12 Rivalen erhält einen deterministischen Trophäenwert **innerhalb
   seines eigenen Bandes** — Grubb bleibt Einsteiger, Thraxus bleibt Meister. Namen, Titel und
   Element kommen **unverändert** aus dem Roster; es gibt keine Doppelpflege.
2. Die restlichen Plätze füllt ein Generator im **gleichen Namensstil** (deutsch, zweiteilig,
   Vorname + Beiname) auf **300 Einträge** auf.
3. Trophäenkurve über die 300 Plätze:
   `t(r) = 150 + (9 800 − 150) · (1 − (r−1)/299)^3.2`
   Rang 1 = 9 800 (Prisma-Spitze aus `LEAGUE_GATES`), Rang 300 = 150. Der Exponent 3.2 erzeugt
   die typische Pyramide: die Spitze ist dünn, das Mittelfeld dicht.
4. Der Spieler wird mit `ArenaProfile.get().trophies` **einsortiert** und die Ränge werden neu
   gezählt. Bei den Demo-Werten (1 136 🏆) landet er bei ~Rang 150 — also mitten im
   „Umgebung"-Band, wo diese Ansicht ihren Sinn hat.

Dieselbe Population trägt alle drei Ansichten. Ein Server ersetzt sie durch echte Zeilen; die
Ansichten-Logik (Sortieren, Einsortieren, Fenstern) bleibt unverändert.

### 6.2 Warum ±25

Ein globales Top-100 ist für 99,9 % der Spieler **Deko** — man liest es einmal. Die
„Umgebung"-Ansicht ist die einzige, die eine **Handlung** auslösen kann („drei Siege und ich bin
über Lyra"). ±25 ist dabei bewusst breit: eine Sitzung mit 3–4 Siegen bewegt ~100 🏆 und damit
etwa 10–20 Ränge. Ein ±5-Fenster wäre nach einer Sitzung komplett ausgetauscht und würde nie
Wiedererkennung erzeugen.

---

## 7) Trennung ClanState ↔ ClanSim (die Server-Naht)

Die wichtigste Architekturentscheidung: **Die Bot-Schicht ist eine reine Funktion und
persistiert nichts.**

| | **ClanState** (persistiert) | **ClanSim** (berechnet) |
|---|---|---|
| Inhalt | Entscheidungen und Besitz **des Spielers**: Clan-Stammdaten, eigene Rolle, eigener Quest-Beitrag, eigene Anfrage, `donated` (eigene Spenden je Anfrage), eigene Kriegspunkte, eigene Notizen | alles über **andere**: 29 Mitspieler, deren Trophäen/Aktivität/Rollen, deren Anfragen, deren Quest-Beitrag, Gegnerclan + 30 Ghost-Builds, beide Kriegsverläufe, Leaderboard-Population, Bot-Feed |
| Speicherort | `localStorage["arenaClan"]` | nirgends — aus `clan.seed` + `weekKey` + `now` |
| Größe | wenige KB, konstant | 0 Byte |

**Der Austausch in Stufe 2** betrifft genau diese Funktionen — die öffentliche API bleibt
unberührt:

| ClanSim-Funktion | Server-Ersatz |
|---|---|
| `Sim.members(clan)` | `GET /clan/:id/members` |
| `Sim.requests(clan, now)` | `GET /clan/:id/requests` |
| `Sim.questContribution(clan, key, now)` | Summe über echte Mitgliedszähler |
| `Sim.enemyClan(clan, week)` | `GET /clan/:id/war` (echtes Clan-Matchmaking) |
| `Sim.ghostBuilds(enemy)` | gespeicherte Decks der Gegnermitglieder |
| `Sim.warTotals(clan, week, frac)` | echte Punktesummen beider Seiten |
| `Sim.feed(clan, now)` | `GET /clan/:id/feed` |
| `Sim.population(clan)` | `GET /leaderboard` |

Weil kein Bot-Zustand persistiert wird, gibt es beim Umschalten **keine Migration der
Bot-Daten** — der Simulationsanteil verschwindet einfach. Das ist der Grund für diese Trennung.

---

## 8) Emotes — und seit 30.07.2026 zusätzlich ein Chat

> **NACHTRAG 30.07.2026 (User-Vorgabe, überschreibt den Absatz „Begründung" unten).**
> Der Clan hat einen **Chat mit Freitext und Smiley-Auswahl** bekommen: Knopf „Chat" in der
> Clan-Ansicht → `#chatLayer` in `ui_prototype.html`. Er ist **rein lokal**
> (localStorage `arenaClanChat`, `{v:1, msgs:[…]}`) und **berührt `arena_clan.js` nicht** —
> das Modul kennt weiterhin nur Emotes. Die Nachrichten der Mitglieder sind **Demo-Daten**
> (`CHAT_DEMO`), und es gibt **bewusst keinen Bot, der auf den Spieler antwortet**;
> ein Hinweis im Fenster sagt das offen.
> Die Emotes bleiben unverändert bestehen (Clanhalle → Reiter „Aktivität"): sie schreiben in
> den **Feed**, der Chat in seinen **eigenen Verlauf**. Zwei Kanäle, zwei Zwecke.
> Die Moderationsfrage unten ist damit **nicht erledigt, sondern vertagt** — sie fällt an,
> sobald der Chat einen Server bekommt, und gehört dann in Stufe 2.

**Ursprünglicher Stand (Stufe 1): kein Freitext-Chat.** Sechs Preset-Sprüche mit Emoji, die im
Aktivitäts-Feed erscheinen:

| Key | Text | Emoji |
|---|---|---|
| `gl` | Viel Glück da draußen! | 🍀 |
| `thx` | Danke für die Spende! | 🙏 |
| `need` | Brauche Karten — schaut in die Anfragen! | 📥 |
| `war` | Alle Mann an die Angriffe! | ⚔ |
| `nice` | Starker Kampf! | 🔥 |
| `hi` | Willkommen im Clan! | 👋 |

**Begründung:** Freitext in einem Spiel, das Minderjährige erreicht, bedeutet Moderation,
Meldewege, Wortfilter und Rechtsrisiko — für Stufe 1 ein Vielfaches des Aufwands des restlichen
Clan-Systems. Presets liefern **90 % des sozialen Signals** („hier ist jemand, wir sind eine
Gruppe") bei **0 % Moderationslast** und sind zudem gratis in jede Sprache übersetzbar.
Ein Emote-Cooldown von 60 s verhindert Spam im Feed.

---

## 9) Formelübersicht (Quelle der Wahrheit für den Code)

```
REQUEST_SIZE           = 30        Bedarf einer Anfrage
DONATE_MAX_PER_REQUEST = 10        was EIN Spieler zu EINER Anfrage beiträgt
DONATE_PER_TAP         = 1         Karten je Sendevorgang
REQUEST_COOLDOWN_MS    = 5 h       zwischen zwei eigenen Anfragen
DONATED_KEEP           = 40        max. Einträge in donated (State-Deckel)
                                   (SEND_MAX / SEND_WINDOW_MS: am 30.07.2026
                                    ersatzlos entfallen, siehe §0.2 und §1)
DONATE_GOLD          = 25          Gold je gespendeter Karte
DONATE_MATERIAL      = 1           Material je gespendeter Karte (Sorte der Karte)
MAX_MEMBERS          = 30          Spieler + 29 Bots
MAX_ELDERS           = 5
EMOTE_COOLDOWN_MS    = 60 s

QUEST_GOALS          = { wins: 360, packs: 120,  trophies: 5400 }
BOT_WEEK_BASE        = { wins: 11,  packs: 3.7, trophies: 168  }   je Bot
QUEST_RATE           = 0.7 … 1.3   Jitter je (Woche, Quest, Bot), Mittel 1.0
CHEST_STEPS          = [ 0.50 Bronze, 0.80 Silber, 1.00 Gold ]

WAR_ATTACKS_PER_DAY  = 3           → 6 pro Wochenende
WAR_MAX_PER_TARGET   = 1
Siegpunkte           = 100 + 15·stars + round(15·hpFrac)      → 100 … 160
Niederlagenpunkte    =  20 +  5·stars                         →  20 …  35
WAR_GAP              = 250 + hash % 200                       → 250 … 449
WAR_BADGE_STEPS      = [ 1 Bronze, 3 Silber, 6 Gold, 10 Prisma ]  (nach Siegesserie)

Wochengrenze         = Montag 00:00 UTC
Sammelphase          = Mo–Fr        (Quests + Spenden)
Kriegsphase          = Sa–So        (Angriffe)
LB_POPULATION        = 300
LB_TOP               = 9800 🏆   LB_BOTTOM = 150 🏆   LB_EXP = 3.2
LB_AROUND            = ±25 Ränge
```

---

## 10) Offene Punkte (Stufe 2+)

1. **Serverseitige Buchung der Spenden.** Erledigt sich für das Sendekontingent seit dem
   30.07.2026 von selbst: es hängt an der Anfrage, nicht an der Uhr, und ist durch Verstellen
   der Gerätezeit **nicht** mehr zu umgehen. Offen bleibt die Abklingzeit für eine EIGENE
   Anfrage (`REQUEST_COOLDOWN_MS`, 5 h) — die hängt weiter an der Gerätezeit und ist erst
   dicht, wenn der Server `lastRequestTs` setzt. Ebenso offen: `donated` liegt lokal, ein
   echter Server führt es je Mitglied.
2. **`ArenaCards` hat keine Entnahme-API.** `donateCards()` zieht Kopien über
   `get()` → mutieren → `_write()` ab. Sauberer wäre ein `ArenaCards.removeDrop(id, tier, n)`
   mit derselben Normalisierung wie `addDrop()`. Bewusst **nicht** in diesem Schritt ergänzt, um
   `arena_cards.js` (Migrationen, 1 400 Zeilen Selbsttest) nicht anzufassen.
3. **Beitritts-Workflow.** `joinMode:"request"` ist Datenfeld ohne Prozess. Bewerbungsliste,
   Annehmen/Ablehnen und Kick/Beförderung brauchen einen Server.
4. **Clan-Suche und Wechsel.** Stufe 1 kennt einen Clan: den eigenen. Clan-Browser,
   Beitrittsanfragen und eine Wechsel-Sperre (üblich: 24 h) folgen mit Stufe 2.
5. **Clan-Leaderboard.** Ranglisten *von Clans* (nach Kriegssiegen / Trophäen-Schnitt) fehlen —
   erst mit echten Clans sinnvoll.
6. **Kriegs-Verteidigung.** Das eigene Loadout wird derzeit nicht als Ghost exportiert. Sobald
   Clan A gegen Clan B echt gepaart wird, muss das eigene Deck als Verteidigungs-Snapshot
   gespeichert werden.
7. **Anti-Kollusion.** Zwei Spieler könnten sich wechselseitig gegenseitig maximal bespenden.
   Bei ausschließlich grauen Kopien ist der Schaden gering (§0.1), aber ein Server sollte
   Spendenpaare mit auffälliger Gegenseitigkeit protokollieren.
8. **Push-Benachrichtigungen.** „Deine Anfrage ist erfüllt" und „Kriegsphase startet" sind die
   beiden Ereignisse, die einen Push rechtfertigen. Braucht die App-Hülle.
