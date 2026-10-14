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
`EventSource`. Live is the default source mode; it disables manual weather
inputs and updates the existing renderer. Manual remains an explicit override.
SSE disconnection shows a small status, retains weather/ecology, and uses normal
EventSource reconnection. Switching source modes does not reset the garden.
Weather still has no ecological effects.

The full Observatory response is never forwarded. Browser-facing weather has only
`level` and `eventsPerMinute`; this is separate from discrete garden growth.

## Implemented TCPNoise port hits

The first discrete path is:

```text
TCPNoise collector (`tcpnoise.connection`)
     ↓
    NATS
     ↓
PacketGarden backend adapter
     ↓
validate -> port 22: redbloom; other ports: base mapping + coarse rarity traits
     ↓
normalized garden growth + bounded inspection provenance
     ↓
    SSE
     ↓
existing browser ecology + click inspection
```

The hosted adapter uses `NATS.Client.Core`. Set `Nats:Url` (`Nats__Url` in the
environment) to enable it; `Nats:Subject` defaults to `tcpnoise.connection`.
Without a URL, discrete input is disabled and the app/weather/fake controls still
work. Broker outages use normal client reconnection, with an initial-connect retry
and one warning per outage. There is no persistence, replay, or coalescing.

Only `EventType`, `Source`, `SchemaVersion`, `Payload.listenPort`,
`Payload.ipVersion`, `Payload.sensor`, and `Payload.seenCount` are deserialized.
The adapter accepts `EventType == tcpnoise.connection`, `Source == tcpnoise`,
schema version 1, and integer ports 1–65535; malformed/unsupported required input
is ignored.

Optional traits are lenient: numeric integers 4 and 6 are accepted, with only 6
giving an IPv6 bonus; missing, null, nonnumeric, fractional, or unsupported
versions give no bonus. Only string sensor values can match the case-insensitive
`-dn42` / `-ygg` suffixes (no trimming); missing, nonstring, blank, or nonmatching
names give no sensor bonus.

