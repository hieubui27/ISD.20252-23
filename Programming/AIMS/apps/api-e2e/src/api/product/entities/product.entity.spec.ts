import { ProductEntity } from '../../../../../api/src/product/entities/product.entity';

describe('ProductEntity', () => {
  describe('validatePrice', () => {
    // UT_PM_001
    it('should validate lower price at 30% boundary (UT_PM_001)', () => {
      expect(ProductEntity.validatePrice(200000, 60000)).toBe(true);
    });

    // UT_PM_002
    it('should invalidate price below 30% (UT_PM_002)', () => {
      expect(ProductEntity.validatePrice(200000, 59000)).toBe(false);
    });

    // UT_PM_003
    it('should validate upper price at 150% boundary (UT_PM_003)', () => {
      expect(ProductEntity.validatePrice(100000, 150000)).toBe(true);
    });

    // UT_PM_004
    it('should invalidate price above 150% (UT_PM_004)', () => {
      expect(ProductEntity.validatePrice(100000, 150100)).toBe(false);
    });

    // UT_PM_005
    it('should invalidate price that is negative or zero (UT_PM_005)', () => {
      expect(ProductEntity.validatePrice(100000, -10000)).toBe(false);
      expect(ProductEntity.validatePrice(100000, 0)).toBe(false);
    });

    // UT_PM_006
    it('should validate price in the middle of allowed range (UT_PM_006)', () => {
      expect(ProductEntity.validatePrice(100000, 80000)).toBe(true);
    });

    // UT_PM_007
    it('should invalidate non-numeric price (UT_PM_007)', () => {
      expect(ProductEntity.validatePrice(100000, 'abc' as any)).toBe(false);
    });
  });

  describe('adjustStock', () => {
    let product: ProductEntity;

    beforeEach(() => {
      product = new ProductEntity({ quantity: 15 });
    });

    // UT_PM_012
    it('should update stock with valid reason (UT_PM_012)', () => {
      expect(product.adjustStock(-5, 'Hỏng')).toBe(true);
      expect(product.quantity).toBe(10);
    });

    // UT_PM_013
    it('should fail to update stock without reason (UT_PM_013)', () => {
      expect(product.adjustStock(10, '')).toBe(false);
      expect(product.quantity).toBe(15);
    });

    // UT_PM_014
    it('should fail if stock becomes negative (UT_PM_014)', () => {
      product.quantity = 5;
      expect(product.adjustStock(-10, 'Hỏng')).toBe(false);
      expect(product.quantity).toBe(5);
    });

    // UT_PM_015
    it('should fail if quantity is non-integer (UT_PM_015)', () => {
      expect(product.adjustStock(1.5, 'Nhập thêm')).toBe(false);
      expect(product.quantity).toBe(15);
    });
  });
});
