import apiCall from './api';

const universitySettingService = {
  // University Assignment Settings (stored directly in Universities table)
  getSettings: async (universityId) => {
    const query = universityId ? `?universityId=${universityId}` : '';
    return apiCall(`/Universities/assignment-settings${query}`);
  },

  saveSetting: async (data) => {
    return apiCall('/Universities/assignment-setting', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Assignment Types
  getAssignmentTypes: async (universityId) => {
    try {
      const query = universityId ? `?universityId=${universityId}` : '';
      const res = await apiCall(`/AssignmentTypes${query}`);
      if (Array.isArray(res) && res.length > 0) return res;
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data;
      if (Array.isArray(res?.items) && res.items.length > 0) return res.items;
    } catch (e) {
      console.warn('Failed to load from /AssignmentTypes:', e);
    }
    return [];
  },

  createAssignmentType: async (data) => {
    return apiCall('/AssignmentTypes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateAssignmentType: async (id, data) => {
    return apiCall(`/AssignmentTypes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteAssignmentType: async (id) => {
    return apiCall(`/AssignmentTypes/${id}`, {
      method: 'DELETE'
    });
  },

  // Direct Assignment Configuration (Hardcoded: Daily Allocation & Equal Distribution)
  getAssignmentConfig: async (universityId) => {
    const query = universityId ? `?universityId=${universityId}` : '';
    return apiCall(`/AssignmentTypes/configuration${query}`);
  },

  saveAssignmentConfig: async (data) => {
    return apiCall('/AssignmentTypes/configuration', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

export default universitySettingService;

