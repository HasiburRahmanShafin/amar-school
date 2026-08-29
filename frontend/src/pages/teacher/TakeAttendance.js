import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherApi } from '../../api/TeacherApi';
import * as attendanceApi from '../../api/attendanceApi';
import { useAuth } from '../../context/AuthContext';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'emerald' },
  { value: 'absent', label: 'Absent', color: 'red' },
  { value: 'late', label: 'Late', color: 'amber' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TakeAttendance() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [isDark, toggleDark] = useDarkMode();

  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState('');
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState({}); // studentId -> status
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    teacherApi
      .get('/teachers/me')
      .then((res) => setAssignedClasses(res.data.assignedClasses || []))
      .catch(() => setMessage({ type: 'error', text: 'Could not load your assigned classes.' }));
  }, []);

  const selected = useMemo(
    () => (selectedIdx === '' ? null : assignedClasses[selectedIdx]),
    [selectedIdx, assignedClasses]
  );

  useEffect(() => {
    if (!selected) {
      setRoster([]);
      return;
    }
    setLoadingRoster(true);
    setMessage(null);
    attendanceApi
      .getClassRegister({ class: selected.class, section: selected.section, date })
      .then((res) => {
        setRoster(res.data.roster);
        setAlreadyTaken(res.data.alreadyTaken);
        const initialMarks = {};
        res.data.roster.forEach((r) => {
          if (r.status) initialMarks[r.studentId] = r.status;
        });
        setMarks(initialMarks);
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load class roster.' }))
      .finally(() => setLoadingRoster(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, date]);

  const setMark = (studentId, status) => setMarks((prev) => ({ ...prev, [studentId]: status }));

  const markAllPresent = () => {
    const next = {};
    roster.forEach((r) => { next[r.studentId] = 'present'; });
    setMarks(next);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const records = roster
      .filter((r) => marks[r.studentId])
      .map((r) => ({ studentId: r.studentId, status: marks[r.studentId] }));

    if (records.length !== roster.length) {
      setMessage({ type: 'error', text: 'Please mark every student before submitting.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await attendanceApi.markAttendance({ class: selected.class, section: selected.section, date, records });
      setAlreadyTaken(true);
      setMessage({ type: 'success', text: 'Attendance saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save attendance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-gray-500';
  const btnBorder = isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-blue-300 text-blue-700 hover:bg-blue-50';
  const inputCls = `border rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`;

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/teacher/dashboard" className="text-sm text-indigo-500 hover:underline">&larr; Dashboard</Link>
            <h1 className={`text-2xl font-bold mt-1 ${heading}`}>Take Attendance</h1>
            <p className={`text-sm ${subText}`}>Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
            <button
              onClick={() => { logoutUser(); navigate('/login'); }}
              className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${btnBorder}`}
            >
              Log out
            </button>
          </div>
        </div>

        <div className={`border rounded-xl p-6 mb-6 ${cardBg}`}>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className={`block text-xs font-medium mb-1 ${subText}`}>Class / Section</label>
              <select
                id="attendance-class-select"
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(e.target.value)}
                className={inputCls}
              >
                <option value="">Select a class…</option>
                {assignedClasses.map((c, i) => (
                  <option key={i} value={i}>{c.class}-{c.section} ({c.subject})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${subText}`}>Date</label>
              <input
                id="attendance-date-input"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            {roster.length > 0 && (
              <button
                onClick={markAllPresent}
                className={`text-sm font-medium px-4 py-2 rounded-lg border ${btnBorder}`}
              >
                Mark all Present
              </button>
            )}
          </div>

          {alreadyTaken && (
            <p className="text-xs mt-3 text-amber-500">
              Attendance for this class/date was already submitted - saving again will update it.
            </p>
          )}
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {!selected && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>
            Select one of your assigned classes above to take attendance.
          </div>
        )}

        {selected && loadingRoster && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>Loading roster…</div>
        )}

        {selected && !loadingRoster && roster.length === 0 && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>
            No active students found in {selected.class}-{selected.section}.
          </div>
        )}

        {selected && !loadingRoster && roster.length > 0 && (
          <div className={`border rounded-xl overflow-hidden divide-y ${cardBg} ${isDark ? 'divide-gray-700' : 'divide-blue-100'}`}>
            {roster.map((r) => (
              <div key={r.studentId} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className={`font-medium text-sm ${heading}`}>{r.name}</p>
                  <p className={`text-xs ${subText}`}>{r.studentCode}{r.rollNumber ? ` · Roll ${r.rollNumber}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = marks[r.studentId] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setMark(r.studentId, opt.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                          ${active
                            ? opt.color === 'emerald' ? 'bg-emerald-600 text-white border-emerald-600'
                              : opt.color === 'red' ? 'bg-red-600 text-white border-red-600'
                              : 'bg-amber-500 text-white border-amber-500'
                            : isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && !loadingRoster && roster.length > 0 && (
          <button
            id="submit-attendance-btn"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full mt-6 py-3 text-sm rounded-xl"
          >
            {submitting ? 'Saving…' : alreadyTaken ? 'Update Attendance' : 'Save Attendance'}
          </button>
        )}
      </div>
    </div>
  );
}
