# Initial Event Mappings

These mappings are intentionally playful and provisional. The goal is to create visually distinct behavior, not to encode a perfect taxonomy of network traffic.

The five mappings listed in the prototype subset below are implemented with fake
events. TCPNoise port hits grow base visual families, weeds, and rare variants
through NATS/SSE. Other organism effects in this table are proposals. Manual weather and live
aggregate weather from Noise Observatory share the visual renderer without
affecting ecology.

| Event | Garden effect | Notes |
| --- | --- | --- |
| DNS request | Small clustered flowers | Common, quick, numerous growth. |
| HTTP request | Broad-leaf plant | Ordinary web traffic should look healthy and common. |
| HTTPS request | Flowering broad-leaf plant | Similar family to HTTP, with a slightly more elaborate appearance. |
| Genuine SSH connection telemetry | Thorny vine | Protocol-aware evidence of a connection; a port probe alone is insufficient. |
| TCPNoise connection / port hit | Port 22 always redbloom; other ports use base families with a chance of weed or rare growth | Artistic mapping, without claiming protocol or authentication semantics. |
| Gopher request | Mushroom | A little old-network fungus patch. |
| Gemini request | Crystal-like fungus | More luminous / geometric than Gopher mushrooms. |
| Port 22 probe / hit | Red bloom that quickly wilts | Based solely on a connection to listening port 22; bypasses ordinary rarity. |
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

TCPNoise listening ports select plant visuals deliberately. A redbloom means
TCPNoise observed a connection to listening port 22. This aesthetic signal bypasses
ordinary rarity, regardless of IPv6 or sensor traits. It does not prove SSH
negotiation, attempted credentials, failed authentication, or malicious intent.
Port 2222 still has a vine base and participates normally in rarity.
Every valid hit produces one garden growth event, including unknown
ports. Weeds and rare variants are artistic outcomes, not classifications of
scanners, malicious traffic, protocols, or sensor classes.

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

Port 22 is an explicit signal; the other base mappings apply before the rarity roll:

| Listening ports | Visual specimen |
| --- | --- |
| 22 | redbloom (always; bypasses rarity) |
| 80, 443, 445, 8080, 8443 | broadleaf |
| 2222, 23, 2323, 3389, 5900 | vine |
| 21, 70 | mushroom |
| 25, 53, 420, 42069, 5432, 6379, 9200 | flower |
| Any other valid port (1–65535) | flower |

53 and 70 are supported future ports even though the current fleet does not
normally expose them. The planning inventory is in [Real data](REAL-DATA.md#tcpnoise-fleet-planning-inventory).
The narrower mushroom set keeps noisy scan ports in ordinary background vegetation;
mushrooms remain a normal base species. These are aesthetic choices, not claims
about application protocol use.

## TCPNoise rarity

Port 22 always resolves to redbloom before ordinary rarity. For every other accepted
connection, the backend rolls once. Known non-22 ports start at **98% normal,
1.5% weed, 0.5% rare**; fallback ports start at **94% flower, 4% weed, 2% rare**.
Add these percentage points to the weed and rare chances, subtracting their sum
from normal growth:

| Coarse trait | Weed bonus | Rare bonus |
| --- | --- | --- |
| Numeric integer `ipVersion == 6` | +0.5 | +0.5 |
| Sensor ends in `-dn42` | +0.5 | +0.5 |
| Sensor ends in `-ygg` | +1.0 | +1.0 |

Suffix matching is ordinal, case-insensitive, and does not trim names. IPv6 stacks
with either suffix; suffixes cannot both match. The strongest combination is a
fallback port with IPv6 and `-ygg`: **91% flower, 5.5% weed, 3.5% rare**.
IPv4 adds nothing. Missing/unusable optional traits add nothing and do not reject
an otherwise valid connection. IPv6 / DN42 / Ygg are visual modifiers, never
security classifications or evidence of a particular protocol.

A uniform integer roll 0–9999 uses normal first, then weed, then rare, with each
upper boundary exclusive. A separate uniform choice 0–2 selects `ghostbloom`,
`crystalfungus`, or `blackthorn` equally. Port 22 cannot become a weed or rare variant.
Weeds are angular ochre/yellow-green; ghostblooms pale blue-white with a soft halo;
crystal fungi cyan/violet facets; blackthorns dark purple with contrasting thorns.
Their lifetimes are 6, 6, 7, and 12 minutes respectively (stages in the README).

All rarity is event-driven and resolved before SSE. The browser receives only
`specimenType`, `listenPort`, and coarse `vigor`, never sensor names or IP details, and uses shared
placement/lifecycles without direct grass influence. Richer competition and mutations
of existing specimens remain future ecology work.

## TCPNoise vigor

After species/rarity selection, the backend independently maps optional `seenCount`
to vigor: **0** for counts 0–1 or missing/unusable values, **1** for 2–3, **2** for
4–9, and **3** for usable integers 10 or more. Exact repeat counts stay server-side.
Vigor is artistic recurrence, not a threat score, and never influences rarity or
species selection (including the unconditional port-22 redbloom).

Higher vigor adds fuller petals/leaves, broader mushroom caps and spots, stronger
vine stems/leaves/thorns, redbloom spikes, weed branches, ghostbloom fullness/halo,
crystal facets, and blackthorn branches/thorns within roughly the same cell.
The plum broadleaf palette stays intact. Vigor is fixed at spawn; fake controls
use 0. Lifetimes, free-cell placement/clustering, grass, and weather do not depend on vigor.

Only at full 640-cell occupancy, coarse artistic recurrence also supplies a
bounded competitive strength. After normal expiry, incoming vigor must exceed an
unprotected occupant's vigor. Among eligible occupants, replace the oldest in the
lowest vigor tier and reuse its cell with a fresh timestamp; exact ties retain
array order. Ghostbloom, crystal fungus, and blackthorn are protected from forced
displacement, while weed and redbloom are eligible. Incoming rare specimens use
the same gate, and equal vigor never replaces. Natural expiry remains the usual
source of space; this replacement rule exists only because the garden is bounded.
Successful replacement uses shared growth sound/cooldowns; a dropped event is
silent. Real TCPNoise replacement never seeds or refreshes grass.

## First prototype subset

The current prototype implements:

1. DNS -> flowers
2. HTTP -> broad-leaf plant
3. SSH -> thorny vine
4. Gopher -> mushroom
5. port 22 probe (`port22-probe`) -> red bloom / wilt

Manual controls and weighted automatic fake traffic feed these five types into
the same handler. Keep this subset while developing the next real-data phase.
