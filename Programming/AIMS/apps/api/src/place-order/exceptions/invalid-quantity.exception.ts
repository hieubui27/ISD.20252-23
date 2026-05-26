import { BadRequestException } from '@nestjs/common';
import { InsufficientItemDto } from '../dto/stock-check-result.dto';

export class InvalidQuantityException extends BadRequestException {
  constructor(public readonly insufficientItems: InsufficientItemDto[]) {
    super({
      message: 'Invalid product quantity.',
      insufficientItems,
    });
  }
}
