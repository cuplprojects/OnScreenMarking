using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace API.Services
{
    public class DailyAllocationBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DailyAllocationBackgroundService> _logger;
        // Interval between auto-allocation & reassignment checks (1 minute)
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

        public DailyAllocationBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<DailyAllocationBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Daily Allocation & Inactive Reassignment Background Service started.");

            // Brief initial warm-up delay of 15 seconds after app startup
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Starting scheduled automatic daily allocation and overdue reassignment check at {Time} UTC...", DateTime.UtcNow);

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var dailyAllocationService = scope.ServiceProvider.GetRequiredService<IDailyAllocationService>();
                        var (allocated, reassigned) = await dailyAllocationService.PerformDailyAllocationForAllUniversitiesAsync();

                        _logger.LogInformation("Automatic cycle finished. Allocated: {Allocated}, Reassigned: {Reassigned}", allocated, reassigned);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in Daily Allocation Background Service cycle.");
                }

                // Wait for the next check interval or cancellation
                try
                {
                    await Task.Delay(Interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("Daily Allocation & Inactive Reassignment Background Service stopped.");
        }
    }
}
