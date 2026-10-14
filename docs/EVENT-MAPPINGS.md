# Initial Event Mappings

These mappings are intentionally playful and provisional. The goal is to create
visually distinct behavior, not to encode a perfect taxonomy of network traffic.

The five mappings listed in the prototype subset below are implemented with fake
events. TCPNoise port hits grow base visual families, weeds, and rare species
through NATS/SSE. Other organism effects in this table are proposals. Manual
weather and live aggregate weather from Noise Observatory share the visual renderer
without affecting ecology.

| Event | Garden effect | Notes |
| --- | --- | --- |
| DNS request | Small clustered flowers | Common, quick, numerous growth. |
| HTTP request | Broad-leaf plant | Ordinary web traffic should look healthy and common. |
| HTTPS request | Flowering broad-leaf plant | Similar family to HTTP, with a slightly more elaborate appearance. |
| Genuine SSH connection telemetry | Thorny vine | Protocol-aware evidence of a connection; a port probe alone is insufficient. |
| TCPNoise connection / port hit | Port 22 always redbloom; other ports use base families with a chance of weed or rare growth | Artistic mapping, without claiming protocol or authentication semantics. |
| Exact valid TCPNoise `seenCount == 1` | Proposed short-lived first-seen curiosity | Browser-only critter/object near the successful source specimen, globally capped and not proof of global uniqueness. |
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
- Intensity can affect size, visual detail, animation, or lifespan when the source data honestly supports such a trait.
- Duration can affect growth over time rather than only spawn size.
- Environmental effects are useful for bursty events that should not create hundreds of permanent objects.
- Repeated events may strengthen, spread, bloom, mutate, or otherwise influence existing growth instead of creating a new permanent specimen every time.
- Similar protocols can share a visual family while still remaining recognizable.
- Cosmetic variation is not automatically a security or rarity classification.
- Transient curiosities and collectibles may use safe already-forwarded metadata, but must not imply stronger semantics than the source field actually has.

## Interpreting real telemetry

TCPNoise listening ports select plant visuals deliberately. A port-22 redbloom means
TCPNoise observed a connection to listening port 22. This aesthetic signal bypasses
ordinary rarity, regardless of IPv6 or sensor traits. It does not prove SSH
negotiation, attempted credentials, failed authentication, or malicious intent.
Port 2222 has a redbloom base and participates normally in rarity, without the
port-22 collectible mutation.

Every valid hit produces one garden growth event, including unknown ports. Weeds
and rare species are artistic outcomes, not classifications of scanners, malicious
traffic, protocols, or sensor classes.

The PacketGarden backend resolves TCPNoise ports to specimen types before sending
the growth event to the browser. Real TCPNoise growth shares specimen placement,
clustering, lifecycles, rendering, color variation, sound, and inspection with fake
events where appropriate, but it does not directly seed or refresh grass. The
existing grass trigger remains specific to fake DNS and HTTP events.

Discrete events can influence specimens. Aggregate activity pressure can drive
weather/environment, with volume summarized over time rather than expanded into
one spawn per sample. See [Real data](REAL-DATA.md) for the NATS adapter and SSE
path.

## TCPNoise destination-port mapping

Port 22 is an explicit visual signal; the other base mappings apply before the
rarity roll:

| Listening ports | Visual specimen |
| --- | --- |
| 22 | redbloom (always; bypasses rarity) |
| 2222 | redbloom (base; normal rarity) |
| 80, 443, 445, 8080, 8443 | broadleaf |
| 23, 2323 | wirefern |
| 3389, 5900 | vine |
| 21, 70 | mushroom |
| 25, 53, 420, 42069, 5432, 6379, 9200 | flower |
| Any other valid port (1–65535) | flower |

