# Đưa ProFind lên profind.isavn.edu.vn (Vercel)

ProFind là trang tĩnh (Vite) + một hàm Edge (`api/correction.js`). Triển khai giống EduFind: kho GitHub nối với Vercel, đẩy lên `main` là tự build.

## 1. Gộp nhánh vào main
Hiện mọi thứ ở nhánh `claude/determined-wozniak-igffaa` của `lvhoang90/profind`. Mở Pull request nhánh này vào `main`, xem lại, rồi Merge (hoặc nhờ Claude mở PR giúp). Vercel sẽ triển khai bản production từ `main`.

## 2. Tạo dự án Vercel
1. Vercel → **Add New → Project** → chọn kho `lvhoang90/profind` (cần cấp quyền cho Vercel đọc kho này ở GitHub nếu chưa).
2. Cài đặt (Vercel tự nhận Vite, giữ nguyên):
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: để trống
3. **Environment Variables** (Production và Preview):
   - `RESEND_API_KEY`: dùng lại khóa của EduFind (Team Settings → Environment Variables → liên kết biến chia sẻ vào dự án mới).
   - `CORRECTION_TO` (tùy chọn): email nhận yêu cầu đính chính; mặc định `luongviethoang.hcm@gmail.com`.
   - `CORRECTION_FROM` (tùy chọn): địa chỉ gửi đã xác minh ở Resend, ví dụ `ProFind <no-reply@isavn.edu.vn>`. Nếu bỏ trống, Resend chỉ gửi được tới email chủ tài khoản Resend.
   - Redis giới hạn 5 yêu cầu/giờ/người: tab **Storage** của dự án → kết nối Upstash đang dùng cho EduFind (tự thêm `KV_REST_API_URL`, `KV_REST_API_TOKEN`).
   - KHÔNG đặt `OPENALEX_API_KEY` ở Vercel: khóa đó chỉ dùng trên máy khi nạp dữ liệu, không cần khi build.
4. **Deploy.** Mở địa chỉ tạm `*.vercel.app` để kiểm tra trước khi gắn tên miền. Thử: tìm một tác giả, mở hồ sơ, gửi thử một yêu cầu ở trang đính chính (phải nhận được email).

## 3. Gắn tên miền profind.isavn.edu.vn
1. Dự án → **Settings → Domains → Add** → nhập `profind.isavn.edu.vn`.
2. Vào nơi quản lý DNS của `isavn.edu.vn` (nhà đăng ký tên miền, hoặc Vercel DNS nếu đã đổi nameserver cho isavn.edu.vn), tạo bản ghi:

   | Loại | Tên | Giá trị |
   |---|---|---|
   | CNAME | `profind` | `cname.vercel-dns.com` |

   Nếu Vercel hiển thị giá trị khác thì làm theo giá trị Vercel hiển thị. Nếu isavn.edu.vn đã dùng nameserver của Vercel thì không cần làm gì thêm.
3. Chờ vài phút đến vài giờ. Khi Domains báo **Valid Configuration**, Vercel tự cấp HTTPS. Mở `https://profind.isavn.edu.vn/`.
4. Bật **Analytics** và **Speed Insights** ở dự án (giống EduFind).

## 4. Nối vào hệ sinh thái ISA
- EduFind, Ami, Mây: thêm ProFind vào khối "Hệ sinh thái ISA" ở chân trang của từng ứng dụng (ProFind đã có khối này, trỏ sang EduFind và Ami).
- Cổng `isavn.edu.vn/go/<app>?from=...` đo hành trình giữa các công cụ: thêm `profind` vào bảng định tuyến của cổng đó (kho chứa `isavn.edu.vn`).

## 5. Cập nhật dữ liệu về sau
Chạy trên máy (có Internet và `OPENALEX_API_KEY`): xem `docs/DATA-PIPELINE.md`; cuối cùng `npm run d:index`, `npm run d:check`, commit `public/data/` và đẩy lên `main`.
Giới hạn cần để ý: Vercel giới hạn số tệp mỗi lần triển khai (khoảng 15.000 tệp tĩnh); hiện ~6.700 tệp công trình theo tác giả. Khi dữ liệu vượt ~10.000 tác giả, gộp tệp theo đơn vị hoặc chuyển sang Vercel Blob.

## 6. Trước khi công bố rộng
- Xác nhận email nhận yêu cầu đính chính hoạt động (bước 2.4) và có người trực xử lý (gỡ hồ sơ phải được thực hiện).
- Đọc lại băng rôn và điều khoản: "thứ hạng chỉ để tham khảo", nguồn dữ liệu, giấy phép (đã có ở chân trang).
- Gửi trước cho một vài tác giả để họ xem hồ sơ và thử luồng xác nhận / đính chính.
