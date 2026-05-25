import { CreateProductDto, ProductType } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the system using simple parameters (DTOs and transaction objects). Functional Cohesion because all its logic pertains exclusively to handling the creation of CD-specific products.
 */
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
