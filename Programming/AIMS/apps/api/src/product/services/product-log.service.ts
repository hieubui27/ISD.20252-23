import { Injectable, NotFoundException } from '@nestjs/common';
import { IProductLogService } from '../interfaces/product-log.service.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductLogService implements IProductLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    tx: Omit<
      Prisma.TransactionClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    productId: string,
    userId: string,
    action: string,
  ): Promise<void> {
    if (!userId) return;

    await tx.productLog.create({
      data: {
        action,
        productId: BigInt(productId),
        createdByUserId: BigInt(userId),
      },
    });
  }

  async getLogsByProductId(productId: string): Promise<any[]> {
    const logs = await this.prisma.productLog.findMany({
      where: { productId: BigInt(productId) },
      include: {
        createdBy: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
      },
      orderBy: { createdDate: 'desc' },
    });

    return JSON.parse(
      JSON.stringify(logs, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }
}
