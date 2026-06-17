/**
 * Interface for DailyQuotaRepository — data access abstraction for user quota operations.
 *
 * + SOLID: SRP — Separates data access concern from business logic in DailyQuotaService.
 *   DailyQuotaService no longer directly depends on PrismaService.
 * + SOLID: DIP — DailyQuotaService depends on this abstraction instead of Prisma.
 * + SOLID: ISP — Exposes only quota-related fields (dailyDeletes, lastDeleteDate),
 *   not the entire User entity.
 *
 * + Coupling/Cohesion: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because it uses a focused DTO (UserQuotaData) with only
 *   the fields needed for quota logic. Functional Cohesion because all methods
 *   relate exclusively to reading/writing user quota data.
 */

export const IDailyQuotaRepositoryToken = Symbol('IDailyQuotaRepository');

/**
 * Focused data type containing only the fields needed for quota calculation.
 * This avoids exposing the entire User entity to the business logic layer (ISP).
 */
export interface UserQuotaData {
  dailyDeletes: number;
  lastDeleteDate: Date | null;
}

export interface IDailyQuotaRepository {
  /**
   * Retrieves only the quota-related fields for a user.
   * Returns null if user is not found.
   */
  findUserQuota(userId: string): Promise<UserQuotaData | null>;

  /**
   * Updates the user's daily deletion counter and last delete date.
   */
  updateUserQuota(
    userId: string,
    dailyDeletes: number,
    lastDeleteDate: Date,
  ): Promise<void>;
}
