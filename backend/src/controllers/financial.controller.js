const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const FeeStructure = require('../models/FeeStructure');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

const currentAcademicYear = () => String(new Date().getFullYear());

// Shared by summary/list/export so the dashboard and its exports never
// silently disagree about what "the current filter" means.
const buildFilter = (req) => {
  const { startDate, endDate, className, feeType } = req.query;
  const filter = { school: req.schoolId };

  if (startDate || endDate) {
    filter.paymentDate = {};
    if (startDate) filter.paymentDate.$gte = new Date(startDate);
    if (endDate) {
      // Inclusive of the whole end day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.paymentDate.$lte = end;
    }
  }
  if (className) filter.className = className;
  if (feeType) filter.feeType = feeType;

  return filter;
};

// ---------------------------------------------------------------------
// Fee structure (the "required fees" side of the pending-dues comparison)
// ---------------------------------------------------------------------

// @route POST /api/financial/fee-structures
// @access Protected - school_admin
const upsertFeeStructure = async (req, res, next) => {
  try {
    const { academicYear, className, feeType, amount, label } = req.body;

    if (!className || !feeType || amount === undefined) {
      return res.status(400).json({ message: 'className, feeType and amount are required' });
    }
    if (amount < 0) {
      return res.status(400).json({ message: 'amount cannot be negative' });
    }

    const query = {
      school: req.schoolId,
      academicYear: academicYear || currentAcademicYear(),
      className,
      feeType,
      label: label || null,
    };

    const feeStructure = await FeeStructure.findOneAndUpdate(
      query,
      { ...query, amount, setBy: req.user.id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(feeStructure);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/financial/fee-structures
// @access Protected - school_admin
const getFeeStructures = async (req, res, next) => {
  try {
    const academicYear = req.query.academicYear || currentAcademicYear();
    const feeStructures = await FeeStructure.find({ school: req.schoolId, academicYear }).sort({
      className: 1,
      feeType: 1,
    });
    res.json(feeStructures);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// Transactions (the "paid" side of the pending-dues comparison)
// ---------------------------------------------------------------------

// @route POST /api/financial/transactions
// @access Protected - school_admin (manual/front-desk entry; the online
// gateway module records completed payments the same way from its webhook)
const recordTransaction = async (req, res, next) => {
  try {
    const {
      student,
      feeType,
      label,
      amount,
      status,
      paymentMethod,
      transactionRef,
      academicYear,
      paymentDate,
    } = req.body;

    if (!student || !feeType || amount === undefined) {
      return res.status(400).json({ message: 'student, feeType and amount are required' });
    }

    const studentUser = await User.findOne({ _id: student, school: req.schoolId, role: 'student' });
    if (!studentUser) {
      return res.status(404).json({ message: 'Student not found in this school' });
    }
    if (!studentUser.className) {
      return res.status(400).json({ message: 'This student has no class assigned yet' });
    }

    const transaction = await Transaction.create({
      school: req.schoolId,
      student: studentUser._id,
      studentName: studentUser.name,
      className: studentUser.className,
      section: studentUser.section,
      feeType,
      label,
      amount,
      status: status || 'completed',
      paymentMethod: paymentMethod || 'cash',
      transactionRef,
      academicYear: academicYear || currentAcademicYear(),
      paymentDate: paymentDate || Date.now(),
      recordedBy: req.user.id,
    });

    // Receipt to the student + a payment-confirmation alert to the school's
    // admins. Best-effort: a failed send never blocks the 201 response.
    if (transaction.status === 'completed') {
      await sendEmail({
        to: studentUser.email,
        subject: `Payment received - ${transaction.label || transaction.feeType}`,
        html: `<p>Hi ${studentUser.name},</p>` +
          `<p>We've received your payment of <strong>${transaction.amount}</strong> for ` +
          `<strong>${transaction.label || transaction.feeType}</strong> (${transaction.className}${transaction.section ? ` - ${transaction.section}` : ''}).</p>` +
          `<p><strong>Transaction ref:</strong> ${transaction.transactionRef || transaction._id}<br/>` +
          `<strong>Date:</strong> ${new Date(transaction.paymentDate).toLocaleDateString()}</p>` +
          `<p>This email serves as your receipt. Please keep it for your records.</p>`,
        category: 'fee_receipt',
        school: req.schoolId,
      });

      const admins = await User.find({ school: req.schoolId, role: 'school_admin', status: 'active' }).select('email name');
      await Promise.all(
        admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `Payment confirmed: ${studentUser.name} - ${transaction.label || transaction.feeType}`,
            html: `<p>Hi ${admin.name},</p>` +
              `<p>A payment of <strong>${transaction.amount}</strong> from <strong>${studentUser.name}</strong> ` +
              `(${transaction.className}${transaction.section ? ` - ${transaction.section}` : ''}) has been recorded.</p>`,
            category: 'fee_payment_admin_alert',
            school: req.schoolId,
          })
        )
      );
    }

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/financial/transactions
// @access Protected - school_admin
const getTransactions = async (req, res, next) => {
  try {
    const filter = buildFilter(req);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ paymentDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/financial/transactions/mine
// @access Protected - student (own payment history)
const getMyTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      school: req.schoolId,
      student: req.user.id,
    }).sort({ paymentDate: -1 });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// Reporting - the actual "Financial Reports" dashboard
// ---------------------------------------------------------------------

const getRevenueByType = async (school, filter) => {
  const rows = await Transaction.aggregate([
    { $match: { ...filter, status: 'completed' } },
    { $group: { _id: '$feeType', total: { $sum: '$amount' } } },
  ]);
  return rows.reduce((acc, row) => ({ ...acc, [row._id]: row.total }), {
    tuition: 0,
    exam: 0,
    other: 0,
  });
};

const getRevenueTrend = async (filter) => {
  // Trend intentionally ignores the date-range filter (it IS the trend
  // over time) but respects className/feeType so "trend for Class 8" works.
  const { paymentDate, ...trendFilter } = filter;
  const rows = await Transaction.aggregate([
    { $match: { ...trendFilter, status: 'completed' } },
    {
      $group: {
        _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 },
  ]);
  return rows.map((row) => ({
    month: `${row._id.year}-${String(row._id.month).padStart(2, '0')}`,
    total: row.total,
  }));
};

// Pending dues per class = (required fee per student x number of active
// students in that class) - amount already paid by that class, for the
// selected academic year. This mirrors the spec: "comparing the total
// required fees against paid amounts for each student", rolled up by class.
const getPendingDuesByClass = async (req) => {
  const academicYear = req.query.academicYear || currentAcademicYear();
  const feeTypeFilter = req.query.feeType ? { feeType: req.query.feeType } : {};

  const [feeStructures, studentCounts, paidTotals] = await Promise.all([
    FeeStructure.find({ school: req.schoolId, academicYear, ...feeTypeFilter }),
    User.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(req.schoolId), role: 'student', status: 'active', className: { $ne: null } } },
      { $group: { _id: '$className', count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(req.schoolId), academicYear, status: 'completed', ...feeTypeFilter } },
      { $group: { _id: '$className', paid: { $sum: '$amount' } } },
    ]),
  ]);

  const requiredPerClass = feeStructures.reduce((acc, fs) => {
    acc[fs.className] = (acc[fs.className] || 0) + fs.amount;
    return acc;
  }, {});
  const countPerClass = studentCounts.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});
  const paidPerClass = paidTotals.reduce((acc, row) => ({ ...acc, [row._id]: row.paid }), {});

  const classNames = new Set([
    ...Object.keys(requiredPerClass),
    ...Object.keys(countPerClass),
    ...Object.keys(paidPerClass),
  ]);

  return Array.from(classNames)
    .map((className) => {
      const totalRequired = (requiredPerClass[className] || 0) * (countPerClass[className] || 0);
      const totalPaid = paidPerClass[className] || 0;
      return {
        className,
        studentCount: countPerClass[className] || 0,
        totalRequired,
        totalPaid,
        pendingDues: Math.max(totalRequired - totalPaid, 0),
      };
    })
    .sort((a, b) => a.className.localeCompare(b.className));
};

