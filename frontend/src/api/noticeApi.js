import axiosClient from './axiosClient';

// school_admin management
export const getMyNotices = () => axiosClient.get('/notices');
export const createNotice = (data) => axiosClient.post('/notices', data);
export const updateNotice = (id, data) => axiosClient.patch(`/notices/${id}`, data);
export const deleteNotice = (id) => axiosClient.delete(`/notices/${id}`);

// Shared feed for any logged-in dashboard (school_admin, teacher, student, parent)
export const getDashboardNotices = () => axiosClient.get('/notices/dashboard');

// Public - shown on the school website homepage
export const getPublicNotices = (subdomain) => axiosClient.get(`/notices/public/${subdomain}`);

// Uploads a notice attachment (image/PDF/doc) and returns its stored URL + name
export async function uploadNoticeAttachment(file) {
  const formData = new FormData();
  formData.append('attachment', file);
  const response = await axiosClient.post('/notices/attachment', formData);
  return response.data; // { attachmentUrl, attachmentName }
}
