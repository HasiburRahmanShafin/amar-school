import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';
import { SkeletonRow } from '../../components/SkeletonCard';
import EnrollmentChart from '../../components/EnrollmentChart';
import { useToast } from '../../components/Toast';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDark, toggleDark] = useDarkMode();
  const { showToast } = useToast();

  const fetchStudents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (classFilter) params.append('currentClass', classFilter);
    api.get(`/students?${params}`)
      .then((res) => setStudents(res.data))
      .catch((err) => showToast?.(err.message || 'Failed to load students', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, classFilter]);

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputStyle = isDark
    ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-500'
    : 'border-blue-200 focus:ring-blue-500';
  const rowHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-50';
  const divider = isDark ? 'divide-gray-700' : 'divide-blue-50';

  return (
    <div className={`min-h-screen ${pageBg} py-8 px-6 transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton />
          <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${heading}`}>Students</h1>
          <div className="flex gap-2">
            <Link
              to="/admin/students/promote"
              className={`text-sm font-medium px-4 py-2 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-blue-300 text-blue-700 hover:bg-blue-50'
              }`}
            >
              Promote class
            </Link>
            <Link
              to="/admin/students/new"
              className="bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              + New student
            </Link>
          </div>
        </div>

        <EnrollmentChart isDark={isDark} />

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-shadow duration-200 ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Filter by class..."
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={`w-48 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-shadow duration-200 ${inputStyle}`}
          />
        </div>

        {!loading && students.length === 0 && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>No students found.</div>
        )}

        <div className={`border rounded-xl overflow-hidden divide-y ${cardBg} ${divider}`}>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} isDark={isDark} />)}

          {!loading &&
            students.map((s) => (
              <Link
                key={s._id}
                to={`/admin/students/${s._id}`}
                className={`flex items-center justify-between px-5 py-4 transition-all duration-200 ${rowHover}`}
              >
                <div className="flex items-center gap-3">
                  {s.photoUrl ? (
                    <img
                      src={s.photoUrl}
                      alt={s.name}
                      className={`w-10 h-10 rounded-full object-cover border ${isDark ? 'border-gray-600' : 'border-blue-200'}`}
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {s.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className={`font-medium ${heading}`}>{s.name}</p>
                    <p className={`text-xs ${subText}`}>{s.studentId} · Class {s.currentClass}-{s.section}</p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full capitalize ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                  {s.status}
                </span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
