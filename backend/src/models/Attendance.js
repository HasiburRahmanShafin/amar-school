const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
