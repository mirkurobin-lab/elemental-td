# Elemental TD — Creature Design (enemy waves)

How the **enemy creeps that march along the path** should look, element by element.
This is the design spec only — wave creeps are currently drawn procedurally in
`game.js` (`drawCreep` + `waveLook`); the `assets/mon_*.png` sprites belong to the
separate "recruit your own army" feature, **not** to these waves.

## How waves & elements work (from the code)

- **50 waves per level**, **10 levels** → **500 waves** total (`WAVES_PER_LEVEL`, `CAMPAIGN_LEVELS`).
- 6 elements cycle each level, order shifts per level (`WAVE_ELEMENTS`, `makeWave`):
  **🔥 Fire › ✨ Light › 🌿 Nature › 🌑 Darkness › 💧 Water › ⛰️ Earth**.
- Counter-cycle (`STRONG`): **Light › Darkness › Water › Fire › Nature › Earth › Light** —
  a creep takes bonus damage from the element BEFORE it, near-immune to the one AFTER it.
- **Per level:** each element appears **≈ 8 waves** (two of them 9).
- **Whole campaign:** **≈ 83–84 waves per element** (🔥/✨ ≈ 84, others ≈ 83).

Each wave also has an **archetype** (`makeWave`, by wave index):

| Archetype  | When (per level)        | Behaviour            | Silhouette rule |
|------------|-------------------------|----------------------|-----------------|
| normal     | base waves              | balanced grunt       | medium, upright |
| fast       | every 4th               | quick, fragile       | small, lean, forward-leaning, motion trail |
| swarm      | every 4th               | many tiny, weak      | tiny, drawn in clusters |
| armored    | every 4th               | slow tank, high HP   | large, hunched, plated shell |
| eliteboss  | waves 10/20/30/40       | pack of 7 stronger   | large, spiky crown |
| bigboss    | waves 25 & 50           | one huge unique      | huge, rotating elemental aura ring |

## The model — HYBRID (chosen)

