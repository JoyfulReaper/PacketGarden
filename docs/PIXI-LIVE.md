# Interactive Pixi garden (2026-10-15)

`/pixi-live.html` now supports the production interaction order, exact collection,
specimen inspection, two-second feedback, Recent activity and permanent `Score: 0`.
`/` remains Canvas. Backend/SSE contracts, synthetic stress assets, core specimen
rules, ecology, ambient lifecycle and mutation rules are unchanged. Audio, gnomes
and opium are not implemented in Pixi by this slice. All earlier observations
remain below as historical records.

## Shared interaction and coordinate conversion

`garden-interaction.js` owns logical hit testing and explicit priority:
**curiosity → loose drop → active mutation → specimen inspection**. It exports
`curiosityAt`, `looseDropAt`, `mutationHit`, `specimenAt`, `resolve`, `validPoint`
and the pure `pointFromClient` conversion. Canvas retains its existing action
functions as adapters and now calls the same resolver. The module has no DOM,
Canvas, Pixi, audio, storage or scheduler dependency.

Curiosities and loose drops use their shared movement position *at click time*,
inclusive 9px radii, expiry guards, and reverse array order (newest/topmost first).
Mutation collection uses the existing inclusive 12px radius within the occupied
logical cell. Ordinary inspection uses the entire cell, including the area outside
that radius. Pending mutations remain ordinary inspectable redblooms. One resolve
returns at most one action; no display-tree z-order or Sprite bounds are consulted.

Pixi registers exactly **one native canvas `click` listener**. Root `eventMode`
remains `none`; specimens, ambient objects and rain gain no event listeners.
The handler reads the canvas CSS rectangle once on click, converts client pixels
to renderer presentation pixels using `renderer.screen`, then inverts the actual
root offset and scale. Backing pixels/DPR do not enter the logical result:

```
presentationX = (clientX - rect.left) * screen.width / rect.width
logicalX = (presentationX - root.position.x) / root.scale.x
```

Y follows the same rule. Bounds are `[0,960) × [0,600)`. Pixi letterbox/outside
clicks do nothing, as required for this prototype; valid empty soil closes the
card. Canvas retains its prior outside-click close behavior. Resize updates the
existing root/renderer, never listener or view ownership. No hit scan runs each
RAF; a bounded specimen scan happens only for a click or selected-reference check
on the existing logical cadence.

## Collection and DOM UI

`pixi-live-ui.js` is the DOM adapter. Curiosity/drop collection calls the existing
ambient `removeCuriosity(item, "collected")` / `removeDrop(item, "collected")`.
Mutation collection calls the exposed garden `remove(specimen, "collected")`.
Those authoritative APIs synchronously destroy exactly the corresponding view.
Amanita collection preserves its mushroom. Mutation collection clears occupancy,
mutation view diagnostics, and that exact inspection reference without first
restoring a redbloom. Other views, vines, ecology, particles and cached textures
are untouched. Ambient collection preserves an inspected source, matching Canvas.

`garden-ui-core.js` shares message strings, the 2000ms duration, age formatting,
inspection field formatting, source/vigor labels, Recent text and bounded safe
entry copying. Exact messages remain:

- `You caught a ladybug. +0 points`
- `You collected a snail. It seems annoyed. +0 points`
- `You caught a moth. +0 points`
- `You found a rock. +0 points`
- `You found Amanita muscaria. +0 points`
- `You collected some weed. +0 points`

One message and deadline are held; a newer message replaces/reset the deadline.
The existing 250ms logical cycle hides/clears it when due, including reconciliation
on resume. No message/object timers were added. The card stores the exact specimen
reference, closes synchronously on removal/replacement/collection/clear, supports
the existing close button and Escape, and refreshes age/mutation at most once per
second. Unchanged DOM text is not rewritten. Closing/inspection create no Pixi
objects and change no garden state.

The card copies production markup/classes: Source, Sensor, Listening port, Seen
count, Vigor, Color scheme, Age and Mutation. Real source wording is `Live TCPNoise`;
missing live sensor is `Not supplied`. Simulated seeds/fixtures are explicitly
labelled `Simulated garden seed` / `Simulated interaction fixture`, with
`Development controls` and `—` for missing sensor/port/count information. Existing
simulated event names (DNS/Gopher/HTTP/SSH/probe) are shared. Seen count stays an
exact string. Vigor uses logical 0–3. Color uses a stable renderer-owned `Pixi …`
finite palette name, including orchid/periwinkle/sage rather than claiming Canvas
rainbow/art parity. Inspection never rerolls. Active mutation formatting uses the
existing shared `Collectible weed` helper; normal/pending shows `None`.

