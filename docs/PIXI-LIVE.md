# Gnome weed harvest and underpants (2026-10-21)

Implemented in both renderers through the existing shared models. `weed_harvest`
is a third landscaping mode: at least **three mature ordinary weeds**, a strict
**5%** roll on the existing **45-second** check and the same **seven-minute**
arrival cooldown. Priority remains fight → overcrowding → vine → harvest;
overcrowding failures never fall through, while a failed vine roll may allow
eligible harvesting. Existing probabilities remain 2% / 25% / 10% for those
earlier checks. A worker and suspicious burlap-sack carrier visit **1–3 original
targets**, sharing the travel/snip/departure lifecycle and authoritative removal.

Exact reference/id, cell/coordinates, creation time, lifetime, maturity and
ordinary/protected status are revalidated before each cut. Rare palettes,
mutations/pending mutations and weeds with **pending bud drops** are excluded.
New replacements are never chased; active independent buds survive parent
harvesting. The carrier follows the worker and hands over the single sack for
departure. Hiding or a >1.5-second logical stall cancels safely without catch-up;
reduced motion keeps static poses and discrete travel. No additional scheduler.

All active gnomes are clickable before curiosities, loose drops, mutations and
specimen/grass inspection. Both renderers record the logical transform actually
used to paint the actor, then centralized hit testing applies its inverse
rotation, including travel, shove and bounce offsets. Removed, hidden, expired,
unpainted or zero-opacity actors cannot be clicked. There are no per-Sprite
browser handlers. Repeated clicks still consume the click without touching an
underlying plant or drop.

Each actor has **one underpants attempt per appearance**, plus a **600ms**
surprise pose. A full shared **five-drop cap** consumes the attempt without
retry/eviction. White underpants with waistband and leg openings use the
existing loose-drop array, notifications and Sprite ownership. They live
**20 seconds independently** after their gnome leaves. Collecting chooses:

- `< 0.8`: `You stole a gnome's underpants. +0 points`
- `>= 0.8`: `Collected underpants +1, annoyed gnome -1`

Only strings are chosen: no score arithmetic, annoyance totals, inventory,
network provenance/events, Recent activity or acceptance statistics. Existing
two-second messages and optional collection audio are reused. Score remains 0.
Existing Amanita, bud and port-22 mutation rules/messages remain intact.

`/pixi-live.html` alone adds **Trigger weed harvest (simulated)**, **Seed mixed
gnome drops (simulated)** and an explicit message-boundary selector. The harvest
button seeds mature simulated weeds when necessary, retaining cooldown/exclusion.
The mixed fixture fills five slots with Amanita, bud and underpants artwork;
ordinary clicks still enforce the one-attempt rule. The selector wraps on narrow
screens. Public pages expose none of these diagnostics; changed scripts/styles
have new cache versions.

Resource bounds:

- Gnome atlas **14 → 21 frames**, still one startup bake/source: two sack poses
  and five surprise variants. Backing **1120×64 → 1680×64**, **+140 KiB RGBA**.
- Ambient atlas **6 → 7 frames**, still one startup bake/source, for one
  underpants frame. Backing **384×64 → 448×64**, **+16 KiB RGBA**.
- Total added atlas pixels cost **156 KiB RGBA** before driver/mipmap overhead.
  At most four actor Sprites/one temporary group and five shared drop Sprites;
  no per-click textures, render passes, geometry generation or extra loops.
- Painted transforms reuse each appearance object in a WeakMap; no population
  scans during hit animation and no retained departed-actor lists.

Validation: `tests/gnome-harvest-underpants.cjs` covers exact 5% and 80/20
boundaries, priority/cooldown, maturity/protection/pending buds, identity-safe
sequential cuts, all incident clicks, moving/fighting poses, cap consumption,
independent expiry, unchanged score/statistics, Canvas/Pixi parity and 25 repeated
resource cycles. All 57 Node entry points passed. Focused Chrome uses real
centralized clicks, both messages, 20 cleanup cycles, and normal-scale captures.
Every cycle ended with zero gnome/drop views and destroyed owned Sprites, with
one bake per atlas. The full Chrome suite passed, including the 320px diagnostic
layout, legacy cache upgrades, existing incidents/audio/storm/lighting/Stillbloom,
Canvas and stress-page regressions. Debug/Release isolated builds and backend/SSE checks passed;
the checks-project build reported NU1900 for the unavailable vulnerability feed.

Captures and resources are in `artifacts/gnome-harvest/browser/`:
`harvest-pixi-day.png`, `harvest-pixi-surprise.png`, `harvest-pixi-night-sack.png`,
`underpants-pixi-departed.png`, `underpants-pixi-mixed-{day,night}.png`,
`harvest-canvas-day.png`, `harvest-canvas-surprise-night.png`,
`underpants-canvas-mixed-{day,night}.png`, and `gnome-harvest-resources.json`.

Chrome's existing gnome timing probe observed approximately 16.68ms average
ticker intervals and 0.13–0.19ms average CPU render submission in quiet/storm
samples. These are local observations, not GPU completion or a long live-traffic
soak. Other browsers remain unverified. Earlier dated notes below retain their
original resource counts and interaction priorities as historical snapshots.

# Ditch Weed Bud (2026-10-21)

The shared loose-drop cap was subsequently raised from three to **five** for
both renderers. The mixed diagnostic fixture still seeds three objects; visitors
and collectible mutations retain their separate caps of three.

Implemented through the existing shared `garden-ambient.js` loose-drop registry,
pending-source map, logical tick and removal notifications. Successfully placed
live TCPNoise canonical weeds get one strict **3%** creation roll, with no port
restriction or rerolls. Buds activate at the exact source's **60-second maturity**;
reference/id, occupancy, coordinates, creation time, ordinary eligibility and
lifetime are checked again. Pre-activation removal/replacement/expiry/collection
or clear cancels the pending object. A replacement cannot inherit it.

An activated bud has an independent **20-second** lifetime and never alters its
parent. Buds and Amanita share **five active drops total**. Due cap skips are
consumed without retry, eviction or backlog. Amanita retains its 1% mushroom roll,
five-second delay, parent cancellation and original hidden/resume behavior.
Buds missed while hidden or over **1.5 seconds late** are discarded instead of
appearing on resume. Existing port-22 mutation rules and message are unchanged.

Collection retains curiosity → topmost loose drop → mutation → inspection
priority. It removes only the selected object, says
`You smoked some ditch weed. +0 points` for two seconds, and uses the existing
optional collection sound. No source changes, cells, grass/puddles, acceptance
statistics, Recent activity, scores, smoke effects, new loops or backend changes.

Both renderers draw the same small olive-green cluster of seven overlapping
pointed leaves and a shaded interior. The bud stays still with all motion
preferences. Canvas draws on its existing overlay without invalidating the base.
Pixi adds **one finite frame** to its startup ambient atlas: **5 → 6** frames,
still **one GPU source**, with backing **320×64 → 384×64** at resolution two.
That adds **16 KiB RGBA** before driver/mipmap overhead. At most five loose-drop
Sprites share this atlas; the bake count remains unchanged. Collection/expiry/clear destroy owned Sprites.
There is no runtime geometry or texture generation for buds.

Development-only **Seed weed buds (simulated)** replaces local fixture state with
two simulated weeds, a mushroom, grass, one nearby bud and a partially overlapping
Amanita/bud pair. All five drop slots are shared, all drops expire normally,
and incoming counters/activity remain untouched. The public pages expose no new
development controls. Changed scripts have new cache versions.

Validation and captures for this slice live in `artifacts/ditch-weed-bud/`:

- `tests/ditch-weed-bud.cjs`: deterministic probability/one-attempt boundaries,
  all-port eligibility, maturity, exact identity/cancellation, independent
  lifetime, shared cap/no retries, hidden/late deadlines, Canvas/Pixi collection,
  unchanged stats/activity, reduced motion, diagnostics and 30 resource cycles.
- Chrome regression adds real overlapping-drop clicks, reduced-motion positions
  and 20 create/collect/expire cycles. Ambient frames/source/bake counts stay
  **6 / 1 / 1**; each cycle ends with zero views and destroyed owned Sprites.
- Eight normal-scale captures: `browser/weed-bud-{pixi,canvas}-{nearby,grass,mixed,night}.png`.
  They show the ordinary weed/bud distinction, grass coexistence, mixed Amanita
  art and local-time night tint. Historical renderer artwork differences remain.
- All 56 Node entry points passed, including the optional browser entry points'
  default skip paths. The complete opt-in Chrome suite and focused bud pass also
  passed, covering cache upgrades, collections/audio, both gnome modes, storms,
  lighting, Stillbloom, Canvas and stress-page regression.
- Isolated Debug and Release application builds passed with zero warnings;
  backend checks and the actual ASP.NET polling → SSE integration passed.
  The checks-project build emitted NU1900 because the NuGet vulnerability feed
  was unavailable. No backend code/contracts were changed.

The fixtures prove behavior and bounded object/texture ownership, not long-lived
GPU/compositor smoothness. Other browsers and a long real-traffic soak remain
unverified. Build output is isolated because a running local PacketGarden host
can lock the usual executable. NuGet vulnerability-feed availability is separate
from application build/test success.

The sections below retain the history of earlier feature slices.

# Stillbloom (2026-10-21)

> **Current Pixi parity note (2026-10-21):** This document intentionally retains
> dated, historical migration snapshots farther below. Statements in those older
> sections saying Pixi lacks loose Amanita drops, first-seen visitors, collectible
> weed mutations, inspection/collection, gnomes, audio or grass are **no longer
> current**. Shared Canvas/Pixi models and current cached Pixi artwork now cover
> those features; [README](../README.md) and [MVP](MVP.md) summarize current
> behavior. Ordinary-weed buds and clicked-gnome underpants are now implemented;
> opium pods and frogs remain future work. Canvas-specific fake-traffic/
> numeric weather controls and Pixi-only storm bolts remain intentional differences.

`garden-stillbloom.js` is one renderer-neutral scheduler, called by the existing
250ms Canvas/Pixi logical tick. Organic growth requires connected SSE, Live
weather, a validated snapshot, healthy upstream telemetry, an unexpired
30-second certificate and authoritative `level === "quiet"`. Rates, zero traffic,
initial fallback, manual previews and local lighting never establish calm.
Ten continuously observed minutes earn one 10% roll; later checks are three
minutes apart. Failure, full occupancy or two living flowers consumes that
deadline without retry. At most one flower is added per interval. Hidden time,
SSE disconnection, stale/unhealthy data, non-quiet weather, a continuity change
or a >1.5-second logical stall resets qualification. No hidden/catch-up rolls.

