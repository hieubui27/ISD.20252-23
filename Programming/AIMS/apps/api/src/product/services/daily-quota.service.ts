import { Injectable, HttpException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isTodayUTC } from '../../common/utils/date.util';

@Injectable()
export class DailyQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateCurrentDeletes(user: any): number {
    if (isTodayUTC(user.lastDeleteDate)) {
      return user.dailyDeletes;
    }
    return 0; // Reset for a new day
  }

  async checkAndDeleteQuota(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) throw new BadRequestException('User not found');

    const currentDeletes = this.calculateCurrentDeletes(user);

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

    const currentDeletes = this.calculateCurrentDeletes(user);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { dailyDeletes: currentDeletes + 1, lastDeleteDate: today },
    });
  }

  async checkBulkQuota(userId: string, count: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) throw new BadRequestException('User not found');

    const currentDeletes = this.calculateCurrentDeletes(user);

    if (currentDeletes + count > 20) {
      throw new HttpException(
        `Exceeded daily product deletion limit (20). You are trying to delete ${count} items but you only have ${20 - currentDeletes} left.`,
        429,
      );
    }
  }

  async incrementBulkQuota(userId: string, count: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) return;

    const currentDeletes = this.calculateCurrentDeletes(user);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { dailyDeletes: currentDeletes + count, lastDeleteDate: today },
    });
  }
}
