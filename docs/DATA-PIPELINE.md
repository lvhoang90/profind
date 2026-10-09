# Quy trình dựng dữ liệu ProFind

```bash
export OPENALEX_API_KEY=...                  # khóa miễn phí: openalex.org/settings/api (không ghi vào mã nguồn)
npm run d:journals -- ../edufind-khgd        # danh mục tạp chí + quy tắc điểm 28 ngành (data/journals.json, data/sjr-rules.json)
npm run d:inst                               # đơn vị: Wikipedia vi + ROR (data/institutions.json, .review.json)
node scripts/ingest-openalex.mjs --mailto <email> --only <id,id,...> --max-authors 50 --from 2021   # tác giả + công trình (cache ở data/raw/, chạy tiếp được)
node scripts/enrich-authors.mjs --mailto <email>   # quốc gia đơn vị của tác giả -> cờ "có đơn vị ngoài Việt Nam"
npm run d:index                              # chấm điểm, xếp hạng, áp dụng data/corrections.json -> public/data/
npm run d:check                              # kiểm tra nhất quán
```

- `data/raw-authors.json` và `data/raw/` là dữ liệu trung gian (không đưa vào kho). `public/data/` là sản phẩm dựng, được đưa vào kho để triển khai tĩnh.
- **Ngân sách OpenAlex**: khóa miễn phí có hạn mức ~1 USD/ngày, đặt lại lúc 00:00 UTC (07:00 giờ Việt Nam). Nạp thêm đơn vị: `data/ingest-pending.json` liệt kê các đơn vị chưa nạp được; chạy lại `ingest-openalex.mjs` (có cache, chạy tiếp được) rồi `enrich-authors.mjs` (tác giả chưa có quốc gia đơn vị có `foreign: null`, tạm không hiện ở chế độ mặc định "đơn vị tại Việt Nam").
- Bản dựng hiện tại (trước khi bổ sung đợt MOET):  212 đơn vị (39 đơn vị lớn + trường tư thục + viện nghiên cứu có mã ROR), từ 2021, tối đa 50 tác giả/đơn vị -> 6.571 tác giả, 117.906 công trình. Sau khi sửa lỗi mã ROR (xem docs/DESIGN.md) và nhập MOET: 6.876 tác giả, 124.120 công trình, 28.208 công trình có điểm, 212 đơn vị.
- Danh sách chính thức của Bộ GD&ĐT: lưu từng trang của moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc thành HTML, rồi `node scripts/import-moet.mjs trang1.html trang2.html ...` (gắn `moetCode`, `official`; chưa khớp ghi ở data/moet.unmatched.json). Mới có trang STT 201-300.
- Đừng chạy lại `d:inst` khi đã nạp tác giả: ROR trả kết quả khác nhau giữa các lần nên mã đơn vị có thể đổi và làm đứt liên kết tác giả - đơn vị.
- Giới hạn đã biết: OpenAlex thường không đánh dấu tác giả liên hệ (nên điểm có thể thấp hơn thực tế); chưa phân biệt được SCIE/SSCI và kỷ yếu hội nghị; tên tác giả có thể viết tắt; ngành suy từ tạp chí là gần đúng; mỗi đơn vị chỉ lấy 50 tác giả nhiều công trình nhất nên thứ hạng chỉ so sánh trong tập đã nạp.
- Kiểm chứng: 6/6 công trình ngẫu nhiên khớp quy tắc "tác giả chính" khi đối chiếu bản ghi gốc OpenAlex.

## Nhãn "Top 2% thế giới" (Ioannidis et al., Elsevier; CC BY-NC 3.0)
- Nguồn: DOI 10.17632/btchxktzyw.9 (phiên bản 9, tháng 8/2026, công bố 07/10/2026). Trích các dòng quốc gia Việt Nam bằng `scripts/extract-top2.py` từ hai bảng: sự nghiệp (121 dòng, `data/top2/top2-vn-career-2025.json`) và năm 2025 (280 dòng, `data/top2/top2-vn-singleyr-2025.json`); bỏ cột số bài bị rút. Giấy phép riêng: `data/top2/LICENSE-NC.md`. `scripts/match-top2.mjs` khớp theo tên + đơn vị; ca chưa chắc ở `data/top2/review.json`, quyết định tay ở `data/top2/overrides.json`. Nhãn mang `scope` (career hoặc y2025), tự trích dẫn và cờ `inNs` (còn đạt tiêu chí khi loại tự trích dẫn). Hồ sơ mang nhãn KHÔNG còn được miễn quy tắc "liên kết chính ở nước ngoài".
- `node scripts/match-top2.mjs`: khớp theo tập từ của tên + đơn vị -> `data/top2/matches.json`; ca chưa chắc ở `data/top2/review.json`; quyết định tay ở `data/top2/overrides.json`. Hiện gắn 42/94 người (nhiều người là nhà khoa học nước ngoài có đơn vị phụ tại Việt Nam, hoặc chưa nằm trong tập tác giả đã nạp). Sau đó `npm run d:index`.
- Khi có phiên bản mới của bộ dữ liệu (thường tháng 9-10 hằng năm): tải bảng career mới, quét `cntry = vnm`, thay tệp JSON, chạy lại match.
- Việc không có tên trong danh sách không có nghĩa tác giả ít được trích dẫn; giao diện chỉ hiện nhãn cho người có tên, và không dùng danh sách để chấm điểm.

## Ngành và liên ngành của tác giả (xem mục Phương pháp trên trang PRO-SCORE1000™)
- Hai nguồn độc lập: (1) phiếu theo danh mục tạp chí (phần "Ngành của từng tạp chí" trong `scripts/build-index.mjs`; trọng số idf nay lấy căn bậc hai, `DISC_IDF_POW`, mặc định 0,5); (2) chủ đề công trình theo OpenAlex (`scripts/fetch-author-topics.mjs` -> `data/author-topics.json`), quy đổi sang 28 ngành bằng `data/discipline-crosswalk.json` (239 tiểu lĩnh vực; trọng số do người xây dựng đặt theo nội dung, có thể sửa).
- Kết hợp: tỉ trọng = 0,5 × chủ đề + 0,5 × tạp chí (quân sự và an ninh chỉ theo tạp chí); giữ tối đa 3 ngành có tỉ trọng từ 20%. Kết quả trong `profind.json`: `disciplines` (ngành chính trước), `discShares` (% mỗi ngành), `discBasis` (`dong-thuan`, `lien-nganh`, `khac-biet`, `tap-chi`, `chu-de`, `hieu-chinh`). `corrections.setDisciplines` vẫn là đính chính cuối và áp dụng cả cho chấm điểm công trình.
- `scripts/pro-score.mjs`: bách phân vị, trung bình ngành (làm trơn Bayes) và trần trích dẫn được tính theo từng ngành rồi trộn theo `discShares`.
- `data/discipline-review.json`: hồ sơ có hạng mà hai nguồn bất đồng (xem lại, đính chính bằng `setDisciplines`).
- Chạy lại chủ đề: `node scripts/fetch-author-topics.mjs` (xóa `data/author-topics.json` để tải lại toàn bộ). Kiểm định nội bộ: mẫu 180 hồ sơ đọc mù (xem mô tả trong PR), ngành chính khớp 54% -> 70%.
