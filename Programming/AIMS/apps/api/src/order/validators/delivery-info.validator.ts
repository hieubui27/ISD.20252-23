import { BadRequestException } from '@nestjs/common';

export class DeliveryInfoValidator {
  private static readonly phoneNumberDigitCount = 10;
  private static readonly shippingInstructionsMaxLength = 200;
  private static readonly receiverNameLettersOnlyPattern = /^[\p{L}\s]+$/u;
  private static readonly allowedSeparatorPattern = /[ -]/g;
  private static readonly normalizedPhoneNumberPattern = /^\d+$/;

  static validateReceiverName(receiverName: string): boolean {
    if (this.isBlank(receiverName)) {
      throw new BadRequestException('Receiver name is required.');
    }

    if (!this.receiverNameLettersOnlyPattern.test(receiverName.trim())) {
      throw new BadRequestException('Receiver name must contain letters only.');
    }

    return true;
  }

  static validatePhoneNumber(phoneNumber: string): boolean {
    if (this.hasMixedSeparators(phoneNumber)) {
      throw new BadRequestException(
        'Phone number must use only one separator type.',
      );
    }

    const normalizedPhoneNumber = this.removeSeparators(phoneNumber);
    if (
      normalizedPhoneNumber.length !== this.phoneNumberDigitCount ||
      !this.normalizedPhoneNumberPattern.test(normalizedPhoneNumber)
    ) {
      throw new BadRequestException(
        'Phone number must contain exactly 10 digits.',
      );
    }

    return true;
  }

  static validateAddress(address: string): boolean {
    if (this.isBlank(address)) {
      throw new BadRequestException('Delivery address is required.');
    }

    return true;
  }

  static validateShippingInstructions(shippingInstructions: string): boolean {
    if (
      Array.from(shippingInstructions).length >
      this.shippingInstructionsMaxLength
    ) {
      throw new BadRequestException(
        'Shipping instructions must not exceed 200 characters.',
      );
    }

    return true;
  }

  private static isBlank(value: string): boolean {
    return value.trim().length === 0;
  }

  private static hasMixedSeparators(phoneNumber: string): boolean {
    return (
      new Set(phoneNumber.match(this.allowedSeparatorPattern) ?? []).size > 1
    );
  }

  private static removeSeparators(phoneNumber: string): string {
    return phoneNumber.replace(this.allowedSeparatorPattern, '');
  }
}
