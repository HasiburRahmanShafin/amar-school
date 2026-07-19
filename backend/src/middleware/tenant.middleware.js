// Attaches req.schoolId so every feature controller built later
// (Module 1/2/3) can filter its queries by the logged-in user's
// school without repeating that logic in every file.
const attachTenant = (req, res, next) => {
  if (req.user && req.user.role !== 'super_admin') {
    if (!req.user.schoolId) {
      return res.status(400).json({ message: 'No school associated with this account' });
    }
    req.schoolId = req.user.schoolId;
  }
  next();
};

module.exports = attachTenant;
