# PacketGarden MVP

## Goal

Build the smallest browser prototype that proves the core idea:

> Network-shaped events visibly grow and reshape a persistent top-down garden that is interesting to watch.

The first development input may be fake generated events, but the design should match the eventual NATS-backed sensor feed so the renderer and ecology do not need to be rewritten later.

## Chosen presentation

The MVP should establish the selected visual direction:

- top-down garden;
- fixed bounded area;
- entire garden visible on one screen;
- subtle square grid used for placement and growth;
- stylized painted/cartoon 2D sprites;
- ordinary activity looks mostly cozy and natural;
- unusual activity produces stranger mutations and effects;
- real local-time lighting with gradual day/night transitions.

No pan-around world or giant scrolling map is needed.

## MVP capabilities

- Display a top-down garden / soil scene in the browser.
- Generate or receive an event every few seconds during testing.
- Map at least five event types to visibly different organisms or effects.
- Place growth using cluster-first placement with very light randomness.
- Let events strengthen, bloom, spread, mutate, or replace existing growth when space is crowded instead of always spawning another object.
- Give specimens simple lifecycles including aging and decay.
- Include light competition for space without health bars or management mechanics.
- Allow a specimen to be inspected by click or hover.
- Show a small amount of safe information about the event that created or influenced it.
- Keep the full garden readable at once.

## Suggested first event types

Start with a handful that are visually distinct:

- DNS -> small flower cluster;
- HTTP -> broad-leaf plant;
- SSH -> thorny vine;
- Gopher -> mushroom;
- failed authentication -> brief red bloom / wilt.

Do not begin with twenty event types. Five working mappings are enough to learn whether the idea is fun.

## Input model

PacketGarden should have one normalized internal event model regardless of where events originate.

A conceptual event may contain:

- event type;
- source/sensor;
- timestamp;
- intensity;
- optional duration;
- safe coarse tags.

The fake generator should produce the same kind of events that the later NATS consumer will produce.

The intended real flow is:

```text
sensors -> NATS -> PacketGarden backend -> normalized event -> garden rules -> browser
```

The browser should not connect directly to NATS.

## Shared ecosystem

All sources contribute to one garden.

Do not divide the map into host-specific plots. The event type determines the main species/effect while the source may influence subtle variation such as color, markings, shape, or mutation traits.

## Garden state

A specimen only needs a small amount of state initially, for example:

- ID;
- species/type;
- grid position;
- size/age/lifecycle stage;
- creation and last-influenced timestamps;
- source event type;
- source/sensor identity if safe to expose;
- visual seed / variation value;
- optional weirdness or competition traits.

The exact model should follow what the renderer and ecology need rather than attempting to design a complete simulation engine up front.

## Ecology timing

The garden should be visibly alive during an active session.

Assuming events are arriving, a roughly 30-minute viewing session should show meaningful growth, blooming, spreading, crowding, mutation, and decay.

Common specimens may change on minute-scale lifecycles. Larger or rarer growth can persist far longer so the garden still carries history.

## Terrain

Sparse environmental features such as rocks, logs, puddles, or small structures may exist, but most of the garden should remain usable for event-driven growth.

Long-lived terrain changes can be added later and may evolve over days rather than minutes.

## Technical direction

The first visual prototype can remain mostly frontend code:

```text
fake event generator
        |
        v
normalized GardenEvent
        |
        v
event-to-growth mapper
        |
        v
garden state / ecology
        |
        v
Canvas renderer
```

ASP.NET Core can host the app from the beginning if convenient. When real events are introduced, the backend subscribes to NATS and forwards normalized garden changes to the browser using SSE, SignalR, or another simple streaming mechanism.

The backend should not be allowed to become the project before the visual garden is fun to watch.

## Persistence

The eventual garden is persistent across browser/server restarts.

Persistence does not need to block the earliest visual prototype. First prove the lifecycle and ecology in memory; then add a deliberately simple persistent representation.

## Not MVP

- Raw packet capture.
- Direct browser-to-NATS connectivity.
- Accounts/authentication.
- Multiplayer/shared-user gardens.
- Game economy.
- Scoring.
- Achievements.
- Gardening controls such as watering or pruning.
- Complex procedural ecology.
- A giant scrollable map.
- Perfect botanical art.

## Success criteria

The prototype succeeds if active event input makes the garden interesting enough to leave running and watch for roughly half an hour.

If the fake-event version is boring, connecting real sensor data will not fix the core visual idea.
