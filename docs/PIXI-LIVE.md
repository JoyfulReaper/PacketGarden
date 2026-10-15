# Pixi live garden with shared ecology

`/` remains production Canvas. `/pixi-live.html` now includes the real shared
specimen model, grass ecology and temporary storm puddles. `/pixi-stress.html`
and its scripts/styles are unchanged. There is no production renderer cutover,
backend change, new transport connection, persistence or telemetry.

## Ecology extraction

`garden-ecology.js` is the authoritative renderer-neutral implementation of
grass state/rules, puddle state/rules, and their lifecycle visual math. It uses
`garden-core.js` dimensions, injected clock/random functions, and synchronous
`{ kind, item }` notifications. It owns no renderer objects, DOM, timers, storage,
audio, inspection or specimen/gameplay state. The recently extracted specimen
core and `pixi-live-core.js` are unchanged.

`PacketGardenEcology.createEcologyModel({ now?, random?, onChange?, weather? })`
provides:

- `grassCells` and `puddles`, containing stable logical objects. Grass is keyed
  by `row * 32 + column`; puddle views use the exact logical object as their key.
- `influenceGrass(eventType, specimen, at?)`, `influenceGrassCell(column, row, at?)`,
  `spreadGrass(at)`, `tickGrass(at?, hidden?)`, and `removeExpiredGrass(at?)`.
- `updateWeatherEligibility(level, at?)`, `tickPuddles(at?, random?, hidden?)`,
  `createStormPuddle(at, random?)`, `refreshStormPuddle(puddle, at)`, and
  `removeExpiredPuddles(at)`.
- `tick(at?, { hidden? })`, `resetCadence(at?)`, `resetPuddleFormationClock(at?)`,
  `clearGrass()`, `clearPuddles()` and `clear()`.
- `seed({ grassCells?, puddles? })`, an atomically validated local fixture import.
  It does not run in response to SSE. Normal input always goes through the rules.
  The array/deadline setters exist for legacy Canvas deterministic fixtures;
  consumers should otherwise use the model operations and notifications.

Change kinds are `grass-added`, `grass-refreshed`, `grass-removed`, `puddle-added`,
`puddle-refreshed`, and `puddle-removed`. No change history is stored. Shared
exports also include both config tables, severe formation probabilities,
`grassVisualState(grass, at)`, `puddleVisualState(puddle, at?)`, and
`nextGrassVisualChangeAt(grass, at, refreshMs?)`.

Canvas keeps its drawing paths, dirty flags, aggregate visual deadlines, fake
traffic, weather controls and diagnostics. `gardenState` exposes shared ecology
arrays through compatibility accessors. `garden-grass.js` remains a compatibility
script; its population-aware policy moved into the shared model. `garden-puddles.js`
keeps Canvas drawing and its analytic 0.5px/0.02-opacity deadline scheduler,
delegating logical state changes and visual interpolation to the shared model.
Canvas's grass geometry, colors, blades and clipping are unchanged.

## Exact logical parity

Grass retains DNS `.45` / HTTP `.65` influence, same-cell `.50`, optional second
cell `.35`, radius-one bounded neighbors and 640 unique logical cells. Other
event types/species/ports have no influence. In particular, actual TCPNoise
specimens still do not create or rejuvenate grass. Refresh preserves `createdAt`
and the existing cell object, updating only its influence time.

Growth boundaries are 10s and 30s; idle fade/dying/dead/expiry boundaries are
20/27/32/35 minutes. Shared visual output preserves the original growth,
expansion, decline and interpolated RGB channels. Grass can coexist with a
specimen. Normal spread runs once per 4s deadline, with `.50` chance per attempt.
Only mature, non-fading turf with grass-empty neighbors participates. Eligible
populations 0 / 1–12 / 13–24 / 25–48 / 49+ receive 0/1/2/3/4 attempts. Fading
turf receives one `.40` final-seed roll per influence cycle, with at most six
checks per pass. Refresh naturally grants another future fade opportunity.
There is no missed-interval replay or per-cell timer.

Puddles retain the cap of eight and a single 15s formation/refresh check.
Only heavy rain / thunderstorm / hurricane are eligible, with `.35/.60/.85`
formation chances. Only eligibility transitions reset the deadline; repeated
same-level polls and severe-to-severe changes preserve it. Refresh chance is
`.60`; at cap, successful formation always refreshes an existing object. Nearby
spawn chance is `.70`, selecting an existing pool, angle, and distance 24–48px
before the original 60px edge clamp. Stable seed/rotation and the original seven
logical fields are retained, with no occupancy/provenance/gameplay effect.

