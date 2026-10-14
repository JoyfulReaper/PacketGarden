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
static GardenGrowth? Parse(string text, int roll = 0, int rareChoice = 0) =>
    TcpNoiseAdapter.Normalize(Encoding.UTF8.GetBytes(text), roll, rareChoice);
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
    (22, "redbloom"), (2222, "vine"), (23, "vine"), (2323, "vine"), (3389, "vine"), (5900, "vine"),
    (21, "mushroom"), (445, "mushroom"), (5432, "mushroom"), (6379, "mushroom"), (9200, "mushroom"), (70, "mushroom"),
    (25, "flower"), (420, "flower"), (42069, "flower"), (53, "flower"), (1, "flower"), (65535, "flower")
})
{
    Check(Parse(WithPort(good, port)) == new GardenGrowth(type, port), $"Port {port} maps to {type}");
    Check(TcpNoiseRarity.BaseSpecimen(port) == (type, port is 1 or 65535), $"Base mapping/fallback flag for {port}");
}

// Check the complete discrete roll space, as well as exact transition boundaries.
foreach (var port in new[] { 443, 2222, 53, 12345 })
foreach (var ipv6 in new[] { false, true })
foreach (var (sensor, bonus) in new[] { ("public", 0), ("overlay-dn42", 50), ("overlay-ygg", 100) })
{
    var fallback = port == 12345;
    var expectedWeed = (fallback ? 400 : 150) + bonus + (ipv6 ? 50 : 0);
    var expectedRare = (fallback ? 200 : 50) + bonus + (ipv6 ? 50 : 0);
    Check(TcpNoiseRarity.Chances(fallback, ipv6, sensor) == (expectedWeed, expectedRare), "Exact trait probabilities");
    Check(expectedWeed + expectedRare <= 900, "Stacked traits bounded at 9%, normal remains majority");
    var normalEnd = 10_000 - expectedWeed - expectedRare;
    var weedEnd = 10_000 - expectedRare;
    var normal = TcpNoiseRarity.BaseSpecimen(port).SpecimenType;
    string Resolve(int roll, int choice = 0) => TcpNoiseRarity.Resolve(port, ipv6, sensor, roll, choice);
    Check(Resolve(0) == normal && Resolve(normalEnd - 1) == normal, "Normal boundaries");
    Check(Resolve(normalEnd) == "weed" && Resolve(weedEnd - 1) == "weed", "Weed boundaries");
    Check(Resolve(weedEnd) == "ghostbloom" && Resolve(9999) == "ghostbloom", "Rare boundaries");
    foreach (var (choice, rare) in new[] { (0, "ghostbloom"), (1, "crystalfungus"), (2, "blackthorn") })
        Check(Resolve(weedEnd, choice) == rare && Resolve(9999, choice) == rare, "Only three equally selectable rare species");
    var counts = Enumerable.Range(0, 10_000).Select(roll => Resolve(roll)).GroupBy(type => type)
        .ToDictionary(group => group.Key, group => group.Count());
    Check(counts[normal] == normalEnd && counts["weed"] == expectedWeed && counts["ghostbloom"] == expectedRare,
        "Exact normal/weed/rare frequencies over all rolls, without probabilistic tests");
}

static string Traits(string json, string ipVersion, string sensor) =>
    json.Replace("\"listenPort\":443", $"\"listenPort\":443,\"ipVersion\":{ipVersion},\"sensor\":{sensor}");
foreach (var ip in new[] { "4", "6" })
foreach (var sensor in new[] { "public", "overlay-dn42", "overlay-ygg" })
{
    var input = Encoding.UTF8.GetBytes(WithPort(Traits(good, ip, JsonSerializer.Serialize(sensor)), 22));
    for (var roll = 0; roll < 10_000; roll++)
    for (var choice = 0; choice < 3; choice++)
    {
        Check(TcpNoiseAdapter.Normalize(input, roll, choice) == new GardenGrowth("redbloom", 22),
            "Port 22 stays redbloom for every roll/rare choice and IPv4/IPv6/sensor combination");
    }
}
Check(Parse(WithPort(good, 22), 9999, 2) == new GardenGrowth("redbloom", 22), "Port 22 needs no optional traits");
Check(Parse(WithPort(Traits(good, "{}", "[]"), 22), 9999, 2) == new GardenGrowth("redbloom", 22),
    "Unusable optional traits do not change the port-22 signal");
Check(Parse(WithPort(good, 22).Replace("tcpnoise.connection", "other"), 9999, 2) is null,
    "Port 22 still requires a validated TCPNoise event");
Check(JsonSerializer.Serialize(Parse(WithPort(Traits(good, "6", "\"private-sensor-ygg\""), 22), 9999, 2),
    new JsonSerializerOptions(JsonSerializerDefaults.Web)) == """{"specimenType":"redbloom","listenPort":22}""",
    "Port-22 SSE data has exactly the two safe fields, without sensor/IP/sensitive fields");
