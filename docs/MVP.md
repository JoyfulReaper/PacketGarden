# PacketGarden MVP

## Goal

Build the smallest browser prototype that proves the core idea:

> Network-shaped events visibly grow and reshape a top-down garden that is interesting to watch.

The current prototype uses fake events. Persistence and a real sensor feed remain
goals, with the existing browser garden as the starting point.

## Completed prototype capabilities

- ASP.NET Core / .NET host serving HTML, CSS, and vanilla JavaScript.
- Canvas garden with a fixed 32×20 square grid, subtle soil seams, and the whole area visible when resized.
- All five initial mappings: DNS flowers, HTTP broad-leaf plants, SSH thorny vines, Gopher mushrooms, and failed-authentication red blooms.
- Simple procedural art, including visual connections between neighboring vine cells.
- Manual event controls and start/stop automatic weighted fake traffic with randomized delays.
- One normalized browser event path: `GardenEvent -> handler -> specimen state -> update -> renderer`.
- Cluster-first placement: usually an empty touching cell near the same species, occasionally a cell two steps away, with an empty-cell fallback.
- Shared occupancy of one specimen per cell across all species.
- Elapsed-time lifecycles with growth, maturity, wilting/fading/drying, and removal. Red blooms appear immediately and have only a fresh and wilting stage.
- Lifecycle timings tuned for several minutes of visual history: flowers last 4 minutes, mushrooms 5, broad-leaf plants 6, vines 10, and red blooms 30 seconds.
- A 250 ms update/redraw loop that removes expired specimens and frees their cells. Resizing preserves state.

The current event is only `{ type }`. Specimens hold `type`, `column`, `row`, and
`createdAt`. State is browser memory only; reloading clears it. Detailed
lifecycle thresholds and fake-traffic defaults are in the [README](../README.md).

## Remaining MVP work

- Click/hover inspection and safe information about the event behind a specimen.
- Gradual lighting based on the viewer's real local time, with a readable night garden.
- Deliberately simple persistence across browser/server restarts.
- Light ecological competition, without health bars or management mechanics.
- Event effects that strengthen, bloom, spread, mutate, or influence existing growth when new placement is unsuitable.
- Real sensor/service input through NATS, backend normalization, and SSE delivery.
- Aggregate activity pressure driving weather/environment, rather than treating every traffic sample as a specimen spawn.

These capabilities are not implemented. The current handler creates one specimen
per accepted fake event when an empty cell exists and does nothing when the grid
is full. It does not strengthen existing growth, mutate it, or model competition.

## Presentation and shared ecosystem

Keep the top-down bounded garden visible as a whole. Procedural shapes establish
the prototype; painted/cartoon art, gradual lighting, and stranger mutations
remain visual goals.

All sources should contribute to one ecosystem, with no host-specific plots.
Event type determines the main effect. Safe source traits may eventually affect
visual variation, without turning the garden into a dashboard.

## Real-data direction

The next integration phase is documented in [Real data](REAL-DATA.md):

```text
sensors/services -> NATS -> backend adapters
    -> normalized garden events/environmental state -> SSE -> browser garden
```

SSE is the planned initial transport, not an existing feature. The browser must
not connect directly to NATS. Backend adapters should distinguish genuine
protocol/authentication telemetry from probes and aggregate volume.

Normalized data may include event type, source/sensor, network class (`public`,
`dn42`, `ygg`), timestamp, intensity, duration, and sanitized tags. Add fields only
when they serve an actual garden effect. Fake and real discrete events should
use the same handling path.

## Event pressure and timing

High volume should not require one new permanent specimen per event. Repeated
events may eventually strengthen, spread, bloom, mutate, or otherwise influence
existing growth. Aggregate/background activity may instead become drizzle,
rain, or heavy rain. Those responses are planned, not part of the current handler.

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
