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
