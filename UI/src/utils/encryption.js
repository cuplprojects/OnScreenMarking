// Simple encryption/decryption utility using base64 and a simple cipher
// For production, use a proper encryption library like crypto-js

const SECRET_KEY = 'osm-portal-secret-key-2024'; // Change this to environment variable in production

/**
 * Encrypt an ID for safe URL usage
 * @param {string|number} id - The ID to encrypt
 * @returns {string} - Encrypted ID safe for URLs
 */
export const encryptId = (id) => {
  if (id === null || id === undefined || id === '') return '';
  try {
    const str = String(id);
    let encrypted = '';
    
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    // Convert to base64 for URL safety
    return btoa(encrypted).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Encryption error:', error);
    return String(id);
  }
};

/**
 * Decrypt an ID from URL
 * @param {string} encryptedId - The encrypted ID from URL
 * @returns {string} - Decrypted ID
 */
export const decryptId = (encryptedId) => {
  if (!encryptedId) return '';
  try {
    // Restore base64 padding and characters
    let base64 = String(encryptedId).replace(/-/g, '+').replace(/_/g, '/');
    const padding = 4 - (base64.length % 4);
    if (padding !== 4) {
      base64 += '='.repeat(padding);
    }
    
    const encrypted = atob(base64);
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    // If decrypted produces numeric digits, it was an encrypted numeric ID
    if (/^\d+$/.test(decrypted)) {
      return decrypted;
    }

    // Fallback: if the input was already a raw numeric ID, preserve it
    if (/^\d+$/.test(String(encryptedId))) {
      return String(encryptedId);
    }

    return decrypted;
  } catch (error) {
    // If decryption fails (e.g. invalid base64 characters), return original input
    return String(encryptedId);
  }
};

/**
 * Create an encrypted URL parameter
 * @param {object} params - Object with key-value pairs to encrypt
 * @returns {string} - URL query string with encrypted values
 */
export const createEncryptedParams = (params) => {
  const encrypted = {};
  for (const [key, value] of Object.entries(params)) {
    encrypted[key] = encryptId(value);
  }
  return new URLSearchParams(encrypted).toString();
};

/**
 * Extract and decrypt URL parameters
 * @param {URLSearchParams} searchParams - React Router's searchParams
 * @param {string[]} keys - Keys to decrypt
 * @returns {object} - Decrypted parameters
 */
export const getDecryptedParams = (searchParams, keys) => {
  const decrypted = {};
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) {
      decrypted[key] = decryptId(value);
    }
  }
  return decrypted;
};
