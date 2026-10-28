# Mission Control visit notifications

PacketGarden optionally publishes one best-effort visit notification after a
production garden document initializes successfully and is visible. It reuses
the restored **JoyfulReaperLib.MissionControl 0.0.3 NuGet client**; PacketGarden
does not implement another Gateway HTTP publisher. Integration is disabled by
default and requires no Mission Control availability to display the garden.

## Trigger and flow

```text
Successful visible Pixi startup on / or /index.html
    -> empty same-origin POST /api/garden/visit
    -> bounded PacketGarden endpoint
    -> shared server-side Mission Control client
    -> authenticated Gateway POST /api/events
    -> Gateway resolves source "packetgarden"
    -> existing Mission Control messaging/archive pipeline
```

Only the production HTML carries `data-production-garden`. The shared Pixi
startup calls the notifier after initialization finishes and the application
starts; the URL is not used to guess which page is production. Hidden startup
waits for the first visible initialized state. The same existing visibility
callback supplies that signal; no timer or independent rendering loop is added.
Repeated initialization/visibility callbacks have one attempt latch, set before
fetch. Startup failure, teardown before completion, diagnostic/stress/about
pages, weather and SSE connections/reconnections never trigger publication.

Refresh and another tab create new documents and count as new visits. Existing
back/forward-cache behavior reloads a restored garden as a fresh document.
This is **not a unique-person or verified-human metric**. No cookie, visitor
identifier, fingerprint, local/session storage or persistent deduplication is
used. A new event GUID identifies only that event.

Fetch uses a constant URL and `POST`, with no body, query or custom data headers,
`credentials: omit`, `referrerPolicy: no-referrer`, `mode: same-origin`,
`cache: no-store` and `redirect: error`. Browser transport still necessarily
has an IP address and standard headers; PacketGarden neither extracts these
into the event nor logs them through this feature. The promise is never awaited
by garden startup, and rejection is ignored. There are no client retries,
beacons, keepalive delivery, repeating timers or replay after failure.

## Actual event contract

The shared client sends `X-Mission-Control-Key` and this request to `api/events`
relative to the server-configured Gateway base URL:

```json
{
  "eventId": "<new nonempty GUID>",
  "eventType": "packetgarden.garden.visited",
  "schemaVersion": 1,
  "occurredAt": "<current UTC DateTimeOffset>",
  "correlationId": null,
  "payload": {
    "message": "Someone visited the garden!"
  }
}
```

Payload has exactly one field. No visitor-controlled type, text, identifier or
network telemetry participates. Source is **omitted from the publication request**:
Gateway authenticates the key and supplies `Source: packetgarden`, its receive
timestamp and the other existing envelope metadata. PacketGarden does not
connect directly to Mission Control NATS or Archive. Its existing TCPNoise NATS
subscription and garden SSE schema are unchanged.

The reference code was inspected in the local `JoyfulReaper/MissionControl`
Gateway `Endpoints/EventEndpointRouteBuilderExtensions.cs`, Contracts
`PublishEventRequest.cs`, and `JoyfulReaper/JoyfulReaperLib`'s
`JoyfulReaperLib.MissionControl` interface, client, options and service
registration. Fake-handler tests verify the **installed 0.0.3** client's actual
serialized request/header contract, independently of repository HEAD.

## Installation and server configuration

`dotnet restore PacketGarden.slnx` installs the referenced client. No new frontend
package or browser configuration is required. Checked-in `appsettings.json`
contains only safe defaults:

```json
{
  "MissionControl": {
    "Enabled": false,
    "BaseUrl": "",
    "ApiKey": "",
    "TimeoutMilliseconds": 1000
  }
}
```

Set these in server environment variables, user secrets or the deployment
secret store before starting the app; do not put a live key into source control:

| Server key | Environment variable | Meaning |
| --- | --- | --- |
| `MissionControl:Enabled` | `MissionControl__Enabled` | Explicitly `true` to publish; default false. |
| `MissionControl:BaseUrl` | `MissionControl__BaseUrl` | Gateway root/base path, using HTTPS outside trusted local networks. |
| `MissionControl:ApiKey` | `MissionControl__ApiKey` | Matching Gateway event-source key, at least 32 characters. |
| `MissionControl:TimeoutMilliseconds` | `MissionControl__TimeoutMilliseconds` | Default 1000; PacketGarden clamps numeric values to 100–2000ms. |

The URL must be absolute HTTP(S), without embedded credentials, query or
fragment. A trailing slash is normalized to preserve a configured base path.
A missing/short key, control characters in the key, or unusable URL disables
optional publication before shared-client startup validation. Disabled
integration performs no outbound HTTP publication. Configuration changes take
effect on process restart.

On **Gateway**, preserve existing registrations and add one unused
`EventSources:Sources` entry with `Name: packetgarden` and the same secret
`ApiKey`. Environment keys are `EventSources__Sources__N__Name` and
`EventSources__Sources__N__ApiKey`, where `N` is the appropriate unused index.
Gateway resolves source from this key; no browser or payload source claim is
trusted. This task does not change or deploy Gateway configuration.

