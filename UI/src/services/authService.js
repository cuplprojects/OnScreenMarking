import apiCall from './api';

const authService = {
  login: async (email, password) => {
    return apiCall('/Auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  register: async (userData) => {
    return apiCall('/Auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  getInvitationDetails: async (token) => {
    return apiCall(`/Auth/invitation-details?token=${encodeURIComponent(token)}`);
  },

  acceptInvitation: async (acceptData) => {
    return apiCall('/Auth/accept-invitation', {
      method: 'POST',
      body: JSON.stringify(acceptData)
    });
  },

  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('profileImage');
    sessionStorage.removeItem('universityId');
    sessionStorage.removeItem('subjectId1');
  }
};

export default authService;
