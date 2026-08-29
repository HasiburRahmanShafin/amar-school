import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/StudentDashboardApi';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  const [checkDate, setCheckDate] = useState('');
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.get('/student-dashboard/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const fetchMaterials = () => {
    setMaterialsLoading(true);
    api.get('/student-dashboard/study-materials')
      .then((res) => setMaterials(res.data))
      .catch(() => setMaterials([]))
      .finally(() => setMaterialsLoading(false));
  };

  useEffect(() => {
    fetchData();
    fetchMaterials();
  }, []);

  const handlePayFee = async (feeId) => {
    await api.patch(`/student-dashboard/fees/${feeId}/pay`, {});
    fetchData();
  };

  const handleCheckAttendance = async (e) => {
    e.preventDefault();
    if (!checkDate) return;
    setCheckingAttendance(true);
    setAttendanceResult(null);
    try {
      const res = await api.get(`/student-dashboard/attendance?date=${checkDate}`);
      setAttendanceResult(res.data);
    } catch (err) {
      setAttendanceResult({ status: 'error', message: err.message });
    } finally {
      setCheckingAttendance(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-blue-600">Loading dashboard…</div>;
  if (error) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-red-500">{error}</div>;

  const { student, routine, attendanceSummary, recentExams, pendingAssignments, feeHistory } = data;

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-700 text-white rounded-xl px-6 py-5 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{student.name}</h1>
            <p className="text-blue-100 text-sm">{student.studentId} · Class {student.currentClass}-{student.section}</p>
          </div>
          <Link
            to="/student/exam-routine"
            className="bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            View Exam Routine
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-blue-100 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Attendance</p>
            <p className="text-3xl font-bold text-blue-900">{attendanceSummary.percentage}%</p>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Pending Assignments</p>
            <p className="text-3xl font-bold text-blue-900">{pendingAssignments.length}</p>
          </div>
        </div>

        <Section title="Check Attendance for a Specific Date">
          <form onSubmit={handleCheckAttendance} className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Select date</label>
              <input
                type="date"
                required
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
                className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={checkingAttendance}
              className="bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {checkingAttendance ? 'Checking...' : 'Check'}
            </button>
          </form>

          {attendanceResult && (
            <div className="text-sm">
              {attendanceResult.status === 'error' ? (
                <p className="text-red-500">{attendanceResult.message}</p>
              ) : attendanceResult.status === 'no record for this date' ? (
                <p className="text-gray-400">No attendance record found for {checkDate}.</p>
              ) : (
                <p>
                  On <strong>{checkDate}</strong>, status was:{' '}
                  <span className={attendanceResult.status === 'present' ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>
                    {attendanceResult.status}
                  </span>
                </p>
              )}
            </div>
          )}
        </Section>

        <Section title="Today's / Weekly Routine">
          {routine.length === 0 ? (
            <EmptyState text="No routine published yet." />
          ) : (
            <div className="divide-y divide-blue-50">
              {routine.map((r) => (
                <div key={r._id} className="py-3">
                  <p className="text-sm font-semibold text-blue-900 mb-1">{r.dayOfWeek}</p>
                  {r.periods.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600 pl-2">
                      <span>{p.subject} {p.teacherName ? `— ${p.teacherName}` : ''}</span>
                      <span>{p.startTime} - {p.endTime}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Recent Exam Results">
          {recentExams.length === 0 ? (
            <EmptyState text="No exam results published yet." />
          ) : (
            <div className="divide-y divide-blue-50">
              {recentExams.map((e) => (
                <div key={e._id} className="flex justify-between py-2 text-sm">
                  <span className="text-blue-900">{e.examName} — {e.subject}</span>
                  <span className="font-medium text-gray-700">{e.marksObtained}/{e.totalMarks}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Pending Assignments">
          {pendingAssignments.length === 0 ? (
            <EmptyState text="No pending assignments." />
          ) : (
            <div className="divide-y divide-blue-50">
              {pendingAssignments.map((a) => (
                <div key={a._id} className="py-2">
                  <p className="text-sm font-medium text-blue-900">{a.title} ({a.subject})</p>
                  <p className="text-xs text-gray-500">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Study Materials">
          {materialsLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
          ) : materials.length === 0 ? (
            <EmptyState text="No study materials shared yet." />
          ) : (
            <div className="divide-y divide-blue-50">
              {materials.map((m) => (
                <div key={m._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-blue-900">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.subject} {m.description ? `· ${m.description}` : ''}</p>
                  </div>
                  {m.fileUrl ? (
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 flex-shrink-0"
                    >
                      Download
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Fee Payment History">
          {feeHistory.length === 0 ? (
            <EmptyState text="No fee records yet." />
          ) : (
            <div className="divide-y divide-blue-50">
              {feeHistory.map((f) => (
                <div key={f._id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-blue-900 font-medium">{f.feeType}</p>
                    <p className="text-xs text-gray-500">Due: {new Date(f.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-700">৳{f.amount}</span>
                    {f.status === 'paid' ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Paid</span>
                    ) : (
                      <button
                        onClick={() => handlePayFee(f._id)}
                        className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800"
                      >
                        Pay now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-gray-400 py-4 text-center">{text}</p>;
}
