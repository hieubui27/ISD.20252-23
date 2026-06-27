/**
 * Port: VietqrClient
 *
 * SOLID Review:
 * SRP: Satisfied. This file defines the outbound VietQR client contract.
 * OCP: Satisfied. Another HTTP client can implement the same interface.
 * LSP: Satisfied. Implementations can replace each other through the port.
 * ISP: Satisfied. The methods match the VietQR calls used by the app.
 * DIP: Satisfied. VietQR services depend on this port, not a concrete HTTP library.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: The port passes request and response DTOs and keeps outbound VietQR
 *   communication in one boundary.
 */
export interface VietqrAccessTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  status?: string;
  message?: string;
}

export interface VietqrGenerateQRCodeRequest {
  bankCode: string;
  bankAccount: string;
  userBankName: string;
  content: string;
  qrType: string;
  amount: number;
  orderId: string;
  transType: string;
  terminalCode?: string;
  subTerminalCode?: string;
  serviceCode?: string;
  urlLink?: string;
  note?: string;
  additionalData?: Record<string, unknown>[];
  sign?: string;
}

export interface VietqrGenerateQRCodeResponse {
  qrCode?: string;
  qrDataUrl?: string;
  qrLink?: string;
  content?: string;
  amount?: number;
  orderId?: string;
  expiredAt?: string;
  status?: string;
  message?: string;
  data?: {
    qrCode?: string;
    qrDataUrl?: string;
    qrLink?: string;
    content?: string;
    amount?: number;
    orderId?: string;
    expiredAt?: string;
  };
}

export interface VietqrTestCallbackRequest {
  bankAccount: string;
  content: string;
  amount: number;
  transType: string;
  bankCode: string;
}

export interface VietqrClient {
  getAccessToken(
    username: string,
    password: string,
  ): Promise<VietqrAccessTokenResponse>;
  generateQRCode(
    accessToken: string,
    request: VietqrGenerateQRCodeRequest,
  ): Promise<VietqrGenerateQRCodeResponse>;
  testCallback(
    accessToken: string,
    request: VietqrTestCallbackRequest,
  ): Promise<{ status?: string; message?: string }>;
}

export const VIETQR_CLIENT = 'VIETQR_CLIENT';
