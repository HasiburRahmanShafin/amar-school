import axiosClient from './axiosClient';

// Admin: fee structure setup
export const setFeeForStudent = (data) => axiosClient.post('/fees', data);
export const listFees = (params) => axiosClient.get('/fees', { params });

// Student (self) / parent / admin: view a student's fee ledger
export const getStudentFees = (studentId) => axiosClient.get(`/fees/student/${studentId}`);

// Student (self) / parent: pay online (mock payment gateway)
export const payFee = (feeId, data) => axiosClient.post(`/fees/${feeId}/pay`, data);

// Fetch a specific digital receipt
export const getReceipt = (feeId, transactionId) =>
  axiosClient.get(`/fees/${feeId}/receipt/${transactionId}`);
