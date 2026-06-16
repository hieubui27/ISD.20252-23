/**
 * Strategy pattern – abstraction for shipping fee calculation.
 *
 * Coupling: Data Coupling – callers pass only a plain ShippingContext and
 *   receive a plain ShippingBreakdown. No concrete strategy leaks out.
 * Cohesion: Functional Cohesion – single responsibility: "given a package,
 *   compute its shipping fee".
 *
 * Future requirement #3 (volumetric weight) is satisfied by adding a new
 * implementation of this interface (OCP) instead of editing existing code.
 */
export const SHIPPING_FEE_CALCULATOR = 'SHIPPING_FEE_CALCULATOR';

export interface ShippingPackageItem {
  /** Actual weight of a single unit, in kilograms. */
  weightKg: number;
  quantity: number;
}

export interface ShippingContext {
  province: string;
  subtotalBeforeVat: number;
  items: ShippingPackageItem[];
}

export interface ShippingBreakdown {
  shippingFeeBeforeDiscount: number;
  shippingDiscount: number;
  finalShippingFee: number;
}

export interface IShippingFeeCalculator {
  calculate(context: ShippingContext): ShippingBreakdown;
}
