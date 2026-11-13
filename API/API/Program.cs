using Microsoft.EntityFrameworkCore;
using System.Text;
using API.Data;
using API.Services;
using API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    )
);

// Add Distributed Session Cache (Redis if running, otherwise in-memory distributed cache)
var redisConn = builder.Configuration.GetConnectionString("RedisConnection");
bool redisConnected = false;

if (!string.IsNullOrWhiteSpace(redisConn))
{
    try
    {
        var configOptions = StackExchange.Redis.ConfigurationOptions.Parse(redisConn);
        configOptions.ConnectTimeout = 300;
        configOptions.AbortOnConnectFail = true;
        using var testMultiplexer = StackExchange.Redis.ConnectionMultiplexer.Connect(configOptions);
        redisConnected = testMultiplexer.IsConnected;
    }
    catch
    {
        redisConnected = false;
    }
}

if (redisConnected)
{
    Console.WriteLine($"[Cache] Successfully connected to Redis server at {redisConn}");
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConn;
        options.InstanceName = "OSM_";
    });
}
else
{
    Console.WriteLine("[Cache] Redis server is not running on localhost:6379. Using in-memory distributed session cache.");
    builder.Services.AddDistributedMemoryCache();
}

// Add Email Service
builder.Services.AddScoped<IEmailService, EmailService>();

// Add Password Generation Service
builder.Services.AddScoped<IPasswordGenerationService, PasswordGenerationService>();

// Add Logging Service
builder.Services.AddScoped<ILoggingService, LoggingService>();

// Add Permission Service (Redis-backed)
builder.Services.AddScoped<IPermissionService, PermissionService>();

// Add Daily Allocation & Overdue Reassignment Engine + Background Daemon
builder.Services.AddScoped<IDailyAllocationService, DailyAllocationService>();
builder.Services.AddHostedService<DailyAllocationBackgroundService>();

// Add Payload & Response Encryption Service
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();

// Add CORS with credentials support for session cookies
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("X-Encrypted", "Content-Disposition")
              .AllowCredentials();
    });
});

// Add Redis Session Authentication
builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = RedisSessionAuthenticationHandler.SchemeName;
    options.DefaultChallengeScheme = RedisSessionAuthenticationHandler.SchemeName;
})
.AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, RedisSessionAuthenticationHandler>(
    RedisSessionAuthenticationHandler.SchemeName, null
);

var app = builder.Build();


// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI(c => {
        // Start collapsed (optional)
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);

        // Inject custom JS (Collapse / Expand All)
        c.InjectJavascript("/swagger-ui/custom.js");
    });
}
else
{
    // Enable Swagger in all environments for easier testing
    app.UseSwagger();
    app.UseSwaggerUI(c => {
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
        c.InjectJavascript("/swagger-ui/custom.js");
    });
}


if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();

// OSM static files are now served dynamically via FilesController.cs

app.UseCors();
app.UseEncryptionMiddleware();
app.UseAuthentication();
app.UseAuthorization();
app.UseLoggingMiddleware();

app.MapControllers();

// Redirect root to Swagger
app.MapGet("/", context => {
    context.Response.Redirect("/swagger/index.html", permanent: false);
    return Task.CompletedTask;
});



app.Run();
