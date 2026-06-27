import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  VietqrAccessTokenResponse,
  VietqrClient,
  VietqrGenerateQRCodeRequest,
  VietqrGenerateQRCodeResponse,
  VietqrTestCallbackRequest,
} from './vietqr.client';
import { VietqrConfigService } from '../config/vietqr-config.service';

/**
 * Client: VietqrHttpClient
 *
 * SOLID Review:
 * SRP: Satisfied. It contains only outbound HTTP calls to VietQR.
 * OCP: Satisfied. Request mapping can be extended without changing payment services.
 * LSP: Satisfied. It implements the VietqrClient contract.
 * ISP: Satisfied. The client exposes only VietQR operations used by the app.
 * DIP: Satisfied. Other services depend on the VietqrClient token.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The client sends VietQR request DTOs and keeps provider HTTP details
 *   outside payment business logic.
 */
@Injectable()
export class VietqrHttpClient implements VietqrClient {
  constructor(private readonly configService: VietqrConfigService) {}

  async getAccessToken(
    username: string,
    password: string,
  ): Promise<VietqrAccessTokenResponse> {
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
    const response = await axios.post(
      `${this.configService.getBaseUrl()}/vqr/api/token_generate`,
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
      `${this.configService.getBaseUrl()}/vqr/api/qr/generate-customer`,
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
      `${this.configService.getBaseUrl()}/vqr/bank/api/test/transaction-callback`,
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
