import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { teacherApi } from '../../api/TeacherApi';
import * as examApi from '../../api/examApi';
import * as resultApi from '../../api/resultApi';
import TeacherLayout from '../../components/layout/TeacherLayout';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [profRes, classRes, examRes] = await Promise.all([
          teacherApi.get('/teachers/me').catch(() => ({ data: null })),
          resultApi.getTeacherClasses().catch(() => ({ data: { assignedClasses: [] } })),
          examApi.getExams().catch(() => ({ data: { data: [] } })),
        ]);

        setProfile(profRes.data);
        setAssignedClasses(classRes.data?.assignedClasses || []);
        setExams(examRes.data?.data || []);
      } catch (err) {
        console.error('Failed to load teacher dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2 border border-white/20">
                Staff Dashboard · {profile?.department || 'Academic Faculty'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Staff ID: <span className="font-mono font-bold text-white">{profile?.teacherId || 'TCH-2026'}</span> · Manage your mark sheets, examine student routines, and track academic results.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/teacher/marks"
                id="enter-marks-quick-btn"
                className="px-5 py-3 rounded-xl bg-white text-slate-800 font-bold text-xs shadow-lg hover:bg-slate-100 transition-all hover:scale-105 active:scale-95"
              >
                📝 Enter Subject Marks
              </Link>
            </div>
          </div>
          {/* Decorative background glow */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold shadow-inner">
              📚
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Assigned Classes</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                {assignedClasses.length}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl font-bold shadow-inner">
              🎯
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Subjects</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                {profile?.subjects?.length || 1}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-bold shadow-inner">
              📋
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Active Exams</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                {exams.filter((e) => e.status === 'published' || e.status === 'ongoing').length}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold shadow-inner">
              ✅
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Faculty Status</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 capitalize mt-0.5">
                {profile?.status || 'Active'}
              </h3>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Assigned Classes & Quick Mark Entry */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    My Teaching Schedule & Assigned Classes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Classes and subjects assigned to your faculty profile
                  </p>
                </div>
                <Link
                  to="/teacher/marks"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open Mark Entry →
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                  Loading schedule…
                </div>
              ) : assignedClasses.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No specific classes assigned yet. Contact your school administrator to configure your teaching schedule.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assignedClasses.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shadow-sm">
                          {item.class || item.className || 'C'}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            Class {item.class || item.className} · Section {item.section || 'All'}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Subject: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{item.subject || 'All Subjects'}</span>
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/teacher/marks"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                      >
                        Enter Marks
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/teacher/marks"
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                  📝
                </div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Mark Entry Sheets</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload theory and practical marks with auto GPA-5 calculation and attendance records.
                </p>
              </Link>

              <Link
                to="/student/exam-routine"
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                  📅
                </div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Examination Schedules</h3>
                <p className="text-xs text-slate-500 mt-1">
                  View synchronized exam dates, invigilation duties, and routines across classes.
                </p>
              </Link>
            </div>
          </div>

          {/* Right Column: Faculty Profile Summary & Active Exams */}
          <div className="space-y-6">
            {/* Faculty Bio Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Faculty Profile</h3>
                <Link
                  to="/teacher/profile"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Edit Profile
                </Link>
              </div>

              <div className="flex items-center gap-3.5">
                {profile?.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-800"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'T'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{profile?.name || user?.name}</h4>
                  <p className="text-xs text-slate-500">{profile?.department} · {profile?.teacherId}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{profile?.email || user?.email}</p>
                </div>
              </div>

              <div className="text-xs space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-medium">{profile?.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Qualifications:</span>
                  <span className="font-medium">{profile?.qualifications?.join(', ') || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subjects:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{profile?.subjects?.join(', ') || 'All'}</span>
                </div>
              </div>
            </div>

            {/* Active Exams Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Active Examinations</h3>
              {exams.length === 0 ? (
                <p className="text-xs text-slate-400">No examinations scheduled yet.</p>
              ) : (
                <div className="space-y-2">
                  {exams.slice(0, 3).map((ex) => (
                    <div
                      key={ex._id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{ex.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ex.status === 'published' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {ex.status}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {ex.academicTerm} · {new Date(ex.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </TeacherLayout>
  );
}
