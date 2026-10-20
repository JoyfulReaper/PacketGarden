# PacketGarden Ideas and Future Directions

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

The production homepage now uses PixiJS/WebGL, with the original Canvas garden
preserved at `/canvas.html` and development controls at `/pixi-live.html`.
The Pixi presentation has revised vine, broadleaf, blackthorn, weed and other
plant artwork, larger specimen sprites, and separated grass tufts. The logical
32×20 grid, capacity, ecology and lifetimes have not been enlarged or changed
by those visual passes.

Both renderers now share opt-in Web Audio (Off initially, 12% initial volume)
for successful growth, rare flourishes, pointless collections and the original
Gnome Incident. Its shared model retains the 30-specimen threshold, 2% check
every 45 seconds, four actors and 12-second cleanup. The homepage also shows
Noise Observatory's five-minute-average events/minute and actual reported
last-hour count over the existing SSE feed. Exact TCPNoise listening ports
420 and 42069 use an ordinary weed base, distinct from the collectible port-22
mutation. These are implemented features, not wishlist tasks; see [MVP](MVP.md)
and [Pixi live notes](PIXI-LIVE.md) for exact behavior and limitations.

## Ambient actors and incidents

The browser now has a transient actor/event layer because of The Gnome Incident.
First-seen visitors use their own bounded curiosity collection because gnome
cleanup owns the actor array. Neither layer consumes specimen cells or affects
plant ecology.

Possible visitors include:

- frogs;
- bugs;
- birds;
- snails;
- other tiny garden creatures;
- occasional mysterious little network demons or similarly inexplicable visitors.

These should normally be uncommon and short-lived. A frog that appears once in a
long session is more memorable than a permanent crowd of frogs.

Possible gnome incidents:

- a lone gnome walks across the garden carrying something it apparently stole;
- two gnomes drag a mushroom somewhere for reasons never explained;
- one gnome chases another across the garden;
- a tiny gnome funeral procession;
- one gnome appears, looks around, and immediately leaves;
- a wizard gnome briefly interacts with a rare specimen and vanishes;
- a few gnomes build a tiny temporary campfire;
- a much rarer **Gnome Civil War** as an escalated spectacle.

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
their own transient array, with a max-three cap independent of curiosities and
mutations and a 20-second active lifetime. A due attempt at the cap never retries.
Logical cleanup shares the existing tick, while procedural red caps, white spots,
and pale stems bob on the dynamic overlay without invalidating base ecology.
They occupy no cells and affect no grass, puddles, gnomes, or Recent activity.
Clicks collect curiosities before drops, then mutations before inspection.
Collection says `You found Amanita muscaria. +0 points` with optional quiet sound;
Score stays 0, with no inventory, persistence, use, or consumption mechanics.
Only live successful mushroom growth triggers the roll; it says nothing about
traffic protocol, payload, remote identity, or security. The small loose-drop
registry is a future reuse seam, with only Amanita implemented now.

### Vine -> opium mutation

This remains future work. Use the same semantic pattern for vines rather than
spawning an unrelated plant beside them:

1. a live event first produces its normal vine;
2. on a much rarer browser-only mutation roll, that exact vine may visibly mutate
   into a stylized opium-poppy / opium-plant form;
3. the mutation keeps the original specimen's cell, safe TCPNoise provenance,
   vigor, and history rather than inventing another network event;
4. while the mutation exists, it may have a still rarer chance to produce a
   temporary clickable opium pod;
5. the pod uses the same bounded transient collectible system and disappears if
   ignored.

A collected pod can say:

```text
You collected an opium pod. +0 points
```

This is visual garden nonsense only. It says nothing about the protocol, source,
intent, or security meaning of the traffic that created the vine. It must not grow
into crafting, processing, inventory, trade, or any useful resource system.
Because vines live much longer than redblooms, the vine mutation should be rarer
than the redbloom -> weed mutation so mutated plants do not accumulate everywhere.

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

## Quiet-only growth

Quietness should have a positive visual identity instead of the garden becoming
interesting only when sensors are busy.

A rare species -- working name **Stillbloom** -- could grow only after a genuinely
quiet period. It belongs to the aggregate/environmental layer rather than TCPNoise
port rarity.

Important distinction: **quiet is not the same thing as broken telemetry**. A
quiet-only plant should require a fresh/healthy aggregate source so a disconnected
or stale sensor feed cannot accidentally create "peaceful" growth.

A possible first version:

- require activity to remain at zero or below a deliberately low threshold for
  roughly 5–10 continuous minutes;
