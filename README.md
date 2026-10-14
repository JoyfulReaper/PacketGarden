# PacketGarden

PacketGarden is a browser-based ambient network garden where real or simulated protocol/network events grow plants, flowers, fungi, weeds, terrain, and other strange things instead of appearing only as ordinary telemetry.

The core idea is deliberately playful: a DNS lookup might strengthen a flower patch, a Gopher request might sprout a mushroom, an SSH connection might grow a thorny vine, and unusual traffic might mutate the garden in increasingly weird ways.

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

PacketGarden should consume sanitized event summaries rather than raw packet payloads or sensitive telemetry.

The renderer should not need raw IP addresses, credentials, request payloads, or secrets to make the garden interesting.

## Planning docs

- [Vision](docs/VISION.md)
- [MVP](docs/MVP.md)
- [Initial event mappings](docs/EVENT-MAPPINGS.md)
- [Real data](docs/REAL-DATA.md)

## Status

All five initial MVP mappings are implemented: DNS flowers, Gopher mushrooms,
HTTP broad-leaf plants, SSH thorny vines, and brief failed-authentication red
blooms. The Canvas shows the whole fixed garden and subtle grid. Cluster-first
placement, species lifecycles, and shared cell occupancy work; neighboring vines
visually connect into creeping patches.

Manual controls and automatic weighted fake traffic feed the same event handler.
Lifecycles now retain several minutes of visual history, with vines lasting up to
10 minutes and red blooms remaining brief. State is held only in browser memory.

Successful fake DNS and HTTP spawns can seed or refresh grass beneath the
specimens (45% and 65% influence chances). Each successful influence affects
the usual target and has a 35% chance to also affect a distinct adjacent cell near
the new specimen, for at most two grass cells per event. Real TCPNoise growth does
not directly seed or refresh grass. Grass does not occupy specimen slots or affect
specimen counts. Once seeded, sparse grass expands into ragged, near-full turf
over 30 seconds without further traffic. Healthy mature grass occasionally seeds
an immediate neighbor; spread is capped across the whole garden to prevent
runaway filling. Neglected turf begins fading after 20 minutes, becomes
brown/dead-looking by 32 minutes, and disappears after 35. Re-influence restores
health and refreshes that timer without duplicating cells.

Weather supports Manual previews and Live aggregate weather from Noise
Observatory through the backend and SSE. Both use the same renderer for quiet,
drizzle, rain, heavy rain, botnet thunderstorm, and botnet hurricane. Weather does
not affect organisms or grass.

TCPNoise port hits now create plants through NATS and SSE. The backend maps
listening ports to visual families without asserting protocol/authentication
semantics; a port-22 hit can grow a vine, and unknown ports grow flowers. The
browser receives only the resolved specimen type and listening port. No port hit
creates a red bloom. Other discrete adapters, inspection, local-time lighting,
persistence, and ecological competition remain planned work; see [MVP](docs/MVP.md).

## Run the prototype

Install the .NET 10 SDK, then run from the repository root:

```sh
dotnet run --project PacketGarden.csproj --urls http://localhost:5080
```

Open http://localhost:5080 in a browser and click **Generate fake DNS event** to
add a flower, **Generate fake Gopher event** to add a mushroom,
**Generate fake HTTP event** to add a broad-leaf plant, **Generate fake SSH event**
to add a vine, or **Generate fake failed-auth event** to add a red bloom.
Click **Start automatic fake traffic** to leave the garden running, and
**Stop automatic fake traffic** to pause arrivals without resetting the garden.
Manual buttons remain available while automatic traffic runs.

Weather source defaults to **Manual**. Choose **Live** to receive weather from
the backend; manual weather inputs are disabled until you switch back. A small
status reports SSE connection/reconnection. Disconnection retains the last
weather and garden state, without switching to fake weather. One SSE connection
also receives live garden events in Manual mode; weather frames apply only in Live.

In Manual mode, use the **Weather** selector and **Events/min** input to preview environmental
rain separately from fake specimen traffic. Quiet restores the normal garden;
zero intensity also removes the rain and dampening tint. Larger values increase
rain density, speed, and soil darkening, saturating visually at 10,000 events/min.
Storm levels currently scale the same rainfall, without lightning or damage.

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

Run normalization/fanout checks with `dotnet run --project tests/PacketGarden.Checks`
and browser-path checks with `node tests/garden-events.cjs`.

Automatic traffic is off initially. It generates one event every 1.2–2.8 seconds
with relative weights of DNS 55, HTTP 28, SSH 10, Gopher 5, and failed auth 2.
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

State is held only in browser memory; reloading starts an empty garden.
