import apiCall from './api';

const userService = {
  getAllUsers: async (universityId, params = {}) => {
    let url = `/users`;
    const queryParams = [];
    if (universityId) {
      queryParams.push(`universityId=${universityId}`);
    } else if (params.universityId) {
      queryParams.push(`universityId=${params.universityId}`);
    }
    
    // Append standard table parameters
    if (params.page) queryParams.push(`page=${params.page}`);
    if (params.pageSize) queryParams.push(`pageSize=${params.pageSize}`);
    if (params.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
    if (params.sortField) queryParams.push(`sortField=${params.sortField}`);
    if (params.sortOrder) queryParams.push(`sortOrder=${params.sortOrder}`);
    
    // Append filters
    if (params.activeTab) queryParams.push(`activeTab=${params.activeTab}`);
    if (params.isActive !== undefined && params.isActive !== "") queryParams.push(`isActive=${params.isActive}`);
    if (params.userType) queryParams.push(`userType=${params.userType}`);

    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    return apiCall(url);
  },

  getUserById: async (userId) => {
    return apiCall(`/users/${userId}`);
  },

  getUserCounts: async (universityId) => {
    const url = universityId ? `/users/counts?universityId=${universityId}` : '/users/counts';
    return apiCall(url);
  },

  createUser: async (userData) => {
    return apiCall('/Auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  updateUser: async (userId, userData) => {
    return apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  deleteUser: async (userId) => {
    return apiCall(`/users/${userId}`, {
      method: 'DELETE'
    });
  },

  approveUser: async (userId) => {
    return apiCall(`/users/${userId}/approve`, {
      method: 'PUT'
    });
  },

  inviteUser: async (inviteData) => {
    return apiCall('/users/invite', {
      method: 'POST',
      body: JSON.stringify(inviteData)
    });
  },

  getExaminers: async (universityId, subjectId) => {
    const params = [];
    if (universityId) params.push(`universityId=${universityId}`);
    if (subjectId) params.push(`subjectId=${subjectId}`);
    const queryString = params.length > 0 ? '?' + params.join('&') : '';
    return apiCall(`/users/examiners${queryString}`);
  },

  getExaminersBySubjects: async (subjectIds, universityId) => {
    // Fetch examiners for multiple subjects and combine them
    if (!subjectIds || subjectIds.length === 0) {
      return this.getExaminers(universityId);
    }

    const examinerSets = await Promise.all(
      subjectIds.map(subId => this.getExaminers(universityId, subId))
    );

    // Combine all examiners and remove duplicates by ID
    const examinerMap = new Map();
    examinerSets.forEach(examiners => {
      examiners.forEach(examiner => {
        if (!examinerMap.has(examiner.id)) {
          examinerMap.set(examiner.id, examiner);
        }
      });
    });

    return Array.from(examinerMap.values());
  }
};

export default userService;
