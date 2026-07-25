# Monetarisierung: Kristalltresor, Angebotskette & Analytics

**Status:** Design-Spezifikation **v1**, implementiert in
`arena_patches/arena_vault.js` (Tresor + Angebote) und
`arena_patches/arena_telemetry.js` (Analytics), beide mit Selbsttest via `node <datei>`.
Sichtbar in `arena_patches/ui_prototype.html` (Home-Widget, Shop-Abschnitt, Angebots-Popup).
Alle Zahlen hier sind die **Quelle der Wahrheit** für die Module — Änderungen hier **und** dort
nachziehen.

**Verwandte Dokumente:** `DESIGN_PROGRESSION.md` (Karten, Packs, Festung),
`DESIGN_CLAN.md` (Clan, Spenden, Krieg), `GAMEPLAY_OPTIMIERUNG.md` (Match-Mechanik).

> ### ⚠ KEIN ECHTER ZAHLUNGSVORGANG
> `ArenaVault.open()` und `ArenaVault.claimOffer()` sind **IAP-Platzhalter**. Sie geben Preis und
> Inhalt zurück, buchen die Spielwährung und setzen `placeholder: true` — sie lösen **keine**
> Zahlung aus. Die Store-Anbindung (Apple/Google) gehört in die App-Hülle, nicht in ein
> Logik-Modul. Diese Trennung ist Absicht: Der komplette Angebots-Fluss ist damit ohne
> Store-Konto testbar, und der Prototyp kann niemandem Geld abbuchen.

---

## A) Die Leitplanken

Bevor eine einzige Zahl festgelegt wird, drei Regeln, die alles Folgende begrenzen:

1. **Nichts, was man kauft, ist exklusiv.** Jede Karte, jedes Material, jedes Gold aus einem
   Angebot ist auch erspielbar. Gekauft wird **Zeit**, nie **Zugang**. Das ist dieselbe Regel,
   die in `DESIGN_CLAN.md` §0 die Sendemechanik auf graue Basis-Kopien beschränkt.
2. **Kein Angebot unterbricht ein Match.** Popups erscheinen im Hub, nie im Spiel und nie im
   Ergebnis-Bildschirm der ersten drei Sekunden.
3. **Jedes Angebot hat einen Grund, genau jetzt zu erscheinen.** Ein Angebot, das nur am
   Kalender hängt, ist Werbung. Ein Angebot, das an einem *Erlebnis* hängt (Aufstieg,
   Pechsträhne, verstandenes Spiel), ist ein Service. Die ganze Kette in §C ist nach diesem
   Prinzip gebaut.

**Warum überhaupt ein Tresor und keine Gem-Pakete?** Weil ein Gem-Paket die Frage stellt
„möchtest du Gems kaufen?" — und die Antwort ist bei 95 % der Spieler nein. Der Tresor stellt
eine andere Frage: **„möchtest du deine bereits erspielten Gems?"** Der Spieler hat sie über
Wochen sichtbar selbst verdient; der Kauf fühlt sich wie ein Abholen an, nicht wie ein Ausgeben.

---

## B) Kristalltresor (Piggy Bank)

### B.1 Füllung

Jeder **Sieg** legt Bonus-Gems in den Tresor. Die Menge staffelt nach Arena-Stufe:

| Arena | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| 🏆 ab | 0 | 300 | 600 | 900 | 1 200 | 1 500 | 2 000 | 2 500 |
| Gems/Sieg | **2** | **2** | **3** | **3** | **4** | **4** | **5** | **5** |

Formel: `2 + round(arenaIndex × 3 / 7)`, also linear von 2 auf 5.

