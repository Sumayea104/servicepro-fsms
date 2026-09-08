import { Router, raw } from 'express';
import { PaymentController } from '../../controllers/payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
const paymentController = new PaymentController();

// Validation schemas
const initiatePaymentSchema = z.object({
  serviceRequestId: z.string().min(1, 'Service request ID is required'),
  payerReference: z.string().optional(),
});

// Stripe Payment Routes
router.post(
  '/stripe/initiate',
  authenticate,
  requireRole(['CUSTOMER']),
  validate(initiatePaymentSchema),
  paymentController.initiateStripePayment
);

// bKash Payment Routes
router.post(
  '/bkash/initiate',
  authenticate,
  requireRole(['CUSTOMER']),
  validate(initiatePaymentSchema),
  paymentController.initiateBkashPayment
);

// bKash Callback (Public)
router.get(
  '/bkash/callback',
  paymentController.bkashCallback
);

// Stripe Webhook (Public, no auth)
router.post(
  '/stripe/webhook',
  raw({ type: 'application/json' }),
  paymentController.stripeWebhook
);

// Get payment status
router.get(
  '/:id',
  authenticate,
  paymentController.getPaymentStatus
);

// Get user payments
router.get(
  '/user/payments',
  authenticate,
  paymentController.getUserPayments
);

// Refund payment (Admin only)
router.post(
  '/:id/refund',
  authenticate,
  requireRole(['ADMIN', 'FINANCE']),
  paymentController.refundPayment
);

export default router;