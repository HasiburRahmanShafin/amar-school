import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as attendanceApi from '../../api/AttendanceApi';
import { api as studentApi } from '../../api/StudentApi';
import AdminLayout from '../../components/layout/AdminLayout';
 
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 border-red-300' },
];
 
function todayISO() {
  return new Date().toISOString().substring(0, 10);
}
 
export default function AttendanceCollection() {
  const [classes, setClasses] = useState([]); // [{className, section}]
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState(todayISO());
 
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
 
  // Build a distinct class/section list from the student roll — reuses the
  // existing /students endpoint rather than requiring a separate meta API.
  useEffect(() => {
    studentApi.get('/students').then((res) => {
      const list = res.data || [];
      const seen = new Map();
      list.forEach((s) => {
        const key = `${s.currentClass}|||${s.section}`;
        if (!seen.has(key)) seen.set(key, { className: s.currentClass, section: s.section });
      });
      const options = Array.from(seen.values()).sort((a, b) => a.className.localeCompare(b.className));
      setClasses(options);
      if (options.length > 0) {
        setClassName(options[0].className);
        setSection(options[0].section);
      }
    }).catch(() => {});
  }, []);
 
  const loadRoster = useCallback(() => {
    if (!className || !section || !date) return;
    setLoading(true);
    setMessage(null);
    attendanceApi
      .getClassAttendance({ class: className, section, date })
      .then((res) => setRoster(res.data.data))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load class roster' }))
      .finally(() => setLoading(false));
  }, [className, section, date]);
 
  useEffect(() => {
    loadRoster();
  }, [loadRoster]);
 
  const setStatus = (studentId, status) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  };
 
  const markAllPresent = () => {
    setRoster((prev) => prev.map((r) => ({ ...r, status: 'present' })));
  };
 
  const handleSave = async () => {
    const records = roster
      .filter((r) => r.status)
      .map((r) => ({ studentId: r.studentId, status: r.status }));
 
    if (records.length === 0) {
      setMessage({ type: 'error', text: 'Mark at least one student before saving.' });
      return;
    }
 
    setSaving(true);
    setMessage(null);
    try {
      const res = await attendanceApi.markAttendance({ class: className, section, date, records });
      setMessage({ type: 'success', text: res.data.message || 'Attendance saved' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };
 
  const markedCount = roster.filter((r) => r.status).length;
 
  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Collection</h1>
          <p className="text-sm text-slate-500 mt-1">Mark daily attendance for a class and section.</p>
        </div>
        <Link to="/admin/dashboard" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
 
      {message && (
        <div
          className={`mb-5 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}
 
      {/* Class / Section / Date picker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Class</label>
            <select
              value={`${className}|||${section}`}
              onChange={(e) => {
                const [c, s] = e.target.value.split('|||');
                setClassName(c);
                setSection(s);
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes.length === 0 && <option value="">No classes found</option>}
              {classes.map((c) => (
                <option key={`${c.className}|||${c.section}`} value={`${c.className}|||${c.section}`}>
                  {c.className} — Section {c.section}
                </option>
              ))}
            </select>
          </div>
 
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
 
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={markAllPresent}
              disabled={roster.length === 0}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40"
            >
              Mark all present
            </button>
          </div>
        </div>
      </div>
 
      {/* Roster */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">
            Roster — {className || '—'} ({section || '—'}) on {date}
          </h2>
          <span className="text-xs text-slate-400">{markedCount}/{roster.length} marked</span>
        </div>
 
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading roster…</div>
        ) : roster.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No active students found for this class/section.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {roster.map((r) => (
              <div key={r.studentId} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-400">
                    {r.studentCode} {r.rollNumber ? `· Roll ${r.rollNumber}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(r.studentId, opt.value)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        r.status === opt.value ? opt.color : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
 
        {roster.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
 