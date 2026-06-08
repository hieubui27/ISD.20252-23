import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetOrdersDto } from './dto/get-orders.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { OrderManagerService } from './order-manager.service';

@Controller('order-manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Product Manager')
export class OrderManagerController {
  constructor(private readonly orderManagerService: OrderManagerService) {}

  @Get('orders')
  async getAllOrders(@Query() dto: GetOrdersDto) {
    return this.orderManagerService.getAllOrders(dto);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string) {
    return this.orderManagerService.getOrderById(id);
  }

  @Put('orders/:id/approve')
  async approveOrder(@Param('id') id: string) {
    return this.orderManagerService.approveOrder(id);
  }

  @Put('orders/:id/reject')
  async rejectOrder(@Param('id') id: string, @Body() dto: RejectOrderDto) {
    return this.orderManagerService.rejectOrder(id, dto.reason);
  }
}