New water starts at radius 10, grows toward 18 over 15s, and each refresh adds
four to its target, capped at 36. Refresh begins at the current visible drained
radius, preserving identity and avoiding a size jump. Wetness stays full for 30s,
then drains linearly over eight minutes. Shared visible radius is grown radius
times `sqrt(wetness)`; opacity is `.38 * wetness`. Exact expiry removes only
that pool. Hidden-state input comes from browser integration, never the model.

## Persistent Pixi ecology views

`pixi-live-ecology.js` contains only cached texture construction, persistent view
ownership/transform updates and local dense seed descriptors. One startup ecology
atlas has **12 deterministic grass patch frames + 1 puddle frame**, sharing a
single 1664×128 RGBA GPU source at 2x resolution (about 0.81 MiB). The existing
762-frame specimen/rain/probe atlas remains unchanged. Total retained cardinality
is **775 frames across two GPU atlas sources**, regardless of births/refreshes.
Temporary construction geometry is destroyed after texture generation.

Each grass cell owns one Sprite. A cell-derived variant remains stable; shared
visual state sets its scale, tint and alpha. Shapes extend past individual cells
and use the existing garden root mask. Growth/fade transforms update about once
per second, through one aggregate visual deadline. Static mature grass does not
update its transforms or trigger scans until a meaningful boundary. No geometry,
texture or whole-scene rebuild happens on grass ticks or animation frames.

Each puddle owns one Sprite using the reusable teal three-ellipse texture with
dark outline and highlight. Position and seed rotation are stable; at most eight
radius/alpha transforms update per animation frame using shared interpolation.
Refresh reuses both Sprite and texture. Grass and puddle layers sit beneath vines
and specimens and beneath rain, inside the one opaque Pixi surface.

The grass art is an approximation: a finite variant set and whole-patch fading
scale differ from Canvas's individual blob/blade geometry. Puddle stroke widths
scale with the cached texture. Logical timing/colors/radius/opacity agree, while
pixel-perfect terrain/specimen artwork parity remains deferred.

The dense button explicitly creates **local simulated** 640 specimens and 640
grass cells, including young/fading visual examples. Its checkbox optionally
includes eight local simulated puddles. This never sends backend traffic or
changes production probabilities. Full seeding has 640 specimen Sprites, 64 vine
Graphics, 640 grass Sprites, eight puddle Sprites and 12 fixed stage/scene objects:
**1,364 display objects**, plus up to 400 lightweight rain particles. Without
water it has 1,356 objects; Clear leaves 12. Real expiry/replacement subsequently
changes specimen counts naturally; no density reduction or automatic reseeding
conceals churn. All-vine density can have up to 640 auxiliary vine Graphics.

The HUD retains existing counters and adds ecology counts/views, constant-size
addition/removal/refresh counters, grass transform-update count and cache sizes.
One existing ticker checks the 250ms logical deadline. Hidden pages stop painting;
resume resets both ecology cadences and reconciles lifecycle/expiry once, with no
grass/puddle catch-up attempts. Live/manual weather uses the existing one SSE
connection and applied weather state.

## Verification for this slice (2026-10-14)

All 25 current Node/browser entry suites passed, including the five new
`garden-grass.cjs`, `garden-ecology.cjs`, `pixi-ecology.cjs` and
`ecology-canvas-parity.cjs`, plus `pixi-ecology-integration.cjs`. The original
`grass-ecology.cjs` now runs its unchanged behavioral assertions directly against
the shared implementation. Existing independent Canvas harnesses load the new
dependency. No existing expectation was weakened.

`tests/fixtures/production-ecology.json` records pre-extraction production state
from commit `6e274e3` across five deterministic random sequences, 80 influences
and five spread passes per sequence. Shared results must match exact placement,
timestamps and fade bookkeeping. Other tests cover exact configs/probability
boundaries, rejuvenation, bounded final seeding/population attempts, expiry,
weather cadence, drained refresh size, hidden/resume and absence of object timers.
Instrumented real Pixi controllers check exact view ownership/removal, weather
independence, mature-grass deadlines, repeated dense seed/clear cycles and the
fixed 13-frame cache. These tests make no GPU FPS claims.

