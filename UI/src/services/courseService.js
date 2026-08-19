import apiCall from './api';

const courseService = {
  getAllCourses: async (departmentId = null, universityId = null, params = {}) => {
    const query = new URLSearchParams();
    if (departmentId) query.append('departmentId', departmentId);
    if (universityId) query.append('universityId', universityId);
    if (params.page) query.append('page', params.page);
    if (params.pageSize !== undefined) query.append('pageSize', params.pageSize);
    if (params.search) query.append('search', params.search);
    if (params.sortField) query.append('sortField', params.sortField);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== '') query.append('isActive', params.isActive);
    if (params.type) query.append('type', params.type);
    const queryString = query.toString();
    return apiCall(`/courses${queryString ? `?${queryString}` : ''}`);
  },

  getCourseById: async (id) => {
    return apiCall(`/courses/${id}`);
  },

  createCourse: async (courseData) => {
    return apiCall('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  },

  updateCourse: async (id, courseData) => {
    return apiCall(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData)
    });
  },

  deleteCourse: async (id) => {
    return apiCall(`/courses/${id}`, {
      method: 'DELETE'
    });
  },

  getCourseSubjects: async (id) => {
    return apiCall(`/courses/${id}/subjects`);
  },

  addSubjectToCourse: async (courseId, subjectId) => {
    return apiCall(`/courses/${courseId}/subjects/${subjectId}`, {
      method: 'POST'
    });
  },

  removeSubjectFromCourse: async (courseId, subjectId) => {
    return apiCall(`/courses/${courseId}/subjects/${subjectId}`, {
      method: 'DELETE'
    });
  }
};

export default courseService;
