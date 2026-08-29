const mongoose = require('mongoose');

// One row per email attempt. Lets admins/support confirm whether a
// notification (admission confirmation, fee receipt, result alert, etc.)
// actually reached the recipient's inbox, since sendEmail() itself never
// throws back to the caller (a failed send must never block the request
// that triggered it).
const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true },
    // Groups related sends for the "why was this email sent" question,
    // e.g. 'admission_confirmation', 'fee_receipt', 'result_published',
    // 'exam_reminder', 'fee_reminder', 'notice', 'routine_change'.
    category: { type: String, required: true, index: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    status: { type: String, enum: ['sent', 'failed'], required: true, index: true },
    // Provider message id when available (Gmail API returns one; SMTP via
    // Nodemailer returns a messageId too) - useful for tracing a specific
    // delivery with the provider if a recipient says they never got it.
    providerMessageId: { type: String },
    transport: { type: String, enum: ['gmail_api', 'smtp'], required: true },
    error: { type: String },
    // Optional idempotency key for reminder-style emails that a daily job
    // might otherwise re-send (e.g. "exam_reminder:<examId>:<slotId>:<studentId>").
    // The unique index (sparse, so non-reminder emails without a key are
    // unaffected) guarantees a reminder is recorded at most once even if the
    // job runs twice or two instances overlap.
    dedupeKey: { type: String },
  },
  { timestamps: true }
);

emailLogSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);

