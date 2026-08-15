const Gallery = require('../models/Gallery');
const School = require('../models/School');

// @route GET /api/gallery
// @access Protected - school_admin (their own school)
const getMyGallery = async (req, res, next) => {
  try {
    const images = await Gallery.find({ school: req.schoolId }).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    next(error);
  }
};

// @route POST /api/gallery
// @access Protected - school_admin
// Note: the actual image file is uploaded straight from the browser to
// Uploadcare (see frontend/src/api/uploadApi.js) - this endpoint just
// saves the resulting CDN URL against the school.
const addGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl, caption, category } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }

    const image = await Gallery.create({
      school: req.schoolId,
      imageUrl,
      caption: caption || '',
      category: category || 'facilities',
    });

    res.status(201).json(image);
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/gallery/:id
// @access Protected - school_admin
const deleteGalleryImage = async (req, res, next) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Make sure a school admin can only delete their OWN school's images
    if (image.school.toString() !== req.schoolId.toString()) {
      return res.status(403).json({ message: 'You cannot delete another school\'s image' });
    }

    await image.deleteOne();
    res.json({ message: 'Image removed' });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/gallery/public/:subdomain
// @access Public - shown on the school's live website
const getPublicGallery = async (req, res, next) => {
  try {
    const school = await School.findOne({
      subdomain: req.params.subdomain.toLowerCase(),
      status: 'active',
    }).select('_id');

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    const images = await Gallery.find({ school: school._id }).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyGallery, addGalleryImage, deleteGalleryImage, getPublicGallery };
