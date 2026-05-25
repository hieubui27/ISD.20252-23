import { CreateProductDto, ProductType } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the system using simple parameters (DTOs and transaction objects). Functional Cohesion because all its logic pertains exclusively to handling the creation of Book-specific products.
 */
export class BookHandler implements IProductHandler {
  supports(type: ProductType): boolean {
    return type === ProductType.BOOK;
  }
  async create(
    tx: any,
    productId: bigint,
    data: CreateProductDto,
  ): Promise<void> {
    await tx.printableProduct.create({
      data: {
        id: productId,
        publisher: data.publisher || 'N/A',
        language: data.language || 'N/A',
        publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
        book: {
          create: {
            coverType: data.coverType || 'N/A',
            nbPages: data.nbPages || 0,
            genre: data.genre || 'N/A',
          },
        },
      },
    });
  }
}
