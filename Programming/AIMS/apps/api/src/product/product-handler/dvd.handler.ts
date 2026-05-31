import { CreateProductDto, ProductType } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the system using simple parameters (DTOs and transaction objects). Functional Cohesion because all its logic pertains exclusively to handling the creation of DVD-specific products.
 */
export class DvdHandler implements IProductHandler {
  supports(type: ProductType): boolean {
    return type === ProductType.DVD;
  }
  async create(
    tx: any,
    productId: bigint,
    data: CreateProductDto,
  ): Promise<void> {
    await tx.discProduct.create({
      data: {
        id: productId,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : new Date(),
        genre: data.genre || 'N/A',
        language: data.language || 'N/A',
        totalLength: data.totalLength || 0,
        dvd: {
          create: {
            discType: data.discType || 'N/A',
            director: data.director || 'N/A',
            studio: data.studio || 'N/A',
            subtitles: data.subtitles || 'N/A',
          },
        },
      },
    });
  }
}
