import axios from 'axios';

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
});

// Attach the JWT (if we have one) to every outgoing request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('amarSchoolToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
