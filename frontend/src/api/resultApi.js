import axiosClient from './axiosClient';

// Get teacher assigned classes & subjects
export const getTeacherClasses = () => axiosClient.get('/results/teacher/classes');

// Get mark entry sheet for exam, class, section, subject
export const getMarkEntrySheet = (params) => axiosClient.get('/results/mark-sheet', { params });

// Save or submit mark entry sheet
export const saveMarkEntrySheet = (data) => axiosClient.post('/results/mark-sheet', data);

// Admin overview of mark sheets across classes and exams
export const getAdminResultOverview = (params) => axiosClient.get('/results/admin/overview', { params });

// Admin update sheet status (approve, reject, publish)
export const updateResultStatus = (id, data) => axiosClient.patch(`/results/${id}/status`, data);

// Bulk publish results
export const publishAllExamResults = (data) => axiosClient.post('/results/publish-all', data);

// Get student/parent published results
export const getStudentResults = (params) => axiosClient.get('/results/student', { params });

// Get detailed report card data
export const getReportCardData = (params) => axiosClient.get('/results/report-card', { params });
