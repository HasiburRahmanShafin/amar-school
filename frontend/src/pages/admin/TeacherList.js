import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teacherApi } from '../../api/TeacherApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { SkeletonRow } from '../../components/SkeletonCard';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  active:   { light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-900/40 text-emerald-400' },
  on_leave: { light: 'bg-amber-100 text-amber-700',     dark: 'bg-amber-900/40 text-amber-400'     },
  inactive: { light: 'bg-slate-100 text-slate-500',     dark: 'bg-slate-700 text-slate-400'        },
};

export default function TeacherList() {
  const [teachers, setTeachers]             = useState([]);
  const [search, setSearch]                 = useState('');
  const [departmentFilter, setDeptFilter]   = useState('');
  const [loading, setLoading]               = useState(true);
  const { showToast }                       = useToast();
  const { isDark }                          = useAuth();

  const fetchTeachers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)          params.append('search', search);
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

  const heading   = isDark ? 'text-white'     : 'text-slate-800';
  const subText   = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg    = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const inputCls  = `input-field border rounded-xl px-4 py-2.5 text-sm ${
    isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
  }`;
  const rowHover  = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
  const divider   = isDark ? 'divide-slate-700/60' : 'divide-slate-100';

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Teachers</h1>
          <p className={`text-sm mt-0.5 ${subText}`}>{teachers.length} total teachers</p>
        </div>
        <Link
          to="/admin/teachers/new"
          id="add-teacher-btn"
          className="btn-primary text-sm px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Teacher
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input type="text" placeholder="Search by name…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} w-full pl-9`} />
        </div>
        <input type="text" placeholder="Filter by department…" value={departmentFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className={`${inputCls} w-52`} />
      </div>

      {!loading && teachers.length === 0 && (
        <div className={`border rounded-2xl p-10 text-center ${cardBg} ${subText}`}>
          <p className="text-4xl mb-3">👨‍🏫</p>
          <p className="font-medium">No teachers found</p>
          <p className="text-xs mt-1">
            <Link to="/admin/teachers/new" className="text-indigo-500 hover:underline">Add your first teacher</Link>
          </p>
        </div>
      )}

      {(loading || teachers.length > 0) && (
        <div className={`border rounded-2xl overflow-hidden divide-y ${cardBg} ${divider}`}>
          {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} isDark={isDark} />)}

          {!loading && teachers.map((t) => (
            <div key={t._id} className={`flex items-center justify-between px-5 py-3.5 transition-all duration-200 ${rowHover}`}>
              <Link to={`/admin/teachers/${t._id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
                {t.photoUrl ? (
                  <img src={t.photoUrl} alt={t.name}
                    className={`w-9 h-9 rounded-full object-cover border flex-shrink-0 ${isDark ? 'border-slate-600' : 'border-slate-200'}`} />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                    ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`font-medium text-sm ${heading}`}>{t.name}</p>
                  <p className={`text-xs truncate ${subText}`}>{t.teacherId} · {t.department} · {t.subjects?.join(', ')}</p>
                </div>
              </Link>

              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  t.userId
                    ? isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`} title={t.userId ? 'Has login access' : 'No login account yet'}>
                  {t.userId ? '🔑 Login' : 'No login'}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize
                  ${isDark ? STATUS_BADGE[t.status]?.dark : STATUS_BADGE[t.status]?.light || ''}`}>
                  {t.status?.replace('_', ' ')}
                </span>
                <button
                  onClick={() => handleDelete(t._id, t.name)}
                  className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors
                    ${isDark ? 'text-red-400 hover:bg-red-950' : 'text-red-500 hover:bg-red-50'}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
