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
}
