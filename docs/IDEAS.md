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
- no score, economy, progression tree, inventory, or loss state;
- no gardening chores required to keep the garden alive;
- no player-directed combat system;
- no health bars, unit stats, persistent factions, or tactical controls;
- network/security meaning stays separate from visual drama;
- rare surprises are more effective when they remain rare;
- prefer brief, slightly inexplicable ambient events over constant decorative motion.

The Gnome Incident is the model: it is funny because it can be forgotten about
until four tiny idiots suddenly have a territorial dispute and then leave.

## Ambient actors and incidents

The browser now has a transient actor/event layer because of The Gnome Incident.
Keep future ambient visitors in that layer rather than consuming specimen cells or
contaminating the plant ecology.

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

Occasionally the garden could produce a short-lived clickable object that the
viewer can collect for absolutely no useful reason.

One example: a port-22 hit still creates its normal redbloom, but very rarely also
causes a small collectible weed to appear nearby. Clicking it before it expires
plucks/collects it; ignoring it simply lets it disappear on its own.

Keeping the collectible as a secondary effect preserves the existing rule that a
TCPNoise hit on listening port 22 always maps to redbloom rather than muddying that
signal.

The important part is that collecting should remain intentionally pointless:

- no score;
- no currency;
- no crafting;
- no upgrades;
- no required collection log;
- no gameplay advantage for clicking it;
- missing one should have no penalty.

A tiny pluck animation, soft sound, or brief message such as `You picked some weed.`
is enough. Other rare ephemeral objects could eventually use the same mechanism as
long as they remain optional curiosities rather than the start of a progression
system.

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

Possible later audio polish:

- quiet opt-in weather ambience;
- small vigor-dependent variations in existing species sounds;
- persisted sound/volume preferences.

None of these should turn into alert sounds. PacketGarden audio should remain
pleasant enough to leave enabled.

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

Cosmetic rarity should stay distinct from backend TCPNoise rarity unless there is
a deliberate reason to combine them.

## Long-term garden memory

Simple persistence across browser/server restarts remains desirable. The goal is to
preserve the feeling that the garden has history without turning PacketGarden into
a telemetry database.

Longer-lived terrain/history ideas from the vision include:

- rocks;
- logs;
- puddles or ponds;
- fallen branches;
- tiny garden structures;
- slow-growing trees from genuinely long-lived connection telemetry.

These can live for hours or days while common plants continue cycling over minutes.

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

## Environmental pressure

Aggregate pressure is already used for weather. Possible extensions include:

- pollen/spore bursts;
- wind events;
- other short-lived environmental effects when a traffic burst should not create
  hundreds of permanent specimens;
- eventual ecological responses to aggregate pressure, only if they remain subtle
  and understandable.

Lightning/flashing was intentionally omitted from severe weather and should not be
added casually; the current storms communicate intensity without strobing.

## Keep the weirdness earned

The prototype became more interesting once rare colors, odd species, weather,
aging, and gnomes could overlap naturally. Future ideas should preserve that
emergent feeling.

A good PacketGarden feature should make somebody glance back at the tab and think
something like:

> Wait. What the hell are they doing now?

Then the garden should carry on without demanding anything from them.
