using System;
using System.Collections.Concurrent;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace API.Services
{
    /// <summary>
    /// File-backed persistent distributed cache implementation used when Redis is not running locally.
    /// Preserves user sessions, cache items, and tokens across application rebuilds and process restarts.
    /// </summary>
    public class PersistentFileDistributedCache : IDistributedCache
    {
        private readonly string _cacheDirectory;
        private readonly ILogger<PersistentFileDistributedCache> _logger;
        private readonly ConcurrentDictionary<string, CacheItem> _memoryCache = new();

        private class CacheItem
        {
            public byte[] Value { get; set; } = Array.Empty<byte>();
            public DateTimeOffset? AbsoluteExpiration { get; set; }
        }

        public PersistentFileDistributedCache(ILogger<PersistentFileDistributedCache> logger)
        {
            _logger = logger;
            _cacheDirectory = Path.Combine(Directory.GetCurrentDirectory(), ".session_cache");
            try
            {
                if (!Directory.Exists(_cacheDirectory))
                {
                    Directory.CreateDirectory(_cacheDirectory);
                }
                LoadExistingCacheFromDisk();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize persistent cache directory at {Directory}", _cacheDirectory);
            }
        }

        private void LoadExistingCacheFromDisk()
        {
            try
            {
                if (!Directory.Exists(_cacheDirectory)) return;

                var files = Directory.GetFiles(_cacheDirectory, "*.cache");
                var now = DateTimeOffset.UtcNow;
                int loadedCount = 0;

                foreach (var file in files)
                {
                    try
                    {
                        using var fs = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read);
                        using var reader = new BinaryReader(fs);
                        string key = reader.ReadString();
                        long expTicks = reader.ReadInt64();
                        DateTimeOffset? exp = expTicks == 0 ? null : new DateTimeOffset(expTicks, TimeSpan.Zero);

                        if (exp.HasValue && exp.Value < now)
                        {
                            fs.Dispose();
                            File.Delete(file);
                            continue;
                        }

                        int valLength = reader.ReadInt32();
                        byte[] val = reader.ReadBytes(valLength);

                        _memoryCache[key] = new CacheItem
                        {
                            Value = val,
                            AbsoluteExpiration = exp
                        };
                        loadedCount++;
                    }
                    catch
                    {
                        // Clean up corrupt cache file
                        try { File.Delete(file); } catch { }
                    }
                }

                if (loadedCount > 0)
                {
                    _logger.LogInformation("[Cache] Restored {Count} active persistent session/cache items across restart.", loadedCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed reading existing persistent cache items from disk.");
            }
        }

        private string GetFilePath(string key)
        {
            var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
            return Path.Combine(_cacheDirectory, $"{hash}.cache");
        }

        public byte[]? Get(string key)
        {
            if (string.IsNullOrEmpty(key)) return null;

            if (_memoryCache.TryGetValue(key, out var item))
            {
                if (item.AbsoluteExpiration.HasValue && item.AbsoluteExpiration.Value < DateTimeOffset.UtcNow)
                {
                    Remove(key);
                    return null;
                }
                return item.Value;
            }

            return null;
        }

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default)
        {
            return Task.FromResult(Get(key));
        }

        public void Set(string key, byte[] value, DistributedCacheEntryOptions options)
        {
            if (string.IsNullOrEmpty(key) || value == null) return;

            DateTimeOffset? expiration = null;
            if (options.AbsoluteExpiration.HasValue)
            {
                expiration = options.AbsoluteExpiration.Value;
            }
            else if (options.AbsoluteExpirationRelativeToNow.HasValue)
            {
                expiration = DateTimeOffset.UtcNow.Add(options.AbsoluteExpirationRelativeToNow.Value);
            }
            else if (options.SlidingExpiration.HasValue)
            {
                expiration = DateTimeOffset.UtcNow.Add(options.SlidingExpiration.Value);
            }

            var item = new CacheItem
            {
                Value = value,
                AbsoluteExpiration = expiration
            };

            _memoryCache[key] = item;

            // Persist to disk
            try
            {
                string path = GetFilePath(key);
                using var fs = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None);
                using var writer = new BinaryWriter(fs);
                writer.Write(key);
                writer.Write(expiration?.UtcTicks ?? 0L);
                writer.Write(value.Length);
                writer.Write(value);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist cache key {Key} to disk.", key);
            }
        }

        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            Set(key, value, options);
            return Task.CompletedTask;
        }

        public void Refresh(string key)
        {
            // Sliding expiration refresh logic if key exists
            if (_memoryCache.TryGetValue(key, out var item) && item.AbsoluteExpiration.HasValue)
            {
                item.AbsoluteExpiration = DateTimeOffset.UtcNow.AddHours(8);
            }
        }

        public Task RefreshAsync(string key, CancellationToken token = default)
        {
            Refresh(key);
            return Task.CompletedTask;
        }

        public void Remove(string key)
        {
            if (string.IsNullOrEmpty(key)) return;

            _memoryCache.TryRemove(key, out _);

            try
            {
                string path = GetFilePath(key);
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to remove persistent cache key {Key} from disk.", key);
            }
        }

        public Task RemoveAsync(string key, CancellationToken token = default)
        {
            Remove(key);
            return Task.CompletedTask;
        }
    }
}
