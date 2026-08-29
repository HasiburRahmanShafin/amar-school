const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const studentCtrl = require('../controllers/student.controller');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

router.post('/', protect, authorize('school_admin'), studentCtrl.createStudent);
router.get('/', protect, authorize('school_admin'), studentCtrl.getStudents);
router.get('/enrollment-count', protect, authorize('school_admin'), studentCtrl.getEnrollmentCount);
router.post('/promote', protect, authorize('school_admin'), studentCtrl.promoteStudents);

// Self-service (role: student) - literal segment, must come before "/:id"
router.get('/me', protect, authorize('student'), studentCtrl.getMyProfile);

router.get('/:id', protect, authorize('school_admin', 'parent'), studentCtrl.getStudentById);
router.patch('/:id', protect, authorize('school_admin', 'parent'), studentCtrl.updateStudent);
router.delete('/:id', protect, authorize('school_admin'), studentCtrl.deleteStudent);
router.get('/:id/id-card', protect, authorize('school_admin'), studentCtrl.getIdCardData);

// Login account management (admin) - lets a student sign in for
// Attendance History / Online Fee Payment
router.post('/:id/account', protect, authorize('school_admin'), studentCtrl.createStudentAccount);
router.delete('/:id/account', protect, authorize('school_admin'), studentCtrl.revokeStudentAccount);

module.exports = router;
