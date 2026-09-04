import axiosClient from './axiosClient';

export const getPlans = () => axiosClient.get('/subscription/plans');
export const getMySubscription = () => axiosClient.get('/subscription/my');

export const upgradePlan = (plan) => axiosClient.post('/subscription/upgrade', { plan });
export const downgradePlan = (plan) => axiosClient.post('/subscription/downgrade', { plan });
export const cancelScheduledDowngrade = () => axiosClient.post('/subscription/downgrade/cancel');
export const renewManually = () => axiosClient.post('/subscription/renew');

export const getInvoices = () => axiosClient.get('/subscription/invoices');

// Streams a PDF back, so this goes through fetch directly (same pattern as
// financialApi's exports) rather than axios, to let the Content-Disposition
// header trigger a browser download.
export const downloadInvoicePdf = (invoiceId, invoiceNumber) => {
  const token = localStorage.getItem('amarSchoolToken');
  const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  return fetch(`${base}/subscription/invoices/${invoiceId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error('Failed to download invoice');
      return res.blob();
    })
    .then((blob) => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${invoiceNumber || 'invoice'}.pdf`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    });
};
