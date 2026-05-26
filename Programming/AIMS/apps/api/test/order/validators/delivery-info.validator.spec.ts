import { BadRequestException } from '@nestjs/common';
import { DeliveryInfoValidator } from '../../../src/order/validators/delivery-info.validator';

describe('DeliveryInfoValidator', () => {
  describe('validateReceiverName', () => {
    // UT_PO_001
    it('should reject blank receiver name (UT_PO_001)', () => {
      expect(() => DeliveryInfoValidator.validateReceiverName('')).toThrow(
        BadRequestException,
      );
      expect(() => DeliveryInfoValidator.validateReceiverName('')).toThrow(
        'Receiver name is required.',
      );
    });

    // UT_PO_002
    it('should reject receiver name containing digits (UT_PO_002)', () => {
      expect(() =>
        DeliveryInfoValidator.validateReceiverName('Nguyen Van A1'),
      ).toThrow(BadRequestException);
      expect(() =>
        DeliveryInfoValidator.validateReceiverName('Nguyen Van A1'),
      ).toThrow('Receiver name must contain letters only.');
    });
  });

  describe('validatePhoneNumber', () => {
    // UT_PO_003
    it('should accept phone number with exactly 10 digits (UT_PO_003)', () => {
      expect(DeliveryInfoValidator.validatePhoneNumber('0981413168')).toBe(
        true,
      );
    });

    // UT_PO_004
    it('should accept phone number using one separator type (UT_PO_004)', () => {
      expect(DeliveryInfoValidator.validatePhoneNumber('0981 413 168')).toBe(
        true,
      );
    });

    it('should accept phone number using dot separator', () => {
      expect(DeliveryInfoValidator.validatePhoneNumber('0981.413.168')).toBe(
        true,
      );
    });

    // UT_PO_005
    it('should reject phone number using mixed separators (UT_PO_005)', () => {
      expect(() =>
        DeliveryInfoValidator.validatePhoneNumber('0981 413-168'),
      ).toThrow(BadRequestException);
      expect(() =>
        DeliveryInfoValidator.validatePhoneNumber('0981 413-168'),
      ).toThrow('Phone number must use only one separator type.');
    });

    // UT_PO_006
    it('should reject phone number with fewer than 10 digits (UT_PO_006)', () => {
      expect(() =>
        DeliveryInfoValidator.validatePhoneNumber('098141316'),
      ).toThrow(BadRequestException);
      expect(() =>
        DeliveryInfoValidator.validatePhoneNumber('098141316'),
      ).toThrow('Phone number must contain exactly 10 digits.');
    });
  });

  describe('validateAddress', () => {
    // UT_PO_007
    it('should reject blank delivery address (UT_PO_007)', () => {
      expect(() => DeliveryInfoValidator.validateAddress(' ')).toThrow(
        BadRequestException,
      );
      expect(() => DeliveryInfoValidator.validateAddress(' ')).toThrow(
        'Delivery address is required.',
      );
    });
  });

  describe('validateProvince', () => {
    it('should reject blank province', () => {
      expect(() => DeliveryInfoValidator.validateProvince(' ')).toThrow(
        BadRequestException,
      );
      expect(() => DeliveryInfoValidator.validateProvince(' ')).toThrow(
        'Province is required.',
      );
    });
  });

  describe('validate', () => {
    it('should return valid result for valid delivery information', () => {
      const result = DeliveryInfoValidator.validate({
        receiverName: 'Nguyen Van A',
        phoneNumber: '0981413168',
        province: 'Hanoi',
        streetAddress: '1 Dai Co Viet',
      });

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should collect validation errors', () => {
      const result = DeliveryInfoValidator.validate({
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

  describe('validateShippingInstructions', () => {
    // UT_PO_008
    it('should accept empty shipping instructions (UT_PO_008)', () => {
      expect(DeliveryInfoValidator.validateShippingInstructions('')).toBe(true);
    });

    // UT_PO_009
    it('should accept shipping instructions at 200-character boundary (UT_PO_009)', () => {
      expect(
        DeliveryInfoValidator.validateShippingInstructions('A'.repeat(200)),
      ).toBe(true);
    });

    // UT_PO_010
    it('should reject shipping instructions over 200 characters (UT_PO_010)', () => {
      expect(() =>
        DeliveryInfoValidator.validateShippingInstructions('A'.repeat(201)),
      ).toThrow(BadRequestException);
      expect(() =>
        DeliveryInfoValidator.validateShippingInstructions('A'.repeat(201)),
      ).toThrow('Shipping instructions must not exceed 200 characters.');
    });
  });
});
