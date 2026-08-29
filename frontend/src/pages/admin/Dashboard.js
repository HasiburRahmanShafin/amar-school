import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import NoticesFeed from '../../components/NoticesFeed';
import RoutineFeed from '../../components/RoutineFeed';
import { api } from '../../api/StudentApi';
import { teacherApi } from '../../api/TeacherApi';

/* ── Stat Card ─────────────────────────────────── */
function StatCard({ label, value, icon, color, to }) {
  const { isDark } = useAuth();
  const card = (
    <div className={`stat-card p-5 rounded-2xl border flex items-center gap-4 cursor-pointer
      ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80'}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{value ?? '—'}</p>
        <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

/* ── Module Card ───────────────────────────────── */
function ModuleCard({ to, icon, title, desc, accent }) {
  const { isDark } = useAuth();
  return (
    <Link
      to={to}
      className={`module-card p-5 border flex flex-col gap-3
        ${isDark ? 'bg-slate-800/60 border-slate-700/60 hover:border-indigo-500/50' : 'bg-white border-slate-200/80 hover:border-indigo-300'}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
        <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
      </div>
    </Link>
  );
}

/* ── Dashboard ─────────────────────────────────── */
export default function Dashboard() {
  const { user, isDark } = useAuth();
  const [studentCount, setStudentCount] = useState(null);
  const [teacherCount, setTeacherCount] = useState(null);
  const [examCount, setExamCount] = useState(null);

  useEffect(() => {
    api.get('/students').then((r) => setStudentCount(r.data.length)).catch(() => {});
    teacherApi.get('/teachers').then((r) => setTeacherCount(r.data.length)).catch(() => {});
  }, []);

  const heading = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const sectionTitle = isDark ? 'text-slate-300' : 'text-slate-600';
  const divider = isDark ? 'border-slate-700/60' : 'border-slate-200/80';

  const statusColors = {
    active:  'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800',
    pending: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800',
    rejected:'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800',
  };

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${heading}`}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className={`text-sm ${subText}`}>{user?.school?.name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize
            ${statusColors[user?.school?.status] || statusColors.pending}`}>
            {user?.school?.status}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students" value={studentCount} icon="🎓" color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600" to="/admin/students" />
        <StatCard label="Total Teachers" value={teacherCount} icon="👨‍🏫" color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" to="/admin/teachers" />
        <StatCard label="Exam Schedules" value="Active" icon="📝" color="bg-purple-100 dark:bg-purple-900/40 text-purple-600" to="/admin/exams" />
        <StatCard label="Notices" value={null} icon="📢" color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" to="/admin/notices" />
      </div>

      {/* Quick modules */}
      <div className={`mb-8 pb-8 border-b ${divider}`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${sectionTitle}`}>Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <ModuleCard to="/admin/exams" icon="📝" title="Exam Schedules" desc="Manage terms, routines & make-ups" accent="bg-purple-100 dark:bg-purple-900/40 text-purple-600" />
          <ModuleCard to="/admin/routines" icon="📅" title="Class Routine" desc="Manage weekly timetables" accent="bg-teal-100 dark:bg-teal-900/40 text-teal-600" />
          <ModuleCard to="/admin/website-builder" icon="🌐" title="Website Builder" desc="Customize your public school page" accent="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
          <ModuleCard to="/admin/gallery" icon="🖼️" title="Photo Gallery" desc="Manage school photos" accent="bg-pink-100 dark:bg-pink-900/40 text-pink-600" />
          <ModuleCard to="/admin/notices" icon="📢" title="Notices" desc="Publish notices & events" accent="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
          <ModuleCard to="/admin/admissions/circulars" icon="📄" title="Admission" desc="Circulars & applicants" accent="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
        </div>
      </div>

      {/* Recent feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${sectionTitle}`}>Recent Notices</h2>
            <Link to="/admin/notices" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              View all →
            </Link>
          </div>
          <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80'}`}>
            <NoticesFeed />
          </div>
        </div>

        {/* Routine */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${sectionTitle}`}>Today's Routine</h2>
            <Link to="/admin/routines" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Manage →
            </Link>
          </div>
          <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80'}`}>
            <RoutineFeed />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
