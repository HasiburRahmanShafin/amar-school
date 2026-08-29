const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { sendEmail } = require('../services/email.service');

// How many consecutive absent days trigger a parent email alert.
const CONSECUTIVE_ABSENCE_ALERT_THRESHOLD = 5;

// Normalizes any date-ish value to midnight UTC so "2026-07-14" and
// "2026-07-14T09:31:00Z" both map to the same register.
function normalizeDate(value) {
  const d = value ? new Date(value) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// A teacher may only take/view attendance for a class+section they are
// actually assigned to teach - this is the same link Teacher.assignedClasses
// already provides for Result Management.
async function assertTeacherOwnsClass(req, className, section) {
  const teacher = await Teacher.findOne({ userId: req.user.id, schoolId: req.user.schoolId });
  if (!teacher) {
    const err = new Error('No teacher profile is linked to this account');
    err.status = 404;
    throw err;
  }
  const owns = teacher.assignedClasses.some((c) => c.class === className && c.section === section);
  if (!owns) {
    const err = new Error('You are not assigned to this class/section');
    err.status = 403;
    throw err;
  }
  return teacher;
}

// After saving a register, checks every student marked absent today to see
// whether they have now hit exactly 5 consecutive absent days (looking only
// at this class/section's registers, most-recent-first). Only fires once,
// right when the streak crosses the threshold, so a family isn't emailed
// again every single day the absence continues.
async function checkConsecutiveAbsences({ schoolId, className, section, absentStudentIds }) {
  if (absentStudentIds.length === 0) return;

  const recentRegisters = await Attendance.find({ schoolId, class: className, section })
    .sort({ date: -1 })
    .limit(CONSECUTIVE_ABSENCE_ALERT_THRESHOLD + 1)
    .lean();

  for (const studentId of absentStudentIds) {
    const streak = [];
    for (const register of recentRegisters) {
      const record = register.records.find((r) => String(r.student) === String(studentId));
      if (!record) break; // no register entry for this student that day - streak ends
      if (record.status !== 'absent') break;
      streak.push(register.date);
    }

    // Fire only the day the streak lands exactly on the threshold.
    if (streak.length === CONSECUTIVE_ABSENCE_ALERT_THRESHOLD) {
      const student = await Student.findById(studentId);
      if (student?.guardianEmail) {
        await sendEmail({
          to: student.guardianEmail,
          subject: `Attendance alert: ${student.name} has been absent 5 days in a row`,
          html: `
            <p>Dear ${student.guardianName || 'Guardian'},</p>
            <p><strong>${student.name}</strong> (${className}-${section}) has now been marked
            <strong>absent for ${CONSECUTIVE_ABSENCE_ALERT_THRESHOLD} consecutive school days</strong>.</p>
            <p>Please contact the school if there is a reason for this absence, or if your child
            needs support returning to regular attendance.</p>
          `,
        });
      }
    }
  }
}

// @route POST /api/attendance   (role: teacher)
// body: { class, section, date, records: [{ studentId, status }] }
exports.markAttendance = async (req, res) => {
  try {
    const { class: className, section, date, records } = req.body;
    if (!className || !section || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'class, section and records are required' });
    }
    const validStatuses = ['present', 'absent', 'late'];
    if (records.some((r) => !r.studentId || !validStatuses.includes(r.status))) {
      return res.status(400).json({ success: false, message: 'Each record needs a studentId and a valid status' });
    }

    const teacher = await assertTeacherOwnsClass(req, className, section);
    const day = normalizeDate(date);

    const attendance = await Attendance.findOneAndUpdate(
      { schoolId: req.user.schoolId, class: className, section, date: day },
      {
        schoolId: req.user.schoolId,
        class: className,
        section,
        date: day,
        takenBy: teacher._id,
        records: records.map((r) => ({ student: r.studentId, status: r.status })),
      },
      { new: true, upsert: true, runValidators: true }
    );

    const absentStudentIds = records.filter((r) => r.status === 'absent').map((r) => r.studentId);
    await checkConsecutiveAbsences({
      schoolId: req.user.schoolId,
      className,
      section,
      absentStudentIds,
    });

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
};

