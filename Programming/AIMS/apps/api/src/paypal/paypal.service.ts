import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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

  async getAccessToken() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: this.clientId!, password: this.secret! },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return response.data.access_token;
    } catch (err) {
      throw new UnauthorizedException('Failed to retrieve PayPal access token');
    }
  }

  async createOrder(amount: number) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
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
            return_url: 'http://localhost:3000/api/paypal/success',
            cancel_url: 'http://localhost:3000/api/paypal/cancel',
            user_action: 'PAY_NOW',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (err) {
      throw new InternalServerErrorException('Failed to create PayPal order');
    }
  }

  async capturePayment(orderId: string) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (err) {
      throw new BadRequestException('Failed to capture PayPal payment');
    }
  }

  async refundPayment(captureId: string) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (err) {
      throw new BadRequestException('Failed to refund PayPal payment');
    }
  }
}
