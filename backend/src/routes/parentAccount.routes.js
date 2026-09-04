const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const parentCtrl = require('../controllers/parentAccount.controller');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

router.get('/pending', protect, authorize('school_admin'), parentCtrl.getStudentsWithoutParentAccount);
router.post('/', protect, authorize('school_admin'), parentCtrl.createParentAccount);

module.exports = router;