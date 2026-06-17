import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IDailyQuotaRepository,
  UserQuotaData,
} from '../interfaces/daily-quota.repository.interface';

/**
 * Prisma implementation of IDailyQuotaRepository.
 *
 * + SOLID: SRP — This class ONLY handles Prisma data access for user quota fields.
 *   No business logic (quota calculation, limit checking) exists here.
 * + SOLID: DIP — DailyQuotaService depends on IDailyQuotaRepository (abstraction),
 *   not on this concrete class.
 *
 * + Coupling/Cohesion level: Content Coupling (with Prisma) / Functional Cohesion
 * + Reason why: Content Coupling with PrismaService is ACCEPTABLE here because
 *   this IS the data access layer — its job is to be the boundary between ORM and
 *   business logic. Functional Cohesion because every method serves a single purpose:
 *   reading or writing user quota data via Prisma.
 */
@Injectable()
export class DailyQuotaRepository implements IDailyQuotaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserQuota(userId: string): Promise<UserQuotaData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { dailyDeletes: true, lastDeleteDate: true },
    });

    if (!user) return null;

    return {
      dailyDeletes: user.dailyDeletes,
      lastDeleteDate: user.lastDeleteDate,
    };
  }

  async updateUserQuota(
    userId: string,
    dailyDeletes: number,
    lastDeleteDate: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { dailyDeletes, lastDeleteDate },
    });
  }
}
