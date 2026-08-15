const multer = require('multer');

// Images are kept in memory just long enough to convert them to base64 -
// nothing is ever written to disk, and no third-party storage service is
// needed. That also means this works the same whether the backend is
// deployed somewhere with persistent disk or not.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    const error = new Error('Only image files are allowed');
    error.statusCode = 400;
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  // Keep this modest - base64 inflates the file size by ~33%, and it all
  // ends up sitting inside a MongoDB document.
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per image
});

module.exports = upload;
