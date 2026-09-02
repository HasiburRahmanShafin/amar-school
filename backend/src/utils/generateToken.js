const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const schoolId = user.school?._id ? user.school._id.toString() : (user.school ? user.school.toString() : null);
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      schoolId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;

