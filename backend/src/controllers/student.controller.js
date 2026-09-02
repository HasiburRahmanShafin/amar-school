const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');
const { sendEmail } = require('../services/email.service');

// Admin fields (full edit) vs Parent fields (limited)
const PARENT_EDITABLE_FIELDS = ['guardianPhone', 'guardianEmail', 'address', 'photoUrl'];

// Best-effort - emails every teacher whose assignedClasses cover this
// class/section that a student has just joined it (new admission, or a
// promotion moving students into it). Failures are logged but never block
// the request (see email.service.js).
const notifyTeachersOfClassChange = async (schoolId, className, section, studentNames) => {
  if (!studentNames.length) return;

  const teachers = await Teacher.find({
    schoolId,
    status: 'active',
    assignedClasses: { $elemMatch: { class: className, section } },
  }).select('email name');

  const namesList = studentNames.length === 1
    ? studentNames[0]
    : `${studentNames.slice(0, -1).join(', ')} and ${studentNames[studentNames.length - 1]}`;

  await Promise.all(
    teachers.map((teacher) =>
      sendEmail({
        to: teacher.email,
        subject: `New student(s) in ${className} - Section ${section}`,
        html: `<p>Hi ${teacher.name},</p>` +
          `<p><strong>${namesList}</strong> ${studentNames.length === 1 ? 'has' : 'have'} just been added to ` +
          `<strong>${className} - Section ${section}</strong>, which you teach.</p>` +
          `<p>Check your class roster for the updated list.</p>`,
        category: 'teacher_new_student_assigned',
        school: schoolId,
      })
    )
  );
};

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

    await notifyTeachersOfClassChange(req.user.schoolId, currentClass, section, [student.name]);

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

    // Group by each student's actual resulting class/section (toSection is
    // optional, so students without it keep their original section) and
    // notify the teachers of each group once.
    const groups = new Map();
    results.forEach((s) => {
      const key = `${s.currentClass}::${s.section}`;
      if (!groups.has(key)) groups.set(key, { className: s.currentClass, section: s.section, names: [] });
      groups.get(key).names.push(s.name);
    });
    await Promise.all(
      [...groups.values()].map((group) =>
        notifyTeachersOfClassChange(req.user.schoolId, group.className, group.section, group.names)
      )
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
