const multer = require('multer');

// Notice attachments (exam timetables, circulars, etc.) are more often PDFs
// than images, so this reuses the same in-memory/base64 pattern as
// upload.middleware.js but with a wider file type allowlist.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error('Only image, PDF, or Word attachments are allowed');
    error.statusCode = 400;
    return cb(error, false);
  }
  cb(null, true);
};

const uploadAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB - documents run larger than gallery images
});

module.exports = uploadAttachment;
