# Canvas renderer retirement audit (2026-10-24)

PixiJS/WebGL is the supported garden renderer. This audit was made on `dev`
before deletion, with a clean working tree. The preceding grass/plant contrast
work is present in the baseline and is preserved. No sound redesign is included.

## Runtime dependency audit

`index.html`, `pixi-live.html`, `pixi-stress.html` and `about.html` were checked
against every first-party script/style, imports/exports, tests and server routes.
`Program.cs` serves static files and the existing SSE endpoint; it has no Canvas
route or renderer coupling. The retained `canvas.html` is only a script-free
bookmark redirect to `/`, with a manual link. No server routing is added.

The following files were exclusive to the old page and its test harness:

| Removed file | Audited responsibility |
| --- | --- |
| `wwwroot/garden.js` | Canvas scene, fake traffic, drawing/scheduling, old page adapter |
| `wwwroot/garden-activity.js` | Canvas page's activity DOM binding |
| `wwwroot/garden-actors.js` | Canvas gnome drawing adapter |
| `wwwroot/garden-broadleaf.js` | Canvas foliage art/palette wrapper |
| `wwwroot/garden-collectibles.js` | Canvas mutation drawing/collection binding |
| `wwwroot/garden-curiosities.js` | Canvas visitor drawing/binding |
| `wwwroot/garden-drops.js` | Canvas loose-drop drawing/binding |
| `wwwroot/garden-frogs-canvas.js` | Canvas frog drawing adapter |
| `wwwroot/garden-inspect.js` | Canvas page inspection DOM/input binding |
| `wwwroot/garden-lighting-canvas.js` | Canvas surface-lighting binding |
| `wwwroot/garden-perf.js` | Canvas-only profiler |
| `wwwroot/garden-puddles.js` | Canvas cached water tiles/drawing adapter |
| `wwwroot/garden-species-colors.js` | Canvas-only palette/art wrappers |

The generic `garden.css` and `garden-ui.css` remain in use by Pixi/About. Only
the old profiler, overlay/stage and fake-weather-control selectors are removed.
The CSS `canvas` selector still styles Pixi's WebGL output element.

These shared dependencies are retained: `garden-core`, `garden-stillbloom`,
`garden-ecology`, `garden-grass`, `garden-puddle-art`, `garden-mutations`,
`garden-ambient`, `garden-gnomes`, `garden-gnome-puddles`, `garden-frogs`,
`garden-interaction`, `garden-ui-core`, `garden-lighting`, `garden-lighting-view`
and `garden-audio`. Their models, art recipes, rules and sound implementation
remain intact. Only the unused Canvas Path2D factory and water paint helper were
removed from the retained grass/water art modules. Diagnostic-only `garden-stillbloom-dev` and
`garden-gnome-puddles-dev` also remain. All Pixi renderer/artwork/transport files
are retained, including the two blossom helpers, original vine connections and
the grass separation presentation. No backend, SSE contract or dependency changes.

## Test migration and validation

Frozen placement/ecology/ambient state fixtures remain independent regression
oracles. Only unused drawing commands were stripped from the retained ambient
fixture. The three exclusively Canvas command fixtures were removed:
`production-ecology-art.json`, `interaction-canvas-cf2a3de.json` and
`mutation-canvas-934089d.json`.

Eight presentation/parity suites were retired after mapping their meaningful
behavior coverage to the supported architecture:

| Retired suite | Retained coverage |
| --- | --- |
| `base-visual-scheduling.cjs` | Pixi ecology deadlines, static grass, lifecycle/hidden resume |
| `broadleaf-variants.cjs` | Pixi plant art, species palettes, broadleaf blooms |
| `ecology-canvas-parity.cjs` | Shared ecology/grass math and Pixi grass/puddle artwork |
| `interaction-canvas-parity.cjs` | Shared hit priority and actual Pixi interaction/UI |
| `mutation-canvas-parity.cjs` | Shared mutation rules and exact Pixi parent ownership |
| `performance-diagnostics.cjs` | Retired Canvas profiler; Pixi HUD/stress remain |
| `render-performance.cjs` | Pixi stress, ecology scheduling, resource/texture cleanup |
| `vine-rendering.cjs` | Pixi vine art, unchanged curves, neighbors and bloom connections |

