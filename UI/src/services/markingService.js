import apiCall from './api';

const markingService = {
  // Get all markings for an examiner
  getExaminerMarkings: async (examinerId, status = null, page = 1, limit = 10) => {
    try {
      const params = new URLSearchParams({
        page,
        limit,
      });
      if (status) params.append('status', status);

      const response = await apiCall(`/marking/examiner/${examinerId}?${params}`);
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Get marking by ID
  getMarking: async (markingId) => {
    try {
      const response = await apiCall(`/marking/${markingId}`);
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Get detailed marking with sections and questions
  getMarkingDetails: async (markingId) => {
    try {
      const response = await apiCall(`/marking/${markingId}/details`);
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Get marking for a specific script
  getScriptMarking: async (scriptId) => {
    try {
      const response = await apiCall(`/marking/script/${scriptId}`);
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Create new marking
  createMarking: async (allocationId, examinerId, totalMarks, remarks = '') => {
    try {
      const response = await apiCall('/marking', {
        method: 'POST',
        body: JSON.stringify({
          allocationId,
          examinerId,
          totalMarks,
          remarks,
        }),
      });
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Update marking
  updateMarking: async (markingId, totalMarks, remarks = '', evaluatedPdfUrl = '') => {
    try {
      const response = await apiCall(`/marking/${markingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          totalMarks,
          remarks,
          evaluatedPdfUrl,
        }),
      });
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Save question marks
  saveQuestionMarks: async (markingId, questionMarks) => {
    try {
      const response = await apiCall(`/marking/${markingId}/question-marks`, {
        method: 'POST',
        body: JSON.stringify(questionMarks),
      });
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Get question marks for a marking
  getQuestionMarks: async (markingId) => {
    try {
      const response = await apiCall(`/marking/${markingId}/question-marks`);
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Submit marking
  submitMarking: async (markingId) => {
    try {
      const response = await apiCall(`/marking/${markingId}/submit`, {
        method: 'PUT',
      });
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Save draft marks to Redis
  saveDraftMarks: async (scriptId, examinerId, draftData) => {
    try {
      const response = await apiCall(`/marking/${scriptId}/draft`, {
        method: 'POST',
        body: JSON.stringify({
          examinerId,
          draftData
        }),
      });
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },

  // Get draft marks from Redis
  getDraftMarks: async (scriptId, examinerId) => {
    try {
      const response = await apiCall(`/marking/${scriptId}/draft/${examinerId}`);
      return response;
    } catch (error) {
      throw error.message || error;
    }
  },
};

export default markingService;
