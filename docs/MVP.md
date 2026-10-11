# PacketGarden MVP

## Goal

Build the smallest browser prototype that proves the core idea:

> Fake network events arrive over time and visibly grow an evolving garden.

The MVP does not need real telemetry, persistence, authentication, accounts, multiplayer, or a sophisticated simulation.

## MVP capabilities

- Display a dark garden / soil scene in the browser.
- Generate a fake event every few seconds.
- Map at least five event types to visibly different organisms or effects.
- Place new growth somewhere sensible in the garden.
- Let existing specimens remain long enough for the scene to accumulate history.
- Allow a specimen to be inspected by click or hover.
- Show a small amount of information about the event that created it.

## Suggested first event types

Start with a handful that are visually distinct:

- DNS -> small flower cluster;
- HTTP -> broad-leaf plant;
- SSH -> thorny vine;
- Gopher -> mushroom;
- failed authentication -> brief red bloom / wilt.

Do not begin with twenty event types. Five working mappings are enough to learn whether the idea is fun.

## Technical direction

The first prototype can be almost entirely frontend code:

```text
fake event generator
        |
        v
event-to-growth mapper
        |
        v
garden state
        |
        v
Canvas renderer
```

ASP.NET Core can host the app from the beginning if convenient, but the backend should not be allowed to become the project before the visual prototype exists.

## Garden state

A specimen only needs a small amount of state initially, for example:

- ID;
- species/type;
- position;
- size/age;
- creation timestamp;
- source event type;
- optional short label;
- visual seed / variation value.

The exact model should follow what the renderer needs rather than attempting to design a complete simulation engine up front.

## Not MVP

- Real packet capture.
- Mission Control integration.
- Accounts/authentication.
- Database persistence.
- Cloud hosting.
- Mobile app.
- Game economy.
- Scoring.
- Achievements.
- Complex procedural ecology.
- Multiplayer/shared gardens.
- Perfect botanical art.

## Success criteria

The prototype succeeds if it is interesting enough to leave running for a while and watch.

If the fake-event version is boring, adding real network data will not fix the core problem.
