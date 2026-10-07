# Báo cáo 03 - Điện thoại nhỏ, trang danh sách (ProFind, bản http://127.0.0.1:4300/)

Phạm vi đo: 320x640, 360x740, 375x667, 390x844, 414x896, 667x375, 844x390; VI/EN; sáng/tối (qua prefers-color-scheme, app không có nút đổi giao diện). Playwright isMobile + hasTouch + DPR 2. Script: /tmp/claude-0/qa/scripts-03/{a,b,c}.js. Ảnh: /tmp/claude-0/qa/shots/03-*.png.
Dữ liệu thực: 5089 tác giả (VN-only: 1612), mỗi trang 100 dòng.

## 03-A1 (P1) Bảng 7 cột trên điện thoại: cột "Tổng điểm" nằm ngoài màn hình, cột "Đơn vị" bị ép thành dải 98px, dòng cao 253-400px
- Ở đâu: `.table-wrap` / `table` (styles.css), cột Đơn vị trong App.tsx List.
- Tái hiện: mở `#/` ở 320x640 (hoặc 360-414), cuộn tới bảng.
- Mong đợi: thấy ngay tên + điểm (thông tin chính của ProFind), dòng gọn, có dấu hiệu cuộn ngang.
- Thực tế: bảng rộng 669px (VI) / 740px (EN) trong khung 286px (320) đến 380px (414). Cột đo được ở 320 VI: Hạng 56, Tác giả 187, Đơn vị 98, Số bài 61, Tổng điểm 90, Trích dẫn 88, Năm 90. Cột Tổng điểm/Trích dẫn/Năm hoàn toàn ngoài màn hình, người dùng phải vuốt ngang mà không có gợi ý (không có bóng mờ/mũi tên, `::after` của .table-wrap = none). Cột Đơn vị chỉ 98px nên tên trường dài vỡ thành 9-10 dòng chữ 1-2 từ: dòng #1 cao 253px (VI) , dòng dài nhất trong 100 dòng cao 401px; trung vị 84px. Một màn hình 640px chỉ thấy 2-3 tác giả. Khi cuộn ngang sang phải, cột Tác giả mất khỏi tầm nhìn nên điểm không biết của ai (ảnh 03-320-table-right.png), và vì dòng rất cao, phần trống trắng lớn (đọc dòng #1: điểm ở trên cùng, 450px trống phía dưới).
- Bằng chứng: shots/03-320-table.png, 03-320-table-right.png, 03-320-filters.png. Số đo: tw [286,669] VI, [286,740] EN; rowH #1 253 VI / 169 EN.
- Gợi ý: dưới 640px chuyển sang dạng thẻ (hạng + tên + điểm trên một dòng, đơn vị 1-2 dòng cắt `line-clamp`, số bài/trích dẫn/năm dạng chip); hoặc cố định cột Tác giả (`position:sticky;left:0`) + `white-space:normal; min-width` cho Đơn vị + bóng mờ mép phải; đưa Điểm lên cạnh Tác giả.

## 03-A2 (P1) Ô tìm kiếm chỉ rộng nửa hàng, placeholder bị cắt; ô "Đơn vị" và select "Phạm vi" cũng cắt chữ
- Ở đâu: `.sbox` trong styles.css. Quy tắc `@media(max-width:820px){.sbox{grid-column:1/-1}}` bị ghi đè bởi `.sel span...;.sbox{grid-column:auto}` đặt SAU đó (cùng độ ưu tiên, rule sau thắng).
- Tái hiện: 320-414 dọc, xem phần bộ lọc.
- Mong đợi: ô tìm kiếm (công cụ chính) full-width; placeholder đọc được.
- Thực tế: ô tìm kiếm cùng hàng với "Ngành", rộng 137px (320) / 157px (360) / 184px (414); placeholder "Tìm theo tên, ORCID, tên tạp chí hoặc ISSN" chỉ hiện "Tìm theo tên," (VI) và "Search by name, OR…" (EN). Nhãn trên ô dài 3 dòng (làm hai ô lệch nhau, ô Ngành dịch xuống). Ô Đơn vị: placeholder "Gõ tên đơn v" bị cắt giữa chữ; select Phạm vi hiện "Đơn vị tại Việ". Ở 667x375 ngang: placeholder cũng cắt ("...tên tạp chí hoạ").
- Bằng chứng: 03-320-filters.png, 03-320x640-vi-light.png, 03-667x375-vi-light.png.
- Gợi ý: xóa `.sbox{grid-column:auto}` (hoặc đặt trong media query sau), rút placeholder ("Tên, ORCID, tạp chí, ISSN"), cho cột Đơn vị/Phạm vi full-width dưới 400px (1 cột), hoặc rút ngắn nhãn Phạm vi.

