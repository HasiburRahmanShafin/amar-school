const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/email.service');

// Defense in depth: even though the UI only offers a teacher their own
// assigned classes, make sure the API itself refuses to let a teacher
// take attendance for a class/section they aren't assigned to.
const teacherOwnsClass = async (req, className, section) => {
  if (req.user.role !== 'teacher') return true;
  const teacher = await Teacher.findOne({
    userId: req.user.id,
    schoolId: req.schoolId,
    assignedClasses: { $elemMatch: { class: className, section } },
  });
  return !!teacher;
};

// Every time a student's absence count hits a multiple of this number
// (5, 10, 15, ...) within the calendar/academic year, their guardian gets
// an email alert. Using "multiple of" rather than "at least" keeps it from
// re-firing on every single absence once the student has crossed 5.
const ABSENCE_ALERT_THRESHOLD = 5;

// Best-effort - checks each newly-marked-absent student's running absence
// total for the year and emails the guardian once that total lands on a
// threshold multiple. Never throws: a failed alert must never block the
// attendance-marking request that triggered it (see email.service.js).
const checkAndSendAbsenceAlerts = async (schoolId, records, targetDate) => {
  const absentStudentIds = records.filter((r) => r.studentId && r.status === 'absent').map((r) => r.studentId);
  if (!absentStudentIds.length) return;

  try {
    const students = await Student.find({ _id: { $in: absentStudentIds }, schoolId }).select(
      'name guardianName guardianEmail currentClass section parentUserId studentUserId'
    );
    const studentById = new Map(students.map((s) => [s._id.toString(), s]));

    const yearStart = new Date(targetDate.getFullYear(), 0, 1);
    const yearEnd = new Date(targetDate.getFullYear() + 1, 0, 1);

    await Promise.all(
      absentStudentIds.map(async (studentId) => {
        const student = studentById.get(studentId.toString());
        if (!student) return;

        const absentCount = await Attendance.countDocuments({
          schoolId,
          studentId,
          status: 'absent',
          date: { $gte: yearStart, $lt: yearEnd },
        });

        if (absentCount === 0 || absentCount % ABSENCE_ALERT_THRESHOLD !== 0) return;

        const title = `Attendance Alert: ${absentCount} absences`;
        const message = `${student.name} (Class ${student.currentClass}-${student.section}) has now been ` +
          `absent ${absentCount} times this academic year.`;

        // In-app notification (bell icon) for the parent's dashboard, and
        // for the student's own dashboard too if they have a login.
        const notificationTargets = [
          student.parentUserId && { userId: student.parentUserId, link: '/parent/child-profile' },
          student.studentUserId && { userId: student.studentUserId, link: '/student/dashboard' },
        ].filter(Boolean);

        await Promise.all(
          notificationTargets.map(({ userId, link }) =>
            Notification.create({
              schoolId,
              userId,
              type: 'attendance_alert',
              title,
              message,
              link,
              dedupeKey: `attendance_alert:${studentId}:${userId}:${targetDate.getFullYear()}:${absentCount}`,
            }).catch((err) => {
              if (err.code !== 11000) console.error('Notification create failed:', err.message);
            })
          )
        );

        if (!student.guardianEmail) return;

        await sendEmail({
          to: student.guardianEmail,
          subject: title,
          html: `<p>Dear ${student.guardianName || 'Guardian'},</p>` +
            `<p>This is to inform you that <strong>${student.name}</strong> ` +
            `(Class ${student.currentClass}-${student.section}) has now been marked ` +
            `<strong>absent ${absentCount} times</strong> this academic year.</p>` +
            `<p>Please reach out to the school if there is anything we can help with, ` +
            `or ensure your child attends class regularly going forward.</p>` +
            `<p>Regards,<br/>School Administration</p>`,
          category: 'attendance_absence_alert',
          school: schoolId,
          dedupeKey: `attendance_absence_alert:${studentId}:${targetDate.getFullYear()}:${absentCount}`,
        });
      })
    );
  } catch (error) {
    console.error('Absence alert check failed:', error.message);
  }
};
 
// @route GET /api/attendance/class?class=&section=&date=
// @access Protected - teacher
// Returns every active student in the class/section, joined with today's
// attendance record if one already exists (so the UI can pre-fill statuses).
exports.getClassAttendance = async (req, res) => {
  try {
    const { class: className, section, date } = req.query;
    if (!className || !section || !date) {
      return res.status(400).json({ success: false, message: 'class, section and date are required' });
    }

    if (!(await teacherOwnsClass(req, className, section))) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class/section' });
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
// @access Protected - teacher
// Body: { class, section, date, records: [{ studentId, status }] }
// Upserts one attendance document per student for that date (idempotent —
// re-submitting the same day overwrites rather than duplicating).
exports.markAttendance = async (req, res) => {
  try {
    const { class: className, section, date, records } = req.body;
    if (!className || !section || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'class, section, date and records[] are required' });
    }

    if (!(await teacherOwnsClass(req, className, section))) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class/section' });
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

    // Fire-and-forget: don't delay the response on email delivery, but do
    // let any synchronous errors surface to the logs via the helper's own
    // try/catch.
    checkAndSendAbsenceAlerts(req.schoolId, records, targetDate);
 
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