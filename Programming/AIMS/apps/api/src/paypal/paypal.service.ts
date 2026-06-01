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

  // Thêm thư viện để tạo UUID nếu cần (ví dụ: import { v4 as uuidv4 } from 'uuid';)

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
                value: amount.toFixed(2), // Format chuẩn 2 chữ số thập phân
              },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                return_url: 'http://localhost:4200/payment',
                cancel_url: 'http://localhost:4200/payment',
                user_action: 'PAY_NOW', // Hiển thị nút "Pay Now" thay vì "Continue"
              },
            },
          },
          application_context: {
            return_url: 'http://localhost:4200/payment',
            cancel_url: 'http://localhost:4200/payment',
            user_action: 'PAY_NOW',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation', // Yêu cầu trả về chi tiết object order
          },
        },
      );

      console.log(
        '[PayPal] createOrder response links:',
        JSON.stringify(response.data.links, null, 2),
      );
      return response.data;
    } catch (err: any) {
      // Log lỗi chi tiết từ PayPal để dễ debug
      console.error(
        '[PayPal] Create Order Error:',
        err.response?.data || err.message,
      );
      throw new BadRequestException('Failed to create PayPal order');
    }
  }

  async capturePayment(orderId: string) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {}, // Capture payload thường rỗng trừ khi bạn truyền payment_source
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            // Nên sinh ra một uuid hoặc dùng chính orderId để tránh bị capture đúp nếu retry
            // 'PayPal-Request-Id': orderId
          },
        },
      );
      return response.data;
    } catch (err: any) {
      console.error(
        '[PayPal] Capture Payment Error:',
        err.response?.data || err.message,
      );
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
