import { Injectable } from '@nestjs/common';
import axios from 'axios';
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
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  async createOrder(amount: number) {
    try {
      const accessToken = await this.getAccessToken();
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
            return_url: 'http://localhost:3000/api/paypal/success', // Link khi khách đồng ý trả tiền
            cancel_url: 'http://localhost:3000/api/paypal/cancel', // Link khi khách hủy ngang
            user_action: 'PAY_NOW', // Đổi nút thành "Pay Now" thay vì "Continue" (tùy chọn)
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
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  async capturePayment(orderId: string) {
    try {
      const accessToken = await this.getAccessToken();
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
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}
