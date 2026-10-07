# Báo cáo kiểm thử 16 – Khả năng tiếp cận (WCAG 2.2 AA) – ProFind

Môi trường: http://127.0.0.1:4300/ (Chromium headless), axe-core 4 (tag wcag2a/aa, 21aa, 22aa, best-practice) chạy trên 3 trang (#/, #/tac-gia/<id>, #/dinh-chinh) x sáng/tối x VI/EN = 12 tổ hợp. Script: /tmp/claude-0/qa/scripts-16/ (axe.js, manual.js, m2.js, m3.js). Ảnh: /tmp/claude-0/qa/shots/16-*.png.

Kết quả axe (đã lọc trùng): chỉ 1 luật vi phạm, `color-contrast` (serious), chỉ ở chế độ sáng (cả VI và EN, cả 3 trang); chế độ tối: 0 vi phạm.

## Lỗi đã xác minh

### 16-A1 – P1 – Chuyển route không đổi tiêu đề tài liệu, không chuyển/ báo focus
- WCAG: 2.4.2 Page Titled (A), 2.4.3 Focus Order, 4.1.3 Status Messages (AA).
- Ở đâu: src/App.tsx (chỉ có effect đặt `documentElement.lang`; không có `document.title`, không quản lý focus).
- Tái hiện: mở #/, Tab tới liên kết tác giả, Enter -> hồ sơ; Tab tiếp rồi vào "Đây là tôi / đính chính".
- Mong đợi: title riêng theo trang (vd. "Nguyễn Hữu Hiếu | ProFind", "Đính chính | ProFind"); focus/đọc báo trang mới (đưa focus về h1/h2 hoặc vùng live).
- Thực tế: `document.title` luôn "ProFind | Tra cứu tác giả và công trình nghiên cứu" ở cả 3 route (title1 = title0); sau Enter `document.activeElement` = BODY (liên kết bị gỡ khỏi DOM) nên người dùng bàn phím phải Tab lại từ đầu trang qua brand, VI, EN, 6 bộ lọc; trình đọc màn hình không nghe thông báo nào.
- Gợi ý: trong effect theo `route` đặt document.title; sau điều hướng focus vào heading (tabIndex=-1) hoặc `<div role="status">` thông báo tên trang.

### 16-A2 – P2 – Thiếu skip link, 9 điểm dừng Tab trước nội dung chính
- WCAG: 2.4.1 Bypass Blocks (A).
- Ở đâu: header + bộ lọc (App.tsx dòng 28-40, 82-90).
- Tái hiện: nhấn Tab từ đầu trang list.
- Thực tế: 2 liên kết đầu là "ProFind" và liên kết tác giả; không có skip link "Bỏ qua tới nội dung"; phải Tab qua brand, VI, EN, ô tìm, 5 select/input mới tới bảng (tab sequence đo được: brand, lang-vi, lang-en, INPUT, SELECT, SELECT, INPUT, SELECT, SELECT, rồi mới tới A). `<main>` có nhưng không có id/neo.
- Gợi ý: thêm `<a class="skip" href="#main">` (ẩn tới khi focus) và `<main id="main" tabIndex={-1}>`. Lưu ý router dùng hash nên neo `#main` sẽ đụng route; dùng onClick focus() thay vì href hash.

