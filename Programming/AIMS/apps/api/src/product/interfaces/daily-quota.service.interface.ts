/**
 * Interface for DailyQuotaService.
 *
 * + SOLID: DIP — ProductService depends on this abstraction instead of the concrete DailyQuotaService.
 *   This allows swapping implementations (e.g., NoDailyQuotaService for admin bypass)
 *   without modifying ProductService.
 *
 * + Coupling/Cohesion: Data Coupling / Functional Cohesion
 * + Reason why: Data Coupling because consumers interact using only simple parameters (userId, count).
 *   Functional Cohesion because all methods relate to a single purpose: managing daily deletion quotas.
 */

export const IDailyQuotaServiceToken = Symbol('IDailyQuotaService');

export interface IDailyQuotaService {
  /**
   * Checks if the user has remaining quota for a single deletion.
   * Throws HttpException (429) if the daily limit is exceeded.
   */
  checkAndDeleteQuota(userId: string): Promise<void>;

  /**
   * Increments the user's daily deletion counter by 1.
   */
  incrementQuota(userId: string): Promise<void>;

  /**
   * Checks if the user has remaining quota for a bulk deletion of `count` items.
   * Throws HttpException (429) if the daily limit would be exceeded.
   */
  checkBulkQuota(userId: string, count: number): Promise<void>;

  /**
   * Increments the user's daily deletion counter by `count`.
   */
  incrementBulkQuota(userId: string, count: number): Promise<void>;
}
