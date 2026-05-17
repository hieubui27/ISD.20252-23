import { Injectable, Logger } from '@nestjs/common';
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
    } catch (err: any) {
      console.error(
        '❌ PayPal token error:',
        err.response?.status,
        err.response?.data,
      );
      throw err;
    }
  }

  async createOrder() {
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
                value: '100.00',
              },
            },
          ],
        },
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
        '❌ PayPal order error:',
        err.response?.status,
        err.response?.data,
      );
      throw err;
    }
  }
}
