import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';
import { useToast } from '../../components/Toast';

const STATUSES = ['pending', 'reviewed', 'approved', 'rejected'];
const STATUS_ICON = { pending: '⏳', reviewed: '👀', approved: '✅', rejected: '✖️' };

export default function ManageApplicants() {
  const [searchParams] = useSearchParams();
  const circularId = searchParams.get('circularId') || '';
  const [applicants, setApplicants] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDark, toggleDark] = useDarkMode();
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

  const stats = useMemo(() => {
    const counts = { pending: 0, reviewed: 0, approved: 0, rejected: 0 };
    applicants.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status] += 1; });
    return counts;
  }, [applicants]);

  const pageBg = isDark ? 'bg-gray-950' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100/80 shadow-sm';
  const heading = isDark ? 'text-gray-100' : 'text-blue-950';
  const subText = isDark ? 'text-gray-400' : 'text-slate-500';
  const inputStyle = isDark
    ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500'
    : 'bg-white border-blue-200 focus:ring-blue-500';
  const divider = isDark ? 'divide-gray-800' : 'divide-blue-50';
  const statusStyles = {
    pending: isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-slate-100 text-slate-600 border-slate-200',
    reviewed: isDark ? 'bg-amber-950/50 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200',
    approved: isDark ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: isDark ? 'bg-red-950/50 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
  };

  const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      {/* Gradient header banner */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 px-6 pt-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <BackButton isDark className="text-blue-100 hover:text-white" />
            <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Admissions</p>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
              <span>👥</span> Applicants
            </h1>
            <p className="text-blue-100/90 text-sm mt-1.5">Review submissions, update status, and publish results.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-10 pb-12">
        {/* Stat pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`rounded-2xl border p-4 text-left transition-all ${cardBg} ${statusFilter === s ? 'ring-2 ring-blue-500' : ''}`}
            >
              <span className="text-lg">{STATUS_ICON[s]}</span>
              <p className={`text-2xl font-extrabold mt-1 ${heading}`}>{stats[s]}</p>
              <p className={`text-[11px] font-medium capitalize mt-0.5 ${subText}`}>{s}</p>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className={`text-xs font-medium ${subText}`}>
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}{statusFilter ? ` · filtered by "${statusFilter}"` : ''}
          </p>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 ${inputStyle}`}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
            <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
            <p className={`text-sm ${subText}`}>Loading applicants…</p>
          </div>
        ) : applicants.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
            <div className="text-4xl mb-3">🗂️</div>
            <h3 className={`text-base font-bold ${heading}`}>No applicants found</h3>
            <p className={`text-xs mt-1 ${subText}`}>Applications will appear here as families apply.</p>
          </div>
        ) : (
          <div className={`rounded-2xl border overflow-hidden divide-y ${cardBg} ${divider}`}>
            {applicants.map((a) => (
              <div key={a._id} className="px-5 py-4 transition-colors hover:bg-blue-50/40 dark:hover:bg-gray-800/40">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    {initials(a.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`font-semibold text-sm ${heading}`}>{a.studentName}</p>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize flex items-center gap-1 ${statusStyles[a.status]}`}>
                        {STATUS_ICON[a.status]} {a.status}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${subText}`}>
                      Guardian: {a.guardianName} · {a.guardianPhone} · {a.guardianEmail}
                    </p>

                    {/* Uploaded documents */}
                    {a.documents && a.documents.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {a.documents.map((doc, i) => (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                              isDark ? 'border-gray-700 text-blue-300 hover:bg-gray-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            📄 {doc.label}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-[11px] italic mt-2 ${subText}`}>No documents uploaded.</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {STATUSES.filter((s) => s !== a.status).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(a._id, s)}
                          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border capitalize transition-colors ${
                            isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          Mark {s}
                        </button>
                      ))}
                      <button
                        onClick={() => publishResult(a._id)}
                        disabled={a.resultPublished}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
                      >
                        {a.resultPublished ? '✓ Result published' : 'Publish result'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
