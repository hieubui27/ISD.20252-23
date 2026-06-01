import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This service exchanges primitive credentials, amounts, order IDs, and capture IDs with the PayPal HTTP API.
 * - It does not depend on PaymentService internals, Prisma records, VietQR code, or shared mutable state.
 *
 * Cohesion reason:
 * - All methods are focused on PayPal provider operations: token retrieval, order creation, capture, and refund.
 */
@Injectable()
export class PaypalService {
  private clientId = process.env.PAYPAL_CLIENT_ID;
  private secret = process.env.PAYPAL_SECRET;
  private baseUrl = process.env.PAYPAL_BASE_URL;
  private returnUrl =
    process.env.PAYPAL_RETURN_URL || 'http://localhost:4200/payment';
  private cancelUrl =
    process.env.PAYPAL_CANCEL_URL || 'http://localhost:4200/payment';

  async getAccessToken() {
    this.ensureConfigured();

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: this.clientId!, password: this.secret! },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return response.data.access_token;
    } catch (err: any) {
      console.error(
        '[PayPal] Access Token Error:',
        err.response?.data || err.message,
      );
      throw new UnauthorizedException(
        `Failed to retrieve PayPal access token: ${this.formatPaypalError(err)}`,
      );
    }
  }

  async createOrder(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('PayPal amount must be greater than 0');
    }

    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: amount.toFixed(2),
              },
            },
          ],
          application_context: {
            return_url: this.returnUrl,
            cancel_url: this.cancelUrl,
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        },
      );

      console.log(
        '[PayPal] createOrder response:',
        JSON.stringify(
          {
            id: response.data.id,
            status: response.data.status,
            links: response.data.links,
          },
          null,
          2,
        ),
      );
      return response.data;
    } catch (err: any) {
      console.error(
        '[PayPal] Create Order Error:',
        err.response?.data || err.message,
      );
      throw new BadRequestException(
        `Failed to create PayPal order: ${this.formatPaypalError(err)}`,
      );
    }
  }

  async capturePayment(orderId: string) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            'PayPal-Request-Id': orderId,
          },
        },
      );
      return response.data;
    } catch (err: any) {
      console.error(
        '[PayPal] Capture Payment Error:',
        err.response?.data || err.message,
      );
      throw new BadRequestException(
        `Failed to capture PayPal payment: ${this.formatPaypalError(err)}`,
      );
    }
  }

  async refundPayment(captureId: string) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v2/payments/captures/${captureId}/refund`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (err: any) {
      console.error(
        '[PayPal] Refund Payment Error:',
        err.response?.data || err.message,
      );
      throw new BadRequestException(
        `Failed to refund PayPal payment: ${this.formatPaypalError(err)}`,
      );
    }
  }

  private get apiBaseUrl(): string {
    return this.baseUrl?.replace(/\/+$/, '') || '';
  }

  private ensureConfigured(): void {
    if (!this.clientId || !this.secret || !this.baseUrl) {
      throw new UnauthorizedException(
        'PayPal environment variables are not configured',
      );
    }
  }

  private formatPaypalError(err: any): string {
    const data = err.response?.data;
    const detail = data?.details?.[0];

    return (
      detail?.description ||
      detail?.issue ||
      data?.message ||
      data?.name ||
      err.message ||
      'Unknown PayPal error'
    );
  }
}
