using System.Text.Json;
using PacketGarden;

var builder = WebApplication.CreateBuilder(args);
builder.AddGardenVisits();
builder.Services.AddHttpClient("weather", client => client.Timeout = TimeSpan.FromSeconds(5)).RemoveAllLoggers();
builder.Services.AddSingleton<WeatherAdapter>();
builder.Services.AddHostedService(services => services.GetRequiredService<WeatherAdapter>());
builder.Services.AddSingleton<GardenEvents>();
builder.Services.AddHostedService<TcpNoiseAdapter>();
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRateLimiter();
app.MapGardenVisits();

var eventJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);
app.MapGet("/api/garden/events", async (HttpContext context, WeatherAdapter weather, GardenEvents garden) =>
{
    var client = garden.AddClient();
    if (client is null)
    {
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.Headers["Retry-After"] = "5";
        return;
    }

    context.Response.ContentType = "text/event-stream";
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers["X-Accel-Buffering"] = "no";
    using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted, client.Closed);
    await using var updates = weather.Updates(lifetime.Token).GetAsyncEnumerator(lifetime.Token);
    Task weatherPump = Task.CompletedTask;
    try
    {
        if (await updates.MoveNextAsync()) await SendFrame(new("weather", updates.Current));
        weatherPump = PumpWeather();
        await foreach (var frame in client.Reader.ReadAllAsync(lifetime.Token)) await SendFrame(frame);

        async Task PumpWeather()
        {
            try
            {
                while (await updates.MoveNextAsync())
                    if (!garden.TryPublish(client, new("weather", updates.Current))) break;
            }
            catch (OperationCanceledException) when (lifetime.IsCancellationRequested) { }
        }

        async Task SendFrame(GardenFrame frame)
        {
            // Limit stalled network writes even when the application queue is not yet full.
            using var writeBudget = CancellationTokenSource.CreateLinkedTokenSource(lifetime.Token);
            writeBudget.CancelAfter(TimeSpan.FromSeconds(15));
            await context.Response.WriteAsync($"event: {frame.Name}\ndata: {JsonSerializer.Serialize(frame.Data, eventJson)}\n\n", writeBudget.Token);
            await context.Response.Body.FlushAsync(writeBudget.Token);
        }
    }
    catch (OperationCanceledException) { } // Disconnect, queue overflow, or slow network write.
    catch (IOException) { } // Transport closed while streaming.
    finally
    {
        await lifetime.CancelAsync();
        garden.RemoveClient(client);
        await weatherPump;
    }
});

app.Run();