`browser-garden.cjs`, the obsolete Canvas VM harness, was removed. Eleven
browser-behavior suites now exercise actual Pixi pages or shared models:
`garden-events`, `garden-activity`, `garden-inspect`, `garden-collectibles`,
`garden-curiosities`, `garden-drops`, `garden-puddles`, `garden-audio`,
`gnome-events`, `wirefern` and `species-color-variants` (all `.cjs`). The detailed
audio synthesis checks retain their existing assertions through the unchanged
audio module, shared specimen model and production SSE parser; Pixi audio
integration and the gnome-arrival audio suite also remain.

Mixed model/adapter suites keep their shared and Pixi assertions while removing
only the legacy adapter comparison: specimen core, ecology, grass, ambient,
mutations, frogs/clicks, weed buds, gnome landscaping/overcrowding/harvesting/
puddle reactions, grass occupancy/recovery/under-plants, Stillbloom and lighting.
Pixi isolation/default/stress/artwork tests now use shared models and frozen
oracles instead of importing the removed renderer. `pixi-page.cjs` wraps actual
page input and exposes the authoritative garden for validated local fixtures.

Chrome suites retain all Pixi scenarios. Canvas counterparts, Canvas-only CPU
probes and old command-pixel comparisons were removed. The old multi-checkpoint
vine-art capture script now checks current full broadleaf/vine/mixed/hurricane
fields, blossoms, real connections, shadows, recurring work and ownership.
Explicit fixture provenance prevents diagnostic HUD errors without changing
production models or inventing TCPNoise events. New retirement checks cover the
closed script/style/navigation graph, missing assets, bookmark redirects and
unsupported/missing-library startup.

`npm test` runs every remaining Node suite and reports optional Chrome/SSE entry
points separately. `npm run test:chrome` runs all eight Chrome entry points in
nine jobs (including the grass comparison baseline). No dependencies are added.

## Compatibility and preservation

The application requests `preference: ['webgl']` on both live and stress startup.
Unlike a single string preference, this prevents Pixi's built-in renderer
auto-detection from silently trying WebGPU/Canvas when WebGL is disabled. No
alternate engine or renderer is introduced. Failed initialization performs
normal partial-startup cleanup, then displays an accessible alert in the garden:

> PacketGarden requires WebGL to display the garden. Try a browser with WebGL enabled.

This is verified with Chrome's native WebGL/WebGL2 disable flags on the homepage,
diagnostic and stress pages, plus a missing-Pixi-library test. A separate
compatibility test follows an actual `/canvas.html` meta redirect and checks the
loaded script graph. About and homepage navigation contain no Canvas garden link.

The preservation audit compares 23 shared/Pixi modules against the pre-retirement
grass-separation checkpoint `07cba13`. They remain byte-equivalent after newline
normalization, including `pixi-live-ecology.js`, both bloom helpers, sound,
ecology/specimen rules and the transport adapter. Backend sources are unchanged.
Grass/puddle recipe arrays also compare exactly after removing only their unused
Canvas drawing helper exports. No gnome arrival sound fix or redesign was made.
Production renderer edits are limited to compatibility/error handling and asset
cache versions; existing artwork, grass shadows and lifecycle ownership remain.

## Validation and limits

- **57 Node suites pass**; nine optional browser/SSE entry points are reported as
  skipped in this runner and are exercised separately below.
- **All nine installed-Chrome jobs pass**, including the full production /
  diagnostic suite, stress, audio opt-in, all existing gnome/frog/collectible/
  lighting/weather cases, lifecycle/bfcache/partial startup, both bloom types,
  grass-under-plants, dense grass separation, full fields and native WebGL-off.
- Debug and Release .NET builds pass with zero warnings/errors. Backend checks
  pass; their project retains the existing NU1900 warning when NuGet vulnerability
  metadata is unreachable.
- Actual ASP.NET polling-to-SSE integration passes: startup, hourly-only changes,
  outage retention, reconnect, unchanged-value recovery and lease renewal.
- Atlas/bake bounds, zero recurring geometry/textures, repeated clear/reset,
  exact-parent cleanup, source destruction and late pagehide/visibility callbacks
  are checked. No renderer-specific resource growth was observed in these tests.

Ignored local evidence: `artifacts/retire-canvas/node/results.json`,
`chrome/results.json`, `preservation.json`, per-suite logs and compatibility/
artwork screenshots. Other browsers/devices, deployed ingress behavior and a
long live-traffic/GPU soak remain unverified. WebGL support is now required;
there is deliberately no manual fallback. The assistant did not deploy, commit
or push these changes.