The production UI rules moved verbatim from `garden.css` to `garden-ui.css`, loaded
by both pages. `pixi-live.css` adds only stage positioning/cursor/card integration.
The card/status/live-region roles, real close button, labelled native checkbox and
DOM score remain accessible. `Score: 0` is static markup and never updated. There
is no hidden score, inventory, progression or persistence. As on Canvas, the
Recent events toggle hides the whole activity panel, including its static score.

## Safe Recent activity and transport outcomes

The same single EventSource still supplies garden and weather. The Pixi adapter's
new `acceptEvent` exposes actual `spawned`, `replaced`, `dropped`, `invalid` or
`paused` outcomes. Existing `accept` still returns specimen/null for compatibility.
The frame is normalized once, then safe fields go to core `addSpecimen`; actual
`result.replaced` determines replacement, not garden size. Valid saturated events
record a `dropped` entry even when no specimen is returned. Invalid/malformed and
paused callbacks add no activity. Pausing still allows weather through.

Recent activity retains exactly the newest three safe entries in memory. Real
rows show optional sensor, port, species, optional seen count and age. Spawn and
replacement have the same visible format as Canvas; drops append `no growth`.
Explicit simulated entries use their existing source wording. Collection messages
are not network activity. Dense, ambient, mutation and overlap fixture imports do
not generate activity; clear/refill preserves the bounded current rows. Toggle
visibility preserves/continues those rows. Ages share the one bounded UI cadence.

Neither specimen provenance nor Recent entries retain raw frames, remote endpoints,
payloads, banners or credentials. The normalized safe fields are copied explicitly;
the UI formats only these known fields and writes via `textContent`, never HTML.
Sensor text containing markup is displayed literally. No telemetry/storage was added.

`Seed overlap fixture` is local-only, replaces simulated specimen state with one
mutation and an ordinary mushroom, and cycles the four visitor types over a single
Amanita/mutation position. It uses shared creation/removal rules, adds no traffic,
and makes the three-action priority reproducible. Existing pending controls still
allow ordinary-before-activation inspection. Seed fixtures expire normally.

## Interaction validation and remaining work

All **33 Node suites** pass, including the new pure interaction/mapping matrix,
DOM+real-view ownership/activity suite, frozen `cf2a3de` Canvas interaction oracle,
and actual Pixi entry-point surface/controls/resize/DPR/teardown tests. The full
previous ecology/ambient/mutation/art/scheduling suites pass. `dotnet build` has
zero warnings/errors, `dotnet run --project tests/PacketGarden.Checks` passes, and
`git diff --check` passes. The preview was briefly stopped for build file ownership,
then restarted against the supplied NATS endpoint.

Manual Canvas checks on `/` covered real specimen inspection, safe fields, fake
HTTP/DNS input, Recent rows/toggle, empty close, static score and hurricane input.
A temporary local page using the exact production scripts forced a curiosity,
Amanita and mutation overlap; successive clicks produced the three exact messages,
removed only the intended objects, and preserved the ordinary mushroom. Inspection
and card formatting worked after resizing to 390×844. That served fixture was
removed; no forced collection controls were added to production.

Manual Pixi checks covered all four curiosity messages, Amanita, mutation, pending
redbloom inspection, active field formatting outside the collection radius,
ordinary/simulated/real inspection, close, empty clicks, Recent visibility,
clear/refill and real activity during hurricane. The same protected ghostbloom was
successfully inspected after settled 1600×900 and 390×844 resize; letterbox clicks
preserved its card. An initial automation pass reused stale coordinates; recomputing
them locally corrected the test, with no product mapping change required. DPR 1/2,
CSS scaling, boundary edges, newest overlaps, expiry/replacement stale references,
exact cache/view counts and deterministic saturated outcomes are covered in tests.
The browser also displayed real saturated `no growth` entries. Rare collections
were explicitly forced locally; no natural rare collection is claimed.

Interaction adds **zero Pixi display objects or texture frames**. The dense baseline
remains 1,372 display objects and 781 cached frames across three atlas sources,
with 400 hurricane particles. Natural lifecycle and real-event/vine churn change
the live object count normally. Inspection, closing and DOM updates create/destroy
no scene objects; collection destroys one exact view. No recurring 300–500ms stall
was observed.

### Interaction soak measurements

The recorded foreground run lasted **376.8 seconds**, with manual hurricane at
10,000 events/min, 400 particles, dense ecology, periodic ambient/mutation seeding,
and real NATS/SSE traffic. During the run cards were opened/closed repeatedly,
visitors/drops/mutations were collected, the Recent toggle was exercised, wide and
narrow resize checks ran, and a final full local refill closed the old inspection
reference before another three-category collection cycle.

