// apps/api/src/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductType } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { IProductHandler } from './product-handler/product-handler.interface';
import { BookHandler } from './product-handler/book.handler';
import { CdHandler } from './product-handler/cd.handler';
import { DvdHandler } from './product-handler/dvd.handler';
import { NewspaperHandler } from './product-handler/newspaper.handler';

/**
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because methods accept DTOs (CreateProductDto, UpdateProductDto) and simple types as parameters. Functional Cohesion because all methods are focused on a single task: managing the lifecycle of Product entities.
 */
@Injectable()
export class ProductService {
  private readonly handlers: IProductHandler[];
  private dailyDeletes = 0;

  resetDailyQuota() {
    this.dailyDeletes = 0;
  }

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
      throw new BadRequestException(
        `Product type ${dto.type} is not supported`,
      );

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
    if (!product) throw new NotFoundException(`Product ${id} not found`);
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

  async deleteProduct(id: string) {
    if (this.dailyDeletes >= 20) {
      throw new HttpException(
        'Exceeded daily product deletion limit (20)',
        429,
      );
    }

    const product = await this.findOne(id);

    if (product.quantity === 0) {
      try {
        await this.remove(id);
        this.dailyDeletes++;
        return { status: 'DELETED' };
      } catch (error) {
        await this.update(id, { status: 'DEACTIVATED' } as any);
        this.dailyDeletes++;
        return { status: 'DEACTIVATED' };
      }
    } else {
      await this.update(id, { status: 'DEACTIVATED' } as any);
      this.dailyDeletes++;
      return { status: 'DEACTIVATED' };
    }
  }

  async deleteBulk(ids: string[]) {
    if (!ids || ids.length > 10) {
      throw new BadRequestException(
        'Maximum 10 products can be deleted at once',
      );
    }
    const results = [];
    for (const id of ids) {
      results.push(await this.deleteProduct(id));
    }
    return results;
  }

  /**
   * Updates the image URL for a specific product.
   *
   * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
   * + Reason why: Data Coupling because it only receives simple data (id, imageUrl).
   *   Functional Cohesion because it performs a single focused task: updating the image URL.
   */
  async updateImageUrl(id: string, imageUrl: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const updated = await this.prisma.product.update({
      where: { id: BigInt(id) },
      data: { imageUrl },
    });
    return this.serializeBigInt(updated);
  }

  private serializeBigInt(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }
}
