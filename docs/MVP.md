# PacketGarden MVP

Supported renderer: **PixiJS/WebGL**. The legacy Canvas renderer is retired;
`/canvas.html` is a script-free redirect. Current dependencies and test migration
are documented in [the retirement audit](CANVAS-RETIREMENT.md).

## Goal

Build the smallest browser prototype that proves the core idea:

> Network-shaped events visibly grow and reshape a top-down garden that is interesting to watch.

The prototype now has a default PixiJS/WebGL garden, a Pixi diagnostic page,
real TCPNoise input, live aggregate weather, lifecycles, grass ecology, color
variation, bounded competition, click inspection, shared opt-in sound, a shared
Gnome Incident, and pointless collectibles. Persistence and additional
sensor/service inputs remain goals.

## Completed prototype capabilities

- Pixi vine maturity blossoms: a separate one-time 15% cosmetic roll per vine,
  four soft colors, two/four small pointed-petal flowers along the existing stem
  and curls, plus at most one decoration on an actual connecting half-curve.
  Canonical ownership prevents duplicates; neighbor refresh removes lost-edge
  flowers. Mature at 60 seconds, faded at eight minutes, gone with the parent
  by ten minutes or removal. Forty neutral group frames plus one link frame
  share the specimen atlas; at most two extra Sprites per flowering vine.
  Silvervine/foliage, original curves/eligibility, shared lifecycle, broadleaf
  blooms, ecology, network, picking, sound and score remain unchanged. Fixtures
  appear only on `/pixi-live.html`.
- Pixi broadleaf maturity blossoms: one independent 20% cosmetic draw per ordinary
  broadleaf, with a stable pink/yellow/white/purple/blue color and one to three
  small flowers among the existing leaves. Hidden before maturity, faded with
  the parent, removed on expiry/replacement. Fifteen cached frames share the
  specimen atlas; at most one child Sprite per blooming parent, no new source,
  timers or loops. Foliage variants, rare rainbow probability, occupancy, vigor,
  lifespan, picking, provenance, counts, sounds and scores remain unchanged.
  Stage/color and 640-parent grass fixtures are diagnostic-only.