### 16-A3 – P2 – Màu liên kết sáng không đủ tương phản (4.39:1)
- WCAG: 1.4.3 Contrast (Minimum) (AA).
- Ở đâu: `:root{--accent:#1f7aa8}` trên nền `--bg:#f4f6f8`; ảnh hưởng liên kết cỡ 12.8px/16px ngoài thẻ trắng: "← Danh sách", "Tra cứu ↗" không (nằm trên nền trắng, đạt), nhưng ORCID, "Đính chính" (`a.ghost-link`), DOI Top-2% ở footer, "← Danh sách".
- Tái hiện: chạy axe chế độ sáng ở bất kỳ trang nào.
- Thực tế: axe: "insufficient color contrast of 4.39 (#1f7aa8 on #f4f6f8)" – chứng cứ axe.json (list/author/corr, light, vi+en).
- Gợi ý: đậm màu accent sáng thêm (vd. #1a6e9b ≥ 4.8:1 trên #f4f6f8).

### 16-A4 – P2 – Dấu tích "đã xác nhận hồ sơ" chỉ là icon, không có văn bản thay thế (trong bảng)
- WCAG: 1.1.1 Non-text Content (A), 1.4.1 Use of Color.
- Ở đâu: App.tsx dòng 98: `{a.claimed && <Icon n="check" size={14} className="ok" />}` (icon aria-hidden, chỉ màu xanh + dấu check).
- Thực tế: ở trang hồ sơ có badge kèm chữ ("claimedBadge"), nhưng ở bảng danh sách, người dùng trình đọc màn hình không biết tác giả đã xác nhận (không có chữ/title/sr-only).
- Gợi ý: thêm `<span className="sr">{t("claimedBadge")}</span>` hoặc `role="img" aria-label`.

### 16-A5 – P2 – Thông tin quan trọng chỉ nằm trong thuộc tính `title` (tooltip)
- WCAG: 1.3.1, 1.4.13 / 4.1.2; không dùng được với bàn phím/cảm ứng.
- Ở đâu: liên kết "★ Top 2% thế giới" (hạng, lĩnh vực nằm trong title, dòng 98/124), badge "claimedBadge", `.score[title]` ("Scopus Q1").
- Thực tế: hạng Top-2% và lĩnh vực chỉ qua title; 9 liên kết trong bảng đều cùng tên "★ Top 2% thế giới" nên người dùng danh sách liên kết không phân biệt được. Q hạng Scopus có chữ hiển thị bên dưới (đạt), nhưng quartile trong title trùng lặp.
- Gợi ý: đưa hạng/lĩnh vực thành văn bản thật hoặc `aria-label` có tên tác giả ("Top 2% thế giới – Nguyễn Văn A, hạng …"); cảnh báo mở tab mới (xem A7).

### 16-A6 – P2 – Trạng thái động không có vùng live
- WCAG: 4.1.3 Status Messages (AA).
- Ở đâu: "Hiển thị n / t tác giả" (List, `<p className="meta">`), "Đang tải" (`<p className="empty">`), thông báo lỗi tải, "Không gửi được..." / "Đã gửi" ở trang đính chính.
- Thực tế: `document.querySelectorAll('[aria-live],[role=status],[role=alert]').length === 0` trên cả ba trang; gõ "Hiếu" thì số kết quả đổi (đo được "Hiển thị 70 / 70 tác giả") nhưng không thông báo. Sau gửi lỗi, `.banner.demo` có role=null, aria-live=null và focus rơi về BODY (nút bị `disabled` trong lúc gửi).
- Gợi ý: `<p role="status" aria-live="polite">` cho đếm kết quả/đang tải; `role="alert"` cho lỗi gửi/tải; không disable nút (dùng aria-disabled) hoặc đưa focus vào thông báo.

### 16-A7 – P3 – Liên kết mở tab mới không báo trước
- WCAG: 3.2.5 (AAA)/ kỹ thuật G201; best practice.
- Ở đâu: `target="_blank"` ở eco 2-3, DOI Top-2, ORCID, "Tra cứu ↗", "★ Top 2%".
- Thực tế: không có chữ "mở tab mới" / sr-only; "↗" là ký tự đọc lên như "mũi tên chéo".
- Gợi ý: thêm `<span className="sr">(mở trong tab mới)</span>`, ẩn "↗" bằng aria-hidden.

### 16-A8 – P3 – Cấu trúc tiêu đề: h1 là khẩu hiệu chung, tên trang nằm ở h2
- WCAG: 1.3.1, 2.4.6.
- Ở đâu: `<h1>` trong header (cùng nội dung ở mọi route), tên tác giả `<h2>`, "Đính chính" `<h2>`, "Hệ sinh thái ISA" `<h2>` ở footer.
- Thực tế: danh sách tiêu đề: H1 "Tra cứu tác giả…" / H2 tên tác giả / H2 "Hệ sinh thái"; không bỏ cấp, nhưng h1 không mô tả trang đang xem; trang danh sách không có h2 cho vùng bộ lọc/bảng. h1 dùng `color:transparent` + background-clip:text: nếu chế độ màu cưỡng bức (Windows High Contrast / forced-colors) có thể mất chữ (chưa kiểm forced-colors; axe không đánh giá được gradient chữ, độ tương phản gradient (#fff…#d9ccff trên #08202f…#0f3d5e) thực tế cao).
- Gợi ý: h1 theo trang (tên tác giả/ "Đính chính"); thêm `@media (forced-colors:active){.top h1{color:CanvasText;background:none;-webkit-text-fill-color:currentColor}}`.

### 16-A9 – P3 – Bảng thiếu `<caption>`/`scope`; không có tiêu đề cột sắp xếp (n/a)
- WCAG: 1.3.1.
- Thực tế: `caption` = 0, `th[scope]` = 0 ở cả hai bảng (danh sách, công trình); `thead>th` đủ cho SR hiện đại nên mức thấp. Sắp xếp làm bằng `<select>` nên không có `aria-sort` cần thiết. Hai bảng có thể cuộn ngang ở 320px (scrollWidth 669 > 286) nhưng vùng cuộn không có nhãn.
- Gợi ý: `<caption class="sr">` mô tả bảng; `scope="col"`; `role="region" aria-label tabIndex=0` cho `.table-wrap`.

### 16-A10 – P3 – Nút VI/EN: tên truy cập chỉ "VI"/"EN", nhãn nhóm "Language" không dịch
- WCAG: 2.5.3 Label in Name, 3.1.2 Language of Parts (AA).
- Thực tế: ARIA snapshot `group "Language": button "VI" [pressed], button "EN"` (nhãn tiếng Anh ngay cả khi trang VI); phần tử không có `lang` (btn lang=""), nên SR đọc "VI" như chữ cái. Tên riêng nước ngoài (tên tác giả, tên tạp chí tiếng Anh, "D.M. Hoat") không có thuộc tính `lang`. `<html lang>` đổi đúng theo VI/EN (kiểm đạt).
- Gợi ý: `aria-label={lang==="vi"?"Ngôn ngữ":"Language"}`; nút `lang="vi" aria-label="Tiếng Việt"` / `lang="en" aria-label="English"`.

### 16-A11 – P3 – Vùng chạm nhỏ hơn 24px cho liên kết độc lập
- WCAG: 2.5.8 Target Size (Minimum) (AA, 2.2).
- Thực tế: đo: liên kết "★ Top 2%" 112x16 px; "Tra cứu ↗" 19px cao; hai liên kết `A` 162x19 và 281x19 (trong hàng riêng); liên kết tên tác giả nằm trong dòng chữ cạnh nhau với nhãn nên có thể thuộc ngoại lệ "inline", còn `.top2` và `.tagf` cạnh liên kết tên (khoảng cách ~8px) có thể vi phạm vì vùng 24px chồng nhau. Nút/ô nhập/select đều ≥36px (đạt).
- Gợi ý: `min-height:24px; display:inline-flex; align-items:center` cho `.top2`, `.meta a`.

### 16-A12 – P3 – Chỉ báo focus mặc định, độ nổi bật thấp ở nút EN trên nền aurora
- WCAG: 2.4.7 (AA), 2.4.11 Focus Appearance (không bắt buộc ở 2.2 AA; 1.4.11).
- Thực tế: toàn bộ stylesheet không có `:focus-visible`; dùng vòng auto của Chromium (outline auto 1px, màu rgb(16,16,16)). Với `.lang-en[aria-pressed=true]` (nền #012169 trên header tối) vòng gần như chìm (xem 16-focus-en.png); input tìm kiếm và liên kết trên nền sáng thì thấy rõ (16-focus-search.png). Phụ thuộc trình duyệt (Firefox/Safari khác).
- Gợi ý: `:focus-visible{outline:3px solid #7dd3fc;outline-offset:2px}` trong header, và vòng tối/sáng cho phần còn lại.

## Mục đã kiểm ĐẠT
- axe-core: 0 vi phạm ở chế độ tối (3 trang x VI/EN); chế độ sáng chỉ có color-contrast (A3). Không có lỗi tên điều khiển, nhãn form, landmark, trùng id, lang hợp lệ.
- `<html lang>` đổi "vi"/"en" khi bấm VI/EN; `aria-pressed` đúng; landmark: banner/main/contentinfo; banner `role="note"` đọc được; thứ tự đọc DOM = thứ tự thị giác.
- Nhãn: ô tìm (label bao quanh + aria-label trùng văn bản, không xung đột), 5 select/datalist có tên đọc được ("Ngành", "Đơn vị"…); form đính chính: tên textbox đúng, radio nhóm trong fieldset+legend; honeypot `aria-hidden` + tabIndex -1 (không bị Tab).
- Thứ hạng huy chương (r1-r3): có số thứ tự hiển thị, không phụ thuộc màu; Q hạng Scopus có chữ "Scopus Q1".
- Icon SVG decorative `aria-hidden`; mọi icon trừ dấu check ở bảng đi cùng văn bản.
- Bàn phím: hoàn thành chuỗi "gõ tìm Hiếu -> Tab tới liên kết -> Enter mở hồ sơ -> Tab tới 'Tải CSV' -> Enter (tải file thành công, download event) -> Tab -> 'Đính chính' -> Enter -> form" chỉ bằng bàn phím; không bẫy focus; không có phím tắt tùy biến.
- Reflow 320px: không cuộn ngang trang (scrollWidth = clientWidth = 320; chỉ bảng cuộn trong `.table-wrap`); phóng 200% (viewport 640): không tràn; chèn CSS khoảng cách chữ 1.4.12: không cắt nội dung (ảnh 16-spacing.png).
- Chuyển động: lưới aurora chạy `g 8s infinite` nhưng tắt khi `prefers-reduced-motion:reduce` (animation-name none). Không có nội dung nháy >3 lần/giây.
- Kích thước: nút VI/EN 40x36 và 46x36, input/select >=36px (>=24px).
- Chuyển ngôn ngữ giữ nguyên route; chế độ tối: tương phản đạt (axe 0 lỗi).
