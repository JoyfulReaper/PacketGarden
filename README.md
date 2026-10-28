# PacketGarden

> **Composting the internet's shit into something pretty.**

PacketGarden turns the background garbage of the internet into a living browser garden. Real or simulated network events grow plants, flowers, fungi, weeds, terrain, and other strange things instead of becoming yet another wall of ordinary telemetry.

The core idea is deliberately playful: a DNS lookup might strengthen a flower patch, a Gopher request might sprout a mushroom, an SSH connection might grow a thorny vine, a port-22 probe might flash into a red bloom, and enough aggregate noise can turn the weather nasty.

## Direction

PacketGarden is primarily a passive / idle experience with light inspection, not a conventional management or combat game.

The intended design is:

- top-down;
- fixed-size garden visible as a whole on one screen;
- subtle square grid for placement and ecology;
- stylized painted/cartoon 2D sprites;
- mostly cozy/natural under ordinary traffic;
- stranger mutations and effects as unusual traffic appears;
- persistent growth with aging and decay;
- light ecological competition;
- cluster-first growth with very light randomness;
- real local-time day/night lighting;
- meaningful changes driven mostly or completely by network events.

The garden should visibly evolve over roughly a 30-minute active session when events are arriving, while larger or rarer growth can remain much longer.

## Event input

Real discrete input uses NATS, starting with TCPNoise connection events.

All sources feed one shared ecosystem rather than separate host-specific plots. Event type determines the main species/effect while source identity may influence subtle visual variation.

Conceptually:

```text
sensors / services
       |
       v
      NATS
       |
       v
PacketGarden backend
       |
       v
normalized events / environmental state
       |
       v
      SSE
       |
       v
browser garden state / renderer
```

The browser does not connect directly to external sources. SSE now delivers live
aggregate weather and backend-normalized TCPNoise growth events from the
PacketGarden backend. See [Real data](docs/REAL-DATA.md).

A fake-event generator remains useful for development and demos and should feed the same normalized event model.

## Supported garden pages

PacketGarden uses **PixiJS/WebGL**:

- `/` and `/index.html`: the production garden, with live weather and TCPNoise
  growth, inspection, collectibles, Recent activity and optional sound.
- `/pixi-live.html`: the same garden with explicitly simulated fixtures, manual
  weather/lighting previews, pause, probes and a performance HUD. Development
  controls are absent from the homepage; simulated traffic never starts there.
- `/pixi-stress.html`: an isolated synthetic rendering stress page, with no SSE
  input or effects on the live garden.

The legacy Canvas 2D renderer is retired. Old `/canvas.html` bookmarks redirect
to the homepage without loading the old implementation. There is no fallback
engine. When WebGL is unavailable or initialization fails, the garden displays:

> PacketGarden requires WebGL to display the garden. Try a browser with WebGL enabled.

The app uses locally served PixiJS **8.22.0**, with no runtime CDN or npm step.
See [the retirement audit](docs/CANVAS-RETIREMENT.md) for the file/dependency and
test migration inventory. Earlier renderer comparisons in the Pixi notes are
explicitly historical.

## Living garden

The whole garden scales to the window and retains **32 × 20 cells**, with at most
**640 specimens**. Shared renderer-neutral models own placement, competition,
lifecycles, grass, water, mutations, wildlife and interactions. Incoming growth
prefers nearby same-species plants. At saturation, only strictly stronger growth
can replace an eligible weaker resident, choosing the weakest and oldest first.
Ghostbloom, crystal fungus, blackthorn and Stillbloom are protected from forced
replacement. Vigor describes fullness, not a security score.

All state lives in browser memory. Reloading starts a new session. A single SSE
connection supplies backend-normalized growth and aggregate weather. No replay
or persistent planting history is added.

