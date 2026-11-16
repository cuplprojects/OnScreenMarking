// Centralized Payload & Response Serialization Utility
// Client-side encryption has been removed in favor of standard TLS/HTTPS encryption
// and server-side authentication & authorization checks.

/**
 * Returns plain string or JSON string
 * @param {string|object} data - Payload
 * @returns {Promise<string>}
 */
export async function encryptString(data) {
  if (data === null || data === undefined) return '';
  return typeof data === 'object' ? JSON.stringify(data) : String(data);
}

/**
 * Returns plain text string
 * @param {string} data
 * @returns {Promise<string>}
 */
export async function decryptString(data) {
  return data == null ? '' : String(data);
}

/**
 * Passthrough for request bodies
 * @param {object|string} body
 * @returns {Promise<any>}
 */
export async function encryptPayload(body) {
  return body;
}

/**
 * Passthrough for response data
 * @param {object|string} responseData
 * @returns {Promise<any>}
 */
export async function decryptResponseData(responseData) {
  return responseData;
}
