import apiCall from './api';

const projectService = {
  // Get all projects
  getAllProjects: async (universityId, params = {}) => {
    const query = new URLSearchParams();
    if (universityId) query.append('universityId', universityId);
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    if (params.sortField) query.append('sortField', params.sortField);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
    
    const queryString = query.toString();
    return apiCall(`/project${queryString ? `?${queryString}` : ''}`);
  },

  getProjects: async (universityId) => {
    return projectService.getAllProjects(universityId);
  },

  // Get project by ID
  getProjectById: async (projectId) => {
    return apiCall(`/project/${projectId}`);
  },

  // Create project
  createProject: async (projectData) => {
    return apiCall('/project', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    return apiCall(`/project/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  },

  // Delete project
  deleteProject: async (projectId) => {
    return apiCall(`/project/${projectId}`, {
      method: 'DELETE'
    });
  },

  // Get projects by session
  getProjectsBySession: async (sessionId, universityId, params = {}) => {
    const query = new URLSearchParams();
    if (sessionId) query.append('sessionId', sessionId);
    if (universityId) query.append('universityId', universityId);
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    if (params.sortField) query.append('sortField', params.sortField);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
    
    const queryString = query.toString();
    return apiCall(`/project${queryString ? `?${queryString}` : ''}`);
  }
};

export default projectService;
