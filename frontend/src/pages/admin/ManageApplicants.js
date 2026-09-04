import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle from '../../components/DarkModeToggle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

// NOTE: minimal placeholder standing in for Fahmida's Admission Management UI
// (see AdmissionList.js for context). Fully wired to the real
// /api/admissions/applicants endpoints, just not restyled/polished.
const STATUSES = ['pending', 'reviewed', 'approved', 'rejected'];

export default function ManageApplicants() {
  const [searchParams] = useSearchParams();
  const circularId = searchParams.get('circularId') || '';
  const [applicants, setApplicants] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { isDark, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const fetchApplicants = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (circularId) params.append('circularId', circularId);
    if (statusFilter) params.append('status', statusFilter);
    admissionApi.get(`/admissions/applicants?${params}`)
      .then((res) => setApplicants(res.data))
      .catch((err) => showToast?.(err.message || 'Failed to load applicants', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplicants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circularId, statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      await admissionApi.patch(`/admissions/applicants/${id}/status`, { status });
      showToast('Status updated', 'success');
      fetchApplicants();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const publishResult = async (id) => {
    try {
      await admissionApi.patch(`/admissions/applicants/${id}/publish-result`, {});
      showToast('Result published', 'success');
      fetchApplicants();
    } catch (err) {
      showToast(err.message || 'Failed to publish result', 'error');
    }
  };

  const pageBg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const heading = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputStyle = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-indigo-500'
    : 'border-indigo-200 focus:ring-indigo-500';
  const divider = isDark ? 'divide-slate-700' : 'divide-indigo-50';
  const statusColors = {
    pending: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600',
    reviewed: isDark ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-700',
    approved: isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700',
    rejected: isDark ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700',
  };

  return (
    <div className={`min-h-screen ${pageBg} py-8 px-6 transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton isDark={isDark} />
          <DarkModeToggle isDark={isDark} toggleDark={toggleTheme} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${heading}`}>Applicants</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 ${inputStyle}`}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {!loading && applicants.length === 0 && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>No applicants found.</div>
        )}

        <div className={`border rounded-xl overflow-hidden divide-y ${cardBg} ${divider}`}>
          {applicants.map((a) => (
            <div key={a._id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <p className={`font-medium ${heading}`}>{a.studentName}</p>
                <span className={`text-xs px-3 py-1 rounded-full capitalize ${statusColors[a.status]}`}>{a.status}</span>
              </div>
              <p className={`text-xs mb-3 ${subText}`}>
                Guardian: {a.guardianName} · {a.guardianPhone} · {a.guardianEmail}
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== a.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(a._id, s)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border capitalize ${
                      isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    Mark {s}
                  </button>
                ))}
                <button
                  onClick={() => publishResult(a._id)}
                  disabled={a.resultPublished}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-50"
                >
                  {a.resultPublished ? 'Result published' : 'Publish result'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
