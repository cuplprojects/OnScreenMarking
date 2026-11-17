using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using API.Services;

namespace API.Middleware
{
    public class CsrfProtectionMiddleware
    {
        private readonly RequestDelegate _next;
        private static readonly string[] SafeMethods = { "GET", "HEAD", "OPTIONS", "TRACE" };

        public CsrfProtectionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Only enforce CSRF protection on mutating methods
            if (!SafeMethods.Contains(context.Request.Method, StringComparer.OrdinalIgnoreCase))
            {
                var path = context.Request.Path.Value ?? string.Empty;

                // Exempt public auth endpoints that do not rely on an authenticated cookie session
                bool isExempt = path.StartsWith("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/register", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/accept-invitation", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/forgot-password", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/reset-password", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/verify-reset-otp", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/send-email-otp", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/verify-email-otp", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/send-phone-otp", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/auth/verify-phone-otp", StringComparison.OrdinalIgnoreCase) ||
                               path.StartsWith("/api/studentportal/", StringComparison.OrdinalIgnoreCase);

                // If request includes session cookie, enforce anti-CSRF custom header
                if (!isExempt && context.Request.Cookies.ContainsKey(RedisSessionAuthenticationHandler.CookieName))
                {
                    bool hasCustomHeader = context.Request.Headers.ContainsKey("X-Requested-With") ||
                                           context.Request.Headers.ContainsKey("X-CSRF-Token") ||
                                           context.Request.Headers.ContainsKey(RedisSessionAuthenticationHandler.HeaderName);

                    if (!hasCustomHeader)
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync("{\"success\":false,\"message\":\"CSRF verification failed: Missing required X-Requested-With or X-CSRF-Token header.\"}");
                        return;
                    }
                }
            }

            await _next(context);
        }
    }
}
