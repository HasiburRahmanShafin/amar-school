const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    feeType: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' },
    paidDate: { type: Date },
    academicYear: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeePayment', feePaymentSchema);
