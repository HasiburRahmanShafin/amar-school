import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as resultApi from '../../api/resultApi';
import * as examApi from '../../api/examApi';
import AdminLayout from '../../components/layout/AdminLayout';
import ReportCardModal from '../../components/results/ReportCardModal';

export default function ResultManager() {
  const { isDark } = useAuth();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeTab, setActiveTab] = useState('sheets'); // 'sheets' | 'students'

  const [sheets, setSheets] = useState([]);
  const [stats, setStats] = useState({ totalSheets: 0, submittedCount: 0, approvedCount: 0, publishedCount: 0, draftCount: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Review Sheet Modal State
  const [reviewSheet, setReviewSheet] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Student Ranks / Report Card View State
  const [studentResults, setStudentResults] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Exams
  useEffect(() => {
    const loadExams = async () => {
      try {
        const res = await examApi.getExams();
        const list = res.data.data || [];
        setExams(list);
        if (list.length > 0) {
          setSelectedExamId(list[0]._id);
        }
      } catch (err) {
        showToast('Failed to load examinations', 'error');
      }
    };
    loadExams();
  }, []);

  // Load Result Sheets Overview
  const loadOverview = useCallback(async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const params = { examId: selectedExamId };
      if (selectedClass !== 'ALL') params.className = selectedClass;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await resultApi.getAdminResultOverview(params);
      setSheets(res.data.sheets || []);
      setStats(res.data.stats || { totalSheets: 0, submittedCount: 0, approvedCount: 0, publishedCount: 0, draftCount: 0 });
    } catch (err) {
      showToast('Failed to load results overview', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedExamId, selectedClass, selectedStatus]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Load Student Performance & Ranks
  const loadStudentResults = useCallback(async () => {
    if (!selectedExamId) return;
    try {
      setLoadingStudents(true);
      const params = { examId: selectedExamId };
      if (selectedClass !== 'ALL') params.className = selectedClass;
      const res = await resultApi.getStudentResults(params);
      setStudentResults(res.data.data || []);
    } catch (err) {
      console.error('Failed to load student ranks', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedExamId, selectedClass]);

  useEffect(() => {
    if (activeTab === 'students') {
      loadStudentResults();
    }
  }, [activeTab, loadStudentResults]);

  // Open Review Modal for a specific sheet
  const handleOpenReview = (sheet) => {
    setReviewSheet(sheet);
    setAdminFeedback(sheet.adminFeedback || '');
    setReviewModalOpen(true);
  };

  // Update Sheet Status (approve, reject, publish)
  const handleStatusChange = async (sheetId, newStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await resultApi.updateResultStatus(sheetId, {
        status: newStatus,
        adminFeedback,
      });

      showToast(res.data.message || `Status updated to ${newStatus}`, 'success');
      setReviewModalOpen(false);
      loadOverview();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Bulk Publish All Sheets for Exam
  const handlePublishAll = async () => {
    if (!window.confirm('Are you sure you want to publish all results for this examination? Students and parents will instantly see their results online.')) {
      return;
    }

    try {
      setUpdatingStatus(true);
      const res = await resultApi.publishAllExamResults({
        examId: selectedExamId,
        className: selectedClass !== 'ALL' ? selectedClass : undefined,
      });

      showToast(res.data.message || 'Results published successfully', 'success');
      loadOverview();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to publish results', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Open Report Card Modal
  const handleOpenReportCard = async (examId, studentId) => {
    try {
      const res = await resultApi.getReportCardData({ examId, studentId });
      setSelectedReportCard(res.data.reportCard);
      setReportModalOpen(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Report card not available yet. Ensure marks are published.', 'error');
    }
  };

  const distinctClassOptions = useMemo(() => {
    const set = new Set();
    sheets.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set);
  }, [sheets]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all ${
              toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{toast.text}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20">
              📊
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Result & Marks Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Administrative review, GPA calculations, publication, and official report cards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePublishAll}
              id="publish-all-results-btn"
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>📢</span> Publish All Exam Results
            </button>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Subject Sheets</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{stats.totalSheets}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-blue-500">Submitted / Review</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{stats.submittedCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-purple-500">Approved</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.approvedCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-emerald-500">Published</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.publishedCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase font-bold text-amber-500">Drafts</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.draftCount}</p>
          </div>
        </div>

        {/* Filter Controls & Tabs */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Exam Select */}
            <div className="w-56">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Exam</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.title} ({ex.academicTerm})
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div className="w-40">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">All Classes</option>
                {distinctClassOptions.map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-40">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">All Statuses</option>
                <option value="submitted">Submitted for Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('sheets')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'sheets'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              📝 Subject Mark Sheets
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'students'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🏆 Student Ranks & Report Cards
            </button>
          </div>
        </div>

        {/* Tab 1: Subject Mark Sheets Grid */}
        {activeTab === 'sheets' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
                Loading mark sheets…
              </div>
            ) : sheets.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                No mark sheets found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Class & Section</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Teacher</th>
                      <th className="py-3.5 px-3 text-center">Students</th>
                      <th className="py-3.5 px-3 text-center">Class Avg</th>
                      <th className="py-3.5 px-3 text-center">Pass Rate</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {sheets.map((sheet) => (
                      <tr key={sheet._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {sheet.className} · Sec {sheet.section || 'All'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                          {sheet.subject}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {sheet.teacherName || 'Faculty'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold">
                          {sheet.stats?.totalStudents || sheet.entries?.length || 0}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                          {sheet.stats?.averageMark || 0}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {sheet.stats?.passRate || 0}%
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              sheet.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                                : sheet.status === 'approved'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300'
                                : sheet.status === 'submitted'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 animate-pulse'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {sheet.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenReview(sheet)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors shadow-sm"
                          >
                            🔍 Review Sheet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Student Leaderboard, Ranks & Report Cards */}
        {activeTab === 'students' && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingStudents ? (
              <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
                Calculating student ranks and GPAs…
              </div>
            ) : studentResults.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                No published results found. Please publish mark sheets first to view student rankings and generate report cards.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 text-center w-16">Rank</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Class & Sec</th>
                      <th className="py-3.5 px-3 text-center">Total Marks</th>
                      <th className="py-3.5 px-3 text-center">Overall GPA</th>
                      <th className="py-3.5 px-3 text-center">Grade</th>
                      <th className="py-3.5 px-3 text-center">Attendance</th>
                      <th className="py-3.5 px-3 text-center">Subjects Passed</th>
                      <th className="py-3.5 px-4 text-right">Report Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {studentResults.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                              item.summary.classRank === 1
                                ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/30'
                                : item.summary.classRank === 2
                                ? 'bg-slate-300 text-slate-900'
                                : item.summary.classRank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            #{item.summary.classRank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{item.studentInfo.studentName}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.studentInfo.studentId} · Roll #{item.studentInfo.rollNumber}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {item.className} - {item.section}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold">
                          {item.summary.totalMarksObtained} <span className="text-slate-400 font-normal">/ {item.summary.totalMaxMarks}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                          {item.summary.overallGPA.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded font-bold text-[11px] ${
                            item.summary.overallGrade === 'A+' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            item.summary.overallGrade === 'F' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}>
                            {item.summary.overallGrade}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                          {item.summary.averageAttendance}%
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono">
                          {item.summary.passedSubjectsCount} / {item.summary.totalSubjectsCount}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenReportCard(selectedExamId, item.studentInfo.studentId)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow transition-all"
                          >
                            🎓 View Report Card
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Administrative Review of Mark Sheet */}
        {reviewModalOpen && reviewSheet && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Administrative Mark Sheet Review
                  </h3>
                  <p className="text-xs text-slate-500">
                    {reviewSheet.className} ({reviewSheet.section}) · {reviewSheet.subject} · Submitted by {reviewSheet.teacherName}
                  </p>
                </div>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {/* Modal Sheet Entries List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        <th className="py-2.5 px-3">Roll</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-2 text-center">Theory</th>
                        <th className="py-2.5 px-2 text-center">Practical</th>
                        <th className="py-2.5 px-2 text-center">Total</th>
                        <th className="py-2.5 px-2 text-center">GPA</th>
                        <th className="py-2.5 px-2 text-center">Grade</th>
                        <th className="py-2.5 px-2 text-center">Attendance %</th>
                        <th className="py-2.5 px-3">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(reviewSheet.entries || []).map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-600">#{entry.rollNumber}</td>
                          <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{entry.studentName}</td>
                          <td className="py-2 px-2 text-center font-mono">{entry.isAbsent ? '—' : entry.theoryMarks}</td>
                          <td className="py-2 px-2 text-center font-mono">{entry.isAbsent ? '—' : entry.practicalMarks}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {entry.isAbsent ? <span className="text-rose-500">ABS</span> : entry.marksObtained}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-indigo-600">{entry.gradePoint?.toFixed(2)}</td>
                          <td className="py-2 px-2 text-center font-bold">{entry.letterGrade}</td>
                          <td className="py-2 px-2 text-center font-mono">{entry.attendancePercentage}%</td>
                          <td className="py-2 px-3 text-slate-500 italic">{entry.teacherComments || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Admin Feedback Box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Administrative Feedback / Revision Notes
                  </label>
                  <textarea
                    rows="2"
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    placeholder="Enter any feedback or notes for the faculty…"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(reviewSheet._id, 'draft')}
                    disabled={updatingStatus}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    ↩ Return for Revision
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleStatusChange(reviewSheet._id, 'approved')}
                    disabled={updatingStatus}
                    className="px-4 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-300 rounded-xl hover:bg-purple-100 transition-colors"
                  >
                    ✓ Approve Marks
                  </button>
                  <button
                    onClick={() => handleStatusChange(reviewSheet._id, 'published')}
                    disabled={updatingStatus}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/25 transition-all"
                  >
                    🚀 Publish Immediately
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Official Report Card Printable Modal */}
        <ReportCardModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportData={selectedReportCard}
          isDark={isDark}
        />

      </div>
    </AdminLayout>
  );
}
