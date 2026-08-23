const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

// How many consecutive absent days trigger a parent-email alert.
const CONSECUTIVE_ABSENCE_ALERT_THRESHOLD = 5;
// Below this attendance percentage a student is flagged "irregular" on
// the analytics dashboard.
const IRREGULAR_ATTENDANCE_THRESHOLD = 75;

// Strips the time portion so "2024-05-01T14:32:00" and "2024-05-01" are
// treated as the same school day - a class can only be marked once a day.
const normalizeToMidnight = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Turns the day/week/month/term filter (or an explicit custom range)
// used by the student/parent history view into a concrete [start, end]
// window. "term" has no dedicated model in this codebase yet, so it is
// approximated as the trailing 4 months - schools can override it at any
// time by passing explicit startDate/endDate query params instead.
const resolveDateRange = ({ period, startDate, endDate }) => {
  if (startDate && endDate) {
    return { start: normalizeToMidnight(startDate), end: normalizeToMidnight(endDate) };
  }

  const end = normalizeToMidnight(new Date());
  const start = normalizeToMidnight(new Date());

  switch (period) {
    case 'week':
      start.setDate(start.getDate() - 6);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'term':
      start.setMonth(start.getMonth() - 4);
      break;
    case 'day':
    default:
      // start === end, i.e. just today
      break;
  }

  return { start, end };
};

// Reduces a list of {status} records into the summary shown on the
// history view and used for report cards / analytics.
const summarizeRecords = (statuses) => {
  const totalDays = statuses.length;
  const presentCount = statuses.filter((s) => s === 'present').length;
  const lateCount = statuses.filter((s) => s === 'late').length;
  const absentCount = statuses.filter((s) => s === 'absent').length;
  // Late still counts as "attended" for the percentage, matching how
  // most schools treat lateness vs. an unexcused absence.
  const attendedCount = presentCount + lateCount;
  const percentage = totalDays === 0 ? null : Math.round((attendedCount / totalDays) * 1000) / 10;

  return { totalDays, presentCount, absentCount, lateCount, percentage };
};

// Looks back over the class's most recent Attendance documents to see if
// this student has just completed a run of N consecutive "absent" days,
// and if so emails the guardian. `lastAlertDate` (persisted on the
// student's studentInfo) prevents the same streak from re-triggering an
// email every single day once the threshold has already been crossed.
const checkAndNotifyConsecutiveAbsences = async ({ school, className, section, studentId, uptoDate }) => {
  const recent = await Attendance.find({
    school,
    className,
    section,
    date: { $lte: uptoDate },
  })
    .sort({ date: -1 })
    .limit(CONSECUTIVE_ABSENCE_ALERT_THRESHOLD)
    .select('date records');

  if (recent.length < CONSECUTIVE_ABSENCE_ALERT_THRESHOLD) return;

  const streak = recent.every((doc) => {
    const record = doc.records.find((r) => String(r.student) === String(studentId));
    return record && record.status === 'absent';
  });

  if (!streak) return;

  const student = await User.findById(studentId);
  if (!student || !student.studentInfo?.guardianEmail) return;

  const streakEndDate = recent[0].date; // most recent day in the streak
  const alreadyAlerted =
    student.studentInfo.lastAbsenceAlertDate &&
    normalizeToMidnight(student.studentInfo.lastAbsenceAlertDate).getTime() >= normalizeToMidnight(streakEndDate).getTime();
  if (alreadyAlerted) return;

  await sendEmail({
    to: student.studentInfo.guardianEmail,
    subject: `Attendance Alert: ${student.name} has been absent ${CONSECUTIVE_ABSENCE_ALERT_THRESHOLD} days in a row`,
    html:
      `<p>Dear ${student.studentInfo.guardianName || 'Guardian'},</p>` +
      `<p>${student.name} (Class ${className}${section ? ` - ${section}` : ''}) has been marked <strong>absent</strong> ` +
      `for ${CONSECUTIVE_ABSENCE_ALERT_THRESHOLD} consecutive school days, most recently on ` +
      `${new Date(streakEndDate).toLocaleDateString()}.</p>` +
      `<p>Please contact the school if there is an issue we should be aware of.</p>`,
  });

  student.studentInfo.lastAbsenceAlertDate = streakEndDate;
  await student.save();
};

