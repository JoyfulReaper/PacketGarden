using System.Threading.Channels;

namespace PacketGarden;

public sealed record GardenGrowth(string SpecimenType, int ListenPort);

public sealed record GardenFrame(string Name, object Data);

// Only connected SSE clients receive transient growth events; there is no replay.
public sealed class GardenEvents
{
    private readonly object gate = new();
    private readonly HashSet<Channel<GardenFrame>> clients = [];

    public Channel<GardenFrame> AddClient()
    {
        var channel = Channel.CreateUnbounded<GardenFrame>(new() { SingleReader = true });
        lock (gate) clients.Add(channel);
        return channel;
    }

    public void RemoveClient(Channel<GardenFrame> channel)
    {
        lock (gate)
        {
            clients.Remove(channel);
            channel.Writer.TryComplete();
        }
    }

    public void Publish(GardenGrowth growth)
    {
        var frame = new GardenFrame("garden", growth);
        lock (gate)
            foreach (var client in clients) client.Writer.TryWrite(frame);
    }
}
