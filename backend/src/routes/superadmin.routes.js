const express = require('express');
const {
  getSchools,
  approveSchool,
  rejectSchool,
  getPendingProfileChanges,
  approveProfileChange,
  rejectProfileChange,
} = require('../controllers/superadmin.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

// Every route below requires a valid token AND the super_admin role
router.use(protect, authorize('super_admin'));

router.get('/schools', getSchools);
router.patch('/schools/:id/approve', approveSchool);
router.patch('/schools/:id/reject', rejectSchool);

// School Profile change approval queue (sensitive fields only)
router.get('/profile-changes', getPendingProfileChanges);
router.patch('/profile-changes/:id/approve', approveProfileChange);
router.patch('/profile-changes/:id/reject', rejectProfileChange);

module.exports = router;
