/**
 * Configuration (DATA, not logic) for the weight-based shipping strategy.
 *
 * OCP: the fee algorithm in WeightBasedShippingStrategy is "closed" – it never
 * needs editing. To add/adjust a city or a whole pricing zone you only extend
 * the DATA here (or override this token per environment). No control-flow,
 * no `if (province === ...)` ever leaks into the algorithm.
 *
 * 👉 To add a major city: append its name(s) to the matching zone's `provinces`.
 * 👉 To add a brand-new pricing zone: push a new ShippingZone object onto `zones`.
 */

/** A pricing zone: a set of provinces that share one base fee + base weight. */
export interface ShippingZone {
  name: string;
  /** Province names belonging to this zone (matched case/diacritic-insensitive). */
  provinces: string[];
  /** Flat fee charged up to `baseWeightKg`. */
  baseFee: number;
  baseWeightKg: number;
}

export interface ShippingFeeConfig {
  /** Zones are tried in order; the first whose province list matches wins. */
  zones: ShippingZone[];
  /** Fallback used when no zone matches the province. */
  defaultZone: Omit<ShippingZone, 'provinces'>;
  /** Each extra weight block beyond a zone's base weight. */
  extraWeightBlockKg: number;
  extraWeightBlockFee: number;
  /** Free-ship discount kicks in only above this item value (before VAT). */
  freeShippingThreshold: number;
  maxFreeShippingDiscount: number;
}

/** DI token so the config can be swapped per environment without code changes. */
export const SHIPPING_FEE_CONFIG = 'SHIPPING_FEE_CONFIG';

/**
 * The current AIMS shipping policy (shipping is VAT-free):
 *  - Major cities (Ha Noi / HCMC): 22,000 VND for the first 3 kg.
 *  - Other provinces: 30,000 VND for the first 0.5 kg.
 *  - +2,500 VND per extra 0.5 kg block.
 *  - Free-ship discount up to 25,000 VND when item value exceeds 100,000 VND.
 */
export const DEFAULT_SHIPPING_FEE_CONFIG: ShippingFeeConfig = {
  zones: [
    {
      name: 'Major cities',
      provinces: [
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
      ],
      baseFee: 22000,
      baseWeightKg: 3,
    },
  ],
  defaultZone: { name: 'Other provinces', baseFee: 30000, baseWeightKg: 0.5 },
  extraWeightBlockKg: 0.5,
  extraWeightBlockFee: 2500,
  freeShippingThreshold: 100000,
  maxFreeShippingDiscount: 25000,
};
