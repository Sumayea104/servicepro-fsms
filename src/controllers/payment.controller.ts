import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import * as paymentService from '../services/payment.service.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.initiatePayment(req.body.jobId, req.user!.id, req.body.method);
  sendSuccess(res, result, 'Payment initiated', 201);
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentById(req.params.id as string, req.user!);
  sendSuccess(res, payment);
});

export const bkashCallback = asyncHandler(async (req: Request, res: Response) => {
  const { paymentID, status } = req.query as Record<string, string>;
  if (status !== 'success') {
    return res.redirect(`${env.FRONTEND_URL}/payment/failed`);
  }
  if (paymentID) {
    await paymentService.executeBkashPayment(paymentID);
  }
  res.redirect(`${env.FRONTEND_URL}/payment/success`);
});

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { stripe } = await import('../services/payment.service.js');
  if (!stripe) return sendError(res, 'Stripe not configured', 500);

  const signature = req.headers['stripe-signature'] as string;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    throw AppError.badRequest(`Webhook signature verification failed: ${err.message}`);
  }

  await paymentService.handleStripeWebhookEvent(event);
  res.json({ received: true });
});