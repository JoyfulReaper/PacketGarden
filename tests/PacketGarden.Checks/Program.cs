using System.Text;
using System.Text.Json;
using NATS.Client.Core;
using PacketGarden;

if (args is ["publish", var url, .. var ports])
{
    await using var connection = new NatsConnection(NatsOpts.Default with { Url = url });
    foreach (var port in ports)
    {
        var data = Encoding.UTF8.GetBytes("""{"EventType":"tcpnoise.connection","Source":"tcpnoise","SchemaVersion":1,"Payload":{"listenPort":PORT,"remoteAddress":"sensitive-test-marker","payload":"sensitive-test-marker"}}""".Replace("PORT", port));
        await connection.PublishAsync("tcpnoise.connection", data, serializer: NatsRawSerializer<byte[]>.Default);
    }
    await connection.PingAsync();
    return;
}

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}
static GardenGrowth? Parse(string text) => TcpNoiseAdapter.Normalize(Encoding.UTF8.GetBytes(text));
var good = """{"EventType":"tcpnoise.connection","Source":"tcpnoise","SchemaVersion":1,"Payload":{"listenPort":443,"remoteAddress":"sensitive-test-marker","remotePort":12345,"banner":"private","payload":"secret"}}""";
Check(Parse(good) == new GardenGrowth("broadleaf", 443), "Valid message normalization");
var json = JsonSerializer.Serialize(Parse(good), new JsonSerializerOptions(JsonSerializerDefaults.Web));
using (var document = JsonDocument.Parse(json))
{
    Check(document.RootElement.EnumerateObject().Count() == 2, "Only two sanitized fields");
    Check(document.RootElement.GetProperty("specimenType").GetString() == "broadleaf", "Normalized specimen type");
    Check(document.RootElement.GetProperty("listenPort").GetInt32() == 443, "Normalized listen port");
    Check(!json.Contains("sensitive-test-marker", StringComparison.Ordinal), "Sensitive source fields are not serialized");
}
foreach (var input in new[] { "", "{", "null", "[]", "{}", good.Replace("tcpnoise.connection", "other"),
    good.Replace("\"Source\":\"tcpnoise\"", "\"Source\":\"other\""), good.Replace("\"Source\":\"tcpnoise\",", ""),
    good.Replace("\"SchemaVersion\":1", "\"SchemaVersion\":2"), good.Replace("\"SchemaVersion\":1,", ""),
    good.Replace("\"listenPort\":443", "\"listenPort\":0"), good.Replace("\"listenPort\":443", "\"listenPort\":65536"),
    good.Replace("\"listenPort\":443", "\"listenPort\":-1"), good.Replace("\"listenPort\":443", "\"listenPort\":443.5"),
    good.Replace("\"listenPort\":443", "\"listenPort\":\"443\""), good.Replace("\"listenPort\":443", "\"listenPort\":null"),
    """{"EventType":"tcpnoise.connection","Source":"tcpnoise","SchemaVersion":1,"Payload":null}""" })
    Check(Parse(input) is null, "Malformed/unsupported message rejected");

static string WithPort(string json, int port) => json.Replace("\"listenPort\":443", $"\"listenPort\":{port}");
foreach (var (port, type) in new (int Port, string Type)[]
{
    (80, "broadleaf"), (443, "broadleaf"), (8080, "broadleaf"), (8443, "broadleaf"),
    (22, "vine"), (2222, "vine"), (23, "vine"), (2323, "vine"), (3389, "vine"), (5900, "vine"),
    (21, "mushroom"), (445, "mushroom"), (5432, "mushroom"), (6379, "mushroom"), (9200, "mushroom"), (70, "mushroom"),
    (25, "flower"), (420, "flower"), (42069, "flower"), (53, "flower"), (1, "flower"), (65535, "flower")
})
{
    Check(Parse(WithPort(good, port)) == new GardenGrowth(type, port), $"Port {port} maps to {type}");
}

var events = new GardenEvents();
events.Publish(new GardenGrowth("vine", 22));
var first = events.AddClient();
var second = events.AddClient();
Check(!first.Reader.TryRead(out _), "No replay");
events.Publish(Parse(good)!);
Check(first.Reader.TryRead(out var a) && second.Reader.TryRead(out var b) && a == b, "Each client gets the same event");
Check(a.Name == "garden" && a.Data is GardenGrowth { SpecimenType: "broadleaf", ListenPort: 443 }, "Fanout contains normalized growth");
Check(!first.Reader.TryRead(out _) && !second.Reader.TryRead(out _), "Exactly once per client");
events.RemoveClient(first);
events.Publish(new GardenGrowth("mushroom", 5432));
Check(second.Reader.TryRead(out var c) && c.Data is GardenGrowth { SpecimenType: "mushroom", ListenPort: 5432 }, "Remaining client unaffected by disconnect");
events.RemoveClient(second);
Console.WriteLine("PASS: TCPNoise validation/mapping, sanitized growth fields, fanout, no replay, disconnect cleanup.");
