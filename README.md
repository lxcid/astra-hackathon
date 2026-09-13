# ALDER — Theme-driven tower defense

Describe a theme, generate a world, and defend it. For example:

```text
theme="enchanted woodland fantasy"
```

The AI designs names, a palette, polygon models for four towers and four enemy classes, a defender, an environment prop, and the defended landmark. Three.js builds these models locally and scatters decorative scenery around the battlefield. Abilities receive thematic names and effect colors. Combat rules stay the same in every world. The interface follows the generated palette, and the engine creates a seeded route and build-site layout.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
cp .env.example .env
# Set OPENAI_API_KEY in .env. Never put the key in public/.
npm run dev
```

Open http://127.0.0.1:3000 for the ALDER landing page and marketing trailer. Select **Play the game** to open the world creator, or go directly to http://127.0.0.1:3000/game.html. Enter a theme and select **Create my world**, then **Play this world** after generation. The default model is `gpt-5.6-terra`; `OPENAI_THEME_MODEL` can select another model supporting strict structured outputs. The key requires an API account with active billing. Restart the server after changing environment settings.

To use visual inspiration, choose **Reference image** in the creator, attach a PNG, JPEG or WebP (up to 10 MB), and describe which aspects you want in the theme. A preview lets you check or remove it before selecting **Create my world**. The browser resizes it to at most 1024 pixels and sends it with your description to OpenAI. The image guides palette, silhouettes, materials and atmosphere; it does not change combat rules or produce an exact 3D reconstruction. The uploaded image is not included in saved worlds or persisted by the app. Replaying a generated design needs no image upload.

An explicit **Explore the woodland example** button works without an API key. Failed AI requests display an error; they are never silently replaced by examples. The last validated world is saved in browser storage and can be replayed without another AI request. **Change theme** on the preview or **Create another world** in the pause, details, or result screen returns to creation; it starts a fresh run.

## Fixed combat, generated worlds

| Fixed combat (`public/world.mjs`)                             | Generated world                                           |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| One continuous road, ten build sites, the same movement rules | Seeded road bends and nearby build-site positions         |
| Rapid, splash, slow and piercing tower roles                  | Tower names, colors and polygon silhouettes               |
| Damage, ranges, firing intervals, upgrades and prices         | Unit shapes and materials within bounded visual envelopes |
| Enemy health, speed, armor, bounty and leak damage            | Standard, runner, armored and boss designs                |
| Six wave compositions and spawn timing                        | World title, landmark and decorative scenery              |
| Defender blocking, cooldowns, spirit and area damage          | Defender model, ability names and effect colors           |

**Shuffle route** on the preview creates a different road without another AI request. The route seed is saved with the design, so replaying or restarting keeps the same layout. Routes remain fixed during a run; waves do not reroute midway through combat.

`public/battlefield.mjs` generates three route families with randomized bends, rotation and reflection, then places ten new build sites along the road. Shuffling rejects visually similar roads and site arrangements. Layout validation prevents crossings, tight bends, overlapping sites and inadequate tower coverage. Road length stays within ±5% of the original (currently normalized to the same length); each site covers 5–24 road units with the shortest-range tower. The entrance and defended landmark move with the layout. Strategy and difficulty vary, while tower stats, enemy stats, waves and economy remain fixed. Rendering and simulation share the same battlefield.

Splash impacts add a themed flash, sparks, airborne fragments and dust, driven by the same pause/speed clock as gameplay. These are visual effects only. Tower projectiles track their target and apply damage only on impact: 0.45 seconds for boulders, 0.2 seconds for other shots. Splash uses enemy positions at impact. If a target dies first, the projectile finishes at its last tracked position; direct shots cannot damage another enemy. Projectile flight follows pause and game speed, and in-flight damage snapshots survive tower sales or upgrades. A seeded, theme-colored mountain range surrounds the flat battlefield. Low foreground foothills preserve visibility, and scenery stays inside the valley. Mountains never change pathing, build sites or combat.

**Wave intel**, below the wave control, shows the current wave during combat and the upcoming wave during preparation. It includes actual themed model portraits, roster counts, health, speed, armor, bounty, escape cost, and counter suggestions. A selector lets you inspect all six waves. Combat pauses while the panel is open and resumes its previous pause state when closed.

The generated palette also styles the HUD, controls, labels, title screen, tooltips, dialogs and creation screen. Text and accent colors are adjusted for readable contrast. Generated art never determines targeting, health or attack behavior.

## Engine architecture

1. `public/launcher.mjs` submits `{theme, variant}` to `POST /api/theme`. Each creation receives a new visual seed. No simulation runs during creation.
2. `lib/theme-service.mjs` calls the OpenAI Responses API with a [strict visual JSON schema](https://developers.openai.com/api/docs/guides/structured-outputs). It handles timeouts, refusals, billing errors, and incomplete or invalid responses. The key remains server-side.
3. `public/theme.mjs` validates and freezes the presentation contract. Unknown fields are discarded. It accepts no scripts, asset URLs, combat parameters or path geometry. Each of the 11 model recipes has 1–24 parts from five supported primitives, with bounded transforms and palette materials.
4. `public/theme-scene.mjs` creates Three.js meshes and fits each recipe inside the standard visual envelope. Decorative scatter avoids the road, sites, and goal. `public/theme-ui.mjs` applies text safely using text content; `public/ui-palette.mjs` derives readable interface colors.
5. `public/game.mjs` renders the theme and seeded battlefield while calling the fixed combat rules in `public/world.mjs` at a fixed 50 ms step.

The theme service uses native Node fetch, a 90-second upstream timeout, a 2 KB text-only request limit (1.5 MB with a validated reference image), two concurrent generations, and a bounded in-memory cache of 24 designs. Identical model/theme/variant/image requests reuse a cached design until restart or eviction. The local server binds to loopback. A shared Fetch handler in `lib/theme-api.mjs` validates requests, enforces same-origin browser requests and serves the hosted Worker. Generation limits and the cache apply per server or Worker isolate. The hosted site uses Sites owner-only access; broader sharing would need per-user usage controls.

The local procedural generator is an explicit example/development path with woodland, cyberpunk, candy, desert, ocean, volcanic, space and winter motifs; unknown prompts get an abstract seeded interpretation. AI generation instead supplies custom polygon recipes for all model roles. The original authored woodland scenery remains available through the example.

## Sites hosting

`.openai/hosting.json` links this checkout to the existing Sites project. Reuse that project when publishing updates. `npm run build` emits a Workers-compatible entrypoint in `dist/server/index.js` and static assets, including Three.js, in `dist/client`. No local server or external CDN is needed by the deployed game.

`worker.mjs` serves `/api/config` and `/api/theme` with the same request handler used locally and delegates static files to the Sites asset binding. Configure `OPENAI_API_KEY` as a secret and `OPENAI_THEME_MODEL=gpt-5.6-terra` in Sites runtime settings; `.env` is only for local development and is excluded from source and build output. The site starts private. Deploy a new saved version after changing runtime settings.

## Play

Click a site and choose a tower, or choose a tower first and click its site. Preparation has no time limit. Defeated enemies and cleared waves award amber. Towers can be sold for 70% of their investment. Survive six waves.

| Control                    | Action                                    |
| -------------------------- | ----------------------------------------- |
| 1                          | Rapid physical tower                      |
| 2                          | Area-damage tower                         |
| 3                          | Slowing tower                             |
| 4                          | Armor-piercing tower                      |
| 5                          | Place two temporary defenders on the road |
| 6 / Space                  | Target the area-damage ability            |
| U                          | Upgrade the selected tower, up to level 3 |
| N                          | Call the next wave                        |
| WASD / right drag / scroll | Pan / orbit / zoom                        |
| P / Esc                    | Pause / cancel selection                  |

## Validation

```sh
npm test
```

Tests cover combat, economy, path following, wave progression, victory and defeat, theme validation and complexity bounds, fixed-layout simulation equivalence across themes, 200 randomized layouts, per-world movement and defender projection, wave intel accuracy, UI contrast, structured AI requests and failure handling, and local API/static-file boundaries. They mock the AI provider and never incur API costs. Live generation is tested separately through the app.

The gameplay takes inspiration from the tower roles, upgrades, and reinforcements in Kingdom Rush. Original code, names, map, and geometry are used here.
