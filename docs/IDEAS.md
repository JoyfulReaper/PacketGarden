# PacketGarden Ideas and Future Directions

Supported renderer: **PixiJS/WebGL**. The legacy Canvas renderer is retired;
`/canvas.html` is a script-free redirect. Current dependencies and test migration
are documented in [the retirement audit](CANVAS-RETIREMENT.md).

This document collects ideas that have come up while building and watching the
prototype. They are possibilities, not commitments. The implemented state lives in
[README](../README.md) and [MVP](MVP.md); the broader design is in
[Vision](VISION.md).

## Design guardrails

PacketGarden works best as an ambient terrarium / living screensaver with a real
network underneath it.

Future additions should generally make the garden more interesting to leave open
and occasionally notice, rather than adding chores or optimization. In particular:

- watch-first, inspect-second;
- no meaningful or accumulating score, economy, progression tree, inventory, or loss state;
- a permanently useless joke score such as `Score: 0` is allowed precisely because it never becomes progression;
- no gardening chores required to keep the garden alive;
- no player-directed combat system;
- no health bars, unit stats, persistent factions, or tactical controls;
- network/security meaning stays separate from visual drama;
- rare surprises are more effective when they remain rare;
- prefer brief, slightly inexplicable ambient events over constant decorative motion.

The Gnome Incident is the model: it is funny because it can be forgotten about
until four tiny idiots suddenly have a territorial dispute and then leave.

## Current presentation baseline (implemented)

The production homepage now uses PixiJS/WebGL, with development controls at `/pixi-live.html`. The legacy Canvas renderer is retired; `/canvas.html` only redirects to the homepage.
The Pixi presentation has revised vine, broadleaf, blackthorn, weed and other
plant artwork, larger specimen sprites, and separated grass tufts. The logical
32×20 grid, capacity, ecology and lifetimes have not been enlarged or changed
by those visual passes.

Existing Pixi mechanics now share the collectible weed mutation (of a
live port-22 redbloom), the independent Amanita loose drop (from a live mushroom),
all four first-seen curiosities, click priority and collection messages. The
supported presentation includes cached artwork and optional storm lightning;
Pixi has diagnostic
fixtures and its own HUD. Old `PIXI-LIVE.md` reports listing missing systems are
historical snapshots, not current missing-feature lists. Ordinary live weed buds
are now implemented as a separate loose drop, alongside clicked-gnome underpants.

The Pixi garden now shares opt-in Web Audio (Off initially, 12% initial volume)
for successful growth, rare flourishes, pointless collections and gnome arrivals.
Every successful dispute and landscaping-mode start has one short synthesized
nasal “gnooo-mz!” motif, suggesting a musical voice without speech, recordings
or network access. Existing battle/victory cues remain. Failed attempts, ticks
and resume are silent; two bounded voices use the existing volume and output
chain and disconnect after completion, muting, hiding or page disposal. The
roughly 550ms cue now preserves its fundamental and holds a vowel-like body
before a gentle buzzing tail; the old filter/envelope made it hard to hear at
12%. A diagnostic-only **Preview gnome sound** shares the production synthesis
without spawning actors, enabling Sound or resuming audio. See
[audio diagnosis and native signal checks](GNOME-AUDIO.md). The original incident's shared
model retains the 30-specimen threshold, 2% check
every 45 seconds, four actors and 12-second cleanup. The homepage also shows
Noise Observatory's five-minute-average events/minute and actual reported
last-hour count over the existing SSE feed. Exact TCPNoise listening ports
420 and 42069 use an ordinary weed base, distinct from the collectible port-22
mutation. These are implemented features, not wishlist tasks; see [MVP](MVP.md)
and [Pixi live notes](PIXI-LIVE.md) for exact behavior and limitations.

## Grass and plant separation (implemented)

