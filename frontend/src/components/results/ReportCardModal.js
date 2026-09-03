import { useRef } from 'react';

export default function ReportCardModal({ isOpen, onClose, reportData, isDark }) {
  const printContainerRef = useRef(null);

  if (!isOpen || !reportData) return null;

  const { school, exam, student, summary, subjects = [], gradingScale = [] } = reportData;

  const handlePrint = () => {
    window.print();
  };

  const getGradeBadgeColor = (grade) => {
    switch (grade) {
      case 'A+':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300';
      case 'A':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300';
      case 'A-':
        return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300';
      case 'B':
        return 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300';
      case 'C':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300';
      case 'D':
        return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300';
      default:
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      {/* Container */}
      <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl border transition-all ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      } max-h-[92vh] flex flex-col`}>
        
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              🎓
            </div>
            <div>
              <h2 className="text-base font-bold">Academic Progress & Report Card</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{student?.name} · {exam?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              id="report-card-print-btn"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Printable Report Card Body */}
        <div ref={printContainerRef} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4 print:text-black print:bg-white">
          
          {/* Institutional Header */}
          <div className="text-center border-b pb-6 border-slate-200 dark:border-slate-800 print:border-slate-400">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/30">
                🏛️
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white print:text-black uppercase">
                  {school?.name || 'Amar School'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-700">
                  {school?.address || 'Government Approved Institution'} {school?.eiin ? `· EIIN: ${school.eiin}` : ''}
                </p>
              </div>
            </div>
            
            <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider print:bg-slate-100 print:text-black print:border-slate-300">
              OFFICIAL ACADEMIC TRANSCRIPT & PROGRESS REPORT
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
              {exam?.title} ({exam?.academicTerm} - {exam?.academicYear})
            </p>
          </div>

          {/* Student Info Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs print:bg-slate-50 print:border-slate-300">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Student Name:</span>
              <span className="font-bold text-slate-900 dark:text-white print:text-black text-sm">{student?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Student ID:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 print:text-black">{student?.studentId}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Class & Section:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{student?.currentClass} - Section {student?.section || 'A'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Roll Number:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 print:text-black text-sm">{student?.rollNumber || 'N/A'}</span>
            </div>
          </div>

          {/* Marks Breakdown Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 print:bg-slate-100 text-slate-700 dark:text-slate-300 print:text-black font-semibold">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Subject Name</th>
                  <th className="py-3 px-2 text-center">Full Marks</th>
                  <th className="py-3 px-2 text-center">Theory</th>
                  <th className="py-3 px-2 text-center">Practical</th>
                  <th className="py-3 px-2 text-center">Obtained</th>
                  <th className="py-3 px-2 text-center">Highest</th>
                  <th className="py-3 px-2 text-center">Grade Point</th>
                  <th className="py-3 px-2 text-center">Letter Grade</th>
                  <th className="py-3 px-3">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                {subjects.map((subj, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white print:text-black">{subj.subject}</td>
                    <td className="py-2.5 px-2 text-center font-medium">{subj.maxMarks || 100}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{subj.isAbsent ? '—' : (subj.theoryMarks ?? subj.marksObtained)}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{subj.isAbsent ? '—' : (subj.practicalMarks || 0)}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900 dark:text-white print:text-black font-mono">
                      {subj.isAbsent ? <span className="text-rose-500 font-bold">ABS</span> : subj.marksObtained}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 font-mono">{subj.highestMarkInClass || '—'}</td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400 print:text-black">
                      {subj.gradePoint?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getGradeBadgeColor(subj.letterGrade)}`}>
                        {subj.letterGrade}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 print:text-slate-700 italic">
                      {subj.teacherComments || 'Satisfactory'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-gradient-to-br from-indigo-900/10 via-purple-900/10 to-transparent dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-center print:border-slate-300">
            <div className="p-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total Marks</p>
              <p className="text-lg font-black text-slate-900 dark:text-white print:text-black">
                {summary?.totalMarksObtained} <span className="text-xs font-normal text-slate-400">/ {summary?.totalMaxMarks}</span>
              </p>
            </div>
            <div className="p-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Overall GPA</p>
              <p className={`text-xl font-black ${summary?.overallGPA >= 4.0 ? 'text-emerald-600 dark:text-emerald-400' : summary?.overallGPA > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'} print:text-black`}>
                {summary?.overallGPA?.toFixed(2)}
              </p>
            </div>
            <div className="p-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Overall Grade</p>
              <p className="text-xl font-black text-purple-600 dark:text-purple-400 print:text-black">
                {summary?.overallGrade}
              </p>
            </div>
            <div className="p-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Class Rank</p>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 print:text-black">
                #{summary?.classRank} <span className="text-xs font-normal text-slate-400">of {summary?.totalStudentsInClass}</span>
              </p>
            </div>
            <div className="p-2 col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Attendance</p>
              <p className="text-lg font-black text-teal-600 dark:text-teal-400 print:text-black">
                {summary?.averageAttendance}%
              </p>
            </div>
          </div>

          {/* Grading Scale & Remarks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Grading Scale Box */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">Grading System Scale</p>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center">
                {gradingScale.map((g, i) => (
                  <div key={i} className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold block text-slate-800 dark:text-slate-200">{g.grade} ({g.gpa.toFixed(1)})</span>
                    <span className="text-slate-500">{g.minPercentage}%+</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks Box */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Academic Remarks & Assessment</p>
                <p className="text-slate-600 dark:text-slate-400 italic">
                  "{summary?.remarks || 'Good academic standing with steady class participation.'}"
                </p>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">
                Result Published on: {new Date(summary?.publishedDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Signatures Area */}
          <div className="pt-12 pb-4 grid grid-cols-3 gap-6 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-black">
            <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
              Class Teacher's Signature
            </div>
            <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
              Guardian's Signature
            </div>
            <div className="border-t border-slate-400 dark:border-slate-600 pt-2">
              Headmaster / Principal
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
