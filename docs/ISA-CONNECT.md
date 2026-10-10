# ISA Connect: nhận người dùng từ Mây và EduFind

Người đã có tài khoản Mây hoặc EduFind (đã xác thực email) có thể sang ProFind mà không nhập mã OTP lần nữa. Một khoá `ISA_CONNECT_SECRET` dùng chung cho cả ba ứng dụng.

- `POST /api/account?op=connect {t}`: `t` là mã `v1.<base64url(JSON)>.<hex HMAC-SHA256>` do Mây ký bằng `ISA_CONNECT_SECRET`. Kiểm tra chữ ký, hạn (≤ 10 phút, `exp`), `jti` dùng một lần (`profind:cj:<jti>`, SET NX). Chưa có tài khoản thì tạo (cần số điện thoại di động hợp lệ và `cs: true`, ghi `via: "isa-connect"`, `regReason: "eco"`, không bật thư tiếp thị); đã có thì chỉ đăng nhập. Đặt cookie phiên như `verify`. Trả `{ user, isNew, authorId }`.
- `GET /api/account?op=link-status&e=&ts=&sig=`: Mây hỏi trạng thái; `sig = HMAC-SHA256("ls:"+email+":"+ts)`, ±5 phút. Trả `{ registered, verified, authorId, pending }`.
- Giao diện: `#/ket-noi?t=<mã>` (`src/Connect.tsx`) xóa mã khỏi thanh địa chỉ, gọi `connect`, rồi chuyển tới `#/tai-khoan/nhan-dien` với hồ sơ gợi ý chọn sẵn (`sessionStorage profind.sgpick`). Chọn sẵn KHÔNG cấp xác thực: vẫn qua `claim-submit` và `_claim.js`.
- Biến môi trường `ISA_CONNECT_SECRET` (≥ 16 ký tự, cùng giá trị với Mây). Chưa đặt: hai op trả 503.
- Thử nhanh: `npx esbuild api/account.js --bundle --format=esm --platform=node --outfile=/tmp/h.mjs && HANDLER=/tmp/h.mjs node test/connect.test.mjs`.
- Trường trong mã: `e` email, `n` họ tên, `ph` số di động (bắt buộc khi tạo mới), `cs` đồng ý (`true`), `lg` ngôn ngữ, `a` mã hồ sơ gợi ý, `o` đơn vị, `j` công việc, `src` ứng dụng ký (`may` mặc định, `edufind`), `exp`, `jti`. Tài khoản đã có: chỉ điền họ tên/đơn vị/công việc vào ô còn trống. `user.link.from` ghi nguồn; số liệu `profind:all:evt:<ngày>` trường `connect_may`, `connect_edufind`.
- EduFind: thẻ "Hồ sơ nhà khoa học của bạn trên ProFind" ở Không gian của tôi (so khớp trong trình duyệt bằng `data/suggest.json`, cùng thuật toán `src/Suggest.tsx`), bấm "Đúng là tôi" → `#/ket-noi?t=<mã>&from=edufind`. Thiếu số điện thoại thì EduFind hỏi ngay trên thẻ trước khi chuyển.
