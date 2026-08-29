const mongoose = require('mongoose');

const markEntrySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    rollNumber: { type: String, trim: true },
    theoryMarks: { type: Number, default: 0 },
    practicalMarks: { type: Number, default: 0 },
    marksObtained: { type: Number, required: true, default: 0 },
    percentage: { type: Number, default: 0 },
    gradePoint: { type: Number, default: 0.0 },
    letterGrade: { type: String, default: 'F', trim: true },
    attendancePercentage: { type: Number, default: 100, min: 0, max: 100 },
    teacherComments: { type: String, trim: true },
    isAbsent: { type: Boolean, default: false },
  },
  { _id: true }
);

const examResultSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    academicTerm: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, default: 'All' },
    subject: { type: String, required: true, trim: true },

    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    teacherName: { type: String, trim: true },

    maxMarks: { type: Number, default: 100 },
    passMarks: { type: Number, default: 33 },
    theoryMaxMarks: { type: Number, default: 100 },
    practicalMaxMarks: { type: Number, default: 0 },

    entries: [markEntrySchema],

    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'published'],
      default: 'draft',
    },

    submittedAt: { type: Date },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    adminFeedback: { type: String, trim: true },
  },
  { timestamps: true }
);

// Compound index to guarantee one mark sheet per class/section/subject/exam per school
examResultSchema.index(
  { school: 1, exam: 1, className: 1, section: 1, subject: 1 },
  { unique: true }
);

// Indexes for fast lookup by tenant, status, class, and exam
examResultSchema.index({ school: 1, status: 1 });
examResultSchema.index({ school: 1, exam: 1, status: 1 });
examResultSchema.index({ school: 1, className: 1, section: 1 });
examResultSchema.index({ school: 1, 'entries.studentId': 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
