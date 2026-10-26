# Gnome arrival audio (2026-10-24)

The arrival cue was dispatched and scheduled correctly, but its original signal
was hard to hear at the default 12% volume. The fix changes the short Web Audio
motif and adds a diagnostic preview. It does not change incident rules, other
sounds, rendering, ecology, placement, random streams, scoring or network input.

## Diagnosis

The production path is:

1. A successful dispute, vine landscaping, overcrowding relief or weed harvest
   starts in `garden-gnomes.js` and emits `onCue('arrival')` exactly once.
2. `pixi-live.js` forwards the stage to `gardenSound.maybePlayGnomeSound(stage)`.
3. The sound controller checks explicit enable, visibility, volume and the
   context's running state. Cues never construct or resume an AudioContext.
4. Two oscillator → filter → envelope chains feed the existing master gain,
   compressor, output gain and audio destination.

Native Chrome confirmed the callback and scheduling path before the fix. The
old triangle's 196→148 Hz fundamental lay below its 620→420 Hz bandpass, and
its envelope decayed exponentially almost immediately after a 25ms attack.
Removing only the filters from the old graph improved RMS by about 6.6 dB.
The complete old cue was about 11 dB below the ordinary flower reference in a
fixed one-second capture. These measurements identify a quiet scheduled signal,
rather than a missing callback.

Sound Off, zero volume and a suspended/unavailable device are separate legitimate
rejection cases. The preview reports them distinctly. User gesture activation,
the 12% default, the `2 * volume ** 1.25` master curve, compressor (-6 dB threshold,
12:1 ratio) and 0.75 output gain remain unchanged. Neither audio state nor
caching on the reporting user's device can be reconstructed from this checkout.
Both garden pages now request `gnome-arrival-2` audio/bootstrap/CSS versions;
the Chrome test first caches the old audio URL, then verifies the new synthesis
loads through the current page.

## Sound and controls

The revised motif lasts roughly 550ms. A triangle voice rises briefly, settles
and falls, with a held vowel-like envelope. A +9 dB peaking formant preserves
the fundamental while bringing out nasal harmonics. A softer low-pass sawtooth
tail supplies a gentle descending buzz. This suggests a musical “gnooo-mz!”;
there is no speech synthesis, recorded speech, audio asset or download.

On `/pixi-live.html`, explicitly enable **Sound: On**, then click **Preview gnome
sound**. It calls the exact production arrival method, affects no garden state,
and reports playing, already playing, disabled, zero volume, suspended, hidden
or unavailable audio in a status region. For a suspended context, explicitly
toggle Sound Off and On again. The preview itself cannot enable or resume audio
and is absent from the homepage. Repeated clicks during a cue do not stack or
queue it; a later deliberate preview can play again.

Successful incidents still emit one arrival; failed starts, repeated incident
triggers, ticks, phase changes and visibility resume do not replay it. Existing
battle/victory synthesis remains unchanged. Completion, mute, Off, hiding,
page disposal and partial setup failures release arrival resources. No timers,
loops, persistence or dependencies are added.

## Signal evidence

Chrome 155 native `OfflineAudioContext`, mono 48 kHz, one-second captures through
the complete production mix (amplitudes relative to full scale):

| Arrival at 12% | Before | After |
| --- | ---: | ---: |
| Peak | 0.003581 | 0.017730 |
| RMS | 0.0003183 | 0.0041994 |
| Peak dBFS | -48.92 | -35.03 |
| RMS dBFS | -69.94 | -47.54 |
| Clipped samples | 0 | 0 |

Peak improves **13.89 dB** and RMS **22.41 dB** without raising the master gain.
The longer held body improves audibility as well as the instantaneous peak.
The revised peak remains below twice the unchanged ordinary flower reference.
At 3%, RMS is 0.0007424; at 100%, peak is 0.2510 with no clipping. The full-volume
overlap check includes arrival, blackthorn, collection, victory and thunder, and
also checks for clipping. RMS is an audibility proxy, not a subjective loudness
or speech-intelligibility measurement.

The real-time Chrome test loads the actual diagnostic page with autoplay
requiring a gesture. It clicks Sound On, triggers all four incident types through
their existing local fixtures and captures post-mix PCM while the original
audio destination remains connected. Every incident schedules two arrival
voices once and produces non-silent output. It exercises preview at 12%, 3% and
100%, mute, a natively suspended context, explicit reactivation, hidden/pagehide
cancellation, late inputs and repeated playback. Preview leaves model, ecology,
counts, incident and score snapshots unchanged. The mobile-sized capture checks
the new button; it does not claim that every existing diagnostic control fits a
small screen.

One context is retained for the enabled page. Arrival uses the same six transient
nodes as before: two oscillators, two filters and two envelope gains. Tests return
to the three existing persistent output nodes after each cue or cancellation;
100 controlled repetitions also check disconnection. There is no additional
texture, rendering work, continuous audio or background scheduling.

## Reproduce and limits

Use installed Chrome and the already installed Playwright runtime through
`NODE_PATH`; no install is needed:

```text
npm test
npm run test:chrome
node tests/gnome-arrival-signal-browser.cjs --run --baseline
node tests/gnome-arrival-signal-browser.cjs --run
dotnet build PacketGarden.slnx --no-restore
dotnet build PacketGarden.slnx -c Release --no-restore
dotnet run --project tests/PacketGarden.Checks --no-build --no-restore
node tests/weather-sse.cjs --run bin/Debug/net10.0/PacketGarden.dll
```

The Chrome runner includes both audio baseline and current checks. The baseline
uses immutable pre-fix revision `509ebe8`. Native graphs include real oscillators,
filters, envelopes and compressor. Only the offline context's running-state gate
is adapted for offline rendering; real-time Chrome exercises actual context
state and gesture gating. Audio reports and locally generated WAV evidence are
ignored under `artifacts/gnome-arrival/{before,after}/`; these are test artifacts,
not application audio assets.

Validation for this change: **58 Node suites passed** (10 optional browser/SSE
entries explicitly skipped by that runner), **all 11 installed-Chrome runs
passed**, Debug and Release solution builds passed with zero warnings/errors,
and backend checks plus actual ASP.NET polling-to-SSE integration passed. The
Chrome runs include the full production/diagnostic regression, Pixi lifecycle
and resource ownership, both bloom types, grass, WebGL-unavailable startup and
the baseline/current native audio checks. Existing tests are retained; audio
coverage is extended rather than retired. `git diff --check` also passes.

Automated PCM verifies audible-frequency output reaches the native destination
graph. It cannot verify the OS mixer, physical speakers, device volume, a person's
hearing or whether they recognize the joke as “Gnomes!”. Other browsers/devices
and subjective listening remain follow-up checks; no physical listening result
is claimed. No deployment, commit or push is part of this change.
