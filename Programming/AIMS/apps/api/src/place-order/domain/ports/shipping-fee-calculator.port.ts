export const SHIPPING_FEE_CALCULATOR = 'SHIPPING_FEE_CALCULATOR';

export interface ShippingPackageItem {
  weightKg: number;
  quantity: number;
}

export interface ShippingContext {
  province: string;
  subtotalBeforeVat: number;
  items: ShippingPackageItem[];
}

export interface ShippingBreakdown {
  finalShippingFee: number;
}

export interface IShippingFeeCalculator {
  calculate(context: ShippingContext): ShippingBreakdown;
}