`production-ecology-art.json` additionally freezes actual pre-extraction Canvas
drawing commands and styles at 19 grass/puddle growth, fade, color, drain and
expiry samples. The current Canvas renderer matches them exactly, including
edge-cell geometry, clipping, opacity, outlines and highlights.

`dotnet build` passed with zero warnings/errors, `dotnet run --project
tests/PacketGarden.Checks` passed, and `git diff --check` passed. Backend/SSE sources,
the specimen core and the synthetic stress files have no diff.

The integration suite executes the actual Pixi entry point with instrumented
Pixi/DOM/transport doubles. It drives the real seed/clear/live/manual handlers,
then delivers a ten-minute hidden interval through the registered visibility
callbacks. Resume removes expired water, performs no formation attempt, and
waits a fresh 15 seconds before one new attempt. The same test checks live
weather caching, persistent views across weather switches, actual SSE refill
without invented grass influence, and page teardown.

### Observed ecology browser runs

The local preview received actual NATS collector events and real weather through
the unchanged SSE endpoint. No test publisher or synthetic SSE was used. The
main samples used WebGL/native ticker, 1280×1000 viewport, 1218×650 presentation
and backing, DPR 1. Controls deliberately reset timing after fixture/weather
changes, so these timings exclude those button operations and startup.

| Case | Observed duration | Session average FPS | Session worst interval |
| --- | ---: | ---: | ---: |
| Empty startup → live specimens + five grass seeds | 68.1s | 59.8 | 66.9ms |
| Dense specimens + 640 grass, quiet, actual events | 82.7s | 59.9 | 17.1ms |
| Dense specimens + 640 grass + eight puddles, quiet, actual events | 38.6s | 59.9 | 17.0ms |
| Dense ecology + 400 hurricane particles + actual events | 314.7s | 59.9 | 17.3ms |
| Isolated dense hurricane recheck after final code reload | 90.7s | 59.9 | 17.1ms |

The 314.7s sample recorded **zero >50ms and zero >300ms gaps**. At initial
seeding: 640 specimens, 640 grass views, eight puddle views, 64 vine Graphics,
1,364 display objects, and 400 rain particles. At the final observation:
312 specimens (192 simulated, 120 live), 155 vine Graphics, 184 connection
halves, 640 grass views, eight puddle views, 1,127 display objects and 400 rain
particles. The run accepted **127 additional actual events**, made 13 additional
specimen replacements and 442 lifecycle removals, and performed 16 puddle
refreshes. Five seeded grass cells expired and were replaced by ordinary shared
spread; grass count returned to 640. Atlas counts stayed at 762 + 12 + 1 frames.
Density was not lowered, frozen or periodically reseeded; seeded specimen
lifetimes naturally reduced the final population, so this is not a constant
640-specimen five-minute benchmark. Its intervals are comparable to the earlier
specimen-only 17.3ms result, subject to this changing workload and browser/driver
variance.

Sampled screenshots show coherent rain/probe movement, young grass expansion,
aging turf colors, grass beneath specimens, puddles, vines and actual live churn.
No recurring 300–500ms gaps appeared in that isolated run. Browser logs contained
no errors or warnings. Screenshots and ticker samples do **not** establish
uninterrupted human-perceived smoothness or GPU completion; no continuous video,
GPU profile or long-duration heap profile was captured.

Afterward, a separate clear/refill/resize workflow ran while the production
Canvas page was also open and receiving events. The sparse Pixi page (zero
grass, up to three puddles) recorded a **250.7ms worst interval**, 47 >50ms gaps,
no >300ms gaps, and a 58.3 FPS session average over 187.2s; a recent window was
55.3 FPS. This mixed workflow includes startup, resize, browser visibility
operations and concurrent Canvas activity. It is not the isolated dense ecology
sample and cannot attribute the stalls to a specific layer. Its presence with
zero grass does not implicate the new dense grass layer. Concurrent page/host
contention is a possible explanation, not a profiled conclusion. These gaps are
retained here rather than folded into the quieter benchmark.
After closing production Canvas, reloading the final code, seeding the full
640/640/8 scene and resetting measurements, the isolated 90.7s recheck recorded
zero >50ms or >300ms gaps. It ended with 597 specimens, 640 grass views, eight
puddle views, 89 vine Graphics, 1,346 display objects and 400 rain particles.

