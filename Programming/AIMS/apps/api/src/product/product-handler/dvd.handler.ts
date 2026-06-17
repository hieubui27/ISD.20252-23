import { ProductType } from '../dto/create-product.dto';
import { CreateDvdDto } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the system using simple parameters (DTOs and transaction objects). Functional Cohesion because all its logic pertains exclusively to handling the creation of DVD-specific products.
 */
export class DvdHandler implements IProductHandler<CreateDvdDto, any> {
  supports(type: ProductType): boolean {
    return type === ProductType.DVD;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validate(data: CreateDvdDto): void {}

  async create(tx: any, productId: bigint, data: CreateDvdDto): Promise<void> {
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

  async update(tx: any, productId: bigint, data: any): Promise<void> {
    const discData: any = {};
    if (data.releaseDate !== undefined)
      discData.releaseDate = new Date(data.releaseDate);
    if (data.genre !== undefined) discData.genre = data.genre;
    if (data.language !== undefined) discData.language = data.language;
    if (data.totalLength !== undefined) discData.totalLength = data.totalLength;

    if (Object.keys(discData).length > 0) {
      await tx.discProduct.update({
        where: { id: productId },
        data: discData,
      });
    }

    const dvdData: any = {};
    if (data.discType !== undefined) dvdData.discType = data.discType;
    if (data.director !== undefined) dvdData.director = data.director;
    if (data.studio !== undefined) dvdData.studio = data.studio;
    if (data.subtitles !== undefined) dvdData.subtitles = data.subtitles;

    if (Object.keys(dvdData).length > 0) {
      await tx.dVD.update({
        where: { id: productId },
        data: dvdData,
      });
    }
  }
}
