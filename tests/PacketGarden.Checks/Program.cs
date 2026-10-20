using System.Globalization;
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
static GardenWeather? ParseWeather(string text)
{
    using var document = JsonDocument.Parse(text);
    return WeatherAdapter.Normalize(document.RootElement);
}
var weatherJson = """{"level":"rain","eventsPerMinute":29.8,"eventsLastFiveMinutes":149,"eventsLastHour":4321,"recentEvents":["private"]}""";
var weather = ParseWeather(weatherJson)!;
Check(weather == new GardenWeather("rain", 29.8, 4321), "Real source hour forwarded independently of rate (not rate * 60)");
Check(ParseWeather(weatherJson.Replace("4321", "4322")) != weather, "Hourly-only changes participate in weather change detection");
Check(new GardenWeather("quiet", 0, HasSnapshot: false) != ParseWeather("""{"level":"quiet","eventsPerMinute":0,"eventsLastHour":0}"""),
    "First valid zero snapshot differs from unobserved quiet/0 fallback");
foreach (var hour in new[] { "null", "-1", "1.5", "\"4321\"", "{}", "true", "9007199254740992", "1e1000" })
    Check(ParseWeather(weatherJson.Replace("\"eventsLastHour\":4321", $"\"eventsLastHour\":{hour}")) == weather with { EventsLastHour = null },
        "Invalid optional hour is unavailable without rejecting valid weather");
Check(ParseWeather("""{"level":"rain","eventsPerMinute":29.8}""") == weather with { EventsLastHour = null }, "Older snapshot remains compatible");
Check(ParseWeather(weatherJson.Replace("4321", "0"))?.EventsLastHour == 0, "Source zero is a real measurement");
Check(ParseWeather(weatherJson.Replace("29.8", "1000001"))?.EventsPerMinute == 1000000, "Existing rate clamp preserved");
Check(ParseWeather(weatherJson.Replace("29.8", "-1"))?.EventsPerMinute == 0, "Existing negative rate clamp preserved");
foreach (var bad in new[] { "null", "[]", "{}", weatherJson.Replace("rain", "unknown"), weatherJson.Replace("29.8", "null"),
    weatherJson.Replace("29.8", "\"29.8\""), weatherJson.Replace("29.8", "1e1000") })
    Check(ParseWeather(bad) is null, "Invalid required weather fields remain rejected");
using (var document = JsonDocument.Parse(JsonSerializer.Serialize(weather, new JsonSerializerOptions(JsonSerializerDefaults.Web))))
{
    Check(document.RootElement.EnumerateObject().Select(p => p.Name).Order()
        .SequenceEqual(new[] { "eventsLastHour", "eventsPerMinute", "hasSnapshot", "level" }), "Only normalized weather/availability fields serialized to SSE");
    Check(document.RootElement.GetProperty("eventsLastHour").GetInt64() == 4321, "SSE camel-case hour serialization");
    Check(document.RootElement.GetProperty("hasSnapshot").GetBoolean(), "Validated source is available");
}
Console.WriteLine("PASS: weather normalization, optional actual hour/zero, hourly-only equality, startup availability, compatible rendering clamp and minimal SSE serialization.");
var good = """{"EventType":"tcpnoise.connection","Source":"tcpnoise","SchemaVersion":1,"Payload":{"listenPort":443,"remoteAddress":"sensitive-test-marker","remotePort":12345,"banner":"private","payload":"secret"}}""";
Check(Parse(good) == new GardenGrowth("broadleaf", 443), "Valid message normalization");
var json = JsonSerializer.Serialize(Parse(good), new JsonSerializerOptions(JsonSerializerDefaults.Web));
using (var document = JsonDocument.Parse(json))
{
    Check(document.RootElement.EnumerateObject().Count() == 3, "Missing inspection metadata keeps the compact three-field shape");
    Check(document.RootElement.GetProperty("specimenType").GetString() == "broadleaf", "Normalized specimen type");
    Check(document.RootElement.GetProperty("listenPort").GetInt32() == 443, "Normalized listen port");
    Check(document.RootElement.GetProperty("vigor").GetInt32() == 0, "Missing seenCount defaults to vigor 0");
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
    (80, "broadleaf"), (443, "broadleaf"), (445, "broadleaf"), (8080, "broadleaf"), (8443, "broadleaf"),
    (22, "redbloom"), (2222, "redbloom"), (23, "wirefern"), (2323, "wirefern"), (3389, "vine"), (5900, "vine"),
    (21, "mushroom"), (70, "mushroom"),
    (25, "flower"), (420, "weed"), (42069, "weed"), (53, "flower"),
    (5432, "flower"), (6379, "flower"), (9200, "flower"), (1, "flower"), (65535, "flower")
})
{
    Check(Parse(WithPort(good, port)) == new GardenGrowth(type, port), $"Port {port} maps to {type}");
    Check(TcpNoiseRarity.BaseSpecimen(port) == (type, port is 1 or 65535), $"Base mapping/fallback flag for {port}");
}

