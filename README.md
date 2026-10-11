# PacketGarden

PacketGarden is a browser-based ambient network garden where protocol and network events grow plants, flowers, fungi, weeds, and other strange things instead of appearing only as ordinary telemetry.

The core idea is deliberately playful: a DNS lookup might grow a small flower, a Gopher request might sprout a mushroom, an SSH connection might produce a thorny vine, and unusual traffic might mutate the garden in unexpected ways.

## Direction

PacketGarden is primarily a passive / idle experience with light collection and inspection elements, not a conventional management or combat game.

Open it in a browser, leave it running, and let activity shape the garden over time.

The first version should be a web app and should prove the visual idea before integrating real network data.

## First prototype

The first useful milestone is intentionally small:

> Open PacketGarden in a browser and watch fake network events grow a weird little garden.

Initial prototype goals:

- browser-based UI;
- a canvas-based garden renderer;
- fake network events generated every few seconds;
- several event types mapped to distinct growth/effects;
- plants persist long enough for the garden to visibly evolve;
- clicking or hovering a specimen can reveal what event created it;
- no real packet capture or telemetry integration required yet.

## Possible stack

Current direction:

- ASP.NET Core / .NET host when a backend is useful;
- a lightweight browser frontend;
- HTML/CSS plus Canvas for the garden;
- vanilla JavaScript initially unless a framework becomes useful;
- fake events first;
- later, real events may arrive through SSE, SignalR, or another simple streaming interface.

The visual simulation is the interesting part. Avoid building infrastructure before the garden itself is fun to watch.

## Real-data ideas for later

PacketGarden could eventually consume sanitized events from sources such as:

- Mission Control;
- web/service request logs;
- protocol servers such as Gopher or Gemini;
- connection summaries;
- DNS activity;
- synthetic/demo event streams.

It should consume event summaries rather than requiring invasive packet inspection by default.

## Planning docs

- [Vision](docs/VISION.md)
- [MVP](docs/MVP.md)
- [Initial event mappings](docs/EVENT-MAPPINGS.md)

## Status

Very early concept / prototype planning. No working garden yet.
