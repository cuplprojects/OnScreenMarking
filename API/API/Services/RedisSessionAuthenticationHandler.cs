using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using API.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace API.Services
{
    public class RedisSessionAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        private readonly IDistributedCache _cache;
        public const string SchemeName = "RedisSession";
        public const string CookieName = "OSM_SESSION";
        public const string HeaderName = "X-Session-Id";

        public RedisSessionAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            IDistributedCache cache)
            : base(options, logger, encoder)
        {
            _cache = cache;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // 1. Try reading session ID from HttpOnly cookie
            string? sessionId = Request.Cookies[CookieName];

            // 2. Fallback to custom X-Session-Id header
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                if (Request.Headers.TryGetValue(HeaderName, out var headerVal))
                {
                    sessionId = headerVal.FirstOrDefault();
                }
            }

            // 3. Fallback to Authorization Bearer header (session token)
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    sessionId = authHeader.Substring("Bearer ".Length).Trim();
                }
            }

            if (string.IsNullOrWhiteSpace(sessionId))
            {
                return AuthenticateResult.NoResult();
            }

            // 4. Query Redis for session:{sessionId}
            string? sessionJson;
            try
            {
                sessionJson = await _cache.GetStringAsync($"session:{sessionId}");
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, $"[Redis] Error querying session {sessionId} from Redis: {ex.Message}");
                return AuthenticateResult.NoResult();
            }

            if (string.IsNullOrWhiteSpace(sessionJson))
            {
                return AuthenticateResult.NoResult();
            }

            UserSessionData? session;
            try
            {
                session = JsonSerializer.Deserialize<UserSessionData>(sessionJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Failed to deserialize session payload from Redis.");
                return AuthenticateResult.NoResult();
            }

            if (session == null || session.Id <= 0)
            {
                return AuthenticateResult.NoResult();
            }

            var claims = new List<Claim>
            {
                new Claim("id", session.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, session.Id.ToString()),
                new Claim("email", session.Email ?? string.Empty),
                new Claim(ClaimTypes.Email, session.Email ?? string.Empty),
                new Claim("name", session.Name ?? string.Empty),
                new Claim(ClaimTypes.Name, session.Name ?? string.Empty),
                new Claim("userType", session.UserType ?? string.Empty),
                new Claim(ClaimTypes.Role, session.UserType ?? string.Empty),
                new Claim("sessionId", sessionId)
            };

            if (session.UniversityId.HasValue)
            {
                claims.Add(new Claim("universityId", session.UniversityId.Value.ToString()));
            }

            if (session.SubjectId1.HasValue)
            {
                claims.Add(new Claim("subjectId1", session.SubjectId1.Value.ToString()));
            }

            var identity = new ClaimsIdentity(claims, SchemeName);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, SchemeName);

            return AuthenticateResult.Success(ticket);
        }
    }
}