| Phase | FPS | Worst interval | >50ms / >300ms |
| --- | ---: | ---: | ---: |
| Recorded 376.8s interaction run | session 60.0; recent 59.9 | 17.2ms | 0 / 0 |
| Resize observations during that run | approximately 60 | 17.0ms at 206.7s | 0 / 0 |
| Separate fresh-page startup samples | settled to 60 | 83.24–83.50ms | 1 / 0 each |

There was no steady-state >50ms gap or 300–500ms stall in the recorded interval.
The first background attempt was throttled near 1 FPS and excluded; the user
foregrounded the preview before measurement. The full local baseline started at
1,372 display objects, 640 specimens/grass, eight puddles, six ambient and three
mutation views. Counts then followed collection, natural expiry, real-event/vine
churn and refill. At 205.2s it held 620 specimens, 640 grass, eight puddles and 88
vine Graphics (1,370 display objects). After the final refill the HUD again showed
1,372 before collections. Cached frames stayed 763 + 13 + 5 across three sources.
The recorded final counter sample had 801 cumulative accepted live events, 289
replacements and 43 saturated drops; these counters include the page's pre-reset
events, while the timing window starts at measurement reset.

The collector continued during UI work. Performance observations sampled actual
rendered rain/probes/visitor positions and card/collection behavior; they are not
uninterrupted human observation or GPU-completion measurements. The browser's
native DPR was not forced to 2; DPR 2 was verified in the deterministic handler
and mapping harness. Hidden-resume and expiry/replacement races are similarly
covered by the registered-callback tests rather than claimed as natural manual
observations. A final descriptive palette-name adjustment (orchid and blackthorn
hue names) changes only inspection text, with no rendering/timing code change.

Audio remains intentionally absent from Pixi (no `garden-audio.js` import or sound
call), while all Canvas collection sound calls remain. Gnomes and exact Canvas art
parity remain deferred. **Opium was not implemented.** A focused opt-in audio
adapter preserving production mute/volume/cooldown semantics is the recommended
next slice, followed separately by gnome presentation and finite cached art parity.

Changed runtime files: new `garden-interaction.js`, `garden-ui-core.js`,
`garden-ui.css`, `pixi-live-ui.js`, `pixi-live.css`; updated `garden.js`,
`garden-inspect.js`, `garden-curiosities.js`, `garden-drops.js`,
`garden-collectibles.js`, `garden-activity.js`, `garden.css`, `index.html`,
`pixi-live-core.js`, `pixi-live.js`, `pixi-live.html` (all under `wwwroot/`). Test
changes: new `garden-interaction.cjs`, `pixi-interaction.cjs`,
`interaction-canvas-parity.cjs`, `fixtures/interaction-canvas-cf2a3de.json`;
updated `garden-inspect.cjs`, `garden-audio.cjs`, `garden-events.cjs`,
`gnome-events.cjs`, `pixi-ecology-integration.cjs` (all under `tests/`). This document
contains the current architecture/results and preserves the earlier sections.

---

# Historical: shared specimen mutation slice

The latest 2026-10-15 slice adds the existing `collectible_weed` specimen mutation
to `/pixi-live.html`. Production `/` remains Canvas. The synthetic stress page,
backend, SSE payloads, core specimen lifecycle, ecology and ambient modules are
unchanged. Opium is not implemented. Pixi mutation appearance and lifecycle now
have parity; collection and inspection remain deferred.

## Shared mutation ownership and rules

`garden-mutations.js` is separate from ambient objects: a mutation belongs to an
exact existing specimen, never another object or occupied cell. It exports
`config`, `isMutationActive(specimen, at?)`, `mutationLabel(specimen, at?)` and
`createMutationModel({ garden, now?, random?, onChange? })`. The model exposes
`maybeSchedulePort22Mutation`, `scheduleMutation`, `activateMutation`, `tick`,
`removed`, `snapshot`, constant-size `counts`, and `clear` (which clears the owning
garden). No source map, timer, event history or rendering dependency is retained.

Only a present redbloom with `origin.kind === "tcpnoise"` and integer port `22`
qualifies on the real-event path. A finite, nonnegative roll strictly below
`0.05` schedules `{ type: "collectible_weed", activateAt: now + 3000 }` on that
exact specimen. Ineligible sources consume no roll; eligible duplicates retain
the previous roll ordering and cannot gain a second marker. Fake growth never
passes this provenance gate.

