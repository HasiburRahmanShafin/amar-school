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
    // Each document is a labeled Uploadcare CDN URL, e.g.
    // { label: 'Birth Certificate', url: 'https://ucarecdn.com/<uuid>/' }
    // Kept as a flexible array (rather than fixed fields) so new document
    // types can be added later without a schema migration.
    documents: [
      {
        label: { type: String, required: true, trim: true },
        url: { type: String, required: true },
      },
    ],
    status: { type: String, enum: ['pending', 'reviewed', 'approved', 'rejected'], default: 'pending' },
    reviewNote: { type: String },
    resultPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Applicant', applicantSchema);
