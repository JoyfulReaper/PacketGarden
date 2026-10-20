using System.Runtime.CompilerServices;
using System.Text.Json;

namespace PacketGarden;

public sealed record GardenWeather(string Level, double EventsPerMinute, long? EventsLastHour = null, bool HasSnapshot = true);

public sealed class WeatherAdapter(
    IHttpClientFactory clients,
    IConfiguration configuration,
    ILogger<WeatherAdapter> logger) : BackgroundService
{
    private readonly object gate = new();
    // Quiet/0 is a rendering fallback, not an observed traffic measurement.
    private GardenWeather current = new("quiet", 0, HasSnapshot: false);
    private TaskCompletionSource changed = NewSignal();
    private bool fetchFailing;

    private static TaskCompletionSource NewSignal() =>
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    public static GardenWeather? Normalize(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object ||
            !root.TryGetProperty("level", out var levelValue) || levelValue.ValueKind != JsonValueKind.String ||
            !root.TryGetProperty("eventsPerMinute", out var rateValue) ||
            rateValue.ValueKind != JsonValueKind.Number || !rateValue.TryGetDouble(out var rate) || !double.IsFinite(rate))
            return null;
        var level = levelValue.GetString();
        if (level is not ("quiet" or "drizzle" or "rain" or "heavy_rain" or "botnet_thunderstorm" or "botnet_hurricane"))
            return null;
        // Optional for older sources. Never infer an hour from the five-minute average.
        // Keep counts exact in browser JSON numbers (Number.MAX_SAFE_INTEGER).
        long? hour = root.TryGetProperty("eventsLastHour", out var hourValue) &&
            hourValue.ValueKind == JsonValueKind.Number && hourValue.TryGetInt64(out var count) &&
            count is >= 0 and <= 9_007_199_254_740_991 ? count : null;
        return new GardenWeather(level, Math.Clamp(rate, 0, 1_000_000), hour);
    }

    public async IAsyncEnumerable<GardenWeather> Updates(
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        GardenWeather? previous = null;
        while (!cancellationToken.IsCancellationRequested)
        {
            GardenWeather snapshot;
            Task nextChange;
            lock (gate)
            {
                snapshot = current;
                nextChange = changed.Task;
            }
            if (snapshot != previous)
            {
                yield return snapshot;
                previous = snapshot;
            }
            await nextChange.WaitAsync(cancellationToken);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
        try
        {
            do
            {
                await FetchWeather(stoppingToken);
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown.
        }
    }

    private async Task FetchWeather(CancellationToken stoppingToken)
    {
        try
        {
            var url = configuration["Weather:SnapshotUrl"] ?? "https://noise.kgivler.com/api/snapshot";
            using var client = clients.CreateClient("weather");
            using var response = await client.GetAsync(url, stoppingToken);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(stoppingToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: stoppingToken);
            var weather = Normalize(document.RootElement) ?? throw new JsonException("Missing or invalid weather fields/level.");
            lock (gate)
            {
                if (weather != current)
                {
                    current = weather;
                    var signal = changed;
                    changed = NewSignal();
                    signal.TrySetResult();
                }
            }
            if (fetchFailing) logger.LogInformation("Weather snapshot polling recovered.");
            fetchFailing = false;
        }
        catch (Exception ex) when (!stoppingToken.IsCancellationRequested &&
            ex is HttpRequestException or JsonException or OperationCanceledException or UriFormatException or InvalidOperationException)
        {
            if (!fetchFailing)
                logger.LogWarning("Weather snapshot unavailable; retaining last valid state. {Reason}", ex.Message);
            fetchFailing = true;
        }
    }
}