The Pixi background/foreground separation pass is implemented: slightly darker,
less saturated leafy grass, feathered shading inside occupied grass cells, and
small contact shadows only where a plant actually overlaps grass. Leaf contours,
age colors, plant/bloom palettes and day/night behavior are retained. These are
cached presentation choices, with no ecological or checkbox-rule changes and no
gameplay change. Future tuning should retain organic edges rather than
rectangular occupied-cell tints; broader directional shadows remain a separate
idea. See [captures, tradeoffs and bounds](PIXI-LIVE.md#grass-and-plant-visual-separation-2026-10-23).

## Wirefern sori (implemented)

Wireferns now have a separate 25% cosmetic selection at creation. Stable copper,
golden-ochre or soft phosphor-cyan sori form two to four small three-dot groups
on actual angular fronds. Color and pattern are independent of foliage/vigor,
including the unchanged rare afterglow palette. The dots appear at 50-second
maturity, dim/desaturate at five minutes and leave with the original fern at six
minutes. Three cached layouts and source-owned child Sprites add no timers or
per-frame geometry. Inspection, identity, network provenance, ecology, drops,
gnomes and Score: 0 are unchanged. See
[geometry, before/after captures and resource measurements](PIXI-LIVE.md#wirefern-sori-2026-10-27).

The visibility follow-up enlarges and separates the cached dots and adds
occasional airborne releases. One visible-page check every 30 seconds rolls
75% on an independent emission stream, then chooses one currently mature,
decorated source. A single cached eight-dot Sprite expands and drifts upward
for three seconds, with at most two active clouds. Exact source removal or
ineligibility cancels its cloud; hidden time and long logical gaps never catch
up. Reduced motion shows a one-second static puff with opacity fading only.
Actual 960×600 comparisons and resource measurements are in
[the release review](PIXI-LIVE.md#wirefern-spore-release-2026-10-27).

Collectible spores, new plants, spreading and fertilization remain out of scope.
Neither attached sori nor airborne releases have gameplay or collection behavior.

## Ambient actors and incidents

The browser now has a transient actor/event layer because of The Gnome Incident.
First-seen visitors use their own bounded curiosity collection because gnome
cleanup owns the actor array. Neither layer consumes specimen cells or affects
plant ecology.

### Frogs around storm puddles (implemented)

The Pixi garden now has passive frogs around actual shared puddles. Every
45 seconds, sufficiently visible/wet water permits one strict `< 0.15` roll,
at most one arrival, and no more than two active frogs. Eligibility uses
`puddleVisualState`: size >=8 and opacity >=0.12. A storm without water is
insufficient; quiet weather with retained water is eligible.

Each frog keeps its exact puddle reference and a small preplanned route. It
sits initially, makes two or three short hops, glances around and departs at
60 seconds. Losing the puddle or completely dry water starts a 1.5-second fading
exit; replacement objects do not inherit frogs. Positions stay inside the
garden. Reduced motion uses discrete sitting poses, without hop arcs. Hiding
or a logical gap over 1.5 seconds discards stale visits and starts a fresh
45-second cadence, with no missed checks or hops replayed.

The bounded renderer-neutral model has its own random stream and uses the
existing logical tick. It never changes ecology, specimen capacity, rarity,
weather, scores, activity or acceptance statistics. A frog's first click now shows
`The frog ignores you +0 points` for two seconds, while its exact visit continues
unchanged. Later clicks are consumed without a new message, timer renewal or
fall-through. Shared picking follows its actual pose, after gnomes, curiosities
and drops, before mutations/inspection. Hidden, departed, stale and fully faded
frogs cannot be picked. This creates no collection or sound and consumes none
of the existing curiosity/drop/gnome slots.
; Pixi reuses six finite sit/hop frames across
three green/olive palettes in the ambient atlas, with at most two persistent
Sprites and no runtime geometry/textures. Gnome click priority is unchanged.

Only `/pixi-live.html` has **Trigger frog (simulated)**. It seeds suitable local
water when needed and can create two ordinary 60-second visits, without incoming
network events or activity. It also demonstrates the once-only message. Further
frog interactions remain possibilities.

Additional possible visitors include:

- bugs;
- birds;
- snails;
- other tiny garden creatures;
- occasional mysterious little network demons or similarly inexplicable visitors.

These should normally be uncommon and short-lived. A frog that appears once in a
long session is more memorable than a permanent crowd of frogs.

Possible gnome incidents:

- a lone gnome walks across the garden carrying something it apparently stole;
- two gnomes drag a mushroom somewhere for reasons never explained — implemented as the Great Gnome Mushroom Heist below;
- one gnome chases another across the garden;
- a tiny gnome funeral procession;
- one gnome appears, looks around, and immediately leaves;
- a wizard gnome briefly interacts with a rare specimen and vanishes;
- a few gnomes build a tiny temporary campfire;
- a much rarer **Gnome Civil War** as an escalated spectacle.

### Great Gnome Mushroom Heist (implemented)

Two gnomes really steal a garden mushroom. The existing **45-second / 2%**
ordinary incident check still requires **30 living specimens**. On success,
if an eligible mushroom exists, one **30%** branch selects a heist instead of
the dispute; otherwise the normal dispute runs. This is a **0.6% chance per
available check** with eligible mushrooms, not an extra periodic roll. The
existing landscaping order, probabilities and seven-minute cooldown remain.

One exact mature ordinary mushroom is sampled uniformly. Rare species/palettes,
pending collectibles and active/pending mutations are excluded. The red/green
thieves approach from opposite sides for **3s**; pickup rechecks the original
object, id, cell, coordinates, creation time, occupancy and current eligibility.
It then calls the authoritative garden removal API with `gnome-heist`, freeing
the cell and running normal view/inspection/drop cleanup. The original specimen
is gone. A temporary Sprite reuses its mature mushroom texture, palette and
scale as the pair carry it toward the nearest edge; after a **1s** hold they
depart by **14s** with a small wobble. No replacement specimen is created.

Stale/replaced targets cause a short empty-handed exit. Hidden tabs or clock
stalls cancel safely: before pickup the mushroom remains, after pickup it stays
removed. Reduced motion uses static poses and discrete travel without wobble.
Underpants clicks, collection caps, normal cell refill/competition and Score: 0
remain intact. Heist removals have their own counter and never become accepted
growth, Recent activity or invented TCPNoise provenance. The diagnostic page
provides simulated source/removal/replacement, suspension and reduced previews.
See [actual-scale captures, resource costs and tests](PIXI-LIVE.md#great-gnome-mushroom-heist-2026-10-27).

### Gnome Landscaping Department — vine control (implemented)

When ordinary living vines reach **40% of living specimens**, with at least
**20 eligible vines**, the shared 45-second gnome check gets a **10%** landscaping
roll. A **seven-minute cooldown** runs from each crew's arrival, even if it is
cancelled. The ordinary dispute/heist choice takes priority on a shared check;
incidents never overlap or interrupt one another. A full garden instead selects the
overcrowding mode below, with no additional vine roll.

Two gnomes arrive: a worker carries hedge clippers and a stationary supervisor
watches unhelpfully. They select about **25% of eligible vines** (rounded, capped
at **eight**) once, following a short route. Each visit has 750ms of travel and
at least 500ms of visible snipping, followed by a 750ms exit. Normal visits last
roughly 7–11 seconds. The existing logical tick performs each removal through
the authoritative garden's `remove()` API, freeing the cell for normal growth.

Every scheduled target is checked again for exact object/id, cell occupancy,
coordinates, creation time, lifetime and eligibility. Expired, replaced or
collected targets are skipped with no substitutes. Silvervines, active/pending
mutations, protected species and all unrelated plants are excluded. Network
events, acceptance statistics, rarity, competition, provenance and Recent
activity keep their existing meanings.

Pixi share the rules and clipper poses. Reduced motion uses fixed
poses and discrete positions; landscaping shares the optional arrival cue. Hiding the page cancels
the crew immediately; a logical gap over 1.5 seconds also cancels instead of
replaying snips. Actors and incident display objects are released on completion.
No extra timers, per-frame population scans, persistence, scores or chores.
`/pixi-live.html` has a development-only diagnostic that seeds local ordinary
vines if needed and starts a visit, while retaining eligibility and cooldown.
Long live-traffic visual tuning remains a follow-up, not a gardening mechanic
or network/security response.

#### Emergency overcrowding relief (implemented)

When **all 640 specimen cells are occupied**, the same department gets one **25%**
roll per scheduled 45-second check. Failure does nothing until the next check and
does not reset the shared seven-minute cooldown. Overcrowding takes priority over
vine control when both qualify; the existing four-gnome dispute still goes first.
These are unreliable volunteers with questionable professional qualifications,
not guaranteed assistance or a garden management control.

The same worker and supervisor aim for **32 empty cells** (5% of capacity),
cutting random ordinary living plants of any species. They stop removing plants
when 32 cells are free or **32 successful removals** have occurred. Traffic may
immediately refill cleared cells, so free space is best effort. Rare species,
all rare palettes (including rainbow broadleaves), active/pending mutations and
collectibles are excluded. Exact identity, occupancy, creation time, lifetime and
protection are rechecked before every cut; replacements are never targeted by cell.

At arrival, sample at most **64 original targets without replacement**, with no
new arrivals added to the route. Stale remaining targets are skipped and an
exhausted sample ends the visit. A **45-second work deadline** also ends the
incident; an exit already in progress takes at most another 750ms plus tick
rounding. Ideal 250ms ticks complete 32 cuts in about 41 seconds; real timer
delays can reach the deadline with fewer cuts even without incoming traffic.
Shared hidden-tab, reduced-motion, optional arrival cue and cleanup rules apply. No changes to
growth rules, acceptance counts, provenance, SSE/NATS or Recent activity.

The development-only **Trigger overcrowding relief (simulated)** button at
`/pixi-live.html` can seed a full ordinary mixed garden and start this mode
independently of vine diagnostics. Both buttons retain the shared cooldown;
neither is exposed on the homepage. Long real-traffic frequency/visual tuning
remains a follow-up.

#### Weed harvesting (implemented)

The third landscaping mode, `weed_harvest`, uses the same 45-second logical
check and seven-minute cooldown. At least three mature ordinary weeds allow one
strict `< 0.05` roll. Priority remains fight → overcrowding → vine → harvest.
A failed full-capacity overcrowding roll never falls through; a failed vine
roll may allow harvest when its separate eligibility holds. Existing fight,
vine and overcrowding probabilities are unchanged.

A worker and mildly suspicious burlap-sack carrier visit 1–3 selected original
weeds sequentially, using the existing 750ms travel, 500ms snip and 750ms departure.
Before each cut, recheck exact object/id, cell/coordinates, creation time,
living mature stage and ordinary eligibility. Rare palettes, protected species,
mutations/pending mutations and sources with pending bud drops are excluded.
No replacement is chased. The authoritative removal lifecycle frees the cells;
already-active buds remain independent. Both gnomes leave, handing the sack to
the worker. Hidden tabs or logical gaps over 1.5 seconds cancel without replay;
reduced motion uses discrete positions and static poses. No new scheduling loop.

### Clickable gnomes and underpants (implemented)

All visible active gnomes take click priority before curiosities, loose drops,
mutations and inspection. The Pixi garden records the exact logical pose used to
draw each actor, including movement, shove, bounce and rotation; centralized
click handling tests that transform. Hidden, removed, expired and unpainted
actors cannot be clicked. A click is consumed even after an actor's one attempt,
so it cannot also collect or inspect something underneath.

The first click produces a brief 600ms surprise pose and one underpants attempt.
At a full shared five-drop cap, the attempt is consumed without retry. The
separate white `gnome_underpants` drop has a waistband/leg openings and lives
20 seconds independently of its gnome. It shares Amanita/bud removal, collection,
expiry and rendering cleanup, without network provenance, occupancy or ecology.

On collection, a fresh roll strictly below 0.8 says
`You stole a gnome's underpants. +0 points`; otherwise it says
`Collected underpants +1, annoyed gnome -1`. The latter is only a zero-result
joke: no score arithmetic, annoyance statistics, inventory or persistent state.
Existing two-second feedback and optional sound remain; Score stays 0.

Development-only `/pixi-live.html` controls trigger a simulated weed-harvest
fixture, seed five mixed Amanita/bud/underpants drops and force either message
boundary. Actual gnome clicks still enforce one attempt and the cap. The public
homepage exposes none of these controls. The Pixi garden shares the same bounded
model and finite artwork; Pixi keeps at most four actor and five drop Sprites.

Ambient incidents should not claim to represent attacks, failures, threat levels,
or specific protocols unless an event is explicitly designed around trustworthy
telemetry. Most of them can simply be garden nonsense.

## Pointless collectibles

The first collectible is now a mutation of the exact successful live port-22
redbloom. A 5% browser roll schedules the change after three seconds; at most
three mutations are active. The mutation keeps the canonical redbloom type, cell,
vigor, color, and provenance, without adding a specimen or affecting grass/gnomes.
Collection or expiry after 20 active seconds removes the specimen. Cap-skipped
attempts never retry. The old secondary weed sprig is removed.

Very occasionally, a port-22 redbloom may itself become a collectible weed. Click it
quickly enough and you collect some weed. This accomplishes absolutely nothing.

### Implemented port-22 mutation

The **redbloom itself** mutates into a collectible weed plant after the normal
redbloom has been visible for three seconds. There is no secondary drop.

The semantic sequence should remain clear:

1. a live TCPNoise hit on listening port 22 first produces the normal redbloom;
2. the existing port-22 meaning is therefore still visible and honest;
3. on a rare browser-only collectible roll, that same redbloom later mutates into a
   temporary collectible weed plant;
4. the mutated plant keeps the source specimen's safe provenance rather than
   inventing a second network event;
5. clicking it harvests/removes it; ignoring it lets it disappear naturally after
   its short collectible window.

This is a presentation-layer mutation, not a change to backend TCPNoise rarity.
Port 22 must still resolve to redbloom server-side and still bypass ordinary rarity.
A port-22 event must not suddenly become evidence of malicious traffic, SSH auth,
or anything beyond a connection to listening port 22.

### Implemented Amanita muscaria loose drop

An exact successful live mushroom gets a 1% cosmetic browser roll for a separate
tiny Amanita muscaria drop after five seconds. The mushroom remains unchanged;
removal/expiry/displacement before activation cancels the attempt. Drops live in
their own transient array, with a max-five cap independent of curiosities and
mutations and a 20-second active lifetime. A due attempt at the cap never retries.
Logical cleanup shares the existing tick, while procedural red caps, white spots,
and pale stems bob on the dynamic overlay without invalidating base ecology.
They occupy no cells and affect no grass, puddles, gnomes, or Recent activity.
Clicks collect curiosities before drops, then mutations before inspection.
Collection says `You found Amanita muscaria. +0 points` with optional quiet sound;
Score stays 0, with no inventory, persistence, use, or consumption mechanics.
Only live successful mushroom growth triggers the roll; it says nothing about
traffic protocol, payload, remote identity, or security. The small loose-drop
registry now also supports Ditch Weed Buds below. The original Amanita-only
implementation is retained in the historical Pixi notes.

### Ditch Weed Bud (implemented)

The proposed ordinary-weed drop is now implemented in Pixi.
Each successfully placed live TCPNoise canonical `weed`, regardless of port,
gets exactly one 3% roll (`roll < 0.03`) at creation. No tick, refresh, maturity
or collection rerolls it. A successful attempt waits for the exact parent's
60-second maturity. Exact reference/id, cell/coordinates, creation time,
eligibility and current lifetime must still match; removal, replacement,
collection or clear before activation cancels it. Local/fake weeds, unrelated
plants and the port-22 redbloom mutation do not produce buds.

The tiny compact olive-green leaf cluster is a separate loose object with its
own 20-second lifetime. Collecting or ignoring it leaves the weed unchanged.
Amanita and buds share five active slots total; due cap skips are consumed
without retries, queues or eviction. Bud deadlines missed while hidden or more
than 1.5 seconds late are discarded without catch-up. Amanita keeps its original
1% live-mushroom roll, five-second delay and hidden/resume behavior.

Click priority is now active gnome → curiosity → topmost loose drop → visible frog → mutation → inspection.
Only the selected bud disappears, briefly saying
`You smoked some ditch weed. +0 points`, with existing optional quiet audio.
No smoke effect, consumption animation, occupancy, grass/puddle change, Recent
activity, acceptance count, inventory or scoring is introduced. Score stays 0.
The separate port-22 mutation still collects the specimen itself and says
`You collected some weed. +0 points`.

The Pixi garden uses the same finite leaf shapes; buds stay still, including with
reduced motion. Pixi adds one startup atlas frame and uses one owned Sprite per active bud.
**Seed weed buds (simulated)** appears only on `/pixi-live.html`, seeding local
simulated weeds, grass and a mixed three-drop overlap fixture. It changes no
incoming statistics or activity. There are no new timers or backend contracts.

### Ordinary weed loose buds (historical proposal; now implemented above)

A successful **live TCPNoise ordinary weed** (not a port-22 redbloom that later
mutates into collectible weed) could occasionally produce a separate, little
clickable bud. The parent weed remains a normal specimen with unchanged type,
vigor, cell, age and safe origin. Use the existing shared Amanita loose-drop
scheduler/renderer integration, its capped transient collection, and no invented
network event. Fake traffic, seeded fixtures and existing collectible mutations
must not trigger the organic bud roll. Rare drops should be noticeable but not
constant, and should disappear harmlessly when ignored. Proposed collection text:

```text
You smoked some ditch weed. +0 points
```

The line is a joke, not an inventory item, consumption action, reward or useful
mechanic. No smoke animation or gameplay effect is required. The static score
remains zero. Keep the port-22 redbloom mutation's existing separate wording and
behavior intact; do not change existing Amanita or first-seen eligibility.

### Vine -> opium-poppy mutation and loose pods: implemented

The visual transformation is implemented. Each successfully placed ordinary live
TCPNoise vine gets one independent 0.5% cosmetic roll, excluding silvervine and
simulations. It first appears as a normal vine, then transforms at 60 seconds
under a separate two-active cap. Failures and cap skips never retry. The exact
vine retains its identity, cell, vigor, source and history, fades from eight
minutes and expires at ten minutes. Dusty mauve petals and gray-green foliage use
two cached frames on its existing Sprite. Neighbor tendrils and vine blossoms
detach, gnomes spare active poppies, and clicks inspect the original provenance.
The existing collectible redbloom mutation retains its separate 5%/three-active/
three-second delay/20-second lifetime rules.

Successful live poppy activation now gets one independent **20%** pod decision.
The ordinary vine's arrival never rolls. A success schedules a separate loose
capsule three seconds later, provided the exact active parent still exists and
the shared five-drop cap has room. Cap skips, failures, cancellation and missed
hidden/stalled deadlines never retry. The pod lives 20 seconds independently;
collection or parent removal leaves the other object unchanged. The capsule's
sage oval, crown and short stem use one static cached frame. Existing loose-drop
click priority and optional collection audio apply; the parent still inspects.
No network/activity event, scoring, inventory or progression is added. The
combined 0.5% × 20% chance is 0.1% before caps and lifecycle eligibility reduce it.

A collected pod says exactly:

```text
You collected an opium pod. +0 points
```

This is visual garden nonsense only. It says nothing about the protocol, source,
intent, or security meaning of the traffic that created the vine. It must not grow
into crafting, processing, inventory, trade, or any useful resource system.
The 0.5% roll and two-active limit account for vines living much longer than
redblooms. [Implementation and review](PIXI-LIVE.md#rare-vine-to-opium-poppy-mutation-2026-10-27)
record the exact lifecycle and renderer ownership checks. See also
[pod diagnostics, screenshots and validation](PIXI-LIVE.md#collectible-opium-pods-2026-10-27).

### The zero-point anti-score

A deliberately fake game score is now permanent static HTML:

```text
Score: 0
```

It always remains **0**; there is no score variable or saved score.

Weed collection currently says `You collected some weed. +0 points`. Other
possible future messages include:

```text
You collected some weed. +0 points
You collected an opium pod. +0 points
You found a rainbow leaf. +0 points
You acquired a suspicious crystal shard. +0 points
Excellent. A rock. +0 points
```

Rules:

- no hidden score;
- no incrementing score;
- no high score;
- no combo multiplier;
- no score persistence;
- no achievements derived from collection;
- no collection total disguised as a score;
- collecting everything still leaves `Score: 0`.

Occasional messages such as `Score remains 0.` or `Still 0.` are fair game. The
point is to parody a progression system, not quietly build one.

### Other possible collectibles

Keep the pool small enough that finding one remains memorable. Candidates include:

- **mushroom cap** — a Gopher mushroom occasionally leaves a cap;
- **rainbow leaf** — a rainbow broadleaf sheds a multicolored leaf;
- **crystal shard** — crystal fungus leaves a glowing shard;
- **blackthorn thorn** — one oversized cartoon thorn;
- **ghost petal** — a translucent petal that fades if ignored;
- **gnome hat** — very rarely left behind after a Gnome Incident;
- **shiny rock** — needs no explanation whatsoever;
- **odd seed** — explicitly cannot be planted;
- **snail shell** — useful if snails eventually exist, which is to say not useful.

Collectibles should remain optional curiosities. Missing one has no penalty and
collecting one produces no durable advantage.

## First-seen curiosities

A valid exact sanitized TCPNoise `seenCount === "1"` now triggers a separate
browser-only curiosity attempt. Here, "first seen" means only what the
source-provided count says; it establishes no global uniqueness across collectors
or first-ever observation in history. Missing counts, non-strings, `"01"`,
`"1.0"`, and `"1e0"` do not qualify.

Implemented behavior:

- after a successful live spawn or replacement with exact count `"1"`, try to
  create one transient curiosity beside that exact returned specimen; dropped
  growth and fake events do not trigger it;
- maintain a small global cap of **3 active first-seen curiosities**;
- if all three slots are occupied, silently skip the new curiosity;
- no queue, backlog, or catch-up spawns;
- missing or unusable `seenCount` does not qualify;
- the curiosity does not consume a specimen cell or affect grass, vigor, rarity,
  competition, weather, or the source specimen;
- expire after 20 seconds using the existing garden update tick;
- clicking collects before mutations/inspection for the magnificent reward of
  `+0 points`, with the shared transient message and optional quiet sound;
- animation shares the 30 FPS dynamic overlay without rebuilding cached ecology;
- gnome cleanup and the three-mutation cap are independent of this layer;
- no extra Recent activity row, inventory, persistence, or hidden score.

The initial uniform pool uses exactly four procedural types:

- **ladybug** — crawls near the new specimen;
- **snail** — moves extremely slowly beside the source specimen;
- **moth** — flutters around growth briefly;
- **shiny pebble** — sits there being inexplicably clickable;

All travel stays within six logical pixels; pebbles are stationary with occasional
glints. Future additions might include an **odd seed** that cannot be planted or a
**coin-shaped object** that is not currency and earns no points. Later, the
originating species could bias the pool: flowers might attract ladybugs or moths,
mushrooms might attract snails, vines might attract
bugs, and stranger species might be more likely to leave strange objects.

This gives different visual layers distinct jobs:

- ordinary discrete events -> specimen history;
- exact `seenCount === "1"` -> transient first-seen curiosity;
- rare collectible mutations/drops -> optional pointless clicking;
- aggregate traffic -> weather;
- sustained verified quiet -> quiet-only growth;
- heavy weather -> temporary terrain residue;
- completely unrelated cosmic forces -> gnomes.

## Recent activity strip

A tiny recent-event view can provide just enough context to connect sudden garden
changes with incoming telemetry without turning PacketGarden into another dashboard.

Proposed behavior:

- show only the most recent **1–3 normalized events**, preferably three at most;
- newest first;
- browser-memory only, cleared on reload;
- no scrolling history, pagination, search, export, or telemetry database;
- show safe compact fields already available to the browser, such as sensor,
  listening port, specimen, exact `seenCount`, and relative age;
- fake-development events are clearly marked as simulated and do not invent sensor,
  port, or count provenance;
- a valid event dropped because the saturated garden cannot accept it may still
  appear with a quiet `no growth` hint;
- never expose remote IPs, source ports, payloads, banners, credentials, or other
  excluded TCPNoise data.

A compact presentation might look like:

```text
Recent activity
wurstcase-public · :443 · broadleaf · seen 1 · now
scopecreep-ygg · :23 · wirefern · seen 7 · 4s
noisemaker · :22 · redbloom · seen 2 · 9s
```

This should stay visually subordinate to the garden. It is ambient context, not a
replacement for Mission Control, logs, or proper observability.

## Quiet-only growth — Stillbloom (implemented)

Quietness should have a positive visual identity instead of the garden becoming
interesting only when sensors are busy.

A rare species, **Stillbloom**, now grows from the aggregate/environmental layer,
independently of TCPNoise port rarity. It requires authoritative Live weather
exactly `quiet`, a valid snapshot, healthy upstream polling and an unexpired
backend freshness lease. Neither low/zero rates nor fallback/manual weather qualify.

Important distinction: **quiet is not the same thing as broken telemetry**. A
quiet-only plant should require a fresh/healthy aggregate source so a disconnected
or stale sensor feed cannot accidentally create "peaceful" growth.

Implemented behavior:

- require ten continuously observed minutes of verified quiet;
- make one 10% roll at minute ten, then every three minutes; failures wait;
- cap at two living specimens; free cells only, with no displacement;
- reset on disconnection, unhealthy/stale leases, hidden time or a >1.5s logical
  stall; no suspension credit or catch-up rolls;
- any weather level other than exactly `quiet` immediately prevents new growth;
- already-grown Stillblooms remain and age naturally rather than vanishing the
  instant activity resumes;
- inspection should identify the source as something like `Sustained quiet`
  rather than inventing a sensor, port, or discrete event.

Thin silver-green growth supports a pale ivory cup flower with lavender/blue
outer petals, distinct from ghostbloom's daisy and crystal fungi. Young growth
and late fading update at bounded one-second visual deadlines; mature flowers
are static. The lifecycle is sprout <30s, growing <90s, mature until minute 17,
then gradual fading through expiry at minute 20. Four cached Pixi poses fit in
the existing atlas allocation;  Local-time
lighting makes the pale flower stand out at night without changing eligibility.
Competition and both landscaping modes protect it. No synthetic network events,
acceptance statistics, Recent activity, grass influence, drops or sound are added.
Development-only simulation stays separate from organic weather certification.

Possible later quiet-only relatives include a silence fern, dewbell, or extremely
rare glass lily, but begin with one species so seeing it stays special.

## Inspection and interaction polish

Click-to-inspect is implemented. Possible refinements:

- subtle hover highlighting so the targeted specimen is easier to identify before
  clicking;
- optional hover summary with the full card remaining click-only;
- clearer human-readable names/descriptions for rare species and color variants;
- safe links or hints toward the real monitoring tool when somebody wants precise
  diagnostics, without turning PacketGarden itself into that dashboard.

Interaction should remain lightweight. The garden should still make sense with no
mouse interaction at all.

## Lighting and atmosphere

Local-time lighting is implemented in Pixi. A fixed local schedule
holds night from 22:00–05:00, transitions to dawn by 06:00, warms into day by
09:00, holds day until 16:00, warms toward golden hour at 18:00, cools into dusk
at 20:00 and settles back into night by 22:00. Smooth interpolation joins these
anchors without hard hourly switches or geolocation.

Night uses a restrained blue/purple ambient transform and color floor, keeping
soil, grass and plant colors readable. Existing pale/cyan glows and crystal
highlights gain relative prominence; there is no new all-plant glow or bloom.
Weather retains its existing soil darkening and rain, with a small night-storm
compensation to preserve visibility. Pixi lightning remains controlled by its
existing toggle, reduced-motion and optional sound settings.

The shared calculation samples on the existing tick at a 30-second cadence and
quantizes visual changes below about half a color level. A single surface color
pass preserves cached artwork in Pixi; full day is the original image
with the pass disabled. Hidden tabs skip work and resume once using current
browser-local time. There are no new timers, persistence, APIs or ecological
effects. Only `/pixi-live.html` offers named phases and a simulated-hour slider.

Remaining presentation possibilities include seasonal/sunrise-aware boundaries,
directional or longer golden-hour shadows, and carefully selected extra luminous
art. These are not implemented. Current verification covers Chrome, not a long
multi-browser/GPU soak; see [Pixi notes](PIXI-LIVE.md#local-time-lighting-2026-10-20).

<a id="storm-lightning-and-thunder-future-experiment"></a>

### Storm lightning and thunder (implemented Pixi experiment)

Implemented on October 20, 2026 for the default Pixi garden and `/pixi-live.html`:
only `botnet_thunderstorm` and `botnet_hurricane` qualify, never ordinary/heavy
rain. The initial oval-glow experiment was revised into a pale-blue/white bolt
with bounded irregular segments from the top edge and occasional 1–3 branches.
A 10ms attack, brief hold and fade ending at 650ms make the strike readable;
a faint 140ms scene brightening stays secondary. Random
waits are 60–150 seconds for thunderstorms and 45–120 seconds for hurricanes,
starting after each 3.5-second sequence. Hurricanes have a slightly thicker,
stronger bolt and lower-pitched thunder. There are no full-screen white frames
or repeated flashes.

The independent Lightning checkbox and reduced-motion preference suppress the
whole sequence. Thunder requires the existing Sound On gesture and nonzero
volume; filtered noise and a low tonal body follow actual lightning after
0.8–1.3 seconds, lasting 1.8s/2s. Audible midrange replaces the original nearly
sub-bass-only mix. Shared output has a louder full-volume range, gentle volume
curve, compressor and output headroom. Weather
changes, hiding, disable and cleanup cancel effects without delayed replay.
The existing logical tick/ticker drives one overlay with two Graphics and bounded
audio. Paths are built once per event, noise is cached once per context;
there are no extra animation loops, garden RNG draws or per-frame geometry.
Hourly traffic updates alone leave the schedule unchanged. The diagnostic page
alone has a manual eligible-weather trigger. No ecology, classification, backend
or security interpretation changes accompany this atmospheric artwork.

The original severe-weather slice deliberately omitted flashes. This guarded
Pixi experiment revisits that presentation decision while retaining the earlier
historical findings. Longer live evaluation and audible listening remain useful;
See [measurements and
limits](PIXI-LIVE.md). Usability takes priority over spectacle.

Possible later audio polish:

- quiet opt-in weather ambience;
- small vigor-dependent variations in existing species sounds;
- persisted sound/volume preferences.

None of these should turn into alert sounds. PacketGarden audio should remain
pleasant enough to leave enabled.

## Optional desktop / screensaver experience (exploratory)

A windowed or full-screen desktop terrarium could eventually be useful for
people who want to leave PacketGarden open as an idle screensaver-like companion.
Consider packaging the existing Pixi browser experience before contemplating a
renderer rewrite. Godot is only a possible later alternative, not an approved
migration. Preserve the browser version and its existing event/SSE path.

An optional clearly labeled simulated/demo input would let people without
TCPNoise sensors enjoy a garden without suggesting the generated events are
real telemetry. Explore simple installer/startup controls, privacy expectations,
reasonable idle CPU/GPU use, and whether Steam/itch.io distribution or a small
paid edition would be worthwhile. No release, pricing or storefront commitment
has been made. Do not introduce quests, mandatory interaction, a meaningful
score or a resource economy just to make it a "game."

<a id="grass-clearing-when-a-specimen-takes-a-cell-wishlist"></a>

## Grass clearing when a specimen takes a cell (implemented)

The original wishlist proposed clear soil around new plants so exposed blades
would not compete with the specimen artwork. Pixi now remove grass
from exactly the selected destination on successful growth/replacement, before
presenting the new specimen. This is real shared-ecology removal through the
existing `grass-removed` notification, with Pixi Sprite
cleanup and immediate closure of a removed Wild grass inspection card.

Invalid, paused and saturated/dropped events leave grass untouched. Neighboring
grass is not cleared. Natural spread and fake DNS/HTTP influence now consult
the specimen cell map; occupied targets are skipped with no retry or extra roll.
Placement and input-influence thresholds remain unchanged. Plant expiry or
collection creates no grass automatically; neighboring spread may reclaim that
soil later. Fixture imports also skip occupied cells, so the full 640-specimen
diagnostic seed starts with zero grass and gains available soil as plants expire.
If every grass patch has gone, the implemented natural reseeding below can
restart the population at the next eligible scheduled check with even one free cell.

The integration uses successful placement callbacks and event-driven removal,
without a new animation loop or per-frame occupancy sweep. Placement, rarity,
vigor, capacity, lifetimes, grass artwork and separate specimen counts remain.
Deterministic and browser checks cover new growth/replacement, failed events,
occupied influence/spread, later reclamation, inspection and renderer cleanup.

## Ecology and event pressure

Implemented inverse-vigor competition now treats vigor as fullness rather than
strength. TCPNoise counts 0–1, 2–99, 100–9999 and 10000+ produce vigor 0, 1, 2
and 3 respectively; unusable optional counts retain fallback 0 and valid UInt64
inspection strings stay exact. At full plant-or-terrain occupancy, one uniformly
selected eligible resident gets one independent attempt with
`clamp(.25 + .15*(residentVigor-incomingVigor) + .15*ageFraction, .05,.85)`.
Weaker newcomers are favored against fuller/older residents. There is no
weakest-first or oldest-first ranking: age changes the chosen resident's odds.
Protected rare species, active/pending mutations and poppies remain excluded.

One successful saturated replacement starts a global **15s** cooldown. Failures
do not start/extend it, Clear/reseed cannot bypass it, and natural vacancies
always permit ordinary placement with no competition roll. The existing clock
drives incoming-only attempts without timers, retries or hidden-time backlog.
The dedicated competition RNG leaves rarity, placement, terrain, cosmetics and
collectibles independent. Source identity/removal callbacks, actual occupancy,
lifetimes, provenance, counts and Score: 0 keep their existing meanings.
Development-only full gardens show four vigor bands, selectable resident/incoming
levels and young/old ages. See [the policy](EVENT-MAPPINGS.md#inverse-vigor-competition).

The full-grid rule remains intentionally bounded. Richer future ecology
could let repeated traffic reshape existing growth instead of requiring one new
specimen per accepted event.

Ideas already discussed include:

- strengthen an existing specimen or patch;
- make an existing specimen bloom;
- spread an established patch;
- mutate nearby growth;
- let weeds crowd fragile ordinary growth;
- let vines slowly overtake neighboring areas;
- let fungi favor old/decaying areas;
- create a new specimen only when placement makes sense.

This should remain light ecology, not a hidden strategy game. Natural expiry should
continue to matter and equal-strength traffic should not cause constant churn.

## Fuller, greener wild grass (implemented)

Pixi share 12 finite recipes with a substantial overlapping leafy mat
and taller irregular rosettes. Four restrained shades, irregular edges and small
soil gaps give 91–96% mature tile coverage in the reviewed atlas samples.
Growth/shrink/fading deadlines, yellow-to-brown aging, specimen
silhouettes, picking, puddles and local-time lighting retain their behavior.
Pixi bakes once at startup, keeps one Sprite per grass cell and releases its
construction contexts and owned atlas resources. There is no grass animation
loop or new texture source.

One shared helper starts the garden with 12 seeds, one random empty cell in
each distributed region. Natural spreading runs every four seconds, 70% per
attempt, with 1–6 attempts according to reachable mature population. Parents are
never refreshed by spreading. Eight traffic-free seeds reached 78–89% coverage
at ten minutes; the previous policy reached 38–41%.

One scheduled check per minute can plant up to three new patches on available
soil through `influenceGrassCell`, rechecking occupancy. Extinction with even
one free cell guarantees a new patch. One isolated survivor, old dry turf or a
population trapped behind specimens no longer permanently disables recovery.
Healthy spreading populations suppress maintenance. Hidden/resumed pages reset
cadence; missed whole windows are skipped. Saturation still prevents planting;
gnomes or expiry merely release soil for the next natural check.
Fading patches keep their existing one-time 40% seed opportunity until soil is
receptive, allowing successors to establish as old turf expires. Parents retain
the original 20/27/32/35-minute aging schedule. Quiet, synchronized lawns can
still have visible age waves; coverage counts are separate from healthy counts.
No network events, growth statistics, provenance, rarity or Recent activity change.

Comparable Chrome captures cover sparse/young, moderate/dense, mixed specimens,
fading/dying, day/night and rain/puddles in Pixi. They prompted more
irregular clump positioning and transparent atlas-margin corrections. The result
is fuller and greener with soil gaps and readable specimens. Finite variants
can still repeat in artificial uniform fields; long live-traffic and other-GPU
visual tuning remain. See [current measurements and reproduction](PIXI-LIVE.md#lush-grass-and-reliable-recovery-2026-10-21).

## Visual variation

### Vine maturity flowers (implemented in Pixi)

Vines now have their own **15%** cosmetic bloom chance, independent of foliage,
silvervine and broadleaf blooms. One stored draw chooses a stable success/failure
and, on success, soft pink, lavender, pale yellow or white. Small pointed
five-petal flowers sit on the actual stem/curl recipe, distinct from rounded
broadleaf clusters. Isolated vines can bloom too.

An occasional extra flower samples an existing connecting cubic, with one
canonical owner per pair and at most one connection decoration per flowering
vine. Neighbor refresh removes lost-edge flowers. The two/four parent blossoms
plus optional connection flower keep the total between two and five. They open
at one minute, fade from eight and disappear with the parent by ten minutes.
Static cached artwork adds no timers, traffic, gameplay, collectibles or sounds.
Existing connection geometry, foliage and broadleaf probabilities are
unchanged. Local stage, connected/mixed and full grass fixtures live only on the
diagnostic page. See [captures, bounds and checks](PIXI-LIVE.md#vine-maturity-blossoms-2026-10-23).

### Broadleaf maturity blossoms (implemented in Pixi)

Ordinary broadleaves now have one independent **20%** cosmetic chance to bloom
when mature. A stable pink, yellow, white, purple or blue flower color is separate
from foliage color and the unchanged rare rainbow roll. One to three small,
rounded blossoms sit among the existing leaves; these remain leafy plants,
without becoming standalone flower specimens or producing collectibles.

Sprouts and growing plants have no open blossoms. Maturity reveals the decoration,
fading mutes/shrinks/droops it with the leaves, and expiry or replacement removes
the exact parent's presentation. Fifteen finite atlas frames and one optional
child Sprite keep it static and bounded. No traffic reinforcement, new events,
statistics, scores, drops, sound or ecology effect is attached.  The diagnostic page provides deterministic local stage/color
and 640-broadleaf grass fixtures; the homepage has no added development controls.
See [implementation and reviewed captures](PIXI-LIVE.md#broadleaf-maturity-blossoms-2026-10-22).

### Other variation

Color variants are implemented, including rare cosmetic schemes and rainbow
broadleaf growth. Possible later variation can use safe traits such as:

- markings;
- minor shape differences;
- leaf/petal arrangements;
- subtle sensor/network-class influence;
- rare animation details.

Vine palette tuning is implemented: after the existing 1% **silvervine** roll,
ordinary hue weights are **aqua 70%**, lime 15%, chartreuse 10%, and **olive 5%**.
Both live and fake vines use this cosmetic exception to vigor-based hue selection.
Vigor still changes structure, thickness, detail, and competition. The selected
hue persists and carries no traffic/security meaning or backend rarity change.

Cosmetic rarity should stay distinct from backend TCPNoise rarity unless there is
a deliberate reason to combine them.

## Long-term garden memory

Fallen blackthorn logs are the first implemented **long-lived blocking terrain**
slice. Each naturally expired blackthorn gets one dedicated **30%** decision;
at most **six** logs last **60 minutes** from the tree's natural 12-minute expiry.
The source must still match its original object/id/cell/coordinates/time at
natural removal and its cell must actually be empty afterward. Forced removal,
gnome actions, special mutations, Clear and reseeding never generate logs.
Full-cap attempts are consumed without queue, retry or displacement.

Logs occupy a separate terrain model/map, leaving the specimen array, network
activity, vigor, provenance and Score: 0 unchanged. Real placement excludes their
cells. A garden with six logs can hold 634 plants; inverse-vigor
competition still replaces eligible plant occupants only. Gnome overcrowding
counts actual free cells including terrain; its living-specimen denominator,
priorities and cooldowns remain. Stillbloom uses truly free cells. Grass keeps
its existing under-plants checkbox policy: logs prevent new grass and clear
grass on arrival when disabled; enabling it permits grass beneath the wood.
No grass influence or automatic grass refill comes from a log.

Three small cached crooked, dark-brown logs have broken/cut ends, moss and
minor color variation. They use at most six static Sprites and no animation
work. Natural decay releases the cell, allowing ordinary growth later. Hidden
time counts toward the absolute hour; a completely missed log lifetime consumes
the attempt without creating fresh terrain. Source objects are not retained,
and changing a removed tree cannot change its log. Clear/reload/teardown remove
terrain. Diagnostic controls preview simulated aging, success, cap, full/dense
gardens, blocked growth and decay/regrowth. See
[actual-scale evidence and validation](PIXI-LIVE.md#fallen-blackthorn-logs-2026-10-28).

### Great Gnome Campfire Incident (implemented)

Gnomes can now discover and consume an existing fallen blackthorn log. The
shared 45-second/2% incident check first keeps the existing 30% mushroom-heist
branch, then gives an ordinary-dispute outcome a 40% campfire branch if eligible
terrain exists. There is no second scheduler or concurrent gnome incident.
Two or three campers approach/gather, ignite after four seconds, burn the real
blocking log and remove that exact object through `terrain.remove()` after
17 seconds. Departure finishes by 21 seconds. No collectible, points, network
event, plant replacement or special regrowth is invented; normal occupancy
immediately makes the freed cell available.

Object/id, cell/coordinates and original creation/expiry times are revalidated.
Natural decay, stale/replaced targets, hiding and clock gaps over 1.5 seconds
cancel safely without a later burn or removal. Already consumed wood stays gone.
Existing gnome poses and underpants attempts remain; only three tiny cached
fire/ember frames and a temporary borrowed-texture char overlay are new. Reduced
motion uses a steady flame and restrained actor movement. Rain retains its
existing presentation without introducing extinguishing or fire-spread rules.
Diagnostics remain on `/pixi-live.html` only. See
[the native-scale review and resource measurements](PIXI-LIVE.md#great-gnome-campfire-incident-2026-10-28).

Simple persistence across browser/server restarts remains desirable. The goal is to
preserve the feeling that the garden has history without turning PacketGarden into
a telemetry database.

### Log-dwelling garden snails (implemented)

Actual fallen logs now host an independent, bounded wildlife visit: **45s / 25% /
one arrival per check / two active / 75s**. These are not first-seen collectible
snails. Four precomputed neighboring waypoints provide slow crawling, pauses,
directional facing and subtle cached body motion. Each visit selects at most
two exact existing grass objects along that route and can consume them only
through `garden-ecology.removeGrassCell()` at its two grazing slots. A stale or
replaced patch is skipped without choosing another; no special regrowth occurs.

Log object/id/cell/creation identity stays authoritative. Natural decay,
campfire, clear and other source removal start departure and release source/
grass references; hiding, long stalls and backwards clocks cancel without
missed spawn or grazing replay. One acknowledgment per individual uses
"The snail continues being a snail. +0 points". Repeated hits do not collect,
remove or repeatedly announce it. Existing collectible-snail messages, frog/
gnome priority, mutations, drops, garden activity and Score: 0 are preserved.
Three shell palettes with crawl/nibble poses share the existing ambient atlas.
Only `/pixi-live.html` has source/grass/spawn/graze/removal/motion/cancellation
fixtures. See [the native-scale review and bounds](PIXI-LIVE.md#log-dwelling-garden-snails-2026-10-29).

Longer-lived terrain/history ideas from the vision include:

- rocks;
- additional logs/woodland terrain (fallen blackthorn logs are implemented above);
- longer-lived ponds;
- fallen branches;
- tiny garden structures;
- slow-growing trees from genuinely long-lived connection telemetry.

These can live for hours or days while common plants continue cycling over minutes.
Short-lived storm puddles belong to the weather-residue layer below rather than
needing to become persistent terrain.

## Additional event sources

TCPNoise is the first discrete live source. Future adapters could use trustworthy
higher-level telemetry for effects that a raw destination-port hit cannot establish.
Examples already discussed include:

- DNS activity;
- HTTP/HTTPS activity;
- real protocol-aware SSH connection telemetry;
- Gopher activity;
- Gemini activity;
- service failure/recovery;
- long-lived connections;
- other existing sensors/services publishing normalized summaries through NATS.

The mapping should stay playful, but the data meaning must remain honest. A port hit
is not authentication, a weird plant is not a threat score, and a dramatic garden
is not an intrusion-detection system.

## Environmental pressure and weather residue

Aggregate pressure is already used for weather. Possible extensions include:

- other pollen bursts beyond the implemented cosmetic wirefern release; any
  future pressure-driven effect must remain distinct from the current 30s check;
- wind events;
- other short-lived environmental effects when a traffic burst should not create
  hundreds of permanent specimens;
- eventual ecological responses to aggregate pressure, only if they remain subtle
  and understandable.

### Heavy-rain puddles

Heavy weather now leaves temporary terrain behind so the garden has a memory of a
storm after the rain animation stops.

Implemented first slice:

- only `heavy_rain`, `botnet_thunderstorm`, and `botnet_hurricane` may create or
  refresh puddles;
- one formation/refresh check every 15 seconds on the existing garden tick;
- cap at eight logical patches, separate from all organism/actor state;
- action chances are 35% heavy rain, 60% thunderstorm, and 85% hurricane;
- existing water has a 60% refresh/growth preference; new patches often appear
  nearby, and successful attempts at the cap only refresh existing water;
- neighboring puddles may render as one irregular little pool;
- puddles are terrain, not specimens, and consume no specimen slot;
- no formation while hidden or catch-up checks after suspension; resume schedules
  the next attempt from current time and discards expired water;
- once weather drops below heavy rain, stop forming/refreshing puddles and let them
  drain gradually;
- 30 seconds after the last refresh, water gradually shrinks/fades over eight
  minutes before disappearing;
- four shared illustrated pool variants replace the three overlapping ellipses:
  irregular soft shores, blue-green/slate water, lighter shallows, broken sky
  reflections and restrained static glints. The existing seed selects a stable
  silhouette/palette through growth, refresh and drainage. Pixi bakes four frames into the existing ecology atlas with one Sprite
  per puddle. Cached order remains grass -> water -> specimens, with unchanged
  visual deadlines and no extra animation, shader, particle or timer;
- no collection, Recent activity entry, provenance, inventory, or persistence.

Water does not damage plants or create a survival mechanic. Grass beneath water
looks tinted/partially submerged and returns to normal as the puddle drains,
without any change to grass lifetime, influence, or spreading.
The artwork pass changes no logical dimensions, positions, weather eligibility,
creation rolls, frog wetness thresholds or exact-puddle references. Matching
small/large/overlap/grass/frog/day/night/hurricane/drain captures and resource
measurements are recorded in [Pixi live notes](PIXI-LIVE.md#illustrated-storm-puddles-2026-10-21).

Temporary water now supports passive frogs and **gnome puddle mishaps**.
Moving gnomes get one independent 20% roll on a fresh entry into conservatively
visible interior water, at most one successful mishap per actor/incident. The
existing logical tick checks bounded foot-path segments using shared size and
wetness. Four contracted organic contours exclude soft/transparent shores;
overlapping pools count as continuous water and standing in water never retries.
Removed, replaced, faint or drained water cannot inherit an entry or reaction.
The gnome briefly stumbles, splashes and displays `!`, then continues after about
one second. All work/fighting/departure schedules and underpants behavior remain
unchanged; reduced motion uses a still reaction. Hidden/cleared incidents release
reaction state/resources, with no missed-entry replay or new sounds. Pixi
share state/art; Pixi adds one finite ripple tile in the existing gnome atlas.
The deterministic local-water demonstration is development-only. See
[validation and resource measurements](PIXI-LIVE.md#gnome-puddle-mishaps-2026-10-21).

Further interactions remain future work:

- snails may be more likely after rain;
- occasional ambient water ripples, beyond the implemented mishap ripple;
- a floating leaf;
- a first-seen curiosity could choose a frog when suitable water already exists.

The useful causal chain is:

```text
aggregate traffic pressure -> severe weather -> temporary puddles -> slow drainage
```

That adds environmental history without pretending the rain is a damaging event.

Lightning/flashing was intentionally omitted from the original severe-weather
slice. The guarded Pixi experiment above now adds optional smooth illumination;
Pixi does not use strobing.

## Keep the weirdness earned

The prototype became more interesting once rare colors, odd species, weather,
aging, and gnomes could overlap naturally. Future ideas should preserve that
emergent feeling.

A good PacketGarden feature should make somebody glance back at the tab and think
something like:

> Wait. What the hell are they doing now?

Then the garden should carry on without demanding anything from them.
