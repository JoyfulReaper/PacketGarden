using System.Text.Json.Serialization;
using JoyfulReaperLib.MissionControl;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace PacketGarden;

// No browser data participates in either the payload or the event envelope.
public sealed record GardenVisitPayload(string Message);

[JsonSourceGenerationOptions(System.Text.Json.JsonSerializerDefaults.Web)]
[JsonSerializable(typeof(GardenVisitPayload))]
internal partial class GardenVisitJsonContext : JsonSerializerContext;

public sealed class GardenVisitPublisher(IMissionControlClient client, IOptions<MissionControlClientOptions> options) : IDisposable
{
    public const string EventType = "packetgarden.garden.visited";
    public const int MaxConcurrent = 2;
    private readonly SemaphoreSlim _slots = new(MaxConcurrent);
    private static readonly GardenVisitPayload Payload = new("Someone visited the garden!");

    public async Task TryNotifyAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.Enabled) return;
        var acquired = false;
        try
        {
            // No queue, retry or durable delivery. Busy attempts are intentionally dropped.
            acquired = await _slots.WaitAsync(0, cancellationToken);
            if (!acquired) return;
            using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            budget.CancelAfter(options.Value.TimeoutMilliseconds);
            await client.TryPublishAsync(EventType, Payload, GardenVisitJsonContext.Default.GardenVisitPayload,
                DateTimeOffset.UtcNow, cancellationToken: budget.Token);
        }
        catch (Exception) { } // Optional notification must never become a garden dependency.
        finally { if (acquired) _slots.Release(); }
    }

    public void Dispose() => _slots.Dispose();
}

public static class GardenVisitEndpoints
{
    public const int RequestsPerMinute = 30;
    private const string Policy = "garden-visits";

    public static void AddGardenVisits(this WebApplicationBuilder builder)
    {
        var section = builder.Configuration.GetSection(MissionControlClientOptions.SectionName);
        builder.Services.AddMissionControlClient(section);
        builder.Services.PostConfigure<MissionControlClientOptions>(options =>
        {
            options.ApiKey ??= string.Empty;
            // The shared client validates at startup. Disable unusable optional configuration
            // before that validation so a typo/missing key cannot take the garden offline.
            var validUrl = Uri.TryCreate(section["BaseUrl"], UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
                && uri.UserInfo.Length == 0 && uri.Query.Length == 0 && uri.Fragment.Length == 0;
            options.Enabled &= validUrl && options.ApiKey.Length >= 32
                && !options.ApiKey.Any(char.IsControl);
            options.BaseUrl = validUrl ? uri!.AbsoluteUri.TrimEnd('/') + "/" : "http://localhost:5190/";
            options.TimeoutMilliseconds = Math.Clamp(options.TimeoutMilliseconds, 100, 2000);
        });
        builder.Services.AddHttpClient("JoyfulReaperLib.MissionControl")
            .RemoveAllLoggers()
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                AllowAutoRedirect = false, UseCookies = false
            });
        // Shared-client rejection logs include upstream bodies. Suppress them and HTTP
        // request URL logs rather than recording untrusted text, secrets or query strings.
        builder.Logging.AddFilter("JoyfulReaperLib.MissionControl.MissionControlClient", LogLevel.None);
        builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
        builder.Services.AddSingleton<GardenVisitPublisher>();
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = (context, _) =>
            {
                RestrictBody(context.HttpContext);
                context.HttpContext.Response.Headers.CacheControl = "no-store";
                return ValueTask.CompletedTask;
            };
            options.AddFixedWindowLimiter(Policy, limiter =>
            {
                limiter.PermitLimit = RequestsPerMinute;
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueLimit = 0;
                limiter.AutoReplenishment = true;
            }); // One global bucket per process, never partitioned by IP/browser identity.
        });
    }

    public static void MapGardenVisits(this WebApplication app) =>
        app.MapPost("/api/garden/visit", async (HttpContext context, GardenVisitPublisher publisher) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var hasBody = RestrictBody(context);
            if (!IsSameOrigin(context.Request)) return Results.StatusCode(StatusCodes.Status403Forbidden);
            if (context.Request.QueryString.HasValue) return Results.BadRequest();
            if (hasBody)
                return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
            await publisher.TryNotifyAsync(context.RequestAborted);
            return Results.NoContent(); // Never report Gateway success/failure or private configuration.
        }).RequireRateLimiting(Policy);

    private static bool RestrictBody(HttpContext context)
    {
        var size = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (size is { IsReadOnly: false }) size.MaxRequestBodySize = 0;
        var hasBody = context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey("Transfer-Encoding")
            || context.Features.Get<IHttpRequestBodyDetectionFeature>()?.CanHaveBody == true;
        // Also applies to rate-limit rejections: never drain an arbitrary body or
        // reuse an HTTP/1 connection whose untrusted body was intentionally unread.
        if (hasBody && context.Request.Protocol.StartsWith("HTTP/1", StringComparison.Ordinal))
            context.Response.Headers.Connection = "close";
        return hasBody;
    }

    public static bool IsSameOrigin(HttpRequest request)
    {
        var values = request.Headers.Origin;
        if (values.Count != 1 || !Uri.TryCreate(values[0], UriKind.Absolute, out var origin)
            || origin.UserInfo.Length != 0 || origin.AbsolutePath != "/" || origin.Query.Length != 0
            || origin.Fragment.Length != 0 || !Uri.TryCreate($"{request.Scheme}://{request.Host}", UriKind.Absolute, out var local))
            return false;
        var fetchSite = request.Headers["Sec-Fetch-Site"];
        return string.Equals(origin.GetLeftPart(UriPartial.Authority), local.GetLeftPart(UriPartial.Authority), StringComparison.OrdinalIgnoreCase)
            && (fetchSite.Count == 0 || fetchSite.Count == 1 && fetchSite[0] == "same-origin");
    }
}