**Bewusst ohne Zufall.** Ein schwankender Zuwachs macht den Tresor unlesbar („wie lange noch?")
und lädt zum Nachrechnen ein. Die Anzeige nennt deshalb immer eine exakte Zahl:
**„noch 34 Siege"** (`vault().winsLeft`).

### B.2 Kapazität und Preis

Nach jeder Öffnung steigt die Kapazität eine Stufe. **Der Preis je Gem sinkt dabei streng
monoton** — wer dranbleibt, wird besser behandelt:

| Stufe | Kapazität | Preis | ct je Gem | Siege bis voll (Arena 4) |
|---|---|---|---|---|
| 0 | 150 | **4,99 €** | 3,33 | 50 |
| 1 | 300 | **9,49 €** | 3,16 | 100 |
| 2 | 600 | **17,99 €** | 3,00 | 200 |
| 3 | 1 200 | **32,99 €** | 2,75 | 400 |
| 4 (Max) | 2 400 | **59,99 €** | 2,50 | 800 |

Die monoton fallende ct/Gem-Kurve ist **im Selbsttest geprüft**. Das ist keine Kosmetik: Eine
Staffel, bei der eine höhere Stufe relativ *teurer* wird, ist der klassische Vertrauensbruch —
Spieler rechnen das nach und posten es.

**Größenordnung.** 4,99 € entsprechen 150 Gems ≈ dem Gegenwert eines halben Season-Pass
(950 Gems). Der Tresor ist damit der **günstigste Einstiegspunkt** der ganzen Ökonomie und
bewusst so gebaut: Er ist der erste Kauf, nicht der große.

### B.3 Verhalten

- **Nur ganz zu öffnen.** Es gibt kein Teil-Abholen — genau das erzeugt den Sammeldruck.
- **Läuft nie über.** Bei erreichter Kapazität hört die Füllung auf. Das ist der eigentliche
  Kaufimpuls: Jeder weitere Sieg fühlt sich nach verschenkten Gems an.
- **`vault_full` wird genau EINMAL je Füllung an die Telemetrie gemeldet** (§E). Die Kennzahl
  „wie oft läuft ein Tresor voll, ohne geöffnet zu werden?" ist die wichtigste Zahl dieses
  Systems: Ist sie hoch, ist der Preis falsch, nicht das Feature.
- **Voll = fetter Glow + Badge** im UI (Home-Widget und Shop-Abschnitt).

---

## C) Angebotskette

Drei kontextuelle Zeit-Angebote. Jedes hängt an einem **Erlebnis**, keines am Kalender.

| Angebot | Auslöser | Fenster | Preis | Inhalt |
|---|---|---|---|---|
| 🌟 **Starter-Bundle** | nach dem **3. Sieg**, einmalig pro Konto | 48 h | **2,99 €** | 300 💎 · 15 000 🪙 · 40 ⚗ · 1 Silber-Pack |
| ⬆ **Aufstiegs-Angebot** | **24 h nach jedem neuen Arena-Tier** | 24 h | **4,99 / 9,99 / 19,99 €** (Band) | skaliert, Basis 500 💎 · 25 000 🪙 · 60 ⚗ · 1 Gold-Pack |
| 🛡 **Comeback-Angebot** | nach **3 Niederlagen in Folge** | 12 h | **1,99 €** | 120 💎 · 8 000 🪙 · 20 ⚗ · 1 Bronze-Pack |

### C.1 Warum genau diese drei

- **Starter nach dem 3. Sieg, nicht beim ersten Start.** Ein Angebot vor dem ersten Erfolg
  verkauft an jemanden, der das Spiel noch nicht kennt — das ist die Hauptursache für
  Erstattungen und Ein-Stern-Bewertungen. Nach drei Siegen weiß der Spieler, was er kauft.
  **Einmalig pro Konto**, auch nach Ablauf: Ein „einmaliges" Angebot, das wiederkommt, ist eine
  Lüge, und Spieler merken sie beim zweiten Mal.
- **Aufstieg, weil dort der Bedarf entsteht.** Im Moment des Arena-Aufstiegs ist die Bindung am
  höchsten *und* der nächste Engpass (stärkere Karten) gerade sichtbar geworden. Der Inhalt
  **skaliert mit der erreichten Arena** (`arenaScale(t) = 1 + 0,17 t`, also ×1,0 … ×2,19) —
  sonst ist dasselbe Paket in Arena 7 ein Witz und in Arena 2 ein Balancing-Bruch.
- **Comeback ist Frust-Schutz, kein Verkaufsdruck.** Nach drei Niederlagen in Folge ist der
  wahrscheinlichste nächste Schritt, die App zu schließen. Das **günstigste** Paket der ganzen
  Kette (1,99 €) mit dem **kürzesten** Fenster (12 h) ist hier ein Angebot *und* ein Signal:
  „wir haben gesehen, dass es gerade nicht läuft." Dieselbe Haltung wie `T_LOSS = −10` gegen
  `T_WIN = +30` in `arena_profile.js` und wie die Niederlagen-Punkte im Clankrieg.

### C.2 Regeln, die im Code stehen

| Regel | Umsetzung |
|---|---|
| Ein laufendes Angebot wird **nie verlängert** | `trigger()` bricht ab, solange das alte Fenster läuft — sonst gibt es einen „Countdown, der nie abläuft" |
| Einmalige Angebote kommen **nie** wieder | `once: true` + Existenzprüfung, unabhängig von Ablauf und Nutzung |
| Der Aufstieg feuert **nur bei echtem Aufstieg** | Der allererste bekannte Arena-Wert setzt nur den Referenzstand; ein Abstieg löst nichts aus |
| Höchstens **ein** Popup | `best()` liefert das am kürzesten laufende, noch nicht gezeigte Angebot — was am ehesten verloren geht, kommt zuerst |
| Gezeigt = erledigt | `markShown()` nimmt das Angebot aus dem Popup-Kandidatenkreis; es bleibt im Shop-Slot sichtbar |
| Wegwischen ist endgültig | `dismiss()` setzt `hidden` — das Angebot drängt sich kein zweites Mal auf |

### C.3 Ereignis-Naht

Identisch zu `ArenaClan`, `ArenaPass` und `ArenaDaily` — das Spiel ruft **eine** Zeile je Ereignis
und alle Systeme hängen dran:

```js
ArenaVault.reportEvent("win",   1);              // Tresor + Starter-Trigger
ArenaVault.reportEvent("loss",  1);              // Comeback-Trigger
ArenaVault.reportEvent("arena", neuerTierIndex); // Aufstiegs-Trigger
```

---

## D) Täglicher Loop (`arena_daily.js`)

Gehört fachlich zur Retention, nicht zur Monetarisierung — hier nur die Eckwerte, damit alle
Zahlen an einer Stelle stehen. Details im Modulkopf.

| Baustein | Regel |
|---|---|
| **3 Tagesquests** | aus einem Pool von 6, Auswahl deterministisch aus dem Tagesindex, Reset **00:00 UTC** |
| Quest-Belohnung | 800–1 500 🪙 + 5–10 ⚗ je Quest |
| **Bonus-Truhe bei 3/3** | 3 000 🪙 · 20 ⚗ · 1 Silber-Pack — größer als jede Einzelquest, sonst hört man bei 2/3 auf |
| **Siegesserie** | Gold-Multiplikator 1,00 → 1,50 (ab dem **2.** Sieg, Deckel bei 6). Niederlage setzt zurück, der **Tageswechsel nicht** — die Serie hängt an Matches, nicht am Kalender |
| **Gratis-Pack** | alle **4 h** ein Bronze-Pack, maximal **2 gestapelt** |

Der Pack-Deckel ist als **Ansammlungs-Anker** implementiert (`packBase`), nicht als Zähler:
verfügbar ist `floor((now − packBase) / 4 h)`, gekappt bei 2. Der Deckel ist damit eine
Eigenschaft der Formel und keine Prüfung, die man vergessen kann. Beim Abholen wandert der Anker
um genau ein Intervall — angefangener Fortschritt geht nie verloren.

### D.1 Daily-Login — der 7-Tage-Kalender

> **User-Vorgabe, wörtlich:** *„Daily Login Belohnungen mit Truhen wir brauchen aber mit
> boosterpacks"*

Das Referenzspiel hängt **Truhen** in den Login-Kalender. Bei uns sind die Anker **Booster-Packs**
— Truhen gehören im Projekt zum Clan (`ArenaClan`, Wochen- und Kriegstruhe) und zur
Tagesquest-Belohnung. Ein dritter Truhentyp im Login würde die Belohnungssprache verwässern:
*Truhe = Gruppenleistung, Pack = individueller Ziehmoment.* Der Login ist ein individueller
Moment, also ein Pack.

| Tag | Belohnung | Kachel |
|---|---|---|
| 1 | **1 200 🪙** | Gold |
| 2 | **12 ⚗** | Material |
| 3 | **Bronze-Pack** | 🎁 Anker 1 |
| 4 | **2 500 🪙** | Gold |
| 5 | **Silber-Pack** | 🎁 Anker 2 |
| 6 | **60 💎** | Gems |
| 7 | **GOLD-PACK + 5 000 🪙** | 🏆 **Finale**, festliche Kachel |

**Wochensumme:** 8 700 🪙 · 12 ⚗ · 60 💎 · Bronze + Silber + **Gold-Pack**.

**Warum die Kurve so aussieht.** Die drei Packs stehen auf 3 / 5 / 7 — nicht auf 1 / 4 / 7.
Der erste Tag muss *sofort* etwas geben (Gold, sichtbar in der Top-Bar), aber der erste
*Ziehmoment* darf ruhig zwei Tage kosten: Ein Pack an Tag 1 verschenkt den einzigen Hebel, den
ein Kalender hat — die Vorfreude auf die nächste Kachel. Tag 6 (Gems) ist bewusst die
Vorstufe zum Finale: Gems sind die Premium-Währung, und wer sie an Tag 6 bekommt, sieht am
Tag 7 hin.

**Der Gold-Pack an Tag 7** ist die größte kostenlose Ziehung der Woche (9 Karten, mindestens
eine Epische). Das ist Absicht und der Grund, warum der Kalender überhaupt trägt. Im Verhältnis
zur restlichen Ökonomie bleibt er maßvoll: Die drei Tagesquests liefern zusammen ~3 400 🪙 pro
Tag, also ~23 800 🪙 pro Woche — der Login-Kalender legt mit 8 700 🪙 rund **37 %** obendrauf,
nicht ein Vielfaches.

#### Kein Streak — und warum das die härtere Entscheidung ist

Der Kalender rückt **ausschließlich beim Abholen** vor. Wer drei Tage fehlt, macht danach bei
derselben Kachel weiter; es gibt **keinen Rückfall auf Tag 1**.

Das ist bewusst gegen das Genre-Muster entschieden:

* Die **Härte des täglichen Loops sitzt bereits im Siegesserien-Bonus** (`STREAK_MUL`, 1,00 →
  1,50). Dort ist sie *verdient*, weil sie an Leistung hängt und nicht an Anwesenheit.
* Ein Login-Kalender, der Abwesenheit bestraft, erzeugt **schlechtes Gewissen statt Vorfreude**.
  Der Spieler, den man damit erreicht, ist der, der ohnehin täglich spielt; der, den man
  verliert, ist der Rückkehrer nach einer Woche Pause — also genau der, den man will.
* Ein Geschenk mit Strafmechanik ist **kein Geschenk mehr**. Der Kalender ist die einzige
  Stelle im ganzen Spiel, an der es etwas für nichts gibt. Diese Rolle soll er behalten.

Technisch: `login: { step, cycle, lastDay, claims }` in `arenaDaily` (State **v3**). `step` ist
der Index der nächsten Kachel, `lastDay` der Tagesschlüssel der letzten Abholung — daraus folgen
sowohl die Doppelabhol-Sperre als auch der fehlende Streak, ohne einen einzigen zusätzlichen
Zähler. Nach Tag 7 wird `step` auf 0 gesetzt und `cycle` erhöht; die Belohnungen wiederholen
sich (eskalierende Zyklen: siehe §F).

---

## E) Analytics (`arena_telemetry.js`)

### E.1 Was das Modul ist — und was nicht

Ein **Ringpuffer** im `localStorage` (Kappe **500** Ereignisse) plus `console.debug`. **Kein
Netzwerk, keine URL, kein Key.** Der spätere echte Endpunkt wird über einen Callback eingehängt:

```js
ArenaTelemetry.onFlush(function (batch) {
  return fetch("/t", { method: "POST", body: JSON.stringify(batch) })
    .then(function (r) { return r.ok; });
});
```

`flush()` leert den Puffer **nur bei bestätigtem Erfolg** (`true`). Ein fehlgeschlagener oder
werfender Upload verliert kein einziges Ereignis — im Selbsttest geprüft.

### E.2 Event-Schema

Jedes Ereignis ist ein flaches Objekt:

```
{ e: "<name>", t: <ms UTC>, n: <laufende Nummer>, s: "<session>", p?: { … } }
```

| Feld | Bedeutung |
|---|---|
| `e` | Ereignisname aus dem Katalog unten |
| `t` | Zeitstempel in Millisekunden |
| `n` | fortlaufende Nummer je Installation — macht Lücken durch Puffer-Überlauf sichtbar |
| `s` | Session-ID: **reine Zufallszahl** pro Modul-Ladung, ohne Geräte- oder Kontobezug |
| `p` | bis zu 8 Eigenschaften, nur `number` / `boolean` / `string` |

### E.3 Der Trichter

| # | Ereignis | einmalig | Beantwortet |
|---|---|---|---|
| 1 | `tutorial_step` | nein | Wo bricht das Onboarding ab? |
| 2 | `first_win` | **ja** | Wie viele erreichen überhaupt den ersten Sieg? |
| 3 | `pack_opened` | nein | Wird der Kern-Belohnungsmoment erreicht? |
| 4 | `first_merge` | **ja** | Hat der Spieler das Merge-System *verstanden*? |
| 5 | `arena_up` | nein | Läuft die Trophäenkurve? |
| 6 | `offer_shown` | nein | Wird die Angebotskette überhaupt ausgelöst? |
| 7 | `offer_clicked` | nein | Konversion je Angebotstyp |
| 8 | `vault_full` | nein | Wie oft läuft ein Tresor voll, **ohne** geöffnet zu werden? |
| 9 | `daily_complete` | nein | Trägt der tägliche Loop? |
| 10 | `clan_joined` | **ja** | Ist das Sozialsystem lebendig? |
| 11 | `donation_sent` | nein | Wird im Clan wirklich geholfen? |

`once: true` heißt: pro Installation genau einmal. Ein „first_win", das bei jedem Sieg feuert,
ist kein Trichterschritt mehr, sondern Rauschen.

**Unbekannte Ereignisnamen werden aufgezeichnet und mit `unknown: true` markiert**, nicht
verworfen — ein Tippfehler im Aufruf soll in den Zahlen auffallen und nicht lautlos verschwinden.

### E.4 Kein PII — im Code durchgesetzt

Nicht als Versprechen, sondern als Filter (`_sanitize`, im Selbsttest geprüft):

| Regel | Umsetzung |
|---|---|
| Nur primitive Werte | Objekte, Arrays, Funktionen und `null` werden **verworfen** — sie könnten beliebige Daten mitschleppen |
| Strings gekappt | max. **40** Zeichen je Wert, **24** je Schlüsselname |
| Höchstens 8 Eigenschaften | alles darüber fällt weg |
| PII-Schlüssel verboten | **Teilstring**-Prüfung gegen `name, mail, phone, tel, address, adresse, ip, user, device, geo, lat, lon, gps, uuid, token, password, passwort, birth, geb` — damit fallen auch `userName`, `deviceId` und `geoLat` heraus |
| Verworfenes wird gezählt | `stats().dropped` — stille Filterung wäre genauso schlecht wie keine |

**Verworfen statt maskiert:** Was nie in den Puffer kommt, kann auch nicht durch einen späteren
Bug oder einen Export leaken. Es gibt bewusst **keine** Geräte-, Konto- oder Standortfelder im
Schema — auch nicht optionale.

---

## F) Offene Punkte

1. **Echte Store-Anbindung.** `placeholder: true` muss durch ein Kaufergebnis aus der App-Hülle
   ersetzt werden; erst dann darf `open()` / `claimOffer()` buchen. Serverseitige
   Beleg-Validierung ist Pflicht, sonst ist der Tresor per Client-Manipulation gratis.
2. **Serverseitige Zeit.** Alle Fenster (Tresor-Füllung, Angebotslaufzeit, Daily-Reset) hängen in
   Stufe 1 an der Gerätezeit.
3. **Preisregionalisierung.** Die Beträge sind EUR-Ankerpreise; Store-Preisstufen je Land fehlen.
4. **A/B-Rahmen.** Die Angebotskette hat noch keinen Varianten-Schalter. Ohne ihn ist jede
   Preisänderung eine Behauptung.
5. **Ausgabenschutz.** Kein Tages-/Monatslimit, keine Eltern-Freigabe, kein Hinweis auf
   kumulierte Ausgaben. Vor einem Store-Release nicht verhandelbar.
6. **Telemetrie-Einwilligung.** Der Puffer ist lokal und PII-frei, ein Upload braucht trotzdem
   eine Einwilligung samt Opt-out in den Einstellungen.
7. **Angebots-Ermüdung.** Es gibt keine Obergrenze für Angebote pro Woche. Sobald echte Zahlen
   vorliegen (`offer_shown` vs. `offer_clicked`), gehört eine Deckelung dazu.
8. **Eskalierende Login-Zyklen.** Zyklus 2 vergibt heute dieselben sieben Belohnungen wie
   Zyklus 1. Üblich wäre eine leichte Steigerung ab Zyklus 3 (z. B. Arkan-Pack an Tag 7).
   Bewusst offen gelassen, bis echte Retentionszahlen zeigen, wie viele Spieler den zweiten
   Zyklus überhaupt erreichen — vorher ist jede Steigerung geraten.
9. **Offline-Earnings** (Beobachtung aus dem Referenzvideo). Als Vorschlag dokumentiert in
   `GAMEPLAY_OPTIMIERUNG.md` §10, bewusst **nicht gebaut**.
