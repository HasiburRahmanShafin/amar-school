const School = require('../models/School');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @route POST /api/auth/register-school
// A new school + its first School Admin account are created together,
// both starting in a "pending" state until the Super Admin approves.
const registerSchool = async (req, res, next) => {
  try {
    const {
      schoolName,
      eiin,
      address,
      phone,
      schoolEmail,
      subdomain,
      adminName,
      adminEmail,
      password,
    } = req.body;

    if (
      !schoolName || !eiin || !address || !phone || !schoolEmail ||
      !subdomain || !adminName || !adminEmail || !password
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingSchool = await School.findOne({
      $or: [{ eiin }, { subdomain: subdomain.toLowerCase() }],
    });
    if (existingSchool) {
      return res.status(409).json({ message: 'A school with this EIIN or subdomain already exists' });
    }

    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already registered' });
    }

    const school = await School.create({
      name: schoolName,
      eiin,
      subdomain: subdomain.toLowerCase(),
      address,
      phone,
      email: schoolEmail,
      status: 'pending',
    });

    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      password,
      role: 'school_admin',
      school: school._id,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Registration submitted. Your school is pending Super Admin approval.',
      school: { id: school._id, name: school.name, status: school.status },
      user: { id: adminUser._id, email: adminUser.email },
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('school');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // School-linked accounts can't log in until their school is approved
    if (user.role !== 'super_admin' && user.school) {
      if (user.school.status === 'pending') {
        return res.status(403).json({ message: 'Your school is still pending Super Admin approval' });
      }
      if (user.school.status === 'rejected') {
        return res.status(403).json({ message: 'Your school registration was rejected' });
      }
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school
          ? { id: user.school._id, name: user.school.name, status: user.school.status }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('school');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: user.school
        ? { id: user.school._id, name: user.school.name, status: user.school.status }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerSchool, login, getMe };
