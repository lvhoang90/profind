# Báo cáo 04 - Điện thoại: Hồ sơ tác giả và bảng công trình (ProFind, bản test 127.0.0.1:4300)

Phạm vi: 13 hồ sơ chọn bằng script từ profind.json, ở 320/360/390/414 dọc và 844x390 ngang (Playwright, giả lập di động). Mọi lỗi dưới đây đã đo/nhìn ảnh. Ảnh: /tmp/claude-0/qa/shots/04-*.png (04-v-* là bản tiếng Việt cuộn tới hồ sơ). Script: /tmp/claude-0/qa/scripts-04/run*.js.

Hồ sơ thử: A5129023937 (tên dài nhất, 0 bài), A5053495766 (Minh–Triet), A5128700301 (26 đơn vị), A5014924659 (0 bài), A5101646487 (1 bài), A5130218371 (2 bài), A5100404947 (Jie Yang, 2509 bài, suspect+foreign, tạp chí 317 ký tự), A5072272612 (329 bài), A5064939188 và A5087322465 (Top 2%), A5068175005 (suspect), A5048709997 (tiêu đề 1420 ký tự), A5031931039 (tiêu đề có URL/"www").

## Lỗi

### 04-A1 - P2 - Bảng công trình không có dấu hiệu cuộn ngang; cột Tạp chí/Điểm bị cắt mép màn hình
- Ở đâu: `.table-wrap` / `table` trong hồ sơ, mọi độ rộng dọc 320-414 và cả ngang 844.
- Tái hiện: mở `#/tac-gia/A5064939188` (hoặc bất kỳ hồ sơ có bài) ở 320-414px.
- Mong đợi: bảng đọc được hoặc có gợi ý cuộn (đổ bóng mép, thẻ dạng card).
- Thực tế: bảng rộng 688-941px trong khung 286-380px; chỉ thấy Năm + Công trình, cột Tạp chí cắt giữa chữ (ví dụ "SOUTHEAST ... O", liên kết "Tra tạp chí trê|"). Người dùng không biết có thêm 5 cột (ISSN, Điểm, Trích dẫn, Vai trò). Ở 844 ngang cột "TRÍCH DẪN" cũng bị cắt ("TRÍCH DẪ"). Liên kết "Tra tạp chí trên EduFind ↗" nằm ngoài vùng nhìn thấy, phải cuộn ngang mới bấm được.
- Bằng chứng: 04-v-320-longtitle-tbl.png, 04-v-844-top2b.png; tw=[scrollWidth,clientWidth] từ 435..941 / 286.
- Gợi ý: dưới 640px chuyển mỗi công trình thành thẻ xếp dọc (năm, tiêu đề, tạp chí+liên kết, điểm/trích dẫn/vai trò); tối thiểu thêm mask/bóng mép và `-webkit-overflow-scrolling`, hoặc giảm cột (ẩn ISSN, gộp Vai trò).

### 04-A2 - P2 - Dòng công trình cực cao do cột hẹp + tên tạp chí/tiêu đề dài
- Ở đâu: ô Công trình (~160px) và Tạp chí (~168px) khi bảng bị ép.
- Tái hiện: `#/tac-gia/A5100404947` ở 320px, cuộn bảng.
- Thực tế: dòng cao tới 295px (tên tạp chí 317 ký tự, mỗi từ một dòng); tiêu đề 1420 ký tự (A5048709997) cũng kéo dài hàng. Không có cắt dòng (line-clamp) hay ngắt `overflow-wrap`. Các dòng còn lại chừa nhiều khoảng trắng dọc vì `vertical-align:top`.
- Bằng chứng: 04-v-320-jie-scrolled.png; đo tall=295.
- Gợi ý: `line-clamp: 4` cho tiêu đề/tạp chí kèm chạm để mở rộng (hoặc `title`), `overflow-wrap:anywhere` cho chuỗi dài/URL.

### 04-A3 - P2 - Cột "Điểm" rộng 245px vì chữ "Không tính (không phải tác giả chính)"
- Ở đâu: ô `.num` điểm khi `score === null` (`notLead`/`unmatched`).
- Thực tế: ô này làm cột Điểm rộng 245px (chiếm gần cả khung nhìn 286px), đẩy Trích dẫn/Vai trò ra xa; bảng rộng 880px ở hồ sơ Jie Yang. Trong cuộn ngang chỉ thấy "Không tính (kh".
- Bằng chứng: widths [56,160,168,102,245,87,58]; 04-v-320-jie-scrolled.png.
- Gợi ý: rút gọn nhãn ("Không tính" + tooltip) hoặc cho phép xuống dòng với `max-width`.

### 04-A4 - P2 - Banner "xếp hạng chỉ mang tính tham khảo" chiếm 328px (51% màn 320x640) trước nội dung hồ sơ
- Ở đâu: `<p className="banner">` toàn cục (App.tsx dòng 39), hiện ở cả trang hồ sơ.
- Thực tế: ở 320px (EN) banner cao 328px, khiến tên tác giả nằm dưới nếp gấp, phải cuộn mới thấy hồ sơ (hero ~480px + banner). Với hồ sơ suspect còn thêm banner `suspectNote` cao tương tự.
- Bằng chứng: 04-320-suspect.png, 04-320-longname.png (h2 bắt đầu y=639 trên viewport 640).
- Gợi ý: trên trang hồ sơ thu gọn hero, đưa banner thành `<details>` hoặc đoạn 2 dòng "Xem thêm"; gộp hai banner.

