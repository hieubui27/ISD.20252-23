import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductType } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { IProductHandler } from './product-handler/product-handler.interface';
import { PRODUCT_HANDLERS } from './product.constants';

@Injectable()
export class ProductRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_HANDLERS)
    private readonly handlers: IProductHandler[],
  ) {}

  async create(dto: CreateProductDto): Promise<any> {
    const handler = this.handlers.find((h) => h.supports(dto.type));
    if (!handler) {
      throw new Error(`Product type ${dto.type} is not supported`);
    }

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

    return productId;
  }

  async findAll(): Promise<any> {
    const items = await this.prisma.product.findMany({
      include: {
        printableProduct: { include: { book: true, newspaper: true } },
        discProduct: { include: { cd: true, dvd: true } },
      },
    });
    return this.serializeBigInt(items);
  }

  async findOne(id: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
      include: {
        printableProduct: { include: { book: true, newspaper: true } },
        discProduct: { include: { cd: true, dvd: true } },
      },
    });
    return product ? this.serializeBigInt(product) : null;
  }

  async update(id: string, dto: UpdateProductDto): Promise<any> {
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

      if (dto.type) {
        const handler = this.handlers.find((h) =>
          h.supports(dto.type as ProductType),
        );
        if (handler) {
          await handler.update(tx, BigInt(id), dto);
        }
      }

      return product;
    });
    return this.serializeBigInt(updated);
  }

  async delete(id: string): Promise<void> {
    const bigId = BigInt(id);

    // Check if the product is in any order
    const orderCount = await this.prisma.orderProduct.count({
      where: { productId: bigId },
    });

    if (orderCount > 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: bigId },
        select: { title: true },
      });
      throw new BadRequestException(
        `Không thể xoá sản phẩm "${product?.title}" vì sản phẩm đang tồn tại trong ${orderCount} đơn hàng.`,
      );
    }

    await this.prisma.product.delete({ where: { id: bigId } });
  }

  async updateStatus(id: string, status: string): Promise<any> {
    const p = await this.prisma.product.update({
      where: { id: BigInt(id) },
      data: { status },
    });
    return this.serializeBigInt(p);
  }

  async deleteBulk(ids: string[]): Promise<void> {
    const bigIntIds = ids.map((id) => BigInt(id));

    // Find products that are in orders
    const productsInOrders = await this.prisma.orderProduct.findMany({
      where: { productId: { in: bigIntIds } },
      select: { productId: true },
      distinct: ['productId'],
    });

    if (productsInOrders.length > 0) {
      const blockedIds = productsInOrders.map((op) => op.productId);
      const blockedProducts = await this.prisma.product.findMany({
        where: { id: { in: blockedIds } },
        select: { title: true },
      });
      const titles = blockedProducts.map((p) => `"${p.title}"`).join(', ');
      throw new BadRequestException(
        `Không thể xoá vì các sản phẩm sau đang tồn tại trong đơn hàng: ${titles}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.deleteMany({
        where: { id: { in: bigIntIds } },
      });
    });
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<any> {
    const p = await this.prisma.product.update({
      where: { id: BigInt(id) },
      data: { imageUrl },
    });
    return this.serializeBigInt(p);
  }

  private serializeBigInt(data: any) {
    return JSON.parse(
      JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }
}
