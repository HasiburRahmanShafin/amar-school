const express = require('express');
const {
  getMyGallery,
  addGalleryImage,
  deleteGalleryImage,
  getPublicGallery,
} = require('../controllers/gallery.controller');
const protect = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const attachTenant = require('../middleware/tenant.middleware');

const router = express.Router();

// Public
router.get('/public/:subdomain', getPublicGallery);

// Protected
router.get('/', protect, authorize('school_admin'), attachTenant, getMyGallery);
router.post('/', protect, authorize('school_admin'), attachTenant, addGalleryImage);
router.delete('/:id', protect, authorize('school_admin'), attachTenant, deleteGalleryImage);

module.exports = router;
