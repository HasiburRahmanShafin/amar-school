import { Router } from 'express';
import {
  createCircular,
  listCirculars,
  submitApplication,
  listApplications,
  reviewApplication,
  publishResults,
} from '../controllers/admissionController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Public routes — no login required to browse circulars or apply
router.get('/schools/:schoolId/circulars', listCirculars);
router.post('/applications', submitApplication);

// Admin-only routes
router.post('/circulars', requireAuth, requireRole('ADMIN'), createCircular);
router.get('/circulars/:circularId/applications', requireAuth, requireRole('ADMIN'), listApplications);
router.patch('/applications/:applicationId/review', requireAuth, requireRole('ADMIN'), reviewApplication);
router.post('/circulars/:circularId/publish-results', requireAuth, requireRole('ADMIN'), publishResults);

export default router;
