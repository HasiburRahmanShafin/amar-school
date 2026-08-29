const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['notice', 'emergency', 'holiday', 'exam_timetable', 'event'],
      default: 'notice',
    },
    // Date range covered by this notice/event (e.g. holiday start->end,
    // exam timetable window, or a single-day event where start === end).
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    attachmentUrl: { type: String },
    attachmentName: { type: String },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Subdocument _id of the entry this notice created in
    // School.academicCalendar, so it can be kept in sync on edit/delete.
    calendarEventId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

// Every notice query in the app filters by school, so index it for speed
noticeSchema.index({ school: 1, startDate: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
