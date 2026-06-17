import {
  Injectable,
  Inject,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { isTodayUTC } from '../../common/utils/date.util';
import {
  IDailyQuotaRepositoryToken,
  IDailyQuotaRepository,
  UserQuotaData,
} from '../interfaces/daily-quota.repository.interface';
import { IDailyQuotaService } from '../interfaces/daily-quota.service.interface';

/**
 * DailyQuotaService — Business logic ONLY for daily deletion quota management.
 *
 * [SOLID Fix Applied]
 * Fixed Principle: SRP & DIP
 * What changed: Removed direct PrismaService dependency. All data access is now
 *   delegated to IDailyQuotaRepository (injected via token). This class now has
 *   only ONE reason to change: when quota business rules change.
 * Why: Previously, this class mixed business logic (quota calculation, limit checking)
 *   with data access (Prisma queries). Changes to storage strategy (e.g., Redis caching)
 *   would have forced changes to business logic code. Now, storage can be swapped by
 *   providing a different IDailyQuotaRepository implementation without touching this class.
 *
 * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it interacts with the repository using a focused
 *   DTO (UserQuotaData) containing only the fields it needs. Functional Cohesion because
 *   every method relates to a single concern: enforcing daily deletion quota rules.
 */
@Injectable()
export class DailyQuotaService implements IDailyQuotaService {
  /**
   * Maximum number of product deletions allowed per user per day.
   * Extracted from hard-coded magic number to named constant (OCP fix).
   */
  private static readonly MAX_DAILY_DELETES = 20;

  constructor(
    @Inject(IDailyQuotaRepositoryToken)
    private readonly quotaRepository: IDailyQuotaRepository,
  ) { }

  private calculateCurrentDeletes(quotaData: UserQuotaData): number {
    if (isTodayUTC(quotaData.lastDeleteDate)) {
      return quotaData.dailyDeletes;
    }
    return 0; // Reset for a new day
  }

  async checkAndDeleteQuota(userId: string): Promise<void> {
    const quotaData = await this.quotaRepository.findUserQuota(userId);
    if (!quotaData) throw new BadRequestException('User not found');

    const currentDeletes = this.calculateCurrentDeletes(quotaData);

    if (currentDeletes >= DailyQuotaService.MAX_DAILY_DELETES) {
      throw new HttpException(
        `Exceeded daily product deletion limit (${DailyQuotaService.MAX_DAILY_DELETES})`,
        429,
      );
    }
  }

  async incrementQuota(userId: string): Promise<void> {
    const quotaData = await this.quotaRepository.findUserQuota(userId);
    if (!quotaData) return;

    const currentDeletes = this.calculateCurrentDeletes(quotaData);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.quotaRepository.updateUserQuota(
      userId,
      currentDeletes + 1,
      today,
    );
  }

  async checkBulkQuota(userId: string, count: number): Promise<void> {
    const quotaData = await this.quotaRepository.findUserQuota(userId);
    if (!quotaData) throw new BadRequestException('User not found');

    const currentDeletes = this.calculateCurrentDeletes(quotaData);
    const maxDeletes = DailyQuotaService.MAX_DAILY_DELETES;

    if (currentDeletes + count > maxDeletes) {
      throw new HttpException(
        `Exceeded daily product deletion limit (${maxDeletes}). You are trying to delete ${count} items but you only have ${maxDeletes - currentDeletes} left.`,
        429,
      );
    }
  }

  async incrementBulkQuota(userId: string, count: number): Promise<void> {
    const quotaData = await this.quotaRepository.findUserQuota(userId);
    if (!quotaData) return;

    const currentDeletes = this.calculateCurrentDeletes(quotaData);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.quotaRepository.updateUserQuota(
      userId,
      currentDeletes + count,
      today,
    );
  }
}