Check(Parse(Traits(good, "4", "\"public\""), 9750)?.SpecimenType == "broadleaf", "IPv4 public has base rates");
Check(Parse(Traits(good, "6", "\"public\""), 9750)?.SpecimenType == "weed", "IPv6 increases unusual growth");
Check(Parse(Traits(good, "4", "\"overlay-dn42\""), 9750)?.SpecimenType == "weed", "DN42 increases unusual growth");
Check(Parse(Traits(good, "4", "\"overlay-ygg\""), 9650)?.SpecimenType == "weed", "Ygg bonus exceeds DN42");
Check(Parse(Traits(good, "6", "\"overlay-ygg\""), 9450)?.SpecimenType == "broadleaf", "Stacked traits still allow normal growth");
Check(Parse(WithPort(Traits(good, "6", "\"overlay-ygg\""), 12345), 9100)?.SpecimenType == "weed", "Strongest fallback stack boundary");
Check(Parse(Traits(good, "4", "\"OVERLAY-DN42\""), 9750)?.SpecimenType == "weed", "Suffix matching is case insensitive");
foreach (var ip in new[] { "null", "\"6\"", "6.5", "6.0", "5", "true", "{}", "[]", "999999999999999999999999" })
{
    Check(Parse(Traits(good, ip, "\"public\""), 9750)?.SpecimenType == "broadleaf", "Unusable IP trait accepted without bonus");
    Check(Parse(Traits(good, ip, "\"overlay-ygg\""), 9650)?.SpecimenType == "weed", "Unusable IP trait preserves sensor bonus");
}
foreach (var sensor in new[] { "null", "4", "true", "{}", "[]", "\"\"", "\" \"", "\"dn42\"", "\"x-dn42-extra\"", "\"x-ygg \"" })
{
    Check(Parse(Traits(good, "4", sensor), 9750)?.SpecimenType == "broadleaf", "Unusable/nonmatching sensor has no bonus");
    Check(Parse(Traits(good, "6", sensor), 9750)?.SpecimenType == "weed", "Unusable sensor preserves IPv6 bonus");
}
Check(Parse(good, 9750)?.SpecimenType == "broadleaf", "Missing optional traits accepted without bonus");
foreach (var (roll, choice) in new[] { (0, 0), (9800, 0), (9999, 0), (9999, 1), (9999, 2) })
{
    var sanitized = JsonSerializer.Serialize(Parse(Traits(good, "6", "\"private-sensor-ygg\""), roll, choice),
        new JsonSerializerOptions(JsonSerializerDefaults.Web));
    using var document = JsonDocument.Parse(sanitized);
    Check(document.RootElement.EnumerateObject().Select(property => property.Name)
        .Order().SequenceEqual(new[] { "listenPort", "specimenType" }), "All outcomes serialize only the two safe fields");
    foreach (var secret in new[] { "private", "secret", "sensitive-test-marker", "sensor", "ipVersion", "remoteAddress", "remotePort", "banner", "payload" })
        Check(!sanitized.Contains(secret, StringComparison.OrdinalIgnoreCase), "No sensor/IP/sensitive fields forwarded");
}
foreach (var (roll, choice) in new[] { (-1, 0), (10_000, 0), (0, -1), (0, 3) })
{
    var rejected = false;
    try { TcpNoiseRarity.Resolve(443, false, null, roll, choice); }
    catch (ArgumentOutOfRangeException) { rejected = true; }
    Check(rejected, "Invalid supplied random values rejected");
}

var events = new GardenEvents();
events.Publish(Parse(WithPort(good, 22))!);
var first = events.AddClient();
var second = events.AddClient();
Check(!first.Reader.TryRead(out _), "No replay");
events.Publish(Parse(good)!);
Check(first.Reader.TryRead(out var a) && second.Reader.TryRead(out var b) && a == b, "Each client gets the same event");
Check(a is { Name: "garden", Data: GardenGrowth { SpecimenType: "broadleaf", ListenPort: 443 } }, "Fanout contains normalized growth");
Check(!first.Reader.TryRead(out _) && !second.Reader.TryRead(out _), "Exactly once per client");
events.Publish(Parse(WithPort(good, 22), 9999, 2)!);
Check(first.Reader.TryRead(out var redA) && second.Reader.TryRead(out var redB) && redA == redB
    && redA is { Name: "garden", Data: GardenGrowth { SpecimenType: "redbloom", ListenPort: 22 } },
    "Port-22 redbloom uses existing transient fanout");
events.RemoveClient(first);
events.Publish(new GardenGrowth("mushroom", 5432));
Check(second.Reader.TryRead(out var c) && c.Data is GardenGrowth { SpecimenType: "mushroom", ListenPort: 5432 }, "Remaining client unaffected by disconnect");
events.RemoveClient(second);
Console.WriteLine("PASS: TCPNoise validation/mapping, port-22 rarity bypass, port-2222 vine/rarity, exact rarity probabilities/boundaries/traits, sanitized growth fields, fanout, no replay, disconnect cleanup.");
