# Vận hành bảo vệ dữ liệu cá nhân (Luật 91/2025/QH15)

Bên kiểm soát: **Viện Khoa học Giáo dục và Kinh tế Đông Nam Á (Viện ISA)**. Thông tin đăng ký doanh nghiệp (mã số thuế, địa chỉ, người đại diện) lưu nội bộ, không đăng công khai.
Tài liệu này là quy trình nội bộ; chưa thay thế ý kiến luật sư. Các nghị định hướng dẫn (thời hạn, ngưỡng "số lượng lớn", mẫu hồ sơ đánh giá tác động) cần đối chiếu khi ban hành.

## 1. Yêu cầu của chủ thể dữ liệu (Điều 4, 10, 13, 14)
| Loại yêu cầu | Cách nhận | Xử lý | Thời hạn mục tiêu |
|---|---|---|---|
| Xác thực "Đây là tôi" | Form đính chính (đăng nhập email tổ chức) | Tab Quản trị → Xác thực, tự kiểm tra rồi duyệt | 72 giờ làm việc |
| Ẩn điểm và huy hiệu | Form (loại "Ẩn điểm…") hoặc Hồ sơ khoa học của người đã xác thực | Duyệt → ẩn ngay (`profind:hs`) | 72 giờ làm việc; người đã xác thực tự áp dụng ngay |
| Gỡ / tạm ẩn hồ sơ | Form (loại "Gỡ hồ sơ") hoặc email | Kiểm tra danh tính → duyệt → ẩn ngay (`profind:hp`); lần dựng dữ liệu kế tiếp thêm vào `data/corrections.json` (mục `remove`) | 72 giờ làm việc |
| Sửa dữ liệu | Form "Đính chính" | Sửa `data/corrections.json` hoặc hướng dẫn sửa tại OpenAlex/ORCID | 15 ngày |
| Xem / xuất / xóa tài khoản | Không gian của tôi (tải, xóa) | Tự động | Ngay |

Xác minh danh tính: email tổ chức đã nhập mã + ORCID trùng hồ sơ OpenAlex + tên khớp. Email miễn phí chỉ khi quản trị viên chấp nhận riêng (thư đề nghị, xác nhận qua ORCID hoặc người đứng đầu đơn vị). Mọi yêu cầu lưu trong Redis `profind:cl`, thư gửi lưu `profind:mlog` (tối đa 24 tháng).

## 2. Sự cố lộ, mất dữ liệu (Điều 23): trong 72 giờ
1. Phát hiện → ghi giờ phát hiện, phạm vi (dữ liệu nào, bao nhiêu người), nguyên nhân sơ bộ.
2. Khóa: đổi `SESSION_SECRET`, `RESEND_API_KEY`, token Upstash nếu nghi lộ; thu hồi phiên.
3. Thông báo cơ quan chuyên trách bảo vệ dữ liệu cá nhân (Bộ Công an) chậm nhất 72 giờ kể từ khi phát hiện, kèm biên bản xác nhận.
4. Thông báo người bị ảnh hưởng qua email; hướng dẫn biện pháp.
5. Lập biên bản, khắc phục, rà soát biện pháp.

## 3. Nhà cung cấp hạ tầng có máy chủ ngoài Việt Nam (Điều 20)
Vercel (hosting), Upstash (Redis: tài khoản, yêu cầu), Resend (email), cộng nguồn dữ liệu công khai OpenAlex, Crossref, Semantic Scholar, OpenCitations, ORCID. Cần luật sư xác nhận có phải lập hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới trong 60 ngày hay không.

## 4. Hồ sơ đánh giá tác động xử lý dữ liệu (Điều 21, 22)
Cần xác định Viện ISA có thuộc diện được miễn theo Điều 38 (doanh nghiệp nhỏ, khởi nghiệp, hộ kinh doanh) không, và ProFind có bị coi là xử lý dữ liệu của "số lượng lớn" chủ thể không (hiện khoảng 16.500 hồ sơ). Chờ ý kiến luật sư.

## 5. Phân loại rủi ro xử lý tự động (Điều 30.4)
PRO-SCORE1000™: dữ liệu công bố công khai, không dữ liệu nhạy cảm, không hiệu lực pháp lý; khuyến cáo không dùng làm tiêu chí duy nhất; có quyền ẩn điểm. Mức rủi ro: **thấp**. Xem lại khi thay đổi thuật toán hoặc dùng cho mục đích khác.

## 6. Đồng ý theo mục đích (Điều 9, 28)
Đăng ký tài khoản (bắt buộc) và nhận thư giới thiệu công cụ ISA (tùy chọn, mặc định không chọn) là hai ô riêng. Thư chào mừng chỉ gửi khi người dùng chọn nhận.