foreach (var port in new[] { 419, 421, 42068, 42070 })
{
    Check(TcpNoiseRarity.BaseSpecimen(port) == ("flower", true), $"Adjacent port {port} remains fallback flower, not a weed range");
    Check(Parse(WithPort(good, port)) == new GardenGrowth("flower", port), $"Adjacent port {port} normalization unchanged");
}

Check(Parse(WithPort(good, 2222), 9799)?.SpecimenType == "redbloom", "Port 2222 has a redbloom base");
Check(Parse(WithPort(good, 2222), 9800)?.SpecimenType == "weed", "Port 2222 retains normal weed rarity");
Check(Parse(WithPort(good, 2222), 9999, 2)?.SpecimenType == "blackthorn", "Port 2222 retains normal rare growth");
foreach (var port in new[] { 23, 2323 })
{
    var input = WithPort(good, port);
    Check(Parse(input, 9799)?.SpecimenType == "wirefern", $"Port {port} normal roll stays wirefern");
    Check(Parse(input, 9800)?.SpecimenType == "weed", $"Port {port} weed boundary unchanged");
    Check(Parse(input, 9949)?.SpecimenType == "weed", $"Port {port} weed upper boundary unchanged");
    foreach (var (choice, rare) in new[] { (0, "ghostbloom"), (1, "crystalfungus"), (2, "blackthorn") })
        Check(Parse(input, 9950, choice)?.SpecimenType == rare, $"Port {port} existing true rare choice {choice}");
    var wireJson = JsonSerializer.Serialize(Parse(input), new JsonSerializerOptions(JsonSerializerDefaults.Web));
    Check(wireJson == $"{{\"specimenType\":\"wirefern\",\"listenPort\":{port},\"vigor\":0}}",
        "Wirefern uses the existing compact SSE schema");
}

// Check the complete discrete roll space, as well as exact transition boundaries.
foreach (var port in new[] { 443, 445, 2222, 23, 2323, 21, 70, 53, 5432, 6379, 9200, 12345, 420, 42069, 419, 421, 42068, 42070 })
foreach (var ipv6 in new[] { false, true })
foreach (var (sensor, bonus) in new[] { ("public", 0), ("overlay-dn42", 50), ("overlay-ygg", 100) })
{
    var fallback = port is 12345 or 419 or 421 or 42068 or 42070;
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
    foreach (var (choice, rare) in new[] { (0, "ghostbloom"), (1, "crystalfungus"), (2, "blackthorn") })
    {
        var counts = Enumerable.Range(0, 10_000).Select(roll => Resolve(roll, choice)).GroupBy(type => type)
            .ToDictionary(group => group.Key, group => group.Count());
        Check(counts[rare] == expectedRare, "Exact rare frequency over all rolls and each rare choice");
        if (port is 420 or 42069)
            Check(counts.Count == 2 && counts["weed"] == 10_000 - expectedRare,
                "Known weed-base ports merge normal and weed outcomes: 99.5% weed before trait bonuses");
        else
            Check(counts.Count == 3 && counts[normal] == normalEnd && counts["weed"] == expectedWeed,
                "Other ports retain separate exact normal/weed frequencies over all rolls");
    }
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
        Check(TcpNoiseAdapter.Normalize(input, roll, choice) == new GardenGrowth("redbloom", 22, 0, sensor),
            "Port 22 stays redbloom for every roll/rare choice and IPv4/IPv6/sensor combination");
    }
}
Check(Parse(WithPort(good, 22), 9999, 2) == new GardenGrowth("redbloom", 22), "Port 22 needs no optional traits");
Check(Parse(WithPort(Traits(good, "{}", "[]"), 22), 9999, 2) == new GardenGrowth("redbloom", 22),
    "Unusable optional traits do not change the port-22 signal");
