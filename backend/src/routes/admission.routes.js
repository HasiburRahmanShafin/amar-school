const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const circularCtrl = require('../controllers/AdmissionCircular.controller');
const applicantCtrl = require('../controllers/application.controller');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

router.post('/circulars', protect, authorize('school_admin'), circularCtrl.createCircular);
router.get('/circulars', circularCtrl.getCirculars);
router.get('/circulars/:id', circularCtrl.getCircularById);
router.patch('/circulars/:id', protect, authorize('school_admin'), circularCtrl.updateCircular);
router.delete('/circulars/:id', protect, authorize('school_admin'), circularCtrl.deleteCircular);

router.post('/apply', applicantCtrl.submitApplication);
router.get('/applicants', protect, authorize('school_admin'), applicantCtrl.getApplicants);
router.get('/applicants/:id', protect, authorize('school_admin'), applicantCtrl.getApplicantById);
router.patch('/applicants/:id/status', protect, authorize('school_admin'), applicantCtrl.updateApplicantStatus);
router.patch('/applicants/:id/publish-result', protect, authorize('school_admin'), applicantCtrl.publishResult);

router.get('/results/:circularId', applicantCtrl.getResultsByCircular);

module.exports = router;
