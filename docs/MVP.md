# PacketGarden MVP

## Goal

Build the smallest browser prototype that proves the core idea:

> Network-shaped events visibly grow and reshape a top-down garden that is interesting to watch.

The prototype now has a default PixiJS/WebGL garden, an optional Canvas fallback,
real TCPNoise input, live aggregate weather, lifecycles, grass ecology, color
variation, bounded competition, click inspection, shared opt-in sound, a shared
Gnome Incident, and pointless collectibles. Persistence and additional
sensor/service inputs remain goals.

## Completed prototype capabilities

- ASP.NET Core / .NET host serving HTML, CSS, and vanilla JavaScript.
- Default PixiJS/WebGL garden at `/` and `/index.html`, original Canvas at `/canvas.html`, and a separate Pixi diagnostic/live-soak page at `/pixi-live.html`; all retain the 32×20 logical garden, bounded capacity, and shared model rules.
- Pixi has cached, larger and revised plant artwork (including vines, broadleaf, blackthorn and ordinary weed), tufted grass, collection/inspection, and bounded rendering resources; no logical cell-size or lifecycle change from visual polish.
- Five development mappings: DNS flowers, HTTP broad-leaf plants, SSH thorny vines, Gopher mushrooms, and port-22-probe red blooms.
- Simple procedural art, including visual connections between neighboring vine cells.
- Manual event controls and start/stop automatic weighted fake traffic with randomized delays.
- Manual weather levels and an Events/min intensity preview, rendered separately from ecology with no effects on specimens or grass.
- Live aggregate weather from Noise Observatory through backend polling and SSE, sharing the existing garden renderers.
- The default homepage shows Observatory events/minute as a five-minute average and the actual source-reported last-hour count via existing SSE; these are aggregate traffic statistics, not the number of successful garden spawns. A bounded 5,000-event Observatory store may undercount the last hour during high traffic.
- Stronger severe visual weather with wind-driven hurricane rain and no ecological damage.
- Pixi-only optional storm lightning: a pale segmented bolt with occasional branches, 650ms fast attack/fade and faint 140ms supporting brightening for `botnet_thunderstorm`/`botnet_hurricane`. Irregular 60–150s/45–120s waits, independent Lightning control and reduced-motion suppression remain. Optional delayed filtered-noise thunder shares Sound On/volume; hidden pages cancel without catch-up. No ordinary/heavy-rain lightning, backend or ecology changes. Canvas retains its original rain. See [Pixi implementation](PIXI-LIVE.md).
- Temporary storm-water terrain: heavy rain/thunderstorm/hurricane only, one check per 15 seconds with 35%/60%/85% chances. At most eight patches; existing water is usually refreshed/grown (60%), new patches often join nearby pools, and the cap forces refresh. Sizes grow gradually to a bounded maximum. Water holds for 30 seconds after refresh, then shrinks/fades over eight minutes. Hidden pages skip formation and resume on a fresh schedule without catch-up. Cached draw order is grass, water, specimens. No occupancy, provenance, plant damage, grass mutation, collection, extra Recent activity, or persistence.
- Shared Canvas/Pixi browser-local Web Audio growth and collection sounds, Off by default at 12% volume and initialized only by an enable gesture. A gentle volume curve, compressor and output headroom provide louder full-volume output without changing species envelopes. Species tones (including wirefern), gentle rare chimes and gnome battle/victory cues represent artistic events, not security alerts; independent 400 ms ordinary / 900 ms rare cooldowns drop extra sounds without delaying growth.
- NATS-backed TCPNoise connection input, validated and resolved server-side from listening port to normalized specimen growth on the same SSE stream.
- Port-22 redbloom is an aesthetic signal that TCPNoise observed a connection to listening port 22. It does not prove SSH negotiation, attempted credentials, failed authentication, or malicious intent. Port 22 bypasses ordinary rarity; 2222 has a redbloom base with normal rarity and no port-22 collectible mutation.
- Event-driven artistic TCPNoise rarity: weeds plus ghostblooms, crystal fungi, and blackthorns. IPv6 / DN42 / Ygg and fallback ports modify visual odds, never security classifications. See the [probability policy](EVENT-MAPPINGS.md#tcpnoise-rarity).
- Exact TCPNoise listening ports 420 and 42069 have ordinary weed bases (known ports, not a range). Normal and weed rolls merge to 99.5% weed / 0.5% rare on ordinary IPv4; existing trait bonuses and rare choices remain. This aesthetic mapping is separate from the port-22 collectible weed mutation.
- TCPNoise `seenCount` converted server-side to coarse vigor (0–1/missing/unusable -> 0, 2–3 -> 1, 4–9 -> 2, usable counts 10+ -> 3). This artistic recurrence trait affects visual fullness and saturation-only competitive strength, independently of species/rarity, and is not a threat score.
- Bounded click-inspection provenance for live TCPNoise specimens: sensor label, listening port, exact valid `seenCount`, coarse vigor, species/color details, and age. Large UInt64 counts travel as decimal text so JavaScript cannot round them.
- Remote IP addresses, remote source ports, credentials, banners, raw packets, and payloads remain excluded from browser-facing growth events.
- Rebalanced aesthetic base ports: mushrooms only for 21/70, broadleaf for 445 alongside existing broadleaf ports, and flowers for 5432/6379/9200 alongside existing flower ports. Known/fallback rarity odds are unchanged.
- Ordinary wirefern base for TCPNoise listening ports 23/2323; 3389/5900 and fake SSH remain vines. Existing weed/true-rare overrides apply unchanged. Compact upright segmented stems and angular fronds occupy one ordinary cell, with no vine connectivity or special placement/protection. Vigor adds bounded fronds, side branches, tips, and thickness as recurrence/fullness, not threat. Growing at 18 seconds, mature at 50 seconds, fading at five minutes, removed at six minutes; ordinary base rendering uses slow visual aging and no new RAF. Persistent phosphor/moss/cyan/amber colors reuse the existing system, with a separate 1% pale mint/cyan afterglow cosmetic. Port choice proves no Telnet negotiation, credentials, authentication, payload, or malicious intent. Generic inspection, status, activity, and first-seen curiosities work normally; no new drops, mutations, grass, or water behavior.
- Shared specimen placement path for fake events and normalized real growth.
- Cluster-first placement: usually an empty touching cell near the same species, occasionally a cell two steps away, with an empty-cell fallback.
- Shared occupancy of one specimen per cell across all species.
- Full-grid competition: strictly stronger incoming vigor replaces the oldest occupant in the lowest eligible vigor tier, reusing its exact cell. Ghostbloom, crystal fungus, and blackthorn are protected from forced replacement; weed/redbloom are eligible. Incoming rare growth uses the same vigor gate, and equal vigor cannot churn the grid.
- Separate fast-growing grass on unoccupied soil, seeded/refreshed by successful fake DNS/HTTP influence attempts. Successful specimen placement/replacement clears only its destination grass through shared ecology notifications before presentation; failed/paused/invalid/dropped events do not. Influence and natural spread skip occupied cells without retrying, retaining existing chance/timing settings. Expiry creates no grass; ordinary later spread can reclaim the cell. Grass never blocks specimen placement or contributes to specimen counts. Pixi Wild grass cards close immediately on removal. Full 640-specimen diagnostic fixtures contain no grass until cells become available.
- Elapsed-time lifecycles with growth, maturity, wilting/fading/drying, and removal. Red blooms appear immediately and have only fresh/wilting stages.
- Lifecycle timings tuned for several minutes of visual history: flowers last 4 minutes, mushrooms 5, broad-leaf plants 6, vines 10, and red blooms 30 seconds; rare species can remain longer.
- Persistent cosmetic color variants selected once per specimen. Live common palettes follow vigor except for vine hue. Both live/fake vines use ordinary weights of 70% aqua, 15% lime, 10% chartreuse, and 5% olive after the unchanged 1% silvervine roll; vigor still changes vine structure/detail and competition. Other species keep their existing color behavior. Broadleaf includes a rare rainbow scheme; all rare colors remain purely cosmetic and separate from backend rarity.
- A 250 ms logical loop that removes expired specimens and frees their cells. Base ecology repaints on actual state changes or one aggregate visual deadline, with no recurring paint for mature/static objects. Stage-based specimens wait for their next lifecycle boundary; continuous grass growth/fading uses bounded updates, and puddles use meaningful radius/opacity thresholds. Hidden pages resume current state without replay. Resizing preserves state.
- Click-to-inspect information cards with scaled-canvas hit testing. Empty-soil click, Escape, or the close button dismisses the card; it also closes if the exact inspected specimen expires or is displaced. Fake specimens are labeled as simulated rather than inventing provenance.
- One authoritative live garden handler: validate/sanitize the current contract, attach TCPNoise provenance directly to the exact specimen at creation before rendering, and expose spawned/replaced/dropped outcomes. No second inspection SSE listener or fresh-specimen search.
- A small Recent activity view retaining the newest three normalized safe events in browser memory, including valid dropped-at-saturation events marked `no growth`. Fake events are explicitly simulated. Relative ages share the existing update loop; reload clears the list. No raw frames, expanded history, persistence, or replacement for monitoring.
- A shared Canvas/Pixi browser-only Gnome Incident model: at least 30 living specimens, one 2% check every 45 seconds, no catch-up rolls, and at most one 12-second red/green gnome dispute. Pixi uses 12 cached artwork frames and at most four active sprites; actors approach, shove, retreat/celebrate, then disappear without affecting occupancy, plants, grass, weather, or network meaning. Tiny optional cues share existing sound controls.
- Delayed collectible weed mutations: a 5% browser roll on the exact successfully created live port-22 redbloom schedules mutation after three seconds. Canonical type, cell, vigor, color, and safe provenance stay intact. At most three active mutations; cap-skipped candidates never retry. Collection or expiry after 20 active seconds removes the specimen entirely. No secondary sprig, extra cell, grass influence, inventory, or progression. Shared scaled clicks collect before inspecting and close that specimen's card. Ordinary TCPNoise weeds and gnomes remain independent.
- Static `Score: 0` with no JavaScript scoring/persistence state. Collection briefly shows `You collected some weed. +0 points` and optionally uses the existing quiet collection sound.
- First-seen curiosities: exact sanitized live `seenCount === "1"` tries to create one visitor beside the exact successfully spawned/replaced specimen. The uniform initial pool is ladybug, snail, moth, and shiny pebble; at most three live for 20 seconds, with no queue or catch-up when full. Separate browser-memory state consumes no cells and affects no specimens, grass, or Recent activity. Locally bounded motion and glints share the cached renderer's 30 FPS overlay. Scaled clicks collect before mutations/inspection, show type-specific `+0 points`, and reuse quiet optional audio. Gnomes and mutations remain independent. Source count one does not establish global first-ever observation or uniqueness.
- A small standalone About page explaining the project, data flow, visual metaphors, privacy boundary, weather, ecology, inspection, and the fact that the gnomes mean absolutely nothing.
- Amanita muscaria loose drops: successful live mushroom growth gets an independent 1% browser roll, scheduling a separate tiny collectible near the exact unchanged source after five seconds. Source removal/expiry/displacement before activation cancels it. Independent max-three cap at activation; skipped attempts never retry. Each drop lasts 20 active seconds on the shared overlay with no extra timers, base invalidation, cell occupancy, grass/puddle effects, or Recent activity rows. Click priority is curiosity, drop, mutation, inspection. Collection says `You found Amanita muscaria. +0 points`, reuses optional audio, and leaves Score at 0. Fake Gopher and saturated dropped growth do not roll. Gnomes, curiosities, and mutations stay independent.

Very occasionally, a port-22 redbloom may itself become a collectible weed plant.
Click it quickly enough and you collect some weed. This accomplishes absolutely
nothing. The backend port-22 mapping and rarity bypass are unchanged; ignoring the
mutation has no consequence and the score remains zero.

## Current browser-facing growth model

Fake events originate from local development controls and contain only their fake
event type internally.

Live TCPNoise SSE growth is normalized to:

```text
specimenType
listenPort
vigor
sensor?      # bounded label for inspection and Recent activity
seenCount?   # exact valid UInt64 decimal text for inspection and Recent activity
```

The browser requires integer vigor 0–3. Sensor/seenCount are optional display
metadata and do not affect species, rarity, placement, grass, weather, decay, or
competition. Every weed/rare spawn still requires an accepted TCPNoise event; there
is no timer-created backend mutation.

Specimens keep their type, cell, creation time, stable vigor, visual color variant,
and optional inspection provenance for their lifetime. State remains browser memory
only; reloading clears it.

Grass cells separately hold `column`, `row`, `createdAt`, and `lastInfluencedAt`.
They expand automatically from sparse seeds to mature turf over 30 seconds. Healthy
mature coverage receives 1–4 spread attempts every 4 seconds depending on
population, with a 50% success chance per attempt. On entering fading, turf gets one
40% final seed opportunity per influence cycle; at most six newly-fading cells are
checked per spread tick to smooth synchronized aging. Natural spread creates a new
generation without refreshing the parent. Without refresh, turf fades after 20
minutes and expires after 35. Re-influence revives the cell and restarts that aging
cycle.

## Remaining MVP work

- Gradual lighting based on the viewer's real local time, with a readable night garden.
- Deliberately simple persistence across browser/server restarts.
- Richer ecological responses beyond bounded saturation-only replacement, without health bars or management mechanics.
- Event effects that strengthen, bloom, spread, mutate, or influence existing growth when another permanent spawn is not useful.
- Additional sensor/service adapters beyond the implemented TCPNoise path.
- Additional environmental/ecological responses to aggregate pressure beyond the existing visual weather layer.
- Optional inspection polish such as a subtle hover highlight before clicking.

The current placement path creates one specimen per accepted fake event or
normalized TCPNoise growth when an empty cell exists, or replaces one eligible
weaker occupant at saturation. Dropped saturated events are silent; successful
replacements use shared growth sound/cooldowns. Natural expiry remains the normal
way space opens. Real TCPNoise growth does not directly seed or refresh grass.

## Captured next slices

These are desired follow-ups, not descriptions of the code already implemented:

- **Vine -> opium mutation / opium pod:** extend the specimen mutation helpers
  with a rarer vine transformation and reuse the implemented bounded loose-drop layer.
- **Additional curiosity/drop types:** odd seeds, worthless coin-shaped objects,
  rainbow leaves, crystal shards, ghost petals, gnome hats, and other collectible
  drops remain future work beyond the four visitors and Amanita.
- **Stillbloom:** quiet-only growth remains future work.
- **Water interactions:** frogs, water-specific snails, and gnome reactions remain future work; storm puddles themselves are implemented.
- **Storm presentation follow-up:** evaluate the implemented Pixi bolts and thunder during longer live use; Canvas lighting parity and continuous weather ambience remain separate decisions. See [Ideas](IDEAS.md#storm-lightning-and-thunder-implemented-pixi-experiment).
- **Optional desktop/screensaver:** investigate packaging the existing Pixi garden and a clearly simulated input mode; no commitment to Godot, pricing, or distribution. See [Ideas](IDEAS.md#optional-desktop--screensaver-experience-exploratory).

See [Ideas](IDEAS.md) for the broader pool and design constraints.

## Presentation and shared ecosystem

Keep the top-down bounded garden visible as a whole. PacketGarden is primarily a
living terrarium / screensaver rather than a conventional game.

All sources should contribute to one ecosystem, with no host-specific plots. Event
type determines the main effect; safe source traits may influence visual variation
without turning the garden into a dashboard.

Rare ambient events should remain rare enough to be surprising. The project should
not grow a meaningful accumulating score, economy, progression system, required
gardening chores, health bars, persistent combat factions, or optimization loop.
A permanently-zero joke score is fine because it creates no progression. See
[Ideas and future directions](IDEAS.md) for captured possibilities and guardrails.

## Real-data direction

The integration path is:

```text
sensors/services -> NATS -> backend adapters
    -> normalized garden events/environmental state -> SSE -> browser garden
```

SSE carries live aggregate weather and normalized TCPNoise growth. The browser
must not connect directly to NATS. Port-to-plant mappings are aesthetic and do not
claim protocol/authentication semantics; aggregate volume remains separate weather
input.

Normalized data may include event type, bounded source/sensor provenance, network
class (`public`, `dn42`, `ygg`), timestamp, intensity, duration, and sanitized tags
when they serve an actual garden or inspection purpose. Fake and real discrete
events should share ecological handling where appropriate without inheriting false
semantics.

## Event pressure and timing

High volume should not require one new permanent specimen per event. Repeated
events may eventually strengthen, spread, bloom, mutate, or otherwise influence
existing growth. Aggregate/background activity may instead become drizzle, rain,
or heavy rain through the existing weather path.

An active viewing session should show meaningful change over roughly 30 minutes.
The tuned prototype lifetimes retain recent visual history; longer-lived terrain
and rare growth lasting hours or days remain future work. Quiet traffic should
mean quieter network-shaped activity, while future lighting follows local time
independently.

## Not MVP

- Raw packet capture or direct browser-to-NATS connectivity.
- Accounts/authentication or multiplayer/shared-user gardens.
- Meaningful game economy, accumulating score, achievements, progression, or gardening controls.
- Player-directed combat or tactical unit management; gnome fights are ambient nonsense, not a combat system.
- Complex procedural ecology or a giant scrollable map.
- Perfect botanical art or long-term terrain simulation.

## Success criteria

The prototype succeeds if active event input makes the garden interesting enough
to leave running and watch for roughly half an hour, with occasional details worth
clicking or simply noticing. Connecting real data should deepen that experience,
not substitute for it.