- Pixi page lifetime ownership: idempotent teardown invalidates callbacks before
  stopping/releasing resources, removes owned input/media/visibility/resize/SSE
  listeners and the ticker callback, and cleans up late/failed initialization.
  Normal hide/show resumes current state once without replay. Live pages retain
  reload-on-bfcache-return; the synthetic stress page retains stopped resources
  until restoration or final teardown. Focused Chrome tests reproduce the old
  race and verify queued callbacks and cleanup; no garden or event rules changed.
  See [validation and browser limits](PIXI-LIVE.md#pixi-page-lifecycle-fix-2026-10-21).
- Gnome puddle mishaps in Pixi: one independent 20% roll per fresh moving
  entry into visible shared water (size >=8, model opacity >=0.12), at most one
  success per gnome/incident. Conservative interiors derive from all four organic
  water recipes; bounded foot-path segments are checked on the existing 250ms
  tick, including complete crossings between samples. Overlapping pools merge
  into continuous water; standing in water never repeats rolls. A one-second
  startled/stumbling pose, tiny ripple and `!` leave movement, fighting, all
  landscaping modes and underpants clicks unchanged. Reduced motion is still;
  hidden/cleared/expired-water state and Sprites clean up without replay. One
  extra cached gnome-atlas frame, at most four temporary ripple Sprites, no new
  source/timer/loop/sound. Deterministic diagnostic trigger only on `/pixi-live.html`;
  water, frogs, plants, drops, scores, traffic and Recent activity rules are unchanged.
- Illustrated storm pools in Pixi: four shared organic silhouettes chosen
  deterministically from each existing puddle seed, subdued teal/slate water,
  soft shores, shallow-water marks and static reflected-sky glints. Pixi uses four frames in
  the existing ecology atlas and one Sprite per puddle. No new loops, shaders,
  particles or texture sources. All water state/timing, layering and exact frog
  references/eligibility remain unchanged. Matching before/after captures cover
  small/mature/overlapping/grass/frog/night/hurricane/drained water; see
  [artwork measurements and limits](PIXI-LIVE.md#illustrated-storm-puddles-2026-10-21).
- Passive puddle frogs in Pixi: at most two, one strict 15% roll every
  45 seconds when actual shared water has visible size >=8 and opacity >=0.12.
  Weather alone is insufficient; retained water after storms still qualifies.
  Each roughly 60-second visit has two or three small planned hops and occasional
  glances, with a 1.5-second fading exit if its exact puddle is lost or dries.
  Independent randomness, bounded positions, reduced-motion discrete sitting
  poses, and no hidden/suspended catch-up. Separate wildlife consumes no specimen,
  curiosity, drop or gnome slots and changes no ecology, score, sounds,
  statistics or activity. Existing 250ms/visual schedulers, six finite Pixi frames
  in the ambient atlas and at most two Sprites;  The simulated
  water/two-visit trigger appears only on `/pixi-live.html`.
- Each exact visible frog acknowledges its first click with `The frog ignores you +0 points`
  in the existing two-second message UI. Its visit remains unchanged; repeat clicks
  consume input without renewing the message or reaching underlying plants/grass.
  Shared hit testing follows current hop/departure/reduced-motion positions, after
  gnomes/curiosities/drops and before mutations/inspection. Removed, stale, hidden
  and fully faded frogs cannot be clicked. No collection, sound, inventory or activity.
- Every successful gnome dispute or vine/overcrowding/weed-harvest start emits one
  shared arrival cue: a roughly 550ms nasal two-tone “gnooo-mz!” musical illusion,
  synthesized locally without speech or recordings. Sound Off/12% default, explicit
  activation, volume/master/compressor and existing battle/victory cues remain.
  At most two arrival oscillators, filters and envelope gains exist briefly; cleanup
  includes completion, mute, Off, hiding, page disposal and partial failure. Failed starts, ticks, phase
  updates and resume do not replay it. Existing diagnostic triggers demonstrate both
  additions; a diagnostic-only **Preview gnome sound** uses the identical cue and
  reports audio availability without enabling/resuming a context or changing the
  garden. A held vowel, preserved fundamental and gentle buzz correct the old
  cue's low level at 12%; native Chrome PCM checks guard signal and cleanup.
  There are no new production controls, timers, artwork or dependencies.
  See [audio diagnosis](GNOME-AUDIO.md).
- ASP.NET Core / .NET host serving HTML, CSS, and vanilla JavaScript.
- Default PixiJS/WebGL garden at `/` and `/index.html`, a script-free legacy bookmark redirect at `/canvas.html`, and a separate Pixi diagnostic/live-soak page at `/pixi-live.html`; all retain the 32×20 logical garden, bounded capacity, and shared model rules.
- Session-only **Allow grass under plants** checkbox on both live Pixi pages, OFF on reload. The shared ecology model allows natural spread, seed/refresh and retained grass beneath new/replacement plants when ON; OFF immediately removes only overlaps. No instant fill on enable. At most 640 distinct grass cells, including beneath a full 640-plant garden; normal aging/expiry, grass-first layering, specimen inspection and all plant rules remain unchanged.
- Pixi has cached, larger and revised plant artwork (including vines, broadleaf, blackthorn and ordinary weed), collection/inspection, and bounded rendering resources; no logical cell-size or lifecycle change from visual polish. The Pixi garden draws dense leafy wild grass with taller rosettes using 12 shared finite recipes, about 91–96% mature tile coverage in the original atlas samples, and preserved aging, inspection, water layering and lighting. Pixi retains one Sprite per grass cell, with a slightly darker/muted age palette and 12 feathered occupied-grass frames selected from actual specimen occupancy. A small cached contact shadow appears only for overlapping plants (at most 640), follows their base/scale and leaves with the exact parent or grass. No plant palette, shared ecology, input, checkbox semantics, timers or loops change. Its existing ecology atlas holds 29 frames on the same source, adding 1 MiB of RGBA backing. See [visual comparisons and checks](PIXI-LIVE.md#grass-and-plant-visual-separation-2026-10-23).
- Local-time atmospheric lighting in Pixi: smooth dawn/day/golden-hour/dusk/night transitions at fixed local-time anchors, with readable cool nights and preserved specimen colors. Existing cyan/white luminous art stands out without added bloom. One shared, quantized surface color transform leaves cached geometry/textures untouched and is disabled at day. The existing logical tick samples every 30 seconds, skips identical values and hidden work, handles clock/timezone changes and refreshes once on resume. Existing weather/rain/lightning/sound/reduced-motion controls compose unchanged, with a restrained night-storm compensation. Diagnostic presets and a 0–24 hour slider appear only on `/pixi-live.html`; public pages use actual local time. No ecology, growth, rarity, provenance, activity, backend or network changes. Directional shadows, seasonal sun times, long GPU/compositor profiling and other-browser verification remain outside this slice.
- Five development mappings: DNS flowers, HTTP broad-leaf plants, SSH thorny vines, Gopher mushrooms, and port-22-probe red blooms.
- Simple procedural art, including visual connections between neighboring vine cells.
- Explicit simulated development fixtures on `/pixi-live.html`; the retired automatic fake-traffic controls are no longer available.
- Manual weather levels and an Events/min intensity preview, rendered separately from ecology with no effects on specimens or grass.
- Live aggregate weather from Noise Observatory through backend polling and SSE, sharing the existing garden renderers.
- The default homepage shows Observatory events/minute as a five-minute average and the actual source-reported last-hour count via existing SSE; these are aggregate traffic statistics, not the number of successful garden spawns. A bounded 5,000-event Observatory store may undercount the last hour during high traffic.
- Stronger severe visual weather with wind-driven hurricane rain and no ecological damage.
- Pixi-only optional storm lightning: a pale segmented bolt with occasional branches, 650ms fast attack/fade and faint 140ms supporting brightening for `botnet_thunderstorm`/`botnet_hurricane`. Irregular 60–150s/45–120s waits, independent Lightning control and reduced-motion suppression remain. Optional delayed filtered-noise thunder shares Sound On/volume; hidden pages cancel without catch-up. No ordinary/heavy-rain lightning, backend or ecology changes.  See [Pixi implementation](PIXI-LIVE.md).
- Temporary storm-water terrain: heavy rain/thunderstorm/hurricane only, one check per 15 seconds with 35%/60%/85% chances. At most eight patches; existing water is usually refreshed/grown (60%), new patches often join nearby pools, and the cap forces refresh. Sizes grow gradually to a bounded maximum. Water holds for 30 seconds after refresh, then shrinks/fades over eight minutes. Hidden pages skip formation and resume on a fresh schedule without catch-up. Cached draw order is grass, water, specimens. No occupancy, provenance, plant damage, grass mutation, collection, extra Recent activity, or persistence.
- Shared Pixi browser-local Web Audio growth and collection sounds, Off by default at 12% volume and initialized only by an enable gesture. A gentle volume curve, compressor and output headroom provide louder full-volume output without changing species envelopes. Species tones (including wirefern), gentle rare chimes and gnome battle/victory cues represent artistic events, not security alerts; independent 400 ms ordinary / 900 ms rare cooldowns drop extra sounds without delaying growth.
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
- Stillbloom: at most two protected, ivory/silver-green flowers after ten continuously observed minutes of verified healthy Live `quiet` weather. One 10% roll at minute ten, then every three minutes; free cells only, no replacement or catch-up. Backend 30-second upstream leases and continuity generations distinguish valid polling from retained values, including same-value outage/recovery. Disconnects, staleness, other weather, hidden time and long logical stalls reset qualification. Sprouting <30s, growing <90s, fading from minute 17, expiry at 20. Cached Pixi parity and sustained-quiet inspection, with no invented network provenance, incoming counts/activity, sound or grass influence. Development simulation is confined to `/pixi-live.html`.
- Lifecycle timings tuned for several minutes of visual history: flowers last 4 minutes, mushrooms 5, broad-leaf plants 6, vines 10, and red blooms 30 seconds; rare species can remain longer.
- Persistent cosmetic color variants selected once per specimen. Live common palettes follow vigor except for vine hue. Both live/fake vines use ordinary weights of 70% aqua, 15% lime, 10% chartreuse, and 5% olive after the unchanged 1% silvervine roll; vigor still changes vine structure/detail and competition. Other species keep their existing color behavior. Broadleaf includes a rare rainbow scheme; all rare colors remain purely cosmetic and separate from backend rarity.
- A 250 ms logical loop that removes expired specimens and frees their cells. Base ecology repaints on actual state changes or one aggregate visual deadline, with no recurring paint for mature/static objects. Stage-based specimens wait for their next lifecycle boundary; continuous grass growth/fading uses bounded updates, and puddles use meaningful radius/opacity thresholds. Hidden pages resume current state without replay. Resizing preserves state.
- Click-to-inspect information cards with scaled-canvas hit testing. Empty-soil click, Escape, or the close button dismisses the card; it also closes if the exact inspected specimen expires or is displaced. Fake specimens are labeled as simulated rather than inventing provenance.
- One authoritative live garden handler: validate/sanitize the current contract, attach TCPNoise provenance directly to the exact specimen at creation before rendering, and expose spawned/replaced/dropped outcomes. No second inspection SSE listener or fresh-specimen search.
- A small Recent activity view retaining the newest three normalized safe events in browser memory, including valid dropped-at-saturation events marked `no growth`. Fake events are explicitly simulated. Relative ages share the existing update loop; reload clears the list. No raw frames, expanded history, persistence, or replacement for monitoring.
- A shared Pixi browser-only Gnome Incident model: at least 30 living specimens, one 2% check every 45 seconds, no catch-up rolls, and at most one 12-second red/green gnome dispute. Pixi uses 14 cached artwork frames (including two clipper poses) and at most four active sprites; actors approach, shove, retreat/celebrate, then disappear without affecting occupancy, plants, grass, weather, or network meaning. Tiny optional cues share existing sound controls.
- Implemented cosmetic wirefern sori: one dedicated 25% selection sample per successfully created wirefern, with stable success or failed-null trait. Nine equally likely color/layout pairs are independent of vigor, foliage and every existing random stream; rare afterglow retains its original 1% rule and can carry sori. Two to four three-dot groups sample actual angular frond segments. Three cached layout frames fit unused specimen-atlas slots; one child Sprite per selected mature fern inherits its exact parent scale/position. No sori before 50 seconds, dim/desaturate from five minutes and disappear on six-minute expiry, replacement, removal, Clear or teardown. No airborne spores, drops, spreading, specimen slots, inspection changes, sounds, activity or score effects. Diagnostic-only stages/all 180 pairs/mixed grass/dense 640/expiry/replacement fixtures are simulated. See [wirefern review](PIXI-LIVE.md#wirefern-sori-2026-10-27).
- Gnome Landscaping Department: the same 45-second check has a 10% vine-mode chance when at least 20 ordinary living vines comprise 40% of living specimens, with a seven-minute arrival-to-arrival cooldown. One worker with clippers and one useless supervisor trim a fixed route of roughly 25% of eligible vines, capped at eight, through the garden's `remove()` lifecycle. Each snip revalidates identity, occupancy, lifetime and eligibility; silvervines, mutations and unrelated/protected species are excluded. Freed cells allow normal growth. Incidents cannot overlap the original dispute; hiding or a logical stall cancels safely without catch-up. Reduced motion uses discrete positions/static poses. Temporary actors with an optional arrival cue; no changes to network contracts, growth counts, provenance or Recent activity. `/pixi-live.html` provides a local diagnostic fixture/trigger; live-traffic visual tuning remains.
- Emergency overcrowding relief is a second mode of that same incident. All 640 specimen cells must be occupied; one 25% roll replaces the vine roll on each eligible 45-second check. Failures do nothing and consume no cooldown; both modes share the seven-minute cooldown and original-dispute exclusion. Random ordinary living plants of any species may be cut, excluding rare species/palettes, mutations and collectibles. Aim for 32 free cells, stop at 32 successful removals, exhausted eligible sampled targets or a 45-second work deadline. At most 64 original targets are sampled once; stale/replaced targets are skipped safely and new arrivals are never chased. Traffic can refill cells, so relief is best effort. Same actors, snips, hidden/reduced-motion behavior and cleanup in Pixi, with no extra textures, timers or network/statistics effects. Separate vine and full-garden diagnostic buttons are available only on `/pixi-live.html`.
- Pixi includes port-22 redbloom-to-weed mutations, separate Amanita muscaria drops, first-seen visitors, ordinary-weed buds, shared click precedence and `+0 points` messages, with bounded cleanup. Cached artwork consumes the renderer-neutral models.
- Weed harvesting: a third shared landscaping mode, eligible with at least three mature ordinary weeds. One 5% roll after fight/overcrowding/vine priority on the existing 45-second check; full-garden failures never fall through. Shares the seven-minute cooldown and actor lifecycle. One worker and suspicious sack carrier visit 1–3 original weeds, rechecking exact reference/id, cell, creation time, maturity, protection and pending-bud exclusion before each authoritative removal. Hidden/stalled visits cancel; reduced motion uses static poses. Active buds remain independent. Diagnostic-only simulated trigger at `/pixi-live.html`.
- Clickable gnomes: every active incident uses shared last-rendered transforms for centralized hit testing, before curiosity/drop/mutation/inspection. One underpants attempt per actor per appearance, consumed even at the shared five-drop cap. A 600ms surprise pose leaves the activity running; the white underpants are an independent 20-second loose drop. Collection chooses the exact 80/20 joke messages, retains the existing two-second message/optional sound and static Score: 0, with no points or annoyance state. Cached Pixi artwork share cleanup; mixed-drop/message diagnostics remain development-only.
- Implemented cosmetic vine-to-opium-poppy mutation: one independent 0.5% roll per successfully spawned/replaced ordinary live TCPNoise vine, excluding silvervine, simulated and rejected growth. The same vine transforms at 60 seconds if fewer than two poppies are active; failed/cap-skipped attempts are permanently consumed. Normal sprout/growth, eight-minute fading and ten-minute expiry remain. Separate `poppyMutation` state never enters collectible weed expiry/collection. Cached mauve petals, gray-green leaves and a slender stem replace the vine texture on the same Sprite; original blossoms and both neighboring connection halves reconcile locally. Gnomes exclude active poppies; clicking opens truthful original-vine inspection. No extra specimens, activity, network frames, sounds or score. Diagnostic-only before/mature/fade/flower/grass/connection/expiry/replacement fixtures are available. The parent itself remains noncollectible; loose opium pods are implemented below. See [Pixi validation](PIXI-LIVE.md#rare-vine-to-opium-poppy-mutation-2026-10-27).
- Implemented collectible opium pods: exactly one independent 20% decision on successful live poppy activation, never on ordinary vine acceptance. Successful attempts wait three seconds, validate the exact source/id/cell/creation time and mutation trait, then use the shared five-drop cap. Failed, cancelled, hidden/stalled or cap-skipped attempts never retry. A loose `opium_pod` lives 20 seconds independently, including after parent removal; collecting it leaves the original vine/poppy and its 8m/10m lifecycle intact. A static sage capsule/crown uses one cached ambient frame and one existing-cap drop Sprite. Shared click priority says exactly `You collected an opium pod. +0 points`; parent clicks still inspect, and Score stays 0. No inventory, network/activity events or new audio. Diagnostic-only simulated controls cover pending/active/mixed/cap/cancellation/hidden/expiry/reset. See [pod validation](PIXI-LIVE.md#collectible-opium-pods-2026-10-27).
- Delayed collectible weed mutations: a 5% browser roll on the exact successfully created live port-22 redbloom schedules mutation after three seconds. Canonical type, cell, vigor, color, and safe provenance stay intact. At most three active mutations; cap-skipped candidates never retry. Collection or expiry after 20 active seconds removes the specimen entirely. No secondary sprig, extra cell, grass influence, inventory, or progression. Shared scaled clicks collect before inspecting and close that specimen's card. Ordinary TCPNoise weeds and gnomes remain independent.
- Static `Score: 0` with no JavaScript scoring/persistence state. Collection briefly shows `You collected some weed. +0 points` and optionally uses the existing quiet collection sound.
- First-seen curiosities: exact sanitized live `seenCount === "1"` tries to create one visitor beside the exact successfully spawned/replaced specimen. The uniform initial pool is ladybug, snail, moth, and shiny pebble; at most three live for 20 seconds, with no queue or catch-up when full. Separate browser-memory state consumes no cells and affects no specimens, grass, or Recent activity. Locally bounded motion and glints share the cached renderer's 30 FPS overlay. Scaled clicks collect before mutations/inspection, show type-specific `+0 points`, and reuse quiet optional audio. Gnomes and mutations remain independent. Source count one does not establish global first-ever observation or uniqueness.
- A small standalone About page explaining the project, data flow, visual metaphors, privacy boundary, weather, ecology, inspection, and the fact that the gnomes mean absolutely nothing.
- Amanita muscaria loose drops: successful live mushroom growth gets an independent 1% browser roll, scheduling a separate tiny collectible near the exact unchanged source after five seconds. Source removal/expiry/displacement before activation cancels it. The max-five loose-drop cap at activation is shared with buds below; skipped attempts never retry. Each drop lasts 20 active seconds on the shared overlay with no extra timers, base invalidation, cell occupancy, grass/puddle effects, or Recent activity rows. Click priority is active gnome, curiosity, drop, visible frog, mutation, inspection. Collection says `You found Amanita muscaria. +0 points`, reuses optional audio, and leaves Score at 0. Fake Gopher and saturated dropped growth do not roll. Gnomes, curiosities, and mutations stay independent.
- Ditch Weed Bud loose drops are implemented in Pixi: one strict `< 0.03`
  roll per successfully placed live ordinary weed, from any TCPNoise listening
  port. Activation waits for the exact parent's 60-second maturity and rechecks
  identity, occupancy, creation time, eligibility and lifetime. Pre-activation
  removal/replacement/clear cancels it; an active bud lives independently for
  20 seconds. Amanita's 1%/five-second rules are unchanged; both types share
  five active slots, consuming due cap skips without retry or eviction.
  Hidden/missed bud activations are discarded, with a 1.5-second lateness bound.
  Compact shared green/olive leaf artwork stays still and occupies only the
  ambient overlay; Pixi adds one cached frame with no runtime texture generation.
  Collection says `You smoked some ditch weed. +0 points`, uses existing optional
  audio/two-second feedback, and leaves the weed, ecology, counts, activity and
  Score unchanged. Existing hit priority and the port-22 mutation remain.
  A diagnostic-only mixed overlap fixture is available at `/pixi-live.html`.

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
The Pixi garden begins with 12 random seeds distributed across the garden by a
shared helper, excluding occupied cells. A scheduled 60-second maintenance check
guarantees recovery from extinction with even one free specimen cell, creating
at most three patches through authoritative creation and rechecking occupancy.
It also helps critically sparse healthy turf (below 10% of available soil,
capped at 12 healthy patches), or populations below 75% healthy coverage with no
reachable empty neighbour. Healthy spreading turf suppresses maintenance.
Hidden/resumed pages reset cadence; missed whole windows are skipped. No synthetic
traffic, activity rows, provenance or growth statistics are created.
They expand automatically from sparse seeds to mature turf over 30 seconds. Healthy
mature coverage receives 1–6 spread attempts every 4 seconds depending on
reachable mature population, with a 70% success chance per attempt. Eight seeded
quiet runs reach 78–89% open-soil coverage at ten minutes. Fading turf retains one
40% final seed opportunity until an empty neighbour exists; at most six are
checked per spread tick. Natural spread creates a new
generation without refreshing the parent. Without refresh, turf fades after 20
minutes and expires after 35. Re-influence revives the cell and restarts that aging
cycle.

The original 20/27/32/35-minute aging stages remain; total turf coverage includes
yellow/brown aging patches. Young generations replace expired turf without
refreshing parents. Longer quiet sessions can still show age waves; see
[coverage, captures and limits](PIXI-LIVE.md#lush-grass-and-reliable-recovery-2026-10-21).

## Remaining MVP work

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
way space opens; rare local landscaping can also free ordinary specimen cells.
Real TCPNoise growth does not directly seed or refresh grass.

## Captured next slices

These are desired follow-ups, not descriptions of the code already implemented:

- **Ordinary weed -> loose bud drop:** rarely let a successful live ordinary weed produce a separate, temporary collectible bud. Keep the ordinary parent intact, reuse the Amanita transient drop machinery and shared Pixi click order, and retain `Score: 0`; proposed message: `You smoked some ditch weed. +0 points`. Do not confuse this with the existing port-22 redbloom-to-weed mutation.
- **Additional curiosity/drop types:** odd seeds, worthless coin-shaped objects,
  rainbow leaves, crystal shards, ghost petals, gnome hats, and other collectible
  drops remain future work beyond the four visitors and Amanita.
- **Water interactions:** passive frogs, storm puddles and gnome wet-boots mishaps are implemented; water-specific snails and collectible frogs remain future work.
- **Storm presentation follow-up:** evaluate the implemented Pixi bolts and thunder during longer live use. See [Ideas](IDEAS.md#storm-lightning-and-thunder-implemented-pixi-experiment).
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
mean quieter network-shaped activity, while lighting follows local time
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
