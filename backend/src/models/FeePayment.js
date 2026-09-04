const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    feeType: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['paid', 'pending', 'processing', 'overdue'], default: 'pending' },
    paidDate: { type: Date },
    academicYear: { type: Number, required: true },

    // ---- Online payment (SSLCommerz) tracking ----
    paymentMethod: { type: String, enum: ['cash', 'bank', 'sslcommerz'], default: 'cash' },
    tranId: { type: String, trim: true }, // our generated transaction id, sent to SSLCommerz as tran_id
    valId: { type: String, trim: true }, // SSLCommerz validation id, returned on successful payment
    gatewayResponse: { type: mongoose.Schema.Types.Mixed }, // raw response from the validation API, for support/debugging
    failureReason: { type: String, trim: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // parent/student user who completed the payment
  },
  { timestamps: true }
);

// A pending fee can be looked up by its in-flight tranId while the user is
// off on the gateway's site; paid/failed fees keep the tranId as a record.
feePaymentSchema.index({ tranId: 1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
