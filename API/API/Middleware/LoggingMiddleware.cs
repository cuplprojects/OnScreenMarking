using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using API.Models;
using API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace API.Middleware
{
    public class LoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<LoggingMiddleware> _logger;
        private readonly IServiceScopeFactory _serviceScopeFactory;

        public LoggingMiddleware(RequestDelegate next, ILogger<LoggingMiddleware> logger, IServiceScopeFactory serviceScopeFactory)
        {
            _next = next;
            _logger = logger;
            _serviceScopeFactory = serviceScopeFactory;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var method = context.Request.Method;
            bool isTargetMethod = method.Equals("POST", StringComparison.OrdinalIgnoreCase) ||
                                 method.Equals("PUT", StringComparison.OrdinalIgnoreCase) ||
                                 method.Equals("PATCH", StringComparison.OrdinalIgnoreCase);

            // If not POST/PUT/PATCH, still catch any unhandled exceptions to record ErrorLogs
            if (!isTargetMethod)
            {
                try
                {
                    await _next(context);
                }
                catch (Exception ex)
                {
                    await LogErrorAsync(context, ex, 500);
                    throw;
                }
                return;
            }

            // Capture request details for POST, PUT, PATCH
            var path = context.Request.Path.Value ?? string.Empty;
            var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
            var ipAddress = GetClientIpAddress(context);
            var headers = SerializeHeaders(context.Request.Headers);
            var requestBody = await ReadRequestBodyAsync(context.Request);

            // Execute the pipeline and capture response
            var originalBodyStream = context.Response.Body;
            using var responseBodyStream = new MemoryStream();
            context.Response.Body = responseBodyStream;

            try
            {
                await _next(context);

                var statusCode = context.Response.StatusCode;

                // Extract User ID after authentication has run
                var userId = GetUserId(context);

                // If this is a login request and context.User wasn't set beforehand, check response body
                if (string.IsNullOrEmpty(userId) && path.Contains("/login", StringComparison.OrdinalIgnoreCase))
                {
                    responseBodyStream.Seek(0, SeekOrigin.Begin);
                    var responseText = await new StreamReader(responseBodyStream).ReadToEndAsync();
                    responseBodyStream.Seek(0, SeekOrigin.Begin);
                    userId = ExtractUserIdFromResponse(responseText);
                }

                // If error status code (>= 400), log to ErrorLogs
                if (statusCode >= 400)
                {
                    responseBodyStream.Seek(0, SeekOrigin.Begin);
                    var errorResponseText = await new StreamReader(responseBodyStream).ReadToEndAsync();
                    responseBodyStream.Seek(0, SeekOrigin.Begin);

                    var errorMessage = ExtractErrorMessage(errorResponseText, $"{method} {path} returned status {statusCode}");

                    using var scope = _serviceScopeFactory.CreateScope();
                    var loggingService = scope.ServiceProvider.GetRequiredService<ILoggingService>();
                    await loggingService.LogErrorAsync(
                        method: method,
                        path: path,
                        queryString: queryString,
                        statusCode: statusCode,
                        message: errorMessage,
                        stackTrace: string.Empty,
                        innerException: null
                    );
                }
                else
                {
                    // Success event log
                    var eventMessage = $"Executed {method} {path} successfully ({statusCode})";
                    using var scope = _serviceScopeFactory.CreateScope();
                    var loggingService = scope.ServiceProvider.GetRequiredService<ILoggingService>();
                    await loggingService.LogEventAsync(
                        method: method,
                        path: path,
                        queryString: queryString,
                        headers: headers,
                        body: SanitizeBody(requestBody),
                        userId: userId,
                        message: eventMessage,
                        ipAddress: ipAddress
                    );
                }

                // Copy the response stream back to client
                responseBodyStream.Seek(0, SeekOrigin.Begin);
                await responseBodyStream.CopyToAsync(originalBodyStream);
            }
            catch (Exception ex)
            {
                await LogErrorAsync(context, ex, 500);

                // Restore response stream
                context.Response.Body = originalBodyStream;
                throw;
            }
            finally
            {
                context.Response.Body = originalBodyStream;
            }
        }

        private async Task LogErrorAsync(HttpContext context, Exception exception, int statusCode)
        {
            try
            {
                var method = context.Request.Method;
                var path = context.Request.Path.Value ?? string.Empty;
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;

                using var scope = _serviceScopeFactory.CreateScope();
                var loggingService = scope.ServiceProvider.GetRequiredService<ILoggingService>();

                await loggingService.LogErrorAsync(
                    method: method,
                    path: path,
                    queryString: queryString,
                    statusCode: statusCode,
                    message: exception.Message,
                    stackTrace: exception.StackTrace ?? string.Empty,
                    innerException: exception.InnerException?.ToString()
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log unhandled error to ErrorLogs");
            }
        }

        private static string GetUserId(HttpContext context)
        {
            try
            {
                var id = context.User?.FindFirst("id")?.Value ??
                         context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                         context.User?.FindFirst("sub")?.Value;

                if (!string.IsNullOrEmpty(id)) return id;

                var email = context.User?.FindFirst("email")?.Value ??
                            context.User?.FindFirst(ClaimTypes.Email)?.Value;

                if (!string.IsNullOrEmpty(email)) return email;

                return context.User?.Identity?.Name;
            }
            catch
            {
                return null;
            }
        }

        private static string GetClientIpAddress(HttpContext context)
        {
            try
            {
                var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(forwarded))
                {
                    return forwarded.Split(',')[0].Trim();
                }

                return context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            }
            catch
            {
                return "Unknown";
            }
        }

        private static string SerializeHeaders(IHeaderDictionary headers)
        {
            try
            {
                var safeHeaders = headers.ToDictionary(
                    h => h.Key,
                    h => IsSensitiveHeader(h.Key) ? "***" : h.Value.ToString()
                );
                return JsonSerializer.Serialize(safeHeaders);
            }
            catch
            {
                return string.Empty;
            }
        }

        private static bool IsSensitiveHeader(string headerKey)
        {
            return headerKey.Equals("Cookie", StringComparison.OrdinalIgnoreCase) ||
                   headerKey.Equals("Authorization", StringComparison.OrdinalIgnoreCase) ||
                   headerKey.Equals("X-Session-Id", StringComparison.OrdinalIgnoreCase) ||
                   headerKey.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase);
        }

        private static async Task<string> ReadRequestBodyAsync(HttpRequest request)
        {
            try
            {
                request.EnableBuffering();
                if (!request.Body.CanRead) return string.Empty;

                request.Body.Position = 0;
                using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                request.Body.Position = 0;

                // Truncate excessively large payloads (e.g. > 64KB)
                if (body.Length > 65536)
                {
                    body = body.Substring(0, 65536) + " [TRUNCATED]";
                }

                return body;
            }
            catch
            {
                return string.Empty;
            }
        }

        private static string SanitizeBody(string body)
        {
            if (string.IsNullOrWhiteSpace(body)) return string.Empty;
            try
            {
                // Mask sensitive field values like passwords
                body = Regex.Replace(body, @"(""(?:password|passwordHash|autoGeneratedPassword|oldPassword|newPassword)""\s*:\s*"")[^""]*("")", "$1***$2", RegexOptions.IgnoreCase);
                return body;
            }
            catch
            {
                return body;
            }
        }

        private static string ExtractUserIdFromResponse(string responseText)
        {
            if (string.IsNullOrWhiteSpace(responseText)) return null;
            try
            {
                using var doc = JsonDocument.Parse(responseText);
                if (doc.RootElement.TryGetProperty("user", out var userProp) &&
                    userProp.TryGetProperty("id", out var idProp))
                {
                    return idProp.ToString();
                }
            }
            catch {}
            return null;
        }

        private static string ExtractErrorMessage(string responseText, string fallback)
        {
            if (string.IsNullOrWhiteSpace(responseText)) return fallback;
            try
            {
                using var doc = JsonDocument.Parse(responseText);
                if (doc.RootElement.TryGetProperty("message", out var msgProp))
                {
                    return msgProp.GetString() ?? fallback;
                }
            }
            catch {}
            return responseText.Length > 200 ? responseText.Substring(0, 200) : responseText;
        }
    }
}
