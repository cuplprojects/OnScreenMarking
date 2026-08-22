// Centralized API configuration
const API_URL = import.meta.env.VITE_API_URL;
import message from './messageService';

const getToken = () => sessionStorage.getItem('token');

const handleResponse = async (response, options = {}) => {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorObj = await response.json();
      errorMessage = errorObj.message || errorMessage;
    } catch (e) {
      try {
        const text = await response.text();
        if (text) {
          // If it's a short text message, use it
          errorMessage = text.length < 200 ? text : `HTTP error! status: ${response.status}`;
        }
      } catch (textErr) {}
    }
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  // Show success messages for mutations if they provide a message
  if (response.ok && data?.success && data?.message && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
    message.success(data.message);
  }
  
  return data;
};

const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return handleResponse(response, options);
};

export default apiCall;
