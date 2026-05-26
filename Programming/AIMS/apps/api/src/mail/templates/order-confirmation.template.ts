interface OrderConfirmationItem {
  title?: string;
  productId: number;
  quantity: number;
  price: number;
  amount: number;
}

interface OrderConfirmationInvoice {
  items: OrderConfirmationItem[];
  subtotalBeforeVat: number;
  vatAmount: number;
  deliveryFee: number;
}

interface OrderConfirmationSuccess {
  customerName: string;
  streetAddress: string;
  province: string;
  phoneNumber: string;
  totalAmount: number;
  transactionId: string;
  transactionContent: string;
  transactionDate: Date;
}

export const getOrderConfirmationEmailTemplate = (
  successDto: OrderConfirmationSuccess,
  invoicePreview: OrderConfirmationInvoice,
): string => {
  const itemRows = invoicePreview.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 8px;border:1px solid #ddd">${item.title ?? item.productId}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${item.price.toLocaleString('vi-VN')} VND</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${item.amount.toLocaleString('vi-VN')} VND</td>
        </tr>`,
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#333">
      <h2 style="color:#1a73e8">Xác nhận đơn hàng AIMS</h2>
      <p>Xin chào <strong>${successDto.customerName}</strong>,</p>
      <p>Đơn hàng của bạn đã được đặt thành công. Dưới đây là thông tin chi tiết:</p>

      <h3>Thông tin giao hàng</h3>
      <p>
        Địa chỉ: ${successDto.streetAddress}, ${successDto.province}<br/>
        Số điện thoại: ${successDto.phoneNumber}
      </p>

      <h3>Danh sách sản phẩm</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Sản phẩm</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">SL</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Đơn giá</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <table style="margin-top:12px;font-size:14px;margin-left:auto">
        <tr>
          <td style="padding:4px 12px">Tạm tính (chưa VAT):</td>
          <td style="padding:4px 12px;text-align:right">${invoicePreview.subtotalBeforeVat.toLocaleString('vi-VN')} VND</td>
        </tr>
        <tr>
          <td style="padding:4px 12px">VAT (10%):</td>
          <td style="padding:4px 12px;text-align:right">${invoicePreview.vatAmount.toLocaleString('vi-VN')} VND</td>
        </tr>
        <tr>
          <td style="padding:4px 12px">Phí vận chuyển:</td>
          <td style="padding:4px 12px;text-align:right">${invoicePreview.deliveryFee.toLocaleString('vi-VN')} VND</td>
        </tr>
        <tr style="font-weight:bold;font-size:15px">
          <td style="padding:8px 12px;border-top:2px solid #333">Tổng thanh toán:</td>
          <td style="padding:8px 12px;border-top:2px solid #333;text-align:right">${successDto.totalAmount.toLocaleString('vi-VN')} VND</td>
        </tr>
      </table>

      <h3>Thông tin giao dịch</h3>
      <p>
        Mã giao dịch: <strong>${successDto.transactionId}</strong><br/>
        Nội dung: ${successDto.transactionContent}<br/>
        Thời gian: ${successDto.transactionDate.toLocaleString('vi-VN')}
      </p>

      <p style="color:#666;font-size:13px">
        Đơn hàng đang chờ xác nhận từ nhân viên AIMS. Chúng tôi sẽ thông báo khi đơn hàng được duyệt.
      </p>
    </div>
  `;
};
