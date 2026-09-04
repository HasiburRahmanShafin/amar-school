import { useEffect, useState } from 'react';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { useAuth } from '../../context/AuthContext';
import * as schoolApi from '../../api/schoolApi';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(empty)';
  return String(value);
}

export default function ProfileChangeRequests() {
  const { isDark } = useAuth();
  const [status, setStatus] = useState('pending');
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [actingId, setActingId] = useState(null);

  const card = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const label = isDark ? 'text-slate-300' : 'text-slate-600';

  const load = () => {
    setLoading(true);
    schoolApi
      .getPendingProfileChanges(status)
      .then((res) => setChanges(res.data))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load change requests' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleApprove = async (id) => {
    setActingId(id);
    setMessage(null);
    try {
      const res = await schoolApi.approveProfileChange(id);
      setMessage({ type: 'success', text: res.data.message });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to approve' });
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejecting this change (shown to the school admin):') || '';
    setActingId(id);
    setMessage(null);
    try {
      const res = await schoolApi.rejectProfileChange(id, reason);
      setMessage({ type: 'success', text: res.data.message });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reject' });
    } finally {
      setActingId(null);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>School Profile Change Requests</h1>
          <p className={`text-sm mt-1 ${label}`}>
            Sensitive fields (school name, EIIN, principal's name, address) require your approval before they go live.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
                status === s ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading && <p className={label}>Loading…</p>}
        {!loading && changes.length === 0 && <p className={label}>No {status} change requests.</p>}

        <div className="space-y-3">
          {changes.map((c) => (
            <div key={c._id} className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {c.school?.name} <span className="font-normal text-xs">({c.school?.eiin})</span>
                  </p>
                  <p className={`text-xs mt-1 ${label}`}>
                    Field: <strong>{c.field}</strong> · requested by {c.changedBy?.name} ({c.changedBy?.role})
                  </p>
                  <p className={`text-xs mt-2 ${label}`}>
                    "{formatValue(c.oldValue)}" → <span className="font-semibold">"{formatValue(c.newValue)}"</span>
                  </p>
                  <p className={`text-[11px] mt-1 ${label}`}>{new Date(c.createdAt).toLocaleString()}</p>
                  {c.reviewNote && <p className={`text-xs mt-1 italic ${label}`}>Note: {c.reviewNote}</p>}
                </div>

                {status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(c._id)}
                      disabled={actingId === c._id}
                      className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(c._id)}
                      disabled={actingId === c._id}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