// @route GET /api/attendance/my-classes
// @access Protected - teacher
// Returns the classes/sections this teacher is assigned to, so the "take
// attendance" screen can offer a class picker.
const getMyClasses = async (req, res, next) => {
  try {
    const teacher = await User.findById(req.user.id).select('teacherInfo');
    res.json(teacher?.teacherInfo?.assignedClasses || []);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/attendance/roster?className=&section=
// @access Protected - teacher, school_admin
// The student list a teacher marks Present/Absent/Late against.
const getClassRoster = async (req, res, next) => {
  try {
    const { className, section } = req.query;
    if (!className || !section) {
      return res.status(400).json({ message: 'className and section are required' });
    }

    const students = await User.find({
      school: req.schoolId,
      role: 'student',
      'studentInfo.className': className,
      'studentInfo.section': section,
      status: 'active',
    })
      .select('name studentInfo.roll')
      .sort({ 'studentInfo.roll': 1 });

    res.json(students);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/attendance/class?className=&section=&date=
// @access Protected - teacher, school_admin
// Fetches an already-submitted day so the teacher can review/correct it.
const getClassAttendanceByDate = async (req, res, next) => {
  try {
    const { className, section, date } = req.query;
    if (!className || !section || !date) {
      return res.status(400).json({ message: 'className, section and date are required' });
    }

    const attendance = await Attendance.findOne({
      school: req.schoolId,
      className,
      section,
      date: normalizeToMidnight(date),
    }).populate('records.student', 'name studentInfo.roll');

    res.json(attendance); // null if nothing submitted for that day yet
  } catch (error) {
    next(error);
  }
};

// @route POST /api/attendance
// @access Protected - teacher
// Marks (or re-marks) an entire class's attendance for one day in a
// single request: { className, section, date, records: [{ student, status }] }
const markAttendance = async (req, res, next) => {
  try {
    const { className, section, date, records } = req.body;

    if (!className || !section || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'className, section, date and records[] are required' });
    }

    const validStatuses = ['present', 'absent', 'late'];
    for (const record of records) {
      if (!record.student || !validStatuses.includes(record.status)) {
        return res.status(400).json({ message: 'Each record needs a valid student and status' });
      }
    }

    // Every student in `records` must actually belong to this class/
    // section/school, otherwise a teacher could mark attendance for
    // students outside their assigned roster.
    const rosterCount = await User.countDocuments({
      _id: { $in: records.map((r) => r.student) },
      school: req.schoolId,
      role: 'student',
      'studentInfo.className': className,
      'studentInfo.section': section,
    });
    if (rosterCount !== records.length) {
      return res.status(400).json({ message: 'One or more students are not part of this class/section' });
    }

    const normalizedDate = normalizeToMidnight(date);

    const attendance = await Attendance.findOneAndUpdate(
      { school: req.schoolId, className, section, date: normalizedDate },
      {
        school: req.schoolId,
        className,
        section,
        date: normalizedDate,
        teacher: req.user.id,
        records,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Fire-and-forget: don't let mail-provider latency hold up the
    // teacher's save, and one alert failing shouldn't block the rest.
    Promise.all(
      records
        .filter((r) => r.status === 'absent')
        .map((r) =>
          checkAndNotifyConsecutiveAbsences({
            school: req.schoolId,
            className,
            section,
            studentId: r.student,
            uptoDate: normalizedDate,
          })
        )
    ).catch((err) => console.error('Attendance absence-alert batch failed:', err.message));

    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/attendance/history?studentId=&period=day|week|month|term&startDate=&endDate=
// @access Protected - student (self), parent (their child), teacher, school_admin
// Powers the "view attendance history by day/week/month/term" screen,
// and the percentage shown on report cards.
const getStudentAttendance = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    let studentId = req.query.studentId;

    if (req.user.role === 'student') {
      studentId = req.user.id; // students can only ever see their own record
    } else if (req.user.role === 'parent') {
      if (!studentId) {
        return res.status(400).json({ message: 'studentId is required' });
      }
      const parent = await User.findById(req.user.id).select('parentInfo');
      const isOwnChild = parent?.parentInfo?.children?.some((c) => String(c) === String(studentId));
      if (!isOwnChild) {
        return res.status(403).json({ message: 'You can only view attendance for your own child' });
      }
    } else if (!studentId) {
      return res.status(400).json({ message: 'studentId is required' });
    }

    const student = await User.findOne({ _id: studentId, school: req.schoolId, role: 'student' });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { start, end } = resolveDateRange({ period, startDate, endDate });

    const docs = await Attendance.find({
      school: req.schoolId,
      className: student.studentInfo?.className,
      section: student.studentInfo?.section,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const history = docs
      .map((doc) => {
        const record = doc.records.find((r) => String(r.student) === String(studentId));
        return record ? { date: doc.date, status: record.status } : null;
      })
      .filter(Boolean);

    const summary = summarizeRecords(history.map((h) => h.status));

    res.json({
      student: { id: student._id, name: student.name, class: student.studentInfo?.className, section: student.studentInfo?.section },
      range: { start, end, period: period || (startDate && endDate ? 'custom' : 'day') },
      summary,
      history,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/attendance/analytics?days=30
// @access Protected - school_admin
// Class-by-class attendance averages plus a list of students whose
// attendance has fallen below the "irregular" threshold - feeds the
// admin analytics dashboard and report-card generation.
const getAttendanceAnalytics = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const end = normalizeToMidnight(new Date());
    const start = normalizeToMidnight(new Date());
    start.setDate(start.getDate() - days);

    const docs = await Attendance.find({
      school: req.schoolId,
      date: { $gte: start, $lte: end },
    }).select('className section records');

    // classKey -> { totalMarks, presentLike, students: { studentId -> statuses[] } }
    const classMap = new Map();
    const studentMap = new Map();

    docs.forEach((doc) => {
      const classKey = `${doc.className} - ${doc.section}`;
      if (!classMap.has(classKey)) classMap.set(classKey, { total: 0, attended: 0 });
      const classStats = classMap.get(classKey);

      doc.records.forEach((record) => {
        classStats.total += 1;
        if (record.status !== 'absent') classStats.attended += 1;

        const studentKey = String(record.student);
        if (!studentMap.has(studentKey)) {
          studentMap.set(studentKey, { classKey, statuses: [] });
        }
        studentMap.get(studentKey).statuses.push(record.status);
      });
    });

    const classSummary = Array.from(classMap.entries()).map(([classKey, stats]) => ({
      class: classKey,
      attendancePercentage: stats.total === 0 ? null : Math.round((stats.attended / stats.total) * 1000) / 10,
    }));

    const studentIds = Array.from(studentMap.keys());
    const students = await User.find({ _id: { $in: studentIds } }).select('name studentInfo.roll');
    const studentNameById = new Map(students.map((s) => [String(s._id), s]));

    const irregularStudents = Array.from(studentMap.entries())
      .map(([studentId, data]) => {
        const stats = summarizeRecords(data.statuses);
        return {
          studentId,
          name: studentNameById.get(studentId)?.name || 'Unknown',
          class: data.classKey,
          attendancePercentage: stats.percentage,
        };
      })
      .filter((s) => s.attendancePercentage !== null && s.attendancePercentage < IRREGULAR_ATTENDANCE_THRESHOLD)
      .sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    res.json({ rangeDays: days, classSummary, irregularStudents, irregularThreshold: IRREGULAR_ATTENDANCE_THRESHOLD });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyClasses,
  getClassRoster,
  getClassAttendanceByDate,
  markAttendance,
  getStudentAttendance,
  getAttendanceAnalytics,
};
