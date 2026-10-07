# ProFind

> **Phiên bản 1.0.0**: dữ liệu và điểm còn đang hoàn thiện, chỉ để tham khảo. Xem [CHANGELOG](CHANGELOG.md) và mục [Giới hạn đã biết](CHANGELOG.md#giới-hạn-đã-biết-của-bản-beta).

Ứng dụng tra cứu **nhà nghiên cứu gắn với các trường, viện Việt Nam** (không phân biệt quốc tịch), thuộc hệ sinh thái ISA (cùng họ với EduFind, Ami, Mây). Dữ liệu đồng bộ, minh bạch, có nguồn.
Tác giả xếp theo **ngành** (28 ngành của EduFind), **đơn vị** (trường đại học công/tư, viện, bộ, sở), **công trình** (năm, tạp chí, ISSN, số trích dẫn, điểm tham khảo theo danh mục HĐGSNN).
Có thứ hạng theo số bài và tổng điểm, **chỉ để tham khảo, không có ý nghĩa xếp hạng chính thức**.

## Chạy nhanh

```bash
npm install
npm run d:journals -- ../edufind-khgd   # gộp danh mục tạp chí của 28 ngành EduFind -> data/journals.json (1.574 tạp chí, 686 ISSN)
npm run d:demo                          # (tùy chọn) dữ liệu MẪU hư cấu để chạy thử giao diện, thay cho dữ liệu thật
npm run d:index                         # tính điểm, thứ hạng -> public/data/profind.json
npm run dev                             # http://localhost:5173
```

Dữ liệu thật: điền mã ROR vào `data/institutions.json`, rồi `node scripts/ingest-openalex.mjs --mailto <email>` (cần Internet) và `npm run d:index`.
Trạng thái: **0.3**. Dữ liệu thật từ OpenAlex: ~6.900 tác giả, ~122.000 công trình, 212 đơn vị (từ 2021, tối đa 50 tác giả/đơn vị; còn nhiều đơn vị chờ nạp, xem `data/ingest-pending.json`). Hạn chế đã biết và các lỗi mở: xem [`docs/QA-2026-10-07.md`](docs/QA-2026-10-07.md); thiết kế: [`docs/DESIGN.md`](docs/DESIGN.md); triển khai: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Giấy phép

© 2026 Luong Viet Hoang (ISA Vietnam), bản quyền thuộc về tác giả, mã nguồn mở. Mã nguồn MIT (`LICENSE`); nội dung và bộ dữ liệu do dự án biên soạn CC BY 4.0 (`LICENSE-CONTENT.md`); dữ liệu bên thứ ba theo điều khoản của nguồn.
