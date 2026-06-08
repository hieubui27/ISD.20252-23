export const getOrderRejectedTemplate = (
  orderId: string,
  customerName: string,
  reason: string,
) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Đơn hàng đã bị từ chối</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 20px auto; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <tr>
            <td style="text-align: center; padding-bottom: 20px;">
                <h2 style="color: #F44336; margin: 0;">Đơn Hàng Bị Từ Chối</h2>
            </td>
        </tr>
        <tr>
            <td style="color: #333333; line-height: 1.6;">
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>Rất tiếc phải thông báo rằng đơn hàng <strong>#${orderId}</strong> của bạn đã bị từ chối.</p>
                <p><strong>Lý do từ chối:</strong></p>
                <blockquote style="background-color: #f9f9f9; padding: 10px; border-left: 4px solid #F44336; margin: 10px 0;">
                    ${reason}
                </blockquote>
                <p>Chúng tôi đang tiến hành các thủ tục hoàn tiền cho đơn hàng của bạn. Số tiền sẽ được hoàn lại qua phương thức thanh toán mà bạn đã sử dụng. Thời gian hoàn tiền tùy thuộc vào quy định của ngân hàng hoặc cổng thanh toán (từ 3 - 7 ngày làm việc).</p>
                <p>Thành thật xin lỗi bạn vì sự bất tiện này.</p>
            </td>
        </tr>
        <tr>
            <td style="text-align: center; padding-top: 30px; color: #888888; font-size: 12px;">
                <p>Đây là email tự động, vui lòng không trả lời.</p>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};
