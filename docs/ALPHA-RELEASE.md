# Public alpha deployment review

Reviewed 2026-10-20 on `fix/tcpnoise-growth-boundary`, HEAD
`919a3fa9011f62b6be0823abee94e5ca3695ad1f`. The working tree was clean before
this review. No applicable `AGENTS.md` was found. This is a focused deployment
review, not a comprehensive security audit or a new rendering benchmark.

**Original audit recommendation: Not ready for unrestricted public alpha exposure.**
The unbounded SSE queue finding described below has since received an in-code
remediation on `dev`: bounded queues, slow-subscriber disconnects, a cap on
active subscribers, and a stalled-write timeout. **This patch has not yet been
verified by a .NET build or public proxy/slow-network soak**, so unrestricted
public deployment still needs the validation and ingress checks below.
No credential leak, unintended server-side write endpoint, or violation
of the documented event-field allowlist was found in the original reviewed paths.

## Brief deployment checklist

- [x] Implement bounded SSE buffering and slow-client eviction on `dev`.
- [ ] Run .NET/backend and slow-reader checks on the patched branch; verify actual
  HTTP/proxy disconnect, memory and reconnect behavior before public ingress.
- [ ] Publish a Release build; run the published app with a supported .NET 10
  hosting runtime and Production environment, under a supervised service.
- [ ] Put HTTPS at the ingress, keep Kestrel private, and verify SSE streaming
  through the actual proxy/CDN without buffering or caching.
- [ ] Configure protected server-side NATS settings; confirm the broker identity
  is subscription-only for the intended subject and is not publicly exposed.
- [ ] Approve public sensor labels and exact recurrence counts; verify actual
  browser frames, not just synthetic fixtures.
- [ ] Decide whether diagnostic pages remain public or are restricted at ingress.
- [ ] Retry dependency vulnerability auditing with working NuGet access; review
  actual advisories if any. NU1900 is an unavailable audit, not a clean result.
- [ ] Complete the post-deployment smoke test and watch memory/connections during
  a modest live soak. Keep a rollback build and a way to stop public ingress.

## SSE availability gate and remediation

### High — originally unbounded buffering behind slow SSE clients

**Evidence:** [GardenEvents.cs](../GardenEvents.cs), lines 21–24, creates an
unbounded channel for every client. Lines 37–41 enqueue every accepted growth
event without backpressure or dropping. [Program.cs](../Program.cs), lines 16–44,
allows anonymous subscriptions and awaits response writes/flushes before reading
the next frame. There is no application queue bound, subscriber cap, or absolute
stream lifetime. No deployment ingress limits are supplied in the repository.

A slow client can fall behind while its queue continues retaining live events;
multiple connections multiply retained queues and connection resources. Eventual
disconnect cleanup does not bound memory while a client remains registered.
Transport defaults alone do not establish a bound on these application queues.
This is an availability risk, not a route for publishing events or reading broker
credentials.

A controlled probe of the actual `GardenEvents` class published 20,000 events to
one unread client and subsequently read all 20,000. This confirms retention, not
a demonstrated remote outage: no slow-network, HTTP/2, or memory-exhaustion test
was performed, and time to failure depends on traffic and transport behavior.

**Remediation implemented on `dev` (not yet runtime-verified):** Each
subscriber receives a 256-frame bounded channel. A full queue causes the
subscriber to be removed and its cancellation token to be signaled; weather
frames use the same nonblocking policy. The SSE endpoint gives writes/flushes
15 seconds before ending a stalled stream and permits at most 128 concurrent
subscribers; excess subscribers receive HTTP 503 with `Retry-After: 5`.
All other subscribers keep receiving events. EventSource can reconnect, with
no replay of missed growth. Deterministic backend assertions for growth
overflow, weather overflow, healthy subscriber isolation, and subscriber-slot
recovery were added.

**Remaining gate:** run these tests with .NET 10 and exercise slow readers,
disconnect/stream cleanup, and subscriber saturation through the actual HTTP
and production proxy path. Size/tune initial limits against observed traffic and
memory. Request-rate or idle timeouts alone would not contain an ongoing
unbounded backlog; process memory limits are additional safety nets, not a
replacement for this fix.

