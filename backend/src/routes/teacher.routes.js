const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const teacherCtrl = require('../controllers/teacher.controller');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

router.post('/', protect, authorize('school_admin'), teacherCtrl.createTeacher);
router.get('/', protect, authorize('school_admin'), teacherCtrl.getTeachers);
// Must come before "/:id" or Express will treat "by-class" as an :id param.
router.get('/by-class', protect, authorize('school_admin', 'teacher'), teacherCtrl.getTeachersByClass);
router.get('/:id', protect, authorize('school_admin'), teacherCtrl.getTeacherById);
router.patch('/:id', protect, authorize('school_admin'), teacherCtrl.updateTeacher);
router.patch('/:id/classes', protect, authorize('school_admin'), teacherCtrl.updateAssignedClasses);
router.delete('/:id', protect, authorize('school_admin'), teacherCtrl.deleteTeacher);

module.exports = router;
