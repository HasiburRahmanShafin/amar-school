const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      schoolId: user.school || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;
