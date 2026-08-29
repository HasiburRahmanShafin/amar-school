const mongoose = require('mongoose');

// One payment made against a ledger entry. A single month's fee can be
// settled in more than one transaction (e.g. a partial payment now, the
// remainder later), so this is an array rather than a single field.
const paymentSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['card', 'mobile_banking', 'bank'], required: true },
    paidAt: { type: Date, default: Date.now },
    // Non-sensitive fragments only - this app never stores full card/account
    // numbers. See fee.controller.js for how the mock gateway masks these.
    payerReference: { type: String },
  },
  { _id: false }
);

// A single month's fee ledger entry for one student: what's charged, what's
// been paid, and what's still due. Tuition/exam/other charges and any
// discount are set up by the school admin; students pay against dueAmount
// through the mock payment gateway in fee.controller.js.
const feeLedgerSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },

    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 }, // 1 = January

    tuitionFee: { type: Number, default: 0, min: 0 },
    examFee: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },

    paidAmount: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },

    payments: [paymentSchema],
  },
  { timestamps: true }
);

feeLedgerSchema.index({ schoolId: 1, studentId: 1, year: 1, month: 1 }, { unique: true });

// totalAmount / dueAmount are always derived from the charge fields, never
// stored directly, so they can never drift out of sync with a manual edit.
feeLedgerSchema.virtual('totalAmount').get(function totalAmount() {
  return this.tuitionFee + this.examFee + this.otherCharges + this.lateFee - this.discount;
});
feeLedgerSchema.virtual('dueAmount').get(function dueAmount() {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

feeLedgerSchema.set('toJSON', { virtuals: true });
feeLedgerSchema.set('toObject', { virtuals: true });

feeLedgerSchema.pre('save', function syncStatus(next) {
  if (this.paidAmount <= 0) this.status = 'unpaid';
  else if (this.paidAmount >= this.totalAmount) this.status = 'paid';
  else this.status = 'partial';
  next();
});

module.exports = mongoose.model('FeeLedger', feeLedgerSchema);
