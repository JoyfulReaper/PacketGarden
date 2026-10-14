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
only `level` and `eventsPerMinute`; this is separate from discrete garden growth.

## Implemented TCPNoise port hits

The first discrete path is:

```text
TCPNoise collector (`tcpnoise.connection`)
     ↓
    NATS
     ↓
PacketGarden backend adapter
     ↓
validate + destination port -> specimen type
     ↓
normalized garden growth
     ↓
    SSE
     ↓
existing browser ecology
```

The hosted adapter uses `NATS.Client.Core`. Set `Nats:Url` (`Nats__Url` in the
environment) to enable it; `Nats:Subject` defaults to `tcpnoise.connection`.
Without a URL, discrete input is disabled and the app/weather/fake controls still
work. Broker outages use normal client reconnection, with an initial-connect
retry and one warning per outage. There is no persistence, replay, or coalescing.

Only `EventType`, `Source`, `SchemaVersion`, and `Payload.listenPort` are
deserialized. The adapter accepts `EventType == tcpnoise.connection`,
`Source == tcpnoise`, schema version 1, and integer ports 1–65535;
malformed/unsupported input is ignored. The backend resolves the listening port
to an aesthetic specimen before anything is sent to the browser. SSE emits only:

```text
event: garden
data: {"specimenType":"broadleaf","listenPort":443}

```

Each valid hit produces one growth event for each currently connected browser.
Each SSE client has its own transient queue; new connections do not replay hits.
The existing `/api/garden/events` endpoint multiplexes `garden` and `weather`
frames. One browser EventSource stays connected in both weather modes: normalized
garden frames always reach the shared specimen placement path, while weather
frames affect rendering only in Live mode. Manual weather remains the default.
Switching modes can apply the latest cached live weather without reopening the
stream.

Port hits use the [destination-port visual mapping](EVENT-MAPPINGS.md#tcpnoise-destination-port-mapping).
They share placement, clustering, lifecycles, and occupancy with fake events, but
do not inherit fake DNS/HTTP grass effects. Real TCPNoise growth does not directly
seed or refresh grass in this slice. If specimen cells are full, the existing
placement path cannot place another specimen.

## Discrete events and aggregate pressure

Discrete observations may influence specimens: DNS activity can grow flowers,
HTTP activity broad-leaf plants, Gopher activity mushrooms, genuine SSH telemetry
vines, and authentication failures brief red blooms. Fake and real discrete
events should converge on shared ecological placement/rendering without
pretending that raw port hits establish higher-level protocol semantics.

Aggregate/background activity represents pressure over a time window. It can
drive environmental state such as drizzle, rain, or heavy rain rather than
spawning one specimen for every packet, probe, or volume sample. Weather should
ease when that pressure subsides. The live weather adapter accepts the
Observatory's category rather than inferring one locally. Additional environmental
effects remain future work. Traffic quietness does not determine local-time lighting.

High volume should not necessarily create one new permanent specimen per event.
Repeated events may strengthen, spread, bloom, mutate, or otherwise influence
existing growth. The current main-specimen path only spawns into empty cells;
richer specimen responses remain work to implement. Grass seeding/refresh is a
separate existing effect of successful fake DNS/HTTP spawns; seeded turf grows
and spreads locally through the browser update loop.

## Preserve sensor meaning

TCPNoise destination ports deliberately select plant visual families, not
protocol classifications. A hit on 22/2222 may grow a vine without claiming a
genuine SSH session. Every valid port gets growth, with flowers as the unknown-port
fallback. No port hit produces a red bloom: actual failed authentication still
requires auth-aware telemetry. There is no separate TCPNoise weed category.
Individual hits drive plants; aggregate activity continues driving weather
separately through Noise Observatory. Unusual-port mutations remain future work.

## TCPNoise fleet planning inventory

Reference only; this is not runtime discovery or configuration.

| Sensors | Listening ports |
| --- | --- |
| noisemaker | 21 22 23 80 443 445 2323 3389 5432 6379 8080 9200 420 42069 |
| clanker-public / clanker-dn42 / clanker-ygg | 21 23 25 80 443 445 2222 3389 5900 8080 8443 |
| scopecreep-public / scopecreep-dn42 / scopecreep-ygg | 21 23 80 443 2222 2323 3389 5432 8080 420 42069 |
| wurstcase-public / wurstcase-dn42 / wurstcase-ygg | 21 23 25 80 443 445 2222 3389 5900 8080 8443 |
| overlay-dn42 / overlay-ygg | 21 22 23 25 80 443 445 3389 5900 8080 8443 |

## Normalized data and privacy

Normalized input may include only safe coarse fields useful to the garden:

- event type or environmental activity category;
- sanitized source/sensor label;
- network class: `public`, `dn42`, or `ygg`;
- timestamp;
- intensity, such as a bounded activity level;
- duration or aggregation window;
- sanitized tags describing coarse traits.

These fields describe possible future adapters, not a finalized schema. Current
weather has only `level`/`eventsPerMinute`; TCPNoise browser growth has only
`specimenType`/`listenPort`, and fake events still have only `type`.
Normalize and sanitize before sending data to the browser. Do not include private
addresses, credentials, raw packets, payloads, or unnecessary infrastructure
details. Network class describes coarse context without exposing endpoints or
splitting the shared garden into network-specific plots.

## Scope

Live aggregate weather and NATS-backed TCPNoise growth are implemented.
Other protocol/auth-aware adapters, mutations, and richer specimen responses
remain future work.
Inspection, local-time lighting, persistence, and ecological competition remain
separate unfinished MVP work; this plan does not imply they are implemented.

See [MVP](MVP.md) for completed and remaining capabilities and
[Event mappings](EVENT-MAPPINGS.md) for proposed effects.
