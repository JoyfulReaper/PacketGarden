# Wandering Wizard Gnome

The wizard visits an existing protected garden specimen and may encourage one
neighboring grass cell. It adds no species, network input, collectible, points
or progression. Implementation starts from clean `dev` at `dc8c6ac` (2026-11-03),
preserving the fallen-log, campfire, snail and fungal lifecycles.

## Eligibility and conditional odds

`garden-gnomes.js` retains the one shared **45-second** check and **2%** incident
roll with at least **30 living specimens**. Branches remain ordered:

1. Original incident eligibility and 2% roll.
2. Eligible mushroom heist, **30%**.
3. Eligible log campfire, **40%** of remaining outcomes.
4. Eligible wizard, **25%** of the remaining ordinary-dispute outcomes.
5. Ordinary dispute fallback.

Candidate-free branches consume no selection/share draw. Thus wizard share is
conditional, not a 25% chance every 45 seconds. With only wizard eligibility,
the combined chance is **0.5% per eligible check**. When all three special
branches are eligible it is **0.21%** (`.02 × .7 × .6 × .25`). Mushroom and
campfire probabilities and their earlier random draws are unchanged. Selection
uses the existing injectable gnome random callback; no second scheduler exists.
Every start method still refuses concurrent incidents.

Targets are **ghostbloom, crystalfungus, blackthorn and stillbloom**, strictly in
their living **mature** stage. Coordinates, positive id, creation time, specimen
collection membership, authoritative `byCell` ownership and absence of terrain
blocking must be valid. The wizard retains the original object plus id, type,
cell, column, row and createdAt. Every tick/visual advance rechecks that exact
identity; starting to fade also ends eligibility. A clone or replacement in the
same cell cannot inherit the visit. The target receives no mutation, lifetime
extension, vigor/rarity/color change or presentation override.

## One small spell

At creation, choose at most one of the eight immediately adjacent grid cells,
uniformly among cells allowed by current ordinary grass occupancy rules. Garden
edges never wrap. No available cell still permits a cosmetic wizard visit.

The incident captures the selected coordinates and their original grass object,
or empty state. At casting, validate the active incident and exact rare specimen,
finite current time and continuous logical clock, original ecology instance,
valid adjacent coordinates, current occupancy policy, and the original patch
identity/empty state. Then make at most one call to the existing
`ecology.influenceGrassCell(column, row, at)` API.

The attempt is consumed and its grass/ecology references released **before**
calling the API, so synchronous callbacks cannot cause a second cast. A successful
call adds one ordinary patch or refreshes the same existing patch with the
existing callback/inspection/Sprite behavior. The original patch's createdAt
survives refresh. If a patch disappeared, moved, was replaced, or appeared in an
originally empty cell, skip the effect. An invalid coordinate, changed ecology,
new blocker or newly disabled under-plants setting likewise skips. No retry,
alternate cell, fabricated grass object, direct grass array edit or cascade is
performed. An unsuccessful attempt can still display the cosmetic spell.

When under-plants grass is enabled, the spell honors that ordinary ecology
policy, including cells with real occupants. With the setting disabled it never
plants under a specimen or blocking terrain. Autonomous grass ecology continues
normally; the spell creates no special maintenance or regrowth rule. Grass
already influenced successfully remains ordinary grass if the wizard later
cancels or departs.

## Sequence, input and clocks

| Incident age | Action |
| --- | --- |
| 0–3 seconds | One wizard approaches beside the source. |
| 3–4 seconds | Examines the rare specimen. |
| 4–5 seconds | Raises a tiny staff. |
| 5 seconds | One logical cast attempt. |
| 5–8 seconds | A few pale stars and a restrained shimmer. |
| 8–14 seconds | Walks away; all effects end. |
| 14 seconds | Visit and remaining references disappear. |

The actor stands **22 logical pixels beside** the plant, keeping its normal body
hitbox away from the target cell center. Existing transformed gnome hit testing
and click priority apply only to the body. Spell Sprites receive no events.
Clicking uses the existing underpants attempt, consumed once per actor even if
the shared drop cap is full. Repeated clicks consume the hit without extra
drops/messages; the plant remains separately inspectable. No wizard staff/hat
collectible is added. Existing arrival audio uses the same muted-by-default path.

The existing 250ms logical path owns casting; visual advancement never influences
grass. Gaps **greater than 1500ms**, backwards or nonfinite time cancel before
an action. An exact 1500ms gap remains valid. Hidden tabs cancel immediately and
resume with a fresh 45-second cadence, never replaying a missed cast. Removal or
replacement calls `gnomes.specimenRemoved()` from the existing source notification.
Tick/visual identity checks also catch stale references independently. Clear,
fixture reseeding and page teardown release the target, grass plan, ecology
reference and all transient Sprites. No removed specimen is retained by the
incident. Reduced motion uses quarter-step travel, static poses and steady
spell opacity/positions, without flashing or rapid animation.

## Atlas, display objects and measurements

