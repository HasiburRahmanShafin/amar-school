const express = require('express');
const {
  getTeacherClasses,
  getMarkEntrySheet,
  saveMarkEntrySheet,
  getAdminResultOverview,
  updateResultStatus,
  publishAllExamResults,
  getStudentResults,
  getReportCardData,
} = require('../controllers/result.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Teacher assigned classes & subjects for mark entry
router.get(
  '/teacher/classes',
  protect,
  authorize('teacher', 'school_admin'),
  attachTenant,
  getTeacherClasses
);

// Get mark entry sheet with all enrolled students
router.get(
  '/mark-sheet',
  protect,
  authorize('teacher', 'school_admin'),
  attachTenant,
  getMarkEntrySheet
);

// Save draft or submit marks
router.post(
  '/mark-sheet',
  protect,
  authorize('teacher', 'school_admin'),
  attachTenant,
  saveMarkEntrySheet
);

// Administrative review overview
router.get(
  '/admin/overview',
  protect,
  authorize('school_admin'),
  attachTenant,
  getAdminResultOverview
);

// Admin review action (approve, reject, publish)
router.patch(
  '/:id/status',
  protect,
  authorize('school_admin'),
  attachTenant,
  updateResultStatus
);

// Bulk publish results
router.post(
  '/publish-all',
  protect,
  authorize('school_admin'),
  attachTenant,
  publishAllExamResults
);

// Online student/parent published results
router.get(
  '/student',
  protect,
  authorize('student', 'parent', 'school_admin', 'teacher'),
  attachTenant,
  getStudentResults
);

// Detailed report card data for PDF export/print
router.get(
  '/report-card',
  protect,
  authorize('student', 'parent', 'school_admin', 'teacher'),
  attachTenant,
  getReportCardData
);

module.exports = router;
