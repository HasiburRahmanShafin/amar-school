const mongoose = require('mongoose');

// One Attendance document = one class/section's roll-call for one
// calendar day. All students marked by the teacher that day live in
// `records`, so a single upsert covers "take attendance for today".
const attendanceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },

    // Normalized to midnight (see normalizeToMidnight in the controller)
    // so a class can only have one attendance record per calendar day,
    // regardless of what time the teacher actually submits it.
    date: { type: Date, required: true },

    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    records: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        status: {
          type: String,
          enum: ['present', 'absent', 'late'],
          required: true,
        },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// A class/section can only be marked once per day - re-submitting the
// same day just updates this document instead of creating a duplicate.
attendanceSchema.index({ school: 1, className: 1, section: 1, date: 1 }, { unique: true });
// Powers "attendance history for this student" queries (student/parent view).
attendanceSchema.index({ school: 1, 'records.student': 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
