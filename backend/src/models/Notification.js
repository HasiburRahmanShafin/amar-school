const mongoose = require('mongoose');

// One row per in-app notification (shown via the bell icon in the header).
// This is deliberately separate from EmailLog: EmailLog tracks whether an
// email was delivered, this tracks what the user sees/has read inside the
// app itself. The same event (e.g. an attendance alert) commonly creates
// both - one email, one Notification - independently of each other.
const notificationSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Groups notifications by what triggered them, e.g. 'attendance_alert',
    // 'fee_receipt', 'notice' - lets the UI pick an icon/color per type.
    type: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    // Optional client-side route to send the user to when they click the
    // notification, e.g. '/parent/child-profile'.
    link: { type: String },
    read: { type: Boolean, default: false },
    // Optional idempotency key, mirroring EmailLog's dedupeKey - lets a
    // notification-generating action (e.g. hitting an absence threshold) be
    // re-triggered safely (attendance resubmitted for the same day) without
    // creating duplicate notifications for the same underlying event.
    dedupeKey: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

// The bell icon always queries "this user's notifications, newest first" -
// and separately "how many of this user's are unread" for the badge count.
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
