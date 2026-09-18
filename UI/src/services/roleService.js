import apiCall from './api';

const roleService = {
  // Get all roles
  getAllRoles: async (params = {}) => {
    let url = '/role';
    const queryParams = [];
    if (params.page !== undefined) queryParams.push(`page=${params.page}`);
    if (params.pageSize !== undefined) queryParams.push(`pageSize=${params.pageSize}`);
    if (params.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
    if (params.sortField) queryParams.push(`sortField=${params.sortField}`);
    if (params.sortOrder) queryParams.push(`sortOrder=${params.sortOrder}`);
    if (params.isActive !== undefined && params.isActive !== "") queryParams.push(`isActive=${params.isActive}`);
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    const response = await apiCall(url);
    if (params.page) {
      return response;
    }
    return response.items || response;
  },

  // Get role by ID
  getRoleById: async (roleId) => {
    return apiCall(`/role/${roleId}`);
  },

  // Create new role
  createRole: async (roleData) => {
    return apiCall('/role/create', {
      method: 'POST',
      body: JSON.stringify(roleData)
    });
  },

  // Update role
  updateRole: async (roleId, roleData) => {
    return apiCall(`/role/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    });
  },

  // Delete role
  deleteRole: async (roleId) => {
    return apiCall(`/role/${roleId}`, {
      method: 'DELETE'
    });
  },

  // Get all available permissions
  getAllPermissions: async () => {
    return apiCall('/role/permissions/all');
  }
};

export default roleService;
