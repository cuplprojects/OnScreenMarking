// Centralized API configuration
const API_URL = import.meta.env.VITE_API_URL;
import message from './messageService';
import { encryptPayload, decryptResponseData } from '../utils/payloadEncryption';

let inMemorySessionId = null;

export const setSessionId = (id) => {
  inMemorySessionId = id;
};

export const clearSessionId = () => {
  inMemorySessionId = null;
};

const handleResponse = async (response, options = {}) => {
  if (response.status === 401) {
    inMemorySessionId = null;
    if (!options.ignoreAuthRedirect && 
        !window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/accept-invitation')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      let errorObj = await response.json();
      if (response.headers.get('X-Encrypted') === 'true' || errorObj?.encryptedData) {
        errorObj = await decryptResponseData(errorObj);
      }
      errorMessage = errorObj?.message || errorMessage;
    } catch (e) {
      try {
        const text = await response.text();
        if (text) {
          errorMessage = text.length < 200 ? text : `HTTP error! status: ${response.status}`;
        }
      } catch (textErr) {}
    }
    if (!options.hideErrorToast) {
      message.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
  
  if (options.responseType === 'blob') {
    return await response.blob();
  }

  let data = await response.json();
  if (response.headers.get('X-Encrypted') === 'true' || data?.encryptedData) {
    data = await decryptResponseData(data);
  }
  
  // Show success messages for mutations only if explicitly requested
  if (response.ok && data?.success && data?.message && options.showSuccessToast) {
    message.success(data.message);
  }
  
  return data;
};

const apiCall = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(inMemorySessionId ? { 'X-Session-Id': inMemorySessionId, 'Authorization': `Bearer ${inMemorySessionId}` } : {}),
    ...options.headers,
  };

  let body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && body !== null && !isFormData && !options.skipEncryption) {
    try {
      const encrypted = await encryptPayload(body);
      body = JSON.stringify(encrypted);
      headers['X-Encrypted'] = 'true';
      headers['Content-Type'] = 'application/json';
    } catch (encErr) {
      console.warn('Payload encryption failed, falling back to plaintext:', encErr);
      if (typeof body === 'object') {
        body = JSON.stringify(body);
      }
    }
  } else if (body && typeof body === 'object' && !isFormData) {
    body = JSON.stringify(body);
  } else if (isFormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    body,
    credentials: 'include', // Automatically attaches HttpOnly OSM_SESSION cookie
  });

  return handleResponse(response, options);
};

export default apiCall;
