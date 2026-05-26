export class InsufficientItemDto {
  productId: number;
  requested: number;
  available: number;
}

export class StockCheckResultDto {
  sufficient: boolean;
  insufficientItems: InsufficientItemDto[];
}
