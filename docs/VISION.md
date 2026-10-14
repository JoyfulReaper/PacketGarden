# PacketGarden Vision

This document describes the intended experience, including features that are not
implemented yet. See [MVP](MVP.md) for current prototype status,
[Real data](REAL-DATA.md) for integration details, and [Ideas](IDEAS.md) for
captured future possibilities.

## What it is

PacketGarden turns network activity into an evolving ambient garden.

Instead of presenting every event as a table, graph, counter, or alert, the garden
interprets activity as growth. Different kinds of traffic produce different
organisms and environmental effects. Over time, the garden becomes a visual memory
of what has been happening.

PacketGarden should feel more like a living screensaver or terrarium than a
monitoring dashboard.

## Core experience

PacketGarden is primarily something to watch.

The intended experience is:

1. open PacketGarden in a browser;
2. see the entire garden at once;
3. leave it running while real network events arrive;
4. watch the ecosystem visibly change over tens of minutes;
5. occasionally notice something strange;
6. inspect or click an interesting thing when curiosity wins.

There is no requirement to manage the garden. No watering, pruning, resource
economy, meaningful accumulating score, progression tree, optimization loop, or
player-directed combat is planned.

A deliberately useless `Score: 0` that never changes is compatible with this
vision because it parodies progression rather than creating it.

Brief ambient nonsense is allowed and encouraged. Four tiny gnomes having a
pointless territorial dispute is not a combat system.

## Visual direction

The chosen visual direction is:

- top-down;
- fixed-size garden visible as a whole on one screen;
- subtle underlying square grid rather than an obvious game-board grid;
- stylized painted/cartoon 2D sprites;
- mostly natural and cozy under ordinary traffic;
- increasingly strange, luminous, mutated, or unnatural growth as unusual traffic appears;
- persistent per-specimen visual variation so repeated species do not look stamped out;
- rare cosmetic schemes that reward looking closely without changing network meaning.

The grid should simplify placement and ecology without dominating the art. It can
be suggested through faint soil seams, terrain patches, edging, or other subtle
structure.

## Event-driven ecology

Meaningful network-shaped garden changes should be mostly or completely driven by
incoming events.

Plants may continue an animation or lifecycle transition between events, but the
garden should not invent lots of fake network activity merely to stay busy. A
quiet network should produce a genuinely quieter network-shaped garden.

The target real event source is NATS, fed by existing sensors. PacketGarden should
consume normalized, privacy-bounded event summaries rather than tightly coupling
the renderer to any one sensor implementation.

A fake-event generator remains useful as a development and demo source, but it
should feed the same ecological concepts as real sensor data.

Ambient actors are a separate exception: rare frogs, birds, bugs, gnomes, or other
brief visitors may exist simply because this is also a garden. Unless explicitly
designed around trustworthy telemetry, they should carry no network or security
meaning.

## Shared ecosystem

Events from all participating sensors and hosts feed one shared ecosystem rather
than separate host-specific garden regions.

The event type primarily determines the species or garden effect. The event source
may influence subtle visual variation such as markings, tint, shape, mutation
traits, or inspection provenance, but should not divide the garden into
dashboard-like host zones.

## Placement and growth

Growth should be cluster-first with only light randomness.

New growth should generally prefer cells near the same or related species, avoid
obviously overcrowded locations, and occasionally seed a nearby new patch. Unusual
events or mutations may break these rules more dramatically.

When the garden is crowded, an event does not need to create a new permanent
object. It may instead:

- make an existing specimen grow or bloom;
- strengthen or spread an existing patch;
- mutate nearby or existing growth;
- replace weak or decaying growth;
- create a new specimen only when there is sensible space.

The current prototype implements only a bounded saturation rule: strictly stronger
vigor can replace weaker ordinary growth when all 640 specimen cells are full.
Richer responses can build on that without turning high-volume traffic into
thousands of indistinguishable plants.

## Lifecycles, persistence, and competition

The intended garden is persistent across browser/server restarts. The current
prototype keeps state only in browser memory.

Organisms have lifecycles such as:

```text
sprout -> mature -> age -> wilt/decay -> disappear or leave a trace
```

Different species may operate on very different timescales. Common growth may
change over minutes, while larger or rarer specimens can remain for hours or days.

The garden should change noticeably during roughly a 30-minute active session when
events are arriving, while still retaining longer-lived traces of earlier
activity.

There is light ecological competition rather than an explicit game-combat loop.
Weeds may crowd out fragile flowers, vines may overtake nearby cells, large growth
may suppress nearby spawning, and fungi may favor decaying areas. There are no
health bars, unit stats, tactical factions, or loss states.

## Ambient life, curiosities, and pointless collection

The browser now has a transient actor layer, first used for **The Gnome Incident**.
That layer is the preferred home for small visitors and temporary spectacles that
should not consume specimen cells.

