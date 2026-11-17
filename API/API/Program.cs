using Microsoft.EntityFrameworkCore;
using System.Text;
using API.Data;
using API.Services;
using API.Middleware;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

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

// Configure Forwarded Headers for reverse proxy setups
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Configure HSTS for non-development environments
if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddHsts(options =>
    {
        options.Preload = true;
        options.IncludeSubDomains = true;
        options.MaxAge = TimeSpan.FromDays(365);
    });
}

// Add Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Policy for sensitive authentication endpoints (15 requests per minute)
    options.AddFixedWindowLimiter("auth-policy", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 15;
        opt.QueueLimit = 0;
    });

    // Stricter policy for login and OTP endpoints (5 requests per minute)
    options.AddFixedWindowLimiter("strict-auth", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 5;
        opt.QueueLimit = 0;
    });
});

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
    // Do not log raw connection strings containing potential credentials to console
    Console.WriteLine("[Cache] Successfully connected to Redis server.");
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

// Add Password Hasher Service (Salted PBKDF2 with HMAC-SHA256)
builder.Services.AddSingleton<IPasswordHasherService, PasswordHasherService>();

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

// Add Script Security Service (Access control & external URL protection)
builder.Services.AddScoped<IScriptSecurityService, ScriptSecurityService>();

// Add CORS with credentials support for session cookies
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.SetIsOriginAllowed(origin => {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            {
                // Allow trusted local development hostnames
                if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                    uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                // Allow explicitly configured frontend domain
                var frontendUrl = builder.Configuration["FrontendUrl"];
                if (!string.IsNullOrWhiteSpace(frontendUrl) && Uri.TryCreate(frontendUrl, UriKind.Absolute, out var fUri))
                {
                    if (string.Equals(uri.Authority, fUri.Authority, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }
            return false;
        })
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

// Forwarded headers must run early before other middlewares inspect scheme/IP
app.UseForwardedHeaders();

// Security Headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
app.UseSecurityHeaders();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => {
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
        c.InjectJavascript("/swagger-ui/custom.js");
    });
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        var fileName = ctx.File.Name.ToLowerInvariant();
        if (fileName.EndsWith(".html") || fileName.EndsWith(".htm") || fileName.EndsWith(".svg") || fileName.EndsWith(".xml"))
        {
            ctx.Context.Response.Headers.Append("Content-Disposition", "attachment");
            ctx.Context.Response.Headers.Append("Content-Security-Policy", "default-src 'none'");
        }
    }
});

app.UseCors();
app.UseRateLimiter();
app.UseLoggingMiddleware();
app.UseMiddleware<API.Middleware.CsrfProtectionMiddleware>();
app.UseEncryptionMiddleware();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Redirect root to Swagger in development only
app.MapGet("/", context => {
    if (app.Environment.IsDevelopment())
    {
        context.Response.Redirect("/swagger/index.html", permanent: false);
    }
    else
    {
        context.Response.StatusCode = StatusCodes.Status200OK;
        context.Response.ContentType = "text/plain";
        return context.Response.WriteAsync("OSM API is operational.");
    }
    return Task.CompletedTask;
});

app.Run();