Keep public scheme/host consistent with ASP.NET's effective request scheme/host.
If a trusted proxy terminates TLS, configure its trusted forwarded-header
processing and preserve the public host; do not loosen Origin validation or
trust arbitrary client forwarding headers. Proxy/access-log configuration is
outside this feature: operators must separately avoid retaining visitor IP,
user-agent, referer, cookies and query strings there. No Gateway URL/key or NATS
credential is exposed in HTML, JavaScript, SSE or visit responses.

## Security, cost and delivery limits

- Only `POST /api/garden/visit` is mapped; GET returns 405. No permissive CORS.
- One absolute `Origin` must match ASP.NET's effective scheme/host/port. Missing,
  null, malformed and cross-origin values are rejected with 403. If
  `Sec-Fetch-Site` is present, it must be `same-origin`; older clients may omit it.
- Request bodies are prohibited, including chunked bodies. The endpoint sets a
  zero-byte read limit and returns 413 without deserialization. Unread HTTP/1
  body connections close, including rate-limited rejections. Queries return 400.
- One fixed-window **30 requests/minute per process** limiter has no queue or
  per-IP/visitor partitions; excess is 429. Invalid requests consume the same
  bounded bucket. At most **two** shared-client publications may be in flight.
  Busy attempts are dropped immediately, without retaining pending visits.
- The independent named HttpClient has the short timeout above, no cookie jar
  and no automatic redirects. A linked cancellation budget bounds the whole
  publication, including rejection-body reads after headers. Weather polling
  and SSE do not share that client or budget.
- Allowed requests return empty **204** for success, disabled integration, busy
  capacity, bad Gateway key, 401/503, NATS/Archive outage, timeout or network
  error. This is not a delivery receipt. Notification never changes rendering,
  specimens, weather, ecology, competition, collectibles, activity or `Score: 0`.
- Publication failure is not retried. Reload, browser termination, hidden pages,
  network errors, fixed-window limits, process restarts and concurrent load can
  lose notifications. Multiple app instances have independent limits; window
  boundaries permit bursts. There is no durable outbox or exact-once guarantee.
- Origin/fetch metadata are browser safeguards, **not authentication**. A bot can
  forge them and consume the global bucket or generate events. Event acceptance
  does not prove a human visit. The server cannot enforce the browser's one-load
  latch against a malicious caller without adding tracking/authentication.

The application does not record visitor fields. Named-client HTTP logging and
the shared client's rejection/exception logs are suppressed because they can
include private URLs or arbitrary upstream response bodies. ASP.NET Hosting
Diagnostics request URL logs are limited to Warning to avoid query-string
logging. Endpoint responses reveal no upstream configuration or credentials.

## Verification

```text
npm test
npm run test:chrome
dotnet build PacketGarden.slnx --no-restore
dotnet build PacketGarden.slnx -c Release --no-restore
dotnet run --project tests/PacketGarden.Checks --no-restore
node tests/weather-sse.cjs --run bin/Debug/net10.0/PacketGarden.dll
```

Node covers successful/failed startup, explicit page identity, duplicate calls,
hidden/resume, disposal, empty identifier-free request, SSE/weather independence
and failures without retries. Backend checks use fake HTTP handlers with the
actual shared client and temporary local ASP.NET hosts: exact envelope/payload,
GUID/UTC, no visitor forwarding, disabled/invalid config, 401/503/network errors,
header/body timeouts, sanitized logging, Origin/Fetch-Site/POST/body/query checks,
global rate limits and 100 concurrent attempts bounded to two publications.

The added Chrome job builds an isolated ASP.NET host, uses a local Gateway
double, and verifies browser → endpoint → real shared-client HTTP publication.
It checks root/index/reload/another tab, deferred/aborted hidden initialization,
WebGL failure, diagnostics/stress exclusion, duplicate callbacks, real automatic
EventSource reconnection after a proxy severs its transport, unchanged garden
state, and Gateway/fetch failures. It requires installed Chrome/Playwright and
the .NET SDK; no production credentials or NATS. Reports are ignored under
`artifacts/garden-visits/`. The separate actual ASP.NET SSE check still runs the
existing polling, health/freshness and reconnect scenarios.

Validation for this slice: **67 Node suites passed** (19 optional entries
skipped by that runner), **all 25 Chrome jobs passed**, Debug/Release builds
completed with zero warnings/errors, backend integration checks passed, and the
actual ASP.NET polling/SSE integration passed. The retirement Chrome fixture's
static server was updated to return the disabled visit endpoint's empty 204;
its compatibility checks then passed unchanged. Work is uncommitted on `dev`
above `7a06bca`, with the existing terrain, competition and previews preserved.

No local Gateway/NATS/Archive stack was running during this slice, so the full
real broker/archive path was not exercised. No production publication or
deployment was performed. For an available isolated stack, register a local
`packetgarden` key, point this backend at that local Gateway, initialize the
production page, and verify the single event's resolved source and constant
payload in Archive using its existing tools.
