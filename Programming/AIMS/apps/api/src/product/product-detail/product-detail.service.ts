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
 * Use Case: View Product Detail
 *
 * Coupling level: Data Coupling
 * - Receives a single primitive value (productId: unknown) as input.
 * - Has no dependency on any external class or module.
 * - Only exposes a pure static utility method with no side effects.
 *
 * Cohesion level: Functional Cohesion
 * - Single, well-defined responsibility: validate the format of a product ID.
 * - All logic within this class serves exactly one purpose.
 */
export class ProductDetailValidator {
  static validateProductId(productId: unknown): boolean {
    return typeof productId === 'string' && /^[A-Za-z0-9_]+$/.test(productId);
  }
}

/**
 * Use Case: View Product Detail
 *
 * Coupling level: Stamp Coupling (with ProductDetailActor, product object)
 * - Receives the full `actor` object and full `product` object as parameters,
 *   but only uses `actor.role`, `actor.isAuthenticated`, and `product.status`.
 * - This is an intentional design choice to keep the interface flexible
 *   as access rules may evolve (e.g., new roles, additional product fields).
 *
 * Cohesion level: Functional Cohesion
 * - Single responsibility: determine whether a given actor is allowed
 *   to view the detail of a specific product.
 */
export class ProductDetailAccessChecker {
  static canViewProductDetail(actor: ProductDetailActor, product: any): boolean {
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
 * Use Case: View Product Detail
 *
 * Coupling level: Stamp Coupling (with product object, ProductDetailActor)
 * - Receives the full `product` object but only reads `product.status`,
 *   `product.stock`, and `product.quantity`.
 * - Receives the full `actor` object but only reads `actor.role`.
 * - Improvement direction: could accept { status, stock } and { role } directly
 *   to reduce to Data Coupling, but current design is acceptable for readability.
 *
 * Cohesion level: Functional Cohesion
 * - Single responsibility: compute and return the availability status
 *   of a product (Available / Out of stock / Deactivated) for a given actor.
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
 * Use Case: View Product Detail
 *
 * Coupling level: Stamp Coupling (with product object)
 * - Each method receives the full product object but only reads the fields
 *   relevant to that product type (e.g., mapBookDetail reads book-specific fields).
 * - This is an intentional design: the product shape varies per type and the mapper
 *   needs flexibility to handle nested structures (printableProduct, discProduct).
 *   Passing individual fields would create overly long parameter lists.
 *
 * Cohesion level: Sequential Cohesion (tending toward Functional)
 * - mapGeneralProductDetail produces output that is used as a base (via spread)
 *   by mapBookDetail, mapNewspaperDetail, mapCDDetail, and mapDVDDetail.
 * - mapProductDetail acts as a dispatcher that delegates to type-specific mappers.
 * - All methods serve the unified goal of transforming raw product data
 *   into a clean, type-aware response object.
 * - Note: the if-chain in mapProductDetail shows a mild control coupling tendency;
 *   improvement direction: apply Strategy/Factory pattern per product type.
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
 * Use Case: View Product Detail
 *
 * Coupling level: Data Coupling
 * - Receives only primitive values as parameters: quantity (unknown/number),
 *   stock (number), and productStatus (string).
 * - No dependency on any external class, object, or module.
 *
 * Cohesion level: Functional Cohesion
 * - Single responsibility: validate whether a requested cart quantity is
 *   valid given the current stock level and product status.
 * - All logic directly serves this one validation goal.
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
 * Use Case: View Product Detail
 *
 * Coupling level: Data Coupling (with ProductDetailRepository, ProductMediaRepository)
 * - Dependencies are injected via constructor as interfaces (not concrete classes),
 *   following the Dependency Inversion Principle. This avoids Common Coupling.
 * - Only passes primitive productId (string) to repository methods — Data Coupling.
 * - Delegates to ProductDetailValidator, ProductDetailMapper,
 *   and ProductAvailabilityService via static method calls with minimal parameters.
 *
 * Cohesion level: Functional Cohesion
 * - Single, well-defined responsibility: orchestrate the retrieval and assembly
 *   of a complete product detail response for a given actor.
 * - All steps (validate → fetch product → fetch media → map → check availability)
 *   directly contribute to producing this one result.
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
