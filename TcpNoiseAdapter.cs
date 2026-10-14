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
            return new GardenGrowth(species, port, ResolveVigor(envelope.Payload.SeenCount));
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // Optional recurrence trait: no identity, rarity, lifetime, or threat semantics.
    // Use the collector's unsigned 64-bit integer range; unusable/overflowing values default to 0.
    private static int ResolveVigor(JsonElement seenCount) =>
        seenCount.ValueKind == JsonValueKind.Number && seenCount.TryGetUInt64(out var count)
            ? count switch { <= 1 => 0, <= 3 => 1, <= 9 => 2, _ => 3 }
            : 0;

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
