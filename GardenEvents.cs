using System.Text.Json.Serialization;
using System.Threading.Channels;

namespace PacketGarden;

public sealed record GardenGrowth(
    string SpecimenType,
    int ListenPort,
    int Vigor = 0,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Sensor = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? SeenCount = null);

public sealed record GardenFrame(string Name, object Data);

// Only connected SSE clients receive transient frames; there is no replay.
// Slow subscribers are disconnected instead of buffering indefinitely or silently dropping weather.
public sealed class GardenEvents
{
    public const int ClientQueueCapacity = 256;
    public const int MaxClients = 128;

    public sealed class Subscription
    {
        private readonly CancellationTokenSource closed = new();
        private int isClosed;
        internal readonly Channel<GardenFrame> Queue = Channel.CreateBounded<GardenFrame>(
            new BoundedChannelOptions(ClientQueueCapacity)
            {
                SingleReader = true,
                SingleWriter = false,
                FullMode = BoundedChannelFullMode.Wait
            });

        public ChannelReader<GardenFrame> Reader => Queue.Reader;
        public CancellationToken Closed => closed.Token;

        internal bool TryWrite(GardenFrame frame) => Queue.Writer.TryWrite(frame);

        internal void Close()
        {
            if (Interlocked.Exchange(ref isClosed, 1) != 0) return;
            Queue.Writer.TryComplete();
            closed.Cancel();
        }
    }

    private readonly object gate = new();
    private readonly HashSet<Subscription> clients = [];

    // Reject excess streams rather than allowing unlimited idle subscribers.
    public Subscription? AddClient()
    {
        lock (gate)
        {
            if (clients.Count >= MaxClients) return null;
            var client = new Subscription();
            clients.Add(client);
            return client;
        }
    }

    public void RemoveClient(Subscription client)
    {
        lock (gate) clients.Remove(client);
        client.Close();
    }

    // Weather frames use the same capacity and overflow policy as growth frames.
    // Never await a slow client from the shared weather pump.
    public bool TryPublish(Subscription client, GardenFrame frame)
    {
        bool accepted;
        lock (gate)
        {
            if (!clients.Contains(client)) return false;
            accepted = client.TryWrite(frame);
            if (!accepted) clients.Remove(client);
        }
        if (!accepted) client.Close();
        return accepted;
    }

    public void Publish(GardenGrowth growth)
    {
        var frame = new GardenFrame("garden", growth);
        List<Subscription>? slow = null;
        lock (gate)
        {
            foreach (var client in clients)
                if (!client.TryWrite(frame)) (slow ??= []).Add(client);
            if (slow is not null)
                foreach (var client in slow) clients.Remove(client);
        }
        if (slow is not null)
            foreach (var client in slow) client.Close();
    }
}
