const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    examName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    class: { type: String, required: true },
    academicYear: { type: Number, default: () => new Date().getFullYear() },
    marksObtained: { type: Number, required: true },
    totalMarks: { type: Number, required: true, default: 100 },
    grade: { type: String, trim: true },
  },
  { timestamps: true }
);

examResultSchema.index({ schoolId: 1, studentId: 1 });
examResultSchema.index({ schoolId: 1, class: 1, academicYear: 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
