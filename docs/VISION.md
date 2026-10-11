# PacketGarden Vision

## What it is

PacketGarden turns network activity into an evolving ambient garden.

Instead of presenting every event as a table, graph, counter, or alert, the garden interprets activity as growth. Different kinds of traffic produce different organisms and environmental effects. Over time, the garden becomes a visual memory of what has been happening.

PacketGarden should feel more like a living screensaver or terrarium than a monitoring dashboard.

## Core experience

The intended experience is:

1. open PacketGarden in a browser;
2. leave it running;
3. watch events gradually change the scene;
4. occasionally inspect an interesting specimen;
5. discover uncommon growth when unusual events occur.

There is no requirement to constantly interact with it.

## Game-ness

PacketGarden should be mostly passive, with light collection / discovery elements.

Possible lightweight interactions:

- click a plant to inspect what created it;
- discover named species or variants;
- keep a simple specimen log;
- notice rare mutations or environmental events;
- optionally reset or start a new garden.

Avoid turning the project into a resource-management game, idle-economy game, or competitive system unless that direction becomes genuinely fun later.

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

## Fake first

The first prototype should use generated events.

This keeps the initial question focused:

> Is it enjoyable to watch network-shaped events turn into a garden?

Real integrations only matter after the answer is yes.

## Real data later

When real event sources are added, PacketGarden should prefer sanitized event summaries rather than raw packet capture.

A useful event might contain:

- event type;
- protocol or service;
- timestamp;
- severity/intensity;
- source category;
- duration;
- a small amount of safe metadata.

The renderer should not need IP addresses, payloads, credentials, or other sensitive details to make the garden interesting.

## Relationship to monitoring

PacketGarden is not intended to replace Mission Control, logs, alerts, or proper observability.

Those tools answer questions precisely. PacketGarden is for ambient awareness, curiosity, and fun.

If a weird red weed suddenly takes over half the garden, the user can go look at the real monitoring tools to find out why.
