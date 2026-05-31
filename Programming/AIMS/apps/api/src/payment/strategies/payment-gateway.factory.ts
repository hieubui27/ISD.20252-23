import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PaymentMethod } from '../constants/payment.constants';
import {
  PaymentGateway,
  PAYMENT_GATEWAYS,
} from '../ports/payment-gateway.port';

@Injectable()
export class PaymentGatewayFactory {
  private readonly gatewayMap: Map<PaymentMethod, PaymentGateway>;

  constructor(
    @Inject(PAYMENT_GATEWAYS)
    private readonly gateways: PaymentGateway[],
  ) {
    this.gatewayMap = new Map();
    for (const gateway of gateways) {
      this.gatewayMap.set(gateway.getMethod(), gateway);
    }
  }

  getGateway(method: PaymentMethod): PaymentGateway {
    const gateway = this.gatewayMap.get(method);
    if (!gateway) {
      throw new BadRequestException(`Unsupported payment method: ${method}`);
    }
    return gateway;
  }

  getSupportedMethods(): PaymentMethod[] {
    return Array.from(this.gatewayMap.keys());
  }
}
