import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ProductQueryParams,
  ProductSortOption,
} from './domain/repositories/product-query.repository.interface';
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
import { GetAllProductLogsUseCase } from './application/use-cases/get-all-product-logs.use-case';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProductDetailMapper } from './application/mappers/product-detail.mapper';

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
    private readonly getAllProductLogsUseCase: GetAllProductLogsUseCase,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: any,
  ) {
    const created = await this.productService.create(
      createProductDto,
      user.userId,
    );
    return ProductDetailMapper.toDetailDto(created);
  }

  /**
   * Customer catalog listing.
   *
   * Filtering (category + search), sorting and pagination are all resolved on
   * the server so the returned page, its item count and the total count stay
   * consistent with the active filter.
   *
   * Query params:
   *  - category: one category, or several (repeated `?category=` or comma-separated).
   *  - q / search: free-text title search.
   *  - sort: recommended | priceAsc | priceDesc | titleAsc.
   *  - cursor: id of the last item of the previous page (keyset / next-page flow).
   *  - page: 1-based page index for direct page jumps.
   *  - limit: page size (defaults to 20; omit/0 returns all matching products).
   */
  @Get()
  findAll(
    @Query('category') category?: string | string[],
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const params: ProductQueryParams = {
      categories: this.parseCategories(category),
      search: (q ?? search)?.trim() || undefined,
      sort: this.parseSort(sort),
      cursor: cursor?.trim() || undefined,
      page: this.parsePositiveInt(page),
      limit: this.parsePositiveInt(limit),
    };

    return this.getProductsListUseCase.execute(params);
  }

  /** Normalizes the category query param into a clean list. */
  private parseCategories(value?: string | string[]): string[] | undefined {
    if (value == null) {
      return undefined;
    }

    const raw = Array.isArray(value) ? value : [value];
    const categories = raw
      .flatMap((entry) => entry.split(','))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    return categories.length > 0 ? categories : undefined;
  }

  /** Validates the sort query param, falling back to the default order. */
  private parseSort(value?: string): ProductSortOption | undefined {
    const allowed: ProductSortOption[] = [
      'recommended',
      'priceAsc',
      'priceDesc',
      'titleAsc',
    ];
    return allowed.includes(value as ProductSortOption)
      ? (value as ProductSortOption)
      : undefined;
  }

  /** Parses a positive integer query param, returning undefined when invalid. */
  private parsePositiveInt(value?: string): number | undefined {
    if (value == null) {
      return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  @Get('manager')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  async findAllForManager() {
    const products = await this.productService.findAll();
    return products.map((p) => ProductDetailMapper.toListItemDto(p));
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  async getAllLogs() {
    return this.getAllProductLogsUseCase.execute();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getProductDetailUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Product Manager')
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.productService.update(
      id,
      updateProductDto,
      user.userId,
    );
    return ProductDetailMapper.toDetailDto(updated);
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
