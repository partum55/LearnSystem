import apiClient from './client';

export const authRecoveryApi = {
  forgotPassword: async (email: string) => {
    await apiClient.post('/auth/forgot-password', null, { params: { email } });
  },

  resetPassword: async (token: string, newPassword: string) => {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },

  verifyEmail: async (token: string) => {
    await apiClient.post('/auth/verify-email', null, { params: { token } });
  },
};

export default authRecoveryApi;