After the garden reconciles expiry, the existing 250ms logical cadence consumes
due markers in specimen order. At most three activate. A fourth due attempt is
consumed and skipped permanently, with no backlog/retry. Activation attaches only
`{ type, createdAt: now, expiresAt: now + 20000 }`; id, cell, coordinates, vigor,
source creation time, palette and origin remain intact. Core `lifecycleStage` and
`nextChangeAt` already make the absolute mutation expiry authoritative, even past
ordinary redbloom expiry. Expiry removes the exact specimen and occupancy entry;
it never reverts to redbloom. Core rules were left unchanged.
Incoming Pixi events also reconcile due mutations before placement/competition,
matching Canvas's `updateGarden` ordering between logical scheduler ticks.

Both adapters forward core removal notifications synchronously to `removed`.
Pending state is deleted for natural expiry, saturation replacement, explicit
removal, collection and clear. No same-cell replacement can inherit it. Active
mutations retain current production saturation behavior: canonical redblooms are
still eligible for ordinary strictly-higher-vigor displacement. No protection was
added. Loose Amanita pending state remains independent in `garden-ambient.js`.

Canvas's existing mutation functions are thin adapters. Its art, 12px hit radius,
animation scheduler, click priority, inspection, collection sound, exact-specimen
removal and `You collected some weed. +0 points` message are unchanged. Score and
activity are unchanged. A frozen oracle captured from `934089d` before extraction
compares full state and drawing commands through pending/activation/animation,
including palette/RNG ordering and collection output.

## Pixi mutation presentation and controls

Activation swaps the existing specimen Sprite's texture to one cached rooted
ochre/green plant with paired leaves, a pale bud and glint. No extra Sprite,
container or cell is created. A bounded map of at most three active views receives
subtle rotation/alpha updates each RAF; no garden reconciliation, Graphics rebuild
or texture generation happens there. The whole-plant transform/glint approximates
Canvas's moving stem/glint. Pending state remains visually ordinary. At absolute
expiry the view becomes invisible until the next logical removal, preventing a
late-tick flash; that exact Sprite is then destroyed. Weather never recreates it.

The specimen atlas has **763 frames** (762 existing + one mutation frame), with
the same 2048×1536 backing and GPU source. Ecology still has 13 frames and ambient
five: **781 total cached frames across three sources**, up from 780. A full dense
seed with three mutations still has **1,372 display objects**: 640 specimen
Sprites, 640 grass, eight puddles, six ambient, 64 vine Graphics, 14 fixed objects.
The 400 hurricane particles are unchanged. Counts subsequently follow natural
expiry and real-event churn.

`Seed 3 mutations` locally prepares up to three simulated redblooms and activates
due fixtures. `Seed 4 pending mutations` prepares up to four ordinary sources,
waits the real three seconds, and exercises the cap. Fixture source age is prepared
as 20 seconds *before scheduling*, making survival past ordinary expiry visible.
These controls send no traffic and never give simulated provenance access to the
real probability gate. Existing eligible simulated redblooms keep their views;
if necessary, ordinary model placement creates sources subject to saturation.
The HUD reports active/pending/views/activations/cap skips/cancellations/expiries;
diagnostics remain transient and local. Clear removes every pending/active/view.

## Validation for the mutation slice

Changed runtime files: `garden-mutations.js` (new), `garden.js`,
`garden-collectibles.js`, `index.html`, `pixi-live-core.js`, `pixi-live.js`, and
`pixi-live.html`, all under `wwwroot/`. Documentation: this file. Changed existing
test loaders/suites: `tests/garden-audio.cjs`, `tests/garden-events.cjs`,
`tests/gnome-events.cjs`, `tests/pixi-ecology-integration.cjs`, and
`tests/pixi-live.cjs`. New tests: `tests/garden-mutations.cjs`,
`tests/mutation-canvas-parity.cjs`, `tests/pixi-mutations.cjs`, and frozen fixture
`tests/fixtures/mutation-canvas-934089d.json`.

All 30 Node suites pass, including shared mutation rules, exact cancellation and
replacement, frozen Canvas parity, same-Sprite Pixi activation/expiry, bounded
atlas cardinality, dense ecology/ambient/weather isolation, actual entry-point
controls/SSE/visibility callbacks, and all previous scheduling/interaction suites.
`dotnet build` passes with zero warnings/errors; `dotnet run --project
tests/PacketGarden.Checks` passes. An initial build encountered the running preview
DLL's file lock; stopping that preview and rebuilding resolved it.

### Browser observations (local WebGL, 2026-10-15)

