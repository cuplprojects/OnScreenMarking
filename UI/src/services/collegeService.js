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
    // API endpoint directly returns CSV file
    const token = sessionStorage.getItem('token');
    // Using a direct link or fetching as blob
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/colleges/template`;
  },

  importColleges: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = sessionStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/colleges/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
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
