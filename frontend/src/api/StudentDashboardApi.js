const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('amarSchoolToken');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const getDashboardSummary = () => request('/student-dashboard/summary');
export const getStudyMaterials = () => request('/student-dashboard/study-materials');

// Starts an SSLCommerz checkout for one fee; returns { data: { gatewayUrl, tranId } }.
// The fee is only marked paid once SSLCommerz's callback validates the payment
// server-side - the caller should redirect the browser to gatewayUrl on success.
export const payFeeOnline = (feeId) => request(`/student-dashboard/fees/${feeId}/pay/initiate`, { method: 'POST', body: '{}' });
