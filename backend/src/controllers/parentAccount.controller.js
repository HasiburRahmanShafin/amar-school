const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');

// Admin creates a login account for a parent, linked to an existing student
exports.createParentAccount = async (req, res) => {
  try {
    const { studentId, email, password } = req.body;

    const student = await Student.findOne({ _id: studentId, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ success: false, message: 'This email is already registered' });

    const parentUser = await User.create({
      name: student.guardianName,
      email,
      password,
      role: 'parent',
      school: req.user.schoolId,
      status: 'active',
    });

    student.parentUserId = parentUser._id;
    await student.save();

    res.status(201).json({
      success: true,
      message: 'Parent account created successfully',
      data: { email: parentUser.email, studentName: student.name },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// List which students still don't have a parent login account
exports.getStudentsWithoutParentAccount = async (req, res) => {
  try {
    const students = await Student.find({
      schoolId: req.user.schoolId,
      parentUserId: null,
    }).select('name studentId currentClass section guardianName guardianEmail');
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
