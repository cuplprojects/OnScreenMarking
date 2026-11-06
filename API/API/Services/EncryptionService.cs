using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace API.Services
{
    public interface IEncryptionService
    {
        string DecryptString(string encryptedData);
        string EncryptData(object data);
        string EncryptString(string plainText);
    }

    public class EncryptionService : IEncryptionService
    {
        private readonly byte[] _keyBytes;
        private readonly ILogger<EncryptionService> _logger;

        public EncryptionService(IConfiguration configuration, ILogger<EncryptionService> logger)
        {
            _logger = logger;
            var secret = configuration["EncryptionSettings:SecretKey"]
                         ?? "osm-portal-super-secret-encryption-key-2026";
            using var sha = SHA256.Create();
            _keyBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(secret));
        }

        public string EncryptData(object data)
        {
            if (data == null) return string.Empty;

            var json = data is string str ? str : JsonSerializer.Serialize(data, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            return EncryptString(json);
        }

        public string EncryptString(string plainText)
        {
            if (string.IsNullOrEmpty(plainText)) return string.Empty;

            try
            {
                using var aes = Aes.Create();
                aes.Key = _keyBytes;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.GenerateIV();
                var iv = aes.IV;

                using var encryptor = aes.CreateEncryptor(aes.Key, iv);
                using var ms = new MemoryStream();
                ms.Write(iv, 0, iv.Length); // Prepend 16-byte IV

                using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                using (var sw = new StreamWriter(cs, Encoding.UTF8))
                {
                    sw.Write(plainText);
                }

                return Convert.ToBase64String(ms.ToArray());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error encrypting payload");
                return string.Empty;
            }
        }

        public string DecryptString(string encryptedData)
        {
            if (string.IsNullOrWhiteSpace(encryptedData)) return string.Empty;

            try
            {
                var fullCipher = Convert.FromBase64String(encryptedData);
                if (fullCipher.Length < 16) return string.Empty;

                var iv = new byte[16];
                Buffer.BlockCopy(fullCipher, 0, iv, 0, 16);

                var cipherBytes = new byte[fullCipher.Length - 16];
                Buffer.BlockCopy(fullCipher, 16, cipherBytes, 0, cipherBytes.Length);

                using var aes = Aes.Create();
                aes.Key = _keyBytes;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
                using var ms = new MemoryStream(cipherBytes);
                using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
                using var sr = new StreamReader(cs, Encoding.UTF8);

                return sr.ReadToEnd();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to decrypt string");
                return string.Empty;
            }
        }
    }
}
