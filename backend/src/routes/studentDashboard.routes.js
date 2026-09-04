const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const dashboardCtrl = require('../controllers/studentDashboard.controller');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

// SSLCommerz posts these directly (no JWT - the browser/gateway hits them,
// not our own frontend), identified purely by the tran_id in the body.
// express.urlencoded is needed here since SSLCommerz posts form data.
router.post('/fees/payment/success', express.urlencoded({ extended: true }), dashboardCtrl.handleFeePaymentSuccess);
router.post('/fees/payment/fail', express.urlencoded({ extended: true }), dashboardCtrl.handleFeePaymentFail);
router.post('/fees/payment/cancel', express.urlencoded({ extended: true }), dashboardCtrl.handleFeePaymentCancel);
router.post('/fees/payment/ipn', express.urlencoded({ extended: true }), dashboardCtrl.handleFeeIpn);

router.get('/summary', protect, authorize('parent', 'student'), dashboardCtrl.getDashboardSummary);
router.get('/attendance', protect, authorize('parent', 'student'), dashboardCtrl.getAttendanceByDate);
router.get('/exam-breakdown', protect, authorize('parent', 'student'), dashboardCtrl.getExamBreakdown);
router.get('/fees', protect, authorize('parent', 'student'), dashboardCtrl.getFeeHistory);
// Parent or student kicks off an online SSLCommerz checkout for a fee -
// see the payment/* routes above for how it gets marked paid.
router.post('/fees/:feeId/pay/initiate', protect, authorize('parent', 'student'), dashboardCtrl.initiateFeePayment);
router.get('/study-materials', protect, authorize('parent', 'student'), dashboardCtrl.getStudyMaterials);

module.exports = router;