# PacketGarden

PacketGarden is a browser-based ambient network garden where real or simulated protocol/network events grow plants, flowers, fungi, weeds, terrain, and other strange things instead of appearing only as ordinary telemetry.

The core idea is deliberately playful: a DNS lookup might strengthen a flower patch, a Gopher request might sprout a mushroom, an SSH connection might grow a thorny vine, and unusual traffic might mutate the garden in increasingly weird ways.

## Direction

PacketGarden is primarily a passive / idle experience with light inspection, not a conventional management or combat game.

The current design is:

- top-down;
- fixed-size garden visible as a whole on one screen;
- subtle square grid for placement and ecology;
- stylized painted/cartoon 2D sprites;
- mostly cozy/natural under ordinary traffic;
- stranger mutations and effects as unusual traffic appears;
- persistent growth with aging and decay;
- light ecological competition;
- cluster-first growth with very light randomness;
- real local-time day/night lighting;
- meaningful changes driven mostly or completely by network events.

The garden should visibly evolve over roughly a 30-minute active session when events are arriving, while larger or rarer growth can remain much longer.

## Event input

The eventual real input is NATS, using existing sensors and related services as event sources.

All sources feed one shared ecosystem rather than separate host-specific plots. Event type determines the main species/effect while source identity may influence subtle visual variation.

Conceptually:

```text
sensors / services
       |
       v
      NATS
       |
       v
PacketGarden backend
       |
       v
normalized GardenEvent
       |
       v
garden state / ecology
       |
       v
browser renderer
```

The browser should not connect directly to NATS. The backend can stream normalized changes to the frontend over SSE, SignalR, or another simple mechanism.

A fake-event generator remains useful for development and demos and should feed the same normalized event model.

## First prototype

The first useful milestone is intentionally small:

> Open PacketGarden in a browser and watch network-shaped events grow and reshape a weird little garden.

Initial prototype goals:

- Canvas-based top-down garden renderer;
- subtle logical grid;
- fake event source using the same event model intended for real NATS input;
- several event types mapped to distinct growth/effects;
- clustered placement with light randomness;
- simple growth, aging, decay, and light competition;
- click or hover a specimen to inspect what created it;
- gradual local-time lighting changes;
- no gardening controls or game economy.

## Chosen stack

PacketGarden will be a .NET web app using:

- ASP.NET Core / .NET for the application host and backend;
- a lightweight browser frontend;
- HTML/CSS plus Canvas for the garden;
- vanilla JavaScript initially unless a framework becomes useful;
- a NATS consumer in the backend when live sensors are connected;
- SSE, SignalR, or another simple stream from backend to browser.

The visual simulation is the interesting part. Avoid building infrastructure before the garden itself is fun to watch.

## Privacy

PacketGarden should consume sanitized event summaries rather than raw packet payloads or sensitive telemetry.

The renderer should not need raw IP addresses, credentials, request payloads, or secrets to make the garden interesting.

## Planning docs

- [Vision](docs/VISION.md)
- [MVP](docs/MVP.md)
- [Initial event mappings](docs/EVENT-MAPPINGS.md)

## Status

The prototype displays a fixed garden boundary and subtle grid. Temporary
development controls generate fake DNS events for flowers and Gopher events for
mushrooms. Each species forms clusters, grows, and eventually disappears.

## Run the prototype

Install the .NET 10 SDK, then run from the repository root:

```sh
dotnet run --project PacketGarden.csproj --urls http://localhost:5080
```

Open http://localhost:5080 in a browser and click **Generate fake DNS event** to
add a flower or **Generate fake Gopher event** to add a mushroom. The whole garden
scales to fit the window, and specimens survive resizing. Development lifecycles
last 35 seconds for flowers and 42 seconds for mushrooms. State is held only in
browser memory; reloading starts an empty garden.