Clear removed ecology, then real input refilled specimens without adding grass.
Manual hurricane subsequently formed two real puddles and refreshed them six
times through ordinary checks, independent of local seeding. Live weather
switching applied the latest heavy-rain state and its lower particle intensity.
A 390×844 viewport retained one canvas and the contain transform; restoring the
larger viewport retained the same ecology cache.

On production `/`, browser checks observed Canvas rendering, fake DNS/HTTP
growth, young and mature grass patches, hurricane rain and a storm puddle,
real specimens/activity, inspection of a simulated DNS flower, and manual/live
weather switching. Exact full grass fading/35-minute expiry and complete
eight-minute puddle drainage were verified with deterministic clocks and the
original-art oracle, **not** watched end-to-end in real time. Rare curiosities,
drops, mutations, gnome incidents and audible audio were not individually
observed manually in this run; their existing integration suites passed.

Manual hide/resume remains a browser-tool limitation: this in-app browser
reported `document.hidden === false` / `visibilityState === 'visible'` even when
its panel was hidden or another tab was opened. Those operations therefore did
not exercise real document suspension. The actual visibility handlers are
covered by the deterministic entry-point test described above, but no claim of
a successful manual hidden-tab test is made.

Ignored local evidence: `artifacts/pixi-ecology-observations.json`,
`artifacts/pixi-ecology-hurricane.jpg`, `artifacts/pixi-ecology-preview.jpg`, and
`artifacts/ecology-production.jpg`.

### Changed files

- Shared rules: `wwwroot/garden-ecology.js` (new).
- Canvas integration: `wwwroot/garden.js`, `wwwroot/garden-grass.js`,
  `wwwroot/garden-puddles.js`, `wwwroot/index.html`.
- Pixi presentation/integration: `wwwroot/pixi-live-ecology.js` (new),
  `wwwroot/pixi-live.js`, `wwwroot/pixi-live.html`.
- New tests: `tests/garden-grass.cjs`, `tests/garden-ecology.cjs`,
  `tests/pixi-ecology.cjs`, `tests/pixi-ecology-integration.cjs`,
  `tests/ecology-canvas-parity.cjs`.
- Frozen original-production fixtures: `tests/fixtures/production-ecology.json`,
  `tests/fixtures/production-ecology-art.json` (both new).
- Existing test harness integration: `tests/garden-audio.cjs`,
  `tests/garden-events.cjs`, `tests/gnome-events.cjs`, `tests/grass-ecology.cjs`,
  `tests/pixi-live.cjs`.
- Documentation: `docs/PIXI-LIVE.md` (this file).

## Remaining systems and next slice

First-seen curiosities, loose Amanita drops, mutation activation/collectible weed,
gnomes, inspection, Recent activity, Score, audio, collection and opium remain
outside Pixi. No new gameplay was added. Recommended next parity slice: shared
renderer-neutral curiosity/drop lifecycle state with bounded persistent Pixi
views, keeping production Canvas while human visual/GPU/heap soak work continues.

---

# Historical specimen-only Pixi prototype notes

The following records the earlier prototype and its benchmarks before shared
ecology was added. Its deferred-ecology statements and resource counts describe
that historical state; the current architecture and counts are documented above.

# Pixi live soak prototype

Open `/pixi-live.html` on a running PacketGarden instance. This opt-in page starts
empty, with Live weather and live garden events enabled. `/` remains Canvas 2D;
it does not load Pixi. `/pixi-stress.html` remains the separate synthetic spike.

## Real input and local controls

One same-origin `EventSource('/api/garden/events')` receives the existing named
`garden` and `weather` frames. The backend, NATS subscription, SSE schema,
transient fanout and no-replay behavior are unchanged. NATS stays server-side.
The preview backend can use the existing `Nats:Url` configuration; the browser
does not receive the NATS URL. No publishing or collector changes are needed.

Garden normalization retains only the production safe browser contract:
known `specimenType`, integer `listenPort` 1–65535, integer `vigor` 0–3, nullable
sensor text bounded to the existing backend's 128-character limit, and decimal
`seenCount` text or null. The raw parsed frame is discarded. IPs, remote ports,
payloads, banners and credentials are neither retained nor logged. Backend
species/rarity/vigor are authoritative; only persistent cosmetic palette choices
are made locally. Malformed frames leave the stream and last valid weather intact.

- **Clear garden** destroys current specimen/connection views, keeping the
  connection, weather and finite atlas. New live events immediately refill it.
