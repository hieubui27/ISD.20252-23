// apps/api/src/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductType } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface IProductHandler {
  supports(type: ProductType): boolean;
  create(tx: any, productId: bigint, data: CreateProductDto): Promise<void>;
}

@Injectable()
export class ProductService {
  private readonly handlers: IProductHandler[];

  constructor(private readonly prisma: PrismaService) {
    this.handlers = [
      new BookHandler(),
      new CdHandler(),
      new DvdHandler(),
      new NewspaperHandler(),
    ];
  }

  async create(dto: CreateProductDto) {
    const handler = this.handlers.find((h) => h.supports(dto.type));
    if (!handler)
      throw new BadRequestException(`Loại ${dto.type} không hỗ trợ`);

    const productId = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          barcode: dto.barcode,
          category: dto.category,
          title: dto.title,
          description: dto.description,
          dimensions: dto.dimensions,
          weight: dto.weight,
          originalValue: dto.originalValue,
          currentPrice: dto.currentPrice,
          quantity: dto.quantity,
          status: dto.status,
          imageUrl: dto.imageUrl,
          videoUrl: dto.videoUrl,
        },
      });
      await handler.create(tx, product.id, dto);
      return product.id;
    });
    return this.findOne(productId.toString());
  }

  async findAll() {
    const items = await this.prisma.product.findMany({
      include: {
        printableProduct: { include: { book: true, newspaper: true } },
        discProduct: { include: { cd: true, dvd: true } },
      },
    });
    return this.serializeBigInt(items);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
      include: {
        printableProduct: { include: { book: true, newspaper: true } },
        discProduct: { include: { cd: true, dvd: true } },
      },
    });
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    return this.serializeBigInt(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const updated = await this.prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        title: dto.title,
        currentPrice: dto.currentPrice,
        quantity: dto.quantity,
        status: dto.status,
      },
    });
    return this.serializeBigInt(updated);
  }

  async remove(id: string) {
    await this.prisma.product.delete({ where: { id: BigInt(id) } });
    return { success: true };
  }

  private serializeBigInt(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }
}

// =========================================================================
// STRATEGY HANDLERS
// =========================================================================

class BookHandler implements IProductHandler {
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

class CdHandler implements IProductHandler {
  supports(type: ProductType): boolean {
    return type === ProductType.CD;
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
}

class DvdHandler implements IProductHandler {
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

class NewspaperHandler implements IProductHandler {
  supports(type: ProductType): boolean {
    return type === ProductType.NEWSPAPER;
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
}
