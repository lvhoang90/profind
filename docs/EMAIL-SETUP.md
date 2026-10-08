# Cấu hình gửi email cho ProFind (Resend + Vercel)

ProFind gửi email ở ba nơi: mã đăng nhập 6 số, thư kết quả xác thực/gỡ hồ sơ, và thư bạn soạn trong **Quản trị → Thư gửi**. Thư đính chính của người dùng gửi về hộp thư của bạn cũng đi qua cùng dịch vụ.

## Vì sao cần làm
Nếu địa chỉ gửi còn là `onboarding@resend.dev` (địa chỉ thử nghiệm của Resend) thì Resend **chỉ gửi được tới email của chủ tài khoản Resend**. Mã đăng nhập và thư gửi tác giả khác sẽ không đến nơi. Cần xác minh một tên miền của bạn trong Resend.

## Bước 1. Xác minh tên miền trong Resend
1. Vào https://resend.com/domains → **Add Domain**. Nhập tên miền bạn quản lý DNS (ví dụ `isavn.edu.vn`, hoặc tên miền con `mail.isavn.edu.vn`). Region chọn gần Việt Nam nhất (Singapore nếu có).
2. Resend hiện một bảng bản ghi DNS (thường gồm 1 bản ghi **MX**, 1 bản ghi **TXT** SPF `v=spf1 include:amazonses.com ~all`, 1 bản ghi **TXT/CNAME** DKIM `resend._domainkey`).
3. Vào nơi quản lý DNS của tên miền (nhà đăng ký tên miền hoặc Cloudflare/VNNIC...), thêm đúng các bản ghi đó, giữ nguyên Name/Value, không thêm dấu cách.
4. Quay lại Resend bấm **Verify DNS Records**. Trạng thái chuyển sang **Verified** (vài phút đến vài giờ).

## Bước 2. Tạo khóa API
Resend → **API Keys** → **Create API Key**, quyền **Sending access**, chọn đúng tên miền vừa xác minh. Sao chép khóa (dạng `re_...`), chỉ hiện một lần.

## Bước 3. Đặt biến môi trường trên Vercel
Vercel → dự án profind → **Settings → Environment Variables** (áp dụng cho **Production**):

| Biến | Giá trị |
|---|---|
| `MAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | khóa `re_...` ở bước 2 |
| `MAIL_FROM` | `ProFind <no-reply@isavn.edu.vn>` (đúng tên miền đã xác minh) |
| `CORRECTION_FROM` | cùng giá trị với `MAIL_FROM` (thư đính chính) |
| `CORRECTION_TO` | hộp thư nhận đính chính (mặc định luongviethoang.hcm@gmail.com) |
| `ADMIN_EMAILS` | email quản trị, ngăn cách bằng dấu phẩy |
| `SESSION_SECRET` | chuỗi ngẫu nhiên dài (tối thiểu 32 ký tự) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | từ Upstash Redis (hoặc `UPSTASH_REDIS_REST_URL/TOKEN`) |

Sau khi lưu, vào **Deployments** → bản mới nhất → **Redeploy** (biến mới chỉ có hiệu lực ở lần triển khai kế tiếp).

## Bước 4. Kiểm tra
1. Mở `https://profind.isavn.edu.vn/#/quan-tri/thu`. Mục **Tình trạng gửi email** phải toàn dấu ✅ (dịch vụ `resend`, địa chỉ gửi không còn `resend.dev`, Redis đã kết nối).
2. Soạn một thư gửi tới **một email khác email Resend của bạn** (ví dụ Gmail phụ) bằng nút **Duyệt và gửi**. Thư phải đến hộp thư (kiểm tra cả Spam lần đầu).
3. Nếu lỗi, thông báo của Resend hiện ngay (ví dụ `403 domain is not verified`: tên miền ở `MAIL_FROM` chưa xác minh hoặc gõ sai).

## Gợi ý chống vào Spam
Thêm bản ghi DMARC: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:luongviethoang.hcm@gmail.com`. Dùng địa chỉ gửi cố định, không dùng Gmail làm `MAIL_FROM`.
