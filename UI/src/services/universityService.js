import apiCall from './api';

const universityService = {
  // Get all universities
  getAllUniversities: async (params = {}) => {
    let url = '/universities';
    const queryParams = [];
    if (params.page !== undefined) queryParams.push(`page=${params.page}`);
    if (params.pageSize !== undefined) queryParams.push(`pageSize=${params.pageSize}`);
    if (params.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
    if (params.sortField) queryParams.push(`sortField=${params.sortField}`);
    if (params.sortOrder) queryParams.push(`sortOrder=${params.sortOrder}`);
    if (params.isActive !== undefined && params.isActive !== "") queryParams.push(`isActive=${params.isActive}`);
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    const response = await apiCall(url);
    if (params.page) {
      return response;
    }
    return response.items || response;
  },

  // Get university by ID
  getUniversityById: async (universityId) => {
    return apiCall(`/universities/${universityId}`);
  },

  // Create university
  createUniversity: async (universityData) => {
    return apiCall('/universities', {
      method: 'POST',
      body: JSON.stringify(universityData)
    });
  },

  // Update university
  updateUniversity: async (universityId, universityData) => {
    return apiCall(`/universities/${universityId}`, {
      method: 'PUT',
      body: JSON.stringify(universityData)
    });
  },

  // Delete university
  deleteUniversity: async (universityId) => {
    return apiCall(`/universities/${universityId}`, {
      method: 'DELETE'
    });
  }
};

export default universityService;
