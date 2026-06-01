import { Inject, Injectable } from '@nestjs/common';
import {
  IProductLogService,
  IProductLogServiceToken,
} from '../../interfaces/product-log.service.interface';

@Injectable()
export class GetAllProductLogsUseCase {
  constructor(
    @Inject(IProductLogServiceToken)
    private readonly productLogService: IProductLogService,
  ) {}

  async execute() {
    return this.productLogService.getAllLogs();
  }
}
