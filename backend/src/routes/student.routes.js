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
router.get('/:id', protect, authorize('school_admin', 'parent'), studentCtrl.getStudentById);
router.patch('/:id', protect, authorize('school_admin', 'parent'), studentCtrl.updateStudent);
router.delete('/:id', protect, authorize('school_admin'), studentCtrl.deleteStudent);
router.get('/:id/id-card', protect, authorize('school_admin'), studentCtrl.getIdCardData);

// Login accounts (student + parent)
router.post('/:id/logins', protect, authorize('school_admin'), studentCtrl.createStudentOrParentLogin);

// Payment details shown on the student profile
router.get('/:id/fees', protect, authorize('school_admin', 'teacher', 'parent', 'student'), studentCtrl.getStudentFees);
router.post('/:id/fees', protect, authorize('school_admin'), studentCtrl.addStudentFee);
router.patch('/:id/fees/:feeId', protect, authorize('school_admin'), studentCtrl.updateStudentFee);

module.exports = router;
