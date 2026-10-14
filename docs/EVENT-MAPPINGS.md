# Initial Event Mappings

These mappings are intentionally playful and provisional. The goal is to create visually distinct behavior, not to encode a perfect taxonomy of network traffic.

The five mappings listed in the prototype subset below are implemented with fake
events. TCPNoise port hits now also grow these visual families through NATS/SSE.
Other organism effects in this table are proposals; weeds and mutations are not implemented. Manual weather and live
aggregate weather from Noise Observatory share the visual renderer without
affecting ecology.

| Event | Garden effect | Notes |
| --- | --- | --- |
| DNS request | Small clustered flowers | Common, quick, numerous growth. |
| HTTP request | Broad-leaf plant | Ordinary web traffic should look healthy and common. |
| HTTPS request | Flowering broad-leaf plant | Similar family to HTTP, with a slightly more elaborate appearance. |
| Genuine SSH connection telemetry | Thorny vine | Protocol-aware evidence of a connection; a port probe alone is insufficient. |
| TCPNoise connection / port hit | Existing plant family by destination port | Artistic mapping, without claiming protocol or authentication semantics. |
| Gopher request | Mushroom | A little old-network fungus patch. |
| Gemini request | Crystal-like fungus | More luminous / geometric than Gopher mushrooms. |
| Failed authentication telemetry | Red bloom that quickly wilts | Requires appropriate authentication telemetry, not an inferred failure from a probe. |
| Long-lived connection | Slow-growing tree | Duration can affect trunk/ring/branch growth. |
| Traffic burst | Rain / pollen / wind event | Environmental effect rather than another permanent plant. |
| Aggregate/background traffic volume | Drizzle / rain / heavy rain | Activity pressure over a time window, rather than one specimen per traffic sample. |
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

TCPNoise listening ports select plant visuals deliberately. Ports 22/2222 can
produce vines as an artistic mapping without claiming a genuine SSH session.
Port numbers do not establish protocol or authentication semantics. Actual
failed authentication still requires auth-aware telemetry; no port hit creates
a red bloom. Every valid hit produces one garden growth event, including unknown
ports. There is no separate TCPNoise weeds/invasive category in this slice.

The PacketGarden backend resolves TCPNoise ports to specimen types before sending
the growth event to the browser. Real TCPNoise growth shares specimen placement,
clustering, lifecycles, and rendering with fake events, but does not directly seed
or refresh grass. The existing grass trigger remains specific to fake DNS and HTTP
events.

Discrete events can influence specimens. Aggregate activity pressure can drive
weather/environment, with volume summarized over time rather than expanded into
one spawn per sample. See [Real data](REAL-DATA.md) for the NATS adapter and SSE
path. Individual TCPNoise hits grow plants through NATS/SSE; aggregate rate
continues controlling weather separately through Noise Observatory.

## TCPNoise destination-port mapping

| Listening ports | Visual specimen |
| --- | --- |
| 80, 443, 8080, 8443 | broadleaf |
| 22, 2222, 23, 2323, 3389, 5900 | vine |
| 21, 445, 5432, 6379, 9200, 70 | mushroom |
| 25, 420, 42069, 53 | flower |
| Any other valid port (1–65535) | flower |

53 and 70 are supported future ports even though the current fleet does not
normally expose them. The planning inventory is in [Real data](REAL-DATA.md#tcpnoise-fleet-planning-inventory).

## First prototype subset

The current prototype implements:

1. DNS -> flowers
2. HTTP -> broad-leaf plant
3. SSH -> thorny vine
4. Gopher -> mushroom
5. failed authentication -> red bloom / wilt

Manual controls and weighted automatic fake traffic feed these five types into
the same handler. Keep this subset while developing the next real-data phase.
