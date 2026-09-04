const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const FeePayment = require('../models/FeePayment');
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

// Creates a login (User doc) for either the student or their parent and
// links it back onto the Student doc. Sends the new user their credentials
// by email - best-effort, never blocks/fails the caller. Throws on genuine
// account-creation errors (e.g. duplicate email) so the caller can surface
// them per-account without failing the whole request.
const createLoginAccount = async ({ role, email, password, name, schoolId, student }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new Error(`This email is already registered (${email})`);
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    school: schoolId,
    status: 'active',
  });

  if (role === 'student') student.studentUserId = user._id;
  if (role === 'parent') student.parentUserId = user._id;

  await sendEmail({
    to: email,
    subject: `Your ${role === 'student' ? 'student' : 'parent'} login for Amar School`,
    html: `<p>Hi ${name},</p>` +
      `<p>A ${role} login has been created for ${student.name} (${student.studentId}).</p>` +
      `<p><strong>Email:</strong> ${email}<br/><strong>Temporary password:</strong> ${password}</p>` +
      `<p>Please log in and change your password as soon as possible.</p>`,
    category: role === 'student' ? 'student_login_created' : 'parent_login_created',
    school: schoolId,
  });

  return { role, email: user.email };
};

exports.createStudent = async (req, res) => {
  try {
    const {
      name, dateOfBirth, gender, bloodGroup, photoUrl, address,
      guardianName, guardianPhone, guardianEmail, guardianRelation,
      currentClass, section, rollNumber,
      // Optional: create login accounts for the student and/or parent in
      // the same request, e.g. { email, password } for either.
      studentLogin, parentLogin,
    } = req.body;

    const student = await Student.create({
      schoolId: req.user.schoolId,
      name, dateOfBirth, gender, bloodGroup, photoUrl, address,
      guardianName, guardianPhone, guardianEmail, guardianRelation,
      currentClass, section, rollNumber,
      academicHistory: [{ year: new Date().getFullYear(), class: currentClass, section }],
    });

    await notifyTeachersOfClassChange(req.user.schoolId, currentClass, section, [student.name]);

    const accounts = [];
    const accountErrors = [];

    if (studentLogin?.email && studentLogin?.password) {
      try {
        accounts.push(
          await createLoginAccount({
            role: 'student',
            email: studentLogin.email,
            password: studentLogin.password,
            name: student.name,
            schoolId: req.user.schoolId,
            student,
          })
        );
      } catch (err) {
        accountErrors.push(`Student login: ${err.message}`);
      }
    }

    if (parentLogin?.email && parentLogin?.password) {
      try {
        accounts.push(
          await createLoginAccount({
            role: 'parent',
            email: parentLogin.email,
            password: parentLogin.password,
            name: guardianName,
            schoolId: req.user.schoolId,
            student,
          })
        );
      } catch (err) {
        accountErrors.push(`Parent login: ${err.message}`);
      }
    }

    if (accounts.length) await student.save();

    res.status(201).json({ success: true, data: student, accounts, accountErrors });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route POST /api/students/:id/logins
// @access Protected - school_admin
// Creates a login for an *existing* student's student or parent, for cases
// where it wasn't set up at admission time. Body: { role: 'student'|'parent', email, password }
exports.createStudentOrParentLogin = async (req, res) => {
  try {
    const { role, email, password } = req.body;
    if (!['student', 'parent'].includes(role) || !email || !password) {
      return res.status(400).json({ success: false, message: 'role (student|parent), email and password are required' });
    }

    const student = await Student.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (role === 'student' && student.studentUserId) {
      return res.status(409).json({ success: false, message: 'This student already has a login account' });
    }
    if (role === 'parent' && student.parentUserId) {
      return res.status(409).json({ success: false, message: 'This student already has a parent login account' });
    }

    const account = await createLoginAccount({
      role,
      email,
      password,
      name: role === 'student' ? student.name : student.guardianName,
      schoolId: req.user.schoolId,
      student,
    });
    await student.save();

    res.status(201).json({ success: true, data: account });
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

// ---------------------------------------------------------------------
// Payment details on the student profile (backed by FeePayment, one row
// per fee due/paid for this student - separate from the school-wide
// Financial Reports module which works off Transaction/User instead).
// ---------------------------------------------------------------------

// @route GET /api/students/:id/fees
// @access Protected - school_admin, teacher, parent (own child), student (self)
exports.getStudentFees = async (req, res) => {
  try {
    const studentFilter = { _id: req.params.id, schoolId: req.user.schoolId };
    if (req.user.role === 'parent') studentFilter.parentUserId = req.user.id;
    if (req.user.role === 'student') studentFilter.studentUserId = req.user.id;

    const student = await Student.findOne(studentFilter);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const fees = await FeePayment.find({ schoolId: req.user.schoolId, studentId: student._id }).sort({ dueDate: -1 });

    const totals = fees.reduce(
      (acc, f) => {
        if (f.status === 'paid') acc.totalPaid += f.amount;
        else acc.totalDue += f.amount;
        return acc;
      },
      { totalPaid: 0, totalDue: 0 }
    );

    res.json({ success: true, data: fees, totals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route POST /api/students/:id/fees
// @access Protected - school_admin
// Adds a new fee due for a student, e.g. this term's tuition or an exam fee.
exports.addStudentFee = async (req, res) => {
  try {
    const { feeType, amount, dueDate, academicYear, paymentMethod, status } = req.body;
    if (!feeType || amount === undefined || !dueDate) {
      return res.status(400).json({ success: false, message: 'feeType, amount and dueDate are required' });
    }

    const student = await Student.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const fee = await FeePayment.create({
      schoolId: req.user.schoolId,
      studentId: student._id,
      feeType,
      amount,
      dueDate,
      academicYear: academicYear || new Date().getFullYear(),
      paymentMethod: paymentMethod || 'cash',
      status: status || 'pending',
      paidDate: status === 'paid' ? new Date() : undefined,
    });

    res.status(201).json({ success: true, data: fee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route PATCH /api/students/:id/fees/:feeId
// @access Protected - school_admin
// Marks a fee paid (or updates other fields) from the manual/front-desk
// flow, and emails the guardian a receipt once it's marked paid.
exports.updateStudentFee = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const fee = await FeePayment.findOne({ _id: req.params.feeId, schoolId: req.user.schoolId, studentId: student._id });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

    const wasUnpaid = fee.status !== 'paid';
    Object.assign(fee, req.body);
    if (req.body.status === 'paid' && wasUnpaid) {
      fee.paidDate = new Date();
      fee.paymentMethod = fee.paymentMethod === 'sslcommerz' ? 'sslcommerz' : (req.body.paymentMethod || 'cash');
    }
    await fee.save();

    if (req.body.status === 'paid' && wasUnpaid && student.guardianEmail) {
      await sendEmail({
        to: student.guardianEmail,
        subject: `Payment received - ${fee.feeType} (${student.name})`,
        html: `<p>Dear ${student.guardianName || 'Guardian'},</p>` +
          `<p>We've received a payment of <strong>${fee.amount}</strong> for ` +
          `<strong>${fee.feeType}</strong> on behalf of <strong>${student.name}</strong>.</p>` +
          `<p>This email serves as your receipt.</p>`,
        category: 'fee_receipt',
        school: req.user.schoolId,
      });
    }

    res.json({ success: true, data: fee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
