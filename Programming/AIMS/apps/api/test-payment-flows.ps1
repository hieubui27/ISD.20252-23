# =============================================
# Payment Flow Test Script
# Chạy từng lệnh một để test từng bước
# API: http://localhost:3000/api
# =============================================

# ─── FLOW 1: Tạo thanh toán VietQR ───
# Status sau: PENDING
# Kết quả: paymentUrl + qrCode

Write-Host "=== FLOW 1: Request Payment (VietQR) ===" -ForegroundColor Cyan
$vietqrPayment = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/request" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    orderId       = "TEST-ORDER-001"
    invoiceId     = "TEST-INV-001"
    paymentMethod = "VIETQR"
    amount        = 150000
    customerEmail = "test@example.com"
  } | ConvertTo-Json)

Write-Host "Response:" -ForegroundColor Green
$vietqrPayment | ConvertTo-Json -Depth 5
Write-Host ""

# Lưu transactionId để dùng ở các bước sau
$vietqrTransactionId = $vietqrPayment.transactionId
Write-Host "Transaction ID: $vietqrTransactionId" -ForegroundColor Yellow
Write-Host ""

# ─── FLOW 2: Tạo thanh toán PayPal ───
# Status sau: PENDING
# Kết quả: paymentUrl (PayPal approval link)

Write-Host "=== FLOW 2: Request Payment (PayPal) ===" -ForegroundColor Cyan
$paypalPayment = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/request" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    orderId       = "TEST-ORDER-002"
    invoiceId     = "TEST-INV-002"
    paymentMethod = "PAYPAL"
    amount        = 260000
    customerEmail = "test@example.com"
  } | ConvertTo-Json)

Write-Host "Response:" -ForegroundColor Green
$paypalPayment | ConvertTo-Json -Depth 5
Write-Host ""

$paypalTransactionId = $paypalPayment.transactionId
Write-Host "Transaction ID: $paypalTransactionId" -ForegroundColor Yellow
Write-Host ""

# ─── FLOW 3: Tra cứu transaction ───

Write-Host "=== FLOW 3: Lookup Transaction ===" -ForegroundColor Cyan
$lookup = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/transactions/order/TEST-ORDER-001" `
  -Method GET
Write-Host "VietQR Transaction:" -ForegroundColor Green
$lookup | ConvertTo-Json -Depth 5
Write-Host ""

# ─── FLOW 4: Đổi phương thức VietQR → PayPal ───
# Transaction cũ: FAILED
# Transaction mới: PENDING (PayPal)

Write-Host "=== FLOW 4: Change Payment Method (VietQR -> PayPal) ===" -ForegroundColor Cyan
$changed = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/change-method" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    orderId       = "TEST-ORDER-001"
    invoiceId     = "TEST-INV-001"
    fromMethod    = "VIETQR"
    toMethod      = "PAYPAL"
    customerEmail = "test@example.com"
  } | ConvertTo-Json)

Write-Host "Response:" -ForegroundColor Green
$changed | ConvertTo-Json -Depth 5
Write-Host ""

# ─── FLOW 5: Confirm Payment (thủ công, bỏ qua PayPal capture) ───
# Dùng để test confirm flow khi không có PayPal sandbox
# Lưu ý: Nếu gateway.confirmPayment() gọi PayPal capture thật sẽ lỗi
# → Dùng VietQR request + confirm thủ công để test

Write-Host "=== FLOW 5: Tạo VietQR mới để test confirm ===" -ForegroundColor Cyan
$confirmTest = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/request" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    orderId       = "TEST-ORDER-CONFIRM"
    invoiceId     = "TEST-INV-CONFIRM"
    paymentMethod = "VIETQR"
    amount        = 99000
    customerEmail = "confirm-test@example.com"
  } | ConvertTo-Json)

Write-Host "Created:" -ForegroundColor Green
$confirmTest | ConvertTo-Json -Depth 5
Write-Host ""

# Confirm VietQR (confirmPayment = no-op, nên sẽ thành công)
Write-Host "=== Confirming VietQR transaction ===" -ForegroundColor Cyan
$confirmed = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/confirm" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    orderId              = "TEST-ORDER-CONFIRM"
    invoiceId            = "TEST-INV-CONFIRM"
    transactionId        = "VIETQR-TXN-TEST-001"
    transactionContent   = "AIMS TEST PAYMENT"
    transactionDateTime  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  } | ConvertTo-Json)

Write-Host "Confirmed:" -ForegroundColor Green
$confirmed | ConvertTo-Json -Depth 5
Write-Host ""

# ─── FLOW 6: Giả lập VietQR Callback (test-callback endpoint) ───
# Chỉ hoạt động nếu NODE_ENV !== production

Write-Host "=== FLOW 6: Tạo VietQR payment cho callback test ===" -ForegroundColor Cyan
$callbackTest = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/request" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    orderId       = "TEST-ORDER-CB"
    invoiceId     = "TEST-INV-CB"
    paymentMethod = "VIETQR"
    amount        = 200000
    customerEmail = "callback-test@example.com"
  } | ConvertTo-Json)

Write-Host "Created for callback:" -ForegroundColor Green
$callbackTest | ConvertTo-Json -Depth 5
Write-Host ""

# Tra cứu lại để xem gatewayOrderId và qrContent
$cbLookup = Invoke-RestMethod -Uri "http://localhost:3000/api/payments/transactions/order/TEST-ORDER-CB" `
  -Method GET
Write-Host "Transaction details:" -ForegroundColor Yellow
Write-Host "  gatewayOrderId: $($cbLookup.gatewayOrderId)"
Write-Host "  qrContent:      $($cbLookup.qrContent)"
Write-Host ""

Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Tóm tắt transactions đã tạo:" -ForegroundColor Yellow
Write-Host "  TEST-ORDER-001    : VietQR PENDING → FAILED (đã đổi sang PayPal)"
Write-Host "  TEST-ORDER-001    : PayPal PENDING (sau đổi method)"
Write-Host "  TEST-ORDER-002    : PayPal PENDING"
Write-Host "  TEST-ORDER-CONFIRM: VietQR SUCCESS (đã confirm)"
Write-Host "  TEST-ORDER-CB     : VietQR PENDING (chờ callback)"
