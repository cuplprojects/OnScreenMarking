import apiCall from './api';

const sectionService = {
  // Get all section masters
  getSectionMasters: async () => {
    return apiCall('/section/Masters');
  },

  // Create section master
  createSectionMaster: async (data) => {
    return apiCall('/section/Masters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update section master
  updateSectionMaster: async (id, data) => {
    return apiCall(`/section/Masters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete section master
  deleteSectionMaster: async (id) => {
    return apiCall(`/section/Masters/${id}`, {
      method: 'DELETE',
    });
  },

  // Get all sections
  getAllSections: async (paperId = null) => {
    const query = paperId ? `?paperId=${paperId}` : '';
    return apiCall(`/section${query}`);
  },

  // Get section by ID
  getSectionById: async (sectionId) => {
    return apiCall(`/section/${sectionId}`);
  },

  // Get questions for a section
  getSectionQuestions: async (sectionId) => {
    return apiCall(`/section/${sectionId}/questions`);
  },

  // Create section
  createSection: async (sectionData) => {
    return apiCall('/section', {
      method: 'POST',
      body: JSON.stringify(sectionData),
    });
  },

  // Update section
  updateSection: async (sectionId, sectionData) => {
    return apiCall(`/section/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(sectionData),
    });
  },

  // Delete section
  deleteSection: async (sectionId) => {
    return apiCall(`/section/${sectionId}`, {
      method: 'DELETE',
    });
  },

  // Update question
  updateQuestion: async (questionId, questionData) => {
    return apiCall(`/section/question/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  },

  // Bulk create sections for multiple papers
  bulkCreateSections: async (bulkData) => {
    return apiCall('/section/bulk-create', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    });
  },

  // Import sections from one paper to multiple target papers
  importSections: async (importData) => {
    return apiCall('/section/import', {
      method: 'POST',
      body: JSON.stringify(importData),
    });
  },

  // Import master sections to one or multiple papers
  importMasterSections: async (data) => {
    return apiCall('/section/import-masters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get mapped master sections for a paper
  getPaperMasterSections: async (paperId) => {
    return apiCall(`/section/paper-masters/${paperId}`);
  },

  // Save master section mappings for a paper
  savePaperMasterSections: async (paperId, masterSectionIds) => {
    return apiCall('/section/paper-masters', {
      method: 'POST',
      body: JSON.stringify({ paperId, masterSectionIds }),
    });
  },

  // Project Paper Sections
  getProjectPaperSections: async ({ projectPaperId = null, projectId = null, paperId = null } = {}) => {
    const params = new URLSearchParams();
    if (projectPaperId) params.append('projectPaperId', projectPaperId);
    if (projectId) params.append('projectId', projectId);
    if (paperId) params.append('paperId', paperId);
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

  deleteProjectPaperSection: async (id) => {
    return apiCall(`/projectpapersection/${id}`, {
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
