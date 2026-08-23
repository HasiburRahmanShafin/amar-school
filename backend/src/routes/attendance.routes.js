const express = require('express');
const {
  getMyClasses,
  getClassRoster,
  getClassAttendanceByDate,
  markAttendance,
  getStudentAttendance,
  getAttendanceAnalytics,
} = require('../controllers/attendance.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Teacher - class picker + roster + take/edit attendance
router.get('/my-classes', protect, authorize('teacher'), getMyClasses);
router.get('/roster', protect, authorize('teacher', 'school_admin'), attachTenant, getClassRoster);
router.get('/class', protect, authorize('teacher', 'school_admin'), attachTenant, getClassAttendanceByDate);
router.post('/', protect, authorize('teacher'), attachTenant, markAttendance);

// Student / parent / teacher / school_admin - attendance history view,
// filterable by day/week/month/term (also backs report-card data)
router.get(
  '/history',
  protect,
  authorize('student', 'parent', 'teacher', 'school_admin'),
  attachTenant,
  getStudentAttendance
);

// School admin - analytics dashboard (class averages + irregular students)
router.get('/analytics', protect, authorize('school_admin'), attachTenant, getAttendanceAnalytics);

module.exports = router;
