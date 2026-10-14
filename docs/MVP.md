# PacketGarden MVP

## Goal

Build the smallest browser prototype that proves the core idea:

> Network-shaped events visibly grow and reshape a top-down garden that is interesting to watch.

The current prototype supports both fake events and the first real TCPNoise feed.
Persistence and additional sensor/service inputs remain goals, with the existing
browser garden as the starting point.

## Completed prototype capabilities

- ASP.NET Core / .NET host serving HTML, CSS, and vanilla JavaScript.
- Canvas garden with a fixed 32×20 square grid, subtle soil seams, and the whole area visible when resized.
- All five development mappings: DNS flowers, HTTP broad-leaf plants, SSH thorny vines, Gopher mushrooms, and port-22-probe red blooms.
- Simple procedural art, including visual connections between neighboring vine cells.
- Manual event controls and start/stop automatic weighted fake traffic with randomized delays.
- Manual weather levels and an Events/min intensity preview, rendered separately from ecology with no effects on specimens or grass.
- Live aggregate weather from Noise Observatory through backend polling and SSE, sharing the manual renderer.
- Stronger severe visual weather with wind-driven hurricane rain; no lightning, flashing, or ecological damage.
- Optional browser-local Web Audio growth sounds, Off by default at 12% volume, initialized by the user's enable gesture. Species tones and gentle rare chimes represent artistic garden traits, not security alerts; independent 400 ms ordinary / 900 ms rare cooldowns drop extra sounds without delaying growth. No weather ambience or saved sound preferences.
- NATS-backed TCPNoise connection input, validated and resolved server-side from listening port to sanitized specimen growth on the same SSE stream.
- Redbloom is an aesthetic signal that TCPNoise observed a connection to listening port 22. It does not prove SSH negotiation, attempted credentials, failed authentication, or malicious intent. Port 22 bypasses ordinary rarity; 2222 retains normal vine/rarity behavior. The fake `port22-probe` control previews the same redbloom without grass influence.
- Event-driven artistic TCPNoise rarity: weeds, pale ghostblooms, cyan/violet crystal fungi, and dark blackthorns, lasting 6, 6, 7, and 12 minutes. IPv6 / DN42 / Ygg and fallback ports modify visual odds, never security classifications. See the [probability policy](EVENT-MAPPINGS.md#tcpnoise-rarity).
- Optional TCPNoise `seenCount` converted server-side to coarse vigor (0–1/missing/unusable -> 0, 2–3 -> 1, 4–9 -> 2, usable counts 10+ -> 3). This artistic recurrence trait affects visual fullness and saturation-only competitive strength, independently of species/rarity, and is not a threat score. Exact counts are never sent to the browser.
- Rebalanced aesthetic base ports: mushrooms only for 21/70, broadleaf for 445 alongside existing broadleaf ports, and flowers for 5432/6379/9200 alongside existing flower ports. Known/fallback rarity odds are unchanged.
- Shared specimen placement path for fake events and normalized real growth.
- Cluster-first placement: usually an empty touching cell near the same species, occasionally a cell two steps away, with an empty-cell fallback.
- Shared occupancy of one specimen per cell across all species.
- Full-grid competition: strictly stronger incoming vigor replaces the oldest occupant in the lowest eligible vigor tier, reusing its exact cell. Ghostbloom, crystal fungus, and blackthorn are protected from forced replacement; weed/redbloom are eligible. Incoming rare growth uses the same vigor gate, and equal vigor cannot churn the grid. A concise full-garden status clears after natural expiry opens space.
- Separate fast-growing grass beneath specimens, seeded/refreshed by successful fake DNS/HTTP spawns. Mature healthy turf spreads locally with a bounded number of population-scaled attempts; fading turf also gets one bounded final seed opportunity per influence cycle. Grass never blocks cells or contributes to specimen counts.
- Elapsed-time lifecycles with growth, maturity, wilting/fading/drying, and removal. Red blooms appear immediately and have only a fresh and wilting stage.
- Lifecycle timings tuned for several minutes of visual history: flowers last 4 minutes, mushrooms 5, broad-leaf plants 6, vines 10, and red blooms 30 seconds.
- A 250 ms update/redraw loop that removes expired specimens and frees their cells. Resizing preserves state.
- A separate browser-only ambient actor layer and The Gnome Incident: at least 30 living specimens, one 2% check every 45 seconds, no catch-up rolls, and at most one 12-second red/green gnome dispute. Actors approach, shove, retreat/celebrate, then disappear without affecting occupancy, plants, grass, or weather. Tiny optional cues share existing sound controls; reload clears the nonsense.

Fake events are `{ type }`; live TCPNoise browser growth is
`{ specimenType, listenPort, vigor }` after backend validation, mapping, and rarity,
plus independent vigor derivation. The browser requires integer vigor 0–3.
The browser receives no sensor names or IP details and makes no rarity decisions.
Every weed/rare spawn requires an accepted TCPNoise event, with no direct grass
influence or timer-driven mutation. Specimens
hold `type`, `column`, `row`, `createdAt`, and stable `vigor` (fake paths default to 0).
Vigor does not alter lifetimes, growth speed, free-cell clustering, grass, or weather.
Its ecological effect is limited to replacement at saturation. State is browser memory only;
reloading clears it. Detailed lifecycle thresholds and fake-traffic defaults are
in the [README](../README.md).
Grass cells separately hold `column`, `row`, `createdAt`, and `lastInfluencedAt`.
They expand automatically from sparse seeds to mature turf over 30 seconds.
Healthy mature coverage receives 1–4 spread attempts every 4 seconds depending
on population, with a 50% success chance per attempt. On entering fading, turf
gets one 40% final seed opportunity per influence cycle; at most six newly-fading
cells are checked per spread tick to smooth synchronized aging. Natural spread
creates a new generation without refreshing the parent. Without refresh, turf
fades after 20 minutes, gradually yellows/browns and thins, and expires after
35 minutes. Re-influence revives the existing cell, refreshes its lifetime, and
allows a later fade cycle to earn another final seed opportunity.

## Remaining MVP work

- Click/hover inspection and safe information about the event behind a specimen.
- Gradual lighting based on the viewer's real local time, with a readable night garden.
- Deliberately simple persistence across browser/server restarts.
- Richer ecological competition beyond the bounded saturation-only replacement rule, without health bars or management mechanics.
- Event effects that strengthen, bloom, spread, mutate, or influence existing growth when new placement is unsuitable.
- Additional sensor/service adapters beyond the implemented TCPNoise path.
- Additional environmental/ecological responses to aggregate pressure beyond the existing visual weather layer.

These capabilities are not implemented. The current placement path creates one
specimen per accepted fake event or normalized TCPNoise growth when an empty cell
exists, or replaces one eligible weaker occupant at saturation. Dropped saturated
events are silent; successful replacements use shared growth sound/cooldowns.
Natural expiry remains the normal way space opens in this bounded garden.
Fake DNS/HTTP events can refresh
grass, but real TCPNoise growth does not directly affect grass. The prototype does
not strengthen or mutate existing main specimens; competition is limited to
deterministic full-grid displacement.

## Presentation and shared ecosystem

Keep the top-down bounded garden visible as a whole. Procedural shapes establish
the prototype; painted/cartoon art, gradual lighting, and stranger mutations
remain visual goals.

All sources should contribute to one ecosystem, with no host-specific plots.
Event type determines the main effect. Coarse TCPNoise traits now affect visual
rarity server-side, without turning the garden into a dashboard.

## Real-data direction

The next integration phase is documented in [Real data](REAL-DATA.md):

```text
sensors/services -> NATS -> backend adapters
    -> normalized garden events/environmental state -> SSE -> browser garden
```

SSE carries live aggregate weather and normalized TCPNoise growth. The browser
must not connect directly to NATS or map raw TCPNoise listening ports. Port-to-plant
mappings are aesthetic and do not claim protocol/authentication semantics;
aggregate volume remains separate weather input.

Normalized data may include event type, source/sensor, network class (`public`,
`dn42`, `ygg`), timestamp, intensity, duration, and sanitized tags. Add fields only
when they serve an actual garden effect. Fake and real discrete events should
share ecological handling where appropriate without inheriting false semantics.

## Event pressure and timing

High volume should not require one new permanent specimen per event. Repeated
events may eventually strengthen, spread, bloom, mutate, or otherwise influence
existing growth. Aggregate/background activity may instead become drizzle,
rain, or heavy rain through the existing weather path. Richer specimen responses
remain planned; the current path spawns one specimen when space is available or
uses bounded vigor competition at saturation.

An active viewing session should show meaningful change over roughly 30 minutes.
The tuned prototype lifetimes retain recent visual history; longer-lived terrain
and rare growth lasting hours or days remain future work. Quiet traffic should
mean quieter activity, while lighting follows local time independently.

## Not MVP

- Raw packet capture or direct browser-to-NATS connectivity.
- Accounts/authentication or multiplayer/shared-user gardens.
- Game economy, scoring, achievements, or gardening controls.
- Complex procedural ecology or a giant scrollable map.
- Perfect botanical art or long-term terrain simulation.

## Success criteria

The prototype succeeds if active event input makes the garden interesting enough
to leave running and watch for roughly half an hour. Connecting real data should
build on that experience, not substitute for it.
