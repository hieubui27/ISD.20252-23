export function canHardDeleteProduct(product: any): boolean {
  // Logic cốt lõi: Chỉ cho phép xóa cứng khi số lượng bằng 0
  return product.quantity === 0;
}
