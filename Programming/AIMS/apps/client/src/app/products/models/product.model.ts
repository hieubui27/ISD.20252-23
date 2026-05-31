export interface Product {
  id: string;
  barcode: string;
  category: string;
  title: string;
  description: string;
  weight: number | string;
  currentPrice: number | string;
  quantity: number;
  status: string;
  imageUrl: string;
}

export interface ProductSelection {
  productId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}
