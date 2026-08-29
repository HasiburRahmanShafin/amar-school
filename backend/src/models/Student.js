const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: String, unique: true }, // auto-generated ID card number
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    bloodGroup: { type: String },
    photoUrl: { type: String },
    address: { type: String, required: true },

    guardianName: { type: String, required: true },
    guardianPhone: { type: String, required: true },
    guardianEmail: { type: String, lowercase: true },
    guardianRelation: { type: String, default: 'Parent' },
    parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Optional login account for the student themselves (role: 'student').
    // Mirrors Teacher.userId - a profile can exist before a login is issued.
    // Used by the Attendance and Online Fee Payment modules so a student can
    // sign in and see their own attendance history / pay their own dues.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    currentClass: { type: String, required: true },
    section: { type: String, required: true },
    rollNumber: { type: String },

    academicHistory: [
      {
        year: { type: Number, required: true },
        class: { type: String, required: true },
        section: { type: String },
        result: { type: String },
      },
    ],

    status: { type: String, enum: ['active', 'promoted', 'graduated', 'inactive'], default: 'active' },
    admissionDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

studentSchema.pre('save', async function generateStudentId(next) {
  if (this.studentId) return next();
  const year = new Date().getFullYear();
  const count = await mongoose.model('Student').countDocuments({ schoolId: this.schoolId });
  this.studentId = `STU-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Student', studentSchema);
