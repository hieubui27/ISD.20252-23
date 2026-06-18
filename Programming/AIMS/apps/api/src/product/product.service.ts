import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IProductLogServiceToken } from './interfaces/product-log.service.interface';
import type { IProductLogService } from './interfaces/product-log.service.interface';
import { IDailyQuotaServiceToken } from './interfaces/daily-quota.service.interface';
import type { IDailyQuotaService } from './interfaces/daily-quota.service.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './product.repository';
import { canHardDeleteProduct } from './utils/product-validation.util';

@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    @Inject(IProductLogServiceToken)
    private readonly productLogService: IProductLogService,
    @Inject(IDailyQuotaServiceToken)
    private readonly dailyQuotaService: IDailyQuotaService,
  ) {}

  async create(dto: CreateProductDto, userId: string) {
    const productId = await this.repository.create(dto);

    await this.productLogService.logAction(
      undefined,
      productId.toString(),
      userId,
      'CREATE',
    );

    return this.findOne(productId.toString());
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const product = await this.repository.findOne(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    userId: string,
    action = 'UPDATE',
  ) {
    const updatedProduct = await this.repository.update(id, dto);

    await this.productLogService.logAction(undefined, id, userId, action);

    return updatedProduct;
  }

  async deleteProduct(id: string, userId: string) {
    await this.dailyQuotaService.checkAndDeleteQuota(userId);

    const product = await this.findOne(id);
    let finalStatus = '';

    if (canHardDeleteProduct(product)) {
      await this.repository.updateStatus(id, 'DELETED');
      await this.productLogService.logAction(undefined, id, userId, 'DELETE');
      finalStatus = 'DELETED';
    } else {
      await this.repository.updateStatus(id, 'DEACTIVATED');
      await this.productLogService.logAction(
        undefined,
        id,
        userId,
        'DEACTIVATE',
      );
      finalStatus = 'DEACTIVATED';
    }

    if (finalStatus === 'DEACTIVATED') {
      // Only increment back if we fell back to DEACTIVATED. Wait, if it wasn't a hard delete, does it count towards the deletion quota?
      // The original code incremented it back in ALL cases, which is weird.
      // Original: "await this.dailyQuotaService.incrementQuota(userId);" unconditionally.
      // I'll stick to original behavior: incrementing it back after every deleteProduct, wait, why?
      // Let's look at original logic:
      // deleteProduct -> checkAndDeleteQuota (deducts 1). Then it does delete. Then at the end it does incrementQuota (adds 1).
      // That means quota is actually NOT deducted successfully if they do it this way?
      // Ah, no, incrementQuota ADDS 1 to the count of deletions. "currentDeletes + 1"
      // The naming in original code: "incrementQuota" means incrementing the usage counter. "checkAndDeleteQuota" is poorly named, it only CHECKS.
      // Wait! Let's check daily-quota.service.ts
      // checkAndDeleteQuota: if (currentDeletes >= 20) throw ...
      // incrementQuota: update { dailyDeletes: currentDeletes + 1 }
      // So it DOES NOT check AND delete in `checkAndDeleteQuota`. It only checks.
      // Then it increments at the end. I will keep it the same.
    }
    await this.dailyQuotaService.incrementQuota(userId);

    return { status: finalStatus };
  }

  async deleteBulk(ids: string[], userId: string) {
    if (!ids || ids.length > 10) {
      throw new BadRequestException(
        'Maximum 10 products can be deleted at once',
      );
    }

    await this.dailyQuotaService.checkBulkQuota(userId, ids.length);

    const results = [];
    for (const id of ids) {
      const product = await this.findOne(id);
      let finalStatus = '';

      if (canHardDeleteProduct(product)) {
        await this.repository.updateStatus(id, 'DELETED');
        await this.productLogService.logAction(undefined, id, userId, 'DELETE');
        finalStatus = 'DELETED';
      } else {
        await this.repository.updateStatus(id, 'DEACTIVATED');
        await this.productLogService.logAction(
          undefined,
          id,
          userId,
          'DEACTIVATE',
        );
        finalStatus = 'DEACTIVATED';
      }
      results.push({ id, status: finalStatus });
    }

    await this.dailyQuotaService.incrementBulkQuota(userId, ids.length);

    return results;
  }

  async updateImageUrl(id: string, imageUrl: string, userId: string) {
    // Check if exists
    await this.findOne(id);

    const updated = await this.repository.updateImageUrl(id, imageUrl);

    await this.productLogService.logAction(
      undefined,
      id,
      userId,
      'UPDATE_IMAGE',
    );

    return updated;
  }
}
