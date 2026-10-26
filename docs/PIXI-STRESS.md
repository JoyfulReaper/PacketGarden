# Isolated Pixi rendering spike

Current routes: `/` and `/index.html` use the supported live Pixi garden;
`/pixi-live.html` provides diagnostic/live-soak controls. The legacy Canvas
renderer is retired, and `/canvas.html` only redirects to the homepage.

Run `dotnet run`, then visit `/pixi-stress.html`. The default is dense mixed +
hurricane at native refresh. This isolated page has no SSE, network telemetry,
audio, score, inspection, persistence or outbound metrics. WebGL is required;
initialization failure shows a friendly message rather than a blank garden.

The Canvas comparisons later in this document are historical spike measurements.
See [the current retirement audit](CANVAS-RETIREMENT.md).

## Dependency

`pixi.js` is pinned to **8.22.0** in the private root `package.json` and lockfile.
`wwwroot/vendor/pixi/pixi.min.js`, its MIT license, and dependency license notices are checked-in assets,
served by the existing ASP.NET static-file middleware. Running/publishing the
app needs no npm step or remote CDN. To reproduce the assets:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run vendor:pixi
```

There is no bundler. npm is only a dependency/vendor maintenance tool.
`node_modules` is ignored and excluded from .NET source/content globs.

## Scene and rendering choices

- One opaque WebGL renderer surface; soil, grass, puddles, connections, plants,
  actors, rain and the green probe are in the same scene. Logical size is 960×600.
- A contain transform and rectangular mask preserve aspect ratio and keep rain
  inside the garden. Resizing updates presentation/backing size; DPR is capped
  at 2 to bound fill rate. The clear color also supplies opaque letterboxing.
- WebGL is explicitly preferred for a consistent first comparison. The HUD
  reports the backend actually initialized. Unsupported initialization reports
  a failure; there is no silent Canvas substitution.
- `powerPreference: high-performance` is a browser hint. Antialias is disabled:
  procedural art is rasterized once at 2x resolution and sprites use that atlas.
  No per-frame geometry construction, texture regeneration, filters, or full
  scene flattening is used.
- Eight species × four vigor shapes plus four grass patches, puddle, five actor
  types, rain, and probe make **44 frames in one shared atlas**. Temporary Pixi
  Graphics generate it once. Sprites share its GPU source across scene switches.
- Dense mixed/vines/wireferns each have 640 plants, 640 grass sprites, 8 puddles,
  and 8 moving actors. With the green probe on: **1,297 sprites** plus rain.
  Sparse has 50 plants/100 grass; empty has no ecology or actors. Dense vines
  have 1,228 precomputed right/down neighbor curves, not per-frame lookups.
- Rain uses Pixi `ParticleContainer`/`Particle`, with only position dynamic.
  A cached streak texture is batched; speed, drift, alpha and density vary by
  level (0/16/48/150/260/400). No per-particle timers or per-frame line strokes.
- Mode replacement destroys old display objects without destroying shared
  atlas textures. Weather replacement removes old particles. Hidden documents
  stop the private ticker; resume excludes the deliberate hidden interval.

## Controls and measurements

Switch scene, weather, native/60 FPS target, and red CSS/green Pixi probes.
Changing scene/weather/target resets measurements; the reset button starts a
fresh observation without rebuilding the scene. The CSS probe uses a transform
animation, independent of the Pixi ticker. Both probes can be disabled together.

Timing comes from actual successive Pixi ticker timestamps, not its clamped
simulation delta. A fixed 240-sample ring supplies recent FPS/average/worst;
constant-size session counters retain average FPS, worst gap and >50/>300ms
counts after a spike leaves the rolling window. The HUD refreshes at most 2 Hz
from the same ticker. It reports actual object counts and logical/presentation/
backing resolution. These are CPU/ticker intervals, **not GPU completion or a
guarantee of smooth presentation**. Nothing is persisted or transmitted.

Observe all seven combinations: empty quiet/hurricane, sparse hurricane,
dense mixed quiet/hurricane, vines hurricane, wireferns hurricane. Use 20–30s
per case and at least 60s for dense mixed hurricane. Compare probes and scene
motion visually, retaining session worst intervals as well as recent FPS.

This is approximate procedural art and synthetic load, not a benchmark with
identical production drawing commands or lifecycles. The current Canvas
symptoms (dense stutter, overlay removal helping partly, whole-garden removal
helping fully, hardware acceleration enabled, and JS timings insufficient to
explain pauses) remain context, not proof that Pixi resolves their cause.
Production migration, live data, exact art, interactions, ecology and deeper
GPU/compositor/memory profiling are deliberately deferred.

## Local observations (2026-10-14)

Actual WebGL in the Codex in-app browser, native ticker target on an approximately
60 Hz presentation. Counts stayed stable. All seven requested modes were run;
no >50ms or 300–500ms ticker intervals were recorded in these Pixi samples.

| Scene | Observed seconds | Session average FPS | Session worst interval ms |
| --- | ---: | ---: | ---: |
| Empty + quiet | 27.4 | 59.9 | 17.1 |
| Empty + hurricane | 56.0 | 59.9 | 17.0 |
| Sparse + hurricane | 65.0 | 59.9 | 17.0 |
| Dense mixed + quiet | 43.8 | 59.9 | 17.0 |
| Dense mixed + hurricane | 74.4 | 59.8 | 49.9 |
| 640 vines + hurricane | 40.3 | 59.8 | 33.4 |
| 640 wireferns + hurricane | 78.0 | 59.9 | 17.1 |

The first four rows used the default browser presentation, about 1218×468 CSS
pixels with a 1389×534 backing surface (DPR 1.14). The final dense, vines and
wirefern samples used a 1280×900 viewport, about 1218×585 CSS/backing pixels
(DPR 1). An earlier dense hurricane run lasted 144.7s at the default viewport,
averaging 59.9 FPS with a 17.1ms worst interval. An initial pre-reset startup
sample reached 133.8ms. The table records post-reset scene operation rather
than asset/renderer initialization or mode replacement time. A separate 60 FPS
target run averaged about 59.1 FPS over 93s, worst interval 33.5ms. Probe
toggles and a 390×844 responsive viewport were also checked.

A temporary fixture using unchanged production Canvas scripts, 640 mature
specimens, 640 grass and 8 puddles recorded a 517.8ms session RAF gap during
60.9s. Its normal puddle aging/ecology continued and it had no moving actors;
art, placement and rendering pipelines differ. This is a qualitative
comparison, **not equivalent draw-command, FPS or GPU benchmarking**. The
fixture was removed after verification.

Browser snapshots confirmed rain/actor/probe positions changing and correct
object counts. They cannot establish uninterrupted subjective smoothness of
either the CSS compositor probe or final GPU presentation. Timing is materially
more stable than the Canvas observations, but a continuous human visual pass
on the user's actual browser/display remains needed. Recommend further isolated
testing and a staged migration prototype, not replacing production from this
spike alone. Heap/GPU memory growth was not profiled; bounded retained objects
and shared textures are structural evidence rather than a memory measurement.

Full HUD readings and screenshots are saved locally in ignored `artifacts/`
(`pixi-stress-observations.json`, `pixi-stress-preview.png`,
`pixi-canvas-comparison.png`). They are not runtime telemetry or persistence.
