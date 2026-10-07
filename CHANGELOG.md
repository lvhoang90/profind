# Changelog

## Chưa phát hành
- Tài khoản người dùng (email + số điện thoại, mã xác thực), Không gian của tôi (tác giả đã lưu, tìm kiếm đã lưu, đã xem, hồ sơ), trang quản trị với đo lường truy cập, hệ sinh thái ISA, nội dung và người dùng; điểm chạm sang EduFind, Ami, Mây.
- Nút giao diện sáng/tối/theo hệ thống; chân trang mới; bộ lọc lưu trong đường dẫn.
- Số trích dẫn là số của hồ sơ OpenAlex toàn thời gian (trước đây chỉ cộng các công trình từ 2016); thêm chỉ số h.
- Nạp thêm công trình không có ISSN (sách, chương sách, kỷ yếu).

## v1.0.0 (07/10/2026)

Bản thử nghiệm đầu tiên của **ProFind**: danh bạ nhà nghiên cứu Việt Nam, thuộc hệ sinh thái ISA (EduFind, Ami, Mây). Web: https://profind.isavn.edu.vn

### Có gì trong bản này
- **12.626 tác giả, 206.181 công trình** từ OpenAlex (CC0), 342 đơn vị (trường đại học, học viện, viện nghiên cứu), sắp xếp theo 28 ngành của EduFind (suy ra từ tạp chí đã đăng).
- Tìm theo tên (khớp trọn từ, có dấu hoặc không dấu), ORCID, tên tạp chí, ISSN; lọc theo ngành, loại đơn vị, đơn vị (chọn từ danh sách), phạm vi Việt Nam hoặc tất cả.
- Bảng sắp xếp được theo mọi cột, phân trang 25 kết quả; trang tác giả có liên kết từng bài tới DOI (hoặc OpenAlex), tải CSV.
- **Điểm tham khảo theo quy tắc HĐGSNN**: chỉ tính cho tác giả chính (đứng đầu, hoặc tác giả liên hệ duy nhất); tạp chí trong nước theo năm đăng, Scopus theo hạng Q và quy tắc từng ngành. Thứ hạng chỉ để tham khảo.
- Nhãn **Top 2% thế giới** cho 57 người (Ioannidis et al./Elsevier, CC BY-NC 3.0, dùng phi thương mại).
- Biểu mẫu xác nhận hồ sơ, đính chính, gỡ hồ sơ và đề nghị bổ sung nhà nghiên cứu.
- Song ngữ Việt/Anh, sáng/tối theo hệ thống, dùng được trên điện thoại; SEO và ảnh chia sẻ (Open Graph).
- Mã nguồn mở MIT; dữ liệu dự án CC BY 4.0 (riêng trường `top2` theo CC BY-NC 3.0).

### Giới hạn đã biết của bản Beta
- Điểm thường **thấp hơn thực tế**: OpenAlex thiếu thông tin tác giả liên hệ; chưa xác định được SCIE/SSCI và kỷ yếu hội nghị.
- Còn hồ sơ trùng của cùng một người (khoảng 877 cặp) và một số đơn vị trùng/ghi nhầm; mỗi đơn vị mới nạp tối đa 50 người nhiều bài nhất cộng 40 người nhiều trích dẫn nhất, nên có người chưa có tên (có thể đề nghị bổ sung trên web).
- Chỉ lấy công trình từ 2016 và có ISSN; sách, kỷ yếu không ISSN chưa tính.
- Chưa kiểm thử Safari, Firefox và thiết bị thật; bộ lọc chưa lưu trong đường dẫn.
- Việc gỡ hồ sơ xác minh thủ công qua email, chưa có CAPTCHA.

### Quyền riêng tư
Chỉ dùng dữ liệu công khai. Nhà nghiên cứu có thể xác nhận, đính chính hoặc yêu cầu gỡ hồ sơ trên web.

Góp ý và báo lỗi: luongviethoang.hcm@gmail.com hoặc tạo issue trên GitHub.
