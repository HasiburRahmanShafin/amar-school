import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as resultApi from '../../api/resultApi';
import * as examApi from '../../api/examApi';
import { api as studentApi } from '../../api/StudentApi';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import Footer from '../../components/layout/Footer';
import ReportCardModal from '../../components/results/ReportCardModal';

export default function StudentResults() {
  const { user, isDark } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Student profile & selector
  const [studentId, setStudentId] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  // Filter state
  const [selectedTerm, setSelectedTerm] = useState('ALL');
  const [academicTerms, setAcademicTerms] = useState([]);

  // Result data state
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Report Card modal
  const [reportCardData, setReportCardData] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Initialize student profile & meta
  useEffect(() => {
    const initStudent = async () => {
      try {
        const metaRes = await examApi.getExamMeta().catch(() => ({ data: { academicTerms: [] } }));
        setAcademicTerms(metaRes.data?.academicTerms || ['Term 1', 'Term 2', 'Final Term', 'Half Yearly']);

        if (user?.role === 'school_admin' || user?.role === 'teacher') {
          const studRes = await studentApi.get('/students').catch(() => ({ data: [] }));
          const studentList = studRes.data || [];
          setAllStudents(studentList);
          if (studentList.length > 0) {
            setStudentProfile(studentList[0]);
            setStudentId(studentList[0].studentId);
          }
        } else {
          // Student or parent: directly fetch results (backend auto-resolves student from user session)
          fetchResults();
        }
      } catch (err) {
        console.error('Failed to init student data', err);
      }
    };

    initStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch student published results
  const fetchResults = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const params = {};
      if (studentId) params.studentId = studentId;
      if (selectedTerm !== 'ALL') params.academicTerm = selectedTerm;

      const res = await resultApi.getStudentResults(params);
      const results = res.data.data || [];
      setExamResults(results);
      if (res.data.studentId) {
        setStudentId(res.data.studentId);
        if (!studentProfile && results.length > 0) {
          const first = results[0];
          setStudentProfile({
            name: first.studentName || user?.name,
            studentId: res.data.studentId,
            currentClass: first.className,
            section: first.section,
          });
        }
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch student results', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [studentId, selectedTerm, user, studentProfile]);

  useEffect(() => {
    if (studentId) {
      fetchResults();
    }
  }, [studentId, selectedTerm, fetchResults]);

  // Auto-refresh every 30 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchResults(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  // Open Printable Report Card
  const handleOpenReportCard = async (examId, targetStudentId) => {
    try {
      const res = await resultApi.getReportCardData({ examId, studentId: targetStudentId });
      setReportCardData(res.data.reportCard);
      setReportModalOpen(true);
    } catch (err) {
      alert('Report card data could not be retrieved.');
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'A':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'A-':
        return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700';
      case 'B':
        return 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700';
      case 'C':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'D':
        return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      default:
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700';
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <Sidebar open={sidebarOpen} />

      <main
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{
          paddingTop: 'var(--header-height)',
          marginLeft: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed)',
        }}
      >
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Top Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2 border border-white/20">
                  Student & Parent Portal · Academic Results
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Official Academic Transcripts & Progress
                </h1>
                <p className="text-slate-300 text-sm mt-1 max-w-xl">
                  View instant verified subject-wise marks, calculated GPA-5, class rank, and printable official report cards.
                </p>
              </div>

              {/* Live sync indicator */}
              <div className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live Sync · {lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Student & Term Selector Controls */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Student Profile Info / Switcher (if admin or multiple children) */}
              {user?.role !== 'student' && allStudents.length > 0 ? (
                <div className="w-64">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Select Student
                  </label>
                  <select
                    value={studentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setStudentId(id);
                      const s = allStudents.find((st) => st.studentId === id);
                      if (s) setStudentProfile(s);
                    }}
                    className="w-full text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    {allStudents.map((s) => (
                      <option key={s.studentId} value={s.studentId}>
                        {s.name} ({s.currentClass} - Sec {s.section})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-indigo-500/20">
                    {studentProfile?.name?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{studentProfile?.name || user?.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {studentProfile?.studentId || 'STU-2026'} · Class {studentProfile?.currentClass || '8'} ({studentProfile?.section || 'A'}) · Roll #{studentProfile?.rollNumber || '1'}
                    </p>
                  </div>
                </div>
              )}

              {/* Term Filter */}
              <div className="w-48">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Academic Term
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="ALL">All Academic Terms</option>
                  {academicTerms.map((t, idx) => (
                    <option key={idx} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <button
              onClick={() => fetchResults()}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors self-start md:self-auto"
            >
              🔄 Refresh Results
            </button>
          </div>

          {/* Results Display */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
              Loading official published academic transcripts…
            </div>
          ) : examResults.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center text-3xl mx-auto shadow-inner">
                📋
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">No Published Results Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Examinations results for the selected term have not been published by the administration yet. Check back soon or contact your class teacher.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {examResults.map((examResult, eIdx) => (
                <div
                  key={eIdx}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-6 p-6"
                >
                  {/* Exam Title & Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
                          {examResult.academicTerm} · {examResult.academicYear}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase">
                          ✓ Published
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                        {examResult.exam?.title || 'Term Examination'}
                      </h2>
                    </div>

                    <button
                      onClick={() => handleOpenReportCard(examResult.exam?._id || examResult.exam, examResult.studentInfo.studentId)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 self-start sm:self-auto"
                    >
                      <span>🎓</span> Download / Print Official Report Card
                    </button>
                  </div>

                  {/* Hero Performance Scorecard */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-800 text-center">
                    <div className="p-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Marks</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {examResult.summary.totalMarksObtained} <span className="text-xs font-normal text-slate-400">/ {examResult.summary.totalMaxMarks}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{examResult.summary.percentage}% Score</p>
                    </div>

                    <div className="p-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Overall GPA</p>
                      <p className={`text-2xl font-black mt-0.5 ${
                        examResult.summary.overallGPA >= 4.0 ? 'text-emerald-600 dark:text-emerald-400' :
                        examResult.summary.overallGPA > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'
                      }`}>
                        {examResult.summary.overallGPA.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-bold text-indigo-500">Scale of 5.00</p>
                    </div>

                    <div className="p-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Overall Grade</p>
                      <div className="mt-1">
                        <span className={`inline-block px-3 py-1 rounded-lg text-lg font-black border ${getGradeColor(examResult.summary.overallGrade)}`}>
                          {examResult.summary.overallGrade}
                        </span>
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Class Rank</p>
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        #{examResult.summary.classRank}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">of {examResult.summary.totalStudentsInClass} students</p>
                    </div>

                    <div className="p-3 col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Attendance</p>
                      <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">
                        {examResult.summary.averageAttendance}%
                      </p>
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">Average Presence</p>
                    </div>
                  </div>

                  {/* Subject-Wise Marks Breakdown Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4">Subject Name</th>
                          <th className="py-3 px-3 text-center">Full Marks</th>
                          <th className="py-3 px-3 text-center">Theory</th>
                          <th className="py-3 px-3 text-center">Practical</th>
                          <th className="py-3 px-3 text-center">Obtained</th>
                          <th className="py-3 px-3 text-center">Highest</th>
                          <th className="py-3 px-3 text-center">Grade Point</th>
                          <th className="py-3 px-3 text-center">Letter Grade</th>
                          <th className="py-3 px-4">Teacher Comments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {examResult.subjects.map((sub, sIdx) => (
                          <tr key={sIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {sub.subject}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">{sub.maxMarks || 100}</td>
                            <td className="py-3 px-3 text-center font-mono">{sub.isAbsent ? '—' : sub.theoryMarks}</td>
                            <td className="py-3 px-3 text-center font-mono">{sub.isAbsent ? '—' : (sub.practicalMarks || 0)}</td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                              {sub.isAbsent ? <span className="text-rose-500 font-bold">ABS</span> : sub.marksObtained}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {sub.highestMarkInClass || '—'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {sub.gradePoint?.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] border ${getGradeColor(sub.letterGrade)}`}>
                                {sub.letterGrade}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic">
                              {sub.teacherComments || 'Good understanding of subject'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Academic Remarks */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs flex items-center justify-between">
                    <p className="text-slate-600 dark:text-slate-300">
                      <span className="font-bold">Evaluation Remarks:</span> "{examResult.summary.remarks}"
                    </p>
                    <span className="text-slate-400">
                      Passed: {examResult.summary.passedSubjectsCount} of {examResult.summary.totalSubjectsCount} subjects
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
        <Footer />
      </main>

      {/* Official Report Card Printable Modal */}
      <ReportCardModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportData={reportCardData}
        isDark={isDark}
      />
    </div>
  );
}
