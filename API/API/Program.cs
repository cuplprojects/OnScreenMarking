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

// Ensure BatchId column exists in SectionMasters, Sections, ProjectPaperSections, Scripts
using (var migrationScope = app.Services.CreateScope())
{
    try
    {
        var dbContext = migrationScope.ServiceProvider.GetRequiredService<API.Data.ApplicationDbContext>();
        var tables = new[] { "SectionMasters", "Sections", "ProjectPaperSections", "PaperSectionMasters" };
        foreach (var tbl in tables)
        {
            try
            {
                dbContext.Database.ExecuteSqlRaw($"ALTER TABLE `{tbl}` ADD COLUMN `BatchId` INT NOT NULL DEFAULT 1;");
            }
            catch
            {
                try
                {
                    dbContext.Database.ExecuteSqlRaw($"UPDATE `{tbl}` SET `BatchId` = 1 WHERE `BatchId` IS NULL OR `BatchId` = 0;");
                    dbContext.Database.ExecuteSqlRaw($"ALTER TABLE `{tbl}` MODIFY COLUMN `BatchId` INT NOT NULL DEFAULT 1;");
                }
                catch { /* Column already updated */ }
            }
        }

        // Ensure SectionMasterId is nullable in existing tables so EF inserts do not fail
        foreach (var tbl in new[] { "Sections", "ProjectPaperSections", "PaperSectionMasters" })
        {
            try
            {
                dbContext.Database.ExecuteSqlRaw($"ALTER TABLE `{tbl}` MODIFY COLUMN `SectionMasterId` INT NULL DEFAULT NULL;");
            }
            catch { /* Ignore if column does not exist or already nullable */ }
        }

        // Ensure SectionMasters unique index is on (BatchId, Name) rather than Name alone
        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `SectionMasters` DROP INDEX `IX_SectionMasters_Name`;");
        }
        catch { /* Index already dropped or not present */ }
        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `SectionMasters` ADD UNIQUE INDEX `IX_SectionMasters_BatchId_Name` (`BatchId`, `Name`);");
        }
        catch { /* Index already exists */ }

        // Ensure Questions TypeId column and seed QuestionTypes
        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `Questions` ADD COLUMN `TypeId` INT NULL;");
        }
        catch { /* Column already exists */ }

        try
        {
            if (!dbContext.QuestionTypes.Any())
            {
                dbContext.QuestionTypes.AddRange(new[]
                {
                    new API.Models.QuestionType { QuestionTypeName = "MCQ" },
                    new API.Models.QuestionType { QuestionTypeName = "SA" },
                    new API.Models.QuestionType { QuestionTypeName = "LA" },
                    new API.Models.QuestionType { QuestionTypeName = "Descriptive" }
                });
                dbContext.SaveChanges();
            }
        }
        catch { }

        try
        {
            dbContext.Database.ExecuteSqlRaw(@"
                UPDATE `Questions` q
                INNER JOIN `questiontypes` qt ON LOWER(TRIM(q.`Type`)) = LOWER(TRIM(qt.`Questiontype`))
                SET q.`TypeId` = qt.`QuestiontypeId`
                WHERE q.`TypeId` IS NULL;
            ");
        }
        catch { }

        // Ensure QuestionMasters Marks and QuestionTypeId exist
        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `QuestionMasters` ADD COLUMN `Marks` DECIMAL(10,2) NOT NULL DEFAULT 0.00;");
        }
        catch { /* Column already exists */ }

        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `QuestionMasters` ADD COLUMN `QuestionTypeId` INT NULL;");
        }
        catch { /* Column already exists */ }

        try
        {
            dbContext.Database.ExecuteSqlRaw(@"
                UPDATE `QuestionMasters` qm
                INNER JOIN `questiontypes` qt ON LOWER(TRIM(qm.`Type`)) = LOWER(TRIM(qt.`Questiontype`))
                SET qm.`QuestionTypeId` = qt.`QuestiontypeId`
                WHERE qm.`QuestionTypeId` IS NULL;
            ");
        }
        catch { }

        try
        {
            dbContext.Database.ExecuteSqlRaw(@"
                UPDATE `QuestionMasters`
                SET `QuestionTypeId` = (SELECT `QuestiontypeId` FROM `questiontypes` ORDER BY `QuestiontypeId` ASC LIMIT 1)
                WHERE `QuestionTypeId` IS NULL OR `QuestionTypeId` = 0;
            ");
        }
        catch { }

        try
        {
            dbContext.Database.ExecuteSqlRaw(@"
                UPDATE `QuestionMasters` qm
                INNER JOIN `SectionMasters` sm ON qm.`BatchId` = sm.`BatchId` AND LOWER(TRIM(qm.`Section`)) = LOWER(TRIM(sm.`Name`))
                SET qm.`Marks` = ROUND(sm.`TotalMarks` / GREATEST(sm.`TotalQuestions`, 1), 2)
                WHERE qm.`Marks` = 0 AND sm.`TotalQuestions` > 0;
            ");
        }
        catch { }

        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `QuestionMasters` DROP FOREIGN KEY `FK_QuestionMasters_QuestionTypes_QuestionTypeId`;");
        }
        catch { }

        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `QuestionMasters` MODIFY COLUMN `QuestionTypeId` INT NOT NULL;");
        }
        catch { }

        try
        {
            dbContext.Database.ExecuteSqlRaw(@"
                ALTER TABLE `QuestionMasters`
                ADD CONSTRAINT `FK_QuestionMasters_QuestionTypes_QuestionTypeId`
                FOREIGN KEY (`QuestionTypeId`) REFERENCES `questiontypes` (`QuestiontypeId`)
                ON DELETE RESTRICT;
            ");
        }
        catch { }

        // Remove Type column from QuestionMasters
        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `QuestionMasters` DROP COLUMN `Type`;");
        }
        catch { /* Column already removed or doesn't exist */ }

        // Ensure Scripts table has BatchId column and backfill from ProjectPapers
        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `Scripts` ADD COLUMN `BatchId` INT NULL;");
        }
        catch { /* Column already exists */ }

        try
        {
            dbContext.Database.ExecuteSqlRaw(@"
                UPDATE `Scripts` s
                INNER JOIN `ProjectPapers` pp ON s.`ProjectPaperId` = pp.`Id`
                SET s.`BatchId` = pp.`BatchId`
                WHERE (s.`BatchId` IS NULL OR s.`BatchId` = 0) AND pp.`BatchId` IS NOT NULL AND pp.`BatchId` > 0;
            ");
        }
        catch { }

        // Seed Coordinator Full Academic Workflow
        try
        {
            var seedController = new API.Controllers.SeedController(dbContext);
            seedController.SeedCoordinatorFullWorkflow().GetAwaiter().GetResult();
            Console.WriteLine("[Startup Seed] Coordinator academic workflow successfully populated.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Startup Seed Warning] {ex.Message}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup Migration Warning] {ex.Message}");
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
