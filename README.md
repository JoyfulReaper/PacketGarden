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

## Garden pages

`/` and `/index.html` now open the PixiJS/WebGL garden by default. It uses the
same renderer, shared models and SSE handling as `/pixi-live.html`, with the
existing site branding, About navigation, live connection/weather status,
specimen inspection, collection, and Recent activity toggle. Weather is live;
manual previews remain on the development pages. No simulated specimen traffic
starts automatically. WebGL is required; the Canvas garden is linked as an
explicit fallback rather than switched to automatically.

`/canvas.html` preserves the original Canvas garden, including manual and
automatic fake traffic, manual weather/intensity controls, optional audio,
gnomes, and `?perf=1` diagnostics. Both Pixi pages now share the optional growth
and collection audio, plus the same Gnome Incident rules. Subsequent Pixi-only
art passes made plants larger and more distinctive and grass more tuft-like,
without changing the 32×20 model, ecology, or specimen lifetimes.
Both renderers now draw fuller, irregular wild grass with broad overlapping
blades, low groundcover, taller tufts and restrained green shade variation.
Pixi still uses 12 cached variants and one Sprite per grass cell; Canvas uses
the same finite shape recipes. Soil gaps, young growth, yellow/brown aging,
puddle layering and local-time lighting remain visible. Clicking a
grass-covered tile without a specimen or collectible hit opens a compact
**Wild grass** card with its current state. This is background ecology, not a
collectible specimen. Specimens retain priority; bare soil closes the card.

An isolated GPU rendering feasibility page is available at `/pixi-stress.html`.
It defaults to 640 synthetic plants, dense grass, puddles, actors and hurricane
rain using locally served PixiJS 8.22.0. Its synthetic scene does not load into
the default garden; the shared atlas/timing helpers are imported in library mode.
See [the spike notes](docs/PIXI-STRESS.md) for controls,
dependency reproduction and measurement limits.

`/pixi-live.html` remains the development/live-soak page, with simulated dense
seeding, forced mutations/overlap fixtures, manual weather, pause, motion probes,
and performance measurements. These controls and the timing HUD are absent from
the homepage. Both Pixi pages use real garden/weather SSE and shared placement,
competition, lifecycle, ecology, ambient, mutation and interaction rules.
The production status area includes Noise Observatory events/minute (five-minute
average) and its actual last-hour event count, distinct from specimen growth.
Both Pixi pages include rare, optional storm illumination and opt-in thunder.
The Canvas-to-Pixi gameplay port is substantially complete: both renderers use the
same collectible weed mutation of live port-22 redblooms, separate Amanita muscaria
mushroom drops, the four first-seen visitors, click/collection priority, gnomes,
grass ecology, Stillbloom and opt-in audio. The ordinary weed species does **not**
yet shed separate collectible buds; that is a future addition, distinct from the
port-22 mutation. Deliberate interface/presentation differences remain: Canvas
retains manual fake-traffic and numerical weather-intensity controls and its
`?perf=1` profiler, while Pixi uses its own development fixtures/HUD and adds
optional storm lightning/thunder. The older `docs/PIXI-LIVE.md` sections describing
missing Pixi systems are preserved historical checkpoints, not a current backlog.
The desktop/screensaver edition remains an idea; see [Ideas](docs/IDEAS.md).

Both garden renderers now follow the viewer's **local browser time**. Soft cool
dawn warms into the original daytime garden, then passes through gentle amber
golden hour, purple dusk and a readable blue night. Fixed local-time anchors
interpolate smoothly; there is no geolocation or sunrise service. Existing pale
ghostbloom halos and crystal highlights stand out against the cooler terrain.
Time of day changes presentation only, with no ecology, rarity or network effects.

The checked **Day/night cycle** checkbox beside Lightning turns this lighting
on or off. Off holds daylight; turning it back on samples the current local time
immediately. Canvas has the same checkbox near Sound. The choice lasts for the
current page session; Lightning remains independent.

