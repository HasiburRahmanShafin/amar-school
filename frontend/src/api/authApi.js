import axiosClient from './axiosClient';

export const registerSchool = (data) => axiosClient.post('/auth/register-school', data);
export const login = (data) => axiosClient.post('/auth/login', data);
export const getMe = () => axiosClient.get('/auth/me');

export const getPendingSchools = (status) =>
  axiosClient.get('/superadmin/schools', { params: status ? { status } : {} });
export const approveSchool = (id) => axiosClient.patch(`/superadmin/schools/${id}/approve`);
export const rejectSchool = (id, reason) =>
  axiosClient.patch(`/superadmin/schools/${id}/reject`, { reason });

// School Profile change approval queue (sensitive fields: name, EIIN,
// principal's name, address)
export const getProfileChanges = (status) =>
  axiosClient.get('/superadmin/profile-changes', { params: status ? { status } : {} });
export const approveProfileChange = (id, note) =>
  axiosClient.patch(`/superadmin/profile-changes/${id}/approve`, { note });
export const rejectProfileChange = (id, reason) =>
  axiosClient.patch(`/superadmin/profile-changes/${id}/reject`, { reason });
