import apiCall from './api';

const paperService = {
  // Get all papers
  getAllPapers: async (universityId) => {
    const url = `/papers${universityId ? `?universityId=${universityId}` : ''}`;
    return apiCall(url);
  },

  // Get papers with flexible query params (including isMaster, pagination, etc)
  getPapers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.universityId) query.append('universityId', params.universityId);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.subjectId) query.append('subjectId', params.subjectId);
    if (params.isMaster) query.append('isMaster', params.isMaster);
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    if (params.sortField) query.append('sortField', params.sortField);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    
    const queryString = query.toString();
    return apiCall(`/papers${queryString ? `?${queryString}` : ''}`);
  },

  // Get papers by project
  getPapersByProject: async (projectId) => {
    return apiCall(`/papers?projectId=${projectId}`);
  },

  // Get project dashboard stats (paginated)
  getProjectDashboardPapers: async (projectId, page = 1, pageSize = 10, search = '', sortField = '', sortOrder = '') => {
    const queryParams = new URLSearchParams({
      projectId,
      page,
      pageSize,
      search,
      sortField,
      sortOrder
    });
    return apiCall(`/papers/dashboard-stats?${queryParams.toString()}`);
  },

  // Get papers by subject
  getPapersBySubject: async (subjectId) => {
    return apiCall(`/papers?subjectId=${subjectId}`);
  },

  // Get paper by ID
  getPaperById: async (paperId) => {
    return apiCall(`/papers/${paperId}`);
  },

  // Get all subjects for a paper
  getPaperSubjects: async (paperId) => {
    return apiCall(`/papers/${paperId}/subjects`);
  },

  // Create paper
  createPaper: async (paperData) => {
    return apiCall('/papers', {
      method: 'POST',
      body: JSON.stringify(paperData),
    });
  },

  // Update paper
  updatePaper: async (paperId, paperData) => {
    return apiCall(`/papers/${paperId}`, {
      method: 'PUT',
      body: JSON.stringify(paperData),
    });
  },

  // Delete paper
  deletePaper: async (paperId) => {
    return apiCall(`/papers/${paperId}`, {
      method: 'DELETE',
    });
  },

  // Add subject to paper (many-to-many)
  addSubjectToPaper: async (paperId, subjectId) => {
    return apiCall(`/papers/${paperId}/subjects/${subjectId}`, {
      method: 'POST',
    });
  },

  // Remove subject from paper
  removeSubjectFromPaper: async (paperId, subjectId) => {
    return apiCall(`/papers/${paperId}/subjects/${subjectId}`, {
      method: 'DELETE',
    });
  },

  // Import papers from another project
  importPapers: async (targetProjectId, sourcePaperIds) => {
    return apiCall('/papers/import', {
      method: 'POST',
      body: JSON.stringify({
        targetProjectId: targetProjectId,
        sourcePaperIds: sourcePaperIds
      }),
    });
  }
};

export default paperService;
