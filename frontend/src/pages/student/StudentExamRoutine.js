import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as examApi from '../../api/examApi';
import { api as studentApi } from '../../api/StudentApi';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Footer from '../../components/layout/Footer';

const EXAM_TYPE_STYLES = {
  term_exam: { label: 'Term Examination', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: '📝' },
  midterm: { label: 'Midterm Examination', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: '📊' },
  final_exam: { label: 'Final Examination', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: '🎓' },
  class_test: { label: 'Class Test', color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800', icon: '✏️' },
  makeup_exam: { label: 'Make-up Examination', color: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700', icon: '⚡' },
  model_test: { label: 'Model Test', color: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800', icon: '📋' },
  practical: { label: 'Practical / Lab Exam', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: '🔬' },
  other: { label: 'Exam', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: '📌' },
};

export default function StudentExamRoutine() {
  const { user, isDark } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Student identification & class selector
  const [currentClass, setCurrentClass] = useState('');
  const [section, setSection] = useState('All');
  const [studentId, setStudentId] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);

  // Exam routine data
  const [exams, setExams] = useState([]);
  const [meta, setMeta] = useState({ classes: [], academicTerms: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedTerm, setSelectedTerm] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Countdown timer state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, nextSubject: null, isFinished: true });

  // Load available meta classes & student profile
  const initStudentData = useCallback(async () => {
    try {
      const metaRes = await examApi.getExamMeta().catch(() => ({ data: { classes: [], academicTerms: [] } }));
      setMeta(metaRes.data || { classes: [], academicTerms: [] });

      if (user?.role === 'student' || user?.role === 'parent') {
        const routineRes = await examApi.getStudentExamRoutine({}).catch(() => ({ data: { data: [] } }));
        setExams(routineRes.data?.data || []);
        if (routineRes.data?.studentInfo) {
          const info = routineRes.data.studentInfo;
          if (info.className && info.className !== 'All Classes') setCurrentClass(info.className);
          if (info.section && info.section !== 'All Sections') setSection(info.section);
          if (info.studentId) setStudentId(info.studentId);
          setStudentProfile({
            name: info.name || user?.name,
            studentId: info.studentId,
            currentClass: info.className,
            section: info.section,
            rollNumber: info.rollNumber,
          });
        }
      } else {
        // If admin / teacher previewing
        if (user?.role === 'school_admin') {
          const studentRes = await studentApi.get('/students').catch(() => ({ data: [] }));
          const studentList = studentRes.data || [];
          if (studentList.length > 0) {
            const first = studentList[0];
            setStudentProfile(first);
            setCurrentClass(first.currentClass);
            setSection(first.section);
            setStudentId(first.studentId);
          }
        }
        if (metaRes.data?.classes?.length > 0) {
          setCurrentClass((prev) => prev || metaRes.data.classes[0].className);
          setSection((prev) => (prev && prev !== 'All' ? prev : metaRes.data.classes[0].section || 'All'));
        }
      }
    } catch (err) {
      console.error('Failed to init student exam data', err);
    }
  }, [user]);

  // Fetch personalized routines for current class & section
  const fetchRoutine = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const params = {};
      if (currentClass) params.className = currentClass;
      if (section && section !== 'All') params.section = section;
      if (studentId) params.studentId = studentId;
      if (selectedTerm !== 'ALL') params.academicTerm = selectedTerm;

      const res = await examApi.getStudentExamRoutine(params);
      setExams(res.data.data || []);
      if (res.data.studentInfo && (user?.role === 'student' || user?.role === 'parent')) {
        const info = res.data.studentInfo;
        setStudentProfile((prev) => ({
          ...prev,
          name: info.name || prev?.name || user?.name,
          studentId: info.studentId || prev?.studentId,
          currentClass: info.className !== 'All Classes' ? info.className : prev?.currentClass,
          section: info.section !== 'All Sections' ? info.section : prev?.section,
          rollNumber: info.rollNumber || prev?.rollNumber,
        }));
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch personalized exam routine', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [currentClass, section, studentId, selectedTerm, user]);

  useEffect(() => {
    initStudentData();
  }, [initStudentData]);

  useEffect(() => {
    if (currentClass && user?.role !== 'student' && user?.role !== 'parent') {
      fetchRoutine();
    }
  }, [currentClass, section, studentId, selectedTerm, fetchRoutine, user]);

  // Dynamic live auto-refresh every 30 seconds for instant synchronization
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRoutine(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRoutine]);

  // Collect all upcoming routine slots across published exams
  const allRoutineSlots = useMemo(() => {
    const slots = [];
    exams.forEach((exam) => {
      (exam.routines || []).forEach((r) => {
        const examDateObj = new Date(r.examDate);
        const [h = 0, m = 0] = (r.startTime || '09:00').split(':').map(Number);
        const slotDateTime = new Date(examDateObj.getFullYear(), examDateObj.getMonth(), examDateObj.getDate(), h, m);
        slots.push({
          ...r,
          slotDateTime,
          examTitle: exam.title,
          academicTerm: exam.academicTerm,
          examType: exam.examType,
          parentExamStatus: exam.status,
        });
      });
    });

    return slots.sort((a, b) => a.slotDateTime.getTime() - b.slotDateTime.getTime());
  }, [exams]);

  // Upcoming make-up slots specifically targeting this student or class
  const makeUpSlots = useMemo(() => {
    return allRoutineSlots.filter((r) => r.isMakeUp);
  }, [allRoutineSlots]);

  // Live countdown calculation to immediate next subject exam
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const upcoming = allRoutineSlots.find((s) => s.slotDateTime.getTime() > now);

      if (!upcoming) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, nextSubject: null, isFinished: true });
        return;
      }

      const diff = upcoming.slotDateTime.getTime() - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        nextSubject: upcoming,
        isFinished: false,
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [allRoutineSlots]);

  // Print Routine / Admit Card Slip
  const handlePrintAdmitSlip = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = allRoutineSlots
      .map(
        (s) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-weight: 600;">${s.subject} ${s.isMakeUp ? '<span style="color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Make-up</span>' : ''}</td>
          <td style="padding: 10px;">${new Date(s.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}</td>
          <td style="padding: 10px; font-family: monospace;">${s.startTime} – ${s.endTime}</td>
          <td style="padding: 10px;">${s.classroom || 'Main Hall'}</td>
          <td style="padding: 10px;">${s.totalMarks} (Pass: ${s.passMarks})</td>
          <td style="padding: 10px;">${s.invigilator || '—'}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Personalized Examination Routine - ${studentProfile?.name || currentClass}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
            .card { border: 2px solid #4f46e5; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 15px; }
            h1 { margin: 0 0 5px 0; color: #1e1b4b; font-size: 22px; }
            .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background-color: #4f46e5; color: white; padding: 10px; text-align: left; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
            .sign { border-top: 1px solid #94a3b8; width: 160px; text-align: center; padding-top: 5px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Amar School — Examination Admit Routine</h1>
              <p style="margin: 0; color: #64748b; font-size: 13px;">Official Student Timetable Slip</p>
            </div>
            <div class="info-grid">
              <div><strong>Student Name:</strong> ${studentProfile?.name || user?.name || 'Enrolled Student'}</div>
              <div><strong>Student ID:</strong> ${studentId || studentProfile?.studentId || '—'}</div>
              <div><strong>Class & Section:</strong> ${currentClass} (${section})</div>
              <div><strong>Roll Number:</strong> ${studentProfile?.rollNumber || '—'}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date & Day</th>
                  <th>Time Slot</th>
                  <th>Room / Hall</th>
                  <th>Marks</th>
                  <th>Invigilator</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="6" style="text-align: center; padding: 20px;">No scheduled examinations.</td></tr>'}
              </tbody>
            </table>
            <div class="footer">
              <div>Generated on: ${new Date().toLocaleDateString()}</div>
              <div class="sign">Head of Institution / Exam Controller</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm';
  const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFF] text-slate-900'}`}>
      <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <Sidebar open={sidebarOpen} />

      <main
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{
          paddingTop: 'var(--header-height)',
          marginLeft: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed)',
        }}
      >
        <div className="flex-1 p-5 md:p-8 animate-fade-up max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  My Examination Routine
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className={`text-xs md:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Personalized exam schedules, real-time administrative updates, room allocation, and make-up exam notices.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => fetchRoutine(false)}
                className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'}`}
                title="Sync latest updates"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
              <button
                onClick={handlePrintAdmitSlip}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20"
              >
                <span>🖨️</span>
                <span>Print Routine Slip</span>
              </button>
            </div>
          </div>

          {/* Student Profile & Class Selector Bar */}
          <div className={`p-4 md:p-5 rounded-2xl border mb-6 ${cardBg}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                  {studentProfile?.name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {studentProfile?.name || user?.name || 'Enrolled Student'}
                    </h3>
                    {(studentId || studentProfile?.studentId) && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {studentId || studentProfile?.studentId}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Class: <strong>{currentClass || 'All'}</strong> • Section: <strong>{section || 'All'}</strong>
                    {studentProfile?.rollNumber && ` • Roll: ${studentProfile.rollNumber}`}
                  </p>
                </div>
              </div>

              {/* Class / Term Picker for Demo / Multiple Classes */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                    Class
                  </label>
                  <select
                    value={currentClass}
                    onChange={(e) => setCurrentClass(e.target.value)}
                    className={`text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                  >
                    <option value="">All Classes</option>
                    {meta.classes?.map((c) => (
                      <option key={`${c.className}-${c.section}`} value={c.className}>
                        {c.className} ({c.section || 'All'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                    Academic Term
                  </label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className={`text-xs px-3 py-1.5 rounded-xl border ${inputBg}`}
                  >
                    <option value="ALL">All Terms</option>
                    {meta.academicTerms?.map((term) => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                    Layout
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                    >
                      Table
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Exam Live Countdown Widget */}
          {!countdown.isFinished && countdown.nextSubject && (
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-800 to-slate-800 text-white shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                      ⚡ Immediate Next Examination
                    </span>
                    <span className="text-xs text-indigo-200">
                      {countdown.nextSubject.academicTerm}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold">
                    {countdown.nextSubject.subject}
                  </h2>
                  <p className="text-xs md:text-sm text-indigo-100 mt-1">
                    📅 {new Date(countdown.nextSubject.examDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} • ⏰ {countdown.nextSubject.startTime} – {countdown.nextSubject.endTime} • 🏛️ {countdown.nextSubject.classroom || 'Main Hall'}
                  </p>
                </div>

                {/* Countdown Digit Blocks */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[56px] border border-white/10">
                    <span className="text-lg md:text-xl font-bold font-mono block leading-none">{String(countdown.days).padStart(2, '0')}</span>
                    <span className="text-[10px] text-indigo-200 uppercase font-semibold">Days</span>
                  </div>
                  <span className="text-xl font-bold">:</span>
                  <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[56px] border border-white/10">
                    <span className="text-lg md:text-xl font-bold font-mono block leading-none">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="text-[10px] text-indigo-200 uppercase font-semibold">Hours</span>
                  </div>
                  <span className="text-xl font-bold">:</span>
                  <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[56px] border border-white/10">
                    <span className="text-lg md:text-xl font-bold font-mono block leading-none">{String(countdown.minutes).padStart(2, '0')}</span>
                    <span className="text-[10px] text-indigo-200 uppercase font-semibold">Mins</span>
                  </div>
                  <span className="text-xl font-bold">:</span>
                  <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl text-center min-w-[56px] border border-white/10">
                    <span className="text-lg md:text-xl font-bold font-mono block leading-none text-amber-300">{String(countdown.seconds).padStart(2, '0')}</span>
                    <span className="text-[10px] text-indigo-200 uppercase font-semibold">Secs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Make-up Exam Notice Banner if any */}
          {makeUpSlots.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                    You have {makeUpSlots.length} Make-up / Special Examination Session(s) Scheduled
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                    Make-up examinations have been officially scheduled by the school administration for your class/student profile.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {makeUpSlots.map((m) => (
                      <span key={m._id} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                        {m.subject} • {new Date(m.examDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ({m.startTime})
                        {m.makeUpReason && ` — ${m.makeUpReason}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Examination List & Timetables */}
          {loading ? (
            <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
              <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading your personalized examination routine...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
              <div className="text-4xl mb-3">📋</div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                No examination schedules published yet
              </h3>
              <p className={`text-xs mt-1 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                When the school administration publishes examination routines for {currentClass || 'your class'}, they will instantly appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {exams.map((exam) => {
                const typeStyle = EXAM_TYPE_STYLES[exam.examType] || EXAM_TYPE_STYLES.other;
                const routines = exam.routines || [];

                return (
                  <div key={exam._id} className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                    {/* Exam Header */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${typeStyle.color}`}>
                          {typeStyle.icon}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {exam.title}
                            </h3>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeStyle.color}`}>
                              {typeStyle.label}
                            </span>
                            {exam.isMakeUp && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                                MAKE-UP
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {exam.academicTerm} • Academic Year {exam.academicYear} • {routines.length} Subject Exams
                          </p>
                        </div>
                      </div>

                      <div className="text-right self-end md:self-auto">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {new Date(exam.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(exam.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* General Instructions Note */}
                    {exam.description && (
                      <div className="px-5 py-3 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-900 dark:text-indigo-200">
                        <strong>📌 Syllabus & Exam Guidelines:</strong> {exam.description}
                      </div>
                    )}

                    {/* Routine View: Cards vs Table */}
                    {viewMode === 'cards' ? (
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {routines.map((slot) => {
                          const slotDate = new Date(slot.examDate);
                          const isPast = slotDate.getTime() < new Date().setHours(0, 0, 0, 0);

                          return (
                            <div
                              key={slot._id}
                              className={`p-4 rounded-xl border transition-all ${
                                slot.isMakeUp
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                                  : isDark
                                  ? 'bg-slate-800/50 border-slate-700/70 hover:border-indigo-500/50'
                                  : 'bg-white border-slate-200 hover:border-indigo-300'
                              } ${isPast ? 'opacity-70' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    {slot.className} ({slot.section || 'All'})
                                  </span>
                                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {slot.subject}
                                  </h4>
                                </div>
                                {slot.isMakeUp ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                                    Make-up
                                  </span>
                                ) : isPast ? (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    Passed
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    Upcoming
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                  <span>📅</span>
                                  <span>{slotDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>⏰</span>
                                  <span className="font-mono font-medium">{slot.startTime} – {slot.endTime}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>🏛️</span>
                                  <span>Room: <strong>{slot.classroom || 'Main Hall'}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>📊</span>
                                  <span>Marks: <strong>{slot.totalMarks}</strong> (Pass: {slot.passMarks})</span>
                                </div>
                                {slot.invigilator && (
                                  <div className="flex items-center gap-2">
                                    <span>👨‍🏫</span>
                                    <span>Invigilator: {slot.invigilator}</span>
                                  </div>
                                )}
                              </div>

                              {slot.instructions && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 italic">
                                  {slot.instructions}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className={`font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            <tr>
                              <th className="p-3.5">Subject</th>
                              <th className="p-3.5">Date & Day</th>
                              <th className="p-3.5">Time</th>
                              <th className="p-3.5">Room</th>
                              <th className="p-3.5">Marks</th>
                              <th className="p-3.5">Invigilator</th>
                              <th className="p-3.5">Instructions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {routines.map((slot) => (
                              <tr
                                key={slot._id}
                                className={`transition-colors ${slot.isMakeUp ? 'bg-amber-50/60 dark:bg-amber-950/20' : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                              >
                                <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                                  <div className="flex items-center gap-1.5">
                                    <span>{slot.subject}</span>
                                    {slot.isMakeUp && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                                        Make-up
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3.5 text-slate-600 dark:text-slate-300">
                                  {new Date(slot.examDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                                  {slot.startTime} – {slot.endTime}
                                </td>
                                <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                                  {slot.classroom || '—'}
                                </td>
                                <td className="p-3.5 text-slate-600 dark:text-slate-300">
                                  <strong>{slot.totalMarks}</strong> <span className="text-slate-400">({slot.passMarks})</span>
                                </td>
                                <td className="p-3.5 text-slate-600 dark:text-slate-300">
                                  {slot.invigilator || '—'}
                                </td>
                                <td className="p-3.5 text-slate-500 dark:text-slate-400 italic">
                                  {slot.instructions || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sync Status Footer */}
          <div className="mt-8 text-center text-xs text-slate-400">
            Last synced with administration at {lastUpdated.toLocaleTimeString()} • Changes made by administrators reflect here instantly.
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
