# PacketGarden Real Data

## Implemented live aggregate weather

The browser prototype already has five event mappings, clustered placement,
species lifecycles, and weighted fake traffic. The backend serves the browser and
now delivers live aggregate weather from Noise Observatory:

```text
Noise Observatory /api/snapshot
    -> PacketGarden HttpClient adapter -> normalized weather -> SSE -> browser weather renderer
```

The adapter polls `https://noise.kgivler.com/api/snapshot` every 10 seconds with a
5-second request timeout. The Observatory's `level` is authoritative; PacketGarden
does not reproduce its category thresholds. Supported levels are `quiet`,
`drizzle`, `rain`, `heavy_rain`, `botnet_thunderstorm`, and `botnet_hurricane`.

Only the latest normalized pair is retained. Unsupported levels, missing fields,
invalid JSON, and non-finite/non-numeric rates are rejected. Finite rates are
clamped to 0–1,000,000 without changing the source level. Fetch/parsing failures
retain the last valid state. Before the first successful fetch, the fallback is
quiet/0. One warning per outage and a recovery message avoid repeated stack logs.

`/api/garden/events` sends the current state immediately and sends another frame
only when the normalized pair changes. SSE framing is:

```text
event: weather
data: {"level":"rain","eventsPerMinute":29.8}

```

Each frame ends with a blank line. The browser talks only to PacketGarden using
`EventSource`. Manual is the default source mode; Live disables manual weather
inputs and updates the existing renderer. SSE disconnection shows a small status,
retains weather/ecology, and uses normal EventSource reconnection. Switching
source modes does not reset the garden. Weather still has no ecological effects.

The full Observatory response is never forwarded. Browser-facing weather has
only `level` and `eventsPerMinute`; this is separate from discrete `GardenEvent`s.

## Still-planned discrete integration

The intended path is:

```text
sensors/services
     ↓
    NATS
     ↓
PacketGarden backend adapters
     ↓
normalized garden events/environmental state
     ↓
    SSE
     ↓
existing browser ecology
```

SSE is already implemented for aggregate weather and remains the transport choice
for future discrete input. NATS ingestion and real specimen events are not implemented.
The browser should receive normalized input rather than connect directly to
NATS. Adapters translate sensor/service observations into garden meanings while
keeping the existing browser state, update loop, and renderer as the foundation.

## Discrete events and aggregate pressure

Discrete observations may influence specimens: DNS activity can grow flowers,
HTTP activity broad-leaf plants, Gopher activity mushrooms, genuine SSH telemetry
vines, and authentication failures brief red blooms. Fake and real discrete
events should use the same browser handling path.

Aggregate/background activity represents pressure over a time window. It can
drive environmental state such as drizzle, rain, or heavy rain rather than
spawning one specimen for every packet, probe, or volume sample. Weather should
ease when that pressure subsides. The live weather adapter accepts the
Observatory's category rather than inferring one locally. Additional environmental
effects remain future work. Traffic quietness does not determine local-time lighting.

High volume should not necessarily create one new permanent specimen per event.
Repeated events may strengthen, spread, bloom, mutate, or otherwise influence
existing growth. The current main-specimen handler only spawns into empty cells;
richer specimen responses remain work to implement. Grass seeding/refresh is a
separate existing effect of successful fake DNS/HTTP spawns; seeded turf grows
and spreads locally through the browser update loop.

## Preserve sensor meaning

TCPNoise probes against ports such as 22/2222 are probe/noise observations. They
must not automatically be classified as genuine SSH connections or failed
authentication. Genuine SSH telemetry can still map to vines, and failed-auth
events need appropriate auth telemetry.

Port scans/noisy probes may create weeds or invasive growth. Unusual ports may
influence mutations. These are proposed garden effects, not additional mappings
already supported by the browser. Adapters should retain coarse observation
meaning when a sensor cannot establish a protocol or authentication outcome.

## Normalized data and privacy

Normalized input may include only safe coarse fields useful to the garden:

- event type or environmental activity category;
- sanitized source/sensor label;
- network class: `public`, `dn42`, or `ygg`;
- timestamp;
- intensity, such as a bounded activity level;
- duration or aggregation window;
- sanitized tags describing coarse traits.

These fields describe future discrete adapters, not the current two-field weather
stream or a finalized schema. The current browser
`GardenEvent` contains only `type`; add fields as concrete effects need them.
Normalize and sanitize before sending data to the browser. Do not include private
addresses, credentials, raw packets, payloads, or unnecessary infrastructure
details. Network class describes coarse context without exposing endpoints or
splitting the shared garden into network-specific plots.

## Scope

The aggregate-weather vertical slice is implemented without NATS. Next, add a
small NATS adapter path and SSE delivery of supported discrete events.
Inspection, local-time lighting, persistence, and ecological competition remain
separate unfinished MVP work; this plan does not imply they are implemented.

See [MVP](MVP.md) for completed and remaining capabilities and
[Event mappings](EVENT-MAPPINGS.md) for proposed effects.
