# Cấu hình gửi email cho ProFind (Resend + Vercel)

ProFind gửi email ở ba nơi: mã đăng nhập 6 số, thư kết quả xác thực/gỡ hồ sơ, và thư bạn soạn trong **Quản trị → Thư gửi**. Thư đính chính của người dùng gửi về hộp thư của bạn cũng đi qua cùng dịch vụ.

## Cấu hình hiện hành (đã chuyển ngày 08/10/2026)
- Dịch vụ: **Resend**, tên miền gửi đã xác minh: **`isavn.edu.vn`** (cùng tên miền website). Tên miền `isavietnam.app` vẫn còn xác minh trên Resend và dùng được làm phương án dự phòng.
- Địa chỉ gửi: `ProFind <no-reply@isavn.edu.vn>` (đặt ở cả `MAIL_FROM` và `CORRECTION_FROM`).
- Thư đính chính của người dùng về hộp thư `vienisavietnam@gmail.com` (`CORRECTION_TO`).
- Tab **Quản trị → Thư gửi** hiện ✅ cho dịch vụ gửi thư, địa chỉ gửi, Redis (Upstash), `SESSION_SECRET` và `ADMIN_EMAILS`; thư thử gửi tới email khác đã đến nơi.
- Bản ghi DNS của `isavn.edu.vn` (do quản lý DNS thêm trên Cloudflare): TXT `resend._domainkey`, CNAME `rsend`, CNAME `send` (đều DNS only). Nên thêm DMARC (xem cuối tài liệu).

## Vì sao phải dùng tên miền đã xác minh
Địa chỉ `onboarding@resend.dev` là địa chỉ thử nghiệm của Resend, **chỉ gửi được tới email của chủ tài khoản Resend**. Mã đăng nhập và thư gửi tác giả khác sẽ không đến nơi. Vì vậy `MAIL_FROM` phải thuộc một tên miền đã xác minh trong Resend.

## Biến môi trường trên Vercel
Vercel → dự án profind → **Settings → Environment Variables** (áp dụng cho **Production**):

| Biến | Giá trị hiện hành / ví dụ |
|---|---|
| `MAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | khóa `re_...` tạo ở Resend → API Keys (quyền **Sending access**, chọn đúng tên miền) |
| `MAIL_FROM` | `ProFind <no-reply@isavn.edu.vn>` |
| `CORRECTION_FROM` | `ProFind <no-reply@isavn.edu.vn>` (cùng giá trị với `MAIL_FROM`) |
| `CORRECTION_TO` | hộp thư nhận đính chính (mặc định vienisavietnam@gmail.com) |
| `ADMIN_EMAILS` | email quản trị, ngăn cách bằng dấu phẩy |
| `SESSION_SECRET` | chuỗi ngẫu nhiên dài (tối thiểu 32 ký tự) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | từ Upstash Redis (hoặc `UPSTASH_REDIS_REST_URL/TOKEN`) |

Sau khi lưu hoặc sửa biến, vào **Deployments** → bản mới nhất → **Redeploy** (biến mới chỉ có hiệu lực ở lần triển khai kế tiếp).

## Kiểm tra
1. Mở `https://profind.isavn.edu.vn/#/quan-tri/thu`. Mục **Tình trạng gửi email** phải toàn dấu ✅ (dịch vụ `resend`, địa chỉ gửi không còn `resend.dev`, Redis đã kết nối).
2. Soạn một thư gửi tới **một email khác email Resend của bạn** (ví dụ Gmail phụ) bằng nút **Duyệt và gửi**. Thư phải đến hộp thư (kiểm tra cả Spam lần đầu).
3. Thử đăng ký tài khoản bằng một email khác để chắc mã đăng nhập 6 số đến nơi.
4. Nếu lỗi, thông báo của Resend hiện ngay (ví dụ `403 domain is not verified`: tên miền ở `MAIL_FROM` chưa xác minh hoặc gõ sai).

## Thêm một tên miền gửi khác (tham khảo, đã làm cho `isavn.edu.vn`)
1. Vào https://resend.com/domains → **Add Domain**, nhập tên miền cần dùng.
2. Nhờ người quản lý DNS (tên miền đặt trên Cloudflare) thêm 3 bản ghi Resend hiển thị, chép nguyên giá trị Content:

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | TXT | `resend._domainkey` | giá trị bắt đầu bằng `p=MIGfMA…` | không áp dụng |
   | CNAME | `rsend` | giá trị `rsend-ap…mta.net` | **DNS only** (tắt đám mây cam) |
   | CNAME | `send` | giá trị `send.for…mta.net` | **DNS only** (tắt đám mây cam) |

   Hai bản ghi CNAME phải để **DNS only**, nếu để Proxied thì Resend không xác minh được. Có thể bấm **Auto configure** trên trang Resend để tự thêm qua Cloudflare.
3. Bấm **Verify DNS Records**, chờ trạng thái **Verified** (vài phút đến vài giờ).
4. Nếu khóa API chỉ cấp cho một tên miền khác, tạo khóa mới quyền **Sending access** cho tên miền này.
5. Đổi `MAIL_FROM`, `CORRECTION_FROM` (và `RESEND_API_KEY` nếu có khóa mới) trên Vercel, **Redeploy**, rồi kiểm tra như phần "Kiểm tra".

## Gợi ý chống vào Spam
Thêm bản ghi DMARC cho tên miền gửi: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:vienisavietnam@gmail.com` (đặt trên tên miền đang gửi, hiện `isavn.edu.vn`). Dùng địa chỉ gửi cố định, không dùng Gmail làm `MAIL_FROM`.
