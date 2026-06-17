import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PaymentMethod } from '../constants/payment.constants';
import {
  PaymentGateway,
  PaymentGatewayBase,
  PaymentConfirmationGateway,
  PaymentCreationGateway,
  PaymentRefundGateway,
  PAYMENT_GATEWAYS,
} from '../ports/payment-gateway.port';

@Injectable()
export class PaymentGatewayFactory {
  private readonly gatewayMap: Map<PaymentMethod, PaymentGatewayBase>;
  private readonly creationGatewayMap: Map<
    PaymentMethod,
    PaymentCreationGateway
  >;
  private readonly confirmationGatewayMap: Map<
    PaymentMethod,
    PaymentConfirmationGateway
  >;
  private readonly refundGatewayMap: Map<PaymentMethod, PaymentRefundGateway>;

  constructor(
    @Inject(PAYMENT_GATEWAYS)
    private readonly gateways: PaymentGateway[],
  ) {
    this.gatewayMap = new Map();
    this.creationGatewayMap = new Map();
    this.confirmationGatewayMap = new Map();
    this.refundGatewayMap = new Map();

    for (const gateway of gateways) {
      const method = gateway.getMethod();
      this.gatewayMap.set(method, gateway);

      if (this.isCreationGateway(gateway)) {
        this.creationGatewayMap.set(method, gateway);
      }

      if (this.isConfirmationGateway(gateway)) {
        this.confirmationGatewayMap.set(method, gateway);
      }

      if (this.isRefundGateway(gateway)) {
        this.refundGatewayMap.set(method, gateway);
      }
    }
  }

  getGateway(method: PaymentMethod): PaymentGatewayBase {
    const gateway = this.gatewayMap.get(method);
    if (!gateway) {
      throw new BadRequestException(`Unsupported payment method: ${method}`);
    }
    return gateway;
  }

  getCreationGateway(method: PaymentMethod): PaymentCreationGateway {
    const gateway = this.creationGatewayMap.get(method);
    if (!gateway) {
      throw new BadRequestException(
        `Payment method ${method} does not support payment creation`,
      );
    }
    return gateway;
  }

  getConfirmationGateway(method: PaymentMethod): PaymentConfirmationGateway {
    const gateway = this.confirmationGatewayMap.get(method);
    if (!gateway) {
      throw new BadRequestException(
        `Payment method ${method} does not support manual confirmation`,
      );
    }
    return gateway;
  }

  getRefundGateway(method: PaymentMethod): PaymentRefundGateway {
    const gateway = this.refundGatewayMap.get(method);
    if (!gateway) {
      throw new BadRequestException(
        `Payment method ${method} does not support automatic refund`,
      );
    }
    return gateway;
  }

  private isCreationGateway(
    gateway: PaymentGatewayBase,
  ): gateway is PaymentCreationGateway {
    return 'createPayment' in gateway;
  }

  private isConfirmationGateway(
    gateway: PaymentGatewayBase,
  ): gateway is PaymentConfirmationGateway {
    return 'confirmPayment' in gateway;
  }

  private isRefundGateway(
    gateway: PaymentGatewayBase,
  ): gateway is PaymentRefundGateway {
    return 'refundPayment' in gateway;
  }
}
