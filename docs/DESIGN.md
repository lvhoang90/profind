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

## 4. Quyết định đã chốt (07/10/2026)
1. **Phạm vi**: Việt Nam trước (tác giả có đơn vị tại Việt Nam); thế giới làm sau, theo đợt.
2. **Quyền riêng tư**: chỉ dùng dữ liệu công khai (OpenAlex, ORCID); có cơ chế đính chính / gỡ hồ sơ; tác giả nhận hồ sơ bằng ORCID (chưa làm, xem mục 6).
3. **Cách tính điểm**: chỉ tính khi là **tác giả chính theo HĐGSNN** = tác giả đứng đầu hoặc tác giả liên hệ; có từ 2 tác giả liên hệ trở lên thì chỉ tính tác giả đứng đầu. Cài ở `ingest-openalex.mjs` (trường `role`, `corr`) và `build-index.mjs` (chỉ `role = lead` mới có điểm). Công trình đồng tác giả vẫn hiện, ghi "Không tính".
4. **Ngành của tác giả**: suy ra từ ngành của các tạp chí họ đã đăng (mọi công trình khớp danh mục), giữ ngành chiếm ≥ 25% (tối đa 3).
5. **Danh sách đơn vị**: lấy từ Bộ GD&ĐT (`moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc`), đối chiếu Wikipedia vi; script `import-institutions.mjs` ghi ra `data/institutions.candidates.json` để duyệt. **Cần mở mạng** cho `moet.gov.vn`, `vi.wikipedia.org`, `api.openalex.org`, `api.ror.org`.
6. **Tên miền**: `profind.isavn.edu.vn`. **Logo**: nhà khoa học đeo kính trong quả cầu tri thức (cùng họ EduFind), nguồn `scripts/lib/brand.mjs`, xuất bằng `npm run d:icons`.

## 5. Ý tưởng mới
- **Đối chiếu ISSN ngược**: từ một tạp chí ở EduFind, xem ai đang đăng ở đó (giúp chọn nơi gửi bài).
- **Hồ sơ xuất chuẩn**: xuất danh mục công trình theo mẫu lý lịch khoa học (CV), có điểm theo năm, dùng nộp hồ sơ xét chức danh GS/PGS.
- **Phát hiện bất thường (tùy chọn, cẩn trọng)**: cảnh báo trùng tên, hồ sơ gộp nhầm, tạp chí ngưng chỉ mục, chỉ để đính chính dữ liệu, không để chấm điểm con người.
- **Mạng đồng tác giả** theo ngành/đơn vị (đồ thị), và biểu đồ năng suất theo năm theo đơn vị.
- **Thẻ nhúng và API tĩnh** (`/data/*.json` CC BY) để Ami, Mây và bên thứ ba dùng lại.

## 6. Việc tiếp theo đề xuất
1. Anh trả lời mục 4. 2. Tôi nạp danh sách đơn vị chính thức + ROR. 3. Chạy `ingest-openalex` thật cho một ngành/đơn vị thí điểm (ví dụ Khoa học Giáo dục) để đo chất lượng khớp ISSN. 4. Chia nhỏ dữ liệu theo đơn vị/ngành khi lớn. 5. Hồ sơ riêng từng tác giả có URL cố định, đính chính, SEO.