Lighting samples on the existing logical tick at most every 30 seconds, writes
only meaningfully different color values, and resumes directly at current time
after hiding. Cached plant/terrain artwork is preserved; day adds no color pass.
Night rain remains visible and existing lightning/audio/reduced-motion controls
keep their behavior. Only `/pixi-live.html` has **Lighting** presets, **Live local
time**, and a **Simulated local hour** slider from 0–24. The homepage and Canvas
fallback always use real local time. See [lighting notes](docs/PIXI-LIVE.md#local-time-lighting-2026-10-20)
for screenshot comparisons, performance measurements and compositor limitations.

Earlier investigations sometimes recorded excellent timing while visible
stutter persisted, so migration was paused. The user subsequently reported a
smooth 655-second Chrome live soak on October 20, 2026, recorded at checkpoint
`61090b7529b275e849b7fbad4e5fd3dcbead9d59`. That observation supports this focused
promotion, but why the earlier lag disappeared remains unknown. Average FPS and
ticker intervals do not prove smooth GPU/compositor presentation. Historical
findings remain in [Pixi live soak](docs/PIXI-LIVE.md).

If PacketGarden's presentation layer is revisited later, a small desktop/native
renderer may be worth considering instead of another browser renderer rewrite.
Godot is one possible candidate: the backend/SSE feed and renderer-neutral garden
rules could potentially be reused while moving animation and presentation out of
the browser compositor. This is only a future option, not a planned rewrite.

The first useful milestone is intentionally small:

> Open PacketGarden in a browser and watch network-shaped events grow and reshape a weird little garden.

Initial prototype goals:

- Canvas-based top-down garden renderer;
- subtle logical grid;
- fake event source using the same event model intended for real NATS input;
- several event types mapped to distinct growth/effects;
- clustered placement with light randomness;
- simple growth, aging, decay, and light competition;
- click or hover a specimen to inspect what created it;
- gradual local-time lighting changes;
- no gardening controls or game economy.

## Chosen stack

PacketGarden uses:

- ASP.NET Core / .NET for the application host and backend;
- a lightweight browser frontend;
- HTML/CSS plus PixiJS/WebGL for the default garden, with the original Canvas fallback;
- vanilla JavaScript.

An HttpClient weather adapter polls Noise Observatory and streams normalized
weather through SSE. A NATS adapter validates TCPNoise port hits, maps each
listening port to an aesthetic specimen type, and emits sanitized growth on the
same SSE stream.

The visual simulation is the interesting part. Avoid building infrastructure before the garden itself is fun to watch.

## Privacy

PacketGarden consumes normalized event summaries rather than raw packet payloads or sensitive telemetry.

Live click inspection deliberately receives a bounded sensor label and exact TCPNoise `seenCount` in addition to specimen type, listening port, and coarse vigor. Raw remote IP addresses, remote source ports, credentials, banners, and packet/request payloads are not sent to the browser.

## Planning docs

- [Vision](docs/VISION.md)
- [MVP](docs/MVP.md)
- [Initial event mappings](docs/EVENT-MAPPINGS.md)
- [Real data](docs/REAL-DATA.md)
- [Ideas and future directions](docs/IDEAS.md)

## Status

The default Pixi garden shares the existing logical rules and interactions with
Canvas, including optional growth/collection audio and The Gnome Incident. The
detailed Canvas artwork and fake controls described below remain available at
`/canvas.html`; Pixi uses cached approximate artwork for its plants and gnomes.

All five initial MVP mappings are implemented: DNS flowers, Gopher mushrooms,
HTTP broad-leaf plants, SSH thorny vines, and brief port-22-probe red
blooms. The Canvas shows the whole fixed garden and subtle grid. Cluster-first
placement, species lifecycles, and shared cell occupancy work; neighboring vines
visually connect into creeping patches.

Manual controls and automatic weighted fake traffic feed the same event handler.
Lifecycles now retain several minutes of visual history, with vines lasting up to
10 minutes and red blooms remaining brief. State is held only in browser memory.

Specimens also have persistent cosmetic color variation. Live common palettes track
coarse vigor except for vine hue; fake growth varies across the same common schemes. Each species
has a small 1% browser-only rare-color chance; broadleaf can become rainbow, while
other species have their own rare cosmetic schemes. These colors are decoration,
not extra TCPNoise rarity or security meaning.

Vine hue is a cosmetic exception for both live and fake growth: after the unchanged
1% silvervine roll, ordinary hues are 70% aqua, 15% lime, 10% chartreuse, and 5%
olive. Aqua is the dominant/default ordinary coloring; olive is uncommon. Vigor
still changes vine fullness, thickness, detail, and full-grid competition, with
no traffic/security meaning attached to hue. The selected color never rerolls.

Very occasionally, sufficiently overgrown gardens may experience a brief and
completely unhelpful gnome territorial dispute. With at least 30 living specimens,
a browser-only check every 45 seconds has a 2% chance to summon two red-hat and two
green-hat gnomes. They approach, shove, randomly pick a winner, and disappear after
12 seconds. These transient actors occupy no plant cells and change no specimens,
grass, or weather. Sound-enabled gardens get two tiny cues through the existing
volume control. It is garden nonsense, with no network or security meaning.

Canvas and Pixi share one renderer-neutral incident model. The existing Pixi
ticker animates at most four cached gnome Sprites above specimens and below rain;
idle incidents allocate no display objects and run no animation. Hidden pages
skip eligibility and reset the 45-second cadence on resume, without catch-up.
Completed suspended incidents are removed without stale audio. Clear/teardown
release the actors. On `/pixi-live.html`, **Trigger Gnome Incident (simulated)**
requires 30 living specimens and alternates green/red winners through the normal
12-second lifecycle, without network input or new growth. It is absent from `/`.

The **Gnome Landscaping Department** occasionally offers unsolicited vine control.
On the same 45-second check, at least 20 eligible ordinary living vines comprising
40% of living specimens allow a 10% roll, with seven minutes between arrivals.
A worker with hedge clippers visits a fixed route while a mostly useless
supervisor watches. Roughly 25% of eligible vines, capped at eight, are removed
one snip at a time through the authoritative garden model. Each target's exact
identity, occupancy, creation time and current lifetime/eligibility are checked
again; missing targets are skipped. Silvervines, mutations and unrelated or
protected plants are never trimmed. Freed cells become available to normal growth.

At **640 occupied specimen cells**, the same department may instead attempt
**emergency overcrowding relief**: one 25% roll per 45-second check, with no vine
roll on that check. A failed roll does nothing and does not reset the shared
seven-minute cooldown. The gnomes are unreliable volunteers with questionable
professional qualifications; assistance is not guaranteed. They cut random
ordinary living plants of any species, excluding rare species/palettes,
mutations and collectibles. They aim for 32 free cells but never make more than
32 successful removals. Incoming traffic may refill those cells immediately.
At most 64 original targets are sampled once; stale identities are skipped,
new arrivals are never chased, and work ends after 45 seconds or sample exhaustion.

Both renderers share these rules. Vine visits last about 7–11 seconds;
overcrowding work is bounded at 45 seconds and timer delays can mean fewer cuts.
Neither overlaps the four-gnome dispute, and both leave no incident actors or
display objects behind. Reduced motion uses discrete positions and still poses.
Hidden tabs or logical stalls over 1.5 seconds cancel the crew without replay;
the cooldown remains. Landscaping is silent ambient nonsense, unrelated to
network security, and adds no network events, Recent activity, scores or growth
statistics. The development-only **Trigger landscaping (simulated)** button on
`/pixi-live.html` seeds ordinary local vines if needed and skips the chance/wait
for a check, retaining eligibility and cooldown. **Trigger overcrowding relief
(simulated)** independently seeds a full mixed ordinary garden if needed and
starts that mode. Both diagnostic buttons share cooldown and mutual exclusion.
Clear does not reset cooldown.
Long live-traffic visual tuning remains; see [Pixi notes](docs/PIXI-LIVE.md).

The department also makes rare **weed-harvesting expeditions**. At least three
mature ordinary weeds allow a 5% roll on the same 45-second check, after the
fight, overcrowding and vine checks. A failed full-garden roll never falls
through. A worker and suspicious sack carrier collect 1–3 original weeds along
a short route, sharing the seven-minute cooldown and normal safe removal,
hidden-tab cancellation and reduced-motion rules. Rare palettes, mutations,
protected plants and weeds with pending buds are excluded and checked again
before each cut. They leave together with the sack; active buds remain independent.

**Click an active gnome** in any incident and it briefly looks surprised,
drops a tiny pair of white underpants beside itself, then continues. Each gnome
gets one attempt per appearance, even if the shared five-drop cap is full.
Underpants survive the gnome's departure for their own 20-second lifetime.
Clicks now prioritize gnomes, curiosities, loose drops, mutations, then inspection.
Collection says `You stole a gnome's underpants. +0 points` 80% of the time, or
`Collected underpants +1, annoyed gnome -1` 20% of the time. These are only jokes:
Score stays 0, with no points, annoyance totals, inventory or network events.
The existing optional collection sound is reused. `/pixi-live.html` has
**Trigger weed harvest (simulated)**, a five-slot mixed-drop fixture and a
message-roll selector; public pages have no additional diagnostic controls.

Very occasionally, a live port-22 redbloom may itself become a collectible weed
plant. Click it quickly enough and you collect some weed. This accomplishes
absolutely nothing. A 5% browser-only roll schedules the change after three
seconds, so the normal redbloom is visible first. The exact specimen keeps its
canonical `redbloom` type, cell, vigor, color, and provenance. At most three
mutations are active; a candidate skipped at the cap is never retried. Collection
or expiry after a 20-second interaction window removes that specimen entirely.
No secondary weed sprig is created, and grass and gnomes are unaffected.
Clicking the plant wins over inspection and briefly says
`You collected some weed. +0 points`, with the existing optional quiet pluck.
The permanent `Score: 0` is static text with no scoring or persistence state.
Port 22 still always maps to redbloom and bypasses backend rarity; its meaning is
only a connection to listening port 22. Ignoring the mutation has no consequence.

Successful live growth with exact sanitized `seenCount === "1"` now tries to
create one tiny browser-only curiosity beside that exact new/replacement specimen.
The uniform initial pool is ladybug, snail, moth, and shiny pebble. At most three
are active for 20 seconds; a full cap skips the event without queue or catch-up.
They use separate state and the shared dynamic overlay, consume no specimen cells,
and affect no grass, provenance, or ecology. Their travel stays within six logical
pixels; pebbles remain still and occasionally glint. Clicking a curiosity takes
priority over mutation collection and inspection, briefly shows its type-specific
`+0 points` message, and uses the optional quiet collection sound. Score stays 0,
and curiosity spawn/collection/expiry adds no Recent activity row. Gnomes and
redbloom mutations remain independent. Count one means only source-provided
first-seen; it does not establish global uniqueness or first-ever history.

Successful live TCPNoise mushroom growth also gets an independent 1% browser-only
roll for a tiny Amanita muscaria loose drop, appearing beside that exact mushroom
after five seconds. Removing/expiring/displacing the source before then cancels
the attempt. The mushroom's type, color, vigor, provenance, cell, and lifetime
remain unchanged. Up to five drops have their own 20-second active lifetime;
due candidates at the cap are consumed without retry. Drops occupy no specimen
cells, affect no grass or puddles, and share the dynamic overlay without repainting
ecology. Click priority is active gnome, curiosity, loose drop, mutation, then inspection.
Collection says `You found Amanita muscaria. +0 points`, reuses optional quiet
audio, and leaves Score at 0. Scheduling, activation, collection, and expiry add
no Recent activity rows. This is cosmetic garden nonsense, with no protocol or
security meaning; fake Gopher growth and dropped saturated events do not roll.
**Ditch Weed Buds** now use that same loose-drop system. Every successfully
placed live TCPNoise ordinary `weed` gets exactly one **3%** roll, regardless of
listening port. A successful attempt waits for that exact weed's maturity
(60 seconds); removal, replacement or expiry before then cancels it. The small
olive-green bud lives independently for 20 seconds and leaves its parent intact.
Buds and Amanita share **five active slots total**, with no eviction or retries
at the cap. Missed bud activations while hidden or more than 1.5 seconds late
are discarded. Buds remain still, including with reduced motion enabled.

Collecting one briefly says `You smoked some ditch weed. +0 points` and reuses
the optional collection sound. Score, occupancy, grass, growth statistics and
Recent activity stay unchanged. The port-22 collectible mutation retains its
separate rules and message. Only `/pixi-live.html` has **Seed weed buds
(simulated)**, a three-drop mixed/overlap fixture with simulated plants and
normal drop expiry. Canvas and Pixi share its rules and compact leaf artwork;
Pixi adds one cached frame, with at most five loose-drop Sprites.

Vine/opium, opium pods, rainbow leaves, crystal shards, ghost petals, gnome hats,
and frogs/water interactions remain future work.

**Stillbloom** is an uncommon ivory flower with silver-green growth and pale
lavender details, created by sustained **verified live quiet weather**. After
ten continuously observed minutes of authoritative `level === "quiet"`, one
10% roll occurs every three minutes, starting at the ten-minute boundary. At
most two live for twenty minutes. They use free specimen cells, never replace
plants, and are protected from competition and landscaping. Quiet never means
zero events/minute, manual weather or broken telemetry. Backend upstream-health
leases distinguish fresh polling from retained last-known weather; disconnects,
staleness, non-quiet weather, hidden tabs and long logical stalls restart the
qualification. Existing flowers continue aging when rain returns.

Stillbloom grows for 90 seconds, matures, fades from minute 17 and expires at 20.
Inspection says **Sustained quiet**, with no fabricated sensor, port or recurrence.
It creates no TCPNoise acceptance count, Recent activity, sound or grass influence.
The existing day/night cycle changes its appearance, never its eligibility.
Only `/pixi-live.html` has a clearly simulated trigger and virtual quiet/health/
probability controls; these do not certify organic weather. See [freshness
contract](docs/REAL-DATA.md#upstream-health-and-stillbloom) and [visual/testing notes](docs/PIXI-LIVE.md#stillbloom-2026-10-21).

Successful growth or stronger replacement clears wild grass from exactly the
selected specimen cell, in both Canvas and Pixi, before presenting the new plant.
Neighbors remain untouched, and invalid, paused or saturated/dropped events do
not clear grass. An open Pixi Wild grass card closes immediately on removal.

Successful fake DNS and HTTP spawns retain their 45% and 65% grass-influence
chances and 35% chance of a second distinct nearby attempt. Occupied targets
(including the new plant's own cell) are skipped without retrying or rerouting
the roll, so only available neighboring soil can be seeded/refreshed. Real
TCPNoise growth does not directly seed or refresh grass. Grass does not occupy
specimen slots or affect specimen counts. Natural spread also skips specimen
cells. Removing/expiring a specimen creates no grass automatically; neighboring
turf may reclaim the newly available soil on a later ordinary spread attempt.
Both gardens start with **12 patches**, randomized within distributed regions
through one shared helper, skipping occupied specimen cells. If no living grass
survives, a separate bounded check on the existing logical tick runs at most
once per **60 seconds**: with at least **eight free specimen cells**, a **25%**
roll may create **one** patch on random available soil. Failed checks wait for
the next minute. Hidden/resumed pages start a fresh cadence, with no catch-up
seeds; missed whole check windows are discarded. This can recover turf after
overcrowding and later gnome removals or expiry, but never guarantees help.
It creates no network events, Recent activity, provenance or accepted-growth counts.

Once seeded, sparse grass expands into ragged turf on available soil
over 30 seconds without further traffic. Healthy mature grass now receives 1–4
bounded spread attempts every 4 seconds as active mature coverage grows; each
attempt has a 50% chance to seed an immediate empty neighbor. When neglected turf
first enters fading, it gets one 40% final seed opportunity per influence cycle,
processed in small batches to avoid synchronized bursts. Natural spreading never
refreshes the parent, so old turf still ages out. Neglected turf begins fading
after 20 minutes, becomes brown/dead-looking by 32 minutes, and disappears after
35. Re-influence restores health, refreshes that timer, and allows a later fading
cycle to earn another final seed opportunity.

Weather supports Manual previews and Live aggregate weather from Noise
Observatory through the backend and SSE. Both use the same renderer for quiet,
drizzle, rain, heavy rain, botnet thunderstorm, and botnet hurricane. Weather does
not damage existing organisms or change grass; verified quiet permits the
separate Stillbloom growth described above. A base ecology Canvas repaints on actual state
changes or the earliest known visual deadline; mature/static ecology has no
recurring one-second repaint. Logical cleanup still runs every 250 ms. A separate transparent overlay Canvas handles weather,
gnomes, mutations, curiosities, and loose drops through one roughly 30 FPS scheduler, without
copying the base bitmap. Dense vines share one local cell lookup per base repaint.
Hidden tabs pause painting and resume once at current time, without catch-up.
Both canvases resize together, with backing resolution capped at DPR 2; the
overlay lets pointer events reach the existing base-canvas click handling.

Severe weather now leaves temporary standing water: only heavy rain, botnet
thunderstorm, and botnet hurricane form/refresh puddles. The existing tick checks
once every 15 seconds, with respective 35%, 60%, and 85% action chances. At most
eight patches occupy separate browser-memory terrain state and no specimen slots.
Successful checks usually refresh/grow a patch (60%); otherwise they add one,
often near existing water so patches can overlap into pools. At the cap, successful
checks only refresh. Growth is gradual and bounded. After the last refresh, water
holds briefly for 30 seconds and then shrinks/fades over eight minutes. Below
heavy rain there is no formation or refresh. Hidden tabs never form water; resume
discards expired patches and schedules a fresh check without catch-up. Muted
procedural water renders in the cached scene after grass and before specimens,
without damaging plants, changing grass, adding Recent activity, or collecting
anything. Reload clears it. Frogs and water-specific creature interactions remain future.

TCPNoise port hits now create plants through NATS and SSE. The backend maps
listening ports to visual families without asserting protocol/authentication
semantics. A port-22 redbloom means TCPNoise observed a connection to listening port 22;
it does not prove SSH negotiation, attempted credentials, failed authentication,
or malicious intent. This aesthetic special case bypasses ordinary rarity so the
signal remains recognizable. Port 2222 has a redbloom base and retains normal rarity;
unknown ports have a flower base. Each accepted non-22 connection rolls for an
artistic weed or rare specimen.
The exact ports 420 and 42069 have an ordinary weed base: 99.5% weed / 0.5% rare
on ordinary IPv4 traffic, with existing trait bonuses. These are two ports, not a
range, and their weed is separate from the port-22 collectible mutation.
IPv6 and sensor suffixes `-dn42` / `-ygg` are coarse visual modifiers, not security
classifications. Rarity stays event-driven; no timer creates mutations. See the
[probability policy](docs/EVENT-MAPPINGS.md#tcpnoise-rarity).
TCPNoise `seenCount` becomes coarse visual vigor server-side: 0 for missing/unusable
values or counts 0–1, 1 for 2–3, 2 for 4–9, and 3 for valid counts of 10 or more.
Vigor is coarse artistic recurrence, not a threat score. It adds bounded
species-specific fullness/detail and, only when all 640 specimen cells are full,
lets stronger recurring growth displace weaker ordinary growth. Species, rarity,
lifetimes, and growth speed remain independent of vigor. Fake controls use vigor 0.

Clicking a living specimen opens a small information card. Live TCPNoise growth
shows the normalized species, sensor label, listening port, exact `seenCount`,
coarse vigor, color scheme, and age. Valid counts are transported as decimal text
so JavaScript cannot round a large UInt64 value. Fake-development growth is marked
as simulated and does not invent sensor or port provenance. Clicking empty soil,
pressing Escape, or using the close button dismisses the card; it also closes if
the inspected specimen expires or is displaced.

The small **Recent activity** view keeps only the newest three normalized garden
events in browser memory. Live rows show an optional sensor, listening port,
species, optional exact seen count, and relative age. Fake rows are explicitly
simulated, without invented network provenance. Valid events that cannot grow at
saturation still appear with `no growth`; replacements need no special label.
One live handler validates each frame and attaches provenance directly to the
exact created specimen before rendering, rather than searching for a recent match.
The view has no history or persistence, clears on reload, and is ambient context,
not a replacement for monitoring. It retains no raw SSE frames or endpoint/payload
details. Ages share the existing garden update loop.

TCPNoise mushrooms now have the narrower base-port set **21 and 70**. Port 445
has a broadleaf base; 5432, 6379, and 9200 have flower bases. These mappings are
aesthetic, without asserting application protocols; rarity odds are unchanged.

Listening ports **23 and 2323** now use an ordinary **wirefern** base; **3389 and
5900** remain vines, and fake SSH still creates a vine. Wirefern is a compact
upright terminal-like fern with a segmented stem, angular fronds, and tiny tips.
It says only that a connection was observed on the listening port, not that Telnet
negotiation, authentication, credentials, payloads, or malicious activity occurred.
Existing weed/true-rare overrides still apply normally. Vigor adds bounded fronds,
side branches, tips, and stem thickness as artistic recurrence/fullness, not threat.
Common palettes are phosphor green, moss, cyan, and amber; the separate 1% afterglow
cosmetic adds pale mint/cyan glow. The chosen color persists. Wireferns occupy one
ordinary cell, cluster and compete normally, never connect to vine neighbors, and
age on the base canvas without a RAF animation or direct grass influence.

Natural expiry remains the normal way space opens in the bounded 32×20 garden.
When full, incoming vigor must be strictly greater than an eligible occupant's:
choose the lowest eligible vigor, then its oldest specimen, and reuse that exact
cell. Ghostbloom, crystal fungus, and blackthorn are protected from forced
replacement but still expire normally. Weed and redbloom remain replaceable.
Equal vigor cannot churn the garden, and incoming rare growth gets the same gate.
Successful replacements use the normal growth sound/cooldowns; dropped events
are silent. Real TCPNoise replacement clears destination grass but does not seed
or refresh grass. The existing
status adds a full-garden note at capacity and removes it after space opens.
The browser-facing TCPNoise growth contract is `specimenType`, `listenPort`, and
integer `vigor` (0–3), plus optional bounded `sensor` and exact decimal-string
`seenCount` for inspection. Remote endpoint/IP and payload details remain excluded.
Other discrete adapters, local-time lighting, persistence, and richer ecological
competition remain planned work; see [MVP](docs/MVP.md) and [Ideas](docs/IDEAS.md).

## Run the prototype

Install the .NET 10 SDK, then run from the repository root:

```sh
dotnet run --project PacketGarden.csproj --urls http://localhost:5080
```

Open http://localhost:5080 for the live Pixi garden. Use `/pixi-live.html` for
development controls and live-soak measurements, or `/pixi-stress.html` for the
unchanged synthetic stress test. The About page links back to the default garden.

Open http://localhost:5080/canvas.html and click **Generate fake DNS event** to
add a flower, **Generate fake Gopher event** to add a mushroom,
**Generate fake HTTP event** to add a broad-leaf plant, **Generate fake SSH event**
to add a vine, or **Fake port 22 probe** to add a red bloom without grass influence.
Click **Start automatic fake traffic** to leave the garden running, and
**Stop automatic fake traffic** to pause arrivals without resetting the garden.
Manual buttons remain available while automatic traffic runs. Click any living
specimen in the Canvas to inspect its provenance and visual details.

Weather source defaults to **Live**, with manual weather inputs disabled.
Choose **Manual** to enable the inputs and override weather locally. A small
status reports SSE connection/reconnection. Disconnection retains the last
weather and garden state, without switching to fake weather. One SSE connection
also receives live garden events in Manual mode; weather frames apply only in Live.

In Manual mode, use the **Weather** selector and **Events/min** input to preview environmental
rain separately from fake specimen traffic. Quiet restores the normal garden;
zero intensity also removes the rain and dampening tint. Larger values increase
rain density, speed, and soil darkening, saturating visually at 10,000 events/min.
Heavy rain and storm levels increase density, speed, streak length, opacity, and
soil darkening sharply. Hurricane rain has strong horizontal drift and diagonal
streaks. These visual effects cause no ecological damage. Canvas retains rain
without lightning; both Pixi pages also support the optional illumination below.

Only `botnet_thunderstorm` and `botnet_hurricane` qualify for Pixi lightning;
ordinary rain and `heavy_rain` never do. A crisp pale-blue/white segmented bolt
starts at the garden's top edge, with varied downward zig-zags and sometimes
1–3 smaller branches. It attacks in 10ms, holds briefly and fades by 650ms;
a faint 140ms scene brightening supports the strike without an oval glow,
white frames or repeated flashes.
Thunderstorms wait a random 60–150 seconds; hurricanes wait 45–120 seconds,
with a slightly thicker, stronger bolt. Each wait starts after the previous
3.5-second sequence finishes. **Lightning** disables the effect independently;
`prefers-reduced-motion` suppresses illumination and its accompanying thunder.
Hidden pages cancel the sequence and resume on a fresh schedule without catch-up.
An hourly-statistics-only update does not reset that schedule. These effects
carry no security meaning and do not affect specimens, weather rules or puddles.

When Sound is already On, lightning produces a filtered-noise rumble with a low
tonal body after 0.8–1.3 seconds, lasting 1.8 seconds (thunderstorm) or 2 seconds
(hurricane, with a lower cutoff and pitch). The added midrange makes thunder
more audible on small speakers. It shares the existing context/master volume. Sound Off,
zero volume, hiding, disabling lightning or changing weather cancels thunder;
expired or suspended sequences never replay it. Preferences are not persisted.
The diagnostic page alone offers **Trigger Lightning (simulated)** under manually
selected eligible weather. See [implementation and measurements](docs/PIXI-LIVE.md).

Optional browser-local Web Audio on Canvas and both Pixi pages starts **Off**. Click **Sound: Off**
to enable them; the volume slider starts at **12%**. Shared output uses a gentle
volume curve (`2 × volume^1.25`), one compressor and a .75 output headroom gain:
full volume is louder while low settings remain usable. Existing species
envelopes, pitches and cooldowns are retained. Successful real and fake
specimen spawns share subtle species tones. Ghostbloom, crystal fungus, and
blackthorn use gentle chime flourishes reflecting artistic rarity, not security
alerts. Ordinary sounds have a 400 ms cooldown and rare flourishes an independent
900 ms cooldown; suppressed sounds are dropped while growth continues. Sound
preferences are not saved, and weather has no continuous audio.

All pages use the same `garden-audio.js` controller and synthesis, with no device
or AudioContext created before an explicit enable gesture. Wirefern reuses the
existing vine-family pluck (its former missing sound entry is now covered).
Pixi growth audio follows only successfully accepted real SSE spawns/replacements;
development fixture seeding, dropped/paused/invalid events, reconnects, redraws
and ordinary inspection are silent. Successful curiosity, Amanita and collectible
weed interactions use the existing quiet collection pluck, once per removal.
Sound Off mutes the master immediately, zero volume schedules no tones, and device
failures leave growth/rendering/clicking intact. Gnomes on both renderers reuse
the existing battle/victory cues once per phase through the same context and
volume. Pixi's optional distant thunder accompanies actual lightning; continuous
weather ambience remains absent. Canvas does not trigger thunder.
Focused parity/integration checks run with `node tests/pixi-audio.cjs` alongside
`node tests/garden-audio.cjs`.
Storm scheduling, audio, rendering and cancellation checks run with
`node tests/pixi-storm.cjs`.

Gnome checks run with `node tests/gnome-events.cjs` (Canvas),
`node tests/gnome-model.cjs` (shared rules), and `node tests/pixi-gnomes.cjs`
(cached presentation, entry points, sound and cleanup).
`node tests/gnome-landscaping.cjs` covers landscaping boundaries, stale targets,
protected exclusions, sequential removals, Canvas/Pixi parity, hidden/reduced
motion behavior and repeated resource cleanup.
`node tests/gnome-overcrowding.cjs` adds exact capacity/probability,
priority/shared cooldown, rare-palette exclusions, refill/stale-target safety,
free-space/removal/time bounds and repeated Canvas/Pixi resource checks.
The optional installed-Chrome
suite `node tests/pixi-default-browser.cjs --run` includes real-time landscaping
on both renderers and writes screenshots under `artifacts/homepage-browser/`.
`node tests/garden-lighting.cjs` covers local time/timezones, interpolation,
overrides, clock changes, weather composition, hidden/reduced-motion handling,
Canvas/Pixi parity and dense cache/cleanup bounds. The Chrome suite also captures
the same populated garden at all five lighting phases and at night in a storm;
use `--run --lighting-only` for this focused visual comparison. Set
`PACKETGARDEN_BROWSER_OUTPUT` to choose an ignored artifact directory.

The backend polls `https://noise.kgivler.com/api/snapshot` every 10 seconds with a
5-second timeout. It trusts the source level and exposes `level`,
`eventsPerMinute`, optional `eventsLastHour`, and `hasSnapshot` in the existing
weather SSE frames at `/api/garden/events`. The default Pixi footer shows compact
**Observatory traffic** statistics: Events/min is the source's five-minute count
divided by five; Last hour is its actual retained last-hour count, never a minute
rate multiplied by 60. These aggregate metrics are separate from accepted garden
growth. The Observatory's bounded 5,000-event store can undercount busy windows;
see [metric sources and limits](docs/REAL-DATA.md#activity-statistics-and-source-limits).
Missing hourly data displays Unavailable. Failures retain the last valid state;
before the first valid fetch, quiet/0 remains the rendering fallback while metrics
display Waiting. For local adapter
testing, override the source using the ASP.NET configuration key
`Weather:SnapshotUrl` (environment variable `Weather__SnapshotUrl`).

Set `Nats:Url` (environment variable `Nats__Url`) to enable TCPNoise input.
`Nats:Subject` (`Nats__Subject`) defaults to `tcpnoise.connection`. With no URL,
the app starts normally with discrete input disabled. Garden events are transient,
with no replay after reconnection; fake controls remain available in either mode.

For public alpha, each SSE subscription now has a **256-frame bounded queue**.
A subscriber that falls behind and fills its queue is disconnected rather than
accumulating unbounded events or silently dropping weather. An individual
response write/flush has a 15-second budget; browsers using EventSource reconnect
automatically, but any missed growth events are intentionally not replayed.
At most **128** SSE clients can be connected at once; an excess request gets
HTTP 503 with `Retry-After: 5`. These are conservative initial alpha limits,
not a substitute for ingress controls, memory monitoring, or live/proxy testing.
See [the alpha checklist](docs/ALPHA-RELEASE.md) for release gates.

See [Real data](docs/REAL-DATA.md) for validation, mapping, and fleet inventory.

Run normalization/fanout checks with `dotnet run --project tests/PacketGarden.Checks`,
browser-path checks with `node tests/garden-events.cjs`, focused inspection checks
with `node tests/garden-inspect.cjs`, audio checks with `node tests/garden-audio.cjs`,
broadleaf/color checks with `node tests/broadleaf-variants.cjs` and
`node tests/species-color-variants.cjs`, and focused grass ecology checks with
`node tests/grass-ecology.cjs`. Collectible integration checks run with
`node tests/garden-collectibles.cjs`, and ambient actor checks with
`node tests/gnome-events.cjs`. Atomic live growth and Recent activity are covered by
`node tests/garden-activity.cjs`. Cache/animation and dense-garden structural
performance checks run with `node tests/render-performance.cjs`.
Local vine-neighbor work and connection/lifecycle correctness checks run with
`node tests/vine-rendering.cjs`.
First-seen trigger, bounded visitors, clicking, and overlay performance checks run
with `node tests/garden-curiosities.cjs`.
Loose-drop timing, collection, independence, hidden tabs, and overlay isolation
are checked with `node tests/garden-drops.cjs`; dense storm/drop rendering is also
covered by `node tests/render-performance.cjs`.
Storm-water lifecycle, isolation, and cached rendering checks run with
`node tests/garden-puddles.cjs`; weighted vine hue boundaries are covered by
`node tests/species-color-variants.cjs`.

Automatic traffic is off initially. It generates one event every 1.2–2.8 seconds
with relative weights of DNS 55, HTTP 28, SSH 10, Gopher 5, and port 22 probe 2.
Tune the delays and weights together in `fakeTrafficConfig` in `wwwroot/garden.js`.

The whole garden scales to fit the window, and specimens survive resizing.
Lifecycle thresholds below are elapsed time since creation:

| Species | Starts growing | Becomes mature | Starts wilting/decaying | Removed |
| --- | --- | --- | --- | --- |
| Flower | 15 seconds | 45 seconds | Wilts at 3 minutes | 4 minutes |
| Mushroom | 12 seconds | 40 seconds | Decays at 4 minutes | 5 minutes |
| Broad-leaf plant | 20 seconds | 1 minute | Fades at 5 minutes | 6 minutes |
| Vine | 20 seconds | 1 minute | Dries at 8 minutes | 10 minutes |
| Wirefern | 18 seconds | 50 seconds | Fades at 5 minutes | 6 minutes |
| Red bloom | Blooms immediately | — | Wilts at 10 seconds | 30 seconds |
| Weed | 20 seconds | 1 minute | Fades at 5 minutes | 6 minutes |
| Ghostbloom | 15 seconds | 45 seconds | Fades at 5 minutes | 6 minutes |
| Crystal fungus | 12 seconds | 40 seconds | Fades at 6 minutes | 7 minutes |
| Blackthorn | 20 seconds | 1 minute | Fades at 10 minutes | 12 minutes |

State is held only in browser memory; reloading starts an empty garden.

Focused wirefern mapping/rendering integration and structural performance checks
run with `node tests/wirefern.cjs` and the backend checks project.

## Browser performance diagnostics

Open `/canvas.html?perf=1` to show the compact Canvas browser-local profiler.
It is off by default, is never saved, and sends no data to the server or elsewhere.
The tool measures approximate `performance.now()` durations for base setup/layout,
soil/grid/border, grass, puddles, specimens (vine/wirefern/other), and overlay
setup, mutations, actors, curiosities, loose drops, and rain. It also reports
repaint reasons, visual-deadline-only costs, the next visual deadline/time until it,
render/lookup/neighbor/streak counts,
16.7/33.3 ms budget counts, RAF gaps, canvas geometry/DPR, existing layout reads,
backing resizes, and supported long-task observations. Long RAF gaps that contain
a base completion are counted separately as correlation, not proof of causation.

Last/average/max timings use bounded rings of 120 samples per stream; approximate
rates count paints in the last second. One panel text replacement at most twice
per second shares the existing logical tick. Counters/longest durations are
session totals; `gardenPerf.reset()` in the development console clears measurements
without changing the garden. There are no additional timers, layout reads, bitmap
copies, persistence, profiler event listeners, or scenario buttons. The focused
checks run with `node tests/performance-diagnostics.cjs`.

Timings include instrumentation overhead and synchronous JS/Canvas submission;
vine/wirefern/other are subdivisions of specimens, and lookup is included in setup.
They do not measure GPU/compositor presentation or identify GC. FPS-cap skips are
intentional scheduling decisions, not lost frames. Long tasks and RAF gaps are
clues only; browser support for long tasks is optional. This is a development
profiling tool, not user-facing telemetry.

Allocation candidates to examine in a subsequent profiling/optimization slice:
the base rebuild's Map and mutation-list slice; per-specimen color lookup callbacks
and rare-color objects; weed/blackthorn drawing arrays; grass render palettes,
interpolated-color arrays/strings; curiosity/drop position objects each overlay paint; and lifecycle filter
arrays on the logical tick. Rain uses deterministic numeric streaks without a
per-streak particle object. These paths are unchanged; no GC diagnosis or
optimization is implied by the list.

Base rendering uses one aggregate absolute visual deadline, computed only after
an actual rebuild. Ordinary logical ticks compare the stored deadline rather than
rescanning objects. All current specimen renderers change at discrete growth,
maturity, fade/drying/wilting, and expiry boundaries; their drawings at a given age
are unchanged. Mature specimens wait until the next such boundary, including vine
connectivity eligibility. Grass geometry interpolates during growth, and its
geometry/opacity/color interpolate during fading, so those active intervals retain
approximately one-second visual updates. Stable mature grass waits for fading.

Puddle deadlines invert the existing linear growth, square-root drainage size,
and linear drainage opacity. A redraw is due after 0.5 logical units of main-radius
change (under 0.58 pixels including offset/rotated ellipse edges), or 0.02 fill-opacity
change, whichever occurs first; final growth size and expiry are also preserved.
This avoids one full-garden repaint per second for sub-pixel drainage changes.
Any unrelated real repaint reanchors these thresholds to what was actually drawn.
Puddle formation probabilities, refresh, hold time, and eight-minute drainage are
unchanged, as are grass ecology and all specimen lifetimes/appearance.

Actual state changes, soil tint changes, and resizing still invalidate immediately
and recompute the deadline. Hidden pages do not paint or replay missed visual
steps. Resume reconciles current logical state, repaints the base at most once if
dirty or a visual deadline was crossed, and preserves the cached base if unchanged.
The overlay remains independent. No layers or per-object timers were added.
`node tests/base-visual-scheduling.cjs` covers 30-second mature mixed/vine/wirefern
scenes with zero recurring base work, lifecycle boundaries, grass interpolation,
meaningful puddle steps, invalidation, and hidden/resume behavior. This removes
known unnecessary work; it does not establish a fix for unexplained RAF gaps.
The profiler also displays the existing session-longest RAF gap so earlier stalls
remain visible after they leave the rolling 120-sample window.

`node tests/pixi-default.cjs` checks the production Pixi page's actual script order
with strict DOM lookup: absent development controls/metrics/probes, live weather
and reconnection, inspection/collection, resize/DPR, visibility/expiry, cleanup,
and visible WebGL initialization failure. Existing Canvas suites now load
`canvas.html`; diagnostic Pixi suites continue to exercise `pixi-live.html`.
These injected-browser checks do not measure GPU performance.
