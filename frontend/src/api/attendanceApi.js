import axiosClient from './axiosClient';

// Teacher - class picker + roster + take/edit attendance
export const getMyClasses = () => axiosClient.get('/attendance/my-classes');
export const getClassRoster = (className, section) =>
  axiosClient.get('/attendance/roster', { params: { className, section } });
export const getClassAttendanceByDate = (className, section, date) =>
  axiosClient.get('/attendance/class', { params: { className, section, date } });
export const markAttendance = (data) => axiosClient.post('/attendance', data);

// Student / parent / teacher / school_admin - history view
// period: 'day' | 'week' | 'month' | 'term', or pass startDate/endDate for a custom range
export const getStudentAttendance = ({ studentId, period, startDate, endDate }) =>
  axiosClient.get('/attendance/history', { params: { studentId, period, startDate, endDate } });

// School admin - analytics dashboard
export const getAttendanceAnalytics = (days) =>
  axiosClient.get('/attendance/analytics', { params: days ? { days } : {} });
