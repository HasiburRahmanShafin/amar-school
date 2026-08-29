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

router.get('/summary', protect, authorize('parent', 'student'), dashboardCtrl.getDashboardSummary);
router.get('/attendance', protect, authorize('parent', 'student'), dashboardCtrl.getAttendanceByDate);
router.get('/exam-breakdown', protect, authorize('parent', 'student'), dashboardCtrl.getExamBreakdown);
router.get('/fees', protect, authorize('parent', 'student'), dashboardCtrl.getFeeHistory);
router.patch('/fees/:feeId/pay', protect, authorize('parent'), dashboardCtrl.payFee);
router.get('/study-materials', protect, authorize('parent', 'student'), dashboardCtrl.getStudyMaterials);

module.exports = router;
