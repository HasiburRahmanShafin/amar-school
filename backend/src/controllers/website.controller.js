const School = require('../models/School');

// Fields the School Admin is allowed to edit through the Website Builder.
// Whitelisting like this stops random/unexpected fields (or someone else's
// schoolId) from being written through this endpoint.
//
// Note: institutional identity, contact details, principal's name/message,
// and social media links now live in the School Profile module
// (see school.controller.js / /api/school/profile) so there is a single
// source of truth for that information. The Website Builder stays focused
// on presentation (logo, banner, welcome message, calendar, location) and
// simply displays the profile fields read-only for preview purposes.
const EDITABLE_FIELDS = ['logoUrl', 'bannerUrl', 'welcomeMessage', 'academicCalendar', 'location'];

// @route GET /api/website/settings
// @access Protected - school_admin (their own school, via req.schoolId)
const getMyWebsiteSettings = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId);
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
    const school = await School.findById(req.schoolId);
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
      'name eiin logoUrl bannerUrl welcomeMessage principalName principalMessage ' +
        'address phone additionalPhones email additionalEmails socialLinks ' +
        'academicCalendar location subdomain institutionCode establishmentYear'
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
