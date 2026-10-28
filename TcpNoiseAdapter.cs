using System.Globalization;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.Extensions.Logging.Abstractions;
using NATS.Client.Core;

namespace PacketGarden;

public sealed class TcpNoiseAdapter(
    IConfiguration configuration,
    GardenEvents events,
    ILogger<TcpNoiseAdapter> logger) : BackgroundService
{
    // Unknown envelope/payload fields are ignored, never retained or forwarded.
    private sealed record Envelope(string? EventType, string? Source, int? SchemaVersion, PortPayload? Payload);
    private sealed record PortPayload(int? ListenPort, JsonElement IpVersion, JsonElement Sensor, JsonElement SeenCount);
    private static readonly JsonSerializerOptions InputJson = new() { PropertyNameCaseInsensitive = true };
    private int unavailable;

    public static GardenGrowth? Normalize(ReadOnlySpan<byte> data) =>
        Normalize(data, Random.Shared.Next(10_000), Random.Shared.Next(3));

    public static GardenGrowth? Normalize(ReadOnlySpan<byte> data, int roll, int rareChoice)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<Envelope>(data, InputJson);
            if (envelope is not
                {
                    EventType: "tcpnoise.connection",
                    Source: "tcpnoise",
                    SchemaVersion: 1,
                    Payload.ListenPort: >= 1 and <= 65535
                })
            {
                return null;
            }

            var port = envelope.Payload.ListenPort.Value;
            // Optional traits never invalidate a connection. Only numeric integer 6
            // earns the IPv6 bonus; 4, missing, and unusable values have no bonus.
            var ipVersion = envelope.Payload.IpVersion;
            var isIpv6 = ipVersion.ValueKind == JsonValueKind.Number
                && ipVersion.TryGetInt32(out var version) && version == 6;
            var sensor = envelope.Payload.Sensor.ValueKind == JsonValueKind.String
                ? envelope.Payload.Sensor.GetString() : null;
            var species = TcpNoiseRarity.Resolve(port, isIpv6, sensor, roll, rareChoice);
            var (vigor, seenCount) = ResolveSeenCount(envelope.Payload.SeenCount);
            return new GardenGrowth(species, port, vigor, InspectionSensor(sensor), seenCount);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // Optional recurrence trait: no rarity, lifetime, or threat semantics.
    // Preserve a valid unsigned count as text for inspection so JavaScript never loses UInt64 precision.
    private static (int Vigor, string? SeenCount) ResolveSeenCount(JsonElement seenCount)
    {
        if (seenCount.ValueKind != JsonValueKind.Number || !seenCount.TryGetUInt64(out var count))
            return (0, null);

        var vigor = count switch { <= 1 => 0, <= 99 => 1, <= 9999 => 2, _ => 3 };
        return (vigor, count.ToString(CultureInfo.InvariantCulture));
    }

    // Sensor is useful provenance for click inspection but remains bounded display metadata.
    private static string? InspectionSensor(string? sensor)
    {
        if (string.IsNullOrWhiteSpace(sensor)) return null;
        return sensor.Length <= 128 ? sensor : sensor[..128];
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var url = configuration["Nats:Url"];
        if (string.IsNullOrWhiteSpace(url))
        {
            logger.LogInformation("TCPNoise input disabled: Nats:Url is not configured.");
            return;
        }
        var subject = configuration["Nats:Subject"] ?? "tcpnoise.connection";
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await using var connection = new NatsConnection(NatsOpts.Default with
                    {
                        Url = url,
                        Name = "PacketGarden",
                        // Avoid client logs containing broker credentials or repeated stack traces.
                        LoggerFactory = NullLoggerFactory.Instance,
                        SubPendingChannelFullMode = BoundedChannelFullMode.Wait
                    });
                    connection.ConnectionDisconnected += (_, _) =>
                    {
                        if (!stoppingToken.IsCancellationRequested) ReportUnavailable();
                        return ValueTask.CompletedTask;
                    };
                    connection.ConnectionOpened += (_, _) =>
                    {
                        Interlocked.Exchange(ref unavailable, 0);
                        logger.LogInformation("TCPNoise NATS connection established.");
                        return ValueTask.CompletedTask;
                    };
                    await foreach (var message in connection.SubscribeAsync<byte[]>(subject,
                        serializer: NatsRawSerializer<byte[]>.Default, cancellationToken: stoppingToken))
                    {
                        if (message.Data is not null && Normalize(message.Data) is { } growth)
                            events.Publish(growth);
                    }
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested &&
                    ex is NatsException or ArgumentException or InvalidOperationException or UriFormatException
                        or OperationCanceledException or IOException or System.Net.Sockets.SocketException)
                {
                    ReportUnavailable();
                }
                // Initial connect/terminated subscription retry; established connections use client reconnect.
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }

    private void ReportUnavailable()
    {
        if (Interlocked.Exchange(ref unavailable, 1) == 0)
            logger.LogWarning("TCPNoise NATS input unavailable; waiting to reconnect.");
    }
}
