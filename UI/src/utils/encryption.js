// URL Parameter & Identifier Serialization Utility
// Client-side XOR "encryption" with hardcoded secrets has been removed.
// All route access and object mutations are authorized strictly on the server.

/**
 * Encode an ID for safe URL usage
 * @param {string|number} id - The ID to encode
 * @returns {string} - Clean URL-safe string
 */
export const encryptId = (id) => {
  if (id === null || id === undefined || id === '') return '';
  return String(id).trim();
};

/**
 * Decode an ID from URL
 * @param {string} id - The ID from URL
 * @returns {string} - Decoded ID
 */
export const decryptId = (id) => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

/**
 * Create URL query parameters
 * @param {object} params - Object with key-value pairs
 * @returns {string} - URL query string
 */
export const createEncryptedParams = (params) => {
  if (!params || typeof params !== 'object') return '';
  const cleanParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      cleanParams[key] = String(value);
    }
  }
  return new URLSearchParams(cleanParams).toString();
};

/**
 * Extract URL parameters
 * @param {URLSearchParams} searchParams - React Router's searchParams
 * @param {string[]} keys - Keys to extract
 * @returns {object} - Extracted parameters
 */
export const getDecryptedParams = (searchParams, keys) => {
  const result = {};
  if (!searchParams || !Array.isArray(keys)) return result;
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) {
      result[key] = String(value);
    }
  }
  return result;
};
