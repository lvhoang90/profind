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
- Bản dựng thật đầu tiên: 39 đơn vị lớn, từ 2021, tối đa 50 tác giả/đơn vị (có thể trùng nhau giữa đơn vị) -> 1.740 tác giả, 71.233 công trình, 17.123 công trình có điểm.
- Giới hạn đã biết: OpenAlex thường không đánh dấu tác giả liên hệ (nên điểm có thể thấp hơn thực tế); chưa phân biệt được SCIE/SSCI và kỷ yếu hội nghị; tên tác giả có thể viết tắt; ngành suy từ tạp chí là gần đúng; mỗi đơn vị chỉ lấy 50 tác giả nhiều công trình nhất nên thứ hạng chỉ so sánh trong tập đã nạp.
- Kiểm chứng: 6/6 công trình ngẫu nhiên khớp quy tắc "tác giả chính" khi đối chiếu bản ghi gốc OpenAlex.
