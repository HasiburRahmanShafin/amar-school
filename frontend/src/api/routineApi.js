import axiosClient from './axiosClient';

// school_admin / teacher management
export const getMyRoutines = (params) => axiosClient.get('/routines', { params });
export const getRoutineClasses = () => axiosClient.get('/routines/classes');
export const publishRoutine = (data) => axiosClient.post('/routines', data);
export const updateRoutine = (id, data) => axiosClient.patch(`/routines/${id}`, data);
export const deleteRoutine = (id) => axiosClient.delete(`/routines/${id}`);

// Shared feed for any logged-in dashboard (school_admin, teacher, student, parent)
export const getDashboardRoutine = (params) => axiosClient.get('/routines/dashboard', { params });

// Public - shown on the school website. Call with no params to get the
// list of classes that have a published routine; pass className/section
// to get that class's actual schedule.
export const getPublicRoutine = (subdomain, params) =>
  axiosClient.get(`/routines/public/${subdomain}`, { params });
