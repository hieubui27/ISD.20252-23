import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

export interface VietqrClient {
  getAccessToken(clientId: string, apiKey: string): Promise<{ accessToken?: string }>;
  generateQRCode(
    accessToken: string,
    request: VietqrQRCodeRequest,
  ): Promise<VietqrQRCodeResponse>;
}

export interface VietqrServiceOptions {
  clientId: string;
  apiKey: string;
}

export interface VietqrQRCodeRequest {
  orderId: string;
  amount: number;
  content: string;
}

export interface VietqrQRCodeResponse {
  qrCode: string;
  qrContent: string;
  amount: number;
  orderId: string;
}

export interface VietqrCallbackDto {
  orderId: string;
  transactionId: string;
  amount: number;
  status: string;
  signature: string;
}

export interface OrderRepository {
  findByOrderId(orderId: string): Promise<{ orderId: string; totalAmount: number } | null>;
  markPaidAndPendingProcessing(orderId: string): Promise<void>;
}

export interface PaymentTransactionRepository {
  existsByTransactionId(transactionId: string): Promise<boolean>;
  save(transaction: {
    orderId: string;
    transactionId: string;
    amount: number;
    method: string;
    status: string;
  }): Promise<void>;
}

export interface SignatureValidator {
  isValid(callback: VietqrCallbackDto): boolean;
}

@Injectable()
export class VietqrService {
  private accessToken?: string;

  constructor(
    private readonly vietqrClient: VietqrClient,
    private readonly orderRepository: OrderRepository,
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly signatureValidator: SignatureValidator,
    private readonly options: VietqrServiceOptions,
  ) {}

  async getAccessToken(): Promise<string> {
    try {
      const response = await this.vietqrClient.getAccessToken(
        this.options.clientId,
        this.options.apiKey,
      );

      if (!response.accessToken) {
        this.accessToken = undefined;
        throw new UnauthorizedException('VietQR authentication failed');
      }

      this.accessToken = response.accessToken;
      return response.accessToken;
    } catch (error) {
      this.accessToken = undefined;
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('VietQR authentication failed');
    }
  }

  async generateQRCode(
    request: VietqrQRCodeRequest,
  ): Promise<VietqrQRCodeResponse> {
    if (request.amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const token = this.accessToken ?? (await this.getAccessToken());

    try {
      const qrCodeData = await this.vietqrClient.generateQRCode(token, request);
      return {
        qrCode: qrCodeData.qrCode,
        qrContent: qrCodeData.qrContent,
        amount: qrCodeData.amount,
        orderId: qrCodeData.orderId,
      };
    } catch (error) {
      throw new BadGatewayException('VietQR QR generation failed');
    }
  }

  async handleCallback(callback: VietqrCallbackDto) {
    if (!this.signatureValidator.isValid(callback)) {
      throw new UnauthorizedException('Invalid VietQR callback signature');
    }

    const exists =
      await this.paymentTransactionRepository.existsByTransactionId(
        callback.transactionId,
      );
    if (exists) {
      return {
        status: 'DUPLICATE',
        transactionId: callback.transactionId,
      };
    }

    const order = await this.orderRepository.findByOrderId(callback.orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (callback.amount !== order.totalAmount) {
      throw new BadRequestException('Paid amount does not match order total');
    }

    await this.paymentTransactionRepository.save({
      orderId: callback.orderId,
      transactionId: callback.transactionId,
      amount: callback.amount,
      method: 'VIETQR',
      status: callback.status,
    });
    await this.orderRepository.markPaidAndPendingProcessing(callback.orderId);

    return {
      status: 'ACCEPTED',
      transactionId: callback.transactionId,
    };
  }

  getCachedAccessToken() {
    return this.accessToken;
  }
}
