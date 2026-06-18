import { IProductSpecification } from './product-specification.interface';

export class PriceRatioSpecification implements IProductSpecification {
  isSatisfiedBy(productData: any): boolean {
    const currentPrice = Number(productData.currentPrice);
    const originalValue = Number(productData.originalValue);

    // If values are not valid numbers, we skip validation (let DTO validation handle it)
    if (isNaN(currentPrice) || isNaN(originalValue)) {
      return true;
    }

    if (originalValue === 0) {
      return currentPrice === 0;
    }

    return (
      currentPrice >= 0.3 * originalValue && currentPrice <= 1.5 * originalValue
    );
  }

  getMessage(): string {
    return 'Giá bán hiện tại phải nằm trong khoảng từ 30% đến 150% giá trị gốc. (Hoặc phải bằng 0 nếu giá trị gốc bằng 0).';
  }
}
