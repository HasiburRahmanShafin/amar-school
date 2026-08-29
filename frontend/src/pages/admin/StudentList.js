import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { SkeletonRow } from '../../components/SkeletonCard';
import EnrollmentChart from '../../components/EnrollmentChart';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

export default function StudentList() {
  const [students, setStudents]       = useState([]);
  const [search, setSearch]           = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading]         = useState(true);
  const { showToast }                 = useToast();
  const { isDark }                    = useAuth();

  const fetchStudents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)      params.append('search', search);
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
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Students</h1>
          <p className={`text-sm mt-0.5 ${subText}`}>{students.length} total students</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/students/promote"
            className={`text-sm font-medium px-4 py-2.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5
              ${isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            Promote Class
          </Link>
          <Link
            to="/admin/students/new"
            id="add-student-btn"
            className="btn-primary text-sm px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Student
          </Link>
        </div>
      </div>

      {/* Chart */}
      <EnrollmentChart isDark={isDark} />

      {/* Filters */}
      <div className="flex gap-3 mb-5 mt-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <input
          type="text"
          placeholder="Filter by class…"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className={`${inputCls} w-44`}
        />
      </div>

      {/* Table */}
      {!loading && students.length === 0 && (
        <div className={`border rounded-2xl p-10 text-center ${cardBg} ${subText}`}>
          <p className="text-4xl mb-3">🎓</p>
          <p className="font-medium">No students found</p>
          <p className="text-xs mt-1">Try adjusting your search or{' '}
            <Link to="/admin/students/new" className="text-indigo-500 hover:underline">add a new student</Link>
          </p>
        </div>
      )}

      {(loading || students.length > 0) && (
        <div className={`border rounded-2xl overflow-hidden divide-y ${cardBg} ${divider}`}>
          {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} isDark={isDark} />)}

          {!loading && students.map((s) => (
            <Link
              key={s._id}
              to={`/admin/students/${s._id}`}
              className={`flex items-center justify-between px-5 py-3.5 transition-all duration-200 ${rowHover}`}
            >
              <div className="flex items-center gap-3">
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt={s.name}
                    className={`w-9 h-9 rounded-full object-cover border ${isDark ? 'border-slate-600' : 'border-slate-200'}`} />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold
                    ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                    {s.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className={`font-medium text-sm ${heading}`}>{s.name}</p>
                  <p className={`text-xs ${subText}`}>{s.studentId} · Class {s.currentClass}-{s.section}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize
                ${s.status === 'active'
                  ? isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                  : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {s.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
