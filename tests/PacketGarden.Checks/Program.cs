using System.Text;
using System.Text.Json;
using NATS.Client.Core;
using PacketGarden;

if (args is ["publish", var url, .. var ports])
{
    await using var connection = new NatsConnection(NatsOpts.Default with { Url = url });
    foreach (var port in ports)
    {
        var data = Encoding.UTF8.GetBytes("""{"EventType":"tcpnoise.connection","SchemaVersion":1,"Payload":{"listenPort":PORT,"remoteAddress":"sensitive-test-marker","payload":"sensitive-test-marker"}}""".Replace("PORT", port));
        await connection.PublishAsync("tcpnoise.connection", data, serializer: NatsRawSerializer<byte[]>.Default);
    }
    await connection.PingAsync();
    return;
}

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}
static PortHit? Parse(string text) => TcpNoiseAdapter.Normalize(Encoding.UTF8.GetBytes(text));
var good = """{"EventType":"tcpnoise.connection","SchemaVersion":1,"Payload":{"listenPort":443,"remoteAddress":"sensitive-test-marker","remotePort":12345,"banner":"private","payload":"secret"}}""";
Check(Parse(good) == new PortHit(443), "Valid message normalization");
var json = JsonSerializer.Serialize(Parse(good), new JsonSerializerOptions(JsonSerializerDefaults.Web));
using (var document = JsonDocument.Parse(json))
{
    Check(document.RootElement.EnumerateObject().Count() == 2, "Only two sanitized fields");
    Check(document.RootElement.GetProperty("type").GetString() == "port-hit", "Normalized event type");
}
foreach (var input in new[] { "", "{", "null", "[]", "{}", good.Replace("tcpnoise.connection", "other"),
    good.Replace("\"SchemaVersion\":1", "\"SchemaVersion\":2"), good.Replace("\"SchemaVersion\":1,", ""),
    good.Replace("443", "0"), good.Replace("443", "65536"), good.Replace("443", "-1"),
    good.Replace("443", "443.5"), good.Replace("443", "\"443\""), good.Replace("443", "null"),
    """{"EventType":"tcpnoise.connection","SchemaVersion":1,"Payload":null}""" })
    Check(Parse(input) is null, "Malformed/unsupported message rejected");
Check(Parse(good.Replace("443", "1")) == new PortHit(1), "Lower bound");
Check(Parse(good.Replace("443", "65535")) == new PortHit(65535), "Upper bound");

var events = new GardenEvents();
events.Publish(new PortHit(22));
var first = events.AddClient();
var second = events.AddClient();
Check(!first.Reader.TryRead(out _), "No replay");
events.Publish(Parse(good)!);
Check(first.Reader.TryRead(out var a) && second.Reader.TryRead(out var b) && a == b, "Each client gets the same event");
Check(!first.Reader.TryRead(out _) && !second.Reader.TryRead(out _), "Exactly once per client");
events.RemoveClient(first);
events.Publish(new PortHit(5432));
Check(second.Reader.TryRead(out var c) && c.Data is PortHit { Port: 5432 }, "Remaining client unaffected by disconnect");
events.RemoveClient(second);
Console.WriteLine("PASS: TCPNoise normalization, malformed input, sanitized fields, fanout, no replay, disconnect cleanup.");