53 and 70 are supported future ports even though the current fleet does not
normally expose them. The planning inventory is in
[Real data](REAL-DATA.md#tcpnoise-fleet-planning-inventory).

The narrower mushroom set keeps noisy scan ports in ordinary background
vegetation; mushrooms remain a normal base species. These are aesthetic choices,
not claims about application protocol use.

Wirefern is a compact terminal-like fern for observed connections to listening
port 23 or 2323. It does not prove Telnet negotiation, credentials, authentication,
payload/banner content, or malicious intent. It is an ordinary species: normal
rolls select wirefern, while existing weed/true-rare overrides apply unchanged.
It occupies one cell, clusters normally, and has no vine neighbor connections.
Growing starts at 18 seconds, maturity at 50 seconds, fading at five minutes,
and removal at six minutes. Bounded vigor detail adds fronds, small side branches,
terminal tips, and stem thickness; recurrence/fullness is not threat.
The ordinary base-canvas renderer updates through slow ecology aging, with no
wirefern RAF or overlay animation. Real growth never directly seeds grass.

## TCPNoise rarity

Port 22 always resolves to redbloom before ordinary rarity. For every other
accepted connection, the backend rolls once. Known non-22 ports start at **98%
normal, 1.5% weed, 0.5% rare**; fallback ports start at **94% flower, 4% weed, 2%
rare**.

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
`crystalfungus`, or `blackthorn` equally. Port 22 cannot become a weed or rare
species in backend rarity selection.

Weeds are angular yellow-green; ghostblooms are pale luminous flowers; crystal
fungi use faceted crystalline shapes; blackthorns are dark thorny growth. Their
lifetimes are 6, 6, 7, and 12 minutes respectively (stages in the README).

All backend rarity is event-driven and resolved before SSE. The browser does not
reroll species rarity. Browser-only collectible mutation is a separate presentation
concept and does not change this policy.

## TCPNoise vigor

After species/rarity selection, the backend independently maps optional
`seenCount` to vigor: **0** for counts 0–1 or missing/unusable values, **1** for
2–3, **2** for 4–9, and **3** for usable integers 10 or more.

Vigor is artistic recurrence, not a threat score, and never influences rarity or
species selection (including the unconditional port-22 redbloom).

Higher vigor adds bounded species-specific fullness/detail such as extra petals,
leaves, mushroom cap detail, vine structure, redbloom spikes, weed branches,
ghostbloom fullness, crystal facets, or blackthorn structure. Vigor is fixed at
spawn; fake controls use 0. Lifetimes, free-cell placement/clustering, grass, and
weather do not depend on vigor.

Only at full 640-cell occupancy, coarse artistic recurrence also supplies bounded
competitive strength. After normal expiry, incoming vigor must exceed an
unprotected occupant's vigor. Among eligible occupants, replace the oldest in the
lowest vigor tier and reuse its cell with a fresh timestamp. Ghostbloom, crystal
fungus, and blackthorn are protected from forced displacement, while weed and
redbloom are eligible. Incoming rare specimens use the same gate, and equal vigor
never replaces.

Natural expiry remains the usual source of space; this replacement rule exists
only because the garden is bounded. Successful replacement uses shared growth
sound/cooldowns; a dropped event is silent. Real TCPNoise replacement never seeds
or refreshes grass.

## Inspection provenance

Click inspection deliberately carries a small amount of source provenance beyond
what the renderer itself needs.

For a valid live TCPNoise specimen, browser-facing growth may include:

```text
specimenType
listenPort
vigor
sensor?      # bounded to 128 characters
seenCount?   # exact valid UInt64 represented as decimal text
```

The exact count is text so JavaScript cannot round values above its safe integer
range. Sensor and count are display-only metadata: they do not alter backend rarity,
species selection, placement, competition, grass, weather, or lifetime.

Remote IP addresses, remote source ports, credentials, banners, raw packets, and
payloads are not forwarded. Fake-development specimens are explicitly labeled as
simulated rather than receiving invented provenance.

## First-seen curiosity proposal

The exact decimal-string `seenCount` makes a small browser-only first-seen effect
possible without expanding the SSE contract.

Proposed rule:

```text
seenCount == "1" -> may create one transient curiosity near the successfully spawned specimen
```

Important boundaries:

- `"1"` means only that the source supplied an exact valid count of one;
- PacketGarden should not call it globally first-ever across sensors or history;
- missing, invalid, or unusable counts do not qualify;
- at most three first-seen curiosities should exist globally at one time;
- when the cap is full, skip the new curiosity with no queue or catch-up;
- curiosities do not consume specimen cells or affect grass, vigor, rarity,
  competition, weather, or the source specimen;
- they should last only tens of seconds and may be collectable for `+0 points`.

Candidate curiosities include a ladybug, snail, moth, shiny pebble, odd seed, or
worthless coin-shaped object. Species may bias the pool for visual flavor.

## Port-22 collectible behavior

The current implementation keeps the backend mapping unchanged and, after
successful live port-22 redbloom growth, performs a separate 5% browser-only roll
that schedules a collectible weed mutation on that exact specimen.

The initial normal redbloom stays visible for three seconds before mutation. The
same cell, canonical redbloom type, vigor, color, and safe provenance are retained.
At most three collectible mutations are active; attempts skipped at the cap never
retry. The 20-second interaction window ends with removal of the specimen, as does
collection. No secondary weed sprig is produced. Ordinary weeds remain separate.

This does not mean port 22 becomes a backend weed mapping. The backend remains:

```text
port 22 -> redbloom, always, rarity bypassed
```

Collecting the mutated weed is optional and useless. The implemented UI gag is a
permanent `Score: 0` plus messages such as `You collected some weed. +0 points`.
The score must never accumulate or unlock anything.

## Cosmetic color variation

Color variation is separate from TCPNoise backend rarity.

For live growth, common color schemes follow vigor 0–3 except for vine hue. Fake controls have no real
recurrence signal, so they vary across the same common schemes. Each specimen also
gets a **1% browser-only rare cosmetic roll** when its color variant is chosen.
That choice persists for the specimen's lifetime and is not rerolled while
drawing.

Current broadleaf common schemes are:

| Vigor | Broadleaf scheme |
| --- | --- |
| 0 | plum |
| 1 | teal |
| 2 | amber |
| 3 | rose |

Broadleaf's rare cosmetic scheme is **rainbow**, coloring individual leaves rather
than simply filtering the whole specimen.

Other species use four common palettes plus one rare cosmetic scheme:

| Species | Rare cosmetic scheme |
| --- | --- |
| Flower | moonflower |
| Mushroom | bioluminescent |
| Vine | silvervine |
| Wirefern | afterglow |
| Redbloom | solar |
| Weed | toxic |
| Ghostbloom | spectral |
| Crystal fungus | aurora |
| Blackthorn | gilded |

Vines use persistent cosmetic hue weights for both live and fake growth, after
the unchanged 1% **silvervine** rare roll: **aqua 70%**, lime 15%, chartreuse 10%,
and **olive 5%** of ordinary selections. Aqua is the dominant/default hue, olive
is uncommon, and vigor no longer chooses vine hue. Vigor still changes vine
fullness, thickness, detail, and competition. None of these hues asserts traffic
or security meaning, and olive remains an ordinary cosmetic rather than backend rarity.

Rare color schemes are decoration only. A rare-colored ordinary plant does not
become a backend rare species, does not gain protection, and does not imply more
severe traffic.

Wirefern common palettes are **phosphor**, **moss**, **cyan**, and **amber**, following
live vigor 0–3 through the existing color system; phosphor green is the default.
Direct simulated test spawns vary across the same palettes. The separate 1%
**afterglow** cosmetic is pale mint/cyan with a subtle ordinary Canvas glow.
Colors persist and add no backend rarity, protection, or security meaning.

## Temporary storm water

Applied heavy rain, botnet thunderstorm, and botnet hurricane may leave temporary
water terrain. Every 15 seconds the existing tick makes at most one attempt,
with respective 35%/60%/85% chances. At most eight patches occupy no specimen slots.
Existing water is usually refreshed/grown (60%); new patches often join nearby
water, and the cap forces refresh. Bounded growth is gradual. Water holds for
30 seconds after refresh, then shrinks/fades over eight minutes. Quiet/drizzle/rain
never form or refresh water. Hidden tabs skip formation; resume removes expired
patches and schedules a fresh check without replay. Cached water draws over grass
and under specimens, with no plant/grass effects, collection, Recent activity,
provenance, or persistence. Frog/snail/gnome water interactions remain future work.

## Ambient events

The Gnome Incident and future wildlife/actor ideas are intentionally outside the
network mapping table unless an incident is explicitly tied to trustworthy source
data. They exist in a separate browser actor layer and do not consume specimen
cells.

See [Ideas](IDEAS.md) for captured possibilities and the rule that ambient events
should remain rare, brief, and slightly inexplicable rather than becoming a game
system.

## First prototype subset

The development controls implement:

1. DNS -> flowers
2. HTTP -> broad-leaf plant
3. SSH -> thorny vine
4. Gopher -> mushroom
5. port 22 probe (`port22-probe`) -> red bloom / wilt

Manual controls and weighted automatic fake traffic feed these five types into
the shared garden path.
