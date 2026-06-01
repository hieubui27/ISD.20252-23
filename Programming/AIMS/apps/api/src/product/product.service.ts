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
import { DailyQuotaService } from './services/daily-quota.service';

export const PRODUCT_HANDLERS = 'PRODUCT_HANDLERS';

/**
 * [SOLID Violation in Old Design]
 * Violated Principle: SRP, OCP & DIP
 * Code Section: ProductService
 * Why:
 * 1. SRP: The service handled product creation, daily quota tracking (in `deleteProduct`), DB transactions, etc.
 * 2. OCP & DIP: The constructor hardcoded `new BookHandler()`, `new CdHandler()`, etc. Adding a new product type (e.g. Clothing) required modifying this class directly to instantiate the new handler, violating OCP. It also depended on concrete classes rather than abstractions (violating DIP).
 * Proposed solution direction / Refactored:
 * 1. Injected `IProductHandler[]` via DI token `PRODUCT_HANDLERS` (solves DIP and OCP).
 * 2. Delegated quota management to `DailyQuotaService` (solves SRP).
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IProductLogServiceToken)
    private readonly productLogService: IProductLogService,
    @Inject(PRODUCT_HANDLERS)
    private readonly handlers: IProductHandler[],
    private readonly dailyQuotaService: DailyQuotaService,
  ) {}

  async create(dto: CreateProductDto, userId: string) {
    const handler = this.handlers.find((h) => h.supports(dto.type));
    if (!handler)
      throw new BadRequestException(
        `Product type ${dto.type} is not supported`,
      );

    handler.validate(dto); // Added validation call

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

      const handler = this.handlers.find((h) =>
        h.supports(dto.type as ProductType),
      );
      if (handler) {
        await handler.update(tx, BigInt(id), dto);
      }

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
    await this.dailyQuotaService.checkAndDeleteQuota(userId);

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

    await this.dailyQuotaService.incrementQuota(userId);

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
