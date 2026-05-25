/**
 * Coupling: Data Coupling
 * Cohesion: Functional Cohesion
 *
 * Coupling reason:
 * - This port defines primitive and structured request/response contracts for VietQR HTTP communication.
 * - It hides the concrete HTTP client from VietqrService and does not expose AIMS persistence models.
 *
 * Cohesion reason:
 * - All interfaces describe the outbound VietQR client boundary.
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
