import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export interface Circular {
  id: string;
  title: string;
  className: string;
  eligibilityCriteria: string;
  requiredDocuments: string[];
  applicationFee: number;
  seatsAvailable: number;
  applicationDeadline: string;
}

export interface DocumentUpload {
  name: string;
  url: string;
}

export async function fetchCirculars(schoolId: string): Promise<Circular[]> {
  const { data } = await api.get(`/schools/${schoolId}/circulars`);
  return data;
}

export async function submitApplication(payload: Record<string, unknown>) {
  const { data } = await api.post('/applications', payload);
  return data;
}

export async function fetchApplications(circularId: string, token: string, status?: string) {
  const { data } = await api.get(`/circulars/${circularId}/applications`, {
    params: status ? { status } : {},
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function reviewApplication(
  applicationId: string,
  decision: 'SHORTLISTED' | 'REJECTED',
  token: string
) {
  const { data } = await api.patch(
    `/applications/${applicationId}/review`,
    { decision },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function publishResults(circularId: string, admittedApplicationIds: string[], token: string) {
  const { data } = await api.post(
    `/circulars/${circularId}/publish-results`,
    { admittedApplicationIds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
