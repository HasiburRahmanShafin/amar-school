import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as resultApi from '../../api/resultApi';
import * as examApi from '../../api/examApi';
import TeacherLayout from '../../components/layout/TeacherLayout';
import AdminLayout from '../../components/layout/AdminLayout';

export default function MarkEntrySheet() {
  const { user } = useAuth();
  const Layout = user?.role === 'school_admin' ? AdminLayout : TeacherLayout;

  // Selection filters
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Sheet data & state
  const [sheetInfo, setSheetInfo] = useState(null);
  const [entries, setEntries] = useState([]);
  const [maxMarks, setMaxMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(33);
  const [theoryMax, setTheoryMax] = useState(100);
  const [practicalMax, setPracticalMax] = useState(0);

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Grade calculation helper for live feedback in UI
  const getSubjectGradeLocal = (marks, max, isAbsent) => {
    if (isAbsent || marks === null || marks === undefined || isNaN(marks)) {
      return { letterGrade: 'F', gradePoint: 0.0, color: 'text-rose-600 bg-rose-500/10 border-rose-200 dark:border-rose-800' };
    }
    const validMax = Number(max) > 0 ? Number(max) : 100;
    const percentage = (Number(marks) / validMax) * 100;

    if (percentage >= 80) return { letterGrade: 'A+', gradePoint: 5.0, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' };
    if (percentage >= 70) return { letterGrade: 'A', gradePoint: 4.0, color: 'text-blue-600 bg-blue-500/10 border-blue-200 dark:border-blue-800' };
    if (percentage >= 60) return { letterGrade: 'A-', gradePoint: 3.5, color: 'text-cyan-600 bg-cyan-500/10 border-cyan-200 dark:border-cyan-800' };
    if (percentage >= 50) return { letterGrade: 'B', gradePoint: 3.0, color: 'text-teal-600 bg-teal-500/10 border-teal-200 dark:border-teal-800' };
    if (percentage >= 40) return { letterGrade: 'C', gradePoint: 2.0, color: 'text-amber-600 bg-amber-500/10 border-amber-200 dark:border-amber-800' };
    if (percentage >= 33) return { letterGrade: 'D', gradePoint: 1.0, color: 'text-orange-600 bg-orange-500/10 border-orange-200 dark:border-orange-800' };
    return { letterGrade: 'F', gradePoint: 0.0, color: 'text-rose-600 bg-rose-500/10 border-rose-200 dark:border-rose-800' };
  };

  // Initial Load: Exams & Teacher Classes
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [examsRes, classesRes] = await Promise.all([
          examApi.getExams(),
          resultApi.getTeacherClasses(),
        ]);

        const examList = examsRes.data.data || [];
        setExams(examList);
        if (examList.length > 0) {
          setSelectedExamId(examList[0]._id);
        }

        const classList = classesRes.data.assignedClasses || [];
        setAssignedClasses(classList);

        if (classList.length > 0) {
          const first = classList[0];
          setSelectedClass(first.class || first.className || '');
          setSelectedSection(first.section || 'All');
          setSelectedSubject(first.subject || classesRes.data.availableSubjects?.[0] || '');
        }
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to initialize mark entry', 'error');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Fetch Mark Sheet when selections change
  const fetchSheet = useCallback(async () => {
    if (!selectedExamId || !selectedClass || !selectedSubject) return;

    try {
      setLoadingSheet(true);
      const res = await resultApi.getMarkEntrySheet({
        examId: selectedExamId,
        className: selectedClass,
        section: selectedSection || 'All',
        subject: selectedSubject,
      });

      const sheet = res.data.sheet;
      setSheetInfo(sheet);
      setMaxMarks(sheet.maxMarks || 100);
      setPassMarks(sheet.passMarks || 33);
      setTheoryMax(sheet.theoryMaxMarks || sheet.maxMarks || 100);
      setPracticalMax(sheet.practicalMaxMarks || 0);
      setEntries(sheet.entries || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load mark entry sheet', 'error');
    } finally {
      setLoadingSheet(false);
    }
  }, [selectedExamId, selectedClass, selectedSection, selectedSubject]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  // Handle Mark / Field Change for a Student
  const handleEntryChange = (index, field, value) => {
    setEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index] };

      if (field === 'isAbsent') {
        entry.isAbsent = Boolean(value);
        if (entry.isAbsent) {
          entry.theoryMarks = 0;
          entry.practicalMarks = 0;
          entry.marksObtained = 0;
        }
      } else if (field === 'theoryMarks' || field === 'practicalMarks') {
        const numVal = Math.max(0, Number(value) || 0);
        entry[field] = numVal;
        const total = (Number(entry.theoryMarks) || 0) + (Number(entry.practicalMarks) || 0);
        entry.marksObtained = Math.min(total, maxMarks);
      } else {
        entry[field] = value;
      }

      // Recompute grade preview
      const grade = getSubjectGradeLocal(entry.marksObtained, maxMarks, entry.isAbsent);
      entry.gradePoint = grade.gradePoint;
      entry.letterGrade = grade.letterGrade;
      entry.percentage = maxMarks > 0 ? Number(((entry.marksObtained / maxMarks) * 100).toFixed(1)) : 0;

      updated[index] = entry;
      return updated;
    });
  };

  // Quick Action: Fill 100% Attendance for all
  const handleBulkAttendance = (val = 100) => {
    setEntries((prev) => prev.map((e) => ({ ...e, attendancePercentage: val })));
    showToast(`Set attendance to ${val}% for all students`);
  };

  // Save or Submit Marks
  const handleSaveMarks = async (action = 'save_draft') => {
    try {
      setSaving(true);
      const payload = {
        examId: selectedExamId,
        className: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        maxMarks,
        passMarks,
        theoryMaxMarks: theoryMax,
        practicalMaxMarks: practicalMax,
        entries,
        action,
      };

      const res = await resultApi.saveMarkEntrySheet(payload);
      showToast(res.data.message || 'Marks saved successfully', 'success');
      fetchSheet();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Students in Table
  const filteredEntries = useMemo(() => {
    if (!searchFilter.trim()) return entries;
    const q = searchFilter.toLowerCase();
    return entries.filter(
      (e) =>
        e.studentName?.toLowerCase().includes(q) ||
        e.studentId?.toLowerCase().includes(q) ||
        e.rollNumber?.toLowerCase().includes(q)
    );
  }, [entries, searchFilter]);

  // Statistics calculation for the current sheet
  const stats = useMemo(() => {
    const total = entries.length;
    if (total === 0) return { total: 0, entered: 0, passed: 0, failed: 0, avg: 0, passRate: 0, highest: 0 };

    let entered = 0;
    let passed = 0;
    let totalMarksSum = 0;
    let highest = 0;

    entries.forEach((e) => {
      const marks = Number(e.marksObtained || 0);
      if (marks > 0 || e.isAbsent) entered++;
      if (marks > highest) highest = marks;
      if (!e.isAbsent && e.marksObtained >= passMarks) passed++;
      totalMarksSum += marks;
    });

    const avg = total > 0 ? (totalMarksSum / total).toFixed(1) : 0;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    return {
      total,
      entered,
      passed,
      failed: total - passed,
      avg,
      passRate,
      highest,
    };
  }, [entries, passMarks]);

  const distinctClasses = useMemo(() => {
    const map = new Map();
    assignedClasses.forEach((c) => {
      const key = `${c.class || c.className}:::${c.section || 'All'}`;
      if (!map.has(key)) {
        map.set(key, { className: c.class || c.className, section: c.section || 'All', subject: c.subject });
      }
    });
    return Array.from(map.values());
  }, [assignedClasses]);

  const distinctSubjects = useMemo(() => {
    const set = new Set();
    assignedClasses.forEach((c) => {
      if (c.subject) set.add(c.subject);
    });
    return Array.from(set);
  }, [assignedClasses]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{toast.text}</span>
          </div>
        )}

        {/* Top Header & Overview */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-indigo-500/20">
                📝
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Teacher Mark Entry Sheet
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload and manage subject marks, grades, attendance, and student remarks
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveMarks('save_draft')}
              disabled={saving || entries.length === 0}
              id="save-draft-btn"
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving…' : '💾 Save Draft'}
            </button>
            <button
              onClick={() => handleSaveMarks('submit_review')}
              disabled={saving || entries.length === 0}
              id="submit-review-btn"
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Submitting…' : '🚀 Submit for Admin Review'}
            </button>
          </div>
        </div>

        {/* Selection / Filter Controls Box */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Examination Term */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Examination Term
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                id="select-exam"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title} ({exam.academicTerm})
                  </option>
                ))}
              </select>
            </div>

            {/* Class & Section */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Class & Section
              </label>
              <select
                value={`${selectedClass}:::${selectedSection}`}
                onChange={(e) => {
                  const [c, s] = e.target.value.split(':::');
                  setSelectedClass(c);
                  setSelectedSection(s || 'All');
                }}
                id="select-class-section"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                {distinctClasses.length > 0 ? (
                  distinctClasses.map((item, idx) => (
                    <option key={idx} value={`${item.className}:::${item.section}`}>
                      {item.className} - Section {item.section}
                    </option>
                  ))
                ) : (
                  <option value="Class 8:::A">Class 8 - Section A</option>
                )}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                id="select-subject"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                {distinctSubjects.length > 0 ? (
                  distinctSubjects.map((sub, idx) => (
                    <option key={idx} value={sub}>
                      {sub}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English">English</option>
                    <option value="Bangla">Bangla</option>
                    <option value="Science">Science</option>
                  </>
                )}
              </select>
            </div>

            {/* Max Marks & Pass Marks Config */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Max Marks
                </label>
                <input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value) || 100)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Pass Marks
                </label>
                <input
                  type="number"
                  value={passMarks}
                  onChange={(e) => setPassMarks(Number(e.target.value) || 33)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Submission Status Notification Banner */}
          {sheetInfo && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Sheet Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                    sheetInfo.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : sheetInfo.status === 'submitted'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      : sheetInfo.status === 'approved'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {sheetInfo.status}
                </span>
                {sheetInfo.submittedAt && (
                  <span className="text-slate-400">
                    · Submitted on {new Date(sheetInfo.submittedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {sheetInfo.adminFeedback && (
                <div className="text-amber-600 dark:text-amber-400 font-medium">
                  Admin Note: "{sheetInfo.adminFeedback}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Performance & Mark Sheet Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Enrolled Students</p>
            <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Marks Entered</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.entered} / {stats.total}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Class Average</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.avg}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Highest Mark</p>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.highest}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Pass Rate</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.passRate}%</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Passed / Failed</p>
            <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">{stats.passed} / <span className="text-rose-500">{stats.failed}</span></p>
          </div>
        </div>

        {/* Mark Entry Table Section */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          
          {/* Table Header Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by student name or roll…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 w-64"
              />
              <span className="text-xs text-slate-400 font-medium">
                Showing {filteredEntries.length} of {entries.length} students
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkAttendance(100)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                ⚡ Set 100% Attendance All
              </button>
            </div>
          </div>

          {/* Dynamic Mark Entry Table */}
          {loadingSheet ? (
            <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
              Loading mark entry sheet…
            </div>
          ) : entries.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              No enrolled students found for {selectedClass} - Section {selectedSection}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-3 w-14">Roll</th>
                    <th className="py-3.5 px-3">Student Name</th>
                    <th className="py-3.5 px-3 w-28 text-center">Theory ({theoryMax})</th>
                    <th className="py-3.5 px-3 w-28 text-center">Practical ({practicalMax})</th>
                    <th className="py-3.5 px-3 w-24 text-center">Total ({maxMarks})</th>
                    <th className="py-3.5 px-2 w-20 text-center">GPA</th>
                    <th className="py-3.5 px-2 w-20 text-center">Grade</th>
                    <th className="py-3.5 px-3 w-28 text-center">Attendance %</th>
                    <th className="py-3.5 px-3 w-24 text-center">Absent?</th>
                    <th className="py-3.5 px-3">Teacher Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredEntries.map((studentEntry, index) => {
                    const originalIndex = entries.findIndex((e) => e.studentId === studentEntry.studentId);
                    const gradePreview = getSubjectGradeLocal(studentEntry.marksObtained, maxMarks, studentEntry.isAbsent);

                    return (
                      <tr
                        key={studentEntry.studentId || index}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          studentEntry.isAbsent ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        {/* Roll Number */}
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          #{studentEntry.rollNumber || index + 1}
                        </td>

                        {/* Student Name & ID */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {studentEntry.studentName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{studentEntry.studentName}</p>
                              <p className="text-[10px] font-mono text-slate-400">{studentEntry.studentId}</p>
                            </div>
                          </div>
                        </td>

                        {/* Theory Marks Input */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={theoryMax}
                            disabled={studentEntry.isAbsent}
                            value={studentEntry.isAbsent ? '' : (studentEntry.theoryMarks ?? '')}
                            onChange={(e) => handleEntryChange(originalIndex, 'theoryMarks', e.target.value)}
                            placeholder="0"
                            className="w-20 text-center font-mono font-bold py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </td>

                        {/* Practical Marks Input */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={practicalMax}
                            disabled={studentEntry.isAbsent || practicalMax === 0}
                            value={studentEntry.isAbsent || practicalMax === 0 ? '' : (studentEntry.practicalMarks ?? '')}
                            onChange={(e) => handleEntryChange(originalIndex, 'practicalMarks', e.target.value)}
                            placeholder={practicalMax > 0 ? '0' : '—'}
                            className="w-20 text-center font-mono font-bold py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-40"
                          />
                        </td>

                        {/* Total Marks Obtained */}
                        <td className="py-3 px-3 text-center font-mono font-black text-sm text-slate-800 dark:text-slate-100">
                          {studentEntry.isAbsent ? <span className="text-rose-500">ABS</span> : studentEntry.marksObtained}
                        </td>

                        {/* GPA Badge */}
                        <td className="py-3 px-2 text-center font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {gradePreview.gradePoint.toFixed(2)}
                        </td>

                        {/* Letter Grade Badge */}
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${gradePreview.color}`}>
                            {gradePreview.letterGrade}
                          </span>
                        </td>

                        {/* Attendance % Input */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={studentEntry.attendancePercentage ?? 100}
                            onChange={(e) => handleEntryChange(originalIndex, 'attendancePercentage', e.target.value)}
                            className="w-16 text-center font-mono py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                        </td>

                        {/* Absent Toggle */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(studentEntry.isAbsent)}
                            onChange={(e) => handleEntryChange(originalIndex, 'isAbsent', e.target.checked)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>

                        {/* Comments Input */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={studentEntry.teacherComments || ''}
                            onChange={(e) => handleEntryChange(originalIndex, 'teacherComments', e.target.value)}
                            placeholder="e.g. Excellent grasp of concepts…"
                            className="w-full py-1 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Bottom Action Bar */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Auto-calculating GPA-5 and letter grades dynamically
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveMarks('save_draft')}
                disabled={saving || entries.length === 0}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveMarks('submit_review')}
                disabled={saving || entries.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-colors disabled:opacity-50"
              >
                Submit for Administrative Review
              </button>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
