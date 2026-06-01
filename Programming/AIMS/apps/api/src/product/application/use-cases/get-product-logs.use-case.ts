import { Inject, Injectable } from '@nestjs/common';
import {
  IProductLogService,
  IProductLogServiceToken,
} from '../../interfaces/product-log.service.interface';

@Injectable()
export class GetProductLogsUseCase {
  constructor(
    @Inject(IProductLogServiceToken)
    private readonly productLogService: IProductLogService,
  ) {}

  async execute(productId: string) {
    return this.productLogService.getLogsByProductId(productId);
  }
}
