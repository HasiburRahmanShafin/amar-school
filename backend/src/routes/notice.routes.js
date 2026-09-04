const express = require('express');
const multer = require('multer');
const {
  createNotice,
  getMyNotices,
  updateNotice,
  deleteNotice,
  getDashboardNotices,
  getPublicNotices,
} = require('../controllers/notice.controller');
const { handleAttachmentUpload } = require('../controllers/noticeAttachment.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');
const uploadAttachment = require('../middleware/uploadAttachment.middleware');

const router = express.Router();

// Public - shown on the school website homepage
router.get('/public/:subdomain', getPublicNotices);

// Protected - the shared feed every dashboard (school_admin, teacher,
// student, parent) reads from
router.get(
  '/dashboard',
  protect,
  authorize('school_admin', 'teacher', 'student', 'parent'),
  attachTenant,
  getDashboardNotices
);

// Protected - school_admin management
router.get('/', protect, authorize('school_admin'), attachTenant, getMyNotices);
router.post('/', protect, authorize('school_admin'), attachTenant, createNotice);
router.patch('/:id', protect, authorize('school_admin'), attachTenant, updateNotice);
router.delete('/:id', protect, authorize('school_admin'), attachTenant, deleteNotice);

router.post(
  '/attachment',
  protect,
  authorize('school_admin'),
  uploadAttachment.single('attachment'),
  handleAttachmentUpload
);

// multer's own errors (file too large, malformed upload, etc.) don't set
// a statusCode, so without this they'd fall through to the global error
// handler as a generic 500. Catching them here gives a proper 400 instead.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
