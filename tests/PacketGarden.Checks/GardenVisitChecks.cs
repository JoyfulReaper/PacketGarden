using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Text.Json;
using JoyfulReaperLib.MissionControl;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PacketGarden;

internal static class GardenVisitChecks
{
    private const string Key = "local-test-only-not-a-real-secret-000000";
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }

    public static async Task RunAsync()
    {
        var capture = new CaptureHandler();
        await using (var host = await Host.CreateAsync(capture, true))
        {
            for (var i = 0; i < 2; i++) Check((await host.Post()).StatusCode == HttpStatusCode.NoContent, "Valid visit accepted");
            var events = capture.Requests.ToArray();
            Check(events.Length == 2, "Exactly one publication per accepted visit");
            var ids = new HashSet<Guid>();
            foreach (var item in events)
            {
                Check(item.Method == "POST" && item.Url == "https://gateway.invalid/api/events" && item.Key == Key, "Actual shared-client route/key contract");
                using var json = JsonDocument.Parse(item.Body);
                var root = json.RootElement;
                Check(root.EnumerateObject().Select(p => p.Name).Order().SequenceEqual(new[] { "correlationId", "eventId", "eventType", "occurredAt", "payload", "schemaVersion" }), "Only actual publication envelope fields");
                Check(root.GetProperty("eventType").GetString() == "packetgarden.garden.visited" && root.GetProperty("schemaVersion").GetInt32() == 1, "Constant visit type/schema");
                Check(root.GetProperty("payload").GetRawText() == "{\"message\":\"Someone visited the garden!\"}", "Exactly the constant payload");
                Check(ids.Add(root.GetProperty("eventId").GetGuid()) && !ids.Contains(Guid.Empty), "Fresh nonempty GUID");
                var occurred = root.GetProperty("occurredAt").GetDateTimeOffset();
                Check(occurred.Offset == TimeSpan.Zero && Math.Abs((DateTimeOffset.UtcNow - occurred).TotalSeconds) < 5, "UTC occurrence");
                Check(root.GetProperty("correlationId").ValueKind == JsonValueKind.Null, "No browser correlation identifier");
                Check(item.HeaderNames.All(n => n is "X-Mission-Control-Key" or "Content-Type"), "No visitor headers forwarded");
            }
            foreach (var mode in new[] { "401", "503", "network", "timeout", "slow-body", "unexpected" })
            {
                capture.Mode = mode;var watch = Stopwatch.StartNew();
                Check((await host.Post()).StatusCode == HttpStatusCode.NoContent, "Publication failure never fails visit: " + mode);
                Check(watch.Elapsed < TimeSpan.FromSeconds(3), "Whole publication bounded including rejection body: " + mode);
            }
            Check(capture.Requests.Count == 8, "Failures never retry");
            Check(!host.Logs.Text.Contains("private-marker") && !host.Logs.Text.Contains(Key), "Upstream failures never log private content/key");
        }
        foreach (var config in new[] {
            new Dictionary<string,string?> { ["MissionControl:Enabled"]="false" },
            new Dictionary<string,string?> { ["MissionControl:ApiKey"]="short" },
            new Dictionary<string,string?> { ["MissionControl:BaseUrl"]="invalid" },
            new Dictionary<string,string?> { ["MissionControl:BaseUrl"]="https://gateway.invalid/?secret=private-marker" }
        })
        {
            var handler = new CaptureHandler();await using var host = await Host.CreateAsync(handler, true, config);
            Check((await host.Post()).StatusCode == HttpStatusCode.NoContent && handler.Requests.IsEmpty, "Disabled/misconfigured integration does no outbound work or startup failure");
        }
        await using (var host = await Host.CreateAsync(new CaptureHandler(), false))
        {
            Check((await host.Client.GetAsync("/api/garden/visit")).StatusCode == HttpStatusCode.MethodNotAllowed, "Only POST");
            foreach (var origin in new[] { null, "null", "https://evil.invalid", host.Origin + "/extra", host.Origin + "?x=1", "https://127.0.0.1" })
                Check((await host.Post(origin: origin, includeOrigin: origin is not null)).StatusCode == HttpStatusCode.Forbidden, "Reject non-origin/cross-origin input");
            foreach (var site in new[] { "cross-site", "same-site", "none" })
                Check((await host.Post(site: site)).StatusCode == HttpStatusCode.Forbidden, "Fetch metadata agrees with origin");
            using var duplicate = new HttpRequestMessage(HttpMethod.Post, "/api/garden/visit");
            duplicate.Headers.TryAddWithoutValidation("Origin", new[] { host.Origin, host.Origin });
            Check((await host.Client.SendAsync(duplicate)).StatusCode == HttpStatusCode.Forbidden, "Multiple origins rejected");
            using var chunked = new HttpRequestMessage(HttpMethod.Post, "/api/garden/visit");
            chunked.Headers.Add("Origin", host.Origin);chunked.Headers.TransferEncodingChunked = true;
            chunked.Content = new StringContent("{\"message\":\"arbitrary\"}");
            Check((await host.Client.SendAsync(chunked)).StatusCode == HttpStatusCode.RequestEntityTooLarge, "Chunked bodies rejected without parsing");
            Check((await host.Post(body: "{\"eventType\":\"arbitrary\",\"message\":\"private-marker\"}")).StatusCode == HttpStatusCode.RequestEntityTooLarge, "No arbitrary payload accepted");
            Check((await host.Post(body: new string('x', 4096))).StatusCode == HttpStatusCode.RequestEntityTooLarge, "Oversize input rejected");
            Check((await host.Post(path: "/api/garden/visit?private-marker=1")).StatusCode == HttpStatusCode.BadRequest, "No query input");
            using var malicious = new HttpRequestMessage(HttpMethod.Post, "/api/garden/visit");
            malicious.Headers.Add("Origin", host.Origin);malicious.Headers.Add("User-Agent", "private-marker");malicious.Headers.Add("Cookie", "private-marker=1");malicious.Headers.Add("Referer", "https://private-marker.invalid/");
            using var response = await host.Client.SendAsync(malicious);
            Check(response.StatusCode == HttpStatusCode.NoContent, "Unused browser headers do not become event data");
            Check(!response.Headers.Contains("Access-Control-Allow-Origin") && !response.Headers.Contains("Set-Cookie"), "No CORS or visitor cookie");
            Check(!host.Logs.Text.Contains("private-marker"), "No visitor text or query logging");
        }
        await using (var host = await Host.CreateAsync(new CaptureHandler(), false))
        {
            for (var i = 0; i < GardenVisitEndpoints.RequestsPerMinute; i++) Check((await host.Post()).StatusCode == HttpStatusCode.NoContent, "Within one global bucket");
            var excess = await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => host.Post()));
            Check(excess.All(r => r.StatusCode == HttpStatusCode.TooManyRequests), "Concurrent excess bounded, no rate-limit queue");
            using var body = await host.Post(body: new string('x',4096));
            Check(body.StatusCode == HttpStatusCode.TooManyRequests && body.Headers.ConnectionClose == true, "Rate-limited arbitrary bodies retain zero read budget and close connection");
        }
        {
            var handler = new CaptureHandler { Mode = "gate" };
            await using var host = await Host.CreateAsync(handler, true);
            var publisher = host.App.Services.GetRequiredService<GardenVisitPublisher>();
            var work = Enumerable.Range(0, 100).Select(_ => publisher.TryNotifyAsync(CancellationToken.None)).ToArray();
            Check(handler.Active == 2 && handler.Requests.Count == 2, "100 overlapping attempts retain only two active publications, no queue");
            handler.Gate.SetResult();await Task.WhenAll(work);
            handler.Mode = "success";await publisher.TryNotifyAsync(CancellationToken.None);
            Check(handler.Requests.Count == 3 && handler.Active == 0, "Publication slots released correctly");
        }
        Console.WriteLine("PASS: shared Mission Control 0.0.3 contract/GUID/schema/UTC, constant payload and no visitor metadata; disabled/misconfigured startup, 401/503/network/timeouts/slow bodies, whole-call cancellation, same-origin/body/query/POST checks, no sensitive logs/CORS/cookies, global rate limit and two-publication concurrency bound.");
    }

    private sealed record Sent(string Method, string Url, string? Key, string[] HeaderNames, string Body);
    private sealed class CaptureHandler : HttpMessageHandler
    {
        public readonly ConcurrentQueue<Sent> Requests = new();
        public readonly TaskCompletionSource Gate = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public string Mode = "success";
        public int Active;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Requests.Enqueue(new(request.Method.Method, request.RequestUri!.AbsoluteUri,
                request.Headers.GetValues("X-Mission-Control-Key").Single(),
                request.Headers.Select(h => h.Key).Concat(request.Content!.Headers.Select(h => h.Key)).ToArray(),
                await request.Content.ReadAsStringAsync(token)));
            Interlocked.Increment(ref Active);
            try
            {
                if (Mode == "network") throw new HttpRequestException("private-marker");
                if (Mode == "unexpected") throw new InvalidOperationException("private-marker");
                if (Mode == "timeout") await Task.Delay(Timeout.Infinite, token);
                if (Mode == "gate") await Gate.Task.WaitAsync(token);
                return new HttpResponseMessage(Mode is "401" or "slow-body" ? HttpStatusCode.Unauthorized : Mode == "503" ? HttpStatusCode.ServiceUnavailable : HttpStatusCode.Accepted)
                { Content = Mode == "slow-body" ? new SlowContent() : new StringContent("private-marker") };
            }
            finally { Interlocked.Decrement(ref Active); }
        }
    }
    private sealed class SlowContent : HttpContent
    {
        protected override bool TryComputeLength(out long length) { length=0;return false; }
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) => throw new NotSupportedException();
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context, CancellationToken token) => Task.Delay(Timeout.Infinite, token);
    }
    private sealed class Logs : ILoggerProvider
    {
        private readonly ConcurrentQueue<string> _lines = new();
        public string Text => string.Join('\n', _lines);
        public ILogger CreateLogger(string categoryName) => new Sink(_lines);
        public void Dispose() { }
        private sealed class Sink(ConcurrentQueue<string> lines) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public bool IsEnabled(LogLevel level) => true;
            public void Log<TState>(LogLevel level, EventId id, TState state, Exception? error, Func<TState, Exception?, string> formatter) => lines.Enqueue(formatter(state,error));
        }
    }
    private sealed class Host(WebApplication app, HttpClient client, string origin, Logs logs) : IAsyncDisposable
    {
        public WebApplication App => app;
        public HttpClient Client => client;
        public string Origin => origin;
        public Logs Logs => logs;
        public static async Task<Host> CreateAsync(CaptureHandler handler, bool enabled, Dictionary<string,string?>? changes = null)
        {
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName="Testing", Args=[] });
            var config = new Dictionary<string,string?> { ["MissionControl:Enabled"]=enabled.ToString(), ["MissionControl:BaseUrl"]="https://gateway.invalid/", ["MissionControl:ApiKey"]=Key, ["MissionControl:TimeoutMilliseconds"]="100", ["MissionControl:CloudflareAccessClientId"]="", ["MissionControl:CloudflareAccessClientSecret"]="" };
            if (changes is not null) foreach (var pair in changes) config[pair.Key]=pair.Value;
            builder.Configuration.AddInMemoryCollection(config);builder.WebHost.UseUrls("http://127.0.0.1:0");
            var logs = new Logs();builder.Logging.ClearProviders();builder.Logging.AddProvider(logs);builder.AddGardenVisits();
            builder.Services.AddHttpClient("JoyfulReaperLib.MissionControl").ConfigurePrimaryHttpMessageHandler(() => handler);
            var app = builder.Build();app.UseRateLimiter();app.MapGardenVisits();await app.StartAsync();
            var origin = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
            return new(app, new HttpClient { BaseAddress = new Uri(origin) }, origin, logs);
        }
        public Task<HttpResponseMessage> Post(string? origin = null, bool includeOrigin = true, string? site = "same-origin", string? body = null, string path = "/api/garden/visit")
        {
            var request = new HttpRequestMessage(HttpMethod.Post, path);
            if (includeOrigin) request.Headers.TryAddWithoutValidation("Origin", origin ?? Origin);
            if (site is not null) request.Headers.TryAddWithoutValidation("Sec-Fetch-Site", site);
            if (body is not null) request.Content = new StringContent(body);
            return Client.SendAsync(request);
        }
        public async ValueTask DisposeAsync() { client.Dispose();await app.StopAsync();await app.DisposeAsync(); }
    }
}