The real collector connection used the supplied NATS endpoint. Live growth and
weather shared the existing single SSE stream; no synthetic backend events were
published. The first attempt was visibly throttled near 1 FPS between interactions
despite `document.hidden === false`. After the user foregrounded the Codex preview,
normal ticking returned. That throttled attempt is excluded from the comparison.

| Foreground run | Duration | Recent/session FPS | Worst interval | >50ms / >300ms |
| --- | ---: | ---: | ---: | ---: |
| Initial dense hurricane + real SSE | 288.7s | 60.0 / 59.9 | 50.4ms | 2 / 0 |
| Final code, including resize and real SSE | 211.2s | 60.0 / 59.9 | 33.4ms | 0 / 0 |

The first run preceded the small incoming-event ordering correction described
above; the second used the final code. A separate fresh-page startup had one
100.2ms gap, consistent with the previous startup observation, and none over
300ms. No recurring 300–500ms stalls appeared. At 34.5s after the isolated
390×844 → 1280×1000 resize, worst interval was 17.2ms with zero >50ms gaps.
Later full-page screenshot capture also changed presentation width temporarily;
the reported final-run 33.4ms maximum includes that normal tool activity.

Full dense seeding started at 640 specimens, 640 grass, eight puddles, six ambient,
three mutation views, 64 vine Graphics and 400 hurricane particles: 1,372 display
objects. Temporary ambient/mutation fixtures were replenished periodically, then
allowed to expire naturally. Counts were not held artificially constant. The
final run ended at 603 specimens (98 accepted live), 640 grass, eight puddles,
126 vine Graphics and one real curiosity: 1,392 display objects. Cache cardinality
stayed 763 + 13 + 5. Console warnings/errors were absent during the final check.

Forced pending controls showed ordinary redblooms, then three rooted mutation
plants and a consumed fourth cap attempt. Active plants survived seeded ordinary
expiry and disappeared naturally. Resize preserved presentation, and clear/refill
removed pending markers, active views and occupancy; empty scene returned to 14
fixed objects. Unit/entry-point tests establish exact Sprite/reference identity
and boundary timing more precisely than visual sampling.

Canvas was checked on `/` with fake DNS/Gopher/HTTP growth, grass, real SSE input,
and manual hurricane weather. A temporary local page using the exact production
scripts provided an explicitly labelled, forced aged port-22 fixture without
backend traffic. It showed the mutation inspection label at source age **32s**,
past normal redbloom expiry. Clicking its center removed only that specimen,
closed its card, left the ordinary neighbor and displayed the exact +0 message.
Sound was enabled; audible output was not independently verified. Automated
tests assert the unchanged collection sound call, click priority and occupancy.
The temporary served fixture was removed; production has no forced-mutation UI.

These were sampled observations of actual rendered rain/probes/visitors/mutation
appearance, plus bounded ticker metrics, not uninterrupted human observation or
GPU-completion measurements. No naturally occurring rare mutation is claimed;
mutation visual checks used explicitly forced local fixtures. Browser-level
background suspension was not independently demonstrated; actual registered
visibility callbacks are covered with injected time in the entry-point suite.

The next slice should add unified Pixi hit testing and interaction, preserving
Canvas's visitor → loose drop → mutation → specimen inspection priority. Pixi
collection, inspection, audio, activity, score and gnomes remain deferred.

---

# Historical: shared ambient state slice

The 2026-10-15 slice adds real first-seen visitors and loose Amanita muscaria to
the opt-in `/pixi-live.html` garden. `/` remains production Canvas;
`/pixi-stress.html`, the backend, SSE contracts, specimen core and ecology rules
are unchanged. Pixi collection interaction is still deferred. Visitors and drops
expire normally and do not affect occupancy, score, audio or other gameplay.

## Shared ambient architecture

`garden-ambient.js` owns the authoritative state, eligibility, placement,
movement and lifetime rules used by both renderers. It is separate from
`garden-ecology.js`: temporary visitors and source-bound pending drops have
different ownership from long-lived turf and weather residue. This keeps the
ecology module focused. The ambient module depends only on shared garden
dimensions/timing queries, injected clock/random functions, and callbacks.
It has no rendering, DOM, timers, storage, audio or inspection dependency.

`PacketGardenAmbient.createAmbientModel({ now?, random?, getSpecimens?, onChange? })`
exposes:

- `curiosities`, `drops`, `pendingDrops` and constant-size diagnostic `counts`.
- `acceptLiveSpecimen(source, at?, hooks?)`, the common success-only live trigger.
  Optional creation hooks retain Canvas repainting and its existing test seams.
