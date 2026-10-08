import Stripe from 'stripe';
import axios from 'axios';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { writeAuditLog } from '../utils/auditLog.js';
import { notifyUser } from './notification.service.js';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

// ───────────────────────── bKash sandbox (Tokenized Checkout) ─────────────────────────
let bkashTokenCache: { token: string; expiresAt: number } | null = null;

async function getBkashToken(): Promise<string> {
  if (bkashTokenCache && bkashTokenCache.expiresAt > Date.now()) return bkashTokenCache.token;

  const { data } = await axios.post(
    `${env.BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    { app_key: env.BKASH_APP_KEY, app_secret: env.BKASH_APP_SECRET },
    { headers: { username: env.BKASH_USERNAME, password: env.BKASH_PASSWORD, 'Content-Type': 'application/json' } }
  );
  if (!data?.id_token) throw AppError.badRequest('Failed to authenticate with bKash');

  bkashTokenCache = { token: data.id_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.id_token;
}

async function bkashHeaders() {
  const token = await getBkashToken();
  return { authorization: token, 'x-app-key': env.BKASH_APP_KEY, 'Content-Type': 'application/json' };
}

/**
 * Creates (or resumes) a Payment row and kicks off the gateway's payment
 * session. Both Invoice creation and the initial Payment row are written
 * in one transaction so a job is never left "payable" without a payment
 * record tracking it.
 */
export async function initiatePayment(jobId: string, userId: string, method: 'STRIPE' | 'BKASH') {
  const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
  if (!job) throw AppError.notFound('Job not found');
  if (job.customerId !== userId) throw AppError.forbidden('You can only pay for your own jobs');
  if (job.status !== 'COMPLETED') throw AppError.badRequest('A job can only be paid for once it is COMPLETED');

  const amount = job.finalCost || job.estimatedCost;
  if (!amount) throw AppError.badRequest('This job has no cost set yet');

  let payment = await prisma.payment.findUnique({ where: { jobId } });
  if (payment?.status === 'PAID') throw AppError.conflict('This job has already been paid for');

  // Stripe settles in USD here; bKash is BDT-only. The schema defaults
  // currency to "BDT", which is correct for bKash but silently wrong for
  // Stripe unless set explicitly on every write.
  const currency = method === 'STRIPE' ? 'USD' : 'BDT';

  payment = payment
    ? await prisma.payment.update({ where: { id: payment.id }, data: { method, currency, status: 'PROCESSING', attemptCount: { increment: 1 }, lastAttemptAt: new Date() } })
    : await prisma.payment.create({ data: { jobId, userId, amount, method, currency, status: 'PROCESSING', attemptCount: 1, lastAttemptAt: new Date() } });

  if (method === 'STRIPE') {
    if (!stripe) throw AppError.badRequest('Stripe is not configured on this server');
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'usd',
      metadata: { jobId, paymentId: payment.id },
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { stripePaymentId: intent.id } });
    return { payment, provider: 'STRIPE', clientSecret: intent.client_secret };
  }

  // BKASH
  const headers = await bkashHeaders();
  const { data } = await axios.post(
    `${env.BKASH_BASE_URL}/tokenized/checkout/create`,
    {
      mode: '0011',
      payerReference: userId,
      callbackURL: env.BKASH_CALLBACK_URL,
      amount: Number(amount).toFixed(2),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: payment.id,
    },
    { headers }
  );
  if (!data?.paymentID) throw AppError.badRequest(`bKash payment creation failed: ${data?.statusMessage || 'unknown error'}`);

  await prisma.payment.update({ where: { id: payment.id }, data: { bkashPaymentId: data.paymentID, gatewayResponse: data } });
  return { payment, provider: 'BKASH', bkashURL: data.bkashURL, paymentID: data.paymentID };
}

/** Called from the bKash redirect callback to finalize (execute) a created payment. Idempotent via the unique bkashTrxId constraint. */
export async function executeBkashPayment(paymentID: string) {
  const payment = await prisma.payment.findUnique({ where: { bkashPaymentId: paymentID } });
  if (!payment) throw AppError.notFound('Payment not found');
  if (payment.status === 'PAID') return payment; // already processed — replayed callback is a no-op

  const headers = await bkashHeaders();
  const { data } = await axios.post(`${env.BKASH_BASE_URL}/tokenized/checkout/execute`, { paymentID }, { headers });

  return finalizePayment(payment.id, {
    success: data?.transactionStatus === 'Completed',
    gatewayTransactionId: data?.trxID,
    rawPayload: data,
    failureReason: data?.transactionStatus !== 'Completed' ? data?.statusMessage : undefined,
    bkashTrxId: data?.trxID,
  });
}

/** Stripe webhook handler. Signature-verified by the caller before this runs; a replayed event is a no-op because status is already PAID. */
export async function handleStripeWebhookEvent(event: Stripe.Event) {
  if (event.type !== 'payment_intent.succeeded' && event.type !== 'payment_intent.payment_failed') return;

  const intent = event.data.object as Stripe.PaymentIntent;
  const payment = await prisma.payment.findUnique({ where: { stripePaymentId: intent.id } });
  if (!payment) return;
  if (payment.status === 'PAID') return; // idempotent — already processed

  await finalizePayment(payment.id, {
    success: event.type === 'payment_intent.succeeded',
    gatewayTransactionId: intent.id,
    rawPayload: intent as any,
    failureReason: event.type === 'payment_intent.payment_failed' ? intent.last_payment_error?.message : undefined,
  });
}

async function finalizePayment(paymentId: string, result: { success: boolean; gatewayTransactionId?: string; rawPayload?: any; failureReason?: string; bkashTrxId?: string }) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: result.success ? 'PAID' : 'FAILED',
        paidAt: result.success ? new Date() : undefined,
        transactionId: result.gatewayTransactionId,
        bkashTrxId: result.bkashTrxId,
        gatewayResponse: result.rawPayload ?? undefined,
        failureReason: result.failureReason,
      },
    });

    await writeAuditLog(tx, { userId: payment.userId, action: result.success ? 'PAYMENT_SUCCEEDED' : 'PAYMENT_FAILED', entity: 'Payment', entityId: payment.id });
    await notifyUser(tx, payment.userId, {
      title: result.success ? 'Payment successful' : 'Payment failed',
      message: result.success ? 'Your payment was received.' : `Payment failed: ${result.failureReason || 'please try again'}`,
      type: result.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      link: `/jobs/${payment.jobId}`,
    });

    return payment;
  });
}

export async function getPaymentById(id: string, actor: { id: string; role: string }) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw AppError.notFound('Payment not found');
  if (actor.role !== 'ADMIN' && payment.userId !== actor.id) throw AppError.forbidden('You cannot view this payment');
  return payment;
}

export { stripe };
