const School = require('../models/School');
const User = require('../models/User');
const ProfileChange = require('../models/ProfileChange');
const { sendEmail } = require('../services/email.service');

// @route GET /api/superadmin/schools?status=pending
const getSchools = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const schools = await School.find(filter).sort({ createdAt: -1 });
    res.json(schools);
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/superadmin/schools/:id/approve
const approveSchool = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });

    school.status = 'active';
    await school.save();

    await User.updateMany({ school: school._id, role: 'school_admin' }, { status: 'active' });

    const admin = await User.findOne({ school: school._id, role: 'school_admin' });
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: 'Your school has been approved on Amar School',
        html: `<p>Hi ${admin.name},</p><p>Great news - <strong>${school.name}</strong> has been approved. You can now log in to your dashboard.</p>`,
        category: 'school_approved',
        school: school._id,
      });
    }

    res.json({ message: 'School approved', school });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/superadmin/schools/:id/reject
const rejectSchool = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });

    school.status = 'rejected';
    school.rejectionReason = reason || 'Not specified';
    await school.save();

    const admin = await User.findOne({ school: school._id, role: 'school_admin' });
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: 'Update on your Amar School registration',
        html: `<p>Hi ${admin.name},</p><p>Unfortunately your registration for <strong>${school.name}</strong> was not approved.</p><p>Reason: ${school.rejectionReason}</p>`,
        category: 'school_rejected',
        school: school._id,
      });
    }

    res.json({ message: 'School rejected', school });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// School Profile change approvals
// Sensitive profile fields (school name, EIIN, principal's name, address)
// require Super Admin sign-off before they go live. This is that queue.
// ---------------------------------------------------------------------

// @route GET /api/superadmin/profile-changes?status=pending
const getPendingProfileChanges = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { status: status || 'pending' };
    const changes = await ProfileChange.find(filter)
      .sort('-createdAt')
      .populate('school', 'name subdomain eiin')
      .populate('changedBy', 'name email role')
      .populate('reviewedBy', 'name email');
    res.json(changes);
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/superadmin/profile-changes/:id/approve
const approveProfileChange = async (req, res, next) => {
  try {
    const change = await ProfileChange.findById(req.params.id);
    if (!change) return res.status(404).json({ message: 'Change request not found' });
    if (change.status !== 'pending') {
      return res.status(400).json({ message: 'This change request has already been reviewed' });
    }

    const school = await School.findById(change.school);
    if (!school) return res.status(404).json({ message: 'School not found' });

    // EIIN uniqueness could have changed since the request was filed -
    // re-check right before it goes live.
    if (change.field === 'eiin') {
      const clash = await School.findOne({ eiin: change.newValue, _id: { $ne: school._id } });
      if (clash) {
        return res.status(409).json({ message: 'Another school has since taken this EIIN. Reject this request instead.' });
      }
    }

    school[change.field] = change.newValue;
    school.profileUpdatedAt = new Date();
    await school.save();

    change.status = 'approved';
    change.reviewedBy = req.user.id;
    change.reviewedAt = new Date();
    change.reviewNote = req.body.note || '';
    await change.save();

    const admin = await User.findOne({ school: school._id, role: 'school_admin' });
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: 'Profile change approved - Amar School',
        html: `<p>Hi ${admin.name},</p><p>Your request to change <strong>${change.field}</strong> to "${change.newValue}" has been approved and is now live on <strong>${school.name}</strong>'s profile.</p>`,
        category: 'profile_change_approved',
        school: school._id,
      });
    }

    res.json({ message: 'Change approved and applied', change, school });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/superadmin/profile-changes/:id/reject
const rejectProfileChange = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const change = await ProfileChange.findById(req.params.id);
    if (!change) return res.status(404).json({ message: 'Change request not found' });
    if (change.status !== 'pending') {
      return res.status(400).json({ message: 'This change request has already been reviewed' });
    }

    change.status = 'rejected';
    change.reviewedBy = req.user.id;
    change.reviewedAt = new Date();
    change.reviewNote = reason || 'Not specified';
    await change.save();

    const school = await School.findById(change.school);
    const admin = school ? await User.findOne({ school: school._id, role: 'school_admin' }) : null;
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: 'Profile change rejected - Amar School',
        html: `<p>Hi ${admin.name},</p><p>Your request to change <strong>${change.field}</strong> to "${change.newValue}" was not approved.</p><p>Reason: ${change.reviewNote}</p>`,
        category: 'profile_change_rejected',
        school: school ? school._id : null,
      });
    }

    res.json({ message: 'Change rejected', change });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchools,
  approveSchool,
  rejectSchool,
  getPendingProfileChanges,
  approveProfileChange,
  rejectProfileChange,
};
