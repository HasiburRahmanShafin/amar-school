const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const feeCtrl = require('../controllers/fee.controller');

// Admin: set up / adjust a student's fee for a given month
router.post('/', protect, authorize('school_admin'), feeCtrl.setFeeForStudent);
router.get('/', protect, authorize('school_admin'), feeCtrl.listFees);

// Student (self) / parent / admin: view a student's fee ledger + breakdown
router.get(
  '/student/:studentId',
  protect,
  authorize('student', 'parent', 'school_admin'),
  feeCtrl.getStudentFees
);

// Student (self) / parent: pay online via the (mock) payment gateway
router.post('/:id/pay', protect, authorize('student', 'parent'), feeCtrl.payFee);

// Fetch a specific digital receipt
router.get(
  '/:id/receipt/:transactionId',
  protect,
  authorize('student', 'parent', 'school_admin'),
  feeCtrl.getReceipt
);

module.exports = router;