// @route GET /api/financial/summary
// @access Protected - school_admin
// Filters: startDate, endDate, className, feeType (all optional query params)
const getFinancialSummary = async (req, res, next) => {
  try {
    const filter = buildFilter(req);

    const [totalCollectionRows, revenueByType, revenueTrend, pendingDuesByClass, transactionCount] =
      await Promise.all([
        Transaction.aggregate([
          { $match: { ...filter, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        getRevenueByType(req.schoolId, filter),
        getRevenueTrend(filter),
        getPendingDuesByClass(req),
        Transaction.countDocuments({ ...filter, status: 'completed' }),
      ]);

    res.json({
      filters: {
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        className: req.query.className || null,
        feeType: req.query.feeType || null,
      },
      totalCollection: totalCollectionRows[0]?.total || 0,
      transactionCount,
      revenueByType,
      revenueTrend,
      pendingDuesByClass,
      totalPendingDues: pendingDuesByClass.reduce((sum, row) => sum + row.pendingDues, 0),
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------

// @route GET /api/financial/export/excel
// @access Protected - school_admin
const exportExcel = async (req, res, next) => {
  try {
    const filter = buildFilter(req);
    const transactions = await Transaction.find(filter).sort({ paymentDate: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Amar School';

    const sheet = workbook.addWorksheet('Transactions');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Student', key: 'studentName', width: 22 },
      { header: 'Class', key: 'className', width: 12 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Fee Type', key: 'feeType', width: 12 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Method', key: 'paymentMethod', width: 12 },
      { header: 'Reference', key: 'transactionRef', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    transactions.forEach((t) => {
      sheet.addRow({
        date: t.paymentDate.toISOString().substring(0, 10),
        studentName: t.studentName,
        className: t.className,
        section: t.section,
        feeType: t.feeType,
        amount: t.amount,
        status: t.status,
        paymentMethod: t.paymentMethod,
        transactionRef: t.transactionRef,
      });
    });

    const totalCompleted = transactions
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    sheet.addRow({});
    sheet.addRow({ studentName: 'Total Collected', amount: totalCompleted }).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// @route GET /api/financial/export/pdf
// @access Protected - school_admin
const exportPdf = async (req, res, next) => {
  try {
    const filter = buildFilter(req);
    const LIMIT = 2000;
    const [transactions, summary] = await Promise.all([
      Transaction.find(filter).sort({ paymentDate: -1 }).limit(LIMIT),
      getPendingDuesByClass(req),
    ]);
    const truncated = transactions.length === LIMIT;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.pdf"');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text('Financial Report', { align: 'center' });
    doc.moveDown();

    const totalCompleted = transactions
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    doc.fontSize(12).text(`Total Collected (this filter): BDT ${totalCompleted.toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Pending Dues by Class');
    doc.fontSize(10);
    summary.forEach((row) => {
      doc.text(
        `${row.className}: Required BDT ${row.totalRequired.toLocaleString()} | ` +
          `Paid BDT ${row.totalPaid.toLocaleString()} | Pending BDT ${row.pendingDues.toLocaleString()}`
      );
    });
    doc.moveDown();

    doc.fontSize(14).text('Transactions');
    doc.fontSize(9);
    transactions.forEach((t) => {
      doc.text(
        `${t.paymentDate.toISOString().substring(0, 10)}  ${t.studentName} (${t.className})  ` +
          `${t.feeType}  BDT ${t.amount}  ${t.status}`
      );
    });


    if (truncated) {
      doc.moveDown();
      doc
        .fontSize(9)
        .fillColor('#dc2626')
        .text(
          `⚠ This report shows the first ${LIMIT} transactions matching your filter. ` +
            'To export all data, narrow the date range or apply a class/fee-type filter.',
          { align: 'center' }
        );
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertFeeStructure,
  getFeeStructures,
  recordTransaction,
  getTransactions,
  getMyTransactions,
  getFinancialSummary,
  exportExcel,
  exportPdf,
};
