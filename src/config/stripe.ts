import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Stripe Payment Service
export class StripePaymentService {
  // Create Payment Intent
  async createPaymentIntent(amount: number, metadata: any = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: process.env.STRIPE_CURRENCY || 'usd',
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe createPaymentIntent error:', error);
      throw error;
    }
  }

  // Create Checkout Session
  async createCheckoutSession(
    amount: number,
    serviceRequestId: string,
    customerEmail: string,
    customerName: string,
    successUrl: string,
    cancelUrl: string
  ) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: process.env.STRIPE_CURRENCY || 'usd',
              product_data: {
                name: `Service Request #${serviceRequestId}`,
                description: 'Field Service Payment',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        client_reference_id: serviceRequestId,
        metadata: {
          serviceRequestId,
          customerName,
        },
      });
      
      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('Stripe createCheckoutSession error:', error);
      throw error;
    }
  }

  // Verify Webhook
  async verifyWebhook(payload: string | Buffer, signature: string) {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      throw error;
    }
  }

  // Refund Payment
  async refundPayment(paymentIntentId: string, amount?: number) {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };
      
      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      return await stripe.refunds.create(refundParams);
    } catch (error) {
      console.error('Stripe refund error:', error);
      throw error;
    }
  }
}