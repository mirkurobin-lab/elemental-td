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

## Generated sprite manifest (Higgsfield nano_banana_2, 1k, 1:1)

Full 6×6 roster generated on the locked STYLE FORMULA. Sprites are on a key-color
background (magenta, or green for darkness) — key to transparency before wiring in.
Reference each by its Higgsfield job id.

| Element | Archetype | Name | Description | Job id |
|---|---|---|---|---|
| 🔥 Fire | normal | Ember Imp | small horned fire imp | `5fae45e8-d5d6-4847-a2b7-f417f9d0c816` |
| 🔥 Fire | fast | Cinder Sprite | darting fiery flame sprite | `3b7481fc-8c14-4573-a186-600a144e7748` |
| 🔥 Fire | swarm | Spark Swarm | small flying ember bat | `1fd76db3-1ca0-4c30-990a-a9e84fd427d6` |
| 🔥 Fire | armored | Magma Golem | cracked molten lava golem | `d13f0f11-2625-4a90-9621-b3a14947edb8` |
| 🔥 Fire | eliteboss | Hellhound | fierce fire demon hound | `b9ae26e0-ad4f-4075-b0fd-e3bc8573b3c9` |
| 🔥 Fire | bigboss | Infernal Dragon | winged molten fire dragon | `ad410b8f-e0f5-427a-83f9-f046a620d7a5` |
| ✨ Light | normal | Lumen Acolyte | glowing robed acolyte | `f7002859-b63a-4c8f-a10e-484a2c192408` |
| ✨ Light | fast | Glimmer Wisp | single radiant light creature | `97cc7e42-b44a-4486-bc9b-7e75933b0e9d` |
| ✨ Light | swarm | Mote Swarm | running swarm of light wisps | `4ec880f9-9b7a-4630-8446-214face57ca1` |
| ✨ Light | armored | Sun Sentinel | golden shielded sentinel | `b088ce47-16f1-453d-9e29-0311cabbe23e` |
| ✨ Light | eliteboss | Seraph Knight | winged radiant seraph knight | `638e931d-7ae6-42a7-99dc-9d19e70b5a86` |
| ✨ Light | bigboss | Radiant Archon | towering winged archon | `ace4a98c-a66e-4ba2-abc0-12028497b581` |
| 🌿 Nature | normal | Sprout Goblin | leafy little nature goblin | `d3abd465-3e8c-472e-9723-1271cb2e7274` |
| 🌿 Nature | fast | Vine Stalker | fast whipping vine creature | `b26ce3ff-a754-4ff0-9d0e-c9d86b182315` |
| 🌿 Nature | swarm | Spore Swarm | small nature spore beetle | `d49d7612-8f22-48f0-8452-a2f14b95479c` |
| 🌿 Nature | armored | Bark Treant | armored mossy bark treant | `3b47dc33-be76-4fc8-8ea0-888f1a84e40a` |
| 🌿 Nature | eliteboss | Thorn Beast | bramble thorn beast | `2f7c8d38-42df-4fc9-b666-6312e6c20f95` |
| 🌿 Nature | bigboss | Ancient Worldtree | colossal ancient walking tree | `fca35da8-c945-4420-8935-2af9639d58b0` |
| 🌑 Darkness | normal | Shade Crawler | low shadow crawler | `1fb0c58e-7414-4bb1-bbfb-af760f576380` |
| 🌑 Darkness | fast | Wraith | fast translucent shadow wraith | `27fec870-359f-4e77-885d-5edb5639ac50` |
| 🌑 Darkness | swarm | Bat Swarm | small shadow nightling bat | `b3bd8bfb-a220-43d5-9a0f-0f0184d304a6` |
| 🌑 Darkness | armored | Bone Knight | plated undead bone knight | `b60e1ac4-79d2-4be0-98b1-a1abd3ffe3f0` |
| 🌑 Darkness | eliteboss | Void Reaper | scythe-wielding void reaper | `0fb3ec6c-f336-4725-b560-933498c8a57a` |
| 🌑 Darkness | bigboss | Void Titan | abyssal many-eyed void titan | `6525f055-eb88-4ea0-963f-4e0d27f2682d` |
| 💧 Water | normal | Tide Spawn | slimy little blue water imp | `702be637-408f-45f3-b3f9-66a5c7d777b5` |
| 💧 Water | fast | Frost Whelp | quick icy frost serpent whelp | `bb035001-7036-4709-8233-1830651a7750` |
| 💧 Water | swarm | Slush Swarm | small jagged ice shard leech | `beeef15e-9dac-4ab3-929c-88ee970e61fa` |
| 💧 Water | armored | Frost Bulwark | massive armored ice golem | `30034eee-d083-4c59-9059-f2181d9956aa` |
| 💧 Water | eliteboss | Leviathan Guard | finned armored water leviathan | `ba2ba08e-7444-48ff-a9d2-0068e11f4d5a` |
| 💧 Water | bigboss | Glacier Kraken | huge tentacled ice kraken | `3f36b9c6-c248-42c4-b63b-ae6d152164eb` |
| ⛰️ Earth | normal | Pebble Grunt | squat little stone grunt | `4710d489-0946-4d1c-942d-a827eaa865e9` |
| ⛰️ Earth | fast | Dust Runner | fast swirling dust devil | `429d5823-a271-4bf6-b72e-b8e3be1f18f7` |
| ⛰️ Earth | swarm | Gravel Swarm | small armored earth scarab beetle | `b4a8f39d-38d1-420b-a87f-3875d0580e97` |
| ⛰️ Earth | armored | Boulder Golem | massive rolling boulder golem | `414d0d24-df57-484c-88e9-170e2a3fa1ca` |
| ⛰️ Earth | eliteboss | Stone Warden | monolithic stone warden | `6941c5dc-8b81-46d2-80fa-d9778ef5518a` |
| ⛰️ Earth | bigboss | Mountain Colossus | mountain-sized earth colossus | `1194be1d-c8ec-4c67-832f-e72085ddfcf9` |

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