No unrelated collector fields are required or retained. The backend resolves the
port-22 redbloom special case or, for every other port, the base mapping and
[artistic rarity roll](EVENT-MAPPINGS.md#tcpnoise-rarity) before independently
converting `seenCount` to coarse visual vigor.

Usable counts are unsigned 64-bit JSON integers: 0–1 give vigor 0, 2–3 give 1, 4–9
give 2, and 10 through 18,446,744,073,709,551,615 give 3. Missing, null, strings,
objects, negative, fractional/exponent representations, or overflowing numbers
give vigor 0 without rejecting a valid connection. No arithmetic on the raw count
is needed.

Vigor is artistic recurrence, not a threat score or rarity input; it affects
bounded rendering details and competition only at full specimen occupancy.

For click inspection, a valid TCPNoise sensor string is forwarded as a bounded
label (maximum 128 characters), and a valid unsigned `seenCount` is forwarded as
its exact decimal text. Sending the count as text avoids JavaScript rounding of
large UInt64 values. Optional inspection fields are omitted when unusable.

A typical live frame is:

```text
event: garden
data: {"specimenType":"broadleaf","listenPort":445,"vigor":3,"sensor":"wurstcase-public","seenCount":"17"}

```

Each valid hit produces one growth event for each currently connected browser.
Each SSE client has its own transient queue; new connections do not replay hits.
The existing `/api/garden/events` endpoint multiplexes `garden` and `weather`
frames. One browser EventSource stays connected in both weather modes: normalized
garden frames always reach the shared specimen placement path, while weather
frames affect rendering only in Live mode. Live weather is the default. Switching
modes can apply the latest cached live weather without reopening the stream.

The browser requires integer vigor 0–3 and ignores growth frames with missing or
invalid vigor. Each specimen retains its received vigor throughout its lifetime;
fake controls default to 0. The browser also retains the normalized sensor label,
listening port, and exact decimal `seenCount` on successful live specimens for
click inspection.

Today those inspection fields do not change backend species/rarity, placement,
grass, weather, decay, or competition. A proposed future browser-only first-seen
curiosity may additionally use an exact valid `seenCount == "1"` as a trigger for
a short-lived critter/object near the source specimen. That proposed use would not
change the backend mapping or SSE contract.

Remote IP addresses, remote source ports, packet contents, banners, credentials,
and unrelated collector fields are never forwarded.

Port hits use the [destination-port visual mapping](EVENT-MAPPINGS.md#tcpnoise-destination-port-mapping).
They share placement, clustering, lifecycles, and occupancy with fake events, but
do not inherit fake DNS/HTTP grass effects. Real TCPNoise growth does not directly
seed or refresh grass in this slice, including forced replacements.

After expiry, if all 640 cells remain full, incoming vigor must strictly exceed an
unprotected occupant's. Replacement targets the lowest eligible vigor and then its
oldest specimen, reusing the exact cell with a fresh creation timestamp.
Ghostbloom, crystal fungus, and blackthorn are protected from displacement but
still expire normally; weed and redbloom are eligible. Incoming rare growth uses
the same gate. Equal vigor cannot churn the grid. Successful replacement uses
normal growth sound/cooldowns; a dropped saturated event is silent. Natural expiry
remains the usual source of space, and the status notes saturation only while the
grid is full.

## Browser-only transient uses of live provenance

The browser already uses live port-22 growth for the first pointless collectible:
a successful redbloom gets a separate 5% browser-only roll that may leave a tiny
weed sprig nearby for 20 seconds, with at most three active sprigs.

This does not alter the TCPNoise mapping. The backend event is still redbloom.

The preferred follow-up is to replace that secondary-drop presentation with a
mutation of the **same redbloom specimen** into a temporary collectible weed plant
after the redbloom first appears normally. The mutated presentation should retain
the source specimen's safe provenance and remain entirely browser-side.

A second proposed use is an exact valid `seenCount == "1"` first-seen curiosity:

- only a successfully spawned live specimen can trigger it;
- at most three first-seen curiosities exist globally at once;
- when all slots are occupied, skip the new one without queue/catch-up;
- the curiosity does not consume a specimen cell or affect grass, rarity, vigor,
  competition, weather, or the source specimen;
- it may be a short-lived critter or harmless dropped object;
- clicking it may award the intentionally meaningless message `+0 points`.

`seenCount == "1"` should be described narrowly as a source-provided recurrence
count of one. PacketGarden must not upgrade that into a claim of global first-ever
observation across every collector or historical data set.

## Discrete events and aggregate pressure

Discrete observations may influence specimens: DNS activity can grow flowers,
HTTP activity broad-leaf plants, Gopher activity mushrooms, genuine SSH telemetry
vines, and port-22 hits brief red blooms. Fake and real discrete events should
converge on shared ecological placement/rendering without pretending that raw port
hits establish higher-level protocol semantics.

Aggregate/background activity represents pressure over a time window. It can
drive environmental state such as drizzle, rain, or heavy rain rather than
spawning one specimen for every packet, probe, or volume sample. Weather should
ease when that pressure subsides. The live weather adapter accepts the
Observatory's category rather than inferring one locally. Additional environmental
effects remain future work. Traffic quietness does not determine local-time
lighting.

High volume should not necessarily create one new permanent specimen per event.
Repeated events may strengthen, spread, bloom, mutate, or otherwise influence
existing growth. The current main-specimen path prefers empty cells and uses only
the bounded vigor replacement rule at saturation; richer responses remain work to
implement. Grass seeding/refresh is a separate existing effect of successful fake
DNS/HTTP spawns; seeded turf grows and spreads locally through the browser update
loop.

## Preserve sensor meaning

TCPNoise destination ports deliberately select plant visual families, not protocol
classifications. Redbloom means TCPNoise observed a connection to listening port
22, based solely on that port. It does not prove SSH negotiation, attempted
credentials, failed authentication, or malicious intent.

The aesthetic port-22 special case bypasses ordinary rarity to keep the signal
recognizable. Port 2222 retains its vine base and normal rarity. Every valid port
gets growth, with flowers as the unknown-port fallback before rarity. Weeds and
rare specimens are artistic outcomes.

IPv6 / DN42 / Ygg and fallback ports are coarse visual modifiers, not security
classifications or claims that any sensor/traffic class is malicious. Individual
hits drive plants; aggregate activity continues driving weather separately through
Noise Observatory. Rare growth still requires an accepted event; there are no
backend timed mutation events. Sensor labels may reach SSE only as bounded
inspection provenance; remote endpoint/IP details do not.

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

Normalized input may include only safe fields useful to the garden and inspection:

- normalized specimen/event type;
- listening port where relevant;
- bounded source/sensor label;
- coarse visual vigor;
- exact sanitized recurrence count when explicitly useful for inspection or a
  narrowly defined browser-only transient effect;
- environmental activity category/intensity;
- timestamp, duration, aggregation window, or sanitized coarse tags for future adapters.

These fields describe both the current adapters and possible future ones. Current
weather has only `level`/`eventsPerMinute`; TCPNoise browser growth has
`specimenType`/`listenPort`/`vigor` plus optional `sensor`/`seenCount`, and fake
events still originate from local development controls.

Normalize and sanitize before sending data to the browser. Do not include
private/remote addresses, credentials, raw packets, payloads, banners, or
unnecessary endpoint details. The sensor label is provenance for a clicked
specimen, not a security identity or threat classification.

## Scope

Live aggregate weather, NATS-backed TCPNoise growth, event-driven weed/rare growth,
click inspection of live specimen provenance, and the first secondary weed-sprig
collectible are implemented.

The preferred redbloom-to-collectible-weed mutation, first-seen curiosities,
local-time lighting, persistence, other protocol/auth-aware adapters, and richer
specimen responses remain future work.

See [MVP](MVP.md) for completed and remaining capabilities and
[Event mappings](EVENT-MAPPINGS.md) for implemented/proposed effects.
