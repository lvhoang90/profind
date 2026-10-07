# Báo cáo 02 - Chế độ tối và độ tương phản (ProFind, bản http://127.0.0.1:4300/)

Phương pháp: Playwright Chromium, colorScheme dark/light, 1280x800 và 390x800; tỉ lệ WCAG tính từ getComputedStyle (có hợp nền alpha theo chuỗi tổ tiên). Mã: /tmp/claude-0/qa/scripts-02/ (run1.js, run2.js, res1.json). Ảnh: /tmp/claude-0/qa/shots/02-*.png.
Tổng kết: 0 P0, 0 P1, 1 P2, 4 P3 (xác minh). Không phát hiện nền trắng sót lại, chữ tối trên nền tối hay viền mất rõ rệt ở chế độ tối.

## Lỗi

### 02-A1 (P2) Nút chọn ngôn ngữ VI/EN không phân biệt được trạng thái đang chọn khi forced-colors (Windows High Contrast)
- Ở đâu: `.lang button[aria-pressed=true]` (src/styles.css; trạng thái chọn chỉ bằng background #b91c16 / #012169 + box-shadow inset).
- Tái hiện: emulate forcedColors:"active" (dark hoặc light), mở `#/`, nhìn góc phải header.
- Mong đợi: nút đang chọn có dấu hiệu khác (viền, gạch chân, màu Highlight). Thực tế: VI và EN trông giống hệt (chữ trắng trên nền đen, không viền), người dùng HC không biết ngôn ngữ nào đang bật. Toàn bộ CSS không có `@media (forced-colors: active)` hay `prefers-contrast`.
- Bằng chứng: 02-forced-list.png, 02-forced-light-list.png (so sánh với 02-list-dark-1280.png).
- Gợi ý: `@media (forced-colors:active){.lang button[aria-pressed=true]{outline:2px solid Highlight;text-decoration:underline;forced-color-adjust:none?}}` (thường chỉ cần `border:2px solid ButtonText` / `background:Highlight;color:HighlightText`).

### 02-A2 (P3) Placeholder ô nhập ở chế độ tối thấp hơn 4.5:1
- Ở đâu: placeholder của `.sel input` (ô tìm kiếm, ô "Nhập cơ quan"), ORCID ở biểu mẫu; không đặt `::placeholder`, dùng màu mặc định #757575.
- Thực tế: #757575 trên --surface #1c2029 = 3.54:1 (sáng: 4.61:1 đạt). Mong đợi >= 4.5:1.
- Bằng chứng: 02-focus-dark.png; tính trong run2.js.
- Gợi ý: `input::placeholder,textarea::placeholder{color:var(--ink-2);opacity:1}` (ink-2 dark 6.4:1 trên surface).

### 02-A3 (P3) Viền ô nhập/select/thẻ dưới 3:1 (WCAG 1.4.11) ở cả hai chế độ
- Ở đâu: `.sel input, .sel select, .form input/textarea` viền `--line`.
- Thực tế: tối #2c3240 trên #1c2029 = 1.27:1 (trên nền trang 1.40:1); sáng #d9e2ea trên trắng = 1.31:1. Ô nhập khó nhận ra ranh giới, nhất là biểu mẫu đính chính (02-form-dark-1280.png: các ô gần như chỉ phân biệt nhờ khác sắc nền nhẹ).
- Gợi ý: token riêng `--field-line` (>=3:1, ví dụ dark #6b7588, light #7b8794) cho điều khiển nhập; giữ --line cho viền trang trí.

### 02-A4 (P3) Liên kết màu accent chữ nhỏ ở chế độ sáng đạt 4.4:1 (<4.5)
- Ở đâu: `a` trong chân trang (12.8px) và `.ghost-link` "Đính chính hồ sơ" (14px) trên --bg #f4f6f8: #1f7aa8 = 4.40:1 (trên trắng 4.76 thì đạt, nên chỉ lỗi ở nền --bg).
- Gợi ý: làm --accent sáng hơn đậm chút (ví dụ #1b6f9a) hoặc dùng màu liên kết riêng.

### 02-A5 (P3) Forced-colors: huy chương hạng 1-3 và viền chip mất
- Ở đâu: `.rk.r1/.r2/.r3`, `.score`, `.top2`, `.badge` chỉ phân biệt bằng nền tô nên bị ép về nền đen/chữ trắng; không có viền. Hạng 1-3 không còn khác hạng 4+ (ảnh 02-forced-list.png), chip Top 2% còn là chữ thường không viền. Chức năng vẫn đọc được (số hạng vẫn hiện).
- Gợi ý: thêm `border:1px solid CanvasText` cho `.rk,.score,.top2,.badge,.tagf` trong `@media(forced-colors:active)`.

## Ghi chú không phải lỗi
- Không có CSS `prefers-contrast: more` (mô phỏng contrast:"more" không đổi màu nào). Chỉ là điểm có thể cải thiện; các cặp chính vẫn >= 4.75:1.
- Header (`.top`) luôn là nền tối cố định ở cả chế độ sáng: chữ trắng/#bfe3f5/#7dd3fc trên gradient #08202f-#0f3d5e cao > 9:1; đo tự động bị sai cho các ô này (nền gradient) nên đã đối chiếu mắt qua ảnh. Ngôn ngữ mặc định hiển thị EN trong phiên Playwright (en-US), không phải lỗi.

## Bảng tương phản đo thực tế (1280px, chữ thường trừ khi ghi)

| Cặp | Sáng | Tối |
|---|---|---|
| Thân trang (ink/bg) | 13.66 | 14.92 |
| Banner (ink-2/surface) | 5.88 | 6.43 |
| Nhãn bộ lọc 11.2px (ink-2/bg) | 5.43 | 7.08 |
| Chữ input/select (ink/surface) | 14.8 | 13.55 |
| Tiêu đề cột th (ink-2/surface) | 5.88 | 6.43 |
| Liên kết tác giả (accent/surface) | 4.76 | 6.96 |
| Pill điểm (ink/s3) | 12.15 | 10.02 |
| Hạng 1 / 2 / 3 | 8.7 / 10.07 / 6.9 | 8.7 / 10.07 / 6.9 |
| Hạng 4+ (ink/s1) | 13.06 | 11.79 |
| Nhãn Top 2% (vàng) | 8.27 | 7.69 |
| Badge "ngoài VN" (ink-2/s1) | 5.19 | 5.59 |
| Banner cảnh báo (warn/surface) | 5.02 | 8.74 |
| Dòng meta (ink-2/bg) | 5.43 | 7.08 |
| Thẻ hệ sinh thái small (ink-2/s3) | 4.83 | 4.75 |
| Liên kết chân trang (accent/bg) | **4.40** | 7.66 |
| Ghost-link (accent/bg) | **4.40** | 7.66 |
| Nút primary (accent-ink/accent) | 4.76 | 8.02 |
| Nhãn stats (ink-2/surface) 12px | 5.88 | 6.43 |
| Placeholder | 4.61 | **3.54** |
| Viền điều khiển (non-text, cần 3:1) | **1.31** | **1.27** |
In đậm = dưới ngưỡng.

## Mục kiểm đạt
- Không còn nền trắng sót lại ở thẻ, bảng, ô nhập, select, nút, banner (list, hồ sơ thường, hồ sơ có cảnh báo "nghi gộp nhầm" A5068175005, biểu mẫu), ở 1280 và 390; không tràn ngang ở 390 (scrollWidth=390).
- Nhãn vàng Top 2% có phiên bản tối riêng (#4d4222/#ffe08a, 7.69:1), đọc rõ; badge "ngoài Việt Nam" và banner cảnh báo đạt.
- Icon duotone dùng --accent/--warn nên đúng màu ở cả hai chế độ; logo đĩa tròn hiển thị tốt trên header tối.
- `color-scheme: light dark` nên select/datalist/scrollbar/ô nhập gốc theo chế độ tối (option: #e8eaf0).
- Vòng focus mặc định (auto) thấy rõ ở chế độ tối (02-focus-dark.png); hover hàng bảng dùng token nên đúng.
- forced-colors: văn bản, liên kết, bảng đọc được, tiêu đề gradient (chữ trong suốt) vẫn hiện trắng (không mất chữ).
- Dữ liệu: không tìm thấy hàng có `.tagf` (cờ nước ngoài) trong 100 hàng đầu của danh sách; nhãn tương đương ở hồ sơ (`.badge.warnb`) đã kiểm.
