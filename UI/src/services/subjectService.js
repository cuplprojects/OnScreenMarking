import apiCall from "./api";

const subjectService = {
  getAllSubjects: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    if (params.sortField) query.append('sortField', params.sortField);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
    if (params.departmentId) query.append('departmentId', params.departmentId);
    
    const queryString = query.toString();
    return apiCall(`/subject${queryString ? `?${queryString}` : ''}`);
  },
  
  getSubjectByUniversity: async (universityId, params = {}) => {
    const query = new URLSearchParams();
    if (universityId) query.append('universityId', universityId);
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    if (params.sortField) query.append('sortField', params.sortField);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
    
    const queryString = query.toString();
    return apiCall(`/Subject/University${queryString ? `?${queryString}` : ''}`);
  },

  getSubjectByProject: async (projectId) => {
    return apiCall(`/Subject/Project?projectId=${projectId}`);
  },

  getSubjectsByDepartment: async (departmentId, params = {}) => {
    const query = new URLSearchParams();
    if (departmentId) query.append('departmentId', departmentId);
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString();
    return apiCall(`/subject${queryString ? `?${queryString}` : ''}`);
  },

  getSubjectById: async (subjectId) => {
    return apiCall(`/subject/${subjectId}`);
  },

  // Get all departments for a subject
  getSubjectDepartments: async (subjectId, universityId) => {
    const url = `/subject/${subjectId}/departments${universityId ? `?universityId=${universityId}` : ''}`;
    return apiCall(url);
  },

  // Get all papers for a subject
  getSubjectPapers: async (subjectId) => {
    return apiCall(`/subject/${subjectId}/papers`);
  },

  createSubject: async (subjectData) => {
    return apiCall("/subject", {
      method: "POST",
      body: JSON.stringify(subjectData),
    });
  },

  updateSubject: async (subjectId, subjectData) => {
    return apiCall(`/subject/${subjectId}`, {
      method: "PUT",
      body: JSON.stringify(subjectData),
    });
  },

  deleteSubject: async (subjectId) => {
    return apiCall(`/subject/${subjectId}`, {
      method: "DELETE",
    });
  },

  // Add department to subject (many-to-many)
  addDepartmentToSubject: async (subjectId, departmentId) => {
    return apiCall(`/subject/${subjectId}/departments/${departmentId}`, {
      method: "POST",
    });
  },

  // Remove department from subject
  removeDepartmentFromSubject: async (subjectId, departmentId) => {
    return apiCall(`/subject/${subjectId}/departments/${departmentId}`, {
      method: "DELETE",
    });
  },
};

export default subjectService;