- `createFirstSeenCuriosity(source, random?, at?)`, `maybeScheduleAmanita(source,
  roll?, random?, at?)`, and `scheduleLooseDrop(source, type, random?, at?)`.
  Direct creation/scheduling remain explicit local/test seams, as before.
- `tick(at?, { hidden?, living? })`, `expireCuriosities(at?)`, `tickDrops(...)`,
  `activateLooseDrop(source, at?, living?, hidden?)`, `prunePendingDrops(...)`,
  `isSourceAlive(...)`, and `cancelSource(source)`.
- `removeCuriosity(exactObject, reason?)`, `removeDrop(exactObject, reason?)`,
  `clear()` and a validated, known-fields-only local `seed(...)` import.
- `idFor(object)`: stable, monotonically allocated browser-local identity through
  a WeakMap. Existing logical object fields/JSON shapes remain unchanged; no
  removed-object history is retained. IDs are not reused after clear.

Shared exports include both original config tables, the exact four-type pool,
`curiosityPosition`, `looseDropPosition`, and presentation-neutral
`curiosityAppearance` values for rotation, flutter and glint. Synchronous
notifications contain `{ kind, item, id, reason }`, with `curiosity-added`,
`curiosity-removed`, `drop-added`, and `drop-removed`. Pending changes need no
display object or notification log. Source references in the bounded pending map
are pruned on logical passes and explicitly cancelled by Pixi removal callbacks.

## Preserved visitor and Amanita semantics

Only a successful live TCPNoise specimen whose normalized `seenCount` is exactly
the string `"1"` can trigger a first-seen visitor. This is source-provided count
one, not global uniqueness. Rejected/saturated frames, fake/local events, and
other count representations do not trigger it. Ladybug, snail, moth and shiny
pebble retain equal selection through the original random pool, cap three,
20-second lifetime, 9px hit radius and 14px placement padding. Cap skips do not
roll placement or queue a retry. Origin remains the exact source cell center;
type, angle, radius 18–22px and phase retain their original random-call order,
with the same edge reflection. Movement is derived without mutating state:
ladybug wander, slow directional snail movement, moth flutter/wander, static
pebble. Active visitors remain independent of their source's later lifetime.

Only successful real TCPNoise mushrooms receive the independent 1% Amanita roll;
the exact boundary remains `0 <= roll < .01`. A success records one pending
attempt keyed by the **exact specimen reference**, activating after five seconds.
Angle, radius and phase are selected when scheduled, never rerolled at activation.
The ordinary shared species timing query plus the original mutation-expiry guard
preserve source-liveness semantics. Natural expiry, replacement, manual removal
and clear cancel an attempt; a new object in the same cell cannot inherit it.

Pending attempts are separate from active drops and are bounded by living source
capacity (640), with one entry per reference. Each pass prunes dead sources.
Hidden documents still prune and expire active objects, but defer due activation.
Resume activates currently eligible pending objects once, using resume time for
their new 20-second lifetime. Every due attempt is consumed, including cap-three
skips; no retry backlog or missed-tick replay exists. Active Amanita is an
independent six-field object with its original 9px hit radius, 14px padding and
0.6px vertical sine bob. It never mutates its source or claims a cell, and does
not contain network provenance.

For mushrooms with count one, the shared trigger retains production ordering:
drop chance and schedule placement first, then curiosity type and placement.
The Pixi transport adapter now leaves the shared specimen core's `tcpnoise`
origin kind intact, instead of renaming it `live`; HUD live/simulated labels are
unchanged. Its success callback triggers ambient rules only after insertion,
and its exact-object removal callback immediately cancels pending source state.
The shared specimen model itself was not edited.

## Canvas adapters and persistent Pixi views

`garden-curiosities.js` and `garden-drops.js` retain Canvas artwork, newest-first
hit helpers, exact collection messages, collection sound calls and repainting.
Creation/lifetime/movement delegate to the shared ambient model; collection calls
its exact-object removal APIs. `gardenState` compatibility accessors expose the
shared arrays, and `pendingLooseDrops` aliases the shared map. Existing global
function seams remain available. No Canvas renderer, FPS budget, base dirty flag,
or overlay scheduling redesign was introduced.

Pixi's `pixi-live-ambient.js` builds one startup atlas containing **five frames**:
ladybug, snail, moth, shiny pebble and Amanita. A single 320×64 source at 2x
resolution uses about 80 KiB RGBA before driver overhead. Temporary construction
geometry is destroyed immediately. Total retained caches are now **780 frames
across three GPU sources**: 762 specimen/rain/probe, 13 ecology, five ambient.
No event, activation, animation frame, glint or collection creates a texture.

