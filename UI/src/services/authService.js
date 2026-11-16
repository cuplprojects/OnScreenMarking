import apiCall from './api';

const authService = {
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: userData
    });
  },

  getInvitationDetails: async (token) => {
    return apiCall(`/auth/invitation-details?token=${encodeURIComponent(token)}`);
  },

  acceptInvitation: async (acceptData) => {
    return apiCall('/auth/accept-invitation', {
      method: 'POST',
      body: acceptData
    });
  },

  sendEmailOtp: async (email) => {
    return apiCall('/auth/send-email-otp', {
      method: 'POST',
      body: { email }
    });
  },

  verifyEmailOtp: async (email, otp) => {
    return apiCall('/auth/verify-email-otp', {
      method: 'POST',
      body: { email, otp }
    });
  },

  sendPhoneOtp: async (phone) => {
    return apiCall('/auth/send-phone-otp', {
      method: 'POST',
      body: { phone }
    });
  },

  verifyPhoneOtp: async (phone, otp) => {
    return apiCall('/auth/verify-phone-otp', {
      method: 'POST',
      body: { phone, otp }
    });
  },

  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
  },

  verifyResetOtp: async (email, otp) => {
    return apiCall('/auth/verify-reset-otp', {
      method: 'POST',
      body: { email, otp }
    });
  },

  resetPassword: async (email, otp, newPassword) => {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: { email, otp, newPassword }
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    return apiCall('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
  },

  logout: async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST', hideErrorToast: true, ignoreAuthRedirect: true });
    } catch (e) {}
    try {
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/login';
  }
};

export default authService;
