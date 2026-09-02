const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema(
  {
    circularId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdmissionCircular', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    guardianName: { type: String, required: true },
    guardianPhone: { type: String, required: true },
    guardianEmail: { type: String, required: true, lowercase: true },
    address: { type: String, required: true },
    previousSchool: { type: String },
    documents: [{ type: String }],
    status: { type: String, enum: ['pending', 'reviewed', 'approved', 'rejected'], default: 'pending' },
    reviewNote: { type: String },
    resultPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Applicant', applicantSchema);
