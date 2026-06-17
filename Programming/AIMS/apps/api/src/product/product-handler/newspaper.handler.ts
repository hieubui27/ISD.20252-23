import { ProductType } from '../dto/create-product.dto';
import { CreateNewspaperDto } from '../dto/create-product.dto';
import { IProductHandler } from './product-handler.interface';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the system using simple parameters (DTOs and transaction objects). Functional Cohesion because all its logic pertains exclusively to handling the creation of Newspaper-specific products.
 */
export class NewspaperHandler implements IProductHandler<
  CreateNewspaperDto,
  any
> {
  supports(type: ProductType): boolean {
    return type === ProductType.NEWSPAPER;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validate(data: CreateNewspaperDto): void {}

  async create(
    tx: any,
    productId: bigint,
    data: CreateNewspaperDto,
  ): Promise<void> {
    await tx.printableProduct.create({
      data: {
        id: productId,
        publisher: data.publisher || 'N/A',
        language: data.language || 'N/A',
        publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
        newspaper: {
          create: {
            editorInChief: data.editorInChief || 'N/A',
            issueNumber: data.issueNumber || 'N/A',
            publicationFreq: data.publicationFreq || 'N/A',
            issn: data.issn || 'N/A',
            sections: data.sections || 'N/A',
          },
        },
      },
    });
  }

  async update(tx: any, productId: bigint, data: any): Promise<void> {
    const printableData: any = {};
    if (data.publisher !== undefined) printableData.publisher = data.publisher;
    if (data.language !== undefined) printableData.language = data.language;
    if (data.publishDate !== undefined)
      printableData.publishDate = new Date(data.publishDate);

    if (Object.keys(printableData).length > 0) {
      await tx.printableProduct.update({
        where: { id: productId },
        data: printableData,
      });
    }

    const newspaperData: any = {};
    if (data.editorInChief !== undefined)
      newspaperData.editorInChief = data.editorInChief;
    if (data.issueNumber !== undefined)
      newspaperData.issueNumber = data.issueNumber;
    if (data.publicationFreq !== undefined)
      newspaperData.publicationFreq = data.publicationFreq;
    if (data.issn !== undefined) newspaperData.issn = data.issn;
    if (data.sections !== undefined) newspaperData.sections = data.sections;

    if (Object.keys(newspaperData).length > 0) {
      await tx.newspaper.update({
        where: { id: productId },
        data: newspaperData,
      });
    }
  }
}
