// Centralized API configuration
const API_URL = import.meta.env.VITE_API_URL;
import message from './messageService';

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
      const errorObj = await response.json();
      errorMessage = errorObj.message || errorMessage;
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
  
  const data = await response.json();
  
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
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
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
