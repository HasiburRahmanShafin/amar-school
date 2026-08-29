const mongoose = require('mongoose');

// One row per student inside a single day's register for a class/section.
const attendanceRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  },
  { _id: false }
);

// A single day's attendance register for one class/section. Teachers submit
// one of these per class per day (upserted, so re-submitting the same day
// edits it instead of creating a duplicate). Attendance history, percentage
// calculations, and the "5 consecutive absences" alert are all derived by
// querying this collection - there's no separate per-student duplication.
const attendanceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    class: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    // Normalized to midnight (see attendance.controller.js) so there's ever
    // only one register per class/section/day.
    date: { type: Date, required: true },
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    records: [attendanceRecordSchema],
  },
  { timestamps: true }
);

attendanceSchema.index({ schoolId: 1, class: 1, section: 1, date: 1 }, { unique: true });
// Speeds up "give me this student's attendance history" queries.
attendanceSchema.index({ schoolId: 1, 'records.student': 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
