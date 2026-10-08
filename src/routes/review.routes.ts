import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';

const router = Router();

router.get('/technicians/:id/reviews', reviewController.listTechnicianReviews);

export default router;
