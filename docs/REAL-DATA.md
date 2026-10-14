# PacketGarden Real Data

## Next integration phase

The browser prototype already has five event mappings, clustered placement,
species lifecycles, and weighted fake traffic. The backend currently serves static
files. Manual browser weather is a visual preview only. Real sensor ingestion,
NATS adapters, SSE, and aggregate environmental weather input are not implemented.

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

SSE is the current design choice for the initial backend-to-browser transport.
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
ease when that pressure subsides; thresholds and smoothing still need to be
chosen. Traffic quietness does not determine local-time lighting.

High volume should not necessarily create one new permanent specimen per event.
Repeated events may strengthen, spread, bloom, mutate, or otherwise influence
existing growth. The current prototype only spawns into empty cells; these richer
responses and environmental effects remain work to implement.

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

This is a direction for adapters, not a finalized schema. The current browser
`GardenEvent` contains only `type`; add fields as concrete effects need them.
Normalize and sanitize before sending data to the browser. Do not include private
addresses, credentials, raw packets, payloads, or unnecessary infrastructure
details. Network class describes coarse context without exposing endpoints or
splitting the shared garden into network-specific plots.

## Scope

Begin with a small adapter path and SSE delivery of supported discrete events.
Add aggregate environmental state deliberately when its browser effect exists.
Inspection, local-time lighting, persistence, and ecological competition remain
separate unfinished MVP work; this plan does not imply they are implemented.

See [MVP](MVP.md) for completed and remaining capabilities and
[Event mappings](EVENT-MAPPINGS.md) for proposed effects.
