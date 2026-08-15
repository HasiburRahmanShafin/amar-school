import axiosClient from './axiosClient';

export const getMyGallery = () => axiosClient.get('/gallery');
export const addGalleryImage = (data) => axiosClient.post('/gallery', data);
export const deleteGalleryImage = (id) => axiosClient.delete(`/gallery/${id}`);

export const getPublicGallery = (subdomain) => axiosClient.get(`/gallery/public/${subdomain}`);
