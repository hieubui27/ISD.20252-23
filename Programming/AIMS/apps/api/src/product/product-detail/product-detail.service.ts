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

export class ProductDetailValidator {
  static validateProductId(productId: unknown): boolean {
    return typeof productId === 'string' && /^[A-Za-z0-9_]+$/.test(productId);
  }
}

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
