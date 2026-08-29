const crypto = require('crypto');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

// Admin fields (full edit) vs Parent fields (limited)
const PARENT_EDITABLE_FIELDS = ['guardianPhone', 'guardianEmail', 'address', 'photoUrl'];

exports.createStudent = async (req, res) => {
  try {
    const {
      name, dateOfBirth, gender, bloodGroup, photoUrl, address,
      guardianName, guardianPhone, guardianEmail, guardianRelation,
      currentClass, section, rollNumber,
    } = req.body;

    const student = await Student.create({
      schoolId: req.user.schoolId,
      name, dateOfBirth, gender, bloodGroup, photoUrl, address,
      guardianName, guardianPhone, guardianEmail, guardianRelation,
      currentClass, section, rollNumber,
      academicHistory: [{ year: new Date().getFullYear(), class: currentClass, section }],
    });

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const filter = { schoolId: req.user.schoolId };
    if (req.query.currentClass) filter.currentClass = req.query.currentClass;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const students = await Student.find(filter).sort({ currentClass: 1, rollNumber: 1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const filter = { _id: req.params.id, schoolId: req.user.schoolId };
    // parents can only view their own child
    if (req.user.role === 'parent') filter.parentUserId = req.user.id;

    const student = await Student.findOne(filter);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    let updateData = req.body;
    const filter = { _id: req.params.id, schoolId: req.user.schoolId };

    if (req.user.role === 'parent') {
      filter.parentUserId = req.user.id;
      // restrict parent updates to a safe field subset
      updateData = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => PARENT_EDITABLE_FIELDS.includes(key))
      );
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'No editable fields provided' });
      }
    }

    const student = await Student.findOneAndUpdate(filter, updateData, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// One-click bulk promotion: fromClass -> toClass for all active students in fromClass
exports.promoteStudents = async (req, res) => {
  try {
    const { fromClass, toClass, fromSection, toSection } = req.body;
    if (!fromClass || !toClass) {
      return res.status(400).json({ success: false, message: 'fromClass and toClass are required' });
    }

    const filter = { schoolId: req.user.schoolId, currentClass: fromClass, status: 'active' };
    if (fromSection) filter.section = fromSection;

    const students = await Student.find(filter);
    const year = new Date().getFullYear();

    const results = await Promise.all(
      students.map((s) => {
        s.academicHistory.push({ year, class: s.currentClass, section: s.section, result: 'Promoted' });
        s.currentClass = toClass;
        if (toSection) s.section = toSection;
        return s.save();
      })
    );

    res.json({ success: true, promotedCount: results.length, data: results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getEnrollmentCount = async (req, res) => {
  try {
    const rawId = req.user.schoolId._id || req.user.schoolId;
    const schoolId = new mongoose.Types.ObjectId(rawId);

    const counts = await Student.aggregate([
      { $match: { schoolId, status: 'active' } },
      { $group: { _id: { class: '$currentClass', section: '$section' }, count: { $sum: 1 } } },
      { $sort: { '_id.class': 1, '_id.section': 1 } },
    ]);
    res.json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Login account management (admin) ---
// Mirrors Teacher.createTeacherAccount/revokeTeacherAccount: provisions or
// revokes a login for an existing Student profile so the student can sign
// in and use the Attendance History and Online Fee Payment pages.

exports.createStudentAccount = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (student.userId) {
      return res.status(409).json({ success: false, message: 'This student already has a login account' });
    }
    if (!student.guardianEmail) {
      return res.status(400).json({ success: false, message: 'Add a guardian/contact email to this student before creating a login' });
    }

    const loginEmail = req.body.email || student.guardianEmail;
    const existingUser = await User.findOne({ email: loginEmail.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'This email is already registered to another account' });
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');

    const user = await User.create({
      name: student.name,
      email: loginEmail,
      password: tempPassword,
      role: 'student',
      school: req.user.schoolId,
      status: 'active',
    });

    student.userId = user._id;
    await student.save();

    await sendEmail({
      to: loginEmail,
      subject: 'Your Amar School student account',
      html: `
        <p>Hi ${student.name},</p>
        <p>A student login has been created for you on Amar School. Use it to check your
        attendance history and pay school fees online.</p>
        <p><b>Email:</b> ${loginEmail}<br/><b>Temporary password:</b> ${tempPassword}</p>
        <p>Please log in and change your password as soon as possible.</p>
      `,
    });

    res.status(201).json({
      success: true,
      message: 'Login account created. Share these credentials with the student/guardian securely.',
      data: { email: loginEmail, tempPassword },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.revokeStudentAccount = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!student.userId) return res.status(400).json({ success: false, message: 'This student has no login account' });

    await User.findByIdAndUpdate(student.userId, { status: 'suspended' });
    student.userId = null;
    await student.save();

    res.json({ success: true, message: 'Login access revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Self-service (role: 'student') ---

exports.getMyProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'No student profile is linked to this account' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getIdCardData = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.user.schoolId })
      .select('studentId name photoUrl currentClass section rollNumber schoolId dateOfBirth');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
