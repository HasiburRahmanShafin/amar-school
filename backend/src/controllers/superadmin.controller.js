const School = require('../models/School');
const User = require('../models/User');
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
      });
    }

    res.json({ message: 'School rejected', school });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSchools, approveSchool, rejectSchool };
