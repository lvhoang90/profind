# ProFind

Ứng dụng tra cứu **tác giả, nhà nghiên cứu** Việt Nam và thế giới, thuộc hệ sinh thái ISA (cùng họ với EduFind, Ami, Mây). Dữ liệu đồng bộ, minh bạch, có nguồn.
Tác giả xếp theo **ngành** (28 ngành của EduFind), **đơn vị** (trường đại học công/tư, viện, bộ, sở), **công trình** (năm, tạp chí, ISSN, số trích dẫn, điểm tham khảo theo danh mục HĐGSNN).
Có thứ hạng theo số bài và tổng điểm, **chỉ để tham khảo, không có ý nghĩa xếp hạng chính thức**.

## Chạy nhanh

```bash
npm install
npm run d:journals -- ../edufind-khgd   # gộp danh mục tạp chí của 28 ngành EduFind -> data/journals.json (1.574 tạp chí, 686 ISSN)
npm run d:demo                          # dữ liệu MẪU hư cấu để chạy thử giao diện
npm run d:index                         # tính điểm, thứ hạng -> public/data/profind.json
npm run dev                             # http://localhost:5173
```

Dữ liệu thật: điền mã ROR vào `data/institutions.json`, rồi `node scripts/ingest-openalex.mjs --mailto <email>` (cần Internet) và `npm run d:index`.
Trạng thái: **bản khung 0.1**, `data/institutions.json` mới là bản gieo mầm 15 đơn vị, chưa phải danh sách chính thức. Xem [`docs/DESIGN.md`](docs/DESIGN.md).

## Giấy phép

© 2026 Luong Viet Hoang (ISA Vietnam), bản quyền thuộc về tác giả, mã nguồn mở. Mã nguồn MIT (`LICENSE`); nội dung và bộ dữ liệu do dự án biên soạn CC BY 4.0 (`LICENSE-CONTENT.md`); dữ liệu bên thứ ba theo điều khoản của nguồn.
