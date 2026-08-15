const express = require('express');
const multer = require('multer');
const upload = require('../middleware/upload.middleware');
const { handleImageUpload } = require('../controllers/upload.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

router.post('/image', protect, authorize('school_admin'), upload.single('image'), handleImageUpload);

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
