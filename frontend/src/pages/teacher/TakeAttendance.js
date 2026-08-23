import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as attendanceApi from '../../api/attendanceApi';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', className: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'absent', label: 'Absent', className: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'late', label: 'Late', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
];

const todayISO = () => new Date().toISOString().substring(0, 10);

function TakeAttendance() {
  const { user } = useAuth();

  const [classes, setClasses] = useState([]);
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [statuses, setStatuses] = useState({}); // studentId -> 'present' | 'absent' | 'late'
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // The teacher's assigned classes come back as [{ className, section }];
  // combine them into a single "className|section" value for the <select>.
  useEffect(() => {
    attendanceApi
      .getMyClasses()
      .then((res) => {
        setClasses(res.data);
        if (res.data.length > 0) {
          setSelectedClassKey(`${res.data[0].className}|${res.data[0].section}`);
        }
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load your classes' }));
  }, []);

  const [selectedClassName, selectedSection] = useMemo(
    () => (selectedClassKey ? selectedClassKey.split('|') : ['', '']),
    [selectedClassKey]
  );

  const loadRosterAndExisting = () => {
    if (!selectedClassName || !selectedSection || !date) return;
    setLoadingRoster(true);
    setMessage(null);

    Promise.all([
      attendanceApi.getClassRoster(selectedClassName, selectedSection),
      attendanceApi.getClassAttendanceByDate(selectedClassName, selectedSection, date),
    ])
      .then(([rosterRes, existingRes]) => {
        setRoster(rosterRes.data);

        const existing = existingRes.data;
        setAlreadySubmitted(Boolean(existing));

        // Pre-fill with whatever was already submitted for the day (so the
        // teacher can review/correct it); default everyone else to Present.
        const nextStatuses = {};
        rosterRes.data.forEach((student) => {
          const existingRecord = existing?.records?.find((r) => r.student._id === student._id || r.student === student._id);
          nextStatuses[student._id] = existingRecord ? existingRecord.status : 'present';
        });
        setStatuses(nextStatuses);
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load roster' }))
      .finally(() => setLoadingRoster(false));
  };

  useEffect(() => {
    loadRosterAndExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassName, selectedSection, date]);

  const setStudentStatus = (studentId, status) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAllAs = (status) => {
    const next = {};
    roster.forEach((student) => {
      next[student._id] = status;
    });
    setStatuses(next);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const records = roster.map((student) => ({ student: student._id, status: statuses[student._id] || 'present' }));
      await attendanceApi.markAttendance({ className: selectedClassName, section: selectedSection, date, records });
      setAlreadySubmitted(true);
      setMessage({ type: 'success', text: 'Attendance saved. Percentages and history are updated for these students.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };

  const presentCount = roster.filter((s) => statuses[s._id] === 'present').length;
  const absentCount = roster.filter((s) => statuses[s._id] === 'absent').length;
  const lateCount = roster.filter((s) => statuses[s._id] === 'late').length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Take Attendance</h1>
        <p className="text-sm text-gray-500">{user?.name}, mark today's roll call for your assigned class.</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-3 rounded text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded shadow p-6 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            value={selectedClassKey}
            onChange={(e) => setSelectedClassKey(e.target.value)}
            className="border rounded px-3 py-2 min-w-[220px]"
          >
            {classes.length === 0 && <option value="">No classes assigned</option>}
            {classes.map((c) => (
              <option key={`${c.className}|${c.section}`} value={`${c.className}|${c.section}`}>
                Class {c.className} - {c.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex gap-2 ml-auto text-sm">
          <button onClick={() => markAllAs('present')} className="px-3 py-2 rounded border">
            Mark all Present
          </button>
        </div>
      </div>

      {alreadySubmitted && (
        <div className="mb-4 p-3 rounded text-sm bg-blue-50 text-blue-700">
          Attendance was already submitted for this date - editing and re-saving will update it.
        </div>
      )}

      {loadingRoster ? (
        <div className="text-sm text-gray-500">Loading roster...</div>
      ) : roster.length === 0 ? (
        <div className="text-sm text-gray-500">No students found for this class/section.</div>
      ) : (
        <>
          <div className="bg-white rounded shadow divide-y mb-4">
            {roster.map((student) => (
              <div key={student._id} className="p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">{student.name}</p>
                  {student.studentInfo?.roll && (
                    <p className="text-xs text-gray-400">Roll: {student.studentInfo.roll}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStudentStatus(student._id, opt.value)}
                      className={`text-sm px-3 py-1.5 rounded border ${
                        statuses[student._id] === opt.value ? opt.className : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {presentCount} present &middot; {absentCount} absent &middot; {lateCount} late &middot; {roster.length} total
            </p>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {saving ? 'Saving...' : alreadySubmitted ? 'Update Attendance' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TakeAttendance;
