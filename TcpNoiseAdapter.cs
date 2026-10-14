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
    private sealed record Envelope(string? EventType, int? SchemaVersion, PortPayload? Payload);
    private sealed record PortPayload(int? ListenPort);
    private static readonly JsonSerializerOptions InputJson = new() { PropertyNameCaseInsensitive = true };
    private int unavailable;

    public static PortHit? Normalize(ReadOnlySpan<byte> data)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<Envelope>(data, InputJson);
            return envelope is { EventType: "tcpnoise.connection", SchemaVersion: 1,
                Payload.ListenPort: >= 1 and <= 65535 }
                ? new PortHit(envelope.Payload.ListenPort.Value) : null;
        }
        catch (JsonException) { return null; }
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
                        if (message.Data is not null && Normalize(message.Data) is { } hit)
                            events.Publish(hit);
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
