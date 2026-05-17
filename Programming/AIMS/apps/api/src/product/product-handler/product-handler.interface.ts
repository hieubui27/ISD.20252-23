import { CreateProductDto, ProductType } from '../dto/create-product.dto';

export interface IProductHandler {
  supports(type: ProductType): boolean;
  create(tx: any, productId: bigint, data: CreateProductDto): Promise<void>;
}
