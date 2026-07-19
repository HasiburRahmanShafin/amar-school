import axiosClient from './axiosClient';

export const registerSchool = (data) => axiosClient.post('/auth/register-school', data);
export const login = (data) => axiosClient.post('/auth/login', data);
export const getMe = () => axiosClient.get('/auth/me');

export const getPendingSchools = (status) =>
  axiosClient.get('/superadmin/schools', { params: status ? { status } : {} });
export const approveSchool = (id) => axiosClient.patch(`/superadmin/schools/${id}/approve`);
export const rejectSchool = (id, reason) =>
  axiosClient.patch(`/superadmin/schools/${id}/reject`, { reason });
