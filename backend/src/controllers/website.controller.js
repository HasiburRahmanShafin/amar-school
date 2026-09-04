const School = require('../models/School');

// Fields the School Admin is allowed to edit through the Website Builder.
// Whitelisting like this stops random/unexpected fields (or someone else's
// schoolId) from being written through this endpoint.
const EDITABLE_FIELDS = [
  'logoUrl',
  'bannerUrl',
  'welcomeMessage',
  'principalName',
  'principalMessage',
  'socialLinks',
  'academicCalendar',
  'location',
];

// @route GET /api/website/settings
// @access Protected - school_admin (their own school, via req.schoolId)
const getMyWebsiteSettings = async (req, res, next) => {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });
    res.json(school);
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/website/settings
// @access Protected - school_admin
const updateWebsiteSettings = async (req, res, next) => {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        school[field] = req.body[field];
      }
    });

    await school.save();
    res.json({ message: 'Website updated', school });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/website/public/:subdomain
// @access Public - this is what the school's live website page calls.
// Only exposes fields that are safe to show publicly, and only for
// schools that have actually been approved.
const getPublicWebsite = async (req, res, next) => {
  try {
    const school = await School.findOne({
      subdomain: req.params.subdomain.toLowerCase(),
      status: 'active',
    }).select(
      'name logoUrl bannerUrl welcomeMessage principalName principalMessage ' +
        'address phone email socialLinks academicCalendar location subdomain'
    );

    if (!school) {
      return res.status(404).json({ message: 'School website not found or not yet approved' });
    }

    res.json(school);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyWebsiteSettings, updateWebsiteSettings, getPublicWebsite };
