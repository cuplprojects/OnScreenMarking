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
      body: JSON.stringify(collegeData)
    });
  },

  updateCollege: async (id, collegeData) => {
    return apiCall(`/colleges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(collegeData)
    });
  },

  deleteCollege: async (id) => {
    return apiCall(`/colleges/${id}`, {
      method: 'DELETE'
    });
  },

  getTemplateUrl: () => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/colleges/template`;
  },

  importColleges: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/colleges/import`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Import failed');
    }

    return response.json();
  }
};

export default collegeService;
