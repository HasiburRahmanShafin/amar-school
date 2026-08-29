const express = require('express');
const {
  createOrPublishRoutine,
  getMyRoutines,
  getRoutineClasses,
  updateRoutine,
  deleteRoutine,
  getDashboardRoutine,
  getPublicRoutine,
} = require('../controllers/routine.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Public - shown on the school website
router.get('/public/:subdomain', getPublicRoutine);

// Protected - the shared feed every dashboard (school_admin, teacher,
// student, parent) reads from
router.get(
  '/dashboard',
  protect,
  authorize('school_admin', 'teacher', 'student', 'parent'),
  attachTenant,
  getDashboardRoutine
);

// Protected management - administrators and teachers collaboratively
// create/edit/publish routines for their school
router.get('/classes', protect, authorize('school_admin', 'teacher'), attachTenant, getRoutineClasses);
router.get('/', protect, authorize('school_admin', 'teacher'), attachTenant, getMyRoutines);
router.post('/', protect, authorize('school_admin', 'teacher'), attachTenant, createOrPublishRoutine);
router.patch('/:id', protect, authorize('school_admin', 'teacher'), attachTenant, updateRoutine);
router.delete('/:id', protect, authorize('school_admin', 'teacher'), attachTenant, deleteRoutine);

module.exports = router;
