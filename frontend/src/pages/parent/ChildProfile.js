import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import * as StudentDashboardApi from '../../api/StudentDashboardApi';

export default function ChildProfile() {
  const { isDark } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    StudentDashboardApi.getDashboardSummary()
      .then((res) => setSummary(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load child profile'))
      .finally(() => setLoading(false));
  }, []);

  const card = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const heading = isDark ? 'text-white' : 'text-slate-800';
  const sub = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${heading}`}>Child Profile</h1>
        <p className={`text-sm mt-0.5 ${sub}`}>View your child's academic progress</p>
      </div>

      {loading && <p className={`text-sm ${sub}`}>Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {summary && (
        <div className="space-y-5">
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h2 className={`font-semibold text-lg mb-1 ${heading}`}>{summary.student?.name}</h2>
            <p className={`text-sm ${sub}`}>{summary.student?.currentClass}{summary.student?.section ? ` — Section ${summary.student.section}` : ''}</p>
            <p className={`text-xs mt-1 ${sub}`}>Student ID: {summary.student?.studentId}</p>
          </div>

          <div className={`rounded-2xl border p-5 ${card}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${sub}`}>Attendance</h2>
            <p className={`text-3xl font-bold ${heading}`}>{summary.attendanceSummary?.percentage ?? 0}%</p>
            <p className={`text-xs mt-1 ${sub}`}>
              {summary.attendanceSummary?.presentDays ?? 0} of {summary.attendanceSummary?.totalDays ?? 0} days attended
            </p>
          </div>

          {summary.recentExams?.length > 0 && (
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${sub}`}>Recent Exam Results</h2>
              {summary.recentExams.map((r) => (
                <div key={r._id} className="flex justify-between text-sm mb-1">
                  <span className={heading}>{r.subject} — {r.examName}</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{r.marksObtained}/{r.maxMarks}</span>
                </div>
              ))}
            </div>
          )}

          {summary.feeHistory?.length > 0 && (
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${sub}`}>Fee History</h2>
              {summary.feeHistory.map((f) => (
                <div key={f._id} className="flex justify-between text-sm mb-1">
                  <span className={heading}>{f.title || f.type}</span>
                  <span className={f.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-500 font-semibold capitalize'}>
                    {f.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
