const express = require('express');
const {
  getMyWebsiteSettings,
  updateWebsiteSettings,
  getPublicWebsite,
} = require('../controllers/website.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Public - no auth, this is what the live school website page reads
router.get('/public/:subdomain', getPublicWebsite);

// Protected - only that school's admin can view/edit their own settings
router.get('/settings', protect, authorize('school_admin'), attachTenant, getMyWebsiteSettings);
router.patch('/settings', protect, authorize('school_admin'), attachTenant, updateWebsiteSettings);

module.exports = router;
