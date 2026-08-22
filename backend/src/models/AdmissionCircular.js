const mongoose = require('mongoose');

const admissionCircularSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    classOrGrade: { type: String, required: true },
    totalSeats: { type: Number, required: true, min: 1 },
    requirements: [{ type: String }],
    applicationDeadline: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdmissionCircular', admissionCircularSchema);
