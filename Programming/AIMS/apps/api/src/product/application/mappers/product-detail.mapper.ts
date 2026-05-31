import {
  CDSpecificInfoDto,
  DVDSpecificInfoDto,
  ProductDetailDto,
  ProductSpecificInfoDto,
  NewspaperSpecificInfoDto,
  BookSpecificInfoDto,
} from '../dto/product-detail.dto';
import { ProductListItemDto } from '../dto/product-list-item.dto';
import {
  ProductType,
  ProductTypeValue,
} from '../../domain/enums/product-type.enum';
import { ProductDimensions } from '../../domain/entities/product.entity';
import { ProductDetailPersistenceModel } from '../../domain/repositories/product-query.repository.interface';

/**
 * Module: ProductDetailMapper
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This mapper only transforms persistence records into response DTOs.
 * OCP: Partially satisfied. Type-specific mapping is isolated in small mapper methods.
 * LSP: Satisfied. All mapped product types preserve the common ProductDetailDto contract.
 * ISP: Satisfied. DTO consumers receive focused read models, not Prisma records.
 * DIP: Satisfied. Upper layers use DTOs and do not depend on Prisma model shapes.
 *
 * Improvement Direction:
 * When adding a new product type, add a dedicated specificInfo mapper and avoid leaking raw Prisma records.
 */
export class ProductDetailMapper {
  static toListItemDto(
    product: ProductDetailPersistenceModel,
  ): ProductListItemDto {
    return {
      id: this.toStringValue(product.id),
      title: this.toStringValue(product.title),
      type: this.normalizeType(product.category),
      currentPrice: this.toNumber(product.currentPrice),
      imageUrl: this.optionalString(product.imageUrl),
      status: this.normalizeStatus(product.status, product.quantity),
    };
  }

  static toDetailDto(product: ProductDetailPersistenceModel): ProductDetailDto {
    const type = this.normalizeType(product.category);
    const stockQuantity = this.toNumber(product.quantity);

    return {
      id: this.toStringValue(product.id),
      barcode: this.toStringValue(product.barcode),
      title: this.toStringValue(product.title),
      type,
      currentPrice: this.toNumber(product.currentPrice),
      originalValue: this.toNumber(product.originalValue),
      description: this.toStringValue(product.description),
      weight: this.toNumber(product.weight),
      dimensions: this.parseDimensions(product.dimensions),
      imageUrl: this.optionalString(product.imageUrl),
      stockQuantity,
      status: this.normalizeStatus(product.status, stockQuantity),
      specificInfo: this.mapSpecificInfo(type, product),
    };
  }

  private static mapSpecificInfo(
    type: ProductTypeValue,
    product: ProductDetailPersistenceModel,
  ): ProductSpecificInfoDto {
    const mappers: Record<
      ProductTypeValue,
      (product: ProductDetailPersistenceModel) => ProductSpecificInfoDto
    > = {
      [ProductType.BOOK]: this.mapBookSpecificInfo.bind(this),
      [ProductType.NEWSPAPER]: this.mapNewspaperSpecificInfo.bind(this),
      [ProductType.CD]: this.mapCdSpecificInfo.bind(this),
      [ProductType.DVD]: this.mapDvdSpecificInfo.bind(this),
    };

    return mappers[type]?.(product) ?? {};
  }

  private static mapBookSpecificInfo(
    product: ProductDetailPersistenceModel,
  ): BookSpecificInfoDto {
    const printable = this.toRecord(product.printableProduct);
    const book = this.toRecord(printable.book);

    return {
      authors: this.mapAuthors(book),
      coverType: this.toStringValue(book.coverType),
      publisher: this.toStringValue(printable.publisher),
      publicationDate: this.toDateString(printable.publishDate),
      numberOfPages: this.toNumber(book.nbPages),
      language: this.toStringValue(printable.language),
      genre: this.toStringValue(book.genre),
    };
  }

  private static mapNewspaperSpecificInfo(
    product: ProductDetailPersistenceModel,
  ): NewspaperSpecificInfoDto {
    const printable = this.toRecord(product.printableProduct);
    const newspaper = this.toRecord(printable.newspaper);

    return {
      editorInChief: this.toStringValue(newspaper.editorInChief),
      publisher: this.toStringValue(printable.publisher),
      publicationDate: this.toDateString(printable.publishDate),
      issueNumber: this.toStringValue(newspaper.issueNumber),
      releaseFrequency: this.toStringValue(newspaper.publicationFreq),
      issn: this.toStringValue(newspaper.issn),
      language: this.toStringValue(printable.language),
      sections: this.toStringList(newspaper.sections),
    };
  }

