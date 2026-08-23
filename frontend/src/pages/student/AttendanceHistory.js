import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as attendanceApi from '../../api/attendanceApi';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'term', label: 'This Term' },
];

const STATUS_STYLES = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
};

// Used by both students (viewing their own record) and parents (viewing
// a child's record, passed in as `studentId`/`studentName`).
function AttendanceHistory({ studentId: studentIdProp, studentName }) {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const studentId = isParent ? studentIdProp : user?.id;

  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    attendanceApi
      .getStudentAttendance({ studentId, period })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load attendance history'))
      .finally(() => setLoading(false));
  }, [studentId, period]);

  if (isParent && !studentId) {
    return <div className="text-sm text-gray-500">Select a child to view their attendance.</div>;
  }

  return (
    <div className="bg-white rounded shadow p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="font-semibold">{studentName ? `${studentName}'s Attendance` : 'My Attendance'}</h2>
        <div className="flex gap-1 text-sm">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded border ${
                period === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded text-sm bg-red-100 text-red-700">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded bg-gray-50">
              <p className="text-xs text-gray-500">Attendance</p>
              <p className="text-xl font-bold">{data.summary.percentage === null ? '-' : `${data.summary.percentage}%`}</p>
            </div>
            <div className="p-3 rounded bg-green-50">
              <p className="text-xs text-gray-500">Present</p>
              <p className="text-xl font-bold text-green-700">{data.summary.presentCount}</p>
            </div>
            <div className="p-3 rounded bg-red-50">
              <p className="text-xs text-gray-500">Absent</p>
              <p className="text-xl font-bold text-red-700">{data.summary.absentCount}</p>
            </div>
            <div className="p-3 rounded bg-yellow-50">
              <p className="text-xs text-gray-500">Late</p>
              <p className="text-xl font-bold text-yellow-700">{data.summary.lateCount}</p>
            </div>
          </div>

          {data.history.length === 0 ? (
            <p className="text-sm text-gray-500">No attendance recorded for this period yet.</p>
          ) : (
            <div className="divide-y">
              {data.history
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.date} className="py-2 flex justify-between items-center text-sm">
                    <span>
                      {new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[entry.status]}`}>
                      {entry.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AttendanceHistory;
