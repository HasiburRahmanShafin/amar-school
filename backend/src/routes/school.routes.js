const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  getProfileHistory,
  restoreProfileVersion,
  requestEmailVerification,
  confirmEmailVerification,
  requestPhoneVerification,
  confirmPhoneVerification,
  getPublicProfile,
} = require('../controllers/school.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Public - no auth. Used by the live school website, admission forms,
// and any other generated document that needs current school info.
router.get('/profile/public/:subdomain', getPublicProfile);

// Protected - only that school's admin can view/edit their own profile
router.get('/profile', protect, authorize('school_admin'), attachTenant, getMyProfile);
router.put('/profile', protect, authorize('school_admin'), attachTenant, updateMyProfile);

// Version history - view past changes and restore an earlier field value
router.get('/profile/history', protect, authorize('school_admin'), attachTenant, getProfileHistory);
router.post('/profile/history/:id/restore', protect, authorize('school_admin'), attachTenant, restoreProfileVersion);

// Contact verification (OTP-style) for the primary phone and email
router.post('/profile/verify/email/request', protect, authorize('school_admin'), attachTenant, requestEmailVerification);
router.post('/profile/verify/email/confirm', protect, authorize('school_admin'), attachTenant, confirmEmailVerification);
router.post('/profile/verify/phone/request', protect, authorize('school_admin'), attachTenant, requestPhoneVerification);
router.post('/profile/verify/phone/confirm', protect, authorize('school_admin'), attachTenant, confirmPhoneVerification);

module.exports = router;
