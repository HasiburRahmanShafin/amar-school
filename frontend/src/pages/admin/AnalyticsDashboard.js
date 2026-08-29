import { useEffect, useState } from 'react';
import { api } from '../../api/AnalyticsApi';
import BackButton from '../../components/BackButton';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [enrollment, setEnrollment] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [examPerf, setExamPerf] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/enrollment-trends'),
      api.get(`/analytics/attendance-stats${classFilter ? `?class=${classFilter}` : ''}`),
      api.get(`/analytics/exam-performance${classFilter ? `?class=${classFilter}` : ''}`),
    ]).then(([s, e, a, ex]) => {
      setSummary(s.data);
      setEnrollment(e.data.map((d) => ({ label: `${d._id.month}/${d._id.year}`, count: d.count })));
      setAttendance(a.data.map((d) => ({ label: `${d.class}-${d.section}`, percentage: d.attendancePercentage })));
      setExamPerf(ex.data.map((d) => ({ subject: d.subject, avg: d.avgPercentage })));
    }).finally(() => setLoading(false));
  }, [classFilter]);

  if (loading) {
    return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-blue-600">Loading analytics…</div>;
  }

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        <BackButton />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Analytics Dashboard</h1>
          <input
            type="text"
            placeholder="Filter by class..."
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-48 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-blue-100 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Total Active Students</p>
            <p className="text-3xl font-bold text-blue-900">{summary?.totalStudents ?? 0}</p>
          </div>
          <div className="bg-white border border-blue-100 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Overall Attendance</p>
            <p className="text-3xl font-bold text-blue-900">{summary?.overallAttendance ?? 0}%</p>
          </div>
        </div>

        <div className="bg-white border border-blue-100 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wide">Enrollment Trend</h2>
          {enrollment.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No enrollment data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={enrollment}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-blue-100 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wide">Attendance by Class & Section</h2>
          {attendance.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No attendance data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Bar dataKey="percentage" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-blue-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wide">Subject-wise Exam Performance</h2>
          {examPerf.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No exam data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={examPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg" name="Average Score" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}