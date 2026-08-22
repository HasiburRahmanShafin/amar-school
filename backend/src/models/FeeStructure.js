const mongoose = require('mongoose');

// Defines how much a given class is expected to pay for a given fee type in
// a given academic year. Financial Reports compares this "required" amount
// against what Transaction records show as actually paid, per student, to
// work out pending dues (see financial.controller.js:getPendingDuesByClass).
const feeStructureSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    academicYear: { type: String, required: true, trim: true }, // e.g. "2026"
    className: { type: String, required: true, trim: true }, // e.g. "Class 8"
    feeType: {
      type: String,
      enum: ['tuition', 'exam', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    // Optional label shown next to "other" fees, e.g. "Lab Fee", "Transport Fee"
    label: { type: String, trim: true },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One required-amount entry per class/type/year/label per school - saving
// again for the same combination updates it in place (see upsertFeeStructure).
feeStructureSchema.index(
  { school: 1, academicYear: 1, className: 1, feeType: 1, label: 1 },
  { unique: true }
);

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
