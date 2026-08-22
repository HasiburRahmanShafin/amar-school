const express = require('express');
const {
  upsertFeeStructure,
  getFeeStructures,
  recordTransaction,
  getTransactions,
  getMyTransactions,
  getFinancialSummary,
  exportExcel,
  exportPdf,
} = require('../controllers/financial.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Student/parent - their own payment history (spec: "Student/Parent ...
// views ... payment history"). Parent access to a linked child's history
// depends on a guardian-student link that doesn't exist yet - see the
// follow-up notes for this module.
router.get(
  '/transactions/mine',
  protect,
  authorize('student'),
  attachTenant,
  getMyTransactions
);

// school_admin - fee structure (the "required fees" schools set per class)
router.get('/fee-structures', protect, authorize('school_admin'), attachTenant, getFeeStructures);
router.post('/fee-structures', protect, authorize('school_admin'), attachTenant, upsertFeeStructure);

// school_admin - transactions (fee collection records)
router.get('/transactions', protect, authorize('school_admin'), attachTenant, getTransactions);
router.post('/transactions', protect, authorize('school_admin'), attachTenant, recordTransaction);

// school_admin - the financial dashboard itself and its exports
router.get('/summary', protect, authorize('school_admin'), attachTenant, getFinancialSummary);
router.get('/export/excel', protect, authorize('school_admin'), attachTenant, exportExcel);
router.get('/export/pdf', protect, authorize('school_admin'), attachTenant, exportPdf);

module.exports = router;
