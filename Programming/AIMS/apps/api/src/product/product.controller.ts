import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsListUseCase } from './application/use-cases/get-products-list.use-case';
import { GetProductDetailUseCase } from './application/use-cases/get-product-detail.use-case';
import { GetProductLogsUseCase } from './application/use-cases/get-product-logs.use-case';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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
    private readonly getProductLogsUseCase: GetProductLogsUseCase,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
    return this.productService.create(createProductDto, user.userId);
  }

  @Get()
  findAll() {
    return this.getProductsListUseCase.execute();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getProductDetailUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productService.update(id, updateProductDto, user.userId);
  }

  /**
   * Upload an image for a product.
   * Flow: Receive file → Upload to Cloudinary → Update image_url in DB → Return URL.
   *
   * + Coupling/Cohesion level: Data Coupling / Functional Cohesion
   * + Reason why: Data Coupling because it only passes simple data between services.
   *   Functional Cohesion because this endpoint performs one task: uploading a product image.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  @Post(':id/upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Image file not found in request');
    }

    const uploadResult = await this.cloudinaryService.uploadImage(file);
    const imageUrl = uploadResult.secure_url;

    await this.productService.updateImageUrl(id, imageUrl, user.userId);

    return { imageUrl };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  @Delete('bulk')
  async deleteBulk(@Body('ids') ids: string[], @Req() req: any) {
    const userId = req.user.userId;
    return this.productService.deleteBulk(ids, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.productService.deleteProduct(id, userId);
  }

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  async getLogs(@Param('id') id: string) {
    return this.getProductLogsUseCase.execute(id);
  }
}
