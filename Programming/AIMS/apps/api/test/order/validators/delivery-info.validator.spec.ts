import {
  AddressRule,
  DeliveryInfoValidator,
  PhoneNumberRule,
  ProvinceRule,
  ReceiverNameRule,
  ShippingInstructionsRule,
} from '../../../src/place-order/domain/validators/delivery-info.validator';

describe('Delivery info validation rules', () => {
  describe('ReceiverNameRule', () => {
    const rule = new ReceiverNameRule();

    // UT_PO_001
    it('should reject blank receiver name (UT_PO_001)', () => {
      expect(rule.validate({ receiverName: '' })).toBe(
        'Receiver name is required.',
      );
    });

    // UT_PO_002
    it('should reject receiver name containing digits (UT_PO_002)', () => {
      expect(rule.validate({ receiverName: 'Nguyen Van A1' })).toBe(
        'Receiver name must contain letters only.',
      );
    });

    it('should accept a valid receiver name', () => {
      expect(rule.validate({ receiverName: 'Nguyen Van A' })).toBeNull();
    });
  });

  describe('PhoneNumberRule', () => {
    const rule = new PhoneNumberRule();

    // UT_PO_003
    it('should accept phone number with exactly 10 digits (UT_PO_003)', () => {
      expect(rule.validate({ phoneNumber: '0981413168' })).toBeNull();
    });

    // UT_PO_004
    it('should accept phone number using one separator type (UT_PO_004)', () => {
      expect(rule.validate({ phoneNumber: '0981 413 168' })).toBeNull();
    });

    it('should accept phone number using dot separator', () => {
      expect(rule.validate({ phoneNumber: '0981.413.168' })).toBeNull();
    });

    // UT_PO_005
    it('should reject phone number using mixed separators (UT_PO_005)', () => {
      expect(rule.validate({ phoneNumber: '0981 413-168' })).toBe(
        'Phone number must use only one separator type.',
      );
    });

    // UT_PO_006
    it('should reject phone number with fewer than 10 digits (UT_PO_006)', () => {
      expect(rule.validate({ phoneNumber: '098141316' })).toBe(
        'Phone number must contain exactly 10 digits.',
      );
    });
  });

  describe('AddressRule', () => {
    // UT_PO_007
    it('should reject blank delivery address (UT_PO_007)', () => {
      expect(new AddressRule().validate({ streetAddress: ' ' })).toBe(
        'Delivery address is required.',
      );
    });
  });

  describe('ProvinceRule', () => {
    it('should reject blank province', () => {
      expect(new ProvinceRule().validate({ province: ' ' })).toBe(
        'Province is required.',
      );
    });
  });

  describe('ShippingInstructionsRule', () => {
    const rule = new ShippingInstructionsRule();

    // UT_PO_008
    it('should accept empty shipping instructions (UT_PO_008)', () => {
      expect(rule.validate({ shippingInstructions: '' })).toBeNull();
    });

    // UT_PO_009
    it('should accept shipping instructions at 200-character boundary (UT_PO_009)', () => {
      expect(
        rule.validate({ shippingInstructions: 'A'.repeat(200) }),
      ).toBeNull();
    });

    // UT_PO_010
    it('should reject shipping instructions over 200 characters (UT_PO_010)', () => {
      expect(rule.validate({ shippingInstructions: 'A'.repeat(201) })).toBe(
        'Shipping instructions must not exceed 200 characters.',
      );
    });
  });

  describe('DeliveryInfoValidator (aggregate)', () => {
    const validator = new DeliveryInfoValidator();

    it('should return valid result for valid delivery information', () => {
      const result = validator.validate({
        receiverName: 'Nguyen Van A',
        phoneNumber: '0981413168',
        province: 'Hanoi',
        streetAddress: '1 Dai Co Viet',
      });

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should collect validation errors in field order', () => {
      const result = validator.validate({
        receiverName: 'Nguyen Van A1',
        phoneNumber: '0981 413-168',
        province: '',
        streetAddress: '',
        shippingInstructions: 'A'.repeat(201),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        'Receiver name must contain letters only.',
        'Phone number must use only one separator type.',
        'Province is required.',
        'Delivery address is required.',
        'Shipping instructions must not exceed 200 characters.',
      ]);
    });
  });
});
