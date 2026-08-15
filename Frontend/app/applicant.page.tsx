'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Applicant, ApplicantStatus } from '@/types/admission';

export default function ManageApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchApplicants = () => {
    setLoading(true);
    const query = filter ? `?status=${filter}` : '';
    api
      .get<{ data: Applicant[] }>(`/admissions/applicants${query}`)
      .then((res) => setApplicants(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(fetchApplicants, [filter]);

  const updateStatus = async (id: string, status: ApplicantStatus) => {
    await api.patch(`/admissions/applicants/${id}/status`, { status });
    fetchApplicants();
  };

  const publishResult = async (id: string) => {
    await api.patch(`/admissions/applicants/${id}/publish-result`, {});
    fetchApplicants();
  };

  const statusStyle = (status: string) =>
    ({
      pending: 'bg-yellow-50 text-yellow-700',
      reviewed: 'bg-blue-50 text-blue-600',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-gray-100 text-gray-500',
    }[status] || 'bg-gray-100 text-gray-500');

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Applicants</h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-blue-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading && <p className="text-blue-600">Loading…</p>}
        {!loading && applicants.length === 0 && (
          <div className="bg-white border border-blue-100 rounded-xl p-8 text-center text-blue-500">
            No applicants found.
          </div>
        )}

        <div className="grid gap-3">
          {applicants.map((a) => (
            <div key={a._id} className="bg-white border border-blue-100 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{a.studentName}</h3>
                  <p className="text-sm text-gray-500">
                    {typeof a.circularId === 'object' ? a.circularId.title : ''} · Guardian:{' '}
                    {a.guardianName} ({a.guardianPhone})
                  </p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusStyle(a.status)}`}>
                  {a.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-blue-50">
                {(['pending', 'reviewed', 'approved', 'rejected'] as ApplicantStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(a._id, s)}
                    disabled={a.status === s}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      a.status === s
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}

                {(a.status === 'approved' || a.status === 'rejected') && !a.resultPublished && (
                  <button
                    onClick={() => publishResult(a._id)}
                    className="ml-auto bg-blue-700 text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:bg-blue-800"
                  >
                    Publish result
                  </button>
                )}
                {a.resultPublished && (
                  <span className="ml-auto text-xs text-blue-500 font-medium">Result published</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
