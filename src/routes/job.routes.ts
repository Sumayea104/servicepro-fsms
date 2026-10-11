import { Router } from 'express';
import * as jobController from '../controllers/job.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import {
  createJobSchema,
  reviewJobSchema,
  assignJobSchema,
  rescheduleJobSchema,
  updateJobStatusSchema,
  submitServiceReportSchema,
} from '../validators/job.validator.js';
import { createReviewSchema } from '../validators/review.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('CUSTOMER'), validate(createJobSchema), jobController.createJob);
router.get('/', jobController.listJobs); // scoped per-role inside the service
router.get('/search', requireRole('ADMIN'), jobController.searchJobs); // cross-customer search is an ops tool, not exposed to customers/technicians
router.get('/:id', jobController.getJob);

router.delete('/:id', requireRole('ADMIN'), jobController.deleteJob);
router.patch('/:id/review', requireRole('ADMIN'), validate(reviewJobSchema), jobController.reviewJob);
router.post('/:id/assign', requireRole('ADMIN'), validate(assignJobSchema), jobController.assignJob);
router.patch('/:id/reschedule', requireRole('ADMIN'), validate(rescheduleJobSchema), jobController.rescheduleJob);
router.patch('/:id/status', validate(updateJobStatusSchema), jobController.updateJobStatus);
router.post('/:id/cancel', jobController.cancelJob);

router.post('/:id/service-report', requireRole('TECHNICIAN'), validate(submitServiceReportSchema), jobController.submitServiceReport);
router.post('/:id/attachments', upload.single('file'), jobController.uploadAttachment);

router.post('/:id/review-feedback', requireRole('CUSTOMER'), validate(createReviewSchema), reviewController.createReview);

export default router;
