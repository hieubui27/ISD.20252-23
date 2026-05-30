import { Injectable } from '@nestjs/common';

/**
 * ============================================================
 * SOLID VIOLATIONS IN ShippingFeeService
 * ============================================================
 *
 * [OCP VIOLATION] – Open/Closed Principle
 * This service implements a single hardcoded shipping fee strategy based
 * purely on actual weight. According to the AIMS additional requirements,
 * a volumetric weight strategy should be supported:
 *   Volumetric weight (kg) = L × W × H / 6000
 *   Chargeable weight = MAX(actual weight, volumetric weight)
 * Adding this new strategy requires modifying calculateShippingFee() and
 * calculateRawShippingFee() directly — violating the "closed for modification"
 * rule.
 *
 * Impact: Every new shipping strategy (express, flat-rate, etc.) forces
 * changes to an existing, tested class, increasing regression risk.
 *
 * Improvement direction:
 *   - Introduce an IShippingFeeStrategy interface:
 *       interface IShippingFeeStrategy {
 *         calculate(province: string, weightKg: number, subtotal: number): number;
 *       }
 *   - Current logic becomes WeightBasedShippingStrategy.
 *   - Add VolumetricWeightShippingStrategy without touching this class.
 *   - ShippingFeeService receives the active strategy via constructor injection.
 *
 * [DIP VIOLATION] – Dependency Inversion Principle
 * PlaceOrderBeService and PlaceOrderModule directly reference the concrete
 * ShippingFeeService class (no interface token). Swapping the shipping
 * algorithm requires changes to both the module providers array and the
 * service constructor — coupling high-level business logic to a specific
 * low-level implementation.
 *
 * Improvement direction:
 *   - Declare an IShippingFeeCalculator interface.
 *   - Register in PlaceOrderModule as:
 *       { provide: SHIPPING_FEE_CALCULATOR, useClass: ShippingFeeService }
 *   - Inject SHIPPING_FEE_CALCULATOR token in PlaceOrderBeService.
 * ============================================================
 */
@Injectable()
export class ShippingFeeService {
  private static readonly majorCityBaseFee = 22000;
  private static readonly otherProvinceBaseFee = 30000;
  private static readonly majorCityBaseWeightKg = 3;
  private static readonly otherProvinceBaseWeightKg = 0.5;
  private static readonly extraWeightBlockKg = 0.5;
  private static readonly extraWeightBlockFee = 2500;
  private static readonly freeShippingThreshold = 100000;
  private static readonly maxFreeShippingDiscount = 25000;
  private static readonly majorCityProvinces = [
    'Hanoi',
    'Ha Noi',
    'Hà Nội',
    'Ho Chi Minh City',
    'Hồ Chí Minh',
    'TP Hồ Chí Minh',
    'TP. Hồ Chí Minh',
  ];

  calculateShippingFee(
    province: string,
    totalWeightKg: number,
    totalItemsValueBeforeVAT: number,
  ): number {
    const rawShippingFee = this.calculateRawShippingFee(
      province,
      totalWeightKg,
    );

    return this.applyFreeShipDiscount(rawShippingFee, totalItemsValueBeforeVAT);
  }

  private applyFreeShipDiscount(
    rawShippingFee: number,
    totalItemsValueBeforeVAT: number,
  ): number {
    const discount = this.calculateDiscount(
      rawShippingFee,
      totalItemsValueBeforeVAT,
    );

    return Math.max(0, rawShippingFee - discount);
  }

  isInnerCity(province: string): boolean {
    return this.isMajorCity(province);
  }

  private calculateRawShippingFee(
    province: string,
    totalWeightKg: number,
  ): number {
    const baseFee = this.isMajorCity(province)
      ? ShippingFeeService.majorCityBaseFee
      : ShippingFeeService.otherProvinceBaseFee;
    const baseWeightKg = this.isMajorCity(province)
      ? ShippingFeeService.majorCityBaseWeightKg
      : ShippingFeeService.otherProvinceBaseWeightKg;

    if (totalWeightKg <= baseWeightKg) {
      return baseFee;
    }

    const extraWeightKg = totalWeightKg - baseWeightKg;
    const extraBlocks = Math.ceil(
      extraWeightKg / ShippingFeeService.extraWeightBlockKg,
    );

    return baseFee + extraBlocks * ShippingFeeService.extraWeightBlockFee;
  }

  private calculateDiscount(
    rawShippingFee: number,
    totalItemsValueBeforeVAT: number,
  ): number {
    if (totalItemsValueBeforeVAT <= ShippingFeeService.freeShippingThreshold) {
      return 0;
    }

    return Math.min(rawShippingFee, ShippingFeeService.maxFreeShippingDiscount);
  }

  private isMajorCity(province: string): boolean {
    const normalizedProvince = province.trim().toLowerCase();

    return ShippingFeeService.majorCityProvinces.some(
      (majorCity) => majorCity.toLowerCase() === normalizedProvince,
    );
  }
}
