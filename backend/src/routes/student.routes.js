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

module.exports = router;
