const jwt = require('jsonwebtoken');

// Verifies the JWT sent in the Authorization header and attaches
// a lightweight req.user object that the rest of the app can trust.
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

module.exports = protect;