- **Seed dense garden (simulated)** locally replaces state with 640 representative
  specimens and real lifecycle timings. It creates no backend traffic. The HUD
  explicitly distinguishes simulated/test and live specimens. Live events continue.
- **Weather source: Live / Manual** defaults to Live and disables manual controls.
  Manual levels use a fixed 10,000 events/min test intensity. Incoming live weather
  is still remembered and applied immediately when switching back to Live.
- **Pause live garden events** ignores valid garden callbacks while continuing
  weather SSE, native Pixi animation, lifecycle cleanup and local controls. Missed
  events are not queued/replayed. This does not freeze seeded lifecycle aging.
- **Probe dots** toggles the CSS red and Pixi green motion probes. **Reset
  measurements** clears timing samples/session timings, not cumulative event counts.

## Parity and persistent views

`garden-core.js` is now the authoritative renderer-neutral browser model used by
both production Canvas and the Pixi live adapter. Both HTML entry points load it
before their renderer scripts. The garden is 960×600, 30px cells, 32×20, capacity
640. Production still loads no Pixi code; the synthetic stress page is unchanged.

Placement preserves Chebyshev-distance same-species clustering: 90% adjacent
preference, otherwise distance-two nearby, then the alternate band, then empty
cells. Coordinates never wrap. At saturation, expire naturally first; replace
only unprotected occupants with strictly smaller vigor, choosing minimum vigor
then oldest (first array entry on exact ties), reusing the exact victim cell.
Ghostbloom/crystalfungus/blackthorn are protected; equal vigor never churns.

Each successful specimen receives a browser-local id and exactly one persistent
Sprite in `byId`. A spawn adds one view; replacement destroys the exact victim
and adds one; a drop adds none. Lifecycle changes swap only that object's cached
texture, preserving its cosmetic variant. Expiry destroys that view. One 250ms
logical deadline is checked by the existing private Pixi ticker, with no timer
per specimen. Hidden documents stop painting; resume reconciles current time
once, without replaying missed logical steps.

Vines additionally own one persistent Graphics object of half-connection curves.
A cell map gives constant-time lookup of the eight surrounding cells. Only the
changed vine and its immediate neighbors update on appearance, growth eligibility,
visual-stage change, or removal; no vine topology work runs per animation frame.
Both halves preserve production midpoint/bend and orthogonal/diagonal behavior.

## Shared model API and integration

`PacketGardenCore.createGardenModel({ now, random, onChange })` accepts optional
clock/random functions for deterministic verification and a synchronous logical
change callback. It owns `specimens` (ordered objects) and `byCell` (occupied
cells), with these operations:

- `addEvent(raw, at?)` validates the five safe SSE fields and attaches normalized
  provenance before the added notification. `addSpecimen(type, vigor, at?)` is
  the production fake/live spawn integration primitive. Both return
  `{ specimen, replaced }` on success or `null` on rejection/drop.
- `tick(at?)` reconciles stages and expiry, returning removed/updated counts.
  `remove(specimen, reason?)` removes an exact object, including collected mutations.
- `clear()` removes all occupants. `seed(entries, at?)` imports a validated local
  fixture array atomically; it is never used to import SSE frames or raw network data.
- `getCell(column, row)` and `getNeighbors(column, row)` provide bounded logical
  lookup without wrapping. `findReplacementCandidate(vigor)` exposes the shared
  selection query, used only at saturation by insertion.
- Shared exports include frozen dimensions/species/timing tables,
  `normalizeGarden`, `isProtected`, `stageAt`, `lifecycleStage`, and `nextChangeAt`.

Callbacks contain `{ kind, specimen, reason, previousStage }`: `added`, `updated`,
`removed`, or `dropped`. Replacement reports removal and addition with reason
`replaced`, and returns the exact victim. A dropped event creates no object/id/view.
No change history is retained. Callbacks consume each change immediately; the
core contains no timers, animation loop, rendering, weather, audio, or DOM code.
Consumers should change occupancy through the model, not mutate the exposed
array/map. Specimen references remain usable for existing presentation metadata.

Numeric identities are local to one model and never reused for another object,
including after clear. The same object/id survives stage changes and neighbor
queries; replacement gets a new identity. A weak identity association also
preserves ids when local fixtures reuse existing object references, without
retaining removed specimens. `createdAt` and array ordering retain the production
oldest/first-entry tie semantics.

