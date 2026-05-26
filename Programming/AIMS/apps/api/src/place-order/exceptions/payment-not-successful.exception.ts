import { BadRequestException } from '@nestjs/common';

export class PaymentNotSuccessfulException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
