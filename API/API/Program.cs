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

// Add Daily Allocation & Overdue Reassignment Engine + Background Daemon
builder.Services.AddScoped<IDailyAllocationService, DailyAllocationService>();
builder.Services.AddHostedService<DailyAllocationBackgroundService>();

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

        // Ensure PaperSectionMasters table exists
        try
        {
            var psmTableExists = false;
            using (var command = dbContext.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = "SHOW TABLES LIKE 'PaperSectionMasters';";
                using (var reader = command.ExecuteReader())
                {
                    psmTableExists = reader.HasRows;
                }
            }

            if (!psmTableExists)
            {
                dbContext.Database.ExecuteSqlRaw(@"
                    CREATE TABLE IF NOT EXISTS `PaperSectionMasters` (
                        `Id` INT NOT NULL AUTO_INCREMENT,
                        `PaperId` INT NOT NULL,
                        `SectionMasterId` INT NOT NULL,
                        `CreatedAt` DATETIME(6) NOT NULL,
                        PRIMARY KEY (`Id`),
                        UNIQUE KEY `IX_PaperSectionMasters_PaperId_SectionMasterId` (`PaperId`, `SectionMasterId`),
                        KEY `IX_PaperSectionMasters_SectionMasterId` (`SectionMasterId`),
                        CONSTRAINT `FK_PaperSectionMasters_Papers_PaperId` FOREIGN KEY (`PaperId`) REFERENCES `Papers` (`PaperId`) ON DELETE CASCADE,
                        CONSTRAINT `FK_PaperSectionMasters_SectionMasters_SectionMasterId` FOREIGN KEY (`SectionMasterId`) REFERENCES `SectionMasters` (`Id`) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ");
                Console.WriteLine("Self-Healing Database: Successfully created PaperSectionMasters table.");
            }
        }
        catch (Exception exPsm)
        {
            Console.WriteLine($"Self-Healing Database Warning (PaperSectionMasters): {exPsm.Message}");
        }

        // Ensure TotalMarks columns support decimals up to 2 decimal places
        try
        {
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `SectionMasters` MODIFY COLUMN `TotalMarks` DECIMAL(10,2) NOT NULL;");
            dbContext.Database.ExecuteSqlRaw("ALTER TABLE `Sections` MODIFY COLUMN `TotalMarks` DECIMAL(10,2) NOT NULL;");
            Console.WriteLine("Self-Healing Database: Successfully updated TotalMarks columns to DECIMAL(10,2).");
        }
        catch (Exception exMarks)
        {
            Console.WriteLine($"Self-Healing Database Note (Decimal TotalMarks): {exMarks.Message}");
        }

        // Ensure ProjectPapers table has IsSectionConfigured and IsExaminerAssigned columns and accurate values
        try
        {
            var conn = dbContext.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            // Check if IsSectionConfigured column exists
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ProjectPapers' AND COLUMN_NAME = 'IsSectionConfigured';";
                var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                if (count == 0)
                {
                    using var alterCmd = conn.CreateCommand();
                    alterCmd.CommandText = "ALTER TABLE `ProjectPapers` ADD COLUMN `IsSectionConfigured` TINYINT(1) NOT NULL DEFAULT 0;";
                    await alterCmd.ExecuteNonQueryAsync();
                    Console.WriteLine("Self-Healing Database: Successfully added IsSectionConfigured column to ProjectPapers table.");
                }
            }

            // Check if IsExaminerAssigned column exists
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ProjectPapers' AND COLUMN_NAME = 'IsExaminerAssigned';";
                var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                if (count == 0)
                {
                    using var alterCmd = conn.CreateCommand();
                    alterCmd.CommandText = "ALTER TABLE `ProjectPapers` ADD COLUMN `IsExaminerAssigned` TINYINT(1) NOT NULL DEFAULT 0;";
                    await alterCmd.ExecuteNonQueryAsync();
                    Console.WriteLine("Self-Healing Database: Successfully added IsExaminerAssigned column to ProjectPapers table.");
                }
            }

            // Backfill / sync values for all existing ProjectPapers:
            // If section configured for that project paperid -> 1 else 0
            // If examiner assigned for that project paperid -> 1 else 0
            using (var syncCmd = conn.CreateCommand())
            {
                syncCmd.CommandText = @"
                    UPDATE `ProjectPapers` pp
                    SET pp.`IsSectionConfigured` = CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM `ProjectPaperSections` pps WHERE pps.`ProjectPaperId` = pp.`Id`
                        ) OR EXISTS (
                            SELECT 1 FROM `Sections` s WHERE s.`PaperId` = pp.`PaperId`
                        ) THEN 1 
                        ELSE 0 
                    END;

                    UPDATE `ProjectPapers` pp
                    SET pp.`IsExaminerAssigned` = CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM `PaperExaminers` pe 
                            WHERE pe.`ProjectPaperId` = pp.`Id` AND pe.`IsActive` = 1
                        ) THEN 1 
                        ELSE 0 
                    END;
                ";
                var updatedRows = await syncCmd.ExecuteNonQueryAsync();
                Console.WriteLine($"Self-Healing Database: ProjectPapers columns IsSectionConfigured and IsExaminerAssigned verified & synced ({updatedRows} updates applied).");
            }

            // Ensure ProjectId column exists in Allocations, Markings, Scripts, PaperExaminers and backfill accurate values
            try
            {
                var targetTables = new[] { "Scripts", "PaperExaminers", "Allocations", "Markings" };
                foreach (var table in targetTables)
                {
                    using var checkCmd = conn.CreateCommand();
                    checkCmd.CommandText = $"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}' AND COLUMN_NAME = 'ProjectId';";
                    var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());
                    if (count == 0)
                    {
                        using var alterCmd = conn.CreateCommand();
                        alterCmd.CommandText = $"ALTER TABLE `{table}` ADD COLUMN `ProjectId` INT NULL;";
                        await alterCmd.ExecuteNonQueryAsync();
                        Console.WriteLine($"Self-Healing Database: Successfully added ProjectId column to {table} table.");
                    }
                }

                // 1. Scripts: from ProjectPapers.ProjectId
                using (var syncScripts = conn.CreateCommand())
                {
                    syncScripts.CommandText = @"
                        UPDATE `Scripts` s
                        JOIN `ProjectPapers` pp ON s.`ProjectPaperId` = pp.`Id`
                        SET s.`ProjectId` = pp.`ProjectId`
                        WHERE s.`ProjectId` IS NULL OR s.`ProjectId` != pp.`ProjectId`;
                    ";
                    var updated = await syncScripts.ExecuteNonQueryAsync();
                    if (updated > 0) Console.WriteLine($"Self-Healing Database: Backfilled ProjectId on {updated} Scripts.");
                }

                // 2. PaperExaminers: from ProjectPapers.ProjectId
                using (var syncPe = conn.CreateCommand())
                {
                    syncPe.CommandText = @"
                        UPDATE `PaperExaminers` pe
                        JOIN `ProjectPapers` pp ON pe.`ProjectPaperId` = pp.`Id`
                        SET pe.`ProjectId` = pp.`ProjectId`
                        WHERE pe.`ProjectId` IS NULL OR pe.`ProjectId` != pp.`ProjectId`;
                    ";
                    var updated = await syncPe.ExecuteNonQueryAsync();
                    if (updated > 0) Console.WriteLine($"Self-Healing Database: Backfilled ProjectId on {updated} PaperExaminers.");
                }

                // 3. Allocations: from Scripts.ProjectId or ProjectPapers.ProjectId
                using (var syncAlloc = conn.CreateCommand())
                {
                    syncAlloc.CommandText = @"
                        UPDATE `Allocations` a
                        JOIN `Scripts` s ON a.`ScriptId` = s.`Id`
                        JOIN `ProjectPapers` pp ON s.`ProjectPaperId` = pp.`Id`
                        SET a.`ProjectId` = COALESCE(s.`ProjectId`, pp.`ProjectId`)
                        WHERE a.`ProjectId` IS NULL OR a.`ProjectId` != COALESCE(s.`ProjectId`, pp.`ProjectId`);
                    ";
                    var updated = await syncAlloc.ExecuteNonQueryAsync();
                    if (updated > 0) Console.WriteLine($"Self-Healing Database: Backfilled ProjectId on {updated} Allocations.");
                }

                // 4. Markings: from Allocations.ProjectId or Scripts.ProjectId or ProjectPapers.ProjectId
                using (var syncMark = conn.CreateCommand())
                {
                    syncMark.CommandText = @"
                        UPDATE `Markings` m
                        JOIN `Scripts` s ON m.`ScriptId` = s.`Id`
                        JOIN `ProjectPapers` pp ON s.`ProjectPaperId` = pp.`Id`
                        SET m.`ProjectId` = COALESCE(s.`ProjectId`, pp.`ProjectId`)
                        WHERE m.`ProjectId` IS NULL OR m.`ProjectId` != COALESCE(s.`ProjectId`, pp.`ProjectId`);
                    ";
                    var updated = await syncMark.ExecuteNonQueryAsync();
                    if (updated > 0) Console.WriteLine($"Self-Healing Database: Backfilled ProjectId on {updated} Markings.");
                }

                Console.WriteLine("Self-Healing Database: ProjectId columns verified and synced across Allocations, Markings, Scripts, and PaperExaminers.");
            }
            catch (Exception exProjSync)
            {
                Console.WriteLine($"ProjectId sync note: {exProjSync.Message}");
            }
        }
        catch (Exception exSync)
        {
            Console.WriteLine($"ProjectPapers sync error: {exSync.Message}");
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

// OSM static files are now served dynamically via FilesController.cs

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



app.Run();
