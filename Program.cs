using System.Text.Json;
using PacketGarden;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient("weather", client => client.Timeout = TimeSpan.FromSeconds(5)).RemoveAllLoggers();
builder.Services.AddSingleton<WeatherAdapter>();
builder.Services.AddHostedService(services => services.GetRequiredService<WeatherAdapter>());
builder.Services.AddSingleton<GardenEvents>();
builder.Services.AddHostedService<TcpNoiseAdapter>();
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

var eventJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);
app.MapGet("/api/garden/events", async (HttpContext context, WeatherAdapter weather, GardenEvents garden) =>
{
    context.Response.ContentType = "text/event-stream";
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers["X-Accel-Buffering"] = "no";
    using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
    var channel = garden.AddClient();
    await using var updates = weather.Updates(lifetime.Token).GetAsyncEnumerator(lifetime.Token);
    Task weatherPump = Task.CompletedTask;
    try
    {
        if (await updates.MoveNextAsync()) await SendFrame(new("weather", updates.Current));
        weatherPump = PumpWeather();
        await foreach (var frame in channel.Reader.ReadAllAsync(lifetime.Token)) await SendFrame(frame);

        async Task PumpWeather()
        {
            try
            {
                while (await updates.MoveNextAsync())
                    await channel.Writer.WriteAsync(new("weather", updates.Current), lifetime.Token);
            }
            catch (OperationCanceledException) when (lifetime.IsCancellationRequested) { }
        }

        async Task SendFrame(GardenFrame frame)
        {
            await context.Response.WriteAsync($"event: {frame.Name}\ndata: {JsonSerializer.Serialize(frame.Data, eventJson)}\n\n", lifetime.Token);
            await context.Response.Body.FlushAsync(lifetime.Token);
        }
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
    catch (IOException) when (context.RequestAborted.IsCancellationRequested) { }
    finally
    {
        await lifetime.CancelAsync();
        garden.RemoveClient(channel);
        await weatherPump;
    }
});

app.Run();
