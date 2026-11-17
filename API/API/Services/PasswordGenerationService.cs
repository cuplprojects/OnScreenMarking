using System;
using System.Security.Cryptography;
using System.Text;

namespace API.Services
{
    public interface IPasswordGenerationService
    {
        string GeneratePassword(int length = 14);
        string GenerateSecureToken(int byteLength = 32);
    }

    public class PasswordGenerationService : IPasswordGenerationService
    {
        private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Omitted easily confused letters (I, O)
        private const string Lower = "abcdefghijkmnopqrstuvwxyz"; // Omitted easily confused letters (l)
        private const string Digits = "23456789";                  // Omitted easily confused digits (0, 1)
        private const string Special = "!@#$%^&*()_+-=";

        public string GeneratePassword(int length = 14)
        {
            if (length < 8) length = 8;

            var allChars = Upper + Lower + Digits + Special;
            var result = new char[length];

            // Guarantee at least one character from each character class
            result[0] = Upper[RandomNumberGenerator.GetInt32(Upper.Length)];
            result[1] = Lower[RandomNumberGenerator.GetInt32(Lower.Length)];
            result[2] = Digits[RandomNumberGenerator.GetInt32(Digits.Length)];
            result[3] = Special[RandomNumberGenerator.GetInt32(Special.Length)];

            for (int i = 4; i < length; i++)
            {
                result[i] = allChars[RandomNumberGenerator.GetInt32(allChars.Length)];
            }

            // Cryptographically shuffle the array using Fisher-Yates
            for (int i = length - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (result[i], result[j]) = (result[j], result[i]);
            }

            return new string(result);
        }

        public string GenerateSecureToken(int byteLength = 32)
        {
            var bytes = RandomNumberGenerator.GetBytes(byteLength);
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
    }
}