// @route GET /api/attendance?class=&section=&date=   (role: teacher, school_admin)
// Returns the full class roster merged with that day's marks (if any),
// so the "take attendance" screen can pre-fill a register that already
// exists and show every student even if they haven't been marked yet.
exports.getClassRegister = async (req, res) => {
  try {
    const { class: className, section, date } = req.query;
    if (!className || !section) {
      return res.status(400).json({ success: false, message: 'class and section query params are required' });
    }

    if (req.user.role === 'teacher') {
      await assertTeacherOwnsClass(req, className, section);
    }

    const day = normalizeDate(date);
    const [students, attendance] = await Promise.all([
      Student.find({ schoolId: req.user.schoolId, currentClass: className, section, status: 'active' })
        .select('name studentId rollNumber guardianEmail')
        .sort({ rollNumber: 1, name: 1 }),
      Attendance.findOne({ schoolId: req.user.schoolId, class: className, section, date: day }),
    ]);

    const marks = new Map((attendance?.records || []).map((r) => [String(r.student), r.status]));
    const roster = students.map((s) => ({
      studentId: s._id,
      name: s.name,
      studentCode: s.studentId,
      rollNumber: s.rollNumber,
      status: marks.get(String(s._id)) || null,
    }));

    res.json({
      success: true,
      data: { class: className, section, date: day, alreadyTaken: !!attendance, roster },
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @route GET /api/attendance/student/:studentId?range=day|week|month|term&date=
// (role: student [self], parent [own child], school_admin, teacher)
// Returns each day's status plus a rolled-up attendance percentage, so it
// can back the student/parent history view and feed report cards or
// analytics dashboards downstream.
exports.getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { range = 'month', date } = req.query;

    const student = await Student.findOne({ _id: studentId, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (req.user.role === 'student' && String(student.userId) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only view your own attendance' });
    }
    if (req.user.role === 'parent' && String(student.parentUserId) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only view your own child\'s attendance' });
    }

    const anchor = date ? new Date(date) : new Date();
    let start;
    const end = new Date(anchor);
    end.setUTCHours(23, 59, 59, 999);

    if (range === 'day') {
      start = normalizeDate(anchor);
    } else if (range === 'week') {
      start = new Date(anchor);
      start.setUTCDate(start.getUTCDate() - start.getUTCDay());
      start.setUTCHours(0, 0, 0, 0);
    } else if (range === 'term') {
      // A term is treated as a rolling 4-month academic block.
      start = new Date(anchor);
      start.setUTCMonth(start.getUTCMonth() - 4);
      start.setUTCHours(0, 0, 0, 0);
    } else {
      // default: month
      start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    }

    const registers = await Attendance.find({
      schoolId: req.user.schoolId,
      class: student.currentClass,
      section: student.section,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const days = registers
      .map((reg) => {
        const record = reg.records.find((r) => String(r.student) === String(student._id));
        return record ? { date: reg.date, status: record.status } : null;
      })
      .filter(Boolean);

    const presentCount = days.filter((d) => d.status === 'present' || d.status === 'late').length;
    const percentage = days.length > 0 ? Math.round((presentCount / days.length) * 1000) / 10 : null;

    // Flags whether this student is *currently* in the middle of a 5+ day
    // absence streak, for surfacing an "irregular attendance" badge in
    // dashboards without re-computing the whole alert logic client-side.
    let currentAbsentStreak = 0;
    for (let i = days.length - 1; i >= 0; i -= 1) {
      if (days[i].status === 'absent') currentAbsentStreak += 1;
      else break;
    }

    res.json({
      success: true,
      data: {
        studentId: student._id,
        name: student.name,
        class: student.currentClass,
        section: student.section,
        range,
        from: start,
        to: end,
        totalDaysRecorded: days.length,
        presentCount,
        absentCount: days.filter((d) => d.status === 'absent').length,
        lateCount: days.filter((d) => d.status === 'late').length,
        attendancePercentage: percentage,
        isIrregular: currentAbsentStreak >= CONSECUTIVE_ABSENCE_ALERT_THRESHOLD,
        days,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