| Species | Starts growing | Mature | Starts fading | Expires |
| --- | --- | --- | --- | --- |
| Flower | 15s | 45s | 3m | 4m |
| Mushroom | 12s | 40s | 4m | 5m |
| Broadleaf | 20s | 60s | 5m | 6m |
| Vine | 20s | 60s | 8m | 10m |
| Wirefern | 18s | 50s | 5m | 6m |
| Redbloom | Immediate | Immediate | 10s | 30s |
| Weed | 20s | 60s | 5m | 6m |
| Ghostbloom | 15s | 45s | 5m | 6m |
| Crystal fungus | 12s | 40s | 6m | 7m |
| Blackthorn | 20s | 60s | 10m | 12m |
| Stillbloom | 30s | 90s | 17m | 20m |

Cosmetic palettes remain stable for each specimen, with an independent 1% rare
palette choice. Ordinary vine hues retain their 70% aqua, 15% lime, 10% chartreuse
and 5% olive distribution after the silvervine roll. Adjacent vines retain their
cached curved connecting tendrils.

Ordinary broadleaves have a separate **20%** cosmetic chance to open one to three
tiny pink, yellow, white, purple or blue blossoms at maturity. Vines have their
own **15%** chance to open soft pink, lavender, pale yellow or white flowers along
their stems/curls and occasionally one actual connecting tendril. Each outcome
is rolled once on an independent random stream, remains stable, fades with the
plant and disappears with its exact parent. These decorations create no extra
specimens, drops, events, scores or sounds. Diagnostic fixtures can force all
colors and full fields without manipulating real input.

