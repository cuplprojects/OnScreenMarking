import apiCall from './api';

const sectionService = {
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
};

export default sectionService;