Each active ambient object has one persistent Sprite, mapped by its logical ID.
Only its position/rotation/scale changes during animation; expiry/removal destroys
that exact Sprite. At most three visitors plus three drops are traversed per
animation frame. No specimen/grass scan or scene rebuild accompanies those
transforms. Moth flutter scales the cached whole Sprite, a small artwork
approximation; the cached pebble highlight is static rather than periodically
glinting. Canvas art/animation remains exact, including its glint.

Root order follows production's overlay intent: soil/grid/darkness → grass →
puddles → vine links/specimens → **loose drops → curiosities → rain** → probe/mask.
Two lightweight ambient containers are added, with no additional canvas. Clear
leaves **14 fixed display objects**. Full dense seeding produces 640 specimens,
640 grass, eight puddles, three visitors, three Amanita and 64 vine Graphics:
**1,372 display objects**, plus 400 lightweight hurricane particles. With ambient
objects expired, the same otherwise unchanged state has 1,366 display objects.

The dense button includes one local simulated 3+3 ambient sample. The separate
**Seed 3 visitors + 3 Amanita (local simulated)** button cycles through the four
visitor types while respecting each three-object cap. Samples use normal
20-second lifetimes; they do not freeze, extend or repeatedly respawn themselves.
No backend traffic is sent. Pixi still has no collection/click routing, messages,
inventory, Score, audio or inspection card. Its HUD reports active/view counts,
pending count, creation/expiry and schedule/activation/cancellation/cap-skip
counters, plus the fixed five-frame cache.

## Verification for the ambient slice

`tests/fixtures/production-ambient.json` freezes the pre-refactor implementation
at `dbca0cc`: all four visitor types plus Amanita, corner/interior placement,
original logical object/pending fields, movement and exact Canvas commands/styles
at **75 samples** through flutter/glint/bob/expiry. The extracted shared rules and
Canvas adapters match those fixtures exactly.

New `tests/garden-ambient.cjs` checks the frozen oracle, exact configs/live
eligibility/RNG order, identity, cap consumption, timings, exact-source
expiry/removal/clear/same-cell replacement, hidden deferral/resume and lack of
timers. New `tests/pixi-ambient.cjs` checks persistent view ownership, exact
removal, static pebble, repeated seed/expiry/clear cycles, bounded textures and
immediate exact-source replacement cancellation. The existing Pixi entry-point
test now drives real ambient controls and live callbacks, preserves views across
weather changes, tests hidden pending activation and expiry, and verifies
1,372 dense / 14 cleared display objects. Headless tests make no GPU FPS claims.

Existing Canvas curiosity/drop suites retain all expectations, including +0
messages, optional sound, scaled click priority, provenance independence,
hidden behavior, zero base rebuilds and the existing 30 FPS overlay scheduling.
Independent browser harnesses load the new shared dependency; resource-count
expectations account explicitly for two added Pixi containers.

`dotnet build` passed with zero warnings/errors, .NET checks passed, all **27**
Node/browser entry suites passed, and `git diff --check` passed. An initial
preview launch hit the existing preview process's apphost file lock; stopping
that old preview and rerunning the normal build resolved it. The refreshed
preview runs through the DLL host. Backend sources, shared specimen core,
ecology modules and synthetic stress files have no diff.

### Observed ambient browser run (2026-10-15)

The preview received actual collector input from the previously supplied NATS
endpoint and real weather over the existing single SSE connection. No synthetic
publisher or fake SSE stream was substituted. WebGL/native ticker at 1280×1000,
1218×650 presentation/backing, DPR 1. Timings are local ticker intervals, not GPU
completion measurements.

| Case | Duration | Session average FPS | Session worst interval | >50ms / >300ms |
| --- | ---: | ---: | ---: | ---: |
| Isolated dense hurricane, including normal narrow/restore resize | 69.6s | 60.0 | 22.8ms | 0 / 0 |
| Dense ecology + ambient lifecycle samples + hurricane + actual SSE | 375.8s | 60.0 | 19.1ms | 0 / 0 |

The second sample reset measurements after seed/weather setup. Initial state:
640 specimens, 640 grass, eight puddles, three visitors, three Amanita, 64 vine
Graphics, 1,372 display objects and 400 rain particles. One additional **ambient
only** local 3+3 batch was seeded during the continuing run. Each batch expired
normally after 20 seconds; no lifetimes were frozen or extended, and there was
no automatic ambient reseeding. Naturally triggered first-seen visitors also
appeared. Thus six ambient objects were present during finite lifecycle windows,
not continuously for six minutes.

