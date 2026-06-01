import { Injectable, HttpException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DailyQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndDeleteQuota(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) throw new BadRequestException('User not found');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

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
  }

  async incrementQuota(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) return;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let currentDeletes = user.dailyDeletes;
    const lastDate = user.lastDeleteDate;

    if (!lastDate || lastDate.getTime() !== today.getTime()) {
      currentDeletes = 0;
    }

    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { dailyDeletes: currentDeletes + 1, lastDeleteDate: today },
    });
  }
}