Wireferns have an independent **25%** cosmetic chance to carry attached sori:
two to four groups of tiny copper, golden-ochre or soft cyan dots along their
angular fronds. One stable color/layout is selected at creation, independently
of foliage, including rare afterglow. Sori appear at **50 seconds**, dim with the
fern from **five minutes**, and disappear with its normal **six-minute** expiry.
The attached dots now have larger cores, stronger rims and wider separation for
visibility at normal garden scale. A separate visible-page check every **30s**
has a **75%** chance to release one airy eight-spore puff from a currently mature
decorated fern. Puffs rise, spread and fade over **3s**, with at most **two** cloud
Sprites. Reduced motion uses a brief static version. Hidden pages cancel clouds
and resume on a fresh deadline; missed checks never catch up. These effects add
no drops, specimens, network events, sounds or points. See
[native-scale comparisons and validation](docs/PIXI-LIVE.md#wirefern-spore-release-2026-10-27).

Ordinary live TCPNoise vines also get one independent **0.5%** cosmetic roll
after successful placement. A selected vine stays ordinary until **60 seconds**,
then becomes a dusty mauve opium poppy if fewer than two are active. Failed and
cap-skipped attempts never retry. The exact vine keeps its identity, cell, vigor,
provenance and normal **eight-minute fade / ten-minute expiry**. Silvervines and
simulated traffic cannot roll. Clicking inspects it; gnomes spare active poppies.
The poppy itself is inspected rather than collected. See
[transformation details](docs/PIXI-LIVE.md#rare-vine-to-opium-poppy-mutation-2026-10-27).

Each successfully activated live poppy gets one separate **20%** chance to leave
a loose **opium pod** three seconds later. The exact parent must still qualify;
the pod shares the existing five-drop cap and lasts 20 seconds independently of
its parent. Failures, cap skips and missed hidden/stalled deadlines never retry.
Collecting removes only the pod and says **You collected an opium pod. +0 points**.
The original poppy, network provenance, activity and `Score: 0` stay unchanged.
There is no inventory or progression. See
[pod screenshots, rules and validation](docs/PIXI-LIVE.md#collectible-opium-pods-2026-10-27).

### Grass and water

Grass has separate state and consumes no specimen slots. Twelve distributed
startup seeds grow into dense leafy groundcover, spread every four seconds, age
through yellow/brown stages and expire after 35 minutes without refresh. Bounded
maintenance reseeding allows recovery without invented network events. Real
TCPNoise input does not directly seed or refresh grass.

**Allow grass under plants** starts unchecked on every reload. OFF prevents
grass in occupied cells and new/replacement plants clear their destination grass.
ON permits normal spreading/reseeding and retained grass under plants; it fills
nothing instantly. Turning it OFF immediately removes only overlapping grass
through the authoritative ecology model. At most 640 distinct grass cells can
coexist with 640 plants, with unchanged aging, plant occupancy and inspection.

Pixi retains the dense leaf recipes, with slightly darker/muted open grass,
feathered occupied-grass shading and small contact shadows only where grass
overlaps a plant. Foreground palettes, both bloom types, vine connections and
age colors are preserved. See [the visual separation notes](docs/PIXI-LIVE.md#grass-and-plant-visual-separation-2026-10-23).

Heavy rain, thunderstorm and hurricane weather can form temporary puddles. The
existing 15-second check has 35%/60%/85% chances, with at most eight patches.
Successful checks usually refresh water; new patches may join nearby pools.
Water holds for 30 seconds after refresh and drains over eight minutes. Four
finite illustrated pool shapes render after grass and before plants. Puddles
do not damage plants, change occupancy or create activity rows.

### Inspection, wildlife and sound

Click a specimen to inspect its species, safe source label, listening port,
exact textual seen count, vigor, color and age. Simulated fixtures identify
themselves. Empty soil, Escape and the close button dismiss inspection; removal
of the exact selected parent closes its card. Clicking grass without a higher
priority hit opens a Wild grass card. Recent activity retains only three safe
events, including no-growth outcomes at saturation.

First-seen ladybug/snail/moth/pebble visitors, separate Amanita and weed-bud drops,
the collectible port-22 redbloom mutation, passive puddle frogs and the Gnome
Incident retain their shared models and click priority. Gnome landscaping can
occasionally free ordinary cells through authoritative removals; protected,
stale or replaced targets are checked again. Puddle mishaps, surprise poses and
independent underpants drops retain their existing behavior. Collection awards
**+0 points** and `Score: 0` stays unchanged.

The **Great Gnome Mushroom Heist** can replace 30% of successful ordinary gnome
incidents when an unprotected mature mushroom is available: the shared check is
still 2% every 45 seconds with at least 30 living specimens. A red-hatted and a
green-hatted thief approach the exact mushroom, revalidate its identity after
three seconds and **really remove it from the garden**. They carry its original
palette/size in cached artwork to the nearest edge and leave after 14 seconds.
Its cell stays free for normal growth. Pending collectibles, mutations and rare
specimens are protected; hiding or stalls cancel without replay or restoration.
Both thieves remain clickable for underpants. See the
[heist review](docs/PIXI-LIVE.md#great-gnome-mushroom-heist-2026-10-27).

Sound is **Off** initially, with volume at **12%**. An explicit Sound On gesture
enables the existing local Web Audio implementation. Growth/collection cues,
gnome sounds and optional thunder share the same output controls and cleanup.
Successful gnome arrivals use a short synthesized nasal “gnooo-mz!” motif, tuned
to remain audible at 12% without raising the shared output gain. On
`/pixi-live.html`, enable Sound, then use **Preview gnome sound** to hear the exact
production cue without spawning anything. The preview reports disabled, muted
or unavailable audio and never enables or resumes it. See
[audio diagnosis and validation](docs/GNOME-AUDIO.md).

Stillbloom is a separate protected quiet-weather flower: verified healthy Live
quiet must be observed continuously for ten minutes before a 10% roll, then
every three minutes, with at most two flowers and no catch-up. Disconnects,
stale leases, non-quiet weather, hidden time and long stalls reset qualification.
Its origin is Sustained quiet, with no fabricated TCPNoise provenance or growth
counter/activity/sound effects. See [the health contract](docs/REAL-DATA.md#upstream-health-and-stillbloom).

### Atmosphere and page ownership

Local browser time drives dawn/day/golden-hour/dusk/night colors. The session-only
**Day/night cycle** checkbox holds daylight when off and samples current local
time when enabled. The existing logical tick samples lighting at most every 30
seconds; cached artwork is preserved. Only the diagnostic page has time presets
and a simulated-hour slider. Storm lightning and opt-in thunder retain their
separate control and reduced-motion rules.

Pixi page ownership invalidates callbacks before releasing its ticker, stream,
views, atlases and listeners. Hidden pages stop rendering and reconcile once on
resume, without replaying missed animation or growth. Repeated closure, delayed
initialization, resize and queued visibility callbacks are covered by lifecycle
tests. Live pages retain their fresh reload on back/forward-cache return.

## Run locally

Requires the .NET SDK. No frontend build or package install is needed to run:

```text
dotnet run --urls http://localhost:5080
```

Open the homepage. Use `/pixi-live.html` for clearly simulated development
fixtures and weather previews. No automatic fake-traffic page remains.

The backend polls Noise Observatory every ten seconds with a five-second
timeout. Set `Weather__SnapshotUrl` to override its snapshot endpoint for local
testing. Set `Nats__Url` to enable discrete input; `Nats__Subject` defaults to
`tcpnoise.connection`. With no NATS URL, growth input is disabled and the app
still starts normally. The browser only connects to PacketGarden.

The footer's Events/min figure is the source's five-minute average; Last hour
is its actual retained hourly count. Missing data displays Waiting or
Unavailable. The source's bounded 5,000-event window can undercount busy periods.
Weather is aggregate pressure, never a classification of an individual plant.
Each SSE subscription has a 256-frame queue, a 15-second response-write budget,
and the server admits at most 128 clients. Slow clients disconnect; EventSource
reconnects without replaying missed growth. See [real data](docs/REAL-DATA.md) and
the [alpha checklist](docs/ALPHA-RELEASE.md).

## Validation and diagnostics

```text
npm test
npm run test:chrome
dotnet build PacketGarden.slnx --no-restore
dotnet build PacketGarden.slnx -c Release --no-restore
dotnet run --project tests/PacketGarden.Checks --no-restore
node tests/weather-sse.cjs --run bin/Debug/net10.0/PacketGarden.dll
```

Chrome checks use already installed Chrome and Playwright, with no downloads or
new project dependencies. Make that existing runtime available through Node's
module search path (`NODE_PATH`) when needed. `test:chrome` runs every remaining
Chrome entry point, including full page interactions, lifecycle/resource
ownership, grass, both bloom types, full fields, weather and WebGL-disabled
startup. Native gnome audio checks render the production mix, exercise all four
incident routes and preview gating, and compare against the pre-fix signal.
Logs and screenshots are ignored under `artifacts/retire-canvas/`; audio reports
and locally rendered WAV evidence are under `artifacts/gnome-arrival/`.
The Node runner explicitly reports optional browser/SSE entries as skipped,
and the commands above run those integration checks separately.

The diagnostic Pixi HUD and isolated stress page are the supported performance
tools. The Canvas `?perf=1` profiler is retired. Short CPU submission/FPS samples
do not establish GPU/compositor smoothness; other devices and long live sessions
still need review. [Pixi notes](docs/PIXI-LIVE.md) retain historical measurements,
and the [retirement audit](docs/CANVAS-RETIREMENT.md) records current validation.

## Privacy and project direction

Only normalized event summaries reach the browser: plant type, listening port,
coarse vigor, bounded sensor label and exact textual seen count. Raw remote IPs,
remote ports, credentials, banners and packet/request payloads are excluded.
A listening-port hit establishes neither protocol negotiation nor an attack.
PacketGarden is an artistic garden, not an IDS or forensic record.

See [Vision](docs/VISION.md), [MVP](docs/MVP.md), [event mappings](docs/EVENT-MAPPINGS.md),
[Ideas](docs/IDEAS.md) and [real-data notes](docs/REAL-DATA.md). The original Canvas
prototype is historical; PixiJS/WebGL is the supported renderer.
