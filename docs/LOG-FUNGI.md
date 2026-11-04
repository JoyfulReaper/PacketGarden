# Fallen-log fungal lifecycle

Implemented on `dev` from `657d319` (2026-11-03). This feature decorates and
accelerates decay of existing blocking terrain. It adds no plant species,
specimens, collectible, network activity, rarity, vigor, lifetime changes to
plants, or points. Score remains 0.

## Decision and identity

After authoritative terrain creation, `garden-core.js` registers the exact
frozen log with the companion model in `garden-log-fungi.js`. One dedicated
crypto/clock-seeded PRNG draw succeeds when `0 <= roll < .35`. It never advances
placement, specimen cosmetics/rarity, competition, terrain or wildlife streams.
Both positive and negative decisions are stored per object, with no later
reroll. A weak decision marker prevents rediscovery of an already-decided
object after state cleanup without strongly retaining removed logs.

The companion Map holds at most six records. Each retains the exact log object
and its original id, cell, column, row, createdAt, expiresAt and variant.
Before stage reconciliation or early removal, validate every captured field,
valid dimensions and finite timestamps, current finite time, the original
expiry, `terrain.byCell.get(cell) === log`, and `terrain.logs.includes(log)`.
A stale, moved, altered or replaced reference loses its fungal state/artwork;
it cannot remove the current cell occupant. Plants and lookalike objects outside
the actual terrain collection never receive a roll. No source tree is retained.

## Absolute deadlines

All ages use the existing log's absolute `createdAt`, which is the blackthorn's
original natural expiry time. The frozen log and `terrainConfig.lifetimeMs`
remain unchanged.

| Colonized log age | Presentation/action |
| --- | --- |
| Less than 10 minutes | No shelf-fungus Sprite. |
| 10 to less than 20 minutes | Two small early shelves. |
| 20 to less than 40 minutes | Three mature cream/ochre brackets. |
| 40 to less than 50 minutes | Five weathered, irregular shelves. |
| At least 50, less than 60 minutes | `terrain.remove(log, 'fungal-decay')`. |
| At least 60 minutes | Ordinary terrain expiry takes precedence. |

Uncolonized logs keep their original 60-minute expiry and never acquire art.
The shared logical garden tick first reconciles ordinary terrain expiry, then
fungal state, then specimen lifecycle. New logs are reconciled immediately at
creation as well. A delayed blackthorn expiry can therefore create a mature
colony directly, or create/remove already-overdue colonized terrain in the same
tick. If the entire ordinary log lifetime was missed, terrain creates no log
and there is no colonization decision.

Removal happens on the first existing logical tick at/after the deadline,
normally within 250ms while active. There are no new timers or catch-up loops.
Hidden tabs do no fungal work. The existing resume path invokes the shared
model once, selecting the current stage or removing that exact overdue log.
Long stalls never replay intermediate artwork. At/after 60m, ordinary expiry
removes the log with reason `expired`, and fungal state is simply discarded.

Nonfinite time does nothing. Backwards time recomputes the absolute stage;
before creation it hides artwork while retaining the one-time decision.
Creation/expiry deadlines never move, and removed logs never reappear.

## Interactions and ownership

Logs block their cells until `terrain.remove` succeeds. Fungi add no separate
occupancy and never bypass replacement rules. Authoritative removal immediately
frees the cell. Neither decay nor decoration creates grass or mushrooms; the
existing ecology and specimen placement APIs may subsequently reclaim it.

Gnomes select colonized logs normally. Campfire consumption removes the colony
along with its parent. Fungal decay during an incident follows the existing
exact-target cancellation path, leaving other logs alone. Log snails retain
their source habitat until actual removal, then receive the existing source
notification: pending grazes/source references are released immediately and
the existing three-second departure completes. Spawn odds, grazing rules and
the collectible snail remain unchanged.

The fungal model releases its record before notifying/removing, tolerating
synchronous observers and reentrant ticks. It revalidates after decoration
cleanup before calling terrain removal. Clear and reseeding remove terrain and
fungal records through the same notifications. Explicit model destruction
disposes fungal ownership; page teardown clears the shared model and destroys
the existing Pixi view/atlas through the existing lifetime owner.

## Artwork and memory

The original specimen atlas had exactly **832 slots / 26 full rows**, so there
was no unused slot. Nine new 32×32 frames (three stages × three wood variants)
append to one extra row: **841 frames**, logical size **1024×864**, physical
size **2048×1728** at 2x. The nine frames occupy **9,216 logical / 36,864 physical
pixels**. Row allocation adds **32,768 logical / 131,072 physical pixels**, or
**524,288 bytes (512 KiB)** for one RGBA8 base level. This estimate excludes
driver alignment, metadata and any implementation-specific GPU overhead.

