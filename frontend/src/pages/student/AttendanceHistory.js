import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import * as attendanceApi from '../../api/attendanceApi';
import { useDarkMode } from '../../components/DarkModeToggle';

const RANGES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'term', label: 'Term' },
];

const STATUS_STYLE = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
};

export default function AttendanceHistory() {
  const [isDark] = useDarkMode();
  const [studentId, setStudentId] = useState(null);
  const [range, setRange] = useState('month');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students/me').then((res) => setStudentId(res.data._id)).catch(() => setError('Could not load your profile.'));
  }, []);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError('');
    attendanceApi
      .getStudentHistory(studentId, { range })
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load attendance history.'))
      .finally(() => setLoading(false));
  }, [studentId, range]);

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-2xl mx-auto">
        <Link to="/student/dashboard" className="text-sm text-indigo-500 hover:underline">&larr; Dashboard</Link>
        <h1 className={`text-2xl font-bold mt-2 mb-1 ${heading}`}>Attendance History</h1>
        <p className={`text-sm mb-6 ${subText}`}>Track your regularity by day, week, month, or term.</p>

        <div className="flex gap-2 mb-6">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                range === r.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {loading && <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>Loading…</div>}

        {!loading && summary && (
          <>
            <div className={`border rounded-xl p-6 mb-6 grid grid-cols-3 gap-4 text-center ${cardBg}`}>
              <div>
                <p className={`text-2xl font-bold ${heading}`}>{summary.attendancePercentage ?? '—'}{summary.attendancePercentage !== null ? '%' : ''}</p>
                <p className={`text-xs ${subText}`}>Attendance</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${heading}`}>{summary.presentCount}</p>
                <p className={`text-xs ${subText}`}>Present / Late</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${heading}`}>{summary.absentCount}</p>
                <p className={`text-xs ${subText}`}>Absent</p>
              </div>
            </div>

            {summary.isIrregular && (
              <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-amber-50 text-amber-700 border border-amber-200">
                ⚠️ Irregular attendance detected - 5 or more consecutive absent days. A notification has been sent to your guardian's email.
              </div>
            )}

            {summary.days.length === 0 ? (
              <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>No attendance recorded for this period yet.</div>
            ) : (
              <div className={`border rounded-xl overflow-hidden divide-y ${cardBg} ${isDark ? 'divide-gray-700' : 'divide-blue-100'}`}>
                {[...summary.days].reverse().map((d) => (
                  <div key={d.date} className="flex items-center justify-between px-5 py-3">
                    <span className={`text-sm ${heading}`}>{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[d.status]}`}>{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
