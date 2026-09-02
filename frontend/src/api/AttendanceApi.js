import axiosClient from './axiosClient';
 
// Get the class roster joined with today's (or any date's) attendance status
export const getClassAttendance = (params) => axiosClient.get('/attendance/class', { params });
 
// Save/overwrite attendance for a whole class on a given date
export const markAttendance = (data) => axiosClient.post('/attendance/mark', data);
 
// Per-student attendance percentage summary for a class over a date range
export const getClassSummary = (params) => axiosClient.get('/attendance/summary', { params });
 