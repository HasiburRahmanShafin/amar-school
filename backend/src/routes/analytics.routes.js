const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const analyticsCtrl = require('../controllers/analytics.controller');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

router.get('/summary', protect, authorize('school_admin'), analyticsCtrl.getSummary);
router.get('/enrollment-trends', protect, authorize('school_admin'), analyticsCtrl.getEnrollmentTrends);
router.get('/attendance-stats', protect, authorize('school_admin'), analyticsCtrl.getAttendanceStats);
router.get('/exam-performance', protect, authorize('school_admin'), analyticsCtrl.getExamPerformance);

module.exports = router;