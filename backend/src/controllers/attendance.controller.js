const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
 
// @route GET /api/attendance/class?class=&section=&date=
// @access Protected - school_admin, teacher
// Returns every active student in the class/section, joined with today's
// attendance record if one already exists (so the UI can pre-fill statuses).
exports.getClassAttendance = async (req, res) => {
  try {
    const { class: className, section, date } = req.query;
    if (!className || !section || !date) {
      return res.status(400).json({ success: false, message: 'class, section and date are required' });
    }
 
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
 
    const [students, records] = await Promise.all([
      Student.find({
        schoolId: req.schoolId,
        currentClass: className,
        section,
        status: 'active',
      }).sort({ rollNumber: 1, name: 1 }),
 
      Attendance.find({
        schoolId: req.schoolId,
        class: className,
        section,
        date: { $gte: targetDate, $lt: nextDay },
      }),
    ]);
 
    const recordByStudent = {};
    records.forEach((r) => {
      recordByStudent[r.studentId.toString()] = r.status;
    });
 
    const roster = students.map((s) => ({
      studentId: s._id,
      studentCode: s.studentId,
      name: s.name,
      rollNumber: s.rollNumber,
      status: recordByStudent[s._id.toString()] || null,
    }));
 
    res.json({ success: true, data: roster });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
// @route POST /api/attendance/mark
// @access Protected - school_admin, teacher
// Body: { class, section, date, records: [{ studentId, status }] }
// Upserts one attendance document per student for that date (idempotent —
// re-submitting the same day overwrites rather than duplicating).
exports.markAttendance = async (req, res) => {
  try {
    const { class: className, section, date, records } = req.body;
    if (!className || !section || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'class, section, date and records[] are required' });
    }
 
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
 
    const ops = records
      .filter((r) => r.studentId && r.status)
      .map((r) => ({
        updateOne: {
          filter: {
            schoolId: req.schoolId,
            studentId: r.studentId,
            date: { $gte: targetDate, $lt: nextDay },
          },
          update: {
            $set: {
              schoolId: req.schoolId,
              studentId: r.studentId,
              class: className,
              section,
              date: targetDate,
              status: r.status,
            },
          },
          upsert: true,
        },
      }));
 
    if (ops.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid attendance records provided' });
    }
 
    await Attendance.bulkWrite(ops);
 
    res.json({ success: true, message: `Attendance saved for ${ops.length} student(s)` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
// @route GET /api/attendance/summary?class=&section=&startDate=&endDate=
// @access Protected - school_admin, teacher
// Quick per-student attendance percentage for a class over a date range —
// handy for the admin to spot chronically absent students at a glance.
exports.getClassSummary = async (req, res) => {
  try {
    const { class: className, section, startDate, endDate } = req.query;
    if (!className || !section) {
      return res.status(400).json({ success: false, message: 'class and section are required' });
    }
 
    const match = { schoolId: req.schoolId, class: className, section };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }
 
    const summary = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$studentId',
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $project: {
          studentId: '$_id',
          name: '$student.name',
          studentCode: '$student.studentId',
          totalDays: 1,
          presentDays: 1,
          lateDays: 1,
          absentDays: 1,
          attendancePercentage: {
            $round: [{ $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }, 1],
          },
        },
      },
      { $sort: { name: 1 } },
    ]);
 
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