Check(Parse(WithPort(good, 22).Replace("tcpnoise.connection", "other"), 9999, 2) is null,
    "Port 22 still requires a validated TCPNoise event");
Check(JsonSerializer.Serialize(Parse(WithPort(Traits(good, "6", "\"private-sensor-ygg\""), 22), 9999, 2),
    new JsonSerializerOptions(JsonSerializerDefaults.Web)) == """{"specimenType":"redbloom","listenPort":22,"vigor":0,"sensor":"private-sensor-ygg"}""",
    "Port-22 SSE data includes bounded inspection sensor metadata without IP/payload fields");
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

static string Seen(string json, string count) => json.Replace("\"Payload\":{", $"\"Payload\":{{\"seenCount\":{count},");
static string? ExpectedSeen(string count) =>
    ulong.TryParse(count, NumberStyles.None, CultureInfo.InvariantCulture, out var parsed)
        ? parsed.ToString(CultureInfo.InvariantCulture) : null;
var vigorCases = new (string Count, int Vigor)[]
{
    ("null", 0), ("\"10\"", 0), ("{}", 0), ("[]", 0), ("true", 0),
    ("0", 0), ("-1", 0), ("-10", 0), ("1", 0), ("2", 1), ("3", 1),
    ("4", 2), ("9", 2), ("10", 3), ("1000000000", 3), ("18446744073709551615", 3),
    ("18446744073709551616", 0), ("1e1000", 0), ("9999999999999999999999999999999999999999", 0),
    ("2.5", 0), ("10.0", 0), ("1e1", 0)
};
foreach (var (count, vigor) in vigorCases)
{
    var exact = ExpectedSeen(count);
    Check(Parse(Seen(good, count)) == new GardenGrowth("broadleaf", 443, vigor, null, exact), $"seenCount {count} -> vigor {vigor} plus exact inspection count when valid");
    Check(Parse(Seen(WithPort(good, 22), count), 9999, 2) == new GardenGrowth("redbloom", 22, vigor, null, exact),
        "Port 22 remains redbloom at every vigor/default case");
}

// Vigor and inspection metadata must not affect base mappings or any normal/weed/rare boundary outcome.
foreach (var port in new[] { 22, 2222, 23, 2323, 443, 5432, 53, 12345, 420, 42069 })
foreach (var ip in new[] { "4", "6" })
foreach (var sensor in new[] { "public", "overlay-dn42", "overlay-ygg" })
{
    var input = WithPort(Traits(good, ip, JsonSerializer.Serialize(sensor)), port);
    var (_, fallback) = TcpNoiseRarity.BaseSpecimen(port);
    var (weed, rare) = TcpNoiseRarity.Chances(fallback, ip == "6", sensor);
    var normalEnd = 10_000 - weed - rare;
    var weedEnd = 10_000 - rare;
    foreach (var roll in new[] { 0, normalEnd - 1, normalEnd, weedEnd - 1, weedEnd, 9999 })
    for (var choice = 0; choice < 3; choice++)
    foreach (var (count, vigor) in vigorCases)
    {
        var baseline = Parse(input, roll, choice)!;
        Check(Parse(Seen(input, count), roll, choice) == baseline with { Vigor = vigor, SeenCount = ExpectedSeen(count) },
            "seenCount affects only vigor/inspection metadata, independently of port/species/rarity/traits");
    }
}

