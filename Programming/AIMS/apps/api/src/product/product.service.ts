import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IProductLogServiceToken } from './interfaces/product-log.service.interface';
import type { IProductLogService } from './interfaces/product-log.service.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DailyQuotaService } from './services/daily-quota.service';
import { ProductRepository } from './product.repository';
import { canHardDeleteProduct } from './utils/product-validation.util';

@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    @Inject(IProductLogServiceToken)
    private readonly productLogService: IProductLogService,
    private readonly dailyQuotaService: DailyQuotaService,
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
      try {
        await this.repository.delete(id);
        await this.productLogService.logAction(undefined, id, userId, 'DELETE');
        finalStatus = 'DELETED';
      } catch (error) {
        await this.repository.updateStatus(id, 'DEACTIVATED');
        await this.productLogService.logAction(
          undefined,
          id,
          userId,
          'DEACTIVATE',
        );
        finalStatus = 'DEACTIVATED';
      }
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

    // N+1 Problem Resolved: Use Bulk check and Bulk operations
    await this.dailyQuotaService.checkBulkQuota(userId, ids.length);

    await this.repository.deleteBulk(ids);

    // Log for each deleted item
    for (const id of ids) {
      await this.productLogService.logAction(undefined, id, userId, 'DELETE');
    }

    await this.dailyQuotaService.incrementBulkQuota(userId, ids.length);

    return ids.map((id) => ({ status: 'DELETED' }));
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
