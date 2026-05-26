import { BadRequestException } from '@nestjs/common';

export class InvalidDeliveryInfoException extends BadRequestException {
  constructor(public readonly errors: string[]) {
    super({
      message: 'Invalid delivery information.',
      errors,
    });
  }
}
