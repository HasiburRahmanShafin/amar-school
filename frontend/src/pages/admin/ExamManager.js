import { useEffect, useState, useMemo } from 'react';
import * as examApi from '../../api/examApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';

const EXAM_TYPE_LABELS = {
  term_exam: { label: 'Term Exam', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  midterm: { label: 'Midterm', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  final_exam: { label: 'Final Exam', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  class_test: { label: 'Class Test', color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  makeup_exam: { label: 'Make-up Exam', color: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
  model_test: { label: 'Model Test', color: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800' },
  practical: { label: 'Practical / Lab', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  other: { label: 'Other', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

const STATUS_BADGES = {
  draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  published: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  ongoing: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  completed: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  cancelled: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

const emptyRoutineSlot = () => ({
  className: '',
  section: 'All',
  subject: '',
  examDate: '',
  startTime: '10:00',
  endTime: '13:00',
  classroom: '',
  invigilator: '',
  totalMarks: 100,
  passMarks: 33,
  instructions: '',
  isMakeUp: false,
  targetStudentIdsStr: '',
  makeUpReason: '',
});

const initialExamForm = () => ({
  title: '',
  academicTerm: 'Term 1',
  academicYear: String(new Date().getFullYear()),
  examType: 'term_exam',
  startDate: '',
  endDate: '',
  description: '',
  status: 'draft',
  isMakeUp: false,
  makeUpReason: '',
  routines: [],
});

export default function ExamManager() {
  const { isDark } = useAuth();
  const [exams, setExams] = useState([]);
  const [meta, setMeta] = useState({ academicTerms: [], academicYears: [], classes: [], examTypes: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'makeup'

  // Modals & form state
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [examForm, setExamForm] = useState(initialExamForm());

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotTargetExam, setSlotTargetExam] = useState(null);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [slotForm, setSlotForm] = useState(emptyRoutineSlot());

  const [showMakeUpModal, setShowMakeUpModal] = useState(false);
  const [makeUpForm, setMakeUpForm] = useState({
    parentExamId: '',
    title: '',
    academicTerm: 'Term 1',
    academicYear: String(new Date().getFullYear()),
    className: '',
    section: 'All',
    subject: '',
    examDate: '',
    startTime: '10:00',
    endTime: '13:00',
    classroom: '',
    invigilator: '',
    totalMarks: 100,
    passMarks: 33,
    instructions: '',
    targetStudentIdsStr: '',
    makeUpReason: '',
  });

  const [expandedExamId, setExpandedExamId] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showNotification = (msg, type = 'success') => {
    setToast({ text: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsRes, metaRes] = await Promise.all([
        examApi.getExams(),
        examApi.getExamMeta().catch(() => ({ data: { academicTerms: [], academicYears: [], classes: [], examTypes: [] } })),
      ]);
      setExams(examsRes.data.data || []);
      setMeta(metaRes.data || { academicTerms: [], academicYears: [], classes: [], examTypes: [] });
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load examinations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (activeTab === 'makeup' && !exam.isMakeUp && !(exam.routines || []).some((r) => r.isMakeUp)) {
        return false;
      }
      if (selectedTerm !== 'ALL' && exam.academicTerm !== selectedTerm) return false;
      if (selectedType !== 'ALL' && exam.examType !== selectedType) return false;
      if (selectedStatus !== 'ALL' && exam.status !== selectedStatus) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = exam.title?.toLowerCase().includes(query);
        const matchesTerm = exam.academicTerm?.toLowerCase().includes(query);
        const matchesSubject = (exam.routines || []).some((r) => r.subject?.toLowerCase().includes(query) || r.className?.toLowerCase().includes(query));
        if (!matchesTitle && !matchesTerm && !matchesSubject) return false;
      }
      return true;
    });
  }, [exams, activeTab, selectedTerm, selectedType, selectedStatus, searchTerm]);

  // Calculated Stats
  const stats = useMemo(() => {
    const total = exams.length;
    const published = exams.filter((e) => e.status === 'published').length;
    const makeupCount = exams.filter((e) => e.isMakeUp || (e.routines || []).some((r) => r.isMakeUp)).length;
    const upcoming = exams.filter((e) => new Date(e.endDate) >= new Date() && e.status === 'published').length;
    return { total, published, makeupCount, upcoming };
  }, [exams]);

  // Exam actions
  const handleOpenCreateModal = () => {
    setEditingExamId(null);
    setExamForm(initialExamForm());
    setShowExamModal(true);
  };

  const handleOpenEditExam = (exam) => {
    setEditingExamId(exam._id);
    setExamForm({
      title: exam.title,
      academicTerm: exam.academicTerm,
      academicYear: exam.academicYear,
      examType: exam.examType,
      startDate: exam.startDate ? exam.startDate.substring(0, 10) : '',
      endDate: exam.endDate ? exam.endDate.substring(0, 10) : '',
      description: exam.description || '',
      status: exam.status,
      isMakeUp: exam.isMakeUp || false,
      makeUpReason: exam.makeUpReason || '',
      routines: exam.routines || [],
    });
    setShowExamModal(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examForm.title || !examForm.startDate || !examForm.endDate) {
      showNotification('Please fill in all required exam details', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingExamId) {
        const res = await examApi.updateExam(editingExamId, examForm);
        setExams((prev) => prev.map((ex) => (ex._id === editingExamId ? res.data.data : ex)));
        showNotification('Examination updated successfully');
      } else {
        const res = await examApi.createExam(examForm);
        setExams((prev) => [res.data.data, ...prev]);
        showNotification('New examination schedule created');
      }
      setShowExamModal(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error saving examination', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to permanently delete this examination schedule and all its class routines?')) {
      return;
    }
    try {
      await examApi.deleteExam(examId);
      setExams((prev) => prev.filter((e) => e._id !== examId));
      showNotification('Examination schedule deleted');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete exam', 'error');
    }
  };

  const handleTogglePublish = async (exam) => {
    const nextStatus = exam.status === 'published' ? 'draft' : 'published';
    try {
      const res = await examApi.togglePublishExam(exam._id, nextStatus);
      setExams((prev) => prev.map((e) => (e._id === exam._id ? res.data.data : e)));
      showNotification(`Examination schedule is now ${nextStatus.toUpperCase()}`);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update publish status', 'error');
    }
  };

  // Routine Slot Actions
  const handleOpenAddSlot = (exam) => {
    setSlotTargetExam(exam);
    setEditingSlotId(null);
    setSlotForm({
      ...emptyRoutineSlot(),
      className: meta.classes?.[0]?.className || 'Class 10',
      section: meta.classes?.[0]?.section || 'All',
      examDate: exam.startDate ? exam.startDate.substring(0, 10) : '',
    });
    setShowSlotModal(true);
  };

  const handleOpenEditSlot = (exam, slot) => {
    setSlotTargetExam(exam);
    setEditingSlotId(slot._id);
    setSlotForm({
      className: slot.className,
      section: slot.section || 'All',
      subject: slot.subject,
      examDate: slot.examDate ? slot.examDate.substring(0, 10) : '',
      startTime: slot.startTime || '10:00',
      endTime: slot.endTime || '13:00',
      classroom: slot.classroom || '',
      invigilator: slot.invigilator || '',
      totalMarks: slot.totalMarks ?? 100,
      passMarks: slot.passMarks ?? 33,
      instructions: slot.instructions || '',
      isMakeUp: slot.isMakeUp || false,
      targetStudentIdsStr: (slot.targetStudentIds || []).join(', '),
      makeUpReason: slot.makeUpReason || '',
    });
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!slotForm.className || !slotForm.subject || !slotForm.examDate || !slotForm.startTime || !slotForm.endTime) {
      showNotification('Please fill in Class, Subject, Date, and Timings', 'error');
      return;
    }
    const targetIds = slotForm.targetStudentIdsStr
      ? slotForm.targetStudentIdsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      ...slotForm,
      targetStudentIds: targetIds,
    };

    setSubmitting(true);
    try {
      let res;
      if (editingSlotId) {
        res = await examApi.updateRoutineSlot(slotTargetExam._id, editingSlotId, payload);
        showNotification('Class routine slot updated');
      } else {
        res = await examApi.addRoutineSlot(slotTargetExam._id, payload);
        showNotification('New routine slot added to examination');
      }
      setExams((prev) => prev.map((ex) => (ex._id === slotTargetExam._id ? res.data.data : ex)));
      setShowSlotModal(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error saving routine slot', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (examId, slotId) => {
    if (!window.confirm('Remove this subject slot from the routine?')) return;
    try {
      const res = await examApi.deleteRoutineSlot(examId, slotId);
      setExams((prev) => prev.map((ex) => (ex._id === examId ? res.data.data : ex)));
      showNotification('Routine slot removed');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to remove routine slot', 'error');
    }
  };

  // Quick Make-up Scheduler
  const handleSaveMakeUp = async (e) => {
    e.preventDefault();
    if (!makeUpForm.title || !makeUpForm.className || !makeUpForm.subject || !makeUpForm.examDate) {
      showNotification('Please fill in all required make-up exam fields', 'error');
      return;
    }

    const targetIds = makeUpForm.targetStudentIdsStr
      ? makeUpForm.targetStudentIdsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    setSubmitting(true);
    try {
      const res = await examApi.scheduleMakeUpExam({
        ...makeUpForm,
        targetStudentIds: targetIds,
      });
      showNotification('Make-up examination scheduled and published!');
      setShowMakeUpModal(false);
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to schedule make-up exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Print Routine Utility
  const handlePrintExam = (exam) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const routinesHtml = (exam.routines || [])
      .map(
        (r) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-weight: 600;">${r.className} (${r.section || 'All'})</td>
          <td style="padding: 10px;">${r.subject} ${r.isMakeUp ? '<span style="color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Make-up</span>' : ''}</td>
          <td style="padding: 10px;">${new Date(r.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}</td>
          <td style="padding: 10px;">${r.startTime} - ${r.endTime}</td>
          <td style="padding: 10px;">${r.classroom || 'TBA'}</td>
          <td style="padding: 10px;">${r.totalMarks} / ${r.passMarks}</td>
          <td style="padding: 10px;">${r.invigilator || '—'}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exam.title} - Examination Routine</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; }
            h1 { margin: 0 0 5px 0; color: #1e1b4b; font-size: 24px; }
            .sub { color: #64748b; font-size: 14px; margin: 0; }
            .badges { margin-top: 10px; }
            .badge { display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #3730a3; border-radius: 99px; font-size: 12px; font-weight: 600; margin: 0 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { background-color: #f1f5f9; padding: 12px 10px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
            .signature { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 5px; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${exam.title}</h1>
            <p class="sub">${exam.academicTerm} • Academic Year ${exam.academicYear}</p>
            <div class="badges">
              <span class="badge">Type: ${EXAM_TYPE_LABELS[exam.examType]?.label || exam.examType}</span>
              <span class="badge">Date: ${new Date(exam.startDate).toLocaleDateString()} to ${new Date(exam.endDate).toLocaleDateString()}</span>
              <span class="badge">Status: ${exam.status.toUpperCase()}</span>
            </div>
          </div>
          ${exam.description ? `<p style="font-size: 13px; color: #475569; background: #f8fafc; padding: 10px 15px; border-left: 4px solid #4f46e5; border-radius: 4px;"><strong>Instructions:</strong> ${exam.description}</p>` : ''}
          <table>
            <thead>
              <tr>
                <th>Class & Section</th>
                <th>Subject</th>
                <th>Exam Date</th>
                <th>Time Slot</th>
                <th>Room / Hall</th>
                <th>Marks (Total/Pass)</th>
                <th>Invigilator</th>
              </tr>
            </thead>
            <tbody>
              ${routinesHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">No routine slots configured yet.</td></tr>'}
            </tbody>
          </table>
          <div class="footer">
            <div>Published on: ${exam.publishedAt ? new Date(exam.publishedAt).toLocaleDateString() : 'Draft Mode'}</div>
            <div class="signature">Controller of Examinations</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm';
  const modalBg = isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-slide-in text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Examination Schedules & Routines
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage academic terms, dynamic class timetables, make-up exams, and live student routines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowMakeUpModal(true)}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all shadow-sm"
          >
            <span>⚡</span>
            <span>Schedule Make-up Exam</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-indigo-500/20"
          >
            <span>➕</span>
            <span>Create Examination</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Exams</span>
            <span className="text-xl">📚</span>
          </div>
          <p className={`text-2xl font-extrabold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.total}</p>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 font-medium">Across all academic terms</p>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Published & Live</span>
            <span className="text-xl">🚀</span>
          </div>
          <p className={`text-2xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400`}>{stats.published}</p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">Visible on student portals</p>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Make-up Sessions</span>
            <span className="text-xl">⚡</span>
          </div>
          <p className={`text-2xl font-extrabold mt-2 text-amber-600 dark:text-amber-400`}>{stats.makeupCount}</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1 font-medium">Special & targeted make-ups</p>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Upcoming / Active</span>
            <span className="text-xl">📅</span>
          </div>
          <p className={`text-2xl font-extrabold mt-2 text-blue-600 dark:text-blue-400`}>{stats.upcoming}</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1 font-medium">Ongoing & upcoming terms</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border mb-6 ${cardBg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b lg:border-b-0 pb-2 lg:pb-0 border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Examinations ({exams.length})
            </button>
            <button
              onClick={() => setActiveTab('makeup')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'makeup' ? 'bg-amber-600 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-600 hover:text-amber-700'}`}
            >
              <span>⚡</span> Make-up Exams ({stats.makeupCount})
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Search subject or exam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl border ${inputBg}`}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
            </div>

            {/* Academic Term */}
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className={`text-xs px-3 py-2 rounded-xl border ${inputBg}`}
            >
              <option value="ALL">All Academic Terms</option>
              {meta.academicTerms?.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>

            {/* Exam Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`text-xs px-3 py-2 rounded-xl border ${inputBg}`}
            >
              <option value="ALL">All Exam Types</option>
              <option value="term_exam">Term Exam</option>
              <option value="midterm">Midterm</option>
              <option value="final_exam">Final Exam</option>
              <option value="class_test">Class Test</option>
              <option value="makeup_exam">Make-up Exam</option>
              <option value="model_test">Model Test</option>
              <option value="practical">Practical Exam</option>
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`text-xs px-3 py-2 rounded-xl border ${inputBg}`}
            >
              <option value="ALL">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Examinations List */}
      {loading ? (
        <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
          <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading examination schedules...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
          <div className="text-4xl mb-3">📋</div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>No examination schedules found</h3>
          <p className={`text-xs mt-1 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {searchTerm || selectedTerm !== 'ALL' || selectedType !== 'ALL'
              ? 'Try resetting the filters or searching with another keyword.'
              : 'Create your first examination schedule to organize subjects, timings, and class routines.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 btn-primary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
          >
            <span>➕</span> Create Examination
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const isExpanded = expandedExamId === exam._id;
            const routinesCount = (exam.routines || []).length;
            const distinctClasses = Array.from(new Set((exam.routines || []).map((r) => r.className)));
            const typeConfig = EXAM_TYPE_LABELS[exam.examType] || EXAM_TYPE_LABELS.other;

            return (
              <div
                key={exam._id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${cardBg} ${isExpanded ? 'ring-2 ring-indigo-500/20 shadow-md' : 'hover:border-indigo-300 dark:hover:border-slate-700'}`}
              >
                {/* Exam Card Header */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border ${typeConfig.color}`}>
                      {exam.isMakeUp ? '⚡' : '📝'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {exam.title}
                        </h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGES[exam.status] || STATUS_BADGES.draft}`}>
                          {exam.status}
                        </span>
                        {exam.isMakeUp && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                            MAKE-UP EXAM
                          </span>
                        )}
                      </div>

                      <div className={`flex flex-wrap items-center gap-y-1 gap-x-3 text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>🏛️ <strong>{exam.academicTerm}</strong> ({exam.academicYear})</span>
                        <span>•</span>
                        <span>📅 {new Date(exam.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {new Date(exam.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span>•</span>
                        <span>📊 <strong>{routinesCount}</strong> subject slots ({distinctClasses.length} classes)</span>
                      </div>

                      {exam.description && (
                        <p className={`text-xs mt-1.5 line-clamp-1 italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {exam.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                    {/* One-click publish toggle */}
                    <button
                      onClick={() => handleTogglePublish(exam)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        exam.status === 'published'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                      title={exam.status === 'published' ? 'Click to unpublish/draft' : 'Click to publish schedule dynamically'}
                    >
                      <span className={`w-2 h-2 rounded-full ${exam.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{exam.status === 'published' ? 'Live & Published' : 'Publish Schedule'}</span>
                    </button>

                    {/* Print */}
                    <button
                      onClick={() => handlePrintExam(exam)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                      title="Print routine sheet"
                    >
                      🖨️
                    </button>

                    {/* Edit Exam */}
                    <button
                      onClick={() => handleOpenEditExam(exam)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                      title="Edit examination details"
                    >
                      ✏️
                    </button>

                    {/* Delete Exam */}
                    <button
                      onClick={() => handleDeleteExam(exam._id)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                      title="Delete examination"
                    >
                      🗑️
                    </button>

                    {/* Expand/Collapse Routine View */}
                    <button
                      onClick={() => setExpandedExamId(isExpanded ? null : exam._id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        isExpanded
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{isExpanded ? 'Hide Routine' : 'View Routine'}</span>
                      <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Routine Details & Builder */}
                {isExpanded && (
                  <div className={`p-5 border-t ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          Class & Section Routine Slots ({routinesCount})
                        </h4>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Timings, classroom allocation, total marks, and invigilators for each subject.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenAddSlot(exam)}
                        className="btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                      >
                        <span>➕</span> Add Subject Slot
                      </button>
                    </div>

                    {routinesCount === 0 ? (
                      <div className={`p-8 text-center rounded-xl border border-dashed ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                        <p className="text-xs">No examination routine slots configured yet.</p>
                        <button
                          onClick={() => handleOpenAddSlot(exam)}
                          className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          + Add first class subject slot
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className={`font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            <tr>
                              <th className="p-3">Class & Sec</th>
                              <th className="p-3">Subject</th>
                              <th className="p-3">Date & Day</th>
                              <th className="p-3">Time Slot</th>
                              <th className="p-3">Room / Hall</th>
                              <th className="p-3">Marks (Pass)</th>
                              <th className="p-3">Invigilator</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {exam.routines.map((slot) => (
                              <tr
                                key={slot._id}
                                className={`transition-colors ${slot.isMakeUp ? 'bg-amber-50/60 dark:bg-amber-950/20' : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                  <div className="flex items-center gap-1.5">
                                    <span>{slot.className}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                      {slot.section || 'All'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                  <div className="flex items-center gap-2">
                                    <span>{slot.subject}</span>
                                    {slot.isMakeUp && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200" title={slot.makeUpReason || 'Make-up exam'}>
                                        Make-up
                                      </span>
                                    )}
                                  </div>
                                  {slot.targetStudentIds && slot.targetStudentIds.length > 0 && (
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                      Targets: {slot.targetStudentIds.join(', ')}
                                    </p>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-300">
                                  {new Date(slot.examDate).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    weekday: 'short',
                                  })}
                                </td>
                                <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                                  {slot.startTime} – {slot.endTime}
                                  {slot.durationMinutes && <span className="text-[10px] text-slate-400 block">{slot.durationMinutes} mins</span>}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-300">
                                  {slot.classroom || '—'}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-300">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{slot.totalMarks}</span>
                                  <span className="text-[10px] text-slate-400"> (min {slot.passMarks})</span>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-300">
                                  {slot.invigilator || '—'}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleOpenEditSlot(exam, slot)}
                                      className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                      title="Edit slot"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSlot(exam._id, slot._id)}
                                      className="p-1 rounded text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                      title="Delete slot"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT EXAMINATION ================= */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-fade-up ${modalBg}`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold">
                {editingExamId ? 'Edit Examination Schedule' : 'Create Examination Schedule'}
              </h3>
              <button
                onClick={() => setShowExamModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                  Examination Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Examination 2026 / Midterm Assessment"
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Academic Term *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Term 1 / Half Yearly / Final"
                    value={examForm.academicTerm}
                    onChange={(e) => setExamForm({ ...examForm, academicTerm: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2026"
                    value={examForm.academicYear}
                    onChange={(e) => setExamForm({ ...examForm, academicYear: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Examination Type *
                  </label>
                  <select
                    value={examForm.examType}
                    onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  >
                    <option value="term_exam">Term Examination</option>
                    <option value="midterm">Midterm Examination</option>
                    <option value="final_exam">Final Examination</option>
                    <option value="class_test">Class Test</option>
                    <option value="makeup_exam">Make-up / Special Exam</option>
                    <option value="model_test">Model Test</option>
                    <option value="practical">Practical / Lab Exam</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <select
                    value={examForm.status}
                    onChange={(e) => setExamForm({ ...examForm, status: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Live for students)</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={examForm.startDate}
                    onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={examForm.endDate}
                    onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                  General Instructions / Syllabus Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Instructions for students, examination rules, calculator permissions, etc."
                  value={examForm.description}
                  onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2 rounded-xl text-sm font-medium"
                >
                  {submitting ? 'Saving...' : editingExamId ? 'Save Changes' : 'Create Examination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT ROUTINE SLOT ================= */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-fade-up ${modalBg}`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold">
                  {editingSlotId ? 'Edit Subject Routine Slot' : 'Add Subject Routine Slot'}
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {slotTargetExam?.title} ({slotTargetExam?.academicTerm})
                </p>
              </div>
              <button
                onClick={() => setShowSlotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 10 / Class 8"
                    value={slotForm.className}
                    onChange={(e) => setSlotForm({ ...slotForm, className: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Section
                  </label>
                  <input
                    type="text"
                    placeholder="All or A / B / C"
                    value={slotForm.section}
                    onChange={(e) => setSlotForm({ ...slotForm, section: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, English 1st Paper, Physics"
                  value={slotForm.subject}
                  onChange={(e) => setSlotForm({ ...slotForm, subject: e.target.value })}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={slotForm.examDate}
                    onChange={(e) => setSlotForm({ ...slotForm, examDate: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204 / Auditorium"
                    value={slotForm.classroom}
                    onChange={(e) => setSlotForm({ ...slotForm, classroom: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Invigilator / Teacher
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Rafiqul Islam"
                    value={slotForm.invigilator}
                    onChange={(e) => setSlotForm({ ...slotForm, invigilator: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={slotForm.totalMarks}
                    onChange={(e) => setSlotForm({ ...slotForm, totalMarks: Number(e.target.value) })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Pass Marks
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={slotForm.passMarks}
                    onChange={(e) => setSlotForm({ ...slotForm, passMarks: Number(e.target.value) })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              {/* Make-up Slot specifics */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${slotForm.isMakeUp ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMakeUpSlot"
                    checked={slotForm.isMakeUp}
                    onChange={(e) => setSlotForm({ ...slotForm, isMakeUp: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="isMakeUpSlot" className="text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                    ⚡ Flag as Make-up / Special Examination Slot
                  </label>
                </div>

                {slotForm.isMakeUp && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Reason for Make-up Exam
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Medical leave during regular session / Rescheduled"
                        value={slotForm.makeUpReason}
                        onChange={(e) => setSlotForm({ ...slotForm, makeUpReason: e.target.value })}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Target Student IDs (Optional, comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. STU-2026-0001, STU-2026-0045 (leave blank for whole class)"
                        value={slotForm.targetStudentIdsStr}
                        onChange={(e) => setSlotForm({ ...slotForm, targetStudentIdsStr: e.target.value })}
                        className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                  Specific Instructions / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bring drawing instruments, arrive 15 minutes before"
                  value={slotForm.instructions}
                  onChange={(e) => setSlotForm({ ...slotForm, instructions: e.target.value })}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2 rounded-xl text-sm font-medium"
                >
                  {submitting ? 'Saving...' : editingSlotId ? 'Update Slot' : 'Add to Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK MAKE-UP SCHEDULER ================= */}
      {showMakeUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-fade-up ${modalBg}`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-lg font-bold">Schedule Make-up Examination</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Create a dedicated make-up session for specific students or whole classes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMakeUpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMakeUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                  Attach to Existing Exam Schedule (Optional)
                </label>
                <select
                  value={makeUpForm.parentExamId}
                  onChange={(e) => {
                    const parent = exams.find((x) => x._id === e.target.value);
                    setMakeUpForm({
                      ...makeUpForm,
                      parentExamId: e.target.value,
                      title: parent ? `Make-up: ${parent.title}` : makeUpForm.title,
                      academicTerm: parent ? parent.academicTerm : makeUpForm.academicTerm,
                      academicYear: parent ? parent.academicYear : makeUpForm.academicYear,
                    });
                  }}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                >
                  <option value="">Create Standalone Make-up Exam</option>
                  {exams.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.title} ({ex.academicTerm} - {ex.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                  Make-up Examination Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Make-up Exam: Mathematics (Term 1)"
                  value={makeUpForm.title}
                  onChange={(e) => setMakeUpForm({ ...makeUpForm, title: e.target.value })}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 10"
                    value={makeUpForm.className}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, className: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Higher Mathematics"
                    value={makeUpForm.subject}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, subject: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Make-up Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={makeUpForm.examDate}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, examDate: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={makeUpForm.startTime}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, startTime: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={makeUpForm.endTime}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, endTime: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special Exam Hall 101"
                    value={makeUpForm.classroom}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, classroom: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">
                    Invigilator
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Rafiqul Islam"
                    value={makeUpForm.invigilator}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, invigilator: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${inputBg}`}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                    Reason for Make-up Exam *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Medical absence / Officially approved leave"
                    value={makeUpForm.makeUpReason}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, makeUpReason: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                    Target Student IDs (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STU-2026-0001, STU-2026-0012 (leave blank to include all students in class)"
                    value={makeUpForm.targetStudentIdsStr}
                    onChange={(e) => setMakeUpForm({ ...makeUpForm, targetStudentIdsStr: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
                  />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                    Only targeted students will see this make-up exam in their personalized routine profile.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMakeUpModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                >
                  {submitting ? 'Scheduling...' : 'Schedule & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
