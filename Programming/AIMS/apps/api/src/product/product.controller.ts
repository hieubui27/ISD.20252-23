// apps/api/src/product/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  private dailyDeletes = 0;

  resetDailyQuota() {
    this.dailyDeletes = 0;
  }

  @Delete('bulk')
  async deleteBulk(@Body('ids') ids: string[]) {
    if (!ids || ids.length > 10) {
      throw new BadRequestException('Chỉ được xóa tối đa 10 sản phẩm 1 lần');
    }
    const results = [];
    for (const id of ids) {
      results.push(await this.deleteProduct(id));
    }
    return results;
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    if (this.dailyDeletes >= 20) {
      throw new HttpException(
        'Vượt quá hạn mức xóa sản phẩm trong ngày (20)',
        429,
      );
    }

    const product = await this.productService.findOne(id);

    if (product.quantity === 0) {
      this.dailyDeletes++;
      await this.productService.remove(id);
      return { status: 'DELETED' };
    } else {
      await this.productService.update(id, { status: 'DEACTIVATED' } as any);
      return { status: 'DEACTIVATED' };
    }
  }
}
