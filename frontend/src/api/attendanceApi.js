import axiosClient from './axiosClient';

// Teacher: fetch the roster + today's (or any day's) marks for one class/section
export const getClassRegister = (params) => axiosClient.get('/attendance', { params });

// Teacher: submit/update a day's attendance
export const markAttendance = (data) => axiosClient.post('/attendance', data);

// Student (self) / parent / admin / teacher: attendance history + percentage
export const getStudentHistory = (studentId, params) =>
  axiosClient.get(`/attendance/student/${studentId}`, { params });
