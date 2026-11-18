// Centralized API configuration
const API_URL = import.meta.env.VITE_API_URL || '/api';
import message from './messageService';

// In-memory session tracking for backward compatibility (tokens are managed via HttpOnly cookies)
export const setSessionId = (_id) => {};
export const clearSessionId = () => {};

const handleResponse = async (response, options = {}) => {
  if (response.status === 401) {
    if (!options.ignoreAuthRedirect && 
        !window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/accept-invitation') &&
        !window.location.pathname.includes('/student-portal')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorObj = await response.json();
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

  const data = await response.json();
  
  // Show success messages for mutations only if explicitly requested
  if (response.ok && data?.success && data?.message && options.showSuccessToast) {
    message.success(data.message);
  }
  
  return data;
};

const apiCall = async (endpoint, options = {}) => {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('token') || sessionStorage.getItem('token'))
    : null;

  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { 'X-Session-Id': token, 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body && typeof body === 'object' && !isFormData) {
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
