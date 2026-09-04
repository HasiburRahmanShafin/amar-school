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
const sslcommerz = require('../services/sslcommerz.service');

// helper: resolves which student this request is about (parent -> their child, student -> self)
async function resolveStudent(req) {
  const filter = { schoolId: req.user.schoolId };
  if (req.user.role === 'parent') filter.parentUserId = req.user.id;
  else if (req.user.role === 'student') filter.studentUserId = req.user.id;
  else filter._id = req.params.studentId;
  return Student.findOne(filter);
}

// ---------------------------------------------------------------------
// Online fee payment (SSLCommerz) — parent/student pays a specific
// FeePayment record online instead of the school marking it paid manually.
// Mirrors the pattern used by subscription.controller.js: create a pending
// record with a tran_id, hand back the gateway URL, and only ever mark the
// fee paid once the callback/IPN validates the transaction server-side.
// ---------------------------------------------------------------------

const generateFeeTranId = (feeId) => `FEE-${feeId}-${Date.now()}`;

const feeCallbackUrls = () => {
  const base = (process.env.SERVER_URL || 'http://localhost:5000').replace(/\/$/, '');
  return {
    success: `${base}/api/student-dashboard/fees/payment/success`,
    fail: `${base}/api/student-dashboard/fees/payment/fail`,
    cancel: `${base}/api/student-dashboard/fees/payment/cancel`,
    ipn: `${base}/api/student-dashboard/fees/payment/ipn`,
  };
};

// Redirects back to whichever dashboard the payer actually uses - a parent
// lands on Child Profile, a student lands on their own dashboard.
const feeClientRedirect = (role, status, extra = '') => {
  const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const path = role === 'parent' ? '/parent/child-profile' : '/student/dashboard';
  return `${base}${path}?feePayment=${status}${extra}`;
};

// Shared by the success redirect and the IPN: marks the fee paid, stamps
// the gateway details on it, and fires the same receipt/admin-alert emails
// the manual/front-desk flow sends. Idempotent - re-processing an
// already-paid fee (e.g. IPN arriving after the redirect already handled
// it) is a safe no-op.
const applySuccessfulFeePayment = async ({ fee, valId, validationData }) => {
  if (fee.status === 'paid') return fee;

  fee.status = 'paid';
  fee.paidDate = new Date();
  fee.valId = valId;
  fee.gatewayResponse = validationData;
  await fee.save();

  const student = await Student.findById(fee.studentId);
  if (student) {
    const receiptRecipient = student.guardianEmail;
    if (receiptRecipient) {
      await sendEmail({
        to: receiptRecipient,
        subject: `Payment received - ${fee.feeType}`,
        html: `<p>Hi ${student.guardianName},</p>` +
          `<p>We've received your online payment of <strong>${fee.amount}</strong> for <strong>${fee.feeType}</strong> ` +
          `on behalf of <strong>${student.name}</strong> (${student.currentClass}${student.section ? ` - ${student.section}` : ''}).</p>` +
          `<p><strong>Transaction ref:</strong> ${fee.tranId}<br/>` +
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
            `<p>An online payment of <strong>${fee.amount}</strong> for <strong>${fee.feeType}</strong> from ` +
            `<strong>${student.name}</strong>'s guardian has been received via SSLCommerz.</p>`,
          category: 'fee_payment_admin_alert',
          school: student.schoolId,
        })
      )
    );
  }

  return fee;
};

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

