# Canvas renderer retirement audit (2026-10-23)

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
remain intact. Diagnostic-only `garden-stillbloom-dev` and
`garden-gnome-puddles-dev` also remain. All Pixi renderer/artwork/transport files
are retained, including the two blossom helpers, original vine connections and
the grass separation presentation. No backend, SSE contract or dependency changes.

## Test migration and validation

The final test disposition and validation results are recorded below after the
migration. Frozen placement/ecology/ambient state fixtures remain independent
regression oracles; historical Canvas drawing-command fixtures are retired.
