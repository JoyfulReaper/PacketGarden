using System.Runtime.CompilerServices;
using System.Text.Json;

namespace PacketGarden;

public sealed record GardenWeather(string Level, double EventsPerMinute);

public sealed class WeatherAdapter(
    IHttpClientFactory clients,
    IConfiguration configuration,
    ILogger<WeatherAdapter> logger) : BackgroundService
{
    private readonly object gate = new();
    private GardenWeather current = new("quiet", 0);
    private TaskCompletionSource changed = NewSignal();
    private bool fetchFailing;

    private static TaskCompletionSource NewSignal() =>
        new(TaskCreationOptions.RunContinuationsAsynchronously);

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
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object ||
                !root.TryGetProperty("level", out var levelValue) || levelValue.ValueKind != JsonValueKind.String ||
                !root.TryGetProperty("eventsPerMinute", out var rateValue) ||
                rateValue.ValueKind != JsonValueKind.Number || !rateValue.TryGetDouble(out var rate) || !double.IsFinite(rate))
            {
                throw new JsonException("Missing or invalid weather fields.");
            }
            var level = levelValue.GetString();
            if (level is not ("quiet" or "drizzle" or "rain" or "heavy_rain" or "botnet_thunderstorm" or "botnet_hurricane"))
            {
                throw new JsonException("Unsupported weather level.");
            }
            var weather = new GardenWeather(level, Math.Clamp(rate, 0, 1_000_000));
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