foreach (var port in new[] { 443, 420, 42069 })
foreach (var (roll, choice) in new[] { (0, 0), (9799, 0), (9800, 0), (9999, 0), (9999, 1), (9999, 2) })
{
    var sanitized = JsonSerializer.Serialize(Parse(Seen(WithPort(Traits(good, "6", "\"private-sensor-ygg\""), port), "1234567"), roll, choice),
        new JsonSerializerOptions(JsonSerializerDefaults.Web));
    using var document = JsonDocument.Parse(sanitized);
    Check(document.RootElement.EnumerateObject().Select(property => property.Name)
        .Order().SequenceEqual(new[] { "listenPort", "seenCount", "sensor", "specimenType", "vigor" }),
        "Inspectable outcomes serialize only the five intended fields");
    Check(document.RootElement.GetProperty("listenPort").GetInt32() == port, "Exact listening port preserved in SSE data");
    Check(document.RootElement.GetProperty("specimenType").GetString() == TcpNoiseRarity.Resolve(port, true, "private-sensor-ygg", roll, choice),
        "Normalized species preserved in SSE data, including ordinary port-mapped weed and rare outcomes");
    Check(document.RootElement.GetProperty("vigor").GetInt32() == 3, "Bounded vigor forwarded");
    Check(document.RootElement.GetProperty("sensor").GetString() == "private-sensor-ygg", "Sensor label forwarded for inspection");
    Check(document.RootElement.GetProperty("seenCount").GetString() == "1234567", "Exact seenCount forwarded as text");
    foreach (var secret in new[] { "secret", "sensitive-test-marker", "ipVersion", "remoteAddress", "remotePort", "banner", "payload" })
        Check(!sanitized.Contains(secret, StringComparison.OrdinalIgnoreCase), "Packet/IP/sensitive fields remain excluded");
}
var longSensor = new string('x', 140) + "-ygg";
var longSensorGrowth = Parse(Traits(good, "4", JsonSerializer.Serialize(longSensor)))!;
Check(longSensorGrowth.Sensor?.Length == 128, "Inspection sensor is bounded to 128 characters");
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
events.Publish(Parse(Seen(WithPort(good, 22), "10"), 9999, 2)!);
Check(first.Reader.TryRead(out var redA) && second.Reader.TryRead(out var redB) && redA == redB
    && redA is { Name: "garden", Data: GardenGrowth { SpecimenType: "redbloom", ListenPort: 22, Vigor: 3, SeenCount: "10" } },
    "Port-22 redbloom uses existing transient fanout with inspection count");
foreach (var port in new[] { 420, 42069 })
{
    var growth = Parse(Seen(WithPort(Traits(good, "4", "\"public\""), port), "10"), 9949)!;
    events.Publish(growth);
    Check(first.Reader.TryRead(out var weedA) && second.Reader.TryRead(out var weedB) && weedA == weedB
        && weedA is { Name: "garden", Data: GardenGrowth weedGrowth } && weedGrowth == new GardenGrowth("weed", port, 3, "public", "10"),
        "Port-mapped ordinary weed retains exact port/vigor/safe provenance through existing SSE fanout");
}
events.RemoveClient(first);
events.Publish(Parse(WithPort(good, 70))!);
Check(second.Reader.TryRead(out var c) && c.Data is GardenGrowth { SpecimenType: "mushroom", ListenPort: 70 }, "Remaining client unaffected by disconnect");
events.RemoveClient(second);
Console.WriteLine("PASS: TCPNoise validation/mapping, exact 420/42069 known weed bases and unaffected neighbors, bounded vigor and safe metadata, port-22 bypass, all 10000 rarity rolls/three rare choices/trait combinations, sensitive-field exclusion, fanout, no replay, disconnect cleanup.");