Canvas keeps its existing `spawnSpecimen` wrappers, safe provenance callback,
grass influence, sound, status, Recent activity, inspection, and drawing paths.
`gardenState.specimens` refers to model-owned objects; fixture assignment delegates
to `seed`. Collection now calls model removal so the occupied-cell map stays
correct. The existing 250ms aggregate tick performs logical cleanup. Renderers
and the existing aggregate visual deadline query shared stage/boundary helpers;
the Canvas artwork, palette rolls, redraw scheduling, and overlay remain intact.
The core honors the existing mutation `expiresAt` override, so a mutated
redbloom still outlives its normal 30-second lifespan until mutation expiry.

The Pixi adapter no longer owns dimensions, timing tables, stage calculation,
placement/clustering, occupied cells, victim selection, expiry, or identity
allocation. It translates notifications to the existing persistent view methods,
selects cosmetic variants, supplies dense seed descriptors, counts outcomes,
and handles pause/SSE/weather controls. The view uses shared cell dimensions;
local vine geometry remains presentation-specific. Normal ticks allocate no
full-garden snapshots and animation frames do not reconcile the model.

Safe garden normalization is shared too. Only `specimenType`, `listenPort`,
`vigor`, `sensor`, and `seenCount` survive validation. Both consumers now apply
the existing backend/Pixi 128-character sensor bound (Canvas formerly relied on
the backend for that bound). No backend source, endpoint, or serialized contract
changed. Weather normalization/settings and cosmetic palettes deliberately
remain renderer-specific. Grass/puddles, mutation activation/collection rules,
curiosities, loose drops, actors, inspection, Recent activity, and audio remain in
their existing Canvas modules; none were migrated to Pixi in this slice.

`tests/garden-core.cjs` checks all ten production timing tables and exact stage
boundaries, unique 640-cell capacity, expiry before competition, every saturation
rule, mutation lifetime, identity, clear/refill, edge neighbors, safe fields, and
architectural imports/no timers. `tests/fixtures/production-placement.json` holds
480 cell choices captured from unchanged production at `c92ed92`, across three
random sequences and all species. Both Canvas and the core must match those
frozen results, including production cosmetic random consumption outside the core.
Existing tests still cover drawing/visual deadlines, grass, puddles, mutations,
drops, curiosities, gnomes, inspection, activity, sound, and persistent Pixi ownership.
Harnesses load the new dependency; aging assertions preserve every non-stage
field and explicitly verify the newly exposed stage instead of treating it as
immutable. Test fixtures that insert objects now initialize their model metadata.

## Rendering and bounded resources

PixiJS **8.22.0**, using the existing local vendor bundle. The stress script has a
small library-only opt-in/export and optional atlas tiles; its own page still
autostarts with the same art, load and controls. No new package/dependency/build
step is needed. The production page loads neither script.

The live page uses one opaque WebGL surface, no antialias, high-performance GPU
hint, DPR capped at 2, and a contain transform with a logical rectangular mask.
Soil/grid are persistent; weather darkness changes one black overlay Sprite
inside the scene, never recreating plants or stacking full-screen canvases.

The cache is generated once at startup: ten species × stage × vigor 0–3 × five
cosmetic palettes. Nine species have four stages; redbloom has two. That is
**760 plant frames + rain + probe = 762 atlas frames**, sharing one 2048×1536
GPU source at 2x resolution (about 12 MiB RGBA before driver overhead). Temporary
base atlas and construction objects are destroyed afterward. No event or stage
change creates another texture. Exact production color-filter/art parity is
deferred, but palettes remain persistent; vines retain the 70/15/10/5 common hue
weights plus 1% cosmetic silver, and wireferns retain terminal-style hues.

At dense seeding there are 640 specimen Sprite views and 64 auxiliary vine
Graphics, **714 total display objects including the stage/containers/background/
probe/mask**. Rain is up to 400 lightweight Particles in a ParticleContainer,
separate from that display-object count. Clear leaves 10 fixed display objects.
All-vine density can have at most 640 auxiliary vine Graphics. Counts remain
bounded independently of the total number of events over a long session.

Weather uses cached GPU-batched streaks, actual clamped `eventsPerMinute`, and
the production logarithmic intensity concept/counts/speeds/slant/drift/opacity/
soil-darkening values. Quiet/zero intensity has no rain; hurricane caps at 400.
Changing weather replaces its bounded particle list only, leaving specimen views
intact. No lightning, per-particle timers or per-frame Canvas line strokes.

