import { CreateProductDto, ProductType } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

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
        releaseDate: new Date(),
        genre: 'N/A',
        language: 'N/A',
        totalLength: 0,
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
