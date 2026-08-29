const crypto = require('crypto');
const FeeLedger = require('../models/FeeLedger');
const Student = require('../models/Student');
const { sendEmail } = require('../services/email.service');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthLabel(month, year) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// --------------------------------------------------------------------
// Admin: fee structure setup
// --------------------------------------------------------------------

// @route POST /api/fees   (role: school_admin)
// Creates (or updates, if one already exists for that student/month) a
// fee ledger entry. Upserting means re-running this for the same month
// just adjusts the charges instead of creating a duplicate bill.
exports.setFeeForStudent = async (req, res) => {
  try {
    const {
      studentId, year, month,
      tuitionFee = 0, examFee = 0, otherCharges = 0, lateFee = 0, discount = 0,
    } = req.body;

    if (!studentId || !year || !month) {
      return res.status(400).json({ success: false, message: 'studentId, year and month are required' });
    }

    const student = await Student.findOne({ _id: studentId, schoolId: req.user.schoolId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const ledger = await FeeLedger.findOneAndUpdate(
      { schoolId: req.user.schoolId, studentId, year, month },
      { schoolId: req.user.schoolId, studentId, year, month, tuitionFee, examFee, otherCharges, lateFee, discount },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: ledger });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @route GET /api/fees?studentId=&status=&year=&month=   (role: school_admin)
// Admin-facing list, e.g. to see every unpaid ledger entry for a class.
exports.listFees = async (req, res) => {
  try {
    const filter = { schoolId: req.user.schoolId };
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.month) filter.month = Number(req.query.month);

    const ledgers = await FeeLedger.find(filter)
      .populate('studentId', 'name studentId currentClass section')
      .sort({ year: -1, month: -1 });

    res.json({ success: true, count: ledgers.length, data: ledgers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --------------------------------------------------------------------
// Student: view own fee ledger + breakdown
// --------------------------------------------------------------------

// Resolves the Student profile linked to the logged-in student/parent
// account, and enforces that a student/parent can only ever act on their
// own record - never anyone else's ledger.
async function resolveOwnStudent(req, studentIdParam) {
  const filter = { _id: studentIdParam, schoolId: req.user.schoolId };
  if (req.user.role === 'student') filter.userId = req.user.id;
  if (req.user.role === 'parent') filter.parentUserId = req.user.id;

  const student = await Student.findOne(filter);
  if (!student) {
    const err = new Error('Student not found or this fee record does not belong to your account');
    err.status = 404;
    throw err;
  }
  return student;
}

// @route GET /api/fees/student/:studentId   (role: student [self], parent, school_admin)
// Full fee history + a clear per-month breakdown (tuition, exam, other,
// late fee, discount, paid, due) exactly as described in the requirements.
exports.getStudentFees = async (req, res) => {
  try {
    if (req.user.role === 'student' || req.user.role === 'parent') {
      await resolveOwnStudent(req, req.params.studentId);
    }

    const ledgers = await FeeLedger.find({ schoolId: req.user.schoolId, studentId: req.params.studentId })
      .sort({ year: -1, month: -1 });

    const data = ledgers.map((l) => ({
      id: l._id,
      year: l.year,
      month: l.month,
      monthLabel: monthLabel(l.month, l.year),
      tuitionFee: l.tuitionFee,
      examFee: l.examFee,
      otherCharges: l.otherCharges,
      lateFee: l.lateFee,
      discount: l.discount,
      totalAmount: l.totalAmount,
      paidAmount: l.paidAmount,
      dueAmount: l.dueAmount,
      status: l.status,
      payments: l.payments,
    }));

    const totalDue = data.reduce((sum, l) => sum + l.dueAmount, 0);

    res.json({ success: true, totalDue, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// --------------------------------------------------------------------
// Student: online payment (mock payment gateway)
// --------------------------------------------------------------------

// This project has no real payment gateway credentials, so payments are
// processed through a self-contained mock gateway: it validates the card
// shape, "charges" it instantly, and returns a signed-looking transaction
// ID - the same contract a real gateway (SSLCommerz/Stripe/etc.) would
// hand back, so swapping in a real integration later only touches this
// function.
function mockChargeCard({ cardNumber, expiry, cvv }) {
  const digitsOnly = String(cardNumber || '').replace(/\s+/g, '');
  if (!/^\d{13,19}$/.test(digitsOnly)) {
    return { success: false, message: 'Enter a valid card number' };
  }
  if (!/^\d{2}\/\d{2}$/.test(String(expiry || ''))) {
    return { success: false, message: 'Enter a valid expiry date (MM/YY)' };
  }
  if (!/^\d{3,4}$/.test(String(cvv || ''))) {
    return { success: false, message: 'Enter a valid CVV' };
  }

  const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  return { success: true, transactionId, maskedCard: `**** **** **** ${digitsOnly.slice(-4)}` };
}

// @route POST /api/fees/:id/pay   (role: student [self], parent)
// body: { amount, method, cardNumber, expiry, cvv }
// Charges the mock gateway, applies the payment to the ledger, generates a
// digital receipt with a unique transaction ID, and emails it to the
// guardian - e.g. paying 5000 BDT for July clears that month's due and
// triggers the receipt email, per the requirement's example.
exports.payFee = async (req, res) => {
  try {
    const ledger = await FeeLedger.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!ledger) return res.status(404).json({ success: false, message: 'Fee record not found' });

    if (req.user.role === 'student' || req.user.role === 'parent') {
      await resolveOwnStudent(req, ledger.studentId);
    }

    const { amount, method = 'card', cardNumber, expiry, cvv } = req.body;
    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid payment amount' });
    }
    if (payAmount > ledger.dueAmount) {
      return res.status(400).json({ success: false, message: `Amount exceeds the outstanding due of ${ledger.dueAmount}` });
    }

    let payerReference = 'N/A';
    let transactionId;

    if (method === 'card') {
      const charge = mockChargeCard({ cardNumber, expiry, cvv });
      if (!charge.success) {
        return res.status(400).json({ success: false, message: charge.message });
      }
      transactionId = charge.transactionId;
      payerReference = charge.maskedCard;
    } else {
      // Mobile banking / bank transfer: same mock-gateway contract, just
      // without card-shape validation.
      transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    ledger.paidAmount += payAmount;
    ledger.payments.push({ transactionId, amount: payAmount, method, payerReference });
    await ledger.save();

    const student = await Student.findById(ledger.studentId);

    const receipt = {
      transactionId,
      studentName: student?.name,
      studentCode: student?.studentId,
      month: monthLabel(ledger.month, ledger.year),
      amountPaid: payAmount,
      method,
      paidAt: new Date(),
      remainingDue: ledger.dueAmount,
      status: ledger.status,
    };

    if (student?.guardianEmail) {
      await sendEmail({
        to: student.guardianEmail,
        subject: `Payment receipt - ${receipt.month} fees (${student.name})`,
        html: `
          <p>Dear ${student.guardianName || 'Guardian'},</p>
          <p>We've received a payment of <strong>${payAmount} BDT</strong> for
          <strong>${student.name}</strong>'s ${receipt.month} school fees.</p>
          <table cellpadding="6" style="border-collapse:collapse">
            <tr><td><strong>Transaction ID</strong></td><td>${transactionId}</td></tr>
            <tr><td><strong>Amount paid</strong></td><td>${payAmount} BDT</td></tr>
            <tr><td><strong>Payment method</strong></td><td>${method}</td></tr>
            <tr><td><strong>Remaining due for ${receipt.month}</strong></td><td>${ledger.dueAmount} BDT</td></tr>
          </table>
          <p>${ledger.status === 'paid' ? 'This month is now fully paid.' : 'A balance remains for this month.'}</p>
        `,
      });
    }

    res.status(201).json({ success: true, message: 'Payment successful', data: { ledger, receipt } });
  } catch (error) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
};

// @route GET /api/fees/:id/receipt/:transactionId
// (role: student [self], parent, school_admin) - lets a receipt be re-fetched
// (e.g. for download) without re-emailing it.
exports.getReceipt = async (req, res) => {
  try {
    const ledger = await FeeLedger.findOne({ _id: req.params.id, schoolId: req.user.schoolId })
      .populate('studentId', 'name studentId guardianName');
    if (!ledger) return res.status(404).json({ success: false, message: 'Fee record not found' });

    if (req.user.role === 'student' || req.user.role === 'parent') {
      await resolveOwnStudent(req, ledger.studentId._id);
    }

    const payment = ledger.payments.find((p) => p.transactionId === req.params.transactionId);
    if (!payment) return res.status(404).json({ success: false, message: 'Receipt not found' });

    res.json({
      success: true,
      data: {
        transactionId: payment.transactionId,
        studentName: ledger.studentId.name,
        studentCode: ledger.studentId.studentId,
        month: monthLabel(ledger.month, ledger.year),
        amountPaid: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
