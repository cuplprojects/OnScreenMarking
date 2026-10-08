import apiCall from './api';

/**
 * Allocation Service
 * Handles all script allocation operations
 */

export const allocationService = {
  /**
   * Get pending scripts for a subject with available examiners
   * @param {number} subjectId - Subject ID
   * @returns {Promise} Scripts and examiners data
   */
  getPendingScriptsBySubject: async (subjectId) => {
    return apiCall(`/allocation/subject/${subjectId}/pending-scripts`);
  },

  /**
   * Allocate multiple scripts to examiners in bulk
   * @param {Array} allocations - Array of {scriptId, examinerId} objects
   * @returns {Promise} Allocation results
   */
  bulkAllocateScripts: async (paperId, allocations) => {
    return apiCall('/allocation/bulk-allocate', {
      method: 'POST',
      body: JSON.stringify({ paperId, allocations })
    });
  },

  /**
   * Get all allocations with optional filters
   * @param {Object} filters - Filter options {examinerId, scriptId, status, page, limit}
   * @returns {Promise} Allocations list
   */
  getAllocations: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.examinerId) params.append('examinerId', filters.examinerId);
    if (filters.scriptId) params.append('scriptId', filters.scriptId);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const queryString = params.toString();
    return apiCall(`/allocation${queryString ? '?' + queryString : ''}`);
  },

  /**
   * Get allocation by ID
   * @param {number} allocationId - Allocation ID
   * @returns {Promise} Allocation details
   */
  getAllocationById: async (allocationId) => {
    return apiCall(`/allocation/${allocationId}`);
  },

  /**
   * Create single allocation
   * @param {number} scriptId - Script ID
   * @param {number} examinerId - Examiner ID
   * @returns {Promise} Created allocation
   */
  createAllocation: async (scriptId, examinerId) => {
    return apiCall('/allocation', {
      method: 'POST',
      body: JSON.stringify({ scriptId, examinerId })
    });
  },

  /**
   * Cancel allocation
   * @param {number} allocationId - Allocation ID
   * @returns {Promise} Cancellation result
   */
  cancelAllocation: async (allocationId) => {
    return apiCall(`/allocation/${allocationId}/cancel`, {
      method: 'PUT'
    });
  },

  /**
   * Get examiner's allocations
   * @param {number} examinerId - Examiner ID
   * @returns {Promise} Examiner's allocations
   */
  getExaminerAllocations: async (examinerId) => {
    return apiCall(`/allocation/examiner/${examinerId}`);
  },

  /**
   * Get allocation for a script
   * @param {number} scriptId - Script ID
   * @returns {Promise} Script's allocation
   */
  getScriptAllocation: async (scriptId) => {
    return apiCall(`/allocation/script/${scriptId}`);
  },

  /**
   * Reassign allocations to a target examiner
   */
  reassignAllocations: async (allocationIds, targetExaminerId) => {
    return apiCall('/allocation/reassign', {
      method: 'POST',
      body: JSON.stringify({ allocationIds, targetExaminerId })
    });
  },

  /**
   * Revoke multiple allocations
   */
  revokeAllocations: async (allocationIds) => {
    return apiCall('/allocation/revoke', {
      method: 'POST',
      body: JSON.stringify({ allocationIds })
    });
  },

  /**
   * Auto allocate all pending scripts across project
   */
  autoAllocateProject: async (projectId) => {
    return apiCall(`/allocation/project/${projectId}/auto-allocate`, {
      method: 'POST'
    });
  },

  /**
   * Get deallocation stats and examiner counts for a project/paper
   */
  getDeallocationStats: async (projectId, paperId) => {
    let url = `/allocation/deallocation-stats?projectId=${projectId}`;
    if (paperId) url += `&paperId=${paperId}`;
    return apiCall(url);
  },

  /**
   * Overwrite/Adjust examiner script allocation count for a paper
   */
  overwriteExaminerCount: async (paperId, examinerId, targetCount) => {
    return apiCall('/allocation/overwrite-examiner-count', {
      method: 'POST',
      body: JSON.stringify({ paperId, examinerId, targetCount })
    });
  }
};

export default allocationService;