Ambient incidents should usually be:

- rare enough to be surprising;
- short enough not to dominate the garden;
- visually readable without demanding interaction;
- harmless to the core ecology unless deliberately designed otherwise;
- slightly inexplicable when that is funnier than explaining them.

The current collectible implementation lets the exact live port-22 redbloom mutate
into a temporary collectible weed plant after first appearing normally for three
seconds. A 5% browser-only roll and cap of three active mutations keep it rare.
The original cell, canonical redbloom type, vigor, color, and provenance stay intact;
collection or expiry after 20 active seconds removes the specimen. The secondary
weed sprig is gone. Port 22 still means only a connection to listening port 22.

Collecting something should be optional and materially useless. A message such as
`You collected some weed. +0 points` and the permanently static `Score: 0` are now
implemented. Inventory, achievements, currency, progression, high scores, and
penalties for missing collectibles are not.

Exact live `seenCount == "1"` may also drive a separate first-seen curiosity layer:
a little critter or dropped object can briefly appear near the source specimen,
with at most three active at once. If all three slots are occupied, skip the new
curiosity rather than queueing it. This is a presentation of the source-provided
count, not a claim of global uniqueness across all collectors or history.

Possible future visitors, first-seen curiosities, collectibles, and gnome nonsense
are collected in [Ideas](IDEAS.md). The guiding principle is that one unexpected
frog or shiny rock is more memorable than permanently filling the garden with
interactive clutter.

## Terrain and long-term history

Most of the bounded garden remains available for event-driven growth, but sparse
environmental features can add structure and long-term history.

Examples include rocks, logs, puddles, ponds, fallen branches, or small garden
structures. These features may appear, persist, become overgrown, and disappear
over periods measured in days rather than minutes.

They should change slowly enough to feel consequential rather than flickering in
and out.

## Real-time lighting

Lighting follows the viewer's real local time.

Morning, daytime, sunset, and night should transition gradually. This changes
presentation rather than ecology: time of day should not create arbitrary growth
or kill plants.

Night should remain readable, with darker ambience and more visible glows rather
than realistic darkness that hides the garden.

## Inspection

Interaction is deliberately minimal and watch-first.

Click inspection is implemented for living specimens. A live TCPNoise specimen can
show:

- specimen type;
- bounded sensor/source label;
- listening port;
- exact valid `seenCount` as display text;
- coarse vigor;
- cosmetic color/variant;
- specimen age.

Fake-development specimens identify themselves as simulated rather than inventing
network provenance. Remote endpoint/IP data, credentials, banners, raw packets,
and payloads remain excluded.

Possible later polish includes a subtle hover highlight or lightweight hover
summary, but the garden should remain fully usable without interacting with it.

## Visual metaphor

Events should have recognizable but playful mappings.

Examples:

- DNS activity -> small clustered flowers;
- Gopher traffic -> mushrooms;
- Gemini traffic -> crystalline fungi;
- SSH connections -> thorny vines;
- a TCP connection to listening port 22 -> a redbloom that quickly wilts, without implying SSH negotiation or authentication;
- exact source-provided `seenCount == 1` -> optional short-lived first-seen curiosity;
- long-lived connections -> slow-growing trees;
- bursts of traffic -> rain, wind, spores, or pollen;
- suspicious or noisy traffic -> invasive weeds only when backed by an appropriate higher-level signal;
- uncommon protocol/port activity -> mutations or unusual species.

The mappings do not need to be scientifically or technically literal. They should
be visually memorable and internally consistent, while still being honest about
what the source data actually proves.

## Data architecture

The intended real-data path is conceptually:

```text
sensors / Mission Control / protocol services
                  |
                  v
                 NATS
                  |
                  v
      PacketGarden backend adapters
                  |
                  v
 normalized events / environmental state
                  |
                  v
                 SSE
                  |
                  v
    browser garden state / ecology / renderer
```

The browser should not need direct NATS access.

SSE is the current backend-to-browser transport. NATS ingestion supports TCPNoise
port hits; SSE also delivers aggregate weather from Noise Observatory. Aggregate
activity can influence weather while discrete events influence specimens.

A normalized event should contain only data needed for a garden effect or explicit
inspection feature. Current TCPNoise inspection deliberately includes a bounded
sensor label and exact valid recurrence count, but excludes remote addresses,
source ports, packet contents, banners, credentials, and unrelated payload fields.

## Relationship to monitoring

PacketGarden is not intended to replace Mission Control, logs, alerts, or proper
observability.

Those tools answer questions precisely. PacketGarden is for ambient awareness,
curiosity, and fun.

If a weird glowing plant suddenly takes over part of the garden, the user can
inspect it for a small amount of provenance and then go to the real monitoring
tools if they need an actual diagnosis.