At the final observation there were 354 specimens (185 simulated, 169 live),
640 grass, eight puddles, zero active visitors/drops, 177 vine Graphics with 278
connection halves, **1,193 display objects**, and 400 rain particles. Natural
specimen expiry/replacement reduced density without periodic garden reseeding.
Grass briefly reached 639 during ordinary expiry/spread and returned to 640.
Cache counts remained **762 + 13 + 5 = 780 frames / three sources** throughout.

The run accepted **171 additional actual events**, made 20 additional specimen
replacements and 437 lifecycle removals, and refreshed puddles 23 additional
times. Visitor counters recorded eight naturally triggered first-seen creations
beyond the known local seed batches. A live moth was visible in a sampled
screenshot. No natural Amanita roll succeeded in this run (`dropsScheduled`
remained zero); its live gate, 1% boundary, activation and cancellation are
verified deterministically rather than claimed as rare manual observations.

All four local visitor visuals and red-cap/white-spot Amanita were inspected.
Sampled views showed small visitor movement, moth flutter, static pebble position
and slight drop bobbing; natural expiry removed their views. Rain/probe/vine/live
updates remained coherent in samples, without recurring 300–500ms gaps. No
browser errors or warnings were captured. No continuous video, GPU profile or
heap profile was recorded, so these observations do not certify uninterrupted
subjective presentation smoothness or long-duration driver memory behavior.

Normal isolated resize to 390×844 and back retained one canvas, contain layout
and bounded caches. The prior 250.7ms special concurrent Canvas/Pixi anomaly was
**not reproduced** in this normal isolated workflow; no broad resize profiling
was undertaken. Clear/refill and live/manual weather switching are covered by
the actual entry-point test and browser controls; Pixi collection remains absent.
Hidden/resume source cancellation, deferred activation and exact expiry are
tested through the actual registered callbacks with deterministic clocks;
browser-level suspension was not manually verified in this slice.

A sequential production Canvas check observed real specimen growth, grass
patches, fake DNS/HTTP/Gopher growth, a storm puddle, hurricane rain and switching
back to Live weather, with no browser errors. Rare Canvas visitor collection,
Amanita source cancellation/collection and their messages were not individually
observed manually; the unchanged integration suites and frozen oracle verify
those paths deterministically. No audible collection sound was manually checked.
After returning to Pixi, Clear removed all seeded views and left 14 fixed display
objects with all caches retained. A fresh-page startup/clear workflow recorded
one 100ms startup interval, without recurring stalls or any >300ms gap; it is
separate from the reset 375.8s steady-state benchmark.
After unpausing, actual input refilled 63 live specimens; five additional real
visitors appeared and expired, while grass stayed at zero as required for real
TCPNoise events. Cleared terrain/ambient views did not remain in the scene.

Ignored local evidence: `artifacts/pixi-ambient-observations.json`,
`artifacts/pixi-ambient-dense-start.jpg`, `artifacts/pixi-ambient-six.jpg`,
`artifacts/pixi-ambient-expiry.jpg`, `artifacts/pixi-ambient-soak.jpg`, and
`artifacts/ambient-production.jpg`.

### Changed files in this slice

- Shared model: `wwwroot/garden-ambient.js` (new).
- Canvas adapters/integration: `wwwroot/garden-curiosities.js`,
  `wwwroot/garden-drops.js`, `wwwroot/garden.js`, `wwwroot/index.html`.
- Pixi adapter/presentation: `wwwroot/pixi-live-ambient.js` (new),
  `wwwroot/pixi-live-core.js`, `wwwroot/pixi-live.js`, `wwwroot/pixi-live.html`.
- New verification: `tests/garden-ambient.cjs`, `tests/pixi-ambient.cjs`,
  `tests/fixtures/production-ambient.json`.
- Existing harnesses: `tests/garden-audio.cjs`, `tests/garden-events.cjs`,
  `tests/gnome-events.cjs`, `tests/pixi-ecology-integration.cjs`,
  `tests/pixi-ecology.cjs`.
- Documentation: `docs/PIXI-LIVE.md` (this file; earlier observations retained).

## Remaining parity and next slice

Specimen mutations/collectible weed, opium, gnomes, inspection card, Recent
activity UI, general interaction/collection routing, Score and audio remain
deferred in Pixi. Recommended next slice: shared mutation/pending lifecycle and
persistent mutation presentation, followed by unified interaction once all
collectible state is represented. Keep production Canvas and preserve the
separate synthetic stress benchmark.

---

# Historical ecology slice (2026-10-14)

The following architecture/measurements describe the prior ecology slice, before
ambient state was added. Its deferred-curiosity/drop statements and counts are
historical; current ambient behavior and cardinalities are described above.

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
