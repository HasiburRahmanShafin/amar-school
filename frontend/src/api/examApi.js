import axiosClient from './axiosClient';

// Get list of exams with optional filters (academicTerm, academicYear, examType, status, isMakeUp, className, search)
export const getExams = (params) => axiosClient.get('/exams', { params });

// Get single exam by ID
export const getExamById = (id) => axiosClient.get(`/exams/${id}`);

// Create a new exam schedule
export const createExam = (data) => axiosClient.post('/exams', data);

// Update an existing exam schedule
export const updateExam = (id, data) => axiosClient.patch(`/exams/${id}`, data);

// Toggle or update exam publish status
export const togglePublishExam = (id, status) => axiosClient.patch(`/exams/${id}/publish`, { status });

// Delete an exam schedule
export const deleteExam = (id) => axiosClient.delete(`/exams/${id}`);

// Add routine slot to exam
export const addRoutineSlot = (examId, slotData) => axiosClient.post(`/exams/${examId}/routines`, slotData);

// Update a routine slot in exam
export const updateRoutineSlot = (examId, slotId, slotData) => axiosClient.patch(`/exams/${examId}/routines/${slotId}`, slotData);

// Delete routine slot from exam
export const deleteRoutineSlot = (examId, slotId) => axiosClient.delete(`/exams/${examId}/routines/${slotId}`);

// Schedule make-up exam
export const scheduleMakeUpExam = (data) => axiosClient.post('/exams/makeup', data);

// Get personalized student exam routine
export const getStudentExamRoutine = (params) => axiosClient.get('/exams/student-routine', { params });

// Get metadata (terms, years, classes, examTypes)
export const getExamMeta = () => axiosClient.get('/exams/meta');