All original slots remain in place. One existing atlas source grows; no new
source, bake, renderer, ticker, WebGL context or idle display object is added.
There are nine additional shared Texture frame wrappers. A visible colony owns
one child Sprite attached at the log's rooted origin, using its actual variant
and position. The maximum is **six additional Sprites**, zero Containers.
Cream rims, ochre tops and dark lips read as shallow shelves on bark. Existing
day/night/storm surface lighting applies normally, without glow or animation.

Stage updates swap a cached texture on the same child. The existing terrain
removal destroys children, and source invalidation destroys just the decoration.
Individual cleanup never destroys shared textures. The normal atlas owner
releases frames and the source on teardown. One-time Graphics are destroyed
after rasterization. Fungi add no per-frame model or animation call.

## Diagnostics and evidence

Only `/pixi-live.html` loads `garden-log-fungi-dev.js` and shows fungal controls:
ordinary/colonized actual simulated logs; early/mature/weathered growth; the
50-minute terrain boundary; existing campfire; exact source removal; occupancy
and actual ecology reclamation; clear/reset. Forcing is restricted to simulated
logs. The fixture advances terrain explicitly, without changing the live clock
or manufacturing TCPNoise/SSE input.

`artifacts/log-fungi/index.html` links 22 Chrome screenshots from homepage and
diagnostic pages: original, early, mature, weathered, mixed logs, campfire,
decomposed, night, storm, 390×844 mobile, and dense 634-plant/six-log gardens.
They were reviewed at actual garden scale. The brackets are deliberately small;
mobile containment reduces them together with the rest of the 960×600 garden.

`artifacts/log-fungi/review.json` contains raw Chrome version, scenes, CPU
samples and resource assertions. Timings are local CPU measurements, including
render submission rather than GPU completion; they are not device-wide FPS
guarantees. The final suite run with six colonized logs measured
**0.0011–0.0012ms median per fungal logical reconciliation**, with existing
view animation below the timer's resolution in both decorated/ordinary samples, and
**0.02–0.04ms** render submission. At 1,000 samples, creating all six child
Sprites cost **0.0092–0.010ms** and swapping six stage textures cost
**0.0031ms**. Scheduler overhead and coarse clock resolution affect such
small measurements; consult the report for each run.

Across 100 six-log create/clear cycles per page, **1,200 decoration Sprites**
were destroyed, all model records cleared, and cleared-tree object counts
returned to **17 before / 17 after** on both pages. Atlas bakes stayed **5 / 5**
for the whole application, with **zero new Graphics commands** during these
cycles. Shared sources remained alive until page teardown, then all were
destroyed. These bounded ownership checks measure retained objects; an exact
JavaScript heap/driver byte count is not inferred from them.

## Validation

`tests/log-fungi.cjs` deterministically covers probability boundaries and one
decision per actual creation; independent RNG; every growth/decay boundary;
ordinary expiry; exact authoritative removal; all retained identity fields and
stale list/map/replacement references; invalid/backwards/hidden/stalled time;
campfire burn and interruption; snail departure; full-garden placement and grass
reclamation; reentrant callbacks; six-log cap; clear/reseed/destroy; shared
Sprite/atlas ownership and unchanged event counts/score. The Pixi harness runs
both actual entry points and exercises 360 decoration cleanups.

`tests/log-fungi-browser.cjs --run` covers the same critical paths with real
Chrome/Pixi/WebGL, diagnostics and actual-scale screenshots. It is included in
`npm run test:chrome`. Existing ordinary-log, gnome and snail fixtures explicitly
choose no colonization to preserve their independent expiry assertions; the
new suites test the combined behavior. Previous browser baselines load their
matching historical garden core. Existing atlas assertions were updated for
the nine added frames and new height, retaining their original source/bake
and resource checks.

Commands used:

```powershell
npm test
$env:NODE_PATH='C:\Users\me\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
npm run test:chrome
dotnet build PacketGarden.csproj --no-restore -o artifacts/log-fungi/debug
dotnet build PacketGarden.csproj --no-restore -c Release -o artifacts/log-fungi/release
dotnet build tests/PacketGarden.Checks --no-restore -o artifacts/log-fungi/checks
dotnet artifacts/log-fungi/checks/PacketGarden.Checks.dll
node tests/weather-sse.cjs --run artifacts/log-fungi/debug/PacketGarden.dll
```

Node validation: **70 passed**, **22 optional Chrome/SSE entry points skipped**,
zero failures. `npm run test:chrome`: **28 passed**, zero failures, including
the fungal suite and historical browser baselines. Debug and Release builds
and the backend-check build pass with **zero warnings/errors**; backend checks
and actual ASP.NET polling → SSE integration pass. Local socket/browser tests
required execution outside the sandbox. No backend sources were changed.
