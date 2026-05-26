export class InvoiceItemDto {
  productId: number;
  title?: string;
  price: number;
  quantity: number;
  amount: number;
  weight?: number;
}

export class InvoicePreviewDto {
  items: InvoiceItemDto[];
  subtotalBeforeVat: number;
  vatAmount: number;
  subtotalAfterVat: number;
  deliveryFee: number;
  totalAmount: number;
}
