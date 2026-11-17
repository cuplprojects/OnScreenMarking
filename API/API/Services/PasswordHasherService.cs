using System;
using System.Security.Cryptography;
using System.Text;
using API.Models;
using Microsoft.AspNetCore.Identity;

namespace API.Services
{
    public interface IPasswordHasherService
    {
        string HashPassword(string password);
        bool VerifyPassword(string hashedPassword, string providedPassword);
        bool NeedsRehash(string hashedPassword);
        bool FixedTimeEquals(string? a, string? b);
    }

    public class PasswordHasherService : IPasswordHasherService
    {
        private readonly PasswordHasher<User> _identityHasher;
        private readonly User _dummyUser = new();

        public PasswordHasherService()
        {
            _identityHasher = new PasswordHasher<User>();
        }

        public string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password))
            {
                throw new ArgumentNullException(nameof(password));
            }
            return _identityHasher.HashPassword(_dummyUser, password);
        }

        public bool VerifyPassword(string hashedPassword, string providedPassword)
        {
            if (string.IsNullOrEmpty(hashedPassword) || string.IsNullOrEmpty(providedPassword))
            {
                return false;
            }

            // 1. Try verifying with ASP.NET Identity's PasswordHasher (Salted PBKDF2 with HMAC-SHA256)
            try
            {
                var result = _identityHasher.VerifyHashedPassword(_dummyUser, hashedPassword, providedPassword);
                if (result == PasswordVerificationResult.Success || result == PasswordVerificationResult.SuccessRehashNeeded)
                {
                    return true;
                }
            }
            catch
            {
                // Not in Identity format; proceed to legacy check
            }

            // 2. Legacy fallback: Unsalted SHA-256 with constant-time comparison
            // SHA-256 in Base64 is exactly 44 characters ending with '='
            if (hashedPassword.Length == 44)
            {
                using var sha256 = SHA256.Create();
                var computedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(providedPassword));
                var computedHash = Convert.ToBase64String(computedBytes);

                return FixedTimeEquals(hashedPassword, computedHash);
            }

            return false;
        }

        public bool NeedsRehash(string hashedPassword)
        {
            if (string.IsNullOrEmpty(hashedPassword) || hashedPassword.Length == 44)
            {
                return true;
            }

            try
            {
                var result = _identityHasher.VerifyHashedPassword(_dummyUser, hashedPassword, "dummy");
                return result == PasswordVerificationResult.SuccessRehashNeeded;
            }
            catch
            {
                return true;
            }
        }

        public bool FixedTimeEquals(string? a, string? b)
        {
            if (a == null || b == null)
            {
                return a == b;
            }

            var aBytes = Encoding.UTF8.GetBytes(a);
            var bBytes = Encoding.UTF8.GetBytes(b);

            if (aBytes.Length != bBytes.Length)
            {
                return false;
            }

            return CryptographicOperations.FixedTimeEquals(aBytes, bBytes);
        }
    }
}
