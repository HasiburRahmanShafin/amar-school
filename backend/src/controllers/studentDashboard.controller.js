const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const ClassRoutine = require('../models/ClassRoutine');
const FeePayment = require('../models/FeePayment');
const Assignment = require('../models/Assignment');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

// helper: resolves which student this request is about (parent -> their child, student -> self)
async function resolveStudent(req) {
  const filter = { schoolId: req.user.schoolId };
  if (req.user.role === 'parent') filter.parentUserId = req.user.id;
  else filter._id = req.params.studentId || req.user.studentId;
  return Student.findOne(filter);
}

// Combined dashboard — everything in one call for the main dashboard view
exports.getDashboardSummary = async (req, res) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [routine, attendanceStats, recentExams, pendingAssignments, feeHistory] = await Promise.all([
      ClassRoutine.find({ schoolId: student.schoolId, class: student.currentClass, section: student.section }),

      Attendance.aggregate([
        { $match: { studentId: student._id } },
        {
          $group: {
            _id: null,
            totalDays: { $sum: 1 },
            presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          },
        },
      ]),

      ExamResult.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(5),

      Assignment.find({
        schoolId: student.schoolId,
        class: student.currentClass,
        section: student.section,
        dueDate: { $gte: new Date() },
      }).sort({ dueDate: 1 }),

      FeePayment.find({ studentId: student._id }).sort({ dueDate: -1 }),
    ]);

    const attendancePercentage = attendanceStats[0]
      ? Math.round((attendanceStats[0].presentDays / attendanceStats[0].totalDays) * 1000) / 10
      : 0;

    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          studentId: student.studentId,
          currentClass: student.currentClass,
          section: student.section,
        },
        routine,
        attendanceSummary: { percentage: attendancePercentage, ...attendanceStats[0] },
        recentExams,
        pendingAssignments,
        feeHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check attendance for a specific date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const { date } = req.query;
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const record = await Attendance.findOne({
      studentId: student._id,
      date: { $gte: targetDate, $lt: nextDay },
    });

    res.json({ success: true, data: record || { status: 'no record for this date' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Exam result with subject-wise breakdown for a given exam
exports.getExamBreakdown = async (req, res) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const { examName } = req.query;
    const filter = { studentId: student._id };
    if (examName) filter.examName = examName;

    const results = await ExamResult.find(filter).sort({ subject: 1 });
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fee payment history + outstanding dues
exports.getFeeHistory = async (req, res) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const fees = await FeePayment.find({ studentId: student._id }).sort({ dueDate: -1 });
    const outstanding = fees.filter((f) => f.status !== 'paid');
    res.json({ success: true, data: { fees, outstandingTotal: outstanding.reduce((sum, f) => sum + f.amount, 0) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Pay a specific fee (marks as paid — actual payment gateway would hook in here)
exports.payFee = async (req, res) => {
  try {
    const fee = await FeePayment.findOneAndUpdate(
      { _id: req.params.feeId },
      { status: 'paid', paidDate: new Date() },
      { new: true }
    );
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

    // Receipt to the parent + a payment-confirmation alert to the school's
    // admins. Best-effort: a failed send never blocks the response.
    const student = await Student.findById(fee.studentId);
    if (student) {
      const receiptRecipient = student.guardianEmail;
      if (receiptRecipient) {
        await sendEmail({
          to: receiptRecipient,
          subject: `Payment received - ${fee.feeType}`,
          html: `<p>Hi ${student.guardianName},</p>` +
            `<p>We've received payment of <strong>${fee.amount}</strong> for <strong>${fee.feeType}</strong> ` +
            `on behalf of <strong>${student.name}</strong> (${student.currentClass}${student.section ? ` - ${student.section}` : ''}).</p>` +
            `<p><strong>Due date:</strong> ${new Date(fee.dueDate).toLocaleDateString()}<br/>` +
            `<strong>Paid on:</strong> ${new Date(fee.paidDate).toLocaleDateString()}</p>` +
            `<p>This email serves as your receipt. Please keep it for your records.</p>`,
          category: 'fee_receipt',
          school: student.schoolId,
        });
      }

      const admins = await User.find({ school: student.schoolId, role: 'school_admin', status: 'active' }).select('email name');
      await Promise.all(
        admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `Payment confirmed: ${student.name} - ${fee.feeType}`,
            html: `<p>Hi ${admin.name},</p>` +
              `<p>A payment of <strong>${fee.amount}</strong> for <strong>${fee.feeType}</strong> from ` +
              `<strong>${student.name}</strong>'s guardian has been recorded.</p>`,
            category: 'fee_payment_admin_alert',
            school: student.schoolId,
          })
        )
      );
    }

    res.json({ success: true, data: fee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Downloadable study materials for the student's class
exports.getStudyMaterials = async (req, res) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const materials = await StudyMaterial.find({
      schoolId: student.schoolId,
      class: student.currentClass,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
