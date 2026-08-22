const Teacher = require('../models/Teacher');

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
    res.json({ success: true, message: 'Teacher removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
