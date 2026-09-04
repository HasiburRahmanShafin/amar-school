const express = require('express');
const {
  getPlans,
  getMySubscription,
  upgradePlan,
  downgradePlan,
  cancelScheduledDowngrade,
  renewManually,
  handlePaymentSuccess,
  handlePaymentFail,
  handlePaymentCancel,
  handleIpn,
  getInvoices,
  downloadInvoicePdf,
} = require('../controllers/subscription.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// SSLCommerz posts these directly (no JWT - the browser/gateway hits them,
// not our own frontend), identified purely by the tran_id in the body.
// express.urlencoded is needed here since SSLCommerz posts form data.
router.post('/payment/success', express.urlencoded({ extended: true }), handlePaymentSuccess);
router.post('/payment/fail', express.urlencoded({ extended: true }), handlePaymentFail);
router.post('/payment/cancel', express.urlencoded({ extended: true }), handlePaymentCancel);
router.post('/payment/ipn', express.urlencoded({ extended: true }), handleIpn);

// Everything else is the school_admin managing their own subscription.
router.use(protect, authorize('school_admin'), attachTenant);

router.get('/plans', getPlans);
router.get('/my', getMySubscription);
router.post('/upgrade', upgradePlan);
router.post('/downgrade', downgradePlan);
router.post('/downgrade/cancel', cancelScheduledDowngrade);
router.post('/renew', renewManually);

router.get('/invoices', getInvoices);
router.get('/invoices/:id/pdf', downloadInvoicePdf);

module.exports = router;
