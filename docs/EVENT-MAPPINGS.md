# Initial Event Mappings

These mappings are intentionally playful and provisional. The goal is to create visually distinct behavior, not to encode a perfect taxonomy of network traffic.

The five mappings listed in the prototype subset below are implemented with fake
events. Other effects in this table are proposals; real telemetry adapters,
aggregate weather input, weeds, and mutations are not implemented. Manual weather
controls preview rainfall without consuming telemetry or affecting ecology.

| Event | Garden effect | Notes |
| --- | --- | --- |
| DNS request | Small clustered flowers | Common, quick, numerous growth. |
| HTTP request | Broad-leaf plant | Ordinary web traffic should look healthy and common. |
| HTTPS request | Flowering broad-leaf plant | Similar family to HTTP, with a slightly more elaborate appearance. |
| Genuine SSH connection telemetry | Thorny vine | Protocol-aware evidence of a connection; a port probe alone is insufficient. |
| Gopher request | Mushroom | A little old-network fungus patch. |
| Gemini request | Crystal-like fungus | More luminous / geometric than Gopher mushrooms. |
| Failed authentication telemetry | Red bloom that quickly wilts | Requires appropriate authentication telemetry, not an inferred failure from a probe. |
| Long-lived connection | Slow-growing tree | Duration can affect trunk/ring/branch growth. |
| Traffic burst | Rain / pollen / wind event | Environmental effect rather than another permanent plant. |
| Aggregate/background traffic volume | Drizzle / rain / heavy rain | Activity pressure over a time window, rather than one specimen per traffic sample. |
| Port scan / noisy probing | Weeds / invasive growth | Probe evidence may influence an invasive patch; competition remains planned. |
| Unusual port activity | Mutation influence | May alter existing growth when unusual relative to the observed traffic. |
| Service recovery | New green shoot / bloom | Positive counterpart to failure events. |
| Service failure | Darkened or drooping plant | Should be noticeable but not turn the whole app into an incident dashboard. |
| Quiet period | Stillness / easing weather | Activity can settle as volume drops; night lighting follows local time independently. |

## Mapping principles

- Common events should create small/common growth so they do not immediately overwhelm the garden.
- Rare events can produce larger or stranger specimens.
- Severity or intensity can affect size, mutation chance, animation, or lifespan.
- Duration can affect growth over time rather than only spawn size.
- Environmental effects are useful for bursty events that should not create hundreds of permanent objects.
- Repeated events may strengthen, spread, bloom, mutate, or otherwise influence existing growth instead of creating a new permanent specimen every time.
- Similar protocols can share a visual family while still remaining recognizable.

## Interpreting real telemetry

Classify observations by what the sensor actually knows. TCPNoise probes against
ports such as 22/2222 are probe/noise events and must not automatically become
genuine SSH connections or failed-authentication events. Genuine SSH telemetry
can still grow thorny vines; failed authentication should come from appropriate
auth telemetry. Port numbers alone do not establish either meaning.

Discrete events can influence specimens. Aggregate activity pressure can drive
weather/environment, with volume summarized over time rather than expanded into
one spawn per sample. See [Real data](REAL-DATA.md) for the intended NATS adapter
and SSE path. These are current design choices, not implemented integrations.

## First prototype subset

The current prototype implements:

1. DNS -> flowers
2. HTTP -> broad-leaf plant
3. SSH -> thorny vine
4. Gopher -> mushroom
5. failed authentication -> red bloom / wilt

Manual controls and weighted automatic fake traffic feed these five types into
the same handler. Keep this subset while developing the next real-data phase.
