using API.Data;
using API.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace API.Services
{
    public interface ILoggingService
    {
        Task LogEventAsync(string method, string path, string queryString, string headers, string body, string userId, string message, string ipAddress);
        Task LogErrorAsync(string method, string path, string queryString, int statusCode, string message, string stackTrace, string innerException);
        void LogEvent(string message, string category, int triggeredBy, string oldValue = null, string newValue = null);
        void LogError(string error, string errorMessage, string controller);
    }

    public class LoggingService : ILoggingService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<LoggingService> _logger;

        public LoggingService(ApplicationDbContext context, ILogger<LoggingService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task LogEventAsync(string method, string path, string queryString, string headers, string body, string userId, string message, string ipAddress)
        {
            try
            {
                var eventLog = new EventLog
                {
                    Timestamp = DateTime.UtcNow,
                    Method = method ?? string.Empty,
                    Path = path ?? string.Empty,
                    QueryString = queryString ?? string.Empty,
                    Headers = headers ?? string.Empty,
                    Body = body ?? string.Empty,
                    UserId = userId,
                    Message = message ?? string.Empty,
                    IpAddress = ipAddress ?? string.Empty,
                    Event = message ?? method ?? string.Empty,
                    Category = method ?? string.Empty
                };

                _context.EventLogs.Add(eventLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to asynchronously log event: {Message}", message);
            }
        }

        public async Task LogErrorAsync(string method, string path, string queryString, int statusCode, string message, string stackTrace, string innerException)
        {
            try
            {
                var errorLog = new ErrorLog
                {
                    Timestamp = DateTime.UtcNow,
                    Method = method ?? string.Empty,
                    Path = path ?? string.Empty,
                    QueryString = queryString ?? string.Empty,
                    StatusCode = statusCode,
                    Message = message ?? string.Empty,
                    StackTrace = stackTrace ?? string.Empty,
                    InnerException = innerException,
                    Error = message ?? string.Empty,
                    OccuranceSpace = path ?? string.Empty
                };

                _context.ErrorLogs.Add(errorLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to asynchronously log error: {Message}", message);
            }
        }

        public void LogEvent(string message, string category, int triggeredBy, string oldValue = null, string newValue = null)
        {
            try
            {
                var eventLog = new EventLog
                {
                    Timestamp = DateTime.UtcNow,
                    Method = "LEGACY",
                    Path = category ?? string.Empty,
                    QueryString = string.Empty,
                    Headers = string.Empty,
                    Body = !string.IsNullOrEmpty(newValue) ? newValue : oldValue ?? string.Empty,
                    UserId = triggeredBy > 0 ? triggeredBy.ToString() : null,
                    Message = message ?? string.Empty,
                    IpAddress = string.Empty
                };

                _context.EventLogs.Add(eventLog);
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log event: {Message}", message);
            }
        }

        public void LogError(string error, string errorMessage, string controller)
        {
            try
            {
                var errorLog = new ErrorLog
                {
                    Timestamp = DateTime.UtcNow,
                    Method = "LEGACY",
                    Path = controller ?? string.Empty,
                    QueryString = string.Empty,
                    StatusCode = 500,
                    Message = $"{error}: {errorMessage}",
                    StackTrace = string.Empty,
                    InnerException = null
                };

                _context.ErrorLogs.Add(errorLog);
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log error: {Error}", error);
            }
        }
    }
}
