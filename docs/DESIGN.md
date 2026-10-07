# ProFind: thiết kế, quyết định và câu hỏi mở

## 1. Kiến trúc (kế thừa EduFind)
- **Cùng công nghệ**: Vite + React + TypeScript, trang tĩnh, dữ liệu dựng sẵn bằng script (không máy chủ, không CSDL ở giai đoạn đầu). Cùng font (Inter, Space Grotesk), bảng màu, đầu trang cực quang, VI/EN, tối/sáng.
- **Nối chéo ISA**: chân trang "Hệ sinh thái" (ProFind → EduFind → Ami); khóa ngôn ngữ `edufind.lang` dùng chung; mỗi công trình có liên kết `edufind.isavn.edu.vn/<ngành>/?q=<ISSN>` để xem điểm tạp chí. Bước sau: EduFind thêm liên kết ngược "Tác giả đã đăng ở tạp chí này" sang ProFind.
- **Đường dẫn đề xuất**: `profind.isavn.edu.vn` (hoặc `isavn.edu.vn/profind`), cùng cơ chế Vercel và bộ đếm truy cập như EduFind.

## 2. Luồng dữ liệu
| Bước | Script | Nguồn | Ghi chú |
|---|---|---|---|
| Danh mục tạp chí + điểm theo năm | `import-edufind.mjs` | EduFind (HĐGSNN) | 1.574 tạp chí / 28 ngành, đã chạy thật |
| Đơn vị | (cần viết) `import-institutions.mjs` | Bộ GD&ĐT, Bộ KH&CN, ROR | Hiện chỉ là bản gieo 15 đơn vị |
| Tác giả, công trình | `ingest-openalex.mjs` | OpenAlex (CC0) | Chưa chạy thử với API thật (môi trường dựng không ra được Internet) |
| Danh tính | ORCID (bước sau) | ORCID public API | ORCID là khóa xác nhận một người |
| Điểm, thứ hạng | `build-index.mjs` | tính từ trên | Điểm = mức tối đa của tạp chí theo năm đăng |

## 3. Nguyên tắc minh bạch
- Mỗi con số truy được về nguồn: công trình → ISSN → tạp chí HĐGSNN → ngành/năm. Công trình không khớp được tạp chí thì **không tính điểm** (hiển thị "Không có trong danh mục"), không đoán.
- Hiển thị tỷ lệ công trình khớp danh mục trên hồ sơ để người đọc biết độ phủ.
- Dữ liệu mẫu có cờ `demo` và băng rôn cảnh báo; không trộn với dữ liệu thật.

## 4. Câu hỏi cần anh quyết định
1. **Phạm vi tác giả**: chỉ những người có đơn vị tại Việt Nam (đề xuất, nhẹ hơn nhiều), hay cả tác giả thế giới? Nếu cả thế giới nên theo từng đợt (theo ngành/đơn vị) vì hàng chục triệu hồ sơ.
2. **Quyền riêng tư (quan trọng)**: hồ sơ công khai theo tên người thật cần cơ chế đính chính/gỡ. Đề xuất: chỉ dùng dữ liệu công khai (OpenAlex/ORCID), có nút "Đây là tôi / báo sai / gỡ hồ sơ", ghi nhật ký thay đổi. Anh đồng ý hướng này, và có muốn tác giả "nhận hồ sơ" bằng đăng nhập ORCID không?
3. **Cách tính điểm**: hiện là tổng mức tối đa của tạp chí, chưa chia theo vai trò tác giả (quy tắc "tác giả chính" của HĐGSNN nằm trong `authorRule` của EduFind) và chưa chia cho số tác giả. Anh muốn: (a) tổng tối đa như hiện tại, (b) chỉ tính khi là tác giả chính, (c) chia đều theo số tác giả?
4. **Ngành của tác giả**: suy ra từ ngành của các tạp chí họ đã đăng (đề xuất, minh bạch), hay từ chủ đề OpenAlex? Một ISSN có thể thuộc nhiều ngành.
5. **Danh sách đơn vị chính thức**: anh có sẵn file danh sách (Bộ GD&ĐT, các viện, bộ, sở) không? Nếu có, gửi tôi để nạp thay bản gieo. Nếu chưa, tôi sẽ lấy từ trang Bộ và ROR.
6. **Tên miền và thương hiệu**: `profind.isavn.edu.vn`? Logo hiện là tạm, cần thống nhất với bộ nhận diện ISA.

## 5. Ý tưởng mới
- **Đối chiếu ISSN ngược**: từ một tạp chí ở EduFind, xem ai đang đăng ở đó (giúp chọn nơi gửi bài).
- **Hồ sơ xuất chuẩn**: xuất danh mục công trình theo mẫu lý lịch khoa học (CV), có điểm theo năm, dùng nộp hồ sơ xét chức danh GS/PGS.
- **Phát hiện bất thường (tùy chọn, cẩn trọng)**: cảnh báo trùng tên, hồ sơ gộp nhầm, tạp chí ngưng chỉ mục, chỉ để đính chính dữ liệu, không để chấm điểm con người.
- **Mạng đồng tác giả** theo ngành/đơn vị (đồ thị), và biểu đồ năng suất theo năm theo đơn vị.
- **Thẻ nhúng và API tĩnh** (`/data/*.json` CC BY) để Ami, Mây và bên thứ ba dùng lại.

## 6. Việc tiếp theo đề xuất
1. Anh trả lời mục 4. 2. Tôi nạp danh sách đơn vị chính thức + ROR. 3. Chạy `ingest-openalex` thật cho một ngành/đơn vị thí điểm (ví dụ Khoa học Giáo dục) để đo chất lượng khớp ISSN. 4. Chia nhỏ dữ liệu theo đơn vị/ngành khi lớn. 5. Hồ sơ riêng từng tác giả có URL cố định, đính chính, SEO.
