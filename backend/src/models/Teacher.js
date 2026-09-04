const mongoose = require('mongoose');

// One row of a teacher's class schedule: "teaches <subject> to <class>-<section>".
// Attendance & Result Management (Module 3) query this sub-array directly instead
// of maintaining their own copy of who-teaches-what.
const assignedClassSchema = new mongoose.Schema(
  {
    class: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const teacherSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: String, unique: true }, // auto-generated staff ID, e.g. TCH-2026-0004

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    photoUrl: { type: String },

    qualifications: [{ type: String, trim: true }],
    department: { type: String, required: true, trim: true },
    dateOfJoining: { type: Date, required: true },

    subjects: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one subject must be assigned',
      },
    },

    // Class schedule - drives the automatic class/section link mentioned in the
    // requirements. Kept as an embedded array (not a separate collection) since
    // it's always read/written together with the teacher who owns it.
    assignedClasses: [assignedClassSchema],

    // Optional link to a login account. Teacher profiles can exist before an
    // account is provisioned, mirroring how Student.parentUserId works.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: { type: String, enum: ['active', 'on_leave', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

teacherSchema.pre('save', async function generateTeacherId(next) {
  if (this.teacherId) return next();
  const year = new Date().getFullYear();
  let count = await mongoose.model('Teacher').countDocuments({ schoolId: this.schoolId });
  let candidate = `TCH-${year}-${String(count + 1).padStart(4, '0')}`;
  while (await mongoose.model('Teacher').exists({ teacherId: candidate })) {
    count++;
    candidate = `TCH-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  this.teacherId = candidate;
  next();
});

module.exports = mongoose.model('Teacher', teacherSchema);
