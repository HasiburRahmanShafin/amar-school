const mongoose = require('mongoose');

// One fee payment. Online payments (SSLCommerz/Bkash, handled elsewhere)
// and manual front-desk entries (cash/bank) both land here as the single
// source of truth Financial Reports is built on top of.
const transactionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized so reports/exports don't need a populate + join for every row
    studentName: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    section: { type: String, trim: true },

    feeType: {
      type: String,
      enum: ['tuition', 'exam', 'other'],
      required: true,
    },
    label: { type: String, trim: true }, // matches FeeStructure.label for "other" fees

    amount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'bkash', 'sslcommerz'],
      default: 'cash',
    },
    transactionRef: { type: String, trim: true }, // gateway reference, if any

    academicYear: { type: String, required: true, trim: true },
    paymentDate: { type: Date, required: true, default: Date.now },

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Financial reports always filter by school + date range, and often by
// class/type on top of that.
transactionSchema.index({ school: 1, paymentDate: -1 });
transactionSchema.index({ school: 1, className: 1, feeType: 1 });
transactionSchema.index({ school: 1, student: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
