import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import * as StudentDashboardApi from '../../api/StudentDashboardApi';

const money = (amount) => `BDT ${Number(amount || 0).toLocaleString()}`;

const FEE_BADGE = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function ChildProfile() {
  const { isDark } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [payingFeeId, setPayingFeeId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return StudentDashboardApi.api
      .get('/student-dashboard/summary')
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.message || 'Failed to load child profile'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle the redirect back from SSLCommerz (?feePayment=success|failed|cancelled)
  useEffect(() => {
    const payment = searchParams.get('feePayment');
    if (!payment) return;

    const texts = {
      success: { type: 'success', text: 'Payment received! The fee has been marked as paid.' },
      failed: { type: 'error', text: "Payment failed or couldn't be verified. The fee is still pending - you can try again." },
      cancelled: { type: 'error', text: 'Payment was cancelled. The fee is still pending.' },
    };
    if (texts[payment]) {
      setMessage(texts[payment]);
      load();
    }

    const next = new URLSearchParams(searchParams);
    next.delete('feePayment');
    next.delete('reason');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePayOnline = async (fee) => {
    setPayingFeeId(fee._id);
    setMessage(null);
    try {
      const res = await StudentDashboardApi.payFeeOnline(fee._id);
      window.location.href = res.data.gatewayUrl;
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not start checkout' });
      setPayingFeeId(null);
    }
  };

  const card = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const heading = isDark ? 'text-white' : 'text-slate-800';
  const sub = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${heading}`}>Child Profile</h1>
        <p className={`text-sm mt-0.5 ${sub}`}>View your child's academic progress</p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

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

          <div className={`rounded-2xl border p-5 ${card}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${sub}`}>Fees & Payments</h2>
            {!summary.feeHistory?.length ? (
              <p className={`text-sm ${sub}`}>No fees have been added for your child yet. Once the school adds a fee, it will show up here with a Pay Online option.</p>
            ) : (
              <div className="space-y-3">
                {summary.feeHistory.map((f) => (
                  <div
                    key={f._id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                      isDark ? 'border-slate-700/60' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-medium ${heading}`}>{f.title || f.feeType}</p>
                      <p className={`text-xs mt-0.5 ${sub}`}>
                        {money(f.amount)} · Due {new Date(f.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${FEE_BADGE[f.status] || ''}`}>
                        {f.status}
                      </span>
                      {(f.status === 'pending' || f.status === 'overdue') && (
                        <button
                          onClick={() => handlePayOnline(f)}
                          disabled={payingFeeId === f._id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white whitespace-nowrap"
                        >
                          {payingFeeId === f._id ? 'Redirecting…' : 'Pay Online'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
