import { Injectable } from '@nestjs/common';

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

  calculateShippingFee(
    province: string,
    totalWeightKg: number,
    totalItemsValueBeforeVAT: number,
  ): number {
    const rawShippingFee = this.calculateRawShippingFee(
      province,
      totalWeightKg,
    );
    const discount = this.calculateDiscount(
      rawShippingFee,
      totalItemsValueBeforeVAT,
    );

    return rawShippingFee - discount;
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
    return ['Hanoi', 'Ho Chi Minh City'].includes(province);
  }
}
