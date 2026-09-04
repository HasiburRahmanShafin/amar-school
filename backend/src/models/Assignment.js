const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    fileUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
