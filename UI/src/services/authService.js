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

  sendEmailOtp: async (email) => {
    return apiCall('/Auth/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  verifyEmailOtp: async (email, otp) => {
    return apiCall('/Auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },

  sendPhoneOtp: async (phone) => {
    return apiCall('/Auth/send-phone-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  },

  verifyPhoneOtp: async (phone, otp) => {
    return apiCall('/Auth/verify-phone-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp })
    });
  },

  forgotPassword: async (email) => {
    return apiCall('/Auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  verifyResetOtp: async (email, otp) => {
    return apiCall('/Auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },

  resetPassword: async (email, otp, newPassword) => {
    return apiCall('/Auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    return apiCall('/Auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  logout: async () => {
    try {
      await apiCall('/Auth/logout', { method: 'POST', hideErrorToast: true, ignoreAuthRedirect: true });
    } catch (e) {}
    try {
      sessionStorage.clear();
    } catch (e) {}
  }
};

export default authService;
