import { Prisma } from '../../prisma/generated/client';

export const IProductLogServiceToken = Symbol('IProductLogService');

export interface IProductLogService {
  /**
   * Logs an action performed on a product within a transaction.
   * @param tx The Prisma transaction client
   * @param productId The ID of the product
   * @param userId The ID of the user performing the action
   * @param action The action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
   */
  logAction(
    tx: Omit<
      Prisma.TransactionClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    productId: string,
    userId: string,
    action: string,
  ): Promise<void>;

  /**
   * Retrieves all logs for a specific product.
   * @param productId The ID of the product
   */
  getLogsByProductId(productId: string): Promise<any[]>;

  /**
   * Retrieves all product logs.
   */
  getAllLogs(): Promise<any[]>;
}
