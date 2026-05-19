// apps/api/src/product/entities/product.entity.ts

export class ProductEntity {
  id: string; // Convert BigInt to string for Client
  barcode: string;
  category: string;
  title: string;
  description: string;
  dimensions?: string;
  weight: number;
  originalValue: number;
  currentPrice: number;
  quantity: number;
  status: string;
  imageUrl: string;
  videoUrl: string;
  createdAt: Date;
  updatedAt?: Date;

  constructor(partial: Partial<ProductEntity>) {
    Object.assign(this, partial);
  }

  static validatePrice(orig: any, curr: any): boolean {
    if (typeof curr !== 'number' || isNaN(curr)) return false;
    if (curr <= 0) return false;
    const minPrice = orig * 0.3;
    const maxPrice = orig * 1.5;
    return curr >= minPrice && curr <= maxPrice;
  }

  adjustStock(qty: number, reason: string): boolean {
    if (!reason || reason.trim() === '') return false;
    if (!Number.isInteger(qty)) return false;

    const newStock = this.quantity + qty;
    if (newStock < 0) return false;

    this.quantity = newStock;
    return true;
  }
}
