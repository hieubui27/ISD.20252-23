export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DeliveryInfoValidationInput {
  receiverName?: string;
  phoneNumber?: string;
  province?: string;
  streetAddress?: string;
  shippingInstructions?: string;
}

export interface IDeliveryInfoRule {
  validate(info: DeliveryInfoValidationInput): string | null;
}

export interface IDeliveryInfoValidator {
  validate(info: DeliveryInfoValidationInput): ValidationResult;
}

export const DELIVERY_INFO_VALIDATOR = 'DELIVERY_INFO_VALIDATOR';

const PHONE_NUMBER_DIGIT_COUNT = 10;
const SHIPPING_INSTRUCTIONS_MAX_LENGTH = 200;
const RECEIVER_NAME_LETTERS_ONLY = /^[\p{L}\s]+$/u;
const ALLOWED_SEPARATOR = /[ .-]/g;
const DIGITS_ONLY = /^\d+$/;

function isBlank(value?: string): boolean {
  return !value || value.trim().length === 0;
}

export class ReceiverNameRule implements IDeliveryInfoRule {
  validate(info: DeliveryInfoValidationInput): string | null {
    const name = info.receiverName ?? '';
    if (isBlank(name)) {
      return 'Receiver name is required.';
    }
    if (!RECEIVER_NAME_LETTERS_ONLY.test(name.trim())) {
      return 'Receiver name must contain letters only.';
    }
    return null;
  }
}

export class PhoneNumberRule implements IDeliveryInfoRule {
  validate(info: DeliveryInfoValidationInput): string | null {
    const phone = info.phoneNumber ?? '';
    if (isBlank(phone)) {
      return 'Phone number is required.';
    }
    const separators = new Set(phone.match(ALLOWED_SEPARATOR) ?? []);
    if (separators.size > 1) {
      return 'Phone number must use only one separator type.';
    }
    const digits = phone.replace(ALLOWED_SEPARATOR, '');
    if (
      digits.length !== PHONE_NUMBER_DIGIT_COUNT ||
      !DIGITS_ONLY.test(digits)
    ) {
      return 'Phone number must contain exactly 10 digits.';
    }
    return null;
  }
}

export class ProvinceRule implements IDeliveryInfoRule {
  validate(info: DeliveryInfoValidationInput): string | null {
    return isBlank(info.province) ? 'Province is required.' : null;
  }
}

export class AddressRule implements IDeliveryInfoRule {
  validate(info: DeliveryInfoValidationInput): string | null {
    return isBlank(info.streetAddress) ? 'Delivery address is required.' : null;
  }
}

export class ShippingInstructionsRule implements IDeliveryInfoRule {
  validate(info: DeliveryInfoValidationInput): string | null {
    const value = info.shippingInstructions;
    if (value === undefined || value === null) {
      return null;
    }
    if (Array.from(value).length > SHIPPING_INSTRUCTIONS_MAX_LENGTH) {
      return 'Shipping instructions must not exceed 200 characters.';
    }
    return null;
  }
}

export const DEFAULT_DELIVERY_INFO_RULES: IDeliveryInfoRule[] = [
  new ReceiverNameRule(),
  new PhoneNumberRule(),
  new ProvinceRule(),
  new AddressRule(),
  new ShippingInstructionsRule(),
];

export class DeliveryInfoValidator implements IDeliveryInfoValidator {
  constructor(
    private readonly rules: IDeliveryInfoRule[] = DEFAULT_DELIVERY_INFO_RULES,
  ) {}

  validate(info: DeliveryInfoValidationInput): ValidationResult {
    const errors = this.rules
      .map((rule) => rule.validate(info))
      .filter((error): error is string => error !== null);

    return { valid: errors.length === 0, errors };
  }
}
