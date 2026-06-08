export const getOrderApprovedTemplate = (
  orderId: string,
  customerName: string,
) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Đơn hàng đã được duyệt</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 20px auto; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <tr>
            <td style="text-align: center; padding-bottom: 20px;">
                <h2 style="color: #4CAF50; margin: 0;">Đơn Hàng Được Duyệt</h2>
            </td>
        </tr>
        <tr>
            <td style="color: #333333; line-height: 1.6;">
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>Đơn hàng <strong>#${orderId}</strong> của bạn đã được quản lý phê duyệt thành công.</p>
                <p>Chúng tôi đang tiến hành chuẩn bị hàng và sẽ sớm giao đến bạn. Cảm ơn bạn đã tin tưởng và mua sắm tại AIMS!</p>
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