The weather adapter retains rendering values during outages, but now publishes
`telemetryHealthy`, `freshUntil` (Unix milliseconds) and `telemetryGeneration`.
Failures invalidate immediately; same-value recovery increments continuity.
Successful polls remain every ten seconds with five-second timeouts. A
30-second lease renews with <=15 seconds remaining (normally every 20 seconds),
with scheduling margin rather than a broadcast on every unchanged poll. The
existing adapter and SSE pump own this; there are no extra loops or providers.
See [the additive contract and clock limitation](REAL-DATA.md#upstream-health-and-stillbloom).
Older clients keep rendering; old backend frames without health cannot certify
organic quiet. This proves successful snapshot polling, not independent health
of every upstream collector or completeness of global network observations.

The authoritative garden adds at most two Stillblooms to free cells, with no
displacement. The ambient species is excluded from normalized garden/TCPNoise
events, ordinary fake-event mappings, normal cosmetic rarity rolls and both
landscaping modes; stronger-growth competition protects it. Placement uses the
normal occupancy/grass-clearing lifecycle. Existing specimens are never removed
to make room, and subsequent weather cannot kill a Stillbloom. Inspection says
**Sustained quiet**, with em dashes for sensor/port/seen count/vigor. Simulated
flowers say **Simulated Stillbloom**. No incoming acceptance counts, fabricated
network events, Recent activity, grass influence, drops or sound are produced.

Lifecycle: sprouting until 30 seconds, growing until 90 seconds, maturity until
minute 17, then gradual fading/shrinkage through removal at minute 20. Young and
fading flowers use bounded one-second visual deadlines; mature flowers are
static. Canvas draws thin silver-green leaves/stem and five overlapping ivory
cup petals with lavender/blue details. Pixi has four cached poses and one Sprite
per flower; a faint baked halo needs no particles or dynamic geometry. Existing
day/night lighting and its checkbox affect only appearance.

The main atlas grows **763 → 767 frame objects**, retaining its **2048×1536**
backing allocation (~12 MiB RGBA), source count and startup generation count.
Four extra owned Graphics contexts are released after baking. Existing frame
slots/art and other atlases remain. There is no per-frame flower geometry,
texture generation or eligibility scan; at most two flowers receive the slow
lifecycle transform/opacity updates.

Only `/pixi-live.html` loads `garden-stillbloom-dev.js`. **Trigger Stillbloom
(simulated)** exercises real local placement/cap without certifying weather.
Separate virtual controls advance a private shared-rule simulation through
verified quiet, ten-minute qualification, rain, stale/disconnected telemetry,
recovery, `.099999` success / `.10` failure and the two-flower cap. Its state
and results are labeled Simulation and cannot feed the organic scheduler.
Existing Lighting presets provide day/night inspection. Public pages expose no
Stillbloom diagnostics.

Validation includes `stillbloom.cjs` and `stillbloom-integration.cjs`: exact
weather/health/deadline/probability/cadence boundaries; fallback/legacy/stale
data; real registered SSE disconnect/reconnect handlers; hidden/stalled/manual
exclusion; full cells and protected targets; origin/counters/activity; aging;
Canvas/Pixi parity under both motion preferences; and twenty growth/removal
cycles with unchanged frame/source/generation/live-object counts and teardown.
Backend checks cover normalization, exact 30-second staleness, ten-second
unchanged polls, renewal and same-value failure/recovery. Actual ASP.NET/local
snapshot integration covers the full polling-to-SSE path, including retained
values, reconnection, unchanged recovery and lease renewal. NATS/TCPNoise tests
retain all existing mappings/rarity outcomes.

The Chrome runner supports a focused capture pass:

```powershell
$env:PACKETGARDEN_BROWSER_OUTPUT = 'artifacts/stillbloom/browser'
node tests/pixi-default-browser.cjs --run --stillbloom-only
```

Ignored screenshots cover young/growing/mature, day/night, alone/among ordinary
specimens, fading and quiet-to-rain, plus Canvas day/night. `stillbloom-resources.json`
records 120-frame samples. Initial focused results: two flower Sprites, 767 main
frames; ~16.68ms mean ticker interval and .208ms mean CPU submission for the
two-flower daytime scene. The different mixed fading/rain fixture measured
.348ms mean submission. These scenes are not a before/after speed comparison,
and CPU submission does not measure GPU completion. Repeated live-traffic
soaks, other browsers/devices and comprehensive heap/GPU profiling remain.

The normal build output was locked by an already running PacketGarden process;
validation uses isolated `artifacts/stillbloom/build` and `checks` outputs without
stopping it. Main build passes with zero warnings/errors. Backend checks retain
NU1900 vulnerability-feed warnings when NuGet metadata is unavailable. No
server persistence, classification thresholds, port mapping or NATS changes.

# Fuller wild grass and natural recovery (2026-10-20)

Canvas and Pixi now share 12 finite grass recipes in `garden-grass.js`: broader
curved blades, three low groundcover clumps and two or three irregular taller
fans, with four muted shade groups. The healthy shared tint is richer green;
the yellow/brown/dead color anchors, growth, decline, opacity, inspection and
visual deadlines remain. Canvas's rounded blobs and Pixi's thin highlighted
fans are replaced. Grass still sits below puddles and specimens, and passes
through the existing local-time surface light. No lighting/weather/audio rules change.

Pixi retains **12 grass frames + one unchanged puddle frame**, one source,
1664×128 backing (~832 KiB RGBA), and **one Sprite per grass cell**. Construction
uses 12 temporary Graphics, released after the single startup bake. Shared
recipes use private deterministic randomness, consuming no ecology or specimen
rolls. Mature turf creates no frame geometry, texture or transform work; Canvas
keeps the existing cached-base scheduling. Neighboring clumps can overlap while
leaving organic soil gaps. The artwork introduces no continuous grass animation.

Both entry points now call shared `seedInitialGrass`: **12** random seeds, one
per distributed region, skipping occupied cells (and skipping a full region).
Ordinary spread remains **4 seconds / 50% / 1–4 bounded attempts** from suitable
mature turf, excluding occupied destinations and never refreshing parents.
Fading still begins at 20 minutes, dying at 27, dry at 32, expiry at 35; the
bounded one-time 40% fading seed opportunity is unchanged. Three fixed-seed,
traffic-free simulations produced 29–31 patches at two minutes and 245–258 at
ten minutes. This supported keeping the existing spreading probability.

The shared ecology's grass tick now also runs with zero grass. Natural recovery
checks at most once per **60 seconds**. Only **zero living patches** and **at
least eight unoccupied specimen cells** permit **one 25% roll**. Success chooses
one random empty cell and calls `influenceGrassCell`, which rechecks occupancy;
failure or a newly occupied target produces no retry. At most one new patch is
created. Surviving dry/unexpired turf also suppresses recovery. The occupancy
scan is bounded at 640 cells, only on a due empty-population check; normal frame
work gains no occupancy scans. Hidden ticks skip rolls, visibility transitions
reset a fresh minute, and whole missed check windows are discarded, with no
catch-up loop. This allows complete grass loss followed by gnome/expiry soil
release, a possible natural seed, then ordinary neighboring spread. Isolated
free cells may still prevent spreading until adjacent soil opens.

This is uncertain ambient ecology: specimen removals do not directly plant
grass. No changes to SSE/NATS, provenance, accepted growth statistics, Recent
activity, specimen capacity/lifetimes/rarity, collectibles or gnome rules.

## Visual comparison and reproduction

The installed-Chrome artwork runner adds `--green-grass`, preserving older art
fixtures. This comparison uses committed baseline
`dd7f4356b6ed3bcbc3d1d7c3683e1c1af9d76301`; an explicit checkpoint keeps it
reproducible after later commits. Use the already available Playwright/Chrome
runtime, without installing dependencies:

```powershell
node tests/pixi-vine-art-browser.cjs --run --green-grass --checkpoint=dd7f4356b6ed3bcbc3d1d7c3683e1c1af9d76301 --baseline --seconds=5
node tests/pixi-vine-art-browser.cjs --run --green-grass --checkpoint=dd7f4356b6ed3bcbc3d1d7c3683e1c1af9d76301 --seconds=5
```

Ignored `artifacts/grass-green/before/` and `after/` hold full-size Pixi and
Canvas captures, 720px Pixi captures, atlas images/bounds, pixel checks and timing
JSON. `comparison.png` places both renderers' before/after screenshots together.
Fixtures use identical simulated specimen coordinates, grass ages/positions,
weather and lighting: sparse young grass, expanding young clusters, 256 moderate
patches, 512 dense patches with empty cells, mixed 160 specimens/384 grass,
640 fading/dying/dry cells, fixed daytime/night and hurricane/eight puddles.

Normal-scale inspection showed fuller, greener overlapping clumps replacing
the separated thin fans and round Canvas blobs, while retaining open soil,
young-to-mature size differences, fading straw/brown cues and clear specimens.
The first review prompted more irregular clump positions and a correction to
an atlas-margin overhang. The fixture's night preset now explicitly applies
its surface matrix before capture. Night turf stays readable and rain/puddles
retain their layer order. Finite patterns remain discoverable in artificial
uniform fields; this is stylized grass, not a continuously animated lawn.

Pixel checks find **2.69% → 9.57%** mean nontransparent grass-tile coverage,
with transparent frame margins in all 12 variants. This measures atlas ink,
not a percentage of garden soil. Every plant/mutation/rain/probe atlas pixel
and the puddle tile remain byte-identical. Frame dimensions/counts and scene
object counts are unchanged for comparable populations. Startup's seven extra
seed Sprites are the only deliberate initial object-count increase.

## Validation and limits

All **53 Node test entry points** pass, including new `grass-recovery.cjs`:
distributed seeding, exact `.25`/eight-free-cell boundaries, failed checks,
occupancy revalidation/no retry, suppression with survivors, expiry/real gnome
recovery, bounded scans, hidden/resume/no catch-up, unchanged spread/lifetimes,
and Canvas/Pixi state parity. Twenty application recovery/clear cycles retain
fixed texture generation, atlas frames and live-object counts, and teardown
releases ownership. Existing artwork/deadline/occupancy/inspection/lighting/weather
tests remain; Canvas grass command snapshots were deliberately updated for the
reviewed artwork, while original puddle command snapshots remain unchanged.

Installed Chrome passes the full root/index HTTP-cache/SSE/resize/inspection,
audio, gnomes/both landscaping modes, hidden/reduced-motion, lighting/night
rain/bolt, Canvas and stress regression suite, plus this artwork comparison.
`.NET build` passes with zero warnings/errors; backend checks and actual ASP.NET
weather-to-SSE integration pass. Backend checks retain NU1900 warnings because
the NuGet vulnerability-data service is unavailable; no backend code changed.

The five-second artwork samples report CPU render submission and ticker
intervals, not GPU/compositor completion. Grass produces zero recurring Graphics
calls or texture generations in these frozen-state samples, and no display
object growth. The final full comparison ran after the regression browser closed:

| Fixture | Grass / display objects | Mean CPU submission before → after |
| --- | --- | --- |
| Moderate mature | 256 / 273 | .098 → .108ms |
| Dense mature | 512 / 529 | .112 → .121ms |
| Fading/dying/dry | 640 / 657 | .110 → .118ms |
| Mixed specimens + grass | 384 / 577 | .113 → .131ms |
| Mixed + hurricane/puddles | 384 / 585 | .177 → .204ms |

Revised mean ticker intervals were about **16.68ms**, with no >50ms gaps in
these short samples. Timing differences this small are noisy and are not a
speedup/regression guarantee. A separate matching 512-patch Canvas fixture,
12 deliberately forced `drawGarden()` repaints, measured **4.27 → 4.78ms mean**
and **6.30 → 7.60ms worst**. This includes base drawing and overlay submission;
it is not a per-frame cost. Static mature grass still schedules no routine base
repaint, while growing/fading art uses the existing bounded visual deadlines.
Reproduce that focused measurement with `--scene=grass-mature`, `--baseline`
and `--label=canvas-before`, then without `--baseline` and with
`--label=canvas-after`; JSON/captures are saved in those separate directories.
Allocation checks cover display objects, cached
textures and geometry ownership, not a heap-allocation or GPU-memory profile. Longer live
NATS soaks, other browsers/devices/GPUs and extended visual tuning remain.
Historical measurements below describe their older checkpoints.

# Local-time lighting (2026-10-20)

**Day/night cycle** is checked by default beside Lightning on both Pixi pages,
with the same control near Sound on Canvas. Unchecking applies daylight and
skips routine clock sampling. Rechecking immediately restores current local
lighting (or the retained diagnostic preset/hour on `/pixi-live.html`). Preview
controls are disabled while off. The preference is page-local, independent of
Lightning, and introduces no persistence, geometry rebuilding or timers.

Pixi's default/diagnostic gardens and the Canvas fallback now share
`garden-lighting.js`: browser-local hours, fixed anchors, smoothstep interpolation,
30-second sampling and a quantized sRGB color matrix. Only presentation changes.
There are no backend, SSE/NATS, specimen, ecology, rarity, growth, provenance,
activity or sound changes, and no extra timers, dependencies or persistence.

| Local hours | Transition |
| --- | --- |
| 22:00–05:00 | Readable blue/purple night |
| 05:00–06:00 | Night to soft cool dawn |
| 06:00–09:00 | Dawn gradually warms into day |
| 09:00–16:00 | Original day appearance |
| 16:00–18:00 | Day to gentle amber golden hour |
| 18:00–20:00 | Golden hour to cooler purple dusk |
| 20:00–22:00 | Dusk to night |

Local `Date` components are read afresh at each sample, so timezone/DST changes
are not stuck behind a cached UTC offset. Backwards clock jumps trigger a fresh
sample; the existing Pixi ticker can refresh overdue light after a backwards
jump while leaving ecology's logical deadline untouched. Hidden pages perform no visual sampling;
resume forces one current-time sample with no transition backlog. Reduced motion
uses the same slow light, with no added animation; existing lightning suppression
still applies. Visual components are rounded to 1/512, less than half an 8-bit
color level, and identical matrices cause no DOM/style writes.

`garden-lighting-view.js` applies one diagonal RGB-plus-bias SVG color matrix to
the existing rendered surface: Pixi's canvas, or Canvas's `.garden-stage`
containing its two canvases. The zero-size SVG definition is static page markup;
UI, inspection cards, messages and Recent activity are outside the filter.
There are no new Pixi objects, textures, filters or per-specimen changes, and no
Canvas bitmap copies, geometry rebuilds or new RAF. The daytime identity matrix
sets CSS `filter: none`. Colored phases add **one browser compositor color pass**;
its offscreen surface allocation/GPU cost is outside Pixi's resource counters.
Teardown clears the CSS filter, disables sampling and detaches diagnostic handlers.
Canvas `?perf=1` snapshots and the Pixi HUD expose bounded sample/update counters.

Night retains blue light and a small color floor rather than using a black
overlay. Existing ghostbloom halos and crystal highlights therefore stand out
against cooler terrain without adding glow to ordinary specimens. Distinct
species hues remain recognizable. Golden hour gently warms existing colors;
there are no directional/lengthening shadows. Weather's existing soil darkening
and rain are preserved, with a small night-only matrix compensation for severe
darkening. Rain stays visible, and the existing lightning passes through the
same light without extra intensity, flashes, sound or changed eligibility.

Only `/pixi-live.html` has **Lighting**: Live local time, Dawn (06:00), Day
(12:00), Golden hour (18:00), Dusk (20:00), Night (00:00), plus Simulated hour.
The **Simulated local hour** slider spans 0–24 in .05-hour steps and switches to
that manual mode. Returning to Live restores actual local time. Overrides stay
in this page's memory. `/`, `/index.html` and `/canvas.html` always start live
and expose no lighting controls. Canvas tests call its shared controller directly;
there is no public query-parameter override.

`node tests/garden-lighting.cjs` covers exact anchors, smooth boundaries/midnight,
real Node timezone interpretation, live/manual behavior, clock/provider changes,
weather/bolt bounds, reduced motion/hidden resume, both production adapters and
cleanup. In a mature 640-specimen fixture, **120 lighting changes cause zero
Canvas base rebuilds or Pixi sprite/texture/geometry/vine-neighbor changes**.
Existing rendering/performance and ecology tests retain their assertions.

The installed-Chrome runner adds `--lighting-only` for focused visual QA:

```powershell
$env:PACKETGARDEN_BROWSER_OUTPUT = 'artifacts/local-lighting'
node tests/pixi-default-browser.cjs --run --lighting-only
```

Use the already available Playwright runtime/installed Chrome (normal module
resolution or `NODE_PATH`); no application dependency is added. The full runner
also includes these checks. Captures freeze the same 240-specimen garden with
grass and water at dawn/day/golden/dusk/night, plus night hurricane and a frozen
55ms bolt. Canvas captures all five phases with the same specimens. Tests also
check actual live mode in UTC/Tokyo browser contexts, hidden/resume, reduced
motion, nighttime inspection and unchanged resource counts.

Ignored `artifacts/local-lighting/lighting-comparison.png` presents the actual
five phases and night storm; individual `lighting-*.png`, Canvas captures and
`lighting-comparison.json` remain alongside. In the initial focused comparison,
mean image luminance was 74.88 dawn / 74.22 day / 74.67 golden / 65.71 dusk /
59.53 night / 47.75 night hurricane (8-bit units). Night retained about **80%**
of daytime mean luminance. A night bolt raised hurricane mean to 52.67, remaining
distinct without a washed-out frame. These are whole-image fixture measurements,
not a universal perceptual/accessibility guarantee.

Dense 640-specimen, DPR-2 Chrome samples (120 frames each) retained **735 display
objects and 763 specimen/weather atlas frames**. Day/night ticker means were
16.68/16.68ms, worst 17.1/16.8ms, with CPU submission means .295/.289ms in the
final focused run. Earlier pairs measured .377/.410ms and .279/.245ms. Short samples are noisy:
they do **not** measure GPU completion, compositor work, battery use or long-run
smoothness. Colored phases necessarily add a compositor pass; browser/driver
surface caching and cost can differ. Firefox/Safari, multi-hour real traffic,
clock-change visual comfort and GPU profiling remain unverified. Fixed boundaries
are not seasonal or astronomical, and extra bloom/shadow systems are out of scope.

Validation: all **52 Node entry points**, the complete Chrome browser regression
suite, focused lighting/inspection checks, .NET build and backend checks, and
actual ASP.NET polling/SSE integration pass. The .NET build has zero warnings or
errors; the checks project retains its existing NU1900 vulnerability-feed warning.
Local-server browser/SSE checks require execution outside the sandbox's socket
limits. Canvas cache restoration is also covered: a persisted page keeps its
lighting controller, refreshes at `pageshow`, and releases the restore listener
and surface transform on final departure. `git diff --check` passes.

# Emergency overcrowding relief (2026-10-20)

The existing shared landscaping incident now has an explicit `mode`: `vine` or
`overcrowding`. Actors, clipper poses, rendering, removal notifications and cleanup
are reused unchanged in Pixi and Canvas. There are still just 14 shared gnome
frames, one GPU source, and two incident sprites in one temporary group. No new
timer, render loop, texture, dependency or backend change.

On the existing 45-second check, the original four-gnome dispute keeps its 2%
priority. If still idle and off the shared seven-minute landscaping cooldown:

- **640 occupied specimen cells:** make one overcrowding roll, successful only
  below **.25**. Never also make a vine roll, even if vines qualify or relief fails.
- **Below capacity:** retain the existing 20-vine/40%-coverage eligibility and
  **.10** vine roll, 25% trim share and eight-target cap.
- Failure schedules no retry until the next check and never changes cooldown.
  Successful arrival, including a subsequently cancelled visit, starts cooldown.

Overcrowding samples at most **64 random original eligible specimens without
replacement**. Any ordinary living species can qualify; protected rare species,
Pixi palette index 4, every Canvas rare palette (including `broadleafVariant ===
'rainbow'`), active/pending mutations and collectible mutations cannot. Each
scheduled cut uses the same immediate object/id/cell/coordinates/creation-time,
occupancy, lifetime and protection revalidation before `source.remove()`.
Stale remaining sampled targets are skipped. Replacement specimens and new
arrivals are never added to the route.

Stop cutting at **32 currently free cells**, **32 successful removals**, sample
exhaustion, or a **45-second work deadline**. The free-cell check uses the
authoritative occupancy Map; unrelated expiry/collection can satisfy the goal.
Only successful `remove()` calls increment the incident's local removal count.
Incoming traffic can refill freed cells, so even 32 cuts can leave no free space.
The fixed sample and deadline keep repeated replacement/refill from extending
work indefinitely. Ideal 250ms ticks complete a full visit in about 41 seconds;
real timer delays can exhaust the deadline with fewer cuts even without traffic. An exit
already underway can finish up to 750ms plus logical-tick rounding after the
deadline; a visit still working at the deadline clears immediately.

Worker travel (750ms) and visible snip holds (at least 500ms), stationary
supervision, silence, reduced-motion poses, hidden cancellation and >1.5s logical
stall cancellation are inherited. Action and stop decisions run only on logical
ticks, with no per-frame population scans. Ordinary removal updates vine
connections, cached rendering, inspection, mutation cleanup and cell occupancy.
SSE/NATS, normal growth/competition/rarity, provenance, accepted-growth statistics
and Recent activity are unchanged. These volunteers do not guarantee assistance.

`/pixi-live.html` retains **Trigger landscaping (simulated)** for vine mode and
adds **Trigger overcrowding relief (simulated)**. The latter seeds a full
640-specimen ordinary mixed fixture if needed (flower, mushroom, broadleaf, vine,
wirefern and weed), then starts relief without a probability roll. Both enforce
their own mode's eligibility, mutual exclusion and the same cooldown. Clear
does not reset cooldown; a blocked click does not reseed. Fixtures use simulated
provenance and bypass network input, acceptance counters and Recent activity.
No diagnostic control is present on `/` or `/index.html`.

`node tests/gnome-overcrowding.cjs` covers 639/640 occupancy, exact .25 boundary,
single scheduled rolls, mode priority, shared cooldown, random sampling and all
protection forms, free-space/removal/duration stops, refilling, stale identities,
hidden handling, Canvas/Pixi counts/connections/inspection parity, both diagnostic
buttons and 20 repeated incidents without growing display-object/texture counts.
The existing vine and four-gnome suites retain their original assertions.
The installed-Chrome suite (`node tests/pixi-default-browser.cjs --run`) now
exercises complete real-time overcrowding visits in both renderers and Pixi
reduced-motion/hidden cancellation; screenshots use
`artifacts/homepage-browser/overcrowding-*.png`. Long real-NATS traffic sessions,
frequency tuning and GPU profiling remain outside this slice.

Validation: all **51 Node entry points** pass, along with the installed-Chrome
regression suite, .NET build (zero warnings/errors), backend checks and actual
ASP.NET polling/SSE integration. The checks project retains its NU1900 warning
about unavailable NuGet vulnerability data. Browser/local-server integration
needed execution outside the sandbox's socket restrictions. In the final real-time
run, Pixi made 32 cuts (608 occupied cells); Canvas made 31 cuts (609 occupied)
before the work deadline. Both cleaned up correctly. This is intentional
best-effort behavior, not a promise to restore all 32 empty cells.

# Gnome Landscaping Department — vine mode (2026-10-20)

Implemented in the shared `garden-gnomes.js` model for the default Pixi garden,
`/pixi-live.html` and Canvas. The existing 45-second eligibility check first
offers the original dispute its unchanged 2% roll. If idle, ordinary living vines
comprising at least 40% of living specimens, with at least 20 eligible vines,
get a 10% landscaping roll. The cooldown is seven minutes from arrival, including
cancelled visits. One incident slot prevents crews/disputes from overlapping.

A worker with hedge clippers visits a fixed nearest-neighbor route while a
stationary red-hatted supervisor contributes nothing. Target count is 25% rounded
to the nearest integer, capped at eight. Each target gets 750ms travel and at
least 500ms of visible snipping, then the crew exits in 750ms: roughly 7–11
seconds on the normal 250ms logical cadence. Reduced motion uses discrete
positions, still legs and a fixed closed snip pose. Landscaping is silent.

Only the existing logical tick can call the authoritative garden's `remove()`;
the renderer's animation path only positions actors. Before each snip, exact
object/id, original cell/coordinates, occupancy, creation time, current lifetime,
species, palette and mutation state are revalidated. Canvas's `silvervine` and
Pixi's palette index 4 are excluded, as are active/pending mutations, protected
species and all non-vines. Missing/expired/replaced/collected targets consume
their visit with no substitute. The ordinary removal lifecycle updates Pixi
neighbor curves/views, Canvas's cached base, inspection, mutations and occupancy.
Freed cells admit normal growth and later ordinary grass spread. No invented
SSE/NATS event, provenance, Recent activity row or accepted-growth statistic.

Pixi adds two clipper frames to the shared gnome atlas: **14 frames / one GPU
source**, with 40×32 logical tiles and a 1120×64 physical atlas at resolution 2.
The original gnome silhouette/anchor stays rooted at (16,18). Landscaping owns
only two sprites in one transient group; both and the group are destroyed when
the crew leaves or is cancelled. The fixed atlas is reused across incidents and
released on page teardown. Canvas uses the same blade endpoints and pose model,
with no incident textures. No new timers, animation loops or dependencies.

Hiding the tab cancels landscaping immediately and resets the eligibility
cadence. A logical tick gap greater than 1.5s also cancels the crew, so suspended
or stalled tabs never replay destructive actions. A slow tick still shows a full
snip hold before moving on. The original dispute retains its completion rules.
`pagehide`, Clear and teardown also release actors; Clear retains the cooldown.

Only `/pixi-live.html` exposes **Trigger landscaping (simulated)**. It seeds a
50-specimen local fixture (32 ordinary mature vines, 18 broadleaves) if the
current garden is ineligible, then attempts landscaping without waiting for a
check/chance roll. Eligibility, incident exclusion and cooldown still apply;
a cooldown-blocked click does not reseed. Fixture provenance is simulated;
it bypasses SSE, acceptance counters and Recent activity. Reload starts fresh
browser state as usual. The homepage has no landscaping control.

Deterministic coverage: `node tests/gnome-landscaping.cjs` exercises threshold,
chance and cooldown boundaries, fixed/capped selection, identity/occupancy/lifetime
safety, all exclusions, sequential one-time snips, mutual exclusion, hidden and
reduced-motion behavior, both entry points, Canvas/Pixi removal/rendering parity,
inspection closure and 25 repeated incidents without additional objects or
textures. `node tests/pixi-default-browser.cjs --run` extends the installed-Chrome
suite with actual timed snips/cleanup, reduced motion, hidden cancellation and
Canvas/Pixi screenshots. Long real NATS sessions and aesthetic tuning of crew
frequency/routes remain outside this slice; no GPU performance claim is made.

Validation for this slice: the Node regression entry points pass, including the
original dispute and rendering/performance checks; the new suite repeats 25
landscaping visits without leaked sprites, groups or growing texture counts.
Installed Chrome passes the complete default/diagnostic/Canvas/stress suite,
including real-time landscaping, reduced motion and hidden cancellation.
Screenshots are saved in ignored `artifacts/homepage-browser/landscaping-*.png`.
`dotnet build PacketGarden.slnx` passes with zero warnings/errors; backend checks
and the actual ASP.NET polling/SSE integration pass. The checks project retains
its NU1900 warning because NuGet vulnerability data could not be fetched.
Local-server integration required running outside the sandbox's socket limits.

# Grass clears when specimens occupy soil (2026-10-20)

Canvas and Pixi now remove destination grass from the shared ecology model on
successful placement/replacement, through `removeGrassCell` and `grass-removed`.
Pixi's added callback runs before `view.add`; Canvas invalidates its existing base
before the next specimen paint. No intermediate empty frame is scheduled. The
original shared placement, competition, lifecycle, provenance and random color
selection code remains unchanged. Failed/invalid/paused/dropped events never
invoke placement cleanup, and neighboring grass objects remain untouched.

The ecology model accepts an `isCellOccupied` predicate backed by each garden's
existing cell Map. Direct grass influence and neighbor spread skip occupied
destinations without retrying or rerouting a roll; thresholds/cadence remain.
Fixture imports validate first, then skip occupied cells. The full 640-specimen
diagnostic seed therefore has zero grass (735 HUD display objects including
puddles/ambient/lighting), rather than overlapping 640 grass Sprites. After expiry,
grass can reclaim empty soil only from surviving neighbors on normal spread;
plant removal never synthesizes it. With all grass gone, expiry cannot restart it.

Grass Sprite destruction uses the existing notification path and closes an exact
Wild grass card synchronously. Specimen inspection and collection priority are
unchanged. Factories start empty and ecology bindings are installed before startup
grass, fixtures or live input, avoiding initialization-order callbacks. Updated
asset versions cover shared ecology, both adapters, UI and Pixi startup; Noise
Observatory navigation links, grass artwork and all atlas layouts are unchanged.

`tests/grass-occupancy.cjs` covers exact-cell growth and replacement, failure
isolation, occupancy-aware fake influence and spread (including fading seeds),
unchanged roll counts, later reclamation after actual specimen expiry, Canvas
paint ordering, Pixi add ordering and repeated Sprite/frame/source ownership.
Existing mutation/activity/wirefern tests now allow destination clearing while
still checking exact neighbor state and no unrelated grass creation/refresh.
All 49 Node files pass (optional runners require `--run`). Installed headless
Chrome passed `/`, `/index.html`, diagnostic, Canvas and stress pages, SSE fixture
growth, immediate card/Sprite cleanup, resizing, reconnection and retained ambient,
storm and sound checks. These browser events are synthetic SSE, not a new live
NATS soak. .NET build/backend checks and `git diff --check` pass; the existing
NU1900 vulnerability-feed warning remains.

New removal scans at most 640 grass cells once per accepted placement. Occupancy
checks use the existing specimen Map and the existing influence/spread cadence;
no extra per-frame sweep, timer, texture or display object is added. Twenty
synthetic grow/remove cycles release each grass Sprite and keep the same atlas
generation/frame counts. Chrome's 120-frame quiet samples before/after one SSE
plant (640 grass → 639 grass + one plant, same build) measured:

| Route | Mean interval before / after | Mean CPU submission before / after |
| --- | --- | --- |
| `/` | 16.679 / 16.682ms | .237 / .229ms |
| `/index.html` | 16.679 / 16.680ms | .216 / .201ms |

These are different scene contents within the revised implementation, not a
code-before/after speedup benchmark. Short noisy submission/ticker samples do not
prove GPU/compositor or long-soak equivalence. Ignored screenshots/timing data are
under `artifacts/grass-clearing/pages/`. Historical findings below remain intact.

# Fuller grass and grass-only inspection (2026-10-20)

The default Pixi garden and `/pixi-live.html` now use 5–7 pointed blades per tuft
instead of 4–6, with a slightly wider fan (10.5 rather than 9 world units). Each
variant retains its 2–3 tufts, restrained palette, transparent gaps and existing
blade dimensions/opacity. This is a small artwork adjustment: spread, logical
cells, growth, maturity, fading, expiry and all ecology settings are unchanged.
Canvas grass is unchanged.

Clicking/tapping grass without an existing specimen/collectible hit now reuses
the inspection card, titled **Wild grass**, with a background-ecology description,
explicit non-collectible label and state (Young/Growing/Mature/Fading/Dying/Dry).
Specimen fields are hidden only for grass and restored for normal inspection.
The existing curiosity → drop → mutation → specimen priority runs first; bare
soil still closes the card, and outside/letterbox clicks retain their behavior.
Grass inspection does not remove grass, produce sound, add Recent activity or
change the score. Removal, expiry, replacement of the exact grass object or a
new occupying specimen closes the card on the existing UI tick. Close/Escape
and the existing small-screen card positioning work for both kinds of card.

Picking reads existing ecology objects only when clicked; an open grass card
uses the existing logical UI tick for validity/state. There are no additional
timers, render loops, textures or display objects. The atlas remains 12 grass
frames plus one unchanged puddle frame: 1664×128 backing, ~832 KiB RGBA. Each
grass cell retains one Sprite, unchanged scale/tint/alpha and visual deadlines.
Startup builds the finite artwork once and releases its construction contexts;
existing view/frame/source cleanup is retained. Only Pixi supports grass cards.

Deterministic entry-point tests cover grass-only and bare tiles, specimen
priority, every displayed lifecycle group, close/Escape, removal/replacement,
new occupancy, and no ecology/activity/audio/score or resource changes. Existing
art tests check exact blade counts, finite curved variants, no blobs, model RNG
isolation, unchanged lifecycle transforms/deadlines and cleanup.

The existing Chrome artwork runner supports `--fuller-grass`, comparing against
`d91b7a1` in separate ignored `artifacts/grass-fullness/before/` and `after/`
directories. It preserves the older Phase 2C artifacts. Use the already available
Playwright runtime/installed Chrome, without installing dependencies:

```powershell
node tests/pixi-vine-art-browser.cjs --run --fuller-grass --baseline --seconds=5
node tests/pixi-vine-art-browser.cjs --run --fuller-grass --seconds=5
```

Fixtures cover sparse, young, mature, fading, mixed plants/grass and mixed with
hurricane, at desktop and 720×700. Pixel checks protect specimen/puddle artwork,
transparent frame borders, modest coverage increase and identical logical state,
atlas dimensions and display-object counts. Average nontransparent grass tile
coverage rose from **2.33% to 2.69%** (~15.7%), with clear borders on every frame.
The specimen/mutation/rain/probe atlas and puddle frame remained pixel-identical.

Five-second installed-Chrome samples per scene (mean CPU submission):

| Scene | Before | After | Display objects, unchanged |
| --- | --- | --- | --- |
| Sparse grass | .167ms | .165ms | 49 |
| Young grass | .118ms | .120ms | 224 |
| Mature grass | .117ms | .130ms | 657 |
| Fading grass | .105ms | .107ms | 657 |
| Mixed plants/grass | .108ms | .135ms | 1361 |
| Mixed with hurricane | .173ms | .197ms | 1369, plus 400 particles |

Mean frame intervals remained ~16.68ms; p99 was 16.9–17.1ms. The revised worst
interval was 18.5ms, and neither run had gaps over 50ms. Recurring geometry and
texture generation both remained zero. Small CPU increases (up to ~.027ms mean)
are retained as observations; these short noisy measurements are not proof of
GPU/compositor or long-session equivalence. Historical performance findings
below remain unchanged.

All 48 Node files pass (optional runners require `--run`); the focused
`pixi-grass-inspection.cjs` also checks open-card state updates. The real-Chrome
page suite passes `/`, `/index.html` and `/pixi-live.html` grass picking, specimen
priority, exposed bare-soil clicks and card bounds at desktop and 320px. The
narrow diagnostic page is scrolled to its canvas before picking. Card screenshots
are under `artifacts/grass-fullness/pages/*-grass-card-*.png`. Existing SSE growth,
reconnection, collection, sound, gnome, lightning, Canvas and stress checks pass.
.NET build/backend checks and `git diff --check` pass, with the existing NU1900
vulnerability-feed warning. No backend or external-event contract changes.

# Readable storm bolts and audible shared mix (2026-10-20)

The original oval glow below was technically visible but did not read as a
strike. Its two .028/.016-gain tones were mostly 40–79Hz, poorly suited to small
speakers. Native Chrome output capture confirmed a real signal, but very low
thunder amplitude. This revision changes presentation/audio only; storm eligibility,
60–150s/45–120s waits, 3.5s sequence ownership, .8–1.3s thunder delay, suppression,
hidden/resume cancellation and hourly-only update stability remain unchanged.

Pixi now draws a pale-white/blue bolt from y=0 to a varied y=270–510 in the
existing 960×600 world. Ten uneven downward segments vary origin, drift and
zig-zag width. 65% of strikes have 1–3 smaller, three-segment branches. The
envelope attacks in 10ms, holds through 60ms and fades continuously to zero at
650ms. There is no follow-up flashing sequence. A faint 140ms scene brightening
(peak .035 thunderstorm / .05 hurricane) supports the bolt. Hurricane strokes
are 20% thicker with peak bolt alpha 1 rather than .9.

One overlay Container and two Graphics replace the original Sprite/texture:
**three persistent display objects, zero extra textures**, versus one Sprite and
128KiB previously. Maximum paths are 11 main points plus 12 branch points,
with three stroke layers for the crisp core and subtle edge glow. Geometry is
built once on an event, cleared on cancellation, and destroyed on teardown.
The ticker only updates alpha/visibility; no geometry work occurs per frame.
No filters, extra animation loops, garden RNG draws or other artwork changes.

Thunder is now one filtered-noise source plus one descending triangle body.
A deterministic 2.1s mono noise buffer is cached per shared controller/context
(403,200 bytes at 48kHz). Thunderstorms use a 1200→380Hz lowpass and 96→62.4Hz
body over 1.8s; hurricanes use 850→260Hz and 72→46.8Hz over 2s. The 35ms attack
and .38s shoulder make it distinct before a rumbling decay. Each source stops
by duration+.01s; envelopes and the one filter disconnect on end/cancellation.
No Sound On gesture means no context or buffer creation. Muting, zero volume,
device failure, hiding and weather/Lightning changes retain the existing guards.

All shared sounds retain their species envelopes, pitches and cooldowns. The
slider now sets `2 × volume^1.25` before one shared compressor (threshold -6dB,
knee 6dB, ratio 12, attack .003s, release .18s), followed by .75 fixed output
headroom. This raises full-volume output while keeping quiet slider settings
usable and managing overlap. Off still sets master gain to zero. Canvas uses
the same revised mix, but never triggers lightning/thunder. Versioned audio,
storm and entry scripts prevent the old effect/mix remaining cached.

Verification: all 47 Node test files passed (optional runners skip without
`--run`), including 1,000 deterministic shapes, path bounds/variation, envelopes,
one active event, no per-frame geometry/textures, repeated cleanup, cached noise,
source/filter lifetime, volume curve and preserved sound/event guards. The
installed headless Chrome suite passed both default URLs, diagnostic manual
trigger, reduced motion, cancellation, native audio, SSE/reconnection, resizing,
320px controls, Canvas and stress pages. At a frozen 55ms test age, all 30 sampled
locations along each rendered main bolt contained pale strike pixels.

The browser test taps **actual rendered PCM after the output mix**, leaving the
normal destination connected; it does not substitute mocked synthesis. Full
volume captures from the real manual-lightning path measured:

| Cue | Previous peak / RMS | Revised peak / RMS |
| --- | --- | --- |
| Thunderstorm | .0411 / .00434 | .7225 / .06277 |
| Hurricane | .0394 / .00465 | .7316 / .05631 |
| Flower | .3780 / .03881 | .6348 / .06614 |

Thunder RMS increased approximately 23.2dB / 21.7dB in these cue windows; flower
RMS increased about 4.6dB. A mixed thunder/rare/collection/gnome sample peaked at
.7092. No samples reached .99 in these captures; muted lightning captured exact
silence. These are signal measurements, not perceived-loudness or physical-device
tests. Real speakers/headphones and OS output still need user audition.

Dense-scene Chrome timing at DPR 2, 120-frame samples with thunder muted:

| Scene | Previous mean CPU, idle / sequence | Revised mean CPU, idle / sequence | Revised worst interval |
| --- | --- | --- | --- |
| Quiet | .161ms | .214ms | 17.0ms |
| Thunderstorm | .168 / .204ms | .213 / .224ms | 22.3ms |
| Hurricane | .176 / .188ms | .203 / .256ms | 18.1ms |

Means stayed near 16.68ms/frame. Additional 24-frame windows during visible bolts
measured .271/.304ms mean CPU submission; path construction measured 0–.4ms.
The sequence samples include frames after the 650ms fade. Runs were short and
noisy (including concurrent test activity), so these do not prove GPU/compositor
or long-soak equivalence. Small CPU increases and the 22.3ms interval are retained
as observations, not dismissed based on average FPS.

Baseline artifacts are preserved in `artifacts/storm-bolt-before/`; revised
screenshots (`*-bolt.png`), timings, `audio-output.json` and playable PCM WAVs
are in `artifacts/storm-bolt-after/`, all ignored. Reproduce with existing
Playwright/installed Chrome: set `PACKETGARDEN_BROWSER_OUTPUT` to a new artifacts
directory, then `node tests/pixi-default-browser.cjs --run`. The test-only PCM
tap uses ScriptProcessor; the application adds no recording or metering loop.
.NET build/backend checks pass with the existing NU1900 vulnerability-feed warning.
Historical unexplained stutter and the known Pixi teardown exception remain.
The original experiment and its measurements below are historical.

# Optional storm illumination and thunder (2026-10-20, original experiment)

The default Pixi garden and `/pixi-live.html` now share `pixi-live-storm.js`.
Only normalized `botnet_thunderstorm` and `botnet_hurricane` qualify. Ordinary
rain and `heavy_rain` never produce lightning or thunder. Canvas lighting,
weather classification, SSE, rain/wind, puddles and all garden rules are unchanged.
This is atmospheric artwork without security meaning.

One localized blue-gray glow follows a smooth sine-squared envelope over 2.2s,
with no full-screen white frame or flash sequence. Thunderstorm peak Sprite
alpha is .14 (760×360 world units); hurricane is .20 (840×420). Positions vary
within the upper-middle garden. After each 3.5s sequence, thunderstorms wait
uniformly 60–150s and hurricanes 45–120s. Entering eligible weather starts the
same wait. A separately seeded presentation RNG leaves the garden stream alone.
At most one sequence exists; no backlog accumulates.

Both pages expose a compact Lightning checkbox. Reduced motion automatically
suppresses the sequence and disables this control; removing that preference
restores the user's checkbox choice. No preference is persisted. Hiding,
changing weather or disabling cancels immediately; resuming schedules a fresh
wait. Tick gaps over 2s also discard pending work. An hourly-count-only update
does not rebuild rain or alter the lightning deadline. `/pixi-live.html` alone
offers **Trigger Lightning (simulated)**, requiring manually selected eligible
weather and enabled illumination without reduced motion.

Thunder uses the existing Sound On gesture, AudioContext and master volume.
Two low triangle tones fade in/out after a random .8–1.3s delay: 56/79Hz for
1.6s in thunderstorms, 40/58Hz for 1.9s in hurricanes, with descending pitches.
Off/zero volume/device failure remains safe. Muting, hiding, weather changes,
disable and teardown stop/disconnect thunder without touching growth, collection,
rare or gnome cues. Audio more than 300ms late is dropped, and expired or suspended
sequences never replay it. No context is created just for thunder.

Resources: one persistent Sprite (hidden when idle), one 256×128 RGBA cached
texture (~128 KiB excluding driver overhead), at most two thunder oscillators
and two envelope gains. Temporary construction Graphics is destroyed immediately;
Sprite and backing texture are destroyed on teardown. Repeated effects create
no textures or display objects. The existing 250ms logical tick handles scheduling;
the native ticker only updates visibility/alpha while active. No extra timers,
RAF loops, fullscreen filters or procedural geometry are added.

Deterministic tests cover eligibility, interval bounds, intensity, one sequence,
independent RNG, hourly-only updates, reduced motion, manual disable, opt-in sound,
late/expired cancellation, hidden/resume, mute/zero/device failures and cleanup.
Installed headless Chrome verified both default URLs, diagnostic forcing, actual
pixel brightening, media preference changes, native audio nodes, hidden/resume
and cancellation. Existing Canvas/stress checks also passed. Local ignored
artifacts are `artifacts/homepage-browser/*-glow.png`, `*-inactive.png` and
`storm-timing.json`.

120-frame dense mixed-scene samples at DPR 2 (thunder muted during timing):

| Scene | Glow | Mean / worst interval | Mean / worst CPU submission |
| --- | --- | --- | --- |
| Quiet | Ineligible | 16.68 / 16.80ms | 0.151 / 0.300ms |
| Thunderstorm | Inactive | 16.68 / 16.90ms | 0.159 / 0.400ms |
| Thunderstorm | Active | 16.68 / 17.10ms | 0.193 / 1.100ms |
| Hurricane | Inactive | 16.68 / 16.90ms | 0.171 / 0.600ms |
| Hurricane | Active | 16.68 / 16.90ms | 0.183 / 0.700ms |

Active CPU mean differences were approximately +.033ms and +.012ms respectively.
Peak screenshots increased average channel brightness by 1.11/255 and 3.31/255.
These short noisy CPU submission samples do not measure GPU completion or prove
long-session equivalence. Native audio scheduling was tested, but speaker output
was not auditioned; tonal quality needs listening on real speakers/headphones.
The historical unexplained stutter and known Pixi teardown exception remain
unresolved. The .NET check build retained the existing NU1900 vulnerability-feed
warning. Earlier dated sections below preserve their original findings.

# The Gnome Incident restored (2026-10-20)

Canvas and all live/default Pixi pages now use `garden-gnomes.js` for the existing
incident logic. `garden-actors.js` retains Canvas drawing and its legacy entry
points around that shared model; `pixi-live-gnomes.js` provides cached Sprite
presentation. No network, specimen, ecology, occupancy, Recent activity, score,
collection or weather rules changed. This implements only the original four
gnomes' pointless dispute, not the future incidents listed in IDEAS.md.

The model preserves at least **30 living specimens**, one eligibility check per
**45 seconds**, **2%** chance (roll < .02), two green and two red gnomes and at
most one incident. Approach lasts 0–3s; battle 3–7s; a single 50/50 winner is
selected at 7s; losers flee until 9s; winners celebrate until full removal at 12s.
World positions, visual bounce/shove/fade and shared phase boundaries are based
on elapsed time. The original battle/victory cues fire once through the existing
optional audio controller. Muted/zero-volume/unavailable audio remains safe.

Pixi eligibility uses the existing 250ms logical cadence. Only an active incident
advances/animates in the native ticker, with no new RAF, timers or workers.
Canvas retains its existing scheduler. Both renderers skip eligibility while
hidden and reset the check deadline on visibility changes; there is no backlog.
Resume removes a completed incident before phase/audio handling. Clear removes
the actors, and teardown releases their views and cached textures. Gnomes do not
participate in logical picking, so existing collection/inspection priority stays.

Artwork follows Canvas's pointed hats, faces, white beards, tunics, walking legs
and tiny arguing arms. Twelve 32×32 frames (two teams × normal/battle × three leg
poses) share one 768×64 backing at 2× resolution: approximately **192 KiB RGBA**,
excluding driver overhead. Frames are generated once at page startup. Incidents
allocate exactly four Sprites and one temporary group in the existing world layer
above specimens and below rain; losers' Sprites are destroyed at 9s and all
remaining incident display objects at 12s. Idle has no gnome display objects.
No per-frame geometry or texture generation occurs. Plant artwork is unchanged.

`/pixi-live.html` alone exposes **Trigger Gnome Incident (simulated)**. It requires
the same 30 living specimens (use the existing dense seed button if necessary),
rejects overlap, and alternates a deterministic green/red winning roll using the
normal model. It publishes no event and changes no specimens or production odds.
Observe the existing HUD for phase/count/winner, and wait 12s for cleanup. Both
Pixi pages advance the shared renderer cache URL; new shared/model adapters and
the Canvas adapter are versioned. Missing diagnostic controls remain safe.

Verification: original Canvas gnome tests, shared synthetic-clock tests, repeated
Pixi atlas/view tests and both actual entry points pass. Twenty synthetic full
incidents keep the same 12 frames/one source and release every Sprite/group.
Tests cover exact boundaries, both winners, single phase cues, mute/zero/device
failure, hidden completion/no catch-up, clear, resize, teardown and independence
from specimens/Recent activity. Installed headless Chrome also verified native
audio, both forced winners, all phases, world-space resizing, hidden completion,
clear, default/diagnostic initialization and retained Canvas/stress pages.

120-frame headless Chrome samples at DPR 2 (no incoming growth) measured:

| Scene | Gnomes | Mean / worst interval | Mean / worst CPU submission |
| --- | --- | --- | --- |
| Quiet, 30 live fixture specimens | Idle | 16.68 / 16.90ms | 0.213 / 0.600ms |
| Same quiet garden | Four active | 16.68 / 16.90ms | 0.178 / 0.600ms |
| Dense mixed garden + hurricane | Idle | 16.68 / 16.80ms | 0.183 / 0.600ms |
| Same dense garden + hurricane | Four active | 16.68 / 16.90ms | 0.177 / 0.700ms |

The active scene added five display objects and returned to baseline after
cleanup. Lower active CPU means are sampling variation, not a speedup claim.
These short samples do not prove GPU completion, long-session equivalence or
audible speaker output. Screenshots and timing data are local/ignored under
`artifacts/homepage-browser/gnomes-*.png` and `gnome-timing.json`. The historical
stutter uncertainty, pre-existing Pixi teardown exception and NU1900 build warning
remain outside this restoration. The earlier dated sections below are historical.

# Shared optional sound restored (2026-10-20)

`/`, `/index.html` and `/pixi-live.html` now expose Sound: Off/On and a 12%-default
volume slider. Canvas and Pixi load the same `garden-audio.js`: its reusable
`PacketGardenAudio.create` factory accepts optional controls, and the existing
`gardenSound` controller binds one instance per page. No AudioContext is created
until the enable click. The same species synthesis, pitch variation, 400ms
ordinary / 900ms rare cooldowns, three-note rare chimes, quiet collection pluck,
master volume, immediate mute and failure/activation-race handling are retained.
Wirefern previously had no audio entry; it now reuses the existing vine-family
pluck on both renderers, without new oscillator settings. Gnome cues remain in
the controller for later use; Pixi gnomes and weather audio are not implemented.

Growth audio is attached to the existing successful real-event `onLive` callback
after model acceptance, including forced replacements. Invalid/paused/saturated
events, lifecycle updates, removals, reconnects, rendering and all development
fixture buttons remain silent. `pixi-live-ui.js` exposes an optional `onCollected`
callback invoked only after successful removal of a curiosity, Amanita or active
weed mutation; inspection and failed removal are silent. Messages, priority and
Score: 0 are unchanged. No audio code runs in the model, drawing or ticker.

Both Pixi pages retain identical script order and advance the audio, UI adapter,
renderer and stylesheet asset versions. Canvas advances its shared audio URL.
Missing optional sound controls are safe. No preferences are persisted.

`tests/pixi-audio.cjs` exercises both actual Pixi entry points with shared Web
Audio test doubles, including every species, cooldown boundaries, dropped/paused
growth, replacement, all three collection paths, silent fixtures/inspection/
ticker/resizing, missing controls, unavailable devices, zero volume and rapid
activation changes. `tests/garden-audio.cjs` retains Canvas/gnome coverage and
checks wirefern compatibility. The optional installed-Chrome cache/pixel suite
also exercises native Web Audio with user-gesture autoplay policy, actual clicks,
volume/mute, silent seeding, collections and small-screen controls. This verifies
native scheduling, not audibility or speaker output; local listening remains a
manual check. Historical stuttering and the known teardown exception below remain
unresolved; audio restoration is not a performance root-cause claim.

Validation: all default JavaScript checks, .NET build/backend checks and the
installed headless-Chrome suite passed. Chrome enforced user-gesture autoplay
policy and checked both default URLs plus the diagnostic page, native growth
and three collection tones, scheduled volume/mute changes, one context, silent
fixture seeding/inspection, 320px controls, stats, reconnection and retained
Canvas/stress pages. Native `AudioParam.value` can reflect the last processed
render quantum while inactive, so native volume assertions observe calls to
`setValueAtTime`; synthesis is not replaced with a fake in Chrome.

Three 120-frame samples on the same dense mixed/grass/puddle/hurricane fixture,
with no incoming growth, gave:

| Sound | Mean / worst frame interval | Mean / worst CPU submission |
| --- | --- | --- |
| On | 16.68 / 16.90ms | 0.285 / 0.800ms |
| Off | 16.68 / 16.80ms | 0.257 / 0.500ms |
| On again | 16.68 / 16.90ms | 0.257 / 0.600ms |

All three scheduled zero audio nodes. The first On CPU mean was 0.028ms above
Off; the repeated On mean was within 0.001ms. These short headless samples show
no recurring audio scheduling, not guaranteed performance equivalence, GPU
completion or real speaker-output cost during sustained playback. Deterministic
checks separately exercise active growth bursts, cooldowns and bounded node
lifetimes. The existing NU1900 vulnerability-feed warning remains. Browser
screenshots/timing evidence is local under ignored `artifacts/homepage-browser/`.

# Aggregate network activity restored (2026-10-20)

The default Pixi footer now shows **Observatory traffic**: Events/min explicitly
labels its five-minute average, and Last hour displays the source's actual
`eventsLastHour`. Both arrive through the existing weather SSE connection, with
no new browser requests, timers or scene changes. Hourly-only changes update the
text without rebuilding weather particles. Waiting distinguishes startup from
valid zero activity; missing hourly data displays Unavailable. Failures retain
the previous normalized snapshot and normal SSE reconnection remains unchanged.
These values count aggregate retained Observatory events, not accepted specimens;
its 5,000-event store can truncate busy windows. See
[sources and limits](REAL-DATA.md#activity-statistics-and-source-limits).
The diagnostic page keeps its existing controls and weather HUD. This change
does not explain the historical stuttering or resolve the known Pixi teardown
exception documented below.

Verification for this pass: all default JavaScript checks, the .NET checks/build,
and the isolated ASP.NET polling/SSE integration passed. Installed headless Chrome
verified `/` and `/index.html`, actual/hourly-only/zero/unavailable display, SSE
reconnection, inspection, and 320px/390px/desktop layouts; diagnostic, Canvas and
stress pages remained functional. Sources were local deterministic fixtures, not
production Observatory/NATS traffic. The build reported the existing NU1900
vulnerability-feed warning. No new performance-equivalence claim is made.

# Plant size and visual presence review (2026-10-20)

The live/default renderer now enlarges existing cached specimen Sprites, without
changing artwork, atlas packing or the 960x600 / 32x20 logical garden:

- Flower, mushroom, wirefern and ordinary weed: **+40%**.
- Broadleaf: **+35%**.
- Ghostbloom and crystal fungus: **+30%**.
- Redbloom and blackthorn: **+25%**.
- Vine Sprites/connections and collectible mutations: original size/behavior.

These are increases over the Phase 2B artwork/scale checkpoint, not over the
original synthetic art. Each species keeps its existing sprout/growing/mature/
fading proportions, cached opacity and exact lifecycle. The same Sprite survives
stage changes without root jumps. The top row is limited to **+10%** to fit tall
heads without excessive crowding of the second row. Edge-only visual insets keep
the entire enlarged quad inside the garden mask. Interior roots are unchanged;
all logical cells and interaction rules are unchanged. Overhanging decoration
does not change picking: inspection still resolves the original logical cell.
An active collectible mutation explicitly returns to its original scale and
position, preserving its collection geometry. Grass art/ecology are untouched.

## Atlas and rendering cost

No larger atlas frames were needed: enlargement happens after rasterization,
using the existing transparent 32x32 frames baked at 2x resolution. Existing tile
padding stays transparent, and no paths expand into neighboring atlas tiles.
The specimen/mutation/rain/probe and ecology atlas PNG pixels are identical to
checkpoint `8b60c29b44546d27a71a06766ae392aee555210c`. Specimen cache remains
**763 frames**, 1024x768 at resolution 2 (2048x1536 physical); with ambient/ecology,
**781 frames across three retained sources**. RGBA source storage is unchanged
at approximately **12.89 MiB** (excluding driver overhead/back buffers).

Scale/edge insets update only on specimen addition/stage change. There are no
new display objects, per-frame geometry, textures, neighbor searches or timers.
Larger quads can increase GPU fragment work even though source memory/counts
stay fixed. Magnified 2x cached edges can look slightly softer at high DPI; no
GPU timer trace or long live soak is claimed by the short comparison below.

## Reproduce and inspect

The existing installed-Chrome fixture adds `--size`, using available Playwright
and Sharp without installing dependencies:

```sh
node tests/pixi-vine-art-browser.cjs --run --size --baseline --seconds=20
node tests/pixi-vine-art-browser.cjs --run --size --seconds=20
```

Use Node's normal module path or `NODE_PATH` for those existing tools. Baseline
serves checkpoint `8b60c29`. Cases are sparse (96 specimens), dense (640) and dense
hurricane, with identical positions, vigor, variants, stages and grass timestamps.
Logical time is frozen for comparison; rain uses real animation time. Captures
are under ignored `artifacts/plant-size/before/` and `after/`, with
`size-sparse.png`, `size-dense.png`, `size-hurricane.png` at 1280x900, corresponding
`-small.png` at 720x700, and `size-sparse-tall.png` at 720x1000. Timing JSON,
unchanged atlas PNGs and viewport/quad/letterbox measurements are alongside.
Logical-center clicks verify exact specimen identity at each viewport; every
enlarged non-vine quad is checked against the garden boundary. Resizing, clicking
and screenshots are outside the measured windows.

`tests/pixi-plant-size.cjs` covers all species/stages/vigor in a full 640-cell
fixture: exact scale factors, rooted anchors, edge bounds, original logical
picking, unchanged logical specimens, stage transitions without root jumps,
original mutation scale/position and unchanged cache/creation/neighbor counts.

## Measured size comparison and validation

Installed headless Chrome 155.0.8059.80, native ticker, 20 seconds per scene per
version (about 1,200 frames each), desktop DPR 1:

| Scene | Interval p99 before/after | Worst interval before/after | Mean CPU submission before/after |
| --- | ---: | ---: | ---: |
| Sparse | 17.0 / 17.0 ms | 18.3 / 17.9 ms | 0.140 / 0.118 ms |
| Dense | 17.0 / 17.0 ms | 18.7 / 20.9 ms | 0.135 / 0.120 ms |
| Dense hurricane | 17.0 / 17.0 ms | 17.3 / 17.7 ms | 0.150 / 0.139 ms |

All six windows averaged about 60 FPS with zero >50ms or >300ms intervals. CPU
submission p99 stayed 0.3ms. These small mean differences do not establish a
speed improvement; dense worst interval increased slightly in this run. Timing
brackets `app.render()` without waiting for GPU completion. Display objects stay
**152** sparse, **1,358** dense and **1,366** dense/hurricane, plus 400 separate
rain particles. Atlas dimensions, pixels, frame/source counts and estimated source
memory match. No recurring geometry or texture generation was observed.

The sparse and dense screenshots were reviewed at desktop and 720x700. Enlarged
ink is approximately bounded by 35px width / 40px height on 30px logical cells,
allowing modest leaf/head overlap while keeping recognizable stages. All enlarged
quads remain inside the garden; top-row limiting avoids stacking full-height
plants too heavily at the border. Logical picking is deliberately unchanged even
where a neighboring plant's decoration overhangs a cell.

All **38 standard JavaScript suites** pass (41 Node files including a harness and
two optional-browser skips). The real-Chrome route/cache/pixel suite passes root,
index, SSE fixture growth, exact inspection, DPR 2/resizes, reconnection and retained
diagnostic/Canvas/stress functionality. App/backend build and checks pass:

```sh
dotnet build tests/PacketGarden.Checks/PacketGarden.Checks.csproj --no-restore -o artifacts/plant-size/checks
dotnet artifacts/plant-size/checks/PacketGarden.Checks.dll
```

NU1900 remains because vulnerability data was unavailable; there were no build
errors. `git diff --check` passes. No live-NATS soak, GPU timer/heap trace or
long-duration performance-equivalence claim is included. Historical stutter and
the known teardown exception remain unresolved. Changes are left uncommitted.

## Why taller viewports have dark bands

`garden.css` gives `main` the remaining height after header, footer and padding.
The Pixi canvas fills that area. `shared.contain()` then applies
`min(canvasWidth/960, canvasHeight/600)` and centers the garden. The dark bands
are the opaque canvas background outside that proportional garden rectangle.
At 720x700 the measured canvas is 691x564, garden height about 432, with about
**66px above and below**. At 720x1000 the canvas is 691x864, with **216px above and
below**. At 1280x900 it is height-constrained, leaving about 27px on either side.
They are not atlas padding or missing garden rows.

Options preserving the complete garden and its proportions:

- Keep the current centered contain presentation.
- Fit the canvas element itself to the 8:5 garden ratio and align it near the top;
  surplus page space moves below/outside the canvas, without enlarging the garden.
- Use a wider window/landscape presentation to provide more horizontal space.
  Reducing outer padding recovers only a small amount of width; removing vertical
  header space alone cannot make a width-constrained garden taller.
- In a separate UI decision, use surplus page space for status/activity or a
  gentler surrounding background. It would remain outside the interactive garden.

No CSS, contain transform, garden clipping rectangle or page layout changes are
included here. Before/after viewport measurements verify identical letterboxing.

# Phase 2C grass tuft artwork review (2026-10-20)

Pixi's spreading grass now uses small separated fans of narrow, curved, pointed
blades instead of nine overlapping ellipse blobs per tile. Each of the twelve
cached shapes contains two or three irregularly placed tufts, with varied heights,
leans and blade counts, dark bases and restrained lighter tips. Neutral texture
shades still inherit the shared green -> straw -> brown tint. Cell-hashed texture
selection replaces the old repeating anti-diagonals without consuming model RNG.
No cell is moved or removed; transparent artwork exposes soil between tufts and
allows broadleaf, weed and vines to remain readable over dense grass.

Only the grass artwork, decorative variant selection and construction cleanup
change in `pixi-live-ecology.js`. Both live pages advance that script's cache
token. Shared ecology configuration/model, grass influence, spread probabilities/
intervals, growth/fade/expiry, counts, weather/puddles, specimen competition,
placement, plant/mutation artwork, SSE/backend, controls and scheduling are
unchanged. The Canvas and standalone synthetic stress implementations are intact.
Historical blob-art descriptions below describe the earlier presentation.

## Finite cache and lifecycle preservation

The ecology atlas remains **12 grass frames + 1 puddle frame**, 64x64 per tile,
**832x64 at resolution 2** (1664x128 physical pixels, about 0.81 MiB RGBA). All
retained caches still total **781 frames across three sources**, with unchanged
dimensions. Every grass cell retains one Sprite with the same anchor and world
position. Growth and fading still use the exact shared scale, tint, opacity and
visual deadlines; there are no separate stage textures or per-frame grass paths.
Healthy mature grass remains static until its next boundary; young/fading grass
keeps the existing approximately one-second transform updates. Puddle animation
and ownership are unchanged.

Startup grass construction now uses **12 Graphics instead of 120 Graphics plus
12 patch Containers**. The twelve owned grass contexts are explicitly released
after rasterization. Frame/source destruction follows the existing cache API.
No geometry or texture regeneration occurs during measured animation frames.
Pixel checks find clear grass tile borders and bounded geometry. Mean nonzero
alpha coverage inside a grass tile falls from **29.66% to 2.33%**. This measures
texture ink, not logical cell coverage: the dense fixture still contains all
640 grass cells. The complete specimen/mutation/rain/probe atlas and puddle tile
are pixel-identical to Phase 2B checkpoint
`a90c779b5b8875aa446a780d3b6fef7562e0d62d`.

## Reproduce the grass comparison

The existing installed-Chrome artwork fixture adds a `--grass` mode, using already
available Playwright/Sharp and installing nothing:

```sh
node tests/pixi-vine-art-browser.cjs --run --grass --baseline --seconds=20
node tests/pixi-vine-art-browser.cjs --run --grass --seconds=20
```

Use Node's normal module path or `NODE_PATH` for the available runtimes. The
baseline serves checkpoint `a90c779` ecology/renderer code. Six cases cover sparse
grass (32 cells), young spreading patches (207 cells), mature grass (640), fading
grass (640), mixed species over dense grass, and mixed/grass/eight puddles with
400 hurricane particles. Grass cell coordinates/timestamps and specimen positions,
vigor, color and stages match before/after and are checked automatically. Logical
time/cadences are frozen for a reproducible static comparison; actual animation
timestamps and rain continue. This is not a new live-NATS or growth/churn soak.

Desktop 1280x900 and smaller 720x700 viewport screenshots, DPR 1, are saved under
ignored `artifacts/grass-art/before/` and `after/`: `grass-sparse`, `grass-young`,
`grass-mature`, `grass-fading`, `mixed-grass`, and `mixed-grass-hurricane`, each
with `.png` and `-small.png`. Raw timing JSON, specimen/ecology atlas PNGs, grass
geometry bounds and pixel-coverage checks are alongside. Screenshot readback and
resizing are outside timing windows.

`tests/pixi-grass-art.cjs` checks finite distinct curved tuft shapes, no carpet
blobs/model RNG use, stable non-diagonal texture selection through clear/refill,
unchanged world positions, exact shared growth/fade transforms and deadlines,
zero recurring geometry/textures and correct view/frame/source cleanup. Existing
ecology oracle/lifecycle/hidden-resume suites remain unchanged.

## Phase 2C measured comparison and checks

Installed headless Chrome 155.0.8059.80, native ticker, 20 seconds per fixture per
version (about 1,200 frames per window), desktop DPR 1:

| Scene | Interval p99 before/after | Worst interval before/after | Mean CPU render submission before/after |
| --- | ---: | ---: | ---: |
| Sparse grass | 17.2 / 17.0 ms | 17.5 / 17.2 ms | 0.171 / 0.148 ms |
| Young spreading grass | 17.1 / 17.0 ms | 18.7 / 17.3 ms | 0.146 / 0.123 ms |
| Mature dense grass | 17.0 / 17.0 ms | 17.8 / 17.5 ms | 0.126 / 0.114 ms |
| Fading grass | 17.2 / 16.9 ms | 21.3 / 17.3 ms | 0.143 / 0.110 ms |
| Mixed + dense grass | 17.1 / 17.0 ms | 17.9 / 17.5 ms | 0.147 / 0.125 ms |
| Dense mixed + hurricane | 17.2 / 17.0 ms | 18.5 / 17.3 ms | 0.203 / 0.171 ms |

All twelve windows averaged about 60 FPS, with zero >50ms or >300ms intervals.
CPU submission p99 was 0.3–0.8ms before and 0.3–0.4ms after. The largest revised
submission was 2.2ms (mixed/quiet). Sub-millisecond timings are coarse and
environment-sensitive; these lower submission samples do not establish a general
performance improvement or smooth GPU/compositor presentation. Timing brackets
`app.render()` on the CPU, without waiting for GPU completion.

Display objects before/after remain **46** sparse, **221** young, **654** mature
or fading, **1,358** mixed/grass and **1,366** mixed/hurricane, plus 400 separately
counted rain particles in hurricane. Atlas dimensions, source count and frame
count match. No frame caused texture generation or Graphics geometry rebuilding;
all twelve new grass construction contexts were destroyed after baking.

All **37 standard JavaScript suites** pass (40 Node files including one harness
and two optional-browser skips). The installed-Chrome cache/pixel suite passes
root/index rendering, SSE fixture growth, inspection, DPR 2/resizes, reconnection
and retained diagnostic/Canvas/stress controls. App/backend checks build and run
successfully with isolated output:

```sh
dotnet build tests/PacketGarden.Checks/PacketGarden.Checks.csproj --no-restore -o artifacts/grass-art/checks
dotnet artifacts/grass-art/checks/PacketGarden.Checks.dll
```

The build has no errors; NU1900 remains because NuGet vulnerability data was
unavailable. `git diff --check` passes. No commit, push or deployment is included.

Finite variants can still repeat, and the logical garden grid remains visible.
Very young or late-fading blades become faint at small viewports under the
unchanged growth/opacity rules. Grass has no new wind/sway animation. GPU memory
over time, compositor presentation and a new real-traffic soak were not profiled;
historical stutter uncertainty and the known Pixi teardown exception remain.

# Phase 2B plant artwork and scale review (2026-10-20)

The default and live-diagnostic gardens share a focused cached-artwork pass:

- Broadleaf has 5–8 overlapping pointed leaves, curved blades/veins, visible
  stems, varied leaf angles and layered restrained greens.
- Blackthorn has crooked dark wood, unequal forks, 5–8 pale thorns and sparse
  plum/slate foliage. Its bare woody silhouette stays distinct from green vines.
- Ordinary weed has 3–4 palmate fans of five or seven narrow serrated leaflets,
  green stems and subtle shade/angle variation. The separate `collectible_weed`
  mutation texture and behavior are unchanged.

Flowers and crystal fungus are **12%** larger; mushrooms and wireferns **16%**;
ghostbloom **10%**. These multipliers apply to each existing stage's bake scale,
retaining stage differences and the existing fade opacity. The mushroom's 64px
source anchor moves from 0.90 to 0.94 during baking: its longest stem reaches
y=63 and otherwise crosses the 32px tile edge when enlarged. Final Sprite
anchors, logical cells, hit testing and world positions are unchanged. The three
redesigned species use purpose-drawn tile coordinates rather than a global scale
increase. Vines, redbloom, and the synthetic stress/Canvas artwork are unchanged.
Variant selection/probabilities and existing inspection labels are retained;
the new broadleaf/weed variants are restrained green interpretations.

## Cache bounds and regression checks

No atlas refactor was needed. The specimen atlas still has **763 frames** in a
logical **1024x768** sheet at resolution 2 (2048x1536 physical pixels). Including
ambient/ecology, **781 frames across three retained sources** and all source
dimensions are unchanged. The new tiles replace 240 existing slots; temporary
construction Graphics increase from 80 to 320, all explicitly released with their
owned contexts after baking. Retained Sprite/connection counts do not increase.
There is no new per-frame geometry, texture generation, RNG use, neighbor work,
renderer scheduling or display-object allocation.

`tests/pixi-plant-art.cjs` compares cached construction against vine checkpoint
`916e7b969ea9218478202593088f6e9de614df26`, checks finite fans/thorns, stage scales,
anchor/atlas dimensions, protected artwork and construction ownership. The
existing Chrome artwork fixture adds a `--plants` mode (uses already available
Playwright and Sharp, installs nothing):

```sh
node tests/pixi-vine-art-browser.cjs --run --plants --baseline --seconds=20
node tests/pixi-vine-art-browser.cjs --run --plants --seconds=20
```

Use Node's normal module search path or `NODE_PATH` for the existing tools. Five
fixtures cover broadleaf, blackthorn, weed, mixed, and dense mixed/grass/hurricane.
Each has 640 specimens with multiple vigor/color/stage combinations, with ages
and seeded random state held fixed for identical before/after comparisons. Native
animation time and hurricane particles continue normally. Desktop 1280x900 and
smaller 720x700 viewport screenshots (DPR 1) are saved in ignored
`artifacts/plant-art/before/` and `after/` as `<scene>.png` and
`<scene>-small.png`. Atlas PNGs, geometry bounds and raw timing JSON are alongside.
The fixture checks matching specimen tuples, unchanged counts, zero geometry/
texture regeneration during samples, and all 320 released construction contexts.

Every edited frame has a transparent pixel border; new Graphics geometry fits
inside its tile with at least a half-pixel inset. All 763 frames are nonblank.
Vine, redbloom, rain, probe and collectible-mutation atlas pixels match the
checkpoint byte-for-byte. The full `createView`/animation/connection implementation,
shared garden models, ecology, SSE and backend are unchanged.

## Phase 2B measurements and validation

Installed headless Chrome 155.0.8059.80, native ticker, 20 seconds per scene per
version (about 1,200 frames each), against checkpoint `916e7b9`. Timing windows
exclude fixture construction, screenshot readback and resizing:

| Scene | Interval p99 before/after | Worst interval before/after | Mean CPU render submission before/after |
| --- | ---: | ---: | ---: |
| Broadleaf | 17.0 / 17.0 ms | 19.0 / 17.3 ms | 0.136 / 0.143 ms |
| Blackthorn | 16.9 / 17.1 ms | 17.1 / 17.9 ms | 0.116 / 0.123 ms |
| Weed | 16.9 / 16.9 ms | 17.2 / 17.1 ms | 0.107 / 0.094 ms |
| Mixed | 17.0 / 17.0 ms | 17.5 / 17.2 ms | 0.111 / 0.093 ms |
| Mixed + grass + hurricane | 17.0 / 16.9 ms | 17.2 / 17.3 ms | 0.155 / 0.143 ms |

All ten windows averaged about 60 FPS, with zero intervals above 50 or 300 ms.
CPU submission p99 was at most 0.3 ms in these final windows; the largest single
submission was 3.7 ms in the revised hurricane case (baseline 1.3 ms). Small mean
differences vary by run and do not establish a speed improvement. Submission
timing brackets `app.render()` without waiting for GPU completion. Increased
foliage coverage may increase fragment work; no GPU trace or startup-time
comparison was collected.

Display objects before/after stayed **654** for each dominant-species fixture,
**718** mixed, and **1,366** mixed/grass/hurricane. Rain particles are separate
(400 in hurricane). All generated atlas dimensions, frame counts and retained
sources match. No textures or Graphics geometry regenerated during samples.
The mushroom margin check initially failed at 16% enlargement; the 0.94 bake
anchor above corrected it, and all final atlas/pixel checks pass.

All **36 standard JavaScript suites** pass (39 Node files including one harness
and two optional browser skips). The optional real-Chrome cache/pixel suite
passes both homepage routes, SSE fixture growth, inspection, DPR 2/resizes,
reconnection and retained live-diagnostic/Canvas/stress controls. .NET app/checks
build and backend checks pass using an isolated output directory:

```sh
dotnet build tests/PacketGarden.Checks/PacketGarden.Checks.csproj --no-restore -o artifacts/plant-art/checks
dotnet artifacts/plant-art/checks/PacketGarden.Checks.dll
```

The build retains NU1900 because NuGet vulnerability data was unavailable;
there were no build errors. `git diff --check` passes.

This is a static synthetic rendering comparison, not a new live-NATS soak or
GPU/compositor trace. Finite silhouettes can repeat in dense rows. Serrations
become subtle in the smaller viewport; dark blackthorn foliage can recede against
grass. Historical stutter uncertainty and the known teardown exception below
remain unresolved. No commits or deployment are part of this artwork review.

# Pixi vine artwork review (2026-10-20, uncommitted)

The shared default/live renderer now uses muted sage, moss, straw and silver
vine colors, curved branching stems, small leaves and open tendril curls.
Vigor and the five existing color identities still select finite cached tiles.
Cell-seeded offsets, lean and mirroring vary the silhouettes without consuming
model randomness or moving logical cells. Connections use thinner translucent
curves with matching endpoints/tangents; a symmetric pair seed draws about half
the orthogonal links and occasional diagonals, removing the repeated X lattice.
This thins only the displayed network. Growth, placement, competition, lifetimes,
model hue probabilities, interaction priority and other species are unchanged.

The 80 vine tiles replace existing atlas slots: **763 live frames**, or **781
frames across three retained atlas sources** including ecology/ambient, with
unchanged atlas dimensions. One Sprite and one connection Graphics remain per
vine. Temporary vine Graphics contexts are explicitly destroyed after baking;
connection ownership/removal follows the existing path. Geometry and eight-cell
neighbor checks still occur only on specimen changes; no new per-frame work,
scheduling, filters, dependencies, controls or renderer architecture were added.
The default and diagnostic pages advance only their renderer script cache token.
Canvas and the separate synthetic stress artwork remain unchanged.

## Reproduce the artwork comparison

`tests/pixi-vine-art-browser.cjs` is optional and uses installed Chrome plus an
already available Playwright runtime; it installs no dependencies. Make that
runtime available through Node's normal module path (`NODE_PATH` if necessary):

```sh
node tests/pixi-vine-art-browser.cjs --run --baseline --seconds=20
node tests/pixi-vine-art-browser.cjs --run --seconds=20
```

The baseline serves the immutable `a7e391cf0f8a614d763d6fa86f9f474d4a2dd075`
renderer. Both runs use the current production page and the same deterministic
640 cells, vigor/color samples, 640 grass patches and eight puddles at 1280x900,
DPR 1. Cases are all vines/quiet, all vines/hurricane and mixed/hurricane, with
400 rain particles for hurricanes. Screenshots and raw JSON are written to
ignored `artifacts/vine-art/before/` and `after/`. Logical time is deliberately
frozen to keep density/ages identical, while real animation timestamps and rain
continue. This is a static synthetic rendering comparison, not a live NATS soak
or an expiry/churn benchmark. Saved positions/variants are compared automatically.
Use `--scene=vines-hurricane --label=after-repeat` for an isolated repeat.

The new `pixi-vine-art.cjs` checks dense symmetry, endpoint/tangent continuity,
non-wrapping, bounded links, arrival-order determinism, stage refresh and removal,
unchanged logical specimens, and zero geometry/neighbor work during animation.
The browser fixture also verifies that all 80 temporary vine contexts are
released and no geometry or texture regeneration occurs during measured frames.

## Local measurements and checks

Installed headless Chrome, three 20-second samples per version (about 1,200
frames each), before/after screenshots reviewed with identical logical positions:

| Scene | Interval p99 before/after | Worst interval before/after | Mean render submission before/after |
| --- | ---: | ---: | ---: |
| 640 vines, quiet | 17.0 / 17.0 ms | 17.5 / 18.8 ms | 0.118 / 0.128 ms |
| 640 vines, hurricane | 16.9 / 17.0 ms | 18.8 / 17.3 ms | 0.139 / 0.146 ms |
| 640 mixed, hurricane | 16.9 / 17.0 ms | 17.3 / 17.4 ms | 0.134 / 0.134 ms |

All six samples averaged approximately 60 FPS, with zero intervals above 50 or
300 ms. Dense-vine display objects stayed **1,942**, mixed **1,366**, with rain
particles counted separately (400). Drawn vine half-curves fell **4,812 -> 1,590**.
No recurring geometry or texture generation was observed. The first revised-art
run measured 0.163 ms mean hurricane submission, versus 0.139 ms baseline; a
separate 20-second hurricane repeat measured 0.190 ms baseline and 0.170 ms revised.
Small differences vary between runs; there is no consistent measured submission
cost increase here. Submission timing brackets `app.render()` on the CPU and
does not wait for GPU completion; sub-millisecond browser timing is coarse.

All 35 standard Node suites pass, including the new vine suite. The optional
real-Chrome cache/pixel test passes for root/index, visible SSE fixture growth,
inspection, resize/DPR 2, reconnection and retained diagnostic/Canvas/stress
controls. Its cache warm-up now explicitly uses the historical unversioned asset
URLs, independent of the current diagnostic artwork version token. .NET build
and backend checks pass using `dotnet build tests/PacketGarden.Checks --no-restore
-o artifacts/vine-art/checks` followed by `dotnet
artifacts/vine-art/checks/PacketGarden.Checks.dll`. Normal output was locked by
the existing running server; it was left running. The build retained a NU1900
warning about unavailable NuGet vulnerability data. `git diff --check` passes.

These measurements do not explain the historical stutter or establish GPU/
compositor smoothness. The finite texture silhouettes can still repeat; thin
foliage has less contrast against dense grass, particularly at small sizes.
Logical cell spacing remains, and this work adds no animated plant swaying.
Normal-browser human aesthetic review and another live/high-DPI soak remain useful.
The pre-existing Pixi teardown exception described below remains out of scope.

# Default Pixi garden promotion (2026-10-20)

Following the stability checkpoint `61090b7529b275e849b7fbad4e5fd3dcbead9d59`,
`/` and `/index.html` use the existing PixiJS/WebGL garden. `/canvas.html`
retains the original Canvas page, scripts and controls. `/pixi-live.html` remains
the development/live-soak page; `/pixi-stress.html` and its implementation are
unchanged. The historical sections below describe their earlier route layout.

The default and diagnostic pages load the same Pixi renderer and shared modules
in the same order. `pixi-live.js` treats development controls as optional DOM
elements. Without weather selectors it follows live SSE weather, without a HUD
it collects no frame timing samples, and without a probe checkbox it hides the
green probe. The diagnostic page retains seeding, forced mutations/overlaps,
manual weather, pause, probes and its timing HUD. The shared atlas helpers in
`pixi-stress.js` load in library mode; its synthetic page never starts on either
live garden. There is one EventSource and the same native ticker, 250ms logical
cadence, persistent views, DPR cap, visibility reconciliation and cleanup.

The homepage keeps PacketGarden branding, About/Canvas navigation, live
connection/weather status, exact inspection/collection and Recent activity with
its visibility toggle. It starts no simulated specimens. WebGL initialization
failure is reported in the connection status; the Canvas link remains available
for an explicit fallback. Audio, gnomes and exact Canvas artwork/palette parity
remain absent from Pixi. This promotion changes no backend, event contract,
models, artwork, species balancing or dependencies.

The user-observed soak below supports promotion, not a root-cause explanation or
a new performance-equivalence claim. Earlier visible stutter remains unexplained;
the historical measurements and their GPU/compositor/heap limitations are retained.

Validation for this promotion: all 34 Node suites pass (35 JavaScript files
including the browser harness), `dotnet build PacketGarden.csproj` passes with
zero warnings/errors, and `dotnet run --project tests/PacketGarden.Checks` passes.
The checks project reported NU1900 because NuGet vulnerability data was
unavailable; the checks themselves completed successfully. `git diff --check`
passes. Existing Canvas tests now load `canvas.html`; `pixi-default.cjs` runs
the homepage's actual script order against strict DOM lookup and injected
Pixi/SSE/clock implementations. It covers missing development DOM, no timing
collection or automatic simulated traffic, live weather/reconnection,
inspection/collection, resize/DPR, visibility/expiry, teardown and visible
WebGL initialization failure. The diagnostic entry-point suite still passes.

Browser checks in the Codex in-app browser separately opened `/`, `/index.html`,
`/canvas.html`, `/pixi-live.html`, `/pixi-stress.html` and `/about.html`. The default
garden rendered with live weather SSE, its Recent toggle worked, and a 390×844
viewport retained the whole garden and status controls. About returned to
`/index.html`. Canvas fake DNS input grew a specimen. Diagnostic dense seeding,
manual hurricane, specimen inspection and visitor → Amanita → mutation collection
worked; stress scene/weather controls worked. No console warnings/errors were
captured during these checks. A local ignored screenshot is saved at
`artifacts/pixi-default-preview.jpg`.

The local server had no `Nats:Url` configured, so no real TCPNoise arrivals were
verified in this run. Production event processing is covered with injected SSE;
the real browser collection checks used the diagnostic page's local fixtures.
High-DPI mapping, actual visibility handlers and cleanup were verified with
injected callbacks; browser-level suspension and a new Chrome/live-NATS soak
were not tested. No GPU trace, long-duration memory profile or before/after
performance-equivalence benchmark was collected. The homepage's larger drawable
area can change GPU workload; the renderer's existing DPR cap remains unchanged.

## Black homepage cache regression (2026-10-20)

A fresh load rendered correctly in both the in-app browser and installed Chrome,
including real NATS/TCPNoise growth. A real Chrome HTTP-cache upgrade test then
reproduced the reported black homepage: first visit the checkpoint diagnostic
page, caching its `pixi-live.js` and `pixi-live.css`, then load the promoted
homepage. With the unchanged asset URLs, Chrome reused the old script without
requesting its new body. That diagnostic-only script reads the absent weather
selectors, and its rejection handler also reads the absent HUD. Captured errors
were `Cannot read properties of null (reading 'value')` and
`Cannot set properties of null (setting 'textContent')`.

Initialization stopped before resizing and `app.start()`. The actual scene held
visible soil/grid geometry with finite transforms, and the canvas was nonzero
(960×600 CSS pixels), but the ticker was stopped and zero frames had painted.
The connection could still say connected, masking the failed initialization.
The original user's Chrome cache was not inspected; this is a controlled,
reproducible checkpoint-to-promotion failure with the same visible symptom.

The homepage now requests `pixi-live.js?v=phase1b-1` and
`pixi-live.css?v=phase1b-1`, bypassing those pre-promotion cache entries. Only its
asset URLs changed; renderer algorithms, artwork, models, backend, diagnostic
page and stress implementation were untouched by this fix. Future incompatible
changes to these assets must advance the homepage's version tokens.

`tests/pixi-default-browser.cjs --run` exercises this upgrade with an installed
Chrome and an already available Playwright runtime on Node's module path. It
installs nothing. It uses a temporary local HTTP origin, the immutable checkpoint
assets and real browser caching, rather than Playwright request interception
(which disables caching). A test-only app observer records ticker/scene state;
PNG pixels verify visible soil/grid before any growth and actual specimen pixel
changes after a normalized SSE fixture. The test also checks root/index routes,
DPR 2, narrow/wide resize, inspection, native SSE reconnect, retained diagnostic,
Canvas and stress controls, and visible reporting of a simulated WebGL
initialization failure.
`--run --unversioned` is a negative control: it must fail with zero soil/grid
pixel coverage and the cached-script exceptions. Normal Node suite runs skip
this optional real-browser test unless `--run` is passed.

Both the negative control and the fixed browser test behaved as expected. The
existing default-page test now checks versioned asset URLs while comparing the
shared script paths independent of query strings. A separate installed-Chrome
check against the NATS-connected ASP.NET server verified visible live growth,
inspection labelled `Live TCPNoise`, finite root scale/position, an active ticker
and no runtime exceptions before teardown. Evidence is local/ignored under
`artifacts/homepage-negative/`, `artifacts/homepage-browser/`, and
`artifacts/chrome-real-nats-fixed.png`. These checks establish rendering and
cache-transition correctness, not a new performance or long-soak claim.

A separate pre-existing teardown exception was captured when closing Pixi pages:
a visibility callback can call `app.stop()` after pagehide has destroyed its
ticker (`Cannot read properties of null (reading 'stop')`). It also occurred on
the unchanged stress page and was not the black-startup failure. It remains
outside this homepage-only fix; pre-teardown page errors are checked separately.

---

# Stable Pixi renderer checkpoint (2026-10-20)

On October 20, 2026, the user observed `/pixi-live.html` running smoothly in
Chrome with real NATS/TCPNoise events and an established SSE connection. The
user reported no obvious visual stuttering during this observation. The reported
screenshot showed PixiJS 8.22.0, WebGL, native ticker, 383 live specimens, and
manual hurricane weather at the fixed 10,000 events/min test intensity.

| Measured duration | Frames | Session / recent average FPS | Session worst interval | >50ms / >300ms |
| --- | ---: | ---: | ---: | ---: |
| 655 seconds | approximately 39,225 | 59.9 / 60.0 | 66.8ms | 4 / 0 |

This user-observed live soak records a stable checkpoint of the existing Pixi
implementation before visual redesign work. It is not a new automated benchmark
or a confirmed root-cause fix. Why the previous lag disappeared remains unknown;
ticker intervals and average FPS do not measure GPU completion or guarantee smooth
presentation in other sessions. The earlier stutter findings and measurement
limitations below remain valid historical evidence. This checkpoint changes
documentation only; runtime behavior is unchanged.

---

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
