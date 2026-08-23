const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
      required: true,
    },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'active',
    },

    // ---- Attendance Management module ----
    // Only populated for role === 'student'. className/section identify
    // which class roster the student appears on; guardianEmail is where
    // automated irregular-attendance alerts are sent (kept here, rather
    // than requiring a linked parent account, so alerts work even before
    // a parent has registered/logged in).
    studentInfo: {
      className: { type: String, trim: true },
      section: { type: String, trim: true },
      roll: { type: String, trim: true },
      guardianName: { type: String, trim: true },
      guardianEmail: { type: String, trim: true, lowercase: true },
      // Date of the most recent 5-consecutive-absence alert email sent
      // for this student, so the same streak doesn't re-trigger an email
      // every subsequent day it continues (see attendance.controller.js).
      lastAbsenceAlertDate: { type: Date },
    },

    // Only populated for role === 'teacher'. A teacher can be assigned to
    // more than one class/section (e.g. "Class 6 - A" and "Class 7 - B"),
    // each of which shows up as a separate roster they can take
    // attendance for.
    teacherInfo: {
      assignedClasses: [
        {
          className: { type: String, trim: true },
          section: { type: String, trim: true },
          _id: false,
        },
      ],
    },

    // Only populated for role === 'parent'. References the student
    // accounts this parent is allowed to view (attendance history,
    // report cards, etc).
    parentInfo: {
      children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
  },
  { timestamps: true }
);

// Every attendance roster lookup filters students by school + class +
// section, so index it for speed.
userSchema.index({ school: 1, role: 1, 'studentInfo.className': 1, 'studentInfo.section': 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
