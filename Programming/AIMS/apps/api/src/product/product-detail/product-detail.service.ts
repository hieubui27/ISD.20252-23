import { BadRequestException, NotFoundException } from '@nestjs/common';

export type ProductDetailActor = {
  role: 'Customer' | 'ProductManager' | string;
  isAuthenticated?: boolean;
};

export type ProductDetailRepository = {
  findProductById(productId: string): Promise<any>;
};

export type ProductMediaRepository = {
  findMediaByProductId(productId: string): Promise<any[]>;
};

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because the method accepts a simple primitive type (unknown/string) to validate. Functional Cohesion because it focuses on a single task: validating a product ID.
 */
export class ProductDetailValidator {
  static validateProductId(productId: unknown): boolean {
    return typeof productId === 'string' && /^[A-Za-z0-9_]+$/.test(productId);
  }
}

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because the method relies on a simple data structure (actor) and a generic product object. Functional Cohesion because it has a single responsibility: checking if an actor can view a product.
 */
export class ProductDetailAccessChecker {
  static canViewProductDetail(
    actor: ProductDetailActor,
    product: any,
  ): boolean {
    if (actor.role === 'ProductManager') {
      return actor.isAuthenticated === true;
    }

    if (actor.role === 'Customer') {
      return product?.status === 'ACTIVE';
    }

    return false;
  }
}

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because the methods take in primitive data objects (product, actor) instead of complex interconnected classes. Functional Cohesion because it only handles logic for determining product availability.
 */
export class ProductAvailabilityService {
  static getAvailabilityStatus(product: any, actor: ProductDetailActor) {
    if (product?.status !== 'ACTIVE') {
      return {
        status: 'Deactivated',
        canAddToCart: false,
        currentStatus: product?.status,
      };
    }

    if ((product?.stock ?? product?.quantity ?? 0) <= 0) {
      return {
        status: 'Out of stock',
        canAddToCart: false,
        currentStatus: product.status,
      };
    }

    return {
      status: 'Available',
      canAddToCart: actor.role === 'Customer',
      currentStatus: product.status,
    };
  }
}

/**
 * + Coupling/Cohesion level: Stamp Coupling / Functional Cohesion
 * + Reason why: Stamp Coupling because the methods receive the entire product object (record structure) but only use specific properties from it to map into DTO-like structures. Functional Cohesion because all methods are focused on a single task: mapping database models to response objects.
 */
export class ProductDetailMapper {
  static mapGeneralProductDetail(product: any) {
    return {
      id: product.id,
      name: product.name ?? product.title,
      type: product.type ?? product.category,
      currentPrice: product.currentPrice,
      originalValue: product.originalValue,
      barcode: product.barcode,
      description: product.description,
      weight: product.weight,
      dimensions: product.dimensions,
      status: product.status,
    };
  }

  static mapBookDetail(product: any) {
    const book = product.book ?? product.printableProduct?.book ?? product;
    return {
      ...this.mapGeneralProductDetail(product),
      author: book.author,
      coverType: book.coverType,
      publisher: book.publisher,
      publicationDate: book.publicationDate ?? book.publishDate,
      numberOfPages: book.numberOfPages ?? book.nbPages,
      language: book.language,
      genre: book.genre,
    };
  }

  static mapNewspaperDetail(product: any) {
    const newspaper =
      product.newspaper ?? product.printableProduct?.newspaper ?? product;
    return {
      ...this.mapGeneralProductDetail(product),
      editorInChief: newspaper.editorInChief,
      publisher: newspaper.publisher,
      publicationDate: newspaper.publicationDate ?? newspaper.publishDate,
      issueNumber: newspaper.issueNumber,
      publicationFrequency:
        newspaper.publicationFrequency ?? newspaper.publicationFreq,
      ISSN: newspaper.ISSN ?? newspaper.issn,
      language: newspaper.language,
      sections: newspaper.sections,
    };
  }

  static mapCDDetail(product: any) {
    const cd = product.cd ?? product.discProduct?.cd ?? product;
    return {
      ...this.mapGeneralProductDetail(product),
      artists: cd.artists ?? cd.artist,
      recordLabel: cd.recordLabel,
      tracks: cd.tracks ?? cd.track,
      genre: cd.genre,
      releaseDate: cd.releaseDate,
    };
  }

  static mapDVDDetail(product: any) {
    const dvd = product.dvd ?? product.discProduct?.dvd ?? product;
    return {
      ...this.mapGeneralProductDetail(product),
      discType: dvd.discType,
      director: dvd.director,
      runtime: dvd.runtime,
      studio: dvd.studio,
      language: dvd.language,
      subtitles: dvd.subtitles,
      releaseDate: dvd.releaseDate,
      genre: dvd.genre,
    };
  }

  static mapProductDetail(product: any) {
    const type = String(product.type ?? product.category ?? '').toUpperCase();

    if (type === 'BOOK') return this.mapBookDetail(product);
    if (type === 'NEWSPAPER') return this.mapNewspaperDetail(product);
    if (type === 'CD') return this.mapCDDetail(product);
    if (type === 'DVD') return this.mapDVDDetail(product);

    return this.mapGeneralProductDetail(product);
  }
}

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because the method accepts simple primitive parameters (quantity, stock, productStatus). Functional Cohesion because its only purpose is to validate the add to cart quantity.
 */
export class CartQuantityValidator {
  static validateAddToCartQuantity(
    quantity: unknown,
    stock: number,
    productStatus: string,
  ): boolean {
    return (
      Number.isInteger(quantity) &&
      Number(quantity) > 0 &&
      Number(quantity) <= stock &&
      productStatus === 'ACTIVE'
    );
  }
}

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the repositories via simple data structures and parameters. Functional Cohesion because its methods orchestrate the single task of retrieving a product's detailed information.
 */
export class ProductDetailService {
  constructor(
    private readonly productRepository: ProductDetailRepository,
    private readonly mediaRepository?: ProductMediaRepository,
  ) {}

  async getProductDetail(productId: string, actor: ProductDetailActor) {
    if (!ProductDetailValidator.validateProductId(productId)) {
      throw new BadRequestException('Invalid product identifier');
    }

    const product = await this.productRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${productId}`);
    }

    const media = this.mediaRepository
      ? await this.mediaRepository.findMediaByProductId(productId)
      : [];

    return {
      ...ProductDetailMapper.mapProductDetail(product),
      media,
      availability: ProductAvailabilityService.getAvailabilityStatus(
        product,
        actor,
      ),
    };
  }
}
