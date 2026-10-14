using System.Threading.Channels;

namespace PacketGarden;

public sealed record PortHit(int Port)
{
    public string Type => "port-hit";
}

public sealed record GardenFrame(string Name, object Data);

// Only connected SSE clients receive transient port hits; there is no replay.
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

    public void Publish(PortHit hit)
    {
        var frame = new GardenFrame("garden", hit);
        lock (gate)
            foreach (var client in clients) client.Writer.TryWrite(frame);
    }
}