**Creature = element × archetype**, with a **visual escalation rank** layered on top so a
repeated element keeps feeling fresh through a level (matches "fire wave → imps, later →
demons → dragon").

### STYLE FORMULA (locked — insert byte-identical into every creature prompt)

> Painterly semi-stylized mobile fantasy game art, rich digital painting with soft
> volumetric glow and crisp highlights; bold rounded chunky creature silhouettes with
> subtle dark outlines and clear readable shapes; each creature colored to its element —
> fire molten red-orange, water icy cyan-blue, nature verdant green, earth ochre
> stone-brown, light radiant gold-white, darkness violet-shadow — with its elemental
> energy as the glowing signal hue, plus small contrasting accent details (eyes, teeth,
> claws, gems, runic markings) in a complementary pop color, creatures popping against the
> backdrop; dramatic elemental rim-light, dark moody atmosphere, epic yet playful; high
> contrast, clean readable silhouettes, consistent three-quarter front-facing view across
> all creatures.

Generation: model `nano_banana_2`, `1k`, AR `1:1`. Prompt = sprite template + 3-4 word
description + STYLE FORMULA (verbatim) + sprite suffix on a key-color background
(magenta `#FF00FF`; green `#00FF00` for darkness/violet creatures), to be keyed to
transparency before use. Approved sample look: fire imp / fire demon hound / fire dragon /
ice golem.

### Element visual language (palette from `ELEMENT`, FX from the signature attack `PURE`)

| Element     | Core color | Glow      | Motif & FX (tie to its attack)                  |
|-------------|-----------|-----------|--------------------------------------------------|
| 🔥 Fire     | `#ff6b3d` | `#ff3d00` | charred skin, ember cracks, small burst on death (burn/splash) |
| 💧 Water    | `#3dc8ff` | `#0090ff` | translucent/icy, frost trail, leaves a chill puff (slow) |
| 🌿 Nature   | `#46c46a` | `#11a34a` | mossy/chitinous, spore puffs, poison drip (DoT) |
| ⛰️ Earth    | `#e0a43c` | `#b97417` | rocky plates, dust kick, heavy stomp (big splash) |
| ✨ Light    | `#ffe36b` | `#fff7d6` | radiant, bloom halo, fast shimmering motion (rapid/long range) |
| 🌑 Darkness | `#9b6bff` | `#5e2bd6` | shadowy/wraithlike, purple smoke, curse aura (amplify) |

### Escalation ranks (within one 50-wave level)

The **same** archetype creature visually grows/darkens as the level advances — no new art,
just systematic modifiers:

| Rank        | Waves   | Modifiers on the base design |
|-------------|---------|------------------------------|
| I — Lesser  | 1–16    | base size, muted aura, simple shape |
| II — Greater| 17–33   | +15% size, brighter aura, +1 horn/spike pair, eyes start to glow |
| III — Dread | 34–50   | +30% size, intense aura + particles, cracked/charred surface, fully glowing eyes, secondary element FX trail |

So a single fire archetype reads as: **Ember Imp (I) → Greater Imp (II) → Charred Demon (III)**.
Bosses (elite/big) already sit visually above this scale.

## Full roster (6 × 6)

Names are flavor; the **(I→II→III)** escalation applies to every cell.

| Element | normal | fast | swarm | armored | eliteboss | bigboss |
|---------|--------|------|-------|---------|-----------|---------|
| 🔥 **Fire** | **Ember Imp** — little horned imp, ember cracks | **Cinder Sprite** — darting flame-wisp, trail | **Spark Swarm** — cluster of flying coals | **Magma Golem** — cracked lava-rock brute | **Hellhound Pack** — horned fire-hounds (×7) | **Infernal Dragon** — winged molten dragon |
| ✨ **Light** | **Lumen Acolyte** — robed glowing figure | **Glimmer Wisp** — fast streak of light | **Mote Swarm** — drifting fireflies | **Sun Sentinel** — golden shielded guard | **Seraph Knights** — winged blade-knights (×7) | **Radiant Archon** — towering winged archon |
| 🌿 **Nature** | **Sprout Goblin** — leafy little goblin | **Vine Stalker** — whipping vine-creature | **Spore Swarm** — cloud of spores/beetles | **Bark Treant** — armored mossy treant | **Thorn Beasts** — bramble-covered beasts (×7) | **Ancient Worldtree** — colossal walking tree |
| 🌑 **Darkness** | **Shade Crawler** — low shadow figure | **Wraith** — fast translucent ghost | **Bat Swarm** — flock of nightlings | **Bone Knight** — plated undead knight | **Void Reapers** — scythe-wielding reapers (×7) | **Void Titan** — abyssal many-eyed colossus |
| 💧 **Water** | **Tide Spawn** — slimy water-imp | **Frost Whelp** — quick icy serpent | **Slush Swarm** — shards / ice-leeches | **Frost Bulwark** — armored ice-golem | **Leviathan Guard** — finned tank-beasts (×7) | **Glacier Kraken** — huge tentacled ice-kraken |
| ⛰️ **Earth** | **Pebble Grunt** — squat stone grunt | **Dust Runner** — fast dust-devil | **Gravel Swarm** — scuttling scarabs | **Boulder Golem** — massive rolling boulder-beast | **Stone Wardens** — monolithic guardians (×7) | **Mountain Colossus** — mountain-sized titan |

## Implementation notes (for whoever codes it later)

- Hook point: `waveLook(seed)` / `drawCreep(cr)` and `spawnCreep` in `game.js`.
- A creep already knows `element`, `kind` (archetype), `boss/elite/bigboss`, and `w.n`
  (wave index) — that's everything needed to pick **element × archetype × rank**.
- Rank from wave index: `n<=16 → I`, `n<=33 → II`, else `III`.
- Keep readability first: **silhouette = archetype**, **color = element**, **rank = intensity**.
- If moving from procedural shapes to sprites: 36 base sprites + 3 rank modifiers
  (recolor/scale/overlay), not 108 separate arts.
</content>
</invoke>
