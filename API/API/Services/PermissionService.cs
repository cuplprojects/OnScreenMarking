using API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace API.Services
{
    public interface IPermissionService
    {
        Task<List<string>> GetRolePermissionsAsync(string roleName);
        Task<bool> HasPermissionAsync(string userType, string permission);
        Task InvalidateRolePermissionsAsync(string roleName);
    }

    public class PermissionService : IPermissionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IDistributedCache _cache;

        public PermissionService(ApplicationDbContext context, IDistributedCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<List<string>> GetRolePermissionsAsync(string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return new List<string>();

            var normalizedRole = roleName.Trim().ToLower();
            var cacheKey = $"role_permissions_{normalizedRole}";

            // 1. Try reading role permissions from Redis
            try
            {
                var cached = await _cache.GetStringAsync(cacheKey);
                if (!string.IsNullOrEmpty(cached))
                {
                    var perms = JsonSerializer.Deserialize<List<string>>(cached);
                    if (perms != null) return perms;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Redis Cache] Error reading permissions for role {roleName}: {ex.Message}");
            }

            // 2. Query Database on cache miss
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName.ToLower() == normalizedRole);
            var permissions = role?.PermissionsList ?? new List<string>();

            // 3. Store in Redis
            try
            {
                var options = new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
                };
                await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(permissions), options);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Redis Cache] Error caching permissions for role {roleName}: {ex.Message}");
            }

            return permissions;
        }

        public async Task<bool> HasPermissionAsync(string userType, string permission)
        {
            if (string.IsNullOrWhiteSpace(userType)) return false;

            if (userType.Equals("admin", StringComparison.OrdinalIgnoreCase))
                return true;

            var perms = await GetRolePermissionsAsync(userType);
            return perms.Contains(permission);
        }

        public async Task InvalidateRolePermissionsAsync(string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return;
            try
            {
                var cacheKey = $"role_permissions_{roleName.Trim().ToLower()}";
                await _cache.RemoveAsync(cacheKey);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Redis Cache] Error invalidating permissions for role {roleName}: {ex.Message}");
            }
        }
    }
}

