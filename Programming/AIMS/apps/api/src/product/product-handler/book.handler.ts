import { ProductType } from '../dto/create-product.dto';
import { CreateBookDto } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the system using simple parameters (DTOs and transaction objects). Functional Cohesion because all its logic pertains exclusively to handling the creation of Book-specific products.
 */
export class BookHandler implements IProductHandler<CreateBookDto, any> {
  supports(type: ProductType): boolean {
    return type === ProductType.BOOK;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validate(data: CreateBookDto): void {}

  async create(tx: any, productId: bigint, data: CreateBookDto): Promise<void> {
    const authorLinks = [];
    if (data.authors && data.authors.length > 0) {
      for (const authorName of data.authors) {
        let author = await tx.author.findFirst({ where: { name: authorName } });
        if (!author) {
          author = await tx.author.create({ data: { name: authorName } });
        }
        authorLinks.push({ authorId: author.id });
      }
    }

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
            bookAuthors: {
              create: authorLinks,
            },
          },
        },
      },
    });
  }

  async update(tx: any, productId: bigint, data: any): Promise<void> {
    // Update logic for Book if needed
  }
}
