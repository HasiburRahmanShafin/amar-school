import axiosClient from './axiosClient';

// School Profile Management - institution identity, leadership, contact
// details, address, and social links. This is the single source of truth
// used across the public website, communications, and generated documents
// (admission forms, transfer certificates, etc.).
export const getMyProfile = () => axiosClient.get('/school/profile');
export const updateMyProfile = (data) => axiosClient.put('/school/profile', data);

// Version history - every change (instant or approved) is logged; a past
// value can be restored, which itself goes through the same rules as any
// other edit (sensitive fields still require approval).
export const getHistory = () => axiosClient.get('/school/profile/history');
export const restoreVersion = (changeId) => axiosClient.post(`/school/profile/history/${changeId}/restore`);

// Contact verification (OTP-style) for the primary phone and email.
export const requestEmailVerification = () => axiosClient.post('/school/profile/verify/email/request');
export const confirmEmailVerification = (code) =>
  axiosClient.post('/school/profile/verify/email/confirm', { code });
export const requestPhoneVerification = () => axiosClient.post('/school/profile/verify/phone/request');
export const confirmPhoneVerification = (code) =>
  axiosClient.post('/school/profile/verify/phone/confirm', { code });

// Public - no auth header needed, but axiosClient sends one anyway if a
// token exists in localStorage, which is harmless since this route ignores it.
export const getPublicProfile = (subdomain) => axiosClient.get(`/school/profile/public/${subdomain}`);
