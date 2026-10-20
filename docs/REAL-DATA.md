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

Only the latest normalized state is retained. Unsupported levels, missing required fields,
invalid JSON, and non-finite/non-numeric rates are rejected. Finite rates are
clamped to 0–1,000,000 without changing the source level. Fetch/parsing failures
retain the last valid state. Before the first successful fetch, the fallback is
quiet/0 with `hasSnapshot: false`, so the UI shows Waiting rather than treating
the fallback as a zero measurement. One warning per outage and a recovery message
avoid repeated stack logs.

`/api/garden/events` sends the current state immediately and sends another frame
only when the normalized state changes, including hourly-only changes. SSE framing is:

```text
event: weather
data: {"level":"rain","eventsPerMinute":29.8,"eventsLastHour":4321,"hasSnapshot":true}

```

Each frame ends with a blank line. The browser talks only to PacketGarden using
`EventSource`. Live is the default source mode; it disables manual weather
inputs and updates the existing renderer. Manual remains an explicit override.
SSE disconnection shows a small status, retains weather/ecology, and uses normal
EventSource reconnection. Switching source modes does not reset the garden.
Weather still has no ecological effects.

The full Observatory response is never forwarded. Weather rendering still uses
only `level` and `eventsPerMinute`; optional aggregate activity is separate from
discrete garden growth. Older clients can ignore the additive fields, and older
snapshots without an hourly field remain valid weather.

### Activity statistics and source limits

The default Pixi homepage labels these read-only values **Observatory traffic**:

- **Events/min (5-min avg)** is the snapshot's `eventsPerMinute`, defined by the
  Observatory as `eventsLastFiveMinutes / 5`. The existing 0–1,000,000 rate clamp
  is unchanged (the current source store bounds the rate below this limit).
- **Last hour** is the snapshot's actual `eventsLastHour`, copied without rate
  extrapolation. PacketGarden never multiplies the minute rate by 60. A missing,
  null, negative, fractional, nonnumeric or browser-unsafe integer becomes null
  and displays Unavailable; an actual source zero displays 0. An unusable optional
  hour does not reject otherwise valid weather.

The Observatory currently counts windows over a **5,000-event in-memory store**
(`NoiseEventStore.MaxEvents`), evicting older events at capacity. Both windows can
therefore undercount when relevant events have already been evicted; after a
source restart they reflect only the retained events received since restart.
These are retained aggregate observations, not durable full traffic totals or
accepted PacketGarden specimen counts. Garden growth has its own validation,
mapping and placement/competition outcomes.

`hasSnapshot` means a valid source snapshot has been received, not that it is
fresh: startup is false; successful fetches set it true, including valid zero
activity; an outage retains the entire last valid state. Existing connection
status still reports browser SSE disconnection/reconnection. There is no new
freshness timer or browser polling. The default page updates both values from the
same weather SSE callback; manual diagnostic weather never supplies activity
statistics. Diagnostic controls/HUD and Canvas rendering remain unchanged.

Verification: `dotnet run --project tests/PacketGarden.Checks` checks weather
normalization/serialization alongside existing TCPNoise checks. After building,
`node tests/weather-sse.cjs --run bin/Debug/net10.0/PacketGarden.dll` runs an
isolated ASP.NET host against a local snapshot stub, exercising hourly-only
updates, startup, outage retention, reconnect and older-source recovery.
`node tests/pixi-default.cjs` covers DOM integration and particle reuse; the
optional Chrome test `node tests/pixi-default-browser.cjs --run` also checks
the real display/SSE updates and a 320px viewport (see PIXI-LIVE.md for runtime setup).

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

Those inspection fields do not change backend species/rarity, placement, grass,
weather, decay, or competition. An exact sanitized `seenCount === "1"` now also
triggers a browser-only curiosity attempt beside the exact successful specimen.
This leaves backend mapping and the SSE contract unchanged.

Remote IP addresses, remote source ports, packet contents, banners, credentials,
and unrelated collector fields are never forwarded.

One browser live handler validates and sanitizes each normalized garden frame,
attaches provenance to the exact newly spawned/replaced specimen before its first
render, and reports the growth outcome. Inspection no longer has a second SSE
listener that searches for a recent matching specimen.

Recent activity retains only the newest three normalized safe garden events in
browser memory, with received time and outcome. Rows show optional sensor, port,
species, optional exact count, and relative age; valid saturated events appear
with `no growth` even when no specimen was created. Simulated development events
are clearly labeled and invent no sensor, port, or count. The list uses the
existing garden update loop for ages, clears on reload, and has no expandable
history or persistence. It is ambient context, not a monitoring replacement; raw
frames, remote endpoints, and payloads are never retained in it.