// @route POST /api/student-dashboard/fees/:feeId/pay/initiate
// @access Protected - parent, student
// Starts an SSLCommerz checkout session for one fee and returns the
// gateway URL to redirect to. The fee is only marked paid once the
// callback/IPN below validates the payment server-side.
exports.initiateFeePayment = async (req, res) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const fee = await FeePayment.findOne({ _id: req.params.feeId, studentId: student._id });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });

    if (fee.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This fee has already been paid' });
    }

    const tranId = generateFeeTranId(fee._id);

    const gateway = await sslcommerz.initiatePayment({
      tranId,
      amount: fee.amount,
      currency: 'BDT',
      productName: `${fee.feeType} - ${student.name} (${student.currentClass}${student.section ? ` ${student.section}` : ''})`,
      customer: {
        name: student.guardianName,
        email: student.guardianEmail,
        phone: student.guardianPhone,
        address: student.address,
      },
      callbackUrls: feeCallbackUrls(),
    });

    if (!gateway.success) {
      return res.status(502).json({ success: false, message: gateway.message });
    }

    fee.status = 'processing';
    fee.paymentMethod = 'sslcommerz';
    fee.tranId = tranId;
    fee.paidBy = req.user.id;
    fee.failureReason = undefined;
    await fee.save();

    res.json({
      success: true,
      message: 'Redirecting to SSLCommerz to complete payment.',
      data: { gatewayUrl: gateway.gatewayUrl, tranId },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route POST /api/student-dashboard/fees/payment/success   (SSLCommerz redirect, public)
exports.handleFeePaymentSuccess = async (req, res) => {
  try {
    const { tran_id: tranId, val_id: valId } = req.body;
    const fee = await FeePayment.findOne({ tranId });
    if (!fee) return res.redirect(feeClientRedirect('student', 'failed', '&reason=not_found'));

    const payer = fee.paidBy ? await User.findById(fee.paidBy).select('role') : null;
    const role = payer?.role || 'student';

    if (fee.status !== 'paid') {
      const validation = await sslcommerz.validateTransaction(valId);
      if (!validation.valid) {
        fee.status = 'pending';
        fee.failureReason = 'Payment could not be validated with SSLCommerz';
        await fee.save();
        return res.redirect(feeClientRedirect(role, 'failed', '&reason=validation_failed'));
      }
      await applySuccessfulFeePayment({ fee, valId, validationData: validation.data });
    }

    res.redirect(feeClientRedirect(role, 'success'));
  } catch (error) {
    console.error('Fee payment success handler failed:', error.message);
    res.redirect(feeClientRedirect('student', 'failed', '&reason=server_error'));
  }
};

// @route POST /api/student-dashboard/fees/payment/fail   (SSLCommerz redirect, public)
exports.handleFeePaymentFail = async (req, res) => {
  try {
    const { tran_id: tranId } = req.body;
    const fee = await FeePayment.findOne({ tranId });
    let role = 'student';
    if (fee) {
      const payer = fee.paidBy ? await User.findById(fee.paidBy).select('role') : null;
      role = payer?.role || 'student';
      if (fee.status !== 'paid') {
        fee.status = 'pending';
        fee.failureReason = 'Payment failed at the gateway';
        await fee.save();
      }
    }
    res.redirect(feeClientRedirect(role, 'failed'));
  } catch (error) {
    console.error('Fee payment fail handler failed:', error.message);
    res.redirect(feeClientRedirect('student', 'failed'));
  }
};

// @route POST /api/student-dashboard/fees/payment/cancel   (SSLCommerz redirect, public)
exports.handleFeePaymentCancel = async (req, res) => {
  try {
    const { tran_id: tranId } = req.body;
    const fee = await FeePayment.findOne({ tranId });
    let role = 'student';
    if (fee) {
      const payer = fee.paidBy ? await User.findById(fee.paidBy).select('role') : null;
      role = payer?.role || 'student';
      if (fee.status !== 'paid') {
        fee.status = 'pending';
        await fee.save();
      }
    }
    res.redirect(feeClientRedirect(role, 'cancelled'));
  } catch (error) {
    console.error('Fee payment cancel handler failed:', error.message);
    res.redirect(feeClientRedirect('student', 'cancelled'));
  }
};

// @route POST /api/student-dashboard/fees/payment/ipn   (SSLCommerz server-to-server, public)
// Same validation/apply logic as the success redirect, but this is the
// channel that's actually reliable - the browser redirect can be closed or
// dropped by the user before it lands, the IPN is sent independently by
// SSLCommerz's servers. Idempotent: re-processing an already-paid fee is a
// safe no-op.
exports.handleFeeIpn = async (req, res) => {
  try {
    const { tran_id: tranId, val_id: valId, status } = req.body;
    const fee = await FeePayment.findOne({ tranId });
    if (!fee) return res.status(200).send('OK');
    if (fee.status === 'paid') return res.status(200).send('OK');
    if (status !== 'VALID' && status !== 'VALIDATED') return res.status(200).send('OK');

    const validation = await sslcommerz.validateTransaction(valId);
    if (!validation.valid) return res.status(200).send('OK');

    await applySuccessfulFeePayment({ fee, valId, validationData: validation.data });
    res.status(200).send('OK');
  } catch (error) {
    console.error('Fee payment IPN handler failed:', error.message);
    res.status(200).send('OK');
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
