import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teacherApi } from '../../api/TeacherApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';
import { SkeletonRow } from '../../components/SkeletonCard';
import { useToast } from '../../components/Toast';

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDark, toggleDark] = useDarkMode();
  const { showToast } = useToast();

  const fetchTeachers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (departmentFilter) params.append('department', departmentFilter);
    teacherApi.get(`/teachers?${params}`)
      .then((res) => setTeachers(res.data))
      .catch((err) => showToast?.(err.message || 'Failed to load teachers', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, departmentFilter]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name}'s teacher profile? This cannot be undone.`)) return;
    try {
      await teacherApi.delete(`/teachers/${id}`);
      showToast('Teacher profile removed', 'success');
      fetchTeachers();
    } catch (err) {
      showToast(err.message || 'Failed to remove teacher', 'error');
    }
  };

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputStyle = isDark
    ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-500'
    : 'border-blue-200 focus:ring-blue-500';
  const rowHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-blue-50';
  const divider = isDark ? 'divide-gray-700' : 'divide-blue-50';

  const statusColors = {
    active: isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700',
    on_leave: isDark ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-700',
    inactive: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600',
  };

  return (
    <div className={`min-h-screen ${pageBg} py-8 px-6 transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton isDark={isDark} />
          <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${heading}`}>Teachers</h1>
          <Link
            to="/admin/teachers/new"
            className="bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            + New teacher
          </Link>
        </div>

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
            placeholder="Filter by department..."
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={`w-56 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-shadow duration-200 ${inputStyle}`}
          />
        </div>

        {!loading && teachers.length === 0 && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>No teachers found.</div>
        )}

        <div className={`border rounded-xl overflow-hidden divide-y ${cardBg} ${divider}`}>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} isDark={isDark} />)}

          {!loading &&
            teachers.map((t) => (
              <div key={t._id} className={`flex items-center justify-between px-5 py-4 transition-all duration-200 ${rowHover}`}>
                <Link to={`/admin/teachers/${t._id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
                  {t.photoUrl ? (
                    <img
                      src={t.photoUrl}
                      alt={t.name}
                      className={`w-10 h-10 rounded-full object-cover border flex-shrink-0 ${isDark ? 'border-gray-600' : 'border-blue-200'}`}
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                        isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {t.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`font-medium ${heading}`}>{t.name}</p>
                    <p className={`text-xs ${subText} truncate`}>
                      {t.teacherId} · {t.department} · {t.subjects?.join(', ')}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      t.userId
                        ? isDark ? 'bg-blue-950 text-blue-300' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}
                    title={t.userId ? 'Has login access' : 'No login account yet'}
                  >
                    {t.userId ? '🔑 Login' : 'No login'}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full capitalize ${statusColors[t.status] || statusColors.active}`}>
                    {t.status?.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => handleDelete(t._id, t.name)}
                    className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                      isDark ? 'text-red-400 hover:bg-red-950' : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
