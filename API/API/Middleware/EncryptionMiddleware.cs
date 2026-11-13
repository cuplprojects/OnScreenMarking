using Microsoft.AspNetCore.Http;
using API.Services;
using System.Text;
using System.Text.Json;

namespace API.Middleware
{
    public class EncryptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<EncryptionMiddleware> _logger;
        private readonly IConfiguration _configuration;
        private readonly JsonSerializerOptions _jsonOptions;

        public EncryptionMiddleware(RequestDelegate next, ILogger<EncryptionMiddleware> logger, IConfiguration configuration)
        {
            _next = next;
            _logger = logger;
            _configuration = configuration;

            // Configure JSON serializer to use camelCase naming
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            };
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Read configuration values directly - only 2 settings
            var encryptRequests = _configuration.GetValue<bool>("EncryptRequests", false);
            var encryptResponses = _configuration.GetValue<bool>("EncryptResponses", false);

            // Skip encryption for system endpoints
            if (ShouldSkipEncryption(context.Request.Path))
            {
                await _next(context);
                return;
            }

            // Get scoped services from the request context
            var encryptionService = context.RequestServices.GetRequiredService<IEncryptionService>();

            // Handle request decryption if enabled
            if (encryptRequests)
            {
                await HandleRequestDecryption(context, encryptionService);
            }

            // Handle response encryption if enabled
            if (encryptResponses)
            {
                var originalResponseBody = context.Response.Body;
                using var responseBody = new MemoryStream();
                context.Response.Body = responseBody;

                await _next(context);

                await HandleResponseEncryption(context, originalResponseBody, encryptionService);
            }
            else
            {
                await _next(context);
            }
        }

        private async Task HandleRequestDecryption(HttpContext context, IEncryptionService encryptionService)
        {
            if (context.Request.Method == "GET" || context.Request.ContentLength == 0)
                return;

            if (context.Request.ContentType != null &&
                context.Request.ContentType.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase))
                return;

            // Check if request has encryption header
            var isEncrypted = context.Request.Headers.ContainsKey("X-Encrypted") &&
                             context.Request.Headers["X-Encrypted"] == "true";

            if (!isEncrypted)
                return;

            _logger.LogInformation("🔧 Request decryption enabled in config");

            try
            {
                context.Request.EnableBuffering();
                var body = await new StreamReader(context.Request.Body).ReadToEndAsync();
                context.Request.Body.Position = 0;

                if (string.IsNullOrEmpty(body))
                    return;

                _logger.LogInformation("🔐 Encrypted request received");

                // Parse the encrypted payload using camelCase naming
                var encryptedPayload = JsonSerializer.Deserialize<EncryptedPayload>(body, _jsonOptions);
                if (string.IsNullOrWhiteSpace(encryptedPayload?.EncryptedData))
                {
                    _logger.LogWarning("Invalid encrypted payload format");
                    return;
                }

                // Decrypt the data
                var decryptedJson = encryptionService.DecryptString(encryptedPayload.EncryptedData);
                if (string.IsNullOrEmpty(decryptedJson))
                {
                    _logger.LogError("Failed to decrypt request payload");
                    return;
                }

                _logger.LogInformation("🔓 Request decrypted successfully");

                // Replace request body with decrypted data
                var decryptedBytes = Encoding.UTF8.GetBytes(decryptedJson);
                context.Request.Body = new MemoryStream(decryptedBytes);
                context.Request.ContentLength = decryptedBytes.Length;

                // Remove encryption header since data is now decrypted
                context.Request.Headers.Remove("X-Encrypted");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during request decryption");
            }
        }

        private async Task HandleResponseEncryption(HttpContext context, Stream originalResponseBody, IEncryptionService encryptionService)
        {
            try
            {
                context.Response.Body.Seek(0, SeekOrigin.Begin);
                var responseText = await new StreamReader(context.Response.Body).ReadToEndAsync();

                // Check if we should encrypt the response
                var shouldEncrypt = ShouldEncryptResponse(context, responseText);

                if (shouldEncrypt && !string.IsNullOrEmpty(responseText))
                {
                    _logger.LogInformation("🔒 Encrypting response");

                    var encryptedData = encryptionService.EncryptString(responseText);
                    if (!string.IsNullOrEmpty(encryptedData))
                    {
                        var encryptedResponse = new EncryptedPayload { EncryptedData = encryptedData };
                        var encryptedJson = JsonSerializer.Serialize(encryptedResponse, _jsonOptions);
                        var encryptedBytes = Encoding.UTF8.GetBytes(encryptedJson);

                        // Set encryption header
                        context.Response.Headers["X-Encrypted"] = "true";
                        context.Response.ContentType = "application/json; charset=utf-8";
                        context.Response.ContentLength = encryptedBytes.Length;

                        await originalResponseBody.WriteAsync(encryptedBytes);
                        _logger.LogInformation("✅ Response encrypted successfully");
                        return;
                    }
                }

                // If not encrypting or encryption failed, return original response
                context.Response.Body.Seek(0, SeekOrigin.Begin);
                await context.Response.Body.CopyToAsync(originalResponseBody);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during response encryption");
                // Fallback to original response
                context.Response.Body.Seek(0, SeekOrigin.Begin);
                await context.Response.Body.CopyToAsync(originalResponseBody);
            }
        }

        private bool ShouldSkipEncryption(PathString path)
        {
            var pathValue = path.Value?.ToLower() ?? "";

            // Skip encryption for these endpoints
            var skipPaths = new[]
            {
                "/swagger",
                "/health",
                "/api/health",
                "/.well-known",
                "/files",
                "/api/files"
            };

            if (skipPaths.Any(skipPath => pathValue.StartsWith(skipPath)))
                return true;

            // Skip PDF streaming endpoints and binary file downloads
            if (pathValue.EndsWith("/pdf") || pathValue.EndsWith(".pdf") || pathValue.Contains("/pdf/"))
                return true;

            return false;
        }

        private bool ShouldEncryptResponse(HttpContext context, string responseText)
        {
            // Only encrypt successful JSON responses
            if (context.Response.StatusCode < 200 || context.Response.StatusCode >= 300)
                return false;

            // Check if response is JSON
            var contentType = context.Response.ContentType?.ToLower() ?? "";
            if (!contentType.Contains("application/json"))
                return false;

            // Try to parse as JSON to ensure it's valid JSON
            try
            {
                JsonSerializer.Deserialize<object>(responseText, _jsonOptions);
                return true; // Encrypt all valid JSON responses
            }
            catch
            {
                return false;
            }
        }
    }

    public class EncryptedPayload
    {
        public string? EncryptedData { get; set; }
    }
}
