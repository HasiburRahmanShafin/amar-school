const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attendanceCtrl = require('../controllers/attendance.controller');

// Teacher: take/update today's (or any day's) register for one of their own classes
router.post('/', protect, authorize('teacher'), attendanceCtrl.markAttendance);

// Teacher / admin: view a class's register for a given date (pre-filled roster)
router.get('/', protect, authorize('teacher', 'school_admin'), attendanceCtrl.getClassRegister);

// Student (self) / parent (own child) / admin / teacher: attendance history + percentage
router.get(
  '/student/:studentId',
  protect,
  authorize('student', 'parent', 'school_admin', 'teacher'),
  attendanceCtrl.getStudentHistory
);

module.exports = router;
