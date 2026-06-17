import { WeightBasedShippingStrategy } from '../../src/place-order/infrastructure/adapter/weight-based-shipping.strategy';

describe('WeightBasedShippingStrategy', () => {
  let strategy: WeightBasedShippingStrategy;

  beforeEach(() => {
    strategy = new WeightBasedShippingStrategy();
  });

  // Helper: single-line shipping fee for a given province / weight / item value.
  const fee = (province: string, weightKg: number, subtotal: number): number =>
    strategy.calculate({
      province,
      subtotalBeforeVat: subtotal,
      items: [{ weightKg, quantity: 1 }],
    }).finalShippingFee;

  describe('calculate (UT_PO_011 to UT_PO_016)', () => {
    // UT_PO_011
    it('should calculate base shipping fee for Hanoi/HCMC within first 3kg (UT_PO_011)', () => {
      expect(fee('Hanoi', 3.0, 90000)).toBe(22000);
    });

    // UT_PO_012
    it('should calculate base shipping fee for other provinces (UT_PO_012)', () => {
      expect(fee('Da Nang', 0.5, 90000)).toBe(30000);
    });

    // UT_PO_013
    it('should calculate extra weight fee for other provinces (UT_PO_013)', () => {
      expect(fee('Da Nang', 1.0, 90000)).toBe(32500);
    });

    // UT_PO_014
    it('should calculate extra weight fee for Hanoi/HCMC orders over 3kg (UT_PO_014)', () => {
      expect(fee('Ho Chi Minh City', 3.5, 90000)).toBe(24500);
    });

    // UT_PO_015
    it('should apply free-shipping discount when total item value exceeds 100,000 VND (UT_PO_015)', () => {
      expect(fee('Hanoi', 3.0, 120000)).toBe(0);
    });

    // UT_PO_016
    it('should limit free-shipping discount to maximum 25,000 VND (UT_PO_016)', () => {
      expect(fee('Da Nang', 6.0, 200000)).toBe(32500);
    });

    it('should support Vietnamese major city names with diacritics', () => {
      expect(fee('Hà Nội', 3.0, 90000)).toBe(22000);
      expect(fee('Hồ Chí Minh', 3.0, 90000)).toBe(22000);
    });

    it('should never return a negative shipping fee', () => {
      expect(fee('Hanoi', 1.0, 200000)).toBe(0);
    });

    it('should sum the weight across multiple items and quantities', () => {
      const result = strategy.calculate({
        province: 'Da Nang',
        subtotalBeforeVat: 90000,
        items: [
          { weightKg: 0.25, quantity: 2 }, // 0.5kg
          { weightKg: 0.5, quantity: 1 }, // 0.5kg -> total 1.0kg
        ],
      });

      expect(result.finalShippingFee).toBe(32500);
    });
  });
});
