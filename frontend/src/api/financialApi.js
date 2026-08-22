import axiosClient from './axiosClient';

// Dashboard - accepts { startDate, endDate, className, feeType }
export const getFinancialSummary = (filters = {}) =>
  axiosClient.get('/financial/summary', { params: filters });

export const getTransactions = (filters = {}) =>
  axiosClient.get('/financial/transactions', { params: filters });

export const recordTransaction = (data) => axiosClient.post('/financial/transactions', data);

export const getFeeStructures = (academicYear) =>
  axiosClient.get('/financial/fee-structures', { params: { academicYear } });

export const upsertFeeStructure = (data) => axiosClient.post('/financial/fee-structures', data);

export const getMyTransactions = () => axiosClient.get('/financial/transactions/mine');

// Exports stream a file back, so these go through the browser directly
// rather than axios, to let the Content-Disposition header trigger a download.
const downloadWithFilters = (path, filters = {}) => {
  const token = localStorage.getItem('amarSchoolToken');
  const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
  const params = new URLSearchParams(filters).toString();
  const url = `${base}${path}${params ? `?${params}` : ''}`;

  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    })
    .then((blob) => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = path.includes('excel') ? 'financial-report.xlsx' : 'financial-report.pdf';
      link.click();
      window.URL.revokeObjectURL(link.href);
    });
};

export const exportExcel = (filters = {}) => downloadWithFilters('/financial/export/excel', filters);
export const exportPdf = (filters = {}) => downloadWithFilters('/financial/export/pdf', filters);
