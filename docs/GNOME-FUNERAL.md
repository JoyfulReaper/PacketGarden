# Great Gnome Funeral Procession

Four tiny gnomes carry one curled brown leaf on a miniature wooden stretcher.
Nobody knows whose funeral it is. No plant actually needs to die.

Implemented on `dev` from clean `9aeeca4` (2026-11-03). Existing heists,
campfires, wizards, landscaping, logs, fungi, snails, frogs, real grass ecology,
inspection and ordinary disputes remain in place.

## Scheduling and isolation

`garden-gnomes.js` uses the existing **45-second** check, **2%** base chance and
minimum **30 living specimens**. The branch order is heist (30% when eligible),
campfire (40% when eligible), wizard (25% when eligible), then funeral (**20%**
of remaining ordinary-dispute outcomes), followed by ordinary dispute fallback.
Earlier probability boundaries and draws stay in the same order. Landscaping
checks retain their existing odds and priority after a failed base incident.

The conditional funeral share is not a 20% chance every 45 seconds. With no
earlier eligible special branch, its combined chance is **0.4% per eligible
check**. When all earlier branches are eligible it is **0.126%**:
`.02 × .7 × .6 × .75 × .2`. Selection uses the existing injectable gnome random
callback. One direction draw and one route-height draw are made at creation;
later ticks/frames draw no funeral randomness. All incident start methods
refuse overlap, and there is no second scheduler.

A funeral captures only its creation/clock data and numeric route. It never
selects or retains a plant, terrain log, snail, frog or grass patch. Starting it
reads the ordinary living count; advancing it performs no garden mutation or
ecological influence. Natural loss of unrelated plants does not retarget the
procession or create a reason for it. The leaf is artwork, not a specimen, drop,
curiosity or inventory item. No TCPNoise/SSE event, Recent row, accepted-growth
count, rarity, vigor, lifetime, score or progression is introduced.

## Formation, route and ceremony

Four actors remain together: two `pallbearer` roles around one shared prop,
followed by two `mourner` roles. Their horizontal offsets are **+22, −22, −50,
−76** logical pixels relative to the prop center, multiplied by route direction.
Both bearers remain **44 pixels** apart. Carrying colors/arms face inward in
either direction. The vertical route is selected once between **180 and 390**
logical pixels, within the existing 960×600 garden.

| Age | Behavior |
| --- | --- |
| 0–3s | Enter from left or right; the existing garden mask clips the entrance. |
| 3–13s | March across the garden in one file. |
| 13–16s | Remain stationary; the last follower bows its head. |
| 16–18s | Continue a short distance and fade together. |
| At 18s | Clear actors, route and shared prop. |

The left-to-right reference center moves from −36 to 116 during entry, then
to 740 at the ceremonial pause, and toward 812 during departure. Right-to-left
travel mirrors those coordinates across the garden. After entry the entire
formation remains inside the garden; it fades instead of rushing off the far
edge. The route needs no pathfinding, collision reservation or occupancy bypass.
Existing gnome layering permits decorative overlap with plants and terrain.

One Sprite combines the tiny slatted wooden stretcher, handles and a single
brown leaf with a vein and curled tip. Its position follows the midpoint of
the rendered bearers, with the carrying-height offset, matching their fade.
It tilts gently if their existing click reactions differ. Existing puddle
reactions retain their usual cached presentation; no new water/particle effect
is introduced. No prop is copied per actor, and the leaf never separates from
the stretcher.

Reduced motion uses four entry steps, twelve march steps and four departure
steps, static carrying artwork, a completely stationary ceremony and a shared
gentle departure fade. There is no prop bob, flashing, shaking or new effect
cycle. Normal followers use the existing walk frames at a slower step cadence.
Ordinary dispute/wizard/campfire movement rules are unchanged.

## Input, sound and lifecycle

The existing transformed gnome body hitboxes and priority apply. Each of the
four actors consumes one normal underpants attempt, including when the shared
drop cap is full. Repeated clicks still consume input without extra drops or
messages. The prop is `eventMode='none'` and absent from logical collectible
hit testing. A click on its leaf does not manufacture a collection; underlying
ordinary inspection remains available according to the existing hit rules.

The only cue is the existing `arrival` cue, using the existing Sound On gesture,
volume, mute, suspension and page-lifetime ownership. There is no funeral music,
battle/victory cue, new audio engine or automatic audio activation.

Both logical ticks and visual advancement validate finite time, monotonic
observation time and continuity with the last logical tick. A gap **greater
than 1500ms** cancels before any movement/cue replay; an exact 1500ms gap is
allowed. Separate observed-time tracking catches a backwards clock movement
inside a logical interval. Rendering cannot conceal a stalled logical clock.
Hidden tabs cancel immediately and resume with a fresh 45-second cadence.
Large stalls, backwards/nonfinite time, Clear, reseed, completion and page
teardown destroy every owned actor/prop Sprite, remove the transient group,
clear puddle reactions and release the route. No invisible leaf or stretcher
remains. Shared atlas textures survive individual incident cleanup.

The normal specimen-removal adapter now forwards its existing removal reason.
`cleared` notifications cancel an active funeral without treating unrelated
natural expiry as a target loss. The public Clear/Seed controls also clear a
funeral explicitly, covering a garden that became empty during its march.
Other incident removal behavior and the public SSE contract are preserved.

