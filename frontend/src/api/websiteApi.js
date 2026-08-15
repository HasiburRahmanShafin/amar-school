import axiosClient from './axiosClient';

export const getMySettings = () => axiosClient.get('/website/settings');
export const updateSettings = (data) => axiosClient.patch('/website/settings', data);

// Public - no auth header needed, but axiosClient sends one anyway if a
// token exists in localStorage, which is harmless since this route ignores it.
export const getPublicWebsite = (subdomain) => axiosClient.get(`/website/public/${subdomain}`);
