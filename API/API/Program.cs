using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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

// Add Redis Cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("RedisConnection");
    options.InstanceName = "OSM_";
});

// Add Email Service
builder.Services.AddScoped<IEmailService, EmailService>();

// Add Password Generation Service
builder.Services.AddScoped<IPasswordGenerationService, PasswordGenerationService>();

// Add Logging Service
builder.Services.AddScoped<ILoggingService, LoggingService>();

// Add CORS
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader();
    });
});

// Add JWT Authentication
builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
  .AddJwtBearer(options => {
      options.TokenValidationParameters = new TokenValidationParameters
      {
          ValidateIssuer = true,
          ValidateAudience = true,
          ValidateLifetime = true,
          ValidateIssuerSigningKey = true,
          ValidIssuer = builder.Configuration["Jwt:Issuer"],
          ValidAudience = builder.Configuration["Jwt:Issuer"],
          IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])
          ),
          RoleClaimType = System.Security.Claims.ClaimTypes.Role
      };
  });

var app = builder.Build();

// Ensure UserType column exists in Invitations table (self-healing migration helper)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        var columnExists = false;
        using (var command = dbContext.Database.GetDbConnection().CreateCommand())
        {
            command.CommandText = "SHOW COLUMNS FROM `Invitations` LIKE 'UserType';";
            dbContext.Database.OpenConnection();
            using (var reader = command.ExecuteReader())
            {
                columnExists = reader.HasRows;
            }
        }

        if (!columnExists)
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `Invitations` ADD COLUMN `UserType` LONGTEXT NOT NULL;");
            Console.WriteLine("Self-Healing Database: Successfully added UserType column to Invitations table.");
        }
        else
        {
            Console.WriteLine("Self-Healing Database: UserType column already exists in Invitations table. Skipping alter query.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Self-Healing Database Warning: {ex.Message}");
    }
}

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
app.UseCors();
app.UseLoggingMiddleware();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Redirect root to Swagger
app.MapGet("/", context => {
    context.Response.Redirect("/swagger/index.html", permanent: false);
    return Task.CompletedTask;
});

// Health check endpoint
app.MapGet("/api/health", () => new { success = true, message = "Server is running" });

app.Run();
