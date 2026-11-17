import apiCall from './api';

export const sectionService = {
  // Get all section masters with pagination, search, sorting, and batch filtering
  getSectionMasters: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.search) queryParams.append('search', params.search);
    if (params.batchId) queryParams.append('batchId', params.batchId);
    if (params.sortField) queryParams.append('sortField', params.sortField);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.all) queryParams.append('all', params.all);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiCall(`/section/Masters${qs}`);
  },

  createSectionMaster: async (data) => {
    return apiCall('/section/Masters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Create section masters in batch
  createSectionMastersBatch: async (data) => {
    return apiCall('/section/Masters/Batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update section masters in batch
  updateSectionMastersBatch: async (batchId, data) => {
    return apiCall(`/section/Masters/Batch/${batchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateSectionMaster: async (id, data) => {
    return apiCall(`/section/Masters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSectionMaster: async (id) => {
    return apiCall(`/section/Masters/${id}`, {
      method: 'DELETE',
    });
  },

  getAllSections: async (paperId) => {
    return apiCall(`/section/paper/${paperId}`);
  },

  getSectionById: async (id) => {
    return apiCall(`/section/${id}`);
  },

  createSection: async (data) => {
    return apiCall('/section', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSection: async (id, data) => {
    return apiCall(`/section/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSection: async (id) => {
    return apiCall(`/section/${id}`, {
      method: 'DELETE',
    });
  },

  // Questions APIs
  getSectionQuestions: async (sectionId) => {
    return apiCall(`/section/${sectionId}/questions`);
  },

  createQuestion: async (sectionId, data) => {
    return apiCall(`/section/${sectionId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuestion: async (questionId, data) => {
    return apiCall(`/section/question/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion: async (questionId) => {
    return apiCall(`/section/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  // Bulk operations
  createSectionsBulk: async (paperId, sections) => {
    return apiCall(`/section/paper/${paperId}/bulk`, {
      method: 'POST',
      body: JSON.stringify(sections),
    });
  },

  // Import sections
  importSections: async (data) => {
    return apiCall('/section/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Import master sections
  importMasterSections: async (data) => {
    return apiCall('/section/import-masters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get paper master sections
  getPaperMasterSections: async (paperId) => {
    return apiCall(`/section/paper-masters/${paperId}`);
  },

  // Save paper master sections
  savePaperMasterSections: async (paperId, masterSectionIds) => {
    return apiCall('/section/paper-masters', {
      method: 'POST',
      body: JSON.stringify({ paperId, masterSectionIds }),
    });
  },

  // Project Paper Sections
  getProjectPaperSections: async ({ projectPaperId = null, projectId = null, paperId = null, batchId = null, scriptId = null } = {}) => {
    const params = new URLSearchParams();
    if (projectPaperId) params.append('projectPaperId', projectPaperId);
    if (projectId) params.append('projectId', projectId);
    if (paperId) params.append('paperId', paperId);
    if (batchId) params.append('batchId', batchId);
    if (scriptId) params.append('scriptId', scriptId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/projectpapersection${qs}`);
  },

  getProjectPaperSectionById: async (id) => {
    return apiCall(`/projectpapersection/${id}`);
  },

  createProjectPaperSection: async (data) => {
    return apiCall('/projectpapersection', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProjectPaperSection: async (id, data) => {
    return apiCall(`/projectpapersection/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteProjectPaperSection: async (id, { projectPaperId = null, projectId = null, paperId = null } = {}) => {
    const params = new URLSearchParams();
    if (projectPaperId) params.append('projectPaperId', projectPaperId);
    if (projectId) params.append('projectId', projectId);
    if (paperId) params.append('paperId', paperId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiCall(`/projectpapersection/${id}${qs}`, {
      method: 'DELETE',
    });
  },

  importMasterSectionsToProjectPaper: async (projectPaperId, overwriteExisting = false) => {
    return apiCall('/projectpapersection/import-from-paper', {
      method: 'POST',
      body: JSON.stringify({ projectPaperId, overwriteExisting }),
    });
  },

  importMastersToProjectPaper: async ({ projectPaperId = null, projectId = null, paperId = null, masterSectionIds = [], overwriteExisting = false } = {}) => {
    return apiCall('/projectpapersection/import-masters', {
      method: 'POST',
      body: JSON.stringify({ projectPaperId, projectId, paperId, masterSectionIds, overwriteExisting }),
    });
  },
};

export default sectionService;
