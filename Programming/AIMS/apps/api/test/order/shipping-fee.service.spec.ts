import { ShippingFeeService } from '../../src/shared/utils/shipping-fee.service';

describe('ShippingFeeService', () => {
  let service: ShippingFeeService;

  beforeEach(() => {
    service = new ShippingFeeService();
  });

  describe('calculateShippingFee (UT_PO_011 to UT_PO_016)', () => {
    // UT_PO_011
    it('should calculate base shipping fee for Hanoi/HCMC within first 3kg (UT_PO_011)', () => {
      const result = service.calculateShippingFee('Hanoi', 3.0, 90000);

      expect(result).toBe(22000);
    });

    // UT_PO_012
    it('should calculate base shipping fee for other provinces (UT_PO_012)', () => {
      const result = service.calculateShippingFee('Da Nang', 0.5, 90000);

      expect(result).toBe(30000);
    });

    // UT_PO_013
    it('should calculate extra weight fee for other provinces (UT_PO_013)', () => {
      const result = service.calculateShippingFee('Da Nang', 1.0, 90000);

      expect(result).toBe(32500);
    });

    // UT_PO_014
    it('should calculate extra weight fee for Hanoi/HCMC orders over 3kg (UT_PO_014)', () => {
      const result = service.calculateShippingFee(
        'Ho Chi Minh City',
        3.5,
        90000,
      );

      expect(result).toBe(24500);
    });

    // UT_PO_015
    it('should apply free-shipping discount when total item value exceeds 100,000 VND (UT_PO_015)', () => {
      const result = service.calculateShippingFee('Hanoi', 3.0, 120000);

      expect(result).toBe(0);
    });

    // UT_PO_016
    it('should limit free-shipping discount to maximum 25,000 VND (UT_PO_016)', () => {
      const result = service.calculateShippingFee('Da Nang', 6.0, 200000);

      expect(result).toBe(32500);
    });

    it('should support Vietnamese major city names', () => {
      const result = service.calculateShippingFee('Hà Nội', 3.0, 90000);

      expect(result).toBe(22000);
    });

    it('should support real Vietnamese major city names with diacritics', () => {
      expect(service.calculateShippingFee('Hà Nội', 3.0, 90000)).toBe(22000);
      expect(service.calculateShippingFee('Hồ Chí Minh', 3.0, 90000)).toBe(
        22000,
      );
    });

    it('should never return a negative shipping fee', () => {
      const result = service.calculateShippingFee('Hanoi', 1.0, 200000);

      expect(result).toBe(0);
    });

    it('should keep VAT calculation outside shipping fee calculation', () => {
      const subtotalBeforeVat = 90000;
      const shippingFee = service.calculateShippingFee(
        'Hanoi',
        3.0,
        subtotalBeforeVat,
      );
      const vatAmount = subtotalBeforeVat * 0.1;

      expect(shippingFee).toBe(22000);
      expect(vatAmount).toBe(9000);
    });
  });
});