  private static mapCdSpecificInfo(
    product: ProductDetailPersistenceModel,
  ): CDSpecificInfoDto {
    const disc = this.toRecord(product.discProduct);
    const cd = this.toRecord(disc.cd);

    return {
      artists: this.toStringList(cd.artist),
      recordLabel: this.toStringValue(cd.recordLabel),
      trackList: this.toStringList(cd.track),
      genre: this.toStringValue(disc.genre),
      releaseDate: this.toDateString(disc.releaseDate),
    };
  }

  private static mapDvdSpecificInfo(
    product: ProductDetailPersistenceModel,
  ): DVDSpecificInfoDto {
    const disc = this.toRecord(product.discProduct);
    const dvd = this.toRecord(disc.dvd);

    return {
      discType: this.toStringValue(dvd.discType),
      director: this.toStringValue(dvd.director),
      runtime: this.toNumber(disc.totalLength),
      studio: this.toStringValue(dvd.studio),
      language: this.toStringValue(disc.language),
      subtitles: this.toStringList(dvd.subtitles),
      releaseDate: this.toDateString(disc.releaseDate),
      genre: this.toStringValue(disc.genre),
    };
  }

  private static normalizeType(category: unknown): ProductTypeValue {
    const normalized = String(category ?? '')
      .trim()
      .toUpperCase();
    const typeValues = Object.values(ProductType);

    if (typeValues.includes(normalized as ProductType)) {
      return normalized as ProductTypeValue;
    }

    return ProductType.BOOK;
  }

  private static normalizeStatus(status: unknown, quantity: unknown): string {
    const normalized = String(status ?? 'UNKNOWN')
      .trim()
      .toUpperCase();
    const stockQuantity = this.toNumber(quantity);

    if (normalized === 'ACTIVE' && stockQuantity <= 0) {
      return 'OUT_OF_STOCK';
    }

    return normalized;
  }

  private static parseDimensions(dimensions: unknown): ProductDimensions {
    if (typeof dimensions === 'object' && dimensions !== null) {
      const value = dimensions as Record<string, unknown>;

      return {
        height: this.toNumber(value.height),
        width: this.toNumber(value.width),
        length: this.toNumber(value.length),
      };
    }

    const raw = String(dimensions ?? '').trim();

    if (!raw) {
      return { height: 0, width: 0, length: 0 };
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      return {
        height: this.toNumber(parsed.height),
        width: this.toNumber(parsed.width),
        length: this.toNumber(parsed.length),
      };
    } catch {
      const namedDimensions = this.parseNamedDimensions(raw);

      if (namedDimensions) {
        return namedDimensions;
      }

      const numbers = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];

      return {
        height: numbers[0] ?? 0,
        width: numbers[1] ?? 0,
        length: numbers[2] ?? 0,
      };
    }
  }

  private static parseNamedDimensions(raw: string): ProductDimensions | null {
    const height = raw.match(/height\s*[:=]\s*(\d+(?:\.\d+)?)/i);
    const width = raw.match(/width\s*[:=]\s*(\d+(?:\.\d+)?)/i);
    const length = raw.match(/length\s*[:=]\s*(\d+(?:\.\d+)?)/i);

    if (!height && !width && !length) {
      return null;
    }

    return {
      height: this.toNumber(height?.[1]),
      width: this.toNumber(width?.[1]),
      length: this.toNumber(length?.[1]),
    };
  }

  private static mapAuthors(book: Record<string, unknown>): string[] {
    const authorLinks = Array.isArray(book.bookAuthors) ? book.bookAuthors : [];
    const authors = authorLinks
      .map((bookAuthor) => this.extractAuthorName(bookAuthor))
      .filter((name): name is string => name.length > 0);

    return authors.length > 0 ? authors : this.toStringList(book.author);
  }

  private static extractAuthorName(bookAuthor: unknown): string {
    if (typeof bookAuthor !== 'object' || bookAuthor === null) {
      return '';
    }

    const authorLink = bookAuthor as Record<string, unknown>;
    const author = authorLink.author;

    if (typeof author !== 'object' || author === null) {
      return '';
    }

    const authorRecord = author as Record<string, unknown>;
    return typeof authorRecord.name === 'string' ? authorRecord.name : '';
  }

  private static toStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.toStringValue(item))
        .filter((item) => item.length > 0);
    }

    return String(value ?? '')
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private static toDateString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return this.toStringValue(value).slice(0, 10);
  }

  private static optionalString(value: unknown): string | undefined {
    const stringValue = this.toStringValue(value);
    return stringValue.length > 0 ? stringValue : undefined;
  }

  private static toStringValue(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private static toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      const decimal = value as { toNumber: () => number };
      return decimal.toNumber();
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private static toRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  }
}
