const express = require('express');
const {
  createExam,
  getExams,
  getExamById,
  updateExam,
  togglePublishExam,
  deleteExam,
  addRoutineSlot,
  updateRoutineSlot,
  deleteRoutineSlot,
  scheduleMakeUpExam,
  getStudentExamRoutine,
  getExamMeta,
} = require('../controllers/exam.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Metadata for filters and terms
router.get(
  '/meta',
  protect,
  authorize('school_admin', 'teacher', 'student', 'parent'),
  attachTenant,
  getExamMeta
);

// Student personalized examination routine
router.get(
  '/student-routine',
  protect,
  authorize('student', 'school_admin', 'teacher', 'parent'),
  attachTenant,
  getStudentExamRoutine
);

// Make-up exam scheduling
router.post(
  '/makeup',
  protect,
  authorize('school_admin'),
  attachTenant,
  scheduleMakeUpExam
);

// Routine slot actions
router.post(
  '/:id/routines',
  protect,
  authorize('school_admin'),
  attachTenant,
  addRoutineSlot
);

router.patch(
  '/:id/routines/:slotId',
  protect,
  authorize('school_admin'),
  attachTenant,
  updateRoutineSlot
);

router.delete(
  '/:id/routines/:slotId',
  protect,
  authorize('school_admin'),
  attachTenant,
  deleteRoutineSlot
);

// Publish toggle
router.patch(
  '/:id/publish',
  protect,
  authorize('school_admin'),
  attachTenant,
  togglePublishExam
);

// Main exam CRUD
router.get(
  '/',
  protect,
  authorize('school_admin', 'teacher', 'student', 'parent'),
  attachTenant,
  getExams
);

router.post(
  '/',
  protect,
  authorize('school_admin'),
  attachTenant,
  createExam
);

router.get(
  '/:id',
  protect,
  authorize('school_admin', 'teacher', 'student', 'parent'),
  attachTenant,
  getExamById
);

router.patch(
  '/:id',
  protect,
  authorize('school_admin'),
  attachTenant,
  updateExam
);

router.delete(
  '/:id',
  protect,
  authorize('school_admin'),
  attachTenant,
  deleteExam
);

module.exports = router;
