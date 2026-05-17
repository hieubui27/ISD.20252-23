// apps/api/src/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductType } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { IProductHandler } from './product-handler/product-handler.interface';
import { BookHandler } from './product-handler/book.handler';
import { CdHandler } from './product-handler/cd.handler';
import { DvdHandler } from './product-handler/dvd.handler';
import { NewspaperHandler } from './product-handler/newspaper.handler';

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
