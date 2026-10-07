# Báo cáo 05 - Máy tính bảng và điểm gãy responsive (ProFind, bản test 127.0.0.1:4300)

Phương pháp: quét 29 chiều rộng (280-1920, mật độ cao quanh 820/821) x 2 ngôn ngữ (VI/EN) x trang danh sách + hồ sơ `#/tac-gia/A5026220137`; đo scrollWidth, phần tử tràn, số cột lưới bộ lọc, cuộn ngang của .table-wrap. Thêm thiết bị: iPad 768x1024, 1024x768, Pro 1024x1366, Surface 912x1368, gập 280/653, zoom 200%/400% (DSF 2/4 + viewport nhỏ), font gốc 24px.
Script: /tmp/claude-0/qa/scripts-05/ (sweep.js, shots.js, top.js, sweep.json). Ảnh: /tmp/claude-0/qa/shots/05-*.png

## 05-A1 - P2 - Ô tìm kiếm không full-width ở ≤820px (quy tắc @media bị ghi đè)
- Ở đâu: src/styles.css dòng 34 (`@media(max-width:820px){...;.sbox{grid-column:1/-1}}`) bị dòng sau đó `.sbox{grid-column:auto}` (khối "sel span... .sbox{grid-column:auto}") ghi đè do cùng độ ưu tiên và nằm sau.
- Tái hiện: mở `#/` ở viewport 768 (hoặc bất kỳ 280-820).
- Mong đợi: ô tìm kiếm chiếm cả hàng (ý đồ của `1/-1`). Thực tế: ô tìm kiếm chỉ rộng 363px/768, nằm cạnh "Lĩnh vực"; tương tự 280px: 119px/ô, ô tìm kiếm chỉ ~119px nên placeholder bị cắt rất sớm.
- Bằng chứng: đo rows ở 768: `16,326,363` và `389,326,363` (ô tìm kiếm + Field cùng hàng); ảnh 05-ipad-top.png. Ở 820: ô rộng 389.
- Sửa: đưa `.sbox{grid-column:auto}` lên trước media query, hoặc đổi trong media thành `.filters .sbox{grid-column:1/-1}`.

## 05-A2 - P2 - Từ 821px lưới bộ lọc đột ngột 2 cột -> 6 cột; nhãn/ô bị cắt ở 821-1100px
- Ở đâu: styles.css dòng 17 (`2fr repeat(5,1fr)`) + breakpoint 820.
- Tái hiện: `#/` ở 821, 912, 1024 (iPad ngang, Pro, Surface), nhất là EN hoặc chữ lớn.
- Thực tế: chiều rộng lỗi đầu tiên là 821px. Ô chỉ rộng 106px (821), 119px (912), 135px (1024). Ở 1024 (EN) các ô chọn bị cắt giá trị: "Vietnam…", "Total sc", ô Institution placeholder chỉ còn "Type ar"; nhãn "INSTITUTION TYPE" xuống 2 dòng làm các ô lệch chiều cao (ô Field/Scope/Sort lệch so với ô Institution Type: top 470 vs 455). Với font gốc 24px ở 1024 tình trạng rõ rệt (ảnh 05-fs24-1024-top.png). Chỉ ổn từ ~1280.
- Sửa: thêm bậc trung: `@media(max-width:1100px){.filters{grid-template-columns:repeat(3,1fr)}.sbox{grid-column:1/-1}}` (hoặc `repeat(auto-fit,minmax(160px,1fr))` cho .filters); thêm `align-items:end` cho .filters.

## 05-A3 - P2 - Bảng tác giả cuộn ngang nội bộ ở ≤768px, cột "Năm" bị cắt
- Ở đâu: .table-wrap (overflow-x:auto) + `td.meta:last-child{white-space:nowrap}`.
- Thực tế: tràn nội bộ của bảng: 768px = 6px (cắt chữ "2021–2026" ngay trên iPad dọc, xem ảnh 05-ipad-top.png: "2021–2026" sát mép), 740 = 34, 653 = 121, 480 = 294, 320 = 454, 280 = 494px. Tức là lỗi bắt đầu từ 768px (iPad dọc, chiều rộng phổ biến nhất) và từ dưới ~800px bảng hầu như luôn phải vuốt ngang; không có gợi ý (bóng đổ/fade) rằng còn cột. Trang không tràn ngang (document sw = vw ở mọi bề rộng).
- Với font gốc 24px: tràn 294px ở 768, 38px ở 1024 (ngay cả iPad ngang), 702px ở 360.
- Sửa: ẩn/xếp chồng cột phụ (Citations, Years) ở ≤900px, hoặc chuyển bảng thành thẻ ở ≤640px; giảm padding ô `th,td{padding:10px 6px}` ở ≤820; cột Institution đang bị bẻ rất dài (Đại học Quốc gia TP.HCM... 7 dòng) nên đặt `min-width` hợp lý + `font-size:.8rem`.

## 05-A4 - P3 - Banner/ô lọc ở 280px: ô chỉ ~119px, chữ nhãn bị cắt/xuống dòng nhiều
- Ở đâu: lưới 2 cột cố định ở ≤820 kể cả 280-360px (gập, zoom 400%: 320px viewport, ô 139px).
- Thực tế: không tràn trang, nhưng ô tìm kiếm placeholder bị cắt, select hiển thị 1-2 ký tự. Gợi ý: `@media(max-width:480px){.filters{grid-template-columns:1fr}}`.

## Đã kiểm đạt
- Không có tràn ngang trang (documentElement.scrollWidth == clientWidth) ở cả 29 chiều rộng x VI/EN x danh sách/hồ sơ, gồm 280, 320, 653, 768, 820/821, 912, 1024, 1920; zoom 200%/400%; font 24px (360-1280).
- Không có phần tử nào vượt viewport ngoài .table-wrap; không phát hiện chữ chồng chữ (nút/tiêu đề không bị clip).
- Hồ sơ tác giả: không lỗi ở mọi chiều rộng quét.
- Breakpoint 820: 820 -> 2 cột, 821 -> 6 cột đúng thiết kế (`.eco ol` 3 cột -> 1 cột cùng ngưỡng).
- Tiêu đề h1 clamp mượt; stats auto-fit tốt.
