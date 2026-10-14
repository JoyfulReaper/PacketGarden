namespace PacketGarden;

// Artistic traits only: neither ports nor network/sensor traits classify traffic.
public static class TcpNoiseRarity
{
    public static (string SpecimenType, bool IsFallback) BaseSpecimen(int port) => port switch
    {
        22 => ("redbloom", false),
        80 or 443 or 445 or 8080 or 8443 => ("broadleaf", false),
        2222 or 23 or 2323 or 3389 or 5900 => ("vine", false),
        21 or 70 => ("mushroom", false),
        25 or 53 or 420 or 42069 or 5432 or 6379 or 9200 => ("flower", false),
        _ => ("flower", true)
    };

    // Integer basis points (100 = 1%) keep the roll boundaries exact.
    public static (int Weed, int Rare) Chances(bool isFallback, bool isIpv6, string? sensor)
    {
        var bonus = isIpv6 ? 50 : 0;
        if (sensor?.EndsWith("-dn42", StringComparison.OrdinalIgnoreCase) == true) bonus += 50;
        else if (sensor?.EndsWith("-ygg", StringComparison.OrdinalIgnoreCase) == true) bonus += 100;
        // Suffixes are mutually exclusive; maximum total unusual chance is 9%.
        return ((isFallback ? 400 : 150) + bonus, (isFallback ? 200 : 50) + bonus);
    }

    // Production supplies uniform random values; checks supply exact boundaries.
    public static string Resolve(int port, bool isIpv6, string? sensor, int roll, int rareChoice)
    {
        // A listening-port hit only, not evidence of SSH or authentication.
        // Keep this aesthetic signal recognizable regardless of traits or rolls.
        if (port == 22) return "redbloom";

        ArgumentOutOfRangeException.ThrowIfNegative(roll);
        ArgumentOutOfRangeException.ThrowIfGreaterThanOrEqual(roll, 10_000);
        ArgumentOutOfRangeException.ThrowIfNegative(rareChoice);
        ArgumentOutOfRangeException.ThrowIfGreaterThanOrEqual(rareChoice, 3);
        var (normal, isFallback) = BaseSpecimen(port);
        var (weed, rare) = Chances(isFallback, isIpv6, sensor);
        if (roll < 10_000 - weed - rare) return normal;
        if (roll < 10_000 - rare) return "weed";
        return rareChoice switch { 0 => "ghostbloom", 1 => "crystalfungus", _ => "blackthorn" };
    }
}