## 03-A3 (P1) Phần đầu trang chiếm gần hết màn hình đầu; bảng bắt đầu ở 760-920px (ngoài màn hình đầu tiên)
- Ở đâu: header `.top` + 2 banner + `.filters`.
- Thực tế (đo cuộn trang): vào phần `<main>` ở y=233 (255 với EN 320), banner "Thứ hạng chỉ để tham khảo" cao 287px (VI 320, = 45% chiều cao 640) / 328px (EN 320) / 246px (VI 360) / 226 (VI 390); bộ lọc 223-240px; dòng đầu tiên của bảng ở y=860 (VI 320), 922 (EN 320), 782 (390), 761 (414) - đều lớn hơn chiều cao màn hình 640-896 (có cả thanh trình duyệt thì còn tệ). Ngang 667x375: header+banner ~300px / 375px, bảng ở y=610, tức cần cuộn hơn 1,5 màn hình mới thấy tác giả đầu tiên. Đây chính là lỗi "đầu trang gọn" đã sửa ở EduFind mà ProFind vẫn mắc.
- Bằng chứng: ảnh 03-320x640-vi-light.png (banner chiếm nửa màn hình), 03-667x375-vi-light.png.
- Gợi ý: thu gọn banner trên điện thoại (1-2 dòng + "Xem thêm" bằng `<details>`), bỏ tagline hoặc cắt 1 dòng, bộ lọc thu thành 1 hàng tìm kiếm + nút "Bộ lọc" mở ra.

## 03-A4 (P2) Vùng chạm nhỏ hơn 44px
Đo `getBoundingClientRect` (320-414, không đổi theo cỡ):
- Liên kết tên tác giả trong bảng: cao 17px (mỗi dòng ~253px nhưng đích bấm chỉ 17px); nhãn "Top 2% thế giới" cao 16px (chữ 10,88px); liên kết chân trang "Báo sai sót…" cao 19px, "DOI 10.17632..." 19px.
- Nút ngôn ngữ VI 40x36, EN 46x36; logo/brand 132x40; nút "Hiển thị thêm" 126x38; các ô select/input cao 42-44px (hơi thiếu, ô Ngành 60px do nhãn 3 dòng).
- Tổng cộng 118 phần tử tương tác < 44px trong 100 dòng đầu.
- Gợi ý: `min-height:44px` cho `.lang button`, `button.ghost`, select/input; cho liên kết tên `display:inline-block; padding:10px 0` hoặc để cả dòng thẻ là vùng chạm; liên kết chân trang `padding-block:12px`.

## 03-A5 (P2) Chữ nhỏ hơn 12px
- Nhãn bộ lọc `.sel span` 11,2px (0,7rem, in hoa); tiêu đề cột `th` 11,52px (0,72rem, in hoa); nhãn `.top2` ("★ Top 2% ...") 10,88px (0,68rem); `.tagf` ("Có đơn vị ngoài Việt Nam") 10,88px. Có ở mọi viewport; riêng .top2 xuất hiện 9 lần trong 100 dòng đầu.
- Gợi ý: tối thiểu 12px (0,75rem), tốt hơn 13px cho nhãn trên điện thoại.

## 03-A6 (P3) Số hạng 3 chữ số (100) tràn nhẹ vòng tròn
- `.rk` min-width 28px, số "100" (font 700) chạm sát/tràn mép vòng (ảnh 03-360-en-dark-bottom.png, dòng 100). "Hiển thị thêm" sau đó 1000+ chỉ rộng hơn: dùng `min-width:28px; padding:0 6px` hoặc `border-radius:14px`.

## 03-A7 (P3) Bảng không có tiêu đề cố định, không có "Hiển thị n/N" gần nút "Hiển thị thêm"
- Dòng "Hiển thị 100 / 5089 tác giả" nằm ở đầu bảng, cách nút ~13000px (docH 13985px ở 320). Người dùng ở cuối không thấy tiến độ; nút không ghi số (trang tác giả thì có "(100/…)"). Với 5089 tác giả cần bấm 51 lần (mỗi lần +100). Gợi ý: nút "Hiển thị thêm (100/1612)", cho thêm "Xem 500". `th` không sticky (position:static) nên khi cuộn dọc dòng rất cao không thấy tên cột.

## 03-A8 (P3) Không có chế độ sáng/tối chọn tay; theme chỉ theo hệ thống
- i18n có khóa `theme: "Giao diện"` nhưng không có nút nào dùng; `:root:not([data-theme=light])` có trong CSS cho .top2 nhưng không có chỗ nào đặt data-theme. Người dùng điện thoại đang để chế độ tối hệ điều hành không đổi được. Ghi chú nhẹ (nếu thiết kế cố ý thì bỏ qua).

## Mục đã kiểm đạt
- Không tràn ngang trang: document.scrollWidth == innerWidth ở cả 7 viewport x VI/EN x sáng/tối (28 tổ hợp). Bảng cuộn trong `.table-wrap` (overflow-x:auto), không làm trang cuộn ngang.
- Ngang 844x390: bảng vừa khung (810/810), không cuộn ngang, bộ lọc 1 hàng 80px.
- Viewport meta đúng: `width=device-width, initial-scale=1` (không khóa zoom, không maximum-scale).
- Không zoom khi focus input: input/select đều font-size 16px (đo trên 6 điều khiển).
- Không có thanh dưới/thanh nổi/sticky che nội dung; không có safe-area cần thiết (không dùng viewport-fit=cover, không có phần tử cố định ở mép).
- Tiêu đề h1 không vỡ xấu: 2 dòng ở 320-414 (72px), `text-wrap:balance`; không vỡ chữ giữa từ; ngang 1 dòng.
- Chuyển VI/EN hoạt động, nội dung dịch đủ ở danh sách; chế độ tối: đọc được, màu nền/chữ/badge top2 có token tối riêng.
- Nút "Hiển thị thêm" hoạt động (100 dòng/lần), chạm 126x38 (dưới 44 - xem A4).
- Lọc/tìm kiếm ("nguyen") trả kết quả, không lỗi tràn ngang sau lọc.
