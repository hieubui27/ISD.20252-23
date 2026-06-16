import { Injectable } from '@nestjs/common';
import {
  IShippingFeeCalculator,
  ShippingBreakdown,
  ShippingContext,
} from '../../domain/ports/shipping-fee-calculator.port';

/**
 * Concrete Strategy – the current AIMS rule: fee based on total ACTUAL weight.
 *
 * Tiers (shipping is VAT-free):
 *  - Ha Noi / HCMC: 22,000 VND for the first 3 kg.
 *  - Other provinces: 30,000 VND for the first 0.5 kg.
 *  - +2,500 VND per extra 0.5 kg block.
 *  - Free-ship discount up to 25,000 VND when item value exceeds 100,000 VND.
 *
 * Adding another rule (e.g. volumetric weight) = a new IShippingFeeCalculator
 * implementation, without touching this class (OCP).
 */
@Injectable()
export class WeightBasedShippingStrategy implements IShippingFeeCalculator {
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
    'Ho Chi Minh',
    'TP Ho Chi Minh',
    'TP HCM',
    'HCM',
    'Hồ Chí Minh',
    'TP Hồ Chí Minh',
    'TP. Hồ Chí Minh',
  ];

  calculate(context: ShippingContext): ShippingBreakdown {
    const totalWeightKg = context.items.reduce(
      (sum, item) => sum + item.weightKg * item.quantity,
      0,
    );

    const rawShippingFee = this.calculateRawShippingFee(
      context.province,
      totalWeightKg,
    );
    const discount = this.calculateDiscount(
      rawShippingFee,
      context.subtotalBeforeVat,
    );

    return {
      shippingFeeBeforeDiscount: rawShippingFee,
      shippingDiscount: discount,
      finalShippingFee: Math.max(0, rawShippingFee - discount),
    };
  }

  private calculateRawShippingFee(
    province: string,
    totalWeightKg: number,
  ): number {
    const isMajorCity = this.isMajorCity(province);
    const baseFee = isMajorCity
      ? WeightBasedShippingStrategy.majorCityBaseFee
      : WeightBasedShippingStrategy.otherProvinceBaseFee;
    const baseWeightKg = isMajorCity
      ? WeightBasedShippingStrategy.majorCityBaseWeightKg
      : WeightBasedShippingStrategy.otherProvinceBaseWeightKg;

    if (totalWeightKg <= baseWeightKg) {
      return baseFee;
    }

    const extraWeightKg = totalWeightKg - baseWeightKg;
    const extraBlocks = Math.ceil(
      extraWeightKg / WeightBasedShippingStrategy.extraWeightBlockKg,
    );

    return (
      baseFee + extraBlocks * WeightBasedShippingStrategy.extraWeightBlockFee
    );
  }

  private calculateDiscount(
    rawShippingFee: number,
    totalItemsValueBeforeVAT: number,
  ): number {
    if (
      totalItemsValueBeforeVAT <=
      WeightBasedShippingStrategy.freeShippingThreshold
    ) {
      return 0;
    }

    return Math.min(
      rawShippingFee,
      WeightBasedShippingStrategy.maxFreeShippingDiscount,
    );
  }

  private isMajorCity(province: string): boolean {
    const normalizedProvince = this.normalizeProvinceName(province);

    return WeightBasedShippingStrategy.majorCityProvinces.some(
      (majorCity) =>
        this.normalizeProvinceName(majorCity) === normalizedProvince,
    );
  }

  private normalizeProvinceName(province: string): string {
    return province
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }
}
