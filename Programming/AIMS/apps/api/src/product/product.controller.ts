// apps/api/src/product/product.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsListUseCase } from './application/use-cases/get-products-list.use-case';
import { GetProductDetailUseCase } from './application/use-cases/get-product-detail.use-case';

/**
 * Module: ProductController
 * Use Case: UC235 - View Product Detail
 *
 * SOLID Review:
 * SRP: Satisfied. This controller only handles HTTP request/response for product APIs.
 * OCP: Satisfied. Product-type-specific processing is delegated to application/mapper layers.
 * LSP: Not applicable. This class does not define an inheritance hierarchy.
 * ISP: Satisfied if it depends only on query use cases needed for reading product data.
 * DIP: Satisfied. The controller depends on injected use cases/services instead of directly instantiating concrete classes.
 *
 * Improvement Direction:
 * Keep this controller thin. Do not add Prisma queries, DTO mapping, or UI formatting logic here.
 */
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly getProductsListUseCase: GetProductsListUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
  ) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.getProductsListUseCase.execute();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getProductDetailUseCase.execute(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete('bulk')
  async deleteBulk(@Body('ids') ids: string[]) {
    return this.productService.deleteBulk(ids);
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}
