const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const ExamResult = require('../models/ExamResult');

exports.getEnrollmentTrends = async (req, res) => {
  try {
    const trends = await Student.aggregate([
      { $match: { schoolId: req.user.schoolId } },
      {
        $group: {
          _id: { year: { $year: '$admissionDate' }, month: { $month: '$admissionDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate, class: classFilter } = req.query;
    const match = { schoolId: req.user.schoolId };
    if (classFilter) match.class = classFilter;
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const stats = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { class: '$class', section: '$section' },
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        },
      },
      {
        $project: {
          class: '$_id.class',
          section: '$_id.section',
          totalDays: 1,
          presentDays: 1,
          attendancePercentage: {
            $round: [{ $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }, 1],
          },
        },
      },
      { $sort: { class: 1, section: 1 } },
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExamPerformance = async (req, res) => {
  try {
    const { class: classFilter, academicYear } = req.query;
    const match = { schoolId: req.user.schoolId };
    if (classFilter) match.class = classFilter;
    if (academicYear) match.academicYear = Number(academicYear);

    const performance = await ExamResult.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$subject',
          avgMarksObtained: { $avg: '$marksObtained' },
          avgTotalMarks: { $avg: '$totalMarks' },
          resultCount: { $sum: 1 },
        },
      },
      {
        $project: {
          subject: '$_id',
          avgPercentage: {
            $round: [{ $multiply: [{ $divide: ['$avgMarksObtained', '$avgTotalMarks'] }, 100] }, 1],
          },
          resultCount: 1,
        },
      },
      { $sort: { subject: 1 } },
    ]);

    res.json({ success: true, data: performance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const totalStudents = await Student.countDocuments({ schoolId, status: 'active' });

    const attendanceAgg = await Attendance.aggregate([
      { $match: { schoolId } },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        },
      },
    ]);
    const overallAttendance = attendanceAgg[0]
      ? Math.round((attendanceAgg[0].presentDays / attendanceAgg[0].totalDays) * 1000) / 10
      : 0;

    res.json({ success: true, data: { totalStudents, overallAttendance } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
