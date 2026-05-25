export const getInvitationEmailTemplate = (
  username: string,
  password: string,
  loginLink: string,
) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background: #4f46e5; color: #ffffff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; line-height: 1.6; }
        .credentials { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .cred-item { margin-bottom: 10px; font-size: 16px; }
        .cred-item strong { color: #475569; display: inline-block; width: 120px; }
        .cred-item code { background: #e2e8f0; padding: 4px 8px; border-radius: 4px; color: #0f172a; font-family: monospace; font-size: 16px; font-weight: 600;}
        .button-container { text-align: center; margin: 30px 0; }
        .button { background-color: #4f46e5; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; transition: background-color 0.3s; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Chào mừng bạn đến với AIMS</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>${username}</strong>,</p>
            <p>Tài khoản của bạn đã được quản trị viên tạo thành công trên hệ thống AIMS. Dưới đây là thông tin đăng nhập của bạn:</p>
            
            <div class="credentials">
                <div class="cred-item"><strong>Tên đăng nhập:</strong> <code>${username}</code></div>
                <div class="cred-item"><strong>Mật khẩu:</strong> <code>${password}</code></div>
            </div>

            <p>Vui lòng truy cập hệ thống bằng nút bên dưới. Bạn nên đổi mật khẩu ngay trong lần đăng nhập đầu tiên để bảo đảm an toàn cho tài khoản.</p>
            
            <div class="button-container">
                <a href="${loginLink}" class="button" style="color: #ffffff;">Đăng nhập hệ thống</a>
            </div>
            
            <p>Nếu bạn có yêu cầu hoặc thắc mắc gì, vui lòng liên hệ với bộ phận hỗ trợ IT.</p>
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
