const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    class: { type: String, required: true },
    section: { type: String },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
