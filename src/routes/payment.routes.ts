import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { initiatePaymentSchema } from '../validators/payment.validator.js';

const router = Router();

router.get('/bkash/callback', paymentController.bkashCallback);

router.use(authenticate);
router.get('/', paymentController.listPayments);
router.post('/initiate', validate(initiatePaymentSchema), paymentController.initiatePayment);
router.get('/:id', paymentController.getPayment);

export default router;
