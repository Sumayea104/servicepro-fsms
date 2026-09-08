import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { StripePaymentService } from '../config/stripe';
import { BkashPaymentService } from '../config/bkash';
import { successResponse, errorResponse } from '../utils/response';

const stripeService = new StripePaymentService();
const bkashService = new BkashPaymentService();

export class PaymentController {
  // Initiate Stripe Payment
  async initiateStripePayment(req: Request, res: Response) {
    try {
      const { serviceRequestId } = req.body;
      const userId = req.user.id;

      // Get service request
      const serviceRequest = await prisma.serviceRequest.findUnique({
        where: { id: serviceRequestId },
        include: {
          customer: {
            select: { email: true, name: true },
          },
        },
      });

      if (!serviceRequest) {
        return res.status(404).json(
          errorResponse('Service request not found')
        );
      }

      // Calculate amount (example: $100 for service)
      const amount = 100; // You can calculate based on service type

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          serviceRequestId,
          userId,
          amount,
          currency: 'USD',
          status: 'PENDING',
          description: `Payment for service: ${serviceRequest.title}`,
        },
      });

      // Create Stripe checkout session
      const successUrl = `${process.env.FRONTEND_URL}/payment/success`;
      const cancelUrl = `${process.env.FRONTEND_URL}/payment/cancel`;

      const session = await stripeService.createCheckoutSession(
        amount,
        serviceRequestId,
        serviceRequest.customer.email,
        serviceRequest.customer.name,
        successUrl,
        cancelUrl
      );

      // Update payment with Stripe session ID
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeSessionId: session.sessionId,
        },
      });

      return res.status(200).json(
        successResponse('Stripe payment initiated', {
          paymentId: payment.id,
          checkoutUrl: session.url,
          sessionId: session.sessionId,
        })
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse('Failed to initiate Stripe payment', [error.message])
      );
    }
  }

  // Initiate bKash Payment
  async initiateBkashPayment(req: Request, res: Response) {
    try {
      const { serviceRequestId, payerReference } = req.body;
      const userId = req.user.id;

      // Get service request
      const serviceRequest = await prisma.serviceRequest.findUnique({
        where: { id: serviceRequestId },
      });

      if (!serviceRequest) {
        return res.status(404).json(
          errorResponse('Service request not found')
        );
      }

      // Calculate amount in BDT (example: 5000 BDT)
      const amount = 5000;

      // Generate invoice ID
      const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          serviceRequestId,
          userId,
          amount,
          currency: 'BDT',
          status: 'PENDING',
          description: `bKash payment for service: ${serviceRequest.title}`,
        },
      });

      // Create bKash payment
      const bkashPayment = await bkashService.createPayment(
        amount,
        invoiceId,
        payerReference
      );

      // Store bKash payment ID
      await prisma.$executeRaw`
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS bkash_payment_id TEXT
      `;
      
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          // @ts-ignore
          bkashPaymentId: bkashPayment.paymentID,
        },
      });

      return res.status(200).json(
        successResponse('bKash payment initiated', {
          paymentId: payment.id,
          bkashURL: bkashPayment.bkashURL,
          bkashPaymentID: bkashPayment.paymentID,
        })
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse('Failed to initiate bKash payment', [error.message])
      );
    }
  }

  // bKash Callback
  async bkashCallback(req: Request, res: Response) {
    try {
      const { paymentID, status } = req.query;

      if (!paymentID) {
        return res.status(400).json(
          errorResponse('Payment ID is required')
        );
      }

      if (status === 'success') {
        // Execute payment
        const executionResult = await bkashService.executePayment(paymentID as string);

        if (executionResult.status === 'COMPLETED') {
          // Update payment in database
          const payment = await prisma.payment.findFirst({
            where: {
              // @ts-ignore
              bkashPaymentId: paymentID as string,
            },
          });

          if (payment) {
            await prisma.$transaction([
              prisma.payment.update({
                where: { id: payment.id },
                data: {
                  status: 'COMPLETED',
                  stripePaymentId: executionResult.trxID, // Store bKash trxID
                  paidAt: new Date(),
                },
              }),
              prisma.serviceRequest.update({
                where: { id: payment.serviceRequestId },
                data: { status: 'PAID' },
              }),
            ]);
          }

          // Redirect to success page
          return res.redirect(
            `${process.env.FRONTEND_URL}/payment/success?trxID=${executionResult.trxID}`
          );
        }
      }

      // Payment failed or cancelled
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/failed?paymentID=${paymentID}`
      );
    } catch (error) {
      console.error('bKash callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/error`
      );
    }
  }

  // Stripe Webhook
  async stripeWebhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;

    try {
      const event = await stripeService.verifyWebhook(req.body, signature);

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          
          const payment = await prisma.payment.findFirst({
            where: { stripeSessionId: session.id },
          });

          if (payment) {
            await prisma.$transaction([
              prisma.payment.update({
                where: { id: payment.id },
                data: {
                  status: 'COMPLETED',
                  stripePaymentId: session.payment_intent as string,
                  paidAt: new Date(),
                },
              }),
              prisma.serviceRequest.update({
                where: { id: payment.serviceRequestId },
                data: { status: 'PAID' },
              }),
            ]);
          }
          break;

        case 'payment_intent.payment_failed':
          const paymentIntent = event.data.object;
          
          await prisma.payment.updateMany({
            where: { stripePaymentId: paymentIntent.id },
            data: { status: 'FAILED' },
          });
          break;

        case 'charge.refunded':
          const charge = event.data.object;
          
          await prisma.payment.updateMany({
            where: { stripePaymentId: charge.payment_intent as string },
            data: { 
              status: 'REFUNDED',
              refundedAt: new Date(),
            },
          });
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json(
        errorResponse('Webhook error', [error.message])
      );
    }
  }

  // Get Payment Status
  async getPaymentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          serviceRequest: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json(
          errorResponse('Payment not found')
        );
      }

      return res.status(200).json(
        successResponse('Payment retrieved', payment)
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse('Failed to get payment', [error.message])
      );
    }
  }

  // Get User Payments
  async getUserPayments(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            serviceRequest: {
              select: { id: true, title: true },
            },
          },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.count({ where }),
      ]);

      return res.status(200).json(
        successResponse('Payments retrieved', {
          payments,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        })
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse('Failed to get payments', [error.message])
      );
    }
  }

  // Refund Payment
  async refundPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const payment = await prisma.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        return res.status(404).json(
          errorResponse('Payment not found')
        );
      }

      if (payment.status !== 'COMPLETED') {
        return res.status(400).json(
          errorResponse('Only completed payments can be refunded')
        );
      }

      // Process refund based on payment method
      if (payment.currency === 'USD' && payment.stripePaymentId) {
        // Stripe refund
        await stripeService.refundPayment(
          payment.stripePaymentId,
          Number(payment.amount)
        );
      } else if (payment.currency === 'BDT') {
        // bKash refund
        // Implement bKash refund logic
      }

      // Update payment status
      await prisma.payment.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      return res.status(200).json(
        successResponse('Payment refunded successfully')
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse('Failed to refund payment', [error.message])
      );
    }
  }
}