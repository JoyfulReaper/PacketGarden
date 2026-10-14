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

## First prototype

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
- HTML/CSS plus Canvas for the garden;
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

Successful fake DNS and HTTP spawns can seed or refresh grass beneath the
specimens (45% and 65% influence chances). Each successful influence affects
the usual target and has a 35% chance to also affect a distinct adjacent cell near
the new specimen, for at most two grass cells per event. Real TCPNoise growth does
not directly seed or refresh grass. Grass does not occupy specimen slots or affect
specimen counts. Once seeded, sparse grass expands into ragged, near-full turf
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
not affect organisms or grass. Animated weather, gnomes, mutations, and curiosities
reuse a cached ecology scene and share a roughly 30 FPS visual limit; lifecycle updates
still refresh the slow scene every 250 ms. Hidden tabs pause animation, and Canvas
backing resolution is capped at DPR 2.

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

Natural expiry remains the normal way space opens in the bounded 32×20 garden.
When full, incoming vigor must be strictly greater than an eligible occupant's:
choose the lowest eligible vigor, then its oldest specimen, and reuse that exact
cell. Ghostbloom, crystal fungus, and blackthorn are protected from forced
replacement but still expire normally. Weed and redbloom remain replaceable.
Equal vigor cannot churn the garden, and incoming rare growth gets the same gate.
Successful replacements use the normal growth sound/cooldowns; dropped events
are silent. Real TCPNoise replacement does not seed or refresh grass. The existing
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

Open http://localhost:5080 in a browser and click **Generate fake DNS event** to
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
streaks. These remain visual effects, without lightning, flashing, or damage.

Optional browser-local Web Audio growth sounds start **Off**. Click **Sound: Off**
to enable them; the volume slider starts at **12%**. Successful real and fake
specimen spawns share subtle species tones. Ghostbloom, crystal fungus, and
blackthorn use gentle chime flourishes reflecting artistic rarity, not security
alerts. Ordinary sounds have a 400 ms cooldown and rare flourishes an independent
900 ms cooldown; suppressed sounds are dropped while growth continues. Sound
preferences are not saved, and weather has no continuous audio.

The backend polls `https://noise.kgivler.com/api/snapshot` every 10 seconds with a
5-second timeout. It trusts the source level and exposes only `level` and
`eventsPerMinute` at `/api/garden/events`. Failures retain the last valid pair;
before the first valid fetch, the backend starts with quiet/0. For local adapter
testing, override the source using the ASP.NET configuration key
`Weather:SnapshotUrl` (environment variable `Weather__SnapshotUrl`).

Set `Nats:Url` (environment variable `Nats__Url`) to enable TCPNoise input.
`Nats:Subject` (`Nats__Subject`) defaults to `tcpnoise.connection`. With no URL,
the app starts normally with discrete input disabled. Garden events are transient,
with no replay after reconnection; fake controls remain available in either mode.
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
First-seen trigger, bounded visitors, clicking, and overlay performance checks run
with `node tests/garden-curiosities.cjs`.
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
| Red bloom | Blooms immediately | — | Wilts at 10 seconds | 30 seconds |
| Weed | 20 seconds | 1 minute | Fades at 5 minutes | 6 minutes |
| Ghostbloom | 15 seconds | 45 seconds | Fades at 5 minutes | 6 minutes |
| Crystal fungus | 12 seconds | 40 seconds | Fades at 6 minutes | 7 minutes |
| Blackthorn | 20 seconds | 1 minute | Fades at 10 minutes | 12 minutes |

State is held only in browser memory; reloading starts an empty garden.