## Atlas, object counts and performance

Most artwork reuses the original walk and carrying frames. Only **two** 40×32
slots are appended: `funeral:bow` and `funeral:stretcher`. The gnome atlas grows
from **37 to 39 frames**, logical **1480×32 → 1560×32**, physical **2960×64 →
3120×64** at 2x resolution. This adds **2,560 logical / 10,240 physical pixels**,
or **40,960 bytes (40 KiB)** for RGBA8 base-level storage, plus two Texture
wrappers. Driver alignment, metadata and implementation-specific overhead are
outside that estimate. Existing frame positions/artwork remain intact; no
additional texture source or bake is introduced.

Idle display-object allocation is **zero**. A dry active funeral uses **four
actor Sprites + one combined prop Sprite + one existing transient Container**.
Existing wet-boots reactions may use their usual bounded cached splash Sprites.
No additional renderer, ticker, animation loop, WebGL context, particle system,
per-frame Graphics or per-frame texture creation is introduced. The diagnostic
HUD counts the shared prop. Visual prop attachment uses a bounded scan of the
four actor views without per-frame formation arrays.

The focused Chrome run compared idle and active fixtures containing 35 ordinary
plants and two colonized logs:

| Local CPU work | Idle median | Active median |
| --- | --- | --- |
| Gnome advance plus view animation | 0.0002ms | 0.0019–0.0021ms |
| Logical gnome tick | 0–0.0001ms | 0.0011ms |
| Whole-application render submission | 0.020–0.025ms | 0.015–0.020ms |

These small differences are sensitive to warm caches, timer resolution and
scheduling noise. Lower render-submission samples do not imply an improvement.
They measure local CPU work, not GPU completion or device-wide frame-rate
guarantees. The raw median/p95 values are saved with the screenshots.

Across **100 creation/clear cycles per page**, all **1,000 actor/prop Sprites**
were destroyed. Existing-garden object counts returned to **56 before / 56
after** on both pages. Application bakes stayed **5 / 5**, the gnome atlas
remained one source, and additional Graphics commands/contexts during those
cycles were **zero**. Page teardown then destroyed shared sources normally.
Node integration separately verifies 120 repeated five-Sprite cleanup cycles.
Object ownership counts establish bounded retention; they are not an exact
JavaScript heap/driver byte measurement.

## Diagnostics, screenshots and validation

`garden-funeral-dev.js` loads only on `/pixi-live.html`. Six controls trigger a
procession, preview normal/reduced motion, simulate hidden/tick-gap cancellation,
and clear/verify actual actor/prop cleanup. They require ordinary eligibility,
refuse overlap, and never plant/remove anything or fabricate network provenance.
The existing garden seed control can supply 30 living simulated specimens.

`artifacts/gnome-funeral/index.html` links **20 actual-scale screenshots** across
homepage and diagnostic pages: entering, marching with stretcher, ceremonial
pause, departure, completion, day, night, reduced motion, mirrored travel and
390×844 mobile. Screenshots were reviewed at actual garden scale, including
the small contained mobile garden. `artifacts/gnome-funeral/review.json` records
route phases, prop attachment, unchanged garden state, native input/audio,
resource ownership and CPU samples.

`tests/gnome-funeral.cjs` tests exact probabilities/priority/fallback, count gates,
mutual exclusion, four actors/one prop, formation and both directions, bounds,
pause/end, hidden/stall/backwards/nonfinite clocks, no replay, reduced motion,
ordinary underpants and noncollectible leaf, source independence, unchanged
garden/terrain/fungi/events, shared textures, repeated cleanup and real page
reset/teardown. `tests/gnome-funeral-browser.cjs --run` repeats critical paths
using installed Chrome, actual Pixi/WebGL, native body/leaf clicks, real garden
objects, original audio and diagnostic controls. It is included in the full
Chrome runner. Existing odds tests retain earlier branch boundaries, then
explicitly reject the new funeral branch when testing ordinary disputes.

Commands:

```powershell
npm test
$env:NODE_PATH='C:\Users\me\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
npm run test:chrome
dotnet build PacketGarden.csproj --no-restore -o artifacts/gnome-funeral/debug
dotnet build PacketGarden.csproj --no-restore -c Release -o artifacts/gnome-funeral/release
dotnet build tests/PacketGarden.Checks --no-restore -o artifacts/gnome-funeral/checks
dotnet artifacts/gnome-funeral/checks/PacketGarden.Checks.dll
node tests/weather-sse.cjs --run artifacts/gnome-funeral/debug/PacketGarden.dll
```

Debug/Release and backend-check builds pass with zero warnings/errors. Backend
assertions and actual ASP.NET polling → SSE integration pass. Local browser and
socket checks require execution outside the sandbox. No backend source changes
are included. Changes remain uncommitted on `dev`.

Final validation: **72 Node suites passed**, with **24 optional Chrome/SSE entry
points skipped** in that runner; **30 Chrome jobs passed**, including the full
homepage, existing incident families, wizard, terrain, fungal logs, snails,
inspection, native audio and historical baseline checks. No final failures.
`git diff --check` passed; no commit, push, merge or deployment was performed.
