const express = require('express');
const { getSchools, approveSchool, rejectSchool } = require('../controllers/superadmin.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

// Every route below requires a valid token AND the super_admin role
router.use(protect, authorize('super_admin'));

router.get('/schools', getSchools);
router.patch('/schools/:id/approve', approveSchool);
router.patch('/schools/:id/reject', rejectSchool);

module.exports = router;
