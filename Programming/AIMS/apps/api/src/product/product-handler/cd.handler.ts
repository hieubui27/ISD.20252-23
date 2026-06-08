import { ProductType } from '../dto/create-product.dto';
import { CreateCdDto } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the system using simple parameters (DTOs and transaction objects). Functional Cohesion because all its logic pertains exclusively to handling the creation of CD-specific products.
 */
export class CdHandler implements IProductHandler<CreateCdDto, any> {
  supports(type: ProductType): boolean {
    return type === ProductType.CD;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validate(data: CreateCdDto): void {}

  async create(tx: any, productId: bigint, data: CreateCdDto): Promise<void> {
    await tx.discProduct.create({
      data: {
        id: productId,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : new Date(),
        genre: data.genre || 'N/A',
        language: data.language || 'N/A',
        totalLength: data.totalLength || 0,
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

  async update(tx: any, productId: bigint, data: any): Promise<void> {
    // Update logic for CD if needed
  }
}
