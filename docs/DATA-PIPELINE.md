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
