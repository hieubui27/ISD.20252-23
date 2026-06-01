// apps/api/src/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  Inject,
} from '@nestjs/common';
import {
  IProductLogService,
  IProductLogServiceToken,
} from './interfaces/product-log.service.interface';
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

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IProductLogServiceToken)
    private readonly productLogService: IProductLogService,
  ) {
    this.handlers = [
      new BookHandler(),
      new CdHandler(),
      new DvdHandler(),
      new NewspaperHandler(),
    ];
  }

  async create(dto: CreateProductDto, userId: string) {
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
      await this.productLogService.logAction(
        tx,
        product.id.toString(),
        userId,
        'CREATE',
      );
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

  async update(
    id: string,
    dto: UpdateProductDto,
    userId: string,
    action = 'UPDATE',
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: BigInt(id) },
        data: {
          title: dto.title,
          currentPrice: dto.currentPrice,
          quantity: dto.quantity,
          status: dto.status,
        },
      });
      await this.productLogService.logAction(tx, id, userId, action);
      return product;
    });
    return this.serializeBigInt(updated);
  }

  async remove(id: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id: BigInt(id) } });
      await this.productLogService.logAction(tx, id, userId, 'DELETE');
    });
    return { success: true };
  }

  async deleteProduct(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) throw new BadRequestException('User not found');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

    let currentDeletes = user.dailyDeletes;
    const lastDate = user.lastDeleteDate;

    if (!lastDate || lastDate.getTime() !== today.getTime()) {
      currentDeletes = 0;
    }

    if (currentDeletes >= 20) {
      throw new HttpException(
        'Exceeded daily product deletion limit (20)',
        429,
      );
    }

    const product = await this.findOne(id);
    let finalStatus = '';

    if (product.quantity === 0) {
      try {
        await this.remove(id, userId);
        finalStatus = 'DELETED';
      } catch (error) {
        await this.update(
          id,
          { status: 'DEACTIVATED' } as any,
          userId,
          'DEACTIVATE',
        );
        finalStatus = 'DEACTIVATED';
      }
    } else {
      await this.update(
        id,
        { status: 'DEACTIVATED' } as any,
        userId,
        'DEACTIVATE',
      );
      finalStatus = 'DEACTIVATED';
    }

    // Update user quota
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { dailyDeletes: currentDeletes + 1, lastDeleteDate: today },
    });

    return { status: finalStatus };
  }

  async deleteBulk(ids: string[], userId: string) {
    if (!ids || ids.length > 10) {
      throw new BadRequestException(
        'Maximum 10 products can be deleted at once',
      );
    }
    const results = [];
    for (const id of ids) {
      results.push(await this.deleteProduct(id, userId));
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
  async updateImageUrl(id: string, imageUrl: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: BigInt(id) },
        data: { imageUrl },
      });
      await this.productLogService.logAction(tx, id, userId, 'UPDATE_IMAGE');
      return p;
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
