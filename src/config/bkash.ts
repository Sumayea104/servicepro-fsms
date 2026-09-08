import axios, { AxiosInstance } from 'axios';

// bKash Configuration
const BKASH_CONFIG = {
  baseUrl: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
  username: process.env.BKASH_USERNAME || 'sandboxTokenizedUser',
  password: process.env.BKASH_PASSWORD || 'sandboxTokenizedUserPassword',
  appKey: process.env.BKASH_APP_KEY || '',
  appSecret: process.env.BKASH_APP_SECRET || '',
  callbackUrl: process.env.BKASH_CALLBACK_URL || 'http://localhost:3000/api/v1/payments/bkash/callback',
};

// bKash Token Management
class BkashTokenManager {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  async getToken(): Promise<string> {
    // Check if token exists and is valid
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    try {
      const response = await axios.post(
        `${BKASH_CONFIG.baseUrl}/tokenized/checkout/token/grant`,
        {
          app_key: BKASH_CONFIG.appKey,
          app_secret: BKASH_CONFIG.appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            username: BKASH_CONFIG.username,
            password: BKASH_CONFIG.password,
          },
        }
      );

      if (response.data && response.data.id_token) {
        this.token = response.data.id_token;
        // Token valid for 3600 seconds (1 hour)
        this.tokenExpiry = new Date(Date.now() + 3500 * 1000);
        return this.token;
      }
      
      throw new Error('Failed to get bKash token');
    } catch (error) {
      console.error('bKash token generation error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post(
        `${BKASH_CONFIG.baseUrl}/tokenized/checkout/token/refresh`,
        {
          app_key: BKASH_CONFIG.appKey,
          app_secret: BKASH_CONFIG.appSecret,
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            username: BKASH_CONFIG.username,
            password: BKASH_CONFIG.password,
          },
        }
      );

      if (response.data && response.data.id_token) {
        this.token = response.data.id_token;
        this.tokenExpiry = new Date(Date.now() + 3500 * 1000);
        return this.token;
      }

      throw new Error('Failed to refresh bKash token');
    } catch (error) {
      console.error('bKash token refresh error:', error);
      throw error;
    }
  }
}

// bKash Payment Service
export class BkashPaymentService {
  private tokenManager: BkashTokenManager;

  constructor() {
    this.tokenManager = new BkashTokenManager();
  }

  // Create Payment (Agreement)
  async createPayment(amount: number, invoiceId: string, payerReference?: string) {
    try {
      const token = await this.tokenManager.getToken();
      
      const response = await axios.post(
        `${BKASH_CONFIG.baseUrl}/tokenized/checkout/create`,
        {
          mode: '0011', // Checkout mode
          payerReference: payerReference || `customer_${Date.now()}`,
          callbackURL: BKASH_CONFIG.callbackUrl,
          amount: amount.toString(),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: invoiceId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
            'X-APP-Key': BKASH_CONFIG.appKey,
          },
        }
      );

      if (response.data && response.data.bkashURL) {
        return {
          paymentID: response.data.paymentID,
          bkashURL: response.data.bkashURL,
          status: response.data.statusCode,
        };
      }

      throw new Error('Failed to create bKash payment');
    } catch (error) {
      console.error('bKash create payment error:', error);
      throw error;
    }
  }

  // Execute Payment
  async executePayment(paymentID: string) {
    try {
      const token = await this.tokenManager.getToken();
      
      const response = await axios.post(
        `${BKASH_CONFIG.baseUrl}/tokenized/checkout/execute`,
        {
          paymentID,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
            'X-APP-Key': BKASH_CONFIG.appKey,
          },
        }
      );

      if (response.data && response.data.statusCode === '0000') {
        return {
          paymentID: response.data.paymentID,
          trxID: response.data.trxID,
          transactionStatus: response.data.transactionStatus,
          amount: response.data.amount,
          status: 'COMPLETED',
        };
      }

      return {
        paymentID,
        status: 'FAILED',
        errorMessage: response.data?.statusMessage || 'Payment failed',
      };
    } catch (error) {
      console.error('bKash execute payment error:', error);
      throw error;
    }
  }

  // Query Payment Status
  async queryPayment(paymentID: string) {
    try {
      const token = await this.tokenManager.getToken();
      
      const response = await axios.post(
        `${BKASH_CONFIG.baseUrl}/tokenized/checkout/payment/status`,
        {
          paymentID,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
            'X-APP-Key': BKASH_CONFIG.appKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('bKash query payment error:', error);
      throw error;
    }
  }

  // Refund Payment
  async refundPayment(paymentID: string, trxID: string, amount: number) {
    try {
      const token = await this.tokenManager.getToken();
      
      const response = await axios.post(
        `${BKASH_CONFIG.baseUrl}/tokenized/checkout/payment/refund`,
        {
          paymentID,
          trxID,
          amount: amount.toString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
            'X-APP-Key': BKASH_CONFIG.appKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('bKash refund error:', error);
      throw error;
    }
  }
}

export const bkashPaymentService = new BkashPaymentService();
export const bkashConfig = BKASH_CONFIG;