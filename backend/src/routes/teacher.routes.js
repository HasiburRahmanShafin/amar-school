const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const teacherCtrl = require('../controllers/teacher.controller');

// Admin: profile CRUD
router.post('/', protect, authorize('school_admin'), teacherCtrl.createTeacher);
router.get('/', protect, authorize('school_admin'), teacherCtrl.getTeachers);

// Literal segments must be registered before "/:id" or Express treats them
// as an :id param instead ("/by-class" and "/me" would otherwise misroute).
router.get('/by-class', protect, authorize('school_admin', 'teacher'), teacherCtrl.getTeachersByClass);

// Self-service (role: teacher)
router.get('/me', protect, authorize('teacher'), teacherCtrl.getMyProfile);
router.patch('/me', protect, authorize('teacher'), teacherCtrl.updateMyProfile);
router.patch('/me/password', protect, authorize('teacher'), teacherCtrl.changeMyPassword);

router.get('/:id', protect, authorize('school_admin'), teacherCtrl.getTeacherById);
router.patch('/:id', protect, authorize('school_admin'), teacherCtrl.updateTeacher);
router.patch('/:id/classes', protect, authorize('school_admin'), teacherCtrl.updateAssignedClasses);
router.delete('/:id', protect, authorize('school_admin'), teacherCtrl.deleteTeacher);

// Login account management (admin)
router.post('/:id/account', protect, authorize('school_admin'), teacherCtrl.createTeacherAccount);
router.delete('/:id/account', protect, authorize('school_admin'), teacherCtrl.revokeTeacherAccount);

module.exports = router;
