import apiCall from './api';

const sessionService = {
  getAllSessions: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    if (params.sortField) query.append('sortField', params.sortField);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
    
    const queryString = query.toString();
    return apiCall(`/session${queryString ? `?${queryString}` : ''}`);
  },

  getSessionById: async (sessionId) => {
    return apiCall(`/session/${sessionId}`);
  },

  createSession: async (sessionData) => {
    return apiCall('/session', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  updateSession: async (sessionId, sessionData) => {
    return apiCall(`/session/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData)
    });
  }
};

export default sessionService;
