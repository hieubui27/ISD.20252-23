import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CartItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  weight?: number;
}
