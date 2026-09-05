const jwt = require('jsonwebtoken');

// Like auth.middleware's `protect`, but never blocks the request. If a
// valid token is present, req.user is populated so route handlers can
// branch on role (e.g. show applicant counts to admins). If there's no
// token, or it's invalid/expired, the request just continues as a public
// (anonymous) visitor instead of getting a 401.
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };
  } catch (error) {
    // Invalid/expired token on a public route - just treat as anonymous
    // rather than failing the request.
  }

  next();
};

module.exports = optionalAuth;