- after the quiet threshold is reached, make only a small bounded roll every 2–5
  minutes;
- cap the rare quiet species at perhaps 1–2 active specimens;
- do not replay missed rolls after tab suspension;
- meaningful traffic immediately prevents new quiet-only growth;
- already-grown Stillblooms remain and age naturally rather than vanishing the
  instant activity resumes;
- inspection should identify the source as something like `Sustained quiet`
  rather than inventing a sensor, port, or discrete event.

Visually it should not be confused with ghostbloom: thin silver-green growth, a
large pale flower, or another restrained design that reads as something able to
appear only after the garden has been left in peace. A mature form could have a
very faint glow, especially once local-time night lighting exists.

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

Still-planned presentation work:

- gradual local-time morning/day/sunset/night lighting;
- a readable night garden rather than realistic darkness;
- make luminous/rare specimens more noticeable after dark;
- subtle transitions rather than abrupt time-of-day switches.

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
Canvas lighting parity is a separate future decision. See [measurements and
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

## Grass clearing when a specimen takes a cell (wishlist)

Today grass and specimens use separate layers and can occupy the same logical
cell. Grass renders beneath a plant, but exposed blades may compete visually
with the larger artwork, especially when a specimen is small or fading.

**Proposed behavior:** When a plant **successfully spawns or replaces** another
specimen, check its destination cell. If that cell already has grass, remove
the grass from that cell as part of the successful placement, before presenting
the new plant. The result should be a clean patch of soil around the new
specimen, while neighboring grass remains untouched.

Important implementation choices for a future focused pass:

- Prefer actual removal from the shared grass ecology model, with the normal
  grass-removed notification and renderer cleanup, rather than merely hiding a
  sprite in Pixi. Confirm the visual result against a mask-only approach before
  committing to an ecology change.
- Never clear grass for invalid, paused or saturated/dropped events; the plant
  must actually occupy the chosen cell first. Replacement clears the
  destination once, not a second/random cell.
- Keep planting, clearing, and the visible update in one logical operation,
  without making an empty-looking frame or changing specimen placement, rarity,
  vigor, capacity or lifetimes.
- Decide explicitly how grass can return: it should not instantly respawn
  beneath the same occupied cell through grass spread or fake DNS/HTTP influence.
  After the plant expires, ordinary neighboring spread could recolonize the
  cleared soil; removal alone should not magically generate new grass.
- Apply the same rule to Canvas and Pixi through shared model integration,
  and test new growth, replacement, expiry, rejected growth, nearby spread
  and visual/cache cleanup. Avoid added per-frame work.

This is a visual/ecological polish proposal, **not currently implemented**.
The existing separation of grass and specimen cell capacity remains valuable.

## Ecology and event pressure

The current full-grid vigor rule is intentionally bounded. Richer future ecology
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

## Visual variation

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

Simple persistence across browser/server restarts remains desirable. The goal is to
preserve the feeling that the garden has history without turning PacketGarden into
a telemetry database.

Longer-lived terrain/history ideas from the vision include:

- rocks;
- logs;
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

- pollen/spore bursts;
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
- three stable procedural ellipses per patch render in the cached scene after
  grass and before specimens; no RAF-based terrain rendering or extra timers;
- no collection, Recent activity entry, provenance, inventory, or persistence.

Water does not damage plants or create a survival mechanic. Grass beneath water
looks tinted/partially submerged and returns to normal as the puddle drains,
without any change to grass lifetime, influence, or spreading.

Temporary water also gives later ambient behavior a natural place to happen.
These interactions remain future work:

- frogs may appear near puddles;
- snails may be more likely after rain;
- occasional small ripples;
- a floating leaf;
- a gnome can eventually walk through a puddle and become extremely displeased;
- a first-seen curiosity could choose a frog when suitable water already exists.

The useful causal chain is:

```text
aggregate traffic pressure -> severe weather -> temporary puddles -> slow drainage
```

That adds environmental history without pretending the rain is a damaging event.

Lightning/flashing was intentionally omitted from the original severe-weather
slice. The guarded Pixi experiment above now adds optional smooth illumination;
Canvas retains the original presentation. Neither renderer uses strobing.

## Keep the weirdness earned

The prototype became more interesting once rare colors, odd species, weather,
aging, and gnomes could overlap naturally. Future ideas should preserve that
emergent feeling.

A good PacketGarden feature should make somebody glance back at the tab and think
something like:

> Wait. What the hell are they doing now?

Then the garden should carry on without demanding anything from them.
