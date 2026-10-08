# Cấu hình gửi email cho ProFind (Resend + Vercel)

ProFind gửi email ở ba nơi: mã đăng nhập 6 số, thư kết quả xác thực/gỡ hồ sơ, và thư bạn soạn trong **Quản trị → Thư gửi**. Thư đính chính của người dùng gửi về hộp thư của bạn cũng đi qua cùng dịch vụ.

## Cấu hình hiện hành (đã chạy, kiểm tra ngày 08/10/2026)
- Dịch vụ: **Resend**, tên miền gửi đã xác minh: **`isavietnam.app`**.
- Địa chỉ gửi: `ProFind <no-reply@isavietnam.app>`.
- Tab **Quản trị → Thư gửi** hiện ✅ cho dịch vụ gửi thư, địa chỉ gửi, Redis (Upstash), `SESSION_SECRET` và `ADMIN_EMAILS`.
- Cần đặt thêm `CORRECTION_FROM` bằng cùng giá trị với `MAIL_FROM` (xem bảng bên dưới). Nếu biến này còn trống thì thư đính chính gửi về hộp thư của bạn đi bằng địa chỉ thử nghiệm `onboarding@resend.dev`.

## Vì sao phải dùng tên miền đã xác minh
Địa chỉ `onboarding@resend.dev` là địa chỉ thử nghiệm của Resend, **chỉ gửi được tới email của chủ tài khoản Resend**. Mã đăng nhập và thư gửi tác giả khác sẽ không đến nơi. Vì vậy `MAIL_FROM` phải thuộc một tên miền đã xác minh trong Resend.

## Biến môi trường trên Vercel
Vercel → dự án profind → **Settings → Environment Variables** (áp dụng cho **Production**):

| Biến | Giá trị hiện hành / ví dụ |
|---|---|
| `MAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | khóa `re_...` tạo ở Resend → API Keys (quyền **Sending access**, chọn đúng tên miền) |
| `MAIL_FROM` | `ProFind <no-reply@isavietnam.app>` |
| `CORRECTION_FROM` | `ProFind <no-reply@isavietnam.app>` (cùng giá trị với `MAIL_FROM`) |
| `CORRECTION_TO` | hộp thư nhận đính chính (mặc định luongviethoang.hcm@gmail.com) |
| `ADMIN_EMAILS` | email quản trị, ngăn cách bằng dấu phẩy |
| `SESSION_SECRET` | chuỗi ngẫu nhiên dài (tối thiểu 32 ký tự) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | từ Upstash Redis (hoặc `UPSTASH_REDIS_REST_URL/TOKEN`) |

Sau khi lưu hoặc sửa biến, vào **Deployments** → bản mới nhất → **Redeploy** (biến mới chỉ có hiệu lực ở lần triển khai kế tiếp).

## Kiểm tra
1. Mở `https://profind.isavn.edu.vn/#/quan-tri/thu`. Mục **Tình trạng gửi email** phải toàn dấu ✅ (dịch vụ `resend`, địa chỉ gửi không còn `resend.dev`, Redis đã kết nối).
2. Soạn một thư gửi tới **một email khác email Resend của bạn** (ví dụ Gmail phụ) bằng nút **Duyệt và gửi**. Thư phải đến hộp thư (kiểm tra cả Spam lần đầu).
3. Thử đăng ký tài khoản bằng một email khác để chắc mã đăng nhập 6 số đến nơi.
4. Nếu lỗi, thông báo của Resend hiện ngay (ví dụ `403 domain is not verified`: tên miền ở `MAIL_FROM` chưa xác minh hoặc gõ sai).

## Tùy chọn: gửi từ tên miền `isavn.edu.vn`
Không bắt buộc. Gửi từ `isavietnam.app` đã hoạt động bình thường. Chỉ làm bước này nếu muốn địa chỉ gửi trùng tên miền website (`no-reply@isavn.edu.vn`).

1. Vào https://resend.com/domains → **Add Domain**, nhập `isavn.edu.vn`.
2. Nhờ người quản lý DNS (tên miền đang đặt trên Cloudflare) thêm 3 bản ghi Resend hiển thị, chép nguyên giá trị Content:

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | TXT | `resend._domainkey` | giá trị bắt đầu bằng `p=MIGfMA…` | không áp dụng |
   | CNAME | `rsend` | giá trị `rsend-ap…mta.net` | **DNS only** (tắt đám mây cam) |
   | CNAME | `send` | giá trị `send.for…mta.net` | **DNS only** (tắt đám mây cam) |

   Hai bản ghi CNAME phải để **DNS only**, nếu để Proxied thì Resend không xác minh được. Có thể bấm **Auto configure** trên trang Resend để tự thêm qua Cloudflare.
3. Bấm **Verify DNS Records**, chờ trạng thái **Verified** (vài phút đến vài giờ).
4. Đổi `MAIL_FROM` và `CORRECTION_FROM` trên Vercel thành `ProFind <no-reply@isavn.edu.vn>`, tạo lại khóa API nếu khóa cũ chỉ cấp cho `isavietnam.app`, rồi **Redeploy** và kiểm tra lại như trên.

## Gợi ý chống vào Spam
Thêm bản ghi DMARC cho tên miền gửi: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:luongviethoang.hcm@gmail.com`. Dùng địa chỉ gửi cố định, không dùng Gmail làm `MAIL_FROM`.
