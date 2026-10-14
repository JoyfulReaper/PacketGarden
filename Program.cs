using System.Text.Json;
using PacketGarden;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient("weather", client => client.Timeout = TimeSpan.FromSeconds(5)).RemoveAllLoggers();
builder.Services.AddSingleton<WeatherAdapter>();
builder.Services.AddHostedService(services => services.GetRequiredService<WeatherAdapter>());
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

var weatherJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);
app.MapGet("/api/garden/events", async (HttpContext context, WeatherAdapter weather) =>
{
    context.Response.ContentType = "text/event-stream";
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers["X-Accel-Buffering"] = "no";
    try
    {
        await foreach (var state in weather.Updates(context.RequestAborted))
        {
            await context.Response.WriteAsync($"event: weather\ndata: {JsonSerializer.Serialize(state, weatherJson)}\n\n", context.RequestAborted);
            await context.Response.Body.FlushAsync(context.RequestAborted);
        }
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
    catch (IOException) when (context.RequestAborted.IsCancellationRequested) { }
});

app.Run();