### 04-A5 - P3 - Năm thẻ thống kê xếp 1 cột ở 320-414: tốn ~500px chiều cao
- Ở đâu: `.stats{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}`; 5 thẻ cao 88px, mỗi thẻ rộng 288px (1 cột ở 320, nên 2 cột ở ≥ 360 chỉ khi đủ 2x150+gap; kết quả đo 1 cột ở 320 và 360 theo toạ độ x=16).
- Thực tế: vùng thống kê ~500px trước khi tới nút Tải CSV và bảng; icon bị "đè" góc phải thẻ nhưng không chồng chữ.
- Bằng chứng: 04-v-320-top2b.png.
- Gợi ý: lưới 2 cột cố định từ 320 (`minmax(130px,1fr)`), thẻ nhỏ gọn (số liệu 1.3rem).

### 04-A6 - P3 - Hồ sơ 0 công trình: bảng chỉ có hàng tiêu đề, không có trạng thái rỗng
- Tái hiện: `#/tac-gia/A5014924659`, `#/tac-gia/A5129023937`.
- Thực tế: hiện một khung chỉ có tiêu đề cột (cắt, "TRÍC"), nút Tải CSV bị vô hiệu không giải thích; trông như lỗi tải. Thông báo "Đang tải" đúng nhưng không có "Chưa có công trình".
- Bằng chứng: 04-v-320-empty.png. Ghi chú: stats vẫn hiển thị "0/0", "#3954".
- Gợi ý: nếu `works.length===0` thay bảng bằng câu thông báo.

### 04-A7 - P3 - Huy hiệu xuống dòng thụt 10px, lệch lề so với tên; khoảng cách thừa
- Ở đâu: `.badge{margin-left:10px}` trong `h2.au`.
- Thực tế: ở ≤414px huy hiệu xuống dòng riêng với lề trái 10px (không thẳng cột với tên) và cách nhau 36px giữa các dòng; hồ sơ foreign+Top2%+suspect cao tới 108px chỉ riêng tiêu đề. Không chồng lên tên (đạt).
- Bằng chứng: 04-v-320-suspect.png, 04-v-320-top2b.png.
- Gợi ý: đặt huy hiệu trong `<span class="badges">` flex-wrap gap 6px, bỏ margin-left khi xuống dòng.

### 04-A8 - P3 - Mục tiêu chạm nhỏ: liên kết "Đính chính" cao 21px; hàng tiêu đề bảng cao 55px (lớn hơn cần)
- Ở đâu: `.ghost-link` (cao 21px, dưới khuyến nghị 44px; nút Tải CSV 38px, nút "Hiển thị thêm" 38px, cũng dưới 44) và `thead` đo 55px thay vì ~37px (padding 10 + dòng 17) nên có khoảng trắng ~18px dưới chữ tiêu đề.
- Bằng chứng: btn [38,21]; th height 55.03 ở mọi cột; 04-v-844-top2b.png.
- Gợi ý: `min-height:44px` cho nút/liên kết hành động; kiểm tra quy tắc CSS khiến th cao thêm.

## Tốc độ / hiệu năng (hồ sơ lớn nhất, Jie Yang, 2509 bài, 360px)
- Mở hồ sơ: ~334ms tới khi có dòng; DOM 1098 phần tử, 100 hàng (PAGE=100). Đạt.
- Bấm "Hiển thị thêm (100/2509)": 710ms để thêm 100 hàng (200 hàng); nút cập nhật "(200/2509)". Đạt, nhưng mỗi lần thêm chỉ 100 hàng: 2509 bài cần 25 lần bấm (P3, gợi ý nút "Hiển thị tất cả"/tăng bước).
- Cuộn tự động 2 giây: 106 khung, khung chậm nhất 66ms (một giật nhẹ), chấp nhận được.
- (Ghi chú đo: thời gian 15s ở hồ sơ 0 bài trong log chỉ là do script chờ `tbody tr` không bao giờ xuất hiện.)

## Mục đã kiểm đạt
- Không có cuộn ngang cấp trang (scrollWidth = innerWidth) ở 320/360/390/414/844 cho cả 13 hồ sơ.
- Tên rất dài ("Curly-Howard-Chungus Correspondence | Lamport-...") xuống dòng đúng, không tràn (cao 144px ở 320). Tên có `–`, `ä` hiển thị đúng.
- Huy hiệu (foreign, suspect, Top 2%, đã xác nhận) không chồng lên tên; Top 2% liên kết, tooltip đúng.
- Thẻ thống kê không vỡ nội dung; số lớn (#6039, 0/0, 69/117, 91%) vừa khung.
- Nhiều đơn vị (26 đơn vị): dòng đơn vị xuống dòng, không tràn; ORCID xuống dòng đẹp.
- Nút Tải CSV và liên kết Đính chính xuống hàng riêng ở 320, bấm được (kích thước xem A8).
- Hồ sơ 1-2 bài hiển thị đúng; "Hiển thị thêm (n/m)" chỉ xuất hiện khi n < m; số đếm chính xác.
- Liên kết "Tra tạp chí trên EduFind" mở đúng (target _blank, rel noopener) nhưng bị cắt do A1.
- Chưa tìm thấy hồ sơ có tiêu đề chứa thẻ HTML trong dữ liệu (đã quét toàn bộ works); tiêu đề chứa "www" hiển thị dạng văn bản, không bị render HTML.