Port hits use the [destination-port visual mapping](EVENT-MAPPINGS.md#tcpnoise-destination-port-mapping).
Ports 23/2323 now have an ordinary wirefern base, a compact terminal-like fern for
connections observed on those listeners. Ports 3389/5900 remain vines; no other
mapping changes. Wirefern does not establish Telnet negotiation, authentication,
credentials, payload/banner observation, or malicious intent. Normal rolls select
wirefern; existing weed and true-rare overrides and vigor thresholds are unchanged.
It has a six-minute ordinary lifecycle, normal one-cell clustering/competition,
and bounded vigor fullness. Persistent phosphor/moss/cyan/amber palettes and 1%
afterglow are browser cosmetics with no backend rarity or security meaning.
It draws on the base canvas without neighbor connectivity or per-RAF work;
generic inspection, Recent activity, and exact-count-one curiosity behavior apply.

TCPNoise port hits share placement, clustering, lifecycles, and occupancy with fake events, but
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
a successful redbloom gets a 5% browser-only roll scheduling a mutation of that
exact specimen after three seconds. It first appears normally, then becomes a
rooted collectible weed in the same cell. Its canonical type remains redbloom;
vigor, color, and provenance remain intact. At most three mutations are active;
cap-skipped attempts never retry. Expiry after 20 active seconds or collection
removes the specimen entirely. There is no secondary weed sprig.

This does not alter the TCPNoise mapping. The backend event is still redbloom.

Recent activity continues to describe the original redbloom event, with no extra
mutation/collection row. Collection says `You collected some weed. +0 points`;
the permanent static `Score: 0` has no scoring or persistence state. Ordinary
TCPNoise weeds are independent of this browser-only mutation. Vine/opium and
opium pod drops remain future work.

Successful live mushroom growth gets a separate 1% browser-only Amanita muscaria
drop roll using the exact authoritative spawned/replaced specimen. The candidate
activates after five seconds only if that same source still lives in the garden;
it never changes the source's type, color, vigor, cell, provenance, or lifecycle.
Active drops store only type, creation/expiry times, logical x/y, and phase in
`gardenState.drops`; pending attempts hold the exact source reference without
copying the event. The independent cap is three, checked at activation; due
attempts skipped at the cap are consumed without retry. Each drop lasts 20 active
seconds, consumes no specimen cell, and affects no grass or puddles. It shares
the dynamic overlay and existing logical tick, with no per-drop timer or base
invalidation. Hidden tabs paint nothing; resume processes current due attempts
once, bounded by the cap, without replaying missed frames. Expired sources cancel.
Clicks route curiosity, loose drop, mutation, inspection. Collection says
`You found Amanita muscaria. +0 points` with optional existing audio. Score stays 0;
no drop lifecycle action adds Recent activity, inventory, counters, or saved state.
Fake Gopher and dropped saturated events do not roll. Chance has no vigor,
rarity, sensor, weather, first-seen, or security meaning. Curiosity/mutation caps
and gnome ownership remain separate.

A second implemented use is an exact sanitized `seenCount === "1"` first-seen curiosity:

- only a successfully spawned/replaced live specimen can trigger it, using the
  authoritative result directly; dropped/fake events do not;
- at most three first-seen curiosities exist globally at once;
- when all slots are occupied, skip the new one without queue/catch-up;
- the curiosity does not consume a specimen cell or affect grass, rarity, vigor,
  competition, weather, or the source specimen;
- uniform selection chooses ladybug, snail, moth, or shiny pebble for 20 seconds;
- separate browser-memory state stores only type, lifetime, logical origin/position,
  and small movement parameters, with no raw event or endpoint fields;
- tiny deterministic movement/glints share the dynamic overlay, without invalidating
  cached ecology on animation frames or adding per-item timers;
- clicking collects before mutations/inspection, shows a type-specific `+0 points`
  message, and reuses optional quiet audio; static Score remains 0;
- curiosity spawn, collection, and expiry add no Recent activity entries;
- gnome actors and redbloom mutations have independent state and caps.

Missing/null counts, numeric 1, `"01"`, `"1.0"`, and `"1e0"` do not qualify; the
existing sanitizer does not convert them into the exact string `"1"`.

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
classifications. Port-22 redbloom means TCPNoise observed a connection to listening port
22, based solely on that port. It does not prove SSH negotiation, attempted
credentials, failed authentication, or malicious intent.

The aesthetic port-22 special case bypasses ordinary rarity to keep the signal
recognizable. Port 2222 has a redbloom base with normal rarity and does not trigger
the port-22 collectible mutation. Every valid port
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
weather has `level`/`eventsPerMinute`, optional `eventsLastHour`, and snapshot
availability (`hasSnapshot`); TCPNoise browser growth has
`specimenType`/`listenPort`/`vigor` plus optional `sensor`/`seenCount`, and fake
events still originate from local development controls.

Normalize and sanitize before sending data to the browser. Do not include
private/remote addresses, credentials, raw packets, payloads, banners, or
unnecessary endpoint details. The sensor label is provenance for a clicked
specimen, not a security identity or threat classification.

## Scope

Live aggregate weather, NATS-backed TCPNoise growth, event-driven weed/rare growth,
click inspection of live specimen provenance, Recent activity, delayed collectible
weed mutations, Amanita loose drops, bounded first-seen curiosities, temporary storm-water terrain,
and the static zero score are implemented.

Vine/opium, opium pods, rainbow leaves, crystal shards, ghost petals, gnome hats,
other collectibles, Stillbloom,
water/creature interactions, local-time lighting, persistence, other protocol/auth-aware adapters, and
richer specimen responses remain future work.

See [MVP](MVP.md) for completed and remaining capabilities and
[Event mappings](EVENT-MAPPINGS.md) for implemented/proposed effects.
