const crypto = require('crypto');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

exports.createTeacher = async (req, res) => {
  try {
    const {
      name, email, phone, photoUrl, qualifications, department,
      dateOfJoining, subjects, assignedClasses,
    } = req.body;

    const teacher = await Teacher.create({
      schoolId: req.user.schoolId,
      name, email, phone, photoUrl, qualifications, department,
      dateOfJoining, subjects, assignedClasses,
    });

    res.status(201).json({ success: true, data: teacher });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const filter = { schoolId: req.user.schoolId };
    if (req.query.department) filter.department = req.query.department;
    if (req.query.subject) filter.subjects = req.query.subject;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const teachers = await Teacher.find(filter).sort({ name: 1 });
    res.json({ success: true, count: teachers.length, data: teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Looks up every teacher linked to a given class/section (optionally filtered by
// subject). Registered before "/:id" in the routes file so Express doesn't treat
// "by-class" as an :id. Examination & Result Management call this instead of
// re-implementing the class -> teacher link themselves.
exports.getTeachersByClass = async (req, res) => {
  try {
    const { class: className, section, subject } = req.query;
    if (!className || !section) {
      return res.status(400).json({ success: false, message: 'class and section query params are required' });
    }
    const match = { class: className, section };
    if (subject) match.subject = subject;

    const teachers = await Teacher.find({
      schoolId: req.user.schoolId,
      assignedClasses: { $elemMatch: match },
    }).select('name teacherId email subjects assignedClasses');

    res.json({ success: true, count: teachers.length, data: teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Assign / replace ONLY the class-schedule part of a profile. Kept separate from
// the general update so a "manage schedule" screen can save without resending
// the whole profile.
exports.updateAssignedClasses = async (req, res) => {
  try {
    const { assignedClasses } = req.body;
    if (!Array.isArray(assignedClasses)) {
      return res.status(400).json({ success: false, message: 'assignedClasses must be an array' });
    }
    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      { assignedClasses },
      { new: true, runValidators: true }
    );
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    // Removing the profile shouldn't leave a dangling login - suspend it rather
    // than delete the User outright, in case the same person is re-added later.
    if (teacher.userId) {
      await User.findByIdAndUpdate(teacher.userId, { status: 'suspended' });
    }
    res.json({ success: true, message: 'Teacher removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Login account management (admin) ---

// Provisions a login for an existing teacher profile: creates a User with
// role 'teacher', links it back onto the Teacher doc, and emails the
// credentials. The temp password is also returned in the response (not just
// emailed) so the admin can hand it over directly if EMAIL_USER/EMAIL_PASS
// aren't configured on their machine - email sending is best-effort here and
// never fails the request.
exports.createTeacherAccount = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    if (teacher.userId) {
      return res.status(409).json({ success: false, message: 'This teacher already has a login account' });
    }

    const existingUser = await User.findOne({ email: teacher.email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'This email is already registered to another account' });
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');

    const user = await User.create({
      name: teacher.name,
      email: teacher.email,
      password: tempPassword,
      role: 'teacher',
      school: req.user.schoolId,
      status: 'active',
    });

    teacher.userId = user._id;
    await teacher.save();

    await sendEmail({
      to: teacher.email,
      subject: 'Your Amar School teacher account',
      html: `
        <p>Hi ${teacher.name},</p>
        <p>An account has been created for you on Amar School.</p>
        <p><b>Email:</b> ${teacher.email}<br/><b>Temporary password:</b> ${tempPassword}</p>
        <p>Please log in and change your password from your profile page as soon as possible.</p>
      `,
      category: 'teacher_account_created',
      school: teacher.schoolId,
    });

    res.status(201).json({
      success: true,
      message: 'Login account created. Share these credentials with the teacher securely.',
      data: { email: teacher.email, tempPassword },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Suspends the linked login and unlinks it from the profile, without
// deleting the teacher's profile itself. A new account can be issued later.
exports.revokeTeacherAccount = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    if (!teacher.userId) return res.status(400).json({ success: false, message: 'This teacher has no login account' });

    await User.findByIdAndUpdate(teacher.userId, { status: 'suspended' });
    teacher.userId = null;
    await teacher.save();

    res.json({ success: true, message: 'Login access revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Self-service (role: 'teacher') ---

exports.getMyProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id, schoolId: req.user.schoolId });
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher profile is linked to this account' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Teachers may only touch their own contact info/photo here. Everything that
// attendance/result management depend on - subjects, assignedClasses,
// department, status - stays admin-only via updateTeacher, so a teacher can
// never accidentally (or deliberately) reassign their own classes.
exports.updateMyProfile = async (req, res) => {
  try {
    const allowedFields = ['phone', 'photoUrl'];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const teacher = await Teacher.findOneAndUpdate(
      { userId: req.user.id, schoolId: req.user.schoolId },
      updates,
      { new: true, runValidators: true }
    );
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher profile is linked to this account' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword; // pre-save hook rehashes
    await user.save();

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
