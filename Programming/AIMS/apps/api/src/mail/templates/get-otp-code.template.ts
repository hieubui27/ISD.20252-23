export const getOtpCodeTemplate = (
  username: string,
  otp: string,
  expirationTime: string,
) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background: #e63946; color: #ffffff; padding: 30px 20px; text-align: center; } /* Đổi màu header sang đỏ/cam để báo hiệu cảnh báo bảo mật */
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; line-height: 1.6; }
        .otp-container { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; margin: 25px 0; text-align: center; }
        .otp-label { font-size: 14px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .otp-code { font-size: 32px; font-weight: 700; color: #1e293b; letter-spacing: 8px; font-family: monospace; }
        .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px; color: #92400e; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Yêu Cầu Đặt Lại Mật Khẩu</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${username}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên hệ thống AIMS. Dưới đây là mã xác thực (OTP) của bạn:</p>
            
            <div class="otp-container">
                <div class="otp-label">Mã OTP của bạn là</div>
                <div class="otp-code">${otp}</div>
            </div>

            <div class="warning-box">
                <strong>Lưu ý:</strong> Mã này chỉ có hiệu lực trong vòng <strong>${expirationTime}</strong>. Tuyệt đối không chia sẻ mã này với bất kỳ ai, kể cả nhân viên quản trị hệ thống.
            </div>
            
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
            
            <p>Trân trọng,<br><strong>Đội ngũ AIMS</strong></p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AIMS System. All rights reserved.</p>
            <p>Đây là email tự động, vui lòng không phản hồi lại email này.</p>
        </div>
    </div>
</body>
</html>
`;
