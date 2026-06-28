export interface ShippingZone {
  name: string;
  provinces: string[];
  baseFee: number;
  baseWeightKg: number;
}

export interface ShippingFeeConfig {
  zones: ShippingZone[];
  defaultZone: Omit<ShippingZone, 'provinces'>;
  extraWeightBlockKg: number;
  extraWeightBlockFee: number;
  freeShippingThreshold: number;
  maxFreeShippingDiscount: number;
}

export const SHIPPING_FEE_CONFIG = 'SHIPPING_FEE_CONFIG';

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
