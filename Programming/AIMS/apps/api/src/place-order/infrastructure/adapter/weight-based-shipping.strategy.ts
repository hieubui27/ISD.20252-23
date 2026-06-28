import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  IShippingFeeCalculator,
  ShippingBreakdown,
  ShippingContext,
} from '../../domain/ports/shipping-fee-calculator.port';
import {
  DEFAULT_SHIPPING_FEE_CONFIG,
  SHIPPING_FEE_CONFIG,
  ShippingFeeConfig,
  ShippingZone,
} from './shipping-fee.config';

@Injectable()
export class WeightBasedShippingStrategy implements IShippingFeeCalculator {
  constructor(
    @Optional()
    @Inject(SHIPPING_FEE_CONFIG)
    private readonly config: ShippingFeeConfig = DEFAULT_SHIPPING_FEE_CONFIG,
  ) {}

  calculate(context: ShippingContext): ShippingBreakdown {
    const totalWeightKg = context.items.reduce(
      (sum, item) => sum + item.weightKg * item.quantity,
      0,
    );

    const zone = this.resolveZone(context.province);
    const rawShippingFee = this.calculateRawShippingFee(zone, totalWeightKg);
    const discount = this.calculateDiscount(
      rawShippingFee,
      context.subtotalBeforeVat,
    );

    return {
      finalShippingFee: Math.max(0, rawShippingFee - discount),
    };
  }

  private resolveZone(province: string): Omit<ShippingZone, 'provinces'> {
    const normalizedProvince = this.normalizeProvinceName(province);

    const matched = this.config.zones.find((zone) =>
      zone.provinces.some(
        (candidate) =>
          this.normalizeProvinceName(candidate) === normalizedProvince,
      ),
    );

    return matched ?? this.config.defaultZone;
  }

  private calculateRawShippingFee(
    zone: Omit<ShippingZone, 'provinces'>,
    totalWeightKg: number,
  ): number {
    if (totalWeightKg <= zone.baseWeightKg) {
      return zone.baseFee;
    }

    const extraWeightKg = totalWeightKg - zone.baseWeightKg;
    const extraBlocks = Math.ceil(
      extraWeightKg / this.config.extraWeightBlockKg,
    );

    return zone.baseFee + extraBlocks * this.config.extraWeightBlockFee;
  }

  private calculateDiscount(
    rawShippingFee: number,
    totalItemsValueBeforeVAT: number,
  ): number {
    if (totalItemsValueBeforeVAT <= this.config.freeShippingThreshold) {
      return 0;
    }

    return Math.min(rawShippingFee, this.config.maxFreeShippingDiscount);
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
