const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const attachTenant = require('../middleware/tenant.middleware');
const attendanceCtrl = require('../controllers/attendance.controller');
 
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};
 
router.get('/class', protect, attachTenant, authorize('school_admin', 'teacher'), attendanceCtrl.getClassAttendance);
router.post('/mark', protect, attachTenant, authorize('school_admin', 'teacher'), attendanceCtrl.markAttendance);
router.get('/summary', protect, attachTenant, authorize('school_admin', 'teacher'), attendanceCtrl.getClassSummary);
 
module.exports = router;
 