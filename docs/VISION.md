# PacketGarden Vision

This document describes the intended experience, including features that are not
implemented yet. See [MVP](MVP.md) for current prototype status and [Real data](REAL-DATA.md)
for the planned integration phase.

## What it is

PacketGarden turns network activity into an evolving ambient garden.

Instead of presenting every event as a table, graph, counter, or alert, the garden interprets activity as growth. Different kinds of traffic produce different organisms and environmental effects. Over time, the garden becomes a visual memory of what has been happening.

PacketGarden should feel more like a living screensaver or terrarium than a monitoring dashboard.

## Core experience

PacketGarden is primarily something to watch.

The intended experience is:

1. open PacketGarden in a browser;
2. see the entire garden at once;
3. leave it running while real network events arrive;
4. watch the ecosystem visibly change over tens of minutes;
5. occasionally inspect an interesting specimen to see what kind of event produced it.

There is no requirement to manage the garden. No watering, pruning, resource economy, combat, or optimization loop is planned.

## Visual direction

The chosen visual direction is:

- top-down;
- fixed-size garden visible as a whole on one screen;
- subtle underlying square grid rather than an obvious game-board grid;
- stylized painted/cartoon 2D sprites;
- mostly natural and cozy under ordinary traffic;
- increasingly strange, luminous, mutated, or unnatural growth as unusual traffic appears.

The grid should simplify placement and ecology without dominating the art. It can be suggested through faint soil seams, terrain patches, edging, or other subtle structure.

## Event-driven ecology

Meaningful garden changes should be mostly or completely driven by incoming events.

Plants may continue an animation or lifecycle transition between events, but the garden should not invent lots of unrelated activity merely to stay busy. A quiet network should produce a genuinely quieter garden.

The target real event source is NATS, fed by existing sensors. PacketGarden should consume normalized, privacy-safe event summaries rather than tightly coupling the renderer to any one sensor implementation.

A fake-event generator remains useful as a development and demo source, but it should feed the same normalized event pipeline as real sensor data.

## Shared ecosystem

Events from all participating sensors and hosts feed one shared ecosystem rather than separate host-specific garden regions.

The event type primarily determines the species or garden effect. The event source may influence subtle visual variation such as markings, tint, shape, or mutation traits, but should not divide the garden into dashboard-like host zones.

## Placement and growth

Growth should be cluster-first with only light randomness.

New growth should generally prefer cells near the same or related species, avoid obviously overcrowded locations, and occasionally seed a nearby new patch. Unusual events or mutations may break these rules more dramatically.

When the garden is crowded, an event does not need to create a new permanent object. It may instead:

- make an existing specimen grow or bloom;
- strengthen or spread an existing patch;
- mutate nearby growth;
- replace weak or decaying growth;
- create a new specimen only when there is sensible space.

This lets event pressure shape the ecosystem without turning high-volume traffic into thousands of indistinguishable plants.

## Lifecycles, persistence, and competition

The intended garden is persistent across browser/server restarts. The current
prototype keeps state only in browser memory.

Organisms have lifecycles such as:

```text
sprout -> mature -> age -> wilt/decay -> disappear or leave a trace
```

Different species may operate on very different timescales. Common growth may change over minutes, while larger or rarer specimens can remain for hours or days.

The garden should change noticeably during roughly a 30-minute active session when events are arriving, while still retaining longer-lived traces of earlier activity.

There is light ecological competition rather than explicit game combat. Weeds may crowd out fragile flowers, vines may overtake nearby cells, large growth may suppress nearby spawning, and fungi may favor decaying areas. There are no health bars or loss states.

## Terrain and long-term history

Most of the bounded garden remains available for event-driven growth, but sparse environmental features can add structure and long-term history.

Examples include rocks, logs, puddles, ponds, fallen branches, or small garden structures. These features may appear, persist, become overgrown, and disappear over periods measured in days rather than minutes.

They should change slowly enough to feel consequential rather than flickering in and out.

## Real-time lighting

Lighting follows the viewer's real local time.

Morning, daytime, sunset, and night should transition gradually. This changes presentation rather than ecology: time of day should not create arbitrary growth or kill plants.

Night should remain readable, with darker ambience and more visible glows rather than realistic darkness that hides the garden.

## Inspection

Interaction is deliberately minimal.

Hovering or clicking a specimen may reveal information such as:

- event type or protocol;
- source/sensor;
- specimen age;
- safe coarse tags or traits;
- mutation or variant information.

PacketGarden is watch-first and inspect-second.

## Visual metaphor

Events should have recognizable but playful mappings.

Examples:

- DNS activity -> small clustered flowers;
- Gopher traffic -> mushrooms;
- Gemini traffic -> crystalline fungi;
- SSH connections -> thorny vines;
- failed authentication -> a flower that blooms red and quickly wilts;
- long-lived connections -> slow-growing trees;
- bursts of traffic -> rain, wind, spores, or pollen;
- suspicious or noisy traffic -> invasive weeds;
- uncommon protocol/port activity -> mutations or unusual species.

The mappings do not need to be scientifically or technically literal. They should be visually memorable and internally consistent.

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

SSE is the current choice for the initial backend-to-browser transport. NATS
ingestion and SSE are planned, not implemented. Aggregate activity can influence
weather, while discrete events can influence specimens; see [Real data](REAL-DATA.md).

A normalized event should contain only the data needed to influence the garden, such as event type, source, timestamp, intensity, duration, and safe tags.

## Relationship to monitoring

PacketGarden is not intended to replace Mission Control, logs, alerts, or proper observability.

Those tools answer questions precisely. PacketGarden is for ambient awareness, curiosity, and fun.

If a weird red weed suddenly takes over half the garden, the user can go look at the real monitoring tools to find out why.
