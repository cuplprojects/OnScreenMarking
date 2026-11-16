import apiCall from './api';

const collegeService = {
  getAllColleges: async () => {
    return apiCall('/colleges');
  },

  getCollegeById: async (id) => {
    return apiCall(`/colleges/${id}`);
  },

  createCollege: async (collegeData) => {
    return apiCall('/colleges', {
      method: 'POST',
      body: collegeData
    });
  },

  updateCollege: async (id, collegeData) => {
    return apiCall(`/colleges/${id}`, {
      method: 'PUT',
      body: collegeData
    });
  },

  deleteCollege: async (id) => {
    return apiCall(`/colleges/${id}`, {
      method: 'DELETE'
    });
  },

  getTemplateUrl: () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    return `${baseUrl}/colleges/template`;
  },

  importColleges: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiCall('/colleges/import', {
      method: 'POST',
      body: formData
    });
  }
};

export default collegeService;
