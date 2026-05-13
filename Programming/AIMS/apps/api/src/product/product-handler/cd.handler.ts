import { CreateProductDto, ProductType } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

export class CdHandler implements IProductHandler {
  supports(type: ProductType): boolean {
    return type === ProductType.CD;
  }
  async create(
    tx: any,
    productId: bigint,
    data: CreateProductDto,
  ): Promise<void> {
    await tx.discProduct.create({
      data: {
        id: productId,
        releaseDate: new Date(),
        genre: 'N/A',
        language: 'N/A',
        totalLength: 0,
        cd: {
          create: {
            artist: data.artist || 'N/A',
            recordLabel: data.recordLabel || 'N/A',
            track: data.track || 'N/A',
          },
        },
      },
    });
  }
}