The local HUD has a 240-sample timing ring and constant-size lifetime counters:
current/recent/session FPS, recent/session worst interval, >50/>300ms gaps,
objects, vine halves, particles, atlas cardinality, created/destroyed views,
stage updates, accepted live growth, saturation drops, replacements, expiry
and paused callbacks. Ticker timestamps are actual intervals, not clamped
simulation delta. These are not GPU completion measurements. No telemetry,
browser storage, or unbounded history is added.

## Deferred parity and migration decision

Grass ecology, real puddles, curiosities, drops, mutations, gnomes, inspection,
Recent activity, audio, Score and collection mechanics remain intentionally absent.
There is no production migration or opium work. GPU/heap profiling and a full
30–60-minute continuous human visual soak are subsequent work; bounded object
counts are evidence of ownership, not proof against every driver/heap leak.

The earlier Canvas 300–500ms symptoms remain comparison context; no claim of
exact benchmark equivalence or guaranteed presentation smoothness follows from
average FPS alone.

## Observed local soak (2026-10-14)

The preview backend connected to the user's configured NATS server, and the page
received **actual collector garden events and live weather** through the unchanged
SSE endpoint. No synthetic stream or test publisher was substituted. WebGL/native
ticker, mainly at 1280×1000 viewport, 1218×650 presentation/backing, DPR 1.

| Case | Observed duration | Average FPS | Session worst interval |
| --- | ---: | ---: | ---: |
| Empty startup → actual live growth/weather | 94s | 59.8 | 83.7ms |
| Seeded dense + quiet + actual events | 83s | 59.9 | 17.5ms |
| Seeded hurricane + garden events paused | 67s | 59.9 | 17.0ms |
| Extended seeded hurricane + actual events | 320s | 59.9 | 17.3ms |

The initial sample includes startup effects and accepted 30 real events; the
later samples reset timing after controls were applied. An earlier 206s hurricane
run also held 59.9 FPS, worst 18.1ms, with replacements and expiry working.
No recurring 300–500ms ticker gaps occurred in these observations; there was no
timing degradation during the extended run. Subsequent resize checks retained
one canvas and the logical aspect ratio, including a 390×844 viewport.

During the final 320s run, event counters rose from 74 to 399 successful live
growths (**325 new actual events**), replacements from 12 to 95 (**83**), and
lifecycle removals from 129 to 519 (**390**); one saturated event was dropped.
The scene started with 640 simulated specimens/714 display objects. Expiry and
live replacement/refill ended at 492 specimens (321 live, 171 simulated), 653
display objects, 151 vine Graphics with 180 half-curves, and 1,186 cumulative
stage updates. The density naturally varies under real production lifetimes;
it was not secretly frozen or continuously reseeded to conceal churn.
**Atlas frames stayed at 762 and hurricane particles at 400.**

Pausing ignored 27 real garden callbacks while accepted growth stayed unchanged;
weather SSE continued and switching back to Live immediately applied the latest
rain state (about 25 particles at the observed ~25 events/min). After Clear,
actual input refilled 34 live specimens over ~94s with no seeded state remaining.
The transport stayed connected throughout control changes. A deterministic
1,000-event burst test additionally proves capacity, drop handling, cache bounds
and persistent scene ownership; it is not a GPU burst-performance measurement.

Snapshots show moving rain/probe positions and coherent scene updates, and no
browser errors were reported. They do not establish uninterrupted subjective
smoothness of the CSS compositor probe or GPU presentation. Compared with the
earlier Canvas 517.8ms observation, the live Pixi ticker is materially steadier,
but the omitted grass/terrain/actors and approximate art prevent an equivalent
full-production comparison. Heap/GPU memory growth was not directly profiled;
bounded view/cache counts and destruction checks provide structural evidence.

**Recommendation B: run another live/visual soak first.** Keep production Canvas
while a human observes 30–60 minutes on the target browser/display, followed by
a staged parity prototype adding the deferred visual systems. This several-minute
actual-data result is promising evidence, not a completed production migration.

Local ignored artifacts: `artifacts/pixi-live-observations.json` and
`artifacts/pixi-live-preview.png`. Verification: normal `dotnet build` (zero
warnings/errors), `dotnet run --project tests/PacketGarden.Checks`, all 19 browser
suites (including `pixi-stress.cjs` and `pixi-live.cjs`), and `git diff --check` passed.
