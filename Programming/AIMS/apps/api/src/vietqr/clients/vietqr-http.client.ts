import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  VietqrAccessTokenResponse,
  VietqrClient,
  VietqrGenerateQRCodeRequest,
  VietqrGenerateQRCodeResponse,
  VietqrTestCallbackRequest,
} from './vietqr.client';

/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This client communicates with VietQR through primitive credentials, access tokens, and request interfaces.
 * - It does not depend on AIMS payment business rules, Prisma, controllers, or shared mutable state.
 *
 * Cohesion reason:
 * - All methods are focused on outbound VietQR HTTP API calls.
 */
@Injectable()
export class VietqrHttpClient implements VietqrClient {
  // TODO(VIETQR_API_INTEGRATION): Replace default sandbox base URL with the merchant environment configured by VietQR.
  private readonly baseUrl =
    process.env.VIETQR_BASE_URL || 'https://dev.vietqr.org';

  async getAccessToken(
    username: string,
    password: string,
  ): Promise<VietqrAccessTokenResponse> {
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
    const response = await axios.post(
      `${this.baseUrl}/vqr/api/token_generate`,
      {},
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async generateQRCode(
    accessToken: string,
    request: VietqrGenerateQRCodeRequest,
  ): Promise<VietqrGenerateQRCodeResponse> {
    const response = await axios.post(
      `${this.baseUrl}/vqr/api/qr/generate-customer`,
      request,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async testCallback(
    accessToken: string,
    request: VietqrTestCallbackRequest,
  ): Promise<{ status?: string; message?: string }> {
    const response = await axios.post(
      `${this.baseUrl}/vqr/bank/api/test/transaction-callback`,
      request,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }
}
