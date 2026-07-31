# Elemental TD

> ## ▶ Die komplette Meta-UI liegt bereit — `arena_patches/UI_UEBERGABE.md`
>
> **Stand 31.07.2026.** Die fertige Oberfläche (Startseite, Shop, Sammlung, Schmiede,
> Packs, Festung, Clan, Rangliste, Pass, Helden, Events, Post, Freunde, Einstellungen,
> Community, Guide) liegt vollständig unter `arena_patches/` — eine Datei, 17 Module,
> 238 lokale Assets, kein Build und kein Server.
>
> **Wer die UI ins Spiel zieht, liest zuerst `arena_patches/UI_UEBERGABE.md`.** Dort
> steht, was zusammengehört, wie man es startet, was die Playwright-Suiten abdecken (30 von 32 grün — zwei brauchen eine erreichbare Vorschau-URL),
> **neun Regeln, die beim Einbau nicht gebrochen werden dürfen**, und was offen bleibt.
>
> Wahrheitsquelle für jede Gestaltungsfrage ist `arena_patches/AA_UI_REFERENZ.md`.


A mobile tower-defense game — master the six elements across a 10-level campaign, fight Tower Wars, run idle mines, recruit a monster army, and buy permanent Powers. Installable as an app (PWA) on iPhone & Android.

**Play:** open this repo's GitHub Pages URL on your phone, then "Add to Home Screen".

Single-file canvas game: `index.html` + `game.js` + `strings.js` + `assets/`. PWA via `manifest.json` + `service-worker.js`.
