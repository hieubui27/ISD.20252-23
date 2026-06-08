import { GetOrdersDto } from '../dto/get-orders.dto';

export const ORDER_MANAGER_SERVICE = 'ORDER_MANAGER_SERVICE';

export interface IOrderManagerService {
  getAllOrders(dto: GetOrdersDto): Promise<{ data: unknown[]; total: number }>;
  getOrderById(id: string): Promise<unknown>;
  approveOrder(id: string): Promise<unknown>;
  rejectOrder(id: string, reason?: string): Promise<unknown>;
}