`pixi-live-gnomes.js` appends six wizard poses and two spell frames to the existing
29 gnome/fire frames. The same atlas source grows from logical **1160×32** to
**1480×32**, physical **2320×64** to **2960×64** at 2x resolution. Eight 40×32
slots add **10,240 logical / 40,960 physical pixels**, an estimated **163,840
bytes (160 KiB)** for RGBA8 base-level storage. This excludes driver alignment,
metadata and implementation-specific overhead. There are eight extra shared
Texture wrappers, no additional source or application bake. Existing gnome
artwork/slots are preserved.

Idle display-object allocation is **zero**. The active wizard owns **one Sprite**
in the existing transient gnome Container, plus **two temporary spell Sprites**
only while casting. Existing puddle reactions may use their ordinary cached
splash as before. No new renderer, ticker, WebGL context, particle system,
per-frame Graphics or texture generation is added. The diagnostic HUD includes
the spell Sprite count.

The atlas owner destroys all 37 construction Graphics after the single bake,
then owns shared frame/source destruction on teardown. Incident cleanup destroys
only its Sprites/Container and never shared textures. Browser resource tests run
**100 cast/clear cycles per page**: **600 wizard/spell Sprites** released across
both pages; cleared display-object counts return to **17 before / 17 after**;
application bakes remain **5 before / 5 after**; additional Graphics commands and
contexts during those cycles remain **zero**. Node tests separately exercise
120 complete incident cleanup cycles on both pages and motion settings.

The gallery and raw report are `artifacts/gnome-wizard/index.html` and
`artifacts/gnome-wizard/review.json`. The report compares idle and casting view
animation, combined model advance plus animation, logical gnome ticks and render
submission. These are local CPU samples, not GPU-completion or device-wide FPS
guarantees. Exact JavaScript heap or driver byte retention is not inferred from
the object counts. Screenshots are reviewed at actual garden scale; on narrow
mobile screens the small visitor scales with the entire garden.

A completed wizard browser run measured these median CPU costs across the
homepage and diagnostic fixtures (36 specimens, one wizard and two spell Sprites):

| Work | Idle | Casting |
| --- | --- | --- |
| Gnome advance plus view animation | 0.0002ms | 0.0009ms |
| Logical gnome tick | Below timer resolution | 0.0011–0.0012ms |
| Whole-application render submission | 0.025–0.030ms | 0.015–0.025ms |

Warm caches, timer resolution and scheduling noise dominate differences this
small; the lower casting render sample does not imply a rendering improvement.
Raw median/p95 samples remain in the report for review.

## Diagnostics and validation

Only `/pixi-live.html` loads `garden-wizard-dev.js`: seed one/four actual simulated
protected plants with ordinary companions, trigger a visit, preview a cast,
inspect the genuine selected patch timestamps, remove/replace the exact source,
occupy the selected cell through ordinary placement, test hidden/stalled
cancellation, toggle reduced motion and clear. The cast preview explicitly
advances one simulated visit through bounded 250ms fixture ticks; live hidden/
stalled behavior still cancels. Replacement requires a fully simulated wizard
fixture and creates a fresh real object/id in the original cell through the
fixture import API. Fixtures never use TCPNoise
provenance or artificial SSE frames.

`tests/gnome-wizard.cjs` covers exact scheduler branch boundaries/priority/draw
counts, candidate-free fallback, all four mature species, edges, uniform source
selection, one active incident, every retained identity field, source/occupancy
membership, one actual grass add/refresh, stale/missing/replaced/moved grass,
new occupancy and setting changes, no retries, expiry/fading, hidden/stalled/
backwards/nonfinite clocks, reentrant callbacks, underpants/plant hits, unchanged
specimen traits/artwork/counts/score, reduced motion, teardown and resource reuse.
`tests/gnome-wizard-browser.cjs --run` repeats critical paths with real Chrome,
Pixi/WebGL, native clicks and actual ecology callbacks/Sprites. It is included in
`npm run test:chrome`. Existing gnome atlas assertions are updated for eight
appended frames while keeping their source/bake/cleanup assertions.

The 22 captures cover arrival, inspection, staff raised, casting, young and
established grass, missing-source cancellation, night, reduced motion, multiple
eligible species and 390×844 mobile, on both homepage and diagnostic routes.

Commands:

```powershell
npm test
$env:NODE_PATH='C:\Users\me\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
npm run test:chrome
dotnet build PacketGarden.csproj --no-restore -o artifacts/gnome-wizard/debug
dotnet build PacketGarden.csproj --no-restore -c Release -o artifacts/gnome-wizard/release
dotnet build tests/PacketGarden.Checks --no-restore -o artifacts/gnome-wizard/checks
dotnet artifacts/gnome-wizard/checks/PacketGarden.Checks.dll
node tests/weather-sse.cjs --run artifacts/gnome-wizard/debug/PacketGarden.dll
```

Node: **71 passed**, **23 optional Chrome/SSE entry points skipped**, zero failures.
Chrome: **29 jobs passed**, including existing incident, terrain, fungi, snails,
inspection, audio and historical-baseline checks. One old homepage atlas-count
assertion was corrected from 29 to 37; the affected full homepage job passed on
rerun through the same `npm run test:chrome -- --only=pixi-default-browser.cjs`
runner. Debug/Release and backend-check builds pass
with zero warnings/errors; backend assertions and actual ASP.NET polling → SSE
integration pass. Local browser/socket checks require execution outside the
sandbox. No backend or public SSE contract changes are included.