The original 20,000-event probe above was performed **before** the change.

## Exposure, configuration, and privacy findings

- [Program.cs](../Program.cs), lines 12–16, serves `wwwroot` and the GET SSE
  endpoint. `/` and `/index.html` are Pixi; `/canvas.html`, `/about.html`,
  `/pixi-live.html`, and `/pixi-stress.html` are intentionally served in Production
  too. Diagnostic simulation/force controls operate on that browser's garden;
  no server mutation or NATS-publish API was found. These pages are not protected
  admin interfaces. If restricting them, block their HTML routes specifically:
  the homepage requires shared `pixi-live` scripts.
- The local Production-host probe returned 404 for source, `.git`, configuration,
  docs, tests, and ignored artifacts paths; POST to the SSE route returned 405.
  Directory browsing is not enabled. Deploy only publish output, and do not
  configure the proxy to serve the repository root or private configuration.
- [TcpNoiseAdapter.cs](../TcpNoiseAdapter.cs), lines 14–49, and
  [GardenEvents.cs](../GardenEvents.cs), lines 6–11, constrain growth frames to
  `specimenType`, `listenPort`, `vigor`, optional `sensor`, and optional exact
  decimal-string `seenCount`. Raw remote-IP/source-port fields, credentials,
  banners, and payload fields are not forwarded. Sensor text is only bounded to
  128 characters (adapter lines 69–72), **not anonymized**: ensure labels do not
  themselves contain private addresses, hostnames, or secrets. Public provenance
  and counts are intentional; see [REAL-DATA.md](REAL-DATA.md#normalized-data-and-privacy).
  Pixi inspection uses text rendering, not HTML interpretation of labels.
- [WeatherAdapter.cs](../WeatherAdapter.cs), lines 23–39, forwards only normalized
  level, minute rate, optional actual hour count, and snapshot availability.
  These are Observatory aggregates, not accepted specimen growth. Events/min is
  a five-minute average; Last hour is source-provided, never rate × 60. The
  Observatory's retained 5,000-event store can undercount busy windows.
- No committed credentials or private broker URL were found in the reviewed
  configuration/static files. This does not inspect deployment secrets or prove
  that future sensor labels are safe. NATS connection logs suppress broker URL
  details; weather failure logs include exception text, which can identify the
  configured endpoint. Keep that URL secret-free and restrict server log access.

## Recommended configuration

Example service environment for a same-host reverse proxy; replace the NATS
placeholder privately, never in browser assets or committed files:

```text
ASPNETCORE_ENVIRONMENT=Production
DOTNET_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5080
Nats__Url=<protected broker connection for a subscription-only identity>
Nats__Subject=tcpnoise.connection
Weather__SnapshotUrl=https://noise.kgivler.com/api/snapshot
```

Use an appropriate private interface instead of loopback if the proxy is in a
separate container/host. Keep broker credentials in the service's protected secret
configuration; use encrypted broker transport when crossing untrusted networks.
Missing `Nats__Url` deliberately disables growth input without preventing startup.
The weather URL above is already the default; polling is server-side every ten
seconds with a five-second request timeout. See [README.md](../README.md).

Use the published DLL/service rather than the Development launch profile in
[launchSettings.json](../Properties/launchSettings.json). Serve at the origin root:
the browser uses `/api/garden/events`, so an arbitrary subpath deployment needs
explicit proxy routing. Handle TLS/HTTP redirection at ingress; the app does not
provide them. Pass through `text/event-stream`, disable response buffering/cache,
and verify the proxy honors streaming (`X-Accel-Buffering: no` is not universal).
Set stream limits according to the blocker above. Restrict outbound broker access
and snapshot access to the intended services.

## Nonblocking alpha limitations

- **Rendering:** the documented 655-second user-observed smooth live soak is a
  useful checkpoint, not a root-cause explanation. Historical visible stutter
  despite roughly 60 FPS remains unexplained. The existing Pixi teardown
  exception can call `app.stop()` after destruction during page closure; it is
  distinct from the fixed black-homepage initialization regression. Preserve the
  historical record in [PIXI-LIVE.md](PIXI-LIVE.md). Watch actual presentation
  and navigation during the deployed soak, not average FPS alone.
- **Dependency audit:** the check build succeeded with NU1900 because NuGet
  vulnerability data was unavailable. This is not evidence of a known vulnerable
  dependency, but online audit status remains unverified.
- **Upstream status:** browser SSE connection status does not prove NATS health.
  The adapter retries broker failures; weather polling retains its last valid
  state on failure without a browser freshness warning. Monitor server outage and
  recovery logs. Startup metrics show Waiting until a valid snapshot arrives.
- **Idle/reconnect behavior:** there is no SSE heartbeat or replay. With no
  growth or changed weather, the stream can be silent long enough for a proxy to
  close it; EventSource reconnects and receives current weather, but missed growth
  is intentionally lost. Queue overflow and stalled-write timeouts also end a
  stream. Check idle proxy behavior and avoid a reconnect storm.
  The Pixi page closes its stream on pagehide. Hidden pages can retain subscriptions.
- **Client scope:** WebGL availability, mobile sizing, audio opt-in, and live
  long-session performance still need deployment smoke coverage. WebGL is required; unsupported browsers receive a friendly message. Garden state is browser-local and not persistent.

## Short post-deployment smoke test

1. Open `/` and `/index.html` in normal Chrome and a smaller/mobile viewport.
   Confirm soil/grid before events, no initialization errors, resize and specimen
   inspection/collection. Visit About and return; check Back/Forward navigation.
2. Confirm a single SSE connection receives immediate weather, correct aggregate
   labels, and real growth when NATS events arrive. Inspect frame keys and actual
   sensor labels for the privacy boundary above. Sound must remain opt-in.
3. Check that `/canvas.html` redirects to `/`, and the chosen public/restricted behavior of both Pixi
   diagnostic pages. Confirm private/source paths return 404 through ingress.
4. Briefly interrupt the browser connection, then reconnect. Verify current
   weather and subsequent growth resume without duplicate subscriptions. In a
   controlled window, confirm broker/snapshot outage and recovery logs; last
   valid weather should persist, not crash or fabricate zero traffic.
5. Leave a connection idle beyond the proxy timeout; then perform a live soak
   with dense growth/weather. Watch visible stutter, process memory, active
   streams, and logs. Close tabs and verify resources settle. Separately verify
   the selected slow-reader containment policy before allowing unrestricted access.

## Checks performed and limits

- Release check-project build and `PacketGarden.Checks.dll`: passed (NU1900).
  Includes validation, all 10,000 rarity rolls, sensitive-field exclusion,
  fan-out, no replay, and disconnect cleanup.
- Existing Node checks: `pixi-default.cjs`, `pixi-interaction.cjs`,
  `garden-activity.cjs`, and `grass-occupancy.cjs`: passed.
- Existing `weather-sse.cjs --run` against the built app: passed startup waiting,
  hourly-only updates, outage retention, immediate reconnect, and recovery.
- Local Production-host route/static-boundary/SSE-header probe and the 20,000-event
  unread-queue probe: passed their assertions. Probe artifacts are ignored under
  `artifacts/alpha-readiness/`, outside the public static root.
- `git diff --check`: passed. Only this documentation file is intended for review.

Local HTTP probes used a fake snapshot source and disabled NATS. No new Chrome
rendering, real broker reconnect, public proxy/TLS/CDN, prolonged load, slow-reader
network test, external vulnerability audit, or deployment was performed. Existing
historical browser measurements were reviewed, not rerun. Runtime code is unchanged.

## Follow-up after alpha SSE patch

The code and deterministic assertions for bounded SSE queues were added on
`dev` after this audit. The historical checks listed above apply only to the
pre-fix review commit; they **do not** attest that the new implementation builds
or passes on the local .NET SDK. Run `dotnet run --project tests/PacketGarden.Checks`
and `node tests/weather-sse.cjs --run <built-assembly>` after building with
.NET 10, then do the production-proxy slow-client smoke test before publishing.
