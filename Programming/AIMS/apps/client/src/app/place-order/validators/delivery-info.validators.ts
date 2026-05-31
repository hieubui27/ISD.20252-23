import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { PROVINCE_PLACEHOLDER } from '../constants/vietnam-provinces';

export type DeliveryInfoField =
  | 'receiverName'
  | 'phoneNumber'
  | 'email'
  | 'streetAddress'
  | 'province'
  | 'postalCode'
  | 'shippingInstructions';

export const SHIPPING_INSTRUCTIONS_MAX_LENGTH = 200;

const PHONE_NUMBER_DIGIT_COUNT = 10;
const RECEIVER_NAME_LETTERS_ONLY_PATTERN = /^[\p{L}\s]+$/u;
const ALLOWED_SEPARATOR_PATTERN = /[ .-]/g;
const NORMALIZED_PHONE_NUMBER_PATTERN = /^\d+$/;

const REQUIRED_MESSAGES: Record<DeliveryInfoField, string> = {
  receiverName: 'Receiver name is required.',
  phoneNumber: 'Phone number is required.',
  email: 'Email is required to create order.',
  streetAddress: 'Delivery address is required.',
  province: 'Province is required.',
  postalCode: 'Postal / Zip Code is invalid.',
  shippingInstructions: 'Shipping instructions are invalid.',
};

export function notBlankValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    return control.value?.trim().length ? null : { blank: true };
  };
}

export function receiverNameLettersOnlyValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value ?? '';
    if (!value.trim()) return null;

    return RECEIVER_NAME_LETTERS_ONLY_PATTERN.test(value.trim())
      ? null
      : { lettersOnly: true };
  };
}

export function phoneNumberValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value ?? '';
    if (!value.trim()) return null;

    const separators = value.match(ALLOWED_SEPARATOR_PATTERN) ?? [];
    if (new Set(separators).size > 1) {
      return { mixedSeparators: true };
    }

    const normalizedPhoneNumber = value.replace(ALLOWED_SEPARATOR_PATTERN, '');

    if (
      normalizedPhoneNumber.length !== PHONE_NUMBER_DIGIT_COUNT ||
      !NORMALIZED_PHONE_NUMBER_PATTERN.test(normalizedPhoneNumber)
    ) {
      return { phoneDigits: true };
    }

    return null;
  };
}

export function provinceValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value ?? '';
    return value.trim() && value !== PROVINCE_PLACEHOLDER
      ? null
      : { required: true };
  };
}

export function deliveryInfoFieldError(
  field: DeliveryInfoField,
  errors: ValidationErrors | null,
): string {
  if (!errors) return '';

  if (errors['required'] || errors['blank']) {
    return REQUIRED_MESSAGES[field];
  }

  if (errors['lettersOnly']) {
    return 'Receiver name must contain letters only.';
  }

  if (errors['mixedSeparators']) {
    return 'Phone number must use only one separator type.';
  }

  if (errors['phoneDigits']) {
    return 'Phone number must contain exactly 10 digits.';
  }

  if (errors['email']) {
    return 'Please enter a valid email address.';
  }

  if (errors['maxlength']) {
    return 'Shipping instructions must not exceed 200 characters.';
  }

  return 'Invalid value.';
}
