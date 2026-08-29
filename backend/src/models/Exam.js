const mongoose = require('mongoose');

const routineSlotSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true }, // e.g. "Class 8", "Class 10"
    section: { type: String, default: 'All', trim: true }, // "A", "B", or "All"
    subject: { type: String, required: true, trim: true }, // e.g. "Higher Mathematics", "English 1st Paper"
    examDate: { type: Date, required: true }, // specific calendar date for the exam slot
    startTime: { type: String, required: true, trim: true }, // "10:00" (24h or HH:mm)
    endTime: { type: String, required: true, trim: true }, // "13:00"
    durationMinutes: { type: Number }, // computed or custom duration
    classroom: { type: String, trim: true }, // e.g. "Room 201", "Main Auditorium"
    invigilator: { type: String, trim: true }, // e.g. "Mr. Rafiqul Islam"
    totalMarks: { type: Number, default: 100 },
    passMarks: { type: Number, default: 33 },
    instructions: { type: String, trim: true }, // specific room/subject instructions
    isMakeUp: { type: Boolean, default: false },
    targetStudentIds: [{ type: String, trim: true }], // Student IDs (e.g. STU-2026-0001) if restricted to certain students
    targetStudentNames: [{ type: String, trim: true }],
    makeUpReason: { type: String, trim: true },
  },
  { timestamps: true }
);

const examSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true, trim: true }, // e.g. "Half Yearly Examination 2026", "Final Term Assessment"
    academicTerm: {
      type: String,
      required: true,
      trim: true, // e.g. "Term 1", "Term 2", "Final Term", "Half Yearly", "Annual", "Summer Term"
    },
    academicYear: { type: String, required: true, default: () => String(new Date().getFullYear()) }, // e.g. "2026"
    examType: {
      type: String,
      enum: ['term_exam', 'midterm', 'final_exam', 'class_test', 'makeup_exam', 'model_test', 'practical', 'other'],
      default: 'term_exam',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, trim: true }, // Syllabus coverage, general instructions, grading rules
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    isMakeUp: { type: Boolean, default: false },
    makeUpReason: { type: String, trim: true },
    publishedAt: { type: Date },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    routines: [routineSlotSchema],
  },
  { timestamps: true }
);

// Optimize query performance for tenant-scoped exams and student routine lookup
examSchema.index({ school: 1, status: 1, academicTerm: 1 });
examSchema.index({ school: 1, 'routines.className': 1, 'routines.section': 1 });
examSchema.index({ school: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Exam', examSchema);
